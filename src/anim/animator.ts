import * as THREE from 'three';
import type { AnimalRig, JointName } from '../builders/animal/types';

/**
 * Per-character motion settings. These are presentation data: they live with the visual
 * definition and never affect identity or quest state.
 */
export interface MotionConfig {
  breath: { perMinute: number; amount: number };
  look: { maxYaw: number; maxPitch: number; speed: number; idle: number };
  gesture: { kind: 'wave' | 'point'; arm: 'L' | 'R'; duration: number };
  ears?: { twitchesPerMinute: number; amount: number };
  tail?: { wagsPerSecond: number; amount: number };
}

export interface MotionToggles {
  breathing: boolean;
  look: boolean;
  lookAtViewer: boolean;
  earsTail: boolean;
  /** 0..1 global scale, lowered for reduced-motion preferences. */
  intensity: number;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Small, reusable programmed motions layered additively over a rig's rest pose:
 * breathing, looking (idle glances or at a target), one arm gesture, ear twitches and tail.
 * Each frame every animated joint is reset to its rest transform, then offsets are added.
 */
export class Animator {
  private rest = new Map<THREE.Object3D, { rot: THREE.Euler; pos: THREE.Vector3 }>();
  private yaw = 0;
  private pitch = 0;
  private gestureStart = -1;
  private readonly phase: number;
  private readonly tmp = new THREE.Vector3();
  private readonly tmp2 = new THREE.Vector3();

  constructor(private rig: AnimalRig, private config: MotionConfig, seed: number) {
    this.phase = (seed % 1000) / 1000 * Math.PI * 2;
    // The root is placed and turned by the scene, not animated here.
    for (const o of Object.values(rig.joints)) if (o !== rig.joints.root) this.rest.set(o, { rot: o.rotation.clone(), pos: o.position.clone() });
  }

  /** Start the character's gesture now (ignored if one is already playing). */
  gesture(now: number): void {
    if (this.gestureStart < 0 || now - this.gestureStart > this.config.gesture.duration) this.gestureStart = now;
  }

  get gesturing(): boolean {
    return this.gestureStart >= 0;
  }

  update(now: number, dt: number, toggles: MotionToggles, viewer?: THREE.Vector3): void {
    const j = this.rig.joints;
    for (const [o, r] of this.rest) {
      o.rotation.copy(r.rot);
      o.position.copy(r.pos);
    }
    const k = toggles.intensity;
    const c = this.config;
    const ph = this.phase;
    const add = (name: JointName, x: number, y: number, z: number) => {
      const o = j[name];
      if (!o) return;
      o.rotation.x += x * k;
      o.rotation.y += y * k;
      o.rotation.z += z * k;
    };

    // Breathing: the chest rises and the spine straightens slightly on each inhale.
    if (toggles.breathing) {
      const b = Math.sin(now * (c.breath.perMinute / 60) * Math.PI * 2 + ph);
      const a = c.breath.amount;
      j.chest.position.y += 0.005 * a * b * k;
      add('spine', -0.025 * a * b, 0, 0);
      add('shoulderL', 0, 0, 0.025 * a * b);
      add('shoulderR', 0, 0, -0.025 * a * b);
      add('head', 0.02 * a * b, 0, 0);
    }

    // Looking: either at the viewer or in slow idle glances. Neck takes part of the turn.
    let wantYaw = 0, wantPitch = 0;
    if (toggles.look || toggles.lookAtViewer) {
      if (toggles.lookAtViewer && viewer) {
        this.rig.object.updateMatrixWorld();
        j.neck.getWorldPosition(this.tmp);
        this.rig.object.worldToLocal(this.tmp);
        this.tmp2.copy(viewer);
        this.rig.object.worldToLocal(this.tmp2);
        this.tmp2.sub(this.tmp);
        wantYaw = Math.atan2(this.tmp2.x, this.tmp2.z);
        wantPitch = -Math.atan2(this.tmp2.y, Math.hypot(this.tmp2.x, this.tmp2.z));
      } else {
        // Two slow incommensurate waves give unpredictable but gentle glances.
        wantYaw = c.look.idle * (Math.sin(now * 0.31 + ph) * 0.7 + Math.sin(now * 0.73 + ph * 2) * 0.3) * 1.6;
        wantPitch = c.look.idle * 0.3 * Math.sin(now * 0.47 + ph);
      }
      wantYaw = THREE.MathUtils.clamp(wantYaw, -c.look.maxYaw, c.look.maxYaw);
      wantPitch = THREE.MathUtils.clamp(wantPitch, -c.look.maxPitch, c.look.maxPitch);
    }
    const ease = 1 - Math.exp(-c.look.speed * dt);
    this.yaw += (wantYaw - this.yaw) * ease;
    this.pitch += (wantPitch - this.pitch) * ease;
    // Remove the rest-pose head turn while looking at the viewer so the face actually meets them.
    const restHead = this.rest.get(j.head)!.rot;
    const restBias = toggles.lookAtViewer ? -restHead.y : 0;
    add('neck', this.pitch * 0.3, (this.yaw + restBias) * 0.35, 0);
    add('head', this.pitch * 0.7, (this.yaw + restBias) * 0.65, 0);

    // Gesture: an eased arm motion with a held middle section.
    if (this.gestureStart >= 0) {
      const g = now - this.gestureStart;
      const d = c.gesture.duration;
      if (g > d) this.gestureStart = -1;
      else {
        const env = smooth(0, 0.45, g) * (1 - smooth(d - 0.5, d, g));
        const side = c.gesture.arm;
        const sx = side === 'L' ? 1 : -1;
        if (c.gesture.kind === 'wave') {
          const w = Math.sin(g * 8.5);
          add(`shoulder${side}`, -0.3 * env, 0, sx * 2.35 * env);
          add(`elbow${side}`, 0, 0, sx * (0.55 + 0.35 * w * smooth(0.4, 0.7, g)) * env);
          add(`hand${side}`, 0, 0, sx * 0.25 * w * env);
          add('head', 0, 0, sx * -0.08 * env);
        } else {
          // Point along the way: arm raised forward and out, a small emphasis beat.
          const beat = Math.sin(Math.max(0, g - 0.5) * 6) * smooth(0.5, 0.8, g) * (1 - smooth(1.4, 1.8, g));
          add(`shoulder${side}`, (-1.35 - 0.08 * beat) * env, sx * -0.35 * env, sx * 0.3 * env);
          add(`elbow${side}`, -0.12 * env, 0, 0);
          add(`hand${side}`, -0.2 * env, 0, 0);
          add('head', 0.05 * env, sx * 0.25 * env, 0);
        }
      }
    }

    // Ears: occasional quick twitches, alternating sides, plus a faint sway. Tail: a small wag.
    if (toggles.earsTail) {
      if (c.ears) {
        const f = (c.ears.twitchesPerMinute / 60) * Math.PI * 2;
        const pulseL = Math.pow(Math.max(0, Math.sin(now * f + ph)), 16);
        const pulseR = Math.pow(Math.max(0, Math.sin(now * f * 0.83 + ph + 2)), 16);
        add('earL', c.ears.amount * pulseL + 0.03 * Math.sin(now * 1.3 + ph), 0, 0);
        add('earR', c.ears.amount * pulseR + 0.03 * Math.sin(now * 1.1 + ph), 0, 0);
      }
      if (c.tail) add('tail', 0, c.tail.amount * Math.sin(now * c.tail.wagsPerSecond * Math.PI * 2), 0);
    }
  }
}
