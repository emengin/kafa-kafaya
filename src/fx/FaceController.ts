import { ANIM } from '../config/gameConfig';
import { approach } from './Spring';

/** Yüz ifadeleri (öncelik sırası: frozen > shocked > happy > sad > effort > grin > neutral). */
export type Expression = 'neutral' | 'effort' | 'grin' | 'happy' | 'sad' | 'shocked' | 'frozen';

/** Süreli tetiklenebilen ifadeler. */
export type TimedExpression = 'happy' | 'sad' | 'shocked';

/** Her kare yüzü belirleyen durum. */
export interface FaceContext {
  readonly frozen: boolean;
  /** Şut savruluyor ya da zıplamanın yükselişinde (efor yüzü). */
  readonly straining: boolean;
  /** Süper hazır (sırıtma). */
  readonly armed: boolean;
}

/**
 * Karakter yüzünün durumu: ifade (süreli sevinç/üzüntü/şaşkınlık, donma, efor), göz kırpma ve
 * gözlerin bir hedefe (topa) dönmesi. Yalnızca görsel; rastgelelik dışarıdan verilir (testler
 * için tohumlanabilir).
 */
export class FaceController {
  expression: Expression = 'neutral';
  /** Göz kapağının kapanma oranı (0 açık … 1 kapalı). */
  blink = 0;
  /** Bakış yönü (birim çember içinde). */
  lookX = 0;
  lookY = 0;
  private readonly timers: Record<TimedExpression, number> = { happy: 0, sad: 0, shocked: 0 };
  private persistent: TimedExpression | null = null;
  private nextBlink: number;
  private blinkTime = -1;
  private pendingDouble = false;
  private targetX = 0;
  private targetY = 0;

  constructor(private readonly random: () => number = Math.random) {
    this.nextBlink = this.blinkInterval();
  }

  /** Süreli ifade (gol atınca sevinç, yiyince üzüntü, süper etkisinde şaşkınlık). */
  trigger(expression: TimedExpression, seconds: number): void {
    this.timers[expression] = Math.max(this.timers[expression], seconds);
    if (expression === 'happy') this.timers.sad = 0;
    if (expression === 'sad') this.timers.happy = 0;
  }

  /** Maç sonu gibi kalıcı ifade (null → normale dön). */
  setPersistent(expression: TimedExpression | null): void {
    this.persistent = expression;
  }

  /** Bakılacak yön (normalize edilmesi gerekmez; uzunluk 1'i aşarsa kırpılır). */
  lookAt(dx: number, dy: number): void {
    const len = Math.hypot(dx, dy);
    this.targetX = len > 1 ? dx / len : dx;
    this.targetY = len > 1 ? dy / len : dy;
  }

  clearTimers(): void {
    this.timers.happy = 0;
    this.timers.sad = 0;
    this.timers.shocked = 0;
  }

  update(dt: number, ctx: FaceContext): void {
    for (const key of ['happy', 'sad', 'shocked'] as const) {
      this.timers[key] = Math.max(0, this.timers[key] - dt);
    }
    this.expression = this.resolve(ctx);
    this.updateBlink(dt);
    const rate = ANIM.eyes.followRate;
    this.lookX = approach(this.lookX, this.targetX, rate, dt);
    this.lookY = approach(this.lookY, this.targetY, rate, dt);
  }

  private resolve(ctx: FaceContext): Expression {
    if (ctx.frozen) return 'frozen';
    if (this.timers.shocked > 0) return 'shocked';
    if (this.timers.happy > 0 || this.persistent === 'happy') return 'happy';
    if (this.timers.sad > 0 || this.persistent === 'sad') return 'sad';
    if (ctx.straining) return 'effort';
    if (ctx.armed) return 'grin';
    return 'neutral';
  }

  /** Kırpma: üçgen biçimli kapanıp açılma; arada bir çift kırpma. Donmuşken ve sevinçte yok. */
  private updateBlink(dt: number): void {
    const b = ANIM.blink;
    if (this.blinkTime >= 0) {
      this.blinkTime += dt;
      const u = this.blinkTime / b.duration;
      if (u >= 1) {
        this.blinkTime = -1;
        this.blink = 0;
        if (this.pendingDouble) {
          this.pendingDouble = false;
          this.nextBlink = b.duration;
        }
      } else {
        this.blink = 1 - Math.abs(u * 2 - 1);
      }
      return;
    }
    this.blink = 0;
    if (this.expression === 'frozen' || this.expression === 'happy') return;
    this.nextBlink -= dt;
    if (this.nextBlink > 0) return;
    this.blinkTime = 0;
    this.pendingDouble = this.random() < b.doubleChance;
    this.nextBlink = this.blinkInterval();
  }

  private blinkInterval(): number {
    const b = ANIM.blink;
    return b.minInterval + (b.maxInterval - b.minInterval) * this.random();
  }
}
