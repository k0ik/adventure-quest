# Forest Adventure (working title)

A browser-based 3D woodland adventure built from procedural low-poly geometry.

**Current stage: Stage 1, static visual study. Awaiting creator review.**

## Run it
```bash
npm install
npm run dev
```
Open the printed local URL. Buttons in the panel switch between **Overall**, **Character** and
**Free look** (drag to orbit). Add `?view=character&ui=0` to the URL to open a view directly with
no panel.

## Project layout
- `src/art/`: palette, shared materials and geometry, seeded RNG.
- `src/builders/`: reusable procedural builders (tree, ground, rock, lantern, mushrooms, backdrop,
  and `animal/` for joint-hierarchy residents with outfits and accessories).
- `src/content/`: authored data (resident identities, visual definitions, study placements),
  kept separate from the builders.
- `src/study/`: the Stage 1 viewer.
- `docs/`: art-direction note, story decisions, stage renders.

## Re-render the study views
With the dev server running:
```bash
node scripts/screenshots.mjs http://localhost:5173/ docs/stage1 2
```
