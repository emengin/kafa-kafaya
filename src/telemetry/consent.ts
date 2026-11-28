import { isRecord } from '../save/store';

/**
 * Geçici rıza modeli (Faz 2.8; yerini Faz 8.2'deki tam rıza yönetimi alır). İki ayrı rıza:
 * **analiz** (Firebase Analytics) ve **çökme raporu** (Crashlytics). Kararın asıl kaydı Android
 * tarafında (`TelemetryPlugin`, uygulama verisi); JS yalnızca kopyasını okur.
 *
 * `unset` = henüz sorulmadı ya da kullanıcı karar vermeden kapattı: **rıza yok** sayılır, hiçbir
 * veri gönderilmez.
 */
export type ConsentValue = 'granted' | 'denied' | 'unset';

export interface ConsentState {
  readonly analytics: ConsentValue;
  readonly crash: ConsentValue;
}

export const NO_CONSENT: ConsentState = { analytics: 'unset', crash: 'unset' };

function isConsentValue(v: unknown): v is ConsentValue {
  return v === 'granted' || v === 'denied' || v === 'unset';
}

/** Yerel eklentiden gelen doğrulanmamış veri → durum (geçersiz alan `unset`, yani rıza yok). */
export function parseConsent(raw: unknown): ConsentState {
  const v = isRecord(raw) ? raw : {};
  return {
    analytics: isConsentValue(v.analytics) ? v.analytics : 'unset',
    crash: isConsentValue(v.crash) ? v.crash : 'unset',
  };
}

/** İlk açılış ekranı gösterilmeli mi? (İki karardan biri bile verilmediyse.) */
export function needsPrompt(state: ConsentState): boolean {
  return state.analytics === 'unset' || state.crash === 'unset';
}

export function isGranted(value: ConsentValue): boolean {
  return value === 'granted';
}
