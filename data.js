'use strict';

// All the numbers and words: systems, prices, worlds, goals and the commander's briefing.
// The engine (game.js) reads these; balance changes happen here.

// Every system in the game. Each world fields eight of them (lineup); a system's cost and output come from its
// unlock slot (TIER), so any lineup paces the same. Each has 3 upgrades (max Lv 50):
// [0] +1 crew, [1] +25% output per level, [2] x1.08 output per level (compounding).
const CATALOG = {
  laser: { name: 'Beam Spire', shot: 'beam', unit: 'gunner',
    ups: [['Recruit Gunner', '+1 gunner'], ['Stabilized Optics', '+25% damage'], ['Overcharged Capacitors', 'x1.08 beam output']],
    desc: 'Blasts the crust to release trapped gases.', fact: 'In 2013 NASA beamed data from Moon orbit to Earth by laser at 622 megabits per second.' },
  solar: { name: 'Solar Mirror', shot: 'light', unit: 'mirror',
    ups: [['Add Mirror', '+1 mirror'], ['Polished Glass', '+25% heat'], ['Focusing Lens', 'x1.08 solar output']],
    desc: 'Focuses sunlight to warm the frozen ground.', fact: 'Mars averages −60 °C. Giant orbital mirrors are a real proposal for warming it up.' },
  drone: { name: 'Microbe Swarm', shot: 'drone', unit: 'drone',
    ups: [['Build Drone', '+1 drone'], ['Seed Payload', '+25% seeds'], ['Swarm AI', 'x1.08 swarm output']],
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
  striker: { name: 'Tungsten Rain', shot: 'rod', unit: 'loader',
    ups: [['Rod Loader', '+1 loader'], ['Tungsten Cores', '+25% impact'], ['Mag Rails', 'x1.08 rail output']],
    desc: 'Drops tungsten rods from orbit to crack open the crust.', fact: 'A tungsten rod dropped from orbit would hit at around 3 km per second, with no explosive at all.' },
  coil: { name: 'Storm Coil', shot: 'arc', unit: 'coil',
    ups: [['Wind Coil', '+1 coil'], ['Superconductors', '+25% voltage'], ['Chain Lightning', 'x1.08 coil output']],
    desc: 'Fires lightning into the air to turn nitrogen into plant food.', fact: 'Lightning on Earth turns millions of tonnes of air nitrogen into natural fertilizer every year.' },
  asteroid: { name: 'Meteor Quarry', shot: 'rocks', unit: 'miner',
    ups: [['Hire Miner', '+1 miner'], ['Diamond Bits', '+25% ore'], ['Deep Shafts', 'x1.08 quarry output']],
    desc: 'Mines a captured asteroid and showers the planet with minerals.', fact: 'The asteroid 16 Psyche may be mostly metal. NASA launched a probe to visit it in 2023.' },
  volcano: { name: 'Volcano Igniter', shot: 'lava', unit: 'geologist',
    ups: [['Geologist', '+1 geologist'], ['Deeper Vents', '+25% gas'], ['Magma Surge', 'x1.08 igniter output']],
    desc: 'Wakes sleeping volcanoes to thicken the atmosphere.', fact: 'Olympus Mons on Mars is the tallest volcano in the solar system, about 22 km high.' },
  forge: { name: 'Atmo Forge', shot: 'gas', unit: 'stoker',
    ups: [['Stoker', '+1 stoker'], ['Super Greenhouse', '+25% warming'], ['Twin Stacks', 'x1.08 forge output']],
    desc: 'Pumps out greenhouse gases that trap heat and warm the planet.', fact: 'Studies suggest factories making strong greenhouse gases could warm Mars by tens of degrees.' },
  antimatter: { name: 'Annihilator', shot: 'annihilate', unit: 'physicist',
    ups: [['Physicist', '+1 physicist'], ['Magnetic Bottle', '+25% yield'], ['Annihilation Cascade', 'x1.08 annihilator output']],
    desc: 'Annihilates matter with antimatter for raw terraforming power.', fact: 'CERN traps antihydrogen in magnetic bottles. One gram of antimatter meeting matter would release about 43 kilotons of energy.' },
  // third generation, from world 3
  lance: { name: 'Plasma Lance', shot: 'plasma', unit: 'cell',
    ups: [['Charge Cell', '+1 cell'], ['Magnetic Lens', '+25% heat'], ['Overload Coils', 'x1.08 lance output']],
    desc: 'Melts the frozen crust with a lance of white-hot plasma.', fact: 'Lightning is plasma: it heats the air to about 27,000 °C, roughly five times hotter than the surface of the Sun.' },
  ion: { name: 'Ion Cannon', shot: 'ion', unit: 'thruster',
    ups: [['Ion Thruster', '+1 thruster'], ['Xenon Tanks', '+25% thrust'], ['Beam Focus', 'x1.08 cannon output']],
    desc: 'Beams charged particles down to split ice into air and water.', fact: 'NASA\'s Dawn probe ran on an ion engine, pushing out charged xenon, and used it to visit both Vesta and Ceres.' },
  pod: { name: 'Seed Missile Pod', shot: 'swarm', unit: 'missile',
    ups: [['Load Missile', '+1 missile'], ['Seed Warheads', '+25% seeds'], ['Smart Guidance', 'x1.08 pod output']],
    desc: 'Fires volleys of seed missiles that burrow in and sprout.', fact: 'In 2018 two briefcase-sized CubeSats, MarCO-A and MarCO-B, flew all the way to Mars.' },
  driver: { name: 'Mass Driver', shot: 'capsule', unit: 'magnet',
    ups: [['Rail Magnet', '+1 magnet'], ['Heavy Capsules', '+25% cargo'], ['Superconducting Rails', 'x1.08 driver output']],
    desc: 'Flings capsules of ice and soil onto the planet with magnets.', fact: 'A mass driver on the Moon could throw cargo into space with magnets alone, no rocket fuel needed.' },
  hydro: { name: 'Hydro Cannon', shot: 'water', unit: 'pumper',
    ups: [['Hire Pumper', '+1 pumper'], ['Wide Nozzles', '+25% water'], ['Pressure Boost', 'x1.08 cannon output']],
    desc: 'Sprays melted ice across the land to fill the first rivers.', fact: 'Mars\' polar ice caps hold enough water to cover the whole planet in an ocean many metres deep if it all melted.' },
  star: { name: 'Star Forge', shot: 'flare', unit: 'tech',
    ups: [['Plasma Tech', '+1 tech'], ['Denser Fuel', '+25% fusion'], ['Stellar Core', 'x1.08 forge output']],
    desc: 'A tiny captive star that bathes the whole world in warmth.', fact: 'In December 2022 a US laser lab got more energy out of a fusion reaction than its lasers put in, for the first time ever.' },
  // fourth generation: the heavy arsenal
  grav: { name: 'Graviton Anvil', shot: 'gravity', unit: 'warden',
    ups: [['Gravity Warden', '+1 warden'], ['Dense Core', '+25% pull'], ['Tidal Lock', 'x1.08 anvil output']],
    desc: 'Squeezes the crust with gravity to wring water and gas out of the rock.', fact: 'Jupiter squeezes its moon Io so hard that the tides heat its insides and keep about 400 volcanoes active.' },
  bomber: { name: 'Cluster Bomber', shot: 'bombs', unit: 'bombardier',
    ups: [['Bombardier', '+1 bombardier'], ['Fertilizer Charges', '+25% payload'], ['Carpet Runs', 'x1.08 bomber output']],
    desc: 'Carpets the surface with charges packed with fertilizer and seed.', fact: 'Planes and drones have been used to reseed burned land by dropping seed balls from the air.' },
  ribbon: { name: 'Magnetar Halo', shot: 'ribbon', unit: 'keeper',
    ups: [['Field Keeper', '+1 keeper'], ['Superconducting Ring', '+25% field'], ['Dynamo Spin', 'x1.08 halo output']],
    desc: 'Wraps the world in a magnetic field that shields its new air from the solar wind.', fact: 'Mars lost most of its air after its magnetic field died. NASA scientists have proposed a magnetic shield in space to give it one again.' },
  gatling: { name: 'Ripsaw Gatling', shot: 'gatling', unit: 'feeder',
    ups: [['Belt Feeder', '+1 feeder'], ['Spinning Barrels', '+25% rate'], ['Incendiary Rounds', 'x1.08 gatling output']],
    desc: 'Hoses the crust with thousands of tiny seed-shell rounds a minute.', fact: 'A rotary cannon like the GAU-8 fires about 65 rounds every second.' },
  harpoon: { name: 'Comet Harpoon', shot: 'harpoon', unit: 'winchman',
    ups: [['Winchman', '+1 winchman'], ['Barbed Heads', '+25% catch'], ['Titan Chain', 'x1.08 harpoon output']],
    desc: 'Spears passing ice and drags it down onto the planet.', fact: 'In 2014 the Philae lander was meant to anchor itself to comet 67P with harpoons. They never fired, and it bounced.' },
  nanite: { name: 'Nanite Censer', shot: 'spray', unit: 'tender',
    ups: [['Swarm Tender', '+1 tender'], ['Self-Replication', '+25% nanites'], ['Hive Code', 'x1.08 censer output']],
    desc: 'Sprays clouds of nanites that grind bare rock into living soil.', fact: 'Lichens and microbes break rock into soil, but they can take centuries to make a single centimetre of it.' },
  quake: { name: 'Quake Hammer', shot: 'quake', unit: 'smith',
    ups: [['Hammer Smith', '+1 smith'], ['Heavier Head', '+25% force'], ['Resonance', 'x1.08 hammer output']],
    desc: 'Pounds the ground until buried water and heat come up through the cracks.', fact: 'Marsquakes are real: NASA\'s InSight lander recorded more than 1,300 of them between 2018 and 2022.' },
  mortar: { name: 'Napalm Mortar', shot: 'mortar', unit: 'gunner',
    ups: [['Mortar Crew', '+1 gunner'], ['Hotter Mix', '+25% heat'], ['Firestorm', 'x1.08 mortar output']],
    desc: 'Lobs burning shells that thaw the frozen ground.', fact: 'Mars\' south polar cap holds frozen carbon dioxide. Releasing all of it would thicken the air, but not nearly enough to breathe.' },
  maser: { name: 'Maser Dish', shot: 'maser', unit: 'operator',
    ups: [['Operator', '+1 operator'], ['Wider Dish', '+25% power'], ['Phase Lock', 'x1.08 maser output']],
    desc: 'Cooks the crust with a focused beam of microwaves.', fact: 'The maser, a laser for microwaves, was built in 1953, seven years before the first laser.' },
  silo: { name: 'Terra Warhead', shot: 'nuke', unit: 'officer',
    ups: [['Launch Officer', '+1 officer'], ['Bigger Yield', '+25% yield'], ['Deep Penetrator', 'x1.08 warhead output']],
    desc: 'Drops warheads on the poles to blast the ice into steam.', fact: 'Project Orion, in the 1950s, studied pushing a spaceship with a chain of small nuclear blasts.' },
  spore: { name: 'Spore Tower', shot: 'spores', unit: 'gardener',
    ups: [['Gardener', '+1 gardener'], ['Fatter Sacs', '+25% spores'], ['Wind Release', 'x1.08 tower output']],
    desc: 'A grown tower that breathes clouds of spores into the new air.', fact: 'A single giant puffball mushroom can release several trillion spores.' },
  bore: { name: 'Singularity Bore', shot: 'vortex', unit: 'theorist',
    ups: [['Theorist', '+1 theorist'], ['Event Horizon', '+25% depth'], ['Hawking Flux', 'x1.08 bore output']],
    desc: 'Drills down with a tiny contained black hole, freeing the heat of the core.', fact: 'A black hole with the mass of Mount Everest would be smaller than an atom.' },
};
// Each machine's character. trait: a rule of its own (TRAITS); pace: seconds between shots relative to the others (under 1 fires
// fast and light, over 1 slow and heavy: income per second is the same, each hit is bigger).
const TRAITS = {
  support: { name: 'Support', text: 'Every other machine +10% while it is online.' },
  overdrive: { name: 'Overdrive', text: 'x2 output during meteor showers, solar flares and golden comets.' },
  ramp: { name: 'Slow Burn', text: 'Starts at x0.6 and grows to x1.5 as the planet heals.' },
  early: { name: 'Pioneer', text: 'x1.6 on a dead world, fading to x0.8 as it heals.' },
  pack: { name: 'Pack', text: '+10% for every other machine online.' },
  jackpot: { name: 'Jackpot', text: '1 shot in 5 pays 5 seconds of its output at once.' },
  refit: { name: 'Veteran', text: '+30% for every Mark it has earned.' },
  night: { name: 'Night Shift', text: 'Earns double while you are away.' },
  steady: { name: 'Workhorse', text: 'Its upgrades cost 15% less.' },
  gravity: { name: 'Gravity Well', text: 'Events come 30% sooner while it is online.' },
};
// Where each machine can stand, which side it was drawn for, its trait and pace. side = the upper corners (aimed at the planet),
// top = straight above, ground = on the ground line. face 1: drawn for the right side, -1: for the left, 0: either (mirrored on the
// other side).
const PLACE = {
  laser: ['side', 1, 'steady', 1], striker: ['side', 1, 'refit', .8], lance: ['side', 1, 'ramp', 1.2],
  drone: ['side', 0, 'early', .7], asteroid: ['side', -1, 'refit', 1.3], pod: ['side', 0, 'pack', .6],
  gatling: ['side', 1, 'overdrive', .35], harpoon: ['side', 1, 'jackpot', 1.5], nanite: ['side', 1, 'pack', .6],
  solar: ['top', 0, 'support', 1.4], coil: ['top', 0, 'overdrive', .5], ion: ['top', 0, 'support', 1.2],
  grav: ['top', 0, 'gravity', 1.8], bomber: ['top', 0, 'pack', .9], ribbon: ['top', 0, 'support', 1.6],
  rocket: ['ground', 0, 'steady', 1.4], volcano: ['ground', 0, 'night', 1.5], driver: ['ground', 1, 'steady', 1.2],
  bio: ['ground', 0, 'early', 1], forge: ['ground', 0, 'night', 1.8], hydro: ['ground', -1, 'night', 1],
  core: ['ground', 0, 'gravity', 1.6], antimatter: ['ground', 0, 'jackpot', 2.5], star: ['ground', 0, 'ramp', 2],
  quake: ['ground', 0, 'refit', 1.6], mortar: ['ground', 1, 'overdrive', 1.3], maser: ['ground', 1, 'ramp', 1],
  silo: ['ground', 0, 'jackpot', 3], spore: ['ground', 0, 'early', 1.2], bore: ['ground', 0, 'gravity', 2],
};
for (const [id, [spot, face, trait, pace]] of Object.entries(PLACE)) Object.assign(CATALOG[id], { spot, face, trait, pace });
console.assert(Object.keys(CATALOG).length === 30 && Object.values(CATALOG).every(c => c.spot && TRAITS[c.trait]), 'catalog: 30 machines, each placed with a trait');
// Unlock slots, in unlock order: 0 upper right, 1 top, 2 upper left, then five on the ground (right, left, centre, far right, far left).
const SLOT_SPOT = ['side', 'top', 'side', 'ground', 'ground', 'ground', 'ground', 'ground'];
const TIER = [[100, 3], [600, 12], [3500, 48], [2e4, 190], [1.1e5, 750], [6e5, 2900], [3.3e6, 11000], [1.5e7, 40000]].map(([unlock, base]) => ({ unlock, base }));
// Unlocking costs extra (upgrades keep the TIER price): you live with one machine for a while before the next.
// Steep early, gentle late, so the last still arrives before 100%.
const UNLOCK_GATE = [1, 7, 5, 3.5, 2.5, 1.5, .8, .45]; // sim, world 1: greedy ~24 min, all 8 machines; the 2nd after ~8 min with the 1st at Lv 40/30/26; impulsive ~16 min
// Each world's eight machines: CRIMSON fields the originals; every other world draws its own shuffled lineup (seeded by the world
// number, so it never changes and no two worlds match).
const FIRST = ['laser', 'solar', 'drone', 'rocket', 'bio', 'core', 'quake', 'mortar'];
const seeded = seed => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; // mulberry32
function lineup(w) {
  if (w === 0) return FIRST;
  const r = seeded(w * 7919 + 17), pool = {};
  for (const [id, c] of Object.entries(CATALOG)) (pool[c.spot] ??= []).push(id);
  for (const ids of Object.values(pool)) for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  return SLOT_SPOT.map(spot => pool[spot].pop());
}
console.assert(new Set(Array.from({ length: 24 }, (_, w) => lineup(w).join())).size === 24 && lineup(5).join() === lineup(5).join(), 'lineups: unique per world, stable');
let SYS;
const setLoadout = w => { SYS = lineup(w).map((id, s) => ({ id, ...CATALOG[id], ...TIER[s] })); };
setLoadout(0);
const MAXL = 50, UPM = [[.25, 1.22], [.8, 1.26], [2.5, 1.3]]; // upgrade k costs unlock * UPM[k][0] * UPM[k][1]^level (x price scale)
// Pacing (tuned with a greedy-buyer simulation; a real player is about 1.5-2x slower):
// - every warp doubles output (boost) and doubles prices, taps and flat rewards (PRICE_GROWTH), so each world plays like
//   the first with bigger numbers and upgrades keep mattering;
// - the goal grows x GOAL_GROWTH per world plus DIFFICULTY per world for the first DIFFICULTY_CAP worlds, which absorbs
//   the talents a player collects over that span. Sim: world 1 ~12 min, then 8, 7, 5, 4.7 ... settling near 2-4 min;
//   a player who never spends seeds settles near 28 min instead of growing without limit.
const GOAL = 3e8, GOAL_GROWTH = 2, PRICE_GROWTH = 2, DIFFICULTY = 1.5, DIFFICULTY_CAP = 10;
// Tapping helps but never replaces the machines: hand taps past TAP_RATE a second share that rate's pay, and one tap (with combo
// and crits) is worth at most TAP_MAX seconds of income (or 12 base taps early on). Sim, a full tap build on world 3 at 25 taps/s:
// 80% in 0.4 min before, now about the same as a steady tapper; tapping adds at most ~1.2x income.
const TAP_RATE = 6, TAP_MAX = .2;
// Highest world number: every value stays finite well past it (goal 3e8 x 2^400 x 1.5^10 ~ 1e130, life checked < 1e300). Warps stop counting here.
const MAX_WORLD = 400;
// Always one clear next step at the top, with a reward: [text, progress, target, reward, go].
// go: the system a tap on the unfinished goal jumps to (-1 = back to the planet); a function picks it at tap time.
const unlockGoal = s => [() => `Unlock the ${SYS[s].name}`, () => +S.on[s], 1, TIER[s].unlock / 2, s];
const GOALS = [
  ['Tap the planet 10 times', () => S.taps, 10, 60, -1], // 10 taps (40) + 60 = exactly the first unlock
  unlockGoal(0), unlockGoal(1), unlockGoal(2),
  ['Terraform 25%', () => pct(), 25, 3000, -1],
  unlockGoal(3), unlockGoal(4),
  ['Terraform 50%', () => pct(), 50, 1e5, -1],
  unlockGoal(5),
  ['Terraform 75%', () => pct(), 75, 3e6, -1],
  unlockGoal(6), unlockGoal(7),
  ['Terraform 100%', () => pct(), 100, 0, -1],
].map(([text, get, need, reward, go]) => ({ text, get, need, reward, go })); // never asks for upgrades: unlock prices (UNLOCK_GATE) make those natural
const GOALS_V = 3; // saves from an older goal list resume at the first goal not yet met
// Worlds in warp order (CRIMSON first). Each heals from `dead` tones into its own alien palette; dg/ag = dead/alive atmosphere glow.
// music: this world's song (engine in game.js, musicStep). bpm; key: semitones from A; mode (MODES); meter: beats per bar (3 or 4);
// swing (0..0.33); bright: the music filter cutoff in Hz; prog: chord roots as scale degrees, section A then B (4 bars each);
// pad / bassWave / lead: oscillator types (pad null: none; padVol; chorus: detuned pairs; echo: on pad and melody); bass: one bar,
// x root, o octave, 5 fifth, . hold; arp: { pat: chord tones (-1 rest), rate in 16ths, oct, len in 16ths, wave, echo };
// drums: one bar per instrument (k kick, s snare, h hat); leadAt / drumsAt: how healed before the melody / drums join (above 1: never);
// sparkle: { p: chance per bar, notes } to use a fixed set of high notes instead of chord tones.
// trait: what this world changes while you are on it (orbit/ground multiply those systems, tap multiplies taps, reward the goal rewards,
// events makes events that many times as frequent, price multiplies upgrade prices).
// lush (optional): the healed surface's shape. sea: share of ocean (default .5); caps: latitude where the ice caps start (default .9);
// bands: a gas giant's swirling stripes instead of land and sea; rivers: rivers winding across the land.
const WORLDS = [
  { name: 'CRIMSON', music: { style: 'the original theme', bpm: 80, key: 0, mode: 'minor', bright: 2400, prog: [[0, -2, -5, -1], [0, -2, -5, -1]], // Am F C G, as at launch
    pad: 'triangle', padVol: .035, bassWave: 'triangle', bass: 'x.......x.......', bassRelease: .4, lead: 'triangle', leadAt: 2, // no melody
    arp: { pat: [0, 1, 2, 1, 0, 2, 1, 2], rate: 2, oct: 1, len: 1.8, wave: 'square', vol: .018 }, drums: null, sparkle: { p: .4, notes: [69, 72, 74, 76, 79, 81] } },
    sea: ['#4a0d26', '#6e1636'], coast: '#ffb36b', land: ['#d6204f', '#ff5c7a'], caps: '#ffe0e6',
    dead: [[40, 38, 44], [66, 62, 70], [98, 92, 98], [140, 132, 136]], crater: '#24222a', dg: [160, 150, 170], ag: [255, 110, 140],
    fact: 'Plants on worlds around dim red stars might grow red or even black to soak up every bit of light.' },
  { name: 'ARES', music: { style: 'march', bpm: 116, key: 2, mode: 'dorian', bright: 4200, prog: [[0, 3, 0, 6], [4, 3, 6, 0]],
    pad: null, bassWave: 'square', bass: 'x.x.x.x.o.x.x.x.', lead: 'square', leadAt: .25,
    arp: { pat: [0, 2, 1, 2], rate: 4, oct: 1, len: 1, wave: 'square' }, drums: { k: 'x.......x.......', s: '....x.xx....x.x.' }, drumsAt: 0 },
    sea: ['#1b6f78', '#23909a'], coast: '#e8c46a', land: ['#7b4bc4', '#b07cf0'], caps: '#f2e9ff',
    dead: [[74, 32, 34], [112, 46, 38], [158, 72, 46], [206, 120, 74]], crater: '#4a2022', dg: [233, 138, 163], ag: [154, 166, 224],
    trait: { orbit: 1.5, text: 'Low gravity: orbital systems x1.5' },
    fact: 'Some scientists think early life on Earth was purple, using a pigment called retinal instead of chlorophyll.' },
  { name: 'KRYPTONITE', music: { style: 'crystal music-box waltz', bpm: 92, key: -3, mode: 'harmonic', meter: 3, bright: 3200, prog: [[0, 5, 3, 4], [0, 3, 5, 4]],
    pad: 'triangle', bassWave: 'triangle', bass: 'x...5...5...', lead: 'sine', echo: true, leadAt: .25,
    arp: { pat: [3, 2, 1, 2, 4, 2], rate: 2, oct: 1, len: 1.2, wave: 'sine', echo: true }, drums: { k: 'x...........', h: '....x...x...' }, drumsAt: .5 },
    sea: ['#0b3d2a', '#0f5c3a'], coast: '#d8ff6b', land: ['#39ff6a', '#a6ff3d'], caps: '#eaffd8',
    dead: [[18, 16, 28], [34, 28, 48], [56, 44, 74], [88, 70, 110]], crater: '#0c0a14', dg: [140, 110, 190], ag: [120, 240, 150],
    trait: { tap: 3, text: 'Charged crust: taps x3' },
    fact: 'PSR J1719-1438 b may be a planet-sized crystal of carbon: a diamond world circling a dead star.' },
  { name: 'GLASS STORM', music: { style: 'ambient', bpm: 62, key: 5, mode: 'lydian', bright: 2600, prog: [[0, 1, 0, 1], [4, 1, 5, 0]],
    pad: 'sine', chorus: true, echo: true, bassWave: 'sine', bass: 'x...............', lead: 'sine', leadAt: .25,
    arp: { pat: [4, -1, -1, 3, -1, -1, 2, -1], rate: 2, oct: 1, len: 3, wave: 'sine', echo: true }, drums: null },
    sea: ['#0c2a7a', '#1440a8'], coast: '#bff4ff', land: ['#3fd0ff', '#9ef0ff'], caps: '#ffffff',
    dead: [[24, 30, 46], [40, 50, 72], [64, 78, 104], [100, 116, 140]], crater: '#141a2a', dg: [130, 145, 180], ag: [110, 190, 255],
    trait: { ground: 1.5, text: 'Calm lowlands: ground systems x1.5' },
    fact: 'On HD 189733 b it rains glass, blown sideways by winds of about 8,700 km/h.' },
  { name: 'INFERNO', music: { style: 'chip rock', bpm: 144, key: -5, mode: 'harmonic', bright: 5200, prog: [[0, 5, 6, 4], [0, 3, 4, 4]],
    pad: null, bassWave: 'square', bass: 'x.x.x.x.x.x.o.x.', lead: 'square', leadAt: .25,
    arp: { pat: [0, 1, 2, 3, 2, 1], rate: 1, oct: 1, len: .9, wave: 'square' }, drums: { k: 'x...x...x.x.x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' }, drumsAt: 0 },
    sea: ['#5a1a6a', '#7a2a8a'], coast: '#ffd166', land: ['#ff9f1c', '#e8a33c'], caps: '#fff1c9', lava: true, // lava: dead[3] glows in the cracks instead of lighting crater rims
    dead: [[16, 12, 14], [34, 24, 24], [60, 30, 24], [255, 110, 30]], crater: '#000000', dg: [255, 120, 60], ag: [255, 200, 110],
    trait: { orbit: 2, ground: .75, text: 'Heat shimmer: orbital x2, ground x0.75' },
    fact: '55 Cancri e is so close to its star that its dayside may be one huge ocean of lava.' },
  { name: 'TITAN', music: { style: 'deep drone', bpm: 56, key: -2, mode: 'minor', bright: 950, prog: [[0, 0, 5, 5], [3, 3, 4, 4]],
    pad: 'sawtooth', chorus: true, echo: true, bassWave: 'sawtooth', bass: 'x...............', lead: 'triangle', leadAt: .25,
    arp: null, drums: { k: 'x.......x.x.....' }, drumsAt: .5 },
    sea: ['#0e3550', '#154f78'], coast: '#e9c97a', land: ['#2f7f4f', '#5fb86f'], caps: '#eef4ff',
    dead: [[52, 36, 22], [92, 60, 30], [140, 92, 44], [196, 140, 72]], crater: '#2a1c10', dg: [220, 150, 70], ag: [120, 180, 230],
    trait: { ground: 2, orbit: .75, text: 'Thick haze: ground x2, orbital x0.75' },
    fact: 'Saturn’s moon Titan has rivers and lakes of liquid methane under a thick orange haze.' },
  { name: 'AURORA', music: { style: 'bright pop', bpm: 104, key: 7, mode: 'major', bright: 5000, prog: [[0, 4, 5, 3], [0, 4, 3, 4]],
    pad: 'triangle', bassWave: 'triangle', bass: 'x..x..x.x..x..x.', lead: 'triangle', leadAt: .25,
    arp: { pat: [0, 1, 2, 3], rate: 1, oct: 2, len: .7, wave: 'square' }, drums: { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' }, drumsAt: .25 },
    sea: ['#141048', '#241a78'], coast: '#a6f0ff', land: ['#2fd8b8', '#8ff2dc'], caps: '#ffffff',
    dead: [[20, 26, 30], [36, 48, 52], [60, 80, 84], [96, 124, 126]], crater: '#101418', dg: [120, 170, 170], ag: [120, 240, 210],
    trait: { reward: 3, text: 'Salvage fields: goal rewards x3' },
    fact: 'Jupiter has auroras too, hundreds of times more energetic than Earth’s northern lights.' },
  { name: 'OBSIDIAN', music: { style: 'swing funk', bpm: 96, key: -7, mode: 'mixolydian', swing: .3, bright: 3600, prog: [[0, 0, 3, 0], [4, 3, 0, 4]],
    pad: null, bassWave: 'triangle', bass: 'x..o..x.5..x.o..', lead: 'square', leadAt: .25,
    arp: null, drums: { k: 'x.....x...x.....', s: '....x.......x...', h: 'x.xxx.xxx.xxx.xx' }, drumsAt: 0 },
    sea: ['#2a0a3a', '#45105a'], coast: '#ffe08a', land: ['#ff6f3c', '#ffb347'], caps: '#fff3d0',
    dead: [[10, 8, 14], [24, 18, 34], [44, 32, 60], [80, 60, 104]], crater: '#000000', dg: [140, 90, 180], ag: [255, 170, 90],
    trait: { tap: 5, orbit: .75, ground: .75, text: 'Glass crust: taps x5, systems x0.75' },
    fact: 'Obsidian is volcanic glass: lava that cooled too fast for crystals to grow.' },
  { name: 'NEBULA', music: { style: 'dreamy synthwave', bpm: 84, key: 3, mode: 'dorian', bright: 2800, prog: [[0, 3, 4, 3], [5, 3, 6, 4]],
    pad: 'sawtooth', chorus: true, bassWave: 'sawtooth', bass: 'x...x...x...x...', lead: 'sine', echo: true, leadAt: .25,
    arp: { pat: [0, 2, 4, 3], rate: 2, oct: 1, len: 1.5, wave: 'square' }, drums: { k: 'x.......x.......', s: '....x.......x...' }, drumsAt: .5 },
    lush: { bands: true }, sea: ['#3b2a6e', '#5a3f9a'], coast: '#ffd1a8', land: ['#f29ac6', '#ffc0dc'], caps: '#fff0f8',
    dead: [[30, 26, 40], [54, 46, 70], [86, 74, 104], [130, 118, 150]], crater: '#18141f', dg: [150, 130, 190], ag: [240, 170, 220],
    trait: { events: 2, text: 'Ion storms: events twice as often' },
    fact: 'Jupiter’s colourful bands are clouds of ammonia ice, stretched into stripes by winds of over 500 km/h.' },
  { name: 'OCEANUS', music: { style: 'island groove', bpm: 88, key: 5, mode: 'major', swing: .15, bright: 4200, prog: [[0, 3, 4, 3], [0, 5, 3, 4]],
    pad: null, bassWave: 'triangle', bass: 'x.....x.x.......', lead: 'triangle', leadAt: .25,
    arp: { pat: [-1, 0, -1, 1, -1, 2, -1, 1], rate: 2, oct: 1, len: .8, wave: 'triangle' }, drums: { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' }, drumsAt: .25 },
    lush: { sea: .78 }, sea: ['#063d5c', '#0a5e82'], coast: '#ffe7a3', land: ['#2fbf8f', '#7be0b0'], caps: '#e9fbff',
    dead: [[40, 46, 52], [62, 72, 78], [92, 104, 110], [132, 146, 150]], crater: '#20262a', dg: [140, 160, 170], ag: [90, 200, 230],
    trait: { price: .8, text: 'Calm seas: upgrades cost 20% less' },
    fact: 'The exoplanet K2-18 b may be a “hycean” world: a planet covered by a deep ocean under a hydrogen sky.' },
  { name: 'GLACIA', music: { style: 'frozen plucks', bpm: 72, key: -4, mode: 'minor', bright: 4800, prog: [[0, 5, 3, 4], [5, 3, 0, 4]],
    pad: 'sine', chorus: true, bassWave: 'sine', bass: 'x.......5.......', lead: 'sine', echo: true, leadAt: .25,
    arp: { pat: [0, 1, 2, 3, 4, 3, 2, 1], rate: 2, oct: 1, len: 1.4, wave: 'triangle', echo: true }, drums: { h: 'x.x.x.x.x.x.x.x.' }, drumsAt: .5 },
    lush: { caps: .74, sea: .56 }, sea: ['#0b1a44', '#173a7a'], coast: '#5fb8ff', land: ['#9ccbf0', '#e2f2ff'], caps: '#ffffff',
    dead: [[22, 24, 36], [38, 42, 60], [60, 66, 92], [96, 104, 136]], crater: '#0e1018', dg: [120, 130, 170], ag: [170, 220, 255],
    trait: { orbit: 2, tap: .5, text: 'Thin air: orbital systems x2, taps x0.5' },
    fact: 'Pluto has mountains of water ice as tall as the Rockies, sitting on plains of frozen nitrogen.' },
  { name: 'EDEN', music: { style: 'triumphant anthem', bpm: 120, key: 2, mode: 'major', bright: 5200, prog: [[0, 4, 5, 3], [0, 3, 4, 4]],
    pad: 'triangle', bassWave: 'square', bass: 'x.o.x.o.x.o.x.o.', lead: 'sawtooth', leadAt: .25,
    arp: { pat: [0, 1, 2, 3, 4, 3, 2, 1], rate: 1, oct: 1, len: .9, wave: 'square' }, drums: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.' }, drumsAt: .25 },
    lush: { sea: .32, rivers: true }, sea: ['#0b4f6c', '#127a8f'], coast: '#ffe08a', land: ['#1f8a3c', '#45c25a'], caps: '#f4ffe9',
    dead: [[46, 34, 26], [78, 58, 40], [118, 88, 58], [164, 128, 88]], crater: '#24180f', dg: [200, 150, 100], ag: [140, 230, 150],
    trait: { ground: 1.25, reward: 2, text: 'Fertile soil: ground systems x1.25, goal rewards x2' },
    fact: 'Earth is the only world known to have life, yet about a fifth of Sun-like stars may have an Earth-sized planet in the habitable zone.' },
];
const world = () => WORLDS[S.world % WORLDS.length];
const trait = () => world().trait || {};

// Milestones: something new joins the planet.
const STAGES = [
  { at: .25, name: 'moon', text: 'MOON CAPTURED. Mars’ own moons, Phobos and Deimos, are probably captured asteroids.' },
  { at: .5, name: 'clouds', text: 'CLOUD LAYER FORMED. Earth bounces about 30% of incoming sunlight back to space, much of it off clouds.' },
  { at: .75, name: 'rings', text: 'RINGS FORMED. Saturn’s rings are billions of ice chunks, some as big as houses.' },
];
// Tapping the moon (an easter egg) reads one of these, in turn.
const MOON_FACTS = [
  'Our Moon drifts about 3.8 cm farther from Earth every year.',
  'The Moon probably formed when a Mars-sized world smashed into the young Earth.',
  'The Moon always shows Earth the same face: it is tidally locked.',
  'Saturn’s moon Enceladus sprays water geysers into space from an ocean under its ice.',
  'Jupiter’s moon Io is the most volcanic place in the solar system.',
  'Neptune’s moon Triton orbits backwards and will one day be torn apart by tides.',
];
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
  { text: `Heal CRIMSON to 100% and we warp to the next of ${WORLDS.length} worlds. Every healed world earns a Star Seed for Talents. Make me proud, Engineer.` },
];
