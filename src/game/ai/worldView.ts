import type { KickPhase } from '../entities/Player';
import type { GameSim } from '../GameSim';
import type { MatchPhase } from '../rules/MatchFlow';

/**
 * Yapay zekânın gördüğü dünya: ekranda bir insanın da görebileceği bilgilerin **kopyası**.
 * AI simülasyona hiç dokunmaz; yalnızca bu düz veriyi okuyup bir `InputState` üretir.
 * (Topun dönüşü ekranda görünür, bu yüzden açısal hız da dahildir.)
 */
export interface BallView {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly angVel: number;
  readonly crossbarTimer: number;
}

export interface PlayerView {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly grounded: boolean;
  readonly kickPhase: KickPhase;
  readonly power: number;
  readonly superArmed: boolean;
}

export interface WorldView {
  readonly tick: number;
  readonly phase: MatchPhase;
  readonly ball: BallView;
  readonly players: readonly [PlayerView, PlayerView];
}

function viewPlayer(sim: GameSim, index: 0 | 1): PlayerView {
  const p = sim.players[index];
  return {
    x: p.x,
    y: p.y,
    vx: p.vx,
    vy: p.vy,
    grounded: p.grounded,
    kickPhase: p.kickPhase,
    power: p.power,
    superArmed: p.superArmed,
  };
}

/** Simülasyonun o anki durumundan AI'a verilecek salt-okunur kopyayı üretir. */
export function observe(sim: GameSim): WorldView {
  const b = sim.ball;
  return {
    tick: sim.tick,
    phase: sim.match.phase,
    ball: { x: b.x, y: b.y, vx: b.vx, vy: b.vy, angVel: b.angVel, crossbarTimer: b.crossbarTimer },
    players: [viewPlayer(sim, 0), viewPlayer(sim, 1)],
  };
}
