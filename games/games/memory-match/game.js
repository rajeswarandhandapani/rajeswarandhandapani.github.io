'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const board = document.getElementById('memory-board');
  const status = document.getElementById('memory-status');
  const feedback = document.getElementById('memory-feedback');
  const sizeSelect = document.getElementById('memory-size');
  const pictures = [
    ['🌻', 'sunflower'], ['🦋', 'butterfly'], ['🐞', 'ladybug'], ['🌈', 'rainbow'],
    ['🍓', 'strawberry'], ['🐝', 'bee'], ['🌷', 'tulip'], ['🍄', 'mushroom'],
    ['🐢', 'turtle'], ['🍎', 'apple'], ['🌙', 'moon'], ['🦊', 'fox'],
    ['🐸', 'frog'], ['🍋', 'lemon'], ['🐳', 'whale'], ['🌵', 'cactus'],
    ['🦉', 'owl'], ['🍉', 'watermelon'], ['🐙', 'octopus'], ['🌸', 'flower'],
    ['🦀', 'crab'], ['🥕', 'carrot'], ['🐧', 'penguin'], ['🍀', 'clover'],
    ['🐬', 'dolphin'], ['🪁', 'kite'], ['🐿️', 'squirrel'], ['🌽', 'corn'],
    ['🦄', 'unicorn'], ['🍍', 'pineapple'], ['🐌', 'snail'], ['☀️', 'sun']
  ];
  let opened = [], pairs = 0, turns = 0, locked = false, timeout = null;
  let pairCount = 6;

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function update() {
    status.textContent = `${pairs} of ${pairCount} pairs found · ${turns} turns`;
  }

  function start() {
    clearTimeout(timeout);
    opened = []; pairs = 0; turns = 0; locked = false;
    pairCount = Number(sizeSelect.value);
    document.getElementById('start-screen').classList.add('d-none');
    document.getElementById('memory-screen').classList.remove('d-none');
    board.replaceChildren();
    board.classList.toggle('memory-board-large', pairCount === 10);
    feedback.textContent = 'Choose two cards to find a pair.';
    update();
    const selected = shuffle(pictures).slice(0, pairCount);
    const deck = shuffle([...selected, ...selected]);
    deck.forEach(([emoji, name], index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'memory-card';
      card.textContent = '✦';
      card.setAttribute('aria-label', `Card ${index + 1}, face down`);
      card.addEventListener('click', () => {
        if (locked || card.disabled || opened.some(item => item.card === card)) return;
        card.textContent = emoji;
        card.classList.add('flipped');
        card.setAttribute('aria-label', `Card ${index + 1}, ${name}`);
        opened.push({ card, emoji, index });
        if (opened.length < 2) return;
        turns++;
        if (opened[0].emoji === opened[1].emoji) {
          pairs++;
          opened.forEach(item => { item.card.disabled = true; item.card.classList.add('matched'); });
          opened = [];
          feedback.textContent = `A pair of ${name}! Keep exploring.`;
          if (window.KlgSounds) KlgSounds.correct();
          if (pairs === pairCount) {
            const reward = window.KlgProgress?.record({ gameId: 'memory-match', score: pairCount, total: pairCount, elapsedMs: 0, bestStreak: 0 });
            feedback.textContent = `You found all ${pairCount} pairs in ${turns} turns!${reward ? ` +${reward.xp} XP.` : ''} Well done!`;
            document.getElementById('restart-memory').focus();
          }
        } else {
          locked = true;
          feedback.textContent = 'Remember these pictures. Try a different pair!';
          timeout = setTimeout(() => {
            opened.forEach(item => {
              item.card.textContent = '✦';
              item.card.classList.remove('flipped');
              item.card.setAttribute('aria-label', `Card ${item.index + 1}, face down`);
            });
            opened = [];
            locked = false;
          }, 1400);
        }
        update();
      });
      board.appendChild(card);
    });
    board.firstElementChild.focus();
  }

  document.getElementById('start-btn').addEventListener('click', start);
  document.getElementById('restart-memory').addEventListener('click', start);
  document.getElementById('memory-change-size').addEventListener('click', () => {
    clearTimeout(timeout);
    locked = true;
    document.getElementById('memory-screen').classList.add('d-none');
    document.getElementById('start-screen').classList.remove('d-none');
    sizeSelect.focus();
  });
});
