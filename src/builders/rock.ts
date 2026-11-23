import * as THREE from 'three';
import { palette } from '../art/palette';
import { mesh, vertexColourMat, enableShadows } from '../art/materials';
import { jitteredBall, paintFaces } from '../art/geometry';
import { createRng, range, seedFrom } from '../art/rng';

export interface RockParams {
  id: string;
  size: number; // approximate width in metres
  squash?: number; // vertical scale relative to width
  mossy?: number; // 0..1 how much of the upper surface is moss
}

/** Faceted boulder, partly sunk into the ground, with moss on upward faces. */
export function buildRock(p: RockParams): THREE.Group {
  const rng = createRng(seedFrom(p.id));
  const geo = jitteredBall(rng, 1, 0.22);
  const stone = [new THREE.Color(palette.stone), new THREE.Color(palette.stoneDark), new THREE.Color(palette.stoneLight)];
  const moss = [new THREE.Color(palette.moss), new THREE.Color(palette.leaf)];
  const mossy = p.mossy ?? 0.5;
  paintFaces(geo, (_c, n) => {
    if (n.y > 1 - mossy * 0.9 && rng() < 0.85) return moss[rng() < 0.6 ? 0 : 1];
    return stone[Math.floor(rng() * stone.length)];
  });
  const rock = mesh(geo, vertexColourMat('stone'), 'rock');
  const half = p.size / 2;
  rock.scale.set(half, half * (p.squash ?? 0.62), half * range(rng, 0.75, 0.95));
  rock.rotation.y = rng() * Math.PI * 2;
  rock.position.y = half * (p.squash ?? 0.62) * 0.55; // sink the lower part
  const g = new THREE.Group();
  g.name = `rock:${p.id}`;
  g.add(rock);
  enableShadows(g);
  return g;
}
