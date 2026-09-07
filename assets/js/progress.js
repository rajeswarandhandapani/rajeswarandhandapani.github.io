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
  ];

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
    var match = window.location.pathname.match(/\/games\/([^/]+)\//);
    return match ? match[1] : null;
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
    if (data.lastDay !== day) {
      var gap = data.lastDay ? daysBetween(data.lastDay, day) : null;
      data.streak = gap === 1 ? data.streak + 1 : 1;
      data.lastDay = day;
      data.bestStreak = Math.max(data.bestStreak || 0, data.streak);
    }

    var g = data.games[gameId] || { plays: 0, bestScore: 0, total: total, bestStars: 0, bestMs: 0 };
    g.plays += 1;
    g.total = total;
    g.lastPlayed = day;
    var isBest = score > g.bestScore;
    if (isBest) g.bestScore = score;
    g.bestStars = Math.max(g.bestStars || 0, stars);
    if (score === total && total > 0 && elapsedMs > 0 && (!g.bestMs || elapsedMs < g.bestMs)) {
      g.bestMs = elapsedMs;
    }
    data.games[gameId] = g;

    var stats = derived(data);
    var context = { score: score, total: total, bestStreak: bestStreak, elapsedMs: elapsedMs };
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

  window.KlgProgress = {
    RANKS: RANKS,
    BADGES: BADGES,
    record: record,
    summary: function () { return derived(load()); },
    gameStats: function (id) { return load().games[id] || null; },
    currentGameId: currentGameId,
    rankFor: rankFor,
    starsFor: starsFor,
    reset: function () {
      try {
        localStorage.removeItem(KEY);
      } catch (e) {
        /* nothing to do */
      }
    },
  };
})();
