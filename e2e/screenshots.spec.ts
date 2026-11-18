import { expect, test, type Page } from '@playwright/test';
import './game';

/**
 * README ekran görüntüleri (Faz 7): `npm run screenshots` (üretim derlemesi gerekir). Görüntüler
 * `docs/screenshots/` altına JPEG olarak yazılır. Duman testinden ayrı yapılandırmayla çalışır
 * (`playwright.screenshots.config.ts`); CI'da çalışmaz.
 */
const OUT = 'docs/screenshots';
const QUALITY = 82;

const isActive = (page: Page, key: string): Promise<boolean> =>
  page.evaluate((k) => window.__KAFA_GAME__?.scene.isActive(k) === true, key);

async function waitScene(page: Page, key: string): Promise<void> {
  await expect.poll(() => isActive(page, key), { timeout: 20_000 }).toBe(true);
}

/** Debug katmanını gizle (oyun nesnesine erişim için `?debug=1` kullanılıyor). */
async function hideDebug(page: Page): Promise<void> {
  await page.evaluate(() => {
    const m = window.__KAFA_GAME__?.scene.getScene('Match') as
      { debug?: { setVisible(v: boolean): void } } | undefined;
    m?.debug?.setVisible(false);
  });
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: QUALITY });
}

test('ana menü, ayarlar ve karakter seçimi', async ({ page }) => {
  await page.goto('./?debug=1');
  await waitScene(page, 'Menu');
  await page.waitForTimeout(3000);
  await shot(page, 'menu');
  await page.keyboard.press('Enter');
  await waitScene(page, 'Select');
  await page.waitForTimeout(1500);
  await shot(page, 'select');
});

test('maç ve gol tekrarı', async ({ page }) => {
  await page.goto('./?debug=1&cpu=hard&cpu1=hard&seed=11&c1=kor&c2=ayaz&duration=600');
  await waitScene(page, 'Match');
  await hideDebug(page);
  await page.waitForTimeout(6500);
  await shot(page, 'match');
  // P1 golü: top sağ kalenin içine; kutlamadan sonra tekrar başlar.
  await page.evaluate(() => {
    const m = window.__KAFA_GAME__?.scene.getScene('Match') as unknown as {
      sim: {
        pitch: { goals: { lineX: number }[]; groundY: number };
        ball: { resetTo(x: number, y: number): void };
      };
    };
    const g = m.sim.pitch.goals[1];
    if (g) m.sim.ball.resetTo(g.lineX + 45, m.sim.pitch.groundY - 45);
  });
  await expect
    .poll(
      () =>
        page.evaluate(
          () => !!(window.__KAFA_GAME__?.scene.getScene('Match') as { replay?: unknown }).replay,
        ),
      { timeout: 10_000 },
    )
    .toBe(true);
  await page.waitForTimeout(1200);
  await shot(page, 'replay');
});

test('turnuva ağacı', async ({ page }) => {
  await page.goto('./?debug=1');
  await waitScene(page, 'Menu');
  for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await waitScene(page, 'Select');
  await page.keyboard.press('Space');
  await waitScene(page, 'Tournament');
  await page.waitForTimeout(1500);
  await shot(page, 'tournament');
});

test.describe('mobil', () => {
  test.use({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  test('dokunmatik butonlar', async ({ page }) => {
    await page.goto('./?debug=1&cpu=easy&c1=simsek&c2=pamuk&seed=3');
    await waitScene(page, 'Match');
    await hideDebug(page);
    await page.waitForTimeout(3000);
    await shot(page, 'mobile');
  });
});
