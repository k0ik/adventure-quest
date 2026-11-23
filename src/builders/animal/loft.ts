import * as THREE from 'three';

/**
 * Lofted low-poly shapes: a series of cross-section rings joined into a faceted solid.
 * Economical (tens of faces) and fully controllable from data, which suits heads and ears
 * whose silhouettes a sphere cannot give.
 */
export interface Ring {
  at: number; // position along the loft axis
  w: number; // half-width (x)
  h: number; // half-height across the other axis
  c: number; // centre offset across the other axis
}

/** Linear interpolation of a ring profile at position `t` along the axis. */
export function ringAt(rings: Ring[], t: number): Ring {
  if (t <= rings[0].at) return rings[0];
  for (let i = 1; i < rings.length; i++) {
    const a = rings[i - 1], b = rings[i];
    if (t <= b.at) {
      const k = (t - a.at) / (b.at - a.at);
      return { at: t, w: a.w + (b.w - a.w) * k, h: a.h + (b.h - a.h) * k, c: a.c + (b.c - a.c) * k };
    }
  }
  return rings[rings.length - 1];
}

/** Keep only the part of a profile between `from` and `to`, adding interpolated end rings. */
export function sliceRings(rings: Ring[], from: number, to: number): Ring[] {
  const inner = rings.filter((r) => r.at > from && r.at < to);
  return [ringAt(rings, from), ...inner, ringAt(rings, to)];
}

/**
 * Loft along Z (heads: back → nose). Cross-section points are given as unit (x, y) pairs and
 * scaled by each ring's w/h. Ends are closed with a fan to a single cap point.
 * Face orientation is corrected automatically, so section winding does not matter.
 */
export function loftZ(rings: Ring[], section: [number, number][], capBack = true, capFront = true): THREE.BufferGeometry {
  const pts = rings.map((r) => section.map(([x, y]) => new THREE.Vector3(x * r.w, r.c + y * r.h, r.at)));
  return stitch(pts, rings, capBack, capFront, 'z');
}

/** Loft along Y (ears: base → tip). Section (x, z) pairs scaled by w (x) and h (z). */
export function loftY(rings: Ring[], section: [number, number][], capBase = true, capTip = true): THREE.BufferGeometry {
  const pts = rings.map((r) => section.map(([x, z]) => new THREE.Vector3(x * r.w, r.at, r.c + z * r.h)));
  return stitch(pts, rings, capBase, capTip, 'y');
}

function stitch(pts: THREE.Vector3[][], rings: Ring[], capA: boolean, capB: boolean, axis: 'y' | 'z'): THREE.BufferGeometry {
  const out: number[] = [];
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nrm = new THREE.Vector3(), mid = new THREE.Vector3();
  // Emit a triangle facing away from `inside` (orientation is fixed up automatically).
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, inside: THREE.Vector3) => {
    nrm.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a));
    mid.copy(a).add(b).add(c).divideScalar(3).sub(inside);
    if (nrm.dot(mid) < 0) [b, c] = [c, b];
    out.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  const centre = (ring: THREE.Vector3[]) => ring.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(ring.length);
  const centres = pts.map(centre);
  const n = pts[0].length;
  for (let i = 0; i < pts.length - 1; i++) {
    const inside = centres[i].clone().add(centres[i + 1]).multiplyScalar(0.5);
    for (let k = 0; k < n; k++) {
      const a = pts[i][k], b = pts[i][(k + 1) % n], c = pts[i + 1][(k + 1) % n], d = pts[i + 1][k];
      tri(a, b, c, inside);
      tri(a, c, d, inside);
    }
  }
  const capPoint = (idx: number, dir: number) => {
    const c = centres[idx].clone();
    const r = rings[idx];
    if (axis === 'z') c.z += dir * Math.min(r.w, r.h) * 0.35;
    return c;
  };
  const inward = (idx: number, toward: number) => centres[idx].clone().lerp(centres[toward], 0.5);
  if (capA) {
    const c = capPoint(0, -1), inside = inward(0, 1);
    for (let k = 0; k < n; k++) tri(c, pts[0][k], pts[0][(k + 1) % n], inside);
  }
  if (capB) {
    const L = pts.length - 1, c = capPoint(L, 1), inside = inward(L, L - 1);
    for (let k = 0; k < n; k++) tri(c, pts[L][k], pts[L][(k + 1) % n], inside);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.computeVertexNormals();
  return g;
}

/** Octagonal head section with a slightly flattened crown and jaw. Counter-clockwise from +x. */
export const headSection: [number, number][] = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
  const y = Math.sin(a);
  return [Math.cos(a), y > 0 ? y * 0.95 : y * 0.9];
});

/** Ear section: broad flat front (where the lining sits), bevelled back. */
export const earSection: [number, number][] = [
  [1, 0], [0.75, 1], [-0.75, 1], [-1, 0], [-0.6, -1], [0.6, -1],
];
