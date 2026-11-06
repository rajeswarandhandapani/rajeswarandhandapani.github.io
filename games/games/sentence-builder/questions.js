/* Sentence Builder. Rows: [picture, sentence]. Each sentence has one sensible word order, with its capital letter and full stop as clues. */
(function (root) {
  'use strict';
  const SHORT = [
    ["🐱", "The cat sat."], ["🐶", "The dog ran."], ["🐸", "The frog jumps."], ["🌞", "The sun is hot."], ["🐦", "A bird can fly."],
    ["🐟", "Fish can swim."], ["🍎", "I eat an apple."], ["🌧️", "It is raining."], ["🚗", "The car is red."], ["🐷", "The pig is big."],
    ["🐝", "A bee can buzz."], ["🦆", "The duck swims."], ["⚽", "I kick the ball."], ["📖", "I read a book."], ["🌙", "The moon is up."],
    ["🐔", "The hen sat."],
    ["🦋", "A butterfly can fly."],
    ["🐰", "The rabbit hops."],
    ["🍌", "I like bananas."],
    ["🛏️", "I go to bed."],
    ["🏠", "This is my home."],
    ["🐄", "The cow eats grass."],
    ["🌳", "The tree is tall."],
    ["👋", "I wave to you."],
    ["🥛", "We drink milk."],
    ["⭐", "The star is bright."],
    ["🚌", "The bus is big."],
    ["🐢", "The turtle is slow."],
    ["🎈", "My balloon is red."],
    ["🧦", "I lost a sock."],
  ];
  const LONG = [
    ["🐱", "The cat sat on the mat."], ["🐶", "The dog ran to the park."], ["🐸", "The frog jumps into the pond."], ["🐦", "The bird sings in the tree."],
    ["🚲", "The boy rides his red bike."], ["🍏", "The girl eats a big apple."], ["☔", "We use an umbrella when it rains."], ["🐢", "The slow turtle walks to the lake."],
    ["🐘", "The big elephant drinks water."], ["🚌", "The bus takes us to school."], ["🍰", "We eat cake on my birthday."], ["🏊", "She swims in the pool."],
    ["🌻", "The flower grows in the garden."], ["🐝", "The bee flies to a flower."],
    ["🐄", "The cow gives us fresh milk."],
    ["🧒", "The boy kicks the ball high."],
    ["🌧️", "Rain falls from the dark clouds."],
    ["🐒", "A monkey climbs up the tree."],
    ["🍌", "She peels a yellow banana slowly."],
    ["📚", "We read books at the library."],
    ["🐟", "The small fish swims in the pond."],
    ["🚂", "The long train stops at the station."],
    ["🍕", "My sister eats a slice of pizza."],
    ["🌞", "The sun rises in the morning."],
    ["🐶", "My dog sleeps under the table."],
    ["🦉", "An owl hunts late at night."],
    ["🧹", "Dad sweeps the kitchen floor clean."],
    ["🚲", "I ride my bike to school."],
    ["🪁", "The kite flies above the houses."],
    ["🦷", "I brush my teeth every night."],
  ];
  const api = { SHORT, LONG };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KlgQuestions = api;
})(typeof window !== 'undefined' ? window : globalThis);
