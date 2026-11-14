import { stepBallAlone } from '../ballPhysics';
import { Ball } from '../entities/Ball';
import { STEP_SECONDS } from '../GameSim';
import { createPitch, type GoalDef, type Pitch } from '../pitch';
import { isBallInGoal } from '../rules/ballRules';
import type { BallView } from './worldView';

/** Adım başına saklanan değerler: x, y, vx, vy, görünmez (ışınlanma) mı, yarıçap. */
const STRIDE = 6;
const VX = 2;
const VY = 3;
const PHASED = 4;
const RADIUS = 5;

/**
 * Topun yörünge tahmincisi: ayrı bir "hayalet" dünyada (kendi top + saha kopyası) topu
 * GameSim'in **aynı** fizik koduyla (`stepBallAlone`) ileri simüle eder — yerçekimi, hava
 * direnci, falso, duvar/tavan/direk sekmeleri, üst direk kuralı ve süper etkileri (Ateş Topu,
 * Zikzak, Mıknatıs, Işınlanma, Dev Top, Gökkuşağı) dahil. Oyuncular hesaba katılmaz (kimse
 * dokunmazsa top nereye gider?).
 *
 * Sonuç önceden ayrılmış bir tamponda tutulur; tahmin sırasında bellek ayrılmaz.
 * İndeks k = başlangıçtan k adım sonrası (k = 0 başlangıç durumu).
 */
export class BallPredictor {
  private readonly ghost = new Ball();
  private readonly data: Float64Array;
  private readonly probe = { x: 0, y: 0, radius: this.ghost.radius };

  /** Tahminin kullandığı saha (kale yükseklikleri AI tarafından güncellenir). */
  get field(): Pitch {
    return this.pitch;
  }
  private count = 0;

  constructor(
    readonly maxSteps: number,
    private readonly pitch: Pitch = createPitch(),
  ) {
    this.data = new Float64Array((maxSteps + 1) * STRIDE);
  }

  /** Tahmin edilen nokta sayısı (başlangıç dahil). */
  get length(): number {
    return this.count;
  }

  /** `start` durumundan `steps` adım ileri simüle eder (en çok `maxSteps`). */
  predict(start: BallView, steps: number): void {
    const b = this.ghost;
    b.resetTo(start.x, start.y);
    b.vx = start.vx;
    b.vy = start.vy;
    b.angVel = start.angVel;
    b.crossbarTimer = start.crossbarTimer;
    b.copySuper(start.super);
    const n = Math.min(Math.max(0, Math.floor(steps)), this.maxSteps);
    this.count = 0;
    this.record();
    for (let k = 0; k < n; k++) {
      stepBallAlone(b, this.pitch, STEP_SECONDS);
      this.record();
    }
  }

  private record(): void {
    const b = this.ghost;
    const i = this.count * STRIDE;
    this.data[i] = b.x;
    this.data[i + 1] = b.y;
    this.data[i + VX] = b.vx;
    this.data[i + VY] = b.vy;
    this.data[i + PHASED] = b.phased ? 1 : 0;
    this.data[i + RADIUS] = b.radius;
    this.count++;
  }

  private at(k: number, offset: number): number {
    const last = this.count - 1;
    const idx = k < 0 ? 0 : k > last ? last : Math.floor(k);
    return this.data[idx * STRIDE + offset] ?? 0;
  }

  /** k. adımdaki değerler; aralık dışı k en yakın uca kırpılır. */
  x(k: number): number {
    return this.at(k, 0);
  }
  y(k: number): number {
    return this.at(k, 1);
  }
  vx(k: number): number {
    return this.at(k, VX);
  }
  vy(k: number): number {
    return this.at(k, VY);
  }
  /** k. adımda top ışınlanıyor mu (görünmez, oyunculara değmez)? */
  phased(k: number): boolean {
    return this.at(k, PHASED) > 0;
  }
  radius(k: number): number {
    return this.at(k, RADIUS);
  }

  /** Topun `goal` kalesine tamamen girdiği ilk adım (`from`'dan itibaren), yoksa −1. */
  goalEntry(goal: GoalDef, from = 0): number {
    for (let k = Math.max(0, from); k < this.count; k++) {
      this.probe.x = this.x(k);
      this.probe.y = this.y(k);
      this.probe.radius = this.radius(k);
      if (isBallInGoal(this.probe, goal)) return k;
    }
    return -1;
  }
}
