import { describe, expect, it } from 'vitest';
import { parseConsent, needsPrompt, isGranted, NO_CONSENT } from './consent';
import {
  ErrorBudget,
  parseStack,
  sanitizeMessage,
  shortFile,
  signature,
  toReport,
  type JsErrorReport,
} from './errors';

const LIMITS = { maxMessageLength: 40, maxStackFrames: 3 };

describe('JS hata raporu (Faz 2.8)', () => {
  it('V8 yığınını karelere ayırır, kökü atar', () => {
    const stack = [
      'TypeError: x is undefined',
      '    at Kt.update (https://localhost/assets/index-AbC123.js:1:23456)',
      '    at https://localhost/assets/phaser-XyZ.js:1:999',
      '    at new Foo (https://localhost/assets/index-AbC123.js?v=2:3:4)',
      '    at bar (https://localhost/assets/index-AbC123.js:5:6)',
    ].join('\n');
    const frames = parseStack(stack, LIMITS.maxStackFrames);
    expect(frames).toEqual([
      { fn: 'Kt.update', file: 'assets/index-AbC123.js', line: 1, col: 23456 },
      { fn: '<anonim>', file: 'assets/phaser-XyZ.js', line: 1, col: 999 },
      { fn: 'new Foo', file: 'assets/index-AbC123.js', line: 3, col: 4 },
    ]);
  });

  it('JavaScriptCore biçimini de okur', () => {
    const frames = parseStack(
      'update@https://localhost/assets/index.js:1:20\n@https://x/a.js:2:3',
      5,
    );
    expect(frames).toEqual([
      { fn: 'update', file: 'assets/index.js', line: 1, col: 20 },
      { fn: '<anonim>', file: 'a.js', line: 2, col: 3 },
    ]);
  });

  it('mesaj kısaltılır, adreslerin kökü atılır', () => {
    expect(sanitizeMessage('hata https://localhost/assets/a.js içinde', 100)).toBe(
      'hata assets/a.js içinde',
    );
    const long = sanitizeMessage('a'.repeat(100), 10);
    expect(long).toHaveLength(10);
    expect(shortFile('capacitor://localhost/x/y.js#z')).toBe('x/y.js');
  });

  it('Error olmayan değerin içeriği rapora girmez (yalnızca türü)', () => {
    const r = toReport('promise_rejection', { kullanici: 'gizli' }, LIMITS);
    expect(r.name).toBe('UnhandledRejection');
    expect(r.message).not.toContain('gizli');
    expect(toReport('js_error', 'metin', LIMITS).message).not.toContain('metin');
  });

  it('aynı hata oturumda bir kez, toplam sınırlı', () => {
    const make = (m: string): JsErrorReport => toReport('js_error', new Error(m), LIMITS);
    const budget = new ErrorBudget(2);
    const a = make('a');
    expect(budget.allow(a)).toBe(true);
    expect(signature(make('a'))).toBe(signature(a));
    expect(budget.allow(make('a'))).toBe(false);
    expect(budget.allow(make('b'))).toBe(true);
    expect(budget.allow(make('c'))).toBe(false);
  });
});

describe('geçici rıza (Faz 2.8)', () => {
  it('geçersiz ya da eksik veri = rıza yok', () => {
    expect(parseConsent(null)).toEqual(NO_CONSENT);
    expect(parseConsent({ analytics: 'yes', crash: true })).toEqual(NO_CONSENT);
    expect(parseConsent({ analytics: 'granted' })).toEqual({
      analytics: 'granted',
      crash: 'unset',
    });
  });

  it('iki karardan biri eksikse ekran gösterilir; yalnızca granted açar', () => {
    expect(needsPrompt(NO_CONSENT)).toBe(true);
    expect(needsPrompt({ analytics: 'denied', crash: 'unset' })).toBe(true);
    expect(needsPrompt({ analytics: 'denied', crash: 'denied' })).toBe(false);
    expect(isGranted('unset')).toBe(false);
    expect(isGranted('denied')).toBe(false);
    expect(isGranted('granted')).toBe(true);
  });
});
