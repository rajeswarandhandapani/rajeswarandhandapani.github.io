const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const data = require('../assets/js/tamil-sentences-data.js');
const base = process.env.BASE_URL || 'http://localhost:4173';

(async () => {
  fs.mkdirSync('artifacts', { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 1100 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    async function rowForPrompt() {
      const clue = await page.locator('#clue-word').textContent();
      return data.sentences.find(item => item.clue === clue);
    }
    async function expectedAnswer(mode) {
      const row = await rowForPrompt();
      if (mode === 'word') return row.word;
      const chunks = await page.locator('#typing-sentence').evaluate(element => [...element.childNodes].map(node => node.textContent));
      // The rendered sentence is before, word-prefix, blank, word-suffix, after.
      const prefix = chunks[1];
      const suffix = chunks[3];
      const answer = row.word.slice(prefix.length, suffix.length ? -suffix.length : undefined);
      assert.equal(data.letters(answer).length, 1, `Blank split incorrectly: ${row.word}`);
      assert.equal(prefix + answer + suffix, row.word);
      return answer;
    }
    async function keyboardType(word) {
      for (const letter of data.letters(word)) {
        if (data.vowels.includes(letter)) await page.locator('#vowel-keys').getByRole('button', { name: letter, exact: true }).click();
        else {
          await page.locator(`#consonant-keys button[data-base="${letter[0]}"]`).click();
          await page.locator('#form-keys').getByRole('button', { name: letter, exact: true }).click();
        }
      }
    }
    // Complete real shuffled rounds through both typing interfaces.
    for (const mode of ['word', 'letters']) {
      const slug = mode === 'word' ? 'tamil-sentence-words' : 'tamil-missing-letters';
      await page.goto(`${base}/games/${slug}/index.html`);
      await page.locator('#sentence-category').selectOption('animals');
      await page.locator('#start-btn').click();
      assert.ok(await page.locator('#tamil-answer').isVisible());
      assert.equal(await page.locator('.quiz-choice-btn').count(), 0);
      await page.locator('#check-answer').click();
      assert.match(await page.locator('#typing-feedback').textContent(), /Type/);
      assert.equal(await page.locator('#typing-next').isVisible(), false);
      await page.locator('#tamil-answer').fill('wrong');
      await page.locator('#tamil-answer').press('Enter');
      assert.match(await page.locator('#typing-feedback').textContent(), /Good try/);
      assert.equal(await page.locator('#tamil-answer').isEnabled(), true);
      await page.locator('#keyboard-clear').click();
      await keyboardType('கோ');
      assert.equal(await page.locator('#tamil-answer').inputValue(), 'கோ');
      assert.equal(await page.locator('#keyboard-preview').textContent(), 'கோ');
      await page.locator('#keyboard-backspace').click();
      assert.equal(await page.locator('#tamil-answer').inputValue(), '');
      await keyboardType('நாய்');
      await page.locator('#keyboard-backspace').click();
      assert.equal(await page.locator('#tamil-answer').inputValue(), 'நா');
      await page.locator('#keyboard-clear').click();
      const seen = new Set();
      for (let i = 0; i < 10; i++) {
        const row = await rowForPrompt();
        assert.ok(!seen.has(row.id), 'Repeated sentence in a round');
        seen.add(row.id);
        const expected = await expectedAnswer(mode);
        if (mode === 'letters' && i === 0) {
          await page.locator('#tamil-answer').fill(row.word);
          await page.locator('#check-answer').click();
          assert.match(await page.locator('#typing-feedback').textContent(), /only the missing letter/);
          await page.locator('#keyboard-clear').click();
        }
        if (i === 0) {
          await page.locator('#show-answer').click();
          assert.ok((await page.locator('#typing-feedback').textContent()).includes(expected));
          assert.equal(await page.locator('#typing-next').isVisible(), false);
          await keyboardType(expected);
          assert.equal(await page.locator('#tamil-answer').inputValue(), expected);
        } else {
          // Actual text insertion and Enter submission, including decomposed forms.
          await page.locator('#tamil-answer').focus();
          await page.keyboard.insertText(expected.normalize('NFD'));
        }
        if (i === 1) {
          await page.locator('#tamil-answer').dispatchEvent('compositionstart');
          await page.locator('#typing-form').dispatchEvent('submit');
          assert.equal(await page.locator('#typing-next').isVisible(), false);
          await page.locator('#tamil-answer').dispatchEvent('compositionend');
        }
        if (i === 0) await page.locator('#keyboard-check').click();
        else await page.locator('#tamil-answer').press('Enter');
        assert.equal(await page.locator('#typing-next').isVisible(), true);
        assert.equal(await page.locator('#tamil-answer').isDisabled(), true);
        assert.equal(await page.locator('#typing-sentence').textContent(), row.before + row.word + row.after);
        if (i === 0) {
          await page.evaluate(() => document.fonts.ready);
          await page.screenshot({ path: `artifacts/tamil-${mode}-feedback.png` });
        }
        await page.locator('#typing-next').click();
      }
      assert.ok(await page.locator('#typing-results').isVisible());
      assert.equal(await page.locator('#typing-review li').count(), 10);
      assert.match(await page.locator('#typing-result-summary').textContent(), /9 without showing/);
      const stats = await page.evaluate(id => KlgProgress.gameStats(id), slug);
      assert.equal(stats.plays, 1);
      assert.equal(stats.bestScore, 9);
      await page.locator('#play-again-btn').click();
      assert.equal(await page.locator('#typing-counter').textContent(), 'Sentence 1 / 10');
      await page.locator('#typing-exit').click();
      assert.ok(await page.locator('#start-screen').isVisible());
      assert.equal(await page.evaluate(id => KlgProgress.gameStats(id).plays, slug), 1, 'Unfinished round must not record');
      await page.reload();
      assert.equal(await page.evaluate(id => KlgProgress.gameStats(id).plays, slug), 1, 'Progress must persist');
      for (const width of [320, 390, 768, 1366]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.locator('#sentence-category').selectOption('nature');
        await page.locator('#start-btn').click();
        await page.evaluate(() => document.fonts.ready);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${slug} overflow at ${width}`);
        await page.screenshot({ path: `artifacts/tamil-${mode}-${width}.png`, fullPage: true });
        await page.locator('#typing-exit').click();
      }
      console.log(`PASS ${slug}: typed answers, IME, retries, screen keyboard, Unicode, round completion, progress, four layouts`);
    }
    await page.goto(base);
    await page.locator('#game-search').fill('Tamil');
    assert.equal(await page.locator('.game-tile:visible').count(), 5);
    await page.locator('button[data-subject="language"]').click();
    assert.equal(await page.locator('.game-tile:visible').count(), 5);
    assert.deepEqual(errors, []);
    console.log('PASS Tamil discovery and no browser errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
