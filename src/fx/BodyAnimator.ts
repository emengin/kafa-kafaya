import { ANIM } from '../config/gameConfig';
import { approach, Spring } from './Spring';

/** Oyuncunun bir karedeki hareket durumu (simülasyondan okunur). */
export interface BodyMotion {
  readonly grounded: boolean;
  readonly vx: number;
  readonly vy: number;
  readonly maxSpeed: number;
  /** Bakış yönü (+1 sağ, −1 sol). */
  readonly facing: number;
  /** Şut savrulmasının ilerleyişi (0 = savrulmuyor … 1 = ayak en yukarıda). */
  readonly kick: number;
  /** Donmuşsa gövde kıpırdamaz. */
  readonly frozen: boolean;
}

/**
 * Karakterin gövde animasyonu (yalnızca görsel): squash & stretch (zıplamada esneme, inişte
 * basılma, havada hızla uzama), koşuda adım sallanması ve hafif basılma, hıza göre öne eğilme,
 * şut savrulmasında geriye yaslanma. Çıktılar ayak tabanı merkezli dönüşüm olarak uygulanır.
 */
export class BodyAnimator {
  /** Yatay / dikey ölçek (1 = normal). */
  scaleX = 1;
  scaleY = 1;
  /** Dönüş (rad, + saat yönü). */
  lean = 0;
  /** Dikey kayma (px, − yukarı). */
  bobY = 0;
  private readonly squash = new Spring(ANIM.squash.stiffness, ANIM.squash.damping);
  private runPhase = 0;

  /** Zıplama: dikey esneme darbesi. */
  onJump(): void {
    this.squash.kick(ANIM.squash.jumpImpulse);
  }

  /** İniş: düşüş hızıyla orantılı basılma darbesi. */
  onLand(speed: number): void {
    const s = ANIM.squash;
    this.squash.kick(-s.landImpulse * Math.min(1, speed / s.landReferenceSpeed));
  }

  reset(): void {
    this.squash.reset();
    this.runPhase = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.lean = 0;
    this.bobY = 0;
  }

  update(dt: number, m: BodyMotion): void {
    const s = ANIM.squash;
    const run = ANIM.run;
    const speedRatio = m.maxSpeed > 0 ? Math.min(1, Math.abs(m.vx) / m.maxSpeed) : 0;

    let target = 0;
    let step = 0;
    if (m.frozen) {
      target = 0;
    } else if (!m.grounded) {
      target = Math.min(s.maxAirStretch, Math.abs(m.vy) * s.airStretchPerSpeed);
    } else if (speedRatio > run.minSpeedRatio) {
      this.runPhase += (Math.abs(m.vx) * dt * Math.PI) / run.stridePx;
      step = Math.abs(Math.sin(this.runPhase));
    }
    if (!m.grounded || speedRatio <= run.minSpeedRatio) {
      // Adım bitince bir sonraki adıma yumuşak başla.
      this.runPhase = approach(this.runPhase, Math.round(this.runPhase / Math.PI) * Math.PI, 1, dt);
    }
    const squash = clamp(this.squash.update(dt, target), s.min, s.max);
    const stepSquash = m.grounded && !m.frozen ? -run.stepSquash * (1 - step) * speedRatio : 0;
    const v = squash + stepSquash;
    this.scaleY = 1 + v;
    this.scaleX = 1 - v * s.widthPreserve;
    this.bobY = -step * run.bobPx * speedRatio;

    const l = ANIM.lean;
    const leanTarget = m.frozen
      ? 0
      : (m.vx / Math.max(1, m.maxSpeed)) * l.maxRad - m.facing * m.kick * l.kickRad;
    this.lean = approach(
      this.lean,
      clamp(leanTarget, -l.maxRad - l.kickRad, l.maxRad + l.kickRad),
      l.rate,
      dt,
    );
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
