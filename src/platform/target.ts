/**
 * Derleme hedefi (Faz 2.1). `true` → Capacitor uygulaması (`npm run build:mobile`, Vite
 * `--mode mobile`); oyun telefonda uygulamanın kendi WebView'ında açılır. Web derlemesinden
 * farkları:
 *
 * - Service worker ve PWA manifesti yok: güncelleme mağazadan gelir, eski önbellek araya girmez.
 * - Tam ekran düğmesi yok: uygulama zaten tam ekran (sistem çubuklarını `MainActivity` gizler).
 *
 * Derleme sabiti (`vite.config.ts` → `define`): kullanılmayan dal paketten atılır.
 */
export const IS_NATIVE_APP: boolean = __NATIVE_APP__;
