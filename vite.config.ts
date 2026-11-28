/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { PLATFORM } from './src/config/gameConfig.ts';
import { MOBILE } from './scripts/mobile/target.ts';
import { customPhaser } from './scripts/phaser/plugin.ts';
import { pwa } from './scripts/pwa/plugin.ts';

/**
 * GitHub Pages projeyi https://<kullanıcı>.github.io/<depo>/ altında yayınlar.
 * Actions içinde GITHUB_REPOSITORY="sahip/depo" tanımlıdır; yerelde varsayılan depo adı kullanılır.
 */
const DEFAULT_REPO_NAME = 'kafa-kafaya';
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? DEFAULT_REPO_NAME;

/** Özel Phaser derlemesi ~700 kB; Vite'ın 500 kB uyarısını anlamlı bir sınıra çekiyoruz. */
const CHUNK_SIZE_WARNING_KB = 800;

/** Sürüm numarası package.json'dan; menü altbilgisinde gösterilir. */
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
) as {
  version: string;
};

export default defineConfig(({ command, mode, isPreview }) => {
  // Mobil derleme (`npm run build:mobile`, Capacitor): WebView'da kökten açılır, PWA yok, ayrı
  // klasör. Ayrıntı: scripts/mobile/target.ts.
  const mobile = mode === MOBILE.mode || mode === MOBILE.devMode;
  // Geliştirici araçları (Faz 2.4) yalnızca geliştirme sunucusunda, testlerde ve geliştirici
  // mobil derlemesinde; yayın derlemelerinde (`build`, `build:mobile`) dal ve modül paketten atılır.
  const devTools = (command === 'serve' && isPreview !== true) || mode === MOBILE.devMode;
  // `vite preview` da command === 'serve' ile çalışır; derlenmiş web dosyaları depo alt yolunu
  // beklediği için önizlemede de aynı base kullanılmalı (yoksa varlıklar 404 verir).
  const webBase = command === 'build' || isPreview === true ? `/${repoName}/` : '/';
  return {
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __NATIVE_APP__: JSON.stringify(mobile),
      __DEV_TOOLS__: JSON.stringify(devTools),
    },
    base: mobile ? '/' : webBase,
    // Titreşim eklentisi (Faz 2.3) ve Capacitor çekirdeği yalnızca uygulamada: web derlemesinde ve
    // testlerde boş modüllere yönlenir; Capacitor web paketine (ve PWA önbelleğine) girmez.
    resolve: mobile
      ? {}
      : {
          alias: {
            '@capacitor/haptics': fileURLToPath(
              new URL('./src/platform/hapticsWebStub.ts', import.meta.url),
            ),
            // Ekran-açık eklentisi (Faz 2.4) gibi yerel eklenti kayıtları yalnızca uygulamada.
            '@capacitor/core': fileURLToPath(
              new URL('./src/platform/capacitorWebStub.ts', import.meta.url),
            ),
            // Geri tuşu ve uygulama durumu (Faz 2.5) yalnızca uygulamada.
            '@capacitor/app': fileURLToPath(
              new URL('./src/platform/appWebStub.ts', import.meta.url),
            ),
          },
        },
    plugins: [
      // Özel Phaser derlemesi: yalnızca oyunun kullandığı modüller (yalnızca üretim derlemesi).
      customPhaser(),
      // PWA: manifest, kodla çizilen simgeler ve çevrimdışı önbellek (yalnızca web üretim
      // derlemesi). Uygulamada service worker yok: güncelleme mağazadan gelir, eski önbellek
      // yeni sürümün üstünü örtmesin.
      !mobile &&
        pwa({
          name: 'Kafadarlar',
          shortName: 'Kafadarlar',
          description: 'Tarayıcıda oynanan 2D, 1v1 kafa topu oyunu.',
          lang: 'tr',
          themeColor: PLATFORM.themeColor,
          backgroundColor: PLATFORM.backgroundColor,
          cachePrefix: 'kafa-kafaya',
        }),
    ],
    build: {
      outDir: mobile ? MOBILE.outDir : 'dist',
      target: 'es2022',
      chunkSizeWarningLimit: CHUNK_SIZE_WARNING_KB,
      rollupOptions: {
        output: {
          // Kod bölme: motor (Phaser) ayrı parçada — oyun kodu değişince yeniden indirilmez,
          // tarayıcı ve service worker önbelleğinde kalır.
          manualChunks(id: string): string | undefined {
            return /[/\\](phaser|scripts[/\\]phaser)[/\\]/.test(id) ? 'phaser' : undefined;
          },
        },
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    },
  };
});
