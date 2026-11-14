import { describe, expect, it } from 'vitest';
import { circleVsCircle, circleVsRect, circleVsSegment, type Contact } from './collision';
import { makeRect, makeSegment, type Circle } from './shapes';

const circle = (x: number, y: number, radius: number): Circle => ({ x, y, radius });

function must(contact: Contact | null): Contact {
  if (contact === null) throw new Error('temas bekleniyordu');
  return contact;
}

function expectContact(contact: Contact | null, nx: number, ny: number, depth: number): void {
  const c = must(contact);
  expect(c.nx).toBeCloseTo(nx, 9);
  expect(c.ny).toBeCloseTo(ny, 9);
  expect(c.depth).toBeCloseTo(depth, 9);
}

describe('circleVsCircle', () => {
  it('çakışmada normal B→A bakar ve derinlik yarıçaplar toplamı − mesafedir', () => {
    expectContact(circleVsCircle(circle(15, 0, 10), circle(0, 0, 10)), 1, 0, 5);
    expectContact(circleVsCircle(circle(0, -12, 10), circle(0, 0, 5)), 0, -1, 3);
    const diag = must(circleVsCircle(circle(6, 8, 10), circle(0, 0, 10)));
    expect(diag.nx).toBeCloseTo(0.6, 9);
    expect(diag.ny).toBeCloseTo(0.8, 9);
    expect(diag.depth).toBeCloseTo(10, 9);
  });

  it('ayrık ve tam teğet dairelerde temas yoktur', () => {
    expect(circleVsCircle(circle(30, 0, 10), circle(0, 0, 10))).toBeNull();
    expect(circleVsCircle(circle(20, 0, 10), circle(0, 0, 10))).toBeNull();
  });

  it('merkezler çakışıksa deterministik olarak yukarı iter', () => {
    expectContact(circleVsCircle(circle(5, 5, 10), circle(5, 5, 4)), 0, -1, 14);
  });
});

describe('circleVsRect', () => {
  const box = makeRect(0, 0, 100, 20); // x 0..100, y 0..20

  it('üstten temas: normal yukarı', () => {
    expectContact(circleVsRect(circle(50, -8, 10), box), 0, -1, 2);
  });

  it('alttan ve yandan temas', () => {
    expectContact(circleVsRect(circle(50, 25, 10), box), 0, 1, 5);
    expectContact(circleVsRect(circle(108, 10, 10), box), 1, 0, 2);
    expectContact(circleVsRect(circle(-9, 10, 10), box), -1, 0, 1);
  });

  it('köşede yuvarlak davranır (çapraz normal)', () => {
    const c = must(circleVsRect(circle(106, -6, 10), box));
    expect(c.nx).toBeCloseTo(Math.SQRT1_2, 9);
    expect(c.ny).toBeCloseTo(-Math.SQRT1_2, 9);
    expect(c.depth).toBeCloseTo(10 - Math.hypot(6, 6), 9);
  });

  it('köşeye yakın ama dışarıda: temas yok', () => {
    expect(circleVsRect(circle(108, -8, 10), box)).toBeNull();
    expect(circleVsRect(circle(50, -10, 10), box)).toBeNull();
  });

  it('merkez içerideyse en yakın kenardan dışarı iter (derinlik = mesafe + yarıçap)', () => {
    expectContact(circleVsRect(circle(50, 4, 10), box), 0, -1, 14);
    expectContact(circleVsRect(circle(50, 17, 10), box), 0, 1, 13);
    expectContact(circleVsRect(circle(97, 10, 10), box), 1, 0, 13);
  });

  it('merkez tam kenar üzerindeyse dışarı doğru iter', () => {
    expectContact(circleVsRect(circle(50, 0, 10), box), 0, -1, 10);
  });
});

describe('circleVsSegment (iki yüzlü)', () => {
  const seg = makeSegment(0, 0, 100, 0);

  it('iki taraftan da temas eder', () => {
    expectContact(circleVsSegment(circle(50, -6, 10), seg), 0, -1, 4);
    expectContact(circleVsSegment(circle(50, 6, 10), seg), 0, 1, 4);
  });

  it('uçlarda yuvarlak başlık gibi davranır', () => {
    expectContact(circleVsSegment(circle(106, 0, 10), seg), 1, 0, 4);
    const c = must(circleVsSegment(circle(-6, -6, 10), seg));
    expect(c.nx).toBeCloseTo(-Math.SQRT1_2, 9);
    expect(c.ny).toBeCloseTo(-Math.SQRT1_2, 9);
  });

  it('uzaktaysa temas yok', () => {
    expect(circleVsSegment(circle(50, 11, 10), seg)).toBeNull();
    expect(circleVsSegment(circle(111, 0, 10), seg)).toBeNull();
  });

  it('eğik parça: normal parçaya diktir', () => {
    const slope = makeSegment(0, 0, 100, 100);
    const c = must(circleVsSegment(circle(60, 40, 20), slope));
    expect(c.nx).toBeCloseTo(Math.SQRT1_2, 9);
    expect(c.ny).toBeCloseTo(-Math.SQRT1_2, 9);
    expect(c.depth).toBeCloseTo(20 - Math.hypot(10, 10), 9);
  });
});

describe('circleVsSegment (tek yüzlü)', () => {
  // Zemin: soldan sağa → ön yüz yukarı (ny = −1).
  const ground = makeSegment(0, 100, 200, 100, true);

  it('ön yüz normali a→b yönünün sol eli', () => {
    expectContact(circleVsSegment(circle(50, 95, 10), ground), 0, -1, 5);
    // Sol duvar yukarıdan aşağı → ön yüz sağa.
    const leftWall = makeSegment(0, 0, 0, 100, true);
    expectContact(circleVsSegment(circle(4, 50, 10), leftWall), 1, 0, 6);
  });

  it('merkez arkaya geçmiş olsa bile ön yüze iter (sonsuz kalın duvar)', () => {
    expectContact(circleVsSegment(circle(50, 130, 10), ground), 0, -1, 40);
    expectContact(circleVsSegment(circle(50, 5000, 10), ground), 0, -1, 4910);
  });

  it('açıklık dışında arkadaysa temas yok, öndeyse uç başlığıyla temas', () => {
    expect(circleVsSegment(circle(-5, 120, 10), ground)).toBeNull();
    const cap = must(circleVsSegment(circle(205, 95, 10), ground));
    expect(cap.nx).toBeCloseTo(Math.SQRT1_2, 9);
    expect(cap.ny).toBeCloseTo(-Math.SQRT1_2, 9);
  });

  it('ön tarafta uzaktaysa temas yok', () => {
    expect(circleVsSegment(circle(50, 89, 10), ground)).toBeNull();
  });
});
