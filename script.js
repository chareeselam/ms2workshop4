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
  neural_stabilizer: {
    name: 'Neural Stabilizer Array',
    color: 'cyan', tag: 'NEURAL',
    statBonus: { neural: 22, stab: 8, thermal: 5, score: 12 },
    desc: 'Dampens cortical noise, stabilizes motor signal pathways'
  },
  neural_amplifier: {
    name: 'Neural Amplifier Interface',
    color: 'cyan', tag: 'NEURAL',
    statBonus: { neural: 34, stab: -5, thermal: -8, score: 14 },
    desc: 'Maximizes neural throughput for high-focus operation'
  },
  carbon_exo: {
    name: 'Carbon Exoskeletal Frame',
    color: 'amber', tag: 'STRUCTURAL',
    statBonus: { neural: -3, stab: 28, thermal: 12, score: 16 },
    desc: 'High-tensile carbon weave reinforcement layer'
  },
  titanium_joint: {
    name: 'Titanium Joint Reinforcement',
    color: 'amber', tag: 'STRUCTURAL',
    statBonus: { neural: 0, stab: 22, thermal: 8, score: 14 },
    desc: 'Medical-grade Ti-6Al-4V alloy joint replacement'
  },
  thermal_regulator: {
    name: 'Adaptive Thermal Regulator',
    color: 'green', tag: 'THERMAL',
    statBonus: { neural: 4, stab: 6, thermal: 28, score: 10 },
    desc: 'Phase-change thermal equilibrium across all climates'
  },
  cooling_mesh: {
    name: 'Active Cooling Mesh',
    color: 'green', tag: 'THERMAL',
    statBonus: { neural: 8, stab: 4, thermal: 22, score: 8 },
    desc: 'Microfluidic heat extraction for high-load environments'
  },
  bio_core: {
    name: 'Longevity Bio-Core',
    color: 'green', tag: 'POWER',
    statBonus: { neural: 10, stab: 10, thermal: 10, score: 18 },
    desc: 'Energy-efficient symbiotic power generation system'
  },
  adaptive_core: {
    name: 'Adaptive Power Cell',
    color: 'cyan', tag: 'POWER',
    statBonus: { neural: 6, stab: 14, thermal: 6, score: 14 },
    desc: 'Variable output power management with load prediction'
  },
  bio_sensor_array: {
    name: 'Biofeedback Sensor Array',
    color: 'cyan', tag: 'SENSOR',
    statBonus: { neural: 16, stab: 4, thermal: 2, score: 10 },
    desc: 'Real-time biometric monitoring and adaptive response'
  },
  env_sensor_cluster: {
    name: 'Environmental Sensor Cluster',
    color: 'amber', tag: 'SENSOR',
    statBonus: { neural: 10, stab: 0, thermal: 14, score: 8 },
    desc: 'Ambient condition analysis for proactive adaptation'
  },
  stealth_coating: {
    name: 'Stealth Nano-Coating',
    color: 'amber', tag: 'SURFACE',
    statBonus: { neural: 0, stab: 8, thermal: 4, score: 6 },
    desc: 'Radar-absorptive surface treatment, minimal EM signature'
  },
  bioluminescent_shell: {
    name: 'Bioluminescent Shell',
    color: 'cyan', tag: 'SURFACE',
    statBonus: { neural: 6, stab: 2, thermal: 0, score: 8 },
    desc: 'Programmable optical layer with identity customization'
  },
};

function runAIEngine(inp) {
  const goals = inp.goals;
  const selected = [];
  const reasoning = [];

  /* 1. Neural */
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

  /* 2. Structural */
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

  /* 3. Thermal */
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

  /* 4. Power */
  if (goals.includes('longevity') || (inp.sleepQuality === 'poor' && inp.sleepHours < 6)) {
    selected.push('bio_core');
    reasoning.push('Longevity goal active → Longevity Bio-Core selected; symbiotic energy generation reduces draw on organic systems');
  } else {
    selected.push('adaptive_core');
    reasoning.push('Dynamic workload detected → Adaptive Power Cell selected; load-predictive output prevents brownout under stress spikes');
  }

  /* 5. Sensor */
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

  /* 6. Surface */
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

  /* Stats */
  const stats = { neural: 0, stab: 0, thermal: 0, score: 0 };
  selected.forEach(key => {
    const m = MODULES[key];
    stats.neural += m.statBonus.neural;
    stats.stab   += m.statBonus.stab;
    stats.thermal+= m.statBonus.thermal;
    stats.score  += m.statBonus.score;
  });

  const ps = computeProfileScore(inp);
  const riskPenalty = computeRiskIndex(inp) * 2;
  stats.score   = Math.round(Math.min(100, stats.score + ps * 0.3 - riskPenalty));
  stats.neural  = Math.max(0, Math.min(100, stats.neural));
  stats.stab    = Math.max(0, Math.min(100, stats.stab));
  stats.thermal = Math.max(0, Math.min(100, stats.thermal));

  const prefixes = { longevity:'VITA', strength:'TITAN', focus:'APEX', aesthetics:'AURORA', recovery:'REGEN', endurance:'ARES', stealth:'SHADE', sensory:'VELA' };
  const primaryGoal = goals[0] || 'longevity';
  const buildName = (prefixes[primaryGoal] || 'AAS') + '-' + String(Math.floor(Math.random()*900)+100);

  const accentMap = {
    longevity:'#3df0ff', strength:'#ffc14a', focus:'#3df0ff',
    aesthetics:'#d97aff', recovery:'#3dffb2', endurance:'#ff8a4a',
    stealth:'#8899bb', sensory:'#d97aff'
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
      setTimeout(() => { ps.classList.remove('visible'); cb(); }, 200);
    }
  };
  setTimeout(step, 100);
}

/* ════════════════════════════════════════════════
   SVG ENGINE — VISUAL PROPERTIES DERIVED FROM INPUT
════════════════════════════════════════════════ */

/*
  Visual properties mapped from user inputs:
  - bodyPart:    which limb/organ to draw (arm / hand / leg / foot / spine / eye)
  - armorLevel:  0-3  — thickness/layers of plating (physical work, strength goal, injury)
  - neuralDense: 0-3  — how many neural trace lines run through the body (focus, analytical, stress)
  - thermalMode: none / vents / mesh / coils — thermal treatment visualization
  - powerStyle:  orb / cell / spine — how power core is visualized
  - sensorCount: 0-4  — number of sensor nodes embedded in body
  - glowMult:    0.3-1.4 — overall accent brightness (stealth vs aesthetic goals)
  - panelStyle:  clean / industrial / organic — surface texture style
  - scarring:    bool — injury history adds stress fracture marks
  - overclocked: bool — extreme stress/overclock adds glitch artifacts
*/

function deriveVisualProps(inp, selected) {
  const goals = inp.goals;

  /* --- Body part selection (rich logic) --- */
  let bodyPart = 'arm'; // default

  if (inp.work === 'physical' || goals.includes('strength')) {
    bodyPart = goals.includes('endurance') ? 'leg' : 'arm';
  }
  if (inp.injury === 'lower') bodyPart = 'leg';
  if (inp.injury === 'spine') bodyPart = 'spine';
  if (inp.injury === 'upper') bodyPart = 'arm';
  if (goals.includes('sensory') && inp.work === 'analytical') bodyPart = 'eye';
  if (goals.includes('focus') && inp.work === 'analytical' && inp.stress !== 'high' && inp.stress !== 'extreme') bodyPart = 'eye';
  if (inp.activity === 'athlete' && goals.includes('endurance')) bodyPart = 'leg';
  if (inp.activity === 'athlete' && goals.includes('strength')) bodyPart = 'arm';
  if (goals.includes('stealth') && inp.environment === 'field') bodyPart = 'hand';
  if (goals.includes('aesthetics')) bodyPart = 'hand';
  if (inp.work === 'social' && goals.includes('focus')) bodyPart = 'spine';
  if (inp.injury === 'chronic' && inp.activity === 'athlete') bodyPart = 'foot';

  /* --- Armor level (0=minimal, 3=heavy plating) --- */
  let armorLevel = 1;
  if (inp.work === 'physical') armorLevel++;
  if (goals.includes('strength')) armorLevel++;
  if (inp.environment === 'industrial') armorLevel++;
  if (inp.injury === 'chronic') armorLevel++;
  if (goals.includes('stealth')) armorLevel = Math.max(0, armorLevel - 1);
  if (goals.includes('aesthetics')) armorLevel = Math.max(0, armorLevel - 1);
  armorLevel = Math.min(3, armorLevel);

  /* --- Neural density (0=none, 3=dense) --- */
  let neuralDense = 0;
  if (selected.includes('neural_amplifier')) neuralDense = 3;
  else if (selected.includes('neural_stabilizer')) neuralDense = 2;
  if (inp.work === 'analytical') neuralDense = Math.min(3, neuralDense + 1);
  if (goals.includes('focus')) neuralDense = Math.min(3, neuralDense + 1);
  if (inp.stress === 'extreme') neuralDense = 3; // maxed out, overloaded look

  /* --- Thermal mode --- */
  let thermalMode = 'none';
  if (selected.includes('cooling_mesh')) thermalMode = 'mesh';
  else if (selected.includes('thermal_regulator')) {
    thermalMode = inp.climate === 'cold' ? 'coils' : 'vents';
  }

  /* --- Power style --- */
  let powerStyle = 'cell';
  if (selected.includes('bio_core')) powerStyle = 'orb';
  if (bodyPart === 'spine') powerStyle = 'spine_core';

  /* --- Sensor count --- */
  let sensorCount = 0;
  if (selected.includes('bio_sensor_array')) sensorCount = inp.activity === 'athlete' ? 4 : 2;
  if (selected.includes('env_sensor_cluster')) sensorCount = inp.environment === 'remote' ? 4 : 3;

  /* --- Glow multiplier --- */
  let glowMult = 1.0;
  if (goals.includes('stealth')) glowMult = 0.35;
  if (selected.includes('stealth_coating')) glowMult *= 0.6;
  if (goals.includes('aesthetics') || selected.includes('bioluminescent_shell')) glowMult = 1.5;
  if (inp.stress === 'extreme') glowMult = Math.min(glowMult * 1.3, 1.8);

  /* --- Panel style --- */
  let panelStyle = 'clean';
  if (inp.work === 'physical' || inp.environment === 'industrial') panelStyle = 'industrial';
  if (goals.includes('aesthetics') || goals.includes('sensory')) panelStyle = 'organic';

  /* --- Scarring from injury --- */
  const scarring = inp.injury !== 'none' && inp.injury !== undefined;

  /* --- Overclocked (extreme state visual artifacts) --- */
  const overclocked = inp.stress === 'extreme' || (inp.activity === 'athlete' && inp.stress === 'high');

  return { bodyPart, armorLevel, neuralDense, thermalMode, powerStyle, sensorCount, glowMult, panelStyle, scarring, overclocked };
}

/* ════════════════════════════════════════════════
   MAIN SVG GENERATOR
════════════════════════════════════════════════ */
function generateSVG(modules, accent, inp) {
  const vp = deriveVisualProps(inp, modules);
  const c = accent;
  const g = vp.glowMult;

  // Body gradient varies with armor level — heavier = darker/more metallic
  const bodyLight = vp.armorLevel >= 2 ? '#141820' : '#1e2538';
  const bodyDark  = vp.armorLevel >= 2 ? '#07080d' : '#0d1018';

  let svg = `<svg viewBox="0 0 480 480" class="aug-svg" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${c}" stop-opacity="${(0.25 * g).toFixed(2)}"/>
      <stop offset="100%" stop-color="${c}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bodyGrad" cx="35%" cy="25%" r="65%">
      <stop offset="0%" stop-color="${bodyLight}"/>
      <stop offset="100%" stop-color="${bodyDark}"/>
    </radialGradient>
    <radialGradient id="bodyGrad2" cx="65%" cy="70%" r="55%">
      <stop offset="0%" stop-color="${bodyLight}"/>
      <stop offset="100%" stop-color="${bodyDark}"/>
    </radialGradient>
    <linearGradient id="armorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c}" stop-opacity="${(0.18 * g).toFixed(2)}"/>
      <stop offset="100%" stop-color="${c}" stop-opacity="0"/>
    </linearGradient>
    <filter id="glowF" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="strongGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Ambient glow -->
  <circle cx="240" cy="240" r="190" fill="url(#glow1)"/>
`;

  // Route to correct body part renderer
  switch (vp.bodyPart) {
    case 'arm':   svg += renderArm(c, vp, inp);   break;
    case 'hand':  svg += renderHand(c, vp, inp);  break;
    case 'leg':   svg += renderLeg(c, vp, inp);   break;
    case 'foot':  svg += renderFoot(c, vp, inp);  break;
    case 'spine': svg += renderSpine(c, vp, inp); break;
    case 'eye':   svg += renderEye(c, vp, inp);   break;
    default:      svg += renderArm(c, vp, inp);
  }

  svg += renderHUD(c, modules, inp, vp);
  svg += `\n</svg>`;
  return svg;
}

/* ════════════════════════════════════════════════
   SVG PRIMITIVES / SHARED HELPERS
════════════════════════════════════════════════ */

function glowLine(x1, y1, x2, y2, c, w, op, filter='glowF') {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" opacity="${op}" filter="url(#${filter})"/>`;
}

function panelRect(x, y, w, h, rx, c, strokeW, op, fill='url(#bodyGrad)') {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${c}" stroke-width="${strokeW}" opacity="${op}"/>`;
}

function sensorNode(cx, cy, c, g, size=6) {
  const r1 = size, r2 = size * 0.5, r3 = size * 0.22;
  const op = Math.min(0.9, 0.6 * g);
  return `
  <circle cx="${cx}" cy="${cy}" r="${r1}" fill="none" stroke="${c}" stroke-width="1" opacity="${op}" filter="url(#glowF)"/>
  <circle cx="${cx}" cy="${cy}" r="${r2}" fill="${c}" opacity="${(op*0.35).toFixed(2)}"/>
  <circle cx="${cx}" cy="${cy}" r="${r3}" fill="${c}" opacity="${Math.min(1, op*0.95).toFixed(2)}" filter="url(#softGlow)"/>`;
}

function neuralPath(d, c, w, op, g) {
  const a = Math.min(1, op * g);
  return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-dasharray="5 3" opacity="${a.toFixed(2)}" stroke-linecap="round" filter="url(#glowF)"/>`;
}

function thermalVents(positions, c, g) {
  return positions.map(([x,y,w=18,h=4]) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h/2}" fill="${c}" opacity="${(0.4*g).toFixed(2)}" filter="url(#glowF)"/>`
  ).join('');
}

function thermalMesh(cx, cy, r, c, g) {
  let out = '';
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const x1 = cx + Math.cos(angle) * r * 0.3;
    const y1 = cy + Math.sin(angle) * r * 0.3;
    const x2 = cx + Math.cos(angle) * r;
    const y2 = cy + Math.sin(angle) * r;
    out += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c}" stroke-width="1" opacity="${(0.3*g).toFixed(2)}"/>`;
  }
  out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-width="0.5" stroke-dasharray="3 4" opacity="${(0.25*g).toFixed(2)}"/>`;
  return out;
}

function armorPlate(x, y, w, h, rx, c, g) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="url(#armorGrad)" stroke="${c}" stroke-width="1" opacity="${(0.55*g).toFixed(2)}"/>`;
}

function scarMark(x, y, len, angle, c) {
  const rad = angle * Math.PI / 180;
  const x2 = x + Math.cos(rad) * len;
  const y2 = y + Math.sin(rad) * len;
  return `<line x1="${x}" y1="${y}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c}" stroke-width="0.8" opacity="0.35" stroke-linecap="round"/>`;
}

function glitchArtifact(c) {
  const lines = [];
  for (let i = 0; i < 6; i++) {
    const x = 100 + Math.random() * 280;
    const y = 80 + Math.random() * 320;
    const w = 10 + Math.random() * 60;
    lines.push(`<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x+w).toFixed(0)}" y2="${y.toFixed(0)}" stroke="${c}" stroke-width="1" opacity="${(0.08 + Math.random()*0.14).toFixed(2)}"/>`);
  }
  return lines.join('');
}

function powerOrb(cx, cy, r, c, g) {
  return `
  <circle cx="${cx}" cy="${cy}" r="${r*1.8}" fill="${c}" opacity="${(0.04*g).toFixed(2)}" filter="url(#strongGlow)"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-width="1.5" opacity="${(0.7*g).toFixed(2)}" filter="url(#softGlow)"/>
  <circle cx="${cx}" cy="${cy}" r="${r*0.55}" fill="${c}" opacity="${(0.3*g).toFixed(2)}"/>
  <circle cx="${cx}" cy="${cy}" r="${r*0.22}" fill="${c}" opacity="${(0.9*g).toFixed(2)}" filter="url(#strongGlow)"/>`;
}

function powerCell(x, y, w, h, rx, c, g) {
  const lines = Math.round(3 + w/20);
  let out = panelRect(x, y, w, h, rx, c, 1, (0.7*g).toFixed(2));
  for (let i = 1; i < lines; i++) {
    const lx = x + (w / lines) * i;
    out += `<line x1="${lx}" y1="${y+2}" x2="${lx}" y2="${y+h-2}" stroke="${c}" stroke-width="0.5" opacity="${(0.3*g).toFixed(2)}"/>`;
  }
  out += `<rect x="${x+2}" y="${y+2}" width="${(w-4)*0.6}" height="${h-4}" rx="${Math.max(1,rx-2)}" fill="${c}" opacity="${(0.18*g).toFixed(2)}"/>`;
  return out;
}

/* ════════════════════════════════════════════════
   ARM RENDERER
════════════════════════════════════════════════ */
function renderArm(c, vp, inp) {
  const { armorLevel, neuralDense, thermalMode, powerStyle, sensorCount, glowMult: g, panelStyle, scarring, overclocked } = vp;

  // Proportions scale with armor level
  const armW    = 90 + armorLevel * 8;       // wider = more armored
  const armX    = 240 - armW / 2;
  const elbowW  = armW - 10;
  const foreW   = armW - 6;
  const strokeW = 1 + armorLevel * 0.3;

  let out = `\n  <!-- ARM UNIT (armor:${armorLevel} neural:${neuralDense} thermal:${thermalMode}) -->`;

  // ── Upper arm ──
  out += panelRect(armX, 55, armW, 155, 22, c, strokeW, (0.92).toFixed(2));

  // Industrial panel style: bolted plates
  if (panelStyle === 'industrial') {
    out += panelRect(armX+6, 62, armW-12, 22, 5, c, 0.5, '0.40', 'url(#armorGrad)');
    out += panelRect(armX+6, 175, armW-12, 22, 5, c, 0.5, '0.40', 'url(#armorGrad)');
    // bolt holes
    [[armX+12,68],[armX+armW-18,68],[armX+12,182],[armX+armW-18,182]].forEach(([bx,by]) => {
      out += `<circle cx="${bx}" cy="${by}" r="3" fill="none" stroke="${c}" stroke-width="1" opacity="0.45"/>`;
      out += `<circle cx="${bx}" cy="${by}" r="1" fill="${c}" opacity="0.6"/>`;
    });
  }

  // Organic: curved seam lines
  if (panelStyle === 'organic') {
    out += `<path d="M${armX+10} 110 Q${240} 95 ${armX+armW-10} 110" fill="none" stroke="${c}" stroke-width="1" opacity="0.3"/>`;
    out += `<path d="M${armX+10} 160 Q${240} 145 ${armX+armW-10} 160" fill="none" stroke="${c}" stroke-width="1" opacity="0.3"/>`;
  }

  // ── Armor extra plates (armorLevel 2-3) ──
  if (armorLevel >= 2) {
    out += armorPlate(armX - 8, 70, 14, 90, 6, c, g);
    out += armorPlate(armX + armW - 6, 70, 14, 90, 6, c, g);
  }
  if (armorLevel >= 3) {
    out += armorPlate(armX - 14, 85, 12, 60, 5, c, g);
    out += armorPlate(armX + armW + 2, 85, 12, 60, 5, c, g);
  }

  // ── Elbow joint ──
  const elbowX = 240 - elbowW/2;
  out += `<ellipse cx="240" cy="218" rx="${elbowW/2}" ry="20" fill="url(#bodyGrad)" stroke="${c}" stroke-width="${strokeW}" opacity="0.95"/>`;
  // elbow ring detail
  out += `<ellipse cx="240" cy="218" rx="${elbowW/2 - 5}" ry="12" fill="none" stroke="${c}" stroke-width="0.8" opacity="${(0.4*g).toFixed(2)}" filter="url(#glowF)"/>`;
  if (armorLevel >= 2) {
    out += `<ellipse cx="240" cy="218" rx="${elbowW/2 + 6}" ry="8" fill="none" stroke="${c}" stroke-width="1.5" opacity="${(0.5*g).toFixed(2)}"/>`;
  }

  // ── Forearm ──
  const foreX = 240 - foreW/2;
  out += panelRect(foreX, 235, foreW, 130, 18, c, strokeW, '0.92');

  if (panelStyle === 'industrial') {
    out += panelRect(foreX+5, 242, foreW-10, 18, 4, c, 0.5, '0.38', 'url(#armorGrad)');
    out += panelRect(foreX+5, 338, foreW-10, 18, 4, c, 0.5, '0.38', 'url(#armorGrad)');
  }

  // ── Wrist ──
  out += panelRect(foreX+5, 362, foreW-10, 28, 12, c, strokeW*0.8, '0.88');
  // Wrist LED ring
  out += `<rect x="${foreX+5}" y="${362}" width="${foreW-10}" height="28" rx="12" fill="none" stroke="${c}" stroke-width="${1.5*g}" opacity="${(0.75*g).toFixed(2)}" filter="url(#softGlow)"/>`;

  // ── Hand/fingers ──
  const handW = foreW + 12;
  const handX = 240 - handW/2;
  out += panelRect(handX, 387, handW, 52, 14, c, strokeW*0.8, '0.88');
  // finger segments
  const fingers = 4;
  for (let i = 0; i < fingers; i++) {
    const fx = handX + 6 + i * ((handW - 12) / fingers);
    const fw = ((handW - 12) / fingers) - 4;
    out += panelRect(fx, 436, fw, 36, 7, c, 0.8, '0.85');
    out += panelRect(fx+2, 469, fw-4, 16, 5, c, 0.7, '0.75');
  }
  // thumb
  out += panelRect(handX + handW - 4, 400, 14, 28, 6, c, 0.7, '0.8');

  // ── Power module ──
  if (powerStyle === 'orb') {
    out += powerOrb(240, 145, 14, c, g);
  } else {
    out += powerCell(armX + armW/2 - 22, 135, 44, 16, 5, c, g);
  }

  // ── Neural traces ──
  if (neuralDense >= 1) {
    out += neuralPath(`M240 75 C245 100 252 120 248 145 C244 165 235 175 238 200`, c, 1.5, 0.65, g);
  }
  if (neuralDense >= 2) {
    out += neuralPath(`M232 75 C226 100 218 125 222 155 C226 178 237 185 234 210`, c, 1.2, 0.5, g);
    out += neuralPath(`M240 250 C245 270 252 295 248 320 C244 342 232 350 235 368`, c, 1.2, 0.55, g);
  }
  if (neuralDense >= 3) {
    out += neuralPath(`M248 75 C258 105 265 135 260 160 C255 182 242 188 244 215`, c, 1, 0.35, g);
    out += neuralPath(`M232 250 C224 275 218 300 222 328 C226 348 240 355 237 372`, c, 1, 0.3, g);
  }

  // ── Thermal ──
  if (thermalMode === 'vents') {
    out += thermalVents([[armX+armW+2,90],[armX+armW+2,106],[armX+armW+2,122],[armX+armW+2,138]], c, g);
  }
  if (thermalMode === 'mesh') {
    out += thermalMesh(armX+armW+12, 135, 18, c, g);
  }
  if (thermalMode === 'coils') {
    for (let i = 0; i < 3; i++) {
      const cy = 100 + i * 32;
      out += `<path d="M${armX+armW+2} ${cy} Q${armX+armW+18} ${cy+8} ${armX+armW+2} ${cy+16}" fill="none" stroke="${c}" stroke-width="1.5" opacity="${(0.45*g).toFixed(2)}"/>`;
    }
  }

  // ── Sensor nodes ──
  const sensorPositions = [
    [armX+armW-10, 100], [armX+10, 100],
    [armX+armW-10, 280], [armX+10, 280]
  ];
  for (let i = 0; i < Math.min(sensorCount, sensorPositions.length); i++) {
    out += sensorNode(sensorPositions[i][0], sensorPositions[i][1], c, g);
  }

  // ── Scarring ──
  if (scarring) {
    out += scarMark(armX+22, 130, 28, -20, c);
    out += scarMark(armX+armW-30, 290, 22, 15, c);
    out += scarMark(240, 175, 18, 45, c);
  }

  // ── Panel accent lines ──
  const panelOpacity = panelStyle === 'clean' ? 0.28 : panelStyle === 'industrial' ? 0.20 : 0.15;
  out += `<line x1="${armX+12}" y1="105" x2="${armX+armW-12}" y2="105" stroke="${c}" stroke-width="0.6" opacity="${panelOpacity}"/>`;
  out += `<line x1="${armX+12}" y1="140" x2="${armX+armW-12}" y2="140" stroke="${c}" stroke-width="0.6" opacity="${(panelOpacity*0.7).toFixed(2)}"/>`;
  out += `<line x1="${foreX+10}" y1="285" x2="${foreX+foreW-10}" y2="285" stroke="${c}" stroke-width="0.6" opacity="${panelOpacity}"/>`;
  out += `<line x1="${foreX+10}" y1="320" x2="${foreX+foreW-10}" y2="320" stroke="${c}" stroke-width="0.6" opacity="${(panelOpacity*0.7).toFixed(2)}"/>`;

  // ── Glitch ──
  if (overclocked) out += glitchArtifact(c);

  return out;
}

/* ════════════════════════════════════════════════
   HAND RENDERER
════════════════════════════════════════════════ */
function renderHand(c, vp, inp) {
  const { armorLevel, neuralDense, thermalMode, powerStyle, sensorCount, glowMult: g, panelStyle, scarring, overclocked } = vp;

  const strokeW = 1 + armorLevel * 0.35;
  const palmW   = 120 + armorLevel * 10;
  const palmH   = 110 + armorLevel * 6;
  const palmX   = 240 - palmW / 2;
  const palmY   = 200;

  let out = `\n  <!-- HAND UNIT (armor:${armorLevel} neural:${neuralDense}) -->`;

  // ── Wrist stub ──
  out += panelRect(240-38, 148, 76, 58, 14, c, strokeW, '0.90');
  out += `<line x1="202" y1="175" x2="278" y2="175" stroke="${c}" stroke-width="0.6" opacity="0.25"/>`;

  // ── Palm ──
  out += panelRect(palmX, palmY, palmW, palmH, 20, c, strokeW, '0.95');

  if (panelStyle === 'organic') {
    out += `<path d="M${palmX+12} ${palmY+palmH*0.4} Q${240} ${palmY+palmH*0.25} ${palmX+palmW-12} ${palmY+palmH*0.4}" fill="none" stroke="${c}" stroke-width="1" opacity="0.25"/>`;
    out += `<path d="M${palmX+12} ${palmY+palmH*0.7} Q${240} ${palmY+palmH*0.55} ${palmX+palmW-12} ${palmY+palmH*0.7}" fill="none" stroke="${c}" stroke-width="0.8" opacity="0.2"/>`;
  }
  if (panelStyle === 'industrial') {
    out += armorPlate(palmX-10, palmY+20, 14, palmH-40, 5, c, g);
    out += armorPlate(palmX+palmW-4, palmY+20, 14, palmH-40, 5, c, g);
    [[palmX+16,palmY+18],[palmX+palmW-22,palmY+18],[palmX+16,palmY+palmH-22],[palmX+palmW-22,palmY+palmH-22]].forEach(([bx,by]) => {
      out += `<circle cx="${bx}" cy="${by}" r="3.5" fill="none" stroke="${c}" stroke-width="1" opacity="0.45"/>`;
      out += `<circle cx="${bx}" cy="${by}" r="1.2" fill="${c}" opacity="0.6"/>`;
    });
  }

  // ── Fingers (5) ──
  const fingerData = [
    { x: palmX+10,          y: palmY + palmH, w: 20, segs: [38,30,22] },
    { x: palmX+10+26,       y: palmY + palmH - 10, w: 21, segs: [44,34,26] },
    { x: palmX+10+52,       y: palmY + palmH - 14, w: 21, segs: [44,34,26] },
    { x: palmX+10+78,       y: palmY + palmH - 8, w: 20, segs: [40,30,22] },
    { x: palmX+10+100,      y: palmY + palmH + 10, w: 18, segs: [32,24,18] },
  ];

  fingerData.forEach(f => {
    let fy = f.y;
    f.segs.forEach((segH, si) => {
      out += panelRect(f.x, fy, f.w, segH, 6, c, strokeW * 0.8, si===0?'0.90':'0.80');
      if (si < f.segs.length - 1) {
        out += `<line x1="${f.x+2}" y1="${fy+segH}" x2="${f.x+f.w-2}" y2="${fy+segH}" stroke="${c}" stroke-width="1.2" opacity="0.5"/>`;
      }
      fy += segH + 3;
    });
    // fingertip detail
    if (neuralDense >= 2) {
      out += sensorNode(f.x + f.w/2, fy - 8, c, g * 0.7, 4);
    }
  });

  // ── Thumb ──
  out += panelRect(palmX - 22, palmY + 30, 24, 55, 10, c, strokeW * 0.8, '0.88');
  out += panelRect(palmX - 18, palmY + 88, 16, 36, 7, c, strokeW * 0.7, '0.80');
  out += `<line x1="${palmX-18}" y1="${palmY+87}" x2="${palmX+6}" y2="${palmY+87}" stroke="${c}" stroke-width="1.2" opacity="0.5"/>`;

  // ── Power ──
  if (powerStyle === 'orb') {
    out += powerOrb(240, palmY + palmH*0.45, 12, c, g);
  } else {
    out += powerCell(palmX + palmW*0.3, palmY + palmH*0.55, palmW*0.4, 14, 4, c, g);
  }

  // ── Neural palm lines ──
  if (neuralDense >= 1) {
    out += neuralPath(`M240 168 L240 ${palmY+palmH*0.8}`, c, 1.5, 0.6, g);
  }
  if (neuralDense >= 2) {
    out += neuralPath(`M228 168 C225 190 222 210 225 ${palmY+palmH*0.85}`, c, 1, 0.45, g);
    out += neuralPath(`M252 168 C255 190 258 210 255 ${palmY+palmH*0.85}`, c, 1, 0.45, g);
  }
  if (neuralDense >= 3) {
    // radiate to fingers
    fingerData.forEach((f, i) => {
      out += neuralPath(`M240 ${palmY+palmH*0.8} L${f.x+f.w/2} ${f.y+5}`, c, 0.8, 0.3, g);
    });
  }

  // ── Thermal ──
  if (thermalMode === 'mesh') {
    out += thermalMesh(palmX - 12, palmY + palmH * 0.5, 16, c, g);
  }
  if (thermalMode === 'vents') {
    out += thermalVents([[palmX+palmW+4, palmY+30], [palmX+palmW+4, palmY+50], [palmX+palmW+4, palmY+70]], c, g);
  }

  // ── Sensors on palm back ──
  const palmSensorPos = [[palmX+22,palmY+22],[palmX+palmW-28,palmY+22],[palmX+22,palmY+palmH-30],[palmX+palmW-28,palmY+palmH-30]];
  for (let i = 0; i < Math.min(sensorCount, palmSensorPos.length); i++) {
    out += sensorNode(palmSensorPos[i][0], palmSensorPos[i][1], c, g);
  }

  if (scarring) {
    out += scarMark(palmX+30, palmY+60, 35, 25, c);
    out += scarMark(palmX+palmW-45, palmY+80, 28, -15, c);
  }
  if (overclocked) out += glitchArtifact(c);

  return out;
}

/* ════════════════════════════════════════════════
   LEG RENDERER
════════════════════════════════════════════════ */
function renderLeg(c, vp, inp) {
  const { armorLevel, neuralDense, thermalMode, powerStyle, sensorCount, glowMult: g, panelStyle, scarring, overclocked } = vp;

  const strokeW = 1 + armorLevel * 0.3;
  const thighW  = 105 + armorLevel * 10;
  const thighX  = 240 - thighW / 2;
  const shankW  = 88 + armorLevel * 8;
  const shankX  = 240 - shankW / 2;

  let out = `\n  <!-- LEG UNIT (armor:${armorLevel} neural:${neuralDense}) -->`;

  // ── Thigh ──
  out += panelRect(thighX, 42, thighW, 170, 26, c, strokeW, '0.93');

  if (panelStyle === 'industrial') {
    out += panelRect(thighX+8, 50, thighW-16, 24, 5, c, 0.5, '0.38', 'url(#armorGrad)');
    out += panelRect(thighX+8, 180, thighW-16, 24, 5, c, 0.5, '0.38', 'url(#armorGrad)');
    [[thighX+16,58],[thighX+thighW-22,58],[thighX+16,188],[thighX+thighW-22,188]].forEach(([bx,by]) => {
      out += `<circle cx="${bx}" cy="${by}" r="3.5" fill="none" stroke="${c}" stroke-width="1" opacity="0.45"/>`;
      out += `<circle cx="${bx}" cy="${by}" r="1.2" fill="${c}" opacity="0.6"/>`;
    });
  }

  if (panelStyle === 'organic') {
    out += `<path d="M${thighX+14} 110 Q${240} 90 ${thighX+thighW-14} 110" fill="none" stroke="${c}" stroke-width="1" opacity="0.25"/>`;
    out += `<path d="M${thighX+14} 155 Q${240} 140 ${thighX+thighW-14} 155" fill="none" stroke="${c}" stroke-width="0.8" opacity="0.2"/>`;
  }

  // Side armor
  if (armorLevel >= 2) {
    out += armorPlate(thighX-10, 60, 14, 110, 6, c, g);
    out += armorPlate(thighX+thighW-4, 60, 14, 110, 6, c, g);
  }
  if (armorLevel >= 3) {
    out += armorPlate(thighX-20, 80, 12, 70, 5, c, g);
    out += armorPlate(thighX+thighW+8, 80, 12, 70, 5, c, g);
  }

  // ── Knee ──
  const kneeY = 218;
  out += `<ellipse cx="240" cy="${kneeY}" rx="${thighW/2 - 2}" ry="28" fill="url(#bodyGrad)" stroke="${c}" stroke-width="${strokeW*1.2}" opacity="0.96" filter="url(#glowF)"/>`;
  // Knee cap detail
  out += `<ellipse cx="240" cy="${kneeY}" rx="${thighW/2 - 14}" ry="16" fill="none" stroke="${c}" stroke-width="1" opacity="${(0.5*g).toFixed(2)}" filter="url(#softGlow)"/>`;
  out += `<circle cx="240" cy="${kneeY}" r="7" fill="${c}" opacity="${(0.35*g).toFixed(2)}" filter="url(#softGlow)"/>`;
  out += `<circle cx="240" cy="${kneeY}" r="3" fill="${c}" opacity="${(0.85*g).toFixed(2)}" filter="url(#strongGlow)"/>`;
  if (armorLevel >= 2) {
    out += `<ellipse cx="240" cy="${kneeY}" rx="${thighW/2 + 4}" ry="10" fill="none" stroke="${c}" stroke-width="1.5" opacity="${(0.4*g).toFixed(2)}"/>`;
  }

  // Knee bolts
  [[-1,1],[1,1],[-1,-1],[1,-1]].forEach(([sx,sy]) => {
    const bx = 240 + sx * (thighW/2 - 14);
    const by = kneeY + sy * 12;
    out += `<circle cx="${bx}" cy="${by}" r="3" fill="none" stroke="${c}" stroke-width="1" opacity="0.5"/>`;
  });

  // ── Shin/lower leg ──
  out += panelRect(shankX, 244, shankW, 148, 20, c, strokeW, '0.92');

  if (panelStyle === 'industrial') {
    out += panelRect(shankX+6, 252, shankW-12, 20, 4, c, 0.5, '0.36', 'url(#armorGrad)');
  }
  if (panelStyle === 'organic') {
    out += `<path d="M${shankX+12} 310 Q${240} 295 ${shankX+shankW-12} 310" fill="none" stroke="${c}" stroke-width="0.8" opacity="0.2"/>`;
  }

  // ── Ankle ──
  const ankleW = shankW - 12;
  out += panelRect(240 - ankleW/2, 390, ankleW, 30, 12, c, strokeW, '0.90');
  out += `<rect x="${240-ankleW/2}" y="390" width="${ankleW}" height="30" rx="12" fill="none" stroke="${c}" stroke-width="${1.5*g}" opacity="${(0.7*g).toFixed(2)}" filter="url(#softGlow)"/>`;

  // ── Foot ──
  out += panelRect(190, 418, 130, 48, 16, c, strokeW, '0.90');
  out += `<line x1="200" y1="438" x2="310" y2="438" stroke="${c}" stroke-width="0.6" opacity="0.25"/>`;
  // toe segments
  for (let i = 0; i < 4; i++) {
    out += panelRect(198 + i*28, 464, 22, 20, 6, c, 0.8, '0.80');
  }

  // ── Power ──
  if (powerStyle === 'orb') {
    out += powerOrb(240, 130, 16, c, g);
  } else {
    out += powerCell(thighX + thighW*0.2, 120, thighW*0.6, 18, 5, c, g);
  }

  // ── Neural ──
  if (neuralDense >= 1) {
    out += neuralPath(`M240 55 L240 210`, c, 1.5, 0.6, g);
  }
  if (neuralDense >= 2) {
    out += neuralPath(`M228 55 C224 100 220 150 224 200`, c, 1, 0.4, g);
    out += neuralPath(`M240 248 L240 385`, c, 1.2, 0.55, g);
  }
  if (neuralDense >= 3) {
    out += neuralPath(`M252 55 C256 100 260 150 256 200`, c, 1, 0.3, g);
    out += neuralPath(`M228 248 C224 290 220 340 224 382`, c, 0.9, 0.3, g);
  }

  // ── Thermal ──
  if (thermalMode === 'vents') {
    out += thermalVents([[shankX+shankW+2,268],[shankX+shankW+2,286],[shankX+shankW+2,304],[shankX+shankW+2,322]], c, g);
  }
  if (thermalMode === 'mesh') {
    out += thermalMesh(shankX+shankW+14, 318, 20, c, g);
  }
  if (thermalMode === 'coils') {
    for (let i = 0; i < 3; i++) {
      const cy = 272 + i * 36;
      out += `<path d="M${shankX+shankW+2} ${cy} Q${shankX+shankW+18} ${cy+10} ${shankX+shankW+2} ${cy+20}" fill="none" stroke="${c}" stroke-width="1.5" opacity="${(0.45*g).toFixed(2)}"/>`;
    }
  }

  // ── Sensors ──
  const legSensorPos = [[thighX+14,80],[thighX+thighW-20,80],[shankX+12,290],[shankX+shankW-18,290]];
  for (let i = 0; i < Math.min(sensorCount, legSensorPos.length); i++) {
    out += sensorNode(legSensorPos[i][0], legSensorPos[i][1], c, g);
  }

  // ── Panel details ──
  out += `<line x1="${thighX+14}" y1="100" x2="${thighX+thighW-14}" y2="100" stroke="${c}" stroke-width="0.6" opacity="0.26"/>`;
  out += `<line x1="${thighX+14}" y1="145" x2="${thighX+thighW-14}" y2="145" stroke="${c}" stroke-width="0.6" opacity="0.18"/>`;
  out += `<line x1="${shankX+10}" y1="298" x2="${shankX+shankW-10}" y2="298" stroke="${c}" stroke-width="0.6" opacity="0.22"/>`;
  out += `<line x1="${shankX+10}" y1="338" x2="${shankX+shankW-10}" y2="338" stroke="${c}" stroke-width="0.6" opacity="0.16"/>`;

  if (scarring) {
    out += scarMark(thighX+25, 130, 30, -18, c);
    out += scarMark(shankX+22, 310, 25, 22, c);
  }
  if (overclocked) out += glitchArtifact(c);

  return out;
}

/* ════════════════════════════════════════════════
   FOOT RENDERER
════════════════════════════════════════════════ */
function renderFoot(c, vp, inp) {
  const { armorLevel, neuralDense, thermalMode, sensorCount, glowMult: g, panelStyle, scarring, overclocked } = vp;
  const strokeW = 1 + armorLevel * 0.3;

  let out = `\n  <!-- FOOT UNIT (armor:${armorLevel} neural:${neuralDense}) -->`;

  // ── Ankle / stub ──
  out += panelRect(196, 90, 88, 80, 18, c, strokeW, '0.92');
  // ankle ring
  out += `<ellipse cx="240" cy="170" rx="48" ry="16" fill="url(#bodyGrad)" stroke="${c}" stroke-width="${strokeW*1.1}" opacity="0.94"/>`;
  out += `<ellipse cx="240" cy="170" rx="38" ry="10" fill="none" stroke="${c}" stroke-width="0.8" opacity="${(0.4*g).toFixed(2)}" filter="url(#glowF)"/>`;
  out += `<circle cx="240" cy="170" r="5" fill="${c}" opacity="${(0.35*g).toFixed(2)}" filter="url(#softGlow)"/>`;

  // ── Heel block ──
  out += panelRect(175, 183, 75, 80, 14, c, strokeW, '0.90');

  // ── Mid-foot ──
  out += panelRect(155, 245, 155, 65, 16, c, strokeW, '0.93');
  out += `<line x1="168" y1="272" x2="298" y2="272" stroke="${c}" stroke-width="0.7" opacity="0.25"/>`;

  if (panelStyle === 'industrial') {
    out += armorPlate(148, 260, 12, 42, 5, c, g);
    out += armorPlate(300, 260, 12, 42, 5, c, g);
    [[164,258],[296,258],[164,298],[296,298]].forEach(([bx,by]) => {
      out += `<circle cx="${bx}" cy="${by}" r="3" fill="none" stroke="${c}" stroke-width="1" opacity="0.45"/>`;
      out += `<circle cx="${bx}" cy="${by}" r="1.2" fill="${c}" opacity="0.6"/>`;
    });
  }
  if (panelStyle === 'organic') {
    out += `<path d="M165 260 Q240 248 305 260" fill="none" stroke="${c}" stroke-width="0.8" opacity="0.22"/>`;
  }

  // ── Toes (5) ──
  const toeData = [
    {x:163, w:22, h:36}, {x:190, w:24, h:42}, {x:220, w:24, h:44},
    {x:250, w:22, h:40}, {x:278, w:18, h:30}
  ];
  const toeY = 308;
  toeData.forEach(t => {
    out += panelRect(t.x, toeY, t.w, t.h, 8, c, strokeW*0.8, '0.85');
    out += panelRect(t.x+2, toeY+t.h, t.w-4, 18, 6, c, strokeW*0.7, '0.75');
    if (neuralDense >= 2) {
      out += sensorNode(t.x + t.w/2, toeY + t.h + 8, c, g*0.7, 3.5);
    }
  });

  // ── Power (sole) ──
  out += powerCell(185, 255, 110, 16, 5, c, g);

  // ── Neural running through ankle ──
  if (neuralDense >= 1) {
    out += neuralPath(`M240 95 L240 165`, c, 1.5, 0.6, g);
  }
  if (neuralDense >= 2) {
    out += neuralPath(`M232 95 C228 120 225 145 228 162`, c, 1, 0.4, g);
    out += neuralPath(`M240 186 L240 244`, c, 1.2, 0.5, g);
  }
  if (neuralDense >= 3) {
    toeData.forEach(t => {
      out += neuralPath(`M240 244 L${t.x+t.w/2} ${toeY}`, c, 0.7, 0.28, g);
    });
  }

  // ── Thermal at heel ──
  if (thermalMode === 'vents') {
    out += thermalVents([[248,198],[248,212],[248,226],[248,240]], c, g);
  }
  if (thermalMode === 'mesh') {
    out += thermalMesh(248, 220, 18, c, g);
  }

  // ── Sensors ──
  const footSensorPos = [[180,220],[300,220],[170,280],[308,280]];
  for (let i = 0; i < Math.min(sensorCount, footSensorPos.length); i++) {
    out += sensorNode(footSensorPos[i][0], footSensorPos[i][1], c, g);
  }

  if (scarring) {
    out += scarMark(210, 200, 28, 30, c);
    out += scarMark(275, 265, 22, -20, c);
  }
  if (overclocked) out += glitchArtifact(c);

  return out;
}

/* ════════════════════════════════════════════════
   SPINE RENDERER
════════════════════════════════════════════════ */
function renderSpine(c, vp, inp) {
  const { armorLevel, neuralDense, thermalMode, powerStyle, sensorCount, glowMult: g, panelStyle, scarring, overclocked } = vp;
  const strokeW = 1 + armorLevel * 0.25;

  let out = `\n  <!-- SPINE UNIT (armor:${armorLevel} neural:${neuralDense}) -->`;

  const vertebrae = [
    { y: 52, w: 72, h: 40, rx: 12 },
    { y: 98, w: 78, h: 38, rx: 11 },
    { y: 142, w: 82, h: 38, rx: 11 },
    { y: 186, w: 84, h: 38, rx: 11 },
    { y: 230, w: 82, h: 36, rx: 10 },
    { y: 272, w: 78, h: 36, rx: 10 },
    { y: 314, w: 74, h: 36, rx: 10 },
    { y: 356, w: 68, h: 38, rx: 10 },
    { y: 400, w: 62, h: 38, rx: 10 },
  ];

  // ── Central channel ──
  out += `<rect x="234" y="48" width="12" height="396" rx="6" fill="url(#bodyGrad2)" stroke="${c}" stroke-width="0.8" opacity="0.5"/>`;

  // ── Vertebrae ──
  vertebrae.forEach((v, i) => {
    const vx = 240 - v.w / 2;

    out += panelRect(vx, v.y, v.w, v.h, v.rx, c, strokeW, '0.92');

    // center channel highlight
    out += `<rect x="234" y="${v.y+4}" width="12" height="${v.h-8}" rx="4" fill="${c}" opacity="${(0.15*g).toFixed(2)}"/>`;

    // side processes (spine protrusions) — more prominent at higher armor
    const processLen = 16 + armorLevel * 6;
    out += `<rect x="${vx - processLen}" y="${v.y + 10}" width="${processLen}" height="${v.h - 20}" rx="5" fill="url(#bodyGrad)" stroke="${c}" stroke-width="${strokeW*0.7}" opacity="0.80"/>`;
    out += `<rect x="${vx + v.w}" y="${v.y + 10}" width="${processLen}" height="${v.h - 20}" rx="5" fill="url(#bodyGrad)" stroke="${c}" stroke-width="${strokeW*0.7}" opacity="0.80"/>`;

    // armor side ribs
    if (armorLevel >= 2) {
      out += armorPlate(vx - processLen - 8, v.y+8, 8, v.h-16, 3, c, g);
      out += armorPlate(vx + v.w + processLen, v.y+8, 8, v.h-16, 3, c, g);
    }

    // panel lines
    if (panelStyle !== 'organic') {
      out += `<line x1="${vx+8}" y1="${v.y + v.h/2}" x2="${vx+v.w-8}" y2="${v.y + v.h/2}" stroke="${c}" stroke-width="0.5" opacity="0.22"/>`;
    }

    // organic curved lines between vertebrae
    if (panelStyle === 'organic' && i < vertebrae.length - 1) {
      const nextV = vertebrae[i+1];
      out += `<path d="M${240-4} ${v.y+v.h} Q${240-10} ${v.y+v.h+5} ${240-4} ${nextV.y}" fill="none" stroke="${c}" stroke-width="0.8" opacity="0.25"/>`;
      out += `<path d="M${240+4} ${v.y+v.h} Q${240+10} ${v.y+v.h+5} ${240+4} ${nextV.y}" fill="none" stroke="${c}" stroke-width="0.8" opacity="0.25"/>`;
    }

    // sensor on alternating vertebrae
    if (sensorCount > 0 && i % Math.max(1, Math.floor(vertebrae.length / sensorCount)) === 0) {
      out += sensorNode(vx + v.w + processLen + 14, v.y + v.h/2, c, g, 5);
    }
  });

  // ── Power ──
  if (powerStyle === 'orb' || powerStyle === 'spine_core') {
    const coreY = 230;
    out += powerOrb(240, coreY, 20, c, g);
    // power lines up and down from core
    for (let i = 0; i < 4; i++) {
      const dashY = coreY - 30 - i * 40;
      out += `<line x1="240" y1="${dashY}" x2="240" y2="${dashY+20}" stroke="${c}" stroke-width="1" opacity="${(0.3*g*(0.8**i)).toFixed(2)}" filter="url(#glowF)"/>`;
    }
    for (let i = 0; i < 4; i++) {
      const dashY = coreY + 25 + i * 40;
      out += `<line x1="240" y1="${dashY}" x2="240" y2="${dashY+20}" stroke="${c}" stroke-width="1" opacity="${(0.3*g*(0.8**i)).toFixed(2)}" filter="url(#glowF)"/>`;
    }
  } else {
    out += powerCell(224, 215, 32, 30, 6, c, g);
  }

  // ── Neural main trunk ──
  if (neuralDense >= 1) {
    out += neuralPath(`M240 52 L240 438`, c, 2, 0.55, g);
  }
  if (neuralDense >= 2) {
    // branching off to the sides at each vertebra level
    vertebrae.forEach((v, i) => {
      if (i % 2 === 0) {
        const bLen = 24 + armorLevel * 8;
        out += neuralPath(`M240 ${v.y+v.h/2} L${240-bLen} ${v.y+v.h/2}`, c, 1, 0.35, g);
        out += neuralPath(`M240 ${v.y+v.h/2} L${240+bLen} ${v.y+v.h/2}`, c, 1, 0.35, g);
      }
    });
  }
  if (neuralDense >= 3) {
    vertebrae.forEach((v, i) => {
      if (i % 2 !== 0) {
        const bLen = 18 + armorLevel * 5;
        out += neuralPath(`M240 ${v.y+v.h/2} L${240-bLen} ${v.y+v.h/2}`, c, 0.8, 0.25, g);
        out += neuralPath(`M240 ${v.y+v.h/2} L${240+bLen} ${v.y+v.h/2}`, c, 0.8, 0.25, g);
      }
    });
  }

  // ── Thermal ──
  if (thermalMode === 'vents') {
    vertebrae.filter((_,i) => i % 3 === 0).forEach(v => {
      out += thermalVents([[240+v.w/2+4, v.y+10, 14, 4]], c, g);
    });
  }
  if (thermalMode === 'mesh') {
    out += thermalMesh(240 + vertebrae[4].w/2 + 24, 248, 16, c, g);
  }

  if (scarring) {
    vertebrae.filter((_,i) => i === 2 || i === 5).forEach(v => {
      out += scarMark(240 - v.w/2 + 10, v.y + 8, v.w - 20, 0, c);
    });
  }
  if (overclocked) out += glitchArtifact(c);

  return out;
}

/* ════════════════════════════════════════════════
   EYE / OCULAR RENDERER
════════════════════════════════════════════════ */
function renderEye(c, vp, inp) {
  const { armorLevel, neuralDense, thermalMode, sensorCount, glowMult: g, panelStyle, scarring, overclocked } = vp;

  let out = `\n  <!-- OCULAR UNIT (neural:${neuralDense} sensors:${sensorCount}) -->`;

  const cx = 240, cy = 200;
  const outerR = 105, midR = 88, irisR = 62, pupilR = 28, coreR = 10;

  // ── Orbital housing ──
  out += `<circle cx="${cx}" cy="${cy}" r="${outerR}" fill="url(#bodyGrad)" stroke="${c}" stroke-width="${1+armorLevel*0.3}" opacity="0.92"/>`;

  // armor plates around housing
  if (armorLevel >= 1) {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const px = cx + Math.cos(angle) * outerR * 0.85;
      const py = cy + Math.sin(angle) * outerR * 0.85;
      out += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="8" fill="url(#bodyGrad)" stroke="${c}" stroke-width="0.8" opacity="0.75"/>`;
    }
  }
  if (armorLevel >= 2) {
    // brow/cheek plates
    out += armorPlate(cx-outerR-10, cy-30, 14, 60, 6, c, g);
    out += armorPlate(cx+outerR-4, cy-30, 14, 60, 6, c, g);
  }
  if (armorLevel >= 3) {
    out += armorPlate(cx-outerR-22, cy-20, 12, 40, 5, c, g);
    out += armorPlate(cx+outerR+10, cy-20, 12, 40, 5, c, g);
  }

  // ── Scan rings ──
  [outerR*0.9, outerR*0.75].forEach(r => {
    out += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${c}" stroke-width="0.5" stroke-dasharray="4 6" opacity="${(0.25*g).toFixed(2)}"/>`;
  });

  // ── Iris ring ──
  out += `<circle cx="${cx}" cy="${cy}" r="${midR}" fill="url(#bodyGrad2)" stroke="${c}" stroke-width="1.5" opacity="0.90"/>`;

  // iris segments (like camera aperture)
  const irisSegments = 8;
  for (let i = 0; i < irisSegments; i++) {
    const angle1 = (i / irisSegments) * Math.PI * 2;
    const angle2 = ((i + 0.6) / irisSegments) * Math.PI * 2;
    const x1 = cx + Math.cos(angle1) * (midR - 4);
    const y1 = cy + Math.sin(angle1) * (midR - 4);
    const x2 = cx + Math.cos(angle1) * irisR;
    const y2 = cy + Math.sin(angle1) * irisR;
    const x3 = cx + Math.cos(angle2) * irisR;
    const y3 = cy + Math.sin(angle2) * irisR;
    const x4 = cx + Math.cos(angle2) * (midR - 4);
    const y4 = cy + Math.sin(angle2) * (midR - 4);
    out += `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} L${x3.toFixed(1)},${y3.toFixed(1)} L${x4.toFixed(1)},${y4.toFixed(1)} Z" fill="${c}" opacity="${(0.12*g).toFixed(2)}" stroke="${c}" stroke-width="0.5" opacity="${(0.3*g).toFixed(2)}"/>`;
  }

  // ── Iris glow ring ──
  out += `<circle cx="${cx}" cy="${cy}" r="${irisR}" fill="none" stroke="${c}" stroke-width="2" opacity="${(0.7*g).toFixed(2)}" filter="url(#softGlow)"/>`;

  // ── Pupil ──
  out += `<circle cx="${cx}" cy="${cy}" r="${pupilR}" fill="${c}" opacity="${(0.2*g).toFixed(2)}" filter="url(#strongGlow)"/>`;
  out += `<circle cx="${cx}" cy="${cy}" r="${pupilR}" fill="none" stroke="${c}" stroke-width="2.5" opacity="${(0.85*g).toFixed(2)}" filter="url(#softGlow)"/>`;

  // ── Core ──
  out += `<circle cx="${cx}" cy="${cy}" r="${coreR}" fill="${c}" opacity="${(0.5*g).toFixed(2)}" filter="url(#strongGlow)"/>`;
  out += `<circle cx="${cx}" cy="${cy}" r="${coreR*0.4}" fill="${c}" opacity="${Math.min(1, 0.95*g).toFixed(2)}" filter="url(#strongGlow)"/>`;

  // ── Neural traces radiating from pupil ──
  if (neuralDense >= 1) {
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI/8;
      const x1 = cx + Math.cos(angle) * pupilR * 1.2;
      const y1 = cy + Math.sin(angle) * pupilR * 1.2;
      const x2 = cx + Math.cos(angle) * irisR * 0.85;
      const y2 = cy + Math.sin(angle) * irisR * 0.85;
      out += glowLine(x1.toFixed(1), y1.toFixed(1), x2.toFixed(1), y2.toFixed(1), c, 1, (0.5*g).toFixed(2));
    }
  }
  if (neuralDense >= 2) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x1 = cx + Math.cos(angle) * irisR * 0.95;
      const y1 = cy + Math.sin(angle) * irisR * 0.95;
      const x2 = cx + Math.cos(angle) * midR * 0.92;
      const y2 = cy + Math.sin(angle) * midR * 0.92;
      out += glowLine(x1.toFixed(1), y1.toFixed(1), x2.toFixed(1), y2.toFixed(1), c, 0.7, (0.35*g).toFixed(2));
    }
  }
  if (neuralDense >= 3) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const x1 = cx + Math.cos(angle) * midR * 0.95;
      const y1 = cy + Math.sin(angle) * midR * 0.95;
      const x2 = cx + Math.cos(angle) * outerR * 0.9;
      const y2 = cy + Math.sin(angle) * outerR * 0.9;
      out += glowLine(x1.toFixed(1), y1.toFixed(1), x2.toFixed(1), y2.toFixed(1), c, 0.5, (0.22*g).toFixed(2));
    }
  }

  // ── Crosshair reticle inside iris ──
  out += glowLine(cx - irisR*0.6, cy, cx - pupilR*1.3, cy, c, 1, (0.6*g).toFixed(2));
  out += glowLine(cx + pupilR*1.3, cy, cx + irisR*0.6, cy, c, 1, (0.6*g).toFixed(2));
  out += glowLine(cx, cy - irisR*0.6, cx, cy - pupilR*1.3, c, 1, (0.6*g).toFixed(2));
  out += glowLine(cx, cy + pupilR*1.3, cx, cy + irisR*0.6, c, 1, (0.6*g).toFixed(2));

  // ── Sensors around orbital ring ──
  const sensorAngles = [Math.PI*0.2, Math.PI*0.8, Math.PI*1.2, Math.PI*1.8];
  for (let i = 0; i < Math.min(sensorCount, sensorAngles.length); i++) {
    const sx = cx + Math.cos(sensorAngles[i]) * (outerR + 10);
    const sy = cy + Math.sin(sensorAngles[i]) * (outerR + 10);
    out += sensorNode(sx.toFixed(1), sy.toFixed(1), c, g, 7);
  }

  // ── Connection cable stubs ──
  const cableAngles = [Math.PI * 0.5, Math.PI * 1.0, Math.PI * 1.5];
  cableAngles.forEach(angle => {
    const x1 = cx + Math.cos(angle) * outerR;
    const y1 = cy + Math.sin(angle) * outerR;
    const x2 = cx + Math.cos(angle) * (outerR + 22);
    const y2 = cy + Math.sin(angle) * (outerR + 22);
    out += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c}" stroke-width="3" opacity="0.5" stroke-linecap="round"/>`;
    out += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c}" stroke-width="1" opacity="${(0.8*g).toFixed(2)}" filter="url(#glowF)"/>`;
  });

  // ── Scan data readout (below eye) ──
  out += `
  <g opacity="${(0.75*g).toFixed(2)}">
    <rect x="${cx-80}" y="${cy+outerR+14}" width="160" height="52" rx="8" fill="rgba(0,0,0,0.50)" stroke="${c}" stroke-width="0.8"/>
    <text x="${cx-68}" y="${cy+outerR+32}" font-size="8" fill="${c}" font-family="monospace" letter-spacing="1" opacity="0.7">OCULAR TELEMETRY</text>
    <text x="${cx-68}" y="${cy+outerR+48}" font-size="10" fill="${c}" font-family="monospace" font-weight="bold">SCAN ACTIVE</text>
    <text x="${cx-68}" y="${cy+outerR+60}" font-size="7" fill="rgba(235,240,255,0.55)" font-family="monospace">${neuralDense >= 2 ? 'NEURAL LINK: OK' : 'STANDARD MODE'}</text>
  </g>`;

  // ── Thermal (cooling slots beside housing) ──
  if (thermalMode === 'vents' || thermalMode === 'coils') {
    [[cx+outerR+6, cy-16],[cx+outerR+6, cy],[cx+outerR+6, cy+16]].forEach(([tx,ty]) => {
      out += `<rect x="${tx}" y="${ty}" width="16" height="6" rx="3" fill="${c}" opacity="${(0.38*g).toFixed(2)}" filter="url(#glowF)"/>`;
    });
  }
  if (thermalMode === 'mesh') {
    out += thermalMesh(cx + outerR + 18, cy, 14, c, g);
  }

  // ── Panel lines (organic seams on housing) ──
  if (panelStyle === 'organic') {
    out += `<path d="M${cx-outerR+10} ${cy-20} Q${cx} ${cy-outerR*0.5} ${cx+outerR-10} ${cy-20}" fill="none" stroke="${c}" stroke-width="0.6" opacity="0.2"/>`;
  }

  if (scarring) {
    out += scarMark(cx + 60, cy - 80, 24, 40, c);
    out += scarMark(cx - 70, cy + 60, 18, -30, c);
  }
  if (overclocked) out += glitchArtifact(c);

  return out;
}

/* ════════════════════════════════════════════════
   HUD OVERLAY
════════════════════════════════════════════════ */
function renderHUD(c, modules, inp, vp) {
  const tags = modules.map(m => MODULES[m]?.tag).filter(Boolean);
  const ps = computeProfileScore(inp);
  const risk = computeRiskIndex(inp);
  const g = vp.glowMult;
  const partLabel = vp.bodyPart.toUpperCase();

  let hud = `\n  <!-- HUD OVERLAY -->`;

  // Top-left status
  hud += `
  <g opacity="${(0.85*g).toFixed(2)}">
    <rect x="18" y="18" width="148" height="68" rx="8" fill="rgba(0,0,0,0.55)" stroke="${c}" stroke-width="0.8" opacity="0.65"/>
    <text x="28" y="36" font-size="8" fill="${c}" font-family="monospace" letter-spacing="1" opacity="0.7">A.A.S — ${partLabel}</text>
    <text x="28" y="52" font-size="10" fill="${c}" font-family="monospace" font-weight="bold">ACTIVE</text>
    <text x="28" y="68" font-size="8" fill="rgba(235,240,255,0.55)" font-family="monospace">SYS OK — ${tags.length} MOD</text>
  </g>`;

  // Top-right score
  hud += `
  <g opacity="${(0.75*g).toFixed(2)}">
    <rect x="340" y="18" width="122" height="54" rx="8" fill="rgba(0,0,0,0.50)" stroke="${c}" stroke-width="0.7" opacity="0.5"/>
    <text x="352" y="36" font-size="8" fill="rgba(235,240,255,0.55)" font-family="monospace" letter-spacing="1">SCORE</text>
    <text x="352" y="56" font-size="16" fill="${c}" font-family="monospace" font-weight="bold">${ps}</text>
    <text x="388" y="56" font-size="9" fill="rgba(235,240,255,0.40)" font-family="monospace">/100</text>
  </g>`;

  // Bottom-right module tags
  const tagList = [...new Set(tags)];
  tagList.forEach((tag, i) => {
    const y = 452 - i * 20;
    hud += `
    <rect x="324" y="${y-12}" width="82" height="16" rx="3" fill="rgba(0,0,0,0.40)" stroke="${c}" stroke-width="0.6" opacity="${(0.5*g).toFixed(2)}"/>
    <text x="334" y="${y}" font-size="8" fill="${c}" font-family="monospace" letter-spacing="1" opacity="${(0.7*g).toFixed(2)}">${tag}</text>`;
  });

  // Risk badge
  if (risk > 4) {
    hud += `
    <g opacity="0.85">
      <rect x="18" y="96" width="130" height="26" rx="6" fill="rgba(255,74,106,0.10)" stroke="#ff4a6a" stroke-width="0.8"/>
      <text x="28" y="113" font-size="8" fill="#ff4a6a" font-family="monospace" letter-spacing="1">RISK IDX: ${risk}/10</text>
    </g>`;
  }

  // Overclock warning
  if (vp.overclocked) {
    hud += `
    <g opacity="0.80">
      <rect x="18" y="${risk > 4 ? 130 : 96}" width="130" height="26" rx="6" fill="rgba(255,193,74,0.08)" stroke="#ffc14a" stroke-width="0.8"/>
      <text x="28" y="${risk > 4 ? 147 : 113}" font-size="8" fill="#ffc14a" font-family="monospace" letter-spacing="1">⚡ OVERCLOCK ACTIVE</text>
    </g>`;
  }

  // Reticle (lighter for stealth builds)
  const reticleOp = (0.14 * g).toFixed(2);
  hud += `
  <g opacity="${reticleOp}" filter="url(#glowF)">
    <circle cx="240" cy="240" r="108" fill="none" stroke="${c}" stroke-width="0.5" stroke-dasharray="6 9"/>
    <circle cx="240" cy="240" r="68" fill="none" stroke="${c}" stroke-width="0.5" stroke-dasharray="3 7"/>
    <line x1="118" y1="240" x2="150" y2="240" stroke="${c}" stroke-width="0.5"/>
    <line x1="330" y1="240" x2="362" y2="240" stroke="${c}" stroke-width="0.5"/>
    <line x1="240" y1="118" x2="240" y2="150" stroke="${c}" stroke-width="0.5"/>
    <line x1="240" y1="330" x2="240" y2="362" stroke="${c}" stroke-width="0.5"/>
  </g>`;

  return hud;
}

/* ════════════════════════════════════════════════
   RENDER RESULTS
════════════════════════════════════════════════ */
function renderResults(result, inp) {
  const { selected, reasoning, stats, buildName, accent } = result;

  document.getElementById('configName').textContent = buildName;
  document.getElementById('resultBadge1').textContent = inp.goals[0]?.toUpperCase() || 'LONGEVITY';
  document.getElementById('resultBadge2').textContent = cap(inp.work);

  document.getElementById('svgWrap').innerHTML = generateSVG(selected, accent, inp);

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

  const mb = document.getElementById('modulesBreakdown');
  mb.innerHTML = selected.map(key => {
    const m = MODULES[key];
    return `<div class="module-row">
      <div class="module-dot ${m.color === 'amber' ? 'amber' : m.color === 'green' ? 'green' : ''}"></div>
      <div class="module-info">
        <div class="module-name">${m.name}</div>
        <div class="module-desc">${m.desc}</div>
      </div>
      <span class="module-tag">${m.tag}</span>
    </div>`;
  }).join('');

  const rl = document.getElementById('reasoningLog');
  rl.innerHTML = reasoning.map(r => `<div class="reasoning-line">${r}</div>`).join('');

  const og = document.getElementById('overrideGrid');
  og.innerHTML = Object.entries(MODULES).map(([key, m]) => {
    const isSelected = selected.includes(key);
    const delta = m.statBonus.neural + m.statBonus.stab + m.statBonus.thermal;
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

  const r = document.getElementById('results');
  const ov = document.getElementById('override');
  r.classList.add('visible');
  ov.classList.add('visible');

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
  const stab  = active.reduce((s, m) => s + m.statBonus.stab, 0);

  document.getElementById('ov-score').textContent = '+' + score + '%';
  document.getElementById('ov-stab').textContent  = '+' + stab + '%';
  setTimeout(() => {
    document.getElementById('ov-bar-score').style.width = Math.min(score, 100) + '%';
    document.getElementById('ov-bar-stab').style.width  = Math.min(stab, 100) + '%';
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