import { SETTINGS, STORAGE, type AiDifficulty } from '../config/gameConfig';
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
}

export const DEFAULT_SETTINGS: GameSettings = {
  difficulty: SETTINGS.defaults.difficulty,
  matchSeconds: SETTINGS.defaults.matchSeconds,
  screenShake: SETTINGS.defaults.screenShake,
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
