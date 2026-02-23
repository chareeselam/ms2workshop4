/* Augment Studio — prosthetic configurator (A: clean medical-industrial)
   - Live schematic preview (SVG)
   - Tuning maps to visible HUD + glow + warnings
   - Save/Randomize/Export PNG
*/

const $ = (id) => document.getElementById(id);

const ui = {
  name: $("name"),
  module: $("module"),
  attachment: $("attachment"),
  shellColor: $("shellColor"),
  accentColor: $("accentColor"),
  uiStyle: $("uiStyle"),
  finish: $("finish"),

  stability: $("stability"),
  signal: $("signal"),
  comfort: $("comfort"),

  stabilityLabel: $("stabilityLabel"),
  signalLabel: $("signalLabel"),
  comfortLabel: $("comfortLabel"),

  spec: $("spec"),
  specTitle: $("specTitle"),
  specBody: $("specBody"),

  frame: $("frame"),
  toast: $("toast"),
  badgeName: $("badgeName"),
  badgeMode: $("badgeMode"),

  randomize: $("randomize"),
  save: $("save"),
  exportBtn: $("export"),
};

const STORAGE_KEY = "augment_studio.v1";
let state = loadState() || defaultState();

let raf = null;
let rafToken = 0;

init();

function init(){
  hydrateControls(state);
  mountOnce();
  render();

  ui.name.addEventListener("input", () => update({ name: ui.name.value }));
  ui.module.addEventListener("change", () => update({ module: ui.module.value }));
  ui.attachment.addEventListener("change", () => update({ attachment: ui.attachment.value }));
  ui.shellColor.addEventListener("input", () => update({ shellColor: ui.shellColor.value }));
  ui.accentColor.addEventListener("input", () => update({ accentColor: ui.accentColor.value }));
  ui.uiStyle.addEventListener("change", () => update({ uiStyle: ui.uiStyle.value }));
  ui.finish.addEventListener("change", () => update({ finish: ui.finish.value }));

  ui.stability.addEventListener("input", () => update({ stability: +ui.stability.value }));
  ui.signal.addEventListener("input", () => update({ signal: +ui.signal.value }));
  ui.comfort.addEventListener("input", () => update({ comfort: +ui.comfort.value }));

  ui.randomize.addEventListener("click", () => {
    state = randomState();
    hydrateControls(state);
    render();
    toast("New configuration loaded.");
  });

  ui.save.addEventListener("click", () => {
    saveState(state);
    toast("Saved locally.");
  });

  ui.spec.addEventListener("click", () => {
    const spec = generateSpec(state);
    ui.specTitle.textContent = spec.title;
    ui.specBody.innerHTML = spec.html;
    toast(spec.note);
  });

  ui.exportBtn.addEventListener("click", exportPNG);

  ui.frame.addEventListener("click", () => {
    pulse();
    toast(pickOne(reactions(state)));
  });
}

function defaultState(){
  return {
    name: "",
    module: "arm",
    attachment: "none",
    shellColor: "#e9eef6",
    accentColor: "#3a7bd5",
    uiStyle: "reticle",
    finish: "ceramic",
    stability: 55,  // 0 = stable, 100 = overclock
    signal: 35,     // 0 = stealth, 100 = signal
    comfort: 45,    // 0 = comfort, 100 = force
  };
}

function hydrateControls(s){
  ui.name.value = s.name ?? "";
  ui.module.value = s.module ?? "arm";
  ui.attachment.value = s.attachment ?? "none";
  ui.shellColor.value = s.shellColor ?? "#e9eef6";
  ui.accentColor.value = s.accentColor ?? "#3a7bd5";
  ui.uiStyle.value = s.uiStyle ?? "reticle";
  ui.finish.value = s.finish ?? "ceramic";
  ui.stability.value = String(s.stability ?? 55);
  ui.signal.value = String(s.signal ?? 35);
  ui.comfort.value = String(s.comfort ?? 45);
}

function update(patch){
  state = { ...state, ...patch };
  render();
}

/* ---------- labels / mapping ---------- */

function stabilityTag(v){
  if (v < 20) return "Stabilized";
  if (v < 45) return "Safe";
  if (v < 65) return "Balanced";
  if (v < 85) return "Boosted";
  return "Overclock";
}
function signalTag(v){
  if (v < 20) return "Stealth";
  if (v < 45) return "Low signal";
  if (v < 65) return "Broadcast";
  if (v < 85) return "Beacon";
  return "High signal";
}
function comfortTag(v){
  if (v < 20) return "Comfort";
  if (v < 45) return "Gentle";
  if (v < 65) return "Balanced";
  if (v < 85) return "Force";
  return "Max torque";
}

function modeBadge(s){
  return `${stabilityTag(s.stability)} • ${signalTag(s.signal)} • ${comfortTag(s.comfort)}`;
}

/* ---------- mount + render ---------- */

function mountOnce(){
  ui.frame.innerHTML = baseSVG();
  ui._svg = ui.frame.querySelector("svg");
  ui._root = ui._svg.querySelector("#root");
  ui._module = ui._svg.querySelector("#module");
  ui._hud = ui._svg.querySelector("#hud");
  ui._aura = ui._svg.querySelector("#aura");
  ui._warn = ui._svg.querySelector("#warnings");
  ui._attach = ui._svg.querySelector("#attachment");
}

function render(){
  ui.stabilityLabel.textContent = stabilityTag(state.stability);
  ui.signalLabel.textContent = signalTag(state.signal);
  ui.comfortLabel.textContent = comfortTag(state.comfort);

  ui.badgeName.textContent = (state.name || "Unnamed").trim() || "Unnamed";
  ui.badgeMode.textContent = modeBadge(state);

  // module schematic
  ui._module.innerHTML = moduleSchematic(state);

  // attachment overlays
  ui._attach.innerHTML = attachmentOverlay(state);

  // HUD overlay
  ui._hud.innerHTML = hudOverlay(state);

  // aura/glow intensity based on signal
  applyAura(state);

  // warnings based on overclock + force
  ui._warn.innerHTML = warningsOverlay(state);

  attachIdle();
}

/* ---------- SVG ---------- */

function baseSVG(){
  return `
  <svg viewBox="0 0 520 520" width="100%" height="100%" role="img" aria-label="Augment schematic">
    <defs>
      <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="rgba(18,22,30,0.14)"/>
      </filter>
      <filter id="blur" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="14" />
      </filter>
      <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="rgba(255,255,255,0.70)"/>
        <stop offset="0.45" stop-color="rgba(255,255,255,0.12)"/>
        <stop offset="1" stop-color="rgba(0,0,0,0.06)"/>
      </linearGradient>
    </defs>

    <g id="root" filter="url(#soft)">
      <g id="aura" opacity="0.0">
        <circle cx="260" cy="270" r="175" fill="rgba(58,123,213,0.18)" filter="url(#blur)"/>
        <circle cx="260" cy="270" r="115" fill="rgba(58,123,213,0.12)" filter="url(#blur)"/>
      </g>

      <!-- framing plate -->
      <rect x="70" y="70" width="380" height="380" rx="42"
        fill="rgba(255,255,255,0.55)" stroke="rgba(18,22,30,0.10)" stroke-width="2"/>

      <!-- module + overlays -->
      <g id="module"></g>
      <g id="attachment"></g>
      <g id="hud"></g>
      <g id="warnings"></g>
    </g>
  </svg>
  `;
}

function moduleSchematic(s){
  // shared styling
  const shell = s.shellColor;
  const accent = s.accentColor;
  const finish = s.finish;

  const shellStroke = "rgba(18,22,30,0.18)";
  const dark = "rgba(18,22,30,0.62)";
  const tint = finishTint(finish);

  // Base coordinate system: centered at (260,270)
  switch(s.module){
    case "hand":
      return `
        ${titleTag("HAND MODULE")}
        <g transform="translate(0 0)">
          <path d="M205,200 C220,150 240,150 245,205 L250,265
                   C252,290 230,305 215,290
                   C205,280 205,265 205,250 Z"
                fill="${mixHex(shell, tint, 0.18)}" stroke="${shellStroke}" stroke-width="3"/>
          <path d="M245,205 C250,165 270,160 270,210 L272,270
                   C272,295 252,308 238,295
                   C230,285 232,270 234,255 Z"
                fill="${mixHex(shell, tint, 0.22)}" stroke="${shellStroke}" stroke-width="3"/>

          <path d="M275,220 C275,180 305,178 305,220 L305,275
                   C305,300 285,312 272,300"
                fill="${mixHex(shell, tint, 0.16)}" stroke="${shellStroke}" stroke-width="3"/>

          <path d="M305,235 C305,210 330,210 330,235 L330,275
                   C330,295 315,305 305,295"
                fill="${mixHex(shell, tint, 0.12)}" stroke="${shellStroke}" stroke-width="3"/>

          <!-- palm plate -->
          <rect x="205" y="250" width="140" height="130" rx="28"
                fill="${shell}" stroke="${shellStroke}" stroke-width="3"/>
          <rect x="215" y="260" width="120" height="110" rx="24"
                fill="url(#sheen)" opacity="0.55"/>

          <!-- joints -->
          ${node(230, 285, accent)}
          ${node(300, 285, accent)}
          ${node(230, 340, accent)}
          ${node(300, 340, accent)}

          <!-- cable -->
          <path d="M215,315 C250,300 270,360 330,320"
                fill="none" stroke="${dark}" stroke-width="3" opacity="0.45" stroke-linecap="round"/>
        </g>
      `;

    case "leg":
      return `
        ${titleTag("LEG MODULE")}
        <g>
          <rect x="232" y="140" width="56" height="260" rx="24"
                fill="${shell}" stroke="${shellStroke}" stroke-width="3"/>
          <rect x="240" y="150" width="40" height="240" rx="18"
                fill="url(#sheen)" opacity="0.55"/>

          <!-- knee joint -->
          <circle cx="260" cy="270" r="36" fill="${mixHex(shell, tint, 0.20)}" stroke="${shellStroke}" stroke-width="3"/>
          ${node(260, 270, accent)}

          <!-- calf plates -->
          <path d="M232,300 C220,340 235,390 260,404 C285,390 300,340 288,300 Z"
                fill="${mixHex(shell, tint, 0.14)}" stroke="${shellStroke}" stroke-width="3"/>
          <path d="M210,410 C230,440 290,440 310,410 C285,395 235,395 210,410 Z"
                fill="${mixHex(shell, tint, 0.10)}" stroke="${shellStroke}" stroke-width="3"/>

          <!-- heel stabilizers -->
          <path d="M210,410 C200,425 205,450 228,455" fill="none" stroke="${dark}" stroke-width="3" opacity="0.35"/>
          <path d="M310,410 C320,425 315,450 292,455" fill="none" stroke="${dark}" stroke-width="3" opacity="0.35"/>
        </g>
      `;

    case "eye":
      return `
        ${titleTag("OCULAR MODULE")}
        <g>
          <circle cx="260" cy="270" r="120" fill="${shell}" stroke="${shellStroke}" stroke-width="3"/>
          <circle cx="260" cy="270" r="95" fill="${mixHex(shell, tint, 0.14)}" stroke="${shellStroke}" stroke-width="3"/>
          <circle cx="260" cy="270" r="60" fill="rgba(18,22,30,0.06)" stroke="${shellStroke}" stroke-width="3"/>

          <circle cx="260" cy="270" r="26" fill="${accent}" opacity="0.85"/>
          <circle cx="260" cy="270" r="12" fill="rgba(255,255,255,0.85)"/>

          ${node(260, 210, accent)}
          ${node(210, 270, accent)}
          ${node(310, 270, accent)}
          ${node(260, 330, accent)}

          <path d="M190,270 C210,230 310,230 330,270 C310,310 210,310 190,270 Z"
                fill="url(#sheen)" opacity="0.35"/>
        </g>
      `;

    case "spine":
      return `
        ${titleTag("SPINE MODULE")}
        <g>
          ${vertebra(260, 160, shell, shellStroke, tint)}
          ${vertebra(260, 220, shell, shellStroke, tint)}
          ${vertebra(260, 280, shell, shellStroke, tint)}
          ${vertebra(260, 340, shell, shellStroke, tint)}

          <path d="M260,150 C220,230 300,290 260,390"
                fill="none" stroke="${accent}" stroke-width="4" opacity="0.30" stroke-linecap="round"/>

          ${node(260, 190, accent)}
          ${node(260, 250, accent)}
          ${node(260, 310, accent)}
          ${node(260, 370, accent)}
        </g>
      `;

    case "arm":
    default:
      return `
        ${titleTag("ARM MODULE")}
        <g>
          <rect x="200" y="140" width="120" height="240" rx="34"
                fill="${shell}" stroke="${shellStroke}" stroke-width="3"/>
          <rect x="210" y="150" width="100" height="220" rx="30"
                fill="url(#sheen)" opacity="0.55"/>

          <!-- elbow joint -->
          <circle cx="260" cy="270" r="38"
                  fill="${mixHex(shell, tint, 0.18)}" stroke="${shellStroke}" stroke-width="3"/>
          ${node(260, 270, accent)}

          <!-- forearm split -->
          <path d="M210,300 C220,360 240,400 260,405 C280,400 300,360 310,300"
                fill="${mixHex(shell, tint, 0.12)}" stroke="${shellStroke}" stroke-width="3"/>
          <path d="M232,315 C238,350 248,372 260,375 C272,372 282,350 288,315"
                fill="rgba(18,22,30,0.05)"/>

          <!-- cable -->
          <path d="M215,240 C240,220 275,320 305,300"
                fill="none" stroke="rgba(18,22,30,0.55)" stroke-width="3" opacity="0.35" stroke-linecap="round"/>

          ${node(230, 205, accent)}
          ${node(290, 205, accent)}
          ${node(230, 350, accent)}
          ${node(290, 350, accent)}
        </g>
      `;
  }
}

function node(x,y,accent){
  return `<circle cx="${x}" cy="${y}" r="8" fill="${accent}" opacity="0.80"/>`;
}

function titleTag(t){
  return `
    <g opacity="0.85">
      <text x="96" y="122" font-size="11" fill="rgba(18,22,30,0.65)" letter-spacing="1.6">${t}</text>
      <line x1="96" y1="132" x2="210" y2="132" stroke="rgba(18,22,30,0.12)" stroke-width="2"/>
    </g>
  `;
}

function vertebra(cx, cy, shell, stroke, tint){
  return `
    <g>
      <rect x="${cx-78}" y="${cy-26}" width="156" height="52" rx="18"
        fill="${mixHex(shell, tint, 0.18)}" stroke="${stroke}" stroke-width="3"/>
      <rect x="${cx-48}" y="${cy-14}" width="96" height="28" rx="12"
        fill="rgba(255,255,255,0.35)" opacity="0.65"/>
    </g>
  `;
}

/* ---------- attachment overlays ---------- */

function attachmentOverlay(s){
  const a = s.accentColor;
  const ink = "rgba(18,22,30,0.20)";
  switch(s.attachment){
    case "led_ring":
      return `<circle cx="260" cy="270" r="152" fill="none" stroke="${a}" stroke-width="8" opacity="0.35"/>`;
    case "carbon_guard":
      return `<path d="M160,220 C200,170 320,170 360,220 C335,200 185,200 160,220 Z" fill="${ink}" opacity="0.25"/>`;
    case "tool_mount":
      return `<g opacity="0.35">
        <rect x="360" y="310" width="70" height="26" rx="10" fill="${a}"/>
        <rect x="372" y="280" width="46" height="44" rx="14" fill="rgba(255,255,255,0.55)" stroke="rgba(18,22,30,0.16)" stroke-width="2"/>
      </g>`;
    case "armor_plate":
      return `<path d="M170,340 C210,410 310,410 350,340 C315,360 205,360 170,340 Z" fill="${ink}" opacity="0.22"/>`;
    case "sleeve":
      return `<path d="M190,170 C230,150 290,150 330,170 C315,180 205,180 190,170 Z" fill="rgba(58,123,213,0.12)"/>`;
    default:
      return "";
  }
}

/* ---------- HUD / tuning visualization ---------- */

function hudOverlay(s){
  const accent = s.accentColor;
  const over = clamp01(s.stability / 100);  // more = more overclock
  const signal = clamp01(s.signal / 100);   // more = more visible
  const force = clamp01(s.comfort / 100);   // more = more force

  const hudOpacity = (0.10 + signal * 0.55).toFixed(3);
  const density = 3 + Math.round(signal * 7); // lines count

  const ret = [];

  // outer reticle always minimal, amplified by signal
  if (s.uiStyle === "reticle" || s.uiStyle === "diagnostic" || s.uiStyle === "minimal"){
    ret.push(`
      <g opacity="${hudOpacity}">
        <circle cx="260" cy="270" r="178" fill="none" stroke="rgba(18,22,30,0.14)" stroke-width="2"/>
        <circle cx="260" cy="270" r="120" fill="none" stroke="rgba(18,22,30,0.10)" stroke-width="2"/>
        <line x1="82" y1="270" x2="124" y2="270" stroke="rgba(18,22,30,0.14)" stroke-width="2"/>
        <line x1="396" y1="270" x2="438" y2="270" stroke="rgba(18,22,30,0.14)" stroke-width="2"/>
        <line x1="260" y1="92" x2="260" y2="134" stroke="rgba(18,22,30,0.14)" stroke-width="2"/>
        <line x1="260" y1="406" x2="260" y2="448" stroke="rgba(18,22,30,0.14)" stroke-width="2"/>
      </g>
    `);
  }

  // diagnostic readouts
  if (s.uiStyle === "diagnostic"){
    ret.push(`
      <g opacity="${hudOpacity}">
        <rect x="92" y="364" width="180" height="66" rx="16" fill="rgba(255,255,255,0.55)" stroke="rgba(18,22,30,0.10)" stroke-width="2"/>
        <text x="110" y="392" font-size="11" fill="rgba(18,22,30,0.70)">THERMAL</text>
        <text x="110" y="414" font-size="12" fill="${accent}">${Math.round(34 + over*26)}°C</text>

        <rect x="300" y="364" width="128" height="66" rx="16" fill="rgba(255,255,255,0.55)" stroke="rgba(18,22,30,0.10)" stroke-width="2"/>
        <text x="318" y="392" font-size="11" fill="rgba(18,22,30,0.70)">TORQUE</text>
        <text x="318" y="414" font-size="12" fill="${accent}">${Math.round(60 + force*40)}%</text>
      </g>
    `);
  }

  // waveform mode
  if (s.uiStyle === "waveform"){
    ret.push(waveform(accent, hudOpacity, density, over));
  }

  // minimal mode: just a small tag + ticks
  if (s.uiStyle === "minimal"){
    ret.push(`
      <g opacity="${hudOpacity}">
        <rect x="94" y="96" width="160" height="42" rx="14" fill="rgba(255,255,255,0.55)" stroke="rgba(18,22,30,0.10)" stroke-width="2"/>
        <text x="112" y="122" font-size="12" fill="rgba(18,22,30,0.72)">CALIBRATION</text>
        <text x="232" y="122" font-size="12" fill="${accent}">OK</text>
      </g>
    `);
  }

  // overclock adds micro “noise” lines
  if (over > 0.55){
    ret.push(noiseLines(0.10 + (over-0.55)*0.40, 6 + Math.round(over*10)));
  }

  return ret.join("");
}

function waveform(accent, opacity, density, over){
  const lines = [];
  const baseY = 270;
  for (let i=0; i<density; i++){
    const x1 = 120 + i * (280/(density-1));
    const amp = 10 + over * 26;
    const y1 = baseY + Math.sin(i*0.8) * amp;
    const y2 = baseY + Math.cos(i*0.9) * amp;
    lines.push(`<path d="M${x1-20},${baseY} C${x1-10},${y1} ${x1+10},${y2} ${x1+20},${baseY}"
      fill="none" stroke="${accent}" stroke-width="2.5" opacity="${opacity}" stroke-linecap="round"/>`);
  }
  return `<g>${lines.join("")}</g>`;
}

function noiseLines(opacity, count){
  const out = [];
  for (let i=0;i<count;i++){
    const x = 100 + Math.random()*320;
    const y = 110 + Math.random()*320;
    const w = 24 + Math.random()*40;
    out.push(`<line x1="${x}" y1="${y}" x2="${x+w}" y2="${y}"
      stroke="rgba(18,22,30,0.18)" stroke-width="2" opacity="${opacity.toFixed(3)}"/>`);
  }
  return `<g>${out.join("")}</g>`;
}

function applyAura(s){
  const signal = clamp01(s.signal/100);
  const over = clamp01(s.stability/100);
  const force = clamp01(s.comfort/100);

  // signal drives visibility; over/force add intensity
  const op = 0.05 + signal*0.40 + (over*0.10) + (force*0.08);
  ui._aura.setAttribute("opacity", op.toFixed(3));

  // tint aura by accent, but keep subtle
  const circles = ui._aura.querySelectorAll("circle");
  const a = hexToRGBA(s.accentColor, 0.18 + signal*0.18);
  const b = hexToRGBA(s.accentColor, 0.10 + signal*0.12);
  if (circles[0]) circles[0].setAttribute("fill", a);
  if (circles[1]) circles[1].setAttribute("fill", b);
}

function warningsOverlay(s){
  const over = clamp01(s.stability/100);
  const force = clamp01(s.comfort/100);
  const needs = (over > 0.78) || (force > 0.82);

  if (!needs) return "";

  const level = Math.round(Math.max(over, force)*100);
  return `
    <g opacity="0.95">
      <rect x="94" y="148" width="210" height="56" rx="16"
        fill="rgba(255,255,255,0.70)" stroke="rgba(18,22,30,0.12)" stroke-width="2"/>
      <circle cx="118" cy="176" r="9" fill="rgba(234,87,80,0.85)"/>
      <text x="136" y="172" font-size="11" fill="rgba(18,22,30,0.75)">LIMIT ALERT</text>
      <text x="136" y="192" font-size="12" fill="rgba(234,87,80,0.92)">load ${level}% • recommend cooldown</text>
    </g>
  `;
}

/* ---------- motion (subtle) ---------- */

function attachIdle(){
  if (!ui._root) return;

  rafToken++;
  const token = rafToken;
  if (raf) cancelAnimationFrame(raf);

  const over = clamp01(state.stability/100);
  const signal = clamp01(state.signal/100);

  const speed = 0.7 + over*0.7;
  const wobble = 0.8 + signal*1.6;

  let t = Math.random()*1000;

  const tick = () => {
    if (token !== rafToken) return;
    t += 0.016 * speed;

    const y = Math.sin(t) * (2.0 + wobble);
    const r = Math.sin(t*0.85) * (0.8 + wobble*0.9);

    ui._root.setAttribute("transform", `translate(0 ${y.toFixed(2)}) rotate(${r.toFixed(2)} 260 270)`);
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
}

function pulse(){
  const root = ui._root;
  if (!root) return;
  root.animate(
    [{ transform: root.getAttribute("transform") || "" }, { transform: "scale(1.02)" }, { transform: "scale(1)" }],
    { duration: 240, easing: "ease-out" }
  );
}

/* ---------- spec sheet ---------- */

function generateSpec(s){
  const name = (s.name || "Unnamed").trim() || "Unnamed";
  const over = clamp01(s.stability/100);
  const signal = clamp01(s.signal/100);
  const force = clamp01(s.comfort/100);

  const thermal = Math.round(34 + over*26);
  const battery = Math.round(92 - over*24 - signal*10);
  const torque = Math.round(60 + force*40);

  const note = (over > 0.78 || force > 0.82)
    ? "Calibration recommends cooldown after high-load use."
    : "Calibration within recommended limits.";

  const items = [
    `Module: <strong>${cap(s.module)}</strong>`,
    `Finish: <strong>${cap(s.finish)}</strong>`,
    `Attachment: <strong>${cap(s.attachment.replace(/_/g,' '))}</strong>`,
    `Tuning: <strong>${modeBadge(s)}</strong>`,
    `Thermal: <strong>${thermal}°C</strong>`,
    `Torque: <strong>${torque}%</strong>`,
    `Battery projection: <strong>${battery}%</strong>`,
  ];

  return {
    title: `${name} — Spec Sheet`,
    note,
    html: `
      <ul>
        ${items.map(x => `<li>${x}</li>`).join("")}
      </ul>
      <div style="margin-top:10px;">Status: <span style="color:rgba(18,22,30,0.86)">${note}</span></div>
    `
  };
}

/* ---------- export ---------- */

async function exportPNG(){
  const svg = ui.frame.querySelector("svg");
  if (!svg) return;

  const filename = ((state.name || "augment").trim() || "augment")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const serialized = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = () => {
    const canvas = document.createElement("canvas");
    const size = 1200;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    // white background for portfolio
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0,0,size,size);

    // center-fit
    ctx.drawImage(img, 0, 0, size, size);

    URL.revokeObjectURL(url);

    const a = document.createElement("a");
    a.download = `${filename}-spec.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();

    toast("Exported PNG.");
  };

  img.onerror = () => {
    URL.revokeObjectURL(url);
    toast("Export failed. Try running via a local server (Live Server).");
  };

  img.src = url;
}

/* ---------- storage + random ---------- */

function saveState(s){ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch{ return null; }
}

function randomState(){
  const shells = ["#e9eef6","#eef2f7","#f3f6fb","#e8f0ff","#f1f3f6"];
  const accents = ["#3a7bd5","#1fb6ff","#2dd4bf","#7c3aed","#ef4444","#0ea5e9"];
  const modules = ["arm","hand","leg","eye","spine"];
  const attachments = ["none","led_ring","carbon_guard","tool_mount","armor_plate","sleeve"];
  const styles = ["reticle","diagnostic","waveform","minimal"];
  const finishes = ["ceramic","titanium","carbon","polymer"];

  return {
    ...defaultState(),
    module: pickOne(modules),
    attachment: pickOne(attachments),
    shellColor: pickOne(shells),
    accentColor: pickOne(accents),
    uiStyle: pickOne(styles),
    finish: pickOne(finishes),
    stability: randInt(10, 92),
    signal: randInt(8, 90),
    comfort: randInt(10, 92),
  };
}

/* ---------- microcopy ---------- */

function reactions(s){
  const over = clamp01(s.stability/100);
  const signal = clamp01(s.signal/100);
  const force = clamp01(s.comfort/100);
  const out = [];

  if (over > 0.8) out.push("Overclock engaged. Watch thermal drift.");
  else if (over < 0.3) out.push("Stabilizers active. Smooth response curve.");

  if (signal > 0.7) out.push("Signal profile high. Visibility increased.");
  else if (signal < 0.3) out.push("Stealth profile. Minimal signature.");

  if (force > 0.75) out.push("Torque bias high. Recommend soft-tissue checks.");
  else if (force < 0.35) out.push("Comfort bias. Adaptive damping enabled.");

  out.push("Calibration snapshot recorded.");
  return out;
}

/* ---------- UI toast ---------- */

function toast(msg){
  ui.toast.textContent = msg;
  ui.toast.hidden = false;
  ui.toast.animate(
    [{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "translateY(0)" }],
    { duration: 160, easing: "ease-out" }
  );
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    ui.toast.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: "ease-in" }).onfinish = () => {
      ui.toast.hidden = true;
    };
  }, 1600);
}

/* ---------- utils ---------- */

function clamp01(n){ return Math.max(0, Math.min(1, n)); }
function pickOne(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function randInt(a,b){ return Math.floor(a + Math.random()*(b-a+1)); }
function cap(s){ return (s||"").replace(/\b\w/g, c => c.toUpperCase()); }

function finishTint(finish){
  switch(finish){
    case "titanium": return "#dfe6ee";
    case "carbon": return "#cfd7df";
    case "polymer": return "#eef2f7";
    case "ceramic":
    default: return "#ffffff";
  }
}

// mix hex colors (simple) by t
function mixHex(a, b, t){
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const r = Math.round(pa.r + (pb.r - pa.r)*t);
  const g = Math.round(pa.g + (pb.g - pa.g)*t);
  const bl = Math.round(pa.b + (pb.b - pa.b)*t);
  return `rgb(${r},${g},${bl})`;
}

function hexToRgb(hex){
  const h = hex.replace("#","").trim();
  const v = h.length===3 ? h.split("").map(x=>x+x).join("") : h;
  const n = parseInt(v, 16);
  return { r: (n>>16)&255, g: (n>>8)&255, b: n&255 };
}

function hexToRGBA(hex, a){
  const c = hexToRgb(hex);
  return `rgba(${c.r},${c.g},${c.b},${a.toFixed(3)})`;
}
