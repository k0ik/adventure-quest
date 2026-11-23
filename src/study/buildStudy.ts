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
import { buildWoodland } from '../builders/woodland';
import { sunDirection } from './environment';
import { mat } from '../art/materials';
import type { AnimalRig } from '../builders/animal/types';
import type { MotionConfig } from '../anim/animator';

export interface StudyResident {
  id: string;
  rig: AnimalRig;
  motion: MotionConfig;
  baseYaw: number;
}

export interface Study {
  root: THREE.Group;
  lantern: LanternPost;
  residents: StudyResident[];
}

export type StudyMode = 'woodland' | 'characters';

/** Translate the authored study definition into scene objects. Deterministic for a given definition. */
export function buildStudy(mode: StudyMode = 'woodland'): Study {
  const root = new THREE.Group();
  root.name = `scene:${S.id}`;

  const ground = buildGround({ ...S.ground, clear: [
    { x: S.tree.x, z: S.tree.z, r: 0.45 },
    { x: S.rock.x, z: S.rock.z, r: 0.7 },
    { x: S.lantern.x, z: S.lantern.z, r: 0.2 },
    { x: S.resident.x, z: S.resident.z, r: 0.35 },
    // Keep grass from poking through the pair's feet in the character study only.
    ...(mode === 'characters' ? S.pair.residents.map((r) => ({ x: r.x, z: r.z, r: 0.3 })) : []),
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

  const placements = mode === 'woodland'
    ? [{ id: S.resident.id, x: S.resident.x, z: S.resident.z, rotY: S.resident.rotY }]
    : S.pair.residents.map((r) => ({ ...r, rotY: 0 }));
  const placed: StudyResident[] = placements.map((pl) => {
    const who = residents[pl.id];
    const look = visuals[who.visual];
    const rig = buildAnimal(look.body, look.outfit, look.accessories, look.restPose);
    rig.object.userData.residentId = who.id;
    seat(rig.object, pl.x, pl.z, pl.rotY);
    return { id: who.id, rig, motion: look.motion, baseYaw: pl.rotY };
  });

  // Outer meadow so the study patch sits in a landscape rather than floating in sky.
  const meadow = new THREE.Mesh(new THREE.CircleGeometry(60, 48), mat('forestFloor'));
  meadow.rotation.x = -Math.PI / 2;
  meadow.position.y = -0.22;
  meadow.receiveShadow = true;
  meadow.name = 'meadow';
  root.add(meadow);

  const trail = S.ground.path;
  root.add(buildWoodland({
    ...S.woodland,
    heightAt: ground.heightAt,
    trailDistance: (x, z) => Math.abs(x - trail.curve(z)),
    sunGap: { dir: [sunDirection.x, sunDirection.z], halfAngle: 0.42 },
    keepOpen: [
      { x: S.tree.x, z: S.tree.z, r: 1.4 },
      { x: S.rock.x, z: S.rock.z, r: 1.0 },
      { x: S.lantern.x, z: S.lantern.z, r: 0.8 },
      { x: S.resident.x, z: S.resident.z, r: 1.0 },
      ...Object.values(S.views).map((v) => ({ x: v.position[0], z: v.position[2], r: 1.2 })),
    ],
  }));

  root.add(buildBackdrop('study-hills', [
    { radius: 50, height: 14, colour: 'hillFar', haze: 0.45 },
    { radius: 34, height: 9, colour: 'hillNear', haze: 0.4 },
  ]));

  return { root, lantern, residents: placed };
}
