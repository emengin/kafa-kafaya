import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { renderIcon, renderSplash } from './icon';
import { crc32, encodePng } from './png';
import { buildServiceWorker, cacheVersion } from './serviceWorker';

describe('PWA — PNG kodlayıcı', () => {
  it('geçerli PNG: imza, IHDR boyutları, CRC ve sıkıştırılmış piksel verisi', () => {
    const w = 3;
    const h = 2;
    const rgba = new Uint8Array(w * h * 4).map((_, i) => i);
    const png = encodePng(w, h, rgba);
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(png.toString('ascii', 12, 16)).toBe('IHDR');
    expect(png.readUInt32BE(16)).toBe(w);
    expect(png.readUInt32BE(20)).toBe(h);
    expect(png.readUInt32BE(29)).toBe(crc32(png.subarray(12, 29)));
    const idatLen = png.readUInt32BE(33);
    expect(png.toString('ascii', 37, 41)).toBe('IDAT');
    const raw = inflateSync(png.subarray(41, 41 + idatLen));
    expect(raw.length).toBe((w * 4 + 1) * h);
    expect(raw[0]).toBe(0);
    expect([...raw.subarray(1, 1 + w * 4)]).toEqual([...rgba.subarray(0, w * 4)]);
    expect(png.toString('ascii', png.length - 8, png.length - 4)).toBe('IEND');
  });

  it('CRC-32 bilinen değer', () => {
    expect(crc32(new TextEncoder().encode('IEND'))).toBe(0xae426082);
  });

  it('boyut uyuşmazlığı hata verir', () => {
    expect(() => encodePng(2, 2, new Uint8Array(3))).toThrow(RangeError);
  });
});

describe('PWA — simge', () => {
  it('normal simgenin köşeleri saydam, maskable tam dolu; ortada beyaz top', () => {
    const size = 64;
    const any = renderIcon(size, 'any');
    const mask = renderIcon(size, 'maskable');
    expect(any[3]).toBe(0);
    expect(mask[3]).toBe(255);
    // Topun beyaz bölgesi: merkezin biraz yukarısı (beşgen ile kontur arası).
    // İki dikiş (−90° ve −18°) arasında, beşgenle kontur arasındaki bir nokta.
    const a = (-54 * Math.PI) / 180;
    const px = Math.round(size / 2 + Math.cos(a) * size * 0.2);
    const py = Math.round(size / 2 + Math.sin(a) * size * 0.2);
    const i = (py * size + px) * 4;
    expect(any[i]).toBeGreaterThan(200);
    expect(any[i + 3]).toBe(255);
  });

  it('Android uyarlanır simge: ön katman = maskable eksi zemin, arka katman = yalnızca zemin', () => {
    const size = 64;
    const mask = renderIcon(size, 'maskable');
    const fg = renderIcon(size, 'foreground');
    const bg = renderIcon(size, 'background');
    const center = (size / 2) * size * 4 + (size / 2) * 4;
    // Köşe: ön katman saydam, arka katman maskable ile aynı zemin.
    expect(fg[3]).toBe(0);
    expect([...bg.subarray(0, 4)]).toEqual([...mask.subarray(0, 4)]);
    // Merkez: ön katman topu maskable ile aynı çizer; arka katmanda top yok.
    expect([...fg.subarray(center, center + 4)]).toEqual([...mask.subarray(center, center + 4)]);
    expect([...bg.subarray(center, center + 4)]).not.toEqual([
      ...mask.subarray(center, center + 4),
    ]);
  });

  it('açılış ekranı: kenarlar düz zemin rengi, ortada top', () => {
    const size = 64;
    const background = [7, 11, 38, 255] as const;
    const splash = renderSplash(size, 0.25, background);
    expect([...splash.subarray(0, 4)]).toEqual([...background]);
    const last = splash.length - 4;
    expect([...splash.subarray(last)]).toEqual([...background]);
    const center = (size / 2) * size * 4 + (size / 2) * 4;
    expect([...splash.subarray(center, center + 4)]).not.toEqual([...background]);
    expect(splash[center + 3]).toBe(255);
  });
});

describe('PWA — service worker', () => {
  it('tüm derleme dosyalarını (ve ./) önbelleğe alır, sw.js kendini almaz, çiftleri atar', () => {
    const sw = buildServiceWorker('kafa', [
      'index.html',
      'assets/index-abc.js',
      'sw.js',
      'index.html',
    ]);
    const assets = JSON.parse(/const ASSETS = (\[.*\]);/.exec(sw)?.[1] ?? '[]') as string[];
    expect(assets).toEqual(['./', './index.html', './assets/index-abc.js']);
    expect(sw).toContain('caches.match(fallback, { ignoreSearch: true, ignoreVary: true })');
    expect(sw).toContain('self.skipWaiting()');
  });

  it('sürüm dosya listesine bağlı: dosya adı değişince önbellek adı değişir', () => {
    expect(cacheVersion(['a.js', 'b.js'])).toBe(cacheVersion(['b.js', 'a.js']));
    expect(cacheVersion(['a.js'])).not.toBe(cacheVersion(['a2.js']));
  });
});
