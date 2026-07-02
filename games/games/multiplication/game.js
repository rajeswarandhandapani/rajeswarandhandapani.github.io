/**
 * Multiplication tables question generator.
 * Reads ?tables=6,7,8 from the URL to restrict practice to specific tables;
 * defaults to tables 1-12.
 */
function getSelectedTables() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("tables");
  if (!raw) return [...Array(12)].map((_, i) => i + 1);
  const tables = raw
    .split(",")
    .map((n) => parseInt(n, 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 12);
  return tables.length ? tables : [...Array(12)].map((_, i) => i + 1);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMultiplicationQuestion(tables) {
  return (askedSet) => {
    const a = tables[randomInt(0, tables.length - 1)];
    const b = randomInt(1, 12);
    const prompt = `${a} × ${b}`;
    const reversePrompt = `${b} × ${a}`;
    if (askedSet.has(prompt) || askedSet.has(reversePrompt)) {
      return generateMultiplicationQuestion(tables)(askedSet);
    }

    const correctAnswer = a * b;
    const choices = new Set([correctAnswer]);
    while (choices.size < 4) {
      const offset = randomInt(-10, 10) || 1;
      const distractor = correctAnswer + offset;
      if (distractor > 0) choices.add(distractor);
    }

    return {
      prompt,
      correctAnswer,
      choices: shuffle([...choices]),
    };
  };
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

document.addEventListener("DOMContentLoaded", () => {
  const tables = getSelectedTables();
  document.getElementById("tables-label").textContent =
    tables.length === 12 ? "Tables 1-12" : `Table${tables.length > 1 ? "s" : ""} ${tables.join(", ")}`;

  const quiz = new QuizEngine({
    totalQuestions: 25,
    timePerQuestion: 10,
    generateQuestion: generateMultiplicationQuestion(tables),
  });

  document.getElementById("start-btn").addEventListener("click", () => {
    document.getElementById("start-screen").classList.add("d-none");
    quiz.start();
  });

  document.getElementById("play-again-btn").addEventListener("click", () => {
    quiz.start();
  });
});
