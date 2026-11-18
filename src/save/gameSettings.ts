import { SETTINGS, STORAGE, type AiDifficulty } from '../config/gameConfig';

/** Efekt yoğunluğu (erişilebilirlik). */
export type EffectLevel = (typeof SETTINGS.effectLevels)[number];
export const EFFECT_LEVELS: readonly EffectLevel[] = SETTINGS.effectLevels;

function isEffectLevel(value: unknown): value is EffectLevel {
  return typeof value === 'string' && (EFFECT_LEVELS as readonly string[]).includes(value);
}
import { isDifficulty } from '../game/matchSetup';
import { storage } from '../game/storage';
import { isRecord, readJson, writeJson, type KeyValueStore } from './store';

/**
 * Oyun ayarları (Faz 6). Dil ve ses düzeyleri kendi anahtarlarında saklanır (`i18n`,
 * `audio/settings`); burada maçla ilgili olanlar: CPU zorluğu, maç süresi, ekran sarsıntısı.
 */
export interface GameSettings {
  readonly difficulty: AiDifficulty;
  /** Maç süresi (sn): `SETTINGS.matchDurations` seçeneklerinden biri. */
  readonly matchSeconds: number;
  readonly screenShake: boolean;
  /** Golden sonra tekrar (Faz 7). */
  readonly replays: boolean;
  /** Renk körü dostu oyuncu renkleri + kimlik halkası ve şekilleri (Faz 7). */
  readonly colorblind: boolean;
  /** Efekt yoğunluğu: parçacıklar, ekran parlamaları, gol yakınlaşması (Faz 7). */
  readonly effects: EffectLevel;
}

export const DEFAULT_SETTINGS: GameSettings = {
  difficulty: SETTINGS.defaults.difficulty,
  matchSeconds: SETTINGS.defaults.matchSeconds,
  screenShake: SETTINGS.defaults.screenShake,
  replays: SETTINGS.defaults.replays,
  colorblind: SETTINGS.defaults.colorblind,
  effects: SETTINGS.defaults.effects,
};

export const MATCH_DURATIONS: readonly number[] = SETTINGS.matchDurations;

/**
 * Doğrulanmamış veriden ayarlar: her alan ayrı denetlenir, geçersiz olan varsayılana döner.
 * `legacyDifficulty`: Faz 3–5'te zorluk ayrı anahtarda saklanıyordu (geçiş).
 */
export function parseSettings(value: unknown, legacyDifficulty: unknown = null): GameSettings {
  const v = isRecord(value) ? value : {};
  const difficulty = isDifficulty(v.difficulty)
    ? v.difficulty
    : isDifficulty(legacyDifficulty)
      ? legacyDifficulty
      : DEFAULT_SETTINGS.difficulty;
  const seconds = v.matchSeconds;
  return {
    difficulty,
    matchSeconds:
      typeof seconds === 'number' && MATCH_DURATIONS.includes(seconds)
        ? seconds
        : DEFAULT_SETTINGS.matchSeconds,
    screenShake: typeof v.screenShake === 'boolean' ? v.screenShake : DEFAULT_SETTINGS.screenShake,
    replays: typeof v.replays === 'boolean' ? v.replays : DEFAULT_SETTINGS.replays,
    colorblind: typeof v.colorblind === 'boolean' ? v.colorblind : DEFAULT_SETTINGS.colorblind,
    effects: isEffectLevel(v.effects) ? v.effects : DEFAULT_SETTINGS.effects,
  };
}

export function loadSettings(store: KeyValueStore): GameSettings {
  let legacy: string | null;
  try {
    legacy = store.get(STORAGE.keys.aiDifficulty);
  } catch {
    legacy = null;
  }
  return parseSettings(readJson(store, STORAGE.keys.settings), legacy);
}

export function saveSettings(store: KeyValueStore, settings: GameSettings): void {
  writeJson(store, STORAGE.keys.settings, settings);
}

/** Seçenek listesinde bir adım ileri/geri (uçlarda başa/sona sarar). */
export function cycleOption<T>(options: readonly T[], current: T, dir: 1 | -1): T {
  const i = options.indexOf(current);
  const next = i < 0 ? 0 : (i + dir + options.length) % options.length;
  return options[next] ?? current;
}

let current: GameSettings | null = null;

/** Etkin ayarlar (ilk çağrıda kayıttan okunur). */
export function getSettings(): GameSettings {
  current ??= loadSettings(storage);
  return current;
}

/** Ayarları değiştirir ve hemen kaydeder. */
export function updateSettings(patch: Partial<GameSettings>): GameSettings {
  const next = parseSettings({ ...getSettings(), ...patch });
  current = next;
  saveSettings(storage, next);
  return next;
}
