'use strict';
const HABITATS = new URLSearchParams(location.search).get('level') === '2' ? window.KlgQuestions.HABITATS_2 : window.KlgQuestions.HABITATS;
const withArticle = (name) => (/^[aeiou]/i.test(name) ? 'an ' : 'a ') + name;
const SCENE_FOR = { Desert: "desert", Ocean: "ocean", Arctic: "arctic", Antarctica: "arctic", Forest: "forest", Rainforest: "rainforest",
 Grassland: "grassland", Pond: "pond", "Coral reef": "reef", Cave: "cave" };
const NEUTRAL = {
 Desert: [{e:'🌵',x:10,y:30,size:2.6},{e:'☀️',x:70,y:4,size:2.4},{e:'🏜️',x:44,y:48,size:2}],
 Ocean: [{e:'🌊',x:10,y:30,size:2.4},{e:'⛵',x:50,y:10,size:2.4},{e:'🫧',x:76,y:50,size:1.8}],
 Arctic: [{e:'❄️',x:14,y:8,size:2},{e:'🧊',x:60,y:46,size:2.4},{e:'⛄',x:30,y:34,size:2.4}],
 Antarctica: [{e:'❄️',x:14,y:8,size:2},{e:'🏔️',x:50,y:20,size:2.8},{e:'🧊',x:76,y:50,size:2}],
 Forest: [{e:'🌲',x:8,y:20,size:3},{e:'🌳',x:56,y:18,size:3.2},{e:'🍄',x:34,y:56,size:1.8}],
 Rainforest: [{e:'🌴',x:8,y:18,size:3.2},{e:'🌿',x:50,y:44,size:2.2},{e:'🌺',x:74,y:50,size:2}],
 Grassland: [{e:'🌾',x:10,y:40,size:2.6},{e:'🌼',x:50,y:56,size:1.8},{e:'☀️',x:74,y:4,size:2.4}],
 Pond: [{e:'🪷',x:20,y:46,size:2.2},{e:'🌿',x:60,y:14,size:2.2},{e:'💧',x:44,y:30,size:1.8}],
 'Coral reef': [{e:'🐚',x:16,y:56,size:2},{e:'🌿',x:60,y:40,size:2.2},{e:'🫧',x:40,y:14,size:1.8}],
 Cave: [{e:'🪨',x:18,y:50,size:2.4},{e:'⛰️',x:46,y:16,size:3},{e:'🕯️',x:76,y:46,size:2}],
};
function habitatChoice(place) {
 const box = document.createElement('div');
 box.className = 'kv-choice';
 // No animals in the scenes: a polar bear in the Arctic picture would give the answer away.
 const scene = KlgScene.preset(SCENE_FOR[place], { height: 78, label: place, items: NEUTRAL[place] });
 scene.removeAttribute('role'); scene.removeAttribute('aria-label');
 const text = document.createElement('div');
 text.className = 'kv-choice-text';
 text.textContent = place;
 box.append(scene, text);
 return box;
}
function animalPicture(emoji, animal) {
 const f = document.createElement('figure');
 f.className = 'kv-clue';
 f.setAttribute('role', 'img');
 f.setAttribute('aria-label', withArticle(animal));
 f.innerHTML = '<span aria-hidden="true">' + emoji + '</span>';
 return f;
}
document.addEventListener('DOMContentLoaded', () => {
 const quiz = new QuizEngine({totalQuestions:10,timePerQuestion:25,generateQuestion:()=>{
  const [emoji,animal,correct,explanation,alsoFair=[]]=HABITATS[Math.floor(Math.random()*HABITATS.length)];
  // Antarctica and the Arctic look alike and Ocean/Coral reef overlap, so keep wrong choices clearly different places.
  const conflicts = { Arctic: ['Antarctica'], Antarctica: ['Arctic'], Ocean: ['Coral reef'], 'Coral reef': ['Ocean'], Forest: ['Rainforest'], Rainforest: ['Forest'] };
  const others=[...new Set(HABITATS.map(row=>row[2]))].filter(place=>place!==correct && !(conflicts[correct]||[]).includes(place) && !alsoFair.includes(place)).sort(()=>Math.random()-.5).slice(0,3);
  const choices=[correct,...others].sort(()=>Math.random()-.5);
  const q={visual:animalPicture(emoji,animal),prompt:`Where would you find ${withArticle(animal)}?`,reviewPrompt:`${emoji} Where would you find ${withArticle(animal)}?`,dedupeKey:animal,correctAnswer:correct,choices,explanation,choiceVisuals:{},choiceLabels:{},noChoiceListen:true};
  choices.forEach(place=>{q.choiceVisuals[place]=habitatChoice(place);q.choiceLabels[place]=place;});
  return q;
 }});
 document.getElementById('start-btn').onclick=()=>{document.getElementById('start-screen').classList.add('d-none');quiz.start();};
 document.getElementById('play-again-btn').onclick=()=>quiz.start();
});
