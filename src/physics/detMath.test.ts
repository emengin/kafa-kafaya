import { describe, expect, it } from 'vitest';
import { datan, datan2, dcos, dexp, dhypot, dlog, dpow, dsin, pow2 } from './detMath';
import { DET_MATH_GOLDEN, goldenDigest } from './detMathGolden';

// Testler kendi referansı olarak motorun `Math` işlevlerini kullanır (test dosyaları lint
// kuralının dışında). Bizim işlevler ≲ 1 ulp, büyük motorların `Math`'i de ≲ 1 ulp hatalı
// olduğundan karşılaştırma eşiği 2 ulp: bu testler WebKit ve Node'da da aynı eşikle geçer.

const view = new DataView(new ArrayBuffer(8));

function bits(v: number): bigint {
  view.setFloat64(0, v);
  return view.getBigUint64(0);
}

/** İki sayı arasındaki temsil edilebilir double sayısı (ulp uzaklığı). */
function ulps(a: number, b: number): number {
  if (Object.is(a, b)) return 0;
  if (Number.isNaN(a) || Number.isNaN(b)) return Infinity;
  const ordered = (v: number): bigint => {
    const raw = bits(v);
    const sign = 1n << 63n;
    return raw & sign ? sign - (raw ^ sign) : sign + raw;
  };
  const d = ordered(a) - ordered(b);
  return Number(d < 0n ? -d : d);
}

/** Testlerin kendi tohumlu üreteci (LCG): her koşuda aynı örnekler. */
function sampler(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function worstUlps(
  n: number,
  gen: () => number,
  ours: (x: number) => number,
  ref: (x: number) => number,
): { max: number; at: number } {
  let max = 0;
  let at = NaN;
  for (let i = 0; i < n; i++) {
    const x = gen();
    const u = ulps(ours(x), ref(x));
    if (u > max) {
      max = u;
      at = x;
    }
  }
  return { max, at };
}

const MAX_ULPS = 2;
const N = 20000;

describe('dsin / dcos', () => {
  it.each([
    ['|x| ≤ π/4', Math.PI / 4],
    ['|x| ≤ 10', 10],
    ['|x| ≤ 1000', 1000],
    ['|x| ≤ 1e5', 1e5],
  ])('%s: Math.sin/cos ile en çok 2 ulp fark', (_label, range) => {
    const r = sampler(1);
    const gen = (): number => (r() * 2 - 1) * range;
    expect(worstUlps(N, gen, dsin, Math.sin).max).toBeLessThanOrEqual(MAX_ULPS);
    expect(worstUlps(N, gen, dcos, Math.cos).max).toBeLessThanOrEqual(MAX_ULPS);
  });

  it('oyunda kullanılan açılar (şut, süper, balon salınımı) ve π/4 katları', () => {
    const angles: number[] = [];
    for (let k = -64; k <= 64; k++) angles.push((k * Math.PI) / 4, (k * Math.PI) / 4 + 1e-9);
    for (let i = 0; i <= 1000; i++) angles.push(i * 0.001, i * 0.0157, i * 0.1);
    for (const a of angles) {
      expect(ulps(dsin(a), Math.sin(a)), `sin ${a}`).toBeLessThanOrEqual(MAX_ULPS);
      expect(ulps(dcos(a), Math.cos(a)), `cos ${a}`).toBeLessThanOrEqual(MAX_ULPS);
    }
  });

  it('özel değerler', () => {
    expect(Object.is(dsin(0), 0)).toBe(true);
    expect(Object.is(dsin(-0), -0)).toBe(true);
    expect(dcos(0)).toBe(1);
    expect(dcos(-0)).toBe(1);
    for (const v of [NaN, Infinity, -Infinity]) {
      expect(dsin(v)).toBeNaN();
      expect(dcos(v)).toBeNaN();
    }
    expect(dsin(1e-300)).toBe(1e-300);
  });

  it('sin² + cos² = 1 ve tek/çift simetri', () => {
    const r = sampler(2);
    for (let i = 0; i < 2000; i++) {
      const x = (r() * 2 - 1) * 100;
      const s = dsin(x);
      const c = dcos(x);
      expect(Math.abs(s * s + c * c - 1)).toBeLessThan(4e-16);
      expect(Math.abs(dsin(-x) + s)).toBeLessThan(1e-15);
      expect(Math.abs(dcos(-x) - c)).toBeLessThan(1e-15);
    }
  });
});

describe('datan / datan2', () => {
  it('atan: geniş aralıkta en çok 2 ulp', () => {
    const r = sampler(3);
    const gen = (): number => (r() * 2 - 1) * 10 ** (r() * 8 - 4);
    expect(worstUlps(N, gen, datan, Math.atan).max).toBeLessThanOrEqual(MAX_ULPS);
    expect(datan(Infinity)).toBe(Math.PI / 2);
    expect(datan(-Infinity)).toBe(-Math.PI / 2);
    expect(Object.is(datan(-0), -0)).toBe(true);
    expect(datan(NaN)).toBeNaN();
  });

  it('atan2: dört çeyrek ve farklı büyüklüklerde en çok 2 ulp', () => {
    const r = sampler(4);
    let max = 0;
    for (let i = 0; i < N; i++) {
      const scale = 10 ** (r() * 12 - 6);
      const y = (r() * 2 - 1) * scale;
      const x = r() * 2 - 1;
      max = Math.max(max, ulps(datan2(y, x), Math.atan2(y, x)));
    }
    expect(max).toBeLessThanOrEqual(MAX_ULPS);
  });

  it('atan2 özel değerleri spesifikasyondaki gibi (±0, ±∞, NaN)', () => {
    const vals = [0, -0, 1, -1, 1e-300, -1e300, Infinity, -Infinity, NaN];
    for (const y of vals) {
      for (const x of vals) {
        const ours = datan2(y, x);
        const ref = Math.atan2(y, x);
        if (Number.isNaN(ref)) expect(ours, `atan2(${y}, ${x})`).toBeNaN();
        else expect(ulps(ours, ref), `atan2(${y}, ${x})`).toBeLessThanOrEqual(MAX_ULPS);
        if (ref === 0) expect(Object.is(ours, ref), `atan2(${y}, ${x}) işareti`).toBe(true);
      }
    }
  });
});

describe('dexp / dlog', () => {
  it('exp: [−745, 709] ve küçük argümanlarda en çok 2 ulp', () => {
    const r = sampler(5);
    expect(worstUlps(N, () => -745 + r() * 1454, dexp, Math.exp).max).toBeLessThanOrEqual(MAX_ULPS);
    expect(worstUlps(N, () => (r() * 2 - 1) * 0.05, dexp, Math.exp).max).toBeLessThanOrEqual(
      MAX_ULPS,
    );
  });

  it('exp özel değerleri ve sınırlar', () => {
    expect(dexp(0)).toBe(1);
    expect(dexp(-0)).toBe(1);
    expect(ulps(dexp(1), Math.E)).toBeLessThanOrEqual(1);
    expect(dexp(710)).toBe(Infinity);
    expect(dexp(-746)).toBe(0);
    expect(dexp(Infinity)).toBe(Infinity);
    expect(dexp(-Infinity)).toBe(0);
    expect(dexp(NaN)).toBeNaN();
    expect(ulps(dexp(709.78), Math.exp(709.78))).toBeLessThanOrEqual(MAX_ULPS);
    expect(dexp(-745)).toBe(Math.exp(-745)); // en küçük alt normal sayı
  });

  it('log: tüm üs aralığında en çok 2 ulp', () => {
    const r = sampler(6);
    const wide = (): number => 10 ** (r() * 600 - 300);
    expect(worstUlps(N, wide, dlog, Math.log).max).toBeLessThanOrEqual(MAX_ULPS);
    expect(worstUlps(N, () => 0.5 + r() * 1.5, dlog, Math.log).max).toBeLessThanOrEqual(MAX_ULPS);
  });

  it('log özel değerleri', () => {
    expect(dlog(1)).toBe(0);
    expect(dlog(0)).toBe(-Infinity);
    expect(dlog(-0)).toBe(-Infinity);
    expect(dlog(-1)).toBeNaN();
    expect(dlog(NaN)).toBeNaN();
    expect(dlog(Infinity)).toBe(Infinity);
    expect(ulps(dlog(5e-324), Math.log(5e-324))).toBeLessThanOrEqual(MAX_ULPS);
    expect(ulps(dlog(Math.E), 1)).toBeLessThanOrEqual(1);
  });
});

describe('dpow / pow2 / dhypot', () => {
  it('tam sayı üsler: küçük değerlerde tam, büyüklerde birkaç ulp', () => {
    expect(dpow(2, 10)).toBe(1024);
    expect(dpow(3, 5)).toBe(243);
    expect(dpow(-2, 3)).toBe(-8);
    expect(dpow(1.5, 2)).toBe(2.25);
    expect(dpow(7, 1)).toBe(7);
    expect(dpow(2, -2)).toBe(0.25);
    const r = sampler(7);
    for (let i = 0; i < 5000; i++) {
      const x = (r() * 2 - 1) * 50;
      const n = Math.floor(r() * 17) - 8;
      expect(ulps(dpow(x, n), Math.pow(x, n)), `${x}^${n}`).toBeLessThanOrEqual(8);
    }
  });

  it('kesirli üsler: göreli hata ≤ (1 + |y·ln x|)·2^−51', () => {
    const r = sampler(8);
    for (let i = 0; i < 5000; i++) {
      const x = r() * 100;
      const y = (r() * 2 - 1) * 4;
      const ref = Math.pow(x, y);
      const bound = (1 + Math.abs(y * Math.log(x))) * 2 ** -51;
      expect(Math.abs(dpow(x, y) - ref) / ref, `${x}^${y}`).toBeLessThanOrEqual(bound);
    }
  });

  it('pow özel değerleri Math.pow ile aynı; sonlu sonuçlar doğruluk sınırında', () => {
    const vals = [0, -0, 1, -1, 0.5, -0.5, 2, -2, 3, -3, 2.5, Infinity, -Infinity, NaN];
    for (const x of vals) {
      for (const y of vals) {
        const ours = dpow(x, y);
        const ref = Math.pow(x, y);
        const label = `${x}^${y}`;
        if (Number.isNaN(ref)) {
          expect(ours, label).toBeNaN();
        } else if (ref === 0 || !Number.isFinite(ref) || Number.isInteger(y)) {
          // Spesifikasyonun tam tanımladığı haller (±0, ±∞, işaret) ve küçük tam sayı üsler.
          expect(Object.is(ours, ref), label).toBe(true);
        } else {
          const bound = (1 + Math.abs(y * Math.log(Math.abs(x)))) * 2 ** -51;
          expect(Math.abs(ours - ref) / Math.abs(ref), label).toBeLessThanOrEqual(bound);
        }
      }
    }
  });

  it('pow2 tam ikinin kuvvetleri verir (alt normaller dahil)', () => {
    let up = 1;
    for (let k = 0; k <= 1023; k++) {
      expect(pow2(k)).toBe(up);
      up *= 2;
    }
    let down = 1;
    for (let k = 0; k >= -1074; k--) {
      expect(pow2(k)).toBe(down);
      down /= 2;
    }
  });

  it('dhypot = √(x² + y²)', () => {
    expect(dhypot(3, 4)).toBe(5);
    expect(dhypot(-5, 12)).toBe(13);
    expect(dhypot(0, -7)).toBe(7);
    const r = sampler(9);
    for (let i = 0; i < 1000; i++) {
      const x = (r() * 2 - 1) * 2000;
      const y = (r() * 2 - 1) * 2000;
      expect(ulps(dhypot(x, y), Math.hypot(x, y))).toBeLessThanOrEqual(MAX_ULPS);
    }
  });
});

describe('Altın özet', () => {
  it('sabit girdilerde çıktı bitleri değişmedi (motorlar arası aynı olmalı)', () => {
    expect(goldenDigest()).toBe(DET_MATH_GOLDEN);
  });
});
