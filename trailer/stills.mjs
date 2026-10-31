// Renders a few frames of each trailer as PNGs (node stills.mjs Wide 30,500,...), to check the edit without a full render.
import path from 'node:path'
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'
const [id, list] = process.argv.slice(2)
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('out') })
const composition = await selectComposition({ serveUrl, id })
for (const frame of list.split(',').map(Number)) {
  await renderStill({ composition, serveUrl, frame, output: path.resolve(`../.playwright-mcp/still-${id}-${frame}.png`), scale: .5 })
  console.log('frame', frame)
}
