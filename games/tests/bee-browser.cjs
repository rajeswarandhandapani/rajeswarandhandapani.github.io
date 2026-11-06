// Spelling Bee training in a real browser. The tests "listen" to find out each word,
// as a child would, by reading what the page asked the voice to say.
// Server must be running: npm start, then
//   npm run test:bee
//   ONLY=mock npm run test:bee       sections whose name contains "mock"
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { WORDS, PATTERNS } = require('../games/spelling-bee/bee-words.js');
const Core = require('../games/spelling-bee/bee-core.js');

const base = process.env.BASE_URL || 'http://localhost:4173';
const only = process.env.ONLY;
const URL_BEE = `${base}/games/spelling-bee/index.html`;
const KEY = 'klg-bee-v1';
const byWord = new Map(WORDS.map((w) => [w.word, w]));

// Real phones lose height to the browser's own bars, so these include short ones.
const SIZES = [[320, 568], [375, 553], [390, 664], [390, 844], [810, 1080], [1080, 810], [1366, 900]];

const sections = [];
const section = (name, fn) => sections.push([name, fn]);

/** Records what is said, and pretends a voice is installed unless told otherwise. */
const speechStub = (voices) => {
 window.__said = [];
 window.__rates = [];
 window.speechSynthesis.speak = (u) => { window.__said.push(u.text); window.__rates.push(u.rate); };
 window.speechSynthesis.cancel = () => {};
 window.speechSynthesis.getVoices = () => (voices ? [{ name: 'test' }] : []);
};

/** Makes every rival right (0) or wrong (0.999), by fixing the page's random numbers. */
const fixRandom = (page, value) => page.evaluate((v) => { Math.random = () => v; }, value);

const lastSaid = (page) => page.evaluate(() => window.__said[window.__said.length - 1]);

/** The voice can be told something other than the letters to type ("led" for lead the metal, "self-sufficient"). */
const spokenAs = (word) => Core.spoken(byWord.get(word) || { word });
const heardAs = new Map(WORDS.map((w) => [Core.spoken(w), w.word]));

/** Listens to the word, the way a child would, after its study card if it is a new word. */
async function hearWord(page) {
 const ready = page.locator('#bee-study-go');
 if (await ready.count()) await ready.click();
 await page.locator('#bee-hear').click();
 const said = await lastSaid(page);
 return heardAs.get(said) || said;
}
async function tap(page, letters) {
 for (const ch of letters) await page.locator(`.bee-key[data-letter="${ch}"]`).click();
}
async function spell(page, letters) {
 await tap(page, letters);
 await page.locator('#bee-done').click();
}
const readStore = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const wrongSpelling = (word) => (word.endsWith('z') ? `${word}q` : `${word}z`);

/** True when the element is fully on screen and nothing is drawn over its middle. */
const inView = (selector) => {
 const el = document.querySelector(selector);
 if (!el) return { ok: false, why: 'missing' };
 const r = el.getBoundingClientRect();
 if (r.top < -1 || r.left < -1 || r.bottom > innerHeight + 1 || r.right > innerWidth + 1) return { ok: false, why: `off screen: top ${Math.round(r.top)} bottom ${Math.round(r.bottom)} of ${innerHeight}` };
 const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
 if (!hit || !(hit === el || el.contains(hit) || hit.contains(el))) return { ok: false, why: `covered by ${hit ? hit.id || hit.className || hit.tagName : 'nothing'}` };
 return { ok: true };
};
/** Stricter than inView: no part of it may sit behind the keys that stay at the bottom of short screens. */
const clearOfKeys = (selector) => {
 const entry = document.getElementById('bee-entry').getBoundingClientRect();
 return [...document.querySelectorAll(selector)].map((e) => ({ name: e.getAttribute('aria-label') || e.id, top: e.getBoundingClientRect().top, bottom: e.getBoundingClientRect().bottom }))
  .filter((r) => r.bottom > entry.top + 1 || r.top < -1).map((r) => `${r.name} spans ${Math.round(r.top)}-${Math.round(r.bottom)}, keys start at ${Math.round(entry.top)}`);
};
const tooSmall = () => [...document.querySelectorAll('a,button,select,input,textarea,summary')]
 .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.classList.contains('skip-link') && (r.width < 44 || r.height < 44); })
 .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} "${(e.textContent || '').trim().slice(0, 14)}" ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);

section('the page opens on training, and the older quiz keeps its own address', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await page.goto(URL_BEE);
 assert.equal(await page.locator('#start-btn').textContent(), '▶ Play');
 assert.match(await page.locator('#mode-label').textContent(), /Today: 10 words/);
 for (const id of ['bee-mock-btn', 'bee-patterns-btn', 'bee-oral-btn', 'bee-words-btn']) assert.ok(await page.locator(`#${id}`).isVisible(), id);
 assert.equal(await page.locator('.quiz-settings').count(), 0, 'no quiz controls here');
 await page.locator('.kid-more summary').click();
 assert.ok(await page.locator('#mode-links a').first().isVisible(), 'the pick-the-spelling levels are one tap away');
 await page.locator('#mode-links a[href="?level=2"]').click();
 await page.waitForURL(/level=2/);
 assert.equal(await page.locator('#bee-modes').count(), 0);
 assert.match(await page.locator('#mode-label').textContent(), /Level 2/);
 await page.locator('#start-btn').click();
 await page.locator('.quiz-choice-btn').first().waitFor();
 assert.equal(await page.locator('.quiz-choice-btn').count(), 4);
 await page.goto(`${URL_BEE}?level=2`);
 await page.locator('.kid-level[data-band="3"]').click();
 await page.waitForURL(/focus=list/);
 assert.ok(await page.locator('#bee-modes').isVisible(), 'and back to training');
 await page.locator('.kid-level[data-band="4"]').click();
 await page.waitForURL(/focus=stretch/);
 await page.locator('#start-btn').click();
 assert.equal(byWord.get(await hearWord(page)).tier, 2, 'the 9+ level starts on the harder words');
 await close();
});

section('both modes have one of each id, and the older quiz still plays through', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 const duplicates = () => page.evaluate(() => { const ids = [...document.querySelectorAll('[id]')].map((e) => e.id); return ids.filter((id, i) => ids.indexOf(id) !== i); });
 await page.goto(URL_BEE);
 assert.deepEqual(await duplicates(), []);
 await page.goto(`${URL_BEE}?level=1`);
 assert.deepEqual(await duplicates(), []);
 await page.locator('#start-btn').click();
 const total = Number(await page.locator('#total-questions').textContent());
 for (let i = 0; i < total; i++) {
  await page.locator('.quiz-choice-btn:not([disabled])').first().click();
  await page.locator('.quiz-next').click();
 }
 assert.ok(await page.locator('#results-screen').isVisible());
 await page.locator('#play-again-btn').click();
 assert.equal(await page.locator('#question-number').textContent(), '1', 'Play Again works');
 await close();
});

section('a new word is studied first, a returning word is not', async ({ newPage, fail, assert }) => {
 for (const [w, h] of SIZES) {
  const { page, close } = await newPage(w, h);
  await page.goto(URL_BEE);
  await page.locator('#start-btn').click();
  const seen = await page.evaluate(inView, '#bee-study-go');
  if (!seen.ok) fail(`study card at ${w}x${h}: ready button ${seen.why}`);
  for (const small of await page.evaluate(tooSmall)) fail(`study card at ${w}x${h}: ${small}`);
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) fail(`study card at ${w}x${h}: sideways scroll`);
  await close();
 }
 const { page, close } = await newPage(390, 844);
 await page.goto(URL_BEE);
 await page.locator('#start-btn').click();
 const shown = (await page.locator('#bee-body .bee-word').textContent()).toLowerCase();
 assert.ok(byWord.has(shown), `${shown} is shown before it is spelled`);
 assert.ok((await lastSaid(page)).startsWith(spokenAs(shown)), 'and is said');
 assert.equal(await page.locator('.bee-key').count(), 0, 'no keys until the child is ready');
 assert.equal(((await readStore(page)) || { words: {} }).words[shown], undefined, 'studying alone is not a result');
 await page.locator('#bee-study-go').click();
 assert.equal(await page.locator('#bee-body .bee-word').count(), 0, 'the word is covered for spelling');
 assert.ok(await page.locator('.bee-key').first().isVisible());
 await spell(page, shown);
 assert.equal((await readStore(page)).words[shown].b, 1);
 await page.evaluate(([k, word]) => {
  const s = JSON.parse(localStorage.getItem(k));
  s.words = { [word]: { b: 2, due: 0, tries: 1, miss: 0 } };
  localStorage.setItem(k, JSON.stringify(s));
 }, [KEY, shown]);
 await page.goto(URL_BEE);
 await page.locator('#start-btn').click();
 assert.equal(await page.locator('#bee-study-go').count(), 0, 'a word that is due comes back with no study card');
 assert.ok(await page.locator('.bee-key').first().isVisible());
 await close();
});

section('every word on a list can be read, and reading changes no record', async ({ newPage, fail, assert }) => {
 for (const [w, h] of SIZES) {
  const { page, close } = await newPage(w, h);
  await page.goto(URL_BEE);
  await page.locator('#bee-words-btn').click();
  await page.locator('#bee-read-words').click();
  for (const small of await page.evaluate(tooSmall)) fail(`word list at ${w}x${h}: ${small}`);
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) fail(`word list at ${w}x${h}: sideways scroll`);
  await close();
 }
 const { page, close } = await newPage(390, 844);
 await page.goto(URL_BEE);
 await page.locator('#bee-words-btn').click();
 await page.locator('#bee-read-words').click();
 assert.equal(await page.locator('.bee-wordrow').count(), WORDS.filter((w) => w.list).length, 'the third grade list first');
 assert.equal(await page.locator('.bee-list-tabs [aria-pressed=true]').getAttribute('data-list'), 'list');
 await page.locator('.bee-list-tabs [data-list="champion"]').click();
 assert.equal(await page.locator('.bee-wordrow').count(), WORDS.filter((w) => w.study === 3).length);
 const row = page.locator('.bee-wordrow').nth(20);
 await row.scrollIntoViewIfNeeded();
 const word = await row.getAttribute('data-word');
 const listScroll = await page.evaluate(() => scrollY);
 await row.click();
 assert.equal((await page.locator('#bee-body .bee-word').textContent()).toLowerCase(), Core.display(byWord.get(word)).toLowerCase());
 assert.equal(await lastSaid(page), spokenAs(word));
 await page.locator('#bee-word-next').click();
 assert.equal(await lastSaid(page), spokenAs(WORDS.filter((w) => w.study === 3)[21].word), 'Next word moves down the list');
 await page.locator('#bee-back').click();
 assert.equal(await page.locator('.bee-list-tabs [aria-pressed=true]').getAttribute('data-list'), 'champion', 'Back returns to the same list');
 assert.equal(await page.evaluate(() => scrollY), listScroll, 'at the same place');
 await page.locator('#bee-back').click();
 assert.ok(await page.locator('#bee-read-words').isVisible(), 'and then to My words');
 const store = await readStore(page);
 assert.deepEqual(store ? store.words : {}, {}, 'reading is not practice');
 await close();
});

section('a right answer: the word is scheduled, and the way on is in view', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await page.goto(URL_BEE);
 await page.locator('#start-btn').click();
 const said = await lastSaid(page);
 const word = await hearWord(page);
 assert.ok(byWord.has(word), `${word} is a bank word`);
 assert.ok(said.startsWith(spokenAs(word)), 'the word is said as soon as it appears');
 assert.equal(await page.locator('#bee-progress').textContent(), '1 / 10');
 await spell(page, word);
 assert.match(await page.locator('.bee-right').textContent(), /Right/);
 assert.equal((await page.evaluate(inView, '#bee-next')).ok, true);
 assert.equal(await page.locator('#bee-entry').isVisible(), false, 'the keys go away');
 const saved = (await readStore(page)).words[word];
 assert.equal(saved.b, 1, 'right straight after its study card only shows it was just seen');
 assert.equal(saved.due, Core.dayNumber() + 1);
 assert.equal(await page.locator('#bee-pill').textContent(), '⭐ 1');
 await page.locator('#bee-next').click();
 assert.equal(await page.locator('#bee-progress').textContent(), '2 / 10');
 assert.equal(await page.evaluate(() => scrollY), 0, 'the next word starts at the top');
 await close();
});

section('a wrong answer: see it, cover it, spell it, and it comes back', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await page.goto(URL_BEE);
 await page.locator('#start-btn').click();
 const word = await hearWord(page);
 await spell(page, wrongSpelling(word));
 assert.match(await page.locator('.bee-wrong').textContent(), /Not quite/);
 assert.equal(await page.locator('#bee-feedback .bee-tile.bad').count(), 1, 'only the wrong letter is marked');
 const entry = byWord.get(word);
 assert.equal((await page.locator('#bee-feedback .bee-word').textContent()).toLowerCase(), word);
 assert.equal(await page.locator('#bee-feedback .bee-word mark').textContent(), Core.splitTricky(entry)[1]);
 assert.match(await page.locator('.bee-tips').textContent(), new RegExp(PATTERNS[entry.patterns[0]].name));
 assert.equal((await readStore(page)).words[word].b, 1);
 assert.equal((await readStore(page)).words[word].due, Core.dayNumber() + 1, 'back tomorrow');
 assert.equal((await page.evaluate(inView, '#bee-cover')).ok, true);
 await page.locator('#bee-cover').click();
 assert.equal(await page.locator('#bee-feedback .bee-word').count(), 0, 'covered: the word is gone');
 assert.ok(await page.locator('.bee-key').first().isVisible());
 await spell(page, word);
 assert.match(await page.locator('.bee-right').textContent(), /fixed/);
 assert.equal(await page.locator('#bee-pill').textContent(), '⭐ 0', 'a fix earns no first-try star');
 assert.equal((await readStore(page)).words[word].b, 1, 'and does not move the word on');
 await page.locator('#bee-next').click();
 assert.equal(await page.locator('#bee-progress').textContent(), '2 / 11', 'the word returns at the end of the round');
 await close();
});

section('after two more misses, it moves on instead of trapping the child', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await page.goto(URL_BEE);
 await page.locator('#start-btn').click();
 const word = await hearWord(page);
 const bad = wrongSpelling(word);
 await spell(page, bad);
 await page.locator('#bee-cover').click();
 await spell(page, bad);
 await page.locator('#bee-cover').click();
 await spell(page, bad);
 assert.equal(await page.locator('#bee-cover').count(), 0);
 assert.ok(await page.locator('#bee-next').isVisible());
 await close();
});

section('finishing a round banks it, and today is marked done', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await page.goto(URL_BEE);
 await page.locator('#start-btn').click();
 const first = await hearWord(page);
 await spell(page, wrongSpelling(first));
 await page.locator('#bee-cover').click();
 await spell(page, first);
 await page.locator('#bee-next').click();
 for (let i = 1; i < 10; i++) {
  await spell(page, await hearWord(page));
  await page.locator('#bee-next').click();
 }
 // The missed word comes round once more.
 assert.equal(await hearWord(page), first);
 await spell(page, first);
 assert.match(await page.locator('.bee-right').textContent(), /this time/);
 assert.equal(await page.locator('#bee-next').textContent(), 'See how I did ▶');
 await page.locator('#bee-next').click();
 assert.ok(await page.locator('#finish-screen').isVisible());
 assert.equal(await page.locator('.tg-finish-score').textContent(), '9 / 10');
 assert.match(await page.locator('.tg-finish-note').textContent(), /9 of 10 right first time/);
 assert.equal(await page.locator('.bee-recap-row').count(), 1, 'the missed word is listed');
 assert.ok((await page.locator('#bee-recap .bee-word').textContent()).toLowerCase() === first);
 assert.equal(await page.locator('.kid-finish-home').count(), 1);
 const progress = await page.evaluate(() => KlgProgress.gameStats('spelling-bee'));
 assert.equal(progress.plays, 1);
 assert.equal(progress.byMode.training.plays, 1);
 assert.equal((await readStore(page)).doneDay, Core.dayNumber());
 await page.locator('#play-again-btn').click();
 assert.equal(await page.locator('#bee-progress').textContent(), '1 / 10');
 await page.goto(URL_BEE);
 assert.match(await page.locator('#mode-label').textContent(), /Today's words done/);
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
 await close();
});

section('the clues answer what a real speller may ask, and never show the word', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await page.goto(URL_BEE);
 await page.locator('#start-btn').click();
 const word = await hearWord(page);
 const w = byWord.get(word);
 const clue = (kind) => page.locator(`.bee-clue[data-clue="${kind}"]`).click();
 const text = () => page.locator('#bee-clue-text').textContent();
 await clue('meaning');
 assert.equal(await text(), `Meaning: ${w.def}.`);
 assert.equal(await lastSaid(page), w.def);
 await clue('sentence');
 assert.equal(await lastSaid(page), w.sentence, 'the voice says the whole sentence');
 assert.ok(!new RegExp(`\\b${word}\\b`, 'i').test(await text()), 'the written sentence hides the word');
 assert.match(await text(), /_____/);
 await clue('pos');
 assert.match((await text()).toLowerCase(), new RegExp(`^${w.pos}`));
 await clue('origin');
 assert.match(await text(), new RegExp(`^From ${w.origin}\\.`));
 await clue('slow');
 assert.equal(await lastSaid(page), spokenAs(word));
 assert.equal(await page.evaluate(() => window.__rates[window.__rates.length - 1]), 0.5);
 assert.equal(await page.locator('#bee-entry input, #bee-entry textarea').count(), 0, 'no text box, so a phone keyboard cannot autocorrect');
 await close();
});

section('a sound-alike is always defined, as the rules require', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await page.goto(URL_BEE);
 // Make "knight" due, so it is the first word.
 await page.evaluate(([k, day]) => localStorage.setItem(k, JSON.stringify({ words: { knight: { b: 1, due: day, tries: 1, miss: 1 } } })), [KEY, Core.dayNumber() - 1]);
 await page.reload();
 await page.locator('#start-btn').click();
 const k = byWord.get('knight');
 assert.equal(await lastSaid(page), `knight. ${k.def}`);
 assert.equal(await page.locator('#bee-clue-text').textContent(), `Meaning: ${k.def}.`);
 await spell(page, 'night');
 assert.match(await page.locator('.bee-wrong').textContent(), /real word/);
 await close();
});

section('the first words come from the bee list, and "lead" always gets its meaning', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await page.goto(URL_BEE);
 await page.locator('#start-btn').click();
 for (let i = 0; i < 10; i++) {
  const word = await hearWord(page);
  assert.ok(byWord.get(word).list, `${word} is on the list`);
  await spell(page, word);
  await page.locator('#bee-next').click();
 }
 await page.goto(URL_BEE);
 await page.evaluate(([k, day]) => localStorage.setItem(k, JSON.stringify({ words: { lead: { b: 1, due: day, tries: 1, miss: 0 } } })), [KEY, Core.dayNumber() - 1]);
 await page.reload();
 await page.locator('#start-btn').click();
 assert.equal(await lastSaid(page), `led. ${byWord.get('lead').def}`, 'the voice says the metal, not "leed"');
 assert.equal(await page.locator('#bee-clue-text').textContent(), `Meaning: ${byWord.get('lead').def}.`);
 await close();
});

section('another accepted spelling counts', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await page.goto(URL_BEE);
 await page.evaluate(([k, day]) => localStorage.setItem(k, JSON.stringify({ words: { neighbor: { b: 1, due: day, tries: 1, miss: 0 } } })), [KEY, Core.dayNumber() - 1]);
 await page.reload();
 await page.locator('#start-btn').click();
 await spell(page, 'neighbour');
 assert.match(await page.locator('.bee-right').textContent(), /Right/);
 assert.match(await page.locator('#bee-feedback').textContent(), /Your spelling counts/);
 await close();
});

section('a physical keyboard works, and Enter on a button still presses that button', async ({ newPage, assert }) => {
 const { page, close } = await newPage(1080, 810);
 await page.goto(URL_BEE);
 await page.locator('#start-btn').click();
 const word = await hearWord(page);
 await page.keyboard.type(word.slice(0, -1) + 'qq');
 await page.keyboard.press('Backspace');
 await page.keyboard.press('Backspace');
 await page.keyboard.type(word.slice(-1));
 assert.equal(await page.locator('#bee-tiles .bee-tile').count(), word.length);
 const before = await page.evaluate(() => window.__said.length);
 await page.locator('#bee-hear').focus();
 await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(() => window.__said.length), before + 1, 'Enter pressed Hear');
 assert.equal(await page.locator('#bee-entry').isVisible(), true, 'and did not hand in the word');
 await page.evaluate(() => document.activeElement.blur());
 await page.keyboard.press('Enter');
 assert.match(await page.locator('.bee-right').textContent(), /Right/);
 await close();
});

async function startMockBee(page, key = 'school', random = 0) {
 await page.goto(URL_BEE);
 await page.locator('#bee-mock-btn').click();
 await page.locator(`.bee-choice[data-bee="${key}"]`).click();
 await fixRandom(page, random);
}

section('mock bee: stage rules, with no erasing and no slow reading', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await startMockBee(page);
 assert.equal(await page.locator('#bee-progress').textContent(), 'Round 1');
 assert.equal(await page.locator('#bee-pill').textContent(), '🐝 12 left');
 assert.equal(await page.locator('.bee-speller').count(), 12);
 assert.equal(await page.locator('#bee-erase').count(), 0, 'no erasing on stage');
 assert.equal(await page.locator('.bee-clue[data-clue="slow"]').count(), 0, 'a pronouncer will not slow down');
 assert.ok(await page.locator('.bee-clue[data-clue="origin"]').isVisible());
 const word = await hearWord(page);
 await page.keyboard.type(word[0]);
 await page.keyboard.press('Backspace');
 assert.equal(await page.locator('#bee-tiles .bee-tile').count(), 1, 'Backspace does nothing on stage');
 await close();
});

section('mock bee: starting over must use the same letters', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await startMockBee(page);
 // Same letters: fine, and a right spelling goes on.
 let word = await hearWord(page);
 await tap(page, word.slice(0, 2));
 await page.locator('#bee-over').click();
 assert.equal(await page.locator('#bee-tiles .bee-tile').count(), 0);
 await spell(page, word);
 assert.match(await page.locator('.bee-right').textContent(), /Right/);
 await page.locator('#bee-next').click();
 // A changed letter is out, even though the word could still be spelled right.
 word = await hearWord(page);
 const firstLetter = word[0] === 'q' ? 'x' : 'q';
 await tap(page, firstLetter);
 await page.locator('#bee-over').click();
 await tap(page, word[0]);
 assert.match(await page.locator('.bee-wrong').textContent(), /changed a letter/);
 assert.equal(await page.locator('#bee-entry').isVisible(), false);
 // Stopping short of the letters first said also changes the spelling.
 await page.locator('#bee-next').click();
 assert.ok(await page.locator('#finish-screen').isVisible());
 await startMockBee(page);
 word = await hearWord(page);
 await tap(page, word + 'z');
 await page.locator('#bee-over').click();
 await spell(page, word);
 assert.match(await page.locator('.bee-wrong').textContent(), /changed a letter/);
 await close();
});

section('mock bee: a miss rings the bell, and the finish gives a place', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await startMockBee(page);
 const word = await hearWord(page);
 await spell(page, wrongSpelling(word));
 assert.match(await page.locator('.bee-wrong').textContent(), /bell/);
 assert.equal((await page.locator('#bee-feedback .bee-word').textContent()).toLowerCase(), word);
 assert.equal((await page.evaluate(inView, '#bee-next')).ok, true);
 await page.locator('#bee-next').click();
 assert.equal(await page.locator('.tg-finish-score').textContent(), '🎖️ 12th of 12');
 assert.match(await page.locator('.tg-finish-note').textContent(), /ask for the meaning/, 'a child who asked nothing is told to ask');
 const saved = await readStore(page);
 assert.deepEqual(saved.best.school, { place: 12, of: 12 });
 assert.equal(saved.words[word].b, 1, 'a word missed on stage goes into practice');
 assert.equal(await page.evaluate(() => KlgProgress.gameStats('spelling-bee').byMode['mock-school'].plays), 1);
 // The recap offers the pattern that would have helped.
 await page.locator('#bee-recap .bee-quiet').click();
 assert.ok(await page.locator('#bee-pattern-go').isVisible());
 await page.goto(URL_BEE);
 await page.locator('#bee-mock-btn').click();
 assert.match(await page.locator('.bee-choice[data-bee="school"] .bee-best').textContent(), /Best: 12th of 12/);
 await close();
});

section('mock bee: if nobody is right, everyone stays in', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await startMockBee(page, 'class', 0.999);
 const word = await hearWord(page);
 await spell(page, wrongSpelling(word));
 assert.match(await page.locator('.bee-rivals').textContent(), /everyone stays in/);
 await page.locator('#bee-next').click();
 assert.equal(await page.locator('#bee-progress').textContent(), 'Round 2');
 assert.equal(await page.locator('#bee-pill').textContent(), '🐝 8 left');
 await close();
});

section('mock bee: the only speller who is right wins, with the badge', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await startMockBee(page, 'class', 0.999);
 const word = await hearWord(page);
 await spell(page, word);
 assert.match(await page.locator('#bee-feedback').textContent(), /only one who got it right/);
 await page.locator('#bee-next').click();
 assert.equal(await page.locator('.tg-finish-score').textContent(), '🏆 Champion!');
 assert.ok(await page.evaluate(() => !!KlgProgress.summary().badges['bee-champion']));
 const saved = await readStore(page);
 assert.equal(saved.best.class.place, 1);
 assert.equal(saved.wins, 1);
 await page.locator('#play-again-btn').click();
 assert.equal(await page.locator('#bee-pill').textContent(), '🐝 8 left', 'Play again starts a new bee');
 await close();
});

section('mock bee: a rival going out is named, and the stage shrinks', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await startMockBee(page, 'school');
 await page.evaluate(() => { let n = 0; Math.random = () => (n++ % 12 === 0 ? 0.999 : 0); });
 const word = await hearWord(page);
 await spell(page, word);
 assert.match(await page.locator('.bee-rivals').textContent(), /Out this round: /);
 await page.locator('#bee-next').click();
 assert.ok(await page.locator('.bee-speller').count() < 12, 'someone left the stage');
 await close();
});

section('mock bee: school bees have vocabulary rounds', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await startMockBee(page, 'school');
 for (let round = 1; round <= 2; round++) {
  await spell(page, await hearWord(page));
  await page.locator('#bee-next').click();
 }
 assert.equal(await page.locator('#bee-progress').textContent(), 'Round 3');
 assert.equal(await page.locator('.bee-answer').count(), 2);
 assert.equal(await page.locator('.bee-key').count(), 0, 'no spelling in a vocabulary round');
 assert.match(await lastSaid(page), /^What does \w+ mean\? A: .+\. Or B: .+\.$/);
 const asked = await page.locator('.bee-lead b').textContent();
 const right = page.locator('.bee-answer[data-right="true"]');
 assert.ok((await right.textContent()).includes(byWord.get(asked.toLowerCase()).def), 'the marked answer is the meaning');
 await right.click();
 assert.match(await page.locator('.bee-right').textContent(), /Right/);
 assert.equal((await page.evaluate(inView, '#bee-next')).ok, true);
 await page.locator('#bee-next').click();
 assert.equal(await page.locator('#bee-progress').textContent(), 'Round 4');
 const usedWord = await readStore(page);
 assert.equal(usedWord.words[asked.toLowerCase()], undefined, 'knowing a meaning does not count as spelling it');
 await close();
 // The wrong answer is out, and shows the meaning.
 const second = await newPage(390, 844);
 await startMockBee(second.page, 'school');
 for (let round = 1; round <= 2; round++) {
  await spell(second.page, await hearWord(second.page));
  await second.page.locator('#bee-next').click();
 }
 await second.page.locator('.bee-answer[data-right="false"]').click();
 assert.match(await second.page.locator('.bee-wrong').textContent(), /means:/);
 await second.page.locator('#bee-next').click();
 assert.ok(await second.page.locator('#finish-screen').isVisible());
 await second.close();
});

section('a mock bee uses the official meaning, and even the longest can be read', async ({ newPage, assert, fail }) => {
 const onList = WORDS.filter((w) => w.list);
 const at = onList.findIndex((w) => w.word === 'spiders');
 for (const [w, h] of SIZES) {
  const { page, close } = await newPage(w, h);
  await page.goto(URL_BEE);
  await page.locator('#bee-mock-btn').click();
  await fixRandom(page, (at + 0.5) / onList.length);
  await page.locator('.bee-choice[data-bee="class"]').click();
  assert.equal(await hearWord(page), 'spiders');
  await page.locator('.bee-clue[data-clue="meaning"]').click();
  assert.equal(await page.locator('#bee-clue-text').textContent(), `Meaning: ${byWord.get('spiders').official}.`);
  assert.equal(await lastSaid(page), byWord.get('spiders').official);
  await page.locator('.bee-clue[data-clue="pos"]').click();
  assert.match(await page.locator('#bee-clue-text').textContent(), /^Plural noun/);
  await page.locator('.bee-clue[data-clue="meaning"]').click();
  for (const hidden of await page.evaluate(clearOfKeys, '#bee-clue-text')) fail(`long meaning at ${w}x${h}: ${hidden}`);
  await close();
 }
});

section('the whole study list can be chosen, and a long or hyphenated word fits', async ({ newPage, assert, fail }) => {
 for (const [w, h] of SIZES) {
  const { page, close } = await newPage(w, h);
  await page.goto(URL_BEE);
  await page.locator('#bee-words-btn').click();
  for (const [focus, name] of [['list', 'Third grade'], ['core', 'One Bee'], ['stretch', 'Two Bee'], ['champion', 'Three Bee']]) {
   assert.match(await page.locator(`.bee-tier[data-focus="${focus}"]`).textContent(), new RegExp(name));
  }
  for (const focus of ['core', 'stretch', 'champion']) assert.match(await page.locator(`.bee-tier[data-focus="${focus}"]`).textContent(), /0 of 150 mastered/);
  // The longest word on the list, then one that is written with a hyphen.
  for (const word of ['bioluminescence', 'selfsufficient']) {
   await page.goto(URL_BEE);
   await page.evaluate(([k, day, target]) => localStorage.setItem(k, JSON.stringify({ words: { [target]: { b: 1, due: day, tries: 1, miss: 0 } } })), [KEY, Core.dayNumber() - 1, word]);
   await page.reload();
   await page.locator('#start-btn').click();
   assert.equal(await hearWord(page), word);
   await tap(page, word);
   for (const selector of ['#bee-done', '#bee-hear', '#bee-erase']) {
    const seen = await page.evaluate(inView, selector);
    if (!seen.ok) fail(`${word} at ${w}x${h}: ${selector} ${seen.why}`);
   }
   const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
   if (wide) fail(`${word} at ${w}x${h}: the page scrolls sideways`);
   await page.locator('#bee-done').click();
   await page.locator('#bee-next').waitFor();
   const feedback = await page.locator('#bee-feedback').textContent();
   if (word === 'selfsufficient') {
    assert.match(feedback, /self-sufficient/);
    assert.match(feedback, /say "hyphen"/);
    assert.match(await lastSaid(page).then(() => page.evaluate(() => window.__said.join('|'))), /self-sufficient/);
   }
  }
  await close();
 }
});

section('a list chosen in My words is still chosen after the game is reopened', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 const pressed = async () => {
  await page.locator('#bee-words-btn').click();
  return page.locator('.bee-tier[aria-pressed="true"]').getAttribute('data-focus');
 };
 await page.goto(`${URL_BEE}?level=1`);
 await page.locator('.kid-level[data-band="3"]').click();
 await page.waitForURL(/focus=list/);
 assert.equal(await pressed(), 'list', 'the 7-9 button opens on the third-grade list');
 await page.locator('.bee-tier[data-focus="core"]').click();
 await page.goto(URL_BEE);
 await page.waitForURL(/focus=list/);
 assert.equal(await pressed(), 'core', 'reopening keeps One Bee');
 await page.locator('#bee-back').click();
 await page.locator('.kid-level[data-band="4"]').click();
 await page.waitForURL(/focus=stretch/);
 assert.equal(await pressed(), 'stretch', 'but the 9+ button still changes it');
 await close();
});

section('words get harder through a mock bee', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await startMockBee(page, 'school');
 const seen = [];
 for (let round = 1; round <= 8; round++) {
  if (await page.locator('.bee-answer').count()) {
   await page.locator('.bee-answer[data-right="true"]').click();
  } else {
   const word = await hearWord(page);
   seen.push([round, byWord.get(word).tier]);
   await spell(page, word);
  }
  await page.locator('#bee-next').click();
 }
 assert.deepEqual(seen, [[1, 1], [2, 1], [4, 2], [5, 2], [7, 3], [8, 3]]);
 await close();
});

section('with a grown-up: the word is on the screen, and the grown-up judges', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await page.goto(URL_BEE);
 await page.locator('#bee-oral-btn').click();
 assert.equal(await page.locator('.bee-steps li').count(), 4);
 await page.locator('#bee-oral-go').click();
 const word = (await page.locator('#bee-oral-word').textContent()).toLowerCase();
 const w = byWord.get(word);
 assert.match(await page.locator('.bee-facts').textContent(), new RegExp(w.origin));
 assert.ok((await page.locator('.bee-facts').textContent()).includes(w.sentence));
 await page.locator('#bee-hear').click();
 assert.equal(await lastSaid(page), spokenAs(word));
 assert.ok((await page.locator('.bee-facts').textContent()).includes(w.official || w.def), 'the grown-up sees the official meaning');
 await page.locator('#bee-oral-wrong').click();
 assert.equal((await readStore(page)).words[word].b, 1);
 for (let i = 1; i < 10; i++) await page.locator('#bee-oral-right').click();
 assert.equal(await page.locator('.tg-finish-score').textContent(), '9 / 10');
 assert.equal(await page.locator('.bee-recap-row').count(), 1);
 assert.equal(await page.evaluate(() => KlgProgress.gameStats('spelling-bee').byMode.oral.plays), 1);
 await close();
});

section('patterns: every one opens, and practice stays on the pattern', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await page.goto(URL_BEE);
 await page.locator('#bee-patterns-btn').click();
 assert.equal(await page.locator('.bee-pattern').count(), Object.keys(PATTERNS).length);
 for (const key of Object.keys(PATTERNS)) {
  await page.goto(URL_BEE);
  await page.locator('#bee-patterns-btn').click();
  await page.locator(`.bee-pattern[data-pattern="${key}"]`).click();
  assert.ok((await page.locator('.bee-rule-big').textContent()) === PATTERNS[key].rule, key);
  assert.equal(await lastSaid(page), PATTERNS[key].rule, `${key}: the rule is read aloud`);
  await page.locator('#bee-pattern-go').click();
  assert.equal(await page.locator('#bee-progress').textContent(), '1 / 5', key);
  const word = await hearWord(page);
  assert.ok(byWord.get(word).patterns.includes(key), `${word} is a ${key} word`);
 }
 // A whole pattern round, and the score shows on its card.
 await page.goto(URL_BEE);
 await page.locator('#bee-patterns-btn').click();
 await page.locator('.bee-pattern[data-pattern="silent"]').click();
 await page.locator('#bee-pattern-go').click();
 for (let i = 0; i < 5; i++) {
  await spell(page, await hearWord(page));
  await page.locator('#bee-next').click();
 }
 assert.equal(await page.locator('.tg-finish-score').textContent(), '5 / 5');
 await close();
});

section('my words: the plan, the choice of words, and a school list', async ({ newPage, assert }) => {
 const { page, close } = await newPage(390, 844);
 await page.goto(URL_BEE);
 await page.locator('#bee-words-btn').click();
 assert.equal(await page.locator('.bee-tier').count(), 4);
 assert.equal(await page.locator('.bee-tier[data-focus="list"]').getAttribute('aria-pressed'), 'true');
 assert.match(await page.locator('.bee-tier[data-focus="list"]').textContent(), /0 of 50 mastered/);
 await page.locator('.bee-tier[data-focus="champion"]').click();
 assert.equal(await page.locator('.bee-tier[data-focus="champion"]').getAttribute('aria-pressed'), 'true');
 await page.locator('#bee-back').click();
 await page.locator('#start-btn').click();
 assert.equal(byWord.get(await hearWord(page)).tier, 3, 'champion words first');
 // A date gives a daily goal, and the start screen counts down.
 await page.goto(URL_BEE);
 await page.locator('#bee-words-btn').click();
 const d = new Date(Date.now() + 12 * 86400000);
 const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
 await page.locator('#bee-date').fill(iso);
 assert.match(await page.locator('#bee-goal').textContent(), /12 days to go\. Learn \d+ new words a day/);
 await page.locator('#bee-back').click();
 assert.match(await page.locator('#mode-label').textContent(), /🗓️ 12 days/);
 // A pasted list: saved, reported, and practiced first.
 await page.locator('#bee-words-btn').click();
 await page.locator('#bee-list').fill('zamboni - a machine that smooths ice\nbecause\nice cream\n<img src=x onerror=window.__hacked=1>');
 await page.locator('#bee-list-save').click();
 assert.match(await page.locator('#bee-list-note').textContent(), /Saved 2 words\. Left out, because only letters can be typed: ice cream/);
 assert.equal(await page.locator('.bee-tier[data-focus="school"]').getAttribute('aria-pressed'), 'true');
 assert.equal(await page.evaluate(() => window.__hacked), undefined);
 await page.reload();
 await page.locator('#bee-words-btn').click();
 assert.match(await page.locator('#bee-list').inputValue(), /zamboni - a machine/, 'the list survives a reload');
 await page.locator('#bee-back').click();
 await page.locator('#start-btn').click();
 const seen = [];
 for (let i = 0; i < 2; i++) {
  const word = await hearWord(page);
  seen.push(word);
  if (word === 'zamboni') {
   assert.equal(await page.locator('.bee-clue').count(), 2, 'a list word only has the clues it was given, and Slowly');
   await page.locator('.bee-clue[data-clue="meaning"]').click();
   assert.match(await page.locator('#bee-clue-text').textContent(), /smooths ice/);
  }
  await spell(page, word);
  await page.locator('#bee-next').click();
 }
 assert.deepEqual(seen.sort(), ['because', 'zamboni']);
 await close();
});

section('with no voice, the clues carry the word', async ({ newPage, assert }) => {
 const noVoices = await newPage(390, 844, { voices: false });
 await noVoices.page.goto(URL_BEE);
 await noVoices.page.locator('#start-btn').click();
 assert.equal(await noVoices.page.locator('#bee-study-hear').count(), 0, 'the study card offers no sound it cannot play');
 await noVoices.page.locator('#bee-study-go').click();
 assert.ok(await noVoices.page.locator('#bee-novoice').isVisible());
 assert.match(await noVoices.page.locator('#bee-clue-text').textContent(), /Meaning: .+_____/);
 await noVoices.close();
 const noSpeech = await newPage(390, 844, { init: () => { delete window.speechSynthesis; delete Window.prototype.speechSynthesis; }, stub: false });
 await noSpeech.page.goto(URL_BEE);
 await noSpeech.page.locator('#start-btn').click();
 await noSpeech.page.locator('#bee-study-go').click();
 assert.ok(await noSpeech.page.locator('#bee-novoice').isVisible());
 assert.match(await noSpeech.page.locator('#bee-clue-text').textContent(), /Meaning: /);
 await tap(noSpeech.page, 'cat');
 await noSpeech.page.locator('#bee-done').click();
 assert.ok(await noSpeech.page.locator('#bee-feedback').textContent());
 await noSpeech.close();
});

section('it works with storage blocked, damaged or wiped', async ({ newPage, assert }) => {
 const blocked = await newPage(390, 844, { init: () => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); } });
 await blocked.page.goto(URL_BEE);
 await blocked.page.locator('#start-btn').click();
 await spell(blocked.page, await hearWord(blocked.page));
 assert.match(await blocked.page.locator('.bee-right').textContent(), /Right/);
 await blocked.close();
 const { page, close } = await newPage(390, 844);
 await page.goto(URL_BEE);
 for (const bad of ['{not json', '[]', '{"words":{"because":{"b":"x"}},"focus":"nope"}']) {
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, bad]);
  await page.reload();
  await page.locator('#start-btn').click();
  assert.equal(await page.locator('#bee-progress').textContent(), '1 / 10', bad);
  await page.goto(URL_BEE);
 }
 // Start over, from the grown-up report, also clears training.
 await page.evaluate(() => KlgProgress.reset());
 assert.equal(await page.evaluate((k) => localStorage.getItem(k), KEY), null);
 await close();
});

section('every size: nothing hidden, nothing too small, no sideways scroll', async ({ newPage, fail }) => {
 for (const [w, h] of SIZES) {
  const { page, close } = await newPage(w, h);
  const noSideways = async (where) => { if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) fail(`${where} at ${w}x${h}: sideways scroll`); };
  const small = async (where) => { for (const s of await page.evaluate(tooSmall)) fail(`${where} at ${w}x${h}: ${s}`); };
  const seen = async (where, selector) => {
   const r = await page.evaluate(inView, selector);
   if (!r.ok) fail(`${where} at ${w}x${h}: ${selector} ${r.why}`);
  };

  await page.goto(URL_BEE);
  await seen('start', '#start-btn');
  await noSideways('start');
  await small('start');
  // The level buttons are numbers and pictures, not reading, so they do not count.
  const words = await page.evaluate(() => {
   const start = document.getElementById('start-screen');
   const levels = start.querySelector('.kid-levels');
   return start.innerText.replace(levels ? levels.innerText : '', '').trim().split(/\s+/).length;
  });
  if (words > 30) fail(`start at ${w}x${h}: ${words} words`);
  await page.locator('.kid-more summary').click();
  await small('start, unfolded');

  // A word: the voice, every clue, every letter and Done are there without scrolling.
  await page.goto(URL_BEE);
  await page.locator('#start-btn').click();
  await page.locator('#bee-study-go').click();
  for (const s of ['#bee-hear', '.bee-clue[data-clue="meaning"]', '.bee-clue[data-clue="slow"]', '#bee-tiles', '.bee-key[data-letter="a"]', '.bee-key[data-letter="z"]', '#bee-done', '#bee-erase']) await seen('word', s);
  for (const hidden of await page.evaluate(clearOfKeys, '.bee-ask button')) fail(`word at ${w}x${h}: ${hidden}`);
  await noSideways('word');
  await small('word');
  // Each clue's answer can be read, even a long one, with the keys still on screen.
  for (const kind of ['meaning', 'sentence', 'pos', 'origin']) {
   await page.locator(`.bee-clue[data-clue="${kind}"]`).click();
   for (const hidden of await page.evaluate(clearOfKeys, '#bee-clue-text')) fail(`${kind} at ${w}x${h}: ${hidden}`);
  }
  await page.evaluate(() => scrollTo(0, 0));
  const word = await hearWord(page);
  await spell(page, wrongSpelling(word));
  await seen('wrong', '#bee-cover');
  await seen('wrong', '.bee-wrong');
  await noSideways('wrong');
  await small('wrong');
  await page.locator('#bee-cover').click();
  await spell(page, word);
  await seen('fixed', '#bee-next');
  await seen('fixed', '.bee-right');

  // A long word in the tiles must still fit, and leave the keys in view.
  await page.goto(URL_BEE);
  await page.evaluate(([k, day]) => localStorage.setItem(k, JSON.stringify({ words: { misunderstand: { b: 1, due: day, tries: 1, miss: 0 } } })), [KEY, Core.dayNumber() - 1]);
  await page.reload();
  await page.locator('#start-btn').click();
  await tap(page, 'misunderstand');
  for (const s of ['#bee-done', '.bee-key[data-letter="z"]']) await seen('long word', s);
  await noSideways('long word');
  await page.locator('#bee-done').click();
  await seen('long word', '#bee-next');
  await page.evaluate((k) => localStorage.removeItem(k), KEY);

  // A sound-alike's meaning arrives without being asked for, so it must not start hidden.
  await page.goto(URL_BEE);
  await page.evaluate(([k, day]) => localStorage.setItem(k, JSON.stringify({ words: { knight: { b: 1, due: day, tries: 1, miss: 1 } } })), [KEY, Core.dayNumber() - 1]);
  await page.reload();
  await page.locator('#start-btn').click();
  for (const hidden of await page.evaluate(clearOfKeys, '#bee-clue-text')) fail(`sound-alike at ${w}x${h}: ${hidden}`);
  await page.evaluate((k) => localStorage.removeItem(k), KEY);

  // The stage.
  await startMockBee(page, 'school');
  for (const hidden of await page.evaluate(clearOfKeys, '.bee-ask button')) fail(`mock at ${w}x${h}: ${hidden}`);
  for (const s of ['#bee-hear', '.bee-clue[data-clue="origin"]', '.bee-key[data-letter="z"]', '#bee-over', '#bee-done']) await seen('mock', s);
  await noSideways('mock');
  await small('mock');
  await spell(page, await hearWord(page));
  await seen('mock right', '#bee-next');
  await page.locator('#bee-next').click();
  await spell(page, wrongSpelling(await hearWord(page)));
  await seen('mock bell', '#bee-next');
  await page.locator('#bee-next').click();
  // The way forward comes first now that this game has a next game. Play again may sit just below it.
  await seen('finish', '.kid-next-game');
  await noSideways('finish');
  await small('finish');

  // The other screens.
  for (const [id, where] of [['bee-patterns-btn', 'patterns'], ['bee-words-btn', 'my words'], ['bee-oral-btn', 'grown-up'], ['bee-mock-btn', 'mock choice']]) {
   await page.goto(URL_BEE);
   await page.locator(`#${id}`).click();
   await noSideways(where);
   await small(where);
  }
  await page.goto(URL_BEE);
  await page.locator('#bee-oral-btn').click();
  await page.locator('#bee-oral-go').click();
  await noSideways('oral word');
  await small('oral word');
  await close();
 }
});

(async () => {
 const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
 const failures = [];
 const newPage = async (width, height, { voices = true, stub = true, init } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('pageerror', (e) => failures.push(`page error at ${width}x${height} ${page.url()}: ${e.message}`));
  page.on('request', (r) => { if (!r.url().startsWith(base) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) failures.push(`external request: ${r.url()}`); });
  if (stub) await page.addInitScript(speechStub, voices);
  if (init) await page.addInitScript(init);
  return { page, context, close: () => context.close() };
 };
 for (const [name, fn] of sections) {
  if (only && !name.includes(only)) continue;
  const before = failures.length;
  try {
   await fn({ newPage, fail: (message) => failures.push(message), assert });
  } catch (e) {
   failures.push(`${name}: ${String(e.message).split('\n').slice(0, 6).join(' ')}`);
  }
  console.log(`${failures.length === before ? 'PASS' : 'FAIL'} ${name}`);
 }
 await browser.close();
 if (failures.length) {
  console.log(`\n${failures.length} problems:\n  ${failures.slice(0, Number(process.env.SHOW || 40)).join('\n  ')}`);
  process.exit(1);
 }
 console.log('PASS all Spelling Bee training checks.');
})().catch((e) => { console.error(e); process.exit(1); });
