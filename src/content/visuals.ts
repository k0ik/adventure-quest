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
        scale: [1.06, 0.96, 0.94],
        cheeks: 0.85,
        mask: 1,
        muzzle: { length: 0.02, width: 0.05, height: 0.035, drop: 0.04 },
        noseSize: 0.022,
      },
      eyes: { spacing: 0.088, height: 0.035, size: 0.04 },
      ears: { kind: 'long', length: 0.34, width: 0.06, splay: 0.16, tilt: 0.1, droop: { side: 'left', angle: 1.25, at: 0.5 } },
      arms: { upper: 0.12, lower: 0.11, thickness: 0.042, paw: 0.045 },
      legs: { thickness: 0.05, haunch: 0.11, foot: { length: 0.22, width: 0.07, height: 0.055 } },
      tail: { kind: 'puff', size: 0.07 },
      bellyPatch: 1,
      stance: { lean: 0.04 },
    },
    outfit: {
      garments: [
        { kind: 'jumper', colour: 'clothBrick', trim: 'clothMustard', length: 0.5, sleeves: 'long' },
        { kind: 'apron', colour: 'clothSage', trim: 'clothCream', pocket: true, length: 0.14 },
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
