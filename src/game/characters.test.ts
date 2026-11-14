import { describe, expect, it } from 'vitest';
import { CHARACTER_STATS, LOOP, PLAYER } from '../config/gameConfig';
import { EMPTY_INPUT, type InputState } from '../input/InputState';
import {
  CHARACTER_IDS,
  CHARACTERS,
  getCharacter,
  isCharacterId,
  loadoutFor,
  NEUTRAL_LOADOUT,
  paramsFromStats,
} from './characters';
import { PLAYER_STAND_OFFSET } from './entities/Player';
import { GameSim } from './GameSim';
import { SUPER_TYPES } from './superEffects';

const RIGHT: InputState = { ...EMPTY_INPUT, right: true };

describe('Karakterler', () => {
  it('10 özgün karakter: benzersiz kimlik, isim ve istatistik dağılımı', () => {
    expect(CHARACTERS).toHaveLength(10);
    expect(new Set(CHARACTER_IDS).size).toBe(10);
    expect(new Set(CHARACTERS.map((c) => c.name)).size).toBe(10);
    const combos = CHARACTERS.map(
      (c) => `${c.stats.speed}${c.stats.jump}${c.stats.kick}${c.stats.head}`,
    );
    expect(new Set(combos).size).toBe(10);
  });

  it('istatistikler 1–5 arası ve toplamları eşit (dengeli)', () => {
    for (const c of CHARACTERS) {
      const values = [c.stats.speed, c.stats.jump, c.stats.kick, c.stats.head];
      for (const v of values) {
        expect(v).toBeGreaterThanOrEqual(CHARACTER_STATS.statMin);
        expect(v).toBeLessThanOrEqual(CHARACTER_STATS.statMax);
      }
      expect(values.reduce((a, b) => a + b, 0)).toBe(CHARACTER_STATS.statTotal);
    }
  });

  it('her karakterin kendine ait bir süper şutu var (10 farklı tip)', () => {
    const types = CHARACTERS.map((c) => c.superType);
    expect(new Set(types).size).toBe(10);
    for (const t of types) expect(SUPER_TYPES).toContain(t);
  });

  it('renk paletleri birbirinden farklı', () => {
    expect(new Set(CHARACTERS.map((c) => c.palette.body)).size).toBe(10);
  });

  it('tüm puanları 3 olan oyuncu Faz 1–3 değerleriyle aynı; puan arttıkça değer artar', () => {
    const p = NEUTRAL_LOADOUT.params;
    expect(p.maxSpeed).toBe(PLAYER.move.maxSpeed);
    expect(p.jumpSpeed).toBe(PLAYER.jump.speed);
    expect(p.headRadius).toBe(PLAYER.head.radius);
    expect(p.mass).toBe(PLAYER.mass);
    expect(p.kickPower).toBe(1);
    const at = (stat: 'speed' | 'jump' | 'kick' | 'head', v: number) =>
      paramsFromStats({ speed: 3, jump: 3, kick: 3, head: 3, [stat]: v });
    for (let v = 2; v <= 5; v++) {
      expect(at('speed', v).maxSpeed).toBeGreaterThan(at('speed', v - 1).maxSpeed);
      expect(at('jump', v).jumpSpeed).toBeGreaterThan(at('jump', v - 1).jumpSpeed);
      expect(at('kick', v).kickPower).toBeGreaterThan(at('kick', v - 1).kickPower);
      expect(at('head', v).headRadius).toBeGreaterThan(at('head', v - 1).headRadius);
      // Büyük kafa daha ağır: biraz daha alçak zıplar.
      expect(at('head', v).jumpSpeed).toBeLessThan(at('head', v - 1).jumpSpeed);
    }
  });

  it('isCharacterId / getCharacter', () => {
    expect(CHARACTER_IDS.every(isCharacterId)).toBe(true);
    expect(isCharacterId('KOR')).toBe(false);
    expect(getCharacter('kaya').superType).toBe('giant');
    expect(() => getCharacter('yok' as never)).toThrow();
  });

  it('simülasyonda farklı hissettirir: hızlı karakter daha hızlı koşar, büyük kafa daha geniş', () => {
    const sim = new GameSim({
      skipKickoff: true,
      powerUps: false,
      loadouts: [loadoutFor('simsek'), loadoutFor('kaya')],
    });
    const standY = sim.pitch.groundY - PLAYER_STAND_OFFSET;
    sim.players[0].resetTo(200, standY);
    sim.players[1].resetTo(1000, standY);
    sim.ball.resetTo(640, 100);
    for (let i = 0; i < LOOP.stepHz / 2; i++) sim.step([RIGHT, EMPTY_INPUT]);
    expect(sim.players[0].vx).toBeCloseTo(loadoutFor('simsek').params.maxSpeed, 6);
    expect(sim.players[0].vx).toBeGreaterThan(PLAYER.move.maxSpeed);
    expect(sim.players[1].partCircle('head').radius).toBeGreaterThan(PLAYER.head.radius);
    expect(sim.players[0].partCircle('head').radius).toBeLessThan(PLAYER.head.radius);
  });
});
