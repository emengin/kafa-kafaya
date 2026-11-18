import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

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

/**
 * Üretim derlemesinde `phaser` içe aktarımını özel girişe yönlendirir ve Phaser kaynağındaki
 * bayrakları sabitler (kullanılmayan dallar ve modüller pakete girmez).
 */
export function customPhaser(): Plugin {
  const entry = fileURLToPath(new URL('./phaser-custom.cjs', import.meta.url));
  return {
    name: 'kafa-kafaya-custom-phaser',
    apply: 'build',
    enforce: 'pre',
    resolveId(source) {
      return source === 'phaser' ? entry : null;
    },
    transform(code, id) {
      if (!/[\\/]phaser[\\/]src[\\/]/.test(id) || !code.includes('typeof')) return null;
      return { code: replacePhaserFlags(code), map: null };
    },
  };
}
