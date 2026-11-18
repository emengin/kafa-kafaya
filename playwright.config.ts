import { defineConfig } from '@playwright/test';

/**
 * Playwright duman testi (Faz 7). Üretim derlemesi `vite preview` ile sunulur; test oyunu açar,
 * menüden maç başlatır ve 10 sn hatasız çalıştığını denetler. CI'da Playwright'ın Chromium'u,
 * yerelde kurulu Chrome kullanılır (tarayıcı indirmeden).
 *
 * Önce derleme gerekir: `npm run build && npm run test:e2e`.
 */
const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  testMatch: /smoke\.spec\.ts$/,
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/kafa-kafaya/`,
    viewport: { width: 1280, height: 720 },
    ...(process.env.CI ? {} : { channel: 'chrome' }),
    launchOptions: { args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'] },
  },
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/kafa-kafaya/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
