import { I18N, STORAGE } from '../config/gameConfig';
import { storage } from '../game/storage';
import { en, tr, type StringKey } from './strings';

export type Language = 'tr' | 'en';
export type { StringKey };

const DICTIONARIES: Record<Language, Record<StringKey, string>> = { tr, en };

function isLanguage(value: string | null): value is Language {
  return value === 'tr' || value === 'en';
}

const saved = storage.get(STORAGE.keys.language);
let current: Language = isLanguage(saved) ? saved : I18N.defaultLanguage;

export function getLanguage(): Language {
  return current;
}

const listeners = new Set<(language: Language) => void>();

export function setLanguage(language: Language): void {
  current = language;
  storage.set(STORAGE.keys.language, language);
  for (const fn of listeners) fn(language);
}

/** Dil değişince çağrılır (sahne dışı DOM metinleri: dikey ekran uyarısı, tam ekran düğmesi). */
export function onLanguageChange(fn: (language: Language) => void): void {
  listeners.add(fn);
}

function locale(): string {
  return current === 'tr' ? 'tr-TR' : 'en-US';
}

/** Ondalık sayı etkin dilin biçiminde (Türkçede virgül): 1.8 → "1,8". */
export function formatDecimal(value: number): string {
  return value.toLocaleString(locale(), { maximumFractionDigits: 1 });
}

/** Etkin dildeki metni döndürür. */
export function t(key: StringKey): string {
  return DICTIONARIES[current][key];
}

/** Metni yer tutucularla doldurur: `format('end.winner', { name: 'Oyuncu 1' })`. */
export function format(key: StringKey, vars: Readonly<Record<string, string | number>>): string {
  return t(key).replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

/** Etkin dile göre büyük harf (Türkçede i → İ). */
export function upper(text: string): string {
  return text.toLocaleUpperCase(locale());
}
