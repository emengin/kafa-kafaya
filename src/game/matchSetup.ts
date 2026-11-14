import { AI_DIFFICULTIES, type AiDifficulty } from '../config/gameConfig';

/** Maç modu: insan vs CPU ya da aynı klavyede iki kişi. */
export type MatchMode = 'cpu' | 'versus';

/** Menünün maç sahnesine verdiği kurulum (sahne yeniden başlatılınca aynen korunur). */
export interface MatchSetup {
  readonly mode: MatchMode;
  /** CPU modunda P2'nin zorluğu. */
  readonly difficulty: AiDifficulty;
  /** Geliştirici: P1 de yapay zekâ olsun (AI vs AI izleme); null = insan. */
  readonly p1Ai: AiDifficulty | null;
  /** Yapay zekâ rastgelelik tohumu; null = her maçta rastgele. */
  readonly seed: number | null;
}

export const DEFAULT_MATCH_SETUP: MatchSetup = {
  mode: 'versus',
  difficulty: 'medium',
  p1Ai: null,
  seed: null,
};

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
  },
): MatchSetup {
  const input = (typeof data === 'object' && data !== null ? data : {}) as Partial<
    Record<keyof MatchSetup, unknown>
  >;
  let setup: MatchSetup = {
    mode: input.mode === 'cpu' ? 'cpu' : DEFAULT_MATCH_SETUP.mode,
    difficulty: isDifficulty(input.difficulty) ? input.difficulty : DEFAULT_MATCH_SETUP.difficulty,
    p1Ai: isDifficulty(input.p1Ai) ? input.p1Ai : null,
    seed: typeof input.seed === 'number' && Number.isFinite(input.seed) ? input.seed : null,
  };
  if (dev.cpu) setup = { ...setup, mode: 'cpu', difficulty: dev.cpu };
  if (dev.cpu1) setup = { ...setup, mode: 'cpu', p1Ai: dev.cpu1 };
  if (dev.seed !== null) setup = { ...setup, seed: dev.seed };
  return setup;
}
