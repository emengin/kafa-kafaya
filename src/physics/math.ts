/** Fizik modülünün küçük, saf matematik yardımcıları (Phaser'dan bağımsız). */

export interface Vec2 {
  x: number;
  y: number;
}

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** `current` değerini `target`'a en fazla `maxDelta` kadar yaklaştırır (taşmadan). */
export function moveToward(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(current + maxDelta, target);
  return Math.max(current - maxDelta, target);
}

export function length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

/** 2B vektörel çarpım (z bileşeni): a.x·b.y − a.y·b.x. */
export function cross(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}
