/**
 * Sabit adımlı simülasyon döngüsü (fixed timestep + accumulator).
 *
 * Render karesinin süresi ne olursa olsun simülasyon her zaman aynı `stepSeconds`
 * ile ilerler. Böylece aynı input dizisi → birebir aynı sonuç (determinizm) elde edilir.
 * Bu sınıf Phaser'a bağımlı değildir; testlerde ve gol tekrarında doğrudan kullanılır.
 */

export interface FixedStepOptions {
  /** Bir simülasyon adımının süresi (sn), örn. 1/60. */
  readonly stepSeconds: number;
  /** Tek karede birikime eklenebilecek en uzun süre (sn). */
  readonly maxFrameSeconds: number;
  /** Bir karede koşulabilecek en fazla adım sayısı. */
  readonly maxStepsPerFrame: number;
  /** Kayan nokta birikim toleransı (sn). */
  readonly epsilonSeconds: number;
}

/** Her simülasyon adımında çağrılır. `tick` 0'dan başlayan adım sayacıdır. */
export type StepCallback = (dt: number, tick: number) => void;

export class FixedStepLoop {
  private accumulator = 0;
  private tickCount = 0;

  constructor(private readonly options: FixedStepOptions) {
    const { stepSeconds, maxFrameSeconds, maxStepsPerFrame, epsilonSeconds } = options;
    if (!(stepSeconds > 0)) throw new RangeError('stepSeconds > 0 olmalı');
    if (!(maxFrameSeconds >= stepSeconds)) {
      throw new RangeError('maxFrameSeconds >= stepSeconds olmalı');
    }
    if (!Number.isInteger(maxStepsPerFrame) || maxStepsPerFrame < 1) {
      throw new RangeError('maxStepsPerFrame pozitif tam sayı olmalı');
    }
    if (!(epsilonSeconds >= 0)) throw new RangeError('epsilonSeconds >= 0 olmalı');
  }

  /**
   * Geçen gerçek süreyi biriktirir ve gereken sayıda sabit adım koşar.
   * @param frameSeconds Son kareden bu yana geçen süre (sn).
   * @returns Bu karede koşulan adım sayısı.
   */
  advance(frameSeconds: number, step: StepCallback): number {
    if (!Number.isFinite(frameSeconds) || frameSeconds <= 0) return 0;

    const { stepSeconds, maxFrameSeconds, maxStepsPerFrame, epsilonSeconds } = this.options;
    this.accumulator += Math.min(frameSeconds, maxFrameSeconds);

    let steps = 0;
    while (this.accumulator + epsilonSeconds >= stepSeconds && steps < maxStepsPerFrame) {
      step(stepSeconds, this.tickCount);
      this.tickCount++;
      this.accumulator = Math.max(0, this.accumulator - stepSeconds);
      steps++;
    }

    // Adım sınırına takıldıysak birikmiş fazlalığı at: yavaş cihazda "yetişmeye çalışma"
    // döngüsüne girmek yerine oyun bir an yavaşlar.
    if (this.accumulator + epsilonSeconds >= stepSeconds) {
      this.accumulator %= stepSeconds;
    }
    return steps;
  }

  /** Render enterpolasyonu için 0 ≤ alpha < 1: son adımdan bu yana geçen kesir. */
  get alpha(): number {
    return Math.min(this.accumulator / this.options.stepSeconds, 1);
  }

  /** Şimdiye kadar koşulan toplam adım sayısı. */
  get ticks(): number {
    return this.tickCount;
  }

  get stepSeconds(): number {
    return this.options.stepSeconds;
  }

  reset(): void {
    this.accumulator = 0;
    this.tickCount = 0;
  }
}
