// End-to-end Playwright browser test with made-up practice logs. Usage: npm run test:browser
const { chromium } = require('playwright');
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { start } = require('../scripts/serve.cjs');

const PORT = 4184;
const URL = `http://localhost:${PORT}/`;
const OUT = path.join(__dirname, '..', 'test-output');
const MONDAY = new Date('2026-11-16T09:00:00');
const SUNDAY_DAY7 = new Date('2026-11-22T09:00:00');

const nav = (page, name) => page.locator('nav button', { hasText: name }).click();
const testId = (page, id) => page.locator(`[data-testid="${id}"]`);
const toastText = page => page.locator('#toast');

async function noOverflow(page, label) {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(wide <= 0, `${label} overflows sideways by ${wide}px`);
}

(async () => {
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  for (const f of fs.readdirSync(path.join(__dirname, '..', 'js'))) {
    assert.ok(sw.includes(`./js/${f}`), `${f} missing from sw.js`);
  }

  fs.mkdirSync(OUT, { recursive: true });
  const server = await start(PORT);
  const browser = await chromium.launch()
    .catch(() => chromium.launch({ channel: 'chrome' }))
    .catch(() => chromium.launch({ channel: 'msedge' }));
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await context.newPage();

  const errors = [];
  const external = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(m.text())) {
      errors.push(m.text());
    }
  });
  context.on('request', r => {
    if (!r.url().startsWith(URL) && !r.url().startsWith('blob:') && !r.url().startsWith('data:')) {
      external.push(r.url());
    }
  });

  await page.clock.install({ time: MONDAY });

  // 1. First-run setup screen
  await page.goto(URL);
  await page.getByRole('heading', { name: 'Start your 12 weeks' }).waitFor();
  assert.equal(await page.locator('input[type=date]').inputValue(), '2026-11-16');
  await page.getByRole('combobox', { name: 'Daily practice goal' }).selectOption('25');
  await page.getByRole('button', { name: 'Start the plan' }).click();

  // 2. Day 1 loads cleanly with 5 steps
  await page.getByRole('heading', { name: 'Today, Nov 16' }).waitFor();
  assert.ok(await page.getByText('Day 1 of 84 · Week 1: Ear & Habit Reset').isVisible());
  assert.equal(await testId(page, 'step-count').textContent(), '0 of 5 steps');
  assert.ok(await page.getByRole('button', { name: 'Next day' }).isDisabled(), 'future days cannot be logged');
  await noOverflow(page, 'Today initial');

  // 3. Step 1: Dictation check + YouGlish external links
  await page.getByRole('textbox', { name: 'Type what you hear clip 1' }).fill('Did you get a chance to check out that bug yet?');
  await testId(page, 'check-clip-0').click();
  assert.ok(await testId(page, 'diff-clip-0').getByText('Match: 100%').isVisible());

  await page.getByRole('textbox', { name: 'Type what you hear clip 2' }).fill('What are we gonna do tonight?');
  await testId(page, 'check-clip-1').click();
  assert.equal(await testId(page, 'step-count').textContent(), '1 of 5 steps');

  const ygLink = page.getByRole('link', { name: /Hear "sanity check"/ });
  assert.equal(await ygLink.getAttribute('target'), '_blank');
  assert.equal(await ygLink.getAttribute('rel'), 'noopener noreferrer');
  assert.match(await ygLink.getAttribute('href'), /^https:\/\/youglish\.com\/pronounce\//);

  // 4. Step 2: Phrase reps, Tamil->US swap, clarity drill
  await page.locator('[data-step="shadow"] summary').click();
  const rep0 = testId(page, 'rep-pro-0');
  await rep0.click();
  await rep0.click();
  await rep0.click();
  assert.equal(await rep0.textContent(), '3/3');
  assert.ok(await rep0.evaluate(e => e.classList.contains('hit')));
  assert.ok(await page.getByText('Daily Swap · Work').isVisible());
  assert.ok(await page.getByText('60-Second Clarity Drill').isVisible());
  await testId(page, 'done-shadow').click();

  // 5. Step 3: Stories + Dialogue Role-Play mode
  await page.locator('[data-step="story"] summary').click();
  assert.ok(await page.locator('mark.conn').count() >= 3);
  await testId(page, 'roleplay-toggle').click();
  assert.equal(await testId(page, 'roleplay-toggle').getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: '▶ Play Dialogue' }).click();
  await page.clock.runFor(600);
  await page.getByText('Your turn — speak your line aloud').waitFor();
  await page.getByRole('button', { name: 'Next line →' }).click();
  await page.getByRole('button', { name: '⏹ Stop' }).click();
  await testId(page, 'done-story').click();

  // 6. Step 4: Speaking timer + transcript + XSS safety
  await page.locator('[data-step="speak"] summary').click();
  await testId(page, 'start-speaking-timer').click();
  await page.locator('#timer-bar').waitFor();
  assert.equal(await page.locator('#timer-time').textContent(), '2:00');
  await page.getByRole('button', { name: '30 seconds more' }).click();
  assert.equal(await page.locator('#timer-time').textContent(), '2:30');
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await page.locator('#timer-bar').waitFor({ state: 'hidden' });

  const sampleTranscript = 'Yesterday only I was having a doubt, so do one thing, let us figure it out and do a sanity check. <img src=x onerror="window.__xss=1">';
  await page.getByRole('textbox', { name: 'Spoken transcript or key points' }).fill(sampleTranscript);
  assert.equal(await testId(page, 'transcript-status').textContent(), 'Saved');
  assert.equal(await page.locator('[data-target-chip="sanity check"]').textContent(), '✓ Used: sanity check');
  assert.equal(await page.locator('[data-target-chip="figure out"]').textContent(), '✓ Used: figure out');
  await testId(page, 'done-speak').click();

  // 7. Step 5: Offline habit analyzer, confidence, win, finish day
  await page.locator('[data-step="review"] summary').click();
  const analyzerBox = testId(page, 'analyzer-output');
  assert.ok(await analyzerBox.getByText(/Emphasis "only" transfer/).isVisible());
  assert.ok(await analyzerBox.getByText(/"Have a doubt" phrasing/).isVisible());
  assert.ok(await analyzerBox.getByText(/"Do one thing" command/).isVisible());

  await page.locator('[data-confidence="steady"]').click();
  assert.equal(await page.locator('[data-confidence="steady"]').getAttribute('aria-pressed'), 'true');
  await page.getByRole('textbox', { name: 'Win of the day' }).fill('Used BLUF cleanly in standup');
  await testId(page, 'finish-day').click();
  assert.equal(await testId(page, 'step-count').textContent(), '5 of 5 steps');
  assert.equal(await testId(page, 'week-minutes').textContent(), '25 of 150 min');
  await page.screenshot({ path: path.join(OUT, 'today.png'), fullPage: true });

  // 8. Reload persistence & XSS check
  await page.reload();
  await page.getByRole('heading', { name: 'Today, Nov 16' }).waitFor();
  assert.equal(await testId(page, 'step-count').textContent(), '5 of 5 steps');
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  await page.locator('[data-step="speak"] summary').click();
  assert.equal(await page.getByRole('textbox', { name: 'Spoken transcript or key points' }).inputValue(), sampleTranscript);

  // 9. Progress view
  await nav(page, 'Progress');
  assert.equal(await testId(page, 'total-sessions').textContent(), '1 of 84');
  assert.equal(await testId(page, 'total-minutes').textContent(), '25');
  assert.equal(await testId(page, 'current-streak').textContent(), '1 day');
  assert.equal(await testId(page, 'phrases-practiced').textContent(), '2 of 144');
  assert.equal(await page.locator('.calendar .cell').count(), 84);
  assert.equal(await page.locator('.calendar [data-date="2026-11-16"]').getAttribute('data-s'), 'full');
  await page.locator('.bar-min').first().waitFor();
  await page.locator('.dot-fluency').first().waitFor();
  assert.ok(await page.getByText('Top Caught Habits').isVisible());
  await noOverflow(page, 'Progress');
  await page.screenshot({ path: path.join(OUT, 'progress.png'), fullPage: true });

  // 10. Reference view
  await nav(page, 'Reference');
  await page.getByRole('heading', { name: 'Reference' }).waitFor();
  assert.equal(await page.locator('[data-swap]').count(), 25);
  await page.getByRole('searchbox', { name: 'Search upgrades, idioms, or drills' }).fill('prepone');
  assert.equal(await page.locator('[data-swap]').count(), 1);
  await page.getByRole('searchbox', { name: 'Search upgrades, idioms, or drills' }).fill('');
  assert.equal(await page.locator('[data-swap]').count(), 25);
  assert.ok(await page.getByText('4 Physical Clarity Drills').isVisible());
  assert.ok(await page.getByText('12-Week Curriculum Index').isVisible());
  await noOverflow(page, 'Reference');

  // 11. Data view: settings, reminder, .ics, backup, erase, bad file rejection, restore
  await nav(page, 'Data');
  await noOverflow(page, 'Data');
  assert.equal(await page.getByLabel('Reminder time').inputValue(), '19:00');
  await page.getByRole('checkbox', { name: 'Daily practice reminder' }).check();
  await page.getByLabel('Reminder time').fill('18:30');
  await page.getByRole('button', { name: 'Remind on Sunday' }).click();
  await page.getByRole('button', { name: 'Test reminder' }).click();
  await page.locator('#toast', { hasText: 'Day 1: sanity check' }).waitFor();

  const [icsDl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Add to calendar (.ics)' }).click()]);
  assert.equal(icsDl.suggestedFilename(), 'english-fluency-reminders.ics');
  const icsPath = path.join(OUT, icsDl.suggestedFilename());
  await icsDl.saveAs(icsPath);
  const icsText = fs.readFileSync(icsPath, 'utf8');
  assert.match(icsText, /DTSTART:20261116T183000/);
  assert.match(icsText, /SUMMARY:English Fluency/);

  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download backup' }).click()]);
  assert.equal(dl.suggestedFilename(), 'english-fluency-2026-11-16.json');
  const backupPath = path.join(OUT, dl.suggestedFilename());
  await dl.saveAs(backupPath);

  await page.getByRole('button', { name: 'Erase all data' }).click();
  await page.locator('dialog').getByRole('button', { name: 'Erase' }).click();
  await page.getByRole('heading', { name: 'Start your 12 weeks' }).waitFor();

  await nav(page, 'Data');
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"wrong"}') });
  await page.locator('#toast', { hasText: 'not an English Fluency backup' }).waitFor();

  await page.locator('input[type=file]').setInputFiles(backupPath);
  await page.locator('dialog').getByRole('button', { name: 'Replace' }).click();
  await page.getByRole('heading', { name: 'Today, Nov 16' }).waitFor();
  assert.equal(await testId(page, 'step-count').textContent(), '5 of 5 steps');
  assert.equal(await page.evaluate(() => window.__xss), undefined);

  // 12. Day 7 Weekly Story Review screen verification (advance clock to Sunday Nov 22)
  await page.clock.setFixedTime(SUNDAY_DAY7);
  await page.reload();
  await page.getByRole('heading', { name: 'Today, Nov 22' }).waitFor();
  assert.ok(await page.getByText('Weekly Story Review · Week 1').isVisible());
  assert.equal(await page.getByRole('checkbox', { name: /^Feels natural:/ }).count(), 12);

  // 13. Narrow phone viewport check (320px)
  await page.setViewportSize({ width: 320, height: 640 });
  await noOverflow(page, 'Today at 320px');
  await page.setViewportSize({ width: 390, height: 844 });

  // 14. Service Worker offline reload + Dark Mode + Manifest icon verification
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null || caches.has('english-fluency-v1'));
  await page.reload();
  await page.getByRole('heading', { name: 'Today, Nov 22' }).waitFor();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('heading', { name: 'Today, Nov 22' }).waitFor();
  await context.setOffline(false);

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: path.join(OUT, 'today-dark.png'), fullPage: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.webmanifest'), 'utf8'));
  for (const icon of manifest.icons) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', icon.src)), `${icon.src} is missing`);
  }

  assert.deepEqual(errors, [], 'page errors');
  assert.deepEqual(external, [], 'requests to other sites');
  await browser.close();
  server.close();
  console.log('Browser test passed.');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
