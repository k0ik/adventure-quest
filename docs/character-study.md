# Character study (Stage 2, awaiting review)

Rabbit (Clover Thimblewick, tea-room keeper) and Badger (Bertram Holloway, trail-lodge keeper),
side by side in the sunlit part of the approved woodland clearing. The front, three-quarter
and side views turn the characters in place under a fixed camera, so lighting stays the same
for both.

## Badger
- **Silhouette:** low, broad and stocky: wide hips and chest, short dark legs, a forward hunch,
  head carried slightly low. The lofted head is a flat-topped wedge with a long tapering snout.
  It is clearly different from Rabbit's tall ears and rounded skull.
- **Markings:** a white head with a broad white crown stripe and dark bands running from the snout
  through the eyes to small round dark ears. Grey at the nape and body, dark limbs and paws.
  The dark eyes have a subtle rim so they still read against the dark band.
- **Clothing:** a cream shirt, a fitted moss-green waistcoat with brass buttons, and a tweed flat cap.
- **Props:** a walking staff planted on the ground in his left paw, and a leather satchel on his
  right hip with its strap across his chest.

## Construction changes
- Torso garments (Rabbit's jumper, Badger's shirt and waistcoat) are now single fitted shells
  that follow the body from hem to neck, which removes the earlier hourglass pinch.
- Faces support data-driven markings (`head.profile.paint`). Limbs and paws can take their own
  colours.

## Motion (runnable on the study page)
Programmed motions are defined once in `src/anim/animator.ts`. Each character's
amplitudes and timing live with its visual definition (`motion` in `src/content/visuals.ts`).

| Motion | Rabbit | Badger |
|---|---|---|
| Breathing | quicker (24/min) | slow and deep (14/min) |
| Look around / look at viewer | quick, wide range | slower, narrower |
| Gesture | waves with the free left arm | points ahead along the trail with the free right arm |
| Ears & tail | frequent ear twitches, lively tail | rare twitches, small tail movement |

Motion is reduced by half when the browser requests reduced motion.

## Review questions
1. Does Badger read immediately as a badger, and as a distinct character from Rabbit?
2. Do the clothes and props suggest his trade (an outdoors trail keeper)?
3. Do the breathing, head turns and gestures feel alive without being busy? Is the speed right for each?
4. Any clipping you notice where joints or clothing meet during motion?

## Revision 1 (after creator feedback)
Approved: Badger's design, both outfits, Badger's motion speed, breathing and ear/tail motion.

- **Arm clearance:** relaxed arms now splay outward just enough to clear the widest part of the
  body and clothing below the shoulder (`restingArmAngle`). Badger's arm no longer sinks into his
  waistcoat. This applies automatically to every resident.
- **Clover is twitchier:** ear flicks are about 2.5 times as frequent, glances are quicker and dart
  more often (`look.pace`), and her breathing is slightly faster.
- **Controls:** breathing and ear/tail motion always run. Looking is a single choice between
  "Look around" and "Look at me".
