import * as THREE from 'three';
import { mat, mesh } from '../../art/materials';
import { box, capsule, lowSphere } from '../../art/geometry';
import type { AnimalSpec, GarmentSpec, JointName, OutfitSpec } from './types';

/**
 * Garments are separate meshes layered just outside the fur, parented to the same joints
 * so they move with the body. Each garment kind is a small parametric recipe.
 */
type Joints = Record<JointName, THREE.Object3D>;
const CLOTH_GAP = 1.07; // garment scale relative to the body part it covers

export function dressTorso(spec: AnimalSpec, outfit: OutfitSpec, j: Joints): void {
  for (const g of outfit.garments) {
    switch (g.kind) {
      case 'jumper': jumper(spec, g, j); break;
      case 'apron': apron(spec, g, j); break;
      case 'collar': collar(spec, g, j); break;
      case 'scarf': scarf(spec, g, j); break;
      case 'waistcoat': waistcoat(spec, g, j); break;
      case 'cap': cap(spec, g, j); break;
    }
  }
}

function jumper(spec: AnimalSpec, g: Extract<GarmentSpec, { kind: 'jumper' }>, j: Joints): void {
  const b = spec.body;
  const T = b.torsoLength;
  const cloth = mat(g.colour, 'cloth');
  const trim = mat(g.trim, 'cloth');
  // One fitted shell from the hem up to the neck, so the torso reads as a single soft form.
  const hemY = T * (0.12 - 0.42 * (1 - g.length * 2));
  const topY = T * 0.9;
  const body = mesh(fittedShell(spec, hemY, topY, CLOTH_GAP), cloth, 'jumper');
  body.position.y = -T * 0.3; // shell is built in hips space; it hangs from the spine joint
  j.spine.add(body);
  // Ribbed hem band.
  const r = torsoRadiiAt(spec, hemY);
  const hem = mesh(new THREE.CylinderGeometry(1, 1, 0.035, 16, 1, true), mat(g.trim, 'cloth', true), 'jumper-hem');
  hem.scale.set(r.rx * CLOTH_GAP * 1.03, 1, r.rz * CLOTH_GAP * 1.03);
  hem.position.set(0, hemY + 0.015 - T * 0.3, r.zc);
  j.spine.add(hem);
  // Rolled neck band.
  const neckband = mesh(new THREE.TorusGeometry(spec.head.radius * 0.55, 0.025, 5, 12), trim, 'jumper-neck');
  neckband.rotation.x = Math.PI / 2;
  neckband.position.y = T * 0.25;
  j.chest.add(neckband);
}

/**
 * A garment shell fitted to the torso between two heights (hips space), optionally open at the
 * front by `gap` radians either side of centre. Narrows to the neck at the top.
 */
export function fittedShell(spec: AnimalSpec, yBottom: number, yTop: number, layer: number, gap = 0): THREE.BufferGeometry {
  const b = spec.body;
  const neckR = spec.head.radius * 0.5;
  const geo = new THREE.CylinderGeometry(1, 1, yTop - yBottom, 18, 14, true, gap, Math.PI * 2 - gap * 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) + (yTop + yBottom) / 2;
    const r = torsoRadiiAt(spec, y);
    const rx = Math.max(r.rx, neckR) * layer;
    const rz = Math.max(r.rz, neckR * 0.9) * layer;
    pos.setXYZ(i, pos.getX(i) * rx, y, pos.getZ(i) * rz + r.zc * (1 - Math.max(0, (y - b.torsoLength * 0.6) / (b.torsoLength * 0.4))));
  }
  geo.computeVertexNormals();
  return geo;
}

function ellipseRadiusAt(r: number, ry: number, dy: number): number {
  return r * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2));
}

function apron(spec: AnimalSpec, g: Extract<GarmentSpec, { kind: 'apron' }>, j: Joints): void {
  const b = spec.body;
  const cloth = mat(g.colour, 'cloth', true);
  // Skirt: an open, front-facing curved panel from the waist to below the haunches.
  const waistY = b.torsoLength * 0.22;
  const skirtH = g.length;
  const skirt = new THREE.CylinderGeometry(1, 1.1, skirtH, 12, 1, true, -1.0, 2.0);
  const s = mesh(skirt, cloth, 'apron-skirt');
  s.scale.set(b.hipWidth * 1.12, 1, b.depth * (1 + b.belly * 0.15) * 1.12);
  s.position.set(0, waistY - skirtH / 2, b.belly * 0.02);
  j.hips.add(s);
  // Waist tie and a bow at the back.
  const trim = mat(g.trim ?? g.colour, 'cloth');
  const tie = mesh(new THREE.TorusGeometry(1, 0.018, 4, 18), trim, 'apron-tie');
  tie.rotation.x = Math.PI / 2;
  // Tie sits outside any jumper (which is scaled by CLOTH_GAP), so measure from that surface.
  const waistR = ellipseRadiusAt(b.hipWidth * CLOTH_GAP, b.torsoLength * 0.42 * CLOTH_GAP, waistY - b.torsoLength * 0.12) * 1.06;
  const waistD = ellipseRadiusAt(b.depth * (1 + b.belly * 0.15) * CLOTH_GAP, b.torsoLength * 0.42 * CLOTH_GAP, waistY - b.torsoLength * 0.12) * 1.08;
  tie.scale.set(waistR, waistD, 1);
  tie.position.set(0, waistY, b.belly * 0.02);
  j.hips.add(tie);
  for (const sx of [1, -1]) {
    const loop = mesh(lowSphere(6, 4), trim, 'apron-bow');
    loop.scale.set(0.045, 0.028, 0.015);
    loop.position.set(sx * 0.04, waistY, -waistD - 0.01 + b.belly * 0.02);
    loop.rotation.z = sx * 0.4;
    j.hips.add(loop);
  }
  if (g.pocket) {
    // Two patch pockets toward the sides, following the skirt's curve.
    const rx = b.hipWidth * 1.12 * 1.06, rz = b.depth * (1 + b.belly * 0.15) * 1.12 * 1.06;
    for (const side of [1, -1]) {
      const theta = side * 0.62;
      const pocket = mesh(box(0.075, 0.065, 0.012), trim, 'apron-pocket');
      pocket.position.set(Math.sin(theta) * rx, waistY - skirtH * 0.42, Math.cos(theta) * rz + b.belly * 0.02);
      pocket.rotation.set(-0.1, theta, 0);
      j.hips.add(pocket);
    }
  }
}

function collar(spec: AnimalSpec, g: Extract<GarmentSpec, { kind: 'collar' }>, j: Joints): void {
  const cloth = mat(g.colour, 'cloth', true);
  // Two rounded collar points lying on the chest below the chin.
  for (const sx of [1, -1]) {
    const point = mesh(new THREE.CircleGeometry(1, 6), cloth, 'collar');
    point.scale.set(0.055, 0.04, 1);
    point.position.set(sx * 0.045, spec.body.torsoLength * 0.22, spec.body.depth * 0.62);
    point.rotation.set(-0.85, sx * 0.25, sx * 0.5);
    j.chest.add(point);
  }
}

function scarf(spec: AnimalSpec, g: Extract<GarmentSpec, { kind: 'scarf' }>, j: Joints): void {
  const cloth = mat(g.colour, 'cloth');
  const wrap = mesh(new THREE.TorusGeometry(spec.head.radius * 0.6, 0.04, 6, 12), cloth, 'scarf');
  wrap.rotation.x = Math.PI / 2;
  wrap.position.y = -0.02;
  j.neck.add(wrap);
  const tail = mesh(box(0.07, 0.18, 0.025), mat(g.trim ?? g.colour, 'cloth'), 'scarf-end');
  tail.position.set(0.06, -0.1, spec.body.depth * 0.7);
  tail.rotation.set(-0.2, 0, 0.15);
  j.neck.add(tail);
}

export function dressArm(spec: AnimalSpec, outfit: OutfitSpec, j: Joints, side: 'L' | 'R'): void {
  const jumper = outfit.garments.find((g) => g.kind === 'jumper') as Extract<GarmentSpec, { kind: 'jumper' }> | undefined;
  if (!jumper) return;
  const a = spec.arms;
  const cloth = mat(jumper.colour, 'cloth');
  const upper = mesh(capsule(a.thickness * 1.15, a.upper * 0.9, 3, 7), cloth, 'sleeve');
  upper.position.y = -a.upper / 2;
  j[`shoulder${side}`].add(upper);
  if (jumper.sleeves === 'long') {
    const lowerLen = a.lower * 0.7;
    const lower = mesh(capsule(a.thickness * 1.08, lowerLen, 3, 7), cloth, 'sleeve');
    lower.position.y = -lowerLen / 2;
    j[`elbow${side}`].add(lower);
    const cuff = mesh(new THREE.CylinderGeometry(a.thickness * 1.2, a.thickness * 1.2, 0.03, 8), mat(jumper.trim, 'cloth'), 'cuff');
    cuff.position.y = -lowerLen - a.thickness * 0.4;
    j[`elbow${side}`].add(cuff);
  }
}

/**
 * Body surface radii at height `y` in hips space: the larger of the belly and chest masses.
 * Lets garments and straps follow the torso as one continuous form.
 */
export function torsoRadiiAt(spec: AnimalSpec, y: number): { rx: number; rz: number; zc: number } {
  const b = spec.body;
  const T = b.torsoLength;
  const ell = (cy: number, ry: number, rx: number, rz: number) => {
    const k = Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2));
    return { rx: rx * k, rz: rz * k };
  };
  const bz = b.depth * (1 + b.belly * 0.15);
  const belly = ell(T * 0.12, T * 0.42, b.hipWidth, bz);
  const chest = ell(T * 0.65, T * 0.36, b.chestWidth, b.depth * 0.92);
  // Fill the waist between the two masses so clothing never pinches into an hourglass.
  const t = Math.min(1, Math.max(0, (y - T * 0.12) / (T * 0.53)));
  const inside = y >= T * 0.12 && y <= T * 0.65;
  const fx = inside ? b.hipWidth + (b.chestWidth - b.hipWidth) * t : 0;
  const fz = inside ? bz + (b.depth * 0.92 - bz) * t : 0;
  return { rx: Math.max(belly.rx, chest.rx, fx), rz: Math.max(belly.rz, chest.rz, fz), zc: b.belly * 0.02 };
}

/** Open-fronted waistcoat: one fitted shell from hem to shoulders, buttons down one edge. */
function waistcoat(spec: AnimalSpec, g: Extract<GarmentSpec, { kind: 'waistcoat' }>, j: Joints): void {
  const b = spec.body;
  const T = b.torsoLength;
  const gap = 0.3; // half-angle of the open front, radians
  const layer = CLOTH_GAP * 1.07; // over a shirt or jumper
  const yBottom = T * 0.12 - T * 0.42 * (1 - g.length) * 0.9;
  const yTop = T * 0.86;
  const vest = mesh(fittedShell(spec, yBottom, yTop, layer, gap), mat(g.colour, 'cloth', true), 'waistcoat');
  vest.position.y = -T * 0.3;
  j.spine.add(vest);
  // Buttons down the wearer's right front edge.
  const btn = mat(g.buttons, 'gloss');
  for (let i = 0; i < 3; i++) {
    const y = yBottom + (yTop - yBottom) * (0.18 + i * 0.2);
    const r = torsoRadiiAt(spec, y);
    const a = -gap; // the right front edge (x < 0)
    const bb = mesh(new THREE.SphereGeometry(1, 6, 4), btn, 'button');
    bb.scale.setScalar(0.012);
    bb.position.set(Math.sin(a) * r.rx * layer * 1.03, y - T * 0.3, Math.cos(a) * r.rz * layer * 1.03 + r.zc);
    j.spine.add(bb);
  }
}

/** Flat cap: a squashed crown with a short front brim, set on the head between the ears. */
function cap(spec: AnimalSpec, g: Extract<GarmentSpec, { kind: 'cap' }>, j: Joints): void {
  const R = spec.head.radius;
  const P = spec.head.profile;
  const at = (P ? P.earAt + 0.25 : 0) * R;
  let topY = R * 0.9, width = R * 0.8;
  if (P) {
    let best = { at: 0, w: 1, h: 1, c: 0 };
    for (const r of P.rings) if (Math.abs(r.at * R - at) < Math.abs(best.at * R - at)) best = r;
    topY = (best.c + best.h * 0.92) * R;
    width = best.w * R * 0.72;
  }
  const cloth = mat(g.colour, 'cloth');
  const capG = new THREE.Group();
  capG.name = 'cap';
  const crown = mesh(new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), cloth, 'cap-crown');
  crown.scale.set(width, width * 0.62, width * 1.12);
  capG.add(crown);
  const brim = mesh(new THREE.CylinderGeometry(1, 1, 0.012, 12, 1, false, -1.1, 2.2), mat(g.colour, 'cloth', true), 'cap-brim');
  brim.scale.set(width * 0.9, 1, width * 0.75);
  brim.position.set(0, 0.004, width * 0.75);
  brim.rotation.x = 0.12;
  capG.add(brim);
  if (g.band) {
    const band = mesh(new THREE.CylinderGeometry(1, 1, 0.02, 12, 1, true), mat(g.band, 'cloth', true), 'cap-band');
    band.scale.set(width * 1.01, 1, width * 1.13);
    band.position.y = 0.012;
    capG.add(band);
  }
  capG.position.set(0, topY - width * 0.22, at);
  capG.rotation.set(0.12, 0, g.tilt ?? 0);
  j.head.add(capG);
}

/**
 * How far the outermost garment stands off the body at height `y` (hips space), as a scale on
 * the torso radii. Used to keep hanging arms clear of clothing.
 */
export function outerLayerAt(spec: AnimalSpec, outfit: OutfitSpec, y: number): number {
  let layer = 1;
  for (const g of outfit.garments) {
    if (g.kind === 'jumper') layer = Math.max(layer, CLOTH_GAP);
    if (g.kind === 'waistcoat') layer = Math.max(layer, CLOTH_GAP * 1.07);
    if (g.kind === 'apron' && y < spec.body.torsoLength * 0.22) layer = Math.max(layer, 1.22);
  }
  return layer;
}
