import { describe, expect, it } from 'vitest';
import { KICK, LOOP, MATCH, PLAYER, POWER, SUPER } from '../config/gameConfig';
import { EMPTY_INPUT, type InputState } from '../input/InputState';
import { footOffset, PLAYER_STAND_OFFSET } from './entities/Player';
import { GameSim } from './GameSim';
import type { SimEvent } from './types';

const IN_PLAY = { skipKickoff: true } as const;
const IDLE = [EMPTY_INPUT, EMPTY_INPUT] as const;
const input = (p: Partial<InputState>): InputState => ({ ...EMPTY_INPUT, ...p });
const secondsToSteps = (s: number): number => Math.round(s * LOOP.stepHz);

function stepN(
  sim: GameSim,
  n: number,
  inputs: readonly [InputState, InputState] = IDLE,
): SimEvent[] {
  const out: SimEvent[] = [];
  for (let i = 0; i < n; i++) out.push(...sim.step(inputs));
  return out;
}

function isolate(sim: GameSim): void {
  const standY = sim.pitch.groundY - PLAYER_STAND_OFFSET;
  sim.players[0].resetTo(300, standY);
  sim.players[1].resetTo(980, standY);
}

/** Topu P1'in dinlenen ayağının hemen önüne koyar (GameSim.test'teki durağan şut düzeneği). */
function ballAtFoot(sim: GameSim): void {
  const p1 = sim.players[0];
  const o = footOffset(KICK.restAngle, 1);
  const touch = sim.ball.radius + PLAYER.foot.radius + 1;
  const dy = -9;
  sim.ball.resetTo(p1.x + o.x + Math.sqrt(touch * touch - dy * dy), p1.y + o.y + dy);
}

describe('Güç barı', () => {
  it('oyun akarken zamanla dolar; santra beklemesinde dolmaz', () => {
    const waiting = new GameSim();
    stepN(waiting, secondsToSteps(MATCH.kickoffSeconds) - 2);
    expect(waiting.players[0].power).toBe(0);

    const sim = new GameSim(IN_PLAY);
    isolate(sim);
    sim.ball.resetTo(640, 100);
    stepN(sim, LOOP.stepHz);
    expect(sim.players[0].power).toBeCloseTo(POWER.chargePerSecond, 6);
    expect(sim.players[1].power).toBeCloseTo(POWER.chargePerSecond, 6);
  });

  it('topa dokunuş barı doldurur; aynı oyuncunun art arda dokunuşları bekleme süresiyle sınırlı', () => {
    const sim = new GameSim(IN_PLAY);
    isolate(sim);
    ballAtFoot(sim);
    sim.step([input({ kick: true }), EMPTY_INPUT]);
    const afterKick = sim.players[0].power;
    expect(afterKick).toBeGreaterThanOrEqual(POWER.chargePerTouch);
    // Bekleme süresi içinde bir dokunuş daha: yalnızca pasif dolum eklenir.
    sim.ball.resetTo(sim.players[0].x + PLAYER.head.radius + sim.ball.radius - 1, sim.players[0].y);
    sim.ball.vx = -300;
    sim.step(IDLE);
    expect(sim.players[0].power - afterKick).toBeLessThan(POWER.chargePerTouch / 2);
  });

  it("bar 1'de sınırlanır; doluyken Süper hazırlanır, bar boşalır ve olay üretilir", () => {
    const sim = new GameSim(IN_PLAY);
    isolate(sim);
    sim.ball.resetTo(640, 100);
    const p1 = sim.players[0];
    p1.power = 0.99;
    expect(stepN(sim, 1, [input({ super: true }), EMPTY_INPUT])).not.toContainEqual({
      type: 'superArmed',
      player: 0,
    });
    expect(p1.superArmed).toBe(false);

    p1.addPower(5);
    expect(p1.power).toBe(1);
    // Tuş basılı tutuluyordu: yeniden basılmalı (kenar tetikleme).
    stepN(sim, 1, [input({ super: true }), EMPTY_INPUT]);
    expect(p1.superArmed).toBe(false);
    stepN(sim, 1);
    const events = stepN(sim, 1, [input({ super: true }), EMPTY_INPUT]);
    expect(events).toContainEqual({ type: 'superArmed', player: 0 });
    expect(p1.superArmed).toBe(true);
    expect(p1.power).toBe(0);
    // Süper hazırken bar dolmaz.
    stepN(sim, LOOP.stepHz);
    expect(p1.power).toBe(0);
  });

  it("güç ve süper durumu snapshot'a girer, santrada korunur", () => {
    const sim = new GameSim(IN_PLAY);
    sim.players[1].power = 0.4;
    sim.players[0].superArmed = true;
    const snap = sim.snapshot();
    expect(snap.players[1].power).toBe(0.4);
    expect(snap.players[0].superArmed).toBe(true);
    sim.resetPositions();
    expect(sim.players[1].power).toBe(0.4);
    expect(sim.players[0].superArmed).toBe(true);
  });
});

describe('Süper vuruş', () => {
  const kickWith = (armed: boolean): { vx: number; vy: number; events: SimEvent[] } => {
    const sim = new GameSim(IN_PLAY);
    isolate(sim);
    ballAtFoot(sim);
    sim.players[0].superArmed = armed;
    const events = sim.step([input({ kick: true }), EMPTY_INPUT]);
    return { vx: sim.ball.vx, vy: sim.ball.vy, events };
  };

  it('süper şut normal şuttan çok daha hızlı ve daha düzdür; tek kullanımlıktır', () => {
    const normal = kickWith(false);
    const sup = kickWith(true);
    const speed = (v: { vx: number; vy: number }): number => Math.hypot(v.vx, v.vy);
    expect(speed(sup)).toBeGreaterThan(speed(normal) * (1 + (SUPER.kickSpeedMultiplier - 1) * 0.8));
    expect(Math.abs(sup.vy / sup.vx)).toBeLessThan(Math.abs(normal.vy / normal.vx));
    expect(sup.events).toContainEqual(expect.objectContaining({ type: 'kick', super: true }));
    expect(normal.events).toContainEqual(expect.objectContaining({ type: 'kick', super: false }));
  });

  it('süper hazırken yapılan ilk vuruştan sonra süper biter', () => {
    const sim = new GameSim(IN_PLAY);
    isolate(sim);
    ballAtFoot(sim);
    sim.players[0].superArmed = true;
    sim.step([input({ kick: true }), EMPTY_INPUT]);
    expect(sim.players[0].superArmed).toBe(false);
  });

  it('süper kafa topu en az headerMinSpeed hızla gönderir', () => {
    /** İlk kafa vuruşu anında topun hızı (olaydaki değer). */
    const header = (armed: boolean): { speed: number; isSuper: boolean } => {
      const sim = new GameSim(IN_PLAY);
      isolate(sim);
      const p1 = sim.players[0];
      p1.superArmed = armed;
      sim.ball.resetTo(p1.x + 4, p1.y - PLAYER.head.radius - sim.ball.radius - 50);
      const events = stepN(sim, 10, [input({ jump: true }), EMPTY_INPUT]);
      const hit = events.find((e) => e.type === 'header');
      if (hit?.type !== 'header') throw new Error('kafa vuruşu olmadı');
      return { speed: hit.speed, isSuper: hit.super };
    };
    const sup = header(true);
    const normal = header(false);
    expect(sup.isSuper).toBe(true);
    expect(normal.isSuper).toBe(false);
    expect(sup.speed).toBeGreaterThanOrEqual(SUPER.headerMinSpeed - 1e-6);
    expect(sup.speed).toBeGreaterThan(normal.speed);
  });
});
