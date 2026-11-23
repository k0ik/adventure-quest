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
    }
  }
}

function jumper(spec: AnimalSpec, g: Extract<GarmentSpec, { kind: 'jumper' }>, j: Joints): void {
  const b = spec.body;
  const cloth = mat(g.colour, 'cloth');
  const trim = mat(g.trim, 'cloth');
  // Chest piece covers the chest mass.
  const top = mesh(lowSphere(10, 8), cloth, 'jumper-chest');
  top.scale.set(b.chestWidth * CLOTH_GAP, b.torsoLength * 0.38, b.depth * 0.92 * CLOTH_GAP);
  j.chest.add(top);
  // Body piece covers the upper belly down to `length` (0 = hips, 1 = chest).
  const bodyPart = mesh(lowSphere(10, 8), cloth, 'jumper-body');
  bodyPart.scale.set(b.hipWidth * CLOTH_GAP, b.torsoLength * 0.42 * CLOTH_GAP, b.depth * (1 + b.belly * 0.15) * CLOTH_GAP);
  bodyPart.position.set(0, b.torsoLength * 0.12, b.belly * 0.02);
  // Clip the lower part by squashing upward: the hem sits at `length` of the belly height.
  const hemY = b.torsoLength * (0.12 - 0.42 * (1 - g.length * 2));
  const clipped = clipBelow(bodyPart, hemY);
  j.hips.add(clipped);
  // Ribbed hem band.
  const hemR = ellipseRadiusAt(b.hipWidth, b.torsoLength * 0.42, hemY - b.torsoLength * 0.12) * CLOTH_GAP * 1.02;
  const hemD = ellipseRadiusAt(b.depth * (1 + b.belly * 0.15), b.torsoLength * 0.42, hemY - b.torsoLength * 0.12) * CLOTH_GAP * 1.02;
  const hem = mesh(new THREE.CylinderGeometry(1, 1, 0.035, 14, 1, true), mat(g.trim, 'cloth', true), 'jumper-hem');
  hem.scale.set(hemR, 1, hemD);
  hem.position.set(0, hemY + 0.015, b.belly * 0.02);
  j.hips.add(hem);
  // Rolled neck band.
  const neckband = mesh(new THREE.TorusGeometry(spec.head.radius * 0.55, 0.025, 5, 12), trim, 'jumper-neck');
  neckband.rotation.x = Math.PI / 2;
  neckband.position.y = b.torsoLength * 0.26;
  j.chest.add(neckband);
}

/** Return a copy of a sphere-mesh with vertices below `y` (in parent space) flattened to `y`. */
function clipBelow(m: THREE.Mesh, y: number): THREE.Mesh {
  const geo = (m.geometry as THREE.BufferGeometry).clone();
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const localY = (y - m.position.y) / m.scale.y;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < localY) pos.setY(i, localY);
  geo.computeVertexNormals();
  const out = new THREE.Mesh(geo, m.material);
  out.name = m.name;
  out.position.copy(m.position);
  out.scale.copy(m.scale);
  return out;
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
