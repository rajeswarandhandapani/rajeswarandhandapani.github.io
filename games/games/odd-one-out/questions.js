/* Odd One Out. Rows: three that belong, then the odd one, then why. Each set has one clear reason, chosen so no other picture could be the answer. */
(function (root) {
  'use strict';
  const SETS = {
    1: [
      [["🍎","apple"],["🍌","banana"],["🍇","grapes"],["🚗","car"],"A car is not a fruit."],
      [["🐶","dog"],["🐱","cat"],["🐰","rabbit"],["🪑","chair"],"A chair is not an animal."],
      [["🔴","red circle"],["🟢","green circle"],["🔵","blue circle"],["🟦","blue square"],"The square is not a circle."],
      [["🚗","car"],["🚌","bus"],["🚲","bike"],["🍰","cake"],"You cannot ride on a cake."],
      [["👕","T-shirt"],["🧦","socks"],["🧢","cap"],["🥕","carrot"],"You cannot wear a carrot."],
      [["✏️","pencil"],["🖍️","crayon"],["🖊️","pen"],["🥄","spoon"],"You do not draw with a spoon."],
      [["⚽","football"],["🏀","basketball"],["🎾","tennis ball"],["📖","book"],"A book is not a ball."],
      [["🌹","rose"],["🌻","sunflower"],["🌷","tulip"],["🐟","fish"],"A fish is not a flower."],
      [["🥁","drum"],["🎸","guitar"],["🎺","trumpet"],["🧦","sock"],"A sock is not a musical instrument."],
      [["🐟","fish"],["🐬","dolphin"],["🐙","octopus"],["🐘","elephant"],"An elephant does not live in the sea."],
      [["☀️","sun"],["🌙","moon"],["⭐","star"],["🍞","bread"],"Bread is not in the sky."],
      [["🥄","spoon"],["🍴","fork"],["🔪","knife"],["🧸","teddy bear"],"A teddy bear is not for eating with."],
      [["1️⃣","one"],["2️⃣","two"],["3️⃣","three"],["🅰️","the letter A"],"A is a letter, not a number."],
      [["🛏️","bed"],["🛋️","sofa"],["🪑","chair"],["🐄","cow"],"A cow is not furniture."],
      [["😀","happy face"],["😄","smiling face"],["😁","grinning face"],["😢","crying face"],"Three faces are happy. One is sad."],
    ],
    2: [
      [["🐦","bird"],["🦋","butterfly"],["🐝","bee"],["🐧","penguin"],"A penguin cannot fly."],
      [["🥕","carrot"],["🥦","broccoli"],["🥔","potato"],["🍎","apple"],"An apple is a fruit. The others are vegetables."],
      [["🐍","snake"],["🐊","crocodile"],["🐢","turtle"],["🐸","frog"],"A frog is an amphibian. The others are reptiles."],
      [["🐄","cow"],["🐑","sheep"],["🐖","pig"],["🦁","lion"],"A lion is not a farm animal."],
      [["🍊","orange"],["⚽","football"],["🌕","full moon"],["📦","box"],"A box has corners. The others are round."],
      [["🚁","helicopter"],["✈️","plane"],["🎈","balloon"],["🚢","ship"],"A ship does not fly."],
      [["🧊","ice"],["⛄","snowman"],["🍦","ice cream"],["🔥","fire"],"Fire is hot. The others are cold."],
      [["🦅","eagle"],["🦉","owl"],["🦜","parrot"],["🦇","bat"],"A bat is a mammal. The others are birds."],
      [["🐋","whale"],["🐬","dolphin"],["🦭","seal"],["🦈","shark"],"A shark is a fish. The others are mammals."],
      [["🌧️","rain"],["❄️","snow"],["⛈️","storm"],["🌈","rainbow"],"A rainbow does not fall from the sky."],
      [["🍋","lemon"],["🌻","sunflower"],["🐤","chick"],["🍅","tomato"],"A tomato is red. The others are yellow."],
      [["🕐","clock"],["⏰","alarm clock"],["⌚","watch"],["📏","ruler"],"A ruler measures length. The others tell the time."],
      [["🐜","ant"],["🐝","bee"],["🐞","ladybird"],["🕷️","spider"],"A spider has eight legs. The others are insects with six."],
      [["🌍","Earth"],["🪐","Saturn"],["🌙","Moon"],["☀️","Sun"],"The Sun is a star. The others are not."],
      [["🥛","milk"],["🧀","cheese"],["🧈","butter"],["🍞","bread"],"Bread does not come from milk."],
      [["🚒","fire engine"],["🚑","ambulance"],["🚓","police car"],["🚜","tractor"],"A tractor is not an emergency vehicle."],
    ],
  };
  const api = { SETS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KlgQuestions = api;
})(typeof window !== 'undefined' ? window : globalThis);
