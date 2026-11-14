import { KICK, PLAYER } from '../../config/gameConfig';
import type { InputState } from '../../input/InputState';
import { moveToward, type Circle, type ContactBody, type Vec2 } from '../../physics';
import type { Facing, PlayerIndex } from '../types';

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
  readonly invMass = 1 / PLAYER.mass;
  readonly invInertia = 0;

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

  constructor(
    readonly index: PlayerIndex,
    readonly facing: Facing,
  ) {}

  /** Konumu ayarlar ve tüm hareket/şut durumunu sıfırlar (santra). */
  resetTo(x: number, y: number): void {
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

  /** Sabit adım başına bir kez: girdiyi hıza ve şut durumuna çevirir. */
  applyInput(input: InputState, dt: number): void {
    this.applyMovement(input, dt);
    this.applyJump(input, dt);
    this.applyKickInput(input, dt);
    this.prevJump = input.jump;
    this.prevKick = input.kick;
  }

  private applyMovement(input: InputState, dt: number): void {
    const m = PLAYER.move;
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let rate: number;
    if (dir === 0) {
      rate = this.grounded ? m.groundDecel : m.airDecel;
    } else if (this.vx !== 0 && Math.sign(this.vx) !== dir) {
      rate = this.grounded ? m.groundTurnAccel : m.airTurnAccel;
    } else {
      rate = this.grounded ? m.groundAccel : m.airAccel;
    }
    this.vx = moveToward(this.vx, dir * m.maxSpeed, rate * dt);
  }

  private applyJump(input: InputState, dt: number): void {
    const j = PLAYER.jump;
    this.coyoteTimer = this.grounded ? j.coyoteTime : Math.max(0, this.coyoteTimer - dt);
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    if (input.jump && !this.prevJump) this.jumpBufferTimer = j.bufferTime;

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.vy = -j.speed;
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.grounded = false;
      this.jumping = true;
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

  partCircle(part: PlayerPart): Circle {
    switch (part) {
      case 'head':
        return { x: this.x, y: this.y, radius: PLAYER.head.radius };
      case 'body':
        return { x: this.x, y: this.y + PLAYER.body.offsetY, radius: PLAYER.body.radius };
      case 'foot': {
        const o = footOffset(this.footAngle, this.facing);
        return { x: this.x + o.x, y: this.y + o.y, radius: PLAYER.foot.radius };
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
