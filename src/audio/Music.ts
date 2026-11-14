import { MUSIC } from '../config/gameConfig';
import { engine, SILENCE } from './AudioEngine';
import {
  buildBar,
  midiToHz,
  STEPS_PER_BAR,
  stepSeconds,
  type NoteEvent,
  type TrackName,
} from './musicPatterns';

/**
 * Prosedürel döngüsel müzik: ileriye bakan bir zamanlayıcı (her `tickMs`'de `lookahead`
 * kadar ilerideki 16'lıkları AudioContext saatine göre planlar — JS zamanlayıcısı titrese de
 * ritim kaymaz). Parça değişince eski parça söner. Golde müzik kısılır (kalabalık öne çıkar).
 * Ses kilidi açılmadan istenen parça, kilit açılınca başlar.
 */
class Music {
  private track: TrackName | null = null;
  private wanted: TrackName | null = null;
  private trackGain: GainNode | null = null;
  private delaySend: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;
  private bar = 0;
  private events: NoteEvent[] = [];

  /** Parçayı çal (aynıysa dokunma); null → sustur. */
  play(track: TrackName | null): void {
    this.wanted = track;
    if (!engine.running) {
      engine.onReady(() => {
        if (this.wanted !== this.track) this.switchTo(this.wanted);
      });
      return;
    }
    if (track !== this.track) this.switchTo(track);
  }

  /** Müziği bir süre kıs (gol tezahüratı). */
  duck(): void {
    const ctx = engine.ctx;
    const g = this.trackGain;
    if (!ctx || !g || !this.track) return;
    const d = MUSIC.duck;
    const t = ctx.currentTime;
    const full = MUSIC.tracks[this.track].gain;
    g.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(full * d.level, t, DUCK_IN);
    g.gain.setTargetAtTime(full, t + d.seconds, DUCK_OUT);
  }

  private switchTo(track: TrackName | null): void {
    const ctx = engine.ctx;
    const bus = engine.bus('music');
    if (!ctx || !bus) return;
    // Eski parçayı söndür.
    if (this.trackGain) {
      const old = this.trackGain;
      old.gain.cancelScheduledValues(ctx.currentTime);
      old.gain.setTargetAtTime(0, ctx.currentTime, MUSIC.fadeSeconds / FADE_CONSTANTS);
      setTimeout(
        () => {
          old.disconnect();
        },
        MUSIC.fadeSeconds * MS * 2,
      );
    }
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.track = track;
    this.trackGain = null;
    if (!track) return;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.setTargetAtTime(
      MUSIC.tracks[track].gain,
      ctx.currentTime,
      MUSIC.fadeSeconds / FADE_CONSTANTS,
    );
    gain.connect(bus);
    // Yankı (gecikme + geri besleme) arpej ve melodiye.
    const d = MUSIC.delay;
    const delay = ctx.createDelay(1);
    delay.delayTime.value = d.seconds;
    const fb = ctx.createGain();
    fb.gain.value = d.feedback;
    const send = ctx.createGain();
    send.gain.value = d.wet;
    send.connect(delay).connect(fb).connect(delay);
    delay.connect(gain);
    this.trackGain = gain;
    this.delaySend = send;
    this.step = 0;
    this.bar = 0;
    this.events = buildBar(track, 0);
    this.nextTime = ctx.currentTime + START_DELAY;
    this.timer = setInterval(() => {
      this.schedule();
    }, MUSIC.tickMs);
    this.schedule();
  }

  private schedule(): void {
    const ctx = engine.ctx;
    const track = this.track;
    if (!ctx || !track || ctx.state !== 'running') return;
    const dt = stepSeconds(track);
    // Sekme uzun süre arka planda kaldıysa geri sar (birikmiş notalar bir anda çalmasın).
    if (this.nextTime < ctx.currentTime - dt) this.nextTime = ctx.currentTime + START_DELAY;
    while (this.nextTime < ctx.currentTime + MUSIC.lookaheadSeconds) {
      for (const e of this.events) {
        if (e.step === this.step) this.playNote(ctx, e, this.nextTime, dt);
      }
      this.nextTime += dt;
      this.step++;
      if (this.step >= STEPS_PER_BAR) {
        this.step = 0;
        this.bar++;
        this.events = buildBar(track, this.bar);
      }
    }
  }

  private playNote(ctx: AudioContext, e: NoteEvent, t: number, dt: number): void {
    const out = this.trackGain;
    if (!out) return;
    const v = MUSIC.voices;
    const len = e.length * dt;
    switch (e.inst) {
      case 'kick':
        this.osc(
          ctx,
          out,
          'sine',
          v.kick.from,
          v.kick.to,
          t,
          v.kick.duration,
          v.kick.volume * e.velocity,
          null,
        );
        return;
      case 'snare':
        this.noise(
          ctx,
          out,
          'bandpass',
          v.snare.hz,
          t,
          v.snare.duration,
          v.snare.volume * e.velocity,
        );
        this.osc(
          ctx,
          out,
          'triangle',
          v.snare.toneHz,
          v.snare.toneHz * HALF,
          t,
          v.snare.duration * HALF,
          v.snare.volume * HALF * e.velocity,
          null,
        );
        return;
      case 'hat':
        this.noise(
          ctx,
          out,
          'highpass',
          v.hat.hz,
          t,
          e.open === true ? v.hat.openDuration : v.hat.duration,
          v.hat.volume * e.velocity,
        );
        return;
      case 'bass':
        this.osc(
          ctx,
          out,
          'sawtooth',
          midiToHz(e.midi),
          null,
          t,
          Math.min(len, v.bass.duration),
          v.bass.volume,
          { cutoff: v.bass.cutoff },
        );
        return;
      case 'pad':
        for (const d of [-v.pad.detune, v.pad.detune]) {
          this.osc(
            ctx,
            out,
            'sawtooth',
            midiToHz(e.midi),
            null,
            t,
            len,
            v.pad.volume * e.velocity,
            { cutoff: v.pad.cutoff, attack: Math.min(v.pad.attack, len / 2), detune: d },
          );
        }
        return;
      case 'arp':
        this.osc(
          ctx,
          out,
          'square',
          midiToHz(e.midi),
          null,
          t,
          Math.min(len * 2, v.arp.duration),
          v.arp.volume,
          { cutoff: v.arp.cutoff, send: true },
        );
        return;
      case 'lead':
        this.osc(ctx, out, 'triangle', midiToHz(e.midi), null, t, len, v.lead.volume * e.velocity, {
          cutoff: v.lead.cutoff,
          send: true,
          vibrato: true,
        });
        return;
    }
  }

  private osc(
    ctx: AudioContext,
    out: AudioNode,
    type: OscillatorType,
    from: number,
    to: number | null,
    t: number,
    duration: number,
    volume: number,
    opts: {
      cutoff?: number;
      attack?: number;
      detune?: number;
      send?: boolean;
      vibrato?: boolean;
    } | null,
  ): void {
    const end = t + duration;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(to, end);
    if (opts?.detune !== undefined) osc.detune.value = opts.detune;
    let node: AudioNode = osc;
    if (opts?.cutoff !== undefined) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.cutoff;
      node = node.connect(f);
    }
    const env = engine.envelope(ctx, t, end, volume, opts?.attack);
    node.connect(env).connect(out);
    if (opts?.send === true && this.delaySend) env.connect(this.delaySend);
    if (opts?.vibrato === true) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = MUSIC.voices.lead.vibratoHz;
      const depth = ctx.createGain();
      depth.gain.value = MUSIC.voices.lead.vibratoCents;
      lfo.connect(depth).connect(osc.detune);
      lfo.start(t);
      lfo.stop(end);
    }
    osc.onended = () => {
      env.disconnect();
    };
    osc.start(t);
    osc.stop(end + STOP_PAD);
  }

  private noise(
    ctx: AudioContext,
    out: AudioNode,
    type: BiquadFilterType,
    hz: number,
    t: number,
    duration: number,
    volume: number,
  ): void {
    const buffer = engine.noiseBuffer('white');
    if (!buffer) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = hz;
    const env = ctx.createGain();
    env.gain.setValueAtTime(volume, t);
    env.gain.exponentialRampToValueAtTime(SILENCE, t + duration);
    src.connect(f).connect(env).connect(out);
    src.onended = () => {
      env.disconnect();
    };
    src.start(t, Math.random() * (buffer.duration - duration));
    src.stop(t + duration + STOP_PAD);
  }
}

const HALF = 0.5;
const MS = 1000;
const START_DELAY = 0.06;
const STOP_PAD = 0.05;
/** `setTargetAtTime` zaman sabiti: süre / 3 → süre sonunda ~%95. */
const FADE_CONSTANTS = 3;
const DUCK_IN = 0.08;
const DUCK_OUT = 0.6;

export const music = new Music();
