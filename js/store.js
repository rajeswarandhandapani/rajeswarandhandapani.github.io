// Everything is kept in this browser's IndexedDB. Nothing leaves the device except a backup you download.

const DB = 'workout-tracker';
let dbp;

function open() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('days', { keyPath: 'date' });
        req.result.createObjectStore('kv');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
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
export const getKv = key => run('kv', 'readonly', t => t.objectStore('kv').get(key));
export const setKv = (key, value) => run('kv', 'readwrite', t => { t.objectStore('kv').put(value, key); });
export const eraseAll = () => run(['days', 'kv'], 'readwrite', t => { t.objectStore('days').clear(); t.objectStore('kv').clear(); });

export const replaceAll = (days, settings) => run(['days', 'kv'], 'readwrite', t => {
  const dayStore = t.objectStore('days');
  dayStore.clear();
  days.forEach(d => dayStore.put(d));
  t.objectStore('kv').put(settings, 'settings');
});
