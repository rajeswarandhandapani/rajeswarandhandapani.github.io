// Screens. Totals and date rules are in logic.js, and the plan itself is in plan.js.

import * as store from './store.js';
import { h, select, toast, confirmIt, download, longDate, shortDate, dayLetter, dayName } from './ui.js';
import { startRest, stopRest } from './timer.js';
import { weeklyBars, lineChart } from './charts.js';
import { exerciseArt } from './art.js';
import {
  CARDIO_GOAL, CARDIO_NOTES, CARDIO_TYPES, CHECK_FIRST, CUSTOM_KINDS, EXERCISES, FOLLOW_UP, FOOD_NOTES, GYM_NOTES, GYM_PER_WEEK, HEART_RATE, MOVES,
  MAX_SETS, PHASES, ROUTINES, SAFETY, SCHEDULE, SCHEDULE_ORDER, WEEKS, alternatesOf, cardioName, customMove, lookupMove, phaseOf, target,
} from './plan.js';
import {
  addDays, cardioOf, cleanSettings, dayExerciseIds, exerciseHistory, fromIso, isEmptyDay, lastCardio, lastPerformance, localToday, makeBackup, mondayOf,
  moderateMinutes, nextMonday, num, parseBackup, programRows, programTotals, programWeek, readyToIncrease, setCountFor, setsDone, statusOf, weekDates, weekSummary, weekdayOf,
} from './logic.js';

const main = document.querySelector('#main');
// `routine` is the list of exercise ids for gym days. Null means the plan's own list.
const DEFAULTS = { startDate: null, rest: 90, beep: true, routine: null, custom: [] };
const S = {
  view: 'today',
  today: localToday(),
  date: localToday(),
  days: {},
  settings: { ...DEFAULTS },
  adding: {},
  exercise: EXERCISES[0].id,
  lastBackup: null,
};

const getDay = date => (S.days[date] ||= { date });
const statusFor = date => statusOf(S.days[date], date, { today: S.today, start: S.settings.startDate });
const STATUS_WORD = { gym: 'gym workout', cardio: 'cardio', both: 'gym and cardio', rest: 'rest day', missed: 'missed', future: 'upcoming', open: 'nothing logged' };

let askedToPersist = false;
async function saveDay(day) {
  if (!askedToPersist) {
    askedToPersist = true;
    // Asks the browser not to clear this site's data when the device runs low on space.
    navigator.storage?.persist?.().catch(() => {});
  }
  try {
    if (isEmptyDay(day)) await store.deleteDay(day.date);
    else await store.putDay(day);
  } catch {
    toast('That could not be saved. Check the storage space on this device.');
  }
}

async function saveSettings() {
  await store.setKv('settings', S.settings);
}

/* ---------- Shared pieces ---------- */

function cell(date, { selected = false } = {}) {
  const status = statusFor(date);
  const inner = status === 'both' ? [h('span', { class: 'g' }, 'G'), h('span', { class: 'c' }, 'C')]
    : { gym: 'G', cardio: 'C', rest: 'R', missed: '–' }[status] || '';
  return h('button', {
    class: `cell${date === S.today ? ' is-today' : ''}${selected ? ' selected' : ''}`,
    type: 'button',
    'data-s': status,
    'data-date': date,
    disabled: date > S.today,
    'aria-label': `${dayName(date)}: ${STATUS_WORD[status]}`,
    onclick: () => openDate(date),
  }, inner);
}

function openDate(date) {
  S.date = date;
  S.view = 'today';
  render({ top: true });
}

function meter(value, goal) {
  const fill = h('i');
  fill.style.width = `${Math.min(100, (value / goal) * 100)}%`;
  return h('div', { class: 'meter', role: 'progressbar', 'aria-valuenow': value, 'aria-valuemin': 0, 'aria-valuemax': goal }, fill);
}

function weekBlock(date) {
  const monday = mondayOf(date);
  const sum = weekSummary(S.days, monday);
  return h('div', { class: 'week-block' },
    h('div', { class: 'strip' }, weekDates(monday).map(d => h('div', { class: 'strip-day' },
      h('span', { class: 'muted small-text' }, dayLetter(d)),
      cell(d, { selected: d === date })))),
    h('div', { class: 'tiles' },
      h('div', { class: 'tile' },
        h('span', { class: 'muted' }, 'Cardio this week'),
        h('b', { 'data-testid': 'week-cardio' }, `${sum.cardio} of ${CARDIO_GOAL} min`),
        meter(sum.cardio, CARDIO_GOAL)),
      h('div', { class: 'tile' },
        h('span', { class: 'muted' }, 'Gym this week'),
        h('b', { 'data-testid': 'week-gym' }, `${sum.gym} of ${GYM_PER_WEEK} visits`),
        meter(sum.gym, GYM_PER_WEEK))));
}

let weekEl;
function refreshWeek() {
  if (!weekEl?.isConnected) return;
  const next = weekBlock(S.date);
  weekEl.replaceWith(next);
  weekEl = next;
}

const safetyLine = () => h('p', { class: 'safety' }, SAFETY);

/* ---------- Today ---------- */

function setupView() {
  const input = h('input', { type: 'date', value: nextMonday(S.today), 'aria-label': 'Plan start date' });
  return [
    h('h1', {}, 'Start your 12 weeks'),
    h('section', { class: 'card stack' },
      h('p', {}, 'Three gym days, three cardio days and one rest day each week, with your weights and minutes saved as you go.'),
      h('label', { class: 'field' }, h('span', {}, 'Week 1 starts'), input),
      h('p', { class: 'muted' }, 'Weeks run Monday to Sunday. Your logs stay on this device.'),
      h('button', { class: 'primary', type: 'button', onclick: async () => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input.value)) { toast('Choose a start date first.'); return; }
        S.settings.startDate = input.value;
        await saveSettings();
        render({ top: true });
      } }, 'Start the plan')),
    h('section', { class: 'card stack safety-card' }, h('h2', {}, 'Before you begin'), h('p', {}, CHECK_FIRST), h('p', {}, SAFETY)),
  ];
}

function weekLine(date) {
  const { startDate } = S.settings;
  if (date < startDate) return `The plan starts ${shortDate(startDate)}`;
  const week = programWeek(date, startDate);
  if (week > WEEKS) return `Week ${week}. The 12 weeks are done, so keep the routine going`;
  return `Week ${week} of ${WEEKS}: ${phaseOf(week).name}`;
}

function dateHeader(date) {
  const move = n => () => { S.date = addDays(date, n); render({ top: true }); };
  return h('div', { class: 'date-head' },
    h('button', { class: 'ghost icon', type: 'button', 'aria-label': 'Previous day', onclick: move(-1) }, '‹'),
    h('div', { class: 'date-title' },
      h('h1', {}, date === S.today ? `Today, ${shortDate(date)}` : longDate(date)),
      h('p', { class: 'muted' }, weekLine(date))),
    h('button', { class: 'ghost icon', type: 'button', 'aria-label': 'Next day', disabled: date >= S.today, onclick: move(1) }, '›'));
}

function planCard(date, day) {
  const plan = SCHEDULE[weekdayOf(date)];
  const done = (plan.kind === 'gym' && setsDone(day) > 0) || (plan.kind === 'cardio' && cardioOf(day).length > 0)
    || (plan.kind === 'rest' && (day.rest || cardioOf(day).length > 0));
  return h('section', { class: 'plan-line' },
    h('div', {},
      h('span', { class: 'muted small-text' }, date === S.today ? 'Planned today' : 'Planned'),
      h('h2', {}, plan.title)),
    h('div', { class: 'plan-side' }, done ? h('span', { class: 'badge' }, 'Done') : h('span', { class: 'muted' }, plan.time)));
}

function setRow(day, ex, i, last, rows, afterChange) {
  const saved = day.gym?.sets?.[ex.id]?.[i];
  const prior = last?.sets[i] ?? last?.sets[last.sets.length - 1];
  const name = `${ex.name} set ${i + 1}`;
  const weight = ex.weighted ? h('input', { type: 'number', inputmode: 'decimal', min: 0, step: 'any', 'aria-label': `${name} weight in pounds`, value: saved?.weight ?? prior?.weight ?? '' }) : null;
  const value = h('input', { type: 'number', inputmode: 'numeric', min: 0, step: 1, 'aria-label': `${name} ${ex.unit === 'sec' ? 'seconds' : 'reps'}`, value: saved?.value ?? prior?.value ?? ex.low });
  let done = saved?.done === true;

  function write() {
    day.gym ||= {};
    day.gym.sets ||= {};
    const list = (day.gym.sets[ex.id] ||= []);
    for (let k = 0; k < i; k++) list[k] ||= { weight: null, value: null, done: false };
    list[i] = { weight: ex.weighted ? num(weight.value) : null, value: num(value.value), done };
  }

  function need(input, message) { toast(message); input.focus(); }

  function toggle() {
    if (!done) {
      if (ex.weighted && num(weight.value) == null) { need(weight, 'Enter the weight first.'); return; }
      if (num(value.value) == null) { need(value, `Enter the ${ex.unit === 'sec' ? 'seconds' : 'reps'} first.`); return; }
    }
    done = !done;
    row.classList.toggle('done', done);
    tick.setAttribute('aria-pressed', String(done));
    write();
    saveDay(day);
    afterChange();
    if (!done) return;
    if (setsDone(day) === totalSets(day)) {
      stopRest();
      toast('All sets done. Finish with your cool-down and stretches.');
    } else {
      startRest(S.settings.rest, { beep: S.settings.beep });
    }
  }

  const tick = h('button', { class: 'tick', type: 'button', 'aria-pressed': String(done), 'aria-label': `${name} done`, onclick: toggle }, '✓');
  const row = h('div', { class: `set${done ? ' done' : ''}` },
    h('span', { class: 'set-n' }, i + 1), weight || h('span', { class: 'muted set-none' }, '–'), value, tick);

  const later = () => rows.slice(i + 1).filter(r => !r.isDone());
  weight?.addEventListener('input', () => later().forEach(r => { r.weight.value = weight.value; }));
  row.addEventListener('change', () => {
    write();
    later().forEach(r => r.write());
    saveDay(day);
  });
  return { row, weight, isDone: () => done, write };
}

const setText = (ex, s) => (ex.weighted ? `${s.weight} lb × ${s.value}` : `${s.value} ${ex.unit}`);
const findMove = id => lookupMove(S.settings.custom, id);
const allMoves = () => [...MOVES, ...S.settings.custom.map(customMove)];
const routineIds = () => S.settings.routine ?? EXERCISES.map(e => e.id);
const daySlots = day => dayExerciseIds(day, routineIds()).map(findMove).filter(Boolean);
const activeMove = (day, slot) => findMove(day.gym?.swaps?.[slot.id]) || slot;
const totalSets = day => daySlots(day).reduce((n, slot) => {
  const ex = activeMove(day, slot);
  return n + setCountFor(day, ex, lastPerformance(S.days, ex.id, day.date));
}, 0);

/** `slot` is the exercise in the plan. What is actually logged can be one of its alternates. */
function exerciseCard(day, slot, afterChange) {
  const ex = activeMove(day, slot);
  const swapped = ex.id !== slot.id;
  const last = lastPerformance(S.days, ex.id, day.date);
  const rows = [];
  const count = setCountFor(day, ex, last);
  for (let i = 0; i < count; i++) rows.push(setRow(day, ex, i, last, rows, () => { paint(); afterChange(); }));

  function redraw() {
    saveDay(day);
    card.replaceWith(exerciseCard(day, slot, afterChange));
    afterChange();
  }

  function addSet() {
    rows.forEach(r => r.write());
    const list = day.gym.sets[ex.id];
    list[count] = { ...list[count - 1], done: false };
    day.gym.counts ||= {};
    day.gym.counts[ex.id] = count + 1;
    redraw();
  }

  function removeSet() {
    if (rows[count - 1].isDone()) { toast('Untick the last set before removing it.'); return; }
    day.gym ||= {};
    day.gym.counts ||= {};
    day.gym.counts[ex.id] = count - 1;
    if (day.gym.sets?.[ex.id]) day.gym.sets[ex.id].length = Math.min(day.gym.sets[ex.id].length, count - 1);
    redraw();
  }

  function swapTo(move) {
    if (rows.some(r => r.isDone())) { toast('Untick the sets on this exercise before swapping.'); return; }
    day.gym ||= {};
    day.gym.swaps ||= {};
    if (day.gym.sets) delete day.gym.sets[ex.id];
    if (day.gym.counts) delete day.gym.counts[ex.id];
    if (move.id === slot.id) delete day.gym.swaps[slot.id];
    else day.gym.swaps[slot.id] = move.id;
    redraw();
  }

  function removeFrom(scope) {
    const before = { routine: S.settings.routine, gym: structuredClone(day.gym ?? null) };
    day.gym ||= {};
    delete day.gym.sets?.[ex.id];
    delete day.gym.counts?.[ex.id];
    delete day.gym.swaps?.[slot.id];
    day.gym.extra = (day.gym.extra || []).filter(id => id !== slot.id);
    if (scope === 'always') {
      S.settings.routine = routineIds().filter(id => id !== slot.id);
      saveSettings();
    } else if (routineIds().includes(slot.id)) {
      day.gym.skip = [...(day.gym.skip || []), slot.id];
    }
    saveDay(day);
    render();
    toast(scope === 'always' ? `${ex.name} removed from your routine.` : `${ex.name} removed for this day.`, { label: 'Undo', run: () => {
      S.settings.routine = before.routine;
      saveSettings();
      if (before.gym) day.gym = before.gym;
      else delete day.gym;
      saveDay(day);
      render();
    } });
  }

  const inRoutine = routineIds().includes(slot.id);
  const removeBox = h('div', { class: 'remove-box', hidden: true },
    h('span', { class: 'small-text' }, `Remove ${ex.name}?`),
    h('div', { class: 'row' },
      inRoutine && h('button', { class: 'ghost', type: 'button', onclick: () => removeFrom('today') }, 'Today only'),
      h('button', { class: 'ghost', type: 'button', onclick: () => removeFrom('always') }, inRoutine ? 'Every workout' : 'Remove'),
      h('button', { class: 'link', type: 'button', onclick: () => { removeBox.hidden = true; } }, 'Cancel')));
  const removeButton = h('button', { class: 'link remove-ex', type: 'button', 'aria-label': `Remove ${ex.name}`, onclick: () => {
    if (rows.some(r => r.isDone())) { toast('Untick this exercise’s sets before removing it.'); return; }
    removeBox.hidden = !removeBox.hidden;
  } }, 'Remove');

  const taken = daySlots(day).map(s => activeMove(day, s).id);
  const choices = alternatesOf(slot).length ? [slot, ...alternatesOf(slot)].filter(m => m.id !== ex.id && !taken.includes(m.id)) : [];
  const swapList = choices.length ? h('div', { class: 'swap-list', hidden: true },
    choices.map(m => h('button', { class: 'swap-option', type: 'button', onclick: () => swapTo(m) },
      exerciseArt(m.id, { thumb: true }),
      h('span', { class: 'swap-text' },
        h('strong', {}, m.id === slot.id ? `${m.name} (planned)` : m.name),
        m.how && h('span', { class: 'muted small-text' }, m.how))))) : null;
  const swapButton = choices.length ? h('button', { class: 'link swap-btn', type: 'button', 'aria-label': `Swap ${ex.name}`, onclick: () => { swapList.hidden = !swapList.hidden; } }, swapped ? 'Change' : 'Machine taken? Swap') : null;

  const thumb = exerciseArt(ex.id, { thumb: true });
  const artView = thumb ? h('div', { hidden: true }, exerciseArt(ex.id, { name: ex.name })) : null;
  const artButton = thumb ? h('button', { class: 'art-thumb', type: 'button', 'aria-expanded': 'false', 'aria-label': `Show how to do ${ex.name}`, onclick: () => {
    artView.hidden = !artView.hidden;
    artButton.setAttribute('aria-expanded', String(!artView.hidden));
  } }, thumb) : null;

  const card = h('article', { class: 'exercise', 'data-exercise': slot.id },
    h('div', { class: 'ex-head' },
      artButton,
      h('div', { class: 'ex-title' }, h('h3', {}, ex.name), h('p', { class: 'muted small-text' }, swapped ? `Instead of ${slot.name}` : ex.focus)),
      h('span', { class: 'target' }, target(ex))),
    artView,
    ex.how && h('p', { class: 'muted small-text' }, ex.how),
    h('div', { class: 'card-tools' }, swapButton, removeButton),
    swapList,
    removeBox,
    last && h('p', { class: 'muted small-text last-time' }, `Last, ${shortDate(last.date)}: ${last.sets.map(s => setText(ex, s)).join(', ')}`),
    readyToIncrease(last, ex) && h('p', { class: 'hint' }, 'You reached the top of the range. If every rep felt controlled, try a small increase.'),
    h('div', { class: 'set head muted small-text', 'aria-hidden': 'true' },
      h('span', {}, 'Set'), h('span', {}, ex.weighted ? 'lb' : ''), h('span', {}, ex.unit), h('span', {})),
    rows.map(r => r.row),
    h('div', { class: 'set-actions' },
      h('button', { class: 'ghost', type: 'button', 'aria-label': `Add set to ${ex.name}`, disabled: count >= MAX_SETS, onclick: addSet }, '+ Add set'),
      count > ex.sets && h('button', { class: 'link', type: 'button', 'aria-label': `Remove last set from ${ex.name}`, onclick: removeSet }, 'Remove set')));
  function paint() { card.classList.toggle('complete', rows.every(r => r.isDone())); }
  paint();
  return card;
}

function gymCard(day) {
  const counter = h('span', { class: 'muted', 'data-testid': 'set-count' });
  const update = () => { counter.textContent = `${setsDone(day)} of ${totalSets(day)} sets`; };
  update();
  return h('section', { class: 'card stack' },
    h('div', { class: 'row between' }, h('h2', {}, 'Gym workout'), counter),
    daySlots(day).length === 0 && h('p', { class: 'muted' }, 'No exercises for this day. Add one below.'),
    daySlots(day).map(ex => exerciseCard(day, ex, () => { update(); refreshWeek(); })),
    addExercisePanel(day),
    h('p', { class: 'muted small-text' }, 'Use weights that leave about 2–3 good reps in reserve. Ask gym staff to check your form on anything new.'));
}

function addExercisePanel(day) {
  const used = new Set(daySlots(day).flatMap(s => [s.id, activeMove(day, s).id]));
  const available = allMoves().filter(m => !used.has(m.id));
  const group = (label, moves) => moves.length > 0 && h('optgroup', { label }, moves.map(m => h('option', { value: m.id }, m.name)));
  const picker = h('select', { 'aria-label': 'Exercise to add' },
    group('From the plan', available.filter(m => !m.slot && !m.custom)),
    group('Alternates', available.filter(m => m.slot)),
    group('Your exercises', available.filter(m => m.custom)));
  const scope = select('Add to', 'always', [['always', 'Every workout'], ['today', 'Today only']], () => {});
  const name = h('input', { type: 'text', maxlength: 60, placeholder: 'For example, cable crunch', 'aria-label': 'New exercise name' });
  const kind = select('New exercise type', 'weight', CUSTOM_KINDS, () => {});

  function addToDay(id) {
    const routine = routineIds();
    day.gym ||= {};
    const unskip = () => { day.gym.skip = (day.gym.skip || []).filter(x => x !== id); };
    if (scope.value === 'always') {
      unskip();
      if (!routine.includes(id)) { S.settings.routine = [...routine, id]; saveSettings(); }
    } else if (routine.includes(id)) {
      unskip();
    } else {
      day.gym.extra = [...(day.gym.extra || []), id];
    }
    saveDay(day);
    render();
    toast(`${findMove(id).name} added.`);
  }

  function create() {
    const title = name.value.trim();
    if (!title) { toast('Enter a name for the exercise.'); name.focus(); return; }
    if (allMoves().some(m => m.name.toLowerCase() === title.toLowerCase())) { toast('That exercise already exists. Choose it from the list.'); return; }
    const id = `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    S.settings.custom = [...S.settings.custom, { id, name: title, kind: kind.value }];
    saveSettings();
    addToDay(id);
  }

  const panel = h('div', { class: 'add-panel stack', hidden: true },
    h('label', { class: 'field' }, h('span', {}, 'Add to'), scope),
    available.length > 0 && h('label', { class: 'field' }, h('span', {}, 'Exercise'), picker),
    available.length > 0 && h('button', { class: 'primary', type: 'button', onclick: () => addToDay(picker.value) }, 'Add'),
    h('h3', { class: 'sub' }, 'Not listed? Create your own'),
    h('label', { class: 'field' }, h('span', {}, 'Name'), name),
    h('label', { class: 'field' }, h('span', {}, 'Type'), kind),
    h('button', { class: 'ghost', type: 'button', onclick: create }, 'Create and add'));
  return h('div', { class: 'stack' },
    h('button', { class: 'ghost', type: 'button', onclick: () => { panel.hidden = !panel.hidden; } }, '+ Add exercise'),
    panel);
}

const stamp = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

function routineCard(day, key) {
  const routine = ROUTINES[key];
  const doneCount = () => routine.steps.filter(s => day.steps?.[s.id]).length;
  const counter = h('span', { class: 'muted', 'data-testid': `${key}-count` });
  const update = () => { counter.textContent = `${doneCount()} of ${routine.steps.length}`; };
  update();
  const box = h('details', { class: 'card routine', 'data-routine': key, open: doneCount() < routine.steps.length },
    h('summary', {}, h('span', { class: 'routine-head' }, h('h2', {}, routine.title), h('span', { class: 'muted small-text' }, routine.time)), counter),
    routine.steps.map(step => {
      const input = h('input', { type: 'checkbox', checked: day.steps?.[step.id] === true, 'aria-label': step.text, onchange: () => {
        day.steps ||= {};
        if (input.checked) day.steps[step.id] = true;
        else delete day.steps[step.id];
        saveDay(day);
        update();
        if (doneCount() === routine.steps.length) box.open = false;
      } });
      return h('div', { class: `step${step.watch ? ' watch' : ''}` },
        h('label', { class: 'check' }, input, h('span', { class: 'step-text' }, h('strong', {}, step.text), h('span', { class: 'muted small-text' }, step.detail))),
        step.seconds && h('button', { class: 'ghost time-btn', type: 'button', 'aria-label': `Start ${stamp(step.seconds)} timer for ${step.text}`, onclick: () => startRest(step.seconds, { beep: S.settings.beep, label: step.text }) }, stamp(step.seconds)));
    }));
  return box;
}

function cardioRow(day, entry) {
  const facts = [`${entry.minutes} min`, entry.hr && `${entry.hr} bpm`, entry.talk && 'talk test passed'].filter(Boolean).join(' · ');
  return h('div', { class: 'row between line' },
    h('div', {}, h('strong', {}, cardioName(entry.type)), h('p', { class: 'muted small-text' }, facts)),
    h('button', { class: 'link', type: 'button', 'aria-label': `Remove ${cardioName(entry.type)}`, onclick: () => {
      const before = day.cardio;
      day.cardio = before.filter(c => c !== entry);
      saveDay(day);
      render();
      toast('Removed.', { label: 'Undo', run: () => { day.cardio = before; saveDay(day); render(); } });
    } }, 'Remove'));
}

function cardioCard(day, plan) {
  const previous = lastCardio(S.days, day.date);
  const resting = plan.kind === 'rest';
  let type = resting ? 'gentle' : previous?.type ?? 'walk';
  const startMinutes = resting ? plan.minutes : Math.max(plan.minutes ?? 20, previous?.minutes ?? 0);
  const minutes = h('input', { type: 'number', inputmode: 'numeric', min: 1, max: 600, step: 1, value: startMinutes, 'aria-label': 'Minutes' });
  const step = n => () => { minutes.value = Math.max(1, (num(minutes.value) ?? 0) + n); };
  const hr = h('input', { type: 'number', inputmode: 'numeric', min: 30, max: 230, step: 1, placeholder: 'Optional', 'aria-label': 'Average heart rate' });
  const talk = h('input', { type: 'checkbox' });

  function log() {
    const mins = num(minutes.value);
    if (!mins || mins > 600) { toast('Enter between 1 and 600 minutes.'); minutes.focus(); return; }
    const beats = hr.value.trim() === '' ? null : num(hr.value);
    if (hr.value.trim() !== '' && (beats == null || beats < 30 || beats > 230)) { toast('Check the heart rate, or leave it empty.'); hr.focus(); return; }
    day.cardio = [...cardioOf(day), { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, minutes: mins, hr: beats, talk: talk.checked }];
    delete day.rest;
    saveDay(day);
    render();
    toast(`Logged ${mins} minutes.`);
  }

  return h('section', { class: 'card stack' },
    h('h2', {}, 'Cardio'),
    cardioOf(day).length > 0 && h('div', {}, cardioOf(day).map(e => cardioRow(day, e))),
    h('div', { class: 'cardio-form' },
      h('label', { class: 'field' }, h('span', {}, 'Activity'), select('Activity', type, CARDIO_TYPES, v => { type = v; })),
      h('div', { class: 'field' }, h('span', {}, 'Minutes'),
        h('div', { class: 'stepper' },
          h('button', { class: 'ghost', type: 'button', 'aria-label': '5 minutes less', onclick: step(-5) }, '−5'),
          minutes,
          h('button', { class: 'ghost', type: 'button', 'aria-label': '5 minutes more', onclick: step(5) }, '+5'))),
      h('label', { class: 'field' }, h('span', {}, 'Average heart rate'), hr)),
    h('label', { class: 'check' }, talk, h('span', {}, 'I could still speak in full sentences')),
    h('p', { class: 'muted small-text' }, `Moderate range is roughly ${HEART_RATE}. Gentle walks are saved but not counted toward ${CARDIO_GOAL} minutes.`),
    h('button', { class: 'primary', type: 'button', onclick: log }, cardioOf(day).length ? 'Log more cardio' : 'Log cardio'));
}

function actionRow(date, day, showGym, showCardio) {
  const nothingLogged = setsDone(day) === 0 && cardioOf(day).length === 0;
  const add = key => () => { S.adding[key] = date; if (day.rest) { delete day.rest; saveDay(day); } render(); };
  const buttons = [
    !showGym && h('button', { class: 'ghost', type: 'button', onclick: add('gym') }, 'Add gym workout'),
    !showCardio && h('button', { class: 'ghost', type: 'button', onclick: add('cardio') }, 'Add cardio'),
    nothingLogged && h('button', { class: 'ghost', type: 'button', onclick: () => {
      if (day.rest) delete day.rest; else day.rest = true;
      S.adding = {};
      saveDay(day);
      render();
    } }, day.rest ? 'Undo rest day' : 'Mark as rest day'),
  ].filter(Boolean);
  return buttons.length ? h('div', { class: 'row actions' }, buttons) : null;
}

function noteCard(day) {
  const box = h('textarea', { rows: 2, maxlength: 2000, 'aria-label': 'Note for this day', placeholder: 'How did it feel? Anything to remember?' }, day.note || '');
  box.addEventListener('change', () => { day.note = box.value; saveDay(day); });
  return h('section', { class: 'card stack' }, h('h2', {}, 'Note'), box);
}

function todayView() {
  if (!S.settings.startDate) return setupView();
  const date = S.date;
  const day = getDay(date);
  const plan = SCHEDULE[weekdayOf(date)];
  const showGym = !day.rest && (plan.kind === 'gym' || setsDone(day) > 0 || S.adding.gym === date);
  const showCardio = cardioOf(day).length > 0 || (!day.rest && (plan.kind === 'cardio' || S.adding.cardio === date));
  weekEl = weekBlock(date);
  return [
    dateHeader(date),
    weekEl,
    planCard(date, day),
    day.rest && h('section', { class: 'card' }, h('p', {}, 'Rest day saved. Recovery is part of the plan.')),
    showGym && routineCard(day, 'gym-pre'),
    showGym && gymCard(day),
    showGym && routineCard(day, 'gym-post'),
    showCardio && routineCard(day, 'cardio-pre'),
    showCardio && cardioCard(day, plan),
    showCardio && routineCard(day, 'cardio-post'),
    actionRow(date, day, showGym, showCardio),
    noteCard(day),
    safetyLine(),
  ];
}

/* ---------- Progress ---------- */

function calendar(rows) {
  const current = programWeek(S.today, S.settings.startDate);
  const swatch = (s, letter, name) => h('span', {}, h('i', { class: 'cell mini', 'data-s': s }, letter), name);
  return h('section', { class: 'card' },
    h('h2', {}, '12-week calendar'),
    h('div', { class: 'calendar' },
      h('span', {}),
      weekDates(rows[0].monday).map(d => h('span', { class: 'muted small-text cal-head' }, dayLetter(d))),
      rows.flatMap(r => [
        h('span', { class: `cal-week small-text${r.week === current ? ' strong' : ' muted'}` }, r.week),
        ...weekDates(r.monday).map(d => cell(d)),
      ])),
    h('div', { class: 'legend' },
      swatch('gym', 'G', 'Gym'), swatch('cardio', 'C', 'Cardio'), swatch('rest', 'R', 'Rest'), swatch('missed', '–', 'Missed')),
    h('p', { class: 'muted small-text' }, 'Tap a past day to open or change it.'));
}

function weeklyCard(rows) {
  const current = programWeek(S.today, S.settings.startDate);
  return h('section', { class: 'card' },
    h('h2', {}, 'Cardio minutes per week'),
    h('div', { class: 'chart' }, weeklyBars({ rows, goal: CARDIO_GOAL, currentWeek: current })),
    h('details', {}, h('summary', { class: 'muted small-text' }, 'Show as a table'),
      h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, 'Week'), h('th', {}, 'From'), h('th', { class: 'r' }, 'Cardio min'), h('th', { class: 'r' }, 'Gym visits'))),
        h('tbody', {}, rows.map(r => h('tr', {}, h('td', {}, r.week), h('td', {}, shortDate(r.monday)), h('td', { class: 'r' }, r.cardio), h('td', { class: 'r' }, r.gym)))))));
}

function exerciseProgress() {
  const ex = findMove(S.exercise) || EXERCISES[0];
  const points = exerciseHistory(S.days, ex);
  const unit = ex.weighted ? 'lb' : ex.unit;
  const describe = p => p.sets.map(s => setText(ex, s)).join(', ');
  const options = new Map([...routineIds().map(findMove).filter(Boolean), ex, ...allMoves().filter(m => exerciseHistory(S.days, m).length)].map(m => [m.id, m]));
  const title = ex.weighted ? 'Heaviest set' : ex.unit === 'sec' ? 'Longest hold' : 'Most reps';
  return h('section', { class: 'card' },
    h('div', { class: 'row between chart-head' },
      h('h2', {}, title),
      select('Exercise', ex.id, [...options.values()].map(e => [e.id, e.name]), v => { S.exercise = v; render(); })),
    points.length
      ? [
        h('div', { class: 'chart' }, lineChart({ points, unit, describe })),
        h('details', {}, h('summary', { class: 'muted small-text' }, 'Show as a table'),
          h('table', {},
            h('thead', {}, h('tr', {}, h('th', {}, 'Date'), h('th', {}, 'Sets'))),
            h('tbody', {}, [...points].reverse().map(p => h('tr', {}, h('td', {}, shortDate(p.date)), h('td', {}, describe(p))))))),
      ]
      : h('p', { class: 'muted' }, `Finish a set of ${ex.name.toLowerCase()} to see it here.`));
}

function progressView() {
  if (!S.settings.startDate) return [h('h1', {}, 'Progress'), h('section', { class: 'card' }, h('p', {}, 'Choose a start date on the Today screen to begin.'))];
  const rows = programRows(S.days, S.settings.startDate);
  const totals = programTotals(rows);
  return [
    h('h1', {}, 'Progress'),
    h('div', { class: 'tiles' },
      h('div', { class: 'tile' }, h('span', { class: 'muted' }, 'Gym visits'), h('b', { 'data-testid': 'total-gym' }, `${totals.gym} of ${WEEKS * GYM_PER_WEEK}`)),
      h('div', { class: 'tile' }, h('span', { class: 'muted' }, 'Cardio minutes'), h('b', { 'data-testid': 'total-cardio' }, totals.cardio)),
      h('div', { class: 'tile' }, h('span', { class: 'muted' }, `Weeks at ${CARDIO_GOAL}+ min`), h('b', {}, `${totals.goalWeeks} of ${WEEKS}`))),
    calendar(rows),
    weeklyCard(rows),
    exerciseProgress(),
  ];
}

/* ---------- Plan ---------- */

const list = items => h('ul', {}, items.map(t => h('li', {}, t)));

function planView() {
  const week = S.settings.startDate ? programWeek(S.today, S.settings.startDate) : 0;
  return [
    h('h1', {}, '12-week plan'),
    h('section', { class: 'card' }, h('h2', {}, 'Weekly schedule'),
      h('table', {}, h('tbody', {}, SCHEDULE_ORDER.map(d => {
        const plan = SCHEDULE[d];
        const name = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(fromIso(addDays('2026-11-09', (d + 6) % 7)));
        return h('tr', { class: d === weekdayOf(S.today) ? 'current' : '' }, h('th', { scope: 'row' }, name), h('td', {}, plan.title), h('td', { class: 'r muted' }, plan.time));
      })))),
    h('section', { class: 'card' }, h('h2', {}, 'Stages'),
      PHASES.map(p => h('div', { class: `phase${week >= p.from && week <= p.to ? ' current' : ''}` }, h('strong', {}, `Weeks ${p.from}–${p.to}`), h('span', {}, p.name)))),
    h('section', { class: 'card' }, h('h2', {}, 'Full-body gym workout'),
      h('table', {}, h('tbody', {}, EXERCISES.map(e => h('tr', {}, h('th', { scope: 'row' }, e.name), h('td', { class: 'muted' }, e.focus), h('td', { class: 'r' }, target(e)))))),
      h('h3', { class: 'sub' }, 'Each gym visit'), list(GYM_NOTES)),
    h('section', { class: 'card' }, h('h2', {}, 'If a machine is taken'),
      h('p', { class: 'muted' }, 'Tap Swap on an exercise during your workout. Each alternate keeps its own weight history.'),
      EXERCISES.filter(e => alternatesOf(e).length).map(e => [h('h3', { class: 'sub' }, e.name), list(alternatesOf(e).map(a => `${a.name}: ${a.how}`))])),
    h('section', { class: 'card' }, h('h2', {}, 'Warm-up and stretching'),
      [['gym-pre', 'Gym warm-up'], ['gym-post', 'Gym cool-down and stretch'], ['cardio-pre', 'Cardio warm-up'], ['cardio-post', 'Cardio cool-down and stretch']].map(([key, name]) => [
        h('h3', { class: 'sub' }, name), list(ROUTINES[key].steps.map(s => `${s.text}: ${s.detail}`)),
      ])),
    h('section', { class: 'card' }, h('h2', {}, 'Cardio and heart rate'), list(CARDIO_NOTES)),
    h('section', { class: 'card' }, h('h2', {}, 'Food habits'), list(FOOD_NOTES)),
    h('section', { class: 'card' }, h('h2', {}, 'Follow-up'), h('p', {}, FOLLOW_UP)),
    h('section', { class: 'card safety-card stack' }, h('h2', {}, 'Safety'), h('p', {}, SAFETY), h('p', {}, CHECK_FIRST)),
  ];
}

/* ---------- Data ---------- */

async function loadAll() {
  S.days = Object.fromEntries((await store.allDays()).map(d => [d.date, d]));
  S.settings = { ...DEFAULTS, ...(await store.getKv('settings')) };
  S.lastBackup = (await store.getKv('lastBackup')) || null;
}

async function backup() {
  const days = Object.values(S.days).filter(d => !isEmptyDay(d));
  const now = new Date().toISOString();
  download(`workout-tracker-${S.today}.json`, makeBackup(days, S.settings, now), 'application/json');
  S.lastBackup = now;
  await store.setKv('lastBackup', now);
  render();
  toast('Backup saved.');
}

async function restore(file) {
  let parsed;
  try { parsed = parseBackup(await file.text()); } catch (e) { toast(e.message); return; }
  const ok = await confirmIt('Replace what is on this device?', `The backup holds ${parsed.days.length} logged days. They will replace everything saved here now.`, 'Replace');
  if (!ok) return;
  await store.replaceAll(parsed.days, { ...DEFAULTS, ...parsed.settings });
  await loadAll();
  S.view = 'today';
  S.date = S.today;
  render({ top: true });
  toast('Backup restored.');
}

function dataView() {
  const start = h('input', { type: 'date', value: S.settings.startDate || '', 'aria-label': 'Plan start date', onchange: async () => {
    if (!start.value) return;
    S.settings.startDate = cleanSettings({ startDate: start.value }).startDate;
    await saveSettings();
    toast('Start date changed. Your logs were not touched.');
  } });
  const beep = h('input', { type: 'checkbox', checked: S.settings.beep, onchange: async () => { S.settings.beep = beep.checked; await saveSettings(); } });
  const picker = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: () => { if (picker.files[0]) restore(picker.files[0]); picker.value = ''; } });
  const logged = Object.values(S.days).filter(d => !isEmptyDay(d)).length;
  return [
    h('h1', {}, 'Data'),
    h('section', { class: 'card stack' }, h('h2', {}, 'Settings'),
      h('label', { class: 'field' }, h('span', {}, 'Week 1 starts'), start),
      h('label', { class: 'field' }, h('span', {}, 'Rest between sets'),
        select('Rest between sets', S.settings.rest, [[60, '60 seconds'], [75, '75 seconds'], [90, '90 seconds']], async v => { S.settings.rest = Number(v); await saveSettings(); })),
      h('label', { class: 'check' }, beep, h('span', {}, 'Beep when rest ends'))),
    S.settings.custom.length > 0 && h('section', { class: 'card stack' }, h('h2', {}, 'Your exercises'),
      h('div', {}, S.settings.custom.map(made => h('div', { class: 'row between line' },
        h('span', {}, made.name),
        exerciseHistory(S.days, customMove(made)).length
          ? h('span', { class: 'muted small-text' }, 'Has logged sets')
          : h('button', { class: 'link', type: 'button', 'aria-label': `Delete ${made.name}`, onclick: async () => {
            S.settings.custom = S.settings.custom.filter(m => m.id !== made.id);
            if (S.settings.routine) S.settings.routine = S.settings.routine.filter(id => id !== made.id);
            await saveSettings();
            render();
            toast(`${made.name} deleted.`);
          } }, 'Delete'))))),
    h('section', { class: 'card stack' }, h('h2', {}, 'Backup'),
      h('p', {}, `${logged} ${logged === 1 ? 'day' : 'days'} logged on this device. Nothing is sent anywhere, so a backup is the only copy if this phone is lost.`),
      h('p', { class: 'muted' }, S.lastBackup ? `Last backup: ${shortDate(S.lastBackup.slice(0, 10))}` : 'No backup yet.'),
      h('div', { class: 'row' },
        h('button', { class: 'primary', type: 'button', onclick: backup }, 'Download backup'),
        h('button', { class: 'ghost', type: 'button', onclick: () => picker.click() }, 'Restore a backup')),
      picker,
      h('p', { class: 'muted small-text' }, 'Backups are plain files, so keep them somewhere private.')),
    h('section', { class: 'card stack' }, h('h2', {}, 'Erase'),
      h('button', { class: 'danger', type: 'button', onclick: async () => {
        if (!await confirmIt('Erase everything on this device?', 'All workouts and settings here will be deleted. Backup files are not affected.', 'Erase')) return;
        await store.eraseAll();
        S.days = {};
        S.settings = { ...DEFAULTS };
        S.lastBackup = null;
        S.view = 'today';
        S.date = S.today;
        render({ top: true });
      } }, 'Erase all data')),
  ];
}

/* ---------- Shell ---------- */

const VIEWS = { today: todayView, progress: progressView, plan: planView, data: dataView };

function render({ top = false } = {}) {
  main.replaceChildren(...VIEWS[S.view]().flat().filter(Boolean));
  document.querySelectorAll('nav button').forEach(b => {
    if (b.dataset.view === S.view) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  if (top) window.scrollTo(0, 0);
}

document.querySelector('nav').addEventListener('click', e => {
  const view = e.target.closest('button')?.dataset.view;
  if (!view) return;
  if (view === 'today') S.date = S.today;
  S.view = view;
  render({ top: true });
});

// An app left open overnight should move on to the new day.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const now = localToday();
  if (now === S.today) return;
  const wasToday = S.date === S.today;
  S.today = now;
  if (wasToday) S.date = now;
  render();
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

await loadAll();
render();
