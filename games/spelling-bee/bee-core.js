/*
 * The rules of Spelling Bee training, with no page code, so they can be tested in Node.
 *
 *   Practice is spaced: a word comes back after 1, 3, 7, 14 and 30 days. A right
 *   answer only moves a word on when it is due, so cramming cannot fake mastery.
 *
 *   The mock bee follows the 2027 Suggested Rules for Spelling Bees (Scripps):
 *   rule 7, a miss eliminates at once; rule 8, if nobody in a round is right
 *   everyone stays, a sole correct speller wins at once, and spellers out in the
 *   same round tie; rule 5, changing letters while retracing is a disqualification.
 *   Local bees may differ, which is why a grown-up should check their own rules.
 */
(function (root) {
  'use strict';

  const STORE_KEY = 'klg-bee-v1';
  const SESSION_SIZE = 10;
  const PATTERN_SIZE = 5;
  const MASTERED_BOX = 4;
  const INTERVALS = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };
  const MAX_LIST = 600;
  const MAX_WORD = 30;

  /* ---------- days ---------- */

  function dayNumber(date) {
    const d = date || new Date();
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }

  function dayFromIso(text) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text || ''));
    if (!m) return null;
    const stamp = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isFinite(stamp) ? Math.floor(stamp / 86400000) : null;
  }

  /* ---------- the saved record ---------- */

  function emptyStore() {
    return { words: {}, custom: [], focus: 'list', levelFocus: '', beeDate: '', best: {}, doneDay: 0, wins: 0 };
  }

  /** Anything can be in storage: old, hand-edited or damaged. Keep only what makes sense. */
  function normalizeStore(raw) {
    const store = emptyStore();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return store;
    if (raw.words && typeof raw.words === 'object' && !Array.isArray(raw.words)) {
      Object.keys(raw.words).forEach((word) => {
        const s = raw.words[word];
        if (s && Number.isInteger(s.b) && s.b >= 1 && s.b <= 5 && Number.isFinite(s.due)) {
          store.words[word] = { b: s.b, due: s.due, tries: Number(s.tries) || 0, miss: Number(s.miss) || 0 };
        }
      });
    }
    if (Array.isArray(raw.custom)) {
      store.custom = raw.custom.filter((c) => c && /^[a-z]+$/.test(c.word)).map((c) => ({ word: c.word, def: typeof c.def === 'string' ? c.def : '' }));
    }
    if (['list', 'core', 'stretch', 'champion', 'school'].includes(raw.focus)) store.focus = raw.focus;
    if (['list', 'stretch'].includes(raw.levelFocus)) store.levelFocus = raw.levelFocus;
    if (dayFromIso(raw.beeDate) !== null) store.beeDate = raw.beeDate;
    if (raw.best && typeof raw.best === 'object') {
      ['class', 'school'].forEach((key) => {
        const b = raw.best[key];
        if (b && Number.isInteger(b.place) && Number.isInteger(b.of)) store.best[key] = { place: b.place, of: b.of };
      });
    }
    store.doneDay = Number(raw.doneDay) || 0;
    store.wins = Number(raw.wins) || 0;
    return store;
  }

  /**
   * An age button puts its list in the address, and the address stays there every time the
   * game opens. So it only counts when it changes: a list picked in My words afterwards, or
   * a school's list, must not be undone by reopening the game. Returns true if it applied.
   */
  function applyLevelFocus(store, focus) {
    if (!['list', 'stretch'].includes(focus) || focus === store.levelFocus) return false;
    store.levelFocus = focus;
    store.focus = focus;
    return true;
  }

  /* ---------- spaced practice ---------- */

  function daysLeft(store, today) {
    const bee = dayFromIso(store.beeDate);
    return bee === null ? null : bee - today;
  }

  /** How long until a word returns. With a bee coming, it must return before the bee. */
  function intervalFor(box, left) {
    const usual = INTERVALS[box];
    if (left === null || left === undefined || left <= 0) return usual;
    return Math.min(usual, Math.max(1, Math.ceil(left / 2)));
  }

  function recordResult(store, word, right, today, studied) {
    const left = daysLeft(store, today);
    const state = store.words[word];
    if (!state) {
      // Right the very first time: probably known already, so it waits longer.
      // Not straight after its study card, though: that only shows it was just seen.
      const box = right && !studied ? 2 : 1;
      store.words[word] = { b: box, due: today + intervalFor(box, left), tries: 1, miss: right ? 0 : 1 };
      return store.words[word];
    }
    state.tries += 1;
    if (!right) {
      state.miss += 1;
      state.b = 1;
      state.due = today + 1;
      return state;
    }
    if (state.due > today) return state; // Not due yet: no credit for cramming.
    state.b = Math.min(5, state.b + 1);
    state.due = today + intervalFor(state.b, left);
    return state;
  }

  function stateOf(store, word) {
    const s = store.words[word];
    if (!s) return 'new';
    return s.b >= MASTERED_BOX ? 'mastered' : 'learning';
  }

  /** All practice words: the built-in bank, and any words from the school's list. */
  function allWords(bank, custom) {
    const known = new Map(bank.map((w) => [w.word, w]));
    const extra = (custom || []).filter((c) => !known.has(c.word)).map((c) => ({
      word: c.word, def: c.def || '', pos: '', sentence: '', origin: '', patterns: [], tricky: '', tier: 0,
    }));
    return [...bank, ...extra];
  }

  function shuffled(list, rng) {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /** The words a focus puts first: the third-grade sheet, One, Two or Three Bee, or a school's list. */
  function focusList(store, words) {
    if (store.focus === 'list') return words.filter((w) => w.list);
    const study = { core: 1, stretch: 2, champion: 3 }[store.focus];
    if (study) return words.filter((w) => w.study === study);
    if (store.focus === 'school') {
      const onList = new Set(store.custom.map((c) => c.word));
      return words.filter((w) => onList.has(w.word));
    }
    return null;
  }

  /**
   * The order new words are met in. After the third-grade list the next level is Two Bee,
   * not the easier One Bee words. Within a level, study list words come before our own.
   */
  function newWordOrder(words, store, rng) {
    const tier = (n) => {
      const inTier = shuffled(words.filter((w) => w.tier === n), rng);
      return [...inTier.filter((w) => w.study), ...inTier.filter((w) => !w.study)];
    };
    const orders = {
      list: [2, 3, 1, 0],
      core: [1, 2, 3, 0],
      stretch: [2, 3, 1, 0],
      champion: [3, 2, 1, 0],
      school: [1, 2, 3, 0],
    };
    return [...shuffled(focusList(store, words) || [], rng), ...orders[store.focus].flatMap(tier)];
  }

  /**
   * A practice round: words that are due, most overdue and most missed first, then
   * new words. If nothing is left, the least secure known words, so there is always
   * something to do.
   */
  function planSession(store, words, today, options) {
    const size = (options && options.size) || SESSION_SIZE;
    const rng = (options && options.rng) || Math.random;
    const byWord = new Map(words.map((w) => [w.word, w]));
    const known = Object.keys(store.words).filter((word) => byWord.has(word));
    const due = known.filter((word) => store.words[word].due <= today)
      .sort((a, b) => store.words[a].due - store.words[b].due || store.words[b].miss - store.words[a].miss);
    const plan = due.slice(0, size);
    if (plan.length < size) {
      const seen = new Set(plan);
      newWordOrder(words, store, rng).forEach((w) => {
        if (plan.length < size && !store.words[w.word] && !seen.has(w.word)) {
          plan.push(w.word);
          seen.add(w.word);
        }
      });
      known.filter((word) => !seen.has(word))
        .sort((a, b) => store.words[a].b - store.words[b].b || store.words[a].due - store.words[b].due)
        .forEach((word) => { if (plan.length < size) plan.push(word); });
    }
    return plan.map((word) => byWord.get(word));
  }

  /** A short practice round for one spelling pattern: least secure words first. */
  function planPattern(store, words, patternKey, today, options) {
    const size = (options && options.size) || PATTERN_SIZE;
    const rng = (options && options.rng) || Math.random;
    const rank = (w) => {
      const s = store.words[w.word];
      if (s && s.due <= today) return 0;
      if (!s) return w.list ? 1 : 1 + w.tier / 10;
      return 2 + s.b;
    };
    return shuffled(words.filter((w) => w.patterns.includes(patternKey)), rng)
      .sort((a, b) => rank(a) - rank(b)).slice(0, size);
  }

  function stats(store, words, today) {
    const row = () => ({ total: 0, mastered: 0, learning: 0, fresh: 0 });
    const out = { all: row(), tiers: { 0: row(), 1: row(), 2: row(), 3: row() }, due: 0, tricky: [] };
    words.forEach((w) => {
      const state = stateOf(store, w.word);
      [out.all, out.tiers[w.tier]].forEach((r) => {
        r.total += 1;
        if (state === 'mastered') r.mastered += 1;
        else if (state === 'learning') r.learning += 1;
        else r.fresh += 1;
      });
      const s = store.words[w.word];
      if (s && s.due <= today) out.due += 1;
      if (s && s.miss > 0 && s.b < MASTERED_BOX) out.tricky.push(w);
    });
    out.tricky.sort((a, b) => store.words[b.word].miss - store.words[a.word].miss);
    return out;
  }

  /** What to learn each day to be ready for the bee: every word not yet secure, by the day before. */
  function dailyGoal(store, words, today) {
    const left = daysLeft(store, today);
    if (left === null || left <= 0) return null;
    const listed = focusList(store, words);
    const tier = { core: 1, stretch: 2, champion: 3, school: 1, list: 1 }[store.focus];
    const scope = listed && listed.length ? listed : words.filter((w) => w.tier === tier);
    const fresh = scope.filter((w) => !store.words[w.word]).length;
    return { daysLeft: left, fresh, perDay: fresh ? Math.ceil(fresh / left) : 0, scope: scope.length };
  }

  /* ---------- checking a spelling ---------- */

  /**
   * Lines the typed letters up against the word, so a miss can show exactly which
   * letters went wrong. A plain position check would mark every letter after one
   * missing letter as wrong.
   */
  function compare(typed, word) {
    const a = String(typed).toLowerCase();
    const b = String(word).toLowerCase();
    const dist = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) dist[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dist[i][j] = Math.min(dist[i - 1][j] + 1, dist[i][j - 1] + 1, dist[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    const typedMarks = Array(a.length).fill(false);
    const wordMarks = Array(b.length).fill(false);
    let i = a.length;
    let j = b.length;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1] && dist[i][j] === dist[i - 1][j - 1]) {
        typedMarks[i - 1] = true;
        wordMarks[j - 1] = true;
        i -= 1;
        j -= 1;
      } else if (dist[i][j] === dist[i - 1][j - 1] + 1) {
        i -= 1;
        j -= 1;
      } else if (dist[i][j] === dist[i - 1][j] + 1) {
        i -= 1;
      } else {
        j -= 1;
      }
    }
    return {
      typed: [...a].map((ch, n) => ({ ch, ok: typedMarks[n] })),
      word: [...b].map((ch, n) => ({ ch, ok: wordMarks[n] })),
    };
  }

  /** right: exactly the word. variant: another accepted spelling. homophone: the other word that sounds the same. */
  function judge(entry, typed) {
    const text = String(typed).trim().toLowerCase();
    if (text === entry.word) return { right: true, kind: 'right' };
    if ((entry.also || []).includes(text)) return { right: true, kind: 'variant' };
    if (entry.homo && text === entry.homo) return { right: false, kind: 'homophone' };
    return { right: false, kind: 'wrong' };
  }

  /** What the voice is given. "lead" the metal must be said as "led", and "a cappella" as two words. */
  function spoken(entry) {
    return entry.say || entry.show || entry.word;
  }

  /** On stage and with a grown-up, the meaning a pronouncer reads. In practice, the simpler one. */
  function meaningFor(entry, mode) {
    return mode === 'train' ? entry.def : entry.official || entry.def;
  }

  function display(entry) {
    if (entry.show) return entry.show;
    return entry.cap ? entry.word[0].toUpperCase() + entry.word.slice(1) : entry.word;
  }

  /** The keys have letters only. Says what a speller would do on stage for a hyphen or a space. */
  function stageNote(entry) {
    const shown = display(entry);
    if (shown.includes('-')) return `Here you tap only the letters. On stage, say "hyphen" in the right places: ${shown}.`;
    if (shown.includes(' ')) return `Here you tap only the letters. On stage, pause between the two words: ${shown}.`;
    return '';
  }

  /** The sentence with the word hidden, for reading: it must not give the spelling away. */
  function maskSentence(sentence, word) {
    return String(sentence).replace(new RegExp(`(?<![\\p{L}\\p{M}])${word}(?![\\p{L}\\p{M}])`, 'giu'), '_____');
  }

  /** The word split round its tricky part, for highlighting: [before, tricky, after]. */
  function splitTricky(entry) {
    const shown = display(entry);
    const at = entry.tricky ? shown.toLowerCase().indexOf(entry.tricky) : -1;
    if (at < 0) return [shown, '', ''];
    return [shown.slice(0, at), shown.slice(at, at + entry.tricky.length), shown.slice(at + entry.tricky.length)];
  }

  /* ---------- a grown-up's own word list ---------- */

  /**
   * Accepts the shapes a pasted list comes in: one word per line, numbered or bulleted,
   * "word - meaning" or "word: meaning", and "cat, dog, fish". Only letters can be
   * typed in the game, so anything else is set aside and reported back.
   */
  function parseList(text) {
    const words = [];
    const skipped = [];
    const seen = new Set();
    const clean = (value) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    const add = (raw, def) => {
      const word = clean(raw.trim());
      if (!word) return;
      if (!/^[a-z]+$/.test(word) || word.length > MAX_WORD) {
        skipped.push(raw.trim());
        return;
      }
      if (seen.has(word) || words.length >= MAX_LIST) return;
      seen.add(word);
      words.push({ word, def: (def || '').trim() });
    };
    String(text).split(/[\r\n;]+/).forEach((rawLine) => {
      const line = rawLine.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '').trim();
      if (!line) return;
      const withMeaning = /^([^\s:,–—-]+)\s*(?::|\s[-–—]|,)\s+(.+)$/.exec(line);
      if (line.includes(',') && line.split(',').every((part) => /^\s*\S+\s*$/.test(part))) {
        line.split(',').forEach((part) => add(part));
      } else if (withMeaning) {
        add(withMeaning[1], withMeaning[2]);
      } else if (/\s/.test(line)) {
        skipped.push(line);
      } else {
        add(line);
      }
    });
    return { words, skipped };
  }

  /* ---------- the mock bee ---------- */

  const RIVALS = [
    { emoji: '🦊', name: 'Fox' }, { emoji: '🐼', name: 'Panda' }, { emoji: '🐸', name: 'Frog' },
    { emoji: '🦉', name: 'Owl' }, { emoji: '🐯', name: 'Tiger' }, { emoji: '🐰', name: 'Bunny' },
    { emoji: '🐢', name: 'Turtle' }, { emoji: '🦁', name: 'Lion' }, { emoji: '🐧', name: 'Penguin' },
    { emoji: '🐨', name: 'Koala' }, { emoji: '🦄', name: 'Unicorn' },
  ];

  /**
   * start/step set how often rivals spell correctly, so a bee lasts about as many
   * rounds as a small real one. onList is how many rounds use a pasted school list, and
   * beeList how many use the third-grade list, before harder words. Until studyRounds
   * the words are from the study list for that round's level. After it they can be from
   * outside the list, because real bees end that way.
   */
  const BEES = {
    class: { key: 'class', name: 'Classroom Bee', icon: '🏫', rivals: 7, start: 0.92, step: 0.09, floor: 0.4, tierAt: (r) => (r <= 3 ? 1 : 2), vocab: [], onList: 5, beeList: 5, studyRounds: 6 },
    school: { key: 'school', name: 'School Bee', icon: '🏆', rivals: 11, start: 0.95, step: 0.06, floor: 0.4, tierAt: (r) => (r <= 3 ? 1 : r <= 6 ? 2 : 3), vocab: [3, 6, 9], onList: 7, beeList: 3, studyRounds: 8 },
  };

  function isVocabRound(bee, round) {
    return bee.vocab.includes(round);
  }

  function rivalChance(bee, round) {
    return Math.max(bee.floor, bee.start - bee.step * (round - 1));
  }

  /** The next word: from the school's list while it lasts, then from the tier for this round. */
  function pickMockWord(bee, round, words, used, store, rng) {
    const fresh = words.filter((w) => !used.has(w.word));
    const pick = (list) => list[Math.floor(rng() * list.length)];
    const rounds = store.focus === 'school' ? bee.onList : store.focus === 'list' ? bee.beeList : 0;
    if (round <= rounds) {
      const onList = focusList(store, fresh);
      if (onList.length) return pick(onList);
    }
    const tier = bee.tierAt(round);
    const inTier = fresh.filter((w) => w.tier === tier);
    const onStudyList = round <= bee.studyRounds ? inTier.filter((w) => w.study) : [];
    if (onStudyList.length) return pick(onStudyList);
    if (inTier.length) return pick(inTier);
    return pick(fresh.length ? fresh : words);
  }

  /** A vocabulary round's question: the word's meaning, and one other meaning of the same kind. */
  function vocabQuestion(entry, words, rng) {
    const others = words.filter((w) => w.word !== entry.word && w.pos === entry.pos && w.def && w.def !== entry.def);
    const pool = others.length ? others : words.filter((w) => w.word !== entry.word && w.def && w.def !== entry.def);
    const wrong = pool[Math.floor(rng() * pool.length)];
    const rightFirst = rng() < 0.5;
    const options = rightFirst ? [entry.def, wrong.def] : [wrong.def, entry.def];
    return { word: entry.word, options, answer: rightFirst ? 0 : 1 };
  }

  /**
   * Plays one round for the rivals and applies the end-of-bee rules.
   * Returns who is still in, and one of:
   *   next      the bee goes on
   *   champion  the child alone was right (rule 8)
   *   allstay   nobody was right, so nobody goes out (rule 8)
   *   out       the child missed and someone else was right (rule 7)
   */
  function settleRound(bee, round, rivals, childRight, rng) {
    const chance = rivalChance(bee, round);
    const right = [];
    const wrong = [];
    rivals.forEach((rival) => (rng() < chance ? right : wrong).push(rival));
    if (!childRight && !right.length) return { outcome: 'allstay', right, wrong, alive: rivals };
    if (childRight && !right.length) return { outcome: 'champion', right, wrong, alive: [] };
    if (!childRight) return { outcome: 'out', right, wrong, alive: right, place: right.length + 1, tiedWith: wrong };
    return { outcome: 'next', right, wrong, alive: right };
  }

  function ordinal(n) {
    const tens = n % 100;
    if (tens >= 11 && tens <= 13) return `${n}th`;
    return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
  }

  /** Saves the best finish. A lower place is better, and bigger bees are kept separately. */
  function saveBest(store, beeKey, place, of) {
    const best = store.best[beeKey];
    if (!best || place < best.place) store.best[beeKey] = { place, of };
    if (place === 1) store.wins += 1;
  }

  const api = {
    STORE_KEY, SESSION_SIZE, PATTERN_SIZE, MASTERED_BOX, INTERVALS, RIVALS, BEES,
    spoken, meaningFor, stageNote, dayNumber, dayFromIso, emptyStore, normalizeStore, applyLevelFocus, daysLeft, intervalFor, recordResult, stateOf, allWords,
    planSession, planPattern, stats, dailyGoal, compare, judge, display, maskSentence, splitTricky, parseList,
    isVocabRound, rivalChance, pickMockWord, vocabQuestion, settleRound, ordinal, saveBest,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KlgBeeCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
