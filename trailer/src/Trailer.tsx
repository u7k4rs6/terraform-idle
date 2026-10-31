// The Terraform trailer: recorded gameplay (out/gameplay-av.mp4) cut on the soundtrack's beat plan (plan.mjs), found by what
// happened in the recording (out/timeline.json, marked by driver.mjs), with titles in the game's pixel font and palette.
import React from 'react'
import { AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { FPS, S, frames } from './plan.mjs'
import recording from '../out/timeline.json'
import sprites from '../out/art/sprites.json'

const C = { bg: '#2b3047', deep: '#1f2333', night: '#0d0f18', line: '#e9ecf5', pink: '#e98aa3', soft: '#8f99c4', sun: '#ffe08a', dim: '#59607f', cyan: '#7fe3ff' }
const WORLDS = ['CRIMSON', 'ARES', 'KRYPTONITE', 'GLASS STORM', 'INFERNO']
const B = (b: number) => frames(b)

// ---- the recording: find moments by what happened ----
type Ev = { t: number, type: string, [k: string]: any }
const T = recording.timeline as Ev[]
const find = (type: string, ok: (e: Ev) => boolean = () => true) => {
  const e = T.find(e => e.type === type && ok(e))
  if (!e) throw new Error(`the recording has no ${type} moment: record again (driver.mjs)`)
  return e.t / 1000
}
const scene = (name: string) => find('scene', e => e.name === name)
const weapon = (s: number, w?: number) => find('weapon', e => e.s === s && e.world === w)
const world = (w: number, phase: string) => find('world', e => e.w === w && e.phase === phase)
const line = (i: number) => find('line', e => e.i === i)

// the game's pixel font, loaded before any frame renders
const fontWait = delayRender('VT323 font')
new FontFace('VT323', `url(${staticFile('VT323.ttf')})`).load().then(f => { document.fonts.add(f); continueRender(fontWait) })

// ---- layout: Wide shows the footage full frame; Tall puts it in a band with a blurred copy behind and big captions above ----
const useLayout = () => {
  const { width, height } = useVideoConfig(), tall = height > width, u = tall ? width / 1080 : width / 1920
  const vid = tall ? { x: 0, y: Math.round(height * .34), w: width, h: Math.round(width * 9 / 16) } : { x: 0, y: 0, w: width, h: height }
  return { tall, width, height, u, vid }
}
const ease = (f: number, a: number, b: number, from: number, to: number, e = Easing.out(Easing.cubic)) => interpolate(f, [a, b], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e })
const px = { imageRendering: 'pixelated' as const }
const font = (size: number, color = C.line): React.CSSProperties => ({ fontFamily: 'VT323', fontSize: size, color, lineHeight: .95, letterSpacing: size * .02 })

// ---- footage ----
const VIDEO = staticFile('gameplay-av.mp4')
const pointer = T.filter(e => e.type === 'finger' || e.type === 'press' || e.type === 'release')
const HAND = staticFile('art/hand.png')
// the driver's finger, drawn as the game's own pixel hand, with a ripple on every press
const Finger: React.FC<{ at: number, rate: number }> = ({ at, rate }) => {
  const f = useCurrentFrame(), L = useLayout(), now = (at + f * rate / FPS) * 1000, s = L.vid.w / 1280
  let pos: Ev | null = null, press: Ev | null = null
  for (const e of pointer) { if (e.t > now) break; pos = e; if (e.type === 'press') press = e }
  if (!pos || now - pos.t > 1200) return null
  const down = press && now - press.t < 140, ring = press ? (now - press.t) / 300 : 2, z = 6 * s
  return (
    <>
      {ring < 1 && <div style={{ position: 'absolute', left: press!.x * s, top: press!.y * s, width: 0, height: 0 }}>
        <div style={{ position: 'absolute', left: -60 * s * ring, top: -60 * s * ring, width: 120 * s * ring, height: 120 * s * ring, border: `${4 * s}px solid ${C.line}`, borderRadius: '50%', opacity: 1 - ring }} />
      </div>}
      <Img src={HAND} style={{ ...px, position: 'absolute', left: pos.x * s - 3.5 * z, top: pos.y * s - .5 * z, width: 9 * z, transform: `scale(${down ? .85 : 1})`, transformOrigin: '40% 5%', filter: 'drop-shadow(0 6px 0 rgba(0,0,0,.45))' }} />
    </>
  )
}
// a piece of the recording starting at `at` seconds; zoom eases from zoom[0] to zoom[1] over the clip, toward focus
const Footage: React.FC<{ at: number, len: number, zoom?: [number, number], focus?: [number, number], volume?: number, dim?: number, rate?: number, punch?: boolean }> =
  ({ at, len, zoom = [1, 1], focus = [.5, .5], volume = .5, dim = 0, rate = 1, punch = false }) => {
    const f = useCurrentFrame(), L = useLayout()
    const k = ease(f, 0, len, zoom[0], zoom[1], Easing.inOut(Easing.quad)) * (punch ? 1 + .05 * Math.exp(-(f % B(1)) / 3) : 1) // punch: a kick on every beat
    const clip = (style: React.CSSProperties, muted: boolean) => <OffthreadVideo src={VIDEO} trimBefore={Math.round(at * FPS)} playbackRate={rate} volume={muted ? 0 : volume} muted={muted} style={style} />
    return (
      <AbsoluteFill>
        {L.tall && <AbsoluteFill style={{ overflow: 'hidden' }}>{clip({ position: 'absolute', height: '100%', left: '50%', transform: 'translateX(-50%) scale(1.2)', filter: 'blur(30px) brightness(.4) saturate(1.3)' }, true)}</AbsoluteFill>}
        <div style={{ position: 'absolute', left: L.vid.x, top: L.vid.y, width: L.vid.w, height: L.vid.h, overflow: 'hidden', boxShadow: L.tall ? `0 0 0 ${4 * L.u}px ${C.line}` : undefined }}>
          <div style={{ position: 'absolute', inset: 0, transform: `scale(${k})`, transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%` }}>
            {clip({ width: '100%', height: '100%' }, false)}
            <Finger at={at} rate={rate} />
          </div>
          {dim > 0 && <AbsoluteFill style={{ background: `rgba(13,15,24,${dim})` }} />}
        </div>
      </AbsoluteFill>
    )
  }

// ---- titles ----
// typed in like the game's commander, popping in; leaves on the last frames
const Caption: React.FC<{ text: string, len: number, size?: number, at?: 'low' | 'mid', color?: string, type?: boolean, slam?: boolean }> =
  ({ text, len, size = 96, at = 'low', color = C.line, type = true, slam = false }) => {
    const f = useCurrentFrame(), L = useLayout()
    const n = type ? Math.min(text.length, Math.floor(f * 1.8) + 1) : text.length
    const scale = slam ? ease(f, 0, 6, 2.2, 1, Easing.out(Easing.exp)) : ease(f, 0, 6, 1.12, 1)
    const opacity = Math.min(ease(f, 0, 2, 0, 1), ease(f, len - 4, len, 1, 0))
    const sz = size * L.u * (L.tall ? 1.15 : 1)
    const top = at === 'mid' ? L.height / 2 - sz / 2 : L.tall ? L.vid.y - sz * 2.6 : L.height * .8 - sz / 2
    return (
      <>
        {!L.tall && at === 'low' && <AbsoluteFill style={{ background: 'linear-gradient(transparent 55%, rgba(13,15,24,.8))', opacity }} />}
        <div style={{ ...font(sz, color), position: 'absolute', left: 0, right: 0, top, textAlign: 'center', padding: `0 ${70 * L.u}px`, opacity, transform: `scale(${scale})`, textShadow: `${6 * L.u}px ${6 * L.u}px 0 ${C.pink}, 0 0 ${40 * L.u}px rgba(0,0,0,.7)` }}>
          {text.slice(0, n)}<span style={{ opacity: n < text.length ? 1 : 0 }}>_</span>
        </div>
      </>
    )
  }
const Flash: React.FC<{ len?: number, color?: string }> = ({ len = 7, color = C.line }) => {
  const f = useCurrentFrame()
  return <AbsoluteFill style={{ background: color, opacity: ease(f, 0, len, .85, 0) }} />
}
const Fade: React.FC<{ from?: number, to?: number, len: number, start?: number }> = ({ from = 1, to = 0, len, start = 0 }) => {
  const f = useCurrentFrame()
  return <AbsoluteFill style={{ background: C.night, opacity: ease(f, start, start + len, from, to, Easing.linear) }} />
}
// the logo: three offset copies (cyan, pink, white) that slam together with a shake
const Logo: React.FC<{ size: number, slam?: boolean }> = ({ size, slam = true }) => {
  const f = useCurrentFrame(), L = useLayout(), s = size * L.u
  const k = slam ? ease(f, 0, 7, 3, 1, Easing.out(Easing.exp)) : 1, split = slam ? Math.max(0, 16 - f) * L.u * 1.4 : 0
  const shake = slam && f < 14 ? Math.sin(f * 7.3) * (14 - f) * 1.6 * L.u : 0
  const layer = (color: string, dx: number) => <div style={{ ...font(s, color), position: 'absolute', inset: 0, textAlign: 'center', transform: `translateX(${dx}px)`, mixBlendMode: color === C.line ? 'normal' : 'screen' }}>TERRAFORM</div>
  return (
    <div style={{ position: 'relative', height: s, transform: `translate(${shake}px, ${shake * .6}px) scale(${k})`, filter: `drop-shadow(${8 * L.u}px ${8 * L.u}px 0 ${C.pink})` }}>
      {layer(C.cyan, -split)}{layer(C.pink, split)}{layer(C.line, 0)}
    </div>
  )
}
// dot-grid stars like the game's sky, twinkling
const Stars: React.FC = () => {
  const f = useCurrentFrame(), L = useLayout(), dots: React.ReactNode[] = []
  for (let i = 0; i < 160; i++) {
    const x = (i * 7919 % 997) / 997, y = (i * 104729 % 991) / 991, tw = .4 + .6 * Math.abs(Math.sin(f / 9 + i))
    dots.push(<div key={i} style={{ position: 'absolute', left: x * L.width, top: y * L.height, width: 4 * L.u, height: 4 * L.u, background: i % 5 ? C.dim : C.soft, opacity: tw }} />)
  }
  return <AbsoluteFill style={{ background: C.night }}>{dots}</AbsoluteFill>
}
const Scanlines = () => <AbsoluteFill style={{ pointerEvents: 'none', background: 'repeating-linear-gradient(rgba(0,0,0,.13) 0 2px, transparent 2px 4px), radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.55))' }} />

// ---- cards ----
const VosCard: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame(), L = useLayout(), size = (L.tall ? 7 : 5) * 132 * L.u
  const x = ease(f, 0, 9, -size, L.tall ? (L.width - size) / 2 : 110 * L.u, Easing.out(Easing.back(1.2)))
  const glitch = f < 10 && f % 3 === 0 ? 14 * L.u : 0
  const quote = 'WE ARE GOING TO BRING THEM BACK.', n = Math.max(0, Math.min(quote.length, Math.floor((f - 18) * 1.8)))
  const text = (
    <div style={{ opacity: ease(f, 8, 14, 0, 1), ...(L.tall ? { position: 'absolute', top: 170 * L.u, left: 70 * L.u, right: 70 * L.u, textAlign: 'center' as const } : { position: 'absolute', left: 110 * L.u + size + 40 * L.u, right: 90 * L.u, top: L.height * .3 }) }}>
      <div style={font(64 * L.u, C.pink)}>COMMANDER VOS</div>
      <div style={{ ...font(40 * L.u, C.soft), marginTop: 10 * L.u }}>TERRAFORM CORPS · FRONTIER DIVISION</div>
      <div style={{ ...font(84 * L.u), marginTop: 50 * L.u, textShadow: `${5 * L.u}px ${5 * L.u}px 0 ${C.pink}` }}>{quote.slice(0, n)}</div>
    </div>
  )
  return (
    <AbsoluteFill>
      <Img src={staticFile('art/vos.png')} style={{ ...px, position: 'absolute', left: x + glitch, bottom: L.tall ? 0 : -40 * L.u, width: size, filter: `drop-shadow(${10 * L.u}px 0 0 rgba(233,138,163,.35))` }} />
      {text}
      <Fade from={0} to={1} len={4} start={len - 4} />
    </AbsoluteFill>
  )
}
const Arsenal: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame(), L = useLayout(), cols = L.tall ? 3 : 6, cell = (L.tall ? 330 : 290) * L.u
  const gridW = cols * cell, top = L.tall ? 560 * L.u : 300 * L.u
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Stars />
      <div style={{ ...font(120 * L.u), position: 'absolute', top: (L.tall ? 210 : 70) * L.u, left: 0, right: 0, textAlign: 'center', textShadow: `${6 * L.u}px ${6 * L.u}px 0 ${C.pink}`, transform: `scale(${ease(f, 0, 6, 1.6, 1, Easing.out(Easing.exp))})` }}>12 MACHINES</div>
      <div style={{ ...font(48 * L.u, C.soft), position: 'absolute', top: (L.tall ? 345 : 190) * L.u, left: 0, right: 0, textAlign: 'center', opacity: ease(f, 6, 10, 0, 1) }}>A NEW ARSENAL ON EVERY WORLD</div>
      {(sprites as { id: string, name: string }[]).map((s, i) => {
        const t = f - 4 - i * 3, k = ease(t, 0, 6, 0, 1, Easing.out(Easing.back(2)))
        return (
          <div key={s.id} style={{ position: 'absolute', left: (L.width - gridW) / 2 + (i % cols) * cell, top: top + Math.floor(i / cols) * cell * .95, width: cell, height: cell * .9, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', opacity: t > 0 ? 1 : 0, transform: `scale(${k})` }}>
            <Img src={staticFile(`art/${s.id}.png`)} style={{ ...px, height: 120 * L.u, objectFit: 'contain', marginBottom: 14 * L.u }} />
            <div style={{ ...font(34 * L.u, i < 6 ? C.line : C.pink), textAlign: 'center' }}>{s.name.toUpperCase()}</div>
          </div>
        )
      })}
      <Fade from={0} to={1} len={3} start={len - 3} />
    </AbsoluteFill>
  )
}
// planet name and a 0% -> 100% counter for the before/after run
const WorldTag: React.FC<{ w: number, len: number }> = ({ w, len }) => {
  const f = useCurrentFrame(), L = useLayout(), p = Math.round(ease(f, B(.6), len - B(.6), 0, 100, Easing.inOut(Easing.quad)))
  const top = L.tall ? L.vid.y - 330 * L.u : 70 * L.u
  return (
    <div style={{ position: 'absolute', left: L.tall ? 0 : 90 * L.u, right: L.tall ? 0 : undefined, top, textAlign: L.tall ? 'center' : 'left', transform: `translateX(${ease(f, 0, 6, -60 * L.u, 0)}px)`, opacity: ease(f, 0, 4, 0, 1) }}>
      <div style={font(44 * L.u, C.soft)}>WORLD {w + 1} / 5</div>
      <div style={{ ...font(130 * L.u), textShadow: `${6 * L.u}px ${6 * L.u}px 0 ${C.pink}` }}>{WORLDS[w]}</div>
      <div style={{ ...font(76 * L.u, p === 100 ? C.sun : C.pink), marginTop: 8 * L.u }}>{p === 100 ? 'ALIVE' : `${p}% ALIVE`}</div>
    </div>
  )
}
const EndCard: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame(), L = useLayout(), up = (a: number) => ({ opacity: ease(f, a, a + 6, 0, 1), transform: `translateY(${ease(f, a, a + 8, 30 * L.u, 0)}px)` })
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ width: '100%', marginTop: L.tall ? -380 * L.u : -80 * L.u }}>
        <Logo size={L.tall ? 230 : 280} />
        <div style={{ ...font(64 * L.u, C.sun), marginTop: 50 * L.u, ...up(10) }}>BRING DEAD WORLDS BACK TO LIFE</div>
        <div style={{ ...font(54 * L.u), marginTop: 70 * L.u, ...up(22) }}>PLAY FREE IN YOUR BROWSER</div>
        <div style={{ ...font(46 * L.u, C.pink), marginTop: 18 * L.u, ...up(28) }}>utkarshbahuguna.me/terraform-idle</div>
      </div>
      <div style={{ position: 'absolute', left: 40 * L.u, bottom: 0, display: 'flex', alignItems: 'center', gap: 20 * L.u, ...up(36) }}>
        <Img src={staticFile('art/vos.png')} style={{ ...px, width: 264 * L.u }} />
        <div style={{ ...font(40 * L.u), background: C.deep, border: `${4 * L.u}px solid ${C.line}`, padding: `${14 * L.u}px ${22 * L.u}px`, marginBottom: 60 * L.u }}>MAKE ME PROUD, ENGINEER.</div>
      </div>
      <Fade from={0} to={1} len={B(2)} start={len - B(2)} />
    </AbsoluteFill>
  )
}

// ---- the edit ----
type Part = [number, number, (len: number) => React.ReactNode] // [from beat, to beat, content]
const clip = (at: number, text?: string, o: Partial<React.ComponentProps<typeof Footage>> = {}, flash = true): Part[2] => len => (
  <><Footage at={at} len={len} {...o} />{text && <Caption text={text} len={len} />}{flash && <Flash />}</>
)
const PARTS: Part[] = [
  // 1. cold open: the story in type, then the dead world
  [S.open, 4, len => <><Stars /><Caption text="YEAR 2187." len={len} at="mid" size={110} /></>],
  [4, 8, len => <><Stars /><Caption text="EARTH HAS RUN OUT OF ROOM." len={len} at="mid" size={96} /></>],
  [8, 12, len => <><Footage at={scene('dead') + .3} len={len} zoom={[1.25, 1.15]} focus={[.5, .45]} volume={0} /><Caption text="FIVE DEAD WORLDS WAIT AT THE EDGE OF THE MAP" len={len} /><Fade len={B(2)} /></>],
  [12, 16, len => <><Footage at={scene('dead') + 2.3} len={len} zoom={[1.15, 1.05]} focus={[.5, .45]} volume={0} /><Caption text="NO AIR. NO WATER. NO LIFE." len={len} color={C.pink} /></>],
  // 2. the commander
  [S.commander, 21, clip(scene('commander') + .1, undefined, { zoom: [1.12, 1.18], focus: [.15, .9] })],
  [21, 26, clip(line(0) + .5, undefined, { zoom: [1.18, 1.12], focus: [.15, .9] }, false)],
  [26, S.title, len => <><Footage at={scene('dead') + 4} len={len} dim={.7} volume={0} /><VosCard len={len} /><Flash /></>],
  // 3. title
  [S.title, S.how, len => <><Footage at={scene('final') + 1} len={len} zoom={[1.3, 1.2]} dim={.62} volume={0} /><AbsoluteFill style={{ justifyContent: 'center' }}><Logo size={300} /></AbsoluteFill><Sequence from={B(1.5)}><Caption text="BRING DEAD WORLDS BACK TO LIFE" len={len - B(1.5)} color={C.sun} size={66} at="low" /></Sequence><Flash len={10} /></>],
  // 4. how you do it
  [S.how, 42, clip(scene('tap'), 'TAP TO PULL LIFE FROM THE ROCK', { zoom: [1, 1.06] })],
  [42, 48, clip(scene('unlock'), 'BUILD MACHINES', { volume: .6 })],
  [48, 50, clip(weapon(0) - .15, 'CRACK THE CRUST', { volume: .7 })],
  [50, 52, clip(weapon(1) - .15, 'WARM THE ICE', { volume: .7 })],
  [52, 54, clip(weapon(2) - .15, 'SEED THE SOIL', { volume: .7 })],
  [54, 56, clip(weapon(3) - .15, 'FILL THE OCEANS', { volume: .7 })],
  [56, 58, clip(weapon(4) - .15, 'PLANT THE FIRST FORESTS', { volume: .7 })],
  [58, 60, clip(weapon(5) - .15, 'POWER THE CORE', { volume: .7 })],
  [60, S.alive, clip(scene('barrage'), 'THEY KEEP WORKING WHILE YOU SLEEP', { zoom: [1, 1.1], volume: .45 })],
  // 5. the planet comes alive
  [S.alive, 76, clip(scene('alive'), 'WATCH IT COME ALIVE', { zoom: [1, 1.04], volume: .4 })],
  [76, S.warp, clip(scene('alive') + 4, 'OCEANS. CLOUDS. A MOON. RINGS.', { zoom: [1.04, 1.1], volume: .4 }, false)],
  // 6. the warp
  [S.warp, S.worlds, clip(scene('warp') - .1, 'THEN WARP TO THE NEXT WORLD', { volume: .7 })],
  // 7. every planet, dead to alive
  ...[0, 1, 2, 3, 4].map((w): Part => [S.worlds + w * 4, S.worlds + w * 4 + 4, len => <><Footage at={world(w, 'heal') - .5} len={len} zoom={[1.15, 1.02]} volume={.3} /><WorldTag w={w} len={len} /><Flash /></>]),
  // 8. the arsenal
  [S.arsenal, 114, len => <><Arsenal len={len} /><Flash /></>],
  [114, 117, clip(weapon(5, 1) - .4, 'ANTIMATTER.', { volume: .8, zoom: [1, 1.08] })],
  [117, S.talents, clip(scene('newarsenal'), 'LIGHTNING. RAILGUNS. LAVA.', { volume: .6, punch: true })],
  // 9. the talent map
  [S.talents, 126, clip(scene('talents') + .2, 'EVERY WORLD YOU SAVE EARNS A STAR SEED', { rate: 1.5, volume: .5 })],
  [126, S.climax, clip(scene('talents') + 4.7, 'SPEND THEM. SHAPE YOUR BUILD.', { rate: 1.5, volume: .5 }, false)],
  // 10. climax: a cut on every second beat, a word on every fourth
  ...[[scene('climax'), 'IDLE.'], [scene('newarsenal') + 1, ''], [scene('climax') + 1.5, 'UNSTOPPABLE.'], [scene('barrage') + .4, ''], [scene('climax') + 3, 'OFFLINE.'], [weapon(5, 1) - .2, ''], [scene('climax') + 4.5, 'ALIVE.'], [scene('climax') + 5.3, '']]
    .map(([at, word], i): Part => [S.climax + i * 2, S.climax + i * 2 + 2, len => <><Footage at={at as number} len={len} zoom={[1.08, 1.0]} volume={.7} punch />{word && <Caption text={word as string} len={len * 2} at="mid" size={170} type={false} slam />}<Flash len={5} /></>]),
  // 11. end card
  [S.end, S.out, len => <><Footage at={scene('final')} len={len} zoom={[1.25, 1]} dim={.45} volume={.25} /><EndCard len={len} /><Flash len={12} /></>],
]

export const Trailer: React.FC = () => (
  <AbsoluteFill style={{ background: C.night }}>
    <Audio src={staticFile('music.wav')} />
    {PARTS.map(([a, b, content], i) => <Sequence key={i} from={B(a)} durationInFrames={B(b) - B(a)}>{content(B(b) - B(a))}</Sequence>)}
    <Scanlines />
  </AbsoluteFill>
)
