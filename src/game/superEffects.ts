import { BALL, DISPLAY, PITCH, SUPER, SUPER_SHOTS, type SuperType } from '../config/gameConfig';
import { clamp, moveToward, type BallisticParams, type Material } from '../physics';
import type { BallSuperState } from './entities/Ball';
import type { Facing, PlayerIndex } from './types';

/**
 * Süper şutların topa etkisi. Top–saha fiziği gibi bu kod da GameSim ile yapay zekânın yörünge
 * tahmincisi arasında **ortaktır**: süper bir top, oyunculara değmediği sürece tahminde de
 * gerçekte de birebir aynı yolu izler (yerçekimsiz Ateş Topu, Zikzak dalgası, Mıknatıs çekimi,
 * Işınlanma, Dev Top büyümesi, Gökkuşağı yayı).
 *
 * Oyuncuya değince oluşan etkiler (donma, geri savrulma, itme, zıplama kilidi, yanılsamalar)
 * yalnızca GameSim'dedir.
 */

export const SUPER_TYPES: readonly SuperType[] = [
  'fire',
  'ice',
  'zigzag',
  'teleport',
  'giant',
  'tornado',
  'rainbow',
  'magnet',
  'mirage',
  'quake',
];

/** Süper etkisi altında ivme ve konum güncellemesi gereken top (Ball ve tahminci kopyası). */
export interface SuperBall extends BallSuperState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angVel: number;
  readonly radius: number;
  clearSuper(): void;
}

const NO_GRAVITY: BallisticParams = { ...BALL, gravity: 0 };
/** Gökkuşağı: hava direnci ve falso kapalı (yay hesaplandığı gibi insin). */
const PURE_BALLISTIC: BallisticParams = { ...BALL, linearDrag: 0, quadraticDrag: 0, magnus: 0 };
const QUAKE_GROUND: Material = {
  restitution: SUPER_SHOTS.quake.groundRestitution,
  friction: SUPER_SHOTS.quake.groundFriction,
};

const W = DISPLAY.width;
const GOAL_DEPTH = PITCH.goal.depth;
const TWO_PI = Math.PI * 2;
const GIANT_GROW_RATE = (SUPER_SHOTS.giant.radiusScale - 1) / SUPER_SHOTS.giant.growSeconds;

/** `owner`'ın hücum ettiği (rakip) kalenin çizgisi. */
export function attackLineX(owner: PlayerIndex): number {
  return owner === 0 ? W - GOAL_DEPTH : GOAL_DEPTH;
}

/** Topun bu andaki entegrasyon değerleri (yerçekimi, hava direnci). */
export function ballisticParamsFor(ball: BallSuperState): BallisticParams {
  switch (ball.superType) {
    case 'fire':
    case 'zigzag':
      return NO_GRAVITY;
    case 'rainbow':
      return PURE_BALLISTIC;
    default:
      return BALL;
  }
}

/** Alt adım başında süper ivmeleri (Zikzak dalgası, Mıknatıs çekimi) hıza ekler. */
export function applySuperForces(ball: SuperBall, h: number): void {
  switch (ball.superType) {
    case 'zigzag': {
      // y = −A·(1 − cos ωt) → ÿ = −A·ω²·cos ωt: top önce yükselir, sonra çıkış yüksekliğine iner.
      const z = SUPER_SHOTS.zigzag;
      const w = TWO_PI * z.frequencyHz;
      ball.vy += -z.amplitudePx * w * w * Math.cos(w * ball.superTime) * h;
      break;
    }
    case 'magnet': {
      const owner = ball.superOwner;
      if (owner === -1) break;
      const tx = attackLineX(owner);
      const ty = PITCH.groundY - PITCH.goal.mouthHeight / 2;
      const dx = tx - ball.x;
      const dy = ty - ball.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 1) break;
      const a = SUPER_SHOTS.magnet.steerAccel * h;
      ball.vx += (dx / d) * a;
      ball.vy += (dy / d) * a;
      break;
    }
    default:
      break;
  }
}

/** Alt adım sonunda: süre, Işınlanma evreleri, Dev Top yarıçapı ve etkinin bitişi. */
export function advanceSuperEffect(ball: SuperBall, h: number): void {
  const targetScale = ball.superType === 'giant' ? SUPER_SHOTS.giant.radiusScale : 1;
  if (ball.radiusScale !== targetScale) {
    ball.radiusScale = moveToward(ball.radiusScale, targetScale, GIANT_GROW_RATE * h);
  }
  const type = ball.superType;
  if (type === null) return;
  ball.superTime += h;
  if (type === 'teleport') advanceTeleport(ball);
  if (ball.superType !== null && ball.superTime >= SUPER_SHOTS[type].duration) ball.clearSuper();
}

function advanceTeleport(ball: SuperBall): void {
  const tp = SUPER_SHOTS.teleport;
  const owner = ball.superOwner;
  if (owner === -1 || ball.phaseDone) return;
  // Rakip kale çizgisine kalan yol (atış yönünde).
  const remaining = (attackLineX(owner) - ball.x) * ball.superDir;
  if (!ball.phased) {
    if (ball.superTime < tp.phaseStartSeconds) return;
    if (remaining > tp.exitBeforeGoalPx + tp.minPhaseTravelPx) {
      ball.phased = true;
    } else {
      ball.phaseDone = true;
    }
    return;
  }
  const timeUp = ball.superTime >= tp.phaseStartSeconds + tp.phaseMaxSeconds;
  if (timeUp || remaining <= tp.exitBeforeGoalPx) {
    ball.phased = false;
    ball.phaseDone = true;
    ball.vx *= tp.exitSpeedScale;
    ball.vy *= tp.exitSpeedScale;
  }
}

/** Top sahaya (zemin, duvar, tavan, direk) değdi: sekmeyle biten süperler sona erer. */
export function onSuperBallHitPitch(ball: SuperBall): void {
  const type = ball.superType;
  if (type === null || !SUPER_SHOTS[type].endsOnBounce) return;
  if (ball.superTime < SUPER.bounceGraceSeconds) return;
  ball.clearSuper();
}

/** Süper topun zeminle teması için malzeme (Sarsıntı: sekerek ilerleyen top); yoksa null. */
export function superGroundMaterial(ball: BallSuperState): Material | null {
  return ball.superType === 'quake' ? QUAKE_GROUND : null;
}

/** Süper şutun hız ve yükselme çarpanları (şut formülünde kullanılır). */
export function superKickScales(type: SuperType): {
  readonly speed: number;
  readonly elevation: number;
} {
  const s = SUPER_SHOTS[type];
  return { speed: s.speedMultiplier, elevation: s.elevationScale };
}

/**
 * Süperi topa yükler: etki durumu kurulur ve tipe göre hız yeniden biçimlenir (Gökkuşağı yayı,
 * Sarsıntı'nın alçak açısı). Şut formülü (`computeKick`) hız ve açı çarpanlarını zaten uyguladı.
 * Serap'ın yanılsamaları GameSim'dedir.
 */
export function launchSuper(
  ball: SuperBall,
  type: SuperType,
  owner: PlayerIndex,
  dir: Facing,
): void {
  ball.superType = type;
  ball.superOwner = owner;
  ball.superTime = 0;
  ball.superDir = dir;
  ball.phased = false;
  ball.phaseDone = false;
  if (type === 'rainbow') aimRainbow(ball, owner);
  else if (type === 'quake') aimQuake(ball, dir);
  else if (type === 'fire' || type === 'zigzag') ball.angVel = 0;
}

/** Rakip kale ağzına dik inen yay: tepe noktası tavana yakın, hava direnci kapalı. */
function aimRainbow(ball: SuperBall, owner: PlayerIndex): void {
  const r = SUPER_SHOTS.rainbow;
  const g = BALL.gravity;
  const apexY = r.apexY;
  const targetY = PITCH.groundY - r.targetHeightPx;
  const vy0 = -Math.sqrt(2 * g * Math.max(0, ball.y - apexY));
  const t1 = -vy0 / g;
  const t2 = Math.sqrt((2 * Math.max(0, targetY - apexY)) / g);
  const flight = t1 + t2;
  const dir = owner === 0 ? 1 : -1;
  const dx = attackLineX(owner) - dir * r.targetInsetPx - ball.x;
  ball.vx = clamp(dx / flight, -r.maxHorizontalSpeed, r.maxHorizontalSpeed);
  ball.vy = vy0;
  ball.angVel = 0;
}

/** Sarsıntı: hız korunur, top sabit alçak açıyla yere doğru gider (sekerek ilerler). */
function aimQuake(ball: SuperBall, dir: Facing): void {
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  const e = SUPER_SHOTS.quake.elevation;
  ball.vx = dir * Math.cos(e) * speed;
  ball.vy = -Math.sin(e) * speed;
}
