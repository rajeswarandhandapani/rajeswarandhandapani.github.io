/**
 * KlgRound — the round loop shared by the hand-built picture games.
 *
 *   KlgRound.run({
 *     total: 8,                       questions per round
 *     make(index, asked) { … },       returns a question object (anything)
 *     render(q, ctx) { … },           draws the question into ctx.stage
 *     speak: true,                    read each task aloud when the browser can
 *   })
 *
 * ctx (passed to render):
 *   ctx.stage            element to draw into
 *   ctx.task(text, spoken)  sets the instruction; speaks `spoken` (default `text`)
 *   ctx.right(msg)       correct: cheer; scores a point if no earlier mistake
 *   ctx.wrong(msg)       gentle "try again": keeps the question open
 *   ctx.hint(msg)        a nudge that does not count as a mistake
 *   ctx.reveal(msg)      show the answer after help: no point, moves on
 *   ctx.firstTry()       true until ctx.wrong() has been called
 *   ctx.index, ctx.total, ctx.say(text)
 *
 * The object make() returns must be plain JSON data, and render() must draw
 * everything from it: a missed question is saved and handed back to render()
 * on a later day (Review My Mistakes) without calling make(). Compare data by
 * value, not by object, and pick what is being asked in make(); randomness in
 * render() is only for layout, such as shuffling tiles.
 *
 * Expected page ids (see scripts/new-game.cjs): start-btn, start-screen,
 * play-screen, exit-btn, score-pill, progress-text, task, listen-btn, stage,
 * feedback, next-btn, finish-screen, finish-summary, play-again.
 * Finishing records progress through KlgGameKit.finish → KlgProgress.
 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const canSpeak = !!window.speechSynthesis;

  function say(text) {
    if (!canSpeak || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/[\u{1F300}-\u{1FAFF}]/gu, "").trim());
    u.lang = "en-US";
    u.rate = 0.88;
    speechSynthesis.speak(u);
  }

  const REVIEW_LIMIT = 10;

  /** A short, stable name for a question, from its contents. */
  function hashText(text) {
    let hash = 5381;
    for (let i = 0; i < text.length; i += 1) hash = (hash * 33 + text.charCodeAt(i)) >>> 0;
    return hash.toString(36);
  }

  function run(opts) {
    let total = opts.total || 8;
    let index = 0, score = 0, asked = new Set(), current = null, mistakes = 0, closed = false, lastTask = "", shownTask = "";
    let streak = 0, bestStreak = 0, missId = null;
    const nextBtn = $("next-btn");
    // On a ?review=1 page with questions due, the round replays those instead of new ones.
    const store = window.KlgProgress && KlgProgress.review;
    let reviewing = store && store.isActive() ? { items: store.dueHere(REVIEW_LIMIT), right: 0, cleared: 0 } : null;
    if (reviewing && !reviewing.items.length) reviewing = null;
    if (reviewing) {
      total = reviewing.items.length;
      store.showIntro(total);
    }

    /** First slip on a question: keep a copy so it can come back on a later day. */
    function saveMiss() {
      if (reviewing || !store || missId) return;
      try {
        const snapshot = JSON.parse(JSON.stringify(current));
        missId = store.miss({ key: hashText(JSON.stringify(snapshot)), snapshot: { q: snapshot }, prompt: shownTask });
      } catch (e) {
        /* a question that cannot be copied simply is not reviewed */
      }
    }

    /** The question is closed: move a review question along its schedule. */
    function settle(correct, message) {
      if (reviewing) {
        const outcome = store.answered(reviewing.items[index].id, correct);
        if (correct) reviewing.right += 1;
        if (outcome === "cleared") reviewing.cleared += 1;
      } else if (missId) {
        store.note(missId, message);
      }
    }

    const ctx = {
      stage: $("stage"),
      total,
      index: 0,
      reviewing: !!reviewing,
      say,
      firstTry: () => mistakes === 0,
      /** Shows `text`; reads `spoken` (default: the same text) aloud and on "Listen again". */
      task(text, spoken) {
        $("task").textContent = text;
        shownTask = text;
        lastTask = spoken === undefined ? text : spoken;
        $("listen-btn").hidden = !canSpeak || !lastTask;
        if (opts.speak !== false) say(lastTask);
      },
      right(msg) {
        if (closed) return;
        closed = true;
        if (mistakes === 0) {
          score += 1;
          streak += 1;
          bestStreak = Math.max(bestStreak, streak);
        } else {
          streak = 0;
        }
        settle(mistakes === 0, msg);
        $("score-pill").textContent = "⭐ " + score;
        setFeedback((mistakes === 0 ? "Yes! " : "You got it! ") + (msg || ""), "good");
        if (window.KlgGameKit) KlgGameKit.cheer(nextBtn);
        showNext();
      },
      /** A nudge that is not a mistake (for example, pressing Check before finishing). */
      hint(msg) {
        if (!closed) setFeedback(msg, "try");
      },
      wrong(msg) {
        if (closed) return;
        mistakes += 1;
        saveMiss();
        if (window.KlgGameKit) KlgGameKit.oops();
        setFeedback(msg || "Not quite. Look again and have another go.", "try");
      },
      reveal(msg) {
        if (closed) return;
        closed = true;
        mistakes += 1;
        streak = 0;
        saveMiss();
        settle(false, msg);
        setFeedback(msg || "", "try");
        showNext();
      },
    };

    function setFeedback(text, kind) {
      const f = $("feedback");
      f.textContent = text;
      f.className = "mg-feedback " + (kind || "");
      // A nudge is no use below the fold.
      if (text) f.scrollIntoView({ block: "nearest" });
    }

    function showNext() {
      nextBtn.textContent = index + 1 === total ? (reviewing ? "All done →" : "See my stars →") : "Next →";
      nextBtn.hidden = false;
      nextBtn.focus({ preventScroll: true });
      // On a short screen the feedback can land below the fold. Next sticks to the
      // bottom of the screen, and the feedback's scroll margin keeps it clear of Next.
      $("feedback").scrollIntoView({ block: "nearest" });
    }

    function show() {
      closed = false;
      mistakes = 0;
      missId = null;
      ctx.index = index;
      ctx.total = total;
      nextBtn.hidden = true;
      setFeedback("", "");
      $("progress-text").textContent = `${index + 1} / ${total}`;
      $("progress-text").setAttribute("aria-label", `Question ${index + 1} of ${total}`);
      $("score-pill").textContent = "⭐ " + score;
      ctx.stage.replaceChildren();
      current = reviewing ? reviewing.items[index].snapshot.q : opts.make(index, asked);
      opts.render(current, ctx);
      // The last answer may have scrolled the page down to Next.
      if (window.scrollY > 0) window.scrollTo(0, 0);
    }

    function start() {
      index = 0; score = 0; asked = new Set(); streak = 0; bestStreak = 0;
      if (reviewing) {
        // Leaving part-way and coming back carries on with whatever is still due.
        reviewing.items = store.dueHere(REVIEW_LIMIT);
        reviewing.right = 0;
        reviewing.cleared = 0;
        total = reviewing.items.length;
        if (!total) return finish();
      }
      $("start-screen").classList.add("d-none");
      $("finish-screen").classList.add("d-none");
      $("play-screen").classList.remove("d-none");
      show();
    }

    function finish() {
      $("start-screen").classList.add("d-none");
      $("play-screen").classList.add("d-none");
      $("finish-screen").classList.remove("d-none");
      if (reviewing) {
        KlgGameKit.finishReview({ right: reviewing.right, cleared: reviewing.cleared, total, el: $("finish-summary") });
        $("play-again").hidden = true;
        $("play-again").style.display = "none";
        // The review's own links say where to go next, so the usual "More games" link would repeat them.
        const finishScreen = $("finish-screen");
        const heading = finishScreen.querySelector("h1, h2");
        if (heading) heading.textContent = "Review complete!";
        finishScreen.querySelectorAll('a[href*="index.html"]').forEach((a) => {
          if (!a.closest("#finish-summary")) a.style.display = "none";
        });
      } else {
        KlgGameKit.finish({ score, total, bestStreak, el: $("finish-summary") });
      }
      $("finish-screen").focus();
    }

    nextBtn.addEventListener("click", () => {
      if (index + 1 >= total) return finish();
      index += 1;
      show();
    });
    $("start-btn").addEventListener("click", () => { if (window.KlgSounds) KlgSounds.click(); start(); });
    $("play-again").addEventListener("click", () => { if (window.KlgSounds) KlgSounds.click(); start(); });
    $("exit-btn").addEventListener("click", () => {
      if (canSpeak) speechSynthesis.cancel();
      $("play-screen").classList.add("d-none");
      $("start-screen").classList.remove("d-none");
    });
    $("listen-btn").addEventListener("click", () => say(lastTask));
    return { start };
  }

  window.KlgRound = { run, say, canSpeak };
})();
