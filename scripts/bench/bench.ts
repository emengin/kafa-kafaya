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
 * - **size:** `assets/*.js` gzip boyutu (Vite raporuyla aynı: zlib varsayılan seviye).
 * - **startup:** sayfa gezintisinin başlangıcından menü sahnesinin açılmasına kadar geçen süre
 *   (yükleme ekranındaki doku üretimi dahil). Her koşu temiz tarayıcı bağlamında, service worker
 *   engelli; medyan.
 * - **frame:** AI vs AI (Zor–Zor), `?quality=high`, debug katmanı gizli. "Kare işi" = Phaser'ın
 *   `prestep` → `postrender` arası (güncelleme + çizim gönderimi, ana iş parçacığı). CPU yavaşlatma
 *   DevTools `Emulation.setCPUThrottlingRate` ile (düşük güçlü cihaz benzetimi).
 * - **determinism:** aynı tohumlu AI vs AI maçlarında her `CHECK_EVERY` adımda bir tam
 *   simülasyon durumunun (`GameSim.saveState`) özeti. Derlemeler birbiriyle ve kendi tekrarıyla
 *   (gol tekrarı aynı adımı yeniden simüle eder) karşılaştırılır. Kare hızı ve zamanlama farklı
 *   olsa da durum her adımda birebir aynı olmalıdır.
 * - **shots:** menü, karakter seçimi, maç ve mobil görünüm ekran görüntüleri (görsel karşılaştırma).
 *
 * Sunucu: derleme klasörü yerleşik bir statik sunucuyla `/kafa-kafaya/` altında sunulur (her
 * derleme ayrı bağlantı noktasında). Yerelde kurulu Chrome, CI'da Playwright'ın Chromium'u.
 */
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
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';

const BASE = '/kafa-kafaya/';
const FIRST_PORT = 4300;
const CHECK_EVERY = 30;
const MS_PER_S = 1000;
/** Vite'ın derleme raporuyla aynı birim (1 kB = 1000 bayt). */
const KB = 1000;
const P95 = 0.95;
const P99 = 0.99;
/** "Uzun kare" eşiği (ms): 50 Hz ekranın kare süresi; QUALITY_BAR'daki 60 FPS hedefinin üstü. */
const LONG_FRAME_MS = 20;
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

type Metric = 'size' | 'startup' | 'frame' | 'determinism' | 'shots';
const ALL_METRICS: readonly Metric[] = ['size', 'startup', 'frame', 'determinism', 'shots'];
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
}

/** Testlerin `?debug=1` ile eriştiği oyun nesnesinin tezgâhın kullandığı kısmı. */
interface BenchGame {
  events: { on(event: string, fn: () => void): void };
  renderer: { type: number; gl?: WebGLRenderingContext | null };
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
}
interface BenchWindow {
  __KAFA_GAME__?: BenchGame;
  __BENCH__?: {
    frames: number[];
    intervals: number[];
    hashes: Record<number, string>;
    conflicts: number;
    firstTick: number;
  };
}

interface Build {
  label: string;
  dir: string;
  url: string;
  server: Server;
}

interface FrameStats {
  frames: number;
  avg: number;
  p95: number;
  p99: number;
  max: number;
  long: number;
  fps: number;
}

interface DeterminismRun {
  query: string;
  firstTick: number;
  lastTick: number;
  checks: number;
  conflicts: number;
  hashes: Record<number, string>;
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
      default:
        throw new Error(`Bilinmeyen argüman: ${key ?? ''}`);
    }
    i++;
  }
  return opts;
}

// ───────────── Statik sunucu ─────────────

function serve(dir: string, port: number): Promise<Server> {
  const root = path.resolve(dir);
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (!url.pathname.startsWith(BASE)) {
      res.writeHead(404).end();
      return;
    }
    let rel = decodeURIComponent(url.pathname.slice(BASE.length));
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

function frameStats(frames: readonly number[], intervals: readonly number[]): FrameStats {
  const sorted = [...frames].sort((a, b) => a - b);
  const sum = frames.reduce((a, b) => a + b, 0);
  const span = intervals.reduce((a, b) => a + b, 0);
  return {
    frames: frames.length,
    avg: sum / Math.max(1, frames.length),
    p95: quantile(sorted, P95),
    p99: quantile(sorted, P99),
    max: sorted[sorted.length - 1] ?? Number.NaN,
    long: intervals.filter((d) => d > LONG_FRAME_MS).length,
    fps: span > 0 ? (intervals.length * MS_PER_S) / span : 0,
  };
}

const ms = (v: number): string => `${v.toFixed(2)} ms`;
const kb = (bytes: number): string => `${(bytes / KB).toFixed(1)} kB`;

function table(head: readonly string[], rows: readonly (readonly string[])[]): string {
  const line = (cells: readonly string[]): string => `| ${cells.join(' | ')} |`;
  return [line(head), line(head.map(() => '---')), ...rows.map(line)].join('\n');
}

// ───────────── Tarayıcı ─────────────

async function newPage(
  browser: Browser,
  cpuRate: number,
  viewport = { width: 1280, height: 720 },
): Promise<{ context: BrowserContext; page: Page; errors: string[] }> {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  if (cpuRate !== 1) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
  }
  return { context, page, errors };
}

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
  const { context, page, errors } = await newPage(browser, cpuRate);
  try {
    await page.goto(`${build.url}?debug=1`);
    await waitScene(page, 'Menu');
    const t = await page.evaluate(() => performance.now());
    if (errors.length > 0) throw new Error(`${build.label}: ${errors.join(' | ')}`);
    return t;
  } finally {
    await context.close();
  }
}

async function measureFrames(
  browser: Browser,
  build: Build,
  cpuRate: number,
  seconds: number,
): Promise<FrameStats & { renderer: string }> {
  const { context, page, errors } = await newPage(browser, cpuRate);
  try {
    await page.goto(`${build.url}?debug=1&${FRAME_QUERY}`);
    await waitScene(page, 'Match');
    await page.evaluate(() => {
      (window as BenchWindow).__KAFA_GAME__?.scene.getScene('Match')?.debug?.setVisible(false);
    });
    await page.waitForTimeout(WARMUP_MS);
    await page.evaluate(() => {
      const w = window as BenchWindow;
      const g = w.__KAFA_GAME__;
      if (!g) throw new Error('oyun nesnesi yok');
      const b = { frames: [], intervals: [], hashes: {}, conflicts: 0, firstTick: 0 };
      w.__BENCH__ = b;
      let start = 0;
      let last = 0;
      g.events.on('prestep', () => {
        start = performance.now();
        if (last > 0) (b.intervals as number[]).push(start - last);
        last = start;
      });
      g.events.on('postrender', () => {
        (b.frames as number[]).push(performance.now() - start);
      });
    });
    await page.waitForTimeout(seconds * MS_PER_S);
    const data = await page.evaluate(() => {
      const b = (window as BenchWindow).__BENCH__;
      return { frames: b?.frames ?? [], intervals: b?.intervals ?? [] };
    });
    const renderer = await rendererInfo(page);
    if (errors.length > 0) throw new Error(`${build.label}: ${errors.join(' | ')}`);
    return { ...frameStats(data.frames, data.intervals), renderer };
  } finally {
    await context.close();
  }
}

async function runDeterminism(
  browser: Browser,
  build: Build,
  query: string,
  ticks: number,
): Promise<DeterminismRun> {
  const { context, page, errors } = await newPage(browser, 1);
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
      const b = { frames: [], intervals: [], hashes: {}, conflicts: 0, firstTick: sim.tick };
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
      const proto = Object.getPrototypeOf(sim) as BenchSim;
      const step = proto.step;
      proto.step = function (this: BenchSim, inputs: unknown): unknown {
        const events = step.call(this, inputs);
        if (this.tick % every === 0) {
          const h = fnv(JSON.stringify(this.saveState()));
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
    };
  } finally {
    await context.close();
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
    const { context, page } = await newPage(browser, 1);
    await page.goto(`${build.url}?debug=1`);
    await waitScene(page, 'Menu');
    await page.waitForTimeout(MENU_SETTLE_MS);
    await shot(page, 'menu');
    await page.keyboard.press('Enter');
    await waitScene(page, 'Select');
    await page.waitForTimeout(SELECT_SETTLE_MS);
    await shot(page, 'select');
    await context.close();
  }
  {
    const { context, page } = await newPage(browser, 1);
    await page.goto(`${build.url}?debug=1&cpu=hard&cpu1=hard&seed=11&c1=kor&c2=ayaz&duration=600`);
    await waitScene(page, 'Match');
    await hide(page);
    await page.waitForTimeout(MATCH_SETTLE_MS);
    await shot(page, 'match');
    await context.close();
  }
  {
    const { context, page } = await newPage(browser, 1, { width: 844, height: 390 });
    await page.goto(`${build.url}?debug=1&touch=1&cpu=easy&c1=simsek&c2=pamuk&seed=3`);
    await waitScene(page, 'Match');
    await hide(page);
    await page.waitForTimeout(MENU_SETTLE_MS);
    await shot(page, 'mobile');
    await context.close();
  }
  return files;
}

// ───────────── Ana akış ─────────────

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const builds: Build[] = [];
  for (const [i, dir] of opts.dirs.entries()) {
    if (!existsSync(path.join(dir, 'index.html'))) {
      throw new Error(`${dir}/index.html yok — önce npm run build`);
    }
    const port = FIRST_PORT + i;
    builds.push({
      label: opts.labels[i] ?? dir,
      dir,
      url: `http://localhost:${port}${BASE}`,
      server: await serve(dir, port),
    });
  }
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CI ? {} : { channel: 'chrome' }),
    args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'],
  });
  const results: Record<string, unknown> = {};
  const report: string[] = [`Tarayıcı: ${browser.version()}`];
  try {
    if (opts.only.includes('size')) {
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
            const s = await measureFrames(browser, b, rate, opts.seconds);
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
            pick((x) => x.fps).toFixed(1),
          ]);
        }
      }
      results.frame = raw;
      report.push(
        `\n### Kare işi (AI vs AI Zor–Zor, quality=high, ${opts.seconds} sn × ${opts.runs} koşu; ${renderer})\n`,
        table(
          ['CPU', 'Derleme', 'Ort.', 'p95', 'p99', 'En kötü', `> ${LONG_FRAME_MS} ms kare`, 'FPS'],
          rows,
        ),
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
              : diff.length === 0
                ? 'birebir aynı'
                : `${diff.length} fark (ilk: adım ${diff[0]})`,
            digest,
          ]);
        }
      }
      results.determinism = raw;
      report.push(
        `\n### Determinizm (adım ${HOOK_DEADLINE_TICK}–${opts.ticks}, her ${CHECK_EVERY} adımda saveState özeti)\n`,
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
    for (const b of builds) b.server.close();
  }
  console.log(report.join('\n'));
  if (opts.json) writeFileSync(opts.json, `${JSON.stringify(results, null, 2)}\n`);
}

await main();
