/* Word Detective. Words chosen for one clear everyday job, so that a child is not caught out by a word that is both a noun and a verb. */
(function (root) {
  'use strict';
  const WORDS = {
    "naming": [
      "dog",
      "school",
      "apple",
      "teacher",
      "river",
      "chair",
      "mango",
      "bridge",
      "sister",
      "pencil",
      "garden",
      "elephant",
      "window",
      "doctor",
      "mountain",
      "bottle",
      "farmer",
      "pillow",
      "tiger",
      "kitchen"
    ],
    "doing": [
      "eat",
      "sing",
      "write",
      "sleep",
      "drink",
      "climb",
      "swim",
      "laugh",
      "think",
      "whisper",
      "catch",
      "jump",
      "carry",
      "shout",
      "build",
      "hide",
      "wash",
      "read",
      "throw",
      "listen"
    ],
    "describing": [
      "happy",
      "tall",
      "tiny",
      "loud",
      "brave",
      "empty",
      "soft",
      "noisy",
      "shiny",
      "hungry",
      "sleepy",
      "gentle",
      "heavy",
      "dirty",
      "friendly",
      "huge",
      "sticky",
      "clever",
      "quiet",
      "funny"
    ]
  };
  const api = { WORDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KlgQuestions = api;
})(typeof window !== 'undefined' ? window : globalThis);
