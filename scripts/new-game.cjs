// Scaffolds a hand-built picture game and lists it in the catalogue.
//
//   node scripts/new-game.cjs <id> "<Name>" <icon> [options]
//     --blurb "text"            card text on the home page
//     --tagline "text"          line under the title on the start screen
//     --how "text"              how-to-play paragraph
//     --level 1..4              home page level (default 2)
//     --subject math|english|tamil|science|logic   (default math)
//     --skills a.b,c.d          skill tags for the grown-up report
//     --levels "L1 label|L2 label|L3 label"   adds ?level=1|2|3 buttons
//     --modes "a:Label A|b:Label B"           adds ?mode=a buttons (first is the default)
//     --scripts visuals/clock.js,play-kit.js  extra scripts from assets/js
//     --total 8                 questions per round
//
// It writes games/<id>/index.html and a game.js stub that uses KlgRound
// (assets/js/round-kit.js). Existing files are never overwritten.
const fs = require('fs');
const path = require('path');

const [id, name, icon, ...rest] = process.argv.slice(2);
if (!id || !name || !icon) {
 console.error('usage: node scripts/new-game.cjs <id> "<Name>" <icon> [--blurb …] [--level 2] [--subject math] [--skills a.b] [--levels "A|B|C"] [--modes "x:X|y:Y"] [--scripts a.js,b.js]');
 process.exit(1);
}
const opt = {};
for (let i = 0; i < rest.length; i += 2) opt[rest[i].replace(/^--/, '')] = rest[i + 1];
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const dir = path.join('games', id);
if (fs.existsSync(path.join(dir, 'index.html'))) { console.error(dir + '/index.html already exists'); process.exit(1); }
fs.mkdirSync(dir, { recursive: true });

const levelLinks = (opt.levels || '').split('|').filter(Boolean);
const modeLinks = (opt.modes || '').split('|').filter(Boolean).map(m => m.split(':'));
const scripts = ['sounds.js', 'progress.js', 'game-kit.js', 'math-visuals.js', ...(opt.scripts ? opt.scripts.split(',') : []), 'round-kit.js'];
const links = (container, param, items, fallbackIndex) => items.length
 ? `        <div id="${container}" class="d-flex flex-wrap justify-content-center gap-2 mb-3">\n${items.map((it, i) => {
   const [value, label] = Array.isArray(it) ? it : [String(i + 1), it];
   const href = i === fallbackIndex ? 'index.html' : `?${param}=${value}`;
   return `          <a class="btn btn-sm btn-outline-secondary" href="${href}">${esc(label)}</a>`;
  }).join('\n')}\n        </div>\n` : '';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="klg-handbuilt" content="1" />
  <title>${esc(name)} | Kid Learning Games</title>
  <meta name="description" content="${esc(opt.blurb || opt.tagline || name)}" />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${icon}</text></svg>" />
  <link href="../../assets/vendor/bootstrap.min.css" rel="stylesheet" />
  <link href="../../assets/css/common.css" rel="stylesheet" />
  <link href="../../assets/css/math-visuals.css" rel="stylesheet" />
  <link href="../../assets/css/visuals.css" rel="stylesheet" />
</head>
<body>
  <a class="skip-link" href="#start-btn">Skip to activity</a>
  <nav class="navbar navbar-dark klg-navbar mb-4">
    <div class="container">
      <a class="navbar-brand" href="../../index.html">&larr; Kid Learning Games</a>
      <span class="navbar-text text-white">${icon} ${esc(name)}</span>
    </div>
  </nav>

  <div class="container quiz-shell pb-5">
    <div id="start-screen" class="card quiz-card p-4 text-center">
      <div class="card-body">
        <div class="game-card-icon mb-2">${icon}</div>
        <h1 class="h3 fw-bold">${esc(name)}</h1>
        <p class="text-muted">${esc(opt.tagline || opt.blurb || '')}</p>
${links('mode-links', 'mode', modeLinks, 0)}${links('level-links', 'level', levelLinks, 1)}        <p id="quiz-info">${opt.total || 8} questions · no timer</p>
        <p class="text-muted mb-1"><small>${esc(opt.how || 'Look at the picture, then choose or build the answer.')}</small></p>
        <button id="start-btn" class="btn btn-lg text-white fw-bold px-5 mt-2" style="background: var(--klg-purple);">
          Let’s play
        </button>
      </div>
    </div>

    <section id="play-screen" class="card quiz-card p-3 p-md-4 d-none">
      <div class="quiz-tools"><button type="button" id="exit-btn">← Change activity</button><span id="score-pill" class="quiz-score-pill">⭐ 0</span></div>
      <div class="mg-toolbar"><span id="progress-text" class="quiz-progress-text">Question 1</span></div>
      <p id="task" class="mg-task" tabindex="-1"></p>
      <button id="listen-btn" type="button" class="quiz-listen" hidden>🔊 Listen again</button>
      <div id="stage" class="kv-stage"></div>
      <p id="feedback" class="mg-feedback" role="status"></p>
      <button id="next-btn" type="button" class="quiz-next" hidden>Next →</button>
    </section>

    <section id="finish-screen" class="card results-card p-4 text-center d-none" tabindex="-1">
      <h2 class="fw-bold">Round complete!</h2>
      <div id="finish-summary" class="tg-finish" role="status"></div>
      <div class="d-flex justify-content-center flex-wrap gap-2 mt-3">
        <button id="play-again" class="btn btn-lg text-white fw-bold px-4" style="background: var(--klg-purple);">Play again</button>
        <a href="../../index.html" class="btn btn-lg btn-outline-secondary fw-bold px-4">More games</a>
      </div>
    </section>
  </div>

  <script src="../../assets/vendor/confetti.browser.min.js"></script>
${scripts.map(s => `  <script src="../../assets/js/${s}"></script>`).join('\n')}
  <script src="game.js"></script>
</body>
</html>
`;
fs.writeFileSync(path.join(dir, 'index.html'), html);

const stubPath = path.join(dir, 'game.js');
if (!fs.existsSync(stubPath)) fs.writeFileSync(stubPath, `/**
 * ${name}
 */
(function () {
  "use strict";
  const V = window.KlgMathVis;
  const params = new URLSearchParams(location.search);

  KlgGameKit.modeLinks(document.getElementById("mode-links"), "mode", "default");
  KlgGameKit.modeLinks(document.getElementById("level-links"), "level", "2");

  KlgRound.run({
    total: ${opt.total || 8},
    make() { return {}; },
    render(q, ctx) {
      ctx.task("TODO");
    },
  });
})();
`);

// Catalogue entry.
const catPath = 'assets/js/catalogue.js';
let cat = fs.readFileSync(catPath, 'utf8');
if (!cat.includes(`id: "${id}"`) && !cat.includes(`"id":"${id}"`)) {
 const entry = JSON.stringify({
  id, name, icon, blurb: opt.blurb || opt.tagline || name, level: Number(opt.level || 2), subject: opt.subject || 'math',
  skills: (opt.skills || 'math.misc').split(','), isNew: true,
 });
 cat = cat.replace(/\n  \];\n\n  var PATHS/, `\n    ${entry},\n  ];\n\n  var PATHS`);
 fs.writeFileSync(catPath, cat);
}
console.log(`Created games/${id}/ and listed it in the catalogue. Now run: npm run sync:index`);
