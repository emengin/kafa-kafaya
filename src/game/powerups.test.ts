import { describe, expect, it } from 'vitest';
import { LOOP, PITCH, PLAYER, POWERUPS, type PowerUpType } from '../config/gameConfig';
import { EMPTY_INPUT, type InputState } from '../input/InputState';
import { SeededRandom } from './ai/random';
import { PLAYER_STAND_OFFSET, POWER_UP_TYPES } from './entities/Player';
import { GameSim } from './GameSim';
import { balloonPosition, spawnBalloon } from './powerups';
import { isBallInGoal } from './rules/ballRules';
import type { SimEvent } from './types';

const IDLE = [EMPTY_INPUT, EMPTY_INPUT] as const;
const steps = (s: number): number => Math.round(s * LOOP.stepHz);

function inPlay(seed = 1): GameSim {
  const sim = new GameSim({ skipKickoff: true, seed, rules: { durationSeconds: 1000 } });
  const standY = sim.pitch.groundY - PLAYER_STAND_OFFSET;
  sim.players[0].resetTo(200, standY);
  sim.players[1].resetTo(1080, standY);
  sim.ball.resetTo(640, sim.pitch.groundY - sim.ball.radius);
  return sim;
}

function run(
  sim: GameSim,
  n: number,
  inputs: readonly [InputState, InputState] = IDLE,
): SimEvent[] {
  const out: SimEvent[] = [];
  for (let i = 0; i < n; i++) out.push(...sim.step(inputs));
  return out;
}

/** Topu balonun tam üstüne koyar (son dokunan `toucher`). */
function hitBalloon(sim: GameSim, toucher: 0 | 1 | -1): SimEvent[] {
  const pos = sim.balloonPosition();
  if (!pos) throw new Error('balon yok');
  sim.ball.resetTo(pos.x, pos.y);
  sim.ball.lastTouch = toucher;
  return sim.step(IDLE);
}

function grant(sim: GameSim, player: 0 | 1, type: PowerUpType): void {
  sim.balloon = { type, cx: 640, cy: 200, phase: 0, age: 0 };
  hitBalloon(sim, player);
}

describe('Güçlendirici balonları', () => {
  it('oyun akarken 12–18 sn aralıklarla belirir; sahanın üst yarısında süzülür ve süre sonunda söner', () => {
    const sim = inPlay();
    const spawns: number[] = [];
    let expired = 0;
    for (let i = 0; i < steps(60); i++) {
      const events = sim.step(IDLE);
      if (events.some((e) => e.type === 'balloonSpawn')) spawns.push(sim.tick / LOOP.stepHz);
      if (events.some((e) => e.type === 'balloonExpire')) expired++;
      const pos = sim.balloonPosition();
      if (pos) {
        expect(pos.y + POWERUPS.balloon.radius).toBeLessThan(sim.pitch.height / 2);
        expect(pos.x).toBeGreaterThan(PITCH.goal.depth);
        expect(pos.x).toBeLessThan(sim.pitch.width - PITCH.goal.depth);
      }
    }
    expect(spawns.length).toBeGreaterThanOrEqual(3);
    expect(spawns[0]).toBeGreaterThanOrEqual(POWERUPS.spawnIntervalMin - 1e-6);
    for (let i = 1; i < spawns.length; i++) {
      const gap = (spawns[i] ?? 0) - (spawns[i - 1] ?? 0);
      expect(gap).toBeGreaterThanOrEqual(POWERUPS.spawnIntervalMin - 1e-6);
      expect(gap).toBeLessThan(POWERUPS.spawnIntervalMax + 1e-6);
    }
    expect(expired).toBeGreaterThan(0);
  });

  it('santra beklemesinde belirmez; santra balonu kaldırır', () => {
    const waiting = new GameSim({ rules: { durationSeconds: 1000 } });
    // Santra 0,8 sn; balon en erken 12 sn sonra (yalnızca oyun akarken sayılır).
    run(waiting, steps(POWERUPS.spawnIntervalMin - 1));
    expect(waiting.balloon).toBeNull();
    const sim = inPlay();
    sim.balloon = spawnBalloon(new SeededRandom(3));
    sim.resetPositions();
    expect(sim.balloon).toBeNull();
  });

  it('top balona değince son dokunan oyuncu kazanır; kimse dokunmadıysa top içinden geçer', () => {
    const sim = inPlay();
    sim.balloon = spawnBalloon(new SeededRandom(5));
    const type = sim.balloon.type;
    expect(hitBalloon(sim, -1).some((e) => e.type === 'balloonPop')).toBe(false);
    expect(sim.balloon).not.toBeNull();
    const events = hitBalloon(sim, 1);
    expect(events).toContainEqual({ type: 'balloonPop', player: 1, powerUp: type });
    expect(sim.balloon).toBeNull();
    expect(sim.players[1].powerUps[type]).toBeGreaterThan(0);
  });

  it('balon hareketi kapalı biçimli: aynı yaş → aynı konum (AI aynı fonksiyonla kestirir)', () => {
    const b = spawnBalloon(new SeededRandom(9));
    expect(balloonPosition(b, 3.2)).toEqual(balloonPosition({ ...b, age: 3.2 }));
  });

  it('aynı tohum → aynı balonlar; farklı tohum → farklı', () => {
    const types = (seed: number): PowerUpType[] => {
      const sim = inPlay(seed);
      const out: PowerUpType[] = [];
      for (const e of run(sim, steps(80))) if (e.type === 'balloonSpawn') out.push(e.powerUp);
      return out;
    };
    expect(types(4)).toEqual(types(4));
    expect(types(4)).not.toEqual(types(5));
  });

  it('powerUps: false → balon çıkmaz', () => {
    const sim = new GameSim({
      skipKickoff: true,
      powerUps: false,
      rules: { durationSeconds: 1000 },
    });
    expect(run(sim, steps(40)).some((e) => e.type === 'balloonSpawn')).toBe(false);
  });
});

describe('Güçlendirici etkileri', () => {
  it('süreli: sayaç oyun akarken azalır ve etki biter', () => {
    const sim = inPlay();
    grant(sim, 0, 'speed');
    expect(sim.players[0].powerUps.speed).toBeCloseTo(POWERUPS.durations.speed, 1);
    run(sim, steps(POWERUPS.durations.speed) + 2);
    expect(sim.players[0].powerUps.speed).toBe(0);
    sim.step(IDLE);
    expect(sim.players[0].speedScale).toBe(1);
  });

  it('Büyük Kafa: kendi kafası büyür; Rakibi Küçült: rakibin kafası küçülür', () => {
    const sim = inPlay();
    grant(sim, 0, 'bigHead');
    grant(sim, 1, 'shrinkOpponent');
    run(sim, steps(1));
    const r0 = sim.players[0].headRadius;
    expect(r0).toBeCloseTo(PLAYER.head.radius * POWERUPS.bigHeadScale * POWERUPS.shrinkScale, 6);
    expect(sim.players[1].headRadius).toBe(PLAYER.head.radius);
  });

  it('Hız: en yüksek hız artar', () => {
    const sim = inPlay();
    grant(sim, 0, 'speed');
    run(sim, steps(0.5), [{ ...EMPTY_INPUT, right: true }, EMPTY_INPUT]);
    expect(sim.players[0].vx).toBeCloseTo(PLAYER.move.maxSpeed * POWERUPS.speedScale, 6);
  });

  it('Rakip Kalesini Büyüt: rakip kalesi yükselir, gol kuralı yeni yüksekliği kullanır, sonra eski hâline döner', () => {
    const sim = inPlay();
    grant(sim, 0, 'growGoal');
    run(sim, steps(1));
    const goal = sim.pitch.goals[1];
    expect(goal.mouthHeight).toBe(PITCH.goal.mouthHeight + POWERUPS.goalGrowPx);
    expect(sim.pitch.goals[0].mouthHeight).toBe(PITCH.goal.mouthHeight);
    // Eski direğin üstünden (yeni direğin altından) giren top gol.
    const y = PITCH.groundY - PITCH.goal.mouthHeight - 30;
    expect(isBallInGoal({ x: goal.lineX + 40, y, radius: 22 }, goal)).toBe(true);
    run(sim, steps(POWERUPS.durations.growGoal + 1));
    expect(goal.mouthHeight).toBe(PITCH.goal.mouthHeight);
  });

  it('Rakibi Dondur: rakip hemen donar', () => {
    const sim = inPlay();
    grant(sim, 1, 'freezeOpponent');
    expect(sim.players[0].frozen).toBe(true);
    expect(sim.players[0].frozenTimer).toBeCloseTo(POWERUPS.durations.freezeOpponent, 1);
  });

  it('Çift Zıplama: havadayken bir kez daha zıplanabilir (ikinci kez değil)', () => {
    const jumpsInAir = (enabled: boolean): number => {
      const sim = inPlay();
      if (enabled) grant(sim, 0, 'doubleJump');
      sim.step(IDLE);
      let jumps = 0;
      // Uzun ilk zıplama, sonra havadayken iki yeni basış (oyuncu henüz yere inmeden).
      for (let i = 0; i < 32; i++) {
        const press = i < 14 || (i >= 18 && i < 22) || (i >= 26 && i < 30);
        const vyBefore = sim.players[0].vy;
        sim.step([{ ...EMPTY_INPUT, jump: press }, EMPTY_INPUT]);
        if (sim.players[0].vy < -PLAYER.jump.speed * 0.5 && vyBefore > -PLAYER.jump.speed * 0.5) {
          jumps++;
        }
      }
      return jumps;
    };
    expect(jumpsInAir(false)).toBe(1);
    expect(jumpsInAir(true)).toBe(2);
  });

  it('tüm tipler HUD sırasında listelenir', () => {
    expect(POWER_UP_TYPES).toHaveLength(6);
  });
});
