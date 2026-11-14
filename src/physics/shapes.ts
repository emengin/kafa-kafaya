/**
 * Çarpışma şekilleri. Koordinatlar ekran uzayındadır: x sağa, y AŞAĞI artar.
 */

/** Daire: merkez + yarıçap. */
export interface Circle {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

/** Eksen hizalı dikdörtgen (AABB). */
export interface Rect {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/**
 * Doğru parçası a→b.
 *
 * `oneSided` ise yalnızca ön yüzü katıdır ve **sonsuz kalın** bir duvar gibi davranır:
 * dairenin merkezi parçanın arkasına geçmiş olsa bile ön yüze geri itilir. Bu, saha
 * sınırlarında tünellemeyi yapısal olarak imkânsız kılar.
 *
 * Ön yüz normali n = (d.y, −d.x) / |d|, d = b − a. Ekranda a'dan b'ye yürürken ön yüz
 * sol eldedir: zemin soldan sağa, sol duvar yukarıdan aşağı, sağ duvar aşağıdan yukarı,
 * tavan sağdan sola tanımlanır.
 */
export interface Segment {
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
  readonly oneSided: boolean;
}

export function makeRect(x: number, y: number, width: number, height: number): Rect {
  return { minX: x, minY: y, maxX: x + width, maxY: y + height };
}

export function makeSegment(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  oneSided = false,
): Segment {
  return { ax, ay, bx, by, oneSided };
}

/** Nokta dikdörtgenin içinde mi (kenarlar dahil)? */
export function pointInRect(x: number, y: number, r: Rect): boolean {
  return x >= r.minX && x <= r.maxX && y >= r.minY && y <= r.maxY;
}
