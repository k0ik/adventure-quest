import * as THREE from 'three';
import type { Rng } from './rng';

/** Faceted helpers shared by all builders. Geometries are cached where parameters repeat. */
const cache = new Map<string, THREE.BufferGeometry>();

function cached(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = cache.get(key);
  if (!g) {
    g = make();
    cache.set(key, g);
  }
  return g;
}

/** Low-poly ball. detail 1 reads as a soft but faceted shape. */
export const ball = (detail = 1) => cached(`ball:${detail}`, () => new THREE.IcosahedronGeometry(1, detail));

export const lowSphere = (w = 8, h = 6) => cached(`sphere:${w}:${h}`, () => new THREE.SphereGeometry(1, w, h));

export const capsule = (radius: number, length: number, cap = 3, radial = 7) =>
  cached(`capsule:${radius}:${length}:${cap}:${radial}`, () => new THREE.CapsuleGeometry(radius, length, cap, radial));

export const cylinder = (top: number, bottom: number, height: number, radial = 7, open = false) =>
  cached(`cyl:${top}:${bottom}:${height}:${radial}:${open}`, () => new THREE.CylinderGeometry(top, bottom, height, radial, 1, open));

export const box = (w: number, h: number, d: number) => cached(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));

export const cone = (r: number, h: number, radial = 6) => cached(`cone:${r}:${h}:${radial}`, () => new THREE.ConeGeometry(r, h, radial));

/** Unique (uncached) geometry with every vertex pushed by seeded noise, for rocks and leaf clumps. */
export function jitteredBall(rng: Rng, detail: number, amount: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, detail);
  // Icosahedron is non-indexed: displace coincident vertices identically so faces stay closed.
  const pos = g.attributes.position as THREE.BufferAttribute;
  const offsets = new Map<string, number>();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    let o = offsets.get(k);
    if (o === undefined) {
      o = 1 + (rng() * 2 - 1) * amount;
      offsets.set(k, o);
    }
    v.multiplyScalar(o);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Paint a non-indexed geometry's faces using a function of face centre and normal. */
export function paintFaces(
  g: THREE.BufferGeometry,
  colourFor: (centre: THREE.Vector3, normal: THREE.Vector3, faceIndex: number) => THREE.Color,
): void {
  const geo = g.index ? g.toNonIndexed() : g;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colours = new Float32Array(pos.count * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const centre = new THREE.Vector3(), normal = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    centre.copy(a).add(b).add(c).divideScalar(3);
    normal.copy(c).sub(b).cross(new THREE.Vector3().copy(a).sub(b)).normalize();
    const col = colourFor(centre, normal, i / 3);
    for (let j = 0; j < 3; j++) colours.set([col.r, col.g, col.b], (i + j) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  if (geo !== g) {
    g.copy(geo);
  }
}
