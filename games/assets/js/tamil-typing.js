/* Shared free-text activity controller. No multiple-choice answer shortcuts. */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const data = window.TamilSentenceData;
  const mode = document.body.dataset.typingMode;
  const $ = id => document.getElementById(id);
  const input = $('tamil-answer');
  let round = [];
  let position = 0;
  let current;
  let answer = '';
  let solved = false;
  let revealed = false;
  let finished = false;
  let results = [];
  let composing = false;

  function available() {
    return data.sentences.filter(item =>
      ($('sentence-category').value === 'all' || item.category === $('sentence-category').value) &&
      (mode === 'word' || data.letters(item.word).length > 1)
    );
  }

  function updateRoundNote() {
    $('round-note').textContent = `${Math.min(10, available().length)} sentences per round · ${available().length} sentences in this topic`;
  }

  function start() {
    const pool = [...available()];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    round = pool.slice(0, 10);
    position = 0;
    results = [];
    finished = false;
    $('start-screen').hidden = true;
    $('typing-results').hidden = true;
    $('typing-screen').hidden = false;
    $('typing-progress').max = round.length;
    nextQuestion();
  }

  function nextQuestion() {
    if (position === round.length) return finish();
    current = round[position];
    solved = false;
    revealed = false;
    composing = false;
    $('typing-counter').textContent = `Sentence ${position + 1} / ${round.length}`;
    $('typing-progress').value = position;
    $('clue-word').textContent = current.clue;
    $('clue-emoji').textContent = current.emoji;
    $('typing-feedback').textContent = '';
    $('typing-feedback').className = '';
    $('typing-next').hidden = true;
    $('show-answer').disabled = false;
    $('typing-form').reset();
    $('keyboard-preview').textContent = '…';
    input.disabled = false;
    input.removeAttribute('aria-invalid');
    $('check-answer').disabled = false;
    setKeyboardDisabled(false);
    const sentence = $('typing-sentence');
    sentence.replaceChildren(document.createTextNode(current.before));
    const blank = document.createElement('span');
    blank.className = 'sentence-blank';
    blank.textContent = '____';
    if (mode === 'word') {
      answer = current.word;
      blank.setAttribute('aria-label', 'விடுபட்ட சொல்');
      sentence.appendChild(blank);
      $('answer-length').textContent = `${data.letters(answer).length} Tamil letters in the clue word`;
    } else {
      const clusters = data.letters(current.word);
      const blankIndex = Math.floor(Math.random() * clusters.length);
      answer = clusters[blankIndex];
      blank.textContent = '__';
      blank.setAttribute('aria-label', 'விடுபட்ட எழுத்து');
      sentence.append(document.createTextNode(clusters.slice(0, blankIndex).join('')), blank,
        document.createTextNode(clusters.slice(blankIndex + 1).join('')));
      $('answer-length').textContent = 'One Tamil letter · include its vowel sign or pulli';
    }
    sentence.appendChild(document.createTextNode(current.after));
    $('typing-next').textContent = position === round.length - 1 ? 'See my progress →' : 'Next sentence →';
    input.focus({ preventScroll: true });
    $('typing-screen').scrollIntoView({ block: 'start' });
  }

  function setKeyboardDisabled(value) {
    $('tamil-keyboard').querySelectorAll('button').forEach(button => { button.disabled = value; });
  }

  function say(message, kind = '') {
    $('typing-feedback').textContent = message;
    $('typing-feedback').className = kind;
    $('typing-feedback').scrollIntoView({ block: 'center' });
  }

  function check(event) {
    event.preventDefault();
    // Enter used to commit an IME composition must not submit an incomplete word.
    if (composing || solved || finished) return;
    const value = data.normalize(input.value);
    if (!value) {
      say(mode === 'word' ? 'Type a Tamil word first. The keyboard below can help.' : 'Type the missing Tamil letter first.');
      input.focus({ preventScroll: true });
      return;
    }
    const accepted = mode === 'word' ? [answer, ...(current.alternatives || [])] : [answer];
    if (!accepted.some(item => data.normalize(item) === value)) {
      input.setAttribute('aria-invalid', 'true');
      if (mode === 'letters' && value === data.normalize(current.word)) {
        say('You typed the whole word! For this game, type only the missing letter.', 'try-again');
      } else {
        say('Good try! Check the clue and your Tamil letters, then try again. You can also show the answer.', 'try-again');
      }
      input.focus({ preventScroll: true });
      return;
    }
    solved = true;
    input.removeAttribute('aria-invalid');
    input.disabled = true;
    $('check-answer').disabled = true;
    $('show-answer').disabled = true;
    setKeyboardDisabled(true);
    const completedWord = mode === 'word' ? value : current.word;
    const sentence = current.before + completedWord + current.after;
    $('typing-sentence').textContent = sentence;
    say(revealed ? 'நன்று! You practiced the answer. Keep going!' : 'சரியான விடை! You completed the sentence.', 'answer-correct');
    results.push({ sentence, word: completedWord, revealed });
    $('typing-progress').value = position + 1;
    $('typing-next').hidden = false;
    $('typing-next').focus({ preventScroll: true });
    if (window.KlgSounds) KlgSounds.correct();
  }

  function finish() {
    if (finished) return;
    finished = true;
    $('typing-screen').hidden = true;
    $('typing-results').hidden = false;
    const independent = results.filter(item => !item.revealed).length;
    $('typing-result-summary').textContent = `${round.length} sentences completed · ${independent} without showing the answer. Every word is practice!`;
    const reward = window.KlgProgress && KlgProgress.record({
      score: independent, total: round.length, elapsedMs: 0, bestStreak: 0
    });
    $('typing-reward').textContent = reward ? `+${reward.xp} XP · ${reward.stars} of 3 stars earned` : 'Well done!';
    const review = $('typing-review');
    review.replaceChildren();
    results.forEach(item => {
      const li = document.createElement('li');
      const text = document.createElement('p');
      text.className = 'tamil-text';
      text.lang = 'ta';
      text.textContent = item.sentence;
      const note = document.createElement('span');
      note.className = 'small text-muted';
      note.textContent = item.revealed ? 'Practiced with answer help' : 'Completed without showing answer';
      li.append(text, note);
      review.appendChild(li);
    });
    $('typing-results').focus();
  }

  function exit() {
    $('typing-screen').hidden = true;
    $('typing-results').hidden = true;
    $('start-screen').hidden = false;
    finished = true;
    $('start-btn').focus();
  }

  // setRangeText preserves native cursor/selection semantics for mixed input.
  function insert(text) {
    if (input.disabled) return;
    const from = input.selectionStart;
    const to = input.selectionEnd;
    if (input.value.length - (to - from) + text.length > input.maxLength) return;
    input.setRangeText(text, from, to, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus({ preventScroll: true });
  }

  function makeKey(text, action, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tamil-key tamil-text';
    button.lang = 'ta';
    button.textContent = text;
    if (label) button.setAttribute('aria-label', label);
    button.addEventListener('click', action);
    return button;
  }

  function selectConsonant(base) {
    $('consonant-keys').querySelectorAll('button').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.base === base));
    });
    $('form-keys').replaceChildren();
    data.signs.forEach(sign => {
      const letter = base + sign;
      $('form-keys').appendChild(makeKey(letter, () => insert(letter)));
    });
  }

  data.vowels.forEach(letter => $('vowel-keys').appendChild(makeKey(letter, () => insert(letter))));
  data.consonants.forEach(base => {
    const button = makeKey(base + '்', () => selectConsonant(base));
    button.dataset.base = base;
    button.setAttribute('aria-pressed', 'false');
    $('consonant-keys').appendChild(button);
  });
  selectConsonant('க');
  $('keyboard-backspace').addEventListener('click', () => {
    if (input.disabled) return;
    const from = input.selectionStart;
    const to = input.selectionEnd;
    // Delete a whole orthographic letter, even if the caret is inside its marks.
    let offset = 0;
    let removeFrom = from;
    let removeTo = to;
    for (const letter of input.value.match(/[^\p{M}]\p{M}*/gu) || []) {
      const end = offset + letter.length;
      if (from === to && offset < from && end >= from) { removeFrom = offset; removeTo = end; break; }
      offset = end;
    }
    input.setRangeText('', removeFrom, removeTo, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus({ preventScroll: true });
  });
  $('keyboard-clear').addEventListener('click', () => {
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus({ preventScroll: true });
  });
  input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    $('keyboard-preview').textContent = input.value || '…';
  });
  $('keyboard-check').addEventListener('click', () => $('typing-form').requestSubmit());
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.isComposing || event.keyCode === 229)) event.preventDefault();
  });
  $('typing-form').addEventListener('submit', check);
  $('show-answer').addEventListener('click', () => {
    if (solved) return;
    revealed = true;
    say(`Answer: ${answer} · Type it in the box and check to practice.`, 'answer-help');
    input.focus({ preventScroll: true });
  });
  $('typing-next').addEventListener('click', () => { if (solved && !finished) { position++; nextQuestion(); } });
  $('start-btn').addEventListener('click', start);
  $('play-again-btn').addEventListener('click', start);
  $('typing-exit').addEventListener('click', exit);
  $('results-topic').addEventListener('click', exit);
  $('sentence-category').addEventListener('change', updateRoundNote);
  updateRoundNote();
});
