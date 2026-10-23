// Writes sw.js: the service worker that saves every page, script, picture,
// font and Tamil recording so the games keep working with no internet
// (for example on an iPad added to the Home Screen).
//
//   node scripts/build-sw.cjs          write sw.js (npm run build does this)
//   node scripts/build-sw.cjs --check  exit 1 if sw.js is out of date
//
// The file list and a content hash are baked in. When any file changes the
// hash changes, the browser sees a new sw.js and re-saves everything.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOTS = ['index.html', 'manifest.webmanifest', 'assets', 'games'];
const SKIP = /(^|\/)\.|\.md$/; // dot-files and READMEs/credits are not needed offline

function walk(p, out) {
 if (!fs.existsSync(p)) return out;
 if (fs.statSync(p).isDirectory()) fs.readdirSync(p).sort().forEach((f) => walk(path.join(p, f), out));
 else if (!SKIP.test(p)) out.push(p.split(path.sep).join('/'));
 return out;
}

function build() {
 const files = ROOTS.flatMap((r) => walk(r, []));
 const hash = crypto.createHash('sha256');
 files.forEach((f) => { hash.update(f); hash.update(fs.readFileSync(f)); });
 const version = hash.digest('hex').slice(0, 12);
 const template = fs.readFileSync(path.join(__dirname, 'sw-template.js'), 'utf8');
 return template
  .replace('__VERSION__', version)
  .replace('__FILES__', JSON.stringify(['./', ...files.map((f) => './' + f)], null, 1));
}

const next = build();
if (process.argv.includes('--check')) {
 const now = fs.existsSync('sw.js') ? fs.readFileSync('sw.js', 'utf8') : '';
 process.exit(now === next ? 0 : 1);
}
fs.writeFileSync('sw.js', next);
console.log('sw.js saves ' + (next.match(/"\.\//g) || []).length + ' files for offline use');
module.exports = { build };
