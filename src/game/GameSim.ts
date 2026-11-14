import { BALL, HEADER, KICK, LOOP, PHYSICS, PLAYER, POWER, SUPER } from '../config/gameConfig';
import { EMPTY_INPUT, type InputState } from '../input/InputState';
import { circleVsCircle, computeSubSteps, resolveContact } from '../physics';
import { applyCrossbarRest, collideBallWithPitch, collideStatic } from './ballPhysics';
import { Ball } from './entities/Ball';
import { Player, PLAYER_STAND_OFFSET, type KickPhase, type PlayerPart } from './entities/Player';
import { computeKick } from './kick';
import { createPitch, type Pitch } from './pitch';
import { isBallInGoal } from './rules/ballRules';
import {
  DEFAULT_MATCH_RULES,
  MatchFlow,
  type MatchRules,
  type MatchSnapshot,
} from './rules/MatchFlow';
import type { PlayerIndex, SimEvent } from './types';

/** Simülasyonun sabit adım süresi. Gerçek zamandan bağımsızdır (determinizm). */
export const STEP_SECONDS = 1 / LOOP.stepHz;

const STATIC_PARTS: readonly PlayerPart[] = ['head', 'body'];
/** Top–oyuncu çözüm sırası için Knuth çarpımsal karıştırma sabiti ve en üst bit. */
const ORDER_HASH = 0x9e3779b1;
const ORDER_SHIFT = 31;
const BALL_PARTS: readonly PlayerPart[] = ['head', 'body', 'foot'];
const GROUND_MIN = PHYSICS.groundNormalMinY;

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
  };
  readonly players: readonly [PlayerSnapshot, PlayerSnapshot];
}

export interface GameSimOptions {
  /** Varsayılan maç kurallarının üzerine yazılacak değerler (testler, farklı modlar). */
  readonly rules?: Partial<MatchRules>;
  /** true → santra beklemesi atlanır, oyun ilk adımdan başlar (testler, antrenman). */
  readonly skipKickoff?: boolean;
}

/**
 * Deterministik maç simülasyonu: saha + top + iki oyuncu. Phaser'a bağımlı değildir.
 * Aynı başlangıç durumu ve aynı `InputState` dizisi → birebir aynı sonuç.
 *
 * Bir sabit adımın sırası:
 * 1. Oyuncu girdileri (hareket eğrisi, zıplama, şut tetikleme).
 * 2. Uyarlamalı sayıda alt adım; her birinde: entegrasyon → oyuncu–saha → oyuncu–oyuncu →
 *    top–oyuncu (şut, kafa) → top–saha → (top sıkıştıysa) oyuncuyu toptan it.
 * 3. Kurallar: güç barı dolumu, üst direkte bekleme, gol algılama → maç durum makinesi
 *    (`MatchFlow`).
 *
 * Santra beklemesinde ve maç bitince girdiler yok sayılır; santrada top ortada tutulur.
 */
export class GameSim {
  readonly pitch: Pitch = createPitch();
  readonly ball = new Ball();
  readonly players: readonly [Player, Player] = [new Player(0, 1), new Player(1, -1)];
  /** Maç durum makinesi: skor, süre, santra, gol kutlaması, altın gol, maç sonu. */
  readonly match: MatchFlow;
  tick = 0;
  /** Son adımda kullanılan alt adım sayısı (debug). */
  lastSubSteps = 0;
  private readonly events: SimEvent[] = [];

  constructor(options: GameSimOptions = {}) {
    this.match = new MatchFlow({ ...DEFAULT_MATCH_RULES, ...options.rules });
    this.resetPositions();
    if (options.skipKickoff) this.match.startInPlay();
  }

  /** [P1, P2] skoru. */
  get score(): readonly [number, number] {
    return this.match.score;
  }

  /** Bir sabit adım ilerletir ve bu adımda olan olayları döndürür. */
  step(inputs: readonly [InputState, InputState]): SimEvent[] {
    this.events.length = 0;
    const [p1, p2] = this.players;
    const active = this.match.playersActive;
    for (const p of this.players) {
      const wasArmed = p.superArmed;
      p.applyInput(active ? inputs[p.index] : EMPTY_INPUT, STEP_SECONDS);
      if (p.superArmed && !wasArmed) this.events.push({ type: 'superArmed', player: p.index });
    }
    this.ball.clampSpeed();

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

    this.applyRules(STEP_SECONDS);
    this.tick++;
    return this.events.slice();
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
    this.collidePlayers();
    // Aynı alt adımda iki oyuncu da topa değerse önce çözülen avantajlı olur (eşzamanlı
    // kafa/şut düellosu, ör. simetrik santra). Sıra adım numarasının karıştırılmış bir bitiyle
    // seçilir: deterministik (tekrar bozulmaz) ama santra gibi düzenli zamanlamalarla hizalanmaz.
    // (Basit parite hizalanıyordu: simetrik AI maçlarında bir taraf ~%55 kazanıyordu.)
    const [p1, p2] = this.players;
    const p1First = Math.imul(this.tick, ORDER_HASH) >>> ORDER_SHIFT === 0;
    this.collideBallPlayer(p1First ? p1 : p2);
    this.collideBallPlayer(p1First ? p2 : p1);
    const pinned = this.collideBallStatic(h);
    if (pinned) {
      // Top bir yüzeye dayalıyken oyuncu onu içine itemez: oyuncuyu toptan dışarı it.
      for (const p of this.players) this.pushPlayerOutOfBall(p);
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
      if (result.impulse > 0) {
        ball.lastTouch = p.index;
        ball.touches++;
        p.chargeTouch();
      }

      // Kafa vuruşu: oyuncu topa doğru hareket ediyorsa hızının bir kısmı topa aktarılır
      // (zıplarken kafa → güçlü vole, koşarken kafa → ileri itiş).
      const movingIntoBall = p.vx * contact.nx + p.vy * contact.ny > 0;
      if (part === 'head' && movingIntoBall && result.approachSpeed >= HEADER.minImpactSpeed) {
        ball.vx += p.vx * HEADER.velocityBonus;
        ball.vy += p.vy * HEADER.velocityBonus;
        const superHit = p.superArmed;
        if (superHit) this.applySuperHeader(p);
        this.events.push({ type: 'header', player: p.index, speed: ball.speed, super: superHit });
      }
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
      superShot,
    });
    ball.vx = kick.vx;
    ball.vy = kick.vy;
    ball.angVel += kick.spin;
    ball.clampSpeed();
    p.superArmed = false;

    // Gerçekten çakışıyorsa topu ayağın dışına taşı.
    if (d < touch) {
      ball.x = foot.x + nx * touch;
      ball.y = foot.y + ny * touch;
    }
    p.kickHitDone = true;
    ball.lastTouch = p.index;
    ball.touches++;
    p.chargeTouch();
    this.events.push({ type: 'kick', player: p.index, speed: ball.speed, super: superShot });
  }

  /** Süper kafa: top yönünü korur, en az `SUPER.headerMinSpeed` hızla gider. */
  private applySuperHeader(p: Player): void {
    const ball = this.ball;
    const speed = ball.speed;
    if (speed > PHYSICS.epsilon && speed < SUPER.headerMinSpeed) {
      const k = SUPER.headerMinSpeed / speed;
      ball.vx *= k;
      ball.vy *= k;
    }
    ball.clampSpeed();
    p.superArmed = false;
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
    }
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
    this.holdBallAtCenter();
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
      },
      players: [snapshotPlayer(this.players[0]), snapshotPlayer(this.players[1])],
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
  };
}
