import type Phaser from 'phaser';
import { addPanel, textStyle } from '../art/uiArt';
import { FX, LOOP, SELECT } from '../config/gameConfig';
import type { CharacterDef } from '../game/characters';
import { t } from '../i18n';
import { recordSuperPreview, type PreviewTrack } from './superPreviewTrack';
import { LiteGraphics } from './LiteGraphics';

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
    this.g = new LiteGraphics(scene).setDepth(depth);
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

const GROUND_ALPHA = 0.55;
const LINE_ALPHA = 0.85;
const GROUND_INSET = 4;
