import type Phaser from 'phaser';
import { addPanel, textStyle } from '../art/uiArt';
import { BALL, FX, KICK, LOOP, PLAYER, SELECT, type SuperType } from '../config/gameConfig';
import {
  loadoutFor,
  NEUTRAL_LOADOUT,
  type CharacterDef,
  type CharacterId,
} from '../game/characters';
import { footOffset, PLAYER_STAND_OFFSET } from '../game/entities/Player';
import { GameSim } from '../game/GameSim';
import { t } from '../i18n';
import { EMPTY_INPUT, type InputState } from '../input/InputState';

/** Kaydın bir adımı: top (+ yanılsamalar) ve şutu çeken oyuncunun kafası. */
interface PreviewFrame {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly visible: boolean;
  readonly superType: SuperType | null;
  readonly decoys: readonly { x: number; y: number }[];
  readonly px: number;
  readonly py: number;
  readonly pr: number;
}

interface PreviewTrack {
  readonly frames: readonly PreviewFrame[];
  readonly goal: { lineX: number; top: number; groundY: number; wallX: number };
}

const cache = new Map<CharacterId, PreviewTrack>();
const input = (p: Partial<InputState>): InputState => ({ ...EMPTY_INPUT, ...p });

/**
 * Karakterin süperli şutunu gerçek simülasyonda (rakipsiz, balonsuz, sabit tohum) bir kez oynatıp
 * kaydeder: dolu bar → Süper → ayağın önündeki topa durarak şut. Önizleme bu yüzden oyundaki
 * davranışın birebir aynısıdır (Işınlanmanın kaybolması, Serap yanılsamaları, Dev Top…).
 * Karakter başına bir kez hesaplanır (~110 adım) ve önbelleğe alınır.
 */
export function recordSuperPreview(id: CharacterId): PreviewTrack {
  const hit = cache.get(id);
  if (hit) return hit;
  const sim = new GameSim({
    skipKickoff: true,
    powerUps: false,
    solo: true,
    seed: PREVIEW_SEED,
    loadouts: [loadoutFor(id), NEUTRAL_LOADOUT],
  });
  const p1 = sim.players[0];
  const groundY = sim.pitch.groundY;
  p1.resetTo(START_X, groundY - PLAYER_STAND_OFFSET);
  // Top ayağın hemen önünde (GameSim testlerindeki durağan şut düzeneği).
  const o = footOffset(KICK.restAngle, 1);
  const touch = BALL.radius + PLAYER.foot.radius + 1;
  sim.ball.resetTo(p1.x + o.x + Math.sqrt(touch * touch - BALL_DY * BALL_DY), p1.y + o.y + BALL_DY);
  sim.fillPower(0);
  sim.step([input({ super: true }), EMPTY_INPUT]);
  sim.step([input({ kick: true }), EMPTY_INPUT]);
  const frames: PreviewFrame[] = [];
  const steps = Math.round(SELECT.preview.recordSeconds * LOOP.stepHz);
  for (let i = 0; i < steps; i++) {
    const b = sim.ball;
    frames.push({
      x: b.x,
      y: b.y,
      r: b.radius,
      visible: !b.phased,
      superType: b.superType,
      decoys: sim.decoys.map((d) => ({ x: d.ball.x, y: d.ball.y })),
      px: p1.x,
      py: p1.y,
      pr: p1.headRadius,
    });
    sim.step([EMPTY_INPUT, EMPTY_INPUT]);
  }
  const g = sim.pitch.goals[1];
  const track: PreviewTrack = {
    frames,
    goal: { lineX: g.lineX, top: g.crossbar.minY, groundY, wallX: sim.pitch.width },
  };
  cache.set(id, track);
  return track;
}

/**
 * Seçim panelindeki küçük önizleme kutusu: sahanın bir kesiti, kale, şutu çeken kafa, süper
 * renginde iz ve top. Kayıt döngüde oynatılır; P2 panelinde ayna (şut sola gider).
 */
export class SuperPreview {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private track: PreviewTrack | null = null;
  private def: CharacterDef | null = null;
  private time = 0;
  private readonly scale: number;

  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly mirrored: boolean,
    depth: number,
  ) {
    const p = SELECT.preview;
    const reg = p.region;
    this.scale = Math.min(p.width / (reg.right - reg.left), p.height / (reg.bottom - reg.top));
    this.objects.push(
      addPanel(
        scene,
        x + p.width / 2,
        y + p.height / 2,
        p.width,
        p.height,
        'dark',
        p.radius,
      ).setDepth(depth),
    );
    this.g = scene.add.graphics().setDepth(depth);
    this.objects.push(
      this.g,
      scene.add
        .text(
          x + p.radius,
          y + p.radius / 2,
          t('select.preview'),
          textStyle(p.labelFontSizePx, '#ffffff', 2),
        )
        .setAlpha(p.labelAlpha)
        .setDepth(depth),
    );
  }

  setCharacter(def: CharacterDef): void {
    if (this.def?.id === def.id) return;
    this.def = def;
    this.track = recordSuperPreview(def.id);
    this.time = 0;
  }

  setVisible(visible: boolean): void {
    for (const o of this.objects) (o as Phaser.GameObjects.Image).setVisible(visible);
  }

  destroy(): void {
    for (const o of this.objects) o.destroy();
  }

  /** Mantıksal saha koordinatı → kutu koordinatı (P2'de ayna). */
  private sx(x: number): number {
    const p = SELECT.preview;
    const lx = (x - p.region.left) * this.scale;
    return this.mirrored ? this.x + p.width - lx : this.x + lx;
  }

  private sy(y: number): number {
    const p = SELECT.preview;
    return (
      this.y +
      (y - p.region.top) * this.scale +
      (p.height - (p.region.bottom - p.region.top) * this.scale) / 2
    );
  }

  update(dt: number): void {
    const track = this.track;
    const def = this.def;
    if (!track || !def) return;
    const p = SELECT.preview;
    const n = track.frames.length;
    const loop = n / LOOP.stepHz + p.holdSeconds;
    this.time = (this.time + dt) % loop;
    const i = Math.min(n - 1, Math.floor(this.time * LOOP.stepHz));
    const g = this.g;
    g.clear();
    const s = this.scale;
    // Zemin ve kale.
    const gy = this.sy(track.goal.groundY);
    g.fillStyle(p.groundColor, GROUND_ALPHA);
    g.fillRect(this.x + 2, gy, p.width - GROUND_INSET, Math.max(2, this.y + p.height - gy - 2));
    g.lineStyle(2, p.lineColor, LINE_ALPHA);
    g.lineBetween(
      this.sx(track.goal.lineX),
      gy,
      this.sx(track.goal.lineX),
      this.sy(track.goal.top),
    );
    g.lineBetween(
      this.sx(track.goal.lineX),
      this.sy(track.goal.top),
      this.sx(track.goal.wallX),
      this.sy(track.goal.top),
    );
    const f = track.frames[i];
    if (!f) return;
    // Şutu çeken kafa.
    g.fillStyle(def.palette.body, 1);
    g.fillCircle(this.sx(f.px), this.sy(f.py), Math.max(p.ballMinPx, f.pr * s));
    // İz: son adımlar, süper renginde (etki bitince beyaz), yaşla sönen.
    const from = Math.max(0, i - p.trailSteps);
    for (let k = from + 1; k <= i; k++) {
      const a = track.frames[k - 1];
      const b = track.frames[k];
      if (!a || !b || !a.visible || !b.visible) continue;
      const color = b.superType ? FX.superColors[b.superType] : p.lineColor;
      g.lineStyle(p.trailWidthPx, color, (k - from) / (i - from + 1));
      g.lineBetween(this.sx(a.x), this.sy(a.y), this.sx(b.x), this.sy(b.y));
    }
    // Top ve yanılsamalar.
    const r = Math.max(p.ballMinPx, f.r * s);
    const ballColor = f.superType ? FX.superColors[f.superType] : p.lineColor;
    for (const d of f.decoys) this.drawBall(d.x, d.y, r, ballColor);
    if (f.visible) this.drawBall(f.x, f.y, r, ballColor);
  }

  private drawBall(x: number, y: number, r: number, ring: number): void {
    const g = this.g;
    g.fillStyle(SELECT.preview.lineColor, 1);
    g.fillCircle(this.sx(x), this.sy(y), r);
    g.lineStyle(2, ring, 1);
    g.strokeCircle(this.sx(x), this.sy(y), r);
  }
}

const PREVIEW_SEED = 7;
const START_X = 330;
const BALL_DY = -9;
const GROUND_ALPHA = 0.55;
const LINE_ALPHA = 0.85;
const GROUND_INSET = 4;
