import { datan, datan2, dcos, dexp, dlog, dpow, dsin } from './detMath';

/**
 * detMath altın özeti (Faz 2.7): sabit girdilerle tüm işlevlerin çıktı bitlerinin FNV-1a (64 bit)
 * özeti. Her JS motorunda aynı çıkmalıdır: birim testi (Node) ve çapraz motor testi (Chromium,
 * WebKit; telefonda Android WebView) bu değeri karşılaştırır. Değişirse işlevlerin sonucu değişmiş
 * demektir — fizik ve kayıtlı tekrarlar da değişir.
 *
 * Girdiler de motordan bağımsız üretilir (bu dosya determinizm lint bölgesinde): tohumlu tam sayı
 * üreteci ve `dpow`; motorun `Math.pow`'u (`**`) son bitte farklı girdi üretebilirdi.
 */
export const DET_MATH_GOLDEN = '6115e15731c8b728';

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK_64 = 0xffffffffffffffffn;
const HEX = 16;
const FLOAT64_BYTES = 8;
const DIGITS = 16;
const SEED = 2027;
const LCG_A = 1664525;
const LCG_C = 1013904223;
const TWO_32 = 4294967296;

/** Tohumlu üreteç (LCG, tam sayı işlemleri): her motorda aynı örnekler. */
export function goldenSampler(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, LCG_A) + LCG_C) >>> 0;
    return s / TWO_32;
  };
}

/** Örnek sayıları ve aralıkları (değişirse altın özet de değişir). */
const VECTOR = {
  trigCount: 512,
  trigRange: 50,
  mixedCount: 256,
  atanDecades: 6,
  atanShift: 3,
  base: 10,
  expRange: 20,
  logDecades: 20,
  logShift: 10,
  powBaseRange: 10,
  powExpRange: 3,
  expScale: 1e4,
} as const;

/** Özel girdiler: sıfırlar, küçük, birim, π, büyük. */
const SPECIAL = { zero: 0, negZero: -0, tiny: 1e-9, one: 1, pi: Math.PI, big: 1e6, negBig: -1e6 };

export function goldenDigest(): string {
  const v = VECTOR;
  const view = new DataView(new ArrayBuffer(FLOAT64_BYTES));
  let h = FNV_OFFSET;
  const add = (x: number): void => {
    view.setFloat64(0, x);
    h = ((h ^ view.getBigUint64(0)) * FNV_PRIME) & MASK_64;
  };
  const r = goldenSampler(SEED);
  const signed = (): number => r() * 2 - 1;
  for (let i = 0; i < v.trigCount; i++) {
    const x = signed() * v.trigRange;
    add(dsin(x));
    add(dcos(x));
  }
  for (let i = 0; i < v.mixedCount; i++) {
    add(datan2(signed() * dpow(v.base, r() * v.atanDecades - v.atanShift), signed()));
    add(dexp(signed() * v.expRange));
    add(dlog(dpow(v.base, r() * v.logDecades - v.logShift)));
    add(dpow(r() * v.powBaseRange, signed() * v.powExpRange));
  }
  for (const x of Object.values(SPECIAL)) {
    add(dsin(x));
    add(dcos(x));
    add(datan(x));
    add(dexp(x / v.expScale));
  }
  return h.toString(HEX).padStart(DIGITS, '0');
}
