import { AUDIO } from '../config/gameConfig';

export type WhistlePattern = keyof typeof AUDIO.whistle.patterns;

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
