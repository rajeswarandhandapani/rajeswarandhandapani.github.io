/* Solar System written facts. Contested facts are left out or asked in a form with one clean answer. */
(function (root) {
  'use strict';
  const FACTS = [
    {
      q: "Which planet is known as the Red Planet? 🔴",
      a: "Mars",
      wrong: ["Venus", "Jupiter", "Mercury"],
    },
    {
      q: "Which is the biggest planet in our solar system?",
      a: "Jupiter",
      wrong: ["Saturn", "Earth", "Neptune"],
    },
    {
      q: "Which is the smallest planet in our solar system?",
      a: "Mercury",
      wrong: ["Mars", "Venus", "Earth"],
    },
    {
      q: "Which planet is famous for its bright rings? 🪐",
      a: "Saturn",
      wrong: ["Jupiter", "Uranus", "Mars"],
    },
    {
      q: "Which planet is the hottest?",
      a: "Venus",
      wrong: ["Mercury", "Mars", "Jupiter"],
    },
    {
      q: "How many planets are in our solar system?",
      a: "8",
      wrong: ["7", "9", "12"],
    },
    {
      q: "What is the Sun? ☀️",
      a: "A star",
      wrong: ["A planet", "A moon", "A comet"],
    },
    {
      q: "Which planet do we live on?",
      a: "Earth",
      wrong: ["Mars", "Venus", "The Moon"],
    },
    {
      q: "How long does Earth take to travel once around the Sun?",
      a: "About 1 year",
      wrong: ["About 1 day", "About 1 month", "About 10 years"],
    },
    {
      q: "How long does Earth take to spin around once?",
      a: "About 1 day",
      wrong: ["About 1 hour", "About 1 month", "About 1 year"],
    },
    {
      q: "How many moons does Earth have? 🌙",
      a: "1",
      wrong: ["2", "0", "12"],
    },
    {
      q: "Which planet has the most moons?",
      a: "Saturn",
      wrong: ["Earth", "Mars", "Mercury"],
    },
    {
      q: "What holds the planets going around the Sun?",
      a: "Gravity",
      wrong: ["Wind", "Magnets", "Air"],
    },
    {
      q: "What do we call a big rock flying through space?",
      a: "An asteroid",
      wrong: ["A galaxy", "A planet", "A star"],
    },
    {
      q: "What is a shooting star really?",
      a: "A meteor burning up",
      wrong: ["A baby star", "A rocket", "A planet moving"],
    },
    {
      q: "Where is the asteroid belt?",
      a: "Between Mars and Jupiter",
      wrong: ["Between Earth and Mars", "Around the Sun's surface", "Past Neptune"],
    },
    {
      q: "Who was the first person to walk on the Moon?",
      a: "Neil Armstrong",
      wrong: ["Yuri Gagarin", "Kalpana Chawla", "Isaac Newton"],
    },
    {
      q: "Is Pluto a planet?",
      a: "No — it is a dwarf planet",
      wrong: ["Yes — the 9th planet", "No — it is a moon", "Yes — the 10th planet"],
    },
    {
      q: "Why can't people breathe on the Moon?",
      a: "There is no air there",
      wrong: ["It is too bright", "It spins too fast", "It is made of cheese"],
    },
    {
      q: "What do we call the galaxy we live in?",
      a: "The Milky Way",
      wrong: ["The Big Dipper", "Andromeda", "The Solar Way"],
    },
    {
      q: "Which planet spins on its side, like a rolling ball?",
      a: "Uranus",
      wrong: ["Neptune", "Saturn", "Mercury"],
    },
    {
      // "Coldest" is a genuine toss-up between Neptune and Uranus, so ask
      // the question that has one clean answer instead.
      q: "Which planet is farthest from the Sun?",
      a: "Neptune",
      wrong: ["Uranus", "Saturn", "Jupiter"],
    },
    {
      q: "What is the closest star to Earth?",
      a: "The Sun",
      wrong: ["The North Star", "The Moon", "Jupiter"],
    },
    {
      q: "What do we call a person who travels into space?",
      a: "An astronaut",
      wrong: ["A pilot", "A scientist", "An astronomer"],
    },
    {
      q: "What makes the Moon look bright at night?",
      a: "Sunlight bouncing off it",
      wrong: ["It is burning", "It is a star", "Its own lamps"],
    },
    { q: "Which planet is closest to the Sun?", a: "Mercury", wrong: ["Venus","Earth","Mars"] },
  { q: "About how many days are in one Earth year?", a: "365", wrong: ["30","100","1,000"] },
  { q: "Which planet is close to Earth in size and is often called its twin?", a: "Venus", wrong: ["Jupiter","Saturn","Neptune"] },
  { q: "What circles Earth about once a month? 🌍", a: "The Moon", wrong: ["The Sun","Mars","Jupiter"] },
  { q: "What are Saturn’s rings mostly made of? 🪐", a: "Ice and rock", wrong: ["Gold","Fire","Smoke"] },
  { q: "Which planet has a giant storm called the Great Red Spot?", a: "Jupiter", wrong: ["Mercury","Earth","Venus"] },
  { q: "What causes day and night on Earth?", a: "Earth spinning around", wrong: ["The Sun switching off","Clouds covering the Sun","The Moon blocking the Sun"] },
  { q: "What gives Earth its seasons? 🍂", a: "The tilt of Earth", wrong: ["The shape of the Moon","The clouds","The Sun switching on and off"] },
  { q: "What is a comet mostly made of? ☄️", a: "Ice and dust", wrong: ["Plants","Metal coins","Fire only"] },
  { q: "What tool helps us look at far-away stars? ✨", a: "A telescope", wrong: ["A microscope","A thermometer","A stethoscope"] },
  { q: "What must astronauts wear to go outside in space? 👩‍🚀", a: "A spacesuit", wrong: ["A raincoat","A swimsuit","Pajamas"] },
  { q: "Why does Mars look red?", a: "Rusty dust covers it", wrong: ["It is on fire","It is covered in red plants","It is painted"] },
  { q: "What do we call a group of stars that seems to make a picture? 🌌", a: "A constellation", wrong: ["A comet","An asteroid","A moon"] },
  { q: "What is at the center of our solar system?", a: "The Sun", wrong: ["Earth","The Moon","Jupiter"] },
  { q: "Which of these planets is made mostly of gas?", a: "Jupiter", wrong: ["Mercury","Earth","Mars"] },
  { q: "Which of these planets has a rocky surface you could stand on?", a: "Mars", wrong: ["Saturn","Uranus","Neptune"] },
  { q: "About how long does the Moon take to go around Earth? 🌙", a: "About a month", wrong: ["About an hour","About a day","About ten years"] },
  { q: "What happens in a solar eclipse?", a: "The Moon blocks the Sun", wrong: ["Clouds cover the Moon","The Sun goes out","Earth stops spinning"] },
  { q: "What two things does Earth get from the Sun? ☀️", a: "Light and heat", wrong: ["Rocks and ice","Rain and snow","Air and water"] },
  { q: "Which planet has liquid water oceans on its surface? 🌊", a: "Earth", wrong: ["Mars","Venus","Mercury"] },
  ];
  const api = { FACTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KlgQuestions = api;
})(typeof window !== 'undefined' ? window : globalThis);
