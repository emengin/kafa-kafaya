import { AUDIO } from '../config/gameConfig';

export type WhistlePattern = keyof typeof AUDIO.whistle.patterns;

/** Üstel zarfın hedefi: sıfıra üstel inilemez, duyulmayacak kadar küçük bir değer. */
const SILENCE = 1e-4;

/**
 * Web Audio ile sentezlenen ses efektleri (harici dosya yok). AudioContext ilk kullanımda
 * oluşturulur; tarayıcı kullanıcı etkileşiminden önce sesi askıya alırsa sessizce geçilir.
 */
class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  /** Kullanıcı etkileşimi (tıklama/tuş) sırasında çağrılırsa sesin kilidini açar. */
  unlock(): void {
    const ctx = this.context();
    if (ctx?.state === 'suspended') void ctx.resume().catch(() => undefined);
  }

  /** Hakem düdüğü: desen [çalma, sessizlik, çalma, …] sürelerinden oluşur. */
  whistle(pattern: WhistlePattern): void {
    const ctx = this.context();
    if (!ctx || !this.master || ctx.state !== 'running') return;
    const w = AUDIO.whistle;
    const segments = w.patterns[pattern];
    let t = ctx.currentTime;
    segments.forEach((duration, i) => {
      if (i % 2 === 0) this.blast(ctx, this.master as GainNode, t, duration);
      t += duration;
    });
  }

  /** Vuruş: frekansı hızla düşen kısa sinüs ("tok"). */
  kick(): void {
    const c = AUDIO.kick;
    this.sweep('sine', c.startHz, c.endHz, c.duration, c.volume);
  }

  /** Süper şut: yükselen testere dişi ("vuuş"). */
  superShot(): void {
    const c = AUDIO.super;
    this.sweep('sawtooth', c.startHz, c.endHz, c.duration, c.volume);
  }

  /** Balon patlaması: süzgeçten geçmiş kısa gürültü. */
  pop(): void {
    const ctx = this.ready();
    if (!ctx || !this.master) return;
    const c = AUDIO.pop;
    const length = Math.max(1, Math.floor(ctx.sampleRate * c.duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Sönen beyaz gürültü (yalnızca ses; oyun durumunu etkilemez, determinizm dışı).
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = c.filterHz;
    const gain = ctx.createGain();
    gain.gain.value = c.volume;
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
  }

  /** Donma: art arda iki yüksek ton (çınlama). */
  freeze(): void {
    const ctx = this.ready();
    if (!ctx || !this.master) return;
    const c = AUDIO.freeze;
    c.tones.forEach((hz, i) => {
      const start = ctx.currentTime + i * c.toneDuration;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = hz;
      const env = ctx.createGain();
      env.gain.setValueAtTime(c.volume, start);
      env.gain.exponentialRampToValueAtTime(SILENCE, start + c.toneDuration);
      osc.connect(env).connect(this.master as GainNode);
      osc.start(start);
      osc.stop(start + c.toneDuration);
    });
  }

  private sweep(
    type: OscillatorType,
    fromHz: number,
    toHz: number,
    duration: number,
    volume: number,
  ): void {
    const ctx = this.ready();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(fromHz, t0);
    osc.frequency.exponentialRampToValueAtTime(toHz, t0 + duration);
    const env = ctx.createGain();
    env.gain.setValueAtTime(volume, t0);
    env.gain.exponentialRampToValueAtTime(SILENCE, t0 + duration);
    osc.connect(env).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration);
  }

  /** Çalmaya hazır bağlam (kullanıcı etkileşiminden önce askıdaysa null). */
  private ready(): AudioContext | null {
    const ctx = this.context();
    return ctx && ctx.state === 'running' ? ctx : null;
  }

  private blast(ctx: AudioContext, out: AudioNode, start: number, duration: number): void {
    const w = AUDIO.whistle;
    const end = start + duration;

    const tone = ctx.createOscillator();
    tone.type = 'sine';
    tone.frequency.value = w.frequency;
    // Bilyeli düdüğün titreşimi: frekansı hızla salınan bir LFO.
    const trill = ctx.createOscillator();
    trill.frequency.value = w.trillHz;
    const trillDepth = ctx.createGain();
    trillDepth.gain.value = w.trillDepthHz;
    trill.connect(trillDepth).connect(tone.frequency);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(w.volume, start + w.attack);
    env.gain.setValueAtTime(w.volume, Math.max(start + w.attack, end - w.release));
    env.gain.linearRampToValueAtTime(0, end);
    tone.connect(env).connect(out);

    tone.start(start);
    trill.start(start);
    tone.stop(end);
    trill.stop(end);
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = globalThis.AudioContext as typeof AudioContext | undefined;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = AUDIO.masterVolume;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }
}

export const sfx = new Sfx();
