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
  secondsPerMinute: 60,
  /**
   * Saat gösteriminde yukarı yuvarlamadan önce çıkarılan tolerans: 60 Hz adımların kayan
   * nokta birikimi 30,0000001 sn'yi "0:31" göstermesin.
   */
  clockEpsilonSeconds: 1e-6,
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
    /**
     * Bekleme bölgesinin direğin ön kenarından sahaya taşması (≈ top yarıçapı): direğin ön
     * köşesinde dengede duran top da bölgede sayılır (yoksa köşede sonsuza dek kalabilir).
     */
    restZoneOverhang: 22,
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
  /** Santrada topun ortadan bırakıldığı yükseklik (y); duyuru yazılarının altında kalır. */
  kickoffY: 320,
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

/**
 * Güç barı (0–1). Zamanla ve topa dokundukça dolar; doluyken Süper tuşu bir sonraki vuruşu
 * (şut ya da kafa) süper yapar ve barı boşaltır. Süper hazırken bar dolmaz.
 */
export const POWER = {
  /** Oyun akarken pasif dolum (bar/sn): ~20 sn'de dolar. */
  chargePerSecond: 0.05,
  /** Topa her dokunuşta (şut, kafa, temas) eklenen miktar. */
  chargePerTouch: 0.08,
  /** Aynı oyuncunun iki dokunuş dolumu arasındaki en kısa süre (top sürerken bar hızla dolmasın). */
  touchCooldownSeconds: 0.3,
} as const;

/**
 * Tüm süper vuruşlar için ortak değerler. Süper kafa topu en az `headerMinSpeed` hızla gönderir;
 * ardından karakterin süper tipi uygulanır (bkz. SUPER_SHOTS).
 */
export const SUPER = {
  headerMinSpeed: 1500,
  /**
   * Atıştan sonraki bu süre (sn) içinde saha teması süperi bitirmez: yerdeki topa vurulan
   * şutun ilk alt adımlarında top hâlâ zemine değiyor olabilir.
   */
  bounceGraceSeconds: 0.1,
} as const;

/** Karakterlere özgü süper şut tipleri. */
export type SuperType =
  | 'fire'
  | 'ice'
  | 'zigzag'
  | 'teleport'
  | 'giant'
  | 'tornado'
  | 'rainbow'
  | 'magnet'
  | 'mirage'
  | 'quake';

/**
 * Süper şut tipleri. Her tipin ortak alanları:
 * - `speedMultiplier` / `elevationScale`: süper şutta hedef hız ve yükselme açısı çarpanı.
 * - `duration`: etkinin en uzun süresi (sn); sonra top normal topa döner.
 * - `endsOnBounce`: top sahaya (zemin, duvar, tavan, direk) değince etki biter mi.
 * Rakibe ya da sahibine değen top etkisini kaybeder (Dev Top hariç). Rakip topa **aktif**
 * vurursa (savrulan ayakla şut ya da kafa) hiçbir olumsuz etki almaz; Buz ve Ateş yalnızca
 * pasif karşılamayı (gövde, duran kafa) cezalandırır. Her süperin temel karşı oyunu budur.
 */
export const SUPER_SHOTS = {
  /** Ateş Topu: yerçekimsiz, dümdüz ve çok hızlı; engelleyen rakibi geri savurur. */
  fire: {
    speedMultiplier: 1.5,
    elevationScale: 0.2,
    duration: 0.8,
    endsOnBounce: true,
    gravityScale: 0,
    knockbackSpeed: 480,
    knockbackLift: 380,
  },
  /**
   * Buz: rakibin kafasına/gövdesine **havadan doğrudan** değerse onu 1,5 sn dondurur; ilk sekmede
   * söner (karşı oyun: üstünden zıpla, şutla vur ya da sekmesini bekle).
   */
  ice: {
    speedMultiplier: 0.9,
    elevationScale: 0.75,
    duration: 1,
    endsOnBounce: true,
    freezeSeconds: 1.5,
  },
  /** Zikzak: yerçekimsiz, dikeyde dalgalanarak ilerler (y = −A·(1 − cos ωt)). */
  zigzag: {
    speedMultiplier: 1.15,
    elevationScale: 0.15,
    duration: 1.4,
    endsOnBounce: true,
    gravityScale: 0,
    amplitudePx: 55,
    frequencyHz: 2.4,
  },
  /**
   * Işınlanma: kısa bir uçuştan sonra görünmez olur (oyuncuların içinden geçer), rakip kalenin
   * önünde (çizgiden `exitBeforeGoalPx` uzakta) yavaşlayarak yeniden belirir. Kalecinin
   * karşı oyunu: kale çizgisine yakın durmak.
   */
  teleport: {
    speedMultiplier: 1.25,
    elevationScale: 0.4,
    duration: 1.2,
    endsOnBounce: false,
    phaseStartSeconds: 0.12,
    phaseMaxSeconds: 0.35,
    exitBeforeGoalPx: 250,
    /** Işınlanma için topun kaleye en az bu kadar daha yol alması gerekir (px). */
    minPhaseTravelPx: 120,
    exitSpeedScale: 0.65,
  },
  /** Dev Top: top büyür ve ağırlaşır (kaleciyi iter); süre sonunda küçülür. */
  giant: {
    speedMultiplier: 1.05,
    elevationScale: 0.7,
    duration: 2.4,
    endsOnBounce: false,
    radiusScale: 1.8,
    massScale: 3,
    /** Büyüme/küçülme süresi (sn). */
    growSeconds: 0.18,
  },
  /** Kasırga: yakınındaki rakibi topun gidiş yönünde geri iter (havadaysa daha az). */
  tornado: {
    speedMultiplier: 1.2,
    elevationScale: 0.45,
    duration: 1.3,
    endsOnBounce: false,
    radiusPx: 150,
    /** Rakibin topun gidiş yönündeki hızı bu ivmeyle `maxPushSpeed × yakınlık`a çıkarılır. */
    pushAccel: 12000,
    maxPushSpeed: 520,
    airborneFactor: 0.4,
  },
  /**
   * Gökkuşağı: tavana yakın yüksek bir yayla rakip kalenin ağzına dik iner (hava direnci ve
   * falso kapalı). Yavaş ve uzun: kalecinin geri dönüp kafayla karşılamasına zaman kalır.
   */
  rainbow: {
    speedMultiplier: 1,
    elevationScale: 1,
    duration: 2.6,
    endsOnBounce: true,
    apexY: 70,
    /**
     * Hedef: rakip kale çizgisinin `targetInsetPx` önünde, zeminden `targetHeightPx` yukarısı.
     * Top kale ağzının önüne dik iner ve sekerek girmeye çalışır (kaleciye karşılama şansı).
     */
    targetHeightPx: 120,
    targetInsetPx: 180,
    /** Yatay hızın üst sınırı (px/sn); uzaktan tam ulaşamayabilir. */
    maxHorizontalSpeed: 600,
  },
  /** Mıknatıs: uçuş boyunca rakip kalenin ortasına doğru hafifçe çekilir. */
  magnet: {
    speedMultiplier: 1.12,
    elevationScale: 0.6,
    duration: 1.4,
    endsOnBounce: true,
    steerAccel: 1300,
  },
  /** Serap: top üçe bölünür; ikisi yanılsamadır, oyunculara değince ya da süre dolunca söner. */
  mirage: {
    speedMultiplier: 1.15,
    elevationScale: 0.7,
    duration: 0.75,
    endsOnBounce: false,
    spreadRad: 0.26,
    /** Yanılsama bu kadar kale çizgisine yaklaşınca söner (gol görüntüsü vermesin), px. */
    decoyGoalMarginPx: 120,
  },
  /** Sarsıntı: yer sarsılır, rakip 1 sn zıplayamaz; top alçak ve sekerek ilerler. */
  quake: {
    speedMultiplier: 1.15,
    elevationScale: 1,
    duration: 1.6,
    endsOnBounce: false,
    /** Sabit yükselme açısı (rad, negatif = yere doğru). */
    elevation: -0.2,
    jumpLockSeconds: 1,
    groundRestitution: 0.85,
    groundFriction: 0.05,
  },
} as const;

/**
 * Karakter istatistikleri (1–5) → fizik değerleri. Dizinin i. elemanı (i + 1) puanın değeridir;
 * 3 puan Faz 1–3'teki değerlerle aynıdır. Toplam puan her karakterde `statTotal`.
 */
export const CHARACTER_STATS = {
  statTotal: 14,
  statMin: 1,
  statMax: 5,
  /** Hız: en yüksek yatay hız (px/sn). İvmeler aynı oranda ölçeklenir. */
  maxSpeed: [408, 419, 430, 441, 452],
  /** Zıplama: kalkış hızı (px/sn). */
  jumpSpeed: [940, 970, 1000, 1030, 1060],
  /**
   * Şut gücü: şut hızının çarpanı. Güçlü şut aynı zamanda daha düzdür (yükselme açısı güce
   * bölünür): aksi hâlde hızlanan top aynı açıyla kalenin üstünden gider.
   */
  kickPower: [0.86, 0.93, 1, 1.08, 1.16],
  /** Kafa boyutu: kafa yarıçapı (px) ve kütle (büyük kafa = geniş savunma ama daha ağır). */
  headRadius: [31.5, 33.75, 36, 38.25, 40.5],
  mass: [9, 9.5, 10, 10.5, 11],
  /** Büyük kafa daha ağırdır: zıplama hızı bu oranla (kafa puanı 3'ten her puan farkı için) düşer. */
  headJumpPenaltyPerPoint: 0.008,
} as const;

/** Güçlendirici tipleri (süzülen balonlar). */
export type PowerUpType =
  'bigHead' | 'shrinkOpponent' | 'speed' | 'growGoal' | 'freezeOpponent' | 'doubleJump';

/**
 * Güçlendiriciler: sahanın üst yarısında süzülen balonlar. Top balona değince balon patlar ve
 * topa son dokunan oyuncu güçlendiriciyi kazanır (henüz kimse dokunmadıysa top içinden geçer).
 */
export const POWERUPS = {
  /** İki balon arasındaki süre (sn, oyun akarken): [min, max) aralığında rastgele. */
  spawnIntervalMin: 12,
  spawnIntervalMax: 18,
  balloon: {
    radius: 26,
    /** Merkez konumu bu aralıkta seçilir; balon çevresinde yavaşça salınır. */
    minX: 470,
    maxX: 810,
    minY: 150,
    maxY: 270,
    swayXPx: 150,
    swayYPx: 22,
    swayXHz: 0.11,
    swayYHz: 0.45,
    /** Patlamazsa bu süre sonra söner (sn). */
    lifetimeSeconds: 10,
  },
  /** Süreler (sn). */
  durations: {
    bigHead: 8,
    shrinkOpponent: 8,
    speed: 8,
    growGoal: 8,
    freezeOpponent: 1.8,
    doubleJump: 10,
  },
  bigHeadScale: 1.4,
  shrinkScale: 0.65,
  /** Kafa boyutu çarpanının değişim hızı (1/sn): kafa birden değil, kısa sürede büyür/küçülür. */
  headScaleRate: 2.5,
  speedScale: 1.28,
  /** Rakip kalesi bu kadar yükselir (px) ve bu hızla büyür/küçülür (px/sn). */
  goalGrowPx: 70,
  goalGrowSpeed: 220,
  /** Çift zıplamanın kalkış hızı (normal zıplamaya oran). */
  doubleJumpSpeedScale: 0.9,
  /** Bir donmanın ardından buz süperine karşı bağışıklık süresi (sn): art arda donma kilidi olmasın. */
  freezeImmunitySeconds: 1,
  /** Donmuş oyuncunun yatay hızı bu ivmeyle sıfırlanır (px/sn²). */
  frozenDecel: 9000,
} as const;

/** Maç kuralları (GAME_DESIGN.md ile uyumlu). Süreler saniye. */
export const MATCH = {
  durationSeconds: 90,
  /** Süre bittiğinde beraberlikse altın gol uzatması oynanır (false → maç berabere biter). */
  goldenGoalOvertime: true,
  /** Top kale üst direğinde bu süreden uzun kalırsa sahaya doğru itilir. */
  crossbarRestMaxSeconds: 2,
  /** Santra: oyuncular ve top yerinde bekler; süre dolunca düdük çalar ve top bırakılır. */
  kickoffSeconds: 0.8,
  /** Altın gol uzatmasının santrasında daha uzun bekleme ("ALTIN GOL!" yazısı okunsun). */
  goldenGoalKickoffSeconds: 1.8,
  /**
   * Golden santraya kadar geçen **gerçek** süre (ağır çekim dahil). Simülasyon bu sürede
   * akmaya devam eder ama ikinci gol sayılmaz.
   */
  goalCelebrationSeconds: 2,
  /** Golden hemen sonra ağır çekim süresi (gerçek sn) ve oranı. */
  goalSlowMoSeconds: 1,
  goalSlowMoScale: 0.3,
  /** Kalan süre bunun altına inince saat kırmızı ve nabızlı. */
  finalCountdownSeconds: 10,
} as const;

/** Yapay zekâ zorluk seviyeleri. */
export type AiDifficulty = 'easy' | 'medium' | 'hard';

export const AI_DIFFICULTIES: readonly AiDifficulty[] = ['easy', 'medium', 'hard'];

/**
 * Bir zorluk seviyesinin parametreleri. AI yalnızca `InputState` üretir; zorluk farkı
 * algı, tahmin ve karar kalitesinden gelir — fizik ve kurallar insanla aynıdır.
 */
export interface AiProfile {
  /** Reaksiyon (algı) gecikmesi, ms: top ve rakip bu kadar eski hâliyle görülür. */
  readonly reactionMs: number;
  /** Her kararda gecikmeye eklenen rastgele sapmanın std'si (ms). */
  readonly reactionJitterMs: number;
  /** Tahmin hatası: yörünge tahmininde topun hızına eklenen gürültünün std'si (hıza oran). */
  readonly predictionError: number;
  /** Karar sıklığı: mod ve hedef seçimi arası süre (ms). */
  readonly decisionIntervalMs: number;
  /** Yörünge tahmininin periyodik yenilenme aralığı (ms). Çarpışma görülünce hemen yenilenir. */
  readonly predictionIntervalMs: number;
  /** Agresiflik 0–1: topa ne kadar istekli gidilir, savunmada ne kadar ileride beklenir. */
  readonly aggression: number;
  /** Süper kullanım oranı 0–1: iyi bir süper fırsatında süperi kullanma olasılığı. */
  readonly superUseRate: number;
  /** Hedef konuma eklenen insani sapmanın std'si (px). */
  readonly aimErrorPx: number;
  /** Yeni bir şut fırsatında tereddüt edip geç kalma olasılığı. */
  readonly kickHesitation: number;
  /** Şut seçiciliği 0–1: 0 = her fırsatta vur, 1 = gole gidecek şutu bekle. */
  readonly shotSelectivity: number;
  /** Dalgınlık: bir kararın kısa süre ertelenme olasılığı. */
  readonly distraction: number;
  /** Şut zamanlaması hatasının std'si (adım): erken basış zayıf şut/ıska, geç basış gecikme. */
  readonly kickTimingError: number;
  /** Serap'ta gerçek topu doğru seçme olasılığı (yanılsamalar sönene kadar). */
  readonly mirageReadChance: number;
  /** Tehlikeli bir süper topa (Buz, Ateş, Kasırga) gereksiz yere değmekten kaçınma olasılığı. */
  readonly superDodge: number;
  /** Balon farkındalığı 0–1: şut değerlendirmesinde balonu vurma bonusunun oranı. */
  readonly powerUpAwareness: number;
}

export const AI_PROFILES: Readonly<Record<AiDifficulty, AiProfile>> = {
  easy: {
    reactionMs: 330,
    reactionJitterMs: 70,
    predictionError: 0.2,
    decisionIntervalMs: 250,
    predictionIntervalMs: 210,
    aggression: 0.25,
    superUseRate: 0.2,
    aimErrorPx: 45,
    kickHesitation: 0.4,
    shotSelectivity: 0,
    distraction: 0.15,
    kickTimingError: 2,
    mirageReadChance: 0.34,
    superDodge: 0.25,
    powerUpAwareness: 0,
  },
  medium: {
    reactionMs: 220,
    reactionJitterMs: 45,
    predictionError: 0.1,
    decisionIntervalMs: 150,
    predictionIntervalMs: 130,
    aggression: 0.55,
    superUseRate: 0.55,
    aimErrorPx: 20,
    kickHesitation: 0.15,
    shotSelectivity: 0.35,
    distraction: 0.05,
    kickTimingError: 1,
    mirageReadChance: 0.45,
    superDodge: 0.6,
    powerUpAwareness: 0.6,
  },
  hard: {
    reactionMs: 150,
    reactionJitterMs: 25,
    predictionError: 0.04,
    decisionIntervalMs: 80,
    predictionIntervalMs: 70,
    aggression: 0.8,
    superUseRate: 0.95,
    aimErrorPx: 8,
    kickHesitation: 0.03,
    shotSelectivity: 0.7,
    distraction: 0,
    kickTimingError: 0.3,
    mirageReadChance: 0.6,
    superDodge: 0.9,
    powerUpAwareness: 1,
  },
};

/**
 * Yapay zekânın zorluktan bağımsız ayarları (geometri, davranış eşikleri, sıkışma önleme).
 * Uzunluklar kanonik çerçevede verilir: AI kendini hep "sol kaleyi savunan, sağa hücum eden"
 * oyuncu olarak görür; P2 için dünya aynalanır.
 */
export const AI = {
  /** Yörünge tahmininin ufku (sn). */
  predictionHorizonSeconds: 1.5,
  /**
   * Şut değerlendirmesinde vuruş sonrası topun izlendiği süre (sn). Sert şutun rakip duvarından
   * sekip kendi kaleye dönmesini de görecek kadar uzun.
   */
  shotHorizonSeconds: 2,
  /** Desteklenen en uzun reaksiyon gecikmesi (algı geçmişi tamponu), ms. */
  maxReactionMs: 600,
  /** Algılanan top hızı bir adımda bundan fazla sıçrarsa (çarpışma) tahmin hemen yenilenir. */
  eventSpeedChange: 140,
  /** Periyodik yenilemede tahmin hatası bu oranla küçülür (top yaklaştıkça kestirim iyileşir). */
  noiseDecayPerRefresh: 0.6,
  /** Karar aralığına eklenen rastgele sapma (adım). */
  decisionJitterSteps: 1,
  /**
   * Bir çarpışma (şut, sekme) algılanınca sıradaki karar `decisionIntervalMs × bu oran`
   * içinde verilir: olaylara daha çabuk ama yine zorluğa bağlı gecikmeyle tepki.
   */
  eventDecisionFactor: 0.4,
  /** Dalgın bir karar bu kadar ertelenir (sn); art arda iki dalgınlık olmaz. */
  distractionSeconds: 0.15,
  /** Debug katmanında tahmin edilen yörüngenin kaç adımda bir çizileceği. */
  debugTrajectoryStride: 3,
  movement: {
    /** Hedefe bu mesafeden yakınsa durur (px). */
    deadzonePx: 7,
    /** Hedefe varış süresi kestiriminde ivmelenme payı (sn). */
    accelLagSeconds: 0.06,
  },
  kick: {
    /** Yerdeki topa şut için topun arkasında durulacak mesafe (merkezden merkeze, px). */
    behindBallPx: 50,
    /** Topun yerden şuta uygun sayılması için merkezinin en küçük y'si. */
    groundBallMinY: 540,
    /** Şut tuşuna, temas en geç bu kadar adım sonra gerçekleşecekse basılır. */
    maxContactTicks: 3,
    /** Acil değilse, savrulma bu fazın altında topa değecekse (zayıf şut) beklenir. */
    minSwingFactor: 0.45,
    /** Seçici AI iyi şut beklerken en çok bu kadar sabreder (sn). */
    shotPatienceSeconds: 0.45,
    /** Rakip topa bu kadar yakınsa şut acildir (px). */
    pressureDistancePx: 170,
    /** Top kendi kalesine bu kadar yakınsa şut acildir (px, kale çizgisinden). */
    dangerZonePx: 330,
    /** Şut değerlendirmesinde rakibe bu kadar yaklaşan top "bloke" sayılır (px). */
    blockMarginPx: 4,
    blockCheckSeconds: 0.4,
    /** Tereddüt süresi (sn). */
    hesitationSeconds: 0.22,
    /** Bu kadar adım fırsat görülmezse bir sonraki fırsat "yeni" sayılır. */
    newOpportunityGapTicks: 12,
    /** Top bana bundan hızlı geliyorsa (px/sn) vole acildir. */
    incomingSpeed: 250,
    /** Yer vuruşu hedefinde nişan sapmasının kullanılan oranı (top yakınında küçük sapma). */
    aimErrorScale: 0.35,
    /** Seçicilik eşiği = shotSelectivity × bu katsayı (şut puanı 0–1). */
    selectivityScale: 0.85,
    /** Şut puanı: rakibe çarpacak şut / gol değilse taban + mesafe katkısı. */
    blockedScore: 0.1,
    progressBase: 0.3,
    progressScale: 0.4,
    /** Sekip kendi kaleye dönecek şutun puanı (negatif = asla vurma). */
    ownGoalScore: -1,
  },
  header: {
    /** Kafa merkezinden topa temas yönünün yataydan açısı (rad): hücumda ileri, savunmada yukarı. */
    attackAngle: 0.35,
    defendAngle: 0.75,
    /** Bu yükseklikten (px) az zıplama gerektiren toplar yerden oynanır. */
    minRise: 22,
    maxRise: 152,
    /** Kafa planı en çok bu kadar ileriye yapılır (sn). */
    maxLeadSeconds: 1.0,
    /** Zıplama anı bu kadar adım içindeyse plan kilitlenir (titreme olmasın). */
    commitTicks: 3,
    /** Kafa planı en erken bu kadar adım sonrasına yapılır. */
    minLeadTicks: 2,
    /** Zıplama tuşu temastan sonra bu kadar adım daha basılı tutulur. */
    holdExtraTicks: 3,
    /** Planlanan zıplama anı bu kadar adım kaçarsa plan iptal edilir. */
    lateToleranceTicks: 2,
    /** Kafa hedefinde nişan sapmasının kullanılan oranı. */
    aimErrorScale: 0.3,
    /** Kale ağzında kafa ile üst direğin alt yüzü arasında bırakılan pay (px). */
    crossbarClearancePx: 4,
    /** Zıplama anında oyuncu planlanan noktadan bundan uzaksa (px) kafa iptal edilir. */
    jumpPositionTolerancePx: 40,
  },
  defend: {
    /** Kale çizgisinin önündeki bekleme noktası (px). */
    guardOffsetPx: 62,
    /** Bekleme noktası topa doğru bu oranla kayar. */
    guardBallFactor: 0.22,
    /** Arkada kalan alçak topun üstünden zıplamak için yatay mesafe (px). */
    hopTriggerPx: 85,
    /** Sıçrayıştan sonra topun ne kadar gerisine inilecek (px). */
    hopLandingPx: 70,
    /** Sıçrayış yüksekliği seçilirken topun bu kadar adım içindeki en yüksek noktasına bakılır. */
    hopLookTicks: 14,
    /** Gövdenin altı ile topun üstü arasında bırakılan pay (px). */
    hopMarginPx: 10,
    /** Top bu yükseklikten (merkez y) aşağıdaysa üstünden atlanmalı. */
    hopBallMinY: 470,
    /** Top oyuncunun bu kadar gerisindeyse "arkada" sayılır (px). */
    behindMarginPx: 14,
    /** Top şimdi ve bu kadar sn sonra da gerideyse "arkada" sayılır. */
    behindLookaheadSeconds: 0.3,
    /** Arkadaki topun üstünden atlayıp gerisine geçmenin ek süresi (sn). */
    hopPenaltySeconds: 0.35,
  },
  position: {
    /** Bekleme konumu: kale çizgisinden taban uzaklık + topa doğru kayma oranı (agresiflikle artar). */
    basePx: 90,
    ballFactorMin: 0.15,
    ballFactorMax: 0.42,
    /** Bekleme konumu topun en az bu kadar gerisinde kalır (px). */
    minBehindBallPx: 140,
  },
  utility: {
    /** Mod değişimi için yeni modun en az bu kadar daha yüksek puan alması gerekir. */
    hysteresis: 0.06,
    /** Top rakip kale çizgisine bu mesafeden yakınsa hücum puanına fırsat bonusu eklenir. */
    goalChanceZonePx: 360,
    goalChance: 0.35,
    /**
     * Düello: iki oyuncu da topa bu kadar yakın zamanlarda (sn) ulaşacaksa ve top sahanın
     * `contestMinBallXRatio`'dan ilerisindeyse, hücum puanından contestPenalty × (1 − agresiflik)
     * düşülür: temkinli AI savunmada bekler. Rastgele bir sabır süresinden sonra ceza kalkar
     * (iki temkinli AI topun başında sonsuza dek beklemesin).
     */
    contestSeconds: 0.25,
    contestPenalty: 0.5,
    contestMinBallXRatio: 0.35,
    contestPatienceMin: 0.6,
    contestPatienceMax: 1.6,
    /**
     * Sahipsiz top: bundan yavaş (px/sn) top, bölüm başında rakip en az `looseBallOpponentPx`
     * uzaktaysa, rastgele [min, max] sn beklendikten sonra hücum puanına `looseBallBonus` ekler.
     */
    looseBallSpeed: 90,
    looseBallOpponentPx: 160,
    looseBallDelayMin: 0.3,
    looseBallDelayMax: 1.2,
    looseBallBonus: 0.5,
    position: 0.3,
    threat: 1.25,
    /** Tehdit uzaktaysa (ufkun sonunda) puan bu oranda azalır. */
    threatDecay: 0.3,
    /** Savunma puanı çarpanı = base − aggression × agresiflik. */
    defendScaleBase: 1.1,
    defendScaleAggression: 0.4,
    behind: 0.8,
    opponentAdvantage: 0.35,
    attackBase: 0.5,
    attackAggression: 0.45,
    /** Rakip topa bu kadar (sn) önce ulaşacaksa "rakip avantajlı" sayılır. */
    advantageSeconds: 0.15,
    /**
     * Rakip avantajlıyken hücum puanından düşülen en büyük değer; rakip `advantageFullSeconds`
     * kadar önce ulaşacaksa tamamı düşülür (hiçbir seviye topa koşmaz, pozisyonda kalır).
     */
    advantagePenalty: 0.6,
    advantageFullSeconds: 0.5,
  },
  super: {
    /** Süper, vuruşa en çok bu kadar kala hazırlanır (sn). */
    maxLeadSeconds: 0.6,
    /**
     * Süper tipine göre kullanım koşulları: topun rakip kale çizgisine uzaklığı [min, max] (px)
     * ve isteğe bağlı rakip koşulları:
     * - `opponentAhead`: rakip topla kale arasında (Buz, Işınlanma, Kasırga, Dev Top bunu sever).
     * - `opponentOffLinePx`: rakip kendi kale çizgisinden en az bu kadar uzakta (Gökkuşağı).
     * - `opponentNearPx`: rakip topa en çok bu kadar yakın (Sarsıntı).
     */
    byType: {
      fire: { minDistancePx: 200, maxDistancePx: 900 },
      ice: { minDistancePx: 150, maxDistancePx: 820, opponentAhead: true },
      zigzag: { minDistancePx: 220, maxDistancePx: 880 },
      teleport: { minDistancePx: 480, maxDistancePx: 1050, opponentAhead: true },
      giant: { minDistancePx: 120, maxDistancePx: 620, opponentAhead: true },
      tornado: { minDistancePx: 150, maxDistancePx: 800, opponentAhead: true },
      rainbow: { minDistancePx: 420, maxDistancePx: 1150, opponentOffLinePx: 230 },
      magnet: { minDistancePx: 200, maxDistancePx: 920 },
      mirage: { minDistancePx: 300, maxDistancePx: 950 },
      quake: { minDistancePx: 150, maxDistancePx: 780, opponentNearPx: 520 },
    },
    /** Şu an vuracaksa: süperli şutun puanı normal şutunkinden en az bu kadar düşükse kullanma. */
    worseThanNormalMargin: 0.15,
    /**
     * Rakibin topa çarpınca etkisi olan süperi (rakibe çarpacak) şut değerlendirmesinde "bloke"
     * sayılmaz, bu puanı alır: Buz dondurur, Ateş savurur, Kasırga iter.
     */
    hitOpponentScore: { ice: 0.55, fire: 0.35, tornado: 0.3 },
  },
  /** Rakibin süperine karşı savunma. */
  superDefense: {
    /** Rakip süper hazırken bekleme konumunun kaleye uzaklığı bu oranla kısalır (daha derin). */
    deeperFactor: 0.55,
    /** Tehlikeli süper topun bana değip değmeyeceğine bu kadar adım ileri bakılır. */
    dodgeLookTicks: 20,
    /** Temas mesafesine eklenen pay (px). */
    dodgeMarginPx: 8,
    /** Kaçarken zıplama tuşunun basılı tutulduğu süre (sn). */
    dodgeJumpSeconds: 0.25,
  },
  /** Güçlendiriciler. */
  powerUp: {
    /** Şut balonu patlatacaksa (gol değilse) puana eklenen en büyük bonus. */
    balloonShotBonus: 0.35,
    /** Çift zıplama: havada, tepeye yakınken (dikey hız bundan büyükse) ve top başın üstündeyse. */
    doubleJumpMinVy: -150,
    doubleJumpLookTicks: 12,
    doubleJumpReachPx: 70,
  },
  /** Kendi kalesine gol önleme refleksi: kale tarafındaki topa önden çarpmamak için fren. */
  safety: {
    /** Bu kadar adım ileriye bakılır. */
    lookTicks: 10,
    /** Top oyuncunun en az bu kadar gerisindeyse (kale tarafında) sayılır (px). */
    goalSideMarginPx: 8,
    /** Temas mesafesine eklenen pay (px). */
    contactMarginPx: 6,
  },
  /** AI'ın kendi sıkışma algısı ve kaçış davranışı. */
  stuck: {
    /** Yön tuşuna basılıyken yerdeki oyuncu bundan yavaşsa bir şeye dayanıyordur (px/sn). */
    pushMinSpeed: 45,
    pushSeconds: 0.6,
    /** İtişme süresi sınırı her kaçıştan sonra bu aralıkta rastgele bir çarpanla değişir. */
    pushPatienceMin: 0.7,
    pushPatienceMax: 1.5,
    /** Direğin ya da rakibin kafasının üstünde durma ("yükseltide yerde") süresi sınırı. */
    elevatedSeconds: 0.25,
    /** Ayakta duruşun bu kadar üstünde "yerde" olan oyuncu bir şeyin üstündedir (px). */
    elevatedMarginPx: 36,
    /** Top kafanın üstünde bu süreden uzun taşınırsa silkelenir. */
    ballOnHeadSeconds: 0.8,
    ballOnHeadDx: 30,
    ballOnHeadGapPx: 6,
    ballOnHeadMaxVy: 80,
    /** Yavaş top yakındayken (px) oyuncu bu süre boyunca yerinden kıpırdamazsa kaçış. */
    idleSeconds: 1.2,
    idleRadiusPx: 170,
    idleTravelPx: 6,
    idleBallMaxSpeed: 60,
    /** Kaçış hareketinin süresi ve zıplamanın basılı tutulduğu süre (sn). */
    escapeSeconds: 0.45,
    escapeJumpSeconds: 0.25,
    cooldownSeconds: 1.0,
    /** Duvara bu kadar yakın itişmede kaçış yönü sahanın ortasıdır (px). */
    wallMarginPx: 40,
    /** İtişmede geri çekilme (aksi hâlde zıplayıp üstünden geçme) olasılığı. */
    backOffChance: 0.6,
    /** "Donup kalma" kaçışında ileri gitme ve zıplama olasılıkları. */
    forwardChance: 0.6,
    idleJumpChance: 0.5,
  },
  /** Simülasyon raporundaki bağımsız sıkışma gözlemcisi (StuckMonitor) eşikleri. */
  monitor: {
    /** Top bu süre boyunca bu yarıçapın dışına çıkmazsa "donmuş top". */
    ballFrozenSeconds: 3,
    ballFrozenRadiusPx: 12,
    /** Oyuncular temas hâlinde ve ikisi de yavaşsa "kilitlenme". */
    lockedSeconds: 2,
    lockedSpeed: 40,
    lockedGapPx: 3,
    /** Yön tuşuna basan oyuncu bu süre boyunca bu kadar bile ilerleyemezse "sıkışmış oyuncu" (azami hızın ~%3ü). */
    pinnedSeconds: 2,
    pinnedTravelPx: 30,
    /** Oyuncu kale üstünde bu süreden uzun durursa. */
    crossbarSeconds: 2,
    /** Top bir oyuncunun kafasında bu süreden uzun taşınırsa. */
    carriedSeconds: 3,
    /** Topa bu süre boyunca kimse dokunmazsa ("top unutuldu"). */
    untouchedSeconds: 10,
  },
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
  ui: {
    debugToggle: 'F1',
    /** Duraklat / devam (herhangi biri). */
    pause: ['Escape', 'KeyP'],
    /** Menülerde gezinme ve seçim. */
    menuUp: ['ArrowUp', 'KeyW'],
    menuDown: ['ArrowDown', 'KeyS'],
    menuConfirm: ['Enter', 'NumpadEnter', 'Space'],
    /** Alt menüden geri dönüş. */
    menuBack: ['Escape', 'Backspace'],
  },
} as const;

/**
 * Geliştirici kısayolları (URL parametreleri). Örn. `?scene=match&debug=1&duration=10`
 * menüyü atlayıp doğrudan 10 sn'lik maça girer ve debug katmanını açık başlatır.
 */
export const DEV = {
  sceneParam: 'scene',
  matchSceneValue: 'match',
  debugParam: 'debug',
  debugOnValue: '1',
  /** `?duration=10` → maç süresi 10 sn (altın golü ve maç sonunu hızlı denemek için). */
  durationParam: 'duration',
  /** `?debug=1` iken Phaser oyun nesnesi bu adla `window`'a konur (tarayıcı testleri). */
  globalGameName: '__KAFA_GAME__',
  /** `?cpu=easy|medium|hard` → CPU'ya karşı maç (P2 yapay zekâ). */
  cpuParam: 'cpu',
  /** `?cpu1=easy|medium|hard` → P1 de yapay zekâ (AI vs AI izleme). */
  cpu1Param: 'cpu1',
  /** `?seed=N` → yapay zekânın rastgelelik tohumu (aynı tohum + aynı girdiler → aynı maç). */
  seedParam: 'seed',
  /** `?c1=kor&c2=kaya` → karakterler (seçim ekranını atlar). */
  char1Param: 'c1',
  char2Param: 'c2',
} as const;

/** Kalıcı kayıt (localStorage) anahtarları. */
export const STORAGE = {
  prefix: 'kafa-kafaya.',
  keys: {
    language: 'language',
    aiDifficulty: 'aiDifficulty',
    /** Tercih edilen karakterler (P1, 2 oyunculu modda P2). */
    character1: 'character1',
    character2: 'character2',
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
    yRatio: 0.32,
    fontSizePx: 104,
    strokePx: 12,
    shadowOffsetPx: 6,
    shadowBlurPx: 0,
    shadowColor: '#000000',
    /** Başlığın hafif "nefes alma" ölçek animasyonu. */
    pulseScale: 1.04,
    pulseMs: 1200,
  },
  /** Ana menü seçenekleri (dikey liste). */
  items: {
    yRatio: 0.53,
    fontSizePx: 38,
    spacingPx: 58,
    strokePx: 6,
  },
  navHint: { yRatio: 0.85, fontSizePx: 18, alpha: 0.75 },
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
  /** Alt menü başlığı ("Zorluk seç"): ilk öğenin bu kadar üstünde. */
  submenuTitle: { offsetY: 58, fontSizePx: 24, strokePx: 5, color: '#ffd23f' },
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
  /** Süper hazır olan oyuncunun kafasının çevresinde nabız atan halka. */
  superGlow: { color: 0xffd23f, lineWidthPx: 5, extraRadius: 7, pulseHz: 4, alphaMin: 0.35 },
  /** Göz: bakış yönünü gösterir. Konum kafa yarıçapına oranla. */
  eye: { color: 0x1a1a1a, radius: 5, forwardRatio: 0.5, upRatio: 0.15 },
  ball: { fill: 0xf2f2f2, spoke: 0x1a1a1a, spokePx: 3 },
} as const;

/** Maç ekranı: skor çubuğu, saat, gol/altın gol yazıları. */
export const HUD = {
  fontFamily: '"Arial Black", "Segoe UI", Arial, sans-serif',
  depth: 100,
  /** Oyuncu kimlik renkleri: HUD'daki isimler ve kafaların üstündeki P1/P2 etiketleri. */
  playerColors: ['#ffb347', '#6ec6ff'],
  /** Üstteki yarı saydam skor çubuğu: ekranın üst kenarından sarkar; `y` metinlerin ortası. */
  bar: { y: 40, bottomY: 80, halfWidth: 400, radius: 18, color: 0x000000, alpha: 0.4 },
  clock: {
    fontSizePx: 40,
    strokePx: 6,
    color: '#ffffff',
    /** Son saniyelerde (MATCH.finalCountdownSeconds) renk ve her saniye nabız. */
    warningColor: '#ff4b4b',
    pulseScale: 1.35,
    pulseMs: 380,
    /** Altın golde saatin yerinde yazı. */
    goldenFontSizePx: 24,
  },
  score: { offsetX: 118, fontSizePx: 54, strokePx: 6, popScale: 1.6, popMs: 320 },
  name: { offsetX: 178, fontSizePx: 22, strokePx: 4 },
  goalBanner: {
    yRatio: 0.24,
    fontSizePx: 120,
    strokePx: 10,
    popScale: 1.25,
    popMs: 180,
    holdMs: 1100,
    fadeMs: 350,
    subtitleFontSizePx: 34,
    subtitleStrokePx: 6,
    /** Alt yazının ana yazıya göre dikey uzaklığı. */
    subtitleOffsetY: 82,
  },
  /** Gol anında ekran sarsıntısı. */
  goalShake: { durationMs: 220, intensity: 0.006 },
  hint: { marginPx: 10, fontSizePx: 16, alpha: 0.55 },
  /** Oyuncu etiketi (P1/P2) kafanın üstünden bu kadar yukarıda. */
  label: { gapPx: 8, fontSizePx: 18, strokePx: 4, alpha: 0.95 },
  /**
   * Güç barları: isimlerin altında, skor çubuğunun içinde; sahanın ortasına doğru dolar.
   * Doluyken altın rengi, süper hazırken yanıp söner ve "SÜPER!" yazar.
   */
  power: {
    offsetX: 178,
    y: 64,
    width: 150,
    height: 8,
    radius: 4,
    backColor: 0x000000,
    backAlpha: 0.55,
    fillColor: 0x9ad7ff,
    fullColor: 0xffd23f,
    armedColors: [0xffffff, 0xff8a00],
    /** Süper hazırken yanıp sönme sıklığı (Hz). */
    blinkHz: 6,
    labelGapPx: 8,
    labelFontSizePx: 14,
    labelStrokePx: 3,
  },
  /**
   * Etkin güçlendiriciler: skor çubuğunun altında, oyuncunun tarafında (kazanan oyuncu) ikon +
   * geri sayım halkası. İkonlar ortadan dışa doğru dizilir.
   */
  powerUps: {
    y: 108,
    firstOffsetX: 120,
    spacingPx: 46,
    radius: 18,
    backColor: 0x000000,
    backAlpha: 0.55,
    ringWidthPx: 4,
    ringBackColor: 0xffffff,
    ringBackAlpha: 0.2,
    /** Son saniyelerde ikon yanıp söner. */
    warnSeconds: 2,
    blinkHz: 5,
  },
  /** Güçlendirici kazanılınca oyuncunun üstünde yükselen yazı. */
  popText: { fontSizePx: 22, strokePx: 4, risePx: 60, durationMs: 1100, offsetY: 30 },
  /** Süper atılınca kısa yazı (tip adı). */
  superText: { fontSizePx: 30, strokePx: 5, risePx: 40, durationMs: 900 },
  /** Santra dizilişinde ışınlanmayı gizleyen kısa kararıp açılma (ms). */
  kickoffFadeMs: 220,
  /** Maç bittikten sonra sonuç ekranı açılana kadar geçen süre (sn, simülasyon). */
  endScreenDelaySeconds: 1.4,
  /** Ana menüye dönüşte kararma (ms). */
  exitFadeMs: 200,
} as const;

/**
 * Süper şut ve güçlendirici görselleri (basit vektör çizimler). Renkler Phaser sayısal biçimi.
 */
export const FX = {
  /** Topun son konumları (iz) için tutulan kare sayısı. */
  trailLength: 10,
  trailAlpha: 0.45,
  superColors: {
    fire: 0xff6a00,
    ice: 0x9be8ff,
    zigzag: 0xfff04a,
    teleport: 0xb07cff,
    giant: 0xb5a58c,
    tornado: 0xc8ffe4,
    rainbow: 0xff5fa8,
    magnet: 0xff3b4a,
    mirage: 0xffc2e0,
    quake: 0xc98a45,
  },
  /** Gökkuşağı izi renkleri (sırayla). */
  rainbowColors: [0xff4b4b, 0xffa53b, 0xfff04a, 0x5be37a, 0x4bb8ff, 0xa875ff],
  /** Süper topun çevresindeki parlama halkası. */
  glowExtraPx: 6,
  glowWidthPx: 4,
  /** Kasırga: topun çevresinde dönen yaylar. */
  tornadoArcs: 3,
  tornadoSpinHz: 3,
  /** Işınlanma: görünmez topun yerinde silik pırıltı. */
  teleportShimmerAlpha: 0.18,
  teleportBurstMs: 260,
  teleportBurstRadius: 46,
  /** Serap yanılsamaları gerçek topla aynı görünür (ayırt edilemez). */
  /** Donmuş oyuncu üstüne buz örtüsü. */
  frozenColor: 0xbff4ff,
  frozenAlpha: 0.55,
  /** Zıplama kilidi (Sarsıntı): ayak altında toz çizgisi. */
  jumpLockColor: 0xc98a45,
  /** Sarsıntı ekran sarsıntısı. */
  quakeShake: { durationMs: 320, intensity: 0.009 },
  /** Süper atılınca kısa kamera parlaması (ms). */
  superFlashMs: 90,
  /** Parlama rengi (0–255). */
  superFlashRgb: [255, 255, 255],
  balloon: {
    stringPx: 34,
    stringColor: 0xffffff,
    fill: 0xffffff,
    fillAlpha: 0.92,
    outline: 0x1a1a1a,
    /** Söneceğine yakın yanıp söner (sn). */
    warnSeconds: 2,
    blinkHz: 6,
    iconScale: 0.62,
  },
  /** Güçlendirici ikon renkleri. */
  powerUpColors: {
    bigHead: 0xffb347,
    shrinkOpponent: 0xff5fa8,
    speed: 0x5be37a,
    growGoal: 0x4bb8ff,
    freezeOpponent: 0x9be8ff,
    doubleJump: 0xffd23f,
  },
  iconLineWidthPx: 3,
} as const;

/** Karakter seçim ekranı. */
export const SELECT = {
  titleY: 54,
  titleFontSizePx: 44,
  grid: { columns: 5, cellW: 150, cellH: 128, gapPx: 16, top: 104 },
  /** Kartın içindeki kafa çizimi (yarıçap kafa puanıyla büyür). */
  headY: 50,
  headScale: 0.95,
  nameY: 106,
  nameFontSizePx: 20,
  cardColor: 0x0b1340,
  cardAlpha: 0.75,
  cardRadius: 14,
  cursorWidthPx: 5,
  /** İki imleç aynı karttaysa P2 çerçevesi bu kadar içeride. */
  cursorInsetPx: 7,
  panel: { y: 386, width: 560, height: 284, marginX: 50, radius: 18, alpha: 0.82 },
  statBar: { width: 200, height: 12, gapY: 26, labelWidth: 110, segments: 5 },
  fontSizePx: 20,
  descFontSizePx: 17,
  hintY: 690,
  hintFontSizePx: 17,
  /** İki taraf hazır olunca maça geçmeden önceki bekleme (ms). */
  startDelayMs: 450,
  /** Paneldeki karakter adının başlık boyutuna oranı. */
  panelNameScale: 0.7,
  /** İstatistiklerin panel üstünden uzaklığı (yazı satırı cinsinden). */
  statTopLines: 3,
  /** Süper açıklamasının süper adından uzaklığı (yazı satırı cinsinden). */
  descGapLines: 1.4,
  /** Hazır olmayan imlecin saydamlığı; boş istatistik bölmesinin saydamlığı. */
  cursorIdleAlpha: 0.85,
  emptyStatAlpha: 0.6,
  /** Kart çizimi: gövdenin kafaya göre konumu ve boyutu (kafa yarıçapına oran). */
  iconBodyOffset: 1.25,
  iconBodyScale: 0.6,
} as const;

/** Duraklatma ve maç sonu kaplamaları (yarı saydam perde + panel + dikey menü). */
export const OVERLAY = {
  depth: 500,
  dimColor: 0x000000,
  dimAlpha: 0.55,
  panel: {
    width: 640,
    paddingPx: 36,
    radius: 24,
    color: 0x0b1340,
    alpha: 0.97,
    strokeColor: 0xffd23f,
    strokePx: 4,
  },
  title: { fontSizePx: 50, strokePx: 8, lineHeightPx: 70 },
  line: { fontSizePx: 30, lineHeightPx: 46, color: '#ffffff' },
  /** Başlık/satırlar ile menü arasındaki boşluk. */
  gapPx: 22,
  items: {
    fontSizePx: 34,
    spacingPx: 60,
    strokePx: 6,
    color: '#ffffff',
    selectedColor: '#ffd23f',
    selectedScale: 1.12,
  },
  hint: { fontSizePx: 16, alpha: 0.6, lineHeightPx: 36 },
} as const;

/** Web Audio ile sentezlenen sesler. Süreler saniye, frekanslar Hz. */
export const AUDIO = {
  masterVolume: 0.5,
  /**
   * Düdük: yüksek frekanslı bir ton + hızlı frekans titreşimi (bilyeli düdüğün "trrr"si).
   * Desenler [çalma, sessizlik, çalma, …] süreleridir.
   */
  whistle: {
    frequency: 2750,
    trillHz: 32,
    trillDepthHz: 170,
    volume: 0.22,
    attack: 0.012,
    release: 0.05,
    patterns: {
      kickoff: [0.32],
      goldenGoal: [0.22, 0.1, 0.55],
      fullTime: [0.3, 0.14, 0.3, 0.14, 0.85],
    },
  },
  /** Vuruş: kısa, alçak "tok" (frekansı düşen sinüs). */
  kick: { startHz: 180, endHz: 60, duration: 0.09, volume: 0.35 },
  /** Süper: yükselen testere dişi "vuuş". */
  super: { startHz: 220, endHz: 880, duration: 0.28, volume: 0.16 },
  /** Balon patlaması: kısa gürültü patlaması. */
  pop: { duration: 0.07, volume: 0.3, filterHz: 1800 },
  /** Donma: iki yüksek ton (çınlama). */
  freeze: { tones: [1320, 1760], toneDuration: 0.09, volume: 0.12 },
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
    /** Yapay zekânın tahmin ettiği top yörüngesi ve hedef konumu. */
    aiTrajectory: 0x00e5ff,
    aiTarget: 0xffffff,
  },
  /** AI hedef işaretinin yüksekliği (px, zeminden yukarı). */
  aiTargetMarkerPx: 24,
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
