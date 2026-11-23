import * as THREE from 'three';
import { mat, mesh, enableShadows } from '../../art/materials';
import { ball, capsule, lowSphere, cylinder } from '../../art/geometry';
import type { AccessorySpec, AnimalRig, AnimalSpec, JointName, OutfitSpec, Pose } from './types';
import { dressTorso, dressArm } from './outfit';
import { buildAccessory } from './accessories';

/**
 * Assemble an upright animal from primitives on a joint hierarchy:
 * root → hips → spine → chest → neck → head (→ ears), chest → shoulders → elbows → hands,
 * hips → legs → feet, hips → tail. Species differ by proportions and part kinds, not colour alone.
 */
export function buildAnimal(spec: AnimalSpec, outfit: OutfitSpec, accessories: AccessorySpec[] = [], pose: Pose = {}): AnimalRig {
  const fur = mat(spec.fur.main);
  const furLight = mat(spec.fur.light);
  const furInner = mat(spec.fur.inner);
  const b = spec.body;
  const j = {} as Record<JointName, THREE.Object3D>;
  const joint = (name: JointName, parent: THREE.Object3D | null, x = 0, y = 0, z = 0) => {
    const o = new THREE.Group();
    o.name = `joint:${name}`;
    o.position.set(x, y, z);
    parent?.add(o);
    j[name] = o;
    return o;
  };

  const root = joint('root', null) as THREE.Group;
  root.name = `animal:${spec.id}`;
  const hips = joint('hips', root, 0, b.hipHeight, 0);
  const spine = joint('spine', hips, 0, b.torsoLength * 0.3, 0);
  spine.rotation.x = spec.stance?.lean ?? 0;
  const chest = joint('chest', spine, 0, b.torsoLength * 0.35, 0);
  const neck = joint('neck', chest, 0, b.torsoLength * 0.35, 0);
  const head = joint('head', neck, 0, spec.head.radius * 0.75, 0);

  // Torso as fur: haunch/belly mass. Garments are layered over it by the outfit builder.
  const belly = mesh(lowSphere(10, 8), fur, 'belly');
  belly.scale.set(b.hipWidth, b.torsoLength * 0.42, b.depth * (1 + b.belly * 0.15));
  belly.position.set(0, b.torsoLength * 0.12, b.belly * 0.02);
  hips.add(belly);
  if (spec.bellyPatch) {
    const patch = mesh(lowSphere(10, 8), furLight, 'belly-patch');
    patch.scale.set(b.hipWidth * 0.62 * spec.bellyPatch, b.torsoLength * 0.34, b.depth * 0.6);
    patch.position.set(0, b.torsoLength * 0.12, b.depth * (1 + b.belly * 0.15) * 0.48 + b.belly * 0.02);
    hips.add(patch);
  }
  const chestMass = mesh(lowSphere(10, 8), fur, 'chest');
  chestMass.scale.set(b.chestWidth, b.torsoLength * 0.36, b.depth * 0.92);
  chestMass.position.set(0, 0, 0);
  chest.add(chestMass);
  const neckMass = mesh(cylinder(spec.head.radius * 0.42, b.chestWidth * 0.6, b.torsoLength * 0.3, 8), fur, 'neck');
  neckMass.position.y = -b.torsoLength * 0.08;
  neck.add(neckMass);

  buildHead(spec, head, j, fur, furLight, furInner);

  // Arms hang from the chest; each has upper, lower, paw.
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? 1 : -1;
    const shoulder = joint(`shoulder${side}`, chest, sx * b.chestWidth * 0.92, b.torsoLength * 0.12, 0);
    const a = spec.arms;
    const upper = mesh(capsule(a.thickness, a.upper, 3, 7), fur, 'upper-arm');
    upper.position.y = -a.upper / 2;
    shoulder.add(upper);
    const elbow = joint(`elbow${side}`, shoulder, 0, -a.upper, 0);
    const lower = mesh(capsule(a.thickness * 0.92, a.lower, 3, 7), fur, 'forearm');
    lower.position.y = -a.lower / 2;
    elbow.add(lower);
    const hand = joint(`hand${side}`, elbow, 0, -a.lower - a.thickness * 0.4, 0);
    const paw = mesh(ball(1), furLight, 'paw');
    paw.scale.set(a.paw, a.paw * 1.1, a.paw * 0.9);
    hand.add(paw);
    shoulder.rotation.z = sx * 0.12;
  }

  // Legs: a haunch on the hip, short shin, big foot.
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? 1 : -1;
    const l = spec.legs;
    const leg = joint(`leg${side}`, hips, sx * b.hipWidth * 0.55, 0, 0);
    const haunch = mesh(lowSphere(8, 6), fur, 'haunch');
    haunch.scale.set(l.haunch * 0.85, l.haunch, l.haunch * 1.05);
    haunch.position.set(sx * 0.01, -l.haunch * 0.15, 0);
    leg.add(haunch);
    const shinLen = Math.max(0.01, b.hipHeight - l.foot.height - l.thickness);
    const shin = mesh(capsule(l.thickness, shinLen, 3, 7), fur, 'shin');
    shin.position.y = -b.hipHeight / 2;
    leg.add(shin);
    const foot = joint(`foot${side}`, leg, 0, -b.hipHeight + l.foot.height / 2, 0);
    const footMesh = mesh(ball(1), furLight, 'foot');
    footMesh.scale.set(l.foot.width, l.foot.height / 2 + 0.01, l.foot.length / 2);
    footMesh.position.set(0, 0, l.foot.length * 0.28);
    foot.add(footMesh);
    leg.rotation.y = sx * 0.12; // toes turned slightly out
  }

  // Tail.
  const tail = joint('tail', hips, 0, b.torsoLength * 0.02, -b.depth * 0.95);
  if (spec.tail.kind === 'puff') {
    const puff = mesh(ball(1), furLight, 'tail');
    puff.scale.setScalar(spec.tail.size);
    tail.add(puff);
  } else if (spec.tail.kind === 'stub') {
    const stub = mesh(ball(1), fur, 'tail');
    stub.scale.set(spec.tail.size, spec.tail.size * 0.7, spec.tail.size);
    tail.add(stub);
  } else {
    const brush = mesh(capsule(spec.tail.size * 0.3, spec.tail.size, 3, 6), fur, 'tail');
    brush.rotation.x = -1.1;
    brush.position.set(0, spec.tail.size * 0.3, -spec.tail.size * 0.4);
    tail.add(brush);
  }

  dressTorso(spec, outfit, j);
  for (const side of ['L', 'R'] as const) dressArm(spec, outfit, j, side);
  for (const acc of accessories) buildAccessory(acc, j);

  for (const [name, r] of Object.entries(pose)) {
    const o = j[name as JointName];
    if (o) o.rotation.set(o.rotation.x + r[0], o.rotation.y + r[1], o.rotation.z + r[2]);
  }

  enableShadows(root);
  return { object: root, joints: j };
}

function buildHead(
  spec: AnimalSpec,
  head: THREE.Object3D,
  j: Record<JointName, THREE.Object3D>,
  fur: THREE.Material,
  furLight: THREE.Material,
  furInner: THREE.Material,
): void {
  const h = spec.head;
  const R = h.radius;
  const skull = mesh(lowSphere(10, 8), fur, 'skull');
  skull.scale.set(R * h.scale[0], R * h.scale[1], R * h.scale[2]);
  head.add(skull);
  if (h.mask) {
    // Two-tone face: a pale blaze set slightly into the lower front of the head.
    const mask = mesh(lowSphere(10, 8), furLight, 'face-mask');
    mask.scale.set(R * h.scale[0] * 0.6 * h.mask, R * h.scale[1] * 0.5 * h.mask, R * h.scale[2] * 0.6);
    mask.position.set(0, -R * 0.3, R * h.scale[2] * 0.44);
    head.add(mask);
  }

  // Muzzle and cheeks: light fur at the front-lower face. Mouthless by design.
  const m = h.muzzle;
  const muzzle = mesh(lowSphere(10, 7), furLight, 'muzzle');
  muzzle.scale.set(m.width, m.height, m.length);
  muzzle.position.set(0, -m.drop, R * h.scale[2] * 0.78);
  head.add(muzzle);
  if (h.cheeks > 0) {
    for (const sx of [1, -1]) {
      const cheek = mesh(lowSphere(10, 8), furLight, 'cheek');
      const cr = R * 0.36 * h.cheeks;
      cheek.scale.set(cr, cr * 0.82, cr * 0.85);
      cheek.position.set(sx * m.width * 0.62, -m.drop, R * h.scale[2] * 0.74);
      head.add(cheek);
    }
  }
  // Nose sits proud of the muzzle/cheek mass, at the top of the whisker pads.
  const cheekR = R * 0.36 * h.cheeks;
  const frontZ = Math.max(R * h.scale[2] * 0.78 + m.length * 0.85, h.cheeks > 0 ? R * h.scale[2] * 0.74 + cheekR * 0.8 : 0);
  const nose = mesh(ball(0), mat(spec.fur.nose, 'gloss'), 'nose');
  nose.scale.set(h.noseSize * 1.3, h.noseSize, h.noseSize);
  nose.position.set(0, -m.drop + (h.cheeks > 0 ? cheekR * 0.62 : m.height * 0.75), frontZ - h.noseSize * 0.2);
  head.add(nose);

  // Eyes: glossy dark beads with a small catch-light, set on the face surface.
  const e = spec.eyes;
  for (const sx of [1, -1]) {
    const eye = mesh(lowSphere(8, 6), mat('eye', 'gloss'), 'eye');
    eye.scale.set(e.size * 0.85, e.size, e.size * 0.6);
    const ex = sx * e.spacing;
    const ez = Math.sqrt(Math.max(0, 1 - (ex / (R * h.scale[0])) ** 2 - (e.height / (R * h.scale[1])) ** 2)) * R * h.scale[2];
    eye.position.set(ex, e.height, ez * 0.97);
    eye.lookAt(new THREE.Vector3(ex * 2.2, e.height * 1.2, ez * 3));
    head.add(eye);
    const glint = mesh(ball(0), mat('clothCream', 'gloss'), 'eye-glint');
    glint.scale.setScalar(e.size * 0.28);
    glint.position.set(ex + sx * e.size * 0.15, e.height + e.size * 0.4, ez * 0.97 + e.size * 0.45);
    head.add(glint);
  }

  // Ears.
  const ears = spec.ears;
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? 1 : -1;
    const base = new THREE.Vector3(sx * R * h.scale[0] * 0.42, R * h.scale[1] * 0.82, -R * 0.12);
    const ear = new THREE.Group();
    ear.name = `joint:ear${side}`;
    ear.position.copy(base);
    ear.rotation.set(-ears.tilt, 0, -sx * ears.splay);
    head.add(ear);
    j[`ear${side}`] = ear;

    if (ears.kind === 'long') {
      const droop = ears.droop?.side === (side === 'L' ? 'left' : 'right') ? ears.droop : undefined;
      const baseLen = ears.length * (droop ? droop.at : 1);
      const tipLen = ears.length - baseLen;
      const lower = earBlade(ears.width, baseLen, fur, furInner, droop ? 'base' : 'full');
      ear.add(lower);
      const tipJoint = new THREE.Group();
      tipJoint.name = `joint:earTip${side}`;
      tipJoint.position.y = baseLen;
      ear.add(tipJoint);
      j[`earTip${side}`] = tipJoint;
      if (droop) {
        // Flop outward to the side so the fold reads clearly in silhouette.
        tipJoint.rotation.x = droop.angle * 0.25;
        tipJoint.rotation.z = -sx * droop.angle;
        tipJoint.add(earBlade(ears.width * 0.95, tipLen, fur, furInner, 'tip'));
      }
    } else {
      const shape = mesh(ears.kind === 'round' ? lowSphere(8, 6) : capsule(1, 1, 2, 5), fur, 'ear');
      shape.scale.set(ears.width, ears.length, ears.width * 0.45);
      shape.position.y = ears.length * 0.5;
      ear.add(shape);
      const inner = mesh(lowSphere(8, 6), furInner, 'ear-inner');
      inner.scale.set(ears.width * 0.6, ears.length * 0.65, ears.width * 0.2);
      inner.position.set(0, ears.length * 0.5, ears.width * 0.22);
      ear.add(inner);
      j[`earTip${side}`] = ear;
    }
  }
}

/** A long ear blade: flattened capsule with an inner lining on the front face. */
function earBlade(width: number, length: number, fur: THREE.Material, inner: THREE.Material, part: 'full' | 'base' | 'tip'): THREE.Group {
  const g = new THREE.Group();
  const r = width;
  const bodyLen = Math.max(0.001, length - (part === 'base' ? r * 0.2 : r));
  const outer = mesh(capsule(1, 1, 3, 8), fur, 'ear');
  // Unit capsule is radius 1, length 1 (total 3). Scale to the blade's size.
  outer.scale.set(r, (bodyLen + r * 2) / 3, r * 0.42);
  outer.position.y = length / 2;
  g.add(outer);
  const lining = mesh(capsule(1, 1, 3, 8), inner, 'ear-inner');
  lining.scale.set(r * 0.58, ((bodyLen + r * 2) / 3) * 0.86, r * 0.2);
  lining.position.set(0, length / 2, r * 0.28);
  g.add(lining);
  return g;
}
