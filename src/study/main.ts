import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildEnvironment } from './environment';
import { buildStudy } from './buildStudy';
import { studyScene } from '../content/study';

/**
 * Stage 1 visual study viewer. Not the game camera: orbit controls are here only so the
 * creator can inspect the assets. Query params: ?view=overall|character|free&ui=0
 */
const params = new URLSearchParams(location.search);
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
buildEnvironment(scene);
const study = buildStudy();
scene.add(study.root);

const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 200);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 0.6;
controls.maxDistance = 14;

type ViewName = keyof typeof studyScene.views | 'free';
function setView(name: ViewName): void {
  const v = name === 'free' ? studyScene.views.overall : studyScene.views[name];
  camera.position.fromArray(v.position);
  controls.target.fromArray(v.target);
  camera.fov = name === 'character' ? 40 : 55;
  camera.updateProjectionMatrix();
  controls.enabled = name === 'free';
  controls.update();
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
  const hint = document.getElementById('hint');
  if (hint) hint.textContent = name === 'free' ? 'Drag to orbit · scroll to zoom · right-drag to pan' : 'Composed view · choose Free look to orbit';
}

document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) =>
  b.addEventListener('click', () => setView(b.dataset.view as ViewName)),
);
if (params.get('ui') === '0') document.querySelector('.study-panel')?.remove();
setView((params.get('view') as ViewName) ?? 'overall');

function resize(): void {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// The only motion in the static study: the lantern flame flickers gently.
const clock = new THREE.Clock();
const baseIntensity = study.lantern.light?.intensity ?? 0;
let frames = 0;
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  const flicker = 1 + 0.06 * Math.sin(t * 9.1) + 0.04 * Math.sin(t * 23.7 + 1.3);
  if (study.lantern.light) study.lantern.light.intensity = baseIntensity * flicker;
  study.lantern.flame.scale.set(1, flicker, 1);
  controls.update();
  renderer.render(scene, camera);
  if (++frames === 3) (window as unknown as { __studyReady: boolean }).__studyReady = true;
});
