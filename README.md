# Terraform

A pixel-art idle game: heal dead alien worlds with lasers, mirrors, drones, comets, antimatter and more, with real space-science facts along the way. Progress keeps counting while the game is closed (saved in the browser).

**Play:** https://utkarshbahuguna.me/terraform-idle/ (add `?reset` to start over) · **Trailer:** https://youtu.be/UW-W3ORA4IU

Run it locally: open `index.html` through any static server, e.g. `python3 -m http.server`, then visit http://localhost:8000.

## Trailer

`trailer/` makes the trailer with [trailer-kit](https://github.com/IFAKA/trailer-kit): `driver.mjs` plays a scripted tour of the game, `music.mjs` synthesizes the soundtrack on the beat plan in `src/plan.mjs`, and `src/Trailer.tsx` is the Remotion edit (16:9 and 9:16).
