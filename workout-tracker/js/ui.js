// Small helpers shared by the screens and charts.

import { fromIso } from './logic.js';

/** Builds DOM safely: anything from a backup or a note only ever becomes text nodes, never HTML. */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : String(c));
  return el;
}

export function svgEl(tag, attrs = {}, ...children) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...children);
  return el;
}

export function select(label, value, options, onchange, extra = {}) {
  const el = h('select', { 'aria-label': label, ...extra, onchange: () => onchange(el.value) },
    options.map(([v, text]) => h('option', { value: v, selected: String(v) === String(value) }, text)));
  return el;
}

const format = opts => { const f = new Intl.DateTimeFormat('en-US', opts); return iso => f.format(fromIso(iso)); };
export const longDate = format({ weekday: 'long', month: 'long', day: 'numeric' });
export const shortDate = format({ month: 'short', day: 'numeric' });
export const dayLetter = format({ weekday: 'narrow' });
export const dayName = format({ weekday: 'short', month: 'short', day: 'numeric' });

let toastTimer;
export function toast(message, action) {
  const box = document.querySelector('#toast');
  box.replaceChildren(h('span', {}, message));
  if (action) {
    box.append(h('button', { class: 'link', type: 'button', onclick: () => { box.classList.remove('show'); action.run(); } }, action.label));
  }
  box.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove('show'), action ? 6000 : 3200);
}

export function confirmIt(title, body, yes) {
  return new Promise(resolve => {
    const box = h('dialog', { class: 'confirm' },
      h('h2', {}, title),
      h('p', {}, body),
      h('div', { class: 'row end' },
        h('button', { class: 'ghost', type: 'button', onclick: () => close(false) }, 'Cancel'),
        h('button', { class: 'danger', type: 'button', onclick: () => close(true) }, yes)));
    function close(answer) { box.close(); box.remove(); resolve(answer); }
    box.addEventListener('cancel', e => { e.preventDefault(); close(false); });
    document.body.append(box);
    box.showModal();
  });
}

export function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
