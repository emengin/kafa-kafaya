import { describe, expect, it } from 'vitest';
import { LOOP, REPLAY } from '../config/gameConfig';
import { EMPTY_INPUT, type InputState } from '../input/InputState';
import { loadoutFor } from './characters';
import { GameSim } from './GameSim';
import { AiController, AiInputSource } from './ai/AiController';
import { observe } from './ai/worldView';
import { encodeInput, ReplayRecorder } from './replay';
import type { SimEvent } from './types';

type Inputs = readonly [InputState, InputState];

/** Tohumlu, "insan benzeri" rastgele girdi dizisi (oyuncular topa doğru eğilimli). */
function script(seed: number, length: number): Inputs[] {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: Inputs[] = [];
  let cur: [InputState, InputState] = [EMPTY_INPUT, EMPTY_INPUT];
  for (let i = 0; i < length; i++) {
    if (i % 9 === 0) {
      const mk = (toward: 'left' | 'right'): InputState => ({
        ...EMPTY_INPUT,
        [toward]: next() < 0.65,
        jump: next() < 0.25,
        kick: next() < 0.45,
        super: next() < 0.1,
      });
      cur = [mk('right'), mk('left')];
    }
    out.push(cur);
  }
  return out;
}

function makeSim(): GameSim {
  return new GameSim({ loadouts: [loadoutFor('pamuk'), loadoutFor('sis')], seed: 99 });
}

describe('Simülasyon durumu kaydet/yükle (Faz 7)', () => {
  it('kaydedilen durumdan aynı girdilerle devam etmek birebir aynı sonucu verir (başka simülasyonda da)', () => {
    const inputs = script(5, 2400);
    const a = makeSim();
    for (let i = 0; i < 1200; i++) a.step(inputs[i] as Inputs);
    a.players[0].addPower(1);
    const saved = a.saveState();
    const eventsA: SimEvent[] = [];
    for (let i = 1200; i < 2400; i++) eventsA.push(...a.step(inputs[i] as Inputs));
    const b = makeSim();
    b.loadState(saved);
    const eventsB: SimEvent[] = [];
    for (let i = 1200; i < 2400; i++) eventsB.push(...b.step(inputs[i] as Inputs));
    expect(b.snapshot()).toEqual(a.snapshot());
    expect(eventsB).toEqual(eventsA);
    // Aynı simülasyonda geri sarıp yeniden oynatmak da aynı.
    a.loadState(saved);
    for (let i = 1200; i < 2400; i++) a.step(inputs[i] as Inputs);
    expect(a.snapshot()).toEqual(b.snapshot());
  });

  it('kayıt nesnesi yeniden kullanılabilir (anahtar karelerde bellek ayrılmaz)', () => {
    const sim = makeSim();
    const s1 = sim.saveState();
    for (let i = 0; i < 100; i++) sim.step([EMPTY_INPUT, EMPTY_INPUT]);
    const s2 = sim.saveState(s1);
    expect(s2).toBe(s1);
    expect(s2.tick).toBe(100);
  });
});

describe('Gol tekrarı kaydedicisi (Faz 7)', () => {
  it('girdi kodlaması 5 biti korur', () => {
    expect(encodeInput(EMPTY_INPUT)).toBe(0);
    expect(encodeInput({ left: true, right: false, jump: true, kick: false, super: true })).toBe(
      21,
    );
  });

  it('tekrar golü birebir yeniden üretir: aynı gol olayı, aynı top yolu', () => {
    const sim = makeSim();
    const view = (): ReturnType<typeof observe> => observe(sim);
    const ais = [
      new AiInputSource(new AiController({ index: 0, difficulty: 'hard', seed: 1 }), view),
      new AiInputSource(new AiController({ index: 1, difficulty: 'easy', seed: 2 }), view),
    ] as const;
    const rec = new ReplayRecorder(sim);
    let goalTick = -1;
    let plan: ReturnType<ReplayRecorder['plan']> = null;
    const path: number[] = [];
    for (let i = 0; i < LOOP.stepHz * 90 && !plan; i++) {
      const a = ais[0].read();
      const b = ais[1].read();
      rec.record(sim.tick, a, b);
      const events = sim.step([a, b]);
      path[sim.tick] = sim.ball.x;
      for (const e of events) {
        if (e.type === 'goal' && goalTick < 0) goalTick = sim.tick - 1;
        // Sahnedeki sıra: santra olayında önce tekrar planlanır, sonra yeni bölüm işaretlenir.
        if (e.type === 'kickoff') {
          if (goalTick >= 0) plan = rec.plan(goalTick, sim.tick - 1);
          rec.markSegmentStart(sim.tick);
        }
      }
    }
    expect(goalTick).toBeGreaterThan(0);
    expect(plan).not.toBeNull();
    if (!plan) return;
    expect(goalTick - plan.startTick).toBeLessThanOrEqual(REPLAY.leadSeconds * LOOP.stepHz);
    const live = sim.saveState();
    const before = sim.snapshot();
    sim.loadState(plan.state);
    let replayGoal = -1;
    while (sim.tick <= plan.endTick) {
      const t = sim.tick;
      const inp = rec.inputAt(t);
      expect(inp).not.toBeNull();
      if (!inp) break;
      const events = sim.step([inp[0], inp[1]]);
      expect(sim.ball.x).toBe(path[sim.tick]);
      if (events.some((e) => e.type === 'goal')) replayGoal = t;
    }
    expect(replayGoal).toBe(goalTick);
    sim.loadState(live);
    expect(sim.snapshot()).toEqual(before);
  });

  it('santradan öncesine gitmez; görüntü yetersizse tekrar yok', () => {
    const sim = makeSim();
    const rec = new ReplayRecorder(sim);
    for (let t = 0; t < 600; t++) {
      rec.record(sim.tick, EMPTY_INPUT, EMPTY_INPUT);
      sim.step([EMPTY_INPUT, EMPTY_INPUT]);
    }
    rec.markSegmentStart(500);
    // Santradan 0,5 sn sonra gol: yeterli görüntü yok.
    expect(rec.plan(530, 599)).toBeNull();
    rec.markSegmentStart(300);
    const plan = rec.plan(590, 599);
    expect(plan?.startTick).toBeGreaterThanOrEqual(300);
    expect((plan?.startTick ?? 0) % REPLAY.keyframeSteps).toBe(0);
    // Tamponun dışına taşan (çok eski) bir gol için de tekrar yok.
    expect(rec.plan(20, 599)).toBeNull();
  });
});
