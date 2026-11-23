import * as THREE from 'three';
import { palette } from '../art/palette';
import { mat, mesh, vertexColourMat, enableShadows } from '../art/materials';
import { ball, jitteredBall, paintFaces } from '../art/geometry';
import { createRng, range, seedFrom } from '../art/rng';

export interface BushParams {
  id: string;
  size: number; // approximate width in metres
  height?: number; // relative to width
  berries?: boolean;
}

/** A dense, low, faceted shrub of several leaf lobes; reads as impassable undergrowth. */
export function buildBush(p: BushParams): THREE.Group {
  const rng = createRng(seedFrom(p.id));
  const g = new THREE.Group();
  g.name = `bush:${p.id}`;
  const deep = new THREE.Color(palette.leafDeep), mid = new THREE.Color(palette.leaf), light = new THREE.Color(palette.leafLight);
  const lobes = 3 + Math.floor(rng() * 3);
  const hgt = p.height ?? 0.6;
  const tops: THREE.Vector3[] = [];
  for (let i = 0; i < lobes; i++) {
    const geo = jitteredBall(rng, 1, 0.15);
    paintFaces(geo, (_c, n) => {
      const t = n.y * 0.8 + range(rng, -0.2, 0.2);
      return t > 0.45 ? light : t > -0.2 ? mid : deep;
    });
    const s = p.size * range(rng, 0.3, 0.45);
    const lobe = mesh(geo, vertexColourMat('matte'), 'bush-lobe');
    const a = rng() * Math.PI * 2, r = i === 0 ? 0 : p.size * range(rng, 0.15, 0.3);
    lobe.position.set(Math.sin(a) * r, s * hgt * 1.3, Math.cos(a) * r);
    lobe.scale.set(s, s * hgt * 1.4, s);
    g.add(lobe);
    tops.push(lobe.position.clone().add(new THREE.Vector3(0, s * hgt * 1.2, 0)));
  }
  if (p.berries) {
    const berry = mat('capRed', 'gloss');
    for (let i = 0; i < 7; i++) {
      const b = mesh(ball(0), berry, 'berry');
      b.scale.setScalar(0.025);
      const t = tops[i % tops.length];
      b.position.copy(t).add(new THREE.Vector3(range(rng, -0.12, 0.12), range(rng, -0.12, 0), range(rng, -0.12, 0.12)).multiplyScalar(p.size));
      g.add(b);
    }
  }
  enableShadows(g);
  return g;
}
