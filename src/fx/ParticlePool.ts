import { PARTICLE_FRAME_NAMES, type ParticleFrameName } from '../config/gameConfig';

/**
 * Parçacık havuzu (nesne havuzu): sabit kapasiteli, "dizi yapısı" (struct-of-arrays) düzeninde.
 * Oyun sırasında hiç bellek ayırmaz — yeni parçacık, ölü bir parçacığın yerini alır; havuz
 * doluysa en eski parçacıklardan biri sırayla geri dönüştürülür. Phaser'dan bağımsızdır
 * (çizim `ParticleLayer`'da); yalnızca görseldir, oyun durumunu etkilemez.
 *
 * Canlı parçacıklar her zaman `[0, count)` aralığında yoğun tutulur (ölen parçacığın yerine
 * sonuncusu taşınır), böylece güncelleme ve çizim boşluk atlamadan yürür.
 */

/** Parçacık atlasındaki kareler (doku fxArt.ts içinde kodla çizilir). */
export const PARTICLE_FRAMES = PARTICLE_FRAME_NAMES;

export type ParticleFrame = ParticleFrameName;

export function frameIndex(frame: ParticleFrame): number {
  return PARTICLE_FRAMES.indexOf(frame);
}

/** Bayraklar (bit maskesi). */
export const PARTICLE_FLAGS = {
  /** Parçacık hız yönüne döner ve hızıyla uzar (kıvılcım, çizgi). */
  align: 1,
  /** Konfeti gibi yan yana sallanarak (genişliği dönerek) düşer. */
  flutter: 2,
} as const;

export class ParticlePool {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly age: Float32Array;
  readonly life: Float32Array;
  readonly size0: Float32Array;
  readonly size1: Float32Array;
  readonly gravity: Float32Array;
  readonly drag: Float32Array;
  readonly rot: Float32Array;
  readonly spin: Float32Array;
  readonly alpha0: Float32Array;
  readonly alpha1: Float32Array;
  readonly color: Uint32Array;
  readonly frame: Uint8Array;
  readonly flags: Uint8Array;
  /** Canlı parçacık sayısı. */
  count = 0;
  private limit: number;
  private cursor = 0;
  /** Tüm alan dizileri (silmede birlikte taşınır; her seferinde yeni dizi kurulmasın). */
  private readonly columns: readonly (Float32Array | Uint32Array | Uint8Array)[];

  constructor(readonly capacity: number) {
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.age = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.size0 = new Float32Array(capacity);
    this.size1 = new Float32Array(capacity);
    this.gravity = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.rot = new Float32Array(capacity);
    this.spin = new Float32Array(capacity);
    this.alpha0 = new Float32Array(capacity);
    this.alpha1 = new Float32Array(capacity);
    this.color = new Uint32Array(capacity);
    this.frame = new Uint8Array(capacity);
    this.flags = new Uint8Array(capacity);
    this.limit = capacity;
    this.columns = [
      this.x,
      this.y,
      this.vx,
      this.vy,
      this.age,
      this.life,
      this.size0,
      this.size1,
      this.gravity,
      this.drag,
      this.rot,
      this.spin,
      this.alpha0,
      this.alpha1,
      this.color,
      this.frame,
      this.flags,
    ];
  }

  /** Etkin üst sınır (kalite düşünce küçülür); fazlası hemen silinir. */
  setLimit(limit: number): void {
    this.limit = Math.max(1, Math.min(this.capacity, Math.floor(limit)));
    if (this.count > this.limit) this.count = this.limit;
    this.cursor = 0;
  }

  get activeLimit(): number {
    return this.limit;
  }

  /**
   * Yeni bir parçacık yuvası verir ve varsayılan değerlerle doldurur (yaş 0, ömür 1 sn, beyaz,
   * tam opaklıktan sıfıra). Havuz doluysa sıradaki eski parçacık geri dönüştürülür.
   * @returns Doldurulacak dizin.
   */
  spawn(): number {
    let i: number;
    if (this.count < this.limit) {
      i = this.count++;
    } else {
      i = this.cursor % this.count;
      this.cursor = (this.cursor + 1) % this.count;
    }
    this.x[i] = 0;
    this.y[i] = 0;
    this.vx[i] = 0;
    this.vy[i] = 0;
    this.age[i] = 0;
    this.life[i] = 1;
    this.size0[i] = 1;
    this.size1[i] = 1;
    this.gravity[i] = 0;
    this.drag[i] = 0;
    this.rot[i] = 0;
    this.spin[i] = 0;
    this.alpha0[i] = 1;
    this.alpha1[i] = 0;
    this.color[i] = 0xffffff;
    this.frame[i] = 0;
    this.flags[i] = 0;
    return i;
  }

  /** Yaşam oranı (0 = doğdu, 1 = ölüyor). */
  progress(i: number): number {
    const life = this.life[i] ?? 1;
    return life > 0 ? (this.age[i] ?? 0) / life : 1;
  }

  /** Tüm parçacıkları ilerletir: sürükleme, yerçekimi, konum, dönüş; ömrü dolanlar silinir. */
  update(dt: number): void {
    if (dt <= 0) return;
    let i = 0;
    while (i < this.count) {
      const age = (this.age[i] ?? 0) + dt;
      if (age >= (this.life[i] ?? 0)) {
        this.kill(i);
        continue;
      }
      this.age[i] = age;
      const k = 1 / (1 + (this.drag[i] ?? 0) * dt);
      const vx = (this.vx[i] ?? 0) * k;
      const vy = (this.vy[i] ?? 0) * k + (this.gravity[i] ?? 0) * dt;
      this.vx[i] = vx;
      this.vy[i] = vy;
      this.x[i] = (this.x[i] ?? 0) + vx * dt;
      this.y[i] = (this.y[i] ?? 0) + vy * dt;
      this.rot[i] = (this.rot[i] ?? 0) + (this.spin[i] ?? 0) * dt;
      i++;
    }
  }

  /** Hepsini siler (sahne değişimi, santra). */
  clear(): void {
    this.count = 0;
    this.cursor = 0;
  }

  /** `i`'yi siler: son canlı parçacık onun yerine taşınır. */
  private kill(i: number): void {
    const last = --this.count;
    if (i === last) return;
    for (const arr of this.columns) arr[i] = arr[last] ?? 0;
  }
}
