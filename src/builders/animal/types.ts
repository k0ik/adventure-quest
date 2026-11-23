import type { PaletteKey } from '../../art/palette';

/**
 * Visual definition of an upright animal resident. This is presentation only: identity,
 * quest role and location live elsewhere, so changing a coat or ear shape never changes
 * game behaviour. All lengths in metres; the character faces +Z.
 */
export interface AnimalSpec {
  id: string;
  fur: { main: PaletteKey; light: PaletteKey; inner: PaletteKey; nose: PaletteKey };
  body: {
    hipHeight: number; // height of the hip joint above the ground
    hipWidth: number; // half-width of the haunches
    torsoLength: number; // hips to neck
    chestWidth: number; // half-width at chest
    depth: number; // half-depth front-to-back
    belly: number; // 0..1 extra roundness low on the torso
  };
  head: {
    radius: number;
    scale: [number, number, number];
    cheeks: number; // 0 none .. 1 full puffy cheeks
    /** Pale face blaze over the lower front of the face (two-tone marking), 0 = none. */
    mask?: number;
    muzzle: { length: number; width: number; height: number; drop: number };
    noseSize: number;
  };
  eyes: { spacing: number; height: number; size: number };
  ears: {
    kind: 'long' | 'round' | 'pointed';
    length: number;
    width: number;
    splay: number; // outward angle, radians
    tilt: number; // backward lean, radians
    droop?: { side: 'left' | 'right'; angle: number; at: number }; // folded tip
  };
  arms: { upper: number; lower: number; thickness: number; paw: number };
  legs: { thickness: number; haunch: number; foot: { length: number; width: number; height: number } };
  tail: { kind: 'puff' | 'brush' | 'stub'; size: number };
  /** Pale belly patch on the front of the torso, 0 = none. */
  bellyPatch?: number;
  stance?: { lean: number }; // slight forward lean of the spine
}

export type GarmentSpec =
  | { kind: 'jumper'; colour: PaletteKey; trim: PaletteKey; length: number; sleeves: 'long' | 'short' }
  | { kind: 'apron'; colour: PaletteKey; trim?: PaletteKey; pocket?: boolean; length: number }
  | { kind: 'collar'; colour: PaletteKey }
  | { kind: 'scarf'; colour: PaletteKey; trim?: PaletteKey };

export interface OutfitSpec {
  garments: GarmentSpec[];
}

export type AccessorySpec = { kind: 'teacup'; hand: 'left' | 'right'; colour: PaletteKey; band: PaletteKey };

/** Named joints exposed for later animation (breathing, head turns, gestures, tail). */
export type JointName =
  | 'root' | 'hips' | 'spine' | 'chest' | 'neck' | 'head'
  | 'earL' | 'earR' | 'earTipL' | 'earTipR'
  | 'shoulderL' | 'shoulderR' | 'elbowL' | 'elbowR' | 'handL' | 'handR'
  | 'legL' | 'legR' | 'footL' | 'footR' | 'tail';

export interface Pose {
  /** Euler rotations (radians) applied to named joints for the resting pose. */
  [joint: string]: [number, number, number];
}

export interface AnimalRig {
  object: import('three').Group;
  joints: Record<JointName, import('three').Object3D>;
}
