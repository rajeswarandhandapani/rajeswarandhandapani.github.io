/* Sentence contexts are shared by the two Tamil typing activities.
 * The English clue identifies the intended word when a sentence admits
 * several sensible answers. Accepted synonyms apply to whole-word mode.
 */
(function (root) {
  'use strict';
  const sentences = [
    { id: 'cow', category: 'animals', before: '', word: 'மாடு', after: ' பால் தரும்.', clue: 'Cow', emoji: '🐄', alternatives: ['பசு'] },
    { id: 'cat', category: 'animals', before: '', word: 'பூனை', after: ' “மியாவ்” என்று கத்தும்.', clue: 'Cat', emoji: '🐱' },
    { id: 'dog', category: 'animals', before: 'வீட்டைக் காக்கும் விலங்கு ', word: 'நாய்', after: '.', clue: 'Dog', emoji: '🐶' },
    { id: 'fish', category: 'animals', before: '', word: 'மீன்', after: ' நீரில் நீந்தும்.', clue: 'Fish', emoji: '🐟' },
    { id: 'elephant', category: 'animals', before: '', word: 'யானை', after: ' நீண்ட தும்பிக்கையைக் கொண்டது.', clue: 'Elephant', emoji: '🐘' },
    { id: 'rabbit', category: 'animals', before: '', word: 'முயல்', after: ' துள்ளித் துள்ளி ஓடும்.', clue: 'Rabbit', emoji: '🐰' },
    { id: 'monkey', category: 'animals', before: '', word: 'குரங்கு', after: ' மரத்துக்கு மரம் தாவும்.', clue: 'Monkey', emoji: '🐒' },
    { id: 'peacock', category: 'animals', before: '', word: 'மயில்', after: ' அழகான தோகையைக் கொண்டது.', clue: 'Peacock', emoji: '🦚' },
    { id: 'turtle', category: 'animals', before: '', word: 'ஆமை', after: ' மெதுவாக நடக்கும்.', clue: 'Turtle', emoji: '🐢' },
    { id: 'bee', category: 'animals', before: '', word: 'தேனீ', after: ' பூக்களில் தேன் சேகரிக்கும்.', clue: 'Bee', emoji: '🐝' },
    { id: 'sun', category: 'nature', before: '', word: 'சூரியன்', after: ' கிழக்கில் உதிக்கும்.', clue: 'Sun', emoji: '☀️' },
    { id: 'moon', category: 'nature', before: 'இரவில் வானில் ', word: 'நிலா', after: ' தெரியும்.', clue: 'Moon', emoji: '🌙', alternatives: ['நிலவு'] },
    { id: 'rain', category: 'nature', before: 'வானத்தில் இருந்து ', word: 'மழை', after: ' பொழிகிறது.', clue: 'Rain', emoji: '🌧️' },
    { id: 'flower', category: 'nature', before: '', word: 'பூ', after: ' அழகாக மணம் வீசுகிறது.', clue: 'Flower', emoji: '🌸', alternatives: ['மலர்'] },
    { id: 'tree', category: 'nature', before: '', word: 'மரம்', after: ' நிழல் தரும்.', clue: 'Tree', emoji: '🌳' },
    { id: 'leaf', category: 'nature', before: 'மரத்தில் பச்சை நிற ', word: 'இலை', after: ' உள்ளது.', clue: 'Leaf', emoji: '🍃' },
    { id: 'rainbow', category: 'nature', before: '', word: 'வானவில்', after: ' பல நிறங்களில் தோன்றும்.', clue: 'Rainbow', emoji: '🌈' },
    { id: 'sea', category: 'nature', before: '', word: 'கடல்', after: ' உப்பு நீரைக் கொண்டது.', clue: 'Sea', emoji: '🌊' },
    { id: 'cloud', category: 'nature', before: 'வானில் வெள்ளை நிற ', word: 'மேகம்', after: ' மிதக்கிறது.', clue: 'Cloud', emoji: '☁️' },
    { id: 'star', category: 'nature', before: 'வானில் ', word: 'நட்சத்திரம்', after: ' மின்னுகிறது.', clue: 'Star', emoji: '⭐' },
    { id: 'water', category: 'everyday', before: 'நாம் ', word: 'தண்ணீர்', after: ' குடிக்கிறோம்.', clue: 'Water', emoji: '💧', alternatives: ['நீர்'] },
    { id: 'milk', category: 'everyday', before: '', word: 'பால்', after: ' வெள்ளை நிறத்தில் இருக்கும்.', clue: 'Milk', emoji: '🥛' },
    { id: 'banana', category: 'everyday', before: 'மஞ்சள் நிறப் பழம் ', word: 'வாழைப்பழம்', after: '.', clue: 'Banana', emoji: '🍌' },
    { id: 'mango', category: 'everyday', before: '', word: 'மாம்பழம்', after: ' ஒரு இனிப்பான பழம்.', clue: 'Mango', emoji: '🥭' },
    { id: 'book', category: 'everyday', before: 'நான் ', word: 'புத்தகம்', after: ' படிக்கிறேன்.', clue: 'Book', emoji: '📖', alternatives: ['நூல்'] },
    { id: 'ball', category: 'everyday', before: '', word: 'பந்து', after: ' உருண்டையாக இருக்கும்.', clue: 'Ball', emoji: '⚽' },
    { id: 'ear', category: 'everyday', before: '', word: 'காது', after: ' கேட்பதற்கு உதவுகிறது.', clue: 'Ear', emoji: '👂' },
    { id: 'nose', category: 'everyday', before: '', word: 'மூக்கு', after: ' முகர உதவுகிறது.', clue: 'Nose', emoji: '👃' },
    { id: 'airplane', category: 'everyday', before: '', word: 'விமானம்', after: ' வானத்தில் பறக்கும்.', clue: 'Airplane', emoji: '✈️' },
    { id: 'ship', category: 'everyday', before: '', word: 'கப்பல்', after: ' கடலில் செல்லும்.', clue: 'Ship', emoji: '🚢' },
    { id: 'train', category: 'everyday', before: '', word: 'ரயில்', after: ' தண்டவாளத்தில் ஓடும்.', clue: 'Train', emoji: '🚂', alternatives: ['தொடர்வண்டி'] },
    { id: 'house', category: 'everyday', before: 'நாம் வசிக்கும் இடம் ', word: 'வீடு', after: '.', clue: 'House', emoji: '🏠', alternatives: ['இல்லம்'] }
  ];
  const normalize = value => String(value).normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  // Tamil orthographic letters: a base and its dependent vowel/pulli marks.
  // NFC also brings decomposed ஒ/ஓ/ஔ forms together before splitting.
  function letters(value) {
    return normalize(value).match(/[^\p{M}]\p{M}*/gu) || [];
  }
  const vowels = ['அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ', 'ஐ', 'ஒ', 'ஓ', 'ஔ'];
  const consonants = ['க', 'ங', 'ச', 'ஞ', 'ட', 'ண', 'த', 'ந', 'ப', 'ம', 'ய', 'ர', 'ல', 'வ', 'ழ', 'ள', 'ற', 'ன'];
  const signs = ['', 'ா', 'ி', 'ீ', 'ு', 'ூ', 'ெ', 'ே', 'ை', 'ொ', 'ோ', 'ௌ', '்'];
  const api = { sentences, normalize, letters, vowels, consonants, signs };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TamilSentenceData = api;
})(typeof window !== 'undefined' ? window : globalThis);
