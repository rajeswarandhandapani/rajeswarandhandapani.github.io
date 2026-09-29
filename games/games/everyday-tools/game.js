'use strict';
const TOOLS = {
  toothbrush: '🪥', spoon: '🥄', scissors: '✂️', umbrella: '☂️',
  pencil: '✏️', broom: '🧹', key: '🔑', cup: '🥤',
  soap: '🧼', comb: '🪮', flashlight: '🔦', clock: '⏰',
  bucket: '🪣', backpack: '🎒', phone: '📱',
  thermometer: '🌡️', paintbrush: '🖌️', camera: '📷',
  hammer: '🔨', headphones: '🎧', shovel: '🪏',
  bandage: '🩹', fork: '🍴', magnifying_glass: '🔍'
};
const QUESTIONS = [
  ['What do we use to brush our teeth?', 'toothbrush', 'spoon', 'comb', 'key'],
  ['What do we use to eat soup?', 'spoon', 'pencil', 'broom', 'scissors'],
  ['What can keep rain off our heads?', 'umbrella', 'cup', 'clock', 'paintbrush'],
  ['What do we use to cut paper?', 'scissors', 'toothbrush', 'phone', 'soap'],
  ['What do we use to write on paper?', 'pencil', 'shovel', 'spoon', 'comb'],
  ['What do we use to sweep the floor?', 'broom', 'camera', 'fork', 'key'],
  ['What opens a locked door?', 'key', 'soap', 'clock', 'paintbrush'],
  ['What do we drink water from?', 'cup', 'scissors', 'hammer', 'backpack'],
  ['What do we use to wash our hands?', 'soap', 'pencil', 'shovel', 'clock'],
  ['What do we use to tidy our hair?', 'comb', 'hammer', 'cup', 'camera'],
  ['What helps us see in the dark?', 'flashlight', 'toothbrush', 'spoon', 'backpack'],
  ['What shows us the time?', 'clock', 'fork', 'umbrella', 'soap'],
  ['What can carry water to a little plant?', 'bucket', 'headphones', 'key', 'scissors'],
  ['What can carry our books to school?', 'backpack', 'soap', 'fork', 'hammer'],
  ['What can we use to call grandma?', 'phone', 'comb', 'shovel', 'clock'],
  ['What checks if we have a fever?', 'thermometer', 'spoon', 'camera', 'broom'],
  ['What do we use to paint a picture?', 'paintbrush', 'key', 'soap', 'fork'],
  ['What can take a picture?', 'camera', 'toothbrush', 'clock', 'shovel'],
  ['What do we use to tap a nail into wood?', 'hammer', 'spoon', 'cup', 'comb'],
  ['What can we wear to listen to music?', 'headphones', 'umbrella', 'broom', 'key'],
  ['What do we use to dig a hole in dirt?', 'shovel', 'phone', 'paintbrush', 'soap'],
  ['What can cover a small scrape?', 'bandage', 'camera', 'scissors', 'backpack'],
  ['What do we use to pick up noodles at dinner?', 'fork', 'clock', 'umbrella', 'comb'],
  ['What makes tiny things look bigger?', 'magnifying_glass', 'broom', 'cup', 'phone']
];
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function name(key) { return key.replaceAll('_', ' '); }
document.addEventListener('DOMContentLoaded', () => {
  const quiz = new QuizEngine({
    totalQuestions: 10,
    timePerQuestion: 25,
    generateQuestion: asked => {
      const available = QUESTIONS.filter(([prompt]) => !asked.has(prompt));
      const [prompt, correct, ...wrong] = shuffle(available.length ? available : QUESTIONS)[0];
      const keys = shuffle([correct, ...wrong]);
      return {
        prompt, correctAnswer: TOOLS[correct], choices: keys.map(key => TOOLS[key]),
        choiceLabels: Object.fromEntries(keys.map(key => [TOOLS[key], name(key)])),
        explanation: `A ${name(correct)} helps with that.`
      };
    }
  });
  document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('start-screen').classList.add('d-none'); quiz.start();
  });
  document.getElementById('play-again-btn').addEventListener('click', () => quiz.start());
});
