import { clamp } from './math';

export interface SubStepOptions {
  /** En az alt adım sayısı. */
  readonly subSteps: number;
  /** En fazla alt adım sayısı. */
  readonly maxSubSteps: number;
  /** Bir alt adımda kat edilebilecek en uzun yol (px). */
  readonly maxTravelPerSubStep: number;
}

/**
 * Uyarlamalı sub-stepping: en hızlı cismin bir alt adımda `maxTravelPerSubStep`'ten fazla
 * yol almayacağı kadar alt adım seçer. Sonuç yalnızca hıza bağlıdır (deterministik).
 *
 * @param maxSpeed Bu adımdaki en hızlı noktanın hızı (px/sn).
 * @param dt       Sabit adım süresi (sn).
 */
export function computeSubSteps(maxSpeed: number, dt: number, options: SubStepOptions): number {
  const travel = Math.abs(maxSpeed) * dt;
  const needed = Number.isFinite(travel)
    ? Math.ceil(travel / options.maxTravelPerSubStep)
    : options.maxSubSteps;
  return clamp(needed, options.subSteps, options.maxSubSteps);
}
