import type { Contact } from './collision';

/**
 * Çözücünün üzerinde çalıştığı cisim görünümü. Top, oyuncular ve (dolaylı olarak) oyuncu
 * parçaları bu arayüzü sağlar. Dönmeyen cisimlerde `invInertia = 0`.
 *
 * Varsayım: dönen cisimlerde çarpışma dairesinin merkezi cismin kütle merkezidir (top).
 * Oyuncular dönmez, bu yüzden ofsetli parça daireleri (kafa, gövde, ayak) sorun değildir.
 */
export interface ContactBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Açısal hız (rad/sn); ekranda saat yönü pozitif. */
  angVel: number;
  readonly invMass: number;
  readonly invInertia: number;
}

export interface Material {
  /** Sekme katsayısı (0–1). */
  readonly restitution: number;
  /** Coulomb sürtünme katsayısı. */
  readonly friction: number;
}

export interface SolverOptions {
  /** Bu yaklaşma hızının altında sekme uygulanmaz (px/sn). */
  readonly restingSpeed: number;
  /** Pozisyon düzeltmesinde bırakılan tolerans (px). */
  readonly penetrationSlop: number;
  readonly epsilon: number;
}

/**
 * Çözüm sonucu. Paylaşılan tek bir nesnedir (her temasta bellek ayrılmasın, Faz 2.7): bir sonraki
 * `resolveContact` çağrısına kadar geçerlidir; saklamak için kopyalayın.
 */
export interface ContactResult {
  /** Uygulanan normal impuls büyüklüğü (0 = cisimler zaten ayrılıyordu). */
  readonly impulse: number;
  /** Temas anındaki yaklaşma hızı (px/sn, ≥ 0). */
  readonly approachSpeed: number;
}

const shared = { impulse: 0, approachSpeed: 0 };

function result(impulse: number, approachSpeed: number): ContactResult {
  shared.impulse = impulse;
  shared.approachSpeed = approachSpeed;
  return shared;
}

/**
 * Bir teması çözer: (1) çakışmayı ters kütle oranında paylaştırarak giderir, (2) yaklaşma
 * varsa sekme katsayılı normal impuls, (3) Coulomb sınırlı sürtünme impulsu uygular.
 * Sürtünme impulsu, dönen cisimlerde (top) açısal hızı da değiştirir: yerde kayan top
 * yuvarlanmaya başlar, kafaya sürtünen top dönüş kazanır.
 *
 * @param a        Temastaki A cismi (normal B'den A'ya bakar).
 * @param radiusA  A'nın çarpışan dairesinin yarıçapı (dönme kolu için).
 * @param b        B cismi; `null` ise hareketsiz, sonsuz kütleli statik geometri.
 * @param radiusB  B'nin çarpışan dairesinin yarıçapı (statikse 0).
 */
export function resolveContact(
  a: ContactBody,
  radiusA: number,
  b: ContactBody | null,
  radiusB: number,
  contact: Contact,
  material: Material,
  options: SolverOptions,
): ContactResult {
  const invMassA = a.invMass;
  const invMassB = b ? b.invMass : 0;
  const invMassSum = invMassA + invMassB;
  if (invMassSum <= 0) return result(0, 0);
  const { nx, ny } = contact;

  // 1) Pozisyon düzeltmesi: çakışma ters kütle oranında paylaştırılır.
  const correction = Math.max(contact.depth - options.penetrationSlop, 0) / invMassSum;
  a.x += nx * correction * invMassA;
  a.y += ny * correction * invMassA;
  if (b) {
    b.x -= nx * correction * invMassB;
    b.y -= ny * correction * invMassB;
  }

  // Dönme kolları: daire merkezinden temas noktasına.
  const rax = -nx * radiusA;
  const ray = -ny * radiusA;
  const rbx = nx * radiusB;
  const rby = ny * radiusB;
  const invInertiaA = a.invInertia;
  const invInertiaB = b ? b.invInertia : 0;
  const bvx = b ? b.vx : 0;
  const bvy = b ? b.vy : 0;
  const bw = b ? b.angVel : 0;

  // 2) Temas noktasındaki bağıl hız: v + ω × r, ω × r = ω·(−r.y, r.x).
  let rvx = a.vx - a.angVel * ray - (bvx - bw * rby);
  let rvy = a.vy + a.angVel * rax - (bvy + bw * rbx);
  const vn = rvx * nx + rvy * ny;
  if (vn >= 0) return result(0, 0);

  const approachSpeed = -vn;
  const restitution = approachSpeed < options.restingSpeed ? 0 : material.restitution;
  const jn = ((1 + restitution) * approachSpeed) / invMassSum;
  a.vx += nx * jn * invMassA;
  a.vy += ny * jn * invMassA;
  if (b) {
    b.vx -= nx * jn * invMassB;
    b.vy -= ny * jn * invMassB;
  }

  // 3) Sürtünme. Normal impuls bağıl hızın normal bileşenini jn·invMassSum kadar değiştirdi;
  // daire temasında dönme kolu normale paraleldir, açısal hız etkilenmez.
  if (material.friction <= 0) return result(jn, approachSpeed);
  rvx += nx * jn * invMassSum;
  rvy += ny * jn * invMassSum;
  const vnAfter = rvx * nx + rvy * ny;
  const tvx = rvx - vnAfter * nx;
  const tvy = rvy - vnAfter * ny;
  const vt = Math.sqrt(tvx * tvx + tvy * tvy);
  if (vt <= options.epsilon) return result(jn, approachSpeed);

  const tx = tvx / vt;
  const ty = tvy / vt;
  const raCrossT = rax * ty - ray * tx;
  const rbCrossT = rbx * ty - rby * tx;
  const tangentMass =
    invMassSum + raCrossT * raCrossT * invInertiaA + rbCrossT * rbCrossT * invInertiaB;
  // Kaymayı tamamen durduracak impuls, Coulomb konisiyle (μ·jn) sınırlı.
  const jt = Math.min(vt / tangentMass, material.friction * jn);
  const jx = -tx * jt;
  const jy = -ty * jt;
  a.vx += jx * invMassA;
  a.vy += jy * invMassA;
  a.angVel += (rax * jy - ray * jx) * invInertiaA;
  if (b) {
    b.vx -= jx * invMassB;
    b.vy -= jy * invMassB;
    b.angVel -= (rbx * jy - rby * jx) * invInertiaB;
  }
  return result(jn, approachSpeed);
}
