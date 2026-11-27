/**
 * Deterministik matematik (Faz 2.7): `Math.sin/cos/atan2/exp/log/pow/hypot` yerine.
 *
 * ECMAScript bu `Math` işlevlerinin sonucunu motora bırakır ("implementation-approximated"): V8,
 * JavaScriptCore ve SpiderMonkey son bitte farklı sonuç verebilir; rollback'li online maçta bu,
 * iki cihazın aynı girdiyle farklı duruma varması (desync) demektir. Buradaki işlevler yalnızca
 * IEEE 754'ün tam tanımlı işlemlerini (`+ − × ÷`, `Math.sqrt`) ve tam sonuçlu `Math.floor/round/
 * abs` kullanır; işlem sırası sabittir (JS çarpma-toplamayı birleştirmez). Bu yüzden her motorda
 * bit düzeyinde aynı sonucu verirler.
 *
 * Algoritmalar ve katsayılar fdlibm'den (Sun Microsystems, 1993; FreeBSD msun sürümü) alındı:
 * Cody–Waite argüman indirgemesi + minimax polinomları. Doğruluk `Math` karşılıklarına yakındır
 * (sin/cos/atan2/exp/log ≲ 1 ulp, pow tam sayı üste ≲ birkaç ulp; ayrıntı ve sınırlar her
 * işlevin açıklamasında, ölçüm detMath.test.ts'de). Bit işlemleriyle yapılan üs ayıklama
 * (fdlibm'in "high word" karşılaştırmaları) burada değer karşılaştırmasına ve tam ikinin kuvveti
 * çarpımlarına çevrildi.
 *
 * Simülasyon kodunda yasaklı `Math` işlevleri ve `**` lint kuralıyla engellenir
 * (scripts/lint/determinism.js).
 */

// ---------------------------------------------------------------------------------------------
// Ortak sabitler
// ---------------------------------------------------------------------------------------------

/** 2^−27: bu büyüklüğün altında sin x = x, cos x = 1, atan x = x (çift duyarlıkta). */
const TINY = 7.450580596923828e-9;
const PI = Math.PI;
const PI_LO = 1.2246467991473532e-16;
const PI_O_2 = 1.570796326794896558;
const PI_O_4 = 7.85398163397448279e-1;
const THREE_PI_O_4 = 2.356194490192344837;

// ---------------------------------------------------------------------------------------------
// sin / cos — fdlibm k_sin.c, k_cos.c, e_rem_pio2.c (orta büyüklük yolu)
// ---------------------------------------------------------------------------------------------

const S1 = -1.66666666666666324348e-1;
const S2 = 8.33333333332248946124e-3;
const S3 = -1.98412698298579493134e-4;
const S4 = 2.75573137070700676789e-6;
const S5 = -2.50507602534068634195e-8;
const S6 = 1.58969099521155010221e-10;

const C1 = 4.16666666666666019037e-2;
const C2 = -1.38888888888741095749e-3;
const C3 = 2.48015872894767294178e-5;
const C4 = -2.75573143513906633035e-7;
const C5 = 2.0875723212981748279e-9;
const C6 = -1.13596475577881948265e-11;

/**
 * 2/π ve π/2'nin parçaları: PIO2_1 + PIO2_1T ≈ π/2 (86 bit), PIO2_1T = PIO2_2 + PIO2_2T,
 * PIO2_2T = PIO2_3 + PIO2_3T. PIO2_1/2/3 33 bitlik: `n · PIO2_k` |n| < 2^20 için tam çarpımdır.
 */
const INV_PIO2 = 6.36619772367581382433e-1;
const PIO2_1 = 1.57079632673412561417;
const PIO2_1T = 6.07710050650619224932e-11;
const PIO2_2 = 6.0771005063039659766e-11;
const PIO2_2T = 2.02226624879595063154e-21;
const PIO2_3 = 2.0222662487111664558e-21;
const PIO2_3T = 8.47842766036889956997e-32;
/**
 * İkinci ve üçüncü indirgeme aşamasının eşikleri: kalan |r|, |x|'in 2^−15'inden (2^−48'inden)
 * küçükse büyük sadeleşme olmuştur, π/2'nin daha fazla biti gerekir. (fdlibm üs farkıyla
 * — 16 ve 49 — bakar; burada aynı amaçla, biraz daha temkinli oranlar.)
 */
const STAGE2_RATIO = 3.0517578125e-5;
const STAGE3_RATIO = 3.552713678800501e-15;
/** Çeyrek sayısı için (n mod 4). */
const QUADRANTS = 4;

/** `reduce` sonucu: x − n·π/2 = reducedHi + reducedLo (ayırma yapmamak için modül değişkeni). */
let reducedHi = 0;
let reducedLo = 0;

/**
 * Cody–Waite indirgemesi (fdlibm e_rem_pio2.c, orta büyüklük yolu): x = n·π/2 + r, |r| ≲ π/4.
 * r iki parça (hi + lo) olarak döner. |x| < ~1,6·10^6 için hata ≲ 1 ulp; daha büyük |x|'te
 * doğruluk düşer ama sonuç yine deterministiktir.
 * @returns n mod 4 (çeyrek).
 */
function reduce(x: number): number {
  const n = Math.round(x * INV_PIO2);
  let r = x - n * PIO2_1;
  let w = n * PIO2_1T;
  let y0 = r - w;
  const ax = Math.abs(x);
  if (Math.abs(y0) < ax * STAGE2_RATIO) {
    let t = r;
    w = n * PIO2_2;
    r = t - w;
    w = n * PIO2_2T - (t - r - w);
    y0 = r - w;
    if (Math.abs(y0) < ax * STAGE3_RATIO) {
      t = r;
      w = n * PIO2_3;
      r = t - w;
      w = n * PIO2_3T - (t - r - w);
      y0 = r - w;
    }
  }
  reducedHi = y0;
  reducedLo = r - y0 - w;
  return n - Math.floor(n / QUADRANTS) * QUADRANTS;
}

/** sin(x + y), |x| ≤ π/4, y x'in kuyruğu (fdlibm __kernel_sin, iy = 1 yolu). */
function sinKernel(x: number, y: number): number {
  const z = x * x;
  const w = z * z;
  const r = S2 + z * (S3 + z * S4) + z * w * (S5 + z * S6);
  const v = z * x;
  return x - (z * (0.5 * y - v * r) - y - v * S1);
}

/** sin(x), |x| ≤ π/4, kuyruksuz (iy = 0 yolu). */
function sinKernel0(x: number): number {
  const z = x * x;
  const w = z * z;
  const r = S2 + z * (S3 + z * S4) + z * w * (S5 + z * S6);
  const v = z * x;
  return x + v * (S1 + z * r);
}

/** cos(x + y), |x| ≤ π/4 (fdlibm __kernel_cos, FreeBSD sürümü). */
function cosKernel(x: number, y: number): number {
  const z = x * x;
  const w = z * z;
  const r = z * (C1 + z * (C2 + z * C3)) + w * w * (C4 + z * (C5 + z * C6));
  const hz = 0.5 * z;
  const v = 1 - hz;
  return v + (1 - v - hz + (z * r - x * y));
}

/** Deterministik sin(x). */
export function dsin(x: number): number {
  const ax = Math.abs(x);
  if (!(ax > TINY)) return x; // ±0, çok küçük x ve NaN olduğu gibi döner
  if (ax <= PI_O_4) return sinKernel0(x);
  const q = reduce(x);
  const hi = reducedHi;
  const lo = reducedLo;
  if (q === 0) return sinKernel(hi, lo);
  if (q === 1) return cosKernel(hi, lo);
  if (q === 2) return -sinKernel(hi, lo);
  return -cosKernel(hi, lo);
}

/** Deterministik cos(x). */
export function dcos(x: number): number {
  const ax = Math.abs(x);
  if (ax < TINY) return 1;
  if (ax <= PI_O_4) return cosKernel(x, 0);
  const q = reduce(x); // NaN ve ±∞ → NaN
  const hi = reducedHi;
  const lo = reducedLo;
  if (q === 0) return cosKernel(hi, lo);
  if (q === 1) return -sinKernel(hi, lo);
  if (q === 2) return -cosKernel(hi, lo);
  return sinKernel(hi, lo);
}

// ---------------------------------------------------------------------------------------------
// atan / atan2 — fdlibm s_atan.c, e_atan2.c
// ---------------------------------------------------------------------------------------------

const ATAN_HI_0 = 4.63647609000806093515e-1; // atan(0,5)
const ATAN_HI_1 = 7.85398163397448278999e-1; // atan(1)
const ATAN_HI_2 = 9.82793723247329054082e-1; // atan(1,5)
const ATAN_HI_3 = 1.570796326794896558; // atan(∞)
const ATAN_LO_0 = 2.26987774529616870924e-17;
const ATAN_LO_1 = 3.06161699786838301793e-17;
const ATAN_LO_2 = 1.39033110312309984516e-17;
const ATAN_LO_3 = 6.12323399573676603587e-17;
const AT0 = 3.33333333333329318027e-1;
const AT1 = -1.99999999998764832476e-1;
const AT2 = 1.42857142725034663711e-1;
const AT3 = -1.1111110405462355788e-1;
const AT4 = 9.09088713343650656196e-2;
const AT5 = -7.69187620504482999495e-2;
const AT6 = 6.66107313738753120669e-2;
const AT7 = -5.83357013379057348645e-2;
const AT8 = 4.97687799461593236017e-2;
const AT9 = -3.6531572744216915527e-2;
const AT10 = 1.62858201153657823623e-2;
/** atan aralık sınırları: 7/16, 11/16, 19/16, 39/16 ve 2^66. */
const ATAN_B0 = 0.4375;
const ATAN_B1 = 0.6875;
const ATAN_B2 = 1.1875;
const ATAN_B3 = 2.4375;
const ATAN_HUGE = 7.378697629483820646e19;
const ONE_HALF_TIMES_3 = 1.5;
/** atan2: |y/x| bu oranın üstündeyse sonuç ±π/2, altındaysa (x < 0) ±π. (2^60, 2^−60) */
const ATAN2_BIG = 1.152921504606846976e18;
const ATAN2_SMALL = 8.673617379884035e-19;

/** Deterministik atan(x). */
export function datan(x: number): number {
  if (x !== x) return x;
  const ax = Math.abs(x);
  if (ax >= ATAN_HUGE) return x > 0 ? ATAN_HI_3 + ATAN_LO_3 : -ATAN_HI_3 - ATAN_LO_3;
  let t: number;
  let hi: number;
  let lo: number;
  if (ax < ATAN_B0) {
    if (ax < TINY) return x;
    t = x;
    hi = 0;
    lo = 0;
  } else if (ax < ATAN_B1) {
    t = (2 * ax - 1) / (2 + ax);
    hi = ATAN_HI_0;
    lo = ATAN_LO_0;
  } else if (ax < ATAN_B2) {
    t = (ax - 1) / (ax + 1);
    hi = ATAN_HI_1;
    lo = ATAN_LO_1;
  } else if (ax < ATAN_B3) {
    t = (ax - ONE_HALF_TIMES_3) / (1 + ONE_HALF_TIMES_3 * ax);
    hi = ATAN_HI_2;
    lo = ATAN_LO_2;
  } else {
    t = -1 / ax;
    hi = ATAN_HI_3;
    lo = ATAN_LO_3;
  }
  const z = t * t;
  const w = z * z;
  const s1 = z * (AT0 + w * (AT2 + w * (AT4 + w * (AT6 + w * (AT8 + w * AT10)))));
  const s2 = w * (AT1 + w * (AT3 + w * (AT5 + w * (AT7 + w * AT9))));
  if (hi === 0) return t - t * (s1 + s2);
  const r = hi - (t * (s1 + s2) - lo - t);
  return x < 0 ? -r : r;
}

/** İşaret biti 1 mi? (−0 dahil; NaN için false.) */
function signBit(v: number): boolean {
  return v < 0 || (v === 0 && 1 / v < 0);
}

/**
 * Deterministik atan2(y, x): (x, y) vektörünün açısı, (−π, π]. Özel değerler (±0, ±∞, NaN)
 * `Math.atan2` ile aynı.
 */
export function datan2(y: number, x: number): number {
  if (x !== x || y !== y) return NaN;
  if (x === 1) return datan(y);
  const yNeg = signBit(y);
  const xNeg = signBit(x);
  if (y === 0) {
    if (!xNeg) return y;
    return yNeg ? -PI : PI;
  }
  if (x === 0) return yNeg ? -PI_O_2 : PI_O_2;
  const xInf = x === Infinity || x === -Infinity;
  const yInf = y === Infinity || y === -Infinity;
  if (xInf) {
    if (yInf) {
      const a = xNeg ? THREE_PI_O_4 : PI_O_4;
      return yNeg ? -a : a;
    }
    if (xNeg) return yNeg ? -PI : PI;
    return yNeg ? -0 : 0;
  }
  if (yInf) return yNeg ? -PI_O_2 : PI_O_2;
  const ratio = Math.abs(y / x);
  let z: number;
  if (ratio > ATAN2_BIG) z = PI_O_2 + 0.5 * PI_LO;
  else if (xNeg && ratio < ATAN2_SMALL) z = 0;
  else z = datan(ratio);
  if (!xNeg) return yNeg ? -z : z;
  return yNeg ? z - PI_LO - PI : PI - (z - PI_LO);
}

// ---------------------------------------------------------------------------------------------
// exp / log — fdlibm e_exp.c, e_log.c
// ---------------------------------------------------------------------------------------------

const LN2_HI = 6.9314718036912381649e-1;
const LN2_LO = 1.90821492927058770002e-10;
const INV_LN2 = 1.442695040888963387;
const EXP_P1 = 1.66666666666666019037e-1;
const EXP_P2 = -2.77777777770155933842e-3;
const EXP_P3 = 6.61375632143793436117e-5;
const EXP_P4 = -1.6533902205465251539e-6;
const EXP_P5 = 4.13813679705723846039e-8;
const EXP_OVERFLOW = 7.09782712893383973096e2;
const EXP_UNDERFLOW = -7.4513321910194110842e2;
/** 0,5·ln 2 ve 1,5·ln 2: indirgeme aralık sınırları. */
const HALF_LN2 = 3.4657359027997264e-1;
const THREE_HALVES_LN2 = 1.0397207708399179;
/** 2^−28: bu büyüklüğün altında exp(x) = 1 + x. */
const EXP_TINY = 3.725290298461914e-9;
/** 2^1000 ve 2^−1000 (alt normal sonuçlarda iki aşamalı ölçekleme). */
const TWO_M1000 = 9.3326361850321887899e-302;
const EXP_SCALE_SHIFT = 1000;
/** Normal aralığın en küçük üssü (+1): k ≥ −1021 → y·2^k tam ölçeklemedir. */
const MIN_NORMAL_K = -1021;
const MAX_K = 1024;

/**
 * Tam 2^k (−1074 ≤ k ≤ 1023). Kare alarak çarpım; ikinin kuvvetlerinin çarpımı aralık içinde
 * tamdır, sonuç her motorda aynıdır.
 */
export function pow2(k: number): number {
  let n = k < 0 ? -k : k;
  let base = k < 0 ? 0.5 : 2;
  let result = 1;
  while (n > 0) {
    if (n - Math.floor(n / 2) * 2 === 1) result *= base;
    n = Math.floor(n / 2);
    if (n > 0) base *= base;
  }
  return result;
}

/** Deterministik e^x. */
export function dexp(x: number): number {
  if (x !== x) return x;
  if (x > EXP_OVERFLOW) return Infinity;
  if (x < EXP_UNDERFLOW) return 0;
  const ax = Math.abs(x);
  let k = 0;
  let hi = 0;
  let lo = 0;
  if (ax > HALF_LN2) {
    if (ax < THREE_HALVES_LN2) {
      k = x > 0 ? 1 : -1;
      hi = x - k * LN2_HI;
      lo = k * LN2_LO;
    } else {
      k = x > 0 ? Math.floor(INV_LN2 * x + 0.5) : -Math.floor(0.5 - INV_LN2 * x);
      hi = x - k * LN2_HI;
      lo = k * LN2_LO;
    }
    x = hi - lo;
  } else if (ax < EXP_TINY) {
    return 1 + x;
  }
  const t = x * x;
  const c = x - t * (EXP_P1 + t * (EXP_P2 + t * (EXP_P3 + t * (EXP_P4 + t * EXP_P5))));
  if (k === 0) return 1 - ((x * c) / (c - 2) - x);
  const y = 1 - (lo - (x * c) / (2 - c) - hi);
  if (k === MAX_K) return y * 2 * pow2(MAX_K - 1);
  if (k >= MIN_NORMAL_K) return y * pow2(k);
  return y * pow2(k + EXP_SCALE_SHIFT) * TWO_M1000;
}

const LG1 = 6.66666666666673513e-1;
const LG2 = 3.999999999940941908e-1;
const LG3 = 2.857142874366239149e-1;
const LG4 = 2.222219843214978396e-1;
const LG5 = 1.818357216161805012e-1;
const LG6 = 1.531383769920937332e-1;
const LG7 = 1.479819860511658591e-1;
const SQRT2 = 1.4142135623730951;
/** Üs ayıklamada hızlı adım: 2^32 ve 2^−32 (tam ölçekleme). */
const TWO_32 = 4294967296;
const TWO_M32 = 2.3283064365386963e-10;
const LOG_STEP_BITS = 32;

/** Deterministik doğal logaritma ln(x). */
export function dlog(x: number): number {
  if (x !== x || x < 0) return NaN;
  if (x === 0) return -Infinity;
  if (x === Infinity) return x;
  // x = m · 2^k, m ∈ [√2/2, √2): yalnızca ikinin kuvvetleriyle (tam) ölçekleme.
  let m = x;
  let k = 0;
  while (m >= TWO_32) {
    m *= TWO_M32;
    k += LOG_STEP_BITS;
  }
  while (m < TWO_M32) {
    m *= TWO_32;
    k -= LOG_STEP_BITS;
  }
  while (m >= 2) {
    m *= 0.5;
    k += 1;
  }
  while (m < 1) {
    m *= 2;
    k -= 1;
  }
  if (m >= SQRT2) {
    m *= 0.5;
    k += 1;
  }
  const f = m - 1;
  const s = f / (2 + f);
  const z = s * s;
  const w = z * z;
  const t1 = w * (LG2 + w * (LG4 + w * LG6));
  const t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)));
  const r = t2 + t1;
  const hfsq = 0.5 * f * f;
  if (k === 0) return f - (hfsq - s * (hfsq + r));
  return k * LN2_HI - (hfsq - (s * (hfsq + r) + k * LN2_LO) - f);
}

/**
 * Deterministik x^y (`**` ve `Math.pow` yerine).
 * - Tam sayı üs: kare alarak çarpım (|y| = 2 → 1 çarpım; hata ≲ log2|y| ulp).
 * - Kesirli üs: x > 0 için e^(y·ln x); göreli hata ≈ (1 + |y·ln x|)·2^−52 (oyundaki değerlerde
 *   ~1e−15). Negatif x'in kesirli üssü NaN.
 * Özel değerler `Math.pow` ile aynı (pow(x, ±0) = 1, pow(±1, ±∞) = NaN, ±0 ve ±∞ halleri).
 * Sınır: sonucu alt normal aralığa düşen negatif tam sayı üsler (ör. 2^−1074) 0 olur.
 */
export function dpow(x: number, y: number): number {
  if (y === 0) return 1;
  if (x !== x || y !== y) return NaN;
  if (y === Infinity || y === -Infinity) {
    const ax = Math.abs(x);
    if (ax === 1) return NaN;
    return ax > 1 === y > 0 ? Infinity : 0;
  }
  if (Math.floor(y) === y) {
    let n = y < 0 ? -y : y;
    let base = x;
    let result = 1;
    while (n > 0) {
      if (n - Math.floor(n / 2) * 2 === 1) result *= base;
      n = Math.floor(n / 2);
      if (n > 0) base *= base;
    }
    return y < 0 ? 1 / result : result;
  }
  // Kesirli üs: −∞ ve ±0 tanımlı, diğer negatif tabanlar NaN.
  if (x === -Infinity) return y > 0 ? Infinity : 0;
  if (x < 0) return NaN;
  if (x === 0) return y > 0 ? 0 : Infinity;
  if (x === Infinity) return y > 0 ? Infinity : 0;
  return dexp(y * dlog(x));
}

/** √(x² + y²) (`Math.hypot` yerine; oyundaki büyüklüklerde taşma yok). */
export function dhypot(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}
