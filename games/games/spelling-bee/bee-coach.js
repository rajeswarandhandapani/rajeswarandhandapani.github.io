/*
 * Spelling Bee training: the screens. The rules live in bee-core.js and the words in
 * bee-words.js. With ?level= or ?review= in the address, this page stays the older
 * "pick the right spelling" quiz (game.js), which is how written and online bees work.
 *
 * Spelling is typed on the game's own A to Z keys, never in a text box: a phone's
 * keyboard would autocorrect the word and do the spelling for the child.
 */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const query = new URLSearchParams(location.search);
  const $ = (id) => document.getElementById(id);

  // One page, two modes. Each removes what belongs to the other, so both can use the
  // shared ids. This script runs before game.js, so the quiz only ever finds its own.
  const removeAll = (ids) => ids.forEach((id) => { if ($(id)) $(id).remove(); });
  if (query.has('level') || query.has('review')) {
    removeAll(['bee-modes', 'how-coach', 'levels-title', 'bee-app', 'finish-screen']);
    return;
  }
  removeAll(['how-legacy', 'legacy-info', 'best-time-note', 'speech-note', 'quiz-screen', 'results-screen']);

  const { WORDS, PATTERNS, ORIGIN_TIPS, POS_TIPS, TIERS } = window.KlgBeeWords;
  const Core = window.KlgBeeCore;
  const today = Core.dayNumber();

  /* ---------- saved record ---------- */
  function loadStore() {
    try {
      return Core.normalizeStore(JSON.parse(localStorage.getItem(Core.STORE_KEY)));
    } catch (e) {
      return Core.emptyStore();
    }
  }
  const store = loadStore();
  function persist() {
    try {
      localStorage.setItem(Core.STORE_KEY, JSON.stringify(store));
    } catch (e) { /* blocked storage: the record lasts for this visit */ }
  }
  // The level buttons at the top of the page choose which words come first.
  if (Core.applyLevelFocus(store, query.get('focus'))) persist();
  const pool = () => Core.allWords(WORDS, store.custom);

  /* ---------- small helpers ---------- */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(className, text, onClick) {
    const node = el('button', className, text);
    node.type = 'button';
    node.addEventListener('click', onClick);
    return node;
  }
  /** On very short screens only the picture shows, so the name is kept for screen readers. */
  function iconButton(className, icon, label, onClick) {
    const node = button(className, '', onClick);
    node.setAttribute('aria-label', label);
    node.append(el('span', '', icon), el('span', 'bee-label-text', ` ${label}`));
    return node;
  }
  const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

  const hasSpeech = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';
  let noVoice = !hasSpeech;
  if (hasSpeech) {
    // A device can have the feature but no voice installed, and voices can load late.
    const check = () => {
      noVoice = speechSynthesis.getVoices().length === 0;
      const note = $('bee-novoice');
      if (note && !noVoice) note.remove();
    };
    check();
    if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', check);
  }
  function speak(text, rate) {
    if (!hasSpeech || !text) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate || 0.8;
    speechSynthesis.speak(utterance);
  }
  const sound = (name) => { if (window.KlgSounds && KlgSounds[name]) KlgSounds[name](); };

  /* ---------- screens ---------- */
  const startScreen = $('start-screen');
  const app = $('bee-app');
  const body = $('bee-body');
  const finishScreen = $('finish-screen');
  const progress = $('bee-progress');
  const pill = $('bee-pill');
  let turn = null;
  let backAction = null; // Where ⬅ Back goes, when it is not the start screen.

  function showScreen(which) {
    turn = null;
    startScreen.classList.toggle('d-none', which !== 'start');
    app.classList.toggle('d-none', which !== 'app');
    finishScreen.classList.toggle('d-none', which !== 'finish');
    window.scrollTo(0, 0);
  }

  function openView(title, pillText) {
    showScreen('app');
    progress.textContent = title;
    pill.textContent = pillText || '';
    pill.hidden = !pillText;
    body.replaceChildren();
    backAction = null;
  }

  function goHome() {
    if (hasSpeech) speechSynthesis.cancel();
    refreshLabel();
    showScreen('start');
    $('start-btn').focus({ preventScroll: true });
  }

  function refreshLabel() {
    const label = $('mode-label');
    if (!label) return;
    const left = Core.daysLeft(store, today);
    const planned = Math.min(Core.SESSION_SIZE, pool().length);
    const words = store.doneDay === today ? "✅ Today's words done" : `Today: ${planned} words`;
    label.textContent = left !== null && left > 0 ? `🗓️ ${left} ${left === 1 ? 'day' : 'days'} · ${words}` : words;
  }

  /* ---------- one word: hear it, ask about it, spell it ---------- */

  /** The clues a speller may ask for. */
  function clueButtons(entry) {
    const clues = [];
    if (entry.def) clues.push(['meaning', '📖', 'Meaning']);
    if (entry.sentence) clues.push(['sentence', '💬', 'Sentence']);
    if (entry.pos) clues.push(['pos', '🏷️', 'Part of speech']);
    if (entry.origin) clues.push(['origin', '🌍', 'Origin']);
    return clues;
  }

  function answerClue(kind, entry, mode, box) {
    const show = (text) => { box.textContent = text; };
    if (kind === 'meaning') {
      show(`Meaning: ${Core.meaningFor(entry, mode)}.`);
      speak(Core.meaningFor(entry, mode));
    } else if (kind === 'sentence') {
      show(Core.maskSentence(entry.sentence, Core.display(entry)));
      speak(entry.sentence);
    } else if (kind === 'pos') {
      show(`${capitalize(entry.pos)}. ${mode === 'train' ? POS_TIPS[entry.pos] || '' : ''}`.trim());
      speak(entry.pos);
    } else if (kind === 'origin') {
      show(`From ${entry.origin}. ${mode === 'train' ? ORIGIN_TIPS[entry.origin] || '' : ''}`.trim());
      speak(`From ${entry.origin}`);
    }
  }

  function paintTiles() {
    const box = $('bee-tiles');
    if (!box || !turn) return;
    box.replaceChildren(...turn.typed.map((ch) => el('span', 'bee-tile', ch)));
    const said = $('bee-said');
    if (said) said.textContent = turn.typed.join(' ');
    const erase = $('bee-erase');
    if (erase) erase.disabled = !turn.typed.length;
    $('bee-done').disabled = !turn.typed.length;
    box.classList.toggle('bee-tiles-empty', !turn.typed.length);
  }

  function typeLetter(ch) {
    if (!turn || turn.locked) return;
    // Rule 5: retracing a spelling must not change the letters first said.
    if (turn.retracing && turn.typed.length < turn.said.length && ch !== turn.said[turn.typed.length]) {
      turn.typed.push(ch);
      paintTiles();
      submitTurn(true);
      return;
    }
    if (turn.typed.length >= 40) return;
    turn.typed.push(ch);
    sound('click');
    paintTiles();
  }

  function submitTurn(changed) {
    if (!turn || turn.locked || !turn.typed.length) return;
    const retraceCut = turn.retracing && turn.typed.length < turn.said.length;
    turn.locked = true;
    body.classList.add('bee-answered');
    const entryBox = $('bee-entry');
    if (entryBox) entryBox.classList.add('d-none');
    turn.onSubmit(turn.typed.join(''), !!changed || retraceCut);
  }

  /** Draws the word screen. onSubmit gets the typed letters when the speller is done. */
  function renderTurn(entry, mode, onSubmit) {
    body.replaceChildren();
    body.classList.remove('bee-answered');
    turn = { entry, mode, typed: [], said: [], retracing: false, locked: false, onSubmit };

    body.append(el('p', 'bee-coachline', mode === 'mock' ? 'Say the word. Spell it. Say it again.' : 'Listen, ask for clues, then spell it.'));
    if (noVoice) {
      const note = el('p', 'bee-novoice', '🔇 This device has no voice, so use the clues below, or ask a grown-up to read the words.');
      note.id = 'bee-novoice';
      body.append(note);
    }
    const ask = el('div', 'bee-ask');
    const hearRow = el('div', 'bee-hear-row');
    const hear = iconButton('bee-hear', '🔊', 'Hear the word', () => speak(Core.spoken(entry)));
    hear.id = 'bee-hear';
    hearRow.append(hear);
    // A real pronouncer will not say a word more slowly, so only practice offers that.
    if (mode === 'train') {
      const slow = iconButton('bee-clue bee-slow', '🐢', 'Slowly', () => speak(Core.spoken(entry), 0.5));
      slow.dataset.clue = 'slow';
      hearRow.append(slow);
    }
    ask.append(hearRow);

    const clueText = el('p', 'bee-clue-text');
    clueText.id = 'bee-clue-text';
    clueText.setAttribute('aria-live', 'polite');
    const clues = el('div', 'bee-clues');
    clues.setAttribute('role', 'group');
    clues.setAttribute('aria-label', 'Ask for a clue');
    clueButtons(entry).forEach(([kind, icon, label]) => {
      const clue = iconButton('bee-clue', icon, label, () => {
        if (turn && turn.locked) return;
        if (mock) mock.asked += 1;
        answerClue(kind, entry, mode, clueText);
        showClue(clueText);
      });
      clue.dataset.clue = kind;
      clues.append(clue);
    });
    ask.append(clues);
    body.append(ask, clueText);

    const feedback = el('div', 'bee-feedback');
    feedback.id = 'bee-feedback';
    feedback.setAttribute('aria-live', 'polite');

    const entryBox = el('div', 'bee-entry');
    entryBox.id = 'bee-entry';
    const tiles = el('div', 'bee-tiles bee-tiles-empty');
    tiles.id = 'bee-tiles';
    const said = el('span', 'visually-hidden');
    said.id = 'bee-said';
    said.setAttribute('aria-live', 'polite');
    const keys = el('div', 'bee-keys');
    keys.setAttribute('role', 'group');
    keys.setAttribute('aria-label', 'Letters');
    'abcdefghijklmnopqrstuvwxyz'.split('').forEach((ch) => {
      const key = button('bee-key', ch.toUpperCase(), () => typeLetter(ch));
      key.dataset.letter = ch;
      keys.append(key);
    });
    const actions = el('div', 'bee-actions');
    if (mode === 'mock') {
      const over = button('bee-action', '🔁 Start over', () => {
        if (!turn || turn.locked || !turn.typed.length) return;
        turn.said = turn.typed.length > turn.said.length ? [...turn.typed] : turn.said;
        turn.retracing = true;
        turn.typed = [];
        paintTiles();
        clueText.textContent = 'Starting over: use exactly the same letters as before.';
      });
      over.id = 'bee-over';
      actions.append(over);
    } else {
      const erase = button('bee-action', '⌫ Erase', () => {
        if (!turn || turn.locked) return;
        turn.typed.pop();
        paintTiles();
      });
      erase.id = 'bee-erase';
      actions.append(erase);
    }
    const done = button('bee-action bee-done', '✓ Done', () => submitTurn(false));
    done.id = 'bee-done';
    actions.append(done);
    entryBox.append(tiles, said, keys, actions);
    body.append(feedback, entryBox);
    paintTiles();

    // Rule 4: a word with a sound-alike is always defined, so the speller knows which one is meant.
    // So is a word that can be read two ways, in case the voice picks the other reading.
    if ((entry.homo || entry.define) && entry.def) {
      clueText.textContent = `Meaning: ${Core.meaningFor(entry, mode)}.`;
      speak(`${Core.spoken(entry)}. ${Core.meaningFor(entry, mode)}`);
    } else {
      speak(Core.spoken(entry));
    }
    // With no voice the clues have to carry the word.
    if (noVoice) {
      const parts = [];
      if (entry.def) parts.push(`Meaning: ${Core.meaningFor(entry, mode)}.`);
      if (entry.sentence) parts.push(Core.maskSentence(entry.sentence, Core.display(entry)));
      clueText.textContent = parts.join(' ') || 'This word has no clues saved. Ask a grown-up to read it to you.';
    }
    window.scrollTo(0, 0);
    if (clueText.textContent) showClue(clueText);
    hear.focus({ preventScroll: true });
  }

  /** On short screens the keys stay in view, so a clue must be scrolled clear of them. */
  function showClue(clueText) {
    clueText.style.scrollMarginBottom = `${$('bee-entry').offsetHeight + 8}px`;
    clueText.scrollIntoView({ block: 'nearest' });
  }

  /** Physical keyboards work too. Enter on a focused button must still press that button. */
  document.addEventListener('keydown', (event) => {
    if (!turn || turn.locked || event.ctrlKey || event.metaKey || event.altKey) return;
    const onButton = event.target && event.target.tagName === 'BUTTON';
    if (/^[a-zA-Z]$/.test(event.key)) {
      event.preventDefault();
      if (onButton) event.target.blur();
      typeLetter(event.key.toLowerCase());
    } else if (event.key === 'Backspace' && turn.mode !== 'mock') {
      event.preventDefault();
      turn.typed.pop();
      paintTiles();
    } else if (event.key === 'Enter' && !onButton) {
      event.preventDefault();
      submitTurn(false);
    }
  });

  /** After an answer the result and the way forward must be on screen, or a child looks stuck. */
  function reveal(feedback, action) {
    feedback.scrollIntoView({ block: 'nearest' });
    if (action) action.scrollIntoView({ block: 'nearest' });
  }

  /** The word, big, with the tricky part marked. */
  function wordDisplay(entry) {
    const [before, tricky, after] = Core.splitTricky(entry);
    const word = el('div', 'bee-word');
    word.append(document.createTextNode(before));
    if (tricky) word.append(el('mark', '', tricky));
    word.append(document.createTextNode(after));
    return word;
  }

  /** The letters the child typed, with the wrong ones marked. */
  function typedDisplay(typed, entry) {
    const row = el('div', 'bee-tiles bee-tiles-result');
    row.setAttribute('aria-label', `You spelled ${typed.split('').join(' ')}`);
    Core.compare(typed, entry.word).typed.forEach(({ ch, ok }) => row.append(el('span', ok ? 'bee-tile good' : 'bee-tile bad', ch)));
    return row;
  }

  function patternTips(entry) {
    const box = el('div', 'bee-tips');
    if (entry.hook) box.append(el('p', 'bee-hook', `💡 ${entry.hook}`));
    const key = entry.patterns && entry.patterns[0];
    if (key && PATTERNS[key]) {
      const tip = el('p', 'bee-rule');
      tip.append(el('b', '', `${PATTERNS[key].icon} ${PATTERNS[key].name}: `), document.createTextNode(PATTERNS[key].rule));
      box.append(tip);
    }
    return box;
  }

  /** A word to learn: the spelling, the sound of it, what it means and how to remember it. */
  function appendStudyCard(entry) {
    const word = wordDisplay(entry);
    word.classList.add('bee-word-big');
    body.append(el('p', 'bee-coachline', 'Look at it. Listen. Say it out loud.'), word);
    const hearRow = el('div', 'bee-hear-row');
    const hear = iconButton('bee-hear', '🔊', 'Hear it', () => speak(Core.spoken(entry)));
    hear.id = 'bee-study-hear';
    hearRow.append(hear, iconButton('bee-clue bee-slow', '🐢', 'Slowly', () => speak(Core.spoken(entry), 0.5)));
    if (!noVoice) body.append(hearRow); // With no voice these buttons would do nothing.
    if (entry.def) body.append(el('p', 'bee-rule bee-study-line', `📖 ${capitalize(entry.def)}.`));
    if (entry.sentence) body.append(el('p', 'bee-rule bee-study-line', `💬 ${entry.sentence}`));
    body.append(patternTips(entry));
    speak(Core.spoken(entry));
  }

  /* ---------- practice: a round of words ---------- */
  let session = null;

  function startSession(entries, options) {
    session = {
      queue: [...entries], total: entries.length, index: 0, score: 0, streak: 0, bestStreak: 0,
      firstMissed: [], returned: new Set(), seen: new Set(), studied: new Set(), daily: !!options.daily, again: options.again, title: options.title,
    };
    mock = null;
    nextWord();
  }

  function nextWord() {
    if (session.index >= session.queue.length) return finishSession();
    const entry = session.queue[session.index];
    openView(`${session.index + 1} / ${session.queue.length}`, `⭐ ${session.score}`);
    const spellIt = () => renderTurn(entry, 'train', (typed) => checkPractice(entry, typed, 0));
    // A new word is learned before it is tested. A word coming back is not shown first:
    // remembering it unaided is what makes it stick.
    if (store.words[entry.word]) spellIt();
    else renderStudy(entry, spellIt);
    return undefined;
  }

  function renderStudy(entry, spellIt) {
    session.studied.add(entry.word);
    appendStudyCard(entry);
    const go = button('bee-next bee-study-go', "✏️ I'm ready to spell", spellIt);
    go.id = 'bee-study-go';
    body.append(go);
    go.focus({ preventScroll: true });
  }

  function nextButton() {
    const last = session.index + 1 >= session.queue.length;
    const next = button('bee-next', last ? 'See how I did ▶' : 'Next word ▶', () => {
      session.index += 1;
      nextWord();
    });
    next.id = 'bee-next';
    return next;
  }

  function checkPractice(entry, typed, covers) {
    const verdict = Core.judge(entry, typed);
    const first = !session.seen.has(entry.word);
    session.seen.add(entry.word);
    const feedback = $('bee-feedback');
    feedback.replaceChildren();

    if (first) {
      Core.recordResult(store, entry.word, verdict.right, today, session.studied.has(entry.word));
      persist();
    }
    if (verdict.right) {
      if (first) {
        session.score += 1;
        session.streak += 1;
        session.bestStreak = Math.max(session.bestStreak, session.streak);
        pill.textContent = `⭐ ${session.score}`;
      }
      sound('correct');
      const praise = covers ? '🌟 You fixed it! It comes back tomorrow to make sure.' : first ? '✓ Right!' : '✓ Right this time!';
      feedback.append(el('p', 'bee-right', praise));
      if (verdict.kind === 'variant') feedback.append(el('p', 'bee-rule', `Your spelling counts. In the United States it is usually spelled ${Core.display(entry)}.`));
      feedback.append(typedDisplay(typed, entry));
      if (entry.def) feedback.append(el('p', 'bee-rule', `${Core.display(entry)}: ${entry.def}.`));
      if (Core.stageNote(entry)) feedback.append(el('p', 'bee-rule', Core.stageNote(entry)));
      const next = nextButton();
      feedback.append(next);
      next.focus({ preventScroll: true });
      reveal(feedback, next);
      return;
    }

    if (first) {
      session.streak = 0;
      session.firstMissed.push(entry);
      // It comes back at the end of this round too, once.
      if (!session.returned.has(entry.word)) {
        session.returned.add(entry.word);
        session.queue.push(entry);
      }
    }
    sound('wrong');
    feedback.append(el('p', 'bee-wrong', verdict.kind === 'homophone'
      ? `That is a real word, but it means something else. Listen for the meaning: ${entry.def}.`
      : 'Not quite. Look closely.'));
    feedback.append(typedDisplay(typed, entry), wordDisplay(entry), patternTips(entry));
    if (Core.stageNote(entry)) feedback.append(el('p', 'bee-rule', Core.stageNote(entry)));
    if (covers < 2) {
      const cover = button('bee-next', '🙈 Cover it and spell it', () => {
        renderTurn(entry, 'train', (again) => checkPractice(entry, again, covers + 1));
      });
      cover.id = 'bee-cover';
      feedback.append(cover);
      cover.focus({ preventScroll: true });
    } else {
      feedback.append(el('p', 'bee-rule', 'This one is tricky. It comes back soon, so do not worry.'));
      const next = nextButton();
      feedback.append(next);
      next.focus({ preventScroll: true });
    }
    speak(Core.spoken(entry));
    reveal(feedback, feedback.querySelector('button'));
  }

  function finishSession() {
    const { score, total, firstMissed } = session;
    if (session.daily) store.doneDay = today;
    persist();
    const note = firstMissed.length
      ? `${score} of ${total} right first time. ${firstMissed.length === 1 ? 'The tricky word comes' : 'The tricky words come'} back tomorrow.`
      : 'All right first time! These words come back soon to make sure they stick.';
    showFinish({ score, total, note, recap: firstMissed, recapTitle: 'Tricky words', bestStreak: session.bestStreak, mode: 'training', again: session.again });
  }

  /* ---------- the mock bee ---------- */
  let mock = null;

  function renderMockIntro() {
    openView('🔔 Mock Bee');
    body.append(el('p', 'bee-lead', 'This is the real thing: one wrong letter and the bell rings. No going back on a letter. Ask for as many clues as you like.'));
    Object.values(Core.BEES).forEach((bee) => {
      const best = store.best[bee.key];
      const choice = button('bee-choice', '', () => startMock(bee.key));
      choice.dataset.bee = bee.key;
      choice.append(
        el('span', 'bee-choice-pic', bee.icon),
        el('b', '', bee.name),
        el('small', '', `${bee.rivals + 1} spellers${bee.vocab.length ? ' · with vocabulary rounds' : ''}`),
        el('small', 'bee-best', best ? (best.place === 1 ? '🏆 You have won this one!' : `Best: ${Core.ordinal(best.place)} of ${best.of}`) : 'Not tried yet'),
      );
      body.append(choice);
    });
    const rules = button('bee-quiet', '📖 How a bee works', renderRules);
    rules.id = 'bee-rules-link';
    body.append(rules);
  }

  function startMock(key) {
    const bee = Core.BEES[key];
    session = null;
    mock = { bee, round: 0, rivals: Core.RIVALS.slice(0, bee.rivals), used: new Set(), right: 0, played: 0, asked: 0, streak: 0, bestStreak: 0, missed: [], tied: [] };
    playRound();
  }

  function stageRow() {
    const row = el('div', 'bee-stage');
    row.setAttribute('aria-label', `${mock.rivals.length + 1} spellers still in`);
    row.append(el('span', 'bee-speller me', '🙂'));
    mock.rivals.forEach((rival) => {
      const chip = el('span', 'bee-speller', rival.emoji);
      chip.title = rival.name;
      row.append(chip);
    });
    return row;
  }

  function playRound() {
    mock.round += 1;
    mock.played += 1;
    const words = pool();
    const entry = Core.pickMockWord(mock.bee, mock.round, words, mock.used, store, Math.random);
    mock.used.add(entry.word);
    openView(`Round ${mock.round}`, `🐝 ${mock.rivals.length + 1} left`);
    if (Core.isVocabRound(mock.bee, mock.round) && entry.def) {
      renderVocab(entry, words);
    } else {
      renderTurn(entry, 'mock', (typed, changed) => {
        const verdict = Core.judge(entry, typed);
        const right = verdict.right && !changed;
        Core.recordResult(store, entry.word, right, today);
        persist();
        settleMock(right, { entry, typed, changed, verdict });
      });
    }
    body.prepend(stageRow());
  }

  function renderVocab(entry, words) {
    const q = Core.vocabQuestion(entry, words, Math.random);
    body.append(el('p', 'bee-coachline', '📖 Vocabulary round'));
    const question = el('p', 'bee-lead', 'What does ');
    question.append(el('b', '', Core.display(entry)), document.createTextNode(' mean?'));
    const hear = button('bee-hear', '🔊 Hear the question', () => say());
    hear.id = 'bee-hear';
    const say = () => speak(`What does ${Core.spoken(entry)} mean? A: ${q.options[0]}. Or B: ${q.options[1]}.`);
    const feedback = el('div', 'bee-feedback');
    feedback.id = 'bee-feedback';
    feedback.setAttribute('aria-live', 'polite');
    const answers = el('div', 'bee-answers');
    q.options.forEach((option, index) => {
      const answer = button('bee-answer', `${'AB'[index]}. ${option}`, () => {
        answers.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        answer.classList.add(index === q.answer ? 'good' : 'bad');
        settleMock(index === q.answer, { entry, vocab: true, correct: q.options[q.answer] });
      });
      answer.dataset.answer = String(index);
      answer.dataset.right = String(index === q.answer);
      answers.append(answer);
    });
    body.append(question, hear, answers, feedback);
    say();
  }

  function namesOf(rivals) {
    const names = rivals.map((r) => `${r.emoji} ${r.name}`);
    if (names.length < 2) return names.join('');
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }

  function settleMock(right, info) {
    const result = Core.settleRound(mock.bee, mock.round, mock.rivals, right, Math.random);
    if (right) {
      mock.right += 1;
      mock.streak += 1;
      mock.bestStreak = Math.max(mock.bestStreak, mock.streak);
    } else {
      mock.streak = 0;
      mock.missed.push(info.entry);
    }
    mock.rivals = result.alive;
    const feedback = $('bee-feedback');
    feedback.replaceChildren();
    sound(right ? 'correct' : 'bell');

    if (right) {
      feedback.append(el('p', 'bee-right', '✓ Right!'));
    } else if (info.vocab) {
      feedback.append(el('p', 'bee-wrong', `🔔 The bell rang. ${Core.display(info.entry)} means: ${info.correct}.`));
    } else {
      feedback.append(el('p', 'bee-wrong', info.changed
        ? '🔔 You changed a letter while starting over. On stage that is out, even if the new spelling is right.'
        : info.verdict.kind === 'homophone' ? `🔔 That is a sound-alike. Listen for the meaning: ${info.entry.def}.` : '🔔 The bell rang.'));
      feedback.append(typedDisplay(info.typed, info.entry), wordDisplay(info.entry));
    }
    if (result.wrong.length && result.outcome !== 'allstay') feedback.append(el('p', 'bee-rivals', `Out this round: ${namesOf(result.wrong)}.`));

    if (result.outcome === 'allstay') {
      feedback.append(el('p', 'bee-rivals', 'Nobody got it right this round, so everyone stays in!'));
    } else if (result.outcome === 'champion') {
      feedback.append(el('p', 'bee-right', 'You are the only one who got it right. You win!'));
    }

    const finished = result.outcome === 'champion' || result.outcome === 'out';
    const go = button('bee-next', finished ? 'See how I did ▶' : 'Next round ▶', () => {
      if (finished) finishMock(result);
      else playRound();
    });
    go.id = 'bee-next';
    feedback.append(go);
    go.focus({ preventScroll: true });
    reveal(feedback, go);
  }

  function finishMock(result) {
    const beeKey = mock.bee.key;
    const of = mock.bee.rivals + 1;
    const champion = result.outcome === 'champion';
    const place = champion ? 1 : result.place;
    Core.saveBest(store, mock.bee.key, place, of);
    persist();
    const medal = { 1: '🏆', 2: '🥈', 3: '🥉' }[place] || '🎖️';
    const big = champion ? '🏆 Champion!' : `${medal} ${Core.ordinal(place)} of ${of}`;
    let note = champion
      ? `You won the ${mock.bee.name}!`
      : `${result.tiedWith.length ? `You tied with ${namesOf(result.tiedWith)}. ` : ''}${mock.right ? `You got through ${mock.right} ${mock.right === 1 ? 'round' : 'rounds'}.` : 'That was a tricky one to start with.'}`;
    if (!champion && mock.asked === 0) note += ' Tip: ask for the meaning or the origin next time. Asking never gets you out, and it gives you clues.';
    showFinish({
      score: mock.right, total: mock.played, note, big, recap: mock.missed, recapTitle: 'Words to learn', bestStreak: mock.bestStreak,
      mode: `mock-${beeKey}`, champion, again: () => startMock(beeKey),
    });
  }

  /* ---------- end of a round ---------- */
  let playAgain = null;

  function showFinish({ score, total, note, big, recap, recapTitle, bestStreak, mode, champion, again }) {
    playAgain = again;
    showScreen('finish');
    const scoreBox = $('bee-finish-body');
    window.KlgGameKit.finish({ score, total, el: scoreBox, message: note, bestStreak, mode, beeChampion: !!champion });
    if (big) scoreBox.querySelector('.tg-finish-score').textContent = big;
    const box = $('bee-recap');
    box.replaceChildren();
    if (recap && recap.length) {
      box.append(el('h2', 'bee-subhead', recapTitle));
      recap.forEach((entry) => {
        const row = el('div', 'bee-recap-row');
        const words = el('div', 'bee-recap-word');
        words.append(wordDisplay(entry));
        if (entry.def) words.append(el('small', '', entry.def));
        const say = button('kid-say', '🔊', () => speak(Core.spoken(entry)));
        say.setAttribute('aria-label', `Hear ${Core.display(entry)}`);
        row.append(words, say);
        const key = entry.patterns && entry.patterns[0];
        box.append(row);
        if (key && PATTERNS[key]) {
          const practise = button('bee-quiet', `${PATTERNS[key].icon} Practice ${PATTERNS[key].name}`, () => renderPatternIntro(key));
          box.append(practise);
        }
      });
    }
    $('play-again-btn').focus({ preventScroll: true });
  }
  $('play-again-btn').addEventListener('click', () => {
    if (window.KlgSounds) KlgSounds.click();
    if (playAgain) playAgain();
  });

  /* ---------- word patterns ---------- */
  function renderPatterns() {
    openView('🧩 Word patterns');
    body.append(el('p', 'bee-lead', 'Patterns help you spell words you have never seen. Pick one to learn.'));
    const grid = el('div', 'bee-pattern-grid');
    const words = pool();
    Object.keys(PATTERNS).forEach((key) => {
      const inPattern = words.filter((w) => w.patterns.includes(key));
      const mastered = inPattern.filter((w) => Core.stateOf(store, w.word) === 'mastered').length;
      const card = button('bee-pattern', '', () => renderPatternIntro(key));
      card.dataset.pattern = key;
      card.append(el('span', 'bee-choice-pic', PATTERNS[key].icon), el('b', '', PATTERNS[key].name), el('small', '', `${mastered} of ${inPattern.length}`));
      grid.append(card);
    });
    body.append(grid);
  }

  function renderPatternIntro(key) {
    const pattern = PATTERNS[key];
    openView(`${pattern.icon} ${pattern.name}`);
    body.append(el('p', 'bee-lead bee-rule-big', pattern.rule));
    if (pattern.eg) body.append(el('p', 'bee-rule', `Like: ${pattern.eg}`));
    const hear = button('bee-hear', '🔊 Hear the rule', () => speak(pattern.rule, 0.9));
    hear.id = 'bee-hear';
    const go = button('bee-next', '▶ Practice 5 words', () => {
      const run = () => startSession(Core.planPattern(store, pool(), key, today), { again: run, title: pattern.name });
      run();
    });
    go.id = 'bee-pattern-go';
    body.append(hear, go);
    go.focus({ preventScroll: true });
    speak(pattern.rule, 0.9);
  }

  /* ---------- spelling aloud with a grown-up ---------- */
  let oral = null;

  function renderOralIntro() {
    openView('🗣️ With a grown-up');
    body.append(el('p', 'bee-lead', 'Real bees are spoken, so this is the closest practice to the real thing.'));
    const steps = el('ol', 'bee-steps');
    ['Grown-up: hold this screen, so the child cannot see the word.', 'Read the word out loud. Answer any questions, using the clues on the screen.', 'Child: stand up, face the grown-up. Say the word, spell it clearly, say it again.', 'Grown-up: tap ✓ if every letter was right, or 🔔 if not.'].forEach((step) => steps.append(el('li', '', step)));
    const go = button('bee-next', '▶ Start 10 words', startOral);
    go.id = 'bee-oral-go';
    body.append(steps, go);
    go.focus({ preventScroll: true });
  }

  function startOral() {
    oral = { queue: Core.planSession(store, pool(), today), index: 0, right: 0, streak: 0, bestStreak: 0, missed: [] };
    session = null;
    mock = null;
    showOralWord();
  }

  function showOralWord() {
    if (oral.index >= oral.queue.length) {
      showFinish({
        score: oral.right, total: oral.queue.length, note: oral.missed.length ? `${oral.right} of ${oral.queue.length} spelled out loud. Great stage practice!` : 'Every word right, out loud. That is stage ready!',
        recap: oral.missed, recapTitle: 'Words to learn', bestStreak: oral.bestStreak, mode: 'oral', again: startOral,
      });
      return;
    }
    const entry = oral.queue[oral.index];
    openView(`${oral.index + 1} / ${oral.queue.length}`, `⭐ ${oral.right}`);
    const word = el('div', 'bee-word bee-word-big', Core.display(entry));
    word.id = 'bee-oral-word';
    const say = button('bee-hear', '🔊 Say it for me', () => speak(Core.spoken(entry)));
    say.id = 'bee-hear';
    const facts = el('dl', 'bee-facts');
    [['Meaning', Core.meaningFor(entry, 'oral')], ['In simple words', entry.official ? entry.def : ''], ['Sentence', entry.sentence], ['Part of speech', entry.pos], ['Origin', entry.origin]].forEach(([name, value]) => {
      if (value) facts.append(el('dt', '', name), el('dd', '', value));
    });
    const judgeRow = el('div', 'bee-judge');
    const mark = (right) => () => {
      Core.recordResult(store, entry.word, right, today);
      persist();
      sound(right ? 'correct' : 'bell');
      if (right) {
        oral.right += 1;
        oral.streak += 1;
        oral.bestStreak = Math.max(oral.bestStreak, oral.streak);
      } else {
        oral.streak = 0;
        oral.missed.push(entry);
      }
      oral.index += 1;
      showOralWord();
    };
    const yes = button('bee-judge-btn yes', '✓ Right', mark(true));
    yes.id = 'bee-oral-right';
    const no = button('bee-judge-btn no', '🔔 Bell', mark(false));
    no.id = 'bee-oral-wrong';
    judgeRow.append(yes, no);
    body.append(word, say, facts, judgeRow);
  }

  /* ---------- my words ---------- */
  function goalText() {
    const goal = Core.dailyGoal(store, pool(), today);
    if (goal === null) {
      const left = Core.daysLeft(store, today);
      return left !== null ? 'That day has passed. Pick the date of your next bee.' : 'Add the date and we will work out a daily goal.';
    }
    const days = `${goal.daysLeft} ${goal.daysLeft === 1 ? 'day' : 'days'} to go.`;
    return goal.fresh ? `${days} Learn ${goal.perDay} new ${goal.perDay === 1 ? 'word' : 'words'} a day to meet all ${goal.scope}.` : `${days} You have met every word in this set. Keep practicing, and run a Mock Bee.`;
  }

  /** The word lists, in the order they are offered. The school's own is there once it has been pasted in. */
  function wordLists() {
    const words = pool();
    const lists = [{ key: 'list', icon: '🎯', name: 'Third grade', note: '2026–27 study list', words: words.filter((w) => w.list) }];
    [1, 2, 3].forEach((n) => lists.push({ ...TIERS[n], words: words.filter((w) => w.study === n) }));
    if (store.custom.length) {
      const onList = new Set(store.custom.map((c) => c.word));
      lists.push({ key: 'school', icon: '🏫', name: 'My school list', note: 'your bee', words: words.filter((w) => onList.has(w.word)) });
    }
    return lists;
  }

  /** Every word on a list, to read and learn at any time. Reading one changes nothing in the record. */
  function renderWordList(key, scrollTo) {
    const lists = wordLists();
    const list = lists.find((l) => l.key === key) || lists[0];
    openView('📖 Read the words');
    backAction = renderMyWords;
    const tabs = el('div', 'bee-chips bee-list-tabs');
    tabs.setAttribute('role', 'group');
    tabs.setAttribute('aria-label', 'Which words to read');
    lists.forEach((l) => {
      const tab = button('bee-chip', `${l.icon} ${l.name}`, () => renderWordList(l.key));
      tab.dataset.list = l.key;
      tab.setAttribute('aria-pressed', String(l === list));
      tabs.append(tab);
    });
    const rows = el('div', 'bee-wordlist');
    list.words.forEach((entry, index) => {
      const row = button('bee-wordrow', '', () => renderWordCard(list, index, window.scrollY));
      row.dataset.word = entry.word;
      const mastered = Core.stateOf(store, entry.word) === 'mastered';
      row.append(el('b', '', `${mastered ? '✅ ' : ''}${Core.display(entry)}`));
      if (entry.def) row.append(el('small', '', entry.def));
      rows.append(row);
    });
    body.append(tabs, el('p', 'bee-rule', `${list.words.length} words. Tap one to see it and hear it.`), rows);
    if (scrollTo) window.scrollTo(0, scrollTo);
  }

  function renderWordCard(list, index, listScroll) {
    const entry = list.words[index];
    openView(`${list.icon} ${index + 1} / ${list.words.length}`);
    backAction = () => renderWordList(list.key, listScroll);
    appendStudyCard(entry);
    if (index + 1 < list.words.length) {
      const next = button('bee-next bee-study-go', 'Next word ▶', () => renderWordCard(list, index + 1, listScroll));
      next.id = 'bee-word-next';
      body.append(next);
      next.focus({ preventScroll: true });
    }
  }

  function renderMyWords() {
    openView('📋 My words');
    const words = pool();
    const summary = Core.stats(store, words, today);
    const count = (n) => `${n} ${n === 1 ? 'word' : 'words'}`;
    body.append(el('p', 'bee-lead', `Mastered: ${count(summary.all.mastered)}. On the way: ${count(summary.all.learning)}. A word is mastered when you spell it right on three different days.`));

    const focusKey = wordLists().some((l) => l.key === store.focus) ? store.focus : 'list';
    const read = button('bee-choice', '', () => renderWordList(focusKey));
    read.id = 'bee-read-words';
    read.append(el('span', 'bee-choice-pic', '📖'), el('b', '', 'Read the words'), el('small', '', 'See and hear every word'));
    body.append(read);

    const choose = el('div', 'bee-tiers');
    choose.setAttribute('role', 'group');
    choose.setAttribute('aria-label', 'Which words to learn first');
    const addTier = (key, icon, name, note, row) => {
      const tile = button('bee-tier', '', () => {
        store.focus = key;
        persist();
        renderMyWords();
      });
      tile.dataset.focus = key;
      tile.setAttribute('aria-pressed', String(store.focus === key));
      const bar = el('span', 'bee-bar');
      const fill = el('i');
      fill.style.width = `${row.total ? Math.round((row.mastered / row.total) * 100) : 0}%`;
      bar.append(fill);
      tile.append(el('span', 'bee-choice-pic', icon), el('b', '', name), el('small', '', note), el('small', '', `${row.mastered} of ${row.total} mastered`), bar);
      choose.append(tile);
    };
    wordLists().forEach((l) => addTier(l.key, l.icon, l.name, l.note, {
      total: l.words.length,
      mastered: l.words.filter((w) => Core.stateOf(store, w.word) === 'mastered').length,
    }));
    body.append(el('h2', 'bee-subhead', 'Learn first'), choose);

    if (summary.tricky.length) {
      body.append(el('h2', 'bee-subhead', 'Tricky words'));
      const list = el('div', 'bee-chips');
      summary.tricky.slice(0, 12).forEach((entry) => {
        const chip = button('bee-chip', `🔊 ${Core.display(entry)}`, () => speak(Core.spoken(entry)));
        list.append(chip);
      });
      body.append(list);
    }

    body.append(el('h2', 'bee-subhead', 'For grown-ups'));
    const dateLabel = el('label', 'bee-label', '🗓️ When is the bee?');
    const date = el('input', 'bee-input');
    date.type = 'date';
    date.id = 'bee-date';
    date.value = store.beeDate;
    dateLabel.setAttribute('for', 'bee-date');
    const goal = el('p', 'bee-rule', goalText());
    goal.id = 'bee-goal';
    date.addEventListener('change', () => {
      store.beeDate = Core.dayFromIso(date.value) === null ? '' : date.value;
      persist();
      goal.textContent = goalText();
    });
    body.append(dateLabel, date, goal);

    const listLabel = el('label', 'bee-label', "🏫 The school's word list");
    listLabel.setAttribute('for', 'bee-list');
    const area = el('textarea', 'bee-input bee-area');
    area.id = 'bee-list';
    area.rows = 6;
    area.setAttribute('spellcheck', 'false');
    area.setAttribute('autocapitalize', 'off');
    area.setAttribute('autocomplete', 'off');
    area.placeholder = 'One word on each line.\nYou can add a meaning: castle - a large stone building';
    area.value = store.custom.map((c) => (c.def ? `${c.word} - ${c.def}` : c.word)).join('\n');
    const saved = el('p', 'bee-rule');
    saved.id = 'bee-list-note';
    saved.setAttribute('aria-live', 'polite');
    const save = button('bee-next', 'Save the list', () => {
      const { words: parsed, skipped } = Core.parseList(area.value);
      store.custom = parsed;
      if (parsed.length) store.focus = 'school';
      else if (store.focus === 'school') store.focus = 'list';
      persist();
      renderMyWords();
      const note = $('bee-list-note');
      note.textContent = `Saved ${parsed.length} ${parsed.length === 1 ? 'word' : 'words'}.${skipped.length ? ` Left out, because only letters can be typed: ${skipped.slice(0, 8).join(', ')}.` : ''}`;
      note.scrollIntoView({ block: 'nearest' });
    });
    save.id = 'bee-list-save';
    const where = el('p', 'bee-rule', 'Paste any other list the school uses here. The 2026–27 study list is already in the game.');
    body.append(listLabel, where, area, save, saved);
    const rules = button('bee-quiet', '📖 How a bee works', renderRules);
    body.append(rules);
  }

  /* ---------- the rules, in a child's words ---------- */
  function renderRules() {
    openView('📖 How a bee works');
    const steps = el('ol', 'bee-steps');
    [
      'Listen to the word.',
      'Ask! You can ask for the meaning, a sentence, the part of speech, the origin, or to hear it again. Asking never gets you out.',
      'You cannot ask to hear the word slowly, or in parts.',
      'Face the judges. Say the word, spell it clearly, then say it again.',
      'You can start over, but you cannot change a letter you already said.',
      'One wrong letter and you are out.',
      'If nobody in a round is right, everyone stays in. If only one speller is right, that speller wins.',
      'Some bees have vocabulary rounds, where you choose what a word means.',
      'The last words can be harder ones from outside the study list. That is why patterns matter.',
    ].forEach((step) => steps.append(el('li', '', step)));
    const hear = button('bee-hear', '🔊 Hear the rules', () => speak([...steps.children].map((li) => li.textContent).join(' '), 0.9));
    hear.id = 'bee-hear';
    body.append(hear, steps, el('p', 'bee-rule', 'Based on the 2027 Suggested Rules for Spelling Bees. Every bee can set its own rules, so check with yours.'));
  }

  /* ---------- start ---------- */
  function startToday() {
    if (window.KlgSounds) KlgSounds.click();
    const run = () => startSession(Core.planSession(store, pool(), today), { daily: true, again: run, title: 'Today' });
    run();
  }

  $('start-btn').addEventListener('click', startToday);
  $('bee-back').addEventListener('click', () => (backAction || goHome)());
  $('bee-mock-btn').addEventListener('click', renderMockIntro);
  $('bee-patterns-btn').addEventListener('click', renderPatterns);
  $('bee-oral-btn').addEventListener('click', renderOralIntro);
  $('bee-words-btn').addEventListener('click', renderMyWords);
  refreshLabel();
});
