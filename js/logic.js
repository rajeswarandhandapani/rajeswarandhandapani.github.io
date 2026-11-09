// Dates, totals and backup checks. No page access here, so all of it can be unit tested.

import { CARDIO_GOAL, CARDIO_TYPES, CUSTOM_KINDS, EFFORTS, MAX_SETS, SCHEDULE, STEP_IDS, WEEKS, WEIGHT_STEPS, lookupMove, moveById } from './plan.js';

const pad = n => String(n).padStart(2, '0');
export const toIso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Noon keeps date arithmetic clear of daylight-saving changes.
export const fromIso = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const localToday = () => toIso(new Date());
export const addDays = (iso, n) => { const d = fromIso(iso); d.setDate(d.getDate() + n); return toIso(d); };
export const weekdayOf = iso => fromIso(iso).getDay();
export const mondayOf = iso => addDays(iso, -((weekdayOf(iso) + 6) % 7));
export const nextMonday = iso => (weekdayOf(iso) === 1 ? iso : addDays(mondayOf(iso), 7));
export const daysBetween = (a, b) => Math.round((fromIso(b) - fromIso(a)) / 86400000);
export const weekDates = monday => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

/** Week 1 is the Monday-to-Sunday week holding the start date. Earlier dates give 0 or less. */
export const programWeek = (iso, start) => Math.floor(daysBetween(mondayOf(start), iso) / 7) + 1;

export const num = text => {
  const n = Number.parseFloat(text);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const doneIn = list => (list || []).filter(s => s && s.done);
export const setsDone = day => Object.values(day?.gym?.sets || {}).reduce((n, list) => n + doneIn(list).length, 0);
export const cardioOf = day => day?.cardio || [];
export const moderateMinutes = day => cardioOf(day).filter(c => c.type !== 'gentle').reduce((n, c) => n + c.minutes, 0);

/** The exercises for a day: the routine, this day's changes, and anything already logged that day. */
export function dayExerciseIds(day, routine) {
  const gym = day?.gym || {};
  const skip = gym.skip || [];
  const ids = [...routine.filter(id => !skip.includes(id)), ...(gym.extra || [])];
  const slotOfSwap = Object.fromEntries(Object.entries(gym.swaps || {}).map(([slot, move]) => [move, slot]));
  for (const [id, list] of Object.entries(gym.sets || {})) {
    if (doneIn(list).length) ids.push(slotOfSwap[id] || id);
  }
  return [...new Set(ids)];
}

export const isEmptyDay = day => !setsDone(day) && !Object.keys(day?.gym?.swaps || {}).length && !Object.keys(day?.steps || {}).length
  && !(day?.gym?.skip || []).length && !(day?.gym?.extra || []).length
  && !cardioOf(day).length && !day?.rest && !(day?.note || '').trim();

/** What a calendar cell shows: gym, cardio, both, rest, missed, future or open. */
export function statusOf(day, iso, { today, start }) {
  const gym = setsDone(day) > 0;
  const cardio = cardioOf(day).length > 0;
  if (gym && cardio) return 'both';
  if (gym) return 'gym';
  if (cardio) return 'cardio';
  if (day?.rest) return 'rest';
  if (iso > today) return 'future';
  if (iso < today && start && iso >= start && !SCHEDULE[weekdayOf(iso)].optional) return 'missed';
  return 'open';
}

export function weekSummary(days, monday) {
  const dates = weekDates(monday);
  return {
    cardio: dates.reduce((n, d) => n + moderateMinutes(days[d]), 0),
    gym: dates.filter(d => setsDone(days[d]) > 0).length,
  };
}

export function programRows(days, start, count = WEEKS) {
  const first = mondayOf(start);
  return Array.from({ length: count }, (_, i) => {
    const monday = addDays(first, i * 7);
    return { week: i + 1, monday, ...weekSummary(days, monday) };
  });
}

export function programTotals(rows) {
  return {
    gym: rows.reduce((n, r) => n + r.gym, 0),
    cardio: rows.reduce((n, r) => n + r.cardio, 0),
    goalWeeks: rows.filter(r => r.cardio >= CARDIO_GOAL).length,
  };
}

/** The most recent day before `before` with this exercise done. Used to pre-fill the next session. */
export function lastPerformance(days, id, before) {
  const dates = Object.keys(days).filter(d => d < before).sort().reverse();
  for (const date of dates) {
    const sets = doneIn(days[date].gym?.sets?.[id]);
    if (sets.length) return { date, sets, effort: days[date].gym?.effort?.[id] };
  }
  return null;
}

/**
 * What to do next session, from the last session's sets and effort rating. Reps go up first and
 * weight second, and weight only rises once every set reached the top of the range.
 * Returns { action, weight, value, text }, or null without a rating.
 */
export function suggestNext(ex, last, { week = 99, step = 5 } = {}) {
  if (!last?.effort || !last.sets?.length) return null;
  const { effort, sets } = last;
  const lowest = Math.min(...sets.map(s => s.value));
  const atTop = sets.length >= ex.sets && lowest >= ex.high;

  if (!ex.weighted) {
    const bump = ex.unit === 'sec' ? 5 : 1;
    const say = (action, value, text) => ({ action, weight: null, value, text: text || `Aim for ${value} ${ex.unit}.` });
    if (effort === 'max') return say('decrease', Math.max(ex.low, lowest - 2 * bump), `Aim for ${Math.max(ex.low, lowest - 2 * bump)} ${ex.unit} with solid form.`);
    if (effort === 'hard') return say('hold', lowest, `Stay at ${lowest} ${ex.unit} until it feels steadier.`);
    if (lowest >= ex.high) return say('hold', ex.high, 'You are at the top of the range. Slow the movement down to make it harder.');
    return say('increase', Math.min(ex.high, lowest + (effort === 'easy' ? 2 : 1) * bump));
  }

  const weight = sets[sets.length - 1].weight;
  if (weight == null) return null;
  const lighter = Math.max(step, Math.floor((weight * 0.9) / step) * step);
  const hold = (value, text) => ({ action: 'hold', weight, value, text });
  const drop = text => (lighter < weight
    ? { action: 'decrease', weight: lighter, value: ex.low, text }
    : hold(ex.low, `Stay at ${weight} lb and keep every rep controlled.`));
  const raise = () => ({ action: 'increase', weight: weight + step, value: ex.low, text: `Try ${weight + step} lb for ${ex.low} reps if every rep feels controlled.` });

  if (effort === 'max') return drop(`Drop to ${lighter} lb and keep every rep controlled.`);
  if (effort === 'hard') return lowest < ex.low ? drop(`Drop to ${lighter} lb so you can reach ${ex.low} reps.`) : hold(lowest, `Stay at ${weight} lb until it feels steadier.`);
  if (atTop) {
    // Being able to do far more means the weight is too light, even while learning the movement.
    if (effort === 'good' && week < 3) return hold(ex.high, `Weeks 1–2 are for technique, so stay at ${weight} lb.`);
    return raise();
  }
  const value = effort === 'easy' ? ex.high : Math.min(ex.high, lowest + 1);
  return hold(value, `Stay at ${weight} lb and aim for ${value} reps.`);
}

/** How many set rows to show: today's choice, else at least the plan and what was done last time. */
export function setCountFor(day, ex, last) {
  const chosen = day?.gym?.counts?.[ex.id];
  const saved = day?.gym?.sets?.[ex.id] || [];
  const lastTicked = saved.reduce((n, s, i) => (s?.done ? i + 1 : n), 0);
  return Math.min(MAX_SETS, Math.max(chosen ?? Math.max(ex.sets, last?.sets.length ?? 0), lastTicked));
}

/** True when every set reached the top of the range last time. Plank is timed, so it never asks. */
export const readyToIncrease = (last, ex) => Boolean(ex.weighted && last
  && last.sets.length >= ex.sets && last.sets.every(s => s.value >= ex.high));

export function lastCardio(days, before) {
  const dates = Object.keys(days).filter(d => d < before).sort().reverse();
  for (const date of dates) {
    const entries = cardioOf(days[date]).filter(c => c.type !== 'gentle');
    if (entries.length) return entries[entries.length - 1];
  }
  return null;
}

/** One point per session: the heaviest weight, or longest hold for timed exercises. */
export function exerciseHistory(days, ex) {
  return Object.keys(days).sort().flatMap(date => {
    const sets = doneIn(days[date].gym?.sets?.[ex.id]);
    const values = sets.map(s => (ex.weighted ? s.weight : s.value)).filter(v => v != null);
    return values.length ? [{ date, value: Math.max(...values), sets }] : [];
  });
}

const APP = 'workout-tracker';
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const NOT_BACKUP = 'That file is not a Workout Tracker backup.';
const number = v => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);

function cleanSet(s) {
  return { weight: number(s?.weight), value: number(s?.value), done: s?.done === true };
}

function cleanDay(raw, known) {
  const day = { date: raw.date };
  if (raw.gym && typeof raw.gym === 'object') {
    const sets = {};
    for (const [id, list] of Object.entries(raw.gym.sets || {})) {
      if (known(id) && Array.isArray(list)) sets[id] = list.slice(0, MAX_SETS).map(cleanSet);
    }
    day.gym = { sets };
    const counts = Object.fromEntries(Object.entries(raw.gym.counts || {}).filter(([id, n]) => known(id) && Number.isInteger(n) && n >= 1 && n <= MAX_SETS));
    if (Object.keys(counts).length) day.gym.counts = counts;
    const ratings = EFFORTS.map(e => e.id);
    const effort = Object.fromEntries(Object.entries(raw.gym.effort || {}).filter(([id, value]) => known(id) && ratings.includes(value)));
    if (Object.keys(effort).length) day.gym.effort = effort;
    for (const key of ['skip', 'extra']) {
      const ids = Array.isArray(raw.gym[key]) ? raw.gym[key].filter(id => typeof id === 'string' && known(id)) : [];
      if (ids.length) day.gym[key] = ids;
    }
    const swaps = Object.fromEntries(Object.entries(raw.gym.swaps || {}).filter(([slot, move]) => moveById(move)?.slot === slot));
    if (Object.keys(swaps).length) day.gym.swaps = swaps;
  }
  if (raw.steps && typeof raw.steps === 'object') {
    const ticked = STEP_IDS.filter(id => raw.steps[id] === true);
    if (ticked.length) day.steps = Object.fromEntries(ticked.map(id => [id, true]));
  }
  if (Array.isArray(raw.cardio)) {
    const types = CARDIO_TYPES.map(t => t[0]);
    day.cardio = raw.cardio
      .filter(c => types.includes(c?.type) && number(c.minutes) > 0)
      .map(c => ({ id: String(c.id ?? `${raw.date}-${c.type}-${c.minutes}`), type: c.type, minutes: c.minutes, hr: number(c.hr), talk: c.talk === true }));
  }
  if (raw.rest === true) day.rest = true;
  if (typeof raw.note === 'string' && raw.note) day.note = raw.note.slice(0, 2000);
  return day;
}

function cleanCustom(list) {
  if (!Array.isArray(list)) return [];
  const kinds = CUSTOM_KINDS.map(k => k[0]);
  return list
    .filter(m => /^custom-[\w-]+$/.test(m?.id ?? '') && typeof m.name === 'string' && m.name.trim() && kinds.includes(m.kind))
    .slice(0, 100)
    .map(m => ({ id: m.id, name: m.name.trim().slice(0, 60), kind: m.kind }));
}

export function cleanSettings(raw) {
  const out = {};
  const custom = cleanCustom(raw?.custom);
  if (custom.length) out.custom = custom;
  if (Array.isArray(raw?.routine)) out.routine = [...new Set(raw.routine)].filter(id => typeof id === 'string' && lookupMove(custom, id));
  if (ISO.test(raw?.startDate ?? '')) out.startDate = raw.startDate;
  if ([60, 75, 90].includes(raw?.rest)) out.rest = raw.rest;
  if (WEIGHT_STEPS.includes(raw?.step)) out.step = raw.step;
  if (typeof raw?.beep === 'boolean') out.beep = raw.beep;
  return out;
}

export const makeBackup = (days, settings, exportedAt) => JSON.stringify({ app: APP, version: 1, exportedAt, settings, days }, null, 1);

/** Reads a backup file, keeping only known fields. Throws a readable message if it can't be used. */
export function parseBackup(text) {
  let file;
  try { file = JSON.parse(text); } catch { throw new Error(NOT_BACKUP); }
  if (file?.app !== APP || !Array.isArray(file.days)) throw new Error(NOT_BACKUP);
  const settings = cleanSettings(file.settings);
  const known = id => lookupMove(settings.custom, id);
  const days = file.days.filter(d => ISO.test(d?.date ?? '')).map(d => cleanDay(d, known)).filter(d => !isEmptyDay(d));
  return { settings, days };
}
