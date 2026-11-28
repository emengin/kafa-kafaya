import { defineConfig, type Project } from '@playwright/test';
import { MOBILE } from './scripts/mobile/target.ts';

/**
 * Playwright duman testi (Faz 7; mobil derleme Faz 2.1). Üretim derlemeleri `vite preview` ile
 * sunulur; test oyunu açar, menüden maç başlatır ve 10 sn hatasız çalıştığını denetler. İki proje:
 * `web` (GitHub Pages derlemesi, depo alt yolunda) ve `mobil` (Capacitor derlemesi, kökte). CI'da
 * Playwright'ın Chromium'u, yerelde kurulu Chrome kullanılır (tarayıcı indirmeden).
 *
 * Önce iki derleme de gerekir: `npm run build && npm run build:mobile && npm run test:e2e`.
 */
const WEB_PORT = 4173;
const MOBILE_PORT = 4174;
const WEB_URL = `http://localhost:${WEB_PORT}/kafadarlar/`;
const MOBILE_URL = `http://localhost:${MOBILE_PORT}/`;
const SERVER_TIMEOUT = 60_000;

export const webProject: Project = { name: 'web', use: { baseURL: WEB_URL } };
export const mobileProject: Project = { name: 'mobil', use: { baseURL: MOBILE_URL } };

export const webServer = {
  command: `npm run preview -- --port ${WEB_PORT} --strictPort`,
  url: WEB_URL,
  reuseExistingServer: !process.env.CI,
  timeout: SERVER_TIMEOUT,
};
export const mobileServer = {
  command: `npm run preview -- --mode ${MOBILE.mode} --port ${MOBILE_PORT} --strictPort`,
  url: MOBILE_URL,
  reuseExistingServer: !process.env.CI,
  timeout: SERVER_TIMEOUT,
};

export default defineConfig({
  testDir: 'e2e',
  testMatch: /smoke\.spec\.ts$/,
  timeout: 120_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    viewport: { width: 1280, height: 720 },
    ...(process.env.CI ? {} : { channel: 'chrome' }),
    launchOptions: { args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'] },
  },
  projects: [webProject, mobileProject],
  webServer: [webServer, mobileServer],
});
