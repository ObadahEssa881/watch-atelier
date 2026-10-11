# Qasioun Q-01 — a watch you take apart by scrolling

A premium concept site for a fictional mechanical watch, built to show what
three.js, GSAP, Lenis, Tailwind, shadcn/ui and NestJS can do together.

The thesis: *a watch is the only machine that is alive on your wrist — it beats
eight times a second.* So the page beats too. The hands show the visitor's own
time, the seconds hand moves in eight steps a second, and scrolling takes the
calibre apart a layer at a time — caseback, rotor, barrel and mainspring, the
going train, the Swiss lever escapement, the balance and hairspring — each
explained with real horology, before it all goes back together and becomes
yours in the configurator.

> Qasioun (named for the mountain above Damascus) and the Q-01 are fictional.
> The watch's own specifications are plausible but invented; the horology —
> how each part works, the dates, the finishing — is real.

## What is in it

| | |
|---|---|
| **The watch** | Built entirely in code (`web/components/watch/`): a 40 mm case with polished bezel and brushed flanks, box sapphire, sunburst dial with applied indices, faceted dauphine hands, a 28.6 mm calibre — mainplate, Côtes de Genève bridges, gilt wheels with real tooth profiles, barrel with its mainspring, 15-tooth escape wheel, pallet fork with ruby stones, free-sprung balance at 4 Hz with a breathing hairspring, 18k gold rotor, synthetic rubies in gold chatons, heat-blued screws. Every edge is chamfered and mirror-polished (anglage). |
| **Motion that is true** | The train is driven by the escapement: wheels jump eight times a second, the centre wheel turns once an hour, the fourth once a minute. The escapement chapter runs at ⅛ speed; the balance chapter can switch to real 4 Hz. |
| **Sound** | "Hear it" synthesises the tick of a lever escapement with Web Audio — no audio file. |
| **Photography** | A studio built from emissive panels (no HDRI download), ground-truth AO, macro depth of field, Neutral tone mapping so gold stays gold. |
| **Configurator** | Case, dial, strap and a caseback engraving, all live on the 3D watch; the build lives in the URL, so it is a link you can send. Prices and lead times come from the API. |
| **Reservations** | A shadcn dialog posting to the NestJS API, which prices the build on the server and returns a reference. |
| **Timegrapher** | The watchmaker's instrument, drawn live in the balance chapter: rate, amplitude, beat error. |

## Smooth, and fast on the second visit

- **Finishes are generated in a Web Worker** (Côtes de Genève, perlage, sunburst, brushing, leather, circular graining) so scrolling never stutters while they are made, then **stored in IndexedDB** — a repeat visit decodes them in ~0.3 s instead of regenerating them. (IndexedDB, not localStorage: localStorage holds only ~5 MB of strings and blocks the main thread on every read.)
- **A service worker** (`web/public/sw.js`) keeps the site's files in the browser: hashed scripts, the three.js chunk and fonts cache-first; images stale-while-revalidate; pages network-first with an offline fallback.
- **three.js is its own chunk**, fetched after the page paints; the hero shows a photograph of the first frame meanwhile, and every shader is compiled before the 3D fades in.
- **Adaptive quality**: if frames run long the pixel ratio steps down, then ambient occlusion switches off; with headroom it steps back up. Nothing renders while the tab is hidden or the stage is scrolled away.
- **Lenis** with a slower, heavier glide; GSAP reveals that only animate *to* the visible state.
- **Reduced motion** gets still photographs of every chapter instead of the 3D, and no smooth scroll.

## Layout

```
web/   Next.js 16 · React 19 · Tailwind v4 · shadcn/ui (Radix) · three r186 · GSAP · Lenis
api/   NestJS 11 · class-validator · Swagger (/docs) · rate limiting
```

## Run locally

```bash
cd api && npm install && npm run build && WEB_ORIGIN=http://localhost:3000 PORT=3001 npm start
cd web && npm install && NEXT_PUBLIC_API_URL=http://localhost:3001 npm run dev
```

Checks: `cd web && npm run lint && npm run typecheck && npm run build` · `cd api && npm run typecheck && npm test`

## Deploy on Vercel (two projects from this one repo)

1. **The API** — New Project → import this repo → **Root Directory: `api`**. Vercel detects NestJS
   with no configuration. Add the environment variable `WEB_ORIGIN` = the web project's URL
   (e.g. `https://watch-atelier.vercel.app`) once you know it.
2. **The site** — New Project → import this repo again → **Root Directory: `web`**. Add
   `NEXT_PUBLIC_API_URL` = the API project's URL.

The site works without the API (prices are computed locally and the reservation dialog says the
booking service is offline); with it, prices and reservations come from the server.

Reservations are kept in memory — honest for a concept, and on a serverless host each instance
keeps its own short list. For real bookings, swap `ReservationsService`'s store for Postgres; the
controller and DTOs stay as they are.
