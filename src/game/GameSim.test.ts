import { describe, expect, it } from 'vitest';
import { BALL, KICK, LOOP, MATCH, PHYSICS, PLAYER } from '../config/gameConfig';
import { EMPTY_INPUT, type InputState } from '../input/InputState';
import { createGameLoop } from '../physics';
import { footOffset, Player, PLAYER_STAND_OFFSET } from './entities/Player';
import { GameSim, STEP_SECONDS, type SimSnapshot } from './GameSim';
import type { SimEvent } from './types';

type Inputs = readonly [InputState, InputState];

/** Çözücü kasıtlı olarak `penetrationSlop` kadar çakışma bırakır. */
const TOL = PHYSICS.penetrationSlop + 1e-9;

const IDLE: Inputs = [EMPTY_INPUT, EMPTY_INPUT];
/** Fizik testleri santra beklemesini atlar (oyun ilk adımdan başlar). */
const IN_PLAY = { skipKickoff: true } as const;
const input = (p: Partial<InputState>): InputState => ({ ...EMPTY_INPUT, ...p });
const secondsToSteps = (s: number): number => Math.round(s * LOOP.stepHz);

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

/**
 * "İnsan benzeri" rastgele girdi dizisi: her oyuncu rastgele süreler boyunca bir eylemi
 * basılı tutar. P1 sağa, P2 sola eğilimli; böylece top sık sık oynanır.
 */
function randomScript(seed: number, length: number): Inputs[] {
  const next = rng(seed);
  const frames: Inputs[] = [];
  const hold = [0, 0];
  const current: [InputState, InputState] = [EMPTY_INPUT, EMPTY_INPUT];
  for (let i = 0; i < length; i++) {
    for (const p of [0, 1] as const) {
      if (hold[p] === 0) {
        const toward = p === 0 ? 'right' : 'left';
        const away = p === 0 ? 'left' : 'right';
        current[p] = input({
          [toward]: next() < 0.6,
          [away]: next() < 0.2,
          jump: next() < 0.3,
          kick: next() < 0.4,
        });
        hold[p] = 3 + Math.floor(next() * 25);
      }
      hold[p] = (hold[p] ?? 1) - 1;
    }
    frames.push([current[0], current[1]]);
  }
  return frames;
}

function runScript(sim: GameSim, script: readonly Inputs[]): SimEvent[] {
  const events: SimEvent[] = [];
  for (const frame of script) events.push(...sim.step(frame));
  return events;
}

function stepN(sim: GameSim, n: number, inputs: Inputs = IDLE): SimEvent[] {
  const events: SimEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...sim.step(inputs));
  return events;
}

/** Oyuncuları ve topu test için sahnenin dışına değil, birbirinden uzağa koyar. */
function isolate(sim: GameSim): void {
  const standY = sim.pitch.groundY - PLAYER_STAND_OFFSET;
  sim.players[0].resetTo(300, standY);
  sim.players[1].resetTo(980, standY);
}

describe('GameSim — determinizm', () => {
  it('aynı girdi dizisi 1200 adım sonra birebir aynı durumu üretir', () => {
    const script = randomScript(2, 1200);
    const a = new GameSim();
    const b = new GameSim();
    const eventsA = runScript(a, script);
    const eventsB = runScript(b, script);

    const snapA: SimSnapshot = a.snapshot();
    expect(snapA.tick).toBe(1200);
    expect(b.snapshot()).toEqual(snapA);
    expect(JSON.stringify(b.snapshot())).toBe(JSON.stringify(snapA));
    expect(eventsB).toEqual(eventsA);

    // Test boş geçmesin: oyun gerçekten oynanmış olmalı.
    expect(eventsA.some((e) => e.type === 'kick' || e.type === 'header')).toBe(true);
    // Maç akışı da kapsansın: gol → kutlama (ağır çekim) → santra → düdük.
    expect(eventsA.some((e) => e.type === 'goal')).toBe(true);
    expect(eventsA.filter((e) => e.type === 'playStart').length).toBeGreaterThan(1);
    expect(snapA.ball.x).not.toBe(sim0().ball.x);
  });

  it('girdide tek bir fark sonucu değiştirir (test duyarlıdır)', () => {
    const script = randomScript(99, 600);
    const changed = script.slice();
    changed[100] = [input({ jump: true, kick: true }), EMPTY_INPUT];
    const a = new GameSim();
    const b = new GameSim();
    runScript(a, script);
    runScript(b, changed);
    expect(b.snapshot()).not.toEqual(a.snapshot());
  });

  it('kare hızından bağımsızdır: 30 Hz, 144 Hz ve düzensiz karelerde aynı sonuç', () => {
    const script = randomScript(7, 600);
    const runWithFrames = (frameSeconds: () => number): SimSnapshot => {
      const sim = new GameSim();
      const loop = createGameLoop();
      while (sim.tick < script.length) {
        loop.advance(frameSeconds(), (_dt, tick) => {
          if (tick < script.length) sim.step(script[tick] ?? IDLE);
        });
      }
      return sim.snapshot();
    };
    const jitter = rng(5);
    const at30 = runWithFrames(() => 1 / 30);
    const at144 = runWithFrames(() => 1 / 144);
    const irregular = runWithFrames(() => 0.004 + jitter() * 0.05);
    expect(at144).toEqual(at30);
    expect(irregular).toEqual(at30);
  });
});

function sim0(): GameSim {
  return new GameSim(IN_PLAY);
}

describe('GameSim — top hiçbir durumda saha/kale içinden geçmez', () => {
  it('her yöne en yüksek hızla atılan top sahada kalır ve üst direğin içine girmez', () => {
    const starts = [
      [640, 300],
      [150, 380],
      [1130, 380],
      [60, 300],
      [1220, 600],
      [45, 520],
      [640, 40],
    ] as const;
    let checks = 0;
    for (const [sx, sy] of starts) {
      for (let k = 0; k < 24; k++) {
        const sim = new GameSim(IN_PLAY);
        isolate(sim);
        const a = (k / 24) * Math.PI * 2;
        const ball = sim.ball;
        ball.resetTo(sx, sy);
        ball.vx = Math.cos(a) * 1e6; // adım başında BALL.maxSpeed'e kırpılır
        ball.vy = Math.sin(a) * 1e6;
        ball.angVel = 1e3;
        for (let i = 0; i < 90; i++) {
          sim.step(IDLE);
          const r = ball.radius;
          const tol = PHYSICS.penetrationSlop + 1e-9;
          expect(ball.x).toBeGreaterThanOrEqual(r - tol);
          expect(ball.x).toBeLessThanOrEqual(sim.pitch.width - r + tol);
          expect(ball.y).toBeGreaterThanOrEqual(sim.pitch.ceilingY + r - tol);
          expect(ball.y).toBeLessThanOrEqual(sim.pitch.groundY - r + tol);
          for (const goal of sim.pitch.goals) {
            const bar = goal.crossbar;
            const px = Math.min(Math.max(ball.x, bar.minX), bar.maxX);
            const py = Math.min(Math.max(ball.y, bar.minY), bar.maxY);
            expect(Math.hypot(ball.x - px, ball.y - py)).toBeGreaterThanOrEqual(r - 0.05);
          }
          checks++;
        }
      }
    }
    expect(checks).toBeGreaterThan(10000);
  });

  it('oyuncu topu duvara ve üst direğe sıkıştırsa da top içeri girmez', () => {
    const sim = new GameSim(IN_PLAY);
    const p1 = sim.players[0];
    const ball = sim.ball;
    ball.resetTo(160, sim.pitch.groundY - ball.radius);
    p1.resetTo(260, sim.pitch.groundY - PLAYER_STAND_OFFSET);
    // P1 sola koşup zıplayarak topu sol kaleye / direğe / duvara doğru ezer.
    for (let i = 0; i < 300; i++) {
      sim.step([input({ left: true, jump: i % 40 < 20 }), EMPTY_INPUT]);
      expect(ball.x).toBeGreaterThanOrEqual(ball.radius - TOL);
      expect(ball.y).toBeLessThanOrEqual(sim.pitch.groundY - ball.radius + TOL);
      const bar = sim.pitch.goals[0].crossbar;
      const inside =
        ball.x > bar.minX && ball.x < bar.maxX && ball.y > bar.minY && ball.y < bar.maxY;
      expect(inside).toBe(false);
    }
  });
});

describe('GameSim — gol ve santra', () => {
  it('top kale çizgisini tamamen geçince gol olur, kutlamadan sonra santra yapılır', () => {
    const sim = new GameSim(IN_PLAY);
    isolate(sim);
    const goal = sim.pitch.goals[0];
    sim.ball.resetTo(goal.lineX - sim.ball.radius - 5, sim.pitch.groundY - sim.ball.radius);
    const events = sim.step(IDLE);
    expect(events).toContainEqual({ type: 'goal', scorer: 1 });
    expect(sim.score).toEqual([0, 1]);
    expect(sim.match.phase).toBe('goalScored');

    // Kutlama: 1 sn ağır çekim (0,3x → 18 adım) + 1 sn normal (60 adım) = 78 adım.
    const slowSteps = secondsToSteps(MATCH.goalSlowMoSeconds * MATCH.goalSlowMoScale);
    const normalSteps = secondsToSteps(MATCH.goalCelebrationSeconds - MATCH.goalSlowMoSeconds);
    const during = stepN(sim, slowSteps + normalSteps - 1);
    expect(during.some((e) => e.type === 'goal' || e.type === 'kickoff')).toBe(false);
    expect(sim.score).toEqual([0, 1]);

    const after = stepN(sim, 1);
    expect(after).toContainEqual({ type: 'kickoff' });
    expect(sim.match.phase).toBe('kickoff');
    expect(sim.ball.x).toBeCloseTo(sim.pitch.width / 2, 6);
    expect(sim.ball.y).toBeCloseTo(BALL.kickoffY, 6);
    expect(sim.players[0].x).toBeCloseTo(sim.pitch.width * PLAYER.spawnXRatio, 6);
    expect(sim.players[1].x).toBeCloseTo(sim.pitch.width * (1 - PLAYER.spawnXRatio), 6);
  });

  it('top çizgiyi kısmen geçtiyse gol değildir', () => {
    const sim = new GameSim(IN_PLAY);
    isolate(sim);
    const goal = sim.pitch.goals[1];
    sim.ball.resetTo(goal.lineX + sim.ball.radius - 4, sim.pitch.groundY - sim.ball.radius);
    const events = sim.step(IDLE);
    expect(events.some((e) => e.type === 'goal')).toBe(false);
    expect(sim.score).toEqual([0, 0]);
  });

  it('üst direğin üstünde duran top gol sayılmaz', () => {
    const sim = new GameSim(IN_PLAY);
    isolate(sim);
    const bar = sim.pitch.goals[0].crossbar;
    sim.ball.resetTo(30, bar.minY - sim.ball.radius);
    expect(stepN(sim, 30).some((e) => e.type === 'goal')).toBe(false);
  });

  it('sağ kaleye giren top P1 golüdür', () => {
    const sim = new GameSim(IN_PLAY);
    isolate(sim);
    sim.ball.resetTo(sim.pitch.width - 30, sim.pitch.groundY - sim.ball.radius);
    expect(sim.step(IDLE)).toContainEqual({ type: 'goal', scorer: 0 });
    expect(sim.score).toEqual([1, 0]);
  });
});

/** Topu (x, y) noktasından (vx, vy) hızla bırakır; gol olursa adımı, olmazsa −1 döndürür. */
function shoot(
  sim: GameSim,
  x: number,
  y: number,
  vx: number,
  vy: number,
  steps: number,
): { goalStep: number; bouncedBack: boolean; maxXAfterBounce: number } {
  isolate(sim);
  sim.players[0].resetTo(500, sim.pitch.groundY - PLAYER_STAND_OFFSET);
  sim.ball.resetTo(x, y);
  sim.ball.vx = vx;
  sim.ball.vy = vy;
  let bouncedBack = false;
  let maxXAfterBounce = -Infinity;
  for (let i = 0; i < steps; i++) {
    const events = sim.step(IDLE);
    if (events.some((e) => e.type === 'goal')) return { goalStep: i, bouncedBack, maxXAfterBounce };
    if (sim.ball.vx > 0) bouncedBack = true;
    if (bouncedBack) maxXAfterBounce = Math.max(maxXAfterBounce, sim.ball.x);
  }
  return { goalStep: -1, bouncedBack, maxXAfterBounce };
}

describe('GameSim — gol algılama sınır durumları', () => {
  // Sol kale: üst direk x 0–90, y 418–430; kale çizgisi x = 90; top yarıçapı 22.
  const barMid = (sim: GameSim): number => {
    const bar = sim.pitch.goals[0].crossbar;
    return (bar.minY + bar.maxY) / 2;
  };

  it('üst direğin ön yüzüne çarpıp dönen top gol değildir', () => {
    const sim = new GameSim(IN_PLAY);
    const r = shoot(sim, 152, barMid(sim), -1500, 0, 60);
    expect(r.goalStep).toBe(-1);
    expect(r.bouncedBack).toBe(true);
    expect(sim.score).toEqual([0, 0]);
  });

  it('üst direğin alt köşesine çarpıp sahaya dönen top gol değildir', () => {
    const sim = new GameSim(IN_PLAY);
    const bar = sim.pitch.goals[0].crossbar;
    const r = shoot(sim, 152, bar.maxY + 10, -1500, 0, 90);
    expect(r.goalStep).toBe(-1);
    expect(r.bouncedBack).toBe(true);
    expect(r.maxXAfterBounce).toBeGreaterThan(300);
    expect(sim.score).toEqual([0, 0]);
  });

  it('üst direği sıyırıp ya da alt yüzüne çarpıp içeri düşen top goldür', () => {
    const glancing = new GameSim(IN_PLAY);
    const bar = glancing.pitch.goals[0].crossbar;
    expect(shoot(glancing, 152, bar.maxY + 16, -1500, 0, 60).goalStep).toBeGreaterThan(0);
    expect(glancing.score).toEqual([0, 1]);

    const underside = new GameSim(IN_PLAY);
    expect(shoot(underside, 130, 520, -500, -900, 60).goalStep).toBeGreaterThan(0);
    expect(underside.score).toEqual([0, 1]);
  });

  it('çizgiyi kısmen geçip sahaya geri dönen top gol değildir', () => {
    const sim = new GameSim(IN_PLAY);
    const goal = sim.pitch.goals[0];
    // Topun 12 px'i çizginin ötesinde, sahaya doğru yuvarlanıyor.
    const r = shoot(sim, goal.lineX + sim.ball.radius - 12, sim.pitch.groundY - 22, 200, 0, 60);
    expect(r.goalStep).toBe(-1);
    expect(sim.ball.x - sim.ball.radius).toBeGreaterThan(goal.lineX);
  });

  it('üst direğin üstünden sahaya yuvarlanan top gol değildir', () => {
    const sim = new GameSim(IN_PLAY);
    const bar = sim.pitch.goals[0].crossbar;
    const r = shoot(sim, 80, bar.minY - sim.ball.radius, 150, 0, 120);
    expect(r.goalStep).toBe(-1);
    expect(sim.ball.x).toBeGreaterThan(sim.pitch.goals[0].lineX + sim.ball.radius);
  });

  it('en yüksek hızla kaleye giren top da yakalanır (tünelleme yok)', () => {
    const sim = new GameSim(IN_PLAY);
    expect(shoot(sim, 400, 560, -BALL.maxSpeed, 0, 30).goalStep).toBeGreaterThan(0);
    expect(sim.score).toEqual([0, 1]);
  });

  it('santra beklemesinde, gol kutlamasında ve maç sonunda gol sayılmaz', () => {
    const sim = new GameSim();
    const goal = sim.pitch.goals[0];
    const inNet = (): void => {
      sim.ball.resetTo(goal.lineX - 40, sim.pitch.groundY - sim.ball.radius);
    };
    // Santra beklemesi: top ortada tutulur, gol sayılmaz.
    expect(sim.match.phase).toBe('kickoff');
    inNet();
    expect(sim.step(IDLE).some((e) => e.type === 'goal')).toBe(false);

    sim.match.startInPlay();
    inNet();
    expect(sim.step(IDLE)).toContainEqual({ type: 'goal', scorer: 1 });
    // Kutlama sırasında top hâlâ ağda: ikinci gol yok.
    expect(stepN(sim, 30).some((e) => e.type === 'goal')).toBe(false);
    expect(sim.score).toEqual([0, 1]);
  });
});

describe('GameSim — maç akışı (baştan sona)', () => {
  /** Topu `defender`ın kalesine koyar (gol olsun diye). */
  function placeInGoal(sim: GameSim, defender: 0 | 1): void {
    const goal = sim.pitch.goals[defender];
    const x = goal.lineX - goal.fieldDirection * (sim.ball.radius + 10);
    sim.ball.resetTo(x, sim.pitch.groundY - sim.ball.radius);
  }

  /** Belirtilen duruma gelene kadar adım atar (en fazla `limit` adım). */
  function stepUntil(sim: GameSim, phase: string, limit = 20000): SimEvent[] {
    const events: SimEvent[] = [];
    for (let i = 0; i < limit && sim.match.phase !== phase; i++) events.push(...sim.step(IDLE));
    expect(sim.match.phase).toBe(phase);
    return events;
  }

  it('90 sn: santra → gol → santra → süre biter → maç sonu (önde olan kazanır)', () => {
    const sim = new GameSim();
    const all: SimEvent[] = [];
    all.push(...stepUntil(sim, 'playing'));
    placeInGoal(sim, 1);
    all.push(...sim.step(IDLE));
    expect(sim.match.phase).toBe('goalScored');
    all.push(...stepUntil(sim, 'kickoff'));
    // Santrada oyuncular ve top başlangıçta, top ortada tutuluyor.
    expect(sim.ball.x).toBe(sim.pitch.width / 2);
    expect(sim.ball.y).toBe(BALL.kickoffY);
    all.push(...stepUntil(sim, 'playing'));
    all.push(...stepUntil(sim, 'matchEnd'));

    const flow = new Set(['goal', 'kickoff', 'playStart', 'goldenGoal', 'matchEnd']);
    expect(all.filter((e) => flow.has(e.type))).toEqual([
      { type: 'playStart', overtime: false },
      { type: 'goal', scorer: 0 },
      { type: 'kickoff' },
      { type: 'playStart', overtime: false },
      { type: 'matchEnd', winner: 0, reason: 'time' },
    ]);
    expect(sim.score).toEqual([1, 0]);
    expect(sim.match.timeLeft).toBe(0);
    // Toplam: 2 santra (0,8 sn) + 90 sn oyun + gol kutlaması (0,3 + 1 sn simülasyon).
    const expected =
      2 * secondsToSteps(MATCH.kickoffSeconds) +
      secondsToSteps(MATCH.durationSeconds) +
      secondsToSteps(MATCH.goalSlowMoSeconds * MATCH.goalSlowMoScale) +
      secondsToSteps(MATCH.goalCelebrationSeconds - MATCH.goalSlowMoSeconds);
    expect(Math.abs(sim.tick - expected)).toBeLessThanOrEqual(2);
  });

  it('beraberlik → altın gol uzatması → ilk gol maçı bitirir', () => {
    const sim = new GameSim({ rules: { durationSeconds: 5 } });
    stepUntil(sim, 'playing');
    const toOvertime = stepUntil(sim, 'kickoff');
    expect(toOvertime).toContainEqual({ type: 'goldenGoal' });
    expect(sim.match.overtime).toBe(true);
    expect(sim.players[0].x).toBeCloseTo(sim.pitch.width * PLAYER.spawnXRatio, 6);

    const start = stepUntil(sim, 'goldenGoal');
    expect(start).toContainEqual({ type: 'playStart', overtime: true });
    stepN(sim, secondsToSteps(3));
    expect(sim.match.phase).toBe('goldenGoal');

    placeInGoal(sim, 0);
    expect(sim.step(IDLE)).toContainEqual({ type: 'goal', scorer: 1 });
    const end = stepUntil(sim, 'matchEnd');
    expect(end).toContainEqual({ type: 'matchEnd', winner: 1, reason: 'goldenGoal' });
    expect(end.some((e) => e.type === 'kickoff')).toBe(false);
    expect(sim.score).toEqual([0, 1]);
  });

  it('santra beklemesinde ve maç sonunda girdiler yok sayılır', () => {
    const sim = new GameSim({ rules: { durationSeconds: 1, goldenGoalOvertime: false } });
    const run: Inputs = [input({ right: true }), input({ left: true })];
    const x0 = sim.players[0].x;
    stepN(sim, secondsToSteps(MATCH.kickoffSeconds) - 1, run);
    expect(sim.players[0].x).toBe(x0);
    stepN(sim, 10, run);
    expect(sim.players[0].x).toBeGreaterThan(x0);

    stepUntil(sim, 'matchEnd');
    stepN(sim, 30);
    const xEnd = sim.players[0].x;
    stepN(sim, 30, run);
    expect(sim.players[0].x).toBeCloseTo(xEnd, 6);
  });
});

describe('GameSim — üst direkte bekleme', () => {
  it('top üst direkte 2 sn kalırsa sahaya doğru itilir, daha önce itilmez', () => {
    const sim = new GameSim(IN_PLAY);
    isolate(sim);
    const goal = sim.pitch.goals[0];
    sim.ball.resetTo(40, goal.crossbar.minY - sim.ball.radius);

    const before = stepN(sim, secondsToSteps(MATCH.crossbarRestMaxSeconds) - 2);
    expect(before.some((e) => e.type === 'crossbarPush')).toBe(false);
    expect(sim.ball.x).toBeCloseTo(40, 3);

    const after = stepN(sim, 6);
    expect(after).toContainEqual({ type: 'crossbarPush' });
    expect(sim.ball.vx).toBeGreaterThan(0);
    stepN(sim, 60);
    expect(sim.ball.x).toBeGreaterThan(goal.lineX + sim.ball.radius);
  });

  it('sağ kalede sola (sahaya) itilir', () => {
    const sim = new GameSim(IN_PLAY);
    isolate(sim);
    const goal = sim.pitch.goals[1];
    sim.ball.resetTo(sim.pitch.width - 40, goal.crossbar.minY - sim.ball.radius);
    stepN(sim, secondsToSteps(MATCH.crossbarRestMaxSeconds) + 3);
    expect(sim.ball.vx).toBeLessThan(0);
  });
});

describe('GameSim — oyuncular', () => {
  it('birbirini iter ama içinden geçemez', () => {
    const sim = new GameSim(IN_PLAY);
    const [p1, p2] = sim.players;
    let minGap = Number.POSITIVE_INFINITY;
    for (let i = 0; i < secondsToSteps(4); i++) {
      sim.step([input({ right: true }), input({ left: true, jump: i % 50 === 0 })]);
      expect(p1.x).toBeLessThan(p2.x);
      minGap = Math.min(minGap, Math.hypot(p2.x - p1.x, p2.y - p1.y));
    }
    expect(minGap).toBeGreaterThan(PLAYER.head.radius * 2 - 1);
  });

  it('yürüyen oyuncu duran rakibi iter', () => {
    const sim = new GameSim(IN_PLAY);
    const [p1, p2] = sim.players;
    sim.ball.resetTo(640, 100);
    p1.resetTo(p2.x - 200, p1.y);
    const startX = p2.x;
    stepN(sim, secondsToSteps(1.5), [input({ right: true }), EMPTY_INPUT]);
    expect(p2.x).toBeGreaterThan(startX + 40);
    expect(p1.x).toBeLessThan(p2.x);
  });

  it('hızlanma/yavaşlama eğrisi: tam hıza ~0,1 sn, duruşa ~0,07 sn', () => {
    const sim = new GameSim(IN_PLAY);
    const p1 = sim.players[0];
    stepN(sim, secondsToSteps(0.12), [input({ right: true }), EMPTY_INPUT]);
    expect(p1.vx).toBe(PLAYER.move.maxSpeed);
    stepN(sim, secondsToSteps(0.08));
    expect(p1.vx).toBe(0);
  });

  it('zıplama tepe yüksekliği ve hava süresi tasarım aralığında', () => {
    const sim = new GameSim(IN_PLAY);
    const p1 = sim.players[0];
    const standY = p1.y;
    let apex = 0;
    let airSteps = 0;
    for (let i = 0; i < 120; i++) {
      sim.step([input({ jump: true }), EMPTY_INPUT]);
      apex = Math.max(apex, standY - p1.y);
      if (!p1.grounded) airSteps++;
      else if (airSteps > 0) break;
    }
    expect(apex).toBeGreaterThan(140);
    expect(apex).toBeLessThan(180);
    expect(airSteps * STEP_SECONDS).toBeGreaterThan(0.5);
    expect(airSteps * STEP_SECONDS).toBeLessThan(0.7);
  });

  it('jump buffer: yere inmeden kısa süre önce basılan zıplama inişte uygulanır', () => {
    // Önce iniş adımını bul.
    const probe = new GameSim(IN_PLAY);
    let landing = -1;
    for (let i = 0; i < 120 && landing < 0; i++) {
      probe.step([input({ jump: i < 30 }), EMPTY_INPUT]);
      if (i > 5 && probe.players[0].grounded) landing = i;
    }
    expect(landing).toBeGreaterThan(0);

    const tryRepress = (ticksBefore: number): boolean => {
      const sim = new GameSim(IN_PLAY);
      let jumpedAgain = false;
      for (let i = 0; i < landing + 10; i++) {
        const press = i < 30 ? i < landing - 10 : i === landing - ticksBefore;
        sim.step([input({ jump: press }), EMPTY_INPUT]);
        if (i >= landing && sim.players[0].vy < -PLAYER.jump.speed * 0.5) jumpedAgain = true;
      }
      return jumpedAgain;
    };
    expect(tryRepress(3)).toBe(true);
    expect(tryRepress(secondsToSteps(PLAYER.jump.bufferTime) + 3)).toBe(false);
  });

  it('coyote time: zeminden ayrıldıktan kısa süre sonra hâlâ zıplanabilir', () => {
    const p = new Player(0, 1);
    p.resetTo(300, 500);
    p.grounded = false;
    p.coyoteTimer = PLAYER.jump.coyoteTime * 0.75;
    p.applyInput(input({ jump: true }), STEP_SECONDS);
    expect(p.vy).toBe(-PLAYER.jump.speed);

    const late = new Player(0, 1);
    late.resetTo(300, 500);
    late.grounded = false;
    late.coyoteTimer = 0;
    late.applyInput(input({ jump: true }), STEP_SECONDS);
    expect(late.vy).toBe(0);
  });

  it('coyote time: üst direkten yürüyerek düşen oyuncu birkaç adım sonra zıplayabilir', () => {
    const run = (jumpDelay: number): boolean => {
      const sim = new GameSim(IN_PLAY);
      const p1 = sim.players[0];
      const bar = sim.pitch.goals[0].crossbar;
      p1.resetTo(40, bar.minY - PLAYER_STAND_OFFSET);
      sim.ball.resetTo(640, 100);
      let leftAt = -1;
      for (let i = 0; i < 120; i++) {
        const press = leftAt >= 0 && i === leftAt + jumpDelay;
        sim.step([input({ right: true, jump: press }), EMPTY_INPUT]);
        if (leftAt < 0 && i > 2 && !p1.grounded) leftAt = i;
        if (press || (leftAt >= 0 && i === leftAt + jumpDelay + 1)) {
          if (p1.vy < -PLAYER.jump.speed * 0.5) return true;
        }
      }
      return false;
    };
    expect(run(2)).toBe(true);
    expect(run(secondsToSteps(PLAYER.jump.coyoteTime) + 4)).toBe(false);
  });

  it('değişken zıplama: tuş erken bırakılırsa daha alçak zıplar', () => {
    const height = (holdSteps: number): number => {
      const sim = new GameSim(IN_PLAY);
      const p1 = sim.players[0];
      const standY = p1.y;
      let apex = 0;
      for (let i = 0; i < 60; i++) {
        sim.step([input({ jump: i < holdSteps }), EMPTY_INPUT]);
        apex = Math.max(apex, standY - p1.y);
      }
      return apex;
    };
    expect(height(3)).toBeLessThan(height(40) * 0.7);
  });
});

describe('GameSim — şut ve kafa vuruşu', () => {
  function ballAtFoot(sim: GameSim, dyFromFoot = 0): void {
    const p1 = sim.players[0];
    const o = footOffset(KICK.restAngle, 1);
    const footX = p1.x + o.x;
    const footY = p1.y + o.y;
    const ball = sim.ball;
    const touch = ball.radius + PLAYER.foot.radius + 1;
    const dx = Math.sqrt(Math.max(touch * touch - dyFromFoot * dyFromFoot, 0));
    ball.resetTo(footX + dx, footY + dyFromFoot);
  }

  it('durağan şut: top güçlü biçimde ileri ve yukarı gider, savrulma başına tek darbe', () => {
    const sim = new GameSim(IN_PLAY);
    isolate(sim);
    ballAtFoot(sim, -9);
    const events = sim.step([input({ kick: true }), EMPTY_INPUT]);
    expect(events.filter((e) => e.type === 'kick')).toHaveLength(1);
    expect(sim.ball.vx).toBeGreaterThan(KICK.maxSpeed * 0.8);
    expect(sim.ball.vy).toBeLessThan(0);
    // Savrulmanın geri kalanında ikinci şut darbesi yok.
    const rest = stepN(
      sim,
      secondsToSteps(KICK.swingSeconds + KICK.holdSeconds + KICK.returnSeconds),
    );
    expect(rest.filter((e) => e.type === 'kick')).toHaveLength(0);
  });

  it('ayak topun üstüne vurursa top yere doğru gider', () => {
    const sim = new GameSim(IN_PLAY);
    isolate(sim);
    const p1 = sim.players[0];
    p1.resetTo(400, 380); // havada
    const o = footOffset(KICK.restAngle, 1);
    const ball = sim.ball;
    ball.resetTo(p1.x + o.x + 22, p1.y + o.y + 27);
    sim.step([input({ kick: true }), EMPTY_INPUT]);
    expect(ball.vx).toBeGreaterThan(0);
    expect(ball.vy).toBeGreaterThan(0);
  });

  it('savrulma fazı: geç temas erken temastan daha zayıftır', () => {
    const kickSpeedAfterDelay = (delaySteps: number): number => {
      const sim = new GameSim(IN_PLAY);
      isolate(sim);
      const p1 = sim.players[0];
      sim.step([input({ kick: true }), EMPTY_INPUT]);
      for (let i = 1; i < delaySteps; i++) sim.step(IDLE);
      // Topu ayağın o anki konumunun hemen önüne koy.
      const foot = p1.partCircle('foot');
      sim.ball.resetTo(foot.x + foot.radius + sim.ball.radius + 2, foot.y);
      const ev = sim.step(IDLE);
      const kick = ev.find((e) => e.type === 'kick');
      return kick?.type === 'kick' ? kick.speed : 0;
    };
    const early = kickSpeedAfterDelay(1);
    const late = kickSpeedAfterDelay(4);
    expect(early).toBeGreaterThan(0);
    expect(late).toBeGreaterThan(0);
    expect(late).toBeLessThan(early * 0.8);
  });

  it('koşarak şut duran şuttan daha güçlüdür (oyuncu hızı aktarılır)', () => {
    const standing = new GameSim(IN_PLAY);
    isolate(standing);
    ballAtFoot(standing, -9);
    standing.step([input({ kick: true }), EMPTY_INPUT]);

    const running = new GameSim(IN_PLAY);
    isolate(running);
    running.players[0].vx = PLAYER.move.maxSpeed;
    ballAtFoot(running, -9);
    running.step([input({ kick: true, right: true }), EMPTY_INPUT]);

    expect(running.ball.speed).toBeGreaterThan(standing.ball.speed + 100);
  });

  it('zıplarken kafa: oyuncunun hızı topa aktarılır (güçlü vole)', () => {
    const sim = new GameSim(IN_PLAY);
    isolate(sim);
    const p1 = sim.players[0];
    sim.ball.resetTo(p1.x + 4, p1.y - PLAYER.head.radius - sim.ball.radius - 50);
    const events = stepN(sim, 10, [input({ jump: true }), EMPTY_INPUT]);
    expect(events.some((e) => e.type === 'header')).toBe(true);
    expect(sim.ball.vy).toBeLessThan(-PLAYER.jump.speed);
  });

  it('koşarken kafa: top ileri itilir', () => {
    const moving = new GameSim(IN_PLAY);
    isolate(moving);
    const p = moving.players[0];
    p.vx = PLAYER.move.maxSpeed;
    moving.ball.resetTo(p.x + PLAYER.head.radius + moving.ball.radius + 6, p.y);
    stepN(moving, 3, [input({ right: true }), EMPTY_INPUT]);

    const still = new GameSim(IN_PLAY);
    isolate(still);
    const q = still.players[0];
    still.ball.resetTo(q.x + PLAYER.head.radius + still.ball.radius + 6, q.y);
    still.ball.vx = -PLAYER.move.maxSpeed; // aynı bağıl hızla topun gelmesi
    stepN(still, 3);

    expect(moving.ball.vx).toBeGreaterThan(PLAYER.move.maxSpeed);
    expect(moving.ball.vx).toBeGreaterThan(Math.abs(still.ball.vx));
  });
});

describe('GameSim — top davranışı', () => {
  it('bırakılan top seker, söner ve titremeden zeminde durur', () => {
    const sim = new GameSim(IN_PLAY);
    isolate(sim);
    stepN(sim, secondsToSteps(5));
    expect(sim.ball.vy).toBe(0);
    expect(sim.ball.y).toBeCloseTo(sim.pitch.groundY - sim.ball.radius, 1);
  });

  it('yerde yuvarlanan top dönüş kazanır ve sonunda durur', () => {
    const sim = new GameSim(IN_PLAY);
    isolate(sim);
    sim.ball.resetTo(500, sim.pitch.groundY - sim.ball.radius);
    sim.ball.vx = 500;
    stepN(sim, 10);
    expect(sim.ball.angVel).toBeGreaterThan(0);
    stepN(sim, secondsToSteps(6));
    expect(Math.abs(sim.ball.vx)).toBeLessThan(1);
  });

  it('hava direnci: yerçekimsiz yatay atışta hız zamanla düşer', () => {
    const sim = new GameSim(IN_PLAY);
    isolate(sim);
    sim.ball.resetTo(200, 100);
    sim.ball.vx = 1500;
    sim.step(IDLE);
    const v0 = Math.abs(sim.ball.vx);
    stepN(sim, 10);
    expect(Math.abs(sim.ball.vx)).toBeLessThan(v0);
  });

  it('falso: geri dönüşlü (backspin) top dönüşsüz toptan daha uzun havada kalır', () => {
    const airTime = (spin: number): number => {
      const sim = new GameSim(IN_PLAY);
      isolate(sim);
      sim.players[1].resetTo(1200, sim.players[1].y);
      sim.ball.resetTo(200, 500);
      sim.ball.vx = 900;
      sim.ball.vy = -700;
      sim.ball.angVel = spin;
      for (let i = 1; i < 300; i++) {
        sim.step(IDLE);
        if (sim.ball.grounded) return i;
      }
      return 300;
    };
    expect(airTime(-BALL.maxSpin)).toBeGreaterThan(airTime(0));
  });
});
