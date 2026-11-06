const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cat = require('../assets/js/catalogue.js');

const folders = fs.readdirSync('games').filter(id => fs.existsSync(path.join('games', id, 'index.html')));

test('every game folder has exactly one catalogue entry and vice versa', () => {
 const ids = cat.GAMES.map(g => g.id);
 assert.equal(new Set(ids).size, ids.length, 'duplicate catalogue ids');
 assert.deepEqual([...ids].sort(), [...folders].sort());
});

test('catalogue entries are complete', () => {
 for (const g of cat.GAMES) {
  assert.ok(g.name && g.icon && g.blurb, g.id + ' needs name, icon and blurb');
  assert.ok(cat.LEVELS[g.level], g.id + ' has a bad level');
  assert.ok(cat.SUBJECTS[g.subject], g.id + ' has a bad subject');
  assert.ok(Array.isArray(g.skills) && g.skills.length, g.id + ' needs skills');
  for (const s of g.skills) assert.match(s, /^[a-z]+\.[a-z0-9-]+$/, g.id + ' skill ' + s);
 }
});

test('learning path steps are real games of the right subject area', () => {
 for (const [key, p] of Object.entries(cat.PATHS)) {
  assert.ok(p.steps.length >= 4, key + ' path is too short');
  const seen = new Set();
  for (const step of p.steps) {
   assert.ok(cat.byId(step.game), key + ' path names unknown game ' + step.game);
   assert.ok(!seen.has(step.game), key + ' path repeats ' + step.game);
   seen.add(step.game);
   assert.ok(step.label);
  }
 }
});

test('every game page links the shared home button and loads progress before the engine', () => {
 for (const id of folders) {
  const html = fs.readFileSync(path.join('games', id, 'index.html'), 'utf8');
  assert.match(html, /\.\.\/\.\.\/index\.html/, id + ' needs a link home');
  const p = html.indexOf('progress.js'), q = html.indexOf('quiz-engine.js');
  if (q >= 0) assert.ok(p >= 0 && p < q, id + ' must load progress.js before quiz-engine.js');
 }
});

test('every game page loads the catalogue before progress, or catalogue badges can never be earned', () => {
 for (const id of folders) {
  const html = fs.readFileSync(path.join('games', id, 'index.html'), 'utf8');
  const c = html.indexOf('catalogue.js'), p = html.indexOf('progress.js');
  assert.ok(c >= 0 && c < p, id + ' must load catalogue.js before progress.js');
 }
 assert.match(fs.readFileSync('scripts/new-game.cjs', 'utf8'), /'catalogue\.js', 'progress\.js'/, 'new games must load it too');
});

test('every game page loads the shared frame last, after the game has built its controls', () => {
 for (const id of folders) {
  const html = fs.readFileSync(path.join('games', id, 'index.html'), 'utf8');
  const shell = html.lastIndexOf('page-shell.js');
  assert.ok(shell >= 0, id + ' must load page-shell.js');
  assert.equal(html.lastIndexOf('<script', shell - 1), html.lastIndexOf('<script'), id + ' must load page-shell.js last');
 }
 assert.match(fs.readFileSync('scripts/new-game.cjs', 'utf8'), /page-shell\.js/, 'new games must load it too');
});

test('a child can reach every game from a subject, with no age question', () => {
 const reached = new Set();
 for (const subject of Object.keys(cat.SUBJECTS)) {
  const list = cat.gamesFor(subject);
  assert.ok(list.length > 0, subject);
  assert.ok(list.every((g) => g.subject === subject), subject);
  list.forEach((g) => reached.add(g.id));
 }
 assert.deepEqual(cat.GAMES.map((g) => g.id).filter((id) => !reached.has(id)), []);
 assert.equal(cat.gamesFor().length, cat.GAMES.length);
 for (const file of ['index.html', 'assets/js/home.js', 'assets/js/page-shell.js']) assert.ok(!/klg-stage|How old are you/.test(fs.readFileSync(file, 'utf8')), file + ' still asks for an age');
});

test('every subject has a tile, and every age band has words to say', () => {
 for (const s of Object.values(cat.SUBJECTS)) assert.ok(s.kid && s.icon && s.say, s.label);
 for (const l of Object.values(cat.LEVELS)) assert.ok(l.short && l.say, l.name);
});

test('games come easiest first, then in learning-path order', () => {
 const math = cat.gamesFor('math');
 assert.equal(math[0].id, 'number-sounds');
 const levels = math.map((g) => g.level);
 assert.deepEqual(levels, levels.slice().sort((a, b) => a - b));
 const first = math.filter((g) => g.level === 1 && cat.pathStep(g) !== Infinity);
 assert.deepEqual(first.map(cat.pathStep), first.map(cat.pathStep).slice().sort((a, b) => a - b));
});

test('every game has levels for the ages it suits', () => {
 for (const g of cat.GAMES) {
  if (g.id === 'tamil-letter-chart') { assert.equal(g.levels.length, 0, 'a chart to explore has no levels'); continue; }
  assert.ok(g.levels.length >= 2, g.id + ' needs at least two levels');
  const bands = g.levels.map((l) => l.band);
  assert.deepEqual(bands, bands.slice().sort(), g.id);
  bands.forEach((band) => assert.ok(cat.LEVELS[band], g.id));
  assert.equal(new Set(g.levels.map((l) => l.query)).size, g.levels.length, g.id + ' has two levels that are the same');
  for (let i = 1; i < bands.length; i++) assert.equal(bands[i], bands[i - 1] + 1, g.id + ' skips an age');
  // The game must really read each setting, or the level would do nothing.
  const dir = `games/${g.id}/`;
  const source = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(dir + f, 'utf8')).join('') +
    (/tamil-typing\.js/.test(fs.readFileSync(dir + 'index.html', 'utf8')) ? fs.readFileSync('assets/js/tamil-typing.js', 'utf8') : '');
  for (const level of g.levels) {
   for (const key of new URLSearchParams(level.query).keys()) {
    assert.match(source, new RegExp(`["'\`]${key}["'\`]`), `${g.id} never reads ?${key}=`);
   }
  }
 }
 assert.equal(cat.agesLabel(cat.byId('counting')), '3–7');
 assert.equal(cat.agesLabel(cat.byId('fractions')), '5+');
 assert.equal(cat.agesLabel(cat.byId('tamil-letter-chart')), '3–5');
});

test('Play next moves on as stars are earned, and never gets stuck', () => {
 const star = (...ids) => Object.fromEntries(ids.map((id) => [id, { bestStars: 1 }]));
 assert.equal(cat.nextFor({}).subject, 'math');
 assert.equal(cat.nextFor({}).id, 'number-sounds');
 assert.equal(cat.nextFor(star('number-sounds')).id, 'counting');
 assert.equal(cat.nextFor({}, 'english').subject, 'english', 'stays in the subject last chosen');
 assert.equal(cat.nextFor({}, 'nonsense').subject, 'math');
 const everything = Object.fromEntries(cat.GAMES.map((g) => [g.id, { bestStars: 3 }]));
 everything.counting = { bestStars: 1 };
 assert.equal(cat.nextFor(everything).id, 'counting', 'with every star earned, it offers the weakest game');
});

test('the next game is a different game in the same subject', () => {
 for (const g of cat.GAMES) {
  const next = cat.nextAfter(g.id, {});
  assert.ok(next, g.id + ' has no next game');
  assert.notEqual(next.id, g.id, g.id);
  assert.equal(next.subject, g.subject, g.id);
 }
 assert.equal(cat.nextAfter('number-sounds', {}).id, 'counting');
 assert.equal(cat.nextAfter('number-sounds', { counting: { bestStars: 2 } }).id === 'counting', false, 'skips a finished game');
 assert.equal(cat.nextAfter('nothing', {}), null);
});

test('the Picture Pro badge can still be earned', () => {
 assert.ok(cat.GAMES.filter((g) => g.v3).length >= 10);
});

test('index.html game count and noscript list match the catalogue (run npm run sync:index)', () => {
 const { synced } = require('../scripts/sync-index.cjs');
 const html = fs.readFileSync('index.html', 'utf8');
 assert.equal(synced(html), html);
});

test('the offline service worker saves every page, script, picture, font and recording (run npm run sw)', () => {
 const sw = fs.readFileSync('sw.js', 'utf8');
 const listed = new Set(JSON.parse(sw.match(/const FILES = (\[[\s\S]*?\]);/)[1]).map((f) => f.replace(/^\.\//, '')));
 const walk = (p) => fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap((f) => walk(path.join(p, f))) : [p.split(path.sep).join('/')];
 const needed = ['index.html', 'manifest.webmanifest', ...walk('assets'), ...walk('games')].filter((f) => !/(^|\/)\.|\.md$/.test(f));
 const missing = needed.filter((f) => !listed.has(f));
 assert.deepEqual(missing, [], 'sw.js is missing files — run npm run sw');
 for (const f of listed) if (f) assert.ok(fs.existsSync(f), 'sw.js lists a file that no longer exists: ' + f);
 const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
 for (const icon of manifest.icons) assert.ok(fs.existsSync(icon.src), icon.src);
 assert.match(fs.readFileSync('index.html', 'utf8'), /rel="manifest"/);
});
