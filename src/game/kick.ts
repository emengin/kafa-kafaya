import { KICK, SUPER } from '../config/gameConfig';
import { clamp } from '../physics';
import type { Facing } from './types';

/** Şut hesabının girdileri: temas anındaki oyuncu, ayak ve top durumu. */
export interface KickInput {
  readonly facing: Facing;
  readonly playerVx: number;
  readonly playerVy: number;
  /** Savrulma fazı katsayısı (1 = en hızlı an). */
  readonly swingFactor: number;
  /** Ayaktan topa birim temas normali. */
  readonly nx: number;
  readonly ny: number;
  readonly ballVx: number;
  readonly ballVy: number;
  /** Süper şut mu? */
  readonly superShot: boolean;
}

export interface KickResult {
  readonly vx: number;
  readonly vy: number;
  /** Topun açısal hızına eklenecek değer (rad/sn). */
  readonly spin: number;
}

/**
 * Şutun topa verdiği yeni hız. GameSim ve yapay zekânın şut değerlendirmesi aynı fonksiyonu
 * kullanır (AI "kafasında" gerçek şut formülüyle dener).
 *
 * - Güç: savrulma fazı + oyuncunun şut yönündeki hızı.
 * - Yön: bakış yönünde; yükselme açısı temas normalinden gelir — ayak topun altına vurursa top
 *   yükselir, üstüne vurursa yere doğru gider.
 * - Süper: hedef hız `SUPER.kickSpeedMultiplier` ile çarpılır, yükselme açısı düzleşir.
 */
export function computeKick(k: KickInput): KickResult {
  // Temas normalinin yükselme açısı (yukarı pozitif) → şut açısı.
  const contactElevation = Math.atan2(-k.ny, Math.abs(k.nx));
  let elevation = clamp(
    KICK.baseLift + contactElevation * KICK.contactAngleFactor,
    KICK.minElevation,
    KICK.maxElevation,
  );
  if (k.superShot) elevation *= SUPER.elevationScale;
  const dirX = k.facing * Math.cos(elevation);
  const dirY = -Math.sin(elevation);

  const runUp = Math.max(0, k.playerVx * dirX + k.playerVy * dirY) * KICK.playerVelocityTransfer;
  let targetSpeed = KICK.minSpeed + (KICK.maxSpeed - KICK.minSpeed) * k.swingFactor + runUp;
  if (k.superShot) targetSpeed *= SUPER.kickSpeedMultiplier;
  const along = k.ballVx * dirX + k.ballVy * dirY;
  const perpX = k.ballVx - along * dirX;
  const perpY = k.ballVy - along * dirY;
  const newAlong = Math.max(along, targetSpeed);
  return {
    vx: dirX * newAlong + perpX * KICK.perpendicularRetain,
    vy: dirY * newAlong + perpY * KICK.perpendicularRetain,
    // Alttan vuruş (ny < 0) → geri dönüş (backspin); üstten vuruş → ileri dönüş.
    spin: KICK.spinFromContact * k.ny * k.facing,
  };
}
