import * as THREE from 'three';
import { mat, mesh, enableShadows, vertexColourMat, smoothGloss } from '../../art/materials';
import { palette } from '../../art/palette';
import { ball, capsule, lowSphere, cylinder, paintFaces } from '../../art/geometry';
import { headSection, earSection, loftY, loftZ, ringAt, sliceRings, type Ring } from './loft';
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
  const limbFur = spec.fur.limbs ? mat(spec.fur.limbs) : fur;
  const pawFur = spec.fur.paws ? mat(spec.fur.paws) : furLight;
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
    // Kept just inside any garment surface so clothing always covers it cleanly.
    patch.scale.set(b.hipWidth * 0.62 * spec.bellyPatch, b.torsoLength * 0.34, b.depth * 0.55);
    patch.position.set(0, b.torsoLength * 0.12, b.depth * (1 + b.belly * 0.15) * 0.4 + b.belly * 0.02);
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
    const upper = mesh(capsule(a.thickness, a.upper, 3, 7), limbFur, 'upper-arm');
    upper.position.y = -a.upper / 2;
    shoulder.add(upper);
    const elbow = joint(`elbow${side}`, shoulder, 0, -a.upper, 0);
    const lower = mesh(capsule(a.thickness * 0.92, a.lower, 3, 7), limbFur, 'forearm');
    lower.position.y = -a.lower / 2;
    elbow.add(lower);
    const hand = joint(`hand${side}`, elbow, 0, -a.lower - a.thickness * 0.4, 0);
    const paw = mesh(ball(1), pawFur, 'paw');
    paw.scale.set(a.paw, a.paw * 1.1, a.paw * 0.9);
    hand.add(paw);
    shoulder.rotation.z = sx * 0.12;
  }

  // Legs: a haunch on the hip, short shin, big foot.
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? 1 : -1;
    const l = spec.legs;
    const leg = joint(`leg${side}`, hips, sx * b.hipWidth * 0.55, 0, 0);
    const haunch = mesh(lowSphere(8, 6), limbFur, 'haunch');
    haunch.scale.set(l.haunch * 0.85, l.haunch, l.haunch * 1.05);
    haunch.position.set(sx * 0.01, -l.haunch * 0.15, 0);
    leg.add(haunch);
    const shinLen = Math.max(0.01, b.hipHeight - l.foot.height - l.thickness);
    const shin = mesh(capsule(l.thickness, shinLen, 3, 7), limbFur, 'shin');
    shin.position.y = -b.hipHeight / 2;
    leg.add(shin);
    const foot = joint(`foot${side}`, leg, 0, -b.hipHeight + l.foot.height / 2, 0);
    const footMesh = mesh(ball(1), pawFur, 'foot');
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

  for (const [name, r] of Object.entries(pose)) {
    const o = j[name as JointName];
    if (o) o.rotation.set(o.rotation.x + r[0], o.rotation.y + r[1], o.rotation.z + r[2]);
  }
  // Accessories after posing: some (a staff) are placed from where the posed hand ends up.
  root.updateMatrixWorld(true);
  for (const acc of accessories) buildAccessory(acc, j, spec);

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
  if (h.profile) {
    buildLoftHead(spec, head, fur, furLight);
    buildEars(spec, head, j, fur, furInner);
    return;
  }
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
  }

  buildEars(spec, head, j, fur, furInner);
}

function buildEars(
  spec: AnimalSpec,
  head: THREE.Object3D,
  j: Record<JointName, THREE.Object3D>,
  fur: THREE.Material,
  furInner: THREE.Material,
): void {
  const h = spec.head;
  const R = h.radius;
  const ears = spec.ears;
  if (ears.colour) fur = mat(ears.colour);
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? 1 : -1;
    let base: THREE.Vector3;
    if (h.profile) {
      const r = ringAt(h.profile.rings, h.profile.earAt);
      const spread = ears.spread ?? 0.42;
      base = new THREE.Vector3(sx * r.w * R * spread, (r.c + r.h * Math.sqrt(Math.max(0.05, 1 - spread * spread)) * 0.92) * R, h.profile.earAt * R);
    } else {
      base = new THREE.Vector3(sx * R * h.scale[0] * 0.42, R * h.scale[1] * 0.82, -R * 0.12);
    }
    const ear = new THREE.Group();
    ear.name = `joint:ear${side}`;
    ear.position.copy(base);
    ear.rotation.set(-ears.tilt, sx * 0.25, -sx * ears.splay);
    head.add(ear);
    j[`ear${side}`] = ear;

    if (ears.kind === 'long') {
      const droop = ears.droop?.side === (side === 'L' ? 'left' : 'right') ? ears.droop : undefined;
      const split = droop ? droop.at : 1;
      ear.add(leafEar(ears.width, ears.length, 0, split, fur, furInner));
      const tipJoint = new THREE.Group();
      tipJoint.name = `joint:earTip${side}`;
      tipJoint.position.y = ears.length * split;
      ear.add(tipJoint);
      j[`earTip${side}`] = tipJoint;
      if (droop) {
        // Flop outward to the side so the fold reads clearly in silhouette.
        tipJoint.rotation.x = droop.angle * 0.25;
        tipJoint.rotation.z = -sx * droop.angle;
        const tip = leafEar(ears.width, ears.length, split, 1, fur, furInner);
        tip.position.y = -ears.length * split;
        tipJoint.add(tip);
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

/** Leaf-shaped faceted ear (broadest a third of the way up, pointed tip) with an inset lining. */
const earProfile: Ring[] = [
  { at: 0, w: 0.5, h: 0.42, c: 0 },
  { at: 0.18, w: 0.88, h: 0.4, c: 0 },
  { at: 0.42, w: 1, h: 0.36, c: 0.04 },
  { at: 0.72, w: 0.72, h: 0.3, c: 0.04 },
  { at: 0.93, w: 0.25, h: 0.18, c: 0.02 },
  { at: 1, w: 0.04, h: 0.04, c: 0 },
];
const liningProfile: Ring[] = [
  { at: 0.1, w: 0.3, h: 0.05, c: 0 },
  { at: 0.4, w: 0.66, h: 0.05, c: 0 },
  { at: 0.72, w: 0.46, h: 0.05, c: 0 },
  { at: 0.9, w: 0.1, h: 0.05, c: 0 },
];

function leafEar(width: number, length: number, from: number, to: number, fur: THREE.Material, inner: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const scaleRings = (rs: Ring[], depth: number, shift: number) =>
    rs.map((r) => ({ at: r.at * length, w: r.w * width, h: r.h * width * depth, c: r.c * width + shift }));
  const outer = mesh(loftY(scaleRings(sliceRings(earProfile, from, to), 1, 0), earSection, from === 0, to === 1), fur, 'ear');
  g.add(outer);
  const lf = Math.max(from, liningProfile[0].at), lt = Math.min(to, liningProfile[liningProfile.length - 1].at);
  if (lt > lf) {
    // The lining sits just proud of the ear's flat front face.
    const front = 0.36 * width; // approx front-face depth at the widest point
    const lining = mesh(loftY(scaleRings(sliceRings(liningProfile, lf, lt), 1, front * 0.98), earSection), inner, 'ear-inner');
    g.add(lining);
  }
  return g;
}

function buildLoftHead(spec: AnimalSpec, head: THREE.Object3D, fur: THREE.Material, furLight: THREE.Material): void {
  const h = spec.head;
  const R = h.radius;
  const P = h.profile!;
  const rings: Ring[] = P.rings.map((r) => ({ at: r.at * R, w: r.w * R, h: r.h * R, c: r.c * R }));
  const geo = loftZ(rings, headSection);
  // Two-tone by facet: subtle lighter muzzle and chin, the rest main fur.
  const main = P.base ? new THREE.Color(palette[P.base]) : new THREE.Color().copy((fur as THREE.MeshStandardMaterial).color);
  const light = new THREE.Color().copy((furLight as THREE.MeshStandardMaterial).color);
  const marks = (P.paint ?? []).map((m) => ({ ...m, c: new THREE.Color(palette[m.colour]) }));
  const within = (v: number, r?: [number, number]) => !r || (v >= r[0] && v <= r[1]);
  const muzzle = main.clone().lerp(light, P.muzzleTint);
  const chin = main.clone().lerp(light, P.muzzleTint * 0.8);
  const front = rings[rings.length - 1].at;
  paintFaces(geo, (c, n) => {
    const r = ringAt(rings, c.z);
    const up = (c.y - r.c) / Math.max(1e-6, r.h);
    for (const m of marks) {
      if (within(Math.abs(c.x) / R, m.absX) && within(c.z / R, m.at) && within(up, m.up)) return m.c;
    }
    if (c.z > front * 0.55 && c.y < r.c) return muzzle;
    if (n.y < -0.55) return chin;
    return main;
  });
  head.add(mesh(geo, vertexColourMat('matte'), 'skull'));

  // Nose: a small inverted triangle on the top front of the snout.
  const tip = rings[rings.length - 1];
  const nose = mesh(new THREE.CircleGeometry(1, 3), mat(spec.fur.nose, 'gloss', true), 'nose');
  nose.scale.set(h.noseSize * 1.3, h.noseSize, 1);
  nose.rotation.set(-0.45, 0, -Math.PI / 2);
  nose.position.set(0, tip.c + tip.h * 0.5, tip.at + Math.min(tip.w, tip.h) * 0.3);
  head.add(nose);

  // Eyes: glossy domes seated on the head's actual surface (no modelled highlight; the gloss
  // material catches real light). A ray from inside the head finds
  // the facet each eye sits on; the eye is aligned to that facet's normal so no facet edge
  // cuts through it.
  const e = spec.eyes;
  const er = ringAt(rings, (e.at ?? 0.3) * R);
  const ang = e.angle ?? 0.3;
  const probe = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const ray = new THREE.Raycaster();
  for (const sx of [1, -1]) {
    const from = new THREE.Vector3(0, er.c, er.at);
    const dir = new THREE.Vector3(sx * Math.cos(ang), Math.sin(ang), 0.45).normalize();
    ray.set(from, dir);
    const hit = ray.intersectObject(probe, false)[0];
    if (!hit || !hit.face) continue;
    const normal = hit.face.normal.clone().normalize();
    const eye = mesh(lowSphere(14, 10), smoothGloss(e.colour ?? 'eye'), 'eye');
    eye.scale.set(e.size, e.size * 1.15, e.size * 0.42);
    // Centre just outside the facet: a shallow dome that never intersects the face.
    eye.position.copy(hit.point).addScaledVector(normal, e.size * 0.12);
    eye.lookAt(eye.position.clone().add(normal));
    head.add(eye);
    if (e.rim) {
      // A thin lighter ring so a dark eye still reads against dark fur.
      const rim = mesh(new THREE.CircleGeometry(1, 12), mat(e.rim), 'eye-rim');
      rim.scale.set(e.size * 1.28, e.size * 1.45, 1);
      rim.position.copy(hit.point).addScaledVector(normal, 0.002);
      rim.lookAt(rim.position.clone().add(normal));
      head.add(rim);
    }
  }
  probe.material.dispose();
}
