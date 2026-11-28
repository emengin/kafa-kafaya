/**
 * Mobil (Capacitor) derlemesinin tek kaynağı (Faz 2.1). `vite.config.ts`, `capacitor.config.ts`,
 * Playwright ve yer tutucu simge betiği buradan okur; değerler tek yerde değişir.
 *
 * Web sürümü GitHub Pages'te `/<depo>/` alt yolunda yayınlanır; uygulama ise WebView'da
 * `https://localhost/` kökünden açılır. Bu yüzden mobil derleme kendi kipinde (`--mode mobile`),
 * `/` tabanıyla ve **ayrı klasöre** derlenir: web derlemesi (`dist/`) yanlışlıkla uygulamaya
 * kopyalanamaz, mobil derleme de web yayınını ve web duman testini bozmaz.
 */
export const MOBILE = {
  /** `vite build --mode mobile` → `import.meta.env.MODE` ve `__NATIVE_APP__` bayrağı. */
  mode: 'mobile',
  /**
   * Geliştirici derlemesi (Faz 2.4; `npm run build:mobile:dev`, `npm run cap:sync:dev`): mobil
   * derlemeyle aynı, ek olarak geliştirici araçları (`__DEV_TOOLS__`: kare süresi grafiği, stres
   * sahnesi, rollback ölçer, `?gl=` deney bayrakları). Yayına giden derleme `mode`'dur.
   */
  devMode: 'mobile-dev',
  /** Mobil derlemenin çıktı klasörü = Capacitor `webDir`. */
  outDir: 'dist-mobile',
  appId: 'com.emengin.kafakafaya',
  appName: 'Kafadarlar',
  /** Android projesinin klasörü (Capacitor varsayılanı). */
  androidDir: 'android',
} as const;
