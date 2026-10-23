/**
 * Tamil days of the week, months and extra colours for the Tamil Days & Colours game.
 * Each entry has Tamil, English, and what to draw (the game does the drawing):
 *   days    — position in the week (Sunday first, like a wall calendar)
 *   months  — month number 1–12 (the usual January–December calendar)
 *   colours — a CSS colour for the swatch
 * `scripts/fetch-tamil-audio.cjs` reads every `tamil: "…"` in this file, so a
 * new word picks up a recording the next time `npm run audio:tamil` runs.
 */
(function (root) {
  "use strict";
  const DAYS = [
    { tamil: "ஞாயிறு", english: "Sunday", day: 0 },
    { tamil: "திங்கள்", english: "Monday", day: 1 },
    { tamil: "செவ்வாய்", english: "Tuesday", day: 2 },
    { tamil: "புதன்", english: "Wednesday", day: 3 },
    { tamil: "வியாழன்", english: "Thursday", day: 4 },
    { tamil: "வெள்ளி", english: "Friday", day: 5 },
    { tamil: "சனி", english: "Saturday", day: 6 },
  ];
  const MONTHS = [
    { tamil: "ஜனவரி", english: "January", month: 1 },
    { tamil: "பிப்ரவரி", english: "February", month: 2 },
    { tamil: "மார்ச்", english: "March", month: 3 },
    { tamil: "ஏப்ரல்", english: "April", month: 4 },
    { tamil: "மே", english: "May", month: 5 },
    { tamil: "ஜூன்", english: "June", month: 6 },
    { tamil: "ஜூலை", english: "July", month: 7 },
    { tamil: "ஆகஸ்ட்", english: "August", month: 8 },
    { tamil: "செப்டம்பர்", english: "September", month: 9 },
    { tamil: "அக்டோபர்", english: "October", month: 10 },
    { tamil: "நவம்பர்", english: "November", month: 11 },
    { tamil: "டிசம்பர்", english: "December", month: 12 },
  ];
  const COLOURS = [
    { tamil: "சிவப்பு", english: "red", css: "#e53935" },
    { tamil: "நீலம்", english: "blue", css: "#1e88e5" },
    { tamil: "பச்சை", english: "green", css: "#43a047" },
    { tamil: "மஞ்சள்", english: "yellow", css: "#fdd835" },
    { tamil: "ஆரஞ்சு", english: "orange", css: "#fb8c00" },
    { tamil: "ஊதா", english: "purple", css: "#8e24aa" },
    { tamil: "கருப்பு", english: "black", css: "#212121" },
    { tamil: "வெள்ளை", english: "white", css: "#ffffff" },
    { tamil: "பழுப்பு", english: "brown", css: "#795548" },
    { tamil: "இளஞ்சிவப்பு", english: "pink", css: "#f48fb1" },
  ];
  const api = { DAYS, MONTHS, COLOURS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.TamilDaysData = api;
})(typeof window !== "undefined" ? window : globalThis);
