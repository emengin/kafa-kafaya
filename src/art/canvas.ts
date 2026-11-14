import type Phaser from 'phaser';

/**
 * Kodla doku üretimi için Canvas 2D yardımcıları. Dokular bir kez çizilir ve GPU'ya yüklenir;
 * oyun sırasında yeniden çizilmez. Harici görsel dosyası yoktur.
 */

const WHITE = 0xffffff;
const HEX = 16;
const RED_SHIFT = 16;
const GREEN_SHIFT = 8;
const CHANNEL = 0xff;

/** Sayısal renk (0xRRGGBB) → CSS rgba(). */
export function css(color: number, alpha = 1): string {
  const r = (color >> RED_SHIFT) & CHANNEL;
  const g = (color >> GREEN_SHIFT) & CHANNEL;
  const b = color & CHANNEL;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Sayısal renk → "#rrggbb" (Phaser metin rengi için). */
export function hex(color: number): string {
  const RGB_DIGITS = 6;
  return `#${color.toString(HEX).padStart(RGB_DIGITS, '0')}`;
}

/** İki rengi karıştırır (t = 0 → a, 1 → b). */
export function mix(a: number, b: number, t: number): number {
  const ch = (shift: number): number => {
    const ca = (a >> shift) & CHANNEL;
    const cb = (b >> shift) & CHANNEL;
    return Math.round(ca + (cb - ca) * t) & CHANNEL;
  };
  return (ch(RED_SHIFT) << RED_SHIFT) | (ch(GREEN_SHIFT) << GREEN_SHIFT) | ch(0);
}

/** Açar (amount > 0, beyaza doğru) ya da koyulaştırır (amount < 0, siyaha doğru). */
export function shade(color: number, amount: number): number {
  return amount >= 0 ? mix(color, WHITE, amount) : mix(color, 0, -amount);
}

export type Ctx = CanvasRenderingContext2D;

/**
 * `key` adında bir canvas dokusu oluşturur ve `draw` ile çizer (zaten varsa dokunmaz).
 * @returns Oluşturulduysa true.
 */
export function makeCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: Ctx, width: number, height: number) => void,
): boolean {
  if (scene.textures.exists(key)) return false;
  const tex = scene.textures.createCanvas(key, Math.ceil(width), Math.ceil(height));
  if (!tex) return false;
  const ctx = tex.getContext();
  ctx.save();
  draw(ctx, width, height);
  ctx.restore();
  tex.refresh();
  return true;
}

/** Var olan dokuyu silip yeniden oluşturur (dile ya da karakterlere bağlı dokular). */
export function remakeCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: Ctx, width: number, height: number) => void,
): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  makeCanvasTexture(scene, key, width, height, draw);
}

/** Dikey doğrusal gradyan. */
export function vGradient(
  ctx: Ctx,
  y0: number,
  y1: number,
  stops: readonly (readonly [number, number])[],
): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [at, color] of stops) g.addColorStop(at, css(color));
  return g;
}

/** Dairesel gradyan (iç merkezden dışa). */
export function radial(
  ctx: Ctx,
  x: number,
  y: number,
  r0: number,
  r1: number,
  inner: string,
  outer: string,
): CanvasGradient {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  return g;
}

/** Yuvarlak köşeli dikdörtgen yolu. */
export function roundRectPath(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Deterministik küçük PRNG (sanat üretimi her açılışta aynı görünsün). */
export function artRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + MULBERRY_INC) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> MULBERRY_S1), t | 1);
    t ^= t + Math.imul(t ^ (t >>> MULBERRY_S2), t | MULBERRY_OR);
    return ((t ^ (t >>> MULBERRY_S3)) >>> 0) / UINT32_RANGE;
  };
}
const MULBERRY_INC = 0x6d2b79f5;
const MULBERRY_S1 = 15;
const MULBERRY_S2 = 7;
const MULBERRY_S3 = 14;
const MULBERRY_OR = 61;
const UINT32_RANGE = 4294967296;
