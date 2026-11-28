import { describe, expect, it } from 'vitest';
import { BALL, JUICE, LOOP } from '../config/gameConfig';
import { hitStopForSpeed } from '../fx/feel';
import { AiController } from '../game/ai/AiController';
import { mixSeed } from '../game/ai/random';
import { observe } from '../game/ai/worldView';
import { GameSim, type GameSimOptions } from '../game/GameSim';
import type { SimEvent } from '../game/types';
import { EMPTY_INPUT } from '../input/InputState';
import { createGameLoop } from '../physics';
import { PresentationTimeline, type HitStopMode } from './PresentationTimeline';
import { RenderFrame } from './renderFrame';

const HZ = LOOP.stepHz;
const FRAME = 1 / HZ;
const OPTIONS: GameSimOptions = { seed: 7, skipKickoff: true };

/** Canlı simülasyon + döngü + zaman çizelgesi: maç sahnesinin sadeleştirilmiş kopyası. */
class Harness {
  readonly sim: GameSim;
  readonly loop = createGameLoop();
  readonly timeline: PresentationTimeline;
  readonly delivered: { tick: number; event: SimEvent; skipped: boolean }[] = [];
  readonly recorded: SimEvent[] = [];
  /** Her canlı adımın durum özeti (sunum biçiminden bağımsız olmalı). */
  readonly checksums: string[] = [];
  private readonly ais: readonly [AiController, AiController] | null;
  /** Olay teslim edilirken çağrılır (zaman efektlerini tetiklemek için). */
  onEvent: (e: SimEvent, skipped: boolean, t: PresentationTimeline) => void = () => undefined;
  /** Canlı adımdan önce ve sonra (eski sahne enterpolasyonunu yeniden kurmak için). */
  beforeStep: (sim: GameSim) => void = () => undefined;
  afterStep: (sim: GameSim) => void = () => undefined;

  constructor(options: GameSimOptions = OPTIONS, ai = false, mode: HitStopMode = 'rate') {
    this.sim = new GameSim(options);
    this.timeline = new PresentationTimeline(options);
    this.timeline.mode = mode;
    this.timeline.reset(this.sim);
    this.ais = ai
      ? [
          new AiController({ index: 0, difficulty: 'hard', seed: mixSeed(3, 0) }),
          new AiController({ index: 1, difficulty: 'hard', seed: mixSeed(3, 1) }),
        ]
      : null;
  }

  /** Bir ekran karesi: canlı adımlar, sonra görüntü. Dünya süresini döndürür. */
  frame(dt = FRAME): number {
    this.loop.advance(dt, () => {
      const view = this.ais ? observe(this.sim) : null;
      const inputs =
        this.ais && view
          ? ([{ ...this.ais[0].update(view) }, { ...this.ais[1].update(view) }] as const)
          : ([EMPTY_INPUT, EMPTY_INPUT] as const);
      this.beforeStep(this.sim);
      const events = this.sim.step(inputs);
      this.afterStep(this.sim);
      this.timeline.record(this.sim, events);
      this.recorded.push(...events);
      this.checksums.push(this.sim.checksum());
      if (events.some((e) => e.type === 'kickoff')) this.timeline.jumpToLive();
    });
    return this.timeline.advance(Math.min(dt, 0.1), this.loop.alpha, (events, skipped) => {
      for (const e of events) {
        this.delivered.push({ tick: this.timeline.view.tick, event: e, skipped });
        this.onEvent(e, skipped, this.timeline);
      }
    });
  }

  frames(n: number, dt = FRAME): void {
    for (let i = 0; i < n; i++) this.frame(dt);
  }
}

/** Maç sahnesindeki zaman efektleri: sert vuruş/kafa → hit-stop, süper, gol → donma + ağır çekim. */
function sceneEffects(e: SimEvent, skipped: boolean, t: PresentationTimeline): void {
  if (skipped) return;
  if (e.type === 'kick' || e.type === 'header') t.hitStop(hitStopForSpeed(e.speed, BALL.maxSpeed));
  if (e.type === 'superLaunch') t.hitStop(JUICE.hitStop.superMs);
  if (e.type === 'goal') {
    t.hitStop(JUICE.hitStop.goalMs);
    t.slowMo(JUICE.goalSlowMo.seconds, JUICE.goalSlowMo.scale);
  }
}

describe('PresentationTimeline — zaman efekti yokken', () => {
  it('görüntü eski enterpolasyonla birebir aynı, olaylar aynı karede, dünya süresi = gerçek süre', () => {
    const h = new Harness({ seed: 5 }, true);
    // Eski sahne mantığı: her adımdan önce önceki kopya, sonra şimdiki kopya; alpha ile karışım.
    const prev = new RenderFrame().copyFrom(h.sim);
    const curr = new RenderFrame().copyFrom(h.sim);
    const expected = new RenderFrame();
    h.beforeStep = (sim) => prev.copyFrom(sim);
    h.afterStep = (sim) => curr.copyFrom(sim);
    // Düzensiz kare süreleri (90 / 144 Hz, takılma) de dahil.
    const dts = [FRAME, 1 / 90, 1 / 90, 0.034, FRAME, 1 / 144, 0.05, FRAME];
    for (let i = 0; i < 600; i++) {
      const dt = dts[i % dts.length] ?? FRAME;
      const world = h.frame(dt);
      expect(world).toBeCloseTo(Math.min(dt, 0.1), 12);
      expect(h.timeline.lagTicks).toBeCloseTo(0, 9);
      expect(h.timeline.shownTick).toBe(h.sim.tick);
      // Santra ışınlanmasında eski sahne önceki kopyayı da şimdikine eşitliyordu.
      if (h.sim.match.phase === 'kickoff' && h.sim.match.phaseTicks === 0) prev.copyFromFrame(curr);
      expected.lerpFrom(prev, curr, h.loop.alpha);
      // Konum kesirli adımdan yeniden kurulur: son bitte (~1e-13 px) fark olabilir.
      expect(h.timeline.frame.ball.x).toBeCloseTo(expected.ball.x, 9);
      expect(h.timeline.frame.ball.y).toBeCloseTo(expected.ball.y, 9);
      expect(h.timeline.frame.players[0].x).toBeCloseTo(expected.players[0].x, 9);
      expect(h.timeline.frame.players[1].footAngle).toBeCloseTo(expected.players[1].footAngle, 9);
    }
    expect(h.timeline.view.checksum()).toBe(h.sim.checksum());
    expect(h.delivered.map((d) => d.event)).toEqual(h.recorded);
    expect(h.delivered.every((d) => !d.skipped)).toBe(true);
  });
});

describe('PresentationTimeline — hit-stop yalnızca görüntüde', () => {
  it('donma: simülasyon akar, görüntü olayın adımında durur; sonra 2 kat hızla yetişir', () => {
    const h = new Harness();
    h.frames(30);
    const stopAt = h.sim.tick;
    h.timeline.hitStop(50);
    // Donma bir sonraki karede başlar: 50 ms ≈ 3 kare boyunca görüntü yerinde.
    const pos0 = h.timeline.shownTick;
    h.frames(3);
    expect(h.sim.tick).toBe(stopAt + 3);
    expect(h.timeline.shownTick).toBe(pos0);
    expect(h.timeline.lagTicks).toBeGreaterThan(2.5);
    // Yetişme: her karede 2 adım ilerler, gecikme kare başına 1 adım kapanır.
    const lag = h.timeline.lagTicks;
    const world = h.frame();
    expect(world).toBeCloseTo(2 * FRAME, 6);
    expect(h.timeline.lagTicks).toBeCloseTo(lag - 1, 6);
    h.frames(4);
    expect(h.timeline.lagTicks).toBeCloseTo(0, 9);
    expect(h.timeline.shownTick).toBe(h.sim.tick);
  });

  it("'snap': donma bitince tek karede canlıya atlar", () => {
    const h = new Harness(OPTIONS, false, 'snap');
    h.frames(30);
    h.timeline.hitStop(50);
    h.frames(3);
    expect(h.timeline.lagTicks).toBeGreaterThan(2.5);
    h.frame();
    expect(h.timeline.lagTicks).toBeCloseTo(0, 9);
  });

  it('görsel borç sınırı: yetişirken gelen ikinci hit-stop kalan gecikme kadar kısalır', () => {
    const h = new Harness();
    h.frames(30);
    h.timeline.hitStop(55);
    h.frames(4); // ≈ 3,3 adım donuk, sonra yetişmeye başladı
    const lag = h.timeline.lagTicks;
    expect(lag).toBeGreaterThan(1);
    // İkinci sert vuruş: tam 55 ms donsaydı gecikme ~lag + 3,3 adıma çıkardı.
    h.timeline.hitStop(55);
    let max = 0;
    for (let i = 0; i < 10; i++) {
      h.frame();
      max = Math.max(max, h.timeline.lagTicks);
    }
    expect(max).toBeLessThanOrEqual((0.055 + FRAME) * HZ + 1e-6);
    expect(h.timeline.lagTicks).toBeCloseTo(0, 9);
  });

  it("'off': hit-stop hiç uygulanmaz", () => {
    const h = new Harness(OPTIONS, false, 'off');
    h.frames(30);
    h.timeline.hitStop(50);
    h.frames(3);
    expect(h.timeline.lagTicks).toBeCloseTo(0, 9);
  });

  it('olay donma başlatırsa görüntü tam o adımın karesinde durur ve view o adımın durumunda', () => {
    const h = new Harness({ seed: 5 }, true);
    let frozenAt = -1;
    h.onEvent = (e, skipped, t) => {
      if (!skipped && e.type === 'jump' && frozenAt < 0) {
        frozenAt = t.view.tick;
        t.hitStop(55);
      }
    };
    for (let i = 0; i < 600 && frozenAt < 0; i++) h.frame();
    expect(frozenAt).toBeGreaterThan(0);
    h.frames(2);
    expect(h.sim.tick).toBeGreaterThan(frozenAt + 1);
    expect(h.timeline.shownTick).toBe(frozenAt);
    expect(h.timeline.view.tick).toBe(frozenAt);
    // Kare ≈ o adımın konumları (enterpolasyon kesri ~1).
    expect(h.timeline.frame.players[0].y).toBeCloseTo(h.timeline.view.players[0].y, 3);
    expect(h.timeline.frame.players[1].y).toBeCloseTo(h.timeline.view.players[1].y, 3);
  });
});

describe('PresentationTimeline — gol sonrası ağır çekim ve santra', () => {
  it('ağır çekim 0,3 hızında; gecikme korunur; santrada canlıya atlar, atlanan olaylar işaretli', () => {
    const h = new Harness();
    h.frames(10);
    h.timeline.slowMo(JUICE.goalSlowMo.seconds, JUICE.goalSlowMo.scale);
    const start = h.timeline.shownTick;
    h.frames(HZ);
    const shown = h.timeline.shownTick - start;
    expect(shown).toBeGreaterThanOrEqual(Math.floor(HZ * JUICE.goalSlowMo.scale) - 1);
    expect(shown).toBeLessThanOrEqual(Math.ceil(HZ * JUICE.goalSlowMo.scale) + 1);
    const held = h.timeline.lagTicks;
    expect(held).toBeGreaterThan(HZ * (1 - JUICE.goalSlowMo.scale) - 2);
    // Ağır çekimden sonra görüntü aynı hızda, geride akar.
    h.frames(20);
    expect(h.timeline.lagTicks).toBeCloseTo(held, 6);
    expect(h.timeline.effectActive).toBe(false);
    h.timeline.jumpToLive();
    h.frame();
    expect(h.timeline.lagTicks).toBeCloseTo(0, 9);
    expect(h.timeline.shownTick).toBe(h.sim.tick);
  });

  it('santra adımına enterpolasyon yapılmaz (ışınlanma kayması yok)', () => {
    const h = new Harness({ seed: mixSeed(11, 2) }, true);
    h.onEvent = sceneEffects;
    const centerX = h.sim.pitch.width / 2;
    let kickoffFrames = 0;
    for (let i = 0; i < 90 * 60 && h.sim.score[0] + h.sim.score[1] < 2; i++) {
      h.frame(1 / 90);
      const v = h.timeline.view;
      if (v.match.phase === 'kickoff' && v.tick > 1 && h.sim.score[0] + h.sim.score[1] > 0) {
        // Top santrada tutulur: gösterilen kare golün yerinden kayarak gelmez.
        expect(h.timeline.frame.ball.x).toBe(centerX);
        kickoffFrames++;
      }
    }
    expect(kickoffFrames).toBeGreaterThan(10);
  });
});

describe('PresentationTimeline — tam AI maçı', () => {
  /** Zaman efektli bir maç; her kare için görüntünün gecikmesi. */
  function playMatch(
    mode: HitStopMode,
    dt: number,
  ): Harness & { maxLag: number; playMaxLag: number } {
    const h = new Harness({ seed: mixSeed(11, 2), rules: { durationSeconds: 40 } }, true, mode);
    h.onEvent = sceneEffects;
    let maxLag = 0;
    let playMaxLag = 0;
    const inPlay = (phase: string): boolean => phase === 'playing' || phase === 'goldenGoal';
    for (let i = 0; i < 40 * HZ * 4 && h.sim.match.phase !== 'matchEnd'; i++) {
      h.frame(dt);
      maxLag = Math.max(maxLag, h.timeline.lagTicks);
      if (inPlay(h.sim.match.phase) && inPlay(h.timeline.view.match.phase)) {
        playMaxLag = Math.max(playMaxLag, h.timeline.lagTicks);
      }
    }
    h.frames(Math.ceil(HZ * 2)); // maç sonu: görüntü yetişsin
    return Object.assign(h, { maxLag, playMaxLag });
  }

  it('her olay tam bir kez ve sırayla teslim edilir; tampon taşmaz; simülasyon sunumdan bağımsız', () => {
    const runs = [
      playMatch('rate', FRAME),
      playMatch('snap', FRAME),
      playMatch('off', FRAME),
      playMatch('rate', 1 / 90),
    ];
    for (const h of runs) {
      expect(h.timeline.dropped).toBe(0);
      expect(h.delivered.map((d) => d.event)).toEqual(h.recorded);
      // Santra kesmesinde atlanan olaylar yalnızca gol sonrası duraklamanın kuyruğunda.
      expect(h.delivered.filter((d) => d.event.type === 'goal').every((d) => !d.skipped)).toBe(
        true,
      );
      expect(h.recorded.some((e) => e.type === 'goal')).toBe(true);
    }
    // Simülasyon her sunum biçiminde adım adım aynı (zaman efektleri onu etkilemez).
    const [rate, snap, off, rate90] = runs;
    expect(snap?.checksums).toEqual(rate?.checksums);
    expect(off?.checksums).toEqual(rate?.checksums);
    expect(rate90?.checksums).toEqual(rate?.checksums);
    // Ağır çekim + donma gecikmesi tampon sınırının içinde.
    for (const h of runs) expect(h.maxLag).toBeLessThan(55);
    // Oyun akarken görüntü en çok bir hit-stop (60 ms) + bir kare geride (görsel borç sınırı).
    for (const h of runs) {
      expect(h.playMaxLag).toBeLessThanOrEqual((JUICE.hitStop.superMs / 1000 + FRAME) * HZ + 0.01);
    }
  });
});
