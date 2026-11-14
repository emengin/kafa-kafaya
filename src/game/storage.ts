import { STORAGE } from '../config/gameConfig';

/**
 * localStorage için güvenli sarmalayıcı. Gizli pencerede, kapalı site verisinde veya
 * kota dolduğunda erişim hata fırlatabilir; oyun bu durumda kayıtsız devam eder.
 */
export const storage = {
  get(key: string): string | null {
    try {
      return globalThis.localStorage.getItem(STORAGE.prefix + key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      globalThis.localStorage.setItem(STORAGE.prefix + key, value);
    } catch {
      // Kayıt yapılamıyorsa sessizce yok say.
    }
  },
};
