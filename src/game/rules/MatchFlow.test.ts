import { describe, expect, it } from 'vitest';
import { LOOP, MATCH } from '../../config/gameConfig';
import type { PlayerIndex, SimEvent } from '../types';
import { DEFAULT_MATCH_RULES, MatchFlow, type MatchRules } from './MatchFlow';

const DT = 1 / LOOP.stepHz;
const steps = (seconds: number): number => Math.round(seconds * LOOP.stepHz);

function flow(rules: Partial<MatchRules> = {}): MatchFlow {
  return new MatchFlow({ ...DEFAULT_MATCH_RULES, ...rules });
}

/** n adım ilerletir; `scorer` yalnızca ilk adımda verilir. */
function run(f: MatchFlow, n: number, scorer: PlayerIndex | null = null): SimEvent[] {
  const events: SimEvent[] = [];
  for (let i = 0; i < n; i++) f.advance(DT, i === 0 ? scorer : null, events);
  return events;
}

/** Santrayı bitirip oyunu başlatır. */
function toPlaying(f: MatchFlow): void {
  run(f, steps(f.kickoffDuration));
  expect(f.goalsAllowed).toBe(true);
}

/** Gol kutlamasının adım sayısı: ağır çekim (gerçek 1 sn × 0,3) + kalan normal süre. */
const CELEBRATION_STEPS =
  steps(MATCH.goalSlowMoSeconds * MATCH.goalSlowMoScale) +
  steps(MATCH.goalCelebrationSeconds - MATCH.goalSlowMoSeconds);

describe('MatchFlow — santra', () => {
  it('maç santra beklemesiyle başlar; süre dolunca düdük çalar ve oyun başlar', () => {
    const f = flow();
    expect(f.phase).toBe('kickoff');
    expect(f.playersActive).toBe(false);
    expect(f.ballHeld).toBe(true);
    expect(f.goalsAllowed).toBe(false);

    expect(run(f, steps(MATCH.kickoffSeconds) - 1)).toEqual([]);
    expect(run(f, 1)).toEqual([{ type: 'playStart', overtime: false }]);
    expect(f.phase).toBe('playing');
    expect(f.playersActive).toBe(true);
    expect(f.ballHeld).toBe(false);
  });

  it('saat santra beklemesinde işlemez, yalnızca oyunda işler', () => {
    const f = flow();
    run(f, steps(MATCH.kickoffSeconds) - 1);
    expect(f.timeLeft).toBe(MATCH.durationSeconds);
    run(f, 1 + steps(10));
    expect(f.timeLeft).toBeCloseTo(MATCH.durationSeconds - 10, 6);
  });
});

describe('MatchFlow — gol ve kutlama', () => {
  it('gol skoru artırır, ağır çekim 1 gerçek sn sürer, 2 gerçek sn sonra santra', () => {
    const f = flow();
    toPlaying(f);
    expect(run(f, 1, 0)).toEqual([{ type: 'goal', scorer: 0 }]);
    expect(f.score).toEqual([1, 0]);
    expect(f.phase).toBe('goalScored');
    expect(f.goalsAllowed).toBe(false);
    expect(f.playersActive).toBe(true);

    // Ağır çekim: gerçek 1 sn = 0,3 sn simülasyon = 18 adım.
    const slow = steps(MATCH.goalSlowMoSeconds * MATCH.goalSlowMoScale);
    expect(slow).toBe(18);
    for (let i = 0; i < slow; i++) {
      expect(f.timeScale).toBe(MATCH.goalSlowMoScale);
      run(f, 1);
    }
    expect(f.timeScale).toBe(1);
    expect(f.phaseTime).toBeCloseTo(MATCH.goalSlowMoSeconds, 6);

    // Kalan 1 gerçek sn normal hızda; son adımda santra.
    const rest = CELEBRATION_STEPS - slow;
    expect(run(f, rest - 1)).toEqual([]);
    expect(run(f, 1)).toEqual([{ type: 'kickoff' }]);
    expect(f.phase).toBe('kickoff');
    expect(f.ballHeld).toBe(true);
  });

  it('kutlama sırasında saat durur ve ikinci gol sayılmaz', () => {
    const f = flow();
    toPlaying(f);
    run(f, steps(5));
    const before = f.timeLeft;
    run(f, 1, 1);
    const events: SimEvent[] = [];
    for (let i = 0; i < 10; i++) f.advance(DT, 0, events);
    expect(events.some((e) => e.type === 'goal')).toBe(false);
    expect(f.score).toEqual([0, 1]);
    expect(f.timeLeft).toBe(before);
  });
});

describe('MatchFlow — süre, altın gol ve maç sonu', () => {
  it('süre bitince önde olan kazanır', () => {
    const f = flow({ durationSeconds: 3 });
    toPlaying(f);
    run(f, 1, 1);
    run(f, CELEBRATION_STEPS);
    toPlaying(f);
    const events = run(f, steps(3));
    expect(events).toContainEqual({ type: 'matchEnd', winner: 1, reason: 'time' });
    expect(f.phase).toBe('matchEnd');
    expect(f.winner).toBe(1);
    expect(f.timeLeft).toBe(0);
    expect(f.playersActive).toBe(false);
    expect(f.goalsAllowed).toBe(false);
  });

  it('süre tam bittiği anda değil, bir adım önce bitmez (90 sn = 5400 adım)', () => {
    const f = flow();
    toPlaying(f);
    expect(run(f, steps(MATCH.durationSeconds) - 1).some((e) => e.type === 'goldenGoal')).toBe(
      false,
    );
    expect(f.phase).toBe('playing');
    expect(run(f, 1)).toContainEqual({ type: 'goldenGoal' });
  });

  it('beraberlikte altın gol: santra (uzun bekleme) → goldenGoal; saat işlemez', () => {
    const f = flow({ durationSeconds: 2 });
    toPlaying(f);
    const events = run(f, steps(2));
    expect(events).toEqual([{ type: 'goldenGoal' }, { type: 'kickoff' }]);
    expect(f.overtime).toBe(true);
    expect(f.phase).toBe('kickoff');
    expect(f.kickoffDuration).toBe(MATCH.goldenGoalKickoffSeconds);

    expect(run(f, steps(MATCH.goldenGoalKickoffSeconds))).toEqual([
      { type: 'playStart', overtime: true },
    ]);
    expect(f.phase).toBe('goldenGoal');
    expect(f.goalsAllowed).toBe(true);

    // Uzatma süresiz: uzun süre gol olmasa da maç bitmez.
    run(f, steps(60));
    expect(f.phase).toBe('goldenGoal');
    expect(f.timeLeft).toBe(0);
  });

  it('altın golü atan kazanır: gol → kutlama → maç sonu (santra yok)', () => {
    const f = flow({ durationSeconds: 1 });
    toPlaying(f);
    run(f, steps(1));
    toPlaying(f);
    expect(f.phase).toBe('goldenGoal');

    expect(run(f, 1, 0)).toEqual([{ type: 'goal', scorer: 0 }]);
    expect(f.phase).toBe('goalScored');
    const events = run(f, CELEBRATION_STEPS);
    expect(events).toEqual([{ type: 'matchEnd', winner: 0, reason: 'goldenGoal' }]);
    expect(f.phase).toBe('matchEnd');
    expect(f.winner).toBe(0);
    expect(f.score).toEqual([1, 0]);
  });

  it('son adımdaki gol geçerlidir; kutlamadan sonra süre bitmiş sayılır', () => {
    const f = flow({ durationSeconds: 2 });
    toPlaying(f);
    run(f, steps(2) - 1);
    expect(f.phase).toBe('playing');
    // Son adımda hem gol hem süre bitimi: gol önce işlenir.
    expect(run(f, 1, 0)).toEqual([{ type: 'goal', scorer: 0 }]);
    expect(f.score).toEqual([1, 0]);
    expect(run(f, CELEBRATION_STEPS)).toEqual([{ type: 'kickoff' }]);
    // Bir adımlık süre kalmıştı: santradan sonra oyun bir adım sürer ve maç biter.
    toPlaying(f);
    expect(run(f, 1)).toEqual([{ type: 'matchEnd', winner: 0, reason: 'time' }]);
  });

  it('son saniyede eşitleyen gol: kalan süre oynanır, sonra altın gole gidilir', () => {
    const f = flow({ durationSeconds: 2 });
    toPlaying(f);
    run(f, 1, 1);
    run(f, CELEBRATION_STEPS);
    toPlaying(f);
    run(f, steps(2) - 2);
    expect(run(f, 1, 0)).toEqual([{ type: 'goal', scorer: 0 }]);
    expect(f.score).toEqual([1, 1]);
    run(f, CELEBRATION_STEPS);
    toPlaying(f);
    // Golden önce 2 adımlık süre kalmıştı.
    expect(run(f, 1)).toEqual([]);
    expect(run(f, 1)).toEqual([{ type: 'goldenGoal' }, { type: 'kickoff' }]);
  });

  it('altın gol kapalıysa beraberlikte maç berabere biter', () => {
    const f = flow({ durationSeconds: 1, goldenGoalOvertime: false });
    toPlaying(f);
    expect(run(f, steps(1))).toEqual([{ type: 'matchEnd', winner: null, reason: 'time' }]);
    expect(f.winner).toBeNull();
  });

  it('maç sonunda verilen gol ve geçen süre durumu değiştirmez', () => {
    const f = flow({ durationSeconds: 1, goldenGoalOvertime: false });
    toPlaying(f);
    run(f, steps(1));
    const events: SimEvent[] = [];
    for (let i = 0; i < 120; i++) f.advance(DT, 0, events);
    expect(events).toEqual([]);
    expect(f.phase).toBe('matchEnd');
    expect(f.score).toEqual([0, 0]);
    expect(f.phaseTime).toBeCloseTo(2, 6);
  });
});

describe('MatchFlow — durum özeti', () => {
  it('snapshot düz veridir ve akışı yansıtır', () => {
    const f = flow({ durationSeconds: 1 });
    toPlaying(f);
    run(f, 1, 1);
    const snap = f.snapshot();
    expect(snap).toMatchObject({ phase: 'goalScored', score: [0, 1], lastScorer: 1 });
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
    // Kopyadır: akış ilerleyince eski özet değişmez.
    run(f, 1, null);
    f.score[0] = 9;
    expect(snap.score).toEqual([0, 1]);
  });
});
