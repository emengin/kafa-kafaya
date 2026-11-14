import { describe, expect, it } from 'vitest';
import { ANIM, JUICE, NET, QUALITY } from '../config/gameConfig';
import { BodyAnimator, type BodyMotion } from './BodyAnimator';
import { FaceController, type FaceContext } from './FaceController';
import {
  CameraRig,
  HitStop,
  hitStopForSpeed,
  isLowPowerDevice,
  parseQuality,
  QualityGovernor,
  rememberQuality,
  ScreenShake,
  sessionQuality,
} from './feel';
import { NetSim } from './NetSim';
import { frameIndex, PARTICLE_FRAMES, ParticlePool } from './ParticlePool';
import { approach, Spring } from './Spring';

const DT = 1 / 60;

function run(n: number, fn: (i: number) => void): void {
  for (let i = 0; i < n; i++) fn(i);
}

describe('ParticlePool — nesne havuzu', () => {
  it('doğar, yerçekimi ve sürüklemeyle hareket eder, ömrü dolunca ölür', () => {
    const pool = new ParticlePool(8);
    const i = pool.spawn();
    pool.vx[i] = 100;
    pool.gravity[i] = 1000;
    pool.life[i] = 0.5;
    pool.update(0.1);
    expect(pool.count).toBe(1);
    expect(pool.x[i]).toBeCloseTo(10, 4);
    expect(pool.vy[i]).toBeCloseTo(100, 4);
    expect(pool.progress(i)).toBeCloseTo(0.2, 5);
    pool.update(0.5);
    expect(pool.count).toBe(0);
  });

  it('sürükleme hızı azaltır', () => {
    const pool = new ParticlePool(2);
    const i = pool.spawn();
    pool.vx[i] = 100;
    pool.drag[i] = 5;
    pool.life[i] = 10;
    pool.update(0.1);
    expect(pool.vx[i]).toBeLessThan(100);
    expect(pool.vx[i]).toBeGreaterThan(0);
  });

  it('kapasiteyi asla aşmaz; doluyken eski parçacıkları geri dönüştürür', () => {
    const pool = new ParticlePool(5);
    run(12, (k) => {
      const i = pool.spawn();
      pool.x[i] = k;
      pool.life[i] = 10;
    });
    expect(pool.count).toBe(5);
    // Son yazılanlar havuzda; ilk yazılanlardan bazıları geri dönüştürüldü.
    const xs = Array.from(pool.x.slice(0, pool.count));
    expect(xs).toContain(11);
    expect(xs).not.toContain(0);
  });

  it('ölen parçacığın yerine sonuncusu taşınır (yoğun dizi)', () => {
    const pool = new ParticlePool(4);
    const a = pool.spawn();
    pool.life[a] = 0.05;
    pool.x[a] = 1;
    const b = pool.spawn();
    pool.life[b] = 1;
    pool.x[b] = 2;
    pool.color[b] = 0xff0000;
    pool.update(0.1);
    expect(pool.count).toBe(1);
    expect(pool.x[0]).toBeCloseTo(2, 5);
    expect(pool.color[0]).toBe(0xff0000);
  });

  it('etkin sınır küçülünce fazlası silinir (kalite düşüşü)', () => {
    const pool = new ParticlePool(10);
    run(10, () => {
      const i = pool.spawn();
      pool.life[i] = 5;
    });
    pool.setLimit(4);
    expect(pool.count).toBe(4);
    run(10, () => {
      pool.spawn();
    });
    expect(pool.count).toBe(4);
    expect(pool.activeLimit).toBe(4);
  });

  it('kare adları ve dizinleri tutarlı', () => {
    expect(frameIndex('dot')).toBe(0);
    expect(frameIndex(PARTICLE_FRAMES[PARTICLE_FRAMES.length - 1] ?? 'dot')).toBe(
      PARTICLE_FRAMES.length - 1,
    );
  });
});

describe('NetSim — kale ağı dalgalanması', () => {
  const make = (): NetSim => {
    const net = new NetSim(7, 15);
    net.setSize(90, 210);
    return net;
  };

  it('darbe yalnızca yakın düğümleri hareket ettirir; kenarlar sabit kalır', () => {
    const net = make();
    net.impulse(45, 105, -600, 0);
    net.update(DT);
    expect(net.active).toBe(true);
    const mid = 7 * net.cols + 3;
    expect(net.ox[mid]).toBeLessThan(0);
    // Uzak köşe ve kenar düğümleri yerinde.
    expect(net.ox[1 * net.cols + 1]).toBeCloseTo(0, 6);
    expect(net.ox[0]).toBe(0);
    expect(net.ox[net.cols - 1]).toBe(0);
  });

  it('dalga komşulara yayılır, sonra söner ve ağ durur', () => {
    const net = make();
    net.impulse(45, 105, -900, 300);
    let spread = false;
    run(30, () => {
      net.update(DT);
      if (Math.abs(net.ox[11 * net.cols + 3] ?? 0) > 0.01) spread = true;
    });
    expect(spread).toBe(true);
    run(600, () => {
      net.update(DT);
    });
    expect(net.active).toBe(false);
    expect(net.energy()).toBe(0);
  });

  it('sapma sınırı aşılmaz (büyük darbede bile)', () => {
    const net = make();
    net.impulse(45, 105, -50000, 50000);
    run(20, () => {
      net.update(DT);
    });
    for (const v of net.ox) expect(Math.abs(v)).toBeLessThanOrEqual(NET.maxOffsetPx + 1e-6);
  });

  it('büyük kare süresinde bile kararlı (alt adımlar)', () => {
    const net = make();
    net.impulse(45, 105, -600, 0);
    run(10, () => {
      net.update(0.1);
    });
    expect(Number.isFinite(net.energy())).toBe(true);
  });
});

describe('Spring ve approach', () => {
  it('yay hedefe sönerek yerleşir', () => {
    const s = new Spring(200, 14);
    s.kick(5);
    run(240, () => {
      s.update(DT);
    });
    expect(Math.abs(s.value)).toBeLessThan(1e-3);
  });

  it('approach kare hızından bağımsız', () => {
    let a = 0;
    let b = 0;
    run(60, () => {
      a = approach(a, 1, 5, 1 / 60);
    });
    run(120, () => {
      b = approach(b, 1, 5, 1 / 120);
    });
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('BodyAnimator — squash & stretch', () => {
  const idle: BodyMotion = {
    grounded: true,
    vx: 0,
    vy: 0,
    maxSpeed: 430,
    facing: 1,
    kick: 0,
    frozen: false,
  };

  it('zıplamada esner, inişte basılır, sonra normale döner', () => {
    const a = new BodyAnimator();
    a.onJump();
    a.update(DT, { ...idle, grounded: false, vy: -900 });
    expect(a.scaleY).toBeGreaterThan(1);
    expect(a.scaleX).toBeLessThan(1);
    const b = new BodyAnimator();
    b.onLand(1300);
    run(3, () => {
      b.update(DT, idle);
    });
    expect(b.scaleY).toBeLessThan(1);
    expect(b.scaleX).toBeGreaterThan(1);
    run(180, () => {
      b.update(DT, idle);
    });
    expect(b.scaleY).toBeCloseTo(1, 2);
  });

  it('koşarken adım sallanması ve hız yönünde eğilme', () => {
    const a = new BodyAnimator();
    let minBob = 0;
    run(60, () => {
      a.update(DT, { ...idle, vx: 430 });
      minBob = Math.min(minBob, a.bobY);
    });
    expect(minBob).toBeLessThan(-ANIM.run.bobPx * 0.5);
    expect(a.lean).toBeGreaterThan(ANIM.lean.maxRad * 0.8);
  });

  it('şut savrulmasında geriye yaslanır; donmuşken kıpırdamaz', () => {
    const a = new BodyAnimator();
    run(30, () => {
      a.update(DT, { ...idle, kick: 1 });
    });
    expect(a.lean).toBeLessThan(0);
    const f = new BodyAnimator();
    run(30, () => {
      f.update(DT, { ...idle, vx: 430, frozen: true });
    });
    expect(Math.abs(f.bobY)).toBe(0);
    expect(Math.abs(f.lean)).toBeLessThan(1e-6);
  });
});

describe('FaceController — ifadeler, göz kırpma, bakış', () => {
  const ctx: FaceContext = { frozen: false, straining: false, armed: false };
  /** Tohumlu PRNG (testler tekrarlanabilir). */
  const seeded = (): (() => number) => {
    let s = 1;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  };

  it('öncelik: donma > şaşkınlık > sevinç > üzüntü > efor > sırıtma > normal', () => {
    const f = new FaceController(seeded());
    f.update(DT, ctx);
    expect(f.expression).toBe('neutral');
    f.update(DT, { ...ctx, armed: true });
    expect(f.expression).toBe('grin');
    f.update(DT, { ...ctx, armed: true, straining: true });
    expect(f.expression).toBe('effort');
    f.trigger('sad', 1);
    f.update(DT, { ...ctx, straining: true });
    expect(f.expression).toBe('sad');
    f.trigger('happy', 1);
    f.update(DT, ctx);
    expect(f.expression).toBe('happy');
    f.trigger('shocked', 0.5);
    f.update(DT, ctx);
    expect(f.expression).toBe('shocked');
    f.update(DT, { ...ctx, frozen: true });
    expect(f.expression).toBe('frozen');
  });

  it('süreli ifadeler süresi dolunca biter; kalıcı ifade sürer', () => {
    const f = new FaceController(seeded());
    f.trigger('happy', ANIM.expressions.happySeconds);
    run(Math.ceil(ANIM.expressions.happySeconds * 60) + 2, () => {
      f.update(DT, ctx);
    });
    expect(f.expression).toBe('neutral');
    f.setPersistent('sad');
    run(600, () => {
      f.update(DT, ctx);
    });
    expect(f.expression).toBe('sad');
  });

  it('göz kırpar (aralıklarla) ve donmuşken kırpmaz', () => {
    const f = new FaceController(seeded());
    let blinks = 0;
    let wasClosed = false;
    run(60 * 20, () => {
      f.update(DT, ctx);
      const closed = f.blink > 0.5;
      if (closed && !wasClosed) blinks++;
      wasClosed = closed;
    });
    const minExpected = Math.floor(20 / ANIM.blink.maxInterval);
    expect(blinks).toBeGreaterThanOrEqual(minExpected);
    expect(blinks).toBeLessThanOrEqual(Math.ceil((20 / ANIM.blink.minInterval) * 2) + 1);
    const frozen = new FaceController(seeded());
    let anyBlink = false;
    run(60 * 10, () => {
      frozen.update(DT, { ...ctx, frozen: true });
      if (frozen.blink > 0) anyBlink = true;
    });
    expect(anyBlink).toBe(false);
  });

  it('gözler hedefe yumuşakça döner ve birim çemberde kalır', () => {
    const f = new FaceController(seeded());
    f.lookAt(10, 0);
    f.update(DT, ctx);
    expect(f.lookX).toBeGreaterThan(0);
    expect(f.lookX).toBeLessThan(1);
    run(120, () => {
      f.update(DT, ctx);
    });
    expect(f.lookX).toBeCloseTo(1, 3);
  });
});

describe('Oyun hissi — hit-stop, sarsıntı, kamera, kalite', () => {
  it('hit-stop süresince simülasyona süre akmaz, bitince artan kısım akar', () => {
    const h = new HitStop();
    h.trigger(50);
    expect(h.filter(16)).toBe(0);
    expect(h.filter(16)).toBe(0);
    expect(h.filter(16)).toBe(0);
    expect(h.filter(16)).toBeCloseTo(14, 6);
    expect(h.active).toBe(false);
    expect(h.filter(16)).toBe(16);
  });

  it('hit-stop sert vuruşlarda 40–60 ms aralığında', () => {
    const h = JUICE.hitStop;
    expect(hitStopForSpeed(h.hardHitSpeed - 1, 2000)).toBe(0);
    expect(hitStopForSpeed(h.hardHitSpeed, 2000)).toBe(h.minMs);
    expect(hitStopForSpeed(2000, 2000)).toBe(h.maxMs);
    expect(h.minMs).toBeGreaterThanOrEqual(40);
    expect(Math.max(h.maxMs, h.superMs, h.goalMs)).toBeLessThanOrEqual(60);
  });

  it('sarsıntı travmanın karesiyle ölçeklenir ve söner', () => {
    const s = new ScreenShake();
    s.add(0.3);
    let small = 0;
    run(10, () => {
      s.update(DT);
      small = Math.max(small, Math.abs(s.offsetX), Math.abs(s.offsetY));
    });
    const b = new ScreenShake();
    b.add(1);
    let big = 0;
    run(10, () => {
      b.update(DT);
      big = Math.max(big, Math.abs(b.offsetX), Math.abs(b.offsetY));
    });
    expect(big).toBeGreaterThan(small * 3);
    expect(big).toBeLessThanOrEqual(JUICE.shake.maxOffsetPx);
    run(120, () => {
      b.update(DT);
    });
    expect(b.trauma).toBe(0);
    expect(Math.abs(b.offsetX)).toBe(0);
  });

  it('kamera yakınlaşması odağı yerinde tutar ve görünür alan dünyanın içinde kalır', () => {
    const cam = new CameraRig(1280, 720);
    cam.punchIn(1.1, 90, 530, 0.5);
    run(60, () => {
      cam.update(DT);
    });
    // Odak noktası ekranda aynı yerde.
    expect(90 * cam.zoom + cam.offsetX).toBeCloseTo(90, 6);
    // Ekranın köşeleri dünyanın içine düşer.
    expect((0 - cam.offsetX) / cam.zoom).toBeGreaterThanOrEqual(0);
    expect((1280 - cam.offsetX) / cam.zoom).toBeLessThanOrEqual(1280);
    expect((720 - cam.offsetY) / cam.zoom).toBeLessThanOrEqual(720);
    run(180, () => {
      cam.update(DT);
    });
    expect(cam.zoom).toBe(1);
  });

  it('kalite yalnızca bütçe süre boyunca aşılınca düşer; dev kareler sayılmaz', () => {
    const q = new QualityGovernor(2);
    run(600, () => {
      q.sample(16.6);
    });
    expect(q.level).toBe(2);
    run(10, () => {
      q.sample(QUALITY.ignoreFrameMs + 50);
    });
    expect(q.level).toBe(2);
    let dropped = false;
    for (let i = 0; i < 60 * 8 && !dropped; i++) dropped = q.sample(30);
    expect(dropped).toBe(true);
    expect(q.level).toBe(1);
    const fixed = new QualityGovernor(2, true);
    run(60 * 10, () => {
      fixed.sample(40);
    });
    expect(fixed.level).toBe(2);
  });

  it('kalite parametresi ayrıştırılır', () => {
    expect(parseQuality('low')).toBe(0);
    expect(parseQuality('medium')).toBe(1);
    expect(parseQuality('high')).toBe(2);
    expect(parseQuality('ultra')).toBeNull();
  });
});

describe('Düşük güçlü cihaz ve oturum kalitesi', () => {
  it('az çekirdek ya da az bellek düşük güçlü sayılır; bilgi yoksa değil', () => {
    expect(isLowPowerDevice({ hardwareConcurrency: 2 })).toBe(true);
    expect(isLowPowerDevice({ hardwareConcurrency: 8, deviceMemory: 2 })).toBe(true);
    expect(isLowPowerDevice({ hardwareConcurrency: 8, deviceMemory: 8 })).toBe(false);
    expect(isLowPowerDevice({})).toBe(false);
  });

  it('oturumda öğrenilen kademe hatırlanır', () => {
    const before = sessionQuality();
    rememberQuality(1);
    expect(sessionQuality()).toBe(1);
    rememberQuality(before);
  });
});
