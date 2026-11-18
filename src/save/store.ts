/** Kalıcı anahtar–değer deposu (tarayıcıda `storage`; testlerde bellek içi sahte depo). */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  /** Anahtarı siler (yoksa boş yazar). */
  remove?(key: string): void;
}

/**
 * JSON okur. Kayıt yoksa, ayrıştırılamıyorsa ya da depo hata verirse `undefined`: çağıran her
 * alanı ayrıca doğrular ve geçersiz olanı güvenli varsayılana döndürür (bozuk veri oyunu
 * düşürmez).
 */
export function readJson(store: KeyValueStore, key: string): unknown {
  let raw: string | null;
  try {
    raw = store.get(key);
  } catch {
    return undefined;
  }
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

export function writeJson(store: KeyValueStore, key: string, value: unknown): void {
  try {
    store.set(key, JSON.stringify(value));
  } catch {
    // Kayıt yapılamıyorsa (kota, gizli pencere) oyun kayıtsız sürer.
  }
}

export function removeKey(store: KeyValueStore, key: string): void {
  try {
    if (store.remove) store.remove(key);
    else store.set(key, '');
  } catch {
    // Yok say.
  }
}

/** Düz nesne mi? (Dizi ve null değil.) */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Sayaç: negatif olmayan tam sayı ve üst sınırın altında; değilse 0. */
export function sanitizeCounter(value: unknown, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  const n = Math.floor(value);
  return n < 0 ? 0 : Math.min(n, max);
}
