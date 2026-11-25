import type { CapacitorConfig } from '@capacitor/cli';
import { MOBILE } from './scripts/mobile/target.ts';
import { PLATFORM } from './src/config/gameConfig.ts';

/**
 * Capacitor yapılandırması (Faz 2.1). Web dosyaları `npm run build:mobile` ile `dist-mobile/`
 * klasörüne derlenir, `npm run cap:sync` onları Android projesine kopyalar. Ayrıntı ve adımlar:
 * README → "Android'de çalıştırma".
 */
const config: CapacitorConfig = {
  appId: MOBILE.appId,
  appName: MOBILE.appName,
  webDir: MOBILE.outDir,
  // Oyun yüklenene kadar WebView'ın rengi: açılış ekranıyla aynı, beyaz parlama olmasın.
  backgroundColor: PLATFORM.backgroundColor,
  plugins: {
    SystemBars: {
      // Durum ve gezinme çubukları açılışta gizli (oyun tam ekran). Kenardan kaydırınca geçici
      // görünüp kaybolmaları ve uygulamaya dönünce yeniden gizlenmeleri MainActivity'de.
      hidden: true,
      // index.html `viewport-fit=cover` kullanıyor; ilk karede yerleşim kaymasın.
      initialViewportFitValueHint: 'cover',
    },
  },
};

export default config;
