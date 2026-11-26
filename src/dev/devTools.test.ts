import { describe, expect, it } from 'vitest';
import { PERF } from '../config/gameConfig';
import { loadoutFor } from '../game/characters';
import { GameSim, type GameSimOptions } from '../game/GameSim';
import { EMPTY_INPUT, type InputState } from '../input/InputState';
import { Histogram, PerfMonitor } from './perfStats';
import { RollbackProbe, sameState } from './rollbackProbe';

/** Küçük, deterministik PRNG (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInput(next: () => number, toward: 'left' | 'right'): InputState {
  return {
    ...EMPTY_INPUT,
    [toward]: next() < 0.6,
    jump: next() < 0.2,
    kick: next() < 0.3,
    super: next() < 0.05,
  };
}

describe('Histogram', () => {
  it('yüzdelik, ortalama ve eşik aşımı', () => {
    const h = new Histogram();
    for (let i = 1; i <= 100; i++) h.add(i / 10); // 0,1 … 10 ms
    expect(h.count).toBe(100);
    expect(h.mean).toBeCloseTo(5.05, 5);
    expect(h.quantile(0.5)).toBeCloseTo(5.1, 5);
    expect(h.quantile(0.99)).toBeCloseTo(10, 1);
    expect(h.countAbove(9)).toBe(10);
    h.add(500); // taşma kovası
    expect(h.max).toBe(500);
    expect(h.quantile(1)).toBe(500);
    h.reset();
    expect(h.count).toBe(0);
    expect(h.quantile(0.5)).toBe(0);
  });
});

describe('PerfMonitor (QUALITY_BAR P1–P3)', () => {
  it('60 FPS akış P1 ve P2 geçer; dakika özetleri tutulur', () => {
    const m = new PerfMonitor();
    const frameMs = 1000 / 60;
    const frames = Math.ceil((2 * PERF.msPerMinute) / frameMs) + 5;
    for (let i = 0; i < frames; i++) m.frame(frameMs, 6, 2);
    expect(m.minutes).toHaveLength(2);
    expect(m.minutes[0]?.fps).toBeCloseTo(60, 0);
    expect(m.minutes[0]?.quality).toBe(2);
    const v = m.verdict();
    expect(v.p1).toBe(true);
    expect(v.p2).toBe(true);
    expect(v.p3).toBe(true);
    expect(v.fpsDrop).toBeCloseTo(0, 1);
  });

  it('takılma P2yi, vsync kaçırma P1i bozar; ısınmayla FPS düşüşü P3ü bozar', () => {
    const m = new PerfMonitor();
    const fast = 1000 / 60;
    const slow = 1000 / 50;
    let t = 0;
    while (t < PERF.msPerMinute) {
      m.frame(fast, 6);
      t += fast;
    }
    while (t < 2 * PERF.msPerMinute + slow) {
      m.frame(slow + 1, 6); // 21 ms: geç kare
      t += slow + 1;
    }
    m.frame(PERF.hitchMs + 5, 30);
    const v = m.verdict();
    expect(v.p1).toBe(false);
    expect(v.p2).toBe(false);
    expect(v.p3).toBe(false);
    expect(v.fpsDrop ?? 0).toBeGreaterThan(PERF.thermalFpsDrop);
  });

  it('arka plan gibi dev aralıklar ölçüme girmez; grafik halka tamponu döner', () => {
    const m = new PerfMonitor();
    m.frame(PERF.ignoreAboveMs + 1, 1);
    expect(m.interval.count).toBe(0);
    for (let i = 0; i < PERF.graph.frames + 3; i++) m.frame(10 + i, 1);
    expect(m.head).toBe(3);
    expect(m.ringInterval[2]).toBe(10 + PERF.graph.frames + 2);
  });
});

describe('RollbackProbe (QUALITY_BAR P9)', () => {
  const options = (): GameSimOptions => ({
    loadouts: [loadoutFor('kor'), loadoutFor('ayaz')],
    seed: 77,
  });

  it('8 adım geri sarıp yeniden simüle etmek canlı durumla birebir aynı sonucu verir', () => {
    const sim = new GameSim(options());
    const probe = new RollbackProbe(sim, new GameSim(options()), PERF.rollbackFrames, 5);
    const next = rng(9);
    const STEPS = 900;
    for (let i = 0; i < STEPS; i++) {
      const a = randomInput(next, 'right');
      const b = randomInput(next, 'left');
      probe.beforeStep(a, b);
      sim.step([a, b]);
      probe.frame();
    }
    expect(probe.total.count).toBe(STEPS - PERF.rollbackFrames + 1);
    expect(probe.save.count).toBe(STEPS);
    expect(probe.verified).toBeGreaterThan(100);
    expect(probe.mismatches).toBe(0);
  });

  it('canlı simülasyonu değiştirmez (aynı girdilerle ölçer olmadan aynı durum)', () => {
    const run = (withProbe: boolean): unknown => {
      const sim = new GameSim(options());
      const probe = withProbe ? new RollbackProbe(sim, new GameSim(options())) : null;
      const next = rng(4);
      for (let i = 0; i < 600; i++) {
        const a = randomInput(next, 'right');
        const b = randomInput(next, 'left');
        probe?.beforeStep(a, b);
        sim.step([a, b]);
        probe?.frame();
      }
      return sim.saveState();
    };
    expect(sameState(run(true), run(false))).toBe(true);
  });

  it('farklı kurulumla oluşturulmuş gölge uyuşmazlık olarak yakalanır', () => {
    const sim = new GameSim(options());
    const shadow = new GameSim({ loadouts: [loadoutFor('pamuk'), loadoutFor('kaya')], seed: 77 });
    const probe = new RollbackProbe(sim, shadow, PERF.rollbackFrames, 1);
    const next = rng(2);
    for (let i = 0; i < 400; i++) {
      const a = randomInput(next, 'right');
      const b = randomInput(next, 'left');
      probe.beforeStep(a, b);
      sim.step([a, b]);
      probe.frame();
    }
    expect(probe.mismatches).toBeGreaterThan(0);
  });

  it('geçmiş yetersizken (maç başı) kare atlanır', () => {
    const sim = new GameSim(options());
    const probe = new RollbackProbe(sim, new GameSim(options()));
    probe.beforeStep(EMPTY_INPUT, EMPTY_INPUT);
    sim.step([EMPTY_INPUT, EMPTY_INPUT]);
    expect(probe.frame()).toBe(-1);
  });
});

describe('sameState', () => {
  it('iç içe alanları ve diziler karşılaştırır', () => {
    expect(sameState({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(sameState({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] })).toBe(false);
    expect(sameState({ a: 0 }, { a: -0 })).toBe(false);
    expect(sameState({ a: Number.NaN }, { a: Number.NaN })).toBe(true);
    expect(sameState({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });
});
