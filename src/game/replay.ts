import { LOOP, REPLAY } from '../config/gameConfig';
import type { InputState } from '../input/InputState';
import type { GameSim } from './GameSim';
import type { SimState } from './simState';

/** Girdi bitleri (oyuncu başına adımda 1 bayt). */
const BIT = { left: 1, right: 2, jump: 4, kick: 8, super: 16 } as const;

export function encodeInput(s: InputState): number {
  return (
    (s.left ? BIT.left : 0) |
    (s.right ? BIT.right : 0) |
    (s.jump ? BIT.jump : 0) |
    (s.kick ? BIT.kick : 0) |
    (s.super ? BIT.super : 0)
  );
}

export interface MutableInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  kick: boolean;
  super: boolean;
}

/** `encodeInput` bitlerini `out` nesnesine çözer (yeni nesne ayırmaz). */
export function decodeInput(bits: number, out: MutableInput): InputState {
  out.left = (bits & BIT.left) !== 0;
  out.right = (bits & BIT.right) !== 0;
  out.jump = (bits & BIT.jump) !== 0;
  out.kick = (bits & BIT.kick) !== 0;
  out.super = (bits & BIT.super) !== 0;
  return out;
}

/** Tekrarın planı: hangi anahtar kareden başlanır, hangi adımda biter. */
export interface ReplayPlan {
  readonly state: SimState;
  readonly startTick: number;
  readonly goalTick: number;
  readonly endTick: number;
}

const secondsToSteps = (s: number): number => Math.round(s * LOOP.stepHz);

/**
 * Gol tekrarı kaydedicisi (Faz 7): fizik durumunun son birkaç saniyesini **halka tamponda**
 * tutar — her `keyframeSteps` adımda bir tam simülasyon durumu (önceden ayrılmış nesnelere
 * kopyalanır, oyun sırasında bellek ayrılmaz) ve her adımın iki oyuncu girdisi (1'er bayt).
 * Simülasyon deterministik olduğundan anahtar kareyi yükleyip kaydedilen girdilerle ilerlemek
 * golü birebir yeniden üretir (olaylar dahil: şut, süper, gol efektleri).
 *
 * Santra (diziliş ışınlaması) bir sınırdır: tekrar santradan öncesine gitmez.
 */
export class ReplayRecorder {
  private readonly capacity: number;
  private readonly inputs: Uint8Array;
  private readonly inputTicks: Int32Array;
  private readonly keyframes: { tick: number; state: SimState | null }[];
  private segmentStart = 0;
  private readonly decoded: [MutableInput, MutableInput] = [
    { left: false, right: false, jump: false, kick: false, super: false },
    { left: false, right: false, jump: false, kick: false, super: false },
  ];

  constructor(private readonly sim: GameSim) {
    this.capacity = secondsToSteps(REPLAY.bufferSeconds);
    this.inputs = new Uint8Array(this.capacity * 2);
    this.inputTicks = new Int32Array(this.capacity).fill(-1);
    const frames = Math.ceil(this.capacity / REPLAY.keyframeSteps) + 1;
    this.keyframes = Array.from({ length: frames }, () => ({ tick: -1, state: null }));
  }

  /**
   * Adımdan **önce** çağrılır: gerekirse anahtar kare alır, adımın girdilerini saklar.
   * @param tick Simülasyonun o anki adımı (`sim.tick`).
   */
  record(tick: number, a: InputState, b: InputState): void {
    if (tick % REPLAY.keyframeSteps === 0) {
      const slot = this.keyframes[(tick / REPLAY.keyframeSteps) % this.keyframes.length];
      if (slot) {
        slot.state = this.sim.saveState(slot.state ?? undefined);
        slot.tick = tick;
      }
    }
    const i = tick % this.capacity;
    this.inputs[i * 2] = encodeInput(a);
    this.inputs[i * 2 + 1] = encodeInput(b);
    this.inputTicks[i] = tick;
  }

  /** Santra/diziliş: tekrar bu adımdan öncesine gitmez. */
  markSegmentStart(tick: number): void {
    this.segmentStart = tick;
  }

  /** Kaydedilmiş girdiler (yoksa null). Dönen nesneler yeniden kullanılır. */
  inputAt(tick: number): readonly [InputState, InputState] | null {
    const i = tick % this.capacity;
    if (tick < 0 || this.inputTicks[i] !== tick) return null;
    const [a, b] = this.decoded;
    decodeInput(this.inputs[i * 2] ?? 0, a);
    decodeInput(this.inputs[i * 2 + 1] ?? 0, b);
    return this.decoded;
  }

  /**
   * Golün tekrar planı: golden en çok `leadSeconds` önceki (ve santradan sonraki) ilk anahtar
   * kare; girdileri tamponda kesintisiz olmalı. Yeterli görüntü yoksa null.
   * @param goalTick Gol olayının üretildiği adım (o adımın girdisi de kayıtlı).
   * @param lastTick Kaydedilmiş son adım.
   */
  plan(goalTick: number, lastTick: number): ReplayPlan | null {
    // Girdileri hâlâ tamponda olan en eski adım, santra ve istenen en uzun öncelik.
    const earliest = Math.max(
      this.segmentStart,
      goalTick - secondsToSteps(REPLAY.leadSeconds),
      lastTick - this.capacity + 1,
    );
    let best: { tick: number; state: SimState } | null = null;
    for (const k of this.keyframes) {
      if (!k.state || k.tick < earliest || k.tick > goalTick) continue;
      if (!best || k.tick < best.tick) best = { tick: k.tick, state: k.state };
    }
    if (!best || goalTick - best.tick < secondsToSteps(REPLAY.minLeadSeconds)) return null;
    const endTick = Math.min(lastTick, goalTick + secondsToSteps(REPLAY.afterSeconds));
    for (let t = best.tick; t <= endTick; t++) if (!this.inputAt(t)) return null;
    return { state: best.state, startTick: best.tick, goalTick, endTick };
  }
}
