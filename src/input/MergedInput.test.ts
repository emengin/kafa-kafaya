import { describe, expect, it } from 'vitest';
import { EMPTY_INPUT, type InputState } from './InputState';
import { MergedInputSource } from './MergedInput';
import { ScriptedInputSource } from './ScriptedInput';

const input = (p: Partial<InputState>): InputState => ({ ...EMPTY_INPUT, ...p });

describe('MergedInputSource', () => {
  it('kaynakları mantıksal VEYA ile birleştirir, adım numarasını iletir', () => {
    const a = new ScriptedInputSource([input({ left: true }), input({ kick: true })]);
    const b = new ScriptedInputSource([input({ jump: true }), input({ super: true })]);
    const merged = new MergedInputSource(a, b);
    expect(merged.read(0)).toEqual(input({ left: true, jump: true }));
    expect(merged.read(1)).toEqual(input({ kick: true, super: true }));
    expect(merged.read(2)).toEqual(EMPTY_INPUT);
  });

  it('kaynaksız kullanım hata verir', () => {
    expect(() => new MergedInputSource().read(0)).toThrow();
  });
});
