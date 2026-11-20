import { expect, test, type Page } from '@playwright/test';
import './game';

/**
 * Duman testi (Faz 7): oyun açılıyor, menüden Hızlı Maç başlıyor, maç 10 sn boyunca hatasız
 * çalışıyor (simülasyon ilerliyor, konsolda hata yok). `?debug=1` yalnızca oyun nesnesini test
 * için `window.__KAFA_GAME__` olarak açar; oyun akışı gerçek klavye girdisiyle yürütülür.
 */

/** `src/ui/LiteGraphics.ts` `LITE_FALLBACK_WARNING`: hızlı çizim yolu Phaser'ın yoluna düştü. */
const LITE_FALLBACK = '[LiteGraphics]';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
    // Yedek çizici oyunu bozmaz ama yavaşlatır (genelde Phaser güncellemesi sonrası): hata say.
    if (msg.type() === 'warning' && msg.text().startsWith(LITE_FALLBACK)) errors.push(msg.text());
  });
  return errors;
}

const isActive = (page: Page, key: string): Promise<boolean> =>
  page.evaluate((k) => window.__KAFA_GAME__?.scene.isActive(k) === true, key);

/** Çizilen kare sayısı (gol tekrarında simülasyon adımı geri sarıldığı için kare sayılır). */
const frame = (page: Page): Promise<number> =>
  page.evaluate(() => window.__KAFA_GAME__?.loop.frame ?? -1);

/** 10 sn'de en az bu kadar kare (CI yazılım çiziminde ~70, yerelde ~600). */
const MIN_FRAMES = 30;

const matchTick = (page: Page): Promise<number> =>
  page.evaluate(() => window.__KAFA_GAME__?.scene.getScene('Match').sim?.tick ?? -1);

/**
 * Sahne açılana kadar tuşa yeniden basar: yavaş CI makinesinde sahne geçişi (solma, girdi
 * kilidi) sürerken basılan tuş yok sayılabilir. Seçim ekranında onay tekrarına karşı korumalı.
 */
async function pressUntilActive(page: Page, key: string, scene: string): Promise<void> {
  await expect
    .poll(
      async () => {
        if (await isActive(page, scene)) return true;
        await page.keyboard.press(key);
        return isActive(page, scene);
      },
      { timeout: 30_000, intervals: [1000] },
    )
    .toBe(true);
}

test('oyun açılıyor, maç başlıyor, 10 sn hatasız çalışıyor', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('./?debug=1');
  await expect(page.locator('#game canvas')).toBeVisible();
  await expect.poll(() => isActive(page, 'Menu'), { timeout: 20_000 }).toBe(true);

  // Hızlı Maç → karakter seçimi → maç (gerçek klavye girdisi).
  await pressUntilActive(page, 'Enter', 'Select');
  await pressUntilActive(page, 'Space', 'Match');

  const startFrame = await frame(page);
  const startTick = await matchTick(page);
  // Oyuncu biraz hareket etsin (girdi yolu da denetlensin).
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(1000);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(9000);

  // 10 sn boyunca oyun çizilmeye ve simülasyon ilerlemeye devam etmeli. CI'da GPU yok (yazılım
  // çizimi, ~7 FPS) — eşik kare hızını değil, döngünün donmadığını denetler.
  expect((await frame(page)) - startFrame).toBeGreaterThan(MIN_FRAMES);
  expect(await matchTick(page)).toBeGreaterThan(startTick);
  expect(await isActive(page, 'Match')).toBe(true);
  expect(errors).toEqual([]);
});
