import * as THREE from 'three';
import { palette } from '../art/palette';

/**
 * Late-afternoon lighting, just ahead of sunset: a low golden sun casting long shadows,
 * a soft cool sky fill so shadows stay readable, warm horizon haze for depth.
 */
export const sunDirection = new THREE.Vector3(-0.78, 0.3, 0.55).normalize();

export function buildEnvironment(scene: THREE.Scene): { sun: THREE.DirectionalLight } {
  scene.background = new THREE.Color(palette.skyHorizon);
  // Warm haze that thickens between the trunks, for depth.
  scene.fog = new THREE.Fog(new THREE.Color('#d9a483'), 9, 38);

  // Fill is deliberately modest and cool so the warm sun and shade separate clearly.
  const hemi = new THREE.HemisphereLight('#9fa8d6', '#5a4a2c', 1.25);
  scene.add(hemi);

  // Cool edge light from nearly opposite the sun: blue rims on silhouettes, no shadows.
  const rim = new THREE.DirectionalLight(palette.rimCool, 1.3);
  rim.position.copy(sunDirection).multiplyScalar(-20).setY(9);
  rim.castShadow = false;
  scene.add(rim);

  const sun = new THREE.DirectionalLight(palette.sun, 3.4);
  sun.position.copy(sunDirection).multiplyScalar(30);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const c = sun.shadow.camera;
  c.left = -14; c.right = 14; c.top = 14; c.bottom = -14; c.near = 1; c.far = 60;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  scene.add(buildSky());
  return { sun };
}

function buildSky(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(150, 32, 16);
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

/**
 * Keep the sun's shadow box centred on what the player is looking at, so shadows work in
 * every location of a large world. Snapped to whole metres to avoid shimmering.
 */
export function followShadow(sun: THREE.DirectionalLight, centre: THREE.Vector3): void {
  const x = Math.round(centre.x), z = Math.round(centre.z);
  sun.target.position.set(x, 0, z);
  sun.position.set(x, 0, z).addScaledVector(sunDirection, 30);
}
