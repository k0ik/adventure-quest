import * as THREE from 'three';
import { palette, type PaletteKey } from '../art/palette';
import { createRng, seedFrom } from '../art/rng';

/**
 * Distant hazy hills that give depth behind a scene (atmospheric perspective, as in the
 * references). Unlit flat-coloured rings, blended toward the horizon colour with distance.
 */
export function buildBackdrop(id: string, layers: { radius: number; height: number; colour: PaletteKey; haze: number }[]): THREE.Group {
  const rng = createRng(seedFrom(id));
  const g = new THREE.Group();
  g.name = `backdrop:${id}`;
  const horizon = new THREE.Color(palette.skyHorizon);
  for (const L of layers) {
    const segs = 96;
    const phases = [rng() * 6, rng() * 6, rng() * 6];
    const pos: number[] = [];
    const top = (a: number) =>
      L.height * (0.55 + 0.3 * Math.sin(a * 3 + phases[0]) + 0.15 * Math.sin(a * 7 + phases[1]) + 0.08 * Math.sin(a * 13 + phases[2]));
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
      const p0 = [Math.sin(a0) * L.radius, Math.cos(a0) * L.radius], p1 = [Math.sin(a1) * L.radius, Math.cos(a1) * L.radius];
      const b = -2;
      pos.push(p0[0], b, p0[1], p1[0], b, p1[1], p1[0], top(a1), p1[1], p0[0], b, p0[1], p1[0], top(a1), p1[1], p0[0], top(a0), p0[1]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const colour = new THREE.Color(palette[L.colour]).lerp(horizon, L.haze);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: colour, side: THREE.DoubleSide, fog: false }));
    m.name = 'hills';
    g.add(m);
  }
  return g;
}
