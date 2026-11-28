import { TOUCH } from '../config/gameConfig';

/**
 * Giriş gecikmesi ölçer (Faz 2.3; QUALITY_BAR D6) — saf sınıf, zaman damgalarını çağıran verir.
 *
 * Bir dokunuşun yolu ve ölçülen aralıklar (ms):
 *
 *  dokunuş ──(sistem)──► olay işleyici ──(adım bekleme)──► simülasyon adımı ──► kare çizimi
 *  `event.timeStamp`      `performance.now()`               girdiyi ilk okuyan    adımın çizildiği
 *                                                            adım                 karenin sonu
 *
 * - `dispatch`: işletim sistemi + tarayıcı (dokunuş olayının zaman damgasından işleyiciye).
 * - `wait`: oyunun eklediği bekleme (işleyiciden girdiyi okuyan simülasyon adımına). QUALITY_BAR
 *   D6'ya göre ≤ 1 simülasyon adımı (16,7 ms) olmalı.
 * - `toFrame`: dokunuştan, sonucun çizildiği karenin gönderilmesine kadar toplam. Ekranın kendisi
 *   (GPU, birleştirici, panel) buna ~1–2 kare ekler; o kısım yalnızca kamerayla ölçülür.
 *
 * Bir basış ancak bir adım tarafından okunduktan ve o kare bittikten sonra örnek olur; aynı kareye
 * düşen birden çok basışın ilki sayılır.
 */
export interface LatencyStats {
  readonly count: number;
  readonly median: number;
  readonly p95: number;
}

export interface LatencyReport {
  readonly dispatch: LatencyStats;
  readonly wait: LatencyStats;
  readonly toFrame: LatencyStats;
}

class Ring {
  private readonly values: number[] = [];
  private next = 0;

  constructor(private readonly size: number) {}

  push(v: number): void {
    if (this.values.length < this.size) this.values.push(v);
    else this.values[this.next] = v;
    this.next = (this.next + 1) % this.size;
  }

  stats(): LatencyStats {
    const sorted = [...this.values].sort((a, b) => a - b);
    return {
      count: sorted.length,
      median: percentile(sorted, HALF),
      p95: percentile(sorted, P95),
    };
  }

  clear(): void {
    this.values.length = 0;
    this.next = 0;
  }
}

/** Sıralı dizide yüzdelik (en yakın sıra yöntemi); boşsa 0. */
export function percentile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[i] ?? 0;
}

export class LatencyProbe {
  private readonly dispatch: Ring;
  private readonly wait: Ring;
  private readonly toFrame: Ring;
  /** Bekleyen basış: olay zamanı, işleyici zamanı, okunduğu adımın zamanı (yoksa NaN). */
  private eventAt = Number.NaN;
  private handlerAt = Number.NaN;
  private stepAt = Number.NaN;
  private stepTick = 0;

  constructor(size: number = TOUCH.latency.samples) {
    this.dispatch = new Ring(size);
    this.wait = new Ring(size);
    this.toFrame = new Ring(size);
  }

  /** Bir maç butonu yeni basıldı (`eventTime`: `event.timeStamp`, `now`: `performance.now()`). */
  press(eventTime: number, now: number): void {
    if (!Number.isNaN(this.handlerAt)) return;
    // Olay zaman damgası aynı saatte değilse (eski tarayıcı) yalnızca işleyiciden ölçülür.
    this.eventAt = eventTime > 0 && eventTime <= now ? eventTime : now;
    this.handlerAt = now;
    this.stepAt = Number.NaN;
  }

  /**
   * Bir simülasyon adımı girdiyi okudu.
   * @param tick Girdinin etkisini taşıyan durumun adımı (görüntü bu adıma varınca görünür).
   */
  step(now: number, tick = 0): void {
    if (Number.isNaN(this.handlerAt) || !Number.isNaN(this.stepAt)) return;
    this.stepAt = now;
    this.stepTick = tick;
  }

  /**
   * Kare bitti (çizim gönderilmek üzere). Adımı geçmiş ve görüntüye ulaşmış bekleyen basış örnek
   * olur.
   * @param shownTick Bu karede gösterilen durumun adımı (Faz 2.7: hit-stop ve ağır çekimde görüntü
   *                  simülasyonun gerisinde kalır; basış kendi adımı gösterilince sayılır).
   */
  frame(now: number, shownTick = Number.POSITIVE_INFINITY): void {
    if (Number.isNaN(this.stepAt)) {
      // Simülasyon akmıyorken (duraklatma, tekrar) yapılan basış ölçüme girmez.
      if (now - this.handlerAt > TOUCH.latency.staleMs) this.handlerAt = Number.NaN;
      return;
    }
    if (shownTick < this.stepTick) return;
    this.dispatch.push(this.handlerAt - this.eventAt);
    this.wait.push(this.stepAt - this.handlerAt);
    this.toFrame.push(now - this.eventAt);
    this.handlerAt = Number.NaN;
    this.stepAt = Number.NaN;
  }

  report(): LatencyReport {
    return {
      dispatch: this.dispatch.stats(),
      wait: this.wait.stats(),
      toFrame: this.toFrame.stats(),
    };
  }

  clear(): void {
    this.dispatch.clear();
    this.wait.clear();
    this.toFrame.clear();
    this.handlerAt = Number.NaN;
    this.stepAt = Number.NaN;
  }
}

const HALF = 0.5;
const P95 = 0.95;

/** Uygulama genelinde tek ölçer (dokunmatik kontroller yazar, maç sahnesi adım/kare bildirir). */
export const latencyProbe = new LatencyProbe();
