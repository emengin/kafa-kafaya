import { AI_DIFFICULTIES, STORAGE, TOURNAMENT, type AiDifficulty } from '../config/gameConfig';
import { isRecord, readJson, removeKey, writeJson, type KeyValueStore } from '../save/store';
import { SeededRandom, mixSeed } from './ai/random';
import { CHARACTER_IDS, isCharacterId, type CharacterId } from './characters';
import { isDifficulty } from './matchSetup';
import { storage } from './storage';

/**
 * 8 kişilik eleme turnuvası (Faz 6): çeyrek final → yarı final → final. Saf ve deterministik
 * (aynı tohum → aynı kura ve aynı AI vs AI sonuçları); kaydedilip yüklenebilen düz veri.
 *
 * - Slot 0 her zaman oyuncudur; 1–7 yapay zekâ rakipleri. Eşleşmeler (0,1)(2,3)(4,5)(6,7); her
 *   turda kazananlar sırayla eşleşir.
 * - Ödül karakteri (sıradaki kilitli karakter) varsa slot 7'ye konur ve kendi maçlarını hep
 *   kazanır: oyuncu onunla ancak finalde karşılaşır ("patron").
 * - Oyuncunun maçı sahnede oynanır; aynı turdaki diğer maçların sonucu tohumla üretilir.
 */
export type TournamentStatus = 'active' | 'won' | 'lost';

export interface BracketMatch {
  /** Eşleşen slotlar (a < b değil; ağaçtaki sıra). */
  readonly a: number;
  readonly b: number;
  /** [a'nın golleri, b'nin golleri]; henüz oynanmadıysa null. */
  readonly score: readonly [number, number] | null;
}

export interface TournamentState {
  readonly seed: number;
  /** 8 karakter; slot 0 oyuncu. */
  readonly entrants: readonly CharacterId[];
  /** Tur başına rakip zorluğu (giderek artar). */
  readonly difficulties: readonly AiDifficulty[];
  /** Şampiyonlukta açılacak karakter (yoksa null). */
  readonly reward: CharacterId | null;
  /** Kurulan turlar; son tur süren turdur. */
  readonly rounds: readonly (readonly BracketMatch[])[];
  readonly status: TournamentStatus;
}

export const PLAYER_SLOT = 0;
const BOSS_SLOT = TOURNAMENT.entrants - 1;

/** Ayarlardaki zorluğa göre tur zorlukları (ör. Orta → Kolay, Orta, Zor). */
export function roundDifficulties(base: AiDifficulty): AiDifficulty[] {
  const i = AI_DIFFICULTIES.indexOf(base);
  const last = AI_DIFFICULTIES.length - 1;
  return TOURNAMENT.difficultyOffsets.map(
    (off) => AI_DIFFICULTIES[Math.min(last, Math.max(0, i + off))] ?? base,
  );
}

function pairUp(slots: readonly number[]): BracketMatch[] {
  const out: BracketMatch[] = [];
  for (let i = 0; i + 1 < slots.length; i += 2) {
    out.push({ a: slots[i] ?? 0, b: slots[i + 1] ?? 0, score: null });
  }
  return out;
}

/** Fisher–Yates (tohumlu). */
function shuffle<T>(items: readonly T[], rng: SeededRandom): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

export interface TournamentOptions {
  readonly player: CharacterId;
  readonly seed: number;
  readonly difficulty: AiDifficulty;
  /** Şampiyonluk ödülü (sıradaki kilitli karakter); oyuncunun kendisi olamaz. */
  readonly reward: CharacterId | null;
}

export function createTournament(o: TournamentOptions): TournamentState {
  const rng = new SeededRandom(mixSeed(o.seed, 1));
  const reward = o.reward !== null && o.reward !== o.player ? o.reward : null;
  const pool = shuffle(
    CHARACTER_IDS.filter((id) => id !== o.player && id !== reward),
    rng,
  );
  const count = TOURNAMENT.entrants - 1 - (reward ? 1 : 0);
  const opponents = pool.slice(0, count);
  if (reward) opponents.push(reward);
  const entrants = [o.player, ...opponents];
  return {
    seed: o.seed >>> 0,
    entrants,
    difficulties: roundDifficulties(o.difficulty),
    reward,
    rounds: [pairUp(entrants.map((_, i) => i))],
    status: 'active',
  };
}

export function winnerOf(m: BracketMatch): number | null {
  if (!m.score) return null;
  return m.score[0] > m.score[1] ? m.a : m.b;
}

/** Süren turun sırası (0 = çeyrek final). */
export function currentRound(state: TournamentState): number {
  return state.rounds.length - 1;
}

/** Oyuncunun bu turdaki maçı ve rakibi (turnuva bittiyse null). */
export function playerMatch(
  state: TournamentState,
): { round: number; opponentSlot: number; opponent: CharacterId; difficulty: AiDifficulty } | null {
  if (state.status !== 'active') return null;
  const round = currentRound(state);
  const m = state.rounds[round]?.find((x) => x.a === PLAYER_SLOT || x.b === PLAYER_SLOT);
  if (!m) return null;
  const opponentSlot = m.a === PLAYER_SLOT ? m.b : m.a;
  const opponent = state.entrants[opponentSlot];
  const difficulty = state.difficulties[round];
  if (!opponent || !difficulty) return null;
  return { round, opponentSlot, opponent, difficulty };
}

/** Sahnede oynanmayan bir maçın sonucu: ödül karakteri hep kazanır, diğerleri yazı-tura. */
function simulateMatch(m: BracketMatch, rng: SeededRandom, boss: number | null): BracketMatch {
  const { winnerMin, winnerMax } = TOURNAMENT.aiScore;
  const aWins = m.a === boss ? true : m.b === boss ? false : rng.chance(0.5);
  const w = winnerMin + Math.floor(rng.next() * (winnerMax - winnerMin + 1));
  const l = Math.floor(rng.next() * w);
  return { ...m, score: aWins ? [w, l] : [l, w] };
}

/**
 * Oyuncunun maç sonucunu işler: aynı turun diğer maçları sonuçlanır; oyuncu kaybettiyse elenir,
 * finali kazandıysa şampiyon olur, yoksa bir sonraki tur kurulur. Beraberlik (turnuvada altın
 * gol olduğu için gerçekte olmaz) savunma amaçlı mağlubiyet sayılır.
 */
export function applyPlayerResult(
  state: TournamentState,
  playerGoals: number,
  opponentGoals: number,
): TournamentState {
  if (state.status !== 'active') return state;
  const round = currentRound(state);
  const matches = state.rounds[round] ?? [];
  const rng = new SeededRandom(mixSeed(state.seed, round + 2));
  const boss = state.reward ? BOSS_SLOT : null;
  const won = playerGoals > opponentGoals;
  const decided = matches.map((m) => {
    if (m.a === PLAYER_SLOT)
      return {
        ...m,
        score: [
          playerGoals,
          won ? opponentGoals : Math.max(opponentGoals, playerGoals + 1),
        ] as const,
      };
    if (m.b === PLAYER_SLOT)
      return {
        ...m,
        score: [
          won ? opponentGoals : Math.max(opponentGoals, playerGoals + 1),
          playerGoals,
        ] as const,
      };
    return simulateMatch(m, rng, boss);
  });
  const rounds = [...state.rounds.slice(0, round), decided];
  if (!won) return { ...state, rounds, status: 'lost' };
  if (round >= TOURNAMENT.rounds - 1) return { ...state, rounds, status: 'won' };
  const winners = decided.map((m) => winnerOf(m) ?? m.a);
  return { ...state, rounds: [...rounds, pairUp(winners)], status: 'active' };
}

/** Slot hangi turda elendi? (Elenmediyse null.) */
export function eliminatedIn(state: TournamentState, slot: number): number | null {
  for (let r = 0; r < state.rounds.length; r++) {
    const m = state.rounds[r]?.find((x) => x.a === slot || x.b === slot);
    if (!m) return null;
    const w = winnerOf(m);
    if (w !== null && w !== slot) return r;
  }
  return null;
}

// ───────────────────────────── Kayıt ─────────────────────────────

function parseMatch(value: unknown): BracketMatch | null {
  if (!isRecord(value)) return null;
  const { a, b, score } = value;
  const slot = (n: unknown): n is number =>
    typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < TOURNAMENT.entrants;
  if (!slot(a) || !slot(b) || a === b) return null;
  if (score === null) return { a, b, score: null };
  if (!Array.isArray(score) || score.length !== 2) return null;
  const [x, y] = score as unknown[];
  const goal = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;
  if (!goal(x) || !goal(y) || x === y) return null;
  return { a, b, score: [x, y] };
}

/**
 * Kayıttan turnuva; herhangi bir tutarsızlıkta null (yarım kalmış bozuk bir turnuvayı "onarmak"
 * yerine yenisi başlatılır): 8 farklı karakter, geçerli zorluklar, tur yapısı ağaçla uyumlu.
 */
export function parseTournament(value: unknown): TournamentState | null {
  if (!isRecord(value)) return null;
  const { seed, entrants, difficulties, reward, rounds, status } = value;
  if (typeof seed !== 'number' || !Number.isInteger(seed) || seed < 0) return null;
  if (!Array.isArray(entrants) || entrants.length !== TOURNAMENT.entrants) return null;
  if (!entrants.every(isCharacterId) || new Set(entrants).size !== entrants.length) return null;
  if (!Array.isArray(difficulties) || difficulties.length !== TOURNAMENT.rounds) return null;
  if (!difficulties.every(isDifficulty)) return null;
  if (reward !== null && !(isCharacterId(reward) && entrants[BOSS_SLOT] === reward)) return null;
  if (status !== 'active' && status !== 'won' && status !== 'lost') return null;
  if (!Array.isArray(rounds) || rounds.length < 1 || rounds.length > TOURNAMENT.rounds) return null;
  const parsed: BracketMatch[][] = [];
  let expected = entrants.map((_, i) => i);
  for (let r = 0; r < rounds.length; r++) {
    const list: unknown = rounds[r];
    if (!Array.isArray(list) || list.length !== expected.length / 2) return null;
    const ms = list.map(parseMatch);
    if (ms.some((m) => m === null)) return null;
    const round = ms as BracketMatch[];
    // Eşleşmeler bir önceki turun kazananlarıyla (ya da başlangıç sırasıyla) uyumlu olmalı.
    for (let i = 0; i < round.length; i++) {
      const m = round[i];
      if (!m || m.a !== expected[i * 2] || m.b !== expected[i * 2 + 1]) return null;
    }
    const last = r === rounds.length - 1;
    const allPlayed = round.every((m) => m.score !== null);
    if (!last && !allPlayed) return null;
    if (last && status === 'active' && round.some((m) => m.score !== null)) return null;
    parsed.push(round);
    expected = round.map((m) => winnerOf(m) ?? m.a);
  }
  return {
    seed,
    entrants,
    difficulties,
    reward,
    rounds: parsed,
    status,
  };
}

export function loadTournament(store: KeyValueStore): TournamentState | null {
  return parseTournament(readJson(store, STORAGE.keys.tournament));
}

export function saveTournament(store: KeyValueStore, state: TournamentState | null): void {
  if (state) writeJson(store, STORAGE.keys.tournament, state);
  else removeKey(store, STORAGE.keys.tournament);
}

/** Tarayıcı kaydındaki süren turnuva (yoksa ya da bozuksa null). */
export function getSavedTournament(): TournamentState | null {
  return loadTournament(storage);
}

/** Turnuvayı kaydeder; null → kaydı siler. */
export function setSavedTournament(state: TournamentState | null): void {
  saveTournament(storage, state);
}
