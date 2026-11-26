import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { DISPLAY, TOUCH } from '../src/config/gameConfig';
import './game';

/**
 * En-boy oranı test matrisi (Faz 2.2): `npm run build:mobile && npm run screens`.
 *
 * Her oran için çentiksiz ve çentikli (yatayda sol kenarda 32 CSS px; tablette üst kenarda 24 px)
 * menü, karakter seçimi, maç (dokunmatik butonlar) ve gol tekrarı ekran görüntüsü alınır. Çentik,
 * Capacitor'un WebView'a verdiği CSS değişkeniyle (`--safe-area-inset-*`) benzetilir; görüntüde
 * çentik ve yuvarlak köşeler siyah olarak çizilir (oyunun parçası değil, yalnızca test kaplaması).
 * Görüntüler `ekran-matrisi/` klasörüne yazılır (depoya girmez). CI'da çalışmaz.
 */
const OUT = 'ekran-matrisi';
const QUALITY = 80;
const DPR = 2;
const NOTCH_PX = 32;
const TABLET_CUTOUT_PX = 24;
const PHONE_CORNER_PX = 26;
const TABLET_CORNER_PX = 14;

interface Screen {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly tablet: boolean;
}

const SCREENS: readonly Screen[] = [
  { name: '16x9', width: 640, height: 360, tablet: false },
  { name: '18x9', width: 720, height: 360, tablet: false },
  { name: '19.5x9', width: 780, height: 360, tablet: false },
  { name: '20x9', width: 800, height: 360, tablet: false },
  { name: '21x9', width: 840, height: 360, tablet: false },
  { name: '4x3-tablet', width: 1024, height: 768, tablet: true },
  { name: '16x10-tablet', width: 1280, height: 800, tablet: true },
];

type Side = 'left' | 'right' | 'top';

/** Çentik benzetimi: CSS değişkeni (oyunun okuduğu) + görsel kaplama (yalnızca görüntü için). */
async function simulateDevice(page: Page, screen: Screen, notch: Side | null): Promise<void> {
  await page.addInitScript(
    ({ notch, size, corner }: { notch: string | null; size: number; corner: number }) => {
      const apply = (): void => {
        const root = document.documentElement;
        for (const s of ['left', 'right', 'top', 'bottom'])
          root.style.setProperty(`--safe-area-inset-${s}`, s === notch ? `${size}px` : '0px');
        let mask = document.getElementById('test-device-mask');
        if (!mask) {
          mask = document.createElement('div');
          mask.id = 'test-device-mask';
          document.body.appendChild(mask);
        }
        const cut =
          notch === 'left'
            ? `<div style="position:fixed;left:0;top:50%;width:${size - 4}px;height:44%;transform:translateY(-50%);background:#000;border-radius:0 18px 18px 0"></div>`
            : notch === 'right'
              ? `<div style="position:fixed;right:0;top:50%;width:${size - 4}px;height:44%;transform:translateY(-50%);background:#000;border-radius:18px 0 0 18px"></div>`
              : notch === 'top'
                ? `<div style="position:fixed;top:0;left:50%;width:${size}px;height:${size - 6}px;transform:translateX(-50%);background:#000;border-radius:0 0 50% 50%"></div>`
                : '';
        mask.innerHTML = `<div style="position:fixed;inset:0;border-radius:${corner}px;box-shadow:0 0 0 60px #000;pointer-events:none;z-index:99"></div><div style="position:fixed;inset:0;pointer-events:none;z-index:99">${cut}</div>`;
      };
      Reflect.set(globalThis, '__setNotch', (side: string | null) => {
        notch = side;
        apply();
      });
      document.addEventListener('DOMContentLoaded', apply);
    },
    {
      notch,
      size: screen.tablet ? TABLET_CUTOUT_PX : NOTCH_PX,
      corner: screen.tablet ? TABLET_CORNER_PX : PHONE_CORNER_PX,
    },
  );
}

async function newDevice(browser: Browser, screen: Screen, notch: Side | null) {
  const context: BrowserContext = await browser.newContext({
    viewport: { width: screen.width, height: screen.height },
    deviceScaleFactor: DPR,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await simulateDevice(page, screen, notch);
  return { context, page };
}

const isActive = (page: Page, key: string): Promise<boolean> =>
  page.evaluate((k) => window.__KAFA_GAME__?.scene.isActive(k) === true, key);

async function waitScene(page: Page, key: string): Promise<void> {
  await expect.poll(() => isActive(page, key), { timeout: 20_000 }).toBe(true);
}

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

/** Maçtaki dokunmatik butonların dünya koordinatındaki konumları. */
function touchPositions(page: Page): Promise<Record<string, { x: number; y: number }>> {
  return page.evaluate(() => {
    const m = window.__KAFA_GAME__?.scene.getScene('Match') as unknown as {
      touch: { views: { def: { id: string; x: number; y: number } }[] } | null;
    };
    const out: Record<string, { x: number; y: number }> = {};
    for (const v of m.touch?.views ?? []) out[v.def.id] = { x: v.def.x, y: v.def.y };
    return out;
  });
}

const MATCH_URL = './?debug=1&cpu=easy&c1=simsek&c2=pamuk&seed=3&duration=600';

for (const screen of SCREENS) {
  const notches: (Side | null)[] = [null, screen.tablet ? 'top' : 'left'];
  for (const notch of notches) {
    const tag = `${screen.name}-${notch ? `centik-${notch === 'left' ? 'sol' : 'ust'}` : 'centiksiz'}`;
    test(tag, async ({ browser }) => {
      const { context, page } = await newDevice(browser, screen, notch);
      await page.goto('./?debug=1');
      await waitScene(page, 'Menu');
      await page.waitForTimeout(2500);
      await shot(page, `${tag}-1-menu`);
      await page.keyboard.press('Enter');
      await waitScene(page, 'Select');
      await page.waitForTimeout(1200);
      await shot(page, `${tag}-2-secim`);

      await page.goto(MATCH_URL);
      await waitScene(page, 'Match');
      await hideDebug(page);
      await page.waitForTimeout(3500);
      await shot(page, `${tag}-3-mac`);
      // P1 golü → kutlamadan sonra tekrar (sinema şeritleri, "Atla" sağ altta).
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
              () =>
                !!(window.__KAFA_GAME__?.scene.getScene('Match') as { replay?: unknown }).replay,
            ),
          { timeout: 10_000 },
        )
        .toBe(true);
      await page.waitForTimeout(1200);
      await shot(page, `${tag}-4-tekrar`);
      await context.close();
    });
  }
}

test('20:9 telefon 180° döndürülünce butonlar çentikten kaçar (boyut değişmeden)', async ({
  browser,
}) => {
  const screen = SCREENS.find((s) => s.name === '20x9') ?? SCREENS[0];
  if (!screen) return;
  const { context, page } = await newDevice(browser, screen, 'left');
  await page.goto(MATCH_URL);
  await waitScene(page, 'Match');
  await hideDebug(page);
  await page.waitForTimeout(1500);
  const before = await touchPositions(page);
  // Çentik sağa geçer; pencere boyutu aynı → yalnızca güvenli alan yoklaması yakalar.
  await page.evaluate(() => {
    (Reflect.get(globalThis, '__setNotch') as (s: string) => void)('right');
  });
  await expect
    .poll(async () => (await touchPositions(page)).kick?.x, { timeout: 5000 })
    .toBeLessThan(before.kick?.x ?? 0);
  const after = await touchPositions(page);
  // Çentikli kenar 32 CSS px, öbürü köşe payı kadar; 800 CSS px → 1600 oyun px (×2).
  const notchGame = (NOTCH_PX - DISPLAY.touchEdgeMarginPx) * 2;
  expect(after.pause?.x).toBeCloseTo((before.pause?.x ?? 0) - notchGame);
  expect(after.kick?.x).toBeCloseTo((before.kick?.x ?? 0) - notchGame);
  expect(after.left?.y).toBe(before.left?.y);
  await shot(page, '20x9-centik-sag-3-mac');
  await context.close();
});

test.describe('dikey ekran (mobil tarayıcı)', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('"telefonu çevir" ekranı görünür, maç duraklar', async ({ page }) => {
    await page.goto(MATCH_URL);
    await waitScene(page, 'Match');
    await expect(page.locator('#rotate')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window.__KAFA_GAME__?.scene.getScene('Match') as { paused?: boolean }).paused === true,
        ),
      )
      .toBe(true);
    await page.waitForTimeout(500);
    await shot(page, 'dikey-telefonu-cevir');
  });
});

interface SceneHandle {
  cameras: { main: { scrollX: number; scrollY: number } };
}

/** Bir sahnenin dünya koordinatı → ekran (CSS px). */
function worldToCss(
  page: Page,
  scene: string,
  x: number,
  y: number,
): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ({ scene, x, y }) => {
      const g = window.__KAFA_GAME__ as unknown as {
        scale: {
          canvasBounds: { left: number; top: number; width: number };
          gameSize: { width: number };
        };
        scene: { getScene(s: string): SceneHandle };
      };
      const cam = g.scene.getScene(scene).cameras.main;
      const b = g.scale.canvasBounds;
      const k = b.width / g.scale.gameSize.width;
      return { x: b.left + (x - cam.scrollX) * k, y: b.top + (y - cam.scrollY) * k };
    },
    { scene, x, y },
  );
}

/** Düzenleyicide bir maç butonunun ya da tasarım konumlu araç çubuğu öğesinin dünya konumu. */
function editorPoint(
  page: Page,
  what: { button: string } | { x: number; y: number; anchor: { x: string; y: string } },
): Promise<{ x: number; y: number }> {
  return page.evaluate((w) => {
    const s = window.__KAFA_GAME__?.scene.getScene('ControlsEditor') as unknown as {
      views: { id: string; img: { x: number; y: number } }[];
      layout: { shift(a: { x: string; y: string }): { x: number; y: number } };
    };
    if ('button' in w) {
      const v = s.views.find((x) => x.id === w.button);
      if (!v) throw new Error(`buton yok: ${w.button}`);
      return { x: v.img.x, y: v.img.y };
    }
    const sh = s.layout.shift(w.anchor);
    return { x: w.x + sh.x, y: w.y + sh.y };
  }, what);
}

const VERSUS_URL = './?debug=1&scene=match&c1=simsek&c2=pamuk&seed=3&duration=600';
const LAYOUT_KEY = 'kafa-kafaya.touchLayout';

for (const name of ['20x9', '16x9', '4x3-tablet']) {
  test(`${name} dokunmatik v2: düzenleyici, solak düzen, yerel 2 oyuncu`, async ({ browser }) => {
    const screen = SCREENS.find((s) => s.name === name) ?? SCREENS[0];
    if (!screen) return;
    const { context, page } = await newDevice(browser, screen, null);
    await page.goto('./?debug=1');
    await waitScene(page, 'Menu');
    // Menü sahnesinin kendisinden aç (menü durur; gerçek akıştaki gibi).
    await page.evaluate(() => {
      (
        window.__KAFA_GAME__?.scene.getScene('Menu') as unknown as {
          scene: { start(k: string): void };
        }
      ).scene.start('ControlsEditor');
    });
    await waitScene(page, 'ControlsEditor');
    await page.waitForTimeout(1200);
    await shot(page, `${name}-5-duzenleyici`);

    // Süper'i sola-yukarı sürükle (fare = tek işaretçi), boyutunu büyüt, solak yap, kaydet.
    const sup = await editorPoint(page, { button: 'super' });
    const from = await worldToCss(page, 'ControlsEditor', sup.x, sup.y);
    const to = await worldToCss(page, 'ControlsEditor', sup.x - 150, sup.y - 40);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();
    const click = async (x: number, y: number, anchor: { x: string; y: string }) => {
      const w = await editorPoint(page, { x, y, anchor });
      const c = await worldToCss(page, 'ControlsEditor', w.x, w.y);
      await page.mouse.click(c.x, c.y);
      await page.waitForTimeout(150);
    };
    const e = TOUCH.editor;
    await click(408, e.rowY, { x: 'center', y: 'top' }); // Boyut +
    await click(870, e.rowY, { x: 'center', y: 'top' }); // Solak
    await page.waitForTimeout(300);
    await shot(page, `${name}-5b-duzenleyici-solak`);
    await click(DISPLAY.width - 104, e.panelY, { x: 'right', y: 'top' }); // Kaydet
    await waitScene(page, 'Menu');
    const saved = await page.evaluate(
      (k) =>
        JSON.parse(localStorage.getItem(k) ?? '{}') as {
          leftHanded: boolean;
          placements: { super: { x: number; y: number; scale: number } };
        },
      LAYOUT_KEY,
    );
    expect(saved.leftHanded).toBe(true);
    expect(saved.placements.super.scale).toBeCloseTo(1.1);
    expect(saved.placements.super.x).toBeCloseTo(TOUCH.buttons.super.x - 150, -1);

    await page.goto(MATCH_URL);
    await waitScene(page, 'Match');
    await hideDebug(page);
    await page.waitForTimeout(2500);
    const pos = await touchPositions(page);
    expect(pos.kick?.x ?? 0).toBeLessThan(pos.left?.x ?? 0);
    await shot(page, `${name}-6-mac-solak`);

    await page.goto(VERSUS_URL);
    await waitScene(page, 'Match');
    await hideDebug(page);
    await page.waitForTimeout(2500);
    await shot(page, `${name}-7-iki-oyuncu`);
    await context.close();
  });
}
