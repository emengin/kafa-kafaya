import type Phaser from 'phaser';
import type { MenuOverlay } from '../ui/MenuOverlay';
import type { TextMenuItem } from '../ui/TextMenu';
import type { AnalyticsEvent } from './events';

/**
 * Gözlemlenebilirlik kancaları (Faz 2.8). Bu dosya her derlemede vardır ama boştur: kancaları
 * yalnızca Android uygulamasında `src/telemetry/install.ts` doldurur (`main.ts` →
 * `if (__NATIVE_APP__) await import(...)`). Web derlemesinde Firebase, rıza ekranı ve gönderici
 * hiç yoktur; `track()` hiçbir şey yapmaz (`npm run check:web` bunu derlenmiş pakette denetler).
 */
export interface TelemetryHooks {
  /** Olay göndericisi (rıza yoksa olayı atar). */
  sink: ((event: AnalyticsEvent) => void) | null;
  /** İlk açılış rıza ekranı; gösterilecek bir şey yoksa null. `done` kapanınca çağrılır. */
  consentPrompt: ((scene: Phaser.Scene, done: () => void) => MenuOverlay | null) | null;
  /** Ayarlar → Gizlilik ekranı: başlık ve öğeler (yalnızca uygulamada, Firebase yapılandırılmışsa). */
  privacy: { readonly title: () => string; readonly items: () => TextMenuItem[] } | null;
}

export const telemetryHooks: TelemetryHooks = {
  sink: null,
  consentPrompt: null,
  privacy: null,
};

/** Analiz olayı (olay sözlüğü: `./events.ts`). Web'de ve rıza yokken hiçbir şey yapmaz. */
export function track(event: AnalyticsEvent): void {
  telemetryHooks.sink?.(event);
}

/**
 * Sayıyı tam sayıya yuvarlayıp parametrenin aralığına kırpar (süre, gol). Olay sözlüğü (`events.ts`)
 * burada içe aktarılmaz: açıklama metinleri web paketine girmesin.
 */
export function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
