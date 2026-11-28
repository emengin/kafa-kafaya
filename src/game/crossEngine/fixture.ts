import type { InputState } from '../../input/InputState';
import { CHARACTER_IDS, loadoutFor, type CharacterId } from '../characters';
import { GameSim, type GameSimOptions } from '../GameSim';
import { decodeInput, encodeInput, type MutableInput } from '../replay';
import { SUPER_TYPES } from '../superEffects';
import type { SimEvent } from '../types';

/**
 * Çapraz motor tekrar kaydı (Faz 2.7, madde 7). Bir maçın kurulumu ve her adımın iki oyuncu girdisi;
 * beklenen sonuç her adımın durum özetinin (`GameSim.checksum`) zinciri. Aynı kayıt Node, Chromium,
 * WebKit ve Android WebView'da oynatılır; her adımın özeti birebir aynı olmalıdır.
 *
 * Bu dosya determinizm lint bölgesindedir (`src/game/**`): kod çözme ve zincir yalnızca tam sayı
 * işlemleri kullanır, her motorda aynıdır.
 */
export interface ReplayFixture {
  /** Biçim sürümü (`FIXTURE_FORMAT`). */
  readonly format: number;
  readonly name: string;
  readonly characters: readonly [CharacterId, CharacterId];
  /** Simülasyon tohumu (balonlar, Serap). */
  readonly seed: number;
  readonly durationSeconds: number;
  readonly goldenGoalOvertime: boolean;
  /** Adım sayısı. */
  readonly ticks: number;
  /** Girdiler: adım başına 10 bit (iki oyuncu × 5 bit), uzunluk kodlu (RLE), base64. */
  readonly inputs: string;
  /** Zincir özeti her `checkpointEvery` adımda bir alınır (son adımda da). */
  readonly checkpointEvery: number;
  /** `chain[k]`: `(k + 1) · checkpointEvery` adıma kadarki zincir (son öğe son adımınki). */
  readonly chain: readonly string[];
}

export const FIXTURE_FORMAT = 1;

/** Zincirin başlangıç değeri. */
export const CHAIN_START = '0000000000000000';

/** Kaydın neleri kapsadığı (oynatırken sayılır; kapsam testi bunu denetler). */
export interface ReplayCoverage {
  readonly characters: readonly CharacterId[];
  /** Fırlatılan süper türleri ve sayıları. */
  readonly supers: Readonly<Record<string, number>>;
  readonly goals: number;
  /** Tamamlanan gol sonrası duraklamalar (golü izleyen santra ya da maç sonu). */
  readonly pauses: number;
  /** Gol sonrası duraklamaların adım sayıları. */
  readonly pauseTicks: readonly number[];
  readonly balloons: number;
  readonly goldenGoal: boolean;
  readonly matchEnd: boolean;
}

export interface ReplayRun {
  /** Her adımın durum özeti (`checksums[t]`: `t + 1`. adımdan sonraki durum). */
  readonly checksums: string[];
  readonly chain: string[];
  readonly coverage: ReplayCoverage;
}

/** Kaydın simülasyon kurulumu (maç sahnesiyle aynı kurallar, kısaltılmış süre). */
export function fixtureOptions(
  f: Pick<ReplayFixture, 'characters' | 'seed' | 'durationSeconds' | 'goldenGoalOvertime'>,
): GameSimOptions {
  return {
    rules: { durationSeconds: f.durationSeconds, goldenGoalOvertime: f.goldenGoalOvertime },
    loadouts: [loadoutFor(f.characters[0]), loadoutFor(f.characters[1])],
    seed: f.seed,
  };
}

// ───────────── Girdi kodlaması ─────────────

const PLAYER_BITS = 5;
const BYTE = 256;
const VARINT_MORE = 128;
const VARINT_MASK = 127;
const VARINT_SHIFT = 7;
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_BITS = 6;
const B64_GROUP = 3;
const B64_CHARS = 4;
const B64_MASK = 63;
const BYTE_BITS = 8;
const BYTE_MASK = 255;
const PAD = '=';

/** İki oyuncunun girdisi tek sayı (0–1023). */
export function encodePair(a: InputState, b: InputState): number {
  return encodeInput(a) | (encodeInput(b) << PLAYER_BITS);
}

/** Adım girdilerini (çift kodları) RLE + base64 metne çevirir. */
export function encodeInputs(pairs: readonly number[]): string {
  const bytes: number[] = [];
  for (let i = 0; i < pairs.length;) {
    const value = pairs[i] ?? 0;
    let run = 1;
    while (i + run < pairs.length && pairs[i + run] === value) run++;
    bytes.push(value % BYTE, (value - (value % BYTE)) / BYTE);
    let n = run;
    while (n >= VARINT_MORE) {
      bytes.push((n & VARINT_MASK) | VARINT_MORE);
      n >>>= VARINT_SHIFT;
    }
    bytes.push(n);
    i += run;
  }
  let out = '';
  for (let i = 0; i < bytes.length; i += B64_GROUP) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;
    const word = (b0 << (2 * BYTE_BITS)) | (b1 << BYTE_BITS) | b2;
    out += B64[(word >>> (B64_GROUP * B64_BITS)) & B64_MASK] ?? '';
    out += B64[(word >>> (2 * B64_BITS)) & B64_MASK] ?? '';
    out += i + 1 < bytes.length ? (B64[(word >>> B64_BITS) & B64_MASK] ?? '') : PAD;
    out += i + 2 < bytes.length ? (B64[word & B64_MASK] ?? '') : PAD;
  }
  return out;
}

/** `encodeInputs`'un tersi: adım başına çift kodu. */
export function decodeInputs(text: string, ticks: number): Uint16Array {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i += B64_CHARS) {
    let word = 0;
    let count = 0;
    for (let k = 0; k < B64_CHARS; k++) {
      const c = text[i + k] ?? PAD;
      word <<= B64_BITS;
      if (c !== PAD) {
        word |= B64.indexOf(c);
        count++;
      }
    }
    const n = count - 1;
    if (n >= 1) bytes.push((word >>> (2 * BYTE_BITS)) & BYTE_MASK);
    if (n >= 2) bytes.push((word >>> BYTE_BITS) & BYTE_MASK);
    if (n >= B64_GROUP) bytes.push(word & BYTE_MASK);
  }
  const out = new Uint16Array(ticks);
  let t = 0;
  for (let i = 0; i < bytes.length && t < ticks;) {
    const value = (bytes[i] ?? 0) | ((bytes[i + 1] ?? 0) << BYTE_BITS);
    i += 2;
    let run = 0;
    let shift = 0;
    for (;;) {
      const b = bytes[i++] ?? 0;
      run |= (b & VARINT_MASK) << shift;
      if ((b & VARINT_MORE) === 0) break;
      shift += VARINT_SHIFT;
    }
    for (let k = 0; k < run && t < ticks; k++) out[t++] = value;
  }
  if (t !== ticks) throw new Error(`Tekrar girdileri eksik: ${t} / ${ticks} adım`);
  return out;
}

// ───────────── Zincir ─────────────

const FNV_OFFSET_A = 0x811c9dc5;
const FNV_OFFSET_B = 0x6c62272e;
const FNV_PRIME = 0x01000193;
const HEX = 16;
const HEX_DIGITS = 8;

/** Zincirin bir halkası: önceki zincir + bu adımın özeti → yeni 64 bit (iki FNV-1a turu). */
export function chainStep(prev: string, checksum: string): string {
  let a = FNV_OFFSET_A;
  let b = FNV_OFFSET_B;
  const feed = (s: string): void => {
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      a = Math.imul(a ^ c, FNV_PRIME);
      b = Math.imul(b ^ c ^ (a >>> HEX_DIGITS), FNV_PRIME);
    }
  };
  feed(prev);
  feed(checksum);
  return (
    (a >>> 0).toString(HEX).padStart(HEX_DIGITS, '0') +
    (b >>> 0).toString(HEX).padStart(HEX_DIGITS, '0')
  );
}

// ───────────── Oynatma ─────────────

/**
 * Kaydı baştan sona oynatır: her adımın özeti, zincir noktaları ve kapsam (Node, tarayıcı ve
 * telefondaki test aynı işlevi çağırır).
 */
export function runFixture(f: ReplayFixture): ReplayRun {
  if (f.format !== FIXTURE_FORMAT) throw new Error(`Bilinmeyen tekrar biçimi: ${f.format}`);
  const sim = new GameSim(fixtureOptions(f));
  const pairs = decodeInputs(f.inputs, f.ticks);
  const a: MutableInput = { left: false, right: false, jump: false, kick: false, super: false };
  const b: MutableInput = { left: false, right: false, jump: false, kick: false, super: false };
  const inputs: [InputState, InputState] = [a, b];
  const checksums: string[] = [];
  const chain: string[] = [];
  const cov = new CoverageCounter(f.characters);
  let link = CHAIN_START;
  for (let t = 0; t < f.ticks; t++) {
    const v = pairs[t] ?? 0;
    decodeInput(v & ((1 << PLAYER_BITS) - 1), a);
    decodeInput(v >>> PLAYER_BITS, b);
    const events = sim.step(inputs);
    cov.add(events, sim.tick);
    const sum = sim.checksum();
    checksums.push(sum);
    link = chainStep(link, sum);
    if ((t + 1) % f.checkpointEvery === 0 || t + 1 === f.ticks) chain.push(link);
  }
  return { checksums, chain, coverage: cov.result() };
}

/** İki zincir listesinin ilk farklı noktası (yoksa −1). */
export function firstChainMismatch(a: readonly string[], b: readonly string[]): number {
  const n = a.length > b.length ? a.length : b.length;
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return -1;
}

class CoverageCounter {
  private readonly supers: Record<string, number> = {};
  private goals = 0;
  private pauses = 0;
  private readonly pauseTicks: number[] = [];
  private goalTick = -1;
  private balloons = 0;
  private goldenGoal = false;
  private matchEnd = false;

  constructor(private readonly characters: readonly [CharacterId, CharacterId]) {}

  add(events: readonly SimEvent[], tick: number): void {
    for (const e of events) {
      switch (e.type) {
        case 'superLaunch':
          this.supers[e.superType] = (this.supers[e.superType] ?? 0) + 1;
          break;
        case 'goal':
          this.goals++;
          this.goalTick = tick;
          break;
        case 'kickoff':
        case 'matchEnd':
          if (this.goalTick >= 0) {
            this.pauses++;
            this.pauseTicks.push(tick - this.goalTick);
            this.goalTick = -1;
          }
          if (e.type === 'matchEnd') this.matchEnd = true;
          break;
        case 'goldenGoal':
          this.goldenGoal = true;
          break;
        case 'balloonPop':
          this.balloons++;
          break;
        default:
          break;
      }
    }
  }

  result(): ReplayCoverage {
    return {
      characters: [...this.characters],
      supers: { ...this.supers },
      goals: this.goals,
      pauses: this.pauses,
      pauseTicks: [...this.pauseTicks],
      balloons: this.balloons,
      goldenGoal: this.goldenGoal,
      matchEnd: this.matchEnd,
    };
  }
}

/**
 * Tüm kayıtların birlikte kapsaması gerekenler: her karakter, her süper, gol, tamamlanan gol sonrası
 * duraklama. Eksik olanların listesi (boşsa tamam).
 */
export function missingCoverage(runs: readonly ReplayCoverage[]): string[] {
  const missing: string[] = [];
  const chars = new Set(runs.flatMap((r) => r.characters));
  for (const id of CHARACTER_IDS) if (!chars.has(id)) missing.push(`karakter ${id}`);
  for (const type of SUPER_TYPES) {
    if (!runs.some((r) => (r.supers[type] ?? 0) > 0)) missing.push(`süper ${type}`);
  }
  if (!runs.some((r) => r.goals > 0)) missing.push('gol');
  if (!runs.some((r) => r.pauses > 0)) missing.push('gol sonrası duraklama');
  return missing;
}
