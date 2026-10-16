/**
 * Shared pieces for hand-built activities (the ones that do not use
 * QuizEngine): end-of-round rewards, celebrations and mode links.
 *
 *   KlgGameKit.finish({ score, total, el, message?, praise? })
 *       banks progress with KlgProgress and fills el with score, stars, XP.
 *       praise = [great, good, tryAgain] overrides the default messages.
 *   KlgGameKit.cheer(target?)               sound + small confetti burst
 *   KlgGameKit.oops()                       gentle wrong sound
 *   KlgGameKit.modeLinks(container, param, fallback)  highlights ?param= links
 *   KlgGameKit.starsFor(score, total)       0–3, same bands as QuizEngine
 */
(function () {
  "use strict";
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  function cheer(target) {
    if (window.KlgSounds) KlgSounds.correct();
    if (typeof confetti !== "function" || reduced()) return;
    const rect = target && target.getBoundingClientRect ? target.getBoundingClientRect() : null;
    confetti({
      particleCount: 18, spread: 60, scalar: 0.7, ticks: 60,
      origin: rect
        ? { x: (rect.left + rect.width / 2) / innerWidth, y: (rect.top + rect.height / 2) / innerHeight }
        : { x: 0.5, y: 0.6 },
    });
  }

  function oops() {
    if (window.KlgSounds) KlgSounds.wrong();
  }

  function starsFor(score, total) {
    const pct = total ? score / total : 0;
    return pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : pct >= 0.5 ? 1 : 0;
  }

  const PRAISE = ["Wonderful! Top marks!", "Well done — keep going!", "Every try helps your brain grow. Play again!"];

  function finish({ score, total, el, message, praise = PRAISE }) {
    const stars = starsFor(score, total);
    const reward = window.KlgProgress
      ? KlgProgress.record({ score, total, elapsedMs: 0, bestStreak: 0 })
      : null;
    if (stars >= 2) {
      if (window.KlgSounds) KlgSounds.fanfare();
      if (typeof confetti === "function" && !reduced()) confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    }
    if (el) {
      el.replaceChildren();
      const big = document.createElement("div");
      big.className = "tg-finish-score";
      big.textContent = `${score} / ${total}`;
      const starLine = document.createElement("div");
      starLine.className = "tg-finish-stars";
      starLine.textContent = stars ? "⭐".repeat(stars) : "🌱";
      const note = document.createElement("p");
      note.className = "tg-finish-note";
      note.textContent = message || (stars === 3 ? praise[0] : stars >= 1 ? praise[1] : praise[2]);
      el.append(big, starLine, note);
      if (reward) {
        const xp = document.createElement("p");
        xp.className = "tg-finish-xp";
        xp.textContent = `+${reward.xp} XP · ${reward.rank.emoji} ${reward.rank.name}` +
          (reward.newBadges.length ? ` · New badge: ${reward.newBadges.map((b) => b.emoji + " " + b.name).join(", ")}` : "");
        el.appendChild(xp);
      }
    }
    return reward;
  }

  /**
   * Mode links: each link sets one ?param= value. Links keep the page's
   * other settings (switching level keeps the chosen mode), and the link
   * matching the current URL is shown as selected.
   */
  function modeLinks(container, param, fallback) {
    if (!container) return;
    const here = new URLSearchParams(location.search);
    const current = here.get(param) || fallback;
    container.querySelectorAll("a").forEach((a) => {
      const value = new URLSearchParams(a.getAttribute("href").replace(/^[^?]*\??/, "")).get(param) || fallback;
      const next = new URLSearchParams(here);
      if (value === fallback) next.delete(param);
      else next.set(param, value);
      a.setAttribute("href", next.toString() ? "?" + next.toString() : "index.html");
      const selected = value === current;
      a.classList.toggle("btn-secondary", selected);
      a.classList.toggle("btn-outline-secondary", !selected);
      if (selected) a.setAttribute("aria-current", "true");
    });
  }

  window.KlgGameKit = { finish, cheer, oops, modeLinks, starsFor };
})();
