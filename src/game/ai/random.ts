import { dcos, dlog } from '../../physics';
/** mulberry32 sabitleri (algoritmanın parçası; ayar değeri değildir). */
const INCREMENT = 0x6d2b79f5;
const SHIFT_A = 15;
const SHIFT_B = 7;
const SHIFT_C = 14;
const MIX_OR = 61;
const UINT32_RANGE = 4294967296;
/** Box–Muller dönüşümündeki −2 (√(−2·ln u)). */
const BOX_MULLER_K = -2;

/**
 * Küçük, hızlı, tohumlanabilir PRNG (mulberry32). Aynı tohum → aynı dizi; yapay zekânın
 * "insani" rastgeleliği bununla üretilir, böylece AI maçları da deterministik ve tekrar
 * oynatılabilir kalır. `Math.random` kullanılmaz.
 */
export class SeededRandom {
  private current: number;

  constructor(seed: number) {
    this.current = seed >>> 0;
  }

  /** İç durum (snapshot ve determinizm testleri için). */
  get state(): number {
    return this.current;
  }

  /** İç durumu geri yükler (gol tekrarı: simülasyon durumu birebir geri alınır). */
  set state(value: number) {
    this.current = value >>> 0;
  }

  /** [0, 1) aralığında sayı. */
  next(): number {
    this.current = (this.current + INCREMENT) >>> 0;
    let t = this.current;
    t = Math.imul(t ^ (t >>> SHIFT_A), t | 1);
    t ^= t + Math.imul(t ^ (t >>> SHIFT_B), t | MIX_OR);
    return ((t ^ (t >>> SHIFT_C)) >>> 0) / UINT32_RANGE;
  }

  /** [min, max) aralığında sayı. */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** `p` olasılıkla true. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Ortalama 0, standart sapma 1 olan normal dağılımlı sayı (Box–Muller). */
  gaussian(): number {
    const u = 1 - this.next(); // (0, 1]: log(0) olmasın
    const v = this.next();
    return Math.sqrt(BOX_MULLER_K * dlog(u)) * dcos(2 * Math.PI * v);
  }
}

/** İki tohumu tek bir 32 bit tohuma karıştırır (maç tohumu + oyuncu sırası gibi). */
export function mixSeed(a: number, b: number): number {
  return (Math.imul(a ^ (b + INCREMENT), INCREMENT) ^ b) >>> 0;
}
