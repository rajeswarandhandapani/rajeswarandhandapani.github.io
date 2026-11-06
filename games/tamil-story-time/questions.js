/* கதை நேரம். Each panel: [picture, Tamil, English]. The English is what the review sheet checks against. */
(function (root) {
  'use strict';
  const STORIES = [
    { title: "மழை நாள்", panels: [
        ["☁️", "வானத்தில் மேகம் கூடியது.", "Clouds gathered in the sky."], ["🌧️", "மழை பெய்தது.", "It rained."],
        ["🐸", "தவளை துள்ளிக் குதித்தது.", "The frog hopped happily."], ["🌈", "வானவில் தோன்றியது.", "A rainbow appeared."]],
      q: ["யார் துள்ளிக் குதித்தது?", "Who hopped happily?"],
      answer: ["🐸", "தவளை", "frog"], others: [["🐱", "பூனை", "cat"], ["🐘", "யானை", "elephant"], ["🐟", "மீன்", "fish"]] },
    { title: "தேனீ", panels: [
        ["🌸", "பூ மலர்ந்தது.", "The flower bloomed."], ["🐝", "தேனீ பூவிடம் வந்தது.", "The bee came to the flower."],
        ["🍯", "தேனீ தேன் சேகரித்தது.", "The bee collected honey."], ["🏠", "தேனீ கூட்டுக்குச் சென்றது.", "The bee went to its hive."]],
      q: ["தேனீ எதைச் சேகரித்தது?", "What did the bee collect?"],
      answer: ["🍯", "தேன்", "honey"], others: [["🥛", "பால்", "milk"], ["🍎", "ஆப்பிள்", "apple"], ["💧", "தண்ணீர்", "water"]] },
    { title: "இரவு", panels: [
        ["🌅", "சூரியன் மறைந்தது.", "The sun set."], ["🌙", "நிலா வந்தது.", "The moon came out."],
        ["⭐", "நட்சத்திரங்கள் மின்னின.", "The stars twinkled."], ["😴", "குழந்தை தூங்கியது.", "The baby slept."]],
      q: ["சூரியன் மறைந்த பிறகு எது வந்தது?", "What came after the sun set?"],
      answer: ["🌙", "நிலா", "moon"], others: [["☀️", "சூரியன்", "sun"], ["🌈", "வானவில்", "rainbow"], ["☁️", "மேகம்", "cloud"]] },
    { title: "முயலும் ஆமையும்", panels: [
        ["🐰", "முயல் வேகமாக ஓடியது.", "The rabbit ran fast."], ["🐢", "ஆமை மெதுவாக நடந்தது.", "The turtle walked slowly."],
        ["🏞️", "இரண்டும் குளத்துக்கு வந்தன.", "Both came to the pond."], ["💧", "இரண்டும் தண்ணீர் குடித்தன.", "Both drank water."]],
      q: ["யார் மெதுவாக நடந்தது?", "Who walked slowly?"],
      answer: ["🐢", "ஆமை", "turtle"], others: [["🐰", "முயல்", "rabbit"], ["🐘", "யானை", "elephant"], ["🐒", "குரங்கு", "monkey"]] },
    { title: "மீனாவின் பள்ளி", panels: [
        ["🎒", "மீனா பையை எடுத்தாள்.", "Meena took her bag."], ["🚌", "அவள் பேருந்தில் சென்றாள்.", "She went on the bus."],
        ["🏫", "அவள் பள்ளியை அடைந்தாள்.", "She reached the school."], ["📖", "அவள் புத்தகம் படித்தாள்.", "She read a book."]],
      q: ["மீனா எதில் சென்றாள்?", "What did Meena go in?"],
      answer: ["🚌", "பேருந்து", "bus"], others: [["🚲", "சைக்கிள்", "bicycle"], ["✈️", "விமானம்", "aeroplane"], ["🚢", "கப்பல்", "ship"]] },
    { title: "தோட்டம்", panels: [
        ["🌱", "ராமு விதை விதைத்தான்.", "Ramu sowed a seed."], ["💧", "அவன் தண்ணீர் ஊற்றினான்.", "He poured water."],
        ["🌿", "செடி வளர்ந்தது.", "The plant grew."], ["🌻", "பூ மலர்ந்தது.", "A flower bloomed."]],
      q: ["ராமு செடிக்கு என்ன ஊற்றினான்?", "What did Ramu pour on the plant?"],
      answer: ["💧", "தண்ணீர்", "water"], others: [["🥛", "பால்", "milk"], ["🍯", "தேன்", "honey"], ["🧃", "சாறு", "juice"]] },
    { title: "கோழியும் குஞ்சும்", panels: [
        ["🐔","கோழி முட்டை இட்டது.","The hen laid an egg."], ["🥚","முட்டை உடைந்தது.","The egg cracked."], ["🐣","குஞ்சு வெளியே வந்தது.","A chick came out."], ["🌾","குஞ்சு தானியம் தின்றது.","The chick ate grain."]],
      q: ["முட்டையில் இருந்து யார் வந்தது?","Who came out of the egg?"],
      answer: ["🐣","குஞ்சு","chick"], others: [["🐟","மீன்","fish"],["🐶","நாய்","dog"],["🐰","முயல்","rabbit"]] },
    { title: "பாட்டியின் வீடு", panels: [
        ["🚂","நாங்கள் ரயிலில் சென்றோம்.","We went by train."], ["👵","பாட்டி எங்களைக் கட்டிப்பிடித்தார்.","Grandmother hugged us."], ["🍚","பாட்டி சோறு சமைத்தார்.","Grandmother cooked rice."], ["😋","நாங்கள் மகிழ்ச்சியாகச் சாப்பிட்டோம்.","We ate happily."]],
      q: ["நாங்கள் எதில் சென்றோம்?","What did we go in?"],
      answer: ["🚂","ரயில்","train"], others: [["🚌","பேருந்து","bus"],["✈️","விமானம்","aeroplane"],["🚢","கப்பல்","ship"]] },
    { title: "தாகமான காகம்", panels: [
        ["🐦","காகத்துக்குத் தாகம் எடுத்தது.","The crow was thirsty."], ["🏺","பானையில் கொஞ்சம் தண்ணீர் இருந்தது.","There was a little water in the pot."], ["🪨","காகம் கற்களைப் பானையில் போட்டது.","The crow dropped stones into the pot."], ["💧","தண்ணீர் மேலே வந்தது.","The water came up."]],
      q: ["காகம் பானையில் எதைப் போட்டது?","What did the crow drop into the pot?"],
      answer: ["🪨","கற்கள்","stones"], others: [["🍃","இலைகள்","leaves"],["🌸","பூக்கள்","flowers"],["🥚","முட்டைகள்","eggs"]] },
    { title: "கடற்கரை", panels: [
        ["🏖️","நாங்கள் கடற்கரைக்குச் சென்றோம்.","We went to the beach."], ["🐚","நான் சிப்பி எடுத்தேன்.","I picked up a shell."], ["🦀","நண்டு வேகமாக ஓடியது.","A crab ran fast."], ["🌊","அலை கரைக்கு வந்தது.","A wave came to the shore."]],
      q: ["எது வேகமாக ஓடியது?","What ran fast?"],
      answer: ["🦀","நண்டு","crab"], others: [["🐘","யானை","elephant"],["🐢","ஆமை","turtle"],["🐄","மாடு","cow"]] },
    { title: "கவிதாவின் பிறந்தநாள்", panels: [
        ["🎈","இன்று கவிதாவுக்குப் பிறந்தநாள்.","Today is Kavitha’s birthday."], ["👫","நண்பர்கள் வீட்டுக்கு வந்தார்கள்.","Friends came to the house."], ["🎂","அவள் கேக் வெட்டினாள்.","She cut the cake."], ["🎁","அவள் பரிசு பெற்றாள்.","She got a present."]],
      q: ["கவிதா எதை வெட்டினாள்?","What did Kavitha cut?"],
      answer: ["🎂","கேக்","cake"], others: [["🍌","வாழைப்பழம்","banana"],["🥭","மாம்பழம்","mango"],["🍉","தர்பூசணி","watermelon"]] },
    { title: "எறும்பின் உழைப்பு", panels: [
        ["🐜","எறும்பு உணவு தேடியது.","The ant looked for food."], ["🍚","அது ஒரு சோற்றுப் பருக்கையைக் கண்டது.","It found a grain of rice."], ["🏠","அது உணவைப் புற்றுக்குக் கொண்டு சென்றது.","It carried the food to the anthill."], ["😊","எறும்புகள் மகிழ்ந்தன.","The ants were happy."]],
      q: ["எறும்பு எதைக் கண்டது?","What did the ant find?"],
      answer: ["🍚","சோறு","rice"], others: [["🥚","முட்டை","egg"],["🧅","வெங்காயம்","onion"],["🍅","தக்காளி","tomato"]] },
  ];
  const api = { STORIES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KlgQuestions = api;
})(typeof window !== 'undefined' ? window : globalThis);
