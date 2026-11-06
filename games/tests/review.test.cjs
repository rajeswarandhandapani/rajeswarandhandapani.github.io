const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

const source = fs.readFileSync('assets/js/progress.js', 'utf8');

/** Loads progress.js with its own storage and a clock the test can move. */
function setup({ saved = {}, blocked = false, search = '', pathname = '/games/counting/index.html' } = {}) {
 const data = new Map(Object.entries(saved));
 const clock = { now: new Date(2026, 10, 5, 9).getTime() };
 class FakeDate extends Date {
  constructor(...args) { if (args.length) super(...args); else super(clock.now); }
 }
 const context = {
  Date: FakeDate,
  window: { location: { pathname, search } },
  localStorage: {
   getItem: (k) => { if (blocked) throw Error('blocked'); return data.has(k) ? data.get(k) : null; },
   setItem: (k, v) => { if (blocked) throw Error('blocked'); data.set(k, v); },
   removeItem: (k) => data.delete(k),
  },
 };
 vm.runInNewContext(source, context);
 const p = context.window.KlgProgress;
 return { p, r: p.review, data, loc: context.window.location, days: (n) => { clock.now += n * 86400000; } };
}
const miss = (r, key = 'q1') => r.miss({ key, snapshot: { prompt: key }, prompt: key + '?', answer: 'yes' });

test('a missed question waits a day, then follows the 1 → 3 → cleared schedule', () => {
 const { r, days } = setup();
 const id = miss(r);
 assert.equal(r.summary().due, 0, 'not due the day it was missed');
 assert.equal(r.summary().waiting, 1);
 days(1);
 assert.equal(r.summary().due, 1);
 assert.equal(r.answered(id, true), 'later');
 assert.equal(r.summary().due, 0);
 days(2);
 assert.equal(r.summary().due, 0, 'still waiting on day 2 of the 3-day gap');
 days(1);
 assert.equal(r.summary().due, 1);
 assert.equal(r.answered(id, true), 'cleared');
 const after = r.summary();
 assert.equal(after.due + after.waiting, 0);
 assert.equal(after.cleared, 1);
});

test('a wrong answer in review restarts the schedule and counts the miss', () => {
 const { r, days } = setup();
 const id = miss(r);
 days(1);
 r.answered(id, true);
 days(3);
 assert.equal(r.answered(id, false), 'again');
 assert.equal(r.summary().due, 0);
 days(1);
 assert.equal(r.summary().due, 1);
 assert.equal(r.tricky()[0].misses, 2);
 assert.equal(r.answered(id, true), 'later', 'one right answer is not enough after a restart');
});

test('missing the same question again does not duplicate it', () => {
 const { r } = setup();
 miss(r);
 miss(r);
 assert.equal(r.summary().waiting, 1);
 assert.equal(r.tricky()[0].misses, 2);
});

test('questions are grouped by game and settings, and the review flag is not part of them', () => {
 const a = setup({ search: '?level=2&review=1' });
 assert.equal(a.r.isActive(), true);
 miss(a.r);
 a.days(1);
 const [group] = a.r.summary().groups;
 assert.equal(group.query, 'level=2');
 assert.equal(group.href, 'games/counting/index.html?level=2&review=1');
 assert.equal(a.r.dueHere().length, 1);
 a.loc.search = '?level=3&review=1';
 assert.equal(a.r.dueHere().length, 0, 'another level has its own questions');
 const b = setup();
 assert.equal(b.r.isActive(), false);
 miss(b.r);
 b.days(1);
 assert.equal(b.r.summary().groups[0].href, 'games/counting/index.html?review=1');
});

test('dueHere honours the limit and gives the oldest miss first', () => {
 const { r, days } = setup();
 for (let i = 0; i < 12; i++) miss(r, 'q' + i);
 days(1);
 const list = r.dueHere(10);
 assert.equal(list.length, 10);
 assert.equal(list[0].snapshot.prompt, 'q0');
});

test('the store is capped by count and size, oldest first', () => {
 const { r } = setup();
 for (let i = 0; i < 130; i++) miss(r, 'q' + i);
 assert.equal(r.summary().waiting, 100);
 assert.ok(!r.tricky(100).some((t) => t.prompt === 'q0?'), 'oldest was dropped');
 const big = setup();
 const pad = 'x'.repeat(40000);
 for (let i = 0; i < 40; i++) big.r.miss({ key: 'b' + i, snapshot: { pad } });
 assert.ok(big.data.get('klg-review-v1').length <= 1000000);
 assert.ok(big.r.summary().waiting < 40);
 assert.equal(big.r.miss({ key: 'huge', snapshot: { pad: 'x'.repeat(60000) } }), null, 'one huge question is skipped');
});

test('damaged, old-format or unavailable storage does not break play', () => {
 for (const bad of ['oops', 'null', '[]', '{"epoch":1,"items":"no"}', '{"epoch":0,"items":[]}']) {
  const { r } = setup({ saved: { 'klg-review-v1': bad } });
  assert.equal(r.summary().waiting, 0, bad);
  assert.ok(miss(r), 'a miss still saves after: ' + bad);
 }
 const mixed = JSON.stringify({ epoch: 1, cleared: -3, items: [null, { id: 'x' }, { id: 'g||k', gameId: 'g', query: '', due: 'soon', step: 0, snapshot: {} }] });
 assert.equal(setup({ saved: { 'klg-review-v1': mixed } }).r.summary().waiting, 0);
 const blocked = setup({ blocked: true });
 assert.doesNotThrow(() => miss(blocked.r));
 assert.equal(blocked.r.summary().due, 0);
 assert.doesNotThrow(() => blocked.r.finish({ right: 1 }));
});

test('a review round earns XP and the day streak but leaves stars and scores alone', () => {
 const { p, r, days } = setup();
 p.record({ score: 8, total: 10 });
 const before = JSON.stringify(p.gameStats('counting'));
 const plays = p.summary().plays;
 const xp = p.summary().xp;
 const id = miss(r);
 days(1);
 r.answered(id, true);
 const reward = r.finish({ right: 3, cleared: 0 });
 assert.equal(reward.xp, 15);
 assert.equal(p.summary().xp, xp + 15);
 assert.equal(p.summary().plays, plays);
 assert.equal(JSON.stringify(p.gameStats('counting')), before);
 assert.equal(p.summary().dayStreak, 2);
});

test('Second Chance is earned by clearing a question, and a review cannot earn score badges', () => {
 const { p, r } = setup();
 const none = r.finish({ right: 10, cleared: 0 });
 assert.deepEqual([...none.newBadges].map((b) => b.id), []);
 const earned = r.finish({ right: 1, cleared: 1 });
 assert.deepEqual([...earned.newBadges].map((b) => b.id), ['second-chance']);
 assert.equal(r.finish({ right: 1, cleared: 1 }).newBadges.length, 0, 'only once');
 assert.equal(p.summary().badges.perfect, undefined);
 assert.equal(p.record({ score: 5, total: 10 }).newBadges.some((b) => b.id === 'second-chance'), false);
});

test('Start over clears saved questions too', () => {
 const { p, r } = setup();
 miss(r);
 p.reset();
 assert.equal(r.summary().waiting, 0);
});

test('the game id comes from the last folder, including inside the website\'s /games/ folder', () => {
 for (const pathname of ['/games/counting/index.html', '/games/games/counting/index.html', '/kid-Learning-games/games/counting/', '/games/games/counting/']) {
  assert.equal(setup({ pathname }).p.currentGameId(), 'counting', pathname);
 }
 assert.equal(setup({ pathname: '/index.html' }).p.currentGameId(), null);
 assert.equal(setup({ pathname: '/games/index.html' }).p.currentGameId(), null);
});

test('a v3 progress record loads unchanged', () => {
 const v3 = JSON.stringify({ xp: 720, plays: 9, streak: 2, bestStreak: 4, lastDay: '2026-11-04', games: { counting: { plays: 9, bestScore: 10, total: 10, bestStars: 3, bestMs: 0, recent: [90, 100], byMode: {} } }, badges: { perfect: '2026-10-30' } });
 const { p } = setup({ saved: { 'klg-progress-v1': v3 } });
 const s = p.summary();
 assert.equal(s.xp, 720);
 assert.equal(s.stars, 3);
 assert.equal(s.badges.perfect, '2026-10-30');
 assert.equal(s.dayStreak, 2);
});
