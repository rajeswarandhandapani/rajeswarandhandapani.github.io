/**
 * Shared Tamil letter data and helpers for every Tamil activity.
 *
 *   KlgTamil.VOWELS      12 uyir letters   { tamil, sound, short, long? }
 *   KlgTamil.CONSONANTS  18 mei letters    { tamil: "க்", base: "க", sound, group }
 *   KlgTamil.AYTHAM      ஃ
 *   KlgTamil.VOWEL_SIGNS 12 signs, index-aligned with VOWELS
 *   KlgTamil.UYIRMEI     216 compound letters { tamil, base, mei, vowel, sound }
 *   KlgTamil.NUMBERS     1–10 { value, tamil, numeral }
 *   KlgTamil.letters(word)   orthographic letters: தேங்காய் → தே ங் கா ய்
 *   KlgTamil.parts(letter)   கி → { mei: "க்", vowel: "இ" }; vowels/mei return themselves
 *   KlgTamil.shuffle(list), KlgTamil.pick(list), KlgTamil.sample(list, n)
 *
 * Sounds are kid-friendly transliterations (CAPITAL = retroflex: ண் N, ள் L,
 * ற் R). ந் and ன் share "n"; callers that need distinct *sounds* must
 * compare `sound`, not `tamil`.
 */
(function (root) {
  "use strict";

  const VOWELS = [
    { tamil: "அ", sound: "a", short: true, pair: "ஆ" },
    { tamil: "ஆ", sound: "aa", short: false, pair: "அ" },
    { tamil: "இ", sound: "i", short: true, pair: "ஈ" },
    { tamil: "ஈ", sound: "ee", short: false, pair: "இ" },
    { tamil: "உ", sound: "u", short: true, pair: "ஊ" },
    { tamil: "ஊ", sound: "oo", short: false, pair: "உ" },
    { tamil: "எ", sound: "e", short: true, pair: "ஏ" },
    { tamil: "ஏ", sound: "ay", short: false, pair: "எ" },
    { tamil: "ஐ", sound: "ai", short: false, pair: null },
    { tamil: "ஒ", sound: "o", short: true, pair: "ஓ" },
    { tamil: "ஓ", sound: "oh", short: false, pair: "ஒ" },
    { tamil: "ஔ", sound: "ow", short: false, pair: null },
  ];

  // Traditional groups: வல்லினம் (hard), மெல்லினம் (soft), இடையினம் (middle).
  const CONSONANTS = [
    ["க", "k", "hard"], ["ங", "ng", "soft"], ["ச", "ch", "hard"], ["ஞ", "nj", "soft"],
    ["ட", "t", "hard"], ["ண", "N", "soft"], ["த", "th", "hard"], ["ந", "n", "soft"],
    ["ப", "p", "hard"], ["ம", "m", "soft"], ["ய", "y", "middle"], ["ர", "r", "middle"],
    ["ல", "l", "middle"], ["வ", "v", "middle"], ["ழ", "zh", "middle"], ["ள", "L", "middle"],
    ["ற", "R", "hard"], ["ன", "n", "soft"],
  ].map(([base, sound, group]) => ({ tamil: base + "்", base, sound, group }));

  const AYTHAM = { tamil: "ஃ", sound: "akh" };

  const VOWEL_SIGNS = ["", "ா", "ி", "ீ", "ு", "ூ", "ெ", "ே", "ை", "ொ", "ோ", "ௌ"];

  const UYIRMEI = CONSONANTS.flatMap((c) =>
    VOWELS.map((v, i) => ({
      tamil: c.base + VOWEL_SIGNS[i],
      base: c.base,
      mei: c.tamil,
      vowel: v.tamil,
      sound: c.sound + v.sound,
      short: v.short,
    }))
  );

  const NUMBERS = [
    [1, "ஒன்று", "௧"], [2, "இரண்டு", "௨"], [3, "மூன்று", "௩"], [4, "நான்கு", "௪"],
    [5, "ஐந்து", "௫"], [6, "ஆறு", "௬"], [7, "ஏழு", "௭"], [8, "எட்டு", "௮"],
    [9, "ஒன்பது", "௯"], [10, "பத்து", "௰"],
  ].map(([value, tamil, numeral]) => ({ value, tamil, numeral }));

  // Combining marks: vowel signs U+0BBE–U+0BCC, pulli U+0BCD, au length U+0BD7.
  const MARK = /[ா-்ௗ]/;

  function letters(word) {
    const out = [];
    for (const ch of String(word).normalize("NFC")) {
      if (MARK.test(ch) && out.length) out[out.length - 1] += ch;
      else if (ch.trim()) out.push(ch);
    }
    return out;
  }

  const BY_TAMIL = new Map();
  VOWELS.forEach((v) => BY_TAMIL.set(v.tamil, { kind: "vowel", ...v }));
  CONSONANTS.forEach((c) => BY_TAMIL.set(c.tamil, { kind: "consonant", ...c }));
  UYIRMEI.forEach((u) => BY_TAMIL.set(u.tamil, { kind: "uyirmei", ...u }));
  BY_TAMIL.set(AYTHAM.tamil, { kind: "aytham", ...AYTHAM });

  function info(letter) {
    return BY_TAMIL.get(String(letter).normalize("NFC")) || null;
  }

  function parts(letter) {
    const found = info(letter);
    if (!found) return null;
    if (found.kind === "uyirmei") return { mei: found.mei, vowel: found.vowel };
    return { single: found.tamil };
  }

  function shuffle(list) {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function sample(list, n) {
    return shuffle(list).slice(0, n);
  }

  root.KlgTamil = {
    VOWELS, CONSONANTS, AYTHAM, VOWEL_SIGNS, UYIRMEI, NUMBERS,
    letters, info, parts, shuffle, pick, sample,
  };
  if (typeof module !== "undefined") module.exports = root.KlgTamil;
})(typeof window !== "undefined" ? window : globalThis);
