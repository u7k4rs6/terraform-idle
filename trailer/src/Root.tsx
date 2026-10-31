import React from 'react'
import { Composition } from 'remotion'
import { Trailer } from './Trailer'
import { Thumbnail } from './Thumbnail'
import { FPS, S, frames } from './plan.mjs'

// the kit renders both: Wide (YouTube, itch.io) and Tall (TikTok, Reels, Shorts)
export const Root = () => (
  <>
    <Composition id="Wide" component={Trailer} width={1920} height={1080} fps={FPS} durationInFrames={frames(S.out)} />
    <Composition id="Tall" component={Trailer} width={1080} height={1920} fps={FPS} durationInFrames={frames(S.out)} />
    {/* key art: itch.io cover (2x of 630x500) and YouTube thumbnail */}
    <Composition id="Cover" component={Thumbnail} width={1260} height={1000} fps={FPS} durationInFrames={1} />
    <Composition id="Thumb" component={Thumbnail} width={1280} height={720} fps={FPS} durationInFrames={1} />
  </>
)
