import { CROWD } from '../config/gameConfig';
import { engine } from './AudioEngine';

/** Sürekli çalan bir gürültü katmanı: kaynak → süzgeç(ler) → kazanç. */
interface Layer {
  readonly src: AudioBufferSourceNode;
  readonly filter: BiquadFilterNode;
  readonly gain: GainNode;
}

/**
 * Kalabalık: pembe gürültüden süzülmüş sürekli uğultu (yavaşça dalgalanır), tehlikeli atakta
 * yükselen "kükreme" katmanı, golde tezahürat patlaması (kükreme + alkış + ıslıklar) ve direk
 * gibi kıl payı anlarda "ooo". Kalabalık veri yolu efekt ses ayarına bağlıdır.
 */
class Crowd {
  private murmur: Layer | null = null;
  private roar: Layer | null = null;
  private applause: Layer | null = null;
  private lfos: OscillatorNode[] = [];
  private intensity = 0;
  private wanted = false;

  /** Uğultuyu başlatır (ses kilidi açılınca). */
  start(): void {
    this.wanted = true;
    engine.onReady(() => {
      if (this.wanted && !this.murmur) this.build();
    });
  }

  stop(): void {
    this.wanted = false;
    const ctx = engine.ctx;
    for (const layer of [this.murmur, this.roar, this.applause]) {
      if (!layer || !ctx) continue;
      layer.gain.gain.setTargetAtTime(0, ctx.currentTime, CROWD.smoothing);
      layer.src.stop(ctx.currentTime + STOP_AFTER);
    }
    for (const lfo of this.lfos) lfo.stop((ctx?.currentTime ?? 0) + STOP_AFTER);
    this.murmur = null;
    this.roar = null;
    this.applause = null;
    this.lfos = [];
  }

  /** Atak tehlikesi (0–1): uğultu yükselir, parlaklaşır; kükreme katmanı açılır. */
  setIntensity(level: number): void {
    const ctx = engine.ctx;
    if (!ctx || !this.murmur || !this.roar) return;
    const v = Math.min(1, Math.max(0, level));
    if (Math.abs(v - this.intensity) < CHANGE_EPSILON) return;
    this.intensity = v;
    const t = ctx.currentTime;
    const m = CROWD.murmur;
    this.murmur.gain.gain.setTargetAtTime(m.base + m.perIntensity * v, t, CROWD.smoothing);
    this.murmur.filter.frequency.setTargetAtTime(
      m.centerHz + m.hzPerIntensity * v,
      t,
      CROWD.smoothing,
    );
    const r = CROWD.roar;
    this.roar.gain.gain.setTargetAtTime(
      r.perIntensity * Math.pow(v, r.exponent),
      t,
      CROWD.smoothing,
    );
  }

  /** Gol: tezahürat patlaması (kükreme + alkış) ve ıslıklar. */
  cheer(): void {
    const ctx = engine.ctx;
    if (!ctx || !this.roar || !this.applause) return;
    const c = CROWD.cheer;
    const t = ctx.currentTime;
    for (const layer of [this.roar, this.applause]) {
      const peak = layer === this.roar ? c.peak : c.applause;
      const g = layer.gain.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(peak, t + c.attack);
      g.setValueAtTime(peak, t + c.attack + c.hold);
      g.linearRampToValueAtTime(
        CROWD.roar.perIntensity * Math.pow(this.intensity, CROWD.roar.exponent),
        t + c.attack + c.hold + c.release,
      );
    }
    const w = CROWD.whistles;
    for (let i = 0; i < w.count; i++) {
      const from = w.fromHz + Math.random() * (w.toHz - w.fromHz) * HALF;
      engine.tone({
        type: 'sine',
        from,
        to: from * (1 + Math.random() * WHISTLE_GLIDE),
        duration: w.duration,
        volume: w.volume,
        delay: Math.random() * w.spread,
        bus: 'crowd',
      });
    }
  }

  /** Kıl payı (direk, kurtarış): yükselip inen "ooo". */
  ooh(): void {
    const ctx = engine.ctx;
    const out = engine.bus('crowd');
    const buffer = engine.noiseBuffer('pink');
    if (!ctx || !out || !buffer || !engine.running) return;
    const o = CROWD.ooh;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(o.peak, t + o.attack);
    env.gain.linearRampToValueAtTime(0, t + o.attack + o.decay);
    for (const hz of o.formants) {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = o.q;
      f.frequency.setValueAtTime(hz, t);
      f.frequency.linearRampToValueAtTime(hz * o.glide, t + o.attack + o.decay);
      src.connect(f).connect(env);
    }
    env.connect(out);
    src.start(t, Math.random() * (buffer.duration - o.attack - o.decay));
    src.stop(t + o.attack + o.decay + STOP_AFTER);
  }

  private build(): void {
    const ctx = engine.ctx;
    const out = engine.bus('crowd');
    const buffer = engine.noiseBuffer('pink');
    if (!ctx || !out || !buffer) return;
    const m = CROWD.murmur;
    this.murmur = this.layer(ctx, out, buffer, 'bandpass', m.centerHz, m.q, m.base);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = m.lowpassHz;
    this.murmur.filter.disconnect();
    this.murmur.filter.connect(low).connect(this.murmur.gain);
    this.roar = this.layer(ctx, out, buffer, 'bandpass', CROWD.roar.centerHz, CROWD.roar.q, 0);
    const c = CROWD.cheer;
    this.applause = this.layer(ctx, out, buffer, 'bandpass', c.applauseHz, c.applauseQ, 0);
    // Yavaş dalgalanma: iki LFO uğultunun kazancını oynatır.
    const s = CROWD.swell;
    for (const [hz, depth] of [
      [s.hz, s.depth],
      [s.slowHz, s.slowDepth],
    ] as const) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = hz;
      const amt = ctx.createGain();
      amt.gain.value = m.base * depth;
      lfo.connect(amt).connect(this.murmur.gain.gain);
      lfo.start();
      this.lfos.push(lfo);
    }
    this.intensity = -1;
    this.setIntensity(0);
  }

  private layer(
    ctx: AudioContext,
    out: AudioNode,
    buffer: AudioBuffer,
    type: BiquadFilterType,
    hz: number,
    q: number,
    level: number,
  ): Layer {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = hz;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = level;
    src.connect(filter).connect(gain).connect(out);
    // Katmanlar tamponun farklı yerlerinden başlasın (aynı gürültü üst üste binmesin).
    src.start(ctx.currentTime, Math.random() * buffer.duration);
    return { src, filter, gain };
  }
}

const STOP_AFTER = 0.8;
const CHANGE_EPSILON = 0.01;
const HALF = 0.5;
const WHISTLE_GLIDE = 0.25;

export const crowd = new Crowd();
