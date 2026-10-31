// Renders the key art into ../itch/: cover.png (itch.io, 1260x1000) and youtube-thumbnail.jpg (1280x720, under YouTube's 2 MB).
import path from 'node:path'
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('out') })
for (const [id, file, imageFormat] of [['Cover', 'cover.png', 'png'], ['Thumb', 'youtube-thumbnail.jpg', 'jpeg']]) {
  await renderStill({ composition: await selectComposition({ serveUrl, id }), serveUrl, output: path.resolve('../itch', file), imageFormat, ...(imageFormat === 'jpeg' && { jpegQuality: 92 }) })
  console.log('../itch/' + file)
}
