import Phaser from 'phaser';
import { JUICE, PERF } from '../config/gameConfig';
import { GameSim } from '../game/GameSim';
import type { MatchSetup } from '../game/matchSetup';
import { devHitStopMode, setDevHitStopMode } from '../scenes/devFlags';
import type { HitStopMode } from '../ui/PresentationTimeline';
import { DeterminismPanel, runAndShow, type DeterminismReport } from './determinismCheck';
import { devHooks, type MatchDevContext, type MatchDevSession } from './hooks';
import { PerfOverlay } from './perfOverlay';
import { PerfMonitor, type PerfSummary, type PerfVerdict } from './perfStats';
import { RollbackProbe } from './rollbackProbe';
import { StressLayer } from './StressLayer';

/**
 * Geliştirici araçlarının girişi (Faz 2.4). Yalnızca geliştirici derlemesinde pakete girer
 * (`main.ts` → `if (__DEV_TOOLS__) await import(...)`); yayın derlemesinde bu modül ve içe
 * aktardıkları hiç yoktur.
 *
 * - **Kare süresi grafiği:** Ayarlar → Kontroller → Performans grafiği (ya da `?perf=1`).
 * - **Dayanıklılık testi (15 dk):** AI vs AI Zor maçı, bugünkü görseller; dakika dakika FPS
 *   (QUALITY_BAR P1–P4, pil P5 için telefon USB'siz).
 * - **Stres testi (15 dk):** aynı maç + hedef boyutta sentetik sahne (`StressLayer`) + her karede
 *   8 adımlık rollback ölçümü (P9).
 * - `?devtest=soak|stress|rollback` → maç bu testle açılır (tezgâh ve masaüstü için).
 * - **Motorlar arası test** (Faz 2.7): kayıtlı tekrarlar bu WebView'da oynatılır, her adımın özeti
 *   Node'da üretilen zincirle karşılaştırılır (`?devtest=determinism` ya da menüden).
 * - **Hit-stop biçimi** (Faz 2.7 prototipi): hızlı yetişme / tek karede atlama / kapalı; menüden
 *   (oturum boyunca) ya da `?hitstop=rate|snap|off`.
 * - Konsol: `__KAFA_PERF__.report()` → JSON rapor (chrome://inspect ile telefondan okunur).
 */

type TestKind = 'soak' | 'stress' | 'rollback';

const TEST_LABELS: Readonly<Record<TestKind, string>> = {
  soak: 'Dayanıklılık',
  stress: 'Stres',
  rollback: 'Rollback',
};

interface ActiveTest {
  readonly kind: TestKind;
  readonly probe: RollbackProbe | null;
  readonly layer: StressLayer | null;
}

interface TestResult {
  readonly kind: TestKind;
  readonly verdict: PerfVerdict;
  readonly minutes: readonly PerfSummary[];
}

const MB = 1_048_576;
const BYTES_PER_PIXEL = 4;
const HEAP_EVERY_MS = 1000;
const TEXTURE_EVERY_MS = 2000;
const URL_TEST_PARAM = 'devtest';
/** `SceneKeys.Menu` / `SceneKeys.Match` (sahne modülünü içe aktarmadan). */
const MENU_SCENE = 'Menu';
const MATCH_SCENE = 'Match';
const URL_PERF_PARAM = 'perf';
const DETERMINISM_TEST = 'determinism';
const HIT_STOP_MODES: readonly HitStopMode[] = ['rate', 'snap', 'off'];
const HIT_STOP_LABELS: Readonly<Record<HitStopMode, string>> = {
  rate: 'Hızlı yetişme',
  snap: 'Atlama',
  off: 'Kapalı',
};
const P99 = 0.99;
const P999 = 0.999;
/** Takılma günlüğünün en çok kaydı. */
const MAX_HITCHES = 200;
const DECIMALS = 2;

/**
 * `?gl=noaa,multitex,…` → WebGL ayar deneyleri (profil çıkarırken derleme değiştirmeden
 * karşılaştırma): `noaa`/`aa` kenar yumuşatma kapalı/açık, `multitex`/`monotex` mobilde toplu
 * çizim başına çok/tek doku, `desync` düşük gecikmeli tuval, `lowpower` düşük güç GPU tercihi,
 * `batchN` toplu çizim tamponu N dörtgen.
 */
export function renderOverrides(): Phaser.Types.Core.RenderConfig {
  const flags = params().get('gl')?.split(',') ?? [];
  const o: Phaser.Types.Core.RenderConfig = {};
  if (flags.includes('noaa')) o.antialiasGL = false;
  if (flags.includes('aa')) o.antialiasGL = true;
  if (flags.includes('multitex')) o.autoMobileTextures = false;
  if (flags.includes('monotex')) o.autoMobileTextures = true;
  if (flags.includes('desync')) o.desynchronized = true;
  if (flags.includes('lowpower')) o.powerPreference = 'low-power';
  for (const f of flags) if (f.startsWith('batch')) o.batchSize = Number(f.slice('batch'.length));
  return o;
}

function params(): URLSearchParams {
  return new URLSearchParams(globalThis.location.search);
}

function urlTest(): TestKind | null {
  const v = params().get(URL_TEST_PARAM);
  return v === 'soak' || v === 'stress' || v === 'rollback' ? v : null;
}

/** Menüden başlatılan testlerin maçı: AI vs AI Zor (insan girdisi yok, tekrarlanabilir yük). */
function testSetup(): MatchSetup {
  return {
    mode: 'cpu',
    difficulty: 'hard',
    p1Ai: 'hard',
    seed: null,
    characters: ['kor', 'ayaz'],
    // Oyun süresi gerçek süreden yavaş akar (gol kutlaması, tekrar): maç testten önce bitmesin.
    durationSeconds: (PERF.soakMinutes * PERF.msPerMinute * 2) / MS_PER_S,
  };
}
const MS_PER_S = 1000;

export function installDevTools(game: Phaser.Game): void {
  const monitor = new PerfMonitor();
  let quality = -1;
  let heapMb = -1;
  let textureMb = 0;
  let requested: TestKind | null = urlTest();
  let active: ActiveTest | null = null;
  let result: TestResult | null = null;

  // Kare aralığı (önceki kare başından) ve kare işi (güncelleme + çizim gönderimi).
  let last = 0;
  let start = 0;
  let interval = 0;
  game.events.on(Phaser.Core.Events.PRE_STEP, () => {
    start = performance.now();
    interval = last > 0 ? start - last : 0;
    last = start;
  });
  /** Takılma günlüğü: 50 ms'yi aşan her karenin anı ve o andaki maç durumu (nedeni bulmak için). */
  const hitches: HitchEntry[] = [];
  game.events.on(Phaser.Core.Events.POST_RENDER, () => {
    if (interval <= 0) return;
    const work = performance.now() - start;
    monitor.frame(interval, work, quality);
    if (interval > PERF.hitchMs && interval <= PERF.ignoreAboveMs && hitches.length < MAX_HITCHES) {
      hitches.push(hitchEntry(game, monitor.elapsedMs, interval, work));
    }
  });
  setInterval(() => {
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    if (mem) {
      heapMb = mem.usedJSHeapSize / MB;
      monitor.setHeap(heapMb);
    }
  }, HEAP_EVERY_MS);
  setInterval(() => {
    textureMb = textureBytes(game) / MB;
  }, TEXTURE_EVERY_MS);

  const overlay = new PerfOverlay(monitor, () => {
    const lines: string[] = [];
    const probe = active?.probe;
    if (probe) {
      const t = probe.total;
      lines.push(
        `rollback ${probe.frames} adım ${t.mean.toFixed(DECIMALS)} ms ` +
          `p99 ${t.quantile(P99).toFixed(DECIMALS)} max ${t.max.toFixed(1)}`,
        `  kayıt ${probe.save.mean.toFixed(DECIMALS)} ms · fark ${probe.mismatches}/${probe.verified}`,
      );
    }
    lines.push(
      `doku ~${textureMb.toFixed(0)} MB · yığın ${heapMb < 0 ? '-' : heapMb.toFixed(0)} MB`,
    );
    if (active) lines.push(`test: ${TEST_LABELS[active.kind]} (${PERF.soakMinutes} dk)`);
    return {
      quality,
      lines,
      soak: result ? { verdict: result.verdict, minutes: result.minutes } : null,
    };
  });
  const stored = globalThis.localStorage.getItem(PERF.graph.storageKey) === '1';
  overlay.setVisible(stored || params().get(URL_PERF_PARAM) === '1' || requested !== null);

  const report = (): unknown => {
    const probe = active?.probe;
    return {
      device: {
        userAgent: navigator.userAgent,
        dpr: globalThis.devicePixelRatio,
        canvas: [game.canvas.width, game.canvas.height],
        renderer: game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas',
      },
      test: active?.kind ?? result?.kind ?? null,
      summary: monitor.summary(quality, heapMb),
      verdict: monitor.verdict(),
      minutes: monitor.minutes,
      rollback: probe
        ? {
            frames: probe.frames,
            totalMean: probe.total.mean,
            totalP99: probe.total.quantile(P99),
            totalMax: probe.total.max,
            saveMean: probe.save.mean,
            resimMean: probe.resim.mean,
            samples: probe.total.count,
            overBudget: probe.total.countAbove(PERF.rollbackBudgetMs),
            p999: probe.total.quantile(P999),
            verified: probe.verified,
            mismatches: probe.mismatches,
          }
        : null,
      hitches,
      textureMb,
      heapMb,
    };
  };
  Reflect.set(globalThis, '__KAFA_PERF__', {
    report,
    reset: () => {
      monitor.reset();
      active?.probe?.reset();
    },
    show: (on: boolean) => {
      overlay.setVisible(on);
    },
  });

  devHooks.quality = (level) => {
    quality = level;
  };

  // Motorlar arası test (Faz 2.7): menüden ya da açılışta `?devtest=determinism`.
  let determinismPanel: DeterminismPanel | null = null;
  let determinism: DeterminismReport | null = null;
  const runDeterminism = async (): Promise<DeterminismReport> => {
    determinismPanel ??= new DeterminismPanel();
    determinism = await runAndShow(determinismPanel);
    return determinism;
  };
  Reflect.set(globalThis, '__KAFA_DETERMINISM__', {
    run: runDeterminism,
    report: () => determinism,
  });
  if (params().get(URL_TEST_PARAM) === DETERMINISM_TEST) {
    game.events.once(Phaser.Core.Events.READY, () => {
      void runDeterminism();
    });
  }

  // Açılış süresi (QUALITY_BAR A2): menü ilk kez dokunulabilir olunca konsola (uygulamada logcat'e,
  // "Capacitor/Console") gezinme başlangıcından geçen süre yazılır.
  let menuLogged = false;
  game.events.on(Phaser.Core.Events.POST_STEP, () => {
    if (menuLogged || !game.scene.isActive(MENU_SCENE)) return;
    menuLogged = true;
    console.info(`[Kafadarlar] menü hazır ${performance.now().toFixed(0)} ms`);
  });

  devHooks.match = (ctx: MatchDevContext): MatchDevSession | null => {
    const kind = requested;
    requested = null;
    if (!kind) return null;
    monitor.reset();
    result = null;
    overlay.setVisible(true);
    const probe = kind === 'soak' ? null : new RollbackProbe(ctx.sim, new GameSim(ctx.simOptions));
    const layer = kind === 'stress' ? new StressLayer(ctx.scene, ctx.world, ctx.stage) : null;
    active = { kind, probe, layer };
    const test = active;
    const limitMs = PERF.soakMinutes * PERF.msPerMinute;
    return {
      beforeStep: (a, b) => {
        probe?.beforeStep(a, b);
      },
      frame: (dt, time) => {
        layer?.update(dt, time, [ctx.playerPosition(0), ctx.playerPosition(1)], ctx.sim.ball);
        probe?.frame();
        if (!result && monitor.elapsedMs >= limitMs) {
          result = { kind, verdict: monitor.verdict(), minutes: [...monitor.minutes] };
          // chrome://inspect konsolunda okunur.
          console.info('[Kafadarlar] test bitti', JSON.stringify(report()));
        }
      },
      destroy: () => {
        layer?.destroy();
        if (active === test) active = null;
      },
    };
  };

  devHooks.menuItems = (startMatch) => [
    {
      label: () => `Performans grafiği   ◄ ${overlay.isVisible ? 'Açık' : 'Kapalı'} ►`,
      onAdjust: () => {
        toggle();
      },
      onSelect: () => {
        toggle();
      },
    },
    {
      label: `Dayanıklılık testi (${PERF.soakMinutes} dk)`,
      onSelect: () => {
        requested = 'soak';
        startMatch(testSetup());
      },
    },
    {
      label: `Stres testi (${PERF.soakMinutes} dk)`,
      onSelect: () => {
        requested = 'stress';
        startMatch(testSetup());
      },
    },
    {
      label: 'Motorlar arası test',
      onSelect: () => {
        void runDeterminism();
      },
    },
    {
      label: () => `Hit-stop   ◄ ${HIT_STOP_LABELS[devHitStopMode() ?? JUICE.hitStop.catchUp]} ►`,
      onAdjust: (dir) => {
        cycleHitStop(dir);
      },
      onSelect: () => {
        cycleHitStop(1);
      },
    },
  ];

  function cycleHitStop(dir: 1 | -1): void {
    const now = HIT_STOP_MODES.indexOf(devHitStopMode() ?? JUICE.hitStop.catchUp);
    const n = HIT_STOP_MODES.length;
    setDevHitStopMode(HIT_STOP_MODES[(now + dir + n) % n] ?? null);
  }

  function toggle(): void {
    overlay.setVisible(!overlay.isVisible);
    globalThis.localStorage.setItem(PERF.graph.storageKey, overlay.isVisible ? '1' : '0');
  }
}

interface HitchEntry {
  /** Ölçüm başından geçen süre (sn). */
  readonly atS: number;
  readonly intervalMs: number;
  readonly workMs: number;
  /** Etkin sahneler ve maçtaysa evre, tekrar oynuyor mu, adım. */
  readonly scenes: string;
  readonly phase: string;
  readonly replay: boolean;
  readonly tick: number;
}

/** Takılma anının kaydı (yalnızca takılmada çağrılır; ayırma sorun değil). */
function hitchEntry(
  game: Phaser.Game,
  elapsedMs: number,
  intervalMs: number,
  workMs: number,
): HitchEntry {
  const match = game.scene.isActive(MATCH_SCENE)
    ? (game.scene.getScene(MATCH_SCENE) as unknown as {
        sim?: { tick: number; match: { phase: string } };
        replay?: unknown;
      })
    : null;
  return {
    atS: Math.round(elapsedMs) / MS_PER_S,
    intervalMs: Math.round(intervalMs),
    workMs: Math.round(workMs),
    scenes: game.scene
      .getScenes(true)
      .map((sc) => sc.sys.settings.key)
      .join(','),
    phase: match?.sim?.match.phase ?? '-',
    replay: match ? match.replay !== null && match.replay !== undefined : false,
    tick: match?.sim?.tick ?? -1,
  };
}

/** Yüklü dokuların sıkıştırılmamış toplam belleği (RGBA; GPU sürücüsünün payı hariç). */
function textureBytes(game: Phaser.Game): number {
  let bytes = 0;
  const list = game.textures.list as Record<string, Phaser.Textures.Texture>;
  for (const key of Object.keys(list)) {
    for (const src of list[key]?.source ?? []) bytes += src.width * src.height * BYTES_PER_PIXEL;
  }
  return bytes;
}
