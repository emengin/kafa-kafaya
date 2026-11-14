/** Uçan cisim (top) için yerçekimi, hava direnci ve Magnus (falso) entegrasyonu. */

export interface BallisticBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Görsel dönüş açısı (rad). */
  angle: number;
  /** Açısal hız (rad/sn); ekranda saat yönü pozitif. */
  angVel: number;
}

export interface BallisticParams {
  readonly gravity: number;
  /** a = −(linearDrag + quadraticDrag·|v|)·v */
  readonly linearDrag: number;
  readonly quadraticDrag: number;
  /** a = magnus·ω·⊥v, ⊥v = (−vy, vx) */
  readonly magnus: number;
  /** ω her saniye e^(−spinDamping) ile çarpılır. */
  readonly spinDamping: number;
}

/**
 * Yarı-örtük Euler ile bir alt adım ilerletir (önce hız, sonra konum).
 *
 * Magnus işareti (y aşağı, saat yönü pozitif): sağa giden topta üst yüzey öne dönüyorsa
 * (ω > 0, "topspin") ivme aşağı; geri dönüşte (ω < 0, "backspin") yukarı (kaldırma).
 */
export function integrateBallistic(b: BallisticBody, p: BallisticParams, h: number): void {
  const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
  const drag = p.linearDrag + p.quadraticDrag * speed;
  const ax = -drag * b.vx - p.magnus * b.angVel * b.vy;
  const ay = p.gravity - drag * b.vy + p.magnus * b.angVel * b.vx;
  b.vx += ax * h;
  b.vy += ay * h;
  b.angVel *= Math.exp(-p.spinDamping * h);
  b.x += b.vx * h;
  b.y += b.vy * h;
  b.angle += b.angVel * h;
}
