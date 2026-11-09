// Runs the whole app in a real browser with made-up workouts. Usage: npm run test:browser
const { chromium } = require('playwright');
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const { start } = require('../scripts/serve.cjs');

const PORT = 4183;
const URL = `http://localhost:${PORT}/`;
const OUT = path.join(__dirname, '..', 'test-output');
const WEDNESDAY = new Date('2026-11-11T09:00:00');

const nav = (page, name) => page.locator('nav button', { hasText: name }).click();
const exercise = (page, id) => page.locator(`[data-exercise="${id}"]`);
const tick = (page, id, n) => exercise(page, id).locator('.tick').nth(n);
const weight = (page, id, n) => exercise(page, id).locator('.set:not(.head)').nth(n).locator('input').first();
const prevDay = page => page.getByRole('button', { name: 'Previous day' }).click();
const nextDay = page => page.getByRole('button', { name: 'Next day' }).click();
const testId = (page, id) => page.locator(`[data-testid="${id}"]`);
const toastText = page => page.locator('#toast');

async function noOverflow(page, label) {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(wide <= 0, `${label} overflows sideways by ${wide}px`);
}

(async () => {
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  for (const f of fs.readdirSync(path.join(__dirname, '..', 'js'))) assert.ok(sw.includes(`./js/${f}`), `${f} missing from sw.js`);

  fs.mkdirSync(OUT, { recursive: true });
  const server = await start(PORT);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  const external = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  context.on('request', r => { if (!r.url().startsWith(URL) && !r.url().startsWith('blob:') && !r.url().startsWith('data:')) external.push(r.url()); });
  await page.clock.install({ time: WEDNESDAY });

  // First run asks for a start date and offers next Monday.
  await page.goto(URL);
  await page.getByRole('heading', { name: 'Start your 12 weeks' }).waitFor();
  assert.equal(await page.locator('input[type=date]').inputValue(), '2026-11-16');
  await page.locator('input[type=date]').fill('2026-11-09');
  await page.getByRole('button', { name: 'Start the plan' }).click();

  // Wednesday is a gym day in week 1 with all six exercises.
  await page.getByRole('heading', { name: 'Today, Nov 11' }).waitFor();
  assert.ok(await page.getByText('Week 1 of 12').isVisible());
  assert.equal(await page.locator('.exercise').count(), 6);
  assert.equal(await testId(page, 'set-count').textContent(), '0 of 12 sets');
  assert.ok(await page.getByRole('button', { name: 'Next day' }).isDisabled(), 'future days cannot be logged');
  await noOverflow(page, 'Today');

  // Monday: a set needs a weight, then the rest timer runs.
  await prevDay(page); await prevDay(page);
  await page.getByRole('heading', { name: 'Monday, November 9' }).waitFor();
  await tick(page, 'leg-press', 0).click();
  assert.match(await toastText(page).textContent(), /Enter the weight/);
  assert.equal(await tick(page, 'leg-press', 0).getAttribute('aria-pressed'), 'false');

  await weight(page, 'leg-press', 0).fill('60');
  assert.equal(await weight(page, 'leg-press', 1).inputValue(), '60', 'weight carries to the next set');
  await exercise(page, 'leg-press').locator('.set:not(.head)').nth(0).locator('input').nth(1).fill('12');
  await exercise(page, 'leg-press').locator('.set:not(.head)').nth(1).locator('input').nth(1).fill('12');
  await tick(page, 'leg-press', 0).click();
  assert.equal(await testId(page, 'set-count').textContent(), '1 of 12 sets');
  assert.equal(await testId(page, 'week-gym').textContent(), '1 of 3 visits', 'week tile updates straight away');
  await page.locator('#rest').waitFor();
  assert.equal(await page.locator('#rest-time').textContent(), '1:30');
  await page.getByRole('button', { name: '15 seconds less' }).click();
  assert.equal(await page.locator('#rest-time').textContent(), '1:15');
  await page.clock.fastForward(76000);
  await page.locator('#rest').waitFor({ state: 'hidden' });

  await tick(page, 'leg-press', 1).click();
  await page.locator('#rest').waitFor();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.locator('#rest').waitFor({ state: 'hidden' });
  assert.ok(await exercise(page, 'leg-press').evaluate(e => e.classList.contains('complete')));

  // Plank has no weight, and is saved in seconds.
  await tick(page, 'plank', 0).click();
  await page.getByRole('button', { name: 'Skip' }).click();
  assert.equal(await testId(page, 'set-count').textContent(), '3 of 12 sets');

  // Machine taken: swap to an alternate, which starts with an empty weight.
  assert.equal(await exercise(page, 'plank').getByRole('button', { name: /^Swap/ }).count(), 0, 'plank needs no machine');
  await exercise(page, 'seated-row').getByRole('button', { name: 'Swap Seated row' }).click();
  await exercise(page, 'seated-row').getByRole('button', { name: /Single-arm dumbbell row/ }).click();
  assert.equal(await exercise(page, 'seated-row').locator('h3').textContent(), 'Single-arm dumbbell row');
  assert.ok(await exercise(page, 'seated-row').getByText('Instead of Seated row').isVisible());
  assert.equal(await weight(page, 'seated-row', 0).inputValue(), '');
  await weight(page, 'seated-row', 0).fill('30');
  await tick(page, 'seated-row', 0).click();
  await page.getByRole('button', { name: 'Skip' }).click();
  assert.equal(await testId(page, 'set-count').textContent(), '4 of 12 sets');

  // Can't swap away with sets already ticked, so those numbers stay with the right movement.
  await exercise(page, 'seated-row').getByRole('button', { name: 'Swap Single-arm dumbbell row' }).click();
  await exercise(page, 'seated-row').getByRole('button', { name: /Seated row \(planned\)/ }).click();
  await page.locator('#toast', { hasText: 'Untick the sets' }).waitFor();
  assert.equal(await exercise(page, 'seated-row').locator('h3').textContent(), 'Single-arm dumbbell row');

  // A swap with nothing ticked goes back to the planned machine.
  await exercise(page, 'lat-pulldown').getByRole('button', { name: 'Swap Lat pulldown' }).click();
  await exercise(page, 'lat-pulldown').getByRole('button', { name: /Band pulldown/ }).click();
  assert.equal(await exercise(page, 'lat-pulldown').locator('.set:not(.head)').first().locator('input').count(), 1, 'a band has no weight box');
  await exercise(page, 'lat-pulldown').getByRole('button', { name: 'Swap Band pulldown' }).click();
  await exercise(page, 'lat-pulldown').getByRole('button', { name: /Lat pulldown \(planned\)/ }).click();
  assert.equal(await exercise(page, 'lat-pulldown').locator('h3').textContent(), 'Lat pulldown');

  // Warm-up, Apple Watch reminder and a timed stretch.
  const pre = page.locator('[data-routine="gym-pre"]');
  const post = page.locator('[data-routine="gym-post"]');
  assert.ok(await pre.getByText('Choose Traditional Strength Training').isVisible());
  await pre.getByRole('checkbox', { name: 'Start Apple Watch workout' }).check();
  assert.equal(await testId(page, 'gym-pre-count').textContent(), '1 of 6');
  await post.getByRole('button', { name: /timer for Standing quad stretch/ }).click();
  await page.locator('#rest').waitFor();
  assert.equal(await page.locator('#rest-label').textContent(), 'Standing quad stretch');
  assert.equal(await page.locator('#rest-time').textContent(), '0:30');
  await page.getByRole('button', { name: 'Skip' }).click();
  for (const box of await post.getByRole('checkbox').all()) await box.check();
  assert.equal(await testId(page, 'gym-post-count').textContent(), '7 of 7');
  assert.equal(await post.evaluate(e => e.open), false, 'a finished routine folds away');
  await post.locator('summary').click();

  // Saved across a reload.
  await page.reload();
  await page.getByRole('heading', { name: 'Today, Nov 11' }).waitFor();
  await prevDay(page); await prevDay(page);
  await testId(page, 'set-count').waitFor();
  assert.equal(await testId(page, 'set-count').textContent(), '4 of 12 sets');
  assert.equal(await tick(page, 'leg-press', 0).getAttribute('aria-pressed'), 'true');
  assert.equal(await exercise(page, 'seated-row').locator('h3').textContent(), 'Single-arm dumbbell row');
  assert.equal(await testId(page, 'gym-pre-count').textContent(), '1 of 6');
  assert.equal(await testId(page, 'gym-post-count').textContent(), '7 of 7');

  // Tuesday: cardio, with an impossible entry refused first.
  await nextDay(page);
  await page.getByRole('heading', { name: 'Tuesday, November 10' }).waitFor();
  const minutes = page.getByRole('spinbutton', { name: 'Minutes' });
  assert.equal(await minutes.inputValue(), '20');
  await page.getByRole('button', { name: '5 minutes more' }).click();
  assert.equal(await minutes.inputValue(), '25');
  await page.getByRole('spinbutton', { name: 'Average heart rate' }).fill('500');
  await page.getByRole('button', { name: 'Log cardio', exact: true }).click();
  assert.match(await toastText(page).textContent(), /heart rate/);
  await page.getByRole('spinbutton', { name: 'Average heart rate' }).fill('112');
  await page.getByRole('button', { name: 'Log cardio', exact: true }).click();
  await page.getByText('25 min · 112 bpm').waitFor();
  assert.equal(await testId(page, 'week-cardio').textContent(), '25 of 150 min');

  // Remove and undo.
  await page.getByRole('button', { name: 'Remove Brisk walk' }).click();
  assert.equal(await testId(page, 'week-cardio').textContent(), '0 of 150 min');
  await page.getByRole('button', { name: 'Undo' }).click();
  assert.equal(await testId(page, 'week-cardio').textContent(), '25 of 150 min');

  // Wednesday: last session's numbers are pre-filled, with a nudge at the top of the range.
  await nextDay(page);
  await page.getByRole('heading', { name: 'Today, Nov 11' }).waitFor();
  assert.equal(await weight(page, 'leg-press', 0).inputValue(), '60');
  assert.ok(await exercise(page, 'leg-press').getByText('Last, Nov 9: 60 lb × 12, 60 lb × 12').isVisible());
  assert.ok(await exercise(page, 'leg-press').getByText('try a small increase').isVisible());
  assert.equal(await exercise(page, 'seated-row').locator('h3').textContent(), 'Seated row', 'a swap lasts one day');
  assert.equal(await weight(page, 'seated-row', 0).inputValue(), '', 'dumbbell weights do not pre-fill the machine');
  await page.screenshot({ path: path.join(OUT, 'today.png'), fullPage: true });

  // Text in a note is only ever text.
  const note = page.getByRole('textbox', { name: 'Note for this day' });
  await note.fill('<img src=x onerror="window.__xss=1">');
  await note.blur();

  // Progress shows the same numbers.
  await nav(page, 'Progress');
  assert.equal(await testId(page, 'total-gym').textContent(), '1 of 36');
  assert.equal(await testId(page, 'total-cardio').textContent(), '25');
  assert.equal(await page.locator('.calendar .cell').count(), 84);
  assert.equal(await page.locator('.calendar [data-date="2026-11-09"]').getAttribute('data-s'), 'gym');
  assert.equal(await page.locator('.calendar [data-date="2026-11-10"]').getAttribute('data-s'), 'cardio');
  assert.ok(await page.locator('.calendar [data-date="2026-11-12"]').isDisabled());
  await page.locator('.bar-cardio').first().waitFor();
  assert.equal(await page.locator('.bar-cardio').count(), 1);
  await page.locator('.dot-gym').first().waitFor();
  await noOverflow(page, 'Progress');
  await page.screenshot({ path: path.join(OUT, 'progress.png'), fullPage: true });
  await page.getByRole('combobox', { name: 'Exercise' }).selectOption('seated-row');
  await page.getByText('Finish a set of seated row').waitFor();
  await page.getByRole('combobox', { name: 'Exercise' }).selectOption('db-row');
  await page.locator('.dot-gym').first().waitFor();

  await page.locator('.calendar [data-date="2026-11-10"]').click();
  await page.getByRole('heading', { name: 'Tuesday, November 10' }).waitFor();

  await nav(page, 'Plan');
  await page.getByRole('heading', { name: 'Weekly schedule' }).waitFor();
  await noOverflow(page, 'Plan');
  const planText = await page.locator('main').textContent();
  assert.ok(!/LDL|HDL|triglyceride/i.test(planText), 'lab results stay out of the app');
  assert.ok(!planText.includes('[object'), 'the Plan page shows real content');
  assert.ok(await page.getByRole('heading', { name: 'Leg press', level: 3 }).isVisible());
  assert.ok(await page.getByText('Goblet squat: Hold one dumbbell').isVisible());
  assert.ok(await page.getByRole('heading', { name: 'Gym cool-down and stretch' }).isVisible());
  assert.ok(await page.getByText('Standing quad stretch: 30 sec each leg').first().isVisible());

  // Backup, erase, restore.
  await nav(page, 'Data');
  await noOverflow(page, 'Data');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download backup' }).click()]);
  assert.equal(dl.suggestedFilename(), 'workout-tracker-2026-11-11.json');
  const backupPath = path.join(OUT, dl.suggestedFilename());
  await dl.saveAs(backupPath);
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  assert.equal(backup.days.length, 3);

  await page.getByRole('button', { name: 'Erase all data' }).click();
  await page.locator('dialog').getByRole('button', { name: 'Erase' }).click();
  await page.getByRole('heading', { name: 'Start your 12 weeks' }).waitFor();

  await nav(page, 'Data');
  await page.locator('input[type=file]').setInputFiles({ name: 'other.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"nope"}') });
  await page.locator('#toast', { hasText: 'not a Workout Tracker backup' }).waitFor();

  await page.locator('input[type=file]').setInputFiles(backupPath);
  await page.locator('dialog').getByRole('button', { name: 'Replace' }).click();
  await page.getByRole('heading', { name: 'Today, Nov 11' }).waitFor();
  assert.equal(await testId(page, 'week-gym').textContent(), '1 of 3 visits');
  assert.equal(await testId(page, 'week-cardio').textContent(), '25 of 150 min');
  assert.equal(await page.getByRole('textbox', { name: 'Note for this day' }).inputValue(), '<img src=x onerror="window.__xss=1">');
  assert.equal(await page.evaluate(() => window.__xss), undefined);

  // Narrowest phones.
  await page.setViewportSize({ width: 320, height: 640 });
  await noOverflow(page, 'Today at 320px');
  await page.setViewportSize({ width: 390, height: 844 });

  // Works with no network once the service worker has the files.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null || caches.has('workout-tracker-v2'));
  await page.reload();
  await page.getByRole('heading', { name: 'Today, Nov 11' }).waitFor();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('heading', { name: 'Today, Nov 11' }).waitFor();
  await context.setOffline(false);

  // Dark mode, and the installable manifest.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: path.join(OUT, 'today-dark.png'), fullPage: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.webmanifest'), 'utf8'));
  for (const icon of manifest.icons) assert.ok(fs.existsSync(path.join(__dirname, '..', icon.src)), `${icon.src} is missing`);

  assert.deepEqual(errors, [], 'page errors');
  assert.deepEqual(external, [], 'requests to other sites');
  await browser.close();
  server.close();
  console.log('Browser test passed.');
})().catch(e => { console.error(e); process.exit(1); });
