'use strict';
const STORIES = new URLSearchParams(location.search).get('level') === '2' ? window.KlgQuestions.STORIES_2 : window.KlgQuestions.STORIES;
function storyPicture(emoji) {
 const f = document.createElement('figure');
 f.className = 'kv-clue';
 f.setAttribute('role', 'img');
 f.setAttribute('aria-label', 'A picture for the story');
 f.innerHTML = '<span aria-hidden="true">' + emoji + '</span>';
 return f;
}
document.addEventListener('DOMContentLoaded', () => {
 const quiz = new QuizEngine({totalQuestions:8,timePerQuestion:45,generateQuestion:() => {
  const index = Math.floor(Math.random()*STORIES.length);
  const [story,question,correct,others,explanation,picture] = STORIES[index];
  return {visual:storyPicture(picture),prompt:story+'\n\n'+question,dedupeKey:'story-'+index,correctAnswer:correct,choices:[correct,...others].sort(() => Math.random()-.5),explanation};
 }});
 document.getElementById('start-btn').onclick=()=>{document.getElementById('start-screen').classList.add('d-none');quiz.start();};
 document.getElementById('play-again-btn').onclick=()=>quiz.start();
});
