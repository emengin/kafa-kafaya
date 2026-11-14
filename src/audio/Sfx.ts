import { AUDIO, type PowerUpType, type SuperType } from '../config/gameConfig';
import { engine, SILENCE } from './AudioEngine';
import { midiToHz } from './musicPatterns';

export type WhistlePattern = keyof typeof AUDIO.whistle.patterns;

/** Aralıkta doğrusal: u = 0 → a, 1 → b. */
function lerp(range: readonly [number, number], u: number): number {
  return range[0] + (range[1] - range[0]) * u;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Çarpma hızından ses düzeyi oranı. */
function impactLevel(speed: number): number {
  return clamp01(speed / AUDIO.impactFullSpeed);
}

/**
 * Sentezlenmiş ses efektleri (harici dosya yok). Her ses birkaç osilatör ve süzülmüş gürültü
 * katmanından kurulur; vuruşun tonu güce göre değişir. Sık tekrar eden sesler (sekme, iniş,
 * kafa) en kısa aralıkla sınırlıdır; aynı anda çalan ses sayısı motorda sınırlıdır.
 */
class Sfx {
  private readonly lastPlayed = new Map<string, number>();

  /** Kullanıcı etkileşiminde ses kilidini açar. */
  unlock(): void {
    engine.unlock();
  }

  /** `key` sesi en son `gap` saniyeden önce çalındıysa true (ve zamanı kaydeder). */
  private gate(key: keyof typeof AUDIO.minGap): boolean {
    const now = engine.now;
    const last = this.lastPlayed.get(key) ?? -Infinity;
    if (now - last < AUDIO.minGap[key]) return false;
    this.lastPlayed.set(key, now);
    return true;
  }

  /** Hakem düdüğü: desen [çalma, sessizlik, çalma, …]. */
  whistle(pattern: WhistlePattern): void {
    const ctx = engine.ctx;
    const out = engine.bus('sfx');
    if (!ctx || !out || !engine.running) return;
    const w = AUDIO.whistle;
    let t = ctx.currentTime;
    w.patterns[pattern].forEach((duration, i) => {
      if (i % 2 === 0) this.blast(ctx, out, t, duration);
      t += duration;
    });
  }

  /** Şut: güç (0–1) arttıkça daha yüksek perdeden başlayan, daha uzun ve parlak "tok". */
  kick(power: number): void {
    const k = AUDIO.kick;
    const u = clamp01(power);
    engine.tone({
      type: 'sine',
      from: lerp(k.thumpFrom, u),
      to: lerp(k.thumpTo, u),
      duration: lerp(k.duration, u),
      volume: lerp(k.volume, u),
    });
    engine.noise({
      duration: k.clickDuration,
      volume: lerp(k.clickVolume, u),
      filter: 'bandpass',
      freq: lerp(k.clickHz, u),
      q: 1.2,
    });
    if (u > k.whooshFrom) {
      engine.noise({
        duration: k.whooshDuration,
        volume: (k.whooshVolume * (u - k.whooshFrom)) / (1 - k.whooshFrom),
        filter: 'bandpass',
        freq: WHOOSH_FROM,
        freqTo: WHOOSH_TO,
        q: 0.8,
        attack: k.whooshDuration * WHOOSH_ATTACK,
      });
    }
  }

  /** Kafa vuruşu: tok "bonk". */
  header(power: number): void {
    if (!this.gate('header')) return;
    const h = AUDIO.header;
    const u = clamp01(power);
    engine.tone({
      type: 'triangle',
      from: h.from * (1 + u * PITCH_BEND),
      to: h.to,
      duration: h.duration,
      volume: h.volume * (HALF + HALF * u),
    });
    engine.noise({
      duration: CLICK,
      volume: h.clickVolume,
      filter: 'bandpass',
      freq: h.clickHz,
      q: 1,
    });
  }

  /** Top oyuncunun gövdesine çarptı (yumuşak "püf"). */
  touch(speed: number): void {
    if (!this.gate('touch')) return;
    const t = AUDIO.touch;
    engine.tone({
      type: 'sine',
      from: t.from,
      to: t.to,
      duration: t.duration,
      volume: t.volume * impactLevel(speed),
    });
  }

  /** Direk: uyumsuz kısmi tonlarla metalik "dang". */
  post(speed: number): void {
    if (!this.gate('post')) return;
    const p = AUDIO.post;
    const level = HALF + HALF * impactLevel(speed);
    p.partials.forEach((ratio, i) => {
      engine.tone({
        type: 'sine',
        from: p.base * ratio,
        duration: p.decays[i] ?? HALF,
        volume: (p.gains[i] ?? 0) * level,
        attack: 0.002,
      });
    });
    engine.noise({
      duration: CLICK,
      volume: p.clickVolume * level,
      filter: 'highpass',
      freq: p.clickHz,
    });
  }

  /** Top zemine sekti. */
  bounce(speed: number): void {
    if (!this.gate('bounce')) return;
    const b = AUDIO.bounce;
    const level = impactLevel(speed);
    engine.tone({
      type: 'sine',
      from: b.from,
      to: b.to,
      duration: b.duration,
      volume: b.volume * level,
    });
    engine.noise({
      duration: b.duration,
      volume: b.volume * level * HALF,
      filter: 'lowpass',
      freq: b.noiseHz,
    });
  }

  /** Top duvara/tavana çarptı. */
  wall(speed: number): void {
    if (!this.gate('bounce')) return;
    const w = AUDIO.wall;
    const level = impactLevel(speed);
    engine.tone({
      type: 'triangle',
      from: w.from,
      to: w.to,
      duration: w.duration,
      volume: w.volume * level,
    });
    engine.noise({
      duration: w.duration,
      volume: w.volume * level * HALF,
      filter: 'bandpass',
      freq: w.noiseHz,
    });
  }

  /** Top ağa gömüldü: süzgeci kayan "fışşş". */
  net(speed: number): void {
    if (!this.gate('net')) return;
    const n = AUDIO.net;
    engine.noise({
      duration: n.duration,
      volume: n.volume * (HALF + HALF * impactLevel(speed)),
      filter: 'bandpass',
      freq: n.fromHz,
      freqTo: n.toHz,
      q: n.q,
      attack: NET_ATTACK,
    });
  }

  /** Zıplama ("hup"); çift zıplamada daha parlak. */
  jump(air: boolean): void {
    const j = AUDIO.jump;
    engine.tone({
      type: air ? 'triangle' : 'sine',
      from: air ? j.airFrom : j.from,
      to: air ? j.airTo : j.to,
      duration: j.duration,
      volume: j.volume,
    });
    engine.noise({
      duration: j.duration,
      volume: j.volume * HALF,
      filter: 'highpass',
      freq: JUMP_AIR,
    });
  }

  /** İniş: düşüş hızıyla tok "küt". */
  land(speed: number): void {
    if (!this.gate('land')) return;
    const l = AUDIO.land;
    const level = impactLevel(speed);
    engine.tone({
      type: 'sine',
      from: l.from,
      to: l.to,
      duration: l.duration,
      volume: l.volume * level,
    });
    engine.noise({
      duration: l.duration,
      volume: l.volume * level * HALF,
      filter: 'lowpass',
      freq: l.noiseHz,
    });
  }

  /** Balon patlaması. */
  pop(): void {
    const p = AUDIO.pop;
    engine.noise({ duration: p.duration, volume: p.volume, filter: 'highpass', freq: p.filterHz });
  }

  /** Güçlendirici kazanıldı: yükselen parlak arpej (türe göre perde). */
  powerUp(type: PowerUpType): void {
    const p = AUDIO.powerUp;
    const shift = POWER_UP_SHIFT[type];
    p.notes.forEach((midi, i) => {
      engine.tone({
        type: 'triangle',
        from: midiToHz(midi + shift),
        duration: p.decay,
        volume: p.volume,
        delay: i * p.gap,
      });
    });
    if (type === 'freezeOpponent') this.freeze();
  }

  /** Donma: art arda yüksek, buz gibi tonlar. */
  freeze(): void {
    const f = AUDIO.freeze;
    f.tones.forEach((hz, i) => {
      engine.tone({
        type: 'triangle',
        from: hz,
        duration: f.toneDuration * 2,
        volume: f.volume,
        delay: i * f.toneDuration,
      });
    });
    engine.noise({
      duration: f.toneDuration * f.tones.length,
      volume: f.volume,
      filter: 'highpass',
      freq: FREEZE_HISS,
    });
  }

  /** Süper hazır: yükselen parıltı + çan. */
  superArmed(): void {
    const s = AUDIO.superArmed;
    engine.tone({
      type: 'sawtooth',
      from: s.from,
      to: s.to,
      duration: s.duration,
      volume: s.volume,
      filter: 'lowpass',
      cutoff: s.to,
      attack: s.duration / 2,
    });
    engine.tone({
      type: 'sine',
      from: midiToHz(s.chime),
      duration: s.duration * 2,
      volume: s.volume,
      delay: s.duration * CHIME_AT,
    });
  }

  /** Her süper şut tipine özel ses. */
  superShot(type: SuperType): void {
    const v = AUDIO.superVolume;
    switch (type) {
      case 'fire':
        // Kükreyen alev: süzgeci açılan gürültü + boğuk testere.
        engine.noise({
          duration: LONG,
          volume: v,
          filter: 'lowpass',
          freq: FIRE_FROM,
          freqTo: FIRE_TO,
          attack: SHORT,
        });
        engine.tone({
          type: 'sawtooth',
          from: FIRE_GROWL,
          to: FIRE_GROWL * 2,
          duration: LONG,
          volume: v * HALF,
          filter: 'lowpass',
          cutoff: FIRE_CUT,
        });
        return;
      case 'ice':
        // Kristal pırıltı: aşağı inen yüksek tonlar + tıslama.
        AUDIO.superNotes.ice.forEach((m, i) => {
          engine.tone({
            type: 'sine',
            from: midiToHz(m),
            duration: MID,
            volume: v * HALF,
            delay: i * ICE_GAP,
          });
        });
        engine.noise({ duration: MID, volume: v * HALF, filter: 'highpass', freq: FREEZE_HISS });
        return;
      case 'zigzag':
        // Elektrik çarpması: hızlı frekans titreşimli kare dalga + çıtırtı.
        engine.tone({
          type: 'square',
          from: ZAP_FROM,
          to: ZAP_TO,
          duration: MID,
          volume: v * ZAP_GAIN,
          filter: 'lowpass',
          cutoff: ZAP_CUT,
        });
        engine.tone({
          type: 'sawtooth',
          from: ZAP_TO,
          to: ZAP_FROM,
          duration: SHORT * 2,
          volume: v * ZAP_GAIN,
          delay: SHORT,
        });
        engine.noise({
          duration: MID,
          volume: v * HALF,
          filter: 'bandpass',
          freq: ZAP_CRACKLE,
          q: 3,
        });
        return;
      case 'teleport':
        // Bilim kurgu "vuup": inip çıkan sinüs.
        engine.tone({
          type: 'sine',
          from: WARP_HIGH,
          to: WARP_LOW,
          duration: SHORT * 2,
          volume: v,
        });
        engine.tone({
          type: 'sine',
          from: WARP_LOW,
          to: WARP_HIGH * 2,
          duration: SHORT * 2,
          volume: v,
          delay: SHORT * 2,
        });
        return;
      case 'giant':
        // Derin gümbürtü.
        engine.tone({
          type: 'sine',
          from: BOOM_FROM,
          to: BOOM_TO,
          duration: LONG,
          volume: v * BOOM_GAIN,
        });
        engine.noise({ duration: MID, volume: v, filter: 'lowpass', freq: BOOM_NOISE });
        return;
      case 'tornado':
        // Uğuldayan rüzgâr: süzgeci salınan gürültü.
        engine.noise({
          duration: LONG * 2,
          volume: v * WIND_GAIN,
          filter: 'bandpass',
          freq: WIND_FROM,
          freqTo: WIND_TO,
          q: 2.5,
          attack: MID,
        });
        engine.noise({
          duration: LONG * 2,
          volume: v * WIND_GAIN * HALF,
          filter: 'bandpass',
          freq: WIND_TO,
          freqTo: WIND_FROM,
          q: 4,
          attack: MID,
        });
        return;
      case 'rainbow':
        // Sihirli arp glissandosu (pentatonik).
        AUDIO.superNotes.rainbow.forEach((m, i) => {
          engine.tone({
            type: 'triangle',
            from: midiToHz(m),
            duration: MID,
            volume: v * HALF,
            delay: i * RAINBOW_GAP,
          });
        });
        return;
      case 'magnet':
        // Çekim uğultusu: perdesi yükselen boğuk testere.
        engine.tone({
          type: 'sawtooth',
          from: MAGNET_FROM,
          to: MAGNET_TO,
          duration: LONG,
          volume: v * HALF,
          filter: 'lowpass',
          cutoff: MAGNET_CUT,
          q: 8,
        });
        engine.tone({
          type: 'sine',
          from: MAGNET_FROM * 2,
          to: MAGNET_TO * 2,
          duration: LONG,
          volume: v * HALF,
          detune: MAGNET_DETUNE,
        });
        return;
      case 'mirage':
        // Ayrışan üç ton (bölünme).
        for (const d of AUDIO.superNotes.mirageSplit) {
          engine.tone({
            type: 'sine',
            from: MIRAGE_HZ,
            to: MIRAGE_HZ * (1 + d),
            duration: MID,
            volume: v * MIRAGE_GAIN,
          });
        }
        return;
      case 'quake':
        // Yer sarsıntısı: alçak gürültü + alt bas.
        engine.noise({
          duration: LONG * 2,
          volume: v,
          filter: 'lowpass',
          freq: QUAKE_NOISE,
          attack: SHORT,
        });
        engine.tone({
          type: 'sine',
          from: QUAKE_SUB,
          to: QUAKE_SUB * HALF,
          duration: LONG * 2,
          volume: v,
        });
        return;
    }
  }

  /** Süper etkisi rakibe değdi. */
  superHit(type: SuperType): void {
    if (type === 'ice') this.freeze();
    else if (type === 'fire') {
      engine.noise({
        duration: MID,
        volume: AUDIO.superVolume,
        filter: 'bandpass',
        freq: FIRE_TO,
        q: HALF,
        attack: CLICK,
      });
    } else if (type === 'quake') this.superShot('quake');
  }

  /** Menüde gezinme ve seçim. */
  menuMove(): void {
    const m = AUDIO.menu;
    engine.tone({ type: 'sine', from: m.moveHz, duration: m.duration, volume: m.moveVolume });
  }

  menuSelect(): void {
    const m = AUDIO.menu;
    engine.tone({
      type: 'square',
      from: m.selectFrom,
      duration: m.duration,
      volume: m.selectVolume,
      filter: 'lowpass',
      cutoff: m.selectTo * 2,
    });
    engine.tone({
      type: 'square',
      from: m.selectTo,
      duration: m.duration * 2,
      volume: m.selectVolume,
      filter: 'lowpass',
      cutoff: m.selectTo * 2,
      delay: m.duration,
    });
  }

  menuBack(): void {
    const m = AUDIO.menu;
    engine.tone({
      type: 'square',
      from: m.selectTo,
      duration: m.duration,
      volume: m.selectVolume,
      filter: 'lowpass',
      cutoff: m.selectTo * 2,
    });
    engine.tone({
      type: 'square',
      from: m.selectFrom,
      duration: m.duration * 2,
      volume: m.selectVolume,
      filter: 'lowpass',
      cutoff: m.selectTo * 2,
      delay: m.duration,
    });
  }

  /** Son saniyeler: tık (son 3 sn daha yüksek). */
  countdown(final: boolean): void {
    const c = AUDIO.countdown;
    engine.tone({
      type: 'triangle',
      from: final ? c.finalHz : c.hz,
      duration: c.duration,
      volume: c.volume,
    });
  }

  /** Stadyum kornası (gol): akort dışı üç testere, boğuk süzgeç. */
  horn(): void {
    const h = AUDIO.horn;
    for (const m of h.notes) {
      for (const d of [-h.detune, h.detune]) {
        engine.tone({
          type: 'sawtooth',
          from: midiToHz(m),
          duration: h.duration,
          volume: h.volume,
          attack: HORN_ATTACK,
          filter: 'lowpass',
          cutoff: h.cutoff,
          detune: d,
        });
      }
    }
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
    env.gain.linearRampToValueAtTime(SILENCE, end);
    tone.connect(env).connect(out);
    tone.start(start);
    trill.start(start);
    tone.stop(end);
    trill.stop(end);
  }
}

// Ses tasarımı sabitleri (perde ve süre oranları; düzeyler AUDIO'da).
const HALF = 0.5;
const CLICK = 0.03;
const SHORT = 0.12;
const MID = 0.35;
const LONG = 0.6;
const PITCH_BEND = 0.25;
const WHOOSH_FROM = 2400;
const WHOOSH_ATTACK = 0.33;
const WHOOSH_TO = 700;
const NET_ATTACK = 0.03;
const JUMP_AIR = 1600;
const FREEZE_HISS = 5200;
const CHIME_AT = 0.7;
const FIRE_FROM = 300;
const FIRE_TO = 2600;
const FIRE_GROWL = 70;
const FIRE_CUT = 600;
const ICE_GAP = 0.05;
const ZAP_FROM = 180;
const ZAP_TO = 900;
const ZAP_CUT = 2400;
const ZAP_GAIN = 0.35;
const ZAP_CRACKLE = 3800;
const WARP_HIGH = 1400;
const WARP_LOW = 160;
const BOOM_FROM = 120;
const BOOM_TO = 32;
const BOOM_GAIN = 1.4;
const BOOM_NOISE = 240;
const WIND_FROM = 380;
const WIND_TO = 1200;
/** Dar bantlı rüzgâr gürültüsü kısık kalır: kazanç. */
const WIND_GAIN = 2.6;
const RAINBOW_GAP = 0.04;
const MAGNET_FROM = 90;
const MAGNET_TO = 240;
const MAGNET_CUT = 900;
const MAGNET_DETUNE = 15;
const MIRAGE_HZ = 880;
const MIRAGE_GAIN = 0.4;
const QUAKE_NOISE = 160;
const QUAKE_SUB = 46;
const HORN_ATTACK = 0.05;
/** Güçlendirici arpejinin türe göre perde kayması (yarım ton). */
const POWER_UP_SHIFT: Readonly<Record<PowerUpType, number>> = {
  bigHead: -5,
  shrinkOpponent: 2,
  speed: 7,
  growGoal: -2,
  freezeOpponent: 12,
  doubleJump: 5,
};

export const sfx = new Sfx();
