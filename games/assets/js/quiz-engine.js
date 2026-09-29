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
 * the engine works silently without it. Likewise, when
 * assets/js/progress.js is loaded every finished quiz is banked with
 * window.KlgProgress and the XP/rank/badges panel is injected into the
 * results screen; without it the results screen is unchanged.
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
    this.practice = true;
    this.transitionTimer = null;
    this.speechAvailable = typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined';
    this._installLearningControls();
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

  _installLearningControls() {
    const startButton = document.getElementById('start-btn');
    const settings = document.createElement('div');
    settings.className = 'quiz-settings';
    settings.innerHTML = '<label>How would you like to play?<select id="play-mode"><option value="practice">Practice · no timer</option><option value="challenge">Challenge · timed</option></select></label>';
    startButton.before(settings);
    const info = document.getElementById('quiz-info');
    const originalInfo = info ? info.textContent : '';
    const refreshMode = () => {
      const practice = settings.querySelector('select').value === 'practice';
      if (info) info.textContent = practice ? originalInfo.replace(/\d+ seconds (each|per question)/g, 'no time limit').replace(/timed /gi, '') : originalInfo;
      const best = document.getElementById('best-time-note');
      if (best) best.hidden = practice;
    };
    settings.querySelector('select').addEventListener('change', refreshMode);
    refreshMode();
    if (this.speechAvailable) {
      const instructions = document.createElement('button');
      instructions.type = 'button';
      instructions.className = 'quiz-listen quiz-intro-listen';
      instructions.textContent = '🔊 Hear how to play';
      instructions.addEventListener('click', () => {
        const title = document.querySelector('#start-screen h1')?.textContent || 'Game';
        const detail = document.querySelector('#start-screen .text-muted small')?.textContent || '';
        this._speak(`${title}. ${detail || info?.textContent || 'Choose an answer for each question.'}`);
      });
      startButton.before(instructions);
    }
    const feedback = document.createElement('p');
    feedback.className = 'quiz-feedback';
    feedback.id = 'quiz-feedback';
    feedback.setAttribute('role', 'status');
    this.el.choicesContainer.after(feedback);
    this.feedback = feedback;
    this.nextButton = document.createElement('button');
    this.nextButton.className = 'quiz-next';
    this.nextButton.textContent = 'Next question →';
    this.nextButton.hidden = true;
    feedback.after(this.nextButton);
    this.nextButton.addEventListener('click', () => { if (this.locked) { clearTimeout(this.transitionTimer); this._nextQuestion(); } });
    this.el.questionText.tabIndex = -1;
    this.el.questionText.addEventListener('keydown', event => {
      if (this.el.questionText.classList.contains('klg-tappable') && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); this.el.questionText.click(); }
    });
    this.el.resultsScreen.tabIndex = -1;
    const tools = document.createElement('div');
    tools.className = 'quiz-tools';
    tools.innerHTML = '<button type="button" id="quiz-exit">← Change activity</button><span class="small text-muted">Take your time. You’re learning!</span>';
    this.el.quizScreen.prepend(tools);
    this.listenButton = document.createElement('button');
    this.listenButton.type = 'button';
    this.listenButton.className = 'quiz-listen';
    this.listenButton.textContent = '🔊 Listen to question';
    this.listenButton.setAttribute('aria-label', 'Listen to the question again');
    this.el.questionText.after(this.listenButton);
    this.listenButton.addEventListener('click', () => this._speakQuestion());
    tools.querySelector('button').addEventListener('click', () => {
      clearInterval(this.timerInterval);
      clearTimeout(this.transitionTimer);
      this.locked = true;
      if (window.speechSynthesis) speechSynthesis.cancel();
      this.el.quizScreen.classList.add('d-none');
      document.getElementById('start-screen').classList.remove('d-none');
      startButton.focus();
    });
    // A hidden tab must not use up a child's answering time.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.hiddenAt = Date.now();
      else if (this.hiddenAt) { const away = Date.now() - this.hiddenAt; this.questionStartMs += away; if (this.deadline) this.deadline += away; this.hiddenAt = 0; }
    });
  }

  start() {
    clearInterval(this.timerInterval);
    clearTimeout(this.transitionTimer);
    this.practice = document.getElementById('play-mode').value === 'practice';
    this.el.quizScreen.querySelector('.quiz-tools span').textContent = this.practice ? 'Take your time. You’re learning!' : 'Timed challenge · give it a try!';
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
    this.feedback.textContent = '';
    this.nextButton.hidden = true;
    this.currentIndex += 1;
    this.currentQuestion = this._makeUniqueQuestion();
    this.el.questionNumber.textContent = this.currentIndex;
    this.el.questionText.textContent = this.currentQuestion.prompt;
    const tappable = this.el.questionText.classList.contains('klg-tappable');
    this.el.questionText.tabIndex = tappable ? 0 : -1;
    if (tappable) { this.el.questionText.setAttribute('role', 'button'); this.el.questionText.setAttribute('aria-label', 'Listen again: ' + this.currentQuestion.prompt); }
    else { this.el.questionText.removeAttribute('role'); this.el.questionText.removeAttribute('aria-label'); }
    this._renderChoices(this.currentQuestion.choices);
    this.listenButton.hidden = !this._questionSpeech();
    this._replayAnimation(this.el.questionText, "klg-anim-in");
    this._replayAnimation(this.el.choicesContainer, "klg-anim-in");
    if (this.el.progressFill) {
      const pct = ((this.currentIndex - 1) / this.totalQuestions) * 100;
      this.el.progressFill.style.width = pct + "%";
    }
    this._startTimer();
    this.questionStartMs = Date.now();
    this.el.questionText.focus({ preventScroll: true });
    if (this.listenButton.hidden === false) this._speakQuestion();
  }

  _questionSpeech() {
    if (!this.speechAvailable || this.currentQuestion.speech) return '';
    const text = this.currentQuestion.speechPrompt || this.currentQuestion.prompt;
    return /[A-Za-z]{2,}/.test(text) ? text.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim() : '';
  }

  _speak(text) {
    if (!this.speechAvailable || !text) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    speechSynthesis.speak(utterance);
  }

  _speakQuestion() { this._speak(this._questionSpeech()); }

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
      const tile = document.createElement('div');
      tile.className = 'quiz-choice-tile col-5 m-2';
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn quiz-choice-btn";
      const answer = this.formatAnswer(choice);
      const label = this.currentQuestion.choiceLabels?.[choice] || answer;
      const visual = this.currentQuestion.choiceDisplay && this.currentQuestion.choiceDisplay[choice];
      btn.textContent = visual || answer;
      btn.setAttribute('aria-label', label);
      btn.dataset.answer = answer;
      btn.addEventListener("click", () => this._handleAnswer(choice, btn));
      tile.appendChild(btn);
      if (this.speechAvailable && /[A-Za-z]{2,}/.test(label)) {
        tile.classList.add('has-listen');
        const listen = document.createElement('button');
        listen.type = 'button';
        listen.className = 'quiz-choice-listen';
        listen.textContent = '🔊';
        listen.setAttribute('aria-label', `Hear answer: ${label}`);
        listen.addEventListener('click', () => this._speak(label));
        tile.appendChild(listen);
      }
      this.el.choicesContainer.appendChild(tile);
    });
  }

  _startTimer() {
    clearInterval(this.timerInterval);
    this.timeRemaining = this.timePerQuestion;
    this.el.timerFill.parentElement.hidden = this.practice;
    if (this.practice) { this.el.timerText.textContent = 'Practice · no timer'; return; }
    this._renderTimer();
    this.deadline = Date.now() + this.timePerQuestion * 1000;
    this.timerInterval = setInterval(() => {
      if (document.hidden) return;
      this.timeRemaining = Math.max(0, Math.ceil((this.deadline - Date.now()) / 1000));
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
    if (this.speechAvailable && !this.currentQuestion.speech) speechSynthesis.cancel();
    this.elapsedMs += Date.now() - this.questionStartMs;

    const correct = this.currentQuestion.correctAnswer;
    const answerLabel = this.currentQuestion.choiceLabels?.[correct] || this.formatAnswer(correct);
    const isCorrect = selected !== null && selected === correct;
    if (isCorrect) {
      this.score += 1;
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this._celebrateCorrect(btnEl);
    } else {
      this.streak = 0;
      this._hideStreakBadge();
      this._setMascot("🌱");
      if (window.KlgSounds) {
        selected === null ? KlgSounds.timeUp() : KlgSounds.wrong();
      }
      this.wrongAnswers.push({
        prompt: this.currentQuestion.reviewPrompt || this.currentQuestion.prompt,
        correctAnswer: answerLabel,
        givenAnswer: selected === null ? "No answer (time's up)" : (this.currentQuestion.choiceLabels?.[selected] || this.formatAnswer(selected)),
      });
    }
    this._updateScorePill();

    this.el.choicesContainer.querySelectorAll('.quiz-choice-btn').forEach((btn) => {
      btn.disabled = true;
      const value = btn.dataset.answer;
      if (value === this.formatAnswer(correct)) {
        btn.classList.add("correct");
      } else if (btn === btnEl) {
        btn.classList.add("incorrect");
      }
    });

    this.feedback.textContent = (isCorrect ? 'Yes! Well done. ' : `Good try! The answer is ${answerLabel}. `) + (this.currentQuestion.explanation || '');
    if (this.practice) {
      this.nextButton.textContent = this.currentIndex === this.totalQuestions ? 'See my stars →' : 'Next question →';
      this.nextButton.hidden = false;
      this.nextButton.focus({ preventScroll: true });
    } else {
      this.transitionTimer = setTimeout(() => this._nextQuestion(), isCorrect ? this.correctDelay : Math.max(this.incorrectDelay, 3500));
    }
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
      if (typeof confetti === "function" && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
    this.el.resultsScreen.focus({ preventScroll: true });
    if (this.el.progressFill) this.el.progressFill.style.width = "100%";

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

    if (!this.practice) this.onFinish({
      score: this.score,
      total: this.totalQuestions,
      elapsedMs: this.elapsedMs,
      bestStreak: this.bestStreak,
    });

    if (this.practice) {
      const time = document.getElementById('results-time');
      if (time) time.textContent = 'Practice complete · every little step counts.';
    }
    this._recordProgress();
  }

  /**
   * Bank the round with KlgProgress (XP, stars, day streak, badges) and show
   * what was earned above the review list. Silently skipped when
   * assets/js/progress.js isn't loaded.
   */
  _recordProgress() {
    if (!window.KlgProgress) return;
    const reward = KlgProgress.record({
      score: this.score,
      total: this.totalQuestions,
      elapsedMs: this.practice ? 0 : this.elapsedMs,
      bestStreak: this.bestStreak,
    });
    this._renderReward(reward);
    if (reward.rankUp) {
      if (window.KlgSounds) KlgSounds.newRecord();
      if (typeof confetti === "function") this._launchConfetti();
    }
  }

  _renderReward(reward) {
    let panel = document.getElementById("klg-reward");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "klg-reward";
      panel.className = "klg-reward";
      const review = this.el.resultsReview;
      if (review && review.parentNode) {
        review.parentNode.insertBefore(panel, review);
      } else {
        this.el.resultsScreen.appendChild(panel);
      }
    }
    panel.innerHTML = "";

    if (reward.rankUp) {
      const banner = document.createElement("div");
      banner.className = "klg-rank-up";
      banner.textContent = `${reward.rank.emoji} Level up — you're a ${reward.rank.name}!`;
      panel.appendChild(banner);
    }

    const xpLine = document.createElement("div");
    xpLine.className = "klg-xp-line";
    xpLine.textContent = `+${reward.xp} XP`;
    const rankSpan = document.createElement("span");
    rankSpan.className = "klg-xp-rank";
    rankSpan.textContent = ` ${reward.rank.emoji} ${reward.rank.name} • ${reward.totalXp} XP total`;
    xpLine.appendChild(rankSpan);
    panel.appendChild(xpLine);

    const next = reward.rank.next;
    const track = document.createElement("div");
    track.className = "klg-xp-track";
    const fill = document.createElement("div");
    fill.className = "klg-xp-fill";
    const span = next ? next.min - reward.rank.min : 1;
    const into = reward.totalXp - reward.rank.min;
    fill.style.width = (next ? Math.min(100, (into / span) * 100) : 100) + "%";
    track.appendChild(fill);
    panel.appendChild(track);

    const caption = document.createElement("div");
    caption.className = "klg-xp-caption";
    caption.textContent = next
      ? `${reward.toNextRank} XP to ${next.emoji} ${next.name}`
      : "Top rank reached — you legend! 👑";
    panel.appendChild(caption);

    if (reward.dayStreak >= 2) {
      const days = document.createElement("div");
      days.className = "klg-day-streak";
      days.textContent = `🔥 ${reward.dayStreak}-day streak — come back tomorrow to keep it!`;
      panel.appendChild(days);
    }

    reward.newBadges.forEach((badge, i) => {
      const chip = document.createElement("div");
      chip.className = "klg-badge-unlock";
      chip.style.animationDelay = i * 0.25 + "s";
      chip.textContent = `${badge.emoji} New badge: ${badge.name}`;
      panel.appendChild(chip);
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
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const duration = 2000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }
}
