import * as THREE from 'three';
import { buildAnimal } from '../src/builders/animal/build';
import { visuals } from '../src/content/visuals';
import { Animator } from '../src/anim/animator';

// Gesture clearance check. For each resident, step through its gesture and report how deep any arm point gets inside the
// head (skull + ears), as the minimum signed clearance in metres (negative = intersecting).
let failed = false;
for (const id of Object.keys(visuals)) {
  const v = visuals[id];
  const rig = buildAnimal(v.body, v.outfit, v.accessories, v.restPose);
  const anim = new Animator(rig, v.motion, 1);
  const side = v.motion.gesture.arm;
  const toggles = { breathing: false, look: false, lookAtViewer: false, earsTail: false, intensity: 1 };
  anim.gesture(0);
  const skull = rig.joints.head.children.find((c) => c.name === 'skull') as THREE.Mesh;
  const ray = new THREE.Raycaster();
  const geo = skull.geometry;
  const solid = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  let worst = Infinity, worstT = 0;
  for (let t = 0; t <= v.motion.gesture.duration; t += 0.02) {
    anim.update(t, 0.02, toggles);
    rig.object.updateMatrixWorld(true);
    solid.matrixWorld.copy(skull.matrixWorld);
    solid.matrix.copy(skull.matrixWorld);
    const inv = skull.matrixWorld.clone().invert();
    const sh = new THREE.Vector3(), el = new THREE.Vector3(), ha = new THREE.Vector3();
    rig.joints[`shoulder${side}`].getWorldPosition(sh);
    rig.joints[`elbow${side}`].getWorldPosition(el);
    rig.joints[`hand${side}`].getWorldPosition(ha);
    const r = v.body.arms.thickness * 1.15; // sleeve radius
    for (let k = 0; k <= 20; k++) {
      const p = k <= 10 ? sh.clone().lerp(el, k / 10) : el.clone().lerp(ha, (k - 10) / 10);
      // Distance from p to the skull surface, and whether p is inside (ray parity in local space).
      const local = p.clone().applyMatrix4(inv);
      ray.set(local, new THREE.Vector3(1, 0.13, 0.07).normalize());
      const hits = ray.intersectObject(new THREE.Mesh(geo, solid.material), false);
      const inside = hits.length % 2 === 1;
      // Nearest surface distance via closest point on geometry triangles (local space, then world scale ~1).
      const pos = geo.attributes.position;
      let d = Infinity;
      const tri = new THREE.Triangle(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), q = new THREE.Vector3();
      for (let i = 0; i < pos.count; i += 3) {
        a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
        tri.set(a, b, c).closestPointToPoint(local, q);
        d = Math.min(d, q.distanceTo(local));
      }
      const clear = (inside ? -d : d) - (k >= 19 ? v.body.arms.paw : r);
      if (clear < worst) { worst = clear; worstT = t; }
    }
  }
  const ok = worst > 0.01;
  failed ||= !ok;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}: gesture arm clears head by ${(worst * 100).toFixed(1)} cm (closest at ${worstT.toFixed(2)} s)`);
}
if (failed) process.exit(1);
