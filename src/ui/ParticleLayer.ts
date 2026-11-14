import Phaser from 'phaser';
import { FX_KEYS } from '../art/fxArt';
import {
  PARTICLE_PRESETS,
  PARTICLES,
  type ParticlePresetDef,
  type ParticlePresetName,
} from '../config/gameConfig';
import type { QualityLevel } from '../fx/feel';
import { frameIndex, PARTICLE_FLAGS, PARTICLE_FRAMES, ParticlePool } from '../fx/ParticlePool';

/** Sık kullanılan renk. */
const WHITE = 0xffffff;

type Image = Phaser.GameObjects.Image;

/** Patlama seçenekleri (ön ayarın üzerine). */
export interface BurstOptions {
  /** Merkez açı (rad) — ön ayarınkini ezer (ör. şut yönü). */
  angle?: number;
  /** Hız çarpanı (sert vuruş → daha hızlı kıvılcım). */
  speedScale?: number;
  /** Sayı çarpanı. */
  countScale?: number;
  /** Tek renk (ön ayarın renk listesi yerine). */
  color?: number;
  /** Renk listesi (ör. konfetide golcünün renkleri). */
  colors?: readonly number[];
  /** Boy çarpanı. */
  sizeScale?: number;
}

/**
 * Parçacık sistemi: iki nesne havuzu (normal ve toplamalı karışım) + her biri için önceden
 * kurulmuş Image havuzu. Oyun sırasında hiç nesne oluşturulmaz: canlı parçacık `i`, `i`.
 * Image'a yazılır; fazlası gizlenir. Tek doku atlası ve havuz başına tek karışım kipiyle
 * çizim birkaç çağrıda toplanır.
 */
export class ParticleLayer {
  private readonly pools: [ParticlePool, ParticlePool];
  private readonly images: [Image[], Image[]];
  private readonly shown: [number, number] = [0, 0];
  private readonly lastFrame: [Uint8Array, Uint8Array];
  private readonly lastTint: [Uint32Array, Uint32Array];
  private countScale = 1;

  constructor(
    scene: Phaser.Scene,
    normalLayer: Phaser.GameObjects.Container,
    additiveLayer: Phaser.GameObjects.Container,
    quality: QualityLevel,
  ) {
    const cap = PARTICLES.capacity;
    const maxNormal = Math.max(...cap.normal);
    const maxAdd = Math.max(...cap.additive);
    this.pools = [new ParticlePool(maxNormal), new ParticlePool(maxAdd)];
    const make = (n: number, layer: Phaser.GameObjects.Container, additive: boolean): Image[] => {
      const list: Image[] = [];
      for (let i = 0; i < n; i++) {
        const img = scene.add.image(0, 0, FX_KEYS.particles, PARTICLE_FRAMES[0]).setVisible(false);
        if (additive) img.setBlendMode(Phaser.BlendModes.ADD);
        list.push(img);
      }
      layer.add(list);
      return list;
    };
    this.images = [make(maxNormal, normalLayer, false), make(maxAdd, additiveLayer, true)];
    this.lastFrame = [
      new Uint8Array(maxNormal).fill(NO_FRAME),
      new Uint8Array(maxAdd).fill(NO_FRAME),
    ];
    this.lastTint = [new Uint32Array(maxNormal), new Uint32Array(maxAdd)];
    this.setQuality(quality);
  }

  setQuality(level: QualityLevel): void {
    const cap = PARTICLES.capacity;
    this.pools[0].setLimit(cap.normal[level]);
    this.pools[1].setLimit(cap.additive[level]);
    this.countScale = PARTICLES.countScale[level];
  }

  /** Bir ön ayarla parçacık patlaması. */
  burst(name: ParticlePresetName, x: number, y: number, opts?: BurstOptions): void {
    const p: ParticlePresetDef = PARTICLE_PRESETS[name];
    const pool = this.pools[p.additive ? 1 : 0];
    const scale = (opts?.countScale ?? 1) * this.countScale;
    const n = Math.max(1, Math.round(range(p.count[0], p.count[1]) * scale));
    const angle = opts?.angle ?? p.angle;
    const speedScale = opts?.speedScale ?? 1;
    const sizeScale = opts?.sizeScale ?? 1;
    const colors = opts?.colors ?? p.colors;
    const frame = frameIndex(p.frame);
    const flags =
      (p.align === true ? PARTICLE_FLAGS.align : 0) |
      (p.flutter === true ? PARTICLE_FLAGS.flutter : 0);
    for (let k = 0; k < n; k++) {
      const i = pool.spawn();
      const a = angle + (Math.random() * 2 - 1) * p.spread;
      const speed = range(p.speed[0], p.speed[1]) * speedScale;
      pool.x[i] = x + (Math.random() * 2 - 1) * p.jitter;
      pool.y[i] = y + (Math.random() * 2 - 1) * p.jitter * (p.jitter > JITTER_WIDE ? 0 : 1);
      pool.vx[i] = Math.cos(a) * speed;
      pool.vy[i] = Math.sin(a) * speed;
      pool.life[i] = range(p.life[0], p.life[1]);
      const size = range(p.size[0], p.size[1]) * sizeScale;
      pool.size0[i] = size;
      pool.size1[i] = size * p.sizeEnd;
      pool.gravity[i] = p.gravity;
      pool.drag[i] = p.drag;
      pool.rot[i] = Math.random() * Math.PI * 2;
      pool.spin[i] = range(p.spin[0], p.spin[1]);
      pool.alpha0[i] = p.alpha;
      pool.alpha1[i] = p.alphaEnd;
      pool.color[i] = opts?.color ?? colors[Math.floor(Math.random() * colors.length)] ?? WHITE;
      pool.frame[i] = frame;
      pool.flags[i] = flags;
    }
  }

  update(dt: number): void {
    for (let k = 0; k < 2; k++) {
      const pool = this.pools[k as 0 | 1];
      pool.update(dt);
      this.sync(k as 0 | 1);
    }
  }

  clear(): void {
    for (let k = 0; k < 2; k++) {
      this.pools[k as 0 | 1].clear();
      this.sync(k as 0 | 1);
    }
  }

  /** Canlı parçacık sayısı (debug/ölçüm). */
  get liveCount(): number {
    return this.pools[0].count + this.pools[1].count;
  }

  /** Havuzdaki parçacıkları Image'lara yazar. */
  private sync(k: 0 | 1): void {
    const pool = this.pools[k];
    const images = this.images[k];
    const lastFrame = this.lastFrame[k];
    const lastTint = this.lastTint[k];
    const cell = CELL;
    const stretch = PARTICLES.stretchPerSpeed;
    for (let i = 0; i < pool.count; i++) {
      const img = images[i];
      if (!img) break;
      const t = pool.progress(i);
      const size = (pool.size0[i] ?? 1) + ((pool.size1[i] ?? 1) - (pool.size0[i] ?? 1)) * t;
      const a0 = pool.alpha0[i] ?? 1;
      const alpha = a0 + ((pool.alpha1[i] ?? 0) - a0) * t * t;
      const flags = pool.flags[i] ?? 0;
      let sx = size / cell;
      const sy = sx;
      let rot = pool.rot[i] ?? 0;
      if ((flags & PARTICLE_FLAGS.align) !== 0) {
        const vx = pool.vx[i] ?? 0;
        const vy = pool.vy[i] ?? 0;
        rot = Math.atan2(vy, vx);
        sx *= 1 + Math.hypot(vx, vy) * stretch;
      } else if ((flags & PARTICLE_FLAGS.flutter) !== 0) {
        sx *= FLUTTER_MIN + (1 - FLUTTER_MIN) * Math.abs(Math.cos(rot * PARTICLES.flutterRate));
      }
      const frame = pool.frame[i] ?? 0;
      if (lastFrame[i] !== frame) {
        img.setFrame(PARTICLE_FRAMES[frame] ?? PARTICLE_FRAMES[0]);
        lastFrame[i] = frame;
      }
      const tint = pool.color[i] ?? WHITE;
      if (lastTint[i] !== tint) {
        img.setTint(tint);
        lastTint[i] = tint;
      }
      img.setPosition(pool.x[i] ?? 0, pool.y[i] ?? 0);
      img.setScale(sx, sy);
      img.setRotation(rot);
      img.setAlpha(alpha);
      if (!img.visible) img.setVisible(true);
    }
    for (let i = pool.count; i < this.shown[k]; i++) images[i]?.setVisible(false);
    this.shown[k] = pool.count;
  }
}

/** Atlas karesinin kenarı (px) — `fxArt.ts` ile aynı. */
const CELL = 48;
const NO_FRAME = 255;
const FLUTTER_MIN = 0.2;
/** Bu yayılımın üstündeki ön ayarlar (yağmur) yalnızca yatayda yayılır. */
const JITTER_WIDE = 200;

function range(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Kısa ömürlü tekil efekt Image'ları (vuruş flaşı, şok halkası) için havuz: büyüyüp sönen
 * sprite'lar, tween kullanılmadan (oyun sırasında bellek ayrılmaz).
 */
export class SpritePool {
  private readonly items: {
    img: Image;
    age: number;
    life: number;
    s0: number;
    s1: number;
    a0: number;
    spin: number;
  }[] = [];
  private cursor = 0;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    texture: string,
    size: number,
    additive: boolean,
  ) {
    for (let i = 0; i < size; i++) {
      const img = scene.add.image(0, 0, texture).setVisible(false);
      if (additive) img.setBlendMode(Phaser.BlendModes.ADD);
      layer.add(img);
      this.items.push({ img, age: 0, life: 0, s0: 1, s1: 1, a0: 1, spin: 0 });
    }
  }

  spawn(
    x: number,
    y: number,
    opts: {
      life: number;
      scaleFrom: number;
      scaleTo: number;
      alpha?: number;
      tint?: number;
      rotation?: number;
      spin?: number;
    },
  ): void {
    const it = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.items.length;
    if (!it) return;
    it.age = 0;
    it.life = opts.life;
    it.s0 = opts.scaleFrom;
    it.s1 = opts.scaleTo;
    it.a0 = opts.alpha ?? 1;
    it.spin = opts.spin ?? 0;
    it.img
      .setPosition(x, y)
      .setRotation(opts.rotation ?? 0)
      .setTint(opts.tint ?? WHITE)
      .setScale(opts.scaleFrom)
      .setAlpha(it.a0)
      .setVisible(true);
  }

  update(dt: number): void {
    for (const it of this.items) {
      if (!it.img.visible) continue;
      it.age += dt;
      const t = it.age / it.life;
      if (t >= 1) {
        it.img.setVisible(false);
        continue;
      }
      const ease = 1 - (1 - t) * (1 - t);
      it.img.setScale(it.s0 + (it.s1 - it.s0) * ease);
      it.img.setAlpha(it.a0 * (1 - t));
      if (it.spin !== 0) it.img.rotation += it.spin * dt;
    }
  }

  clear(): void {
    for (const it of this.items) it.img.setVisible(false);
  }
}
