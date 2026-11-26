import Phaser from 'phaser';
import { artRandom, makeCanvasTexture } from '../art/canvas';
import { FX_KEYS } from '../art/fxArt';
import { PARTICLE_FRAME_NAMES, STRESS } from '../config/gameConfig';

/**
 * Sentetik stres sahnesi (Faz 2.4, yalnızca geliştirici derlemesi). Final görseller gelmeden
 * ART_BIBLE'ın hedef boyutlarında çizim yükü üretir (değerler: `STRESS`):
 *
 * - Bugünkü kodla çizilen stadyum gizlenir; yerine §10.2'nin parallax katmanları final doku
 *   boyutlarında gelir: K0 gökyüzü ve K1 silüet @0,5x tam tuval, K2 tribün, K3 panolar, K4 zemin,
 *   K5 ön plan @1x; kalabalık 2048×1024 modül atlasından 48 kıpırdayan parça.
 * - Her oyuncunun üstüne 22 parçalı vekil karakter (1024² atlas; parçalar kod animasyonuyla döner).
 *   Bugünkü karakterler de çizilmeye devam eder: yük finalden fazladır (ihtiyatlı).
 * - Aynı anda 60 parçacık (40 normal + 20 toplamalı; toplamalılar tek kapta, karışım kipi
 *   karede bir kez değişir).
 *
 * Görünüm anlamsızdır (renkli desenler); amaç doku belleği, doldurma oranı, sprite sayısı ve
 * toplu çizim davranışını final düzeyine çekmek. Ölçümler Faz 4.6 ve 12.3'te final görsellerle
 * tekrarlanır.
 */

const KEYS = {
  sky: 'stress-k0-sky',
  silhouette: 'stress-k1-silhouette',
  mid: 'stress-k2-mid',
  crowd: 'stress-crowd',
  boards: 'stress-k3-boards',
  ground: 'stress-k4-ground',
  front: 'stress-k5-front',
  char: (i: number): string => `stress-char-${i}`,
} as const;

type Image = Phaser.GameObjects.Image;

interface Part {
  readonly img: Image;
  readonly dx: number;
  readonly dy: number;
  readonly phase: number;
}

interface Particle {
  readonly img: Image;
  vx: number;
  vy: number;
  life: number;
}

const TWO_PI = Math.PI * 2;
const S = STRESS;

/** Tuval (@1x) koordinatı → dünya koordinatı. */
const worldX = (cx: number): number => (cx - S.coreX) * S.artScale;
const worldY = (cy: number): number => (cy - S.coreY) * S.artScale;

export class StressLayer {
  readonly root: Phaser.GameObjects.Container;
  private readonly front: Phaser.GameObjects.Container;
  private readonly crowd: { img: Image; baseY: number; phase: number }[] = [];
  private readonly parts: [Part[], Part[]] = [[], []];
  private readonly particles: Particle[] = [];
  private readonly rand = artRandom(S.seed);
  /** Bu katmanın ürettiği dokuların toplam belleği (sıkıştırılmamış RGBA, bayt). */
  readonly textureBytes: number;

  constructor(
    scene: Phaser.Scene,
    world: Phaser.GameObjects.Container,
    private readonly hiddenStage: Phaser.GameObjects.Container,
  ) {
    this.textureBytes = generateTextures(scene);
    hiddenStage.setVisible(false);
    const add = scene.add;
    this.root = add.container(0, 0);
    this.front = add.container(0, 0);
    world.addAt(this.root, 0);
    world.add(this.front);

    const back: Phaser.GameObjects.GameObject[] = [];
    const full = (key: string): Image =>
      add
        .image(worldX(0), worldY(0), key)
        .setOrigin(0)
        .setScale(S.artScale / S.halfScale);
    const strip = (key: string, top: number): Image =>
      add.image(worldX(0), worldY(top), key).setOrigin(0).setScale(S.artScale);
    back.push(full(KEYS.sky), full(KEYS.silhouette), strip(KEYS.mid, S.midTop));

    const cellH = S.crowdAtlasH / S.crowdRows;
    const step = S.canvasW / S.crowdPerLine;
    for (let line = 0; line < S.crowdLines; line++) {
      for (let i = 0; i < S.crowdPerLine; i++) {
        const frame = (line * S.crowdPerLine + i) % (S.crowdCols * S.crowdRows);
        const baseY = worldY(S.midTop + line * cellH * S.halfScale);
        const img = add
          .image(worldX(i * step), baseY, KEYS.crowd, frame)
          .setOrigin(0)
          .setScale(S.artScale);
        this.crowd.push({ img, baseY, phase: this.rand() * TWO_PI });
        back.push(img);
      }
    }
    back.push(strip(KEYS.boards, S.boardsTop), strip(KEYS.ground, S.groundTop));
    this.root.add(back);

    // Vekil karakterler (dünyada oyuncuların üstünde) ve parçacıklar.
    for (const p of [0, 1] as const) {
      for (let i = 0; i < S.charParts; i++) {
        const head = i >= S.charBodyParts;
        const angle = this.rand() * TWO_PI;
        const r = this.rand() * S.charSpread;
        const img = add
          .image(0, 0, KEYS.char(p), i)
          .setScale(S.artScale * S.halfScale)
          .setAlpha(S.charAlpha);
        this.parts[p].push({
          img,
          dx: Math.cos(angle) * r * S.artScale,
          dy:
            ((head ? -S.charHeadY : -S.charHeadY * S.halfScale) + Math.sin(angle) * r) * S.artScale,
          phase: this.rand() * TWO_PI,
        });
        this.front.add(img);
      }
    }
    const additive = add.container(0, 0).setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 0; i < S.particles; i++) {
      const frame = PARTICLE_FRAME_NAMES[i % PARTICLE_FRAME_NAMES.length] ?? 'dot';
      const img = add.image(0, 0, FX_KEYS.particles, frame).setScale(S.particleScale);
      const particle: Particle = { img, vx: 0, vy: 0, life: this.rand() * S.particleLife };
      this.spawn(particle, worldX(S.canvasW / 2), worldY(S.groundTop));
      this.particles.push(particle);
      if (i < S.particlesAdditive) additive.add(img);
      else this.front.add(img);
    }
    this.front.add([additive, strip(KEYS.front, S.frontTop)]);
  }

  /** @param focus Parçacıkların çıktığı nokta (top). */
  update(
    dt: number,
    time: number,
    players: readonly [{ x: number; y: number }, { x: number; y: number }],
    focus: { x: number; y: number },
  ): void {
    for (const c of this.crowd) {
      c.img.y = c.baseY - Math.abs(Math.sin(time * S.crowdHz * TWO_PI + c.phase)) * S.crowdBobPx;
    }
    for (const p of [0, 1] as const) {
      const at = players[p];
      for (const part of this.parts[p]) {
        const swing = Math.sin(time * S.charHz * TWO_PI + part.phase) * S.charSwingRad;
        part.img.setPosition(at.x + part.dx, at.y + part.dy).setRotation(swing);
      }
    }
    for (const q of this.particles) {
      q.life -= dt;
      if (q.life <= 0) this.spawn(q, focus.x, focus.y);
      q.vy += S.particleGravity * dt;
      q.img.x += q.vx * dt;
      q.img.y += q.vy * dt;
      q.img.setAlpha(Math.max(0, q.life / S.particleLife));
    }
  }

  private spawn(q: Particle, x: number, y: number): void {
    const a = this.rand() * TWO_PI;
    const v = S.particleSpeed * (S.halfScale + this.rand());
    q.vx = Math.cos(a) * v;
    q.vy = Math.sin(a) * v;
    q.life = S.particleLife * (S.halfScale + this.rand() * S.halfScale);
    q.img.setPosition(x, y);
  }

  destroy(): void {
    this.root.destroy();
    this.front.destroy();
    this.hiddenStage.setVisible(true);
  }
}

const BYTES_PER_PIXEL = 4;
/** Desenlerde kullanılan renkler (yalnızca ayırt edilsin diye; final palet değil). */
const COLORS = ['#2f4a8a', '#6b3f7a', '#c9824a', '#3f8a5a', '#d9c06a', '#8a3f4a', '#4a8ac9'];
const BLOBS_PER_MEGAPIXEL = 400;
const MEGAPIXEL = 1_000_000;
const BLOB_MIN = 6;
const BLOB_MAX = 60;
const PART_INSET = 0.12;

/** Doku üretimi (oyun başına bir kez). @returns Üretilen dokuların toplam belleği. */
function generateTextures(scene: Phaser.Scene): number {
  const rand = artRandom(S.seed);
  const pick = (): string => COLORS[Math.floor(rand() * COLORS.length)] ?? '#888888';
  let bytes = 0;
  const pattern = (key: string, w: number, h: number, alpha: number): void => {
    bytes += w * h * BYTES_PER_PIXEL;
    makeCanvasTexture(scene, key, w, h, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, pick());
      g.addColorStop(1, pick());
      ctx.globalAlpha = alpha;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const blobs = Math.round(((w * h) / MEGAPIXEL) * BLOBS_PER_MEGAPIXEL);
      for (let i = 0; i < blobs; i++) {
        ctx.fillStyle = pick();
        const r = BLOB_MIN + rand() * (BLOB_MAX - BLOB_MIN);
        ctx.beginPath();
        ctx.arc(rand() * w, rand() * h, r, 0, TWO_PI);
        ctx.fill();
      }
    });
  };
  const halfW = S.canvasW * S.halfScale;
  const halfH = S.canvasH * S.halfScale;
  pattern(KEYS.sky, halfW, halfH, 1);
  pattern(KEYS.silhouette, halfW, halfH, S.halfScale);
  pattern(KEYS.mid, S.canvasW, S.midH, 1);
  pattern(KEYS.boards, S.canvasW, S.boardsH, 1);
  pattern(KEYS.ground, S.canvasW, S.groundH, 1);
  pattern(KEYS.front, S.canvasW, S.frontH, 1);
  pattern(KEYS.crowd, S.crowdAtlasW, S.crowdAtlasH, 1);
  gridFrames(scene, KEYS.crowd, S.crowdAtlasW, S.crowdAtlasH, S.crowdCols, S.crowdRows);
  for (const p of [0, 1]) {
    const key = KEYS.char(p);
    bytes += S.charAtlas * S.charAtlas * BYTES_PER_PIXEL;
    const cell = S.charAtlas / S.charGrid;
    makeCanvasTexture(scene, key, S.charAtlas, S.charAtlas, (ctx) => {
      for (let i = 0; i < S.charParts; i++) {
        const x = (i % S.charGrid) * cell;
        const y = Math.floor(i / S.charGrid) * cell;
        const inset = cell * PART_INSET;
        ctx.fillStyle = pick();
        ctx.strokeStyle = '#1a1020';
        ctx.lineWidth = inset / 2;
        ctx.beginPath();
        ctx.ellipse(x + cell / 2, y + cell / 2, cell / 2 - inset, cell / 2 - inset, 0, 0, TWO_PI);
        ctx.fill();
        ctx.stroke();
      }
    });
    gridFrames(scene, key, S.charAtlas, S.charAtlas, S.charGrid, S.charGrid);
  }
  return bytes;
}

function gridFrames(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  cols: number,
  rows: number,
): void {
  const tex = scene.textures.get(key);
  if (tex.has('0')) return;
  const cw = w / cols;
  const ch = h / rows;
  for (let i = 0; i < cols * rows; i++) {
    tex.add(i, 0, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
  }
}
