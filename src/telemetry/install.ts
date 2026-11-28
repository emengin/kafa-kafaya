import Phaser from 'phaser';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { TELEMETRY } from '../config/gameConfig';
import { t } from '../i18n';
import { MenuOverlay } from '../ui/MenuOverlay';
import type { TextMenuItem } from '../ui/TextMenu';
import { isGranted, needsPrompt, NO_CONSENT, parseConsent, type ConsentState } from './consent';
import { ErrorBudget, toReport, type JsErrorReport } from './errors';
import { validateEvent } from './events';
import { telemetryHooks } from './hooks';
import { consentStrings } from './strings';

/**
 * Gözlemlenebilirlik (Faz 2.8) — yalnızca Android uygulamasının paketinde (`main.ts` →
 * `if (__NATIVE_APP__) await import('./telemetry/install')`). Web derlemesinde bu modül yoktur.
 *
 * - Yerel `Telemetry` eklentisi (`android/.../TelemetryPlugin.java`) Firebase Analytics ve
 *   Crashlytics'i yönetir. SDK'lar manifestte **toplama kapalı** başlar; rıza gelince açılır.
 *   Rıza kararının asıl kaydı yerel tarafta (uygulama verisi); burada kopyası tutulur.
 * - **Rıza yoksa hiçbir şey gönderilmez:** olay ve hatalar burada atılır (yerel taraf da ayrıca
 *   denetler). Rızadan önce olan hiçbir şey kuyruğa alınmaz, sonradan da gitmez.
 * - Yakalanmamış JS hataları ve reddedilmiş Promise'ler Crashlytics'e "non-fatal" olarak gider
 *   (QUALITY_BAR K4; Crashlytics'te `JsError` / `JsUnhandledRejection` türüyle süzülür). Aynı hata
 *   oturumda bir kez. Çizici süreç kaybı yerel tarafta raporlanır (MainActivity).
 * - Etiketler: Crashlytics sürümü (versionName/Code) ve cihazı (model, Android) kendisi ekler;
 *   yerel taraf WebView sürümünü ve derleme türünü, burada oyun sürümü ve açık sahne eklenir.
 * - İlk açılışta rıza ekranı (ana menü), Ayarlar → Gizlilik'ten iki ayrı anahtar.
 * - Firebase yapılandırılmamışsa (google-services.json olmadan derleme; ör. fork) rıza ekranı ve
 *   Gizlilik menüsü görünmez; gönderilecek yer yoktur.
 */

/** Yerel eklentinin JS arayüzü. */
interface TelemetryPlugin {
  getConsent(): Promise<{ analytics?: unknown; crash?: unknown; available?: unknown }>;
  setConsent(options: {
    analytics: boolean;
    crash: boolean;
    textVersion: number;
  }): Promise<{ analytics?: unknown; crash?: unknown }>;
  logEvent(options: {
    name: string;
    params: Readonly<Record<string, string | number>>;
  }): Promise<void>;
  recordError(options: JsErrorReport): Promise<void>;
  setKey(options: { key: string; value: string }): Promise<void>;
  /** Yalnızca debug derlemesinde: yerel tarafta gerçek bir çökme (Crashlytics testi). */
  testCrash(): Promise<void>;
}

let plugin: TelemetryPlugin | null = null;
let consent: ConsentState = NO_CONSENT;
let available = false;
let promptShown = false;
const budget = new ErrorBudget(TELEMETRY.maxErrorsPerSession);
const ignore = (): undefined => undefined;

/** Açılışta, Phaser'dan önce bir kez. */
export function installTelemetry(): void {
  if (!Capacitor.isNativePlatform()) return; // mobil derleme tarayıcıda açıldıysa (duman testi)
  plugin = registerPlugin<TelemetryPlugin>('Telemetry');
  window.addEventListener('error', (e) => {
    reportError(toReport('js_error', e.error ?? e.message, TELEMETRY));
  });
  window.addEventListener('unhandledrejection', (e) => {
    reportError(toReport('promise_rejection', e.reason, TELEMETRY));
  });
  void plugin
    .getConsent()
    .then((r) => {
      consent = parseConsent(r);
      available = r.available === true;
      if (available) {
        telemetryHooks.consentPrompt = consentPrompt;
        telemetryHooks.privacy = { title: () => consentStrings().privacy, items: privacyItems };
        void plugin?.setKey({ key: 'js_version', value: __APP_VERSION__ }).catch(ignore);
      }
    })
    .catch(ignore);
  telemetryHooks.sink = (event) => {
    if (!plugin || !isGranted(consent.analytics)) return;
    const params = event.params as Readonly<Record<string, string | number>>;
    const problem = validateEvent(event.name, params);
    if (problem) {
      if (__DEV_TOOLS__) console.warn(`[telemetry] olay atıldı — ${problem}`);
      return;
    }
    plugin.logEvent({ name: event.name, params }).catch(ignore);
  };
}

/** Oyun kurulunca: açık sahne Crashlytics anahtarı olarak (hatanın hangi ekranda olduğu). */
export function attachTelemetry(game: Phaser.Game): void {
  if (!plugin) return;
  // Sahneler oyun hazır olunca kurulur (Phaser.Game kurucusundan sonra).
  game.events.once(Phaser.Core.Events.READY, () => {
    for (const scene of game.scene.scenes) {
      scene.sys.events.on(Phaser.Scenes.Events.CREATE, () => {
        if (isGranted(consent.crash))
          void plugin?.setKey({ key: 'scene', value: scene.sys.settings.key }).catch(ignore);
      });
    }
  });
}

function reportError(report: JsErrorReport): void {
  if (!plugin) return;
  const crash = isGranted(consent.crash);
  const analytics = isGranted(consent.analytics);
  if ((!crash && !analytics) || !budget.allow(report)) return;
  if (crash) plugin.recordError(report).catch(ignore);
  if (analytics) telemetryHooks.sink?.({ name: 'client_error', params: { kind: report.kind } });
}

function setConsent(analytics: boolean, crash: boolean): void {
  // Yerel taraf onaylayana kadar da yeni karar geçerli (geri alma hemen etkili olsun).
  consent = { analytics: analytics ? 'granted' : 'denied', crash: crash ? 'granted' : 'denied' };
  plugin
    ?.setConsent({ analytics, crash, textVersion: TELEMETRY.consentTextVersion })
    .then((r) => {
      consent = parseConsent(r);
    })
    .catch(ignore);
}

/**
 * İlk açılış rıza ekranı: karar verilmemişse ve bu oturumda henüz gösterilmediyse. "İzin ver" ve
 * "İzin verme" aynı görünümde (yönlendiren tasarım yok); seçili gelen "İzin verme". Geri tuşu
 * karar vermeden kapatır: rıza yok, bir sonraki açılışta yeniden sorulur.
 */
function consentPrompt(scene: Phaser.Scene, done: () => void): MenuOverlay | null {
  if (promptShown || !needsPrompt(consent)) return null;
  promptShown = true;
  const s = consentStrings();
  const choose = (granted: boolean): void => {
    setConsent(granted, granted);
    done();
  };
  return new MenuOverlay(scene, {
    title: s.title,
    lines: s.lines,
    lineStyle: {
      fontSizePx: TELEMETRY.prompt.lineFontSizePx,
      lineHeightPx: TELEMETRY.prompt.lineHeightPx,
    },
    panelWidth: TELEMETRY.prompt.panelWidth,
    selected: 1,
    items: [
      {
        label: s.allow,
        onSelect: () => {
          choose(true);
        },
      },
      {
        label: s.deny,
        onSelect: () => {
          choose(false);
        },
      },
    ],
  });
}

/** Ayarlar → Gizlilik: iki ayrı anahtar (+ geliştirici derlemesinde test düğmeleri). */
function privacyItems(): TextMenuItem[] {
  const s = consentStrings();
  const row = (label: string, on: boolean): string =>
    `${label}   ◄ ${on ? t('settings.on') : t('settings.off')} ►`;
  const flipAnalytics = (): void => {
    setConsent(!isGranted(consent.analytics), isGranted(consent.crash));
  };
  const flipCrash = (): void => {
    setConsent(isGranted(consent.analytics), !isGranted(consent.crash));
  };
  const items: TextMenuItem[] = [
    {
      label: () => row(s.analytics, isGranted(consent.analytics)),
      onAdjust: flipAnalytics,
      onSelect: flipAnalytics,
    },
    {
      label: () => row(s.crash, isGranted(consent.crash)),
      onAdjust: flipCrash,
      onSelect: flipCrash,
    },
  ];
  if (__DEV_TOOLS__) {
    // Faz 2.8 telefon testi: Crashlytics konsolunda görünmesi için (rıza açıkken).
    items.push(
      {
        label: s.testCrash,
        onSelect: () => {
          setTimeout(() => {
            plugin?.testCrash().catch(ignore);
          }, TELEMETRY.testCrashDelayMs);
        },
      },
      {
        label: s.testJsError,
        onSelect: () => {
          setTimeout(() => {
            throw new Error('Kafa Kafaya test JS hatası (Faz 2.8)');
          }, TELEMETRY.testCrashDelayMs);
        },
      },
    );
  }
  return items;
}
