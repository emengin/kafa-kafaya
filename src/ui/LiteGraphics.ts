import Phaser from 'phaser';
import { segmentsFor } from './shapes';

type Point = { x: number; y: number };

/** Phaser Graphics komut kimlikleri (`phaser/src/gameobjects/graphics/Commands.js`). */
const CMD = { FILL_STYLE: 7, FILL_TRIANGLE: 10 } as const;
/** Hiçbir komuta karşılık gelmeyen değer: çizici atlar (komut dizisinin kullanılmayan kuyruğu). */
const NOOP = -1;
/** Komut uzunlukları (kimlik + bağımsız değişkenler). */
const TRI_LEN = 7;
const STYLE_LEN = 3;
/** Üçgen komutunda köşe koordinatlarının sırası (kimlikten sonra). */
const ARG = { X0: 1, Y0: 2, X1: 3, Y1: 4, X2: 5, Y2: 6 } as const;
/** Dolgu stili komutunda renk ve saydamlık. */
const STYLE = { COLOR: 1, ALPHA: 2 } as const;
/** Toplu çizim köşesinin bileşenleri: konum, doku koordinatı, doku birimi, ton kipi, ton. */
const V = { X: 0, Y: 1, U: 2, V: 3, UNIT: 4, EFFECT: 5, TINT: 6 } as const;
/** Üçgen başına köşe; en az yelpaze dilimi; çeyrek daire oranı. */
const TRI_VERTS = 3;
const MIN_FAN = 3;
const QUARTER = 4;
const WHITE = 0xffffff;

type RenderFn = (...args: unknown[]) => void;

/** WebGL toplu çizim hattının (MultiPipeline) kullandığımız iç alanları. */
interface BatchPipeline {
  readonly vertexViewF32?: Float32Array;
  readonly vertexViewU32?: Uint32Array;
  vertexCount: number;
  readonly vertexCapacity: number;
  readonly currentUnit: number;
  readonly currentBatch: { start: number; count: number } | null;
  readonly currentShader?: { vertexComponentCount: number };
  flush(): void;
  setTexture2D(texture?: unknown): number;
}

interface PipelineManager {
  set(pipeline: unknown, gameObject: unknown): unknown;
  preBatch(gameObject: unknown): void;
  postBatch(gameObject: unknown): void;
}

/** Graphics dolgusunun renk tonu kipi (Phaser: dokuyu yok say, rengi kullan). */
const TINT_FILL = 2;
const ALPHA_MAX = 255;
const ALPHA_SHIFT = 24;
const BYTE = 0xff;

/** Yol tamponu kapasitesi (nokta). Taşan noktalar yok sayılır (bir yol için fazlasıyla yeter). */
const PATH_CAPACITY = 2048;
/** `moveTo` ile başlayan alt yolları ayıran işaret. */
const BREAK = Number.NaN;
const TWO_PI = Math.PI * 2;
/** Opak çizgilerde parça uçları yarım kalınlık uzatılır (eklemlerde boşluk kalmasın). */
const OPAQUE = 0.99;

/**
 * Her karede yeniden çizilen Graphics nesneleri için çöp üretmeyen sürüm (Faz 7, performans).
 *
 * Profilde ayırmaların büyük kısmı iki kaynaktan geliyordu:
 * 1. Phaser'ın WebGL çizicisi yol komutlarını (daire, elips, yay, çizgi, yuvarlak köşe) her karede
 *    `Path`/`Point` nesnelerine çevirip `earcut` ile üçgenler.
 * 2. `Graphics.clear()` komut dizisini `length = 0` ile kısaltır; V8 bu durumda dizinin bellek
 *    alanını bırakır ve dizi her karede baştan büyütülür (kopyalayarak).
 *
 * Bu sınıf aynı çizim arayüzünü korur ama her şeyi doğrudan `FILL_TRIANGLE`/`FILL_RECT`/
 * `FILL_STYLE` komutlarına çevirir (çizici bunları ayırmasız toplu çizime yollar) ve komutları
 * bir imleçle yazar: dizi hiç kısalmaz; çizimden hemen önce kullanılmayan kuyruk işlemsiz bir
 * değerle doldurulur. Dolgular dışbükey yelpaze, çizgiler parça başına iki üçgenlik dörtgen
 * (opak çizgide uçlar hafif uzatılır). Yol noktaları önceden ayrılmış bir tamponda.
 *
 * Kısıt: dolgular dışbükey kabul edilir (kullandığımız yüz parçaları, yaylar ve elipsler öyle).
 */
export class LiteGraphics extends Phaser.GameObjects.Graphics {
  private strokeWidth = 1;
  private strokeColor = WHITE;
  private strokeAlpha = 1;
  private fillColorValue = WHITE;
  private fillAlphaValue = 1;
  private readonly path = new Float64Array(PATH_CAPACITY * 2);
  private count = 0;
  private subStart = 0;
  /** Komut dizisinde yazma konumu ve son çizimde anlamlı olan bölümün sonu. */
  private cursor = 0;
  private liveEnd = 0;

  constructor(scene: Phaser.Scene) {
    super(scene);
    scene.add.existing(this);
    // Çizimden hemen önce kuyruğu temizle (Phaser her iki çiziciyi de örnek üzerinden çağırır).
    const proto = Phaser.GameObjects.Graphics.prototype as unknown as {
      renderWebGL: RenderFn;
      renderCanvas: RenderFn;
    };
    const self = this as unknown as { renderWebGL: RenderFn; renderCanvas: RenderFn };
    self.renderWebGL = (...args: unknown[]): void => {
      this.seal();
      const [renderer, , camera, parentMatrix] = args as [
        { pipelines: PipelineManager },
        unknown,
        Phaser.Cameras.Scene2D.Camera,
        Phaser.GameObjects.Components.TransformMatrix | undefined,
      ];
      if (!this.renderFast(renderer.pipelines, camera, parentMatrix)) {
        proto.renderWebGL.apply(this, args);
      }
    };
    self.renderCanvas = (...args: unknown[]): void => {
      this.seal();
      proto.renderCanvas.apply(this, args);
    };
  }

  override clear(): this {
    this.count = 0;
    this.cursor = 0;
    return this;
  }

  override lineStyle(lineWidth: number, color: number, alpha = 1): this {
    // Çizgiler üçgenlere çevrildiği için çiziciye çizgi stili komutu gerekmez.
    this.strokeWidth = lineWidth;
    this.strokeColor = color;
    this.strokeAlpha = alpha;
    return this;
  }

  override fillStyle(color: number, alpha = 1): this {
    this.fillColorValue = color;
    this.fillAlphaValue = alpha;
    this.writeFillStyle(color, alpha);
    return this;
  }

  override fillRect(x: number, y: number, width: number, height: number): this {
    // İki üçgen: hızlı çizici yalnızca üçgen ve dolgu stili komutlarını işler.
    this.tri(x, y, x + width, y, x + width, y + height);
    this.tri(x, y, x + width, y + height, x, y + height);
    return this;
  }

  override fillTriangle(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): this {
    this.tri(x0, y0, x1, y1, x2, y2);
    return this;
  }

  // ───────────── Yol ─────────────

  override beginPath(): this {
    this.count = 0;
    this.subStart = 0;
    return this;
  }

  override moveTo(x: number, y: number): this {
    if (this.count > 0) this.push(BREAK, BREAK);
    this.subStart = this.count;
    this.push(x, y);
    return this;
  }

  override lineTo(x: number, y: number): this {
    this.push(x, y);
    return this;
  }

  override closePath(): this {
    if (this.count > this.subStart) {
      this.push(this.path[this.subStart * 2] ?? 0, this.path[this.subStart * 2 + 1] ?? 0);
    }
    return this;
  }

  override arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    anticlockwise = false,
  ): this {
    let sweep = endAngle - startAngle;
    if (anticlockwise && sweep > 0) sweep -= TWO_PI;
    if (!anticlockwise && sweep < 0) sweep += TWO_PI;
    const n = Math.max(2, Math.ceil((segmentsFor(radius) * Math.abs(sweep)) / TWO_PI) + 1);
    for (let i = 0; i < n; i++) {
      const a = startAngle + (sweep * i) / (n - 1);
      this.push(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
    }
    return this;
  }

  override strokePath(): this {
    this.beginStroke();
    for (let i = 1; i < this.count; i++) this.segment(i - 1, i);
    this.endStroke();
    return this;
  }

  override fillPath(): this {
    let start = 0;
    for (let i = 0; i <= this.count; i++) {
      if (i === this.count || Number.isNaN(this.path[i * 2] ?? BREAK)) {
        this.fan(start, i);
        start = i + 1;
      }
    }
    return this;
  }

  // ───────────── Hazır şekiller ─────────────

  override lineBetween(x1: number, y1: number, x2: number, y2: number): this {
    this.beginStroke();
    this.quad(x1, y1, x2, y2);
    this.endStroke();
    return this;
  }

  override fillCircle(x: number, y: number, radius: number): this {
    return this.fillEllipse(x, y, radius * 2, radius * 2, segmentsFor(radius));
  }

  override strokeCircle(x: number, y: number, radius: number): this {
    return this.strokeEllipse(x, y, radius * 2, radius * 2, segmentsFor(radius));
  }

  override fillEllipse(x: number, y: number, width: number, height: number, smoothness = 24): this {
    const rx = width / 2;
    const ry = height / 2;
    const n = Math.max(MIN_FAN, smoothness);
    let px = x + rx;
    let py = y;
    for (let i = 1; i <= n; i++) {
      const a = (TWO_PI * i) / n;
      const nx = x + Math.cos(a) * rx;
      const ny = y + Math.sin(a) * ry;
      this.tri(x, y, px, py, nx, ny);
      px = nx;
      py = ny;
    }
    return this;
  }

  override strokeEllipse(
    x: number,
    y: number,
    width: number,
    height: number,
    smoothness = 24,
  ): this {
    this.beginPath();
    const n = Math.max(MIN_FAN, smoothness);
    for (let i = 0; i <= n; i++) {
      const a = (TWO_PI * i) / n;
      this.push(x + (Math.cos(a) * width) / 2, y + (Math.sin(a) * height) / 2);
    }
    return this.strokePath();
  }

  override fillPoints(
    points: Point[],
    _closeShape?: boolean,
    _closePath?: boolean,
    endIndex = points.length,
  ): this {
    const first = points[0];
    if (!first) return this;
    for (let i = 2; i < endIndex; i++) {
      const b = points[i - 1];
      const c = points[i];
      if (b && c) this.tri(first.x, first.y, b.x, b.y, c.x, c.y);
    }
    return this;
  }

  override strokePoints(
    points: Point[],
    closeShape = false,
    closePath = false,
    endIndex = points.length,
  ): this {
    this.beginPath();
    for (let i = 0; i < endIndex; i++) {
      const p = points[i];
      if (p) this.push(p.x, p.y);
    }
    if (closeShape || closePath) this.closePath();
    return this.strokePath();
  }

  override fillRoundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number | Phaser.Types.GameObjects.Graphics.RoundedRectRadius = 20,
  ): this {
    const r = Math.min(
      typeof radius === 'number' ? radius : (radius.tl ?? 0),
      width / 2,
      height / 2,
    );
    if (r <= 0) return this.fillRect(x, y, width, height);
    this.fillRect(x + r, y, width - r * 2, height);
    this.fillRect(x, y + r, r, height - r * 2);
    this.fillRect(x + width - r, y + r, r, height - r * 2);
    this.cornerFan(x + r, y + r, r, Math.PI);
    this.cornerFan(x + width - r, y + r, r, -Math.PI / 2);
    this.cornerFan(x + width - r, y + height - r, r, 0);
    this.cornerFan(x + r, y + height - r, r, Math.PI / 2);
    return this;
  }

  override strokeRoundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number | Phaser.Types.GameObjects.Graphics.RoundedRectRadius = 20,
  ): this {
    const r = Math.min(
      typeof radius === 'number' ? radius : (radius.tl ?? 0),
      width / 2,
      height / 2,
    );
    this.beginPath();
    this.arc(x + r, y + r, r, Math.PI, Math.PI * (2 - 0.5));
    this.arc(x + width - r, y + r, r, -Math.PI / 2, 0);
    this.arc(x + width - r, y + height - r, r, 0, Math.PI / 2);
    this.arc(x + r, y + height - r, r, Math.PI / 2, Math.PI);
    this.closePath();
    return this.strokePath();
  }

  override strokeRect(x: number, y: number, width: number, height: number): this {
    this.beginPath();
    this.push(x, y);
    this.push(x + width, y);
    this.push(x + width, y + height);
    this.push(x, y + height);
    this.push(x, y);
    return this.strokePath();
  }

  // ───────────── İç yardımcılar ─────────────

  private push(x: number, y: number): void {
    if (this.count >= PATH_CAPACITY) return;
    this.path[this.count * 2] = x;
    this.path[this.count * 2 + 1] = y;
    this.count++;
  }

  /** Çeyrek daire yelpazesi (`from` açısından 90°). */
  private cornerFan(cx: number, cy: number, r: number, from: number): void {
    const n = Math.max(2, Math.ceil(segmentsFor(r) / QUARTER));
    let px = cx + Math.cos(from) * r;
    let py = cy + Math.sin(from) * r;
    for (let i = 1; i <= n; i++) {
      const a = from + (Math.PI / 2) * (i / n);
      const nx = cx + Math.cos(a) * r;
      const ny = cy + Math.sin(a) * r;
      this.tri(cx, cy, px, py, nx, ny);
      px = nx;
      py = ny;
    }
  }

  /** Tampondaki [from, to) noktalarını ilk noktadan yelpaze ile doldurur. */
  private fan(from: number, to: number): void {
    const p = this.path;
    const x0 = p[from * 2] ?? 0;
    const y0 = p[from * 2 + 1] ?? 0;
    for (let i = from + 2; i < to; i++) {
      this.tri(
        x0,
        y0,
        p[(i - 1) * 2] ?? 0,
        p[(i - 1) * 2 + 1] ?? 0,
        p[i * 2] ?? 0,
        p[i * 2 + 1] ?? 0,
      );
    }
  }

  private beginStroke(): void {
    this.writeFillStyle(this.strokeColor, this.strokeAlpha);
  }

  private endStroke(): void {
    this.writeFillStyle(this.fillColorValue, this.fillAlphaValue);
  }

  /**
   * Komut dizisinde `n` sayılık yer açar (dizi yalnızca büyür; kısalmaz). Yazımlar doğrudan
   * dizine yapılır: küçük fonksiyonlar satır içine alınır ve sayılar kutulanmaz (çöp yok).
   */
  private reserve(n: number): number[] {
    const cb = this.commandBuffer as number[];
    const need = this.cursor + n;
    while (cb.length < need) cb.push(NOOP);
    return cb;
  }

  private writeFillStyle(color: number, alpha: number): void {
    const cb = this.reserve(STYLE_LEN);
    const c = this.cursor;
    cb[c] = CMD.FILL_STYLE;
    cb[c + STYLE.COLOR] = color;
    cb[c + STYLE.ALPHA] = alpha;
    this.cursor = c + STYLE_LEN;
  }

  private tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): void {
    const cb = this.reserve(TRI_LEN);
    const c = this.cursor;
    cb[c] = CMD.FILL_TRIANGLE;
    cb[c + ARG.X0] = x0;
    cb[c + ARG.Y0] = y0;
    cb[c + ARG.X1] = x1;
    cb[c + ARG.Y1] = y1;
    cb[c + ARG.X2] = x2;
    cb[c + ARG.Y2] = y2;
    this.cursor = c + TRI_LEN;
  }

  /**
   * Hızlı WebGL çizimi: komutları okuyup üçgen köşelerini doğrudan toplu çizim hattının köşe
   * tamponuna yazar (Phaser'ın Graphics çizicisi her üçgen için çift duyarlıklı bağımsız
   * değişkenlerle çağrı yapıyor ve her karede ~18 MB/sn kutulanmış sayı üretiyordu). Hat beklenen
   * alanlara sahip değilse false döner ve Phaser'ın kendi çizicisi kullanılır.
   */
  private renderFast(
    pipelines: PipelineManager,
    camera: Phaser.Cameras.Scene2D.Camera,
    parentMatrix: Phaser.GameObjects.Components.TransformMatrix | undefined,
  ): boolean {
    if (this.cursor === 0) return true;
    const p = pipelines.set(this.pipeline, this) as BatchPipeline;
    const f32 = p.vertexViewF32;
    const u32 = p.vertexViewU32;
    const shader = p.currentShader;
    if (!f32 || !u32 || !shader) return false;
    camera.addToRenderList(this);
    pipelines.preBatch(this);
    const m = Phaser.GameObjects.GetCalcMatrix(this, camera, parentMatrix).calc;
    const ma = m.a;
    const mb = m.b;
    const mc = m.c;
    const md = m.d;
    const me = m.e;
    const mf = m.f;
    const alpha = camera.alpha * this.alpha;
    const cb = this.commandBuffer as number[];
    const end = this.cursor;
    let tint = 0;
    let i = 0;
    while (i < end) {
      const cmd = cb[i] ?? NOOP;
      if (cmd === CMD.FILL_TRIANGLE) {
        const x0 = cb[i + ARG.X0] ?? 0;
        const y0 = cb[i + ARG.Y0] ?? 0;
        const x1 = cb[i + ARG.X1] ?? 0;
        const y1 = cb[i + ARG.Y1] ?? 0;
        const x2 = cb[i + ARG.X2] ?? 0;
        const y2 = cb[i + ARG.Y2] ?? 0;
        i += TRI_LEN;
        if (p.vertexCount + TRI_VERTS > p.vertexCapacity) p.flush();
        let unit = p.currentUnit;
        if (!p.currentBatch) unit = p.setTexture2D();
        const comps = shader.vertexComponentCount;
        let o = p.vertexCount * comps;
        f32[o + V.X] = x0 * ma + y0 * mc + me;
        f32[o + V.Y] = x0 * mb + y0 * md + mf;
        f32[o + V.U] = 0;
        f32[o + V.V] = 0;
        f32[o + V.UNIT] = unit;
        f32[o + V.EFFECT] = TINT_FILL;
        u32[o + V.TINT] = tint;
        o += comps;
        f32[o + V.X] = x1 * ma + y1 * mc + me;
        f32[o + V.Y] = x1 * mb + y1 * md + mf;
        f32[o + V.U] = 0;
        f32[o + V.V] = 1;
        f32[o + V.UNIT] = unit;
        f32[o + V.EFFECT] = TINT_FILL;
        u32[o + V.TINT] = tint;
        o += comps;
        f32[o + V.X] = x2 * ma + y2 * mc + me;
        f32[o + V.Y] = x2 * mb + y2 * md + mf;
        f32[o + V.U] = 1;
        f32[o + V.V] = 1;
        f32[o + V.UNIT] = unit;
        f32[o + V.EFFECT] = TINT_FILL;
        u32[o + V.TINT] = tint;
        p.vertexCount += TRI_VERTS;
        const batch = p.currentBatch;
        if (batch) batch.count = p.vertexCount - batch.start;
      } else if (cmd === CMD.FILL_STYLE) {
        const a = (((cb[i + STYLE.ALPHA] ?? 1) * alpha * ALPHA_MAX) | 0) & BYTE;
        tint = ((a << ALPHA_SHIFT) | (cb[i + STYLE.COLOR] ?? 0)) >>> 0;
        i += STYLE_LEN;
      } else {
        i++;
      }
    }
    pipelines.postBatch(this);
    return true;
  }

  /** Önceki çizimden kalan, bu karede yazılmamış komutları işlemsiz yapar. */
  private seal(): void {
    const cb = this.commandBuffer as number[];
    for (let i = this.cursor; i < this.liveEnd; i++) cb[i] = NOOP;
    this.liveEnd = this.cursor;
  }

  private segment(a: number, b: number): void {
    const p = this.path;
    const x1 = p[a * 2] ?? 0;
    const y1 = p[a * 2 + 1] ?? 0;
    const x2 = p[b * 2] ?? 0;
    const y2 = p[b * 2 + 1] ?? 0;
    if (Number.isNaN(x1) || Number.isNaN(x2)) return;
    this.quad(x1, y1, x2, y2);
  }

  /** Kalınlığı `strokeWidth` olan çizgi parçası: iki üçgenlik dörtgen. */
  private quad(x1: number, y1: number, x2: number, y2: number): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < Number.EPSILON) return;
    const h = this.strokeWidth / 2;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy * h;
    const ny = ux * h;
    const ext = this.strokeAlpha >= OPAQUE ? h : 0;
    const ax = x1 - ux * ext;
    const ay = y1 - uy * ext;
    const bx = x2 + ux * ext;
    const by = y2 + uy * ext;
    this.tri(ax + nx, ay + ny, bx + nx, by + ny, bx - nx, by - ny);
    this.tri(ax + nx, ay + ny, bx - nx, by - ny, ax - nx, ay - ny);
  }
}
