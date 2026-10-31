'use strict';

// Muted slate night, white line-art, soft pink accents.
const C = { bg: '#2b3047', deep: '#1f2333', line: '#e9ecf5', dim: '#59607f', dot: '#6f79a3', soft: '#8f99c4', pink: '#e98aa3', sil: '#1c2030', sun: '#ffe08a' };

// Systems in unlock order. Each has 3 upgrades (max Lv 50):
// [0] +1 crew, [1] +25% output per level, [2] x1.08 output per level (compounding).
const SYS = [
  { id: 'laser', name: 'Laser Station', unlock: 100, base: 3, shot: 'beam', unit: 'gunner',
    ups: [['Recruit Gunner', '+1 gunner'], ['Stabilized Optics', '+25% damage'], ['Overcharged Capacitors', 'x1.08 laser output']],
    desc: 'Blasts the crust to release trapped gases.', fact: 'In 2013 NASA beamed data from Moon orbit to Earth by laser at 622 megabits per second.' },
  { id: 'solar', name: 'Solar Mirror', unlock: 1200, base: 20, shot: 'light', unit: 'mirror',
    ups: [['Add Mirror', '+1 mirror'], ['Polished Glass', '+25% heat'], ['Focusing Lens', 'x1.08 solar output']],
    desc: 'Focuses sunlight to warm the frozen ground.', fact: 'Mars averages −60 °C. Giant orbital mirrors are a real proposal for warming it up.' },
  { id: 'drone', name: 'Drone Hive', unlock: 1.5e4, base: 140, shot: 'drone', unit: 'drone',
    ups: [['Build Drone', '+1 drone'], ['Seed Payload', '+25% seeds'], ['Swarm AI', 'x1.08 hive output']],
    desc: 'Drones scatter hardy microbes across the surface.', fact: 'A single seed-planting drone can drop tens of thousands of seed pods in a day.' },
  { id: 'rocket', name: 'Comet Launcher', unlock: 2e5, base: 1000, shot: 'rocket', unit: 'pilot',
    ups: [['Hire Pilot', '+1 pilot'], ['Bigger Ice Payload', '+25% water'], ['Fusion Boosters', 'x1.08 launcher output']],
    desc: 'Hurls comet ice at the planet to fill its oceans.', fact: 'Some of Earth’s water may have been delivered by icy comets and asteroids.' },
  { id: 'bio', name: 'Bio Seeder', unlock: 2.5e6, base: 7000, shot: 'pod', unit: 'technician',
    ups: [['Lab Technician', '+1 technician'], ['Hardy Strains', '+25% growth'], ['Spore Clouds', 'x1.08 seeder output']],
    desc: 'Fires pods of engineered plants into the soil.', fact: 'Some lichens survived 34 days in a lab chamber simulating the surface of Mars.' },
  { id: 'core', name: 'Terra Core', unlock: 1.5e7, base: 40000, shot: 'pulse', unit: 'engineer',
    ups: [['Engineer', '+1 engineer'], ['Plasma Containment', '+25% power'], ['Chain Reaction', 'x1.08 core output']],
    desc: 'Pulses raw energy through the whole planet.', fact: 'Fusion powers the Sun: it turns 4 million tonnes of matter into energy every second.' },
];
const MAXL = 50, UPM = [[.25, 1.17], [.8, 1.2], [2.5, 1.25]]; // upgrade k costs unlock * UPM[k][0] * UPM[k][1]^level
const GOAL = 5e8; // total life earned for a fully terraformed planet (a sim player takes ~10 min)

const ucost = (s, k, l) => Math.ceil(SYS[s].unlock * UPM[k][0] * UPM[k][1] ** l);
const sysRate = (s, L) => SYS[s].base * (1 + L[0]) * (1 + .25 * L[1]) * 1.08 ** L[2];
const tapOf = rate => Math.max(4, Math.round(rate * .15));
// Log scale so the planet heals steadily while income grows exponentially; /1000 keeps the first taps from jumping to 25%.
const healOf = earned => Math.min(1, Math.log10(1 + earned / 1000) / Math.log10(1 + GOAL / 1000));
console.assert(ucost(0, 0, 0) === 25 && ucost(0, 0, 1) === 30 && ucost(0, 2, 0) === 250, 'upgrade cost');
console.assert(sysRate(0, [0, 0, 0]) === 3 && sysRate(0, [1, 4, 0]) === 12, 'system rate');
console.assert(healOf(0) === 0 && healOf(GOAL) === 1 && healOf(GOAL * 9) === 1, 'heal');

const fmt = n => {
  if (n < 1000) return n < 10 ? String(Math.floor(n * 10) / 10) : String(Math.floor(n));
  let k = -1;
  while (n >= 999.5 && k < 3) { n /= 1000; k++; } // 999.5 not 1000: values that round up move to the next unit
  return n.toFixed(n < 9.995 ? 2 : n < 99.95 ? 1 : 0) + 'kmbt'[k];
};
console.assert(fmt(999999) === '1.00m' && fmt(9999) === '10.0k' && fmt(1500) === '1.50k' && fmt(12.7) === '12', 'fmt rounding');

const S = { life: 0, earned: 0, taps: 0, goal: 0, world: 0, start: 0, on: SYS.map(() => false), L: SYS.map(() => [0, 0, 0]) };
const boost = () => 2 ** S.world; // every world you finish doubles all output for good
const rateOf = () => SYS.reduce((a, _, s) => a + (S.on[s] ? sysRate(s, S.L[s]) : 0), 0) * boost();
const unlocked = s => s === 0 || S.on[s - 1];
const items = []; // life patches on the planet: { u, v (texture coords), born }
const pct = () => Math.floor(healOf(S.earned) * 100);

// Always one clear next step at the top, with a reward: [text, progress, target, reward].
const GOALS = [
  ['Tap the planet 10 times', () => S.taps, 10, 50],
  ['Unlock the Laser Station', () => +S.on[0], 1, 50],
  ['Recruit 5 gunners', () => S.L[0][0], 5, 200],
  ['Unlock the Solar Mirror', () => +S.on[1], 1, 500],
  ['Stabilized Optics to Lv 5', () => S.L[0][1], 5, 1000],
  ['Terraform 25%', pct, 25, 3000],
  ['Unlock the Drone Hive', () => +S.on[2], 1, 6000],
  ['Get any upgrade to Lv 20', () => Math.max(...S.L.flat()), 20, 2e4],
  ['Unlock the Comet Launcher', () => +S.on[3], 1, 5e4],
  ['Terraform 50%', pct, 50, 1e5],
  ['Unlock the Bio Seeder', () => +S.on[4], 1, 1e6],
  ['Terraform 75%', pct, 75, 3e6],
  ['Unlock the Terra Core', () => +S.on[5], 1, 2e7],
  ['Terraform 100%', pct, 100, 0],
].map(([text, get, need, reward]) => ({ text, get, need, reward }));

// Worlds in warp order. Each heals from `dead` tones into its own alien palette; dg/ag = dead/alive atmosphere glow.
const WORLDS = [
  { name: 'ARES', sea: ['#1b6f78', '#23909a'], coast: '#e8c46a', land: ['#7b4bc4', '#b07cf0'], caps: '#f2e9ff',
    dead: [[74, 32, 34], [112, 46, 38], [158, 72, 46], [206, 120, 74]], crater: '#4a2022', dg: [233, 138, 163], ag: [154, 166, 224],
    fact: 'Some scientists think early life on Earth was purple, using a pigment called retinal instead of chlorophyll.' },
  { name: 'CRIMSON', sea: ['#4a0d26', '#6e1636'], coast: '#ffb36b', land: ['#d6204f', '#ff5c7a'], caps: '#ffe0e6',
    dead: [[40, 38, 44], [66, 62, 70], [98, 92, 98], [140, 132, 136]], crater: '#24222a', dg: [160, 150, 170], ag: [255, 110, 140],
    fact: 'Plants on worlds around dim red stars might grow red or even black to soak up every bit of light.' },
  { name: 'KRYPTONITE', sea: ['#0b3d2a', '#0f5c3a'], coast: '#d8ff6b', land: ['#39ff6a', '#a6ff3d'], caps: '#eaffd8',
    dead: [[18, 16, 28], [34, 28, 48], [56, 44, 74], [88, 70, 110]], crater: '#0c0a14', dg: [140, 110, 190], ag: [120, 240, 150],
    fact: 'PSR J1719-1438 b may be a planet-sized crystal of carbon: a diamond world circling a dead star.' },
  { name: 'GLASS STORM', sea: ['#0c2a7a', '#1440a8'], coast: '#bff4ff', land: ['#3fd0ff', '#9ef0ff'], caps: '#ffffff',
    dead: [[24, 30, 46], [40, 50, 72], [64, 78, 104], [100, 116, 140]], crater: '#141a2a', dg: [130, 145, 180], ag: [110, 190, 255],
    fact: 'On HD 189733 b it rains glass, blown sideways by winds of about 8,700 km/h.' },
  { name: 'INFERNO', sea: ['#5a1a6a', '#7a2a8a'], coast: '#ffd166', land: ['#ff9f1c', '#e8a33c'], caps: '#fff1c9', // only coast + caps are bright enough to become lava when dead
    dead: [[16, 12, 14], [34, 24, 24], [60, 30, 24], [255, 110, 30]], crater: '#000000', dg: [255, 120, 60], ag: [255, 200, 110],
    fact: '55 Cancri e is so close to its star that its dayside may be one huge ocean of lava.' },
];
const world = () => WORLDS[S.world % WORLDS.length];

// Milestones: something new joins the planet.
const STAGES = [
  { at: .25, text: 'MOON CAPTURED. Mars’ own moons, Phobos and Deimos, are probably captured asteroids.' },
  { at: .5, text: 'CLOUD LAYER FORMED. Earth bounces about 30% of incoming sunlight back to space, much of it off clouds.' },
  { at: .75, text: 'RINGS FORMED. Saturn’s rings are billions of ice chunks, some as big as houses.' },
];

// ---------- pixel drawing (every shape lands on whole pixels, so nothing is anti-aliased) ----------
const mk = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
function pen(g) {
  const p = {
    fill(x, y, w, h, col = C.bg) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
    dot(x, y, col = C.line) { p.fill(x, y, 1, 1, col); },
    // filled box with a 1px white outline (bottom edge optional, so buildings sit on the ground line)
    box(x, y, w, h, fill = C.bg, bottom = true) {
      p.fill(x, y, w, h, fill);
      p.fill(x, y, w, 1, C.line); p.fill(x, y, 1, h, C.line); p.fill(x + w - 1, y, 1, h, C.line);
      if (bottom) p.fill(x, y + h - 1, w, 1, C.line);
    },
    line(x0, y0, x1, y1, col = C.line) { // Bresenham
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      g.fillStyle = col;
      for (let e = dx + dy; ; ) {
        g.fillRect(x0, y0, 1, 1);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * e;
        if (e2 >= dy) { e += dy; x0 += sx; }
        if (e2 <= dx) { e += dx; y0 += sy; }
      }
    },
    // filled circle with outline; top = only the upper half (domes)
    disc(cx, cy, r, fill = C.bg, top = false) {
      for (let dy = -r; dy <= (top ? 0 : r); dy++) { const dx = Math.round(Math.sqrt(r * r - dy * dy)); p.fill(cx - dx, cy + dy, dx * 2 + 1, 1, fill); }
      g.fillStyle = C.line;
      for (let x = r, y = 0, err = 1 - r; x >= y; ) { // midpoint circle outline
        for (const [a, b] of [[x, y], [y, x], [-x, y], [-y, x], [x, -y], [y, -x], [-x, -y], [-y, -x]]) if (!top || b <= 0) g.fillRect(cx + a, cy + b, 1, 1);
        y++;
        if (err < 0) err += 2 * y + 1; else { x--; err += 2 * (y - x) + 1; }
      }
    },
    ring(cx, cy, rx, ry, from = 0, to = 2 * Math.PI, col = C.line) { // pixel ellipse arc
      g.fillStyle = col;
      const n = Math.ceil((rx + ry) * 3);
      for (let i = 0; i <= n; i++) { const a = from + (to - from) * i / n; g.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1); }
    },
    poly(pts, fill = C.bg) { // filled polygon with a 1px outline (art() snaps the fill's soft edges back to whole pixels)
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
      g.fillStyle = fill; g.fill();
      pts.forEach((a, i) => p.line(...a, ...pts[(i + 1) % pts.length]));
    },
    // the same shapes in a rotated, scaled local frame: origin (ox, oy), angle a, scale k (lines stay 1px)
    rot(ox, oy, a, k = 1) {
      const c = Math.cos(a) * k, s = Math.sin(a) * k, T = (x, y) => [ox + x * c - y * s, oy + x * s + y * c];
      return {
        T,
        poly: (pts, fill) => p.poly(pts.map(q => T(...q)), fill),
        rect(x, y, w, h, fill) { this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill); },
        seg: (x0, y0, x1, y1, col) => p.line(...T(x0, y0), ...T(x1, y1), col),
        dot: (x, y, col) => p.dot(...T(x, y), col),
      };
    },
  };
  return p;
}
function art(w, h, paint) {
  const c = mk(w, h), g = c.getContext('2d', { willReadFrequently: true }); // read back by shadow() and grit()
  paint(pen(g));
  const im = g.getImageData(0, 0, w, h);
  for (let i = 3; i < im.data.length; i += 4) im.data[i] = im.data[i] < 128 ? 0 : 255; // no half-transparent edge pixels
  g.putImageData(im, 0, 0);
  return c;
}
const B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]; // Bayer matrix for ordered dithering
const hash = (x, y, s = 0) => { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s + 1, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// Locked look derived from the lit sprite: noisy dark fill, dim outline (dotted when not yet unlockable).
function shadow(src, dotted) {
  const w = src.width, h = src.height, d = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data, c = mk(w, h), g = c.getContext('2d');
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!on(x, y)) continue;
    const edge = !on(x + 1, y) || !on(x - 1, y) || !on(x, y + 1) || !on(x, y - 1);
    g.fillStyle = edge && !(dotted && (x + y) % 2) ? C.dim : hash(x, y, 7) < .3 ? '#171a27' : C.sil;
    g.fillRect(x, y, 1, 1);
  }
  return c;
}
// Re-shade clean line-art into the planet's gritty look: dithered light (light(x, y) = 1 bright .. 0 dark),
// darker lower/right edges and pixel noise. Edits the canvas in place.
function grit(src, seed, light) {
  const w = src.width, h = src.height, g = src.getContext('2d', { willReadFrequently: true }), im = g.getImageData(0, 0, w, h), d = im.data;
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  const hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  const T = { lineL: hex('#dfe3f0'), lineM: hex('#aab2d0'), lineD: hex('#6d769c'), detA: hex('#525a7a'), detB: hex('#646c8e'),
    fillL: hex('#454c6c'), fillM: hex('#343a56'), fillD: hex('#262a40'), fillX: hex('#1b1e2e'), pinkL: hex('#f0a3b7'), pinkD: hex('#a8566f') };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (!d[i + 3]) continue;
    const r = d[i], gg = d[i + 1], b = d[i + 2], n = hash(x, y, seed), th = B4[y & 3][x & 3] / 16, L = light(x, y, w, h);
    const v = L + (n - .5) * .5; // light with per-pixel noise
    const blot = hash(x >> 2, y >> 2, seed + 1) * .55 + hash(x >> 1, y >> 1, seed + 2) * .3; // low-frequency mottling, like the planet
    const f = L * .75 + blot - .45 + (n - .5) * .25;
    const col = r > 200 && gg < 170 ? (v > th ? T.pinkL : T.pinkD) // pink accents
      : r + gg + b > 600 ? (!on(x + 1, y) || !on(x, y + 1) ? (v > .75 ? T.lineM : T.lineD) // lit edges: bright toward the sun, dim on the shadow side
        : v > th + .15 ? T.lineL : v > th - .3 ? T.lineM : T.lineD)
      : b > 110 && r + gg + b > 280 ? (n < .5 ? T.detA : T.detB) // dim detail lines
      : f > th + .3 ? T.fillL : f > th - .1 ? T.fillM : f > th - .45 ? T.fillD : T.fillX; // mottled, dithered fill
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
  }
  g.putImageData(im, 0, 0);
  return src;
}
const diagLight = (x, y, w, h) => 1 - (x / w + y / h) / 2; // sun from the top-left

// Hand-drawn line-art for the six systems (native resolution, 1px lines).
// Where shots leave each sprite, relative to its centre (default: the centre).
const MUZZLE = { laser: [-30, 16] }; // laser: the needle tip (local (-25, 0) rotated and scaled)
const ART = {
  // long drill-cannon angled down-left at the planet: slot panel, vent ribs, rear cap, tapered nose, needle nozzle, battery packs
  laser: art(64, 42, p => {
    const r = p.rot(32, 21, -.5, 1.35); // local +x points up-right (toward the rear), -x toward the planet
    r.rect(-6, 7, 8, 4); r.rect(5, 7, 8, 4); // battery packs under the body
    for (const x of [-3, 0, 8, 11]) r.seg(x, 8, x, 10, C.dim);
    r.seg(-2, 6, -2, 7); r.seg(9, 6, 9, 7);
    r.poly([[-8, -5], [-14, -3], [-14, 3], [-8, 5]]); // tapered front
    r.rect(-8, -6, 24, 12); // main body
    r.rect(16, -7, 3, 14); // rear cap
    r.rect(-5, -3, 18, 6); for (const x of [-3, 2, 7]) r.rect(x, -1, 3, 2, C.pink); // slot panel
    for (let x = -4; x < 14; x += 4) r.seg(x, -6, x + 2, -4); // vent ribs
    r.rect(-13, -2, 3, 4); // nose panel
    r.seg(-14, -1, -23, -1); r.seg(-14, 1, -23, 1); r.seg(-18, -2, -18, 2); // needle nozzle
    r.dot(-24, 0, C.pink); r.dot(-25, 0, C.pink);
  }),
  // satellite: monitor head with a little face, brick-grid panels, striped body, dangling cables
  solar: art(56, 32, p => {
    for (const x0 of [0, 41]) {
      p.box(x0, 3, 15, 8); p.line(x0 + 1, 7, x0 + 13, 7);
      for (let k = 3; k < 14; k += 3) p.line(x0 + k, 4, x0 + k, 6);
      for (let k = 2; k < 14; k += 3) p.line(x0 + k, 8, x0 + k, 9);
    }
    p.line(15, 6, 22, 6); p.line(34, 6, 40, 6); // arms
    p.box(22, 0, 12, 10); p.box(24, 2, 8, 6); p.dot(26, 4, C.pink); p.dot(29, 4, C.pink); p.line(26, 6, 29, 6, C.dim); // monitor head
    p.box(23, 9, 10, 14); for (let x = 25; x < 32; x += 2) p.line(x, 10, x, 21, C.dim); // striped body
    [4, 7, 3, 8, 5].forEach((len, k) => p.line(24 + k * 2, 23, 24 + k * 2, 23 + len)); // dangling cables
  }),
  // drone rig: perforated hover slab, braced machine with a gear, debris flying off
  drone: art(44, 34, p => {
    const sy = 24, sh = 9;
    for (let k = 0; k < sh; k++) { // rounded slab
      const inset = k === 0 || k === sh - 1 ? 2 : k === 1 || k === sh - 2 ? 1 : 0;
      p.fill(1 + inset, sy + k, 42 - 2 * inset, 1, C.bg); p.dot(1 + inset, sy + k); p.dot(42 - inset, sy + k);
    }
    p.fill(3, sy, 38, 1, C.line); p.fill(3, sy + sh - 1, 38, 1, C.line);
    for (const [hx, hy, hr] of [[7, 28, 2], [13, 30, 1], [19, 27, 2], [26, 30, 1], [32, 28, 2], [38, 30, 1]]) p.disc(hx, hy, hr);
    p.line(12, 22, 12, 23); p.line(24, 22, 24, 23); // struts
    p.box(9, 8, 17, 15); p.line(10, 9, 24, 21, C.dim); p.line(24, 9, 10, 21, C.dim); // braced frame
    p.box(13, 12, 9, 7); p.fill(15, 14, 5, 3, C.pink); // core
    p.box(12, 3, 6, 6); p.line(15, 0, 15, 2); // vent stack
    p.disc(32, 14, 5); p.disc(32, 14, 2);
    for (let i = 0; i < 16; i += 2) { const a = i / 16 * 2 * Math.PI; p.dot(32 + Math.cos(a) * 7, 14 + Math.sin(a) * 7); } // dotted gear rim
    p.fill(39, 5, 2, 2, C.line); p.fill(42, 9, 2, 2, C.line); p.dot(38, 1); p.dot(43, 3); p.dot(40, 12); // debris
  }),
  rocket: art(30, 36, p => {
    p.box(2, 4, 6, 26); for (let y = 6; y < 26; y += 5) { p.line(3, y, 6, y + 4); p.line(6, y, 3, y + 4); } // braced gantry
    p.line(8, 10, 12, 10); p.line(8, 19, 12, 19); // arms
    for (let y = 2; y <= 8; y++) { const hw = (y - 2) >> 1; p.fill(16 - hw, y, hw * 2 + 1, 1); } // nose fill
    p.line(16, 2, 13, 8); p.line(16, 2, 19, 8); // nose
    p.fill(14, 8, 5, 18); p.line(13, 8, 13, 25); p.line(19, 8, 19, 25); p.line(13, 25, 19, 25); // body
    p.disc(16, 13, 2, C.pink); p.line(14, 19, 18, 19, C.dim);
    p.line(13, 20, 10, 25); p.line(19, 20, 22, 25); p.line(10, 25, 13, 25); p.line(19, 25, 22, 25); // fins
    p.fill(15, 26, 3, 2, C.pink); // exhaust glow
    p.box(0, 29, 30, 7); p.line(3, 32, 26, 32, C.dim); // launch pad
  }),
  bio: art(32, 26, p => {
    p.disc(16, 17, 13, C.bg, true); // greenhouse dome
    for (const x of [9, 16, 23]) p.line(x, 17 - Math.round(Math.sqrt(169 - (x - 16) ** 2)) + 1, x, 16, C.dim); // ribs
    for (const x of [12, 20]) { p.line(x, 16, x, 12, C.pink); p.dot(x - 1, 13, C.pink); p.dot(x + 1, 14, C.pink); } // sprouts
    p.box(1, 17, 30, 9); p.box(4, 19, 4, 4); p.box(24, 19, 4, 4); p.fill(11, 20, 10, 2, C.pink); // base
  }),
  core: art(32, 30, p => {
    p.line(10, 21, 7, 26); p.line(22, 21, 25, 26); // legs
    p.box(4, 25, 24, 5); p.line(7, 27, 24, 27, C.dim); // base
    p.disc(16, 12, 10); p.disc(16, 12, 4, C.pink); // reactor sphere + core
    p.ring(16, 12, 15, 3, 0, Math.PI); // orbit ring, front half
    p.ring(16, 12, 15, 3, Math.PI, 2 * Math.PI, C.dim);
  }),
};
const LOOK = SYS.map((s, i) => ({ next: shadow(ART[s.id], false), sil: shadow(ART[s.id], true), lit: grit(ART[s.id], i, diagLight) }));

// Small sprites drawn as-is: w = line, n = fill, p = pink.
function tiny(rows) {
  const c = mk(rows[0].length, rows.length), g = c.getContext('2d'), col = { w: C.line, n: C.bg, p: C.pink };
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (col[ch]) { g.fillStyle = col[ch]; g.fillRect(x, y, 1, 1); } }));
  return c;
}
const T = {
  bot: tiny(['www', 'wnw', 'www', 'w.w']),
  drone: tiny(['w...w', '.www.', '.wnw.', '.www.']),
  missile: tiny(['.w.', 'www', 'wnw', 'www', 'p.p']),
  hand: tiny(['...ww....', '..wnw....', '..wnw....', '..wnwww..', '..wnwnwww', 'wwwnwnwnw', 'wnnnnnnnw', '.wnnnnnw.', '..wwwww..']),
  energy: tiny(['..www..', '.wwwww.', 'wwwnwww', 'wwnnnww', 'wwwnwww', '.wwwww.', '..www..']),
};
const ICON = `<img class="ico" src="${T.energy.toDataURL()}" alt="life">`;
const tileSrc = LOOK.map(l => ({ lit: l.lit.toDataURL(), sil: l.sil.toDataURL(), next: l.next.toDataURL() }));

// 3x5 pixel font for numbers on the canvas (smooth canvas text would blur when scaled).
const GLYPH = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111',
  '.': '000000000000010', '/': '001001010100100', '+': '000010111010000', k: '100101110101101', m: '000111111101101', b: '100100111101111', t: '010111010010011' };

// ---------- planet textures ----------
const TW = 256, TH = 128; // planet surface as a 2:1 wrap-around map

function makeLush(w, seed) {
  const c = mk(TW, TH), g = c.getContext('2d');
  const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const blob = (x, y, r) => { for (const dx of [-TW, 0, TW]) { g.beginPath(); g.arc(x + dx, y, r, 0, 7); g.fill(); } };
  g.fillStyle = w.sea[0]; g.fillRect(0, 0, TW, TH);
  g.fillStyle = w.sea[1]; for (let j = 0; j < 30; j++) blob(rnd() * TW, rnd() * TH, 6 + rnd() * 14);
  for (let k = 0; k < 10; k++) {
    const x = rnd() * TW, y = 20 + rnd() * (TH - 40), s0 = seed;
    g.fillStyle = w.coast; // coast, then the same blobs again smaller as land
    for (let j = 0; j < 9; j++) blob(x + (rnd() - .5) * 50, y + (rnd() - .5) * 30, 6 + rnd() * 9);
    seed = s0;
    for (let j = 0; j < 9; j++) { g.fillStyle = w.land[j % 3 ? 0 : 1]; blob(x + (rnd() - .5) * 50, y + (rnd() - .5) * 30, 4 + rnd() * 8); }
  }
  g.fillStyle = w.caps; g.fillRect(0, 0, TW, 7); g.fillRect(0, TH - 6, TW, 6); // polar caps
  for (let j = 0; j < 50; j++) blob(rnd() * TW, j % 2 ? 7 : TH - 6, 2 + rnd() * 4);
  return c;
}

// Dead copy of the lush map, posterised into the world's 4 dead tones.
function makeDead(src, w) {
  const c = mk(TW, TH), g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  const d = g.getImageData(0, 0, TW, TH), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    const t = w.dead[Math.min(3, Math.floor((a[i] * .3 + a[i + 1] * .59 + a[i + 2] * .11) / 64))];
    a[i] = t[0]; a[i + 1] = t[1]; a[i + 2] = t[2];
  }
  g.putImageData(d, 0, 0);
  g.fillStyle = w.crater;
  for (let j = 0; j < 40; j++) { const x = (j * 97) % TW, y = 12 + (j * 53) % (TH - 24); g.fillRect(x, y, 3, 2); g.fillRect(x + 1, y - 1, 1, 1); }
  return c;
}

function makeClouds() {
  const c = mk(TW, TH), g = c.getContext('2d');
  let seed = 5;
  const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  g.fillStyle = 'rgba(240,244,255,.55)';
  for (let k = 0; k < 14; k++) {
    const x = rnd() * TW, y = 14 + rnd() * (TH - 28);
    for (let j = 0; j < 5; j++) for (const dx of [-TW, 0, TW]) { g.beginPath(); g.ellipse(x + dx + j * 6, y + (rnd() - .5) * 4, 6 + rnd() * 5, 3 + rnd() * 2, 0, 0, 7); g.fill(); }
  }
  return c;
}

let lush, dead;
const mask = mk(TW, TH), comp = mk(TW, TH), clouds = makeClouds();
function buildWorld() { lush = makeLush(world(), 11 + S.world * 7); dead = makeDead(lush, world()); }
buildWorld();

function compose(t, heal) {
  const m = mask.getContext('2d');
  m.globalCompositeOperation = 'source-over';
  m.clearRect(0, 0, TW, TH);
  if (heal >= 1) m.fillRect(0, 0, TW, TH);
  else for (const it of items.slice(-150)) { // newest patches: every purchase keeps showing up
    const r = (9 + 34 * heal * heal) * Math.min(1, (t - it.born) / 1.5);
    for (const dx of [-TW, 0, TW]) { m.beginPath(); m.arc(it.u + dx, it.v, r, 0, 7); m.fill(); }
  }
  m.globalCompositeOperation = 'source-in';
  m.drawImage(lush, 0, 0);
  const c = comp.getContext('2d');
  c.drawImage(dead, 0, 0);
  c.drawImage(mask, 0, 0);
}

// ---------- layout ----------
// The scene is drawn 1:1 into a low-res buffer, then scaled onto the screen with nearest-neighbour, so it stays sharp at any zoom.
const $ = id => document.getElementById(id);
const cv = $('c'), out = cv.getContext('2d'), panel = $('panel'), buf = mk(1, 1), ctx = buf.getContext('2d'), P = pen(ctx);
// Systems sit on one ring just outside the atmosphere, evenly spaced across the upper half (angle in degrees,
// 0 = right, -90 = straight up). The comet launcher stands on the colony ground instead, at x planet radii from centre.
const ORBIT = 1.32;
const SLOT = [
  { a: -55 },                // laser: upper right, aimed down at the planet
  { a: -90 },                // solar mirror: straight above
  { a: -125 },               // drone rig: upper left
  { x: 1.2, ground: true },  // comet launcher: pad in the city, right
  { a: -165, island: true }, // bio seeder: floating island, left
  { a: -15, island: true },  // terra core: floating island, right
];
for (const sl of SLOT) if (!sl.ground) { const r = sl.a * Math.PI / 180; sl.x = Math.cos(r) * ORBIT; sl.y = Math.sin(r) * ORBIT; }
const ISLE = 17; // rock hanging under the island systems
const HIT = 20; // touch radius in scene pixels (40+ CSS px), a bit larger than the sprites
let K, PX, W, H, R0, R, CX, CY, GY, TOP, SIDE, FY = 1, city = [], hq, cityCv, grainCv, layoutH = 0;
const hudH = () => $('top').offsetHeight + $('side').offsetHeight; // the layout depends on these heights
function resize() {
  if (!innerWidth || !innerHeight) return; // hidden iframe / minimised: nothing to lay out (0-size canvases would throw)
  // about 320 art pixels across the short side, each a whole number (K) of device pixels; PX = CSS pixels per art pixel
  const dpr = devicePixelRatio || 1;
  K = Math.max(1, Math.round(Math.min(innerWidth, innerHeight) * dpr / 320));
  PX = K / dpr;
  W = Math.ceil(innerWidth / PX); H = Math.ceil(innerHeight / PX);
  cv.width = W * K; cv.height = H * K; buf.width = W; buf.height = H;
  ctx.imageSmoothingEnabled = false; // resizing a canvas resets its context; stretched planet columns must stay crisp
  layoutH = hudH();
  cv.style.width = W * PX + 'px'; cv.style.height = H * PX + 'px';
  layout();
  R = R0;
  // self-check: every system on screen, below the HUD, out of the stat boxes, and no two overlapping
  const box = s => { const [x, y] = sysPos(s, 0), w = Math.max(LOOK[s].lit.width, SLOT[s].island ? 36 : 0), h = LOOK[s].lit.height; return [x - w / 2, y - h / 2, x + w / 2, y + h / 2 + (SLOT[s].island ? ISLE : 0)]; };
  const bs = SYS.map((_, s) => box(s));
  console.assert(bs.every(([l, t, r, b]) => l >= 0 && r <= W && t - 8 >= TOP && b <= GY + 1 && !(l < SIDE.r && t < SIDE.b)), 'system off screen or under the HUD', bs);
  console.assert(bs.every((a, i) => bs.every((b, j) => i === j || a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1])), 'systems overlap', bs);
}
// Planet sits low behind the colony skyline; the systems hang around it.
function layout() {
  const top = $('top').getBoundingClientRect().bottom / PX, bar = $('bar').offsetHeight / PX;
  $('side').style.top = $('toast').style.top = top * PX + 12 + 'px';
  const sr = $('side').getBoundingClientRect();
  TOP = top + 4; SIDE = { r: sr.right / PX, b: sr.bottom / PX };
  GY = Math.round(H - bar - 14); // colony ground line
  // planet as big as fits: the ring's side systems (cos 15° x ORBIT) plus a sprite half-width across,
  // the top system (ORBIT + sprite + label) above a centre that sits .45R over the ground
  R0 = Math.max(10, Math.min(W * .42, (W / 2 - 19) / (ORBIT * .97), (GY - TOP - 28) / (ORBIT + .45)));
  CX = Math.round(W / 2); CY = Math.round(GY - R0 * .45);
  FY = Math.max(1, Math.min(1.15, (CY - TOP - 30) / (ORBIT * R0))); // tall screens: a slight upward stretch, still hugging the planet
  // skyline: a mix of building types, leaving open ground around the ground systems and the HQ
  const clear = SYS.map((_, s) => SLOT[s].ground ? [CX + SLOT[s].x * R0 - LOOK[s].lit.width / 2 - 3, CX + SLOT[s].x * R0 + LOOK[s].lit.width / 2 + 3] : null).filter(Boolean);
  hq = { x: CX - 24, w: 48, h: 26 };
  clear.push([hq.x - 2, hq.x + hq.w + 2]);
  const kinds = ['office', 'tower', 'band', 'dome', 'office', 'needle', 'band', 'tower'];
  city = [];
  for (let x = -2, n = 0; x < W; n++) {
    const type = kinds[n % kinds.length], w = type === 'needle' ? 7 : type === 'tower' ? 9 + n % 3 : 12 + n * 5 % 9;
    const h = { office: 12 + n * 7 % 10, tower: 20 + n * 3 % 9, band: 13 + n * 5 % 7, dome: 9, needle: 30 + n % 6 }[type];
    if (!clear.some(([a, b]) => x < b && x + w > a)) city.push({ x, w, h, type });
    x += w + 2 + n % 3;
  }
  // the skyline is static: draw it once, then give it the same grit as the planet (lit from above, darker toward the ground)
  cityCv = mk(W, H);
  drawCity(pen(cityCv.getContext('2d', { willReadFrequently: true })));
  grit(cityCv, 3, (x, y) => Math.min(1, Math.max(0, 1 - (y - (GY - 40)) / 44)));
  grainCv = mk(W + 8, H + 8); // film grain laid over the whole scene
  const gg = grainCv.getContext('2d');
  for (let y = 0; y < H + 8; y++) for (let x = 0; x < W + 8; x++) {
    const n = hash(x, y, 9);
    if (n < .1) { gg.fillStyle = 'rgba(10,8,20,.22)'; gg.fillRect(x, y, 1, 1); } else if (n > .96) { gg.fillStyle = 'rgba(255,255,255,.06)'; gg.fillRect(x, y, 1, 1); }
  }
}
let resizeTimer;
addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); }); // dragging a window: rebuild once it settles
// Where system s is drawn, tapped, fired from and bracketed. Only motion: a 1px idle bob.
function sysPos(s, t) {
  const sl = SLOT[s], h = LOOK[s].lit.height, w = LOOK[s].lit.width;
  let x = CX + sl.x * R0, y = sl.ground ? GY - h / 2 : CY + sl.y * R0 * FY + Math.sin(t * 1.5 + s * 1.3);
  x = Math.max(w / 2 + 2, Math.min(W - w / 2 - 2, x));
  if (!sl.ground) y = Math.max(TOP + h / 2 + 10, y); // room for the label above
  if (x - w / 2 < SIDE.r && y - h / 2 < SIDE.b) y = SIDE.b + h / 2 + 10; // never under the stat boxes
  return [Math.round(x), Math.round(y)];
}
const muzzle = s => { const [x, y] = sysPos(s, last), [dx, dy] = MUZZLE[SYS[s].id] || [0, 0]; return [x + dx, y + dy]; };
// Solid scenery in front of the planet: taps there do nothing.
const onCity = (x, y) => y >= GY || [...city, hq].some(b => x >= b.x && x < b.x + b.w && y >= GY - b.h - (b.type === 'needle' || b === hq ? 12 : 0));

// Dot-grid stars like a printed star chart.
const stars = [];
for (let y = 3; y < 1000; y += 9) for (let x = 3; x < 2000; x += 9) if ((x * 7 + y * 13) % 5 < 2) stars.push([x + (x * y) % 4, y + (x + y) % 3, (x * 31 + y) % 7]);
const parts = [], floats = [], shots = [], beams = [], pulses = [];
const bots = Array.from({ length: 40 }, (_, k) => [(k * 97.3) % TW, 18 + (k * 53.7) % (TH - 36)]); // crew walking the surface
let off = 0, shake = 0, pulse = 0, flash = 0, last = 0, zoom = 1, stage = 0, sel = -1;
const cam = { z: 1, fx: 0, fy: 0, ax: 0, ay: 0 }; // eased camera: focus point (scene px), zoom, screen anchor
const camOrigin = () => [Math.round(cam.ax - cam.fx * cam.z), Math.round(cam.ay - cam.fy * cam.z)];

function burst(x, y, colors, n, speed = 40) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * 7, v = speed * (.3 + Math.random());
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color: colors[k % colors.length] });
  }
}

// Texture coords <-> the visible face of the globe.
function facePos(u, v) {
  let lon = ((u - off) / (TW / 2) - .5) * Math.PI;
  lon = ((lon + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  if (Math.abs(lon) >= Math.PI / 2) return null;
  const x = R * Math.sin(lon), h = 2 * Math.sqrt(R * R - x * x);
  return [CX + x, CY + (v / TH - .5) * h];
}
function texPos(x, y) {
  const dx = Math.max(-R + .5, Math.min(R - .5, x - CX)), h = 2 * Math.sqrt(R * R - dx * dx);
  return [(off + (Math.asin(dx / R) / Math.PI + .5) * TW / 2 + TW) % TW, Math.max(0, Math.min(TH, ((y - CY) / h + .5) * TH))];
}
const blit = (s, x, y) => ctx.drawImage(s, Math.round(x - s.width / 2), Math.round(y - s.height / 2));
const glyphZ = () => PX < 2.5 ? 2 : 1; // fine pixels: double-size glyphs so labels and hit numbers stay readable
const textW = str => (str.length * 4 - 1) * glyphZ();
function text(str, x, y, col = C.line) { // centred on x (kept on screen), bottom at y+5; dark shadow keeps it readable over the planet
  const z = glyphZ(), half = textW(str) / 2;
  x = Math.max(half + 1, Math.min(W - half - 2, x));
  y = Math.round(y + 5 - 5 * z);
  for (const [d, c] of [[z, C.deep], [0, col]]) {
    let cx = Math.round(x - (str.length * 4 - 1) * z / 2) + d;
    ctx.fillStyle = c;
    for (const ch of str) { const g = GLYPH[ch]; if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') ctx.fillRect(cx + i % 3 * z, y + d + (i / 3 | 0) * z, z, z); cx += 4 * z; }
  }
}

// System s fires at a random spot on the visible planet. Real shots (purchases) leave a life patch.
function fire(s, real) {
  const a = Math.PI + Math.random() * Math.PI, d = R * .8 * Math.sqrt(Math.random()); // upper half: the lower half hides behind the colony
  const tx = CX + Math.cos(a) * d, ty = CY + Math.sin(a) * d, [sx, sy] = muzzle(s), shot = SYS[s].shot;
  if (shot === 'light') { // sunlight from above lands on both mirror panels, then one reflected beam heats the planet
    for (const px of [-21, 20]) {
      beams.push({ x1: sx + px - 26, y1: 0, x2: sx + px, y2: sy - 9, life: 1, col: C.sun, w: 2, a: .55, fade: 2 });
      burst(sx + px, sy - 9, [C.sun, C.line], 3, 12); // glint on the panel
    }
    beams.push({ x1: sx, y1: sy, x2: tx, y2: ty, life: 1, col: C.sun, w: 2, end: true, fade: 2.5, delay: .15 }); // reflection follows a beat later
    const w0 = S.world;
    setTimeout(() => { if (S.world === w0) land(s, tx, ty, real); }, 150); // skip if a warp started a new world meanwhile
    return;
  }
  if (shot === 'beam') { beams.push({ x1: sx, y1: sy, x2: tx, y2: ty, life: 1, col: C.pink, end: true }); return land(s, tx, ty, real); }
  if (shot === 'pulse') { pulses.push({ r: R * .2, life: 1 }); return land(s, tx, ty, real); }
  shots.push({ s, sx, sy, tx, ty, t: 0, dur: .7 + Math.random() * .3, real });
}
// Seconds between automatic shots: more crew fires faster.
const cadence = s => Math.max(.6, 4 / Math.sqrt(1 + S.L[s][0]));
function land(s, x, y, real) {
  const big = SYS[s].shot === 'rocket' || SYS[s].shot === 'pulse';
  burst(x, y, [C.line, C.pink, C.soft], real ? 24 : 7, big ? 60 : 35);
  if (big) shake = Math.max(shake, real ? .7 : .2);
  if (real) { const [u, v] = texPos(x, y); items.push({ u, v, born: last }); if (items.length > 300) items.splice(0, items.length - 150); }
  // damage pop-up: what this system earns per shot, so the numbers match the real income
  floats.push({ x, y: y - 8, text: '+' + fmt(sysRate(s, S.L[s]) * boost() * cadence(s)), life: 1.4, col: '#ffd6e0' }); // light pink: readable on any planet
  if (floats.length > 14) floats.shift(); // keep the sky readable
}

// One texture column per screen column, squashed toward the edges, so a flat map reads as a spinning globe.
function globe(src, shift) {
  for (let x = -R; x < R; x++) {
    const h = Math.round(2 * Math.sqrt(R * R - (x + .5) ** 2));
    const u = Math.floor(((shift + (Math.asin((x + .5) / R) / Math.PI + .5) * TW / 2) % TW + TW) % TW);
    ctx.drawImage(src, u, 0, 1, TH, CX + x, CY - h / 2, 1, h);
  }
}
// Hard-edged night side: per row, shade the part of the planet outside the sunlit circle.
function nightSide() {
  ctx.fillStyle = 'rgba(20,18,40,.45)';
  const lx = -R * .3, lr = R * 1.08;
  for (let dy = -R; dy < R; dy++) {
    const hw = Math.sqrt(R * R - (dy + .5) ** 2), ly = dy + .5 + R * .25, l2 = lr * lr - ly * ly;
    const span = (a, b) => { a = Math.round(CX + a); b = Math.round(CX + b); if (b > a) ctx.fillRect(a, CY + dy, b - a, 1); };
    if (l2 <= 0) { span(-hw, hw); continue; }
    const lw = Math.sqrt(l2);
    span(Math.max(-hw, lx + lw), hw);
    span(-hw, Math.min(hw, lx - lw));
  }
}
function drawMoon(x, y) {
  const r = Math.max(2, Math.round(R * .12));
  for (let dy = -r; dy <= r; dy++) { const dx = Math.round(Math.sqrt(r * r - dy * dy)); P.fill(x - dx, y + dy, dx * 2 + 1, 1, C.soft); P.fill(x + Math.round(r * .3), y + dy, Math.max(0, dx - Math.round(r * .3)) + 1, 1, C.dim); }
}

// Colony skyline with the HQ under the planet, drawn with pen p (once per layout, into cityCv).
function drawCity(p) {
  for (const b of city) {
    const { x, w, h, type } = b, y = GY - h;
    if (type === 'needle') { p.box(x + 2, y + 9, 3, h - 9, C.bg, false); p.box(x, y + 4, 7, 6); p.fill(x + 3, y, 1, 4, C.line); p.dot(x + 3, y - 1, C.pink); continue; }
    p.box(x, y, w, h, C.bg, false);
    if (type === 'office') for (let wy = y + 3; wy < GY - 3; wy += 5) for (let wx = x + 3; wx + 3 <= x + w - 2; wx += 4) p.box(wx, wy, 3, 3);
    if (type === 'tower') { for (let wx = x + 2; wx < x + w - 2; wx += 2) p.line(wx, y + 3, wx, GY - 3, C.dim); p.fill(x + (w >> 1), y - 6, 1, 6, C.line); p.fill(x + (w >> 1) - 1, y - 7, 3, 1, C.pink); }
    if (type === 'band') { for (let wy = y + 3; wy < GY - 2; wy += 3) p.line(x + 2, wy, x + w - 3, wy, C.dim); p.box(x + 2, y - 3, 5, 4); }
    if (type === 'dome') { p.disc(x + (w >> 1), y, (w >> 1) - 1, C.bg, true); p.box(x + (w >> 1) - 2, GY - 5, 4, 5, C.bg, false); }
  }
  const { x, w, h } = hq, y = GY - h; // HQ: columns, pink sign, big ribbed dome, dish
  p.disc(x + w / 2, y, 13, C.bg, true);
  for (const dx of [-7, 0, 7]) p.line(x + w / 2 + dx, y - Math.round(Math.sqrt(169 - dx * dx)) + 1, x + w / 2 + dx, y - 1, C.dim);
  p.box(x, y, w, h, C.bg, false);
  p.fill(x + 6, y + 3, w - 12, 3, C.pink);
  for (let cx = x + 4; cx < x + w - 3; cx += 5) p.line(cx, y + 9, cx, GY - 1);
  p.line(x + w - 4, y, x + w - 4, y - 6); p.ring(x + w - 4, y - 8, 3, 2, 0, Math.PI);
}
// Atmosphere ring in clean solid bands (white rim, then three fading steps). Built at the full planet size (R0) and
// rebuilt only when that size or the colour changes; the warp zoom just scales it.
let haloCv, haloKey;
function haloRing(rgb) {
  const r = Math.round(R0), key = r + '|' + rgb;
  if (key === haloKey) return haloCv;
  const s = (Math.ceil(r * 1.32) + 1) * 2, m = s / 2, c = mk(s, s), g = c.getContext('2d');
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const t = (Math.hypot(x - m + .5, y - m + .5) - r) / (r * .3);
    if (t < 0 || t > 1) continue;
    g.fillStyle = t < .07 ? C.line : `rgba(${rgb},${t < .3 ? .6 : t < .6 ? .32 : .14})`;
    g.fillRect(x, y, 1, 1);
  }
  haloKey = key;
  return haloCv = c;
}

const canAct = s => S.on[s] ? S.L[s].some((l, k) => l < MAXL && S.life >= ucost(s, k, l)) : unlocked(s) && S.life >= SYS[s].unlock;

// A system: shaded line-art when unlocked, dim outline when next, dotted silhouette otherwise.
function drawSystem(s, t) {
  const look = LOOK[s], on = S.on[s], img = on ? look.lit : unlocked(s) ? look.next : look.sil;
  const [x, y] = sysPos(s, t), w = img.width, h = img.height, x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
  if (SLOT[s].island) { // floating rock under the core, dithered dark toward the bottom
    for (let k = 0; k < ISLE - 1; k++) {
      const half = Math.round((ISLE - 1 - k) * 1.05 + (k % 3));
      for (let dx = -half; dx < half; dx++) P.dot(x + dx, y0 + h + k, !on ? C.sil : B4[k & 3][(dx + 64) & 3] / 16 < .8 - k / ISLE ? '#3d4462' : '#22263a');
      P.dot(x - half, y0 + h + k, on ? C.soft : C.dim); P.dot(x + half - 1, y0 + h + k, on ? C.soft : C.dim);
    }
    P.fill(x - 17, y0 + h, 34, 1, on ? C.line : C.dim);
  }
  ctx.drawImage(img, x0, y0);
}
// Labels, price tags, pink dots and selection brackets go on top of every system, so nothing hides them.
function drawMarks(s, t) {
  const on = S.on[s], img = LOOK[s].lit;
  const [x, y] = sysPos(s, t), w = img.width, h = img.height, x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
  if (on) text(`${S.L[s][0] + S.L[s][1] + S.L[s][2]}/${MAXL * 3}`, x, y0 - 8);
  else if (unlocked(s)) { // price tag: energy icon + amount, kept on screen as one unit
    const label = fmt(SYS[s].unlock), lw = textW(label), total = 9 + lw, left = Math.max(1, Math.min(W - total - 2, Math.round(x - total / 2)));
    ctx.drawImage(T.energy, left, y0 - 10);
    text(label, left + 9 + lw / 2, y0 - 8, C.soft);
  }
  if (canAct(s)) P.fill(x0 + w + 1, y0 - 4, 3, 3, C.pink);
  if (sel === s) { // blinking selection brackets
    const col = Math.sin(t * 6) > 0 ? C.line : C.soft, l = x0 - 4, r = x0 + w + 3, tp = y0 - 4, bt = y0 + h + 3;
    for (const [bx, by, dx, dy] of [[l, tp, 1, 1], [r, tp, -1, 1], [l, bt, 1, -1], [r, bt, -1, -1]]) { P.fill(Math.min(bx, bx + dx * 4), by, 5, 1, col); P.fill(bx, Math.min(by, by + dy * 4), 1, 5, col); }
  }
}

function draw(t, heal) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  for (const [x, y, k] of stars) if (x < W && y < H && (k || Math.sin(t * 2 + x) > -.5)) P.dot(x, y, k > 4 ? C.soft : C.dot);
  // atmosphere: the world's dead glow fading to its alive glow (colour stepped so the dithered ring is rarely rebuilt)
  const { dg, ag } = world(), c = dg.map((d, k) => Math.round(d + (ag[k] - d) * heal) & ~7).join(',');
  const halo = haloRing(c), hs = Math.round(halo.width * R / Math.round(R0)); // hs = halo size at the current (zoomed) radius
  ctx.drawImage(halo, Math.round(CX - hs / 2), Math.round(CY - hs / 2), hs, hs);

  const ma = t * .2, moon = [Math.round(CX + Math.cos(ma) * R * 1.2), Math.round(CY + Math.sin(ma) * R * .36 - Math.cos(ma) * R * .1)], front = Math.sin(ma) > 0;
  if (stage >= 3) P.ring(CX, CY, R * 1.38, R * .2, Math.PI, 2 * Math.PI);
  if (stage >= 1 && !front) drawMoon(...moon);
  compose(t, heal);
  globe(comp, off);
  if (stage >= 2) globe(clouds, off * 1.7);
  nightSide();
  const crew = Math.min(bots.length, S.L.reduce((a, L, s) => a + (S.on[s] ? 1 + L[0] : 0), 0)); // one walker per crew member, capped
  for (let k = 0; k < crew; k++) { const f = facePos(bots[k][0], bots[k][1]); if (f) blit(T.bot, f[0], f[1] + (Math.sin(t * 4 + k) > .6 ? -1 : 0)); }
  if (stage >= 3) P.ring(CX, CY, R * 1.38, R * .2, 0, Math.PI);
  if (stage >= 1 && front) drawMoon(...moon);
  for (const p of pulses) { ctx.globalAlpha = p.life; P.ring(CX, CY, p.r, p.r, 0, 2 * Math.PI, C.pink); }
  ctx.globalAlpha = 1;

  P.fill(0, GY, W, H - GY, C.deep); P.fill(0, GY, W, 1, C.line); // ground
  ctx.drawImage(cityCv, 0, 0);
  SYS.forEach((_, s) => drawSystem(s, t));
  SYS.forEach((_, s) => drawMarks(s, t));

  for (const s of shots) {
    const k = s.t / s.dur, x = s.sx + (s.tx - s.sx) * k, y = s.sy + (s.ty - s.sy) * k, shot = SYS[s.s].shot;
    if (shot === 'rocket') { blit(T.missile, x, y); parts.push({ x, y, vx: (Math.random() - .5) * 6, vy: (Math.random() - .5) * 6, life: .5, color: Math.random() < .5 ? C.pink : C.line }); }
    else if (shot === 'drone') blit(T.drone, x, y);
    else { P.fill(x - 1, y - 1, 2, 2, C.line); parts.push({ x, y, vx: 0, vy: 0, life: .4, color: C.soft }); }
  }
  for (const b of beams) { // w = width in pixels, a = opacity, end = flash at the impact point
    if (b.delay > 0) continue;
    ctx.globalAlpha = b.life * (b.a || 1);
    for (let o = 0; o < (b.w || 1); o++) P.line(b.x1 + o, b.y1, b.x2 + o, b.y2, b.col);
    if (b.end) P.fill(b.x2 - 1, b.y2 - 1, 3, 3, C.line);
  }
  for (const q of parts) { ctx.globalAlpha = q.life; P.dot(q.x, q.y, q.color); }
  for (const f of floats) { ctx.globalAlpha = f.life; text(f.text, f.x, f.y, f.col); }
  ctx.globalAlpha = 1;

  // first-run hints: tap the planet, then the Laser Station once it's affordable
  const bob = Math.round(Math.sin(t * 6) * 2);
  if (!S.taps) blit(T.hand, CX + R * .2, CY - R * .3 + bob);
  else if (!S.on[0] && sel !== 0 && S.life >= SYS[0].unlock) { const [x, y] = sysPos(0, t); blit(T.hand, x, y + 18 + bob); }

  ctx.drawImage(grainCv, -((t * 7 | 0) % 8), -((t * 5 | 0) % 8)); // grain, nudged a few times a second

  // screen: the scene scaled up with nearest-neighbour
  out.imageSmoothingEnabled = false;
  out.fillStyle = C.bg; out.fillRect(0, 0, cv.width, cv.height);
  const [ox, oy] = camOrigin(), sx = shake ? Math.round((Math.random() - .5) * shake * 6) : 0, sy = shake ? Math.round((Math.random() - .5) * shake * 6) : 0;
  out.drawImage(buf, (ox + sx) * K, (oy + sy) * K, W * cam.z * K, H * cam.z * K);
  if (flash) { out.fillStyle = `rgba(233,236,245,${flash})`; out.fillRect(0, 0, cv.width, cv.height); } // warp flash
}

// ---------- hud / panel ----------
const set = (el, html) => { if (el._h !== html) el.innerHTML = el._h = html; }; // skip needless DOM rewrites
const tiles = SYS.map((sy, s) => {
  const b = document.createElement('button');
  b.className = 'tile';
  b.setAttribute('aria-label', sy.name); b.setAttribute('aria-controls', 'panel');
  b.addEventListener('click', () => (sel === s ? closePanel() : openPanel(s)));
  $('bar').append(b);
  return b;
});
const rows = [0, 1, 2].map(k => {
  const r = document.createElement('div');
  r.className = 'row';
  r.innerHTML = '<div class="rt"></div><button class="buy"></button>';
  r.lastChild.addEventListener('click', () => rowClick(k));
  $('prows').append(r);
  return { r, text: r.firstChild, buy: r.lastChild };
});

function updateUI() {
  set($('life'), ICON + fmt(S.life));
  $('rate').textContent = `${fmt(rateOf())} life/s` + (S.world ? ` x${boost()}` : '');
  $('wname').textContent = world().name + (S.world >= WORLDS.length ? ' ' + 'I'.repeat(Math.floor(S.world / WORLDS.length) + 1) : '');
  const h = pct();
  $('healbar').style.width = h + '%';
  $('healtxt').textContent = `${h}% terraformed`;
  $('heal').setAttribute('aria-valuenow', h);

  const g = GOALS[S.goal], goal = $('goal');
  goal.hidden = !g;
  if (g) {
    const n = Math.min(g.get(), g.need);
    goal.classList.toggle('ready', n >= g.need && g.reward > 0);
    set($('gtext'), `${g.text} ${n}/${g.need}`);
    set($('grew'), g.reward ? `${ICON}${fmt(g.reward)}` : '');
  }
  tiles.forEach((b, s) => {
    set(b, `<img src="${S.on[s] ? tileSrc[s].lit : unlocked(s) ? tileSrc[s].next : tileSrc[s].sil}" alt="">`);
    b.classList.toggle('ok', canAct(s));
    b.classList.toggle('sel', sel === s);
    b.setAttribute('aria-expanded', sel === s);
  });
  if (W && hudH() !== layoutH) resize(); // goal text wrapped or the HUD changed size: re-fit the scene below it

  panelH = panel.offsetHeight; // read here (10x/s), not in every frame
  for (const a of ['prev', 'next']) { $(a).hidden = sel < 0; $(a).style.bottom = panelH + 20 + 'px'; }
  if (sel < 0) return;
  const s = sel, sy = SYS[s], L = S.L[s];
  $('pname').textContent = sy.name;
  set($('pinfo'), S.on[s] ? `${ICON}${fmt(sysRate(s, L) * boost())}/s` : unlocked(s) ? `${ICON}${fmt(sy.unlock)}` : 'locked');
  $('pfact').textContent = S.on[s] ? sy.fact : '';
  rows.forEach(({ r, text: el, buy }, k) => {
    if (!S.on[s]) { // locked: one unlock row
      r.hidden = k > 0;
      buy.setAttribute('aria-disabled', !unlocked(s) || S.life < sy.unlock); // aria-disabled, not disabled: keeps keyboard focus
      set(el, `Unlock ${sy.name}<small>${unlocked(s) ? sy.desc : `Unlock the ${SYS[s - 1].name} first.`}</small>`);
      return set(buy, `Unlock<span>${ICON}${fmt(sy.unlock)}</span>`);
    }
    const max = L[k] >= MAXL, c = ucost(s, k, L[k]), [name, eff] = sy.ups[k];
    const desc = [`Adds +1 ${sy.unit} to the crew.`, `${eff} per level.`, `${eff} per level, stacking.`][k];
    const cur = [[`${1 + L[0]} ${sy.unit}s`, '+1'], [`+${25 * L[1]}%`, '+25%'], [`x${(1.08 ** L[2]).toFixed(2)}`, 'x1.08']][k];
    r.hidden = false;
    buy.setAttribute('aria-disabled', max || S.life < c);
    set(el, `${name}<span class="lv">Lv.${L[k]}</span><small>${desc}</small><small class="cur">Current: ${cur[0]} ${max ? '' : `<i>${cur[1]}</i>`}</small>`);
    set(buy, max ? 'MAX' : `Upgrade<span>${ICON}${fmt(c)}</span>`);
  });
}

function rowClick(k) {
  const s = sel, sy = SYS[s], [x, y] = sysPos(s, last);
  if (!S.on[s]) {
    if (!unlocked(s) || S.life < sy.unlock) return;
    S.life -= sy.unlock; S.on[s] = true; pulse = 1;
    toast(sy.fact);
    burst(x, y, [C.line, C.pink, C.soft], 40, 60);
  } else {
    const L = S.L[s], c = ucost(s, k, L[k]);
    if (L[k] >= MAXL || S.life < c) return;
    S.life -= c; L[k]++;
    burst(x, y, [C.pink, C.line], 14, 40);
  }
  fire(s, true);
  updateUI();
}

let opener = null; // element that opened the panel, to give focus back on close
function openPanel(s) {
  const wasClosed = panel.hidden;
  if (wasClosed) opener = document.activeElement;
  sel = s; panel.hidden = false; updateUI();
  if (wasClosed) rows[0].buy.focus({ preventScroll: true });
}
function closePanel() {
  if (panel.hidden) return;
  sel = -1; panel.hidden = true; updateUI();
  if (opener?.isConnected && opener !== document.body) opener.focus({ preventScroll: true });
  if (pendingToast) { toast(...pendingToast); pendingToast = null; }
}
$('pclose').addEventListener('click', closePanel);
$('prev').addEventListener('click', () => openPanel((sel + SYS.length - 1) % SYS.length));
$('next').addEventListener('click', () => openPanel((sel + 1) % SYS.length));
addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

let toastTimer, pendingToast = null;
function toast(msg, big) {
  if (sel >= 0 && innerWidth < 900) { pendingToast = [msg, big]; return; } // phones hide toasts under the panel: show it on close
  const el = $('toast');
  el.textContent = msg; el.classList.add('show'); el.classList.toggle('big', !!big);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 6000);
}

$('goal').addEventListener('click', () => {
  const g = GOALS[S.goal];
  if (!g || !g.reward || g.get() < g.need) return;
  S.life += g.reward; S.earned += g.reward; S.goal++;
  updateUI();
});

function showWarp() {
  S.done = true;
  const s = Math.round(last - S.start), next = WORLDS[(S.world + 1) % WORLDS.length].name;
  $('warptxt').textContent = `${world().name} is alive. Took ${Math.floor(s / 60)}m ${s % 60}s. Next stop: ${next}, with all output x${boost() * 2} forever.`;
  closePanel();
  $('warp').hidden = false;
  for (const id of BEHIND_WARP) $(id).inert = true; // modal: nothing behind the dialog is reachable
  $('warpbtn').focus();
  burst(CX, CY, [C.line, C.pink, C.soft], 80, 90);
}

// Start a fresh dead world: everything resets except the permanent warp boost.
const BEHIND_WARP = ['c', 'top', 'side', 'toast', 'bar', 'panel', 'prev', 'next'];
function warp() {
  $('warp').hidden = true;
  for (const id of BEHIND_WARP) $(id).inert = false;
  tiles[0].focus({ preventScroll: true });
  Object.assign(S, { world: S.world + 1, life: 0, earned: 0, goal: 1, start: last, done: false, on: SYS.map(() => false), L: SYS.map(() => [0, 0, 0]) });
  items.length = shots.length = 0;
  stage = 0; zoom = .3; flash = 1; shake = 1; // arrive from far away
  buildWorld();
  toast(`ARRIVED AT ${world().name}. ${world().fact}`, true);
}
$('warpbtn').addEventListener('click', () => { warp(); save(); });

// ---------- saving & offline progress (browser localStorage: no server, per device) ----------
const SAVE = 'terraform-save-v1', AWAY_CAP = 12 * 3600; // offline time counted, in seconds
const syncStage = () => { stage = STAGES.filter(s => healOf(S.earned) >= s.at).length; }; // no milestone pop-ups for old progress
function save() {
  try {
    localStorage.setItem(SAVE, JSON.stringify({
      t: hiddenAt || Date.now(), played: last - S.start, // hidden tab: the loop stopped when it was hidden, so count from then
      S: { life: S.life, earned: S.earned, taps: S.taps, goal: S.goal, world: S.world, on: S.on, L: S.L },
      items: items.slice(-150).map(it => [Math.round(it.u), Math.round(it.v)]),
    }));
  } catch { /* private mode or full storage: keep playing unsaved */ }
}
// The save is outside data (could be stale or hand-edited): check every field before trusting it.
const validSave = d => d && Number.isFinite(d.t) && d.S
  && ['life', 'earned', 'taps', 'goal', 'world'].every(k => Number.isFinite(d.S[k]) && d.S[k] >= 0)
  && Array.isArray(d.S.on) && d.S.on.length === SYS.length
  && Array.isArray(d.S.L) && d.S.L.length === SYS.length && d.S.L.every(l => Array.isArray(l) && l.length === 3 && l.every(n => Number.isInteger(n) && n >= 0 && n <= MAXL));
// Restores the save and credits the time since it was written. Returns false if there was nothing usable.
function load() {
  let raw = null, d;
  try { raw = localStorage.getItem(SAVE); d = JSON.parse(raw); } catch { d = null; }
  if (!validSave(d)) {
    try { if (raw) localStorage.setItem(SAVE + '-bad', raw); } catch { /* ignore */ } // keep an unreadable save instead of letting the next autosave erase it
    return false;
  }
  const v = d.S;
  Object.assign(S, { life: v.life, earned: v.earned, taps: v.taps, goal: Math.min(v.goal | 0, GOALS.length), world: Math.min(v.world | 0, 60), // 2^world boost: cap keeps numbers finite
    on: v.on.map(Boolean), L: v.L, start: last - (Number.isFinite(d.played) ? d.played : 0) });
  items.length = 0;
  if (Array.isArray(d.items)) for (const p of d.items) if (Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])) items.push({ u: p[0], v: p[1], born: -9 });
  buildWorld();
  away(d.t);
  return true;
}
// Credit the income earned since `since` (ms timestamp) while the game wasn't running.
function away(since) {
  const sec = Math.min(AWAY_CAP, Math.max(0, (Date.now() - since) / 1000)), gain = rateOf() * sec;
  S.life += gain; S.earned += gain; // always credit, even a few seconds in another tab
  if (sec >= 30 && gain > 0) {
    const h = sec / 3600 | 0, m = (sec % 3600) / 60 | 0;
    toast(`WELCOME BACK. In ${h ? h + 'h ' : ''}${m}m away your colony made ${fmt(gain)} life.`, true);
  }
  syncStage();
}
let hiddenAt = 0; // background tabs pause the game loop, so catch up when the tab comes back
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); save(); return; }
  if (!hiddenAt) return;
  // reload the latest save: picks up anything another tab played meanwhile and credits the away time once
  if (!load()) away(hiddenAt);
  hiddenAt = 0; resume = true;
});
addEventListener('pagehide', save);
setInterval(() => { if (!document.hidden) save(); }, 5000); // while hidden the saved time must stay at the moment we left

cv.addEventListener('pointerdown', e => {
  if (!e.isPrimary || e.button > 0) return; // right/middle click and extra fingers are not taps
  const [ox, oy] = camOrigin(), x = (e.clientX / PX - ox) / cam.z, y = (e.clientY / PX - oy) / cam.z;
  let hit = -1, best = HIT / cam.z;
  SYS.forEach((_, s) => { const [sx, sy] = sysPos(s, last), d = Math.hypot(x - sx, y - sy); if (d <= best) { best = d; hit = s; } }); // nearest wins
  if (hit >= 0) return openPanel(hit);
  if (onCity(x, y)) return; // buildings and ground are solid
  if ((x - CX) ** 2 + (y - CY) ** 2 > R * R) return closePanel();
  tapPlanet(x, y);
});
// keyboard players tap the planet with Enter or Space while the canvas has focus
cv.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  tapPlanet(CX + (Math.random() - .5) * R, CY - R * (.2 + Math.random() * .5));
});
function tapPlanet(x, y) {
  const g = tapOf(rateOf());
  S.life += g; S.earned += g; S.taps++;
  if (S.on[0]) { const [lx, ly] = muzzle(0); beams.push({ x1: lx, y1: ly, x2: x, y2: y, life: 1, col: C.pink, end: true }); }
  burst(x, y, [C.line, C.pink], 10);
  floats.push({ x, y: y - 8, text: '+' + fmt(g), life: 1 });
}

// ---------- loop ----------
let uiTick = 0, resume = true, panelH = 0; // resume: skip one frame gap after a hidden tab (away() already paid it)
function frame(ms) {
  const t = ms / 1000, gap = resume ? 0 : Math.min(30, t - last), dt = Math.min(.1, gap);
  last = t; resume = false;
  if (!W) return requestAnimationFrame(frame); // no layout yet (0-size viewport)
  const r = rateOf();
  S.life += r * gap; S.earned += r * gap; // income uses the real gap so slow frames don't lose it; animation uses capped dt
  const heal = healOf(S.earned);
  off = (off + dt * 6) % TW;
  shake = Math.max(0, shake - dt * 3); pulse = Math.max(0, pulse - dt * 1.5); flash = Math.max(0, flash - dt * 1.2);
  if (heal >= 1 && $('warp').hidden && !S.done) showWarp();

  const reached = STAGES.filter(s => heal >= s.at).length;
  if (reached > stage) { stage = reached; toast(STAGES[stage - 1].text, true); pulse = 1; shake = .8; }
  zoom += (1 - zoom) * Math.min(1, dt * 1.5);
  R = Math.round(R0 * zoom);

  // camera: zoom 2x onto the selected system, centred in the open space right of the stats and above the panel
  const k = Math.min(1, dt * 6), open = sel >= 0, [fx, fy] = open ? sysPos(sel, 0) : [W / 2, H / 2];
  const tgt = { z: open ? 2 : 1, fx, fy, ax: open ? (SIDE.r + W) / 2 : W / 2, ay: open ? (TOP + (H - panelH / PX)) / 2 : H / 2 };
  for (const key in tgt) { cam[key] += (tgt[key] - cam[key]) * k; if (Math.abs(tgt[key] - cam[key]) < .02) cam[key] = tgt[key]; } // snap to exact values: whole-pixel scale when settled

  // unlocked systems keep firing; more crew fires faster, but only a few shots fly at once
  SYS.forEach((sy, s) => {
    if (!S.on[s] || t < (sy.next || 0) || shots.length + beams.length >= 8) return;
    fire(s, false);
    sy.next = t + cadence(s) * (.7 + Math.random() * .6);
  });
  for (const s of shots) if ((s.t += dt) >= s.dur) { s.done = true; land(s.s, s.tx, s.ty, s.real); }
  shots.splice(0, shots.length, ...shots.filter(s => !s.done));
  for (const p of pulses) { p.r += R * 1.4 * dt; p.life -= dt * 1.2; }
  for (const q of parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= .95; q.vy *= .95; q.life -= dt * 1.4; }
  for (const f of floats) { f.y -= 16 * dt; f.life -= dt * 1.2; }
  for (const b of beams) if (b.delay > 0) b.delay -= dt; else b.life -= dt * (b.fade || 5);
  for (const a of [parts, floats, beams, pulses]) a.splice(0, a.length, ...a.filter(q => q.life > 0));

  draw(t, heal);
  if ((uiTick += dt) > .1) { uiTick = 0; updateUI(); }
  requestAnimationFrame(frame);
}

load();
updateUI();
resize();
Object.assign(cam, { fx: W / 2, fy: H / 2, ax: W / 2, ay: H / 2 });
requestAnimationFrame(frame);
document.fonts?.ready.then(resize); // the HUD font changes box heights once it arrives
