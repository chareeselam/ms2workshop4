/* ════════════════════════════════════════════════
   results.js — results page logic
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

/* ── Load saved data ── */
let savedResult = null;
let savedInputs = null;

try {
  savedResult = JSON.parse(localStorage.getItem('aas_result'));
  savedInputs = JSON.parse(localStorage.getItem('aas_inputs'));
} catch (e) {
  savedResult = null;
  savedInputs = null;
}

/* ── Show empty state or render ── */
const emptyState  = document.getElementById('emptyState');
const resultsMain = document.getElementById('resultsMain');

if (!savedResult || !savedInputs) {
  emptyState.style.display  = 'flex';
  resultsMain.style.display = 'none';
} else {
  emptyState.style.display  = 'none';
  resultsMain.style.display = 'block';
  renderAll(savedResult, savedInputs);
}

/* ── Main render function ── */
function renderAll(result, inp) {
  const { selected, reasoning, stats, buildName, accent } = result;

  /* Header */
  document.getElementById('configName').textContent   = buildName;
  document.getElementById('resultBadge1').textContent = (inp.goals[0] || 'longevity').toUpperCase();
  document.getElementById('resultBadge2').textContent = cap(inp.work);

  /* SVG */
  document.getElementById('svgWrap').innerHTML = generateSVG(selected, accent, inp);

  /* Stats bars — set text immediately, animate width after paint */
  const statPairs = [
    ['stat-neural',  'bar-neural',  stats.neural],
    ['stat-stab',    'bar-stab',    stats.stab],
    ['stat-thermal', 'bar-thermal', stats.thermal],
    ['stat-score',   'bar-score',   stats.score],
  ];
  statPairs.forEach(([textId, barId, val]) => {
    const textEl = document.getElementById(textId);
    if (textEl) textEl.textContent = '+' + val + '%';
  });
  requestAnimationFrame(() => setTimeout(() => {
    statPairs.forEach(([, barId, val]) => {
      const barEl = document.getElementById(barId);
      if (barEl) barEl.style.width = Math.min(val, 100) + '%';
    });
  }, 80));

  /* Module breakdown */
  document.getElementById('modulesBreakdown').innerHTML = selected.map(key => {
    const m = MODULES[key];
    const dotClass = m.color === 'amber' ? 'amber' : m.color === 'green' ? 'green' : '';
    return `<div class="module-row">
      <div class="module-dot ${dotClass}"></div>
      <div class="module-info">
        <div class="module-name">${m.name}</div>
        <div class="module-desc">${m.desc}</div>
      </div>
      <span class="module-tag">${m.tag}</span>
    </div>`;
  }).join('');

  /* Reasoning log */
  document.getElementById('reasoningLog').innerHTML =
    reasoning.map(r => `<div class="reasoning-line">${r}</div>`).join('');

  /* Input summary */
  const summaryRows = [
    ['Sleep',       inp.sleepHours + 'h / ' + cap(inp.sleepQuality)],
    ['Stress',      cap(inp.stress)],
    ['Work type',   cap(inp.work)],
    ['Activity',    cap(inp.activity)],
    ['Injury',      cap(inp.injury)],
    ['Climate',     cap(inp.climate)],
    ['Environment', cap(inp.environment)],
    ['Goals',       inp.goals.map(cap).join(', ')],
    ['Risk index',  computeRiskIndex(inp) + '/10'],
    ['Profile score', computeProfileScore(inp) + '/100'],
  ];
  document.getElementById('inputSummaryContent').innerHTML =
    summaryRows.map(([k, v]) =>
      `<div class="live-item"><span class="k">${k}</span><span class="v">${v}</span></div>`
    ).join('');

  /* Timestamp */
  const ts = localStorage.getItem('aas_timestamp');
  if (ts) {
    const d = new Date(parseInt(ts));
    const label = d.toLocaleString();
    const tsEl = document.getElementById('runTimestamp');
    if (tsEl) tsEl.textContent = 'Generated ' + label;
  }

  /* Override grid */
  renderOverrideGrid(selected);
  updateOverrideStats();
}

/* ── Override grid ── */
function renderOverrideGrid(selected) {
  document.getElementById('overrideGrid').innerHTML =
    Object.entries(MODULES).map(([key, m]) => {
      const active = selected.includes(key);
      const delta  = m.statBonus.neural + m.statBonus.stab + m.statBonus.thermal;
      return `<div class="override-module ${active ? 'selected' : ''}" data-key="${key}" onclick="toggleOverride(this)">
        <div class="om-header">
          <div class="om-name">${m.name}</div>
          <div class="om-check"></div>
        </div>
        <div class="om-stat">${m.tag} — ${m.desc.substring(0,42)}…</div>
        <div class="om-delta">${delta >= 0 ? '+' : ''}${delta} combined delta</div>
      </div>`;
    }).join('');
}

function toggleOverride(el) {
  el.classList.toggle('selected');
  updateOverrideStats();
}

function updateOverrideStats() {
  const active = Array.from(document.querySelectorAll('.override-module.selected'))
    .map(el => MODULES[el.dataset.key]).filter(Boolean);

  const score = active.reduce((s, m) => s + m.statBonus.score, 0);
  const stab  = active.reduce((s, m) => s + m.statBonus.stab,  0);

  document.getElementById('ov-score').textContent = '+' + score + '%';
  document.getElementById('ov-stab').textContent  = '+' + stab  + '%';
  requestAnimationFrame(() => setTimeout(() => {
    document.getElementById('ov-bar-score').style.width = Math.min(score, 100) + '%';
    document.getElementById('ov-bar-stab').style.width  = Math.min(stab,  100) + '%';
  }, 50));
}