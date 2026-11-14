import { mergeInputs, type InputSource, type InputState } from './InputState';

/**
 * Birden çok girdi kaynağını tek oyuncuya bağlar (mantıksal VEYA). CPU modunda tek insan
 * oyuncu hem A/D/W/Space/Sol Shift hem de oklar/Enter/Sağ Shift ile oynayabilir; ileride
 * klavye + gamepad + dokunmatik de böyle birleşir.
 */
export class MergedInputSource implements InputSource {
  private readonly sources: readonly InputSource[];

  constructor(...sources: readonly InputSource[]) {
    this.sources = sources;
  }

  read(tick: number): InputState {
    let state: InputState | null = null;
    for (const source of this.sources) {
      const next = source.read(tick);
      state = state ? mergeInputs(state, next) : next;
    }
    if (!state) throw new Error('MergedInputSource en az bir kaynak gerektirir');
    return state;
  }
}
