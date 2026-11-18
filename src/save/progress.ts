import { DEV, PROGRESS, STORAGE } from '../config/gameConfig';
import {
  CHARACTER_IDS,
  isCharacterId,
  STARTER_CHARACTERS,
  UNLOCK_ORDER,
  type CharacterId,
} from '../game/characters';
import type { MatchMode } from '../game/matchSetup';
import { storage } from '../game/storage';
import type { PlayerIndex } from '../game/types';
import { isRecord, readJson, sanitizeCounter, writeJson, type KeyValueStore } from './store';

/** Oyuncu istatistikleri (yalnızca tamamlanan maçlar; antrenman ve AI vs AI sayılmaz). */
export interface Stats {
  /** Tamamlanan maçlar (CPU'ya karşı, turnuva, 2 oyuncu). */
  readonly matches: number;
  /** CPU'ya karşı ve turnuvada galibiyet / mağlubiyet. */
  readonly wins: number;
  readonly losses: number;
  /** İnsan oyuncuların attığı goller (2 oyuncuda ikisinin toplamı). */
  readonly goals: number;
  /** CPU'ya karşı yenen goller. */
  readonly conceded: number;
  readonly tournamentsWon: number;
}

export const STAT_KEYS = [
  'matches',
  'wins',
  'losses',
  'goals',
  'conceded',
  'tournamentsWon',
] as const satisfies readonly (keyof Stats)[];

export const EMPTY_STATS: Stats = {
  matches: 0,
  wins: 0,
  losses: 0,
  goals: 0,
  conceded: 0,
  tournamentsWon: 0,
};

/** Açılan karakterler + istatistikler. */
export interface Progress {
  /** `CHARACTERS` sırasında; başlangıç karakterleri her zaman dahil. */
  readonly unlocked: readonly CharacterId[];
  readonly stats: Stats;
}

export const DEFAULT_PROGRESS: Progress = { unlocked: STARTER_CHARACTERS, stats: EMPTY_STATS };

function normalizeUnlocked(ids: Iterable<CharacterId>): CharacterId[] {
  const set = new Set<CharacterId>([...STARTER_CHARACTERS, ...ids]);
  return CHARACTER_IDS.filter((id) => set.has(id));
}

/**
 * Doğrulanmamış veriden ilerleme. Bozuk alanlar güvenli varsayılana döner: bilinmeyen karakter
 * kimlikleri atılır, başlangıç karakterleri hep açıktır, sayaçlar negatif olmayan tam sayıdır.
 */
export function parseProgress(value: unknown): Progress {
  const v = isRecord(value) ? value : {};
  const ids = Array.isArray(v.unlocked) ? v.unlocked.filter(isCharacterId) : [];
  const rawStats = isRecord(v.stats) ? v.stats : {};
  const stats = { ...EMPTY_STATS };
  for (const key of STAT_KEYS) stats[key] = sanitizeCounter(rawStats[key], PROGRESS.maxCounter);
  return { unlocked: normalizeUnlocked(ids), stats };
}

export function loadProgress(store: KeyValueStore): Progress {
  return parseProgress(readJson(store, STORAGE.keys.progress));
}

export function saveProgress(store: KeyValueStore, progress: Progress): void {
  writeJson(store, STORAGE.keys.progress, progress);
}

/** Bir maç sonucu (P1 her zaman insandır; CPU modlarında P2 yapay zekâ). */
export interface MatchResult {
  readonly mode: MatchMode;
  readonly score: readonly [number, number];
  readonly winner: PlayerIndex | null;
}

/** İstatistiklere bir maç ekler (antrenman eklenmez). */
export function recordMatch(stats: Stats, result: MatchResult): Stats {
  if (result.mode === 'training') return stats;
  const [a, b] = result.score;
  const cap = (n: number): number => Math.min(n, PROGRESS.maxCounter);
  if (result.mode === 'versus') {
    return { ...stats, matches: cap(stats.matches + 1), goals: cap(stats.goals + a + b) };
  }
  return {
    ...stats,
    matches: cap(stats.matches + 1),
    wins: cap(stats.wins + (result.winner === 0 ? 1 : 0)),
    losses: cap(stats.losses + (result.winner === 1 ? 1 : 0)),
    goals: cap(stats.goals + a),
    conceded: cap(stats.conceded + b),
  };
}

/** Sıradaki kilitli karakter (yoksa null: hepsi açık). */
export function nextUnlock(progress: Progress): CharacterId | null {
  return UNLOCK_ORDER.find((id) => !progress.unlocked.includes(id)) ?? null;
}

/** Sıradaki kilitli karakteri açar. */
export function unlockNext(progress: Progress): {
  progress: Progress;
  unlocked: CharacterId | null;
} {
  const id = nextUnlock(progress);
  if (!id) return { progress, unlocked: null };
  return {
    progress: { ...progress, unlocked: normalizeUnlocked([...progress.unlocked, id]) },
    unlocked: id,
  };
}

// ───────────────────────── Çalışma zamanı (tarayıcı kaydı) ─────────────────────────

let current: Progress | null = null;

/** `?unlock=all` → tüm karakterler açık görünür (kayda yazılmaz). */
function devUnlockAll(): boolean {
  const search = (globalThis as { location?: { search?: string } }).location?.search ?? '';
  return new URLSearchParams(search).get(DEV.unlockParam) === DEV.unlockAllValue;
}

export function getProgress(): Progress {
  current ??= loadProgress(storage);
  return current;
}

function setProgress(next: Progress): void {
  current = next;
  saveProgress(storage, next);
}

/** Karakter açık mı? */
export function isUnlocked(id: CharacterId): boolean {
  return devUnlockAll() || getProgress().unlocked.includes(id);
}

/** Tamamlanan maçı istatistiklere yazar. */
export function saveMatchResult(result: MatchResult): void {
  const p = getProgress();
  setProgress({ ...p, stats: recordMatch(p.stats, result) });
}

/** Turnuva şampiyonluğu: sayaç + sıradaki karakterin kilidi. @returns Açılan karakter. */
export function saveTournamentWin(): CharacterId | null {
  const p = getProgress();
  const stats = {
    ...p.stats,
    tournamentsWon: Math.min(p.stats.tournamentsWon + 1, PROGRESS.maxCounter),
  };
  const { progress, unlocked } = unlockNext({ ...p, stats });
  setProgress(progress);
  return unlocked;
}
