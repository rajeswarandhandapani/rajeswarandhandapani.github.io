'use strict';
const PICTURE_WORDS = [
  ['🍎','apple','food'], ['🍌','banana','food'], ['🍓','strawberry','food'], ['🍋','lemon','food'],
  ['🍉','watermelon','food'], ['🥕','carrot','food'], ['🍅','tomato','food'], ['🍞','bread','food'],
  ['🐶','dog','animal'], ['🐱','cat','animal'], ['🐸','frog','animal'], ['🐢','turtle','animal'],
  ['🦋','butterfly','animal'], ['🐟','fish','animal'], ['🐘','elephant','animal'], ['🐧','penguin','animal'],
  ['🚗','car','travel'], ['🚌','bus','travel'], ['🚲','bicycle','travel'], ['✈️','airplane','travel'],
  ['🚀','rocket','travel'], ['🚂','train','travel'], ['⛵','sailboat','travel'], ['🚁','helicopter','travel'],
  ['👟','shoe','things'], ['🎒','backpack','things'], ['📚','books','things'], ['🪥','toothbrush','things'],
  ['🧸','teddy bear','things'], ['☂️','umbrella','things'], ['⚽','soccer ball','things'], ['🔑','key','things']
];
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
document.addEventListener('DOMContentLoaded', () => {
  const quiz = new QuizEngine({
    totalQuestions: 10,
    timePerQuestion: 25,
    generateQuestion: asked => {
      const available = PICTURE_WORDS.filter(item => !asked.has(item[1]));
      const answer = shuffle(available.length ? available : PICTURE_WORDS)[0];
      const sameGroup = shuffle(PICTURE_WORDS.filter(item => item !== answer && item[2] === answer[2]));
      const choices = shuffle([answer, ...sameGroup.slice(0, 3)]);
      return {
        prompt: `Find the ${answer[1]}.`, dedupeKey: answer[1],
        correctAnswer: answer[0], choices: choices.map(item => item[0]),
        choiceLabels: Object.fromEntries(choices.map(item => [item[0], item[1]])),
        reviewPrompt: `Find the ${answer[1]}.`
      };
    }
  });
  document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('start-screen').classList.add('d-none'); quiz.start();
  });
  document.getElementById('play-again-btn').addEventListener('click', () => quiz.start());
});
