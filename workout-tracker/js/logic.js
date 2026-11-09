// Dates, totals and backup checks. No page access here, so all of it can be unit tested.

import { CARDIO_GOAL, CARDIO_TYPES, MOVES, SCHEDULE, STEP_IDS, WEEKS, moveById } from './plan.js';

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

export const isEmptyDay = day => !setsDone(day) && !Object.keys(day?.gym?.swaps || {}).length && !Object.keys(day?.steps || {}).length
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
    if (sets.length) return { date, sets };
  }
  return null;
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

function cleanDay(raw) {
  const day = { date: raw.date };
  if (raw.gym && typeof raw.gym === 'object') {
    const sets = {};
    for (const ex of MOVES) {
      const list = raw.gym.sets?.[ex.id];
      if (Array.isArray(list)) sets[ex.id] = list.slice(0, ex.sets).map(cleanSet);
    }
    day.gym = { sets };
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

export function cleanSettings(raw) {
  const out = {};
  if (ISO.test(raw?.startDate ?? '')) out.startDate = raw.startDate;
  if ([60, 75, 90].includes(raw?.rest)) out.rest = raw.rest;
  if (typeof raw?.beep === 'boolean') out.beep = raw.beep;
  return out;
}

export const makeBackup = (days, settings, exportedAt) => JSON.stringify({ app: APP, version: 1, exportedAt, settings, days }, null, 1);

/** Reads a backup file, keeping only known fields. Throws a readable message if it can't be used. */
export function parseBackup(text) {
  let file;
  try { file = JSON.parse(text); } catch { throw new Error(NOT_BACKUP); }
  if (file?.app !== APP || !Array.isArray(file.days)) throw new Error(NOT_BACKUP);
  const days = file.days.filter(d => ISO.test(d?.date ?? '')).map(cleanDay).filter(d => !isEmptyDay(d));
  return { settings: cleanSettings(file.settings), days };
}
