/**
 * Landing page behaviour: the player card (rank, XP, streak, badges), the
 * daily challenge, per-card stars and the "surprise me" button.
 *
 * The game list comes from catalogue.js (window.KlgCatalogue): the level
 * sections, subject tabs, learning paths and the grown-up report are all
 * rendered from it, so adding a game is one line in the catalogue.
 */
(function () {
  "use strict";

  function cards() {
    return Array.from(document.querySelectorAll(".game-card[data-game]"));
  }

  function cardInfo(card) {
    var link = card.closest("a");
    return {
      id: card.getAttribute("data-game"),
      name: (card.querySelector("h3") || {}).textContent || card.getAttribute("data-game"),
      emoji: (card.querySelector(".game-card-icon") || {}).textContent || "🎮",
      href: link ? link.getAttribute("href") : "#",
      card: card,
    };
  }

  /** Same game for everyone all day, a different one tomorrow. */
  function dailyIndex(count) {
    var d = new Date();
    var seed = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
    // A small scramble so consecutive days don't just walk down the list.
    // Kept well inside safe-integer range so it stays exact.
    var mixed = (seed * 9301 + 49297) % 233280;
    return Math.floor((mixed / 233280) * count) % count;
  }

  function renderPlayer(summary) {
    var rank = summary.rank;
    document.getElementById("player-rank-emoji").textContent = rank.emoji;
    document.getElementById("player-rank-name").textContent = rank.name;

    var next = rank.next;
    var span = next ? next.min - rank.min : 1;
    var into = summary.xp - rank.min;
    document.getElementById("player-xp-fill").style.width =
      (next ? Math.min(100, (into / span) * 100) : 100) + "%";
    document.getElementById("player-xp-caption").textContent = next
      ? summary.xp + " XP · " + (next.min - summary.xp) + " to " + next.emoji + " " + next.name
      : summary.xp + " XP · top rank reached! 👑";

    var stats = [
      ["🎮", summary.plays, summary.plays === 1 ? "quiz played" : "quizzes played"],
      ["⭐", summary.stars, "stars"],
      ["🔥", summary.dayStreak, summary.dayStreak === 1 ? "day streak" : "day streak"],
      ["🏅", Object.keys(summary.badges).length + "/" + KlgProgress.BADGES.length, "badges"],
    ];
    document.getElementById("player-stats").innerHTML = stats
      .map(function (s) {
        return (
          '<div class="klg-player-stat text-center"><div>' +
          s[0] +
          " " +
          s[1] +
          '</div><div class="small fw-normal">' +
          s[2] +
          "</div></div>"
        );
      })
      .join("");

    var shelf = document.getElementById("player-badges");
    shelf.innerHTML = "";
    KlgProgress.BADGES.forEach(function (badge) {
      var earned = !!summary.badges[badge.id];
      var chip = document.createElement("span");
      chip.className = "klg-badge-chip" + (earned ? "" : " locked");
      chip.textContent = badge.emoji;
      chip.title = earned ? badge.name + " — earned!" : badge.name + ": " + badge.hint;
      shelf.appendChild(chip);
    });
  }

  function decorateCards(summary) {
    cards().forEach(function (card) {
      var stats = summary.games[card.getAttribute("data-game")];
      var body = card.querySelector(".card-body");

      var flag = document.createElement("span");
      flag.className = "klg-card-flag";
      var stars = document.createElement("div");
      stars.className = "klg-card-stars";

      if (!stats) {
        // On a first visit everything is new, and 25 NEW flags say nothing.
        // Once there's some history the flag marks what's left to try.
        if (summary.plays > 0 || card.getAttribute("data-new")) {
          flag.textContent = "NEW";
          card.appendChild(flag);
        }
        stars.textContent = "☆☆☆";
        stars.style.opacity = "0.35";
      } else {
        stars.textContent =
          "⭐".repeat(stats.bestStars) + "☆".repeat(3 - stats.bestStars);
        if (stats.bestStars === 3) {
          flag.textContent = "3 STARS";
          card.appendChild(flag);
        }
      }
      body.appendChild(stars);
    });
  }

  function renderDaily(summary) {
    var all = cards().map(cardInfo);
    if (!all.length) return;
    var game = all[dailyIndex(all.length)];
    document.getElementById("daily-name").textContent = game.emoji + " " + game.name;
    document.getElementById("daily-link").setAttribute("href", game.href);

    var note = document.getElementById("daily-note");
    if (summary.dayStreak > 0) {
      note.textContent =
        "🔥 " +
        summary.dayStreak +
        (summary.dayStreak === 1 ? " day" : " days") +
        " in a row — play any game today to keep it going.";
    } else {
      note.textContent = "Play any game today to start a streak.";
    }
  }


  function esc(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function readPref(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; }
  }

  function writePref(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* not saved */ }
  }

  /** Subject tabs and the four level sections, from the catalogue. */
  function renderLibrary() {
    var cat = window.KlgCatalogue;
    var tabs = document.getElementById("subject-tabs");
    var levels = document.getElementById("levels");
    if (!cat || !tabs || !levels) return;

    var tabHtml = '<button data-subject="all" aria-pressed="true">All games</button>';
    Object.keys(cat.SUBJECTS).forEach(function (key) {
      var cls = key === "tamil" ? ' class="tamil-tab"' : "";
      tabHtml += '<button data-subject="' + key + '" aria-pressed="false"' + cls + ">" + esc(cat.SUBJECTS[key].label) + "</button>";
    });
    tabHtml += '<button data-subject="favorites" aria-pressed="false">♡ Favorites</button>';
    tabs.innerHTML = tabHtml;

    var html = "";
    Object.keys(cat.LEVELS).forEach(function (n) {
      var level = cat.LEVELS[n];
      var games = cat.GAMES.filter(function (g) { return String(g.level) === n; });
      html += '<section id="level-' + n + '" class="mb-5"><div class="klg-level-heading klg-level-' + n + '">' +
        '<span class="klg-level-pill">LEVEL ' + n + '</span><h2 class="h4 fw-bold mb-0">' + esc(level.name) + " " + level.emoji + "</h2>" +
        '<span class="text-muted small">' + esc(level.ages) + " · " + esc(level.note) + "</span></div>" +
        '<div class="row g-4 justify-content-center mt-1">';
      games.forEach(function (g) {
        html += '<div class="col-12 col-sm-6 col-lg-4"><a href="games/' + g.id + '/index.html" class="text-decoration-none">' +
          '<div class="card game-card" data-game="' + g.id + '" data-subject="' + g.subject + '"' + (g.isNew ? ' data-new="1"' : "") + '>' +
          '<div class="card-body text-center p-4"><div class="game-card-icon mb-3">' + esc(g.icon) + "</div>" +
          '<h3 class="h4 fw-bold text-dark">' + esc(g.name) + '</h3><p class="text-muted mb-0">' + esc(g.blurb) + "</p></div></div></a></div>";
      });
      html += "</div></section>";
    });
    levels.innerHTML = html;
  }

  /** Learning paths: pick one, see its steps, ticks for starred steps and what is next. */
  function renderPaths(summary) {
    var cat = window.KlgCatalogue;
    var root = document.getElementById("paths");
    if (!cat || !root) return;
    var keys = Object.keys(cat.PATHS);
    var current = readPref("klg-path", "math");
    if (keys.indexOf(current) < 0) current = keys[0];
    var tabs = document.getElementById("path-tabs");

    function paint() {
      var path = cat.PATHS[current];
      document.getElementById("path-eyebrow").textContent = path.eyebrow;
      document.getElementById("paths-title").textContent = path.title;
      document.getElementById("path-note").textContent = path.note;

      var nextStep = null;
      var items = path.steps.map(function (step, i) {
        var game = cat.byId(step.game);
        var stats = summary.games[step.game];
        var done = !!(stats && stats.bestStars > 0);
        if (!done && !nextStep) nextStep = { step: step, game: game };
        var isNext = nextStep && nextStep.step === step;
        var glyph = current === "tamil" && /[஀-௿]/.test(game.icon) ? " tamil-glyph" : "";
        return '<li><a href="games/' + game.id + '/index.html"' + (done ? ' class="done"' : isNext ? ' class="next-up"' : "") + ">" +
          '<span class="step-n">' + (i + 1) + '</span><span class="step-icon' + glyph + '">' + esc(game.icon) + "</span>" +
          "<b>" + esc(step.label) + "</b><small>" + esc(game.name) + "</small>" +
          (done ? '<span class="step-tick" aria-label="Done">✓</span>' : isNext ? '<span class="step-chip">Next up</span>' : "") + "</a></li>";
      });
      document.getElementById("path-steps").innerHTML = items.join("");
      document.getElementById("path-next").textContent = nextStep
        ? "Next up: " + nextStep.step.label + " · " + nextStep.game.name
        : "🎉 You have a star in every step of this path!";

      tabs.querySelectorAll("button[data-path]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-path") === current));
      });
      var count = cat.GAMES.filter(function (g) { return g.subject === current; }).length;
      var jump = document.getElementById("path-jump");
      jump.textContent = "See all " + count + " " + cat.SUBJECTS[current].label.replace(/^\S+\s/, "") + " games →";
      jump.id = "path-jump";
    }

    tabs.innerHTML = keys.map(function (key) {
      return '<button type="button" data-path="' + key + '" aria-pressed="false">' + esc(cat.SUBJECTS[key].label) + "</button>";
    }).join("") + '<button type="button" id="path-jump" class="surprise-button"></button>';
    tabs.querySelectorAll("button[data-path]").forEach(function (b) {
      b.addEventListener("click", function () { current = b.getAttribute("data-path"); writePref("klg-path", current); paint(); });
    });
    document.getElementById("path-jump").addEventListener("click", function () {
      var search = document.getElementById("game-search");
      var level = document.getElementById("level-filter");
      search.value = ""; search.dispatchEvent(new Event("input"));
      level.value = "all"; level.dispatchEvent(new Event("change"));
      var tab = document.querySelector('.subject-tabs [data-subject="' + current + '"]');
      if (tab) tab.click();
      document.getElementById("library").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });
    paint();
  }

  /** Grown-up report: stars, recent accuracy and what to practise, per subject. */
  function sparkline(values) {
    if (values.length < 2) return "";
    var w = 90, h = 24;
    var pts = values.map(function (v, i) {
      return (i * (w / (values.length - 1))).toFixed(1) + "," + (h - 2 - (v / 100) * (h - 4)).toFixed(1);
    }).join(" ");
    return '<svg class="spark" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Last ' + values.length + " scores: " + values.join("%, ") + '%"><polyline points="' + pts + '" fill="none" stroke="#4055b5" stroke-width="2"/></svg>';
  }

  function skillRows(summary) {
    var cat = window.KlgCatalogue;
    var rows = {};
    cat.GAMES.forEach(function (g) {
      var st = summary.games[g.id];
      g.skills.forEach(function (tag) {
        var r = rows[tag] || (rows[tag] = { tag: tag, subject: g.subject, games: [], played: [], stars: 0, recent: [], last: "" });
        r.games.push(g);
        if (st) {
          r.played.push(g);
          r.stars = Math.max(r.stars, st.bestStars || 0);
          if ((st.lastPlayed || "") >= r.last) { r.last = st.lastPlayed || r.last; r.recent = st.recent || []; }
        }
      });
    });
    return Object.keys(rows).map(function (k) { return rows[k]; });
  }

  function nextGameAfter(game, summary) {
    var cat = window.KlgCatalogue;
    for (var key in cat.PATHS) {
      var steps = cat.PATHS[key].steps;
      var i = steps.findIndex(function (s) { return s.game === game.id; });
      if (i >= 0) {
        for (var j = i + 1; j < steps.length; j++) {
          var st = summary.games[steps[j].game];
          if (!st || !st.bestStars) return cat.byId(steps[j].game);
        }
      }
    }
    return null;
  }

  function renderReport() {
    var box = document.getElementById("parent-report");
    var cat = window.KlgCatalogue;
    if (!box || !cat) return;
    var summary = KlgProgress.summary();
    var rows = skillRows(summary);
    var avg = function (r) { return r.recent.length ? r.recent.reduce(function (a, b) { return a + b; }, 0) / r.recent.length : null; };

    var practise = rows.filter(function (r) { var a = avg(r); return a !== null && a < 60; });
    var ready = [];
    rows.filter(function (r) { return r.stars === 3; }).forEach(function (r) {
      var done = r.played.filter(function (g) { return summary.games[g.id].bestStars === 3; })[0];
      var next = done && nextGameAfter(done, summary);
      if (next && !ready.some(function (x) { return x.id === next.id; })) ready.push(next);
    });

    var html = "<h3>Progress report</h3>";
    if (!summary.gamesPlayed) {
      box.innerHTML = html + "<p>No rounds yet. Once your child plays, you will see stars and recent scores for each skill here.</p>";
      return;
    }
    html += '<p class="report-summary"><b>Needs practice:</b> ' + (practise.length ? practise.map(function (r) { return esc(skillName(r.tag)); }).join(", ") : "nothing right now 🎉") +
      '<br><b>Ready for next:</b> ' + (ready.length ? ready.slice(0, 4).map(function (g) { return '<a href="games/' + g.id + '/index.html">' + esc(g.icon + " " + g.name) + "</a>"; }).join(", ") : "keep earning stars on the current games") + "</p>";

    Object.keys(cat.SUBJECTS).forEach(function (subject) {
      var list = rows.filter(function (r) { return r.subject === subject && r.played.length; });
      if (!list.length) return;
      html += "<h4>" + esc(cat.SUBJECTS[subject].label) + '</h4><table class="report-table"><thead><tr><th>Skill</th><th>Stars</th><th>Recent scores</th><th>Last played</th></tr></thead><tbody>';
      list.forEach(function (r) {
        var a = avg(r);
        html += "<tr" + (a !== null && a < 60 ? ' class="weak"' : "") + "><td>" + esc(skillName(r.tag)) + "</td><td>" + "⭐".repeat(r.stars) + "☆".repeat(3 - r.stars) + "</td><td>" +
          (r.recent.length ? sparkline(r.recent) + " <small>" + Math.round(a) + "% avg</small>" : "–") + "</td><td>" + esc(r.last || "–") + "</td></tr>";
      });
      html += "</tbody></table>";
    });
    html += '<button type="button" class="print-report" id="print-report">Print this report</button>';
    box.innerHTML = html;
    document.getElementById("print-report").addEventListener("click", function () { window.print(); });
  }

  function skillName(tag) {
    var names = (window.KlgCatalogue && window.KlgCatalogue.SKILL_NAMES) || {};
    return names[tag] || tag.split(".")[1].replace(/-/g, " ");
  }


  /** Tells grown-ups whether the games are saved on this device yet. */
  function renderOfflineStatus() {
    var el = document.getElementById("offline-status");
    if (!el) return;
    if (!("serviceWorker" in navigator) || !window.caches) { el.textContent = "This browser cannot save the games for offline use."; return; }
    caches.keys().then(function (keys) {
      var key = keys.filter(function (k) { return k.indexOf("klg-") === 0; }).pop();
      if (!key) { el.textContent = "Saving the games for offline use… keep this page open for a minute while online."; return; }
      return caches.open(key).then(function (c) { return c.keys(); }).then(function (list) {
        el.textContent = "✓ Saved on this device for offline use (" + list.length + " files).";
      });
    }).catch(function () { el.textContent = ""; });
  }

  function wireButtons() {
    document.getElementById("surprise-btn").addEventListener("click", function () {
      var all = cards().filter(function (card) { return !card.closest(".game-tile").hidden; }).map(cardInfo);
      if (!all.length) return;
      if (window.KlgSounds) KlgSounds.click();
      window.location.href = all[Math.floor(Math.random() * all.length)].href;
    });

    document.getElementById("reset-progress").addEventListener("click", function () {
      var ok = window.confirm(
        "Start over? This clears your XP, stars, badges and streak on this device."
      );
      if (!ok) return;
      KlgProgress.reset();
      window.location.reload();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!window.KlgProgress) return;
    var summary = KlgProgress.summary();
    renderLibrary();
    renderPlayer(summary);
    decorateCards(summary);
    renderDaily(summary);
    renderPaths(summary);
    wireButtons();
    document.getElementById("parent-open").addEventListener("click", renderReport);
    document.getElementById("parent-open").addEventListener("click", renderOfflineStatus);
  });
})();

// Library discovery stays independent of progress storage.
document.addEventListener('DOMContentLoaded', () => {
  const tiles = [...document.querySelectorAll('.game-card[data-game]')];
  let favorites = [];
  try { const saved = JSON.parse(localStorage.getItem('klg-favorites') || '[]'); if (Array.isArray(saved)) favorites = saved.filter(id => typeof id === 'string'); } catch (_) {}
  let subject = 'all';
  const search = document.getElementById('game-search');
  const level = document.getElementById('level-filter');
  function filter() {
    let count = 0;
    tiles.forEach(card => {
      const matches = card.textContent.toLowerCase().includes(search.value.trim().toLowerCase()) &&
        (level.value === 'all' || card.closest('section').id === 'level-' + level.value) &&
        (subject === 'all' || (subject === 'favorites' ? favorites.includes(card.dataset.game) : card.dataset.subject === subject));
      card.closest('.game-tile').hidden = !matches;
      if (matches) count++;
    });
    document.querySelectorAll('section[id^="level-"]').forEach(section => {
      section.hidden = ![...section.querySelectorAll('.game-tile')].some(tile => !tile.hidden);
    });
    document.getElementById('filter-status').textContent = `${count} ${count === 1 ? 'game' : 'games'} to explore · Choose what sparks your curiosity`;
    document.getElementById('empty-games').hidden = count !== 0;
    document.getElementById('surprise-btn').disabled = count === 0;
  }
  tiles.forEach(card => {
    const id = card.dataset.game;
    const tile = card.closest('a').parentElement;
    tile.classList.add('game-tile');
    const favorite = document.createElement('button');
    favorite.className = 'favorite-button';
    favorite.type = 'button';
    function paint() { const selected = favorites.includes(id); favorite.textContent = selected ? '♥' : '♡'; favorite.setAttribute('aria-pressed', String(selected)); favorite.setAttribute('aria-label', `Favorite ${card.querySelector('h3').textContent}`); }
    paint();
    favorite.addEventListener('click', () => { favorites = favorites.includes(id) ? favorites.filter(value => value !== id) : [...favorites,id]; try { localStorage.setItem('klg-favorites', JSON.stringify(favorites)); } catch (_) {} paint(); filter(); });
    tile.appendChild(favorite);
  });
  search.addEventListener('input', filter);
  level.addEventListener('change', filter);
  document.querySelectorAll('.subject-tabs button').forEach(button => button.addEventListener('click', () => {
    subject = button.dataset.subject;
    document.querySelectorAll('.subject-tabs button').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
    filter();
  }));
  document.getElementById('clear-filters').addEventListener('click', () => { search.value = ''; level.value = 'all'; document.querySelector('[data-subject="all"]').click(); search.focus(); });
  const dialog = document.getElementById('parent-dialog');
  document.getElementById('parent-open').addEventListener('click', () => {
    const summary = KlgProgress.summary();
    document.getElementById('parent-summary').textContent = `${summary.gamesPlayed} activities explored · ${summary.plays} rounds completed · ${summary.stars} stars earned.`;
    const shelf = document.getElementById('player-badges');
    dialog.appendChild(shelf);
    shelf.classList.add('parent-badges');
    shelf.replaceChildren();
    KlgProgress.BADGES.forEach(badge => {
      const item = document.createElement('div');
      item.className = 'parent-badge';
      item.textContent = badge.emoji + ' ' + badge.name + (summary.badges[badge.id] ? ' · earned' : ' · ' + badge.hint);
      shelf.appendChild(item);
    });
    dialog.showModal();
  });
  document.getElementById('parent-close').addEventListener('click', () => dialog.close());
  filter();
});
