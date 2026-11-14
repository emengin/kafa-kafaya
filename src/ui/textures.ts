import type Phaser from 'phaser';
import { COLORS, TEXTURES } from '../config/gameConfig';

/**
 * Harici görsel dosyası yok: tüm dokular Graphics ile çizilip generateTexture ile üretilir.
 * Bu fonksiyon Preload sahnesinde bir kez çağrılır.
 */
export function generateTextures(scene: Phaser.Scene): void {
  generateBallTexture(scene);
}

function regularPolygon(cx: number, cy: number, radius: number, sides: number) {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / sides;
    points.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
  }
  return points;
}

function generateBallTexture(scene: Phaser.Scene): void {
  const cfg = TEXTURES.ball;
  if (scene.textures.exists(cfg.key)) return;

  const r = cfg.radius;
  const size = r * 2;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  g.fillStyle(COLORS.ballFill, 1);
  g.fillCircle(r, r, r);

  g.fillStyle(COLORS.ballPatch, 1);
  g.fillPoints(regularPolygon(r, r, r * cfg.centerPatchRatio, cfg.patchCount), true);
  for (let i = 0; i < cfg.patchCount; i++) {
    // Dış yamalar, ortadaki beşgenin köşeleri arasına yerleşir.
    const angle = Math.PI / 2 + (i * Math.PI * 2) / cfg.patchCount;
    const d = r * cfg.outerPatchDistanceRatio;
    g.fillCircle(r + Math.cos(angle) * d, r + Math.sin(angle) * d, r * cfg.outerPatchRatio);
  }

  g.lineStyle(cfg.outlinePx, COLORS.ballPatch, 1);
  g.strokeCircle(r, r, r - cfg.outlinePx / 2);

  g.generateTexture(cfg.key, size, size);
  g.destroy();
}
