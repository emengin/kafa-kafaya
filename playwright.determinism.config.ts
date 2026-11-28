import { defineConfig } from '@playwright/test';

/**
 * Çapraz motor determinizm testi (Faz 2.7, madde 7): kayıtlı tekrarlar Chromium'da (V8), WebKit'te
 * (JavaScriptCore) ve testi koşan Node'da (V8) oynatılır; her adımın durum özeti karşılaştırılır.
 * Tek fark testi (ve CI'ı) kırar. Sunucu gerekmez: simülasyon tek dosyaya derlenip boş sayfaya
 * eklenir (`e2e/determinism/bundle.ts`).
 *
 * `npm run test:determinism` — tarayıcılar bir kez: `npx playwright install chromium webkit`.
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: /determinism\.spec\.ts$/,
  globalSetup: './e2e/determinism/bundle.ts',
  timeout: 120_000,
  reporter: process.env.CI ? 'github' : 'list',
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
