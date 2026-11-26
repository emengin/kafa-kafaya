import Phaser from 'phaser';
import { artRandom } from '../art/canvas';
import { FX_KEYS } from '../art/fxArt';
import {
  crowdFrame,
  FIELD_TOP_Y,
  generateBoardTextures,
  generateCrowdTextures,
  STAGE_KEYS,
  STAGE_PAD_X,
  STAGE_PAD_Y,
  STAGE_WIDTH,
  STANDS_TOP_Y,
} from '../art/stadiumArt';
import { DISPLAY, STADIUM } from '../config/gameConfig';
import type { QualityLevel } from '../fx/feel';
import { approach } from '../fx/Spring';
import { solidRect } from './solidRect';

type Image = Phaser.GameObjects.Image;

interface CrowdSegment {
  readonly img: Image;
  readonly row: number;
  /** Sıradaki parça (atlas karesi). */
  readonly segment: number;
  readonly baseY: number;
  readonly phase: number;
  /** 0 = sol yarı (P1 taraftarı), 1 = sağ yarı. */
  readonly side: 0 | 1;
  cheering: boolean;
}

interface Cloud {
  readonly img: Image;
  readonly speed: number;
}

const TWO_PI = Math.PI * 2;
/** Dokuların sol kenarı dünyada x = −B (geniş ekranlar için çekirdeğin dışına taşar). */
const B = STAGE_PAD_X;

/**
 * Stadyum görünümü: gökyüzü, parallax bulutlar (iki katman, farklı hızlarda), ışık kuleleri ve
 * parlamaları, ışık hüzmeleri, tribün, animasyonlu kalabalık (sıra sıra; heyecanla kıpırdar,
 * golde golcünün tarafı ayağa kalkıp zıplar), kayan LED panolar ve perspektifli saha.
 */
export class StadiumView {
  private readonly clouds: Cloud[] = [];
  private readonly crowd: CrowdSegment[] = [];
  private readonly glows: Image[] = [];
  private readonly beams: Image[] = [];
  private readonly boards: Phaser.GameObjects.TileSprite;
  private readonly boardGlow: Phaser.GameObjects.Image;
  private excitement = 0;
  private excitementTarget = 0;
  private readonly cheerTimers: [number, number] = [0, 0];
  private goalBoardTimer = 0;
  private lightBoost = 0;
  private quality: QualityLevel;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    opts: {
      leftColors: readonly number[];
      rightColors: readonly number[];
      quality: QualityLevel;
      title: string;
      goalText: string;
    },
  ) {
    this.quality = opts.quality;
    generateCrowdTextures(scene, opts.leftColors, opts.rightColors);
    generateBoardTextures(scene, opts.title, opts.goalText);
    const add = scene.add;
    const parts: Phaser.GameObjects.GameObject[] = [];
    parts.push(add.image(-B, -STAGE_PAD_Y, STAGE_KEYS.sky).setOrigin(0));

    // Bulutlar: uzak katman yavaş ve küçük, yakın katman hızlı ve büyük.
    const rand = artRandom(STADIUM.clouds.seed);
    STADIUM.clouds.layers.forEach((cl, li) => {
      for (let i = 0; i < cl.count; i++) {
        const variant = Math.floor(rand() * STADIUM.clouds.variants);
        const img = add
          .image(
            rand() * STAGE_WIDTH - B,
            cl.minY + rand() * (cl.maxY - cl.minY),
            STAGE_KEYS.cloud(variant),
          )
          .setScale(cl.minScale + rand() * (cl.maxScale - cl.minScale))
          .setAlpha(cl.alpha);
        if (rand() < 0.5) img.setFlipX(true);
        this.clouds.push({ img, speed: cl.speed * (1 + li * rand() * CLOUD_SPEED_VAR) });
        parts.push(img);
      }
    });

    // Işık kuleleri ve parlamaları. Toplamalı (ADD) nesneler art arda çizilir: Phaser 4'te karışım
    // kipi her değiştiğinde toplu çizim boşalır (Faz 2.4). Parlamalar diğer kuleyle, pano ışıması
    // panolarla örtüşmez; toplamalı karışım kendi arasında sıradan bağımsız → görüntü aynı.
    const t = STADIUM.towers;
    for (const x of t.xs) parts.push(add.image(x, t.top, STAGE_KEYS.tower).setOrigin(0.5, 0));
    for (const x of t.xs) {
      const glow = add
        .image(x, t.top + t.panelH / 2, FX_KEYS.glow)
        .setTint(t.glowColor)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale((t.panelW * t.glowScale) / GLOW_TEX)
        .setAlpha(t.glowAlpha);
      this.glows.push(glow);
      parts.push(glow);
    }

    parts.push(add.image(-B, STANDS_TOP_Y, STAGE_KEYS.stands).setOrigin(0));
    // Kalabalık sıraları (arkadan öne), her biri segmentlere bölünmüş.
    const c = STADIUM.crowd;
    const segW = STAGE_WIDTH / c.segments;
    c.rows.forEach((row, ri) => {
      for (let s = 0; s < c.segments; s++) {
        const baseY = row.y - c.rowHeight;
        const img = add
          .image(-B + Math.floor(segW * s), baseY, STAGE_KEYS.crowd, crowdFrame(ri, false, s))
          .setOrigin(0);
        const side: 0 | 1 = segW * (s + 0.5) < STAGE_WIDTH / 2 ? 0 : 1;
        this.crowd.push({
          img,
          row: ri,
          segment: s,
          baseY,
          phase: rand() * TWO_PI,
          side,
          cheering: false,
        });
        parts.push(img);
      }
    });

    // Işık hüzmeleri: kulelerden sahanın ortasına doğru.
    for (const x of t.xs) {
      const beam = add
        .image(x, t.top + t.panelH, STAGE_KEYS.beam)
        .setOrigin(0.5, 0)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(t.beamAlpha)
        .setRotation(x < DISPLAY.width / 2 ? -BEAM_TILT : BEAM_TILT);
      this.beams.push(beam);
      parts.push(beam);
    }

    const bd = STADIUM.boards;
    this.boards = add.tileSprite(-B, bd.y, STAGE_WIDTH, bd.height, STAGE_KEYS.boards).setOrigin(0);
    // Pano ışıması panoların hemen altında (örtüşmez): hüzmelerle aynı toplamalı grupta.
    this.boardGlow = solidRect(
      scene,
      -B,
      bd.y + bd.height,
      STAGE_WIDTH,
      BOARD_GLOW_H,
      bd.colors[0],
      bd.glowAlpha,
    )
      .setOrigin(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    parts.push(this.boardGlow, this.boards);
    parts.push(add.image(-B, FIELD_TOP_Y, STAGE_KEYS.field).setOrigin(0));
    layer.add(parts);
    this.setQuality(opts.quality);
  }

  /**
   * Kalite: 1'de ışık hüzmeleri kapanır; 0'da ayrıca kule parlamaları, pano ışıması ve yakın
   * bulutlar kapanır, kalabalık kıpırdamaz (doldurma oranı sınırlı cihazlar için).
   */
  setQuality(level: QualityLevel): void {
    this.quality = level;
    for (const b of this.beams) b.setVisible(level > 1);
    for (const g of this.glows) g.setVisible(level > 0);
    this.boardGlow.setVisible(level > 0);
    for (const cl of this.clouds) cl.img.setVisible(level > 0 || cl.speed < CLOUD_LOW_KEEP);
  }

  /** Atak tehlikesi (0–1): kalabalık kıpırdanır. */
  setExcitement(level: number): void {
    this.excitementTarget = Math.min(1, Math.max(0, level));
  }

  /** Gol: golcünün tarafı ayağa kalkar, panolar "GOL!" yazar, ışıklar parlar. */
  cheer(side: 0 | 1): void {
    this.cheerTimers[side] = STADIUM.crowd.cheerSeconds;
    this.goalBoardTimer = STADIUM.crowd.cheerSeconds;
    this.lightBoost = 1;
    this.boards.setTexture(STAGE_KEYS.boardsGoal);
  }

  /** Maç sonu: kazananın tarafı uzun süre tezahürat eder. */
  celebrate(side: 0 | 1, seconds: number): void {
    this.cheerTimers[side] = seconds;
    this.lightBoost = 1;
  }

  update(dt: number, time: number): void {
    const c = STADIUM.crowd;
    const w = STAGE_WIDTH;
    for (const cl of this.clouds) {
      if (!cl.img.visible) continue;
      cl.img.x += cl.speed * dt;
      const half = cl.img.displayWidth / 2;
      if (cl.img.x - half > w - B) cl.img.x = -B - half;
    }
    this.excitement = approach(this.excitement, this.excitementTarget, c.exciteRate, dt);
    for (const s of [0, 1] as const) this.cheerTimers[s] = Math.max(0, this.cheerTimers[s] - dt);
    const animate = this.quality > 0;
    for (const seg of this.crowd) {
      const cheering = this.cheerTimers[seg.side] > 0;
      if (cheering !== seg.cheering) {
        seg.cheering = cheering;
        seg.img.setFrame(crowdFrame(seg.row, cheering, seg.segment));
      }
      if (!animate) {
        seg.img.y = seg.baseY;
        continue;
      }
      let dy: number;
      if (cheering) {
        dy = -Math.abs(Math.sin(time * c.cheerHz * Math.PI + seg.phase)) * c.cheerBobPx;
      } else {
        const idle = Math.sin(time * c.idleHz * TWO_PI + seg.phase) * c.idleBobPx;
        const excite =
          Math.sin(time * c.cheerHz * TWO_PI * EXCITE_HZ + seg.phase) *
          c.exciteBobPx *
          this.excitement;
        dy = idle - Math.abs(excite);
      }
      seg.img.y = seg.baseY + dy;
    }

    const bd = STADIUM.boards;
    this.boards.tilePositionX += bd.speed * dt;
    if (this.goalBoardTimer > 0) {
      this.goalBoardTimer -= dt;
      if (this.goalBoardTimer <= 0) this.boards.setTexture(STAGE_KEYS.boards);
    }
    const flash = this.goalBoardTimer > 0 && Math.floor(time * BOARD_FLASH_HZ) % 2 === 0;
    this.boardGlow.setAlpha(bd.glowAlpha * (flash ? BOARD_FLASH_GAIN : 1));

    const t = STADIUM.towers;
    this.lightBoost = Math.max(0, this.lightBoost - t.boostDecay * dt);
    const flicker = 1 + Math.sin(time * LIGHT_FLICKER_HZ) * LIGHT_FLICKER;
    for (const g of this.glows)
      g.setAlpha(Math.min(1, (t.glowAlpha + t.goalBoost * this.lightBoost) * flicker));
    for (const b of this.beams) b.setAlpha(t.beamAlpha * (1 + this.lightBoost));
  }

  /** Golde kalabalıktan fotoğraf flaşları için rastgele tribün noktası. */
  randomStandPoint(side: 0 | 1 | -1): { x: number; y: number } {
    const rows = STADIUM.crowd.rows;
    const row = rows[Math.floor(Math.random() * rows.length)] ?? rows[0];
    const half = DISPLAY.width / 2;
    const x = side === -1 ? Math.random() * DISPLAY.width : side * half + Math.random() * half;
    return { x, y: row.y - STADIUM.crowd.rowHeight * FLASH_Y };
  }
}

const GLOW_TEX = 128;
const CLOUD_SPEED_VAR = 0.4;
/** Düşük kalitede yalnızca yavaş (uzak) bulutlar kalır. */
const CLOUD_LOW_KEEP = 10;
const BEAM_TILT = 0.5;
const BOARD_GLOW_H = 10;
const BOARD_FLASH_HZ = 8;
const BOARD_FLASH_GAIN = 2.6;
const EXCITE_HZ = 0.6;
const LIGHT_FLICKER_HZ = 37;
const LIGHT_FLICKER = 0.03;
const FLASH_Y = 0.6;
