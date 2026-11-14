import { describe, expect, it } from 'vitest';
import { EMPTY_INPUT, mergeInputs } from './InputState';

describe('InputState', () => {
  it('EMPTY_INPUT tüm tuşları bırakılmış kabul eder ve değiştirilemez', () => {
    expect(Object.values(EMPTY_INPUT).every((v) => !v)).toBe(true);
    expect(Object.isFrozen(EMPTY_INPUT)).toBe(true);
  });

  it('mergeInputs alanları VEYA ile birleştirir', () => {
    const merged = mergeInputs({ ...EMPTY_INPUT, left: true }, { ...EMPTY_INPUT, kick: true });
    expect(merged).toEqual({ left: true, right: false, jump: false, kick: true, super: false });
  });
});
