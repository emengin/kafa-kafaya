/**
 * Android için GEÇİCİ uygulama simgesi ve açılış ekranı (Faz 2.1): `npm run assets:placeholder`.
 *
 * PWA simgesini çizen kodla (`scripts/pwa/icon.ts`) kaynak PNG'leri git dışı bir önbellek
 * klasörüne üretir, sonra `@capacitor/assets` bunlardan her ekran yoğunluğu için Android
 * kaynaklarını (`android/app/src/main/res/mipmap-*`, `drawable*`) yazar. Üretilen Android dosyaları
 * depoya girer (Android Studio onlarla derler); kaynak PNG'ler girmez, çünkü kodla yeniden üretilir.
 *
 * Faz 4'te final ikon ve açılış ekranı gelince: kaynaklar ART_BIBLE §13'e göre hazırlanır
 * (`art/pazarlama/` master, `assets/` dışa aktarım), ASSET_LOG'a işlenir ve
 * `npx capacitor-assets generate --android --assetPath <klasör>` ile aynı Android dosyalarının
 * üstüne yazılır. Bu betik o zaman silinebilir.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PLATFORM } from '../../src/config/gameConfig';
import { renderIcon, renderSplash, type IconVariant, type RGBA } from '../pwa/icon';
import { encodePng } from '../pwa/png';
import { MOBILE } from './target';

/** `@capacitor/assets` en küçük kaynak boyutları: simge 1024, açılış ekranı 2732 (kare). */
const ICON_SIZE = 1024;
const SPLASH_SIZE = 2732;
/**
 * Açılış ekranında topun ölçeği (simgedeki topa göre). Android kare kaynağı her yön için ortadan
 * kırpar; 0,22 → yatay ekranda topun çapı ekran yüksekliğinin ~%22'si.
 */
const SPLASH_SCALE = 0.22;
/** Proje köküne göre (araç `--assetPath`'i köke ekliyor); node_modules git, lint ve Prettier dışı. */
const SOURCE_DIR = 'node_modules/.cache/kafadarlar/mobile-assets';
const ASSETS_BIN = 'node_modules/@capacitor/assets/bin/capacitor-assets';

/** `#rrggbb` → opak RGBA. */
function hexToRgba(hex: string): RGBA {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`Geçersiz renk: ${hex}`);
  return [parseInt(m[1] ?? '', 16), parseInt(m[2] ?? '', 16), parseInt(m[3] ?? '', 16), 255];
}

function writePng(file: string, size: number, rgba: Uint8Array): void {
  writeFileSync(path.join(SOURCE_DIR, file), encodePng(size, size, rgba));
  console.log(`  ${file} (${size}×${size})`);
}

function main(): void {
  console.log(`Kaynaklar → ${SOURCE_DIR}`);
  mkdirSync(SOURCE_DIR, { recursive: true });
  // Özel kip (Custom Mode) dosya adları: @capacitor/assets README.
  const icons: readonly (readonly [string, IconVariant])[] = [
    ['icon-only.png', 'maskable'],
    ['icon-foreground.png', 'foreground'],
    ['icon-background.png', 'background'],
  ];
  for (const [file, variant] of icons) writePng(file, ICON_SIZE, renderIcon(ICON_SIZE, variant));
  const background = hexToRgba(PLATFORM.backgroundColor);
  writePng('splash.png', SPLASH_SIZE, renderSplash(SPLASH_SIZE, SPLASH_SCALE, background));

  console.log('Android kaynakları üretiliyor (@capacitor/assets)…');
  execFileSync(
    process.execPath,
    [
      path.resolve(ASSETS_BIN),
      'generate',
      '--android',
      '--androidProject',
      MOBILE.androidDir,
      '--assetPath',
      SOURCE_DIR,
    ],
    { stdio: 'inherit' },
  );
}

main();
