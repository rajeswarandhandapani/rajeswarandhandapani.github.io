// The v4 harder number levels. Plays each one and works every answer out again
// from the words on screen. Server must be running: npm start, then
//   npm run test:levels
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://localhost:4173';

const num = (s) => Number(String(s).replace(/,/g, ''));
const value = (s) => { const [n, d] = s.split('/').map(Number); return n / d; };

const CHECKS = {
 'multiplication/index.html': ({ prompt, answer }) => {
  const [a, b] = prompt.split('×').map(Number);
  assert.ok(a <= 12 && b <= 12, prompt);
  assert.equal(num(answer), a * b, prompt);
  return Math.max(a, b) === 12;
 },
 'addition-subtraction/index.html?max=1000': ({ prompt, answer, labels }) => {
  const m = prompt.match(/(\d+) ([+−]) (\d+)/);
  const [a, b] = [Number(m[1]), Number(m[3])];
  assert.ok(a >= 100 && b >= 100, prompt);
  assert.equal(num(answer), m[2] === '+' ? a + b : a - b, prompt);
  for (const c of labels) assert.ok(num(c) >= 0, 'no negative choices: ' + c);
 },
 'division/index.html?level=4': ({ prompt, answer }) => {
  const m = prompt.match(/(\d+) ÷ (\d+)/);
  assert.ok(Number(m[1]) >= 10 && Number(m[1]) <= 99, prompt);
  assert.ok(Number(m[2]) >= 2 && Number(m[2]) <= 9, prompt);
  assert.equal(num(answer) * Number(m[2]), Number(m[1]), prompt);
 },
 'fractions/index.html?level=4&type=add': ({ prompt, answer, labels }) => {
  const m = prompt.match(/(\d+)\/(\d+) ([+−]) (\d+)\/(\d+)/);
  assert.notEqual(m[2], m[5], 'different denominators: ' + prompt);
  const exact = m[3] === '+' ? Number(m[1]) / Number(m[2]) + Number(m[4]) / Number(m[5]) : Number(m[1]) / Number(m[2]) - Number(m[4]) / Number(m[5]);
  assert.ok(Math.abs(value(answer) - exact) < 1e-9, `${prompt} = ${answer}`);
  for (const c of labels) if (c !== answer) assert.ok(Math.abs(value(c) - exact) > 1e-9, `${prompt}: ${c} is quietly right too`);
 },
 'fractions/index.html?level=4&type=compare': ({ prompt, answer, labels }) => {
  const values = labels.map(value);
  assert.equal(new Set(values).size, 4, 'four different values');
  assert.equal(value(answer), /BIGGEST/.test(prompt) ? Math.max(...values) : Math.min(...values), prompt);
  assert.ok(new Set(labels.map((c) => c.split('/')[1])).size > 1, 'denominators differ');
 },
 'comparing-numbers/index.html?max=10000&type=biggest': ({ answer, labels }) => {
  const values = labels.map(num);
  assert.ok(values.every((v) => v >= 1 && v < 10000), labels.join());
  assert.equal(num(answer), Math.max(...values));
 },
 'comparing-numbers/index.html?max=10000&type=symbol': ({ prompt, answer }) => {
  const nums = prompt.match(/[\d,]+/g).map(num);
  const right = nums[0] < nums[1] ? '<' : nums[0] > nums[1] ? '>' : '=';
  assert.equal(answer, right, prompt);
 },
 'rounding-place-value/index.html?level=4&type=rounding': ({ prompt, answer }) => {
  const m = prompt.match(/Round ([\d,]+) to the nearest (hundred|thousand|ten thousand)/);
  const unit = { hundred: 100, thousand: 1000, 'ten thousand': 10000 }[m[2]];
  assert.equal(num(answer), Math.round(num(m[1]) / unit) * unit, prompt);
 },
 'rounding-place-value/index.html?level=4&type=placevalue': ({ prompt, answer, labels }) => {
  const digit = prompt.match(/Which digit is in the (.+) place of ([\d,]+)/);
  if (digit) {
   const unit = { ones: 1, tens: 10, hundreds: 100, thousands: 1000, 'ten thousands': 10000 }[digit[1]];
   assert.equal(num(answer), Math.floor(num(digit[2]) / unit) % 10, prompt);
  }
  const worth = prompt.match(/value of the (\d) in ([\d,]+)/);
  if (worth) assert.ok(String(num(worth[2])).includes(worth[1]), prompt);
  assert.equal(new Set(labels).size, labels.length, prompt);
 },
};

(async () => {
 const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
 const context = await browser.newContext({ viewport: { width: 320, height: 800 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
 const page = await context.newPage();
 const errors = [];
 page.on('pageerror', (e) => errors.push(e.message));
 for (const [path, check] of Object.entries(CHECKS)) {
  let sawTwelve = false;
  for (let round = 0; round < (path.startsWith('multiplication') ? 3 : 2); round++) {
   await page.goto(`${base}/games/${path}`);
   await page.locator('#start-btn').click();
   const total = Number(await page.locator('#total-questions').textContent());
   for (let i = 0; i < total; i++) {
    await page.locator('.quiz-choice-btn').first().waitFor();
    const prompt = await page.locator('#question-text').textContent();
    const labels = await page.locator('.quiz-choice-btn').evaluateAll((bs) => bs.map((b) => b.dataset.answer));
    assert.equal(new Set(labels).size, labels.length, `${path}: repeated choices for ${prompt}: ${labels}`);
    assert.ok(labels.length >= 3, `${path}: too few choices for ${prompt}`);
    await page.locator('.quiz-choice-btn').first().click();
    const answer = await page.locator('.quiz-choice-btn.correct').first().getAttribute('data-answer');
    if (check({ prompt, answer, labels })) sawTwelve = true;
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${path}: sideways scroll at 320px on ${prompt}`);
    await page.locator('.quiz-next').click();
   }
  }
  if (path.startsWith('multiplication')) assert.ok(sawTwelve, 'the 12 times table appears');
  assert.deepEqual(errors.splice(0), [], path + ': page errors');
  console.log('PASS', path);
 }
 await browser.close();
 console.log('PASS all harder number levels: every answer worked out again from the screen.');
})().catch((e) => { console.error(e); process.exit(1); });
