import { AI, BALL, LOOP, PITCH, PLAYER } from '../../config/gameConfig';
import type { InputState } from '../../input/InputState';
import { PLAYER_STAND_OFFSET, type Player } from '../entities/Player';
import type { GameSim } from '../GameSim';
import type { PlayerIndex } from '../types';

/**
 * Sıkışma türleri:
 * - `ballFrozen`: top oyun akarken uzun süre aynı yerde (kimse oynamıyor ya da top kilitli).
 * - `playersLocked`: oyuncular yan yana dayanmış, ikisi de ilerleyemiyor.
 * - `playerPinned`: oyuncu bir yöne bastığı hâlde yerinden kıpırdayamıyor (duvar, köşe, top).
 * - `crossbarCamping`: oyuncu kale üst direğinin üstünde kalmış.
 * - `ballCarried`: top bir oyuncunun kafasında uzun süre taşınıyor.
 * - `ballUntouched`: topa uzun süre kimse dokunmuyor (iki taraf da pasif).
 */
export type StuckKind =
  | 'ballFrozen'
  | 'playersLocked'
  | 'playerPinned'
  | 'crossbarCamping'
  | 'ballCarried'
  | 'ballUntouched';

export const STUCK_KINDS: readonly StuckKind[] = [
  'ballFrozen',
  'playersLocked',
  'playerPinned',
  'crossbarCamping',
  'ballCarried',
  'ballUntouched',
];

export interface StuckEvent {
  readonly kind: StuckKind;
  readonly tick: number;
  /** Olayın ilgili olduğu oyuncu (varsa). */
  readonly player: PlayerIndex | null;
  readonly x: number;
  readonly y: number;
}

const STEP = 1 / LOOP.stepHz;
const STAND_Y = PITCH.groundY - PLAYER_STAND_OFFSET;
const HEAD_R = PLAYER.head.radius;
const TOUCH_SLACK = 1;

/** Eşiği aşınca bir kez olay üreten süre sayacı (koşul kalkınca yeniden kurulur). */
class Timer {
  private elapsed = 0;
  private fired = false;

  /** @returns Eşik bu adımda aşıldıysa true (aynı bölümde yalnızca bir kez). */
  update(active: boolean, threshold: number): boolean {
    if (!active) {
      this.reset();
      return false;
    }
    this.elapsed += STEP;
    if (this.fired || this.elapsed < threshold) return false;
    this.fired = true;
    return true;
  }

  reset(): void {
    this.elapsed = 0;
    this.fired = false;
  }
}

/**
 * Simülasyonu dışarıdan izleyen bağımsız sıkışma gözlemcisi (AI'ın kendi kaçış mantığından
 * ayrı). `scripts/simulate.ts` ve testler kullanır. Yalnızca oyun akarken (`playing`,
 * `goldenGoal`) sayar; her sıkışma bölümü bir kez raporlanır.
 */
export class StuckMonitor {
  readonly events: StuckEvent[] = [];
  private readonly frozen = new Timer();
  private readonly locked = new Timer();
  private readonly untouched = new Timer();
  private readonly pinned = [new Timer(), new Timer()] as const;
  private readonly camping = [new Timer(), new Timer()] as const;
  private readonly carried = [new Timer(), new Timer()] as const;
  private readonly pinAnchor = [0, 0];
  private lastTouches = 0;
  private frozenX = 0;
  private frozenY = 0;

  /** Her `sim.step` sonrasında, o adımda kullanılan girdilerle çağrılır. */
  update(sim: GameSim, inputs: readonly [InputState, InputState]): void {
    const m = AI.monitor;
    if (!sim.match.goalsAllowed) {
      this.resetAll(sim);
      return;
    }
    const ball = sim.ball;
    const [a, b] = sim.players;

    const moved = Math.hypot(ball.x - this.frozenX, ball.y - this.frozenY) > m.ballFrozenRadiusPx;
    if (moved) {
      this.frozenX = ball.x;
      this.frozenY = ball.y;
    }
    if (this.frozen.update(!moved, m.ballFrozenSeconds)) this.add('ballFrozen', sim, null);

    const sideBySide =
      Math.abs(a.x - b.x) < HEAD_R * 2 + m.lockedGapPx && Math.abs(a.y - b.y) < HEAD_R;
    const bothSlow = Math.abs(a.vx) < m.lockedSpeed && Math.abs(b.vx) < m.lockedSpeed;
    const pushing = isPressing(inputs[0]) || isPressing(inputs[1]);
    if (this.locked.update(sideBySide && bothSlow && pushing, m.lockedSeconds)) {
      this.add('playersLocked', sim, null);
    }

    const touched =
      ball.touches !== this.lastTouches || sim.players.some((p) => touchesBall(p, sim));
    this.lastTouches = ball.touches;
    if (this.untouched.update(!touched, m.untouchedSeconds)) this.add('ballUntouched', sim, null);

    for (const p of sim.players) {
      const i = p.index;
      const pressing = isPressing(inputs[i]);
      const anchor = this.pinAnchor[i] ?? p.x;
      const free = !pressing || Math.abs(p.x - anchor) > m.pinnedTravelPx;
      if (free) this.pinAnchor[i] = p.x;
      if (this.pinned[i].update(!free, m.pinnedSeconds)) this.add('playerPinned', sim, i);

      if (this.camping[i].update(onCrossbar(p, sim), m.crossbarSeconds)) {
        this.add('crossbarCamping', sim, i);
      }
      if (this.carried[i].update(ballOnHead(p, sim), m.carriedSeconds)) {
        this.add('ballCarried', sim, i);
      }
    }
  }

  /** Türlere göre olay sayıları. */
  counts(): Record<StuckKind, number> {
    const out: Record<StuckKind, number> = {
      ballFrozen: 0,
      playersLocked: 0,
      playerPinned: 0,
      crossbarCamping: 0,
      ballCarried: 0,
      ballUntouched: 0,
    };
    for (const e of this.events) out[e.kind]++;
    return out;
  }

  private add(kind: StuckKind, sim: GameSim, player: PlayerIndex | null): void {
    const at = player === null ? sim.ball : sim.players[player];
    this.events.push({ kind, tick: sim.tick, player, x: at.x, y: at.y });
  }

  private resetAll(sim: GameSim): void {
    for (const t of [this.frozen, this.locked, this.untouched]) t.reset();
    for (const group of [this.pinned, this.camping, this.carried]) {
      for (const t of group) t.reset();
    }
    this.frozenX = sim.ball.x;
    this.frozenY = sim.ball.y;
    this.lastTouches = sim.ball.touches;
    this.pinAnchor[0] = sim.players[0].x;
    this.pinAnchor[1] = sim.players[1].x;
  }
}

function isPressing(input: InputState): boolean {
  return input.left !== input.right;
}

function touchesBall(p: Player, sim: GameSim): boolean {
  const ball = sim.ball;
  for (const part of ['head', 'body', 'foot'] as const) {
    const c = p.partCircle(part);
    if (Math.hypot(ball.x - c.x, ball.y - c.y) <= ball.radius + c.radius + TOUCH_SLACK) return true;
  }
  return false;
}

/** Oyuncu bir kalenin üst direğinin üstünde mi duruyor? */
function onCrossbar(p: Player, sim: GameSim): boolean {
  if (!p.grounded || p.y >= STAND_Y - HEAD_R) return false;
  return sim.pitch.goals.some(
    (g) => p.x + HEAD_R > g.crossbar.minX && p.x - HEAD_R < g.crossbar.maxX,
  );
}

/** Top oyuncunun kafasının üstünde, ona dayalı mı? */
function ballOnHead(p: Player, sim: GameSim): boolean {
  const ball = sim.ball;
  if (ball.y >= p.y) return false;
  return Math.hypot(ball.x - p.x, ball.y - p.y) <= HEAD_R + BALL.radius + TOUCH_SLACK;
}
