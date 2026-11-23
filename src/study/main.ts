import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildEnvironment } from './environment';
import { buildStudy, type Study, type StudyMode } from './buildStudy';
import { studyScene as S } from '../content/study';
import { residents } from '../content/residents';
import { Animator, type MotionToggles } from '../anim/animator';
import { seedFrom } from '../art/rng';

/**
 * Review viewer for the visual studies (Stage 1 woodland, Stage 2 characters). Not the game
 * camera: orbit controls exist only so the creator can inspect assets.
 * Query params: ?study=woodland|characters&view=…&ui=0&gesture=rabbit,badger
 */
const params = new URLSearchParams(location.search);
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const panel = document.getElementById('panel') as HTMLElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
buildEnvironment(scene);
const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 200);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 0.4;
controls.maxDistance = 14;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const toggles: MotionToggles = { breathing: true, look: true, lookAtViewer: false, earsTail: true, intensity: reducedMotion ? 0.5 : 1 };

// The study under review opens by default; the other stays one click away.
let mode: StudyMode = params.get('study') === 'woodland' || location.hash === '#woodland' ? 'woodland' : 'characters';
let study: Study;
let animators: { id: string; animator: Animator }[] = [];
let turn = 0; // turntable yaw for the character study
const clock = new THREE.Clock();

function load(next: StudyMode): void {
  if (study) scene.remove(study.root);
  mode = next;
  study = buildStudy(mode);
  scene.add(study.root);
  animators = study.residents.map((r) => ({ id: r.id, animator: new Animator(r.rig, r.motion, seedFrom(r.id)) }));
  turn = 0;
  renderPanel();
}

type View = { label: string; apply: () => void };
function views(): Record<string, View> {
  const fixed = (pos: readonly number[], target: readonly number[], fov: number, orbit = false) => () => {
    camera.position.fromArray(pos as number[]);
    controls.target.fromArray(target as number[]);
    camera.fov = fov;
    camera.updateProjectionMatrix();
    controls.enabled = orbit;
    controls.update();
  };
  if (mode === 'woodland') {
    return {
      overall: { label: 'Overall', apply: fixed(S.views.overall.position, S.views.overall.target, 55) },
      character: { label: 'Character', apply: fixed(S.views.character.position, S.views.character.target, 40) },
      portrait: { label: 'Portrait', apply: fixed(S.views.portrait.position, S.views.portrait.target, 40) },
      free: { label: 'Free look', apply: fixed(S.views.overall.position, S.views.overall.target, 55, true) },
    };
  }
  const cam = S.pair.camera;
  const turntable = (yaw: number) => () => { turn = yaw; fixed(cam.position, cam.target, 38)(); };
  return {
    front: { label: 'Front', apply: turntable(S.pair.turns.front) },
    threeQuarter: { label: 'Three-quarter', apply: turntable(S.pair.turns.threeQuarter) },
    side: { label: 'Side', apply: turntable(S.pair.turns.side) },
    free: { label: 'Free look', apply: () => { turn = 0; fixed(cam.position, cam.target, 45, true)(); } },
  };
}

function setView(name: string): void {
  const v = views()[name] ?? Object.values(views())[0];
  v.apply();
  panel.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
}

function button(label: string, onClick: () => void, attrs: Record<string, string> = {}): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  for (const [k, v] of Object.entries(attrs)) b.setAttribute(k, v);
  b.addEventListener('click', onClick);
  return b;
}

function row(title: string, ...children: HTMLElement[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'row';
  const t = document.createElement('span');
  t.className = 'row-title';
  t.textContent = title;
  const items = document.createElement('div');
  items.className = 'row-items';
  items.append(...children);
  wrap.append(t, items);
  return wrap;
}

function renderPanel(): void {
  panel.replaceChildren();
  const title = document.createElement('p');
  title.className = 'study-title';
  title.textContent = mode === 'woodland' ? 'Stage 1 · Woodland study' : 'Stage 2 · Character study';
  panel.append(title);
  panel.append(row('Study',
    button('Woodland', () => { load('woodland'); setView('overall'); }, { 'aria-pressed': String(mode === 'woodland') }),
    button('Characters', () => { load('characters'); setView('front'); }, { 'aria-pressed': String(mode === 'characters') }),
  ));
  panel.append(row('View', ...Object.entries(views()).map(([k, v]) => button(v.label, () => setView(k), { 'data-view': k }))));
  if (mode === 'characters') {
    // Breathing and ear/tail motion always run; looking is one choice of two.
    panel.append(row('Look', ...(['around', 'viewer'] as const).map((which) =>
      button(which === 'around' ? 'Look around' : 'Look at me', () => {
        toggles.look = which === 'around';
        toggles.lookAtViewer = which === 'viewer';
        panel.querySelectorAll<HTMLButtonElement>('[data-look]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.look === which)));
      }, { 'data-look': which, 'aria-pressed': String(which === 'viewer' ? toggles.lookAtViewer : !toggles.lookAtViewer) }),
    )));
    panel.append(row('Gesture', ...animators.map(({ id, animator }) => {
      const r = residents[id];
      const kind = r.id === 'rabbit' ? 'wave' : 'point';
      return button(`${r.name.split(' ')[0]} ${kind}s`, () => animator.gesture(clock.getElapsedTime()));
    })));
  }
  const hint = document.createElement('p');
  hint.className = 'study-hint';
  hint.textContent = 'Free look: drag to orbit · scroll or pinch to zoom';
  panel.append(hint);
}

function resize(): void {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

load(mode);
setView(params.get('view') ?? (mode === 'woodland' ? 'overall' : 'front'));
if (params.get('ui') === '0') panel.remove();
resize();
// Gestures requested by URL start once the first frames are on screen.
const pendingGestures = (params.get('gesture') ?? '').split(',').filter(Boolean);
if (params.get('look') === 'viewer') { toggles.lookAtViewer = true; toggles.look = false; }
if (params.get('still') === '1') { toggles.breathing = false; toggles.look = false; toggles.earsTail = false; }

let frames = 0;
let last = 0;
// Test hook: ?at=1.2 freezes animation time at 1.2 s, with URL gestures starting at 0.
const fixedAt = params.has('at') ? Number(params.get('at')) : null;
if (fixedAt !== null) for (const g of pendingGestures.splice(0)) animators.find((a) => a.id === g)?.animator.gesture(0);
renderer.setAnimationLoop(() => {
  const t = fixedAt ?? clock.getElapsedTime();
  const dt = fixedAt !== null ? 1 : Math.min(0.1, t - last);
  last = t;
  const base = study.lantern.light ? 1.2 : 0;
  const flicker = 1 + 0.06 * Math.sin(t * 9.1) + 0.04 * Math.sin(t * 23.7 + 1.3);
  if (study.lantern.light) study.lantern.light.intensity = base * flicker;
  study.lantern.flame.scale.set(1, flicker, 1);
  for (const r of study.residents) r.rig.object.rotation.y = r.baseYaw + turn;
  for (const { animator } of animators) animator.update(t, dt, toggles, camera.position);
  controls.update();
  renderer.render(scene, camera);
  if (++frames === 3) {
    for (const g of pendingGestures) animators.find((a) => a.id === g)?.animator.gesture(t);
    (window as unknown as { __studyReady: boolean }).__studyReady = true;
  }
});
