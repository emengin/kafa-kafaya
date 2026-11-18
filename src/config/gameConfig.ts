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
    duration: 0.8,
    endsOnBounce: true,
    freezeSeconds: 1.1,
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
    exitSpeedScale: 0.68,
  },
  /** Dev Top: top büyür ve ağırlaşır (kaleciyi iter); süre sonunda küçülür. */
  giant: {
    speedMultiplier: 1.12,
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
    maxPushSpeed: 400,
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
    duration: 1.6,
    endsOnBounce: true,
    steerAccel: 1800,
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
    jumpLockSeconds: 0.8,
    groundRestitution: 0.78,
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

/**
 * Simülasyonun ses/efekt için ürettiği "his" olaylarının eşikleri (oyun durumunu etkilemez;
 * yalnızca hangi temasın olay sayılacağını belirler).
 */
export const SIM_EVENTS = {
  /** Top bir saha yüzeyine en az bu yaklaşma hızıyla çarparsa `ballImpact` (px/sn). */
  ballImpactMinSpeed: 70,
  /** Oyuncu yere en az bu düşüş hızıyla inerse `land` (px/sn). */
  landMinSpeed: 160,
  /** Top oyuncuya (şut/kafa dışında) en az bu hızla değerse `ballTouch` (px/sn). */
  touchMinSpeed: 120,
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
 * Gamepad düğmelerinin sanal tuş kodları (Faz 6). Gamepad yoklayıcısı düğme değişimlerini bu
 * kodlarla `KeyTracker`a "tuş basıldı/bırakıldı" olarak düşürür; menüler ve oyun girdisi klavyeyle
 * aynı yoldan okur. Slot 1 → P1, slot 2 → P2 (bağlanma sırasıyla).
 */
function padCodes<N extends 1 | 2>(n: N) {
  return {
    left: `Pad${n}Left`,
    right: `Pad${n}Right`,
    up: `Pad${n}Up`,
    down: `Pad${n}Down`,
    a: `Pad${n}A`,
    b: `Pad${n}B`,
    x: `Pad${n}X`,
    y: `Pad${n}Y`,
    lb: `Pad${n}LB`,
    rb: `Pad${n}RB`,
    lt: `Pad${n}LT`,
    rt: `Pad${n}RT`,
    start: `Pad${n}Start`,
    back: `Pad${n}Back`,
  } as const;
}

export const PAD_CODES = [padCodes(1), padCodes(2)] as const;
export type PadButton = keyof (typeof PAD_CODES)[0];

/** Dokunmatik butonların sanal tuş kodları (Faz 6). */
export const TOUCH_CODES = {
  left: 'TouchLeft',
  right: 'TouchRight',
  jump: 'TouchJump',
  kick: 'TouchKick',
  super: 'TouchSuper',
  pause: 'TouchPause',
  reset: 'TouchReset',
  fill: 'TouchFill',
} as const;

const [PAD1, PAD2] = PAD_CODES;

/** Gamepad oyun eşlemesi: sol çubuk/d-pad hareket, A zıpla, X/B şut, RB/RT süper. */
function padBindings(p: (typeof PAD_CODES)[number]) {
  return {
    left: p.left,
    right: p.right,
    jump: p.a,
    kick: [p.x, p.b],
    super: [p.rb, p.rt],
  } as const;
}

/**
 * Klavye eşlemeleri. KeyboardEvent.code değerleri kullanılır; böylece sol/sağ Shift
 * ayrılabilir ve klavye düzeninden (TR-Q, F, US) bağımsız fiziksel tuşlar okunur.
 * Gamepad ve dokunmatik butonlar sanal kodlarla aynı tabloya bağlanır.
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
  /** Gamepad oyun eşlemesi: [slot 1 → P1, slot 2 → P2]. */
  pads: [padBindings(PAD1), padBindings(PAD2)],
  /** Dokunmatik butonlar (her zaman P1). */
  touch: {
    left: TOUCH_CODES.left,
    right: TOUCH_CODES.right,
    jump: TOUCH_CODES.jump,
    kick: TOUCH_CODES.kick,
    super: TOUCH_CODES.super,
  },
  /** Arayüz tuşları (oyun girdisi değildir, tekrar kaydına girmez). */
  ui: {
    debugToggle: 'F1',
    /** Duraklat / devam (herhangi biri). */
    pause: ['Escape', 'KeyP', PAD1.start, PAD2.start, TOUCH_CODES.pause],
    /** Menülerde gezinme ve seçim. */
    menuUp: ['ArrowUp', 'KeyW', PAD1.up, PAD2.up],
    menuDown: ['ArrowDown', 'KeyS', PAD1.down, PAD2.down],
    menuConfirm: ['Enter', 'NumpadEnter', 'Space', PAD1.a, PAD2.a, PAD1.start, PAD2.start],
    /** Ayarlanabilir menü öğeleri (ses düzeyi, zorluk…) ve yardım sayfaları. */
    menuLeft: ['ArrowLeft', 'KeyA', PAD1.left, PAD2.left, PAD1.lb, PAD2.lb],
    menuRight: ['ArrowRight', 'KeyD', PAD1.right, PAD2.right, PAD1.rb, PAD2.rb],
    /** Alt menüden geri dönüş. */
    menuBack: ['Escape', 'Backspace', PAD1.b, PAD2.b],
  },
  /** Antrenman kısayolları: topu sıfırla, süper barını doldur, kukla rakibi aç/kapa. */
  training: {
    resetBall: ['KeyR', PAD1.y, PAD2.y, TOUCH_CODES.reset],
    fillSuper: ['KeyF', PAD1.lb, PAD2.lb, TOUCH_CODES.fill],
    toggleDummy: ['KeyT', PAD1.back, PAD2.back],
  },
} as const;

/**
 * Gamepad API (Faz 6): standart düzen ("standard" mapping) düğme ve eksen sırası, çubuk ölü
 * bölgesi (histerezisli: basma eşiği bırakma eşiğinden yüksek → titreşim yok), en fazla 2 kol.
 */
export const GAMEPAD = {
  maxPads: 2,
  buttons: {
    a: 0,
    b: 1,
    x: 2,
    y: 3,
    lb: 4,
    rb: 5,
    lt: 6,
    rt: 7,
    back: 8,
    start: 9,
    up: 12,
    down: 13,
    left: 14,
    right: 15,
  },
  axes: { x: 0, y: 1 },
  /** Çubuk: bu değeri aşınca yön basılı, `stickRelease` altına inince bırakılır. */
  stickPress: 0.5,
  stickRelease: 0.35,
  /** Analog tetik/düğme değerinin basılı sayıldığı eşik. */
  buttonPress: 0.5,
} as const;

/**
 * Dokunmatik kontroller (Faz 6): mantıksal koordinatlarda yarı saydam daire butonlar. Sol:
 * ← →; sağ: Zıpla, Şut, Süper; üst sol: duraklat (antrenmanda topu sıfırla, barı doldur).
 * Çoklu dokunuş: her parmak ayrı izlenir; parmak butonlar arasında kaydırılabilir.
 */
export const TOUCH = {
  depth: 400,
  alpha: 0.3,
  pressedAlpha: 0.62,
  /** Dokunuşun buton yarıçapından bu kadar dışarıda da sayılması (px). */
  hitSlackPx: 16,
  fillColor: 0xffffff,
  pressedColor: 0xffd23f,
  strokeColor: 0x0b1340,
  strokePx: 4,
  labelFontSizePx: 17,
  /** "Barı doldur" butonundaki şimşek (yarıçapa oranlı köşe noktaları). */
  boltIcon: [
    [0.12, -0.72],
    [-0.38, 0.1],
    [-0.04, 0.1],
    [-0.16, 0.72],
    [0.38, -0.12],
    [0.04, -0.12],
  ],
  buttons: {
    left: { x: 108, y: 612, r: 62 },
    right: { x: 250, y: 612, r: 62 },
    jump: { x: 1022, y: 628, r: 62 },
    kick: { x: 1168, y: 560, r: 68 },
    super: { x: 1170, y: 408, r: 50 },
    pause: { x: 50, y: 50, r: 32 },
    reset: { x: 126, y: 50, r: 32 },
    fill: { x: 202, y: 50, r: 32 },
  },
} as const;

/** Oyun ayarları (Faz 6): seçenekler ve varsayılanlar; `localStorage`'da saklanır. */
export const SETTINGS = {
  /** Maç süresi seçenekleri (sn). */
  matchDurations: [60, 90, 120],
  defaults: {
    difficulty: 'medium',
    matchSeconds: 90,
    screenShake: true,
    replays: true,
    colorblind: false,
    effects: 'high',
  },
  /** Efekt yoğunluğu seçenekleri (Faz 7, erişilebilirlik). */
  effectLevels: ['low', 'medium', 'high'],
} as const;

/**
 * Erişilebilirlik (Faz 7). Efekt yoğunluğu: parçacık sayısı, ekran parlamaları (ışığa duyarlılık)
 * ve gol yakınlaşması ölçeklenir. Renk körü modu: oyuncu kimlik renkleri renk körlüğünün her
 * türünde ayırt edilen Okabe–Ito çiftine döner (turuncu ↔ mavi), oyuncuların altına kimlik halkası
 * ve etiketlere şekil (▲ / ●) eklenir — renk tek ipucu olmaz.
 */
export const ACCESSIBILITY = {
  effects: {
    low: { particles: 0.3, flashes: 0, zoom: 0 },
    medium: { particles: 0.65, flashes: 0.5, zoom: 0.5 },
    high: { particles: 1, flashes: 1, zoom: 1 },
  },
  /** Okabe–Ito: turuncu (#E69F00) ve gök mavisi (#56B4E9). */
  colorblindPlayerColors: ['#e69f00', '#56b4e9'],
  /** Kafa üstü etiketlerinde renk körü modunda kimlik şekilleri. */
  colorblindMarks: ['▲', '●'],
  /** Oyuncunun ayağının altındaki kimlik halkası (elips). */
  ring: { widthRatio: 1.3, heightPx: 14, lineWidthPx: 4, alpha: 0.9 },
} as const;

/** İlerleme kaydı (Faz 6): istatistik sayaçlarının üst sınırı (bozuk/şişkin veriye karşı). */
export const PROGRESS = {
  maxCounter: 1_000_000_000,
} as const;

/**
 * Turnuva (Faz 6): 8 kişilik eleme (çeyrek final → yarı final → final). Rakip zorluğu her turda
 * artar: ayarlardaki zorluğun sırasına tur kayması eklenir (Orta → Kolay, Orta, Zor).
 */
export const TOURNAMENT = {
  entrants: 8,
  rounds: 3,
  difficultyOffsets: [-1, 0, 1],
  /** Sahnede oynanmayan (AI vs AI) maçların sonucu: kazananın gol aralığı (kaybeden daha az). */
  aiScore: { winnerMin: 2, winnerMax: 7 },
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
  /** `?debug=1` iken ses sistemi (motor, efektler, kalabalık, müzik) bu adla `window`'a konur. */
  globalAudioName: '__KAFA_AUDIO__',
  /** `?cpu=easy|medium|hard` → CPU'ya karşı maç (P2 yapay zekâ). */
  cpuParam: 'cpu',
  /** `?cpu1=easy|medium|hard` → P1 de yapay zekâ (AI vs AI izleme). */
  cpu1Param: 'cpu1',
  /** `?seed=N` → yapay zekânın rastgelelik tohumu (aynı tohum + aynı girdiler → aynı maç). */
  seedParam: 'seed',
  /** `?c1=kor&c2=kaya` → karakterler (seçim ekranını atlar). */
  char1Param: 'c1',
  char2Param: 'c2',
  /** `?unlock=all` → tüm karakterler açık (kayda yazılmaz). */
  unlockParam: 'unlock',
  unlockAllValue: 'all',
  /** `?touch=1` → dokunmatik butonlar masaüstünde de görünür (test). */
  touchParam: 'touch',
} as const;

/**
 * Gol tekrarı (Faz 7): son `bufferSeconds` saniye halka tamponda (her `keyframeSteps` adımda bir
 * tam durum + her adımın girdileri). Golden sonra kutlama bitince tekrar oynatılır: golden en
 * çok `leadSeconds` önce başlar (santradan önceye gitmez), golden `afterSeconds` sonra biter.
 * Tampon, golden önceki 4 sn'yi kutlama süresince (~1,3 sn simülasyon) de tutacak kadar uzun.
 */
export const REPLAY = {
  bufferSeconds: 6,
  keyframeSteps: 15,
  leadSeconds: 4,
  /** Golden önce en az bu kadar görüntü yoksa tekrar oynatılmaz (sn). */
  minLeadSeconds: 1,
  afterSeconds: 0.9,
  /** Oynatma hızı (ağır çekim) ve golün çevresinde daha da yavaş. */
  speed: 0.55,
  goalSpeed: 0.3,
  goalSlowSeconds: 0.6,
  /** Tekrar kamerası: topu ortalayan yakın plan, hafif eğik. */
  zoom: 1.3,
  followRate: 6,
  /** Kamera odağı top ile zeminin biraz üstü arasında (oyuncular da kadrajda kalsın). */
  groundBias: 0.6,
  groundLiftPx: 150,
  tiltRad: -0.018,
  /** Sinema şeritleri (px) ve "TEKRAR" etiketi. */
  letterboxPx: 40,
  letterboxAlpha: 0.85,
  badge: { x: 32, y: 128, fontSizePx: 24, dotRadius: 9, blinkHz: 1.5 },
  skip: { x: 1150, y: 676, width: 176, height: 40, fontSizePx: 18 },
  fadeMs: 200,
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
    /** Ses düzeyleri (0–1). */
    volumeMaster: 'volumeMaster',
    volumeSfx: 'volumeSfx',
    volumeMusic: 'volumeMusic',
    /** Faz 6: oyun ayarları (zorluk, maç süresi, ekran sarsıntısı) — JSON. */
    settings: 'settings',
    /** Faz 6: açılan karakterler ve istatistikler — JSON. */
    progress: 'progress',
    /** Faz 6: süren turnuva (yoksa kayıt silinir) — JSON. */
    tournament: 'tournament',
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
    yRatio: 0.2,
    fontSizePx: 104,
    strokePx: 13,
    /** Başlığın hafif "nefes alma" ölçek animasyonu. */
    pulseScale: 1.035,
    pulseMs: 1300,
  },
  /** Ana menü butonları (dikey liste, 6 öğe). */
  items: {
    yRatio: 0.385,
    fontSizePx: 28,
    spacingPx: 62,
    strokePx: 5,
    buttonWidth: 380,
  },
  /** Menü arayüzü bu derinlikte: arka plandaki demo maçın (ve vinyetinin) üstünde. */
  uiDepth: 60,
  /**
   * Arka planda AI vs AI demo maçı (Faz 6): süresiz, rastgele iki karakter. Okunaklılık için
   * hafif koyu perde; kalabalık uğultusu demo maçın atak tehlikesini izler (ölçekli).
   */
  demo: {
    difficulty: 'hard',
    dimColor: 0x070b26,
    dimAlpha: 0.4,
    crowdScale: 0.6,
  },
  /** Sol altta istatistik hapı (maç · galibiyet · gol · kupa). */
  stats: { marginPx: 14, fontSizePx: 15, padX: 16, height: 30, alpha: 0.9 },
  /** Ayarlar alt menüsü (9 öğe): büyük başlık gizlenir, sıkışık buton listesi. */
  settings: {
    titleY: 54,
    titleFontSizePx: 38,
    top: 112,
    spacingPx: 45,
    fontSizePx: 19,
    strokePx: 4,
    buttonWidth: 640,
    buttonHeight: 39,
  },
  navHint: { yRatio: 0.935, fontSizePx: 16, alpha: 0.85 },
  footer: {
    fontSizePx: 13,
    marginPx: 10,
    alpha: 0.6,
  },
  /** Menüdeki top — sağdaki karakterin kafasında seker (sabit adımlı döngünün görsel sağlaması). */
  demoBall: {
    /** Yalnızca bu dekoratif top için; oyun fiziği BALL.gravity kullanır. */
    gravity: 1800,
    /** Kafadan sekme hızı ve menüden çıkarken topa verilen hız (px/sn). */
    relaunchSpeed: 820,
    kickSpeed: 1600,
    /** Dönüş hızı (radyan/sn). */
    spinSpeed: 3,
  },
  clickFlash: { durationMs: 150, red: 255, green: 255, blue: 255 },
  /** Menüden maça geçerken kararma süresi (ms). */
  startFadeMs: 250,
  /** Alt menü başlığı ("Zorluk seç"): ilk öğenin bu kadar üstünde. */
  submenuTitle: { offsetY: 62, fontSizePx: 22, strokePx: 4, color: '#ffd23f' },
} as const;

/** Maç ekranı: skor çubuğu, saat, gol/altın gol yazıları. */
export const HUD = {
  fontFamily: '"Arial Black", "Segoe UI", Arial, sans-serif',
  depth: 100,
  /** Oyuncu kimlik renkleri: HUD'daki isimler ve kafaların üstündeki P1/P2 etiketleri. */
  playerColors: ['#ffb347', '#6ec6ff'],
  /**
   * Skor tabelası (Faz 5): üstte ortada gölgeli panel — iki yanda canlı yüz ifadeli portreler,
   * isimler ve güç barları, ortada iki skor kutusu ve saat hapı. x değerleri ortaya göre.
   */
  board: {
    y: 54,
    width: 760,
    height: 92,
    portraitX: 334,
    portraitR: 31,
    nameX: 288,
    nameY: 38,
    scoreX: 84,
    scoreW: 70,
    scoreH: 64,
    clockW: 112,
    clockH: 50,
  },
  clock: {
    fontSizePx: 34,
    strokePx: 5,
    color: '#ffffff',
    /** Son saniyelerde (MATCH.finalCountdownSeconds) renk ve her saniye nabız. */
    warningColor: '#ff5a5a',
    pulseScale: 1.3,
    pulseMs: 380,
    /** Altın golde saatin yerinde yazı. */
    goldenFontSizePx: 20,
  },
  /** Skor değişiminde eski rakam yukarı kayıp söner, yeni rakam yukarıdan sekerek iner. */
  score: { fontSizePx: 50, strokePx: 6, dropPx: 34, popScale: 1.45, popMs: 420, flashAlpha: 0.75 },
  name: { fontSizePx: 20, strokePx: 4 },
  goalBanner: {
    yRatio: 0.26,
    fontSizePx: 132,
    strokePx: 12,
    popScale: 1.4,
    popMs: 260,
    holdMs: 1100,
    fadeMs: 350,
    subtitleFontSizePx: 30,
    subtitleStrokePx: 5,
    /** Alt yazının ana yazıya göre dikey uzaklığı ve hap boyutu. */
    subtitleOffsetY: 96,
    subtitlePadX: 28,
    subtitleH: 48,
    /** Arkadaki dönen ışınlar: boyut (px), saydamlık, dönüş (rad/sn). */
    raysSize: 560,
    raysAlpha: 0.5,
    raysSpin: 0.6,
    wobbleRad: 0.06,
  },
  /** Gol anında ekran sarsıntısı. */
  goalShake: { durationMs: 220, intensity: 0.006 },
  hint: { marginPx: 12, fontSizePx: 15, alpha: 0.8, padX: 18, height: 30 },
  /** Oyuncu etiketi (P1/P2) kafanın üstünden bu kadar yukarıda. */
  label: { gapPx: 8, fontSizePx: 18, strokePx: 4, alpha: 0.95 },
  /**
   * Güç barları: isimlerin altında; sahanın ortasına doğru dolar. Doluyken altın (üzerinde
   * kayan parıltı), süper hazırken karakter renginde nabız atar ve süper adını yazar.
   */
  power: {
    y: 64,
    width: 168,
    height: 12,
    backColor: 0x050a26,
    backAlpha: 0.85,
    fillColor: 0x63c7ff,
    fillLight: 0xb8ecff,
    fullColor: 0xffd23f,
    fullLight: 0xfff3b0,
    /** Parıltının bar boyunca geçiş süresi (sn) ve genişliği (px). */
    shineSeconds: 1.1,
    shinePx: 26,
    pulseHz: 5,
    labelFontSizePx: 13,
    labelStrokePx: 3,
  },
  /**
   * Etkin güçlendiriciler: skor çubuğunun altında, oyuncunun tarafında (kazanan oyuncu) ikon +
   * geri sayım halkası. İkonlar ortadan dışa doğru dizilir.
   */
  powerUps: {
    y: 132,
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
  titleY: 44,
  titleFontSizePx: 40,
  /** Stadyum arka planını koyulaştıran perde. */
  dimColor: 0x070b26,
  dimAlpha: 0.55,
  /** Kart ve paneldeki karakterlerin ölçeği. */
  cardRigScale: 0.5,
  panelRigScale: 0.95,
  grid: { columns: 5, cellW: 140, cellH: 116, gapPx: 14, top: 80 },
  /** Kartın içindeki kafa çizimi (yarıçap kafa puanıyla büyür). */
  headY: 50,
  headScale: 0.95,
  nameY: 96,
  nameFontSizePx: 18,
  cardColor: 0x0b1340,
  cardAlpha: 0.75,
  cardRadius: 14,
  cursorWidthPx: 5,
  /** İki imleç aynı karttaysa P2 çerçevesi bu kadar içeride. */
  cursorInsetPx: 7,
  panel: {
    y: 340,
    width: 590,
    height: 334,
    marginX: 30,
    radius: 18,
    alpha: 0.82,
    rigInset: 112,
    textInset: 232,
    /** Büyük karakterin kafa merkezi (panel yüksekliğine oran). */
    headYRatio: 0.29,
  },
  statBar: { width: 190, height: 12, gapY: 24, labelWidth: 104, segments: 5 },
  fontSizePx: 20,
  descFontSizePx: 15,
  /**
   * Süper şut önizlemesi (Faz 6): panelin dış sütununda, karakterin altında küçük saha. Gerçek
   * GameSim'de (rakipsiz) karakterin süperli şutu bir kez oynatılıp kaydedilir, burada döngüde
   * izletilir. `region` sahanın gösterilen kısmı (mantıksal px).
   */
  preview: {
    insetX: 14,
    top: 206,
    width: 204,
    height: 114,
    radius: 12,
    region: { left: 180, right: 1280, top: 40, bottom: 640 },
    recordSeconds: 1.9,
    holdSeconds: 0.7,
    trailSteps: 26,
    trailWidthPx: 3,
    ballMinPx: 3,
    groundColor: 0x3aa04a,
    lineColor: 0xffffff,
    labelFontSizePx: 11,
    labelAlpha: 0.75,
  },
  /** Kilitli kart: koyu perde + kilit + yazı. */
  locked: { dimAlpha: 0.66, iconSize: 34, fontSizePx: 13, shakePx: 8, shakeMs: 60 },
  /** Sol üstte "Geri" butonu (dokunmatik/fare). */
  back: { x: 82, y: 44, width: 132, height: 42, fontSizePx: 18 },
  hintY: 700,
  hintFontSizePx: 16,
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

/** "Nasıl Oynanır" ve kontrol şeması paneli (Faz 6; ana menüde, demo maçın üstünde). */
export const HELP = {
  headingY: 54,
  headingFontSizePx: 40,
  panel: { top: 98, bottom: 648, width: 1100, radius: 24 },
  pageTitleFontSizePx: 30,
  pageTitleOffsetY: 40,
  pageIndexFontSizePx: 18,
  bodyTop: 178,
  bodyFontSizePx: 18,
  smallFontSizePx: 15,
  lineGapPx: 8,
  padX: 56,
  /** Süper listesi ve güçlendiriciler iki sütun. */
  columnGapPx: 40,
  rowHeightPx: 46,
  iconRadius: 18,
  /** Kontrol tablosu: ilk sütun (eylem) genişliği ve satır yüksekliği. */
  table: { firstColWidth: 170, rowHeightPx: 40, headerFontSizePx: 17, cellFontSizePx: 15 },
  footerOffsetY: 38,
  arrowFontSizePx: 34,
  arrowInsetX: 70,
} as const;

/** Turnuva eleme ağacı ekranı (Faz 6). */
export const BRACKET = {
  /** Kalabalık arka planı koyulaştıran perde (ağaç okunaklı olsun). */
  dimAlpha: 0.72,
  titleY: 44,
  titleFontSizePx: 42,
  roundY: 96,
  roundFontSizePx: 24,
  infoY: 128,
  infoFontSizePx: 17,
  box: { width: 176, height: 52, radius: 14, portraitR: 18, portraitX: 28, nameX: 54 },
  nameFontSizePx: 17,
  scoreFontSizePx: 17,
  /** Sütun merkezleri: çeyrek final, yarı final, final (sol taraf; sağ taraf aynalanır). */
  columnsX: [118, 322, 530],
  /** Çeyrek final kutularının y merkezleri (her yarıda 4 kutu). */
  quarterY: [196, 262, 398, 464],
  lineWidthPx: 3,
  lineColor: 0xffffff,
  lineAlpha: 0.3,
  winColor: 0xffd23f,
  eliminatedAlpha: 0.38,
  trophy: { y: 252, size: 74 },
  vsFontSizePx: 18,
  menu: { top: 544, spacingPx: 54, buttonWidth: 340, fontSizePx: 22 },
  /** Yeni sonuçların ağaçta belirmesi (ms) ve şampiyonlukta kupa ekranına geçiş (ms). */
  revealMs: 520,
  championDelayMs: 1500,
  bannerY: 300,
  bannerFontSizePx: 72,
} as const;

/** Kupa (şampiyonluk) ekranı (Faz 6). */
export const TROPHY = {
  titleY: 78,
  titleFontSizePx: 86,
  cup: { x: 640, y: 318, width: 220, height: 270 },
  champion: { x: 300, rigScale: 1.25, jumpEverySeconds: 1.1 },
  unlock: { x: 1018, y: 340, width: 360, height: 318, rigScale: 0.95, headYRatio: 0.42 },
  unlockFontSizePx: 22,
  nameFontSizePx: 34,
  menu: { top: 600, spacingPx: 56, buttonWidth: 340, fontSizePx: 24 },
  confettiEverySeconds: 0.35,
  fireworksEverySeconds: 0.9,
} as const;

/** Platform (Faz 6): dikey ekran uyarısı, tam ekran düğmesi, PWA. */
export const PLATFORM = {
  /** Uygulama simgesi ve tema renkleri (PWA bildirimi, adres çubuğu). */
  themeColor: '#0b1340',
  backgroundColor: '#070b26',
  /**
   * Yön/boyut değişiminden bu kadar sonra ölçek yeniden hesaplanır (ms). Phaser'ın ölçek yöneticisi
   * telefon döndürülünce bir adım geride kalabiliyor (tuval eski yönün boyutunda kalıyor).
   */
  scaleRefreshMs: [120, 600],
} as const;

/** Web Audio ile sentezlenen sesler. Süreler saniye, frekanslar Hz. */
export const AUDIO = {
  /** Varsayılan ses düzeyleri (0–1; ayarlar menüsünden %10 adımlarla değişir, kaydedilir). */
  defaults: { master: 0.8, sfx: 0.9, music: 0.6 },
  volumeStep: 0.1,
  /** Veri yolu kazançları (düzey 1'deyken): ana çıkış ve müziğin efektlere göre payı. */
  masterGain: 0.62,
  musicGain: 0.42,
  crowdGain: 0.75,
  /** Kırpılmayı önleyen sıkıştırıcı. */
  compressor: { threshold: -16, knee: 12, ratio: 5, attack: 0.004, release: 0.22 },
  /** Aynı anda çalabilecek en fazla tek seferlik ses (düşük güçlü cihaz koruması). */
  maxVoices: 28,
  /** Aynı sesin iki çalınışı arasındaki en kısa süre (sn): sekme sesleri üst üste binmesin. */
  minGap: { bounce: 0.05, touch: 0.06, header: 0.08, land: 0.07, net: 0.12, post: 0.08 },
  /** Gürültü tamponlarının uzunluğu (sn). */
  noiseSeconds: 2,
  crowdNoiseSeconds: 4,
  /**
   * Düdük: yüksek frekanslı bir ton + hızlı frekans titreşimi (bilyeli düdüğün "trrr"si).
   * Desenler [çalma, sessizlik, çalma, …] süreleridir.
   */
  whistle: {
    frequency: 2750,
    trillHz: 32,
    trillDepthHz: 170,
    volume: 0.2,
    attack: 0.012,
    release: 0.05,
    patterns: {
      kickoff: [0.32],
      goldenGoal: [0.22, 0.1, 0.55],
      fullTime: [0.3, 0.14, 0.3, 0.14, 0.85],
    },
  },
  /** Şut: güce göre ton — sert vuruş daha yüksek perdeden başlar, daha uzun ve parlak. */
  kick: {
    thumpFrom: [130, 230],
    thumpTo: [52, 70],
    duration: [0.1, 0.17],
    volume: [0.45, 0.85],
    clickHz: [1400, 3800],
    clickVolume: [0.15, 0.4],
    clickDuration: 0.035,
    /** Bu güçten sonra "vınn" (havayı yaran top) eklenir. */
    whooshFrom: 0.65,
    whooshVolume: 0.16,
    whooshDuration: 0.22,
  },
  header: { from: 520, to: 210, duration: 0.11, volume: 0.42, clickHz: 1100, clickVolume: 0.18 },
  touch: { from: 260, to: 130, duration: 0.07, volume: 0.22 },
  /** Direk: metalik çınlama — uyumsuz kısmi tonlar (çan benzeri). */
  post: {
    base: 560,
    partials: [1, 2.76, 5.4, 8.93],
    decays: [1.3, 0.8, 0.45, 0.25],
    gains: [0.42, 0.26, 0.16, 0.08],
    clickHz: 3200,
    clickVolume: 0.3,
  },
  bounce: { from: 120, to: 55, duration: 0.09, volume: 0.32, noiseHz: 500 },
  wall: { from: 180, to: 80, duration: 0.07, volume: 0.22, noiseHz: 900 },
  net: { fromHz: 3200, toHz: 1100, duration: 0.42, volume: 0.32, q: 0.8 },
  /** Hız → ses düzeyi: bu hızda tam düzey (px/sn). */
  impactFullSpeed: 1500,
  jump: { from: 290, to: 540, duration: 0.09, volume: 0.13, airFrom: 520, airTo: 1180 },
  land: { from: 95, to: 45, duration: 0.1, volume: 0.32, noiseHz: 650 },
  /** Balon patlaması ve güçlendirici çınlaması (yükselen arpej). */
  pop: { duration: 0.07, volume: 0.32, filterHz: 1800 },
  powerUp: { notes: [72, 76, 79, 84], gap: 0.055, decay: 0.22, volume: 0.15 },
  freeze: { tones: [1320, 1760, 2350], toneDuration: 0.08, volume: 0.12 },
  /** Süper hazır: yükselen parıltı. */
  superArmed: { from: 300, to: 2600, duration: 0.45, volume: 0.12, chime: 88 },
  /** Süper şutlar: tipine özel sentez (Sfx.superShot). */
  superVolume: 0.3,
  /** Süper şut seslerinin notaları (MIDI) ve Serap'ın ayrışma oranları. */
  superNotes: {
    ice: [96, 93, 89, 86, 84],
    rainbow: [72, 74, 76, 79, 81, 84, 86, 88],
    mirageSplit: [-0.18, 0, 0.22],
  },
  menu: {
    moveHz: 880,
    moveVolume: 0.08,
    selectFrom: 660,
    selectTo: 990,
    selectVolume: 0.12,
    duration: 0.06,
  },
  countdown: { hz: 1250, finalHz: 1650, duration: 0.05, volume: 0.13 },
  horn: { notes: [57, 61, 64], duration: 1.25, volume: 0.15, cutoff: 1800, detune: 7 },
} as const;

/**
 * Faz 5 — kalabalık sesi: filtrelenmiş gürültüyle sürekli uğultu (yavaş dalgalanan), tehlikeli
 * atakta yükselen "kükreme", golde tezahürat patlaması (ıslıklar ve alkış), direkte "ooo".
 */
export const CROWD = {
  murmur: {
    centerHz: 520,
    q: 0.55,
    lowpassHz: 1900,
    base: 0.16,
    perIntensity: 0.22,
    hzPerIntensity: 520,
  },
  /** Yavaş genlik dalgalanması (Hz) ve derinliği. */
  swell: { hz: 0.21, depth: 0.25, slowHz: 0.067, slowDepth: 0.18 },
  roar: { centerHz: 1350, q: 0.7, perIntensity: 0.32, exponent: 2 },
  /** Gol tezahüratı: yükselme, tutma, sönme (sn) ve tepe düzeyi. */
  cheer: {
    attack: 0.12,
    hold: 1.6,
    release: 2.8,
    peak: 0.85,
    applauseHz: 2600,
    applauseQ: 0.9,
    applause: 0.35,
  },
  whistles: { count: 7, spread: 2.2, fromHz: 2100, toHz: 3300, duration: 0.35, volume: 0.06 },
  ooh: { formants: [310, 820], q: 6, attack: 0.25, decay: 1.1, peak: 0.55, glide: 0.86 },
  /** Atak tehlikesi: kaleye bu mesafede tam (px), hız katkısı ve yumuşatma (1/sn). */
  danger: { rangePx: 460, refSpeed: 900, speedWeight: 0.5, rate: 2.2, heightPx: 320 },
  /** Kalabalık sesinin değişim zaman sabiti (sn). */
  smoothing: 0.25,
} as const;

/** Faz 5 — prosedürel müzik (döngüsel; menü ve maç parçası). */
export const MUSIC = {
  /** Müzik kuramı: akor aralıkları (yarım ton), diziler ve akor darbelerinin adımları. */
  theory: {
    intervals: {
      maj: [0, 4, 7],
      min: [0, 3, 7],
      maj7: [0, 4, 7, 11],
      m7: [0, 3, 7, 10],
      dom7: [0, 4, 7, 10],
    },
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    stabSteps: [0, 6, 10],
  },
  lookaheadSeconds: 0.14,
  tickMs: 25,
  /** Parça geçişinde sönme (sn); golde müziğin kısılması (oran, sn). */
  fadeSeconds: 0.7,
  duck: { level: 0.35, seconds: 2.4 },
  /** Gecikme (yankı) efekti. */
  delay: { seconds: 0.27, feedback: 0.32, wet: 0.22 },
  tracks: {
    menu: {
      bpm: 100,
      root: 60,
      mode: 'major',
      /** [kök (yarım ton), akor tipi] — I–vi–IV–V. */
      progression: [
        [0, 'maj7'],
        [9, 'm7'],
        [5, 'maj7'],
        [7, 'dom7'],
      ],
      kick: 'x.....x...x.....',
      snare: '....x.......x...',
      hat: 'x.x.x.x.x.x.x.xo',
      bass: '0.....0...2.0...',
      arp: '0.1.2.3.2.1.0.1.',
      pad: true,
      lead: 0.45,
      loopBars: 8,
      gain: 0.9,
    },
    match: {
      bpm: 128,
      root: 57,
      mode: 'minor',
      progression: [
        [0, 'min'],
        [8, 'maj'],
        [3, 'maj'],
        [10, 'maj'],
      ],
      kick: 'x...x...x...x...',
      snare: '....x.......x..o',
      hat: '.xox.xox.xox.xxx',
      bass: '0.0r..0.0.2r..0.',
      arp: '0120120120120121',
      pad: false,
      lead: 0.3,
      loopBars: 8,
      gain: 0.75,
    },
  },
  /** Enstrüman sesleri. */
  voices: {
    kick: { from: 150, to: 42, duration: 0.22, volume: 0.55 },
    snare: { hz: 1800, duration: 0.14, volume: 0.28, toneHz: 190 },
    hat: { hz: 7500, duration: 0.035, volume: 0.09, openDuration: 0.16 },
    bass: { cutoff: 520, duration: 0.85, volume: 0.32 },
    pad: { cutoff: 1300, attack: 0.35, volume: 0.07, detune: 9 },
    arp: { cutoff: 2600, duration: 0.6, volume: 0.07 },
    lead: { cutoff: 3200, volume: 0.075, vibratoHz: 5.5, vibratoCents: 12 },
  },
} as const;

/**
 * Faz 5 — oyun hissi ("juice"): hit-stop, ekran sarsıntısı, gol zoom'u, vuruş flaşı.
 * Süreler ms (aksi belirtilmedikçe); sarsıntı "travma" modeliyle (0–1) birikir ve söner.
 */
export const JUICE = {
  hitStop: {
    /** Bu hızın üstündeki şut/kafa sert vuruş sayılır (px/sn). */
    hardHitSpeed: 1150,
    /** Sert vuruşta hit-stop: hızla `minMs` → `maxMs` arası. */
    minMs: 40,
    maxMs: 55,
    /** Süper atış ve gol anında hit-stop. */
    superMs: 60,
    goalMs: 60,
  },
  shake: {
    /** Travma 1'deyken en büyük kayma (px) ve dönüş (rad). Etki travmanın karesiyle ölçeklenir. */
    maxOffsetPx: 16,
    maxAngleRad: 0.012,
    /** Travmanın sönme hızı (1/sn). */
    decayPerSecond: 1.6,
    /** Gürültü frekansı (Hz). */
    frequencyHz: 22,
    /** Olay başına eklenen travma. */
    hardHit: 0.32,
    superLaunch: 0.45,
    goal: 0.75,
    post: 0.3,
    quake: 0.8,
    giantBounce: 0.35,
    heavyLanding: 0.18,
  },
  zoom: {
    /** Gol anında dünya katmanının yakınlaşması ve süreleri. */
    goal: 1.1,
    /** Yakınlaşmanın odağı: kale ağzı ile ekran ortası arasında (0 = kale, 1 = orta). */
    focusTowardCenter: 0.35,
    /** Yakınlaşma/uzaklaşma hızları (1/sn, üstel yaklaşma). */
    inRate: 7,
    outRate: 3.5,
    /** Golden bu kadar gerçek saniye sonra uzaklaşmaya başlar. */
    holdSeconds: 1.3,
  },
  flash: {
    /** Vuruş flaşı: temas noktasında büyüyüp sönen parlak yıldız. */
    durationMs: 140,
    minScale: 0.35,
    maxScale: 1.25,
    /** Sert vuruşta tüm ekranda kısa beyaz parlama (ms, 0–255 renk). */
    screenMs: 60,
    screenRgb: [255, 255, 255],
  },
} as const;

/**
 * Faz 5 — karakter animasyonu: squash & stretch, eğilme, koşu sallanması, şut savrulması,
 * göz kırpma ve ifadeler.
 */
export const ANIM = {
  squash: {
    /** Yay sabiti ve sönümü (1/sn²; 1/sn). */
    stiffness: 260,
    damping: 15,
    /** Zıplamada esneme ve inişte basılma darbeleri (ölçek/sn). */
    jumpImpulse: 4.2,
    landImpulse: 6.5,
    /** İniş darbesinin tam etki gösterdiği düşüş hızı (px/sn). */
    landReferenceSpeed: 1300,
    /** Havada dikey hızla esneme (ölçek / (px/sn)) ve üst sınırı. */
    airStretchPerSpeed: 0.00009,
    maxAirStretch: 0.1,
    /** Esneme/basılmada genişliğin korunma oranı (hacim korunumu hissi). */
    widthPreserve: 0.7,
    /** Ölçek sınırları. */
    min: -0.3,
    max: 0.3,
  },
  run: {
    /** Koşu adımı uzunluğu (px) ve dikey sallanma genliği (px, tam hızda). */
    stridePx: 46,
    bobPx: 4,
    /** Adım vuruşunda hafif basılma (ölçek). */
    stepSquash: 0.04,
    /** Bu hız oranının altında koşu animasyonu yok. */
    minSpeedRatio: 0.15,
  },
  lean: {
    /** Tam hızda öne eğilme (rad) ve yaklaşma hızı (1/sn). */
    maxRad: 0.12,
    rate: 12,
    /** Şut savrulmasında gövdenin geriye yaslanması (rad). */
    kickRad: 0.22,
  },
  /** Ayakkabı ayak açısıyla döner (oran). */
  shoeRotation: 0.85,
  blink: {
    /** Göz kırpmaları arası (sn) ve kırpma süresi (sn); arada bir çift kırpma. */
    minInterval: 1.6,
    maxInterval: 4.8,
    duration: 0.13,
    doubleChance: 0.2,
  },
  eyes: {
    /** Gözbebeğinin kayabileceği en uzak mesafe (göz yarıçapına oran) ve takip hızı (1/sn). */
    maxPupilOffset: 0.42,
    followRate: 14,
    /** Topa bu mesafeden yakınken gözler biraz büyür (px). */
    alertDistancePx: 220,
  },
  expressions: {
    /** Gol atınca sevinç, gol yiyince üzüntü (sn). */
    happySeconds: 2.6,
    sadSeconds: 2.6,
    /** Süper etkisi ya da sert top çarpması (sn). */
    shockedSeconds: 0.7,
    /** Sert top çarpmasında şaşkınlık eşiği (px/sn). */
    shockedImpactSpeed: 900,
    /** Donunca titreme genliği (px) ve frekansı (Hz). */
    shiverPx: 1.6,
    shiverHz: 28,
    /** Sevinçte zıplama (px) ve frekansı (Hz) — yalnızca yüz/baş, fizik değil. */
    cheerBobPx: 3,
    cheerHz: 5,
  },
} as const;

/**
 * Faz 5 — stadyum (kodla üretilen dokular). y değerleri mantıksal piksel; sahne 1280×720.
 * Arka plan ekran kenarlarından `bleedPx` taşar: sarsıntı ve zoom kenarda boşluk göstermez.
 */
export const STADIUM = {
  bleedPx: 48,
  sky: {
    bottomY: 330,
    /** [konum 0–1, renk] — alacakaranlık. */
    stops: [
      [0, 0x121845],
      [0.38, 0x2f3486],
      [0.72, 0xb4659c],
      [1, 0xffb27a],
    ],
  },
  sun: { x: 1000, y: 318, radius: 260, color: 0xffd9a8, alpha: 0.55 },
  stars: { count: 54, maxY: 170, minSize: 0.6, maxSize: 1.9, alpha: 0.75, seed: 11 },
  clouds: {
    variants: 4,
    width: 300,
    height: 120,
    light: 0xffeaf4,
    shade: 0x8f78c4,
    seed: 23,
    layers: [
      { count: 4, minY: 64, maxY: 150, minScale: 0.45, maxScale: 0.7, speed: 6, alpha: 0.45 },
      { count: 3, minY: 120, maxY: 220, minScale: 0.8, maxScale: 1.15, speed: 15, alpha: 0.72 },
    ],
  },
  towers: {
    xs: [128, 1152],
    top: 26,
    panelW: 136,
    panelH: 64,
    lampCols: 5,
    lampRows: 3,
    poleW: 14,
    frame: 0x1d2240,
    pole: 0x2b3158,
    lamp: 0xfff8e0,
    glowColor: 0xfff1c8,
    glowScale: 2.6,
    glowAlpha: 0.55,
    /** Golde ışıklar parlar: ek saydamlık ve sönme hızı (1/sn). */
    goalBoost: 0.4,
    boostDecay: 0.8,
    beamAlpha: 0.075,
    beamLength: 700,
    beamWidth: 420,
  },
  roof: {
    y: 226,
    height: 26,
    color: 0x161b33,
    edge: 0x6c7cb8,
    supports: 11,
    supportColor: 0x0e1226,
  },
  stands: {
    top: 252,
    bottom: 522,
    back: 0x1a1f3d,
    seatA: 0x2b3770,
    seatB: 0x253064,
    rowHeight: 36,
    concourseY: 382,
    concourseH: 14,
    concourse: 0x10142c,
    rail: 0x8d9ad0,
    haze: 0x161c4a,
    /** Üst tribün daha uzakta: puslu. */
    upperHaze: 0.32,
    lowerHaze: 0.14,
  },
  crowd: {
    /** Sıraların taban y'leri (arkadan öne) ve ölçekleri (uzaktaki sıra küçük). */
    rows: [
      { y: 290, scale: 0.78, haze: 0.34 },
      { y: 322, scale: 0.82, haze: 0.3 },
      { y: 354, scale: 0.86, haze: 0.26 },
      { y: 418, scale: 0.94, haze: 0.16 },
      { y: 454, scale: 0.98, haze: 0.1 },
      { y: 490, scale: 1, haze: 0.04 },
    ],
    rowHeight: 48,
    spacing: 21,
    jitterPx: 5,
    headR: 7,
    bodyW: 17,
    bodyH: 17,
    /** Ayakta/tezahüratta baş ne kadar yükselir (px). */
    standLift: 7,
    segments: 8,
    /** Kendi tarafında takım rengi giyen taraftar oranı. */
    teamShare: 0.68,
    /** Taraftarın bayrak/atkı taşıma olasılığı (tezahürat dokusunda). */
    scarfChance: 0.35,
    skins: [0xf6d2b8, 0xe8b58e, 0xc98a5a, 0x9a6440, 0x6e4428, 0xf0c7a0],
    hairs: [0x241a12, 0x4a3020, 0x8a5a2b, 0xd9b26a, 0x1a1a1a, 0x9a9a9a],
    neutrals: [0xdedede, 0x3a3f5a, 0x7a7f9a, 0xa8483a, 0x4a7a5a, 0xd9c24a],
    seed: 77,
    /** Boşta hafif kıpırtı; heyecanla genlik ve sıklık artar; tezahüratta zıplama. */
    idleBobPx: 1.2,
    idleHz: 0.9,
    exciteBobPx: 4,
    cheerBobPx: 10,
    cheerHz: 3.1,
    /** Golden sonra tezahürat süresi (sn) ve heyecanın sönme hızı (1/sn). */
    cheerSeconds: 3.6,
    exciteRate: 2.5,
  },
  boards: {
    y: 522,
    height: 36,
    tileWidth: 880,
    speed: 46,
    back: 0x0b0e2a,
    colors: [0xffd23f, 0x5be3ff, 0xff5fa8, 0x7cff8a],
    goalBack: 0xffd23f,
    goalText: 0x1a1240,
    glowAlpha: 0.22,
  },
  field: {
    top: 558,
    vanishY: -1100,
    stripes: 14,
    a: 0x3c9a44,
    b: 0x4aad50,
    far: 0x1f5a35,
    near: 0x1d4a2a,
    line: 0xffffff,
    lineAlpha: 0.78,
    centerRx: 118,
    centerRy: 34,
    boxDepth: 165,
    noiseCount: 900,
    seed: 5,
  },
  vignette: { alpha: 0.5, inner: 0.55 },
} as const;

/** Faz 5 — karakter çizimi (kodla üretilen dokular + her karede çizilen yüz). */
export const CHARACTER_ART = {
  /** Kafa katmanlarının üretildiği yarıçap (px): en büyük kafadan (Büyük Kafa ×1,4) büyük. */
  headBakeRadius: 58,
  /** Gövde ve ayakkabı dokularının çözünürlük çarpanı. */
  bakeScale: 2,
  /** Kontur rengi ve kalınlığı (üretim çözünürlüğünde px). */
  outline: 0x2a1f3d,
  outlinePx: 3.4,
  /** Saç gradyanı (kafa biriminde dikey aralık) ve ton farkları. */
  hairGradient: { top: -170, bottom: 60, lighten: 0.14, darken: -0.24 },
  /** Ekranda yüz çizgilerinin kalınlığı (kafa yarıçapı 36 px iken, px). */
  faceLinePx: 2.2,
  /** Ek (kurdele/tüy) sallanması: genlik (rad), frekans (Hz), hıza göre eğim (rad / (px/sn)). */
  extraSwayRad: 0.18,
  extraSwayHz: 2.2,
  extraSpeedTilt: 0.0006,
  /** Süper hazırken kafanın arkasındaki parlama (kafa yarıçapına oran) ve nabız. */
  glowScale: 3.1,
  glowAlphaMin: 0.35,
  glowAlphaMax: 0.85,
  glowPulseHz: 4,
  /** Donmuş oyuncuyu saran buz bloğu (kafa yarıçapına oran) ve saydamlığı. */
  iceAlpha: 0.78,
  /** Oyuncunun yerdeki gölgesi: en geniş hâli (kafa yarıçapına oran), yükseldikçe küçülür. */
  shadowWidth: 2.2,
  shadowHeight: 0.42,
  shadowAlpha: 0.32,
  /** Gölgenin tamamen küçüldüğü yükseklik (px). */
  shadowFadeHeight: 420,
  /** Kafa üstü etiketi (P1/P2/CPU) ve oku. */
  tag: { gapPx: 14, fontSizePx: 15, padX: 8, padY: 3, alpha: 0.92, arrowPx: 6 },
} as const;

/** Faz 5 — top görseli: gölge, hız izi, hızla uzama ve çarpmada basılma. */
export const BALL_FX = {
  /** Gölge: zeminde en geniş hâli (top yarıçapına oran) ve en yüksekte küçülme. */
  shadowWidth: 2.3,
  shadowHeight: 0.55,
  shadowAlpha: 0.38,
  shadowFadeHeight: 520,
  shadowMinScale: 0.35,
  /** Hız izi: tutulan nokta sayısı, görünmeye başladığı ve tam görünür olduğu hızlar (px/sn). */
  trailPoints: 14,
  trailMinSpeed: 650,
  trailFullSpeed: 1600,
  trailAlpha: 0.32,
  trailColor: 0xffffff,
  /** Santra/ışınlanma: bu mesafeden uzun sıçrama izi sıfırlar (px). */
  trailResetPx: 180,
  /** Hızla uzama (ölçek / (px/sn)) ve üst sınırı. */
  stretchPerSpeed: 0.00008,
  maxStretch: 0.16,
  /** Çarpmada basılma: yay sabiti, sönüm, darbe (ölçek/sn / (px/sn)). */
  squashStiffness: 420,
  squashDamping: 16,
  squashPerSpeed: 0.0045,
  maxSquash: 0.32,
} as const;

/** Faz 5 — süper şut görselleri (parlama, izler, özel çizimler). */
export const SUPER_FX = {
  /** Süper topun arkasındaki parlama (top yarıçapına oran) ve saydamlığı. */
  glowScale: 4.2,
  glowAlpha: 0.75,
  /** İz parçacıklarının saniyedeki sayısı (kalite 2'de; düşük kalitede ölçeklenir). */
  trailRate: 55,
  /** Renkli iz şeridi: nokta sayısı, kalınlık (top yarıçapına oran). */
  ribbonPoints: 16,
  ribbonWidth: 1.1,
  ribbonAlpha: 0.55,
  /** Gökkuşağı şeridinin bant sayısı ve bant kalınlığı (px). */
  rainbowBands: 6,
  rainbowBandPx: 5,
  /** Zikzak: şimşek çizgisinin titreşimi (px) ve kalınlığı. */
  boltJitterPx: 9,
  boltWidthPx: 3,
  /** Mıknatıs: alan çizgilerinin sayısı, uzunluğu (px) ve nabzı (Hz). */
  magnetArcs: 3,
  magnetArcPx: 70,
  magnetPulseHz: 3,
  /** Işınlanma: görünmez topun yerindeki girdap (top yarıçapına oran) ve dönüş (Hz). */
  vortexScale: 1.6,
  vortexHz: 2.5,
  /** Atış anında şok halkası: süre (sn) ve ölçek. */
  launchRingSeconds: 0.45,
  launchRingScale: 2.4,
  /** Atışta ekran rengi parlaması (ms) ve saydamlık. */
  launchFlashMs: 110,
  /** Kaliteye göre iz parçacığı yoğunluğu [düşük, orta, yüksek]. */
  qualityRate: [0.35, 0.65, 1],
} as const;

/**
 * Faz 5 — arayüz stili: tüm paneller, butonlar ve yazılar aynı dili konuşur (yuvarlak köşe,
 * yumuşak gölge, dikey gradyan, ince parlak kenar). Paneller kodla dokuya çizilir.
 */
export const UI_THEME = {
  radius: 18,
  shadow: { offsetY: 6, blur: 16, alpha: 0.5 },
  borderPx: 3,
  /** Üst kenardaki iç parlama (saydamlık). */
  highlightAlpha: 0.22,
  styles: {
    panel: { top: 0x24357f, bottom: 0x0f1747, border: 0x93a8ff, borderAlpha: 0.5 },
    overlay: { top: 0x26378a, bottom: 0x0e1543, border: 0xffd23f, borderAlpha: 1 },
    button: { top: 0x31449a, bottom: 0x1a2462, border: 0x7d93f0, borderAlpha: 0.75 },
    active: { top: 0xffe680, bottom: 0xffae22, border: 0xfff6cf, borderAlpha: 1 },
    dark: { top: 0x161d4a, bottom: 0x0a0f30, border: 0x5a6cc0, borderAlpha: 0.6 },
    card: { top: 0x2a3b8a, bottom: 0x121a52, border: 0x6f86e8, borderAlpha: 0.6 },
  },
  text: {
    stroke: '#0b1340',
    shadow: '#000000',
    shadowOffset: 3,
    shadowBlur: 4,
    /** Seçili butonun yazı rengi (açık zemin üstünde koyu). */
    activeColor: '#3a1e00',
    gold: ['#fff6b8', '#ffd23f', '#ff9a1f'],
  },
  button: { height: 54, padX: 36, minWidth: 300, fontSizePx: 30, selectedScale: 1.06, popMs: 140 },
} as const;

/** Faz 5 — kale ağı dalgalanması (yay ağı). */
export const NET = {
  /** Ağ düğüm aralığı (px). */
  spacingPx: 15,
  /** Düğümün yerine dönme yayı, komşu bağı ve sönüm (1/sn², 1/sn², 1/sn). */
  stiffness: 140,
  coupling: 520,
  damping: 7,
  /** Düğüm başına en büyük sapma (px). */
  maxOffsetPx: 16,
  /** Darbe: etki yarıçapı (px) ve topun hızından aktarılan oran. */
  impulseRadiusPx: 46,
  impulseScale: 0.11,
  /** İçeride hareket eden topun ağı itme oranı (her kare). */
  pushScale: 0.012,
  /** Toplam sapma bunun altına inince ağ durur (çizim atlanır). */
  restEpsilon: 0.02,
  /** Kararlılık için en büyük alt adım (sn). */
  maxSubStepSeconds: 1 / 120,
  /** Çizim: ağ ipi rengi, saydamlığı ve kalınlığı; kalenin içindeki gölge. */
  color: 0xffffff,
  alpha: 0.55,
  lineWidthPx: 1.6,
  interior: 0x0a1020,
  interiorAlpha: 0.42,
  /** Direkler: beyaz, kontur ve gölge tonu. */
  post: 0xf4f6ff,
  postShade: 0xb8c0dc,
  postOutline: 0x2a1f3d,
  postWidthPx: 8,
  /** Golde ağın sarsılması (px/sn) — topun hızına ek. */
  goalKick: 420,
} as const;

/**
 * Faz 5 — parçacıklar (nesne havuzu). Kapasiteler kaliteye göre: [düşük, orta, yüksek].
 * Ön ayarlar: sayı ve aralıklar [min, max]; açı radyan (0 = sağ, −π/2 = yukarı).
 */
export const PARTICLES = {
  capacity: { normal: [140, 260, 420], additive: [100, 200, 320] },
  /** Düşük kalitede patlamalardaki parçacık sayısı çarpanı. */
  countScale: [0.4, 0.7, 1],
  /** Hız yönüne dönen parçacıkların hızla uzama oranı (1 / (px/sn)). */
  stretchPerSpeed: 0.0022,
  /** Konfetinin dönerek düşerken genişlik salınımı (rad oranı). */
  flutterRate: 1.7,
} as const;

/** Parçacık atlasındaki kareler (doku fxArt.ts içinde kodla çizilir). */
export const PARTICLE_FRAME_NAMES = [
  'dot',
  'puff',
  'spark',
  'star',
  'confetti',
  'shard',
  'flake',
  'leaf',
  'ring',
  'blade',
  'rock',
  'heart',
] as const;

export type ParticleFrameName = (typeof PARTICLE_FRAME_NAMES)[number];

/** Bir parçacık patlamasının tanımı. Aralıklar [min, max]; açı radyan (−π/2 = yukarı). */
export interface ParticlePresetDef {
  readonly frame: ParticleFrameName;
  /** Toplamalı karışım (ışık, kıvılcım, alev). */
  readonly additive: boolean;
  readonly count: readonly [number, number];
  readonly speed: readonly [number, number];
  readonly angle: number;
  /** Açının iki yana yayılımı (rad). */
  readonly spread: number;
  readonly life: readonly [number, number];
  readonly size: readonly [number, number];
  /** Ömür sonundaki boy (başlangıca oran). */
  readonly sizeEnd: number;
  readonly gravity: number;
  readonly drag: number;
  readonly spin: readonly [number, number];
  readonly alpha: number;
  readonly alphaEnd: number;
  readonly colors: readonly number[];
  /** Doğum noktasının rastgele yayılımı (px). */
  readonly jitter: number;
  readonly align?: boolean;
  readonly flutter?: boolean;
}

const UP = -Math.PI / 2;
const DOWN = Math.PI / 2;
const ALL = Math.PI;
const CONFETTI_COLORS = [0xff4b6e, 0xffd23f, 0x4bd8ff, 0x7cff8a, 0xb07cff, 0xffffff, 0xff9a3c];
const GRASS = [0x5cc45a, 0x3e9e44, 0x7ad86a, 0x2f8a3a];
const DUST = [0xe9dcc0, 0xd9c7a2, 0xc8b48c];
const FIRE = [0xfff3a0, 0xffa020, 0xff5a10];
const SPARK = [0xffffff, 0xfff1a8, 0xffe070];

/** Parçacık ön ayarları (her süper şutun kendine özel efektleri dahil). */
export const PARTICLE_PRESETS = {
  landDust: {
    frame: 'puff',
    additive: false,
    count: [7, 11],
    speed: [50, 170],
    angle: UP,
    spread: 1.35,
    life: [0.35, 0.65],
    size: [10, 16],
    sizeEnd: 2.3,
    gravity: -40,
    drag: 4.5,
    spin: [-2, 2],
    alpha: 0.6,
    alphaEnd: 0,
    colors: DUST,
    jitter: 10,
  },
  runDust: {
    frame: 'puff',
    additive: false,
    count: [1, 1],
    speed: [20, 60],
    angle: UP,
    spread: 1.1,
    life: [0.3, 0.45],
    size: [6, 9],
    sizeEnd: 2,
    gravity: -20,
    drag: 3,
    spin: [-1, 1],
    alpha: 0.45,
    alphaEnd: 0,
    colors: DUST,
    jitter: 4,
  },
  grass: {
    frame: 'blade',
    additive: false,
    count: [5, 9],
    speed: [140, 330],
    angle: UP,
    spread: 0.85,
    life: [0.4, 0.75],
    size: [12, 18],
    sizeEnd: 0.8,
    gravity: 950,
    drag: 1.2,
    spin: [-14, 14],
    alpha: 1,
    alphaEnd: 0,
    colors: GRASS,
    jitter: 8,
  },
  kickSpark: {
    frame: 'spark',
    additive: true,
    count: [7, 11],
    speed: [320, 720],
    angle: 0,
    spread: 0.75,
    life: [0.12, 0.24],
    size: [30, 46],
    sizeEnd: 0.3,
    gravity: 0,
    drag: 3,
    spin: [0, 0],
    alpha: 1,
    alphaEnd: 0,
    colors: SPARK,
    jitter: 4,
    align: true,
  },
  headerStars: {
    frame: 'star',
    additive: true,
    count: [4, 6],
    speed: [120, 260],
    angle: UP,
    spread: ALL,
    life: [0.3, 0.5],
    size: [14, 20],
    sizeEnd: 0.2,
    gravity: 200,
    drag: 2,
    spin: [-6, 6],
    alpha: 1,
    alphaEnd: 0,
    colors: SPARK,
    jitter: 6,
  },
  postSpark: {
    frame: 'spark',
    additive: true,
    count: [8, 12],
    speed: [250, 600],
    angle: 0,
    spread: ALL,
    life: [0.15, 0.3],
    size: [26, 40],
    sizeEnd: 0.3,
    gravity: 600,
    drag: 2,
    spin: [0, 0],
    alpha: 1,
    alphaEnd: 0,
    colors: [0xffffff, 0xfff6c0],
    jitter: 2,
    align: true,
  },
  confetti: {
    frame: 'confetti',
    additive: false,
    count: [60, 80],
    speed: [360, 820],
    angle: UP,
    spread: 0.65,
    life: [2.2, 3.2],
    size: [26, 36],
    sizeEnd: 1,
    gravity: 560,
    drag: 1.7,
    spin: [-14, 14],
    alpha: 1,
    alphaEnd: 0,
    colors: CONFETTI_COLORS,
    jitter: 12,
    flutter: true,
  },
  confettiRain: {
    frame: 'confetti',
    additive: false,
    count: [50, 70],
    speed: [40, 140],
    angle: DOWN,
    spread: 0.5,
    life: [2.2, 3.4],
    size: [22, 32],
    sizeEnd: 1,
    gravity: 160,
    drag: 1,
    spin: [-10, 10],
    alpha: 1,
    alphaEnd: 0,
    colors: CONFETTI_COLORS,
    jitter: 640,
    flutter: true,
  },
  popBits: {
    frame: 'confetti',
    additive: false,
    count: [14, 18],
    speed: [200, 440],
    angle: UP,
    spread: ALL,
    life: [0.5, 0.9],
    size: [22, 30],
    sizeEnd: 0.8,
    gravity: 700,
    drag: 2,
    spin: [-12, 12],
    alpha: 1,
    alphaEnd: 0,
    colors: [0xffffff],
    jitter: 10,
    flutter: true,
  },
  popSparkle: {
    frame: 'star',
    additive: true,
    count: [9, 12],
    speed: [100, 300],
    angle: UP,
    spread: ALL,
    life: [0.35, 0.6],
    size: [16, 24],
    sizeEnd: 0.2,
    gravity: -60,
    drag: 2.5,
    spin: [-5, 5],
    alpha: 1,
    alphaEnd: 0,
    colors: SPARK,
    jitter: 12,
  },
  fireTrail: {
    frame: 'dot',
    additive: true,
    count: [2, 3],
    speed: [20, 90],
    angle: UP,
    spread: ALL,
    life: [0.22, 0.42],
    size: [16, 24],
    sizeEnd: 0.2,
    gravity: -260,
    drag: 2,
    spin: [0, 0],
    alpha: 0.95,
    alphaEnd: 0,
    colors: FIRE,
    jitter: 8,
  },
  smoke: {
    frame: 'puff',
    additive: false,
    count: [1, 1],
    speed: [10, 40],
    angle: UP,
    spread: 0.8,
    life: [0.5, 0.8],
    size: [10, 14],
    sizeEnd: 2.4,
    gravity: -90,
    drag: 2,
    spin: [-1, 1],
    alpha: 0.35,
    alphaEnd: 0,
    colors: [0x4a3a3a, 0x6a5a5a],
    jitter: 6,
  },
  fireBurst: {
    frame: 'dot',
    additive: true,
    count: [16, 22],
    speed: [150, 420],
    angle: UP,
    spread: ALL,
    life: [0.25, 0.5],
    size: [18, 28],
    sizeEnd: 0.2,
    gravity: -120,
    drag: 3,
    spin: [0, 0],
    alpha: 1,
    alphaEnd: 0,
    colors: FIRE,
    jitter: 8,
  },
  iceTrail: {
    frame: 'flake',
    additive: true,
    count: [1, 2],
    speed: [20, 70],
    angle: UP,
    spread: ALL,
    life: [0.4, 0.7],
    size: [12, 18],
    sizeEnd: 0.4,
    gravity: 60,
    drag: 2,
    spin: [-4, 4],
    alpha: 0.9,
    alphaEnd: 0,
    colors: [0xffffff, 0xbff4ff, 0x9be8ff],
    jitter: 10,
  },
  iceBurst: {
    frame: 'shard',
    additive: true,
    count: [12, 16],
    speed: [160, 420],
    angle: UP,
    spread: ALL,
    life: [0.35, 0.65],
    size: [14, 22],
    sizeEnd: 0.5,
    gravity: 700,
    drag: 1.5,
    spin: [-10, 10],
    alpha: 1,
    alphaEnd: 0,
    colors: [0xffffff, 0xbff4ff, 0x7fd8ff],
    jitter: 10,
  },
  zigzagSpark: {
    frame: 'spark',
    additive: true,
    count: [2, 3],
    speed: [120, 380],
    angle: 0,
    spread: ALL,
    life: [0.08, 0.18],
    size: [24, 38],
    sizeEnd: 0.3,
    gravity: 0,
    drag: 4,
    spin: [0, 0],
    alpha: 1,
    alphaEnd: 0,
    colors: [0xffffff, 0xfff04a, 0xffd000],
    jitter: 10,
    align: true,
  },
  teleportSwirl: {
    frame: 'star',
    additive: true,
    count: [12, 16],
    speed: [60, 220],
    angle: UP,
    spread: ALL,
    life: [0.3, 0.6],
    size: [12, 20],
    sizeEnd: 0.2,
    gravity: -60,
    drag: 3,
    spin: [-8, 8],
    alpha: 1,
    alphaEnd: 0,
    colors: [0xffffff, 0xd2b0ff, 0xb07cff],
    jitter: 18,
  },
  rockDebris: {
    frame: 'rock',
    additive: false,
    count: [6, 10],
    speed: [160, 380],
    angle: UP,
    spread: 1.1,
    life: [0.45, 0.8],
    size: [12, 20],
    sizeEnd: 0.8,
    gravity: 1100,
    drag: 0.8,
    spin: [-12, 12],
    alpha: 1,
    alphaEnd: 0.4,
    colors: [0x9a8a78, 0x7a6a5a, 0xb5a58c],
    jitter: 10,
  },
  tornadoLeaf: {
    frame: 'leaf',
    additive: false,
    count: [1, 2],
    speed: [80, 220],
    angle: UP,
    spread: ALL,
    life: [0.4, 0.7],
    size: [14, 20],
    sizeEnd: 0.6,
    gravity: -40,
    drag: 1.5,
    spin: [-14, 14],
    alpha: 0.95,
    alphaEnd: 0,
    colors: [0xc8ffe4, 0x7ad86a, 0xb8ffd9],
    jitter: 30,
  },
  rainbowStar: {
    frame: 'star',
    additive: true,
    count: [1, 2],
    speed: [10, 60],
    angle: UP,
    spread: ALL,
    life: [0.4, 0.7],
    size: [14, 20],
    sizeEnd: 0.2,
    gravity: 40,
    drag: 2,
    spin: [-6, 6],
    alpha: 1,
    alphaEnd: 0,
    colors: [0xff4b4b, 0xffa53b, 0xfff04a, 0x5be37a, 0x4bb8ff, 0xa875ff],
    jitter: 14,
  },
  magnetSpark: {
    frame: 'spark',
    additive: true,
    count: [1, 2],
    speed: [60, 200],
    angle: 0,
    spread: ALL,
    life: [0.12, 0.25],
    size: [22, 32],
    sizeEnd: 0.3,
    gravity: 0,
    drag: 3,
    spin: [0, 0],
    alpha: 1,
    alphaEnd: 0,
    colors: [0xff4d5a, 0x5aa0ff, 0xffffff],
    jitter: 14,
    align: true,
  },
  miragePoof: {
    frame: 'puff',
    additive: false,
    count: [8, 12],
    speed: [60, 180],
    angle: UP,
    spread: ALL,
    life: [0.3, 0.55],
    size: [10, 15],
    sizeEnd: 2,
    gravity: -40,
    drag: 3,
    spin: [-2, 2],
    alpha: 0.7,
    alphaEnd: 0,
    colors: [0xffc2e0, 0xffe3f0, 0xff8ac0],
    jitter: 8,
  },
  mirageShimmer: {
    frame: 'heart',
    additive: true,
    count: [1, 1],
    speed: [10, 50],
    angle: UP,
    spread: ALL,
    life: [0.3, 0.5],
    size: [12, 16],
    sizeEnd: 0.3,
    gravity: -60,
    drag: 2,
    spin: [-3, 3],
    alpha: 0.9,
    alphaEnd: 0,
    colors: [0xffc2e0, 0xff8ac0],
    jitter: 12,
  },
  quakeDust: {
    frame: 'puff',
    additive: false,
    count: [10, 14],
    speed: [80, 260],
    angle: UP,
    spread: 1.4,
    life: [0.45, 0.8],
    size: [12, 18],
    sizeEnd: 2.2,
    gravity: -20,
    drag: 3.5,
    spin: [-2, 2],
    alpha: 0.6,
    alphaEnd: 0,
    colors: [0xc98a45, 0xd9a86a, 0xa87038],
    jitter: 16,
  },
  fireworks: {
    frame: 'spark',
    additive: true,
    count: [34, 44],
    speed: [220, 420],
    angle: UP,
    spread: ALL,
    life: [0.8, 1.3],
    size: [24, 36],
    sizeEnd: 0.4,
    gravity: 220,
    drag: 1.6,
    spin: [0, 0],
    alpha: 1,
    alphaEnd: 0,
    colors: CONFETTI_COLORS,
    jitter: 4,
    align: true,
  },
  cameraFlash: {
    frame: 'star',
    additive: true,
    count: [1, 1],
    speed: [0, 0],
    angle: 0,
    spread: 0,
    life: [0.1, 0.18],
    size: [14, 22],
    sizeEnd: 0.4,
    gravity: 0,
    drag: 0,
    spin: [0, 0],
    alpha: 1,
    alphaEnd: 0,
    colors: [0xffffff],
    jitter: 0,
  },
  superCharge: {
    frame: 'dot',
    additive: true,
    count: [1, 1],
    speed: [30, 90],
    angle: UP,
    spread: 0.6,
    life: [0.3, 0.5],
    size: [8, 14],
    sizeEnd: 0.2,
    gravity: -160,
    drag: 1,
    spin: [0, 0],
    alpha: 1,
    alphaEnd: 0,
    colors: [0xffffff],
    jitter: 26,
  },
} as const satisfies Record<string, ParticlePresetDef>;

export type ParticlePresetName = keyof typeof PARTICLE_PRESETS;

/** Faz 5 — uyarlamalı kalite: kare süresi uzun süre bütçeyi aşarsa efektler azaltılır. */
export const QUALITY = {
  /** Kare süresi üstel ortalaması (ms) bunu `sustainSeconds` boyunca aşarsa bir kademe düş. */
  downgradeFrameMs: 19.5,
  sustainSeconds: 2.5,
  /** Sahne açılışındaki takılmalar sayılmasın (sn). */
  warmupSeconds: 2,
  /** Sekme arka plandayken gelen dev kareler yok sayılır (ms). */
  ignoreFrameMs: 120,
  smoothing: 0.08,
  /** `?quality=low|medium|high` ile sabitlenebilir. */
  param: 'quality',
  /** Bu kadar ya da daha az çekirdek/bellek (GB) → düşük güçlü cihaz. */
  lowPowerCores: 4,
  lowPowerMemoryGb: 4,
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
