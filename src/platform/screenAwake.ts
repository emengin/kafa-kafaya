import { registerPlugin } from '@capacitor/core';
import { IS_NATIVE_APP } from './target';

/**
 * Maç sırasında ekranın kapanmaması (Faz 2.4). Maç dokunuşsuz da sürebilir (gamepad, yapay zekâ
 * maçı, 15 dakikalık dayanıklılık testi); sistemin ekran zaman aşımı maçı karartmasın.
 *
 * - Uygulama: yerel `ScreenAwake` eklentisi (`FLAG_KEEP_SCREEN_ON`; MainActivity'de kayıtlı).
 *   Android WebView, Screen Wake Lock API'sini desteklemiyor.
 * - Tarayıcı: Screen Wake Lock API (sekme gizlenince tarayıcı kilidi bırakır; sekme dönünce
 *   yeniden istenir). Desteklenmiyorsa sessizce atlanır.
 *
 * Web derlemesinde `@capacitor/core` boş bir modüle yönlenir (`vite.config.ts`).
 */
interface ScreenAwakePlugin {
  set(options: { on: boolean }): Promise<void>;
}

let plugin: ScreenAwakePlugin | null = null;
let wanted = false;
let lock: WakeLockSentinel | null = null;
let listening = false;

export function setScreenAwake(on: boolean): void {
  if (on === wanted) return;
  wanted = on;
  if (IS_NATIVE_APP) {
    plugin ??= registerPlugin<ScreenAwakePlugin>('ScreenAwake');
    plugin.set({ on }).catch(() => undefined);
    return;
  }
  if (!listening && typeof document !== 'undefined') {
    listening = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void syncWebLock();
    });
  }
  void syncWebLock();
}

async function syncWebLock(): Promise<void> {
  const api = (globalThis.navigator as Navigator | undefined)?.wakeLock;
  if (!api) return;
  try {
    if (wanted && (!lock || lock.released)) lock = await api.request('screen');
    else if (!wanted && lock) {
      await lock.release();
      lock = null;
    }
  } catch {
    // İzin yok / sekme görünmüyor / pil tasarrufu: kilit alınamazsa oyun yine çalışır.
  }
}
