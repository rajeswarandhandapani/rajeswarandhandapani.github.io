const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup(saved,blocked=false) {
 const data=new Map(saved ? [['klg-progress-v1',saved]] : []);
 const context={window:{location:{pathname:'/games/counting/index.html'}},localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return data.get(k)||null;},setItem:(k,v)=>{if(blocked)throw Error('blocked');data.set(k,v);},removeItem:k=>data.delete(k)}};
 vm.runInNewContext(fs.readFileSync('assets/js/progress.js','utf8'),context);
 return context.window.KlgProgress;
}
test('completed rounds reward effort and persist achievements',()=>{
 const p=setup();assert.equal(p.record({score:0,total:10}).xp,10);
 const reward=p.record({score:10,total:10,bestStreak:10,elapsedMs:30000});
 assert.equal(reward.stars,3);assert.equal(p.summary().plays,2);assert.equal(p.gameStats('counting').bestScore,10);assert.ok(reward.newBadges.length);
 p.reset();assert.equal(p.summary().plays,0);
});
test('malformed or unavailable storage does not break learning',()=>{
 for(const saved of ['null','[]','oops','{"games":null,"badges":[],"xp":"bad"}','{"games":{"counting":null}}']) assert.equal(setup(saved).summary().plays,0);
 assert.doesNotThrow(()=>setup(null,true).record({score:3,total:10}));
});
test('stale streaks expire and restart after a completed game',()=>{
 const p=setup(JSON.stringify({lastDay:'2020-01-01',streak:8,bestStreak:8}));
 assert.equal(p.summary().dayStreak,0);p.record({score:1,total:10});assert.equal(p.summary().dayStreak,1);
});
test('practice cannot earn a speed badge or best time',()=>{
 const p=setup();p.record({score:10,total:10,elapsedMs:0});assert.equal(p.gameStats('counting').bestMs,0);assert.equal(p.summary().badges.speedy,undefined);
});

test('rounds keep the last five accuracy results and per-mode stars',()=>{
 const p=setup();
 for(const score of [1,2,3,4,5,6,7])p.record({score,total:10});
 const g=p.gameStats('counting');
 assert.deepEqual([...g.recent],[30,40,50,60,70]);
 assert.equal(g.byMode.default.plays,7);assert.equal(g.byMode.default.bestStars,2);
 assert.ok(g.lastPlayed);
});
test('old records without the newer fields still load and update',()=>{
 const p=setup(JSON.stringify({xp:20,plays:1,games:{counting:{plays:1,bestScore:4,total:10,bestStars:0,bestMs:0}},badges:{}}));
 assert.equal(p.summary().games.counting.recent.length,0);
 p.record({score:8,total:10});
 assert.deepEqual([...p.gameStats("counting").recent],[80]);
});
test('comeback badge needs a better score than an earlier round',()=>{
 const p=setup();
 assert.ok(!p.record({score:5,total:10}).newBadges.some(b=>b.id==='comeback'));
 assert.ok(!p.record({score:4,total:10}).newBadges.some(b=>b.id==='comeback'));
 assert.ok(p.record({score:7,total:10}).newBadges.some(b=>b.id==='comeback'));
});
