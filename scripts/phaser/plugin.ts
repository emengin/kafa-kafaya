import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizePath, type Plugin } from 'vite';

/**
 * Phaser kaynak kodunun derleme bayrakları (Phaser'ın kendi webpack yapılandırmasındaki
 * `DefinePlugin` değerleri). WebGL + Canvas çizici açık; ses yöneticisi (kendi Web Audio
 * motorumuz var), Facebook Instant Games ve Camera3D eklentileri, WebGL hata ayıklaması kapalı.
 */
export const PHASER_FLAGS: Readonly<Record<string, boolean>> = {
  CANVAS_RENDERER: true,
  WEBGL_RENDERER: true,
  WEBGL_DEBUG: false,
  FEATURE_SOUND: false,
  PLUGIN_CAMERA3D: false,
  PLUGIN_FBINSTANT: false,
};

/** `typeof BAYRAK` ifadelerini sabite çevirir (yalnızca Phaser kaynağında). */
export function replacePhaserFlags(code: string): string {
  return code.replace(/typeof\s+([A-Z_][A-Z0-9_]*)\b/g, (match, name: string) =>
    name in PHASER_FLAGS ? String(PHASER_FLAGS[name]) : match,
  );
}

const SRC_PREFIX = 'phaser/src/';

/**
 * `phaser/src/…` içe aktarımını dosya yoluna çevirir. Phaser 4'ün `package.json` `exports` alanı
 * yalnızca paket girişini açtığı için kaynak modüllere paket adıyla ulaşılamaz; yol paket
 * klasöründen elle kurulur (Node'un çözümleme sırasıyla: `.js`, klasör `index.js`, tam ad).
 * Yol Vite biçiminde (düz eğik çizgi) döner: Phaser'ın kendi göreli içe aktarımları da aynı
 * kimliğe çözülmeli, yoksa aynı dosya iki ayrı modül olarak pakete girer (Windows'ta
 * `GameObjectFactory` iki kez paketlenip fabrikalar yanlış kopyaya kaydoluyordu).
 */
export function resolvePhaserSource(source: string, packageDir: string): string | null {
  if (!source.startsWith(SRC_PREFIX)) return null;
  const base = path.join(packageDir, 'src', source.slice(SRC_PREFIX.length));
  for (const candidate of [`${base}.js`, path.join(base, 'index.js'), base]) {
    if (existsSync(candidate) && path.extname(candidate) === '.js') return normalizePath(candidate);
  }
  return null;
}

/**
 * Phaser 4'te toplu çizicilerin taban sınıfı (`BatchHandler`) `renderer/index`'i içe aktarıyor ama
 * yalnızca `Renderer.Events`'i kullanıyor. O dizin ise WebGL ad alanının tamamını (tüm shader'lar,
 * SpriteGPULayer / TilemapGPULayer gibi kullanmadığımız düğümler) pakete sokuyor: ~54 kB ham,
 * ~9 kB gzip. Bu içe aktarma yalnızca `Events`'i veren dar bir modüle yönlendirilir.
 */
const BATCH_HANDLER = /[\\/]renderer[\\/]webgl[\\/]renderNodes[\\/]BatchHandler\.js$/;
const BATCH_HANDLER_RENDERER_IMPORT = '../../../renderer';
const RENDERER_EVENTS_ID = '\0kafa-kafaya:renderer-events';
const RENDERER_EVENTS_CODE = "module.exports = { Events: require('phaser/src/renderer/events') };";
/** Dar modülün sağladığı `Renderer` alanları. */
const RENDERER_SHIM_FIELDS: ReadonlySet<string> = new Set(['Events']);

/**
 * BatchHandler kaynağında `Renderer.<alan>` kullanımlarından dar modülün sağlamadıklarını döner
 * (yorumlar hariç). Boş değilse Phaser değişmiştir: yönlendirme artık güvenli değil.
 */
export function unshimmedRendererFields(code: string): string[] {
  const body = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const used = new Set([...body.matchAll(/\bRenderer\.(\w+)/g)].map((m) => m[1] ?? ''));
  return [...used].filter((f) => !RENDERER_SHIM_FIELDS.has(f));
}

/**
 * Üretim derlemesinde `phaser` içe aktarımını özel girişe yönlendirir, özel girişin
 * `phaser/src/…` içe aktarımlarını çözer ve Phaser kaynağındaki bayrakları sabitler
 * (kullanılmayan dallar ve modüller pakete girmez).
 */
export function customPhaser(): Plugin {
  const entry = fileURLToPath(new URL('./phaser-custom.cjs', import.meta.url));
  const packageDir = path.dirname(createRequire(import.meta.url).resolve('phaser/package.json'));
  return {
    name: 'kafa-kafaya-custom-phaser',
    apply: 'build',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === 'phaser') return entry;
      if (
        source === BATCH_HANDLER_RENDERER_IMPORT &&
        importer !== undefined &&
        BATCH_HANDLER.test(importer)
      ) {
        return RENDERER_EVENTS_ID;
      }
      return resolvePhaserSource(source, packageDir);
    },
    load(id) {
      return id === RENDERER_EVENTS_ID ? RENDERER_EVENTS_CODE : null;
    },
    transform(code, id) {
      if (!/[\\/]phaser[\\/]src[\\/]/.test(id)) return null;
      if (BATCH_HANDLER.test(id)) {
        const missing = unshimmedRendererFields(code);
        if (missing.length > 0) {
          this.error(
            `BatchHandler artık Renderer.${missing.join(', Renderer.')} kullanıyor; ` +
              'scripts/phaser/plugin.ts içindeki dar renderer modülünü güncelleyin.',
          );
        }
      }
      if (!code.includes('typeof')) return null;
      return { code: replacePhaserFlags(code), map: null };
    },
  };
}
