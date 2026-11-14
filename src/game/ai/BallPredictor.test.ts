import { describe, expect, it } from 'vitest';
import { PITCH } from '../../config/gameConfig';
import { EMPTY_INPUT } from '../../input/InputState';
import { Ball } from '../entities/Ball';
import { PLAYER_STAND_OFFSET } from '../entities/Player';
import { GameSim } from '../GameSim';
import { BallPredictor } from './BallPredictor';
import { observe } from './worldView';

const IDLE = [EMPTY_INPUT, EMPTY_INPUT] as const;
const NO_SUPER = new Ball();
const STEPS = 90;

/** Bir adımda topun alabileceği yoldan büyük güvenlik payı (px). */
const MARGIN = 40;

/** Top bir oyuncunun herhangi bir parçasına temas edebilecek kadar yakın mı? */
function nearPlayer(sim: GameSim): boolean {
  const b = sim.ball;
  return sim.players.some((p) =>
    (['head', 'body', 'foot'] as const).some((part) => {
      const c = p.partCircle(part);
      return Math.hypot(b.x - c.x, b.y - c.y) < b.radius + c.radius + MARGIN;
    }),
  );
}

/** GameSim'i adım adım ilerletip tahminle karşılaştırır; karşılaştırılan adım sayısını döndürür. */
function compare(sim: GameSim, pred: BallPredictor): number {
  let k = 0;
  for (; k < STEPS && !nearPlayer(sim); k++) {
    sim.step(IDLE);
    expect(pred.x(k + 1)).toBe(sim.ball.x);
    expect(pred.y(k + 1)).toBe(sim.ball.y);
    expect(pred.vx(k + 1)).toBe(sim.ball.vx);
    expect(pred.vy(k + 1)).toBe(sim.ball.vy);
  }
  return k;
}

function launch(sim: GameSim, x: number, y: number, vx: number, vy: number, spin: number): void {
  sim.ball.resetTo(x, y);
  sim.ball.vx = vx;
  sim.ball.vy = vy;
  sim.ball.angVel = spin;
}

describe('BallPredictor (hayalet dünya)', () => {
  it('oyuncular dokunmadıkça GameSim ile bit bit aynı: duvar ve tavan sekmeleri, falso', () => {
    const sim = new GameSim({ skipKickoff: true });
    const standY = PITCH.groundY - PLAYER_STAND_OFFSET;
    sim.players[0].resetTo(150, standY);
    sim.players[1].resetTo(500, standY);
    launch(sim, 800, 200, 1700, -900, 14);
    const pred = new BallPredictor(STEPS);
    pred.predict(observe(sim).ball, STEPS);
    const compared = compare(sim, pred);
    expect(compared).toBeGreaterThan(40);
    // Karşılaştırılan aralıkta top duvara çarpıp geri döndü.
    expect(Math.min(...Array.from({ length: compared }, (_, k) => pred.vx(k)))).toBeLessThan(0);
  });

  it('üst direğe düşen ve üstünde seken top da birebir aynı', () => {
    const sim = new GameSim({ skipKickoff: true });
    const standY = PITCH.groundY - PLAYER_STAND_OFFSET;
    sim.players[0].resetTo(300, standY);
    sim.players[1].resetTo(500, standY);
    const goal = sim.pitch.goals[1];
    launch(sim, goal.crossbar.minX + 40, goal.crossbar.minY - 200, -60, 0, 0);
    const pred = new BallPredictor(STEPS);
    pred.predict(observe(sim).ball, STEPS);
    expect(compare(sim, pred)).toBe(STEPS);
    // Top karşılaştırılan aralıkta üst direğin üstünden sekti (düşerken yukarı döndü).
    const bounced = Array.from({ length: STEPS }, (_, k) => k + 1).some(
      (k) =>
        pred.vy(k - 1) > 0 &&
        pred.vy(k) < 0 &&
        pred.y(k) < goal.crossbar.minY &&
        pred.x(k) > goal.crossbar.minX,
    );
    expect(bounced).toBe(true);
  });

  it('kaleye giren topun giriş adımını bulur; diğer kale için −1', () => {
    const sim = new GameSim({ skipKickoff: true });
    const pred = new BallPredictor(STEPS);
    pred.predict(
      { x: 300, y: 560, vx: -900, vy: 0, angVel: 0, crossbarTimer: 0, super: NO_SUPER },
      STEPS,
    );
    const entry = pred.goalEntry(sim.pitch.goals[0]);
    expect(entry).toBeGreaterThan(0);
    expect(pred.x(entry) + sim.ball.radius).toBeLessThanOrEqual(sim.pitch.goals[0].lineX);
    expect(pred.x(entry - 1) + sim.ball.radius).toBeGreaterThan(sim.pitch.goals[0].lineX);
    expect(pred.goalEntry(sim.pitch.goals[1])).toBe(-1);
  });

  it('aralık dışı indeksler uca kırpılır; uzunluk ufuk + 1', () => {
    const pred = new BallPredictor(10);
    pred.predict(
      { x: 640, y: 300, vx: 100, vy: 0, angVel: 0, crossbarTimer: 0, super: NO_SUPER },
      50,
    );
    expect(pred.length).toBe(11);
    expect(pred.x(-5)).toBe(640);
    expect(pred.x(999)).toBe(pred.x(10));
  });
});
