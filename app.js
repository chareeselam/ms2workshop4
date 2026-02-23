// Cortex — deterministic modeling (no external APIs)
// Everything in this file is computed from user inputs + simulated 7-day history.

const els = {
  meetingHours: document.getElementById("meetingHours"),
  deepWorkHours: document.getElementById("deepWorkHours"),
  contextSwitches: document.getElementById("contextSwitches"),
  sleepHours: document.getElementById("sleepHours"),
  deadlineIntensity: document.getElementById("deadlineIntensity"),
  energyLevel: document.getElementById("energyLevel"),
  deadlineLabel: document.getElementById("deadlineLabel"),
  energyLabel: document.getElementById("energyLabel"),

  loadScore: document.getElementById("loadScore"),
  fragValue: document.getElementById("fragValue"),
  deepRatioValue: document.getElementById("deepRatioValue"),
  fragMono: document.getElementById("fragMono"),
  deepMono: document.getElementById("deepMono"),
  riskMono: document.getElementById("riskMono"),

  fragFill: document.getElementById("fragFill"),
  deepFill: document.getElementById("deepFill"),
  riskFill: document.getElementById("riskFill"),

  fragHint: document.getElementById("fragHint"),
  deepHint: document.getElementById("deepHint"),
  riskHint: document.getElementById("riskHint"),

  ring: document.querySelector(".ringfg"),

  insightTitle: document.getElementById("insightTitle"),
  insightBody: document.getElementById("insightBody"),
  confidenceValue: document.getElementById("confidenceValue"),

  simMeetings: document.getElementById("simMeetings"),
  simLabel: document.getElementById("simLabel"),
  projLoad: document.getElementById("projLoad"),
  projRisk: document.getElementById("projRisk"),

  statusText: document.getElementById("statusText"),
  statusPill: document.getElementById("statusPill"),

  randomizeBtn: document.getElementById("randomizeBtn"),
  resetBtn: document.getElementById("resetBtn"),

  chart: document.getElementById("trendChart"),
};

const DEFAULTS = {
  meetingHours: 3.5,
  deepWorkHours: 2.5,
  contextSwitches: 10,
  sleepHours: 6.5,
  deadlineIntensity: 3,
  energyLevel: 3,
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Normalize a raw load value to 0–100 using a sensible band for typical knowledge workers
function normalizeLoad(raw) {
  // Raw load range guess:
  // low ~ -10, high ~ 35
  const minRaw = -10;
  const maxRaw = 35;
  const t = (raw - minRaw) / (maxRaw - minRaw);
  return clamp(Math.round(t * 100), 0, 100);
}

function computeMetrics(input) {
  const meetingHours = input.meetingHours;
  const deepWorkHours = input.deepWorkHours;
  const contextSwitches = input.contextSwitches;
  const sleepHours = input.sleepHours;
  const deadlineIntensity = input.deadlineIntensity;
  const energyLevel = input.energyLevel;

  // Deterministic model (transparent)
  const rawLoad =
    (meetingHours * 1.2) +
    (contextSwitches * 0.8) +
    (deadlineIntensity * 5) -
    (deepWorkHours * 1.5) -
    (sleepHours * 1.2);

  const loadScore = normalizeLoad(rawLoad);

  const totalWorkHours = meetingHours + deepWorkHours;
  const deepWorkRatio = totalWorkHours > 0 ? deepWorkHours / totalWorkHours : 0;

  // Meeting density weight: more meetings increases fragmentation impact
  const meetingDensityWeight = 1 + clamp(meetingHours / 6, 0, 1); // 1..2
  const fragIndex = (contextSwitches / Math.max(deepWorkHours, 1)) * meetingDensityWeight;

  // Burnout risk: combine load + recovery + fragmentation, adjusted by energy level
  const recoveryDeficit = clamp((7.5 - sleepHours) / 3.5, 0, 1); // 0 if >=7.5h
  const fragNorm = clamp(fragIndex / 10, 0, 1); // cap
  const energyProtect = clamp((energyLevel - 1) / 4, 0, 1); // 0..1
  const riskRaw =
    (loadScore / 100) * 0.55 +
    recoveryDeficit * 0.25 +
    fragNorm * 0.20 -
    energyProtect * 0.12;

  const burnoutRisk = clamp(Math.round(riskRaw * 100), 0, 100);

  // Confidence: more signal when work hours exist and variability is plausible
  const signalStrength =
    clamp(totalWorkHours / 8, 0, 1) * 0.5 +
    clamp(contextSwitches / 12, 0, 1) * 0.3 +
    clamp(deadlineIntensity / 5, 0, 1) * 0.2;

  const confidence = clamp(Math.round(signalStrength * 100), 15, 95);

  return {
    rawLoad,
    loadScore,
    deepWorkRatio,
    fragIndex,
    burnoutRisk,
    confidence,
    totalWorkHours,
  };
}

// Simulate a 7-day history based on today’s input
function generateHistory(input) {
  const base = computeMetrics(input).loadScore;
  const days = 7;

  // Create gentle variation influenced by sleep & deadlines:
  const sleep = input.sleepHours;
  const deadline = input.deadlineIntensity;

  const variation = clamp((7 - sleep) * 3 + (deadline - 3) * 4, -10, 18);

  const points = [];
  for (let i = 0; i < days; i++) {
    // deterministic pseudo-jitter
    const jitter = ((i * 17) % 9) - 4; // -4..4
    const drift = (i - (days - 1) / 2) * 0.9; // slight slope
    const val = clamp(Math.round(base + jitter + drift + variation * 0.35), 0, 100);
    points.push(val);
  }
  return points;
}

function slope(values) {
  // simple linear trend: last - first
  if (!values || values.length < 2) return 0;
  return values[values.length - 1] - values[0];
}

function formatPct(n) {
  return `${Math.round(n * 100)}%`;
}

function setDial(score) {
  // SVG circle: stroke-dasharray = 2πr = 276.46
  const circumference = 276.46;
  const offset = circumference - (score / 100) * circumference;
  els.ring.style.strokeDashoffset = String(offset);
  els.loadScore.textContent = String(score);
}

function setBar(el, percent) {
  el.style.width = `${clamp(percent, 0, 100)}%`;
}

function fragLabel(frag) {
  if (frag < 3) return "Low fragmentation — longer attention arcs.";
  if (frag < 6) return "Moderate fragmentation — some context switching pressure.";
  if (frag < 9) return "High fragmentation — attention is being repeatedly interrupted.";
  return "Severe fragmentation — likely thrash state.";
}

function deepLabel(ratio) {
  if (ratio >= 0.55) return "Strong deep work ratio — protected focus blocks.";
  if (ratio >= 0.35) return "Balanced ratio — focus exists, but is contested.";
  if (ratio >= 0.20) return "Low deep work ratio — shallow work dominates the day.";
  return "Critical — deep work is nearly absent.";
}

function riskLabel(risk) {
  if (risk < 30) return "Low risk — system appears stable.";
  if (risk < 55) return "Moderate risk — monitor recovery and meeting density.";
  if (risk < 75) return "High risk — sustained patterns may degrade output quality.";
  return "Critical risk — prioritize recovery + reduce fragmentation.";
}

function statusFromRisk(risk) {
  if (risk < 30) return "System stable";
  if (risk < 55) return "System strained";
  if (risk < 75) return "System at risk";
  return "System critical";
}

function generateInsight(input, metrics, history) {
  const meet = input.meetingHours;
  const deep = input.deepWorkHours;
  const ctx = input.contextSwitches;
  const sleep = input.sleepHours;
  const dead = input.deadlineIntensity;

  const meetDensity = meet; // hours/day proxy
  const deepRatio = metrics.deepWorkRatio;
  const frag = metrics.fragIndex;
  const load = metrics.loadScore;
  const risk = metrics.burnoutRisk;

  const tr = slope(history);
  const trendDir = tr > 6 ? "rising" : tr < -6 ? "falling" : "stable";

  // A few deterministic “templates” based on thresholds
  let title = "System readout";
  let body = "";

  const meetPressure = meetDensity >= 4 ? "high" : meetDensity >= 2.5 ? "moderate" : "low";
  const sleepDebt = sleep < 6.5;
  const fragHigh = frag >= 6;

  if (risk >= 75) {
    title = "Risk spike detected";
    body =
      `Your model indicates a critical risk state. Cognitive load is ${load}/100 with ${meetPressure} meeting pressure and ` +
      `${sleepDebt ? "recovery debt" : "limited recovery margin"}. Fragmentation is elevated (index ${frag.toFixed(2)}). ` +
      `Trajectory is ${trendDir} across the last 7 days. If maintained, this pattern typically reduces deep work efficiency and increases spillover.`;
  } else if (fragHigh && deepRatio < 0.30) {
    title = "Fragmentation loop";
    body =
      `Context switching is dominating your system. With ${ctx} switches/day and a deep work ratio of ${formatPct(deepRatio)}, ` +
      `your attention is likely being reset frequently (fragmentation index ${frag.toFixed(2)}). ` +
      `Trajectory is ${trendDir}. Protecting a single uninterrupted block can materially lower load without increasing hours.`;
  } else if (meetDensity >= 4 && deepRatio < 0.35) {
    title = "Meeting density threshold";
    body =
      `Meeting density is currently high (${meet.toFixed(1)}h/day). At this level, deep work tends to compress, and your deep work ratio ` +
      `is ${formatPct(deepRatio)}. Load is ${load}/100 with a ${risk}% risk estimate. ` +
      `Trajectory is ${trendDir}. Consider reducing meeting hours or consolidating them to reduce fragmentation.`;
  } else if (sleepDebt) {
    title = "Recovery bottleneck";
    body =
      `Sleep is acting as a limiting factor (${sleep.toFixed(1)}h). Even with moderate work signals, recovery debt raises your predicted risk ` +
      `to ${risk}%. Load is ${load}/100 and trajectory is ${trendDir}. Improving recovery often lowers risk faster than optimizing tasks.`;
  } else {
    title = "System in balance";
    body =
      `Your system is relatively stable. Load is ${load}/100 with a deep work ratio of ${formatPct(deepRatio)} and fragmentation index ` +
      `${frag.toFixed(2)}. Trajectory is ${trendDir} across the last 7 days. ` +
      `Maintain recovery and keep meeting density below your personal threshold to preserve deep work efficiency.`;
  }

  return { title, body };
}

/* -------- Canvas chart (simple, clean, no libraries) -------- */

function drawChart(canvas, values) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // padding
  const pad = { l: 44, r: 16, t: 16, b: 26 };

  // background grid
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;

  // subtle grid lines
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (i / 4) * (h - pad.t - pad.b);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();

    const label = String(100 - i * 25);
    ctx.fillStyle = "rgba(255,255,255,0.42)";
    ctx.font = "11px " + getComputedStyle(document.documentElement).getPropertyValue("--mono");
    ctx.fillText(label, 10, y + 4);
  }

  // axes baseline
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(pad.l, h - pad.b);
  ctx.lineTo(w - pad.r, h - pad.b);
  ctx.stroke();

  // plot
  const xStep = (w - pad.l - pad.r) / (values.length - 1);
  const yMap = (v) => pad.t + (1 - v / 100) * (h - pad.t - pad.b);

  // line shadow
  ctx.strokeStyle = "rgba(0,220,255,0.18)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = pad.l + i * xStep;
    const y = yMap(v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // main line
  ctx.strokeStyle = "rgba(170,140,255,0.90)";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = pad.l + i * xStep;
    const y = yMap(v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // points
  values.forEach((v, i) => {
    const x = pad.l + i * xStep;
    const y = yMap(v);
    ctx.fillStyle = "rgba(0,220,255,0.80)";
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  });

  // x labels
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.font = "11px " + getComputedStyle(document.documentElement).getPropertyValue("--mono");
  const labels = ["D1","D2","D3","D4","D5","D6","D7"];
  labels.forEach((lab, i) => {
    const x = pad.l + i * xStep;
    ctx.fillText(lab, x - 8, h - 8);
  });
}

/* -------- App wiring -------- */

function readInputs() {
  return {
    meetingHours: toNum(els.meetingHours.value),
    deepWorkHours: toNum(els.deepWorkHours.value),
    contextSwitches: toNum(els.contextSwitches.value),
    sleepHours: toNum(els.sleepHours.value),
    deadlineIntensity: toNum(els.deadlineIntensity.value),
    energyLevel: toNum(els.energyLevel.value),
  };
}

function writeRangeLabels() {
  els.deadlineLabel.textContent = String(els.deadlineIntensity.value);
  els.energyLabel.textContent = String(els.energyLevel.value);
  els.simLabel.textContent = `${els.simMeetings.value}%`;
}

function updateUI() {
  writeRangeLabels();

  const input = readInputs();
  const metrics = computeMetrics(input);
  const history = generateHistory(input);

  // Dial + pills
  setDial(metrics.loadScore);

  els.fragValue.textContent = metrics.fragIndex.toFixed(2);
  els.deepRatioValue.textContent = formatPct(metrics.deepWorkRatio);

  // Meters
  const fragPct = clamp((metrics.fragIndex / 10) * 100, 0, 100);
  const deepPct = clamp(metrics.deepWorkRatio * 100, 0, 100);
  const riskPct = metrics.burnoutRisk;

  setBar(els.fragFill, fragPct);
  setBar(els.deepFill, deepPct);
  setBar(els.riskFill, riskPct);

  els.fragMono.textContent = metrics.fragIndex.toFixed(2);
  els.deepMono.textContent = `${Math.round(deepPct)}%`;
  els.riskMono.textContent = `${riskPct}%`;

  els.fragHint.textContent = fragLabel(metrics.fragIndex);
  els.deepHint.textContent = deepLabel(metrics.deepWorkRatio);
  els.riskHint.textContent = riskLabel(metrics.burnoutRisk);

  // Status pill
  els.statusText.textContent = statusFromRisk(metrics.burnoutRisk);

  // Insight
  const insight = generateInsight(input, metrics, history);
  els.insightTitle.textContent = insight.title;
  els.insightBody.textContent = insight.body;
  els.confidenceValue.textContent = `${metrics.confidence}%`;

  // Chart
  drawChart(els.chart, history);

  // Simulation (reduce meeting hours)
  const simPct = toNum(els.simMeetings.value) / 100;
  const simInput = { ...input, meetingHours: input.meetingHours * (1 - simPct) };
  const simMetrics = computeMetrics(simInput);

  els.projLoad.textContent = `${simMetrics.loadScore}/100`;
  els.projRisk.textContent = `${simMetrics.burnoutRisk}%`;
}

function setInputs(values) {
  els.meetingHours.value = values.meetingHours;
  els.deepWorkHours.value = values.deepWorkHours;
  els.contextSwitches.value = values.contextSwitches;
  els.sleepHours.value = values.sleepHours;
  els.deadlineIntensity.value = values.deadlineIntensity;
  els.energyLevel.value = values.energyLevel;
  els.simMeetings.value = 0;
  updateUI();
}

function sampleWeek() {
  // slightly varied but reasonable
  const v = {
    meetingHours: clamp((Math.random() * 5.5 + 1.0).toFixed(1), 0, 10),
    deepWorkHours: clamp((Math.random() * 4.5 + 0.5).toFixed(1), 0, 10),
    contextSwitches: Math.round(Math.random() * 16 + 4),
    sleepHours: clamp((Math.random() * 3.5 + 5.0).toFixed(1), 0, 12),
    deadlineIntensity: Math.round(Math.random() * 4 + 1),
    energyLevel: Math.round(Math.random() * 4 + 1),
  };

  // values are strings from toFixed; ensure numeric inputs still work fine
  setInputs(v);
}

function reset() {
  setInputs({ ...DEFAULTS });
}

["input", "change"].forEach((evt) => {
  document.addEventListener(evt, (e) => {
    const t = e.target;
    if (!t) return;
    // only re-render for our controls
    if (["meetingHours","deepWorkHours","contextSwitches","sleepHours","deadlineIntensity","energyLevel","simMeetings"].includes(t.id)) {
      updateUI();
    }
  });
});

els.randomizeBtn.addEventListener("click", sampleWeek);
els.resetBtn.addEventListener("click", reset);

// Init
reset();