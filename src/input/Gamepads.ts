import { GAMEPAD, PAD_CODES, type PadButton } from '../config/gameConfig';
import { setVirtual } from './virtualKeys';

/** Gamepad API'nin kullandığımız kısmı (testlerde sahte kol verilebilir). */
export interface GamepadLike {
  readonly index: number;
  readonly connected: boolean;
  readonly buttons: readonly { readonly pressed: boolean; readonly value: number }[];
  readonly axes: readonly number[];
}

export type PadState = Readonly<Record<PadButton, boolean>>;

export const PAD_BUTTONS = Object.keys(PAD_CODES[0]) as PadButton[];

const RELEASED: PadState = Object.fromEntries(PAD_BUTTONS.map((b) => [b, false])) as PadState;

function button(pad: GamepadLike, i: number): boolean {
  const b = pad.buttons[i];
  return b !== undefined && (b.pressed || b.value >= GAMEPAD.buttonPress);
}

/** Histerezisli eşik: basılıyken `release` altına inene kadar basılı kalır. */
function stick(value: number, wasDown: boolean): boolean {
  return wasDown ? value > GAMEPAD.stickRelease : value > GAMEPAD.stickPress;
}

/**
 * Kolun mantıksal durumu (standart düzen): yönler d-pad VEYA sol çubuktan (histerezisli ölü
 * bölge), diğerleri düğmelerden; analog tetikler eşikle. `prev`: önceki durum (histerezis için).
 */
export function readPad(pad: GamepadLike, prev: PadState | null): PadState {
  const p = prev ?? RELEASED;
  const btn = GAMEPAD.buttons;
  const x = pad.axes[GAMEPAD.axes.x] ?? 0;
  const y = pad.axes[GAMEPAD.axes.y] ?? 0;
  const sx = Number.isFinite(x) ? x : 0;
  const sy = Number.isFinite(y) ? y : 0;
  return {
    left: stick(-sx, p.left) || button(pad, btn.left),
    right: stick(sx, p.right) || button(pad, btn.right),
    up: stick(-sy, p.up) || button(pad, btn.up),
    down: stick(sy, p.down) || button(pad, btn.down),
    a: button(pad, btn.a),
    b: button(pad, btn.b),
    x: button(pad, btn.x),
    y: button(pad, btn.y),
    lb: button(pad, btn.lb),
    rb: button(pad, btn.rb),
    lt: button(pad, btn.lt),
    rt: button(pad, btn.rt),
    start: button(pad, btn.start),
    back: button(pad, btn.back),
  };
}

/**
 * Kolları yoklar ve düğme değişimlerini sanal tuş olarak yollar. En fazla `GAMEPAD.maxPads` kol,
 * bağlanma sırasıyla slotlara: slot 1 → P1, slot 2 → P2. Bir kol çıkarılınca slotu boşalır
 * (diğer kolun slotu değişmez) ve basılı düğmeleri bırakılır.
 */
export class GamepadPoller {
  private readonly slots: (number | null)[] = new Array<number | null>(GAMEPAD.maxPads).fill(null);
  private readonly states: (PadState | null)[] = new Array<PadState | null>(GAMEPAD.maxPads).fill(
    null,
  );
  /** Bir kol çıkarılınca çağrılır (maçı duraklatmak için). */
  onDisconnect: ((slot: number) => void) | null = null;

  constructor(
    private readonly getPads: () => readonly (GamepadLike | null)[],
    private readonly emit: (slot: number, button: PadButton, pressed: boolean) => void,
  ) {}

  /** Bağlı (slota atanmış) kol sayısı. */
  get connected(): number {
    return this.slots.filter((s) => s !== null).length;
  }

  poll(): void {
    let pads: readonly (GamepadLike | null)[];
    try {
      pads = this.getPads();
    } catch {
      pads = [];
    }
    const live = pads.filter((p): p is GamepadLike => p !== null && p.connected);
    // Çıkarılan kollar.
    this.slots.forEach((index, slot) => {
      if (index === null || live.some((p) => p.index === index)) return;
      this.releaseSlot(slot);
      this.slots[slot] = null;
      this.onDisconnect?.(slot);
    });
    // Yeni kollar boş slotlara (kol sırasıyla).
    for (const pad of live) {
      if (this.slots.includes(pad.index)) continue;
      const free = this.slots.indexOf(null);
      if (free < 0) break;
      this.slots[free] = pad.index;
      this.states[free] = null;
    }
    this.slots.forEach((index, slot) => {
      const pad = live.find((p) => p.index === index);
      if (!pad) return;
      const prev = this.states[slot] ?? RELEASED;
      const next = readPad(pad, this.states[slot] ?? null);
      for (const b of PAD_BUTTONS) if (next[b] !== prev[b]) this.emit(slot, b, next[b]);
      this.states[slot] = next;
    });
  }

  private releaseSlot(slot: number): void {
    const prev = this.states[slot];
    if (prev) for (const b of PAD_BUTTONS) if (prev[b]) this.emit(slot, b, false);
    this.states[slot] = null;
  }
}

/** Tarayıcı kolları → sanal tuşlar (`Pad1A`, `Pad2Left`…). */
export const gamepads = new GamepadPoller(
  () =>
    typeof navigator !== 'undefined' && 'getGamepads' in navigator ? navigator.getGamepads() : [],
  (slot, b, pressed) => {
    const codes = PAD_CODES[slot];
    if (codes) setVirtual(codes[b], pressed);
  },
);
