import { BALL, KICK, LOOP, PHYSICS, PITCH, PLAYER } from '../../config/gameConfig';
import { EMPTY_INPUT, type InputState } from '../../input/InputState';
import { lerp } from '../../physics';
import { NEUTRAL_LOADOUT, type Loadout } from '../characters';
import { Player, PLAYER_STAND_OFFSET } from '../entities/Player';
import { STEP_SECONDS } from '../GameSim';

/**
 * Yapay zekânın kendi bedenini "bilmesi" için hareket modelleri. İkisi de oyuncunun gerçek
 * kodunu (`Player.applyInput` / `integrate`) bir hayalet kopyada çalıştırır; ayrı bir
 * yaklaşık formül yoktur.
 */

/** Kanonik çerçevede ileri okunabilen top yörüngesi (k = şimdiden k adım sonra). */
export interface Trajectory {
  x(k: number): number;
  y(k: number): number;
  vx(k: number): number;
  vy(k: number): number;
}

/** AI'ın kendi oyuncusunun (kanonik çerçevede) o anki durumu. */
export interface SelfState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly grounded: boolean;
}

const STAND_Y = PITCH.groundY - PLAYER_STAND_OFFSET;
const SUB_H = STEP_SECONDS / PHYSICS.subSteps;
/** Zıplama profilinin en uzun süresi (adım): tam bir zıplama ~0,6 sn sürer. */
const MAX_JUMP_STEPS = LOOP.stepHz * 2;

function input(dir: number, jump: boolean, kick: boolean): InputState {
  return { ...EMPTY_INPUT, left: dir < 0, right: dir > 0, jump, kick };
}

/**
 * Bir zıplama hızının ölçülmüş profili. Oyuncunun gerçek kodu (`Player`) hayalet bir kopyada
 * çalıştırılarak çıkarılır; karakterlerin zıplama hızı farklı olduğundan her hız için ayrı.
 */
export interface JumpProfile {
  /**
   * Zıplama tuşu basılı tutulduğunda, basıştan k adım sonra kafanın ayakta duruşa göre
   * yükselişi (px). `rise[0] = 0`; oyuncu yere inince dizi biter.
   */
  readonly rise: readonly number[];
  /**
   * Zıplama tuşu `hold` adım basılı tutulup bırakılırsa kafanın en yüksek yükselişi (px);
   * değişken zıplama yüksekliğiyle alçak sıçrayış. `hop[0] = 0`.
   */
  readonly hop: readonly number[];
  /** Tepe yüksekliği (px) ve basıştan tepeye kadar geçen adım. */
  readonly apexRise: number;
  readonly apexSteps: number;
}

function ghostFor(jumpSpeed: number): Player {
  const base = NEUTRAL_LOADOUT;
  const p = new Player(0, 1, { ...base, params: { ...base.params, jumpSpeed } });
  p.resetTo(0, 0);
  return p;
}

function measureJump(jumpSpeed: number): JumpProfile {
  const p = ghostFor(jumpSpeed);
  const hold = input(0, true, false);
  const rise = [0];
  for (let k = 0; k < MAX_JUMP_STEPS; k++) {
    p.applyInput(hold, STEP_SECONDS);
    for (let s = 0; s < PHYSICS.subSteps; s++) p.integrate(SUB_H);
    if (p.y >= 0) break;
    rise.push(-p.y);
  }
  const apexSteps = rise.reduce((best, r, i) => (r > (rise[best] ?? 0) ? i : best), 0);
  const hop = [0];
  for (let h = 1; h <= apexSteps; h++) {
    const g = ghostFor(jumpSpeed);
    let best = 0;
    for (let k = 0; k < MAX_JUMP_STEPS; k++) {
      g.applyInput(input(0, k < h, false), STEP_SECONDS);
      for (let s = 0; s < PHYSICS.subSteps; s++) g.integrate(SUB_H);
      if (g.y >= 0) break;
      best = Math.max(best, -g.y);
    }
    hop.push(best);
  }
  return { rise, hop, apexRise: rise[apexSteps] ?? 0, apexSteps };
}

const profiles = new Map<number, JumpProfile>();

/** Zıplama hızına göre (önbellekli) profil. */
export function jumpProfile(jumpSpeed: number): JumpProfile {
  let p = profiles.get(jumpSpeed);
  if (!p) {
    p = measureJump(jumpSpeed);
    profiles.set(jumpSpeed, p);
  }
  return p;
}

/**
 * `rise` px yükselmek için zıplama tuşunun en az kaç adım basılı tutulması gerektiği; bu
 * yüksekliğe `maxRise`'ı aşmadan çıkılamıyorsa −1.
 */
export function hopHoldTicks(
  rise: number,
  maxRise: number,
  profile: JumpProfile = NEUTRAL_JUMP,
): number {
  const hop = profile.hop;
  for (let hold = 1; hold < hop.length; hold++) {
    const r = hop[hold] ?? 0;
    if (r > maxRise) return -1;
    if (r >= rise) return hold;
  }
  return -1;
}

/**
 * Kafanın `rise` px yükselmesi için zıplamadan kaç adım önce basılmalı (yükselme evresinde
 * ilk ulaşılan an). Bu yüksekliğe çıkılamıyorsa −1.
 */
export function jumpLead(rise: number, profile: JumpProfile = NEUTRAL_JUMP): number {
  if (rise <= 0) return 0;
  for (let k = 1; k <= profile.apexSteps; k++) {
    if ((profile.rise[k] ?? 0) >= rise) return k;
  }
  return -1;
}

/** Nötr oyuncunun (Faz 1–3 değerleri) profili. */
const NEUTRAL_JUMP = jumpProfile(NEUTRAL_LOADOUT.params.jumpSpeed);
export const JUMP_RISE = NEUTRAL_JUMP.rise;
export const HOP_RISE = NEUTRAL_JUMP.hop;
/** Zıplamanın tepe yüksekliği (px). */
export const JUMP_APEX_RISE = NEUTRAL_JUMP.apexRise;
/** Basıştan tepeye kadar geçen adım sayısı. */
export const JUMP_APEX_STEPS = NEUTRAL_JUMP.apexSteps;

/** "Şimdi şut tuşuna basarsam" denemesinin sonucu: ilk temas anı ve o andaki değerler. */
export interface KickProbe {
  /** Temasın gerçekleştiği adım (0 = bu adım). */
  readonly contactTick: number;
  readonly swingFactor: number;
  /** Ayaktan topa birim normal. */
  readonly nx: number;
  readonly ny: number;
  readonly playerVx: number;
  readonly playerVy: number;
  readonly ballX: number;
  readonly ballY: number;
  readonly ballVx: number;
  readonly ballVy: number;
}

/**
 * Şut zamanlaması: bir hayalet oyuncu kopyasında şut tuşuna basılır ve savrulma boyunca ayak,
 * tahmin edilen top yörüngesiyle (alt adım çözünürlüğünde) karşılaştırılır. GameSim'deki
 * vuruş yarıçapı testinin aynısıdır. Kanonik çerçevede çalışır (oyuncu sağa bakar).
 */
export class KickSimulator {
  private readonly ghost = new Player(0, 1);
  private readonly reach = BALL.radius + PLAYER.foot.radius + KICK.hitRadiusBonus;

  /**
   * Hayalet oyuncunun karakter donanımı ve güçlendirici çarpanları (hız, ivme). Topun yarıçapı
   * (Dev Top) vuruş menzilini değiştirir.
   */
  configure(loadout: Loadout, speedScale: number): void {
    this.ghost.loadout = loadout;
    this.ghost.speedScale = speedScale;
  }

  /**
   * @param dir      Savrulma sırasında basılı tutulacak yön (−1, 0, +1).
   * @param maxTicks En çok kaç adım denenecek.
   */
  probe(
    me: SelfState,
    dir: number,
    traj: Trajectory,
    maxTicks: number,
    ballRadius: number = BALL.radius,
  ): KickProbe | null {
    const g = this.ghost;
    g.resetTo(me.x, me.y);
    g.vx = me.vx;
    g.vy = me.vy;
    g.grounded = me.grounded;
    const reach = this.reach + ballRadius - BALL.radius;
    const r2 = reach * reach;
    for (let k = 0; k < maxTicks; k++) {
      g.applyInput(input(dir, false, k === 0), STEP_SECONDS);
      for (let s = 1; s <= PHYSICS.subSteps; s++) {
        g.integrate(SUB_H);
        // Zemin teması GameSim'de çarpışmayla çözülür; hayalet kopyada kırpılır.
        if (g.y > STAND_Y) {
          g.y = STAND_Y;
          g.vy = 0;
        }
        if (g.kickPhase !== 'swing') return null;
        const t = s / PHYSICS.subSteps;
        const bx = lerp(traj.x(k), traj.x(k + 1), t);
        const by = lerp(traj.y(k), traj.y(k + 1), t);
        const foot = g.partCircle('foot');
        const dx = bx - foot.x;
        const dy = by - foot.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= r2) continue;
        const d = Math.sqrt(d2);
        const nx = d > PHYSICS.epsilon ? dx / d : 1;
        const ny = d > PHYSICS.epsilon ? dy / d : 0;
        return {
          contactTick: k,
          swingFactor: g.swingFactor,
          nx,
          ny,
          playerVx: g.vx,
          playerVy: g.vy,
          ballX: bx,
          ballY: by,
          ballVx: traj.vx(k),
          ballVy: traj.vy(k),
        };
      }
    }
    return null;
  }
}
