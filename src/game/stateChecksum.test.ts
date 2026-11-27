import { describe, expect, it } from 'vitest';
import { EMPTY_INPUT, type InputState } from '../input/InputState';
import { AiController } from './ai/AiController';
import { mixSeed } from './ai/random';
import { observe } from './ai/worldView';
import { loadoutFor, type CharacterId } from './characters';
import { POWER_UP_TYPES } from './entities/Player';
import { GameSim } from './GameSim';
import type { FieldBag, SimState } from './simState';
import { BALL_FIELDS, BALLOON_FIELDS, PLAYER_FIELDS, stateChecksum } from './stateChecksum';

type Inputs = readonly [InputState, InputState];

/** Serap (yanılsamalar) ve Işınlanma: durumun en zengin hali (yanılsama + balon). */
const CAST: readonly [CharacterId, CharacterId] = ['pamuk', 'sis'];
const SEED = 5;

function newSim(): GameSim {
  return new GameSim({
    seed: mixSeed(SEED, 2),
    loadouts: [loadoutFor(CAST[0]), loadoutFor(CAST[1])],
    rules: { durationSeconds: 600 },
  });
}

/** AI vs AI maçının girdileri (bir kez kaydedilir, testler aynı girdileri yeniden oynar). */
function recordInputs(steps: number): Inputs[] {
  const sim = newSim();
  const ais = [
    new AiController({ index: 0, difficulty: 'hard', seed: mixSeed(SEED, 0) }),
    new AiController({ index: 1, difficulty: 'hard', seed: mixSeed(SEED, 1) }),
  ] as const;
  const out: Inputs[] = [];
  for (let t = 0; t < steps; t++) {
    const view = observe(sim);
    const pair: Inputs = [{ ...ais[0].update(view) }, { ...ais[1].update(view) }];
    out.push(pair);
    sim.step(pair);
  }
  return out;
}

const STEPS = 3600;
const INPUTS = recordInputs(STEPS);
const IDLE: Inputs = [EMPTY_INPUT, EMPTY_INPUT];
const inputAt = (t: number): Inputs => INPUTS[t] ?? IDLE;

/** Girdileri oynatıp ilk "zengin" anın durumunu döndürür (yanılsama ve balon aynı anda; 1207. adım). */
function findRichState(): { sim: GameSim; state: SimState; tick: number } {
  const sim = newSim();
  for (const pair of INPUTS) {
    sim.step(pair);
    if (sim.decoys.length > 0 && sim.balloon) {
      return { sim, state: structuredClone(sim.saveState()), tick: sim.tick };
    }
  }
  throw new Error('senaryoda yanılsama + balon anı yok (tohumu değiştirin)');
}

const RICH = findRichState();
const richState = (): typeof RICH => RICH;
function nudge(v: unknown): unknown {
  if (typeof v === 'number') {
    if (v === 0) return Number.MIN_VALUE;
    return v + Math.abs(v) * Number.EPSILON;
  }
  if (typeof v === 'boolean') return !v;
  if (typeof v === 'string') return `${v}x`;
  if (v === null) return 0;
  throw new Error(`beklenmeyen değer türü: ${typeof v}`);
}

describe('Kanonik durum özeti (Faz 2.7)', () => {
  it("alan listeleri saveState'in kopyaladığı alanlarla birebir aynı (alan eklenirse test kırılır)", () => {
    const { state } = richState();
    const sorted = (keys: Iterable<string>): string[] => [...keys].sort();
    expect(sorted(Object.keys(state.players[0]))).toEqual(sorted(PLAYER_FIELDS));
    expect(sorted(Object.keys(state.players[1]))).toEqual(sorted(PLAYER_FIELDS));
    expect(sorted(Object.keys(state.ball))).toEqual(sorted(BALL_FIELDS));
    expect(sorted(Object.keys(state.decoys[0]?.ball ?? {}))).toEqual(sorted(BALL_FIELDS));
    expect(sorted(Object.keys(state.players[0].powerUps as FieldBag))).toEqual(
      sorted(POWER_UP_TYPES),
    );
    expect(sorted(Object.keys(state.balloon ?? {}))).toEqual(sorted(BALLOON_FIELDS));
    // stateChecksum'ın gezdiği üst düzey ve maç alanları:
    expect(sorted(Object.keys(state))).toEqual(
      sorted([
        'tick',
        'match',
        'players',
        'ball',
        'decoys',
        'balloon',
        'balloonTimer',
        'goalMouths',
        'rngState',
        'solo',
      ]),
    );
    expect(sorted(Object.keys(state.match))).toEqual(
      sorted([
        'phase',
        'overtime',
        'timeLeft',
        'phaseTime',
        'score',
        'lastScorer',
        'winner',
        'endReason',
      ]),
    );
  });

  it('aynı girdiler her karede aynı özeti verir; özet her karede değişir', () => {
    const a = newSim();
    const b = newSim();
    const seen = new Set<string>();
    for (const pair of INPUTS) {
      a.step(pair);
      b.step(pair);
      const ca = a.checksum();
      expect(b.checksum()).toBe(ca);
      seen.add(ca);
    }
    // Santra beklemesinde de saat ilerler: her adımın durumu farklıdır.
    expect(seen.size).toBe(INPUTS.length);
  });

  it('saveState → loadState: özet aynı, devamı her karede aynı (rollback; yanılsama havuzu ve PRNG dahil)', () => {
    const live = newSim();
    let richChecks = 0;
    for (let t = 0; t < STEPS - 120; t++) {
      live.step(inputAt(t));
      if (t % 97 !== 0 && !(live.decoys.length > 0 && t % 7 === 0)) continue;
      if (live.decoys.length > 0 && live.balloon) richChecks++;
      const saved = live.saveState();
      const shadow = newSim();
      // Gölgenin havuzunda önceki yanılsamalar olsun: havuz durumu sonucu etkilememeli.
      shadow.loadState(richState().state);
      shadow.loadState(saved);
      expect(shadow.checksum()).toBe(live.checksum());
      const probe = newSim();
      probe.loadState(saved);
      for (let k = 1; k <= 120; k++) {
        const pair = inputAt(t + k);
        shadow.step(pair);
        probe.step(pair);
        expect(shadow.checksum(), `adım ${t} + ${k}`).toBe(probe.checksum());
      }
    }
    expect(richChecks).toBeGreaterThan(0);
  });

  it('herhangi bir alandaki en küçük fark özeti değiştirir', () => {
    const { state } = richState();
    const base = stateChecksum(state);
    const variants: [string, (s: SimState) => void][] = [];
    const bagField = (label: string, pick: (s: SimState) => FieldBag, key: string): void => {
      variants.push([
        `${label}.${key}`,
        (s) => {
          const bag = pick(s);
          bag[key] = nudge(bag[key]);
        },
      ]);
    };
    for (const i of [0, 1] as const) {
      for (const key of PLAYER_FIELDS) {
        if (key === 'powerUps') {
          for (const type of POWER_UP_TYPES) {
            bagField(`players[${i}].powerUps`, (s) => s.players[i].powerUps as FieldBag, type);
          }
        } else {
          bagField(`players[${i}]`, (s) => s.players[i], key);
        }
      }
    }
    for (const key of BALL_FIELDS) {
      bagField('ball', (s) => s.ball, key);
      bagField('decoys[0].ball', (s) => s.decoys[0]?.ball ?? {}, key);
    }
    for (const key of BALLOON_FIELDS) {
      bagField('balloon', (s) => s.balloon as unknown as FieldBag, key);
    }
    for (const key of ['phase', 'overtime', 'timeLeft', 'phaseTime', 'lastScorer', 'winner']) {
      bagField('match', (s) => s.match as unknown as FieldBag, key);
    }
    variants.push(
      ['tick', (s) => (s.tick += 1)],
      ['score[1]', (s) => (s.match.score[1] += 1)],
      ['decoys[0].ttl', (s) => ((s.decoys[0] ?? { ttl: 0 }).ttl += 1e-9)],
      ['decoys.length', (s) => s.decoys.pop()],
      ['balloon = null', (s) => (s.balloon = null)],
      ['balloonTimer', (s) => (s.balloonTimer = nudge(s.balloonTimer) as number)],
      ['goalMouths[0]', (s) => (s.goalMouths[0] = nudge(s.goalMouths[0]) as number)],
      ['rngState', (s) => (s.rngState ^= 1)],
      ['solo', (s) => (s.solo = !s.solo)],
    );
    for (const [label, mutate] of variants) {
      const copy = structuredClone(state);
      mutate(copy);
      expect(stateChecksum(copy), label).not.toBe(base);
    }
    expect(variants.length).toBeGreaterThan(100);
  });

  it('−0 ile 0 farklı; NaN yük bitleri fark etmez (kanonik NaN)', () => {
    const { state } = richState();
    const a = structuredClone(state);
    const b = structuredClone(state);
    a.ball.vx = 0;
    b.ball.vx = -0;
    expect(stateChecksum(a)).not.toBe(stateChecksum(b));

    const view = new DataView(new ArrayBuffer(8));
    view.setUint32(0, 0x7ff80000);
    view.setUint32(4, 0);
    const quiet = view.getFloat64(0);
    view.setUint32(4, 0xdead);
    const payload = view.getFloat64(0);
    a.ball.vx = quiet;
    b.ball.vx = payload;
    expect(stateChecksum(a)).toBe(stateChecksum(b));
  });

  it("nesnelerin anahtar sırasından bağımsız (JSON.stringify'ın aksine)", () => {
    const { state } = richState();
    const reversed = (bag: FieldBag): FieldBag => {
      const out: FieldBag = {};
      for (const key of Object.keys(bag).reverse()) out[key] = bag[key];
      return out;
    };
    const copy = structuredClone(state);
    copy.players = [reversed(copy.players[0]), reversed(copy.players[1])];
    copy.ball = reversed(copy.ball);
    expect(JSON.stringify(copy)).not.toBe(JSON.stringify(state));
    expect(stateChecksum(copy)).toBe(stateChecksum(state));
  });

  it('GameSim.checksum() = stateChecksum(saveState()); biçim 16 onaltılık hane', () => {
    const { sim } = richState();
    expect(sim.checksum()).toBe(stateChecksum(sim.saveState()));
    expect(sim.checksum()).toMatch(/^[0-9a-f]{16}$/);
  });
});
