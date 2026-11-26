import { DISPLAY, TOUCH, TOUCH_CODES, TOUCH_CODES_P2 } from '../config/gameConfig';
import {
  anchorShift,
  BOTTOM_CENTER,
  BOTTOM_LEFT,
  BOTTOM_RIGHT,
  TOP_LEFT,
  type Anchor,
  type ScreenFrame,
} from '../platform/screenFrame';

/**
 * Dokunmatik buton yerleşimi (Faz 6; kenar sabitleme Faz 2.2; v2 Faz 2.3) — saf fonksiyonlar,
 * Phaser ve DOM'dan bağımsız (birim testli).
 *
 * Tüm konumlar tasarım çerçevesinde (16:9, çentiksiz, 1280×720) yazılır ve bir kenara sabitlenir:
 * hareket sol alta, eylemler sağ alta (solak modunda tersi), duraklat ve antrenman butonları sol
 * üste. Her ekranda butonun güvenli alan kenarına uzaklığı aynı kalır. Tasarım çerçevesi
 * desteklenen en dar çerçevedir (güvenli alan genişliği her ekranda ≥ 1280): orada geçerli olan
 * bir düzen (sınırların içinde, boşluklar ≥ `minGapPx`) her ekranda geçerlidir. Düzenleyicide
 * kaydedilen düzen de bu yüzden tasarım çerçevesinde saklanır.
 */

export type TouchButtonId = keyof typeof TOUCH.buttons;

/** Oyuncunun kendi konumunu ve boyutunu ayarlayabildiği maç butonları. */
export const GAME_BUTTONS = ['left', 'right', 'jump', 'kick', 'super'] as const;
export type GameButtonId = (typeof GAME_BUTTONS)[number];

/** Hareket (◀ ▶), eylem (Zıpla, Şut, Süper), arayüz (duraklat, antrenman). */
export type TouchGroup = 'move' | 'action' | 'ui';
export type PlayerIndex = 0 | 1;

export interface ButtonPlacement {
  /** Merkez, tasarım çerçevesinde (px). */
  readonly x: number;
  readonly y: number;
  /** Boyut çarpanı (varsayılan yarıçapa göre). */
  readonly scale: number;
}

export type Placements = Readonly<Record<GameButtonId, ButtonPlacement>>;

/** Oyuncunun kontrol düzeni (kayıt: `src/save/touchPrefs.ts`). */
export interface TouchPrefs {
  /** Sağ elini kullanan düzende (solak modu kapalıyken) konumlar. */
  readonly placements: Placements;
  readonly opacity: number;
  readonly leftHanded: boolean;
}

export interface TouchButton {
  /** Benzersiz anahtar: P1 ve arayüz butonlarında kimliğin kendisi, P2'de `p2.` önekli. */
  readonly key: string;
  readonly id: TouchButtonId;
  readonly player: PlayerIndex;
  readonly group: TouchGroup;
  /** Basılınca yollanan sanal tuş kodu. */
  readonly code: string;
  readonly x: number;
  readonly y: number;
  /** Görsel yarıçap (px). */
  readonly r: number;
  /** Dokunma alanı yarıçapı (px; görselden büyük, en az `hitFloorDp`). */
  readonly hitR: number;
}

export function groupOf(id: TouchButtonId): TouchGroup {
  if (id === 'left' || id === 'right') return 'move';
  if (id === 'jump' || id === 'kick' || id === 'super') return 'action';
  return 'ui';
}

export function defaultPlacements(): Placements {
  const b = TOUCH.buttons;
  const p = (id: GameButtonId): ButtonPlacement => ({ x: b[id].x, y: b[id].y, scale: 1 });
  return {
    left: p('left'),
    right: p('right'),
    jump: p('jump'),
    kick: p('kick'),
    super: p('super'),
  };
}

export const DEFAULT_TOUCH_PREFS: TouchPrefs = {
  placements: defaultPlacements(),
  opacity: TOUCH.alpha,
  leftHanded: false,
};

/**
 * Yatay ayna (solak modu, 2 oyuncuda P2): x → genişlik − x. ◀ ile ▶ yer değiştirir; böylece ◀
 * yine solda kalır (yalnızca küme diğer kenara geçer).
 */
export function mirrorPlacements(p: Placements): Placements {
  const m = (src: ButtonPlacement): ButtonPlacement => ({
    x: DISPLAY.width - src.x,
    y: src.y,
    scale: src.scale,
  });
  return {
    left: m(p.right),
    right: m(p.left),
    jump: m(p.jump),
    kick: m(p.kick),
    super: m(p.super),
  };
}

/** Ekranda görünen konumlar (solak modunda ayna). */
export function displayedPlacements(prefs: TouchPrefs): Placements {
  return prefs.leftHanded ? mirrorPlacements(prefs.placements) : prefs.placements;
}

/** Hareket sol alta, eylemler sağ alta sabitli; solak modunda tersi. */
export function gameAnchor(id: GameButtonId, leftHanded: boolean): Anchor {
  const moveSide = groupOf(id) === 'move';
  return moveSide !== leftHanded ? BOTTOM_LEFT : BOTTOM_RIGHT;
}

/** Butonun görsel yarıçapı (px). */
export function buttonRadius(id: GameButtonId, scale: number): number {
  return TOUCH.buttons[id].r * scale;
}

/**
 * Dokunma alanı yarıçapı: maç kontrollerinde görselin `reachRatio` kadar dışı, arayüz
 * butonlarında yalnızca `uiReachPx`; ikisinde de en az `hitFloorDp` çap (QUALITY_BAR D1, D3).
 *
 * @param pxPerDp Ekranda 1 dp'nin oyun pikseli karşılığı (yatay telefonda ~2, tablette < 1).
 */
export function hitRadius(group: TouchGroup, r: number, pxPerDp: number): number {
  const ui = group === 'ui';
  const reach = ui ? r + TOUCH.uiReachPx : r * (1 + TOUCH.reachRatio);
  const floorDp = ui ? TOUCH.hitFloorDp.ui : TOUCH.hitFloorDp.game;
  return Math.max(reach, (floorDp / 2) * pxPerDp);
}

export interface TouchLayoutOptions {
  /** Antrenman: topu sıfırla ve barı doldur butonları da var. */
  readonly training?: boolean;
  /** Yerel 2 oyuncu: her oyuncuya ekranın bir yarısı (düzen ayarlanamaz, opaklık ortak). */
  readonly twoPlayer?: boolean;
  readonly prefs?: TouchPrefs;
  /** Verilirse konumlar o ekran çerçevesine göre (dünya koordinatı), yoksa tasarım çerçevesine. */
  readonly frame?: ScreenFrame;
  /** Ekranın dp ölçeği (yoksa `TOUCH.designPxPerDp`). */
  readonly pxPerDp?: number;
}

/** Moda ve oyuncunun düzenine göre butonlar. */
export function touchButtons(opts: TouchLayoutOptions = {}): TouchButton[] {
  const prefs = opts.prefs ?? DEFAULT_TOUCH_PREFS;
  const pxPerDp = opts.pxPerDp ?? TOUCH.designPxPerDp;
  const out: TouchButton[] = [];
  const add = (
    key: string,
    id: TouchButtonId,
    player: PlayerIndex,
    code: string,
    pos: { x: number; y: number },
    r: number,
    anchor: Anchor,
  ): void => {
    const s = opts.frame ? anchorShift(opts.frame, anchor) : { x: 0, y: 0 };
    const group = groupOf(id);
    out.push({
      key,
      id,
      player,
      group,
      code,
      x: pos.x + s.x,
      y: pos.y + s.y,
      r,
      hitR: hitRadius(group, r, pxPerDp),
    });
  };

  if (opts.twoPlayer) {
    const src = TOUCH.twoPlayer.buttons;
    const p1 = {} as Record<GameButtonId, ButtonPlacement>;
    for (const id of GAME_BUTTONS) p1[id] = { x: src[id].x, y: src[id].y, scale: 1 };
    const p2 = mirrorPlacements(p1);
    for (const id of GAME_BUTTONS) {
      const move = groupOf(id) === 'move';
      add(id, id, 0, TOUCH_CODES[id], p1[id], src[id].r, move ? BOTTOM_LEFT : BOTTOM_CENTER);
      add(
        `p2.${id}`,
        id,
        1,
        TOUCH_CODES_P2[id],
        p2[id],
        src[id].r,
        move ? BOTTOM_RIGHT : BOTTOM_CENTER,
      );
    }
  } else {
    const placed = displayedPlacements(prefs);
    for (const id of GAME_BUTTONS) {
      const p = placed[id];
      add(
        id,
        id,
        0,
        TOUCH_CODES[id],
        p,
        buttonRadius(id, p.scale),
        gameAnchor(id, prefs.leftHanded),
      );
    }
  }
  const uiIds: TouchButtonId[] = opts.training ? ['pause', 'reset', 'fill'] : ['pause'];
  for (const id of uiIds) {
    const b = TOUCH.buttons[id];
    add(id, id, 0, TOUCH_CODES[id], b, b.r, TOP_LEFT);
  }
  return out;
}

// ───────────────────── Düzenleyici kuralları (tasarım çerçevesi) ─────────────────────

/** Buton tamamen tasarım çerçevesinin içinde ve üst bandın (skor tabelası) altında mı? */
export function insideBounds(x: number, y: number, r: number): boolean {
  return (
    x - r >= -EPS &&
    x + r <= DISPLAY.width + EPS &&
    y - r >= TOUCH.editor.minTopPx - EPS &&
    y + r <= DISPLAY.height + EPS
  );
}

/** Merkezi, buton sınırların içinde kalacak şekilde kırpar. */
export function clampToBounds(x: number, y: number, r: number): { x: number; y: number } {
  return {
    x: Math.min(Math.max(x, r), DISPLAY.width - r),
    y: Math.min(Math.max(y, TOUCH.editor.minTopPx + r), DISPLAY.height - r),
  };
}

/** `id` butonunun çakıştığı ilk buton (kenarlar arası < `minGapPx`); yoksa null. */
export function conflictOf(p: Placements, id: GameButtonId): GameButtonId | null {
  const a = p[id];
  const ra = buttonRadius(id, a.scale);
  for (const other of GAME_BUTTONS) {
    if (other === id) continue;
    const b = p[other];
    const gap = Math.hypot(a.x - b.x, a.y - b.y) - ra - buttonRadius(other, b.scale);
    if (gap < TOUCH.minGapPx - EPS) return other;
  }
  return null;
}

/** Düzen geçerli mi: her buton sınırların içinde, hiçbiri çakışmıyor, boyutlar aralıkta. */
export function placementsValid(p: Placements): boolean {
  const { minScale, maxScale } = TOUCH.editor;
  return GAME_BUTTONS.every((id) => {
    const b = p[id];
    return (
      b.scale >= minScale - EPS &&
      b.scale <= maxScale + EPS &&
      insideBounds(b.x, b.y, buttonRadius(id, b.scale)) &&
      conflictOf(p, id) === null
    );
  });
}

/** Kayan nokta payı (px). */
const EPS = 1e-6;
