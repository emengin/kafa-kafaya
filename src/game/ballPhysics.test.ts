import { describe, expect, it } from 'vitest';
import { LOOP, MATCH, PITCH } from '../config/gameConfig';
import { EMPTY_INPUT } from '../input/InputState';
import { stepBallAlone } from './ballPhysics';
import { Ball } from './entities/Ball';
import { PLAYER_STAND_OFFSET } from './entities/Player';
import { GameSim, STEP_SECONDS } from './GameSim';
import { createPitch } from './pitch';

const IDLE = [EMPTY_INPUT, EMPTY_INPUT] as const;

describe('Top–saha kuralları', () => {
  it('üst direğin ön köşesinde dengede duran top da 2 sn sonra sahaya itilir', () => {
    for (const side of [0, 1] as const) {
      const sim = new GameSim({ skipKickoff: true });
      const standY = PITCH.groundY - PLAYER_STAND_OFFSET;
      sim.players[0].resetTo(500, standY);
      sim.players[1].resetTo(780, standY);
      const goal = sim.pitch.goals[side];
      // Merkez direğin ön kenarının 2 px önünde, köşenin hemen üstünde.
      const frontX = side === 0 ? goal.crossbar.maxX : goal.crossbar.minX;
      const x = frontX + goal.fieldDirection * 2;
      sim.ball.resetTo(x, goal.crossbar.minY - Math.sqrt(sim.ball.radius ** 2 - 4));
      let pushed = false;
      const steps = Math.round((MATCH.crossbarRestMaxSeconds + 0.5) * LOOP.stepHz);
      for (let i = 0; i < steps && !pushed; i++) {
        pushed = sim.step(IDLE).some((e) => e.type === 'crossbarPush');
      }
      expect(pushed).toBe(true);
      expect(Math.sign(sim.ball.vx)).toBe(goal.fieldDirection);
    }
  });

  it('stepBallAlone: zeminde bırakılan top seker ve durulur (oyuncusuz dünya)', () => {
    const pitch = createPitch();
    const ball = new Ball();
    ball.resetTo(640, 300);
    for (let i = 0; i < LOOP.stepHz * 4; i++) stepBallAlone(ball, pitch, STEP_SECONDS);
    expect(ball.y).toBeCloseTo(PITCH.groundY - ball.radius, 0);
    expect(Math.abs(ball.vy)).toBeLessThan(1);
  });
});
