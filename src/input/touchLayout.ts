import { DISPLAY, TOUCH, TOUCH_CODES, TOUCH_CODES_P2 } from '../config/gameConfig';
import {
  anchorShift,
  BOTTOM_CENTER,
  BOTTOM_LEFT,
  BOTTOM_RIGHT,
  DESIGN_FRAME,
  TOP_LEFT,
  type Anchor,
  type Rect,
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
  /**
   * Oyuncu düzeni değiştirip kaydetti mi? Değiştirmediyse `placements` yok sayılır ve ekrana göre
   * büyütülen varsayılan kullanılır (`effectivePlacements`).
   */
  readonly custom: boolean;
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
  /**
   * Hareket butonlarında hareket bölgesi (dünya koordinatı): bu dikdörtgene inen parmak, hiçbir
   * butonun dokunma alanında değilse hareket grubuna bağlanır. Dış yanda ve altta ekran kenarına
   * kadar uzanır (orada basılacak başka şey yok); diğer butonlarda null.
   */
  readonly zone: Rect | null;
}

export function groupOf(id: TouchButtonId): TouchGroup {
  if (id === 'left' || id === 'right') return 'move';
  if (id === 'jump' || id === 'kick' || id === 'super') return 'action';
  return 'ui';
}

/**
 * Varsayılan düzen. `k` > 1 ise (küçük ekran, bkz. `autoScale`) butonlar ve köşelerine
 * uzaklıkları birlikte büyür: kendi köşesine sabitli kümenin içindeki boşluklar da büyür, düzen
 * geçerli kalır (k ≤ `maxAutoScale` için birim testli).
 */
export function defaultPlacements(k = 1): Placements {
  const b = TOUCH.buttons;
  const p = (id: GameButtonId): ButtonPlacement => {
    const cornerX = groupOf(id) === 'move' ? 0 : DISPLAY.width;
    return {
      x: cornerX + (b[id].x - cornerX) * k,
      y: DISPLAY.height + (b[id].y - DISPLAY.height) * k,
      scale: k,
    };
  };
  return {
    left: p('left'),
    right: p('right'),
    jump: p('jump'),
    kick: p('kick'),
    super: p('super'),
  };
}

/**
 * Varsayılan düzenin büyütme çarpanı (Faz 2.3 telefon testi: iPhone'da butonlar küçük). Butonlar
 * oyun pikseliyle, yani ekran yüksekliğiyle orantılı; tarayıcı çubukları yüksekliği yiyen
 * telefonda (iPhone Safari) fiziksel boyut küçülür. ◀ ▶ en az `minVisualDp` çapında olacak kadar
 * büyütülür; 0,1 adımlarına yukarı yuvarlanır, en çok `maxAutoScale`.
 */
export function autoScale(pxPerDp: number): number {
  const need = ((TOUCH.minVisualDp / 2) * pxPerDp) / TOUCH.buttons.left.r;
  const steps = Math.ceil((need - 1) / SCALE_STEP - SCALE_TOLERANCE);
  const k = 1 + Math.max(0, steps) * SCALE_STEP;
  return Math.round(Math.min(k, TOUCH.maxAutoScale) * SCALE_DIGITS) / SCALE_DIGITS;
}

const SCALE_STEP = 0.1;
/** Yuvarlamada bu kadar (adımın oranı) aşım yok sayılır: 72,5 dp için büyütme yapılmaz. */
const SCALE_TOLERANCE = 0.2;
const SCALE_DIGITS = 100;

export const DEFAULT_TOUCH_PREFS: TouchPrefs = {
  placements: defaultPlacements(),
  custom: false,
  opacity: TOUCH.alpha,
  leftHanded: false,
};

/**
 * Bu ekranda kullanılan konumlar (sağ el düzeni): oyuncu düzenlediyse onunki, yoksa ekrana göre
 * büyütülmüş varsayılan.
 */
export function effectivePlacements(prefs: TouchPrefs, pxPerDp: number): Placements {
  return prefs.custom ? prefs.placements : defaultPlacements(autoScale(pxPerDp));
}

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
      zone: null,
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
    const canonical = effectivePlacements(prefs, pxPerDp);
    const placed = prefs.leftHanded ? mirrorPlacements(canonical) : canonical;
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
  return withMoveZones(out, (opts.frame ?? DESIGN_FRAME).view);
}

/**
 * Her oyuncunun ◀ ▶ çiftine hareket bölgesi ekler: butonları kapsayan kutu; dış yanda ve altta
 * ekranın kenarına kadar, üstte `moveZone.upPx`, iç yanda `moveZone.innerPx` uzar. İç yan, aynı
 * yükseklikteki en yakın eylem butonuna olan boşluğun yarısını geçmez (yanlış basma olmasın).
 */
function withMoveZones(buttons: TouchButton[], view: Rect): TouchButton[] {
  const zones = new Map<PlayerIndex, Rect>();
  for (const player of [0, 1] as const) {
    const move = buttons.filter((b) => b.player === player && b.group === 'move');
    if (move.length === 0) continue;
    const minX = Math.min(...move.map((b) => b.x - b.r));
    const maxX = Math.max(...move.map((b) => b.x + b.r));
    const top = Math.min(...move.map((b) => b.y - b.r)) - TOUCH.moveZone.upPx;
    const outerLeft = (minX + maxX) / 2 < view.x + view.width / 2;
    const actions = buttons.filter(
      (b) => b.group === 'action' && b.y + b.r > top && (outerLeft ? b.x > maxX : b.x < minX),
    );
    const room = actions.length
      ? Math.min(...actions.map((b) => (outerLeft ? b.x - b.r - maxX : minX - (b.x + b.r)) / 2))
      : Infinity;
    const inner = Math.max(0, Math.min(TOUCH.moveZone.innerPx, room));
    const x0 = outerLeft ? view.x : minX - inner;
    const x1 = outerLeft ? maxX + inner : view.x + view.width;
    const bottom = view.y + view.height;
    zones.set(player, { x: x0, y: top, width: x1 - x0, height: bottom - top });
  }
  return buttons.map((b) => (b.group === 'move' ? { ...b, zone: zones.get(b.player) ?? null } : b));
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
