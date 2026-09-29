const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.BASE_URL||'http://localhost:4173';
(async()=>{
 fs.mkdirSync('artifacts',{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
 const errors=[];const external=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:'))external.push(r.url());});
 await page.goto(base);await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('.game-card').count(),33);
 await page.screenshot({path:'artifacts/home-desktop.png'});
 await page.locator('#game-search').fill('fractions');assert.equal(await page.locator('.game-tile:visible').count(),1);
 await page.locator('#game-search').fill('unfindable');assert.ok(await page.locator('#empty-games').isVisible());
 await page.locator('#clear-filters').click();
 await page.getByRole('button',{name:'Favorite Counting',exact:true}).click();
 await page.locator('[data-subject="favorites"]').click();assert.equal(await page.locator('.game-tile:visible').count(),1);
 await page.reload();assert.equal(await page.getByRole('button',{name:'Favorite Counting',exact:true}).getAttribute('aria-pressed'),'true');
 await page.locator('#level-filter').selectOption('4');assert.equal(await page.locator('.game-tile:visible').count(),4);
 await page.locator('#parent-open').click();assert.ok(await page.locator('#parent-dialog').isVisible());await page.keyboard.press('Escape');
 await page.locator('#level-filter').selectOption('all');
 await page.locator('#game-search').fill('Picture Words');assert.equal(await page.locator('.game-tile:visible').count(),1);
 await page.locator('#game-search').fill('');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/home-mobile.png'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const games=fs.readdirSync('games').filter(id=>fs.existsSync(path.join('games',id,'index.html')));
 for(const id of games){
  await page.goto(`${base}/games/${id}/index.html`);await page.locator('#start-btn').click();
  if(id==='memory-match')continue;
  if(id==='tamil-sentence-words'||id==='tamil-missing-letters'){
    assert.ok(await page.locator('#tamil-answer').isVisible());
    await page.locator('#typing-exit').click();
    continue;
  }
  await page.locator('.quiz-choice-btn').first().waitFor();
  if(['picture-words','feelings-faces','everyday-tools'].includes(id)){
    assert.ok(await page.locator('#quiz-screen .quiz-listen').isVisible(),id);
    assert.ok(await page.locator('.quiz-choice-btn').first().getAttribute('aria-label'),id);
    assert.match(await page.locator('.quiz-choice-btn').first().textContent(),/[^A-Za-z\s]/u,id);
  }
  assert.equal(await page.locator('#timer-text').textContent(),'Practice · no timer',id);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${id}: mobile overflow`);
  await page.locator('.quiz-choice-btn').first().click();await page.locator('.quiz-next').waitFor({state:'visible'});
  if(['picture-words','feelings-faces','everyday-tools'].includes(id)) assert.equal(await page.locator('.quiz-choice-listen').first().isDisabled(),false,id);
  assert.ok((await page.locator('#quiz-feedback').textContent()).length>5,id);
  await page.locator('.quiz-next').click();assert.equal(await page.locator('#question-number').textContent(),'2',id);
  await page.locator('#quiz-exit').click();assert.ok(await page.locator('#start-screen').isVisible(),id);
  console.log('PASS start, answer, feedback, next, exit:',id);
 }
 // Complete an actual practice round with clicks, then verify rewards survive reload.
 await page.goto(`${base}/games/counting/index.html?max=5`);await page.locator('#start-btn').click();
 await page.screenshot({path:'artifacts/counting-mobile.png'});
 const total=Number(await page.locator('#total-questions').textContent());
 for(let i=0;i<total;i++){await page.locator('.quiz-choice-btn').first().click();await page.locator('.quiz-next').click();}
 assert.ok(await page.locator('#results-screen').isVisible());
 assert.equal(await page.evaluate(()=>KlgProgress.summary().plays),1);
 await page.locator('#play-again-btn').click();assert.equal(await page.locator('#question-number').textContent(),'1');
 await page.reload();assert.equal(await page.evaluate(()=>KlgProgress.summary().plays),1);
 // Timed mode expires; practice does not. Use the browser clock rather than waiting.
 await page.clock.install();await page.locator('#play-mode').selectOption('challenge');await page.locator('#start-btn').click();
 await page.clock.fastForward(25000);assert.match(await page.locator('#quiz-feedback').textContent(),/answer is/);
 await page.clock.fastForward(4000);assert.equal(await page.locator('#question-number').textContent(),'2');
 await page.locator('#quiz-exit').click();await page.clock.fastForward(30000);assert.ok(await page.locator('#start-screen').isVisible());
 await page.locator('#play-mode').selectOption('practice');await page.locator('#start-btn').click();await page.clock.fastForward(60000);assert.equal(await page.locator('#question-number').textContent(),'1');
 await page.clock.resume();
 await page.goto(`${base}/games/reading-stories/index.html`);await page.setViewportSize({width:1440,height:1100});await page.locator('#start-btn').click();await page.screenshot({path:'artifacts/story-desktop.png'});
 assert.ok(await page.locator('#quiz-screen .quiz-listen').isVisible());
 assert.ok(await page.locator('.quiz-choice-listen').count()>0);
 await page.goto(`${base}/games/shapes-colors/index.html?mode=color`);
 await page.locator('#start-btn').click();
 assert.ok(await page.locator('#quiz-screen .quiz-listen').isVisible());
 assert.ok(await page.locator('.quiz-choice-btn').first().getAttribute('aria-label'));
 assert.ok(await page.locator('.quiz-choice-btn').first().textContent());
 const speechPage=await browser.newPage();
 await speechPage.addInitScript(()=>{
   window.__spoken=[];
   window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
   Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},speak(utterance){window.__spoken.push(utterance.text);}}});
 });
 await speechPage.goto(`${base}/games/picture-words/index.html`);
 await speechPage.locator('.quiz-intro-listen').click();
 assert.match((await speechPage.evaluate(()=>window.__spoken.at(-1))),/Picture Words/);
 await speechPage.locator('#start-btn').click();
 assert.match((await speechPage.evaluate(()=>window.__spoken.at(-1))),/Find the/);
 const spokenBefore=await speechPage.evaluate(()=>window.__spoken.length);
 await speechPage.locator('#quiz-screen .quiz-listen').click();
 assert.equal(await speechPage.evaluate(()=>window.__spoken.length),spokenBefore+1);
 await speechPage.locator('.quiz-choice-listen').first().click();
 assert.ok((await speechPage.evaluate(()=>window.__spoken.at(-1))).length>2);
 await speechPage.close();
 // Discover the deck through visible card flips, then match known pairs.
 await page.goto(`${base}/games/memory-match/index.html`);await page.locator('#start-btn').click();
 const deck=[];
 for(let i=0;i<12;i+=2){await page.locator('.memory-card').nth(i).click();await page.locator('.memory-card').nth(i+1).click();deck[i]=await page.locator('.memory-card').nth(i).textContent();deck[i+1]=await page.locator('.memory-card').nth(i+1).textContent();await page.waitForTimeout(1500);}
 for(const symbol of new Set(deck)){const indices=deck.map((s,i)=>s===symbol?i:-1).filter(i=>i>=0);if(await page.locator('.memory-card').nth(indices[0]).isDisabled())continue;for(const i of indices)await page.locator('.memory-card').nth(i).click();}
 assert.match(await page.locator('#memory-feedback').textContent(),/all 6 pairs/);
 await page.screenshot({path:'artifacts/memory-desktop.png'});
 assert.equal(await page.evaluate(()=>KlgProgress.summary().plays),2);
 await page.locator('#restart-memory').click();assert.equal(await page.locator('.memory-card:disabled').count(),0);
 await page.locator('#memory-change-size').click();
 await page.locator('#memory-size').selectOption('10');
 await page.locator('#start-btn').click();
 assert.equal(await page.locator('.memory-card').count(),20);
 assert.match(await page.locator('#memory-status').textContent(),/0 of 10 pairs/);
 // Start with invalid storage and with localStorage unavailable.
 await page.evaluate(()=>localStorage.setItem('klg-progress-v1','null'));await page.goto(base);assert.equal(await page.locator('.game-card').count(),33);
 const blocked=await browser.newPage();await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage disabled');}});});await blocked.goto(base);assert.equal(await blocked.locator('.game-card').count(),33);await blocked.close();
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 await browser.close();console.log('PASS all 33 activities, discovery, persistence, timers, replay, memory, mobile overflow; no runtime errors or external requests.');
})().catch(e=>{console.error(e);process.exit(1);});
