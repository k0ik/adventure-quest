import * as THREE from 'three';
import { buildEnvironment, followShadow } from '../study/environment';
import { buildWorld } from '../world/buildWorld';
import { routeCurve } from '../world/paths';
import { world, routeBetween, type LocationId, type LocationDef } from '../content/world';
import { passages, actions, dialogue, residentNames, type SampleAction } from '../content/sample';
import { Animator, type MotionToggles } from '../anim/animator';
import { seedFrom } from '../art/rng';
import { FirstPersonView, EYE_HEIGHT, lookAngles, isTyping } from '../nav/firstPerson';
import { Travel } from '../nav/travel';
import { Hud, loadSettings, showTitle } from './ui';
import { Ambience } from '../audio/ambience';

/**
 * Stage 3 interaction sample: read, choose, look around, travel, arrive.
 * Query params for review/testing: ?loc=village-oak (start there, no title), ?ui=0 (hide HUD).
 */
const params = new URLSearchParams(location.search);
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const hudRoot = document.getElementById('hud') as HTMLElement;
const fade = document.getElementById('fade') as HTMLElement;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const { sun } = buildEnvironment(scene);
const sky = scene.getObjectByName('sky')!;
const built = buildWorld();
scene.add(built.root);

const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 400);
const settings = loadSettings();
const view = new FirstPersonView(camera, canvas, () => settings.reducedMotion);
const hud = new Hud(hudRoot, settings, 'study.html');

const animators = built.residents.map((r) => ({ id: r.id, location: r.location, animator: new Animator(r.rig, r.motion, seedFrom(r.id)) }));

// --- Minimal sample state (Stage 4 replaces this with the full state engine and saves) ---
const state = {
  location: (params.get('loc') as LocationId) ?? 'campfire',
  visited: new Set<LocationId>(),
  met: new Set<string>(),
  walked: new Set<string>(),
};
let talkingTo: string | null = null;
let travel: Travel | null = null;

const name = (id: string) => (state.met.has(id) ? residentNames[id].met : residentNames[id].unmet);
/** Fill {rabbit}/{badger}, capitalising at the start of a sentence or label. */
function fill(text: string): string {
  return text.replace(/\{(\w+)\}/g, (_m, id: string, offset: number) => {
    const n = name(id);
    const before = text.slice(0, offset).trimEnd();
    return before === '' || /[.!?]$/.test(before) ? n[0].toUpperCase() + n.slice(1) : n;
  });
}

function standPosition(loc: LocationId): THREE.Vector3 {
  const [x, z] = world.locations[loc].stand;
  return new THREE.Vector3(x, built.heightAt(x, z) + EYE_HEIGHT, z);
}

function composedView(loc: LocationId): { yaw: number; pitch: number } {
  const l: LocationDef = world.locations[loc];
  const look = camera.aspect < 1 && l.lookPortrait ? l.lookPortrait : l.look;
  const at = new THREE.Vector3(look[0], built.heightAt(look[0], look[2]) + look[1], look[2]);
  return lookAngles(standPosition(loc), at);
}

function placeAt(loc: LocationId): void {
  camera.position.copy(standPosition(loc));
  const v = composedView(loc);
  view.setHome(v.yaw, v.pitch);
}

/** Arrival is the single place a location change is applied, however the player got here. */
function arrive(loc: LocationId): void {
  const firstTime = !state.visited.has(loc);
  state.location = loc;
  state.visited.add(loc);
  travel = null;
  view.enabled = true;
  showLocation(firstTime ? passages[loc].first : fill(passages[loc].again));
}

function showLocation(text: string): void {
  const loc = state.location;
  talkingTo = null;
  hud.show({
    title: world.locations[loc].name,
    text,
    choices: actions[loc].map((a) => ({ label: fill(labelFor(a)), onSelect: () => act(a) })),
  });
}

function labelFor(a: SampleAction): string {
  return a.kind === 'travel' && a.labelAgain && state.visited.has(a.to) ? a.labelAgain : a.label;
}

function act(a: SampleAction): void {
  if (travel) return; // choices are locked while travelling
  if (a.kind === 'local') showLocation(a.text);
  else if (a.kind === 'talk') talk(a.resident, 'start');
  else go(a.to);
}

function talk(resident: string, nodeId: string): void {
  const node = dialogue[resident][nodeId];
  talkingTo = resident;
  state.met.add(resident);
  if (node.gesture) animators.find((x) => x.id === resident)?.animator.gesture(clock.getElapsedTime());
  hud.show({
    title: world.locations[state.location].name,
    speaker: name(resident)[0].toUpperCase() + name(resident).slice(1),
    text: node.text,
    choices: node.options.map((o) => ({
      label: o.label,
      onSelect: () => (o.next ? talk(resident, o.next) : showLocation(fill(passages[state.location].again))),
    })),
  });
}

function go(to: LocationId): void {
  const found = routeBetween(state.location, to);
  if (!found) return;
  const { route, reversed } = found;
  const pts = reversed ? [...route.points].reverse() : route.points;
  const curve = routeCurve(pts, built.heightAt, EYE_HEIGHT);
  const end = composedView(to);
  const skip = settings.skipTravel === 'always' || (settings.skipTravel === 'revisits' && state.walked.has(route.id));
  state.walked.add(route.id);
  talkingTo = null;
  view.enabled = false;
  travel = new Travel({
    curve,
    startYaw: view.yaw,
    startPitch: view.pitch,
    endYaw: end.yaw,
    endPitch: end.pitch,
    onArrive: () => {
      view.setHome(end.yaw, end.pitch);
      camera.position.copy(standPosition(to));
      arrive(to);
    },
  });
  if (settings.reducedMotion || skip) {
    // Fade instead of gliding (or skip): same destination, same arrival.
    const t = travel;
    hud.showTravel(world.locations[to].name);
    fade.classList.add('on');
    setTimeout(() => { t.finish(); fade.classList.remove('on'); }, settings.reducedMotion ? 380 : 250);
  } else {
    hud.showTravel(world.locations[to].name);
  }
}

// Ambient sound starts on the first click or key press (browsers require a user gesture).
let ambience: Ambience | null = null;
const fires = [{ position: new THREE.Vector3(world.props.campfire.x, 0, world.props.campfire.z), strength: world.props.campfire.strength }];
function startSound(): void {
  if (!settings.sound) return;
  try {
    ambience ??= new Ambience(settings.volume);
    ambience.resume();
    ambience.setVolume(settings.volume, false);
  } catch {
    ambience = null; // no Web Audio: play continues silently
  }
}
for (const ev of ['pointerdown', 'keydown'] as const) window.addEventListener(ev, startSound);
hud.onSoundChange = () => {
  if (settings.sound) startSound();
  ambience?.setVolume(settings.volume, !settings.sound);
};

hud.onRecentre = () => { if (!travel) view.recentre(); };
hud.onSkip = () => travel?.finish();
window.addEventListener('keydown', (e) => {
  if (isTyping(e)) return;
  if (travel && (e.key === 's' || e.key === 'S')) travel.finish();
});

function resize(): void {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Wider view on tall screens so the scene still reads on a phone.
  const wasPortrait = camera.aspect < 1;
  camera.fov = w / h < 1 ? 72 : 60;
  camera.updateProjectionMatrix();
  // Rotating a phone switches composition; re-aim if the player hasn't been looking around.
  if (wasPortrait !== camera.aspect < 1 && !travel && built) {
    const v = composedView(state.location);
    view.setHome(v.yaw, v.pitch);
  }
}
window.addEventListener('resize', resize);
resize();

placeAt(state.location);
if (params.get('ui') === '0') hudRoot.remove();
const begin = () => arrive(state.location);
if (params.has('loc') || params.get('ui') === '0') begin();
else showTitle(hudRoot, begin);

// Test hooks for automated checks (harmless in play): choose options, drive travel, probe clearance.
const ray = new THREE.Raycaster();
(window as unknown as { __game: unknown }).__game = {
  choose: (n: number) => (hudRoot.querySelectorAll('.choices button')[n - 1] as HTMLButtonElement | undefined)?.click(),
  panelText: () => hudRoot.querySelector('.story')?.textContent ?? '',
  state: () => ({ location: state.location, visited: [...state.visited], met: [...state.met], travelling: !!travel }),
  setSettings: (s: Partial<typeof settings>) => Object.assign(settings, s),
  /** Advance travel without rendering until progress reaches `k`; returns camera samples. */
  stepTravel: (k: number, dt = 0.05) => {
    const out: { x: number; y: number; z: number; aboveGround: number; clear: number }[] = [];
    while (travel && !travel.finished && travel.progress < k) {
      const t = travel; // arrival clears `travel`, so keep a handle for this sample
      t.update(dt);
      const p = t.position;
      out.push({ x: p.x, y: p.y, z: p.z, aboveGround: p.y - built.heightAt(p.x, p.z), clear: clearance(p) });
    }
    if (travel && !travel.finished) { camera.position.copy(travel.position); view.yaw = travel.yaw; view.pitch = travel.pitch; }
    return out;
  },
  audio: () => ambience?.levels() ?? null,
  startSound,
  render: () => (renderer.info.render.calls + ' calls, ' + renderer.info.render.triangles + ' triangles'),
};
/** Nearest scenery in 16 horizontal directions at eye and chest height (excludes ground). */
function clearance(p: THREE.Vector3): number {
  let best = Infinity;
  const ground = built.root.getObjectByName(`ground:${world.id}-ground`);
  const targets = built.root.children.filter((c) => c !== ground && c.name !== 'hills' && !c.name.startsWith('backdrop'));
  for (const h of [0, -0.6]) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ray.set(new THREE.Vector3(p.x, p.y + h, p.z), new THREE.Vector3(Math.sin(a), 0, Math.cos(a)));
      ray.far = 3;
      const hit = ray.intersectObjects(targets, true).find((x) => !(x.object as THREE.InstancedMesh).isInstancedMesh);
      if (hit && hit.distance < best) best = hit.distance;
    }
  }
  return best;
}

const clock = new THREE.Clock();
const toggles: MotionToggles = { breathing: true, look: true, lookAtViewer: false, earsTail: true, intensity: settings.reducedMotion ? 0.5 : 1 };
const focus = new THREE.Vector3();
let last = 0;
let frames = 0;
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  const dt = Math.min(0.1, t - last);
  last = t;

  if (travel && !travel.finished) {
    travel.update(dt);
    camera.position.copy(travel.position);
    view.yaw = travel.yaw;
    view.pitch = travel.pitch;
    hud.travelProgress(travel.progress);
  } else {
    view.update(dt);
  }
  view.apply();

  // Residents: the one you're talking to meets your eye; the rest go about their business.
  toggles.intensity = settings.reducedMotion ? 0.5 : 1;
  for (const a of animators) {
    const talking = a.id === talkingTo;
    a.animator.update(t, dt, { ...toggles, look: !talking, lookAtViewer: talking }, camera.position);
  }
  built.campfire.update(t);
  ambience?.update(camera.position, view.yaw, fires);
  for (const l of built.lanterns) {
    const f = 1 + 0.06 * Math.sin(t * 9.1) + 0.04 * Math.sin(t * 23.7 + 1.3);
    if (l.light) l.light.intensity = 1.2 * f;
    l.flame.scale.set(1, f, 1);
  }
  // Shadows and sky follow the player through the large world.
  camera.getWorldDirection(focus);
  focus.multiplyScalar(6).add(camera.position);
  followShadow(sun, focus);
  sky.position.copy(camera.position);

  renderer.render(scene, camera);
  if (++frames === 3) (window as unknown as { __studyReady: boolean }).__studyReady = true;
});
