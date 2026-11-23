import * as THREE from 'three';
import { mat, glowMat, mesh, enableShadows } from '../art/materials';
import { box, cone, cylinder } from '../art/geometry';
import { palette } from '../art/palette';

export interface LanternPostParams {
  id: string;
  height?: number;
  lit?: boolean;
  /** Light strength; kept low in daylight so the lantern reads as "just lit for evening". */
  intensity?: number;
}

export interface LanternPost {
  object: THREE.Group;
  light: THREE.PointLight | null;
  flame: THREE.Mesh;
}

/**
 * A crooked wooden signpost-style lantern post: timber upright, a bracket arm, and a hanging
 * iron lantern with glowing panes. One non-shadow-casting point light.
 */
export function buildLanternPost(p: LanternPostParams): LanternPost {
  const h = p.height ?? 1.9;
  const g = new THREE.Group();
  g.name = `lantern:${p.id}`;
  const timber = mat('timber', 'wood');
  const timberDark = mat('timberDark', 'wood');
  const iron = mat('iron', 'metal');

  const post = mesh(box(0.11, h, 0.11), timber, 'post');
  post.position.y = h / 2;
  post.rotation.z = 0.025; // hand-set, not machine-straight
  g.add(post);
  const cap = mesh(cone(0.1, 0.1, 4), timberDark, 'post-cap');
  cap.position.y = h + 0.05;
  cap.rotation.y = Math.PI / 4;
  g.add(cap);

  // Bracket arm with a diagonal brace.
  const armLen = 0.5;
  const arm = mesh(box(armLen, 0.07, 0.07), timber, 'arm');
  arm.position.set(armLen / 2, h - 0.14, 0);
  g.add(arm);
  const brace = mesh(box(0.05, 0.34, 0.05), timberDark, 'brace');
  brace.position.set(0.13, h - 0.3, 0);
  brace.rotation.z = Math.PI / 4;
  g.add(brace);

  // Hanging lantern.
  const lantern = new THREE.Group();
  lantern.name = 'lantern-body';
  lantern.position.set(armLen - 0.08, h - 0.2, 0);
  const hook = mesh(cylinder(0.008, 0.008, 0.1, 4), iron, 'hook');
  hook.position.y = -0.03;
  lantern.add(hook);
  const roof = mesh(cone(0.13, 0.1, 4), iron, 'roof');
  roof.rotation.y = Math.PI / 4;
  roof.position.y = -0.12;
  lantern.add(roof);
  const ring = mesh(cylinder(0.02, 0.02, 0.03, 6), mat('brass', 'metal'), 'finial');
  ring.position.y = -0.06;
  lantern.add(ring);
  const glass = mesh(box(0.13, 0.17, 0.13), glowMat('lampGlow', p.lit === false ? 0 : 1.2), 'glass');
  glass.position.y = -0.26;
  lantern.add(glass);
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const bar = mesh(box(0.02, 0.19, 0.02), iron, 'frame');
    bar.position.set(x * 0.066, -0.26, z * 0.066);
    lantern.add(bar);
  }
  const base = mesh(box(0.16, 0.03, 0.16), iron, 'base');
  base.position.y = -0.36;
  lantern.add(base);
  const flame = mesh(cone(0.025, 0.07, 5), glowMat('sun', 3), 'flame');
  flame.position.y = -0.27;
  lantern.add(flame);
  g.add(lantern);

  enableShadows(g, true, true);
  glass.castShadow = false;
  flame.castShadow = false;

  let light: THREE.PointLight | null = null;
  if (p.lit !== false) {
    light = new THREE.PointLight(palette.lampGlow, p.intensity ?? 1.2, 5, 1.6);
    light.position.set(lantern.position.x, lantern.position.y - 0.26, 0);
    light.castShadow = false;
    g.add(light);
  }
  return { object: g, light, flame };
}
