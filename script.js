/* PetLab — live preview avatar builder (single-file app.js)
   - Live updates (in-place SVG updates, no re-mount flicker)
   - Randomize / Save to localStorage
   - Lore generator (rule-based)
   - Click pet -> react + pulse
   - Export PNG (SVG -> canvas)
*/

const $ = (id) => document.getElementById(id);

const ui = {
  name: $("name"),
  species: $("species"),
  accessory: $("accessory"),
  bodyColor: $("bodyColor"),
  accentColor: $("accentColor"),
  eyeStyle: $("eyeStyle"),
  mouthStyle: $("mouthStyle"),
  calm: $("calm"),
  social: $("social"),
  spice: $("spice"),
  calmLabel: $("calmLabel"),
  socialLabel: $("socialLabel"),
  spiceLabel: $("spiceLabel"),
  lore: $("lore"),
  loreTitle: $("loreTitle"),
  loreBody: $("loreBody"),
  petFrame: $("petFrame"),
  bubble: $("bubble"),
  badgeName: $("badgeName"),
  badgeMood: $("badgeMood"),
  randomize: $("randomize"),
  save: $("save"),
  exportBtn: $("export"),
};

const STORAGE_KEY = "petlab.avatar.v2";
let state = loadState() || defaultState();

// idle animation handle
let raf = null;
let rafToken = 0;

init();

function init() {
  hydrateControls(state);

  // mount SVG once, then apply state
  mountPetOnce();
  render();

  // wire controls (live on input)
  ui.name.addEventListener("input", () => update({ name: ui.name.value }));
  ui.species.addEventListener("change", () => update({ species: ui.species.value }));
  ui.accessory.addEventListener("change", () => update({ accessory: ui.accessory.value }));
  ui.bodyColor.addEventListener("input", () => update({ bodyColor: ui.bodyColor.value }));
  ui.accentColor.addEventListener("input", () => update({ accentColor: ui.accentColor.value }));
  ui.eyeStyle.addEventListener("change", () => update({ eyeStyle: ui.eyeStyle.value }));
  ui.mouthStyle.addEventListener("change", () => update({ mouthStyle: ui.mouthStyle.value }));

  ui.calm.addEventListener("input", () => update({ calm: +ui.calm.value }));
  ui.social.addEventListener("input", () => update({ social: +ui.social.value }));
  ui.spice.addEventListener("input", () => update({ spice: +ui.spice.value }));

  ui.randomize.addEventListener("click", () => {
    state = randomState();
    hydrateControls(state);
    render();
    talk("New buddy dropped ✦");
  });

  ui.save.addEventListener("click", () => {
    saveState(state);
    talk("Saved! I will remember this form.");
  });

  ui.lore.addEventListener("click", () => {
    const lore = generateLore(state);
    ui.loreTitle.textContent = lore.title;
    ui.loreBody.innerHTML = lore.html;
    talk(lore.catchphrase);
  });

  ui.exportBtn.addEventListener("click", exportPNG);

  // click pet = react
  ui.petFrame.addEventListener("click", () => {
    talk(pickOne(reactionsFor(state)));
    pulsePet();
  });
}

/* ---------------- State ---------------- */

function defaultState() {
  return {
    name: "",
    species: "blob",
    accessory: "none",
    bodyColor: "#f6a6ff",
    accentColor: "#7cf7ff",
    eyeStyle: "dot",
    mouthStyle: "smile",
    calm: 50,
    social: 65,
    spice: 35,
  };
}

function hydrateControls(s) {
  ui.name.value = s.name ?? "";
  ui.species.value = s.species ?? "blob";
  ui.accessory.value = s.accessory ?? "none";
  ui.bodyColor.value = s.bodyColor ?? "#f6a6ff";
  ui.accentColor.value = s.accentColor ?? "#7cf7ff";
  ui.eyeStyle.value = s.eyeStyle ?? "dot";
  ui.mouthStyle.value = s.mouthStyle ?? "smile";
  ui.calm.value = String(s.calm ?? 50);
  ui.social.value = String(s.social ?? 65);
  ui.spice.value = String(s.spice ?? 35);
}

function update(patch) {
  state = { ...state, ...patch };
  render();
}

/* ---------------- Live preview: mount once + apply updates ---------------- */

function mountPetOnce() {
  ui.petFrame.innerHTML = basePetSVG();

  ui._svg = ui.petFrame.querySelector("svg");
  ui._root = ui._svg.querySelector("#petRoot");

  // ensure we have stable refs
  ui._body = ui._svg.querySelector("#body");
  ui._glow = ui._svg.querySelector("#glow");
  ui._ears = ui._svg.querySelector("#ears");
  ui._antenna = ui._svg.querySelector("#antenna");
  ui._eyes = ui._svg.querySelector("#eyes");
  ui._mouth = ui._svg.querySelector("#mouth");
  ui._accessory = ui._svg.querySelector("#accessory");
}

function render() {
  // labels
  ui.calmLabel.textContent = labelCalm(state.calm);
  ui.socialLabel.textContent = labelSocial(state.social);
  ui.spiceLabel.textContent = labelSpice(state.spice);

  // badges
  ui.badgeMood.textContent = moodTag(state);
  ui.badgeName.textContent = (state.name || "Unnamed").trim() || "Unnamed";

  // shape
  const d = petShapePath(state.species);
  ui._body.setAttribute("d", d);
  ui._glow.setAttribute("d", d);

  // colors
  ui._body.setAttribute("fill", state.bodyColor);

  // ears + antenna
  ui._ears.innerHTML = petEars(state.species, state.accentColor);
  ui._antenna.innerHTML = state.species === "alien" ? alienAntenna(state.accentColor) : "";

  // face
  ui._eyes.innerHTML = eyeGroup(state.eyeStyle);
  ui._mouth.innerHTML = mouthGroup(state.mouthStyle);

  // accessory
  ui._accessory.innerHTML = accessoryGroup(state.accessory, state.accentColor);

  // restart idle animation so it matches new vibe
  attachIdleAnimation();
}

/* ---------------- Labels ---------------- */

function labelCalm(v) {
  if (v < 25) return "Chaos gremlin";
  if (v < 45) return "Wiggly";
  if (v < 65) return "Balanced";
  if (v < 85) return "Calm";
  return "Zen";
}
function labelSocial(v) {
  if (v < 25) return "Solo";
  if (v < 45) return "Shy";
  if (v < 65) return "Friendly";
  if (v < 85) return "Extro";
  return "Party mode";
}
function labelSpice(v) {
  if (v < 25) return "Extra soft";
  if (v < 45) return "Soft";
  if (v < 65) return "Spunky";
  if (v < 85) return "Spicy";
  return "Unhinged";
}

function moodTag(s) {
  return `${labelCalm(s.calm)} • ${labelSocial(s.social)} • ${labelSpice(s.spice)}`;
}

/* ---------------- SVG skeleton ---------------- */

function basePetSVG() {
  return `
  <svg viewBox="0 0 500 500" width="100%" height="100%" role="img" aria-label="Pet avatar">
    <defs>
      <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="rgba(0,0,0,0.55)"/>
      </filter>

      <radialGradient id="bodyGlow" cx="35%" cy="25%" r="65%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.22)" />
        <stop offset="60%" stop-color="rgba(255,255,255,0.04)" />
        <stop offset="100%" stop-color="rgba(255,255,255,0.00)" />
      </radialGradient>

      <!-- aura blur -->
      <filter id="auraBlur" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="14" />
      </filter>
    </defs>

    <g id="petRoot" filter="url(#softShadow)">

      <!-- vibe aura behind everything -->
      <g id="vibeAura" opacity="0.0">
        <circle cx="250" cy="275" r="170" fill="rgba(255,255,255,0.16)" filter="url(#auraBlur)"></circle>
        <circle cx="250" cy="275" r="120" fill="rgba(255,255,255,0.10)" filter="url(#auraBlur)"></circle>
      </g>

      <g id="antenna"></g>
      <g id="ears"></g>

      <path id="body"
        d="${petShapePath("blob")}"
        fill="#f6a6ff"
        stroke="rgba(255,255,255,0.22)"
        stroke-width="6"
      />
      <path id="glow"
        d="${petShapePath("blob")}"
        fill="url(#bodyGlow)"
        opacity="0.9"
      />

      <!-- cheeks group so we can control intensity -->
      <g id="cheeks">
        <circle id="cheekL" cx="185" cy="285" r="16" fill="rgba(255,255,255,0.16)"/>
        <circle id="cheekR" cx="315" cy="285" r="16" fill="rgba(255,255,255,0.16)"/>
      </g>

      <g id="eyes"></g>

      <!-- brows sit above eyes -->
      <g id="brows"></g>

      <g id="mouth"></g>

      <!-- vibe marks on top of face -->
      <g id="vibeMarks"></g>

      <!-- floating decor around pet -->
      <g id="vibeDecor"></g>

      <g id="accessory"></g>
    </g>
  </svg>
  `;
}

/* ---------------- Shape library ---------------- */

function petShapePath(species) {
  switch (species) {

    case "cat":
      return "M145,250 C140,165 185,125 250,130 C315,125 360,165 355,250 C350,345 300,390 250,390 C200,390 150,345 145,250 Z";

    case "bunny":
      return "M160,190 C145,120 175,80 205,105 C220,118 220,160 214,198 C225,160 245,118 265,105 C295,80 325,120 310,190 C340,210 360,245 350,290 C330,380 285,405 250,405 C215,405 170,380 150,290 C140,245 160,210 160,190 Z";

    case "alien":
      return "M150,255 C145,170 200,120 250,120 C300,120 355,170 350,255 C344,360 292,400 250,400 C208,400 156,360 150,255 Z";

    case "dog":
      return "M140,270 C120,190 180,130 250,135 C320,130 380,190 360,270 C380,330 340,400 250,400 C160,400 120,330 140,270 Z";

    case "frog":
      return "M150,280 C140,210 190,160 250,165 C310,160 360,210 350,280 C360,340 315,395 250,395 C185,395 140,340 150,280 Z";

    case "turtle":
      return "M130,280 C130,210 180,160 250,155 C320,160 370,210 370,280 C370,350 310,400 250,400 C190,400 130,350 130,280 Z";

    case "blob":
    default:
      return "M140,265 C120,180 165,125 250,135 C335,125 380,185 360,265 C390,325 345,395 250,395 C155,395 110,325 140,265 Z";
  }
}

function petEars(species, accent) {
  if (species === "cat") {
    return `
      <path d="M175,165 C160,120 190,95 215,130 C205,145 190,155 175,165 Z" fill="${accent}" opacity="0.85"/>
      <path d="M325,165 C340,120 310,95 285,130 C295,145 310,155 325,165 Z" fill="${accent}" opacity="0.85"/>
    `;
  }
  if (species === "bunny") {
    return `
      <path d="M200,195 C165,130 185,70 215,95 C235,112 228,158 215,205 Z" fill="${accent}" opacity="0.85"/>
      <path d="M300,195 C335,130 315,70 285,95 C265,112 272,158 285,205 Z" fill="${accent}" opacity="0.85"/>
    `;
  }
  if (species === "dog") {
    return `
      <path d="M170,180 C130,160 130,220 170,230" fill="${accent}" opacity="0.8"/>
      <path d="M330,180 C370,160 370,220 330,230" fill="${accent}" opacity="0.8"/>
    `;
  }

  if (species === "frog") {
    return `
      <circle cx="200" cy="190" r="28" fill="${accent}" opacity="0.9"/>
      <circle cx="300" cy="190" r="28" fill="${accent}" opacity="0.9"/>
    `;
  }

  if (species === "turtle") {
    return `
      <ellipse cx="130" cy="280" rx="28" ry="20" fill="${accent}" opacity="0.85"/>
      <ellipse cx="370" cy="280" rx="28" ry="20" fill="${accent}" opacity="0.85"/>
    `;
  }
  return "";
}

function alienAntenna(accent) {
  return `
    <g opacity="0.9">
      <path d="M230,120 C220,70 240,55 250,90 C260,55 280,70 270,120" fill="none" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>
      <circle cx="230" cy="120" r="10" fill="${accent}"/>
      <circle cx="270" cy="120" r="10" fill="${accent}"/>
    </g>
  `;
}

/* ---------------- Face library ---------------- */

function eyeGroup(style) {
  const base = `fill="rgba(0,0,0,0.78)"`;
  if (style === "dot") {
    return `
      <circle cx="205" cy="255" r="10" ${base}/>
      <circle cx="295" cy="255" r="10" ${base}/>
    `;
  }
  if (style === "sparkle") {
    return `
      <g>
        <circle cx="205" cy="255" r="14" ${base}/>
        <circle cx="295" cy="255" r="14" ${base}/>
        <circle cx="200" cy="248" r="4" fill="rgba(255,255,255,0.9)"/>
        <circle cx="290" cy="248" r="4" fill="rgba(255,255,255,0.9)"/>
      </g>
    `;
  }
  if (style === "sleepy") {
    return `
      <path d="M190,255 C200,245 210,245 220,255" stroke="rgba(0,0,0,0.78)" stroke-width="8" stroke-linecap="round" fill="none"/>
      <path d="M280,255 C290,245 300,245 310,255" stroke="rgba(0,0,0,0.78)" stroke-width="8" stroke-linecap="round" fill="none"/>
    `;
  }
  // star
  return `
    <g fill="rgba(0,0,0,0.78)">
      <path d="M205 242 l5 10 11 1 -8 7 2 11 -10 -6 -10 6 2 -11 -8 -7 11 -1 z"/>
      <path d="M295 242 l5 10 11 1 -8 7 2 11 -10 -6 -10 6 2 -11 -8 -7 11 -1 z"/>
    </g>
  `;
}

function mouthGroup(style) {
  if (style === "tiny") {
    return `<circle cx="250" cy="290" r="6" fill="rgba(0,0,0,0.68)"/>`;
  }
  if (style === "o") {
    return `<circle cx="250" cy="292" r="10" fill="none" stroke="rgba(0,0,0,0.68)" stroke-width="7"/>`;
  }
  if (style === "smirk") {
    return `<path d="M238,292 C250,302 270,300 280,290" stroke="rgba(0,0,0,0.68)" stroke-width="8" stroke-linecap="round" fill="none"/>`;
  }
  // smile
  return `<path d="M225,288 C240,310 260,310 275,288" stroke="rgba(0,0,0,0.68)" stroke-width="8" stroke-linecap="round" fill="none"/>`;
}

/* ---------------- Accessories ---------------- */

function accessoryGroup(acc, accent) {
  switch (acc) {
    case "bow":
      return `
        <g transform="translate(0,-10)" opacity="0.95">
          <path d="M200,175 C175,160 175,190 200,182 C190,175 190,170 200,175 Z" fill="${accent}"/>
          <path d="M300,175 C325,160 325,190 300,182 C310,175 310,170 300,175 Z" fill="${accent}"/>
          <circle cx="250" cy="178" r="10" fill="${accent}"/>
        </g>
      `;
    case "goggles":
      return `
        <g opacity="0.9">
          <rect x="160" y="232" width="80" height="56" rx="20" fill="rgba(0,0,0,0.18)" stroke="${accent}" stroke-width="6"/>
          <rect x="260" y="232" width="80" height="56" rx="20" fill="rgba(0,0,0,0.18)" stroke="${accent}" stroke-width="6"/>
          <path d="M240,260 L260,260" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>
          <path d="M150,260 L160,260 M340,260 L350,260" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>
        </g>
      `;
    case "halo":
      return `
        <g opacity="0.85">
          <ellipse cx="250" cy="140" rx="90" ry="28" fill="none" stroke="${accent}" stroke-width="10"/>
          <ellipse cx="250" cy="140" rx="70" ry="18" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="6"/>
        </g>
      `;
    case "backpack":
      return `
        <g opacity="0.9">
          <path d="M140,290 C110,290 110,355 140,355 C152,355 160,345 160,335 L160,310 C160,300 152,290 140,290 Z"
            fill="rgba(0,0,0,0.18)" stroke="${accent}" stroke-width="6"/>
          <path d="M360,290 C390,290 390,355 360,355 C348,355 340,345 340,335 L340,310 C340,300 348,290 360,290 Z"
            fill="rgba(0,0,0,0.18)" stroke="${accent}" stroke-width="6"/>
        </g>
      `;
    case "crown":
      return `
        <g opacity="0.95">
          <path d="M200,170 L220,150 L250,175 L280,150 L300,170 Z"
            fill="${accent}"/>
          <circle cx="220" cy="150" r="6" fill="#fff"/>
          <circle cx="250" cy="145" r="6" fill="#fff"/>
          <circle cx="280" cy="150" r="6" fill="#fff"/>
        </g>
      `;

    case "flower":
      return `
        <g opacity="0.9">
          <circle cx="320" cy="210" r="16" fill="${accent}"/>
          <circle cx="310" cy="195" r="10" fill="#fff"/>
          <circle cx="330" cy="195" r="10" fill="#fff"/>
          <circle cx="305" cy="215" r="10" fill="#fff"/>
          <circle cx="335" cy="215" r="10" fill="#fff"/>
        </g>
      `;

    case "scarf":
      return `
        <path d="M180,310 C220,330 280,330 320,310"
          stroke="${accent}"
          stroke-width="14"
          stroke-linecap="round"
          fill="none"/>
      `;

    case "glasses":
      return `
        <g opacity="0.9">
          <circle cx="200" cy="255" r="22"
            fill="none"
            stroke="${accent}"
            stroke-width="6"/>
          <circle cx="300" cy="255" r="22"
            fill="none"
            stroke="${accent}"
            stroke-width="6"/>
          <line x1="222" y1="255" x2="278" y2="255"
            stroke="${accent}"
            stroke-width="6"/>
        </g>
      `;
    default:
      return "";
  }
}

/* ---------------- Playful behaviors ---------------- */

function attachIdleAnimation() {
  if (!ui._root) return;

  // cancel previous animation loop
  rafToken++;
  const token = rafToken;
  if (raf) cancelAnimationFrame(raf);

  const speed = 0.65 + (state.calm / 100) * 0.55;        // calmer = slower
  const wiggle = 2 + (1 - state.calm / 100) * 6;         // chaos = more tilt
  const bounce = 4 + (state.social / 100) * 4;           // social = bouncier
  const wobble = (state.spice / 100) * 2.4;              // spice = extra wobble

  let t = Math.random() * 1000;

  const tick = () => {
    if (token !== rafToken) return; // stop if restarted

    t += 0.016 * speed;
    const y = Math.sin(t) * bounce;
    const r = Math.sin(t * 0.9) * (wiggle + wobble);
    const x = Math.cos(t * 0.7) * (1.5 + wobble);

    ui._root.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${r.toFixed(2)} 250 290)`);
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
}

function pulsePet() {
  const root = ui._root;
  if (!root) return;

  const start = root.getAttribute("transform") || "";
  root.animate(
    [
      { transform: start },
      { transform: `${start} scale(1.03)` },
      { transform: start },
    ],
    { duration: 260, easing: "ease-out" }
  );
}

function talk(msg) {
  ui.bubble.textContent = msg;
  ui.bubble.hidden = false;

  ui.bubble.animate(
    [{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "translateY(0)" }],
    { duration: 160, easing: "ease-out" }
  );

  clearTimeout(talk._t);
  talk._t = setTimeout(() => {
    ui.bubble.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: "ease-in" }).onfinish = () => {
      ui.bubble.hidden = true;
    };
  }, 1700);
}

function reactionsFor(s) {
  const name = (s.name || "bestie").trim() || "bestie";
  const calm = s.calm, social = s.social, spice = s.spice;

  const a = [];
  if (calm < 35) a.push("I chose chaos today. Respectfully.");
  if (calm > 75) a.push("We breathe. We blink. We proceed.");
  if (social > 70) a.push(`Hi ${name}! Let’s go be seen.`);
  if (social < 35) a.push("We are in our cozy era. No interruptions.");
  if (spice > 70) a.push("Let me handle it. I have opinions.");
  if (spice < 35) a.push("Soft landing only. No harsh vibes.");

  a.push("Click again. I like attention.");
  a.push("I am small but emotionally influential.");

  return a;
}

/* ---------------- Lore generator (rule-based) ---------------- */

function generateLore(s) {
  const name = (s.name || "Unnamed").trim() || "Unnamed";

  const archetype = pickOne([
    "Pocket Oracle",
    "Chaos Intern",
    "Gentle Menace",
    "Pixel Guardian",
    "Snack Scientist",
    "Vibe Cartographer",
  ]);

  const quirk = pickOne([
    "collects shiny UI icons like treasure",
    "falls asleep mid-scroll then wakes up productive",
    "believes hydration is a personality trait",
    "speaks only in tiny motivational haikus sometimes",
    "gets jealous when you open other tabs",
  ]);

  const loves = pickOne([
    "warm lighting",
    "clean grids",
    "glowy gradients",
    "soft ambient music",
    "tiny wins",
  ]);

  const weakness = pickOne([
    "overthinking on Thursdays",
    "doomscroll temptation",
    "being perceived",
    "snack-related bribery",
    "late-night productivity spirals",
  ]);

  const care = [
    `Mood: <strong>${moodTag(s)}</strong>`,
    `Primary function: <strong>${archetype}</strong>`,
    `Quirk: ${quirk}`,
    `Favorite thing: ${loves}`,
    `Weakness: ${weakness}`,
  ];

  const catchphrase = pickOne([
    "Okay bestie. One tiny step. Right now.",
    "I have a plan. It’s adorable and effective.",
    "We do it messy. We do it anyway.",
    "Drink water and open the file. That’s the spell.",
  ]);

  return {
    title: `${name}’s Care Instructions`,
    catchphrase,
    html: `
      <ul>
        ${care.map((x) => `<li>${x}</li>`).join("")}
      </ul>
      <div style="margin-top:10px;">
        Catchphrase: <span style="color:rgba(255,255,255,.86)">${catchphrase}</span>
      </div>
    `,
  };
}

/* ---------------- Export PNG (SVG -> canvas) ---------------- */

async function exportPNG() {
  const svg = ui.petFrame.querySelector("svg");
  if (!svg) return;

  const filename = ((state.name || "petlab").trim() || "petlab")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const serialized = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = () => {
    const canvas = document.createElement("canvas");
    const size = 1024;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size); // transparent bg
    ctx.drawImage(img, 0, 0, size, size);

    URL.revokeObjectURL(url);

    const a = document.createElement("a");
    a.download = `${filename}-avatar.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();

    talk("Exported! I am now portable.");
  };

  img.onerror = () => {
    URL.revokeObjectURL(url);
    talk("Export failed. Try running via Live Server / a local server.");
  };

  img.src = url;
}

/* ---------------- Storage + random ---------------- */

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

function randomState() {
  const colors = ["#f6a6ff", "#7cf7ff", "#ffd37a", "#a3ffb2", "#ff7aa2", "#c4a7ff", "#9df0ff"];
  const accents = ["#7cf7ff", "#ffd37a", "#c4a7ff", "#a3ffb2", "#ff7aa2", "#ffffff"];

  return {
    ...defaultState(),
    species: pickOne(["blob", "cat", "bunny", "alien", "dog", "frog", "turtle"]),
    accessory: pickOne(["none", "bow", "goggles", "halo", "backpack", "crown", "flower", "scarf", "glasses"]),
    bodyColor: pickOne(colors),
    accentColor: pickOne(accents),
    eyeStyle: pickOne(["dot", "sparkle", "sleepy", "star"]),
    mouthStyle: pickOne(["smile", "tiny", "o", "smirk"]),
    calm: randInt(10, 90),
    social: randInt(10, 90),
    spice: randInt(10, 90),
  };
}

/* ---------------- Utils ---------------- */

function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(a, b) {
  return Math.floor(a + Math.random() * (b - a + 1));
}