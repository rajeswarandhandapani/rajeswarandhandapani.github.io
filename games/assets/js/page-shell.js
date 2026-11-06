/**
 * KlgShell — the same simple frame around every game, so a child who has learned
 * one game knows them all. Loaded last on each game page, after the game has
 * built its controls, and needs no per-game code.
 *
 *   Top bar       🏠 Home (back to this subject), the game's name, 🔊 sound
 *   Start screen  picture, name, the game's levels by age, one big ▶ Play and
 *                 🔊 Hear how to play. Everything else folds away under ⚙️ More ways to play.
 *   Play screen   back, progress and score on one short row, with the speaker
 *                 beside the question.
 *
 * Elements are moved, never rebuilt, so each game's own code keeps finding them.
 */
(function () {
  "use strict";
  const LEVELS_KEY = "klg-game-levels";
  const canSpeak = !!window.speechSynthesis && typeof window.SpeechSynthesisUtterance !== "undefined";

  function say(text) {
    if (!canSpeak || !text) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text).replace(/[\u{1F300}-\u{1FAFF}]/gu, "").trim());
    utterance.lang = "en-US";
    utterance.rate = 0.88;
    speechSynthesis.speak(utterance);
  }

  const gameId = window.KlgProgress ? KlgProgress.currentGameId() : null;
  const game = gameId && window.KlgCatalogue ? KlgCatalogue.byId(gameId) : null;

  /* ---------- levels ---------- */

  /** What was last chosen: { band, games: { id: query } }. */
  function readLevels() {
    try {
      const saved = JSON.parse(localStorage.getItem(LEVELS_KEY));
      return saved && typeof saved === "object" && saved.games && typeof saved.games === "object" ? saved : { band: 0, games: {} };
    } catch (e) {
      return { band: 0, games: {} };
    }
  }

  function saveLevel(level) {
    const saved = readLevels();
    saved.band = level.band;
    saved.games[game.id] = level.query;
    try {
      localStorage.setItem(LEVELS_KEY, JSON.stringify(saved));
    } catch (e) { /* lasts for this visit only */ }
  }

  /**
   * Opening a game with no settings goes to the level last used in it. In a game not
   * played yet, it goes to the closest thing to the age last chosen in any game, so
   * a child only has to choose once, and nobody is asked how old they are.
   */
  function openChosenLevel() {
    if (location.search || !game || !game.levels.length) return false;
    const saved = readLevels();
    let query = saved.games[game.id];
    if (typeof query !== "string" && saved.band) {
      const closest = game.levels.slice().sort((a, b) => Math.abs(a.band - saved.band) - Math.abs(b.band - saved.band))[0];
      query = closest.query;
    }
    if (!query) return false;
    location.replace(location.pathname + "?" + query);
    return true;
  }

  const paramsOf = (query) => [...new URLSearchParams(query).entries()];

  /** The level the address asks for. With nothing set, the game's own default. */
  function currentLevel(keys) {
    const here = new URLSearchParams(location.search);
    const found = game.levels.filter((level) => {
      const wanted = paramsOf(level.query);
      return wanted.every(([key, value]) => here.get(key) === value) &&
        keys.every((key) => wanted.some(([k]) => k === key) || !here.has(key));
    })[0];
    if (found) return found;
    return game.levels.filter((level) => level.band === game.level)[0] || null;
  }

  /** The row of age buttons. Settings that are not about the level, like a topic, are kept. */
  function buildLevelRow() {
    if (!game || game.levels.length < 2) return null;
    const keys = [...new Set(game.levels.flatMap((level) => paramsOf(level.query).map(([key]) => key)))];
    const current = currentLevel(keys);
    const row = make("nav", "kid-levels");
    row.setAttribute("aria-label", "Choose a level");
    row.append(make("span", "kid-levels-label", "Age"));
    game.levels.forEach((level) => {
      const info = KlgCatalogue.LEVELS[level.band];
      const next = new URLSearchParams(location.search);
      next.delete("review");
      keys.forEach((key) => next.delete(key));
      paramsOf(level.query).forEach(([key, value]) => next.set(key, value));
      const link = make("a", "kid-level");
      link.href = next.toString() ? "?" + next.toString() : location.pathname;
      link.dataset.band = level.band;
      link.setAttribute("aria-label", info.ages);
      link.append(make("span", "kid-level-pic", info.emoji), make("b", "", info.short));
      if (level === current) link.setAttribute("aria-current", "true");
      link.addEventListener("click", () => saveLevel(level));
      row.append(link);
    });
    return row;
  }

  /** True when the address has settings the level row does not show, so the fold should open. */
  function hasOtherSettings() {
    const settings = new URLSearchParams(location.search);
    settings.delete("review");
    if (game) game.levels.forEach((level) => paramsOf(level.query).forEach(([key]) => settings.delete(key)));
    return [...settings.keys()].length > 0;
  }

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* ---------- top bar ---------- */
  function buildTopBar() {
    const bar = document.querySelector(".klg-navbar .container");
    if (!bar) return;
    const home = bar.querySelector(".navbar-brand");
    if (home) {
      home.textContent = "🏠 Home";
      home.setAttribute("aria-label", "Home: choose another game");
      if (game) home.setAttribute("href", "../../index.html#world/" + game.subject);
    }
    const name = bar.querySelector(".navbar-text");
    if (name) name.classList.add("kid-game-name");
    const sound = document.getElementById("klg-mute-btn");
    if (sound) bar.appendChild(sound);
  }

  /* ---------- start screen ---------- */
  function startRoot() {
    const screen = document.getElementById("start-screen");
    if (!screen) return null;
    return screen.querySelector(":scope > .card-body") || screen;
  }

  function isHeading(node) {
    return node.matches(".game-card-icon, .typing-emblem, h1, h2, .tg-subtitle");
  }

  /** The two ways to play, as big buttons. The existing #play-mode still holds the choice. */
  function buildPlayModeButtons() {
    const select = document.getElementById("play-mode");
    if (!select) return;
    const holder = select.closest(".quiz-settings");
    const row = make("div", "kid-mode-row");
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", "How would you like to play?");
    const buttons = [["practice", "🐢 Take your time"], ["challenge", "⏱️ Beat the clock"]].map(([value, label]) => {
      const button = make("button", "kid-mode-btn", label);
      button.type = "button";
      button.dataset.playMode = value;
      button.addEventListener("click", () => {
        select.value = value;
        select.dispatchEvent(new Event("change"));
        paint();
      });
      row.appendChild(button);
      return button;
    });
    function paint() {
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.playMode === select.value)));
    }
    paint();
    holder.classList.add("kid-select-hidden");
    holder.before(row);
  }

  function buildStartScreen() {
    const root = startRoot();
    const start = document.getElementById("start-btn");
    if (!root || !start) return;
    const reviewing = document.getElementById("klg-review-intro");
    start.textContent = reviewing ? "▶ Start review" : "▶ Play";
    start.classList.add("kid-play");

    buildPlayModeButtons();

    // How-to-play text is read now, because it is about to fold away.
    const how = root.querySelector(".text-muted small") || root.querySelector("#quiz-info");
    const howText = [game ? game.name : "", how ? how.textContent.replace(/\s+/g, " ").trim() : (game ? game.blurb : "")].filter(Boolean).join(". ");

    const hear = root.querySelector(".quiz-intro-listen") || (canSpeak ? make("button", "quiz-listen quiz-intro-listen", "🔊 Hear how to play") : null);
    if (hear && !hear.parentNode) {
      hear.type = "button";
      hear.addEventListener("click", () => say(howText));
    }

    // Top to bottom: the picture and name, then Play, then the sound button, then the rest.
    const label = root.querySelector("#mode-label");
    const beside = [...root.querySelectorAll(":scope > .kid-after-play")]; // main choices, not settings
    const more = make("details", "kid-more");
    const summary = make("summary", "", "⚙️ More ways to play");
    more.appendChild(summary);
    [...root.children].forEach((node) => {
      if (isHeading(node) || node === start || node === hear || node === reviewing || node === label || beside.includes(node)) return;
      more.appendChild(node);
    });
    if (label && !label.textContent.trim()) more.appendChild(label);
    const levels = reviewing ? null : buildLevelRow();
    if (levels) root.append(levels);
    root.append(start, ...beside);
    if (reviewing) root.insertBefore(reviewing, start);
    if (hear) root.append(hear);
    // Anything visible left in the fold? A review hides its settings, so nothing would be.
    const useful = [...more.children].some((node) => node !== summary && node.style.display !== "none" && !node.hidden);
    if (useful) root.append(more);
    // Coming back from a level or mode link: show which one is on.
    if (useful && hasOtherSettings()) more.open = true;
  }

  /* ---------- end of a round ---------- */

  /**
   * Puts the three ways forward straight after the score: ▶ Next game, Play again
   * and Home. A long list of missed questions then comes below them, not above.
   */
  function addNextGame(screen) {
    if (!screen || !game || !window.KlgCatalogue || !window.KlgProgress) return;
    const again = screen.querySelector("#play-again-btn, #play-again");
    const row = again ? again.parentNode : null;
    if (!row) return;
    const next = KlgCatalogue.nextAfter(game.id, KlgProgress.summary().games);
    let link = screen.querySelector(".kid-next-game");
    if (!next) {
      if (link) link.remove();
    } else {
      if (!link) {
        link = make("a", "kid-next-game");
        row.prepend(link);
      }
      link.href = "../" + next.id + "/index.html";
      link.textContent = "▶ Next game: " + next.name;
      link.dataset.next = next.id;
    }
    const review = screen.querySelector("#results-review");
    if (review) review.before(row);
  }

  function buildFinishLinks() {
    document.querySelectorAll("#results-screen a, #finish-screen a").forEach((link) => {
      if (link.getAttribute("href") !== "../../index.html") return;
      link.textContent = "🏠 Home";
      link.classList.add("kid-finish-home");
      if (game) link.setAttribute("href", "../../index.html#world/" + game.subject);
    });
  }

  /* ---------- play screen ---------- */
  function shortenProgress(node) {
    const first = node.firstChild;
    if (first && first.nodeType === Node.TEXT_NODE && /Question/.test(first.textContent)) {
      const word = make("span", "visually-hidden", first.textContent);
      node.replaceChild(word, first);
    }
  }

  /** Removes a row, or the parts of it, left empty after its contents moved. */
  function prune(node) {
    [...node.children].forEach(prune);
    if (!node.children.length && !node.textContent.trim()) node.remove();
  }

  function buildPlayHeader() {
    document.querySelectorAll(".quiz-tools").forEach((tools) => {
      const back = tools.querySelector("button");
      if (back && /Change activity/.test(back.textContent)) back.textContent = "⬅ Back";
      const message = tools.querySelector("span.small");
      if (message) message.classList.add("visually-hidden");
      const screen = tools.parentNode;
      const progress = screen.querySelector(".quiz-progress-text");
      const oldRow = progress ? progress.closest(".d-flex.justify-content-between, .mg-toolbar") : null;
      if (progress) {
        shortenProgress(progress);
        tools.insertBefore(progress, back ? back.nextSibling : tools.firstChild);
      }
      const mascot = screen.querySelector("#quiz-mascot");
      const score = screen.querySelector("#score-pill");
      if (mascot) tools.append(mascot);
      if (score) tools.append(score);
      if (oldRow) prune(oldRow);
    });
    const timerText = document.getElementById("timer-text");
    if (timerText && timerText.parentNode) timerText.parentNode.classList.add("kid-timer-text");
  }

  /** Puts the speaker beside the question, so it no longer takes a row of its own. */
  function buildPrompt() {
    [["#question-text", ".quiz-listen:not(.quiz-intro-listen)"], ["#task", "#listen-btn"]].forEach(([questionSelector, listenSelector]) => {
      const question = document.querySelector(questionSelector);
      const listen = document.querySelector(listenSelector);
      if (!question || !listen || question.nextElementSibling !== listen) return;
      const row = make("div", "kid-prompt");
      question.before(row);
      row.append(question, listen);
      listen.textContent = "🔊";
      if (!listen.getAttribute("aria-label")) listen.setAttribute("aria-label", "Listen again");
    });
  }

  function init() {
    document.body.classList.add("kid-game");
    if (game) document.body.dataset.subject = game.subject;
    buildTopBar();
    buildStartScreen();
    buildPlayHeader();
    buildPrompt();
    buildFinishLinks();
  }

  window.KlgShell = { say, canSpeak, game, addNextGame };

  if (openChosenLevel()) return;

  // Game scripts come first in the page, so their own start-up has already run.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
