/**
 * Time & elapsed time question generator.
 * Reads ?type=clock|elapsed from the URL to practice one skill;
 * defaults to a mix of both.
 *
 * Question kinds:
 *  - clock reading: a clock-face emoji (🕒) as the prompt — the 24 emoji
 *    cover every hour and half-hour, so no images are needed
 *  - end time:      "Soccer practice starts at 4:30 PM and lasts 45 minutes.
 *                    When does it end?"
 *  - elapsed time:  "How much time passes from 2:20 PM to 4:05 PM?"
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

// 🕐..🕛 are 1:00..12:00, 🕜..🕧 are 1:30..12:30.
function makeClockQuestion() {
  const hour = randomInt(1, 12);
  const minute = Math.random() < 0.5 ? 0 : 30;
  const base = minute === 0 ? 0x1f550 : 0x1f55c;
  const correct = fmtClock(hour, minute);
  const wrongs = [
    fmtClock(hour, minute === 0 ? 30 : 0), // right hour, wrong half
    fmtClock((hour % 12) + 1, minute), // hour hand read one off
    fmtClock(((hour + 10) % 12) + 1, minute),
  ];
  return {
    prompt: String.fromCodePoint(base + hour - 1),
    correctAnswer: correct,
    choices: shuffle([correct, ...wrongs]),
    bigGlyph: true,
  };
}

const ACTIVITIES = [
  { name: "School", earliest: 7 * 60, latest: 10 * 60 },
  { name: "Art class", earliest: 9 * 60, latest: 11 * 60 },
  { name: "Music class", earliest: 9 * 60, latest: 12 * 60 },
  { name: "The movie", earliest: 14 * 60, latest: 19 * 60 },
  { name: "Soccer practice", earliest: 15 * 60, latest: 18 * 60 },
  { name: "Swimming lesson", earliest: 16 * 60, latest: 18 * 60 },
  { name: "The birthday party", earliest: 14 * 60, latest: 18 * 60 },
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
    prompt: `${act.name} starts at ${fmt12(start)} and lasts ${durationPhrase(dur)}. When does it end?`,
    correctAnswer: fmt12(correct),
    choices: shuffle([fmt12(correct), ...wrongs]),
  };
}

function makeElapsedQuestion() {
  const start = 6 * 60 + 5 * randomInt(0, (14 * 60) / 5); // 6:00 AM – 8:00 PM
  const dur = 5 * randomInt(4, 36); // 20 min – 3 hr
  const wrongs = offsetWrongs(dur, TIME_OFFSETS, (v) => v > 0, fmtDuration);
  return {
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
  clock: [makeClockQuestion],
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
  const storageKey = "klg-time-best-ms:" + mode;
  const kinds = QUESTION_KINDS[mode];
  const questionText = document.getElementById("question-text");

  const labels = {
    all: "Reading clocks + elapsed time",
    clock: "Reading clock faces",
    elapsed: "End times, elapsed time and minute conversions",
  };
  document.getElementById("mode-label").textContent = labels[mode];

  document.querySelectorAll("#mode-links a").forEach((link) => {
    const linkType = new URLSearchParams(
      link.getAttribute("href").replace(/^[^?]*\??/, "")
    ).get("type");
    if ((linkType || "all") === mode) {
      link.classList.replace("btn-outline-secondary", "btn-secondary");
    }
  });

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
      // Clock-emoji prompts render as one big glyph; sentences render small.
      questionText.classList.toggle("quiz-question-xl", !!q.bigGlyph);
      questionText.classList.toggle("quiz-question-sm", !q.bigGlyph);
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
