# Terraform

A pixel-art idle game: heal dead alien worlds with lasers, mirrors, drones, comets, antimatter and more, with real space-science facts along the way. Progress keeps counting while the game is closed. Winner, CodeDay Fall 2026 (Bengaluru).

**Play:** https://utkarshbahuguna.me/terraform-idle/ · **itch.io:** https://utkarshbahuguna.itch.io/terraform · **Trailer:** https://youtu.be/UW-W3ORA4IU

![CRIMSON, dead and alive](docs/before-after.jpg)

## How it plays

- Tap the planet for Life, spend it on six systems per world, upgrade them (x1, x10 or MAX at a time) and watch the surface turn from rock to oceans and forests. A moon, clouds and rings arrive at 25%, 50% and 75%.
- Eight worlds, each with its own palette, a trait that changes the economy (orbital or ground systems, taps, goal rewards) and a different set of systems. Every healed world doubles all output for good, hands you a Star Seed for the 20-talent tree, and the goal grows x4, so later worlds are faster but never trivial. After the eighth, the sector is logged with your best times and the cycle restarts.
- Income runs on the wall clock: up to 12 hours (24 with Night Shift) are paid when you come back.
- Keyboard: Enter/Space taps, `1`–`6` open a system, Esc closes. Screen readers get the HUD, panels and the commander's lines.
- Settings (gear in the Life box): music, sound, reduced motion (also follows the system setting), large text, save code export/import, new game. Saves live in the browser only; the code is how you move one between devices.

Installable as a web app and playable offline (manifest + service worker). No dependencies, no build step, no backend: `index.html`, `style.css`, `data.js` (every number and line of text: systems, prices, worlds, goals, briefing), `game.js` (the engine).

Run it locally: serve the folder with any static server, e.g. `python3 -m http.server`, then visit http://localhost:8000. Add `?reset` to the URL to start over.

License: MIT (see LICENSE). The VT323 font is by Peter Hull under the SIL Open Font License (fonts/OFL.txt).

## Trailer

`trailer/` makes the trailer with [trailer-kit](https://github.com/IFAKA/trailer-kit): `driver.mjs` plays a scripted tour of the game, `music.mjs` synthesizes the soundtrack on the beat plan in `src/plan.mjs`, and `src/Trailer.tsx` is the Remotion edit (16:9 and 9:16).
