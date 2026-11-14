import { describe, expect, it } from 'vitest';
import { resolveContact, type ContactBody, type Material, type SolverOptions } from './solver';

const OPTS: SolverOptions = { restingSpeed: 45, penetrationSlop: 0, epsilon: 1e-9 };
const FRICTIONLESS = (restitution: number): Material => ({ restitution, friction: 0 });

function body(over: Partial<ContactBody> = {}): ContactBody {
  return { x: 0, y: 0, vx: 0, vy: 0, angVel: 0, invMass: 1, invInertia: 0, ...over };
}

/** Top: r = 22, m = 1, I = 2/3·m·r². */
const R = 22;
const BALL_INV_INERTIA = 1 / ((2 / 3) * R * R);

describe('resolveContact — statik yüzey', () => {
  it('sekme katsayısıyla yansır ve çakışmayı giderir', () => {
    const ball = body({ y: 100, vy: 500 });
    const r = resolveContact(
      ball,
      R,
      null,
      0,
      { nx: 0, ny: -1, depth: 3 },
      FRICTIONLESS(0.6),
      OPTS,
    );
    expect(ball.vy).toBeCloseTo(-300, 9);
    expect(ball.y).toBeCloseTo(97, 9);
    expect(r.approachSpeed).toBeCloseTo(500, 9);
    expect(r.impulse).toBeCloseTo(800, 9);
  });

  it('dinlenme hızının altında sekmez (titreme yok)', () => {
    const ball = body({ vy: 20 });
    resolveContact(ball, R, null, 0, { nx: 0, ny: -1, depth: 0.1 }, FRICTIONLESS(0.9), OPTS);
    expect(ball.vy).toBe(0);
  });

  it('zaten ayrılan cisme impuls uygulamaz, yalnızca çakışmayı giderir', () => {
    const ball = body({ y: 50, vy: -200 });
    const r = resolveContact(
      ball,
      R,
      null,
      0,
      { nx: 0, ny: -1, depth: 2 },
      FRICTIONLESS(0.6),
      OPTS,
    );
    expect(ball.vy).toBe(-200);
    expect(ball.y).toBe(48);
    expect(r.impulse).toBe(0);
  });

  it('sonsuz kütleli iki cisim arasında hiçbir şey değişmez', () => {
    const a = body({ invMass: 0, vx: 10 });
    const before = { ...a };
    resolveContact(a, 10, null, 0, { nx: 1, ny: 0, depth: 5 }, FRICTIONLESS(1), OPTS);
    expect(a).toEqual(before);
  });
});

describe('resolveContact — iki dinamik cisim', () => {
  it('eşit kütle, tam esnek, kafa kafaya: hızlar takas edilir', () => {
    const a = body({ x: 15, vx: -100 });
    const b = body({ x: 0, vx: 100 });
    resolveContact(a, 10, b, 10, { nx: 1, ny: 0, depth: 5 }, FRICTIONLESS(1), OPTS);
    expect(a.vx).toBeCloseTo(100, 9);
    expect(b.vx).toBeCloseTo(-100, 9);
    // Çakışma eşit paylaştırılır.
    expect(a.x).toBeCloseTo(17.5, 9);
    expect(b.x).toBeCloseTo(-2.5, 9);
  });

  it('çakışma ve impuls ters kütle oranında paylaştırılır', () => {
    const light = body({ x: 15, vx: -110, invMass: 1 });
    const heavy = body({ x: 0, vx: 0, invMass: 0.1 });
    resolveContact(light, 10, heavy, 10, { nx: 1, ny: 0, depth: 11 }, FRICTIONLESS(0), OPTS);
    expect(light.x).toBeCloseTo(25, 9);
    expect(heavy.x).toBeCloseTo(-1, 9);
    // Plastik çarpışma: ortak hız = momentum / toplam kütle = (−110·1) / 11 = −10.
    expect(light.vx).toBeCloseTo(-10, 9);
    expect(heavy.vx).toBeCloseTo(-10, 9);
    // Momentum korunur.
    expect(light.vx / light.invMass + heavy.vx / heavy.invMass).toBeCloseTo(-110, 9);
  });
});

describe('resolveContact — sürtünme ve dönüş', () => {
  it('yerde kayan top saat yönünde dönmeye başlar ve yavaşlar (Coulomb sınırlı)', () => {
    const ball = body({ vx: 300, vy: 100, invInertia: BALL_INV_INERTIA });
    const mu = 0.4;
    resolveContact(
      ball,
      R,
      null,
      0,
      { nx: 0, ny: -1, depth: 0 },
      { restitution: 0, friction: mu },
      OPTS,
    );
    expect(ball.angVel).toBeGreaterThan(0);
    expect(ball.vx).toBeLessThan(300);
    // jn = 100 (e = 0) → yatay hız en fazla μ·jn = 40 azalabilir.
    expect(300 - ball.vx).toBeCloseTo(mu * 100, 9);
  });

  it('sürtünme yeterliyse temas noktası kaymaz: v = ω·r (yuvarlanma)', () => {
    const ball = body({ vx: 300, vy: 100, invInertia: BALL_INV_INERTIA });
    resolveContact(
      ball,
      R,
      null,
      0,
      { nx: 0, ny: -1, depth: 0 },
      { restitution: 0, friction: 50 },
      OPTS,
    );
    expect(ball.vx).toBeCloseTo(ball.angVel * R, 6);
    // İçi boş küre: v' = v / (1 + k), k = 2/3 → 180.
    expect(ball.vx).toBeCloseTo(180, 6);
  });

  it('dönen top yere düşünce dönüşü yatay hıza dönüşür', () => {
    const ball = body({ vx: 0, vy: 200, angVel: -20, invInertia: BALL_INV_INERTIA });
    resolveContact(
      ball,
      R,
      null,
      0,
      { nx: 0, ny: -1, depth: 0 },
      { restitution: 0.5, friction: 1 },
      OPTS,
    );
    // Saat yönü tersine dönen (ω < 0) top, alt yüzeyi sağa sürttüğü için sola fırlar.
    expect(ball.vx).toBeLessThan(0);
    expect(Math.abs(ball.angVel)).toBeLessThan(20);
  });
});
