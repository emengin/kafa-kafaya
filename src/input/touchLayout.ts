import { TOUCH, TOUCH_CODES } from '../config/gameConfig';
import {
  anchorShift,
  BOTTOM_LEFT,
  BOTTOM_RIGHT,
  TOP_LEFT,
  type Anchor,
  type ScreenFrame,
} from '../platform/screenFrame';

export type TouchButtonId = keyof typeof TOUCH.buttons;

export interface TouchButton {
  readonly id: TouchButtonId;
  readonly code: string;
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/** Oyun butonları (her modda) ve antrenman butonları. */
const GAME_IDS: readonly TouchButtonId[] = ['left', 'right', 'jump', 'kick', 'super', 'pause'];
const TRAINING_IDS: readonly TouchButtonId[] = ['reset', 'fill'];

/**
 * Butonların sabitlendiği kenar (Faz 2.2): hareket sol alta, zıpla/şut/süper sağ alta, duraklat ve
 * antrenman butonları sol üste. `TOUCH.buttons` konumları tasarım çerçevesinde (16:9, çentiksiz);
 * her ekranda butonun güvenli alan kenarına uzaklığı aynı kalır.
 */
export const TOUCH_ANCHORS: Record<TouchButtonId, Anchor> = {
  left: BOTTOM_LEFT,
  right: BOTTOM_LEFT,
  jump: BOTTOM_RIGHT,
  kick: BOTTOM_RIGHT,
  super: BOTTOM_RIGHT,
  pause: TOP_LEFT,
  reset: TOP_LEFT,
  fill: TOP_LEFT,
};

/**
 * Moda göre butonlar; `frame` verilirse konumlar o ekran çerçevesine göre (dünya koordinatı),
 * verilmezse tasarım çerçevesine göre.
 */
export function touchButtons(training: boolean, frame?: ScreenFrame): TouchButton[] {
  const ids = training ? [...GAME_IDS, ...TRAINING_IDS] : GAME_IDS;
  return ids.map((id) => {
    const b = TOUCH.buttons[id];
    const s = frame ? anchorShift(frame, TOUCH_ANCHORS[id]) : { x: 0, y: 0 };
    return { id, code: TOUCH_CODES[id], x: b.x + s.x, y: b.y + s.y, r: b.r };
  });
}

/**
 * Dokunuş noktalarının (mantıksal koordinat) bastığı butonlar. Her parmak en yakın butonu basar
 * (yarıçap + tolerans içinde); böylece parmak ← ile → arasında kaydırılabilir ve iki parmak aynı
 * anda farklı butonlara basabilir (çoklu dokunuş).
 */
export function pressedButtons(
  points: readonly { readonly x: number; readonly y: number }[],
  buttons: readonly TouchButton[],
  slack: number = TOUCH.hitSlackPx,
): Set<TouchButtonId> {
  const out = new Set<TouchButtonId>();
  for (const pt of points) {
    let best: TouchButton | null = null;
    let bestD = Infinity;
    for (const b of buttons) {
      const d = Math.hypot(pt.x - b.x, pt.y - b.y);
      if (d <= b.r + slack && d < bestD) {
        best = b;
        bestD = d;
      }
    }
    if (best) out.add(best.id);
  }
  return out;
}
