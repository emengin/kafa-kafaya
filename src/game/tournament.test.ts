import { describe, expect, it } from 'vitest';
import { STORAGE, TOURNAMENT } from '../config/gameConfig';
import type { KeyValueStore } from '../save/store';
import {
  applyPlayerResult,
  createTournament,
  currentRound,
  eliminatedIn,
  loadTournament,
  parseTournament,
  PLAYER_SLOT,
  playerMatch,
  roundDifficulties,
  saveTournament,
  winnerOf,
  type TournamentState,
} from './tournament';

const BASE = { player: 'kor', seed: 1234, difficulty: 'medium', reward: 'sis' } as const;

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
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

/** Oyuncu her maçı `score` ile bitirir. */
function playThrough(state: TournamentState, score: [number, number]): TournamentState[] {
  const out = [state];
  let s = state;
  while (s.status === 'active') {
    s = applyPlayerResult(s, score[0], score[1]);
    out.push(s);
  }
  return out;
}

describe('Turnuva — kura ve zorluk', () => {
  it('8 farklı karakter; oyuncu slot 0, ödül karakteri slot 7 (finalde karşılaşılır)', () => {
    const t = createTournament(BASE);
    expect(t.entrants).toHaveLength(TOURNAMENT.entrants);
    expect(new Set(t.entrants).size).toBe(TOURNAMENT.entrants);
    expect(t.entrants[PLAYER_SLOT]).toBe('kor');
    expect(t.entrants[TOURNAMENT.entrants - 1]).toBe('sis');
    expect(t.rounds[0]?.map((m) => [m.a, m.b])).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
      [6, 7],
    ]);
  });

  it('rakipler giderek zorlaşır (ayarlardaki zorluğa göre)', () => {
    expect(roundDifficulties('easy')).toEqual(['easy', 'easy', 'medium']);
    expect(roundDifficulties('medium')).toEqual(['easy', 'medium', 'hard']);
    expect(roundDifficulties('hard')).toEqual(['medium', 'hard', 'hard']);
  });

  it('aynı tohum → aynı kura; ödül oyuncunun kendisi olamaz', () => {
    expect(createTournament(BASE)).toEqual(createTournament(BASE));
    const same = createTournament({ ...BASE, reward: 'kor' });
    expect(same.reward).toBeNull();
    expect(createTournament({ ...BASE, reward: null }).reward).toBeNull();
  });
});

describe('Turnuva — ilerleme', () => {
  it('kazanınca bir sonraki tur kurulur; finali kazanınca şampiyon; rakip hep ağaçtaki eşleşme', () => {
    const states = playThrough(createTournament(BASE), [3, 1]);
    expect(states.map((s) => s.status)).toEqual(['active', 'active', 'active', 'won']);
    const opponents = states.slice(0, 3).map((s) => playerMatch(s));
    expect(opponents.map((o) => o?.round)).toEqual([0, 1, 2]);
    expect(opponents.map((o) => o?.difficulty)).toEqual(['easy', 'medium', 'hard']);
    // Ödül karakteri (patron) finale kadar hep kazanır.
    expect(opponents[2]?.opponent).toBe('sis');
    const final = states[3];
    expect(final?.rounds).toHaveLength(TOURNAMENT.rounds);
    expect(final?.rounds.every((r) => r.every((m) => m.score !== null))).toBe(true);
    expect(playerMatch(final as TournamentState)).toBeNull();
  });

  it('kaybedince elenir ve sonraki tur kurulmaz', () => {
    const t = applyPlayerResult(createTournament(BASE), 1, 2);
    expect(t.status).toBe('lost');
    expect(currentRound(t)).toBe(0);
    expect(eliminatedIn(t, PLAYER_SLOT)).toBe(0);
    expect(applyPlayerResult(t, 5, 0)).toBe(t);
  });

  it('beraberlik (gerçekte olmaz: altın gol) savunma amaçlı mağlubiyet sayılır, skor tutarlı kalır', () => {
    const t = applyPlayerResult(createTournament(BASE), 2, 2);
    expect(t.status).toBe('lost');
    const m = t.rounds[0]?.[0];
    expect(m && winnerOf(m)).toBe(1);
  });

  it('AI vs AI maçları tohumla belirlenir, skorlar aralıkta ve berabere değil', () => {
    const a = playThrough(createTournament(BASE), [2, 0]);
    const b = playThrough(createTournament(BASE), [2, 0]);
    expect(a).toEqual(b);
    const { winnerMin, winnerMax } = TOURNAMENT.aiScore;
    for (const round of a.at(-1)?.rounds ?? []) {
      for (const m of round) {
        if (m.a === PLAYER_SLOT || m.b === PLAYER_SLOT) continue;
        const [x, y] = m.score ?? [0, 0];
        expect(Math.max(x, y)).toBeGreaterThanOrEqual(winnerMin);
        expect(Math.max(x, y)).toBeLessThanOrEqual(winnerMax);
        expect(x).not.toBe(y);
      }
    }
  });
});

describe('Turnuva — kayıt', () => {
  it('kaydet → yükle aynı durumu verir; null kaydı siler', () => {
    const store = memoryStore();
    const states = playThrough(createTournament(BASE), [4, 2]);
    for (const s of states) {
      saveTournament(store, s);
      expect(loadTournament(store)).toEqual(s);
    }
    saveTournament(store, null);
    expect(store.data.has(STORAGE.keys.tournament)).toBe(false);
    expect(loadTournament(store)).toBeNull();
  });

  it('bozuk ya da tutarsız kayıt reddedilir (yeni turnuva başlatılır)', () => {
    const good = applyPlayerResult(createTournament(BASE), 3, 0);
    const json = JSON.parse(JSON.stringify(good)) as Record<string, unknown>;
    expect(parseTournament(json)).toEqual(good);
    const broken: unknown[] = [
      null,
      'turnuva',
      { ...json, seed: -1 },
      { ...json, entrants: [...good.entrants.slice(0, 7), 'kor'] },
      { ...json, entrants: good.entrants.slice(0, 7) },
      { ...json, difficulties: ['easy', 'medium', 'zor'] },
      { ...json, status: 'paused' },
      { ...json, reward: 'yay' },
      { ...json, rounds: [] },
      // Yarı final eşleşmesi çeyrek final kazananlarıyla uyuşmuyor.
      { ...json, rounds: [good.rounds[0], [{ a: 1, b: 2, score: null }, good.rounds[1]?.[1]]] },
      // Süren turda oynanmış maç (oyuncunun sonucu işlenmeden kaydedilemez).
      {
        ...json,
        rounds: [good.rounds[0], [{ ...good.rounds[1]?.[0], score: [1, 0] }, good.rounds[1]?.[1]]],
      },
      // Berabere skor.
      {
        ...json,
        rounds: [
          [{ a: 0, b: 1, score: [1, 1] }, ...(good.rounds[0]?.slice(1) ?? [])],
          good.rounds[1],
        ],
      },
    ];
    for (const b of broken) expect(parseTournament(b)).toBeNull();
  });
});
