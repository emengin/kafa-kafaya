import { LOOP } from '../config/gameConfig';
import { FixedStepLoop } from './FixedStepLoop';

/** Oyunun standart 60 Hz sabit adımlı döngüsünü gameConfig değerleriyle kurar. */
export function createGameLoop(): FixedStepLoop {
  return new FixedStepLoop({
    stepSeconds: 1 / LOOP.stepHz,
    maxFrameSeconds: LOOP.maxFrameSeconds,
    maxStepsPerFrame: LOOP.maxStepsPerFrame,
    epsilonSeconds: LOOP.epsilonSeconds,
  });
}
