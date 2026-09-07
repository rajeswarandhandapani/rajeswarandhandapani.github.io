'use strict';
document.addEventListener('DOMContentLoaded', () => {
 const board=document.getElementById('memory-board');
 const status=document.getElementById('memory-status');
 const feedback=document.getElementById('memory-feedback');
 const pictures=[['🌻','sunflower'],['🦋','butterfly'],['🐞','ladybug'],['🌈','rainbow'],['🍓','strawberry'],['🐝','bee']];
 let opened=[],pairs=0,turns=0,locked=false,timeout=null;
 function start() {
  clearTimeout(timeout); opened=[];pairs=0;turns=0;locked=false;
  document.getElementById('start-screen').classList.add('d-none');
  document.getElementById('memory-screen').classList.remove('d-none');
  board.replaceChildren();feedback.textContent='Choose two cards to find a pair.'; update();
  const deck=[...pictures,...pictures];
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  deck.forEach(([emoji,name],index)=>{
   const card=document.createElement('button');card.className='memory-card';card.textContent='✦';card.setAttribute('aria-label',`Card ${index+1}, face down`);
   card.addEventListener('click',()=>{
    if(locked || card.disabled || opened.some(item=>item.card===card))return;
    card.textContent=emoji;card.classList.add('flipped');card.setAttribute('aria-label',`Card ${index+1}, ${name}`);
    opened.push({card,emoji,index});
    if(opened.length<2)return;
    turns++;
    if(opened[0].emoji===opened[1].emoji){
     pairs++;opened.forEach(item=>{item.card.disabled=true;item.card.classList.add('matched');});opened=[];
     feedback.textContent=`A pair of ${name}s! Keep exploring.`;if(window.KlgSounds)KlgSounds.correct();
     if(pairs===6){const reward=KlgProgress.record({gameId:'memory-match',score:6,total:6,elapsedMs:0,bestStreak:0});feedback.textContent=`You found all 6 pairs in ${turns} turns! +${reward.xp} XP. Well done!`;document.getElementById('restart-memory').focus();}
    } else {
     locked=true;feedback.textContent='Remember these pictures. Try a different pair!';
     timeout=setTimeout(()=>{opened.forEach(item=>{item.card.textContent='✦';item.card.classList.remove('flipped');item.card.setAttribute('aria-label',`Card ${item.index+1}, face down`);});opened=[];locked=false;},1400);
    }
    update();
   });board.appendChild(card);
  });board.firstElementChild.focus();
 }
 function update(){status.textContent=`${pairs} of 6 pairs found · ${turns} turns`;}
 document.getElementById('start-btn').onclick=start;
 document.getElementById('restart-memory').onclick=start;
});
