import type { AccessorySpec, AnimalSpec, OutfitSpec, Pose } from '../builders/animal/types';

/**
 * Authored visual definitions for residents. Presentation only: identity and quest role are
 * defined in residents.ts and reference these by ID.
 */
export interface ResidentVisual {
  body: AnimalSpec;
  outfit: OutfitSpec;
  accessories: AccessorySpec[];
  restPose: Pose;
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
  },
};
