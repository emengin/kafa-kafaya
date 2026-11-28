import { readFileSync } from 'node:fs';
import type { ConfigEnv, Plugin, PluginOption, UserConfig } from 'vite';
import { describe, expect, it } from 'vitest';
import capacitorConfig from '../../capacitor.config';
import { PLATFORM } from '../../src/config/gameConfig';
import viteConfig from '../../vite.config';
import { MOBILE } from './target';

/**
 * Mobil derleme (Faz 2.1): web ve mobil derleme kiplerinin ayrımı ve TypeScript tarafındaki
 * değerlerle Android projesindeki kopyalarının eşitliği (biri değişip öteki unutulmasın).
 */
const ANDROID_MAIN = `${MOBILE.androidDir}/app/src/main`;
const read = (file: string): string => readFileSync(file, 'utf-8');

function resolveVite(env: ConfigEnv): UserConfig {
  if (typeof viteConfig !== 'function') throw new Error('vite.config.ts bir fonksiyon olmalı');
  return viteConfig(env);
}

function pluginNames(plugins: PluginOption[] | undefined): string[] {
  return (plugins ?? [])
    .flat()
    .filter((p): p is Plugin => typeof p === 'object' && p !== null && 'name' in p)
    .map((p) => p.name);
}

describe('Mobil derleme — Vite kipleri', () => {
  it('web derlemesi: depo alt yolu, dist/, PWA açık, yerel bayrak kapalı', () => {
    const web = resolveVite({ command: 'build', mode: 'production' });
    expect(web.base).toMatch(/^\/[^/]+\/$/);
    expect(web.base).not.toBe('/');
    expect(web.build?.outDir).toBe('dist');
    expect(web.define?.__NATIVE_APP__).toBe('false');
    expect(pluginNames(web.plugins)).toContain('kafadarlar-pwa');
  });

  it('mobil derleme: kök yol, ayrı klasör, PWA (service worker) yok, yerel bayrak açık', () => {
    const mobile = resolveVite({ command: 'build', mode: MOBILE.mode });
    expect(mobile.base).toBe('/');
    expect(mobile.build?.outDir).toBe(MOBILE.outDir);
    expect(mobile.define?.__NATIVE_APP__).toBe('true');
    expect(pluginNames(mobile.plugins)).not.toContain('kafadarlar-pwa');
  });

  it('mobil önizleme de kök yolu kullanır (Playwright mobil duman testi)', () => {
    const preview = resolveVite({ command: 'serve', mode: MOBILE.mode, isPreview: true });
    expect(preview.base).toBe('/');
    expect(preview.build?.outDir).toBe(MOBILE.outDir);
  });
});

describe('Mobil derleme — Capacitor ve Android projesi', () => {
  it('capacitor.config.ts tek kaynaktan okur', () => {
    expect(capacitorConfig.appId).toBe(MOBILE.appId);
    expect(capacitorConfig.appName).toBe(MOBILE.appName);
    expect(capacitorConfig.webDir).toBe(MOBILE.outDir);
    expect(capacitorConfig.backgroundColor).toBe(PLATFORM.backgroundColor);
  });

  it('Android uygulama kimliği ve adı capacitor.config.ts ile aynı', () => {
    const gradle = read(`${MOBILE.androidDir}/app/build.gradle`);
    expect(gradle).toContain(`applicationId "${MOBILE.appId}"`);
    expect(gradle).toContain(`namespace = "${MOBILE.appId}"`);
    const strings = read(`${ANDROID_MAIN}/res/values/strings.xml`);
    expect(strings).toContain(`<string name="app_name">${MOBILE.appName}</string>`);
  });

  it('ekran yataya kilitli, uygulama oyun olarak işaretli', () => {
    const manifest = read(`${ANDROID_MAIN}/AndroidManifest.xml`);
    expect(manifest).toContain('android:screenOrientation="userLandscape"');
    expect(manifest).toContain('android:appCategory="game"');
  });

  it('açılış ekranı zemini oyunun zemin rengiyle aynı', () => {
    const colors = read(`${ANDROID_MAIN}/res/values/colors.xml`);
    const match = /<color name="splash_background">(#[0-9a-fA-F]{6})<\/color>/.exec(colors);
    expect(match?.[1]?.toLowerCase()).toBe(PLATFORM.backgroundColor.toLowerCase());
  });
});
