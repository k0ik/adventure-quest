import type { PaletteKey } from '../../art/palette';

/**
 * Visual definition of an upright animal resident. This is presentation only: identity,
 * quest role and location live elsewhere, so changing a coat or ear shape never changes
 * game behaviour. All lengths in metres; the character faces +Z.
 */
export interface AnimalSpec {
  id: string;
  fur: {
    main: PaletteKey;
    light: PaletteKey;
    inner: PaletteKey;
    nose: PaletteKey;
    /** Optional different colour for arms and legs (e.g. a badger's dark limbs). */
    limbs?: PaletteKey;
    /** Optional colour for paws and feet (defaults to `light`). */
    paws?: PaletteKey;
  };
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
    /**
     * Optional lofted head: cross-section rings from the back of the skull (negative `at`)
     * to the nose (positive `at`), all in units of `radius`. Replaces the sphere skull,
     * cheeks and muzzle with one economical faceted form.
     */
    profile?: {
      rings: { at: number; w: number; h: number; c: number }[];
      /** How strongly the muzzle and chin are tinted toward the light fur (0..1). Keep subtle. */
      muzzleTint: number;
      /** Where the ears sit along the head (in radius units). */
      earAt: number;
      /** Base colour of the head if it differs from the body fur. */
      base?: PaletteKey;
      /**
       * Facial markings, first match wins. Coordinates in radius units: `absX` is distance from
       * the midline, `at` is position along the head (back → nose), `up` is height within the
       * local cross-section (−1 jaw … +1 crown).
       */
      paint?: { colour: PaletteKey; absX?: [number, number]; at?: [number, number]; up?: [number, number] }[];
    };
  };
  /** Sphere heads use spacing/height; lofted heads use `at` (along the head) and `angle` (up from the side). */
  eyes: { spacing: number; height: number; size: number; at?: number; angle?: number; colour?: PaletteKey; rim?: PaletteKey };
  ears: {
    kind: 'long' | 'round' | 'pointed';
    length: number;
    width: number;
    splay: number; // outward angle, radians
    tilt: number; // backward lean, radians
    droop?: { side: 'left' | 'right'; angle: number; at: number }; // folded tip
    /** Ear colour if it differs from the head; how far apart (fraction of head width, default 0.42). */
    colour?: PaletteKey;
    spread?: number;
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
  | { kind: 'scarf'; colour: PaletteKey; trim?: PaletteKey }
  /** Open-fronted waistcoat over the torso, with buttons down each front edge. */
  | { kind: 'waistcoat'; colour: PaletteKey; buttons: PaletteKey; length: number }
  /** Flat cap with a short brim, worn on the crown between the ears. */
  | { kind: 'cap'; colour: PaletteKey; band?: PaletteKey; tilt?: number };

export interface OutfitSpec {
  garments: GarmentSpec[];
}

export type AccessorySpec =
  | { kind: 'teacup'; hand: 'left' | 'right'; colour: PaletteKey; band: PaletteKey }
  /** Walking staff standing on the ground, gripped by one hand. */
  | { kind: 'staff'; hand: 'left' | 'right'; colour: PaletteKey; knob: PaletteKey; extra: number }
  /** Satchel on one hip with a strap across the chest. */
  | { kind: 'satchel'; side: 'left' | 'right'; colour: PaletteKey; strap: PaletteKey; buckle: PaletteKey };

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
