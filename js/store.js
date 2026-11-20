// IndexedDB storage on this device: daily logs, local audio recordings, and settings.
// Nothing leaves the device unless you download a JSON backup.

const DB = 'english-fluency';
let dbp;

function open() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('days', { keyPath: 'date' });
        req.result.createObjectStore('recordings', { keyPath: 'date' });
        req.result.createObjectStore('kv');
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onclose = () => { dbp = null; };
        db.onversionchange = () => { db.close(); dbp = null; };
        resolve(db);
      };
      req.onerror = () => { dbp = null; reject(req.error); };
      req.onblocked = () => { dbp = null; reject(new Error('Database blocked')); };
    });
  }
  return dbp;
}

async function run(stores, mode, work) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    let result;
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
    const out = work(t);
    if (out) out.onsuccess = () => { result = out.result; };
  });
}

export const allDays = () => run('days', 'readonly', t => t.objectStore('days').getAll());
export const putDay = day => run('days', 'readwrite', t => { t.objectStore('days').put(day); });
export const deleteDay = date => run('days', 'readwrite', t => { t.objectStore('days').delete(date); });

export const getRecording = date => run('recordings', 'readonly', t => t.objectStore('recordings').get(date));
export const putRecording = rec => run('recordings', 'readwrite', t => { t.objectStore('recordings').put(rec); });
export const deleteRecording = date => run('recordings', 'readwrite', t => { t.objectStore('recordings').delete(date); });
export const allRecordings = () => run('recordings', 'readonly', t => t.objectStore('recordings').getAll());
export const clearRecordings = () => run('recordings', 'readwrite', t => { t.objectStore('recordings').clear(); });

export async function allRecordingMeta() {
  const list = await allRecordings();
  return (list || []).map(r => ({
    date: r.date,
    durationSec: r.durationSec || 0,
    size: r.blob?.size || 0,
    createdAt: r.createdAt || null,
  }));
}

export const getKv = key => run('kv', 'readonly', t => t.objectStore('kv').get(key));
export const setKv = (key, value) => run('kv', 'readwrite', t => { t.objectStore('kv').put(value, key); });

export const eraseAll = () => run(['days', 'recordings', 'kv'], 'readwrite', t => {
  t.objectStore('days').clear();
  t.objectStore('recordings').clear();
  t.objectStore('kv').clear();
});

export const replaceAll = (days, settings) => run(['days', 'kv'], 'readwrite', t => {
  const dayStore = t.objectStore('days');
  dayStore.clear();
  days.forEach(d => dayStore.put(d));
  t.objectStore('kv').put(settings, 'settings');
});
