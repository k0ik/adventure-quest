import * as THREE from 'three';

/** Authored route control points in the ground plane (x, z). */
export type RoutePoints = readonly (readonly [number, number])[];

/** A smooth centre line through authored points, sampled densely for distance queries. */
export function routeCurve(points: RoutePoints, heightAt: (x: number, z: number) => number, eye = 0): THREE.CatmullRomCurve3 {
  const pts = points.map(([x, z]) => new THREE.Vector3(x, heightAt(x, z) + eye, z));
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
}

/** Distance from (x, z) to the nearest of several routes' centre lines (flat, ignores height). */
export function trailDistance(routes: RoutePoints[]): (x: number, z: number) => number {
  const flat = () => 0;
  const samples: [number, number][][] = routes.map((r) =>
    routeCurve(r, flat).getSpacedPoints(Math.max(8, Math.ceil(length2d(r) / 0.4))).map((p) => [p.x, p.z] as [number, number]),
  );
  return (x, z) => {
    let best = Infinity;
    for (const s of samples) {
      for (let i = 0; i < s.length - 1; i++) {
        const [ax, az] = s[i], [bx, bz] = s[i + 1];
        const dx = bx - ax, dz = bz - az;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
        const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
        if (d < best) best = d;
      }
    }
    return best;
  };
}

function length2d(points: RoutePoints): number {
  let l = 0;
  for (let i = 1; i < points.length; i++) l += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return l;
}
