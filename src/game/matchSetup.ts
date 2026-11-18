import { AI_DIFFICULTIES, MATCH, type AiDifficulty } from '../config/gameConfig';
import { isCharacterId, type CharacterId } from './characters';

/**
 * Maç modu: insan vs CPU (Hızlı Maç), aynı cihazda iki kişi, turnuva maçı (insan vs CPU, sonuç
 * turnuvaya yazılır) ya da antrenman (süresiz, rakipsiz/kukla rakipli).
 */
export type MatchMode = 'cpu' | 'versus' | 'tournament' | 'training';

export const MATCH_MODES: readonly MatchMode[] = ['cpu', 'versus', 'tournament', 'training'];

export function isMatchMode(value: unknown): value is MatchMode {
  return typeof value === 'string' && (MATCH_MODES as readonly string[]).includes(value);
}

/** P2 yapay zekâ mı? (Hızlı Maç ve turnuva.) */
export function isCpuMode(mode: MatchMode): boolean {
  return mode === 'cpu' || mode === 'tournament';
}

/** Menünün maç sahnesine verdiği kurulum (sahne yeniden başlatılınca aynen korunur). */
export interface MatchSetup {
  readonly mode: MatchMode;
  /** CPU modunda P2'nin zorluğu. */
  readonly difficulty: AiDifficulty;
  /** Geliştirici: P1 de yapay zekâ olsun (AI vs AI izleme); null = insan. */
  readonly p1Ai: AiDifficulty | null;
  /** Yapay zekâ rastgelelik tohumu; null = her maçta rastgele. */
  readonly seed: number | null;
  /** [P1, P2] karakterleri. */
  readonly characters: readonly [CharacterId, CharacterId];
  /** Maç süresi (sn; ayarlardan). Antrenmanda kullanılmaz (süresiz). */
  readonly durationSeconds: number;
}

export const DEFAULT_MATCH_SETUP: MatchSetup = {
  mode: 'versus',
  difficulty: 'medium',
  p1Ai: null,
  seed: null,
  characters: ['kor', 'ayaz'],
  durationSeconds: MATCH.durationSeconds,
};

function parseCharacters(value: unknown): readonly [CharacterId, CharacterId] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [a, b] = value as unknown[];
  return isCharacterId(a) && isCharacterId(b) ? [a, b] : null;
}

export function isDifficulty(value: unknown): value is AiDifficulty {
  return typeof value === 'string' && (AI_DIFFICULTIES as readonly string[]).includes(value);
}

/**
 * Sahneye gelen (doğrulanmamış) veriyi ve geliştirici bayraklarını tam bir kurulumda birleştirir.
 * Öncelik: geliştirici bayrakları > sahne verisi > varsayılanlar.
 */
export function resolveMatchSetup(
  data: unknown,
  dev: {
    readonly cpu: AiDifficulty | null;
    readonly cpu1: AiDifficulty | null;
    readonly seed: number | null;
    readonly c1?: CharacterId | null;
    readonly c2?: CharacterId | null;
  },
): MatchSetup {
  const input = (typeof data === 'object' && data !== null ? data : {}) as Partial<
    Record<keyof MatchSetup, unknown>
  >;
  const duration = input.durationSeconds;
  let setup: MatchSetup = {
    mode: isMatchMode(input.mode) ? input.mode : DEFAULT_MATCH_SETUP.mode,
    difficulty: isDifficulty(input.difficulty) ? input.difficulty : DEFAULT_MATCH_SETUP.difficulty,
    p1Ai: isDifficulty(input.p1Ai) ? input.p1Ai : null,
    seed: typeof input.seed === 'number' && Number.isFinite(input.seed) ? input.seed : null,
    characters: parseCharacters(input.characters) ?? DEFAULT_MATCH_SETUP.characters,
    durationSeconds:
      typeof duration === 'number' && Number.isFinite(duration) && duration > 0
        ? duration
        : DEFAULT_MATCH_SETUP.durationSeconds,
  };
  if (dev.cpu) setup = { ...setup, mode: 'cpu', difficulty: dev.cpu };
  if (dev.cpu1) setup = { ...setup, mode: 'cpu', p1Ai: dev.cpu1 };
  if (dev.seed !== null) setup = { ...setup, seed: dev.seed };
  if (dev.c1 || dev.c2) {
    const [a, b] = setup.characters;
    setup = { ...setup, characters: [dev.c1 ?? a, dev.c2 ?? b] };
  }
  return setup;
}
