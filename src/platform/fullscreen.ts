import { t } from '../i18n';
import { isTouchDevice } from './device';

/**
 * Tam ekran düğmesi ve dikey ekran uyarısı (Faz 6). İkisi de DOM öğesidir (index.html): oyun
 * tuvalinin ölçeklenmesinden ve sahnelerden bağımsız, her zaman aynı köşede. Metinler i18n'den.
 */
interface WebkitDocument {
  readonly webkitFullscreenEnabled?: boolean;
  readonly webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}
interface WebkitElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}
interface LockableOrientation {
  lock?: (orientation: string) => Promise<void>;
}

const doc = (): Document & WebkitDocument => document;

export function fullscreenSupported(): boolean {
  const d = doc();
  return d.fullscreenEnabled || d.webkitFullscreenEnabled === true;
}

export function isFullscreen(): boolean {
  const d = doc();
  return (d.fullscreenElement ?? d.webkitFullscreenElement ?? null) !== null;
}

/** Tam ekrana geç / çık. Mobilde ardından yatay yönü kilitlemeyi dener (destekleniyorsa). */
export async function toggleFullscreen(): Promise<void> {
  const d = doc();
  try {
    if (isFullscreen()) {
      if (typeof d.exitFullscreen === 'function') await d.exitFullscreen();
      else await d.webkitExitFullscreen?.();
      return;
    }
    const el = document.documentElement as HTMLElement & WebkitElement;
    if (typeof el.requestFullscreen === 'function') await el.requestFullscreen();
    else await el.webkitRequestFullscreen?.();
    // Eski Safari'de `screen.orientation`, çoğu tarayıcıda da `lock` yoktur.
    const orientation = screen.orientation as unknown as LockableOrientation | undefined;
    await orientation?.lock?.('landscape').catch(() => undefined);
  } catch {
    // Tarayıcı reddederse (kullanıcı hareketi yok, iOS iPhone) sessizce yok say.
  }
}

let button: HTMLButtonElement | null = null;
let inMatch = false;

function refresh(): void {
  if (!button) return;
  const label = isFullscreen() ? t('platform.exitFullscreen') : t('platform.fullscreen');
  button.title = label;
  button.setAttribute('aria-label', label);
  button.classList.toggle('active', isFullscreen());
  // Masaüstünde maç sırasında gizli (F11 de var); dokunmatikte hep görünür.
  button.hidden = !fullscreenSupported() || (inMatch && !isTouchDevice());
}

/** index.html'deki düğmeyi ve uyarıyı bağlar; dil değişince `refreshPlatformTexts` çağrılır. */
export function installPlatformUi(): void {
  button = document.getElementById('fullscreen') as HTMLButtonElement | null;
  button?.addEventListener('click', (e) => {
    e.preventDefault();
    void toggleFullscreen();
    button?.blur();
  });
  document.addEventListener('fullscreenchange', refresh);
  document.addEventListener('webkitfullscreenchange', refresh);
  refreshPlatformTexts();
}

export function refreshPlatformTexts(): void {
  const rotate = document.getElementById('rotate-text');
  if (rotate) rotate.textContent = t('platform.rotate');
  refresh();
}

/** Maç sahnesi açılınca/kapanınca: masaüstünde tam ekran düğmesi maçta gizlenir. */
export function setInMatch(value: boolean): void {
  inMatch = value;
  refresh();
}
