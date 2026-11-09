// Draws the app icons with a headless browser. Usage: npm run icons
const { chromium } = require('playwright');
const path = require('path');

const HEART = 'M256 420C256 420 92 322 92 202C92 138 142 96 196 96C226 96 246 112 256 132C266 112 286 96 316 96C370 96 420 138 420 202C420 322 256 420 256 420Z';

const art = ({ scale, pulse = true }) => `
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <path d="${HEART}" fill="#ffffff"/>
    ${pulse ? '<path d="M128 240H200L228 182L272 300L300 240H384" fill="none" stroke="#17693f" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>' : ''}
  </g>`;

const svg = (size, { rounded, scale, pulse }) => `<!doctype html><html><body style="margin:0;background:transparent">
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512" style="display:block">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a9a60"/><stop offset="1" stop-color="#125232"/></linearGradient></defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#bg)"/>
  ${art({ scale, pulse })}
</svg></body></html>`;

// Maskable icons are cropped by the phone, so the artwork stays inside the central safe circle.
const ICONS = [
  { name: 'icon-192', size: 192, rounded: true, scale: 1.05 },
  { name: 'icon-512', size: 512, rounded: true, scale: 1.05 },
  { name: 'icon-maskable-192', size: 192, rounded: false, scale: 0.8 },
  { name: 'icon-maskable-512', size: 512, rounded: false, scale: 0.8 },
  { name: 'apple-touch-icon', size: 180, rounded: false, scale: 0.95 },
  { name: 'favicon-32', size: 32, rounded: true, scale: 1.2, pulse: false },
];

(async () => {
  const browser = await chromium.launch();
  for (const icon of ICONS) {
    const p = await browser.newPage({ viewport: { width: icon.size, height: icon.size } });
    await p.setContent(svg(icon.size, icon));
    await p.screenshot({ path: path.join(__dirname, '..', 'icons', `${icon.name}.png`), omitBackground: icon.rounded });
    await p.close();
  }
  await browser.close();
})();
