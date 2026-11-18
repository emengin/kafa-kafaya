import {
  BALL,
  HEADER,
  KICK,
  LOOP,
  PHYSICS,
  PITCH,
  PLAYER,
  POWER,
  POWERUPS,
  SIM_EVENTS,
  SUPER,
  SUPER_SHOTS,
  type PowerUpType,
  type SuperType,
} from '../config/gameConfig';
import { EMPTY_INPUT, type InputState } from '../input/InputState';
import { circleVsCircle, computeSubSteps, moveToward, resolveContact } from '../physics';
import { SeededRandom } from './ai/random';
import {
  applyCrossbarRest,
  collideBallWithPitch,
  collideStatic,
  stepBallAlone,
} from './ballPhysics';
import { NEUTRAL_LOADOUT, type Loadout } from './characters';
import { Ball, type BallSuperState } from './entities/Ball';
import {
  Player,
  PLAYER_STAND_OFFSET,
  type KickPhase,
  type PlayerPart,
  type PowerUpTimers,
} from './entities/Player';
import { computeKick } from './kick';
import { createPitch, setGoalMouthHeight, type Pitch } from './pitch';
import {
  ballHitsBalloon,
  balloonPosition,
  powerUpDuration,
  spawnBalloon,
  type Balloon,
} from './powerups';
import { isBallInGoal } from './rules/ballRules';
import { attackLineX, launchSuper } from './superEffects';
import {
  DEFAULT_MATCH_RULES,
  MatchFlow,
  type MatchRules,
  type MatchSnapshot,
} from './rules/MatchFlow';
import { copyFields, type SimState } from './simState';
import type { PlayerIndex, SimEvent } from './types';

/** Simülasyonun sabit adım süresi. Gerçek zamandan bağımsızdır (determinizm). */
export const STEP_SECONDS = 1 / LOOP.stepHz;

const STATIC_PARTS: readonly PlayerPart[] = ['head', 'body'];
/** Top–oyuncu çözüm sırası için Knuth çarpımsal karıştırma sabiti ve en üst bit. */
const ORDER_HASH = 0x9e3779b1;
const ORDER_SHIFT = 31;
const BALL_PARTS: readonly PlayerPart[] = ['head', 'body', 'foot'];
const GROUND_MIN = PHYSICS.groundNormalMinY;
/** Varsayılan güçlendirici tohumu (`GameSimOptions.seed` verilmezse): maçlar yine deterministik. */
const DEFAULT_SEED = 1;
/** Serap: üç yön [−yayılma, 0, +yayılma]; gerçek top birini, yanılsamalar diğer ikisini alır. */
const MIRAGE_SLOTS = 3;

export interface PlayerSnapshot {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly grounded: boolean;
  readonly coyoteTimer: number;
  readonly jumpBufferTimer: number;
  readonly jumping: boolean;
  readonly prevJump: boolean;
  readonly prevKick: boolean;
  readonly kickPhase: KickPhase;
  readonly kickTimer: number;
  readonly kickBufferTimer: number;
  readonly kickHitDone: boolean;
  readonly footAngle: number;
  readonly footAngVel: number;
  readonly power: number;
  readonly superArmed: boolean;
  readonly prevSuper: boolean;
  readonly touchCooldown: number;
  readonly headScale: number;
  readonly speedScale: number;
  readonly doubleJumpEnabled: boolean;
  readonly airJumpUsed: boolean;
  readonly frozenTimer: number;
  readonly freezeImmunity: number;
  readonly jumpLockTimer: number;
  readonly powerUps: Readonly<PowerUpTimers>;
}

/** Serap yanılsaması: gerçek top gibi uçar ama kimseye değmez, gol olmaz, kısa sürede söner. */
export interface Decoy {
  readonly ball: Ball;
  /** Kalan ömür (sn). */
  ttl: number;
}

/** Simülasyonun tam durumu (düz veri). Determinizm testi ve gol tekrarı için. */
export interface SimSnapshot {
  readonly tick: number;
  readonly match: MatchSnapshot;
  readonly ball: {
    readonly x: number;
    readonly y: number;
    readonly vx: number;
    readonly vy: number;
    readonly angle: number;
    readonly angVel: number;
    readonly crossbarTimer: number;
    readonly lastTouch: number;
    readonly super: Readonly<BallSuperState>;
  };
  readonly players: readonly [PlayerSnapshot, PlayerSnapshot];
  readonly decoys: readonly { x: number; y: number; vx: number; vy: number; ttl: number }[];
  readonly balloon: Readonly<Balloon> | null;
  readonly balloonTimer: number;
  readonly goalMouths: readonly [number, number];
  readonly rngState: number;
}

export interface GameSimOptions {
  /** Varsayılan maç kurallarının üzerine yazılacak değerler (testler, farklı modlar). */
  readonly rules?: Partial<MatchRules>;
  /** true → santra beklemesi atlanır, oyun ilk adımdan başlar (testler, antrenman). */
  readonly skipKickoff?: boolean;
  /** [P1, P2] karakter donanımı; verilmezse nötr oyuncular (tüm puanlar 3, Ateş Topu). */
  readonly loadouts?: readonly [Loadout, Loadout];
  /** Güçlendirici balonları ve Serap için tohum (aynı tohum + aynı girdiler → aynı maç). */
  readonly seed?: number;
  /** false → güçlendirici balonları çıkmaz (testler, fizik ölçümleri). Varsayılan true. */
  readonly powerUps?: boolean;
  /** true → rakipsiz antrenman: P2 sahada yok sayılır (bkz. `GameSim.setSolo`). */
  readonly solo?: boolean;
}

/**
 * Deterministik maç simülasyonu: saha + top + iki oyuncu. Phaser'a bağımlı değildir.
 * Aynı başlangıç durumu ve aynı `InputState` dizisi → birebir aynı sonuç.
 *
 * Bir sabit adımın sırası:
 * 1. Oyuncu girdileri (hareket eğrisi, zıplama, şut tetikleme).
 * 2. Uyarlamalı sayıda alt adım; her birinde: entegrasyon → oyuncu–saha → oyuncu–oyuncu →
 *    top–oyuncu (şut, kafa) → top–saha → (top sıkıştıysa) oyuncuyu toptan it.
 * 3. Süper etkileri (Kasırga itmesi, yanılsamalar), güçlendiriciler (balon, süreler, büyüyen
 *    kale) ve kurallar: güç barı dolumu, üst direkte bekleme, gol algılama → maç durum makinesi
 *    (`MatchFlow`).
 *
 * Santra beklemesinde ve maç bitince girdiler yok sayılır; santrada top ortada tutulur.
 */
export class GameSim {
  readonly pitch: Pitch = createPitch();
  readonly ball = new Ball();
  readonly players: readonly [Player, Player];
  /** Maç durum makinesi: skor, süre, santra, gol kutlaması, altın gol, maç sonu. */
  readonly match: MatchFlow;
  /** Serap yanılsamaları (etkin değilse boş). */
  readonly decoys: Decoy[] = [];
  /** Sahadaki güçlendirici balonu (yoksa null). */
  balloon: Balloon | null = null;
  /** Bir sonraki balona kalan süre (sn, oyun akarken azalır). */
  balloonTimer: number;
  tick = 0;
  /** Son adımda kullanılan alt adım sayısı (debug). */
  lastSubSteps = 0;
  private readonly events: SimEvent[] = [];
  /** Bu adımda topun oyunculara pasif temasının en yüksek hızı (`ballTouch` olayı için). */
  private readonly touchSpeeds: [number, number] = [0, 0];
  /** Adım başına geçici değerler (yeniden kullanılır). */
  private readonly wasGrounded: [boolean, boolean] = [false, false];
  private readonly fallSpeeds: [number, number] = [0, 0];
  private readonly rng: SeededRandom;
  private readonly powerUpsEnabled: boolean;
  private soloMode = false;

  constructor(options: GameSimOptions = {}) {
    const [l1, l2] = options.loadouts ?? [NEUTRAL_LOADOUT, NEUTRAL_LOADOUT];
    this.players = [new Player(0, 1, l1), new Player(1, -1, l2)];
    this.match = new MatchFlow({ ...DEFAULT_MATCH_RULES, ...options.rules });
    this.rng = new SeededRandom(options.seed ?? DEFAULT_SEED);
    this.powerUpsEnabled = options.powerUps ?? true;
    this.balloonTimer = this.nextBalloonDelay();
    this.resetPositions();
    if (options.skipKickoff) this.match.startInPlay();
    if (options.solo) this.setSolo(true);
  }

  /** Rakipsiz antrenman mı? (P2 topa ve P1'e değmez, girdisi yok sayılır, çizilmez.) */
  get solo(): boolean {
    return this.soloMode;
  }

  /**
   * Antrenman: rakibi sahadan kaldırır ya da pasif bir "kukla" olarak geri getirir. P2 her
   * iki durumda da başlangıç konumuna alınır. Maç modlarında kullanılmaz (varsayılan kapalı).
   */
  setSolo(solo: boolean): void {
    this.soloMode = solo;
    const p2 = this.players[1];
    const { width, groundY } = this.pitch;
    p2.resetTo(width - width * PLAYER.spawnXRatio, groundY - PLAYER_STAND_OFFSET);
    p2.clearStatus();
  }

  /**
   * Antrenman kısayolu: top santra noktasının üstüne konur ve serbest düşer; süper etkisi ve
   * yanılsamalar silinir. (Simülasyon dışından yapılan bir müdahaledir; tekrar sistemi
   * yalnızca girdileri kaydettiği için antrenman tekrar edilemez — gerek de yok.)
   */
  resetBall(): void {
    this.holdBallAtCenter();
    this.decoys.length = 0;
  }

  /** Antrenman kısayolu: oyuncunun güç barını doldurur (süper hazırsa değişmez). */
  fillPower(index: PlayerIndex): void {
    this.players[index].addPower(1);
  }

  /** Simülasyona katılan oyuncu mu? (Rakipsiz antrenmanda P2 değildir.) */
  private present(p: Player): boolean {
    return !(this.soloMode && p.index === 1);
  }

  /** [P1, P2] skoru. */
  get score(): readonly [number, number] {
    return this.match.score;
  }

  /**
   * Bir sabit adım ilerletir ve bu adımda olan olayları döndürür. Dönen dizi simülasyona aittir
   * ve bir sonraki adıma kadar geçerlidir (her adımda yeni dizi ayrılmaz); saklamak için kopyalayın.
   */
  step(inputs: readonly [InputState, InputState]): readonly SimEvent[] {
    this.events.length = 0;
    const [p1, p2] = this.players;
    const active = this.match.playersActive;
    this.applyPowerUpModifiers(STEP_SECONDS);
    const wasGrounded = this.wasGrounded;
    wasGrounded[0] = p1.grounded;
    wasGrounded[1] = p2.grounded;
    for (const p of this.players) {
      const wasArmed = p.superArmed;
      const wasJumping = p.jumping;
      const airJumpBefore = p.airJumpUsed;
      p.applyInput(active && this.present(p) ? inputs[p.index] : EMPTY_INPUT, STEP_SECONDS);
      if (p.superArmed && !wasArmed) this.events.push({ type: 'superArmed', player: p.index });
      if (p.jumping && !wasJumping) {
        this.events.push({ type: 'jump', player: p.index, air: p.airJumpUsed && !airJumpBefore });
      }
    }
    this.applyTornado(STEP_SECONDS);
    this.ball.clampSpeed();
    const fallSpeeds = this.fallSpeeds;
    fallSpeeds[0] = p1.vy;
    fallSpeeds[1] = p2.vy;
    this.touchSpeeds[0] = 0;
    this.touchSpeeds[1] = 0;
    this.ball.impactSpeed = 0;

    const wasPhased = this.ball.phased;
    const n = computeSubSteps(this.maxPointSpeed(), STEP_SECONDS, PHYSICS);
    const h = STEP_SECONDS / n;
    this.lastSubSteps = n;
    p1.groundedThisStep = false;
    p2.groundedThisStep = false;
    this.ball.grounded = false;
    for (let i = 0; i < n; i++) this.subStep(h);
    p1.grounded = p1.groundedThisStep;
    p2.grounded = p2.groundedThisStep;
    this.ball.clampSpeed();
    if (wasPhased && !this.ball.phased) {
      this.events.push({ type: 'teleportExit', x: this.ball.x, y: this.ball.y });
    }
    this.pushFeelEvents(wasGrounded, fallSpeeds);

    this.stepDecoys(STEP_SECONDS);
    this.applyRules(STEP_SECONDS);
    this.tick++;
    return this.events;
  }

  /**
   * Ses ve efekt için "his" olayları (oyun durumunu değiştirmez): iniş, topun saha çarpması ve
   * oyunculara pasif teması. Alt adımlar boyunca toplanan en sert değerlerden adım başına bir kez.
   */
  private pushFeelEvents(
    wasGrounded: readonly [boolean, boolean],
    fallSpeeds: readonly [number, number],
  ): void {
    const e = SIM_EVENTS;
    for (const p of this.players) {
      const fall = fallSpeeds[p.index];
      if (p.grounded && !wasGrounded[p.index] && fall >= e.landMinSpeed) {
        this.events.push({ type: 'land', player: p.index, speed: fall });
      }
      const touch = this.touchSpeeds[p.index];
      if (touch >= e.touchMinSpeed)
        this.events.push({ type: 'ballTouch', player: p.index, speed: touch });
    }
    const ball = this.ball;
    if (ball.impactSpeed >= e.ballImpactMinSpeed) {
      this.events.push({
        type: 'ballImpact',
        surface: ball.impactKind,
        speed: ball.impactSpeed,
        x: ball.impactX,
        y: ball.impactY,
      });
    }
  }

  /**
   * Güçlendirici sayaçlarından etkiler: kendi kafası (Büyük Kafa), rakibin kafası (Küçült), hız,
   * çift zıplama, rakip kalesinin yüksekliği. Kafa ve kale kademeli değişir.
   */
  private applyPowerUpModifiers(dt: number): void {
    const pu = POWERUPS;
    for (const p of this.players) {
      const opp = this.players[p.index === 0 ? 1 : 0];
      const target =
        (p.powerUps.bigHead > 0 ? pu.bigHeadScale : 1) *
        (opp.powerUps.shrinkOpponent > 0 ? pu.shrinkScale : 1);
      p.headScale = moveToward(p.headScale, target, pu.headScaleRate * dt);
      p.speedScale = p.powerUps.speed > 0 ? pu.speedScale : 1;
      p.doubleJumpEnabled = p.powerUps.doubleJump > 0;
    }
    for (const goal of this.pitch.goals) {
      const attacker = this.players[goal.defender === 0 ? 1 : 0];
      const base = PITCH.goal.mouthHeight;
      const target = attacker.powerUps.growGoal > 0 ? base + pu.goalGrowPx : base;
      if (goal.mouthHeight !== target) {
        setGoalMouthHeight(goal, moveToward(goal.mouthHeight, target, pu.goalGrowSpeed * dt));
      }
    }
  }

  /** Kasırga: topun yakınındaki rakip, topun gidiş yönünde geri itilir (havadaysa daha az). */
  private applyTornado(dt: number): void {
    const ball = this.ball;
    if (ball.superType !== 'tornado' || ball.superOwner < 0) return;
    const t = SUPER_SHOTS.tornado;
    const victim = this.players[ball.superOwner === 0 ? 1 : 0];
    if (!this.present(victim)) return;
    const d = Math.hypot(victim.x - ball.x, victim.y - ball.y);
    if (d >= t.radiusPx) return;
    const dir = ball.superDir;
    const strength = (1 - d / t.radiusPx) * (victim.grounded ? 1 : t.airborneFactor);
    const along = victim.vx * dir;
    const target = t.maxPushSpeed * strength;
    if (along < target) victim.vx = dir * moveToward(along, target, t.pushAccel * dt);
  }

  private maxPointSpeed(): number {
    let max = this.ball.speed;
    for (const p of this.players) max = Math.max(max, p.maxPointSpeed());
    return max;
  }

  private subStep(h: number): void {
    for (const p of this.players) p.integrate(h);
    this.ball.integrate(h);

    for (const p of this.players) this.collidePlayerStatic(p);
    if (!this.soloMode) this.collidePlayers();
    // Aynı alt adımda iki oyuncu da topa değerse önce çözülen avantajlı olur (eşzamanlı
    // kafa/şut düellosu, ör. simetrik santra). Sıra adım numarasının karıştırılmış bir bitiyle
    // seçilir: deterministik (tekrar bozulmaz) ama santra gibi düzenli zamanlamalarla hizalanmaz.
    // (Basit parite hizalanıyordu: simetrik AI maçlarında bir taraf ~%55 kazanıyordu.)
    const [p1, p2] = this.players;
    const p1First = Math.imul(this.tick, ORDER_HASH) >>> ORDER_SHIFT === 0;
    // Işınlanan top görünmezdir ve oyuncuların içinden geçer.
    if (!this.ball.phased) {
      if (this.soloMode) {
        this.collideBallPlayer(p1);
      } else {
        this.collideBallPlayer(p1First ? p1 : p2);
        this.collideBallPlayer(p1First ? p2 : p1);
      }
    }
    const pinned = this.collideBallStatic(h);
    this.checkBalloon();
    if (pinned) {
      // Top bir yüzeye dayalıyken oyuncu onu içine itemez: oyuncuyu toptan dışarı it.
      for (const p of this.players) if (this.present(p)) this.pushPlayerOutOfBall(p);
      for (const p of this.players) this.collidePlayerStatic(p);
    }
  }

  private collidePlayerStatic(p: Player): void {
    for (const collider of this.pitch.colliders) {
      for (const part of STATIC_PARTS) {
        const circle = p.partCircle(part);
        const contact = collideStatic(circle, collider);
        if (!contact) continue;
        resolveContact(p, circle.radius, null, 0, contact, PLAYER.materials.solid, PHYSICS);
        if (contact.ny <= -GROUND_MIN) p.groundedThisStep = true;
      }
    }
  }

  /** Oyuncular birbirini iter ama içinden geçemez; birinin kafasına basan "yerde" sayılır. */
  private collidePlayers(): void {
    const [a, b] = this.players;
    for (const partA of STATIC_PARTS) {
      for (const partB of STATIC_PARTS) {
        const ca = a.partCircle(partA);
        const cb = b.partCircle(partB);
        const contact = circleVsCircle(ca, cb);
        if (!contact) continue;
        resolveContact(a, ca.radius, b, cb.radius, contact, PLAYER.materials.solid, PHYSICS);
        if (contact.ny <= -GROUND_MIN) a.groundedThisStep = true;
        if (contact.ny >= GROUND_MIN) b.groundedThisStep = true;
      }
    }
  }

  private collideBallPlayer(p: Player): void {
    this.tryKick(p);
    const ball = this.ball;
    for (const part of BALL_PARTS) {
      const circle = p.partCircle(part);
      const contact = circleVsCircle(ball, circle);
      if (!contact) continue;
      const result = resolveContact(
        ball,
        ball.radius,
        p,
        circle.radius,
        contact,
        PLAYER.materials[part],
        PHYSICS,
      );
      // Kafa vuruşu: oyuncu topa doğru hareket ediyorsa hızının bir kısmı topa aktarılır
      // (zıplarken kafa → güçlü vole, koşarken kafa → ileri itiş).
      const movingIntoBall = p.vx * contact.nx + p.vy * contact.ny > 0;
      const header =
        part === 'head' && movingIntoBall && result.approachSpeed >= HEADER.minImpactSpeed;
      if (result.impulse > 0) {
        ball.lastTouch = p.index;
        ball.touches++;
        p.chargeTouch();
        this.onSuperContact(p, header);
        if (!header && result.approachSpeed > this.touchSpeeds[p.index]) {
          this.touchSpeeds[p.index] = result.approachSpeed;
        }
      }
      if (header) {
        ball.vx += p.vx * HEADER.velocityBonus;
        ball.vy += p.vy * HEADER.velocityBonus;
        const superHit = p.superArmed;
        if (superHit) this.applySuperHeader(p);
        this.events.push({ type: 'header', player: p.index, speed: ball.speed, super: superHit });
      }
    }
  }

  /**
   * Süper top bir oyuncuya (şut dışında) değdi: rakip topu **pasif** karşıladıysa (gövde, duran
   * kafa) tipin etkisi uygulanır (Buz → donma, Ateş → geri savrulma); kafayla aktif vuruş — şut
   * gibi — temiz karşılıktır. Etki biter. Dev Top yalnızca süreyle biter. Atan oyuncunun
   * atıştan hemen sonraki teması (ayak/kafa hâlâ topa değiyor) etkiyi bozmaz.
   */
  private onSuperContact(p: Player, activeHeader: boolean): void {
    const ball = this.ball;
    const type = ball.superType;
    if (type === null || type === 'giant') return;
    const own = ball.superOwner === p.index;
    if (own && ball.superTime < SUPER.bounceGraceSeconds) return;
    if (!own && !activeHeader) {
      if (type === 'ice') {
        if (p.freeze(SUPER_SHOTS.ice.freezeSeconds, true)) this.pushHit(p, type);
      } else if (type === 'fire') {
        const f = SUPER_SHOTS.fire;
        p.vx = ball.superDir * f.knockbackSpeed;
        p.vy = Math.min(p.vy, -f.knockbackLift);
        p.grounded = false;
        p.jumping = false;
        this.pushHit(p, type);
      }
    }
    ball.clearSuper();
  }

  private pushHit(p: Player, superType: SuperType): void {
    this.events.push({ type: 'superHit', player: p.index, superType });
  }

  /** Süper atış: topa tipin etkisi yüklenir; Serap yanılsamaları ve Sarsıntı burada başlar. */
  private launchSuper(p: Player): void {
    const ball = this.ball;
    const type = p.loadout.superType;
    p.superArmed = false;
    this.decoys.length = 0;
    launchSuper(ball, type, p.index, p.facing);
    const opp = this.players[p.index === 0 ? 1 : 0];
    if (type === 'mirage') this.spawnDecoys();
    if (type === 'quake') {
      opp.jumpLockTimer = Math.max(opp.jumpLockTimer, SUPER_SHOTS.quake.jumpLockSeconds);
      this.pushHit(opp, type);
    }
    this.events.push({ type: 'superLaunch', player: p.index, superType: type });
  }

  /** Serap: gerçek top tohumlu rastgelelikle üç yönden birini alır, yanılsamalar diğer ikisini. */
  private spawnDecoys(): void {
    const ball = this.ball;
    const m = SUPER_SHOTS.mirage;
    const real = Math.min(MIRAGE_SLOTS - 1, Math.floor(this.rng.next() * MIRAGE_SLOTS));
    const vx = ball.vx;
    const vy = ball.vy;
    for (let slot = 0; slot < MIRAGE_SLOTS; slot++) {
      const angle = (slot - 1) * m.spreadRad;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const rvx = vx * c - vy * s;
      const rvy = vx * s + vy * c;
      if (slot === real) {
        ball.vx = rvx;
        ball.vy = rvy;
        continue;
      }
      const decoy = new Ball();
      decoy.resetTo(ball.x, ball.y);
      decoy.vx = rvx;
      decoy.vy = rvy;
      decoy.angVel = ball.angVel;
      this.decoys.push({ ball: decoy, ttl: m.duration });
    }
  }

  /**
   * Yanılsamaları ilerletir: sahayla çarpışır ama oyunculara değince, kaleye yaklaşınca ya da
   * süre dolunca söner. Gerçek topun Serap etkisi bitince hepsi söner.
   */
  private stepDecoys(dt: number): void {
    if (this.decoys.length === 0) return;
    if (this.ball.superType !== 'mirage') {
      this.decoys.length = 0;
      return;
    }
    const margin = SUPER_SHOTS.mirage.decoyGoalMarginPx;
    for (let i = this.decoys.length - 1; i >= 0; i--) {
      const d = this.decoys[i];
      if (!d) continue;
      stepBallAlone(d.ball, this.pitch, dt);
      d.ttl -= dt;
      const b = d.ball;
      const nearGoal =
        b.x - b.radius < PITCH.goal.depth + margin ||
        b.x + b.radius > this.pitch.width - PITCH.goal.depth - margin;
      if (d.ttl <= 0 || nearGoal || this.touchesPlayer(b)) this.decoys.splice(i, 1);
    }
  }

  private touchesPlayer(b: Ball): boolean {
    for (const p of this.players) {
      if (!this.present(p)) continue;
      for (const part of BALL_PARTS) {
        if (circleVsCircle(b, p.partCircle(part))) return true;
      }
    }
    return false;
  }

  /** Top balona değdiyse (ve topa daha önce biri dokunduysa) balon patlar. */
  private checkBalloon(): void {
    const b = this.balloon;
    const ball = this.ball;
    const toucher = ball.lastTouch;
    if (!b || ball.phased || toucher === -1) return;
    if (!ballHitsBalloon(b, ball.x, ball.y, ball.radius)) return;
    this.balloon = null;
    this.grantPowerUp(toucher, b.type);
  }

  private grantPowerUp(index: PlayerIndex, type: PowerUpType): void {
    const p = this.players[index];
    p.powerUps[type] = powerUpDuration(type);
    if (type === 'freezeOpponent') {
      this.players[index === 0 ? 1 : 0].freeze(POWERUPS.durations.freezeOpponent, false);
    }
    this.events.push({ type: 'balloonPop', player: index, powerUp: type });
  }

  private nextBalloonDelay(): number {
    return this.rng.range(POWERUPS.spawnIntervalMin, POWERUPS.spawnIntervalMax);
  }

  /** Güçlendirici süreleri, balon zamanlayıcısı ve ömrü. Yalnızca oyun akarken işler. */
  private updatePowerUps(dt: number): void {
    for (const p of this.players) {
      for (const key of Object.keys(p.powerUps) as PowerUpType[]) {
        if (p.powerUps[key] > 0) p.powerUps[key] = Math.max(0, p.powerUps[key] - dt);
      }
    }
    if (!this.powerUpsEnabled) return;
    if (this.balloon) {
      this.balloon.age += dt;
      if (this.balloon.age >= POWERUPS.balloon.lifetimeSeconds) {
        this.balloon = null;
        this.events.push({ type: 'balloonExpire' });
      }
    }
    this.balloonTimer -= dt;
    if (this.balloonTimer <= 0) {
      this.balloon = spawnBalloon(this.rng);
      this.balloonTimer = this.nextBalloonDelay();
      this.events.push({ type: 'balloonSpawn', powerUp: this.balloon.type });
    }
  }

  /**
   * Şut: savrulma evresinde ayak (tolerans yarıçapıyla) topa ilk değdiğinde bir kez uygulanır.
   * - Güç: savrulma fazına (o anki açısal hız / en yüksek açısal hız) ve oyuncunun şut
   *   yönündeki hızına bağlı.
   * - Yön: bakış yönünde; yükselme açısı temas normalinden gelir — ayak topun altına
   *   vurursa top yükselir, üstüne vurursa yere doğru gider.
   */
  private tryKick(p: Player): void {
    if (p.kickPhase !== 'swing' || p.kickHitDone) return;
    const ball = this.ball;
    const foot = p.partCircle('foot');
    const dx = ball.x - foot.x;
    const dy = ball.y - foot.y;
    const touch = ball.radius + foot.radius;
    const reach = touch + KICK.hitRadiusBonus;
    const d2 = dx * dx + dy * dy;
    if (d2 >= reach * reach) return;

    const d = Math.sqrt(d2);
    const nx = d > PHYSICS.epsilon ? dx / d : p.facing;
    const ny = d > PHYSICS.epsilon ? dy / d : 0;

    const superShot = p.superArmed;
    const kick = computeKick({
      facing: p.facing,
      playerVx: p.vx,
      playerVy: p.vy,
      swingFactor: p.swingFactor,
      nx,
      ny,
      ballVx: ball.vx,
      ballVy: ball.vy,
      power: p.params.kickPower,
      superType: superShot ? p.loadout.superType : null,
    });
    // Süper topa şutla vurmak temiz bir karşılıktır: etki olumsuz sonuç doğurmadan biter.
    if (ball.superType !== null && ball.superType !== 'giant') ball.clearSuper();
    ball.vx = kick.vx;
    ball.vy = kick.vy;
    ball.angVel += kick.spin;
    ball.clampSpeed();

    // Gerçekten çakışıyorsa topu ayağın dışına taşı.
    if (d < touch) {
      ball.x = foot.x + nx * touch;
      ball.y = foot.y + ny * touch;
    }
    p.kickHitDone = true;
    ball.lastTouch = p.index;
    ball.touches++;
    p.chargeTouch();
    if (superShot) this.launchSuper(p);
    ball.clampSpeed();
    this.events.push({ type: 'kick', player: p.index, speed: ball.speed, super: superShot });
  }

  /**
   * Süper kafa: top yönünü korur, en az `SUPER.headerMinSpeed` hızla gider; ardından karakterin
   * süper tipi yüklenir.
   */
  private applySuperHeader(p: Player): void {
    const ball = this.ball;
    const speed = ball.speed;
    if (speed > PHYSICS.epsilon && speed < SUPER.headerMinSpeed) {
      const k = SUPER.headerMinSpeed / speed;
      ball.vx *= k;
      ball.vy *= k;
    }
    this.launchSuper(p);
    ball.clampSpeed();
  }

  /** @returns Top bu alt adımda herhangi bir statik yüzeye değdiyse true. */
  private collideBallStatic(h: number): boolean {
    return collideBallWithPitch(this.ball, this.pitch, h);
  }

  private pushPlayerOutOfBall(p: Player): void {
    const ball = this.ball;
    for (const part of STATIC_PARTS) {
      const circle = p.partCircle(part);
      const contact = circleVsCircle(circle, ball);
      if (!contact) continue;
      resolveContact(p, circle.radius, null, 0, contact, PLAYER.materials.solid, PHYSICS);
      if (contact.ny <= -GROUND_MIN) p.groundedThisStep = true;
    }
  }

  private applyRules(dt: number): void {
    const match = this.match;
    // Santra beklemesinde top ortada tutulur; düdükle birlikte serbest düşer.
    if (match.ballHeld) this.holdBallAtCenter();
    if (match.goalsAllowed) {
      for (const p of this.players) p.addPower(POWER.chargePerSecond * dt);
      this.updatePowerUps(dt);
    }
    if (match.playersActive) for (const p of this.players) p.tickStatus(dt);
    if (applyCrossbarRest(this.ball, this.pitch, dt)) this.events.push({ type: 'crossbarPush' });

    const scorer = match.goalsAllowed ? this.detectGoal() : null;
    const firstNew = this.events.length;
    match.advance(dt, scorer, this.events);
    for (let i = firstNew; i < this.events.length; i++) {
      if (this.events[i]?.type === 'kickoff') this.resetPositions();
    }
  }

  /** Top bir kaleye tamamen girdiyse golü atan oyuncu (kalenin rakibi), yoksa null. */
  private detectGoal(): PlayerIndex | null {
    for (const goal of this.pitch.goals) {
      if (isBallInGoal(this.ball, goal)) return goal.defender === 0 ? 1 : 0;
    }
    return null;
  }

  private holdBallAtCenter(): void {
    this.ball.resetTo(this.pitch.width / 2, BALL.kickoffY);
  }

  /** Santra dizilişi: oyuncular başlangıç konumlarına, top ortada (yukarıda). */
  resetPositions(): void {
    const { width, groundY } = this.pitch;
    const standY = groundY - PLAYER_STAND_OFFSET;
    const spawnX = width * PLAYER.spawnXRatio;
    this.players[0].resetTo(spawnX, standY);
    this.players[1].resetTo(width - spawnX, standY);
    for (const p of this.players) p.clearStatus();
    this.holdBallAtCenter();
    this.decoys.length = 0;
    this.balloon = null;
  }

  /** Balonun o anki merkezi (yoksa null). */
  balloonPosition(): { x: number; y: number } | null {
    return this.balloon ? balloonPosition(this.balloon) : null;
  }

  /** `index` oyuncusunun hücum ettiği kalenin çizgisi. */
  static attackLineX(index: PlayerIndex): number {
    return attackLineX(index);
  }

  /**
   * Tam durumu kaydeder (gol tekrarı). `into` verilirse onun nesneleri yeniden kullanılır
   * (anahtar kareler her karede bellek ayırmasın). Yanılsamalar ve balon kopyalanır.
   */
  saveState(into?: SimState): SimState {
    const m = this.match;
    const s: SimState = into ?? {
      tick: 0,
      match: {
        phase: m.phase,
        overtime: false,
        timeLeft: 0,
        phaseTime: 0,
        score: [0, 0],
        lastScorer: -1,
        winner: null,
        endReason: null,
      },
      players: [{}, {}],
      ball: {},
      decoys: [],
      balloon: null,
      balloonTimer: 0,
      goalMouths: [0, 0],
      rngState: 0,
      solo: false,
    };
    s.tick = this.tick;
    const ms = s.match;
    ms.phase = m.phase;
    ms.overtime = m.overtime;
    ms.timeLeft = m.timeLeft;
    ms.phaseTime = m.phaseTime;
    ms.score[0] = m.score[0];
    ms.score[1] = m.score[1];
    ms.lastScorer = m.lastScorer;
    ms.winner = m.winner;
    ms.endReason = m.endReason;
    copyFields(s.players[0], this.players[0]);
    copyFields(s.players[1], this.players[1]);
    copyFields(s.ball, this.ball);
    s.decoys.length = this.decoys.length;
    this.decoys.forEach((d, i) => {
      const slot = (s.decoys[i] ??= { ball: {}, ttl: 0 });
      copyFields(slot.ball, d.ball);
      slot.ttl = d.ttl;
    });
    s.balloon = this.balloon ? { ...this.balloon } : null;
    s.balloonTimer = this.balloonTimer;
    s.goalMouths[0] = this.pitch.goals[0].mouthHeight;
    s.goalMouths[1] = this.pitch.goals[1].mouthHeight;
    s.rngState = this.rng.state;
    s.solo = this.soloMode;
    return s;
  }

  /** `saveState` ile alınan durumu birebir geri yükler (aynı kurulumla oluşturulmuş simülasyona). */
  loadState(s: SimState): void {
    this.tick = s.tick;
    const m = this.match;
    const ms = s.match;
    m.phase = ms.phase;
    m.overtime = ms.overtime;
    m.timeLeft = ms.timeLeft;
    m.phaseTime = ms.phaseTime;
    m.score[0] = ms.score[0];
    m.score[1] = ms.score[1];
    m.lastScorer = ms.lastScorer;
    m.winner = ms.winner;
    m.endReason = ms.endReason;
    copyFields(this.players[0], s.players[0]);
    copyFields(this.players[1], s.players[1]);
    copyFields(this.ball, s.ball);
    this.decoys.length = 0;
    for (const d of s.decoys) {
      const ball = new Ball();
      copyFields(ball, d.ball);
      this.decoys.push({ ball, ttl: d.ttl });
    }
    this.balloon = s.balloon ? { ...s.balloon } : null;
    this.balloonTimer = s.balloonTimer;
    setGoalMouthHeight(this.pitch.goals[0], s.goalMouths[0]);
    setGoalMouthHeight(this.pitch.goals[1], s.goalMouths[1]);
    this.rng.state = s.rngState;
    this.soloMode = s.solo;
  }

  snapshot(): SimSnapshot {
    const b = this.ball;
    return {
      tick: this.tick,
      match: this.match.snapshot(),
      ball: {
        x: b.x,
        y: b.y,
        vx: b.vx,
        vy: b.vy,
        angle: b.angle,
        angVel: b.angVel,
        crossbarTimer: b.crossbarTimer,
        lastTouch: b.lastTouch,
        super: {
          superType: b.superType,
          superOwner: b.superOwner,
          superTime: b.superTime,
          superDir: b.superDir,
          phased: b.phased,
          phaseDone: b.phaseDone,
          radiusScale: b.radiusScale,
        },
      },
      players: [snapshotPlayer(this.players[0]), snapshotPlayer(this.players[1])],
      decoys: this.decoys.map((d) => ({
        x: d.ball.x,
        y: d.ball.y,
        vx: d.ball.vx,
        vy: d.ball.vy,
        ttl: d.ttl,
      })),
      balloon: this.balloon ? { ...this.balloon } : null,
      balloonTimer: this.balloonTimer,
      goalMouths: [this.pitch.goals[0].mouthHeight, this.pitch.goals[1].mouthHeight],
      rngState: this.rng.state,
    };
  }
}

function snapshotPlayer(p: Player): PlayerSnapshot {
  return {
    x: p.x,
    y: p.y,
    vx: p.vx,
    vy: p.vy,
    grounded: p.grounded,
    coyoteTimer: p.coyoteTimer,
    jumpBufferTimer: p.jumpBufferTimer,
    jumping: p.jumping,
    prevJump: p.prevJump,
    prevKick: p.prevKick,
    kickPhase: p.kickPhase,
    kickTimer: p.kickTimer,
    kickBufferTimer: p.kickBufferTimer,
    kickHitDone: p.kickHitDone,
    footAngle: p.footAngle,
    footAngVel: p.footAngVel,
    power: p.power,
    superArmed: p.superArmed,
    prevSuper: p.prevSuper,
    touchCooldown: p.touchCooldown,
    headScale: p.headScale,
    speedScale: p.speedScale,
    doubleJumpEnabled: p.doubleJumpEnabled,
    airJumpUsed: p.airJumpUsed,
    frozenTimer: p.frozenTimer,
    freezeImmunity: p.freezeImmunity,
    jumpLockTimer: p.jumpLockTimer,
    powerUps: { ...p.powerUps },
  };
}
