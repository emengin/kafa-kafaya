import { DISPLAY } from '../config/gameConfig';

/**
 * Ekran çerçevesi hesabı (Faz 2.2) — saf fonksiyonlar, Phaser ve DOM'dan bağımsız (birim testli).
 *
 * Koordinat sistemi: dünya koordinatı = oyun alanının 1280×720 mantıksal koordinatı (fizik, sahne
 * yerleşimi). Kamera bu çekirdeği her zaman ekranın ortasına koyar. Ekran 16:9'dan genişse
 * görünür alan (`view`) yanlara taşar (x < 0 ve x > 1280 görünür), darsa üste ve alta. Taşan
 * kısımda yalnızca dekor vardır. `safe`, görünür alanın çentik / sistem çubuğu dışında kalan
 * kısmıdır; kenara sabitlenen arayüz bunun içine yerleşir.
 */

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Insets {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export const NO_INSETS: Insets = { left: 0, top: 0, right: 0, bottom: 0 };

export interface ScreenFrame {
  /** Oyun (tuval) boyutu, mantıksal piksel. */
  readonly size: Size;
  /** Görünür alan, dünya koordinatında. */
  readonly view: Rect;
  /** Güvenli alan, dünya koordinatında (görünür alan − çentik/sistem çubukları). */
  readonly safe: Rect;
}

export type AnchorX = 'left' | 'center' | 'right';
export type AnchorY = 'top' | 'middle' | 'bottom';

/**
 * Kenara sabitleme. Yatayda `left`/`right` güvenli alanın kenarına, `center` ekranın ortasına
 * (çentik tek kenarda olsa bile simetri bozulmasın); dikeyde aynı şekilde.
 */
export interface Anchor {
  readonly x: AnchorX;
  readonly y: AnchorY;
}

const { width: CORE_W, height: CORE_H } = DISPLAY;
const MAX_W = DISPLAY.frame.maxWidth;
const MAX_H = DISPLAY.frame.maxHeight;

/** En geniş ve en dar desteklenen en-boy oranı (ötesi letterbox). */
export const MAX_ASPECT = MAX_W / CORE_H;
export const MIN_ASPECT = CORE_W / MAX_H;

/** Alanın içine sığan, en-boy oranı [MIN_ASPECT, MAX_ASPECT] aralığında ortalı dikdörtgen. */
function capAspect(x: number, y: number, w: number, h: number): Rect {
  if (w <= 0 || h <= 0) return { x, y, width: w, height: h };
  const aspect = w / h;
  const width = aspect > MAX_ASPECT ? h * MAX_ASPECT : w;
  const height = aspect < MIN_ASPECT ? w / MIN_ASPECT : h;
  return { x: x + (w - width) / 2, y: y + (h - height) / 2, width, height };
}

/**
 * Oyun tuvalinin kabı (CSS px, pencereye göre konum ve boyut). Pencereyi kaplar, en-boy oranı
 * [MIN_ASPECT, MAX_ASPECT] aralığına kırpılır (kalan şerit letterbox); Phaser `EXPAND` kabın
 * içini doldurur. Dekor çentiğin altına da uzanır.
 *
 * İstisna: oyun alanı (çekirdek) böyle güvenli alana sığmıyorsa (ör. çentikli 16:9 telefon:
 * çekirdeğin yanında dekor payı yok, çentik kalenin üstüne gelir), kap yalnızca güvenli alanı
 * kaplar; çentik tarafı letterbox olur. Oyun alanı hiçbir cihazda çentiğin altında kalmaz.
 *
 * @param insets Pencerenin güvenli alan boşlukları (CSS px): yalnızca çentik ve sistem çubukları
 *               (dokunmatik köşe payı değil; yuvarlak köşe dekorun altına düşebilir).
 */
export function fitParent(windowW: number, windowH: number, insets: Insets = NO_INSETS): Rect {
  const full = capAspect(0, 0, windowW, windowH);
  const size = expandGameSize(full.width, full.height);
  const win = { width: windowW, height: windowH };
  const { safe } = computeFrame(size, canvasInsets(insets, win, full, size));
  const coreFits =
    safe.x <= FIT_EPSILON &&
    safe.y <= FIT_EPSILON &&
    safe.x + safe.width >= CORE_W - FIT_EPSILON &&
    safe.y + safe.height >= CORE_H - FIT_EPSILON;
  if (coreFits) return full;
  return capAspect(
    insets.left,
    insets.top,
    windowW - insets.left - insets.right,
    windowH - insets.top - insets.bottom,
  );
}

/** Kayan nokta payı (oyun px). */
const FIT_EPSILON = 0.5;

/**
 * Phaser `Scale.EXPAND` ile aynı hesap: kısa kenar çekirdeğe oturur, uzun kenar orana göre uzar
 * (çekirdekten küçük olmaz). Testler ve ekran görüntüsü matrisi için.
 */
export function expandGameSize(parentW: number, parentH: number): Size {
  if (parentW <= 0 || parentH <= 0) return { width: CORE_W, height: CORE_H };
  const sx = parentW / CORE_W;
  const sy = parentH / CORE_H;
  return sx < sy
    ? { width: CORE_W, height: Math.min(MAX_H, parentH / sx) }
    : { width: Math.min(MAX_W, parentW / sy), height: CORE_H };
}

/**
 * Çekirdeği ortalayan kamera kaydırması: dünya (0,0) ekranda (ox, oy)'ye düşer. Tam piksele
 * yuvarlanır (kesirli kaydırma yazıları bulanıklaştırır).
 */
export function coreOffset(size: Size): { x: number; y: number } {
  return {
    x: Math.floor(Math.max(0, size.width - CORE_W) / 2),
    y: Math.floor(Math.max(0, size.height - CORE_H) / 2),
  };
}

/**
 * Pencerenin güvenli alan boşlukları (CSS px) → tuvalin içine düşen kısım, mantıksal piksel.
 * Tuval letterbox yüzünden pencereden küçükse boşluğun şeritte kalan kısmı düşülür.
 *
 * @param canvas Tuvalin penceredeki konumu ve boyutu (CSS px).
 * @param gameSize Oyun boyutu (mantıksal piksel).
 */
export function canvasInsets(
  windowInsets: Insets,
  windowSize: Size,
  canvas: Rect,
  gameSize: Size,
): Insets {
  if (canvas.width <= 0 || canvas.height <= 0) return NO_INSETS;
  const kx = gameSize.width / canvas.width;
  const ky = gameSize.height / canvas.height;
  const right = windowSize.width - (canvas.x + canvas.width);
  const bottom = windowSize.height - (canvas.y + canvas.height);
  return {
    left: Math.max(0, windowInsets.left - canvas.x) * kx,
    top: Math.max(0, windowInsets.top - canvas.y) * ky,
    right: Math.max(0, windowInsets.right - right) * kx,
    bottom: Math.max(0, windowInsets.bottom - bottom) * ky,
  };
}

/** Oyun boyutu + tuvaldeki güvenli alan boşlukları → görünür ve güvenli alan (dünya koord.). */
export function computeFrame(size: Size, insets: Insets = NO_INSETS): ScreenFrame {
  const o = coreOffset(size);
  const view = { x: 0 - o.x, y: 0 - o.y, width: size.width, height: size.height };
  // Boşluklar ekranın yarısını geçemez (bozuk değer arayüzü ekran dışına itmesin).
  const l = clampInset(insets.left, size.width);
  const r = clampInset(insets.right, size.width);
  const t = clampInset(insets.top, size.height);
  const b = clampInset(insets.bottom, size.height);
  const safe = {
    x: view.x + l,
    y: view.y + t,
    width: size.width - l - r,
    height: size.height - t - b,
  };
  return { size, view, safe };
}

function clampInset(value: number, extent: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(0, value), extent / 2) : 0;
}

/** Tasarım çerçevesi: 16:9, çentiksiz. Tüm yerleşim değerleri (gameConfig) bu çerçevede yazılı. */
export const DESIGN_FRAME: ScreenFrame = computeFrame({ width: CORE_W, height: CORE_H });

/** Çapanın çerçevedeki noktası (dünya koordinatı). */
export function anchorPoint(frame: ScreenFrame, anchor: Anchor): { x: number; y: number } {
  const { view, safe } = frame;
  const x =
    anchor.x === 'left'
      ? safe.x
      : anchor.x === 'right'
        ? safe.x + safe.width
        : view.x + view.width / 2;
  const y =
    anchor.y === 'top'
      ? safe.y
      : anchor.y === 'bottom'
        ? safe.y + safe.height
        : view.y + view.height / 2;
  return { x, y };
}

/**
 * Tasarım çerçevesinde (x, y)'de duran ve `anchor`'a sabitlenen öğenin bu çerçevedeki kayması.
 * Öğenin yeni konumu = tasarım konumu + kayma; böylece kenara uzaklığı her ekranda aynı kalır.
 */
export function anchorShift(frame: ScreenFrame, anchor: Anchor): { x: number; y: number } {
  const now = anchorPoint(frame, anchor);
  const design = anchorPoint(DESIGN_FRAME, anchor);
  return { x: now.x - design.x, y: now.y - design.y };
}

/** Sık kullanılan çapalar. */
export const TOP_LEFT: Anchor = { x: 'left', y: 'top' };
export const TOP_CENTER: Anchor = { x: 'center', y: 'top' };
export const TOP_RIGHT: Anchor = { x: 'right', y: 'top' };
export const BOTTOM_LEFT: Anchor = { x: 'left', y: 'bottom' };
export const BOTTOM_CENTER: Anchor = { x: 'center', y: 'bottom' };
export const BOTTOM_RIGHT: Anchor = { x: 'right', y: 'bottom' };
