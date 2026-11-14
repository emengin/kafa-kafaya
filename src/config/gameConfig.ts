/**
 * Kafa Kafaya — tüm denge ve ayar değerlerinin tek kaynağı.
 *
 * Kural: oyun kodunda sihirli sayı yok. Yeni bir ayar gerekiyorsa buraya eklenir
 * (ESLint `no-magic-numbers` kuralı src/config dışını denetler).
 * Birimler: uzunluk = mantıksal piksel, zaman = saniye (aksi belirtilmedikçe),
 * hız = piksel/saniye, ivme = piksel/saniye².
 */

/** Genel birim dönüşümleri. */
export const UNITS = {
  msPerSecond: 1000,
} as const;

/** Mantıksal çözünürlük ve ekran ölçekleme. */
export const DISPLAY = {
  width: 1280,
  height: 720,
  /** Letterbox (ölçeklemede oluşan boş şeritler) rengi. */
  letterboxColor: '#000000',
  /** Phaser'ın hedeflediği kare hızı (render). Fizik bundan bağımsızdır. */
  targetFps: 60,
} as const;

/** Sabit adımlı (fixed timestep) oyun döngüsü. */
export const LOOP = {
  /** Fizik/simülasyon frekansı (Hz). Determinizm bu sabite dayanır. */
  stepHz: 60,
  /**
   * Tek karede birikime eklenecek en uzun süre (sn). Sekme arka plana alınıp geri
   * gelindiğinde "ölüm sarmalı"nı (spiral of death) engeller.
   */
  maxFrameSeconds: 0.25,
  /** Bir render karesinde koşulabilecek en fazla simülasyon adımı. */
  maxStepsPerFrame: 8,
  /**
   * Kayan nokta birikim hatası toleransı (sn). 16.666… ms'lik karelerde
   * 0 ve 2 adım arasında titremeyi önler.
   */
  epsilonSeconds: 1e-9,
} as const;

/** Fizik modülü ayarları (Faz 1'de genişletilecek). */
export const PHYSICS = {
  /** Her sabit adımın bölüneceği alt adım sayısı (tünelleme önleme). */
  subSteps: 4,
  gravity: 1800,
} as const;

/** Maç kuralları (GAME_DESIGN.md ile uyumlu). */
export const MATCH = {
  durationSeconds: 90,
  goldenGoalOvertime: true,
  /** Top kale üst direğinde bu süreden uzun kalırsa sahaya doğru itilir. */
  crossbarRestMaxSeconds: 2,
} as const;

/**
 * Klavye eşlemeleri. KeyboardEvent.code değerleri kullanılır; böylece sol/sağ Shift
 * ayrılabilir ve klavye düzeninden (TR-Q, F, US) bağımsız fiziksel tuşlar okunur.
 */
export const CONTROLS = {
  p1: { left: 'KeyA', right: 'KeyD', jump: 'KeyW', kick: 'Space', super: 'ShiftLeft' },
  p2: {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    jump: 'ArrowUp',
    kick: 'Enter',
    super: 'ShiftRight',
  },
} as const;

/** Kalıcı kayıt (localStorage) anahtarları. */
export const STORAGE = {
  prefix: 'kafa-kafaya.',
  keys: {
    language: 'language',
  },
} as const;

/** Renk paleti (Phaser sayısal renk biçimi). */
export const COLORS = {
  skyTop: 0x1b2a6b,
  skyBottom: 0x3a7bd5,
  grass: 0x2e8b3d,
  grassStripe: 0x35a046,
  pitchLine: 0xffffff,
  ballFill: 0xffffff,
  ballPatch: 0x1d1d1d,
  ballShadow: 0x000000,
  ballShadowAlpha: 0.25,
  textPrimary: '#ffffff',
  textAccent: '#ffd23f',
  textStroke: '#0b1340',
  progressBack: 0x0b1340,
  progressFill: 0xffd23f,
} as const;

/** Kod ile üretilen doku anahtarları ve boyutları. */
export const TEXTURES = {
  ball: {
    key: 'tex-ball',
    radius: 28,
    outlinePx: 3,
    /** Ortadaki beşgen yamanın yarıçapı / top yarıçapı. */
    centerPatchRatio: 0.3,
    /** Çevredeki yuvarlak yamalar: yarıçap ve merkeze uzaklık oranları. */
    outerPatchRatio: 0.17,
    outerPatchDistanceRatio: 0.7,
    patchCount: 5,
  },
} as const;

/** Yükleme ekranı. */
export const PRELOAD = {
  bar: { width: 420, height: 18, borderRadius: 9 },
  /** Doku üretimi çok hızlı; yükleme ekranının bir an görünmesi için en kısa süre (ms). */
  minVisibleMs: 300,
} as const;

/** Ana menü yerleşimi ve animasyonları. */
export const MENU = {
  fontFamily: '"Arial Black", "Segoe UI", Arial, sans-serif',
  title: {
    yRatio: 0.38,
    fontSizePx: 104,
    strokePx: 12,
    shadowOffsetPx: 6,
    shadowBlurPx: 0,
    shadowColor: '#000000',
    /** Başlığın hafif "nefes alma" ölçek animasyonu. */
    pulseScale: 1.04,
    pulseMs: 1200,
  },
  prompt: {
    yRatio: 0.6,
    fontSizePx: 36,
    strokePx: 6,
    blinkMinAlpha: 0.25,
    blinkMs: 700,
  },
  footer: {
    fontSizePx: 18,
    marginPx: 16,
    alpha: 0.7,
  },
  grass: {
    heightRatio: 0.18,
    stripeCount: 10,
    lineWidthPx: 4,
  },
  /** Menüdeki zıplayan top — sabit adımlı döngünün görsel sağlaması. */
  demoBall: {
    /** Yazılarla çakışmasın diye sağ tarafta. */
    xRatio: 0.85,
    startHeightRatio: 0.15,
    restitution: 0.82,
    /** Sekme hızı bunun altına düşerse top yeniden bu hızla fırlatılır (px/sn). */
    minBounceSpeed: 650,
    relaunchSpeed: 1050,
    /** Tıklamada topa verilen yukarı hız (px/sn). */
    kickSpeed: 1400,
    /** Dönüş hızı (radyan/sn). */
    spinSpeed: 3,
    /** Gölge elipsi boyutu (top çapına oran). */
    shadowWidthRatio: 1.1,
    shadowHeightRatio: 0.25,
  },
  clickFlash: { durationMs: 150, red: 255, green: 255, blue: 255 },
} as const;

/** Dil ayarları. */
export const I18N = {
  defaultLanguage: 'tr',
} as const;
