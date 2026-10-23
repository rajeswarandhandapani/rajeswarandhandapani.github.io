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
