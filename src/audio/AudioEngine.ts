import { AUDIO } from '../config/gameConfig';
import { storage } from '../game/storage';
import { loadVolumes, saveVolumes, type VolumeSettings } from './settings';

/** Ses veri yolu: efektler (kalabalık da efekt ayarına bağlı), kalabalık, müzik. */
export type Bus = 'sfx' | 'crowd' | 'music';

export interface ToneOptions {
  readonly type: OscillatorType;
  readonly from: number;
  /** Bitiş frekansı (üstel kayma); verilmezse sabit. */
  readonly to?: number;
  readonly duration: number;
  readonly volume: number;
  readonly attack?: number;
  /** Şimdiden itibaren gecikme (sn). */
  readonly delay?: number;
  readonly bus?: Bus;
  readonly filter?: BiquadFilterType;
  readonly cutoff?: number;
  readonly q?: number;
  readonly detune?: number;
}

export interface NoiseOptions {
  readonly duration: number;
  readonly volume: number;
  readonly filter: BiquadFilterType;
  readonly freq: number;
  /** Süzgecin bitiş frekansı (üstel kayma). */
  readonly freqTo?: number;
  readonly q?: number;
  readonly attack?: number;
  readonly delay?: number;
  readonly bus?: Bus;
}

/** Üstel zarfın hedefi: sıfıra üstel inilemez, duyulmayacak kadar küçük bir değer. */
export const SILENCE = 1e-4;
const MIN_ATTACK = 0.004;

/**
 * Web Audio motoru: tek AudioContext, veri yolları (efekt → ana, kalabalık → efekt, müzik →
 * ana), kırpılmayı önleyen sıkıştırıcı, ses düzeyi ayarları (kaydedilir), gürültü tamponları
 * ve ses sayısı sınırı. Tarayıcıların autoplay kuralı gereği bağlam **ilk kullanıcı
 * etkileşiminde** oluşturulur/açılır; o ana kadar tüm çalma çağrıları sessizce yok sayılır.
 * Sekme gizlenince bağlam askıya alınır.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Record<Bus, GainNode> | null = null;
  private volumes: VolumeSettings = loadVolumes(storage);
  private readonly readyListeners: (() => void)[] = [];
  private notifiedReady = false;
  private voices = 0;
  private white: AudioBuffer | null = null;
  private pink: AudioBuffer | null = null;
  private visibilityHooked = false;

  /** Kullanıcı etkileşiminde çağrılır: bağlamı kurar ve açar. */
  unlock(): void {
    const ctx = this.context();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().then(
        () => {
          this.checkReady();
        },
        () => undefined,
      );
    }
    this.checkReady();
  }

  /** Bağlam çalıyor mu (autoplay kilidi açıldı mı). */
  get running(): boolean {
    return this.ctx?.state === 'running';
  }

  /** Bağlam ilk kez çalmaya başlayınca (ya da zaten çalıyorsa hemen) çağrılır. */
  onReady(cb: () => void): void {
    if (this.notifiedReady) cb();
    else this.readyListeners.push(cb);
  }

  get settings(): Readonly<VolumeSettings> {
    return this.volumes;
  }

  setVolumes(v: VolumeSettings): void {
    this.volumes = { ...v };
    saveVolumes(storage, this.volumes);
    this.applyVolumes();
  }

  bus(name: Bus): GainNode | null {
    return this.buses?.[name] ?? null;
  }

  get now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  /** Beyaz (anlık sesler) ya da pembe (kalabalık) gürültü tamponu. */
  noiseBuffer(kind: 'white' | 'pink'): AudioBuffer | null {
    return kind === 'white' ? this.white : this.pink;
  }

  /**
   * Bir ses yuvası ister: sınır doluysa false (ses çalınmaz). Kaynak bitince `release` çağrılmalı.
   */
  acquire(): boolean {
    if (this.voices >= AUDIO.maxVoices) return false;
    this.voices++;
    return true;
  }

  release(): void {
    this.voices = Math.max(0, this.voices - 1);
  }

  /** Zarflı osilatör: frekans kayması, isteğe bağlı süzgeç. */
  tone(o: ToneOptions): boolean {
    const ctx = this.ctx;
    const out = this.bus(o.bus ?? 'sfx');
    if (!ctx || !out || ctx.state !== 'running' || !this.acquire()) return false;
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const end = t0 + o.duration;
    const osc = ctx.createOscillator();
    osc.type = o.type;
    osc.frequency.setValueAtTime(o.from, t0);
    if (o.to !== undefined && o.to > 0) osc.frequency.exponentialRampToValueAtTime(o.to, end);
    if (o.detune !== undefined) osc.detune.value = o.detune;
    const env = this.envelope(ctx, t0, end, o.volume, o.attack);
    let node: AudioNode = osc;
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = o.filter;
      f.frequency.value = o.cutoff ?? o.from;
      f.Q.value = o.q ?? 1;
      node = node.connect(f);
    }
    node.connect(env).connect(out);
    osc.onended = () => {
      this.release();
      env.disconnect();
    };
    osc.start(t0);
    osc.stop(end + STOP_PAD);
    return true;
  }

  /** Süzgeçten geçmiş gürültü patlaması (tampondan rastgele bir yerden). */
  noise(o: NoiseOptions): boolean {
    const ctx = this.ctx;
    const out = this.bus(o.bus ?? 'sfx');
    const buffer = this.white;
    if (!ctx || !out || !buffer || ctx.state !== 'running' || !this.acquire()) return false;
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const end = t0 + o.duration;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const f = ctx.createBiquadFilter();
    f.type = o.filter;
    f.frequency.setValueAtTime(o.freq, t0);
    if (o.freqTo !== undefined) f.frequency.exponentialRampToValueAtTime(o.freqTo, end);
    f.Q.value = o.q ?? 1;
    const env = this.envelope(ctx, t0, end, o.volume, o.attack);
    src.connect(f).connect(env).connect(out);
    src.onended = () => {
      this.release();
      env.disconnect();
    };
    const offset = Math.random() * Math.max(0, buffer.duration - o.duration);
    src.start(t0, offset);
    src.stop(end + STOP_PAD);
    return true;
  }

  /** 0 → tepe (atak) → üstel sönme zarfı. */
  envelope(
    ctx: AudioContext,
    t0: number,
    end: number,
    volume: number,
    attack = MIN_ATTACK,
  ): GainNode {
    const env = ctx.createGain();
    const a = Math.max(MIN_ATTACK, Math.min(attack, (end - t0) / 2));
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(volume, t0 + a);
    env.gain.exponentialRampToValueAtTime(SILENCE, end);
    return env;
  }

  private checkReady(): void {
    if (this.notifiedReady || !this.running) return;
    this.notifiedReady = true;
    for (const cb of this.readyListeners.splice(0)) cb();
  }

  private applyVolumes(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.buses) return;
    const t = ctx.currentTime;
    const v = this.volumes;
    this.master.gain.setTargetAtTime(v.master * AUDIO.masterGain, t, VOLUME_SMOOTH);
    this.buses.sfx.gain.setTargetAtTime(v.sfx, t, VOLUME_SMOOTH);
    this.buses.music.gain.setTargetAtTime(v.music * AUDIO.musicGain, t, VOLUME_SMOOTH);
    this.buses.crowd.gain.setTargetAtTime(AUDIO.crowdGain, t, VOLUME_SMOOTH);
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = globalThis.AudioContext as typeof AudioContext | undefined;
    if (!Ctor) return null;
    try {
      const ctx = new Ctor({ latencyHint: 'interactive' });
      const c = AUDIO.compressor;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = c.threshold;
      comp.knee.value = c.knee;
      comp.ratio.value = c.ratio;
      comp.attack.value = c.attack;
      comp.release.value = c.release;
      comp.connect(ctx.destination);
      const master = ctx.createGain();
      master.connect(comp);
      const sfx = ctx.createGain();
      sfx.connect(master);
      const crowd = ctx.createGain();
      crowd.connect(sfx);
      const music = ctx.createGain();
      music.connect(master);
      this.ctx = ctx;
      this.master = master;
      this.buses = { sfx, crowd, music };
      this.white = makeNoise(ctx, AUDIO.noiseSeconds, false);
      this.pink = makeNoise(ctx, AUDIO.crowdNoiseSeconds, true);
      this.applyVolumes();
      this.hookVisibility();
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  /** Sekme gizliyken sesi askıya al (zamanlayıcılar kısılır, müzik takılmasın). */
  private hookVisibility(): void {
    if (this.visibilityHooked || typeof document === 'undefined') return;
    this.visibilityHooked = true;
    document.addEventListener('visibilitychange', () => {
      const ctx = this.ctx;
      if (!ctx) return;
      if (document.hidden) void ctx.suspend().catch(() => undefined);
      else if (this.notifiedReady) void ctx.resume().catch(() => undefined);
    });
  }
}

const STOP_PAD = 0.05;
const VOLUME_SMOOTH = 0.05;

/**
 * Gürültü tamponu. Pembe gürültü (Paul Kellet'in süzgeci) kalabalık uğultusu için daha doğal;
 * yalnızca ses üretimidir, oyun durumunu etkilemez (determinizm dışı).
 */
function makeNoise(ctx: AudioContext, seconds: number, pink: boolean): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (!pink) {
      data[i] = white;
      continue;
    }
    b0 = PK.a0 * b0 + white * PK.w0;
    b1 = PK.a1 * b1 + white * PK.w1;
    b2 = PK.a2 * b2 + white * PK.w2;
    data[i] = (b0 + b1 + b2 + white * PK.w3) * PK.gain;
  }
  return buffer;
}
const PK = {
  a0: 0.99765,
  w0: 0.099046,
  a1: 0.963,
  w1: 0.2965164,
  a2: 0.57,
  w2: 1.0526913,
  w3: 0.1848,
  gain: 0.2,
} as const;

export const engine = new AudioEngine();
