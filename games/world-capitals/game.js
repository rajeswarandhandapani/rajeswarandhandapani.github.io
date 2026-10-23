/**
 * World capitals question generator. Two modes, picked with ?mode=:
 *
 *  - capital (default): a country is shown (with its flag) — tap its
 *    capital city.
 *  - country: a capital city is shown — tap its country.
 *  - flag:    a country name is shown — tap its flag.
 *
 * Capital and country questions come with a picture: the flag and, for
 * about 30 countries, a famous landmark.
 *
 * ?region=asia|europe|africa|americas|oceania narrows practice to one
 * continent; mode and region combine freely.
 *
 * Distractors are other capitals (or countries), preferring the same
 * region so choices aren't giveaways. Countries whose most famous city is
 * NOT the capital carry a `trap` city (Australia→Sydney, Turkey→Istanbul,
 * Canada→Toronto…) that is always offered in capital mode — that's the
 * mix-up everyone actually makes.
 */
const COUNTRIES = [
  // Asia
  { country: "India", capital: "New Delhi", flag: "🇮🇳", region: "asia", trap: "Mumbai" },
  { country: "China", capital: "Beijing", flag: "🇨🇳", region: "asia", trap: "Shanghai" },
  { country: "Japan", capital: "Tokyo", flag: "🇯🇵", region: "asia" },
  { country: "South Korea", capital: "Seoul", flag: "🇰🇷", region: "asia" },
  { country: "Thailand", capital: "Bangkok", flag: "🇹🇭", region: "asia" },
  { country: "Vietnam", capital: "Hanoi", flag: "🇻🇳", region: "asia", trap: "Ho Chi Minh City" },
  { country: "Indonesia", capital: "Jakarta", flag: "🇮🇩", region: "asia" },
  { country: "Malaysia", capital: "Kuala Lumpur", flag: "🇲🇾", region: "asia" },
  { country: "Philippines", capital: "Manila", flag: "🇵🇭", region: "asia" },
  { country: "Nepal", capital: "Kathmandu", flag: "🇳🇵", region: "asia" },
  { country: "Bangladesh", capital: "Dhaka", flag: "🇧🇩", region: "asia" },
  { country: "Pakistan", capital: "Islamabad", flag: "🇵🇰", region: "asia", trap: "Karachi" },
  { country: "Saudi Arabia", capital: "Riyadh", flag: "🇸🇦", region: "asia" },
  { country: "United Arab Emirates", capital: "Abu Dhabi", flag: "🇦🇪", region: "asia", trap: "Dubai" },
  { country: "Turkey", capital: "Ankara", flag: "🇹🇷", region: "asia", trap: "Istanbul" },
  { country: "Kazakhstan", capital: "Astana", flag: "🇰🇿", region: "asia", trap: "Almaty" },
  { country: "Qatar", capital: "Doha", flag: "🇶🇦", region: "asia" },
  { country: "Jordan", capital: "Amman", flag: "🇯🇴", region: "asia" },
  // Europe
  { country: "United Kingdom", capital: "London", flag: "🇬🇧", region: "europe" },
  { country: "France", capital: "Paris", flag: "🇫🇷", region: "europe" },
  { country: "Germany", capital: "Berlin", flag: "🇩🇪", region: "europe", trap: "Munich" },
  { country: "Italy", capital: "Rome", flag: "🇮🇹", region: "europe", trap: "Milan" },
  { country: "Spain", capital: "Madrid", flag: "🇪🇸", region: "europe", trap: "Barcelona" },
  { country: "Portugal", capital: "Lisbon", flag: "🇵🇹", region: "europe" },
  { country: "Netherlands", capital: "Amsterdam", flag: "🇳🇱", region: "europe" },
  { country: "Belgium", capital: "Brussels", flag: "🇧🇪", region: "europe" },
  { country: "Switzerland", capital: "Bern", flag: "🇨🇭", region: "europe", trap: "Zurich" },
  { country: "Austria", capital: "Vienna", flag: "🇦🇹", region: "europe" },
  { country: "Greece", capital: "Athens", flag: "🇬🇷", region: "europe" },
  { country: "Sweden", capital: "Stockholm", flag: "🇸🇪", region: "europe" },
  { country: "Norway", capital: "Oslo", flag: "🇳🇴", region: "europe" },
  { country: "Denmark", capital: "Copenhagen", flag: "🇩🇰", region: "europe" },
  { country: "Finland", capital: "Helsinki", flag: "🇫🇮", region: "europe" },
  { country: "Ireland", capital: "Dublin", flag: "🇮🇪", region: "europe" },
  { country: "Poland", capital: "Warsaw", flag: "🇵🇱", region: "europe", trap: "Krakow" },
  { country: "Czechia", capital: "Prague", flag: "🇨🇿", region: "europe" },
  { country: "Hungary", capital: "Budapest", flag: "🇭🇺", region: "europe" },
  { country: "Russia", capital: "Moscow", flag: "🇷🇺", region: "europe" },
  { country: "Ukraine", capital: "Kyiv", flag: "🇺🇦", region: "europe" },
  { country: "Iceland", capital: "Reykjavik", flag: "🇮🇸", region: "europe" },
  // Africa
  { country: "Egypt", capital: "Cairo", flag: "🇪🇬", region: "africa" },
  { country: "Nigeria", capital: "Abuja", flag: "🇳🇬", region: "africa", trap: "Lagos" },
  { country: "Kenya", capital: "Nairobi", flag: "🇰🇪", region: "africa" },
  { country: "Ethiopia", capital: "Addis Ababa", flag: "🇪🇹", region: "africa" },
  { country: "Morocco", capital: "Rabat", flag: "🇲🇦", region: "africa", trap: "Casablanca" },
  { country: "Ghana", capital: "Accra", flag: "🇬🇭", region: "africa" },
  { country: "Tanzania", capital: "Dodoma", flag: "🇹🇿", region: "africa", trap: "Dar es Salaam" },
  { country: "Algeria", capital: "Algiers", flag: "🇩🇿", region: "africa" },
  { country: "Tunisia", capital: "Tunis", flag: "🇹🇳", region: "africa" },
  { country: "Uganda", capital: "Kampala", flag: "🇺🇬", region: "africa" },
  { country: "Zimbabwe", capital: "Harare", flag: "🇿🇼", region: "africa" },
  { country: "Senegal", capital: "Dakar", flag: "🇸🇳", region: "africa" },
  // Americas
  { country: "United States", capital: "Washington, D.C.", flag: "🇺🇸", region: "americas", trap: "New York" },
  { country: "Canada", capital: "Ottawa", flag: "🇨🇦", region: "americas", trap: "Toronto" },
  { country: "Mexico", capital: "Mexico City", flag: "🇲🇽", region: "americas" },
  { country: "Brazil", capital: "Brasília", flag: "🇧🇷", region: "americas", trap: "Rio de Janeiro" },
  { country: "Argentina", capital: "Buenos Aires", flag: "🇦🇷", region: "americas" },
  { country: "Chile", capital: "Santiago", flag: "🇨🇱", region: "americas" },
  { country: "Peru", capital: "Lima", flag: "🇵🇪", region: "americas" },
  { country: "Colombia", capital: "Bogotá", flag: "🇨🇴", region: "americas" },
  { country: "Cuba", capital: "Havana", flag: "🇨🇺", region: "americas" },
  { country: "Jamaica", capital: "Kingston", flag: "🇯🇲", region: "americas" },
  { country: "Venezuela", capital: "Caracas", flag: "🇻🇪", region: "americas" },
  { country: "Ecuador", capital: "Quito", flag: "🇪🇨", region: "americas" },
  { country: "Uruguay", capital: "Montevideo", flag: "🇺🇾", region: "americas" },
  // Oceania
  { country: "Australia", capital: "Canberra", flag: "🇦🇺", region: "oceania", trap: "Sydney" },
  { country: "New Zealand", capital: "Wellington", flag: "🇳🇿", region: "oceania", trap: "Auckland" },
  { country: "Fiji", capital: "Suva", flag: "🇫🇯", region: "oceania" },
  { country: "Papua New Guinea", capital: "Port Moresby", flag: "🇵🇬", region: "oceania" },
];

const REGIONS = {
  asia: "Asia",
  europe: "Europe",
  africa: "Africa",
  americas: "The Americas",
  oceania: "Oceania",
};

const LANDMARKS = {
  India: "🕌", China: "🏯", Japan: "🗻", "South Korea": "🏯", Thailand: "🛕", Egypt: "🐪", France: "🗼", "United Kingdom": "🎡",
  Germany: "🏰", Italy: "🏛️", Spain: "💃", Greece: "🏛️", Netherlands: "🌷", Switzerland: "🏔️", Russia: "🪆", Norway: "⛰️",
  "United States": "🗽", Canada: "🍁", Mexico: "🌮", Brazil: "🌴", Peru: "🦙", Argentina: "⚽", Australia: "🦘", "New Zealand": "🥝",
  Kenya: "🦁", Morocco: "🕌", Jamaica: "🏝️", Ireland: "☘️", Turkey: "🎈", "Saudi Arabia": "🕋", Nepal: "🏔️", Jordan: "🏜️", Tanzania: "🦒",
};

/** Big flag with its landmark beside it; labelled for screen readers. */
function flagPicture(entry) {
  const f = document.createElement("figure");
  f.className = "kv-clue kv-flagpic";
  f.setAttribute("role", "img");
  f.setAttribute("aria-label", `The flag of ${entry.country}` + (LANDMARKS[entry.country] ? " and a famous landmark" : ""));
  f.innerHTML = `<span aria-hidden="true">${entry.flag}${LANDMARKS[entry.country] ? " " + LANDMARKS[entry.country] : ""}</span>`;
  return f;
}

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

/** 3 wrong choices: seed entries always included, then preferred pool, then filler. */
function pickDistractors(seed, preferred, rest, answer) {
  const wrongs = new Set(seed.filter((v) => v !== answer));
  for (const pool of [preferred, rest]) {
    for (const value of shuffle(pool)) {
      if (wrongs.size === 3) break;
      if (value !== answer) wrongs.add(value);
    }
  }
  return [...wrongs];
}

function generateCapitalQuestion(entries) {
  return (askedSet) => {
    const remaining = entries.filter((e) => !askedSet.has(e.country));
    const pool = remaining.length ? remaining : entries;
    const entry = pool[randomInt(0, pool.length - 1)];

    const sameRegion = entries
      .filter((e) => e !== entry && e.region === entry.region)
      .map((e) => e.capital);
    const rest = COUNTRIES.filter((e) => e !== entry).map((e) => e.capital);
    // The famous-but-not-capital city is the trap everyone falls for —
    // always on the ballot when the country has one.
    const wrongs = pickDistractors(entry.trap ? [entry.trap] : [], sameRegion, rest, entry.capital);

    return {
      visual: flagPicture(entry),
      prompt: `What is the capital of ${entry.country}?`,
      explanation: `${entry.capital} is the capital of ${entry.country}.`,
      dedupeKey: entry.country,
      correctAnswer: entry.capital,
      choices: shuffle([entry.capital, ...wrongs]),
    };
  };
}

function generateCountryQuestion(entries) {
  return (askedSet) => {
    const remaining = entries.filter((e) => !askedSet.has(e.country));
    const pool = remaining.length ? remaining : entries;
    const entry = pool[randomInt(0, pool.length - 1)];

    const sameRegion = entries
      .filter((e) => e !== entry && e.region === entry.region)
      .map((e) => e.country);
    const rest = COUNTRIES.filter((e) => e !== entry).map((e) => e.country);

    return {
      prompt: `${entry.capital} is the capital of which country?`,
      explanation: `${entry.capital} is in ${entry.country}.`,
      dedupeKey: entry.country,
      correctAnswer: entry.country,
      choices: shuffle([entry.country, ...pickDistractors([], sameRegion, rest, entry.country)]),
    };
  };
}

/** Name the country, tap the flag. Flags in the same region are the likely mix-ups. */
function generateFlagQuestion(entries) {
  return (askedSet) => {
    const remaining = entries.filter((e) => !askedSet.has(e.country));
    const pool = remaining.length ? remaining : entries;
    const entry = pool[randomInt(0, pool.length - 1)];
    const sameRegion = COUNTRIES.filter((e) => e !== entry && e.region === entry.region);
    const others = COUNTRIES.filter((e) => e !== entry && e.region !== entry.region);
    const wrongs = [...shuffle(sameRegion), ...shuffle(others)].filter((e) => e.flag !== entry.flag).slice(0, 3);
    const options = shuffle([entry, ...wrongs]);
    const q = {
      prompt: `Which flag belongs to ${entry.country}?`,
      explanation: `This is the flag of ${entry.country}.`,
      dedupeKey: entry.country,
      correctAnswer: entry.country,
      choices: options.map((e) => e.country),
      choiceVisuals: {},
      choiceLabels: {},
      noChoiceListen: true,
    };
    options.forEach((e) => {
      const box = document.createElement("div");
      box.className = "kv-choice";
      box.innerHTML = `<span class="kv-emoji" aria-hidden="true" style="font-size:3rem">${e.flag}</span>`;
      q.choiceVisuals[e.country] = box;
      q.choiceLabels[e.country] = `the flag of ${e.country}`;
    });
    return q;
  };
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
  const params = new URLSearchParams(window.location.search);
  const mode = ["country", "flag"].includes(params.get("mode")) ? params.get("mode") : "capital";
  const region = REGIONS[params.get("region")] ? params.get("region") : null;
  const entries = region ? COUNTRIES.filter((e) => e.region === region) : COUNTRIES;
  const storageKey = `klg-world-capitals-best-ms:${mode}:${region || "all"}`;

  document.getElementById("mode-label").textContent =
    (mode === "capital"
      ? "Find the capital city of each country"
      : mode === "flag"
      ? "Find the flag of each country"
      : "Find the country each capital belongs to") +
    ` — ${region ? REGIONS[region] : "the whole world"}, ${entries.length} countries`;

  // Direction and region are independent choices; modeLinks keeps the other one.
  KlgGameKit.modeLinks(document.getElementById("sound-mode-links"), "mode", "capital");
  KlgGameKit.modeLinks(document.getElementById("mode-links"), "region", "");

  const bestTimeNote = document.getElementById("best-time-note");
  function renderBestTimeNote() {
    const best = loadBestMs(storageKey);
    bestTimeNote.textContent = best
      ? `🏅 Best time: ${formatSeconds(best)} (perfect score)`
      : "🏅 Answer everything correctly to set a best-time record!";
  }
  renderBestTimeNote();

  const quiz = new QuizEngine({
    totalQuestions: Math.min(15, entries.length),
    timePerQuestion: 120,
    generateQuestion:
      mode === "capital" ? generateCapitalQuestion(entries)
        : mode === "flag" ? generateFlagQuestion(entries)
        : generateCountryQuestion(entries),
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
