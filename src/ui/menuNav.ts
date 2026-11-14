/**
 * Dikey menüde seçim mantığı (Phaser'dan bağımsız). Yukarı/aşağı uçlarda başa/sona sarar.
 */
export class MenuNav {
  private current = 0;

  constructor(readonly count: number) {
    if (!Number.isInteger(count) || count < 1) throw new RangeError('count ≥ 1 olmalı');
  }

  get index(): number {
    return this.current;
  }

  next(): number {
    this.current = (this.current + 1) % this.count;
    return this.current;
  }

  prev(): number {
    this.current = (this.current - 1 + this.count) % this.count;
    return this.current;
  }

  /** Fareyle üzerine gelinen öğeyi seçer; aralık dışı değerler yok sayılır. */
  select(index: number): number {
    if (Number.isInteger(index) && index >= 0 && index < this.count) this.current = index;
    return this.current;
  }
}
