import { pointInRect, type Circle } from '../../physics';
import type { GoalDef } from '../pitch';

/**
 * Gol kuralı: top kale çizgisini **tamamen** geçmiş (dairenin tamamı ağ tarafında) ve
 * merkezi üst direğin altında olmalı. Üst direğin üstünde duran top gol sayılmaz.
 */
export function isBallInGoal(ball: Circle, goal: GoalDef): boolean {
  const belowCrossbar = ball.y > goal.crossbar.maxY;
  if (!belowCrossbar) return false;
  return goal.fieldDirection === 1
    ? ball.x + ball.radius <= goal.lineX
    : ball.x - ball.radius >= goal.lineX;
}

/** Top merkezi bu kalenin üst direği üstündeki bekleme bölgesinde mi? */
export function isBallOnCrossbar(ball: Circle, goal: GoalDef): boolean {
  return pointInRect(ball.x, ball.y, goal.restZone);
}
