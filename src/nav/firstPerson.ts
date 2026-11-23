import * as THREE from 'three';

/**
 * First-person view while standing: drag (mouse, pen or touch) or arrow keys to look around,
 * and a recentre that eases back to the location's composed view. No pointer lock.
 * Yaw 0 looks toward +Z; pitch is up-positive.
 */
export const EYE_HEIGHT = 1.6;
const PITCH_MIN = -0.75, PITCH_MAX = 0.55;

export function lookAngles(from: THREE.Vector3, to: THREE.Vector3): { yaw: number; pitch: number } {
  const d = to.clone().sub(from);
  return { yaw: Math.atan2(d.x, d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) };
}

export function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export class FirstPersonView {
  yaw = 0;
  pitch = 0;
  /** Composed view for the current location; recentre returns here. */
  home = { yaw: 0, pitch: 0 };
  enabled = true;
  private recentring: { fromYaw: number; fromPitch: number; t: number; duration: number } | null = null;
  private keys = new Set<string>();
  private dragging: { id: number; x: number; y: number } | null = null;

  constructor(private camera: THREE.PerspectiveCamera, surface: HTMLElement, private reducedMotion: () => boolean) {
    surface.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      this.dragging = { id: e.pointerId, x: e.clientX, y: e.clientY };
      surface.setPointerCapture(e.pointerId);
      this.recentring = null;
    });
    surface.addEventListener('pointermove', (e) => {
      if (!this.dragging || e.pointerId !== this.dragging.id || !this.enabled) return;
      const dx = e.clientX - this.dragging.x, dy = e.clientY - this.dragging.y;
      this.dragging.x = e.clientX;
      this.dragging.y = e.clientY;
      // Drag the world: moving the pointer right turns the view left, like grabbing the scene.
      const k = 2.2 / Math.max(400, surface.clientHeight);
      this.yaw += dx * k;
      this.pitch = THREE.MathUtils.clamp(this.pitch + dy * k, PITCH_MIN, PITCH_MAX);
    });
    const end = (e: PointerEvent) => {
      if (this.dragging?.id === e.pointerId) this.dragging = null;
    };
    surface.addEventListener('pointerup', end);
    surface.addEventListener('pointercancel', end);
    window.addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        this.keys.add(e.key);
        this.recentring = null;
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key));
    window.addEventListener('blur', () => this.keys.clear());
  }

  /** Set a new composed view and jump to it. */
  setHome(yaw: number, pitch: number): void {
    this.home = { yaw, pitch };
    this.yaw = yaw;
    this.pitch = pitch;
    this.recentring = null;
  }

  recentre(): void {
    if (this.reducedMotion()) {
      this.yaw = this.home.yaw;
      this.pitch = this.home.pitch;
      return;
    }
    this.recentring = { fromYaw: this.yaw, fromPitch: this.pitch, t: 0, duration: 0.6 };
  }

  update(dt: number): void {
    if (this.enabled) {
      const speed = 1.5 * dt;
      if (this.keys.has('ArrowLeft')) this.yaw += speed;
      if (this.keys.has('ArrowRight')) this.yaw -= speed;
      if (this.keys.has('ArrowUp')) this.pitch = Math.min(PITCH_MAX, this.pitch + speed * 0.7);
      if (this.keys.has('ArrowDown')) this.pitch = Math.max(PITCH_MIN, this.pitch - speed * 0.7);
    }
    if (this.recentring) {
      const r = this.recentring;
      r.t += dt;
      const k = Math.min(1, r.t / r.duration);
      const e = k * k * (3 - 2 * k);
      this.yaw = r.fromYaw + wrapAngle(this.home.yaw - r.fromYaw) * e;
      this.pitch = r.fromPitch + (this.home.pitch - r.fromPitch) * e;
      if (k >= 1) this.recentring = null;
    }
  }

  /** Point the camera from its current position along yaw/pitch. */
  apply(): void {
    const c = Math.cos(this.pitch);
    const dir = new THREE.Vector3(Math.sin(this.yaw) * c, Math.sin(this.pitch), Math.cos(this.yaw) * c);
    this.camera.lookAt(this.camera.position.clone().add(dir));
  }
}

export function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}
