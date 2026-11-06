/**
 * The home page: one job per view, so a child who cannot read yet can still get
 * to a game. The address hash picks the view, so the Back button and links work.
 *
 *   (none)        ▶ Play next, 🔁 Try again when due, rank and streak, six picture tiles with progress
 *   #world/math   that subject's games, easiest first
 *   #world/favorites  the games marked with a heart
 *   #me           rank, XP, streak and badges
 *   #all          search and filters over every game
 *
 * Every game comes from catalogue.js (window.KlgCatalogue), so adding a game is
 * one line in the catalogue. All the cards stay in one grid, shown and ordered
 * according to the view. Nobody is asked their age: each game has its own levels.
 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const FAVORITES_KEY = "klg-favorites";
  const canSpeak = !!window.speechSynthesis && typeof window.SpeechSynthesisUtterance !== "undefined";
  let favorites = [];
  let summary = null;
  let firstRoute = true;

  function esc(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function readPref(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; }
  }

  function writePref(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* lasts for this visit only */ }
  }

  function say(text) {
    if (!canSpeak || !text) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text).replace(/[\u{1F300}-\u{1FAFF}]/gu, "").trim());
    utterance.lang = "en-US";
    utterance.rate = 0.88;
    speechSynthesis.speak(utterance);
  }

  /** A speaker button that says `text` (a string, or a function for text that changes). */
  function speaker(text, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "kid-say";
    button.textContent = "🔊";
    button.hidden = !canSpeak;
    const words = () => (typeof text === "function" ? text() : text);
    button.setAttribute("aria-label", "Hear: " + (label || words()));
    button.addEventListener("click", (event) => {
      event.preventDefault();
      say(words());
    });
    return button;
  }

  /** What to say for a game. The voice is English, so Tamil names use the English description. */
  function spokenName(game) {
    return /[஀-௿]/.test(game.name) ? game.blurb : game.name;
  }

  /* ---------- the game cards ---------- */

  function renderCards() {
    const cat = window.KlgCatalogue;
    const tabs = $("subject-tabs");
    let tabHtml = '<button data-subject="all" aria-pressed="true">All games</button>';
    Object.keys(cat.SUBJECTS).forEach((key) => {
      const cls = key === "tamil" ? ' class="tamil-tab"' : "";
      tabHtml += '<button data-subject="' + key + '" aria-pressed="false"' + cls + ">" + esc(cat.SUBJECTS[key].label) + "</button>";
    });
    tabHtml += '<button data-subject="favorites" aria-pressed="false">♡ Favorites</button>';
    tabs.innerHTML = tabHtml;

    const grid = $("levels");
    grid.replaceChildren();
    cat.GAMES.forEach((game) => {
      const tile = document.createElement("div");
      tile.className = "game-tile";
      tile.dataset.game = game.id;
      tile.innerHTML = '<a href="games/' + game.id + '/index.html" class="text-decoration-none"><div class="card game-card" data-game="' + game.id + '" data-subject="' + game.subject + '" data-level="' + game.level + '" data-ages="' + game.levels.map((l) => l.band).join(",") + '"' + (game.isNew ? ' data-new="1"' : "") + ">" +
        '<div class="card-body"><div class="game-card-icon">' + esc(game.icon) + "</div>" +
        "<h3>" + esc(game.name) + '</h3><p class="kid-blurb">' + esc(game.blurb) + '</p><div class="kid-card-ages">Ages ' + esc(cat.agesLabel(game)) + "</div></div></div></a>";
      tile.appendChild(speaker(() => spokenName(game), game.name));
      const favorite = document.createElement("button");
      favorite.className = "favorite-button";
      favorite.type = "button";
      favorite.setAttribute("aria-label", "Favorite " + game.name);
      favorite.addEventListener("click", () => {
        favorites = favorites.includes(game.id) ? favorites.filter((id) => id !== game.id) : [...favorites, game.id];
        writePref(FAVORITES_KEY, JSON.stringify(favorites));
        paintFavorite(favorite, game.id);
        showCards();
      });
      paintFavorite(favorite, game.id);
      tile.appendChild(favorite);
      grid.appendChild(tile);
    });
  }

  function paintFavorite(button, id) {
    const on = favorites.includes(id);
    button.textContent = on ? "♥" : "♡";
    button.setAttribute("aria-pressed", String(on));
  }

  function decorateCards() {
    document.querySelectorAll(".game-card[data-game]").forEach((card) => {
      const stats = summary.games[card.dataset.game];
      const body = card.querySelector(".card-body");
      if (card.dataset.new && !stats) {
        const flag = document.createElement("span");
        flag.className = "klg-card-flag";
        flag.textContent = "NEW";
        card.appendChild(flag);
      }
      const stars = document.createElement("div");
      stars.className = "klg-card-stars";
      const earned = stats ? stats.bestStars : 0;
      stars.textContent = "⭐".repeat(earned) + "☆".repeat(3 - earned);
      stars.setAttribute("aria-label", earned + (earned === 1 ? " star" : " stars"));
      body.appendChild(stars);
    });
  }

  /** Shows the cards this view asks for, in order, and marks progress along the way. */
  function showCards() {
    const view = document.body.dataset.view;
    const world = document.body.dataset.world;
    const grid = $("levels");
    grid.hidden = view !== "world" && view !== "all";
    if (grid.hidden) return;
    if (view === "all") return filterAll();

    const cat = window.KlgCatalogue;
    const list = world === "favorites"
      ? favorites.map((id) => cat.byId(id)).filter(Boolean)
      : cat.gamesFor(world);
    const order = new Map(list.map((game, i) => [game.id, i]));
    const nextGame = world === "favorites" ? null : list.filter((g) => !(summary.games[g.id] && summary.games[g.id].bestStars > 0))[0];
    grid.querySelectorAll(".game-tile").forEach((tile) => {
      const id = tile.dataset.game;
      tile.hidden = !order.has(id);
      tile.style.order = order.has(id) ? order.get(id) : "";
      markProgress(tile, id, nextGame);
    });
    $("world-empty").hidden = list.length > 0;
    const status = $("path-next");
    if (world === "favorites") status.textContent = "";
    else if (nextGame) status.textContent = "Next up: " + nextLabel(nextGame);
    else status.textContent = "🎉 You have a star in every game here!";
  }

  /** A path step's short label and the game's name, as in "Hear numbers · Number Sounds". */
  function nextLabel(game) {
    const path = KlgCatalogue.PATHS[game.subject];
    const step = path && path.steps.filter((s) => s.game === game.id)[0];
    return step ? step.label + " · " + game.name : game.name;
  }

  function markProgress(tile, id, nextGame) {
    const card = tile.querySelector(".game-card");
    const done = !!(summary.games[id] && summary.games[id].bestStars > 0);
    const isNext = !!nextGame && nextGame.id === id;
    card.classList.toggle("done", done);
    card.classList.toggle("next-up", isNext);
    let chip = card.querySelector(".kid-next-chip");
    if (isNext && !chip) {
      chip = document.createElement("span");
      chip.className = "kid-next-chip";
      chip.textContent = "Next up";
      card.appendChild(chip);
    } else if (!isNext && chip) {
      chip.remove();
    }
  }

  /* ---------- #all: search and filters over every game ---------- */

  let subjectFilter = "all";

  function filterAll() {
    const search = $("game-search").value.trim().toLowerCase();
    const level = $("level-filter").value;
    let count = 0;
    document.querySelectorAll("#levels .game-tile").forEach((tile, index) => {
      const card = tile.querySelector(".game-card");
      const matches = card.textContent.toLowerCase().includes(search) &&
        (level === "all" || card.dataset.ages.split(",").includes(level) || (!card.dataset.ages && card.dataset.level === level)) &&
        (subjectFilter === "all" || (subjectFilter === "favorites" ? favorites.includes(tile.dataset.game) : card.dataset.subject === subjectFilter));
      tile.hidden = !matches;
      tile.style.order = Number(card.dataset.level) * 1000 + index;
      markProgress(tile, tile.dataset.game, null);
      if (matches) count += 1;
    });
    $("filter-status").textContent = count + (count === 1 ? " game" : " games");
    $("empty-games").hidden = count !== 0;
  }

  function wireFilters() {
    const search = $("game-search");
    const level = $("level-filter");
    search.addEventListener("input", filterAll);
    level.addEventListener("change", filterAll);
    document.querySelectorAll(".subject-tabs button").forEach((button) => button.addEventListener("click", () => {
      subjectFilter = button.dataset.subject;
      document.querySelectorAll(".subject-tabs button").forEach((tab) => tab.setAttribute("aria-pressed", String(tab === button)));
      filterAll();
    }));
    $("clear-filters").addEventListener("click", () => {
      search.value = "";
      level.value = "all";
      document.querySelector('.subject-tabs [data-subject="all"]').click();
      search.focus();
    });
  }

  /* ---------- the home view ---------- */

  function renderWorldTiles() {
    const cat = window.KlgCatalogue;
    const box = $("worlds");
    box.replaceChildren();
    const add = (key, name, icon, words, attrs) => {
      const tile = document.createElement("div");
      tile.className = "kid-world";
      Object.keys(attrs).forEach((k) => { tile.dataset[k] = attrs[k]; });
      const link = document.createElement("a");
      link.className = "kid-world-link";
      link.href = "#world/" + key;
      link.setAttribute("aria-label", words);
      link.innerHTML = '<span class="kid-world-icon" aria-hidden="true">' + esc(icon) + '</span><b></b><span class="kid-world-count" aria-hidden="true"></span>';
      link.querySelector("b").textContent = name;
      tile.append(link, speaker(words));
      box.appendChild(tile);
    };
    Object.keys(cat.SUBJECTS).forEach((key) => {
      const subject = cat.SUBJECTS[key];
      add(key, subject.kid, subject.icon, subject.say, { subject: key });
    });
    add("favorites", "Favorites", "♥", "Favorites", { world: "favorites" });
  }

  /** How many of a subject's games have a star: { done, total }. */
  function subjectProgress(key) {
    const list = KlgCatalogue.gamesFor(key);
    return { done: list.filter((g) => summary.games[g.id] && summary.games[g.id].bestStars > 0).length, total: list.length };
  }

  function progressHtml(key) {
    const p = subjectProgress(key);
    return "⭐ " + p.done + "/" + p.total + '<span class="kid-world-bar"><i style="width:' + Math.round((p.done / p.total) * 100) + '%"></i></span>';
  }

  function paintWorldCounts() {
    document.querySelectorAll(".kid-world").forEach((tile) => {
      tile.querySelector(".kid-world-count").innerHTML = tile.dataset.subject ? progressHtml(tile.dataset.subject) : "♥ " + favorites.length;
    });
  }

  /** The rank, how far to the next one, and the numbers a child is proud of. */
  function paintLevel() {
    const rank = summary.rank;
    const fill = rank.next ? Math.min(100, ((summary.xp - rank.min) / (rank.next.min - rank.min)) * 100) : 100;
    $("home-level").innerHTML = '<span class="kid-levelcard-pic" aria-hidden="true">' + rank.emoji + '</span><div class="kid-levelcard-rank"><b>' + esc(rank.name) + '</b><div class="kid-xp"><i style="width:' + fill + '%"></i></div></div>' +
      '<div class="kid-levelcard-stats"><span>🔥 ' + summary.dayStreak + "</span><span>🎮 " + summary.plays + "</span><span>🏅 " + Object.keys(summary.badges).length + "</span></div>";
  }

  function renderHome() {
    const cat = window.KlgCatalogue;
    paintWorldCounts();
    paintLevel();
    const next = cat.nextFor(summary.games, readPref("klg-path", ""));
    if (next) {
      $("play-next").setAttribute("href", "games/" + next.id + "/index.html");
      $("play-next").dataset.subject = next.subject;
      $("play-next-name").textContent = next.name;
      $("play-next-pic").textContent = next.icon;
      $("play-next-wrap").dataset.subject = next.subject;
    }
    const list = cat.GAMES;
    const today = list[dailyIndex(list.length)];
    if (today) {
      $("daily-name").textContent = today.icon + " " + today.name;
      $("daily-link").setAttribute("href", "games/" + today.id + "/index.html");
    }
    renderReviewCard();
  }

  /** Same game all day, a different one tomorrow. */
  function dailyIndex(count) {
    const d = new Date();
    const seed = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
    // A small scramble so consecutive days don't just walk down the list.
    const mixed = (seed * 9301 + 49297) % 233280;
    return Math.floor((mixed / 233280) * count) % count;
  }

  /** The Review card appears only when missed questions are ready for another try. */
  function renderReviewCard() {
    const card = $("review-card");
    const review = KlgProgress.review.summary();
    card.hidden = review.due === 0;
    if (!review.due) return;
    $("review-count").textContent = review.due + (review.due === 1 ? " question" : " questions") + " ready for another try";
    const games = review.groups.length;
    $("review-note").textContent = "From " + games + (games === 1 ? " game." : " games.");
    $("review-link").setAttribute("href", review.groups[0].href);
  }

  /* ---------- the top bar ---------- */

  function paintTopBar() {
    const stars = $("stars-chip");
    stars.textContent = "⭐ " + summary.stars;
    stars.setAttribute("aria-label", summary.stars + (summary.stars === 1 ? " star" : " stars") + ". See my stars.");
    const sound = $("klg-mute-btn");
    const bar = document.querySelector(".kid-top");
    if (sound && sound.parentNode !== bar) bar.appendChild(sound);
  }

  /* ---------- #me ---------- */

  function renderPlayer() {
    const rank = summary.rank;
    $("player-rank-emoji").textContent = rank.emoji;
    $("player-rank-name").textContent = rank.name;
    const next = rank.next;
    const span = next ? next.min - rank.min : 1;
    const into = summary.xp - rank.min;
    $("player-xp-fill").style.width = (next ? Math.min(100, (into / span) * 100) : 100) + "%";
    $("player-xp-caption").textContent = next
      ? summary.xp + " XP · " + (next.min - summary.xp) + " to " + next.emoji + " " + next.name
      : summary.xp + " XP · top rank reached! 👑";

    const stats = [
      ["🎮", summary.plays, summary.plays === 1 ? "game played" : "games played"],
      ["⭐", summary.stars, "stars"],
      ["🔥", summary.dayStreak, "day streak"],
      ["🏅", Object.keys(summary.badges).length + "/" + KlgProgress.BADGES.length, "badges"],
    ];
    $("player-stats").innerHTML = stats.map((s) =>
      '<div class="klg-player-stat text-center"><div>' + s[0] + " " + s[1] + '</div><div class="small fw-normal">' + s[2] + "</div></div>").join("");

    const shelf = $("player-badges");
    shelf.replaceChildren();
    KlgProgress.BADGES.forEach((badge) => {
      const earned = !!summary.badges[badge.id];
      const chip = document.createElement("div");
      chip.className = "klg-badge-chip" + (earned ? "" : " locked");
      chip.title = earned ? badge.name + " — earned!" : badge.name + ": " + badge.hint;
      chip.innerHTML = '<span class="kid-badge-pic" aria-hidden="true">' + badge.emoji + "</span><b></b>";
      chip.querySelector("b").textContent = badge.name;
      shelf.appendChild(chip);
    });
  }

  /* ---------- the subject view ---------- */

  function renderWorld(world) {
    const cat = window.KlgCatalogue;
    const subject = cat.SUBJECTS[world];
    const name = subject ? subject.kid : "Favorites";
    const icon = subject ? subject.icon : "♥";
    const words = subject ? subject.say : "Favorites";
    const head = $("world-head");
    if (subject) head.dataset.subject = world;
    else delete head.dataset.subject;
    $("world-title").textContent = icon + " " + name;
    $("world-say").replaceWith(Object.assign(speaker(words), { id: "world-say" }));

    if (subject) writePref("klg-path", world);
  }

  /* ---------- views ---------- */

  function route() {
    const cat = window.KlgCatalogue;
    const hash = location.hash.replace(/^#/, "");
    let view = "home";
    let world = "";
    if (hash === "me" || hash === "all") view = hash;
    else if (hash.indexOf("world/") === 0) {
      const key = hash.slice(6);
      if (cat.SUBJECTS[key] || key === "favorites") { view = "world"; world = key; }
    }
    document.body.dataset.view = view;
    document.body.dataset.world = world;
    document.querySelectorAll(".kid-view").forEach((section) => { section.hidden = section.dataset.view !== view; });
    if (view === "home") renderHome();
    if (view === "world") renderWorld(world);
    if (view === "me") renderPlayer();
    showCards();
    window.scrollTo(0, 0);
    if (!firstRoute) {
      const title = document.querySelector('.kid-view[data-view="' + view + '"] h1');
      if (title) title.focus({ preventScroll: true });
    }
    firstRoute = false;
  }

  /* ---------- the grown-up report ---------- */

  function sparkline(values) {
    if (values.length < 2) return "";
    const w = 90, h = 24;
    const pts = values.map((v, i) => (i * (w / (values.length - 1))).toFixed(1) + "," + (h - 2 - (v / 100) * (h - 4)).toFixed(1)).join(" ");
    return '<svg class="spark" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Last ' + values.length + " scores: " + values.join("%, ") + '%"><polyline points="' + pts + '" fill="none" stroke="#4055b5" stroke-width="2"/></svg>';
  }

  function skillRows(current) {
    const rows = {};
    KlgCatalogue.GAMES.forEach((g) => {
      const st = current.games[g.id];
      g.skills.forEach((tag) => {
        const r = rows[tag] || (rows[tag] = { tag, subject: g.subject, games: [], played: [], stars: 0, recent: [], last: "" });
        r.games.push(g);
        if (st) {
          r.played.push(g);
          r.stars = Math.max(r.stars, st.bestStars || 0);
          if ((st.lastPlayed || "") >= r.last) { r.last = st.lastPlayed || r.last; r.recent = st.recent || []; }
        }
      });
    });
    return Object.keys(rows).map((k) => rows[k]);
  }

  function nextGameAfter(game, current) {
    const cat = window.KlgCatalogue;
    for (const key in cat.PATHS) {
      const steps = cat.PATHS[key].steps;
      const i = steps.findIndex((s) => s.game === game.id);
      if (i >= 0) {
        for (let j = i + 1; j < steps.length; j++) {
          const st = current.games[steps[j].game];
          if (!st || !st.bestStars) return cat.byId(steps[j].game);
        }
      }
    }
    return null;
  }

  function skillName(tag) {
    const names = KlgCatalogue.SKILL_NAMES || {};
    return names[tag] || tag.split(".")[1].replace(/-/g, " ");
  }

  /** For the grown-up report: the questions this child has missed most often. */
  function trickyHtml() {
    const cat = window.KlgCatalogue;
    const list = KlgProgress.review.tricky(10);
    if (!list.length) return "";
    const waiting = KlgProgress.review.summary();
    let html = '<h4>🔁 Tricky questions</h4><p class="report-note">' + (waiting.due + waiting.waiting) +
      " saved for review, " + waiting.cleared + " mastered so far.</p>" +
      '<table class="report-table report-tricky"><thead><tr><th>Question</th><th>Answer</th><th>Missed</th></tr></thead><tbody>';
    list.forEach((item) => {
      const game = cat.byId(item.gameId);
      html += "<tr><td>" + esc(item.prompt) + (game ? " <small>" + esc(game.name) + "</small>" : "") + "</td><td>" + esc(item.answer || "–") + "</td><td>" + item.misses + "×</td></tr>";
    });
    return html + "</tbody></table>";
  }

  function renderReport() {
    const box = $("parent-report");
    const cat = window.KlgCatalogue;
    const current = KlgProgress.summary();
    const rows = skillRows(current);
    const avg = (r) => (r.recent.length ? r.recent.reduce((a, b) => a + b, 0) / r.recent.length : null);

    const practise = rows.filter((r) => { const a = avg(r); return a !== null && a < 60; });
    const ready = [];
    rows.filter((r) => r.stars === 3).forEach((r) => {
      const done = r.played.filter((g) => current.games[g.id].bestStars === 3)[0];
      const next = done && nextGameAfter(done, current);
      if (next && !ready.some((x) => x.id === next.id)) ready.push(next);
    });

    let html = "<h3>Progress report</h3>";
    if (!current.gamesPlayed) {
      box.innerHTML = html + "<p>No rounds yet. Once your child plays, you will see stars and recent scores for each skill here.</p>";
      return;
    }
    html += '<p class="report-summary"><b>Needs practice:</b> ' + (practise.length ? practise.map((r) => esc(skillName(r.tag))).join(", ") : "nothing right now 🎉") +
      "<br><b>Ready for next:</b> " + (ready.length ? ready.slice(0, 4).map((g) => '<a href="games/' + g.id + '/index.html">' + esc(g.icon + " " + g.name) + "</a>").join(", ") : "keep earning stars on the current games") + "</p>";

    Object.keys(cat.SUBJECTS).forEach((subject) => {
      const list = rows.filter((r) => r.subject === subject && r.played.length);
      if (!list.length) return;
      html += "<h4>" + esc(cat.SUBJECTS[subject].label) + '</h4><table class="report-table"><thead><tr><th>Skill</th><th>Stars</th><th>Recent scores</th><th>Last played</th></tr></thead><tbody>';
      list.forEach((r) => {
        const a = avg(r);
        html += "<tr" + (a !== null && a < 60 ? ' class="weak"' : "") + "><td>" + esc(skillName(r.tag)) + "</td><td>" + "⭐".repeat(r.stars) + "☆".repeat(3 - r.stars) + "</td><td>" +
          (r.recent.length ? sparkline(r.recent) + " <small>" + Math.round(a) + "% avg</small>" : "–") + "</td><td>" + esc(r.last || "–") + "</td></tr>";
      });
      html += "</tbody></table>";
    });
    html += trickyHtml();
    html += '<button type="button" class="print-report" id="print-report">Print this report</button>';
    box.innerHTML = html;
    $("print-report").addEventListener("click", () => window.print());
  }

  /** Tells grown-ups whether the games are saved on this device yet. */
  function renderOfflineStatus() {
    const el = $("offline-status");
    if (!("serviceWorker" in navigator) || !window.caches) { el.textContent = "This browser cannot save the games for offline use."; return; }
    caches.keys().then((keys) => {
      const key = keys.filter((k) => k.indexOf("klg-") === 0).pop();
      if (!key) { el.textContent = "Saving the games for offline use… keep this page open for a minute while online."; return; }
      return caches.open(key).then((c) => c.keys()).then((list) => {
        el.textContent = "✓ Saved on this device for offline use (" + list.length + " files).";
      });
    }).catch(() => { el.textContent = ""; });
  }

  function openParentDialog() {
    const current = KlgProgress.summary();
    renderReport();
    renderOfflineStatus();
    $("parent-summary").textContent = current.gamesPlayed + " activities explored · " + current.plays + " rounds completed · " + current.stars + " stars earned.";
    const list = $("parent-badge-list");
    list.replaceChildren();
    KlgProgress.BADGES.forEach((badge) => {
      const item = document.createElement("div");
      item.className = "parent-badge";
      item.textContent = badge.emoji + " " + badge.name + (current.badges[badge.id] ? " · earned" : " · " + badge.hint);
      list.appendChild(item);
    });
    $("parent-dialog").showModal();
  }

  /* ---------- start ---------- */

  function wireButtons() {
    $("surprise-btn").addEventListener("click", () => {
      const list = KlgCatalogue.GAMES;
      if (window.KlgSounds) KlgSounds.click();
      window.location.href = "games/" + list[Math.floor(Math.random() * list.length)].id + "/index.html";
    });
    $("reset-progress").addEventListener("click", () => {
      if (!window.confirm("Start over? This clears your XP, stars, badges and streak on this device.")) return;
      KlgProgress.reset();
      window.location.reload();
    });
    $("parent-open").addEventListener("click", openParentDialog);
    $("parent-close").addEventListener("click", () => $("parent-dialog").close());
    $("see-all-grownup").addEventListener("click", () => $("parent-dialog").close());
    $("home-title-say").replaceWith(Object.assign(speaker("What shall we play?"), { id: "home-title-say" }));
    const nextSay = speaker(() => "Play next: " + spokenName(KlgCatalogue.byId($("play-next").getAttribute("href").split("/")[1])), "Play next");
    $("play-next-wrap").appendChild(nextSay);
    window.addEventListener("hashchange", route);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.KlgProgress || !window.KlgCatalogue) return;
    summary = KlgProgress.summary();
    try {
      const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
      if (Array.isArray(parsed)) favorites = parsed.filter((id) => typeof id === "string");
    } catch (e) { /* no saved favorites */ }
    renderCards();
    decorateCards();
    renderWorldTiles();
    wireFilters();
    wireButtons();
    paintTopBar();
    route();
  });
})();
