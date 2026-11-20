// The 12-week American English speaking & listening curriculum, swaps, drills, and frameworks.
// Lessons are split by phase into three files to keep authoring clean and fast to load.

import { PHASE1_LESSONS } from './lessons-p1.js';
import { PHASE2_LESSONS } from './lessons-p2.js';
import { PHASE3_LESSONS } from './lessons-p3.js';

export const WEEKS = 12;
export const SESSIONS_PER_WEEK = 6;
export const TOTAL_DAYS = WEEKS * 7; // 84 days (6 practice days + 1 weekly story review per week)
export const WEEKLY_GOAL_MIN = 150;
export const DAILY_GOAL_OPTIONS = [20, 25, 30];
export const CHALLENGE_TIMERS = [90, 120, 180];

export const PHASES = [
  {
    id: 1,
    weeks: [1, 4],
    name: 'Ear & Habit Reset',
    focus: 'Decode fast American reductions, drop top Tamil-to-US habits, and speak in BLUF chunks.',
  },
  {
    id: 2,
    weeks: [5, 8],
    name: 'Work Presence & Casual Flow',
    focus: 'Handle architecture trade-offs, diplomatic pushback (PREP), and natural social storytelling.',
  },
  {
    id: 3,
    weeks: [9, 12],
    name: 'Executive Clarity & Spontaneous Fluency',
    focus: 'Lead incident reviews, align stakeholders, and improvise smoothly in everyday American life.',
  },
];

export const CONFIDENCE_LEVELS = [
  { id: 'rough', label: 'Rough' },
  { id: 'steady', label: 'Getting there' },
  { id: 'smooth', label: 'Smooth' },
];

export const TAMIL_US_SWAPS = [
  {
    id: 'have-a-doubt',
    category: 'Work',
    habit: '"I have a doubt"',
    why: 'In American English, "doubt" signals skepticism or distrust rather than curiosity.',
    natural: ['"I have a quick question."', '"Can I clarify one thing?"', '"Just to make sure I follow..."'],
    example: 'Hey Mike, I have a quick question about the retry policy before we deploy.',
  },
  {
    id: 'do-one-thing',
    category: 'Casual',
    habit: '"Do one thing..."',
    why: 'Direct translation of "oru kaariyam pannu" — sounds abrupt or bossy in US conversation.',
    natural: ['"Here is what we can do..."', '"Why don\'t we..."', '"How about we try this?"'],
    example: 'Here is what we can do: you grab the kids\' bags and I\'ll load the car.',
  },
  {
    id: 'trailing-only',
    category: 'Casual',
    habit: '"...yesterday only" / "He only told me"',
    why: 'Ending a sentence with "only" feels unfinished to native US listeners.',
    natural: ['"I just saw it yesterday."', '"He\'s the one who told me."', '"We literally met this morning."'],
    example: 'I actually just pushed that PR yesterday, so QA might still be testing it.',
  },
  {
    id: 'stative-ing',
    category: 'Work',
    habit: '"I am having a meeting" / "I am knowing"',
    why: 'Tamil uses progressive aspect broadly; US English prefers simple present for states and possession.',
    natural: ['"I have a meeting at two."', '"I know how that module works."', '"I understand the concern."'],
    example: 'I have a design review at 3 PM, so let\'s connect right after.',
  },
  {
    id: 'revert-back',
    category: 'Work',
    habit: '"Please revert back to me"',
    why: '"Revert" means return to an old state (like git revert), and "back" is redundant.',
    natural: ['"Let me know when you get a chance."', '"Get back to me by Friday."', '"Ping me once you decide."'],
    example: 'Take a look at the spec and get back to me by tomorrow afternoon.',
  },
  {
    id: 'prepone',
    category: 'Work',
    habit: '"Can we prepone the call?"',
    why: '"Prepone" is almost never understood in US offices outside Indian teams.',
    natural: ['"Can we move the call up?"', '"Can we pull the release forward?"', '"Does an earlier slot work?"'],
    example: 'Could we move our 1-on-1 up to 10 AM since I have an appointment later?',
  },
  {
    id: 'kindly',
    category: 'Work',
    habit: '"Kindly approve this PR"',
    why: '"Kindly" sounds stiff, dated, or passive-aggressive in modern American Slack/speech.',
    natural: ['"Could you take a look at this PR?"', '"When you have a sec, please approve."', '"Would you mind signing off?"'],
    example: 'Hey Sarah, when you have a sec, could you take a look at this hotfix PR?',
  },
  {
    id: 'do-the-needful',
    category: 'Work',
    habit: '"Please do the needful"',
    why: 'Vague colonial-era phrase; US colleagues expect a specific, direct request.',
    natural: ['"Could you restart the staging pod?"', '"Can you handle the deployment step?"', '"Mind taking it from here?"'],
    example: 'The permissions are updated—could you re-run the pipeline when you get a minute?',
  },
  {
    id: 'myself-intro',
    category: 'Work',
    habit: '"Myself Raj, working as..."',
    why: 'Reflexive "myself" cannot open a self-introduction in standard US English.',
    natural: ['"Hi, I\'m Raj—I lead the backend payments team."', '"My name is Raj, and I work on..."'],
    example: 'Hi everyone, I\'m Raj—I\'m a senior engineer on the core API team.',
  },
  {
    id: 'passed-out',
    category: 'Casual',
    habit: '"I passed out in 2015"',
    why: 'In the US, "passed out" means fainted or fell asleep drunk!',
    natural: ['"I graduated in 2015."', '"I finished college in 2015."'],
    example: 'I graduated from college back in 2015 and moved to the States a few years later.',
  },
  {
    id: 'discuss-about',
    category: 'Work',
    habit: '"Let\'s discuss about the API"',
    why: '"Discuss" is transitive in English—no "about" needed after it.',
    natural: ['"Let\'s discuss the API."', '"Let\'s talk about the API."', '"Let\'s go over the API design."'],
    example: 'Let\'s go over the caching strategy during today\'s architecture sync.',
  },
  {
    id: 'explain-me',
    category: 'Work',
    habit: '"Can you explain me the flow?"',
    why: '"Explain" requires "to me" (never "explain me"), or use "walk me through".',
    natural: ['"Can you walk me through the flow?"', '"Could you explain the flow to me?"'],
    example: 'I\'m new to this service—could you walk me through the Kafka consumer flow?',
  },
  {
    id: 'cope-up',
    category: 'Work',
    habit: '"Hard to cope up with the load"',
    why: 'The US verb phrase is "cope with" or "keep up with", never "cope up with".',
    natural: ['"Hard to keep up with the traffic."', '"Our cluster can\'t handle the spike."'],
    example: 'The database couldn\'t keep up with Monday morning traffic without a read replica.',
  },
  {
    id: 'order-for',
    category: 'Casual',
    habit: '"Let\'s order for pizza"',
    why: 'At restaurants or online, "order" takes the item directly with no "for".',
    natural: ['"Let\'s order a pizza."', '"I\'m gonna grab Thai food."', '"Should we get takeout?"'],
    example: 'Nobody feels like cooking tonight—let\'s just order a pizza and watch a movie.',
  },
  {
    id: 'return-back',
    category: 'Casual',
    habit: '"I\'ll return back by 6"',
    why: '"Return" already includes "back"; Americans overwhelmingly say "be back" or "get back".',
    natural: ['"I\'ll be back by 6."', '"I\'ll head back around 6."', '"Let me return this to the store."'],
    example: 'I\'m running to Costco, and I should be back by 6 PM.',
  },
  {
    id: 'today-morning',
    category: 'Casual',
    habit: '"Today morning" / "Yesterday night"',
    why: 'Americans anchor the current or previous day with "this" or "last", not "today/yesterday".',
    natural: ['"This morning"', '"Last night"', '"Earlier today"'],
    example: 'The build passed this morning, though it flaked twice last night.',
  },
  {
    id: 'missing-articles',
    category: 'Work',
    habit: '"I pushed fix to repo"',
    why: 'Tamil has no a/an/the, so singular nouns often miss articles in fast speech.',
    natural: ['"I pushed a fix to the repo."', '"Send me the link."', '"We hit an edge case."'],
    example: 'I opened a PR for the timeout bug—can you drop a quick review?',
  },
  {
    id: 'universal-tag',
    category: 'Casual',
    habit: '"It\'s cold today, no?" / "Is it?"',
    why: 'Invariant "no?" and "is it?" sound distinctly non-US; Americans use quick agreement tags.',
    natural: ['"Pretty chilly today, right?"', '"Oh really?"', '"Wait, seriously?"'],
    example: 'The traffic on Route 9 was brutal this morning, wasn\'t it?',
  },
  {
    id: 'overusing-actually',
    category: 'Work',
    habit: 'Starting every reply with "Actually..." or "Basically..."',
    why: 'Opening with "Actually" can sound like you are correcting or dismissing the other person.',
    natural: ['"Yeah, and on top of that..."', '"So the main idea is..."', '"To add to what you said..."'],
    example: 'Good point—and to add to that, caching the token cuts latency in half.',
  },
  {
    id: 'directness-softeners',
    category: 'Work',
    habit: '"Your design is wrong. Change this."',
    why: 'Blunt phrasing can sound confrontational in US team culture, even when technically right.',
    natural: ['"One concern I have is..."', '"What if we tried...?"', '"Correct me if I\'m wrong, but..."'],
    example: 'One concern I have with polling every second is that it might spike DB connections.',
  },
  {
    id: 'out-of-station',
    category: 'Casual',
    habit: '"I am out of station this week"',
    why: 'Indian railway-era idiom; Americans simply say "out of town".',
    natural: ['"I\'m out of town until Thursday."', '"I\'ll be away for the weekend."'],
    example: 'Just a heads-up, I\'m out of town this Friday for a family wedding.',
  },
  {
    id: 'shift-house',
    category: 'Casual',
    habit: '"We are shifting to a new house"',
    why: 'Americans "move" to a new apartment or house rather than "shifting".',
    natural: ['"We\'re moving next month."', '"We\'re relocating closer to school."'],
    example: 'We\'re finally moving into our new place next Saturday—wish us luck packing!',
  },
  {
    id: 'give-an-exam',
    category: 'Casual',
    habit: '"My son is giving a test today"',
    why: 'Students "take" exams/tests in English; teachers "give" them.',
    natural: ['"My son is taking a math test today."', '"I have to take my AWS cert Friday."'],
    example: 'My daughter is taking her violin audition after school today.',
  },
  {
    id: 'cousin-brother',
    category: 'Casual',
    habit: '"My cousin brother is visiting"',
    why: 'English doesn\'t add brother/sister after cousin—just "cousin" (or name).',
    natural: ['"My cousin is visiting from Austin."', '"My cousin Priya and her husband..."'],
    example: 'My cousin from Seattle is staying with us over Thanksgiving weekend.',
  },
  {
    id: 'good-name',
    category: 'Casual',
    habit: '"What is your good name?"',
    why: 'Literal translation of respectful Indian greeting; feels odd in US casual life.',
    natural: ['"Sorry, I didn\'t catch your name."', '"By the way, I\'m Raj—what\'s your name?"'],
    example: 'Hey, I\'m Raj from down the street—sorry, I didn\'t catch your name!',
  },
];

export const CLARITY_DRILLS = [
  {
    id: 'stress-timing',
    title: 'Slow Down 15% & Punch Content Words',
    why: 'Tamil gives every syllable equal weight. American English stretches key words and shrinks helper words (to, for, a, the).',
    cue: 'Pause briefly at commas, compress "to/of/for", and stretch the main verb and noun.',
    pairs: [
      'We NEED to SHIP the FIX by FRI-day.',
      'WHAT do you WANT to DO for DIN-ner?',
      'Let me CHECK the LOGS and GET BACK to you.',
      'That MAKES a LOT of SENSE right NOW.',
    ],
  },
  {
    id: 'v-vs-w',
    title: 'Separate /v/ (Teeth on Lip) vs. /w/ (Round Lips)',
    why: 'Tamil blends V and W into one middle sound. Separating them immediately boosts clarity on words like "version" vs "working".',
    cue: 'For /v/, touch top teeth lightly to bottom lip. For /w/, purse lips into a tight circle with NO teeth.',
    pairs: [
      'very — wary',
      'vest — west',
      'vine — wine',
      'verify — workflow',
    ],
  },
  {
    id: 'th-sounds',
    title: 'Soften "TH" (/θ/ and /ð/) Instead of Hard T/D',
    why: 'Turning "think" into "tink" or "this" into "dis" is the most noticeable rhythm cue to American ears.',
    cue: 'Slide the tip of your tongue gently between or under your top teeth and blow steady air—do not stop the air like T or D.',
    pairs: [
      'think — tink',
      'three — tree',
      'this — dis',
      'though — dough',
    ],
  },
  {
    id: 'ptk-aspiration',
    title: 'Puff of Air on Initial P, T, K',
    why: 'Unaspirated Tamil p/t/k at the start of words can sound like b/d/g ("code" sounding close to "goad", "team" to "deem").',
    cue: 'Hold your hand near your mouth and feel a warm puff of air when starting words with P, T, or K.',
    pairs: [
      'pack — back',
      'team — deem',
      'code — goad',
      'push — bush',
    ],
  },
];

export const FRAMEWORKS = [
  {
    id: 'bluf',
    name: 'BLUF — Bottom Line Up Front',
    when: 'Standups, Slack updates, exec readouts, status checks',
    why: 'Engineers tend to tell the chronological story first and save the answer for the end. US leaders expect the headline in sentence one.',
    steps: [
      '1. Bottom Line: State the decision, status, or ask in 1 crisp sentence.',
      '2. Context: Give 1–2 short reasons or root cause.',
      '3. Next Step: Say who is doing what and by when.',
    ],
    example: 'We need to hold the release until 4 PM. Staging caught a cache timeout in auth, and I\'m pairing with DevOps now to patch it.',
  },
  {
    id: 'prep',
    name: 'PREP — Point, Reason, Example, Point',
    when: 'Design reviews, pushing back on scope, impromptu meeting questions',
    why: 'Acts as guardrails so you never ramble or lose your train of thought under pressure.',
    steps: [
      'P — Point: State your recommendation clearly.',
      'R — Reason: Explain the risk, cost, or user impact.',
      'E — Example: Back it up with a metric or past incident.',
      'P — Point: Restate your takeaway cleanly.',
    ],
    example: 'I recommend keeping Redis for session state. Rebuilding it in Postgres adds latency under burst load—last month a DB spike slowed login by 400ms. So keeping Redis is our safest path.',
  },
  {
    id: 'softeners',
    name: 'US Workplace Softeners',
    when: 'Code reviews, disagreeing with a lead, asking busy teammates',
    why: 'Direct imperatives sound sharp in American offices; softeners keep collaboration warm without sounding weak.',
    steps: [
      'Challenge an idea: "One concern I have is..." / "How are we thinking about...?"',
      'Spot a bug in PR: "Quick sanity check here—could this NPE if the list is empty?"',
      'Correct gently: "Correct me if I\'m wrong, but I thought..."',
    ],
    example: 'Quick sanity check on line 84—if the retry queue is empty, will this loop exit cleanly?',
  },
  {
    id: 'ford',
    name: 'FORD — Everyday Small-Talk Loop',
    when: 'Before Zoom starts, neighbors, school pickups, coffee shops',
    why: 'Non-work chat runs on brief 1–2 sentence answers plus tossing a friendly question back.',
    steps: [
      'F — Family & pets ("How are the kids liking soccer?")',
      'O — Occupation / how the week is going ("Busy sprint, ready for Friday!")',
      'R — Recreation: weekend, weather, food, shows ("Watched anything good lately?")',
      'D — Dreams & plans ("Got any travel coming up for the holidays?")',
    ],
    example: 'Pretty low-key weekend—we mostly caught up on errands and tried that new dosa spot. How about you, did you get up to anything fun?',
  },
];

export const ALL_LESSONS = [...PHASE1_LESSONS, ...PHASE2_LESSONS, ...PHASE3_LESSONS];

export const swapById = id => TAMIL_US_SWAPS.find(s => s.id === id) || TAMIL_US_SWAPS[0];
export const drillById = id => CLARITY_DRILLS.find(d => d.id === id) || CLARITY_DRILLS[0];

export function youglishUrl(phrase) {
  return `https://youglish.com/pronounce/${encodeURIComponent(phrase)}/english/us`;
}

export function phaseOf(week) {
  const w = Math.max(1, Math.min(WEEKS, week));
  return PHASES.find(p => w >= p.weeks[0] && w <= p.weeks[1]) || PHASES[PHASES.length - 1];
}

/**
 * Maps a 1..84 plan day to either a Practice Day (Days 1..6 of each week)
 * or a Weekly Story Review Day (Day 7, 14, ..., 84).
 */
export function lessonForDay(dayNumber) {
  const clamped = ((Math.max(1, dayNumber) - 1) % TOTAL_DAYS) + 1;
  const week = Math.floor((clamped - 1) / 7) + 1;
  const dayInWeek = ((clamped - 1) % 7) + 1;
  if (dayInWeek === 7) {
    const startIdx = (week - 1) * SESSIONS_PER_WEEK;
    const lessons = ALL_LESSONS.slice(startIdx, startIdx + SESSIONS_PER_WEEK);
    return {
      kind: 'review',
      dayNumber: clamped,
      week,
      dayInWeek,
      phase: phaseOf(week),
      lessons,
      prompts: [
        `Walk through a real win or blocker from work this week using "${lessons[0].pro.phrase}" and "${lessons[2].pro.phrase}".`,
        `Tell a 60-second story about your weekend or family using "${lessons[1].casual.phrase}" and "${lessons[4].casual.phrase}".`,
        `Give a crisp 60-second BLUF pushback on a rushed deadline using "${lessons[3].pro.phrase}" and "${lessons[5].casual.phrase}".`,
      ],
    };
  }
  const index = (week - 1) * SESSIONS_PER_WEEK + (dayInWeek - 1);
  return {
    kind: 'practice',
    dayNumber: clamped,
    week,
    dayInWeek,
    phase: phaseOf(week),
    lesson: ALL_LESSONS[index],
  };
}
