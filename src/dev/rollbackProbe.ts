import { PERF } from '../config/gameConfig';
import type { GameSim } from '../game/GameSim';
import { decodeInput, encodeInput, type MutableInput } from '../game/replay';
import type { SimState } from '../game/simState';
import type { InputState } from '../input/InputState';
import { Histogram } from './perfStats';

/**
 * Rollback maliyeti ölçer (Faz 2.4, QUALITY_BAR P9). Online PvP'de (Faz 9.2) geç gelen girdi
 * tahmini tutmazsa oyun `n` adım geriye sarılır ve düzeltilmiş girdilerle yeniden simüle edilir.
 * Kare bütçesi: **durum kaydı + 8 adımlık yeniden simülasyon ≤ 4 ms** (referans cihaz).
 *
 * Canlı simülasyona dokunmaz: her adımdan önce canlı durum bir halka tampona kaydedilir (gerçek
 * rollback'in her adımda ödediği bedel), her karede ayrı bir "gölge" simülasyon `n` adım önceki
 * durumu yükleyip kaydedilen girdilerle `n` adım ilerler (en kötü durum: her karede geri sarma).
 * Gölgenin vardığı durum canlı durumla karşılaştırılır: rollback'in deterministik olduğunun da
 * sürekli denetimi (fark = `mismatches`).
 */
export class RollbackProbe {
  /** Adım başına durum kaydı süresi. */
  readonly save = new Histogram();
  /** Durum yükleme + `frames` adım yeniden simülasyon. */
  readonly resim = new Histogram();
  /** Kare başına toplam: son adımın kaydı + yükleme + yeniden simülasyon (P9). */
  readonly total = new Histogram();
  verified = 0;
  mismatches = 0;

  private readonly slots: number;
  private readonly states: (SimState | undefined)[];
  private readonly ticks: Int32Array;
  private readonly inputs: Uint8Array;
  private readonly pair: [MutableInput, MutableInput] = [blank(), blank()];
  private lastSaveMs = 0;
  private frameCount = 0;
  private liveScratch: SimState | undefined;
  private shadowScratch: SimState | undefined;

  /**
   * @param sim Canlı simülasyon (yalnızca okunur).
   * @param shadow Aynı kurulumla oluşturulmuş ayrı bir simülasyon (geri sarma burada yapılır).
   */
  constructor(
    private readonly sim: GameSim,
    private readonly shadow: GameSim,
    readonly frames: number = PERF.rollbackFrames,
    private readonly verifyEvery: number = PERF.rollbackVerifyEvery,
    private readonly now: () => number = () => performance.now(),
  ) {
    this.slots = frames + 1;
    this.states = Array.from({ length: this.slots }, (): SimState | undefined => undefined);
    this.ticks = new Int32Array(this.slots).fill(-1);
    this.inputs = new Uint8Array(this.slots * 2);
  }

  /** Canlı adımdan **önce**: durumu kaydet (süre ölçülür), adımın girdilerini sakla. */
  beforeStep(a: InputState, b: InputState): void {
    const tick = this.sim.tick;
    const slot = tick % this.slots;
    const t0 = this.now();
    this.states[slot] = this.sim.saveState(this.states[slot]);
    this.lastSaveMs = this.now() - t0;
    this.save.add(this.lastSaveMs);
    this.ticks[slot] = tick;
    this.inputs[slot * 2] = encodeInput(a);
    this.inputs[slot * 2 + 1] = encodeInput(b);
  }

  /**
   * Kare sonunda: son `frames` adımı gölgede yeniden simüle et. Geçmiş eksikse (maç başı, gol
   * tekrarı sonrası) bu kare atlanır.
   * @returns Bu karenin toplam maliyeti (ms) ya da atlandıysa −1.
   */
  frame(): number {
    const end = this.sim.tick;
    const start = end - this.frames;
    if (start < 0) return -1;
    for (let t = start; t < end; t++) if (this.ticks[t % this.slots] !== t) return -1;
    const first = this.states[start % this.slots];
    if (!first) return -1;
    const t0 = this.now();
    this.shadow.loadState(first);
    for (let t = start; t < end; t++) {
      const slot = t % this.slots;
      decodeInput(this.inputs[slot * 2] ?? 0, this.pair[0]);
      decodeInput(this.inputs[slot * 2 + 1] ?? 0, this.pair[1]);
      this.shadow.step(this.pair);
    }
    const resimMs = this.now() - t0;
    this.resim.add(resimMs);
    const total = this.lastSaveMs + resimMs;
    this.total.add(total);
    this.frameCount++;
    if (this.frameCount % this.verifyEvery === 0) this.verify();
    return total;
  }

  /** Gölgenin vardığı durum canlı durumla birebir aynı mı? (Ayırma yapar: seyrek çağrılır.) */
  private verify(): void {
    this.liveScratch = this.sim.saveState(this.liveScratch);
    this.shadowScratch = this.shadow.saveState(this.shadowScratch);
    this.verified++;
    if (!sameState(this.liveScratch, this.shadowScratch)) this.mismatches++;
  }

  reset(): void {
    this.save.reset();
    this.resim.reset();
    this.total.reset();
    this.verified = 0;
    this.mismatches = 0;
    this.frameCount = 0;
    this.ticks.fill(-1);
  }
}

function blank(): MutableInput {
  return { left: false, right: false, jump: false, kick: false, super: false };
}

/** İki durumun alan alan birebir eşitliği (`Object.is`: −0 ≠ 0, NaN = NaN). */
export function sameState(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  const ra = a as Record<string, unknown>;
  const rb = b as Record<string, unknown>;
  for (const k of ka) if (!sameState(ra[k], rb[k])) return false;
  return true;
}
