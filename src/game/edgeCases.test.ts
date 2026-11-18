import { describe, expect, it } from 'vitest';
import { LOOP, PITCH } from '../config/gameConfig';
import { EMPTY_INPUT } from '../input/InputState';
import { AiController, AiInputSource } from './ai/AiController';
import { observe } from './ai/worldView';
import { CHARACTER_IDS, loadoutFor } from './characters';
import { Ball } from './entities/Ball';
import { GameSim } from './GameSim';

/** AI vs AI maçı oynatır ve her adımda değişmezleri denetler (Faz 7 hata avı). */
function fuzzMatch(seed: number, c1: number, c2: number, seconds: number): void {
  const ids = CHARACTER_IDS;
  const sim = new GameSim({
    loadouts: [
      loadoutFor(ids[c1 % ids.length] ?? 'kor'),
      loadoutFor(ids[c2 % ids.length] ?? 'ayaz'),
    ],
    seed,
    rules: { durationSeconds: seconds },
  });
  const view = (): ReturnType<typeof observe> => observe(sim);
  const a = new AiInputSource(
    new AiController({ index: 0, difficulty: 'hard', seed: seed + 1 }),
    view,
  );
  const b = new AiInputSource(
    new AiController({ index: 1, difficulty: 'medium', seed: seed + 2 }),
    view,
  );
  let lastTime = sim.match.timeLeft;
  let goalsSeen = 0;
  let celebrating = false;
  for (let i = 0; i < (seconds + 30) * LOOP.stepHz && sim.match.phase !== 'matchEnd'; i++) {
    const before = sim.match.score[0] + sim.match.score[1];
    const events = sim.step([a.read(), b.read()]);
    const goals = events.filter((e) => e.type === 'goal').length;
    const after = sim.match.score[0] + sim.match.score[1];
    // Aynı adımda iki gol yok; skor yalnızca gol olayıyla ve 1 artar.
    expect(goals).toBeLessThanOrEqual(1);
    expect(after - before).toBe(goals);
    if (goals > 0) {
      // Kutlama sürerken ikinci gol sayılmaz.
      expect(celebrating).toBe(false);
      celebrating = true;
      goalsSeen++;
    }
    if (events.some((e) => e.type === 'kickoff' || e.type === 'matchEnd')) celebrating = false;
    // Saat geri gitmez; top hep sonlu ve sahanın içinde.
    expect(sim.match.timeLeft).toBeLessThanOrEqual(lastTime + 1e-9);
    lastTime = sim.match.timeLeft;
    const ball = sim.ball;
    expect(Number.isFinite(ball.x) && Number.isFinite(ball.y)).toBe(true);
    expect(ball.x).toBeGreaterThan(-1);
    expect(ball.x).toBeLessThan(sim.pitch.width + 1);
    expect(ball.y).toBeLessThan(sim.pitch.groundY + 1);
  }
  expect(sim.match.score[0] + sim.match.score[1]).toBe(goalsSeen);
}

describe('Kenar durumları (Faz 7)', () => {
  it('rastgele AI maçlarında: adım başına en çok bir gol, kutlamada ikinci gol yok, sayaçlar tutarlı', () => {
    for (let k = 0; k < 4; k++) fuzzMatch(100 + k, k * 3, k * 7 + 1, 25);
  });

  it('kutlama sırasında top öbür kaleye girse de ikinci gol sayılmaz', () => {
    const sim = new GameSim({ skipKickoff: true, powerUps: false });
    const right = sim.pitch.goals[1];
    sim.ball.resetTo(right.lineX + 40, PITCH.groundY - 40);
    const first = sim.step([EMPTY_INPUT, EMPTY_INPUT]);
    expect(first.some((e) => e.type === 'goal')).toBe(true);
    const left = sim.pitch.goals[0];
    sim.ball.resetTo(left.lineX - 40, PITCH.groundY - 40);
    let more = 0;
    for (let i = 0; i < LOOP.stepHz; i++) {
      more += sim.step([EMPTY_INPUT, EMPTY_INPUT]).filter((e) => e.type === 'goal').length;
    }
    expect(more).toBe(0);
    expect(sim.match.score).toEqual([1, 0]);
  });

  it('Serap yanılsaması kaleye girse de gol olmaz (yalnızca gerçek top)', () => {
    const sim = new GameSim({ skipKickoff: true, powerUps: false });
    const decoy = new Ball();
    const right = sim.pitch.goals[1];
    decoy.resetTo(right.lineX + 40, PITCH.groundY - 40);
    sim.decoys.push({ ball: decoy, ttl: 1 });
    sim.ball.resetTo(sim.pitch.width / 2, 200);
    for (let i = 0; i < 10; i++) {
      expect(sim.step([EMPTY_INPUT, EMPTY_INPUT]).some((e) => e.type === 'goal')).toBe(false);
    }
  });
});
