/* Word Families. Families share an ending sound and spelling. Every word needs a picture in assets/js/word-pictures.js. */
(function (root) {
  'use strict';
  const FAMILIES = {
    at: ["cat", "hat", "bat", "rat"], an: ["can", "man", "pan", "van"], ap: ["cap", "map", "nap"], en: ["hen", "pen", "ten"],
    et: ["net", "pet", "jet"], og: ["dog", "frog", "log"], ug: ["bug", "mug", "hug"], un: ["sun", "run", "bun"],
    ot: ["pot", "dot", "hot"], ip: ["ship", "lip", "chip"],
    ake: ["cake", "lake", "snake"], all: ["ball", "wall", "tall"], ed: ["bed", "red", "sled"], ock: ["clock", "lock", "rock", "sock"],
    ing: ["king", "ring", "wing"], ar: ["car", "jar", "star"], ee: ["bee", "tree", "knee"], oat: ["boat", "goat", "coat"], ain: ["rain", "train", "chain"],
  };
  // Level 1 stays with the short three-letter sounds a beginner meets first.
  const FIRST_FAMILIES = ["at", "an", "ap", "en", "et", "og", "ug", "un", "ot", "ip"];
  const api = { FAMILIES, FIRST_FAMILIES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KlgQuestions = api;
})(typeof window !== 'undefined' ? window : globalThis);
