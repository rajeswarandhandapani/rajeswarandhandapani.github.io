/* Story Order. Steps are in the right order. At least four steps each, since level 1 uses the first three. */
(function (root) {
  'use strict';
  const STORIES = [
    { name: "A seed grows", steps: [["🌱", "Plant the seed"], ["💧", "Water it"], ["🌿", "It grows"], ["🌼", "It makes a bud"], ["🌻", "A flower!"]] },
    { name: "Getting ready", steps: [["⏰", "Wake up"], ["🪥", "Brush your teeth"], ["👕", "Get dressed"], ["🥣", "Eat breakfast"], ["🚌", "Go to school"]] },
    { name: "A butterfly", steps: [["🥚", "An egg"], ["🐛", "A caterpillar"], ["🍃", "It eats leaves"], ["🦋", "A butterfly"]] },
    { name: "A chick", steps: [["🥚", "An egg"], ["🐣", "A chick hatches"], ["🐥", "The chick grows"], ["🐔", "A hen"]] },
    { name: "A rainy day", steps: [["☁️", "Clouds gather"], ["🌧️", "It rains"], ["☔", "We use an umbrella"], ["🌈", "A rainbow shows"]] },
    { name: "Ice cream", steps: [["🍦", "A new ice cream"], ["☀️", "The sun shines"], ["💧", "It starts to melt"], ["🫠", "It is all melted"]] },
    { name: "A birthday", steps: [["🎈", "The party starts"], ["🎶", "We sing"], ["🎂", "Blow out the candles"], ["🎁", "Open the presents"]] },
    { name: "A day", steps: [["🌅", "Sunrise"], ["☀️", "Midday"], ["🌇", "Sunset"], ["🌙", "Night"]] },
    { name: "Baking cookies", steps: [["🥣", "Mix the dough"], ["🍪", "Shape the cookies"], ["🔥", "Bake them"], ["😋", "Eat them!"]] },
    { name: "Washing hands", steps: [["🚰", "Wet your hands"], ["🧼", "Add soap"], ["👐", "Scrub well"], ["🧻", "Rinse and dry"]] },
    { name: "A snowman", steps: [["❄️", "Snow falls"], ["⛄", "Roll big snowballs"], ["🥕", "Add a carrot nose"], ["🧣", "Add a scarf"]] },
    { name: "A trip to the park", steps: [["🎒", "Pack a bag"], ["🚶", "Walk to the park"], ["🛝", "Play on the slide"], ["🏠", "Go home"]] },
    { name: "Planting a tree", steps: [["🕳️","Dig a hole"],["🌰","Drop in the seed"],["🪏","Cover it with soil"],["💧","Water it"],["🌳","A tree grows"]] },
    { name: "Making a sandwich", steps: [["🍞","Take the bread"],["🧈","Spread the butter"],["🧀","Add the cheese"],["🥪","Close the sandwich"],["😋","Eat it up"]] },
    { name: "Going to bed", steps: [["🛁","Have a bath"],["🪥","Brush your teeth"],["📖","Read a story"],["😴","Fall asleep"]] },
    { name: "A letter", steps: [["✏️","Write the letter"],["✉️","Put it in an envelope"],["📮","Post it"],["📬","It reaches the mailbox"],["😊","Your friend reads it"]] },
    { name: "A frog", steps: [["🫧","Frog eggs float"],["🐟","A tadpole swims"],["🦵","It grows legs"],["🐸","A frog hops out"]] },
    { name: "Doing the washing", steps: [["🧺","Collect the dirty clothes"],["🫧","Wash them"],["☀️","Hang them in the sun"],["👕","Wear them again"]] },
    { name: "Crossing the road", steps: [["🛑","Stop at the curb"],["👀","Look both ways"],["🚶","Walk across"],["✅","You are safe on the other side"]] },
    { name: "Building a sandcastle", steps: [["🪣","Fill a bucket with sand"],["🔄","Turn it upside down"],["🏰","Lift it off"],["🌊","A wave washes it away"]] },
    { name: "Growing up", steps: [["👶","A baby is born"],["🧒","The child goes to school"],["🧑","The child becomes an adult"],["🧓","The adult grows old"]] },
    { name: "A campfire", steps: [["🪵","Gather the wood"],["🔥","Light the fire"],["🍡","Toast a snack"],["💧","Put out the fire"]] },
    { name: "A trip by plane", steps: [["🧳","Pack your bag"],["🛫","The plane takes off"],["☁️","Fly above the clouds"],["🛬","The plane lands"],["🤗","Hug your family"]] },
    { name: "Making a mango drink", steps: [["🥭","Pick a ripe mango"],["🔪","A grown-up cuts it"],["🥤","Blend it with milk"],["😋","Drink it cold"]] },
  ];
  const api = { STORIES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KlgQuestions = api;
})(typeof window !== 'undefined' ? window : globalThis);
