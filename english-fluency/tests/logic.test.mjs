import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_LESSONS, CLARITY_DRILLS, PHASES, TAMIL_US_SWAPS, TOTAL_DAYS, WEEKS, lessonForDay, phaseOf, youglishUrl,
} from '../js/plan.js';
import {
  STEPS, REVIEW_STEPS, addDays, compareDictation, dayKindFor, dayNumberFor, daysBetween,
  fluencyHistory, makeBackup, makeCalendar, parseBackup, planDayFor, planWeekDates,
  programRows, programTotals, programWeek, reminderDue, reminderFor, statusOf,
  stepsDone, streaks, weekSummary,
} from '../js/logic.js';
import { analyzeTranscript, buildAiCoachPrompt, matchesTargetPhrase } from '../js/analyzer.js';

describe('curriculum integrity (12 weeks / 84 days)', () => {
  it('has 72 unique practice lessons across 3 phases and 12 weekly review days', () => {
    assert.equal(ALL_LESSONS.length, 72);
    assert.equal(TOTAL_DAYS, 84);
    assert.equal(TAMIL_US_SWAPS.length, 25);
    assert.equal(CLARITY_DRILLS.length, 4);
    assert.equal(PHASES.length, 3);

    const swapIds = new Set(TAMIL_US_SWAPS.map(s => s.id));
    const drillIds = new Set(CLARITY_DRILLS.map(d => d.id));
    const proSet = new Set();
    const casSet = new Set();

    for (const lesson of ALL_LESSONS) {
      assert.ok(!proSet.has(lesson.pro.phrase), `duplicate pro phrase: ${lesson.pro.phrase}`);
      assert.ok(!casSet.has(lesson.casual.phrase), `duplicate casual phrase: ${lesson.casual.phrase}`);
      assert.ok(!casSet.has(lesson.pro.phrase), `overlap phrase: ${lesson.pro.phrase}`);
      proSet.add(lesson.pro.phrase);
      casSet.add(lesson.casual.phrase);

      assert.equal(lesson.pro.sentences.length, 4);
      assert.equal(lesson.casual.sentences.length, 4);
      assert.equal(lesson.dictation.length, 2);
      assert.equal(lesson.stories.length, 2);
      assert.equal(lesson.dialogue.turns.length, 6);
      assert.ok(lesson.dialogue.turns.some(t => t.speaker === 'You'), `${lesson.id} missing You turn`);
      assert.ok(swapIds.has(lesson.swapId), `${lesson.id} invalid swapId: ${lesson.swapId}`);
      assert.ok(drillIds.has(lesson.drillId), `${lesson.id} invalid drillId: ${lesson.drillId}`);
    }

    assert.equal(proSet.size, 72);
    assert.equal(casSet.size, 72);
  });

  it('maps Days 1..84 cleanly with every 7th day as a 6-lesson review', () => {
    for (let d = 1; d <= 84; d++) {
      const info = lessonForDay(d);
      if (d % 7 === 0) {
        assert.equal(info.kind, 'review');
        assert.equal(info.lessons.length, 6);
        assert.equal(info.prompts.length, 3);
      } else {
        assert.equal(info.kind, 'practice');
        assert.ok(info.lesson.pro.phrase);
      }
    }
    assert.equal(phaseOf(1).id, 1);
    assert.equal(phaseOf(5).id, 2);
    assert.equal(phaseOf(12).id, 3);
    assert.match(youglishUrl('sanity check'), /^https:\/\/youglish\.com\/pronounce\/sanity%20check\/english\/us$/);
  });
});

describe('dates, plan days, streaks, and weekly totals', () => {
  it('calculates day numbers, wrapping, and DST-safe calendar dates', () => {
    assert.equal(addDays('2026-11-01', 1), '2026-11-02'); // DST transition weekend
    assert.equal(daysBetween('2026-11-01', '2026-11-08'), 7);
    assert.equal(dayNumberFor('2026-11-16', '2026-11-16'), 1);
    assert.equal(dayNumberFor('2026-11-22', '2026-11-16'), 7);
    assert.equal(dayKindFor('2026-11-22', '2026-11-16'), 'review');
    assert.equal(dayKindFor('2026-11-23', '2026-11-16'), 'practice');
    assert.equal(planDayFor('2027-02-08', '2026-11-16'), 1); // Day 85 wraps to Day 1
    assert.equal(programWeek('2026-11-22', '2026-11-16'), 1);
    assert.equal(programWeek('2026-11-23', '2026-11-16'), 2);
    assert.equal(planWeekDates('2026-11-16', 1).length, 7);
  });

  it('tracks statuses, totals, fluency history, and streaks', () => {
    const start = '2026-11-16';
    const days = {
      '2026-11-16': {
        date: '2026-11-16',
        steps: Object.fromEntries(STEPS.map(s => [s, true])),
        minutes: 25,
        transcript: 'We ran a sanity check to figure it out before deployment.',
        durationSec: 30,
        confidence: 'smooth',
        flags: ['have-a-doubt'],
      },
      '2026-11-17': {
        date: '2026-11-17',
        steps: { listen: true },
      },
      '2026-11-22': {
        date: '2026-11-22',
        steps: Object.fromEntries(REVIEW_STEPS.map(s => [s, true])),
        minutes: 30,
      },
    };

    assert.equal(stepsDone(days['2026-11-16'], 'practice'), 5);
    assert.equal(statusOf(days['2026-11-16'], '2026-11-16', { today: '2026-11-22', start }), 'full');
    assert.equal(statusOf(days['2026-11-17'], '2026-11-17', { today: '2026-11-22', start }), 'partial');
    assert.equal(statusOf(undefined, '2026-11-18', { today: '2026-11-22', start }), 'missed');
    assert.equal(statusOf(days['2026-11-22'], '2026-11-22', { today: '2026-11-22', start }), 'review');
    assert.equal(statusOf(undefined, '2026-11-23', { today: '2026-11-22', start }), 'future');

    const w1 = weekSummary(days, planWeekDates(start, 1), 25, start);
    assert.equal(w1.sessions, 3);
    assert.equal(w1.minutes, 60); // 25 + 5 (1/5*25) + 30

    const st = streaks(days, '2026-11-22');
    assert.equal(st.current, 1);
    assert.equal(st.best, 2);

    const rows = programRows(days, start, 25, WEEKS);
    assert.equal(rows.length, 12);
    const totals = programTotals(days, rows, start);
    assert.equal(totals.sessions, 3);
    assert.equal(totals.phrases, 2);

    const hist = fluencyHistory(days);
    assert.equal(hist.length, 1);
    assert.equal(hist[0].words, 11);
    assert.equal(hist[0].wpm, 22);
  });
});

describe('dictation LCS diff', () => {
  it('normalizes contractions and accurately flags missed and extra words', () => {
    const exact = compareDictation("Let's double-check that before I send it.", 'let us double check that before i send it');
    assert.equal(exact.score, 100);
    assert.equal(exact.matched, exact.total);

    const expanded = compareDictation("I'm going to push back.", 'i am gonna push back');
    assert.equal(expanded.score, 100);

    const partial = compareDictation('Did you get a chance to check out that bug yet?', 'did you get chance check out that bug');
    assert.ok(partial.score > 60 && partial.score < 100);
    assert.ok(partial.tokens.some(t => t.state === 'miss' && t.word === 'a'));

    const extra = compareDictation('Hold on a second', 'hold on a quick second');
    assert.ok(extra.tokens.some(t => t.state === 'extra' && t.word === 'quick'));
  });
});

describe('offline transcript habit analyzer', () => {
  it('flags common Tamil-to-US habits and detects target phrase inflections', () => {
    const sample = 'Yesterday only I was having a doubt, so do one thing, let us figure it out and do a sanity check. Actually I will revert back today morning and prepone the call so we discuss about it.';
    const res = analyzeTranscript(sample, {
      durationSec: 20,
      targets: ['sanity check', 'figure out'],
    });
    const ids = new Set(res.flags.map(f => f.id));
    assert.ok(ids.has('trailing-only'));
    assert.ok(ids.has('have-a-doubt'));
    assert.ok(ids.has('do-one-thing'));
    assert.ok(ids.has('stative-ing'));
    assert.ok(ids.has('revert-back'));
    assert.ok(ids.has('today-morning'));
    assert.ok(ids.has('prepone'));
    assert.ok(ids.has('discuss-about'));
    assert.ok(res.wpm > 80);
    assert.deepEqual(res.targetHits, [
      { phrase: 'sanity check', used: true },
      { phrase: 'figure out', used: true },
    ]);

    assert.equal(matchesTargetPhrase('We sorted that weird bug out in ten minutes.', 'sort out'), true);
    assert.equal(matchesTargetPhrase('She pushed back gently on the deadline.', 'push back'), true);
    assert.equal(matchesTargetPhrase('Nothing matches here.', 'push back'), false);

    const prompt = buildAiCoachPrompt({
      dayNumber: 1,
      topic: 'Standup Clarity',
      proPhrase: 'sanity check',
      casualPhrase: 'figure out',
      challengeTitle: '2-Minute Update',
      transcript: sample,
      flags: res.flags,
    });
    assert.match(prompt, /sanity check/);
    assert.match(prompt, /Yesterday only/);
  });

  it('catches remaining habits (myself, kindly, explain me, cope up, order for, passed out, return back, fillers)', () => {
    const sample = 'Myself Raj, kindly explain me how to cope up with load because I passed out in 2015. Let us order for pizza and I will return back soon. Um, like, you know, uh, basically actually actually basically.';
    const res = analyzeTranscript(sample, { durationSec: 30, targets: [] });
    const ids = new Set(res.flags.map(f => f.id));
    assert.ok(ids.has('myself-intro'));
    assert.ok(ids.has('kindly'));
    assert.ok(ids.has('explain-me'));
    assert.ok(ids.has('cope-up'));
    assert.ok(ids.has('passed-out'));
    assert.ok(ids.has('order-for'));
    assert.ok(ids.has('return-back'));
    assert.ok(ids.has('repeat-actually-basically'));
    assert.ok(ids.has('filler-density'));
  });
});

describe('reminders, calendar export, and backups', () => {
  it('checks reminder schedule and builds valid ics calendar', () => {
    const rem = { enabled: true, time: '19:00', days: [1, 3, 5] };
    assert.equal(reminderDue({ reminder: rem, date: '2026-11-16', nowTime: '18:59', day: {}, lastSent: null }), false);
    assert.equal(reminderDue({ reminder: rem, date: '2026-11-16', nowTime: '19:05', day: {}, lastSent: null }), true);
    assert.equal(reminderDue({ reminder: rem, date: '2026-11-16', nowTime: '19:05', day: { steps: { listen: true } }, lastSent: null }), false);

    const info = reminderFor('2026-11-16', '2026-11-16');
    assert.match(info.title, /Day 1: sanity check \+ figure out/);

    const ics = makeCalendar({ startDate: '2026-11-16', reminder: rem, today: '2026-11-16' });
    assert.match(ics, /BEGIN:VCALENDAR/);
    assert.match(ics, /UID:english-fluency-1@local/);
    assert.match(ics, /DTSTART:20261116T190000/);
  });

  it('round-trips valid backups cleanly and rejects invalid JSON', () => {
    const json = makeBackup([
      {
        date: '2026-11-16',
        steps: { listen: true, speak: true, bogus: true },
        dictation: { 0: { text: 'hello', score: 90 } },
        reps: { 'pro-0': 3, bogus: 99 },
        transcript: 'Ran a sanity check.',
        hasRecording: true, // should be stripped so broken audio won't appear after restore
        confidence: 'smooth',
        minutes: 25,
      },
    ], { startDate: '2026-11-16', dailyGoal: 25, challengeSec: 120, rate: 1.0, beep: true }, '2026-11-16T12:00:00Z');

    const parsed = parseBackup(json);
    assert.equal(parsed.days.length, 1);
    assert.deepEqual(parsed.days[0].steps, { listen: true, speak: true });
    assert.deepEqual(parsed.days[0].reps, { 'pro-0': 3 });
    assert.equal(parsed.days[0].hasRecording, undefined);
    assert.equal(parsed.settings.dailyGoal, 25);

    assert.throws(() => parseBackup('{"app":"other"}'), /not an English Fluency backup/);
    assert.throws(() => parseBackup('not json'), /not an English Fluency backup/);
  });
});
