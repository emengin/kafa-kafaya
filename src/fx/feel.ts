import { JUICE, QUALITY } from '../config/gameConfig';
import { approach } from './Spring';

/**
 * Sert vuruşun hit-stop süresi (ms): eşiğin altında 0, üstünde hızla artar. Hit-stop'un kendisi
 * yalnızca görüntüde uygulanır (`PresentationTimeline`, Faz 2.7): simülasyon donma sırasında da
 * akar.
 */
export function hitStopForSpeed(speed: number, maxSpeed: number): number {
  const h = JUICE.hitStop;
  if (speed < h.hardHitSpeed) return 0;
  const u = Math.min(1, (speed - h.hardHitSpeed) / Math.max(1, maxSpeed - h.hardHitSpeed));
  return h.minMs + (h.maxMs - h.minMs) * u;
}

/** Düzgün sözde gürültü (−1…1): oranları ortak katı olmayan üç sinüsün toplamı. */
function smoothNoise(t: number, seed: number): number {
  const a = Math.sin(t * NOISE_F1 + seed);
  const b = Math.sin(t * NOISE_F2 + seed * NOISE_SEED2);
  const c = Math.sin(t * NOISE_F3 + seed * NOISE_SEED3);
  return (a + b * NOISE_W2 + c * NOISE_W3) / (1 + NOISE_W2 + NOISE_W3);
}
const NOISE_F1 = 1.0;
const NOISE_F2 = 2.37;
const NOISE_F3 = 4.61;
const NOISE_SEED2 = 1.73;
const NOISE_SEED3 = 3.11;
const NOISE_W2 = 0.6;
const NOISE_W3 = 0.35;
const SEED_X = 0.3;
const SEED_Y = 7.9;
const SEED_R = 13.4;

/**
 * Ekran sarsıntısı ("travma" modeli): olaylar travma ekler (0–1), travma doğrusal söner;
 * kayma travmanın karesiyle ölçeklenir — küçük vuruşlar hafif, gol güçlü sarsar.
 */
export class ScreenShake {
  trauma = 0;
  offsetX = 0;
  offsetY = 0;
  angle = 0;
  private time = 0;

  add(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt: number, scale = 1): void {
    const s = JUICE.shake;
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - s.decayPerSecond * dt);
    const k = this.trauma * this.trauma * scale;
    const t = this.time * s.frequencyHz;
    this.offsetX = k * s.maxOffsetPx * smoothNoise(t, SEED_X);
    this.offsetY = k * s.maxOffsetPx * smoothNoise(t, SEED_Y);
    this.angle = k * s.maxAngleRad * smoothNoise(t, SEED_R);
  }

  reset(): void {
    this.trauma = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.angle = 0;
  }
}

/**
 * Dünya katmanının yakınlaşması: bir odak noktası etrafında ölçek. Odak ekranın içindeyse ve
 * ölçek ≥ 1 ise görünen alan hep dünyanın içinde kalır (kenarda boşluk görünmez).
 */
export class CameraRig {
  zoom = 1;
  focusX = 0;
  focusY = 0;
  private target = 1;
  private holdSeconds = 0;
  /** Tekrar kamerası: izlenen nokta (yumuşak takip) ve hafif eğim (rad). */
  private tracking = false;
  private trackX = 0;
  private trackY = 0;
  tilt = 0;
  private tiltTarget = 0;

  constructor(
    private readonly width: number,
    private readonly height: number,
  ) {
    this.focusX = width / 2;
    this.focusY = height / 2;
  }

  /** `zoom` kadar yakınlaş, `hold` gerçek saniye tut, sonra geri dön. */
  punchIn(zoom: number, focusX: number, focusY: number, hold: number): void {
    this.target = zoom;
    this.focusX = Math.min(this.width, Math.max(0, focusX));
    this.focusY = Math.min(this.height, Math.max(0, focusY));
    this.holdSeconds = hold;
  }

  release(): void {
    this.target = 1;
    this.holdSeconds = 0;
  }

  /**
   * Tekrar kamerası (Faz 7): `zoom` ölçeğinde (x, y) noktasını ekran ortasına getirerek yumuşakça
   * izler; görünen alan dünyanın dışına taşmaz (kenarda boşluk yok). Her karede çağrılır.
   */
  track(zoom: number, x: number, y: number, tilt: number, rate: number, dt: number): void {
    if (!this.tracking) {
      this.tracking = true;
      this.trackX = x;
      this.trackY = y;
    }
    this.trackX = approach(this.trackX, x, rate, dt);
    this.trackY = approach(this.trackY, y, rate, dt);
    this.target = zoom;
    this.holdSeconds = 0;
    this.tiltTarget = tilt;
  }

  /** Tekrar bitti: normal kameraya anında dön. */
  stopTracking(): void {
    this.tracking = false;
    this.tilt = 0;
    this.tiltTarget = 0;
    this.reset();
  }

  update(dt: number): void {
    const z = JUICE.zoom;
    this.tilt = approach(this.tilt, this.tiltTarget, z.inRate, dt);
    if (this.holdSeconds > 0) {
      this.holdSeconds -= dt;
      if (this.holdSeconds <= 0) this.target = 1;
    }
    const rate = this.target > this.zoom ? z.inRate : z.outRate;
    this.zoom = approach(this.zoom, this.target, rate, dt);
    if (Math.abs(this.zoom - this.target) < ZOOM_EPSILON) this.zoom = this.target;
  }

  /**
   * Ölçeklenen katmanın konumu: normalde odak noktası ekranda yerinde kalır; tekrar kamerasında
   * izlenen nokta ortalanır ve görünen alan [0, genişlik] × [0, yükseklik] içinde kalacak şekilde
   * sınırlanır.
   */
  get offsetX(): number {
    if (this.tracking) return centered(this.width, this.zoom, this.trackX);
    return this.focusX * (1 - this.zoom);
  }

  get offsetY(): number {
    if (this.tracking) return centered(this.height, this.zoom, this.trackY);
    return this.focusY * (1 - this.zoom);
  }

  reset(): void {
    this.zoom = 1;
    this.target = 1;
    this.holdSeconds = 0;
  }
}
const ZOOM_EPSILON = 1e-4;

/** `p` noktasını ortalayan kayma, görünen alan dünyanın içinde kalacak şekilde sınırlı. */
function centered(size: number, zoom: number, p: number): number {
  const ideal = size / 2 - zoom * p;
  return Math.min(0, Math.max(size * (1 - zoom), ideal));
}

/** Kalite kademeleri: 0 düşük, 1 orta, 2 yüksek. */
export type QualityLevel = 0 | 1 | 2;

export function parseQuality(value: string | null): QualityLevel | null {
  if (value === 'low') return 0;
  if (value === 'medium') return 1;
  if (value === 'high') return 2;
  return null;
}

/**
 * Oturum boyunca öğrenilen kalite kademesi: bir maçta kalite düşerse sonraki maçlar ve menüler
 * o kademeden başlar (yavaş cihazda her maç yeniden takılıp düşmesin).
 */
let sessionLevel: QualityLevel = 2;

/**
 * Düşük güçlü cihaz sezgisi: az çekirdek ya da az bellek. Böyle cihazlarda WebGL kenar
 * yumuşatma (MSAA) kapatılır ve kalite bir kademe aşağıdan başlar.
 */
export function isLowPowerDevice(nav: {
  hardwareConcurrency?: number;
  deviceMemory?: number;
}): boolean {
  return (
    (nav.hardwareConcurrency ?? MANY) <= QUALITY.lowPowerCores ||
    (nav.deviceMemory ?? MANY) <= QUALITY.lowPowerMemoryGb
  );
}
const MANY = 8;

export function sessionQuality(): QualityLevel {
  return sessionLevel;
}

export function rememberQuality(level: QualityLevel): void {
  sessionLevel = level;
}

/**
 * Uyarlamalı kalite: kare süresinin üstel ortalaması bir süre boyunca bütçeyi aşarsa bir kademe
 * düşer (yalnızca aşağı — dalgalanma olmasın). Sahne açılışı ve sekme dönüşü gibi tek seferlik
 * dev kareler sayılmaz. `fixed` verilirse kademe sabittir.
 */
export class QualityGovernor {
  level: QualityLevel;
  averageMs = 0;
  private elapsed = 0;
  private overBudget = 0;

  constructor(
    initial: QualityLevel = 2,
    private readonly fixed = false,
  ) {
    this.level = initial;
  }

  /** @returns Kademe bu karede düştüyse true. */
  sample(frameMs: number): boolean {
    const q = QUALITY;
    if (frameMs <= 0 || frameMs > q.ignoreFrameMs) return false;
    const dt = frameMs / MS_PER_SECOND;
    this.elapsed += dt;
    this.averageMs =
      this.averageMs === 0 ? frameMs : this.averageMs + (frameMs - this.averageMs) * q.smoothing;
    if (this.fixed || this.elapsed < q.warmupSeconds || this.level === 0) return false;
    this.overBudget = this.averageMs > q.downgradeFrameMs ? this.overBudget + dt : 0;
    if (this.overBudget < q.sustainSeconds) return false;
    this.level = (this.level - 1) as QualityLevel;
    this.overBudget = 0;
    this.averageMs = 0;
    this.elapsed = 0;
    return true;
  }
}
const MS_PER_SECOND = 1000;
