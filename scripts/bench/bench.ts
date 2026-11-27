/**
 * Derleme karşılaştırma tezgâhı (Faz 2.0): bir ya da daha fazla üretim derlemesini aynı
 * senaryolarla, aynı tarayıcıda, sırayla dönüşümlü koşarak yan yana ölçer.
 *
 * Çalıştırma (önce `npm run build`):
 *   npm run bench                                                  # yalnızca dist
 *   npm run bench -- --dirs eski/dist,dist --labels "Phaser 3,Phaser 4"
 *   npm run bench -- --only size,startup --runs 7
 *   npm run bench -- --only frame --cpu 1,4,6 --seconds 20
 *   npm run bench -- --only determinism --ticks 3600
 *   npm run bench -- --only shots --out tmp/shots                  # ekran görüntüleri
 *   npm run bench -- --json sonuc.json                             # ham sonuçlar
 *
 * Ölçümler:
 * - **size:** `assets/*.js` gzip boyutu (zlib varsayılan seviye; Vite'ın derleme raporundan
 *   ~%0,5 düşük çıkabilir, derlemeler arası karşılaştırma için tutarlı).
 * - **startup:** sayfa gezintisinin başlangıcından menü sahnesinin açılmasına kadar geçen süre
 *   (yükleme ekranındaki doku üretimi dahil). Her koşu temiz tarayıcı bağlamında, service worker
 *   engelli; medyan.
 * - **frame:** AI vs AI (Zor–Zor), `?quality=high`, debug katmanı gizli. "Kare işi" = Phaser'ın
 *   `prestep` → `postrender` arası (güncelleme + çizim gönderimi, ana iş parçacığı). CPU yavaşlatma
 *   DevTools `Emulation.setCPUThrottlingRate` ile (düşük güçlü cihaz benzetimi).
 * - **determinism:** aynı tohumlu AI vs AI maçlarında her `CHECK_EVERY` adımda bir tam
 *   simülasyon durumunun kanonik özeti (`GameSim.checksum`, Faz 2.7; bu yöntemi olmayan eski
 *   derlemelerde `JSON.stringify(saveState())` özeti — iki tür birbiriyle karşılaştırılamaz).
 *   Derlemeler birbiriyle ve kendi tekrarıyla (gol tekrarı aynı adımı yeniden simüle eder)
 *   karşılaştırılır. Kare hızı ve zamanlama farklı olsa da durum her adımda birebir aynı olmalıdır.
 * - **shots:** menü, karakter seçimi, maç ve mobil görünüm ekran görüntüleri (görsel karşılaştırma).
 * - **alloc** (Faz 2.4): aynı maç senaryosunda kare başına bellek ayırma (DevTools örnekleyici yığın
 *   profili, GC'de toplananlar dahil), en çok ayıran işlevler, GC duraklamaları (iz kaydındaki
 *   MinorGC/MajorGC olayları: toplam ve en uzun). Kare ölçümünden ayrı koşulur (profil yükü kare
 *   süresine karışmasın).
 *
 * Kare ölçümü ayrıca kare başına WebGL çizim çağrısı (`drawElements`/`drawArrays`) ve doku bağlama
 * sayısını verir.
 *
 * Gerçek cihaz (Faz 2.4): `--device` → USB'deki Android telefonda, uygulamanın WebView'ında ölçer
 * (Capacitor debug derlemesi kurulu ve açık olmalı; WebView hata ayıklaması debug derlemesinde
 * açıktır). Derlemeler bilgisayardan sunulur, telefon `adb reverse` ile erişir: aynı WebView'da
 * derlemeler yeniden kurulum olmadan dönüşümlü ölçülür. `--app` → derleme sunmadan uygulamanın kendi
 * paketini (`https://localhost/`) ölçer. Cihazda CPU yavaşlatma yoktur (`--cpu 1`).
 *   npm run bench -- --device --dirs eski-mobil,dist-mobile --only frame --runs 3 --seconds 20
 *   npm run bench -- --device --app --only frame,alloc
 *
 * Sunucu: derleme klasörü yerleşik bir statik sunucuyla sunulur (web derlemesi `/kafa-kafaya/`,
 * mobil derleme `/` altında; `index.html`'den anlaşılır; her derleme ayrı bağlantı noktasında).
 * Yerelde kurulu Chrome, CI'da Playwright'ın Chromium'u.
 */
import { execFileSync } from 'node:child_process';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer, type Server } from 'node:http';
import { homedir } from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';

const WEB_BASE = '/kafa-kafaya/';
const FIRST_PORT = 4300;
/** Cihazdaki WebView'ın DevTools soketinin bilgisayara yönlendirildiği bağlantı noktası. */
const DEVICE_CDP_PORT = 9333;
const APP_ID = 'com.emengin.kafakafaya';
/** Uygulamanın kendi paketi (Capacitor `androidScheme: https`). */
const APP_URL = 'https://localhost/';
/** Yığın örnekleme aralığı (bayt): küçük → daha doğru, daha yavaş. */
const HEAP_SAMPLING_BYTES = 16_384;
/** En çok ayıran kaç işlev raporlansın. */
const TOP_ALLOCATORS = 6;
/** İz kaydında GC olaylarının adları (Chrome iz kategorileri `devtools.timeline`, `v8`). */
const GC_EVENTS = new Set(['MinorGC', 'MajorGC']);
const US_PER_MS = 1000;
const CAPACITOR_INJECT_ERROR = 'Error injecting safe area CSS';
/** Chrome iz kaydında sayfanın ana iş parçacığının adı. */
const MAIN_THREAD = 'CrRendererMain';
/** Ayrıca listelenen uzun GC duraklaması eşiği (ms). */
const LONG_GC_MS = 10;
const CHECK_EVERY = 30;
const MS_PER_S = 1000;
/** Vite'ın derleme raporuyla aynı birim (1 kB = 1000 bayt). */
const KB = 1000;
const P95 = 0.95;
const P99 = 0.99;
/** "Uzun kare" eşiği (ms): 50 Hz ekranın kare süresi; QUALITY_BAR'daki 60 FPS hedefinin üstü. */
const LONG_FRAME_MS = 20;
/** Takılma eşiği (ms): QUALITY_BAR P2 — oyun akarken 50 ms'yi aşan kare olmamalı. */
const HITCH_MS = 50;
const SCENE_TIMEOUT_MS = 60_000;
/** Kare ölçümünden önce maçın oturması için beklenen süre. */
const WARMUP_MS = 3000;
/** Determinizm koşusunda kancanın en geç kurulması gereken adım (öncesi kaydedilmez). */
const HOOK_DEADLINE_TICK = CHECK_EVERY * 2;
/** Simülasyon adım hızı (Hz): bekleme süresini hesaplamak için (gameConfig LOOP.stepHz). */
const STEP_HZ = 60;
/** Determinizm koşusunda beklenen en düşük adım hızının payı (yavaş makinede zaman aşımı payı). */
const SLOW_FACTOR = 4;

const MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/** Determinizm senaryoları: farklı karakterler, zorluklar ve tohumlar. */
const DETERMINISM_CASES = [
  'cpu=hard&cpu1=hard&seed=11&c1=kor&c2=ayaz',
  'cpu=hard&cpu1=medium&seed=5&c1=simsek&c2=pamuk',
] as const;
const FRAME_QUERY = 'cpu=hard&cpu1=hard&seed=11&c1=kor&c2=ayaz&duration=600&quality=high';

type Metric = 'size' | 'startup' | 'frame' | 'alloc' | 'determinism' | 'shots';
const ALL_METRICS: readonly Metric[] = [
  'size',
  'startup',
  'frame',
  'alloc',
  'determinism',
  'shots',
];
const DEFAULT_METRICS: readonly Metric[] = ['size', 'startup', 'frame', 'determinism'];

interface Options {
  dirs: string[];
  labels: string[];
  only: Metric[];
  runs: number;
  cpu: number[];
  startupCpu: number[];
  seconds: number;
  ticks: number;
  out: string;
  json: string | null;
  /** Kare/ayırma senaryosunun URL sorgusu (varsayılan `FRAME_QUERY`). */
  query: string;
  /** Android cihazda (uygulamanın WebView'ı) ölç. */
  device: boolean;
  /** Cihazda derleme sunmadan uygulamanın kendi paketini ölç. */
  app: boolean;
  /** Ayırma raporunda listelenecek işlev sayısı. */
  top: number;
}

/** Testlerin `?debug=1` ile eriştiği oyun nesnesinin tezgâhın kullandığı kısmı. */
interface BenchGame {
  events: { on(event: string, fn: () => void): void };
  renderer: { type: number; gl?: WebGLRenderingContext | null };
  loop: { actualFps: number };
  scene: {
    isActive(key: string): boolean;
    getScene(key: string): BenchScene | null;
  };
}
interface BenchScene {
  sim?: BenchSim;
  debug?: { setVisible(v: boolean): void };
}
interface BenchSim {
  tick: number;
  step: (this: BenchSim, inputs: unknown) => unknown;
  saveState: (this: BenchSim) => unknown;
  /** Faz 2.7'den beri: kanonik durum özeti. Eski derlemelerde yok. */
  checksum?: (this: BenchSim) => string;
}
/** Determinizm özetinin türü: kanonik (`checksum`) ya da eski derlemelerde JSON özeti. */
type DigestKind = 'checksum' | 'json';
interface BenchWindow {
  __KAFA_GAME__?: BenchGame;
  __BENCH__?: {
    frames: number[];
    intervals: number[];
    draws: number[];
    binds: number[];
    hashes: Record<number, string>;
    conflicts: number;
    firstTick: number;
    kind?: DigestKind;
  };
}

interface Build {
  label: string;
  dir: string;
  url: string;
  /** Derlemeyi sunan yerel sunucu (`--app`: yok, uygulamanın kendi paketi). */
  server: Server | null;
}

interface FrameStats {
  frames: number;
  avg: number;
  p95: number;
  p99: number;
  max: number;
  long: number;
  fps: number;
  /** Ortalama çizim çağrısı ve doku bağlama / kare. */
  draws: number;
  binds: number;
  /** Kare aralığı p99 (ms) ve 50 ms'yi aşan aralık sayısı (QUALITY_BAR P1/P2). */
  intervalP99: number;
  hitches: number;
}

interface AllocStats {
  frames: number;
  /** Kare başına ayrılan bayt (örnekleyici tahmini, GC'de toplananlar dahil). */
  bytesPerFrame: number;
  /** GC: toplam süre (ms), en uzun duraklama (ms), olay sayısı; ölçüm süresi (ms). */
  gcTotal: number;
  gcMax: number;
  gcCount: number;
  spanMs: number;
  top: { fn: string; bytesPerFrame: number }[];
}

interface DeterminismRun {
  query: string;
  firstTick: number;
  lastTick: number;
  checks: number;
  conflicts: number;
  hashes: Record<number, string>;
  kind: DigestKind;
}

// ───────────── Argümanlar ─────────────

function parseArgs(argv: readonly string[]): Options {
  const opts: Options = {
    dirs: ['dist'],
    labels: [],
    only: [...DEFAULT_METRICS],
    runs: 3,
    cpu: [1, 6],
    startupCpu: [1, 4],
    seconds: 10,
    ticks: 2400,
    out: 'test-results/bench-shots',
    json: null,
    query: FRAME_QUERY,
    device: false,
    app: false,
    top: TOP_ALLOCATORS,
  };
  const list = (v: string): string[] =>
    v
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  const nums = (v: string): number[] => list(v).map(Number);
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const value = argv[i + 1] ?? '';
    switch (key) {
      case '--dirs':
        opts.dirs = list(value);
        break;
      case '--labels':
        opts.labels = list(value);
        break;
      case '--only':
        opts.only = list(value).filter((m): m is Metric => ALL_METRICS.includes(m as Metric));
        break;
      case '--runs':
        opts.runs = Number(value);
        break;
      case '--cpu':
        opts.cpu = nums(value);
        break;
      case '--startup-cpu':
        opts.startupCpu = nums(value);
        break;
      case '--seconds':
        opts.seconds = Number(value);
        break;
      case '--ticks':
        opts.ticks = Number(value);
        break;
      case '--out':
        opts.out = value;
        break;
      case '--json':
        opts.json = value;
        break;
      case '--query':
        opts.query = value;
        break;
      case '--device':
        opts.device = true;
        continue;
      case '--app':
        opts.app = true;
        continue;
      case '--top':
        opts.top = Number(value);
        break;
      default:
        throw new Error(`Bilinmeyen argüman: ${key ?? ''}`);
    }
    i++;
  }
  return opts;
}

// ───────────── Statik sunucu ─────────────

/** Derlemenin taban yolu: web derlemesi `/kafa-kafaya/`, mobil derleme `/` (index.html'den). */
function buildBase(dir: string): string {
  const html = readFileSync(path.join(dir, 'index.html'), 'utf-8');
  return html.includes(`"${WEB_BASE}assets/`) ? WEB_BASE : '/';
}

function serve(dir: string, port: number, base: string): Promise<Server> {
  const root = path.resolve(dir);
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (!url.pathname.startsWith(base)) {
      res.writeHead(404).end();
      return;
    }
    let rel = decodeURIComponent(url.pathname.slice(base.length));
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    const file = path.resolve(root, rel);
    if (!file.startsWith(root + path.sep) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve(server);
    });
  });
}

// ───────────── İstatistik ─────────────

function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return Number.NaN;
  const i = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[i] ?? Number.NaN;
}

function median(values: readonly number[]): number {
  return quantile(
    [...values].sort((a, b) => a - b),
    0.5,
  );
}

function frameStats(
  frames: readonly number[],
  intervals: readonly number[],
  draws: readonly number[],
  binds: readonly number[],
): FrameStats {
  const sorted = [...frames].sort((a, b) => a - b);
  const sum = frames.reduce((a, b) => a + b, 0);
  const span = intervals.reduce((a, b) => a + b, 0);
  const mean = (v: readonly number[]): number =>
    v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
  return {
    frames: frames.length,
    avg: sum / Math.max(1, frames.length),
    p95: quantile(sorted, P95),
    p99: quantile(sorted, P99),
    max: sorted[sorted.length - 1] ?? Number.NaN,
    long: intervals.filter((d) => d > LONG_FRAME_MS).length,
    fps: span > 0 ? (intervals.length * MS_PER_S) / span : 0,
    draws: mean(draws),
    binds: mean(binds),
    intervalP99: quantile(
      [...intervals].sort((a, b) => a - b),
      P99,
    ),
    hitches: intervals.filter((d) => d > HITCH_MS).length,
  };
}

const ms = (v: number): string => `${v.toFixed(2)} ms`;
const kb = (bytes: number): string => `${(bytes / KB).toFixed(1)} kB`;

function table(head: readonly string[], rows: readonly (readonly string[])[]): string {
  const line = (cells: readonly string[]): string => `| ${cells.join(' | ')} |`;
  return [line(head), line(head.map(() => '---')), ...rows.map(line)].join('\n');
}

// ───────────── Tarayıcı ─────────────

interface OpenPage {
  context: BrowserContext;
  page: Page;
  errors: string[];
  close: () => Promise<void>;
}

/** Cihazda ölçülüyorsa uygulamanın WebView'ındaki tek sayfa (her ölçüm onu yeniden kullanır). */
let devicePage: Page | null = null;

async function newPage(
  browser: Browser,
  cpuRate: number,
  viewport = { width: 1280, height: 720 },
): Promise<OpenPage> {
  const errors: string[] = [];
  const onError = (e: Error): void => {
    errors.push(e.message);
  };
  const onConsole = (msg: { type(): string; text(): string }): void => {
    // Capacitor'un yerel SystemBars eklentisi her sayfa yüklemesinde güvenli alan CSS'i enjekte
    // eder; sayfa geçişinin ortasına denk gelirse (belge yokken) konsola hata yazar — oyunla ilgisiz.
    if (msg.type() === 'error' && !msg.text().startsWith(CAPACITOR_INJECT_ERROR)) {
      errors.push(msg.text());
    }
  };
  if (devicePage) {
    if (cpuRate !== 1) throw new Error('Cihazda CPU yavaşlatma yok: --cpu 1');
    const page = devicePage;
    page.on('pageerror', onError);
    page.on('console', onConsole);
    return {
      context: page.context(),
      page,
      errors,
      close: async () => {
        page.off('pageerror', onError);
        page.off('console', onConsole);
        // Sonraki ölçüm temiz başlasın: maç sahnesi ve sesler kapansın.
        await page.goto('about:blank');
      },
    };
  }
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('pageerror', onError);
  page.on('console', onConsole);
  if (cpuRate !== 1) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
  }
  return { context, page, errors, close: () => context.close() };
}

// ───────────── Android cihaz ─────────────

/** SDK'daki adb (PATH'teki eski adb sürüm çakışması yaşatabiliyor). */
function adbPath(): string {
  const sdk =
    process.env.ANDROID_HOME ??
    process.env.ANDROID_SDK_ROOT ??
    path.join(homedir(), 'AppData', 'Local', 'Android', 'Sdk');
  const exe = path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
  return existsSync(exe) ? exe : 'adb';
}

function adb(...args: string[]): string {
  return execFileSync(adbPath(), args, { encoding: 'utf-8' }).trim();
}

/** Cihaz adı (model, Android, WebView sürümü) — rapor başlığı için. */
function deviceInfo(): string {
  const prop = (k: string): string => adb('shell', 'getprop', k);
  const webview = /versionName=(\S+)/.exec(
    adb('shell', 'dumpsys', 'package', 'com.google.android.webview'),
  );
  return (
    `${prop('ro.product.model')} (${prop('ro.soc.model')}), Android ` +
    `${prop('ro.build.version.release')}, WebView ${webview?.[1] ?? '?'}`
  );
}

/**
 * Uygulamanın WebView'ına bağlanır: uygulama açık değilse açılır, DevTools soketi bilgisayara
 * yönlendirilir, derlemelerin bağlantı noktaları telefona ters yönlendirilir (`adb reverse`).
 */
async function connectDevice(ports: readonly number[]): Promise<Browser> {
  // `pidof` uygulama kapalıyken hata koduyla döner.
  const running = (): string => {
    try {
      return adb('shell', 'pidof', APP_ID);
    } catch {
      return '';
    }
  };
  let pid = running();
  if (pid === '') {
    adb('shell', 'monkey', '-p', APP_ID, '-c', 'android.intent.category.LAUNCHER', '1');
    await new Promise((r) => setTimeout(r, APP_START_MS));
    pid = running();
  }
  adb('forward', `tcp:${DEVICE_CDP_PORT}`, `localabstract:webview_devtools_remote_${pid}`);
  for (const port of ports) adb('reverse', `tcp:${port}`, `tcp:${port}`);
  const browser = await chromium.connectOverCDP(`http://localhost:${DEVICE_CDP_PORT}`);
  const page = browser.contexts()[0]?.pages()[0];
  if (!page) throw new Error('WebView sayfası bulunamadı (uygulama açık mı?)');
  devicePage = page;
  return browser;
}
const APP_START_MS = 4000;

async function waitScene(page: Page, key: string): Promise<void> {
  await page.waitForFunction(
    (k) => (window as BenchWindow).__KAFA_GAME__?.scene.isActive(k) === true,
    key,
    { polling: 'raf', timeout: SCENE_TIMEOUT_MS },
  );
}

async function rendererInfo(page: Page): Promise<string> {
  return page.evaluate(() => {
    const g = (window as BenchWindow).__KAFA_GAME__;
    if (!g) return '?';
    const gl = g.renderer.gl;
    if (!gl) return g.renderer.type === 1 ? 'Canvas' : `tip ${g.renderer.type}`;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    return `WebGL — ${name}`;
  });
}

// ───────────── Ölçümler ─────────────

function measureSize(dir: string): { files: Record<string, number>; raw: number; gzip: number } {
  const assets = path.join(dir, 'assets');
  const files: Record<string, number> = {};
  let raw = 0;
  let gzip = 0;
  for (const name of readdirSync(assets).filter((f) => f.endsWith('.js'))) {
    const buf = readFileSync(path.join(assets, name));
    const gz = gzipSync(buf).length;
    files[name] = gz;
    raw += buf.length;
    gzip += gz;
  }
  return { files, raw, gzip };
}

async function measureStartup(browser: Browser, build: Build, cpuRate: number): Promise<number> {
  const { page, errors, close } = await newPage(browser, cpuRate);
  try {
    await page.goto(`${build.url}?debug=1`);
    await waitScene(page, 'Menu');
    const t = await page.evaluate(() => performance.now());
    if (errors.length > 0) throw new Error(`${build.label}: ${errors.join(' | ')}`);
    return t;
  } finally {
    await close();
  }
}

/** Maç senaryosunu açar, debug katmanını gizler, maçın oturmasını bekler. */
async function openMatch(page: Page, build: Build, query: string): Promise<void> {
  await page.goto(`${build.url}?debug=1&${query}`);
  await waitScene(page, 'Match');
  await page.evaluate(() => {
    (window as BenchWindow).__KAFA_GAME__?.scene.getScene('Match')?.debug?.setVisible(false);
  });
  await page.waitForTimeout(WARMUP_MS);
}

async function measureFrames(
  browser: Browser,
  build: Build,
  cpuRate: number,
  seconds: number,
  query: string,
): Promise<FrameStats & { renderer: string }> {
  const { page, errors, close } = await newPage(browser, cpuRate);
  try {
    await openMatch(page, build, query);
    await page.evaluate(() => {
      const w = window as BenchWindow;
      const g = w.__KAFA_GAME__;
      if (!g) throw new Error('oyun nesnesi yok');
      const b = {
        frames: [] as number[],
        intervals: [] as number[],
        draws: [] as number[],
        binds: [] as number[],
        hashes: {},
        conflicts: 0,
        firstTick: 0,
      };
      w.__BENCH__ = b;
      // WebGL çağrı sayacı: çizim çağrıları ve doku bağlamaları (kare başına).
      let draws = 0;
      let binds = 0;
      const gl = g.renderer.gl as unknown as Record<string, unknown> | null | undefined;
      if (gl) {
        const wrap = (name: string, bump: () => void): void => {
          const fn = gl[name];
          if (typeof fn !== 'function') return;
          gl[name] = function (this: unknown, ...args: unknown[]): unknown {
            bump();
            return (fn as (...a: unknown[]) => unknown).apply(this, args);
          };
        };
        for (const n of [
          'drawElements',
          'drawArrays',
          'drawElementsInstanced',
          'drawArraysInstanced',
        ])
          wrap(n, () => {
            draws++;
          });
        wrap('bindTexture', () => {
          binds++;
        });
      }
      let start = 0;
      let last = 0;
      g.events.on('prestep', () => {
        start = performance.now();
        if (last > 0) b.intervals.push(start - last);
        last = start;
        draws = 0;
        binds = 0;
      });
      g.events.on('postrender', () => {
        b.frames.push(performance.now() - start);
        b.draws.push(draws);
        b.binds.push(binds);
      });
    });
    await page.waitForTimeout(seconds * MS_PER_S);
    const data = await page.evaluate(() => {
      const b = (window as BenchWindow).__BENCH__;
      return {
        frames: b?.frames ?? [],
        intervals: b?.intervals ?? [],
        draws: b?.draws ?? [],
        binds: b?.binds ?? [],
      };
    });
    const renderer = await rendererInfo(page);
    if (errors.length > 0) throw new Error(`${build.label}: ${errors.join(' | ')}`);
    return { ...frameStats(data.frames, data.intervals, data.draws, data.binds), renderer };
  } finally {
    await close();
  }
}

interface HeapProfileNode {
  id: number;
  callFrame: { functionName: string; url: string; lineNumber: number };
  children?: HeapProfileNode[];
}
interface HeapProfile {
  head: HeapProfileNode;
  samples: { size: number; nodeId: number }[];
}
interface TraceEvent {
  name: string;
  ph: string;
  dur?: number;
  tid?: number;
  args?: { name?: string };
}

/**
 * Kare başına bellek ayırma ve GC: örnekleyici yığın profili (GC'de toplananlar dahil) ve iz
 * kaydındaki GC olayları aynı pencerede.
 */
async function measureAlloc(
  browser: Browser,
  build: Build,
  cpuRate: number,
  seconds: number,
  query: string,
  top: number,
): Promise<AllocStats> {
  const { page, errors, close } = await newPage(browser, cpuRate);
  try {
    await openMatch(page, build, query);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('HeapProfiler.enable');
    await page.evaluate(() => {
      const w = window as BenchWindow;
      const g = w.__KAFA_GAME__;
      if (!g) throw new Error('oyun nesnesi yok');
      const b = {
        frames: [] as number[],
        intervals: [] as number[],
        draws: [] as number[],
        binds: [] as number[],
        hashes: {},
        conflicts: 0,
        firstTick: 0,
      };
      w.__BENCH__ = b;
      g.events.on('postrender', () => {
        b.frames.push(0);
      });
    });
    const events: TraceEvent[] = [];
    cdp.on('Tracing.dataCollected', (e) => {
      events.push(...(e.value as unknown as TraceEvent[]));
    });
    const traced = new Promise<void>((resolve) => {
      cdp.on('Tracing.tracingComplete', () => {
        resolve();
      });
    });
    // 1. pencere: yalnızca iz kaydı (GC duraklamaları; yığın örnekleyici GC'yi yavaşlatır).
    await cdp.send('Tracing.start', {
      traceConfig: { includedCategories: ['devtools.timeline', 'v8'] },
      transferMode: 'ReportEvents',
    });
    await page.waitForTimeout(seconds * MS_PER_S);
    await cdp.send('Tracing.end');
    await traced;
    // 2. pencere: yalnızca yığın örneklemesi (kare başına ayırma ve en çok ayıranlar).
    await cdp.send('HeapProfiler.startSampling', {
      samplingInterval: HEAP_SAMPLING_BYTES,
      includeObjectsCollectedByMajorGC: true,
      includeObjectsCollectedByMinorGC: true,
    });
    const t0 = Date.now();
    await page.evaluate(() => {
      const b = (window as BenchWindow).__BENCH__;
      if (b) b.frames.length = 0;
    });
    await page.waitForTimeout(seconds * MS_PER_S);
    const frames = await page.evaluate(() => (window as BenchWindow).__BENCH__?.frames.length ?? 0);
    const { profile } = (await cdp.send('HeapProfiler.stopSampling')) as unknown as {
      profile: HeapProfile;
    };
    const spanMs = Date.now() - t0;
    await cdp.detach();
    if (errors.length > 0) throw new Error(`${build.label}: ${errors.join(' | ')}`);

    const names = new Map<number, string>();
    const walk = (n: HeapProfileNode): void => {
      const f = n.callFrame;
      const file = f.url.split('/').pop() ?? '';
      names.set(n.id, `${f.functionName || '(anonim)'} ${file}:${f.lineNumber + 1}`);
      for (const c of n.children ?? []) walk(c);
    };
    walk(profile.head);
    const byFn = new Map<string, number>();
    let total = 0;
    for (const smp of profile.samples) {
      total += smp.size;
      const fn = names.get(smp.nodeId) ?? '?';
      byFn.set(fn, (byFn.get(fn) ?? 0) + smp.size);
    }
    const perFrame = (bytes: number): number => bytes / Math.max(1, frames);
    // Yalnızca ana iş parçacığındaki duraklamalar (eşzamanlı işaretleme arka planda, oyunu durdurmaz).
    const main = new Set(
      events
        .filter((e) => e.ph === 'M' && e.name === 'thread_name' && e.args?.name === MAIN_THREAD)
        .map((e) => e.tid),
    );
    const gc = events.filter(
      (e) => GC_EVENTS.has(e.name) && e.ph === 'X' && (main.size === 0 || main.has(e.tid)),
    );
    const durs = gc.map((e) => (e.dur ?? 0) / US_PER_MS);
    const long = gc
      .filter((e) => (e.dur ?? 0) / US_PER_MS > LONG_GC_MS)
      .map((e) => `${e.name} ${((e.dur ?? 0) / US_PER_MS).toFixed(1)} ms`);
    if (long.length > 0)
      console.log(`${build.label}: ${LONG_GC_MS} ms'yi aşan GC: ${long.join(', ')}`);
    return {
      frames,
      bytesPerFrame: perFrame(total),
      gcTotal: durs.reduce((a, b) => a + b, 0),
      gcMax: durs.length > 0 ? Math.max(...durs) : 0,
      gcCount: durs.length,
      spanMs,
      top: [...byFn.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, top)
        .map(([fn, bytes]) => ({ fn, bytesPerFrame: perFrame(bytes) })),
    };
  } finally {
    await close();
  }
}

async function runDeterminism(
  browser: Browser,
  build: Build,
  query: string,
  ticks: number,
): Promise<DeterminismRun> {
  const { page, errors, close } = await newPage(browser, 1);
  try {
    // Uzun maç: süre dolmasın; tekrarlar açık (gol tekrarı da aynı durumu üretmeli).
    await page.goto(`${build.url}?debug=1&${query}&duration=600`);
    await page.waitForFunction(
      () => (window as BenchWindow).__KAFA_GAME__?.scene.getScene('Match')?.sim !== undefined,
      undefined,
      { polling: 'raf', timeout: SCENE_TIMEOUT_MS },
    );
    await page.evaluate((every) => {
      const w = window as BenchWindow;
      const sim = w.__KAFA_GAME__?.scene.getScene('Match')?.sim;
      if (!sim) throw new Error('simülasyon yok');
      const proto = Object.getPrototypeOf(sim) as BenchSim;
      const canonical = typeof proto.checksum === 'function';
      const b = {
        frames: [],
        intervals: [],
        draws: [],
        binds: [],
        hashes: {},
        conflicts: 0,
        firstTick: sim.tick,
        kind: canonical ? ('checksum' as const) : ('json' as const),
      };
      w.__BENCH__ = b;
      const hashes = b.hashes as Record<number, string>;
      const fnv = (s: string): string => {
        let h = 0x811c9dc5;
        for (let i = 0; i < s.length; i++) {
          h ^= s.charCodeAt(i);
          h = Math.imul(h, 0x01000193);
        }
        return (h >>> 0).toString(16).padStart(8, '0');
      };
      const step = proto.step;
      proto.step = function (this: BenchSim, inputs: unknown): unknown {
        const events = step.call(this, inputs);
        if (this.tick % every === 0) {
          const h =
            canonical && this.checksum ? this.checksum() : fnv(JSON.stringify(this.saveState()));
          const prev = hashes[this.tick];
          if (prev === undefined) hashes[this.tick] = h;
          else if (prev !== h) b.conflicts++;
        }
        return events;
      };
    }, CHECK_EVERY);
    const timeout = (ticks / STEP_HZ) * MS_PER_S * SLOW_FACTOR + SCENE_TIMEOUT_MS;
    await page.waitForFunction(
      (target) => {
        const hashes = (window as BenchWindow).__BENCH__?.hashes ?? {};
        return hashes[target] !== undefined;
      },
      ticks,
      { polling: 'raf', timeout },
    );
    const run = await page.evaluate(() => {
      const b = (window as BenchWindow).__BENCH__;
      return {
        firstTick: b?.firstTick ?? -1,
        conflicts: b?.conflicts ?? -1,
        hashes: b?.hashes ?? {},
        kind: b?.kind ?? 'json',
      };
    });
    if (errors.length > 0) throw new Error(`${build.label}: ${errors.join(' | ')}`);
    if (run.firstTick > HOOK_DEADLINE_TICK) {
      throw new Error(`${build.label}: kanca geç kuruldu (adım ${run.firstTick})`);
    }
    const hashes: Record<number, string> = {};
    for (let t = HOOK_DEADLINE_TICK; t <= ticks; t += CHECK_EVERY) {
      const h = run.hashes[t];
      if (h !== undefined) hashes[t] = h;
    }
    return {
      query,
      firstTick: run.firstTick,
      lastTick: ticks,
      checks: Object.keys(hashes).length,
      conflicts: run.conflicts,
      hashes,
      kind: run.kind,
    };
  } finally {
    await close();
  }
}

async function takeShots(browser: Browser, build: Build, out: string): Promise<string[]> {
  mkdirSync(out, { recursive: true });
  const slug = build.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const files: string[] = [];
  const shot = async (page: Page, name: string): Promise<void> => {
    const file = path.join(out, `${slug}-${name}.png`);
    await page.screenshot({ path: file });
    files.push(file);
  };
  const hide = (page: Page): Promise<void> =>
    page.evaluate(() => {
      (window as BenchWindow).__KAFA_GAME__?.scene.getScene('Match')?.debug?.setVisible(false);
    });
  const MENU_SETTLE_MS = 3000;
  const SELECT_SETTLE_MS = 1500;
  const MATCH_SETTLE_MS = 6500;
  {
    const { page, close } = await newPage(browser, 1);
    await page.goto(`${build.url}?debug=1`);
    await waitScene(page, 'Menu');
    await page.waitForTimeout(MENU_SETTLE_MS);
    await shot(page, 'menu');
    await page.keyboard.press('Enter');
    await waitScene(page, 'Select');
    await page.waitForTimeout(SELECT_SETTLE_MS);
    await shot(page, 'select');
    await close();
  }
  {
    const { page, close } = await newPage(browser, 1);
    await page.goto(`${build.url}?debug=1&cpu=hard&cpu1=hard&seed=11&c1=kor&c2=ayaz&duration=600`);
    await waitScene(page, 'Match');
    await hide(page);
    await page.waitForTimeout(MATCH_SETTLE_MS);
    await shot(page, 'match');
    await close();
  }
  {
    const { page, close } = await newPage(browser, 1, { width: 844, height: 390 });
    await page.goto(`${build.url}?debug=1&touch=1&cpu=easy&c1=simsek&c2=pamuk&seed=3`);
    await waitScene(page, 'Match');
    await hide(page);
    await page.waitForTimeout(MENU_SETTLE_MS);
    await shot(page, 'mobile');
    await close();
  }
  return files;
}

// ───────────── Ana akış ─────────────

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const builds: Build[] = [];
  if (opts.app) {
    if (!opts.device) throw new Error('--app yalnızca --device ile');
    builds.push({ label: opts.labels[0] ?? 'uygulama', dir: '', url: APP_URL, server: null });
  } else {
    for (const [i, dir] of opts.dirs.entries()) {
      if (!existsSync(path.join(dir, 'index.html'))) {
        throw new Error(`${dir}/index.html yok — önce npm run build`);
      }
      const port = FIRST_PORT + i;
      const base = buildBase(dir);
      builds.push({
        label: opts.labels[i] ?? dir,
        dir,
        url: `http://localhost:${port}${base}`,
        server: await serve(dir, port, base),
      });
    }
  }
  if (opts.device && opts.only.some((m) => m === 'startup' || m === 'shots')) {
    throw new Error('Cihazda yalnızca frame, alloc, determinism ve size ölçülür');
  }
  const browser = opts.device
    ? await connectDevice(opts.app ? [] : builds.map((_, i) => FIRST_PORT + i))
    : await chromium.launch({
        headless: true,
        ...(process.env.CI ? {} : { channel: 'chrome' }),
        args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'],
      });
  if (opts.device) opts.cpu = [1];
  const results: Record<string, unknown> = {};
  const report: string[] = [
    opts.device ? `Cihaz: ${deviceInfo()}` : `Tarayıcı: ${browser.version()}`,
  ];
  try {
    if (opts.only.includes('size') && !opts.app) {
      const sizes = builds.map((b) => ({ label: b.label, ...measureSize(b.dir) }));
      results.size = sizes;
      report.push(
        '\n### Paket boyutu (assets/*.js)\n',
        table(
          ['Derleme', 'Parçalar (gzip)', 'Toplam', 'gzip'],
          sizes.map((s) => [
            s.label,
            Object.entries(s.files)
              .map(([f, n]) => `${f.replace(/-[\w-]{8}\.js$/, '')} ${kb(n)}`)
              .join(' + '),
            kb(s.raw),
            kb(s.gzip),
          ]),
        ),
      );
    }

    if (opts.only.includes('startup')) {
      const rows: string[][] = [];
      const raw: Record<string, Record<number, number[]>> = {};
      for (const rate of opts.startupCpu) {
        const times = builds.map(() => [] as number[]);
        // Isınma (sayılmaz): ilk gezinme tarayıcı sürecinin soğuk açılışını da ölçüyor.
        for (const b of builds) await measureStartup(browser, b, rate);
        // Dönüşümlü: makinedeki dalgalanma derlemelere eşit dağılsın.
        for (let r = 0; r < opts.runs; r++) {
          for (const [i, b] of builds.entries()) {
            times[i]?.push(await measureStartup(browser, b, rate));
          }
        }
        for (const [i, b] of builds.entries()) {
          const t = times[i] ?? [];
          (raw[b.label] ??= {})[rate] = t;
          rows.push([`${rate}×`, b.label, ms(median(t)), ms(Math.min(...t)), ms(Math.max(...t))]);
        }
      }
      results.startup = raw;
      report.push(
        `\n### Açılış süresi (gezinme → menü hazır, ${opts.runs} koşu)\n`,
        table(['CPU', 'Derleme', 'Medyan', 'En iyi', 'En kötü'], rows),
      );
    }

    if (opts.only.includes('frame')) {
      const rows: string[][] = [];
      const raw: Record<string, Record<number, FrameStats[]>> = {};
      let renderer = '';
      for (const rate of opts.cpu) {
        const runs = builds.map(() => [] as FrameStats[]);
        for (let r = 0; r < opts.runs; r++) {
          for (const [i, b] of builds.entries()) {
            const s = await measureFrames(browser, b, rate, opts.seconds, opts.query);
            renderer = s.renderer;
            runs[i]?.push(s);
          }
        }
        for (const [i, b] of builds.entries()) {
          const s = runs[i] ?? [];
          (raw[b.label] ??= {})[rate] = s;
          const pick = (f: (x: FrameStats) => number): number => median(s.map(f));
          rows.push([
            `${rate}×`,
            b.label,
            ms(pick((x) => x.avg)),
            ms(pick((x) => x.p95)),
            ms(pick((x) => x.p99)),
            ms(Math.max(...s.map((x) => x.max))),
            `${s.reduce((a, x) => a + x.long, 0)} / ${s.reduce((a, x) => a + x.frames, 0)}`,
            `${s.reduce((a, x) => a + x.hitches, 0)}`,
            ms(pick((x) => x.intervalP99)),
            pick((x) => x.fps).toFixed(1),
            pick((x) => x.draws).toFixed(1),
            pick((x) => x.binds).toFixed(1),
          ]);
        }
      }
      results.frame = raw;
      report.push(
        `\n### Kare işi (${opts.query}; ${opts.seconds} sn × ${opts.runs} koşu; ${renderer})\n`,
        table(
          [
            'CPU',
            'Derleme',
            'İş ort.',
            'İş p95',
            'İş p99',
            'İş en kötü',
            `Aralık > ${LONG_FRAME_MS} ms`,
            `> ${HITCH_MS} ms`,
            'Aralık p99',
            'FPS',
            'Çizim/kare',
            'Doku bağ./kare',
          ],
          rows,
        ),
      );
    }

    if (opts.only.includes('alloc')) {
      const rows: string[][] = [];
      const tops: string[] = [];
      const raw: Record<string, AllocStats[]> = {};
      const rate = opts.cpu[0] ?? 1;
      const runs = builds.map(() => [] as AllocStats[]);
      for (let r = 0; r < opts.runs; r++) {
        for (const [i, b] of builds.entries()) {
          runs[i]?.push(await measureAlloc(browser, b, rate, opts.seconds, opts.query, opts.top));
        }
      }
      for (const [i, b] of builds.entries()) {
        const s = runs[i] ?? [];
        raw[b.label] = s;
        const pick = (f: (x: AllocStats) => number): number => median(s.map(f));
        const rateMb = (x: AllocStats): number =>
          (x.bytesPerFrame * x.frames) / (x.spanMs / MS_PER_S) / KB / KB;
        rows.push([
          b.label,
          kb(pick((x) => x.bytesPerFrame)),
          `${pick(rateMb).toFixed(1)} MB/sn`,
          pick((x) => x.gcCount).toFixed(0),
          ms(pick((x) => x.gcTotal)),
          ms(Math.max(...s.map((x) => x.gcMax))),
        ]);
        const first = s[0];
        if (first) {
          tops.push(
            `- **${b.label}:** ` +
              first.top.map((x) => `${x.fn} ${kb(x.bytesPerFrame)}`).join(' · '),
          );
        }
      }
      results.alloc = raw;
      report.push(
        `\n### Bellek ayırma ve GC (${opts.seconds} sn × ${opts.runs} koşu, CPU ${rate}×)\n`,
        table(
          ['Derleme', 'Ayırma/kare', 'Ayırma hızı', 'GC sayısı', 'GC toplam', 'En uzun GC'],
          rows,
        ),
        '\nEn çok ayıranlar (ilk koşu, kare başına):\n',
        tops.join('\n'),
      );
    }

    if (opts.only.includes('determinism')) {
      const rows: string[][] = [];
      const raw: Record<string, DeterminismRun[]> = {};
      for (const query of DETERMINISM_CASES) {
        const runs: DeterminismRun[] = [];
        for (const b of builds) runs.push(await runDeterminism(browser, b, query, opts.ticks));
        const ref = runs[0];
        for (const [i, b] of builds.entries()) {
          const run = runs[i];
          if (!run || !ref) continue;
          (raw[b.label] ??= []).push(run);
          const ticks = Object.keys(ref.hashes).map(Number);
          const diff = ticks.filter((t) => run.hashes[t] !== ref.hashes[t]);
          const digest = Object.values(run.hashes).join('').slice(-8);
          rows.push([
            query,
            b.label,
            `${run.checks}`,
            `${run.conflicts}`,
            i === 0
              ? '(referans)'
              : run.kind !== ref.kind
                ? `özet türü farklı (${run.kind} ↔ ${ref.kind}), karşılaştırılamaz`
                : diff.length === 0
                  ? 'birebir aynı'
                  : `${diff.length} fark (ilk: adım ${diff[0]})`,
            `${digest} (${run.kind})`,
          ]);
        }
      }
      results.determinism = raw;
      report.push(
        `\n### Determinizm (adım ${HOOK_DEADLINE_TICK}–${opts.ticks}, her ${CHECK_EVERY} adımda durum özeti)\n`,
        table(
          ['Senaryo', 'Derleme', 'Denetim', 'Tekrar çelişkisi', 'Referansa göre', 'Son özet'],
          rows,
        ),
      );
    }

    if (opts.only.includes('shots')) {
      const files: string[] = [];
      for (const b of builds) files.push(...(await takeShots(browser, b, opts.out)));
      results.shots = files;
      report.push('\n### Ekran görüntüleri\n', files.map((f) => `- ${f}`).join('\n'));
    }
  } finally {
    await browser.close();
    for (const b of builds) b.server?.close();
  }
  console.log(report.join('\n'));
  if (opts.json) writeFileSync(opts.json, `${JSON.stringify(results, null, 2)}\n`);
}

await main();
