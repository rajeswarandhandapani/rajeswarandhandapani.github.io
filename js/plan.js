// The 12-week plan, as data. Screens and totals read from here, so changes are made once.
// Only the training plan lives here: no names, measurements or lab results.

export const WEEKS = 12;
export const CARDIO_GOAL = 150;
export const GYM_PER_WEEK = 3;
export const HEART_RATE = '91–127 bpm';

const GYM = { kind: 'gym', title: 'Full-body machine workout', time: '30–40 min' };
const CARDIO = { kind: 'cardio', title: 'Brisk walk or cycling', time: '20–25 min to start', minutes: 20 };

// Indexed by Date.getDay(): 0 is Sunday. Optional days never show as missed.
export const SCHEDULE = [
  { kind: 'rest', title: 'Rest or gentle walk', time: 'Optional', optional: true, minutes: 20 },
  GYM,
  CARDIO,
  GYM,
  CARDIO,
  GYM,
  { kind: 'cardio', title: 'Brisk walk, cycle or swim', time: '30 min, if convenient', minutes: 30, optional: true },
];

export const SCHEDULE_ORDER = [1, 2, 3, 4, 5, 6, 0];

// Alternates are extra suggestions for when a machine is taken. They aren't in the original plan.
// Each one keeps its own weight history, because 60 lb on a machine is not 60 lb with a dumbbell.
export const EXERCISES = [
  { id: 'leg-press', name: 'Leg press', focus: 'Legs and glutes', sets: 2, low: 10, high: 12, unit: 'reps', weighted: true, alternates: [
    { id: 'hack-squat', name: 'Hack squat machine', how: 'Start lighter than your leg press weight.' },
    { id: 'goblet-squat', name: 'Goblet squat', how: 'Hold one dumbbell at your chest and squat to a comfortable depth.' },
    { id: 'step-up', name: 'Dumbbell step-up', how: 'Step onto a low bench or box. Enter one dumbbell, and reps per leg.' },
  ] },
  { id: 'chest-press', name: 'Chest press machine', focus: 'Chest, shoulders, triceps', sets: 2, low: 10, high: 12, unit: 'reps', weighted: true, alternates: [
    { id: 'db-bench', name: 'Dumbbell bench press', how: 'Lie on a flat bench. Enter the weight of one dumbbell.' },
    { id: 'cable-press', name: 'Cable chest press', how: 'Stand in a split stance and press forward at chest height.' },
    { id: 'incline-pushup', name: 'Incline push-up', how: 'Hands on a bench or bar, with your body in a straight line.', weighted: false },
  ] },
  { id: 'lat-pulldown', name: 'Lat pulldown', focus: 'Back', sets: 2, low: 10, high: 12, unit: 'reps', weighted: true, alternates: [
    { id: 'single-arm-pulldown', name: 'Single-arm cable pulldown', how: 'Pull your elbow down to your side. Enter reps per arm.' },
    { id: 'straight-arm-pulldown', name: 'Straight-arm cable pulldown', how: 'Keep your arms nearly straight and bring the bar to your thighs.' },
    { id: 'band-pulldown', name: 'Band pulldown', how: 'Anchor a band overhead and pull your elbows to your sides.', weighted: false },
  ] },
  { id: 'seated-row', name: 'Seated row', focus: 'Back', sets: 2, low: 10, high: 12, unit: 'reps', weighted: true, alternates: [
    { id: 'chest-supported-row', name: 'Chest-supported row machine', how: 'Keep your chest on the pad and squeeze your shoulder blades.' },
    { id: 'cable-row', name: 'Seated cable row', how: 'Use the low pulley with a close-grip handle.' },
    { id: 'db-row', name: 'Single-arm dumbbell row', how: 'One hand and knee on a bench. Enter one dumbbell, and reps per arm.' },
  ] },
  { id: 'leg-curl', name: 'Seated leg curl', focus: 'Hamstrings', sets: 2, low: 12, high: 12, unit: 'reps', weighted: true, alternates: [
    { id: 'lying-curl', name: 'Lying leg curl machine', how: 'Curl slowly and keep your hips on the pad.' },
    { id: 'romanian-deadlift', name: 'Dumbbell Romanian deadlift', how: 'Soft knees, push your hips back and keep your back flat. Start light.' },
    { id: 'glute-bridge', name: 'Glute bridge', how: 'Lie on your back and lift your hips by driving through your heels.', weighted: false },
  ] },
  { id: 'plank', name: 'Plank', focus: 'Core', sets: 2, low: 20, high: 40, unit: 'sec', weighted: false },
];

/** Every movement that can be logged. Alternates take their sets and targets from their exercise. */
export const MOVES = EXERCISES.flatMap(ex => [
  ex,
  ...(ex.alternates || []).map(a => ({ ...ex, alternates: undefined, weighted: true, slot: ex.id, ...a })),
]);
export const moveById = id => MOVES.find(m => m.id === id);
export const alternatesOf = ex => MOVES.filter(m => m.slot === ex.id);

export const TOTAL_SETS = EXERCISES.reduce((n, e) => n + e.sets, 0);
export const target = ex => `${ex.sets} × ${ex.low === ex.high ? ex.low : `${ex.low}–${ex.high}`}${ex.unit === 'sec' ? ' sec' : ''}`;

// "gentle" is logged but left out of the 150 minutes, which are for moderate cardio.
export const CARDIO_TYPES = [
  ['walk', 'Brisk walk'],
  ['cycle', 'Cycling'],
  ['swim', 'Swim'],
  ['run', 'Run'],
  ['gentle', 'Gentle walk'],
];
export const cardioName = type => (CARDIO_TYPES.find(t => t[0] === type) || [type, type])[1];

export const PHASES = [
  { from: 1, to: 2, name: 'Learn technique and build consistency' },
  { from: 3, to: 6, name: 'Gradually extend cardio toward the weekly target' },
  { from: 7, to: 12, name: 'Maintain the routine and progress weights slowly' },
];
export const phaseOf = week => PHASES.find(p => week >= p.from && week <= p.to);

export const GYM_NOTES = [
  'Start with a 5-minute easy warm-up and finish with a brief cool-down.',
  'Lift with control and rest about 60–90 seconds between sets.',
  'Use light weights that allow good form and leave about 2–3 good reps in reserve.',
  'Increase weight gradually, and only when all reps feel controlled.',
  'Ask gym staff to show the correct machine setup.',
];

export const CARDIO_NOTES = [
  `Build gradually toward at least ${CARDIO_GOAL} minutes of moderate cardio per week. Add short walks when convenient.`,
  'Brisk walking is enough. Running is optional.',
  'Talk test: breathing faster, but still able to speak in full sentences.',
  `A rough moderate-intensity heart rate range is ${HEART_RATE}, though individual values vary.`,
  'If you take medicines that affect heart rate or have a heart condition, ask a clinician for individual guidance.',
];

export const FOOD_NOTES = [
  'Eat fish about twice a week, around 4 oz cooked per serving. Salmon, sardines, trout, Atlantic mackerel and golden pomfret all fit.',
  'Prefer baked, grilled, steamed or lightly pan-fried fish with a little olive or canola oil. Limit deep-frying and frequent butter or ghee-heavy meals.',
  'Increase soluble fiber from oats, beans, lentils, chickpeas, fruit and vegetables, and choose whole grains more often.',
  'Replace saturated fats with unsaturated fats such as nuts, seeds and olive or canola oil. Limit processed meats, pastries and frequent fried foods.',
  'Maintain a healthy weight rather than aiming for weight loss. Protein powder is optional, and food-first protein is fine.',
];

// A web app can't start an Apple Watch workout, so `watch` steps are reminders of what to pick.
// `seconds` adds a timer button to the step.
export const ROUTINES = {
  'gym-pre': { title: 'Warm-up', time: 'About 7 min', steps: [
    { id: 'gp-watch', text: 'Start Apple Watch workout', detail: 'Choose Traditional Strength Training', watch: true },
    { id: 'gp-cardio', text: 'Easy treadmill walk or bike', detail: '5 minutes at a gentle pace', seconds: 300 },
    { id: 'gp-legs', text: 'Leg swings', detail: '10 each leg, holding on for balance' },
    { id: 'gp-hips', text: 'Hip circles', detail: '10 each direction' },
    { id: 'gp-arms', text: 'Arm circles', detail: '10 forward, 10 back' },
    { id: 'gp-squat', text: 'Bodyweight squats', detail: '10 slow reps' },
  ] },
  'gym-post': { title: 'Cool-down and stretch', time: 'About 7 min', steps: [
    { id: 'gs-walk', text: 'Easy walk', detail: '2 minutes', seconds: 120 },
    { id: 'gs-quad', text: 'Standing quad stretch', detail: '30 sec each leg', seconds: 30 },
    { id: 'gs-ham', text: 'Seated hamstring stretch', detail: '30 sec each leg', seconds: 30 },
    { id: 'gs-chest', text: 'Doorway chest stretch', detail: '30 sec', seconds: 30 },
    { id: 'gs-lat', text: 'Overhead side reach', detail: '30 sec each side', seconds: 30 },
    { id: 'gs-glute', text: 'Figure-four glute stretch', detail: '30 sec each side', seconds: 30 },
    { id: 'gs-watch', text: 'End Apple Watch workout', detail: 'Press End on the Watch so it saves', watch: true },
  ] },
  'cardio-pre': { title: 'Warm-up', time: 'About 4 min', steps: [
    { id: 'cp-watch', text: 'Start Apple Watch workout', detail: 'Choose Outdoor Walk, Indoor Walk, Outdoor Cycle, Indoor Cycle or Pool Swim', watch: true },
    { id: 'cp-ankle', text: 'Ankle circles', detail: '10 each foot' },
    { id: 'cp-legs', text: 'Leg swings', detail: '10 each leg, holding on for balance' },
    { id: 'cp-easy', text: 'Start at an easy pace', detail: '3 minutes before picking up to brisk', seconds: 180 },
  ] },
  'cardio-post': { title: 'Cool-down and stretch', time: 'About 6 min', steps: [
    { id: 'cs-slow', text: 'Slow down', detail: '3 minutes at an easy pace', seconds: 180 },
    { id: 'cs-calf', text: 'Calf stretch', detail: '30 sec each leg', seconds: 30 },
    { id: 'cs-quad', text: 'Standing quad stretch', detail: '30 sec each leg', seconds: 30 },
    { id: 'cs-ham', text: 'Standing hamstring stretch', detail: '30 sec each leg', seconds: 30 },
    { id: 'cs-hip', text: 'Hip flexor stretch', detail: '30 sec each side', seconds: 30 },
    { id: 'cs-watch', text: 'End Apple Watch workout', detail: 'Its summary shows the average heart rate to log here', watch: true },
  ] },
};
export const STEP_IDS = Object.values(ROUTINES).flatMap(r => r.steps.map(s => s.id));

export const FOLLOW_UP ='Discuss lipid results and overall cardiovascular risk with a healthcare professional. Consider repeating the lipid panel after about 8–12 weeks if the clinician agrees.';
export const SAFETY = 'Stop exercising and seek urgent medical help for chest pain, fainting, or severe or unusual shortness of breath.';
export const CHECK_FIRST = 'With known heart disease, uncontrolled blood pressure, major exercise limitations, or advice to restrict exercise or protein, check with a clinician before starting. This is general wellness guidance, not individual medical care.';
