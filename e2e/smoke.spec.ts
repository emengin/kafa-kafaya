import { expect, test, type Page } from '@playwright/test';
import './game';

/**
 * Duman testi (Faz 7): oyun açılıyor, menüden Hızlı Maç başlıyor, maç 10 sn boyunca hatasız
 * çalışıyor (simülasyon ilerliyor, konsolda hata yok). `?debug=1` yalnızca oyun nesnesini test
 * için `window.__KAFA_GAME__` olarak açar; oyun akışı gerçek klavye girdisiyle yürütülür.
 * Her test iki derlemede de koşar (playwright.config.ts: `web` ve `mobil` projeleri).
 */

/** Mobil (Capacitor) derlemesinin Playwright projesi. */
const MOBILE_PROJECT = 'mobil';

const swRegistrations = (page: Page): Promise<number> =>
  page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);

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

test('derleme hedefi: web PWA olarak, mobil uygulama olarak açılıyor', async ({ page }, info) => {
  const mobile = info.project.name === MOBILE_PROJECT;
  const errors = collectErrors(page);
  await page.goto('./?debug=1');
  await expect(page.locator('#game canvas')).toBeVisible();
  // Menü açıldıysa sayfa çoktan yüklendi (service worker kaydı `load` olayında yapılır).
  await expect.poll(() => isActive(page, 'Menu'), { timeout: 20_000 }).toBe(true);

  // Web: manifest + service worker (çevrimdışı). Mobil: ikisi de yok (güncelleme mağazadan).
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(mobile ? 0 : 1);
  if (mobile) expect(await swRegistrations(page)).toBe(0);
  else await expect.poll(() => swRegistrations(page), { timeout: 15_000 }).toBeGreaterThan(0);

  // Tam ekran düğmesi: web'de tarayıcı destekliyorsa görünür; mobilde hiç görünmez (uygulama
  // zaten tam ekran).
  const fullscreenApi = await page.evaluate(() => document.fullscreenEnabled);
  await expect(page.locator('#fullscreen')).toBeVisible({ visible: !mobile && fullscreenApi });
  expect(errors).toEqual([]);
});

interface TouchView {
  def: { key: string; x: number; y: number };
}

/** Maçtaki dokunmatik butonun ekran (CSS px) konumu: dünya → kamera → tuval. */
function touchButtonCss(page: Page, key: string): Promise<{ x: number; y: number }> {
  return page.evaluate((k) => {
    const g = window.__KAFA_GAME__ as unknown as {
      scale: {
        canvasBounds: { left: number; top: number; width: number };
        gameSize: { width: number };
      };
      scene: {
        getScene(s: string): {
          cameras: { main: { scrollX: number; scrollY: number } };
          touch: { views: TouchView[] } | null;
        };
      };
    };
    const m = g.scene.getScene('Match');
    const v = m.touch?.views.find((x) => x.def.key === k);
    if (!v) throw new Error(`dokunmatik buton yok: ${k}`);
    const b = g.scale.canvasBounds;
    const s = b.width / g.scale.gameSize.width;
    const cam = m.cameras.main;
    return { x: b.left + (v.def.x - cam.scrollX) * s, y: b.top + (v.def.y - cam.scrollY) * s };
  }, key);
}

test.describe('dokunmatik kontroller v2 (Faz 2.3)', () => {
  test.use({ hasTouch: true });

  test('iki parmak aynı anda ▶ + Şut; butonun yakınına basmak sayılır; gecikme ölçülür', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    // Gecikme ölçer açık (diğer ayarlar varsayılan).
    await page.addInitScript(() => {
      localStorage.setItem('kafa-kafaya.settings', JSON.stringify({ latencyMeter: true }));
    });
    await page.goto('./?debug=1&touch=1&cpu=easy&c1=simsek&c2=pamuk&seed=3&duration=600');
    await expect.poll(() => isActive(page, 'Match'), { timeout: 20_000 }).toBe(true);
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (
                window.__KAFA_GAME__?.scene.getScene('Match') as unknown as {
                  sim: { match: { phase: string } };
                }
              ).sim.match.phase,
          ),
        { timeout: 15_000 },
      )
      .toBe('playing');
    const p1x = (): Promise<number> =>
      page.evaluate(
        () =>
          (
            window.__KAFA_GAME__?.scene.getScene('Match') as unknown as {
              sim: { players: { x: number }[] };
            }
          ).sim.players[0]?.x ?? 0,
      );
    const right = await touchButtonCss(page, 'right');
    const kick = await touchButtonCss(page, 'kick');
    const cdp = await page.context().newCDPSession(page);
    const before = await p1x();
    // ▶'nin görselinin dışına (aşağı-sağa) bas: geniş dokunma alanı yakalamalı. Şut ortadan.
    const nearRight = { x: right.x + 30, y: right.y + 30, id: 1 };
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [nearRight, { x: kick.x, y: kick.y, id: 2 }],
    });
    await page.waitForTimeout(800);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    expect(await p1x()).toBeGreaterThan(before + 20);

    // Birkaç kısa dokunuş daha: ölçer örnek toplar ve göstergeyi yazar.
    for (let i = 0; i < 6; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: kick.x, y: kick.y, id: 3 }],
      });
      await page.waitForTimeout(120);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(150);
    }
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (
                window.__KAFA_GAME__?.scene.getScene('Match') as unknown as {
                  latencyMeter: { text: { text: string } } | null;
                }
              ).latencyMeter?.text.text ?? '',
          ),
        { timeout: 5000 },
      )
      .toMatch(/n=\d+/);
    expect(errors).toEqual([]);
  });
});
