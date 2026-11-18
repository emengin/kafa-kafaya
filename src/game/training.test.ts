import { describe, expect, it } from 'vitest';
import { BALL, LOOP, PLAYER } from '../config/gameConfig';
import { EMPTY_INPUT, type InputState } from '../input/InputState';
import { PLAYER_STAND_OFFSET } from './entities/Player';
import { GameSim } from './GameSim';

const input = (p: Partial<InputState>): InputState => ({ ...EMPTY_INPUT, ...p });
const IDLE = [EMPTY_INPUT, EMPTY_INPUT] as const;

function stepN(sim: GameSim, n: number, inputs: readonly [InputState, InputState] = IDLE): void {
  for (let i = 0; i < n; i++) sim.step(inputs);
}

describe('Antrenman (Faz 6)', () => {
  it('süresiz kurallarla saat hiç bitmez, maç sonu olmaz', () => {
    const sim = new GameSim({
      rules: { durationSeconds: Infinity, goldenGoalOvertime: false },
      skipKickoff: true,
      solo: true,
    });
    stepN(sim, LOOP.stepHz * 200);
    expect(sim.match.phase).not.toBe('matchEnd');
    expect(sim.match.timeLeft).toBe(Infinity);
  });

  it("rakipsizde top P2'nin içinden geçer, P2 girdiyi yok sayar ve P1 ona çarpmaz", () => {
    const sim = new GameSim({ skipKickoff: true, solo: true, powerUps: false });
    const p2 = sim.players[1];
    const startX = p2.x;
    // Top P2'nin kafasının üstünden düşer: rakipsizde içinden geçip yere iner.
    sim.ball.resetTo(p2.x, p2.y - p2.headRadius - BALL.radius - 40);
    stepN(sim, LOOP.stepHz, [EMPTY_INPUT, input({ left: true, jump: true })]);
    expect(sim.ball.y).toBeGreaterThan(p2.y);
    expect(p2.x).toBe(startX);
    // P1 sağa koşar ve P2'nin olduğu yerden geçer.
    const standY = sim.pitch.groundY - PLAYER_STAND_OFFSET;
    sim.players[0].resetTo(startX - 150, standY);
    sim.ball.resetTo(100, 100);
    stepN(sim, LOOP.stepHz, [input({ right: true }), EMPTY_INPUT]);
    expect(sim.players[0].x).toBeGreaterThan(startX + 50);
  });

  it('kukla rakip geri gelince katıdır: top ona çarpar ama girdi yine yoktur (sahne girdisizdir)', () => {
    const sim = new GameSim({ skipKickoff: true, solo: true, powerUps: false });
    sim.setSolo(false);
    expect(sim.solo).toBe(false);
    const p2 = sim.players[1];
    sim.ball.resetTo(p2.x, p2.y - p2.headRadius - BALL.radius - 40);
    stepN(sim, LOOP.stepHz);
    expect(sim.ball.y).toBeLessThan(p2.y);
    // setSolo P2'yi başlangıç noktasına alır.
    p2.resetTo(500, p2.y);
    sim.setSolo(true);
    expect(p2.x).toBeCloseTo(sim.pitch.width - sim.pitch.width * PLAYER.spawnXRatio, 9);
  });

  it('topu sıfırla: top santranın üstüne gelir, süper etkisi ve hız silinir; bar doldur', () => {
    const sim = new GameSim({ skipKickoff: true, solo: true });
    sim.ball.resetTo(200, 500);
    sim.ball.vx = 900;
    sim.ball.superType = 'fire';
    sim.resetBall();
    expect(sim.ball.x).toBe(sim.pitch.width / 2);
    expect(sim.ball.y).toBe(BALL.kickoffY);
    expect(sim.ball.vx).toBe(0);
    expect(sim.ball.superType).toBeNull();
    expect(sim.players[0].power).toBe(0);
    sim.fillPower(0);
    expect(sim.players[0].power).toBe(1);
    sim.step([input({ super: true }), EMPTY_INPUT]);
    expect(sim.players[0].superArmed).toBe(true);
  });

  it('rakipsiz değilken (maç modları) davranış değişmez: varsayılan solo kapalı', () => {
    expect(new GameSim().solo).toBe(false);
  });
});
