import { expect, test, type Page } from '@playwright/test';
import './game';

/**
 * Duman testi (Faz 7): oyun açılıyor, menüden Hızlı Maç başlıyor, maç 10 sn boyunca hatasız
 * çalışıyor (simülasyon ilerliyor, konsolda hata yok). `?debug=1` yalnızca oyun nesnesini test
 * için `window.__KAFA_GAME__` olarak açar; oyun akışı gerçek klavye girdisiyle yürütülür.
 */

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

const isActive = (page: Page, key: string): Promise<boolean> =>
  page.evaluate((k) => window.__KAFA_GAME__?.scene.isActive(k) === true, key);

/** Çizilen kare sayısı (gol tekrarında simülasyon adımı geri sarıldığı için kare sayılır). */
const frame = (page: Page): Promise<number> =>
  page.evaluate(() => window.__KAFA_GAME__?.loop.frame ?? -1);

const matchTick = (page: Page): Promise<number> =>
  page.evaluate(() => window.__KAFA_GAME__?.scene.getScene('Match').sim?.tick ?? -1);

test('oyun açılıyor, maç başlıyor, 10 sn hatasız çalışıyor', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('./?debug=1');
  await expect(page.locator('#game canvas')).toBeVisible();
  await expect.poll(() => isActive(page, 'Menu'), { timeout: 20_000 }).toBe(true);

  // Hızlı Maç → karakter seçimi → maç (gerçek klavye girdisi).
  await page.keyboard.press('Enter');
  await expect.poll(() => isActive(page, 'Select'), { timeout: 10_000 }).toBe(true);
  await page.keyboard.press('Space');
  await expect.poll(() => isActive(page, 'Match'), { timeout: 10_000 }).toBe(true);

  const startFrame = await frame(page);
  const startTick = await matchTick(page);
  // Oyuncu biraz hareket etsin (girdi yolu da denetlensin).
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(1000);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(9000);

  // 10 sn boyunca oyun çizilmeye ve simülasyon ilerlemeye devam etmeli (yavaş CI GPU'sunda bile
  // saniyede onlarca kare).
  expect((await frame(page)) - startFrame).toBeGreaterThan(150);
  expect(await matchTick(page)).toBeGreaterThan(startTick);
  expect(await isActive(page, 'Match')).toBe(true);
  expect(errors).toEqual([]);
});
