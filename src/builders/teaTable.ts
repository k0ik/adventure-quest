import * as THREE from 'three';
import { mat, mesh, enableShadows } from '../art/materials';
import { cylinder } from '../art/geometry';
import { buildTeacup } from './animal/accessories';

export interface TeaTableParams {
  id: string;
  cups: number;
  /** An empty trivet where the kettle should stand: the environmental hint. */
  emptyTrivet: boolean;
}

/** A small round garden table with a cloth, cups set out on saucers, and two stools. */
export function buildTeaTable(p: TeaTableParams): THREE.Group {
  const g = new THREE.Group();
  g.name = `tea-table:${p.id}`;
  const wood = mat('timber', 'wood');
  const top = mesh(cylinder(0.42, 0.42, 0.04, 12), wood, 'table-top');
  top.position.y = 0.5;
  g.add(top);
  const cloth = mesh(cylinder(0.36, 0.36, 0.006, 12), mat('clothCream', 'cloth'), 'table-cloth');
  cloth.position.y = 0.523;
  g.add(cloth);
  const leg = mesh(cylinder(0.04, 0.05, 0.48, 6), mat('timberDark', 'wood'), 'table-leg');
  leg.position.y = 0.24;
  g.add(leg);
  const foot = mesh(cylinder(0.18, 0.2, 0.04, 8), mat('timberDark', 'wood'), 'table-foot');
  foot.position.y = 0.02;
  g.add(foot);
  for (let i = 0; i < p.cups; i++) {
    const a = (i / p.cups) * Math.PI * 2 + 0.3;
    const cup = buildTeacup('clothCream', 'clothTeal');
    cup.position.set(Math.sin(a) * 0.25, 0.527, Math.cos(a) * 0.25);
    cup.rotation.y = a + Math.PI / 2;
    g.add(cup);
  }
  if (p.emptyTrivet) {
    const trivet = mesh(new THREE.TorusGeometry(0.075, 0.008, 4, 10), mat('iron', 'metal'), 'trivet');
    trivet.rotation.x = Math.PI / 2;
    trivet.position.y = 0.532;
    g.add(trivet);
  }
  for (const [x, z] of [[0.62, 0.15], [-0.45, 0.48]]) {
    const stool = mesh(cylinder(0.16, 0.14, 0.3, 8), mat('barkLight', 'wood'), 'stool');
    stool.position.set(x, 0.15, z);
    g.add(stool);
  }
  enableShadows(g);
  return g;
}
