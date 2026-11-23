import * as THREE from 'three';
import { mat, glowMat, mesh, enableShadows } from '../art/materials';
import { box, cylinder } from '../art/geometry';

export interface OakHomeParams {
  id: string;
  /** Radius of the trunk where the door sits. */
  trunkRadius: number;
  doorHeight: number;
}

/**
 * A round front door, a small lit window and a doorstep set into the base of a great tree:
 * someone lives here. Built facing +Z; place it at the trunk's surface.
 */
export function buildOakHome(p: OakHomeParams): THREE.Group {
  const g = new THREE.Group();
  g.name = `oak-home:${p.id}`;
  const r = p.doorHeight / 2;
  const z = p.trunkRadius * 0.9;
  const door = mesh(cylinder(r, r, 0.06, 14), mat('clothMoss', 'wood'), 'door');
  door.rotation.x = Math.PI / 2;
  door.position.set(0, r + 0.04, z);
  g.add(door);
  // Vertical planks on the door face.
  for (const x of [-r * 0.33, r * 0.33]) {
    const seam = mesh(box(0.012, r * 1.8, 0.01), mat('timberDark', 'wood'), 'door-seam');
    seam.position.set(x, r + 0.04, z + 0.035);
    g.add(seam);
  }
  const frame = mesh(new THREE.TorusGeometry(r * 1.02, 0.045, 5, 16), mat('timberDark', 'wood'), 'door-frame');
  frame.position.set(0, r + 0.04, z + 0.01);
  g.add(frame);
  const knob = mesh(new THREE.SphereGeometry(0.035, 8, 6), mat('brass', 'metal'), 'door-knob');
  knob.position.set(r * 0.5, r + 0.02, z + 0.07);
  g.add(knob);
  const step = mesh(cylinder(r * 0.95, r * 1.05, 0.08, 9), mat('stone', 'stone'), 'doorstep');
  step.position.set(0, 0.04, z + 0.3);
  step.scale.z = 0.55;
  g.add(step);
  // Round window above and to the side, glowing warmly as evening comes.
  const win = mesh(cylinder(0.16, 0.16, 0.05, 10), glowMat('lampGlow', 0.9), 'window');
  win.rotation.x = Math.PI / 2;
  win.position.set(-r * 1.25, p.doorHeight * 1.35, z * 0.97);
  g.add(win);
  const winFrame = mesh(new THREE.TorusGeometry(0.17, 0.03, 4, 12), mat('timberDark', 'wood'), 'window-frame');
  winFrame.position.set(-r * 1.25, p.doorHeight * 1.35, z * 0.97 + 0.02);
  g.add(winFrame);
  const bar = mesh(box(0.02, 0.3, 0.02), mat('timberDark', 'wood'), 'window-bar');
  bar.position.set(-r * 1.25, p.doorHeight * 1.35, z * 0.97 + 0.03);
  g.add(bar);
  enableShadows(g);
  win.castShadow = false;
  return g;
}
