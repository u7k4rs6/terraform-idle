'use strict';

// Muted slate night, white line-art, soft pink accents.
const C = { bg: '#2b3047', deep: '#1f2333', line: '#e9ecf5', dim: '#59607f', dot: '#6f79a3', soft: '#8f99c4', pink: '#e98aa3', sil: '#1c2030', sun: '#ffe08a', zap: '#bfe6ff', lava: '#ff8a3d', gas: '#c9d6b8' };

// Every system in the game. Each world fields six of them (LOADOUTS); a system's cost and output come from its
// unlock slot (TIER), so any loadout paces the same. Each has 3 upgrades (max Lv 50):
// [0] +1 crew, [1] +25% output per level, [2] x1.08 output per level (compounding).
const CATALOG = {
  laser: { name: 'Laser Station', shot: 'beam', unit: 'gunner',
    ups: [['Recruit Gunner', '+1 gunner'], ['Stabilized Optics', '+25% damage'], ['Overcharged Capacitors', 'x1.08 laser output']],
    desc: 'Blasts the crust to release trapped gases.', fact: 'In 2013 NASA beamed data from Moon orbit to Earth by laser at 622 megabits per second.' },
  solar: { name: 'Solar Mirror', shot: 'light', unit: 'mirror',
    ups: [['Add Mirror', '+1 mirror'], ['Polished Glass', '+25% heat'], ['Focusing Lens', 'x1.08 solar output']],
    desc: 'Focuses sunlight to warm the frozen ground.', fact: 'Mars averages −60 °C. Giant orbital mirrors are a real proposal for warming it up.' },
  drone: { name: 'Drone Hive', shot: 'drone', unit: 'drone',
    ups: [['Build Drone', '+1 drone'], ['Seed Payload', '+25% seeds'], ['Swarm AI', 'x1.08 hive output']],
    desc: 'Drones scatter hardy microbes across the surface.', fact: 'A single seed-planting drone can drop tens of thousands of seed pods in a day.' },
  rocket: { name: 'Comet Launcher', shot: 'rocket', unit: 'pilot',
    ups: [['Hire Pilot', '+1 pilot'], ['Bigger Ice Payload', '+25% water'], ['Fusion Boosters', 'x1.08 launcher output']],
    desc: 'Hurls comet ice at the planet to fill its oceans.', fact: 'Some of Earth’s water may have been delivered by icy comets and asteroids.' },
  bio: { name: 'Bio Seeder', shot: 'pod', unit: 'technician',
    ups: [['Lab Technician', '+1 technician'], ['Hardy Strains', '+25% growth'], ['Spore Clouds', 'x1.08 seeder output']],
    desc: 'Fires pods of engineered plants into the soil.', fact: 'Some lichens survived 34 days in a lab chamber simulating the surface of Mars.' },
  core: { name: 'Terra Core', shot: 'pulse', unit: 'engineer',
    ups: [['Engineer', '+1 engineer'], ['Plasma Containment', '+25% power'], ['Chain Reaction', 'x1.08 core output']],
    desc: 'Pulses raw energy through the whole planet.', fact: 'Fusion powers the Sun: it turns 4 million tonnes of matter into energy every second.' },
  striker: { name: 'Kinetic Striker', shot: 'rod', unit: 'loader',
    ups: [['Rod Loader', '+1 loader'], ['Tungsten Cores', '+25% impact'], ['Mag Rails', 'x1.08 striker output']],
    desc: 'Drops tungsten rods from orbit to crack open the crust.', fact: 'A tungsten rod dropped from orbit would hit at around 3 km per second, with no explosive at all.' },
  coil: { name: 'Storm Coil', shot: 'arc', unit: 'coil',
    ups: [['Wind Coil', '+1 coil'], ['Superconductors', '+25% voltage'], ['Chain Lightning', 'x1.08 coil output']],
    desc: 'Fires lightning into the air to turn nitrogen into plant food.', fact: 'Lightning on Earth turns millions of tonnes of air nitrogen into natural fertilizer every year.' },
  asteroid: { name: 'Asteroid Drill', shot: 'rocks', unit: 'miner',
    ups: [['Hire Miner', '+1 miner'], ['Diamond Bits', '+25% ore'], ['Deep Shafts', 'x1.08 drill output']],
    desc: 'Mines a captured asteroid and showers the planet with minerals.', fact: 'The asteroid 16 Psyche may be mostly metal. NASA launched a probe to visit it in 2023.' },
  volcano: { name: 'Volcano Igniter', shot: 'lava', unit: 'geologist',
    ups: [['Geologist', '+1 geologist'], ['Deeper Vents', '+25% gas'], ['Magma Surge', 'x1.08 igniter output']],
    desc: 'Wakes sleeping volcanoes to thicken the atmosphere.', fact: 'Olympus Mons on Mars is the tallest volcano in the solar system, about 22 km high.' },
  forge: { name: 'Atmo Forge', shot: 'gas', unit: 'stoker',
    ups: [['Stoker', '+1 stoker'], ['Super Greenhouse', '+25% warming'], ['Twin Stacks', 'x1.08 forge output']],
    desc: 'Pumps out greenhouse gases that trap heat and warm the planet.', fact: 'Studies suggest factories making strong greenhouse gases could warm Mars by tens of degrees.' },
  antimatter: { name: 'Antimatter Reactor', shot: 'annihilate', unit: 'physicist',
    ups: [['Physicist', '+1 physicist'], ['Magnetic Bottle', '+25% yield'], ['Annihilation Cascade', 'x1.08 reactor output']],
    desc: 'Annihilates matter with antimatter for raw terraforming power.', fact: 'CERN traps antihydrogen in magnetic bottles. One gram of antimatter meeting matter would release about 43 kilotons of energy.' },
};
// Unlock slots 0-2 hang in orbit, 3-5 stand on the ground (see SLOT), so every loadout lists 3 orbital then 3 ground systems.
const TIER = [[100, 3], [1200, 20], [1.5e4, 140], [2e5, 1000], [2.5e6, 7000], [1.5e7, 40000]].map(([unlock, base]) => ({ unlock, base }));
const LOADOUTS = [
  ['laser', 'solar', 'drone', 'rocket', 'bio', 'core'],                 // world 1
  ['striker', 'coil', 'asteroid', 'volcano', 'forge', 'antimatter'],    // world 2: all new
  ['laser', 'coil', 'drone', 'volcano', 'bio', 'antimatter'],           // world 3: a mix of both
  ['striker', 'solar', 'asteroid', 'rocket', 'forge', 'core'],          // world 4: the other mix, then the cycle repeats
];
let SYS;
const setLoadout = w => { SYS = LOADOUTS[w % LOADOUTS.length].map((id, s) => ({ id, ...CATALOG[id], ...TIER[s] })); };
setLoadout(0);
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

// seeds: unspent Star Seeds (one per healed planet); tal: unlocked talent ids; intro: the commander's tutorial is done
const S = { life: 0, earned: 0, taps: 0, goal: 0, world: 0, start: 0, on: SYS.map(() => false), L: SYS.map(() => [0, 0, 0]), seeds: 0, tal: [], intro: false };
const has = id => S.tal.includes(id);
const boost = () => (has('echo') ? 2.5 : 2) ** S.world; // every world you finish multiplies all output for good
// Talent multipliers: on everything, and on pairs of systems.
const allMul = () => (has('roots') ? 1.25 : 1) * (has('bloom') ? 1.5 : 1) * (has('gaia') ? 2 : 1) * (has('kinetic') ? 1 + Math.min(1, S.taps / 1e4) : 1);
const PAIR = { lens: [0, 1], swarm: [2, 3], grow: [4, 5] };
const sysOut = s => sysRate(s, S.L[s]) * boost() * allMul() * Object.entries(PAIR).reduce((m, [id, ss]) => (has(id) && ss.includes(s) ? m * 2 : m), 1);
const rateOf = () => SYS.reduce((a, _, s) => a + (S.on[s] ? sysOut(s) : 0), 0);
const price = (s, k) => Math.ceil(ucost(s, k, S.L[s][k]) * (has('thrift') ? .9 : 1)); // next level of upgrade k
const unlockCost = s => Math.ceil(SYS[s].unlock * (has('cheap') ? .75 : 1));
const rewardOf = g => g.reward * (has('patron') ? 3 : 1);
const unlocked = s => s === 0 || S.on[s - 1];
const items = []; // life patches on the planet: { u, v (texture coords), born }
const pct = () => Math.floor(healOf(S.earned) * 100);

// Always one clear next step at the top, with a reward: [text, progress, target, reward, go].
// go: the system a tap on the unfinished goal jumps to (-1 = back to the planet); a function picks it at tap time.
const topSys = () => S.L.reduce((b, L, s) => (Math.max(...L) > Math.max(...S.L[b]) ? s : b), 0); // furthest-upgraded system
const GOALS = [
  ['Tap the planet 10 times', () => S.taps, 10, 50, -1],
  [() => `Unlock the ${SYS[0].name}`, () => +S.on[0], 1, 50, 0],
  [() => `Recruit 5 ${SYS[0].unit}s`, () => S.L[0][0], 5, 200, 0],
  [() => `Unlock the ${SYS[1].name}`, () => +S.on[1], 1, 500, 1],
  [() => `${SYS[0].ups[1][0]} to Lv 5`, () => S.L[0][1], 5, 1000, 0],
  ['Terraform 25%', pct, 25, 3000, -1],
  [() => `Unlock the ${SYS[2].name}`, () => +S.on[2], 1, 6000, 2],
  ['Get any upgrade to Lv 20', () => Math.max(...S.L.flat()), 20, 2e4, topSys],
  [() => `Unlock the ${SYS[3].name}`, () => +S.on[3], 1, 5e4, 3],
  ['Terraform 50%', pct, 50, 1e5, -1],
  [() => `Unlock the ${SYS[4].name}`, () => +S.on[4], 1, 1e6, 4],
  ['Terraform 75%', pct, 75, 3e6, -1],
  [() => `Unlock the ${SYS[5].name}`, () => +S.on[5], 1, 2e7, 5],
  ['Terraform 100%', pct, 100, 0, -1],
].map(([text, get, need, reward, go]) => ({ text, get, need, reward, go }));

// Worlds in warp order (CRIMSON first). Each heals from `dead` tones into its own alien palette; dg/ag = dead/alive atmosphere glow.
const WORLDS = [
  { name: 'CRIMSON', sea: ['#4a0d26', '#6e1636'], coast: '#ffb36b', land: ['#d6204f', '#ff5c7a'], caps: '#ffe0e6',
    dead: [[40, 38, 44], [66, 62, 70], [98, 92, 98], [140, 132, 136]], crater: '#24222a', dg: [160, 150, 170], ag: [255, 110, 140],
    fact: 'Plants on worlds around dim red stars might grow red or even black to soak up every bit of light.' },
  { name: 'ARES', sea: ['#1b6f78', '#23909a'], coast: '#e8c46a', land: ['#7b4bc4', '#b07cf0'], caps: '#f2e9ff',
    dead: [[74, 32, 34], [112, 46, 38], [158, 72, 46], [206, 120, 74]], crater: '#4a2022', dg: [233, 138, 163], ag: [154, 166, 224],
    fact: 'Some scientists think early life on Earth was purple, using a pigment called retinal instead of chlorophyll.' },
  { name: 'KRYPTONITE', sea: ['#0b3d2a', '#0f5c3a'], coast: '#d8ff6b', land: ['#39ff6a', '#a6ff3d'], caps: '#eaffd8',
    dead: [[18, 16, 28], [34, 28, 48], [56, 44, 74], [88, 70, 110]], crater: '#0c0a14', dg: [140, 110, 190], ag: [120, 240, 150],
    fact: 'PSR J1719-1438 b may be a planet-sized crystal of carbon: a diamond world circling a dead star.' },
  { name: 'GLASS STORM', sea: ['#0c2a7a', '#1440a8'], coast: '#bff4ff', land: ['#3fd0ff', '#9ef0ff'], caps: '#ffffff',
    dead: [[24, 30, 46], [40, 50, 72], [64, 78, 104], [100, 116, 140]], crater: '#141a2a', dg: [130, 145, 180], ag: [110, 190, 255],
    fact: 'On HD 189733 b it rains glass, blown sideways by winds of about 8,700 km/h.' },
  { name: 'INFERNO', sea: ['#5a1a6a', '#7a2a8a'], coast: '#ffd166', land: ['#ff9f1c', '#e8a33c'], caps: '#fff1c9', lava: true, // lava: dead[3] glows in the cracks instead of lighting crater rims
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
const LOOKS = Object.fromEntries(Object.entries(ART).map(([id, a], i) => [id, { next: shadow(a, false), sil: shadow(a, true), lit: grit(a, i, diagLight) }]));
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
const TILE = Object.fromEntries(Object.entries(LOOKS).map(([id, l]) => [id, { lit: l.lit.toDataURL(), sil: l.sil.toDataURL(), next: l.next.toDataURL() }]));

// 3x5 pixel font for numbers on the canvas (smooth canvas text would blur when scaled).
const GLYPH = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111',
  '.': '000000000000010', '/': '001001010100100', '+': '000010111010000', k: '100101110101101', m: '000111111101101', b: '100100111101111', t: '010111010010011' };

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

function compose(t, heal) {
  // purchase patches: soft discs (drawn only when they change) that grow in over 2s and widen as the planet heals
  const r = 10 + 14 * heal, live = items.slice(-150), growing = live.some(it => t - it.born < 2);
  const key = live.length + '|' + Math.round(r * 2) + '|' + (live.at(-1)?.u ?? '');
  if (growing || key !== fieldKey) {
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
  // self-check: every system on screen, below the HUD, out of the stat boxes, and no two overlapping
  const box = s => { const [x, y] = sysPos(s, 0), w = look(s).lit.width, h = look(s).lit.height; return [x - w / 2, y - h / 2, x + w / 2, y + h / 2]; };
  const bs = SYS.map((_, s) => box(s));
  console.assert(bs.every(([l, t, r, b]) => l >= 0 && r <= W && t - 8 >= TOP && b <= GY + 1 && !(l < SIDE.r && t < SIDE.b)), 'system off screen or under the HUD', bs);
  console.assert(bs.every((a, i) => bs.every((b, j) => i === j || a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1])), 'systems overlap', bs);
}
// Planet sits low behind the ground line; the systems stand and hang around it.
function layout() {
  const top = $('top').getBoundingClientRect().bottom / PX, bar = $('bar').offsetHeight / PX;
  $('side').style.top = $('toast').style.top = top * PX + 12 + 'px';
  const sr = $('side').getBoundingClientRect();
  TOP = top + 4; SIDE = { r: sr.right / PX, b: sr.bottom / PX };
  GY = Math.round(H - bar - 14); // ground line
  // planet as big as fits: the outer ground systems (GX, wider than the ring's cos 30° x ORBIT) plus a sprite half-width across,
  // the top system (ORBIT + sprite + label) above a centre that sits .45R over the ground
  R0 = Math.max(10, Math.min(W * .42, (W / 2 - 19) / GX, (GY - TOP - 28) / (ORBIT + .45)));
  CX = Math.round(W / 2); CY = Math.round(GY - R0 * .45);
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
  const a = Math.PI + Math.random() * Math.PI, d = R * .8 * Math.sqrt(Math.random()); // upper half: the lower half is behind the ground
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
  if (big) shake = Math.max(shake, real ? .7 : .2);
  if (quiet) return;
  if (real) { const [u, v] = texPos(x, y); items.push({ u, v, born: last }); if (items.length > 300) items.splice(0, items.length - 150); }
  // damage pop-up: what this system earns per shot, so the numbers match the real income
  floats.push({ x, y: y - 8, text: '+' + fmt(sysOut(s) * cadence(s)), life: 1.4, col: '#ffd6e0' }); // light pink: readable on any planet
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
  const lk = look(s), img = S.on[s] ? lk.lit : unlocked(s) ? lk.next : lk.sil;
  blit(img, ...sysPos(s, t));
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

  ridge.forEach((h, x) => { P.fill(x, GY - h, 1, h, C.deep); P.dot(x, GY - h, C.dim); }); // dark mountains, behind the planet
  const ma = t * .2, moon = [Math.round(CX + Math.cos(ma) * R * 1.2), Math.round(CY + Math.sin(ma) * R * .36 - Math.cos(ma) * R * .1)], front = Math.sin(ma) > 0;
  // milestones ease in over a few % of healing instead of popping: moon at 25%, clouds at 50%, rings at 75%
  const ramp = at => Math.max(0, Math.min(1, (heal - at) / .03)), mo = ramp(.25), ck = ramp(.5), rk = ramp(.75), rr = R * (1.1 + .28 * rk);
  if (rk) P.ring(CX, CY, rr, rr * .145, Math.PI, 2 * Math.PI);
  if (mo && !front) drawMoon(...moon, mo);
  compose(t, heal);
  globe(comp, off);
  if (ck) { ctx.globalAlpha = ck; globe(clouds, off * 1.7); ctx.globalAlpha = 1; }
  shadeGlobe(c);
  const crew = Math.min(bots.length, S.L.reduce((a, L, s) => a + (S.on[s] ? 1 + L[0] : 0), 0)); // one walker per crew member, capped
  for (let k = 0; k < crew; k++) { const f = facePos(bots[k][0], bots[k][1]); if (f) blit(T.bot, f[0], f[1] + (Math.sin(t * 4 + k) > .6 ? -1 : 0)); }
  if (rk) P.ring(CX, CY, rr, rr * .145, 0, Math.PI);
  if (mo && front) drawMoon(...moon, mo);
  for (const p of pulses) { ctx.globalAlpha = p.life; P.ring(p.x ?? CX, p.y ?? CY, p.r, p.r, 0, 2 * Math.PI, p.col || C.pink); } // planet-wide or at an impact
  ctx.globalAlpha = 1;

  P.fill(0, GY, W, H - GY, C.deep); P.fill(0, GY, W, 1, C.line); // ground
  drawColony(t, heal);
  SYS.forEach((_, s) => drawSystem(s, t));
  SYS.forEach((_, s) => drawMarks(s, t));

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
  for (const q of parts) { ctx.globalAlpha = q.life; P.dot(q.x, q.y, q.color); }
  for (const f of floats) { ctx.globalAlpha = f.life; text(f.text, f.x, f.y, f.col); }
  ctx.globalAlpha = 1;

  // first-run hints: tap the planet, then the Laser Station once it's affordable
  const bob = Math.round(Math.sin(t * 6) * 2);
  if (!S.taps) blit(T.hand, CX + R * .2, CY - R * .3 + bob);
  else if (!S.on[0] && sel !== 0 && S.life >= unlockCost(0)) { const [x, y] = sysPos(0, t); blit(T.hand, x, y + 18 + bob); }

  // screen: the scene scaled up with nearest-neighbour
  out.imageSmoothingEnabled = false;
  out.fillStyle = C.bg; out.fillRect(0, 0, cv.width, cv.height);
  const [ox, oy] = camOrigin(), sx = shake ? Math.round((Math.random() - .5) * shake * 6) : 0, sy = shake ? Math.round((Math.random() - .5) * shake * 6) : 0;
  out.drawImage(buf, (ox + sx) * K, (oy + sy) * K, W * cam.z * K, H * cam.z * K);
  const gx = (t * 7 | 0) % 8 * 31, gy = (t * 5 | 0) % 8 * 17; // fine grain: one screen pixel per speck, shifted a few times a second
  out.save(); out.translate(-gx, -gy); out.fillStyle = grainPat; out.fillRect(gx, gy, cv.width, cv.height); out.restore();
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
  $('rate').textContent = `${fmt(rateOf())} life/s` + (S.world ? ` x${fmt(boost())}` : '');
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
    set($('gtext'), `${val(g.text)} ${n}/${g.need}`);
    set($('grew'), g.reward ? `${ICON}${fmt(rewardOf(g))}` : '');
  }
  tiles.forEach((b, s) => {
    const ts = TILE[SYS[s].id];
    set(b, `<img src="${S.on[s] ? ts.lit : unlocked(s) ? ts.next : ts.sil}" alt="">`);
    b.setAttribute('aria-label', SYS[s].name);
    b.classList.toggle('ok', canAct(s));
    b.classList.toggle('sel', sel === s);
    b.setAttribute('aria-expanded', sel === s);
  });
  talTile.classList.toggle('ok', S.seeds > 0 && TAL.some(canTal));
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
    const max = L[k] >= MAXL, c = price(s, k), [name, eff] = sy.ups[k];
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
    if (!unlocked(s) || S.life < unlockCost(s)) return;
    S.life -= unlockCost(s); S.on[s] = true; pulse = 1;
    toast(sy.fact);
    burst(x, y, [C.line, C.pink, C.soft], 40, 60);
  } else {
    const L = S.L[s], c = price(s, k);
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
addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('talents').hidden) closeTalents(); else closePanel(); } });

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
  ['bloom', 'Bloom', 'All output +50%.', ENERGY, 150, t1.B, 'swarm'],
  ['autotap', 'Tap Bot', 'Taps the planet for you once a second.', src(TI.bot), 258, t1.T, 'roots', t1.via],
  ['autotap2', 'Tap Swarm', 'Automatic taps 4 times a second.', src(TI.bot), 258, t1.B, 'autotap'],
  ['sleep', 'Night Shift', 'Offline earnings count up to 24h instead of 12h.', src(TI.moon), 42, t2.T, 'bloom', t2.via],
  ['dream', 'Lucid Dreams', 'Offline earnings x2.', src(TI.moon), 42, t2.B, 'sleep'],
  ['grow', 'Heavy Hitters', () => `${SYS[4].name} and ${SYS[5].name} output x2.`, () => TILE[SYS[4].id].lit, 150, t2.T, 'bloom', t2.via],
  ['cheap', 'Fast Track', 'Unlocking systems costs 25% less.', src(TI.tag), 100, t2.M, 'grow', t2.M],
  ['echo', 'Warp Echo', 'Each healed world multiplies output x2.5 instead of x2.', src(TI.rings), 200, t2.M, 'grow', t2.M],
  ['gaia', 'Gaia', 'All output x2.', src(TI.sprout), 150, t2.B, 'grow'],
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
  $('tdesc').textContent = val(t.desc);
  buy.setAttribute('aria-disabled', !canTal(t) || S.seeds < 1);
  set(buy, has(t.id) ? 'Unlocked' : !canTal(t) ? `Needs<span>${talById[t.req].name}</span>` : `Unlock<span>${SEED}1</span>`);
}
$('tbuy').addEventListener('click', () => {
  const t = talById[selTal];
  if (!canTal(t) || S.seeds < 1) return;
  S.seeds--; S.tal.push(t.id);
  renderTal(); updateUI(); save();
});
$('treset').addEventListener('click', () => { S.seeds += S.tal.length; S.tal = []; renderTal(); updateUI(); save(); }); // free respec
function openTalents() {
  closePanel();
  talOpener = document.activeElement;
  $('talents').hidden = false;
  for (const id of BEHIND_WARP) $(id).inert = true;
  renderTal();
  talById[selTal].el.focus({ preventScroll: true });
}
function closeTalents() {
  if ($('talents').hidden) return;
  $('talents').hidden = true;
  for (const id of BEHIND_WARP) $(id).inert = false;
  if (talOpener?.isConnected && talOpener !== document.body) talOpener.focus({ preventScroll: true });
}
$('tclose').addEventListener('click', closeTalents);
const talTile = document.createElement('button'); // own tile in the bar's bottom-right corner, apart from the systems
talTile.className = 'tile'; talTile.id = 'ttile'; talTile.setAttribute('aria-label', 'Talents'); talTile.setAttribute('aria-controls', 'talents');
talTile.innerHTML = `<img src="${src(TI.sprout)}" alt="">`;
talTile.addEventListener('click', openTalents);
$('bar').append(talTile);


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
  if (!g) return;
  if (g.reward && g.get() >= g.need) { const r = rewardOf(g); S.life += r; S.earned += r; S.goal++; return updateUI(); }
  const s = typeof g.go === 'function' ? g.go() : g.go; // not done yet: glide the camera to the system it is about
  if (s >= 0) openPanel(s); else closePanel();
});

function showWarp() {
  S.done = true;
  const s = Math.round(last - S.start), next = WORLDS[(S.world + 1) % WORLDS.length].name;
  $('warptxt').textContent = `${world().name} is alive. Took ${Math.floor(s / 60)}m ${s % 60}s. Next stop: ${next}, with all output x${fmt(boost() * (has('echo') ? 2.5 : 2))} forever. You also earn a Star Seed to spend on Talents.`;
  closePanel(); closeTalents();
  $('warp').hidden = false;
  for (const id of BEHIND_WARP) $(id).inert = true; // modal: nothing behind the dialog is reachable
  $('warpbtn').focus();
  burst(CX, CY, [C.line, C.pink, C.soft], 80, 90);
}

// Start a fresh dead world: everything resets except the permanent warp boost.
const BEHIND_WARP = ['c', 'top', 'side', 'toast', 'bar', 'panel', 'prev', 'next', 'guide'];
function warp() {
  $('warp').hidden = true;
  for (const id of BEHIND_WARP) $(id).inert = false;
  tiles[0].focus({ preventScroll: true });
  Object.assign(S, { world: S.world + 1, life: 0, earned: 0, goal: 1, start: last, done: false, on: SYS.map(() => false), L: SYS.map(() => [0, 0, 0]), seeds: S.seeds + 1 });
  if (has('seedbank')) S.life = 1000 * boost();
  const before = SYS.map(sy => sy.id);
  setLoadout(S.world); resize(); // ground systems change size: re-fit the colony around them
  const fresh = SYS.filter(sy => !before.includes(sy.id)).map(sy => sy.name);
  items.length = shots.length = 0;
  stage = 0; zoom = .3; flash = 1; shake = 1; // arrive from far away
  buildWorld();
  guide([ // arrival briefing
    { text: `Welcome to ${world().name}, Engineer. You earned a Star Seed: spend it in Talents, bottom right.` },
    fresh.length && { text: `New hardware online: ${fresh.join(', ')}. Same job as before: bring this world to life.` },
    { text: world().fact },
  ].filter(Boolean));
}
$('warpbtn').addEventListener('click', () => { warp(); save(); });

// ---------- Commander Vos: the story intro and arrival briefings, in a speech bubble at the bottom left ----------
// Commander Vos: a 3/4 bust in our palette. Shapes are painted flat, snapped to the palette, then outlined dark inside
// and white outside (the sticker edge the rest of the line art has). Two frames for talking: visor glint and chest light move.
const VOS_PAL = ['#11131f', '#1c2030', '#323954', '#4a5378', '#59607f', '#6f7aa8', '#8f99c4', '#a7b1d8', '#e9ecf5', '#e98aa3', '#a8566f', '#ffe08a', '#ffb36b'].map(rgb);
function makeVos(frame) {
  const N = 76, c = mk(N, N), g = c.getContext('2d', { willReadFrequently: true });
  g.translate(2, 2); // 2px margin for the outlines
  const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
  const rect = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const P2 = pen(g), line = (x0, y0, x1, y1, col) => P2.line(x0, y0, x1, y1, col);
  // rifle frame: held across the body, rising toward the bubble
  const ca = Math.cos(-.3), sa = Math.sin(-.3), R = (x, y) => [35 + x * ca - y * sa, 61 + x * sa + y * ca], rp = (pts, col) => poly(pts.map(q => R(...q)), col);
  // armour reads light (top-left sun), the rifle dark gunmetal, so the two never blend
  const A = '#6f7aa8', L = '#a7b1d8', H = '#e9ecf5', S2 = '#4a5378', D = '#323954', K = '#1c2030', PK = '#e98aa3';
  // shoulders and chest
  poly([[2, 50], [12, 40], [60, 38], [70, 48], [70, 72], [2, 72]], D);
  poly([[20, 44], [50, 42], [55, 72], [17, 72]], A); // chest plate
  poly([[22, 46], [34, 45], [32, 54], [21, 56]], L);
  line(20, 58, 52, 57, K); line(36, 45, 37, 57, K); // plate seams
  rect(40, 48, 4, 3, frame ? '#a8566f' : PK); rect(41, 49, 2, 1, frame ? PK : H); // chest light
  poly([[1, 50], [8, 40], [22, 38], [29, 44], [27, 58], [16, 66], [4, 64]], A); // left pauldron (lit)
  poly([[4, 47], [9, 42], [21, 40], [25, 45], [8, 50]], L); line(7, 44, 20, 40, H);
  poly([[5, 54], [26, 49], [26, 52], [5, 57]], PK); line(4, 63, 16, 65, K);
  poly([[47, 40], [60, 37], [70, 44], [71, 60], [62, 64], [52, 56]], S2); // right pauldron (shade side)
  poly([[51, 41], [60, 39], [67, 44], [56, 46]], A); line(52, 41, 59, 39, L);
  poly([[54, 52], [70, 50], [70, 53], [54, 55]], PK);
  rect(28, 34, 16, 10, K); line(31, 38, 41, 38, D); // neck
  // forearms reaching to the rifle
  poly([[8, 61], [19, 59], [29, 66], [25, 72], [7, 72]], A); line(10, 63, 19, 61, L);
  poly([[56, 55], [67, 59], [61, 71], [50, 68]], S2); line(58, 57, 65, 60, A);
  // rifle, dark gunmetal with a bright top edge
  rp([[-34, -3], [-20, -4], [-20, 5], [-34, 6]], D); rp([[-34, -3], [-20, -4], [-20, -3], [-34, -2]], '#8f99c4'); // stock
  rp([[-20, -5], [18, -5], [18, 5], [-20, 5]], D); // body
  rp([[-20, -5], [18, -5], [18, -4], [-20, -4]], '#8f99c4');
  rp([[-20, 3], [18, 3], [18, 5], [-20, 5]], K);
  rp([[-8, -2], [14, -2], [14, 1], [-8, 1]], S2); // receiver panel
  rp([[18, -3], [31, -3], [31, 1], [18, 1]], K); rp([[31, -4], [34, -4], [34, 2], [31, 2]], S2); // barrel, muzzle
  rp([[-6, -10], [8, -10], [8, -5], [-6, -5]], K); rp([[-6, -10], [8, -10], [8, -9], [-6, -9]], '#59607f'); rp([[6, -9], [8, -9], [8, -6], [6, -6]], PK); // scope
  rp([[-4, 5], [3, 5], [5, 14], [-2, 14]], K); // magazine
  rp([[-17, -1], [-11, -1], [-11, 1], [-17, 1]], PK);
  rp([[8, 1], [16, 1], [16, 9], [8, 9]], K); rp([[9, 2], [15, 2], [15, 3], [9, 3]], A); // front glove
  rp([[-19, -2], [-11, -2], [-11, 8], [-19, 8]], K); rp([[-18, -1], [-12, -1], [-12, 0], [-18, 0]], A); // back glove
  // helmet: round shell, shaded on the right, crest ridge kept inside the silhouette
  poly([[20, 13], [23, 6], [30, 2], [44, 2], [51, 6], [55, 13], [56, 25], [53, 33], [47, 39], [27, 39], [21, 33], [19, 25]], A);
  poly([[47, 5], [51, 6], [55, 13], [56, 25], [53, 33], [47, 39], [44, 39], [50, 30], [52, 20], [50, 10]], S2);
  poly([[23, 10], [29, 4], [35, 3], [34, 8], [26, 13]], L); line(26, 7, 31, 4, H);
  poly([[35, 2], [39, 2], [39, 15], [35, 15]], S2); line(36, 3, 36, 14, L); // crest ridge
  line(23, 17, 51, 15, K); // brow
  const visor = [[24, 18], [50, 16], [53, 23], [48, 30], [30, 30], [24, 26]];
  g.save(); g.beginPath(); visor.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
  rect(20, 14, 36, 4, '#ffe08a'); rect(20, 18, 36, 4, '#ffb36b'); rect(20, 22, 36, 4, PK); rect(20, 26, 36, 6, '#a8566f'); // sunset visor
  g.restore();
  g.strokeStyle = '#11131f'; g.beginPath(); visor.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
  if (frame) line(38, 19, 44, 18, H); else { line(27, 20, 33, 19, H); P2.dot(35, 19, H); } // glint
  poly([[23, 27], [30, 31], [48, 31], [54, 25], [53, 32], [47, 39], [28, 39], [22, 33]], D); // jaw guard
  for (const y of [34, 36]) { line(31, y, 35, y, K); line(39, y, 43, y, K); } // vents
  line(24, 30, 29, 33, A);
  poly([[16, 18], [22, 17], [22, 31], [16, 30]], L); rect(17, 21, 3, 6, D); line(16, 18, 16, 29, H); // ear module
  line(17, 18, 12, 4, L); P2.dot(12, 3, PK); // antenna
  // snap to the palette, then outline: dark on the silhouette's inner edge, white just outside it
  const im = g.getImageData(0, 0, N, N), d = im.data, solid = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) {
    if (d[i * 4 + 3] < 128) { d[i * 4 + 3] = 0; continue; }
    solid[i] = 1;
    let best = VOS_PAL[0], bd = 1e9;
    for (const p of VOS_PAL) { const e = (p[0] - d[i * 4]) ** 2 + (p[1] - d[i * 4 + 1]) ** 2 + (p[2] - d[i * 4 + 2]) ** 2; if (e < bd) { bd = e; best = p; } }
    d.set([...best, 255], i * 4);
  }
  const at = (x, y) => x >= 0 && y >= 0 && x < N && y < N && solid[y * N + x];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
    if (solid[i] && edge) d.set([17, 19, 31, 255], i * 4);
    else if (!solid[i] && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) d.set([233, 236, 245, 255], i * 4);
  }
  g.putImageData(im, 0, 0);
  return c.toDataURL();
}
const FACE = [makeVos(0), makeVos(1)];
// A line is { text, until, hint }: with `until` the game stays playable and the line moves on by itself once until() is true.
const INTRO = [
  { text: 'Welcome to the front line, Engineer. I run Terraform Corps out here.' },
  { text: 'That rock below is CRIMSON. No air, no water, nothing grows. Our orders: bring it back to life.' },
  { text: 'Start by tapping the planet. Every tap pulls Life out of the ground. Give me 10.',
    until: () => S.taps >= 10, hint: () => `Tap the planet ${Math.min(10, S.taps)}/10` },
  { text: () => `Good. Now put that Life to work: open the ${SYS[0].name} from the bar below and unlock it.`,
    until: () => S.on[0], hint: () => (S.life >= unlockCost(0) ? 'Tap the first tile, then Unlock' : `Life ${fmt(S.life)}/${fmt(unlockCost(0))}: keep tapping, or claim the goal up top`) },
  { text: 'Systems fire on their own, even while you are away. Upgrade them and they hit harder.' },
  { text: 'Not sure what is next? Tap the goal bar up top. It pays a reward and points you where you are needed.' },
  { text: 'Heal CRIMSON to 100% and we warp to a new world. Every healed world earns a Star Seed for Talents. Make me proud, Engineer.' },
];
let gLines = [], gi = 0, gShown = 0, gTimer = 0, gIntro = false;
function guide(lines, intro = false) {
  gLines = lines; gi = 0; gIntro = intro;
  $('guide').hidden = false;
  sayLine();
}
function sayLine() { // type the line out, a few letters per tick, the portrait bobbing while it talks
  const full = val(gLines[gi].text);
  gShown = 0; $('gsr').textContent = full;
  $('guide').classList.add('talk');
  clearInterval(gTimer);
  gTimer = setInterval(() => {
    gShown = Math.min(full.length, gShown + 2);
    $('gsay').textContent = full.slice(0, gShown);
    $('gface').src = FACE[(gShown >> 3) & 1]; // comm light blinks while talking
    if (gShown >= full.length) { clearInterval(gTimer); $('guide').classList.remove('talk'); $('gface').src = FACE[0]; updateGuide(); }
  }, 30);
  updateGuide();
}
function nextLine() {
  if (++gi < gLines.length) return sayLine();
  clearInterval(gTimer);
  $('guide').hidden = true;
  if (gIntro) { S.intro = true; save(); }
}
$('gbubble').addEventListener('click', () => {
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
  set($('ghint'), l.until ? '&gt; ' + val(l.hint) : done ? '&gt; tap to continue' : '');
  $('ghint').classList.toggle('wait', !!l.until);
  $('guide').classList.toggle('compact', sel >= 0); // panel open: hide the portrait, keep the bubble above the panel and arrows
  $('guide').style.bottom = (sel >= 0 ? panelH + 100 : $('bar').offsetHeight - 12) + 'px'; // feet tucked behind the bar, so the talking bob never shows a gap
}

// ---------- saving & offline progress (browser localStorage: no server, per device) ----------
const SAVE = 'terraform-save-v1', awayCap = () => (has('sleep') ? 24 : 12) * 3600; // offline time counted, in seconds
const syncStage = () => { stage = STAGES.filter(s => healOf(S.earned) >= s.at).length; }; // no milestone pop-ups for old progress
function save() {
  try {
    localStorage.setItem(SAVE, JSON.stringify({
      t: hiddenAt || Date.now(), played: last - S.start, // hidden tab: the loop stopped when it was hidden, so count from then
      S: { life: S.life, earned: S.earned, taps: S.taps, goal: S.goal, world: S.world, on: S.on, L: S.L, seeds: S.seeds, tal: S.tal, intro: S.intro },
      items: items.slice(-150).map(it => [Math.round(it.u), Math.round(it.v)]),
    }));
  } catch { /* private mode or full storage: keep playing unsaved */ }
}
// The save is outside data (could be stale or hand-edited): check every field before trusting it.
const validSave = d => d && Number.isFinite(d.t) && d.S
  && ['life', 'earned', 'taps', 'goal', 'world'].every(k => Number.isFinite(d.S[k]) && d.S[k] >= 0)
  && Array.isArray(d.S.on) && d.S.on.length === SYS.length
  && Array.isArray(d.S.L) && d.S.L.length === SYS.length && d.S.L.every(l => Array.isArray(l) && l.length === 3 && l.every(n => Number.isInteger(n) && n >= 0 && n <= MAXL))
  && (d.S.intro === undefined || typeof d.S.intro === 'boolean')
  && (d.S.seeds === undefined || Number.isInteger(d.S.seeds) && d.S.seeds >= 0) // older saves have no talents yet
  && (d.S.tal === undefined || Array.isArray(d.S.tal) && d.S.tal.every(id => TAL.some(t => t.id === id)));
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
    on: v.on.map(Boolean), L: v.L, start: last - (Number.isFinite(d.played) ? d.played : 0),
    seeds: v.seeds ?? Math.min(v.world | 0, 60), tal: [...new Set(v.tal || [])], intro: v.intro ?? true }); // saves from before the intro skip it // saves from before talents: one seed per planet already healed
  const was = SYS.map(sy => sy.id).join();
  setLoadout(S.world);
  if (W && SYS.map(sy => sy.id).join() !== was) resize(); // another tab warped meanwhile
  items.length = 0;
  if (Array.isArray(d.items)) for (const p of d.items) if (Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])) items.push({ u: p[0], v: p[1], born: -9 });
  buildWorld();
  away(d.t);
  return true;
}
// Credit the income earned since `since` (ms timestamp) while the game wasn't running.
function away(since) {
  const sec = Math.min(awayCap(), Math.max(0, (Date.now() - since) / 1000)), gain = rateOf() * sec * (has('dream') ? 2 : 1);
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
  if (y >= GY) return; // the ground is solid
  if ((x - CX) ** 2 + (y - CY) ** 2 > R * R) return closePanel();
  tapPlanet(x, y);
});
// keyboard players tap the planet with Enter or Space while the canvas has focus
cv.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  tapSomewhere();
});
const tapSomewhere = () => tapPlanet(CX + (Math.random() - .5) * R, CY - R * (.2 + Math.random() * .5)); // a spot on the visible face
function tapPlanet(x, y) {
  const crit = Math.random() < (has('crit2') ? .2 : has('crit') ? .1 : 0); // Lucky Strike / Jackpot
  const g = (tapOf(rateOf()) * (has('spark') ? 3 : 1) + (has('tapecho') ? rateOf() : 0)) * (crit ? 10 : 1);
  S.life += g; S.earned += g; S.taps++;
  if (S.on[0]) { const [lx, ly] = muzzle(0); beams.push({ x1: lx, y1: ly, x2: x, y2: y, life: 1, col: C.pink, end: true }); }
  burst(x, y, crit ? [C.sun, C.line, C.pink] : [C.line, C.pink], crit ? 24 : 10);
  floats.push({ x, y: y - 8, text: '+' + fmt(g), life: 1, col: crit ? C.sun : C.line });
}

// ---------- loop ----------
let uiTick = 0, resume = true, panelH = 0, autoT = 0, paidAt = 0; // resume: skip one income gap after a hidden tab (away() already paid it)
function frame(ms) {
  const t = ms / 1000, dt = resume ? 0 : Math.max(0, Math.min(.1, t - last)), now = Date.now();
  // income runs on the wall clock: browsers also pause animation frames without hiding the tab (screen lock,
  // covered window), and that time must still pay. Long pauses are paid like time away (capped, with a toast).
  const gap = resume ? 0 : Math.max(0, (now - paidAt) / 1000);
  last = t; paidAt = now; resume = false;
  if (!W) return requestAnimationFrame(frame); // no layout yet (0-size viewport)
  if (gap >= 30) away(now - gap * 1000);
  else { const g = rateOf() * gap; S.life += g; S.earned += g; }
  const heal = healOf(S.earned);
  off = (off + dt * 6) % TW;
  shake = Math.max(0, shake - dt * 3); pulse = Math.max(0, pulse - dt * 1.5); flash = Math.max(0, flash - dt * 1.2);
  if (heal >= 1 && $('warp').hidden && !S.done) showWarp();
  const aps = has('autotap2') ? 4 : has('autotap') ? 1 : 0; // Tap Bot / Tap Swarm: automatic taps per second
  if (aps && (autoT += dt * aps) >= 1) { autoT -= 1; tapSomewhere(); }

  const reached = STAGES.filter(s => heal >= s.at).length;
  if (reached > stage) { stage = reached; toast(STAGES[stage - 1].text, true); pulse = 1; shake = .8; }
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
    sy.next = t + cadence(s) * (.7 + Math.random() * .6);
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
  requestAnimationFrame(frame);
}

if (new URLSearchParams(location.search).has('reset')) { // ?reset: start over (demos, judges); runs after the old page saved on its way out
  try { localStorage.removeItem(SAVE); } catch { /* storage blocked: nothing saved anyway */ }
  history.replaceState(null, '', location.pathname); // a later reload keeps the new game
}
load();
updateUI();
resize();
Object.assign(cam, { fx: W / 2, fy: H / 2, ax: W / 2, ay: H / 2 });
requestAnimationFrame(frame);
document.fonts?.ready.then(resize); // the HUD font changes box heights once it arrives
if (!S.intro) guide(INTRO, true); // new players meet the commander
