import { describe, expect, it } from 'vitest';
import { FixedStepLoop, type FixedStepOptions } from './FixedStepLoop';
import { createGameLoop } from './createGameLoop';
import { LOOP } from '../config/gameConfig';

const STEP = 1 / 60;
const OPTIONS: FixedStepOptions = {
  stepSeconds: STEP,
  maxFrameSeconds: 0.25,
  maxStepsPerFrame: 8,
  epsilonSeconds: 1e-9,
};

function run(loop: FixedStepLoop, frames: readonly number[]): number[] {
  const ticks: number[] = [];
  for (const f of frames) loop.advance(f, (_dt, tick) => ticks.push(tick));
  return ticks;
}

describe('FixedStepLoop', () => {
  it('60 Hz karelerde her karede tam olarak bir adım koşar', () => {
    const loop = new FixedStepLoop(OPTIONS);
    const perFrame: number[] = [];
    for (let i = 0; i < 600; i++) perFrame.push(loop.advance(STEP, () => undefined));
    expect(perFrame.every((n) => n === 1)).toBe(true);
    expect(loop.ticks).toBe(600);
  });

  it('adım süresi kare süresinden bağımsız olarak hep sabittir', () => {
    const loop = new FixedStepLoop(OPTIONS);
    const dts = new Set<number>();
    for (const f of [0.001, 0.033, 0.007, 0.05, 0.016]) loop.advance(f, (dt) => dts.add(dt));
    expect([...dts]).toEqual([STEP]);
  });

  it('144 Hz ekranda bir saniyede ~60 adım koşar', () => {
    const loop = new FixedStepLoop(OPTIONS);
    for (let i = 0; i < 144; i++) loop.advance(1 / 144, () => undefined);
    expect(loop.ticks).toBeGreaterThanOrEqual(59);
    expect(loop.ticks).toBeLessThanOrEqual(60);
  });

  it('30 Hz ekranda her karede iki adım koşar', () => {
    const loop = new FixedStepLoop(OPTIONS);
    const perFrame: number[] = [];
    for (let i = 0; i < 30; i++) perFrame.push(loop.advance(1 / 30, () => undefined));
    expect(perFrame.every((n) => n === 2)).toBe(true);
  });

  it('uzun duraklamada adım sayısını sınırlar (ölüm sarmalı yok)', () => {
    const loop = new FixedStepLoop(OPTIONS);
    const steps = loop.advance(5, () => undefined);
    expect(steps).toBe(OPTIONS.maxStepsPerFrame);
    // Fazlalık atılmış olmalı: sonraki normal kare yine tek adım.
    expect(loop.advance(STEP, () => undefined)).toBe(1);
  });

  it('negatif, sıfır veya geçersiz süreleri yok sayar', () => {
    const loop = new FixedStepLoop(OPTIONS);
    for (const f of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(loop.advance(f, () => undefined)).toBe(0);
    }
    expect(loop.ticks).toBe(0);
  });

  it('alpha her zaman [0, 1) aralığındadır', () => {
    const loop = new FixedStepLoop(OPTIONS);
    for (let i = 0; i < 1000; i++) {
      loop.advance(0.003 + (i % 7) * 0.004, () => undefined);
      expect(loop.alpha).toBeGreaterThanOrEqual(0);
      expect(loop.alpha).toBeLessThan(1);
    }
  });

  it('deterministiktir: aynı kare dizisi → aynı adım dizisi', () => {
    const frames = Array.from({ length: 500 }, (_, i) => 0.004 + ((i * 7919) % 13) * 0.003);
    const a = run(new FixedStepLoop(OPTIONS), frames);
    const b = run(new FixedStepLoop(OPTIONS), frames);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('reset sayaçları sıfırlar', () => {
    const loop = new FixedStepLoop(OPTIONS);
    loop.advance(0.1, () => undefined);
    loop.reset();
    expect(loop.ticks).toBe(0);
    expect(loop.alpha).toBe(0);
  });

  it('geçersiz ayarları reddeder', () => {
    expect(() => new FixedStepLoop({ ...OPTIONS, stepSeconds: 0 })).toThrow(RangeError);
    expect(() => new FixedStepLoop({ ...OPTIONS, maxStepsPerFrame: 0 })).toThrow(RangeError);
    expect(() => new FixedStepLoop({ ...OPTIONS, maxFrameSeconds: STEP / 2 })).toThrow(RangeError);
  });
});

describe('createGameLoop', () => {
  it('gameConfig değerlerinden 60 Hz döngü kurar', () => {
    const loop = createGameLoop();
    expect(loop.stepSeconds).toBeCloseTo(1 / LOOP.stepHz, 12);
  });
});
