import * as THREE from 'three';
import { wrapAngle } from './firstPerson';

/**
 * A guided first-person journey along a route curve. The camera eases along the path and
 * turns toward the way ahead, then settles into the destination's composed view. No head-bob.
 * Finishing (normally, skipped or faded) always ends in exactly the same place and calls
 * `onArrive` once, so every mode resolves to the same destination state.
 */
export interface TravelPlan {
  curve: THREE.Curve<THREE.Vector3>; // already at eye height, from start to destination
  startYaw: number;
  startPitch: number;
  endYaw: number;
  endPitch: number;
  onArrive: () => void;
}

export class Travel {
  readonly duration: number;
  private t = 0;
  private done = false;
  yaw: number;
  pitch: number;
  readonly position = new THREE.Vector3();

  constructor(private plan: TravelPlan) {
    const length = plan.curve.getLength();
    // Usually 4–8 s: a comfortable glide, not a walk simulation.
    this.duration = THREE.MathUtils.clamp(length / 3.0, 4, 8);
    this.yaw = plan.startYaw;
    this.pitch = plan.startPitch;
    plan.curve.getPointAt(0, this.position);
  }

  get finished(): boolean {
    return this.done;
  }

  /** Progress 0..1, for the UI. */
  get progress(): number {
    return Math.min(1, this.t / this.duration);
  }

  update(dt: number): void {
    if (this.done) return;
    this.t += dt;
    const k = Math.min(1, this.t / this.duration);
    // Ease in and out along the arc length.
    const u = 0.5 - 0.5 * Math.cos(Math.PI * k);
    this.plan.curve.getPointAt(u, this.position);
    // Heading: look a little way down the path.
    const ahead = this.plan.curve.getPointAt(Math.min(1, u + 0.06));
    const d = ahead.sub(this.position);
    const pathYaw = d.lengthSq() > 1e-6 ? Math.atan2(d.x, d.z) : this.plan.endYaw;
    const pathPitch = -0.06;
    // Turn from the starting view onto the path, and from the path into the arrival view.
    const turnIn = smooth(0, 0.22, k);
    const settle = smooth(0.72, 1, k);
    let yaw = this.plan.startYaw + wrapAngle(pathYaw - this.plan.startYaw) * turnIn;
    let pitch = this.plan.startPitch + (pathPitch - this.plan.startPitch) * turnIn;
    yaw = yaw + wrapAngle(this.plan.endYaw - yaw) * settle;
    pitch = pitch + (this.plan.endPitch - pitch) * settle;
    this.yaw = yaw;
    this.pitch = pitch;
    if (k >= 1) this.finish();
  }

  /** Jump to the end immediately (skip travel). */
  finish(): void {
    if (this.done) return;
    this.done = true;
    this.t = this.duration;
    this.plan.curve.getPointAt(1, this.position);
    this.yaw = this.plan.endYaw;
    this.pitch = this.plan.endPitch;
    this.plan.onArrive();
  }
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
