/**
 * Share It Fairly — division by actually sharing.
 *
 * The child deals treats from a pile onto friends' plates (tap a plate to
 * give it one, or "Give everyone one"), then says when the sharing is
 * fair. Fair means every plate has the same and there are too few left to
 * give everyone another. Then they answer: how many each, and how many
 * are left over — and see the division sentence they just acted out.
 *
 *   ?level=1  no leftovers, up to 4 friends, up to 20 treats
 *   ?level=2  (default) sometimes leftovers, up to 5 friends
 *   ?level=3  usually leftovers, up to 6 friends, up to 50 treats
 *
 * Six stories per round. A story scores when both answers are right first
 * time; the sharing itself can be corrected as often as needed.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const $ = (id) => document.getElementById(id);
  const level = [1, 3].includes(Number(new URLSearchParams(location.search).get("level")))
    ? Number(new URLSearchParams(location.search).get("level")) : 2;
  const ROUND = 6;
  const TREATS = ["🍪", "🍬", "🍓", "🥟", "🍩", "🧁", "🍎", "🎈"];
  const FRIENDS = ["🐻", "🐰", "🐼", "🦊", "🐯", "🐨"];

  let stories = [], index = 0, score = 0, story, plates, pile, history, phase, firstTry;

  function makeStory() {
    const people = V.rand(2, level === 1 ? 4 : level === 2 ? 5 : 6);
    const each = V.rand(2, level === 3 ? 7 : 5);
    const leftoverChance = level === 1 ? 0 : level === 2 ? 0.4 : 0.7;
    const left = Math.random() < leftoverChance ? V.rand(1, people - 1) : 0;
    return { people, each, left, total: people * each + left, emoji: V.pick(TREATS) };
  }

  function start() {
    stories = Array.from({ length: ROUND }, makeStory);
    index = 0;
    score = 0;
    $("start-screen").classList.add("d-none");
    $("finish-screen").classList.add("d-none");
    $("share-screen").classList.remove("d-none");
    show();
  }

  function show() {
    story = stories[index];
    plates = Array(story.people).fill(0);
    pile = story.total;
    history = [];
    phase = "deal";
    firstTry = true;
    $("share-count").textContent = `Story ${index + 1} / ${stories.length}`;
    $("share-score").textContent = `⭐ ${score}`;
    $("share-task").textContent = `Share ${story.total} ${story.emoji} fairly between ${story.people} friends.`;
    $("share-feedback").textContent = "Tap a plate to give it one treat.";
    $("share-question").replaceChildren();
    $("share-next").hidden = true;
    ["share-deal", "share-undo", "share-done"].forEach((id) => ($(id).hidden = false));
    draw();
  }

  function draw() {
    const pileBox = $("share-pile");
    pileBox.replaceChildren();
    for (let i = 0; i < pile; i++) {
      const s = document.createElement("span");
      s.className = "mv-item";
      s.textContent = story.emoji;
      pileBox.appendChild(s);
    }
    if (!pile) pileBox.textContent = "The pile is empty!";
    pileBox.setAttribute("aria-label", `${pile} ${story.emoji} left in the pile`);

    const box = $("share-plates");
    box.replaceChildren();
    plates.forEach((n, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sf-plate";
      b.disabled = phase !== "deal" || !pile;
      b.setAttribute("aria-label", `${FRIENDS[i]} friend ${i + 1}: ${n} ${story.emoji}. Tap to give one more.`);
      const who = document.createElement("span");
      who.className = "sf-who";
      who.textContent = FRIENDS[i];
      const count = document.createElement("span");
      count.className = "sf-count";
      count.textContent = n;
      b.append(who, ...Array.from({ length: n }, () => Object.assign(document.createElement("span"), { textContent: story.emoji })), count);
      b.addEventListener("click", () => give(i));
      box.appendChild(b);
    });
    $("share-deal").disabled = phase !== "deal" || pile < story.people;
    $("share-undo").disabled = phase !== "deal" || !history.length;
  }

  function give(i) {
    if (!pile || phase !== "deal") return;
    plates[i] += 1;
    pile -= 1;
    history.push([i]);
    if (window.KlgSounds) KlgSounds.click();
    draw();
  }

  function dealRound() {
    if (pile < story.people) return;
    plates = plates.map((n) => n + 1);
    pile -= story.people;
    history.push(plates.map((_, i) => i));
    draw();
  }

  function undo() {
    const last = history.pop();
    if (!last) return;
    last.forEach((i) => { plates[i] -= 1; pile += 1; });
    draw();
  }

  function done() {
    const most = Math.max(...plates);
    const least = Math.min(...plates);
    if (most !== least) {
      KlgGameKit.oops();
      $("share-feedback").textContent = `Not fair yet — one friend has ${most} and another has ${least}. Even them out (↺ Undo helps).`;
      document.querySelectorAll(".sf-plate").forEach((p, i) => p.classList.toggle("uneven", plates[i] !== least));
      return;
    }
    if (pile >= story.people) {
      KlgGameKit.oops();
      $("share-feedback").textContent = `There are still ${pile} in the pile — enough to give everyone one more!`;
      return;
    }
    phase = "ask-each";
    ["share-deal", "share-undo", "share-done"].forEach((id) => ($(id).hidden = true));
    draw();
    KlgGameKit.cheer($("share-plates"));
    $("share-feedback").textContent = pile ? `Fair! ${pile} can't be shared without someone getting more.` : "Fair! Everyone has the same.";
    ask(`How many ${story.emoji} does each friend get?`, story.each, [story.people, story.each + 1, story.each - 1, story.total - story.people], () => {
      if (story.left || level > 1) {
        ask(`How many are left over?`, story.left, [0, 1, 2, 3, story.people].filter((v) => v !== story.left), finishStory, true);
      } else {
        finishStory();
      }
    });
  }

  function ask(text, answer, mistakes, then, includeZero) {
    const q = $("share-question");
    q.replaceChildren();
    const p = document.createElement("p");
    p.className = "mg-task mb-1";
    p.textContent = text;
    const row = document.createElement("div");
    row.className = "sf-answer";
    const options = includeZero
      ? V.shuffle([answer, ...[...new Set(mistakes)].filter((v) => v >= 0 && v !== answer).slice(0, 3)]).sort((x, y) => x - y)
      : V.numberChoices(answer, mistakes).sort((x, y) => x - y);
    options.forEach((v) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = v;
      b.addEventListener("click", () => {
        if (v === answer) {
          b.classList.add("correct");
          row.querySelectorAll("button").forEach((x) => (x.disabled = true));
          KlgGameKit.cheer(b);
          setTimeout(then, 500);
        } else {
          firstTry = false;
          b.classList.add("incorrect");
          b.disabled = true;
          KlgGameKit.oops();
          $("share-feedback").textContent = "Look at the plates again and count one plate.";
        }
      });
      row.appendChild(b);
    });
    q.append(p, row);
    row.querySelector("button").focus();
  }

  function finishStory() {
    if (firstTry) score += 1;
    $("share-score").textContent = `⭐ ${score}`;
    const s = story;
    $("share-question").replaceChildren(Object.assign(document.createElement("p"), {
      className: "mg-task",
      textContent: s.left ? `${s.total} ÷ ${s.people} = ${s.each} remainder ${s.left}` : `${s.total} ÷ ${s.people} = ${s.each}`,
    }));
    $("share-feedback").textContent = s.left
      ? `Each friend gets ${s.each}, and ${s.left} ${s.left === 1 ? "is" : "are"} left over.`
      : `Each friend gets ${s.each}. Nothing is left over!`;
    $("share-next").hidden = false;
    $("share-next").focus();
  }

  function next() {
    index += 1;
    if (index < stories.length) return show();
    $("share-screen").classList.add("d-none");
    $("finish-screen").classList.remove("d-none");
    KlgGameKit.finish({ score, total: stories.length, el: $("finish-summary") });
    $("play-again").focus();
  }

  document.addEventListener("DOMContentLoaded", () => {
    KlgGameKit.modeLinks($("level-links"), "level", "2");
    $("start-btn").addEventListener("click", start);
    $("play-again").addEventListener("click", start);
    $("share-deal").addEventListener("click", dealRound);
    $("share-undo").addEventListener("click", undo);
    $("share-done").addEventListener("click", done);
    $("share-next").addEventListener("click", next);
    $("share-exit").addEventListener("click", () => {
      $("share-screen").classList.add("d-none");
      $("start-screen").classList.remove("d-none");
      $("start-btn").focus();
    });
  });
})();
