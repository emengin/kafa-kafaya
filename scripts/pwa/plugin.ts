import type { Plugin } from 'vite';
import { renderIcon } from './icon.ts';
import { encodePng } from './png.ts';
import { buildServiceWorker } from './serviceWorker.ts';

export interface PwaOptions {
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
  readonly lang: string;
  readonly themeColor: string;
  readonly backgroundColor: string;
  /** Önbellek adı öneki (sürüm özeti eklenir). */
  readonly cachePrefix: string;
}

const ICONS = [
  { file: 'icons/icon-192.png', size: 192, maskable: false },
  { file: 'icons/icon-512.png', size: 512, maskable: false },
  { file: 'icons/icon-maskable-512.png', size: 512, maskable: true },
  { file: 'icons/apple-touch-icon.png', size: 180, maskable: true },
] as const;

/**
 * PWA eklentisi (yalnızca `vite build`): kodla çizilen PNG simgeler, `manifest.webmanifest` ve
 * derlemedeki tüm dosyaları önbelleğe alan `sw.js` üretir; `index.html`'e manifest ve iOS
 * etiketlerini ekler. Harici bağımlılık yok.
 */
export function pwa(options: PwaOptions): Plugin {
  let base = '/';
  return {
    name: 'kafa-kafaya-pwa',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml() {
      return [
        {
          tag: 'link',
          attrs: { rel: 'manifest', href: `${base}manifest.webmanifest` },
          injectTo: 'head',
        },
        {
          tag: 'link',
          attrs: { rel: 'apple-touch-icon', href: `${base}icons/apple-touch-icon.png` },
          injectTo: 'head',
        },
        {
          tag: 'meta',
          attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' },
          injectTo: 'head',
        },
        {
          tag: 'meta',
          attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
          injectTo: 'head',
        },
        {
          tag: 'meta',
          attrs: { name: 'apple-mobile-web-app-title', content: options.shortName },
          injectTo: 'head',
        },
      ];
    },
    generateBundle(_out, bundle) {
      const emitted: string[] = [];
      for (const icon of ICONS) {
        this.emitFile({
          type: 'asset',
          fileName: icon.file,
          source: encodePng(
            icon.size,
            icon.size,
            renderIcon(icon.size, icon.maskable ? 'maskable' : 'any'),
          ),
        });
        emitted.push(icon.file);
      }
      const manifest = {
        name: options.name,
        short_name: options.shortName,
        description: options.description,
        lang: options.lang,
        start_url: './',
        scope: './',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: options.backgroundColor,
        theme_color: options.themeColor,
        categories: ['games', 'sports'],
        icons: ICONS.filter((i) => i.file !== 'icons/apple-touch-icon.png').map((i) => ({
          src: i.file,
          sizes: `${i.size}x${i.size}`,
          type: 'image/png',
          purpose: i.maskable ? 'maskable' : 'any',
        })),
      };
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: `${JSON.stringify(manifest, null, 2)}\n`,
      });
      emitted.push('manifest.webmanifest');
      const files = [...Object.keys(bundle), ...emitted, 'index.html'];
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: buildServiceWorker(options.cachePrefix, files),
      });
    },
  };
}
