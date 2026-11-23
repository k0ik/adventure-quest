import * as THREE from 'three';
import { mat, mesh, enableShadows } from '../art/materials';
import { cylinder, ball } from '../art/geometry';
import { createRng, range, seedFrom } from '../art/rng';

export interface MushroomClusterParams {
  id: string;
  kind: 'toadstool' | 'pale';
  count: number;
  spread: number;
  size?: number;
}

/** A small cluster of mushrooms: red spotted toadstools or slender pale caps. */
export function buildMushrooms(p: MushroomClusterParams): THREE.Group {
  const rng = createRng(seedFrom(p.id));
  const g = new THREE.Group();
  g.name = `mushrooms:${p.id}`;
  const stalkMat = mat('stalk');
  const capMat = mat(p.kind === 'toadstool' ? 'capRed' : 'capPale', 'gloss');
  const spotMat = mat('stalk');
  for (let i = 0; i < p.count; i++) {
    const s = (p.size ?? 1) * range(rng, 0.6, 1.1) * (i === 0 ? 1.2 : 1);
    const m = new THREE.Group();
    const h = (p.kind === 'toadstool' ? 0.12 : 0.16) * s;
    const stalk = mesh(cylinder(0.014 * s * (p.kind === 'toadstool' ? 1.6 : 1), 0.02 * s * (p.kind === 'toadstool' ? 1.6 : 1), h, 6), stalkMat, 'stalk');
    stalk.position.y = h / 2;
    m.add(stalk);
    const capR = (p.kind === 'toadstool' ? 0.075 : 0.05) * s;
    const cap = mesh(new THREE.SphereGeometry(1, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), capMat, 'cap');
    cap.scale.set(capR, capR * (p.kind === 'toadstool' ? 0.75 : 1.0), capR);
    cap.position.y = h * 0.92;
    m.add(cap);
    const under = mesh(new THREE.CircleGeometry(capR * 0.98, 9), stalkMat, 'gill');
    under.rotation.x = Math.PI / 2;
    under.position.y = h * 0.92;
    m.add(under);
    if (p.kind === 'toadstool') {
      for (let k = 0; k < 4; k++) {
        const a = rng() * Math.PI * 2, el = range(rng, 0.35, 1.2);
        const spot = mesh(ball(0), spotMat, 'spot');
        spot.scale.set(capR * 0.2, capR * 0.07, capR * 0.2);
        const dir = new THREE.Vector3(Math.cos(el) * Math.sin(a), Math.sin(el) * 0.75, Math.cos(el) * Math.cos(a));
        spot.position.set(dir.x * capR, h * 0.92 + dir.y * capR, dir.z * capR);
        spot.lookAt(spot.position.clone().add(dir));
        spot.rotateX(Math.PI / 2);
        m.add(spot);
      }
    }
    const a = rng() * Math.PI * 2, r = i === 0 ? 0 : range(rng, 0.3, 1) * p.spread;
    m.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
    m.rotation.set(range(rng, -0.15, 0.15), rng() * 6, range(rng, -0.15, 0.15));
    g.add(m);
  }
  enableShadows(g);
  return g;
}
