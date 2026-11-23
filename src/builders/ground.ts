import * as THREE from 'three';
import { palette } from '../art/palette';
import { mat, mesh, vertexColourMat } from '../art/materials';
import { paintFaces } from '../art/geometry';
import { createRng, range, seedFrom } from '../art/rng';

/**
 * Ground patch builder: a gently undulating faceted disc with a worn path, grass tufts and
 * fallen leaves. For the study it is presented as a diorama plinth with an earth edge.
 * `heightAt` is exposed so other builders can seat objects on the surface.
 */
export interface GroundParams {
  id: string;
  radius: number;
  relief: number; // max height variation in metres
  /** Path centre line as x = f(z). Width in metres. */
  path?: { width: number; curve: (z: number) => number };
  tufts?: number;
  leaves?: number;
  /** Points to keep clear of decoration (objects sit there). */
  clear?: { x: number; z: number; r: number }[];
}

export interface GroundPatch {
  object: THREE.Group;
  heightAt: (x: number, z: number) => number;
}

export function buildGround(p: GroundParams): GroundPatch {
  const rng = createRng(seedFrom(p.id));
  const phases = Array.from({ length: 6 }, () => rng() * Math.PI * 2);
  const heightAt = (x: number, z: number) => {
    const h =
      Math.sin(x * 0.45 + phases[0]) * Math.cos(z * 0.38 + phases[1]) * 0.6 +
      Math.sin(x * 0.9 + z * 0.6 + phases[2]) * 0.25 +
      Math.cos(z * 1.3 + phases[3]) * Math.sin(x * 1.1 + phases[4]) * 0.15;
    // Path is slightly sunken and smoothed.
    let sink = 0;
    if (p.path) {
      const d = Math.abs(x - p.path.curve(z));
      sink = Math.max(0, 1 - d / (p.path.width * 0.8)) * 0.05;
    }
    return h * p.relief - sink;
  };
  const pathDist = (x: number, z: number) => (p.path ? Math.abs(x - p.path.curve(z)) : Infinity);

  // Square grid with slightly jittered vertices; points outside the radius are pulled onto the
  // rim so the edge is a clean circle without the starburst a polar grid makes at the centre.
  const n = 36;
  const cell = (p.radius * 2) / n;
  const gridPt = (ix: number, iz: number): [number, number, number] => {
    let x = -p.radius + ix * cell, z = -p.radius + iz * cell;
    const interior = ix > 0 && iz > 0 && ix < n && iz < n;
    if (interior) {
      const h = Math.sin(ix * 12.9898 + iz * 78.233) * 43758.5453;
      const jx = (h - Math.floor(h) - 0.5) * cell * 0.5;
      const h2 = Math.sin(ix * 39.346 + iz * 11.135) * 24634.6345;
      const jz = (h2 - Math.floor(h2) - 0.5) * cell * 0.5;
      x += jx; z += jz;
    }
    const r = Math.hypot(x, z);
    if (r > p.radius) { x *= p.radius / r; z *= p.radius / r; }
    return [x, heightAt(x, z), z];
  };
  const verts: number[] = [];
  for (let ix = 0; ix < n; ix++) {
    for (let iz = 0; iz < n; iz++) {
      const a = gridPt(ix, iz), b = gridPt(ix, iz + 1), c = gridPt(ix + 1, iz + 1), d = gridPt(ix + 1, iz);
      const centre = Math.hypot((a[0] + c[0]) / 2, (a[2] + c[2]) / 2);
      if (centre > p.radius) continue;
      // Alternate the diagonal for a less regular facet pattern.
      if ((ix + iz) % 2 === 0) verts.push(...a, ...b, ...c, ...a, ...c, ...d);
      else verts.push(...a, ...b, ...d, ...b, ...c, ...d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  // Drop degenerate triangles produced by rim clamping.
  geo.computeVertexNormals();

  // Colour in broad patches (smooth noise), with a soft-edged worn path.
  const grass = new THREE.Color(palette.grass);
  const grassDry = new THREE.Color(palette.grassDry);
  const moss = new THREE.Color(palette.moss);
  const path = new THREE.Color(palette.path);
  const soil = new THREE.Color(palette.soil);
  const patch = (x: number, z: number) =>
    Math.sin(x * 0.7 + phases[5]) * Math.cos(z * 0.6 - phases[1]) + 0.5 * Math.sin((x - z) * 1.3 + phases[2]);
  const tmp = new THREE.Color();
  paintFaces(geo, (c) => {
    const d = pathDist(c.x, c.z);
    const w = p.path?.width ?? 0;
    const edge = d / (w * 0.5) + (rng() - 0.5) * 0.35;
    if (edge < 0.75) return tmp.copy(path).lerp(soil, rng() * 0.25).clone();
    if (edge < 1.05) return tmp.copy(path).lerp(grassDry, 0.55).clone();
    const t = patch(c.x, c.z) + (rng() - 0.5) * 0.25;
    if (t > 0.75) return tmp.copy(grass).lerp(grassDry, 0.6).clone();
    if (t < -0.7) return moss;
    return tmp.copy(grass).lerp(moss, (t + 1) * 0.15).clone();
  });
  const surface = mesh(geo, vertexColourMat('matte'), 'ground');
  surface.receiveShadow = true;

  const group = new THREE.Group();
  group.name = `ground:${p.id}`;
  group.add(surface);

  // Earth edge: a skirt following the rim heights down to the surrounding meadow.
  const skirt: number[] = [];
  const depth = -0.7;
  const segs = 128;
  const rim = (i: number) => {
    const a = (i / segs) * Math.PI * 2;
    const x = Math.sin(a) * p.radius, z = Math.cos(a) * p.radius;
    return [x, heightAt(x, z), z];
  };
  for (let si = 0; si < segs; si++) {
    const a = rim(si), b = rim(si + 1);
    skirt.push(a[0], a[1], a[2], a[0], depth, a[2], b[0], depth, b[2], a[0], a[1], a[2], b[0], depth, b[2], b[0], b[1], b[2]);
  }
  const skirtGeo = new THREE.BufferGeometry();
  skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(skirt, 3));
  skirtGeo.computeVertexNormals();
  group.add(mesh(skirtGeo, mat('soil', 'matte', true), 'ground-edge'));

  const isClear = (x: number, z: number, margin = 0) =>
    (p.clear ?? []).every((c) => Math.hypot(x - c.x, z - c.z) > c.r + margin) && pathDist(x, z) > (p.path?.width ?? 0) * 0.55;

  const scatter = (count: number, inner = 0.92) => {
    const out: { x: number; z: number }[] = [];
    let guard = 0;
    while (out.length < count && guard++ < count * 20) {
      const r = Math.sqrt(rng()) * p.radius * inner;
      const a = rng() * Math.PI * 2;
      const x = Math.sin(a) * r, z = Math.cos(a) * r;
      if (isClear(x, z)) out.push({ x, z });
    }
    return out;
  };

  // Grass tufts: clusters of tall, flat, gently curved blades (instanced).
  const tuftPts = scatter(p.tufts ?? 90);
  // Lusher growth hugging the bases of objects, as grass gathers against rocks and posts.
  for (const c of p.clear ?? []) {
    const k = 5 + Math.floor(c.r * 8);
    for (let i = 0; i < k; i++) {
      const a = rng() * Math.PI * 2, r = c.r + range(rng, 0.0, 0.25);
      const x = c.x + Math.sin(a) * r, z = c.z + Math.cos(a) * r;
      if (pathDist(x, z) > (p.path?.width ?? 0) * 0.55) tuftPts.push({ x, z });
    }
  }
  const blade = grassBlade();
  const tuftMats = [mat('leafLight', 'matte', true), mat('leafSun', 'matte', true), mat('grassDry', 'matte', true)];
  const perMat = tuftMats.map(() => [] as THREE.Matrix4[]);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3();
  for (const t of tuftPts) {
    const which = Math.floor(rng() * tuftMats.length);
    const size = range(rng, 0.45, 1.0);
    const blades = 4 + Math.floor(rng() * 4);
    for (let b = 0; b < blades; b++) {
      const ox = range(rng, -0.06, 0.06), oz = range(rng, -0.06, 0.06);
      const a = rng() * Math.PI * 2;
      e.set(range(rng, -0.25, 0.25), a, range(rng, -0.25, 0.25));
      q.setFromEuler(e);
      const hgt = size * range(rng, 0.6, 1.15);
      s.set(range(rng, 0.8, 1.2), hgt, 1);
      v.set(t.x + ox, heightAt(t.x + ox, t.z + oz) - 0.02, t.z + oz);
      perMat[which].push(m4.compose(v, q, s).clone());
    }
  }
  perMat.forEach((mats, i) => {
    const inst = new THREE.InstancedMesh(blade, tuftMats[i], mats.length);
    mats.forEach((mm, j) => inst.setMatrixAt(j, mm));
    inst.name = 'grass-tufts';
    inst.castShadow = true;
    inst.receiveShadow = true;
    group.add(inst);
  });

  // Fallen leaves: small flat lozenges, a hint of the turning season.
  const leafPts = scatter(p.leaves ?? 70, 0.96);
  const leafGeo = new THREE.CircleGeometry(0.06, 4);
  leafGeo.rotateX(-Math.PI / 2);
  leafGeo.scale(1, 1, 1.7);
  const leafMats = [mat('leafLitter', 'matte', true), mat('leafLitterGold', 'matte', true)];
  leafMats.forEach((lm, i) => {
    const pts = leafPts.filter((_, j) => j % 2 === i);
    const inst = new THREE.InstancedMesh(leafGeo, lm, pts.length);
    pts.forEach((pt, j) => {
      e.set(range(rng, -0.2, 0.2), rng() * Math.PI * 2, range(rng, -0.2, 0.2));
      q.setFromEuler(e);
      const sc = range(rng, 0.7, 1.2);
      s.set(sc, 1, sc);
      v.set(pt.x, heightAt(pt.x, pt.z) + 0.012, pt.z);
      inst.setMatrixAt(j, m4.compose(v, q, s));
    });
    inst.name = 'fallen-leaves';
    inst.receiveShadow = true;
    group.add(inst);
  });

  return { object: group, heightAt };
}

/** One grass blade: a tapered, forward-curving strip 0.4 m tall at scale 1. */
function grassBlade(): THREE.BufferGeometry {
  const segs = 4;
  const pos: number[] = [];
  const pt = (i: number, side: number) => {
    const t = i / segs;
    const w = 0.028 * (1 - t);
    return [side * w, t * 0.4, t * t * 0.12];
  };
  for (let i = 0; i < segs; i++) {
    const a = pt(i, -1), b = pt(i, 1), c = pt(i + 1, 1), d = pt(i + 1, -1);
    if (i === segs - 1) pos.push(...a, ...b, ...c);
    else pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
