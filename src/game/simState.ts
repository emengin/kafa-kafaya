import type { MatchEndReason, PlayerIndex } from './types';
import type { MatchPhase } from './rules/MatchFlow';
import type { Balloon } from './powerups';

/**
 * Simülasyonun **tam** durumu (Faz 7, gol tekrarı): `GameSim.saveState` ile alınır,
 * `GameSim.loadState` ile birebir geri yüklenir. Aynı durumdan aynı girdilerle ilerleyen
 * simülasyon aynı sonucu verir (determinizm); tekrar sistemi yalnızca ara durumları (anahtar
 * kareler) ve girdileri saklar.
 *
 * Oyuncu ve top alanları genel kopyayla taşınır (sınıfın tüm sayı/mantık/metin alanları); böylece
 * ileride eklenen bir alan unutulamaz. Sabitler (karakter donanımı, kurallar) kopyalanmaz.
 */
export type FieldBag = Record<string, unknown>;

export interface MatchState {
  phase: MatchPhase;
  overtime: boolean;
  timeLeft: number;
  phaseTime: number;
  score: [number, number];
  lastScorer: PlayerIndex | -1;
  winner: PlayerIndex | null;
  endReason: MatchEndReason | null;
}

export interface SimState {
  tick: number;
  match: MatchState;
  players: [FieldBag, FieldBag];
  ball: FieldBag;
  decoys: { ball: FieldBag; ttl: number }[];
  balloon: Balloon | null;
  balloonTimer: number;
  goalMouths: [number, number];
  rngState: number;
  solo: boolean;
}

/** Nesne alanı (alt nesne) kopyalanacaklar; diğer nesne alanları sabit sayılır ve atlanır. */
const NESTED = new Set(['powerUps']);

/**
 * `source`'un düz alanlarını `target`'a kopyalar (sayı, mantık, metin, null); `NESTED`
 * listesindeki alt nesneleri alan alan kopyalar. Ayırma yapmaz (hedef yeniden kullanılır).
 *
 * `for…in`: `Object.keys` gibi her çağrıda anahtar dizisi kurmaz (rollback'te kare başına onlarca
 * kopya). Sınıf yöntemleri ve erişimcileri numaralandırılamaz olduğu için yalnızca kendi alanları
 * gezilir; sıra ES2020'den beri tanımlı (ekleme sırası), motorlar arasında aynı.
 */
export function copyFields(target: object, source: object): void {
  const t = target as FieldBag;
  const s = source as FieldBag;
  for (const key in s) {
    const value = s[key];
    if (value === null || typeof value !== 'object') {
      t[key] = value;
    } else if (NESTED.has(key)) {
      const into = t[key];
      if (into !== null && typeof into === 'object') Object.assign(into, value);
      else t[key] = { ...(value as FieldBag) };
    }
  }
}
