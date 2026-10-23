/**
 * Story Order — put picture cards in the order things happen.
 *
 *   ?level=1  the first three pictures of a story
 *   ?level=2  (default 1) four or five pictures
 *
 * Tap a picture to place it in the next box; tap a placed picture to take it
 * back. Check marks right boxes green and wrong ones red. When the order is
 * right the story is retold as first, next, then, last.
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const level = Number(new URLSearchParams(location.search).get("level")) === 2 ? 2 : 1;
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "1");

  const STORIES = [
    { name: "A seed grows", steps: [["🌱", "Plant the seed"], ["💧", "Water it"], ["🌿", "It grows"], ["🌼", "It makes a bud"], ["🌻", "A flower!"]] },
    { name: "Getting ready", steps: [["⏰", "Wake up"], ["🪥", "Brush your teeth"], ["👕", "Get dressed"], ["🥣", "Eat breakfast"], ["🚌", "Go to school"]] },
    { name: "A butterfly", steps: [["🥚", "An egg"], ["🐛", "A caterpillar"], ["🍃", "It eats leaves"], ["🦋", "A butterfly"]] },
    { name: "A chick", steps: [["🥚", "An egg"], ["🐣", "A chick hatches"], ["🐥", "The chick grows"], ["🐔", "A hen"]] },
    { name: "A rainy day", steps: [["☁️", "Clouds gather"], ["🌧️", "It rains"], ["☔", "We use an umbrella"], ["🌈", "A rainbow shows"]] },
    { name: "Ice cream", steps: [["🍦", "A new ice cream"], ["☀️", "The sun shines"], ["💧", "It starts to melt"], ["🫠", "It is all melted"]] },
    { name: "A birthday", steps: [["🎈", "The party starts"], ["🎶", "We sing"], ["🎂", "Blow out the candles"], ["🎁", "Open the presents"]] },
    { name: "A day", steps: [["🌅", "Sunrise"], ["☀️", "Midday"], ["🌇", "Sunset"], ["🌙", "Night"]] },
    { name: "Baking cookies", steps: [["🥣", "Mix the dough"], ["🍪", "Shape the cookies"], ["🔥", "Bake them"], ["😋", "Eat them!"]] },
    { name: "Washing hands", steps: [["🚰", "Wet your hands"], ["🧼", "Add soap"], ["👐", "Scrub well"], ["🧻", "Rinse and dry"]] },
    { name: "A snowman", steps: [["❄️", "Snow falls"], ["⛄", "Roll big snowballs"], ["🥕", "Add a carrot nose"], ["🧣", "Add a scarf"]] },
    { name: "A trip to the park", steps: [["🎒", "Pack a bag"], ["🚶", "Walk to the park"], ["🛝", "Play on the slide"], ["🏠", "Go home"]] },
  ];
  const WORDS = ["First", "Next", "Then", "Then", "Last"];

  KlgRound.run({
    total: 6,
    make(i, asked) {
      let story, tries = 0;
      do { story = V.pick(STORIES); } while (asked.has(story.name) && ++tries < 30);
      asked.add(story.name);
      const steps = level === 1 ? story.steps.slice(0, 3) : story.steps.slice(0, V.rand(4, 5));
      return { name: story.name, steps };
    },
    render(q, ctx) {
      ctx.task(`“${q.name}”: put the pictures in order. What happens first?`, `${q.name}. Put the pictures in order. What happens first?`);
      const host = document.createElement("div");
      const cards = q.steps.map(([emoji, caption], idx) => ({
        id: String(idx),
        label: caption,
        node: () => {
          const box = document.createElement("span");
          box.className = "kv-storycard";
          box.innerHTML = `<span class="kv-emoji" aria-hidden="true" style="font-size:2.2rem">${emoji}</span><span class="kv-caption">${caption}</span>`;
          return box;
        },
      }));
      const order = q.steps.map((s, idx) => String(idx));
      const board = KlgPlayKit.orderCards({ host, cards, order });
      const clear = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn", textContent: "Start again" });
      clear.addEventListener("click", () => board.reset());
      const check = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn primary", textContent: "Check ✓" });
      check.setAttribute("aria-label", "Check the order");
      const retell = () => q.steps.map(([, c], idx) => `${idx === q.steps.length - 1 ? "Last" : WORDS[idx] || "Then"}: ${c}.`).join(" ");
      check.addEventListener("click", () => {
        if (!board.isFull()) return ctx.hint("Put every picture in a box first.");
        if (board.check()) { ctx.right(retell()); check.disabled = clear.disabled = true; }
        else if (!ctx.firstTry()) {
          board.reset();
          order.forEach((id) => host.querySelector(`.pk-card[data-id="${id}"]`).click());
          board.check();
          ctx.reveal(retell());
          check.disabled = clear.disabled = true;
        } else ctx.wrong("Some are in the wrong box (red). Think: what happens first?");
      });
      const bar = document.createElement("div");
      bar.className = "kv-controls";
      bar.append(clear, check);
      ctx.stage.append(host, bar);
    },
  });
})();
