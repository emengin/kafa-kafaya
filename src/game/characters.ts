import { CHARACTER_STATS, PLAYER, type SuperType } from '../config/gameConfig';

/** İstatistikler 1–5 ölçeğinde. */
export interface CharacterStats {
  /** Yatay hız ve ivme. */
  readonly speed: number;
  /** Zıplama yüksekliği. */
  readonly jump: number;
  /** Şut gücü. */
  readonly kick: number;
  /** Kafa boyutu: büyük kafa geniş savunma alanı ama daha ağır (biraz daha alçak zıplar). */
  readonly head: number;
}

/** Çizim renkleri (Phaser sayısal renk biçimi). */
export interface CharacterPalette {
  readonly head: number;
  readonly body: number;
  readonly foot: number;
  /** Süper hazırken parlama, HUD ve seçim ekranı vurgusu. */
  readonly accent: number;
}

export type CharacterId =
  'kor' | 'ayaz' | 'simsek' | 'sis' | 'kaya' | 'bora' | 'yay' | 'demir' | 'pamuk' | 'toprak';

export interface CharacterDef {
  readonly id: CharacterId;
  /** Özel isim; her dilde aynı. */
  readonly name: string;
  readonly stats: CharacterStats;
  readonly palette: CharacterPalette;
  readonly superType: SuperType;
}

/**
 * Bir oyuncunun fizik değerleri (karakter istatistiklerinden türetilir). Güçlendiriciler bu
 * değerleri değiştirmez; `Player` üzerindeki çarpanlarla (kafa, hız) birleşir.
 */
export interface PlayerParams {
  readonly maxSpeed: number;
  /** Yatay ivmelerin `PLAYER.move` değerlerine oranı (hızla aynı oranda). */
  readonly accelScale: number;
  readonly jumpSpeed: number;
  readonly kickPower: number;
  readonly headRadius: number;
  readonly mass: number;
}

/** Oyuncunun maça getirdiği her şey: fizik değerleri + süper şut tipi. */
export interface Loadout {
  readonly params: PlayerParams;
  readonly superType: SuperType;
}

/**
 * 10 özgün karakter. Her birinin istatistik toplamı `CHARACTER_STATS.statTotal` (14) ve
 * kendine ait bir süper şutu var. Denge simülasyonla doğrulanır (`npm run simulate -- --characters`).
 */
export const CHARACTERS: readonly CharacterDef[] = [
  {
    id: 'kor',
    name: 'Kor',
    stats: { speed: 3, jump: 3, kick: 5, head: 3 },
    palette: { head: 0xffb08a, body: 0xd8342c, foot: 0x7a1410, accent: 0xff7a1a },
    superType: 'fire',
  },
  {
    id: 'ayaz',
    name: 'Ayaz',
    stats: { speed: 3, jump: 4, kick: 3, head: 4 },
    palette: { head: 0xe3f6ff, body: 0x5ec8f2, foot: 0x1d6f99, accent: 0xa8ecff },
    superType: 'ice',
  },
  {
    id: 'simsek',
    name: 'Şimşek',
    stats: { speed: 5, jump: 3, kick: 4, head: 2 },
    palette: { head: 0xfff3a8, body: 0xf2c80f, foot: 0x6b5300, accent: 0xfff04a },
    superType: 'zigzag',
  },
  {
    id: 'sis',
    name: 'Sis',
    stats: { speed: 4, jump: 5, kick: 2, head: 3 },
    palette: { head: 0xd9c8f0, body: 0x7d4bb8, foot: 0x3a1f5c, accent: 0xc28cff },
    superType: 'teleport',
  },
  {
    id: 'kaya',
    name: 'Kaya',
    stats: { speed: 2, jump: 3, kick: 4, head: 5 },
    palette: { head: 0xc9c4bd, body: 0x77736d, foot: 0x3b3936, accent: 0xb5a58c },
    superType: 'giant',
  },
  {
    id: 'bora',
    name: 'Bora',
    stats: { speed: 4, jump: 4, kick: 3, head: 3 },
    palette: { head: 0xf2fff6, body: 0x4fc788, foot: 0x1f6b45, accent: 0xb8ffd9 },
    superType: 'tornado',
  },
  {
    id: 'yay',
    name: 'Yay',
    stats: { speed: 3, jump: 5, kick: 3, head: 3 },
    palette: { head: 0xffd9b0, body: 0xf28a1e, foot: 0x7a3e00, accent: 0xff5fa8 },
    superType: 'rainbow',
  },
  {
    id: 'demir',
    name: 'Demir',
    stats: { speed: 3, jump: 3, kick: 4, head: 4 },
    palette: { head: 0xd6d9de, body: 0xb3323a, foot: 0x4a4f57, accent: 0xff4d5a },
    superType: 'magnet',
  },
  {
    id: 'pamuk',
    name: 'Pamuk',
    stats: { speed: 4, jump: 4, kick: 2, head: 4 },
    palette: { head: 0xffeef6, body: 0xf59ac4, foot: 0xa34775, accent: 0xffc2e0 },
    superType: 'mirage',
  },
  {
    id: 'toprak',
    name: 'Toprak',
    stats: { speed: 2, jump: 4, kick: 5, head: 3 },
    palette: { head: 0xe8c39e, body: 0x8a5a2b, foot: 0x45290f, accent: 0xd99a4e },
    superType: 'quake',
  },
];

export const CHARACTER_IDS: readonly CharacterId[] = CHARACTERS.map((c) => c.id);

/** Baştan açık karakterler (Faz 6). Diğerleri turnuva kazanılarak sırayla açılır. */
export const STARTER_CHARACTERS: readonly CharacterId[] = [
  'kor',
  'ayaz',
  'simsek',
  'kaya',
  'bora',
  'yay',
];

/** Kilitli karakterlerin açılma sırası: her turnuva şampiyonluğu sıradakini açar. */
export const UNLOCK_ORDER: readonly CharacterId[] = ['demir', 'sis', 'pamuk', 'toprak'];

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && (CHARACTER_IDS as readonly string[]).includes(value);
}

export function getCharacter(id: CharacterId): CharacterDef {
  const def = CHARACTERS.find((c) => c.id === id);
  if (!def) throw new Error(`Bilinmeyen karakter: ${id}`);
  return def;
}

function statValue(table: readonly number[], stat: number): number {
  const s = CHARACTER_STATS;
  const i = Math.min(Math.max(Math.round(stat), s.statMin), s.statMax) - s.statMin;
  const value = table[i];
  if (value === undefined) throw new Error(`Geçersiz istatistik: ${stat}`);
  return value;
}

/** Ortalama puan (3): kafa ve zıplama cezası buna göre hesaplanır. */
const MID_STAT = (CHARACTER_STATS.statMin + CHARACTER_STATS.statMax) / 2;

/** İstatistiklerden fizik değerleri. Tüm puanları 3 olan oyuncu Faz 1–3 değerleriyle aynıdır. */
export function paramsFromStats(stats: CharacterStats): PlayerParams {
  const s = CHARACTER_STATS;
  const maxSpeed = statValue(s.maxSpeed, stats.speed);
  const headPenalty = 1 - s.headJumpPenaltyPerPoint * (stats.head - MID_STAT);
  return {
    maxSpeed,
    accelScale: maxSpeed / PLAYER.move.maxSpeed,
    jumpSpeed: statValue(s.jumpSpeed, stats.jump) * headPenalty,
    kickPower: statValue(s.kickPower, stats.kick),
    headRadius: statValue(s.headRadius, stats.head),
    mass: statValue(s.mass, stats.head),
  };
}

export function loadoutFor(id: CharacterId): Loadout {
  const def = getCharacter(id);
  return { params: paramsFromStats(def.stats), superType: def.superType };
}

/**
 * Karakter seçilmemiş simülasyonlar (testler, eski kurulumlar): tüm puanları 3 olan "nötr"
 * oyuncu (Faz 1–3 değerleri) ve Ateş Topu süperi (eski genel süpere en yakın tip).
 */
export const NEUTRAL_LOADOUT: Loadout = {
  params: paramsFromStats({ speed: MID_STAT, jump: MID_STAT, kick: MID_STAT, head: MID_STAT }),
  superType: 'fire',
};
