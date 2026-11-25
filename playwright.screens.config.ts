import { defineConfig } from '@playwright/test';
import base, { mobileProject, mobileServer, webProject, webServer } from './playwright.config';

/**
 * En-boy oranı test matrisi (Faz 2.2): `npm run build && npm run build:mobile && npm run screens`.
 * Oran matrisi mobil (Capacitor) derlemesinde, dikey ekran uyarısı web derlemesinde (mobil
 * tarayıcı) koşar. Görüntüler `ekran-matrisi/` altına. CI'da çalışmaz.
 */
export default defineConfig({
  ...base,
  testMatch: /screens\.spec\.ts$/,
  retries: 0,
  workers: 3,
  reporter: 'list',
  projects: [
    { ...mobileProject, grepInvert: /dikey ekran/ },
    { ...webProject, grep: /dikey ekran/ },
  ],
  webServer: [webServer, mobileServer],
});
