import { afterEach, describe, expect, it } from 'vitest';
import { AudioEngine } from '../audio/AudioEngine';
import { AUDIO, CONTROLS, LIFECYCLE, SYSTEM_CODES } from '../config/gameConfig';
import { KeyTracker } from '../input/KeyboardInput';
import { pressVirtual, releaseVirtual } from '../input/virtualKeys';

/** Web Audio'nun motorun kullandığı kadarını taklit eden sahte bağlam. */
class FakeParam {
  value = 0;
  setTargetAtTime(v: number): void {
    this.value = v;
  }
}

class FakeNode {
  readonly gain = new FakeParam();
  readonly threshold = new FakeParam();
  readonly knee = new FakeParam();
  readonly ratio = new FakeParam();
  readonly attack = new FakeParam();
  readonly release = new FakeParam();
  connect<T>(node: T): T {
    return node;
  }
}

const SAMPLE_RATE = 8000;

class FakeContext {
  static last: FakeContext | null = null;
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  readonly currentTime = 0;
  readonly sampleRate = SAMPLE_RATE;
  readonly destination = new FakeNode();
  readonly gains: FakeNode[] = [];

  constructor() {
    FakeContext.last = this;
  }

  createDynamicsCompressor(): FakeNode {
    return new FakeNode();
  }

  createGain(): FakeNode {
    const g = new FakeNode();
    this.gains.push(g);
    return g;
  }

  createBuffer(_channels: number, length: number): { getChannelData: () => Float32Array } {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }

  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }

  suspend(): Promise<void> {
    this.state = 'suspended';
    return Promise.resolve();
  }
}

function withFakeAudio(): FakeContext {
  Reflect.set(globalThis, 'AudioContext', FakeContext);
  const engine = new AudioEngine();
  engine.unlock();
  const ctx = FakeContext.last;
  if (!ctx) throw new Error('bağlam kurulmadı');
  Reflect.set(ctx, 'engine', engine);
  return ctx;
}

function engineOf(ctx: FakeContext): AudioEngine {
  return Reflect.get(ctx, 'engine') as AudioEngine;
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'AudioContext');
  FakeContext.last = null;
});

describe('Ses kesintileri (Faz 2.5)', () => {
  it('her neden kalkana kadar ses askıda kalır (arka plan + telefon çağrısı)', () => {
    const ctx = withFakeAudio();
    const engine = engineOf(ctx);
    expect(ctx.state).toBe('running');
    engine.setHold('background', true);
    expect(ctx.state).toBe('suspended');
    engine.setHold('focus', true);
    engine.setHold('background', false);
    expect(ctx.state).toBe('suspended');
    expect(engine.held).toBe(true);
    engine.setHold('focus', false);
    expect(ctx.state).toBe('running');
    expect(engine.held).toBe(false);
  });

  it('kesinti sürerken dokunuş sesi açmaz; kesinti bitince ses kendiliğinden sürer', () => {
    Reflect.set(globalThis, 'AudioContext', FakeContext);
    const engine = new AudioEngine();
    engine.setHold('focus', true);
    engine.unlock();
    const ctx = FakeContext.last;
    expect(ctx?.state).toBe('suspended');
    engine.unlock();
    expect(ctx?.state).toBe('suspended');
    engine.setHold('focus', false);
    expect(ctx?.state).toBe('running');
  });

  it('bildirim sesinde ana ses kısılır, bitince eski düzeyine döner', () => {
    const ctx = withFakeAudio();
    const engine = engineOf(ctx);
    const master = ctx.gains[0];
    const full = engine.settings.master * AUDIO.masterGain;
    expect(master?.gain.value).toBeCloseTo(full);
    engine.setDucked(true);
    expect(master?.gain.value).toBeCloseTo(full * LIFECYCLE.duckGain);
    engine.setDucked(false);
    expect(master?.gain.value).toBeCloseTo(full);
  });
});

describe('Android geri tuşu (Faz 2.5)', () => {
  it('geri tuşu menülerde "geri", maçta "duraklat" listesinde (Esc ile aynı)', () => {
    expect(CONTROLS.ui.menuBack).toContain(SYSTEM_CODES.back);
    expect(CONTROLS.ui.pause).toContain(SYSTEM_CODES.back);
    expect(CONTROLS.ui.menuBack).toContain('Escape');
    expect(CONTROLS.ui.pause).toContain('Escape');
  });

  it('basılıp hemen bırakılan sistem geri tuşu bir kez yakalanır (latch)', () => {
    const tracker = new KeyTracker(new EventTarget(), new Set()).attach();
    pressVirtual(SYSTEM_CODES.back);
    releaseVirtual(SYSTEM_CODES.back);
    expect(tracker.consumeAny(CONTROLS.ui.menuBack)).toBe(true);
    expect(tracker.consumeAny(CONTROLS.ui.menuBack)).toBe(false);
    tracker.detach();
  });
});
