/**
 * கதை நேரம் — four-picture Tamil stories with a question.
 *
 * Each story has four panels (a picture and one short Tamil sentence) and a
 * question answered by choosing a picture. Words that have a human recording
 * are underlined and play when tapped; the other words use the device's Tamil
 * voice when there is one. "Read to me" reads the four sentences in turn.
 *
 *   ?level=1  English help under each sentence
 *   ?level=2  (default) Tamil only; a button shows the English if needed
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const A = window.KlgTamilAudio;
  const level = Number(new URLSearchParams(location.search).get("level")) === 1 ? 1 : 2;
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");

  const { STORIES } = window.KlgQuestions;

  const clean = (t) => t.replace(/[.,“”!?]/g, "");
  const say = (t) => { if (A) A.say(clean(t)); };

  KlgRound.run({
    total: 4,
    make(i, asked) {
      let story, tries = 0;
      do { story = V.pick(STORIES); } while (asked.has(story.title) && ++tries < 30);
      asked.add(story.title);
      return story;
    },
    render(q, ctx) {
      ctx.task(`“${q.title}” — read the story, then answer the question.`, "");
      const grid = document.createElement("div");
      grid.className = "kv-panels";
      grid.dataset.title = q.title;
      grid.dataset.answer = q.answer[2];
      grid.dataset.answerEmoji = q.answer[0];
      q.panels.forEach(([emoji, tamil, english], idx) => {
        const panel = document.createElement("figure");
        panel.className = "kv-panel";
        const pic = document.createElement("div");
        pic.className = "kv-panel-pic";
        pic.setAttribute("aria-hidden", "true");
        pic.textContent = emoji;
        const cap = document.createElement("figcaption");
        cap.className = "tamil-glyph kv-panel-cap";
        tamil.split(/\s+/).forEach((tok, k) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "kv-tword" + (A && A.has(clean(tok)) ? " rec" : "");
          b.textContent = tok;
          b.addEventListener("click", () => say(tok));
          cap.append(b, document.createTextNode(" "));
        });
        const en = document.createElement("div");
        en.className = "kv-english";
        en.textContent = english;
        en.hidden = level === 2;
        panel.append(pic, cap, en);
        grid.appendChild(panel);
      });
      const bar = document.createElement("div");
      bar.className = "kv-controls";
      const read = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn", textContent: "🔊 Read to me" });
      read.addEventListener("click", () => { if (A) A.sequence(q.panels.flatMap((p) => clean(p[1]).split(/\s+/)), 250); });
      bar.appendChild(read);
      if (level === 2) {
        const show = Object.assign(document.createElement("button"), { type: "button", className: "kv-btn", textContent: "Show English" });
        show.addEventListener("click", () => { grid.querySelectorAll(".kv-english").forEach((e) => (e.hidden = false)); show.disabled = true; });
        bar.appendChild(show);
      }
      const question = document.createElement("p");
      question.className = "kv-question tamil-glyph";
      question.textContent = q.q[0];
      const sub = document.createElement("small");
      sub.className = "kv-english";
      sub.textContent = " (" + q.q[1] + ")";
      sub.hidden = level === 2;
      question.appendChild(sub);
      const answers = document.createElement("div");
      answers.className = "kv-controls";
      V.shuffle([q.answer, ...q.others]).forEach(([emoji, tamil, english]) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "kv-btn kv-picbtn";
        b.dataset.english = english;
        b.setAttribute("aria-label", english);
        b.innerHTML = `<span style="font-size:2.4rem" aria-hidden="true">${emoji}</span><span class="tamil-glyph" style="display:block;font-size:0.95rem">${tamil}</span>`;
        b.addEventListener("click", () => {
          if (english === q.answer[2]) { say(tamil); ctx.right(`${q.answer[1]} — ${q.answer[2]}.`); answers.querySelectorAll("button").forEach((x) => (x.disabled = true)); }
          else { b.disabled = true; ctx.wrong("Read the story again. Which picture answers the question?"); }
        });
        answers.appendChild(b);
      });
      ctx.stage.append(grid, bar, question, answers);
    },
  });
})();
