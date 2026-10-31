// Plays a scripted tour of Terraform for the trailer: the dead world, the commander's story, tapping, unlocking every system,
// a planet coming alive, the warp, the new arsenal, every planet from dead to alive, the talent map and a final barrage.
// Each scene is marked on the timeline ({ type: 'scene', name }) so the edit finds it by what happened, not by time.
import fs from 'node:fs'
import path from 'node:path'

const W = 1280, H = 720, FRAME = 1000 / 30
// cine: no HUD at all (clean shots of the planet); story: no HUD but the commander stays
const CSS = `body.cine #top, body.cine #side, body.cine #bar, body.cine #toast, body.cine #prev, body.cine #next, body.cine #panel, body.cine #guide,
  body.story #top, body.story #side, body.story #bar, body.story #toast { visibility: hidden !important; }`

export async function setup({ page, url }) {
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('terraform-sound', JSON.stringify({ sfx: true, music: false })) }) // the trailer brings its own music
  await page.goto(url + '?reset', { waitUntil: 'networkidle0' })
  await page.addStyleTag({ content: CSS })
  await page.evaluate(() => { S.intro = true; S.taps = 1; clearInterval(gTimer); document.getElementById('guide').hidden = true })
  // the art the edit shows on its own cards: the commander, every machine, the tap hand
  const art = await page.evaluate(() => ({ vos: FACE[0], hand: T.hand.toDataURL(), sprites: Object.keys(CATALOG).map(id => ({ id, name: CATALOG[id].name, src: TILE[id].lit })) }))
  const dir = path.join(process.env.TRAILER_OUT, 'art')
  fs.mkdirSync(dir, { recursive: true })
  const png = (file, url) => fs.writeFileSync(path.join(dir, file), Buffer.from(url.split(',')[1], 'base64'))
  png('vos.png', art.vos); png('hand.png', art.hand)
  for (const s of art.sprites) png(s.id + '.png', s.src)
  fs.writeFileSync(path.join(dir, 'sprites.json'), JSON.stringify(art.sprites.map(({ id, name }) => ({ id, name }))))
}

export async function play({ page, wait, mark }) {
  const ev = (fn, arg) => page.evaluate(fn, arg)
  const scene = name => mark('scene', { name })
  // a visible finger: eases to the spot, presses, releases (the edit draws it from these marks)
  let finger = { x: W * .62, y: H * 1.05 }
  const point = async (x, y, down) => { finger = { x, y }; await page.mouse.move(x, y); await mark('finger', { x, y, down }) }
  async function tapAt(x, y) {
    for (let i = 1; i <= 8; i++) { const e = 1 - (1 - i / 8) ** 3; await point(finger.x + (x - finger.x) * e, finger.y + (y - finger.y) * e, false); await wait(FRAME) }
    await page.mouse.down(); await mark('press', { x, y }); await wait(70); await page.mouse.up(); await mark('release', { x, y })
  }
  const center = sel => page.$eval(sel, el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2] })
  const tap = async sel => tapAt(...await center(sel))
  const planet = () => ev(() => { const [ox, oy] = camOrigin(); return [(ox + CX * cam.z) * PX, (oy + CY * cam.z) * PX, R * cam.z * PX] })
  // cine also hides what the game draws on the canvas over the scene: level labels, price tags and the income pop-ups
  const mode = m => ev(m => {
    document.body.classList.toggle('cine', m === 'cine'); document.body.classList.toggle('story', m === 'story')
    window.__orig ??= { drawMarks, text }
    drawMarks = m === 'cine' ? () => {} : __orig.drawMarks
    text = m === 'cine' ? () => {} : __orig.text
  }, m)
  // heal smoothly from h0 to h1 over ms (heal is log-scale in life earned, so set the earned total for each heal level)
  async function heal(h0, h1, ms) {
    await ev(({ h0, h1, ms }) => {
      const at = h => 1000 * ((1 + GOAL / 1000) ** h - 1), t0 = performance.now()
      const id = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / ms), e = k * k * (3 - 2 * k); S.earned = Math.max(S.earned, at(h0 + (h1 - h0) * e)); if (k >= 1) clearInterval(id) }, 16)
    }, { h0, h1, ms })
    await wait(ms + 60)
  }
  // a fresh world with every system online and busy; done: no warp dialog; stage 3: no milestone pop-ups
  const setWorld = w => ev(w => {
    closePanel(); S.world = w; setLoadout(w); buildWorld(); resize()
    Object.assign(S, { life: 0, earned: 0, goal: 1, done: true, on: SYS.map(() => true), L: SYS.map(() => [25, 10, 5]) })
    items.length = 0; stage = 3; zoom = 1
  }, w)
  const barrage = () => ev(() => SYS.forEach((_, s) => S.on[s] && fire(s, true)))

  await page.mouse.click(W - 30, 110) // a gesture wakes the game's audio; empty sky, so nothing happens in the game
  await page.mouse.move(W * .62, H * 1.05)

  // 1. the dead world, nothing on screen but the planet
  await mode('cine'); await ev(() => { S.done = true })
  await scene('dead'); await wait(6500)

  // 2. Commander Vos tells the story
  await mode('story')
  await scene('commander')
  await ev(() => guide([
    { text: 'Engineer. Earth ran out of room a long time ago.' },
    { text: 'Out here at the edge of the map: five dead worlds. No air. No water. No life.' },
    { text: 'Terraform Corps is going to bring them back to life. And you are going to lead it.' },
  ]))
  for (let i = 0; i < 3; i++) { await wait(3000); await mark('line', { i }); if (i < 2) await tap('#gbubble') }
  await wait(600)
  await ev(() => { gi = gLines.length - 1; nextLine() })

  // 3. tap the planet
  await mode(''); await ev(() => { S.done = false; S.taps = 0; S.goal = 0 })
  await scene('tap')
  for (let i = 0; i < 11; i++) { const [x, y, r] = await planet(); await tapAt(x + (Math.random() - .4) * r * .8, y - r * (.15 + Math.random() * .5)) }
  await wait(300)

  // 4. unlock the first system: the camera glides onto it
  await ev(() => { S.life = 600 })
  await scene('unlock')
  await tap('#bar .tile'); await wait(700)
  await tap('#prows .row .buy'); await mark('weapon', { s: 0 }); await wait(700)
  for (let i = 0; i < 3; i++) { await tap('#prows .row:nth-child(2) .buy'); await wait(150) }
  await wait(500)

  // 5. every other system, one by one
  await ev(() => { S.life = 1e12 })
  for (let s = 1; s < 6; s++) {
    await tap('#next'); await wait(650)
    await tap('#prows .row .buy'); await mark('weapon', { s }); await wait(900)
  }
  await ev(() => S.L.forEach(L => { L[0] = 25 }))
  await tap('#pclose')
  await scene('barrage'); await barrage(); await wait(1200); await barrage(); await wait(2600)

  // 6. the planet comes alive (HUD on: the terraformed bar climbs), then the warp
  await ev(() => { S.done = true })
  await scene('alive')
  await heal(await ev(() => healOf(S.earned)), .995, 8000)
  await ev(() => { S.done = false; S.earned = GOAL })
  await scene('warpdialog'); await wait(1600)
  await tap('#warpbtn'); await scene('warp'); await wait(3200)
  await tap('#gskip')

  // 7. the next world brings new machines: unlock the antimatter reactor with the camera on it
  await ev(() => { S.life = 1e14; S.on = [true, true, true, true, true, false]; S.L.forEach(L => { L[0] = 25 }) })
  await wait(400)
  await tap('#bar .tile:nth-child(6)'); await wait(700)
  await tap('#prows .row .buy'); await mark('weapon', { s: 5, world: 1 }); await wait(1300)
  await tap('#pclose')
  await scene('newarsenal'); await barrage(); await wait(1400); await barrage(); await wait(2600)

  // 8. every planet from dead to alive
  await mode('cine')
  for (let w = 0; w < 5; w++) {
    await setWorld(w)
    await mark('world', { w, phase: 'dead' }); await wait(1200)
    await mark('world', { w, phase: 'heal' }); await heal(0, 1, 2200)
    await mark('world', { w, phase: 'alive' }); await wait(1000)
  }

  // 9. the talent map
  await setWorld(1); await heal(0, .6, 100)
  await mode(''); await ev(() => { S.seeds = 9; S.tal = []; updateUI() })
  await scene('talents')
  await tap('#ttile'); await wait(800)
  for (const id of ['spark', 'roots', 'lens', 'swarm', 'crit', 'autotap', 'bloom', 'grow', 'echo']) {
    await tapAt(...await ev(id => { const r = talById[id].el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2] }, id))
    await tap('#tbuy'); await wait(200)
  }
  await wait(900)
  await tap('#tclose')

  // 10. the barrage: every machine at once on the mixed world
  await mode('cine'); await setWorld(2); await heal(0, .97, 100)
  await scene('climax')
  for (let i = 0; i < 12; i++) { await barrage(); await wait(500) }

  // 11. the final shot: the first world alive, with moon, clouds and rings
  await setWorld(0); await heal(0, 1, 100)
  await scene('final'); await wait(9000)
  await mark('end')
}
