import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Merge a static subtree into one mesh per material, baking each mesh's world transform.
 * Hundreds of trees and bushes then cost a handful of draw calls instead of thousands.
 * Instanced meshes and lights are left untouched. Call only on scenery that never moves.
 */
export function mergeStatic(root: THREE.Object3D, name = 'static'): THREE.Group {
  root.updateMatrixWorld(true);
  const groups = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; cast: boolean; receive: boolean }>();
  const keep: THREE.Object3D[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if ((o as THREE.InstancedMesh).isInstancedMesh || (o as THREE.Light).isLight) { keep.push(o); return; }
    if (!m.isMesh || Array.isArray(m.material)) return;
    let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    const material = m.material as THREE.MeshStandardMaterial;
    // Same attribute layout for everything sharing a material.
    for (const key of Object.keys(g.attributes)) if (key !== 'position' && key !== 'normal' && key !== 'color') g.deleteAttribute(key);
    if (!material.vertexColors && g.attributes.color) g.deleteAttribute('color');
    if (!g.attributes.normal) g.computeVertexNormals();
    g = g.applyMatrix4(m.matrixWorld);
    const entry = groups.get(material) ?? { geos: [], cast: false, receive: false };
    entry.geos.push(g);
    entry.cast ||= m.castShadow;
    entry.receive ||= m.receiveShadow;
    groups.set(material, entry);
  });
  const out = new THREE.Group();
  out.name = `merged:${name}`;
  for (const [material, { geos, cast, receive }] of groups) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    mesh.name = `${name}:${material.name}`;
    out.add(mesh);
    for (const g of geos) g.dispose();
  }
  for (const o of keep) {
    o.updateMatrixWorld(true);
    const clone = o; // re-parent instanced meshes/lights, preserving their world transform
    out.attach(clone);
  }
  return out;
}
