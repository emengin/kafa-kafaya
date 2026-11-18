import type Phaser from 'phaser';
import { makeCanvasTexture } from './canvas';

/**
 * Kupa (Faz 6): 100×100 birimlik SVG yolları, `Path2D` ile istenen boyutta bir kez dokuya
 * çizilir (altın gradyan, koyu kontur, parlama, yıldız). Turnuva ağacında küçük, kupa ekranında
 * büyük kullanılır. Harici dosya yok.
 */
const PATHS = {
  bowl: 'M18 6 L82 6 C82 40 68 56 50 56 C32 56 18 40 18 6 Z',
  handleL: 'M21 12 C3 12 2 37 27 41',
  handleR: 'M79 12 C97 12 98 37 73 41',
  stem: 'M45 55 L55 55 L57 72 L43 72 Z',
  base: 'M30 72 L70 72 L76 84 L24 84 Z',
  plinth: 'M19 84 L81 84 L81 97 L19 97 Z',
  shine: 'M27 12 C27 30 33 42 42 49',
  star: 'M50 18 L52.9 25.1 L60.5 25.6 L54.7 30.5 L56.5 37.9 L50 33.9 L43.5 37.9 L45.3 30.5 L39.5 25.6 L47.1 25.1 Z',
} as const;

const UNIT = 100;
const PLINTH_Y = 84;
const OUTLINE = '#5a3200';
const GOLD_DARK = '#c27a00';
const GOLD_LIGHT = '#fff2a8';
const GOLD_MID = '#ffc93a';
const PLINTH_TOP = '#5b2f8f';
const PLINTH_BOTTOM = '#2b1550';
const OUTLINE_W = 3.2;
const HANDLE_W = 6;
const SHINE_W = 4;
const SHINE_ALPHA = 0.6;
const STAR_COLOR = '#fffbe0';
const STOP_LIGHT = 0.38;
const STOP_MID = 0.62;

/** @returns Doku anahtarı (aynı boyut için önbellekli). */
export function trophyTexture(scene: Phaser.Scene, width: number, height: number): string {
  const key = `trophy-${Math.round(width)}x${Math.round(height)}`;
  makeCanvasTexture(scene, key, width, height, (ctx, w, h) => {
    ctx.scale(w / UNIT, h / UNIT);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const gold = ctx.createLinearGradient(0, 0, UNIT, 0);
    gold.addColorStop(0, GOLD_DARK);
    gold.addColorStop(STOP_LIGHT, GOLD_LIGHT);
    gold.addColorStop(STOP_MID, GOLD_MID);
    gold.addColorStop(1, GOLD_DARK);
    // Kulplar: önce kalın kontur, sonra altın.
    for (const d of [PATHS.handleL, PATHS.handleR]) {
      const p = new Path2D(d);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = HANDLE_W + OUTLINE_W;
      ctx.stroke(p);
      ctx.strokeStyle = gold;
      ctx.lineWidth = HANDLE_W;
      ctx.stroke(p);
    }
    const plinth = ctx.createLinearGradient(0, PLINTH_Y, 0, UNIT);
    plinth.addColorStop(0, PLINTH_TOP);
    plinth.addColorStop(1, PLINTH_BOTTOM);
    const fills: [string, CanvasGradient][] = [
      [PATHS.plinth, plinth],
      [PATHS.base, gold],
      [PATHS.stem, gold],
      [PATHS.bowl, gold],
    ];
    for (const [d, fill] of fills) {
      const p = new Path2D(d);
      ctx.fillStyle = fill;
      ctx.fill(p);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = OUTLINE_W;
      ctx.stroke(p);
    }
    ctx.fillStyle = STAR_COLOR;
    ctx.fill(new Path2D(PATHS.star));
    ctx.globalAlpha = SHINE_ALPHA;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = SHINE_W;
    ctx.stroke(new Path2D(PATHS.shine));
  });
  return key;
}
