import path from 'node:path';
import { build } from 'vite';

/** Paketin yolu (Playwright `test-results`'ı temizlediği için `node_modules/.cache` altında). */
export const BUNDLE_FILE = path.resolve('node_modules/.cache/kafa-determinism/determinism.js');

/**
 * Playwright genel hazırlığı: simülasyonu ve tekrar oynatıcıyı oyunun üretim derlemesiyle aynı
 * araçla (Vite, küçültme açık) tek IIFE dosyasına derler. Proje ayarları (PWA, Phaser paketi)
 * kullanılmaz: pakette yalnızca simülasyon var.
 */
export default async function bundle(): Promise<void> {
  await build({
    configFile: false,
    logLevel: 'warn',
    build: {
      lib: {
        entry: path.resolve('e2e/determinism/entry.ts'),
        formats: ['iife'],
        name: 'KafaDeterminism',
        fileName: () => path.basename(BUNDLE_FILE),
      },
      outDir: path.dirname(BUNDLE_FILE),
      emptyOutDir: true,
      minify: true,
      target: 'es2022',
    },
  });
}
