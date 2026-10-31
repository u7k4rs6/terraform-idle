// Key art for the itch.io cover (Cover, 2x of 630x500) and the YouTube thumbnail (Thumb): a planet split by a lightning crack,
// dead rock on one side, alive on the other, Commander Vos in front and the machines firing at it. Uses the art in out/.
import React from 'react'
import { AbsoluteFill, Img, staticFile, useVideoConfig } from 'remotion'

const C = { night: '#0d0f18', deep: '#1f2333', line: '#e9ecf5', pink: '#e98aa3', hot: '#ff5c7a', sun: '#ffe08a', orange: '#ff8a3d', cyan: '#7fe3ff', dark: '#11131f' }
const rnd = (i: number, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x) } // fixed scatter
const px = { imageRendering: 'pixelated' as const }
const zig = (x0: number, y0: number, x1: number, y1: number, n: number, amp: number, seed: number) => // jagged line, ends fixed
  Array.from({ length: n + 1 }, (_, i) => { const t = i / n, j = i && i < n ? (rnd(i, seed) - .5) * 2 * amp : 0; return [x0 + (x1 - x0) * t + j, y0 + (y1 - y0) * t] })
const pts = (p: number[][]) => p.map(q => q.join(',')).join(' ')

export const Thumbnail: React.FC = () => {
  const { width: W, height: H } = useVideoConfig(), wide = W / H > 1.5, u = H / 1000
  const r = (wide ? 420 : 350) * u, cx = W * (wide ? .64 : .68), cy = H * (wide ? .6 : .62) // the planet
  const crack = zig(cx + r * .25, cy - r * 1.08, cx - r * .3, cy + r * 1.08, 11, r * .09, 3)
  const hit = [cx + r * .45, cy - r * .35] // where the antimatter beam lands
  const vos = 5 * 132 * u
  const title = (wide ? 210 : 235) * u
  const glow = (c: string, s: number) => `drop-shadow(0 0 ${s * u}px ${c})`
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at ${cx}px ${cy}px, #4a2340 0%, #241a35 35%, ${C.night} 75%)`, overflow: 'hidden', fontFamily: 'VT323' }}>
      {/* starburst behind the planet */}
      <AbsoluteFill style={{ background: `repeating-conic-gradient(from 0deg at ${cx}px ${cy}px, rgba(233,138,163,.16) 0deg 5deg, transparent 5deg 15deg)`, WebkitMaskImage: `radial-gradient(circle at ${cx}px ${cy}px, black 20%, transparent 70%)` }} />
      {Array.from({ length: 140 }, (_, i) => <div key={i} style={{ position: 'absolute', left: rnd(i, 1) * W, top: rnd(i, 2) * H, width: (rnd(i, 3) < .2 ? 6 : 4) * u, height: (rnd(i, 3) < .2 ? 6 : 4) * u, background: rnd(i, 4) < .25 ? C.pink : '#8f99c4', opacity: .35 + rnd(i, 5) * .6 }} />)}
      {/* atmosphere: cold on the dead side, hot on the living side */}
      <div style={{ position: 'absolute', left: cx - r * 1.5, top: cy - r * 1.5, width: r * 3, height: r * 3, borderRadius: '50%', background: `radial-gradient(circle, transparent 46%, rgba(255,92,122,.55) 50%, rgba(233,138,163,.18) 60%, transparent 70%)`, WebkitMaskImage: `linear-gradient(110deg, transparent 38%, black 55%)` }} />
      <div style={{ position: 'absolute', left: cx - r * 1.4, top: cy - r * 1.4, width: r * 2.8, height: r * 2.8, borderRadius: '50%', background: `radial-gradient(circle, transparent 49%, rgba(143,153,196,.4) 52%, transparent 66%)`, WebkitMaskImage: `linear-gradient(110deg, black 35%, transparent 52%)` }} />
      {/* ring, back half */}
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        <ellipse cx={cx} cy={cy} rx={r * 1.55} ry={r * .32} transform={`rotate(-14 ${cx} ${cy})`} fill="none" stroke={C.pink} strokeWidth={10 * u} strokeDasharray={`${14 * u} ${8 * u}`} opacity={.55} />
      </svg>
      {/* the planet: dead underneath, alive clipped to the right of the crack */}
      <Img src={staticFile('thumb/planet-0-dead.png')} style={{ ...px, position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, filter: 'brightness(.85)' }} />
      <Img src={staticFile('thumb/planet-0-alive.png')} style={{ ...px, position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, filter: 'saturate(1.35) brightness(1.08)',
        clipPath: `polygon(${[...crack.map(([x, y]) => `${x - (cx - r)}px ${y - (cy - r)}px`), `${r * 2.2}px ${r * 2.2}px`, `${r * 2.2}px ${-r * .2}px`].join(',')})` }} />
      <div style={{ position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: '50%', boxShadow: `inset 0 0 0 ${6 * u}px rgba(233,236,245,.9), 0 0 ${60 * u}px rgba(255,92,122,.35)` }} />
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {/* ring, front half */}
        <path d={`M ${cx - r * 1.55} ${cy} A ${r * 1.55} ${r * .32} 0 0 0 ${cx + r * 1.55} ${cy}`} transform={`rotate(-14 ${cx} ${cy})`} fill="none" stroke={C.pink} strokeWidth={10 * u} strokeDasharray={`${14 * u} ${8 * u}`} />
        {/* the crack: white-hot core, pink and cyan glow, small forks */}
        <polyline points={pts(crack)} fill="none" stroke={C.pink} strokeWidth={26 * u} opacity={.45} style={{ filter: glow(C.hot, 30) }} />
        <polyline points={pts(crack)} fill="none" stroke={C.line} strokeWidth={8 * u} style={{ filter: `${glow(C.cyan, 10)} ${glow(C.pink, 24)}` }} />
        {[3, 6, 9].map(i => <polyline key={i} points={pts(zig(crack[i][0], crack[i][1], crack[i][0] + (i % 2 ? -1 : 1) * r * .28, crack[i][1] + r * .12, 4, r * .04, i))} fill="none" stroke={C.line} strokeWidth={4 * u} style={{ filter: glow(C.cyan, 8) }} />)}
        {/* antimatter beam from the top right, landing on the living side */}
        <polygon points={pts([[W + 40 * u, -60 * u], [W + 120 * u, 20 * u], [hit[0] + 8 * u, hit[1] + 8 * u], [hit[0] - 8 * u, hit[1] - 8 * u]])} fill={C.pink} opacity={.5} style={{ filter: glow(C.hot, 40) }} />
        <polygon points={pts([[W + 60 * u, -40 * u], [W + 90 * u, -10 * u], [hit[0] + 3 * u, hit[1] + 3 * u], [hit[0] - 3 * u, hit[1] - 3 * u]])} fill={C.line} style={{ filter: glow(C.line, 16) }} />
        {/* impact starburst */}
        <polygon points={pts(Array.from({ length: 24 }, (_, i) => { const a = i / 24 * Math.PI * 2, k = (i % 2 ? .35 : 1) * (70 + rnd(i, 9) * 50) * u; return [hit[0] + Math.cos(a) * k, hit[1] + Math.sin(a) * k] }))} fill={C.sun} style={{ filter: `${glow(C.orange, 30)} ${glow(C.line, 10)}` }} />
        <circle cx={hit[0]} cy={hit[1]} r={30 * u} fill={C.line} />
        <circle cx={hit[0]} cy={hit[1]} r={120 * u} fill="none" stroke={C.line} strokeWidth={6 * u} opacity={.7} />
        {/* lightning from the storm coil onto the top of the planet */}
        <polyline points={pts(zig(cx - r * .55, cy - r * 1.55, cx - r * .15, cy - r * .92, 8, r * .07, 11))} fill="none" stroke={C.cyan} strokeWidth={7 * u} style={{ filter: glow(C.cyan, 18) }} />
        <polyline points={pts(zig(cx - r * .55, cy - r * 1.55, cx - r * .15, cy - r * .92, 8, r * .07, 11))} fill="none" stroke={C.line} strokeWidth={3 * u} />
        {/* kinetic rods raining in from the top left */}
        {[0, 1, 2, 3, 4].map(i => { const x = cx - r * (.9 - i * .32), y = cy - r * (1.25 - rnd(i, 7) * .3), l = 150 * u; return <g key={i}>
          {[1, .6, .3].map((k, j) => <line key={j} x1={x - l * .7 * k} y1={y - l * k} x2={x} y2={y} stroke={C.line} strokeWidth={(5 + j * 3) * u} opacity={.25 + j * .3} />)}<rect x={x - 6 * u} y={y - 6 * u} width={12 * u} height={12 * u} fill={C.line} style={{ filter: glow(C.cyan, 10) }} />
        </g> })}
        {/* lava bombs */}
        {[0, 1, 2, 3].map(i => { const x = cx + r * (.15 + i * .28), y = cy + r * (.55 + rnd(i, 13) * .3); return <g key={i}>
          <rect x={x - 10 * u} y={y - 10 * u} width={20 * u} height={20 * u} fill={C.orange} style={{ filter: glow(C.orange, 18) }} /><rect x={x - 4 * u} y={y - 4 * u} width={8 * u} height={8 * u} fill={C.sun} />
          {[1, 2, 3].map(k => <rect key={k} x={x - (10 + k * 22) * u} y={y + k * 14 * u} width={(10 - k * 2) * u} height={(10 - k * 2) * u} fill={k % 2 ? C.orange : C.sun} opacity={1 - k * .25} />)}
        </g> })}
        {/* debris */}
        {Array.from({ length: 46 }, (_, i) => { const a = rnd(i, 21) * Math.PI * 2, d = (90 + rnd(i, 22) * 260) * u, s = (4 + rnd(i, 23) * 9) * u; return <rect key={i} x={hit[0] + Math.cos(a) * d} y={hit[1] + Math.sin(a) * d} width={s} height={s} fill={[C.line, C.pink, C.sun, C.orange][i % 4]} opacity={.9} /> })}
      </svg>
      {/* 0% / 100% */}
      <div style={{ position: 'absolute', left: cx - r * .78, top: cy + r * .05, fontSize: 92 * u, color: '#aab2d0', textShadow: `${5 * u}px ${5 * u}px 0 ${C.dark}`, transform: 'rotate(-8deg)' }}>0%</div>
      <div style={{ position: 'absolute', left: cx + r * (wide ? .18 : .05), top: cy + r * (wide ? .02 : -.12), fontSize: 118 * u, color: C.sun, textShadow: `${6 * u}px ${6 * u}px 0 ${C.hot}, 0 0 ${30 * u}px ${C.orange}`, transform: 'rotate(-8deg)' }}>100%</div>
      {/* Commander Vos, rim-lit, visor blazing */}
      <div style={{ position: 'absolute', left: -60 * u, bottom: -60 * u, width: vos, height: vos }}>
        <div style={{ position: 'absolute', left: '42%', top: '20%', width: '40%', height: '22%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,179,107,.9), transparent 70%)', filter: `blur(${20 * u}px)` }} />
        <Img src={staticFile('art/vos.png')} style={{ ...px, position: 'absolute', inset: 0, width: '100%', filter: `${glow(C.hot, 26)} drop-shadow(${-8 * u}px 0 0 rgba(127,227,255,.5))` }} />
      </div>
      {/* the logo: dark outline, pink extrusion, cyan ghost, sunrise face */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: (wide ? 18 : 30) * u, textAlign: 'center', transform: 'rotate(-4deg)', fontSize: title, lineHeight: 1, letterSpacing: 6 * u }}>
        <div style={{ position: 'absolute', left: 0, right: 0, color: C.cyan, transform: `translate(${-14 * u}px, ${-6 * u}px)`, opacity: .8 }}>TERRAFORM</div>
        <div style={{ position: 'absolute', left: 0, right: 0, color: C.pink, textShadow: Array.from({ length: 16 }, (_, i) => `${(i + 1) * u}px ${(i + 1) * 1.2 * u}px 0 ${i < 10 ? C.hot : '#7a2440'}`).join(',') }}>TERRAFORM</div>
        <div style={{ position: 'relative', color: 'transparent', background: `linear-gradient(${C.line} 45%, ${C.sun} 70%, ${C.orange})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', filter: `drop-shadow(0 0 ${2 * u}px ${C.dark})`, WebkitTextStroke: `${3 * u}px ${C.dark}` }}>TERRAFORM</div>
      </div>
      {/* sticker */}
      <div style={{ position: 'absolute', right: (wide ? 30 : 14) * u, bottom: (wide ? 40 : 24) * u, width: (wide ? 300 : 250) * u, height: (wide ? 300 : 250) * u, transform: 'rotate(12deg)', filter: `drop-shadow(${8 * u}px ${8 * u}px 0 ${C.dark})` }}>
        <div style={{ position: 'absolute', inset: 0, background: C.sun, clipPath: `polygon(${Array.from({ length: 32 }, (_, i) => { const a = i / 32 * Math.PI * 2, k = i % 2 ? 41 : 50; return `${50 + Math.cos(a) * k}% ${50 + Math.sin(a) * k}%` }).join(',')})` }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.dark, textAlign: 'center', lineHeight: .85 }}>
          <div style={{ fontSize: (wide ? 52 : 44) * u }}>REVIVE</div><div style={{ fontSize: (wide ? 96 : 80) * u, color: '#b8233f' }}>5 DEAD</div><div style={{ fontSize: (wide ? 52 : 44) * u }}>WORLDS</div>
        </div>
      </div>
      <AbsoluteFill style={{ background: 'repeating-linear-gradient(rgba(0,0,0,.12) 0 2px, transparent 2px 4px), radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.6))' }} />
    </AbsoluteFill>
  )
}
