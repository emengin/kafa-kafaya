import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { runFixture, type ReplayFixture, type ReplayRun } from '../src/game/crossEngine/fixture';
import { DET_MATH_GOLDEN, goldenDigest } from '../src/physics/detMathGolden';
import { BUNDLE_FILE } from './determinism/bundle';
import type { DeterminismApi } from './determinism/entry';

/**
 * Çapraz motor testi (Faz 2.7, madde 7). Her kayıtlı tekrar bu süreçte (Node, V8) ve tarayıcıda
 * (proje: Chromium ya da WebKit) oynatılır; **her adımın** durum özeti karşılaştırılır. Tarayıcının
 * zinciri kayıttaki beklenen zincirle de karşılaştırılır (Node birim testi aynı zinciri denetler).
 * İlk farklı adım hata iletisinde: adım, maç evresi ve iki özet.
 */

const DIR = path.resolve('src/game/crossEngine/fixtures');
const fixtures: ReplayFixture[] = readdirSync(DIR)
  .filter((n) => n.endsWith('.json'))
  .sort()
  .map((n) => JSON.parse(readFileSync(path.join(DIR, n), 'utf-8')) as ReplayFixture);

declare global {
  interface Window {
    __KAFA_DETERMINISM__?: DeterminismApi;
  }
}

async function open(page: Page): Promise<void> {
  await page.goto('about:blank');
  await page.addScriptTag({ path: BUNDLE_FILE });
}

test('kayıtlar var ve tümü bu projede oynatılacak', () => {
  expect(fixtures.length).toBeGreaterThanOrEqual(5);
});

test('detMath altın özeti tarayıcıda Node ile aynı', async ({ page }) => {
  await open(page);
  const inBrowser = await page.evaluate(() => window.__KAFA_DETERMINISM__?.golden() ?? '');
  expect(goldenDigest()).toBe(DET_MATH_GOLDEN);
  expect(inBrowser).toBe(DET_MATH_GOLDEN);
});

for (const fixture of fixtures) {
  test(`tekrar ${fixture.name}: ${fixture.ticks} adımın her birinin özeti Node ile aynı`, async ({
    page,
  }) => {
    await open(page);
    const node = runFixture(fixture);
    const browser = await page.evaluate(
      (f) => window.__KAFA_DETERMINISM__?.run(f) ?? null,
      fixture,
    );
    expect(browser).not.toBeNull();
    const run = browser as ReplayRun;
    expect(run.checksums.length).toBe(fixture.ticks);
    const at = node.checksums.findIndex((c, i) => c !== run.checksums[i]);
    expect(
      at,
      at < 0
        ? ''
        : `ilk fark ${at + 1}. adımda: Node ${node.checksums[at] ?? '-'}, ` +
            `tarayıcı ${run.checksums[at] ?? '-'}`,
    ).toBe(-1);
    expect(run.chain).toEqual(fixture.chain);
    expect(run.coverage).toEqual(node.coverage);
  });
}
