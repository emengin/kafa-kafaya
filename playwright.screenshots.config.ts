import { defineConfig } from '@playwright/test';
import base, { webProject, webServer } from './playwright.config';

/** README ekran görüntüleri: `npm run build && npm run screenshots` (yalnızca web derlemesi). */
export default defineConfig({
  ...base,
  testMatch: /screenshots\.spec\.ts$/,
  retries: 0,
  workers: 1,
  reporter: 'list',
  projects: [webProject],
  webServer,
});
