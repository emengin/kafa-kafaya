import { BALL } from '../../config/gameConfig';
import {
  clamp,
  integrateBallistic,
  type BallisticBody,
  type Circle,
  type ContactBody,
} from '../../physics';
import type { PlayerIndex } from '../types';

/** Top durumu. Kendisi bir `Circle` olarak da çarpışma testlerine verilir. */
export class Ball implements ContactBody, BallisticBody, Circle {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  angle = 0;
  angVel = 0;
  readonly radius = BALL.radius;
  readonly invMass = 1 / BALL.mass;
  readonly invInertia = 1 / (BALL.inertiaFactor * BALL.mass * BALL.radius * BALL.radius);

  /** Bu adımda yukarı bakan bir yüzeye (zemin, üst direk) değdi mi? */
  grounded = false;
  /** Üst direk bekleme bölgesinde geçen kesintisiz süre (sn). */
  crossbarTimer = 0;
  /** Topa son dokunan oyuncu (güçlendiriciler için); −1 = henüz kimse. */
  lastTouch: PlayerIndex | -1 = -1;
  /**
   * Oyuncu–top temaslarının toplam sayısı (şut, kafa, gövde/ayak teması). Yalnızca artar;
   * fiziği etkilemez — istatistik ve sıkışma gözlemcisi içindir.
   */
  touches = 0;

  resetTo(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.angVel = 0;
    this.grounded = false;
    this.crossbarTimer = 0;
    this.lastTouch = -1;
  }

  integrate(h: number): void {
    integrateBallistic(this, BALL, h);
  }

  /** Doğrusal ve açısal hızı üst sınırlara kırpar. */
  clampSpeed(): void {
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > BALL.maxSpeed) {
      const k = BALL.maxSpeed / speed;
      this.vx *= k;
      this.vy *= k;
    }
    this.angVel = clamp(this.angVel, -BALL.maxSpin, BALL.maxSpin);
  }

  get speed(): number {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }
}
