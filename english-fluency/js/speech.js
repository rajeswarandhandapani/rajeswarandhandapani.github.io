// Browser-native speech synthesis (TTS), dialogue role-play runner,
// local MediaRecorder voice recording, and optional live SpeechRecognition captions.

const PREFERRED_VOICE_PATTERNS = [
  /google us english/i,
  /natural.*united states/i,
  /aria|jenny|guy|davis|samantha|alex|ava|allison|nicky/i,
  /enhanced/i,
];

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

export function listEnUsVoices() {
  if (!canSpeak()) return [];
  let voices = [];
  try { voices = window.speechSynthesis.getVoices() || []; } catch { return []; }
  const enUs = voices.filter(v => /^en[-_]US$/i.test(v.lang));
  const pool = enUs.length ? enUs : voices.filter(v => /^en/i.test(v.lang));
  return [...pool].sort((a, b) => {
    const score = v => {
      const idx = PREFERRED_VOICE_PATTERNS.findIndex(re => re.test(v.name));
      return (idx === -1 ? 99 : idx) + (/^en[-_]US$/i.test(v.lang) ? 0 : 100);
    };
    return score(a) - score(b) || a.name.localeCompare(b.name);
  });
}

let dialogueToken = 0;

export function stopSpeaking() {
  dialogueToken += 1;
  if (!canSpeak()) return;
  try { window.speechSynthesis.cancel(); } catch { }
}

export function speak(text, { voiceName = null, rate = 1.0, onEnd = null } = {}) {
  if (!canSpeak() || !text) { onEnd?.(); return false; }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    const voices = listEnUsVoices();
    const chosen = (voiceName && voices.find(v => v.name === voiceName)) || voices[0] || null;
    if (chosen) u.voice = chosen;
    u.lang = chosen?.lang || 'en-US';
    u.rate = Math.max(0.65, Math.min(1.4, Number(rate) || 1.0));
    let finished = false;
    const done = () => { if (!finished) { finished = true; onEnd?.(); } };
    u.onend = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    onEnd?.();
    return false;
  }
}

export function playDialogue(turns, { voiceName = null, rate = 1.0, rolePlay = false, onTurn = null, onWaitForYou = null, onDone = null } = {}) {
  stopSpeaking();
  const token = ++dialogueToken;
  let index = 0;

  function step() {
    if (token !== dialogueToken) return;
    if (index >= turns.length) {
      onDone?.();
      return;
    }
    const turn = turns[index];
    const isYou = turn.speaker === 'You';
    onTurn?.(index, isYou);

    if (rolePlay && isYou) {
      onWaitForYou?.(index, () => {
        if (token !== dialogueToken) return;
        index += 1;
        step();
      });
      return;
    }

    const advance = () => {
      if (token !== dialogueToken) return;
      index += 1;
      setTimeout(step, 320);
    };

    if (!canSpeak() || !listEnUsVoices().length) {
      // Headless or voice-less environment fallback: brief readable highlight then advance.
      setTimeout(advance, 500);
      return;
    }

    speak(turn.text, { voiceName, rate, onEnd: advance });
  }

  step();
  return () => {
    if (token === dialogueToken) stopSpeaking();
  };
}

/* ---------- Voice Recorder ---------- */

export const canRecord = () => typeof navigator !== 'undefined'
  && Boolean(navigator.mediaDevices?.getUserMedia)
  && typeof MediaRecorder !== 'undefined';

let activeRec = null;

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) || '';
}

export async function startRecording() {
  if (!canRecord()) throw new Error('Audio recording is not supported in this browser.');
  if (activeRec) await stopRecording().catch(() => { });
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickMimeType();
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks = [];
  const startedAt = Date.now();
  recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
  recorder.start(250);
  activeRec = { recorder, stream, chunks, startedAt, mimeType: recorder.mimeType || mimeType || 'audio/webm' };
  return true;
}

export function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!activeRec) { resolve(null); return; }
    const { recorder, stream, chunks, startedAt, mimeType } = activeRec;
    activeRec = null;
    const release = () => {
      try { stream.getTracks().forEach(t => t.stop()); } catch { }
    };
    if (recorder.state === 'inactive') {
      release();
      const durationSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      resolve({ blob: new Blob(chunks, { type: mimeType }), mimeType, durationSec });
      return;
    }
    recorder.onstop = () => {
      release();
      const durationSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      resolve({ blob: new Blob(chunks, { type: mimeType }), mimeType, durationSec });
    };
    recorder.onerror = e => {
      release();
      reject(e?.error || new Error('Recording failed.'));
    };
    try { recorder.stop(); } catch (err) { release(); reject(err); }
  });
}

/* ---------- Live Speech-to-Text (Web Speech API) ---------- */

const Recognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
export const canDictate = () => Boolean(Recognition);

let activeSpeech = null;

export function startDictation({ onResult, onError, onEnd } = {}) {
  if (!Recognition) throw new Error('Live speech recognition is not supported in this browser.');
  stopDictation();
  const rec = new Recognition();
  rec.lang = 'en-US';
  rec.continuous = true;
  rec.interimResults = true;
  let finalText = '';
  rec.onresult = event => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      if (res.isFinal) finalText += `${res[0].transcript.trim()} `;
      else interim += res[0].transcript;
    }
    onResult?.({ finalText: finalText.trim(), interimText: interim.trim() });
  };
  rec.onerror = e => onError?.(e?.error || 'speech-error');
  rec.onend = () => {
    if (activeSpeech === rec) activeSpeech = null;
    onEnd?.();
  };
  rec.start();
  activeSpeech = rec;
  return true;
}

export function stopDictation() {
  if (!activeSpeech) return;
  const rec = activeSpeech;
  activeSpeech = null;
  try { rec.stop(); } catch { }
}
