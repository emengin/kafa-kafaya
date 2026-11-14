import { EMPTY_INPUT, type InputSource, type InputState } from './InputState';

/**
 * Önceden kaydedilmiş bir girdi dizisini adım adım oynatır (testler ve gol tekrarı).
 * Dizi bitince boş girdi döner.
 */
export class ScriptedInputSource implements InputSource {
  constructor(private readonly frames: readonly InputState[]) {}

  read(tick: number): InputState {
    return this.frames[tick] ?? EMPTY_INPUT;
  }
}
