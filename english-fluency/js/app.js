// Screens and interactions for English Fluency.
// Pure totals/date/diff logic lives in logic.js; transcript habit checks live in analyzer.js.

import * as store from './store.js';
import { h, select, toast, confirmIt, download, copyText, longDate, shortDate, dayLetter, dayName } from './ui.js';
import { startTimer, stopTimer } from './timer.js';
import { weeklyBars, fluencyChart } from './charts.js';
import {
  canSpeak, listEnUsVoices, speak, stopSpeaking, playDialogue,
  canRecord, startRecording, stopRecording,
  canDictate, startDictation, stopDictation,
} from './speech.js';
import {
  ALL_LESSONS, CHALLENGE_TIMERS, CLARITY_DRILLS, CONFIDENCE_LEVELS, DAILY_GOAL_OPTIONS,
  FRAMEWORKS, PHASES, TAMIL_US_SWAPS, TOTAL_DAYS, WEEKS, WEEKLY_GOAL_MIN,
  drillById, lessonForDay, swapById, youglishUrl,
} from './plan.js';
import {
  DEFAULT_REMINDER, addDays, compareDictation, dayKindFor, dayMinutes, dayNumberFor,
  fluencyHistory, isEmptyDay, localToday, makeBackup, makeCalendar, parseBackup,
  planDayFor, planWeekDates, programRows, programTotals, programWeek,
  reminderDue, reminderFor, statusOf, stepsDone, stepsFor, streaks, weekSummary,
} from './logic.js';
import { analyzeTranscript, buildAiCoachPrompt } from './analyzer.js';

const main = document.querySelector('#main');

const defaultSettings = () => ({
  startDate: null,
  dailyGoal: 25,
  challengeSec: 120,
  rate: 1.0,
  voiceName: null,
  beep: true,
  reminder: { ...DEFAULT_REMINDER, days: [...DEFAULT_REMINDER.days] },
});

const S = {
  view: 'today',
  today: localToday(),
  date: localToday(),
  days: {},
  settings: defaultSettings(),
  openSteps: {},
  recUrl: {},
  recLoading: {},
  recordingDate: null,
  dictatingDate: null,
  rolePlay: false,
  activeTurn: null,
  stopDialogueFn: null,
  refSearch: '',
  refCategory: 'All',
  recMeta: [],
  lastBackup: null,
  lastReminder: null,
};

const getDay = date => (S.days[date] ||= { date });
const stamp = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

let saveTimer;
let askedToPersist = false;

async function saveDay(day) {
  clearTimeout(saveTimer);
  if (!askedToPersist) {
    askedToPersist = true;
    navigator.storage?.persist?.().catch(() => { });
  }
  try {
    if (isEmptyDay(day)) await store.deleteDay(day.date);
    else await store.putDay(day);
  } catch {
    toast('Could not save on this device. Check available browser storage.');
  }
}

function scheduleSaveDay(day) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveDay(day); }, 180);
}

async function saveSettings() {
  await store.setKv('settings', S.settings);
}

function stepOpenMap(date, stepIds, day) {
  if (!S.openSteps[date]) {
    const firstPending = stepIds.find(id => day.steps?.[id] !== true) || stepIds[0];
    S.openSteps[date] = { [firstPending]: true };
  }
  return S.openSteps[date];
}

function revokeAllAudioUrls() {
  for (const url of Object.values(S.recUrl)) {
    try { URL.revokeObjectURL(url); } catch { }
  }
  S.recUrl = {};
  S.recLoading = {};
}

async function ensureRecordingLoaded(date, day) {
  if (!day?.hasRecording || S.recUrl[date] || S.recLoading[date]) return;
  S.recLoading[date] = true;
  try {
    const rec = await store.getRecording(date);
    if (rec?.blob) {
      S.recUrl[date] = URL.createObjectURL(rec.blob);
      if (S.view === 'today' && S.date === date) render();
    }
  } catch { }
  S.recLoading[date] = false;
}

/* ---------- Shared Week Strip & Cells ---------- */

const STATUS_WORD = {
  full: 'completed',
  review: 'weekly review completed',
  partial: 'in progress',
  missed: 'missed',
  future: 'upcoming',
  open: 'not started',
};

function cell(date, { selected = false, showDayNum = null, isReview = false } = {}) {
  const day = S.days[date];
  const status = statusOf(day, date, { today: S.today, start: S.settings.startDate });
  let inner = '';
  if (status === 'full') inner = '✓';
  else if (status === 'review') inner = '★';
  else if (status === 'partial') inner = '•';
  else if (status === 'missed') inner = '–';
  else if (showDayNum != null) inner = h('span', { class: 'cell-day' }, isReview ? 'R' : showDayNum);

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
  stopDialoguePlayback();
  S.date = date;
  S.view = 'today';
  render({ top: true });
}

function meter(value, goal) {
  const fill = h('i');
  fill.style.width = `${goal > 0 ? Math.min(100, (value / goal) * 100) : 0}%`;
  return h('div', { class: 'meter', role: 'progressbar', 'aria-valuenow': value, 'aria-valuemin': 0, 'aria-valuemax': goal }, fill);
}

let weekEl;

function weekBlock(date) {
  const startDate = S.settings.startDate;
  const week = Math.max(1, programWeek(date, startDate));
  const dates = planWeekDates(startDate, week);
  const sum = weekSummary(S.days, dates, S.settings.dailyGoal, startDate);

  return h('div', { class: 'week-block' },
    h('div', { class: 'strip' }, dates.map((d, idx) => h('div', { class: 'strip-day' },
      h('span', { class: 'muted small-text' }, idx === 6 ? 'Rev' : dayLetter(d)),
      cell(d, { selected: d === date, showDayNum: (week - 1) * 7 + idx + 1, isReview: idx === 6 })))),
    h('div', { class: 'tiles' },
      h('div', { class: 'tile' },
        h('span', { class: 'muted' }, 'Minutes this week'),
        h('b', { 'data-testid': 'week-minutes' }, `${sum.minutes} of ${WEEKLY_GOAL_MIN} min`),
        meter(sum.minutes, WEEKLY_GOAL_MIN)),
      h('div', { class: 'tile' },
        h('span', { class: 'muted' }, 'Sessions this week'),
        h('b', { 'data-testid': 'week-sessions' }, `${sum.sessions} of 7 days`),
        meter(sum.sessions, 7))));
}

function refreshWeek() {
  if (!weekEl?.isConnected) return;
  const next = weekBlock(S.date);
  weekEl.replaceWith(next);
  weekEl = next;
}

/* ---------- First-Run Setup ---------- */

function setupView() {
  const dateInput = h('input', { type: 'date', value: S.today, 'aria-label': 'Plan start date' });
  let goalVal = S.settings.dailyGoal;
  const goalSelect = select('Daily practice goal', goalVal, DAILY_GOAL_OPTIONS.map(m => [m, `${m} minutes / day`]), v => { goalVal = Number(v); });

  return [
    h('h1', {}, 'Start your 12 weeks'),
    h('section', { class: 'card stack' },
      h('p', {}, 'Build crisp American listening and confident storytelling in 20–30 minutes a day—for both US IT work and everyday life.'),
      h('label', { class: 'field' }, h('span', {}, 'Day 1 starts on'), dateInput),
      h('label', { class: 'field' }, h('span', {}, 'Daily routine target'), goalSelect),
      h('p', { class: 'muted' }, 'Practice transcripts, recordings, and logs stay privately on this device.'),
      h('button', {
        class: 'primary',
        type: 'button',
        onclick: async () => {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput.value)) {
            toast('Choose a start date first.');
            return;
          }
          S.settings.startDate = dateInput.value;
          S.settings.dailyGoal = goalVal;
          await saveSettings();
          S.date = dateInput.value <= S.today ? S.today : dateInput.value;
          render({ top: true });
        },
      }, 'Start the plan')),
    h('section', { class: 'card stack-sm' },
      h('h2', {}, 'Your 5-step daily loop (~25 min)'),
      h('p', { class: 'muted' }, '1. Listen & Decode (5m): Blind micro-dictation of fast American speech reductions.'),
      h('p', { class: 'muted' }, '2. Phrase Upgrade (6m): 1 US work idiom + 1 casual phrasal verb + clarity drill.'),
      h('p', { class: 'muted' }, '3. Story & Role-Play (5m): Connected mini-stories and spoken dialogue.'),
      h('p', { class: 'muted' }, '4. Speak & Record (7m): 2-minute BLUF/PREP story with local voice recording.'),
      h('p', { class: 'muted' }, '5. Habit Check (3m): Offline check for common Tamil-to-US habits + confidence.')),
  ];
}

/* ---------- Date Header & Text Helpers ---------- */

function dateHeader(date, planInfo, rawDayNum) {
  const move = n => () => {
    stopDialoguePlayback();
    S.date = addDays(date, n);
    render({ top: true });
  };
  const subtitle = rawDayNum <= 0
    ? `Starts ${shortDate(S.settings.startDate)}`
    : rawDayNum > TOTAL_DAYS
      ? `Day ${rawDayNum} (Cycle ${planInfo.dayNumber} of ${TOTAL_DAYS}) · Week ${planInfo.week}: ${planInfo.phase.name}`
      : `Day ${planInfo.dayNumber} of ${TOTAL_DAYS} · Week ${planInfo.week}: ${planInfo.phase.name}`;

  return h('div', { class: 'date-head' },
    h('button', { class: 'ghost icon', type: 'button', 'aria-label': 'Previous day', onclick: move(-1) }, '‹'),
    h('div', { class: 'date-title' },
      h('h1', {}, date === S.today ? `Today, ${shortDate(date)}` : longDate(date)),
      h('p', { class: 'muted' }, subtitle),
      date !== S.today && h('button', { class: 'today-pill', type: 'button', onclick: () => openDate(S.today) }, 'Back to today →')),
    h('button', { class: 'ghost icon', type: 'button', 'aria-label': 'Next day', disabled: date >= S.today, onclick: move(1) }, '›'));
}

/** Highlights story connectors safely using text nodes + <mark class="conn"> (zero innerHTML). */
function highlightConnectors(text, connectors = []) {
  if (!connectors.length) return [text];
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${connectors.map(esc).join('|')})`, 'gi');
  const parts = text.split(re);
  return parts.map(part => {
    const isHit = connectors.some(c => c.toLowerCase() === part.toLowerCase());
    return isHit ? h('mark', { class: 'conn' }, part) : part;
  });
}

function sayText(text, rateOffset = 0) {
  const rate = Math.max(0.7, Math.min(1.25, (S.settings.rate || 1.0) + rateOffset));
  if (!canSpeak()) {
    toast('Speech synthesis is unavailable in this browser.');
    return;
  }
  speak(text, { voiceName: S.settings.voiceName, rate });
}

function stopDialoguePlayback() {
  if (S.stopDialogueFn) {
    S.stopDialogueFn();
    S.stopDialogueFn = null;
  } else {
    stopSpeaking();
  }
  S.activeTurn = null;
}

/* ---------- Step Card Wrapper ---------- */

function stepCard({ id, num, title, time, done, openMap, body }) {
  const details = h('details', {
    class: `card step-card${done ? ' is-done' : ''}`,
    'data-step': id,
    open: Boolean(openMap[id]),
  });
  details.addEventListener('toggle', () => {
    openMap[id] = details.open;
  });

  const summary = h('summary', {},
    h('span', { class: 'step-title' },
      h('span', { class: 'step-num', 'aria-hidden': 'true' }, done ? '✓' : num),
      h('span', {},
        h('strong', {}, title),
        ' ',
        h('span', { class: 'muted small-text' }, `(${time})`))),
    done ? h('span', { class: 'badge done' }, 'Done') : h('span', { class: 'muted small-text' }, 'Open'));

  details.append(summary, h('div', { class: 'step-body' }, body));
  return details;
}

/* ---------- Practice Day View ---------- */

function practiceView(date, day, planInfo) {
  const { lesson } = planInfo;
  const openMap = stepOpenMap(date, ['listen', 'shadow', 'story', 'speak', 'review'], day);
  const doneCount = stepsDone(day, 'practice');

  let stepCountEl;
  const updateFocusCounter = () => {
    if (stepCountEl) stepCountEl.textContent = `${stepsDone(day, 'practice')} of 5 steps`;
    refreshWeek();
  };

  // Live hooks shared between Step 4 and Step 5
  let targetChipsEl;
  let analyzerEl;
  let transcriptStatusEl;

  const targetPhrases = [lesson.pro.phrase, lesson.casual.phrase];

  const refreshLiveAnalysis = () => {
    const analysis = analyzeTranscript(day.transcript || '', {
      durationSec: day.durationSec || 0,
      targets: targetPhrases,
    });
    day.flags = analysis.flags.map(f => f.id);
    if (targetChipsEl) {
      targetChipsEl.replaceChildren(...analysis.targetHits.map(hit =>
        h('span', {
          class: `badge ${hit.used ? 'done' : ''}`,
          'data-target-chip': hit.phrase,
        }, hit.used ? `✓ Used: ${hit.phrase}` : `Try: ${hit.phrase}`)));
    }
    if (analyzerEl) {
      analyzerEl.replaceChildren(...renderAnalyzerNodes(analysis, day, lesson, planInfo));
    }
  };

  const focusBanner = h('section', { class: 'focus-banner stack-sm' },
    h('div', { class: 'row between' },
      h('h2', {}, lesson.topic),
      stepCountEl = h('span', { class: 'badge', 'data-testid': 'step-count' }, `${doneCount} of 5 steps`)),
    h('div', { class: 'row' },
      h('span', { class: 'badge work' }, `Work: ${lesson.pro.phrase}`),
      h('span', { class: 'badge casual' }, `Casual: ${lesson.casual.phrase}`)));

  /* --- Step 1: Listen & Decode --- */
  const step1Body = [
    h('p', { class: 'muted' }, 'Press Play, listen without peeking, type every word you hear, then Check to reveal fast American sound links.'),
    ...lesson.dictation.map((clip, i) => {
      const saved = day.dictation?.[i];
      const input = h('input', {
        type: 'text',
        value: saved?.text || '',
        placeholder: 'Type exactly what you hear...',
        'aria-label': `Type what you hear clip ${i + 1}`,
      });
      const resultBox = h('div', { class: 'stack-sm', 'data-testid': `diff-clip-${i}` });

      const showResult = (typedText) => {
        const diff = compareDictation(clip.text, typedText);
        day.dictation ||= {};
        day.dictation[i] = { text: typedText, score: diff.score };
        saveDay(day);
        resultBox.replaceChildren(
          h('div', { class: 'row between' },
            h('strong', { class: 'small-text' }, `Match: ${diff.score}% (${diff.matched}/${diff.total} words)`),
            h('span', { class: 'muted small-text' }, 'Green = hit · Underline = missed')),
          h('div', { class: 'diff-box' }, diff.tokens.map(t =>
            h('span', { class: `tok tok-${t.state}` }, t.word))),
          h('div', { class: 'sound-box stack-sm' },
            h('div', {}, h('strong', {}, 'Actual words: '), clip.text),
            h('div', {}, h('strong', {}, 'Fast sound: '), clip.sound),
            h('div', { class: 'muted small-text' }, clip.tip)));
      };

      if (saved) showResult(saved.text);

      return h('div', { class: 'subcard stack-sm' },
        h('div', { class: 'row between' },
          h('span', { class: 'badge' }, clip.context),
          h('div', { class: 'row' },
            h('button', { class: 'soft-btn', type: 'button', onclick: () => sayText(clip.text, 0) }, `▶ Play ${i + 1}`),
            h('button', { class: 'ghost', type: 'button', onclick: () => sayText(clip.text, -0.22) }, `0.8× Slow ${i + 1}`))),
        input,
        h('div', { class: 'row end' },
          h('button', {
            class: 'primary',
            type: 'button',
            'data-testid': `check-clip-${i}`,
            onclick: () => {
              showResult(input.value);
              if (day.dictation?.[0] && day.dictation?.[1]) {
                day.steps ||= {};
                day.steps.listen = true;
                saveDay(day);
                updateFocusCounter();
              }
            },
          }, 'Check')),
        resultBox);
    }),
    h('div', { class: 'subcard stack-sm' },
      h('strong', { class: 'small-text' }, 'Hear real Americans say today\'s phrases (YouGlish US)'),
      h('div', { class: 'row' },
        h('a', { class: 'ghost', href: youglishUrl(lesson.pro.phrase), target: '_blank', rel: 'noopener noreferrer' }, `Hear "${lesson.pro.phrase}" ↗`),
        h('a', { class: 'ghost', href: youglishUrl(lesson.casual.phrase), target: '_blank', rel: 'noopener noreferrer' }, `Hear "${lesson.casual.phrase}" ↗`))),
    stepDoneButton(day, 'listen', 'Step 1', () => { saveDay(day); render(); }),
  ];

  /* --- Step 2: Phrase Upgrade & Shadowing --- */
  const renderPhraseCard = (kind, data) => {
    const label = kind === 'pro' ? 'Work Upgrade' : 'Casual Everyday';
    const badgeCls = kind === 'pro' ? 'work' : 'casual';
    return h('div', { class: 'subcard stack-sm' },
      h('div', { class: 'phrase-head' },
        h('div', { class: 'stack-sm' },
          h('span', { class: `badge ${badgeCls}` }, `${label} · ${data.pos}`),
          h('div', { class: 'phrase-word' }, data.phrase)),
        h('button', {
          class: 'soft-btn',
          type: 'button',
          'aria-label': `Listen to ${data.phrase}`,
          onclick: () => sayText(data.phrase, 0),
        }, '🔊 Listen')),
      h('p', {}, data.meaning),
      h('div', { class: 'chips' },
        h('span', { class: 'chip' }, h('strong', {}, 'Stress: '), data.stress),
        h('span', { class: 'chip' }, h('strong', {}, 'Fast link: '), data.fastLink)),
      h('div', { class: 'chips' }, data.collocations.map(c => h('span', { class: 'chip muted' }, c))),
      h('div', { class: 'stack-sm' }, data.sentences.map((s, idx) => {
        const repKey = `${kind}-${idx}`;
        const count = day.reps?.[repKey] || 0;
        const rateOffset = s.tag === 'Slow' ? -0.18 : s.tag === 'Fast' ? 0.14 : 0;
        const repBtn = h('button', {
          class: `rep-btn${count >= 3 ? ' hit' : ''}`,
          type: 'button',
          'data-testid': `rep-${repKey}`,
          'aria-label': `Speak count for ${kind} sentence ${idx + 1}: ${count} of 3`,
          onclick: () => {
            day.reps ||= {};
            const next = ((day.reps[repKey] || 0) + 1) % 6;
            day.reps[repKey] = next;
            repBtn.textContent = `${next}/3`;
            repBtn.classList.toggle('hit', next >= 3);
            repBtn.setAttribute('aria-label', `Speak count for ${kind} sentence ${idx + 1}: ${next} of 3`);
            saveDay(day);
            refreshWeek();
          },
        }, `${count}/3`);
        return h('div', { class: 'sent-row' },
          h('span', { class: 'sent-tag' }, s.tag),
          h('div', { class: 'stack-sm' },
            h('span', {}, s.text)),
          h('div', { class: 'row' },
            h('button', {
              class: 'mini-btn',
              type: 'button',
              'aria-label': `Play ${kind} sentence ${idx + 1}`,
              onclick: () => sayText(s.text, rateOffset),
            }, '🔊'),
            repBtn));
      })));
  };

  const swap = swapById(lesson.swapId);
  const drill = drillById(lesson.drillId);

  const step2Body = [
    renderPhraseCard('pro', lesson.pro),
    renderPhraseCard('casual', lesson.casual),
    h('div', { class: 'subcard stack-sm' },
      h('div', { class: 'row between' },
        h('span', { class: 'badge flag' }, `Daily Swap · ${swap.category}`),
        h('button', { class: 'mini-btn', type: 'button', 'aria-label': 'Hear swap example', onclick: () => sayText(swap.example, 0) }, '🔊')),
      h('p', {}, h('strong', {}, 'Instead of: '), swap.habit),
      h('p', {}, h('strong', {}, 'Say: '), swap.natural.join(' / ')),
      h('p', { class: 'muted small-text' }, swap.why),
      h('p', { class: 'small-text' }, h('strong', {}, 'Example: '), swap.example)),
    h('div', { class: 'subcard stack-sm' },
      h('span', { class: 'badge' }, '60-Second Clarity Drill'),
      h('strong', {}, drill.title),
      h('p', { class: 'muted small-text' }, drill.cue),
      h('div', { class: 'chips' }, drill.pairs.map(pair => h('button', {
        class: 'ghost',
        type: 'button',
        onclick: () => sayText(pair.replace('—', ', '), -0.1),
      }, `🔊 ${pair}`)))),
    stepDoneButton(day, 'shadow', 'Step 2', () => { saveDay(day); render(); }),
  ];

  /* --- Step 3: Story Flow & Dialogue --- */
  const turnRows = [];
  const waitBanner = h('div', { class: 'sound-box row between', hidden: true });
  const updateActiveTurn = () => {
    turnRows.forEach((row, idx) => {
      const active = S.activeTurn?.date === date && S.activeTurn?.index === idx;
      row.classList.toggle('turn-active', active);
    });
    if (S.activeTurn?.date === date && S.activeTurn?.waitingForYou) {
      waitBanner.hidden = false;
      waitBanner.replaceChildren(
        h('strong', { class: 'small-text' }, 'Your turn — speak your line aloud, then tap Next.'),
        h('button', {
          class: 'primary',
          type: 'button',
          onclick: () => {
            const resume = S.activeTurn?.resume;
            if (resume) resume();
          },
        }, 'Next line →'));
    } else {
      waitBanner.hidden = true;
    }
  };

  let playDialogueBtn;
  const rolePlayBtn = h('button', {
    class: 'ghost',
    type: 'button',
    'aria-pressed': String(S.rolePlay),
    'data-testid': 'roleplay-toggle',
    onclick: () => {
      S.rolePlay = !S.rolePlay;
      rolePlayBtn.setAttribute('aria-pressed', String(S.rolePlay));
    },
  }, 'Role-Play Mode (You speak)');

  playDialogueBtn = h('button', {
    class: 'soft-btn',
    type: 'button',
    onclick: () => {
      if (S.activeTurn?.date === date) {
        stopDialoguePlayback();
        playDialogueBtn.textContent = '▶ Play Dialogue';
        updateActiveTurn();
        return;
      }
      playDialogueBtn.textContent = '⏹ Stop';
      S.stopDialogueFn = playDialogue(lesson.dialogue.turns, {
        voiceName: S.settings.voiceName,
        rate: S.settings.rate,
        rolePlay: S.rolePlay,
        onTurn: (index) => {
          S.activeTurn = { date, index, waitingForYou: false, resume: null };
          updateActiveTurn();
        },
        onWaitForYou: (index, resume) => {
          S.activeTurn = { date, index, waitingForYou: true, resume };
          updateActiveTurn();
        },
        onDone: () => {
          S.activeTurn = null;
          S.stopDialogueFn = null;
          playDialogueBtn.textContent = '▶ Play Dialogue';
          updateActiveTurn();
        },
      });
    },
  }, S.activeTurn?.date === date ? '⏹ Stop' : '▶ Play Dialogue');

  const step3Body = [
    ...lesson.stories.map((st, idx) => h('div', { class: 'subcard stack-sm' },
      h('div', { class: 'row between' },
        h('div', { class: 'row' },
          h('span', { class: `badge ${st.kind === 'Work' ? 'work' : 'casual'}` }, st.kind),
          h('strong', {}, st.title)),
        h('button', { class: 'mini-btn', type: 'button', 'aria-label': `Listen to story ${idx + 1}`, onclick: () => sayText(st.text, 0) }, '🔊')),
      h('p', {}, ...highlightConnectors(st.text, st.connectors)),
      h('p', { class: 'muted small-text' }, `Connectors highlighted: ${st.connectors.join(', ')}`))),
    h('div', { class: 'subcard stack-sm' },
      h('div', { class: 'row between' },
        h('strong', {}, `Dialogue · ${lesson.dialogue.kind}`),
        playDialogueBtn),
      h('p', { class: 'muted small-text' }, lesson.dialogue.context),
      h('div', { class: 'row' }, rolePlayBtn),
      waitBanner,
      h('div', { class: 'stack-sm' }, lesson.dialogue.turns.map((turn, idx) => {
        const isYou = turn.speaker === 'You';
        const el = h('div', { class: `turn${isYou ? ' turn-you' : ''}` },
          h('div', { class: 'turn-speaker' }, turn.speaker),
          h('p', {}, turn.text));
        turnRows.push(el);
        return el;
      }))),
    stepDoneButton(day, 'story', 'Step 3', () => { saveDay(day); render(); }),
  ];
  updateActiveTurn();

  /* --- Step 4: Speak & Record --- */
  const { challengeSection, transcriptArea } = buildSpeakAndRecordSection({
    date,
    day,
    framework: lesson.challenge.framework,
    title: lesson.challenge.title,
    prompt: lesson.challenge.prompt,
    bullets: lesson.challenge.bullets,
    targets: targetPhrases,
    onTranscriptInput: (val) => {
      day.transcript = val;
      refreshLiveAnalysis();
      if (transcriptStatusEl) transcriptStatusEl.textContent = 'Saved';
      scheduleSaveDay(day);
      refreshWeek();
    },
    onDurationChange: () => {
      refreshLiveAnalysis();
      saveDay(day);
    },
    setRefs: refs => {
      targetChipsEl = refs.targetChipsEl;
      transcriptStatusEl = refs.transcriptStatusEl;
    },
  });

  const step4Body = [
    challengeSection,
    stepDoneButton(day, 'speak', 'Step 4', () => { saveDay(day); render(); }),
  ];

  /* --- Step 5: Habit Check & Wrap-up --- */
  analyzerEl = h('div', { class: 'stack-sm', 'data-testid': 'analyzer-output' });
  refreshLiveAnalysis();

  const step5Body = [
    analyzerEl,
    ...buildWrapUpNodes(day, 'review', () => {
      saveDay(day);
      render();
    }),
  ];

  return [
    dateHeader(date, planInfo, dayNumberFor(date, S.settings.startDate)),
    weekEl = weekBlock(date),
    focusBanner,
    stepCard({ id: 'listen', num: '1', title: 'Listen & Decode', time: '~5 min', done: day.steps?.listen === true, openMap, body: step1Body }),
    stepCard({ id: 'shadow', num: '2', title: 'Phrase Upgrade & Shadowing', time: '~6 min', done: day.steps?.shadow === true, openMap, body: step2Body }),
    stepCard({ id: 'story', num: '3', title: 'Story Flow & Dialogue', time: '~5 min', done: day.steps?.story === true, openMap, body: step3Body }),
    stepCard({ id: 'speak', num: '4', title: 'Speak & Record', time: '~7 min', done: day.steps?.speak === true, openMap, body: step4Body }),
    stepCard({ id: 'review', num: '5', title: 'Habit Check & Wrap-up', time: '~3 min', done: day.steps?.review === true, openMap, body: step5Body }),
  ];
}

/* ---------- Weekly Story Review View (Every 7th Day) ---------- */

function reviewView(date, day, planInfo) {
  const openMap = stepOpenMap(date, ['recap', 'story', 'impromptu', 'reflect'], day);
  const doneCount = stepsDone(day, 'review');
  const weekTargets = planInfo.lessons.flatMap(l => [l.pro.phrase, l.casual.phrase]);

  let targetChipsEl;
  let analyzerEl;
  let transcriptStatusEl;

  const refreshLiveAnalysis = () => {
    const analysis = analyzeTranscript(day.transcript || '', {
      durationSec: day.durationSec || 0,
      targets: weekTargets,
    });
    day.flags = analysis.flags.map(f => f.id);
    if (targetChipsEl) {
      const usedCount = analysis.targetHits.filter(t => t.used).length;
      targetChipsEl.replaceChildren(
        h('span', { class: `badge ${usedCount >= 3 ? 'done' : ''}` }, `${usedCount} of 12 week phrases spotted in story`),
        ...analysis.targetHits.filter(t => t.used).map(t => h('span', { class: 'badge done' }, `✓ ${t.phrase}`)));
    }
    if (analyzerEl) {
      analyzerEl.replaceChildren(...renderAnalyzerNodes(analysis, day, null, planInfo));
    }
  };

  const focusBanner = h('section', { class: 'focus-banner stack-sm' },
    h('div', { class: 'row between' },
      h('span', { class: 'badge' }, `Weekly Story Review · Week ${planInfo.week}`),
      h('span', { class: 'badge', 'data-testid': 'step-count' }, `${doneCount} of 4 steps`)),
    h('h2', {}, '12-Phrase Integration & Spontaneous Fluency'),
    h('p', { class: 'muted small-text' }, 'Check off phrases that already feel natural, weave your week into one smooth story, and tackle three 60-second prompts.'));

  const step1Body = [
    h('p', { class: 'muted' }, 'Listen and tick every phrase from this week that feels natural to use in real conversation:'),
    h('div', { class: 'stack-sm' }, planInfo.lessons.map((l, idx) => {
      const renderItem = (phrase, kind) => {
        const checked = (day.mastered || []).includes(phrase);
        return h('div', { class: 'row between subcard' },
          h('label', { class: 'check', style: 'flex:1' },
            h('input', {
              type: 'checkbox',
              checked,
              'aria-label': `Feels natural: ${phrase}`,
              onchange: e => {
                const set = new Set(day.mastered || []);
                if (e.target.checked) set.add(phrase);
                else set.delete(phrase);
                day.mastered = [...set];
                saveDay(day);
              },
            }),
            h('span', { class: `badge ${kind === 'pro' ? 'work' : 'casual'}` }, kind === 'pro' ? 'Work' : 'Casual'),
            h('strong', {}, phrase)),
          h('button', { class: 'mini-btn', type: 'button', 'aria-label': `Listen to ${phrase}`, onclick: () => sayText(phrase, 0) }, '🔊'));
      };
      return h('div', { class: 'stack-sm' },
        h('span', { class: 'muted small-text' }, `Day ${(planInfo.week - 1) * 7 + idx + 1} · ${l.topic}`),
        renderItem(l.pro.phrase, 'pro'),
        renderItem(l.casual.phrase, 'casual'));
    })),
    stepDoneButton(day, 'recap', 'Review Step 1', () => { saveDay(day); render(); }),
  ];

  const step2Body = [
    h('p', {}, 'Tell one continuous 3-minute story about your real week (work wins, tricky moments, and weekend life) using 4–6 phrases above.'),
    h('div', { class: 'row' },
      h('button', {
        class: 'soft-btn',
        type: 'button',
        onclick: () => startTimer(180, {
          beep: S.settings.beep,
          label: 'Week in Stories',
          onFinish: elapsed => {
            day.durationSec = Math.max(day.durationSec || 0, elapsed);
            refreshLiveAnalysis();
            saveDay(day);
          },
        }),
      }, '⏱ Start 3:00 story timer')),
    stepDoneButton(day, 'story', 'Review Step 2', () => { saveDay(day); render(); }),
  ];

  const { challengeSection } = buildSpeakAndRecordSection({
    date,
    day,
    framework: 'STORY',
    title: '60-Second Impromptu Prompts',
    prompt: 'Pick one prompt below, think for 10 seconds, then speak non-stop for 60 seconds:',
    bullets: planInfo.prompts,
    targets: weekTargets,
    timerOverrideSec: 60,
    onTranscriptInput: val => {
      day.transcript = val;
      refreshLiveAnalysis();
      if (transcriptStatusEl) transcriptStatusEl.textContent = 'Saved';
      scheduleSaveDay(day);
      refreshWeek();
    },
    onDurationChange: () => {
      refreshLiveAnalysis();
      saveDay(day);
    },
    setRefs: refs => {
      targetChipsEl = refs.targetChipsEl;
      transcriptStatusEl = refs.transcriptStatusEl;
    },
  });

  const step3Body = [
    challengeSection,
    stepDoneButton(day, 'impromptu', 'Review Step 3', () => { saveDay(day); render(); }),
  ];

  analyzerEl = h('div', { class: 'stack-sm', 'data-testid': 'analyzer-output' });
  refreshLiveAnalysis();

  const step4Body = [
    analyzerEl,
    ...buildWrapUpNodes(day, 'reflect', () => { saveDay(day); render(); }),
  ];

  return [
    dateHeader(date, planInfo, dayNumberFor(date, S.settings.startDate)),
    weekEl = weekBlock(date),
    focusBanner,
    stepCard({ id: 'recap', num: '1', title: 'Week in Review — 12 Phrases', time: '~6 min', done: day.steps?.recap === true, openMap, body: step1Body }),
    stepCard({ id: 'story', num: '2', title: 'The Week in Stories', time: '~5 min', done: day.steps?.story === true, openMap, body: step2Body }),
    stepCard({ id: 'impromptu', num: '3', title: '60-Second Impromptu Prompts', time: '~8 min', done: day.steps?.impromptu === true, openMap, body: step3Body }),
    stepCard({ id: 'reflect', num: '4', title: 'Habit Check & Week Reflection', time: '~4 min', done: day.steps?.reflect === true, openMap, body: step4Body }),
  ];
}

/* ---------- Shared Speak & Record + Wrap-Up Builders ---------- */

function stepDoneButton(day, stepId, label, afterChange) {
  const done = day.steps?.[stepId] === true;
  return h('div', { class: 'row end' },
    h('button', {
      class: done ? 'primary is-done' : 'ghost',
      type: 'button',
      'data-testid': `done-${stepId}`,
      onclick: () => {
        day.steps ||= {};
        day.steps[stepId] = !done;
        afterChange();
      },
    }, done ? `${label} done ✓` : `Mark ${label} done`));
}

function buildSpeakAndRecordSection({ date, day, framework, title, prompt, bullets, targets, timerOverrideSec = null, onTranscriptInput, onDurationChange, setRefs }) {
  const challengeSec = timerOverrideSec || S.settings.challengeSec || 120;
  const targetChipsEl = h('div', { class: 'chips' });
  const transcriptStatusEl = h('span', { class: 'muted small-text', 'data-testid': 'transcript-status' }, day.transcript ? 'Saved' : '');

  const transcriptArea = h('textarea', {
    value: day.transcript || '',
    placeholder: 'Speak with live captions, paste voice-to-text from your phone, or jot key spoken sentences here for an offline habit check...',
    'aria-label': 'Spoken transcript or key points',
    oninput: () => onTranscriptInput(transcriptArea.value),
    onblur: () => saveDay(day),
  });

  const recSlot = h('div', { class: 'stack-sm' });
  const renderAudioSlot = () => {
    const url = S.recUrl[date];
    if (url) {
      recSlot.replaceChildren(
        h('audio', { controls: true, src: url }),
        h('div', { class: 'row end' },
          h('button', {
            class: 'ghost',
            type: 'button',
            onclick: async () => {
              try { URL.revokeObjectURL(url); } catch { }
              delete S.recUrl[date];
              delete day.hasRecording;
              await store.deleteRecording(date).catch(() => { });
              await saveDay(day);
              renderAudioSlot();
              toast('Audio recording removed.');
            },
          }, 'Delete audio')));
    } else if (day.hasRecording) {
      ensureRecordingLoaded(date, day);
      recSlot.replaceChildren(h('p', { class: 'muted small-text' }, 'Loading saved voice recording...'));
    } else {
      recSlot.replaceChildren();
    }
  };
  renderAudioSlot();

  const recBtn = h('button', {
    class: `danger${S.recordingDate === date ? ' recording' : ''}`,
    type: 'button',
    'data-testid': 'record-btn',
    onclick: async () => {
      if (S.recordingDate === date) {
        try {
          const out = await stopRecording();
          S.recordingDate = null;
          if (out?.blob) {
            await store.putRecording({ date, blob: out.blob, mimeType: out.mimeType, durationSec: out.durationSec, createdAt: Date.now() });
            if (S.recUrl[date]) { try { URL.revokeObjectURL(S.recUrl[date]); } catch { } }
            S.recUrl[date] = URL.createObjectURL(out.blob);
            day.hasRecording = true;
            day.durationSec = Math.max(day.durationSec || 0, out.durationSec);
            await saveDay(day);
            onDurationChange();
            toast(`Saved ${out.durationSec}s voice recording on device.`);
          }
        } catch {
          S.recordingDate = null;
          toast('Could not finish recording.');
        }
        render();
        return;
      }
      if (!canRecord()) {
        toast('Microphone recording is unavailable in this browser.');
        return;
      }
      try {
        await startRecording();
        S.recordingDate = date;
        render();
      } catch {
        toast('Microphone access denied or unavailable.');
      }
    },
  }, S.recordingDate === date ? [h('span', { class: 'rec-dot' }), ' Stop recording'] : '🎙 Record voice');

  const controls = [
    h('button', {
      class: 'soft-btn',
      type: 'button',
      'data-testid': 'start-speaking-timer',
      onclick: () => startTimer(challengeSec, {
        beep: S.settings.beep,
        label: title,
        onFinish: elapsed => {
          day.durationSec = Math.max(day.durationSec || 0, elapsed);
          onDurationChange();
          toast(`Logged ${elapsed}s of speaking.`);
        },
      }),
    }, `⏱ Start ${stamp(challengeSec)} timer`),
    recBtn,
  ];

  if (canDictate()) {
    const basePrefix = () => (transcriptArea.value.trim() ? `${transcriptArea.value.trim()} ` : '');
    let prefixSnapshot = '';
    const dictBtn = h('button', {
      class: 'ghost',
      type: 'button',
      'aria-pressed': String(S.dictatingDate === date),
      onclick: () => {
        if (S.dictatingDate === date) {
          stopDictation();
          S.dictatingDate = null;
          dictBtn.setAttribute('aria-pressed', 'false');
          dictBtn.textContent = '💬 Live captions';
          return;
        }
        try {
          prefixSnapshot = basePrefix();
          startDictation({
            onResult: ({ finalText, interimText }) => {
              const combined = [prefixSnapshot.trim(), finalText, interimText].filter(Boolean).join(' ');
              transcriptArea.value = combined;
              onTranscriptInput(combined);
            },
            onError: () => {
              S.dictatingDate = null;
              dictBtn.setAttribute('aria-pressed', 'false');
              dictBtn.textContent = '💬 Live captions';
              toast('Live speech captions stopped. You can type or paste text below.');
            },
            onEnd: () => {
              if (S.dictatingDate === date) {
                S.dictatingDate = null;
                dictBtn.setAttribute('aria-pressed', 'false');
                dictBtn.textContent = '💬 Live captions';
              }
            },
          });
          S.dictatingDate = date;
          dictBtn.setAttribute('aria-pressed', 'true');
          dictBtn.textContent = '⏹ Stop captions';
        } catch {
          toast('Live captions could not start in this browser.');
        }
      },
    }, S.dictatingDate === date ? '⏹ Stop captions' : '💬 Live captions');
    controls.push(dictBtn);
  }

  setRefs({ targetChipsEl, transcriptStatusEl });

  const challengeSection = h('div', { class: 'stack' },
    h('div', { class: 'subcard stack-sm' },
      h('div', { class: 'row between' },
        h('strong', {}, title),
        h('span', { class: 'badge' }, framework)),
      h('p', {}, prompt),
      h('ul', {}, bullets.map(b => h('li', {}, b)))),
    targetChipsEl,
    h('div', { class: 'row' }, controls),
    recSlot,
    h('label', { class: 'field' },
      h('div', { class: 'row between' },
        h('span', {}, 'Spoken transcript / notes (for Habit Check)'),
        transcriptStatusEl),
      transcriptArea),
    !canDictate() && h('p', { class: 'muted small-text' }, 'Tip: Use your phone/OS keyboard mic button or paste a voice memo transcript above for instant offline analysis.'));

  return { challengeSection, transcriptArea };
}

function renderAnalyzerNodes(analysis, day, lesson, planInfo) {
  const nodes = [
    h('div', { class: 'row' },
      h('span', { class: 'chip' }, `${analysis.words} words`),
      analysis.wpm != null && h('span', { class: 'chip' }, `${analysis.wpm} WPM`),
      h('span', { class: 'chip' }, `${analysis.sentences} sentences`)),
    h('p', { class: 'muted small-text' }, analysis.paceNote),
  ];

  if (analysis.words > 0 && analysis.flags.length === 0) {
    nodes.push(h('div', { class: 'subcard' }, h('span', { class: 'badge done' }, 'Clean! No common L1 habit traps detected.')));
  } else if (analysis.flags.length > 0) {
    nodes.push(h('div', { class: 'stack-sm' },
      h('strong', { class: 'small-text' }, `Habit check caught ${analysis.flags.length} item${analysis.flags.length === 1 ? '' : 's'}:`),
      ...analysis.flags.map(f => h('div', { class: 'flag-card stack-sm' },
        h('div', {}, h('strong', {}, f.label), ` (“${f.match}”)`),
        h('p', { class: 'small-text' }, f.suggestion)))));
  }

  nodes.push(h('div', { class: 'row' },
    h('button', {
      class: 'ghost',
      type: 'button',
      onclick: async () => {
        const proPhrase = lesson ? lesson.pro.phrase : planInfo.lessons[0].pro.phrase;
        const casualPhrase = lesson ? lesson.casual.phrase : planInfo.lessons[0].casual.phrase;
        const prompt = buildAiCoachPrompt({
          dayNumber: planInfo.dayNumber,
          topic: lesson ? lesson.topic : `Week ${planInfo.week} Review`,
          proPhrase,
          casualPhrase,
          challengeTitle: lesson ? lesson.challenge.title : 'Weekly Story Integration',
          transcript: day.transcript || '',
          flags: analysis.flags,
        });
        const ok = await copyText(prompt);
        toast(ok ? 'AI Coach prompt copied! Paste into any AI chat for feedback.' : 'Could not copy to clipboard.');
      },
    }, '📋 Copy AI Coach Prompt')));

  return nodes;
}

function buildWrapUpNodes(day, stepKey, afterSave) {
  const minInput = h('input', {
    type: 'number',
    inputmode: 'numeric',
    min: 1,
    max: 180,
    value: day.minutes || S.settings.dailyGoal,
    'aria-label': 'Minutes practiced',
    onchange: () => {
      const val = Number.parseInt(minInput.value, 10);
      if (Number.isFinite(val) && val > 0) {
        day.minutes = Math.min(300, val);
        saveDay(day);
        refreshWeek();
      }
    },
  });

  const winInput = h('input', {
    type: 'text',
    value: day.win || '',
    placeholder: 'e.g., Used BLUF cleanly in morning standup',
    'aria-label': 'Win of the day',
    oninput: () => {
      day.win = winInput.value.slice(0, 500);
      scheduleSaveDay(day);
    },
    onblur: () => saveDay(day),
  });

  const done = day.steps?.[stepKey] === true;

  return [
    h('div', { class: 'stack-sm' },
      h('span', { class: 'muted small-text' }, 'How did speaking feel today?'),
      h('div', { class: 'conf-grid' }, CONFIDENCE_LEVELS.map(c => h('button', {
        class: 'conf-btn',
        type: 'button',
        'data-confidence': c.id,
        'aria-pressed': String(day.confidence === c.id),
        onclick: () => {
          day.confidence = c.id;
          afterSave();
        },
      }, c.label)))),
    h('label', { class: 'field' }, h('span', {}, 'One win to remember today'), winInput),
    h('div', { class: 'row between' },
      h('label', { class: 'field', style: 'max-width: 140px' }, h('span', {}, 'Minutes practiced'), minInput),
      h('button', {
        class: `primary${done ? ' is-done' : ''}`,
        type: 'button',
        'data-testid': 'finish-day',
        onclick: () => {
          day.steps ||= {};
          day.steps[stepKey] = true;
          const m = Number.parseInt(minInput.value, 10);
          day.minutes = Number.isFinite(m) && m > 0 ? Math.min(300, m) : S.settings.dailyGoal;
          day.confidence ||= 'steady';
          afterSave();
          toast('Great work! Day logged on this device.');
        },
      }, done ? 'Day Completed ✓' : 'Finish Day')),
  ];
}

/* ---------- Progress Screen ---------- */

function progressView() {
  const startDate = S.settings.startDate || S.today;
  const currentWeek = Math.max(1, programWeek(S.today, startDate));
  const rows = programRows(S.days, startDate, S.settings.dailyGoal, WEEKS);
  const totals = programTotals(S.days, rows, startDate);
  const st = streaks(S.days, S.today);
  const history = fluencyHistory(S.days);

  // Aggregate caught L1 habits across all logged days
  const habitCounts = {};
  for (const d of Object.values(S.days)) {
    for (const f of d.flags || []) habitCounts[f] = (habitCounts[f] || 0) + 1;
  }
  const topHabits = Object.entries(habitCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const calRows = Array.from({ length: WEEKS }, (_, wIdx) => {
    const week = wIdx + 1;
    const dates = planWeekDates(startDate, week);
    return h('div', { class: 'cal-row' },
      h('span', { class: 'cal-week-lbl' }, `W${week}`),
      dates.map((iso, dIdx) => cell(iso, { showDayNum: wIdx * 7 + dIdx + 1, isReview: dIdx === 6 })));
  });

  return [
    h('h1', {}, 'Progress'),
    h('div', { class: 'tiles' },
      h('div', { class: 'tile' },
        h('span', { class: 'muted' }, 'Practice sessions'),
        h('b', { 'data-testid': 'total-sessions' }, `${totals.sessions} of ${TOTAL_DAYS}`)),
      h('div', { class: 'tile' },
        h('span', { class: 'muted' }, 'Total minutes'),
        h('b', { 'data-testid': 'total-minutes' }, String(totals.minutes))),
      h('div', { class: 'tile' },
        h('span', { class: 'muted' }, 'Current streak'),
        h('b', { 'data-testid': 'current-streak' }, `${st.current} day${st.current === 1 ? '' : 's'}`),
        h('span', { class: 'muted small-text' }, `Best: ${st.best}`)),
      h('div', { class: 'tile' },
        h('span', { class: 'muted' }, 'Phrases practiced'),
        h('b', { 'data-testid': 'phrases-practiced' }, `${totals.phrases} of ${ALL_LESSONS.length * 2}`))),
    h('section', { class: 'card stack' },
      h('h2', {}, '12-Week Calendar'),
      h('div', { class: 'calendar calendar-wrap' }, calRows),
      h('div', { class: 'legend' },
        h('span', {}, h('i', { style: 'background:var(--done)' }), 'Complete'),
        h('span', {}, h('i', { style: 'background:var(--review)' }), 'Story Review'),
        h('span', {}, h('i', { style: 'background:var(--partial)' }), 'In progress'),
        h('span', {}, h('i', { style: 'background:var(--empty);border:1px dashed var(--line-strong)' }), 'Missed'))),
    h('section', { class: 'card stack' },
      h('h2', {}, 'Minutes per week'),
      weeklyBars({ rows, goal: WEEKLY_GOAL_MIN, currentWeek })),
    h('section', { class: 'card stack' },
      h('h2', {}, 'Speaking output over time'),
      history.some(p => p.words > 0)
        ? fluencyChart({ points: history.filter(p => p.words > 0) })
        : h('p', { class: 'muted' }, 'Save a spoken transcript in Step 4 to chart words spoken and pace over time.')),
    h('section', { class: 'card stack' },
      h('h2', {}, 'Top Caught Habits'),
      topHabits.length
        ? topHabits.map(([id, count]) => {
          const swap = TAMIL_US_SWAPS.find(s => s.id === id);
          return h('div', { class: 'subcard row between' },
            h('div', { class: 'stack-sm' },
              h('strong', {}, swap ? swap.habit : id),
              swap && h('span', { class: 'muted small-text' }, `Try: ${swap.natural[0]}`)),
            h('span', { class: 'badge flag' }, `${count}×`));
        })
        : h('p', { class: 'muted' }, 'No recurring habits flagged yet—paste or dictate a story in Step 4 to track habits over time.')),
  ];
}

/* ---------- Reference Screen ---------- */

function referenceView() {
  const searchInput = h('input', {
    type: 'search',
    value: S.refSearch,
    placeholder: 'Search Tamil-to-US swaps, e.g. doubt, prepone, only...',
    'aria-label': 'Search upgrades, idioms, or drills',
  });

  const swapList = h('div', { class: 'stack-sm', 'data-testid': 'swap-list' });
  const renderSwaps = () => {
    const q = S.refSearch.trim().toLowerCase();
    const matches = TAMIL_US_SWAPS.filter(s => {
      if (S.refCategory !== 'All' && s.category !== S.refCategory) return false;
      if (!q) return true;
      return [s.habit, s.why, s.example, ...s.natural].some(t => t.toLowerCase().includes(q));
    });
    if (!matches.length) {
      swapList.replaceChildren(h('p', { class: 'muted' }, 'No matching upgrades found.'));
      return;
    }
    swapList.replaceChildren(...matches.map(s => h('div', { class: 'subcard stack-sm', 'data-swap': s.id },
      h('div', { class: 'row between' },
        h('span', { class: `badge ${s.category === 'Work' ? 'work' : 'casual'}` }, s.category),
        h('button', { class: 'mini-btn', type: 'button', 'aria-label': `Hear ${s.id} example`, onclick: () => sayText(s.example, 0) }, '🔊')),
      h('p', {}, h('strong', {}, 'Habit: '), s.habit),
      h('p', {}, h('strong', {}, 'Natural US: '), s.natural.join(' · ')),
      h('p', { class: 'muted small-text' }, s.why),
      h('p', { class: 'small-text' }, h('strong', {}, 'Say: '), s.example))));
  };

  searchInput.addEventListener('input', () => {
    S.refSearch = searchInput.value;
    renderSwaps();
  });

  const filterRow = h('div', { class: 'row' }, ['All', 'Work', 'Casual'].map(cat => h('button', {
    class: 'ghost',
    type: 'button',
    'aria-pressed': String(S.refCategory === cat),
    onclick: () => {
      S.refCategory = cat;
      for (const b of filterRow.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.textContent === cat));
      renderSwaps();
    },
  }, cat)));

  renderSwaps();

  const phaseCards = PHASES.map((phase, pIdx) => {
    const startIdx = pIdx * 24;
    const slice = ALL_LESSONS.slice(startIdx, startIdx + 24);
    return h('details', { class: 'card step-card', open: pIdx === 0 },
      h('summary', {},
        h('span', { class: 'strong' }, `Phase ${phase.id}: ${phase.name} (Weeks ${phase.weeks[0]}–${phase.weeks[1]})`),
        h('span', { class: 'muted small-text' }, '24 lessons')),
      h('div', { class: 'step-body' },
        h('p', { class: 'muted small-text' }, phase.focus),
        ...slice.map((l, idx) => {
          const absIdx = startIdx + idx;
          const week = Math.floor(absIdx / 6) + 1;
          const dayInWeek = (absIdx % 6) + 1;
          const planDay = (week - 1) * 7 + dayInWeek;
          return h('div', { class: 'subcard row between' },
            h('div', { class: 'stack-sm' },
              h('span', { class: 'muted small-text' }, `Day ${planDay} · ${l.topic}`),
              h('div', { class: 'small-text' }, h('strong', {}, l.pro.phrase), ' · ', l.casual.phrase)),
            h('button', {
              class: 'mini-btn',
              type: 'button',
              'aria-label': `Listen to Day ${planDay} phrases`,
              onclick: () => sayText(`${l.pro.phrase}. ${l.casual.phrase}`, 0),
            }, '🔊'));
        })));
  });

  return [
    h('h1', {}, 'Reference'),
    h('section', { class: 'card stack' },
      h('h2', {}, 'Tamil → US English Upgrade Cheat Sheet'),
      searchInput,
      filterRow,
      swapList),
    h('section', { class: 'card stack' },
      h('h2', {}, '4 Physical Clarity Drills'),
      CLARITY_DRILLS.map(d => h('div', { class: 'subcard stack-sm' },
        h('strong', {}, d.title),
        h('p', { class: 'muted small-text' }, d.why),
        h('p', { class: 'small-text' }, h('strong', {}, 'Physical cue: '), d.cue),
        h('div', { class: 'chips' }, d.pairs.map(p => h('button', {
          class: 'ghost',
          type: 'button',
          onclick: () => sayText(p.replace('—', ', '), -0.1),
        }, `🔊 ${p}`)))))),
    h('section', { class: 'card stack' },
      h('h2', {}, 'Speaking Frameworks'),
      FRAMEWORKS.map(f => h('div', { class: 'subcard stack-sm' },
        h('strong', {}, f.name),
        h('span', { class: 'muted small-text' }, `Best for: ${f.when}`),
        h('p', { class: 'small-text' }, f.why),
        h('ul', {}, f.steps.map(s => h('li', { class: 'small-text' }, s))),
        h('p', { class: 'small-text' }, h('strong', {}, 'Example: '), f.example)))),
    h('h2', {}, '12-Week Curriculum Index'),
    ...phaseCards,
  ];
}

/* ---------- Data & Settings Screen ---------- */

function dataView() {
  const voices = listEnUsVoices();
  const voiceOptions = [['', 'Default browser US English'], ...voices.map(v => [v.name, `${v.name} (${v.lang})`])];
  const voiceSel = select('American voice', S.settings.voiceName || '', voiceOptions, async v => {
    S.settings.voiceName = v || null;
    await saveSettings();
  });

  const rateSel = select('Speech speed', S.settings.rate || 1.0, [
    ['0.85', '0.85× Slow & clear'],
    ['1', '1.0× Natural US pace'],
    ['1.1', '1.1× Brisk'],
  ], async v => {
    S.settings.rate = Number(v);
    await saveSettings();
  });

  const goalSel = select('Daily goal minutes', S.settings.dailyGoal, DAILY_GOAL_OPTIONS.map(m => [m, `${m} min / day`]), async v => {
    S.settings.dailyGoal = Number(v);
    await saveSettings();
  });

  const timerSel = select('Speaking challenge timer', S.settings.challengeSec, CHALLENGE_TIMERS.map(sec => [sec, stamp(sec)]), async v => {
    S.settings.challengeSec = Number(v);
    await saveSettings();
  });

  const beepBox = h('input', {
    type: 'checkbox',
    checked: S.settings.beep,
    onchange: async e => {
      S.settings.beep = e.target.checked;
      await saveSettings();
    },
  });

  const rem = S.settings.reminder;
  const remCheck = h('input', {
    type: 'checkbox',
    checked: rem.enabled,
    onchange: async e => {
      rem.enabled = e.target.checked;
      if (rem.enabled && 'Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission().catch(() => { });
      }
      await saveSettings();
    },
  });
  const remTime = h('input', {
    type: 'time',
    value: rem.time,
    'aria-label': 'Reminder time',
    onchange: async () => {
      if (remTime.value) {
        rem.time = remTime.value;
        await saveSettings();
      }
    },
  });

  const DAYS = [
    [1, 'Mon', 'Monday'], [2, 'Tue', 'Tuesday'], [3, 'Wed', 'Wednesday'],
    [4, 'Thu', 'Thursday'], [5, 'Fri', 'Friday'], [6, 'Sat', 'Saturday'], [0, 'Sun', 'Sunday'],
  ];

  const totalAudioBytes = S.recMeta.reduce((n, r) => n + (r.size || 0), 0);
  const audioMb = (totalAudioBytes / (1024 * 1024)).toFixed(1);

  return [
    h('h1', {}, 'Data & Settings'),
    h('section', { class: 'card stack' },
      h('h2', {}, 'Speech & Practice Settings'),
      h('label', { class: 'field' }, h('span', {}, 'American voice'), voiceSel),
      h('div', { class: 'row' },
        h('button', {
          class: 'ghost',
          type: 'button',
          onclick: () => sayText('Let\'s do a quick sanity check so we stay on the same page.', 0),
        }, '🔊 Test voice')),
      h('label', { class: 'field' }, h('span', {}, 'Speech speed'), rateSel),
      h('label', { class: 'field' }, h('span', {}, 'Daily goal'), goalSel),
      h('label', { class: 'field' }, h('span', {}, 'Default speaking timer'), timerSel),
      h('label', { class: 'check' }, beepBox, h('span', {}, 'Timer finish chime'))),
    h('section', { class: 'card stack' },
      h('h2', {}, 'Daily Reminder'),
      h('label', { class: 'check' }, remCheck, h('span', {}, 'Daily practice reminder')),
      h('label', { class: 'field' }, h('span', {}, 'Reminder time'), remTime),
      h('div', { class: 'days-row' }, DAYS.map(([num, short, full]) => {
        const active = rem.days.includes(num);
        return h('button', {
          class: 'day-pill',
          type: 'button',
          'aria-label': `Remind on ${full}`,
          'aria-pressed': String(active),
          onclick: async e => {
            const next = new Set(rem.days);
            if (next.has(num)) next.delete(num);
            else next.add(num);
            rem.days = [...next];
            e.currentTarget.setAttribute('aria-pressed', String(rem.days.includes(num)));
            await saveSettings();
          },
        }, short);
      })),
      h('div', { class: 'row' },
        h('button', {
          class: 'ghost',
          type: 'button',
          onclick: () => {
            const info = reminderFor(S.today, S.settings.startDate);
            toast(info.title);
          },
        }, 'Test reminder'),
        h('button', {
          class: 'ghost',
          type: 'button',
          onclick: () => {
            const ics = makeCalendar({ startDate: S.settings.startDate, reminder: rem, today: S.today });
            download('english-fluency-reminders.ics', ics, 'text/calendar');
            toast('Downloaded calendar reminders (.ics).');
          },
        }, 'Add to calendar (.ics)'))),
    h('section', { class: 'card stack' },
      h('h2', {}, 'Local Voice Recordings'),
      h('p', { class: 'muted' }, `${S.recMeta.length} voice recording${S.recMeta.length === 1 ? '' : 's'} saved on this device (${audioMb} MB). Audio stays strictly local and is not included in JSON backups.`),
      h('div', { class: 'row' },
        h('button', {
          class: 'ghost',
          type: 'button',
          disabled: S.recMeta.length === 0,
          onclick: async () => {
            if (!await confirmIt('Clear saved audio?', 'This deletes all locally stored voice recordings while keeping your transcripts and streak.', 'Clear audio')) return;
            await store.clearRecordings();
            revokeAllAudioUrls();
            for (const d of Object.values(S.days)) {
              if (d.hasRecording) {
                delete d.hasRecording;
                await saveDay(d);
              }
            }
            S.recMeta = [];
            render();
            toast('Saved voice recordings cleared.');
          },
        }, 'Clear saved audio'))),
    h('section', { class: 'card stack' },
      h('h2', {}, 'Backup & Reset'),
      h('p', { class: 'muted' }, 'Download a JSON backup of your daily progress, dictation scores, transcripts, and settings anytime.'),
      h('div', { class: 'row' },
        h('button', {
          class: 'primary',
          type: 'button',
          onclick: () => {
            const list = Object.values(S.days).filter(d => !isEmptyDay(d));
            const json = makeBackup(list, S.settings, new Date().toISOString());
            download(`english-fluency-${S.today}.json`, json, 'application/json');
            S.lastBackup = S.today;
            toast('Backup downloaded.');
          },
        }, 'Download backup'),
        h('label', { class: 'ghost file-btn' },
          'Restore backup',
          h('input', {
            type: 'file',
            accept: 'application/json,.json',
            'aria-label': 'Restore backup file',
            onchange: async e => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              let parsed;
              try {
                parsed = parseBackup(await file.text());
              } catch (err) {
                toast(err.message);
                return;
              }
              const body = `Replace current logs with ${parsed.days.length} saved day${parsed.days.length === 1 ? '' : 's'} from this backup?`;
              if (!await confirmIt('Replace current data?', body, 'Replace')) return;
              const nextSettings = { ...defaultSettings(), ...parsed.settings };
              if (parsed.settings.reminder) nextSettings.reminder = { ...DEFAULT_REMINDER, ...parsed.settings.reminder };
              await store.replaceAll(parsed.days, nextSettings);
              S.settings = nextSettings;
              S.days = Object.fromEntries(parsed.days.map(d => [d.date, d]));
              S.openSteps = {};
              S.date = S.today;
              S.view = 'today';
              render({ top: true });
              toast('Backup restored.');
            },
          }))),
      h('div', { class: 'row' },
        h('button', {
          class: 'danger',
          type: 'button',
          onclick: async () => {
            if (!await confirmIt('Erase all data?', 'This removes all practice logs, transcripts, voice recordings, and settings from this device.', 'Erase')) return;
            await store.eraseAll();
            revokeAllAudioUrls();
            S.days = {};
            S.settings = defaultSettings();
            S.openSteps = {};
            S.recMeta = [];
            S.date = S.today;
            S.view = 'today';
            render({ top: true });
            toast('All data erased.');
          },
        }, 'Erase all data'))),
  ];
}

/* ---------- Navigation & Boot ---------- */

function checkDueReminder() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  if (!reminderDue({
    reminder: S.settings.reminder,
    date: S.today,
    nowTime: `${hh}:${mm}`,
    day: S.days[S.today],
    lastSent: S.lastReminder,
  })) return;
  S.lastReminder = S.today;
  const info = reminderFor(S.today, S.settings.startDate);
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification(info.title, { body: info.body }); } catch { toast(info.title); }
  } else {
    toast(info.title);
  }
}

function render({ top = false } = {}) {
  for (const btn of document.querySelectorAll('nav button')) {
    if (btn.dataset.view === S.view) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  }

  let nodes;
  if (!S.settings.startDate && S.view === 'today') {
    nodes = setupView();
  } else if (S.view === 'today') {
    const startDate = S.settings.startDate || S.today;
    const rawNum = dayNumberFor(S.date, startDate);
    const dayNum = planDayFor(S.date, startDate);
    const planInfo = lessonForDay(dayNum);
    const day = getDay(S.date);
    nodes = planInfo.kind === 'review'
      ? reviewView(S.date, day, planInfo)
      : practiceView(S.date, day, planInfo);
  } else if (S.view === 'progress') {
    nodes = progressView();
  } else if (S.view === 'reference') {
    nodes = referenceView();
  } else {
    nodes = dataView();
  }

  main.replaceChildren(...nodes);
  if (top) window.scrollTo(0, 0);
}

for (const btn of document.querySelectorAll('nav button')) {
  btn.addEventListener('click', async () => {
    stopDialoguePlayback();
    S.view = btn.dataset.view;
    if (S.view === 'data') {
      S.recMeta = await store.allRecordingMeta().catch(() => []);
    }
    render({ top: true });
  });
}

(async function boot() {
  const [savedDays, savedSettings] = await Promise.all([
    store.allDays().catch(() => []),
    store.getKv('settings').catch(() => null),
  ]);
  S.days = Object.fromEntries((savedDays || []).map(d => [d.date, d]));
  if (savedSettings) {
    S.settings = { ...defaultSettings(), ...savedSettings };
    if (savedSettings.reminder) S.settings.reminder = { ...DEFAULT_REMINDER, ...savedSettings.reminder };
  }
  render();
  checkDueReminder();
  setInterval(checkDueReminder, 60000);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => { });
  }
})();
