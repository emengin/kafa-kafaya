import { describe, expect, it } from 'vitest';
import { AI, LOOP, PITCH, PLAYER } from '../../config/gameConfig';
import { EMPTY_INPUT, type InputState } from '../../input/InputState';
import { PLAYER_STAND_OFFSET } from '../entities/Player';
import { GameSim } from '../GameSim';
import { StuckMonitor } from './StuckMonitor';

type Inputs = readonly [InputState, InputState];
const IDLE: Inputs = [EMPTY_INPUT, EMPTY_INPUT];
const input = (p: Partial<InputState>): InputState => ({ ...EMPTY_INPUT, ...p });
const standY = PITCH.groundY - PLAYER_STAND_OFFSET;

function run(sim: GameSim, mon: StuckMonitor, seconds: number, inputs: Inputs = IDLE): void {
  for (let i = 0; i < Math.round(seconds * LOOP.stepHz); i++) {
    sim.step(inputs);
    mon.update(sim, inputs);
  }
}

/** Uzun maç: süre bitip altın gol/maç sonu araya girmesin. */
const LONG = { skipKickoff: true, rules: { durationSeconds: 1000 } } as const;

describe('StuckMonitor', () => {
  it('kimsenin oynamadığı top: önce "donmuş top", sonra "top unutuldu" — her biri bir kez', () => {
    const sim = new GameSim(LONG);
    sim.players[0].resetTo(200, standY);
    sim.players[1].resetTo(1080, standY);
    sim.ball.resetTo(640, PITCH.groundY - sim.ball.radius);
    const mon = new StuckMonitor();
    run(sim, mon, AI.monitor.ballFrozenSeconds - 0.2);
    expect(mon.events).toHaveLength(0);
    run(sim, mon, AI.monitor.untouchedSeconds);
    expect(mon.counts()).toMatchObject({ ballFrozen: 1, ballUntouched: 1 });
  });

  it('itişip ilerleyemeyen oyuncular: kilitlenme ve iki "sıkışmış oyuncu"', () => {
    const sim = new GameSim(LONG);
    sim.ball.resetTo(640, 100);
    const mon = new StuckMonitor();
    run(sim, mon, AI.monitor.lockedSeconds + 2, [input({ right: true }), input({ left: true })]);
    const c = mon.counts();
    expect(c.playersLocked).toBe(1);
    expect(c.playerPinned).toBe(2);
  });

  it('serbestçe koşan oyuncu sıkışmış sayılmaz', () => {
    const sim = new GameSim(LONG);
    sim.ball.resetTo(640, 100);
    const mon = new StuckMonitor();
    // Sağa sola gidip gelen oyuncu (duvara dayanmadan).
    for (let s = 0; s < 6; s++) {
      run(sim, mon, 0.8, [input({ right: s % 2 === 0 }), EMPTY_INPUT]);
      run(sim, mon, 0.8, [input({ left: s % 2 === 0 }), EMPTY_INPUT]);
    }
    expect(mon.counts().playerPinned).toBe(0);
  });

  it('üst direğin üstünde duran oyuncu: "direkte kamp"', () => {
    const sim = new GameSim(LONG);
    const goal = sim.pitch.goals[0];
    sim.players[0].resetTo(goal.crossbar.maxX / 2, goal.crossbar.minY - PLAYER_STAND_OFFSET);
    sim.ball.resetTo(800, 100);
    const mon = new StuckMonitor();
    run(sim, mon, AI.monitor.crossbarSeconds + 0.5);
    expect(mon.events.filter((e) => e.kind === 'crossbarCamping')).toEqual([
      expect.objectContaining({ player: 0 }),
    ]);
  });

  it('kafanın tam tepesinde dengede duran top: "kafada taşınan top"', () => {
    const sim = new GameSim(LONG);
    const p = sim.players[1];
    sim.ball.resetTo(p.x, p.y - PLAYER.head.radius - sim.ball.radius - 1);
    const mon = new StuckMonitor();
    run(sim, mon, AI.monitor.carriedSeconds + 0.5);
    expect(mon.events.filter((e) => e.kind === 'ballCarried')).toEqual([
      expect.objectContaining({ player: 1 }),
    ]);
  });

  it('santra beklemesinde ve gol kutlamasında saymaz', () => {
    const sim = new GameSim({ rules: { kickoffSeconds: 30 } });
    const mon = new StuckMonitor();
    run(sim, mon, 20, [input({ right: true }), input({ left: true })]);
    expect(mon.events).toHaveLength(0);
  });
});
