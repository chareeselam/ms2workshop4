/* Augment Studio — Cyborg Configurator (cleaned)
   Expects module images at:
   assets/modules/arm.png, arm-black.png, arm-blue.png, arm-pink.png
   assets/modules/hand.png, hand-black.png, hand-blue.png, hand-pink.png
   assets/modules/foot.png, foot-black.png, foot-blue.png, foot-pink.png
   assets/modules/eye.png,  eye-black.png,  eye-blue.png,  eye-pink.png
   (Silver uses the base filename without suffix)
*/

const $ = (id) => document.getElementById(id);

const ui = {
  name: $("name"),
  module: $("module"),
  attachment: $("attachment"),
  colorway: $("colorway"),
  accentColor: $("accentColor"),
  uiStyle: $("uiStyle"),
  finish: $("finish"),

  stability: $("stability"),
  signal: $("signal"),
  comfort: $("comfort"),

  stabilityLabel: $("stabilityLabel"),
  signalLabel: $("signalLabel"),
  comfortLabel: $("comfortLabel"),

  specBtn: $("spec"),
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

const STORAGE_KEY = "augment_studio.v2";
let state = loadState() ?? defaultState();

let renderQueued = false;
let idleRAF = 0;
let idleToken = 0;

init();

/* ------------------------------ init */

function init() {
  hydrateControls(state);
  mountLayersOnce();
  requestRender();

  ui.name.addEventListener("input", () => patchState({ name: ui.name.value }));
  ui.module.addEventListener("change", () => patchState({ module: ui.module.value }));
  ui.attachment.addEventListener("change", () => patchState({ attachment: ui.attachment.value }));
  ui.colorway.addEventListener("change", () => patchState({ colorway: ui.colorway.value }));
  ui.accentColor.addEventListener("input", () => patchState({ accentColor: ui.accentColor.value }));
  ui.uiStyle.addEventListener("change", () => patchState({ uiStyle: ui.uiStyle.value }));
  ui.finish.addEventListener("change", () => patchState({ finish: ui.finish.value }));

  ui.stability.addEventListener("input", () => patchState({ stability: +ui.stability.value }));
  ui.signal.addEventListener("input", () => patchState({ signal: +ui.signal.value }));
  ui.comfort.addEventListener("input", () => patchState({ comfort: +ui.comfort.value }));

  ui.randomize.addEventListener("click", () => {
    state = randomState();
    hydrateControls(state);
    requestRender();
    toast("New configuration loaded.");
  });

  ui.save.addEventListener("click", () => {
    saveState(state);
    toast("Saved locally.");
  });

  ui.specBtn.addEventListener("click", () => {
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

/* ------------------------------ state */

function defaultState() {
  return {
    name: "",
    module: "arm",
    attachment: "none",
    colorway: "silver", // ✅ default
    accentColor: "#3a7bd5",
    uiStyle: "reticle",
    finish: "ceramic",
    stability: 55,
    signal: 35,
    comfort: 45,
  };
}

function hydrateControls(s) {
  ui.name.value = s.name ?? "";
  ui.module.value = s.module ?? "arm";
  ui.attachment.value = s.attachment ?? "none";
  ui.colorway.value = s.colorway ?? "silver";
  ui.accentColor.value = s.accentColor ?? "#3a7bd5";
  ui.uiStyle.value = s.uiStyle ?? "reticle";
  ui.finish.value = s.finish ?? "ceramic";
  ui.stability.value = String(s.stability ?? 55);
  ui.signal.value = String(s.signal ?? 35);
  ui.comfort.value = String(s.comfort ?? 45);
}

function patchState(patch) {
  state = { ...state, ...patch };
  requestRender();
}

/* ------------------------------ render scheduling */

function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

/* ------------------------------ labels */

function stabilityTag(v) {
  if (v < 20) return "Stabilized";
  if (v < 45) return "Safe";
  if (v < 65) return "Balanced";
  if (v < 85) return "Boosted";
  return "Overclock";
}
function signalTag(v) {
  if (v < 20) return "Stealth";
  if (v < 45) return "Low signal";
  if (v < 65) return "Broadcast";
  if (v < 85) return "Beacon";
  return "High signal";
}
function comfortTag(v) {
  if (v < 20) return "Comfort";
  if (v < 45) return "Gentle";
  if (v < 65) return "Balanced";
  if (v < 85) return "Force";
  return "Max torque";
}
function modeBadge(s) {
  return `${stabilityTag(s.stability)} • ${signalTag(s.signal)} • ${comfortTag(s.comfort)}`;
}

/* ------------------------------ mount layers */

function mountLayersOnce() {
  ui.frame.innerHTML = `
    <div class="layer-wrap" id="layerRoot">
      <div class="layer-glow" id="backGlow"></div>
      <img class="layer" id="moduleImg" alt="Module" draggable="false" />
      <div class="layer-tint" id="moduleTint"></div>
      <svg class="layer" id="attachSvg" viewBox="0 0 520 540" xmlns="http://www.w3.org/2000/svg"></svg>
      <svg class="layer" id="hudSvg" viewBox="0 0 520 540" xmlns="http://www.w3.org/2000/svg"></svg>
      <div class="layer" id="alertLayer" style="pointer-events:none;"></div>
    </div>
  `;

  ui._root = $("layerRoot");
  ui._backGlow = $("backGlow");
  ui._moduleImg = $("moduleImg");
  ui._moduleTint = $("moduleTint");
  ui._attachSvg = $("attachSvg");
  ui._hudSvg = $("hudSvg");
  ui._alertLayer = $("alertLayer");

  ui._moduleImg.ondragstart = () => false;

  ui._moduleImg.onerror = () => {
    ui._moduleImg.removeAttribute("src");
    ui._moduleImg.style.opacity = "0";
    toast("Module image not found. Check /assets/modules naming (e.g., arm-blue.png).");
  };
}

/* ------------------------------ module image routing */

function moduleAssetBase(module) {
  return module;
}

function moduleAssetPath(module, colorway) {
  const base = moduleAssetBase(module);
  const suffix = (colorway && colorway !== "silver") ? `-${colorway}` : "";
  return `assets/modules/${base}${suffix}.png`;
}

/* ------------------------------ render */

function render() {
  ui.stabilityLabel.textContent = stabilityTag(state.stability);
  ui.signalLabel.textContent = signalTag(state.signal);
  ui.comfortLabel.textContent = comfortTag(state.comfort);

  ui.badgeName.textContent = (state.name || "Unnamed").trim() || "Unnamed";
  ui.badgeMode.textContent = modeBadge(state);

  const over = clamp01(state.stability / 100);
  const sig = clamp01(state.signal / 100);

  // ✅ module image (now uses colorway variants)
  const src = moduleAssetPath(state.module, state.colorway);
  if (ui._moduleImg.getAttribute("src") !== src) {
    ui._moduleImg.style.opacity = "1";
    ui._moduleImg.src = src;
  }

  // finish filter
  ui._moduleImg.style.filter = finishFilter(state.finish);

  // ✅ disable tint-mix so your PNGs show true color
  ui._moduleTint.style.opacity = "0";
  ui._moduleTint.style.backgroundColor = "transparent";

  // glow
  const glowOp = (0.08 + sig * 0.52).toFixed(2);
  ui._backGlow.style.background =
    `radial-gradient(ellipse 68% 62% at 50% 52%, ${state.accentColor}, transparent 72%)`;
  ui._backGlow.style.opacity = glowOp;

  // overlays
  ui._attachSvg.innerHTML = attachmentOverlay(state);
  ui._hudSvg.innerHTML = hudOverlay(state);

  // alert
  if (over > 0.8) {
    ui._alertLayer.style.boxShadow =
      `inset 0 0 60px rgba(234,87,80,${(0.2 + (over - 0.8) * 1.5).toFixed(2)})`;
    ui._alertLayer.innerHTML = `
      <div style="position:absolute;bottom:18px;left:18px;color:#ea5750;font-weight:700;font-size:11px;
                  letter-spacing:0.08em;text-shadow:0 0 8px rgba(234,87,80,0.8);">
        ⚠ THERMAL LIMIT EXCEEDED
      </div>`;
  } else {
    ui._alertLayer.style.boxShadow = "none";
    ui._alertLayer.innerHTML = "";
  }

  startIdle();
}

/* ------------------------------ finish filters */

function finishFilter(finish) {
  switch (finish) {
    case "titanium": return "contrast(0.92) brightness(1.08) sepia(0.18) hue-rotate(-18deg)";
    case "carbon": return "contrast(1.22) brightness(0.78) saturate(0.7)";
    case "polymer": return "contrast(0.82) brightness(1.18) saturate(1.1)";
    default: return "";
  }
}

/* ------------------------------ attachment SVG */

function attachmentOverlay(s) {
  const a = s.accentColor;
  const ah = hexToRGBA(a, 0.70);
  const ag = hexToRGBA(a, 0.18);

  switch (s.attachment) {
    case "led_ring":
      return `
        <g>
          <circle cx="260" cy="270" r="196" fill="none" stroke="${ah}" stroke-width="3" stroke-dasharray="6 10" opacity="0.55"/>
          <circle cx="260" cy="270" r="196" fill="none" stroke="${a}" stroke-width="1.5" opacity="0.25"/>
          ${ledNodes(260, 270, 196, 12, a)}
        </g>`;

    case "carbon_guard":
      return `
        <g opacity="0.50">
          <path d="M148,180 L372,180 L402,270 L372,360 L148,360 L118,270 Z"
            fill="none" stroke="${a}" stroke-width="2.5" stroke-dasharray="8 5"/>
          <path d="M148,180 L190,200 L190,340 L148,360" fill="${ag}" stroke="none"/>
          <path d="M372,180 L330,200 L330,340 L372,360" fill="${ag}" stroke="none"/>
        </g>`;

    case "tool_mount":
      return `
        <g opacity="0.70">
          <rect x="380" y="240" width="72" height="14" rx="6" fill="${a}"/>
          <rect x="434" y="210" width="14" height="72" rx="6" fill="${a}"/>
          <rect x="416" y="200" width="34" height="22" rx="8"
            fill="rgba(255,255,255,0.25)" stroke="${a}" stroke-width="2"/>
          <circle cx="443" cy="282" r="9" fill="${a}" opacity="0.80"/>
          <circle cx="443" cy="282" r="5" fill="rgba(255,255,255,0.6)"/>
        </g>`;

    case "armor_plate":
      return `
        <g opacity="0.55">
          ${hexPlate(200, 170, a)}
          ${hexPlate(280, 158, a)}
          ${hexPlate(320, 182, a)}
          ${hexPlate(190, 348, a)}
          ${hexPlate(268, 360, a)}
          ${hexPlate(315, 340, a)}
        </g>`;

    case "sleeve":
      return `
        <g opacity="0.45">
          <path d="M165,155 C200,130 320,130 355,155 C330,145 190,145 165,155 Z" fill="${a}"/>
          <path d="M165,385 C200,410 320,410 355,385 C330,395 190,395 165,385 Z" fill="${a}"/>
          <line x1="165" y1="155" x2="165" y2="385" stroke="${a}" stroke-width="2.5" stroke-dasharray="5 7"/>
          <line x1="355" y1="155" x2="355" y2="385" stroke="${a}" stroke-width="2.5" stroke-dasharray="5 7"/>
        </g>`;

    default:
      return "";
  }
}

function ledNodes(cx, cy, r, count, color) {
  const nodes = [];
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r;
    nodes.push(`
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${color}" opacity="0.90"/>
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${color}" opacity="0.20"/>
    `);
  }
  return nodes.join("");
}

function hexPlate(cx, cy, color) {
  const r = 32;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(" ");
  return `<polygon points="${pts}" fill="${hexToRGBA(color, 0.22)}" stroke="${color}"
    stroke-width="1.8" stroke-linejoin="round"/>`;
}

/* ------------------------------ HUD SVG (kept) */

function hudOverlay(s) {
  const accent = s.accentColor;
  const over = clamp01(s.stability / 100);
  const signal = clamp01(s.signal / 100);
  const force = clamp01(s.comfort / 100);
  const op = (0.08 + signal * 0.60).toFixed(3);
  const parts = [];

  if (s.uiStyle !== "waveform") {
    parts.push(`
      <g opacity="${op}">
        <circle cx="260" cy="270" r="176" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/>
        <circle cx="260" cy="270" r="118" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="1.5"/>
        <line x1="84"  y1="270" x2="126" y2="270" stroke="rgba(255,255,255,0.20)" stroke-width="1.5"/>
        <line x1="394" y1="270" x2="436" y2="270" stroke="rgba(255,255,255,0.20)" stroke-width="1.5"/>
        <line x1="260" y1="94"  x2="260" y2="136" stroke="rgba(255,255,255,0.20)" stroke-width="1.5"/>
        <line x1="260" y1="404" x2="260" y2="446" stroke="rgba(255,255,255,0.20)" stroke-width="1.5"/>
        <circle cx="260" cy="270" r="4" fill="${accent}" opacity="0.70"/>
      </g>`);
  }

  if (s.uiStyle === "reticle") {
    parts.push(`
      <g opacity="${op}">
        <path d="M84,200 L84,180 L104,180" fill="none" stroke="${accent}" stroke-width="2"/>
        <path d="M436,200 L436,180 L416,180" fill="none" stroke="${accent}" stroke-width="2"/>
        <path d="M84,340 L84,360 L104,360"  fill="none" stroke="${accent}" stroke-width="2"/>
        <path d="M436,340 L436,360 L416,360" fill="none" stroke="${accent}" stroke-width="2"/>
      </g>`);
  }

  if (s.uiStyle === "diagnostic") {
    const thermal = Math.round(34 + over * 26);
    const torque = Math.round(60 + force * 40);
    const battery = Math.round(92 - over * 22 - signal * 10);
    parts.push(`
      <g opacity="${(+op * 1.3).toFixed(2)}">
        <rect x="86" y="366" width="148" height="58" rx="10" fill="rgba(0,0,0,0.45)" stroke="${accent}" stroke-width="1" opacity="0.80"/>
        <text x="100" y="390" font-size="9" fill="rgba(255,255,255,0.55)" letter-spacing="1">THERMAL</text>
        <text x="100" y="412" font-size="14" font-weight="bold" fill="${accent}">${thermal}°C</text>

        <rect x="246" y="366" width="120" height="58" rx="10" fill="rgba(0,0,0,0.45)" stroke="${accent}" stroke-width="1" opacity="0.80"/>
        <text x="260" y="390" font-size="9" fill="rgba(255,255,255,0.55)" letter-spacing="1">TORQUE</text>
        <text x="260" y="412" font-size="14" font-weight="bold" fill="${accent}">${torque}%</text>

        <rect x="378" y="366" width="100" height="58" rx="10" fill="rgba(0,0,0,0.45)" stroke="${accent}" stroke-width="1" opacity="0.80"/>
        <text x="392" y="390" font-size="9" fill="rgba(255,255,255,0.55)" letter-spacing="1">BATTERY</text>
        <text x="392" y="412" font-size="14" font-weight="bold" fill="${accent}">${battery}%</text>
      </g>`);
  }

  if (s.uiStyle === "waveform") {
    parts.push(waveformOverlay(accent, op, over, signal));
  }

  if (s.uiStyle === "minimal") {
    parts.push(`
      <g opacity="${op}">
        <rect x="86" y="92" width="148" height="36" rx="8" fill="rgba(0,0,0,0.50)" stroke="${accent}" stroke-width="1"/>
        <text x="100" y="115" font-size="11" fill="rgba(255,255,255,0.60)" letter-spacing="1.5">CALIBRATION</text>
        <text x="218" y="115" font-size="11" fill="${accent}" font-weight="bold"> OK</text>
      </g>`);
  }

  if (over > 0.55) parts.push(glitchLines(over));
  return parts.join("\n");
}

function waveformOverlay(accent, opacity, over, signal) {
  const cx = 260, cy = 270, w = 260, pts = 18;
  const amp = 14 + over * 30 + signal * 12;
  const lines = [];

  for (let i = 0; i < pts; i++) {
    const x = cx - w / 2 + (i / (pts - 1)) * w;
    const y1 = cy + Math.sin(i * 0.7) * amp;
    const xn = cx - w / 2 + ((i + 1) / (pts - 1)) * w;
    const yn = cy + Math.sin((i + 1) * 0.7) * amp;
    lines.push(`<path d="M${x.toFixed(1)},${cy} C${x.toFixed(1)},${y1.toFixed(1)} ${xn.toFixed(1)},${yn.toFixed(1)} ${xn.toFixed(1)},${cy}"
      fill="none" stroke="${accent}" stroke-width="2.5" stroke-linecap="round" opacity="${opacity}"/>`);
  }

  lines.push(`<line x1="${cx - w/2}" y1="${cy}" x2="${cx + w/2}" y2="${cy}"
    stroke="${accent}" stroke-width="1" opacity="${(+opacity * 0.4).toFixed(2)}" stroke-dasharray="4 6"/>`);

  return `<g>${lines.join("")}</g>`;
}

function glitchLines(over) {
  const count = Math.round(4 + (over - 0.55) * 22);
  const lines = [];
  for (let i = 0; i < count; i++) {
    const x = 90 + Math.random() * 340;
    const y = 110 + Math.random() * 320;
    const w = 16 + Math.random() * 54;
    const op = (0.06 + (over - 0.55) * 0.50).toFixed(2);
    lines.push(`<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x+w).toFixed(0)}" y2="${y.toFixed(0)}"
      stroke="rgba(255,255,255,0.70)" stroke-width="1.5" opacity="${op}"/>`);
  }
  return `<g>${lines.join("")}</g>`;
}

/* ------------------------------ idle */

function startIdle() {
  if (!ui._root) return;

  idleToken++;
  const token = idleToken;
  cancelAnimationFrame(idleRAF);

  const over = clamp01(state.stability / 100);
  const sig = clamp01(state.signal / 100);
  const speed = 0.55 + over * 1.4;
  const wobble = 3.0 + sig * 4.0;

  let t = Math.random() * 1000;

  const tick = () => {
    if (token !== idleToken) return;
    t += 0.016 * speed;
    const y = Math.sin(t) * wobble;
    const r = Math.sin(t * 0.75) * (0.5 + over * 0.8);
    ui._root.style.transform = `translateY(${y.toFixed(2)}px) rotate(${r.toFixed(3)}deg)`;
    idleRAF = requestAnimationFrame(tick);
  };

  idleRAF = requestAnimationFrame(tick);
}

function pulse() {
  if (!ui._root) return;
  ui._root.animate(
    [
      { transform: ui._root.style.transform || "translateY(0)" },
      { transform: "translateY(-6px) scale(1.04)" },
      { transform: ui._root.style.transform || "translateY(0)" }
    ],
    { duration: 280, easing: "ease-out" }
  );
}

/* ------------------------------ spec + export + storage */

function generateSpec(s) {
  const name = (s.name || "Unnamed").trim() || "Unnamed";
  const over = clamp01(s.stability / 100);
  const signal = clamp01(s.signal / 100);
  const force = clamp01(s.comfort / 100);
  const thermal = Math.round(34 + over * 26);
  const battery = Math.round(92 - over * 24 - signal * 10);
  const torque = Math.round(60 + force * 40);

  const note = (over > 0.78 || force > 0.82)
    ? "Calibration recommends cooldown after high-load use."
    : "Calibration within recommended limits.";

  const items = [
    `Module: <strong>${cap(s.module)}</strong>`,
    `Colorway: <strong>${cap(s.colorway)}</strong>`,
    `Finish: <strong>${cap(s.finish)}</strong>`,
    `Attachment: <strong>${cap(s.attachment.replace(/_/g, " "))}</strong>`,
    `Tuning: <strong>${modeBadge(s)}</strong>`,
    `Thermal: <strong>${thermal}°C</strong>`,
    `Torque: <strong>${torque}%</strong>`,
    `Battery projection: <strong>${battery}%</strong>`,
  ];

  return {
    title: `${name} — Spec Sheet`,
    note,
    html: `<ul>${items.map(x => `<li>${x}</li>`).join("")}</ul>`
  };
}

async function exportPNG() {
  const filename = ((state.name || "augment").trim() || "augment")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (typeof html2canvas === "undefined") {
    toast("html2canvas not loaded — add the CDN script to index.html.");
    return;
  }

  toast("Exporting…");

  try {
    const canvas = await html2canvas(ui.frame, {
      backgroundColor: "#0a0a0f",
      scale: 2,
      useCORS: true,
      allowTaint: false,
    });

    const a = document.createElement("a");
    a.download = `${filename}-spec.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
    toast("Exported PNG.");
  } catch (err) {
    console.error(err);
    toast("Export failed. Try VS Code Live Server.");
  }
}

function saveState(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* ------------------------------ random + microcopy */

function randomState() {
  const accents = ["#3a7bd5","#1fb6ff","#2dd4bf","#7c3aed","#ef4444","#0ea5e9","#f59e0b"];
  const modules = ["arm","hand","leg","eye","spine"];
  const attachments = ["none","led_ring","carbon_guard","tool_mount","armor_plate","sleeve"];
  const styles = ["reticle","diagnostic","waveform","minimal"];
  const finishes = ["ceramic","titanium","carbon","polymer"];
  const colorways = ["silver","black","blue","pink"];

  return {
    ...defaultState(),
    module: pickOne(modules),
    attachment: pickOne(attachments),
    colorway: pickOne(colorways),
    accentColor: pickOne(accents),
    uiStyle: pickOne(styles),
    finish: pickOne(finishes),
    stability: randInt(10, 92),
    signal: randInt(8, 90),
    comfort: randInt(10, 92),
  };
}

function reactions(s) {
  const over = clamp01(s.stability / 100);
  const signal = clamp01(s.signal / 100);
  const force = clamp01(s.comfort / 100);
  const out = [];

  if (over > 0.80) out.push("Overclock engaged. Watch thermal drift.");
  else if (over < 0.30) out.push("Stabilizers active. Smooth response curve.");

  if (signal > 0.70) out.push("Signal profile high. Visibility increased.");
  else if (signal < 0.30) out.push("Stealth profile. Minimal signature.");

  if (force > 0.75) out.push("Torque bias high. Recommend soft-tissue checks.");
  else if (force < 0.35) out.push("Comfort bias. Adaptive damping enabled.");

  out.push("Calibration snapshot recorded.");
  return out;
}

/* ------------------------------ toast */

function toast(msg) {
  ui.toast.textContent = msg;
  ui.toast.hidden = false;

  ui.toast.animate(
    [{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "translateY(0)" }],
    { duration: 160, easing: "ease-out" }
  );

  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    ui.toast.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: "ease-in" })
      .onfinish = () => { ui.toast.hidden = true; };
  }, 2000);
}

/* ------------------------------ utils */

function clamp01(n) { return Math.max(0, Math.min(1, n)); }
function pickOne(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(a,b) { return Math.floor(a + Math.random() * (b - a + 1)); }
function cap(s) { return (s || "").replace(/\b\w/g, c => c.toUpperCase()); }

function hexToRgb(hex) {
  const h = hex.replace("#", "").trim();
  const v = h.length === 3 ? h.split("").map(x => x + x).join("") : h;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function hexToRGBA(hex, a) {
  const c = hexToRgb(hex);
  return `rgba(${c.r},${c.g},${c.b},${a.toFixed(3)})`;
}