// The trailer's beat plan, shared by the edit (src/) and the music (music.mjs) so every cut lands on the beat.
export const BPM = 120, FPS = 30, BEAT = 60 / BPM; // seconds per beat
export const frames = b => Math.round(b * BEAT * FPS);
// section starts, in beats
export const S = { open: 0, commander: 16, title: 32, how: 36, alive: 68, warp: 84, worlds: 88, arsenal: 108, talents: 120, climax: 132, end: 148, out: 166 };
