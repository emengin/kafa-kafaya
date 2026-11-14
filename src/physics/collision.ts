import { PHYSICS } from '../config/gameConfig';
import { clamp } from './math';
import type { Circle, Rect, Segment } from './shapes';

/**
 * Bir temasın geometrisi. Normal (nx, ny) birim vektördür ve **B'den A'ya** bakar:
 * A'yı çakışmadan çıkarmak için A, n yönünde `depth` kadar itilmelidir.
 * Tüm fonksiyonlarda A ilk parametredeki dairedir.
 */
export interface Contact {
  readonly nx: number;
  readonly ny: number;
  readonly depth: number;
}

const EPS = PHYSICS.epsilon;

/** Daire–nokta: nokta dairenin içindeyse noktadan merkeze doğru normal. */
function circleVsPoint(
  c: Circle,
  px: number,
  py: number,
  fallbackNx: number,
  fallbackNy: number,
): Contact | null {
  const dx = c.x - px;
  const dy = c.y - py;
  const d2 = dx * dx + dy * dy;
  if (d2 >= c.radius * c.radius) return null;
  const d = Math.sqrt(d2);
  if (d > EPS) return { nx: dx / d, ny: dy / d, depth: c.radius - d };
  // Merkez tam noktanın üstünde: yön belirsiz, deterministik bir yedek yön kullan.
  return { nx: fallbackNx, ny: fallbackNy, depth: c.radius };
}

/** Daire–daire. Normal b'den a'ya. Merkezler çakışıksa a yukarı itilir. */
export function circleVsCircle(a: Circle, b: Circle): Contact | null {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.radius + b.radius;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  const d = Math.sqrt(d2);
  if (d > EPS) return { nx: dx / d, ny: dy / d, depth: r - d };
  return { nx: 0, ny: -1, depth: r };
}

/**
 * Daire–dikdörtgen (AABB). Merkez dışarıdaysa en yakın noktaya göre (köşeler yuvarlak
 * davranır); merkez içerideyse en yakın kenardan dışarı itilir (eşitlikte öncelik: üst).
 */
export function circleVsRect(c: Circle, r: Rect): Contact | null {
  const inside = c.x > r.minX && c.x < r.maxX && c.y > r.minY && c.y < r.maxY;
  if (!inside) {
    const px = clamp(c.x, r.minX, r.maxX);
    const py = clamp(c.y, r.minY, r.maxY);
    const dx = c.x - px;
    const dy = c.y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 >= c.radius * c.radius) return null;
    const d = Math.sqrt(d2);
    if (d > EPS) return { nx: dx / d, ny: dy / d, depth: c.radius - d };
    // Merkez tam kenarın üzerinde: aşağıdaki "içeride" yoluyla çöz.
  }

  const top = c.y - r.minY;
  const bottom = r.maxY - c.y;
  const left = c.x - r.minX;
  const right = r.maxX - c.x;
  let min = top;
  let nx = 0;
  let ny = -1;
  if (bottom < min) {
    min = bottom;
    ny = 1;
  }
  if (left < min) {
    min = left;
    nx = -1;
    ny = 0;
  }
  if (right < min) {
    min = right;
    nx = 1;
    ny = 0;
  }
  return { nx, ny, depth: min + c.radius };
}

/**
 * Daire–doğru parçası.
 * - İki yüzlü parça: en yakın noktaya göre (uçlar yuvarlak başlık gibi davranır).
 * - Tek yüzlü parça (`oneSided`): parçanın açıklığı içinde merkez nerede olursa olsun ön
 *   yüze itilir (sonsuz kalın duvar); açıklık dışında yalnızca önden uç başlığıyla temas.
 */
export function circleVsSegment(c: Circle, s: Segment): Contact | null {
  const ex = s.bx - s.ax;
  const ey = s.by - s.ay;
  const len2 = ex * ex + ey * ey;
  if (len2 <= EPS) return circleVsPoint(c, s.ax, s.ay, 0, -1);

  const len = Math.sqrt(len2);
  const fnx = ey / len;
  const fny = -ex / len;
  const relX = c.x - s.ax;
  const relY = c.y - s.ay;
  const t = (relX * ex + relY * ey) / len2;

  if (s.oneSided) {
    const dist = relX * fnx + relY * fny;
    if (t >= 0 && t <= 1) {
      if (dist >= c.radius) return null;
      return { nx: fnx, ny: fny, depth: c.radius - dist };
    }
    if (dist < 0) return null;
  }

  const tc = clamp(t, 0, 1);
  return circleVsPoint(c, s.ax + ex * tc, s.ay + ey * tc, fnx, fny);
}
