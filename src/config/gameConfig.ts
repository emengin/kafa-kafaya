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

/** Fizik çözücü (src/physics) ayarları. */
export const PHYSICS = {
  /** Her sabit adımın en az bölüneceği alt adım sayısı. */
  subSteps: 4,
  /** Çok hızlı cisimlerde alt adım sayısı bu sınıra kadar artar (uyarlamalı sub-stepping). */
  maxSubSteps: 64,
  /**
   * Bir alt adımda herhangi bir cismin kat edebileceği en uzun yol (px). En küçük çarpışma
   * dairesinin yarıçapından (top: 22) belirgin biçimde küçük olmalı: böylece hiçbir dairenin
   * merkezi bir engelin içine giremez, çarpışma normali hep doğru tarafı gösterir ve
   * tünelleme olmaz. 4 alt adımla 8 px → 1920 px/sn'ye kadar ek alt adım gerekmez.
   */
  maxTravelPerSubStep: 8,
  /** Yaklaşma hızı bunun altındaysa sekme uygulanmaz (yerde titremeyi önler), px/sn. */
  restingSpeed: 45,
  /** Pozisyon düzeltmesinde bırakılan tolerans (px). */
  penetrationSlop: 0.01,
  /** Temas normalinin "zemin" sayılması için gereken en küçük yukarı bileşen (−ny). */
  groundNormalMinY: 0.6,
  /** Sıfıra bölmeyi ve dejenere durumları önleyen küçük değer. */
  epsilon: 1e-9,
} as const;

/**
 * Saha geometrisi ve top–yüzey malzemeleri.
 * restitution: sekme katsayısı (0 = ölü, 1 = tam esnek); friction: Coulomb sürtünme katsayısı.
 */
export const PITCH = {
  /** Zeminin üst yüzü (y). */
  groundY: 640,
  /** Tavanın alt yüzü (y). */
  ceilingY: 0,
  /**
   * Sınır doğru parçaları köşelerden bu kadar taşar; böylece zemin, duvarlar ve tavan
   * fiilen yarı-düzlem gibi davranır (köşeden kaçış yok).
   */
  boundaryOverhang: 1000,
  goal: {
    /** Kale çizgisinin yan duvara uzaklığı = ağ derinliği (px). */
    depth: 90,
    /** Zeminden üst direğin alt yüzüne yükseklik (px). */
    mouthHeight: 210,
    crossbarThickness: 12,
    /** Üst direğin üstündeki "bekleme" bölgesinin yüksekliği; top burada kalırsa itilir. */
    restZoneHeight: 70,
    /** Bekleme süresi (MATCH.crossbarRestMaxSeconds) aşılınca topa verilen hız, px/sn. */
    pushSpeed: 320,
    popSpeed: 280,
  },
  materials: {
    ground: { restitution: 0.6, friction: 0.4 },
    wall: { restitution: 0.72, friction: 0.2 },
    ceiling: { restitution: 0.6, friction: 0.2 },
    crossbar: { restitution: 0.68, friction: 0.2 },
  },
} as const;

/** Top. */
export const BALL = {
  radius: 22,
  mass: 1,
  /** Atalet momenti I = k·m·r² (içi boş küre için k ≈ 2/3). */
  inertiaFactor: 0.667,
  gravity: 1500,
  /** Hava direnci ivmesi: a = −(linearDrag + quadraticDrag·|v|)·v. */
  linearDrag: 0.06,
  quadraticDrag: 0.00011,
  /** Magnus (falso) ivmesi: a = magnus·ω·⊥v. Hafif tutulur. */
  magnus: 0.015,
  /** Dönüş sönümü (1/sn): ω her saniye e^(−k) ile çarpılır. */
  spinDamping: 0.5,
  /** En yüksek açısal hız (rad/sn). */
  maxSpin: 35,
  /** En yüksek doğrusal hız (px/sn). */
  maxSpeed: 2000,
  /** Yüzeyde yuvarlanırken yavaşlama (px/sn²). */
  rollingDecel: 150,
  /** Santrada topun ortadan bırakıldığı yükseklik (y). */
  kickoffY: 280,
} as const;

/**
 * Oyuncu. Konum = kafa dairesinin merkezi; gövde ve ayak kafaya göre ofsetlidir.
 * Ayakta dururken gövdenin altı zemine değer: kafa merkezi = zemin − (body.offsetY + body.radius).
 */
export const PLAYER = {
  /** Topun kütlesine (1) göre. Top çarpınca oyuncunun ne kadar sarsılacağını belirler. */
  mass: 10,
  /** Santrada oyuncunun kendi duvarına uzaklığı / saha genişliği. */
  spawnXRatio: 0.27,
  head: { radius: 36 },
  body: { offsetY: 60, radius: 22 },
  foot: {
    /** Bacağın döndüğü kalça noktası (kafa merkezine göre y). */
    hipOffsetY: 40,
    legLength: 40,
    radius: 13,
  },
  /** Yatay hareket eğrisi: hız, hedef hıza bu ivmelerle (px/sn²) yaklaşır. */
  move: {
    maxSpeed: 430,
    groundAccel: 5000,
    groundDecel: 6500,
    /** Ters yöne basınca (dönüş) kullanılan ivme: daha yüksek = daha keskin dönüş. */
    groundTurnAccel: 9000,
    airAccel: 3000,
    airDecel: 1500,
    airTurnAccel: 4500,
  },
  jump: {
    /** Kalkış hızı (px/sn). Tepe yüksekliği ≈ speed² / (2·gravity) ≈ 161 px. */
    speed: 1000,
    gravity: 3100,
    /** Düşerken yerçekimi çarpanı: inişi hızlandırır, "yüzme" hissini keser. */
    fallGravityMultiplier: 1.35,
    maxFallSpeed: 1500,
    /** Zeminden ayrıldıktan sonra hâlâ zıplanabilen süre (sn). */
    coyoteTime: 0.08,
    /** Yere inmeden önce basılan zıplamanın hatırlandığı süre (sn). */
    bufferTime: 0.1,
    /** Yükselirken zıplama bırakılırsa dikey hız bu katsayıyla çarpılır (değişken yükseklik). */
    cutMultiplier: 0.55,
  },
  /** Top–oyuncu malzemeleri ve oyuncu–oyuncu / oyuncu–saha teması. */
  materials: {
    head: { restitution: 0.55, friction: 0.25 },
    body: { restitution: 0.35, friction: 0.25 },
    foot: { restitution: 0.3, friction: 0.4 },
    /** Oyuncu–oyuncu ve oyuncu–saha: sekmesiz, sürtünmesiz (yatay hareketi girdi belirler). */
    solid: { restitution: 0, friction: 0 },
  },
} as const;

/**
 * Şut. Ayak kalça etrafında bir yay çizer: açı 0 = dümdüz aşağı, artış = öne/yukarı.
 * Savrulma "ease-out"tur: ayak en hızlı başta döner, yayın sonunda yavaşlar. Topa verilen
 * hız temas anındaki açısal hıza (savrulma fazı) ve oyuncunun hızına bağlıdır.
 */
export const KICK = {
  swingSeconds: 0.09,
  holdSeconds: 0.05,
  returnSeconds: 0.12,
  /** Dinlenme açısı (rad): ayak gövdenin önünde, zeminde. */
  restAngle: 0.76,
  /** Savrulmanın bittiği açı (rad): ayak kafanın ön-altında. */
  maxAngle: 2.0,
  /** Şut tuşu, önceki savrulma bitmeden basılırsa bu süre (sn) hatırlanır. */
  bufferTime: 0.12,
  /** Savrulmanın sonunda / başında (en hızlı anda) topa verilen hız (px/sn). */
  minSpeed: 500,
  maxSpeed: 1250,
  /** Oyuncu hızının şut yönündeki bileşeninin topa eklenen oranı. */
  playerVelocityTransfer: 0.5,
  /** Topun gelen hızının şut yönüne dik bileşeninden korunan oran. */
  perpendicularRetain: 0.25,
  /**
   * Şutun yükselme açısı = baseLift + contactAngleFactor × (temas normalinin açısı), sınırlı.
   * Ayak topun altına vurursa top yükselir, üstüne vurursa yere doğru gider.
   */
  baseLift: 0.3,
  contactAngleFactor: 1.0,
  minElevation: -0.9,
  maxElevation: 1.2,
  /** Temas noktasına göre verilen dönüş: alttan vuruş = geri dönüş (backspin), rad/sn. */
  spinFromContact: 20,
  /** Savrulma sırasında ayağın vuruş yarıçapına eklenen tolerans (px): şutu affedici yapar. */
  hitRadiusBonus: 6,
} as const;

/** Kafa vuruşu. */
export const HEADER = {
  /** Çarpışma darbesine ek olarak oyuncu hızının topa aktarılan oranı. */
  velocityBonus: 0.3,
  /** Ek aktarım yalnızca bu yaklaşma hızının üstündeki çarpmalarda uygulanır (px/sn). */
  minImpactSpeed: 150,
} as const;

/** Maç kuralları (GAME_DESIGN.md ile uyumlu). */
export const MATCH = {
  durationSeconds: 90,
  goldenGoalOvertime: true,
  /** Top kale üst direğinde bu süreden uzun kalırsa sahaya doğru itilir. */
  crossbarRestMaxSeconds: 2,
  /** Golden sonra santraya kadar geçen süre (sn). Simülasyon bu sürede akmaya devam eder. */
  goalResetDelaySeconds: 1.5,
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
  /** Arayüz tuşları (oyun girdisi değildir, tekrar kaydına girmez). */
  ui: { debugToggle: 'F1', back: 'Escape' },
} as const;

/**
 * Geliştirici kısayolları (URL parametreleri). Örn. `?scene=match&debug=1` menüyü atlayıp
 * doğrudan maça girer ve debug katmanını açık başlatır.
 */
export const DEV = {
  sceneParam: 'scene',
  matchSceneValue: 'match',
  debugParam: 'debug',
  debugOnValue: '1',
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
    /** Yalnızca bu dekoratif top için; oyun fiziği BALL.gravity kullanır. */
    gravity: 1800,
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
  /** Menüden maça geçerken kararma süresi (ms). */
  startFadeMs: 250,
} as const;

/** Faz 1 gri kutu çizimi (Phaser Graphics ile basit şekiller). */
export const GRAYBOX = {
  background: 0x262626,
  ground: 0x454545,
  groundLine: 0x8c8c8c,
  lineWidthPx: 3,
  centerLine: 0x363636,
  centerCircleRadius: 80,
  net: 0xbdbdbd,
  netAlpha: 0.3,
  netSpacingPx: 15,
  netLineWidthPx: 1,
  crossbar: 0xdedede,
  post: 0xbdbdbd,
  postWidthPx: 4,
  outline: 0x1a1a1a,
  outlinePx: 2,
  legWidthPx: 6,
  /** Oyuncu başına gri tonları (P1 açık, P2 koyu). */
  players: [
    { head: 0xd6d6d6, body: 0xa8a8a8, foot: 0x6e6e6e },
    { head: 0x9e9e9e, body: 0x767676, foot: 0x4a4a4a },
  ],
  /** Savrulma sırasında ayak bu renge döner (şutun görünür olması için). */
  kickFoot: 0xf5f5f5,
  /** Göz: bakış yönünü gösterir. Konum kafa yarıçapına oranla. */
  eye: { color: 0x1a1a1a, radius: 5, forwardRatio: 0.5, upRatio: 0.15 },
  ball: { fill: 0xf2f2f2, spoke: 0x1a1a1a, spokePx: 3 },
} as const;

/** Maç ekranı metinleri. */
export const HUD = {
  fontFamily: '"Arial Black", "Segoe UI", Arial, sans-serif',
  score: { y: 44, fontSizePx: 48, strokePx: 6 },
  goalBanner: {
    yRatio: 0.32,
    fontSizePx: 120,
    strokePx: 10,
    popScale: 1.25,
    popMs: 180,
    holdMs: 800,
    fadeMs: 350,
  },
  hint: { marginPx: 10, fontSizePx: 16, alpha: 0.55 },
  /** Oyuncu etiketi (P1/P2) kafanın üstünden bu kadar yukarıda. */
  label: { gapPx: 8, fontSizePx: 18, alpha: 0.8 },
  depth: 100,
} as const;

/** F1 debug katmanı. */
export const DEBUG = {
  depth: 1000,
  lineWidthPx: 2,
  alpha: 0.95,
  colors: {
    static: 0xff5050,
    dynamic: 0x50ff80,
    kick: 0xffa020,
    zone: 0xffd23f,
    net: 0x40c0ff,
    velocity: 0xff50ff,
  },
  /** Hız vektörü çizgisinin uzunluğu = hız × bu süre (sn). */
  velocityScaleSeconds: 0.1,
  text: {
    x: 110,
    y: 12,
    fontSizePx: 14,
    color: '#b0ffb0',
    background: '#000000b0',
    padding: 6,
  },
  /** FPS ve adım süresi ölçümlerinde üstel ortalama katsayısı. */
  statsSmoothing: 0.1,
  decimals: 2,
} as const;

/** Dil ayarları. */
export const I18N = {
  defaultLanguage: 'tr',
} as const;
