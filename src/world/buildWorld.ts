import * as THREE from 'three';
import { world, type LocationId } from '../content/world';
import { residents as residentDefs } from '../content/residents';
import { visuals } from '../content/visuals';
import { buildGround } from '../builders/ground';
import { buildWoodland } from '../builders/woodland';
import { buildDeciduousTree } from '../builders/tree';
import { buildRock } from '../builders/rock';
import { buildMushrooms } from '../builders/mushroom';
import { buildLanternPost, type LanternPost } from '../builders/lantern';
import { buildCampfire, type Campfire } from '../builders/campfire';
import { buildTeaTable } from '../builders/teaTable';
import { buildOakHome } from '../builders/oakHome';
import { buildBackdrop } from '../builders/backdrop';
import { buildAnimal } from '../builders/animal/build';
import type { AnimalRig } from '../builders/animal/types';
import type { MotionConfig } from '../anim/animator';
import { mat, mesh, enableShadows } from '../art/materials';
import { cylinder } from '../art/geometry';
import { mergeStatic } from '../art/batch';
import { trailDistance } from './paths';
import { sunDirection } from '../study/environment';

export interface WorldResident {
  id: string;
  location: LocationId;
  rig: AnimalRig;
  motion: MotionConfig;
}

export interface BuiltWorld {
  root: THREE.Group;
  heightAt: (x: number, z: number) => number;
  residents: WorldResident[];
  campfire: Campfire;
  lanterns: LanternPost[];
}

/**
 * Construct the whole fixed world from its authored definition. Deterministic: the same
 * definition always produces the same terrain, trees and placements.
 */
export function buildWorld(): BuiltWorld {
  const root = new THREE.Group();
  root.name = `world:${world.id}`;
  const L = world.locations;
  const P = world.props;
  const clearings = Object.values(L).map((l) => l.clearing);
  const trail = trailDistance(world.routes.map((r) => r.points));

  // Spots that must stay open: where the player stands, residents, props.
  const keepOpen = [
    ...Object.values(L).map((l) => ({ x: l.stand[0], z: l.stand[1], r: 1.3 })),
    ...world.residents.map((r) => ({ x: r.x, z: r.z, r: 0.9 })),
    { x: P.greatOak.x, z: P.greatOak.z, r: 2.4 },
    { x: P.teaTable.x, z: P.teaTable.z, r: 1.0 },
    { x: P.oakLantern.x, z: P.oakLantern.z, r: 0.7 },
    { x: P.campfire.x, z: P.campfire.z, r: 1.4 },
  ];

  const ground = buildGround({
    id: `${world.id}-ground`,
    radius: world.terrain.radius,
    relief: world.terrain.relief,
    resolution: world.terrain.resolution,
    trail: { width: world.terrain.trailWidth, distance: trail },
    clearings,
    tufts: 2600,
    leaves: 900,
    clear: keepOpen.map((k) => ({ ...k, r: Math.min(k.r, 0.5) })),
  });
  const heightAt = ground.heightAt;
  root.add(ground.object);

  // Outer forest floor so the terrain edge is never seen.
  const floor = new THREE.Mesh(new THREE.CircleGeometry(120, 48), mat('forestFloor'));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.25;
  floor.receiveShadow = true;
  root.add(floor);

  // Dense woodland, merged into a handful of meshes for speed.
  const [main, ...others] = clearings;
  const wood = buildWoodland({
    id: world.woodland.id,
    heightAt,
    trailDistance: trail,
    clearing: main,
    extraClearings: others,
    extent: world.woodland.extent,
    trees: world.woodland.trees,
    bushes: world.woodland.bushes,
    sunGap: { dir: [sunDirection.x, sunDirection.z], halfAngle: 0.42 },
    keepOpen,
  });
  root.add(mergeStatic(wood, 'woodland'));

  const seat = (o: THREE.Object3D, x: number, z: number, rotY = 0) => {
    o.position.set(x, heightAt(x, z), z);
    o.rotation.y = rotY;
    root.add(o);
    return o;
  };

  // The Village Oak: a great tree with a home in its roots, a tea table, a lantern.
  const oak = buildDeciduousTree({ id: P.greatOak.id, height: P.greatOak.height, trunkRadius: P.greatOak.trunkRadius, crownWidth: P.greatOak.crownWidth, lean: P.greatOak.lean, crownClumps: P.greatOak.crownClumps });
  oak.add(buildOakHome({ id: P.oakHome.id, trunkRadius: P.greatOak.trunkRadius, doorHeight: P.oakHome.doorHeight }));
  seat(oak, P.greatOak.x, P.greatOak.z);
  seat(buildTeaTable({ id: P.teaTable.id, cups: P.teaTable.cups, emptyTrivet: true }), P.teaTable.x, P.teaTable.z, P.teaTable.rotY);
  const lantern = buildLanternPost({ id: P.oakLantern.id });
  seat(lantern.object, P.oakLantern.x, P.oakLantern.z, P.oakLantern.rotY);
  for (const r of P.oakRocks) seat(buildRock({ id: r.id, size: r.size }), r.x, r.z);
  for (const m of P.oakMushrooms) seat(buildMushrooms(m), m.x, m.z);

  // The Campfire: a dwindling fire and a log to sit on.
  const campfire = buildCampfire({ id: P.campfire.id, strength: P.campfire.strength });
  seat(campfire.object, P.campfire.x, P.campfire.z);
  const log = new THREE.Group();
  const trunk = mesh(cylinder(0.17, 0.19, 1.5, 7), mat('bark', 'wood'), 'seat-log');
  trunk.rotation.z = Math.PI / 2;
  trunk.position.y = 0.15;
  log.add(trunk);
  enableShadows(log);
  seat(log, P.campLog.x, P.campLog.z, P.campLog.rotY);

  // Residents.
  const residents: WorldResident[] = world.residents.map((r) => {
    const who = residentDefs[r.id];
    const look = visuals[who.visual];
    const rig = buildAnimal(look.body, look.outfit, look.accessories, look.restPose);
    rig.object.userData.residentId = who.id;
    seat(rig.object, r.x, r.z, r.rotY);
    return { id: who.id, location: r.location, rig, motion: look.motion };
  });

  root.add(buildBackdrop(`${world.id}-hills`, [
    { radius: 95, height: 26, colour: 'hillFar', haze: 0.45 },
    { radius: 75, height: 18, colour: 'hillNear', haze: 0.4 },
  ]));

  return { root, heightAt, residents, campfire, lanterns: [lantern] };
}
