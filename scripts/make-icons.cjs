// Draws the app icons with a headless browser. Usage: npm run icons
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BUBBLE = 'M140 124H372C404 124 428 148 428 180V308C428 340 404 364 372 364H238L164 416V364H140C108 364 84 340 84 308V180C84 148 108 124 140 124Z';

const art = ({ scale, bars = true }) => `
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <path d="${BUBBLE}" fill="#ffffff"/>
    ${bars ? `
      <line x1="196" y1="212" x2="196" y2="276" stroke="#2b4ea2" stroke-width="28" stroke-linecap="round"/>
      <line x1="256" y1="184" x2="256" y2="304" stroke="#2b4ea2" stroke-width="28" stroke-linecap="round"/>
      <line x1="316" y1="212" x2="316" y2="276" stroke="#2b4ea2" stroke-width="28" stroke-linecap="round"/>
    ` : ''}
  </g>`;

const svg = (size, { rounded, scale, bars }) => `<!doctype html><html><body style="margin:0;background:transparent">
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512" style="display:block">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3a64c7"/>
      <stop offset="1" stop-color="#1e3a80"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#bg)"/>
  ${art({ scale, bars })}
</svg></body></html>`;

// Maskable icons are cropped by the phone, so the artwork stays inside the central safe circle.
const ICONS = [
  { name: 'icon-192', size: 192, rounded: true, scale: 1.0, bars: true },
  { name: 'icon-512', size: 512, rounded: true, scale: 1.0, bars: true },
  { name: 'icon-maskable-192', size: 192, rounded: false, scale: 0.78, bars: true },
  { name: 'icon-maskable-512', size: 512, rounded: false, scale: 0.78, bars: true },
  { name: 'apple-touch-icon', size: 180, rounded: false, scale: 0.92, bars: true },
  { name: 'favicon-32', size: 32, rounded: true, scale: 1.1, bars: false },
];

(async () => {
  fs.mkdirSync(path.join(__dirname, '..', 'icons'), { recursive: true });
  const browser = await chromium.launch()
    .catch(() => chromium.launch({ channel: 'chrome' }))
    .catch(() => chromium.launch({ channel: 'msedge' }));
  for (const icon of ICONS) {
    const p = await browser.newPage({ viewport: { width: icon.size, height: icon.size } });
    await p.setContent(svg(icon.size, icon));
    await p.screenshot({
      path: path.join(__dirname, '..', 'icons', `${icon.name}.png`),
      omitBackground: icon.rounded,
    });
    await p.close();
  }
  await browser.close();
  console.log('Generated all icons.');
})();
