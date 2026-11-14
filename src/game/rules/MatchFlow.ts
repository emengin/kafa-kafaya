import { LOOP, MATCH } from '../../config/gameConfig';
import type { MatchEndReason, PlayerIndex, SimEvent } from '../types';

/**
 * Maç durumları:
 *
 * ```
 * kickoff ──(bekleme + düdük)──▶ playing ──(gol)──▶ goalScored ──(2 sn)──▶ kickoff …
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
  readonly goalSlowMoSeconds: number;
  readonly goalSlowMoScale: number;
}

export const DEFAULT_MATCH_RULES: MatchRules = {
  durationSeconds: MATCH.durationSeconds,
  goldenGoalOvertime: MATCH.goldenGoalOvertime,
  kickoffSeconds: MATCH.kickoffSeconds,
  goldenGoalKickoffSeconds: MATCH.goldenGoalKickoffSeconds,
  goalCelebrationSeconds: MATCH.goalCelebrationSeconds,
  goalSlowMoSeconds: MATCH.goalSlowMoSeconds,
  goalSlowMoScale: MATCH.goalSlowMoScale,
};

export interface MatchSnapshot {
  readonly phase: MatchPhase;
  readonly overtime: boolean;
  readonly timeLeft: number;
  readonly phaseTime: number;
  readonly score: readonly [number, number];
  readonly lastScorer: PlayerIndex | -1;
  readonly winner: PlayerIndex | null;
  readonly endReason: MatchEndReason | null;
}

const EPS = LOOP.epsilonSeconds;

/**
 * Maç kurallarının deterministik durum makinesi. Fizikten ve Phaser'dan bağımsızdır:
 * her sabit adımda `advance(dt, golAtan)` çağrılır, geçişler olay olarak döner.
 *
 * Zaman: `dt` simülasyon süresidir. Ağır çekim (`timeScale < 1`) sahnede gerçek zamanı
 * yavaşlatarak uygulanır; gol kutlaması sayacı ise **gerçek süreye** göre ilerler
 * (`dt / timeScale`), böylece "1 sn ağır çekim, 2 sn sonra santra" gerçek saniyedir ve
 * yine de yalnızca adım sayısına bağlıdır (determinizm korunur).
 */
export class MatchFlow {
  phase: MatchPhase = 'kickoff';
  /** Altın gol uzatmasında mı? */
  overtime = false;
  /** Normal sürenin kalanı (sn). Yalnızca `playing` durumunda azalır. */
  timeLeft: number;
  /** Mevcut durumda geçen süre (sn; gol kutlamasında gerçek süre eşdeğeri). */
  phaseTime = 0;
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

  /** Oyunun akış hızı: gol sonrası ağır çekimde < 1. Sahne gerçek zamanı bununla çarpar. */
  get timeScale(): number {
    return this.phase === 'goalScored' && this.phaseTime + EPS < this.rules.goalSlowMoSeconds
      ? this.rules.goalSlowMoScale
      : 1;
  }

  get kickoffDuration(): number {
    return this.overtime ? this.rules.goldenGoalKickoffSeconds : this.rules.kickoffSeconds;
  }

  /**
   * Bir sabit adım ilerletir.
   * @param dt      Simülasyon adımı (sn).
   * @param scorer  Bu adımda gol atan oyuncu (top kaleye tamamen girdiyse), yoksa null.
   *                Aynı adımda süre de bitse gol önce işlenir (son saniye golü geçerlidir).
   * @param events  Geçiş olaylarının ekleneceği liste.
   */
  advance(dt: number, scorer: PlayerIndex | null, events: SimEvent[]): void {
    switch (this.phase) {
      case 'kickoff':
        this.phaseTime += dt;
        if (this.phaseTime + EPS >= this.kickoffDuration) {
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
        this.phaseTime += dt;
        if (this.phase === 'playing') {
          this.timeLeft = Math.max(0, this.timeLeft - dt);
          if (this.timeLeft <= EPS) {
            this.timeLeft = 0;
            this.resolveFullTime(events);
          }
        }
        break;

      case 'goalScored':
        // Kutlama sayacı gerçek süreyle ilerler (ağır çekimde adım başına daha çok).
        this.phaseTime += dt / this.timeScale;
        if (this.phaseTime + EPS >= this.rules.goalCelebrationSeconds) this.afterGoal(events);
        break;

      case 'matchEnd':
        this.phaseTime += dt;
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
    this.phaseTime = 0;
  }

  snapshot(): MatchSnapshot {
    return {
      phase: this.phase,
      overtime: this.overtime,
      timeLeft: this.timeLeft,
      phaseTime: this.phaseTime,
      score: [this.score[0], this.score[1]],
      lastScorer: this.lastScorer,
      winner: this.winner,
      endReason: this.endReason,
    };
  }
}
