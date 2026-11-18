import { describe, expect, it } from 'vitest';
import { PROGRESS, SETTINGS, STORAGE } from '../config/gameConfig';
import { CHARACTER_IDS, STARTER_CHARACTERS, UNLOCK_ORDER } from '../game/characters';
import {
  cycleOption,
  DEFAULT_SETTINGS,
  loadSettings,
  parseSettings,
  saveSettings,
} from './gameSettings';
import {
  DEFAULT_PROGRESS,
  EMPTY_STATS,
  loadProgress,
  nextUnlock,
  parseProgress,
  recordMatch,
  saveProgress,
  unlockNext,
} from './progress';
import { readJson, sanitizeCounter, type KeyValueStore } from './store';

function memoryStore(init: Record<string, string> = {}): KeyValueStore & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(init));
  return {
    data,
    get: (k) => data.get(k) ?? null,
    set: (k, v) => {
      data.set(k, v);
    },
    remove: (k) => {
      data.delete(k);
    },
  };
}

/** Her erişimde hata fırlatan depo (gizli pencere, kapalı site verisi). */
const brokenStore: KeyValueStore = {
  get: () => {
    throw new Error('SecurityError');
  },
  set: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('Kayıt — güvenli okuma', () => {
  it('bozuk JSON, eksik kayıt ve hata fırlatan depo undefined döner', () => {
    expect(readJson(memoryStore({ x: '{bozuk' }), 'x')).toBeUndefined();
    expect(readJson(memoryStore(), 'x')).toBeUndefined();
    expect(readJson(brokenStore, 'x')).toBeUndefined();
    expect(readJson(memoryStore({ x: '{"a":1}' }), 'x')).toEqual({ a: 1 });
  });

  it('sayaçlar negatif olmayan tam sayı ve üst sınırlı', () => {
    expect(sanitizeCounter(5.9, 100)).toBe(5);
    expect(sanitizeCounter(-3, 100)).toBe(0);
    expect(sanitizeCounter(1e12, 100)).toBe(100);
    for (const bad of [Number.NaN, Infinity, '7', null, undefined, {}]) {
      expect(sanitizeCounter(bad, 100)).toBe(0);
    }
  });
});

describe('Kayıt — oyun ayarları', () => {
  it('kayıt yoksa ya da bozuksa varsayılanlar', () => {
    expect(loadSettings(memoryStore())).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(memoryStore({ [STORAGE.keys.settings]: 'çöp' }))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(brokenStore)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings([1, 2, 3])).toEqual(DEFAULT_SETTINGS);
  });

  it('her alan ayrı doğrulanır: geçerli olan korunur, geçersiz olan varsayılana döner', () => {
    expect(parseSettings({ difficulty: 'hard', matchSeconds: 77, screenShake: 'evet' })).toEqual({
      ...DEFAULT_SETTINGS,
      difficulty: 'hard',
    });
    expect(
      parseSettings({ difficulty: 'imkansız', matchSeconds: 120, screenShake: false }),
    ).toEqual({ ...DEFAULT_SETTINGS, matchSeconds: 120, screenShake: false });
  });

  it('eski zorluk anahtarından geçiş; kaydet → yükle aynı ayarı verir', () => {
    const store = memoryStore({ [STORAGE.keys.aiDifficulty]: 'easy' });
    expect(loadSettings(store).difficulty).toBe('easy');
    const s = { difficulty: 'hard', matchSeconds: 60, screenShake: false } as const;
    saveSettings(store, s);
    expect(loadSettings(store)).toEqual(s);
  });

  it('seçenek döngüsü uçlarda sarar; bilinmeyen değer ilk seçeneğe gider', () => {
    const d = SETTINGS.matchDurations;
    expect(cycleOption(d, 90, 1)).toBe(120);
    expect(cycleOption(d, 120, 1)).toBe(60);
    expect(cycleOption(d, 60, -1)).toBe(120);
    expect(cycleOption(d, 45, 1)).toBe(60);
  });
});

describe('Kayıt — ilerleme (açılan karakterler, istatistikler)', () => {
  it('kayıt yoksa ya da bozuksa: başlangıç karakterleri açık, sayaçlar sıfır', () => {
    expect(loadProgress(memoryStore())).toEqual(DEFAULT_PROGRESS);
    expect(loadProgress(memoryStore({ [STORAGE.keys.progress]: '{"unlocked":' }))).toEqual(
      DEFAULT_PROGRESS,
    );
    expect(parseProgress('metin')).toEqual(DEFAULT_PROGRESS);
    expect(parseProgress({ unlocked: 'kor', stats: [] })).toEqual(DEFAULT_PROGRESS);
  });

  it('bilinmeyen kimlikler atılır, başlangıç karakterleri silinemez, sıra kanoniktir', () => {
    const p = parseProgress({ unlocked: ['toprak', 'yok', 42, 'sis', 'toprak'] });
    expect(p.unlocked).toEqual(
      CHARACTER_IDS.filter(
        (id) => STARTER_CHARACTERS.includes(id) || id === 'sis' || id === 'toprak',
      ),
    );
    for (const id of STARTER_CHARACTERS) expect(p.unlocked).toContain(id);
  });

  it('bozuk sayaçlar sıfırlanır, geçerli olanlar korunur', () => {
    const p = parseProgress({
      stats: {
        matches: 12,
        wins: -4,
        losses: 'çok',
        goals: 3.7,
        conceded: 1e15,
        tournamentsWon: 2,
      },
    });
    expect(p.stats).toEqual({
      matches: 12,
      wins: 0,
      losses: 0,
      goals: 3,
      conceded: PROGRESS.maxCounter,
      tournamentsWon: 2,
    });
  });

  it('kaydet → yükle aynı ilerlemeyi verir', () => {
    const store = memoryStore();
    const p = {
      unlocked: [...STARTER_CHARACTERS, 'demir' as const],
      stats: { ...EMPTY_STATS, wins: 3 },
    };
    saveProgress(store, p);
    expect(loadProgress(store)).toEqual(parseProgress(p));
  });

  it('maç sonuçları: CPU/turnuvada galibiyet-mağlubiyet ve goller; 2 oyuncuda toplam gol; antrenman yok', () => {
    let s = recordMatch(EMPTY_STATS, { mode: 'cpu', score: [3, 1], winner: 0 });
    s = recordMatch(s, { mode: 'tournament', score: [0, 2], winner: 1 });
    s = recordMatch(s, { mode: 'versus', score: [4, 5], winner: 1 });
    s = recordMatch(s, { mode: 'training', score: [9, 0], winner: null });
    expect(s).toEqual({
      matches: 3,
      wins: 1,
      losses: 1,
      goals: 12,
      conceded: 3,
      tournamentsWon: 0,
    });
  });

  it('kilitler sırayla açılır; hepsi açıkken null', () => {
    let p = DEFAULT_PROGRESS;
    const opened: string[] = [];
    for (let i = 0; i < UNLOCK_ORDER.length + 1; i++) {
      const r = unlockNext(p);
      p = r.progress;
      if (r.unlocked) opened.push(r.unlocked);
    }
    expect(opened).toEqual(UNLOCK_ORDER);
    expect(p.unlocked).toEqual(CHARACTER_IDS);
    expect(nextUnlock(p)).toBeNull();
    expect(new Set([...STARTER_CHARACTERS, ...UNLOCK_ORDER]).size).toBe(CHARACTER_IDS.length);
  });
});
