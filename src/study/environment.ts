import * as THREE from 'three';
import { palette } from '../art/palette';

/**
 * Late-afternoon lighting, just ahead of sunset: a low golden sun casting long shadows,
 * a soft cool sky fill so shadows stay readable, warm horizon haze for depth.
 */
export const sunDirection = new THREE.Vector3(-0.78, 0.3, 0.55).normalize();

export function buildEnvironment(scene: THREE.Scene): { sun: THREE.DirectionalLight } {
  scene.background = new THREE.Color(palette.skyHorizon);
  scene.fog = new THREE.Fog(new THREE.Color('#e3b996'), 14, 48);

  const hemi = new THREE.HemisphereLight('#cdd2f0', '#7d7444', 1.7);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(palette.sun, 2.9);
  sun.position.copy(sunDirection).multiplyScalar(20);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const c = sun.shadow.camera;
  c.left = -9; c.right = 9; c.top = 9; c.bottom = -9; c.near = 1; c.far = 50;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  scene.add(buildSky());
  return { sun };
}

function buildSky(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(80, 32, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(palette.skyTop) },
      mid: { value: new THREE.Color(palette.skyMid) },
      horizon: { value: new THREE.Color(palette.skyHorizon) },
      sunColour: { value: new THREE.Color('#fff0c8') },
      sunDir: { value: sunDirection },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 sunColour; uniform vec3 sunDir;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, -0.2, 1.0);
        vec3 c = mix(horizon, mid, smoothstep(0.0, 0.22, h));
        c = mix(c, top, smoothstep(0.18, 0.75, h));
        float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
        c += sunColour * (pow(s, 12.0) * 0.35 + pow(s, 400.0) * 1.2);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(geo, material);
  sky.name = 'sky';
  return sky;
}
