/**
 * Time & elapsed time question generator, drawn with KlgClock.
 * Reads ?type=clock|match|elapsed from the URL to practice one skill;
 * defaults to a mix. ?level=1 (o'clock and half past), 2 (default, every
 * quarter and 5 minutes) or 3 (any minute) sets how fine the clocks are.
 *
 * Question kinds:
 *  - clock reading: an analog clock face — what time is it?
 *  - match clock:   a time in words — tap the clock that shows it
 *  - end time:      "Soccer practice starts at 4:30 PM and lasts 45 minutes.
 *                    When does it end?" with a timeline strip
 *  - elapsed time:  "How much time passes from 2:20 PM to 4:05 PM?" on a timeline
 *  - conversion:    "How many minutes are in 2 hours 15 minutes?"
 *
 * Distractors are the mistakes kids actually make: reading the hour hand
 * one hour off, dropping or double-counting an hour when crossing it, and
 * the classic "2 hours 15 minutes = 215 minutes" concatenation error.
 *
 * Times are handled as minutes-since-midnight so end times that cross noon
 * (11:30 AM + 45 minutes = 12:15 PM) come out right for free.
 *
 * Best-time record: same rules as the other quizzes — saved per mode in
 * localStorage, only for perfect scores.
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function fmtClock(hour, minute) {
  return `${hour}:${pad2(minute)}`;
}

function fmt12(mins) {
  const h24 = Math.floor(mins / 60) % 24;
  const ampm = h24 < 12 ? "AM" : "PM";
  return `${h24 % 12 || 12}:${pad2(mins % 60)} ${ampm}`;
}

function fmtDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

function durationPhrase(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} minutes`;
  const hours = h === 1 ? "1 hour" : `${h} hours`;
  return m === 0 ? hours : `${hours} ${m} minutes`;
}

/** Pick 3 wrong choices by offsetting the correct value. */
function offsetWrongs(correct, offsets, isValid, fmt) {
  const wrongs = new Set();
  for (const off of shuffle(offsets)) {
    const v = correct + off;
    if (isValid(v)) wrongs.add(fmt(v));
    if (wrongs.size === 3) break;
  }
  return [...wrongs];
}

const level = [1, 3].includes(Number(new URLSearchParams(window.location.search).get("level")))
  ? Number(new URLSearchParams(window.location.search).get("level")) : 2;
const CK = window.KlgClock;

/** A time to show on a clock: hour 1–12 and a minute that suits the level. */
function pickTime() {
  const hour = randomInt(1, 12);
  const minute = level === 1 ? [0, 30][randomInt(0, 1)]
    : level === 2 ? 5 * randomInt(0, 11)
    : randomInt(0, 59);
  return [hour, minute];
}

/** Wrong times kids really give: hour read one off, the two hands swapped, wrong half. */
function clockWrongs(hour, minute) {
  const next = (hour % 12) + 1, prev = ((hour + 10) % 12) + 1;
  const list = [
    [hour, minute === 0 ? 30 : 0],
    [next, minute],
    [prev, minute],
    [hour, (minute + 30) % 60],
    [hour, (minute + 5) % 60],
    [hour, (minute + 55) % 60],
  ];
  if (minute % 5 === 0 && minute !== 0 && hour * 5 % 60 !== minute) list.push([minute / 5 || 12, (hour * 5) % 60]); // hands swapped
  if (level === 3) list.push([hour, (minute + 1) % 60], [hour, (minute + 59) % 60]);
  const seen = new Set([fmtClock(hour, minute)]);
  const out = [];
  for (const [h, m] of shuffle(list)) {
    const text = fmtClock(h, m);
    if (!seen.has(text)) { seen.add(text); out.push([h, m]); }
  }
  return out.slice(0, 3);
}

function makeClockQuestion() {
  const [hour, minute] = pickTime();
  const correct = fmtClock(hour, minute);
  const wrongs = clockWrongs(hour, minute).map(([h, m]) => fmtClock(h, m));
  return {
    visual: CK.face(hour, minute),
    prompt: "What time does the clock show?",
    dedupeKey: "clock:" + correct,
    correctAnswer: correct,
    choices: shuffle([correct, ...wrongs]),
    explanation: `The short hand is near ${hour} and the long hand shows ${minute} minutes: ${correct}.`,
  };
}

function makeMatchClockQuestion() {
  const [hour, minute] = pickTime();
  const correct = fmtClock(hour, minute);
  const times = [[hour, minute], ...clockWrongs(hour, minute)];
  const q = {
    prompt: `Which clock shows ${CK.spoken(hour, minute)}?`,
    dedupeKey: "match:" + correct,
    correctAnswer: correct,
    choices: shuffle(times.map(([h, m]) => fmtClock(h, m))),
    choiceVisuals: {},
    choiceLabels: {},
    noChoiceListen: true,
    explanation: `${CK.spoken(hour, minute)} is ${correct}. Look at where the short and long hands point.`,
  };
  times.forEach(([h, m]) => {
    q.choiceVisuals[fmtClock(h, m)] = CK.face(h, m);
    q.choiceLabels[fmtClock(h, m)] = `a clock showing ${CK.spoken(h, m)}`;
  });
  return q;
}

const ACTIVITIES = [
  { name: "School", icon: "🏫", earliest: 7 * 60, latest: 10 * 60 },
  { name: "Art class", icon: "🎨", earliest: 9 * 60, latest: 11 * 60 },
  { name: "Music class", icon: "🎵", earliest: 9 * 60, latest: 12 * 60 },
  { name: "The movie", icon: "🎬", earliest: 14 * 60, latest: 19 * 60 },
  { name: "Soccer practice", icon: "⚽", earliest: 15 * 60, latest: 18 * 60 },
  { name: "Swimming lesson", icon: "🏊", earliest: 16 * 60, latest: 18 * 60 },
  { name: "The birthday party", icon: "🎂", earliest: 14 * 60, latest: 18 * 60 },
];

const DURATIONS = [20, 30, 40, 45, 50, 60, 75, 90];
const TIME_OFFSETS = [-60, -30, -15, -10, -5, 5, 10, 15, 30, 60];

function makeEndTimeQuestion() {
  const act = ACTIVITIES[randomInt(0, ACTIVITIES.length - 1)];
  const start = act.earliest + 5 * randomInt(0, (act.latest - act.earliest) / 5);
  const dur = DURATIONS[randomInt(0, DURATIONS.length - 1)];
  const correct = start + dur;
  const wrongs = offsetWrongs(correct, TIME_OFFSETS, (v) => v > start, fmt12);
  return {
    visual: CK.timeline(start, dur, { label: `A timeline that starts at ${fmt12(start)}; the bar shows how long ${act.name} lasts` }),
    prompt: `${act.icon} ${act.name} starts at ${fmt12(start)} and lasts ${durationPhrase(dur)}. When does it end?`,
    explanation: `${fmt12(start)} plus ${durationPhrase(dur)} is ${fmt12(correct)}.`,
    correctAnswer: fmt12(correct),
    choices: shuffle([fmt12(correct), ...wrongs]),
  };
}

function makeElapsedQuestion() {
  const start = 6 * 60 + 5 * randomInt(0, (14 * 60) / 5); // 6:00 AM – 8:00 PM
  const dur = 5 * randomInt(4, 36); // 20 min – 3 hr
  const wrongs = offsetWrongs(dur, TIME_OFFSETS, (v) => v > 0, fmtDuration);
  return {
    visual: CK.timeline(start, dur),
    explanation: `From ${fmt12(start)} to ${fmt12(start + dur)} is ${durationPhrase(dur)}.`,
    prompt: `How much time passes from ${fmt12(start)} to ${fmt12(start + dur)}?`,
    correctAnswer: fmtDuration(dur),
    choices: shuffle([fmtDuration(dur), ...wrongs]),
  };
}

function makeMinutesQuestion() {
  const h = randomInt(1, 4);
  const m = [0, 15, 30, 45][randomInt(0, 3)];
  const correct = h * 60 + m;
  const candidates = shuffle(
    [h * 100 + m, correct - 60, correct + 60, correct - 10, correct + 10, h * 60 - m]
      .filter((v, i, arr) => v > 0 && v !== correct && arr.indexOf(v) === i)
  );
  return {
    prompt: `How many minutes are in ${durationPhrase(correct)}?`,
    correctAnswer: String(correct),
    choices: shuffle([correct, ...candidates.slice(0, 3)].map(String)),
  };
}

const QUESTION_KINDS = {
  clock: [makeClockQuestion, makeMatchClockQuestion],
  elapsed: [makeEndTimeQuestion, makeElapsedQuestion, makeMinutesQuestion],
};
QUESTION_KINDS.all = [...QUESTION_KINDS.clock, ...QUESTION_KINDS.elapsed];

function getMode() {
  const type = new URLSearchParams(window.location.search).get("type");
  return type === "clock" || type === "elapsed" ? type : "all";
}

function loadBestMs(key) {
  try {
    const v = parseInt(localStorage.getItem(key), 10);
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch (e) {
    return null;
  }
}

function saveBestMs(key, ms) {
  try {
    localStorage.setItem(key, String(ms));
  } catch (e) {
    /* storage unavailable (private mode) — records just won't persist */
  }
}

function formatSeconds(ms) {
  return (ms / 1000).toFixed(1) + "s";
}

document.addEventListener("DOMContentLoaded", () => {
  const mode = getMode();
  const totalQuestions = 15;
  const storageKey = "klg-time-best-ms:" + mode + (level === 2 ? "" : ":L" + level);
  const kinds = QUESTION_KINDS[mode];
  const questionText = document.getElementById("question-text");

  const labels = {
    all: "Reading clocks + elapsed time",
    clock: "Reading clock faces and finding the clock for a time",
    elapsed: "End times, elapsed time and minute conversions",
  };
  document.getElementById("mode-label").textContent = labels[mode];

  KlgGameKit.modeLinks(document.getElementById("mode-links"), "type", "all");
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");

  const bestTimeNote = document.getElementById("best-time-note");
  function renderBestTimeNote() {
    const best = loadBestMs(storageKey);
    bestTimeNote.textContent = best
      ? `🏅 Best time: ${formatSeconds(best)} (perfect score)`
      : "🏅 Answer everything correctly to set a best-time record!";
  }
  renderBestTimeNote();

  const quiz = new QuizEngine({
    totalQuestions,
    timePerQuestion: 120,
    generateQuestion: () => {
      const q = kinds[randomInt(0, kinds.length - 1)]();
      questionText.classList.add("quiz-question-sm");
      return q;
    },
    onFinish: ({ score, total, elapsedMs }) => {
      const timeEl = document.getElementById("results-time");
      const best = loadBestMs(storageKey);
      if (score === total) {
        if (best === null || elapsedMs < best) {
          saveBestMs(storageKey, elapsedMs);
          if (window.KlgSounds) KlgSounds.newRecord();
          timeEl.textContent = `⏱️ ${formatSeconds(elapsedMs)} — 🏅 New best time!`;
        } else {
          timeEl.textContent = `⏱️ ${formatSeconds(elapsedMs)} • Best: ${formatSeconds(best)}`;
        }
      } else {
        timeEl.textContent =
          `⏱️ ${formatSeconds(elapsedMs)} • Get all ${total} right to set a time record!` +
          (best ? ` (Best: ${formatSeconds(best)})` : "");
      }
      renderBestTimeNote();
    },
  });

  document.getElementById("start-btn").addEventListener("click", () => {
    if (window.KlgSounds) KlgSounds.click();
    document.getElementById("start-screen").classList.add("d-none");
    quiz.start();
  });

  document.getElementById("play-again-btn").addEventListener("click", () => {
    if (window.KlgSounds) KlgSounds.click();
    quiz.start();
  });
});
