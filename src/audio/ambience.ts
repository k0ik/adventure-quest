import * as THREE from 'three';

/**
 * Synthesised woodland ambience (Web Audio, no audio files): wind in the leaves, birdsong and
 * a campfire heard only nearby. Starts after a user gesture; volume and mute are settings.
 * Sound never carries essential information.
 */
export interface FireSource {
  position: THREE.Vector3;
  /** 0..1 how lively the fire is. */
  strength: number;
}

interface Bus {
  gain: GainNode;
  meter: AnalyserNode;
}

export class Ambience {
  readonly ctx: AudioContext;
  private master: GainNode;
  private buses: Record<'wind' | 'birds' | 'fire', Bus>;
  private noise: AudioBuffer;
  private brown: AudioBuffer;
  private fireGain: GainNode;
  private firePan: StereoPannerNode;
  private gustGain: GainNode;
  private rustleGain: GainNode;
  private rustleFilter: BiquadFilterNode;
  private gust = 0.4;
  private gustTarget = 0.4;
  private nextGustChange = 0;
  private nextBird = 0;
  private nextPop = 0;
  private fireLevel = 0;
  private fireStrength = 0.5;
  private readonly right = new THREE.Vector3();
  private readonly to = new THREE.Vector3();

  constructor(volume: number) {
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = volume;
    // Gentle limiter so overlapping pops and songs never clip.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 6;
    this.master.connect(comp).connect(ctx.destination);
    const bus = (level: number): Bus => {
      const gain = ctx.createGain();
      gain.gain.value = level;
      const meter = ctx.createAnalyser();
      meter.fftSize = 1024;
      gain.connect(this.master);
      gain.connect(meter);
      return { gain, meter };
    };
    this.buses = { wind: bus(0.55), birds: bus(0.35), fire: bus(1.3) };
    this.noise = makeNoise(ctx, 4, 'white');
    this.brown = makeNoise(ctx, 4, 'brown');

    // Wind: a low breeze (brown noise) and a leaf rustle (band-passed white noise), both swelling with gusts.
    const breeze = this.loop(this.brown);
    const breezeLp = ctx.createBiquadFilter();
    breezeLp.type = 'lowpass';
    breezeLp.frequency.value = 380;
    this.gustGain = ctx.createGain();
    this.gustGain.gain.value = 0.25;
    breeze.connect(breezeLp).connect(this.gustGain).connect(this.buses.wind.gain);
    const rustle = this.loop(this.noise);
    this.rustleFilter = ctx.createBiquadFilter();
    this.rustleFilter.type = 'bandpass';
    this.rustleFilter.frequency.value = 3200;
    this.rustleFilter.Q.value = 0.7;
    this.rustleGain = ctx.createGain();
    this.rustleGain.gain.value = 0.04;
    rustle.connect(this.rustleFilter).connect(this.rustleGain).connect(this.buses.wind.gain);

    // Fire: a soft roar and hiss, panned toward the fire and faded with distance. Pops are added live.
    this.firePan = ctx.createStereoPanner();
    this.fireGain = ctx.createGain();
    this.fireGain.gain.value = 0;
    this.fireGain.connect(this.firePan).connect(this.buses.fire.gain);
    const roar = this.loop(this.brown);
    const roarLp = ctx.createBiquadFilter();
    roarLp.type = 'lowpass';
    roarLp.frequency.value = 220;
    const roarGain = ctx.createGain();
    roarGain.gain.value = 0.5;
    roar.connect(roarLp).connect(roarGain).connect(this.fireGain);
    const hiss = this.loop(this.noise);
    const hissBp = ctx.createBiquadFilter();
    hissBp.type = 'bandpass';
    hissBp.frequency.value = 1400;
    hissBp.Q.value = 0.9;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.05;
    hiss.connect(hissBp).connect(hissGain).connect(this.fireGain);
  }

  setVolume(v: number, muted: boolean): void {
    this.master.gain.setTargetAtTime(muted ? 0 : v, this.ctx.currentTime, 0.1);
  }

  resume(): void {
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Per-frame update: listener position and facing, nearby fires. */
  update(listener: THREE.Vector3, yaw: number, fires: FireSource[]): void {
    const ctx = this.ctx;
    if (ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.right.set(-Math.cos(yaw), 0, Math.sin(yaw));

    // Gusts drift between random targets every few seconds.
    if (now > this.nextGustChange) {
      this.gustTarget = 0.15 + Math.random() * 0.85;
      this.nextGustChange = now + 3 + Math.random() * 6;
    }
    this.gust += (this.gustTarget - this.gust) * 0.01;
    this.gustGain.gain.setTargetAtTime(0.12 + 0.35 * this.gust, now, 0.3);
    const flutter = 0.7 + 0.3 * Math.sin(now * 7.3) * Math.sin(now * 2.9);
    this.rustleGain.gain.setTargetAtTime((0.012 + 0.07 * this.gust * this.gust) * flutter, now, 0.08);
    this.rustleFilter.frequency.setTargetAtTime(2600 + 1600 * this.gust, now, 0.5);

    // Fire: loudest beside it, silent beyond ~11 m; panned by direction relative to the view.
    let best: { level: number; pan: number; strength: number } = { level: 0, pan: 0, strength: 0.5 };
    for (const f of fires) {
      this.to.copy(f.position).sub(listener).setY(0);
      const d = this.to.length();
      const near = THREE.MathUtils.clamp(1 - (d - 1.5) / 9.5, 0, 1);
      const level = near * near;
      if (level > best.level) best = { level, pan: d > 0.01 ? this.to.normalize().dot(this.right) * 0.8 : 0, strength: f.strength };
    }
    this.fireLevel = best.level;
    this.fireStrength = best.strength;
    this.fireGain.gain.setTargetAtTime(best.level * (0.4 + 0.6 * best.strength), now, 0.15);
    this.firePan.pan.setTargetAtTime(best.pan, now, 0.1);
    if (best.level > 0.01) {
      while (this.nextPop < now + 0.25) {
        if (this.nextPop > now) this.pop(this.nextPop);
        this.nextPop = Math.max(this.nextPop, now) + 0.04 + Math.random() * (0.5 - 0.3 * this.fireStrength);
      }
    }

    // Birds: a phrase every few seconds, from a random direction, near or far.
    if (now > this.nextBird) {
      this.bird(now + 0.05);
      this.nextBird = now + 1.5 + Math.random() * 5;
    }
  }

  /** RMS level per bus (0..1), for automated checks. */
  levels(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, b] of Object.entries(this.buses)) {
      const a = new Float32Array(b.meter.fftSize);
      b.meter.getFloatTimeDomainData(a);
      out[k] = Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length);
    }
    out.fireProximity = this.fireLevel;
    return out;
  }

  private loop(buffer: AudioBuffer): AudioBufferSourceNode {
    const s = this.ctx.createBufferSource();
    s.buffer = buffer;
    s.loop = true;
    s.loopStart = 0.05; // just after the crossfaded region (see makeNoise)
    s.start(0, Math.random() * buffer.duration);
    return s;
  }

  /** One crackle: a tiny filtered noise burst, sometimes a bigger snap. */
  private pop(at: number): void {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 900 + Math.random() * 3500;
    hp.Q.value = 1.5 + Math.random() * 3;
    const g = ctx.createGain();
    const big = Math.random() < 0.12;
    const peak = (big ? 0.9 : 0.25 + Math.random() * 0.35);
    const len = big ? 0.05 : 0.008 + Math.random() * 0.02;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak, at + 0.002);
    g.gain.exponentialRampToValueAtTime(0.001, at + len);
    src.connect(hp).connect(g).connect(this.fireGain);
    src.start(at, Math.random() * 3, len + 0.02);
  }

  /** A short birdsong phrase from one of a few made-up species. */
  private bird(at: number): void {
    const ctx = this.ctx;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    const distance = Math.random();
    const out = ctx.createGain();
    out.gain.value = 0.25 + 0.75 * (1 - distance);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 9000 - distance * 5500; // far birds sound duller
    out.connect(lp).connect(pan).connect(this.buses.birds.gain);
    const note = (t: number, f0: number, f1: number, dur: number, vol = 1, trill = 0) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      if (trill) {
        const lfo = ctx.createOscillator();
        const depth = ctx.createGain();
        lfo.frequency.value = trill;
        depth.gain.value = f0 * 0.08;
        lfo.connect(depth).connect(o.frequency);
        lfo.start(t);
        lfo.stop(t + dur + 0.02);
      }
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.22 * vol, t + Math.min(0.015, dur / 3));
      g.gain.setValueAtTime(0.22 * vol, t + dur * 0.6);
      g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dur + 0.02);
    };
    const pitch = 0.85 + Math.random() * 0.3;
    switch (Math.floor(Math.random() * 4)) {
      case 0: { // clear falling whistles: "tsee tsee tsoo"
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) note(at + i * 0.32, 4200 * pitch, 3600 * pitch, 0.18);
        note(at + n * 0.32, 3300 * pitch, 2500 * pitch, 0.32, 0.9);
        break;
      }
      case 1: { // quick rising chirps
        const n = 4 + Math.floor(Math.random() * 5);
        for (let i = 0; i < n; i++) note(at + i * 0.11, 2800 * pitch, 4600 * pitch, 0.06, 0.8);
        break;
      }
      case 2: // a warbling trill
        note(at, 3600 * pitch, 3900 * pitch, 0.9 + Math.random() * 0.6, 0.7, 26 + Math.random() * 10);
        break;
      default: { // two-note call, like a far-off song thrush
        for (let r = 0; r < 2; r++) {
          note(at + r * 0.7, 2300 * pitch, 2900 * pitch, 0.14, 0.9);
          note(at + r * 0.7 + 0.18, 3100 * pitch, 2400 * pitch, 0.2, 0.9);
        }
      }
    }
  }
}

function makeNoise(ctx: BaseAudioContext, seconds: number, kind: 'white' | 'brown'): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'white') d[i] = w;
    else {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  // Crossfade the end into the start of the loop region (which begins at 0.05 s), so looping
  // from the end back to loopStart has no click.
  const fade = Math.floor(ctx.sampleRate * 0.05);
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    d[len - fade + i] = d[len - fade + i] * (1 - k) + d[i] * k;
  }
  return buf;
}
