/**
 * Landing page behaviour: the player card (rank, XP, streak, badges), the
 * daily challenge, per-card stars and the "surprise me" button.
 *
 * The game list is read out of the page itself — every card carries
 * data-game and sits inside a #level-N section — so adding a game to
 * index.html is all it takes to include it here too.
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
        if (summary.plays > 0) {
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
    renderPlayer(summary);
    decorateCards(summary);
    renderDaily(summary);
    wireButtons();
  });
})();

// Library discovery stays independent of progress storage.
document.addEventListener('DOMContentLoaded', () => {
  const tiles = [...document.querySelectorAll('.game-card[data-game]')];
  const groups = {
    language: ['english-alphabets','tamil-alphabets','rhyming-words','opposites','tamil-words','spelling-bee','tamil-word-builder','reading-stories','tamil-sentence-words','tamil-missing-letters'],
    world: ['baby-animals','calendar','solar-system','science-quiz','world-capitals','animal-habitats'],
    logic: ['patterns','memory-match']
  };
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
    card.dataset.subject = Object.keys(groups).find(key => groups[key].includes(id)) || 'math';
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
