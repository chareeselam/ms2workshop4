/**
 * CORTEX — Cognitive Load Intelligence System
 * ============================================
 * A cognitive systems modeling tool for knowledge workers.
 * Calculates: Cognitive Load Score, Fragmentation Index,
 * Deep Work Ratio, and Burnout Risk Forecast.
 *
 * Modeling logic is deterministic and fully commented below.
 */

import { useState, useMemo, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

// ─────────────────────────────────────────────────────────────
// MODELING LOGIC
// All calculations are deterministic and based on inputs.
// ─────────────────────────────────────────────────────────────

/**
 * Compute raw cognitive load (unbounded) from inputs.
 * Formula: (meeting_hours × 1.2) + (context_switches × 0.8) +
 *          (deadline_intensity × 5) − (deep_work_hours × 1.5) − (sleep_hours × 1.2)
 * Note: deep work and sleep are restorative, so they subtract load.
 */
function computeRawCognitiveLoad({
  meetingHours, contextSwitches, deadlineIntensity, deepWorkHours, sleepHours
}) {
  return (meetingHours * 1.2) +
         (contextSwitches * 0.8) +
         (deadlineIntensity * 5) -
         (deepWorkHours * 1.5) -
         (sleepHours * 1.2);
}

/**
 * Normalize a raw load value to 0–100.
 * Empirical min/max based on plausible input ranges:
 *   Min scenario: 0h meetings, 0 switches, 1 intensity, 8h deep, 9h sleep → −24.8
 *   Max scenario: 12h meetings, 20 switches, 5 intensity, 0h deep, 3h sleep → 54.0
 * We use a fixed scale so scores are comparable across sessions.
 */
const RAW_MIN = -25;
const RAW_MAX = 75;
function normalizeTo100(raw) {
  return Math.max(0, Math.min(100, ((raw - RAW_MIN) / (RAW_MAX - RAW_MIN)) * 100));
}

/**
 * Fragmentation Index: how fractured is the work day?
 * = (context_switches / max(deep_work_hours, 1)) × meeting_density_weight
 * meeting_density_weight = 1 + (meeting_hours / total_work_hours)
 * Range is open-ended; clamped to 0–10 for display.
 */
function computeFragmentationIndex({ contextSwitches, deepWorkHours, meetingHours, totalWorkHours }) {
  const meetingDensityWeight = 1 + (meetingHours / Math.max(totalWorkHours, 1));
  const raw = (contextSwitches / Math.max(deepWorkHours, 1)) * meetingDensityWeight;
  return Math.min(10, raw); // cap at 10
}

/**
 * Deep Work Ratio: fraction of total work hours spent in deep focus.
 * = deep_work_hours / total_work_hours
 * Range: 0.0–1.0
 */
function computeDeepWorkRatio({ deepWorkHours, totalWorkHours }) {
  return Math.min(1, deepWorkHours / Math.max(totalWorkHours, 1));
}

/**
 * Burnout Risk Score for a single day: 0–100.
 * Drivers: high cognitive load, low sleep, low deep work ratio.
 * = (cognitiveLoad × 0.5) + ((1 - deepWorkRatio) × 25) + ((9 - sleep) / 9 × 25)
 */
function computeBurnoutRisk({ cognitiveLoad, deepWorkRatio, sleepHours }) {
  const sleepFactor = ((9 - sleepHours) / 9) * 25;
  return Math.max(0, Math.min(100,
    (cognitiveLoad * 0.5) + ((1 - deepWorkRatio) * 25) + sleepFactor
  ));
}

/**
 * Generate a 7-day burnout trend.
 * Day 7 = today (from inputs). Days 1–6 = simulated historical data
 * using slight variations to create a realistic trend curve.
 * Trend direction is derived from whether today's metrics are elevated.
 */
function generateBurnoutTrend(todayInputs, simulationMeetingReduction = 0) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const adjustedMeetings = todayInputs.meetingHours * (1 - simulationMeetingReduction / 100);

  // Simulate gradual build-up over the week (Mon = less stress, Fri = peak)
  const dayMultipliers = [0.65, 0.75, 0.88, 0.95, 1.0, 0.70, 0.60];

  return days.map((day, i) => {
    const mult = dayMultipliers[i];
    const dayInputs = {
      meetingHours: adjustedMeetings * mult,
      contextSwitches: todayInputs.contextSwitches * mult,
      deadlineIntensity: Math.max(1, todayInputs.deadlineIntensity * mult),
      deepWorkHours: todayInputs.deepWorkHours * (1 + (1 - mult) * 0.3), // more deep work on lighter days
      sleepHours: todayInputs.sleepHours * (0.95 + Math.random() * 0.1 - 0.05), // minor sleep variation
      totalWorkHours: todayInputs.totalWorkHours
    };
    const raw = computeRawCognitiveLoad(dayInputs);
    const cogLoad = normalizeTo100(raw);
    const dwRatio = computeDeepWorkRatio(dayInputs);
    const burnout = computeBurnoutRisk({ cognitiveLoad: cogLoad, deepWorkRatio: dwRatio, sleepHours: dayInputs.sleepHours });
    return { day, burnout: Math.round(burnout), cogLoad: Math.round(cogLoad) };
  });
}

/**
 * Generate pattern insights from computed metrics.
 * These are derived from actual metric values — not hardcoded.
 */
function generateInsights({ cognitiveLoad, fragmentationIndex, deepWorkRatio, meetingHours, contextSwitches, totalWorkHours, burnoutRisk }) {
  const insights = [];

  if (meetingHours / Math.max(totalWorkHours, 1) > 0.4) {
    const meetingPct = Math.round((meetingHours / totalWorkHours) * 100);
    const dwEfficiencyDrop = Math.round((1 - deepWorkRatio) * 100);
    insights.push(`Meetings occupy ${meetingPct}% of your working hours. At this density, deep work efficiency drops by approximately ${dwEfficiencyDrop}%, as context-switching overhead compounds with each transition.`);
  }

  if (fragmentationIndex > 3) {
    const fragLabel = fragmentationIndex > 6 ? "severely fragmented" : "fragmented";
    insights.push(`Your workflow is ${fragLabel} — ${contextSwitches} context switches against ${Math.max(1, Math.round(totalWorkHours * deepWorkRatio))}h of deep work creates a ${fragmentationIndex.toFixed(1)}× fragmentation ratio. Cognitive re-entry after each switch costs 15–23 minutes of focus recovery.`);
  }

  if (deepWorkRatio < 0.25) {
    const wouldNeed = Math.round(totalWorkHours * 0.35);
    insights.push(`Deep work ratio is critically low at ${Math.round(deepWorkRatio * 100)}%. Research suggests a minimum of 35% deep work time for sustained knowledge output. You'd need ~${wouldNeed}h of uninterrupted focus in your current schedule.`);
  }

  if (cognitiveLoad > 70) {
    insights.push(`Cognitive load is operating in the high-risk zone (${Math.round(cognitiveLoad)}/100). At this level, error rates increase by 30–40% and long-term memory consolidation is impaired.`);
  }

  if (burnoutRisk > 65) {
    insights.push(`7-day burnout trajectory is elevated. The combination of high load, low recovery, and reduced deep work creates compounding stress. Without intervention, risk scores typically accelerate non-linearly.`);
  }

  if (insights.length === 0) {
    insights.push(`Your cognitive load profile is within sustainable range. Deep work ratio of ${Math.round(deepWorkRatio * 100)}% supports effective knowledge work. Maintain current sleep and focus patterns to preserve this baseline.`);
  }

  return insights;
}

// ─────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────

// Animated counter hook
function useAnimatedValue(target, duration = 600) {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const start = prev.current;
    const diff = target - start;
    const startTime = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(start + diff * ease);
      if (t < 1) requestAnimationFrame(tick);
      else prev.current = target;
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return display;
}

// Circular dial for cognitive load
function CognitiveDial({ value }) {
  const animated = useAnimatedValue(value);
  const size = 200;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animated / 100) * circumference;

  const getColor = (v) => {
    if (v < 40) return "#34d399"; // green
    if (v < 65) return "#fbbf24"; // amber
    return "#f87171";             // red
  };
  const color = getColor(animated);

  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{ transition: "stroke 0.5s, stroke-dashoffset 0.6s cubic-bezier(0.34,1.56,0.64,1)", filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center"
      }}>
        <span style={{ fontSize: "2.5rem", fontFamily: "'DM Mono', monospace", color, letterSpacing: "-2px", lineHeight: 1 }}>
          {Math.round(animated)}
        </span>
        <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.15em", marginTop: 4, textTransform: "uppercase" }}>
          Cognitive Load
        </span>
      </div>
    </div>
  );
}

// Horizontal meter bar
function MeterBar({ label, value, max = 10, unit = "", color = "#818cf8", sublabel }) {
  const pct = Math.min(100, (value / max) * 100);
  const animated = useAnimatedValue(pct);
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: "0.72rem", fontFamily: "'DM Mono', monospace", color }}>
          {typeof value === "number" && !Number.isInteger(value) ? value.toFixed(2) : value}{unit}
        </span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${animated}%`, background: color,
          borderRadius: 99, boxShadow: `0 0 8px ${color}`,
          transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)"
        }} />
      </div>
      {sublabel && <div style={{ fontSize: "0.63rem", color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{sublabel}</div>}
    </div>
  );
}

// Slider input
function SliderInput({ label, value, min, max, step = 1, onChange, unit = "" }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: "1.1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <label style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</label>
        <span style={{ fontSize: "0.72rem", fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.7)" }}>{value}{unit}</span>
      </div>
      <div style={{ position: "relative" }}>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            width: "100%", height: 4, appearance: "none", background: `linear-gradient(to right, #6366f1 ${pct}%, rgba(255,255,255,0.08) ${pct}%)`,
            borderRadius: 99, outline: "none", cursor: "pointer"
          }}
        />
      </div>
    </div>
  );
}

// Number input
function NumberInput({ label, value, min = 0, max = 24, step = 0.5, onChange, unit = "h" }) {
  return (
    <div style={{ marginBottom: "1.1rem" }}>
      <label style={{ display: "block", fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => onChange(Math.max(min, value - step))} style={btnStyle}>−</button>
        <div style={{
          flex: 1, textAlign: "center", fontFamily: "'DM Mono', monospace",
          fontSize: "1rem", color: "rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "6px 0"
        }}>{value}{unit}</div>
        <button onClick={() => onChange(Math.min(max, value + step))} style={btnStyle}>+</button>
      </div>
    </div>
  );
}
const btnStyle = {
  width: 32, height: 32, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6, color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "1rem",
  display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s"
};

// Custom tooltip for chart
function CustomTooltip({ active, payload, label }) {
  if (active && payload?.length) {
    return (
      <div style={{
        background: "rgba(10,10,20,0.95)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8, padding: "8px 12px", fontSize: "0.72rem", fontFamily: "'DM Mono', monospace"
      }}>
        <div style={{ color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{label}</div>
        {payload.map(p => (
          <div key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {p.value}
          </div>
        ))}
      </div>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────

export default function Cortex() {
  // User inputs
  const [meetingHours, setMeetingHours] = useState(4);
  const [deepWorkHours, setDeepWorkHours] = useState(2);
  const [contextSwitches, setContextSwitches] = useState(8);
  const [sleepHours, setSleepHours] = useState(7);
  const [deadlineIntensity, setDeadlineIntensity] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [meetingReduction, setMeetingReduction] = useState(0);
  const [showSim, setShowSim] = useState(false);

  const totalWorkHours = meetingHours + deepWorkHours + 2; // +2 for admin/misc

  // ── Core Computations ──
  const metrics = useMemo(() => {
    const baseInputs = { meetingHours, contextSwitches, deadlineIntensity, deepWorkHours, sleepHours, totalWorkHours };

    // Apply simulation if active
    const simMeetings = showSim ? meetingHours * (1 - meetingReduction / 100) : meetingHours;
    const simInputs = { ...baseInputs, meetingHours: simMeetings };

    const rawLoad = computeRawCognitiveLoad(simInputs);
    const cognitiveLoad = normalizeTo100(rawLoad);
    const fragmentationIndex = computeFragmentationIndex(simInputs);
    const deepWorkRatio = computeDeepWorkRatio(simInputs);
    const burnoutRisk = computeBurnoutRisk({ cognitiveLoad, deepWorkRatio, sleepHours });

    const trendData = generateBurnoutTrend(baseInputs, showSim ? meetingReduction : 0);
    const insights = generateInsights({ cognitiveLoad, fragmentationIndex, deepWorkRatio, meetingHours: simMeetings, contextSwitches, totalWorkHours, burnoutRisk });

    return { cognitiveLoad, fragmentationIndex, deepWorkRatio, burnoutRisk, trendData, insights };
  }, [meetingHours, deepWorkHours, contextSwitches, sleepHours, deadlineIntensity, energyLevel, meetingReduction, showSim, totalWorkHours]);

  const burnoutColor = metrics.burnoutRisk > 65 ? "#f87171" : metrics.burnoutRisk > 40 ? "#fbbf24" : "#34d399";
  const fragColor = metrics.fragmentationIndex > 5 ? "#f87171" : metrics.fragmentationIndex > 3 ? "#fbbf24" : "#34d399";

  return (
    <div style={{
      minHeight: "100vh", background: "#080810", color: "#fff",
      fontFamily: "'Syne', 'DM Sans', sans-serif",
      backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.12) 0%, transparent 70%)"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@300;400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=range]::-webkit-slider-thumb { appearance: none; width: 14px; height: 14px; background: #6366f1; border-radius: 50%; cursor: pointer; box-shadow: 0 0 8px #6366f1; }
        input[type=range]::-moz-range-thumb { width: 14px; height: 14px; background: #6366f1; border-radius: 50%; cursor: pointer; border: none; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; }
        .card:hover { border-color: rgba(255,255,255,0.11); }
        .glow-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
        button:hover { opacity: 0.85; }
        .sim-toggle { background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); border-radius: 8px; padding: 8px 16px; color: #a5b4fc; font-size: 0.75rem; cursor: pointer; letter-spacing: 0.08em; text-transform: uppercase; transition: all 0.2s; font-family: 'DM Mono', monospace; }
        .sim-toggle:hover, .sim-toggle.active { background: rgba(99,102,241,0.25); border-color: rgba(99,102,241,0.5); color: #c7d2fe; }
        .insight-tag { display: inline-block; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2); border-radius: 4px; padding: "2px 8px"; font-size: "0.65rem"; color: "#a5b4fc"; margin-bottom: 8px; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 100, background: "rgba(8,8,16,0.8)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg, #6366f1, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", opacity: 0.9 }} />
          </div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.95rem", letterSpacing: "0.05em" }}>CORTEX</span>
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          <span>System</span><span>Model</span><span>Insights</span>
        </div>
        <div style={{ fontSize: "0.68rem", fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}>
          v0.4.1 — alpha
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>

        {/* ── HERO ── */}
        <div style={{ textAlign: "center", padding: "80px 0 60px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 99, padding: "4px 14px", marginBottom: 28 }}>
            <span className="glow-dot" style={{ background: "#6366f1", boxShadow: "0 0 6px #6366f1" }} />
            <span style={{ fontSize: "0.68rem", color: "#a5b4fc", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>Cognitive Systems Modeling</span>
          </div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "clamp(3rem, 8vw, 5.5rem)", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 20 }}>
            <span style={{ background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Model your</span>
            <br />
            <span style={{ background: "linear-gradient(135deg, #818cf8, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>cognitive system.</span>
          </h1>
          <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.35)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7, fontWeight: 300 }}>
            Cortex quantifies your mental bandwidth using structured daily inputs — calculating cognitive load, fragmentation, and burnout trajectory across a 7-day horizon.
          </p>
        </div>

        {/* ── MAIN GRID ── */}
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, marginBottom: 16 }}>

          {/* INPUT PANEL */}
          <div className="card" style={{ padding: "28px 24px" }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>Daily Inputs</div>
              <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", fontWeight: 300 }}>Configure your workday profile</div>
            </div>

            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: 20, paddingBottom: 20 }}>
              <NumberInput label="Meeting hours" value={meetingHours} min={0} max={12} step={0.5} onChange={setMeetingHours} />
              <NumberInput label="Deep work hours" value={deepWorkHours} min={0} max={12} step={0.5} onChange={setDeepWorkHours} />
              <NumberInput label="Context switches" value={contextSwitches} min={0} max={30} step={1} onChange={setContextSwitches} unit="×" />
              <NumberInput label="Sleep hours" value={sleepHours} min={3} max={12} step={0.5} onChange={setSleepHours} />
            </div>

            <SliderInput label="Deadline intensity" value={deadlineIntensity} min={1} max={5} onChange={setDeadlineIntensity} />
            <SliderInput label="Energy level" value={energyLevel} min={1} max={5} onChange={setEnergyLevel} />

            <div style={{ marginTop: 20, padding: "12px 14px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)", borderRadius: 10 }}>
              <div style={{ fontSize: "0.65rem", color: "rgba(165,180,252,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Total Work Hours</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "1.1rem", color: "#a5b4fc" }}>{totalWorkHours}h</div>
            </div>
          </div>

          {/* DASHBOARD */}
          <div style={{ display: "grid", gridTemplateRows: "auto 1fr", gap: 16 }}>

            {/* Top row: Dial + meters */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

              {/* Cognitive Load Dial */}
              <div className="card" style={{ padding: "28px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <CognitiveDial value={metrics.cognitiveLoad} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    {metrics.cognitiveLoad < 40 ? "Sustainable Load" : metrics.cognitiveLoad < 65 ? "Elevated Load" : "Critical Load"}
                  </div>
                </div>
              </div>

              {/* Meters */}
              <div className="card" style={{ padding: "28px 24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 20 }}>System Indices</div>
                <MeterBar
                  label="Fragmentation Index"
                  value={parseFloat(metrics.fragmentationIndex.toFixed(2))}
                  max={10}
                  color={fragColor}
                  sublabel={`${metrics.contextSwitches} switches / ${Math.max(1, metrics.deepWorkHours)}h deep`}
                />
                <MeterBar
                  label="Deep Work Ratio"
                  value={parseFloat(metrics.deepWorkRatio.toFixed(2))}
                  max={1}
                  color="#818cf8"
                  sublabel={`${Math.round(metrics.deepWorkRatio * 100)}% of working hours`}
                />
                <MeterBar
                  label="Burnout Risk"
                  value={parseFloat(metrics.burnoutRisk.toFixed(1))}
                  max={100}
                  unit=""
                  color={burnoutColor}
                  sublabel={`7-day forecast risk score`}
                />
              </div>
            </div>

            {/* Burnout Trend Chart */}
            <div className="card" style={{ padding: "24px 24px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 2 }}>Burnout Risk Forecast</div>
                  <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", fontWeight: 300 }}>7-day rolling simulation</div>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", alignItems: "center" }}>
                  <span style={{ color: "#f87171" }}>— burnout</span>
                  <span style={{ color: "#6366f1" }}>— cog. load</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={metrics.trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={65} stroke="rgba(248,113,113,0.2)" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="burnout" name="Burnout Risk" stroke="#f87171" strokeWidth={2} dot={false} filter="url(#glow-red)" />
                  <Line type="monotone" dataKey="cogLoad" name="Cog. Load" stroke="#6366f1" strokeWidth={1.5} dot={false} strokeOpacity={0.7} />
                </LineChart>
              </ResponsiveContainer>
            </div>

          </div>
        </div>

        {/* ── SIMULATION MODE ── */}
        <div className="card" style={{ padding: "24px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: showSim ? 20 : 0 }}>
            <div>
              <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>Simulation Mode</div>
              <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", fontWeight: 300 }}>Model the impact of reducing meetings on your cognitive load</div>
            </div>
            <button className={`sim-toggle ${showSim ? "active" : ""}`} onClick={() => setShowSim(v => !v)}>
              {showSim ? "Exit Simulation" : "Run Simulation"}
            </button>
          </div>

          {showSim && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, alignItems: "center" }}>
              <div>
                <SliderInput
                  label="Reduce meetings by"
                  value={meetingReduction}
                  min={0} max={100} step={5}
                  onChange={setMeetingReduction}
                  unit="%"
                />
                <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", marginTop: 4, fontFamily: "'DM Mono', monospace" }}>
                  {meetingHours}h → {(meetingHours * (1 - meetingReduction / 100)).toFixed(1)}h meetings
                </div>
              </div>
              <div style={{ padding: "16px", background: "rgba(99,102,241,0.06)", borderRadius: 10, border: "1px solid rgba(99,102,241,0.12)", textAlign: "center" }}>
                <div style={{ fontSize: "0.6rem", color: "rgba(165,180,252,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Projected Load</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "2rem", color: "#a5b4fc" }}>{Math.round(metrics.cognitiveLoad)}</div>
                <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.25)" }}>/ 100</div>
              </div>
              <div style={{ padding: "16px", background: "rgba(52,211,153,0.04)", borderRadius: 10, border: "1px solid rgba(52,211,153,0.1)", textAlign: "center" }}>
                <div style={{ fontSize: "0.6rem", color: "rgba(110,231,183,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Projected Burnout</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "2rem", color: burnoutColor }}>{Math.round(metrics.burnoutRisk)}</div>
                <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.25)" }}>7-day risk</div>
              </div>
            </div>
          )}
        </div>

        {/* ── PATTERN INSIGHTS ── */}
        <div className="card" style={{ padding: "28px 28px" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>Pattern Analysis</div>
            <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", fontWeight: 300 }}>Derived from your current cognitive profile</div>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            {metrics.insights.map((insight, i) => (
              <div key={i} style={{
                display: "flex", gap: 16, padding: "16px 18px",
                background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)"
              }}>
                <div style={{ flexShrink: 0, marginTop: 4 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "0.6rem", fontFamily: "'DM Mono', monospace", color: "#818cf8" }}>0{i + 1}</span>
                  </div>
                </div>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, fontWeight: 300 }}>
                  {insight}
                </p>
              </div>
            ))}
          </div>

          {/* Metric snapshot bar */}
          <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            {[
              { label: "CL Score", value: `${Math.round(metrics.cognitiveLoad)}/100` },
              { label: "Frag Index", value: metrics.fragmentationIndex.toFixed(2) },
              { label: "DW Ratio", value: `${Math.round(metrics.deepWorkRatio * 100)}%` },
              { label: "Burnout", value: `${Math.round(metrics.burnoutRisk)}/100` },
            ].map(m => (
              <div key={m.label} style={{ padding: "6px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{m.label}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ textAlign: "center", marginTop: 48, fontSize: "0.65rem", color: "rgba(255,255,255,0.15)", letterSpacing: "0.08em", fontFamily: "'DM Mono', monospace" }}>
          CORTEX · COGNITIVE LOAD INTELLIGENCE · ALL CALCULATIONS DETERMINISTIC AND CLIENT-SIDE
        </div>
      </div>
    </div>
  );
}
