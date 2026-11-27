import { KICK, type SuperType } from '../config/gameConfig';
import { clamp, datan2, dcos, dsin } from '../physics';
import { superKickScales } from './superEffects';
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
  /** Karakterin şut gücü çarpanı (1 = ortalama). */
  readonly power: number;
  /** Süper şutsa tipi (hız ve açı çarpanları), değilse null. */
  readonly superType: SuperType | null;
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
 * - Güç: karakterin şut gücü savrulmadan gelen hızı ölçekler.
 * - Süper: hedef hız ve yükselme açısı süper tipinin çarpanlarıyla değişir (`SUPER_SHOTS`).
 */
export function computeKick(k: KickInput): KickResult {
  // Temas normalinin yükselme açısı (yukarı pozitif) → şut açısı.
  const contactElevation = datan2(-k.ny, Math.abs(k.nx));
  let elevation = clamp(
    KICK.baseLift + contactElevation * KICK.contactAngleFactor,
    KICK.minElevation,
    KICK.maxElevation,
  );
  // Güçlü şut daha düz gider (hızlanan top aynı açıyla kalenin üstünden gitmesin).
  elevation /= k.power;
  const scales = k.superType ? superKickScales(k.superType) : null;
  if (scales) elevation *= scales.elevation;
  const dirX = k.facing * dcos(elevation);
  const dirY = -dsin(elevation);

  const runUp = Math.max(0, k.playerVx * dirX + k.playerVy * dirY) * KICK.playerVelocityTransfer;
  const swing = KICK.minSpeed + (KICK.maxSpeed - KICK.minSpeed) * k.swingFactor;
  let targetSpeed = swing * k.power + runUp;
  if (scales) targetSpeed *= scales.speed;
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
