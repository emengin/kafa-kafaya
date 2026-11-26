import { PERF } from '../config/gameConfig';

/**
 * Performans istatistikleri (Faz 2.4, geliştirici araçları): kare aralığı ve kare işi için sabit
 * kovalı histogramlar, son karelerin halka tamponu (grafik) ve dakika dakika özet (15 dakikalık
 * dayanıklılık testi, QUALITY_BAR P1–P3). Ölçüm sırasında bellek ayırmaz (dakika özeti hariç:
 * dakikada bir küçük nesne).
 */

const BUCKETS = Math.round(PERF.maxMs / PERF.bucketMs);
/** Kayan nokta payı: 9 / 0,1 = 89,999… kovası 90 sayılsın. */
const EPS = 1e-9;

/** 0,1 ms çözünürlüklü histogram (0–100 ms, üstü son kovada). */
export class Histogram {
  private readonly counts = new Uint32Array(BUCKETS + 1);
  count = 0;
  sum = 0;
  max = 0;

  add(ms: number): void {
    const i = Math.min(BUCKETS, Math.max(0, Math.floor(ms / PERF.bucketMs + EPS)));
    this.counts[i] = (this.counts[i] ?? 0) + 1;
    this.count++;
    this.sum += ms;
    if (ms > this.max) this.max = ms;
  }

  get mean(): number {
    return this.count > 0 ? this.sum / this.count : 0;
  }

  /** q-yüzdeliği (kovanın üst sınırı; taşma kovasında en büyük değer). */
  quantile(q: number): number {
    if (this.count === 0) return 0;
    const target = Math.ceil(q * this.count);
    let seen = 0;
    for (let i = 0; i <= BUCKETS; i++) {
      seen += this.counts[i] ?? 0;
      if (seen >= target) return i === BUCKETS ? this.max : (i + 1) * PERF.bucketMs;
    }
    return this.max;
  }

  /** `ms`'yi aşan örnek sayısı (0,1 ms çözünürlükte: `ms`'nin kovası sayılmaz). */
  countAbove(ms: number): number {
    const from = Math.min(BUCKETS, Math.floor(ms / PERF.bucketMs + EPS) + 1);
    let n = 0;
    for (let i = from; i <= BUCKETS; i++) n += this.counts[i] ?? 0;
    return n;
  }

  reset(): void {
    this.counts.fill(0);
    this.count = 0;
    this.sum = 0;
    this.max = 0;
  }
}

/** Bir dakikanın (ya da tüm oturumun) özeti. */
export interface PerfSummary {
  /** Dakika numarası (1'den başlar; oturum özetinde 0). */
  readonly minute: number;
  readonly frames: number;
  readonly fps: number;
  /** Kare işi (ana iş parçacığı: güncelleme + çizim gönderimi). */
  readonly workMean: number;
  readonly workP99: number;
  /** Bütçe içindeki kare işi payı (P1: ≥ %99). */
  readonly workInBudget: number;
  /** Kare aralığı p99 (P1: ≤ 20 ms) ve eşik aşımları. */
  readonly intervalP99: number;
  readonly late: number;
  readonly hitches: number;
  /** O dakikadaki en düşük kalite kademesi (P4) ve JS yığını (MB; yoksa −1). */
  readonly quality: number;
  readonly heapMb: number;
}

/** QUALITY_BAR P1–P3 değerlendirmesi. */
export interface PerfVerdict {
  readonly p1: boolean;
  readonly p2: boolean;
  /** İlk ve son tam dakika yoksa null. */
  readonly p3: boolean | null;
  readonly fpsDrop: number | null;
}

/**
 * Kare izleyici: her karede `frame(aralık, iş)` çağrılır. Oturum histogramları, dakika
 * histogramları, grafik için son `PERF.graph.frames` kare.
 */
export class PerfMonitor {
  readonly interval = new Histogram();
  readonly work = new Histogram();
  private readonly minuteInterval = new Histogram();
  private readonly minuteWork = new Histogram();
  readonly ringInterval = new Float32Array(PERF.graph.frames);
  readonly ringWork = new Float32Array(PERF.graph.frames);
  /** Halka tamponda bir sonraki yazılacak konum. */
  head = 0;
  readonly minutes: PerfSummary[] = [];
  /** Ölçülen süre (ms; yok sayılan dev aralıklar hariç). */
  elapsedMs = 0;
  private minuteElapsed = 0;
  private minuteQuality = Number.POSITIVE_INFINITY;
  private minuteHeap = -1;

  /**
   * @param intervalMs Önceki kareden bu yana geçen süre.
   * @param workMs Bu karenin ana iş parçacığı işi.
   * @param quality O anki kalite kademesi (bilinmiyorsa −1).
   */
  frame(intervalMs: number, workMs: number, quality = -1): void {
    if (intervalMs <= 0 || intervalMs > PERF.ignoreAboveMs) return;
    this.interval.add(intervalMs);
    this.work.add(workMs);
    this.minuteInterval.add(intervalMs);
    this.minuteWork.add(workMs);
    this.ringInterval[this.head] = intervalMs;
    this.ringWork[this.head] = workMs;
    this.head = (this.head + 1) % PERF.graph.frames;
    this.elapsedMs += intervalMs;
    this.minuteElapsed += intervalMs;
    if (quality >= 0) this.minuteQuality = Math.min(this.minuteQuality, quality);
    if (this.minuteElapsed >= PERF.msPerMinute) this.closeMinute();
  }

  /** JS yığını (MB) — dakika özetine en son değer yazılır. */
  setHeap(mb: number): void {
    this.minuteHeap = mb;
  }

  private closeMinute(): void {
    this.minutes.push(
      summarize(
        this.minutes.length + 1,
        this.minuteInterval,
        this.minuteWork,
        this.minuteElapsed,
        Number.isFinite(this.minuteQuality) ? this.minuteQuality : -1,
        this.minuteHeap,
      ),
    );
    this.minuteInterval.reset();
    this.minuteWork.reset();
    this.minuteElapsed = 0;
    this.minuteQuality = Number.POSITIVE_INFINITY;
  }

  /** Oturumun tamamı. */
  summary(quality = -1, heapMb = -1): PerfSummary {
    return summarize(0, this.interval, this.work, this.elapsedMs, quality, heapMb);
  }

  verdict(): PerfVerdict {
    const s = this.summary();
    const first = this.minutes[0];
    const last = this.minutes[this.minutes.length - 1];
    const fpsDrop = first && last && this.minutes.length > 1 ? first.fps - last.fps : null;
    return {
      p1: s.frames > 0 && s.workInBudget >= PERF.onTimeShare && s.intervalP99 <= PERF.onTimeMs,
      p2: s.frames > 0 && s.hitches === 0,
      p3: fpsDrop === null ? null : fpsDrop <= PERF.thermalFpsDrop,
      fpsDrop,
    };
  }

  reset(): void {
    this.interval.reset();
    this.work.reset();
    this.minuteInterval.reset();
    this.minuteWork.reset();
    this.ringInterval.fill(0);
    this.ringWork.fill(0);
    this.head = 0;
    this.minutes.length = 0;
    this.elapsedMs = 0;
    this.minuteElapsed = 0;
    this.minuteQuality = Number.POSITIVE_INFINITY;
    this.minuteHeap = -1;
  }
}

const MS_PER_S = 1000;

function summarize(
  minute: number,
  interval: Histogram,
  work: Histogram,
  elapsedMs: number,
  quality: number,
  heapMb: number,
): PerfSummary {
  return {
    minute,
    frames: interval.count,
    fps: elapsedMs > 0 ? (interval.count * MS_PER_S) / elapsedMs : 0,
    workMean: work.mean,
    workP99: work.quantile(PERF.onTimeShare),
    workInBudget:
      work.count > 0 ? (work.count - work.countAbove(PERF.frameBudgetMs)) / work.count : 0,
    intervalP99: interval.quantile(PERF.onTimeShare),
    late: interval.countAbove(PERF.onTimeMs),
    hitches: interval.countAbove(PERF.hitchMs),
    quality,
    heapMb,
  };
}
