import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { replacePhaserFlags, resolvePhaserSource, unshimmedRendererFields } from './plugin';

const packageDir = path.dirname(createRequire(import.meta.url).resolve('phaser/package.json'));

describe('özel Phaser derlemesi eklentisi', () => {
  it('phaser/src yollarını düz eğik çizgili dosya yoluna çözer (.js ve index.js)', () => {
    const file = resolvePhaserSource('phaser/src/gameobjects/GameObjectFactory', packageDir);
    expect(file).not.toBeNull();
    expect(file).not.toContain('\\');
    expect(file?.endsWith('/src/gameobjects/GameObjectFactory.js')).toBe(true);

    const dir = resolvePhaserSource('phaser/src/tweens', packageDir);
    expect(dir?.endsWith('/src/tweens/index.js')).toBe(true);
  });

  it('phaser/src dışını ve olmayan modülü çözmez', () => {
    expect(resolvePhaserSource('phaser', packageDir)).toBeNull();
    expect(resolvePhaserSource('./const', packageDir)).toBeNull();
    expect(resolvePhaserSource('phaser/src/yok/boyle-bir-modul', packageDir)).toBeNull();
  });

  it('özel girişteki her phaser/src içe aktarımı kurulu sürümde var', () => {
    const entry = readFileSync(new URL('./phaser-custom.cjs', import.meta.url), 'utf-8');
    const sources = [...entry.matchAll(/require\('(phaser\/src\/[^']+)'\)/g)].map((m) => m[1]);
    expect(sources.length).toBeGreaterThan(0);
    const missing = sources.filter((s) => s && resolvePhaserSource(s, packageDir) === null);
    expect(missing).toEqual([]);
  });

  it('derleme bayraklarını sabitler, bilinmeyenlere dokunmaz', () => {
    expect(replacePhaserFlags('if (typeof WEBGL_RENDERER) {}')).toBe('if (true) {}');
    expect(replacePhaserFlags('if (typeof FEATURE_SOUND) {}')).toBe('if (false) {}');
    expect(replacePhaserFlags('typeof window')).toBe('typeof window');
    expect(replacePhaserFlags('typeof OTHER_FLAG')).toBe('typeof OTHER_FLAG');
  });

  it('kurulu BatchHandler, Renderer ad alanından yalnızca Events kullanıyor', () => {
    const code = readFileSync(
      path.join(packageDir, 'src/renderer/webgl/renderNodes/BatchHandler.js'),
      'utf-8',
    );
    expect(code).toContain("require('../../../renderer')");
    expect(unshimmedRendererFields(code)).toEqual([]);
  });

  it('yorum dışındaki yeni Renderer alanlarını yakalar', () => {
    const code = [
      '/** @memberof Phaser.Renderer.WebGL */',
      '// Renderer.Foo yorumda',
      'x.on(Renderer.Events.RESIZE);',
      'var u = Renderer.WebGL.Utils;',
    ].join('\n');
    expect(unshimmedRendererFields(code)).toEqual(['WebGL']);
  });
});
