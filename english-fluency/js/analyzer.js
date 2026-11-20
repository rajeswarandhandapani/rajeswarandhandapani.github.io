// Offline transcript analyzer: word/WPM pacing, 17+ Tamil-to-US habit checks,
// target phrase usage detection (with inflections & separable phrasal verbs),
// and AI coach prompt generation. No DOM or network access.

const HABIT_RULES = [
  {
    id: 'have-a-doubt',
    label: '"Have a doubt" phrasing',
    re: /\b(?:have|had|having|got)\s+(?:a\s+|any\s+|some\s+|one\s+)?doubts?\b/gi,
    suggestion: 'Say "I have a quick question" or "Can I clarify one thing?" instead of "doubt".',
  },
  {
    id: 'do-one-thing',
    label: '"Do one thing" command',
    re: /\bdo\s+one\s+thing\b/gi,
    suggestion: 'Say "Here is what we can do..." or "Why don\'t we..." instead of "do one thing".',
  },
  {
    id: 'trailing-only',
    label: 'Emphasis "only" transfer',
    re: /\b(?:yesterday|today|tomorrow|now|then|here|there|this morning|last night|this week|last week)\s+only\b|\b(?:that|this|it|one|same|mine|yours|they|we)\s+only(?=\s*[.,!?]|$)/gi,
    suggestion: 'Move emphasis earlier: "I just saw it yesterday" or "He\'s the one who...".',
  },
  {
    id: 'revert-back',
    label: '"Revert back" redundancy',
    re: /\brevert(?:ed|ing|s)?\s+back\b/gi,
    suggestion: 'Use "get back to you" or "reply" instead of "revert back".',
  },
  {
    id: 'return-back',
    label: '"Return back" redundancy',
    re: /\breturn(?:ed|ing|s)?\s+back\b/gi,
    suggestion: 'Use "be back" or "head back" ("return" already includes back).',
  },
  {
    id: 'prepone',
    label: 'Non-US word "prepone"',
    re: /\bprepon(?:e|ed|es|ing)\b/gi,
    suggestion: 'Say "move up" or "pull forward" ("prepone" is rarely understood in the US).',
  },
  {
    id: 'stative-ing',
    label: 'Stative verb with "-ing"',
    re: /\b(?:am|is|are|was|were|'m|'re|'s)\s+(?:having\s+(?:a\s+doubt|a\s+meeting|a\s+call|a\s+question|a\s+plan|an?\s+idea|time|work|experience)|knowing|understanding|wanting|needing|believing|owning)\b/gi,
    suggestion: 'Use simple tense for states/meetings: "I have a meeting", "I know", "I had a question".',
  },
  {
    id: 'myself-intro',
    label: '"Myself [Name]" intro',
    re: /(?:^|[.!?]\s+)[Mm]yself\s+[A-Za-z]+|\b[Mm]yself\s+[A-Z][a-z]+\b/g,
    suggestion: 'Start with "I\'m [Name]" or "My name is [Name]" instead of "Myself...".',
  },
  {
    id: 'do-the-needful',
    label: '"Do the needful"',
    re: /\bdo\s+the\s+needful\b/gi,
    suggestion: 'State the exact ask: "Could you approve this PR?" or "Mind restarting the pod?"',
  },
  {
    id: 'kindly',
    label: 'Stiff "kindly"',
    re: /\bkindly\b/gi,
    suggestion: 'Use "Could you please..." or "When you have a sec..." instead of "kindly".',
  },
  {
    id: 'discuss-about',
    label: '"Discuss about"',
    re: /\bdiscuss(?:ed|ing|es)?\s+about\b/gi,
    suggestion: 'Drop "about" after discuss ("let\'s discuss the API") or say "talk about".',
  },
  {
    id: 'explain-me',
    label: '"Explain me" phrasing',
    re: /\bexplain(?:ed|ing|s)?\s+(?:me|us|him|her|them)\b/gi,
    suggestion: 'Say "walk me through it" or "explain it to me".',
  },
  {
    id: 'cope-up',
    label: '"Cope up with"',
    re: /\bcop(?:e|ed|ing|es)\s+up\s+with\b/gi,
    suggestion: 'Say "keep up with" or "cope with" (no "up" after cope).',
  },
  {
    id: 'order-for',
    label: '"Order for [food]"',
    re: /\border(?:ed|ing|s)?\s+for\s+(?:food|lunch|dinner|breakfast|pizza|coffee|tea|biryani|takeout|drinks?)\b/gi,
    suggestion: 'Drop "for": "Let\'s order pizza" or "I ordered coffee".',
  },
  {
    id: 'passed-out',
    label: '"Passed out" for graduating',
    re: /\bpassed\s+out\s+(?:in|from|at)\s+(?:19\d\d|20\d\d|college|school|university)\b/gi,
    suggestion: 'Say "graduated in..." ("passed out" means fainted in US English).',
  },
  {
    id: 'today-morning',
    label: '"Today/Yesterday morning"',
    re: /\b(?:today|yesterday|tomorrow)\s+(?:morning|afternoon|evening|night)\b/gi,
    suggestion: 'Use "this morning", "last night", or "tomorrow night".',
  },
];

const IRREGULAR_STEMS = {
  run: ['run', 'runs', 'ran', 'running'],
  get: ['get', 'gets', 'got', 'gotten', 'getting'],
  take: ['take', 'takes', 'took', 'taken', 'taking'],
  come: ['come', 'comes', 'came', 'coming'],
  put: ['put', 'puts', 'putting'],
  bring: ['bring', 'brings', 'brought', 'bringing'],
  break: ['break', 'breaks', 'broke', 'broken', 'breaking'],
  fall: ['fall', 'falls', 'fell', 'fallen', 'falling'],
  hold: ['hold', 'holds', 'held', 'holding'],
  hang: ['hang', 'hangs', 'hung', 'hanging'],
  keep: ['keep', 'keeps', 'kept', 'keeping'],
  make: ['make', 'makes', 'made', 'making'],
  find: ['find', 'finds', 'found', 'finding'],
  give: ['give', 'gives', 'gave', 'given', 'giving'],
  go: ['go', 'goes', 'went', 'gone', 'going'],
  hit: ['hit', 'hits', 'hitting'],
  set: ['set', 'sets', 'setting'],
  spin: ['spin', 'spins', 'spun', 'spinning'],
  stick: ['stick', 'sticks', 'stuck', 'sticking'],
  wind: ['wind', 'winds', 'wound', 'winding'],
  write: ['write', 'writes', 'wrote', 'written', 'writing'],
  speak: ['speak', 'speaks', 'spoke', 'spoken', 'speaking'],
  show: ['show', 'shows', 'showed', 'shown', 'showing'],
  pay: ['pay', 'pays', 'paid', 'paying'],
  catch: ['catch', 'catches', 'caught', 'catching'],
  cut: ['cut', 'cuts', 'cutting'],
  let: ['let', 'lets', 'letting'],
  buy: ['buy', 'buys', 'bought', 'buying'],
  eat: ['eat', 'eats', 'ate', 'eaten', 'eating'],
  do: ['do', 'does', 'did', 'done', 'doing'],
  have: ['have', 'has', 'had', 'having'],
  move: ['move', 'moves', 'moved', 'moving'],
  figure: ['figure', 'figures', 'figured', 'figuring'],
  circle: ['circle', 'circles', 'circled', 'circling'],
  push: ['push', 'pushes', 'pushed', 'pushing'],
  sort: ['sort', 'sorts', 'sorted', 'sorting'],
  flag: ['flag', 'flags', 'flagged', 'flagging'],
  follow: ['follow', 'follows', 'followed', 'following'],
  end: ['end', 'ends', 'ended', 'ending'],
  turn: ['turn', 'turns', 'turned', 'turning'],
  double: ['double', 'doubles', 'doubled', 'doubling'],
  walk: ['walk', 'walks', 'walked', 'walking'],
  wrap: ['wrap', 'wraps', 'wrapped', 'wrapping'],
  align: ['align', 'aligns', 'aligned', 'aligning'],
  call: ['call', 'calls', 'called', 'calling'],
  look: ['look', 'looks', 'looked', 'looking'],
  mess: ['mess', 'messes', 'messed', 'messing'],
  back: ['back', 'backs', 'backed', 'backing'],
  settle: ['settle', 'settles', 'settled', 'settling'],
  ramp: ['ramp', 'ramps', 'ramped', 'ramping'],
  pick: ['pick', 'picks', 'picked', 'picking'],
  iron: ['iron', 'irons', 'ironed', 'ironing'],
  check: ['check', 'checks', 'checked', 'checking'],
  loop: ['loop', 'loops', 'looped', 'looping'],
  head: ['head', 'heads', 'headed', 'heading'],
  table: ['table', 'tables', 'tabled', 'tabling'],
  play: ['play', 'plays', 'played', 'playing'],
  sign: ['sign', 'signs', 'signed', 'signing'],
  drop: ['drop', 'drops', 'dropped', 'dropping'],
  streamline: ['streamline', 'streamlines', 'streamlined', 'streamlining'],
  mitigate: ['mitigate', 'mitigates', 'mitigated', 'mitigating'],
  pinpoint: ['pinpoint', 'pinpoints', 'pinpointed', 'pinpointing'],
  narrow: ['narrow', 'narrows', 'narrowed', 'narrowing'],
  lean: ['lean', 'leans', 'leaned', 'leaning'],
  rule: ['rule', 'rules', 'ruled', 'ruling'],
  pass: ['pass', 'passes', 'passed', 'passing'],
  grab: ['grab', 'grabs', 'grabbed', 'grabbing'],
  tag: ['tag', 'tags', 'tagged', 'tagging'],
  pull: ['pull', 'pulls', 'pulled', 'pulling'],
  miss: ['miss', 'misses', 'missed', 'missing'],
  drill: ['drill', 'drills', 'drilled', 'drilling'],
  brush: ['brush', 'brushes', 'brushed', 'brushing'],
  roll: ['roll', 'rolls', 'rolled', 'rolling'],
  burn: ['burn', 'burns', 'burned', 'burnt', 'burning'],
  benchmark: ['benchmark', 'benchmarks', 'benchmarked', 'benchmarking'],
  chip: ['chip', 'chips', 'chipped', 'chipping'],
  escalate: ['escalate', 'escalates', 'escalated', 'escalating'],
  leverage: ['leverage', 'leverages', 'leveraged', 'leveraging'],
  ease: ['ease', 'eases', 'eased', 'easing'],
  jump: ['jump', 'jumps', 'jumped', 'jumping'],
  reach: ['reach', 'reaches', 'reached', 'reaching'],
  zero: ['zero', 'zeros', 'zeroed', 'zeroing'],
  bridge: ['bridge', 'bridges', 'bridged', 'bridging'],
  raise: ['raise', 'raises', 'raised', 'raising'],
  connect: ['connect', 'connects', 'connected', 'connecting'],
  step: ['step', 'steps', 'stepped', 'stepping'],
  close: ['close', 'closes', 'closed', 'closing'],
};

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function tokenPattern(word) {
  const clean = word.toLowerCase();
  if (IRREGULAR_STEMS[clean]) return `(?:${IRREGULAR_STEMS[clean].map(esc).join('|')})`;
  if (clean.length >= 4 && /^[a-z]+$/.test(clean)) return `${esc(clean)}(?:s|es|ed|d|ing)?`;
  return esc(clean);
}

/** Matches a target idiom or separable phrasal verb even with inflections or inserted objects. */
export function matchesTargetPhrase(text, phrase) {
  if (!text || !phrase) return false;
  const normalized = String(text).toLowerCase().replace(/[’‘]/g, "'");
  const cleanPhrase = String(phrase).toLowerCase().replace(/-/g, '[\\s-]+');
  const words = String(phrase).toLowerCase().replace(/-/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return false;

  // Direct/inflected hyphen or adjacent match
  if (words.length === 1) {
    return new RegExp(`\\b${tokenPattern(words[0])}\\b`, 'i').test(normalized);
  }
  if (words.length === 2) {
    // Allow 0..3 intervening words for separable phrasal verbs like "figure it out", "sorted the bug out".
    const gap = `(?:[\\s-]+(?:\\S+\\s+){0,3}?)`;
    const re = new RegExp(`\\b${tokenPattern(words[0])}${gap}${tokenPattern(words[1])}\\b`, 'i');
    return re.test(normalized) || new RegExp(`\\b${cleanPhrase}\\b`, 'i').test(normalized);
  }
  const parts = words.map((w, i) => (i === 0 ? tokenPattern(w) : esc(w)));
  const flexRe = new RegExp(`\\b${parts.join('[\\s-]+(?:\\S+\\s+){0,2}?')}\\b`, 'i');
  return flexRe.test(normalized);
}

export function analyzeTranscript(text, { durationSec = 0, targets = [] } = {}) {
  const raw = String(text || '').trim();
  const wordList = raw ? raw.split(/\s+/).filter(Boolean) : [];
  const words = wordList.length;
  const sentences = raw ? raw.split(/[.!?]+/).filter(s => s.trim().length > 0).length : 0;
  const wpm = words > 0 && durationSec >= 10 ? Math.round((words / durationSec) * 60) : null;

  let paceNote = 'Use the speaking timer or recorder to measure words per minute.';
  if (wpm != null) {
    if (wpm < 105) paceNote = `${wpm} WPM — Clear and deliberate. Link short helper words smoothly when ready.`;
    else if (wpm <= 155) paceNote = `${wpm} WPM — Crisp American professional sweet spot.`;
    else if (wpm <= 175) paceNote = `${wpm} WPM — Brisk pace. Add half-second pauses at commas so key verbs land.`;
    else paceNote = `${wpm} WPM — Fast pace. Slow down ~15% and pause cleanly between thoughts.`;
  } else if (durationSec > 0 && durationSec < 10) {
    paceNote = 'Speak at least 10 seconds to calculate your pace.';
  }

  const flags = [];
  for (const rule of HABIT_RULES) {
    rule.re.lastIndex = 0;
    const match = rule.re.exec(raw);
    if (match) {
      flags.push({
        id: rule.id,
        label: rule.label,
        match: match[0],
        suggestion: rule.suggestion,
      });
    }
  }

  // Repeated "actually" or "basically"
  const crutched = raw.match(/\b(?:actually|basically)\b/gi) || [];
  if (crutched.length >= (words < 60 ? 2 : 3)) {
    flags.push({
      id: 'repeat-actually-basically',
      label: `Repeated "${crutched[0]}" (${crutched.length}×)`,
      match: crutched[0],
      suggestion: 'Swap repeated "actually/basically" for "so the main thing is..." or "to add to that...".',
    });
  }

  // Filler density check
  if (words >= 20) {
    const fillerMatches = raw.match(/\b(?:um+|uh+|you know|kind of|sort of)\b/gi) || [];
    const likeMatches = raw.match(/(?:^|,\s*|\s+)like(?=,|\s+(?:the|a|i|we|they|it|he|she|uh|um))/gi) || [];
    const totalFillers = fillerMatches.length + likeMatches.length;
    if (totalFillers / words > 0.06) {
      flags.push({
        id: 'filler-density',
        label: `High filler density (${totalFillers} fillers in ${words} words)`,
        match: fillerMatches[0] || 'like',
        suggestion: 'Pause silently for half a beat while thinking instead of filling silence.',
      });
    }
  }

  const targetHits = targets.map(phrase => ({
    phrase,
    used: matchesTargetPhrase(raw, phrase),
  }));

  return { words, sentences, wpm, paceNote, flags, targetHits };
}

export function buildAiCoachPrompt({ dayNumber, topic, proPhrase, casualPhrase, challengeTitle, transcript, flags = [] }) {
  const flagNote = flags.length
    ? `\nOffline habit checker spotted: ${flags.map(f => f.label).join(', ')}.`
    : '';
  return [
    `I am a South Indian (Tamil-medium background) senior IT engineer living in the US.`,
    `Please review my spoken Day ${dayNumber} story (${topic}${challengeTitle ? ` — ${challengeTitle}` : ''}).`,
    `Target phrases: "${proPhrase}" (work) and "${casualPhrase}" (casual).${flagNote}`,
    ``,
    `My raw spoken transcript:`,
    `"""`,
    String(transcript || '').trim() || '(Paste or speak your transcript here first)',
    `"""`,
    ``,
    `Please give me:`,
    `1. Missing articles (a/an/the), tense slips (like unnecessary -ing), or Indian-to-US phrasing tweaks.`,
    `2. Side-by-side "What I said" -> "How a native American senior engineer/friend would say it" for my top 3 sentences.`,
    `3. A crisp, natural 90-second rewrite I can shadow out loud twice.`,
  ].join('\n');
}
