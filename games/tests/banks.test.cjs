// Checks the hand-written question banks without a browser: enough questions
// for a round, no repeats, one right answer, and every picture in the bundled font.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const bank = (id) => require(`../games/${id}/questions.js`);
/** A bank must hold at least three rounds' worth. */
const enough = (list, roundLength, name) => assert.ok(list.length >= roundLength * 3, `${name}: ${list.length} is under 3 × ${roundLength}`);
const unique = (list, name) => {
 const seen = new Set();
 for (const item of list) { assert.ok(!seen.has(item), `${name}: repeated "${item}"`); seen.add(item); }
};
const oneRight = (right, wrong, name) => {
 assert.ok(right, `${name}: no right answer`);
 assert.ok(wrong.length >= 2, `${name}: too few wrong answers`);
 unique([right, ...wrong], `${name} choices`);
};

/** Reads the emoji font's character list (cmap format 12), so a missing picture fails here. */
function fontCharacters(file) {
 const b = fs.readFileSync(file);
 const tables = b.readUInt16BE(4);
 for (let i = 0; i < tables; i++) {
  const at = 12 + i * 16;
  if (b.toString('latin1', at, at + 4) !== 'cmap') continue;
  const cmap = b.readUInt32BE(at + 8);
  const subtables = b.readUInt16BE(cmap + 2);
  for (let s = 0; s < subtables; s++) {
   const sub = cmap + b.readUInt32BE(cmap + 4 + s * 8 + 4);
   if (b.readUInt16BE(sub) !== 12) continue;
   const groups = b.readUInt32BE(sub + 12);
   const ranges = [];
   for (let g = 0; g < groups; g++) ranges.push([b.readUInt32BE(sub + 16 + g * 12), b.readUInt32BE(sub + 20 + g * 12)]);
   return (cp) => ranges.some(([lo, hi]) => cp >= lo && cp <= hi);
  }
 }
 throw new Error('no format 12 cmap in ' + file);
}
const inFont = fontCharacters('assets/fonts/NotoColorEmoji.ttf');
const EMOJI = /\p{Extended_Pictographic}/u;
/** Fails on any picture character the bundled font cannot draw. */
function picturesDrawable(values, name) {
 for (const value of values) {
  for (const ch of String(value)) {
   if (EMOJI.test(ch) && ch.codePointAt(0) > 0xff) assert.ok(inFont(ch.codePointAt(0)), `${name}: the emoji font has no ${ch} (U+${ch.codePointAt(0).toString(16)}) in "${value}"`);
  }
 }
}

test('the font check itself works', () => {
 assert.ok(inFont('🐘'.codePointAt(0)));
 assert.ok(!inFont(0x1fffe));
});

test('Story Detectives', () => {
 const { STORIES } = bank('reading-stories');
 enough(STORIES, 8, 'stories');
 unique(STORIES.map((s) => s[0]), 'stories');
 for (const [story, question, right, wrong, why, picture] of STORIES) {
  assert.ok(story && question && why && picture, story);
  assert.equal(wrong.length, 3, story);
  oneRight(right, wrong, story);
 }
 picturesDrawable(STORIES.map((s) => s[5]), 'stories');
});

test('Animal Homes', () => {
 const { HABITATS } = bank('animal-habitats');
 enough(HABITATS, 10, 'habitats');
 unique(HABITATS.map((h) => h[1]), 'animals');
 const places = [...new Set(HABITATS.map((h) => h[2]))];
 const conflicts = { Arctic: ['Antarctica'], Antarctica: ['Arctic'], Ocean: ['Coral reef'], 'Coral reef': ['Ocean'], Forest: ['Rainforest'], Rainforest: ['Forest'] };
 for (const [emoji, animal, home, why, also = []] of HABITATS) {
  assert.ok(emoji && why, animal);
  const wrong = places.filter((p) => p !== home && !(conflicts[home] || []).includes(p) && !also.includes(p));
  assert.ok(wrong.length >= 3, `${animal}: only ${wrong.length} fair wrong places`);
  assert.ok(!also.includes(home), animal);
 }
 picturesDrawable(HABITATS.map((h) => h[0]), 'habitats');
});

test('Feelings Faces', () => {
 const { FEELINGS, MOMENTS } = bank('feelings-faces');
 enough(MOMENTS, 10, 'moments');
 unique(MOMENTS.map((m) => m[0]), 'moments');
 const names = FEELINGS.map((f) => f[1]);
 for (const name of names) assert.ok(MOMENTS.filter((m) => m[1] === name).length >= 5, name + ' needs more moments');
 for (const [text, feeling] of MOMENTS) assert.ok(names.includes(feeling), text);
 picturesDrawable(FEELINGS.map((f) => f[0]), 'feelings');
});

test('What Do We Use?', () => {
 const { TOOLS, QUESTIONS } = bank('everyday-tools');
 enough(QUESTIONS, 10, 'questions');
 unique(QUESTIONS.map((q) => q[0]), 'questions');
 unique(Object.values(TOOLS), 'tool pictures');
 for (const [text, right, ...wrong] of QUESTIONS) {
  oneRight(right, wrong, text);
  for (const tool of [right, ...wrong]) assert.ok(TOOLS[tool], `${text}: no picture for ${tool}`);
 }
 picturesDrawable(Object.values(TOOLS), 'tools');
});

test('Science Quiz', () => {
 const { BANK } = bank('science-quiz');
 const all = Object.values(BANK).flat();
 enough(all, 15, 'all topics');
 unique(all.map((e) => e.q), 'science');
 for (const [topic, list] of Object.entries(BANK)) {
  enough(list, 10, topic);
  for (const e of list) { assert.equal(e.wrong.length, 3, e.q); oneRight(e.a, e.wrong, e.q); }
 }
 picturesDrawable(all.map((e) => e.q), 'science');
});

test('Solar System', () => {
 const { FACTS } = bank('solar-system');
 enough(FACTS, 15, 'facts');
 unique(FACTS.map((e) => e.q), 'facts');
 for (const e of FACTS) { assert.ok(e.wrong.length >= 3, e.q); oneRight(e.a, e.wrong, e.q); }
 picturesDrawable(FACTS.map((e) => e.q), 'facts');
});

test('Baby Animals', () => {
 const { ANIMALS } = bank('baby-animals');
 enough(ANIMALS, 15, 'animals');
 unique(ANIMALS.map((a) => a.animal), 'animals');
 const names = new Set(ANIMALS.map((a) => a.baby));
 for (const a of ANIMALS) assert.ok(a.emoji && a.baby, a.animal);
 assert.ok(names.size >= 8, 'needs enough different baby names for wrong choices');
 picturesDrawable(ANIMALS.map((a) => a.emoji), 'animals');
});

test('Sort It!', () => {
 const { SETS } = bank('sort-it');
 for (const [level, each] of [[1, 3], [2, 2]]) {
  enough(SETS[level], 5, 'level ' + level);
  unique(SETS[level].map((s) => s.title), 'titles');
  for (const s of SETS[level]) {
   const names = [];
   assert.deepEqual(Object.keys(s.items).sort(), s.bins.map((b) => b.id).sort(), s.title);
   for (const b of s.bins) {
    assert.ok(s.items[b.id].length >= each, `${s.title}: ${b.id} needs ${each} pictures`);
    for (const [emoji, name] of s.items[b.id]) { names.push(name); picturesDrawable([emoji], s.title); }
    picturesDrawable([b.icon], s.title);
   }
   unique(names, s.title + ': a picture in two groups');
  }
 }
});

test('Sentence Builder', () => {
 const { SHORT, LONG } = bank('sentence-builder');
 for (const [list, min, max] of [[SHORT, 3, 5], [LONG, 5, 7]]) {
  enough(list, 6, 'sentences');
  unique(list.map((r) => r[1]), 'sentences');
  for (const [emoji, s] of list) {
   const words = s.split(' ').length;
   assert.ok(words >= min && words <= max, `${s}: ${words} words`);
   assert.match(s, /^[A-Z].*\.$/, s);
   picturesDrawable([emoji], s);
  }
 }
});

test('Story Order', () => {
 const { STORIES } = bank('story-order');
 enough(STORIES, 6, 'stories');
 unique(STORIES.map((s) => s.name), 'stories');
 for (const s of STORIES) {
  assert.ok(s.steps.length >= 4 && s.steps.length <= 5, s.name);
  unique(s.steps.map((x) => x[1]), s.name);
  unique(s.steps.map((x) => x[0]), s.name + ' pictures');
  picturesDrawable(s.steps.map((x) => x[0]), s.name);
 }
});

test('Word Families all have pictures', () => {
 const { FAMILIES, FIRST_FAMILIES } = bank('word-families');
 const context = { window: {} };
 vm.runInNewContext(fs.readFileSync('assets/js/word-pictures.js', 'utf8'), context);
 const P = context.window.KlgWordPics;
 assert.ok(Object.keys(FAMILIES).length >= 18);
 assert.ok(FIRST_FAMILIES.every((k) => FAMILIES[k]));
 const seen = [];
 for (const [family, words] of Object.entries(FAMILIES)) {
  assert.ok(words.length >= 3, family);
  for (const w of words) { assert.ok(P.has(w), `${w} has no picture`); assert.ok(w.endsWith(family), `${w} in -${family}`); seen.push(w); }
 }
 unique(seen, 'family words');
 picturesDrawable(Object.values(P.PICS), 'word pictures');
});

test('Spelling Bee words and generated wrong spellings', () => {
 const { WORD_LEVELS } = bank('spelling-bee');
 const all = Object.values(WORD_LEVELS).flat();
 unique(all.map((w) => w.word), 'words');
 for (const list of Object.values(WORD_LEVELS)) enough(list, 15, 'level');
 for (const w of all) assert.ok(w.emoji && w.clue && !w.clue.includes(w.word), w.word + ': a clue must not give the spelling');
 picturesDrawable(all.map((w) => w.emoji), 'spelling');
 const context = { window: { KlgQuestions: { WORD_LEVELS } }, document: { addEventListener() {} }, console, location: { search: '' } };
 vm.runInNewContext(fs.readFileSync('games/spelling-bee/game.js', 'utf8') + ';window.pick=pickWrongSpellings;', context);
 for (const w of all) {
  const wrong = [...context.window.pick(w.word)];
  assert.equal(wrong.length, 3, w.word);
  unique([w.word, ...wrong], w.word);
 }
});

test('the harder levels are big enough, and fair', () => {
 const f = bank('feelings-faces');
 enough(f.MOMENTS_2, 10, 'feelings');
 unique(f.MOMENTS_2.map((m) => m[0]), 'feelings');
 const names = f.FEELINGS_2.map((x) => x[1]);
 for (const [story, feeling] of f.MOMENTS_2) {
  assert.ok(names.includes(feeling), story);
  assert.ok(!story.toLowerCase().includes(feeling), `${story} gives away the answer`);
 }
 picturesDrawable(f.FEELINGS_2.map((x) => x[0]), 'feelings');

 const t = bank('everyday-tools');
 enough(t.QUESTIONS_2, 10, 'tools');
 unique(t.QUESTIONS_2.map((q) => q[0]), 'tools');
 for (const [prompt, ...keys] of t.QUESTIONS_2) {
  assert.equal(new Set(keys).size, 4, prompt);
  for (const key of keys) assert.ok(t.TOOLS[key], `${prompt}: no picture for ${key}`);
 }
 picturesDrawable(Object.values(t.TOOLS), 'tools');

 const h = bank('animal-habitats');
 enough(h.HABITATS_2, 10, 'habitats');
 unique(h.HABITATS_2.map((r) => r[1]), 'habitats');
 const places = new Set(h.HABITATS.map((r) => r[2]));
 assert.deepEqual([...new Set(h.HABITATS_2.map((r) => r[2]))].sort(), [...places].sort(), 'every home appears');
 for (const [, animal, home, why, fair = []] of h.HABITATS_2) {
  assert.ok(places.has(home) && why, animal);
  assert.ok(!fair.includes(home), animal);
 }
 picturesDrawable(h.HABITATS_2.map((r) => r[0]), 'habitats');

 const r = bank('reading-stories');
 enough(r.STORIES_2, 8, 'stories');
 unique(r.STORIES_2.map((x) => x[0]), 'stories');
 for (const [story, question, right, wrong, why, pic] of r.STORIES_2) {
  assert.ok(question && why && pic, story);
  assert.equal(new Set([right, ...wrong]).size, 4, story);
  assert.ok(story.split(/[.!?]\s/).length >= 3, `${story} is not a longer story`);
 }
 picturesDrawable(r.STORIES_2.map((x) => x[5]), 'stories');

 const s = bank('stay-safe');
 enough(s.SITUATIONS_2, 8, 'safety');
 unique(s.SITUATIONS_2.map((x) => x[1]), 'safety');
 for (const [, story, safe, unsafe, why] of s.SITUATIONS_2) {
  assert.equal(unsafe.length, 2, story);
  assert.ok(!unsafe.includes(safe) && why, story);
 }
 picturesDrawable(s.SITUATIONS_2.map((x) => x[0]), 'safety');

 const w = bank('who-am-i');
 enough(w.RIDDLES_2, 8, 'riddles');
 unique(w.RIDDLES_2.map((x) => x[0][1]), 'riddles');
 for (const [answer, clues, others] of w.RIDDLES_2) {
  assert.equal(clues.length, 3, answer[1]);
  assert.equal(others.length, 3, answer[1]);
  assert.ok(!others.some((o) => o[1] === answer[1]), answer[1]);
  for (const clue of clues) assert.ok(!clue.toLowerCase().includes(answer[1].toLowerCase()), `${answer[1]}: ${clue}`);
  picturesDrawable([answer[0], ...others.map((o) => o[0])], 'riddles');
 }

 const p = bank('punctuation-pals');
 unique(p.SENTENCES_2.map((x) => x[0]), 'punctuation');
 for (const mark of ['.', '?', '!']) enough(p.SENTENCES_2.filter((x) => x[1] === mark), 8 / 3, 'punctuation ' + mark);

 const q = bank('science-quiz');
 const easy = Object.keys(q.BANK).flatMap((topic) => q.EASY[topic].map((i) => q.BANK[topic][i]));
 assert.ok(easy.every(Boolean), 'an easy question is missing');
 enough(easy, 15, 'easy science');
 unique(easy.map((x) => x.q), 'easy science');

 const pw = fs.readFileSync('games/picture-words/game.js', 'utf8');
 const words = pw.slice(pw.indexOf('PICTURE_WORDS_2 = ['), pw.indexOf('const WORD_LIST'));
 const rows = [...words.matchAll(/\['([^']+)','([^']+)','([^']+)'\]/g)];
 enough(rows, 10, 'picture words');
 unique(rows.map((m) => m[2]), 'picture words');
 for (const group of new Set(rows.map((m) => m[3]))) assert.ok(rows.filter((m) => m[3] === group).length >= 4, group);
 picturesDrawable(rows.map((m) => m[1]), 'picture words');
});

test('the shorter Tamil levels still have enough to play, with no new Tamil', () => {
 const context = { window: {} };
 vm.runInNewContext(fs.readFileSync('assets/js/tamil-sentences-data.js', 'utf8'), context);
 const T = context.window.TamilSentenceData;
 const full = (s) => (s.before + s.word + s.after).trim();
 enough(T.sentences.filter((s) => T.letters(s.word).length <= 3), 10, 'short answer words');
 enough(T.sentences.filter((s) => T.letters(s.word).length > 1 && T.letters(s.word).length <= 3), 10, 'short missing letters');
 enough(T.sentences.filter((s) => full(s).split(/\s+/).length === 3), 8, 'three-word sentences');
});

test('World Capitals', () => {
 const { COUNTRIES } = bank('world-capitals');
 enough(COUNTRIES, 15, 'countries');
 unique(COUNTRIES.map((c) => c.country), 'countries');
 unique(COUNTRIES.map((c) => c.capital), 'capitals');
 unique(COUNTRIES.map((c) => c.flag), 'flags');
 for (const c of COUNTRIES) {
  assert.ok(['asia', 'europe', 'africa', 'americas', 'oceania'].includes(c.region), c.country);
  assert.notEqual(c.trap, c.capital, c.country);
  assert.equal([...c.flag].length, 2, c.country + ' flag');
  for (const ch of c.flag) assert.ok(inFont(ch.codePointAt(0)), c.country);
 }
});

test('Map Explorer', () => {
 const { HOMES } = bank('map-explorer');
 enough(HOMES, 8, 'homes');
 assert.ok(HOMES.length >= 30);
 unique(HOMES.map((h) => h[1]), 'homes');
 for (const [, name, home] of HOMES) assert.ok(['north-america', 'south-america', 'europe', 'africa', 'asia', 'oceania', 'antarctica'].includes(home), name);
 picturesDrawable(HOMES.map((h) => h[0]), 'map');
});

test('Spelling Bee never offers these words as a wrong spelling', () => {
 const { WORD_LEVELS } = bank('spelling-bee');
 const context = { window: { KlgQuestions: { WORD_LEVELS } }, document: { addEventListener() {} }, console, location: { search: '' } };
 vm.runInNewContext(fs.readFileSync('games/spelling-bee/game.js', 'utf8') + ';window.pick=pickWrongSpellings;', context);
 const banned = new Set(['cock', 'pin', 'amp', 'rote', 'chip', 'act', 'coop']);
 for (let round = 0; round < 40; round++) {
  for (const word of ['sock', 'pen', 'wrote', 'ship', 'cat', 'cup']) {
   for (const wrong of context.window.pick(word)) assert.ok(!banned.has(wrong), `${word} offered ${wrong}`);
  }
 }
});

test('Tamil Story Time', () => {
 const { STORIES } = bank('tamil-story-time');
 enough(STORIES, 4, 'stories');
 unique(STORIES.map((s) => s.title), 'stories');
 for (const s of STORIES) {
  assert.equal(s.panels.length, 4, s.title);
  for (const [emoji, tamil, english] of s.panels) { assert.match(tamil, /[஀-௿]/u, s.title); assert.ok(english, s.title); picturesDrawable([emoji], s.title); }
  assert.equal(s.others.length, 3, s.title);
  unique([s.answer, ...s.others].map((x) => x[1]), s.title);
  picturesDrawable([s.answer, ...s.others].map((x) => x[0]), s.title);
  const text = s.panels.map((p) => p[1]).join(' ');
  assert.ok(text.includes(s.answer[1].slice(0, 2)), `${s.title}: the answer must be in the story`);
 }
});

test('Tamil sentence bank: pictures and three rounds of ten', () => {
 const { sentences } = require('../assets/js/tamil-sentences-data.js');
 enough(sentences, 10, 'sentences');
 picturesDrawable(sentences.map((s) => s.emoji), 'sentences');
});

test('new Tamil sentence targets all have a human recording', () => {
 const context = { window: {} };
 vm.runInNewContext(fs.readFileSync('assets/js/tamil-audio-manifest.js', 'utf8'), context);
 const { sentences } = require('../assets/js/tamil-sentences-data.js');
 const missing = sentences.filter((s) => !context.window.KLG_TAMIL_AUDIO[s.word]).map((s) => s.word);
 assert.deepEqual(missing, []);
});

test('Odd One Out', () => {
 const { SETS } = bank('odd-one-out');
 for (const list of Object.values(SETS)) {
  enough(list, 5, 'sets');
  unique(list.map((r) => r[3][1] + r[0][1]), 'sets');
  for (const [a, b, c, odd, why] of list) {
   assert.ok(why, odd[1]);
   unique([a, b, c, odd].map((p) => p[1]), odd[1]);
   unique([a, b, c, odd].map((p) => p[0]), odd[1] + ' pictures');
   picturesDrawable([a, b, c, odd].map((p) => p[0]), odd[1]);
  }
 }
});

test('Who Am I?', () => {
 const { RIDDLES } = bank('who-am-i');
 enough(RIDDLES, 8, 'riddles');
 unique(RIDDLES.map((r) => r[0][1]), 'riddles');
 for (const [answer, clues, others] of RIDDLES) {
  assert.equal(clues.length, 3, answer[1]);
  assert.equal(others.length, 3, answer[1]);
  unique([answer, ...others].map((o) => o[1]), answer[1]);
  picturesDrawable([answer, ...others].map((o) => o[0]), answer[1]);
  for (const clue of clues) assert.ok(!clue.toLowerCase().includes(answer[1].toLowerCase()), `${answer[1]}: a clue gives it away: ${clue}`);
 }
});

test('Word Detective', () => {
 const { WORDS } = bank('word-detective');
 unique(Object.values(WORDS).flat(), 'a word in two groups');
 for (const list of Object.values(WORDS)) assert.ok(list.length >= 18, 'three rounds of six');
});

test('Punctuation Pals', () => {
 const { SENTENCES } = bank('punctuation-pals');
 enough(SENTENCES, 8, 'sentences');
 unique(SENTENCES.map((r) => r[0]), 'sentences');
 for (const mark of ['.', '?', '!']) assert.ok(SENTENCES.filter((r) => r[1] === mark).length >= 8, mark);
 for (const [s, mark, why] of SENTENCES) {
  assert.match(s, /^[A-Z]/, s);
  assert.doesNotMatch(s, /[.?!]$/, s + ' must not show its answer');
  assert.ok(['.', '?', '!'].includes(mark) && why, s);
 }
});

test('Stay Safe & Healthy', () => {
 const { SITUATIONS } = bank('stay-safe');
 enough(SITUATIONS, 8, 'situations');
 unique(SITUATIONS.map((r) => r[1]), 'situations');
 for (const [emoji, story, safe, unsafe, why] of SITUATIONS) {
  assert.ok(story && why, story);
  assert.equal(unsafe.length, 2, story);
  oneRight(safe, unsafe, story);
  picturesDrawable([emoji], story);
 }
});

test('Tamil word order has enough sentences of three words or more', () => {
 const { sentences } = require('../assets/js/tamil-sentences-data.js');
 const usable = sentences.filter((s) => (s.before + s.word + s.after).trim().split(/\s+/).length >= 3);
 enough(usable, 8, 'usable sentences');
});
