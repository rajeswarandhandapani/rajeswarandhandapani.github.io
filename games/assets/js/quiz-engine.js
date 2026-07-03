/**
 * Reusable multiple-choice quiz engine for Kid Learning Games.
 *
 * Usage:
 *   const quiz = new QuizEngine({
 *     totalQuestions: 25,
 *     timePerQuestion: 10,
 *     generateQuestion: (askedSet) => ({ prompt, correctAnswer, choices }),
 *       // optional: dedupeKey — used instead of prompt to avoid repeats,
 *       // for games where the visible prompt isn't unique (e.g. audio
 *       // questions that all display 🔊)
 *     formatAnswer: (value) => String(value),   // optional
 *     onFinish: (result) => { ... },            // optional, receives
 *       { score, total, elapsedMs } — elapsedMs is time spent answering
 *       (question shown -> answered), excluding feedback pauses
 *   });
 *   quiz.start();
 *
 * Expects this DOM structure to exist on the page (see games/multiplication/index.html):
 *   #quiz-screen, #question-number, #total-questions, #score-pill,
 *   #timer-fill, #timer-text, #question-text, #choices-container,
 *   #results-screen, #results-score, #results-emoji, #results-stars,
 *   #results-message, #results-review
 *
 * Optional elements (skipped if absent):
 *   #streak-badge, #quiz-mascot, #progress-fill
 *
 * Sound effects come from window.KlgSounds (assets/js/sounds.js) when loaded;
 * the engine works silently without it.
 */
class QuizEngine {
  constructor(options) {
    this.totalQuestions = options.totalQuestions || 25;
    this.timePerQuestion = options.timePerQuestion || 10;
    this.generateQuestion = options.generateQuestion;
    this.formatAnswer = options.formatAnswer || ((v) => String(v));
    this.onFinish = options.onFinish || (() => {});
    this.correctDelay = options.correctDelay || 900;
    this.incorrectDelay = options.incorrectDelay || 2500;

    this.currentIndex = 0;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.askedPrompts = new Set();
    this.wrongAnswers = [];
    this.timerInterval = null;
    this.timeRemaining = this.timePerQuestion;
    this.locked = false;
    this.elapsedMs = 0;
    this.questionStartMs = 0;

    this._cacheDom();
  }

  _cacheDom() {
    this.el = {
      quizScreen: document.getElementById("quiz-screen"),
      resultsScreen: document.getElementById("results-screen"),
      questionNumber: document.getElementById("question-number"),
      totalQuestions: document.getElementById("total-questions"),
      scorePill: document.getElementById("score-pill"),
      timerFill: document.getElementById("timer-fill"),
      timerText: document.getElementById("timer-text"),
      questionText: document.getElementById("question-text"),
      choicesContainer: document.getElementById("choices-container"),
      resultsScore: document.getElementById("results-score"),
      resultsEmoji: document.getElementById("results-emoji"),
      resultsStars: document.getElementById("results-stars"),
      resultsMessage: document.getElementById("results-message"),
      resultsReview: document.getElementById("results-review"),
      streakBadge: document.getElementById("streak-badge"),
      mascot: document.getElementById("quiz-mascot"),
      progressFill: document.getElementById("progress-fill"),
    };
    this.el.totalQuestions.textContent = this.totalQuestions;
  }

  start() {
    this.currentIndex = 0;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.askedPrompts.clear();
    this.wrongAnswers = [];
    this.elapsedMs = 0;
    this.el.resultsScreen.classList.add("d-none");
    this.el.quizScreen.classList.remove("d-none");
    this._updateScorePill();
    this._hideStreakBadge();
    this._setMascot("🐵");
    if (this.el.progressFill) this.el.progressFill.style.width = "0%";
    this._nextQuestion();
  }

  _nextQuestion() {
    if (this.currentIndex >= this.totalQuestions) {
      this._finish();
      return;
    }
    this.locked = false;
    this.currentIndex += 1;
    this.currentQuestion = this._makeUniqueQuestion();
    this.el.questionNumber.textContent = this.currentIndex;
    this.el.questionText.textContent = this.currentQuestion.prompt;
    this._renderChoices(this.currentQuestion.choices);
    this._replayAnimation(this.el.questionText, "klg-anim-in");
    this._replayAnimation(this.el.choicesContainer, "klg-anim-in");
    if (this.el.progressFill) {
      const pct = ((this.currentIndex - 1) / this.totalQuestions) * 100;
      this.el.progressFill.style.width = pct + "%";
    }
    this._startTimer();
    this.questionStartMs = Date.now();
  }

  _makeUniqueQuestion() {
    let question;
    let key;
    let attempts = 0;
    do {
      question = this.generateQuestion(this.askedPrompts);
      key = question.dedupeKey !== undefined ? question.dedupeKey : question.prompt;
      attempts += 1;
    } while (this.askedPrompts.has(key) && attempts < 50);
    this.askedPrompts.add(key);
    return question;
  }

  _renderChoices(choices) {
    this.el.choicesContainer.innerHTML = "";
    choices.forEach((choice) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn quiz-choice-btn col-5 m-2";
      btn.textContent = this.formatAnswer(choice);
      btn.addEventListener("click", () => this._handleAnswer(choice, btn));
      this.el.choicesContainer.appendChild(btn);
    });
  }

  _startTimer() {
    clearInterval(this.timerInterval);
    this.timeRemaining = this.timePerQuestion;
    this._renderTimer();
    this.timerInterval = setInterval(() => {
      this.timeRemaining -= 1;
      this._renderTimer();
      if (this.timeRemaining <= 0) {
        this._handleAnswer(null, null);
      } else if (this.timeRemaining <= 3 && window.KlgSounds) {
        KlgSounds.tick();
      }
    }, 1000);
  }

  _renderTimer() {
    const pct = Math.max(0, (this.timeRemaining / this.timePerQuestion) * 100);
    this.el.timerFill.style.width = pct + "%";
    this.el.timerFill.classList.toggle("warn", this.timeRemaining <= 3);
    this.el.timerText.textContent = Math.max(0, this.timeRemaining) + "s";
  }

  _handleAnswer(selected, btnEl) {
    if (this.locked) return;
    this.locked = true;
    clearInterval(this.timerInterval);
    this.elapsedMs += Date.now() - this.questionStartMs;

    const correct = this.currentQuestion.correctAnswer;
    const isCorrect = selected !== null && selected === correct;
    if (isCorrect) {
      this.score += 1;
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this._celebrateCorrect(btnEl);
    } else {
      this.streak = 0;
      this._hideStreakBadge();
      this._setMascot("😢", "sad");
      if (window.KlgSounds) {
        selected === null ? KlgSounds.timeUp() : KlgSounds.wrong();
      }
      this.wrongAnswers.push({
        prompt: this.currentQuestion.prompt,
        correctAnswer: this.formatAnswer(correct),
        givenAnswer: selected === null ? "No answer (time's up)" : this.formatAnswer(selected),
      });
    }
    this._updateScorePill();

    Array.from(this.el.choicesContainer.children).forEach((btn) => {
      btn.disabled = true;
      const value = btn.textContent;
      if (value === this.formatAnswer(correct)) {
        btn.classList.add("correct");
      } else if (btn === btnEl) {
        btn.classList.add("incorrect");
      }
    });

    setTimeout(() => this._nextQuestion(), isCorrect ? this.correctDelay : this.incorrectDelay);
  }

  _updateScorePill() {
    this.el.scorePill.textContent = `Score: ${this.score}`;
  }

  _celebrateCorrect(btnEl) {
    if (window.KlgSounds) KlgSounds.correct(this.streak);
    this._setMascot("😄", "happy");
    this._replayAnimation(this.el.scorePill, "klg-score-pop");

    if (btnEl) {
      const rect = btnEl.getBoundingClientRect();
      this._spawnFloatEmoji(rect);
      if (typeof confetti === "function") {
        const burst =
          this.streak === 10 ? 80 : this.streak === 5 ? 40 : 14;
        confetti({
          particleCount: burst,
          spread: 55,
          scalar: 0.7,
          ticks: 50,
          origin: {
            x: (rect.left + rect.width / 2) / window.innerWidth,
            y: (rect.top + rect.height / 2) / window.innerHeight,
          },
        });
      }
    }

    if (this.streak >= 3 && this.el.streakBadge) {
      this.el.streakBadge.textContent = `🔥 ${this.streak} in a row!`;
      this._replayAnimation(this.el.streakBadge, "show");
    }
  }

  _spawnFloatEmoji(rect) {
    const span = document.createElement("span");
    span.className = "klg-float-emoji";
    span.textContent = "✨";
    span.style.left = rect.left + rect.width / 2 - 12 + "px";
    span.style.top = rect.top - 10 + "px";
    document.body.appendChild(span);
    setTimeout(() => span.remove(), 900);
  }

  _hideStreakBadge() {
    if (this.el.streakBadge) this.el.streakBadge.classList.remove("show");
  }

  _setMascot(face, mood) {
    if (!this.el.mascot) return;
    this.el.mascot.textContent = face;
    this.el.mascot.classList.remove("happy", "sad");
    if (mood) {
      void this.el.mascot.offsetWidth;
      this.el.mascot.classList.add(mood);
    }
  }

  /** Remove and re-add a class so its CSS animation restarts. */
  _replayAnimation(el, className) {
    if (!el) return;
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  }

  _finish() {
    clearInterval(this.timerInterval);
    this.el.quizScreen.classList.add("d-none");
    this.el.resultsScreen.classList.remove("d-none");

    const pct = this.score / this.totalQuestions;
    this._animateScoreCountUp();

    let emoji, message, stars, launchConfetti;
    if (pct >= 0.9) {
      emoji = "🏆";
      message = "Outstanding! You're a superstar!";
      stars = "⭐⭐⭐";
      launchConfetti = true;
    } else if (pct >= 0.7) {
      emoji = "🎉";
      message = "Great job! Keep practicing!";
      stars = "⭐⭐";
      launchConfetti = true;
    } else if (pct >= 0.5) {
      emoji = "👍";
      message = "Good effort! Try again to beat your score!";
      stars = "⭐";
      launchConfetti = false;
    } else {
      emoji = "💪";
      message = "Keep practicing, you'll get it!";
      stars = "";
      launchConfetti = false;
    }
    this.el.resultsEmoji.textContent = emoji;
    this.el.resultsMessage.textContent = message;
    this._renderStars([...stars].length);

    if (launchConfetti) {
      if (window.KlgSounds) KlgSounds.fanfare();
      if (typeof confetti === "function") this._launchConfetti();
    }

    this._renderReview();

    this.onFinish({
      score: this.score,
      total: this.totalQuestions,
      elapsedMs: this.elapsedMs,
      bestStreak: this.bestStreak,
    });
  }

  _renderStars(count) {
    this.el.resultsStars.innerHTML = "";
    for (let i = 0; i < count; i += 1) {
      const star = document.createElement("span");
      star.className = "klg-star";
      star.textContent = "⭐";
      star.style.animationDelay = i * 0.3 + "s";
      this.el.resultsStars.appendChild(star);
    }
  }

  _animateScoreCountUp() {
    const target = this.score;
    const total = this.totalQuestions;
    const duration = 800;
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const value = Math.round(target * progress);
      this.el.resultsScore.textContent = `${value} / ${total}`;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  _renderReview() {
    if (!this.el.resultsReview) return;
    this.el.resultsReview.innerHTML = "";

    if (this.wrongAnswers.length === 0) {
      this.el.resultsReview.innerHTML =
        '<p class="text-success fw-bold text-center mb-0">Perfect score, no mistakes!</p>';
      return;
    }

    const heading = document.createElement("h3");
    heading.className = "h6 fw-bold text-muted mt-4 mb-2";
    heading.textContent = "Review your missed questions:";
    this.el.resultsReview.appendChild(heading);

    const list = document.createElement("ul");
    list.className = "list-group";
    this.wrongAnswers.forEach((item) => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center flex-wrap";

      const promptSpan = document.createElement("span");
      promptSpan.className = "fw-bold";
      promptSpan.textContent = item.prompt;

      const answersSpan = document.createElement("span");

      const givenSpan = document.createElement("span");
      givenSpan.className = "text-decoration-line-through text-danger me-2";
      givenSpan.textContent = item.givenAnswer;

      const correctSpan = document.createElement("span");
      correctSpan.className = "text-success fw-bold";
      correctSpan.textContent = item.correctAnswer;

      answersSpan.appendChild(givenSpan);
      answersSpan.appendChild(correctSpan);
      li.appendChild(promptSpan);
      li.appendChild(answersSpan);
      list.appendChild(li);
    });
    this.el.resultsReview.appendChild(list);
  }

  _launchConfetti() {
    const duration = 2000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }
}
