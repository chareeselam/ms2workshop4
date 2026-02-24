/* Augment Studio — Cyborg Configurator
   Module images: assets/modules/{module}.png (silver)
                  assets/modules/{module}-{colorway}.png (black/blue/pink)

   Requires in index.html:
   - <select id="attachment"> options matching ATTACHMENTS keys
   - <div id="attachmentHint"></div>
*/

const $ = (id) => document.getElementById(id);

const ui = {
  name: $("name"),
  module: $("module"),
  attachment: $("attachment"),
  attachmentHint: $("attachmentHint"),
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

/* =========================================================
   Attachments (system logic)
   ========================================================= */

const ATTACHMENTS = {
  none: {
    label: "None",
    allowed: ["arm", "hand", "leg", "foot", "eye", "spine"],
    mods: { stability: 0, signal: 0, comfort: 0, thermal: 0, glow: 1 },
    hint: "No attachment modifiers.",
  },

  // “system” attachments
  neural_link: {
    label: "Neural Link Port",
    allowed: ["eye", "spine", "arm"],
    mods: { stability: +10, signal: +12, comfort: -4, thermal: +2, glow: 1.15 },
    hint: "+Stability, +Signal. Neural sync enabled.",
  },

  bio_sensor: {
    label: "Biofeedback Sensor Array",
    allowed: ["arm", "leg", "foot", "spine"],
    mods: { stability: +6, signal: +8, comfort: +6, thermal: 0, glow: 1.10 },
    hint: "+Comfort, +Signal. Biometrics feed available in Diagnostic.",
  },

  env_sensor: {
    label: "Environmental Sensor Cluster",
    allowed: ["arm", "hand", "spine", "eye"],
    mods: { stability: +4, signal: +14, comfort: -2, thermal: 0, glow: 1.20 },
    hint: "+Signal. Environmental telemetry visible in overlay.",
  },

  power_core: {
    label: "Adaptive Power Core",
    allowed: ["arm", "hand", "leg", "foot", "spine"],
    mods: { stability: +8, signal: -4, comfort: +2, thermal: -6, glow: 1.05 },
    hint: "+Stability. Thermal mitigation enabled (quieter signal).",
  },

  sleeve: {
    label: "Soft Sleeve",
    allowed: ["arm", "hand", "leg", "foot"],
    mods: { stability: +4, signal: -6, comfort: +14, thermal: 0, glow: 0.85 },
    hint: "+Comfort. Stealth profile (reduced glow).",
  },

  // legacy visuals (now with meaningful modifiers)
  led_ring: {
    label: "LED Ring",
    allowed: ["arm", "hand", "eye"],
    mods: { stability: -2, signal: +16, comfort: -2, thermal: +2, glow: 1.35 },
    hint: "High visibility: +Signal. Slight stability tradeoff.",
  },

  carbon_guard: {
    label: "Carbon Guard",
    allowed: ["arm", "leg", "foot"],
    mods: { stability: +14, signal: -2, comfort: -4, thermal: -2, glow: 0.95 },
    hint: "Protective: +Stability. Slight comfort tradeoff.",
  },

  tool_mount: {
    label: "Tool Mount",
    allowed: ["arm", "hand"],
    mods: { stability: +2, signal: 0, comfort: -10, thermal: +4, glow: 1.00 },
    hint: "Utility mount: load bias (comfort tradeoff).",
  },

  armor_plate: {
    label: "Armor Plate",
    allowed: ["arm", "leg", "foot", "spine"],
    mods: { stability: +10, signal: -2, comfort: -6, thermal: -3, glow: 0.95 },
    hint: "Shielding: stability up. Thermal risk down.",
  },
};

function clamp01(n) { return Math.max(0, Math.min(1, n)); }
function clamp100(n) { return Math.max(0, Math.min(100, n)); }
function pickOne(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }
function cap(s) { return (s || "").replace(/\b\w/g, c => c.toUpperCase()); }

function deriveState(s) {
  const a = ATTACHMENTS[s.attachment] ?? ATTACHMENTS.none;
  const m = a.mods || {};

  const ds = { ...s };
  ds.stability = clamp100(ds.stability + (m.stability ?? 0));
  ds.signal = clamp100(ds.signal + (m.signal ?? 0));
  ds.comfort = clamp100(ds.comfort + (m.comfort ?? 0));

  ds._thermalAdj = m.thermal ?? 0;
  ds._glowMult = m.glow ?? 1;

  ds._attachmentLabel = a.label;
  ds._attachmentHint = a.hint;

  return ds;
}

function isAttachmentAllowed(module, attachmentKey) {
  const a = ATTACHMENTS[attachmentKey] ?? ATTACHMENTS.none;
  return a.allowed.includes(module);
}

function refreshAttachmentOptions() {
  if (!ui.attachment) return;
  const module = ui.module.value;

  Array.from(ui.attachment.options).forEach(opt => {
    const ok = isAttachmentAllowed(module, opt.value);
    opt.disabled = !ok;
    opt.hidden = !ok;
  });

  // snap invalid selection to none
  if (!isAttachmentAllowed(module, ui.attachment.value)) {
    ui.attachment.value = "none";
    patchState({ attachment: "none" });
  }

  updateAttachmentHint();
}

function updateAttachmentHint() {
  if (!ui.attachmentHint) return;

  const a = ATTACHMENTS[ui.attachment.value] ?? ATTACHMENTS.none;
  const m = a.mods || {};

  const parts = [
    m.stability ? `${m.stability > 0 ? "+" : ""}${m.stability} Stability` : null,
    m.signal ? `${m.signal > 0 ? "+" : ""}${m.signal} Signal` : null,
    m.comfort ? `${m.comfort > 0 ? "+" : ""}${m.comfort} Comfort` : null,
  ].filter(Boolean);

  ui.attachmentHint.textContent =
    parts.length ? `${a.hint} (${parts.join(" • ")})` : a.hint;
}

/* =========================================================
   Render scheduling
   ========================================================= */

let renderQueued = false;

function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function patchState(patch) {
  state = { ...state, ...patch };
  requestRender();
}

/* =========================================================
   Idle animation (single continuous loop — no jitter)
   ========================================================= */

let idleRunning = false;
let idleRAF = 0;
let idleT = Math.random() * 1000;

let idleSpeed = 1.0;
let idleWobble = 3.0;
let idleRotAmp = 0.5;

function startIdleLoopIfNeeded() {
  if (!ui._root) return;
  if (idleRunning) return;

  idleRunning = true;

  const tick = () => {
    idleT += 0.016 * idleSpeed;
    const y = Math.sin(idleT) * idleWobble;
    const r = Math.sin(idleT * 0.75) * idleRotAmp;

    ui._root.style.transform =
      `translateY(${y.toFixed(2)}px) rotate(${r.toFixed(3)}deg)`;

    idleRAF = requestAnimationFrame(tick);
  };

  idleRAF = requestAnimationFrame(tick);
}

function updateIdleParams(ds) {
  const over = clamp01(ds.stability / 100);
  const sig = clamp01(ds.signal / 100);

  // calmer baseline than before
  idleSpeed = 0.55 + over * 1.1;
  idleWobble = 2.2 + sig * 2.8;
  idleRotAmp = 0.22 + over * 0.55;

  startIdleLoopIfNeeded();
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

/* =========================================================
   Init + state
   ========================================================= */

init();

function init() {
  hydrateControls(state);
  mountLayersOnce();
  refreshAttachmentOptions();
  requestRender();

  ui.name.addEventListener("input", () => patchState({ name: ui.name.value }));

  ui.module.addEventListener("change", () => {
    patchState({ module: ui.module.value });
    refreshAttachmentOptions();
  });

  ui.attachment.addEventListener("change", () => {
    patchState({ attachment: ui.attachment.value });
    updateAttachmentHint();
  });

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
    refreshAttachmentOptions();
    requestRender();
    toast("New configuration loaded.");
  });

  ui.save.addEventListener("click", () => {
    saveState(state);
    toast("Saved locally.");
  });

  ui.specBtn.addEventListener("click", () => {
    const spec = generateSpec(deriveState(state));
    toast(spec.note);
  });

  ui.exportBtn.addEventListener("click", exportPNG);

  ui.frame.addEventListener("click", () => {
    pulse();
    toast(pickOne(reactions(deriveState(state))));
  });
}

function defaultState() {
  return {
    name: "",
    module: "arm",
    attachment: "none",
    colorway: "silver",
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

/* =========================================================
   Labels + tags
   ========================================================= */

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

/* =========================================================
   Mount layers
   ========================================================= */

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
    toast("Module image not found. Check assets/modules naming.");
  };
}

/* =========================================================
   Module image path
   ========================================================= */

function moduleAssetPath(module, colorway) {
  const suffix = (colorway && colorway !== "silver") ? `-${colorway}` : "";
  return `assets/modules/${module}${suffix}.png`;
}

/* =========================================================
   Render
   ========================================================= */

function render() {
  const ds = deriveState(state);

  ui.stabilityLabel.textContent = stabilityTag(ds.stability);
  ui.signalLabel.textContent = signalTag(ds.signal);
  ui.comfortLabel.textContent = comfortTag(ds.comfort);

  ui.badgeName.textContent = (ds.name || "Unnamed").trim() || "Unnamed";
  ui.badgeMode.textContent = modeBadge(ds);

  updateAttachmentHint();

  const over = clamp01(ds.stability / 100);
  const sig = clamp01(ds.signal / 100);

  // module image (based on base selections)
  const src = moduleAssetPath(state.module, state.colorway);
  if (ui._moduleImg.getAttribute("src") !== src) {
    ui._moduleImg.style.opacity = "1";
    ui._moduleImg.src = src;
  }

  // finish filter
  ui._moduleImg.style.filter = finishFilter(state.finish);

  // keep tint off so PNG colorways show true
  ui._moduleTint.style.opacity = "0";
  ui._moduleTint.style.backgroundColor = "transparent";

  // glow (affected by attachment)
  const glowOp = ((0.08 + sig * 0.52) * (ds._glowMult || 1)).toFixed(2);
  ui._backGlow.style.background =
    `radial-gradient(ellipse 68% 62% at 50% 52%, ${state.accentColor}, transparent 72%)`;
  ui._backGlow.style.opacity = glowOp;

  // overlays (use derived state so HUD matches modifiers)
  ui._attachSvg.innerHTML = attachmentOverlay(ds);
  ui._hudSvg.innerHTML = hudOverlay(ds);

  // alert (use stability + thermal adj)
  if (over > 0.8) {
    const intensity = (0.2 + (over - 0.8) * 1.5).toFixed(2);
    ui._alertLayer.style.boxShadow =
      `inset 0 0 60px rgba(234,87,80,${intensity})`;

    const mitigated = (ds._thermalAdj || 0) < 0;
    ui._alertLayer.innerHTML = `
      <div style="position:absolute;bottom:18px;left:18px;color:#ea5750;font-weight:700;font-size:11px;
                  letter-spacing:0.08em;text-shadow:0 0 8px rgba(234,87,80,0.8);">
        ⚠ THERMAL LIMIT ${mitigated ? "MITIGATED" : "EXCEEDED"}
      </div>`;
  } else {
    ui._alertLayer.style.boxShadow = "none";
    ui._alertLayer.innerHTML = "";
  }

  // stable idle update (no restart jitter)
  updateIdleParams(ds);
}

/* =========================================================
   Finish filters
   ========================================================= */

function finishFilter(finish) {
  switch (finish) {
    case "titanium": return "contrast(0.92) brightness(1.08) sepia(0.18) hue-rotate(-18deg)";
    case "carbon": return "contrast(1.22) brightness(0.78) saturate(0.7)";
    case "polymer": return "contrast(0.82) brightness(1.18) saturate(1.1)";
    default: return "";
  }
}

/* =========================================================
   Attachment SVG (legacy visuals preserved)
   New attachments can be visual-only for now (returns "")
   ========================================================= */

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

    // new “system” attachments: visuals optional for now
    case "neural_link":
    case "bio_sensor":
    case "env_sensor":
    case "power_core":
      return "";

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

/* =========================================================
   HUD SVG
   ========================================================= */

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
        <path d="M84,340 L84,360 L104,360" fill="none" stroke="${accent}" stroke-width="2"/>
        <path d="M436,340 L436,360 L416,360" fill="none" stroke="${accent}" stroke-width="2"/>
      </g>`);
  }

  if (s.uiStyle === "diagnostic") {
    // base diagnostic metrics (slightly influenced by attachment thermal adj)
    const thermal = Math.round(34 + over * 26 + (s._thermalAdj || 0));
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

  // small “system” extra readouts
  if (s.uiStyle === "diagnostic" && s.attachment === "bio_sensor") {
    const hr = Math.round(58 + signal * 44);
    const spo2 = Math.round(94 + (1 - over) * 5);
    const stress = Math.round(14 + over * 62);

    parts.push(`
      <g opacity="${(+op * 1.1).toFixed(2)}">
        <rect x="86" y="306" width="192" height="44" rx="10" fill="rgba(0,0,0,0.40)" stroke="${accent}" stroke-width="1" opacity="0.78"/>
        <text x="100" y="332" font-size="10" fill="rgba(255,255,255,0.62)" letter-spacing="1">BIO</text>
        <text x="140" y="332" font-size="10" fill="${accent}" font-weight="bold">${hr} BPM</text>
        <text x="210" y="332" font-size="10" fill="rgba(255,255,255,0.62)">SpO₂</text>
        <text x="250" y="332" font-size="10" fill="${accent}" font-weight="bold">${spo2}%</text>
        <text x="100" y="346" font-size="9" fill="rgba(255,255,255,0.52)">Stress idx</text>
        <text x="160" y="346" font-size="9" fill="${accent}" font-weight="bold">${stress}</text>
      </g>`);
  }

  if (s.uiStyle !== "minimal" && s.attachment === "env_sensor") {
    const aqi = Math.round(18 + signal * 120);
    const uv = Math.round(1 + signal * 9);
    parts.push(`
      <g opacity="${(+op * 0.95).toFixed(2)}">
        <rect x="318" y="92" width="132" height="44" rx="10" fill="rgba(0,0,0,0.35)" stroke="${accent}" stroke-width="1" opacity="0.70"/>
        <text x="332" y="116" font-size="10" fill="rgba(255,255,255,0.62)" letter-spacing="1">ENV</text>
        <text x="372" y="116" font-size="10" fill="${accent}" font-weight="bold">AQI ${aqi}</text>
        <text x="332" y="132" font-size="9" fill="rgba(255,255,255,0.52)">UV</text>
        <text x="354" y="132" font-size="9" fill="${accent}" font-weight="bold">${uv}</text>
      </g>`);
  }

  if (s.uiStyle !== "minimal" && s.attachment === "neural_link") {
    const sync = Math.round(68 + signal * 30);
    parts.push(`
      <g opacity="${(+op * 0.95).toFixed(2)}">
        <rect x="86" y="92" width="154" height="36" rx="10" fill="rgba(0,0,0,0.35)" stroke="${accent}" stroke-width="1" opacity="0.70"/>
        <text x="100" y="115" font-size="10" fill="rgba(255,255,255,0.62)" letter-spacing="1">SYNC</text>
        <text x="146" y="115" font-size="10" fill="${accent}" font-weight="bold">${sync}%</text>
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

  lines.push(`<line x1="${cx - w / 2}" y1="${cy}" x2="${cx + w / 2}" y2="${cy}"
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
    lines.push(`<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x + w).toFixed(0)}" y2="${y.toFixed(0)}"
      stroke="rgba(255,255,255,0.70)" stroke-width="1.5" opacity="${op}"/>`);
  }
  return `<g>${lines.join("")}</g>`;
}

/* =========================================================
   Spec + storage + export
   ========================================================= */

function generateSpec(s) {
  const name = (s.name || "Unnamed").trim() || "Unnamed";
  const over = clamp01(s.stability / 100);
  const signal = clamp01(s.signal / 100);
  const force = clamp01(s.comfort / 100);

  const thermal = Math.round(34 + over * 26 + (s._thermalAdj || 0));
  const battery = Math.round(92 - over * 24 - signal * 10);
  const torque = Math.round(60 + force * 40);

  const note = (over > 0.78 || force > 0.82)
    ? "Calibration recommends cooldown after high-load use."
    : "Calibration within recommended limits.";

  return {
    title: `${name} — Spec Sheet`,
    note,
    html: `<ul>
      <li>Module: <strong>${cap(s.module)}</strong></li>
      <li>Colorway: <strong>${cap(s.colorway)}</strong></li>
      <li>Finish: <strong>${cap(s.finish)}</strong></li>
      <li>Attachment: <strong>${cap((s._attachmentLabel || s.attachment).replace(/_/g," "))}</strong></li>
      <li>Tuning: <strong>${modeBadge(s)}</strong></li>
      <li>Thermal: <strong>${thermal}°C</strong></li>
      <li>Torque: <strong>${torque}%</strong></li>
      <li>Battery projection: <strong>${battery}%</strong></li>
    </ul>`
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

/* =========================================================
   Random + reactions + toast
   ========================================================= */

function randomState() {
  const accents = ["#3a7bd5", "#1fb6ff", "#2dd4bf", "#7c3aed", "#ef4444", "#0ea5e9", "#f59e0b"];
  const modules = ["arm", "hand", "leg", "foot", "eye", "spine"];
  const attachments = Object.keys(ATTACHMENTS);
  const styles = ["reticle", "diagnostic", "waveform", "minimal"];
  const finishes = ["ceramic", "titanium", "carbon", "polymer"];
  const colorways = ["silver", "black", "blue", "pink"];

  const module = pickOne(modules);
  // pick a valid attachment for that module
  const validAttachments = attachments.filter(a => isAttachmentAllowed(module, a));
  const attachment = pickOne(validAttachments.length ? validAttachments : ["none"]);

  return {
    ...defaultState(),
    module,
    attachment,
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

  out.push(`Attachment: ${(s._attachmentLabel || s.attachment).replace(/_/g," ")}`);
  out.push("Calibration snapshot recorded.");
  return out;
}

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

/* =========================================================
   Color utils
   ========================================================= */

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