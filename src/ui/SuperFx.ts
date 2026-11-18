import Phaser from 'phaser';
import { FX_KEYS } from '../art/fxArt';
import { FX, SUPER_FX, type ParticlePresetName, type SuperType } from '../config/gameConfig';
import type { QualityLevel } from '../fx/feel';
import type { BallView } from './BallView';
import type { ParticleLayer, SpritePool } from './ParticleLayer';
import { strokeArc } from './shapes';
import { LiteGraphics } from './LiteGraphics';

/** Sık kullanılan renk. */
const WHITE = 0xffffff;

const TWO_PI = Math.PI * 2;

/** Her süper tipinin topu takip eden parçacık izi. */
const TRAIL_PRESET: Readonly<Record<SuperType, ParticlePresetName | null>> = {
  fire: 'fireTrail',
  ice: 'iceTrail',
  zigzag: 'zigzagSpark',
  teleport: 'teleportSwirl',
  giant: 'runDust',
  tornado: 'tornadoLeaf',
  rainbow: 'rainbowStar',
  magnet: 'magnetSpark',
  mirage: 'mirageShimmer',
  quake: 'quakeDust',
};

/** Atış anındaki patlama. */
const LAUNCH_PRESET: Readonly<Record<SuperType, ParticlePresetName>> = {
  fire: 'fireBurst',
  ice: 'iceBurst',
  zigzag: 'kickSpark',
  teleport: 'teleportSwirl',
  giant: 'rockDebris',
  tornado: 'tornadoLeaf',
  rainbow: 'popSparkle',
  magnet: 'kickSpark',
  mirage: 'miragePoof',
  quake: 'quakeDust',
};

/** İz şeridi olan tipler (renkli, sönen). */
const RIBBON: ReadonlySet<SuperType> = new Set<SuperType>([
  'fire',
  'ice',
  'magnet',
  'mirage',
  'zigzag',
]);

/**
 * Süper şut görselleri: top arkasında tipin renginde parlama, tipine özel parçacık izi ve
 * çizimler — Ateş alev ve duman, Buz kar taneleri, Zikzak şimşek çizgisi, Işınlanma girdabı,
 * Dev Top toz, Kasırga dönen yaylar ve yapraklar, Gökkuşağı renk şeridi, Mıknatıs alan
 * çizgileri, Serap pembe pırıltı, Sarsıntı toz bulutu. Atış anında şok halkası ve patlama.
 */
export class SuperFx {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly decoyGlows: Phaser.GameObjects.Image[] = [];
  private emitAccumulator = 0;
  private quality: QualityLevel = 2;

  constructor(
    scene: Phaser.Scene,
    behindBall: Phaser.GameObjects.Container,
    private readonly particles: ParticleLayer,
    private readonly rings: SpritePool,
    private readonly ball: BallView,
  ) {
    const glow = (): Phaser.GameObjects.Image =>
      scene.add.image(0, 0, FX_KEYS.glow).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.glow = glow();
    for (let i = 0; i < 2; i++) this.decoyGlows.push(glow());
    this.g = new LiteGraphics(scene);
    behindBall.add([this.glow, ...this.decoyGlows, this.g]);
  }

  setQuality(level: QualityLevel): void {
    this.quality = level;
  }

  /** Süper atıldı: tipin renginde şok halkası ve patlama. */
  launch(type: SuperType, x: number, y: number, dirX: number): void {
    const color = FX.superColors[type];
    this.rings.spawn(x, y, {
      life: SUPER_FX.launchRingSeconds,
      scaleFrom: RING_FROM,
      scaleTo: SUPER_FX.launchRingScale,
      tint: color,
    });
    this.particles.burst(LAUNCH_PRESET[type], x, y, {
      angle: dirX > 0 ? 0 : Math.PI,
      countScale: LAUNCH_COUNT,
    });
  }

  /**
   * Her kare: etkin süper tipinin görselleri.
   * @param type Topun süper tipi (yoksa null).
   */
  update(
    dt: number,
    time: number,
    type: SuperType | null,
    phased: boolean,
    x: number,
    y: number,
    radius: number,
    vx: number,
    vy: number,
    targetX: number,
    decoys: readonly { x: number; y: number; radius: number }[],
  ): void {
    const g = this.g;
    g.clear();
    this.decoyGlows.forEach((img, i) => {
      const d = decoys[i];
      img.setVisible(d !== undefined && type === 'mirage');
      if (d && type === 'mirage')
        this.placeGlow(img, d.x, d.y, d.radius, FX.superColors.mirage, time);
    });
    if (!type) {
      this.glow.setVisible(false);
      this.emitAccumulator = 0;
      return;
    }
    const color = FX.superColors[type];
    if (phased) {
      // Işınlanma: görünmez topun yerinde dönen mor girdap.
      this.glow.setVisible(false);
      const spin = time * SUPER_FX.vortexHz * TWO_PI;
      g.lineStyle(SUPER_FX.boltWidthPx, color, VORTEX_ALPHA);
      for (let i = 0; i < VORTEX_ARMS; i++) {
        const a = spin + (i * TWO_PI) / VORTEX_ARMS;
        strokeArc(g, x, y, radius * SUPER_FX.vortexScale, a, a + VORTEX_ARC);
      }
      this.emit(dt, 'teleportSwirl', x, y, VORTEX_RATE);
      return;
    }
    this.glow.setVisible(type !== 'giant');
    this.placeGlow(this.glow, x, y, radius, color, time);

    if (RIBBON.has(type)) this.drawRibbon(radius, color, type === 'zigzag');
    if (type === 'rainbow') this.drawRainbow(radius);
    if (type === 'tornado') this.drawTornado(x, y, radius, time, color);
    if (type === 'magnet') this.drawMagnet(x, y, radius, targetX, time, color);
    if (type === 'fire') this.emit(dt, 'smoke', x, y, SMOKE_RATE);
    const preset = TRAIL_PRESET[type];
    if (preset) this.emit(dt, preset, x - vx * TRAIL_LEAD, y - vy * TRAIL_LEAD, 1);
  }

  private placeGlow(
    img: Phaser.GameObjects.Image,
    x: number,
    y: number,
    radius: number,
    color: number,
    time: number,
  ): void {
    const pulse = 1 + Math.sin(time * GLOW_PULSE_HZ * TWO_PI) * GLOW_PULSE;
    img
      .setPosition(x, y)
      .setTint(color)
      .setAlpha(SUPER_FX.glowAlpha)
      .setScale((radius * SUPER_FX.glowScale * pulse) / GLOW_TEX);
  }

  /** Saniyedeki orana göre parçacık yayar (kare hızından bağımsız). */
  private emit(
    dt: number,
    preset: ParticlePresetName,
    x: number,
    y: number,
    rateScale: number,
  ): void {
    const rate = SUPER_FX.trailRate * rateScale * SUPER_FX.qualityRate[this.quality];
    this.emitAccumulator += rate * dt;
    while (this.emitAccumulator >= 1) {
      this.emitAccumulator -= 1;
      this.particles.burst(preset, x, y, { countScale: 1 / Math.max(1, rateScale * RATE_BURST) });
    }
  }

  /** Topun arkasında incelen renkli şerit (zikzakta titreyen şimşek çizgisi). */
  private drawRibbon(radius: number, color: number, bolt: boolean): void {
    const g = this.g;
    const n = this.ball.trailLength;
    if (n < 2) return;
    if (bolt) {
      g.lineStyle(SUPER_FX.boltWidthPx, color, 1);
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const p = this.ball.trailPoint(i);
        const j = i === n - 1 ? 0 : (Math.random() * 2 - 1) * SUPER_FX.boltJitterPx;
        if (i === 0) g.moveTo(p.x + j, p.y - j);
        else g.lineTo(p.x + j, p.y - j);
      }
      g.strokePath();
      g.lineStyle(SUPER_FX.boltWidthPx * BOLT_CORE, WHITE, 1);
      g.strokePath();
      return;
    }
    for (let i = 0; i < n - 1; i++) {
      const a = this.ball.trailPoint(i);
      const ax = a.x;
      const ay = a.y;
      const b = this.ball.trailPoint(i + 1);
      const k = (i + 1) / n;
      g.lineStyle(radius * SUPER_FX.ribbonWidth * 2 * k, color, SUPER_FX.ribbonAlpha * k);
      g.lineBetween(ax, ay, b.x, b.y);
    }
  }

  /** Gökkuşağı: topun yolunu izleyen altı renkli bant. */
  private drawRainbow(radius: number): void {
    const g = this.g;
    const n = this.ball.trailLength;
    if (n < 2) return;
    const bands = SUPER_FX.rainbowBands;
    const colors = FX.rainbowColors;
    for (let b = 0; b < bands; b++) {
      const off = (b - (bands - 1) / 2) * SUPER_FX.rainbowBandPx * (radius / BASE_RADIUS);
      g.lineStyle(SUPER_FX.rainbowBandPx, colors[b % colors.length] ?? WHITE, SUPER_FX.ribbonAlpha);
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const p = this.ball.trailPoint(i);
        if (i === 0) g.moveTo(p.x, p.y + off);
        else g.lineTo(p.x, p.y + off);
      }
      g.strokePath();
    }
  }

  private drawTornado(x: number, y: number, radius: number, time: number, color: number): void {
    const g = this.g;
    const spin = time * FX.tornadoSpinHz * TWO_PI;
    for (let ring = 0; ring < TORNADO_RINGS; ring++) {
      const R = radius * (TORNADO_R0 + ring * TORNADO_STEP);
      g.lineStyle(FX.glowWidthPx, color, TORNADO_ALPHA / (ring + 1));
      for (let i = 0; i < FX.tornadoArcs; i++) {
        const start = spin * (1 + ring * TORNADO_SPEEDUP) + (i * TWO_PI) / FX.tornadoArcs;
        strokeArc(g, x, y, R, start, start + TWO_PI * TORNADO_ARC);
      }
    }
  }

  /** Mıknatıs: kaleye doğru nabız atan at nalı alan çizgileri. */
  private drawMagnet(
    x: number,
    y: number,
    radius: number,
    targetX: number,
    time: number,
    color: number,
  ): void {
    const g = this.g;
    const dir = targetX > x ? 1 : -1;
    const pulse = (time * SUPER_FX.magnetPulseHz) % 1;
    for (let i = 0; i < SUPER_FX.magnetArcs; i++) {
      const u = (i + pulse) / SUPER_FX.magnetArcs;
      const R = radius + SUPER_FX.magnetArcPx * u;
      g.lineStyle(FX.glowWidthPx, i % 2 === 0 ? color : MAGNET_BLUE, (1 - u) * MAGNET_ALPHA);
      const center = dir > 0 ? 0 : Math.PI;
      strokeArc(g, x, y, R, center - MAGNET_SPAN, center + MAGNET_SPAN);
    }
  }
}

const GLOW_TEX = 128;
const RING_FROM = 0.3;
const LAUNCH_COUNT = 1.4;
const VORTEX_ARMS = 3;
const VORTEX_ARC = 1.6;
const VORTEX_ALPHA = 0.8;
const VORTEX_RATE = 0.3;
const SMOKE_RATE = 0.35;
/** İz parçacıkları topun biraz gerisinde doğar (sn × hız). */
const TRAIL_LEAD = 0.012;
const GLOW_PULSE_HZ = 6;
const GLOW_PULSE = 0.08;
const RATE_BURST = 2;
const BOLT_CORE = 0.4;
const BASE_RADIUS = 22;
const TORNADO_RINGS = 2;
const TORNADO_R0 = 1.7;
const TORNADO_STEP = 0.7;
const TORNADO_ALPHA = 0.9;
const TORNADO_SPEEDUP = 0.5;
const TORNADO_ARC = 0.18;
const MAGNET_BLUE = 0x5aa0ff;
const MAGNET_ALPHA = 0.9;
const MAGNET_SPAN = 0.9;
