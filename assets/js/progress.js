/**
 * KlgProgress — the shared reward layer for Kid Learning Games.
 *
 * Everything a child earns across games lives in one localStorage record:
 * XP (and the rank it unlocks), stars per game, a day streak and badges.
 * Load this before quiz-engine.js and the engine reports every finished
 * quiz automatically — no per-game wiring needed, the game id is taken
 * from the folder name in the URL.
 *
 * window.KlgProgress:
 *   record({ score, total, elapsedMs, bestStreak, gameId? }) -> reward
 *       reward = { xp, totalXp, rank, rankUp, stars, bestStars, isBest,
 *                  newBadges: [badge], dayStreak, toNextRank }
 *   summary()      -> { xp, rank, toNextRank, plays, dayStreak, badges,
 *                       games, gamesPlayed, stars }
 *   gameStats(id)  -> { plays, bestScore, total, bestStars, bestMs } | null
 *   currentGameId()-> "multiplication" (folder name) or null
 *   rankFor(xp)    -> { index, name, emoji, min, next }
 *   reset()        -> wipes everything (used by the "start over" link)
 *   review         -> missed questions that come back later (see below)
 *   RANKS, BADGES
 *
 * Storage is wrapped in try/catch throughout: in private mode nothing
 * persists but every game still plays normally.
 */
(function () {
  "use strict";

  var KEY = "klg-progress-v1";

  var RANKS = [
    { name: "Curious Chick", emoji: "🐣", min: 0 },
    { name: "Bright Spark", emoji: "✨", min: 250 },
    { name: "Star Learner", emoji: "⭐", min: 700 },
    { name: "Quiz Whiz", emoji: "🧠", min: 1500 },
    { name: "Brain Champ", emoji: "🏆", min: 3000 },
    { name: "Mega Mind", emoji: "🚀", min: 5000 },
    { name: "Grand Legend", emoji: "👑", min: 8000 },
  ];

  // Order matters only for display; `earned` is checked after every quiz.
  var BADGES = [
    {
      id: "first-quiz",
      emoji: "🎈",
      name: "First Quiz",
      hint: "Finish your very first quiz",
      earned: function (s) { return s.plays >= 1; },
    },
    {
      id: "perfect",
      emoji: "💯",
      name: "Perfect!",
      hint: "Get every question right in a quiz",
      earned: function (s, r) { return r.score === r.total; },
    },
    {
      id: "streak-5",
      emoji: "🔥",
      name: "On Fire",
      hint: "Answer 5 in a row correctly",
      earned: function (s, r) { return r.bestStreak >= 5; },
    },
    {
      id: "streak-10",
      emoji: "⚡",
      name: "Unstoppable",
      hint: "Answer 10 in a row correctly",
      earned: function (s, r) { return r.bestStreak >= 10; },
    },
    {
      id: "speedy",
      emoji: "🏎️",
      name: "Speed Demon",
      hint: "Score full marks averaging under 4 seconds a question",
      earned: function (s, r) {
        return r.score === r.total && r.elapsedMs > 0 && r.elapsedMs / r.total < 4000;
      },
    },
    {
      id: "explorer",
      emoji: "🧭",
      name: "Explorer",
      hint: "Try 5 different games",
      earned: function (s) { return s.gamesPlayed >= 5; },
    },
    {
      id: "globetrotter",
      emoji: "🗺️",
      name: "Adventurer",
      hint: "Try 12 different games",
      earned: function (s) { return s.gamesPlayed >= 12; },
    },
    {
      id: "star-collector",
      emoji: "🌟",
      name: "Star Collector",
      hint: "Earn 3 stars in 5 different games",
      earned: function (s) { return s.threeStarGames >= 5; },
    },
    {
      id: "day-3",
      emoji: "📅",
      name: "3 Days Running",
      hint: "Play on 3 days in a row",
      earned: function (s) { return s.dayStreak >= 3; },
    },
    {
      id: "day-7",
      emoji: "🗓️",
      name: "Week Warrior",
      hint: "Play on 7 days in a row",
      earned: function (s) { return s.dayStreak >= 7; },
    },
    {
      id: "quiz-25",
      emoji: "💪",
      name: "Quiz Machine",
      hint: "Finish 25 quizzes",
      earned: function (s) { return s.plays >= 25; },
    },
    {
      id: "quiz-100",
      emoji: "🦸",
      name: "Century Hero",
      hint: "Finish 100 quizzes",
      earned: function (s) { return s.plays >= 100; },
    },
    {
      id: "picture-pro",
      emoji: "🖼️",
      name: "Picture Pro",
      hint: "Try 10 of the hands-on picture games",
      earned: function (s) { return catalogue().filter(function (g) { return g.v3 && s.games[g.id]; }).length >= 10; },
    },
    {
      id: "path-finder",
      emoji: "🧭",
      name: "Path Finder",
      hint: "Earn a star in every step of a learning path",
      earned: function (s) { return pathsDone(s).length > 0; },
    },
    {
      id: "all-rounder",
      emoji: "🌈",
      name: "All-Rounder",
      hint: "Earn a star in math, English, Tamil and science",
      earned: function (s) {
        var seen = {};
        catalogue().forEach(function (g) { if (s.games[g.id] && s.games[g.id].bestStars > 0) seen[g.subject] = true; });
        return !!(seen.math && seen.english && seen.tamil && seen.science);
      },
    },
    {
      id: "comeback",
      emoji: "💪",
      name: "Comeback",
      hint: "Beat your own earlier score in a game",
      earned: function (s, ctx) { return !!(ctx && ctx.improved); },
    },
    {
      id: "second-chance",
      emoji: "🔁",
      name: "Second Chance",
      hint: "Clear a tricky question in a review round",
      earned: function (s, ctx) { return !!(ctx && ctx.cleared > 0); },
    },
    {
      id: "bee-champion",
      emoji: "🏆",
      name: "Bee Champion",
      hint: "Win a mock spelling bee",
      earned: function (s, ctx) { return !!(ctx && ctx.beeChampion); },
    },
  ];

  /** Badges a review round may unlock. Its score says nothing about "perfect" or speed. */
  var REVIEW_BADGES = ["second-chance", "day-3", "day-7"];

  /** Game list from catalogue.js when the page loaded it (empty otherwise). */
  function catalogue() {
    return (window.KlgCatalogue && window.KlgCatalogue.GAMES) || [];
  }

  /** Learning paths where every step game has at least one star. */
  function pathsDone(s) {
    var paths = (window.KlgCatalogue && window.KlgCatalogue.PATHS) || {};
    return Object.keys(paths).filter(function (key) {
      return paths[key].steps.every(function (step) { return s.games[step.game] && s.games[step.game].bestStars > 0; });
    });
  }

  var RECENT_KEEP = 5;

  function blank() {
    return { xp: 0, plays: 0, streak: 0, bestStreak: 0, lastDay: "", games: {}, badges: {} };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object" || Array.isArray(data)) return blank();
      var base = blank();
      for (var k in base) {
        if (data[k] === undefined) data[k] = base[k];
      }
      ["xp", "plays", "streak", "bestStreak"].forEach(function (key) {
        if (!Number.isFinite(data[key]) || data[key] < 0) data[key] = 0;
      });
      ["games", "badges"].forEach(function (key) {
        if (!data[key] || typeof data[key] !== "object" || Array.isArray(data[key])) data[key] = {};
      });
      Object.keys(data.games).forEach(function (key) {
        var game = data.games[key];
        if (!game || typeof game !== "object") { delete data.games[key]; return; }
        game.bestStars = Math.max(0, Math.min(3, Math.floor(Number(game.bestStars) || 0)));
        game.recent = Array.isArray(game.recent)
          ? game.recent.map(Number).filter(Number.isFinite).slice(-RECENT_KEEP)
          : [];
        if (!game.byMode || typeof game.byMode !== "object" || Array.isArray(game.byMode)) game.byMode = {};
      });
      if (typeof data.lastDay !== "string") data.lastDay = "";
      return data;
    } catch (e) {
      return blank();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      /* private mode — progress just won't persist */
    }
  }

  /** Local (not UTC) YYYY-MM-DD, so "today" matches the child's clock. */
  function today() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function daysBetween(fromIso, toIso) {
    var a = new Date(fromIso + "T00:00:00");
    var b = new Date(toIso + "T00:00:00");
    return Math.round((b - a) / 86400000);
  }

  function starsFor(score, total) {
    var pct = total ? score / total : 0;
    if (pct >= 0.9) return 3;
    if (pct >= 0.7) return 2;
    if (pct >= 0.5) return 1;
    return 0;
  }

  function rankFor(xp) {
    var index = 0;
    for (var i = 0; i < RANKS.length; i += 1) {
      if (xp >= RANKS[i].min) index = i;
    }
    var rank = RANKS[index];
    return {
      index: index,
      name: rank.name,
      emoji: rank.emoji,
      min: rank.min,
      next: RANKS[index + 1] || null,
    };
  }

  /** Folder name of the game being played, e.g. /games/counting/ -> counting. */
  function currentGameId() {
    // Anchored at the end: on the website the path is /games/games/counting/index.html.
    var match = window.location.pathname.match(/\/games\/([^/]+)\/[^/]*$/);
    return match ? match[1] : null;
  }

  /** ?mode=, ?type= or ?level= of the page being played ("default" when none). */
  function currentMode() {
    try {
      var q = new URLSearchParams(window.location.search || "");
      var parts = ["mode", "type", "level"].map(function (k) { return q.get(k) ? k + "=" + q.get(k) : ""; });
      return parts.filter(Boolean).join("&").slice(0, 40) || "default";
    } catch (e) {
      return "default";
    }
  }

  function derived(data) {
    var ids = Object.keys(data.games);
    var stars = 0;
    var threeStarGames = 0;
    ids.forEach(function (id) {
      stars += data.games[id].bestStars || 0;
      if (data.games[id].bestStars === 3) threeStarGames += 1;
    });
    return {
      xp: data.xp,
      plays: data.plays,
      dayStreak: data.lastDay && daysBetween(data.lastDay, today()) <= 1 ? data.streak : 0,
      bestDayStreak: data.bestStreak,
      gamesPlayed: ids.length,
      stars: stars,
      threeStarGames: threeStarGames,
      games: data.games,
      badges: data.badges,
      rank: rankFor(data.xp),
    };
  }

  function touchDayStreak(data, day) {
    if (data.lastDay === day) return;
    var gap = data.lastDay ? daysBetween(data.lastDay, day) : null;
    data.streak = gap === 1 ? data.streak + 1 : 1;
    data.lastDay = day;
    data.bestStreak = Math.max(data.bestStreak || 0, data.streak);
  }

  function record(result) {
    var gameId = result.gameId || currentGameId() || "unknown";
    var total = result.total || 0;
    var score = result.score || 0;
    var bestStreak = result.bestStreak || 0;
    var elapsedMs = result.elapsedMs || 0;
    var stars = starsFor(score, total);

    var data = load();
    var beforeRank = rankFor(data.xp);

    // XP rewards finishing (10 XP), then accuracy and streaks —
    // a shaky round still earns something, a perfect one earns a lot more.
    var xp = total > 0 ? 10 + score * 10 : 0;
    if (score === total && total > 0) xp += 50;
    if (bestStreak >= 5) xp += 20;
    if (bestStreak >= 10) xp += 30;

    data.xp += xp;
    data.plays += 1;

    var day = today();
    touchDayStreak(data, day);

    var g = data.games[gameId] || { plays: 0, bestScore: 0, total: total, bestStars: 0, bestMs: 0 };
    var previousPlays = g.plays;
    g.plays += 1;
    g.total = total;
    g.lastPlayed = day;
    var isBest = score > g.bestScore;
    if (isBest) g.bestScore = score;
    g.bestStars = Math.max(g.bestStars || 0, stars);
    g.recent = (g.recent || []).concat(total > 0 ? Math.round((score / total) * 100) : 0).slice(-RECENT_KEEP);
    var mode = result.mode || currentMode();
    g.byMode = g.byMode || {};
    var m = g.byMode[mode] || { plays: 0, bestStars: 0 };
    m.plays += 1;
    m.bestStars = Math.max(m.bestStars, stars);
    g.byMode[mode] = m;
    if (score === total && total > 0 && elapsedMs > 0 && (!g.bestMs || elapsedMs < g.bestMs)) {
      g.bestMs = elapsedMs;
    }
    data.games[gameId] = g;

    var stats = derived(data);
    var context = { score: score, total: total, bestStreak: bestStreak, elapsedMs: elapsedMs, improved: isBest && previousPlays > 0, beeChampion: !!result.beeChampion };
    var newBadges = [];
    BADGES.forEach(function (badge) {
      if (!data.badges[badge.id] && badge.earned(stats, context)) {
        data.badges[badge.id] = day;
        newBadges.push(badge);
      }
    });

    save(data);

    var afterRank = rankFor(data.xp);
    return {
      xp: xp,
      totalXp: data.xp,
      rank: afterRank,
      rankUp: afterRank.index > beforeRank.index,
      stars: stars,
      bestStars: g.bestStars,
      isBest: isBest,
      newBadges: newBadges,
      dayStreak: data.streak,
      toNextRank: afterRank.next ? afterRank.next.min - data.xp : 0,
    };
  }

  /**
   * Review My Mistakes. A missed question is saved as a self-contained copy
   * (questions are random, so it cannot be regenerated) and comes back:
   *   miss → 1 day → right → 3 days → right → cleared.
   * A miss during review goes back to the 1-day step.
   *
   * Reviewing never changes game stars or recent scores: a round made only of
   * hard questions would otherwise drag the grown-up report down.
   */
  var REVIEW_KEY = "klg-review-v1";
  // Bump to throw away saved copies if a shipped question turns out to be wrong.
  var REVIEW_EPOCH = 1;
  var REVIEW_MAX_ITEMS = 100;
  var REVIEW_MAX_CHARS = 1000000;
  var REVIEW_MAX_ITEM_CHARS = 50000;
  var REVIEW_GAPS = [1, 3];
  var REVIEW_XP = 5;
  var ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

  function addDays(iso, days) {
    var d = new Date(iso + "T12:00:00");
    d.setDate(d.getDate() + days);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function validReviewItem(it) {
    return !!it && typeof it === "object" && typeof it.id === "string" && typeof it.gameId === "string" &&
      typeof it.query === "string" && typeof it.due === "string" && ISO_DAY.test(it.due) &&
      !!it.snapshot && typeof it.snapshot === "object" && (it.step === 0 || it.step === 1);
  }

  function loadReview() {
    var fresh = { epoch: REVIEW_EPOCH, items: [], cleared: 0 };
    try {
      var data = JSON.parse(localStorage.getItem(REVIEW_KEY));
      if (!data || data.epoch !== REVIEW_EPOCH || !Array.isArray(data.items)) return fresh;
      data.items = data.items.filter(validReviewItem);
      data.cleared = Number.isFinite(data.cleared) && data.cleared > 0 ? data.cleared : 0;
      return data;
    } catch (e) {
      return fresh;
    }
  }

  function saveReview(data) {
    // Oldest questions go first, so the store can never crowd out the rest of the site.
    while (data.items.length > REVIEW_MAX_ITEMS) data.items.shift();
    var text = JSON.stringify(data);
    while (text.length > REVIEW_MAX_CHARS && data.items.length) {
      data.items.shift();
      text = JSON.stringify(data);
    }
    try {
      localStorage.setItem(REVIEW_KEY, text);
    } catch (e) {
      /* private mode — review just isn't offered */
    }
  }

  /** The page's settings without the review flag: "?review=1&level=2" -> "level=2". */
  function reviewQuery() {
    return String((window.location && window.location.search) || "").replace(/^\?/, "").split("&")
      .filter(function (part) { return part && !/^review=/.test(part); }).join("&");
  }

  function reviewHref(group) {
    return "games/" + group.gameId + "/index.html?" + (group.query ? group.query + "&" : "") + "review=1";
  }

  /** Games with questions ready today, in the order the questions were missed. */
  function dueGroups(items) {
    var day = today();
    var groups = [];
    items.filter(function (it) { return it.due <= day; }).forEach(function (it) {
      var group = groups.filter(function (g) { return g.gameId === it.gameId && g.query === it.query; })[0];
      if (!group) {
        group = { gameId: it.gameId, query: it.query, count: 0 };
        group.href = reviewHref(group);
        groups.push(group);
      }
      group.count += 1;
    });
    return groups;
  }

  var review = {
    /** True on a page opened with ?review=1. */
    isActive: function () {
      return /[?&]review=1(&|$)/.test(String((window.location && window.location.search) || ""));
    },

    /**
     * Saves a miss. item = { key, snapshot, prompt?, answer? }.
     * Returns the stored id, or null when the question cannot be saved.
     */
    miss: function (item) {
      var gameId = item.gameId || currentGameId();
      if (!gameId || !item.snapshot) return null;
      var query = item.query !== undefined ? item.query : reviewQuery();
      if (JSON.stringify(item.snapshot).length > REVIEW_MAX_ITEM_CHARS) return null;
      var id = gameId + "|" + query + "|" + item.key;
      var data = loadReview();
      var existing = data.items.filter(function (it) { return it.id === id; })[0];
      var due = addDays(today(), REVIEW_GAPS[0]);
      if (existing) {
        existing.misses = (existing.misses || 0) + 1;
        existing.step = 0;
        existing.due = due;
        existing.snapshot = item.snapshot;
      } else {
        data.items.push({
          id: id, gameId: gameId, query: query, snapshot: item.snapshot, step: 0, due: due, misses: 1,
          prompt: String(item.prompt || "").slice(0, 300), answer: String(item.answer || "").slice(0, 200),
        });
      }
      saveReview(data);
      return id;
    },

    /** Adds the answer once it is known (hand-built games only learn it when the question closes). */
    note: function (id, answer) {
      var data = loadReview();
      var it = data.items.filter(function (x) { return x.id === id; })[0];
      if (!it || !answer) return;
      it.answer = String(answer).slice(0, 200);
      saveReview(data);
    },

    /** Questions ready now for this page's game and settings, oldest miss first. */
    dueHere: function (limit) {
      var gameId = currentGameId();
      var query = reviewQuery();
      var day = today();
      var list = loadReview().items.filter(function (it) { return it.gameId === gameId && it.query === query && it.due <= day; });
      return limit ? list.slice(0, limit) : list;
    },

    /** Moves a question along its schedule. Returns "cleared", "later" or "again". */
    answered: function (id, correct) {
      var data = loadReview();
      var index = data.items.findIndex(function (x) { return x.id === id; });
      if (index < 0) return "again";
      var it = data.items[index];
      var outcome;
      if (!correct) {
        it.step = 0;
        it.misses = (it.misses || 0) + 1;
        it.due = addDays(today(), REVIEW_GAPS[0]);
        outcome = "again";
      } else if (it.step + 1 >= REVIEW_GAPS.length) {
        data.items.splice(index, 1);
        data.cleared += 1;
        outcome = "cleared";
      } else {
        it.step += 1;
        it.due = addDays(today(), REVIEW_GAPS[it.step]);
        outcome = "later";
      }
      saveReview(data);
      return outcome;
    },

    /** { due, waiting, cleared, groups: [{ gameId, query, count, href }], next } */
    summary: function () {
      var data = loadReview();
      var groups = dueGroups(data.items);
      var due = groups.reduce(function (sum, g) { return sum + g.count; }, 0);
      return { due: due, waiting: data.items.length - due, cleared: data.cleared, groups: groups };
    },

    /**
     * Prepares a game's start screen for review: says what is happening and
     * removes the level and mode links, which would leave the review.
     */
    showIntro: function (count) {
      var start = document.getElementById("start-screen");
      if (!start) return;
      start.querySelectorAll('[id$="-links"], .quiz-settings, #best-time-note, #quiz-info').forEach(function (el) { el.hidden = true; el.style.display = "none"; });
      var intro = document.getElementById("klg-review-intro") || document.createElement("p");
      intro.id = "klg-review-intro";
      intro.className = "klg-review-intro";
      intro.textContent = "🔁 Review time! " + count + (count === 1 ? " tricky question" : " tricky questions") + " to try again. No timer, no rush.";
      var button = document.getElementById("start-btn");
      if (!intro.parentNode && button) button.parentNode.insertBefore(intro, button);
    },

    /** "Next game" (when more is due) and "home" links for the end of a review round. */
    finishLinks: function () {
      var box = document.createElement("div");
      box.className = "klg-review-links";
      var next = dueGroups(loadReview().items)[0];
      var game = next && window.KlgCatalogue && window.KlgCatalogue.byId(next.gameId);
      if (next) {
        var more = document.createElement("a");
        more.id = "klg-review-next";
        more.className = "btn btn-lg btn-primary fw-bold";
        more.href = "../../" + next.href;
        more.textContent = "Next: " + (game ? game.name : "another game") + " →";
        box.appendChild(more);
      }
      var home = document.createElement("a");
      home.id = "klg-review-home";
      home.className = "btn btn-lg btn-outline-secondary fw-bold";
      home.href = "../../index.html";
      home.textContent = "🏠 Back to all games";
      box.appendChild(home);
      return box;
    },

    /** The hardest saved questions for the grown-up report, most missed first. */
    tricky: function (limit) {
      return loadReview().items.slice().sort(function (a, b) { return (b.misses || 0) - (a.misses || 0); })
        .slice(0, limit || 10)
        .map(function (it) { return { gameId: it.gameId, prompt: it.prompt, answer: it.answer, misses: it.misses || 1 }; });
    },

    /**
     * Banks a finished review round: 5 XP per right answer and the day streak,
     * nothing else. result = { right, cleared }.
     */
    finish: function (result) {
      var right = result.right || 0;
      var data = load();
      var beforeRank = rankFor(data.xp);
      var xp = right * REVIEW_XP;
      data.xp += xp;
      var day = today();
      touchDayStreak(data, day);
      var stats = derived(data);
      var context = { cleared: result.cleared || 0 };
      var newBadges = [];
      BADGES.forEach(function (badge) {
        if (REVIEW_BADGES.indexOf(badge.id) >= 0 && !data.badges[badge.id] && badge.earned(stats, context)) {
          data.badges[badge.id] = day;
          newBadges.push(badge);
        }
      });
      save(data);
      var afterRank = rankFor(data.xp);
      return {
        xp: xp, totalXp: data.xp, rank: afterRank, rankUp: afterRank.index > beforeRank.index, newBadges: newBadges,
        dayStreak: data.streak, toNextRank: afterRank.next ? afterRank.next.min - data.xp : 0,
      };
    },
  };

  // Offline support: every page loads this file, so it registers the service
  // worker (sw.js at the site root, built by scripts/build-sw.cjs).
  try {
    if (typeof document !== "undefined" && document.currentScript && typeof navigator !== "undefined" &&
        "serviceWorker" in navigator && location.protocol !== "file:") {
      var swUrl = new URL("../../sw.js", document.currentScript.src).href;
      window.addEventListener("load", function () {
        navigator.serviceWorker.register(swUrl).catch(function () { /* offline support is optional */ });
      });
    }
  } catch (e) {
    /* no service workers here */
  }

  window.KlgProgress = {
    RANKS: RANKS,
    BADGES: BADGES,
    record: record,
    summary: function () { return derived(load()); },
    gameStats: function (id) { return load().games[id] || null; },
    currentGameId: currentGameId,
    pathsDone: function () { return pathsDone(derived(load())); },
    rankFor: rankFor,
    starsFor: starsFor,
    review: review,
    reset: function () {
      try {
        localStorage.removeItem(KEY);
        localStorage.removeItem(REVIEW_KEY);
        localStorage.removeItem("klg-bee-v1");
      } catch (e) {
        /* nothing to do */
      }
    },
  };
})();
