import { describe, expect, it } from 'vitest';
import { PHYSICS } from '../config/gameConfig';
import { circleVsRect, circleVsSegment, type Contact } from './collision';
import { makeRect, makeSegment, type Rect, type Segment } from './shapes';
import { resolveContact, type ContactBody } from './solver';
import { computeSubSteps } from './substeps';

const DT = 1 / 60;
const R = 22;
/** Çözücü kasıtlı olarak `penetrationSlop` kadar çakışma bırakır (titreme önleme). */
const TOL = PHYSICS.penetrationSlop + 1e-9;

type Obstacle = { kind: 'segment'; shape: Segment } | { kind: 'rect'; shape: Rect };

interface TestBall extends ContactBody {
  readonly radius: number;
}

function ball(x: number, y: number, vx: number, vy: number): TestBall {
  return { x, y, vx, vy, angVel: 0, invMass: 1, invInertia: 0, radius: R };
}

function collide(b: TestBall, o: Obstacle): Contact | null {
  return o.kind === 'segment' ? circleVsSegment(b, o.shape) : circleVsRect(b, o.shape);
}

/** Yerçekimsiz, hız sınırı olmadan, uyarlamalı alt adımla ilerletir; her alt adımı izler. */
function run(
  b: TestBall,
  obstacles: readonly Obstacle[],
  steps: number,
  check: (b: TestBall) => void,
): void {
  for (let s = 0; s < steps; s++) {
    const speed = Math.hypot(b.vx, b.vy);
    const n = computeSubSteps(speed, DT, PHYSICS);
    const h = DT / n;
    for (let i = 0; i < n; i++) {
      b.x += b.vx * h;
      b.y += b.vy * h;
      for (const o of obstacles) {
        const c = collide(b, o);
        if (c) resolveContact(b, R, null, 0, c, { restitution: 1, friction: 0 }, PHYSICS);
      }
      check(b);
    }
  }
}

describe('computeSubSteps', () => {
  it('yavaş cisimlerde en az alt adım sayısını kullanır', () => {
    expect(computeSubSteps(0, DT, PHYSICS)).toBe(PHYSICS.subSteps);
    expect(computeSubSteps(500, DT, PHYSICS)).toBe(PHYSICS.subSteps);
  });

  it('hız arttıkça alt adım sayısı artar; bir alt adımdaki yol sınırı aşmaz', () => {
    for (const speed of [3000, 7000, 12000, 25000]) {
      const n = computeSubSteps(speed, DT, PHYSICS);
      expect((speed * DT) / n).toBeLessThanOrEqual(PHYSICS.maxTravelPerSubStep);
    }
  });

  it('üst sınırı ve sonsuz hızı güvenle karşılar', () => {
    expect(computeSubSteps(1e9, DT, PHYSICS)).toBe(PHYSICS.maxSubSteps);
    expect(computeSubSteps(Number.POSITIVE_INFINITY, DT, PHYSICS)).toBe(PHYSICS.maxSubSteps);
  });
});

describe('tünelleme yok', () => {
  it('tek yüzlü duvar: 1.000.000 px/sn top bile duvarın içinden geçmez', () => {
    // Sol duvar x = 0, ön yüz sağa.
    const wall: Obstacle = { kind: 'segment', shape: makeSegment(0, -5000, 0, 5000, true) };
    for (const speed of [2000, 20000, 200000, 1000000]) {
      const b = ball(300, 0, -speed, 0);
      run(b, [wall], 30, (x) => {
        expect(x.x).toBeGreaterThanOrEqual(R - TOL);
      });
    }
  });

  it('köşeye çapraz atılan çok hızlı top sahadan çıkmaz', () => {
    const box: Obstacle[] = [
      { kind: 'segment', shape: makeSegment(-1000, 600, 2000, 600, true) }, // zemin
      { kind: 'segment', shape: makeSegment(0, -1000, 0, 1600, true) }, // sol duvar
      { kind: 'segment', shape: makeSegment(1000, 1600, 1000, -1000, true) }, // sağ duvar
      { kind: 'segment', shape: makeSegment(2000, 0, -1000, 0, true) }, // tavan
    ];
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + 0.1;
      const b = ball(500, 300, Math.cos(a) * 150000, Math.sin(a) * 150000);
      run(b, box, 20, (x) => {
        expect(x.x).toBeGreaterThanOrEqual(R - TOL);
        expect(x.x).toBeLessThanOrEqual(1000 - R + TOL);
        expect(x.y).toBeGreaterThanOrEqual(R - TOL);
        expect(x.y).toBeLessThanOrEqual(600 - R + TOL);
      });
    }
  });

  it('ince üst direk (12 px): 50.000 px/sn top içinden geçmez, merkezi hiç içine girmez', () => {
    const bar = makeRect(0, 400, 200, 12);
    const obstacle: Obstacle = { kind: 'rect', shape: bar };
    for (const [vx, vy] of [
      [0, 50000],
      [0, -50000],
      [20000, 45000],
      [-3000, 2000],
    ] as const) {
      const fromAbove = vy > 0;
      const b = ball(100 - vx * 0.002, fromAbove ? 300 : 520, vx, vy);
      run(b, [obstacle], 3, (x) => {
        const centerInside = x.x > bar.minX && x.x < bar.maxX && x.y > bar.minY && x.y < bar.maxY;
        expect(centerInside).toBe(false);
        // Direğin altından/üstünden geçmedi: hâlâ başladığı tarafta (x açıklığı içindeyken).
        if (x.x > bar.minX && x.x < bar.maxX) {
          if (fromAbove) expect(x.y).toBeLessThan(bar.minY);
          else expect(x.y).toBeGreaterThan(bar.maxY);
        }
      });
    }
  });
});
