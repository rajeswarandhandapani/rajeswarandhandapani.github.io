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
