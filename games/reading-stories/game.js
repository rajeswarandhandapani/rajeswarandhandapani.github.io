'use strict';
const STORIES = [
 ['Mia planted a seed in a pot. She watered it every morning. Soon, a tiny green leaf appeared.','What helped the seed grow?','Water',['Stones','Paint','Sand'],'Plants need water to grow. Mia cared for her seed every morning.'],
 ['Leo put on his boots and picked up an umbrella. Outside, puddles covered the path.','What was the weather like?','Rainy',['Snowy','Dry','Very hot'],'An umbrella and puddles are clues that it was raining.'],
 ['A little bird collected twigs. It carried them to a branch and built a cozy home.','What did the bird build?','A nest',['A boat','A cave','A road'],'Birds use twigs and other materials to build nests.'],
 ['Sam shared half of his apple with Jo. Jo smiled and said, “Thank you!”','How did Sam help Jo?','He shared food',['He sang a song','He found a toy','He drew a map'],'Sam gave Jo some of his apple. Sharing can be kind.'],
 ['Nila looked under the bed for her sock. Then she looked in a basket. There it was!','Where was the sock?','In the basket',['Under the bed','In a tree','On the table'],'Nila looked in two places. She found the sock in the basket.'],
 ['The rabbit ran quickly. The turtle walked slowly. Both reached the pond before lunch.','Who reached the pond?','Both animals',['Only the rabbit','Only the turtle','Neither animal'],'The last sentence tells us both animals reached the pond.'],
 ['Ava made a card for her grandpa. She drew a big heart and wrote, “I love you.”','Why did Ava make the card?','To show love',['To order food','To learn numbers','To find her shoes'],'The heart and her words show that Ava cares about her grandpa.'],
 ['Ben packed a sandwich, an apple, and water. His class walked to the park for lunch.','What were they going to do?','Have a picnic',['Go to bed','Build a house','Take a bath'],'Bringing lunch to a park is a clue that they were having a picnic.'],
 ['At first, the puppy was muddy. Zara washed it. Now its fur was clean and fluffy.','What happened first?','The puppy was muddy',['Zara washed it','Its fur was clean','It went to sleep'],'“At first” tells us the puppy was muddy before Zara washed it.'],
 ['Omar could not reach a book. He asked his teacher for help. She handed it to him.','How did Omar get the book?','He asked for help',['He flew up','He used a boat','He bought a ladder'],'Omar asked his teacher, and she helped him reach the book.'],
 ['The lights went out. Dad found a flashlight. Its bright beam helped everyone see.','What helped everyone see?','The flashlight',['A pillow','A spoon','A blanket'],'A flashlight makes light, so it helps us see in the dark.'],
 ['A red kite got stuck in a tree. Wind blew through the leaves. The kite came loose and floated down.','What freed the kite?','The wind',['A fish','The raincoat','A bicycle'],'The wind moved the leaves and helped the kite come loose.']
];
document.addEventListener('DOMContentLoaded', () => {
 const quiz = new QuizEngine({totalQuestions:8,timePerQuestion:45,generateQuestion:() => {
  const [story,question,correct,others,explanation] = STORIES[Math.floor(Math.random()*STORIES.length)];
  return {prompt:story+'\n\n'+question,correctAnswer:correct,choices:[correct,...others].sort(() => Math.random()-.5),explanation};
 }});
 document.getElementById('start-btn').onclick=()=>{document.getElementById('start-screen').classList.add('d-none');quiz.start();};
 document.getElementById('play-again-btn').onclick=()=>quiz.start();
});
