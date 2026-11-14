/**
 * Oyuncuların her simülasyon adımında aldığı soyut kontrol durumu.
 * Oyuncu varlıkları klavyeyi/dokunmatiği doğrudan okumaz; klavye, dokunmatik,
 * gamepad ve AI yalnızca bu yapıyı üretir. Gol tekrarı da bu dizileri kaydeder.
 */
export interface InputState {
  readonly left: boolean;
  readonly right: boolean;
  readonly jump: boolean;
  readonly kick: boolean;
  readonly super: boolean;
}

/** Her adımda bir InputState üreten kaynak (klavye, dokunmatik, gamepad, AI, tekrar). */
export interface InputSource {
  /** `tick`: o anki simülasyon adımı. Kaynak bu adım için durumu döndürür. */
  read(tick: number): InputState;
}

export const EMPTY_INPUT: InputState = Object.freeze({
  left: false,
  right: false,
  jump: false,
  kick: false,
  super: false,
});

/** İki InputState'i mantıksal VEYA ile birleştirir (örn. klavye + gamepad). */
export function mergeInputs(a: InputState, b: InputState): InputState {
  return {
    left: a.left || b.left,
    right: a.right || b.right,
    jump: a.jump || b.jump,
    kick: a.kick || b.kick,
    super: a.super || b.super,
  };
}
