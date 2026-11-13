// The timer for rests and timed stretches. It counts to a fixed end time, so it stays right if the browser pauses timers.

const bar = document.querySelector('#rest');
const time = document.querySelector('#rest-time');
const title = document.querySelector('#rest-label');
const fill = document.querySelector('#rest-fill');
let end = 0;
let total = 0;
let ticker;
let audio;
let beepOn = true;
let wake;

const stamp = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

async function keepAwake(on) {
  try {
    if (on && !wake && navigator.wakeLock) wake = await navigator.wakeLock.request('screen');
    if (!on && wake) { await wake.release(); wake = null; }
  } catch { wake = null; }
}

function beep() {
  if (!beepOn || !audio) return;
  [0, 0.28].forEach(at => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(audio.destination);
    osc.start(audio.currentTime + at);
    osc.stop(audio.currentTime + at + 0.18);
  });
}

function update() {
  const rem = end - Date.now();
  const left = Math.ceil(rem / 1000);
  if (left <= 0) {
    stopRest();
    beep();
    navigator.vibrate?.([200, 100, 200]);
    return;
  }
  time.textContent = stamp(left);
  if (fill && total > 0) fill.style.width = `${Math.max(0, Math.min(100, (rem / total) * 100))}%`;
}

export function stopRest() {
  clearInterval(ticker);
  ticker = null;
  bar.hidden = true;
  keepAwake(false);
}

/** Must be called from a tap, because browsers only allow sound that starts from one. */
export function startRest(seconds, { beep: wantBeep = true, label = 'Rest' } = {}) {
  beepOn = wantBeep;
  title.textContent = label;
  if (wantBeep) {
    try {
      audio ||= new AudioContext();
      audio.resume();
    } catch { audio = null; }
  }
  total = seconds * 1000;
  end = Date.now() + total;
  bar.hidden = false;
  update();
  clearInterval(ticker);
  ticker = setInterval(update, 250);
  keepAwake(true);
}

bar.addEventListener('click', e => {
  const action = e.target.closest('[data-rest]')?.dataset.rest;
  if (!action) return;
  if (action === 'skip') { stopRest(); return; }
  const delta = Number(action) * 1000;
  end = Math.max(Date.now() + 1000, end + delta);
  total = Math.max(total, end - Date.now());
  update();
});
