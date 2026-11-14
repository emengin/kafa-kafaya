import { BALL, MATCH, PHYSICS, PITCH } from '../config/gameConfig';
import {
  circleVsRect,
  circleVsSegment,
  computeSubSteps,
  moveToward,
  resolveContact,
  type Circle,
  type Contact,
} from '../physics';
import type { Ball } from './entities/Ball';
import type { GoalDef, Pitch, StaticCollider } from './pitch';
import { isBallOnCrossbar } from './rules/ballRules';
import { onSuperBallHitPitch, superGroundMaterial } from './superEffects';

/**
 * Topun saha ile etkileşimi. GameSim ve yapay zekânın yörünge tahmincisi (BallPredictor)
 * **aynı** fonksiyonları kullanır; böylece tahmin, oyuncular hesaba katılmadığında gerçek
 * simülasyonla birebir aynıdır (testle doğrulanır).
 */

const GROUND_MIN = PHYSICS.groundNormalMinY;

export function collideStatic(circle: Circle, collider: StaticCollider): Contact | null {
  return collider.type === 'segment'
    ? circleVsSegment(circle, collider.shape)
    : circleVsRect(circle, collider.shape);
}

/**
 * Bir alt adımda top–saha çarpışmaları (üst direkler, zemin, duvarlar, tavan) ve yerde
 * yuvarlanma direnci. Yukarı bakan bir yüzeye değerse `ball.grounded = true`.
 * @returns Top herhangi bir statik yüzeye değdiyse true.
 */
export function collideBallWithPitch(ball: Ball, pitch: Pitch, h: number): boolean {
  let touched = false;
  let onGround = false;
  const superGround = superGroundMaterial(ball);
  for (const collider of pitch.colliders) {
    const contact = collideStatic(ball, collider);
    if (!contact) continue;
    const material = collider.kind === 'ground' && superGround ? superGround : collider.material;
    const { approachSpeed } = resolveContact(
      ball,
      ball.radius,
      null,
      0,
      contact,
      material,
      PHYSICS,
    );
    if (approachSpeed > ball.impactSpeed) {
      // Ses/efekt için en sert çarpmayı kaydet (normal yüzeyden topa bakar).
      ball.impactSpeed = approachSpeed;
      ball.impactKind = collider.kind;
      ball.impactX = ball.x - contact.nx * ball.radius;
      ball.impactY = ball.y - contact.ny * ball.radius;
    }
    touched = true;
    if (contact.ny <= -GROUND_MIN) onGround = true;
  }
  if (touched) onSuperBallHitPitch(ball);
  if (onGround) {
    ball.grounded = true;
    // Yuvarlanma direnci: top yüzeyde sonsuza dek yuvarlanmasın.
    ball.vx = moveToward(ball.vx, 0, BALL.rollingDecel * h);
    ball.angVel = moveToward(ball.angVel, 0, (BALL.rollingDecel / ball.radius) * h);
  }
  return touched;
}

/**
 * Üst direk kuralı: top bir kalenin üst direği üstünde süreden uzun kalırsa sahaya doğru itilir.
 * @returns Top bu adımda itildiyse true.
 */
export function applyCrossbarRest(ball: Ball, pitch: Pitch, dt: number): boolean {
  let zoneGoal: GoalDef | null = null;
  for (const goal of pitch.goals) {
    if (isBallOnCrossbar(ball, goal)) zoneGoal = goal;
  }
  if (!zoneGoal) {
    ball.crossbarTimer = 0;
    return false;
  }
  ball.crossbarTimer += dt;
  if (ball.crossbarTimer <= MATCH.crossbarRestMaxSeconds) return false;
  ball.vx = zoneGoal.fieldDirection * PITCH.goal.pushSpeed;
  ball.vy = -PITCH.goal.popSpeed;
  ball.crossbarTimer = 0;
  return true;
}

/**
 * Yalnızca topun bir sabit adımı (oyuncusuz dünya): GameSim.step'in top kısmıyla aynı sıra —
 * hız sınırı → uyarlamalı alt adımlar (entegrasyon + saha çarpışmaları) → hız sınırı →
 * üst direk kuralı. Oyuncular dururken alt adım sayısı da GameSim ile aynıdır.
 */
export function stepBallAlone(ball: Ball, pitch: Pitch, dt: number): void {
  ball.clampSpeed();
  const n = computeSubSteps(ball.speed, dt, PHYSICS);
  const h = dt / n;
  ball.grounded = false;
  for (let i = 0; i < n; i++) {
    ball.integrate(h);
    collideBallWithPitch(ball, pitch, h);
  }
  ball.clampSpeed();
  applyCrossbarRest(ball, pitch, dt);
}
