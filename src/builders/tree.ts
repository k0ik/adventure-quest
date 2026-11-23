import * as THREE from 'three';
import { palette, type PaletteKey } from '../art/palette';
import { mat, mesh, vertexColourMat, enableShadows } from '../art/materials';
import { cylinder, jitteredBall, paintFaces } from '../art/geometry';
import { createRng, range, seedFrom } from '../art/rng';

/**
 * Deciduous tree builder. A small vocabulary of parameters; variation comes only from the
 * seed derived from the tree's stable ID, so the same ID always rebuilds the same tree.
 */
export interface DeciduousTreeParams {
  id: string;
  height: number; // ground to top of crown, metres
  trunkRadius: number;
  lean?: number; // radians, gentle bend of the upper trunk
  crownWidth: number; // overall crown radius
  crownClumps?: number;
  leafColours?: [PaletteKey, PaletteKey, PaletteKey]; // shade, mid, sunlit
}

export function buildDeciduousTree(p: DeciduousTreeParams): THREE.Group {
  const rng = createRng(seedFrom(p.id));
  const root = new THREE.Group();
  root.name = `tree:${p.id}`;
  const barkMat = mat('barkLight', 'wood');
  const lean = p.lean ?? 0.12;
  const trunkHeight = p.height * 0.42;

  // Root flare: a few wedge roots so the trunk sits in the ground rather than on it.
  const roots = 5;
  for (let i = 0; i < roots; i++) {
    const a = (i / roots) * Math.PI * 2 + range(rng, -0.3, 0.3);
    // Narrow end points outward and slightly down; the wide end sits inside the trunk.
    const len = p.trunkRadius * range(rng, 1.8, 2.4);
    const d = new THREE.Vector3(Math.sin(a), -0.4, Math.cos(a)).normalize();
    const r = mesh(cylinder(0.015, p.trunkRadius * 0.5, len, 4), barkMat, 'root');
    r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    r.position.set(0, p.trunkRadius * 0.7, 0).addScaledVector(d, len / 2);
    root.add(r);
  }

  // Trunk: three tapered segments, each leaning a little more, so the silhouette has character.
  const segs = 3;
  let base = new THREE.Vector3(0, 0, 0);
  let dir = new THREE.Vector3(0, 1, 0);
  const leanAxis = new THREE.Vector3(range(rng, -1, 1), 0, range(rng, -1, 1)).normalize();
  let radius = p.trunkRadius;
  const top = new THREE.Vector3();
  for (let i = 0; i < segs; i++) {
    const len = trunkHeight / segs;
    const nextRadius = radius * 0.78;
    const seg = mesh(cylinder(nextRadius, radius, len * 1.08, 7), barkMat, 'trunk');
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    seg.quaternion.copy(q);
    seg.position.copy(base).addScaledVector(dir, len / 2);
    root.add(seg);
    base = base.clone().addScaledVector(dir, len);
    dir = dir.clone().applyAxisAngle(leanAxis, lean / segs).normalize();
    radius = nextRadius;
  }
  top.copy(base);

  // Branches: chunky limbs fanning out from the trunk top, each carrying a leaf lobe.
  // The crown therefore reads as separate faceted masses (as in the references), not one blob.
  const branchCount = p.crownClumps ? Math.max(3, Math.min(5, p.crownClumps - 2)) : 4;
  const lobeCentres: { c: THREE.Vector3; s: number }[] = [];
  const startAngle = rng() * Math.PI * 2;
  for (let i = 0; i < branchCount; i++) {
    const a = startAngle + (i / branchCount) * Math.PI * 2 + range(rng, -0.35, 0.35);
    const from = top.clone().add(new THREE.Vector3(0, -trunkHeight * range(rng, 0.0, 0.12), 0));
    const bdir = new THREE.Vector3(Math.sin(a), range(rng, 0.55, 0.95), Math.cos(a)).normalize();
    const len = p.crownWidth * range(rng, 0.7, 0.95);
    const b = mesh(cylinder(radius * 0.42, radius * 0.72, len, 6), barkMat, 'branch');
    b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bdir);
    b.position.copy(from).addScaledVector(bdir, len / 2);
    root.add(b);
    lobeCentres.push({ c: from.clone().addScaledVector(bdir, len * 1.05).add(new THREE.Vector3(0, p.crownWidth * 0.15, 0)), s: p.crownWidth * range(rng, 0.52, 0.66) });
  }
  // A crowning lobe above the trunk top.
  lobeCentres.push({ c: top.clone().add(new THREE.Vector3(0, p.crownWidth * 0.95, 0)), s: p.crownWidth * 0.68 });

  // Leaf lobes: broad facets, light on top and toward the sun, darker beneath.
  const [shade, mid, sun] = p.leafColours ?? ['leaf', 'leafLight', 'leafSun'];
  const cDeep = new THREE.Color(palette.leafDeep);
  const cShade = new THREE.Color(palette[shade]);
  const cMid = new THREE.Color(palette[mid]);
  const cSun = new THREE.Color(palette[sun]);
  const leafMat = vertexColourMat('matte');
  for (const { c, s } of lobeCentres) {
    const geo = jitteredBall(rng, 1, 0.13);
    paintFaces(geo, (_c, n) => {
      const t = n.y * 0.8 + range(rng, -0.18, 0.18);
      return t > 0.5 ? cSun : t > 0.0 ? cMid : t > -0.55 ? cShade : cDeep;
    });
    const lobe = mesh(geo, leafMat, 'leaves');
    lobe.position.copy(c);
    lobe.scale.set(s, s * range(rng, 0.72, 0.84), s);
    lobe.rotation.y = rng() * Math.PI;
    root.add(lobe);
  }

  enableShadows(root);
  return root;
}
