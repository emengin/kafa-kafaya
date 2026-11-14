import { DISPLAY, PITCH } from '../config/gameConfig';
import { makeRect, makeSegment, type Material, type Rect, type Segment } from '../physics';
import type { PlayerIndex } from './types';

/** Bir kale. Sol kaleyi P1 (0), sağ kaleyi P2 (1) savunur. */
export interface GoalDef {
  /** Bu kaleyi savunan oyuncu. Top buraya girerse rakip gol atmış olur. */
  readonly defender: PlayerIndex;
  /** Kale çizgisinin x'i (ağ ile saha arasındaki sınır). */
  readonly lineX: number;
  /** Sahaya doğru x yönü (+1 sol kale, −1 sağ kale). */
  readonly fieldDirection: 1 | -1;
  /** Katı üst direk. */
  readonly crossbar: Rect;
  /** Ağ bölgesi: üst direğin altı, kale çizgisi ile duvar arası. */
  readonly net: Rect;
  /** Üst direğin üstündeki bekleme bölgesi (top merkezi burada kalırsa itilir). */
  readonly restZone: Rect;
  /**
   * Zeminden üst direğin alt yüzüne yükseklik (px). "Rakip Kalesini Büyüt" güçlendiricisiyle
   * değişir; değiştirmek için `setGoalMouthHeight` (dikdörtgenler yerinde güncellenir).
   */
  readonly mouthHeight: number;
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * Kale ağzının yüksekliğini değiştirir: üst direk, ağ ve bekleme bölgesi yerinde güncellenir
 * (saha çarpışma listesi aynı dikdörtgen nesnesini kullandığı için ayrıca güncelleme gerekmez).
 */
export function setGoalMouthHeight(goal: GoalDef, mouthHeight: number): void {
  if (goal.mouthHeight === mouthHeight) return;
  const { groundY, goal: cfg } = PITCH;
  const crossbarBottom = groundY - mouthHeight;
  const crossbarTop = crossbarBottom - cfg.crossbarThickness;
  const bar = goal.crossbar as Mutable<Rect>;
  bar.minY = crossbarTop;
  bar.maxY = crossbarBottom;
  const net = goal.net as Mutable<Rect>;
  net.minY = crossbarBottom;
  const zone = goal.restZone as Mutable<Rect>;
  zone.minY = crossbarTop - cfg.restZoneHeight;
  zone.maxY = crossbarTop;
  (goal as Mutable<GoalDef>).mouthHeight = mouthHeight;
}

export type StaticKind = 'ground' | 'wall' | 'ceiling' | 'crossbar';

export type StaticCollider =
  | {
      readonly type: 'segment';
      readonly kind: StaticKind;
      readonly shape: Segment;
      readonly material: Material;
    }
  | {
      readonly type: 'rect';
      readonly kind: StaticKind;
      readonly shape: Rect;
      readonly material: Material;
    };

export interface Pitch {
  readonly width: number;
  readonly height: number;
  readonly groundY: number;
  readonly ceilingY: number;
  /**
   * Statik çarpışma geometrisi, çözülme sırasıyla: önce üst direkler, sonra saha sınırları.
   * Sınırlar en son çözüldüğü için bir adımın sonunda hiçbir cisim sahanın dışında kalamaz.
   */
  readonly colliders: readonly StaticCollider[];
  /** [sol kale (P1), sağ kale (P2)] */
  readonly goals: readonly [GoalDef, GoalDef];
}

function makeGoal(defender: PlayerIndex, width: number): GoalDef {
  const { goal, groundY } = PITCH;
  const crossbarBottom = groundY - goal.mouthHeight;
  const crossbarTop = crossbarBottom - goal.crossbarThickness;
  const isLeft = defender === 0;
  const backX = isLeft ? 0 : width - goal.depth;
  // Bekleme bölgesi sahaya doğru taşar: direğin ön köşesinde dengede duran top da itilir.
  const zoneWidth = goal.depth + goal.restZoneOverhang;
  const zoneX = isLeft ? 0 : width - zoneWidth;
  return {
    defender,
    lineX: isLeft ? goal.depth : width - goal.depth,
    fieldDirection: isLeft ? 1 : -1,
    crossbar: makeRect(backX, crossbarTop, goal.depth, goal.crossbarThickness),
    net: makeRect(backX, crossbarBottom, goal.depth, goal.mouthHeight),
    restZone: makeRect(zoneX, crossbarTop - goal.restZoneHeight, zoneWidth, goal.restZoneHeight),
    mouthHeight: goal.mouthHeight,
  };
}

/** Saha geometrisini gameConfig değerlerinden kurar. */
export function createPitch(): Pitch {
  const width = DISPLAY.width;
  const { groundY, ceilingY, boundaryOverhang: o, materials } = PITCH;
  const goals: readonly [GoalDef, GoalDef] = [makeGoal(0, width), makeGoal(1, width)];

  // Tek yüzlü parçalar: ön yüz a→b yönünde sol eldedir (bkz. shapes.ts).
  const colliders: StaticCollider[] = [
    ...goals.map((g): StaticCollider => ({
      type: 'rect',
      kind: 'crossbar',
      shape: g.crossbar,
      material: materials.crossbar,
    })),
    {
      type: 'segment',
      kind: 'ground',
      shape: makeSegment(-o, groundY, width + o, groundY, true),
      material: materials.ground,
    },
    {
      type: 'segment',
      kind: 'wall',
      shape: makeSegment(0, ceilingY - o, 0, groundY + o, true),
      material: materials.wall,
    },
    {
      type: 'segment',
      kind: 'wall',
      shape: makeSegment(width, groundY + o, width, ceilingY - o, true),
      material: materials.wall,
    },
    {
      type: 'segment',
      kind: 'ceiling',
      shape: makeSegment(width + o, ceilingY, -o, ceilingY, true),
      material: materials.ceiling,
    },
  ];

  return { width, height: DISPLAY.height, groundY, ceilingY, colliders, goals };
}
