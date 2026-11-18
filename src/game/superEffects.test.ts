import { describe, expect, it } from 'vitest';
import { BALL, KICK, LOOP, PITCH, PLAYER, SUPER_SHOTS, type SuperType } from '../config/gameConfig';
import { EMPTY_INPUT, type InputState } from '../input/InputState';
import { BallPredictor } from './ai/BallPredictor';
import { observe } from './ai/worldView';
import { NEUTRAL_LOADOUT, type Loadout } from './characters';
import { footOffset, PLAYER_STAND_OFFSET } from './entities/Player';
import { GameSim } from './GameSim';
import { attackLineX } from './superEffects';
import type { SimEvent } from './types';

const IDLE = [EMPTY_INPUT, EMPTY_INPUT] as const;
const KICK1: readonly [InputState, InputState] = [{ ...EMPTY_INPUT, kick: true }, EMPTY_INPUT];
const steps = (s: number): number => Math.round(s * LOOP.stepHz);

function withSuper(type: SuperType): Loadout {
  return { ...NEUTRAL_LOADOUT, superType: type };
}

/** P1 (süper tipiyle) x=300'de, P2 `p2x`'te; top P1'in ayağının önünde, süper hazır. */
function setup(type: SuperType, p2x = 1000): GameSim {
  const sim = new GameSim({
    skipKickoff: true,
    powerUps: false,
    loadouts: [withSuper(type), NEUTRAL_LOADOUT],
    rules: { durationSeconds: 1000 },
  });
  const standY = sim.pitch.groundY - PLAYER_STAND_OFFSET;
  sim.players[0].resetTo(300, standY);
  sim.players[1].resetTo(p2x, standY);
  const p1 = sim.players[0];
  const o = footOffset(KICK.restAngle, 1);
  const touch = sim.ball.radius + PLAYER.foot.radius + 1;
  const dy = -9;
  sim.ball.resetTo(p1.x + o.x + Math.sqrt(touch * touch - dy * dy), p1.y + o.y + dy);
  p1.superArmed = true;
  return sim;
}

/** Oyuncuyu topun yolundan çekip sol köşeye koyar. */
function park(sim: GameSim, index: 0 | 1, x: number): void {
  sim.players[index].resetTo(x, sim.pitch.groundY - PLAYER_STAND_OFFSET);
}

function run(sim: GameSim, n: number, inputs = IDLE): SimEvent[] {
  const out: SimEvent[] = [];
  for (let i = 0; i < n; i++) out.push(...sim.step(inputs));
  return out;
}

function kickSuper(sim: GameSim): SimEvent[] {
  return [...sim.step(KICK1)];
}

describe('Süper şutlar — ortak', () => {
  it('süper atış olayı tipi taşır; sahibi ve yönü topa yazılır', () => {
    const sim = setup('fire');
    const events = kickSuper(sim);
    expect(events).toContainEqual({ type: 'superLaunch', player: 0, superType: 'fire' });
    expect(sim.ball.superType).toBe('fire');
    expect(sim.ball.superOwner).toBe(0);
    expect(sim.ball.superDir).toBe(1);
  });

  it('etki süre dolunca biter; santra etkiyi temizler', () => {
    const sim = setup('magnet');
    kickSuper(sim);
    sim.ball.resetTo(640, 200);
    sim.ball.superType = 'magnet';
    sim.ball.superOwner = 0;
    run(sim, steps(SUPER_SHOTS.magnet.duration) + 2);
    expect(sim.ball.superType).toBeNull();
    const s2 = setup('ice');
    kickSuper(s2);
    s2.resetPositions();
    expect(s2.ball.superType).toBeNull();
  });

  it('kendi süper topuna atıştan hemen sonra değmek etkiyi bozmaz', () => {
    const sim = setup('tornado');
    kickSuper(sim);
    run(sim, 2);
    expect(sim.ball.superType).toBe('tornado');
  });
});

describe('Ateş Topu', () => {
  it('yerçekimsiz düz gider; rakibe çarparsa onu geri savurur ve söner', () => {
    const sim = setup('fire', 900);
    kickSuper(sim);
    const vy0 = sim.ball.vy;
    run(sim, 6);
    // Yerçekimi yok: dikey hız neredeyse değişmez (yalnızca hava direnci).
    expect(Math.abs(sim.ball.vy - vy0)).toBeLessThan(BALL.gravity * 0.02);
    const events = run(sim, steps(0.6));
    expect(events).toContainEqual({ type: 'superHit', player: 1, superType: 'fire' });
    expect(sim.ball.superType).toBeNull();
  });

  it('karşı oyun: rakip topu şutla karşılarsa savrulmaz', () => {
    const sim = setup('fire', 900);
    kickSuper(sim);
    const p2 = sim.players[1];
    let hit = false;
    for (let i = 0; i < steps(0.6); i++) {
      // Top yaklaşınca P2 şut çeker (savrulan ayakla temas temiz karşılıktır).
      const near = Math.abs(sim.ball.x - p2.x) < 140;
      const events = sim.step([EMPTY_INPUT, { ...EMPTY_INPUT, kick: near }]);
      if (events.some((e) => e.type === 'superHit')) hit = true;
      if (events.some((e) => e.type === 'kick' && e.player === 1)) break;
    }
    expect(hit).toBe(false);
    expect(sim.ball.superType).toBeNull();
  });
});

describe('Buz', () => {
  it('rakibin gövdesine/kafasına değerse onu 1,5 sn dondurur; donmuş oyuncu tuşları kullanamaz', () => {
    const sim = setup('ice', 700);
    kickSuper(sim);
    const events = run(sim, steps(0.8));
    expect(events).toContainEqual({ type: 'superHit', player: 1, superType: 'ice' });
    const p2 = sim.players[1];
    expect(p2.frozen).toBe(true);
    expect(p2.frozenTimer).toBeLessThanOrEqual(SUPER_SHOTS.ice.freezeSeconds);
    const x = p2.x;
    run(sim, steps(0.3), [EMPTY_INPUT, { ...EMPTY_INPUT, left: true, jump: true }]);
    expect(Math.abs(p2.x - x)).toBeLessThan(5);
    expect(p2.grounded).toBe(true);
    run(sim, steps(SUPER_SHOTS.ice.freezeSeconds));
    expect(p2.frozen).toBe(false);
  });

  it('art arda donma yok: donmanın ardından kısa bağışıklık', () => {
    const sim = setup('ice');
    const p2 = sim.players[1];
    expect(p2.freeze(1.5, true)).toBe(true);
    run(sim, steps(1.6));
    expect(p2.frozen).toBe(false);
    expect(p2.freeze(1.5, true)).toBe(false);
  });
});

describe('Zikzak', () => {
  it('yerçekimsiz, dikeyde dalgalanarak ilerler (dikey hız işaret değiştirir)', () => {
    const sim = setup('zigzag');
    kickSuper(sim);
    let changes = 0;
    let last = Math.sign(sim.ball.vy);
    for (let i = 0; i < steps(0.6); i++) {
      sim.step(IDLE);
      const s = Math.sign(sim.ball.vy);
      if (s !== 0 && s !== last) {
        changes++;
        last = s;
      }
    }
    expect(changes).toBeGreaterThanOrEqual(2);
  });
});

describe('Işınlanma', () => {
  it('yolda kaybolur, oyuncunun içinden geçer ve kalenin önünde yavaşlayarak belirir', () => {
    const sim = setup('teleport', 700);
    kickSuper(sim);
    let phasedSeen = false;
    let exit: Extract<SimEvent, { type: 'teleportExit' }> | null = null;
    let speedBefore = 0;
    for (let i = 0; i < steps(0.8) && !exit; i++) {
      if (sim.ball.phased) speedBefore = sim.ball.speed;
      const events = sim.step(IDLE);
      if (sim.ball.phased) phasedSeen = true;
      const e = events.find((x) => x.type === 'teleportExit');
      if (e?.type === 'teleportExit') exit = e;
    }
    expect(phasedSeen).toBe(true);
    if (!exit) throw new Error('top yeniden belirmedi');
    // Rakibin (x=700) arkasında, kale çizgisinden yeterince önde belirdi.
    expect(exit.x).toBeGreaterThan(700);
    expect(attackLineX(0) - exit.x).toBeGreaterThanOrEqual(
      SUPER_SHOTS.teleport.exitBeforeGoalPx - 40,
    );
    expect(sim.ball.speed).toBeLessThan(speedBefore);
  });

  it('kaleye çok yakından atılırsa ışınlanmaz', () => {
    const sim = setup('teleport');
    const goalX = attackLineX(0);
    const standY = sim.pitch.groundY - PLAYER_STAND_OFFSET;
    sim.players[0].resetTo(goalX - 200, standY);
    const p1 = sim.players[0];
    const o = footOffset(KICK.restAngle, 1);
    const touch = sim.ball.radius + PLAYER.foot.radius + 1;
    sim.ball.resetTo(p1.x + o.x + Math.sqrt(touch * touch - 81), p1.y + o.y - 9);
    kickSuper(sim);
    let phased = false;
    for (let i = 0; i < steps(0.4); i++) {
      sim.step(IDLE);
      if (sim.ball.phased) phased = true;
    }
    expect(phased).toBe(false);
  });
});

describe('Dev Top', () => {
  it('top büyür ve ağırlaşır; süre dolunca eski boyutuna döner', () => {
    const sim = setup('giant');
    kickSuper(sim);
    run(sim, steps(SUPER_SHOTS.giant.growSeconds) + 2);
    expect(sim.ball.radius).toBeCloseTo(BALL.radius * SUPER_SHOTS.giant.radiusScale, 6);
    expect(sim.ball.invMass).toBeLessThan(1 / BALL.mass);
    run(sim, steps(SUPER_SHOTS.giant.duration + SUPER_SHOTS.giant.growSeconds));
    expect(sim.ball.superType).toBeNull();
    expect(sim.ball.radius).toBe(BALL.radius);
  });
});

describe('Kasırga', () => {
  it('yakınındaki rakibi topun gidiş yönünde iter; havadayken daha az', () => {
    const push = (airborne: boolean): number => {
      const sim = setup('tornado', 900);
      kickSuper(sim);
      const p2 = sim.players[1];
      sim.ball.x = p2.x - 60;
      sim.ball.y = p2.y;
      sim.ball.vx = 0;
      sim.ball.vy = 0;
      p2.grounded = !airborne;
      p2.vx = 0;
      sim.step(IDLE);
      return p2.vx;
    };
    const ground = push(false);
    expect(ground).toBeGreaterThan(0);
    expect(push(true)).toBeLessThan(ground);
  });
});

describe('Gökkuşağı', () => {
  it('tavana yakın bir yayla gider ve rakip kalenin ağzının önüne dik iner (sekince söner)', () => {
    const sim = setup('rainbow', 1200);
    park(sim, 1, 60);
    kickSuper(sim);
    const line = attackLineX(0);
    let minY = Infinity;
    let landX = Number.NaN;
    let landVy = 0;
    for (let i = 0; i < steps(2.5) && Number.isNaN(landX); i++) {
      const vy = sim.ball.vy;
      sim.step(IDLE);
      minY = Math.min(minY, sim.ball.y);
      if (vy > 0 && sim.ball.vy <= 0) {
        landX = sim.ball.x;
        landVy = vy;
      }
    }
    expect(minY).toBeLessThan(SUPER_SHOTS.rainbow.apexY + 60);
    // Kale ağzının önüne iner: kaleciye karşılama şansı kalır.
    expect(landX).toBeGreaterThan(line - SUPER_SHOTS.rainbow.targetInsetPx - 160);
    expect(landX).toBeLessThan(line);
    expect(landVy).toBeGreaterThan(Math.abs(sim.ball.vx)); // dik iniş
    expect(sim.ball.superType).toBeNull();
  });
});

describe('Mıknatıs', () => {
  it('top rakip kaleye doğru çekilir (normal topa göre kaleye daha yakın geçer)', () => {
    const endY = (type: SuperType | null): number => {
      const sim = setup(type ?? 'fire', 1200);
      park(sim, 1, 60);
      if (!type) sim.players[0].superArmed = false;
      sim.ball.resetTo(400, 200);
      sim.ball.vx = 900;
      sim.ball.vy = -500;
      if (type) {
        sim.ball.superType = type;
        sim.ball.superOwner = 0;
      }
      run(sim, steps(0.6));
      return sim.ball.y;
    };
    const target = PITCH.groundY - PITCH.goal.mouthHeight / 2;
    expect(Math.abs(endY('magnet') - target)).toBeLessThan(Math.abs(endY(null) - target));
  });
});

describe('Serap', () => {
  it('top üçe bölünür; yanılsamalar oyunculara değince ya da süre dolunca söner, gol olmaz', () => {
    const sim = setup('mirage', 1100);
    kickSuper(sim);
    expect(sim.decoys).toHaveLength(2);
    const dirs = [sim.ball, ...sim.decoys.map((d) => d.ball)].map((b) => Math.atan2(b.vy, b.vx));
    expect(new Set(dirs.map((d) => d.toFixed(3))).size).toBe(3);
    run(sim, steps(SUPER_SHOTS.mirage.duration) + 2);
    expect(sim.decoys).toHaveLength(0);
    expect(sim.score).toEqual([0, 0]);
  });

  it('gerçek topun yönü tohuma bağlı ve deterministik', () => {
    const a = setup('mirage');
    const b = setup('mirage');
    kickSuper(a);
    kickSuper(b);
    expect(a.ball.vx).toBe(b.ball.vx);
    expect(a.ball.vy).toBe(b.ball.vy);
  });
});

describe('Sarsıntı', () => {
  it('rakip 1 sn zıplayamaz; top alçak gider ve yerde sekerek ilerler', () => {
    const sim = setup('quake');
    const events = kickSuper(sim);
    expect(events).toContainEqual({ type: 'superHit', player: 1, superType: 'quake' });
    const p2 = sim.players[1];
    // Top alçak kalır ve yerden seker (dikey hız birkaç kez yukarıya döner).
    const probe = setup('quake');
    kickSuper(probe);
    let minY = Infinity;
    let bounces = 0;
    for (let i = 0; i < steps(0.6); i++) {
      const vy = probe.ball.vy;
      probe.step(IDLE);
      if (vy > 0 && probe.ball.vy < 0) bounces++;
      minY = Math.min(minY, probe.ball.y);
    }
    expect(minY).toBeGreaterThan(PITCH.groundY - 170);
    expect(bounces).toBeGreaterThanOrEqual(1);
    run(sim, 3, [EMPTY_INPUT, { ...EMPTY_INPUT, jump: true }]);
    expect(p2.vy).toBeGreaterThanOrEqual(0);
    run(sim, steps(SUPER_SHOTS.quake.jumpLockSeconds));
    run(sim, 1, IDLE);
    run(sim, 2, [EMPTY_INPUT, { ...EMPTY_INPUT, jump: true }]);
    expect(p2.vy).toBeLessThan(0);
  });
});

describe('Süper top tahmini (AI) = GameSim', () => {
  const types: SuperType[] = ['fire', 'zigzag', 'teleport', 'giant', 'rainbow', 'magnet', 'quake'];
  for (const type of types) {
    it(`${type}: oyunculara değmedikçe tahmin bit bit aynı`, () => {
      const sim = setup(type, 1200);
      park(sim, 1, 60);
      kickSuper(sim);
      park(sim, 0, 150);
      const n = 60;
      const pred = new BallPredictor(n);
      pred.predict(observe(sim).ball, n);
      for (let k = 1; k <= n; k++) {
        sim.step(IDLE);
        expect(pred.x(k)).toBe(sim.ball.x);
        expect(pred.y(k)).toBe(sim.ball.y);
        expect(pred.phased(k)).toBe(sim.ball.phased);
        expect(pred.radius(k)).toBe(sim.ball.radius);
      }
    });
  }
});
