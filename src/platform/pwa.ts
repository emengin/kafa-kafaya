import { IS_NATIVE_APP } from './target';

/**
 * PWA (Faz 6): üretim derlemesinde service worker kaydı. `sw.js`, `manifest.webmanifest` ve
 * simgeler derleme sırasında Vite eklentisiyle üretilir (`scripts/pwa`); service worker tüm
 * derleme dosyalarını önbelleğe alır, oyun ilk açılıştan sonra çevrimdışı çalışır ve ana ekrana
 * eklenebilir. Geliştirme sunucusunda kayıt yapılmaz (önbellek sıcak yeniden yüklemeyi bozmasın);
 * mobil uygulamada da yapılmaz (Faz 2.1: güncelleme mağazadan gelir, `sw.js` üretilmez).
 */
export function registerServiceWorker(): void {
  if (IS_NATIVE_APP || !import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const base = import.meta.env.BASE_URL;
  const register = (): void => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => undefined);
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
