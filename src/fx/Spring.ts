/**
 * Sönümlü yay (yarı örtük Euler): squash & stretch, ölçek "pop"ları ve yumuşak geri dönüşler
 * için. `value` hedefe yaylanarak yaklaşır; `kick` ile anlık hız verilir.
 */
export class Spring {
  value = 0;
  velocity = 0;

  constructor(
    private readonly stiffness: number,
    private readonly damping: number,
  ) {}

  kick(impulse: number): void {
    this.velocity += impulse;
  }

  update(dt: number, target = 0): number {
    if (dt <= 0) return this.value;
    const a = -this.stiffness * (this.value - target) - this.damping * this.velocity;
    this.velocity += a * dt;
    this.value += this.velocity * dt;
    return this.value;
  }

  reset(value = 0): void {
    this.value = value;
    this.velocity = 0;
  }
}

/** Üstel yaklaşma: `current` her saniye `rate` hızıyla `target`'a yaklaşır (kare hızından bağımsız). */
export function approach(current: number, target: number, rate: number, dt: number): number {
  return target + (current - target) * Math.exp(-rate * dt);
}
