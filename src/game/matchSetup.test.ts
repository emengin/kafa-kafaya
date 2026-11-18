import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MATCH_SETUP,
  isCpuMode,
  isDifficulty,
  isMatchMode,
  resolveMatchSetup,
} from './matchSetup';

const NO_DEV = { cpu: null, cpu1: null, seed: null } as const;

describe('Maç kurulumu', () => {
  it('veri yoksa ya da geçersizse varsayılanlar (2 oyuncu, Orta)', () => {
    expect(resolveMatchSetup(undefined, NO_DEV)).toEqual(DEFAULT_MATCH_SETUP);
    expect(resolveMatchSetup({}, NO_DEV)).toEqual(DEFAULT_MATCH_SETUP);
    expect(
      resolveMatchSetup({ mode: 'online', difficulty: 'insane', p1Ai: 3, seed: 'x' }, NO_DEV),
    ).toEqual(DEFAULT_MATCH_SETUP);
  });

  it('menüden gelen CPU kurulumu korunur', () => {
    expect(resolveMatchSetup({ mode: 'cpu', difficulty: 'hard', seed: 9 }, NO_DEV)).toEqual({
      mode: 'cpu',
      difficulty: 'hard',
      p1Ai: null,
      seed: 9,
      characters: DEFAULT_MATCH_SETUP.characters,
      durationSeconds: DEFAULT_MATCH_SETUP.durationSeconds,
    });
  });

  it('karakterler korunur; geçersizse varsayılan; ?c1= / ?c2= önceliklidir', () => {
    const chosen = resolveMatchSetup({ characters: ['sis', 'kaya'] }, NO_DEV);
    expect(chosen.characters).toEqual(['sis', 'kaya']);
    expect(resolveMatchSetup({ characters: ['sis'] }, NO_DEV).characters).toEqual(
      DEFAULT_MATCH_SETUP.characters,
    );
    expect(resolveMatchSetup({ characters: ['sis', 'yok'] }, NO_DEV).characters).toEqual(
      DEFAULT_MATCH_SETUP.characters,
    );
    const dev = resolveMatchSetup(
      { characters: ['sis', 'kaya'] },
      { ...NO_DEV, c1: null, c2: 'yay' },
    );
    expect(dev.characters).toEqual(['sis', 'yay']);
  });

  it('geliştirici bayrakları önceliklidir (?cpu=, ?cpu1=, ?seed=)', () => {
    const setup = resolveMatchSetup({ mode: 'versus' }, { cpu: 'easy', cpu1: 'hard', seed: 5 });
    expect(setup).toEqual({
      mode: 'cpu',
      difficulty: 'easy',
      p1Ai: 'hard',
      seed: 5,
      characters: DEFAULT_MATCH_SETUP.characters,
      durationSeconds: DEFAULT_MATCH_SETUP.durationSeconds,
    });
  });

  it('isDifficulty yalnızca bilinen seviyeleri kabul eder', () => {
    expect(['easy', 'medium', 'hard'].every(isDifficulty)).toBe(true);
    expect(isDifficulty('Easy')).toBe(false);
    expect(isDifficulty(null)).toBe(false);
  });

  it('Faz 6 modları (turnuva, antrenman) ve maç süresi korunur; geçersiz süre varsayılana döner', () => {
    expect(resolveMatchSetup({ mode: 'tournament' }, NO_DEV).mode).toBe('tournament');
    expect(resolveMatchSetup({ mode: 'training' }, NO_DEV).mode).toBe('training');
    expect(resolveMatchSetup({ durationSeconds: 60 }, NO_DEV).durationSeconds).toBe(60);
    for (const bad of [0, -5, Number.NaN, Infinity, '90', null]) {
      expect(resolveMatchSetup({ durationSeconds: bad }, NO_DEV).durationSeconds).toBe(
        DEFAULT_MATCH_SETUP.durationSeconds,
      );
    }
    expect(['cpu', 'versus', 'tournament', 'training'].every(isMatchMode)).toBe(true);
    expect(isMatchMode('online')).toBe(false);
    expect(isCpuMode('cpu') && isCpuMode('tournament')).toBe(true);
    expect(isCpuMode('versus') || isCpuMode('training')).toBe(false);
  });
});
