/**
 * Measurement question generator.
 *
 * Metric by default, US customary units with ?units=us. Four question
 * kinds, mixed by default:
 *  - unit    (?mode=unit):    which unit fits this object, and a rough
 *                             size estimate ("about how tall is a door?")
 *  - convert (?mode=convert): 3 m = ? cm, 2 kg = ? g, 12 in = ? ft
 *  - compare (?mode=compare): which is longer/heavier — always across two
 *                             different units, which is the whole point.
 *
 * Comparisons are computed in one base unit (mm, g, ml) so the two sides
 * are never accidentally equal.
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

function pick(array) {
  return array[randomInt(0, array.length - 1)];
}

const METRIC = {
  name: "metric",
  // base: mm for length, g for weight, ml for volume
  units: {
    length: [
      { unit: "millimeters (mm)", short: "mm", base: 1 },
      { unit: "centimeters (cm)", short: "cm", base: 10 },
      { unit: "meters (m)", short: "m", base: 1000 },
      { unit: "kilometers (km)", short: "km", base: 1000000 },
    ],
    weight: [
      { unit: "grams (g)", short: "g", base: 1 },
      { unit: "kilograms (kg)", short: "kg", base: 1000 },
    ],
    volume: [
      { unit: "milliliters (ml)", short: "ml", base: 1 },
      { unit: "liters (L)", short: "L", base: 1000 },
    ],
  },
  conversions: [
    { from: "cm", to: "mm", factor: 10 },
    { from: "m", to: "cm", factor: 100 },
    { from: "km", to: "m", factor: 1000 },
    { from: "kg", to: "g", factor: 1000 },
    { from: "L", to: "ml", factor: 1000 },
  ],
  objects: [
    { thing: "a pencil ✏️", kind: "length", short: "cm", size: 18 },
    { thing: "your thumb 👍", kind: "length", short: "cm", size: 5 },
    { thing: "a door 🚪", kind: "length", short: "m", size: 2 },
    { thing: "a swimming pool 🏊", kind: "length", short: "m", size: 25 },
    { thing: "the drive to another city 🚗", kind: "length", short: "km", size: 200 },
    { thing: "a football field 🏟️", kind: "length", short: "m", size: 100 },
    { thing: "an ant 🐜", kind: "length", short: "mm", size: 5 },
    { thing: "an apple 🍎", kind: "weight", short: "g", size: 150 },
    { thing: "a bag of rice 🍚", kind: "weight", short: "kg", size: 5 },
    { thing: "a feather 🪶", kind: "weight", short: "g", size: 1 },
    { thing: "a car 🚙", kind: "weight", short: "kg", size: 1200 },
    { thing: "a spoonful of medicine 🥄", kind: "volume", short: "ml", size: 5 },
    { thing: "a bottle of water 💧", kind: "volume", short: "L", size: 1 },
    { thing: "a bathtub full of water 🛁", kind: "volume", short: "L", size: 200 },
  ],
};

const US = {
  name: "us",
  // base: inches for length, ounces for weight, fluid ounces for volume
  units: {
    length: [
      { unit: "inches (in)", short: "in", base: 1 },
      { unit: "feet (ft)", short: "ft", base: 12 },
      { unit: "yards (yd)", short: "yd", base: 36 },
      { unit: "miles (mi)", short: "mi", base: 63360 },
    ],
    weight: [
      { unit: "ounces (oz)", short: "oz", base: 1 },
      { unit: "pounds (lb)", short: "lb", base: 16 },
    ],
    volume: [
      { unit: "cups", short: "cups", base: 8 },
      { unit: "pints", short: "pints", base: 16 },
      { unit: "quarts", short: "quarts", base: 32 },
      { unit: "gallons", short: "gallons", base: 128 },
    ],
  },
  conversions: [
    { from: "ft", to: "in", factor: 12 },
    { from: "yd", to: "ft", factor: 3 },
    { from: "lb", to: "oz", factor: 16 },
    { from: "pints", to: "cups", factor: 2 },
    { from: "quarts", to: "pints", factor: 2 },
    { from: "gallons", to: "quarts", factor: 4 },
  ],
  objects: [
    { thing: "a pencil ✏️", kind: "length", short: "in", size: 7 },
    { thing: "a door 🚪", kind: "length", short: "ft", size: 7 },
    { thing: "a football field 🏟️", kind: "length", short: "yd", size: 100 },
    { thing: "the drive to another city 🚗", kind: "length", short: "mi", size: 120 },
    { thing: "an apple 🍎", kind: "weight", short: "oz", size: 5 },
    { thing: "a bag of flour 🍞", kind: "weight", short: "lb", size: 5 },
    { thing: "a car 🚙", kind: "weight", short: "lb", size: 3000 },
    { thing: "milk for a bowl of cereal 🥣", kind: "volume", short: "cups", size: 1 },
    { thing: "a jug of milk 🥛", kind: "volume", short: "gallons", size: 1 },
  ],
};

const KIND_QUESTION = {
  length: "How long",
  weight: "How heavy",
  volume: "How much liquid",
};

/** "1 cups" reads wrong; symbols like cm and lb never change. */
function fmtQty(count, short) {
  if (count === 1 && short.endsWith("s") && short.length > 2) {
    return `${count} ${short.slice(0, -1)}`;
  }
  return `${count} ${short}`;
}

function unitByShort(system, short) {
  for (const kind of Object.keys(system.units)) {
    const found = system.units[kind].find((u) => u.short === short);
    if (found) return { ...found, kind };
  }
  return null;
}

function makeUnitQuestion(system) {
  const item = pick(system.objects);
  const answer = unitByShort(system, item.short);
  const sameKind = system.units[item.kind].filter((u) => u.short !== item.short);
  const otherKinds = Object.keys(system.units)
    .filter((k) => k !== item.kind)
    .flatMap((k) => system.units[k]);
  // Wrong units come mostly from the same family (the real decision), then
  // from a different family (measuring weight in meters) to make up three —
  // weight only has two metric units, so the top-up matters.
  const wrongs = shuffle(sameKind).slice(0, 2);
  shuffle(otherKinds).forEach((u) => {
    if (wrongs.length < 3) wrongs.push(u);
  });
  return {
    prompt: `${KIND_QUESTION[item.kind]} is ${item.thing}? Which unit would you use?`,
    dedupeKey: "unit-" + item.thing,
    correctAnswer: answer.unit,
    choices: shuffle([answer.unit, ...wrongs.map((u) => u.unit)]).slice(0, 4),
  };
}

function makeEstimateQuestion(system) {
  const item = pick(system.objects);
  const others = system.units[item.kind].filter((u) => u.short !== item.short);
  const answer = fmtQty(item.size, item.short);
  // Same number in the wrong unit is the interesting mistake; the ×10 and
  // ×100 versions top the list up to three when a family has few units.
  const wrongs = shuffle([
    ...others.map((u) => fmtQty(item.size, u.short)),
    fmtQty(item.size * 10, item.short),
    fmtQty(item.size * 100, item.short),
  ]).slice(0, 3);
  return {
    prompt: `About how much is ${item.thing}?`,
    dedupeKey: "estimate-" + item.thing,
    correctAnswer: answer,
    choices: shuffle([answer, ...wrongs]),
  };
}

function makeConvertQuestion(system) {
  const conv = pick(system.conversions);
  const count = pick([1, 2, 2, 3, 4, 5, 10]);
  const answer = count * conv.factor;
  const wrongs = [
    count * conv.factor * 10,
    Math.round((count * conv.factor) / 10),
    count + conv.factor,
    count * conv.factor + count,
  ];
  const choices = [answer];
  for (const w of wrongs) {
    if (Number.isInteger(w) && w > 0 && !choices.includes(w)) choices.push(w);
    if (choices.length === 4) break;
  }
  return {
    prompt: `${fmtQty(count, conv.from)} = ? ${conv.to}`,
    dedupeKey: `conv-${count}-${conv.from}`,
    correctAnswer: answer,
    choices: shuffle(choices),
  };
}

const COMPARE_WORDS = {
  length: ["longest", "shortest"],
  weight: ["heaviest", "lightest"],
  volume: ["most", "least"],
};

/**
 * Three amounts written in two neighbouring units (30 cm, 2 m, 150 cm),
 * asking for the biggest or smallest. Everything is compared in the base
 * unit, so two amounts are never secretly equal.
 */
function makeCompareQuestion(system) {
  const kind = pick(Object.keys(system.units).filter((k) => system.units[k].length >= 2));
  const units = system.units[kind];
  const index = randomInt(0, units.length - 2);
  const small = units[index];
  const big = units[index + 1];
  const ratio = big.base / small.base;

  const items = [];
  let guard = 0;
  while (items.length < 3 && guard < 60) {
    guard += 1;
    // First two amounts use different units so the comparison is real.
    const unit = items.length === 0 ? big : items.length === 1 ? small : pick([big, small]);
    // Amounts in the smaller unit are kept to friendly fractions of the
    // bigger one (75 cm, 250 ml) — "2,432 ml" is arithmetic, not sense.
    const count =
      unit === big
        ? randomInt(1, 4)
        : Math.max(1, Math.round(ratio * pick([0.25, 0.5, 0.75, 1.5, 2, 2.5, 3])));
    const total = count * unit.base;
    if (!items.some((it) => it.total === total)) {
      items.push({ label: fmtQty(count, unit.short), total: total });
    }
  }

  const [bigWord, smallWord] = COMPARE_WORDS[kind];
  const askBiggest = randomInt(0, 1) === 0;
  const sorted = [...items].sort((x, y) => y.total - x.total);
  const answer = (askBiggest ? sorted[0] : sorted[sorted.length - 1]).label;
  return {
    prompt: `Which is the ${askBiggest ? bigWord : smallWord}?`,
    dedupeKey: `cmp-${items.map((i) => i.label).join("|")}-${askBiggest}`,
    correctAnswer: answer,
    choices: shuffle(items.map((i) => i.label)),
  };
}

function getMode() {
  const mode = new URLSearchParams(window.location.search).get("mode");
  return ["unit", "convert", "compare"].includes(mode) ? mode : "all";
}

function getSystem() {
  return new URLSearchParams(window.location.search).get("units") === "us" ? US : METRIC;
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
  const system = getSystem();
  const totalQuestions = 15;
  const storageKey = `klg-measurement-best-ms:${system.name}:${mode}`;

  const labels = {
    all: "Units, converting and comparing",
    unit: "Which unit fits?",
    convert: "Convert between units",
    compare: "Which is bigger?",
  };
  document.getElementById("mode-label").textContent =
    labels[mode] + (system.name === "us" ? " (inches, pounds, cups)" : " (cm, kg, liters)");

  document.querySelectorAll("#mode-links a").forEach((link) => {
    const params = new URLSearchParams(link.getAttribute("href").replace(/^[^?]*\??/, ""));
    const linkMode = params.get("mode") || "all";
    const linkUnits = params.get("units") || "metric";
    if (linkMode === mode && linkUnits === system.name) {
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
    timePerQuestion: 25,
    generateQuestion: () => {
      // "Pick the unit" also serves the estimate questions — same skill,
      // and together they hold enough questions to fill a round without
      // repeating.
      const kind =
        mode === "all"
          ? pick(["unit", "estimate", "convert", "convert", "compare"])
          : mode === "unit"
          ? pick(["unit", "estimate"])
          : mode;
      if (kind === "unit") return makeUnitQuestion(system);
      if (kind === "estimate") return makeEstimateQuestion(system);
      if (kind === "convert") return makeConvertQuestion(system);
      return makeCompareQuestion(system);
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
