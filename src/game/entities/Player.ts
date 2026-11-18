import { KICK, PLAYER, POWER, POWERUPS, type PowerUpType } from '../../config/gameConfig';
import { EMPTY_INPUT, type InputState } from '../../input/InputState';
import { moveToward, type Circle, type ContactBody, type Vec2 } from '../../physics';
import { NEUTRAL_LOADOUT, type Loadout, type PlayerParams } from '../characters';
import type { Facing, PlayerIndex } from '../types';

export const POWER_UP_TYPES: readonly PowerUpType[] = [
  'bigHead',
  'shrinkOpponent',
  'speed',
  'growGoal',
  'freezeOpponent',
  'doubleJump',
];

export type PowerUpTimers = Record<PowerUpType, number>;

export function emptyPowerUpTimers(): PowerUpTimers {
  return {
    bigHead: 0,
    shrinkOpponent: 0,
    speed: 0,
    growGoal: 0,
    freezeOpponent: 0,
    doubleJump: 0,
  };
}

export type KickPhase = 'idle' | 'swing' | 'hold' | 'return';
export type PlayerPart = 'head' | 'body' | 'foot';

const HALF_PI = Math.PI / 2;
const KICK_SPAN = KICK.maxAngle - KICK.restAngle;
/** Savrulmanın en yüksek açısal hızı (ease-out sinüs: t = 0 anında). */
export const KICK_PEAK_ANG_VEL = (KICK_SPAN * HALF_PI) / KICK.swingSeconds;

/** Kafa merkezinden gövdenin en alt noktasına uzaklık (ayakta duruş yüksekliği). */
export const PLAYER_STAND_OFFSET = PLAYER.body.offsetY + PLAYER.body.radius;

/**
 * Ayak merkezinin kafa merkezine göre ofseti. Açı 0 = kalçadan dümdüz aşağı; açı arttıkça
 * ayak bakış yönünde öne, sonra yukarı savrulur. Çizim de bu fonksiyonu kullanır.
 */
export function footOffset(angle: number, facing: Facing): Vec2 {
  return {
    x: facing * Math.sin(angle) * PLAYER.foot.legLength,
    y: PLAYER.foot.hipOffsetY + Math.cos(angle) * PLAYER.foot.legLength,
  };
}

/**
 * Oyuncu: kafa (ana çarpışma dairesi) + gövde + tek ayak. Dönmez.
 *
 * Akış: her sabit adımda bir kez `applyInput` (hareket eğrisi, zıplama, şut tetikleme),
 * sonra her alt adımda `integrate` (yerçekimi, konum, ayak savrulması). Zemin teması
 * çarpışma çözümü sırasında `groundedThisStep` ile toplanır.
 */
export class Player implements ContactBody {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  /** Oyuncular dönmez; `invInertia = 0` olduğu için bu değer hep 0 kalır. */
  angVel = 0;
  readonly invInertia = 0;

  /** Karakterin fizik değerleri ve süper tipi. */
  loadout: Loadout;
  /** Kafa yarıçapı çarpanı (Büyük Kafa / Rakibi Küçült güçlendiricileri). */
  headScale = 1;
  /** Hız ve ivme çarpanı (Hız güçlendiricisi). */
  speedScale = 1;
  /** Çift zıplama güçlendiricisi etkin mi. */
  doubleJumpEnabled = false;
  /** Bu havada kalışta çift zıplama kullanıldı mı (yere inince sıfırlanır). */
  airJumpUsed = false;
  /** Donmuş kalan süre (sn): girdiler yok sayılır. */
  frozenTimer = 0;
  /** Buz süperine karşı bağışıklık (sn). */
  freezeImmunity = 0;
  /** Zıplayamama süresi (sn): Sarsıntı süperi. */
  jumpLockTimer = 0;
  /**
   * Bu oyuncunun **kazandığı** güçlendiricilerin kalan süreleri (sn). Etkileri (kendi kafası,
   * rakibin kafası, rakip kalesi…) GameSim her adımda bu sayaçlardan türetir.
   */
  readonly powerUps: PowerUpTimers = emptyPowerUpTimers();

  grounded = false;
  groundedThisStep = false;
  coyoteTimer = 0;
  jumpBufferTimer = 0;
  /** Zıplamanın yükselme evresinde mi (değişken zıplama yüksekliği için). */
  jumping = false;
  prevJump = false;
  prevKick = false;

  kickPhase: KickPhase = 'idle';
  kickTimer = 0;
  kickBufferTimer = 0;
  /** Bu savrulmada şut darbesi uygulandı mı (savrulma başına bir kez). */
  kickHitDone = false;
  footAngle: number = KICK.restAngle;
  footAngVel = 0;

  /** Güç barı (0–1). Santrada sıfırlanmaz; maç boyunca birikir. */
  power = 0;
  /** Süper hazır: bir sonraki vuruş (şut ya da kafa) süper olur. */
  superArmed = false;
  prevSuper = false;
  /** Dokunuş dolumunun bekleme süresi (sn). */
  touchCooldown = 0;
  /** `partCircle` için yeniden kullanılan daireler (durum değildir; kaydedilmez). */
  private readonly circles = {
    head: { x: 0, y: 0, radius: 0 },
    body: { x: 0, y: 0, radius: PLAYER.body.radius },
    foot: { x: 0, y: 0, radius: PLAYER.foot.radius },
  };

  constructor(
    readonly index: PlayerIndex,
    readonly facing: Facing,
    loadout: Loadout = NEUTRAL_LOADOUT,
  ) {
    this.loadout = loadout;
  }

  get params(): PlayerParams {
    return this.loadout.params;
  }

  get invMass(): number {
    return 1 / this.loadout.params.mass;
  }

  /** O anki kafa yarıçapı (karakter × güçlendiriciler). */
  get headRadius(): number {
    return this.loadout.params.headRadius * this.headScale;
  }

  /** O anki en yüksek yatay hız (karakter × güçlendiriciler). */
  get maxSpeed(): number {
    return this.loadout.params.maxSpeed * this.speedScale;
  }

  get frozen(): boolean {
    return this.frozenTimer > 0;
  }

  /**
   * Oyuncuyu dondurur. `respectImmunity` (buz süperi) → yakın zamanda donmuşsa etkisiz.
   * @returns Donduysa true.
   */
  freeze(seconds: number, respectImmunity: boolean): boolean {
    if (respectImmunity && this.freezeImmunity > 0) return false;
    this.frozenTimer = Math.max(this.frozenTimer, seconds);
    this.freezeImmunity = this.frozenTimer + POWERUPS.freezeImmunitySeconds;
    this.jumping = false;
    return true;
  }

  /** Süreli durumların (donma, bağışıklık, zıplama kilidi) sayaçları. */
  tickStatus(dt: number): void {
    this.frozenTimer = Math.max(0, this.frozenTimer - dt);
    this.freezeImmunity = Math.max(0, this.freezeImmunity - dt);
    this.jumpLockTimer = Math.max(0, this.jumpLockTimer - dt);
  }

  /** Donma ve zıplama kilidini kaldırır (santra). Güçlendiriciler sürer. */
  clearStatus(): void {
    this.frozenTimer = 0;
    this.freezeImmunity = 0;
    this.jumpLockTimer = 0;
  }

  /** Konumu ayarlar ve tüm hareket/şut durumunu sıfırlar (santra). Güç barı ve süper korunur. */
  resetTo(x: number, y: number): void {
    this.airJumpUsed = false;
    this.prevSuper = false;
    this.touchCooldown = 0;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.grounded = true;
    this.groundedThisStep = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.jumping = false;
    this.prevJump = false;
    this.prevKick = false;
    this.kickPhase = 'idle';
    this.kickTimer = 0;
    this.kickBufferTimer = 0;
    this.kickHitDone = false;
    this.footAngle = KICK.restAngle;
    this.footAngVel = 0;
  }

  /** Sabit adım başına bir kez: girdiyi hıza, şut ve süper durumuna çevirir. */
  applyInput(raw: InputState, dt: number): void {
    // Donmuş oyuncu hiçbir tuşu kullanamaz (tuş kenarları da kaydedilmez: çözülünce basılı
    // tutulan tuş yeniden basılmış sayılır).
    const input = this.frozen ? EMPTY_INPUT : raw;
    this.applyMovement(input, dt);
    this.applyJump(input, dt);
    this.applySuperInput(input);
    this.applyKickInput(input, dt);
    this.touchCooldown = Math.max(0, this.touchCooldown - dt);
    this.prevJump = input.jump;
    this.prevKick = input.kick;
    this.prevSuper = input.super;
  }

  /** Bar doluyken Süper'e basmak bir sonraki vuruşu süper yapar ve barı boşaltır. */
  private applySuperInput(input: InputState): void {
    if (!input.super || this.prevSuper || this.superArmed || this.power < 1) return;
    this.superArmed = true;
    this.power = 0;
  }

  /** Güç barına ekler (süper hazırken dolmaz). */
  addPower(amount: number): void {
    if (this.superArmed) return;
    this.power = Math.min(1, this.power + amount);
  }

  /** Topa dokunuş dolumu: oyuncu başına bekleme süresiyle sınırlı. */
  chargeTouch(): void {
    if (this.touchCooldown > 0) return;
    this.addPower(POWER.chargePerTouch);
    this.touchCooldown = POWER.touchCooldownSeconds;
  }

  private applyMovement(input: InputState, dt: number): void {
    const m = PLAYER.move;
    if (this.frozen) {
      this.vx = moveToward(this.vx, 0, POWERUPS.frozenDecel * dt);
      return;
    }
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let rate: number;
    if (dir === 0) {
      rate = this.grounded ? m.groundDecel : m.airDecel;
    } else if (this.vx !== 0 && Math.sign(this.vx) !== dir) {
      rate = this.grounded ? m.groundTurnAccel : m.airTurnAccel;
    } else {
      rate = this.grounded ? m.groundAccel : m.airAccel;
    }
    const scale = this.loadout.params.accelScale * this.speedScale;
    this.vx = moveToward(this.vx, dir * this.maxSpeed, rate * scale * dt);
  }

  private applyJump(input: InputState, dt: number): void {
    const j = PLAYER.jump;
    if (this.grounded) this.airJumpUsed = false;
    this.coyoteTimer = this.grounded ? j.coyoteTime : Math.max(0, this.coyoteTimer - dt);
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    const pressed = input.jump && !this.prevJump;
    if (pressed) this.jumpBufferTimer = j.bufferTime;
    const locked = this.jumpLockTimer > 0;

    if (!locked && this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.startJump(this.loadout.params.jumpSpeed);
      return;
    }
    // Çift zıplama: havadayken (zıplama hakkı bittikten sonra) yeni bir basışla bir kez daha.
    if (
      !locked &&
      pressed &&
      this.doubleJumpEnabled &&
      !this.grounded &&
      this.coyoteTimer <= 0 &&
      !this.airJumpUsed
    ) {
      this.airJumpUsed = true;
      this.startJump(this.loadout.params.jumpSpeed * POWERUPS.doubleJumpSpeedScale);
      return;
    }

    if (this.jumping) {
      if (this.vy >= 0) {
        this.jumping = false;
      } else if (!input.jump) {
        this.vy *= j.cutMultiplier;
        this.jumping = false;
      }
    }
  }

  private startJump(speed: number): void {
    this.vy = -speed;
    this.jumpBufferTimer = 0;
    this.coyoteTimer = 0;
    this.grounded = false;
    this.jumping = true;
  }

  private applyKickInput(input: InputState, dt: number): void {
    this.kickBufferTimer = Math.max(0, this.kickBufferTimer - dt);
    if (input.kick && !this.prevKick) this.kickBufferTimer = KICK.bufferTime;
    if (this.kickBufferTimer > 0 && this.kickPhase === 'idle') {
      this.kickPhase = 'swing';
      this.kickTimer = 0;
      this.kickHitDone = false;
      this.kickBufferTimer = 0;
    }
  }

  /** Alt adım: yerçekimi (düşerken artırılmış), konum ve ayak savrulması. */
  integrate(h: number): void {
    const j = PLAYER.jump;
    const gravity = j.gravity * (this.vy > 0 ? j.fallGravityMultiplier : 1);
    this.vy = Math.min(this.vy + gravity * h, j.maxFallSpeed);
    this.x += this.vx * h;
    this.y += this.vy * h;
    this.advanceKick(h);
  }

  /**
   * Şut durum makinesi: idle → swing → hold → return → idle.
   * swing: θ = rest + span·sin(u·π/2)  (ease-out: en hızlı başta)
   * return: θ = max − span·(1 − cos(u·π))/2  (yumuşak dönüş)
   */
  private advanceKick(h: number): void {
    if (this.kickPhase === 'idle') {
      this.footAngle = KICK.restAngle;
      this.footAngVel = 0;
      return;
    }
    this.kickTimer += h;

    if (this.kickPhase === 'swing') {
      if (this.kickTimer < KICK.swingSeconds) {
        const u = this.kickTimer / KICK.swingSeconds;
        this.footAngle = KICK.restAngle + KICK_SPAN * Math.sin(u * HALF_PI);
        this.footAngVel = KICK_PEAK_ANG_VEL * Math.cos(u * HALF_PI);
        return;
      }
      this.kickTimer -= KICK.swingSeconds;
      this.kickPhase = 'hold';
    }

    if (this.kickPhase === 'hold') {
      if (this.kickTimer < KICK.holdSeconds) {
        this.footAngle = KICK.maxAngle;
        this.footAngVel = 0;
        return;
      }
      this.kickTimer -= KICK.holdSeconds;
      this.kickPhase = 'return';
    }

    if (this.kickTimer < KICK.returnSeconds) {
      const u = this.kickTimer / KICK.returnSeconds;
      this.footAngle = KICK.maxAngle - KICK_SPAN * (1 - Math.cos(u * Math.PI)) * 0.5;
      this.footAngVel = ((-KICK_SPAN * Math.PI) / (KICK.returnSeconds * 2)) * Math.sin(u * Math.PI);
      return;
    }
    this.kickPhase = 'idle';
    this.kickTimer = 0;
    this.footAngle = KICK.restAngle;
    this.footAngVel = 0;
  }

  /** Savrulma fazı katsayısı: 1 = en hızlı an (savrulma başı), 0 = savrulmuyor. */
  get swingFactor(): number {
    return this.kickPhase === 'swing' ? Math.max(0, this.footAngVel / KICK_PEAK_ANG_VEL) : 0;
  }

  /** Ayağın savrulma yönündeki birim teğeti (açı artış yönü). */
  footTangent(): Vec2 {
    return {
      x: this.facing * Math.cos(this.footAngle),
      y: -Math.sin(this.footAngle),
    };
  }

  /**
   * Parçanın çarpışma dairesi. Parça başına tek bir nesne yeniden kullanılır (alt adım başına
   * onlarca çağrı bellek ayırmasın): dönen değer bir sonraki aynı parça çağrısına kadar geçerlidir.
   */
  partCircle(part: PlayerPart): Circle {
    switch (part) {
      case 'head': {
        const c = this.circles.head;
        c.x = this.x;
        c.y = this.y;
        c.radius = this.headRadius;
        return c;
      }
      case 'body': {
        const c = this.circles.body;
        c.x = this.x;
        c.y = this.y + PLAYER.body.offsetY;
        return c;
      }
      case 'foot': {
        const c = this.circles.foot;
        const a = this.footAngle;
        c.x = this.x + this.facing * Math.sin(a) * PLAYER.foot.legLength;
        c.y = this.y + (PLAYER.foot.hipOffsetY + Math.cos(a) * PLAYER.foot.legLength);
        return c;
      }
    }
  }

  /** Oyuncunun herhangi bir noktasının bu adımdaki en yüksek hızı (alt adım seçimi için). */
  maxPointSpeed(): number {
    const linear = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const swing = this.kickPhase === 'idle' ? 0 : KICK_PEAK_ANG_VEL * PLAYER.foot.legLength;
    return linear + swing;
  }
}
