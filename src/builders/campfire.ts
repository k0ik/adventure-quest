import * as THREE from 'three';
import { mat, glowMat, mesh, enableShadows } from '../art/materials';
import { cone, cylinder } from '../art/geometry';
import { createRng, range, seedFrom } from '../art/rng';
import { buildRock } from './rock';

export interface CampfireParams {
  id: string;
  /** 0 = embers only … 1 = lively. The opening fire is dwindling. */
  strength: number;
}

export interface Campfire {
  object: THREE.Group;
  /** Call every frame for flame flicker and light. */
  update: (t: number) => void;
}

/**
 * A ring of stones, a collapsed teepee of logs, glowing embers and a few faceted flames.
 * One warm point light (no shadows) flickers with the flames.
 */
export function buildCampfire(p: CampfireParams): Campfire {
  const rng = createRng(seedFrom(p.id));
  const g = new THREE.Group();
  g.name = `campfire:${p.id}`;

  const stones = 9;
  for (let i = 0; i < stones; i++) {
    const a = (i / stones) * Math.PI * 2 + range(rng, -0.1, 0.1);
    const s = buildRock({ id: `${p.id}-stone-${i}`, size: range(rng, 0.2, 0.3), squash: 0.7, mossy: 0.15 });
    s.position.set(Math.sin(a) * 0.48, -0.02, Math.cos(a) * 0.48);
    g.add(s);
  }
  // Logs leaning together, half burnt (dark ends toward the middle).
  const bark = mat('bark', 'wood');
  const charred = mat('furBadgerDark', 'matte');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const log = new THREE.Group();
    const wood = mesh(cylinder(0.045, 0.055, 0.55, 6), bark, 'log');
    wood.position.y = 0.2;
    log.add(wood);
    const end = mesh(cylinder(0.04, 0.045, 0.12, 6), charred, 'log-char');
    end.position.y = 0.5;
    log.add(end);
    log.rotation.set(0, a, 0);
    log.rotateX(-1.05 - i * 0.05);
    log.position.set(Math.sin(a) * 0.34, 0.02, Math.cos(a) * 0.34);
    g.add(log);
  }
  // Ember bed.
  const embers = mesh(cylinder(0.24, 0.28, 0.05, 8), glowMat('leafLitter', 1.4), 'embers');
  embers.position.y = 0.02;
  g.add(embers);
  for (let i = 0; i < 6; i++) {
    const coal = mesh(new THREE.IcosahedronGeometry(1, 0), glowMat('capRed', 1.2), 'coal');
    coal.scale.setScalar(range(rng, 0.04, 0.07));
    const a = rng() * Math.PI * 2, r = range(rng, 0, 0.2);
    coal.position.set(Math.sin(a) * r, 0.05, Math.cos(a) * r);
    g.add(coal);
  }
  // Flames: nested faceted cones, outer orange to inner gold.
  const flames: { m: THREE.Mesh; base: number; phase: number; speed: number }[] = [];
  const tiers: [string, number, number][] = [['leafLitter', 0.17, 0.55], ['lampGlow', 0.12, 0.42], ['sun', 0.07, 0.3]];
  for (const [colour, r, h] of tiers) {
    for (let k = 0; k < 2; k++) {
      const f = mesh(cone(r, h * p.strength + 0.08, 5), glowMat(colour as never, 2.2), 'flame');
      const a = rng() * Math.PI * 2, off = k === 0 ? 0 : 0.07;
      f.position.set(Math.sin(a) * off, (h * p.strength + 0.08) / 2 + 0.03, Math.cos(a) * off);
      f.rotation.y = rng() * Math.PI;
      g.add(f);
      flames.push({ m: f, base: f.position.y, phase: rng() * 10, speed: range(rng, 7, 12) });
    }
  }
  enableShadows(g, true, true);
  for (const f of flames) f.m.castShadow = false;
  embers.castShadow = false;

  const light = new THREE.PointLight('#ff9a4a', 2.2 * (0.4 + p.strength), 7, 1.6);
  light.position.set(0, 0.45, 0);
  g.add(light);

  const update = (t: number) => {
    let sum = 0;
    for (const f of flames) {
      const w = 1 + 0.18 * Math.sin(t * f.speed + f.phase) + 0.1 * Math.sin(t * f.speed * 2.3 + f.phase * 2);
      f.m.scale.set(1 - (w - 1) * 0.4, w, 1 - (w - 1) * 0.4);
      f.m.position.y = f.base * w;
      f.m.rotation.y += 0.004;
      sum += w;
    }
    light.intensity = 2.2 * (0.4 + p.strength) * (0.85 + 0.15 * (sum / flames.length));
  };
  return { object: g, update };
}
