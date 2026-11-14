import type { InputSource, InputState } from './InputState';

/** Bir oyuncunun tuş eşlemesi (KeyboardEvent.code değerleri). */
export interface KeyBindings {
  readonly left: string;
  readonly right: string;
  readonly jump: string;
  readonly kick: string;
  readonly super: string;
}

interface KeyLikeEvent extends Event {
  readonly code: string;
  readonly repeat: boolean;
}

/**
 * DOM klavye olaylarını `KeyboardEvent.code` ile izler (sol/sağ Shift ayrımı, klavye
 * düzeninden bağımsızlık). Phaser'ın klavye eklentisi `keyCode` kullandığı için
 * kullanılmaz.
 *
 * "Latch": iki simülasyon adımı arasında basılıp bırakılan tuş kaybolmaz; bir sonraki
 * okumada bir kez basılı görünür. Pencere odağı kaybedilince tüm tuşlar bırakılır.
 */
export class KeyTracker {
  private readonly held = new Set<string>();
  private readonly latched = new Set<string>();
  private attached = false;

  /**
   * @param target        Olayların dinleneceği hedef (tarayıcıda `window`).
   * @param preventCodes  Varsayılan davranışı engellenecek tuşlar (sayfa kaydırma, F1 yardım…).
   */
  constructor(
    private readonly target: EventTarget,
    private readonly preventCodes: ReadonlySet<string>,
  ) {}

  attach(): this {
    if (this.attached) return this;
    this.target.addEventListener('keydown', this.onKeyDown);
    this.target.addEventListener('keyup', this.onKeyUp);
    this.target.addEventListener('blur', this.onBlur);
    this.attached = true;
    return this;
  }

  detach(): void {
    if (!this.attached) return;
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
    this.attached = false;
    this.releaseAll();
  }

  /** Tuş basılı mı ya da son okumadan beri basılıp bırakıldı mı? Latch'i tüketir. */
  poll(code: string): boolean {
    const active = this.held.has(code) || this.latched.has(code);
    this.latched.delete(code);
    return active;
  }

  /** Arayüz tuşları için kenar tetikleme: son çağrıdan beri basıldıysa bir kez true. */
  consumePress(code: string): boolean {
    return this.latched.delete(code);
  }

  /**
   * Kod listesinden herhangi biri basıldıysa true. Hepsinin latch'ini tüketir (kısa devre
   * yapmaz), böylece aynı karede basılan ikinci tuş bir sonraki kareye sarkmaz.
   */
  consumeAny(codes: readonly string[]): boolean {
    let pressed = false;
    for (const code of codes) pressed = this.latched.delete(code) || pressed;
    return pressed;
  }

  isHeld(code: string): boolean {
    return this.held.has(code);
  }

  /**
   * Tüm tuşları bırakılmış sayar. Basılı tutulan tuş, yeniden basılana kadar etkisizdir
   * (tarayıcının otomatik tekrar olayları yok sayılır). Duraklatma menüsünden dönerken
   * Enter/↑ gibi menü tuşlarının oyuncu 2'ye şut/zıplama olarak geçmemesi için kullanılır.
   */
  releaseAll(): void {
    this.held.clear();
    this.latched.clear();
  }

  private readonly onKeyDown = (event: Event): void => {
    const e = event as KeyLikeEvent;
    if (this.preventCodes.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    this.held.add(e.code);
    this.latched.add(e.code);
  };

  private readonly onKeyUp = (event: Event): void => {
    const e = event as KeyLikeEvent;
    if (this.preventCodes.has(e.code)) e.preventDefault();
    this.held.delete(e.code);
  };

  private readonly onBlur = (): void => {
    this.releaseAll();
  };
}

/** Bir oyuncunun tuş eşlemesinden her adımda `InputState` üretir. */
export class KeyboardInputSource implements InputSource {
  constructor(
    private readonly tracker: KeyTracker,
    private readonly bindings: KeyBindings,
  ) {}

  read(): InputState {
    const { tracker, bindings } = this;
    return {
      left: tracker.poll(bindings.left),
      right: tracker.poll(bindings.right),
      jump: tracker.poll(bindings.jump),
      kick: tracker.poll(bindings.kick),
      super: tracker.poll(bindings.super),
    };
  }
}
