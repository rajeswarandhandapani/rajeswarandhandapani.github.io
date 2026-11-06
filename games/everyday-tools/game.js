'use strict';
const { TOOLS } = window.KlgQuestions;
const QUESTIONS = new URLSearchParams(location.search).get('level') === '2' ? window.KlgQuestions.QUESTIONS_2 : window.KlgQuestions.QUESTIONS;
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function name(key) { return key.replaceAll('_', ' '); }
function helps(key) {
  const word = name(key);
  if (['scissors', 'glasses', 'gloves', 'headphones', 'socks'].includes(key)) return `${word[0].toUpperCase()}${word.slice(1)} help with that.`;
  return `${/^[aeiou]/.test(word) ? 'An' : 'A'} ${word} helps with that.`;
}
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
        explanation: helps(correct)
      };
    }
  });
  document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('start-screen').classList.add('d-none'); quiz.start();
  });
  document.getElementById('play-again-btn').addEventListener('click', () => quiz.start());
});
