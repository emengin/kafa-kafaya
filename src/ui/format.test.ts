import { describe, expect, it } from 'vitest';
import { displayedSecond, formatClock } from './format';
import { MenuNav } from './menuNav';

describe('formatClock', () => {
  it('dakika:saniye biçiminde, yukarı yuvarlayarak gösterir', () => {
    expect(formatClock(90)).toBe('1:30');
    expect(formatClock(89.99)).toBe('1:30');
    expect(formatClock(60)).toBe('1:00');
    expect(formatClock(59.5)).toBe('1:00');
    expect(formatClock(9.01)).toBe('0:10');
    expect(formatClock(0.01)).toBe('0:01');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(-3)).toBe('0:00');
  });

  it('60 Hz adımlarla biriken kayan nokta hatası bir saniye fazla göstermez', () => {
    let t = 90;
    for (let i = 0; i < 60 * 60; i++) t -= 1 / 60;
    expect(formatClock(t)).toBe('0:30');
    expect(displayedSecond(t)).toBe(30);
  });
});

describe('MenuNav', () => {
  it('uçlarda sarar ve fareyle seçimi kabul eder', () => {
    const nav = new MenuNav(3);
    expect(nav.index).toBe(0);
    expect(nav.prev()).toBe(2);
    expect(nav.next()).toBe(0);
    expect(nav.next()).toBe(1);
    expect(nav.select(2)).toBe(2);
    expect(nav.select(7)).toBe(2);
    expect(nav.select(-1)).toBe(2);
  });

  it('boş menüye izin vermez', () => {
    expect(() => new MenuNav(0)).toThrow(RangeError);
  });
});
