/**
 * KlgWordPics — one emoji for everyday words, shared by the picture modes of
 * Rhyming Words, Opposites and Spelling Bee and by the phonics games.
 *
 *   KlgWordPics.pic("cat")      -> "🐱" (or undefined)
 *   KlgWordPics.has("cat")      -> true
 *   KlgWordPics.PICS            the whole word -> emoji table
 *   KlgWordPics.OPPOSITES       picture-friendly opposite pairs ["hot", "cold"]
 *
 * Only words with a clear single picture are listed, so a picture never
 * leaves a child guessing which word is meant. Add new ones here.
 */
(function () {
  "use strict";

  const PICS = {
    // animals
    cat: "🐱", dog: "🐕", pig: "🐖", hen: "🐔", rat: "🐀", bat: "🦇", frog: "🐸", bug: "🐛", bee: "🐝", snake: "🐍", snail: "🐌", whale: "🐋",
    fish: "🐟", cow: "🐄", duck: "🦆", horse: "🐴", sheep: "🐑", goat: "🐐", mouse: "🐭", lion: "🦁", bear: "🐻", fox: "🦊", owl: "🦉", crab: "🦀",
    // food
    cake: "🍰", bun: "🍞", nut: "🥜", chip: "🍟", tea: "🍵", pie: "🥧", egg: "🥚", milk: "🥛", apple: "🍎", pizza: "🍕", corn: "🌽", pear: "🍐",
    // things
    hat: "🎩", cap: "🧢", bag: "👜", bed: "🛏️", pen: "🖊️", pin: "📌", ship: "🚢", lip: "👄", log: "🪵", pot: "🍲", mug: "☕", sock: "🧦",
    rock: "🪨", clock: "⏰", lock: "🔒", key: "🔑", bell: "🔔", ring: "💍", king: "🤴", crown: "👑", ball: "⚽", jar: "🫙", can: "🥫", map: "🗺️",
    flag: "🚩", kite: "🪁", light: "💡", car: "🚗", van: "🚐", jet: "✈️", plane: "✈️", train: "🚆", bus: "🚌", bike: "🚲", boat: "⛵", net: "🥅",
    book: "📖", cup: "🥤", box: "📦", drum: "🥁", gift: "🎁", sun: "☀️", moon: "🌙", star: "⭐", rain: "🌧️", cloud: "☁️", snow: "❄️", fire: "🔥",
    // nature
    tree: "🌳", sea: "🌊", lake: "🏞️", shell: "🐚", flower: "🌸", leaf: "🍃", hill: "⛰️", hut: "🛖", town: "🏘️", clown: "🤡", chain: "⛓️", pail: "🪣",
    mail: "✉️", wall: "🧱", block: "🧱", game: "🎮", flame: "🔥", dot: "⚫", ten: "🔟", man: "👨", hug: "🤗",
    // body
    hand: "✋", foot: "🦶", eye: "👀", ear: "👂", nose: "👃", mouth: "👄", tooth: "🦷",
    // actions & feelings (used by opposites)
    run: "🏃", sleep: "😴", nap: "😴", laugh: "😂", cry: "😢", happy: "😊", sad: "😢", hot: "🥵", cold: "🥶", wet: "💦", dry: "🏜️",
    day: "🌞", night: "🌙", up: "⬆️", down: "⬇️", open: "📖", closed: "📕", full: "🍽️", empty: "🫙", fast: "🐇", slow: "🐢",
    big: "🐘", small: "🐭", tall: "🦒", short: "🐁", strong: "💪", weak: "🥱", clean: "🧼", dirty: "🐷", old: "👴", young: "👶",
    loud: "📢", quiet: "🤫", heavy: "🏋️", soft: "🧸", hard: "🪨", near: "🏠", far: "🏔️", thick: "📚", thin: "📄",
    float: "🛟", sink: "⚓", win: "🏆", lose: "😞", push: "👉", pull: "🫴", sweet: "🍬", sour: "🍋", rich: "🤑", poor: "🪙",
  };

  // Words whose picture would be a giveaway or ambiguous are left out on purpose.
  const OPPOSITES = [
    ["hot", "cold"], ["wet", "dry"], ["day", "night"], ["up", "down"], ["open", "closed"], ["full", "empty"], ["fast", "slow"],
    ["big", "small"], ["tall", "short"], ["strong", "weak"], ["clean", "dirty"], ["old", "young"], ["loud", "quiet"],
    ["happy", "sad"], ["near", "far"], ["thick", "thin"], ["float", "sink"], ["win", "lose"], ["push", "pull"],
    ["sweet", "sour"], ["rich", "poor"], ["soft", "hard"],
  ];

  window.KlgWordPics = {
    PICS: PICS,
    OPPOSITES: OPPOSITES,
    pic: function (word) { return PICS[word]; },
    has: function (word) { return Object.prototype.hasOwnProperty.call(PICS, word); },
  };
})();
