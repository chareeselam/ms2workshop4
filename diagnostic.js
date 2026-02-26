/* ════════════════════════════════════════════════
   diagnostic.js — diagnostic page logic
   Depends on: engine.js
════════════════════════════════════════════════ */

/* ── Clock ── */
(function () {
  function tick() {
    const n = new Date();
    const el = document.getElementById('sysTime');
    if (el) el.textContent =
      String(n.getHours()).padStart(2,'0') + ':' +
      String(n.getMinutes()).padStart(2,'0') + ':' +
      String(n.getSeconds()).padStart(2,'0');
  }
  setInterval(tick, 1000); tick();
})();

/* ── Goal chips ── */
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

/* ── Read inputs ── */
function getLiveInputs() {
  return {
    sleepHours:   parseFloat(document.getElementById('sleepHours').value),
    sleepQuality: document.getElementById('sleepQuality').value,
    stress:       document.getElementById('stressLevel').value,
    work:         document.getElementById('workType').value,
    activity:     document.getElementById('activityLevel').value,
    injury:       document.getElementById('injuryHistory').value,
    climate:      document.getElementById('climate').value,
    environment:  document.getElementById('environment').value,
    goals:        Array.from(selectedGoals),
  };
}

/* ── Live panel update ── */
function updateLivePanel() {
  const inp   = getLiveInputs();
  const risk  = computeRiskIndex(inp);
  const score = computeProfileScore(inp);

  document.getElementById('lv-sleep').textContent    = inp.sleepHours + 'h / ' + cap(inp.sleepQuality);
  document.getElementById('lv-stress').textContent   = cap(inp.stress);
  document.getElementById('lv-work').textContent     = cap(inp.work);
  document.getElementById('lv-activity').textContent = cap(inp.activity);
  document.getElementById('lv-injury').textContent   = cap(inp.injury);
  document.getElementById('lv-climate').textContent  = cap(inp.climate);
  document.getElementById('lv-env').textContent      = cap(inp.environment);
  document.getElementById('lv-goals').textContent    = inp.goals.map(cap).join(', ');

  // Risk — colour-code
  const riskEl = document.getElementById('lv-risk');
  riskEl.textContent = risk + '/10';
  riskEl.className   = 'v ' + (risk >= 7 ? 'neg' : risk >= 4 ? '' : 'hi');

  document.getElementById('lv-score').textContent = score + '/100';

  // Predicted augmentation panel
  const vp = deriveVisualProps(inp, runAIEngine(inp).selected);

  const partLabels = { arm:'ARM', hand:'HAND', leg:'LEG', foot:'FOOT', spine:'SPINE', eye:'OCULAR' };
  document.getElementById('lv-part').textContent    = partLabels[vp.bodyPart] || vp.bodyPart.toUpperCase();
  document.getElementById('lv-armor').textContent   = ['Minimal','Standard','Reinforced','Heavy Plating'][vp.armorLevel] || vp.armorLevel;
  document.getElementById('lv-neural').textContent  = ['None','Low','Medium','Dense'][vp.neuralDense] || vp.neuralDense;
  document.getElementById('lv-thermal').textContent = vp.thermalMode === 'none' ? 'Passive' : cap(vp.thermalMode);
  document.getElementById('lv-panel').textContent   = cap(vp.panelStyle);

  const accentMap = {
    longevity:'#3df0ff', strength:'#ffc14a', focus:'#3df0ff',
    aesthetics:'#d97aff', recovery:'#3dffb2', endurance:'#ff8a4a',
    stealth:'#8899bb', sensory:'#d97aff'
  };
  const accent = accentMap[inp.goals[0]] || '#3df0ff';
  document.getElementById('lv-accent-swatch').style.background = accent;
  document.getElementById('lv-accent-swatch').style.boxShadow  = `0 0 8px ${accent}`;
  document.getElementById('lv-accent-val').textContent         = accent;
}

/* ── Slider label ── */
document.getElementById('sleepHours').addEventListener('input', e => {
  document.getElementById('sleepHoursVal').textContent = e.target.value + 'h';
  updateLivePanel();
});

['sleepQuality','stressLevel','workType','activityLevel','injuryHistory','climate','environment']
  .forEach(id => document.getElementById(id)?.addEventListener('change', updateLivePanel));

updateLivePanel();

/* ── Processing animation ── */
function runProcessingAnimation(cb) {
  const ps = document.getElementById('processingState');
  ps.classList.add('visible');
  const rows = document.querySelectorAll('[id^="prow-"]');
  rows.forEach(r => r.classList.remove('done','active'));
  let i = 0;
  const step = () => {
    if (i > 0) rows[i-1].classList.replace('active','done');
    if (i < rows.length) {
      rows[i].classList.add('active');
      i++;
      setTimeout(step, 280 + Math.random() * 180);
    } else {
      setTimeout(() => { ps.classList.remove('visible'); cb(); }, 300);
    }
  };
  setTimeout(step, 100);
}

/* ── Run button → save to localStorage → redirect ── */
document.getElementById('runDiagBtn').addEventListener('click', () => {
  const inp = getLiveInputs();

  // Disable button during run
  const btn = document.getElementById('runDiagBtn');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'ANALYZING…';

  runProcessingAnimation(() => {
    const result = runAIEngine(inp);

    // Persist everything results.html needs
    localStorage.setItem('aas_result',  JSON.stringify(result));
    localStorage.setItem('aas_inputs',  JSON.stringify(inp));
    localStorage.setItem('aas_timestamp', Date.now());

    // Small delay so the user sees the final "done" state before redirect
    setTimeout(() => {
      window.location.href = 'results.html';
    }, 400);
  });
});