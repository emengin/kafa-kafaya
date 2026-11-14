import { describe, expect, it } from 'vitest';
import { mixSeed, SeededRandom } from './random';

const take = (r: SeededRandom, n: number): number[] => Array.from({ length: n }, () => r.next());

describe('SeededRandom', () => {
  it('aynı tohum aynı diziyi, farklı tohum farklı diziyi üretir', () => {
    expect(take(new SeededRandom(42), 20)).toEqual(take(new SeededRandom(42), 20));
    expect(take(new SeededRandom(42), 20)).not.toEqual(take(new SeededRandom(43), 20));
  });

  it('next [0, 1) aralığında, range ve chance sınırlara uyar', () => {
    const r = new SeededRandom(7);
    for (let i = 0; i < 5000; i++) {
      const x = r.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      const y = r.range(-3, 5);
      expect(y).toBeGreaterThanOrEqual(-3);
      expect(y).toBeLessThan(5);
    }
    expect(r.chance(0)).toBe(false);
    expect(r.chance(1)).toBe(true);
  });

  it('gaussian: ortalama ≈ 0, standart sapma ≈ 1, sonlu', () => {
    const r = new SeededRandom(123);
    const n = 20000;
    const xs = Array.from({ length: n }, () => r.gaussian());
    const mean = xs.reduce((s, x) => s + x, 0) / n;
    const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / n);
    expect(xs.every(Number.isFinite)).toBe(true);
    expect(Math.abs(mean)).toBeLessThan(0.03);
    expect(Math.abs(sd - 1)).toBeLessThan(0.03);
  });

  it('mixSeed deterministik ve girdilere duyarlı', () => {
    expect(mixSeed(1, 2)).toBe(mixSeed(1, 2));
    const seeds = new Set([mixSeed(1, 0), mixSeed(1, 1), mixSeed(2, 0), mixSeed(2, 1)]);
    expect(seeds.size).toBe(4);
  });
});
