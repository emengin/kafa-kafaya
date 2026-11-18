import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/** README ekran görüntüleri: `npm run build && npm run screenshots`. */
export default defineConfig({
  ...base,
  testMatch: /screenshots\.spec\.ts$/,
  retries: 0,
  workers: 1,
  reporter: 'list',
});
