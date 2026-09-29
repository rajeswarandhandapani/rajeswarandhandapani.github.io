'use strict';
const FEELINGS = [
  ['😊','happy'], ['😢','sad'], ['😠','angry'],
  ['😨','scared'], ['😮','surprised'], ['😌','calm']
];
const MOMENTS = [
  ['Mia got a big hug from her grandma. How does Mia feel?', 'happy'],
  ['Leo found his lost puppy. How does Leo feel?', 'happy'],
  ['Nila is laughing while she plays with her friend. How does Nila feel?', 'happy'],
  ['Sam lost his favorite toy and began to cry. How does Sam feel?', 'sad'],
  ['Ava misses her friend and has tears in her eyes. How does Ava feel?', 'sad'],
  ['The little bear dropped its ice cream and started to cry. How does the bear feel?', 'sad'],
  ["Ben's tower was knocked over. He frowned and stomped his feet. How does Ben feel?", 'angry'],
  ['Jo asked someone to stop taking her toys. She frowned. How does Jo feel?', 'angry'],
  ['The fox growled because another fox grabbed its snack. How does the fox feel?', 'angry'],
  ['Omar heard a loud thunderclap and hid under his blanket. How does Omar feel?', 'scared'],
  ['The kitten saw a big barking dog and ran to hide. How does the kitten feel?', 'scared'],
  ['A dark room made Zara tremble and hold Dad’s hand. How does Zara feel?', 'scared'],
  ['Dad opened a box and found a surprise birthday cake inside. How does Dad feel?', 'surprised'],
  ['A butterfly landed on Nila’s nose when she did not expect it. How does Nila feel?', 'surprised'],
  ['Ava opened her bag and found a mystery gift. Her eyes grew wide. How does Ava feel?', 'surprised'],
  ['Mia took slow breaths and rested in a quiet garden. How does Mia feel?', 'calm'],
  ['Ben sat quietly and watched the clouds drift by. How does Ben feel?', 'calm'],
  ['The puppy curled up in a warm bed and relaxed. How does the puppy feel?', 'calm']
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
    timePerQuestion: 30,
    generateQuestion: asked => {
      const available = MOMENTS.filter(([prompt]) => !asked.has(prompt));
      const [prompt, feeling] = shuffle(available.length ? available : MOMENTS)[0];
      const answer = FEELINGS.find(item => item[1] === feeling);
      const choices = shuffle([answer, ...shuffle(FEELINGS.filter(item => item !== answer)).slice(0, 3)]);
      return {
        prompt, correctAnswer: answer[0], choices: choices.map(item => item[0]),
        choiceLabels: Object.fromEntries(choices.map(item => [item[0], item[1]])),
        explanation: `That face shows ${feeling}.`
      };
    }
  });
  document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('start-screen').classList.add('d-none'); quiz.start();
  });
  document.getElementById('play-again-btn').addEventListener('click', () => quiz.start());
});
