import type { AccessorySpec, AnimalSpec, OutfitSpec, Pose } from '../builders/animal/types';
import type { MotionConfig } from '../anim/animator';

/**
 * Authored visual definitions for residents. Presentation only: identity and quest role are
 * defined in residents.ts and reference these by ID.
 */
export interface ResidentVisual {
  body: AnimalSpec;
  outfit: OutfitSpec;
  accessories: AccessorySpec[];
  restPose: Pose;
  motion: MotionConfig;
}

export const visuals: Record<string, ResidentVisual> = {
  'rabbit-clover': {
    body: {
      id: 'rabbit-clover',
      fur: { main: 'furRabbit', light: 'furRabbitLight', inner: 'furRabbitInner', nose: 'nose' },
      body: { hipHeight: 0.2, hipWidth: 0.19, torsoLength: 0.36, chestWidth: 0.15, depth: 0.16, belly: 0.6 },
      head: {
        radius: 0.205,
        scale: [1, 1, 1],
        cheeks: 0,
        muzzle: { length: 0, width: 0, height: 0, drop: 0 },
        noseSize: 0.022,
        profile: {
          // Back of skull → nose. Broad cranium and cheeks, tapering to a blunt snout.
          rings: [
            { at: -0.85, w: 0.5, h: 0.55, c: 0.1 },
            { at: -0.55, w: 0.82, h: 0.82, c: 0.08 },
            { at: -0.1, w: 0.96, h: 0.9, c: 0.02 },
            { at: 0.3, w: 0.9, h: 0.78, c: -0.06 },
            { at: 0.62, w: 0.7, h: 0.6, c: -0.17 },
            { at: 0.88, w: 0.5, h: 0.42, c: -0.24 },
            { at: 1.0, w: 0.32, h: 0.28, c: -0.24 },
          ],
          muzzleTint: 0.28,
          earAt: -0.35,
        },
      },
      eyes: { spacing: 0, height: 0, size: 0.04, at: 0.38, angle: 0.45 },
      ears: { kind: 'long', length: 0.34, width: 0.075, splay: 0.16, tilt: 0.12, droop: { side: 'left', angle: 1.25, at: 0.5 } },
      arms: { upper: 0.12, lower: 0.11, thickness: 0.042, paw: 0.045 },
      legs: { thickness: 0.05, haunch: 0.11, foot: { length: 0.22, width: 0.07, height: 0.055 } },
      tail: { kind: 'puff', size: 0.07 },
      bellyPatch: 1,
      stance: { lean: 0.04 },
    },
    outfit: {
      garments: [
        { kind: 'jumper', colour: 'clothBrick', trim: 'clothMustard', length: 0.5, sleeves: 'long' },
        { kind: 'apron', colour: 'clothSage', trim: 'clothCream', pocket: true, length: 0.15 },
      ],
    },
    accessories: [{ kind: 'teacup', hand: 'right', colour: 'clothCream', band: 'clothTeal' }],
    restPose: {
      shoulderR: [-0.3, 0, 0.1],
      elbowR: [-1.25, 0.15, 0],
      handR: [1.55, 0, 0],
      shoulderL: [0.05, 0, 0.05],
      elbowL: [-0.25, 0, 0],
      head: [0.06, 0.18, 0.07],
    },
    // Quick, light and attentive.
    motion: {
      breath: { perMinute: 24, amount: 1 },
      look: { maxYaw: 0.85, maxPitch: 0.45, speed: 3.2, idle: 0.35 },
      gesture: { kind: 'wave', arm: 'L', duration: 2.6 },
      ears: { twitchesPerMinute: 9, amount: 0.28 },
      tail: { wagsPerSecond: 2.2, amount: 0.25 },
    },
  },
  'badger-bertram': {
    body: {
      id: 'badger-bertram',
      fur: { main: 'furBadger', light: 'furBadgerWhite', inner: 'furBadgerWhite', nose: 'furBadgerDark', limbs: 'furBadgerDark', paws: 'furBadgerDark' },
      // Low, broad and stocky: wide hips and chest, short sturdy legs, a forward hunch.
      body: { hipHeight: 0.19, hipWidth: 0.27, torsoLength: 0.42, chestWidth: 0.23, depth: 0.21, belly: 0.75 },
      head: {
        radius: 0.19,
        scale: [1, 1, 1],
        cheeks: 0,
        muzzle: { length: 0, width: 0, height: 0, drop: 0 },
        noseSize: 0.026,
        profile: {
          // Flat-topped wedge with a long tapering snout.
          rings: [
            { at: -0.8, w: 0.55, h: 0.5, c: 0.05 },
            { at: -0.45, w: 0.86, h: 0.7, c: 0.05 },
            { at: 0.0, w: 0.93, h: 0.66, c: 0.0 },
            { at: 0.4, w: 0.74, h: 0.52, c: -0.08 },
            { at: 0.8, w: 0.44, h: 0.35, c: -0.16 },
            { at: 1.15, w: 0.24, h: 0.21, c: -0.2 },
            { at: 1.3, w: 0.15, h: 0.14, c: -0.18 },
          ],
          muzzleTint: 0,
          earAt: -0.5,
          base: 'furBadgerWhite',
          // White head, dark bands from snout through the eyes to the ears, grey at the nape.
          paint: [
            { colour: 'furBadger', at: [-2, -0.62] },
            // Two dark bands either side of a broad white crown stripe, running nose → eye → ear.
            { colour: 'furBadgerDark', absX: [0.28, 0.66], up: [-0.15, 2], at: [-0.62, 1.12] },
          ],
        },
      },
      eyes: { spacing: 0, height: 0, size: 0.024, at: 0.32, angle: 0.55, rim: 'eyeRimDark' },
      ears: { kind: 'round', length: 0.042, width: 0.04, splay: 0.6, tilt: 0.3, colour: 'furBadgerDark', spread: 0.74 },
      arms: { upper: 0.13, lower: 0.12, thickness: 0.055, paw: 0.052 },
      legs: { thickness: 0.062, haunch: 0.13, foot: { length: 0.17, width: 0.075, height: 0.055 } },
      tail: { kind: 'stub', size: 0.06 },
      stance: { lean: 0.09 },
    },
    outfit: {
      garments: [
        { kind: 'jumper', colour: 'clothCream', trim: 'clothCream', length: 0.55, sleeves: 'long' },
        { kind: 'waistcoat', colour: 'clothMoss', buttons: 'brass', length: 0.55 },
        { kind: 'cap', colour: 'clothTweed', band: 'leatherDark', tilt: 0.08 },
      ],
    },
    accessories: [
      { kind: 'satchel', side: 'right', colour: 'leather', strap: 'leatherDark', buckle: 'brass' },
      { kind: 'staff', hand: 'left', colour: 'timber', knob: 'timberDark', extra: 0.3 },
    ],
    restPose: {
      shoulderL: [-0.45, 0, 0.12],
      elbowL: [-0.85, 0, 0],
      head: [0.14, -0.12, 0],
    },
    // Slow, steady and deliberate.
    motion: {
      breath: { perMinute: 14, amount: 1.4 },
      look: { maxYaw: 0.65, maxPitch: 0.35, speed: 1.8, idle: 0.22 },
      gesture: { kind: 'point', arm: 'R', duration: 2.4 },
      ears: { twitchesPerMinute: 3, amount: 0.18 },
      tail: { wagsPerSecond: 1.2, amount: 0.15 },
    },
  },
};
