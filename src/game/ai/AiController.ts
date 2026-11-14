import {
  AI,
  AI_PROFILES,
  BALL,
  DISPLAY,
  KICK,
  LOOP,
  PITCH,
  PLAYER,
  UNITS,
  type AiDifficulty,
  type AiProfile,
  type SuperType,
} from '../../config/gameConfig';
import { EMPTY_INPUT, type InputSource, type InputState } from '../../input/InputState';
import { clamp, lerp } from '../../physics';
import type { PlayerParams } from '../characters';
import { Ball, type BallSuperState } from '../entities/Ball';
import { PLAYER_STAND_OFFSET } from '../entities/Player';
import { computeKick } from '../kick';
import { createPitch, setGoalMouthHeight, type GoalDef } from '../pitch';
import { ballHitsBalloon, type Balloon } from '../powerups';
import { launchSuper } from '../superEffects';
import type { Facing, PlayerIndex } from '../types';
import { BallPredictor } from './BallPredictor';
import {
  hopHoldTicks,
  jumpLead,
  jumpProfile,
  KickSimulator,
  type JumpProfile,
  type KickProbe,
  type SelfState,
  type Trajectory,
} from './motion';
import { SeededRandom } from './random';
import type { PlayerView, WorldView } from './worldView';

/**
 * AI modları (debug ve istatistik için de kullanılır):
 * - `position`: bekle / pozisyon al
 * - `attack`: topun arkasına geç, rakip kaleye vur
 * - `defend`: kaleyi koru, arkada kalan topu kurtar
 * - `header`: havadaki topa zamanlı zıplama (hücum ya da savunma amaçlı)
 * - `escape`: sıkışma kaçışı
 * - `idle`: oyun akmıyor (santra, maç sonu)
 */
export type AiMode = 'idle' | 'position' | 'attack' | 'defend' | 'header' | 'escape';
export type EscapeKind = 'push' | 'elevated' | 'ballOnHead' | 'idle';

export const AI_MODES: readonly AiMode[] = [
  'idle',
  'position',
  'attack',
  'defend',
  'header',
  'escape',
];
export const ESCAPE_KINDS: readonly EscapeKind[] = ['push', 'elevated', 'ballOnHead', 'idle'];

export interface AiOptions {
  readonly index: PlayerIndex;
  readonly difficulty: AiDifficulty;
  /** İnsani rastgeleliğin tohumu: aynı tohum + aynı maç → aynı kararlar. */
  readonly seed: number;
  /** Profilin üzerine yazılacak değerler (testler, ayar denemeleri). */
  readonly overrides?: Partial<AiProfile>;
}

export interface AiStats {
  readonly modeTicks: Record<AiMode, number>;
  readonly escapes: Record<EscapeKind, number>;
  kicksPressed: number;
  jumpsPressed: number;
  supersArmed: number;
  predictions: number;
}

/** Debug katmanı için gerçek (aynalanmamış) koordinatlarda özet. */
export interface AiDebugInfo {
  readonly index: PlayerIndex;
  readonly mode: AiMode;
  readonly targetX: number;
  readonly delayMs: number;
  /** Tahmin edilen yörünge: [x0, y0, x1, y1, …] (şimdiden itibaren, seyreltilmiş). */
  readonly trajectory: readonly number[];
}

type Purpose = 'attack' | 'defend';

interface Plan {
  targetX: number;
  /** Zıplama tuşuna basılacak mutlak adım (−1 = yok). */
  jumpAtTick: number;
  jumpHoldTicks: number;
  jumped: boolean;
  /** Arkada kalan alçak topun üstünden zıpla. */
  hop: boolean;
  kickAllowed: boolean;
  /** Planlanan vuruşun beklenen mutlak adımı (−1 = yok); süper zamanlaması için. */
  hitTick: number;
  purpose: Purpose;
}

interface Intercept {
  /** Şimdiden kaç adım sonra. */
  readonly step: number;
  /** Oyuncunun (kafa merkezinin) o anda olması gereken x. */
  readonly x: number;
  /** Zıplamaya şimdiden kaç adım sonra basılmalı (yalnızca kafa planında). */
  readonly jumpStep: number;
}

interface Analysis {
  readonly ballX: number;
  readonly ballY: number;
  /** Top (tahmine göre) kendi kaleme girecekse kaç adım sonra; yoksa −1. */
  readonly threatStep: number;
  readonly ballBehind: boolean;
  readonly ground: Intercept | null;
  readonly aerialAttack: Intercept | null;
  readonly aerialDefend: Intercept | null;
  readonly myTime: number;
  readonly oppTime: number;
}

/** Algılanan dünya (kanonik çerçevede): top (süper etkisiyle) + rakip. */
interface Percept {
  bx: number;
  by: number;
  bvx: number;
  bvy: number;
  spin: number;
  cross: number;
  /** Süper etki; sahip kanonik: 0 = ben, 1 = rakip. Yön kanonik. */
  sType: SuperType | null;
  sOwner: PlayerIndex | -1;
  sTime: number;
  sDir: Facing;
  phased: boolean;
  phaseDone: boolean;
  rScale: number;
  ox: number;
  oy: number;
  ovx: number;
}

/** Tahminciye verilen başlangıç durumu (kanonik). */
interface StartState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angVel: number;
  crossbarTimer: number;
  super: BallSuperState;
}

/** Süper tipi kullanım koşulları (`AI.super.byType`). */
interface SuperUseRule {
  readonly minDistancePx: number;
  readonly maxDistancePx: number;
  readonly opponentAhead?: boolean;
  readonly opponentOffLinePx?: number;
  readonly opponentNearPx?: number;
}

const W = DISPLAY.width;
const STEP = 1 / LOOP.stepHz;
const STAND_Y = PITCH.groundY - PLAYER_STAND_OFFSET;
const BODY_R = PLAYER.body.radius;
/** Kanonik çerçevede kendi kale çizgim (solda) ve rakip kale çizgisi (sağda). */
const OWN_LINE = PITCH.goal.depth;
const OPP_LINE = W - PITCH.goal.depth;
/** `hopHold` dönüşü: top aşılamayacak kadar yüksek, beklenmeli. */
const HOP_WAIT = -1;
const SPAWN_X = W * PLAYER.spawnXRatio;
/** Rakibe çarpınca etkisi olan süperler (kaçınılır; şut değerlendirmesinde ayrı puanlanır). */
const HIT_SUPERS: readonly SuperType[] = ['ice', 'fire', 'tornado'];
const KICK_PROBE_TICKS = Math.ceil(KICK.swingSeconds * LOOP.stepHz) + 1;

const secToSteps = (s: number): number => Math.round(s * LOOP.stepHz);
const msToSteps = (ms: number): number => secToSteps(ms / UNITS.msPerSecond);

function emptyModeRecord(): Record<AiMode, number> {
  return { idle: 0, position: 0, attack: 0, defend: 0, header: 0, escape: 0 };
}

/** Tahmin tamponunu "şimdi"den itibaren okuyan kanonik yörünge (tahminci zaten kanonik). */
class TrajectoryView implements Trajectory {
  offset = 0;
  constructor(private readonly pred: BallPredictor) {}
  x(k: number): number {
    return this.pred.x(this.offset + k);
  }
  y(k: number): number {
    return this.pred.y(this.offset + k);
  }
  vx(k: number): number {
    return this.pred.vx(this.offset + k);
  }
  vy(k: number): number {
    return this.pred.vy(this.offset + k);
  }
  /** Şimdiden itibaren kalan tahmin adımı. */
  get remaining(): number {
    return Math.max(0, this.pred.length - 1 - this.offset);
  }
}

/**
 * Yapay zekâ rakip. Her adımda yalnızca bir `WorldView` (ekranda görünen bilginin kopyası)
 * okur ve bir `InputState` üretir: insanla aynı fizik ve kurallar, hile yok.
 *
 * Katmanlar:
 * 1. **Algı:** top ve rakip `reactionMs` kadar gecikmeli görülür (geçmiş tamponu). Kendi
 *    bedeni gecikmesizdir (insan kendi tuşlarını bilir).
 * 2. **Tahmin:** gecikmeli top durumuna `predictionError` oranında gürültü eklenip fizik
 *    modülünün kopyasıyla ~1,5 sn ileri simüle edilir (`BallPredictor`). Her karede değil:
 *    `predictionIntervalMs` aralıkla ya da bir çarpışma görüldüğünde yenilenir.
 * 3. **Karar (utility):** `decisionIntervalMs` aralıkla savun / hücum / kafa / pozisyon
 *    puanlanır, en iyisi (histerezisle) seçilir ve bir plan (hedef x, zıplama anı) kurulur.
 * 4. **Refleks:** her adım hedefe yürür, planlanan anda zıplar; şut tuşuna yalnızca hayalet
 *    ayak simülasyonu temas gösterdiğinde ve şut değerlendirmesi uygunsa basar; süperi uygun
 *    mesafe ve fırsatta hazırlar.
 * 5. **Sıkışma önleme:** itişme/kilitlenme, direk ya da rakip kafası üstünde kalma, topu kafada
 *    taşıma ve topun yanında donup kalma algılanır; kısa bir kaçış hareketi yapılır.
 *
 * Kanonik çerçeve: AI kendini hep sol kaleyi savunan, sağa hücum eden oyuncu olarak görür;
 * P2 için dünya x ekseninde aynalanır (saha ve fizik simetriktir).
 */
export class AiController {
  readonly index: PlayerIndex;
  readonly difficulty: AiDifficulty;
  readonly profile: AiProfile;
  readonly stats: AiStats = {
    modeTicks: emptyModeRecord(),
    escapes: { push: 0, elevated: 0, ballOnHead: 0, idle: 0 },
    kicksPressed: 0,
    jumpsPressed: 0,
    supersArmed: 0,
    predictions: 0,
  };

  private readonly sign: 1 | -1;
  private readonly rng: SeededRandom;
  private readonly ownGoal: GoalDef;
  private readonly oppGoal: GoalDef;
  private readonly horizonSteps = secToSteps(AI.predictionHorizonSeconds);
  private readonly shotSteps = secToSteps(AI.shotHorizonSeconds);
  private readonly maxDelay = msToSteps(AI.maxReactionMs);
  private readonly decisionSteps: number;
  private readonly predictionSteps: number;
  private readonly predictor: BallPredictor;
  private readonly shotPredictor: BallPredictor;
  private readonly traj: TrajectoryView;
  private readonly kickSim = new KickSimulator();
  /** Süperli şut denemesi için karalama topu (etki durumunu kurmak için). */
  private readonly scratch = new Ball();

  // Beden (karakter + güçlendiriciler; her adım görünümden güncellenir)
  private headR: number = PLAYER.head.radius;
  private oppHeadR: number = PLAYER.head.radius;
  private ballR: number = BALL.radius;
  private maxSpeed: number = PLAYER.move.maxSpeed;
  private oppMaxSpeed: number = PLAYER.move.maxSpeed;
  private jump: JumpProfile = jumpProfile(PLAYER.jump.speed);
  private myParams: PlayerParams | null = null;
  private mySuper: SuperType = 'fire';
  private jumpLockSteps = 0;
  private oppFrozenSteps = 0;
  private oppArmed = false;
  private canDoubleJump = false;
  private crossbarBottomOwn = PITCH.groundY - PITCH.goal.mouthHeight;
  private balloon: Balloon | null = null;
  /** Serap: izlenen yanılsama (−1 = gerçek top) ve görülen yanılsama sayısı. */
  private trackedDecoy = -1;
  private decoyCount = 0;
  /** Bu tehlikeli süperden kaçınılacak mı (top başına bir kez zar). */
  private dodgeRoll: 'none' | 'yes' | 'no' = 'none';
  private dodgeJumpUntil = -1;

  // Algı
  private readonly history: Percept[];
  private histCount = 0;
  private histHead = -1;
  private delaySteps: number;
  private readonly seen: Percept = blankPercept();
  private seenTick = 0;
  private sawEvent = false;

  // Tahmin
  private predBaseTick = -1;
  private nextPredictionTick = 0;
  private noiseX = 0;
  private noiseY = 0;
  private readonly startState: StartState = blankStart();

  // Karar
  private tick = 0;
  private nextDecisionTick = 0;
  private mode: AiMode = 'idle';
  private readonly plan: Plan = blankPlan();
  private aimOffset = 0;
  private superRoll: 'none' | 'yes' | 'no' = 'none';
  private contestSince = -1;
  private contestPatience = 0;
  private distracted = false;
  private looseSince = -1;
  private looseDelay = 0;

  // Refleks
  private lastDir = 0;
  private lastJump = false;
  private lastKick = false;
  private lastSuper = false;
  private jumpHoldUntil = -1;
  private hesitateUntil = -1;
  private kickTimingOffset = 0;
  private lastChanceTick = Number.NEGATIVE_INFINITY;
  private opportunityStart = 0;

  // Sıkışma
  private pushTimer = 0;
  private elevatedTimer = 0;
  private headTimer = 0;
  private idleTimer = 0;
  private idleAnchorX = 0;
  private escapeUntil = -1;
  private escapeJumpUntil = -1;
  private escapeCooldownUntil = 0;
  private escapeDir = 0;
  private pushPatience = 1;

  constructor(options: AiOptions) {
    this.index = options.index;
    this.difficulty = options.difficulty;
    this.profile = { ...AI_PROFILES[options.difficulty], ...options.overrides };
    this.sign = options.index === 0 ? 1 : -1;
    this.rng = new SeededRandom(options.seed);
    this.pushPatience = this.rng.range(AI.stuck.pushPatienceMin, AI.stuck.pushPatienceMax);
    const pitch = createPitch();
    this.ownGoal = pitch.goals[0];
    this.oppGoal = pitch.goals[1];
    this.decisionSteps = Math.max(1, msToSteps(this.profile.decisionIntervalMs));
    this.predictionSteps = Math.max(1, msToSteps(this.profile.predictionIntervalMs));
    this.delaySteps = clamp(msToSteps(this.profile.reactionMs), 0, this.maxDelay);
    this.predictor = new BallPredictor(
      this.horizonSteps + this.maxDelay + this.predictionSteps + this.decisionSteps,
      pitch,
    );
    this.shotPredictor = new BallPredictor(this.shotSteps, pitch);
    this.traj = new TrajectoryView(this.predictor);
    this.history = Array.from({ length: this.maxDelay + 2 }, blankPercept);
  }

  /** Şu anki mod (debug, testler). */
  get currentMode(): AiMode {
    return this.mode;
  }

  /** Bir adımlık karar: dünya görünümünden bu adımın girdisini üretir. */
  update(view: WorldView): InputState {
    this.tick = view.tick;
    this.updateBody(view);
    const me = this.canonicalSelf(view.players[this.index]);
    this.record(view);

    if (view.phase === 'kickoff' || view.phase === 'matchEnd') {
      this.goIdle();
      return this.output(0, false, false, false);
    }

    this.perceive();
    this.refreshPrediction();

    if (view.phase === 'goalScored') {
      // Kutlama: başlangıç konumuna yürü, topa dokunma.
      this.mode = 'idle';
      this.stats.modeTicks.idle++;
      const dx = SPAWN_X - me.x;
      return this.output(
        Math.abs(dx) > AI.movement.deadzonePx ? Math.sign(dx) : 0,
        false,
        false,
        false,
      );
    }

    this.updateStuck(me);
    // Bir çarpışma görüldüyse (şut, sekme) sıradaki karar öne alınır — yine de anında değil.
    if (this.sawEvent) {
      const soon = this.tick + Math.ceil(this.decisionSteps * AI.eventDecisionFactor);
      this.nextDecisionTick = Math.min(this.nextDecisionTick, soon);
    }
    if (this.tick >= this.nextDecisionTick && this.tick >= this.escapeUntil) this.decide(me);
    const out = this.act(me, view.players[this.index]);
    this.stats.modeTicks[this.mode]++;
    return out;
  }

  /** Debug katmanı için özet (gerçek koordinatlar). */
  debugInfo(): AiDebugInfo {
    const points: number[] = [];
    const stride = AI.debugTrajectoryStride;
    for (let k = 0; k <= this.traj.remaining; k += stride) {
      points.push(this.toRealX(this.traj.x(k)), this.traj.y(k));
    }
    return {
      index: this.index,
      mode: this.mode,
      targetX: this.toRealX(this.plan.targetX),
      delayMs: (this.delaySteps / LOOP.stepHz) * UNITS.msPerSecond,
      trajectory: points,
    };
  }

  // ───────────────────────────── Algı ─────────────────────────────

  private toRealX(x: number): number {
    return this.sign === 1 ? x : W - x;
  }

  private canonicalSelf(p: PlayerView): SelfState {
    return {
      x: this.toRealX(p.x),
      y: p.y,
      vx: this.sign * p.vx,
      vy: p.vy,
      grounded: p.grounded,
    };
  }

  private get minX(): number {
    return this.headR;
  }

  private get maxX(): number {
    return W - this.headR;
  }

  private get headBall(): number {
    return this.headR + this.ballR;
  }

  private get bodyBall(): number {
    return BODY_R + this.ballR;
  }

  /** Kale ağzında kafanın üst direğe çarpmadan yükselebileceği en çok yükseklik (px). */
  private get barMaxRise(): number {
    return STAND_Y - (this.crossbarBottomOwn + this.headR) - AI.header.crossbarClearancePx;
  }

  /**
   * Bedenin ve sahanın görünür durumu: kendi/rakip kafa boyutu ve hızı (karakter +
   * güçlendiriciler), zıplama profili, donma/zıplama kilidi, kale yükseklikleri, balon.
   */
  private updateBody(view: WorldView): void {
    const me: PlayerView = view.players[this.index];
    const opp: PlayerView = view.players[this.index === 0 ? 1 : 0];
    this.headR = me.params.headRadius * me.headScale;
    this.oppHeadR = opp.params.headRadius * opp.headScale;
    this.ballR = BALL.radius * view.ball.super.radiusScale;
    this.maxSpeed = me.params.maxSpeed * me.speedScale;
    this.oppMaxSpeed = opp.params.maxSpeed * opp.speedScale;
    if (this.myParams !== me.params || this.mySuper !== me.superType) {
      this.myParams = me.params;
      this.mySuper = me.superType;
      this.jump = jumpProfile(me.params.jumpSpeed);
    }
    this.kickSim.configure({ params: me.params, superType: me.superType }, me.speedScale);
    this.jumpLockSteps = Math.ceil(me.jumpLockTimer * LOOP.stepHz);
    this.oppFrozenSteps = Math.ceil(opp.frozenTimer * LOOP.stepHz);
    this.oppArmed = opp.superArmed;
    this.canDoubleJump = me.doubleJumpEnabled && !me.airJumpUsed && this.jumpLockSteps === 0;
    const [ownGoal, oppGoal] = this.predictor.field.goals;
    const other = this.index === 0 ? 1 : 0;
    setGoalMouthHeight(ownGoal, view.goalMouths[this.index]);
    setGoalMouthHeight(oppGoal, view.goalMouths[other]);
    this.crossbarBottomOwn = PITCH.groundY - ownGoal.mouthHeight;
    const b = view.balloon;
    // Balon kanonik çerçevede: x aynalanır (sinüs evresi π kayar).
    this.balloon =
      b === null
        ? null
        : this.sign === 1
          ? b
          : { type: b.type, cx: W - b.cx, cy: b.cy, phase: b.phase + Math.PI, age: b.age };
  }

  /**
   * O anki görünümü (kanonik) geçmiş tamponuna yazar. Serap'ta AI üç toptan birini izler
   * (gerçeği `mirageReadChance` olasılıkla seçer); yanılsama sönünce gerçek topa geçer.
   */
  private record(view: WorldView): void {
    this.histHead = (this.histHead + 1) % this.history.length;
    this.histCount = Math.min(this.histCount + 1, this.history.length);
    const slot = this.history[this.histHead];
    if (!slot) return;
    const b = view.ball;
    const sup = b.super;
    const opp = view.players[this.index === 0 ? 1 : 0];
    const decoys = view.decoys;
    if (decoys.length !== this.decoyCount) {
      const fresh =
        decoys.length > this.decoyCount &&
        sup.superType === 'mirage' &&
        sup.superOwner !== this.index;
      this.trackedDecoy =
        fresh && !this.rng.chance(this.profile.mirageReadChance)
          ? Math.min(decoys.length - 1, Math.floor(this.rng.next() * decoys.length))
          : -1;
      this.decoyCount = decoys.length;
    }
    const decoy = this.trackedDecoy >= 0 ? decoys[this.trackedDecoy] : undefined;
    if (decoy) {
      slot.bx = this.toRealX(decoy.x);
      slot.by = decoy.y;
      slot.bvx = this.sign * decoy.vx;
      slot.bvy = decoy.vy;
      slot.sType = null;
      slot.sOwner = -1;
      slot.sTime = 0;
      slot.phased = false;
      slot.phaseDone = false;
      slot.rScale = 1;
    } else {
      slot.bx = this.toRealX(b.x);
      slot.by = b.y;
      slot.bvx = this.sign * b.vx;
      slot.bvy = b.vy;
      slot.sType = sup.superType;
      slot.sOwner = sup.superOwner === -1 ? -1 : sup.superOwner === this.index ? 0 : 1;
      slot.sTime = sup.superTime;
      slot.sDir = this.sign === 1 ? sup.superDir : sup.superDir === 1 ? -1 : 1;
      slot.phased = sup.phased;
      slot.phaseDone = sup.phaseDone;
      slot.rScale = sup.radiusScale;
    }
    slot.spin = this.sign * b.angVel;
    slot.cross = b.crossbarTimer;
    slot.ox = this.toRealX(opp.x);
    slot.oy = opp.y;
    slot.ovx = this.sign * opp.vx;
  }

  private historyAt(age: number): Percept | undefined {
    const len = this.history.length;
    return this.history[(this.histHead - age + len * 2) % len];
  }

  /** Gecikmeli algı: `delaySteps` adım önceki top ve rakip. Çarpışma (hız sıçraması) algılanır. */
  private perceive(): void {
    const age = Math.min(this.delaySteps, this.histCount - 1);
    const now = this.historyAt(age);
    if (!now) return;
    Object.assign(this.seen, now);
    this.seenTick = this.tick - age;
    const before = age + 1 < this.histCount ? this.historyAt(age + 1) : undefined;
    this.sawEvent = false;
    if (before) {
      const dvx = Math.abs(now.bvx - before.bvx);
      const dvy = Math.abs(now.bvy - before.bvy - BALL.gravity * STEP);
      this.sawEvent = dvx + dvy > AI.eventSpeedChange;
    }
  }

  // ───────────────────────────── Tahmin ─────────────────────────────

  private refreshPrediction(): void {
    const fresh = this.predBaseTick < 0 || this.sawEvent;
    if (fresh || this.tick >= this.nextPredictionTick) this.predict(fresh);
    this.traj.offset = this.tick - this.predBaseTick;
  }

  /**
   * Gecikmeli top durumundan ileri tahmin. Tahmin hatası hıza orantılı bir gürültüdür: yeni bir
   * yörüngede (çarpışma sonrası) yeniden çekilir, periyodik yenilemede küçülür — top yaklaştıkça
   * kestirim iyileşir. Hata, ufuk uzadıkça konumda büyür (uzun toplar daha zor okunur).
   */
  private predict(fresh: boolean): void {
    const err = this.profile.predictionError;
    if (fresh) {
      this.noiseX = this.rng.gaussian() * err;
      this.noiseY = this.rng.gaussian() * err;
    } else {
      this.noiseX *= AI.noiseDecayPerRefresh;
      this.noiseY *= AI.noiseDecayPerRefresh;
    }
    const s = this.seen;
    const speed = Math.hypot(s.bvx, s.bvy);
    const st = this.startState;
    st.x = s.bx;
    st.y = s.by;
    st.vx = s.bvx + this.noiseX * speed;
    st.vy = s.bvy + this.noiseY * speed;
    st.angVel = s.spin;
    st.crossbarTimer = s.cross;
    const sup = st.super;
    sup.superType = s.sType;
    sup.superOwner = s.sOwner;
    sup.superTime = s.sTime;
    sup.superDir = s.sDir;
    sup.phased = s.phased;
    sup.phaseDone = s.phaseDone;
    sup.radiusScale = s.rScale;
    const age = this.tick - this.seenTick;
    this.predictor.predict(st, this.horizonSteps + age + this.predictionSteps);
    this.predBaseTick = this.seenTick;
    this.nextPredictionTick = this.tick + this.predictionSteps;
    this.stats.predictions++;
  }

  /** Rakibin şimdiki konumunun kestirimi (gecikmeli konum + hızıyla öteleme). */
  private opponentX(): number {
    const age = this.tick - this.seenTick;
    return clamp(this.seen.ox + this.seen.ovx * age * STEP, this.minX, this.maxX);
  }

  // ───────────────────────────── Karar ─────────────────────────────

  private decide(me: SelfState): void {
    const pr = this.profile;
    this.nextDecisionTick =
      this.tick + this.decisionSteps + Math.floor(this.rng.next() * (AI.decisionJitterSteps + 1));
    this.delaySteps = clamp(
      msToSteps(pr.reactionMs + this.rng.gaussian() * pr.reactionJitterMs),
      1,
      this.maxDelay,
    );
    if (this.jumpCommitted()) return;
    // Dalgınlık: karar kısa bir süre ertelenir (art arda iki kez olmaz; top kaleye giderken
    // AI uzun süre eski planla kalmasın).
    if (!this.distracted && this.rng.chance(pr.distraction)) {
      this.distracted = true;
      this.nextDecisionTick = this.tick + secToSteps(AI.distractionSeconds);
      return;
    }
    this.distracted = false;
    this.aimOffset = this.rng.gaussian() * pr.aimErrorPx;

    const a = this.analyze(me);
    const u = AI.utility;
    const aggr = pr.aggression;
    const ballInOwnHalf = a.ballX < W / 2;
    const oppAdvantage = a.oppTime + secToSteps(u.advantageSeconds) < a.myTime;

    let defend = 0;
    if (a.threatStep >= 0) {
      defend = u.threat * (1 - (u.threatDecay * a.threatStep) / this.horizonSteps);
    }
    if (a.ballBehind) defend = Math.max(defend, u.behind);
    if (oppAdvantage && ballInOwnHalf) defend += u.opponentAdvantage;
    defend *= u.defendScaleBase - u.defendScaleAggression * aggr;

    let attack = 0;
    if (!a.ballBehind && (a.ground || a.aerialAttack)) {
      attack = u.attackBase + u.attackAggression * aggr;
      // Rakip topa açıkça önce ulaşacaksa topa koşmak (aşırtılıp kaleyi boş bırakmak) yerine
      // pozisyonda kal: ceza avantajın büyüklüğüyle artar.
      if (oppAdvantage) {
        const lead = (a.myTime - a.oppTime) / LOOP.stepHz;
        attack -= u.advantagePenalty * clamp(lead / u.advantageFullSeconds, 0, 1);
      }
      attack -= this.contestPenalty(a);
      attack += this.looseBallBonus(a);
      // Rakip kalenin önündeki top: kaçırılmayacak fırsat.
      const chance = 1 - clamp((OPP_LINE - a.ballX) / u.goalChanceZonePx, 0, 1);
      attack += u.goalChance * chance;
    }
    const position = u.position;

    const current = this.purposeOf(this.mode);
    const scores: Record<'attack' | 'defend' | 'position', number> = { attack, defend, position };
    let best: 'attack' | 'defend' | 'position' = 'position';
    for (const key of ['attack', 'defend'] as const) {
      if (scores[key] > scores[best]) best = key;
    }
    if (current && current !== best && scores[current] >= scores[best] - u.hysteresis) {
      best = current;
    }

    if (best !== 'attack') this.superRoll = 'none';
    this.resetPlan();
    if (best === 'attack') this.planAttack(a, me);
    else if (best === 'defend') this.planDefend(a, me);
    else this.planPosition(a);
  }

  /**
   * Düello cezası: rakip de topa aynı anda ulaşacaksa temkinli AI düelloya girmez (kaybederse
   * kalesi boş kalır). Her düello bölümünde rastgele bir sabır süresi sonunda ceza kalkar.
   */
  /**
   * Sahipsiz top: top yavaş ve (bölüm başında) rakip yanında değilse, rastgele bir bekleme
   * süresinden sonra hücum puanına bonus eklenir; bölüm top yavaş kaldıkça sürer (rakip
   * yaklaşınca iptal olmaz). İki temkinli AI topun başında sonsuza dek beklemez; süreler
   * farklı olduğundan genellikle biri önce davranır.
   */
  private looseBallBonus(a: Analysis): number {
    const u = AI.utility;
    const slow = Math.hypot(this.traj.vx(0), this.traj.vy(0)) < u.looseBallSpeed;
    // Rakip topun dibindeyse (top onun ayağında) sahipsiz değildir; uzaklaşırken bonus sürer.
    const oppOnBall = Math.abs(this.opponentX() - a.ballX) < u.looseBallOpponentPx;
    if (!slow || (oppOnBall && this.looseSince < 0)) {
      this.looseSince = -1;
      return 0;
    }
    if (this.looseSince < 0) {
      this.looseSince = this.tick;
      this.looseDelay = secToSteps(this.rng.range(u.looseBallDelayMin, u.looseBallDelayMax));
    }
    return this.tick - this.looseSince >= this.looseDelay ? u.looseBallBonus : 0;
  }

  private contestPenalty(a: Analysis): number {
    const u = AI.utility;
    const contested =
      Number.isFinite(a.myTime) &&
      Math.abs(a.myTime - a.oppTime) <= secToSteps(u.contestSeconds) &&
      a.ballX > W * u.contestMinBallXRatio;
    if (!contested) {
      this.contestSince = -1;
      return 0;
    }
    if (this.contestSince < 0) {
      this.contestSince = this.tick;
      this.contestPatience = secToSteps(this.rng.range(u.contestPatienceMin, u.contestPatienceMax));
    }
    if (this.tick - this.contestSince >= this.contestPatience) return 0;
    return u.contestPenalty * (1 - this.profile.aggression);
  }

  private purposeOf(mode: AiMode): 'attack' | 'defend' | 'position' | null {
    switch (mode) {
      case 'attack':
        return 'attack';
      case 'defend':
        return 'defend';
      case 'header':
        return this.plan.purpose;
      case 'position':
        return 'position';
      case 'idle':
      case 'escape':
        return null;
    }
  }

  /** Zıplama anı çok yakınsa ya da zıplama sürüyorsa plan değiştirilmez. */
  private jumpCommitted(): boolean {
    const p = this.plan;
    if (p.jumpAtTick < 0) return false;
    if (p.jumped) return this.tick < this.jumpHoldUntil;
    return p.jumpAtTick - this.tick <= AI.header.commitTicks;
  }

  private analyze(me: SelfState): Analysis {
    const t = this.traj;
    const ballX = t.x(0);
    const ballY = t.y(0);
    const entry = this.predictor.goalEntry(this.ownGoal, t.offset);
    const threatStep = entry >= 0 && entry - t.offset <= this.horizonSteps ? entry - t.offset : -1;
    const look = secToSteps(AI.defend.behindLookaheadSeconds);
    const margin = AI.defend.behindMarginPx;
    const ballBehind = ballX < me.x - margin && t.x(look) < me.x - margin;
    const ground = this.groundIntercept(me);
    const aerialAttack = this.aerialIntercept(me, AI.header.attackAngle);
    const aerialDefend = this.aerialIntercept(me, AI.header.defendAngle);
    const myTime = Math.min(
      ground?.step ?? Number.POSITIVE_INFINITY,
      aerialAttack?.step ?? Number.POSITIVE_INFINITY,
    );
    return {
      ballX,
      ballY,
      threatStep,
      ballBehind,
      ground,
      aerialAttack,
      aerialDefend,
      myTime,
      oppTime: this.opponentGroundTime(),
    };
  }

  /** Hedefe varış süresi kestirimi (adım). */
  private reachSteps(fromX: number, vx: number, toX: number, speed = this.maxSpeed): number {
    const dx = toX - fromX;
    const toward = dx === 0 ? 0 : (vx * Math.sign(dx)) / speed;
    const lag = AI.movement.accelLagSeconds * (1 - clamp(toward, 0, 1));
    return (Math.abs(dx) / speed + lag) * LOOP.stepHz;
  }

  /** En erken yer vuruşu: topun alçakta olduğu ve arkasına geçebildiğim ilk an. */
  private groundIntercept(me: SelfState): Intercept | null {
    const t = this.traj;
    const n = Math.min(this.horizonSteps, t.remaining);
    const behind = AI.kick.behindBallPx;
    const hop = secToSteps(AI.defend.hopPenaltySeconds);
    for (let k = 0; k <= n; k++) {
      const by = t.y(k);
      // Işınlanan topa dokunulamaz.
      if (by < AI.kick.groundBallMinY || this.predictor.phased(t.offset + k)) continue;
      const bx = t.x(k);
      const x = clamp(bx - behind, this.minX, this.maxX);
      let need = this.reachSteps(me.x, me.vx, x);
      // Top benimle kalem arasındaysa üstünden atlamak gerekir.
      if (me.x > bx && by > AI.defend.hopBallMinY) need += hop;
      if (need <= k) return { step: k, x, jumpStep: -1 };
    }
    // Ufkun sonunda yerde duran top ufuk ötesinde de oradadır (uzaktaki duran top yok sayılmasın).
    if (!this.restingAt(n)) return null;
    const bx = t.x(n);
    const x = clamp(bx - behind, this.minX, this.maxX);
    let need = this.reachSteps(me.x, me.vx, x);
    if (me.x > bx) need += hop;
    return { step: Math.max(n, Math.ceil(need)), x, jumpStep: -1 };
  }

  /** Tahmine göre top k. adımda yerde ve neredeyse duruyor mu? */
  private restingAt(k: number): boolean {
    const t = this.traj;
    return (
      t.y(k) >= AI.kick.groundBallMinY && Math.hypot(t.vx(k), t.vy(k)) < AI.utility.looseBallSpeed
    );
  }

  /** Rakibin topa (kendi vuruş tarafından) ulaşma süresi (adım). Donmuşsa donma süresi eklenir. */
  private opponentGroundTime(): number {
    const t = this.traj;
    const n = Math.min(this.horizonSteps, t.remaining);
    const ox = this.opponentX();
    const behind = AI.kick.behindBallPx;
    const frozen = this.oppFrozenSteps;
    const reach = (x: number): number =>
      frozen + this.reachSteps(ox, frozen > 0 ? 0 : this.seen.ovx, x, this.oppMaxSpeed);
    for (let k = 0; k <= n; k++) {
      if (t.y(k) < AI.kick.groundBallMinY) continue;
      const x = clamp(t.x(k) + behind, this.minX, this.maxX);
      if (reach(x) <= k) return k;
    }
    if (!this.restingAt(n)) return Number.POSITIVE_INFINITY;
    const x = clamp(t.x(n) + behind, this.minX, this.maxX);
    return Math.max(n, Math.ceil(reach(x)));
  }

  /**
   * Kafa planı: top, kafamın zıplayarak ulaşabileceği bir yükseklikten geçecekse, kafa merkezi
   * topun `angle` yönünde gerisinde olacak şekilde konum ve zıplama anı. Zıplama yüksekliği
   * gerçek zıplama profilinden (`JUMP_RISE`) okunur.
   */
  private aerialIntercept(me: SelfState, angle: number): Intercept | null {
    if (!me.grounded) return null;
    const t = this.traj;
    const h = AI.header;
    const n = Math.min(secToSteps(h.maxLeadSeconds), t.remaining);
    const headR = this.headR;
    const offX = this.headBall * Math.cos(angle);
    const offY = this.headBall * Math.sin(angle);
    const maxRise = Math.min(h.maxRise, this.jump.apexRise - h.minRise);
    const oppBarBottom = PITCH.groundY - this.predictor.field.goals[1].mouthHeight;
    for (let k = h.minLeadTicks; k <= n; k++) {
      if (this.predictor.phased(t.offset + k)) continue;
      const headY = t.y(k) + offY;
      const rise = STAND_Y - headY;
      if (rise < h.minRise || rise > maxRise) continue;
      const lead = jumpLead(rise, this.jump);
      // Sarsıntı: zıplama kilidi bitmeden zıplanamaz.
      if (lead < 0 || lead > k || k - lead < this.jumpLockSteps) continue;
      const x = t.x(k) - offX;
      if (x < this.minX || x > this.maxX) continue;
      // Kale ağzı sütununda kafa üst direğin altına sığmalı (yoksa oyuncu direğe çarpar).
      const underOwn = x - headR < OWN_LINE;
      const underOpp = x + headR > OPP_LINE;
      const barBottom = underOwn ? this.crossbarBottomOwn : oppBarBottom;
      if ((underOwn || underOpp) && headY - headR < barBottom + h.crossbarClearancePx) continue;
      if (this.reachSteps(me.x, me.vx, x) > k) continue;
      return { step: k, x, jumpStep: k - lead };
    }
    return null;
  }

  private resetPlan(): void {
    Object.assign(this.plan, blankPlan());
  }

  private planAttack(a: Analysis, me: SelfState): void {
    const p = this.plan;
    p.purpose = 'attack';
    p.kickAllowed = true;
    const air = a.aerialAttack;
    const ground = a.ground;
    if (air && (!ground || air.step < ground.step)) {
      this.planHeader(air, 'attack');
      return;
    }
    this.mode = 'attack';
    if (ground) {
      p.targetX = ground.x + this.aimOffset * AI.kick.aimErrorScale;
      p.hitTick = this.tick + ground.step;
    } else {
      // Top şimdilik ulaşılamaz (yüksekte/uzakta): düşeceği yerin gerisine git.
      p.targetX = this.landingX() - AI.kick.behindBallPx + this.aimOffset;
    }
    p.hop = me.x > a.ballX;
  }

  private planHeader(air: Intercept, purpose: Purpose): void {
    const p = this.plan;
    this.mode = 'header';
    p.purpose = purpose;
    p.kickAllowed = true;
    p.targetX = air.x + this.aimOffset * AI.header.aimErrorScale;
    p.jumpAtTick = this.tick + air.jumpStep;
    p.jumpHoldTicks = air.step - air.jumpStep + AI.header.holdExtraTicks;
    p.hitTick = this.tick + air.step;
  }

  private planDefend(a: Analysis, me: SelfState): void {
    const p = this.plan;
    const d = AI.defend;
    this.mode = 'defend';
    p.purpose = 'defend';
    p.kickAllowed = true;
    const guardX = OWN_LINE + d.guardOffsetPx;

    if (a.ballBehind) {
      // Top kendi üst direğimin üstündeyse kalenin içine girmek anlamsız (top oradan sahaya
      // düşer ya da itilir): kale önünde bekle.
      if (a.ballX < OWN_LINE + PITCH.goal.restZoneOverhang && a.ballY < this.crossbarBottomOwn) {
        p.targetX = guardX;
        return;
      }
      // Top benimle kalem arasında: topun gerisine geç (alçaksa üstünden zıpla).
      if (a.threatStep >= 0 && a.aerialDefend && a.aerialDefend.x < me.x) {
        this.planHeader(a.aerialDefend, 'defend');
        return;
      }
      // Hedef kale ağzının içinde olabilir: alçak sıçrayışla topun gerisine in, sonra vur.
      p.targetX = a.ballX - d.hopLandingPx;
      p.hop = true;
      return;
    }
    if (a.threatStep >= 0) {
      const air = a.aerialDefend;
      const ground = a.ground;
      if (air && (!ground || air.step <= ground.step)) {
        this.planHeader(air, 'defend');
        return;
      }
      if (ground) {
        p.targetX = ground.x;
        p.hitTick = this.tick + ground.step;
        return;
      }
      p.targetX = guardX;
      return;
    }
    // Rakip avantajlı: kale ile top arasında bekle (rakip süper hazırsa daha derinde).
    const deeper = this.oppArmed ? AI.superDefense.deeperFactor : 1;
    const x = guardX + (a.ballX - OWN_LINE) * d.guardBallFactor * deeper + this.aimOffset;
    p.targetX = Math.min(x, a.ballX - AI.position.minBehindBallPx);
    p.targetX = Math.max(p.targetX, guardX);
  }

  private planPosition(a: Analysis): void {
    const p = this.plan;
    const pos = AI.position;
    this.mode = 'position';
    p.purpose = 'attack';
    p.kickAllowed = true;
    const factor = lerp(pos.ballFactorMin, pos.ballFactorMax, this.profile.aggression);
    // Rakip süper hazırken (Işınlanma, Gökkuşağı…) kaleye daha yakın bekle.
    const deeper = this.oppArmed ? AI.superDefense.deeperFactor : 1;
    let x = OWN_LINE + (pos.basePx + (a.ballX - OWN_LINE) * factor) * deeper + this.aimOffset;
    x = Math.min(x, a.ballX - pos.minBehindBallPx);
    p.targetX = Math.max(x, OWN_LINE + AI.defend.guardOffsetPx);
  }

  /** Topun (tahmine göre) yere ineceği ya da ufkun sonunda bulunacağı x. */
  private landingX(): number {
    const t = this.traj;
    const n = Math.min(this.horizonSteps, t.remaining);
    for (let k = 0; k <= n; k++) {
      if (t.y(k) >= AI.kick.groundBallMinY) return t.x(k);
    }
    return t.x(n);
  }

  // ───────────────────────────── Refleks ─────────────────────────────

  private act(me: SelfState, raw: PlayerView): InputState {
    if (this.tick < this.escapeUntil) {
      this.mode = 'escape';
      const jump = this.tick < this.escapeJumpUntil && (this.lastJump || me.grounded);
      return this.output(this.escapeDir, jump, false, false);
    }
    const p = this.plan;
    const dx = clamp(p.targetX, this.minX, this.maxX) - me.x;
    const dir = Math.abs(dx) > AI.movement.deadzonePx ? Math.sign(dx) : 0;

    let jump = false;
    if (p.jumpAtTick >= 0 && !p.jumped && this.tick >= p.jumpAtTick) {
      // Planlanan noktaya varamadıysa zıplama iptal: geç kalmış bir kafa topu önden (kale
      // tarafından) sektirir.
      const onSpot = Math.abs(me.x - p.targetX) <= AI.header.jumpPositionTolerancePx;
      if (me.grounded && !this.lastJump && onSpot) {
        jump = true;
        p.jumped = true;
        this.jumpHoldUntil = this.tick + p.jumpHoldTicks;
      } else if (!onSpot || this.tick > p.jumpAtTick + AI.header.lateToleranceTicks) {
        p.jumpAtTick = -1;
      }
    }
    let move = dir;
    if (p.hop && me.grounded && !this.lastJump) {
      const hold = this.hopHold(me);
      if (hold > 0) {
        jump = true;
        this.jumpHoldUntil = this.tick + hold;
      } else if (hold === HOP_WAIT) {
        move = 0; // Top aşılamayacak kadar yüksek sekiyor: içine koşma, bekle.
      }
    }
    if (this.tick < this.jumpHoldUntil && (jump || this.lastJump)) jump = true;
    if (!jump && me.grounded && move < 0 && this.ownGoalContactAhead(me)) move = 1;
    if (!jump && this.wantsDoubleJump(me)) jump = true;

    const probe = p.kickAllowed && raw.kickPhase === 'idle' ? this.kickProbe(me, move) : null;
    const kick = probe !== null && this.shouldKick(me, probe, raw);
    // Tehlikeli süper top (Buz, Ateş, Kasırga) kaleme gitmiyorsa ve şutla karşılanamıyorsa:
    // değmemek için üstünden zıpla ya da çekil.
    if (!kick) {
      const dodge = this.dodgeSuper(me);
      if (dodge) {
        move = dodge.move;
        if (dodge.jump) jump = true;
      }
    }
    const sup = this.shouldSuper(raw, kick, probe);
    return this.output(move, jump, kick, sup);
  }

  /**
   * Rakibin tehlikeli süper topu bana değecek mi? Değecekse ve top kaleme gitmiyorsa kaçış
   * hareketi (alçak topun üstünden zıpla, değilse toptan uzaklaş). Top başına bir kez
   * `superDodge` olasılığıyla karar verilir.
   */
  private dodgeSuper(me: SelfState): { move: number; jump: boolean } | null {
    const s = this.seen;
    if (s.sOwner !== 1 || s.sType === null || !HIT_SUPERS.includes(s.sType)) {
      this.dodgeRoll = 'none';
      return null;
    }
    if (this.tick < this.dodgeJumpUntil) return { move: this.lastDir, jump: this.lastJump };
    if (this.predictor.goalEntry(this.ownGoal, this.traj.offset) >= 0) return null;
    const sd = AI.superDefense;
    const t = this.traj;
    let hitK = -1;
    for (let k = 1; k <= sd.dodgeLookTicks; k++) {
      const bx = t.x(k);
      const by = t.y(k);
      const head = Math.hypot(bx - me.x, by - me.y) < this.headBall + sd.dodgeMarginPx;
      const body =
        Math.hypot(bx - me.x, by - (me.y + PLAYER.body.offsetY)) < this.bodyBall + sd.dodgeMarginPx;
      if (head || body) {
        hitK = k;
        break;
      }
    }
    if (hitK < 0) return null;
    if (this.dodgeRoll === 'none') {
      this.dodgeRoll = this.rng.chance(this.profile.superDodge) ? 'yes' : 'no';
    }
    if (this.dodgeRoll === 'no') return null;
    const away = t.x(hitK) > me.x ? -1 : 1;
    const low = t.y(hitK) > me.y;
    if (low && me.grounded && this.jumpLockSteps === 0) {
      this.dodgeJumpUntil = this.tick + secToSteps(sd.dodgeJumpSeconds);
      return { move: away, jump: true };
    }
    return { move: away, jump: false };
  }

  /** Çift zıplama: kafa planında, tepeye yakınken top hâlâ başımın üstündeyse ikinci zıplama. */
  private wantsDoubleJump(me: SelfState): boolean {
    const pu = AI.powerUp;
    if (!this.canDoubleJump || me.grounded || this.lastJump || me.vy < pu.doubleJumpMinVy) {
      return false;
    }
    if (this.mode !== 'header' || !this.plan.jumped) return false;
    const t = this.traj;
    for (let k = 1; k <= pu.doubleJumpLookTicks; k++) {
      const above = t.y(k) < me.y - this.headR;
      if (above && Math.abs(t.x(k) - me.x) < pu.doubleJumpReachPx) return true;
    }
    return false;
  }

  /**
   * Arkada kalan alçak topun üstünden sıçrayış: topun önümüzdeki adımlardaki en yüksek
   * noktası aşılacak kadar (değişken zıplama ile) yükseklik seçilir. Kale ağzında üst direk
   * sınırı vardır. @returns Basılı tutma adımı; 0 = şimdi değil; HOP_WAIT = aşılamaz, bekle.
   */
  private hopHold(me: SelfState): number {
    const d = AI.defend;
    const t = this.traj;
    const gap = me.x - t.x(0);
    if (gap <= 0 || gap > d.hopTriggerPx || t.y(0) < d.hopBallMinY) return 0;
    let minY = t.y(0);
    for (let k = 1; k <= d.hopLookTicks; k++) minY = Math.min(minY, t.y(k));
    if (this.jumpLockSteps > 0) return HOP_WAIT;
    const need = PITCH.groundY - (minY - this.ballR) + d.hopMarginPx;
    const nearGoal = t.x(0) - d.hopLandingPx < OWN_LINE + this.headR;
    const maxRise = nearGoal ? this.barMaxRise : this.jump.apexRise;
    const hold = hopHoldTicks(need, maxRise, this.jump);
    return hold > 0 ? hold : HOP_WAIT;
  }

  /**
   * Kendi kaleme doğru koşarken kale tarafındaki topa çarpacak mıyım? (Önden değen top
   * kaleye gider.) Yakın gelecekte top, şu anki hızımla ilerleyen kafama/gövdeme değiyorsa
   * true; AI fren yapar.
   */
  private ownGoalContactAhead(me: SelfState): boolean {
    const s = AI.safety;
    const t = this.traj;
    for (let k = 1; k <= s.lookTicks; k++) {
      const px = me.x + me.vx * k * STEP;
      const bx = t.x(k);
      if (bx > px - s.goalSideMarginPx) continue;
      const by = t.y(k);
      const head = Math.hypot(bx - px, by - me.y) < this.headBall + s.contactMarginPx;
      const body =
        Math.hypot(bx - px, by - (me.y + PLAYER.body.offsetY)) < this.bodyBall + s.contactMarginPx;
      if (head || body) return true;
    }
    return false;
  }

  private kickProbe(me: SelfState, dir: number): KickProbe | null {
    if (this.lastKick) return null;
    if (this.predictor.phased(this.traj.offset)) return null;
    return this.kickSim.probe(me, dir, this.traj, KICK_PROBE_TICKS, this.ballR);
  }

  /**
   * Şut zamanlaması: hayalet ayak topa yakında ve yeterli savrulma hızıyla değecekse basılır.
   * Acil değilse seçici AI, şutu fizik kopyasında dener ve gole gidecek (ya da rakibe
   * çarpmayacak) bir şut bekler; sabrı tükenince yine vurur.
   */
  private shouldKick(me: SelfState, probe: KickProbe, raw: PlayerView): boolean {
    const k = AI.kick;
    const pr = this.profile;
    if (this.tick - this.lastChanceTick > k.newOpportunityGapTicks) {
      this.opportunityStart = this.tick;
      if (this.rng.chance(pr.kickHesitation)) {
        this.hesitateUntil = this.tick + secToSteps(k.hesitationSeconds);
      }
      // İnsani zamanlama hatası: negatif = erken basış (temas savrulmanın sonunda, zayıf
      // şut ya da ıska), pozitif = geç basış.
      this.kickTimingOffset = Math.round(this.rng.gaussian() * pr.kickTimingError);
      if (this.kickTimingOffset > 0) {
        this.hesitateUntil = Math.max(this.hesitateUntil, this.tick + this.kickTimingOffset);
      }
    }
    this.lastChanceTick = this.tick;
    if (this.tick < this.hesitateUntil) return false;
    const early = Math.max(0, -this.kickTimingOffset);
    if (probe.contactTick > k.maxContactTicks + early) return false;
    if (early > 0 && probe.contactTick >= early) return true;

    const urgent = this.isUrgent(me);
    if (!urgent && probe.swingFactor < k.minSwingFactor) return false;
    if (pr.shotSelectivity <= 0) return true;
    // Seçici AI şutu her zaman (acilken bile) dener: sekip kendi kalesine dönecekse vurmaz.
    const score = this.evaluateShot(probe, raw.superArmed ? this.mySuper : null);
    if (score < 0) return false;
    if (urgent || score >= pr.shotSelectivity * k.selectivityScale) return true;
    return this.tick - this.opportunityStart >= secToSteps(k.shotPatienceSeconds);
  }

  private isUrgent(me: SelfState): boolean {
    const k = AI.kick;
    const bx = this.traj.x(0);
    const by = this.traj.y(0);
    if (this.mode === 'defend' || this.plan.purpose === 'defend') return true;
    if (bx < OWN_LINE + k.dangerZonePx) return true;
    const ox = this.opponentX();
    const oy = this.seen.oy;
    if (Math.hypot(bx - ox, by - oy) < k.pressureDistancePx) return true;
    // Top bana doğru hızla geliyorsa (vole) beklemek yok.
    return this.traj.vx(0) < -k.incomingSpeed && bx > me.x;
  }

  /**
   * Şut değerlendirmesi: gerçek şut formülüyle (computeKick, karakterin şut gücüyle) topun yeni
   * hızı hesaplanır; süperse etkisi yüklenir ve top hayalet dünyada (süper etkileriyle) ileri
   * simüle edilir. 1 = gol yolunda; duvardan sekip kendi kaleme dönecekse negatif; rakibe
   * çarpacaksa düşük (rakibe çarpınca etkisi olan süperlerde orta); değilse kat edilen mesafeyle
   * orantılı. Balonu patlatacak şuta (farkındalığa göre) bonus.
   */
  private evaluateShot(probe: KickProbe, superType: SuperType | null): number {
    const k = AI.kick;
    const kick = computeKick({
      facing: 1,
      playerVx: probe.playerVx,
      playerVy: probe.playerVy,
      swingFactor: probe.swingFactor,
      nx: probe.nx,
      ny: probe.ny,
      ballVx: probe.ballVx,
      ballVy: probe.ballVy,
      power: this.myParams?.kickPower ?? 1,
      superType,
    });
    const b = this.scratch;
    b.resetTo(probe.ballX, probe.ballY);
    b.vx = kick.vx;
    b.vy = kick.vy;
    b.angVel = this.seen.spin + kick.spin;
    b.radiusScale = this.ballR / BALL.radius;
    if (superType) launchSuper(b, superType, 0, 1);
    const st = this.startState;
    st.x = b.x;
    st.y = b.y;
    st.vx = b.vx;
    st.vy = b.vy;
    st.angVel = b.angVel;
    st.crossbarTimer = 0;
    st.super.superType = b.superType;
    st.super.superOwner = b.superOwner;
    st.super.superTime = b.superTime;
    st.super.superDir = b.superDir;
    st.super.phased = b.phased;
    st.super.phaseDone = b.phaseDone;
    st.super.radiusScale = b.radiusScale;
    const sp = this.shotPredictor;
    sp.predict(st, this.shotSteps);
    const entry = sp.goalEntry(this.oppGoal);
    const own = sp.goalEntry(this.ownGoal);
    if (own >= 0 && (entry < 0 || own < entry)) return k.ownGoalScore;

    const ox = this.opponentX();
    const oy = this.seen.oy;
    const end = Math.min(entry >= 0 ? entry : sp.length - 1, secToSteps(k.blockCheckSeconds));
    const oppHeadBall = this.oppHeadR + this.ballR;
    for (let i = 0; i <= end; i++) {
      if (sp.phased(i)) continue;
      const bx = sp.x(i);
      const by = sp.y(i);
      const head = Math.hypot(bx - ox, by - oy) < oppHeadBall + k.blockMarginPx;
      const body =
        Math.hypot(bx - ox, by - (oy + PLAYER.body.offsetY)) < this.bodyBall + k.blockMarginPx;
      if (head || body) return this.blockedScore(superType);
    }
    if (entry >= 0) return 1;
    const progress = (sp.x(sp.length - 1) - probe.ballX) / W;
    const base = k.progressBase + k.progressScale * clamp(progress, 0, 1);
    return base + this.balloonBonus(sp, sp.length - 1);
  }

  /** Rakibe çarpacak şutun puanı: süperin rakibe etkisi varsa (Buz, Ateş, Kasırga) daha yüksek. */
  private blockedScore(superType: SuperType | null): number {
    const scores: Partial<Record<SuperType, number>> = AI.super.hitOpponentScore;
    return (superType && scores[superType]) ?? AI.kick.blockedScore;
  }

  /** Denenen şut `end` adıma kadar balonu patlatıyorsa bonus (farkındalıkla ölçekli). */
  private balloonBonus(sp: BallPredictor, end: number): number {
    const b = this.balloon;
    const awareness = this.profile.powerUpAwareness;
    if (!b || awareness <= 0) return 0;
    for (let i = 0; i <= end; i++) {
      if (sp.phased(i)) continue;
      if (ballHitsBalloon(b, sp.x(i), sp.y(i), sp.radius(i), b.age + i * STEP)) {
        return AI.powerUp.balloonShotBonus * awareness;
      }
    }
    return 0;
  }

  /**
   * Süper: bar doluyken, hücumda, vuruş yakınken ve karakterin süper tipine uygun durumda (topun
   * kaleye uzaklığı, rakibin konumu; bkz. `AI.super.byType`). Şimdi vuracaksa seçici AI süperli
   * şutu normal şutla karşılaştırır. Her hücum fırsatında bir kez `superUseRate` olasılığıyla
   * karar verilir.
   */
  private shouldSuper(raw: PlayerView, kicking: boolean, probe: KickProbe | null): boolean {
    if (raw.power < 1 || raw.superArmed || this.lastSuper) return false;
    if (this.plan.purpose !== 'attack' || (this.mode !== 'attack' && this.mode !== 'header')) {
      return false;
    }
    const s = AI.super;
    const rule: SuperUseRule = s.byType[this.mySuper];
    const bx = this.traj.x(0);
    const dist = OPP_LINE - bx;
    if (dist < rule.minDistancePx || dist > rule.maxDistancePx) return false;
    const ox = this.opponentX();
    if (rule.opponentAhead && ox < bx) return false;
    if (rule.opponentOffLinePx !== undefined && ox > OPP_LINE - rule.opponentOffLinePx)
      return false;
    if (rule.opponentNearPx !== undefined && Math.abs(ox - bx) > rule.opponentNearPx) return false;
    const hitSoon =
      kicking ||
      (this.plan.hitTick >= 0 && this.plan.hitTick - this.tick <= secToSteps(s.maxLeadSeconds));
    if (!hitSoon) return false;
    if (kicking && probe && this.profile.shotSelectivity > 0) {
      const withSuper = this.evaluateShot(probe, this.mySuper);
      const normal = this.evaluateShot(probe, null);
      if (withSuper < normal - s.worseThanNormalMargin) return false;
    }
    if (this.superRoll === 'none') {
      this.superRoll = this.rng.chance(this.profile.superUseRate) ? 'yes' : 'no';
    }
    return this.superRoll === 'yes';
  }

  // ───────────────────────────── Sıkışma önleme ─────────────────────────────

  private updateStuck(me: SelfState): void {
    const st = AI.stuck;
    const bx = this.traj.x(0);
    const by = this.traj.y(0);

    const pushing = this.lastDir !== 0 && me.grounded && Math.abs(me.vx) < st.pushMinSpeed;
    this.pushTimer = pushing ? this.pushTimer + STEP : 0;

    // Direğin ya da rakibin kafasının üstünde "yerde" duruyor.
    const elevated = me.grounded && me.y < STAND_Y - st.elevatedMarginPx;
    this.elevatedTimer = elevated ? this.elevatedTimer + STEP : 0;

    const onHead =
      Math.abs(bx - me.x) < st.ballOnHeadDx &&
      by < me.y &&
      me.y - by < this.headBall + st.ballOnHeadGapPx &&
      Math.abs(this.traj.vy(0)) < st.ballOnHeadMaxVy;
    this.headTimer = onHead ? this.headTimer + STEP : 0;

    const ballSlow = Math.hypot(this.traj.vx(0), this.traj.vy(0)) < st.idleBallMaxSpeed;
    const near = Math.hypot(bx - me.x, by - me.y) < st.idleRadiusPx;
    if (!near || !ballSlow || Math.abs(me.x - this.idleAnchorX) > st.idleTravelPx) {
      this.idleAnchorX = me.x;
      this.idleTimer = 0;
    } else {
      this.idleTimer += STEP;
    }

    if (this.tick < this.escapeCooldownUntil || this.tick < this.escapeUntil) return;
    if (this.elevatedTimer > st.elevatedSeconds) this.startEscape('elevated', me);
    else if (this.pushTimer > st.pushSeconds * this.pushPatience) this.startEscape('push', me);
    else if (this.headTimer > st.ballOnHeadSeconds) this.startEscape('ballOnHead', me);
    else if (this.idleTimer > st.idleSeconds) this.startEscape('idle', me);
  }

  private startEscape(kind: EscapeKind, me: SelfState): void {
    const st = AI.stuck;
    const towardCenter = me.x < W / 2 ? 1 : -1;
    let dir: number;
    let jump = true;
    switch (kind) {
      case 'elevated':
        dir = towardCenter;
        break;
      case 'push': {
        // Kaleme dönmem gerekiyorsa (savunma) rakibin üstünden atla; değilse çoğunlukla çekil.
        const nearWall = me.x < this.minX + st.wallMarginPx || me.x > this.maxX - st.wallMarginPx;
        const goingBack = this.lastDir < 0 && this.plan.purpose === 'defend';
        if (nearWall) dir = towardCenter;
        else if (goingBack) dir = this.lastDir;
        else dir = this.rng.chance(st.backOffChance) ? -this.lastDir : this.lastDir;
        break;
      }
      case 'ballOnHead':
        dir = 1;
        break;
      case 'idle':
        dir = this.rng.chance(st.forwardChance) ? 1 : -1;
        jump = this.rng.chance(st.idleJumpChance);
        break;
    }
    this.escapeDir = dir;
    this.escapeUntil = this.tick + secToSteps(st.escapeSeconds);
    this.escapeJumpUntil = jump ? this.tick + secToSteps(st.escapeJumpSeconds) : -1;
    this.escapeCooldownUntil = this.escapeUntil + secToSteps(st.cooldownSeconds);
    // İki AI aynı anda kilitlenince aynı adımda kaçmasınlar (havada yine çarpışırlar).
    this.pushPatience = this.rng.range(st.pushPatienceMin, st.pushPatienceMax);
    this.nextDecisionTick = this.escapeUntil;
    this.pushTimer = 0;
    this.elevatedTimer = 0;
    this.headTimer = 0;
    this.idleTimer = 0;
    this.resetPlan();
    this.stats.escapes[kind]++;
  }

  // ───────────────────────────── Çıktı ─────────────────────────────

  private goIdle(): void {
    this.mode = 'idle';
    this.resetPlan();
    this.predBaseTick = -1;
    this.nextDecisionTick = 0;
    this.escapeUntil = -1;
    this.escapeCooldownUntil = 0;
    this.pushTimer = 0;
    this.elevatedTimer = 0;
    this.headTimer = 0;
    this.idleTimer = 0;
    this.jumpHoldUntil = -1;
    this.superRoll = 'none';
    this.contestSince = -1;
    this.distracted = false;
    this.looseSince = -1;
    this.dodgeRoll = 'none';
    this.dodgeJumpUntil = -1;
  }

  /** Kanonik kararları gerçek tuşlara çevirir (P2 için sol/sağ aynalanır). */
  private output(dir: number, jump: boolean, kick: boolean, sup: boolean): InputState {
    if (jump && !this.lastJump) this.stats.jumpsPressed++;
    if (kick && !this.lastKick) this.stats.kicksPressed++;
    if (sup && !this.lastSuper) this.stats.supersArmed++;
    this.lastDir = dir;
    this.lastJump = jump;
    this.lastKick = kick;
    this.lastSuper = sup;
    const real = dir * this.sign;
    if (real === 0 && !jump && !kick && !sup) return EMPTY_INPUT;
    return { left: real < 0, right: real > 0, jump, kick, super: sup };
  }
}

function blankSuper(): BallSuperState {
  return {
    superType: null,
    superOwner: -1,
    superTime: 0,
    superDir: 1,
    phased: false,
    phaseDone: false,
    radiusScale: 1,
  };
}

function blankStart(): StartState {
  return { x: 0, y: 0, vx: 0, vy: 0, angVel: 0, crossbarTimer: 0, super: blankSuper() };
}

function blankPercept(): Percept {
  return {
    bx: 0,
    by: 0,
    bvx: 0,
    bvy: 0,
    spin: 0,
    cross: 0,
    sType: null,
    sOwner: -1,
    sTime: 0,
    sDir: 1,
    phased: false,
    phaseDone: false,
    rScale: 1,
    ox: 0,
    oy: 0,
    ovx: 0,
  };
}

function blankPlan(): Plan {
  return {
    targetX: SPAWN_X,
    jumpAtTick: -1,
    jumpHoldTicks: 0,
    jumped: false,
    hop: false,
    kickAllowed: false,
    hitTick: -1,
    purpose: 'attack',
  };
}

/**
 * AI'ı oyunun girdi arayüzüne bağlar: her `read` çağrısında simülasyonun o anki görünümünü
 * alır (`view`) ve AI'ın ürettiği `InputState`'i döndürür.
 */
export class AiInputSource implements InputSource {
  constructor(
    readonly ai: AiController,
    private readonly view: () => WorldView,
  ) {}

  read(): InputState {
    return this.ai.update(this.view());
  }
}
