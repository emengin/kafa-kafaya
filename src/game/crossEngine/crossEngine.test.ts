import { describe, expect, it } from 'vitest';
import { MATCH } from '../../config/gameConfig';
import { getCharacter } from '../characters';
import { secondsToTicks } from '../rules/MatchFlow';
import {
  decodeInputs,
  encodeInputs,
  firstChainMismatch,
  missingCoverage,
  runFixture,
  type ReplayRun,
} from './fixture';
import { REPLAY_FIXTURES } from './fixtures';

/**
 * Çapraz motor tekrarlarının Node tarafı (Faz 2.7, madde 7): her kayıt beklenen zinciri üretir ve
 * birlikte tüm karakterleri, süperleri, golü ve gol sonrası duraklamayı kapsar. Tarayıcı tarafı:
 * `e2e/determinism.spec.ts` (`npm run test:determinism`, Chromium + WebKit).
 *
 * Bu test kırılırsa: simülasyon değişti. Bilinçli bir değişiklikse `npm run replays -- --update`
 * (kapsam bozulduysa `--record`); değilse bir determinizm hatası var.
 */

const runs = new Map<string, ReplayRun>();
const runOf = (name: string): ReplayRun => {
  const f = REPLAY_FIXTURES.find((x) => x.name === name);
  if (!f) throw new Error(name);
  let r = runs.get(name);
  if (!r) {
    r = runFixture(f);
    runs.set(name, r);
  }
  return r;
};

describe('Çapraz motor tekrarları — Node', () => {
  it('en az 5 kayıt var', () => {
    expect(REPLAY_FIXTURES.length).toBeGreaterThanOrEqual(5);
  });

  for (const f of REPLAY_FIXTURES) {
    it(`${f.name}: her adımın özeti beklenen zinciri verir`, () => {
      const run = runOf(f.name);
      expect(run.checksums).toHaveLength(f.ticks);
      const at = firstChainMismatch(run.chain, f.chain);
      expect(at, `ilk fark ${(at + 1) * f.checkpointEvery}. adıma kadarki aralıkta`).toBe(-1);
    });

    it(`${f.name}: iki karakterin süperi fırlatılıyor, gol sonrası duraklama tam 120 adım`, () => {
      const c = runOf(f.name).coverage;
      for (const id of f.characters) {
        expect(c.supers[getCharacter(id).superType] ?? 0, id).toBeGreaterThan(0);
      }
      expect(c.goals).toBeGreaterThan(0);
      expect(c.pauses).toBe(c.goals);
      for (const t of c.pauseTicks) expect(t).toBe(secondsToTicks(MATCH.goalCelebrationSeconds));
      expect(c.matchEnd).toBe(true);
    });
  }

  it('kayıtlar birlikte tüm karakterleri, süperleri, golü ve duraklamayı kapsar', () => {
    const all = REPLAY_FIXTURES.map((f) => runOf(f.name).coverage);
    expect(missingCoverage(all)).toEqual([]);
  });

  it('aynı kayıt iki kez oynatılınca her adım aynı (süreç içi)', () => {
    const f = REPLAY_FIXTURES[0];
    if (!f) throw new Error('kayıt yok');
    expect(runFixture(f).checksums).toEqual(runOf(f.name).checksums);
  });
});

describe('Çapraz motor tekrarları — girdi kodlaması', () => {
  it('RLE + base64 gidiş-dönüş birebir (uzun koşular, tüm değerler, her uzunluk)', () => {
    let s = 12345;
    const next = (): number => {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      return s;
    };
    for (const length of [1, 2, 3, 4, 127, 128, 129, 1000, 20000]) {
      const pairs: number[] = [];
      while (pairs.length < length) {
        const v = next() % 1024;
        const run = 1 + (next() % 300);
        for (let k = 0; k < run && pairs.length < length; k++) pairs.push(v);
      }
      const text = encodeInputs(pairs);
      expect(Array.from(decodeInputs(text, length))).toEqual(pairs);
    }
  });

  it('eksik girdi açık hata verir', () => {
    expect(() => decodeInputs(encodeInputs([1, 2, 3]), 4)).toThrow(/eksik/);
  });
});
