import * as THREE from 'three';
import { mat, mesh } from '../../art/materials';
import { cylinder } from '../../art/geometry';
import type { AccessorySpec, AnimalSpec, JointName } from './types';
import { torsoRadiiAt } from './outfit';

/** Small personal props that tell the player who a resident is and what they do. */
export function buildAccessory(acc: AccessorySpec, j: Record<JointName, THREE.Object3D>, spec: AnimalSpec): void {
  switch (acc.kind) {
    case 'teacup': {
      const hand = j[acc.hand === 'left' ? 'handL' : 'handR'];
      const g = new THREE.Group();
      g.name = 'accessory:teacup';
      const china = mat(acc.colour, 'gloss');
      const saucer = mesh(cylinder(0.07, 0.05, 0.012, 10), china, 'saucer');
      g.add(saucer);
      const cup = mesh(cylinder(0.045, 0.032, 0.05, 10), china, 'cup');
      cup.position.y = 0.031;
      g.add(cup);
      const band = mesh(cylinder(0.0465, 0.043, 0.012, 10, true), mat(acc.band, 'gloss', true), 'cup-band');
      band.position.y = 0.045;
      g.add(band);
      const handle = mesh(new THREE.TorusGeometry(0.016, 0.005, 4, 8), china, 'cup-handle');
      handle.position.set(0.05, 0.032, 0);
      g.add(handle);
      // Sits on top of the paw, held level.
      g.position.set(0, 0.035, 0.02);
      hand.add(g);
      break;
    }
    case 'staff': {
      // Stands on the ground where the posed hand is, rising a little above the grip.
      const hand = j[acc.hand === 'left' ? 'handL' : 'handR'];
      const p = new THREE.Vector3();
      hand.getWorldPosition(p);
      const top = p.y + acc.extra;
      const g = new THREE.Group();
      g.name = 'accessory:staff';
      const shaft = mesh(cylinder(0.016, 0.02, top, 6), mat(acc.colour, 'wood'), 'staff');
      shaft.position.y = top / 2;
      g.add(shaft);
      const knob = mesh(new THREE.IcosahedronGeometry(1, 0), mat(acc.knob, 'wood'), 'staff-knob');
      knob.scale.set(0.034, 0.04, 0.034);
      knob.position.y = top + 0.02;
      g.add(knob);
      g.position.set(p.x, 0, p.z + 0.01);
      j.root.add(g);
      break;
    }
    case 'satchel': {
      const sx = acc.side === 'left' ? 1 : -1;
      const b = spec.body;
      const leather = mat(acc.colour, 'matte');
      const g = new THREE.Group();
      g.name = 'accessory:satchel';
      const bag = mesh(new THREE.BoxGeometry(0.06, 0.13, 0.16), leather, 'satchel');
      g.add(bag);
      const flap = mesh(new THREE.BoxGeometry(0.066, 0.07, 0.165), mat(acc.strap, 'matte'), 'satchel-flap');
      flap.position.set(0.004, 0.035, 0);
      g.add(flap);
      const buckle = mesh(new THREE.BoxGeometry(0.008, 0.022, 0.03), mat(acc.buckle, 'metal'), 'satchel-buckle');
      buckle.position.set(0.04, 0.005, 0);
      g.add(buckle);
      g.position.set(sx * (b.hipWidth * 1.18 + 0.03), b.torsoLength * 0.12, b.depth * 0.25);
      g.rotation.set(0, 0, sx * 0.08);
      j.hips.add(g);
      // Strap from the bag across the front to the opposite shoulder, laid on the torso surface
      // (or the outermost garment) as a chain of short segments.
      const strapMat = mat(acc.strap, 'matte');
      const T = b.torsoLength;
      const lift = 1.2; // clear of shirt and waistcoat
      const pts: THREE.Vector3[] = [];
      const n = 10;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const y = THREE.MathUtils.lerp(T * 0.2, T * 0.9, t);
        const r = torsoRadiiAt(spec, y);
        const rx = Math.max(r.rx, b.chestWidth * 0.55), rz = Math.max(r.rz, b.depth * 0.5);
        // Angle around the body: from the bag's side toward the front, then up to the far shoulder.
        const ang = THREE.MathUtils.lerp(sx * 1.25, -sx * 0.75, t);
        pts.push(new THREE.Vector3(Math.sin(ang) * rx * lift, y, Math.cos(ang) * rz * lift + r.zc));
      }
      // A continuous flat-ish band along the surface path.
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.013, 4, false);
      const strap = mesh(tube, strapMat, 'satchel-strap');
      strap.position.y = -T * 0.3;
      j.spine.add(strap);
      break;
    }
  }
}
