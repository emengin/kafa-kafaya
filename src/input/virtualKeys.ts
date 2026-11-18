/**
 * Sanal tuşlar (Faz 6): gamepad ve dokunmatik butonlar, klavye olayıyla aynı biçimde
 * (`code`, `repeat`) bu veri yoluna "keydown"/"keyup" yollar. Her `KeyTracker` hem `window`'u
 * hem bu veri yolunu dinler; böylece menüler, seçim ekranı ve oyun girdisi tek bir yoldan okur
 * (latch, `releaseAll`, kenar tetikleme aynen geçerli). Kodlar `PAD_CODES` / `TOUCH_CODES`.
 */
export class VirtualKeyEvent extends Event {
  readonly repeat = false;

  constructor(
    type: 'keydown' | 'keyup',
    readonly code: string,
  ) {
    super(type);
  }
}

export const virtualKeys = new EventTarget();

/** Basılı sanal tuşlar (yeni açılan sahnenin izleyicisi bilmez; bilerek: klavyeyle aynı). */
const down = new Set<string>();

export function pressVirtual(code: string): void {
  if (down.has(code)) return;
  down.add(code);
  virtualKeys.dispatchEvent(new VirtualKeyEvent('keydown', code));
}

export function releaseVirtual(code: string): void {
  if (!down.delete(code)) return;
  virtualKeys.dispatchEvent(new VirtualKeyEvent('keyup', code));
}

/** Basılı/bırakılmış durumu tek çağrıda ayarlar (yalnızca değişimde olay yollar). */
export function setVirtual(code: string, pressed: boolean): void {
  if (pressed) pressVirtual(code);
  else releaseVirtual(code);
}

export function isVirtualDown(code: string): boolean {
  return down.has(code);
}
