# Interaction sample (Stage 3, awaiting review)

Two locations on one continuous terrain, the Campfire and the Village Oak, joined by one
authored trail. You start at the campfire, travel to the Village Oak, talk to Clover and
Bertram, and walk back.

## How it plays
- **Reading and choosing:** each arrival shows a short passage and 2–3 numbered choices.
  Click them or press 1–3. Dialogue uses the same panel and names the speaker. A resident
  you're talking to turns to look at you, and Bertram points up the trail when he mentions the
  lodge. Names stay "the rabbit" and "the badger" until you've met them.
- **Looking around:** drag (mouse, pen or touch) or use the arrow keys. **C** or the Recentre
  button eases back to the location's composed view. There is no pointer lock.
- **Travel:** the camera glides along the trail at eye height (1.6 m) for 4–8 seconds, turns onto
  the path and settles into the arrival view. No head-bob. Other choices are locked while
  travelling. **Skip** (or **S**) arrives immediately.
- **Comfort settings:** reduced motion (a short fade replaces the glide, and characters move at
  half amplitude). Skip journeys: never, paths already walked, or always. Every mode resolves
  through the same arrival code, so the destination state is identical. Settings are kept in
  this browser.
- **Phones:** in portrait each location uses a second composition that keeps residents above
  the story panel.

## New assets (in the approved style)
The great oak with a round door, window and doorstep. Clover's tea table with cups set out
around an empty trivet (her missing kettle). A dwindling campfire with animated flames and
flickering light, its stone ring and a sitting log. The worn trail now follows the authored
route. The surrounding woodland is about 150 trees and 400 bushes, merged into a few meshes.

## Checks (`npm run playtest`, `npm run check:gestures`)
19 automated checks pass, including:
- camera height stays 1.59–1.67 m above the terrain along the whole route, both directions
- nearest scenery to the camera on the route is 0.95 m (no clipping)
- skip mid-journey, reduced-motion and normal travel all arrive at the same place
- double-clicking a journey arrives once. Number keys choose. No console errors.

Gesture check: each resident's gesture arm clears its head throughout (Clover 5.9 cm,
Bertram 12.6 cm). Clover's wave was reshaped after review feedback about the forearm clipping.

## Known limitations
- Rendering cost is about 390 draw calls and 700k triangles per frame. It should be fine on
  desktop GPUs but is unmeasured. Frame rate could not be measured here (software rendering).
  Residents and props are not yet batched.
- No inventory, journal, saving or quest progression. Those are Stage 4. Reloading the page
  starts again.
- The dialogue is sample text written to the settled story decisions, not final script.

## Ambient sound (added after review)
All sound is synthesised with Web Audio (`src/audio/ambience.ts`). There are no audio files.
- **Wind in the leaves:** a low breeze and a leaf rustle that swell together in random gusts.
- **Birdsong:** four made-up songs (falling whistles, rising chirps, a warbling trill, a
  two-note call). Each phrase comes from a random direction, and far birds sound softer and duller.
- **Campfire:** a soft roar and hiss with random crackles and occasional snaps. It is heard
  only within about 11 m, louder as you approach, and panned by where it is relative to your
  view. It is silent at the Village Oak.

Sound starts on the first click or key press. Settings has an on/off switch and a volume
slider, kept in this browser. A browser test confirmed all three layers run with the fire
audible only near the campfire. How it actually sounds needs a listen.
