const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../assets/js/tamil-sentences-data.js');

test('sentence bank has distinct contexts and complete Tamil targets', () => {
  assert.equal(data.sentences.length, 32);
  assert.equal(new Set(data.sentences.map(item => item.id)).size, 32);
  assert.equal(new Set(data.sentences.map(item => item.before + item.word + item.after)).size, 32);
  for (const item of data.sentences) {
    assert.match(item.word, /^[\u0B80-\u0BFF]+$/u);
    assert.ok(item.before || item.after);
    assert.ok(item.clue && item.emoji);
    assert.ok(data.letters(item.word).length);
    assert.equal(data.letters(item.word).join(''), item.word);
    assert.ok(data.letters(item.word).every(letter => !/^\p{M}/u.test(letter)));
  }
  for (const category of ['animals', 'nature', 'everyday']) {
    assert.ok(data.sentences.filter(item => item.category === category).length >= 10);
  }
});

test('whole Tamil letters keep vowel signs and pulli together', () => {
  assert.deepEqual(data.letters('தேங்காய்'), ['தே', 'ங்', 'கா', 'ய்']);
  assert.deepEqual(data.letters('புத்தகம்'), ['பு', 'த்', 'த', 'க', 'ம்']);
  assert.deepEqual(data.letters('தண்ணீர்'), ['த', 'ண்', 'ணீ', 'ர்']);
  for (const word of ['கொ', 'கோ', 'கௌ', 'கோழி', 'தேனீ']) {
    assert.deepEqual(data.letters(word.normalize('NFD')), data.letters(word));
  }
});

test('normalization accepts canonical Unicode and input-method formatting', () => {
  assert.equal(data.normalize('  கோழி\u200c '), 'கோழி');
  assert.equal(data.normalize('கோழி'.normalize('NFD')), 'கோழி');
  assert.notEqual(data.normalize('மாலை'), data.normalize('மலை'));
});

test('on-screen keyboard can type every target, synonym, and possible blank', () => {
  const keys = new Set([...data.vowels, ...data.consonants.flatMap(base => data.signs.map(sign => base + sign))]);
  for (const item of data.sentences) {
    for (const word of [item.word, ...(item.alternatives || [])]) {
      for (const letter of data.letters(word)) assert.ok(keys.has(letter), `Keyboard cannot type ${letter} in ${word}`);
    }
  }
});
