import * as THREE from 'three';
import { createRng, range, seedFrom } from '../art/rng';
import { buildDeciduousTree } from './tree';
import { buildFir } from './fir';
import { buildBush } from './bush';
import { buildMushrooms } from './mushroom';

/**
 * Dense wild woodland around a clearing and trail. Placement is seeded from the area's ID, so
 * the same area always rebuilds identically. Trees stand back from the trail; bushes crowd up
 * to its edges so the way through reads as the only way through.
 */
export interface WoodlandParams {
  id: string;
  heightAt: (x: number, z: number) => number;
  /** Distance from (x, z) to the trail centre line. */
  trailDistance: (x: number, z: number) => number;
  clearing: { x: number; z: number; r: number };
  extent: number; // outer radius
  trees: { count: number; minGap: number; firShare: number; trailMargin: number };
  bushes: { count: number; minGap: number; trailMargin: number };
  /**
   * Keep tall trees out of a wedge toward the sun (xz direction, half-angle in radians), so a
   * shaft of low sunlight reaches the clearing. Bushes may still grow there.
   */
  sunGap?: { dir: [number, number]; halfAngle: number };
  /** Spots that must stay open (study objects, camera positions). */
  keepOpen: { x: number; z: number; r: number }[];
}

export function buildWoodland(p: WoodlandParams): THREE.Group {
  const rng = createRng(seedFrom(p.id));
  const g = new THREE.Group();
  g.name = `woodland:${p.id}`;
  const placed: { x: number; z: number; r: number }[] = [];
  const open = (x: number, z: number, r: number, trailMargin: number, minGap: number) => {
    if (Math.hypot(x - p.clearing.x, z - p.clearing.z) < p.clearing.r + r) return false;
    if (p.trailDistance(x, z) < trailMargin + r) return false;
    if (p.keepOpen.some((k) => Math.hypot(x - k.x, z - k.z) < k.r + r)) return false;
    return placed.every((q) => Math.hypot(x - q.x, z - q.z) > Math.max(minGap, (q.r + r) * 0.8));
  };
  const sample = (minR: number) => {
    const r = Math.sqrt(range(rng, (minR / p.extent) ** 2, 1)) * p.extent;
    const a = rng() * Math.PI * 2;
    return { x: p.clearing.x + Math.sin(a) * r, z: p.clearing.z + Math.cos(a) * r };
  };
  const seat = (o: THREE.Object3D, x: number, z: number) => {
    o.position.set(x, p.heightAt(x, z) - 0.05, z);
    o.rotation.y = rng() * Math.PI * 2;
    g.add(o);
  };

  let made = 0;
  for (let tries = 0; made < p.trees.count && tries < p.trees.count * 40; tries++) {
    const { x, z } = sample(p.clearing.r);
    const fir = rng() < p.trees.firShare;
    const r = fir ? 0.9 : 1.1;
    if (p.sunGap) {
      const a = Math.atan2(x - p.clearing.x, z - p.clearing.z) - Math.atan2(p.sunGap.dir[0], p.sunGap.dir[1]);
      const d = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
      if (d < p.sunGap.halfAngle) continue;
    }
    if (!open(x, z, r, p.trees.trailMargin, p.trees.minGap)) continue;
    const id = `${p.id}-tree-${made}`;
    const tree = fir
      ? buildFir({ id, height: range(rng, 7, 11), radius: range(rng, 1.4, 2.0), tiers: 5 + Math.floor(rng() * 3) })
      : buildDeciduousTree({ id, height: range(rng, 5.5, 8.5), trunkRadius: range(rng, 0.3, 0.45), crownWidth: range(rng, 1.5, 2.2), lean: range(rng, 0.05, 0.3), crownClumps: 5 + Math.floor(rng() * 2) });
    seat(tree, x, z);
    placed.push({ x, z, r });
    made++;
  }

  let bushes = 0;
  for (let tries = 0; bushes < p.bushes.count && tries < p.bushes.count * 40; tries++) {
    const { x, z } = sample(p.clearing.r * 0.85);
    const size = range(rng, 0.9, 1.8);
    const r = size * 0.4;
    if (!open(x, z, r, p.bushes.trailMargin, p.bushes.minGap)) continue;
    const id = `${p.id}-bush-${bushes}`;
    seat(buildBush({ id, size, height: range(rng, 0.5, 0.75), berries: rng() < 0.15 }), x, z);
    if (rng() < 0.12) seat(buildMushrooms({ id: `${id}-m`, kind: rng() < 0.5 ? 'toadstool' : 'pale', count: 3, spread: 0.15 }), x + size * 0.5, z + size * 0.3);
    placed.push({ x, z, r });
    bushes++;
  }
  return g;
}
