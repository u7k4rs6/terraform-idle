'use strict';

// Muted slate night, white line-art, soft pink accents.
const C = { bg: '#2b3047', deep: '#1f2333', line: '#e9ecf5', dim: '#59607f', dot: '#6f79a3', soft: '#8f99c4', pink: '#e98aa3', sil: '#1c2030', sun: '#ffe08a', zap: '#bfe6ff', lava: '#ff8a3d', gas: '#c9d6b8' };

const priceScale = () => PRICE_GROWTH ** S.world; // prices, taps and flat rewards grow with the warp boost
const ucost = (s, k, l) => Math.ceil(SYS[s].unlock * UPM[k][0] * UPM[k][1] ** l * priceScale());
const sysRate = (s, L) => SYS[s].base * (1 + L[0]) * (1 + .25 * L[1]) * 1.08 ** L[2];
const tapOf = rate => Math.max(4 * priceScale(), Math.round(rate * .15));
// Log scale so the planet heals steadily while income grows exponentially; /1000 keeps the first taps from jumping to 25%.
const goalOf = () => GOAL * GOAL_GROWTH ** S.world * DIFFICULTY ** Math.min(S.world, DIFFICULTY_CAP) * (S.boon === 'short' ? .75 : 1);
const healOf = earned => Math.min(1, Math.log10(1 + earned / 1000) / Math.log10(1 + goalOf() / 1000));
console.assert(sysRate(0, [0, 0, 0]) === 3 && sysRate(0, [1, 4, 0]) === 12, 'system rate');

const fmt = n => {
  if (n < 1000) return n < 10 ? String(Math.floor(n * 10) / 10) : String(Math.floor(n));
  if (n >= 999.5e15) { // past the q suffix: scientific, e.g. 6.64e44
    let e = Math.floor(Math.log10(n)), m = +(n / 10 ** e).toFixed(2);
    if (m >= 10) { m /= 10; e++; }
    return m.toFixed(2) + 'e' + e;
  }
  let k = -1;
  while (n >= 999.5 && k < 4) { n /= 1000; k++; } // 999.5 not 1000: values that round up move to the next unit
  return n.toFixed(n < 9.995 ? 2 : n < 99.95 ? 1 : 0) + 'kmbtq'[k];
};
console.assert(fmt(999999) === '1.00m' && fmt(9999) === '10.0k' && fmt(1500) === '1.50k' && fmt(12.7) === '12' && fmt(2e15) === '2.00q' && fmt(6.64e44) === '6.64e44' && fmt(9.999e20) === '1.00e21' && fmt(5e17) === '500q' && fmt(1e18) === '1.00e18', 'fmt rounding');
const mmss = s => `${Math.floor(s / 60)}m ${s % 60}s`;
const roman = n => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] ?? n;

// seeds: unspent Star Seeds (one per healed planet); tal: unlocked talent ids; intro: the commander's tutorial is done;
// done: this world is at 100% (the warp is waiting); best: fastest time to heal each world, by name
// ach: achievement ids earned; n: lifetime counters the achievements watch (crits, comets caught, taps in meteor showers, longest time away in s)
const S = { life: 0, earned: 0, taps: 0, goal: 0, world: 0, start: 0, on: SYS.map(() => false), L: SYS.map(() => [0, 0, 0]), seeds: 0, tal: [], intro: false, done: false, best: {}, ach: [], n: { crit: 0, comet: 0, storm: 0, away: 0, combo: 0, crates: 0, moon: 0, contracts: 0 }, daily: '', boon: '', offer: [], contract: null }; // boon: the warp boon on this world; offer: the 3 boons the waiting warp offers; contract: the open side job (data only) // daily: local date of the last supply drop opened
console.assert(healOf(0) === 0 && healOf(GOAL) === 1 && healOf(GOAL * 9) === 1, 'heal');
console.assert(ucost(0, 0, 0) === 25 && ucost(0, 0, 1) === 31 && ucost(0, 2, 0) === 250, 'upgrade cost'); // world 0: price scale 1
const has = id => S.tal.includes(id);
const boost = () => 2 ** S.world; // every world you finish doubles all output for good (prices double too: priceScale)
// Talent multipliers: on everything, and on pairs of systems.
const allMul = () => (has('echo') ? Math.min(1.5, 1 + .05 * S.world) : 1) * (has('roots') ? 1.25 : 1) * (has('bloom') ? 1.3 : 1) * (has('gaia') ? 1.5 : 1) * (has('kinetic') ? 1 + Math.min(1, S.taps / 1e4) : 1);
const PAIR = { lens: [0, 1], swarm: [2, 3], grow: [4, 5] };
// live = false: without the solar flare (offline pay and one-off rewards must not freeze a 12 s event's x2)
const sysOut = (s, live = true) => sysRate(s, S.L[s]) * boost() * allMul() * ((SLOT[s].ground ? trait().ground : trait().orbit) || 1) * (live && ev?.id === 'flare' ? 2 : 1) * (S.boon === 'summer' ? 1.5 : 1)
  * Object.entries(PAIR).reduce((m, [id, ss]) => (has(id) && ss.includes(s) ? m * 2 : m), 1);
const rateOf = (live = true) => SYS.reduce((a, _, s) => a + (S.on[s] ? sysOut(s, live) : 0), 0);
const tapGain = () => (tapOf(rateOf()) * (has('spark') ? 3 : 1) + (has('tapecho') ? rateOf() : 0)) * (trait().tap || 1) * (S.boon === 'hands' ? 3 : 1); // one tap, before a crit
const price = (s, k, l = S.L[s][k]) => Math.ceil(ucost(s, k, l) * (has('thrift') ? .9 : 1) * (S.boon === 'bulk' ? .8 : 1)); // level l -> l+1 of upgrade k
const unlockCost = s => Math.ceil(SYS[s].unlock * priceScale() * (has('cheap') ? .75 : 1));
const rewardOf = g => g.reward * priceScale() * (has('patron') ? 3 : 1) * (trait().reward || 1);
const unlocked = s => s === 0 || S.on[s - 1];
const items = []; // life patches on the planet: { u, v (texture coords), born }
const pct = () => Math.floor(healOf(S.earned) * 100);
// Bulk buying: how many levels of upgrade k the current mode buys and what they cost together.
// bulk = 1 or 10 levels (all or nothing), 0 = as many as you can afford right now (at least one).
let bulk = 1;
function bulkOf(s, k) {
  const L = S.L[s][k], want = bulk || MAXL - L;
  let n = 0, c = 0;
  while (n < want && L + n < MAXL) {
    const p = price(s, k, L + n);
    if (!bulk && n && c + p > S.life) break;
    c += p; n++;
  }
  return [n, c];
}

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
// Smooth value noise that wraps across the planet map's width (cell = lattice size in texels, must divide TW).
function vnoise(x, y, cell, seed) {
  const n = TW / cell, gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), h = (i, j) => hash((i % n + n) % n, j, seed);
  return (h(x0, y0) * (1 - sx) + h(x0 + 1, y0) * sx) * (1 - sy) + (h(x0, y0 + 1) * (1 - sx) + h(x0 + 1, y0 + 1) * sx) * sy;
}
const fbm = (x, y, seed) => vnoise(x, y, 32, seed) * .5 + vnoise(x, y, 16, seed + 1) * .3 + vnoise(x, y, 8, seed + 2) * .2;
// Smooth two-octave noise sampled through a second noise field: big cartoon shapes whose contours curl into swirls
const soft = (x, y, seed) => vnoise(x, y, 32, seed) * .62 + vnoise(x, y, 16, seed + 1) * .38;
const swirl = (x, y, seed) => soft(x + 70 * (soft(x, y, seed + 3) - .5), y + 36 * (soft(x + 50, y, seed + 7) - .5), seed);
const rgb = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
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
const MUZZLE = { laser: [-30, 16], striker: [-28, 16], coil: [0, 19], asteroid: [24, 15], volcano: [0, -8], forge: [8, -16], antimatter: [0, -7] }; // laser/striker: the tip, local (-25|-26, 0) rotated and scaled
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
  // orbital railgun angled down-left: breech and rod magazine, twin rails wrapped in magnetic coils, tail fin
  striker: art(64, 44, p => {
    const r = p.rot(34, 22, -.5, 1.3); // local -x points down-left at the planet
    r.poly([[14, 5], [19, 8], [12, 5]]); // tail fin
    r.rect(8, -6, 10, 12); // breech
    r.rect(10, -9, 6, 3); for (const x of [11, 13, 15]) r.seg(x, -8, x, -7, C.dim); // rod magazine
    r.seg(-22, -3, 8, -3); r.seg(-22, 3, 8, 3); // twin rails
    for (const x of [-18, -12, -6, 0]) r.rect(x, -4, 2, 8, C.pink); // magnetic coils
    r.seg(-24, -3, -24, 3); r.dot(-26, 0, C.line); // muzzle ring, rod tip
    r.seg(18, -2, 21, -2); r.seg(18, 2, 21, 2); // thrusters
  }),
  // tesla satellite: winding rings narrowing up to a charged sphere, side orbs, emitter prong pointing down
  coil: art(48, 40, p => {
    p.line(14, 30, 6, 30); p.line(34, 30, 42, 30); p.disc(4, 30, 2); p.disc(44, 30, 2); // arms and side orbs
    p.box(15, 26, 18, 8); p.line(17, 29, 30, 29, C.dim); p.fill(19, 31, 10, 1, C.pink); // base
    p.line(24, 8, 24, 26, C.dim); // coil core
    for (const [y, rx] of [[23, 9], [19, 7], [15, 5]]) p.ring(24, y, rx, 2); // windings
    p.disc(24, 7, 5); p.disc(24, 7, 2, C.pink); // charged sphere
    for (const [x, y] of [[16, 3], [33, 4], [30, 0], [17, 10]]) p.dot(x, y, C.pink); // sparks
    p.line(24, 34, 24, 38); p.dot(24, 39, C.pink); // emitter prong
  }),
  // captured asteroid: cratered rock, drill rig biting into it, crane, ore hopper and a chute toward the planet
  asteroid: art(56, 36, p => {
    p.poly([[6, 14], [12, 6], [22, 4], [31, 8], [35, 17], [31, 27], [20, 31], [9, 28], [4, 21]]);
    for (const [x, y, rx, ry] of [[15, 13, 3, 2], [24, 22, 4, 3], [12, 23, 2, 1]]) p.ring(x, y, rx, ry, 0, 2 * Math.PI, C.dim);
    p.box(26, 0, 12, 7); p.fill(28, 2, 3, 2, C.pink); // rig
    p.line(30, 7, 32, 12); p.line(34, 7, 32, 12); // drill bit
    p.line(37, 3, 46, 3); p.line(46, 3, 46, 8); // crane
    p.box(33, 24, 9, 5); // ore hopper
    p.line(42, 27, 52, 33); p.line(42, 29, 51, 34); p.dot(53, 34, C.pink); // chute
    p.dot(47, 15); p.fill(49, 19, 2, 2, C.line); // drifting ore
  }),
  // volcano with an igniter clamp over its glowing crater, lava runs and rock strata
  volcano: art(34, 32, p => {
    p.poly([[1, 31], [12, 9], [22, 9], [33, 31]]);
    p.line(7, 22, 27, 22, C.dim); p.line(4, 27, 30, 27, C.dim); // strata
    p.fill(13, 9, 9, 2, C.pink); p.line(15, 11, 13, 17, C.pink); p.line(20, 11, 22, 15, C.pink); // crater and lava runs
    p.box(10, 5, 15, 4); // igniter clamp
    p.line(12, 5, 12, 1); p.line(22, 5, 22, 1); p.line(12, 1, 22, 1); p.dot(17, 0, C.pink); // frame and beacon
  }),
  // factory hall with three smokestacks and glowing furnace windows
  forge: art(34, 34, p => {
    p.box(4, 4, 6, 17); p.box(13, 9, 5, 12); p.box(22, 1, 7, 20); // stacks
    p.fill(5, 7, 4, 1, C.pink); p.fill(23, 4, 5, 1, C.pink); // warning bands
    p.box(1, 20, 32, 14); // hall
    for (let x = 4; x < 30; x += 7) p.fill(x, 24, 4, 3, C.pink); // furnace windows
    p.line(2, 30, 31, 30, C.dim);
  }),
  // antimatter orb floating in a magnetic field between two coiled pylons
  antimatter: art(34, 34, p => {
    p.box(1, 28, 32, 6); p.line(4, 31, 29, 31, C.dim); // base
    p.box(3, 6, 5, 23); p.box(26, 6, 5, 23); p.box(2, 3, 7, 4); p.box(25, 3, 7, 4); // pylons and caps
    for (const y of [11, 16, 21, 25]) { p.line(4, y, 6, y, C.pink); p.line(27, y, 29, y, C.pink); } // coils
    p.ring(17, 16, 12, 3, Math.PI, 2 * Math.PI, C.dim); // field ring, back half
    p.disc(17, 16, 6); p.disc(17, 16, 3, C.pink); // orb
    p.ring(17, 16, 12, 3, 0, Math.PI); // field ring, front half
  }),
};
// Marks: a system's look grows with its best upgrade (Lv 10 / 25 / 50): the pink accents turn cyan, gold, then white (Mark IV also glows).
const MARK_AT = [10, 25, 50], MARK = ['I', 'II', 'III', 'IV'];
const MARKS = [['#8fe3ff', '#4a90b0'], ['#ffe08a', '#b08a3a'], ['#ffffff', '#9aa3c4']].map(m => m.map(rgb));
const markOf = s => MARK_AT.filter(n => Math.max(...S.L[s]) >= n).length;
function recolour(src, [light, dark]) { // grit()'s pink pair -> this mark's pair
  const c = mk(src.width, src.height), g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  const im = g.getImageData(0, 0, c.width, c.height), d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const k = d[i] === 240 && d[i + 1] === 163 ? light : d[i] === 168 && d[i + 1] === 86 ? dark : null;
    if (k) { d[i] = k[0]; d[i + 1] = k[1]; d[i + 2] = k[2]; }
  }
  g.putImageData(im, 0, 0);
  return c;
}
const LOOKS = Object.fromEntries(Object.entries(ART).map(([id, a], i) => {
  const lit = grit(a, i, diagLight);
  return [id, { next: shadow(a, false), sil: shadow(a, true), lit, marks: [lit, ...MARKS.map(m => recolour(lit, m))] }];
}));
const look = s => LOOKS[SYS[s].id]; // the sprites of whatever system holds slot s

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
const TILE = Object.fromEntries(Object.entries(LOOKS).map(([id, l]) => [id, { lit: l.lit.toDataURL(), sil: l.sil.toDataURL(), next: l.next.toDataURL(), marks: l.marks.map(c => c.toDataURL()) }]));

// 3x5 pixel font for numbers on the canvas (smooth canvas text would blur when scaled).
const GLYPH = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111',
  '.': '000000000000010', '/': '001001010100100', '+': '000010111010000', k: '100101110101101', m: '000111111101101', b: '100100111101111', t: '010111010010011',
  q: '000111101111001', x: '000101010101000', e: '111101111100111' };

// ---------- planet textures ----------
const TW = 256, TH = 128; // planet surface as a 2:1 wrap-around map

// Fills a TW x TH map texel by texel: paint(x, y) returns [r, g, b].
function texMap(paint) {
  const c = mk(TW, TH), g = c.getContext('2d'), im = g.createImageData(TW, TH), d = im.data;
  for (let y = 0, j = 0; y < TH; y++) for (let x = 0; x < TW; x++, j += 4) { const p = paint(x, y); d[j] = p[0]; d[j + 1] = p[1]; d[j + 2] = p[2]; d[j + 3] = 255; }
  g.putImageData(im, 0, 0);
  return c;
}
// Swirl noise for the whole map, plus a quantile picker (q(.5) = the median), so shares of sea/land stay fixed per world.
function field(seed) {
  const e = new Float32Array(TW * TH);
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) e[y * TW + x] = swirl(x, y, seed);
  const sorted = Float32Array.from(e).sort();
  return { e, q: p => sorted[Math.floor(p * (e.length - 1))] };
}
const frac = v => v - Math.floor(v);

// Alive map: swirling seas with current lines, a bright coast, two-tone land, ragged polar caps.
function makeLush(w, seed) {
  const { e, q } = field(seed), sea = q(.5), shore = q(.55), high = q(.84);
  const [s0, s1, co, l0, l1, cap] = [w.sea[0], w.sea[1], w.coast, w.land[0], w.land[1], w.caps].map(rgb);
  return texMap((x, y) => {
    const v = e[y * TW + x], lat = Math.abs((y + .5) / TH - .5) * 2;
    if (lat > .9 + .08 * (vnoise(x, y, 8, seed + 9) - .5)) return cap;
    if (v < sea) return frac(v * 16) < .16 ? s1 : s0; // contour lines on the water read as swirling currents
    return v < shore ? co : v > high || frac(v * 16) < .1 ? l1 : l0; // highlands, plus swirl strokes across the land
  });
}

// Dead map: banded rock in the world's dead tones, shaded craters lit from the top-left, and cracks (glowing on lava worlds).
function makeDead(w, seed) {
  const { e, q } = field(seed + 40), t1 = q(.3), t2 = q(.72), D = w.dead, pit = rgb(w.crater), lit = w.lava ? D[2] : D[3];
  const map = new Uint8Array(TW * TH), forks = []; // map: tone per texel, 0..3 = dead[k], 4 = crater colour
  for (let i = 0; i < map.length; i++) { const v = e[i]; map[i] = (v < t1 ? 0 : v < t2 ? 1 : 2) - (frac(v * 12) < .1 && v >= t1 ? 1 : 0); } // strata lines one tone darker
  const put = (x, y, k) => { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < TH) map[y * TW + (x % TW + TW) % TW] = k; };
  const litK = w.lava ? 2 : 3;
  for (let n = 0; n < 28; n++) { // craters, mostly small
    const r = 2 + 8 * hash(n, 1, seed) ** 2, cx = hash(n, 2, seed) * TW, cy = 14 + hash(n, 3, seed) * (TH - 28);
    for (let dy = -Math.ceil(r + 2); dy <= r + 2; dy++) for (let dx = -Math.ceil(r + 2); dx <= r + 2; dx++) {
      const d = Math.hypot(dx, dy);
      if (d < r) put(cx + dx, cy + dy, Math.hypot(dx - .35 * r, dy - .35 * r) > r ? 4 : d > r - 1.5 && dx + dy > 0 ? litK : 0); // shadowed top-left wall, lit bottom-right wall
      else if (d < r + 1.2) put(cx + dx, cy + dy, dx + dy < 0 ? litK : 0); // rim: lit toward the sun
    }
  }
  let s = seed;
  const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
  for (let n = 0; n < 12; n++) { // cracks: wandering lines that sometimes fork
    let x = rnd() * TW, y = 16 + rnd() * (TH - 32), a = rnd() * 7;
    for (let k = 0, len = 20 + rnd() * 40; k < len; k++) {
      a += (rnd() - .5) * .9; x += Math.cos(a); y += Math.sin(a) * .7;
      put(Math.round(x), Math.round(y), w.lava ? 3 : 4);
      if (w.lava) put(Math.round(x), Math.round(y) + 1, 2); // glow under the lava line
      if (rnd() < .04) forks.push([x, y, a + (rnd() < .5 ? 1 : -1)]);
    }
  }
  for (const [x0, y0, a0] of forks) { let x = x0, y = y0, a = a0; for (let k = 0; k < 12; k++) { a += (rnd() - .5) * .9; x += Math.cos(a); y += Math.sin(a) * .7; put(Math.round(x), Math.round(y), w.lava ? 3 : 4); } }
  const tone = [...D, pit];
  return texMap((x, y) => tone[map[y * TW + x]]);
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

let lush, dead, lushPx, deadPx, midPx, fieldPx, fieldKey;
const mask = mk(TW, TH), comp = mk(TW, TH), clouds = makeClouds(), compImg = comp.getContext('2d').createImageData(TW, TH);
// thr: the heal level at which each texel comes alive (smooth noise ranked into an even 0..1 spread, so the alive share
// of the planet always equals heal and grows continuously); rim: ragged edge of the purchase patches
const thr = new Float32Array(TW * TH), rim = new Float32Array(TW * TH);
function buildWorld() {
  const w = world(), seed = 11 + S.world * 7, px = c => c.getContext('2d').getImageData(0, 0, TW, TH).data;
  lush = makeLush(w, seed); dead = makeDead(w, seed);
  lushPx = px(lush); deadPx = px(dead); midPx = lushPx.map((v, i) => (v + deadPx[i]) >> 1); // mid: the growth front
  const v = new Float32Array(TW * TH);
  for (let y = 0, i = 0; y < TH; y++) for (let x = 0; x < TW; x++, i++) { v[i] = fbm(x, y, seed + 90); rim[i] = .2 + .55 * vnoise(x, y, 4, seed + 95); }
  [...v.keys()].sort((a, b) => v[a] - v[b]).forEach((i, r) => { thr[i] = r / v.length; });
  fieldKey = '';
}
buildWorld();

let compKey = '';
function compose(t, heal) {
  // purchase patches: soft discs (drawn only when they change) that grow in over 2s and widen as the planet heals
  const r = 10 + 14 * heal, live = items.slice(-150), growing = live.some(it => t - it.born < 2);
  const key = live.length + '|' + Math.round(r * 2) + '|' + (live.at(-1)?.u ?? '');
  if (growing || key !== fieldKey) {
    compKey = ''; // the patches changed: recompose below
    const m = mask.getContext('2d', { willReadFrequently: true });
    m.clearRect(0, 0, TW, TH);
    for (const it of live) {
      const ri = r * Math.min(1, Math.max(0, (t - it.born) / 2)) ** .5;
      if (ri < 1) continue;
      for (const dx of [-TW, 0, TW]) {
        const x = it.u + dx;
        if (x < -ri || x > TW + ri) continue;
        const gr = m.createRadialGradient(x, it.v, 0, x, it.v, ri);
        gr.addColorStop(0, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        m.fillStyle = gr; m.fillRect(x - ri, it.v - ri, ri * 2, ri * 2);
      }
    }
    fieldPx = m.getImageData(0, 0, TW, TH).data; fieldKey = key;
  }
  // the texture only changes when a texel crosses its threshold: recompose per 0.05% of healing, not per frame (the spin is in globe())
  const ck = fieldKey + '|' + Math.round(heal * 2000);
  if (ck === compKey) return;
  compKey = ck;
  const o = compImg.data;
  for (let i = 0, j = 3; i < thr.length; i++, j += 4) {
    const f = fieldPx[j] / 255, src = thr[i] < heal || f > rim[i] ? lushPx : thr[i] < heal + .015 || f > rim[i] - .08 ? midPx : deadPx;
    o[j - 3] = src[j - 3]; o[j - 2] = src[j - 2]; o[j - 1] = src[j - 1]; o[j] = 255;
  }
  comp.getContext('2d').putImageData(compImg, 0, 0);
}

// ---------- layout ----------
// The scene is drawn 1:1 into a low-res buffer, then scaled onto the screen with nearest-neighbour, so it stays sharp at any zoom.
const $ = id => document.getElementById(id);
const cv = $('c'), out = cv.getContext('2d'), panel = $('panel'), buf = mk(1, 1), ctx = buf.getContext('2d'), P = pen(ctx);
// film grain tile in device pixels (laid over the scaled scene, so specks stay one screen pixel at any zoom)
const grainPat = out.createPattern((() => {
  const c = mk(256, 256), g = c.getContext('2d'), im = g.createImageData(256, 256), d = im.data;
  for (let i = 0; i < 65536; i++) {
    const n = hash(i & 255, i >> 8, 9), j = i * 4;
    if (n < .14) d.set([10, 8, 20, 60], j); else if (n > .95) d.set([255, 255, 255, 18], j);
  }
  g.putImageData(im, 0, 0);
  return c;
})(), 'repeat');
// Sky systems sit on one ring just outside the atmosphere, evenly spaced across the upper half (angle in degrees,
// 0 = right, -90 = straight up). Ground systems stand on the ground line instead, at x planet radii from centre:
// only working buildings on the ground, no filler.
const ORBIT = 1.32, GX = 1.2;
const SLOT = [
  { a: -30 },                 // laser: upper right, aimed down at the planet
  { a: -90 },                 // solar mirror: straight above
  { a: -150 },                // drone rig: upper left
  { x: GX, ground: true },    // comet launcher: pad on the right
  { x: -GX, ground: true },   // bio seeder: greenhouse on the left
  { x: 0, ground: true },     // terra core: reactor in front of the planet
];
for (const sl of SLOT) if (!sl.ground) { const r = sl.a * Math.PI / 180; sl.x = Math.cos(r) * ORBIT; sl.y = Math.sin(r) * ORBIT; }
const HIT = 20; // touch radius in scene pixels (40+ CSS px), a bit larger than the sprites
let K, PX, W, H, R0, R, CX, CY, GY, TOP, SIDE, FY = 1, layoutH = 0, city = [], cityCv, cityN = -1, ridge = [];
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
  if (!(cam.ax > 0)) Object.assign(cam, { fx: W / 2, fy: H / 2, ax: W / 2, ay: H / 2 }); // centre the camera at the first real layout: embeds (itch.io) can start at 0x0, and centring on that gave NaN forever
  // self-check: every system on screen, below the HUD, out of the stat boxes, and no two overlapping
  const box = s => { const [x, y] = sysPos(s, 0), w = look(s).lit.width, h = look(s).lit.height; return [x - w / 2, y - h / 2, x + w / 2, y + h / 2]; };
  const bs = SYS.map((_, s) => box(s));
  console.assert(bs.every(([l, t, r, b]) => l >= 0 && r <= W && t - 8 >= TOP && b <= GY + 1 && !(l < SIDE.r && t < SIDE.b)), 'system off screen or under the HUD', bs);
  console.assert(bs.every((a, i) => bs.every((b, j) => i === j || a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1])), 'systems overlap', bs);
}
// Planet sits low behind the ground line; the systems stand and hang around it.
function layout() {
  const top = $('top').getBoundingClientRect().bottom / PX, bar = $('bar').offsetHeight / PX;
  $('side').style.top = top * PX + 12 + 'px';
  const sr = $('side').getBoundingClientRect();
  $('toast').style.top = (innerWidth < 640 ? sr.bottom + 10 : top * PX + 12) + 'px'; // phones: under the stat boxes, full width
  $('contract').style.top = top * PX + 12 + 'px'; // a right-hand column level with the stat boxes: clear of the goal bar and the systems
  TOP = top + 4; SIDE = { r: sr.right / PX, b: sr.bottom / PX };
  GY = Math.round(H - bar - 14); // ground line
  // planet as big as fits: the outer ground systems (GX, wider than the ring's cos 30° x ORBIT) plus a sprite half-width across,
  // the top system (ORBIT + sprite + label) above a centre that sits .45R over the ground.
  // Portrait screens are width-bound: the ground systems move in to the planet's edge (x = 1R, clear of its visible rim)
  // and the planet rises out of the ground a little, so the tall sky is not left empty.
  const portrait = H > W * 1.2, gx = portrait ? 1 : GX, fit = (GY - TOP - 28) / (ORBIT + .45);
  R0 = Math.max(10, Math.min(W * .42, (W / 2 - 19) / gx, fit));
  const lift = portrait ? Math.min(.35 * R0, (fit - R0) * (ORBIT + .45) * .5) : 0;
  for (const sl of SLOT) if (sl.ground) sl.x = Math.sign(sl.x) * gx;
  CX = Math.round(W / 2); CY = Math.round(GY - R0 * .45 - lift);
  FY = Math.max(1, Math.min(1.15, (CY - TOP - 30) / (ORBIT * R0))); // tall screens: a slight upward stretch, still hugging the planet
  // low background colony: a mix of building types, leaving open ground around the ground systems.
  // It grows outward from the core as the planet heals (see drawColony), so `city` is sorted by distance from the centre.
  const clear = SYS.map((_, s) => SLOT[s].ground && [CX + SLOT[s].x * R0 - look(s).lit.width / 2 - 4, CX + SLOT[s].x * R0 + look(s).lit.width / 2 + 4]).filter(Boolean);
  const kinds = ['office', 'tower', 'band', 'dome', 'office', 'needle', 'band', 'tower'];
  city = [];
  for (let x = 1, n = 0; x < W - 6; n++) {
    const type = kinds[n % kinds.length], w = type === 'needle' ? 7 : type === 'tower' ? 7 + n % 3 : 10 + n * 5 % 8;
    const h = { office: 8 + n * 7 % 5, tower: 12 + n * 3 % 5, band: 8 + n * 5 % 4, dome: 6, needle: 16 + n % 4 }[type];
    if (x + w < W && !clear.some(([a, b]) => x < b && x + w > a)) city.push({ x, w, h, type });
    x += w + 3 + n % 4;
  }
  // distant mountains along the horizon: ridged noise gives sharp peaks; a second scale hides the 256px wrap
  ridge = Array.from({ length: W }, (_, x) => Math.round(12 + 30 * (1 - Math.abs(2 * vnoise(x, 0, 32, 4) - 1)) + 10 * vnoise(x * .7 + 9, 3, 64, 5)));
  city.sort((a, b) => Math.abs(a.x + a.w / 2 - CX) - Math.abs(b.x + b.w / 2 - CX));
  cityN = -1; // redraw at the new size, without dust puffs
}
let resizeTimer;
addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); }); // dragging a window: rebuild once it settles
// Where system s is drawn, tapped, fired from and bracketed. Only motion: a 1px idle bob.
function sysPos(s, t) {
  const sl = SLOT[s], h = look(s).lit.height, w = look(s).lit.width;
  let x = CX + sl.x * R0, y = sl.ground ? GY - h / 2 : CY + sl.y * R0 * FY + Math.sin(t * 1.5 + s * 1.3);
  x = Math.max(w / 2 + 2, Math.min(W - w / 2 - 2, x));
  if (!sl.ground) y = Math.max(TOP + h / 2 + 10, y); // room for the label above
  if (x - w / 2 < SIDE.r && y - h / 2 < SIDE.b) y = SIDE.b + h / 2 + 10; // never under the stat boxes
  return [Math.round(x), Math.round(y)];
}
const muzzle = s => { const [x, y] = sysPos(s, last), [dx, dy] = MUZZLE[SYS[s].id] || [0, 0]; return [x + dx, y + dy]; };

// Dot-grid stars like a printed star chart.
const stars = [];
for (let y = 3; y < 1000; y += 9) for (let x = 3; x < 2000; x += 9) if ((x * 7 + y * 13) % 5 < 2) stars.push([x + (x * y) % 4, y + (x + y) % 3, (x * 31 + y) % 7]);
const parts = [], floats = [], shots = [], beams = [], pulses = [];
const bots = Array.from({ length: 40 }, (_, k) => [(k * 97.3) % TW, 18 + (k * 53.7) % (TH - 36)]); // crew walking the surface
let off = 0, shake = 0, flash = 0, last = 0, zoom = 1, stage = 0, sel = -1;
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
function text(str, x, y, col = C.line, big = 1) { // centred on x (kept on screen), bottom at y+5; dark shadow keeps it readable over the planet
  const z = glyphZ() * big, half = textW(str) * big / 2;
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
  const a = Math.PI + Math.random() * Math.PI, d = R * .8 * Math.sqrt(Math.random()); // upper half: the lower half is behind the ground
  const tx = CX + Math.cos(a) * d, ty = CY + Math.sin(a) * d, [sx, sy] = muzzle(s), shot = SYS[s].shot;
  play(shot, real ? 1 : .35);
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
  if (shot === 'arc') { beams.push({ x1: sx, y1: sy, x2: tx, y2: ty, life: 1, col: C.zap, end: true, fade: 4, zig: true }); return land(s, tx, ty, real); }
  if (shot === 'annihilate') { // white beam, then a shockwave ring where it hits
    beams.push({ x1: sx, y1: sy, x2: tx, y2: ty, life: 1, col: C.line, w: 3, end: true, fade: 3 });
    pulses.push({ x: tx, y: ty, r: 2, life: 1, col: C.line });
    return land(s, tx, ty, real);
  }
  if (shot === 'rocks') { // a spray of three chunks; only the first one pays out and leaves a patch
    for (let k = 0; k < 3; k++) shots.push({ s, sx, sy, tx: tx + (k - 1) * 7, ty: ty + (Math.random() - .5) * 8, t: 0, dur: .8 + k * .12, real: real && !k, quiet: k > 0 });
    return;
  }
  const dur = { rod: .28, lava: 1.1, gas: 1.7 }[shot] ?? .7 + Math.random() * .3; // rods are fast, lava bombs lob, gas drifts
  shots.push({ s, sx, sy, tx, ty, t: 0, dur, real });
}
// Seconds between automatic shots: more crew fires faster.
const cadence = s => Math.max(.6, 4 / Math.sqrt(1 + S.L[s][0]));
function land(s, x, y, real, quiet) { // quiet: extra chunks of a spray, no pop-up
  const shot = SYS[s].shot, big = ['rocket', 'pulse', 'rod', 'lava', 'annihilate'].includes(shot);
  burst(x, y, shot === 'lava' ? [C.lava, C.sun, C.line] : shot === 'arc' ? [C.zap, C.line] : [C.line, C.pink, C.soft], real ? 24 : quiet ? 3 : 7, big ? 60 : 35);
  if (big) { shake = Math.max(shake, real ? .7 : .2); play('boom', real ? 1 : .3); }
  if (quiet) return;
  if (real) { const [u, v] = texPos(x, y); items.push({ u, v, born: last }); if (items.length > 300) items.splice(0, items.length - 150); }
  // damage pop-up: what this system earns per shot, so the numbers match the real income
  floats.push({ x, y: y - 8, text: '+' + fmt(sysOut(s) * cadence(s) * (ev?.id === 'flare' ? .5 : 1)), life: 1.4, col: '#ffd6e0' }); // light pink: readable on any planet; a flare fires twice as often
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
// Hard-edged light bands: per row, fill the part of the planet outside (or inside) the circle at (CX+lx, CY+ly) radius lr.
function band(lx, ly, lr, col, inside) {
  ctx.fillStyle = col;
  for (let dy = -R; dy < R; dy++) {
    const hw = Math.sqrt(R * R - (dy + .5) ** 2), l2 = lr * lr - (dy + .5 - ly) ** 2;
    const span = (a, b) => { a = Math.round(CX + Math.max(-hw, a)); b = Math.round(CX + Math.min(hw, b)); if (b > a) ctx.fillRect(a, CY + dy, b - a, 1); };
    if (l2 <= 0) { if (!inside) span(-hw, hw); continue; }
    const lw = Math.sqrt(l2);
    if (inside) span(lx - lw, lx + lw); else { span(lx + lw, hw); span(-hw, lx - lw); }
  }
}
// Cartoon sphere lighting, sun at the top-left: highlight, two shadow steps, and a thin back-light on the dark limb.
function shadeGlobe(glow) {
  band(-R * .42, -R * .42, R * .5, 'rgba(255,255,255,.1)', true);
  band(-R * .3, -R * .25, R * .95, 'rgba(20,18,40,.22)');
  band(-R * .3, -R * .25, R * 1.08, 'rgba(20,18,40,.4)');
  ctx.fillStyle = `rgb(${glow})`;
  for (let i = 0, n = Math.ceil(R * 7); i < n; i++) {
    const a = i / n * 2 * Math.PI, x = Math.round(CX + Math.cos(a) * (R - 1)), y = Math.round(CY + Math.sin(a) * (R - 1));
    if (Math.hypot(x - CX + R * .3, y - CY + R * .25) > R * 1.2) ctx.fillRect(x, y, 1, 1);
  }
}
// The healed planet comes alive: lightning in the clouds (50%+), birds circling (75%+), an aurora over the pole (100%).
let bolt = null; // { x, y, life, seed }: the current lightning strike, spawned in stepLife()
function stepLife(dt, heal) {
  if (bolt && (bolt.life -= dt * 4) <= 0) bolt = null;
  if (!bolt && heal >= .5 && !calm() && Math.random() < dt * .35) { // about one strike every 3 s
    const a = Math.random() * 2 * Math.PI, d = R * .7 * Math.sqrt(Math.random());
    bolt = { x: CX + Math.cos(a) * d, y: CY - R * .15 + Math.sin(a) * d * .6, life: 1, seed: Math.random() * 1e3 };
  }
}
function drawLife(t, heal) {
  if (calm()) t = 0; // reduced motion: everything holds still
  if (bolt) { // a short forked zigzag with a bright flash at the top
    ctx.globalAlpha = bolt.life; let x = bolt.x, y = bolt.y;
    P.fill(x - 1, y - 1, 3, 3, C.line);
    for (let k = 1; k <= 4; k++) { const nx = x + (hash(k, 1, bolt.seed) - .5) * 6, ny = y + 3 + hash(k, 2, bolt.seed) * 3; P.line(x, y, nx, ny, C.zap); x = nx; y = ny; }
    ctx.globalAlpha = 1;
  }
  if (heal >= .75) for (let k = 0; k < 5; k++) { // birds on the near side of the globe, wings flapping
    const a = t * .35 + k * .45, x = Math.round(CX + Math.cos(a) * R * .75), y = Math.round(CY - R * .45 + Math.sin(a * 2 + k) * R * .08 + k * 3);
    if (Math.sin(a) < 0) continue; // behind the planet
    const up = Math.sin(t * 9 + k * 2) > 0 ? -2 : 0; // wings up or level
    for (const [dx, dy] of [[-3, up], [-2, up / 2], [-1, 0], [0, 1], [1, 0], [2, up / 2], [3, up]]) { P.dot(x + dx, y + dy + 1, C.sil); P.dot(x + dx, y + dy, C.line); } // white gull, dark underside
  }
  if (heal >= 1) for (let x = -Math.round(R * .62); x <= R * .62; x++) { // aurora curtains just inside the north limb
    const top = CY - Math.sqrt(R * R - x * x) * .9, h = Math.round(R * .1 + R * .05 * Math.sin(x * .18 + t * 1.4) + R * .03 * Math.sin(x * .05 - t * .7));
    ctx.globalAlpha = .5 + .25 * Math.sin(x * .3 + t * 2);
    P.fill(CX + x, Math.round(top), 1, h, Math.sin(x * .07 + t * .3) > 0 ? '#7dffb0' : '#8fe3ff');
    ctx.globalAlpha *= .5; P.fill(CX + x, Math.round(top) + h, 1, Math.round(h * .6), '#7dffb0'); // soft lower fringe
  }
  ctx.globalAlpha = 1;
}
let moonAt = null, moonI = 0, moonReady = 0;
function drawMoon(x, y, k) { // k: 0..1 while it grows in
  const r = Math.max(1, Math.round(R * .12 * k));
  for (let dy = -r; dy <= r; dy++) { const dx = Math.round(Math.sqrt(r * r - dy * dy)); P.fill(x - dx, y + dy, dx * 2 + 1, 1, C.soft); P.fill(x + Math.round(r * .3), y + dy, Math.max(0, dx - Math.round(r * .3)) + 1, 1, C.dim); }
}

// Colony buildings (the first n of `city`), drawn with pen p into cityCv, then dimmed with the sprites' grit so they stay
// in the background. Antenna tips are listed in `lights` and blink in drawColony.
const lights = [];
function drawCity(p, n) {
  lights.length = 0;
  for (const { x, w, h, type } of city.slice(0, n)) {
    const y = GY - h;
    if (type === 'needle') { p.box(x + 2, y + 9, 3, h - 9, C.bg, false); p.box(x, y + 4, 7, 6); p.fill(x + 3, y + 1, 1, 3, C.line); lights.push([x + 3, y]); continue; }
    if (type === 'dome') { p.disc(x + (w >> 1), GY - 1, (w >> 1) - 1, C.bg, true); p.box(x + (w >> 1) - 1, GY - 3, 3, 3, C.bg, false); continue; }
    p.box(x, y, w, h, C.bg, false);
    if (type === 'office') for (let wy = y + 2; wy < GY - 3; wy += 4) for (let wx = x + 2; wx + 2 <= x + w - 2; wx += 3) p.fill(wx, wy, 2, 2, C.line);
    if (type === 'tower') { for (let wx = x + 2; wx < x + w - 2; wx += 2) p.line(wx, y + 2, wx, GY - 2, C.dim); p.fill(x + (w >> 1), y - 4, 1, 4, C.line); lights.push([x + (w >> 1), y - 5]); }
    if (type === 'band') for (let wy = y + 2; wy < GY - 1; wy += 3) p.line(x + 2, wy, x + w - 3, wy, C.dim);
  }
}
// The colony grows with the planet: 40% of the buildings at 0%, all of them at 100%. A rover patrols the ground.
const ROVER = tiny(['.www...', 'wnnwww.', 'wwwwwww', '.w.w.w.']);
function drawColony(t, heal) {
  const n = Math.ceil(city.length * (.4 + .6 * heal));
  if (n !== cityN) {
    if (cityN >= 0) for (const b of city.slice(cityN, n)) burst(b.x + b.w / 2, GY - 2, [C.soft, C.dim], 10, 22); // dust as a new building goes up
    cityN = n; cityCv = mk(W, H);
    drawCity(pen(cityCv.getContext('2d', { willReadFrequently: true })), n);
    grit(cityCv, 3, (x, y) => .4 - Math.max(0, Math.min(.3, (y - (GY - 20)) / 60))); // dim: outlines stay grey, darker toward the ground
  }
  ctx.drawImage(cityCv, 0, 0);
  for (const [x, y] of lights) if (Math.sin(t * 2 + x * .7) > 0) P.dot(x, y, C.pink);
  const rx = (t * 9) % (W + 20) - 10;
  blit(ROVER, rx, GY - 2);
  if (Math.random() < .15) parts.push({ x: rx - 4, y: GY - 1, vx: -4, vy: -3, life: .5, color: C.dim });
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

const canAct = s => S.on[s] ? S.L[s].some((l, k) => l < MAXL && S.life >= price(s, k)) : unlocked(s) && S.life >= unlockCost(s);

// A system: shaded line-art when unlocked, dim outline when next, dotted silhouette otherwise.
function drawSystem(s, t) {
  const lk = look(s), m = S.on[s] ? markOf(s) : 0, img = S.on[s] ? lk.marks[m] : unlocked(s) ? lk.next : lk.sil, [x, y] = sysPos(s, t);
  if (m === 3) { ctx.globalAlpha = .25 + .15 * (calm() ? 1 : Math.sin(t * 3)); P.ring(x, y, img.width / 2 + 4, img.height / 2 + 4, 0, 2 * Math.PI, C.sun); ctx.globalAlpha = 1; } // Mark IV halo
  blit(img, x, y);
}
// Labels, price tags, pink dots and selection brackets go on top of every system, so nothing hides them.
function drawMarks(s, t) {
  const on = S.on[s], img = look(s).lit;
  const [x, y] = sysPos(s, t), w = img.width, h = img.height, x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
  if (on) text(`${S.L[s][0] + S.L[s][1] + S.L[s][2]}/${MAXL * 3}`, x, y0 - 8);
  else if (unlocked(s)) { // price tag: energy icon + amount, kept on screen as one unit
    const label = fmt(unlockCost(s)), lw = textW(label), total = 9 + lw, left = Math.max(1, Math.min(W - total - 2, Math.round(x - total / 2)));
    ctx.drawImage(T.energy, left, y0 - 10);
    text(label, left + 9 + lw / 2, y0 - 8, C.soft);
  }
  if (canAct(s)) P.fill(x0 + w + 1, y0 - 4, 3, 3, C.pink);
  if (on) for (let k = 0; k < markOf(s); k++) P.fill(x0 + w + 1, y0 + 2 + k * 4, 3, 3, C.sun); // mark pips down the right side
  if (sel === s) { // blinking selection brackets
    const col = calm() || Math.sin(t * 6) > 0 ? C.line : C.soft, l = x0 - 4, r = x0 + w + 3, tp = y0 - 4, bt = y0 + h + 3;
    for (const [bx, by, dx, dy] of [[l, tp, 1, 1], [r, tp, -1, 1], [l, bt, 1, -1], [r, bt, -1, -1]]) { P.fill(Math.min(bx, bx + dx * 4), by, 5, 1, col); P.fill(bx, Math.min(by, by + dy * 4), 1, 5, col); }
  }
}

function draw(t, heal) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  for (const [x, y, k] of stars) if (x < W && y < H && (k || Math.sin(t * 2 + x) > -.5)) P.dot(x, y, k > 4 ? C.soft : C.dot);
  // atmosphere: the world's dead glow fading to its alive glow (colour stepped so the dithered ring is rarely rebuilt)
  const { dg, ag } = world(), c = ev?.id === 'flare' ? '255,224,136' : dg.map((d, k) => Math.round(d + (ag[k] - d) * heal) & ~7).join(','); // a flare lights the whole atmosphere gold
  const halo = haloRing(c), hs = Math.round(halo.width * R / Math.round(R0)); // hs = halo size at the current (zoomed) radius
  ctx.drawImage(halo, Math.round(CX - hs / 2), Math.round(CY - hs / 2), hs, hs);

  ridge.forEach((h, x) => { P.fill(x, GY - h, 1, h, C.deep); P.dot(x, GY - h, C.dim); }); // dark mountains, behind the planet
  const ma = t * .2, moon = [Math.round(CX + Math.cos(ma) * R * 1.2), Math.round(CY + Math.sin(ma) * R * .36 - Math.cos(ma) * R * .1)], front = Math.sin(ma) > 0;
  // milestones ease in over a few % of healing instead of popping: moon at 25%, clouds at 50%, rings at 75%
  const ramp = at => Math.max(0, Math.min(1, (heal - at) / .03)), mo = ramp(.25), ck = ramp(.5), rk = ramp(.75), rr = R * (1.1 + .28 * rk);
  if (rk) P.ring(CX, CY, rr, rr * .145, Math.PI, 2 * Math.PI);
  moonAt = mo ? { x: moon[0], y: moon[1], r: Math.max(1, Math.round(R * .12 * mo)), front } : null; // for taps
  if (mo && !front) drawMoon(...moon, mo);
  compose(t, heal);
  globe(comp, off);
  if (ck) { ctx.globalAlpha = ck; globe(clouds, off * 1.7); ctx.globalAlpha = 1; }
  shadeGlobe(c);
  const crew = Math.min(bots.length, S.L.reduce((a, L, s) => a + (S.on[s] ? 1 + L[0] : 0), 0)); // one walker per crew member, capped
  for (let k = 0; k < crew; k++) { const f = facePos(bots[k][0], bots[k][1]); if (f) blit(T.bot, f[0], f[1] + (Math.sin(t * 4 + k) > .6 ? -1 : 0)); }
  drawLife(t, heal);
  if (rk) P.ring(CX, CY, rr, rr * .145, 0, Math.PI);
  if (mo && front) drawMoon(...moon, mo);
  for (const p of pulses) { ctx.globalAlpha = p.life; P.ring(p.x ?? CX, p.y ?? CY, p.r, p.r, 0, 2 * Math.PI, p.col || C.pink); } // planet-wide or at an impact
  ctx.globalAlpha = 1;

  P.fill(0, GY, W, H - GY, C.deep); P.fill(0, GY, W, 1, C.line); // ground
  drawColony(t, heal);
  SYS.forEach((_, s) => drawSystem(s, t));
  if (!photo) SYS.forEach((_, s) => drawMarks(s, t)); // a photo is the scene only: no labels, prices or brackets

  for (const s of shots) {
    const k = s.t / s.dur, x = s.sx + (s.tx - s.sx) * k, shot = SYS[s.s].shot;
    const y = s.sy + (s.ty - s.sy) * k - (shot === 'lava' ? Math.sin(k * Math.PI) * 28 : 0); // lava bombs arc up first
    if (shot === 'rocket') { blit(T.missile, x, y); parts.push({ x, y, vx: (Math.random() - .5) * 6, vy: (Math.random() - .5) * 6, life: .5, color: Math.random() < .5 ? C.pink : C.line }); }
    else if (shot === 'drone') blit(T.drone, x, y);
    else if (shot === 'rod') { const dx = (s.tx - s.sx) * .08, dy = (s.ty - s.sy) * .08; P.line(x - dx, y - dy, x, y, C.line); P.line(x - dx + 1, y - dy, x + 1, y, C.soft); } // streak
    else if (shot === 'rocks') { P.fill(x - 1, y - 1, 2, 2, '#b8a99a'); if (Math.random() < .5) parts.push({ x, y, vx: 0, vy: 0, life: .3, color: C.dim }); }
    else if (shot === 'lava') { P.fill(x - 1, y - 1, 3, 3, C.lava); P.dot(x, y, C.sun); parts.push({ x, y, vx: (Math.random() - .5) * 8, vy: 6, life: .6, color: Math.random() < .5 ? C.lava : C.sun }); }
    else if (shot === 'gas') { // a puff that swells as it drifts
      const r = 2 + k * 5;
      ctx.globalAlpha = .7 - k * .3; P.ring(x, y, r, r * .8, 0, 2 * Math.PI, C.gas); P.ring(x + r * .6, y - 1, r * .6, r * .5, 0, 2 * Math.PI, C.gas); ctx.globalAlpha = 1;
    }
    else { P.fill(x - 1, y - 1, 2, 2, C.line); parts.push({ x, y, vx: 0, vy: 0, life: .4, color: C.soft }); }
  }
  for (const b of beams) { // w = width in pixels, a = opacity, end = flash at the impact point
    if (b.delay > 0) continue;
    ctx.globalAlpha = b.life * (b.a || 1);
    if (b.zig) { // lightning: a fresh zigzag every frame, so it flickers
      const nx = b.y1 - b.y2, ny = b.x2 - b.x1, len = Math.hypot(nx, ny) || 1;
      let px = b.x1, py = b.y1;
      for (let i = 1; i <= 7; i++) {
        const f = i / 7, j = i < 7 ? (Math.random() - .5) * 12 : 0, qx = b.x1 + (b.x2 - b.x1) * f + nx / len * j, qy = b.y1 + (b.y2 - b.y1) * f + ny / len * j;
        P.line(px, py, qx, qy, b.col); px = qx; py = qy;
      }
    } else for (let o = 0; o < (b.w || 1); o++) P.line(b.x1 + o, b.y1, b.x2 + o, b.y2, b.col);
    if (b.end) P.fill(b.x2 - 1, b.y2 - 1, 3, 3, C.line);
  }
  if (!photo) drawCrate(t);
  for (const m of meteors) { P.line(m.x - m.vx * .08, m.y - m.vy * .08, m.x, m.y, C.sun); P.dot(m.x, m.y, C.line); } // streaks
  if (comet) { // gold head with a long fading tail; the pulsing ring says "tap me"
    for (let k = 1; k < 22; k++) { ctx.globalAlpha = 1 - k / 22; for (const dy of [0, 1]) P.dot(comet.x - k * 2, comet.y + dy + (k > 8 ? Math.round(Math.sin(k * .7 + t * 8)) : 0), k < 8 ? C.sun : C.soft); }
    ctx.globalAlpha = .5 + .3 * (calm() ? 1 : Math.sin(t * 6)); P.ring(comet.x, comet.y, 7, 7, 0, 2 * Math.PI, C.sun);
    ctx.globalAlpha = 1; P.fill(comet.x - 2, comet.y - 2, 5, 5, C.sun); P.fill(comet.x - 1, comet.y - 1, 3, 3, C.line);
  }
  for (const q of parts) { ctx.globalAlpha = q.life; P.dot(q.x, q.y, q.color); }
  if (!photo) for (const f of floats) { ctx.globalAlpha = f.life; text(f.text, f.x, f.y, f.col); }
  ctx.globalAlpha = 1;
  if (combo >= 3 && !photo) { // combo counter over the upper-left of the planet, fading as the chain runs out of time
    ctx.globalAlpha = Math.max(.3, 1 - (t - comboAt) / COMBO_GAP);
    text(`${combo}` + (comboMul() > 1 ? ` x${comboMul()}` : ''), CX - R * .55, CY - R * .8, comboMul() > 1 ? C.sun : C.line, 2);
    ctx.globalAlpha = 1;
  }

  // first-run hints: tap the planet, then the Laser Station once it's affordable
  const bob = Math.round(Math.sin(t * 6) * 2);
  if (photo) return; // takePhoto() reads the scene buffer itself
  if (!S.taps) blit(T.hand, CX + R * .2, CY - R * .3 + bob);
  else if (!S.on[0] && sel !== 0 && S.life >= unlockCost(0)) { const [x, y] = sysPos(0, t); blit(T.hand, x, y + 18 + bob); }

  present(t);
}
// Screen: the scene buffer scaled up with nearest-neighbour, then grain and the warp flash.
function present(t) {
  out.imageSmoothingEnabled = false;
  out.fillStyle = C.bg; out.fillRect(0, 0, cv.width, cv.height);
  const [ox, oy] = camOrigin(), still = calm(), sx = shake && !still ? Math.round((Math.random() - .5) * shake * 6) : 0, sy = shake && !still ? Math.round((Math.random() - .5) * shake * 6) : 0;
  out.drawImage(buf, (ox + sx) * K, (oy + sy) * K, W * cam.z * K, H * cam.z * K);
  const gx = still ? 0 : (t * 7 | 0) % 8 * 31, gy = still ? 0 : (t * 5 | 0) % 8 * 17; // fine grain: one screen pixel per speck, shifted a few times a second (held still for reduced motion)
  out.save(); out.translate(-gx, -gy); out.fillStyle = grainPat; out.fillRect(gx, gy, cv.width, cv.height); out.restore();
  if (flash && !still) { out.fillStyle = `rgba(233,236,245,${flash})`; out.fillRect(0, 0, cv.width, cv.height); } // warp flash
}

// ---------- sound: chiptune effects and music, all synthesized with Web Audio (no files) ----------
// Browsers only allow audio after a user gesture, so the context starts on the first tap or key press.
const PREF = 'terraform-sound'; // per-viewer toggles, kept apart from the save: sound, music, calm (reduced motion), big (large text)
const pref = { sfx: true, music: true, calm: null, big: false }; // calm null = follow the system's reduced-motion setting
try { Object.assign(pref, JSON.parse(localStorage.getItem(PREF)) || {}); } catch { /* storage blocked: defaults */ }
const savePref = () => { try { localStorage.setItem(PREF, JSON.stringify(pref)); } catch { /* not remembered */ } };
const calm = () => pref.calm ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
let AC, sfxBus, musicBus, noiseBuf;
function audioOn() {
  if (AC) { if (AC.state === 'suspended' && !document.hidden) AC.resume(); return; }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return; // no Web Audio: play silently
  AC = new Ctx();
  const comp = AC.createDynamicsCompressor(); // keeps stacked shots from clipping
  comp.connect(AC.destination);
  sfxBus = AC.createGain(); sfxBus.connect(comp);
  const warm = AC.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 2400; warm.connect(comp);
  musicBus = AC.createGain(); musicBus.connect(warm);
  setBuses();
  noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  startMusic();
}
addEventListener('pointerdown', audioOn); addEventListener('keydown', audioOn);
document.addEventListener('visibilitychange', () => { if (AC) document.hidden ? AC.suspend() : AC.resume(); }); // silent in background tabs
const setBuses = () => { if (!AC) return; sfxBus.gain.value = pref.sfx ? .8 : 0; musicBus.gain.value = pref.music ? .5 : 0; };
// One oscillator note: f (Hz) sliding to f2, envelope attack -> vol -> (hold) -> release. t: absolute start time.
function tone({ f, f2, type = 'square', dur = .1, vol = .1, at = 0, t, attack = .005, release, bus = sfxBus }) {
  t ??= AC.currentTime + at;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack);
  if (release) g.gain.setValueAtTime(vol, t + dur - release);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(bus); o.start(t); o.stop(t + dur + .05);
}
// Filtered noise burst (whooshes, crackles, booms); freq slides to f2.
function hiss({ dur = .2, vol = .1, at = 0, freq = 1000, f2, kind = 'lowpass', q = 1 }) {
  const t = AC.currentTime + at, src = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain();
  src.buffer = noiseBuf; fl.type = kind; fl.Q.value = q; fl.frequency.setValueAtTime(freq, t);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  src.connect(fl).connect(g).connect(sfxBus); src.start(t); src.stop(t + dur + .05);
}
const arp = (fs, gap, o) => fs.forEach((f, i) => tone({ ...o, f, at: i * gap }));
// k scales the volume: purchases and taps play full, automatic shots quietly so constant fire stays in the background
const SFX = {
  tap: () => tone({ f: 620 + Math.random() * 90, f2: 940, dur: .06, vol: .07 }),
  crit: () => arp([880, 1320, 1760, 2640], .035, { type: 'triangle', dur: .09, vol: .08 }),
  buy: () => arp([523, 659, 784], .045, { dur: .08, vol: .06 }),
  unlock: () => arp([392, 523, 659, 784, 1047], .06, { dur: .18, vol: .07 }),
  deny: () => tone({ f: 180, f2: 130, dur: .14, vol: .06 }),
  ui: () => tone({ f: 520, dur: .04, vol: .04, type: 'triangle' }),
  coin: () => { tone({ f: 988, dur: .07, vol: .07 }); tone({ f: 1319, dur: .22, vol: .07, at: .07 }); },
  talent: () => arp([659, 988, 1319, 1976], .05, { type: 'triangle', dur: .25, vol: .07 }),
  milestone: () => arp([523, 659, 784, 1047, 1319], .09, { type: 'triangle', dur: .4, vol: .07 }),
  warp: () => { tone({ f: 90, f2: 1800, dur: 1.3, vol: .08, type: 'sawtooth' }); hiss({ dur: 1.3, vol: .06, freq: 200, f2: 6000, kind: 'bandpass', q: 2 }); },
  talk: () => tone({ f: 220 + Math.random() * 140, dur: .035, vol: .025 }),
  boom: k => hiss({ dur: .35, vol: .14 * k, freq: 500, f2: 50 }),
  beam: k => tone({ f: 1500, f2: 260, dur: .13, vol: .05 * k, type: 'sawtooth' }),
  light: k => tone({ f: 1100, f2: 1900, dur: .3, vol: .04 * k, type: 'sine', attack: .05 }),
  drone: k => tone({ f: 190, f2: 240, dur: .35, vol: .035 * k, type: 'square', attack: .05 }),
  rocket: k => hiss({ dur: .6, vol: .1 * k, freq: 300, f2: 2000, kind: 'bandpass', q: 3 }),
  pod: k => tone({ f: 480, f2: 240, dur: .1, vol: .05 * k, type: 'triangle' }),
  pulse: k => tone({ f: 90, f2: 40, dur: .6, vol: .14 * k, type: 'sine' }),
  rod: k => tone({ f: 2400, f2: 300, dur: .28, vol: .035 * k, type: 'square' }),
  arc: k => { hiss({ dur: .2, vol: .09 * k, freq: 3500, kind: 'highpass' }); tone({ f: 60, dur: .2, vol: .05 * k, type: 'sawtooth' }); },
  rocks: k => hiss({ dur: .18, vol: .07 * k, freq: 900, kind: 'bandpass', q: 4 }),
  lava: k => tone({ f: 140, f2: 420, dur: .35, vol: .05 * k, type: 'triangle' }),
  gas: k => hiss({ dur: .7, vol: .05 * k, freq: 700, f2: 300 }),
  annihilate: k => { tone({ f: 70, f2: 28, dur: .9, vol: .2 * k, type: 'sine' }); hiss({ dur: .5, vol: .08 * k, freq: 3000, f2: 150 }); },
};
// Haptics: a short buzz on phones that support it, tied to the sound-effects toggle (no-op elsewhere).
const buzz = ms => { if (pref.sfx) try { navigator.vibrate?.(ms); } catch { /* not allowed here (iframe, desktop) */ } };
const lastPlay = {};
function play(name, k = 1) {
  if (!AC || AC.state !== 'running' || !pref.sfx || !SFX[name]) return;
  const now = AC.currentTime;
  if (now - (lastPlay[name] || 0) < .06) return; // the same sound piling up in one instant is just louder noise
  lastPlay[name] = now;
  SFX[name](k);
}

// Background music: a slow spacey loop (Am F C G in A minor, shifted per world), 16th-note grid, scheduled a little ahead of the clock.
// Each world sets its own tempo and key (WORLDS[].music); a change lands on the next chord, so a warp never cuts a note short.
const mood = () => world().music || [80, 0], STEP = () => 60 / mood()[0] / 4, mtof = m => 440 * 2 ** ((m - 69) / 12);
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], SPARK = [69, 72, 74, 76, 79, 81];
let mStep = 0, mNext = 0;
function startMusic() {
  mNext = AC.currentTime + .2;
  setInterval(() => {
    if (AC.state !== 'running' || !pref.music) return; // muted: schedule nothing
    if (mNext < AC.currentTime) mNext = AC.currentTime + .05; // resumed after a pause or unmuted: don't play the backlog
    while (mNext < AC.currentTime + .35) { musicStep(mStep, mNext); mStep = (mStep + 1) % 64; mNext += STEP(); }
  }, 100);
}
let key = 0; // the key in use, switched only at a chord change
function musicStep(s, t) {
  const beat = s & 15, m = { t, bus: musicBus }, len = STEP(); // one 16th note at this world's tempo
  if (beat === 0) key = mood()[1];
  const ch = CHORDS[s >> 4].map(n => n + key);
  if (beat === 0) ch.forEach(n => tone({ ...m, f: mtof(n), type: 'triangle', dur: len * 16, vol: .035, attack: .6, release: 1 })); // pad
  if (beat % 8 === 0) tone({ ...m, f: mtof(ch[0] - 24), type: 'triangle', dur: len * 7, vol: .11, attack: .01, release: .4 }); // bass
  if (beat % 2 === 0) tone({ ...m, f: mtof(ch[[0, 1, 2, 1, 0, 2, 1, 2][beat >> 1]] + 12), type: 'square', dur: len * 1.8, vol: .018 }); // arpeggio
  if (beat === 10 && Math.random() < .4) tone({ ...m, f: mtof(SPARK[Math.random() * SPARK.length | 0] + 12 + key), type: 'sine', dur: len * 10, vol: .03, attack: .05, release: .8 }); // sparkle
}

// ---------- achievements: lifetime trophies, listed in the settings sheet ----------
const ACH = [
  ['light', 'First Light', 'Unlock your first system.', () => S.on.some(Boolean)],
  ['house', 'Full House', 'Six systems online on one world.', () => S.on.every(Boolean)],
  ['mk2', 'Refit', 'Raise any upgrade to Lv 10 (Mark II).', () => S.L.flat().some(l => l >= MARK_AT[0])],
  ['mk4', 'Flagship', 'Max out an upgrade (Lv 50, Mark IV).', () => S.L.flat().some(l => l >= MAXL)],
  ['tap100', 'Warm Hands', 'Tap the planet 100 times.', () => S.taps >= 100],
  ['tap1k', 'Calloused', 'Tap the planet 1,000 times.', () => S.taps >= 1000],
  ['tap10k', 'Kinetic', 'Tap the planet 10,000 times.', () => S.taps >= 1e4],
  ['crit', 'Lucky Strike', 'Land a critical tap.', () => S.n.crit > 0],
  ['moon', 'Moonrise', 'Capture a moon (25%).', () => healOf(S.earned) >= .25],
  ['rings', 'Ringed', 'Grow rings around a world (75%).', () => healOf(S.earned) >= .75],
  ['world', 'Green Thumb', 'Heal your first world.', () => S.world >= 1 || S.done],
  ['speed', 'Speedrunner', 'Heal a world in under 5 minutes.', () => Object.values(S.best).some(s => s < 300)],
  ['sector', 'Sector Chief', `Heal all ${WORLDS.length} worlds.`, () => S.world >= WORLDS.length],
  ['talent', 'Gifted', 'Unlock a talent.', () => S.tal.length > 0],
  ['comet', 'Comet Catcher', 'Catch a golden comet.', () => S.n.comet > 0],
  ['storm', 'Storm Chaser', 'Tap 100 times during meteor showers.', () => S.n.storm >= 100],
  ['night', 'Night Owl', 'Come back to an hour or more of offline earnings.', () => S.n.away >= 3600],
  ['rich', 'Millionaire', 'Hold a million life at once.', () => S.life >= 1e6],
  ['combo', 'Combo Master', 'Chain 25 taps in a row.', () => S.n.combo >= 25],
  ['crate', 'Supply Run', 'Open a daily supply drop.', () => S.n.crates > 0],
  ['moonie', 'Moonstruck', 'Find out what happens when you tap the moon.', () => S.n.moon > 0],
  ['contract', 'Contractor', 'Complete 5 contracts for the Commander.', () => S.n.contracts >= 5],
].map(([id, name, desc, test]) => ({ id, name, desc, test }));
function checkAch() { // 10x a second from updateUI; each test is a few comparisons
  for (const a of ACH) if (!S.ach.includes(a.id) && a.test()) { S.ach.push(a.id); toast(`ACHIEVEMENT: ${a.name}. ${a.desc}`, true); play('talent'); }
}
function renderAch() {
  $('acount').textContent = `${S.ach.length}/${ACH.length}`;
  set($('alist'), ACH.map(a => `<li class="${S.ach.includes(a.id) ? 'on' : ''}"><b>${a.name}</b><small>${a.desc}</small></li>`).join(''));
}

// ---------- settings: toggles, save code, new game (gear button in the life box) ----------
const GEAR = tiny(['...www...', '.w.wnw.w.', '.wwwnwww.', '.wn...nw.', 'www...www', '.wn...nw.', '.wwwnwww.', '.w.wnw.w.', '...www...']);
$('gear').innerHTML = `<img src="${GEAR.toDataURL()}" alt="">`;
const OPTS = [['music', 'Music'], ['sfx', 'Sound effects'], ['calm', 'Reduced motion'], ['big', 'Large text']];
const applyPref = () => { document.documentElement.classList.toggle('big', pref.big); document.documentElement.classList.toggle('calm', calm()); setBuses(); };
for (const [key, label] of OPTS) {
  const row = document.createElement('div'), b = document.createElement('button');
  row.className = 'srow'; row.append(label, b); b.className = 'tog';
  const sync = () => { const on = key === 'calm' ? calm() : pref[key]; b.textContent = on ? 'ON' : 'OFF'; b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', `${label} ${on ? 'on' : 'off'}`); };
  b.addEventListener('click', () => {
    pref[key] = key === 'calm' ? !calm() : !pref[key];
    sync(); savePref(); applyPref(); audioOn(); play('ui');
    if (key === 'big') resize(); // the HUD changed size: re-fit the scene
  });
  sync(); $('sopts').append(row);
}
applyPref();
let frozen = false; // true while a save is being replaced: the page's own autosave must not overwrite it
const toCode = s => btoa(unescape(encodeURIComponent(s))), fromCode = c => decodeURIComponent(escape(atob(c.trim())));
$('sexport').addEventListener('click', async () => {
  save();
  const code = toCode(localStorage.getItem(SAVE) || ''), ta = $('scode');
  ta.value = code; ta.focus(); ta.select();
  try { await navigator.clipboard.writeText(code); flashBtn($('sexport'), 'Copied'); } catch { flashBtn($('sexport'), 'Select and copy it'); }
});
$('simport').addEventListener('click', () => {
  let d = null;
  try { d = JSON.parse(fromCode($('scode').value)); } catch { /* not a code */ }
  if (!validSave(d)) return flashBtn($('simport'), 'Not a valid code'), play('deny');
  frozen = true;
  try { localStorage.setItem(SAVE, JSON.stringify(d)); } catch { frozen = false; return flashBtn($('simport'), 'Storage blocked'); }
  location.reload();
});
let armed = 0;
$('snew').addEventListener('click', () => { // two taps within 4s: everything is erased, so one tap is not enough
  if (!armed) { armed = setTimeout(() => { armed = 0; $('snew').textContent = 'New game'; $('snew').classList.remove('arm'); }, 4000); $('snew').textContent = 'Tap again to erase everything'; $('snew').classList.add('arm'); return; }
  frozen = true;
  location.href = location.pathname + '?reset';
});
function flashBtn(b, msg) { b.dataset.label ??= b.textContent; b.textContent = msg; clearTimeout(b._ft); b._ft = setTimeout(() => { b.textContent = b.dataset.label; }, 2000); } // the real label, even when clicked mid-flash
let setOpener = null;
function openSettings() {
  play('ui'); closePanel();
  setOpener = document.activeElement;
  $('settings').hidden = false; shield(true);
  renderAch();
  $('sclose').focus({ preventScroll: true });
}
function closeSettings() {
  if ($('settings').hidden) return;
  $('settings').hidden = true; shield(false);
  if (setOpener?.isConnected && setOpener !== document.body) setOpener.focus({ preventScroll: true });
}
$('gear').addEventListener('click', openSettings);
// Photo mode: the scene without HUD, labels or numbers, at 3x, with a caption bar; the share sheet on phones, a PNG download elsewhere.
let photo = false;
function takePhoto() {
  if (!W) return;
  photo = true; try { draw(last, healOf(S.earned)); } finally { photo = false; }
  const z = 3, h = Math.min(H, GY + 8), cap = 22 * z, c = mk(W * z, h * z + cap), g = c.getContext('2d'); // cropped just under the ground line (the bar lives below it)
  g.imageSmoothingEnabled = false;
  g.drawImage(buf, 0, 0, W, h, 0, 0, W * z, h * z);
  g.fillStyle = C.deep; g.fillRect(0, h * z, c.width, cap);
  g.fillStyle = C.pink; g.fillRect(0, h * z, c.width, z);
  g.font = `${14 * z}px VT323, monospace`; g.textBaseline = 'middle';
  const cycle = Math.floor(S.world / WORLDS.length), y = h * z + cap / 2 + z;
  g.fillStyle = C.line; g.textAlign = 'left'; g.fillText(`${world().name}${cycle ? ' ' + roman(cycle + 1) : ''} · ${pct()}% terraformed`, 8 * z, y);
  g.fillStyle = C.soft; g.textAlign = 'right'; g.fillText('TERRAFORM', c.width - 8 * z, y);
  if (!calm()) flash = .6;
  play('ui');
  const name = `terraform-${world().name.toLowerCase().replace(/\s+/g, '-')}.png`;
  c.toBlob(async blob => {
    if (!blob) return;
    const file = new File([blob], name, { type: 'image/png' });
    try { if (navigator.canShare?.({ files: [file] })) return await navigator.share({ files: [file], title: 'Terraform', text: `${world().name}, ${pct()}% terraformed` }); } catch (e) { if (e?.name === 'AbortError') return; }
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1e4);
    toast(`Photo saved: ${name}`);
  }, 'image/png');
}
$('sphoto').addEventListener('click', () => { closeSettings(); requestAnimationFrame(takePhoto); });
$('sclose').addEventListener('click', closeSettings);

// ---------- hud / panel ----------
const set = (el, html) => { if (el._h !== html) el.innerHTML = el._h = html; }; // skip needless DOM rewrites
// Modal dialogs (talents, warp, settings) make everything else inert: unreachable by tap, keyboard or screen reader.
const BEHIND = ['c', 'top', 'side', 'bar', 'panel', 'prev', 'next', 'guide']; // not #toast: read-only, and its announcements must still reach screen readers
const shield = on => { for (const id of BEHIND) $(id).inert = on; };
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
  $('rate').textContent = `${fmt(rateOf())} life/s` + (S.world ? ` x${fmt(boost())}` : '');
  const cycle = Math.floor(S.world / WORLDS.length);
  $('wname').textContent = world().name + (cycle ? ' ' + roman(cycle + 1) : '');
  const boonName = BOONS.find(b => b.id === S.boon)?.name;
  $('wtrait').textContent = [trait().text, boonName && `Boon: ${boonName}`].filter(Boolean).join(' · ');
  const best = S.best[world().name], clock = n => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
  $('wtime').textContent = S.done ? `healed · best ${clock(best)}` : clock(Math.max(0, last - S.start)) + (best !== undefined ? ` · best ${clock(best)}` : ''); // frozen once healed
  const h = pct(), ns = STAGES.find(st => healOf(S.earned) < st.at); // next milestone
  $('healbar').style.width = h + '%';
  $('healtxt').textContent = `${h}% terraformed` + (ns ? ` · ${ns.name} at ${ns.at * 100}%` : '');
  $('heal').setAttribute('aria-valuenow', h);

  const g = GOALS[S.goal], goal = $('goal');
  goal.hidden = !g && !S.done;
  if (S.done) { // the world is alive: the goal bar holds the warp until the player is ready
    goal.classList.add('ready');
    set($('gtext'), `${world().name} is alive. Warp to ${WORLDS[(S.world + 1) % WORLDS.length].name}`);
    set($('grew'), 'x2');
  } else if (g) {
    const n = Math.min(g.get(), g.need);
    goal.classList.toggle('ready', n >= g.need && g.reward > 0);
    set($('gtext'), `${val(g.text)} ${n}/${g.need}`);
    set($('grew'), g.reward ? `${ICON}${fmt(rewardOf(g))}` : '');
  }
  tiles.forEach((b, s) => {
    const ts = TILE[SYS[s].id];
    set(b, `<img src="${S.on[s] ? ts.marks[markOf(s)] : unlocked(s) ? ts.next : ts.sil}" alt="">`);
    b.setAttribute('aria-label', SYS[s].name);
    b.classList.toggle('ok', canAct(s));
    b.classList.toggle('sel', sel === s);
    b.setAttribute('aria-expanded', sel === s);
  });
  talTile.classList.toggle('ok', S.seeds > 0 && TAL.some(canTal));
  checkAch();
  const cs = $('contract'), job = S.contract; cs.hidden = !job;
  const left = Math.max(0, Math.ceil(job?.t ?? 0));
  if (job) set(cs, `<b>CONTRACT ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</b> ${conText(job)} <span>${ICON}${fmt(job.reward)}</span>`);
  if (innerWidth < 640 && SIDE) $('toast').style.top = Math.max(SIDE.b * PX, job ? cs.getBoundingClientRect().bottom : 0) + 10 + 'px'; // phones: toasts step below the contract
  updateGuide();
  if (W && hudH() !== layoutH) resize(); // goal text wrapped or the HUD changed size: re-fit the scene below it

  panelH = panel.offsetHeight; // read here (10x/s), not in every frame
  for (const a of ['prev', 'next']) { $(a).hidden = sel < 0; $(a).style.bottom = panelH + 20 + 'px'; }
  if (sel < 0) return;
  const s = sel, sy = SYS[s], L = S.L[s];
  $('pname').textContent = sy.name;
  set($('pinfo'), S.on[s] ? `${ICON}${fmt(sysOut(s))}/s` : unlocked(s) ? `${ICON}${fmt(unlockCost(s))}` : 'locked');
  $('pfact').textContent = S.on[s] ? sy.fact : '';
  rows.forEach(({ r, text: el, buy }, k) => {
    if (!S.on[s]) { // locked: one unlock row
      r.hidden = k > 0;
      buy.setAttribute('aria-disabled', !unlocked(s) || S.life < unlockCost(s)); // aria-disabled, not disabled: keeps keyboard focus
      set(el, `Unlock ${sy.name}<small>${unlocked(s) ? sy.desc : `Unlock the ${SYS[s - 1].name} first.`}</small>`);
      return set(buy, `Unlock<span>${ICON}${fmt(unlockCost(s))}</span>`);
    }
    const max = L[k] >= MAXL, [n, c] = bulkOf(s, k), [name, eff] = sy.ups[k];
    const desc = [`Adds +1 ${sy.unit} to the crew.`, `${eff} per level.`, `${eff} per level, stacking.`][k];
    const cur = [[`${1 + L[0]} ${sy.unit}s`, `+${n}`], [`+${25 * L[1]}%`, `+${25 * n}%`], [`x${(1.08 ** L[2]).toFixed(2)}`, `x${(1.08 ** n).toFixed(2)}`]][k];
    r.hidden = false;
    buy.setAttribute('aria-disabled', max || S.life < c);
    set(el, `${name}<span class="lv">Lv.${L[k]}</span><small>${desc}</small><small class="cur">Current: ${cur[0]} ${max ? '' : `<i>${cur[1]}</i>`}</small>`);
    set(buy, max ? 'MAX' : `Upgrade${n > 1 ? ' x' + n : ''}<span>${ICON}${fmt(c)}</span>`);
  });
}

function rowClick(k) {
  const s = sel, sy = SYS[s], [x, y] = sysPos(s, last);
  if (!S.on[s]) {
    if (!unlocked(s) || S.life < unlockCost(s)) return play('deny');
    S.life -= unlockCost(s); S.on[s] = true; play('unlock'); buzz(15);
    if (S.boon === 'crew') S.L[s][0] = Math.max(S.L[s][0], 5); // Veteran Crew
    toast(sy.fact);
    burst(x, y, [C.line, C.pink, C.soft], 40, 60);
  } else {
    const L = S.L[s], [n, c] = bulkOf(s, k), m0 = markOf(s);
    if (!n || S.life < c) return play('deny');
    S.life -= c; L[k] += n; play('buy');
    burst(x, y, [C.pink, C.line], 14 + 2 * n, 40);
    if (markOf(s) > m0) {
      toast(`${sy.name} refit: Mark ${MARK[markOf(s)]}.`); play('talent'); buzz([20, 40, 20]); burst(x, y, [C.sun, C.line], 30, 50);
      if (markOf(s) === 3) quip(QUIPS.mark4, true); else if (!S.ach.includes('mk2')) quip(QUIPS.mark2, true); // first refit ever
    }
  }
  fire(s, true);
  updateUI();
}
$('pmul').addEventListener('click', () => { bulk = { 1: 10, 10: 0, 0: 1 }[bulk]; $('pmul').textContent = bulk ? 'x' + bulk : 'MAX'; $('pmul').setAttribute('aria-label', `Levels per purchase: ${$('pmul').textContent}`); play('ui'); updateUI(); });

let opener = null; // element that opened the panel, to give focus back on close
function openPanel(s) {
  play('ui');
  const wasClosed = panel.hidden;
  if (wasClosed) opener = document.activeElement;
  sel = s; panel.hidden = false; updateUI();
  if (wasClosed) rows[0].buy.focus({ preventScroll: true });
}
function closePanel() {
  if (panel.hidden) return;
  sel = -1; panel.hidden = true; updateUI();
  if (opener?.isConnected && opener !== document.body) opener.focus({ preventScroll: true });
  if (toasts.length) toast(...toasts.shift());
}
$('pclose').addEventListener('click', closePanel);
$('prev').addEventListener('click', () => openPanel((sel + SYS.length - 1) % SYS.length));
$('next').addEventListener('click', () => openPanel((sel + 1) % SYS.length));
addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (cine) endCine(); else if (!$('talents').hidden) closeTalents(); else if (!$('settings').hidden) closeSettings(); else closePanel(); }
  // 1-6 open a system's panel (not while a dialog is up or typing in a field)
  if ((e.key === 'p' || e.key === 'P') && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && !$('c').inert && !/TEXTAREA|INPUT/.test(e.target.tagName)) takePhoto();
  if (e.key >= '1' && e.key <= '6' && !e.ctrlKey && !e.metaKey && !e.altKey && !$('c').inert && !/TEXTAREA|INPUT/.test(e.target.tagName)) openPanel(+e.key - 1);
});

// ---------- talents: every healed planet gives a Star Seed; each talent costs one and needs the node above it ----------
const TI = { // 9x9 talent icons (w = line, n = fill, p = pink)
  sprout: tiny(['..ww.ww..', '.wwwwwww.', '..wwwww..', '....w....', '....w....', '.wwwwwww.', '.wnnnnnw.', '..wnnnw..', '..wwwww..']),
  star: tiny(['....w....', '....w....', '...www...', 'wwwwwwwww', '.wwwwwww.', '..wwwww..', '..ww.ww..', '.ww...ww.', '.w.....w.']),
  moon: tiny(['...wwww..', '..www....', '.www.....', '.ww......', '.ww......', '.www.....', '..www..w.', '...wwwww.', '.........']),
  tag: tiny(['....wwwww', '...wnnnnw', '..wnnnwnw', '.wnnnnnnw', 'wnnnnnnw.', 'wnnnnnw..', '.wnnnw...', '..wnw....', '...w.....']),
  gift: tiny(['.ww...ww.', '..ww.ww..', 'wwwwwwwww', 'wnnnwnnnw', 'wwwwwwwww', '.wnnwnnw.', '.wnnwnnw.', '.wnnwnnw.', '.wwwwwww.']),
  rings: tiny(['..wwwww..', '.w.....w.', 'w..www..w', 'w.w...w.w', 'w.w.w.w.w', 'w.w...w.w', 'w..www..w', '.w.....w.', '..wwwww..']),
  bot: tiny(['....w....', '..wwwww..', '.wnnnnnw.', '.wwnnnww.', '.wnnnnnw.', '..wwwww..', '.wwnnnww.', 'w.wnnnw.w', '..ww.ww..']),
  bolt: tiny(['.....ww..', '....ww...', '...ww....', '..wwwww..', '....ww...', '...ww....', '..ww.....', '.ww......', '.........']),
};
const src = c => c.toDataURL(), HAND = src(T.hand), ENERGY = src(T.energy), SEED = `<img class="ico" src="${src(TI.sprout)}" alt="Star Seeds">`;
// Grid is 300 x 420. Each tier r: a diamond in the middle (top, left, right, bottom) and a two-node branch on each side.
// via: the y where the connector from the parent turns sideways.
const tier = r => { const b = 140 * r; return { T: b + 25, M: b + 62, B: b + 100, via: b - 8 }; };
const t0 = tier(0), t1 = tier(1), t2 = tier(2);
const TAL = [
  ['spark', 'Spark', 'Taps give x3 life.', HAND, 150, t0.T],
  ['seedbank', 'Seed Bank', 'Start every new world with 1,000 life (times your warp boost).', src(TI.sprout), 100, t0.M, 'spark', t0.M],
  ['lens', 'Vanguard', () => `${SYS[0].name} and ${SYS[1].name} output x2.`, () => TILE[SYS[0].id].lit, 200, t0.M, 'spark', t0.M],
  ['roots', 'Deep Roots', 'All output +25%.', ENERGY, 150, t0.B, 'spark'],
  ['crit', 'Lucky Strike', '10% of taps are critical: x10 life.', src(TI.star), 42, t1.T, 'roots', t1.via],
  ['crit2', 'Jackpot', 'Critical taps happen 20% of the time.', src(TI.star), 42, t1.B, 'crit'],
  ['swarm', 'Backbone', () => `${SYS[2].name} and ${SYS[3].name} output x2.`, () => TILE[SYS[2].id].lit, 150, t1.T, 'roots', t1.via],
  ['thrift', 'Bulk Orders', 'Upgrades cost 10% less.', src(TI.tag), 100, t1.M, 'swarm', t1.M],
  ['patron', 'Patron', 'Goal rewards x3.', src(TI.gift), 200, t1.M, 'swarm', t1.M],
  ['bloom', 'Bloom', 'All output +30%.', ENERGY, 150, t1.B, 'swarm'],
  ['autotap', 'Tap Bot', 'Taps the planet for you once a second.', src(TI.bot), 258, t1.T, 'roots', t1.via],
  ['autotap2', 'Tap Swarm', 'Automatic taps 4 times a second.', src(TI.bot), 258, t1.B, 'autotap'],
  ['sleep', 'Night Shift', 'Offline earnings count up to 24h instead of 12h.', src(TI.moon), 42, t2.T, 'bloom', t2.via],
  ['dream', 'Lucid Dreams', 'Offline earnings x2.', src(TI.moon), 42, t2.B, 'sleep'],
  ['grow', 'Heavy Hitters', () => `${SYS[4].name} and ${SYS[5].name} output x2.`, () => TILE[SYS[4].id].lit, 150, t2.T, 'bloom', t2.via],
  ['cheap', 'Fast Track', 'Unlocking systems costs 25% less.', src(TI.tag), 100, t2.M, 'grow', t2.M],
  ['echo', 'Warp Echo', 'All output +5% for every world healed, up to +50%.', src(TI.rings), 200, t2.M, 'grow', t2.M],
  ['gaia', 'Gaia', 'All output +50%.', src(TI.sprout), 150, t2.B, 'grow'],
  ['kinetic', 'Kinetic Grid', '+1% output per 100 lifetime taps, up to +100%.', src(TI.bolt), 258, t2.T, 'bloom', t2.via],
  ['tapecho', 'Tap Echo', 'Every tap also adds a full second of income.', HAND, 258, t2.B, 'kinetic'],
].map(([id, name, desc, icon, x, y, req, via]) => ({ id, name, desc, icon, x, y, req, via }));
const val = v => (typeof v === 'function' ? v() : v); // pair talents describe the current world's systems
const talById = Object.fromEntries(TAL.map(t => [t.id, t]));
const canTal = t => !has(t.id) && (!t.req || has(t.req));

// Round pixel emblem behind each cluster (dark, so the nodes and links stay the focus).
const EMBLEM = (() => {
  const c = mk(40, 40), g = c.getContext('2d'), p = pen(g), ink = '#2c3250';
  for (let dy = -19; dy <= 19; dy++) { const dx = Math.round(Math.sqrt(361 - dy * dy)); p.fill(20 - dx, 20 + dy, dx * 2 + 1, 1, '#242940'); }
  p.ring(20, 20, 18, 18, 0, 2 * Math.PI, ink); p.ring(20, 20, 12, 12, 0, 2 * Math.PI, ink);
  p.line(20, 2, 20, 38, ink); p.line(2, 20, 38, 20, ink);
  for (const [a, b, c2, d] of [[20, 8, 32, 20], [32, 20, 20, 32], [20, 32, 8, 20], [8, 20, 20, 8]]) p.line(a, b, c2, d, ink);
  for (const [x, y] of [[9, 9], [31, 9], [9, 31], [31, 31]]) { p.line(x - 1, y, x + 1, y, ink); p.line(x, y - 1, x, y + 1, ink); }
  return c.toDataURL();
})();

const tree = $('tree'), SVGNS = 'http://www.w3.org/2000/svg', pctX = x => x / 3 + '%', pctY = y => y / 4.2 + '%';
for (const [x, y, size] of [[150, t0.M, 130], ...[t1, t2].flatMap(t => [[150, t.M, 130], [42, t.M, 110], [258, t.M, 110]])]) {
  const im = Object.assign(document.createElement('img'), { src: EMBLEM, alt: '', className: 'temb' });
  Object.assign(im.style, { left: pctX(x), top: pctY(y), width: size / 3 + '%' });
  tree.append(im);
}
const lines = document.createElementNS(SVGNS, 'svg');
lines.setAttribute('viewBox', '0 0 300 420'); lines.setAttribute('preserveAspectRatio', 'none'); lines.setAttribute('shape-rendering', 'crispEdges');
tree.append(lines);
let selTal = 'spark', talOpener = null;
for (const t of TAL) {
  if (t.req) { // square connector: down from the parent, across at `via`, down into the child
    const pr = talById[t.req], via = t.via ?? t.y;
    t.line = document.createElementNS(SVGNS, 'polyline');
    t.line.setAttribute('points', `${pr.x},${pr.y} ${pr.x},${via} ${t.x},${via} ${t.x},${t.y}`);
    t.line.setAttribute('fill', 'none'); t.line.setAttribute('stroke-width', '3');
    lines.append(t.line);
  }
  t.el = document.createElement('button');
  t.el.className = 'tn';
  t.el.innerHTML = '<img alt="">';
  Object.assign(t.el.style, { left: pctX(t.x), top: pctY(t.y) });
  t.el.addEventListener('click', () => { selTal = t.id; renderTal(); });
  tree.append(t.el);
}
// links light up pink once both ends are unlocked; drawn in tree order so lit links sit on top of dim ones
function renderTal() {
  set($('tseeds'), `${SEED} ${S.seeds}`);
  for (const t of TAL) {
    const on = has(t.id);
    t.el.className = 'tn ' + (on ? 'on' : canTal(t) ? 'av' : 'lock') + (selTal === t.id ? ' sel' : '');
    if (t.el.firstChild.getAttribute('src') !== val(t.icon)) t.el.firstChild.src = val(t.icon);
    t.el.setAttribute('aria-label', `${t.name}: ${val(t.desc)} ${on ? 'Unlocked.' : canTal(t) ? 'Available.' : 'Locked.'}`);
    t.el.setAttribute('aria-pressed', selTal === t.id);
    if (t.line) { t.line.setAttribute('stroke', on ? C.pink : C.dim); if (on) lines.append(t.line); }
  }
  const t = talById[selTal], buy = $('tbuy');
  $('tname').textContent = t.name;
  let effect = '';
  if (!has(t.id)) { // what this talent would do to your numbers right now
    const r0 = rateOf(), t0 = tapGain();
    S.tal.push(t.id); const r1 = rateOf(), t1 = tapGain(); S.tal.pop();
    if (r1 !== r0) effect = ` Now: ${fmt(r0)} -> ${fmt(r1)} life/s.`;
    else if (t1 !== t0) effect = ` Now: taps +${fmt(t0)} -> +${fmt(t1)}.`;
  }
  $('tdesc').textContent = val(t.desc) + effect;
  buy.setAttribute('aria-disabled', !canTal(t) || S.seeds < 1);
  set(buy, has(t.id) ? 'Unlocked' : !canTal(t) ? `Needs<span>${talById[t.req].name}</span>` : `Unlock<span>${SEED}1</span>`);
}
$('tbuy').addEventListener('click', () => {
  const t = talById[selTal];
  if (!canTal(t) || S.seeds < 1) return play('deny');
  S.seeds--; S.tal.push(t.id); play('talent');
  renderTal(); updateUI(); save();
});
$('treset').addEventListener('click', () => { S.seeds += S.tal.length; S.tal = []; renderTal(); updateUI(); save(); }); // free respec
function openTalents() {
  play('ui');
  closePanel();
  talOpener = document.activeElement;
  $('talents').hidden = false; shield(true);
  renderTal();
  talById[selTal].el.focus({ preventScroll: true });
}
function closeTalents() {
  if ($('talents').hidden) return;
  $('talents').hidden = true; shield(false);
  if (talOpener?.isConnected && talOpener !== document.body) talOpener.focus({ preventScroll: true });
}
$('tclose').addEventListener('click', closeTalents);
const talTile = document.createElement('button'); // own tile in the bar's bottom-right corner, apart from the systems
talTile.className = 'tile'; talTile.id = 'ttile'; talTile.setAttribute('aria-label', 'Talents'); talTile.setAttribute('aria-controls', 'talents');
talTile.innerHTML = `<img src="${src(TI.sprout)}" alt="">`;
talTile.addEventListener('click', openTalents);
$('bar').append(talTile);

let toastTimer, toastAt = -1e9;
const toasts = []; // waiting their turn: hidden under the panel on phones, or behind a toast that only just appeared
function toast(msg, big) {
  const el = $('toast'), fresh = el.classList.contains('show') && performance.now() - toastAt < 2500;
  if ((sel >= 0 && innerWidth < 900) || fresh) { if (toasts.length < 4) toasts.push([msg, big]); return; }
  el.textContent = msg; el.classList.add('show'); el.classList.toggle('big', !!big); toastAt = performance.now();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); if (toasts.length) toast(...toasts.shift()); }, toasts.length ? 3500 : 6000); // shorter when others wait
}

$('goal').addEventListener('click', () => {
  if (S.done) return openWarp();
  const g = GOALS[S.goal];
  if (!g) return;
  if (g.reward && g.get() >= g.need) { const r = rewardOf(g); S.life += r; S.earned += r; S.goal++; play('coin'); return updateUI(); }
  const s = typeof g.go === 'function' ? g.go() : g.go; // not done yet: glide the camera to the system it is about
  if (s >= 0) openPanel(s); else closePanel();
});

let speedSaid = true;
function showWarp() { // the world just hit 100%: log the run, then offer the warp
  const name = world().name, s = Math.round(last - S.start);
  S.done = true; S.best[name] = Math.min(S.best[name] ?? Infinity, s);
  speedSaid = s >= 300; // a sub-5-minute heal earns a remark once the player chooses Stay
  burst(CX, CY, [C.line, C.pink, C.soft], 80, 90);
  openWarp();
}
function openWarp() {
  play('milestone');
  const n = S.world + 1, next = WORLDS[n % WORLDS.length].name, mult = fmt(boost() * 2), end = n % WORLDS.length === 0;
  $('warph').textContent = end ? 'Sector terraformed' : 'Planet terraformed';
  $('warptxt').textContent = end // every world in the cycle is alive: the planet log, then the next cycle
    ? `All ${WORLDS.length} worlds are alive. Best times: ${WORLDS.map(w => `${w.name} ${mmss(S.best[w.name] ?? 0)}`).join(', ')}. ${S.taps} taps and ${S.ach.length}/${ACH.length} achievements in all. Cycle ${roman(n / WORLDS.length + 1)} starts back at ${next}, with all output x${mult} for good.`
    : `${world().name} is alive. Took ${mmss(S.best[world().name])}. Next stop: ${next}: all output x${mult} for good, prices and the goal grow to match. You also earn a Star Seed to spend on Talents.`;
  $('boonh').textContent = end ? `Pick a boon for cycle ${roman(n / WORLDS.length + 1)} and warp` : 'Pick a boon for the next world and warp';
  if (!S.offer.length) S.offer = BOONS.map(b => b.id).sort(() => Math.random() - .5).slice(0, 3); // saved: Stay, reload or reopen keep the same three
  $('boons').replaceChildren(...S.offer.map(id => {
    const b = BOONS.find(x => x.id === id), el = document.createElement('button');
    el.className = 'boon'; el.innerHTML = `<b>${b.name}</b><small>${b.desc}</small>`;
    el.addEventListener('click', () => { if (end) startCine(id); else { warp(id); save(); } }); // the sector's last world: the cinematic first
    return el;
  }));
  closePanel(); closeTalents(); closeSettings();
  $('warp').hidden = false; shield(true);
  $('boons').firstChild.focus();
}
$('warpshare').addEventListener('click', async () => { // brag: the system share sheet, or the clipboard
  const text = `I brought ${world().name} back to life in ${mmss(S.best[world().name] ?? 0)} in TERRAFORM, a pixel idle game.`, url = 'https://utkarshbahuguna.me/terraform-idle/';
  try { if (navigator.share) await navigator.share({ title: 'Terraform', text, url }); else { await navigator.clipboard.writeText(`${text} ${url}`); flashBtn($('warpshare'), 'Copied'); } } catch { /* dismissed */ }
});
$('warpstay').addEventListener('click', () => { // admire the living planet; the goal bar keeps the warp ready
  $('warp').hidden = true; shield(false); play('ui');
  if (!speedSaid) { speedSaid = true; quip(QUIPS.speed, true); }
  $('goal').focus({ preventScroll: true });
});

// Start a fresh dead world: everything resets except the permanent warp boost.
function warp(boon = '') {
  $('warp').hidden = true; shield(false); play('warp');
  tiles[0].focus({ preventScroll: true });
  Object.assign(S, { world: Math.min(S.world + 1, MAX_WORLD), life: 0, earned: 0, goal: 1, start: last, done: false, on: SYS.map(() => false), L: SYS.map(() => [0, 0, 0]), seeds: S.seeds + 1, boon, offer: [], contract: null });
  if (boon === 'head') S.on[0] = S.on[1] = true;
  if (has('seedbank')) S.life = 1000 * boost();
  const before = SYS.map(sy => sy.id);
  setLoadout(S.world); resize(); // ground systems change size: re-fit the colony around them
  const fresh = SYS.filter(sy => !before.includes(sy.id)).map(sy => sy.name);
  items.length = shots.length = 0;
  conNext = 60; meteors.length = 0; if (ev) endEvent(); // a fresh world: fresh job board, the sky's event stays behind
  if (boon === 'storm') evNext = Math.min(evNext, 40); // after endEvent(), which would reset it
  stage = 0; zoom = .3; flash = 1; shake = 1; // arrive from far away
  buildWorld();
  guide([ // arrival briefing
    { text: `Welcome to ${world().name}, Engineer. You earned a Star Seed: spend it in Talents, bottom right.` },
    fresh.length && { text: `New hardware online: ${fresh.join(', ')}. Same job as before: bring this world to life.` },
    trait().text && { text: `Survey says: ${trait().text}. Plan your upgrades around it.` },
    boon && { text: `${BOONS.find(b => b.id === boon).name} is in effect: ${BOONS.find(b => b.id === boon).desc}` },
    { text: world().fact },
  ].filter(Boolean));
}

// ---------- Commander Vos: the story intro and arrival briefings, in a speech bubble at the bottom left ----------
// Commander Vos: a detailed 3/4 bust in our palette, designed on a 72-unit grid and drawn at 1.75x (132px) so seams, vents and
// glints get their own pixels. Shapes are painted flat and snapped to the palette; a bevel pass then lights each plate's top-left
// edge and darkens its bottom-right one; last, a dark inner and a white outer outline (the sticker edge of all our line art).
// Two frames for talking: visor glint, chest light and ear LED change.
const VOS_PAL = ['#11131f', '#1c2030', '#323954', '#4a5378', '#59607f', '#6f7aa8', '#8f99c4', '#a7b1d8', '#e9ecf5', '#e98aa3', '#a8566f', '#ffe08a', '#ffb36b'].map(rgb);
const VOS_RAMP = ['#323954', '#4a5378', '#6f7aa8', '#a7b1d8', '#e9ecf5'].map(rgb).map(String); // dark -> light steps the bevel moves along
function makeVos(frame) {
  const k = 1.75, M = 3, N = Math.ceil(72 * k) + 2 * M, c = mk(N, N), g = c.getContext('2d', { willReadFrequently: true });
  const T = (x, y) => [M + x * k, M + y * k];
  const path = pts => { g.beginPath(); pts.forEach((q, i) => { const [x, y] = T(...q); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); };
  const poly = (pts, col) => { g.fillStyle = col; path(pts); g.fill(); };
  const rect = (x, y, w, h, col) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], col);
  const circle = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(...T(x, y), r * k, 0, 7); g.fill(); };
  const P2 = pen(g), line = (x0, y0, x1, y1, col) => P2.line(...T(x0, y0), ...T(x1, y1), col), dot = (x, y, col) => P2.dot(...T(x, y), col);
  const ca = Math.cos(-.3), sa = Math.sin(-.3), R = (x, y) => [35 + x * ca - y * sa, 64 + x * sa + y * ca]; // rifle frame: across the body, rising
  const rp = (pts, col) => poly(pts.map(q => R(...q)), col), rl = (a, b, c2, d, col) => line(...R(a, b), ...R(c2, d), col), rd = (x, y, col) => dot(...R(x, y), col);
  const A = '#6f7aa8', L = '#a7b1d8', H = '#e9ecf5', S2 = '#4a5378', D = '#323954', K = '#1c2030', PK = '#e98aa3', PD = '#a8566f', GM = '#59607f', GL = '#8f99c4';
  // body
  poly([[2, 50], [12, 40], [60, 38], [70, 48], [70, 72], [2, 72]], D);
  poly([[20, 44], [50, 42], [55, 72], [17, 72]], A); // chest plate
  poly([[22, 46], [34, 45], [32, 54], [21, 56]], L);
  line(20, 58, 52, 57, K); line(36, 45, 37, 57, K); line(26, 46, 25, 57, K); // plate seams
  circle(29.5, 50.5, 2.6, PD); circle(29.5, 50.5, 1.6, PK); line(26.5, 51.5, 32.5, 49.5, H); // emblem: a ringed planet
  rect(40, 48, 4, 3, frame ? PD : PK); rect(41, 49, 2, 1, frame ? PK : H); // chest light
  rect(17, 64, 39, 4, D); line(17, 64, 56, 64, K); rect(21, 62, 7, 6, S2); line(21, 64, 28, 64, K); dot(24.5, 66, GL); // belt and pouch
  poly([[1, 50], [8, 40], [22, 38], [29, 44], [27, 58], [16, 66], [4, 64]], A); // left pauldron (lit)
  poly([[4, 47], [9, 42], [21, 40], [25, 45], [8, 50]], L);
  poly([[5, 54], [26, 49], [26, 52], [5, 57]], PK);
  for (const y of [58, 61]) { line(8, y + 1, 13, y - 1, PK); line(13, y - 1, 18, y + 1, PK); } // rank chevrons
  for (const [x, y] of [[6, 46], [24, 42], [7, 62]]) dot(x, y, H); // bolts
  line(4, 63, 16, 65, K);
  poly([[47, 40], [60, 37], [70, 44], [71, 60], [62, 64], [52, 56]], S2); // right pauldron (shade side)
  poly([[51, 41], [60, 39], [67, 44], [56, 46]], A);
  poly([[54, 52], [70, 50], [70, 53], [54, 55]], PK);
  for (const [x, y] of [[57, 42], [68, 47]]) dot(x, y, GL);
  rect(28, 34, 16, 10, K); line(31, 38, 41, 38, D); line(31, 41, 41, 41, D); line(33, 35, 33, 43, GM); // neck and cables
  // forearms reaching to the rifle
  poly([[8, 61], [19, 59], [29, 66], [25, 72], [7, 72]], A); line(13, 61, 18, 69, K); line(20, 60, 25, 68, K);
  poly([[56, 55], [67, 59], [61, 71], [50, 68]], S2); line(59, 57, 54, 69, K);
  // rifle: dark gunmetal, bright top edge, rail, vents, scope
  rp([[-34, -3], [-20, -4], [-20, 5], [-34, 6]], D); rp([[-34, -3], [-20, -4], [-20, -3], [-34, -2]], GL); rl(-30, -1, -30, 4, K); // stock
  rp([[-20, -5], [18, -5], [18, 5], [-20, 5]], D); rp([[-20, -5], [18, -5], [18, -4], [-20, -4]], GL); rp([[-20, 3], [18, 3], [18, 5], [-20, 5]], K);
  rp([[-16, -7], [14, -7], [14, -5], [-16, -5]], S2); for (let x = -14; x < 14; x += 5) rl(x, -7, x, -6, K); // top rail
  rp([[-8, -2], [14, -2], [14, 1], [-8, 1]], S2); for (let x = -4; x < 14; x += 5) rl(x, -2, x, 0, K); // receiver vents
  rp([[18, -3], [31, -3], [31, 1], [18, 1]], K); rp([[31, -4], [34, -4], [34, 2], [31, 2]], S2); rl(32.5, -3, 32.5, 1, K); // barrel, muzzle brake
  rp([[-6, -12], [8, -12], [8, -7], [-6, -7]], K); rp([[-6, -12], [8, -12], [8, -11], [-6, -11]], GM); rp([[6, -11], [8, -11], [8, -8], [6, -8]], PK); rd(7, -10, H); // scope
  rp([[-4, 5], [3, 5], [5, 14], [-2, 14]], K); for (const y of [8, 11]) rl(-2.5, y, 3.5, y, D); // magazine ribs
  rp([[-17, -1], [-11, -1], [-11, 1], [-17, 1]], PK); rd(-9, 0, frame ? PD : PK);
  rp([[8, 1], [16, 1], [16, 9], [8, 9]], K); rp([[9, 2], [15, 2], [15, 3], [9, 3]], A); rl(12, 4, 12, 8, D); // front glove
  rp([[-19, -2], [-11, -2], [-11, 8], [-19, 8]], K); rp([[-18, -1], [-12, -1], [-12, 0], [-18, 0]], A); rl(-15, 1, -15, 7, D); // back glove
  // helmet: round shell, shaded on the right, crest ridge with vents
  poly([[20, 13], [23, 6], [30, 2], [44, 2], [51, 6], [55, 13], [56, 25], [53, 33], [47, 39], [27, 39], [21, 33], [19, 25]], A);
  poly([[47, 5], [51, 6], [55, 13], [56, 25], [53, 33], [47, 39], [44, 39], [50, 30], [52, 20], [50, 10]], S2);
  poly([[23, 10], [29, 4], [35, 3], [34, 8], [26, 13]], L);
  poly([[35, 2], [39, 2], [39, 15], [35, 15]], S2); for (const y of [6, 9, 12]) line(35.5, y, 38.5, y, K); // crest vents
  line(51, 8, 54, 22, K); line(22, 30, 26, 37, K); // shell seams
  line(23, 17, 51, 15, K); // brow
  const visor = [[24, 18], [50, 16], [53, 23], [48, 30], [30, 30], [24, 26]];
  g.save(); path(visor); g.clip();
  rect(20, 14, 36, 4, '#ffe08a'); rect(20, 18, 36, 4, '#ffb36b'); rect(20, 22, 36, 4, PK); rect(20, 26, 36, 6, PD); // sunset visor
  circle(44, 29, 4, '#ffb36b'); circle(44, 29, 3, PK); // a planet reflected low in the visor
  g.restore();
  g.strokeStyle = '#11131f'; g.lineWidth = 1.5; path(visor); g.stroke();
  if (frame) { line(37, 19, 44, 18, H); line(46, 18, 47, 18, H); } else { line(27, 20, 33, 19, H); dot(35, 19, H); line(28, 22, 30, 22, H); } // glints
  poly([[23, 27], [30, 31], [48, 31], [54, 25], [53, 32], [47, 39], [28, 39], [22, 33]], D); // jaw guard
  for (const y of [33, 35, 37]) { line(30, y, 34, y, K); line(40, y, 44, y, K); } // vents
  line(37, 31, 37, 38, K);
  poly([[16, 18], [22, 17], [22, 31], [16, 30]], L); rect(17, 21, 3, 6, D); dot(18.5, 28, frame ? PD : PK); // ear module and LED
  line(17, 18, 12, 4, L); dot(15.5, 13, K); dot(14, 9, K); dot(12, 3, PK); dot(12, 2, PK); // segmented antenna
  // snap to the palette, bevel the armour, then outline
  const im = g.getImageData(0, 0, N, N), d = im.data, solid = new Uint8Array(N * N), col = new Array(N * N);
  for (let i = 0; i < N * N; i++) {
    if (d[i * 4 + 3] < 128) continue;
    solid[i] = 1;
    let best = VOS_PAL[0], bd = 1e9;
    for (const p of VOS_PAL) { const e = (p[0] - d[i * 4]) ** 2 + (p[1] - d[i * 4 + 1]) ** 2 + (p[2] - d[i * 4 + 2]) ** 2; if (e < bd) { bd = e; best = p; } }
    col[i] = best;
  }
  const at = (x, y) => x >= 0 && y >= 0 && x < N && y < N && solid[y * N + x];
  const gap = (x, y) => !at(x, y) || String(col[y * N + x]) === String(rgb('#1c2030')); // empty space or a seam
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    if (!solid[i]) { d[i * 4 + 3] = 0; continue; }
    let p = col[i];
    const r = VOS_RAMP.indexOf(String(p));
    if (r >= 0 && (gap(x - 1, y) || gap(x, y - 1)) && r < VOS_RAMP.length - 1) p = VOS_RAMP[r + 1].split(',').map(Number); // lit edge
    else if (r > 0 && (gap(x + 1, y) || gap(x, y + 1))) p = VOS_RAMP[r - 1].split(',').map(Number); // shadow edge
    d.set([...p, 255], i * 4);
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
    if (solid[i] && edge) d.set([17, 19, 31, 255], i * 4);
    else if (!solid[i] && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) d.set([233, 236, 245, 255], i * 4);
  }
  g.putImageData(im, 0, 0);
  return c.toDataURL();
}
const FACE = [makeVos(0), makeVos(1)];
let gLines = [], gi = 0, gShown = 0, gTimer = 0, gIntro = false, quipTimer = 0, quipAt = -1e9;
function guide(lines, intro = false) {
  clearTimeout(quipTimer); $('guide').classList.remove('quip'); // a briefing replaces any passing remark
  gLines = lines; gi = 0; gIntro = intro;
  $('guide').hidden = false;
  sayLine();
}
// A passing remark: one line in the bubble (no portrait, no Skip) that goes away by itself. Never over a briefing or a dialog,
// at most one every 25 s unless `force` (important news like the welcome back).
function quip(lines, force = false) {
  const now = performance.now();
  if (!$('guide').hidden || $('c').inert || !S.intro || (!force && now - quipAt < 25e3)) return false;
  quipAt = now;
  gLines = [{ text: Array.isArray(lines) ? lines[Math.random() * lines.length | 0] : lines, auto: true }]; gi = 0; gIntro = false;
  $('guide').classList.add('quip'); $('guide').hidden = false;
  sayLine();
  return true;
}
// what Vos says when something happens
const QUIPS = {
  shower: ['Meteors inbound! Tap fast, every hit counts five times.', 'Rock storm. Get those fingers moving, Engineer.'],
  flare: ['Solar flare! Everything we built is running hot.', 'The star is flaring. Enjoy the free power.'],
  comet: ['Golden comet on the scope. Grab it before it slips away!', 'See that gold streak? Tap it. Now.'],
  caught: ['Nice catch! That comet was worth a minute of work.', 'Ha! Straight into the cargo hold.'],
  mark2: ['First refit done. Look at that paint job.', 'Mark II. The crew is proud of that one.'],
  mark4: ['Mark IV. That machine is as good as it gets.', 'Fully maxed. Engineers will write songs about it.'],
  half: ['Halfway there. I can almost smell the rain.', 'Fifty percent. This rock is starting to breathe.'],
  speed: ['Under five minutes? That is a Corps record.', 'Fastest terraform I have ever logged.'],
  combo: ['Look at those hands go!', 'Twenty-five in a row. Remind me never to arm-wrestle you.'],
  crate: ['Supply drop from HQ. Courtesy of the Corps.', 'Fresh supplies. Do not spend it all in one place.'],
  moon: ['Stop poking the moon, Engineer. ...Fine, one more.', 'The moon says hello.'],
  paid: ['Contract done. HQ pays on time, for once.', 'Clean work. The bonus is in your account.'],
};
function sayLine() { // type the line out, a few letters per tick, the portrait bobbing while it talks
  const full = val(gLines[gi].text);
  gShown = 0; $('gsr').textContent = full;
  $('guide').classList.add('talk');
  clearInterval(gTimer);
  gTimer = setInterval(() => {
    gShown = Math.min(full.length, gShown + 2);
    if (gShown % 4 === 0 && full[gShown - 1] !== ' ') play('talk'); // commander blips as he talks
    $('gsay').textContent = full.slice(0, gShown);
    $('gface').src = FACE[(gShown >> 3) & 1]; // comm light blinks while talking
    if (gShown >= full.length) {
      clearInterval(gTimer); $('guide').classList.remove('talk'); $('gface').src = FACE[0]; updateGuide();
      if (gLines[gi]?.auto) quipTimer = setTimeout(nextLine, 4500); // a remark lingers a few seconds, then goes
    }
  }, 30);
  updateGuide();
}
function nextLine() {
  clearTimeout(quipTimer);
  if (++gi < gLines.length) return sayLine();
  clearInterval(gTimer);
  $('guide').hidden = true; $('guide').classList.remove('quip');
  if (gIntro) { S.intro = true; save(); }
}
$('gbubble').addEventListener('click', () => {
  if (!gLines[gi]) return; // nothing to say (a stale click after the briefing closed)
  const full = val(gLines[gi].text);
  if (gShown < full.length) { gShown = full.length - 1; return; } // first tap finishes the line
  if (!gLines[gi].until) nextLine();
});
$('gskip').addEventListener('click', () => { gi = gLines.length - 1; nextLine(); });
// Called 10x a second from updateUI: hint text, waiting steps, and staying clear of the panel and its arrows.
function updateGuide() {
  if ($('guide').hidden) return;
  const l = gLines[gi], done = gShown >= val(l.text).length;
  if (l.until && l.until()) return nextLine();
  set($('ghint'), l.until ? '&gt; ' + val(l.hint) : done && !l.auto ? '&gt; tap to continue' : '');
  $('ghint').classList.toggle('wait', !!l.until);
  $('guide').classList.toggle('compact', sel >= 0); // panel open: hide the portrait, keep the bubble above the panel and arrows
  $('guide').style.bottom = (sel >= 0 ? panelH + 100 : $('bar').offsetHeight - 12) + 'px'; // feet tucked behind the bar, so the talking bob never shows a gap
}

// ---------- saving & offline progress (browser localStorage: no server, per device) ----------
const SAVE = 'terraform-save-v1', awayCap = () => (has('sleep') ? 24 : 12) * 3600; // offline time counted, in seconds
const syncStage = () => { stage = STAGES.filter(s => healOf(S.earned) >= s.at).length; }; // no milestone pop-ups for old progress
function save() {
  if (frozen) return;
  try {
    localStorage.setItem(SAVE, JSON.stringify({
      t: hiddenAt || Date.now(), played: last - S.start, // hidden tab: the loop stopped when it was hidden, so count from then
      S: { life: S.life, earned: S.earned, taps: S.taps, goal: S.goal, world: S.world, on: S.on, L: S.L, seeds: S.seeds, tal: S.tal, intro: S.intro, done: S.done, best: S.best, ach: S.ach, n: S.n, daily: S.daily, boon: S.boon, offer: S.offer, contract: S.contract },
      items: items.slice(-150).map(it => [Math.round(it.u), Math.round(it.v)]),
    }));
  } catch { /* private mode or full storage: keep playing unsaved */ }
}
// The save is outside data (could be stale or hand-edited): check every field before trusting it.
const optional = (v, ok) => v === undefined || ok(v); // fields that older saves lack
const validSave = d => !!d && Number.isFinite(d.t) && !!d.S
  && ['life', 'earned'].every(k => Number.isFinite(d.S[k]) && d.S[k] >= 0 && d.S[k] < 1e300) // room for 24h of income on the last allowed world
  && ['taps', 'goal', 'world'].every(k => Number.isInteger(d.S[k]) && d.S[k] >= 0)
  && d.S.goal <= GOALS.length && d.S.world <= MAX_WORLD // warp() never goes past it, so every reachable save loads
  && Array.isArray(d.S.on) && d.S.on.length === SYS.length && d.S.on.every((on, s) => typeof on === 'boolean' && (!on || s === 0 || d.S.on[s - 1])) // unlocked in order
  && Array.isArray(d.S.L) && d.S.L.length === SYS.length && d.S.L.every((l, s) => Array.isArray(l) && l.length === 3 && l.every(n => Number.isInteger(n) && n >= 0 && n <= MAXL) && (d.S.on[s] || l.every(n => !n)))
  && optional(d.S.intro, v => typeof v === 'boolean') && optional(d.S.done, v => typeof v === 'boolean')
  && optional(d.S.seeds, v => Number.isInteger(v) && v >= 0 && v <= 1e6) // one per warp plus lucky crates
  && optional(d.S.tal, v => Array.isArray(v) && v.every(id => TAL.some(t => t.id === id)))
  && optional(d.S.best, v => !!v && typeof v === 'object' && Object.entries(v).every(([k, s]) => WORLDS.some(w => w.name === k) && Number.isInteger(s) && s >= 0))
  && optional(d.S.ach, v => Array.isArray(v) && v.every(id => ACH.some(a => a.id === id)))
  && optional(d.S.n, v => !!v && typeof v === 'object' && Object.values(v).every(x => Number.isFinite(x) && x >= 0))
  && optional(d.S.daily, v => v === '' || typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v))
  && optional(d.S.boon, v => v === '' || BOONS.some(b => b.id === v))
  && optional(d.S.offer, v => Array.isArray(v) && v.length <= 3 && v.every(id => BOONS.some(b => b.id === id)))
  && optional(d.S.contract, c => c === null || !!c && typeof c === 'object' && Object.hasOwn(CONTRACT_KINDS, c.kind)
    && ['arg', 't', 'secs', 'reward'].every(k => Number.isFinite(c[k])) && c.arg >= 0 && c.reward >= 0
    && (c.kind !== 'unlock' || Number.isInteger(c.arg) && c.arg > 0 && c.arg < SYS.length) && (c.kind !== 'earn' || Number.isFinite(c.from)));
console.assert(!validSave({ t: 1, S: { life: 0, earned: 0, taps: 0, goal: 0, world: 0, on: [false, true, false, false, false, false], L: SYS.map(() => [0, 0, 0]) } }), 'save: out-of-order unlock');
console.assert(validSave({ t: 1, S: { life: 5, earned: 5, taps: 1, goal: 0, world: 0, on: [true, false, false, false, false, false], L: [[1, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]] } }), 'save: minimal old save');
// Restores the save and credits the time since it was written. Returns false if there was nothing usable.
function load() {
  let raw = null, d;
  try { raw = localStorage.getItem(SAVE); d = JSON.parse(raw); } catch { d = null; }
  if (!validSave(d)) {
    try { if (raw) localStorage.setItem(SAVE + '-bad', raw); } catch { /* ignore */ } // keep an unreadable save instead of letting the next autosave erase it
    return false;
  }
  const v = d.S, prev = S.world;
  Object.assign(S, { life: v.life, earned: v.earned, taps: v.taps, goal: v.goal, world: v.world,
    on: v.on, L: v.L, start: performance.now() / 1000 - (Number.isFinite(d.played) ? d.played : 0), // now, not the stale frame time from before a hidden tab done: v.done ?? false, best: v.best ?? {}, boon: v.boon ?? '', offer: v.offer ?? [], contract: v.contract ?? null,
    ach: [...new Set(v.ach || [])], n: { crit: 0, comet: 0, storm: 0, away: 0, combo: 0, crates: 0, moon: 0, contracts: 0, ...(v.n || {}) }, daily: v.daily ?? '',
    seeds: v.seeds ?? v.world, tal: [...new Set(v.tal || [])], intro: v.intro ?? true }); // saves from before the intro skip it // saves from before talents: one seed per planet already healed
  const was = SYS.map(sy => sy.id).join();
  setLoadout(S.world);
  if (W && SYS.map(sy => sy.id).join() !== was) resize(); // another tab warped meanwhile
  items.length = 0;
  if (Array.isArray(d.items)) for (const p of d.items) if (Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])) items.push({ u: p[0], v: p[1], born: -9 });
  if (S.world !== prev) buildWorld(); // same world (every tab return): keep the textures, only the patches changed
  away(d.t);
  return true;
}
// Credit the income earned since `since` (ms timestamp) while the game wasn't running.
function away(since) {
  const sec = Math.min(awayCap(), Math.max(0, (Date.now() - since) / 1000)), gain = rateOf(false) * sec * (has('dream') ? 2 : 1);
  if (ev && (evT -= sec) <= 0) endEvent(); // the event's clock ran too
  S.life += gain; S.earned += gain; // always credit, even a few seconds in another tab
  S.n.away = Math.max(S.n.away, Math.round(sec));
  if (S.contract) { S.contract.t -= sec; if (S.contract.kind === 'earn') S.contract.from += gain; } // the clock runs while away; offline income doesn't count
  if (sec >= 30 && gain > 0) {
    const h = sec / 3600 | 0, m = (sec % 3600) / 60 | 0;
    toast(`WELCOME BACK. In ${h ? h + 'h ' : ''}${m}m away your colony made ${fmt(gain)} life.`, true);
    if (h) setTimeout(() => quip(`${h > 1 ? h + ' hours' : 'An hour'} gone and the colony kept the lights on. ${fmt(gain)} life in the bank.`, true), 800); // after load settles
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
  if (!W || !e.isPrimary || e.button > 0) return; // not laid out yet; right/middle click and extra fingers are not taps
  const [ox, oy] = camOrigin(), x = (e.clientX / PX - ox) / cam.z, y = (e.clientY / PX - oy) / cam.z;
  if (comet && Math.hypot(x - comet.x, y - comet.y) <= HIT) return catchComet();
  if (crate) { const [cx, cy] = cratePos(last); if (Math.abs(x - cx) <= 16 && y >= cy - 30 && y <= cy + 12) return openCrate(); } // crate or its parachute (a box, so it doesn't steal taps from the systems nearby)
  let hit = -1, best = Infinity; // anywhere on a sprite (plus a finger's margin) counts; the nearest centre wins
  SYS.forEach((_, s) => {
    const [sx, sy] = sysPos(s, last), img = look(s).lit, d = Math.hypot(x - sx, y - sy);
    if (Math.abs(x - sx) <= img.width / 2 + HIT / 2 && Math.abs(y - sy) <= img.height / 2 + HIT / 2 && d < best) { best = d; hit = s; }
  });
  if (hit >= 0) return openPanel(hit);
  if (moonAt && Math.hypot(x - moonAt.x, y - moonAt.y) <= moonAt.r + 3 && (moonAt.front || (x - CX) ** 2 + (y - CY) ** 2 > R * R)) return tapMoon(); // after the systems, so a passing moon never steals their taps; behind the planet: only the part that shows
  if (y >= GY) return; // the ground is solid
  if ((x - CX) ** 2 + (y - CY) ** 2 > R * R) return closePanel();
  tapPlanet(x, y);
});
// keyboard players tap the planet with Enter or Space while the canvas has focus
// Keyboard on the focused planet: Enter/Space catches a comet or opens a supply crate when one is in the sky, else taps the planet;
// M taps the moon. Pointer players get the same things by tapping them.
cv.addEventListener('keydown', e => {
  if ((e.key === 'm' || e.key === 'M') && moonAt) { e.preventDefault(); return tapMoon(); }
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  if (e.repeat) return; // a held key is not a combo
  if (comet) return catchComet();
  if (crate) return openCrate();
  tapSomewhere();
});
const tapSomewhere = (auto = false) => tapPlanet(CX + (Math.random() - .5) * R, CY - R * (.2 + Math.random() * .5), auto); // a spot on the visible face
// Combo: hand taps less than COMBO_GAP apart chain up; 10 in a row pay x2, 25 pay x3. Pausing breaks it.
const COMBO_GAP = .6, comboMul = () => (combo >= 25 ? 3 : combo >= 10 ? 2 : 1);
let combo = 0, comboAt = -9;
function tapPlanet(x, y, auto = false) {
  if (!auto) {
    const was = comboMul();
    combo = last - comboAt <= COMBO_GAP ? combo + 1 : 1; comboAt = last;
    if (comboMul() > was) { pulses.push({ r: R * .9, life: 1, col: C.sun }); play('coin'); if (combo === 25) quip(QUIPS.combo); }
    S.n.combo = Math.max(S.n.combo || 0, combo);
  }
  const crit = Math.random() < (has('crit2') ? .2 : has('crit') ? .1 : 0), storm = ev?.id === 'shower'; // Lucky Strike / Jackpot; meteor showers pay x5
  const g = tapGain() * (crit ? 10 : 1) * (storm ? 5 : 1) * (auto ? 1 : comboMul());
  S.life += g; S.earned += g; S.taps++;
  if (crit) S.n.crit++;
  if (storm) S.n.storm++;
  if (S.on[0]) { const [lx, ly] = muzzle(0); beams.push({ x1: lx, y1: ly, x2: x, y2: y, life: 1, col: C.pink, end: true }); }
  burst(x, y, crit ? [C.sun, C.line, C.pink] : [C.line, C.pink], crit ? 24 : 10);
  play(crit ? 'crit' : 'tap'); if (crit && !auto) buzz(25); // auto taps would buzz nonstop
  floats.push({ x, y: y - 8, text: '+' + fmt(g), life: 1, col: crit ? C.sun : C.line });
}

// ---------- events: every few minutes at the screen, a surprise that pays for being there ----------
const EVENTS = {
  shower: { name: 'METEOR SHOWER', dur: 15, text: 'Taps pay x5 while it lasts.' },
  flare: { name: 'SOLAR FLARE', dur: 12, text: 'Every system fires double.' },
  comet: { name: 'GOLDEN COMET', dur: 9, text: 'Tap it (or press Enter on the planet) before it leaves: a minute of income.' },
};
let ev = null, evT = 0, evNext = 150 + Math.random() * 90, comet = null; // evNext: seconds of play until the next event
const meteors = [];
function startEvent(id = Object.keys(EVENTS)[Math.random() * 3 | 0]) {
  ev = { ...EVENTS[id], id }; evT = ev.dur;
  if (id === 'comet') comet = { x: -16, y: TOP + 20 + Math.random() * Math.max(10, CY - R - TOP - 50), vx: (W + 32) / ev.dur }; // crosses the open sky above the planet
  toast(`${ev.name}! ${ev.text}`, true); play('milestone'); shake = .5; quip(QUIPS[id], true);
}
function endEvent() { ev = null; comet = null; evNext = (120 + Math.random() * 120) / (S.boon === 'storm' ? 3 : 1); } // Storm Season: 3x as often
function catchComet() {
  const g = Math.max(100 * priceScale(), rateOf(false) * 60);
  S.life += g; S.earned += g; S.n.comet++; buzz([30, 30, 60]);
  burst(comet.x, comet.y, [C.sun, C.line, C.pink], 40, 70); play('crit'); shake = .6;
  floats.push({ x: comet.x, y: comet.y - 10, text: '+' + fmt(g), life: 1.6, col: C.sun });
  endEvent();
  if ($('guide').classList.contains('quip')) nextLine(); // replace the "grab it" remark, never a briefing line
  quip(QUIPS.caught, true);
}
function stepEvents(dt) {
  if (ev) { if ((evT -= dt) <= 0) endEvent(); }
  else if (S.on[0] && !$('c').inert && (evNext -= dt) <= 0) startEvent(); // not during the tutorial or behind a dialog
  if (ev?.id === 'shower' && Math.random() < dt * 12) meteors.push({ x: Math.random() * W, y: TOP, vx: -40 - Math.random() * 40, vy: 110 + Math.random() * 50 });
  for (const m of meteors) {
    m.x += m.vx * dt; m.y += m.vy * dt;
    if (Math.hypot(m.x - CX, m.y - CY) < R || m.y > GY || m.x < -10) { m.dead = true; if (m.y < GY) burst(m.x, m.y, [C.sun, C.line], 6, 30); }
  }
  meteors.splice(0, meteors.length, ...meteors.filter(m => !m.dead));
  if (comet) comet.x += comet.vx * dt;
}

// ---------- contracts: optional timed side jobs from the Commander, built from where the player is right now ----------
let conNext = 60; // seconds of play until the next offer
// A contract is plain data { kind, arg, from?, secs, t (seconds left), reward } so it saves and reloads; its kind supplies the rules.
const CONTRACT_KINDS = { // pick() returns { arg, from?, secs } or null when the kind does not fit the moment
  unlock: { pick: () => { const s = S.on.indexOf(false); return s > 0 && unlocked(s) ? { arg: s, secs: 180 } : null; }, text: c => `Unlock the ${SYS[c.arg].name}`, done: c => S.on[c.arg] },
  level: { pick: () => { const top = Math.max(...S.L.flat()); return top < MAXL ? { arg: Math.min(MAXL, top + 5), secs: 120 } : null; }, text: c => `Get any upgrade to Lv ${c.arg}`, done: c => Math.max(...S.L.flat()) >= c.arg },
  combo: { pick: () => ({ arg: 15, secs: 60 }), text: c => `Chain a ${c.arg}-tap combo`, done: c => combo >= c.arg },
  earn: { pick: () => ({ arg: Math.max(500 * priceScale(), rateOf() * 130), from: S.earned, secs: 90 }), text: c => `Earn ${fmt(c.arg)} life`, done: c => S.earned - c.from >= c.arg },
};
const conText = c => CONTRACT_KINDS[c.kind].text(c);
function stepContract(dt) {
  const c = S.contract;
  if (c) {
    if (CONTRACT_KINDS[c.kind].done(c)) { // paid: about 3 minutes of income
      S.life += c.reward; S.earned += c.reward; S.n.contracts++;
      toast(`CONTRACT DONE: ${conText(c)}. +${fmt(c.reward)} life.`, true); play('coin'); buzz(20); quip(QUIPS.paid);
      S.contract = null; conNext = 90;
    } else if (!$('c').inert && (c.t -= dt) <= 0) { toast(`Contract expired: ${conText(c)}.`); S.contract = null; conNext = 90; } // the clock pauses behind dialogs, where the job can't be worked on
    return;
  }
  if (!S.intro || !S.on[0] || S.done || $('c').inert || (conNext -= dt) > 0) return;
  const options = Object.entries(CONTRACT_KINDS).map(([kind, k]) => { const o = k.pick(); return o && { kind, ...o }; }).filter(Boolean);
  const o = options[Math.random() * options.length | 0];
  S.contract = { ...o, t: o.secs, reward: Math.max(300 * priceScale(), rateOf(false) * 180) };
  play('ui'); quip(`New contract: ${conText(S.contract)}. You have ${mmss(o.secs)}. Optional, but HQ pays well.`);
}

// ---------- daily supply drop: once per calendar day a crate parachutes into the sky and waits to be tapped ----------
const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; // YYYY-MM-DD, local time, any locale
let crate = null, crateWait = 8; // crate: { side: -1 | 1, k: 0..1 descent }; first drop comes a few seconds into a session
const cratePos = t => { // beside the planet's top, clear of the orbit systems; floats down, then bobs
  const ty = Math.max(TOP + 34, CY - R0 * 1.05), e = 1 - (1 - crate.k) ** 3;
  return [Math.round(CX + crate.side * R0 * .75), Math.round(-12 + (ty + 12) * e + (crate.k >= 1 && !calm() ? Math.sin(t * 2) * 2 : 0))];
};
function stepCrate(dt) {
  if (crate) { crate.k = Math.min(1, crate.k + dt / 3); return; }
  if (S.daily === today() || !S.intro || !S.on[0] || $('c').inert || (crateWait -= dt) > 0) return;
  crate = { side: Math.random() < .5 ? -1 : 1, k: 0, day: today() }; // day: opening it after midnight still counts for the day it dropped
  toast('SUPPLY DROP incoming. Tap the crate (or press Enter on the planet) to open it.', true); play('ui');
}
// Easter egg: the moon answers a tap with a fact and a little life, once every 3 s.
function tapMoon() {
  if (last < moonReady) return;
  moonReady = last + 3;
  const g = tapGain() * 5;
  S.life += g; S.earned += g; S.n.moon = (S.n.moon || 0) + 1;
  burst(moonAt.x, moonAt.y, [C.soft, C.line], 16, 30); play('coin');
  floats.push({ x: moonAt.x, y: moonAt.y - moonAt.r - 6, text: '+' + fmt(g), life: 1.4, col: C.soft });
  toast(MOON_FACTS[moonI++ % MOON_FACTS.length]);
  if (S.n.moon === 1 || S.n.moon % 5 === 0) quip(QUIPS.moon);
}
function openCrate() {
  const [x, y] = cratePos(last), g = Math.max(500 * priceScale(), rateOf(false) * 600), seed = Math.random() < .1;
  S.life += g; S.earned += g; S.daily = crate.day; S.n.crates++; crate = null;
  if (seed) S.seeds++;
  burst(x, y, [C.sun, C.line, C.pink], 50, 70); play('coin'); buzz(30); shake = .4;
  floats.push({ x, y: y - 10, text: '+' + fmt(g), life: 1.8, col: C.sun });
  toast(`Supply drop: ${fmt(g)} life${seed ? ' and a Star Seed!' : '.'} Next one tomorrow.`, true);
  quip(QUIPS.crate, true); save();
}
const CRATE = tiny(['wwwwwwwww', 'wnnnpnnnw', 'wnnnpnnnw', 'wpppppppw', 'wnnnpnnnw', 'wnnnpnnnw', 'wwwwwwwww']);
function drawCrate(t) {
  if (!crate) return;
  const [x, y] = cratePos(t);
  for (let r = 13; r > 0; r--) P.ring(x, y - 18, r, r * .6, Math.PI, 2 * Math.PI, r > 11 ? C.line : r % 4 < 2 ? C.pink : C.bg); // striped canopy
  P.fill(x - 13, y - 18, 27, 1, C.line);
  for (const dx of [-12, 0, 12]) P.line(x + dx, y - 18, x + Math.sign(dx) * 6, y - 7, C.soft); // lines
  ctx.drawImage(CRATE, x - 9, y - 7, 18, 14); // the crate at 2x
  if (crate.k >= 1 && (calm() || Math.sin(t * 5) > 0)) P.fill(x + 11, y - 10, 3, 3, C.pink); // tap me
}

// ---------- sector cinematic: after the last world of a cycle, all eight worlds alive in a row, the Commander's speech, then the warp ----------
let cine = null; // { t, boon, planets: [{ w, seed, lush }], cycle }
const CINE_END = 17;
function startCine(boon) {
  $('warp').hidden = true; // the dialog goes, the shield stays: nothing behind is reachable until the warp
  const first = S.world + 1 - WORLDS.length;
  cine = { t: 0, boon, cycle: Math.floor((S.world + 1) / WORLDS.length) + 1, planets: WORLDS.map((w, i) => ({ w, seed: 11 + (first + i) * 7, lush: null })) };
  Object.assign(cam, { z: 1, fx: W / 2, fy: H / 2, ax: W / 2, ay: H / 2 });
  document.documentElement.classList.add('cine'); $('cineskip').hidden = false; $('cineskip').focus();
  $('guide').inert = false; // the commander speaks over it (his lines advance by themselves)
  play('milestone');
  guide([
    { text: `${WORLDS.length} worlds, Engineer. ${WORLDS.length} dead rocks, and every one of them is breathing now.`, auto: true },
    { text: 'The Corps has never logged anything like it. Neither have I.', auto: true },
    { text: `But the dark out there is bigger than one sector. Cycle ${roman(cine.cycle)} starts now. Let's go.`, auto: true },
  ]);
}
function endCine() {
  if (!cine) return;
  const boon = cine.boon;
  cine = null;
  document.documentElement.classList.remove('cine'); $('cineskip').hidden = true;
  if (!$('guide').hidden) { gi = gLines.length - 1; nextLine(); } // cut the speech short if skipped
  warp(boon); save();
}
$('cineskip').addEventListener('click', endCine);
const planetAt = i => { // one row of eight on wide screens, two rows of four on tall ones
  const tall = H > W, cols = tall ? 4 : 8, gap = W / (cols + 1), r = Math.round(Math.min(gap * .36, H * (tall ? .09 : .13)));
  return { x: Math.round(gap * (i % cols + 1)), y: Math.round(H * (tall ? (i < cols ? .26 : .5) : .38)), r };
};
function stepCine(t, dt) {
  const c = cine; c.t += dt;
  if (c.t >= CINE_END) return endCine();
  const due = c.planets.findIndex(p => !p.lush); // build one world's texture per frame, just ahead of its entrance
  if (due >= 0 && c.t > due * .7) c.planets[due].lush = makeLush(c.planets[due].w, c.planets[due].seed);
  // scene: the sky, then each world popping in
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  for (const [x, y, k] of stars) if (x < W && y < H) P.dot(x, y, k > 4 ? C.soft : C.dot);
  c.planets.forEach((p, i) => {
    const at = .8 + i * .7, k = Math.min(1, (c.t - at) / .4);
    if (k <= 0 || !p.lush) return;
    const { x, y, r } = planetAt(i), rr = Math.max(2, Math.round(r * (calm() ? 1 : 1 - (1 - k) ** 3)));
    for (let d = rr + 4; d > rr; d--) { ctx.globalAlpha = .25; P.ring(x, y, d, d, 0, 2 * Math.PI, `rgb(${p.w.ag})`); } // glow
    ctx.globalAlpha = 1;
    for (let dx = -rr; dx < rr; dx++) { // a small spinning globe
      const h = Math.round(2 * Math.sqrt(rr * rr - (dx + .5) ** 2)), u = Math.floor((((calm() ? 0 : c.t * 8 + i * 30) + (Math.asin((dx + .5) / rr) / Math.PI + .5) * TW / 2) % TW + TW) % TW);
      ctx.drawImage(p.lush, u, 0, 1, TH, x + dx, y - h / 2, 1, h);
    }
    for (let dy = -rr; dy < rr; dy++) { const hw = Math.sqrt(rr * rr - (dy + .5) ** 2); P.fill(x + hw * .3, y + dy, hw * .7, 1, 'rgba(20,18,40,.35)'); } // night side
    P.ring(x, y, rr, rr, 0, 2 * Math.PI, C.line);
  });
  flash = Math.max(0, flash - dt * 1.2);
  present(t);
  // names and best times at screen resolution (crisp text), then the cycle title
  const fs = Math.max(15, Math.round(9 * K)), z = K;
  out.textAlign = 'center'; out.textBaseline = 'top';
  c.planets.forEach((p, i) => {
    const a = Math.min(1, (c.t - .8 - i * .7 - .3) / .5);
    if (a <= 0) return;
    const { x, y, r } = planetAt(i);
    out.globalAlpha = a;
    out.font = `${fs}px VT323, monospace`; out.fillStyle = C.line; out.fillText(p.w.name, x * z, (y + r + 8) * z);
    out.font = `${Math.round(fs * .85)}px VT323, monospace`; out.fillStyle = C.soft; out.fillText(S.best[p.w.name] !== undefined ? mmss(S.best[p.w.name]) : '-', x * z, (y + r + 8) * z + fs * 1.1);
  });
  const ta = Math.min(1, (c.t - 12) / 1.2);
  if (ta > 0) {
    out.globalAlpha = ta; out.font = `${Math.round(fs * 3)}px VT323, monospace`; out.fillStyle = C.pink;
    out.fillText(`CYCLE ${roman(c.cycle)}`, W * z / 2, H * z * (H > W ? .66 : .62));
  }
  out.globalAlpha = 1;
}

// ---------- loop ----------
let uiTick = 0, resume = true, panelH = 0, autoT = 0, paidAt = 0; // resume: skip one income gap after a hidden tab (away() already paid it)
let errors = 0;
function frame(ms) { // one bad frame must not stop the game: log it and keep going
  try { step(ms); } catch (e) { if (errors++ < 5) console.error(e); }
  requestAnimationFrame(frame);
}
function step(ms) {
  const t = ms / 1000, dt = resume ? 0 : Math.max(0, Math.min(.1, t - last)), now = Date.now();
  // income runs on the wall clock: browsers also pause animation frames without hiding the tab (screen lock,
  // covered window), and that time must still pay. Long pauses are paid like time away (capped, with a toast).
  const gap = resume ? 0 : Math.max(0, (now - paidAt) / 1000);
  last = t; paidAt = now; resume = false;
  if (!W) return; // no layout yet (0-size viewport)
  if (gap >= 30) away(now - gap * 1000);
  else { const g = rateOf() * gap; S.life += g; S.earned += g; }
  const heal = healOf(S.earned);
  off = (off + dt * 6) % TW;
  if (cine) return stepCine(t, dt);
  shake = calm() ? 0 : Math.max(0, shake - dt * 3); flash = Math.max(0, flash - dt * 1.2);
  if (heal >= 1 && !S.done) showWarp();
  const aps = has('autotap2') ? 4 : has('autotap') ? 1 : 0; // Tap Bot / Tap Swarm: automatic taps per second
  if (aps && (autoT += dt * aps) >= 1) { autoT -= 1; tapSomewhere(true); }
  if (combo && t - comboAt > COMBO_GAP) combo = 0;

  const reached = STAGES.filter(s => heal >= s.at).length;
  if (reached > stage) { stage = reached; toast(STAGES[stage - 1].text, true); shake = .8; play('milestone'); if (stage === 2) quip(QUIPS.half); }
  stepEvents(dt); stepLife(dt, heal); stepCrate(dt); stepContract(dt);
  zoom += (1 - zoom) * Math.min(1, dt * 1.5);
  R = Math.round(R0 * zoom);

  // camera: zoom 2x onto the selected system, centred in the open space right of the stats and above the panel
  const k = Math.min(1, dt * 4), open = sel >= 0, [fx, fy] = open ? sysPos(sel, 0) : [W / 2, H / 2];
  const tgt = { z: open ? 2 : 1, fx, fy, ax: open ? (SIDE.r + W) / 2 : W / 2, ay: open ? (TOP + (H - panelH / PX)) / 2 : H / 2 };
  for (const key in tgt) { cam[key] += (tgt[key] - cam[key]) * k; if (Math.abs(tgt[key] - cam[key]) < .02) cam[key] = tgt[key]; } // snap to exact values: whole-pixel scale when settled

  // unlocked systems keep firing; more crew fires faster, but only a few shots fly at once
  SYS.forEach((sy, s) => {
    if (!S.on[s] || t < (sy.next || 0) || shots.length + beams.length >= 8) return;
    fire(s, false);
    sy.next = t + cadence(s) * (ev?.id === 'flare' ? .5 : 1) * (.7 + Math.random() * .6);
  });
  for (const s of shots) if ((s.t += dt) >= s.dur) { s.done = true; land(s.s, s.tx, s.ty, s.real, s.quiet); }
  shots.splice(0, shots.length, ...shots.filter(s => !s.done));
  for (const p of pulses) { p.r += (p.x === undefined ? R * 1.4 : 50) * dt; p.life -= dt * 1.2; }
  for (const q of parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= .95; q.vy *= .95; q.life -= dt * 1.4; }
  for (const f of floats) { f.y -= 16 * dt; f.life -= dt * 1.2; }
  for (const b of beams) if (b.delay > 0) b.delay -= dt; else b.life -= dt * (b.fade || 5);
  for (const a of [parts, floats, beams, pulses]) a.splice(0, a.length, ...a.filter(q => q.life > 0));

  draw(t, heal);
  if ((uiTick += dt) > .1) { uiTick = 0; updateUI(); }
}

// Self-checks for the gameplay rules, run once on the default state (before the save loads) and fully restored afterwards.
(() => {
  const keep = JSON.stringify(S), was = { bulk, combo, crateWait };
  try {
    Object.assign(S, { on: [true, false, false, false, false, false], life: 1e12 });
    bulk = 1; console.assert(bulkOf(0, 1)[0] === 1 && bulkOf(0, 1)[1] === price(0, 1), 'bulk x1');
    bulk = 10; console.assert(bulkOf(0, 1)[0] === 10 && bulkOf(0, 1)[1] === [...Array(10).keys()].reduce((a, l) => a + price(0, 1, l), 0), 'bulk x10');
    bulk = 0; S.life = price(0, 1, 0) + price(0, 1, 1); console.assert(bulkOf(0, 1)[0] === 2, 'bulk MAX buys what you can afford');
    S.life = 0; console.assert(bulkOf(0, 1)[0] === 1, 'bulk MAX always shows at least one level');
    console.assert([9, 10, 24, 25].map(n => (combo = n, comboMul())).join() === '1,2,2,3', 'combo tiers');
    const base = { tap: tapGain(), price: price(0, 1), goal: goalOf(), out: sysOut(0) }, ratio = (id, f) => (S.boon = id, f());
    console.assert(ratio('hands', tapGain) === base.tap * 3 && ratio('short', goalOf) === base.goal * .75 && ratio('summer', () => sysOut(0)) === base.out * 1.5
      && ratio('bulk', () => price(0, 1)) === Math.ceil(ucost(0, 1, 0) * .8) && ratio('', () => price(0, 1)) === base.price, 'boon multipliers');
    console.assert(/^\d{4}-\d{2}-\d{2}$/.test(today()), 'daily date format');
    Object.assign(S, { intro: true, daily: today() }); crateWait = 0; stepCrate(1); console.assert(!crate, 'one supply drop per day');
    console.assert(CONTRACT_KINDS.unlock.pick()?.arg === 1, 'contract: unlock the next system');
    const job = { kind: 'earn', arg: 500, from: 0, secs: 90, t: 40, reward: 300 }, sv = c => validSave({ t: 1, S: { ...JSON.parse(keep), contract: c } });
    console.assert(sv(job) && sv(null) && !sv({ ...job, kind: 'cheat' }) && !sv({ ...job, kind: 'unlock', arg: 9 }), 'contract: save validation');
    S.on = SYS.map(() => true); console.assert(CONTRACT_KINDS.unlock.pick() === null, 'contract: nothing left to unlock');
  } finally { Object.assign(S, JSON.parse(keep)); ({ bulk, combo, crateWait } = was); crate = null; }
})();
if (new URLSearchParams(location.search).has('reset')) { // ?reset: start over (demos, judges); runs after the old page saved on its way out
  try { localStorage.removeItem(SAVE); } catch { /* storage blocked: nothing saved anyway */ }
  history.replaceState(null, '', location.pathname); // a later reload keeps the new game
}
load();
updateUI();
resize();
requestAnimationFrame(frame);
document.fonts?.ready.then(resize); // the HUD font changes box heights once it arrives
if (!S.intro) guide(INTRO, true); // new players meet the commander
if (self !== top) document.documentElement.classList.add('embed'); // itch.io and other iframes: see html.embed in style.css
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { /* offline play is optional */ });
