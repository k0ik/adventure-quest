import * as THREE from 'three';
import { studyScene as S } from '../content/study';
import { residents } from '../content/residents';
import { visuals } from '../content/visuals';
import { buildGround } from '../builders/ground';
import { buildDeciduousTree } from '../builders/tree';
import { buildRock } from '../builders/rock';
import { buildLanternPost, type LanternPost } from '../builders/lantern';
import { buildAnimal } from '../builders/animal/build';
import { buildMushrooms } from '../builders/mushroom';
import { buildBackdrop } from '../builders/backdrop';
import { mat } from '../art/materials';
import type { AnimalRig } from '../builders/animal/types';

export interface Study {
  root: THREE.Group;
  lantern: LanternPost;
  rabbit: AnimalRig;
}

/** Translate the authored study definition into scene objects. Deterministic for a given definition. */
export function buildStudy(): Study {
  const root = new THREE.Group();
  root.name = `scene:${S.id}`;

  const ground = buildGround({ ...S.ground, clear: [
    { x: S.tree.x, z: S.tree.z, r: 0.45 },
    { x: S.rock.x, z: S.rock.z, r: 0.7 },
    { x: S.lantern.x, z: S.lantern.z, r: 0.2 },
    { x: S.resident.x, z: S.resident.z, r: 0.35 },
  ] });
  root.add(ground.object);
  const seat = (o: THREE.Object3D, x: number, z: number, rotY = 0) => {
    o.position.set(x, ground.heightAt(x, z), z);
    o.rotation.y = rotY;
    root.add(o);
    return o;
  };

  seat(buildDeciduousTree(S.tree), S.tree.x, S.tree.z, S.tree.rotY);
  seat(buildRock(S.rock), S.rock.x, S.rock.z);
  const lantern = buildLanternPost({ id: S.lantern.id, height: S.lantern.height });
  seat(lantern.object, S.lantern.x, S.lantern.z, S.lantern.rotY);
  for (const m of S.mushrooms) seat(buildMushrooms(m), m.x, m.z);

  const who = residents[S.resident.id];
  const look = visuals[who.visual];
  const rabbit = buildAnimal(look.body, look.outfit, look.accessories, look.restPose);
  rabbit.object.userData.residentId = who.id;
  seat(rabbit.object, S.resident.x, S.resident.z, S.resident.rotY);

  // Outer meadow so the study patch sits in a landscape rather than floating in sky.
  const meadow = new THREE.Mesh(new THREE.CircleGeometry(60, 48), mat('grass'));
  meadow.rotation.x = -Math.PI / 2;
  meadow.position.y = -0.22;
  meadow.receiveShadow = true;
  meadow.name = 'meadow';
  root.add(meadow);

  root.add(buildBackdrop('study-hills', [
    { radius: 46, height: 9, colour: 'hillFar', haze: 0.55 },
    { radius: 30, height: 5, colour: 'hillNear', haze: 0.45 },
  ]));

  return { root, lantern, rabbit };
}
