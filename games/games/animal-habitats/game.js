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
document.addEventListener('DOMContentLoaded', () => {
 const quiz = new QuizEngine({totalQuestions:10,timePerQuestion:25,generateQuestion:()=>{
  const [emoji,animal,correct,explanation]=HABITATS[Math.floor(Math.random()*HABITATS.length)];
  const others=[...new Set(HABITATS.map(row=>row[2]))].filter(place=>place!==correct).sort(()=>Math.random()-.5).slice(0,3);
  return {prompt:`${emoji}\nWhere would you find a ${animal}?`,correctAnswer:correct,choices:[correct,...others].sort(()=>Math.random()-.5),explanation};
 }});
 document.getElementById('start-btn').onclick=()=>{document.getElementById('start-screen').classList.add('d-none');quiz.start();};
 document.getElementById('play-again-btn').onclick=()=>quiz.start();
});
