'use strict';

// All the numbers and words: systems, prices, worlds, goals and the commander's briefing.
// The engine (game.js) reads these; balance changes happen here.

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
// Total life earned for a fully terraformed planet: GOAL on the first world (a sim player takes ~13 min), then x GOAL_GROWTH per world.
// The warp boost doubles output each world, so later worlds still get faster (world 8 takes under 2 min) without becoming one tap.
const GOAL = 5e8, GOAL_GROWTH = 4;
// Highest world number: every value stays finite well past it (goal 5e8 x 4^400 ~ 1e250, life checked < 1e300). Warps stop counting here.
const MAX_WORLD = 400;
// Always one clear next step at the top, with a reward: [text, progress, target, reward, go].
// go: the system a tap on the unfinished goal jumps to (-1 = back to the planet); a function picks it at tap time.
const topSys = () => S.L.reduce((b, L, s) => (Math.max(...L) > Math.max(...S.L[b]) ? s : b), 0); // furthest-upgraded system
const GOALS = [
  ['Tap the planet 10 times', () => S.taps, 10, 60, -1], // 10 taps (40) + 60 = exactly the first unlock
  [() => `Unlock the ${SYS[0].name}`, () => +S.on[0], 1, 50, 0],
  [() => `Recruit 5 ${SYS[0].unit}s`, () => S.L[0][0], 5, 200, 0],
  [() => `Unlock the ${SYS[1].name}`, () => +S.on[1], 1, 500, 1],
  [() => `${SYS[0].ups[1][0]} to Lv 5`, () => S.L[0][1], 5, 1000, 0],
  ['Terraform 25%', () => pct(), 25, 3000, -1],
  [() => `Unlock the ${SYS[2].name}`, () => +S.on[2], 1, 6000, 2],
  ['Get any upgrade to Lv 20', () => Math.max(...S.L.flat()), 20, 2e4, topSys],
  [() => `Unlock the ${SYS[3].name}`, () => +S.on[3], 1, 5e4, 3],
  ['Terraform 50%', () => pct(), 50, 1e5, -1],
  [() => `Unlock the ${SYS[4].name}`, () => +S.on[4], 1, 1e6, 4],
  ['Terraform 75%', () => pct(), 75, 3e6, -1],
  [() => `Unlock the ${SYS[5].name}`, () => +S.on[5], 1, 2e7, 5],
  ['Terraform 100%', () => pct(), 100, 0, -1],
].map(([text, get, need, reward, go]) => ({ text, get, need, reward, go }));
// Worlds in warp order (CRIMSON first). Each heals from `dead` tones into its own alien palette; dg/ag = dead/alive atmosphere glow.
// music: [tempo in BPM, key shift in semitones] for the soundtrack while on this world.
// trait: what this world changes while you are on it (orbit/ground multiply those systems, tap multiplies taps, reward the goal rewards).
const WORLDS = [
  { name: 'CRIMSON', music: [80, 0], sea: ['#4a0d26', '#6e1636'], coast: '#ffb36b', land: ['#d6204f', '#ff5c7a'], caps: '#ffe0e6',
    dead: [[40, 38, 44], [66, 62, 70], [98, 92, 98], [140, 132, 136]], crater: '#24222a', dg: [160, 150, 170], ag: [255, 110, 140],
    fact: 'Plants on worlds around dim red stars might grow red or even black to soak up every bit of light.' },
  { name: 'ARES', music: [88, 2], sea: ['#1b6f78', '#23909a'], coast: '#e8c46a', land: ['#7b4bc4', '#b07cf0'], caps: '#f2e9ff',
    dead: [[74, 32, 34], [112, 46, 38], [158, 72, 46], [206, 120, 74]], crater: '#4a2022', dg: [233, 138, 163], ag: [154, 166, 224],
    trait: { orbit: 1.5, text: 'Low gravity: orbital systems x1.5' },
    fact: 'Some scientists think early life on Earth was purple, using a pigment called retinal instead of chlorophyll.' },
  { name: 'KRYPTONITE', music: [96, -3], sea: ['#0b3d2a', '#0f5c3a'], coast: '#d8ff6b', land: ['#39ff6a', '#a6ff3d'], caps: '#eaffd8',
    dead: [[18, 16, 28], [34, 28, 48], [56, 44, 74], [88, 70, 110]], crater: '#0c0a14', dg: [140, 110, 190], ag: [120, 240, 150],
    trait: { tap: 3, text: 'Charged crust: taps x3' },
    fact: 'PSR J1719-1438 b may be a planet-sized crystal of carbon: a diamond world circling a dead star.' },
  { name: 'GLASS STORM', music: [70, 5], sea: ['#0c2a7a', '#1440a8'], coast: '#bff4ff', land: ['#3fd0ff', '#9ef0ff'], caps: '#ffffff',
    dead: [[24, 30, 46], [40, 50, 72], [64, 78, 104], [100, 116, 140]], crater: '#141a2a', dg: [130, 145, 180], ag: [110, 190, 255],
    trait: { ground: 1.5, text: 'Calm lowlands: ground systems x1.5' },
    fact: 'On HD 189733 b it rains glass, blown sideways by winds of about 8,700 km/h.' },
  { name: 'INFERNO', music: [104, -5], sea: ['#5a1a6a', '#7a2a8a'], coast: '#ffd166', land: ['#ff9f1c', '#e8a33c'], caps: '#fff1c9', lava: true, // lava: dead[3] glows in the cracks instead of lighting crater rims
    dead: [[16, 12, 14], [34, 24, 24], [60, 30, 24], [255, 110, 30]], crater: '#000000', dg: [255, 120, 60], ag: [255, 200, 110],
    trait: { orbit: 2, ground: .75, text: 'Heat shimmer: orbital x2, ground x0.75' },
    fact: '55 Cancri e is so close to its star that its dayside may be one huge ocean of lava.' },
  { name: 'TITAN', music: [66, -2], sea: ['#0e3550', '#154f78'], coast: '#e9c97a', land: ['#2f7f4f', '#5fb86f'], caps: '#eef4ff',
    dead: [[52, 36, 22], [92, 60, 30], [140, 92, 44], [196, 140, 72]], crater: '#2a1c10', dg: [220, 150, 70], ag: [120, 180, 230],
    trait: { ground: 2, orbit: .75, text: 'Thick haze: ground x2, orbital x0.75' },
    fact: 'Saturn’s moon Titan has rivers and lakes of liquid methane under a thick orange haze.' },
  { name: 'AURORA', music: [76, 7], sea: ['#141048', '#241a78'], coast: '#a6f0ff', land: ['#2fd8b8', '#8ff2dc'], caps: '#ffffff',
    dead: [[20, 26, 30], [36, 48, 52], [60, 80, 84], [96, 124, 126]], crater: '#101418', dg: [120, 170, 170], ag: [120, 240, 210],
    trait: { reward: 3, text: 'Salvage fields: goal rewards x3' },
    fact: 'Jupiter has auroras too, hundreds of times more energetic than Earth’s northern lights.' },
  { name: 'OBSIDIAN', music: [92, -7], sea: ['#2a0a3a', '#45105a'], coast: '#ffe08a', land: ['#ff6f3c', '#ffb347'], caps: '#fff3d0',
    dead: [[10, 8, 14], [24, 18, 34], [44, 32, 60], [80, 60, 104]], crater: '#000000', dg: [140, 90, 180], ag: [255, 170, 90],
    trait: { tap: 5, orbit: .75, ground: .75, text: 'Glass crust: taps x5, systems x0.75' },
    fact: 'Obsidian is volcanic glass: lava that cooled too fast for crystals to grow.' },
];
const world = () => WORLDS[S.world % WORLDS.length];
const trait = () => world().trait || {};

// Milestones: something new joins the planet.
const STAGES = [
  { at: .25, name: 'moon', text: 'MOON CAPTURED. Mars’ own moons, Phobos and Deimos, are probably captured asteroids.' },
  { at: .5, name: 'clouds', text: 'CLOUD LAYER FORMED. Earth bounces about 30% of incoming sunlight back to space, much of it off clouds.' },
  { at: .75, name: 'rings', text: 'RINGS FORMED. Saturn’s rings are billions of ice chunks, some as big as houses.' },
];
// Warp boons: the warp screen offers three of these; the one you pick lasts for the next world only.
const BOONS = [
  { id: 'head', name: 'Head Start', desc: 'Arrive with the first two systems already online.' },
  { id: 'hands', name: 'Hot Hands', desc: 'Taps pay x3 on this world.' },
  { id: 'short', name: 'Shortcut', desc: 'This world needs 25% less life to heal.' },
  { id: 'storm', name: 'Storm Season', desc: 'Meteor showers, flares and comets come three times as often.' },
  { id: 'bulk', name: 'Bulk Deal', desc: 'Upgrades cost 20% less on this world.' },
  { id: 'crew', name: 'Veteran Crew', desc: 'Every system comes online with 5 crew already aboard.' },
  { id: 'summer', name: 'Long Summer', desc: 'All systems produce x1.5 on this world.' },
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
