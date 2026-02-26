/* ════════════════════════════════════════════════
   CLOCK
════════════════════════════════════════════════ */
function updateClock() {
  const n = new Date();
  document.getElementById('sysTime').textContent =
    String(n.getHours()).padStart(2,'0') + ':' +
    String(n.getMinutes()).padStart(2,'0') + ':' +
    String(n.getSeconds()).padStart(2,'0');
}
setInterval(updateClock, 1000); updateClock();

/* ════════════════════════════════════════════════
   GOALS
════════════════════════════════════════════════ */
const selectedGoals = new Set(['longevity']);
document.getElementById('goalGrid').addEventListener('click', e => {
  const chip = e.target.closest('.goal-chip');
  if (!chip) return;
  const g = chip.dataset.goal;
  if (selectedGoals.has(g)) {
    if (selectedGoals.size > 1) { selectedGoals.delete(g); chip.classList.remove('active'); }
  } else {
    selectedGoals.add(g); chip.classList.add('active');
  }
  updateLivePanel();
});

/* ════════════════════════════════════════════════
   LIVE PANEL UPDATES
════════════════════════════════════════════════ */
function getLiveInputs() {
  return {
    sleepHours: parseFloat(document.getElementById('sleepHours').value),
    sleepQuality: document.getElementById('sleepQuality').value,
    stress: document.getElementById('stressLevel').value,
    work: document.getElementById('workType').value,
    activity: document.getElementById('activityLevel').value,
    injury: document.getElementById('injuryHistory').value,
    climate: document.getElementById('climate').value,
    environment: document.getElementById('environment').value,
    goals: Array.from(selectedGoals),
  };
}

function computeRiskIndex(inp) {
  let risk = 0;
  if (inp.stress === 'high') risk += 2;
  if (inp.stress === 'extreme') risk += 4;
  if (inp.injury === 'chronic') risk += 3;
  if (inp.injury !== 'none') risk += 1;
  if (inp.sleepHours < 6) risk += 2;
  if (inp.sleepQuality === 'poor') risk += 2;
  if (inp.activity === 'athlete' && inp.injury !== 'none') risk += 2;
  return Math.min(risk, 10);
}

function computeProfileScore(inp) {
  let s = 50;
  if (inp.sleepQuality === 'excellent') s += 10;
  if (inp.sleepQuality === 'good') s += 6;
  if (inp.sleepQuality === 'poor') s -= 8;
  if (inp.stress === 'low') s += 8;
  if (inp.stress === 'extreme') s -= 12;
  if (inp.activity === 'athlete') s += 10;
  if (inp.activity === 'active') s += 6;
  if (inp.activity === 'sedentary') s -= 5;
  if (inp.injury === 'none') s += 8;
  if (inp.injury === 'chronic') s -= 10;
  s += selectedGoals.size * 2;
  return Math.max(10, Math.min(100, s));
}

function updateLivePanel() {
  const inp = getLiveInputs();
  const risk = computeRiskIndex(inp);
  const score = computeProfileScore(inp);

  document.getElementById('lv-sleep').textContent = inp.sleepHours + 'h / ' + cap(inp.sleepQuality);
  document.getElementById('lv-stress').textContent = cap(inp.stress);
  document.getElementById('lv-work').textContent = cap(inp.work);
  document.getElementById('lv-injury').textContent = cap(inp.injury);
  document.getElementById('lv-climate').textContent = cap(inp.climate);
  document.getElementById('lv-goals').textContent = inp.goals.map(cap).join(', ');
  document.getElementById('lv-risk').textContent = risk + '/10';
  document.getElementById('lv-score').textContent = score + '/100';

  // hero metrics
  const nl = Math.round(12 - score * 0.08);
  document.getElementById('heroM1').textContent = nl + 'ms';
  document.getElementById('heroM2').textContent = Math.round(score * 0.9) + '%';
  document.getElementById('heroM3').textContent = score;
  document.querySelector('#hero .metric-card:nth-child(3) .delta').textContent =
    selectedGoals.size + ' goal' + (selectedGoals.size > 1 ? 's' : '') + ' active';
}

document.getElementById('sleepHours').addEventListener('input', e => {
  document.getElementById('sleepHoursVal').textContent = e.target.value + 'h';
  updateLivePanel();
});
['sleepQuality','stressLevel','workType','activityLevel','injuryHistory','climate','environment']
  .forEach(id => document.getElementById(id)?.addEventListener('change', updateLivePanel));

updateLivePanel();

/* ════════════════════════════════════════════════
   AI LOGIC ENGINE
════════════════════════════════════════════════ */
const MODULES = {
  /* Neural */
  neural_stabilizer: {
    name: 'Neural Stabilizer Array',
    color: 'cyan',
    tag: 'NEURAL',
    statBonus: { neural: 22, stab: 8, thermal: 5, score: 12 },
    desc: 'Dampens cortical noise, stabilizes motor signal pathways'
  },
  neural_amplifier: {
    name: 'Neural Amplifier Interface',
    color: 'cyan',
    tag: 'NEURAL',
    statBonus: { neural: 34, stab: -5, thermal: -8, score: 14 },
    desc: 'Maximizes neural throughput for high-focus operation'
  },
  /* Structural */
  carbon_exo: {
    name: 'Carbon Exoskeletal Frame',
    color: 'amber',
    tag: 'STRUCTURAL',
    statBonus: { neural: -3, stab: 28, thermal: 12, score: 16 },
    desc: 'High-tensile carbon weave reinforcement layer'
  },
  titanium_joint: {
    name: 'Titanium Joint Reinforcement',
    color: 'amber',
    tag: 'STRUCTURAL',
    statBonus: { neural: 0, stab: 22, thermal: 8, score: 14 },
    desc: 'Medical-grade Ti-6Al-4V alloy joint replacement'
  },
  /* Thermal */
  thermal_regulator: {
    name: 'Adaptive Thermal Regulator',
    color: 'green',
    tag: 'THERMAL',
    statBonus: { neural: 4, stab: 6, thermal: 28, score: 10 },
    desc: 'Phase-change thermal equilibrium across all climates'
  },
  cooling_mesh: {
    name: 'Active Cooling Mesh',
    color: 'green',
    tag: 'THERMAL',
    statBonus: { neural: 8, stab: 4, thermal: 22, score: 8 },
    desc: 'Microfluidic heat extraction for high-load environments'
  },
  /* Power */
  bio_core: {
    name: 'Longevity Bio-Core',
    color: 'green',
    tag: 'POWER',
    statBonus: { neural: 10, stab: 10, thermal: 10, score: 18 },
    desc: 'Energy-efficient symbiotic power generation system'
  },
  adaptive_core: {
    name: 'Adaptive Power Cell',
    color: 'cyan',
    tag: 'POWER',
    statBonus: { neural: 6, stab: 14, thermal: 6, score: 14 },
    desc: 'Variable output power management with load prediction'
  },
  /* Sensors */
  bio_sensor_array: {
    name: 'Biofeedback Sensor Array',
    color: 'cyan',
    tag: 'SENSOR',
    statBonus: { neural: 16, stab: 4, thermal: 2, score: 10 },
    desc: 'Real-time biometric monitoring and adaptive response'
  },
  env_sensor_cluster: {
    name: 'Environmental Sensor Cluster',
    color: 'amber',
    tag: 'SENSOR',
    statBonus: { neural: 10, stab: 0, thermal: 14, score: 8 },
    desc: 'Ambient condition analysis for proactive adaptation'
  },
  /* Aesthetic */
  stealth_coating: {
    name: 'Stealth Nano-Coating',
    color: 'amber',
    tag: 'SURFACE',
    statBonus: { neural: 0, stab: 8, thermal: 4, score: 6 },
    desc: 'Radar-absorptive surface treatment, minimal EM signature'
  },
  bioluminescent_shell: {
    name: 'Bioluminescent Shell',
    color: 'cyan',
    tag: 'SURFACE',
    statBonus: { neural: 6, stab: 2, thermal: 0, score: 8 },
    desc: 'Programmable optical layer with identity customization'
  },
};

function runAIEngine(inp) {
  const goals = inp.goals;
  const selected = [];
  const reasoning = [];

  /* 1. Neural selection */
  if (inp.stress === 'extreme' || inp.stress === 'high') {
    selected.push('neural_stabilizer');
    reasoning.push('Elevated stress profile → Neural Stabilizer Array selected to regulate cortical hyperactivation and reduce signal distortion');
  } else if (goals.includes('focus') || inp.work === 'analytical') {
    selected.push('neural_amplifier');
    reasoning.push('Focus goal + analytical workload → Neural Amplifier Interface selected to maximize throughput for cognitive-intensive tasks');
  } else {
    selected.push('neural_stabilizer');
    reasoning.push('Baseline neural management → Neural Stabilizer Array deployed for general-purpose cortical regulation');
  }

  /* 2. Structural selection */
  if (inp.injury === 'lower' || inp.injury === 'chronic') {
    selected.push('titanium_joint');
    reasoning.push('Lower body injury history detected → Titanium Joint Reinforcement selected to redistribute load and prevent re-injury cycles');
  } else if (goals.includes('strength') || inp.activity === 'athlete') {
    selected.push('carbon_exo');
    reasoning.push('Strength goal + high activity level → Carbon Exoskeletal Frame selected for maximum structural amplification');
  } else if (inp.injury === 'upper' || inp.injury === 'spine') {
    selected.push('titanium_joint');
    reasoning.push('Upper/spinal injury history → Titanium Joint Reinforcement selected for controlled load management');
  } else {
    selected.push('carbon_exo');
    reasoning.push('Standard structural augmentation → Carbon Exoskeletal Frame selected for rigidity and endurance');
  }

  /* 3. Thermal selection */
  if (inp.climate === 'cold') {
    selected.push('thermal_regulator');
    reasoning.push('Cold climate detected → Adaptive Thermal Regulator selected; phase-change system maintains optimal limb temperature');
  } else if (inp.climate === 'hot' || inp.climate === 'humid') {
    selected.push('cooling_mesh');
    reasoning.push('High-temperature environment → Active Cooling Mesh selected; microfluidic extraction prevents thermal overload');
  } else if (inp.climate === 'variable') {
    selected.push('thermal_regulator');
    reasoning.push('Variable climate profile → Adaptive Thermal Regulator selected for full-spectrum thermal management');
  } else {
    if (goals.includes('endurance')) {
      selected.push('cooling_mesh');
      reasoning.push('Endurance goal in temperate climate → Active Cooling Mesh selected to sustain output during prolonged exertion');
    } else {
      selected.push('thermal_regulator');
      reasoning.push('Standard thermal conditions → Adaptive Thermal Regulator deployed as default thermal baseline');
    }
  }

  /* 4. Power selection */
  if (goals.includes('longevity') || (inp.sleepQuality === 'poor' && inp.sleepHours < 6)) {
    selected.push('bio_core');
    reasoning.push('Longevity goal active → Longevity Bio-Core selected; symbiotic energy generation reduces draw on organic systems');
  } else {
    selected.push('adaptive_core');
    reasoning.push('Dynamic workload detected → Adaptive Power Cell selected; load-predictive output prevents brownout under stress spikes');
  }

  /* 5. Sensor selection */
  if (goals.includes('recovery') || inp.activity === 'athlete') {
    selected.push('bio_sensor_array');
    reasoning.push('Recovery-focus + high activity → Biofeedback Sensor Array selected for continuous recovery monitoring and adaptation');
  } else if (inp.environment === 'field' || inp.environment === 'remote' || inp.environment === 'industrial') {
    selected.push('env_sensor_cluster');
    reasoning.push('Field/industrial environment → Environmental Sensor Cluster selected for ambient hazard detection');
  } else {
    selected.push('bio_sensor_array');
    reasoning.push('Urban operation profile → Biofeedback Sensor Array deployed for real-time biometric regulation');
  }

  /* 6. Surface / aesthetic */
  if (goals.includes('stealth') || inp.environment === 'industrial' || inp.environment === 'field') {
    selected.push('stealth_coating');
    reasoning.push('Stealth profile active → Nano-Coating applied; EM signature reduced to minimal detectable threshold');
  } else if (goals.includes('aesthetics') || goals.includes('sensory')) {
    selected.push('bioluminescent_shell');
    reasoning.push('Aesthetic/sensory enhancement goal → Bioluminescent Shell applied; programmable identity layer enables visual customization');
  } else {
    selected.push('stealth_coating');
    reasoning.push('Default surface treatment → Stealth Nano-Coating applied for passive EM signature management');
  }

  /* Compute stats */
  const stats = { neural: 0, stab: 0, thermal: 0, score: 0 };
  selected.forEach(key => {
    const m = MODULES[key];
    stats.neural += m.statBonus.neural;
    stats.stab += m.statBonus.stab;
    stats.thermal += m.statBonus.thermal;
    stats.score += m.statBonus.score;
  });

  /* Base profile adjustments */
  const ps = computeProfileScore(inp);
  const riskPenalty = computeRiskIndex(inp) * 2;
  stats.score = Math.round(Math.min(100, stats.score + ps * 0.3 - riskPenalty));
  stats.neural = Math.max(0, Math.min(100, stats.neural));
  stats.stab = Math.max(0, Math.min(100, stats.stab));
  stats.thermal = Math.max(0, Math.min(100, stats.thermal));

  /* Generate build name */
  const prefixes = { longevity: 'VITA', strength: 'TITAN', focus: 'APEX', aesthetics: 'AURORA', recovery: 'REGEN', endurance: 'ARES', stealth: 'SHADE', sensory: 'VELA' };
  const primaryGoal = goals[0] || 'longevity';
  const prefix = prefixes[primaryGoal] || 'AAS';
  const suffix = String(Math.floor(Math.random()*900)+100);
  const buildName = prefix + '-' + suffix;

  /* Accent color */
  const accentMap = {
    longevity: '#3df0ff', strength: '#ffc14a', focus: '#3df0ff',
    aesthetics: '#d97aff', recovery: '#3dffb2', endurance: '#ff8a4a',
    stealth: '#8899bb', sensory: '#d97aff'
  };
  const accent = accentMap[primaryGoal] || '#3df0ff';

  return { selected, reasoning, stats, buildName, accent };
}

/* ════════════════════════════════════════════════
   PROCESSING ANIMATION
════════════════════════════════════════════════ */
function runProcessingAnimation(cb) {
  const ps = document.getElementById('processingState');
  ps.classList.add('visible');
  const rows = document.querySelectorAll('[id^="prow-"]');

  rows.forEach(r => { r.classList.remove('done','active'); });

  let i = 0;
  const step = () => {
    if (i > 0) rows[i-1].classList.replace('active','done');
    if (i < rows.length) {
      rows[i].classList.add('active');
      i++;
      setTimeout(step, 280 + Math.random() * 180);
    } else {
      setTimeout(() => {
        ps.classList.remove('visible');
        cb();
      }, 200);
    }
  };
  setTimeout(step, 100);
}

/* ════════════════════════════════════════════════
   SVG PREVIEW GENERATOR
════════════════════════════════════════════════ */
function generateSVG(modules, accent, inp) {
  const c = accent;
  const cDim = c.replace('#','');
  const isBlue = c === '#3df0ff';
  const isAmber = c === '#ffc14a';

  // Determine body part from injury/goals
  let bodyPart = 'arm';
  if (inp.injury === 'lower') bodyPart = 'leg';
  if (inp.injury === 'spine') bodyPart = 'spine';
  if (inp.goals.includes('strength') && inp.activity === 'athlete') bodyPart = 'arm';
  if (inp.goals.includes('endurance')) bodyPart = 'leg';

  const hasThermal = modules.some(m => MODULES[m]?.tag === 'THERMAL');
  const hasNeural = modules.some(m => MODULES[m]?.tag === 'NEURAL');
  const hasStealth = modules.includes('stealth_coating');

  // Build SVG
  let svg = `<svg viewBox="0 0 480 480" class="aug-svg" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${c}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${c}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bodyGrad" cx="40%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#1a2030"/>
      <stop offset="100%" stop-color="#0a0c12"/>
    </radialGradient>
    <filter id="glowF">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="softGlow">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background radial -->
  <circle cx="240" cy="240" r="180" fill="url(#glow1)" opacity="0.5"/>
`;

  if (bodyPart === 'arm') {
    svg += renderArm(c, hasThermal, hasNeural, hasStealth, modules);
  } else if (bodyPart === 'leg') {
    svg += renderLeg(c, hasThermal, hasNeural, hasStealth, modules);
  } else {
    svg += renderArm(c, hasThermal, hasNeural, hasStealth, modules);
  }

  // HUD overlay
  svg += renderHUD(c, modules, inp);

  svg += `</svg>`;
  return svg;
}

function renderArm(c, hasThermal, hasNeural, hasStealth, modules) {
  const segments = [
    // Upper arm
    { x:190, y:80, w:100, h:140, rx:20 },
    // Elbow
    { x:195, y:215, w:90, h:50, rx:14 },
    // Lower arm
    { x:188, y:260, w:104, h:120, rx:18 },
    // Wrist
    { x:196, y:375, w:88, h:30, rx:12 },
    // Hand
    { x:185, y:400, w:110, h:60, rx:16 },
  ];

  const opacity = hasStealth ? 0.75 : 1;
  let out = `\n  <!-- ARM UNIT -->`;

  segments.forEach((s, i) => {
    out += `\n  <rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.rx}"
    fill="url(#bodyGrad)" stroke="${c}" stroke-width="${i === 1 ? 1 : 1.5}" opacity="${opacity}"/>`;
  });

  // Panel lines
  out += `
  <line x1="210" y1="100" x2="270" y2="100" stroke="${c}" stroke-width="1" opacity="0.3"/>
  <line x1="200" y1="130" x2="280" y2="130" stroke="${c}" stroke-width="0.5" opacity="0.2"/>
  <line x1="200" y1="160" x2="280" y2="160" stroke="${c}" stroke-width="0.5" opacity="0.2"/>
  <line x1="200" y1="280" x2="290" y2="280" stroke="${c}" stroke-width="1" opacity="0.3"/>
  <line x1="200" y1="310" x2="290" y2="310" stroke="${c}" stroke-width="0.5" opacity="0.2"/>
  `;

  // Accent details
  out += `
  <rect x="210" y="94" width="60" height="6" rx="3" fill="${c}" opacity="0.6"/>
  <rect x="210" y="275" width="60" height="4" rx="2" fill="${c}" opacity="0.5"/>
  `;

  // Port circles (structural detail)
  [[195,145],[285,145],[195,170],[285,170]].forEach(([x,y]) => {
    out += `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.5"/>`;
    out += `<circle cx="${x}" cy="${y}" r="2" fill="${c}" opacity="0.4"/>`;
  });

  // Neural lines if applicable
  if (hasNeural) {
    out += `
    <path d="M240 110 C240 110 260 130 255 155 C250 175 230 185 235 205" 
      fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="4 3" opacity="0.7" filter="url(#glowF)"/>
    <path d="M240 270 C240 270 220 290 225 315 C230 335 250 345 245 360"
      fill="none" stroke="${c}" stroke-width="1.5" stroke-dasharray="3 4" opacity="0.5" filter="url(#glowF)"/>
    `;
  }

  // Thermal vents if applicable
  if (hasThermal) {
    [[295,100],[295,115],[295,130]].forEach(([x,y]) => {
      out += `<rect x="${x}" y="${y}" width="18" height="4" rx="2" fill="${c}" opacity="0.35"/>`;
    });
  }

  // LED accent ring (wrist)
  out += `
  <rect x="196" y="375" width="88" height="30" rx="12" fill="none" stroke="${c}" stroke-width="2" opacity="0.8" filter="url(#softGlow)"/>
  `;

  // Finger lines
  for (let i = 0; i < 4; i++) {
    const fx = 198 + i * 26;
    out += `<rect x="${fx}" y="412" width="14" height="42" rx="7" fill="url(#bodyGrad)" stroke="${c}" stroke-width="1" opacity="0.8"/>`;
  }
  out += `<rect x="295" y="418" width="12" height="32" rx="6" fill="url(#bodyGrad)" stroke="${c}" stroke-width="1" opacity="0.8"/>`;

  return out;
}

function renderLeg(c, hasThermal, hasNeural, hasStealth, modules) {
  const opacity = hasStealth ? 0.75 : 1;
  let out = `\n  <!-- LEG UNIT -->`;

  // Thigh
  out += `<rect x="180" y="60" width="120" height="160" rx="24" fill="url(#bodyGrad)" stroke="${c}" stroke-width="1.5" opacity="${opacity}"/>`;
  // Knee
  out += `<ellipse cx="240" cy="235" rx="52" ry="32" fill="url(#bodyGrad)" stroke="${c}" stroke-width="2" opacity="${opacity}" filter="url(#glowF)"/>`;
  // Lower leg
  out += `<rect x="185" y="262" width="110" height="140" rx="20" fill="url(#bodyGrad)" stroke="${c}" stroke-width="1.5" opacity="${opacity}"/>`;
  // Ankle
  out += `<rect x="194" y="396" width="92" height="28" rx="12" fill="url(#bodyGrad)" stroke="${c}" stroke-width="1.5" opacity="${opacity}"/>`;
  // Foot
  out += `<rect x="170" y="418" width="130" height="44" rx="16" fill="url(#bodyGrad)" stroke="${c}" stroke-width="1.5" opacity="${opacity}"/>`;

  // Panel lines on thigh
  out += `
  <line x1="198" y1="100" x2="282" y2="100" stroke="${c}" stroke-width="1" opacity="0.3"/>
  <line x1="194" y1="130" x2="286" y2="130" stroke="${c}" stroke-width="0.5" opacity="0.2"/>
  <line x1="194" y1="160" x2="286" y2="160" stroke="${c}" stroke-width="0.5" opacity="0.2"/>
  `;
  out += `<rect x="208" y="94" width="64" height="6" rx="3" fill="${c}" opacity="0.6"/>`;

  // Knee detail circles
  out += `<circle cx="240" cy="235" r="18" fill="none" stroke="${c}" stroke-width="2.5" opacity="0.9" filter="url(#softGlow)"/>`;
  out += `<circle cx="240" cy="235" r="8" fill="${c}" opacity="0.5"/>`;
  out += `<circle cx="240" cy="235" r="3" fill="${c}" opacity="0.9"/>`;

  // Lower leg panel
  out += `
  <line x1="200" y1="300" x2="275" y2="300" stroke="${c}" stroke-width="0.5" opacity="0.2"/>
  <line x1="200" y1="330" x2="275" y2="330" stroke="${c}" stroke-width="0.5" opacity="0.2"/>
  <rect x="208" y="275" width="64" height="5" rx="2.5" fill="${c}" opacity="0.5"/>
  `;

  if (hasNeural) {
    out += `<path d="M240 80 L240 220" stroke="${c}" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.5" filter="url(#glowF)"/>`;
    out += `<path d="M240 265 L240 390" stroke="${c}" stroke-width="1" stroke-dasharray="4 5" opacity="0.4" filter="url(#glowF)"/>`;
  }

  if (hasThermal) {
    [[295,110],[295,125],[295,140]].forEach(([x,y]) => {
      out += `<rect x="${x}" y="${y}" width="14" height="4" rx="2" fill="${c}" opacity="0.35"/>`;
    });
  }

  return out;
}

function renderHUD(c, modules, inp) {
  const goals = inp.goals;
  const tags = modules.map(m => MODULES[m]?.tag).filter(Boolean);
  const ps = computeProfileScore(inp);
  const risk = computeRiskIndex(inp);

  let hud = `\n  <!-- HUD OVERLAY -->`;

  // Top-left status box
  hud += `
  <g opacity="0.85">
    <rect x="22" y="22" width="140" height="62" rx="8" fill="rgba(0,0,0,0.55)" stroke="${c}" stroke-width="0.8" opacity="0.6"/>
    <text x="32" y="40" font-size="8" fill="${c}" font-family="monospace" letter-spacing="1" opacity="0.7">AUGMENT SYSTEM</text>
    <text x="32" y="56" font-size="10" fill="${c}" font-family="monospace" font-weight="bold">ACTIVE</text>
    <text x="32" y="72" font-size="8" fill="rgba(235,240,255,0.55)" font-family="monospace">SYS OK — ${tags.length} MOD</text>
  </g>`;

  // Bottom-right module tags
  const tagList = [...new Set(tags)];
  tagList.forEach((tag, i) => {
    const y = 440 - i * 18;
    hud += `
    <rect x="330" y="${y-11}" width="70" height="14" rx="3" fill="rgba(0,0,0,0.40)" stroke="${c}" stroke-width="0.6" opacity="0.5"/>
    <text x="340" y="${y}" font-size="8" fill="${c}" font-family="monospace" letter-spacing="1" opacity="0.7">${tag}</text>`;
  });

  // Signal strength bars (top-right)
  hud += `
  <g opacity="0.7">
    <rect x="348" y="22" width="110" height="50" rx="8" fill="rgba(0,0,0,0.50)" stroke="${c}" stroke-width="0.7" opacity="0.5"/>
    <text x="360" y="38" font-size="8" fill="rgba(235,240,255,0.55)" font-family="monospace" letter-spacing="1">SCORE</text>
    <text x="360" y="54" font-size="14" fill="${c}" font-family="monospace" font-weight="bold">${ps}</text>
    <text x="400" y="54" font-size="8" fill="rgba(235,240,255,0.40)" font-family="monospace">/100</text>
  </g>`;

  // Risk indicator
  if (risk > 4) {
    hud += `
    <g opacity="0.8">
      <rect x="22" y="96" width="120" height="24" rx="6" fill="rgba(255,74,106,0.10)" stroke="#ff4a6a" stroke-width="0.8"/>
      <text x="32" y="112" font-size="8" fill="#ff4a6a" font-family="monospace" letter-spacing="1">RISK INDEX: ${risk}/10</text>
    </g>`;
  }

  // Crosshair reticle
  hud += `
  <g opacity="0.18" filter="url(#glowF)">
    <circle cx="240" cy="240" r="100" fill="none" stroke="${c}" stroke-width="0.5" stroke-dasharray="6 8"/>
    <circle cx="240" cy="240" r="60" fill="none" stroke="${c}" stroke-width="0.5" stroke-dasharray="3 6"/>
    <line x1="130" y1="240" x2="160" y2="240" stroke="${c}" stroke-width="0.5"/>
    <line x1="320" y1="240" x2="350" y2="240" stroke="${c}" stroke-width="0.5"/>
    <line x1="240" y1="130" x2="240" y2="160" stroke="${c}" stroke-width="0.5"/>
    <line x1="240" y1="320" x2="240" y2="350" stroke="${c}" stroke-width="0.5"/>
  </g>`;

  return hud;
}

/* ════════════════════════════════════════════════
   RENDER RESULTS
════════════════════════════════════════════════ */
function renderResults(result, inp) {
  const { selected, reasoning, stats, buildName, accent } = result;

  // Badge
  document.getElementById('configName').textContent = buildName;
  document.getElementById('resultBadge1').textContent = inp.goals[0]?.toUpperCase() || 'LONGEVITY';
  document.getElementById('resultBadge2').textContent = cap(inp.work);

  // SVG
  document.getElementById('svgWrap').innerHTML = generateSVG(selected, accent, inp);

  // Stats
  const statMap = {
    'stat-neural': stats.neural, 'stat-stab': stats.stab,
    'stat-thermal': stats.thermal, 'stat-score': stats.score,
  };
  const barMap = {
    'bar-neural': stats.neural, 'bar-stab': stats.stab,
    'bar-thermal': stats.thermal, 'bar-score': stats.score,
  };
  Object.entries(statMap).forEach(([id, v]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '+' + v + '%';
  });
  setTimeout(() => {
    Object.entries(barMap).forEach(([id, v]) => {
      const el = document.getElementById(id);
      if (el) el.style.width = Math.min(v, 100) + '%';
    });
  }, 100);

  // Modules breakdown
  const mb = document.getElementById('modulesBreakdown');
  mb.innerHTML = selected.map(key => {
    const m = MODULES[key];
    const dotColor = m.color;
    return `<div class="module-row">
      <div class="module-dot ${dotColor === 'amber' ? 'amber' : dotColor === 'green' ? 'green' : ''}"></div>
      <div class="module-info">
        <div class="module-name">${m.name}</div>
        <div class="module-desc">${m.desc}</div>
      </div>
      <span class="module-tag">${m.tag}</span>
    </div>`;
  }).join('');

  // Reasoning
  const rl = document.getElementById('reasoningLog');
  rl.innerHTML = reasoning.map(r => `<div class="reasoning-line">${r}</div>`).join('');

  // Override grid
  const og = document.getElementById('overrideGrid');
  og.innerHTML = Object.entries(MODULES).map(([key, m]) => {
    const isSelected = selected.includes(key);
    const bonus = m.statBonus;
    const delta = bonus.neural + bonus.stab + bonus.thermal;
    return `<div class="override-module ${isSelected ? 'selected' : ''}" data-key="${key}" onclick="toggleOverride(this)">
      <div class="om-header">
        <div class="om-name">${m.name}</div>
        <div class="om-check"></div>
      </div>
      <div class="om-stat">${m.tag} — ${m.desc.substring(0,40)}…</div>
      <div class="om-delta">${delta > 0 ? '+' : ''}${delta} combined delta</div>
    </div>`;
  }).join('');

  updateOverrideStats();

  // Show sections
  const r = document.getElementById('results');
  const ov = document.getElementById('override');
  r.classList.add('visible');
  ov.classList.add('visible');

  // Hero metrics update
  document.getElementById('heroM1').textContent = Math.max(4, 18 - stats.neural / 8) + 'ms';
  document.getElementById('heroM2').textContent = stats.stab + '%';
  document.getElementById('heroM3').textContent = stats.score;
  document.querySelector('#hero .metric-card:nth-child(3) .delta').textContent = buildName;

  setTimeout(() => r.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
}

/* ════════════════════════════════════════════════
   OVERRIDE MODE
════════════════════════════════════════════════ */
function toggleOverride(el) {
  el.classList.toggle('selected');
  updateOverrideStats();
}

function updateOverrideStats() {
  const active = Array.from(document.querySelectorAll('.override-module.selected'))
    .map(el => MODULES[el.dataset.key])
    .filter(Boolean);

  const score = active.reduce((s, m) => s + m.statBonus.score, 0);
  const stab = active.reduce((s, m) => s + m.statBonus.stab, 0);

  document.getElementById('ov-score').textContent = '+' + score + '%';
  document.getElementById('ov-stab').textContent = '+' + stab + '%';
  setTimeout(() => {
    document.getElementById('ov-bar-score').style.width = Math.min(score, 100) + '%';
    document.getElementById('ov-bar-stab').style.width = Math.min(stab, 100) + '%';
  }, 50);
}

/* ════════════════════════════════════════════════
   RUN BUTTON
════════════════════════════════════════════════ */
document.getElementById('runDiagBtn').addEventListener('click', () => {
  const inp = getLiveInputs();
  runProcessingAnimation(() => {
    const result = runAIEngine(inp);
    renderResults(result, inp);
  });
});

/* ════════════════════════════════════════════════
   UTILITIES
════════════════════════════════════════════════ */
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function scrollTo(sel) { document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth' }); }

/* ════════════════════════════════════════════════
   REVEAL OBSERVER
════════════════════════════════════════════════ */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));