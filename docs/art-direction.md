# Art direction note (Stage 1, awaiting review)

Translated from the creator's reference images (five environment images and five character
images) and the Richard Scarry / Wildwood touchstones. These are proposals, not approved style rules.

## What the references share
- **Environment:** flat-shaded low-poly. Tree crowns are a few large faceted lobes on visible,
  chunky branches. Trunks are thick and warm. There are lanterns on wooden posts, mossy-topped
  boulders, tall flat grass blades gathered at the bases of objects, worn dirt paths, toadstools
  and pale mushrooms, and strong layered haze in the distance (atmospheric perspective).
- **Characters:** chibi proportions, with the head about 40–50% of standing height. Stubby torsos,
  short limbs, big feet. Large glossy dark eyes with a catch-light. Two-tone fur markings: a pale
  face blaze and belly. Big ears with pink linings. Simple faceted clothing: overalls, belts with
  pouches, a capelet. Mouths are mostly absent or minimal.

## Choices made for the study
| Area | Choice |
|---|---|
| Proportions | Rabbit stands about 1.15 m to the ear tips. The head is about 0.4 m, so the head-to-body ratio is about 1:1.5 (chibi). A human player at 1.6 m eye height sees residents as small but not tiny. |
| Silhouette | Each species is defined by ears, head shape, muzzle, tail and stance, not by colour. Rabbit has long ears with one flopped tip, round cheeks and a puff tail. |
| Faces | Mouthless. Bead eyes with a catch-light. A pale whisker-pad blaze. A small glossy nose. |
| Palette | Saturated but warm greens. Tan-orange bark. Brick, mustard, sage, teal and cream cloth. Peach horizon fading to dusty violet at the top of the sky. All colours live in `src/art/palette.ts`. |
| Materials | Every surface is flat-shaded and matte. Gloss only on eyes, nose, china and mushroom caps. No textures; colour comes from per-face vertex colours. |
| Lighting | Late afternoon, just before sunset. A low golden sun from the side-front casts long shadows. A cool lavender sky fill keeps shadowed sides readable. One shadow-casting light. The lantern is lit faintly, ready for evening. |
| Detail density | Large forms first. Small detail (grass, fallen leaves, mushrooms) clusters at the bases of objects rather than spreading evenly. |
| Clothing | Rabbit (a tea-room keeper) wears a knitted brick jumper with mustard trim, a sage apron with a pocket, and holds a teacup. The cup is the environmental hint that her kettle is missing. |

## Assumptions to confirm
- The chibi head ratio is taken from the character references. Richard Scarry characters are
  closer to 1:2.5. This is the biggest judgement call in the study.
- Two references use painterly, non-faceted surfaces (the stream and the cat). I've followed the
  faceted majority.
- The hills backdrop is a placeholder for depth. Real clearings will be enclosed by forest.
