/**
 * Tamil Letter Chart — explore all 247 letters and hear each one.
 *
 * Three tabs: உயிர் (12 vowels), மெய் (18 consonants + ஃ) and உயிர்மெய்
 * (the 18 × 12 grid). Tapping a letter says it and opens a detail card with
 * its sound, how it is built (க் + இ = கி) and a picture word that uses it.
 * Grid headers play a whole row or column. ?tab=mei|uyirmei opens a tab.
 *
 * This is an explorer, not a quiz, so it does not award stars.
 */
(function () {
  "use strict";
  const T = window.KlgTamil;
  const A = window.KlgTamilAudio;
  const $ = (id) => document.getElementById(id);

  const words = TAMIL_WORDS.map((w) => ({ ...w, parts: T.letters(w.tamil) }));
  function exampleFor(letter) {
    return words.find((w) => w.parts[0] === letter) || words.find((w) => w.parts.includes(letter)) || null;
  }

  function letterButton(letter, extraClass) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tg-letter" + (extraClass ? " " + extraClass : "");
    btn.textContent = letter;
    const info = T.info(letter);
    btn.setAttribute("aria-label", `${letter}, sounds like ${info ? info.sound : letter}`);
    btn.addEventListener("click", () => select(letter, btn));
    return btn;
  }

  let selectedBtn = null;
  function select(letter, btn) {
    if (selectedBtn) selectedBtn.classList.remove("selected");
    selectedBtn = btn;
    if (btn) btn.classList.add("selected");
    A.say(letter);
    showDetail(letter);
  }

  function showDetail(letter) {
    const info = T.info(letter);
    const detail = $("chart-detail");
    detail.replaceChildren();

    const big = document.createElement("button");
    big.type = "button";
    big.className = "tg-detail-letter tamil-glyph";
    big.textContent = letter;
    big.setAttribute("aria-label", "Hear " + letter + " again");
    big.addEventListener("click", () => A.say(letter));

    const text = document.createElement("div");
    text.className = "tg-detail-text";
    const sound = document.createElement("div");
    sound.className = "tg-detail-sound";
    sound.textContent = `“${info.sound}”`;
    const kind = document.createElement("div");
    kind.className = "tg-detail-kind tamil-glyph";
    kind.textContent =
      info.kind === "vowel" ? `உயிர் எழுத்து · vowel · ${info.short ? "குறில் (short)" : "நெடில் (long)"}`
      : info.kind === "consonant" ? `மெய் எழுத்து · consonant · ${{ hard: "வல்லினம் (hard)", soft: "மெல்லினம் (soft)", middle: "இடையினம் (middle)" }[info.group]}`
      : info.kind === "aytham" ? "ஆய்த எழுத்து · the special letter ஃ"
      : `உயிர்மெய் · ${info.mei} + ${info.vowel} = ${letter}`;
    text.append(sound, kind);

    const actions = document.createElement("div");
    actions.className = "tg-detail-actions";
    const hear = document.createElement("button");
    hear.type = "button";
    hear.className = "tg-pill";
    hear.textContent = "🔊 Hear";
    hear.addEventListener("click", () => A.say(letter));
    actions.appendChild(hear);
    if (info.kind === "uyirmei") {
      const blend = document.createElement("button");
      blend.type = "button";
      blend.className = "tg-pill tamil-glyph";
      blend.textContent = `🧩 ${info.mei} + ${info.vowel}`;
      blend.setAttribute("aria-label", `Blend ${info.mei} and ${info.vowel}`);
      blend.addEventListener("click", () => A.blend(letter));
      actions.appendChild(blend);
    }
    const example = exampleFor(letter);
    if (example) {
      const ex = document.createElement("button");
      ex.type = "button";
      ex.className = "tg-pill tamil-glyph";
      ex.textContent = `${example.emoji} ${example.tamil}`;
      ex.setAttribute("aria-label", `Example word ${example.tamil}, ${example.english}`);
      ex.addEventListener("click", () => A.say(example.tamil));
      actions.appendChild(ex);
    }
    text.appendChild(actions);
    detail.append(big, text);
  }

  function renderVowels(grid) {
    grid.className = "tg-chart tg-chart-12 tamil-glyph";
    T.VOWELS.forEach((v) => grid.appendChild(letterButton(v.tamil, v.short ? "short" : "long")));
    return T.VOWELS.map((v) => v.tamil);
  }

  function renderConsonants(grid) {
    grid.className = "tg-chart tg-chart-6 tamil-glyph";
    T.CONSONANTS.forEach((c) => grid.appendChild(letterButton(c.tamil, c.group)));
    grid.appendChild(letterButton(T.AYTHAM.tamil, "aytham"));
    return [...T.CONSONANTS.map((c) => c.tamil), T.AYTHAM.tamil];
  }

  function renderGrid(grid) {
    grid.className = "tg-grid-wrap";
    const table = document.createElement("table");
    table.className = "tg-grid tamil-glyph";
    const caption = document.createElement("caption");
    caption.textContent = "Tap a consonant to hear its row, or a vowel to hear its column.";
    table.appendChild(caption);
    const head = table.createTHead().insertRow();
    head.appendChild(document.createElement("th"));
    T.VOWELS.forEach((v, i) => {
      const th = document.createElement("th");
      th.scope = "col";
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tg-head";
      b.textContent = v.tamil;
      b.setAttribute("aria-label", `Play the ${v.tamil} column`);
      b.addEventListener("click", () => A.sequence(T.CONSONANTS.map((c) => c.base + T.VOWEL_SIGNS[i]), 250));
      th.appendChild(b);
      head.appendChild(th);
    });
    const body = table.createTBody();
    T.CONSONANTS.forEach((c) => {
      const row = body.insertRow();
      const th = document.createElement("th");
      th.scope = "row";
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tg-head";
      b.textContent = c.tamil;
      b.setAttribute("aria-label", `Play the ${c.tamil} row`);
      b.addEventListener("click", () => A.sequence(T.UYIRMEI.filter((u) => u.base === c.base).map((u) => u.tamil), 250));
      th.appendChild(b);
      row.appendChild(th);
      T.UYIRMEI.filter((u) => u.base === c.base).forEach((u) => {
        const cell = row.insertCell();
        cell.appendChild(letterButton(u.tamil, A.has(u.tamil) ? "recorded" : ""));
      });
    });
    grid.appendChild(table);
    return null;
  }

  const tabs = { uyir: renderVowels, mei: renderConsonants, uyirmei: renderGrid };
  let playList = null;

  function openTab(name) {
    A.stop();
    document.querySelectorAll("[data-tab]").forEach((t) => {
      const on = t.dataset.tab === name;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    const grid = $("chart-grid");
    grid.replaceChildren();
    grid.setAttribute("aria-labelledby", "tab-" + name);
    playList = tabs[name](grid);
    $("play-all").hidden = !playList;
    const first = name === "uyir" ? "அ" : name === "mei" ? "க்" : "க";
    showDetail(first);
    selectedBtn = null;
  }

  document.addEventListener("DOMContentLoaded", () => {
    KlgTamilGames.voiceNote($("voice-note"));
    A.preload([...T.VOWELS.map((v) => v.tamil), ...T.CONSONANTS.map((c) => c.tamil)]);
    document.querySelectorAll("[data-tab]").forEach((t, i, all) => {
      t.addEventListener("click", () => openTab(t.dataset.tab));
      t.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const next = all[(i + (e.key === "ArrowRight" ? 1 : all.length - 1)) % all.length];
        next.focus();
        openTab(next.dataset.tab);
      });
    });
    $("play-all").addEventListener("click", () => playList && A.sequence(playList, 300));
    $("stop-audio").addEventListener("click", () => A.stop());
    const tab = new URLSearchParams(location.search).get("tab");
    openTab(tabs[tab] ? tab : "uyir");
  });
})();
