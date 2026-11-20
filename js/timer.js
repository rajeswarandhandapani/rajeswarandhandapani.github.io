// Speaking and challenge countdown timer. Uses fixed end timestamps so browser throttling won't cause drift.

const bar = document.querySelector('#timer-bar');
const timeEl = document.querySelector('#timer-time');
const titleEl = document.querySelector('#timer-label');
const fillEl = document.querySelector('#timer-fill');

let end = 0;
let total = 0;
let startedAt = 0;
let ticker = null;
let audio = null;
let beepOn = true;
let wake = null;
let finishCb = null;

const stamp = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

async function keepAwake(on) {
  try {
    if (on && !wake && navigator.wakeLock) {
      wake = await navigator.wakeLock.request('screen');
      wake.addEventListener?.('release', () => { wake = null; });
    }
    if (!on && wake) { await wake.release(); wake = null; }
  } catch { wake = null; }
}

function beep() {
  if (!beepOn || !audio) return;
  [0, 0.25].forEach(at => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 784;
    gain.gain.value = 0.14;
    osc.connect(gain).connect(audio.destination);
    osc.start(audio.currentTime + at);
    osc.stop(audio.currentTime + at + 0.16);
  });
}

function update() {
  const rem = end - Date.now();
  const left = Math.ceil(rem / 1000);
  if (left <= 0) {
    const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const cb = finishCb;
    stopTimer();
    if (rem > -3000) {
      beep();
      navigator.vibrate?.([180, 90, 180]);
    }
    cb?.(elapsed);
    return;
  }
  timeEl.textContent = stamp(left);
  if (fillEl && total > 0) fillEl.style.width = `${Math.max(0, Math.min(100, (rem / total) * 100))}%`;
}

export function stopTimer() {
  const elapsed = startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : 0;
  clearInterval(ticker);
  ticker = null;
  startedAt = 0;
  finishCb = null;
  if (bar) bar.hidden = true;
  keepAwake(false);
  return elapsed;
}

export function startTimer(seconds, { beep: wantBeep = true, label = 'Speak', onFinish = null } = {}) {
  beepOn = wantBeep;
  finishCb = onFinish;
  titleEl.textContent = label;
  if (wantBeep) {
    try {
      audio ||= new AudioContext();
      audio.resume();
    } catch { audio = null; }
  }
  total = seconds * 1000;
  startedAt = Date.now();
  end = startedAt + total;
  bar.hidden = false;
  update();
  clearInterval(ticker);
  ticker = setInterval(update, 250);
  keepAwake(true);
}

bar?.addEventListener('click', e => {
  const action = e.target.closest('[data-timer]')?.dataset.timer;
  if (!action) return;
  if (action === 'stop') {
    const cb = finishCb;
    const elapsed = stopTimer();
    if (elapsed >= 5) cb?.(elapsed);
    return;
  }
  const delta = Number(action) * 1000;
  end = Math.max(Date.now() + 1000, end + delta);
  total = Math.max(total, end - Date.now());
  update();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && ticker) {
    update();
    if (ticker) keepAwake(true);
  }
});
