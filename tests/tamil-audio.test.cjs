const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Tamil = require('../assets/js/tamil-kit.js');

const root = path.resolve(__dirname, '..');
global.window = global.window || {};
require('../assets/js/tamil-audio-manifest.js');
const manifest = window.KLG_TAMIL_AUDIO;
const wordSource = fs.readFileSync(path.join(root, 'assets/js/tamil-words-data.js'), 'utf8');
const words = [...wordSource.matchAll(/tamil: "([^"]+)", english: "([^"]+)", emoji: "([^"]+)", cat: "([^"]+)"/g)]
  .map(([, tamil, english, emoji, cat]) => ({ tamil, english, emoji, cat }));

test('letter tables cover the whole Tamil alphabet', () => {
  assert.equal(Tamil.VOWELS.length, 12);
  assert.equal(Tamil.CONSONANTS.length, 18);
  assert.equal(Tamil.UYIRMEI.length, 216);
  assert.equal(new Set(Tamil.UYIRMEI.map(u => u.tamil)).size, 216);
  assert.equal(Tamil.VOWELS.filter(v => v.short).length, 5, 'குறில்: அ இ உ எ ஒ');
  assert.deepEqual(Tamil.NUMBERS.map(n => n.value), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('letters() splits words into orthographic letters', () => {
  assert.deepEqual(Tamil.letters('தேங்காய்'), ['தே', 'ங்', 'கா', 'ய்']);
  assert.deepEqual(Tamil.letters('யானை'), ['யா', 'னை']);
  assert.deepEqual(Tamil.letters('ஒளவை'), ['ஒ', 'ள', 'வை']);
  for (const w of words) assert.equal(Tamil.letters(w.tamil).join(''), w.tamil.normalize('NFC'), w.tamil);
});

test('parts() and info() describe how compound letters are built', () => {
  assert.deepEqual(Tamil.parts('கி'), { mei: 'க்', vowel: 'இ' });
  assert.deepEqual(Tamil.parts('ழௌ'), { mei: 'ழ்', vowel: 'ஔ' });
  assert.deepEqual(Tamil.parts('அ'), { single: 'அ' });
  assert.equal(Tamil.info('ண்').sound, 'N');
  assert.equal(Tamil.info('கீ').short, false);
  assert.equal(Tamil.info('x'), null);
});

test('every vowel, consonant and ஃ has a human recording', () => {
  const required = [...Tamil.VOWELS, ...Tamil.CONSONANTS, Tamil.AYTHAM].map(l => l.tamil);
  for (const letter of required) assert.ok(manifest[letter], `missing recording for ${letter}`);
});

test('so every compound letter can be blended from recorded parts', () => {
  for (const u of Tamil.UYIRMEI) {
    assert.ok(manifest[u.mei] && manifest[u.vowel], u.tamil);
  }
});

test('nearly all picture words and all numbers are recorded', () => {
  const recorded = words.filter(w => manifest[w.tamil]);
  assert.ok(recorded.length / words.length >= 0.9, `${recorded.length}/${words.length} words recorded`);
  for (const n of Tamil.NUMBERS) assert.ok(manifest[n.tamil], n.tamil);
});

test('manifest files exist, are small MP3s and are all credited', () => {
  const credits = fs.readFileSync(path.join(root, 'assets/audio/tamil/CREDITS.md'), 'utf8');
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'scripts/tamil-audio-sources.json'), 'utf8'));
  const files = new Set(fs.readdirSync(path.join(root, 'assets/audio/tamil')).filter(f => f.endsWith('.mp3')));
  assert.equal(files.size, Object.keys(manifest).length, 'no stray or missing audio files');
  for (const [text, id] of Object.entries(manifest)) {
    const file = path.join(root, 'assets/audio/tamil', id + '.mp3');
    const bytes = fs.readFileSync(file);
    assert.ok(bytes.length > 1500 && bytes.length < 60000, `${text}: ${bytes.length} bytes`);
    assert.ok(bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0), `${text} is MP3`);
    const source = lock[text];
    assert.ok(source && /^(CC0|CC BY-SA [34]\.0)$/.test(source.license), `${text}: open licence`);
    assert.ok(credits.includes(source.page), `${text}: credited`);
  }
});

test('picture words have unique pictures and enough words per topic', () => {
  assert.equal(new Set(words.map(w => w.emoji)).size, words.length, 'two words share one picture');
  assert.equal(new Set(words.map(w => w.tamil)).size, words.length, 'duplicate Tamil word');
  const topics = new Set(words.map(w => w.cat));
  for (const cat of topics) assert.ok(words.filter(w => w.cat === cat).length >= 4, cat);
});
