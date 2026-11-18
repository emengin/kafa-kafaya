import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../game/characters';
import { recordSuperPreview } from './SuperPreview';

describe('Seçim ekranı süper önizlemesi', () => {
  it('her karakterin kaydında süper şut gerçekten atılır ve top rakip kaleye doğru gider', () => {
    for (const c of CHARACTERS) {
      const track = recordSuperPreview(c.id);
      expect(track.frames.length).toBeGreaterThan(60);
      expect(track.frames.some((f) => f.superType === c.superType)).toBe(true);
      const first = track.frames[0];
      const maxX = Math.max(...track.frames.map((f) => f.x));
      expect(maxX - (first?.x ?? 0)).toBeGreaterThan(300);
    }
  });

  it('kayıt önbelleğe alınır ve tekrarlanabilir', () => {
    expect(recordSuperPreview('kor')).toBe(recordSuperPreview('kor'));
  });

  it('Işınlanma görünmez olur, Serap yanılsama üretir (oyundaki davranışın aynısı)', () => {
    expect(recordSuperPreview('sis').frames.some((f) => !f.visible)).toBe(true);
    expect(recordSuperPreview('pamuk').frames.some((f) => f.decoys.length > 0)).toBe(true);
  });
});
