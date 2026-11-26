import Phaser from 'phaser';
import { css, makeCanvasTexture } from '../art/canvas';
import { textStyle } from '../art/uiArt';
import { TOUCH } from '../config/gameConfig';
import { t } from '../i18n';
import type { TouchButtonId } from '../input/touchLayout';

/**
 * Dokunmatik buton çizimleri (Faz 6; ortak dosya Faz 2.3): maçtaki kontroller ve kontrol
 * düzenleyicisi aynı dokuları kullanır. Kodla çizilmiş yer tutucu (Faz 3.4'te tasarım sistemi).
 */
type Ctx = CanvasRenderingContext2D;

/** Butonun ikon çizimi (kanvas, merkez 0,0; yarıçap r). Yazılı butonlarda yok. */
const ICONS: Partial<Record<TouchButtonId, (ctx: Ctx, r: number) => void>> = {
  left: (ctx, r) => {
    triangle(ctx, r, -1);
  },
  right: (ctx, r) => {
    triangle(ctx, r, 1);
  },
  pause: (ctx, r) => {
    const w = r * PAUSE_BAR_W;
    const h = r * PAUSE_BAR_H;
    ctx.fillRect(-w * PAUSE_GAP, -h / 2, w, h);
    ctx.fillRect(w * (PAUSE_GAP - 1), -h / 2, w, h);
  },
  reset: (ctx, r) => {
    const R = r * RESET_R;
    ctx.lineWidth = r * RESET_LINE;
    ctx.beginPath();
    ctx.arc(0, 0, R, RESET_FROM, RESET_TO);
    ctx.stroke();
    const ax = Math.cos(RESET_TO) * R;
    const ay = Math.sin(RESET_TO) * R;
    const s = r * RESET_HEAD;
    ctx.beginPath();
    ctx.moveTo(ax + s, ay);
    ctx.lineTo(ax - s, ay - s * RESET_HEAD_SKEW);
    ctx.lineTo(ax - s * RESET_HEAD_SKEW, ay + s);
    ctx.closePath();
    ctx.fill();
  },
  fill: (ctx, r) => {
    ctx.beginPath();
    TOUCH.boltIcon.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x * r, y * r);
      else ctx.lineTo(x * r, y * r);
    });
    ctx.closePath();
    ctx.fill();
  },
};

function triangle(ctx: Ctx, r: number, dir: 1 | -1): void {
  const s = r * ARROW_SIZE;
  ctx.beginPath();
  ctx.moveTo(dir * s, 0);
  ctx.lineTo(-dir * s * ARROW_BACK, -s);
  ctx.lineTo(-dir * s * ARROW_BACK, s);
  ctx.closePath();
  ctx.fill();
}

const LABELS: Partial<Record<TouchButtonId, 'touch.jump' | 'touch.kick' | 'touch.super'>> = {
  jump: 'touch.jump',
  kick: 'touch.kick',
  super: 'touch.super',
};

/** Butonun dokusu (yarıçapa göre önbellekli); anahtarını döndürür. */
export function touchButtonTexture(scene: Phaser.Scene, id: TouchButtonId, r: number): string {
  const rr = Math.round(r);
  const key = `touch-${id}-${rr}`;
  if (scene.textures.exists(key)) return key;
  const size = Math.ceil((rr + TOUCH.strokePx) * 2 + 2);
  makeCanvasTexture(scene, key, size, size, (ctx, w) => {
    const c = w / 2;
    ctx.translate(c, c);
    const g = ctx.createRadialGradient(0, -rr * GLOSS_Y, rr * GLOSS_R, 0, 0, rr);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0.55)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = TOUCH.strokePx;
    ctx.strokeStyle = css(TOUCH.strokeColor, STROKE_ALPHA);
    ctx.stroke();
    const icon = ICONS[id];
    if (icon) {
      ctx.fillStyle = css(TOUCH.strokeColor);
      ctx.strokeStyle = css(TOUCH.strokeColor);
      icon(ctx, rr);
    }
  });
  return key;
}

/** İnce halka dokusu (basış halkası, düzenleyicide seçim ve dokunma alanı). */
export function ringTexture(scene: Phaser.Scene, r: number, lineWidth: number): string {
  const rr = Math.round(r);
  const key = `touch-ring-${rr}-${lineWidth}`;
  if (scene.textures.exists(key)) return key;
  const size = Math.ceil((rr + lineWidth) * 2 + 2);
  makeCanvasTexture(scene, key, size, size, (ctx, w) => {
    ctx.translate(w / 2, w / 2);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, Math.PI * 2);
    ctx.stroke();
  });
  return key;
}

/** Butonun üstündeki yazı (Zıpla, Şut, Süper; diğerlerinde boş). */
export function touchLabel(
  scene: Phaser.Scene,
  id: TouchButtonId,
  x: number,
  y: number,
  scale = 1,
): Phaser.GameObjects.Text {
  const key = LABELS[id];
  return scene.add
    .text(
      x,
      y,
      key ? t(key) : '',
      textStyle(Math.round(TOUCH.labelFontSizePx * scale), '#ffffff', LABEL_STROKE),
    )
    .setOrigin(0.5);
}

const STROKE_ALPHA = 0.8;
const GLOSS_Y = 0.35;
const GLOSS_R = 0.1;
const ARROW_SIZE = 0.42;
const ARROW_BACK = 0.75;
const PAUSE_BAR_W = 0.22;
const PAUSE_BAR_H = 0.8;
const PAUSE_GAP = 1.4;
const RESET_R = 0.48;
const RESET_LINE = 0.14;
const RESET_FROM = -2.6;
const RESET_TO = 2.2;
const RESET_HEAD = 0.26;
const RESET_HEAD_SKEW = 0.2;
const LABEL_STROKE = 3;
