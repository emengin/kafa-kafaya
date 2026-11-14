import type { CharacterId } from '../game/characters';

/**
 * Karakterlerin görünüşü (yalnızca görsel; denge değeri değildir): cilt tonu, saç modeli,
 * aksesuar, göz, kaş ve ağız. Saç ve aksesuarlar SVG yol verisiyle (Canvas `Path2D`) tanımlanır:
 * koordinatlar kafa yarıçapı **100** birim, merkez (0, 0), karakter **sağa** bakar (+x = ön,
 * −y = yukarı). Sola bakan oyuncu çizimde aynalanır. Tüm karakterler özgündür.
 */

/** Katmanın boyası: saç tonları, aksesuar renkleri ya da sabit renkler. */
export type Paint = 'hair' | 'hair2' | 'hairGrad' | 'acc' | 'acc2' | 'white' | 'skin';

export interface HairLayer {
  /** SVG yol verisi (kafa yarıçapı 100 birim). */
  readonly d: string;
  readonly paint: Paint;
  /** `back`: kafanın arkasında; `front`: yüzün önünde. */
  readonly layer: 'back' | 'front';
  /** Kontur çizilsin mi (varsayılan true). */
  readonly outline?: boolean;
  /** Dolgu yerine bu kalınlıkta (birim) çizgi (bantlar, örgüler). */
  readonly stroke?: number;
  /** Daire birleşimi: kontur önce, dolgu sonra (iç çizgiler görünmez; kabarık saç). */
  readonly union?: boolean;
  readonly alpha?: number;
}

/** Saçtan bağımsız sallanan ek (kurdele, tüy): dokusu ayrı, bağlantı noktası kafa biriminde. */
export interface LookExtra {
  readonly kind: 'ribbon' | 'feather';
  readonly x: number;
  readonly y: number;
}

export type MouthStyle = 'smile' | 'grin' | 'smirk' | 'flat';

export interface CharacterLook {
  readonly skin: number;
  readonly hair: number;
  readonly hair2: number;
  readonly acc: number;
  readonly acc2: number;
  readonly iris: number;
  readonly brow: number;
  /** Kaş kalınlığı (kafa birimi) ve eğimi (rad; + kararlı/sert, − yumuşak). */
  readonly browThickness: number;
  readonly browTilt: number;
  /** Göz boyu çarpanı ve üst göz kapağının varsayılan kapanıklığı (0–0,5). */
  readonly eyeSize: number;
  readonly lid: number;
  readonly mouth: MouthStyle;
  /** Ağzın varsayılan yerinden dikey kayması (kafa birimi; bıyık/sakal için). */
  readonly mouthShift: number;
  readonly blush: boolean;
  readonly layers: readonly HairLayer[];
  readonly extra?: LookExtra;
}

/** Kısa saç takkesi (ense → kulak üstü → alın). */
const CAP =
  'M72,-66 Q68,-104 14,-112 Q-58,-116 -98,-58 Q-108,-16 -94,30 Q-62,-10 -22,-30 Q24,-50 72,-66 Z';
/** Saç çizgisi boyunca alın bandı. */
const BAND = 'M86,-54 Q42,-56 0,-50 Q-52,-40 -98,0';

export const LOOKS: Readonly<Record<CharacterId, CharacterLook>> = {
  // Kor — ateş: alev saç, ter bandı, kararlı bakış.
  kor: {
    skin: 0xe2a273,
    hair: 0xe8321c,
    hair2: 0xffd23a,
    acc: 0xfff4e6,
    acc2: 0xd8342c,
    iris: 0x5a2a0e,
    brow: 0x6e170a,
    browThickness: 9,
    browTilt: 0.28,
    eyeSize: 1,
    lid: 0.18,
    mouth: 'grin',
    mouthShift: 0,
    blush: false,
    layers: [
      {
        layer: 'front',
        paint: 'hairGrad',
        d: 'M70,-68 Q80,-102 62,-140 Q50,-110 36,-104 Q36,-134 12,-156 Q8,-120 -10,-108 Q-18,-136 -50,-150 Q-40,-114 -62,-102 Q-76,-120 -104,-128 Q-90,-98 -102,-76 Q-120,-74 -142,-64 Q-114,-46 -108,-18 Q-104,10 -92,36 Q-62,-6 -20,-28 Q22,-48 70,-68 Z',
      },
      {
        layer: 'front',
        paint: 'hair2',
        outline: false,
        alpha: 0.85,
        d: 'M48,-80 Q52,-106 40,-124 Q30,-102 16,-96 Q14,-120 -2,-134 Q-8,-102 -24,-94 Q-32,-116 -54,-126 Q-48,-98 -60,-86 Q-28,-62 48,-80 Z',
      },
      { layer: 'front', paint: 'acc', stroke: 15, d: BAND },
      { layer: 'front', paint: 'acc2', stroke: 5, outline: false, d: BAND },
    ],
  },
  // Ayaz — buz: örgü bere, gümüş perçem.
  ayaz: {
    skin: 0xf6dcc9,
    hair: 0xeef7ff,
    hair2: 0xa6dcff,
    acc: 0x5ec8f2,
    acc2: 0x2a86b8,
    iris: 0x3a8fd0,
    brow: 0xb9cfe0,
    browThickness: 6,
    browTilt: 0.05,
    eyeSize: 1.06,
    lid: 0.08,
    mouth: 'smile',
    mouthShift: 0,
    blush: true,
    layers: [
      {
        layer: 'front',
        paint: 'hairGrad',
        d: 'M88,-46 L80,-22 L70,-40 L60,-18 L50,-40 L38,-22 L30,-42 L18,-36 L22,-58 L86,-62 Z',
      },
      {
        layer: 'front',
        paint: 'acc',
        d: 'M88,-52 Q96,-114 24,-132 Q-58,-146 -102,-66 Q-108,-44 -100,-22 Q-46,-34 6,-46 Q50,-56 88,-52 Z',
      },
      {
        layer: 'front',
        paint: 'acc2',
        stroke: 3,
        outline: false,
        alpha: 0.6,
        d: 'M60,-60 Q66,-100 40,-124 M24,-50 Q30,-100 4,-132 M-14,-44 Q-12,-96 -34,-136 M-50,-36 Q-56,-84 -72,-116',
      },
      { layer: 'front', paint: 'acc2', stroke: 24, d: 'M92,-48 Q40,-52 -6,-42 Q-56,-30 -102,-20' },
      {
        layer: 'front',
        paint: 'acc',
        stroke: 3,
        outline: false,
        alpha: 0.7,
        d: 'M78,-60 L78,-38 M62,-60 L62,-36 M46,-58 L46,-34 M30,-56 L30,-32 M14,-54 L14,-30 M-2,-52 L-2,-28 M-18,-48 L-18,-24 M-34,-44 L-34,-20 M-50,-40 L-50,-16 M-66,-34 L-66,-12 M-82,-30 L-82,-8',
      },
      {
        layer: 'front',
        paint: 'white',
        union: true,
        d: 'M-64,-142 a22,22 0 1,0 44,0 a22,22 0 1,0 -44,0 M-74,-156 a14,14 0 1,0 28,0 a14,14 0 1,0 -28,0 M-36,-160 a14,14 0 1,0 28,0 a14,14 0 1,0 -28,0 M-26,-136 a12,12 0 1,0 24,0 a12,12 0 1,0 -24,0',
      },
    ],
  },
  // Şimşek — elektrik: yıldırım ibiği, alında gözlük.
  simsek: {
    skin: 0xc9874f,
    hair: 0x33231a,
    hair2: 0xfff04a,
    acc: 0x2c2c34,
    acc2: 0xffa51e,
    iris: 0x6b3d12,
    brow: 0x22150a,
    browThickness: 7,
    browTilt: 0.18,
    eyeSize: 0.96,
    lid: 0.2,
    mouth: 'smirk',
    mouthShift: 0,
    blush: false,
    layers: [
      { layer: 'front', paint: 'hair', d: CAP },
      {
        layer: 'front',
        paint: 'hairGrad',
        d: 'M44,-100 L66,-160 L32,-134 L26,-182 L0,-138 L-16,-176 L-30,-126 L-62,-160 L-62,-104 Q-10,-120 44,-100 Z',
      },
      { layer: 'front', paint: 'acc', stroke: 10, d: 'M96,-34 Q40,-58 -20,-54 Q-70,-46 -100,-16' },
      {
        layer: 'front',
        paint: 'acc2',
        d: 'M34,-60 a24,24 0 1,0 48,0 a24,24 0 1,0 -48,0',
      },
      {
        layer: 'front',
        paint: 'white',
        outline: false,
        alpha: 0.55,
        d: 'M44,-68 Q50,-80 64,-80 Q54,-74 50,-62 Z',
      },
    ],
  },
  // Sis — gölge: kapüşon, göz üstüne düşen perçem, uykulu bakış.
  sis: {
    skin: 0xead2bd,
    hair: 0x3a1c63,
    hair2: 0x7d4bb8,
    acc: 0x6236a0,
    acc2: 0x2a1450,
    iris: 0x9b59ff,
    brow: 0x2a1450,
    browThickness: 6,
    browTilt: -0.06,
    eyeSize: 1,
    lid: 0.34,
    mouth: 'flat',
    mouthShift: 0,
    blush: false,
    layers: [
      {
        layer: 'back',
        paint: 'acc',
        d: 'M66,-104 Q-6,-150 -84,-122 Q-146,-84 -142,4 Q-138,74 -84,114 Q-36,140 30,118 L18,96 Q-96,70 -96,0 Q-94,-70 66,-104 Z',
      },
      {
        layer: 'front',
        paint: 'hairGrad',
        d: 'M78,-60 Q50,-84 6,-78 Q-30,-70 -48,-40 Q-14,-58 16,-44 Q38,-34 44,-22 Q52,-38 62,-36 Q74,-42 78,-60 Z',
      },
      {
        layer: 'front',
        paint: 'acc',
        d: 'M72,-100 Q14,-142 -62,-126 Q-124,-98 -126,-28 L-100,-22 Q-96,-76 -44,-96 Q14,-110 62,-80 Q76,-66 80,-46 L94,-56 Q92,-86 72,-100 Z',
      },
      {
        layer: 'front',
        paint: 'acc2',
        stroke: 4,
        outline: false,
        alpha: 0.5,
        d: 'M64,-86 Q12,-118 -48,-104 Q-104,-80 -110,-30',
      },
    ],
  },
  // Kaya — taş: düz kesim, gür sakal, kalın kaşlar.
  kaya: {
    skin: 0x8a5a3c,
    hair: 0x24201d,
    hair2: 0x4a4440,
    acc: 0x2e2824,
    acc2: 0x4a4440,
    iris: 0x3a2414,
    brow: 0x1c1816,
    browThickness: 12,
    browTilt: 0.3,
    eyeSize: 0.86,
    lid: 0.26,
    mouth: 'flat',
    mouthShift: -4,
    blush: false,
    layers: [
      {
        layer: 'front',
        paint: 'hair',
        d: 'M70,-70 L74,-118 Q0,-128 -72,-120 Q-102,-112 -104,-62 Q-106,-18 -96,24 Q-62,-14 -20,-32 Q24,-52 70,-70 Z',
      },
      {
        layer: 'front',
        paint: 'hair2',
        outline: false,
        alpha: 0.5,
        d: 'M64,-112 L-60,-114 Q-90,-108 -92,-80 L-80,-84 Q-74,-104 -50,-106 L62,-104 Z',
      },
      {
        layer: 'front',
        paint: 'acc',
        d: 'M-20,24 Q-24,72 8,94 Q44,116 82,94 Q102,76 98,50 Q80,62 64,64 Q42,72 24,62 Q6,50 -20,24 Z',
      },
    ],
  },
  // Bora — rüzgâr: rüzgârda savrulan saç, kurdeleli bant.
  bora: {
    skin: 0xf1c69c,
    hair: 0xe9f6c6,
    hair2: 0xb3e39a,
    acc: 0x2fa866,
    acc2: 0xb8ffd9,
    iris: 0x2f8a5a,
    brow: 0xa3b273,
    browThickness: 6,
    browTilt: 0,
    eyeSize: 1,
    lid: 0.12,
    mouth: 'smile',
    mouthShift: 0,
    blush: false,
    layers: [
      {
        layer: 'front',
        paint: 'hairGrad',
        d: 'M76,-62 Q74,-104 20,-114 Q-42,-122 -92,-94 Q-130,-84 -168,-102 Q-146,-64 -114,-54 Q-150,-44 -172,-32 Q-134,-16 -106,-20 Q-114,6 -96,30 Q-62,-8 -22,-28 Q26,-46 76,-62 Z',
      },
      {
        layer: 'front',
        paint: 'hair2',
        outline: false,
        alpha: 0.7,
        d: 'M50,-92 Q0,-104 -60,-92 Q-100,-84 -130,-90 Q-96,-74 -60,-80 Q-10,-88 50,-92 Z',
      },
      { layer: 'front', paint: 'acc', stroke: 14, d: BAND },
    ],
    extra: { kind: 'ribbon', x: -98, y: 0 },
  },
  // Yay — okçu: tepe topuzu, turuncu bant, tüy.
  yay: {
    skin: 0xb57b52,
    hair: 0x3a2314,
    hair2: 0x6b4428,
    acc: 0xf28a1e,
    acc2: 0xff5fa8,
    iris: 0x4a2a12,
    brow: 0x26140a,
    browThickness: 7,
    browTilt: 0.1,
    eyeSize: 1.02,
    lid: 0.14,
    mouth: 'smile',
    mouthShift: 0,
    blush: false,
    layers: [
      {
        layer: 'front',
        paint: 'hair',
        union: true,
        d: 'M-70,-120 a30,30 0 1,0 60,0 a30,30 0 1,0 -60,0',
      },
      { layer: 'front', paint: 'hair', d: CAP },
      { layer: 'front', paint: 'acc2', stroke: 9, d: 'M-62,-100 Q-40,-88 -16,-100' },
      { layer: 'front', paint: 'acc', stroke: 14, d: BAND },
    ],
    extra: { kind: 'feather', x: -92, y: -22 },
  },
  // Demir — mıknatıs: yana taranmış çelik saç, burma bıyık.
  demir: {
    skin: 0xf2cdb0,
    hair: 0x8a929c,
    hair2: 0xd0d6de,
    acc: 0x4e535a,
    acc2: 0x8a929c,
    iris: 0x4a6a8a,
    brow: 0x4e535a,
    browThickness: 8,
    browTilt: 0.2,
    eyeSize: 0.95,
    lid: 0.2,
    mouth: 'flat',
    mouthShift: 10,
    blush: false,
    layers: [
      {
        layer: 'front',
        paint: 'hairGrad',
        d: 'M78,-56 Q84,-102 30,-114 Q-40,-122 -92,-76 Q-110,-30 -96,28 Q-62,-12 -24,-32 Q12,-46 34,-52 Q58,-66 78,-56 Z',
      },
      {
        layer: 'front',
        paint: 'hair2',
        outline: false,
        alpha: 0.75,
        d: 'M78,-58 Q62,-84 18,-90 Q52,-102 72,-96 Q90,-82 78,-58 Z',
      },
      { layer: 'front', paint: 'hair2', stroke: 3, outline: false, d: 'M38,-108 Q18,-86 -12,-76' },
      {
        layer: 'front',
        paint: 'acc',
        d: 'M28,28 Q46,18 62,25 Q80,18 96,28 Q108,44 98,50 Q88,36 68,38 Q48,34 32,48 Q20,42 28,28 Z',
      },
    ],
  },
  // Pamuk — bulut: kabarık pembe saç, yıldız toka, al yanaklar.
  pamuk: {
    skin: 0xfbe2d6,
    hair: 0xffacd2,
    hair2: 0xffe3f0,
    acc: 0xffd23f,
    acc2: 0xff8ac0,
    iris: 0xe0528f,
    brow: 0xe07aa8,
    browThickness: 5,
    browTilt: -0.06,
    eyeSize: 1.16,
    lid: 0,
    mouth: 'smile',
    mouthShift: 0,
    blush: true,
    layers: [
      {
        layer: 'front',
        paint: 'hair',
        union: true,
        d: 'M30,-76 a30,30 0 1,0 60,0 a30,30 0 1,0 -60,0 M-16,-104 a36,36 0 1,0 72,0 a36,36 0 1,0 -72,0 M-68,-108 a38,38 0 1,0 76,0 a38,38 0 1,0 -76,0 M-110,-82 a36,36 0 1,0 72,0 a36,36 0 1,0 -72,0 M-132,-36 a32,32 0 1,0 64,0 a32,32 0 1,0 -64,0 M-124,12 a26,26 0 1,0 52,0 a26,26 0 1,0 -52,0 M-150,44 a26,26 0 1,0 52,0 a26,26 0 1,0 -52,0',
      },
      {
        layer: 'front',
        paint: 'hair2',
        outline: false,
        alpha: 0.8,
        d: 'M8,-114 a14,14 0 1,0 28,0 a14,14 0 1,0 -28,0 M-46,-122 a16,16 0 1,0 32,0 a16,16 0 1,0 -32,0 M-92,-98 a13,13 0 1,0 26,0 a13,13 0 1,0 -26,0 M48,-88 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0',
      },
      {
        layer: 'front',
        paint: 'acc',
        d: 'M38,-118 L44,-102 L61,-102 L48,-92 L53,-76 L38,-86 L23,-76 L28,-92 L15,-102 L32,-102 Z',
      },
    ],
  },
  // Toprak — deprem: altın boncuklu örgüler.
  toprak: {
    skin: 0x6c4227,
    hair: 0x24160d,
    hair2: 0x4a3020,
    acc: 0xe0ac44,
    acc2: 0xd99a4e,
    iris: 0x2a1608,
    brow: 0x160c05,
    browThickness: 8,
    browTilt: 0.14,
    eyeSize: 0.96,
    lid: 0.14,
    mouth: 'grin',
    mouthShift: 0,
    blush: false,
    layers: [
      {
        layer: 'back',
        paint: 'hair',
        stroke: 20,
        d: 'M-60,-90 Q-110,-70 -132,-20 M-84,-64 Q-120,-20 -126,40 M-96,-30 Q-118,20 -108,82 M-40,-104 Q-96,-110 -140,-80',
      },
      { layer: 'front', paint: 'hair', d: CAP },
      {
        layer: 'front',
        paint: 'hair',
        stroke: 20,
        d: 'M44,-92 Q48,-128 30,-150 M10,-106 Q8,-144 -14,-164 M-28,-108 Q-40,-146 -66,-160 M-64,-92 Q-92,-118 -120,-122',
      },
      {
        layer: 'front',
        paint: 'acc',
        stroke: 8,
        d: 'M26,-142 L36,-150 M-18,-154 L-8,-164 M-60,-150 L-70,-160 M-112,-118 L-118,-128',
      },
      {
        layer: 'back',
        paint: 'acc',
        stroke: 8,
        d: 'M-126,-28 L-138,-14 M-124,30 L-128,48 M-106,72 L-112,90 M-134,-86 L-146,-74',
      },
    ],
  },
};
