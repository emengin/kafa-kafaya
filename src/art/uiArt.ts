import type Phaser from 'phaser';
import { UI_THEME } from '../config/gameConfig';
import { css, makeCanvasTexture, roundRectPath, shade } from './canvas';

export type PanelStyle = keyof typeof UI_THEME.styles;

/**
 * Arayüz paneli dokusu (önbellekli): yumuşak gölge, dikey gradyan, üstte iç parlama, ince kenar.
 * Doku, gölge payı kadar panelden büyüktür; `panelPad` kadar içeriden yerleştirilir.
 * @returns Doku anahtarı.
 */
export function panelTexture(
  scene: Phaser.Scene,
  w: number,
  h: number,
  style: PanelStyle,
  radius: number = UI_THEME.radius,
): string {
  const W = Math.round(w);
  const H = Math.round(h);
  const key = `ui-${style}-${W}x${H}-${radius}`;
  const pad = panelPad();
  makeCanvasTexture(scene, key, W + pad * 2, H + pad * 2, (ctx) => {
    const s = UI_THEME.styles[style];
    const sh = UI_THEME.shadow;
    const b = UI_THEME.borderPx;
    // Gölge.
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${sh.alpha})`;
    ctx.shadowBlur = sh.blur;
    ctx.shadowOffsetY = sh.offsetY;
    roundRectPath(ctx, pad, pad, W, H, radius);
    ctx.fillStyle = css(s.bottom);
    ctx.fill();
    ctx.restore();
    // Gradyan gövde.
    const g = ctx.createLinearGradient(0, pad, 0, pad + H);
    g.addColorStop(0, css(s.top));
    g.addColorStop(1, css(s.bottom));
    roundRectPath(ctx, pad, pad, W, H, radius);
    ctx.fillStyle = g;
    ctx.fill();
    // Üst yarıda iç parlama.
    ctx.save();
    roundRectPath(ctx, pad, pad, W, H, radius);
    ctx.clip();
    const hi = ctx.createLinearGradient(0, pad, 0, pad + H * HIGHLIGHT_SPAN);
    hi.addColorStop(0, `rgba(255,255,255,${UI_THEME.highlightAlpha})`);
    hi.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hi;
    ctx.fillRect(pad, pad, W, H * HIGHLIGHT_SPAN);
    ctx.restore();
    // Kenar: üstte açık, altta koyu.
    const edge = ctx.createLinearGradient(0, pad, 0, pad + H);
    edge.addColorStop(0, css(shade(s.border, EDGE_LIGHT), s.borderAlpha));
    edge.addColorStop(1, css(shade(s.border, EDGE_DARK), s.borderAlpha));
    roundRectPath(ctx, pad + b / 2, pad + b / 2, W - b, H - b, Math.max(0, radius - b / 2));
    ctx.lineWidth = b;
    ctx.strokeStyle = edge;
    ctx.stroke();
  });
  return key;
}

const HIGHLIGHT_SPAN = 0.5;
const EDGE_LIGHT = 0.3;
const EDGE_DARK = -0.25;

/** Panel dokusunun gölge payı (px). */
export function panelPad(): number {
  return UI_THEME.shadow.blur + UI_THEME.shadow.offsetY;
}

/** Panel Image'ı (merkez orijinli) ekler. */
export function addPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  style: PanelStyle,
  radius?: number,
): Phaser.GameObjects.Image {
  return scene.add.image(x, y, panelTexture(scene, w, h, style, radius));
}

/** Tutarlı yazı stili: kontur + yumuşak gölge. */
export function textStyle(
  size: number,
  color: string,
  strokePx: number = Math.max(2, Math.round(size / STROKE_RATIO)),
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: '"Arial Black", "Segoe UI", Arial, sans-serif',
    fontSize: `${size}px`,
    color,
    stroke: UI_THEME.text.stroke,
    strokeThickness: strokePx,
    shadow: {
      offsetX: 0,
      offsetY: UI_THEME.text.shadowOffset,
      color: UI_THEME.text.shadow,
      blur: UI_THEME.text.shadowBlur,
      stroke: true,
      fill: true,
    },
  };
}
const STROKE_RATIO = 7;

/** Metne dikey altın gradyan uygular (başlıklar, GOL!). */
export function goldFill(
  text: Phaser.GameObjects.Text,
  colors: readonly string[] = UI_THEME.text.gold,
): void {
  const ctx = text.context;
  const h = text.height;
  const g = ctx.createLinearGradient(0, h * GOLD_TOP, 0, h * GOLD_BOTTOM);
  colors.forEach((c, i) => {
    g.addColorStop(i / Math.max(1, colors.length - 1), c);
  });
  text.setFill(g);
}
const GOLD_TOP = 0.2;
const GOLD_BOTTOM = 0.8;
