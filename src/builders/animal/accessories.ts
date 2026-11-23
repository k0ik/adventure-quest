import * as THREE from 'three';
import { mat, mesh } from '../../art/materials';
import { cylinder } from '../../art/geometry';
import type { AccessorySpec, JointName } from './types';

/** Small personal props that tell the player who a resident is and what they do. */
export function buildAccessory(acc: AccessorySpec, j: Record<JointName, THREE.Object3D>): void {
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
  }
}
