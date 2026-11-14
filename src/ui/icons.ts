import type Phaser from 'phaser';
import { FX, type PowerUpType } from '../config/gameConfig';
import { POWER_UP_TYPES } from '../game/entities/Player';
import { strokeArc } from './shapes';

/** Sık kullanılan renk. */
const WHITE = 0xffffff;

type Graphics = Phaser.GameObjects.Graphics;

/** İkon çizimlerinde yarıçapa oranlar (yalnızca şekil; ayar değeri değildir). */
const R = {
  big: 0.55,
  plus: 0.28,
  plusOffset: 0.55,
  small: 0.3,
  minus: 0.45,
  chevron: 0.38,
  chevronGap: 0.32,
  postX: 0.55,
  postTop: -0.05,
  postBottom: 0.65,
  arrowTop: -0.7,
  arrowHead: 0.22,
  flake: 0.62,
  flakeTick: 0.22,
  flakeTickAt: 0.6,
  jumpGap: 0.36,
  jumpH: 0.8,
  jumpY: 0.12,
  nudge: 0.1,
  shrinkY: 0.15,
  chevronX: 0.6,
} as const;
const FLAKE_ARMS = 3;
const SIXTY_DEG = Math.PI / FLAKE_ARMS;

/**
 * Güçlendirici ikonu (basit vektör çizim): HUD'daki geri sayım halkalarının ve balonların
 * içinde kullanılır. `r` ikonun sığacağı dairenin yarıçapı.
 */
export function drawPowerUpIcon(
  g: Graphics,
  type: PowerUpType,
  x: number,
  y: number,
  r: number,
  color: number,
  alpha = 1,
  lineWidth: number = FX.iconLineWidthPx,
): void {
  g.lineStyle(lineWidth, color, alpha);
  g.fillStyle(color, alpha);
  switch (type) {
    case 'bigHead': {
      g.strokeCircle(x - r * R.nudge, y + r * R.nudge, r * R.big);
      const px = x + r * R.plusOffset;
      const py = y - r * R.plusOffset;
      g.lineBetween(px - r * R.plus, py, px + r * R.plus, py);
      g.lineBetween(px, py - r * R.plus, px, py + r * R.plus);
      break;
    }
    case 'shrinkOpponent':
      g.fillCircle(x, y + r * R.shrinkY, r * R.small);
      g.lineBetween(x - r * R.minus, y - r * R.plusOffset, x + r * R.minus, y - r * R.plusOffset);
      break;
    case 'speed':
      for (const dx of [-R.chevronGap, R.chevronGap]) {
        const cx = x + dx * r;
        g.lineBetween(
          cx - r * R.chevron * R.chevronX,
          y - r * R.chevron,
          cx + r * R.chevron * R.chevronX,
          y,
        );
        g.lineBetween(
          cx + r * R.chevron * R.chevronX,
          y,
          cx - r * R.chevron * R.chevronX,
          y + r * R.chevron,
        );
      }
      break;
    case 'growGoal': {
      const top = y + r * R.postTop;
      const bottom = y + r * R.postBottom;
      g.lineBetween(x - r * R.postX, bottom, x - r * R.postX, top);
      g.lineBetween(x - r * R.postX, top, x + r * R.postX, top);
      g.lineBetween(x + r * R.postX, top, x + r * R.postX, bottom);
      const ay = y + r * R.arrowTop;
      g.lineBetween(x, top - r * R.nudge, x, ay);
      g.lineBetween(x - r * R.arrowHead, ay + r * R.arrowHead, x, ay);
      g.lineBetween(x + r * R.arrowHead, ay + r * R.arrowHead, x, ay);
      break;
    }
    case 'freezeOpponent':
      for (let i = 0; i < FLAKE_ARMS; i++) {
        const a = i * SIXTY_DEG + Math.PI / 2;
        const dx = Math.cos(a) * r * R.flake;
        const dy = Math.sin(a) * r * R.flake;
        g.lineBetween(x - dx, y - dy, x + dx, y + dy);
        for (const end of [1, -1]) {
          const tx = x + dx * end * R.flakeTickAt;
          const ty = y + dy * end * R.flakeTickAt;
          const nx = -Math.sin(a) * r * R.flakeTick;
          const ny = Math.cos(a) * r * R.flakeTick;
          g.lineBetween(tx - nx, ty - ny, tx + nx, ty + ny);
        }
      }
      break;
    case 'doubleJump':
      for (const dy of [-R.jumpGap / 2, R.jumpGap / 2]) {
        const cy = y + dy * r + r * R.jumpY;
        g.lineBetween(x - r * R.chevron, cy, x, cy - r * R.chevron * R.jumpH);
        g.lineBetween(x, cy - r * R.chevron * R.jumpH, x + r * R.chevron, cy);
      }
      break;
  }
}

/** Saat 12'den saat yönünde `fraction` kadar yay (geri sayım halkası). */
export function strokeRing(
  g: Graphics,
  x: number,
  y: number,
  r: number,
  fraction: number,
  width: number,
  color: number,
  alpha = 1,
): void {
  if (fraction <= 0) return;
  const start = -Math.PI / 2;
  g.lineStyle(width, color, alpha);
  strokeArc(g, x, y, r, start, start + Math.PI * 2 * Math.min(1, fraction));
}

/** İkon dokusunun anahtarı (beyaz çizilir; renk tint ile verilir). */
export function iconKey(type: PowerUpType): string {
  return `icon-${type}`;
}

/** İkon dokusunun yarıçapı (px): kullanırken `r / ICON_RADIUS` ile ölçeklenir. */
export const ICON_RADIUS = 32;
const ICON_PAD = 6;

/**
 * Güçlendirici ikonlarını bir kez dokuya çizer (Canvas üzerinden): oyun sırasında her karede
 * vektör çizim yapılmaz, ikonlar sprite olarak kullanılır.
 */
export function generateIconTextures(scene: Phaser.Scene): void {
  const size = (ICON_RADIUS + ICON_PAD) * 2;
  for (const type of POWER_UP_TYPES) {
    const key = iconKey(type);
    if (scene.textures.exists(key)) continue;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    drawPowerUpIcon(g, type, size / 2, size / 2, ICON_RADIUS, WHITE, 1, ICON_LINE);
    g.generateTexture(key, size, size);
    g.destroy();
  }
}
const ICON_LINE = 5;
