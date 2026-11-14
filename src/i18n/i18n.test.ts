import { describe, expect, it } from 'vitest';
import { getLanguage, setLanguage, t } from './index';
import { en, tr } from './strings';

describe('i18n', () => {
  it('varsayılan dil Türkçedir (localStorage yokken)', () => {
    expect(getLanguage()).toBe('tr');
    expect(t('menu.clickToStart')).toBe('Başlamak için tıkla');
  });

  it('dil değiştirilebilir ve depolama yokken hata fırlatmaz', () => {
    setLanguage('en');
    expect(t('menu.clickToStart')).toBe('Click to start');
    setLanguage('tr');
  });

  it('iki dilde de aynı anahtarlar vardır ve boş metin yoktur', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(tr).sort());
    expect(Object.values(en).every((s) => s.length > 0)).toBe(true);
  });
});
