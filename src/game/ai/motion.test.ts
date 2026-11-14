import { describe, expect, it } from 'vitest';
import { KICK, PITCH, PLAYER } from '../../config/gameConfig';
import { EMPTY_INPUT } from '../../input/InputState';
import { footOffset, PLAYER_STAND_OFFSET } from '../entities/Player';
import { GameSim } from '../GameSim';
import {
  HOP_RISE,
  hopHoldTicks,
  JUMP_APEX_RISE,
  JUMP_APEX_STEPS,
  JUMP_RISE,
  jumpLead,
  KickSimulator,
  type Trajectory,
} from './motion';

/** Hareketsiz top yörüngesi. */
const still = (x: number, y: number): Trajectory => ({
  x: () => x,
  y: () => y,
  vx: () => 0,
  vy: () => 0,
});

describe('Zıplama profili (gerçek Player kodundan)', () => {
  it('tepe yüksekliği ve süresi tasarım aralığında, tepeye kadar artan', () => {
    expect(JUMP_APEX_RISE).toBeGreaterThan(150);
    expect(JUMP_APEX_RISE).toBeLessThan(170);
    expect(JUMP_APEX_STEPS).toBeGreaterThan(15);
    expect(JUMP_APEX_STEPS).toBeLessThan(25);
    for (let k = 1; k <= JUMP_APEX_STEPS; k++) {
      expect(JUMP_RISE[k] ?? 0).toBeGreaterThan(JUMP_RISE[k - 1] ?? 0);
    }
  });

  it('jumpLead: istenen yüksekliğe ilk ulaşılan adım; ulaşılamazsa −1', () => {
    for (const rise of [10, 60, 120, 150]) {
      const k = jumpLead(rise);
      expect(JUMP_RISE[k] ?? 0).toBeGreaterThanOrEqual(rise);
      expect(JUMP_RISE[k - 1] ?? 0).toBeLessThan(rise);
    }
    expect(jumpLead(0)).toBe(0);
    expect(jumpLead(JUMP_APEX_RISE + 1)).toBe(-1);
  });

  it('alçak sıçrayış: tuş ne kadar uzun basılırsa o kadar yüksek; üst sınır gözetilir', () => {
    for (let h = 2; h < HOP_RISE.length; h++) {
      expect(HOP_RISE[h] ?? 0).toBeGreaterThanOrEqual(HOP_RISE[h - 1] ?? 0);
    }
    // Topu (çap 44 + pay) aşıp kale ağzında üst direğe çarpmayan bir sıçrayış vardır:
    // kafanın üst direğin alt yüzüne kadar yükselebileceği pay ≈ 88 px.
    const barRoom = PITCH.goal.mouthHeight - PLAYER_STAND_OFFSET - PLAYER.head.radius;
    const hold = hopHoldTicks(60, barRoom);
    expect(hold).toBeGreaterThan(0);
    expect(HOP_RISE[hold] ?? 0).toBeLessThanOrEqual(barRoom);
    expect(hopHoldTicks(JUMP_APEX_RISE + 10, 1000)).toBe(-1);
    expect(hopHoldTicks(120, 80)).toBe(-1);
  });
});

describe('KickSimulator (hayalet ayak)', () => {
  const standY = PITCH.groundY - PLAYER_STAND_OFFSET;
  const me = { x: 300, y: standY, vx: 0, vy: 0, grounded: true };

  it('ayağın önündeki topa ilk adımda tam güçle değer; GameSim de aynı adımda şut atar', () => {
    const o = footOffset(KICK.restAngle, 1);
    const ballX = me.x + o.x + 30;
    const ballY = me.y + o.y - 9;
    const probe = new KickSimulator().probe(me, 0, still(ballX, ballY), 6);
    expect(probe).not.toBeNull();
    expect(probe?.contactTick).toBe(0);
    expect(probe?.swingFactor ?? 0).toBeGreaterThan(0.8);

    const sim = new GameSim({ skipKickoff: true });
    sim.players[0].resetTo(me.x, me.y);
    sim.players[1].resetTo(1000, me.y);
    sim.ball.resetTo(ballX, ballY);
    const events = sim.step([{ ...EMPTY_INPUT, kick: true }, EMPTY_INPUT]);
    expect(events).toContainEqual(expect.objectContaining({ type: 'kick', player: 0 }));
  });

  it('erişim dışındaki topa değmez', () => {
    expect(new KickSimulator().probe(me, 0, still(me.x + 200, PITCH.groundY - 22), 8)).toBeNull();
    // Arkadaki top (şut hep ileri).
    expect(new KickSimulator().probe(me, 0, still(me.x - 60, PITCH.groundY - 22), 8)).toBeNull();
  });

  it('gelen topa (vole): erken basış ıskalar, zamanında basış temas anını öngörür', () => {
    const ballY = PITCH.groundY - 22;
    const incoming = (startDx: number): Trajectory => ({
      x: (k) => me.x + startDx - k * 12,
      y: () => ballY,
      vx: () => -720,
      vy: () => 0,
    });
    // Top uzaktayken basılırsa savrulma top gelmeden biter.
    expect(new KickSimulator().probe(me, 0, incoming(160), 8)).toBeNull();
    const probe = new KickSimulator().probe(me, 0, incoming(100), 8);
    expect(probe).not.toBeNull();
    expect(probe?.contactTick ?? -1).toBeGreaterThan(0);
    expect(probe?.ballVx).toBe(-720);
  });
});
