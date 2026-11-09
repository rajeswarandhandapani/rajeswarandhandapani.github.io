import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, exerciseHistory, isEmptyDay, lastCardio, lastPerformance, makeBackup, mondayOf, moderateMinutes, nextMonday, parseBackup,
  programRows, programTotals, programWeek, readyToIncrease, setsDone, statusOf, weekSummary,
} from '../js/logic.js';
import { EXERCISES, MOVES, ROUTINES, STEP_IDS, TOTAL_SETS, alternatesOf, moveById, target } from '../js/plan.js';

const LEG = EXERCISES.find(e => e.id === 'leg-press');
const PLANK = EXERCISES.find(e => e.id === 'plank');
const set = (weight, value, done = true) => ({ weight, value, done });
const gym = (id, sets) => ({ sets: { [id]: sets } });

test('the plan has twelve sets of six exercises', () => {
  assert.equal(EXERCISES.length, 6);
  assert.equal(TOTAL_SETS, 12);
  assert.equal(target(LEG), '2 × 10–12');
  assert.equal(target(EXERCISES.find(e => e.id === 'leg-curl')), '2 × 12');
  assert.equal(target(PLANK), '2 × 20–40 sec');
});

test('alternates keep the sets and targets of the exercise they replace', () => {
  assert.equal(new Set(MOVES.map(m => m.id)).size, MOVES.length, 'ids are unique');
  for (const ex of EXERCISES.filter(e => e.id !== 'plank')) {
    assert.ok(alternatesOf(ex).length >= 3, `${ex.name} has alternates`);
    for (const alt of alternatesOf(ex)) {
      assert.equal(target(alt), target(ex));
      assert.equal(alt.focus, ex.focus);
      assert.ok(alt.how, `${alt.name} says how to do it`);
    }
  }
  assert.equal(moveById('goblet-squat').weighted, true);
  assert.equal(moveById('incline-pushup').weighted, false);
  assert.equal(alternatesOf(PLANK).length, 0, 'a plank needs no machine');
});

test('every routine starts or ends the Watch once, and step ids are unique', () => {
  assert.equal(new Set(STEP_IDS).size, STEP_IDS.length);
  for (const routine of Object.values(ROUTINES)) assert.equal(routine.steps.filter(s => s.watch).length, 1);
  assert.match(ROUTINES['gym-pre'].steps[0].text, /Start Apple Watch/);
  assert.match(ROUTINES['gym-post'].steps.at(-1).text, /End Apple Watch/);
});

test('an alternate keeps its own history, apart from the machine', () => {
  const days = { '2026-11-09': { gym: { swaps: { 'leg-press': 'goblet-squat' }, sets: { 'goblet-squat': [set(25, 12), set(25, 12)] } } } };
  assert.equal(lastPerformance(days, 'leg-press', '2026-11-11'), null);
  assert.equal(lastPerformance(days, 'goblet-squat', '2026-11-11').sets[0].weight, 25);
  assert.equal(setsDone(days['2026-11-09']), 2);
  assert.deepEqual(exerciseHistory(days, moveById('goblet-squat')).map(p => p.value), [25]);
});

test('dates survive daylight-saving and month changes', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-11-01', 1), '2026-11-02'); // US clocks change on this day
  assert.equal(addDays('2026-03-08', 1), '2026-03-09');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('weeks run Monday to Sunday', () => {
  assert.equal(mondayOf('2026-11-09'), '2026-11-09');
  assert.equal(mondayOf('2026-11-15'), '2026-11-09');
  assert.equal(nextMonday('2026-11-08'), '2026-11-09');
  assert.equal(nextMonday('2026-11-09'), '2026-11-09');
  assert.equal(nextMonday('2026-11-10'), '2026-11-16');
});

test('program weeks count from the week of the start date', () => {
  const start = '2026-11-09';
  assert.equal(programWeek('2026-11-09', start), 1);
  assert.equal(programWeek('2026-11-15', start), 1);
  assert.equal(programWeek('2026-11-16', start), 2);
  assert.equal(programWeek('2026-11-08', start), 0);
  assert.equal(programWeek('2027-01-31', start), 12);
  assert.equal(programWeek('2027-02-01', start), 13);
  assert.equal(programWeek('2026-11-09', '2026-11-11'), 1);
});

test('only ticked sets count', () => {
  const day = { gym: gym('leg-press', [set(60, 12), set(60, 10, false)]) };
  assert.equal(setsDone(day), 1);
  assert.equal(setsDone({ gym: gym('leg-press', [null, set(60, 12)]) }), 1);
  assert.equal(setsDone(undefined), 0);
});

test('a day with only unticked drafts is empty', () => {
  assert.equal(isEmptyDay({ date: 'x', gym: gym('leg-press', [set(60, 12, false)]) }), true);
  assert.equal(isEmptyDay({ date: 'x', steps: { 'gp-watch': true } }), false);
  assert.equal(isEmptyDay({ date: 'x', steps: {} }), true);
  assert.equal(isEmptyDay({ date: 'x', gym: { swaps: { 'leg-press': 'goblet-squat' } } }), false);
  assert.equal(isEmptyDay({ date: 'x', note: '   ' }), true);
  assert.equal(isEmptyDay({ date: 'x', note: 'knee sore' }), false);
  assert.equal(isEmptyDay({ date: 'x', rest: true }), false);
});

test('gentle walks are logged but not counted toward the goal', () => {
  const day = { cardio: [{ type: 'walk', minutes: 25 }, { type: 'gentle', minutes: 40 }] };
  assert.equal(moderateMinutes(day), 25);
});

test('day status', () => {
  const ctx = { today: '2026-11-11', start: '2026-11-09' };
  const done = { gym: gym('leg-press', [set(60, 12)]) };
  const cardio = { cardio: [{ type: 'walk', minutes: 20 }] };
  assert.equal(statusOf(done, '2026-11-09', ctx), 'gym');
  assert.equal(statusOf(cardio, '2026-11-09', ctx), 'cardio');
  assert.equal(statusOf({ ...done, ...cardio }, '2026-11-09', ctx), 'both');
  assert.equal(statusOf({ rest: true }, '2026-11-09', ctx), 'rest');
  assert.equal(statusOf(undefined, '2026-11-09', ctx), 'missed', 'a planned Monday with no log');
  assert.equal(statusOf(undefined, '2026-11-11', ctx), 'open', 'today is still open');
  assert.equal(statusOf(undefined, '2026-11-12', ctx), 'future');
  assert.equal(statusOf(undefined, '2026-11-02', ctx), 'open', 'before the plan began');
});

test('optional Saturday and Sunday are never missed', () => {
  const ctx = { today: '2026-11-20', start: '2026-11-09' };
  assert.equal(statusOf(undefined, '2026-11-14', ctx), 'open');
  assert.equal(statusOf(undefined, '2026-11-15', ctx), 'open');
});

test('weekly and program totals', () => {
  const days = {
    '2026-11-09': { gym: gym('leg-press', [set(60, 12)]) },
    '2026-11-10': { cardio: [{ type: 'walk', minutes: 100 }] },
    '2026-11-14': { cardio: [{ type: 'swim', minutes: 50 }] },
    '2026-11-16': { cardio: [{ type: 'walk', minutes: 30 }] },
  };
  assert.deepEqual(weekSummary(days, '2026-11-09'), { cardio: 150, gym: 1 });
  const rows = programRows(days, '2026-11-11');
  assert.equal(rows.length, 12);
  assert.equal(rows[1].monday, '2026-11-16');
  assert.deepEqual(programTotals(rows), { gym: 1, cardio: 180, goalWeeks: 1 });
});

test('the last session is the newest earlier one with a ticked set', () => {
  const days = {
    '2026-11-09': { gym: gym('leg-press', [set(50, 12)]) },
    '2026-11-11': { gym: gym('leg-press', [set(60, 11), set(60, 10, false)]) },
    '2026-11-13': { gym: gym('leg-press', [set(70, 12, false)]) },
    '2026-11-16': { gym: gym('leg-press', [set(80, 12)]) },
  };
  const last = lastPerformance(days, 'leg-press', '2026-11-16');
  assert.equal(last.date, '2026-11-11');
  assert.deepEqual(last.sets, [set(60, 11)]);
  assert.equal(lastPerformance(days, 'seated-row', '2026-11-16'), null);
});

test('a weight increase is only suggested at the top of the range', () => {
  assert.equal(readyToIncrease({ sets: [set(60, 12), set(60, 12)] }, LEG), true);
  assert.equal(readyToIncrease({ sets: [set(60, 12), set(60, 11)] }, LEG), false);
  assert.equal(readyToIncrease({ sets: [set(60, 12)] }, LEG), false);
  assert.equal(readyToIncrease(null, LEG), false);
  assert.equal(readyToIncrease({ sets: [set(null, 40), set(null, 40)] }, PLANK), false);
});

test('last cardio skips gentle walks', () => {
  const days = {
    '2026-11-09': { cardio: [{ type: 'cycle', minutes: 25 }] },
    '2026-11-10': { cardio: [{ type: 'gentle', minutes: 10 }] },
  };
  assert.equal(lastCardio(days, '2026-11-11').type, 'cycle');
});

test('history charts the best ticked set', () => {
  const days = {
    '2026-11-11': { gym: gym('leg-press', [set(60, 12), set(70, 10)]) },
    '2026-11-09': { gym: gym('leg-press', [set(50, 12), set(90, 10, false)]) },
    '2026-11-13': { gym: gym('plank', [set(null, 30), set(null, 25)]) },
  };
  assert.deepEqual(exerciseHistory(days, LEG).map(p => [p.date, p.value]), [['2026-11-09', 50], ['2026-11-11', 70]]);
  assert.deepEqual(exerciseHistory(days, PLANK).map(p => p.value), [30]);
});

test('backups round-trip', () => {
  const days = [{ date: '2026-11-09', gym: { sets: { 'db-row': [set(30, 12)] }, swaps: { 'seated-row': 'db-row' } }, steps: { 'gp-watch': true, 'gs-quad': true }, cardio: [{ id: 'a', type: 'walk', minutes: 20, hr: 110, talk: true }], note: 'good' }];
  const settings = { startDate: '2026-11-09', rest: 75, beep: false };
  const out = parseBackup(makeBackup(days, settings, '2026-11-09T00:00:00Z'));
  assert.deepEqual(out.days, days);
  assert.deepEqual(out.settings, settings);
});

test('bad backups are refused', () => {
  assert.throws(() => parseBackup('not json'), /not a Workout Tracker backup/);
  assert.throws(() => parseBackup('{"app":"other","days":[]}'), /not a Workout Tracker backup/);
  assert.throws(() => parseBackup('{"app":"workout-tracker"}'), /not a Workout Tracker backup/);
  assert.throws(() => parseBackup('null'), /not a Workout Tracker backup/);
});

test('backups drop anything unexpected', () => {
  const file = JSON.stringify({
    app: 'workout-tracker',
    settings: { startDate: 'soon', rest: 5000, beep: 'yes' },
    days: [
      { date: 'bad' },
      { date: '2026-11-10', steps: { 'gp-watch': true, nope: true, 'gp-legs': 'yes' }, gym: { swaps: { 'leg-press': 'db-row', 'seated-row': 'db-row', plank: 'nope' } } },
      { date: '2026-11-09', evil: 1, gym: { sets: { nope: [set(1, 1)], 'leg-press': [set(-5, 'x'), set(60, 12), set(70, 12)] } }, cardio: [{ type: 'teleport', minutes: 9 }, { type: 'walk', minutes: -1 }, { type: 'walk', minutes: 20 }] },
    ],
  });
  const { days, settings } = parseBackup(file);
  assert.deepEqual(settings, {});
  assert.equal(days.length, 2);
  assert.deepEqual(days[0].steps, { 'gp-watch': true }, 'unknown or untrue steps are dropped');
  assert.deepEqual(days[0].gym.swaps, { 'seated-row': 'db-row' }, 'a swap must belong to its exercise');
  const day = days[1];
  assert.equal(day.evil, undefined);
  assert.deepEqual(Object.keys(day.gym.sets), ['leg-press']);
  assert.equal(day.gym.sets['leg-press'].length, 2, 'extra sets are cut');
  assert.deepEqual(day.gym.sets['leg-press'][0], { weight: null, value: null, done: true });
  assert.equal(day.cardio.length, 1);
});
