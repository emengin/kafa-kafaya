import { LOOP, MATCH } from '../../config/gameConfig';
import type { MatchEndReason, PlayerIndex, SimEvent } from '../types';

/**
 * Maç durumları:
 *
 * ```
 * kickoff ──(48 adım + düdük)──▶ playing ──(gol)──▶ goalScored ──(120 adım)──▶ kickoff …
 *                                   │                    │
 *                              (süre biter)     (süre bitmişse / uzatmadaysa)
 *                                   ▼                    ▼
 *                     berabere? ─evet─▶ kickoff (uzatma) ─▶ goldenGoal ─(gol)─▶ goalScored ─▶ matchEnd
 *                                └─hayır─▶ matchEnd
 * ```
 *
 * Duraklatma bu makinenin parçası değildir: duraklatılmış oyunda simülasyon hiç adım atmaz
 * (bkz. MatchScene), böylece her durumdan duraklatılıp aynı yerden devam edilebilir.
 */
export type MatchPhase = 'kickoff' | 'playing' | 'goalScored' | 'goldenGoal' | 'matchEnd';

/** Maç kuralları; testlerde ve ileride farklı modlarda (antrenman, turnuva) değiştirilebilir. */
export interface MatchRules {
  readonly durationSeconds: number;
  readonly goldenGoalOvertime: boolean;
  readonly kickoffSeconds: number;
  readonly goldenGoalKickoffSeconds: number;
  readonly goalCelebrationSeconds: number;
}

export const DEFAULT_MATCH_RULES: MatchRules = {
  durationSeconds: MATCH.durationSeconds,
  goldenGoalOvertime: MATCH.goldenGoalOvertime,
  kickoffSeconds: MATCH.kickoffSeconds,
  goldenGoalKickoffSeconds: MATCH.goldenGoalKickoffSeconds,
  goalCelebrationSeconds: MATCH.goalCelebrationSeconds,
};

export interface MatchSnapshot {
  readonly phase: MatchPhase;
  readonly overtime: boolean;
  readonly timeLeft: number;
  readonly phaseTicks: number;
  readonly score: readonly [number, number];
  readonly lastScorer: PlayerIndex | -1;
  readonly winner: PlayerIndex | null;
  readonly endReason: MatchEndReason | null;
}

const EPS = LOOP.epsilonSeconds;

/** Süreyi (sn) sabit adım sayısına çevirir: 0,8 sn → 48, 2 sn → 120 adım (60 Hz). */
export function secondsToTicks(seconds: number): number {
  return Math.round(seconds * LOOP.stepHz);
}

/**
 * Maç kurallarının deterministik durum makinesi. Fizikten ve Phaser'dan bağımsızdır:
 * her sabit adımda `advance(dt, golAtan)` çağrılır, geçişler olay olarak döner.
 *
 * Zaman (Faz 2.7): evre süreleri **adım sayısıyla** ilerler (`phaseTicks`, tam sayı): santra 48,
 * altın gol santrası 108, gol sonrası duraklama 120 adım. Kayan nokta birikimi yoktur; duraklama
 * her motorda aynı adımda biter. Simülasyonun adım hızı hiç değişmez: gol sonrası ağır çekim ve
 * hit-stop yalnızca görüntüdedir (`PresentationTimeline`). Normal sürenin kalanı (`timeLeft`)
 * saniye olarak `dt` ile azalır (yalnızca çıkarma: her motorda aynı).
 */
export class MatchFlow {
  phase: MatchPhase = 'kickoff';
  /** Altın gol uzatmasında mı? */
  overtime = false;
  /** Normal sürenin kalanı (sn). Yalnızca `playing` durumunda azalır. */
  timeLeft: number;
  /** Mevcut durumda geçen adım sayısı. */
  phaseTicks = 0;
  readonly score: [number, number] = [0, 0];
  lastScorer: PlayerIndex | -1 = -1;
  winner: PlayerIndex | null = null;
  endReason: MatchEndReason | null = null;

  constructor(readonly rules: MatchRules = DEFAULT_MATCH_RULES) {
    this.timeLeft = rules.durationSeconds;
  }

  /** Santra beklemesini atlayıp doğrudan oyunu başlatır (testler, antrenman). */
  startInPlay(): void {
    this.enter(this.overtime ? 'goldenGoal' : 'playing');
  }

  /** Oyuncu girdileri uygulanır mı? Santra beklemesinde ve maç bitince oyuncular durur. */
  get playersActive(): boolean {
    return this.phase !== 'kickoff' && this.phase !== 'matchEnd';
  }

  /** Top santra noktasında tutuluyor mu? */
  get ballHeld(): boolean {
    return this.phase === 'kickoff';
  }

  /** Gol sayılabilir mi? (Kutlama, santra ve maç sonunda ikinci gol sayılmaz.) */
  get goalsAllowed(): boolean {
    return this.phase === 'playing' || this.phase === 'goldenGoal';
  }

  /** Mevcut durumda geçen süre (sn; adım sayısından, gösterim için). */
  get phaseTime(): number {
    return this.phaseTicks / LOOP.stepHz;
  }

  get kickoffDuration(): number {
    return this.overtime ? this.rules.goldenGoalKickoffSeconds : this.rules.kickoffSeconds;
  }

  /** Santra beklemesinin adım sayısı. */
  get kickoffTicks(): number {
    return secondsToTicks(this.kickoffDuration);
  }

  /** Gol sonrası duraklamanın adım sayısı. */
  get celebrationTicks(): number {
    return secondsToTicks(this.rules.goalCelebrationSeconds);
  }

  /**
   * Bir sabit adım ilerletir.
   * @param dt      Simülasyon adımı (sn); yalnızca normal sürenin kalanını azaltır.
   * @param scorer  Bu adımda gol atan oyuncu (top kaleye tamamen girdiyse), yoksa null.
   *                Aynı adımda süre de bitse gol önce işlenir (son saniye golü geçerlidir).
   * @param events  Geçiş olaylarının ekleneceği liste.
   */
  advance(dt: number, scorer: PlayerIndex | null, events: SimEvent[]): void {
    switch (this.phase) {
      case 'kickoff':
        this.phaseTicks++;
        if (this.phaseTicks >= this.kickoffTicks) {
          this.enter(this.overtime ? 'goldenGoal' : 'playing');
          events.push({ type: 'playStart', overtime: this.overtime });
        }
        break;

      case 'playing':
      case 'goldenGoal':
        if (scorer !== null && this.goalsAllowed) {
          this.score[scorer]++;
          this.lastScorer = scorer;
          this.enter('goalScored');
          events.push({ type: 'goal', scorer });
          break;
        }
        this.phaseTicks++;
        if (this.phase === 'playing') {
          this.timeLeft = Math.max(0, this.timeLeft - dt);
          if (this.timeLeft <= EPS) {
            this.timeLeft = 0;
            this.resolveFullTime(events);
          }
        }
        break;

      case 'goalScored':
        // Gol sonrası duraklama: sabit adım sayısı (ağır çekim yalnızca görüntüde).
        this.phaseTicks++;
        if (this.phaseTicks >= this.celebrationTicks) this.afterGoal(events);
        break;

      case 'matchEnd':
        this.phaseTicks++;
        break;
    }
  }

  private afterGoal(events: SimEvent[]): void {
    if (this.overtime) {
      this.finish(this.lastScorer === -1 ? null : this.lastScorer, 'goldenGoal', events);
    } else if (this.timeLeft <= EPS) {
      this.resolveFullTime(events);
    } else {
      this.startKickoff(events);
    }
  }

  /** Normal süre bitti: beraberlikte altın gol uzatması, değilse maç sonu. */
  private resolveFullTime(events: SimEvent[]): void {
    const [a, b] = this.score;
    if (a === b && this.rules.goldenGoalOvertime) {
      this.overtime = true;
      events.push({ type: 'goldenGoal' });
      this.startKickoff(events);
      return;
    }
    this.finish(a === b ? null : a > b ? 0 : 1, 'time', events);
  }

  private startKickoff(events: SimEvent[]): void {
    this.enter('kickoff');
    events.push({ type: 'kickoff' });
  }

  private finish(winner: PlayerIndex | null, reason: MatchEndReason, events: SimEvent[]): void {
    this.winner = winner;
    this.endReason = reason;
    this.enter('matchEnd');
    events.push({ type: 'matchEnd', winner, reason });
  }

  private enter(phase: MatchPhase): void {
    this.phase = phase;
    this.phaseTicks = 0;
  }

  snapshot(): MatchSnapshot {
    return {
      phase: this.phase,
      overtime: this.overtime,
      timeLeft: this.timeLeft,
      phaseTicks: this.phaseTicks,
      score: [this.score[0], this.score[1]],
      lastScorer: this.lastScorer,
      winner: this.winner,
      endReason: this.endReason,
    };
  }
}
