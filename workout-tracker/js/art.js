// Original side-view drawings of each exercise, built from code so they work offline and follow
// the light and dark themes. Generic machine shapes only: no brand marks or traced photos.
//
// Each scene gives a start and finish pose. Poses name where the hips, hands and feet go, and the
// elbows and knees are worked out, so the figure keeps the same proportions in every drawing.

import { svgEl } from './ui.js';

const G = 168; // floor height
const BODY = { torso: 46, upper: 25, fore: 24, thigh: 34, shin: 33, neck: 18, head: 10, toe: 13 };

const rad = d => (d * Math.PI) / 180;
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];

/** Finds the middle joint of a limb. `bend` picks which side it folds to. */
function limb(from, to, a, b, bend) {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const full = Math.hypot(dx, dy) || 1;
  const ux = dx / full, uy = dy / full;
  const d = Math.min(full, a + b - 0.5);
  const x = (a * a - b * b + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, a * a - x * x));
  return { mid: [from[0] + ux * x - uy * h * bend, from[1] + uy * x + ux * h * bend], end: [from[0] + ux * d, from[1] + uy * d] };
}

function solve(pose) {
  const { hip, lean = 0, arm = 1, leg = -1 } = pose;
  const up = pose.sh ? (() => { const v = [pose.sh[0] - hip[0], pose.sh[1] - hip[1]]; const n = Math.hypot(...v); return [v[0] / n, v[1] / n]; })() : [Math.sin(rad(lean)), -Math.cos(rad(lean))];
  const sh = pose.sh || add(hip, up, BODY.torso);
  const rear = [up[1], -up[0]];
  const p = { ...pose, hip, sh, up, rear: pose.flip ? [-rear[0], -rear[1]] : rear };
  p.head = pose.head || add(sh, up, BODY.neck);
  const a = limb(sh, pose.hand, BODY.upper, BODY.fore, arm);
  p.el = a.mid; p.ha = a.end;
  const l = limb(hip, pose.foot, BODY.thigh, BODY.shin, leg);
  p.kn = l.mid; p.an = l.end;
  if (pose.hand2) { const b = limb(sh, pose.hand2, BODY.upper, BODY.fore, pose.arm2 ?? arm); p.el2 = b.mid; p.ha2 = b.end; }
  if (pose.foot2) { const b = limb(hip, pose.foot2, BODY.thigh, BODY.shin, pose.leg2 ?? leg); p.kn2 = b.mid; p.an2 = b.end; }
  return p;
}

/* ---------- Drawing pieces ---------- */

const ln = (a, b, cls, w) => ['line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: cls, 'stroke-width': w }];
const dot = (c, r, cls) => ['circle', { cx: c[0], cy: c[1], r, class: cls }];
const box = (x, y, w, h, cls, r = 1.5) => ['rect', { x, y, width: w, height: h, rx: r, class: cls }];
const frame = (a, b, w = 6) => ln(a, b, 'art-frame', w);
const pad = (a, b, w = 13) => ln(a, b, 'art-pad', w);
const lever = (a, b, w = 6) => ln(a, b, 'art-lever', w);
const grip = (a, b, w = 7) => ln(a, b, 'art-grip', w);
const cable = (...points) => ['polyline', { points: points.map(q => q.join(',')).join(' '), class: 'art-cable' }];
const pulley = c => dot(c, 5, 'art-pulley');
const floorBar = (a, b) => frame([a, G - 2], [b, G - 2], 7);

/** A point along the torso, `off` units towards the back (or the chest if negative). */
const along = (p, f, off = 0) => add(add(p.hip, p.up, BODY.torso * f), p.rear, off);
const backPad = (p, from = 0.08, to = 0.98, off = 13) => pad(along(p, from, off), along(p, to, off));

/** The weight stack: a few plates ride up with the pin at the finish. */
function stack(x, t, top = 34) {
  const plate = 7, count = 10, moving = 4, base = G - 7, width = 26;
  const out = [box(x + 3, top, width - 6, G - top - 3, 'art-tower', 3), frame([x, top], [x, G]), frame([x + width, top], [x + width, G]), frame([x - 3, top], [x + width + 3, top], 7)];
  let lid;
  for (let i = 0; i < count; i++) {
    const y = base - (i + 1) * plate - (i >= count - moving ? t * 24 : 0);
    out.push(box(x + 4, y, width - 8, plate - 1.2, 'art-plate'));
    if (i === count - moving) out.push(dot([x + width / 2, y + 2.9], 2.6, 'art-pin'));
    lid = [x + width / 2, y];
  }
  return { parts: out, lid };
}

function dumbbell(c, angle = 0, len = 24) {
  const u = [Math.cos(rad(angle)), Math.sin(rad(angle))];
  const a = add(c, u, -len / 2), b = add(c, u, len / 2);
  return [ln(a, b, 'art-grip', 3.5), ln(add(a, u, -1), add(a, u, 3), 'art-grip', 12), ln(add(b, u, 1), add(b, u, -3), 'art-grip', 12)];
}

function bench(x1, x2, y) {
  return [frame([x1 + 10, y + 6], [x1 + 10, G - 1]), frame([x2 - 10, y + 6], [x2 - 10, G - 1]), floorBar(x1 + 2, x2 - 2), pad([x1, y], [x2, y], 12)];
}

function figure(p) {
  const toe = rad(p.toe ?? 0);
  const out = [];
  const tip = (an, deg = toe) => add(an, [Math.cos(deg), Math.sin(deg)], BODY.toe);
  if (p.an2) out.push(ln(p.hip, p.kn2, 'art-far', 13), ln(p.kn2, p.an2, 'art-far', 10), ln(p.an2, tip(p.an2, rad(p.toe2 ?? 0)), 'art-far', 7.5));
  if (p.ha2) out.push(ln(p.sh, p.el2, 'art-far', 8.5), ln(p.el2, p.ha2, 'art-far', 7.5));
  out.push(ln(p.hip, p.kn, 'art-body', 14), ln(p.kn, p.an, 'art-body', 11), ln(p.an, tip(p.an), 'art-body', 8));
  out.push(ln(p.hip, p.sh, 'art-body', 18));
  out.push(dot(p.head, BODY.head, 'art-body-fill'));
  return out;
}
const arm = p => [ln(p.sh, p.el, 'art-body art-arm', 9.5), ln(p.el, p.ha, 'art-body art-arm', 8.5)];

/* ---------- The exercises ---------- */

const seat = (x1, x2, y, postX) => [frame([postX, y], [postX, G - 1]), pad([x1, y], [x2, y], 12)];
const shinBack = p => { const v = [p.an[0] - p.kn[0], p.an[1] - p.kn[1]]; const n = Math.hypot(...v); return [-v[1] / n, v[0] / n]; };

const pulldownMachine = (p, t, handle) => {
  const s = stack(172, t, 26);
  const top = [185, 20];
  return {
    back: [floorBar(70, 200), ...s.parts, frame([185, 20], [108, 20], 8), ...seat(76, 110, 143, 94), frame([146, 104], [146, G - 2], 6), frame([146, 104], [126, 104], 5), pad([106, 104], [126, 104], 11), cable([handle[0], handle[1]], [118, 22], top, s.lid), pulley([118, 22]), pulley(top)],
    front: [],
  };
};

const SCENES = {
  'leg-press': {
    poses: [{ hip: [126, 112], lean: -24, hand: [146, 122], foot: [164, 104], toe: -78 }, { hip: [100, 108], lean: -24, hand: [120, 118], foot: [164, 104], toe: -78 }],
    arrow: [[108, 142], [80, 148]],
    draw: (p, t) => {
      const s = stack(6, t);
      return {
        back: [floorBar(10, 196), ...s.parts, frame([46, G - 3], [46, 150], 6), frame([40, 150], [182, 128], 7), frame([176, 128], [182, G - 2], 7), frame([180, 80], [180, 128], 7), cable(s.lid, [33, 30], [48, 30], [p.hip[0] - 18, p.hip[1] + 26]), lever(add(p.hip, [-10, 18]), add(p.hip, [-4, 30]), 7), pad(add(p.hip, [-20, 14]), add(p.hip, [16, 10]), 12), backPad(p)],
        front: [pad([172, 76], [175, 128], 8), grip(add(p.ha, [-5, 0]), add(p.ha, [5, 0]))],
      };
    },
  },
  'chest-press': {
    poses: [{ hip: [70, 128], lean: -6, hand: [90, 88], foot: [118, 162] }, { hip: [70, 128], lean: -6, hand: [113, 86], foot: [118, 162] }],
    arrow: [[104, 64], [132, 64]],
    draw: (p, t) => {
      const s = stack(172, t);
      return {
        back: [floorBar(30, 200), ...s.parts, ...seat(54, 88, 141, 70), frame([42, G - 2], [42, 80], 7), frame([42, 118], [70, 138], 6), backPad(p), lever([150, 158], p.ha, 7), frame([150, 158], [150, G - 2], 8), dot([150, 156], 6, 'art-pulley'), cable(add([150, 158], [p.ha[0] - 150, p.ha[1] - 158], 0.55), [176, 30], [185, 30], s.lid)],
        front: [grip(add(p.ha, [0, -7]), add(p.ha, [0, 7]))],
      };
    },
  },
  'lat-pulldown': {
    poses: [{ hip: [92, 130], lean: -8, hand: [118, 46], foot: [132, 162] }, { hip: [92, 130], lean: -8, hand: [114, 84], foot: [132, 162] }],
    arrow: [[140, 52], [140, 84]],
    draw: (p, t) => ({ ...pulldownMachine(p, t, add(p.ha, [0, -4])), front: [grip(add(p.ha, [-20, -3]), add(p.ha, [20, -3]), 5)] }),
  },
  'seated-row': {
    poses: [{ hip: [74, 130], lean: 2, hand: [122, 94], foot: [126, 160] }, { hip: [74, 130], lean: -3, hand: [96, 98], foot: [126, 160] }],
    arrow: [[124, 56], [98, 56]],
    draw: (p, t) => {
      const s = stack(172, t);
      return {
        back: [floorBar(50, 200), ...s.parts, ...seat(58, 92, 143, 74), frame([132, 165], [132, 150], 7), pad([120, 150], [140, 150], 7), frame([112, G - 2], [112, 96], 6), pad([104, 120], [104, 88], 11), frame([172, 40], [146, 40], 7), lever([146, 40], p.ha, 7), pulley([146, 40]), cable(add([146, 40], [p.ha[0] - 146, p.ha[1] - 40], 0.35), [168, 34], [185, 30], s.lid)],
        front: [grip(add(p.ha, [0, -7]), add(p.ha, [0, 7]))],
      };
    },
  },
  'leg-curl': {
    poses: [{ hip: [68, 118], lean: -14, hand: [90, 128], foot: [135, 118], toe: -70 }, { hip: [68, 118], lean: -14, hand: [90, 128], foot: [94, 150], toe: 20 }],
    arrow: [[150, 132], [122, 162]],
    draw: (p, t) => {
      const s = stack(4, t);
      const roller = add(p.an, shinBack(p), 11);
      const cam = [102, 118];
      return {
        back: [floorBar(8, 170), ...s.parts, ...seat(50, 104, 133, 72), backPad(p), frame([124, 92], [124, G - 2], 6), frame([100, 92], [124, 92], 5), cable(s.lid, [17, 30], [34, 32], cam), lever(cam, roller, 6), dot(roller, 8, 'art-pad-fill')],
        front: [pad([90, 99], [112, 99], 10), dot(cam, 6, 'art-pulley'), grip(add(p.ha, [-4, 0]), add(p.ha, [5, 0]))],
      };
    },
  },
  plank: {
    poses: [{ hip: [96, 140], lean: 79, hand: [166, 158], foot: [30, 155], arm: 1, toe: 80 }],
    hold: true,
    draw: () => ({ back: [pad([18, 165], [200, 165], 6)], front: [] }),
  },

  'hack-squat': {
    poses: [{ hip: [106, 112], sh: [72, 81], hand: [106, 84], foot: [160, 146], toe: -28, arm: 1 }, { hip: [128, 128], sh: [94, 97], hand: [128, 100], foot: [160, 146], toe: -28, arm: 1 }],
    arrow: [[122, 60], [148, 84]],
    draw: p => ({
      back: [floorBar(16, 196), frame([30, 76], [126, 162], 7), frame([30, 76], [30, G - 2], 7), frame([170, 150], [170, G - 2], 7), lever(along(p, 0.4, 13), along(p, 0.4, 25), 7), backPad(p, 0, 0.98, 12), pad(along(p, 1.02, 1), along(p, 1.02, -9), 9)],
      front: [pad([151, 160], [187, 139], 7), grip(add(p.ha, [-4, -4]), add(p.ha, [4, 4]))],
    }),
  },
  'goblet-squat': {
    poses: [{ hip: [106, 96], lean: 4, hand: [128, 62], foot: [114, 160], arm: 1 }, { hip: [84, 128], lean: 30, hand: [130, 94], foot: [114, 160], arm: 1 }],
    arrow: [[160, 84], [160, 122]],
    draw: () => ({ back: [], front: [] }),
    extra: p => dumbbell(add(p.ha, [2, 0]), 90, 20),
  },
  'step-up': {
    poses: [
      { hip: [100, 106], lean: 8, hand: [108, 150], foot: [146, 141], foot2: [80, 160], leg2: -1, arm: -1 },
      { hip: [146, 76], lean: 2, hand: [154, 122], foot: [146, 141], foot2: [124, 116], leg2: 1, toe2: 40, arm: -1 },
    ],
    arrow: [[66, 100], [90, 66]],
    draw: () => ({ back: [box(118, 148, 66, 20, 'art-pad-fill', 3)], front: [] }),
    extra: p => dumbbell(add(p.ha, [0, 3]), 0, 18),
  },
  'db-bench': {
    poses: [{ hip: [122, 106], lean: -90, hand: [76, 78], foot: [168, 162], arm: -1, flip: true }, { hip: [122, 106], lean: -90, hand: [76, 58], foot: [168, 162], arm: -1, flip: true }],
    arrow: [[44, 80], [44, 50]],
    draw: () => ({ back: bench(40, 142, 120), front: [] }),
    extra: p => dumbbell(add(p.ha, [0, -2]), 0, 20),
  },
  'cable-press': {
    poses: [
      { hip: [108, 102], lean: 10, hand: [134, 66], foot: [140, 160], foot2: [68, 160], leg2: -1, toe2: 0 },
      { hip: [108, 102], lean: 14, hand: [166, 58], foot: [140, 160], foot2: [68, 160], leg2: -1, toe2: 0 },
    ],
    arrow: [[150, 38], [182, 38]],
    draw: (p, t) => {
      const s = stack(6, t, 36);
      return { back: [floorBar(4, 38), ...s.parts, pulley([34, 64]), cable(s.lid, [19, 40], [34, 40], [34, 64], p.ha)], front: [grip(add(p.ha, [0, -7]), add(p.ha, [0, 7]))] };
    },
  },
  'incline-pushup': {
    poses: [{ hip: [90, 130], sh: [132, 110], hand: [148, 124], foot: [30, 158], arm: 1, toe: 70 }, { hip: [82, 117], sh: [119, 88], hand: [148, 124], foot: [30, 158], arm: 1, toe: 70 }],
    arrow: [[96, 84], [96, 56]],
    draw: () => ({ back: bench(128, 204, 133), front: [] }),
  },

  'single-arm-pulldown': {
    poses: [{ hip: [92, 130], lean: -6, hand: [116, 46], foot: [132, 162] }, { hip: [92, 130], lean: -6, hand: [110, 98], foot: [132, 162] }],
    arrow: [[140, 56], [140, 92]],
    draw: (p, t) => ({ ...pulldownMachine(p, t, add(p.ha, [0, -6])), front: [grip(add(p.ha, [-7, -3]), add(p.ha, [7, -3]), 7)] }),
  },
  'straight-arm-pulldown': {
    poses: [{ hip: [92, 97], lean: 12, hand: [150, 46], foot: [100, 160], arm: 1 }, { hip: [92, 97], lean: 12, hand: [114, 100], foot: [100, 160], arm: 1 }],
    arrow: [[160, 72], [146, 108]],
    draw: (p, t) => {
      const s = stack(174, t, 24);
      return { back: [floorBar(168, 204), ...s.parts, pulley([174, 30]), cable(s.lid, [187, 26], [174, 30], add(p.ha, [0, -3]))], front: [grip(add(p.ha, [-12, -3]), add(p.ha, [12, -3]), 5)] };
    },
  },
  'band-pulldown': {
    poses: [{ hip: [96, 100], lean: 2, hand: [130, 40], foot: [106, 160], arm: 1 }, { hip: [96, 100], lean: -2, hand: [118, 84], foot: [106, 160], arm: 1 }],
    arrow: [[150, 56], [150, 90]],
    draw: p => ({ back: [frame([190, 10], [190, G], 9), dot([186, 22], 5, 'art-pulley'), ['line', { x1: 186, y1: 22, x2: p.ha[0], y2: p.ha[1], class: 'art-band', 'stroke-width': 4 }]], front: [] }),
  },

  'chest-supported-row': {
    poses: [{ hip: [76, 124], lean: 36, hand: [136, 130], foot: [108, 160], arm: 1 }, { hip: [76, 124], lean: 36, hand: [106, 118], foot: [108, 160], arm: -1 }],
    arrow: [[150, 150], [122, 150]],
    draw: p => ({
      back: [floorBar(44, 200), ...seat(58, 92, 138, 72), frame([186, 44], [186, G - 2], 8), frame([186, 58], along(p, 0.75, -20), 5), pad(along(p, 0.3, -15), along(p, 1.02, -15), 10)],
      front: [lever([186, 58], p.ha, 6), dot([186, 58], 6, 'art-pulley'), grip(add(p.ha, [0, -7]), add(p.ha, [0, 7]))],
    }),
  },
  'cable-row': {
    poses: [{ hip: [66, 134], lean: 14, hand: [122, 112], foot: [136, 132] }, { hip: [66, 134], lean: -6, hand: [88, 110], foot: [136, 132] }],
    arrow: [[132, 72], [102, 72]],
    draw: (p, t) => {
      const s = stack(174, t);
      return { back: [floorBar(30, 204), ...seat(44, 92, 147, 66), frame([92, 156], [152, 156], 6), frame([148, G - 2], [148, 124], 7), ...s.parts, pulley([164, 118]), cable(p.ha, [164, 118], [170, 30], [187, 30], s.lid)], front: [grip(add(p.ha, [0, -7]), add(p.ha, [0, 7]))] };
    },
  },
  'db-row': {
    poses: [
      { hip: [82, 104], lean: 78, hand: [128, 138], foot: [52, 160], hand2: [150, 112], arm2: 1, foot2: [58, 113], leg2: 1, arm: 1, toe2: 180 },
      { hip: [82, 104], lean: 78, hand: [104, 108], foot: [52, 160], hand2: [150, 112], arm2: 1, foot2: [58, 113], leg2: 1, arm: 1, toe2: 180 },
    ],
    arrow: [[160, 150], [160, 116]],
    draw: () => ({ back: bench(62, 180, 124), front: [] }),
    extra: p => dumbbell(add(p.ha, [0, 3]), 0, 18),
  },

  'lying-curl': {
    poses: [{ hip: [106, 100], lean: 90, hand: [176, 124], foot: [40, 101], toe: 110, leg: 1, arm: 1, flip: false }, { hip: [106, 100], lean: 90, hand: [176, 124], foot: [64, 66], toe: 210, leg: 1, arm: 1, flip: false }],
    arrow: [[32, 84], [44, 54]],
    draw: p => {
      const roller = add(p.an, shinBack(p), -10);
      const cam = [72, 112];
      return {
        back: [floorBar(30, 196), frame([60, 118], [60, G - 2], 7), frame([166, 118], [166, G - 2], 7), pad([58, 113], [188, 113], 12), frame([170, 126], [188, 126], 6)],
        front: [lever(cam, roller, 6), dot(roller, 8, 'art-pad-fill'), dot(cam, 6, 'art-pulley'), grip(add(p.ha, [-5, 0]), add(p.ha, [5, 0]))],
      };
    },
  },
  'romanian-deadlift': {
    poses: [{ hip: [100, 94], lean: 4, hand: [108, 139], foot: [108, 160], arm: -1 }, { hip: [76, 100], lean: 68, hand: [120, 134], foot: [106, 160], arm: -1 }],
    arrow: [[46, 80], [46, 108]],
    draw: () => ({ back: [], front: [] }),
    extra: p => dumbbell(add(p.ha, [0, 3]), 0, 18),
  },
  'glute-bridge': {
    poses: [{ hip: [106, 151], sh: [62, 156], head: [44, 156], hand: [106, 160], foot: [146, 158] }, { hip: [100, 122], sh: [60, 150], head: [42, 156], hand: [104, 160], foot: [146, 158] }],
    arrow: [[160, 118], [160, 88]],
    draw: () => ({ back: [pad([24, 165], [190, 165], 6)], front: [] }),
  },
};

/* ---------- Turning a scene into a picture ---------- */

function build([tag, attrs]) { return svgEl(tag, attrs); }

function panel(scene, phase, { x = 0, label, showArrow }) {
  const g = svgEl('g', { transform: `translate(${x} 0)` });
  const p = solve(scene.poses[phase]);
  const { back, front } = scene.draw(p, phase);
  const items = [box(0, 0, 240, 180, 'art-bg', 12), ln([8, G], [232, G], 'art-floor', 1.5), ...back, ...figure(p), ...front, ...arm(p), ...(scene.extra ? scene.extra(p) : [])];
  g.append(...items.map(build));
  if (showArrow && scene.arrow) {
    const [a, b] = scene.arrow;
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const wing = d => add(b, [Math.cos(angle + d), Math.sin(angle + d)], -9);
    g.append(svgEl('polyline', { points: `${wing(0.55).join(',')} ${b.join(',')} ${wing(-0.55).join(',')}`, class: 'art-arrow' }), svgEl('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'art-arrow' }));
  }
  if (label) {
    const text = svgEl('text', { x: 12, y: 20, class: 'art-label' });
    text.textContent = label;
    g.append(text);
  }
  return g;
}

export const hasArt = id => Boolean(SCENES[id]);

/** A drawing of an exercise, or null if there isn't one (exercises people create themselves). */
export function exerciseArt(id, { thumb = false, name = '' } = {}) {
  const scene = SCENES[id];
  if (!scene) return null;
  if (thumb) {
    const svg = svgEl('svg', { viewBox: '0 0 240 180', class: 'art art-thumb-img', 'aria-hidden': 'true' });
    svg.append(panel(scene, scene.hold ? 0 : 1, {}));
    return svg;
  }
  const svg = svgEl('svg', { viewBox: scene.hold ? '0 0 240 180' : '0 0 490 180', class: `art art-full${scene.hold ? ' art-single' : ''}`, role: 'img', 'aria-label': scene.hold ? `${name}: position to hold` : `${name}: start and finish positions` });
  if (scene.hold) svg.append(panel(scene, 0, { label: 'Hold' }));
  else svg.append(panel(scene, 0, { label: 'Start', showArrow: true }), panel(scene, 1, { x: 250, label: 'Finish' }));
  return svg;
}
