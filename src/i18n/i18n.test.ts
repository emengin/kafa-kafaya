import { describe, expect, it } from 'vitest';
import {
  format,
  formatDecimal,
  getLanguage,
  onLanguageChange,
  setLanguage,
  t,
  upper,
} from './index';
import { en, tr } from './strings';

describe('i18n', () => {
  it('varsayılan dil Türkçedir (localStorage yokken)', () => {
    expect(getLanguage()).toBe('tr');
    expect(t('pause.resume')).toBe('Devam');
  });

  it('dil değiştirilebilir ve depolama yokken hata fırlatmaz', () => {
    setLanguage('en');
    expect(t('pause.resume')).toBe('Resume');
    setLanguage('tr');
  });

  it('format yer tutucuları doldurur, bilinmeyenleri olduğu gibi bırakır', () => {
    expect(format('end.winner', { name: 'Oyuncu 1' })).toBe('Oyuncu 1 KAZANDI!');
    expect(format('end.winner', {})).toBe('{name} KAZANDI!');
  });

  it('upper Türkçede noktalı i harfini korur', () => {
    expect(upper('bitti iyi')).toBe('BİTTİ İYİ');
    setLanguage('en');
    expect(upper('bitti')).toBe('BITTI');
    setLanguage('tr');
  });

  it('iki dilde de aynı anahtarlar vardır ve boş metin yoktur', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(tr).sort());
    expect(Object.values(en).every((s) => s.length > 0)).toBe(true);
  });
});

describe('i18n — Faz 6', () => {
  it('ondalık sayı dilin biçiminde; dil dinleyicisi çağrılır', () => {
    const seen: string[] = [];
    onLanguageChange((l) => seen.push(l));
    setLanguage('tr');
    expect(formatDecimal(1.8)).toBe('1,8');
    expect(formatDecimal(8)).toBe('8');
    setLanguage('en');
    expect(formatDecimal(1.8)).toBe('1.8');
    setLanguage('tr');
    expect(seen).toEqual(['tr', 'en', 'tr']);
  });
});
