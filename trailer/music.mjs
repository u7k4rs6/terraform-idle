// Writes out/music.wav: a dark retro synthwave track on the trailer's beat plan (src/plan.mjs), synthesized note by note.
// A harmonic minor (Am F Dm E), 120 BPM. Every section change in the edit has a hit, riser or drop here.
import fs from 'node:fs'
import { BPM, BEAT, S } from './src/plan.mjs'

const SR = 48000, LEN = (S.out + 4) * BEAT, N = Math.ceil(LEN * SR)
const L = new Float32Array(N), R = new Float32Array(N)
const sec = b => b * BEAT, idx = t => Math.round(t * SR)
const mtof = m => 440 * 2 ** ((m - 69) / 12)
let seed = 7
const rnd = () => ((seed = seed * 16807 % 2147483647) / 2147483647) * 2 - 1
const lp = fc => 1 - Math.exp(-2 * Math.PI * fc / SR) // one-pole lowpass coefficient
// mix a mono voice into the stereo buffer at time t (pan -1..1)
function add(t, buf, gain = 1, pan = 0) {
  const s = idx(t), gl = gain * Math.min(1, 1 - pan), gr = gain * Math.min(1, 1 + pan)
  for (let i = 0; i < buf.length && s + i < N; i++) if (s + i >= 0) { L[s + i] += buf[i] * gl; R[s + i] += buf[i] * gr }
}
const voice = (dur, fn) => { const n = Math.ceil(dur * SR), b = new Float32Array(n); for (let i = 0; i < n; i++) b[i] = fn(i / SR, i); return b }

// ---- instruments ----
const kick = () => voice(.45, t => Math.sin(2 * Math.PI * (45 * t + 110 * (1 - Math.exp(-t * 30)) / 30)) * Math.exp(-t * 7) + (t < .004 ? rnd() * .3 : 0)) // pitch drops 155 -> 45 Hz
const snare = () => { let y = 0; const a = lp(4000); return voice(.25, t => { y += a * (rnd() - y); return (y * 1.2 * Math.exp(-t * 18) + Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 30) * .6) }) }
const hat = open => { let p = 0; return voice(open ? .3 : .06, t => { const x = rnd(), h = x - p; p = x; return h * Math.exp(-t * (open ? 12 : 60)) * .5 }) }
const crash = () => { let p = 0; return voice(2.2, t => { const x = rnd(), h = x - p; p = x; return h * Math.exp(-t * 2.2) * .45 }) }
const boom = () => { let y = 0; const a = lp(220); return voice(3, t => { y += a * (rnd() - y); return Math.sin(2 * Math.PI * (32 * t + 60 * (1 - Math.exp(-t * 6)) / 6)) * Math.exp(-t * 1.6) + y * 2.5 * Math.exp(-t * 1.2) }) }
function riser(dur) { let y = 0; return voice(dur, t => { const k = t / dur; y += lp(200 + 7000 * k * k) * (rnd() - y); return y * k * k * 1.4 }) }
function bass(m, dur, bright = 1) { // two detuned saws through an enveloped lowpass
  let y = 0, p1 = 0, p2 = 0; const f = mtof(m)
  return voice(dur, t => { p1 = (p1 + f / SR) % 1; p2 = (p2 + f * 1.006 / SR) % 1; const x = (p1 * 2 - 1) + (p2 * 2 - 1); y += lp((180 + 1400 * bright * Math.exp(-t * 9))) * (x - y); return y * .5 * Math.min(1, t * 200) * Math.min(1, (dur - t) * 40) })
}
function pad(ms, dur, cutoff = 900) { // detuned saw chord, slow swell
  const ph = ms.flatMap(m => [0, 0, 0].map((_, k) => ({ f: mtof(m) * [1, 1.004, .996][k], p: Math.random() }))); let y = 0
  return voice(dur, t => { let x = 0; for (const o of ph) { o.p = (o.p + o.f / SR) % 1; x += o.p * 2 - 1 } y += lp(cutoff) * (x - y); return y / ph.length * Math.min(1, t / 1.2) * Math.min(1, (dur - t) / 1.2) * 1.4 })
}
function pluck(m, dur = .22, duty = .5) { // square arp / lead note
  let p = 0; const f = mtof(m); let y = 0
  return voice(dur, t => { p = (p + f / SR) % 1; y += lp(2600) * ((p < duty ? 1 : -1) - y); return y * Math.exp(-t * 9) * .5 })
}
function lead(m, dur) { // pulse lead with vibrato
  let p = 0, y = 0; const f = mtof(m)
  return voice(dur, t => { p = (p + f * (1 + .006 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t * 3)) / SR) % 1; y += lp(3200) * ((p < .3 ? 1 : -1) - y); return y * .42 * Math.min(1, t * 80) * Math.min(1, (dur - t) * 20) })
}

// ---- song ----
const PROG = [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]] // Am F Dm E, one chord per bar (4 beats)
const ROOT = [45, 41, 38, 40]
const chordAt = b => Math.floor(b / 4) % 4
const K = kick(), SN = snare(), HC = hat(false), HO = hat(true), CR = crash(), BM = boom()
const arpEcho = []; // [time, buffer, gain, pan] for the delayed copies
const hit = b => { add(sec(b), BM, .9); add(sec(b), CR, .6) }

for (let b = S.open; b < S.out; b++) {
  const t = sec(b), c = chordAt(b), bar = b % 4 === 0, sect = Object.entries(S).filter(([, v]) => v <= b).at(-1)[0]
  const groove = ['how', 'worlds', 'arsenal', 'climax'].includes(sect), build = sect === 'alive'
  // pads: a dark drone under everything, brighter as the trailer opens up
  if (bar) add(t, pad(PROG[c], BEAT * 4.6, sect === 'open' ? 500 : groove || sect === 'climax' ? 1600 : 1100), sect === 'open' ? .5 : .32)
  // drums
  if (sect === 'open' && b >= 8 && b % 2 === 0) add(t, K, .55) // heartbeat
  if (sect === 'commander' && b % 2 === 0) add(t, K, .7)
  if (groove || build) {
    add(t, K, .95)
    if (b % 2 === 1) add(t, SN, .55)
    for (let s = 0; s < 4; s++) add(t + s * BEAT / 4, s % 2 ? HC : HC, s === 2 ? .35 : .22, .3)
    if (b % 4 === 3) add(t + BEAT / 2, HO, .25, -.3)
  }
  if (sect === 'talents') { for (let s = 0; s < 2; s++) add(t + s * BEAT / 2, HC, .25, .3); if (b % 4 === 0) add(t, K, .6) }
  if (sect === 'climax' && b % 4 === 0) add(t, CR, .35)
  // bass: 8ths in the groove, long notes elsewhere
  if (groove || build || sect === 'commander') for (let s = 0; s < 2; s++) add(t + s * BEAT / 2, bass(ROOT[c] + (s && sect === 'climax' ? 12 : 0), BEAT / 2 * .9, build ? .5 + (b - S.alive) / 16 : 1), .55)
  else if (bar && sect !== 'title') add(t, bass(ROOT[c], BEAT * 4, .3), .45)
  // arpeggio with echoes
  if (!['open', 'title', 'warp'].includes(sect)) for (let s = 0; s < 4; s++) {
    const m = PROG[c][[0, 1, 2, 1][s]] + 12 + (s === 3 && b % 2 ? 12 : 0), buf = pluck(m)
    add(t + s * BEAT / 4, buf, .16, -.4); arpEcho.push([t + s * BEAT / 4 + BEAT * .75, buf, .07, .5])
  }
}
// lead melody over the planets and the climax (one phrase per 8 beats)
const MEL = [76, -1, 72, 74, 76, 79, 77, 76, 74, -1, 71, 72, 74, 77, 76, 74, 72, -1, 69, 71, 72, 74, 72, 71, 68, 69, 71, 74, 76, -1, 75, 76]
for (const [from, to, up] of [[S.worlds, S.arsenal, 0], [S.climax, S.end, 12]]) for (let b = from; b < to; b += .5) {
  const m = MEL[Math.round((b - from) * 2) % MEL.length]
  if (m > 0) add(sec(b), lead(m + up, BEAT * .5 * .95), .2, .15)
}
for (const [t, buf, g, pan] of arpEcho) add(t, buf, g, pan)
// risers into every big moment, and the hits themselves
for (const [b, len] of [[S.commander, 4], [S.title, 4], [S.how, 2], [S.warp, 4], [S.worlds, 2], [S.climax, 4], [S.end, 4]]) add(sec(b - len), riser(sec(len)), .35)
for (let b = S.alive + 12; b < S.warp; b += .25) add(sec(b), SN, .15 + .3 * (b - S.alive - 12) / 4) // snare roll into the warp
for (const b of [S.title, S.how, S.warp, S.worlds, S.climax, S.end]) hit(b)
for (let b = S.worlds + 4; b < S.arsenal; b += 4) add(sec(b), CR, .35) // a crash on every new planet
// end: one long last chord after the final hit, then fade
add(sec(S.end), pad([45, 57, 60, 64], BEAT * 16, 1200), .45)

// soft-clip and write 16-bit stereo WAV
let peak = 0
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
const g = 1.1 / peak, pcm = Buffer.alloc(N * 4)
for (let i = 0; i < N; i++) {
  const fade = Math.min(1, (N - i) / (SR * 3))
  pcm.writeInt16LE(Math.round(Math.tanh(L[i] * g) * fade * 32000), i * 4); pcm.writeInt16LE(Math.round(Math.tanh(R[i] * g) * fade * 32000), i * 4 + 2)
}
const h = Buffer.alloc(44)
h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22)
h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40)
fs.mkdirSync('out', { recursive: true })
fs.writeFileSync('out/music.wav', Buffer.concat([h, pcm]))
console.log(`out/music.wav: ${LEN.toFixed(1)}s at ${BPM} BPM`)
