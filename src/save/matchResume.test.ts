import { describe, expect, it } from 'vitest';
import { LIFECYCLE, STORAGE } from '../config/gameConfig';
import { loadoutFor } from '../game/characters';
import { GameSim, type GameSimOptions } from '../game/GameSim';
import { DEFAULT_MATCH_SETUP, type MatchSetup } from '../game/matchSetup';
import { EMPTY_INPUT, type InputState } from '../input/InputState';
import {
  clearMatchResume,
  decodeResume,
  encodeResume,
  saveMatchResume,
  takeMatchResume,
} from './matchResume';
import type { KeyValueStore } from './store';

type Inputs = readonly [InputState, InputState];

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

/** Tohumlu, değişken girdi dizisi (koşma, zıplama, şut, süper). */
function script(seed: number, length: number): Inputs[] {
  let a = seed >>> 0;
  const next = (): number => {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    return a / 4294967296;
  };
  const out: Inputs[] = [];
  let cur: Inputs = [EMPTY_INPUT, EMPTY_INPUT];
  for (let i = 0; i < length; i++) {
    if (i % 7 === 0) {
      const mk = (toward: 'left' | 'right'): InputState => ({
        ...EMPTY_INPUT,
        [toward]: next() < 0.6,
        jump: next() < 0.2,
        kick: next() < 0.4,
        super: next() < 0.08,
      });
      cur = [mk('right'), mk('left')];
    }
    out.push(cur);
  }
  return out;
}

const VERSION = 'test-1';
const NOW = 1_800_000_000_000;
const SETUP: MatchSetup = { ...DEFAULT_MATCH_SETUP, mode: 'cpu', characters: ['pamuk', 'sis'] };

function options(training = false): GameSimOptions {
  return {
    loadouts: [loadoutFor('pamuk'), loadoutFor('sis')],
    seed: 77,
    ...(training
      ? {
          rules: { durationSeconds: Infinity, goldenGoalOvertime: false },
          skipKickoff: true,
          solo: true,
        }
      : {}),
  };
}

describe('Yarım maç kaydı (Faz 2.5)', () => {
  it('Infinity, -Infinity, NaN ve -0 JSON gidiş-dönüşünde korunur', () => {
    const value = { a: Infinity, b: -Infinity, c: Number.NaN, d: -0, e: [1.5, -0], f: 0 };
    const back = decodeResume(encodeResume(value)) as typeof value;
    expect(back.a).toBe(Infinity);
    expect(back.b).toBe(-Infinity);
    expect(back.c).toBeNaN();
    expect(Object.is(back.d, -0)).toBe(true);
    expect(Object.is(back.e[1], -0)).toBe(true);
    expect(Object.is(back.f, 0)).toBe(true);
    expect(decodeResume('{bozuk')).toBeUndefined();
  });

  it('kayıttan geri yüklenen maç, kesintisiz maçla aynı girdilerle birebir aynı sürer (determinizm)', () => {
    for (const training of [false, true]) {
      const inputs = script(training ? 3 : 11, 3000);
      const live = new GameSim(options(training));
      for (let i = 0; i < 1500; i++) live.step(inputs[i] as Inputs);
      const store = memoryStore();
      saveMatchResume(store, { setup: SETUP, seed: 42, state: live.saveState() }, NOW, VERSION);
      const resume = takeMatchResume(store, NOW + 1000, VERSION);
      expect(resume).not.toBeNull();
      if (!resume) return;
      expect(resume.seed).toBe(42);
      expect(resume.setup).toEqual(SETUP);
      const restored = new GameSim(options(training));
      restored.loadState(resume.state);
      expect(restored.saveState()).toEqual(live.saveState());
      for (let i = 1500; i < 3000; i++) {
        live.step(inputs[i] as Inputs);
        restored.step(inputs[i] as Inputs);
      }
      expect(restored.snapshot()).toEqual(live.snapshot());
      expect(restored.saveState()).toEqual(live.saveState());
      if (training) expect(restored.match.timeLeft).toBe(Infinity);
    }
  });

  it('kayıt bir kez okunur; eski, başka sürümden ya da bozuk kayıt yok sayılır ve silinir', () => {
    const state = new GameSim(options()).saveState();
    const key = STORAGE.keys.matchResume;
    const store = memoryStore();
    saveMatchResume(store, { setup: SETUP, seed: 1, state }, NOW, VERSION);
    expect(takeMatchResume(store, NOW, VERSION)).not.toBeNull();
    expect(takeMatchResume(store, NOW, VERSION)).toBeNull();

    saveMatchResume(store, { setup: SETUP, seed: 1, state }, NOW, VERSION);
    expect(takeMatchResume(store, NOW + LIFECYCLE.resumeMaxAgeMs + 1, VERSION)).toBeNull();
    expect(store.data.has(key)).toBe(false);

    saveMatchResume(store, { setup: SETUP, seed: 1, state }, NOW, VERSION);
    expect(takeMatchResume(store, NOW, 'baska-surum')).toBeNull();

    store.set(key, '{bozuk');
    expect(takeMatchResume(store, NOW, VERSION)).toBeNull();
    expect(store.data.has(key)).toBe(false);

    store.set(key, encodeResume({ v: 2, app: VERSION, savedAt: NOW, setup: SETUP, seed: 1 }));
    expect(takeMatchResume(store, NOW, VERSION)).toBeNull();

    const badMode = { ...SETUP, mode: 'online' };
    store.set(
      key,
      encodeResume({ v: 2, app: VERSION, savedAt: NOW, setup: badMode, seed: 1, state }),
    );
    expect(takeMatchResume(store, NOW, VERSION)).toBeNull();

    saveMatchResume(store, { setup: SETUP, seed: 1, state }, NOW, VERSION);
    clearMatchResume(store);
    expect(takeMatchResume(store, NOW, VERSION)).toBeNull();
  });
});
