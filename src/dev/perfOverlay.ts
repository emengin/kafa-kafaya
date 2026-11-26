import { PERF } from '../config/gameConfig';
import type { PerfMonitor, PerfSummary, PerfVerdict } from './perfStats';

/**
 * Kare süresi grafiği (Faz 2.4, yalnızca geliştirici derlemesi). Oyun tuvalinin üstünde ayrı bir
 * DOM tuvali: oyunun çizim hattına (toplu çizim, çizim çağrısı) karışmaz, her sahnede görünür.
 * Her karede değil `PERF.graph.refreshMs`'de bir çizilir (ölçtüğü şeyi etkilemesin).
 *
 * Grafik: son 240 karenin aralığı (çubuk: yeşil ≤ 20 ms, turuncu > 20 ms, kırmızı > 50 ms) ve
 * ana iş parçacığı işi (mavi çizgi); kılavuz çizgiler 16,7 ve 33,3 ms.
 */

/** Grafiğin altındaki ek satırlar (rollback, bellek, dayanıklılık testi). */
export interface OverlayExtras {
  readonly quality: number;
  readonly lines: readonly string[];
  /** Dayanıklılık testi bittiyse sonuç (yoksa null). */
  readonly soak: { readonly verdict: PerfVerdict; readonly minutes: readonly PerfSummary[] } | null;
}

const G = PERF.graph;
const MS_PER_S = 1000;
const SECONDS_PER_MINUTE = 60;
/** Kılavuz çizgileri: 60 Hz'de 1 ve 2 vsync. */
const GUIDES = [PERF.frameBudgetMs, PERF.frameBudgetMs * 2];
/** Grafiğin üstündeki metin satırı sayısı. */
const HEAD_LINES = 2;
const MAX_LINES = 9;

export class PerfOverlay {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private visible = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly monitor: PerfMonitor,
    private readonly extras: () => OverlayExtras,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'perf-overlay';
    const st = this.canvas.style;
    st.position = 'fixed';
    st.top = `max(${G.padPx}px, env(safe-area-inset-top))`;
    st.right = `max(${G.padPx}px, env(safe-area-inset-right))`;
    st.pointerEvents = 'none';
    st.zIndex = '50';
    st.display = 'none';
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D bağlam yok');
    this.ctx = ctx;
    document.body.appendChild(this.canvas);
  }

  get isVisible(): boolean {
    return this.visible;
  }

  setVisible(on: boolean): void {
    this.visible = on;
    this.canvas.style.display = on ? 'block' : 'none';
    if (on && !this.timer) {
      this.timer = setInterval(() => {
        this.draw();
      }, G.refreshMs);
      this.draw();
    } else if (!on && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private draw(): void {
    const m = this.monitor;
    const x = this.extras();
    const s = m.summary();
    const lines: string[] = [
      `FPS ${s.fps.toFixed(1)}  iş ${s.workMean.toFixed(1)} ms (p99 ${s.workP99.toFixed(1)})  ` +
        `kalite ${x.quality < 0 ? '-' : x.quality}`,
      `aralık p99 ${s.intervalP99.toFixed(1)}  >20ms ${s.late}  >50ms ${s.hitches}  ` +
        clock(m.elapsedMs),
      ...x.lines,
    ];
    if (x.soak) {
      const v = x.soak.verdict;
      const ok = (b: boolean | null): string => (b === null ? '?' : b ? 'GEÇTİ' : 'KALDI');
      lines.push(
        `${PERF.soakMinutes} dk BİTTİ  P1 ${ok(v.p1)}  P2 ${ok(v.p2)}  P3 ${ok(v.p3)}` +
          (v.fpsDrop === null ? '' : ` (düşüş ${v.fpsDrop.toFixed(1)} FPS)`),
        `FPS/dk: ${x.soak.minutes.map((mm) => mm.fps.toFixed(0)).join(' ')}`,
      );
    }
    const shown = lines.slice(0, MAX_LINES);
    const dpr = globalThis.devicePixelRatio || 1;
    const textH = shown.length * G.linePx + G.padPx;
    const w = G.widthPx + G.padPx * 2;
    const h = G.heightPx + textH + G.padPx * 2;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;
    }
    const c = this.ctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    c.fillStyle = G.background;
    c.fillRect(0, 0, w, h);
    c.font = `${G.fontPx}px monospace`;
    c.fillStyle = G.text;
    c.textBaseline = 'top';
    const graphTop = G.padPx + HEAD_LINES * G.linePx;
    shown.forEach((line, i) => {
      const y =
        i < HEAD_LINES
          ? G.padPx + i * G.linePx
          : graphTop + G.heightPx + G.padPx + (i - HEAD_LINES) * G.linePx;
      c.fillText(line, G.padPx, y);
    });

    // Grafik: en eski kare solda.
    const n = G.frames;
    const barW = G.widthPx / n;
    const yOf = (ms: number): number =>
      graphTop + G.heightPx - (Math.min(ms, G.maxMs) / G.maxMs) * G.heightPx;
    for (let i = 0; i < n; i++) {
      const k = (m.head + i) % n;
      const iv = m.ringInterval[k] ?? 0;
      if (iv <= 0) continue;
      c.fillStyle = iv > PERF.hitchMs ? G.hitch : iv > PERF.onTimeMs ? G.late : G.interval;
      const top = yOf(iv);
      c.fillRect(G.padPx + i * barW, top, Math.max(1, barW), graphTop + G.heightPx - top);
    }
    c.strokeStyle = G.work;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const k = (m.head + i) % n;
      const y = yOf(m.ringWork[k] ?? 0);
      if (i === 0) c.moveTo(G.padPx, y);
      else c.lineTo(G.padPx + i * barW, y);
    }
    c.stroke();
    c.strokeStyle = G.guide;
    for (const g of GUIDES) {
      const y = Math.round(yOf(g)) + HALF_PX;
      c.beginPath();
      c.moveTo(G.padPx, y);
      c.lineTo(G.padPx + G.widthPx, y);
      c.stroke();
    }
  }

  destroy(): void {
    this.setVisible(false);
    this.canvas.remove();
  }
}

/** İnce çizgiler piksel ortasına otursun. */
const HALF_PX = 0.5;

/** mm:ss */
function clock(ms: number): string {
  const total = Math.floor(ms / MS_PER_S);
  const mm = Math.floor(total / SECONDS_PER_MINUTE);
  const ss = total % SECONDS_PER_MINUTE;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}
