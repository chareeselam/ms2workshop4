/* ============================================================
   CORTEX — Cognitive Load Intelligence System
   app.js
   ============================================================
   All modeling logic is deterministic and fully commented.
   No build step required — runs directly via CDN React + Recharts.
   ============================================================ */

'use strict';

const { useState, useMemo, useEffect, useRef } = React;
const { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } = Recharts;


/* ============================================================
   MODELING ENGINE
   All formulas are deterministic. Inputs → outputs, no randomness
   except the fixed sleep-variation offsets in the trend generator.
   ============================================================ */

/**
 * computeRawLoad
 * ──────────────
 * Produces an unbounded cognitive load score from raw inputs.
 *
 * Additive stressors (increase load):
 *   meetings       × 1.2  — meetings are cognitively costly even when passive
 *   contextSwitches × 0.8 — each switch burns re-entry overhead
 *   deadlineIntensity × 5 — high-intensity deadlines dominate load
 *
 * Subtractive factors (reduce load):
 *   deepWorkHours  × 1.5  — focused work is restorative and high-output
 *   sleepHours     × 1.2  — sleep is the primary cognitive recovery mechanism
 *
 * @param {object} inputs
 * @returns {number} raw (unbounded) load value
 */
function computeRawLoad({ meetingHours, contextSwitches, deadlineIntensity, deepWorkHours, sleepHours }) {
  return (meetingHours * 1.2)
       + (contextSwitches * 0.8)
       + (deadlineIntensity * 5)
       - (deepWorkHours * 1.5)
       - (sleepHours * 1.2);
}

// Scale bounds — empirically derived from realistic input extremes:
//   Best case: 0h meetings, 0 switches, 1 intensity, 8h deep, 9h sleep → –24.8
//   Worst case: 12h meetings, 20 switches, 5 intensity, 0h deep, 3h sleep → 54.0
// Fixed scale makes scores comparable across sessions.
const RAW_MIN = -25;
const RAW_MAX = 75;

/**
 * normalizeTo100
 * ──────────────
 * Maps a raw load value onto the 0–100 display scale.
 *
 * @param {number} raw
 * @returns {number} 0–100
 */
function normalizeTo100(raw) {
  return Math.max(0, Math.min(100, ((raw - RAW_MIN) / (RAW_MAX - RAW_MIN)) * 100));
}

/**
 * computeFragmentationIndex
 * ─────────────────────────
 * Measures how fractured the workday is.
 *
 * Base ratio: context switches per hour of deep work.
 * Scaled by meeting density weight — more meetings compound interruption.
 *
 *   meeting_density_weight = 1 + (meetingHours / totalWorkHours)
 *   fragmentation = (contextSwitches / max(deepWorkHours, 1)) × meeting_density_weight
 *
 * Capped at 10 for display. Values > 5 = severe fragmentation.
 *
 * @param {object} inputs
 * @returns {number} 0–10
 */
function computeFragmentationIndex({ contextSwitches, deepWorkHours, meetingHours, totalWorkHours }) {
  const meetingDensityWeight = 1 + (meetingHours / Math.max(totalWorkHours, 1));
  return Math.min(10, (contextSwitches / Math.max(deepWorkHours, 1)) * meetingDensityWeight);
}

/**
 * computeDeepWorkRatio
 * ────────────────────
 * Fraction of total working hours spent in uninterrupted deep focus.
 * Healthy threshold: ≥ 0.35 (35%).
 *
 * @param {object} inputs
 * @returns {number} 0.0–1.0
 */
function computeDeepWorkRatio({ deepWorkHours, totalWorkHours }) {
  return Math.min(1, deepWorkHours / Math.max(totalWorkHours, 1));
}

/**
 * computeBurnoutRisk
 * ──────────────────
 * Composite burnout risk score: 0–100.
 *
 * Three drivers:
 *   1. Cognitive load (50%)  — high load is the primary burnout driver
 *   2. Focus deficit  (25%)  — low deep work ratio = low recovery via flow
 *   3. Sleep deficit  (25%)  — sleep below 9h baseline accumulates debt
 *
 * @param {object} { cognitiveLoad, deepWorkRatio, sleepHours }
 * @returns {number} 0–100
 */
function computeBurnoutRisk({ cognitiveLoad, deepWorkRatio, sleepHours }) {
  const sleepFactor = ((9 - sleepHours) / 9) * 25;
  return Math.max(0, Math.min(100,
    (cognitiveLoad * 0.5) + ((1 - deepWorkRatio) * 25) + sleepFactor
  ));
}

/**
 * generateTrend
 * ─────────────
 * Produces a 7-day burnout + cognitive load simulation.
 *
 * Sun (index 6) = today (live inputs). Mon–Sat = simulated history.
 * Day-of-week multipliers model the typical weekly stress curve:
 *   Mon = gradual start, Thu/Fri = peak load, weekend = partial recovery.
 *
 * Sleep offsets are fixed (not random) so the chart is deterministic
 * and stable across re-renders.
 *
 * meetingReductionPct allows Simulation Mode to project a reduced-meeting week.
 *
 * @param {object} inputs  — live user inputs
 * @param {number} meetingReductionPct  — 0–80
 * @returns {Array} 7 data points: { day, burnout, cogLoad }
 */
function generateTrend(inputs, meetingReductionPct = 0) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Day-of-week stress multipliers
  const multipliers   = [0.65, 0.75, 0.88, 0.95, 1.0, 0.70, 0.60];

  // Fixed sleep micro-variation per day (deterministic, not Math.random)
  const sleepOffsets  = [0.02, -0.03, 0.01, -0.02, 0.03, 0.05, 0.0];

  const adjMeetings = inputs.meetingHours * (1 - meetingReductionPct / 100);

  return days.map((day, i) => {
    const m = multipliers[i];
    const dayInputs = {
      meetingHours:      adjMeetings * m,
      contextSwitches:   inputs.contextSwitches * m,
      // Deadline intensity stays closer to stated value; lighten slightly on easy days
      deadlineIntensity: Math.max(1, inputs.deadlineIntensity * m),
      // Lighter meeting days allow more deep work
      deepWorkHours:     inputs.deepWorkHours * (1 + (1 - m) * 0.35),
      // Sleep varies ±5% around stated value
      sleepHours:        Math.max(4, Math.min(10, inputs.sleepHours * (1 + sleepOffsets[i]))),
      totalWorkHours:    inputs.totalWorkHours,
    };

    const raw     = computeRawLoad(dayInputs);
    const cogLoad = normalizeTo100(raw);
    const dwRatio = computeDeepWorkRatio(dayInputs);
    const burnout = computeBurnoutRisk({ cognitiveLoad: cogLoad, deepWorkRatio: dwRatio, sleepHours: dayInputs.sleepHours });

    return { day, burnout: Math.round(burnout), cogLoad: Math.round(cogLoad) };
  });
}

/**
 * generateInsights
 * ────────────────
 * Returns data-driven insight strings based on live metric values.
 * Every sentence is conditionally triggered and quantitatively grounded —
 * no hardcoded placeholder text.
 *
 * @param {object} metrics
 * @returns {string[]}
 */
function generateInsights({ cognitiveLoad, fragmentationIndex, deepWorkRatio, meetingHours, contextSwitches, totalWorkHours, burnoutRisk, sleepHours }) {
  const insights   = [];
  const meetingPct = Math.round((meetingHours / Math.max(totalWorkHours, 1)) * 100);
  const dwPct      = Math.round(deepWorkRatio * 100);

  // Meeting density threshold: > 40% of work time in meetings
  if (meetingPct > 40) {
    const efficiencyDrop = Math.round((1 - deepWorkRatio) * 100);
    insights.push(
      `Meetings consume ${meetingPct}% of your working hours. At this density, deep work efficiency ` +
      `is reduced by approximately ${efficiencyDrop}%. Each meeting-to-focus transition introduces ` +
      `15–20 minutes of cognitive re-entry overhead.`
    );
  }

  // Fragmentation threshold: index > 3.5
  if (fragmentationIndex > 3.5) {
    const fragDesc       = fragmentationIndex > 6 ? 'critically fragmented' : 'highly fragmented';
    const recoveryMins   = Math.round(contextSwitches * 17); // ~17 min avg re-entry per switch
    const recoveryHours  = Math.round(recoveryMins / 60);
    insights.push(
      `Your workflow is ${fragDesc} (index: ${fragmentationIndex.toFixed(1)}×). ${contextSwitches} daily ` +
      `context switches generate approximately ${recoveryMins} minutes of cognitive recovery overhead — ` +
      `${recoveryHours}h of lost productive capacity.`
    );
  }

  // Deep work threshold: ratio < 30%
  if (deepWorkRatio < 0.30) {
    const needed  = Math.round(totalWorkHours * 0.35);
    const current = Math.round(totalWorkHours * deepWorkRatio);
    const deficit = Math.max(0, needed - current);
    insights.push(
      `Deep work ratio of ${dwPct}% falls below the sustainable threshold of 35%. ` +
      `To reach baseline capacity, you need ${deficit} additional hours of uninterrupted focus ` +
      `within your current ${totalWorkHours}h schedule.`
    );
  }

  // High load threshold: > 68/100
  if (cognitiveLoad > 68) {
    insights.push(
      `Cognitive load of ${Math.round(cognitiveLoad)}/100 is in the high-stress zone. At this level, ` +
      `working memory capacity is impaired — complex reasoning, long-term planning, and creative ` +
      `output are all significantly degraded.`
    );
  }

  // Sleep threshold: < 6.5h
  if (sleepHours < 6.5) {
    const debt = (7.5 - sleepHours).toFixed(1);
    insights.push(
      `Sleep at ${sleepHours}h is ${debt}h below the cognitive performance threshold. Sleep debt ` +
      `compounds across days, amplifying the effect of every other stressor in this model.`
    );
  }

  // Burnout trajectory threshold: > 65
  if (burnoutRisk > 65) {
    insights.push(
      `7-day burnout trajectory is in the elevated zone (${Math.round(burnoutRisk)}/100). The combination ` +
      `of high load, low recovery, and fragmented attention creates non-linear compounding — each ` +
      `additional stressor has outsized impact at this baseline.`
    );
  }

  // Fallback: healthy state
  if (insights.length === 0) {
    insights.push(
      `Your cognitive profile is within sustainable operating range. Deep work ratio of ${dwPct}% ` +
      `supports effective knowledge output, and cognitive load of ${Math.round(cognitiveLoad)}/100 ` +
      `leaves adequate capacity for complex tasks. Protect your current sleep and focus patterns.`
    );
  }

  return insights;
}


/* ============================================================
   HOOKS
   ============================================================ */

/**
 * useAnimatedValue
 * ────────────────
 * Smoothly interpolates a numeric display value toward a target
 * using cubic ease-out. Prevents jarring metric jumps on input change.
 *
 * @param {number} target
 * @param {number} duration  — ms
 * @returns {number} current animated display value
 */
function useAnimatedValue(target, duration) {
  duration = duration || 550;
  const [display, setDisplay] = useState(target);
  const state = useRef({ prev: target, raf: null });

  useEffect(function () {
    var start     = state.current.prev;
    var diff      = target - start;
    var startTime = performance.now();

    function tick(now) {
      var t    = Math.min(1, (now - startTime) / duration);
      var ease = 1 - Math.pow(1 - t, 3); // cubic ease-out
      setDisplay(start + diff * ease);
      if (t < 1) {
        state.current.raf = requestAnimationFrame(tick);
      } else {
        state.current.prev = target;
      }
    }

    if (state.current.raf) cancelAnimationFrame(state.current.raf);
    state.current.raf = requestAnimationFrame(tick);

    return function () {
      if (state.current.raf) cancelAnimationFrame(state.current.raf);
    };
  }, [target, duration]);

  return display;
}


/* ============================================================
   COMPONENTS
   ============================================================ */

/**
 * CognitiveDial
 * ─────────────
 * Large circular SVG arc dial showing cognitive load 0–100.
 * Color shifts: green (< 40) → amber (< 65) → red (≥ 65).
 * Arc and color animate smoothly via useAnimatedValue.
 */
function CognitiveDial(props) {
  var value    = props.value;
  var animated = useAnimatedValue(value);

  var SIZE   = 204;
  var SW     = 10;                        // stroke width
  var R      = (SIZE - SW) / 2;          // radius
  var CIRC   = 2 * Math.PI * R;          // full circumference
  var progress = (animated / 100) * CIRC;

  function getColor(v) {
    if (v < 40) return '#34d399'; // green
    if (v < 65) return '#fbbf24'; // amber
    return '#f87171';             // red
  }
  var color = getColor(animated);
  var label = animated < 40 ? 'Sustainable' : animated < 65 ? 'Elevated' : 'Critical';

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 } },
    // SVG dial
    React.createElement('div', { style: { position: 'relative', width: SIZE, height: SIZE } },
      // Radial glow behind the arc
      React.createElement('div', {
        style: {
          position: 'absolute', inset: SW, borderRadius: '50%',
          background: 'radial-gradient(circle, ' + color + '08 0%, transparent 70%)',
          transition: 'background 0.5s ease',
        }
      }),
      React.createElement('svg', { width: SIZE, height: SIZE, style: { transform: 'rotate(-90deg)' } },
        // Track (background ring)
        React.createElement('circle', {
          cx: SIZE / 2, cy: SIZE / 2, r: R,
          fill: 'none',
          stroke: 'rgba(255,255,255,0.06)',
          strokeWidth: SW,
        }),
        // Progress arc
        React.createElement('circle', {
          cx: SIZE / 2, cy: SIZE / 2, r: R,
          fill: 'none',
          stroke: color,
          strokeWidth: SW,
          strokeDasharray: CIRC,
          strokeDashoffset: CIRC - progress,
          strokeLinecap: 'round',
          style: {
            transition: 'stroke 0.5s ease, stroke-dashoffset 0.6s cubic-bezier(0.34,1.56,0.64,1)',
            filter: 'drop-shadow(0 0 10px ' + color + ')',
          },
        })
      ),
      // Center text
      React.createElement('div', {
        style: {
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }
      },
        React.createElement('span', {
          style: {
            fontSize: '2.8rem', fontFamily: "'DM Mono', monospace",
            color: color, letterSpacing: '-3px', lineHeight: 1,
            transition: 'color 0.5s ease',
          }
        }, Math.round(animated)),
        React.createElement('span', {
          style: { fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', marginTop: 4, textTransform: 'uppercase' }
        }, '/ 100')
      )
    ),
    // Label below dial
    React.createElement('div', { style: { textAlign: 'center' } },
      React.createElement('div', { className: 'section-eyebrow', style: { marginBottom: 2 } }, 'Cognitive Load'),
      React.createElement('div', { style: { fontSize: '0.8rem', color: color, transition: 'color 0.5s ease' } }, label)
    )
  );
}

/**
 * MeterBar
 * ────────
 * Animated horizontal progress bar for index/ratio metrics.
 * Width animates via useAnimatedValue with cubic ease-out.
 */
function MeterBar(props) {
  var label    = props.label;
  var value    = props.value;
  var max      = props.max != null ? props.max : 10;
  var unit     = props.unit != null ? props.unit : '';
  var color    = props.color || '#818cf8';
  var sublabel = props.sublabel;

  var pct      = Math.min(100, (value / max) * 100);
  var animated = useAnimatedValue(pct);
  var displayVal = typeof value === 'number'
    ? (Number.isInteger(value) ? value : value.toFixed(2))
    : value;

  return React.createElement('div', { style: { marginBottom: '1.3rem' } },
    // Label row
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
      React.createElement('span', { style: { fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' } }, label),
      React.createElement('span', { className: 'mono', style: { fontSize: '0.72rem', color: color } }, displayVal + unit)
    ),
    // Track + fill
    React.createElement('div', { style: { height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' } },
      React.createElement('div', {
        style: {
          height: '100%',
          width: animated + '%',
          background: color,
          borderRadius: 99,
          boxShadow: '0 0 8px ' + color + '80',
          transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
        }
      })
    ),
    // Optional sublabel
    sublabel && React.createElement('div', { style: { fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', marginTop: 5 } }, sublabel)
  );
}

/**
 * NumberInput
 * ───────────
 * Step-button numeric input (−/+ buttons around a display cell).
 * Used for hours and count inputs.
 */
function NumberInput(props) {
  var label    = props.label;
  var value    = props.value;
  var min      = props.min != null ? props.min : 0;
  var max      = props.max != null ? props.max : 24;
  var step     = props.step != null ? props.step : 0.5;
  var onChange = props.onChange;
  var unit     = props.unit != null ? props.unit : 'h';

  function decrement() { onChange(Math.max(min, Math.round((value - step) * 10) / 10)); }
  function increment() { onChange(Math.min(max, Math.round((value + step) * 10) / 10)); }

  return React.createElement('div', { style: { marginBottom: '1.1rem' } },
    React.createElement('label', {
      style: { display: 'block', fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }
    }, label),
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
      React.createElement('button', { className: 'btn-step', onClick: decrement }, '−'),
      React.createElement('div', {
        style: {
          flex: 1, textAlign: 'center', fontFamily: "'DM Mono', monospace",
          fontSize: '0.95rem', color: 'rgba(255,255,255,0.8)',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 7, padding: '7px 0',
        }
      }, value + unit),
      React.createElement('button', { className: 'btn-step', onClick: increment }, '+')
    )
  );
}

/**
 * SliderInput
 * ───────────
 * Labelled range slider. Background gradient tracks the value position
 * so the filled track is visually distinct from the empty portion.
 */
function SliderInput(props) {
  var label    = props.label;
  var value    = props.value;
  var min      = props.min != null ? props.min : 1;
  var max      = props.max != null ? props.max : 5;
  var step     = props.step != null ? props.step : 1;
  var onChange = props.onChange;
  var unit     = props.unit != null ? props.unit : '';

  var pct      = ((value - min) / (max - min)) * 100;
  var gradient = 'linear-gradient(to right, #6366f1 ' + pct + '%, rgba(255,255,255,0.08) ' + pct + '%)';

  return React.createElement('div', { style: { marginBottom: '1.2rem' } },
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 7 } },
      React.createElement('label', {
        style: { fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }
      }, label),
      React.createElement('span', { className: 'mono', style: { fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)' } }, value + unit)
    ),
    React.createElement('input', {
      type: 'range', min: min, max: max, step: step, value: value,
      onChange: function (e) { onChange(Number(e.target.value)); },
      style: { background: gradient },
    })
  );
}

/**
 * CustomTooltip
 * ─────────────
 * Styled Recharts tooltip for the burnout trend chart.
 */
function CustomTooltip(props) {
  var active  = props.active;
  var payload = props.payload;
  var label   = props.label;

  if (!active || !payload || !payload.length) return null;

  return React.createElement('div', {
    style: {
      background: 'rgba(7,7,15,0.96)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '8px 14px',
      fontSize: '0.7rem', fontFamily: "'DM Mono', monospace",
    }
  },
    React.createElement('div', { style: { color: 'rgba(255,255,255,0.35)', marginBottom: 5 } }, label),
    payload.map(function (p) {
      return React.createElement('div', { key: p.dataKey, style: { color: p.color, marginBottom: 2 } }, p.name + ': ' + p.value);
    })
  );
}


/* ============================================================
   MAIN APP
   ============================================================ */

function App() {

  /* ── State: user inputs ── */
  var meetingHoursState      = useState(4);
  var deepWorkHoursState     = useState(2);
  var contextSwitchesState   = useState(8);
  var sleepHoursState        = useState(7);
  var deadlineIntensityState = useState(3);
  var energyLevelState       = useState(3);
  var meetingReductionState  = useState(20);
  var showSimState           = useState(false);

  var meetingHours       = meetingHoursState[0];
  var setMeetingHours    = meetingHoursState[1];
  var deepWorkHours      = deepWorkHoursState[0];
  var setDeepWorkHours   = deepWorkHoursState[1];
  var contextSwitches    = contextSwitchesState[0];
  var setContextSwitches = contextSwitchesState[1];
  var sleepHours         = sleepHoursState[0];
  var setSleepHours      = sleepHoursState[1];
  var deadlineIntensity  = deadlineIntensityState[0];
  var setDeadlineIntensity = deadlineIntensityState[1];
  var energyLevel        = energyLevelState[0];
  var setEnergyLevel     = energyLevelState[1];
  var meetingReduction   = meetingReductionState[0];
  var setMeetingReduction = meetingReductionState[1];
  var showSim            = showSimState[0];
  var setShowSim         = showSimState[1];

  // Total working hours: meetings + deep work + 2h overhead (admin, breaks, misc)
  var totalWorkHours = meetingHours + deepWorkHours + 2;

  /* ── Derived metrics (memoized) ── */
  var metrics = useMemo(function () {
    // Apply meeting reduction when simulation is active
    var simMeetingHours = showSim
      ? meetingHours * (1 - meetingReduction / 100)
      : meetingHours;

    var inputs = {
      meetingHours: simMeetingHours,
      contextSwitches: contextSwitches,
      deadlineIntensity: deadlineIntensity,
      deepWorkHours: deepWorkHours,
      sleepHours: sleepHours,
      totalWorkHours: totalWorkHours,
    };

    var raw            = computeRawLoad(inputs);
    var cognitiveLoad  = normalizeTo100(raw);
    var fragmentIdx    = computeFragmentationIndex(inputs);
    var deepWorkRatio  = computeDeepWorkRatio(inputs);
    var burnoutRisk    = computeBurnoutRisk({ cognitiveLoad: cognitiveLoad, deepWorkRatio: deepWorkRatio, sleepHours: sleepHours });

    // Trend uses base inputs (not sim) so history is stable; reduction only projects forward
    var trendData = generateTrend(
      { meetingHours: meetingHours, contextSwitches: contextSwitches, deadlineIntensity: deadlineIntensity, deepWorkHours: deepWorkHours, sleepHours: sleepHours, totalWorkHours: totalWorkHours },
      showSim ? meetingReduction : 0
    );

    var insights = generateInsights({
      cognitiveLoad: cognitiveLoad,
      fragmentationIndex: fragmentIdx,
      deepWorkRatio: deepWorkRatio,
      meetingHours: simMeetingHours,
      contextSwitches: contextSwitches,
      totalWorkHours: totalWorkHours,
      burnoutRisk: burnoutRisk,
      sleepHours: sleepHours,
    });

    return {
      cognitiveLoad:      cognitiveLoad,
      fragmentationIndex: fragmentIdx,
      deepWorkRatio:      deepWorkRatio,
      burnoutRisk:        burnoutRisk,
      trendData:          trendData,
      insights:           insights,
    };
  }, [meetingHours, deepWorkHours, contextSwitches, sleepHours, deadlineIntensity, energyLevel, meetingReduction, showSim, totalWorkHours]);

  // Dynamic colors based on risk thresholds
  var burnoutColor = metrics.burnoutRisk > 65 ? '#f87171' : metrics.burnoutRisk > 40 ? '#fbbf24' : '#34d399';
  var fragColor    = metrics.fragmentationIndex > 5 ? '#f87171' : metrics.fragmentationIndex > 3 ? '#fbbf24' : '#34d399';


  /* ── RENDER ── */

  var h = React.createElement;

  return h('div', { className: 'page-wrapper' },

    /* ── NAV ── */
    h('nav', { className: 'nav' },
      h('div', { className: 'nav-logo' },
        h('div', { className: 'nav-logo-icon' },
          h('div', { className: 'nav-logo-dot' })
        ),
        h('span', { className: 'nav-wordmark' }, 'CORTEX')
      ),
      h('div', { className: 'nav-links' },
        h('span', null, 'System'),
        h('span', null, 'Model'),
        h('span', null, 'Insights')
      ),
      h('div', { className: 'nav-version' }, 'v0.4 · alpha')
    ),

    h('div', { className: 'content-pad' },

      /* ── HERO ── */
      h('div', { className: 'hero' },
        h('div', { className: 'hero-pill fade-up' },
          h('span', { className: 'hero-pill-dot pulse' }),
          h('span', { className: 'hero-pill-label' }, 'Cognitive Systems Modeling')
        ),
        h('h1', { className: 'hero-title fade-up fade-up-1' },
          h('span', { className: 'hero-title-line1' }, 'Model your'),
          h('span', { className: 'hero-title-line2' }, 'cognitive system.')
        ),
        h('p', { className: 'hero-description fade-up fade-up-2' },
          'Cortex quantifies your mental bandwidth through structured daily inputs — calculating cognitive load, fragmentation, and burnout trajectory across a 7-day horizon.'
        )
      ),

      /* ── MAIN GRID ── */
      h('div', { className: 'main-grid fade-up fade-up-3' },

        /* INPUT PANEL */
        h('div', { className: 'card', style: { padding: '26px 22px' } },
          h('div', { style: { marginBottom: 22 } },
            h('div', { className: 'section-eyebrow', style: { marginBottom: 3 } }, 'Daily Inputs'),
            h('div', { className: 'section-subtitle' }, 'Configure your workday profile')
          ),

          // Hours + switches (step buttons)
          h('div', { style: { borderBottom: '1px solid rgba(255,255,255,0.055)', marginBottom: 20, paddingBottom: 20 } },
            h(NumberInput, { label: 'Meeting hours',    value: meetingHours,    min: 0,  max: 12, step: 0.5, onChange: setMeetingHours }),
            h(NumberInput, { label: 'Deep work hours',  value: deepWorkHours,   min: 0,  max: 12, step: 0.5, onChange: setDeepWorkHours }),
            h(NumberInput, { label: 'Context switches', value: contextSwitches, min: 0,  max: 30, step: 1,   onChange: setContextSwitches, unit: '×' }),
            h(NumberInput, { label: 'Sleep hours',      value: sleepHours,      min: 3,  max: 12, step: 0.5, onChange: setSleepHours })
          ),

          // Sliders
          h(SliderInput, { label: 'Deadline intensity', value: deadlineIntensity, min: 1, max: 5, onChange: setDeadlineIntensity }),
          h(SliderInput, { label: 'Energy level',       value: energyLevel,       min: 1, max: 5, onChange: setEnergyLevel }),

          // Total hours readout
          h('div', {
            style: {
              marginTop: 18, padding: '12px 14px',
              background: 'rgba(99,102,241,0.06)',
              border: '1px solid rgba(99,102,241,0.14)',
              borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }
          },
            h('span', { className: 'section-eyebrow', style: { color: 'rgba(165,180,252,0.5)' } }, 'Total Work Hours'),
            h('span', { className: 'mono', style: { fontSize: '1rem', color: '#a5b4fc' } }, totalWorkHours + 'h')
          )
        ),

        /* RIGHT COLUMN */
        h('div', { className: 'right-col' },

          // Dial + meters row
          h('div', { className: 'metrics-row' },

            // Cognitive Load Dial card
            h('div', {
              className: 'card',
              style: { padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }
            },
              h(CognitiveDial, { value: metrics.cognitiveLoad })
            ),

            // System Indices card
            h('div', {
              className: 'card',
              style: { padding: '26px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }
            },
              h('div', { className: 'section-eyebrow', style: { marginBottom: 22 } }, 'System Indices'),
              h(MeterBar, {
                label: 'Fragmentation Index',
                value: parseFloat(metrics.fragmentationIndex.toFixed(2)),
                max: 10,
                color: fragColor,
                sublabel: contextSwitches + ' switches / ' + Math.max(1, deepWorkHours) + 'h deep work',
              }),
              h(MeterBar, {
                label: 'Deep Work Ratio',
                value: parseFloat(metrics.deepWorkRatio.toFixed(2)),
                max: 1,
                color: '#818cf8',
                sublabel: Math.round(metrics.deepWorkRatio * 100) + '% of working hours in deep focus',
              }),
              h(MeterBar, {
                label: '7-Day Burnout Risk',
                value: parseFloat(metrics.burnoutRisk.toFixed(1)),
                max: 100,
                color: burnoutColor,
                sublabel: (metrics.burnoutRisk < 40 ? 'Low' : metrics.burnoutRisk < 65 ? 'Moderate' : 'High') + ' risk trajectory',
              })
            )
          ),

          // Burnout Trend Chart card
          h('div', { className: 'card', style: { padding: '24px 20px 14px' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 } },
              h('div', null,
                h('div', { className: 'section-eyebrow', style: { marginBottom: 3 } }, 'Burnout Risk Forecast'),
                h('div', { className: 'section-subtitle' }, '7-day rolling simulation')
              ),
              h('div', {
                style: { display: 'flex', gap: 18, fontSize: '0.65rem', fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.25)', alignItems: 'center' }
              },
                h('span', { style: { color: '#f87171' } }, '— burnout risk'),
                h('span', { style: { color: '#5b5fef' } }, '— cog. load')
              )
            ),
            h(ResponsiveContainer, { width: '100%', height: 150 },
              h(LineChart, { data: metrics.trendData, margin: { top: 5, right: 10, left: -24, bottom: 0 } },
                h(XAxis, {
                  dataKey: 'day',
                  tick: { fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: "'DM Mono', monospace" },
                  axisLine: false, tickLine: false,
                }),
                h(YAxis, {
                  tick: { fontSize: 10, fill: 'rgba(255,255,255,0.2)', fontFamily: "'DM Mono', monospace" },
                  axisLine: false, tickLine: false, domain: [0, 100],
                }),
                h(Tooltip, { content: h(CustomTooltip, null) }),
                h(ReferenceLine, { y: 65, stroke: 'rgba(248,113,113,0.18)', strokeDasharray: '3 3' }),
                h(Line, {
                  type: 'monotone', dataKey: 'burnout', name: 'Burnout Risk',
                  stroke: '#f87171', strokeWidth: 2, dot: false,
                  style: { filter: 'drop-shadow(0 0 4px rgba(248,113,113,0.5))' },
                }),
                h(Line, {
                  type: 'monotone', dataKey: 'cogLoad', name: 'Cog. Load',
                  stroke: '#5b5fef', strokeWidth: 1.5, dot: false, strokeOpacity: 0.65,
                })
              )
            )
          )
        ) // end right-col
      ), // end main-grid

      /* ── SIMULATION MODE ── */
      h('div', { className: 'card fade-up fade-up-4', style: { padding: '24px', marginBottom: 14 } },
        h('div', {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: showSim ? 24 : 0 }
        },
          h('div', null,
            h('div', { className: 'section-eyebrow', style: { marginBottom: 4 } }, 'Simulation Mode'),
            h('div', { className: 'section-subtitle' }, 'Project the impact of reducing meeting load')
          ),
          h('button', {
            className: 'sim-toggle' + (showSim ? ' active' : ''),
            onClick: function () { setShowSim(function (v) { return !v; }); },
          }, showSim ? 'Exit Simulation' : 'Run Simulation')
        ),

        showSim && h('div', { className: 'sim-row' },
          // Slider + arrow readout
          h('div', null,
            h(SliderInput, {
              label: 'Reduce meetings by',
              value: meetingReduction, min: 0, max: 80, step: 5,
              onChange: setMeetingReduction, unit: '%',
            }),
            h('div', {
              className: 'mono',
              style: { fontSize: '0.68rem', color: 'rgba(255,255,255,0.22)', marginTop: 6 }
            }, meetingHours + 'h → ' + (meetingHours * (1 - meetingReduction / 100)).toFixed(1) + 'h meeting hours')
          ),
          // Projected Load tile
          h('div', {
            style: {
              padding: '18px 16px', background: 'rgba(99,102,241,0.07)', borderRadius: 12,
              border: '1px solid rgba(99,102,241,0.14)', textAlign: 'center',
            }
          },
            h('div', { style: { fontSize: '0.6rem', color: 'rgba(165,180,252,0.45)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 } }, 'Projected Load'),
            h('div', { className: 'mono', style: { fontSize: '2.2rem', color: '#a5b4fc', lineHeight: 1 } }, Math.round(metrics.cognitiveLoad)),
            h('div', { style: { fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', marginTop: 4 } }, '/ 100')
          ),
          // Projected Burnout tile
          h('div', {
            style: {
              padding: '18px 16px', background: 'rgba(52,211,153,0.04)', borderRadius: 12,
              border: '1px solid ' + burnoutColor + '22', textAlign: 'center',
            }
          },
            h('div', { style: { fontSize: '0.6rem', color: burnoutColor + '80', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 } }, 'Burnout Risk'),
            h('div', { className: 'mono', style: { fontSize: '2.2rem', color: burnoutColor, lineHeight: 1 } }, Math.round(metrics.burnoutRisk)),
            h('div', { style: { fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', marginTop: 4 } }, '7-day')
          )
        )
      ),

      /* ── PATTERN ANALYSIS ── */
      h('div', { className: 'card', style: { padding: '28px 26px' } },
        h('div', { style: { marginBottom: 22 } },
          h('div', { className: 'section-eyebrow', style: { marginBottom: 4 } }, 'Pattern Analysis'),
          h('div', { className: 'section-subtitle' }, 'Derived from your current cognitive profile — not generic advice')
        ),

        // Insight cards
        h('div', { style: { display: 'grid', gap: 12, marginBottom: 20 } },
          metrics.insights.map(function (insight, i) {
            return h('div', {
              key: i,
              style: {
                display: 'flex', gap: 16, padding: '16px 18px',
                background: 'rgba(255,255,255,0.02)', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.055)',
              }
            },
              // Index badge
              h('div', { style: { flexShrink: 0, marginTop: 2 } },
                h('div', {
                  style: {
                    width: 22, height: 22, borderRadius: 6,
                    background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.22)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }
                },
                  h('span', { className: 'mono', style: { fontSize: '0.6rem', color: '#818cf8' } }, '0' + (i + 1))
                )
              ),
              // Insight text
              h('p', { style: { fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, fontWeight: 300 } }, insight)
            );
          })
        ),

        // Metric snapshot chips
        h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
          [
            { label: 'CL Score',     value: Math.round(metrics.cognitiveLoad) + '/100' },
            { label: 'Frag Index',   value: metrics.fragmentationIndex.toFixed(2) },
            { label: 'DW Ratio',     value: Math.round(metrics.deepWorkRatio * 100) + '%' },
            { label: 'Burnout Risk', value: Math.round(metrics.burnoutRisk) + '/100' },
            { label: 'Total Hours',  value: totalWorkHours + 'h' },
          ].map(function (m) {
            return h('div', { key: m.label, className: 'metric-chip' },
              h('span', { style: { fontSize: '0.6rem', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '0.08em' } }, m.label),
              h('span', { className: 'mono', style: { fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)' } }, m.value)
            );
          })
        )
      ),

      /* ── FOOTER ── */
      h('div', { className: 'footer' },
        'CORTEX · COGNITIVE LOAD INTELLIGENCE SYSTEM · ALL COMPUTATIONS DETERMINISTIC AND CLIENT-SIDE'
      )

    ) // end content-pad
  ); // end page-wrapper
}


/* ── MOUNT ── */
var root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App, null));
