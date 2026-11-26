import { describe, expect, it } from 'vitest';
import { DISPLAY, TOUCH } from '../config/gameConfig';
import { touchButtons } from '../input/touchLayout';
import {
  anchorPoint,
  anchorShift,
  BOTTOM_LEFT,
  BOTTOM_RIGHT,
  canvasInsets,
  computeFrame,
  coreOffset,
  DESIGN_FRAME,
  expandGameSize,
  fitParent,
  MAX_ASPECT,
  MIN_ASPECT,
  NO_INSETS,
  TOP_CENTER,
  TOP_LEFT,
  type Insets,
  type ScreenFrame,
} from './screenFrame';

/** Test matrisi (Faz 2.2): telefon ve tablet en-boy oranları, yatay, CSS px. */
const SCREENS = [
  { name: '16:9', w: 640, h: 360 },
  { name: '18:9', w: 720, h: 360 },
  { name: '19.5:9', w: 780, h: 360 },
  { name: '20:9', w: 800, h: 360 },
  { name: '21:9', w: 840, h: 360 },
  { name: '4:3', w: 1024, h: 768 },
  { name: '16:10', w: 1280, h: 800 },
] as const;

/** Kayan nokta payı (px). */
const EPS = 1e-6;

/** Tipik çentik: kısa kenarda ~32 CSS px (yatayda sol ya da sağ). */
const NOTCH_PX = 32;

/**
 * main.ts + ScreenLayout ile aynı yol. `cutout`: çentik / sistem çubukları (tuval yerleşimi);
 * `insets`: arayüzün kullandığı boşluklar (dokunmatikte köşe payı dahil).
 */
function frameFor(
  w: number,
  h: number,
  insets: Insets = NO_INSETS,
  cutout: Insets = insets,
): ScreenFrame {
  const canvas = fitParent(w, h, cutout);
  const size = expandGameSize(canvas.width, canvas.height);
  return computeFrame(size, canvasInsets(insets, { width: w, height: h }, canvas, size));
}

describe('ekran çerçevesi', () => {
  it('16:9 tasarım çerçevesiyle aynı (web sürümü değişmez)', () => {
    const f = frameFor(1280, 720);
    expect(f).toEqual(DESIGN_FRAME);
    expect(f.view).toEqual({ x: 0, y: 0, width: DISPLAY.width, height: DISPLAY.height });
  });

  it.each(SCREENS)('$name: çekirdek (oyun alanı) her zaman tam görünür ve ortada', ({ w, h }) => {
    const { view } = frameFor(w, h);
    expect(view.x).toBeLessThanOrEqual(0);
    expect(view.y).toBeLessThanOrEqual(0);
    expect(view.x + view.width).toBeGreaterThanOrEqual(DISPLAY.width);
    expect(view.y + view.height).toBeGreaterThanOrEqual(DISPLAY.height);
    // Ortalı: iki yandaki pay en çok 1 px farklı (tam piksele yuvarlama).
    expect(Math.abs(-view.x - (view.x + view.width - DISPLAY.width))).toBeLessThanOrEqual(1);
    expect(Math.abs(-view.y - (view.y + view.height - DISPLAY.height))).toBeLessThanOrEqual(1);
  });

  it('geniş telefonda yanlara, tablette üste/alta genişler', () => {
    expect(frameFor(800, 360).view).toMatchObject({ width: 1600, height: 720, x: -160, y: 0 });
    expect(frameFor(840, 360).view).toMatchObject({ width: 1680, height: 720, x: -200 });
    expect(frameFor(1024, 768).view).toMatchObject({ width: 1280, height: 960, y: -120 });
    expect(frameFor(1280, 800).view).toMatchObject({ width: 1280, height: 800, y: -40 });
  });

  it('desteklenen oranların ötesi letterbox: görünür alan sınırı aşmaz', () => {
    expect(fitParent(1000, 360).width).toBeCloseTo(360 * MAX_ASPECT);
    expect(fitParent(300, 600).height).toBeCloseTo(300 / MIN_ASPECT);
    const ultra = frameFor(1000, 360).view;
    expect(ultra.width).toBeLessThanOrEqual(DISPLAY.frame.maxWidth);
    const portrait = frameFor(360, 800).view;
    expect(portrait.height).toBeLessThanOrEqual(DISPLAY.frame.maxHeight);
    expect(portrait.width).toBe(DISPLAY.width);
  });

  it('çekirdek kaydırması tam piksel', () => {
    expect(coreOffset({ width: 1557.33, height: 720 })).toEqual({ x: 138, y: 0 });
  });
});

describe('güvenli alan', () => {
  it('pencere boşluğu oyun pikseline çevrilir (20:9, 800 CSS px → 1600 oyun px)', () => {
    const f = frameFor(800, 360, { ...NO_INSETS, left: NOTCH_PX });
    expect(f.safe.x - f.view.x).toBeCloseTo(NOTCH_PX * 2);
    expect(f.safe.width).toBeCloseTo(f.view.width - NOTCH_PX * 2);
  });

  it('letterbox şeridine düşen boşluk düşülür', () => {
    // 1000×360 (27:9): tuval 853 px, iki yanda ~73 px şerit; 32 px çentik tamamen şeritte.
    const f = frameFor(1000, 360, { ...NO_INSETS, left: NOTCH_PX });
    expect(f.safe).toEqual(f.view);
  });

  it.each(SCREENS)('$name, çentik sol/üst: oyun alanı (çekirdek) güvenli alanın içinde', (sc) => {
    for (const cut of [
      { ...NO_INSETS, left: NOTCH_PX },
      { ...NO_INSETS, right: NOTCH_PX },
      { ...NO_INSETS, top: NOTCH_PX },
    ]) {
      const { safe } = frameFor(sc.w, sc.h, cut);
      expect(safe.x).toBeLessThanOrEqual(0.5);
      expect(safe.y).toBeLessThanOrEqual(0.5);
      expect(safe.x + safe.width).toBeGreaterThanOrEqual(DISPLAY.width - 0.5);
      expect(safe.y + safe.height).toBeGreaterThanOrEqual(DISPLAY.height - 0.5);
    }
  });

  it('16:9 çentikli: tuval çentikten uzaklaşır; 20:9 çentikli: dekor çentiğin altına uzanır', () => {
    const notch = { ...NO_INSETS, left: NOTCH_PX };
    expect(fitParent(640, 360, notch)).toMatchObject({ x: NOTCH_PX, width: 640 - NOTCH_PX });
    expect(fitParent(800, 360, notch)).toEqual({ x: 0, y: 0, width: 800, height: 360 });
  });

  it('köşe payı tuvali küçültmez (yalnızca çentik sayılır)', () => {
    const m = DISPLAY.touchEdgeMarginPx;
    const margin = { left: m, top: m, right: m, bottom: m };
    expect(frameFor(640, 360, margin, NO_INSETS).view).toEqual(DESIGN_FRAME.view);
  });

  it('bozuk değer arayüzü ekran dışına itmez', () => {
    const f = computeFrame({ width: 1280, height: 720 }, { ...NO_INSETS, left: 5000, top: NaN });
    expect(f.safe.x).toBe(640);
    expect(f.safe.y).toBe(0);
  });
});

describe('kenara sabitleme', () => {
  it('tasarım çerçevesinde kayma yok', () => {
    for (const a of [TOP_LEFT, TOP_CENTER, BOTTOM_LEFT, BOTTOM_RIGHT])
      expect(anchorShift(DESIGN_FRAME, a)).toEqual({ x: 0, y: 0 });
  });

  it('kenara uzaklık korunur; ortaya sabitlenen çentikten etkilenmez', () => {
    const f = frameFor(800, 360, { ...NO_INSETS, left: NOTCH_PX });
    expect(anchorShift(f, TOP_LEFT)).toEqual({ x: f.safe.x, y: 0 });
    expect(anchorShift(f, BOTTOM_RIGHT).x).toBe(f.view.x + f.view.width - DISPLAY.width);
    expect(anchorShift(f, TOP_CENTER)).toEqual({ x: 0, y: 0 });
    expect(anchorPoint(f, TOP_CENTER).x).toBe(DISPLAY.width / 2);
  });

  it('tablette üst arayüz ekranın üst kenarına, alt arayüz alt kenarına gider', () => {
    const f = frameFor(1024, 768);
    expect(anchorShift(f, TOP_CENTER).y).toBe(-120);
    expect(anchorShift(f, BOTTOM_LEFT).y).toBe(120);
  });
});

describe('dokunmatik butonlar (QUALITY_BAR D5)', () => {
  // Dokunmatik cihazda her kenarda en az köşe payı var (safeArea.ts); çentik bir kısa kenarda.
  const m = DISPLAY.touchEdgeMarginPx;
  const touchMin = { left: m, top: m, right: m, bottom: m };
  const variants = SCREENS.flatMap((s) => [
    { ...s, notch: 'yok', insets: touchMin },
    { ...s, notch: 'sol', insets: { ...touchMin, left: NOTCH_PX } },
    { ...s, notch: 'sağ', insets: { ...touchMin, right: NOTCH_PX } },
  ]);

  it.each(variants)('$name, çentik $notch: hepsi güvenli alanın içinde, üst üste binmiyor', (v) => {
    const cutout = {
      left: v.notch === 'sol' ? NOTCH_PX : 0,
      top: 0,
      right: v.notch === 'sağ' ? NOTCH_PX : 0,
      bottom: 0,
    };
    const f = frameFor(v.w, v.h, v.insets, cutout);
    const { safe } = f;
    const buttons = touchButtons(true, f);
    for (const b of buttons) {
      expect(b.x - b.r).toBeGreaterThanOrEqual(safe.x);
      expect(b.x + b.r).toBeLessThanOrEqual(safe.x + safe.width);
      expect(b.y - b.r).toBeGreaterThanOrEqual(safe.y);
      expect(b.y + b.r).toBeLessThanOrEqual(safe.y + safe.height);
    }
    for (const [i, a] of buttons.entries()) {
      for (const b of buttons.slice(i + 1)) {
        expect(Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r).toBeGreaterThanOrEqual(
          TOUCH.minGapPx - EPS,
        );
      }
    }
    const left = buttons.find((b) => b.id === 'left');
    const right = buttons.find((b) => b.id === 'right');
    if (!left || !right) throw new Error('◀ ▶ butonları yok');
    expect(right.x - left.x - left.r - right.r).toBeGreaterThanOrEqual(TOUCH.moveGapPx - EPS);
    // Kayan parmak arada girdi kaybetmesin: iki tolerans aralığı kapatır.
    expect(TOUCH.hitSlackPx * 2).toBeGreaterThanOrEqual(TOUCH.moveGapPx);
  });

  it('16:9 çentiksiz: konumlar tasarım değerleriyle (gameConfig) aynı', () => {
    for (const b of touchButtons(true, DESIGN_FRAME)) {
      expect({ x: b.x, y: b.y }).toEqual({ x: TOUCH.buttons[b.id].x, y: TOUCH.buttons[b.id].y });
    }
  });
});
