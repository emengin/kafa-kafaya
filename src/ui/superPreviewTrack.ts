import { BALL, KICK, LOOP, PLAYER, SELECT, type SuperType } from '../config/gameConfig';
import { loadoutFor, NEUTRAL_LOADOUT, type CharacterId } from '../game/characters';
import { footOffset, PLAYER_STAND_OFFSET } from '../game/entities/Player';
import { GameSim } from '../game/GameSim';
import { EMPTY_INPUT, type InputState } from '../input/InputState';

/** Kaydın bir adımı: top (+ yanılsamalar) ve şutu çeken oyuncunun kafası. */
export interface PreviewFrame {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly visible: boolean;
  readonly superType: SuperType | null;
  readonly decoys: readonly { x: number; y: number }[];
  readonly px: number;
  readonly py: number;
  readonly pr: number;
}

export interface PreviewTrack {
  readonly frames: readonly PreviewFrame[];
  readonly goal: { lineX: number; top: number; groundY: number; wallX: number };
}

const cache = new Map<CharacterId, PreviewTrack>();
const input = (p: Partial<InputState>): InputState => ({ ...EMPTY_INPUT, ...p });

/**
 * Karakterin süperli şutunu gerçek simülasyonda (rakipsiz, balonsuz, sabit tohum) bir kez oynatıp
 * kaydeder: dolu bar → Süper → ayağın önündeki topa durarak şut. Önizleme bu yüzden oyundaki
 * davranışın birebir aynısıdır (Işınlanmanın kaybolması, Serap yanılsamaları, Dev Top…).
 * Karakter başına bir kez hesaplanır (~110 adım) ve önbelleğe alınır.
 */
export function recordSuperPreview(id: CharacterId): PreviewTrack {
  const hit = cache.get(id);
  if (hit) return hit;
  const sim = new GameSim({
    skipKickoff: true,
    powerUps: false,
    solo: true,
    seed: PREVIEW_SEED,
    loadouts: [loadoutFor(id), NEUTRAL_LOADOUT],
  });
  const p1 = sim.players[0];
  const groundY = sim.pitch.groundY;
  p1.resetTo(START_X, groundY - PLAYER_STAND_OFFSET);
  // Top ayağın hemen önünde (GameSim testlerindeki durağan şut düzeneği).
  const o = footOffset(KICK.restAngle, 1);
  const touch = BALL.radius + PLAYER.foot.radius + 1;
  sim.ball.resetTo(p1.x + o.x + Math.sqrt(touch * touch - BALL_DY * BALL_DY), p1.y + o.y + BALL_DY);
  sim.fillPower(0);
  sim.step([input({ super: true }), EMPTY_INPUT]);
  sim.step([input({ kick: true }), EMPTY_INPUT]);
  const frames: PreviewFrame[] = [];
  const steps = Math.round(SELECT.preview.recordSeconds * LOOP.stepHz);
  for (let i = 0; i < steps; i++) {
    const b = sim.ball;
    frames.push({
      x: b.x,
      y: b.y,
      r: b.radius,
      visible: !b.phased,
      superType: b.superType,
      decoys: sim.decoys.map((d) => ({ x: d.ball.x, y: d.ball.y })),
      px: p1.x,
      py: p1.y,
      pr: p1.headRadius,
    });
    sim.step([EMPTY_INPUT, EMPTY_INPUT]);
  }
  const g = sim.pitch.goals[1];
  const track: PreviewTrack = {
    frames,
    goal: { lineX: g.lineX, top: g.crossbar.minY, groundY, wallX: sim.pitch.width },
  };
  cache.set(id, track);
  return track;
}

const PREVIEW_SEED = 7;
const START_X = 330;
const BALL_DY = -9;
