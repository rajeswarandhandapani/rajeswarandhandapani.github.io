'use strict';
const HABITATS = [
 ['🐪','camel','Desert','Camels can survive with little water, and their wide feet help them walk on sand.'],
 ['🐬','dolphin','Ocean','Dolphins are mammals that swim in the ocean and come to the surface to breathe air.'],
 ['🐻‍❄️','polar bear','Arctic','Polar bears have thick fur and fat that help them stay warm in the cold Arctic.'],
 ['🐒','monkey','Forest','Many monkeys live in forests, where trees provide food and shelter.'],
 ['🦁','lion','Grassland','Lions often live in grasslands where they can hunt animals such as zebras.'],
 ['🐸','frog','Pond','Many frogs live near ponds. Their young, called tadpoles, grow in water.'],
 ['🦈','shark','Ocean','Most sharks live in salt water and breathe through gills.'],
 ['🐧','emperor penguin','Antarctica','Emperor penguins live in Antarctica. They huddle together to stay warm.'],
 ['🦒','giraffe','Grassland','Giraffes live in African grasslands and open woodlands, reaching leaves high in trees.'],
 ['🦧','orangutan','Rainforest','Orangutans spend much of their time in rainforest trees.'],
 ['🐟','clownfish','Coral reef','Clownfish live among sea anemones on warm ocean reefs.'],
 ['🦇','bat resting during the day','Cave','Many bats rest in caves during the day and look for food at night.']
];
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
 f.setAttribute('aria-label', 'A ' + animal);
 f.innerHTML = '<span aria-hidden="true">' + emoji + '</span>';
 return f;
}
document.addEventListener('DOMContentLoaded', () => {
 const quiz = new QuizEngine({totalQuestions:10,timePerQuestion:25,generateQuestion:()=>{
  const [emoji,animal,correct,explanation]=HABITATS[Math.floor(Math.random()*HABITATS.length)];
  // Antarctica and the Arctic look alike and Ocean/Coral reef overlap, so keep wrong choices clearly different places.
  const conflicts = { Arctic: ['Antarctica'], Antarctica: ['Arctic'], Ocean: ['Coral reef'], 'Coral reef': ['Ocean'], Forest: ['Rainforest'], Rainforest: ['Forest'] };
  const others=[...new Set(HABITATS.map(row=>row[2]))].filter(place=>place!==correct && !(conflicts[correct]||[]).includes(place)).sort(()=>Math.random()-.5).slice(0,3);
  const choices=[correct,...others].sort(()=>Math.random()-.5);
  const q={visual:animalPicture(emoji,animal),prompt:`Where would you find a ${animal}?`,reviewPrompt:`${emoji} Where would you find a ${animal}?`,dedupeKey:animal,correctAnswer:correct,choices,explanation,choiceVisuals:{},choiceLabels:{},noChoiceListen:true};
  choices.forEach(place=>{q.choiceVisuals[place]=habitatChoice(place);q.choiceLabels[place]=place;});
  return q;
 }});
 document.getElementById('start-btn').onclick=()=>{document.getElementById('start-screen').classList.add('d-none');quiz.start();};
 document.getElementById('play-again-btn').onclick=()=>quiz.start();
});
