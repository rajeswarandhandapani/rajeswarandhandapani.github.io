// Pure dates, weekly totals, dictation diff, streaks, calendar export, and backup checks.
// No DOM access here so all of it can be unit tested directly.

import { ALL_LESSONS, CHALLENGE_TIMERS, CONFIDENCE_LEVELS, DAILY_GOAL_OPTIONS, TOTAL_DAYS, WEEKS, WEEKLY_GOAL_MIN, lessonForDay } from './plan.js';

export const STEPS = ['listen', 'shadow', 'story', 'speak', 'review'];
export const REVIEW_STEPS = ['recap', 'story', 'impromptu', 'reflect'];
export const STEP_IDS = [...new Set([...STEPS, ...REVIEW_STEPS])];

const pad = n => String(n).padStart(2, '0');
export const toIso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Noon keeps date arithmetic clear of daylight-saving transitions.
export const fromIso = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const localToday = () => toIso(new Date());
export const addDays = (iso, n) => { const d = fromIso(iso); d.setDate(d.getDate() + n); return toIso(d); };
export const weekdayOf = iso => fromIso(iso).getDay();
export const mondayOf = iso => addDays(iso, -((weekdayOf(iso) + 6) % 7));
export const daysBetween = (a, b) => Math.round((fromIso(b) - fromIso(a)) / 86400000);
export const weekDates = startIso => Array.from({ length: 7 }, (_, i) => addDays(startIso, i));

/** 1-based day number from the user's plan start date (<= 0 before start). */
export const dayNumberFor = (iso, startDate) => (startDate ? daysBetween(startDate, iso) + 1 : 1);

/** Clamps/wraps into 1..84 so practice continues smoothly past Week 12. */
export const planDayFor = (iso, startDate) => {
  const raw = dayNumberFor(iso, startDate);
  if (raw <= 1) return 1;
  return ((raw - 1) % TOTAL_DAYS) + 1;
};

/** 1-based week number from the plan start date (matches Day 1..7 = Week 1). */
export const programWeek = (iso, startDate) => Math.floor(daysBetween(startDate, iso) / 7) + 1;

export const dayKindFor = (iso, startDate) => {
  const num = dayNumberFor(iso, startDate);
  return num >= 1 && num % 7 === 0 ? 'review' : 'practice';
};

export const stepsFor = kind => (kind === 'review' ? REVIEW_STEPS : STEPS);

export function stepsDone(day, kind = 'practice') {
  const list = stepsFor(kind);
  return list.filter(id => day?.steps?.[id] === true).length;
}

export function dayMinutes(day, dailyGoal = 25, kind = 'practice') {
  if (typeof day?.minutes === 'number' && day.minutes > 0) return day.minutes;
  const list = stepsFor(kind);
  const done = stepsDone(day, kind);
  if (done > 0) return Math.max(5, Math.round((done / list.length) * dailyGoal));
  if ((day?.transcript || '').trim() || Object.keys(day?.dictation || {}).length > 0 || day?.hasRecording) return 5;
  return 0;
}

export function isEmptyDay(day) {
  if (!day) return true;
  const hasSteps = STEP_IDS.some(id => day.steps?.[id] === true);
  const hasDictation = Object.keys(day.dictation || {}).length > 0;
  const hasReps = Object.values(day.reps || {}).some(n => n > 0);
  const hasMastered = (day.mastered || []).length > 0;
  return !hasSteps && !hasDictation && !hasReps && !hasMastered
    && !(day.transcript || '').trim()
    && !day.confidence
    && !(day.win || '').trim()
    && !(day.minutes > 0)
    && !day.hasRecording
    && !(day.durationSec > 0);
}

/** Cell status: full, review, partial, missed, future, or open. */
export function statusOf(day, iso, { today, start }) {
  const kind = start ? dayKindFor(iso, start) : 'practice';
  const list = stepsFor(kind);
  const done = stepsDone(day, kind);
  if (kind === 'review' && (done === list.length || (day?.minutes >= 15 && day?.confidence))) return 'review';
  if (done === list.length || (day?.minutes >= 20 && day?.confidence)) return 'full';
  if (!isEmptyDay(day)) return 'partial';
  if (iso > today) return 'future';
  if (start && iso >= start && iso < today) return 'missed';
  return 'open';
}

export function planWeekDates(startDate, week) {
  const first = addDays(startDate, (week - 1) * 7);
  return weekDates(first);
}

export function weekSummary(days, startOrDates, dailyGoal = 25, startDate = null) {
  const dates = Array.isArray(startOrDates) ? startOrDates : weekDates(startOrDates);
  let minutes = 0;
  let sessions = 0;
  for (const iso of dates) {
    const d = days[iso];
    const kind = startDate ? dayKindFor(iso, startDate) : 'practice';
    const m = dayMinutes(d, dailyGoal, kind);
    minutes += m;
    if (!isEmptyDay(d)) sessions += 1;
  }
  return { minutes, sessions };
}

export function programRows(days, start, dailyGoal = 25, count = WEEKS) {
  const latest = Object.keys(days).filter(d => !isEmptyDay(days[d])).sort().pop();
  const totalWeeks = Math.max(count, latest && latest >= start ? programWeek(latest, start) : 0);
  return Array.from({ length: totalWeeks }, (_, i) => {
    const week = i + 1;
    const dates = planWeekDates(start, week);
    return { week, startDate: dates[0], ...weekSummary(days, dates, dailyGoal, start) };
  });
}

export function programTotals(days, rows, startDate) {
  const activeDates = Object.keys(days).filter(d => !isEmptyDay(days[d]));
  const phrasesSet = new Set();
  for (const iso of activeDates) {
    const d = days[iso];
    const p = lessonForDay(planDayFor(iso, startDate));
    if (p.kind === 'practice' && (stepsDone(d, 'practice') >= 2 || d.minutes >= 10 || (d.transcript || '').trim())) {
      phrasesSet.add(p.lesson.pro.phrase);
      phrasesSet.add(p.lesson.casual.phrase);
    }
    for (const phrase of d.mastered || []) phrasesSet.add(phrase);
  }
  return {
    sessions: rows.reduce((n, r) => n + r.sessions, 0),
    minutes: rows.reduce((n, r) => n + r.minutes, 0),
    goalWeeks: rows.filter(r => r.minutes >= WEEKLY_GOAL_MIN).length,
    phrases: phrasesSet.size,
  };
}

export function streaks(days, today) {
  const active = new Set(Object.keys(days).filter(d => d <= today && !isEmptyDay(days[d])));
  if (!active.size) return { current: 0, best: 0 };

  let current = 0;
  let cursor = active.has(today) ? today : addDays(today, -1);
  while (active.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const sorted = [...active].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const iso of sorted) {
    run = prev && daysBetween(prev, iso) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = iso;
  }
  return { current, best };
}

export function fluencyHistory(days) {
  const confScore = { rough: 1, steady: 2, smooth: 3 };
  return Object.keys(days).sort().flatMap(date => {
    const d = days[date];
    const text = (d.transcript || '').trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    if (!words && !d.confidence) return [];
    const wpm = words > 0 && d.durationSec >= 10 ? Math.round((words / d.durationSec) * 60) : null;
    return [{
      date,
      words,
      wpm,
      confidence: d.confidence || null,
      confidenceRank: confScore[d.confidence] || 0,
      flags: (d.flags || []).length,
    }];
  });
}

/* ---------- Dictation LCS Word Diff ---------- */

const CONTRACTIONS = {
  "i'm": ['i', 'am'], "you're": ['you', 'are'], "we're": ['we', 'are'], "they're": ['they', 'are'],
  "he's": ['he', 'is'], "she's": ['she', 'is'], "it's": ['it', 'is'], "that's": ['that', 'is'],
  "what's": ['what', 'is'], "there's": ['there', 'is'], "here's": ['here', 'is'], "who's": ['who', 'is'],
  "i've": ['i', 'have'], "you've": ['you', 'have'], "we've": ['we', 'have'], "they've": ['they', 'have'],
  "i'll": ['i', 'will'], "you'll": ['you', 'will'], "we'll": ['we', 'will'], "they'll": ['they', 'will'],
  "he'll": ['he', 'will'], "she'll": ['she', 'will'], "it'll": ['it', 'will'],
  "i'd": ['i', 'would'], "you'd": ['you', 'would'], "we'd": ['we', 'would'], "they'd": ['they', 'would'],
  "don't": ['do', 'not'], "doesn't": ['does', 'not'], "didn't": ['did', 'not'],
  "isn't": ['is', 'not'], "aren't": ['are', 'not'], "wasn't": ['was', 'not'], "weren't": ['were', 'not'],
  "haven't": ['have', 'not'], "hasn't": ['has', 'not'], "hadn't": ['had', 'not'],
  "won't": ['will', 'not'], "wouldn't": ['would', 'not'], "couldn't": ['could', 'not'], "shouldn't": ['should', 'not'],
  "can't": ['can', 'not'], cannot: ['can', 'not'],
  "let's": ['let', 'us'], gonna: ['going', 'to'], wanna: ['want', 'to'], gotta: ['got', 'to'],
};

export function tokenizeForDiff(text) {
  const raw = String(text || '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);
  const out = [];
  for (const w of raw) {
    const clean = w.replace(/^'+|'+$/g, '');
    if (!clean) continue;
    if (CONTRACTIONS[clean]) out.push(...CONTRACTIONS[clean]);
    else out.push(clean.replace(/'/g, ''));
  }
  return out;
}

/** Longest Common Subsequence word diff for listening dictation feedback. */
export function compareDictation(expected, typed) {
  const a = tokenizeForDiff(expected);
  const b = tokenizeForDiff(typed);
  const n = a.length;
  const m = b.length;
  if (!n) return { score: 0, matched: 0, total: 0, tokens: [] };
  if (!m) return { score: 0, matched: 0, total: n, tokens: a.map(word => ({ word, state: 'miss' })) };

  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const tokens = [];
  let i = 0;
  let j = 0;
  let matched = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      tokens.push({ word: a[i], state: 'match' });
      matched += 1;
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      tokens.push({ word: a[i], state: 'miss' });
      i += 1;
    } else {
      tokens.push({ word: b[j], state: 'extra' });
      j += 1;
    }
  }
  while (i < n) { tokens.push({ word: a[i++], state: 'miss' }); }
  while (j < m) { tokens.push({ word: b[j++], state: 'extra' }); }

  return {
    score: Math.round((matched / n) * 100),
    matched,
    total: n,
    tokens,
  };
}

/* ---------- Reminders & Calendar ---------- */

const APP = 'english-fluency';
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const NOT_BACKUP = 'That file is not an English Fluency backup.';

export const DEFAULT_REMINDER = { enabled: false, time: '19:00', days: [1, 2, 3, 4, 5, 6, 0] };

export function reminderFor(date, startDate) {
  const dayNum = startDate ? planDayFor(date, startDate) : 1;
  const info = lessonForDay(dayNum);
  if (info.kind === 'review') {
    return {
      title: `English Fluency · Day ${info.dayNumber} Story Review`,
      body: `25 min · Week ${info.week} story integration and 60s prompts.`,
    };
  }
  return {
    title: `English Fluency · Day ${info.dayNumber}: ${info.lesson.pro.phrase} + ${info.lesson.casual.phrase}`,
    body: `25 min · ${info.lesson.topic}. Open English Fluency to practice.`,
  };
}

export function reminderDue({ reminder, date, nowTime, day, lastSent }) {
  if (!reminder?.enabled || lastSent === date) return false;
  const days = Array.isArray(reminder.days) ? reminder.days : DEFAULT_REMINDER.days;
  if (!days.includes(weekdayOf(date))) return false;
  if (!TIME.test(reminder.time ?? '') || !TIME.test(nowTime ?? '') || nowTime < reminder.time) return false;
  if (!isEmptyDay(day)) return false;
  return true;
}

export function makeCalendar({ startDate, reminder = DEFAULT_REMINDER, today }) {
  const base = ISO.test(startDate ?? '') ? startDate : today;
  const time = TIME.test(reminder?.time ?? '') ? reminder.time : DEFAULT_REMINDER.time;
  const [hh, mm] = time.split(':');
  const days = Array.isArray(reminder?.days) ? reminder.days : DEFAULT_REMINDER.days;
  const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const baseWeekday = weekdayOf(base);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//English Fluency//EN',
    'CALSCALE:GREGORIAN',
  ];
  for (const d of days) {
    if (!Number.isInteger(d) || d < 0 || d > 6) continue;
    const offset = (d - baseWeekday + 7) % 7;
    const firstIso = addDays(base, offset);
    const firstDate = firstIso.replaceAll('-', '');
    const info = reminderFor(firstIso, base);
    lines.push(
      'BEGIN:VEVENT',
      `UID:english-fluency-${d}@local`,
      `DTSTART:${firstDate}T${hh}${mm}00`,
      'DURATION:PT25M',
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[d]};COUNT=${WEEKS}`,
      `SUMMARY:${info.title}`,
      `DESCRIPTION:${info.body}`,
      'BEGIN:VALARM',
      'TRIGGER:PT0M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${info.title}`,
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/* ---------- Backup Sanitization ---------- */

const KNOWN_PHRASES = new Set(ALL_LESSONS.flatMap(l => [l.pro.phrase, l.casual.phrase]));
const CONF_IDS = new Set(CONFIDENCE_LEVELS.map(c => c.id));
const num = v => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);

function cleanDay(raw) {
  const day = { date: raw.date };
  if (raw.steps && typeof raw.steps === 'object') {
    const ticked = STEP_IDS.filter(id => raw.steps[id] === true);
    if (ticked.length) day.steps = Object.fromEntries(ticked.map(id => [id, true]));
  }
  if (raw.dictation && typeof raw.dictation === 'object') {
    const clean = {};
    for (const key of ['0', '1']) {
      const item = raw.dictation[key];
      if (item && typeof item === 'object' && typeof item.text === 'string') {
        clean[key] = {
          text: item.text.slice(0, 500),
          score: Math.min(100, Math.max(0, Math.round(num(item.score)))),
        };
      }
    }
    if (Object.keys(clean).length) day.dictation = clean;
  }
  if (raw.reps && typeof raw.reps === 'object') {
    const reps = {};
    for (const [k, v] of Object.entries(raw.reps)) {
      if (/^(pro|casual)-[0-3]$/.test(k) && Number.isInteger(v) && v >= 0 && v <= 20) reps[k] = v;
    }
    if (Object.keys(reps).length) day.reps = reps;
  }
  if (Array.isArray(raw.mastered)) {
    const m = [...new Set(raw.mastered.filter(p => typeof p === 'string' && KNOWN_PHRASES.has(p)))].slice(0, 20);
    if (m.length) day.mastered = m;
  }
  if (typeof raw.transcript === 'string' && raw.transcript) day.transcript = raw.transcript.slice(0, 8000);
  if (Number.isInteger(raw.durationSec) && raw.durationSec > 0) day.durationSec = Math.min(3600, raw.durationSec);
  if (typeof raw.minutes === 'number' && Number.isFinite(raw.minutes) && raw.minutes > 0) day.minutes = Math.min(300, Math.round(raw.minutes));
  if (CONF_IDS.has(raw.confidence)) day.confidence = raw.confidence;
  if (typeof raw.win === 'string' && raw.win) day.win = raw.win.slice(0, 500);
  if (Array.isArray(raw.flags)) {
    const f = raw.flags.filter(x => typeof x === 'string').map(x => x.slice(0, 40)).slice(0, 30);
    if (f.length) day.flags = f;
  }
  return day;
}

export function cleanSettings(raw) {
  const out = {};
  if (ISO.test(raw?.startDate ?? '')) out.startDate = raw.startDate;
  if (DAILY_GOAL_OPTIONS.includes(raw?.dailyGoal)) out.dailyGoal = raw.dailyGoal;
  if (CHALLENGE_TIMERS.includes(raw?.challengeSec)) out.challengeSec = raw.challengeSec;
  if (typeof raw?.rate === 'number' && Number.isFinite(raw.rate) && raw.rate >= 0.7 && raw.rate <= 1.3) out.rate = raw.rate;
  if (typeof raw?.voiceName === 'string' && raw.voiceName) out.voiceName = raw.voiceName.slice(0, 120);
  if (typeof raw?.beep === 'boolean') out.beep = raw.beep;
  if (raw?.reminder && typeof raw.reminder === 'object') {
    const r = raw.reminder;
    const days = Array.isArray(r.days)
      ? [...new Set(r.days.filter(d => Number.isInteger(d) && d >= 0 && d <= 6))]
      : [...DEFAULT_REMINDER.days];
    out.reminder = {
      enabled: r.enabled === true,
      time: TIME.test(r.time ?? '') ? r.time : DEFAULT_REMINDER.time,
      days,
    };
  }
  return out;
}

export const makeBackup = (days, settings, exportedAt) => JSON.stringify({ app: APP, version: 1, exportedAt, settings, days }, null, 1);

export function parseBackup(text) {
  let file;
  try { file = JSON.parse(text); } catch { throw new Error(NOT_BACKUP); }
  if (file?.app !== APP || !Array.isArray(file.days)) throw new Error(NOT_BACKUP);
  const settings = cleanSettings(file.settings);
  const days = file.days.filter(d => ISO.test(d?.date ?? '')).map(cleanDay).filter(d => !isEmptyDay(d));
  return { settings, days };
}
