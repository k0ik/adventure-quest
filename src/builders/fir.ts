import * as THREE from 'three';
import { palette } from '../art/palette';
import { mat, mesh, vertexColourMat, enableShadows } from '../art/materials';
import { cylinder, paintFaces } from '../art/geometry';
import { createRng, range, seedFrom } from '../art/rng';

export interface FirParams {
  id: string;
  height: number;
  radius: number; // radius of the lowest tier
  tiers?: number;
  trunkRadius?: number;
  bareTrunk?: number; // fraction of height with no branches
}

/**
 * Fir: a tall warm trunk carrying stacked, drooping faceted tiers that narrow toward the top.
 * Tiers are lit lighter on top and darker underneath so layers read clearly at distance.
 */
export function buildFir(p: FirParams): THREE.Group {
  const rng = createRng(seedFrom(p.id));
  const g = new THREE.Group();
  g.name = `fir:${p.id}`;
  const tr = p.trunkRadius ?? p.radius * 0.12;
  const trunk = mesh(cylinder(tr * 0.35, tr, p.height * 0.92, 6), mat('bark', 'wood'), 'trunk');
  trunk.position.y = p.height * 0.46;
  g.add(trunk);

  const tiers = p.tiers ?? 5;
  const bare = p.bareTrunk ?? 0.22;
  const top = new THREE.Color(palette.leaf);
  const midC = new THREE.Color(palette.fir);
  const under = new THREE.Color(palette.firDeep);
  const tierMat = vertexColourMat('matte');
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const y = p.height * (bare + (1 - bare) * t * 0.82);
    const r = p.radius * (1 - t * 0.78) * range(rng, 0.92, 1.06);
    const h = p.height * (0.3 - t * 0.08);
    const geo = new THREE.ConeGeometry(r, h, 7, 1, false).toNonIndexed();
    // Droop: pull the rim down a little, alternating, for a ragged skirt.
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < pos.count; k++) {
      if (pos.getY(k) < 0) {
        const a = Math.atan2(pos.getZ(k), pos.getX(k));
        pos.setY(k, pos.getY(k) - Math.abs(Math.sin(a * 3.5)) * h * 0.12);
      }
    }
    geo.computeVertexNormals();
    paintFaces(geo, (_c, n) => (n.y > 0.55 ? top : n.y > 0 ? midC : under));
    const tier = mesh(geo, tierMat, 'tier');
    tier.position.y = y + h / 2;
    tier.rotation.set(range(rng, -0.05, 0.05), rng() * Math.PI, range(rng, -0.05, 0.05));
    g.add(tier);
  }
  enableShadows(g);
  return g;
}
