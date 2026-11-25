import { DISPLAY } from '../config/gameConfig';
import { isTouchDevice, onTouchDetected } from './device';
import { NO_INSETS, type Insets } from './screenFrame';

/**
 * Güvenli alan okuyucu (Faz 2.2). Pencerenin çentik / yuvarlak köşe / sistem çubuğu boşluklarını
 * (CSS px) bir ölçüm öğesiyle okur: `#safe-area-probe` (index.html) dört kenarını
 * `max(env(safe-area-inset-*), var(--safe-area-inset-*))` kadar içeriden çizer, sınırları
 * boşlukları verir.
 *
 * - `env(...)`: tarayıcının kendi değeri (iOS Safari, Chrome ≥ 140'ta Android WebView).
 * - `var(--safe-area-inset-*)`: Capacitor 8 `SystemBars` eklentisinin yerel koddan verdiği değer
 *   (eski WebView'larda `env` 0 döner). Testler de bu değişkeni yazarak çentik benzetir.
 *
 * Değişim kaynakları: boyut değişimi, yön değişimi (180° dönüşte boyut aynı kalır, yalnızca
 * çentik kenar değiştirir) ve kaçan olaylara karşı seyrek yoklama.
 *
 * Yuvarlak köşeler: Android ekran köşelerini güvenli alana katmaz. Dokunmatik cihazda her kenar
 * en az `DISPLAY.touchEdgeMarginPx` kadar içeride sayılır; köşedeki yazı ve butonlar kesilmez.
 */
const listeners = new Set<() => void>();
let current: Insets = NO_INSETS;
let raw: Insets = NO_INSETS;
let probe: HTMLElement | null = null;
let installed = false;

/** Ölçüm öğesinin verdiği boşluklar (yalnızca çentik ve sistem çubukları). */
function measureRaw(): Insets {
  if (!probe) return NO_INSETS;
  const r = probe.getBoundingClientRect();
  const w = document.documentElement.clientWidth || globalThis.innerWidth;
  const h = document.documentElement.clientHeight || globalThis.innerHeight;
  return {
    left: Math.max(0, r.left),
    top: Math.max(0, r.top),
    right: Math.max(0, w - r.right),
    bottom: Math.max(0, h - r.bottom),
  };
}

/** Arayüzün kullandığı boşluklar: dokunmatikte her kenarda en az köşe payı. */
function withMargin(insets: Insets): Insets {
  const min = isTouchDevice() ? DISPLAY.touchEdgeMarginPx : 0;
  return {
    left: Math.max(min, insets.left),
    top: Math.max(min, insets.top),
    right: Math.max(min, insets.right),
    bottom: Math.max(min, insets.bottom),
  };
}

function same(a: Insets, b: Insets): boolean {
  return a.left === b.left && a.top === b.top && a.right === b.right && a.bottom === b.bottom;
}

/** Boşlukları yeniden ölç; değiştiyse dinleyicilere haber ver. */
export function checkSafeArea(): void {
  const nextRaw = measureRaw();
  const next = withMargin(nextRaw);
  if (same(next, current) && same(nextRaw, raw)) return;
  raw = nextRaw;
  current = next;
  for (const fn of listeners) fn();
}

/** index.html'deki ölçüm öğesini bağlar ve olayları dinlemeye başlar (bir kez). */
export function installSafeArea(): void {
  if (installed) return;
  installed = true;
  probe = document.getElementById('safe-area-probe');
  raw = measureRaw();
  current = withMargin(raw);
  const check = (): void => {
    checkSafeArea();
    // Yön değişiminde tarayıcı yerleşimi birkaç kare sonra günceller.
    requestAnimationFrame(() => {
      checkSafeArea();
    });
  };
  globalThis.addEventListener('resize', check);
  globalThis.addEventListener('orientationchange', check);
  // Eski Safari'de `screen.orientation` yok.
  const orientation = screen.orientation as ScreenOrientation | undefined;
  orientation?.addEventListener('change', check);
  setInterval(checkSafeArea, DISPLAY.safeAreaPollMs);
  // Dokunmatik sonradan algılanırsa (ilk dokunuş) köşe payı devreye girer.
  onTouchDetected(checkSafeArea);
}

/** Pencerenin güvenli alan boşlukları (CSS px; dokunmatikte köşe payı dahil) — arayüz için. */
export function safeAreaInsets(): Insets {
  return current;
}

/** Yalnızca çentik ve sistem çubukları (CSS px) — tuvalin yerleşimi için (`fitParent`). */
export function cutoutInsets(): Insets {
  return raw;
}

/** Boşluklar değişince çağrılır; dönen fonksiyon aboneliği kaldırır. */
export function onSafeAreaChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
