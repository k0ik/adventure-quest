import type { RoutePoints } from '../world/paths';

/**
 * The fixed world for the Stage 3 sample: two locations on one continuous terrain, joined by
 * one authored route. All coordinates are metres in the ground plane (x, z); heights come
 * from the terrain. Stable IDs throughout so later stages and saves can refer to them.
 */
export type LocationId = 'village-oak' | 'campfire';

export interface LocationDef {
  id: LocationId;
  name: string;
  /** Clearing centre and radius (keeps trees out, lightens the ground). */
  clearing: { x: number; z: number; r: number };
  /** Where the player stands on arrival, and the point the composed view looks at. */
  stand: [number, number];
  look: [number, number, number];
  /** Composition for tall (phone) screens, where the story panel covers the lower half. */
  lookPortrait?: [number, number, number];
}

export interface RouteDef {
  id: string;
  /** Travel from `a` to `b` follows the points in order; the reverse trip runs backwards. */
  a: LocationId;
  b: LocationId;
  points: RoutePoints;
}

export const world = {
  id: 'fixed-world-1',
  seed: 'forest-adventure-sample',
  terrain: { radius: 40, relief: 0.24, resolution: 80, trailWidth: 1.15 },
  locations: {
    'village-oak': {
      id: 'village-oak',
      name: 'The Village Oak',
      clearing: { x: 0, z: -0.6, r: 5.6 },
      stand: [0.45, 3.9],
      look: [-0.1, 1.3, -2.2],
      lookPortrait: [1.35, -0.9, -0.4],
    },
    campfire: {
      id: 'campfire',
      name: 'The Campfire',
      clearing: { x: -7.2, z: 21.4, r: 3.8 },
      stand: [-6.0, 18.9],
      look: [-7.4, 0.9, 23.4],
      lookPortrait: [-7.1, -0.55, 22.4],
    },
  } satisfies Record<LocationId, LocationDef>,
  routes: [
    {
      id: 'oak-campfire',
      a: 'village-oak',
      b: 'campfire',
      points: [[0.45, 3.9], [1.0, 7.6], [-0.5, 11.0], [-3.7, 14.4], [-5.5, 17.0], [-6.0, 18.9]],
    },
  ] satisfies RouteDef[],
  /** Scenery placements per location. */
  props: {
    greatOak: { id: 'great-oak', x: 0, z: -3.6, height: 11.5, trunkRadius: 0.9, crownWidth: 3.3, lean: 0.06, crownClumps: 7 },
    oakHome: { id: 'clover-home', doorHeight: 1.05 },
    teaTable: { id: 'clover-table', x: 3.0, z: -1.0, rotY: -0.4, cups: 3 },
    oakLantern: { id: 'oak-lantern', x: -2.5, z: -1.9, rotY: -0.6 },
    oakRocks: [{ id: 'oak-rock-1', x: 4.6, z: 2.3, size: 0.9 }, { id: 'oak-rock-2', x: -4.1, z: 2.2, size: 0.7 }],
    oakMushrooms: [
      { id: 'oak-mush-1', kind: 'pale' as const, x: -1.0, z: -2.9, count: 5, spread: 0.25 },
      { id: 'oak-mush-2', kind: 'toadstool' as const, x: 4.1, z: 2.9, count: 3, spread: 0.2 },
    ],
    campfire: { id: 'first-campfire', x: -7.0, z: 21.6, strength: 0.55 },
    campLog: { id: 'camp-log', x: -8.7, z: 22.6, rotY: 0.5 },
  },
  /** Where residents stand in this sample. Stage 4 moves this into saved state. */
  residents: [
    { id: 'rabbit', location: 'village-oak' as LocationId, x: 1.85, z: 0.35, rotY: -0.4 },
    { id: 'badger', location: 'village-oak' as LocationId, x: 1.15, z: -0.75, rotY: -0.2 },
  ],
  woodland: {
    id: 'sample-wood',
    extent: 38,
    trees: { count: 150, minGap: 2.3, firShare: 0.4, trailMargin: 1.8 },
    bushes: { count: 420, minGap: 1.05, trailMargin: 0.9 },
  },
} as const;

export function routeBetween(from: LocationId, to: LocationId): { route: RouteDef; reversed: boolean } | null {
  for (const r of world.routes) {
    if (r.a === from && r.b === to) return { route: r, reversed: false };
    if (r.b === from && r.a === to) return { route: r, reversed: true };
  }
  return null;
}
