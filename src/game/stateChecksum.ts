import { POWER_UP_TYPES } from './entities/Player';
import type { FieldBag, SimState } from './simState';

/**
 * Kanonik durum özeti (Faz 2.7, checksum). Online maçta iki istemcinin aynı adımda aynı duruma
 * vardığını doğrulamak (desync tespiti, Faz 9.2; periyodik checksum, Faz 9.3) ve çapraz motor
 * testinde (Faz 2.7b) her karenin durumunu karşılaştırmak için.
 *
 * Kanonik serileştirme (`JSON.stringify` değil):
 * - **Alan sırası sabit:** aşağıdaki listeler sırayla gezilir; nesnenin anahtar sırasına (nesnenin
 *   nasıl kurulduğuna) bakılmaz. Player/Ball'a alan eklenince liste de güncellenmeli —
 *   stateChecksum.test.ts listenin `saveState`'in kopyaladığı alanlarla birebir aynı olduğunu
 *   zorlar.
 * - **Sayılar ikili:** IEEE 754 Float64'ün 8 baytı, küçük uçlu (DataView, açık bayt sırası). −0 ile
 *   0 farklı özet verir (ileride 1/x gibi işlemlerle ayrışabilirler); NaN tek bir kanonik bit
 *   desenine çevrilir (motorlar NaN'ın yük bitlerini farklı yazabilir).
 * - **Tür etiketi:** her değerin önüne türü yazılır (sayı, false, true, null, metin): `null` ile
 *   `0` ya da metin ile sayı karışmaz. Metinler uzunluk + UTF-16 kod birimleri.
 *
 * Karma: 32 bitlik sözcükler iki bağımsız 32 bit karmaya (MurmurHash3 ve xxHash32 turları)
 * beslenir → 64 bit, 16 onaltılık hane. Yalnızca tam sayı işlemleri (`Math.imul`, kaydırma):
 * her motorda aynı. Kriptografik değildir (kasıtlı çakışmaya karşı koruma sağlamaz).
 */

/** Biçim sürümü: serileştirme değişirse artırılır (eski özetlerle karışmasın). */
const FORMAT_VERSION = 1;

/** Oyuncu alanları, sabit sıra. `powerUps` alt nesnesi `POWER_UP_TYPES` sırasıyla. */
export const PLAYER_FIELDS = [
  'index',
  'facing',
  'x',
  'y',
  'vx',
  'vy',
  'angVel',
  'invInertia',
  'headScale',
  'speedScale',
  'doubleJumpEnabled',
  'airJumpUsed',
  'frozenTimer',
  'freezeImmunity',
  'jumpLockTimer',
  'powerUps',
  'grounded',
  'groundedThisStep',
  'coyoteTimer',
  'jumpBufferTimer',
  'jumping',
  'prevJump',
  'prevKick',
  'kickPhase',
  'kickTimer',
  'kickBufferTimer',
  'kickHitDone',
  'footAngle',
  'footAngVel',
  'power',
  'superArmed',
  'prevSuper',
  'touchCooldown',
] as const;

/** Top (ve yanılsama topu) alanları, sabit sıra. */
export const BALL_FIELDS = [
  'x',
  'y',
  'vx',
  'vy',
  'angle',
  'angVel',
  'invInertia',
  'grounded',
  'crossbarTimer',
  'lastTouch',
  'touches',
  'impactSpeed',
  'impactKind',
  'impactX',
  'impactY',
  'superType',
  'superOwner',
  'superTime',
  'superDir',
  'phased',
  'phaseDone',
  'radius',
  'scale',
] as const;

/** Balon alanları, sabit sıra. */
export const BALLOON_FIELDS = ['type', 'cx', 'cy', 'phase', 'age'] as const;

const TAG_NUMBER = 1;
const TAG_FALSE = 2;
const TAG_TRUE = 3;
const TAG_NULL = 4;
const TAG_STRING = 5;
const TAG_MISSING = 6;
const TAG_OBJECT = 7;

/** Kanonik NaN (0x7ff8000000000000): üst ve alt 32 bit. */
const NAN_HI = 0x7ff80000;
const NAN_LO = 0;

// MurmurHash3 (x86, 32 bit) sabitleri.
const M_C1 = 0xcc9e2d51;
const M_C2 = 0x1b873593;
const M_R1 = 15;
const M_R2 = 13;
const M_MUL = 5;
const M_ADD = 0xe6546b64;
const M_F1 = 0x85ebca6b;
const M_F2 = 0xc2b2ae35;
const M_S1 = 16;
const M_S2 = 13;
// xxHash32 sabitleri.
const X_P1 = 0x9e3779b1;
const X_P2 = 0x85ebca77;
const X_P3 = 0xc2b2ae3d;
const X_R = 13;
const X_S1 = 15;
const X_S2 = 13;
const X_S3 = 16;
/** İki karmanın tohumları (keyfi, sabit). */
const SEED_A = 0x4b414641; // "KAFA"
const SEED_B = 0x2e372e61; // ".7.a"
const WORD_BITS = 32;
const WORD_BYTES = 4;
const FLOAT64_BYTES = 8;
const HEX = 16;
const HEX_DIGITS = 8;

function rotl(x: number, r: number): number {
  return (x << r) | (x >>> (WORD_BITS - r));
}

/** Durumu 32 bitlik sözcüklere çevirip iki karmaya besleyen yazıcı (ayırma yapmaz). */
class Hasher {
  private h1 = 0;
  private h2 = 0;
  private words = 0;
  private readonly view = new DataView(new ArrayBuffer(FLOAT64_BYTES));

  reset(): void {
    this.h1 = SEED_A;
    this.h2 = SEED_B;
    this.words = 0;
  }

  word(k: number): void {
    let m = Math.imul(k, M_C1);
    m = rotl(m, M_R1);
    m = Math.imul(m, M_C2);
    this.h1 ^= m;
    this.h1 = rotl(this.h1, M_R2);
    this.h1 = (Math.imul(this.h1, M_MUL) + M_ADD) | 0;
    this.h2 = Math.imul(rotl((this.h2 + Math.imul(k, X_P2)) | 0, X_R), X_P1);
    this.words++;
  }

  number(v: number): void {
    this.word(TAG_NUMBER);
    if (v !== v) {
      this.word(NAN_LO);
      this.word(NAN_HI);
      return;
    }
    this.view.setFloat64(0, v, true);
    this.word(this.view.getUint32(0, true));
    this.word(this.view.getUint32(WORD_BYTES, true));
  }

  string(s: string): void {
    this.word(TAG_STRING);
    this.word(s.length);
    for (let i = 0; i < s.length; i++) this.word(s.charCodeAt(i));
  }

  value(v: unknown): void {
    if (typeof v === 'number') this.number(v);
    else if (v === false) this.word(TAG_FALSE);
    else if (v === true) this.word(TAG_TRUE);
    else if (v === null) this.word(TAG_NULL);
    else if (typeof v === 'string') this.string(v);
    else if (v === undefined) this.word(TAG_MISSING);
    else this.word(TAG_OBJECT); // şemada olmayan bir nesne: içeriği yazılmaz
  }

  fields(bag: FieldBag, names: readonly string[]): void {
    for (const name of names) {
      if (name === 'powerUps') this.powerUps(bag[name]);
      else this.value(bag[name]);
    }
  }

  private powerUps(v: unknown): void {
    if (v === null || typeof v !== 'object') {
      this.value(v);
      return;
    }
    const timers = v as FieldBag;
    for (const type of POWER_UP_TYPES) this.value(timers[type]);
  }

  /** 16 onaltılık hane: [Murmur3 | xxHash32] son karıştırmalarıyla. */
  digest(): string {
    let a = this.h1 ^ (this.words * WORD_BYTES);
    a ^= a >>> M_S1;
    a = Math.imul(a, M_F1);
    a ^= a >>> M_S2;
    a = Math.imul(a, M_F2);
    a ^= a >>> M_S1;
    let b = (this.h2 + this.words * WORD_BYTES) | 0;
    b ^= b >>> X_S1;
    b = Math.imul(b, X_P2);
    b ^= b >>> X_S2;
    b = Math.imul(b, X_P3);
    b ^= b >>> X_S3;
    return hex(a) + hex(b);
  }
}

function hex(v: number): string {
  return (v >>> 0).toString(HEX).padStart(HEX_DIGITS, '0');
}

const hasher = new Hasher();

/**
 * `GameSim.saveState` durumunun kanonik özeti (16 onaltılık hane). Aynı durum her JS motorunda
 * aynı özeti verir; durumun herhangi bir alanındaki tek bit fark özeti değiştirir.
 */
export function stateChecksum(s: SimState): string {
  const h = hasher;
  h.reset();
  h.word(FORMAT_VERSION);
  h.number(s.tick);
  const m = s.match;
  h.string(m.phase);
  h.value(m.overtime);
  h.number(m.timeLeft);
  h.number(m.phaseTime);
  h.number(m.score[0]);
  h.number(m.score[1]);
  h.number(m.lastScorer);
  h.value(m.winner);
  h.value(m.endReason);
  h.fields(s.players[0], PLAYER_FIELDS);
  h.fields(s.players[1], PLAYER_FIELDS);
  h.fields(s.ball, BALL_FIELDS);
  h.number(s.decoys.length);
  for (const d of s.decoys) {
    h.fields(d.ball, BALL_FIELDS);
    h.number(d.ttl);
  }
  if (s.balloon) h.fields(s.balloon as unknown as FieldBag, BALLOON_FIELDS);
  else h.word(TAG_NULL);
  h.number(s.balloonTimer);
  h.number(s.goalMouths[0]);
  h.number(s.goalMouths[1]);
  h.number(s.rngState);
  h.value(s.solo);
  return h.digest();
}
