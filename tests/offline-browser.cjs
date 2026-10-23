// Checks that the games work with no network after one visit.
// Server must be running (npm start). BASE_URL may include a sub-folder, e.g.
// BASE_URL=http://localhost:8000/games when the site is copied into a website's games/ folder.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = (process.env.BASE_URL || 'http://localhost:4173').replace(/\/$/, '');

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, serviceWorkers: 'allow' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // First visit, online: the service worker saves everything.
  await page.goto(base + '/index.html');
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  assert.ok(scope.startsWith(base + '/'), `service worker scope ${scope} stays inside ${base}/`);
  const expected = await page.evaluate(async () => {
    const text = await (await fetch('sw.js')).text();
    return (text.match(/"\.\//g) || []).length;
  });
  let saved = 0;
  for (let i = 0; i < 120 && saved < expected; i++) {
    saved = await page.evaluate(async () => {
      const key = (await caches.keys()).find((k) => k.startsWith('klg-'));
      return key ? (await (await caches.open(key)).keys()).length : 0;
    });
    if (saved < expected) await page.waitForTimeout(500);
  }
  assert.ok(saved >= expected, `saved ${saved} of ${expected} files`);
  console.log(`PASS saved ${saved} files for offline use (scope ${scope})`);

  // No network from here on.
  await context.setOffline(true);
  await page.goto(base + '/index.html');
  assert.ok(await page.locator('.game-card').count() > 70, 'home page and catalogue load offline');
  await page.locator('#parent-open').click();
  await page.waitForTimeout(300);
  assert.match(await page.locator('#offline-status').textContent(), /Saved on this device/);
  await page.keyboard.press('Escape');

  for (const path of ['fractions/index.html?type=picture&level=1', 'time/index.html?level=3', 'clock-setter/index.html?level=2', 'map-explorer/index.html', 'tamil-days-colours/index.html?mode=colours', 'tamil-story-time/index.html', 'memory-match/index.html']) {
    await page.goto(`${base}/games/${path}`);
    await page.locator('#start-btn').click();
    await page.waitForTimeout(300);
    const playing = await page.locator('.quiz-choice-btn, #stage button, #stage [role=button], .memory-card').count();
    assert.ok(playing > 0, `${path} plays offline`);
    console.log('PASS offline:', path);
  }
  // Recorded Tamil audio and the emoji font come from the saved copy.
  await page.goto(`${base}/games/tamil-days-colours/index.html`);
  const assets = await page.evaluate(async () => {
    const names = Object.values(window.KLG_TAMIL_AUDIO || {}).slice(0, 3);
    const out = [];
    for (const n of names) out.push((await fetch('../../assets/audio/tamil/' + n + '.mp3')).status);
    return out;
  });
  assert.ok(assets.length && assets.every((s) => s === 200), 'Tamil recordings play offline: ' + assets);
  const fonts = await page.evaluate(async () => Promise.all(['NotoColorEmoji.ttf', 'NotoSansTamil.ttf'].map(async (f) => (await fetch('../../assets/fonts/' + f)).status)));
  assert.deepEqual(fonts, [200, 200], 'emoji and Tamil fonts load offline');
  assert.deepEqual(errors, [], errors.join('; '));
  await browser.close();
  console.log('PASS all games work offline after one visit; no page errors.');
})().catch((e) => { console.error(e); process.exit(1); });
