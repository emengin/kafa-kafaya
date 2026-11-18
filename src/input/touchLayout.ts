import { TOUCH, TOUCH_CODES } from '../config/gameConfig';

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

export function touchButtons(training: boolean): TouchButton[] {
  const ids = training ? [...GAME_IDS, ...TRAINING_IDS] : GAME_IDS;
  return ids.map((id) => ({ id, code: TOUCH_CODES[id], ...TOUCH.buttons[id] }));
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
