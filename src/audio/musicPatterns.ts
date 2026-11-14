import { MUSIC } from '../config/gameConfig';

/**
 * Prosedürel müzik desenleri (saf, Web Audio'dan bağımsız; testlenebilir). Bir parça; akor
 * dizisi, metin desenleri (`x` vuruş, `o` hafif, `.` sus; bas/arpejde rakam = akor tonu, `r` =
 * kökün bir oktav üstü) ve tohumlu bir melodi üretecinden oluşur. Her ölçü 16 adımdır (16'lık).
 */

export type TrackName = keyof typeof MUSIC.tracks;
export type Instrument = 'kick' | 'snare' | 'hat' | 'bass' | 'pad' | 'arp' | 'lead';
export type ChordQuality = 'maj' | 'min' | 'maj7' | 'm7' | 'dom7';

export interface NoteEvent {
  /** Ölçü içindeki adım (0–15). */
  readonly step: number;
  readonly inst: Instrument;
  /** MIDI nota (davullarda kullanılmaz). */
  readonly midi: number;
  /** Uzunluk (adım). */
  readonly length: number;
  /** Şiddet (0–1). */
  readonly velocity: number;
  /** Açık hi-hat. */
  readonly open?: boolean;
}

export const STEPS_PER_BAR = 16;
const OCTAVE = 12;
const A4_MIDI = 69;
const A4_HZ = 440;

const INTERVALS: Readonly<Record<ChordQuality, readonly number[]>> = MUSIC.theory.intervals;

/** Doğal majör / minör dizi (melodi için). */
const SCALE_MAJOR: readonly number[] = MUSIC.theory.major;
const SCALE_MINOR: readonly number[] = MUSIC.theory.minor;

export function midiToHz(midi: number): number {
  return A4_HZ * Math.pow(2, (midi - A4_MIDI) / OCTAVE);
}

export function chordTones(root: number, quality: ChordQuality): number[] {
  return INTERVALS[quality].map((i) => root + i);
}

/** Akor tonunu dizinle seçer; dizin akor boyunu aşarsa bir oktav yukarı sarar. */
function tone(tones: readonly number[], index: number): number {
  const n = tones.length;
  const base = tones[index % n] ?? tones[0] ?? 0;
  return base + Math.floor(index / n) * OCTAVE;
}

/** Ölçüye özgü tohumlu sayı (melodi her `loopBars` ölçüde aynen tekrarlar). */
function barRandom(seed: number): () => number {
  let s = (seed * HASH_MUL + HASH_ADD) >>> 0;
  return () => {
    s = (Math.imul(s ^ (s >>> HASH_S1), HASH_M1) + HASH_ADD) >>> 0;
    s ^= s >>> HASH_S2;
    return (s >>> 0) / UINT32;
  };
}
const HASH_MUL = 2654435761;
const HASH_ADD = 0x9e3779b9;
const HASH_M1 = 0x85ebca6b;
const HASH_S1 = 16;
const HASH_S2 = 13;
const UINT32 = 4294967296;

function drums(pattern: string, inst: Instrument, out: NoteEvent[]): void {
  for (let s = 0; s < STEPS_PER_BAR; s++) {
    const c = pattern[s];
    if (c === 'x') out.push({ step: s, inst, midi: 0, length: 1, velocity: 1 });
    else if (c === 'o')
      out.push({ step: s, inst, midi: 0, length: 1, velocity: SOFT, open: inst === 'hat' });
  }
}
const SOFT = 0.55;

/** Bir parçanın `bar`. ölçüsündeki tüm notalar. */
export function buildBar(track: TrackName, bar: number): NoteEvent[] {
  const t = MUSIC.tracks[track];
  const out: NoteEvent[] = [];
  const prog = t.progression;
  const [offset, quality] = prog[bar % prog.length] ?? prog[0];
  const root = t.root + offset;
  const tones = chordTones(root, quality);
  const loopBar = bar % t.loopBars;
  const fill = loopBar === t.loopBars - 1;

  drums(t.kick, 'kick', out);
  // Son ölçüde trampet dolgusu.
  drums(fill ? FILL_SNARE : t.snare, 'snare', out);
  drums(t.hat, 'hat', out);

  for (let s = 0; s < STEPS_PER_BAR; s++) {
    const c = t.bass[s];
    if (c === undefined || c === '.') continue;
    const midi = c === 'r' ? root - OCTAVE : tone(tones, Number(c)) - OCTAVE * 2;
    out.push({ step: s, inst: 'bass', midi, length: BASS_LEN, velocity: 1 });
  }
  for (let s = 0; s < STEPS_PER_BAR; s++) {
    const c = t.arp[s];
    if (c === undefined || c === '.') continue;
    out.push({
      step: s,
      inst: 'arp',
      midi: tone(tones, Number(c)) + OCTAVE,
      length: ARP_LEN,
      velocity: 1,
    });
  }
  if (t.pad) {
    for (const m of tones)
      out.push({ step: 0, inst: 'pad', midi: m, length: STEPS_PER_BAR, velocity: 1 });
  } else {
    // Pad yerine vuruşlarda kısa akor darbeleri.
    for (const s of STAB_STEPS) {
      for (const m of tones)
        out.push({ step: s, inst: 'pad', midi: m, length: STAB_LEN, velocity: STAB_VEL });
    }
  }
  pushMelody(t.lead, t.mode === 'minor' ? SCALE_MINOR : SCALE_MAJOR, t.root, tones, loopBar, out);
  return out;
}
const FILL_SNARE = '....x.......xoxx';
const BASS_LEN = 3;
const ARP_LEN = 2;
const STAB_STEPS: readonly number[] = MUSIC.theory.stabSteps;
const STAB_LEN = 2;
const STAB_VEL = 0.7;

/**
 * Tohumlu melodi: güçlü vuruşlarda akor tonları, arada parçanın dizisindeki komşu notalar;
 * yoğunluk olasılığıyla nota ya da sus. Aynı ölçü numarası → aynı melodi (döngü).
 */
function pushMelody(
  density: number,
  scale: readonly number[],
  keyRoot: number,
  tones: readonly number[],
  loopBar: number,
  out: NoteEvent[],
): void {
  if (density <= 0) return;
  const rand = barRandom(loopBar + 1);
  const top = keyRoot + OCTAVE;
  let degree = Math.floor(rand() * scale.length);
  for (let s = 0; s < STEPS_PER_BAR; s += 2) {
    const strong = s % BEAT_STEPS === 0;
    if (rand() > density * (strong ? STRONG_BOOST : 1)) continue;
    let midi: number;
    if (strong) {
      midi = tone(tones, Math.floor(rand() * tones.length)) + OCTAVE;
    } else {
      degree = Math.max(0, Math.min(scale.length - 1, degree + (rand() < 0.5 ? -1 : 1)));
      midi = top + (scale[degree] ?? 0);
    }
    const length = rand() < LONG_CHANCE ? LONG_NOTE : 2;
    out.push({ step: s, inst: 'lead', midi, length, velocity: strong ? 1 : WEAK_VEL });
  }
}
const STRONG_BOOST = 1.6;
/** Vuruş başına adım (16'lık) ve uzun nota uzunluğu (adım). */
const BEAT_STEPS = 4;
const LONG_NOTE = 4;
const LONG_CHANCE = 0.3;
const WEAK_VEL = 0.75;

/** Bir adımın süresi (sn). */
export function stepSeconds(track: TrackName): number {
  const SECONDS_PER_MINUTE = 60;
  const STEPS_PER_BEAT = 4;
  return SECONDS_PER_MINUTE / MUSIC.tracks[track].bpm / STEPS_PER_BEAT;
}
