import { BALL, SUPER_SHOTS, type SuperType } from '../../config/gameConfig';
import {
  clamp,
  integrateBallistic,
  type BallisticBody,
  type Circle,
  type ContactBody,
} from '../../physics';
import { advanceSuperEffect, applySuperForces, ballisticParamsFor } from '../superEffects';
import type { Facing, PlayerIndex } from '../types';

/** Topun süper etki durumu (düz veri: snapshot, AI görünümü ve tahminci bunu kopyalar). */
export interface BallSuperState {
  /** Etkin süper tipi; null = normal top. */
  superType: SuperType | null;
  /** Süperi atan oyuncu; −1 = yok. */
  superOwner: PlayerIndex | -1;
  /** Süperin atıldığından beri geçen süre (sn). */
  superTime: number;
  /** Süperin atıldığı yön (atan oyuncunun bakış yönü). */
  superDir: Facing;
  /** Işınlanma: top şu an görünmez ve oyuncuların içinden geçer. */
  phased: boolean;
  /** Işınlanma bu atışta gerçekleşti (ya da artık gerçekleşmeyecek). */
  phaseDone: boolean;
  /** Yarıçap çarpanı (Dev Top büyümesi/küçülmesi; etki bitince 1'e döner). */
  radiusScale: number;
}

/** Top durumu. Kendisi bir `Circle` olarak da çarpışma testlerine verilir. */
export class Ball implements ContactBody, BallisticBody, Circle, BallSuperState {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  angle = 0;
  angVel = 0;
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

  superType: SuperType | null = null;
  superOwner: PlayerIndex | -1 = -1;
  superTime = 0;
  superDir: Facing = 1;
  phased = false;
  phaseDone = false;
  /**
   * Çarpışma yarıçapı (Dev Top etkisiyle büyüyebilir). Fizikte çok sık okunduğu için düz alan;
   * `radiusScale` değişince güncellenir.
   */
  radius: number = BALL.radius;
  private scale = 1;

  get radiusScale(): number {
    return this.scale;
  }

  set radiusScale(value: number) {
    this.scale = value;
    this.radius = BALL.radius * value;
  }

  get invMass(): number {
    return this.superType === 'giant'
      ? 1 / (BALL.mass * SUPER_SHOTS.giant.massScale)
      : 1 / BALL.mass;
  }

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
    this.clearSuper();
    this.radiusScale = 1;
  }

  /** Süper etkisini bitirir (Dev Top yarıçapı kademeli olarak 1'e döner). */
  clearSuper(): void {
    this.superType = null;
    this.superOwner = -1;
    this.superTime = 0;
    this.phased = false;
    this.phaseDone = false;
  }

  /** Bir süper durumunu kopyalar (AI tahmincisi, testler). */
  copySuper(s: BallSuperState): void {
    this.superType = s.superType;
    this.superOwner = s.superOwner;
    this.superTime = s.superTime;
    this.superDir = s.superDir;
    this.phased = s.phased;
    this.phaseDone = s.phaseDone;
    this.radiusScale = s.radiusScale;
  }

  integrate(h: number): void {
    applySuperForces(this, h);
    integrateBallistic(this, ballisticParamsFor(this), h);
    advanceSuperEffect(this, h);
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
