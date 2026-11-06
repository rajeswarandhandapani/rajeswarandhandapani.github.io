/* Map Explorer. Rows: [picture, name, continent id]. Only things found on one continent. Places start with a capital or an article. */
(function (root) {
  'use strict';
  const HOMES = [
    ["🦘", "kangaroo", "oceania"], ["🐨", "koala", "oceania"], ["🐼", "giant panda", "asia"], ["🐯", "tiger", "asia"], ["🦁", "lion", "africa"],
    ["🦒", "giraffe", "africa"], ["🦓", "zebra", "africa"], ["🐧", "emperor penguin", "antarctica"], ["🦙", "llama", "south-america"], ["🦬", "bison", "north-america"],
    ["🗼", "the Eiffel Tower", "europe"], ["🗽", "the Statue of Liberty", "north-america"], ["🔺", "the pyramids", "africa"], ["🏯", "a Japanese castle", "asia"], ["🏛️", "an ancient Greek temple", "europe"],
    ["🦧", "orangutan", "asia"], ["🦛", "hippo", "africa"], ["🦍", "mountain gorilla", "africa"], ["🦥", "sloth", "south-america"], ["🦅", "bald eagle", "north-america"], ["🦜", "scarlet macaw", "south-america"],
    ["🕌", "the Taj Mahal", "asia"], ["🧱", "the Great Wall of China", "asia"], ["🗻", "Mount Fuji", "asia"], ["🏟️", "the Colosseum", "europe"], ["🌉", "the Golden Gate Bridge", "north-america"],
    ["🏜️", "the Sahara Desert", "africa"], ["⛰️", "Machu Picchu", "south-america"], ["🐠", "the Great Barrier Reef", "oceania"], ["🎭", "the Sydney Opera House", "oceania"],
  ];
  const api = { HOMES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KlgQuestions = api;
})(typeof window !== 'undefined' ? window : globalThis);
