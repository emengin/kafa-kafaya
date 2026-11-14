import type { SuperType } from '../../config/gameConfig';
import type { PlayerParams } from '../characters';
import type { BallSuperState } from '../entities/Ball';
import type { KickPhase } from '../entities/Player';
import type { GameSim } from '../GameSim';
import type { Balloon } from '../powerups';
import type { MatchPhase } from '../rules/MatchFlow';

/**
 * Yapay zekânın gördüğü dünya: ekranda bir insanın da görebileceği bilgilerin **kopyası**.
 * AI simülasyona hiç dokunmaz; yalnızca bu düz veriyi okuyup bir `InputState` üretir.
 * (Topun dönüşü ekranda görünür, bu yüzden açısal hız da dahildir. Süper etkiler, karakterlerin
 * seçim ekranında görünen istatistikleri, güçlendirici ikonları ve balon da görünür bilgidir.)
 */
export interface BallView {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly angVel: number;
  readonly crossbarTimer: number;
  /** Süper etki (alev, buz, büyüme…) ekranda görünür. */
  readonly super: Readonly<BallSuperState>;
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
  /** Karakterin fizik değerleri (seçim ekranındaki istatistiklerden) ve süper tipi. */
  readonly params: PlayerParams;
  readonly superType: SuperType;
  /** Güçlendirici çarpanları ve durumlar (HUD ikonları ve oyuncunun görünüşünden). */
  readonly headScale: number;
  readonly speedScale: number;
  readonly doubleJumpEnabled: boolean;
  readonly airJumpUsed: boolean;
  readonly frozenTimer: number;
  readonly jumpLockTimer: number;
}

/** Serap yanılsaması (ekranda gerçek toptan ayırt edilemez). */
export interface DecoyView {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
}

export interface WorldView {
  readonly tick: number;
  readonly phase: MatchPhase;
  readonly ball: BallView;
  readonly players: readonly [PlayerView, PlayerView];
  /** [sol kale, sağ kale] ağız yüksekliği (Rakip Kalesini Büyüt). */
  readonly goalMouths: readonly [number, number];
  readonly balloon: Readonly<Balloon> | null;
  readonly decoys: readonly DecoyView[];
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
    params: p.params,
    superType: p.loadout.superType,
    headScale: p.headScale,
    speedScale: p.speedScale,
    doubleJumpEnabled: p.doubleJumpEnabled,
    airJumpUsed: p.airJumpUsed,
    frozenTimer: p.frozenTimer,
    jumpLockTimer: p.jumpLockTimer,
  };
}

/** Simülasyonun o anki durumundan AI'a verilecek salt-okunur kopyayı üretir. */
export function observe(sim: GameSim): WorldView {
  const b = sim.ball;
  return {
    tick: sim.tick,
    phase: sim.match.phase,
    ball: {
      x: b.x,
      y: b.y,
      vx: b.vx,
      vy: b.vy,
      angVel: b.angVel,
      crossbarTimer: b.crossbarTimer,
      super: {
        superType: b.superType,
        superOwner: b.superOwner,
        superTime: b.superTime,
        superDir: b.superDir,
        phased: b.phased,
        phaseDone: b.phaseDone,
        radiusScale: b.radiusScale,
      },
    },
    players: [viewPlayer(sim, 0), viewPlayer(sim, 1)],
    goalMouths: [sim.pitch.goals[0].mouthHeight, sim.pitch.goals[1].mouthHeight],
    balloon: sim.balloon ? { ...sim.balloon } : null,
    decoys: sim.decoys.map((d) => ({ x: d.ball.x, y: d.ball.y, vx: d.ball.vx, vy: d.ball.vy })),
  };
}
