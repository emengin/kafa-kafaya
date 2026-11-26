import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { TOUCH } from '../config/gameConfig';
import { getSettings } from '../save/gameSettings';
import { IS_NATIVE_APP } from './target';

/**
 * Dokunma titreşimi (Faz 2.3; QUALITY_BAR A4, §5). Uygulamada Capacitor Haptics eklentisi
 * (Android Vibrator; sistemin "dokunma titreşimi" ayarından bağımsız), tarayıcıda Vibration API
 * (`navigator.vibrate`; iOS Safari'de yok → sessizce atlanır). Ayarlar → Kontroller → Titreşim ile
 * kapatılır.
 *
 * Eklenti yalnızca mobil derlemede pakete girer: web derlemesinde `@capacitor/haptics` boş bir
 * modüle yönlenir (`vite.config.ts` → `resolve.alias`) ve derleme sabiti dalı atar.
 */
type Impact = () => void;

let impact: Impact | null = null;
let installed = false;

export function initHaptics(): void {
  if (installed) return;
  installed = true;
  if (IS_NATIVE_APP) {
    impact = () => {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
    };
    return;
  }
  const nav = globalThis.navigator as Navigator | undefined;
  if (typeof nav?.vibrate === 'function') {
    impact = () => {
      try {
        nav.vibrate(TOUCH.vibrateMs);
      } catch {
        // Kullanıcı etkileşimi öncesi ya da izin yoksa tarayıcı reddeder; yok say.
      }
    };
  }
}

/** Kısa, hafif titreşim (buton basışı). Ayar kapalıysa ya da cihaz desteklemiyorsa hiçbir şey. */
export function tapHaptic(): void {
  if (!impact || !getSettings().vibration) return;
  impact();
}
