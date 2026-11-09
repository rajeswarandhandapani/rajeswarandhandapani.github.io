// The Progress page charts, drawn as SVG at the width of their card.

import { h, svgEl, dayName, shortDate } from './ui.js';
import { daysBetween } from './logic.js';

const label = (attrs, value) => { const t = svgEl('text', attrs); t.textContent = value; return t; };

/** Rounded at the top only, so bars sit flat on their baseline. */
function barPath(x, from, to, w, radius = 4) {
  const r = Math.min(radius, w / 2, Math.abs(from - to));
  return `M${x},${from}V${to + r}Q${x},${to} ${x + r},${to}H${x + w - r}Q${x + w},${to} ${x + w},${to + r}V${from}Z`;
}

/** Redraws at the card's real width, including after a phone rotates. */
function plot(height, draw) {
  const box = h('div', { class: 'chart-plot' });
  box.style.minHeight = `${height}px`;
  let last = 0;
  new ResizeObserver(([entry]) => {
    const width = Math.round(entry.contentRect.width);
    if (width && width !== last) { last = width; box.replaceChildren(); draw(box, width); }
  }).observe(box);
  return box;
}

function tooltip(box) {
  const tip = h('div', { class: 'chart-tip', hidden: true });
  box.append(tip);
  return {
    show(x, y, lines) {
      tip.replaceChildren(...lines);
      tip.hidden = false;
      tip.style.left = `${Math.max(2, Math.min(x + 12, box.clientWidth - tip.offsetWidth - 2))}px`;
      tip.style.top = `${Math.max(0, y - tip.offsetHeight - 8)}px`;
    },
    hide() { tip.hidden = true; },
  };
}

const pointerIn = (svg, e) => {
  const r = svg.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};

/** Cardio minutes per week against the goal line. */
export function weeklyBars({ rows, goal, currentWeek }) {
  const H = 220;
  return plot(H, (box, W) => {
    const left = 34, top = 14, baseline = H - 24;
    const peak = Math.max(goal, ...rows.map(r => r.cardio));
    const step = peak > 300 ? 100 : 50;
    const ceil = Math.ceil((peak + 1) / step) * step;
    const y = v => baseline - (v / ceil) * (baseline - top);
    const band = (W - left) / rows.length;
    const barW = Math.min(26, band - 2);
    const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Cardio minutes per week' });
    for (let v = 0; v <= ceil; v += step) {
      svg.append(svgEl('line', { x1: left, x2: W, y1: y(v), y2: y(v), class: 'grid' }));
      svg.append(label({ x: left - 6, y: y(v) + 4, 'text-anchor': 'end', class: 'axis' }, v));
    }
    box.append(svg);
    const tip = tooltip(box);
    rows.forEach((row, i) => {
      const cx = left + band * i + band / 2;
      if (row.cardio > 0) svg.append(svgEl('path', { d: barPath(cx - barW / 2, baseline, y(row.cardio), barW), class: 'bar-cardio' }));
      svg.append(label({ x: cx, y: H - 7, 'text-anchor': 'middle', class: `axis${row.week === currentWeek ? ' strong-tick' : ''}` }, row.week));
    });
    svg.append(svgEl('line', { x1: left, x2: W, y1: y(goal), y2: y(goal), class: 'goal-line' }));
    svg.append(label({ x: W, y: y(goal) - 5, 'text-anchor': 'end', class: 'axis strong-tick' }, `${goal} min goal`));
    rows.forEach((row, i) => {
      const hit = svgEl('rect', { x: left + band * i, y: 0, width: band, height: H, fill: 'transparent' });
      const show = e => {
        const p = pointerIn(svg, e);
        tip.show(p.x, p.y, [h('strong', {}, `Week ${row.week}, from ${shortDate(row.monday)}`), h('div', {}, `${row.cardio} of ${goal} min`)]);
      };
      hit.addEventListener('pointermove', show);
      hit.addEventListener('pointerdown', show);
      hit.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') tip.hide(); });
      svg.append(hit);
    });
  });
}

function range(values) {
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || Math.max(max * 0.2, 10);
  const step = [1, 2, 5, 10, 20, 25, 50, 100].find(s => span / s <= 4) || 200;
  const pad = max === min ? step : 0;
  const lo = Math.max(0, Math.floor((min - pad) / step) * step);
  const hi = Math.max(lo + step, Math.ceil((max + pad) / step) * step);
  return { lo, hi, step };
}

/** One exercise over time. Points are placed by real date, so gaps show as gaps. */
export function lineChart({ points, unit, describe }) {
  const H = 210;
  return plot(H, (box, W) => {
    const left = 40, right = 18, top = 22, baseline = H - 24;
    const { lo, hi, step } = range(points.map(p => p.value));
    const y = v => baseline - ((v - lo) / (hi - lo)) * (baseline - top);
    const first = points[0].date;
    const span = daysBetween(first, points[points.length - 1].date);
    const x = p => (span ? left + (daysBetween(first, p.date) / span) * (W - left - right) : (left + W - right) / 2);
    const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Progress in ${unit}` });
    for (let v = lo; v <= hi; v += step) {
      svg.append(svgEl('line', { x1: left, x2: W - right, y1: y(v), y2: y(v), class: 'grid' }));
      svg.append(label({ x: left - 6, y: y(v) + 4, 'text-anchor': 'end', class: 'axis' }, v));
    }
    const cross = svgEl('line', { y1: top - 6, y2: baseline, class: 'crosshair', visibility: 'hidden' });
    svg.append(cross);
    svg.append(svgEl('path', { d: points.map((p, i) => `${i ? 'L' : 'M'}${x(p)},${y(p.value)}`).join(''), class: 'line-gym' }));
    points.forEach(p => svg.append(svgEl('circle', { cx: x(p), cy: y(p.value), r: 4, class: 'dot-gym' })));
    const end = points[points.length - 1];
    svg.append(label({ x: Math.min(x(end), W - right), y: y(end.value) - 10, 'text-anchor': points.length > 1 ? 'end' : 'middle', class: 'axis strong-tick' }, `${end.value} ${unit}`));
    svg.append(label({ x: left, y: H - 7, class: 'axis' }, shortDate(first)));
    if (span) svg.append(label({ x: W - right, y: H - 7, 'text-anchor': 'end', class: 'axis' }, shortDate(end.date)));
    box.append(svg);
    const tip = tooltip(box);
    const show = e => {
      const at = pointerIn(svg, e);
      const near = points.reduce((a, b) => (Math.abs(x(b) - at.x) < Math.abs(x(a) - at.x) ? b : a));
      cross.setAttribute('x1', x(near));
      cross.setAttribute('x2', x(near));
      cross.setAttribute('visibility', 'visible');
      tip.show(x(near), y(near.value), [h('strong', {}, dayName(near.date)), h('div', {}, describe(near))]);
    };
    svg.addEventListener('pointermove', show);
    svg.addEventListener('pointerdown', show);
    svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { tip.hide(); cross.setAttribute('visibility', 'hidden'); } });
  });
}
