import { NET } from '../config/gameConfig';

/** Bir iç düğümün komşu sayısı (sol, sağ, üst, alt). */
const NEIGHBORS = 4;

/**
 * Kale ağı dalgalanması: kenarlarından (direkler, zemin, arka) sabitlenmiş bir yay ağı.
 * Her iç düğüm yerine bir yayla bağlıdır ve komşularına bağlanır (ayrık dalga denklemi), böylece
 * topun çarptığı yerden dalga yayılır ve söner. Yalnızca görseldir; Phaser'dan bağımsızdır.
 *
 * Düğüm (i, j): i = derinlik (0 = kale çizgisi … cols−1 = arka), j = yükseklik (0 = üst direk …
 * rows−1 = zemin). Konumlar ağ dikdörtgenine göre px; boyut `setSize` ile değişebilir (büyüyen
 * kale).
 */
export class NetSim {
  readonly ox: Float32Array;
  readonly oy: Float32Array;
  private readonly vx: Float32Array;
  private readonly vy: Float32Array;
  private width = 1;
  private height = 1;
  /** Ağ hareket ediyor mu (değilse çizim yeniden yapılmayabilir). */
  active = false;

  constructor(
    readonly cols: number,
    readonly rows: number,
  ) {
    const n = cols * rows;
    this.ox = new Float32Array(n);
    this.oy = new Float32Array(n);
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  /** Düğümün dinlenme konumu (ağ dikdörtgeninin sol üstüne göre px). */
  restX(i: number): number {
    return (i / (this.cols - 1)) * this.width;
  }

  restY(j: number): number {
    return (j / (this.rows - 1)) * this.height;
  }

  /**
   * Bir noktaya (ağa göre px) hız darbesi verir: yakın düğümler (`NET.impulseRadiusPx` içinde)
   * uzaklıkla azalan oranda hız kazanır.
   */
  impulse(x: number, y: number, ivx: number, ivy: number): void {
    const r = NET.impulseRadiusPx;
    const r2 = r * r;
    let hit = false;
    for (let j = 1; j < this.rows - 1; j++) {
      for (let i = 1; i < this.cols - 1; i++) {
        const dx = this.restX(i) - x;
        const dy = this.restY(j) - y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= r2) continue;
        const w = 1 - Math.sqrt(d2) / r;
        const k = j * this.cols + i;
        this.vx[k] = (this.vx[k] ?? 0) + ivx * w;
        this.vy[k] = (this.vy[k] ?? 0) + ivy * w;
        hit = true;
      }
    }
    if (hit) this.active = true;
  }

  /** Ağı `dt` kadar ilerletir (kararlılık için küçük alt adımlarla). */
  update(dt: number): void {
    if (!this.active || dt <= 0) return;
    const steps = Math.max(1, Math.ceil(dt / NET.maxSubStepSeconds));
    const h = dt / steps;
    for (let s = 0; s < steps; s++) this.subStep(h);
    if (this.energy() < NET.restEpsilon) this.reset();
  }

  /** Tüm sapmaların mutlak toplamı + hızlar (sönme denetimi ve testler için). */
  energy(): number {
    let e = 0;
    for (let k = 0; k < this.ox.length; k++) {
      e += Math.abs(this.ox[k] ?? 0) + Math.abs(this.oy[k] ?? 0);
      e += (Math.abs(this.vx[k] ?? 0) + Math.abs(this.vy[k] ?? 0)) * NET.maxSubStepSeconds;
    }
    return e;
  }

  reset(): void {
    this.ox.fill(0);
    this.oy.fill(0);
    this.vx.fill(0);
    this.vy.fill(0);
    this.active = false;
  }

  private subStep(h: number): void {
    const { cols, rows, ox, oy, vx, vy } = this;
    const { stiffness: k, coupling: c, damping: d, maxOffsetPx: max } = NET;
    // Hızlar (yarı örtük Euler): kenar düğümleri sabit kalır.
    for (let j = 1; j < rows - 1; j++) {
      for (let i = 1; i < cols - 1; i++) {
        const n = j * cols + i;
        const x = ox[n] ?? 0;
        const y = oy[n] ?? 0;
        const lx = (ox[n - 1] ?? 0) + (ox[n + 1] ?? 0) + (ox[n - cols] ?? 0) + (ox[n + cols] ?? 0);
        const ly = (oy[n - 1] ?? 0) + (oy[n + 1] ?? 0) + (oy[n - cols] ?? 0) + (oy[n + cols] ?? 0);
        const ax = -k * x + c * (lx - NEIGHBORS * x) - d * (vx[n] ?? 0);
        const ay = -k * y + c * (ly - NEIGHBORS * y) - d * (vy[n] ?? 0);
        vx[n] = (vx[n] ?? 0) + ax * h;
        vy[n] = (vy[n] ?? 0) + ay * h;
      }
    }
    for (let j = 1; j < rows - 1; j++) {
      for (let i = 1; i < cols - 1; i++) {
        const n = j * cols + i;
        ox[n] = clampAbs((ox[n] ?? 0) + (vx[n] ?? 0) * h, max);
        oy[n] = clampAbs((oy[n] ?? 0) + (vy[n] ?? 0) * h, max);
      }
    }
  }
}

function clampAbs(v: number, max: number): number {
  return v > max ? max : v < -max ? -max : v;
}
