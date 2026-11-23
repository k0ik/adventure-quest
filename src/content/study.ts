/**
 * Stage 1 study scene: authored placements only. Builders turn this into meshes.
 * Coordinates in metres; the viewer looks roughly toward −Z.
 */
export const studyScene = {
  id: 'study-1',
  ground: {
    id: 'study-ground',
    radius: 18,
    relief: 0.22,
    clearingRadius: 4,
    path: { width: 1.15, curve: (z: number) => 0.55 * Math.sin(z * 0.42) + 0.3 },
    tufts: 900,
    leaves: 260,
  },
  tree: { id: 'study-oak', x: -2.3, z: -1.7, rotY: 0.4, height: 5.2, trunkRadius: 0.4, crownWidth: 1.75, lean: 0.2, crownClumps: 6 },
  woodland: {
    id: 'study-wood',
    clearing: { x: 0, z: -0.4, r: 3.6 },
    extent: 17,
    trees: { count: 46, minGap: 2.2, firShare: 0.4, trailMargin: 1.7 },
    bushes: { count: 150, minGap: 1.0, trailMargin: 0.85 },
  },
  rock: { id: 'study-rock', x: 2.6, z: 0.1, size: 1.15, squash: 0.62, mossy: 0.55 },
  lantern: { id: 'study-lantern', x: 1.35, z: -1.6, rotY: -0.5, height: 1.95 },
  resident: { id: 'rabbit', x: -0.55, z: 0.75, rotY: 0.3 },
  mushrooms: [
    { id: 'study-mush-roots', kind: 'pale' as const, x: -1.75, z: -1.25, count: 5, spread: 0.22 },
    { id: 'study-mush-rock', kind: 'toadstool' as const, x: 2.0, z: 0.95, count: 3, spread: 0.2 },
  ],
  views: {
    overall: { position: [0.8, 1.6, 5.3], target: [0, 1.0, -0.6] },
    portrait: { position: [-0.3, 0.82, 1.5], target: [-0.55, 0.7, 0.75] },
    character: { position: [-0.05, 0.85, 2.75], target: [-0.55, 0.52, 0.75] },
  },
} as const;
