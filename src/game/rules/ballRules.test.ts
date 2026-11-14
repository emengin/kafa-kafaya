import { describe, expect, it } from 'vitest';
import { BALL } from '../../config/gameConfig';
import { createPitch } from '../pitch';
import { isBallInGoal, isBallOnCrossbar } from './ballRules';

const pitch = createPitch();
const [left, right] = pitch.goals;
const r = BALL.radius;
const ballAt = (x: number, y: number) => ({ x, y, radius: r });
const floorY = pitch.groundY - r;

describe('isBallInGoal — top kale çizgisini tamamen geçmeli', () => {
  it('sol kale: dairenin sağ kenarı çizgide → gol; 0,001 px taşarsa değil', () => {
    expect(isBallInGoal(ballAt(left.lineX - r, floorY), left)).toBe(true);
    expect(isBallInGoal(ballAt(left.lineX - r + 0.001, floorY), left)).toBe(false);
  });

  it('sağ kale: dairenin sol kenarı çizgide → gol; 0,001 px taşarsa değil', () => {
    expect(isBallInGoal(ballAt(right.lineX + r, floorY), right)).toBe(true);
    expect(isBallInGoal(ballAt(right.lineX + r - 0.001, floorY), right)).toBe(false);
  });

  it('merkezi çizgiyi geçmiş ama dairenin bir kısmı sahada olan top gol değildir', () => {
    expect(isBallInGoal(ballAt(left.lineX - r / 2, floorY), left)).toBe(false);
    expect(isBallInGoal(ballAt(right.lineX + r / 2, floorY), right)).toBe(false);
  });

  it('üst direğin üstündeki top (x kalenin içinde olsa da) gol değildir', () => {
    const onBar = ballAt(left.lineX / 2, left.crossbar.minY - r);
    expect(isBallInGoal(onBar, left)).toBe(false);
    expect(isBallOnCrossbar(onBar, left)).toBe(true);
  });

  it('bir kaleye giren top diğer kale için gol sayılmaz', () => {
    expect(isBallInGoal(ballAt(left.lineX - r - 10, floorY), right)).toBe(false);
    expect(isBallInGoal(ballAt(right.lineX + r + 10, floorY), left)).toBe(false);
  });
});
