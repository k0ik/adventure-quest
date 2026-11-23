import * as THREE from 'three';
import { palette, type PaletteKey } from './palette';

/**
 * Shared material cache. Builders request materials by palette key and finish, so
 * repeated scenery shares GPU materials instead of creating one per mesh.
 */
export type Finish = 'matte' | 'cloth' | 'wood' | 'stone' | 'metal' | 'gloss';

const finishes: Record<Finish, { roughness: number; metalness: number }> = {
  matte: { roughness: 0.95, metalness: 0 },
  cloth: { roughness: 1, metalness: 0 },
  wood: { roughness: 0.9, metalness: 0 },
  stone: { roughness: 0.92, metalness: 0 },
  metal: { roughness: 0.45, metalness: 0.55 },
  gloss: { roughness: 0.3, metalness: 0 },
};

const cache = new Map<string, THREE.MeshStandardMaterial>();

function cached(key: string, make: () => THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  let m = cache.get(key);
  if (!m) {
    m = make();
    m.name = key;
    cache.set(key, m);
  }
  return m;
}

export function mat(color: PaletteKey, finish: Finish = 'matte', doubleSided = false): THREE.MeshStandardMaterial {
  return cached(`${color}:${finish}:${doubleSided}`, () =>
    new THREE.MeshStandardMaterial({
      color: palette[color],
      flatShading: true,
      side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      ...finishes[finish],
    }),
  );
}

/** Material that uses per-vertex colours (ground, rocks with moss, foliage clusters). */
export function vertexColourMat(finish: Finish = 'matte'): THREE.MeshStandardMaterial {
  return cached(`vertex:${finish}`, () =>
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, ...finishes[finish] }),
  );
}

/** Self-lit material for lantern glass and flames. */
export function glowMat(color: PaletteKey, intensity = 1.6): THREE.MeshStandardMaterial {
  return cached(`glow:${color}:${intensity}`, () =>
    new THREE.MeshStandardMaterial({
      color: palette[color],
      emissive: palette[color],
      emissiveIntensity: intensity,
      roughness: 0.6,
      flatShading: true,
    }),
  );
}

export function enableShadows(root: THREE.Object3D, cast = true, receive = true): void {
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
}

export function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, name?: string): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  if (name) m.name = name;
  return m;
}

/** Smooth-shaded gloss for eyes: facets on a tiny glossy dome read as glare, not form. */
export function smoothGloss(color: PaletteKey): THREE.MeshStandardMaterial {
  return cached(`smooth:${color}`, () =>
    new THREE.MeshStandardMaterial({ color: palette[color], roughness: 0.22, metalness: 0, flatShading: false }),
  );
}
