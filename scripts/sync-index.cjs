// Keeps the parts of index.html that cannot be rendered by JavaScript in step
// with assets/js/catalogue.js: the game count in the title/description and
// the <noscript> list of links. `npm run build` runs this; `--check` only
// reports a mismatch (used by tests/catalogue.test.cjs).
const fs = require('fs');
const cat = require('../assets/js/catalogue.js');

function synced(html) {
 const n = cat.GAMES.length;
 let out = html
  .replace(/\d+ learning games for kids/, `${n} learning games for kids`)
  .replace(/Explore \d+ playful/, `Explore ${n} playful`);
 const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
 const blocks = Object.keys(cat.LEVELS).map(level => {
  const items = cat.GAMES.filter(g => String(g.level) === level)
   .map(g => `            <li><a href="games/${g.id}/index.html">${esc(g.icon)} ${esc(g.name)}</a> — ${esc(g.blurb)}</li>`).join('\n');
  return `        <h3>${esc(cat.LEVELS[level].name)} · ${esc(cat.LEVELS[level].ages)}</h3>\n        <ul>\n${items}\n        </ul>`;
 }).join('\n');
 return out.replace(/<!-- noscript:start -->[\s\S]*<!-- noscript:end -->/, `<!-- noscript:start -->\n${blocks}\n        <!-- noscript:end -->`);
}

if (require.main === module) {
 const html = fs.readFileSync('index.html', 'utf8');
 const next = synced(html);
 if (process.argv.includes('--check')) { process.exit(next === html ? 0 : 1); }
 if (next !== html) fs.writeFileSync('index.html', next);
 console.log(`index.html lists ${cat.GAMES.length} games`);
}
module.exports = { synced };
