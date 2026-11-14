import { describe, expect, it } from 'vitest';
import { LOOP, PITCH, type AiDifficulty, type AiProfile } from '../../config/gameConfig';
import { EMPTY_INPUT, type InputState } from '../../input/InputState';
import { loadoutFor, type CharacterId } from '../characters';
import { Ball } from '../entities/Ball';
import { PLAYER_STAND_OFFSET } from '../entities/Player';
import { GameSim, type GameSimOptions } from '../GameSim';
import type { PlayerIndex, SimEvent } from '../types';
import { AiController, AiInputSource } from './AiController';
import { mixSeed } from './random';
import { StuckMonitor } from './StuckMonitor';
import { observe } from './worldView';

const standY = PITCH.groundY - PLAYER_STAND_OFFSET;
const steps = (seconds: number): number => Math.round(seconds * LOOP.stepHz);
const IN_PLAY: GameSimOptions = { skipKickoff: true, rules: { durationSeconds: 1000 } };

function ai(
  index: PlayerIndex,
  difficulty: AiDifficulty,
  seed = 1,
  overrides?: Partial<AiProfile>,
): AiController {
  return new AiController({ index, difficulty, seed, overrides });
}

/** Tek AI'lı sahne: diğer oyuncu verilen girdiyle (varsayılan: boş) oynar. */
function runWith(
  sim: GameSim,
  controller: AiController,
  seconds: number,
  until?: (events: readonly SimEvent[]) => boolean,
  other: InputState = EMPTY_INPUT,
): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < steps(seconds); i++) {
    const own = controller.update(observe(sim));
    const inputs: [InputState, InputState] = controller.index === 0 ? [own, other] : [other, own];
    const events = sim.step(inputs);
    all.push(...events);
    if (until?.(events)) break;
  }
  return all;
}

/** AI vs AI maç; skor ve sıkışma sayısı. */
function playMatch(
  d1: AiDifficulty,
  d2: AiDifficulty,
  seed: number,
  seconds: number,
): { score: readonly [number, number]; stuck: number } {
  const sim = new GameSim({ rules: { durationSeconds: seconds, goldenGoalOvertime: false } });
  const a = [ai(0, d1, mixSeed(seed, 0)), ai(1, d2, mixSeed(seed, 1))] as const;
  const mon = new StuckMonitor();
  while (sim.match.phase !== 'matchEnd') {
    const v = observe(sim);
    const inputs = [a[0].update(v), a[1].update(v)] as const;
    sim.step(inputs);
    mon.update(sim, inputs);
  }
  return { score: [sim.score[0], sim.score[1]], stuck: mon.events.length };
}

describe('AiController — adil oyun', () => {
  it('yalnızca InputState üretir; simülasyonu hiç değiştirmez', () => {
    const sim = new GameSim();
    const a = [ai(0, 'hard', 3), ai(1, 'medium', 4)] as const;
    for (let i = 0; i < steps(8); i++) {
      const before = sim.snapshot();
      const view = observe(sim);
      const inputs = [a[0].update(view), a[1].update(view)] as const;
      expect(sim.snapshot()).toEqual(before);
      for (const inp of inputs) {
        expect(Object.keys(inp).sort()).toEqual(['jump', 'kick', 'left', 'right', 'super']);
        expect(Object.values(inp).every((v) => typeof v === 'boolean')).toBe(true);
      }
      sim.step(inputs);
    }
  });

  it('dünya görünümü bir kopyadır (AI ona yazsa bile simülasyon etkilenmez)', () => {
    const sim = new GameSim(IN_PLAY);
    const view = observe(sim) as unknown as { ball: { x: number } };
    view.ball.x = -999;
    expect(sim.ball.x).not.toBe(-999);
  });

  it('santra beklemesinde ve maç sonunda boş girdi üretir', () => {
    const sim = new GameSim();
    const c = ai(1, 'hard');
    expect(c.update(observe(sim))).toEqual(EMPTY_INPUT);
    expect(c.currentMode).toBe('idle');
  });
});

describe('AiController — determinizm (tohum)', () => {
  const run = (seedA: number, seedB: number): ReturnType<GameSim['snapshot']> => {
    const sim = new GameSim();
    const a = [ai(0, 'medium', seedA), ai(1, 'medium', seedB)] as const;
    for (let i = 0; i < steps(25); i++) {
      const v = observe(sim);
      sim.step([a[0].update(v), a[1].update(v)]);
    }
    return sim.snapshot();
  };

  it('aynı tohumlar → birebir aynı maç; farklı tohum → farklı maç', () => {
    expect(run(11, 12)).toEqual(run(11, 12));
    expect(run(11, 12)).not.toEqual(run(11, 13));
  });

  it('AiInputSource görünüm sağlayıcısıyla aynı kararları verir', () => {
    const sim = new GameSim();
    const direct = ai(1, 'easy', 5);
    const viaSource = new AiInputSource(ai(1, 'easy', 5), () => observe(sim));
    for (let i = 0; i < steps(3); i++) {
      expect(viaSource.read()).toEqual(direct.update(observe(sim)));
      sim.step([EMPTY_INPUT, EMPTY_INPUT]);
    }
  });
});

describe('AiController — davranışlar', () => {
  for (const index of [0, 1] as const) {
    it(`P${index + 1}: duran topun arkasına geçip rakip kaleye doğru vurur`, () => {
      const sim = new GameSim(IN_PLAY);
      const mine = sim.players[index];
      const other = sim.players[index === 0 ? 1 : 0];
      const toward = index === 0 ? 1 : -1;
      mine.resetTo(640 - toward * 300, standY);
      other.resetTo(640 - toward * 560, standY); // rakip uzakta, AI'ın arkasında
      sim.ball.resetTo(640, PITCH.groundY - sim.ball.radius);
      const events = runWith(sim, ai(index, 'medium', 7), 3, (ev) =>
        ev.some((e) => e.type === 'kick' && e.player === index),
      );
      expect(events.some((e) => e.type === 'kick' && e.player === index)).toBe(true);
      expect(Math.sign(sim.ball.vx)).toBe(toward);
    });
  }

  it('kalesine giden topu, top kaleye varmadan uzaklaştırır (Orta ve Zor)', () => {
    for (const difficulty of ['medium', 'hard'] as const) {
      let saved = 0;
      for (let seed = 1; seed <= 5; seed++) {
        const sim = new GameSim(IN_PLAY);
        sim.players[0].resetTo(420, standY);
        sim.players[1].resetTo(1150, standY);
        sim.ball.resetTo(760, PITCH.groundY - sim.ball.radius);
        sim.ball.vx = -650;
        const controller = ai(0, difficulty, seed);
        // İlk temas AI'ın mı ve top kaleden uzaklaşıyor mu?
        let cleared = false;
        for (let i = 0; i < steps(2) && !cleared; i++) {
          const events = sim.step([controller.update(observe(sim)), EMPTY_INPUT]);
          if (events.some((e) => e.type === 'goal')) break;
          if (sim.ball.touches > 0 && sim.ball.lastTouch === 0 && sim.ball.vx > 0) cleared = true;
        }
        if (cleared) saved++;
      }
      expect(saved, difficulty).toBeGreaterThanOrEqual(4);
    }
  });

  it('bar doluyken uygun mesafede süperi hazırlar ve süper şut atar', () => {
    const sim = new GameSim(IN_PLAY);
    sim.players[0].resetTo(560, standY);
    sim.players[1].resetTo(200, standY);
    sim.players[0].power = 1;
    sim.ball.resetTo(760, PITCH.groundY - sim.ball.radius);
    const events = runWith(sim, ai(0, 'hard', 2, { superUseRate: 1 }), 3, (ev) =>
      ev.some((e) => e.type === 'kick' && e.player === 0),
    );
    expect(events).toContainEqual({ type: 'superArmed', player: 0 });
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'kick', player: 0, super: true }),
    );
  });

  it('süper kullanım oranı 0 ise süperi hiç kullanmaz', () => {
    const sim = new GameSim(IN_PLAY);
    sim.players[0].resetTo(560, standY);
    sim.players[1].resetTo(200, standY);
    sim.players[0].power = 1;
    sim.ball.resetTo(760, PITCH.groundY - sim.ball.radius);
    const events = runWith(sim, ai(0, 'hard', 2, { superUseRate: 0 }), 3);
    expect(events.some((e) => e.type === 'superArmed')).toBe(false);
  });

  it('üst direğin üstünde kalmaz (sıkışma önleme)', () => {
    const sim = new GameSim(IN_PLAY);
    const goal = sim.pitch.goals[1];
    const onBarY = goal.crossbar.minY - PLAYER_STAND_OFFSET;
    sim.players[1].resetTo((goal.crossbar.minX + goal.crossbar.maxX) / 2, onBarY);
    sim.players[0].resetTo(200, standY);
    sim.ball.resetTo(1100, PITCH.groundY - sim.ball.radius);
    runWith(sim, ai(1, 'medium', 4), 1.5);
    expect(sim.players[1].y).toBeGreaterThan(onBarY + PLAYER_STAND_OFFSET);
  });

  it("itişip kilitlendiğinde kaçış yapar; 2 sn'lik kilitlenme oluşmaz", () => {
    const sim = new GameSim(IN_PLAY);
    sim.players[0].resetTo(560, standY);
    sim.players[1].resetTo(640, standY);
    sim.ball.resetTo(1000, PITCH.groundY - sim.ball.radius); // top rakibin arkasında
    const controller = ai(0, 'medium', 9);
    const mon = new StuckMonitor();
    const pushLeft: InputState = { ...EMPTY_INPUT, left: true };
    for (let i = 0; i < steps(6); i++) {
      const inputs = [controller.update(observe(sim)), pushLeft] as const;
      sim.step(inputs);
      mon.update(sim, inputs);
    }
    expect(controller.stats.escapes.push).toBeGreaterThanOrEqual(1);
    expect(mon.counts().playersLocked).toBe(0);
  });

  it('P1 ve P2 aynı tohumla simetrik santrada birbirinin aynası gibi oynar', () => {
    const sim = new GameSim();
    const a = [ai(0, 'hard', 21), ai(1, 'hard', 21)] as const;
    let compared = 0;
    for (let i = 0; i < steps(1.4); i++) {
      const v = observe(sim);
      const [i1, i2] = [a[0].update(v), a[1].update(v)];
      const touched = sim.ball.touches > 0;
      if (!touched) {
        expect(i1.left).toBe(i2.right);
        expect(i1.right).toBe(i2.left);
        expect(i1.jump).toBe(i2.jump);
        expect(i1.kick).toBe(i2.kick);
        compared++;
      }
      sim.step([i1, i2]);
    }
    expect(compared).toBeGreaterThan(steps(0.8));
  });
});

describe('AiController — zorluk ve sıkışma (kısa maçlar)', () => {
  it(
    "Zor, Kolay'ı yener (iki tarafta da; gol ve galibiyet sayısında önde)",
    { timeout: 20000 },
    () => {
      let hardGoals = 0;
      let easyGoals = 0;
      let hardWins = 0;
      let easyWins = 0;
      for (let seed = 1; seed <= 3; seed++) {
        const r1 = playMatch('hard', 'easy', seed, 45);
        const r2 = playMatch('easy', 'hard', seed + 10, 45);
        hardGoals += r1.score[0] + r2.score[1];
        easyGoals += r1.score[1] + r2.score[0];
        if (r1.score[0] > r1.score[1]) hardWins++;
        if (r1.score[1] > r1.score[0]) easyWins++;
        if (r2.score[1] > r2.score[0]) hardWins++;
        if (r2.score[0] > r2.score[1]) easyWins++;
      }
      expect(hardGoals).toBeGreaterThan(easyGoals);
      expect(hardWins).toBeGreaterThan(easyWins * 2);
    },
  );

  it('AI vs AI maçlarında sıkışma olayı yok', () => {
    for (const [d1, d2] of [
      ['easy', 'easy'],
      ['medium', 'hard'],
    ] as const) {
      expect(playMatch(d1, d2, 3, 60).stuck).toBe(0);
    }
  });
});

describe('AiController — karakterler, süperler ve güçlendiriciler', () => {
  const withLoadouts = (a: CharacterId, b: CharacterId): GameSim =>
    new GameSim({ ...IN_PLAY, powerUps: false, loadouts: [loadoutFor(a), loadoutFor(b)] });

  it('süperini karakterin tipine uygun durumda kullanır (Gökkuşağı: uzaktan, rakip kaleden uzakken)', () => {
    const sim = withLoadouts('yay', 'kor');
    sim.players[0].resetTo(300, standY);
    sim.players[1].resetTo(800, standY);
    sim.players[0].power = 1;
    sim.ball.resetTo(420, PITCH.groundY - sim.ball.radius);
    const events = runWith(sim, ai(0, 'hard', 3), 4, (ev) =>
      ev.some((e) => e.type === 'superLaunch'),
    );
    expect(events).toContainEqual({ type: 'superLaunch', player: 0, superType: 'rainbow' });
  });

  it('koşulu sağlanmayan süperi harcamaz (Buz: rakip topun önünde değilken)', () => {
    const sim = withLoadouts('ayaz', 'kor');
    sim.players[0].resetTo(300, standY);
    sim.players[1].resetTo(200, standY); // rakip AI'ın arkasında
    sim.players[0].power = 1;
    sim.ball.resetTo(520, PITCH.groundY - sim.ball.radius);
    const events = runWith(sim, ai(0, 'hard', 3), 1.5);
    expect(events.some((e) => e.type === 'superArmed')).toBe(false);
    expect(events.some((e) => e.type === 'kick' && e.player === 0)).toBe(true);
  });

  it('kalesine gitmeyen Buz topuna gereksiz yere değmez (Zor); hareketsiz oyuncu donar', () => {
    const frozenWith = (controller: AiController | null): boolean => {
      const sim = withLoadouts('ayaz', 'kor');
      sim.players[0].resetTo(150, standY);
      sim.players[1].resetTo(640, standY);
      sim.ball.resetTo(460, standY - 10);
      sim.ball.vx = 450;
      sim.ball.vy = -120;
      sim.ball.lastTouch = 0;
      sim.ball.superType = 'ice';
      sim.ball.superOwner = 0;
      sim.ball.superTime = 0.2;
      for (let i = 0; i < steps(0.8); i++) {
        const own = controller ? controller.update(observe(sim)) : EMPTY_INPUT;
        const events = sim.step([EMPTY_INPUT, own]);
        if (events.some((e) => e.type === 'superHit' && e.player === 1)) return true;
      }
      return false;
    };
    expect(frozenWith(null)).toBe(true);
    let frozen = 0;
    for (let seed = 1; seed <= 5; seed++) if (frozenWith(ai(1, 'hard', seed))) frozen++;
    expect(frozen).toBeLessThanOrEqual(1);
  });

  it('Serap: bazen yanılsamayı izler (tohuma bağlı); yanılsamalar sönünce gerçek topa döner', () => {
    /** Gecikme geçtikten sonra AI'ın kestirdiği top konumu gerçek topa mı en yakın? */
    const trace = (seed: number): { fooled: boolean; recovered: boolean } => {
      const sim = withLoadouts('pamuk', 'kor');
      sim.players[0].resetTo(300, standY);
      sim.players[1].resetTo(1100, standY);
      // Zor: tahmin gürültüsü düşük (izlenen top net ayırt edilir), gerçeği %60 seçer.
      const c = ai(1, 'hard', seed);
      sim.ball.resetTo(420, 420);
      sim.ball.vx = 450;
      sim.ball.vy = -300;
      sim.ball.lastTouch = 0;
      sim.ball.superType = 'mirage';
      sim.ball.superOwner = 0;
      const decoy = (vx: number, vy: number): Ball =>
        Object.assign(new Ball(), { x: 420, y: 420, vx, vy });
      sim.decoys.push({ ball: decoy(450, -560), ttl: 0.6 }, { ball: decoy(500, -40), ttl: 0.6 });
      let fooled = false;
      for (let i = 0; i < steps(1.2); i++) {
        c.update(observe(sim));
        const t = c.debugInfo().trajectory;
        const ex = t[0] ?? 0;
        const ey = t[1] ?? 0;
        const near = (x: number, y: number): number => Math.hypot(ex - x, ey - y);
        if (i === steps(0.45) && sim.decoys.length > 0) {
          const real = near(sim.ball.x, sim.ball.y);
          fooled = sim.decoys.some((d) => near(d.ball.x, d.ball.y) < real);
        }
        sim.step([EMPTY_INPUT, EMPTY_INPUT]);
      }
      // Yanılsamalar sönüp gecikme geçtikten sonra tahmin gerçek topla aynı yerde başlar.
      c.update(observe(sim));
      const t = c.debugInfo().trajectory;
      const recovered = Math.hypot((t[0] ?? 0) - sim.ball.x, (t[1] ?? 0) - sim.ball.y) < 40;
      return { fooled, recovered };
    };
    const results = Array.from({ length: 8 }, (_, k) => trace(k + 1));
    const fooled = results.filter((r) => r.fooled).length;
    expect(fooled).toBeGreaterThan(0);
    expect(fooled).toBeLessThan(8);
    expect(results.every((r) => r.recovered)).toBe(true);
  });

  it('uç karakter eşleşmelerinde (güçlendiricilerle) sıkışma yok', () => {
    const pairs: [CharacterId, CharacterId][] = [
      ['kaya', 'simsek'],
      ['sis', 'toprak'],
      ['pamuk', 'yay'],
    ];
    for (const [a, b] of pairs) {
      const sim = new GameSim({
        rules: { durationSeconds: 45, goldenGoalOvertime: false },
        loadouts: [loadoutFor(a), loadoutFor(b)],
        seed: 7,
      });
      const ctrl = [ai(0, 'medium', 21), ai(1, 'hard', 22)] as const;
      const mon = new StuckMonitor();
      while (sim.match.phase !== 'matchEnd') {
        const v = observe(sim);
        const inputs = [ctrl[0].update(v), ctrl[1].update(v)] as const;
        sim.step(inputs);
        mon.update(sim, inputs);
      }
      expect(mon.events).toEqual([]);
    }
  }, 20000);
});
