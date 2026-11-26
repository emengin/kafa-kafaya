import type Phaser from 'phaser';

type Graphics = Phaser.GameObjects.Graphics;

/**
 * Çizgi çizen her şey: Phaser `Graphics`/`LiteGraphics` ya da bir Canvas 2D bağlamının sarmalayıcısı
 * (ikon dokuları, Faz 2.4). Yalnızca ikon ve yay çizimlerinin kullandığı yöntemler.
 */
export interface Pen {
  lineStyle(lineWidth: number, color: number, alpha?: number): unknown;
  fillStyle(color: number, alpha?: number): unknown;
  strokeCircle(x: number, y: number, radius: number): unknown;
  fillCircle(x: number, y: number, radius: number): unknown;
  lineBetween(x1: number, y1: number, x2: number, y2: number): unknown;
  strokePoints(
    points: readonly { x: number; y: number }[],
    closeShape?: boolean,
    closePath?: boolean,
    endIndex?: number,
  ): unknown;
}

/**
 * Ucuz Graphics çizimleri. Phaser'ın WebGL'de her karede yeniden üçgenlediği `fillCircle`/`arc`
 * her yayı ~100 noktayla örnekler (küçük yüz parçaları için gereksiz ve pahalı). Bunlar
 * yarıçapa göre 6–24 noktalı çokgenler kullanır ve geçici dizi ayırmaz (paylaşılan tampon).
 */

const MIN_SEGMENTS = 6;
const MAX_SEGMENTS = 24;
/** Yarıçap başına nokta (px başına). */
const SEGMENTS_PER_PX = 0.9;
const BUFFER = MAX_SEGMENTS * 2 + 2;
const buffer: { x: number; y: number }[] = Array.from({ length: BUFFER }, () => ({ x: 0, y: 0 }));
/**
 * Phaser 4 türleri `fillPoints`/`strokePoints` için `Vector2[]` ister; çalışma zamanında yalnızca
 * `x`/`y` okunur (Phaser ve LiteGraphics). Düz nesneler yeterli, `Vector2` kurmaya gerek yok.
 */
const points = buffer as unknown as Phaser.Math.Vector2[];

/** Yarıçapa uygun nokta sayısı. */
export function segmentsFor(r: number): number {
  return Math.max(MIN_SEGMENTS, Math.min(MAX_SEGMENTS, Math.round(r * SEGMENTS_PER_PX)));
}

export function fillDisc(g: Graphics, x: number, y: number, r: number): void {
  g.fillEllipse(x, y, r * 2, r * 2, segmentsFor(r));
}

export function fillOval(g: Graphics, x: number, y: number, w: number, h: number): void {
  g.fillEllipse(x, y, w, h, segmentsFor(Math.max(w, h) / 2));
}

export function strokeOval(g: Graphics, x: number, y: number, w: number, h: number): void {
  g.strokeEllipse(x, y, w, h, segmentsFor(Math.max(w, h) / 2));
}

/** Yay noktalarını tampona yazar; @returns nokta sayısı. */
function arcPoints(
  x: number,
  y: number,
  r: number,
  a0: number,
  a1: number,
  offset: number,
): number {
  const n = Math.max(2, Math.round((segmentsFor(r) * Math.abs(a1 - a0)) / (Math.PI * 2)) + 1);
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * i) / (n - 1);
    const p = points[offset + i];
    if (!p) break;
    p.x = x + Math.cos(a) * r;
    p.y = y + Math.sin(a) * r;
  }
  return n;
}

/** Yay çizgisi (a0 → a1, saat yönü). */
export function strokeArc(g: Pen, x: number, y: number, r: number, a0: number, a1: number): void {
  const n = arcPoints(x, y, r, a0, a1, 0);
  g.strokePoints(points, false, false, n);
}

/** Kirişle kapanan dolu yay (yarım daire ağız vb.); `stroke` → kontur da çizilir. */
export function fillArc(
  g: Graphics,
  x: number,
  y: number,
  r: number,
  a0: number,
  a1: number,
  stroke: boolean,
): void {
  const n = arcPoints(x, y, r, a0, a1, 0);
  g.fillPoints(points, true, true, n);
  if (stroke) g.strokePoints(points, true, true, n);
}
