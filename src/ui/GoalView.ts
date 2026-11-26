import Phaser from 'phaser';
import { css, remakeCanvasTexture } from '../art/canvas';
import { NET, PITCH } from '../config/gameConfig';
import { NetSim } from '../fx/NetSim';
import type { GoalDef, Pitch } from '../game/pitch';
import { LiteGraphics } from './LiteGraphics';
import { solidRect } from './solidRect';

/** Ağ yayının bir düğümünü yerleştiren fonksiyon (dünya koordinatı). */
type NodeFn = (i: number, j: number) => { x: number; y: number };

/**
 * Kaleler: içteki gölge (oyuncuların arkasında), ağ ve direkler (önde). Ağ dinlenirken önceden
 * çizilmiş bir dokudur; top çarpınca yay ağına (`NetSim`) geçer ve dalgalanma bitene kadar her
 * karede çizilir — böylece duran ağın her karede yeniden çizim maliyeti olmaz. "Rakip Kalesini
 * Büyüt" ile yükseklik değişince ağ ve direkler yeniden kurulur.
 */
export class GoalView {
  private readonly nets: [NetSim, NetSim];
  private readonly interiors: [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  private readonly baked: [Phaser.GameObjects.Image | null, Phaser.GameObjects.Image | null] = [
    null,
    null,
  ];
  private readonly live: Phaser.GameObjects.Graphics;
  private readonly shownHeights: [number, number] = [-1, -1];
  private readonly bakedHeights: [number, number] = [-1, -1];
  private readonly node = { x: 0, y: 0 };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly pitch: Pitch,
    backLayer: Phaser.GameObjects.Container,
    private readonly frontLayer: Phaser.GameObjects.Container,
  ) {
    const cols = Math.round(PITCH.goal.depth / NET.spacingPx) + 1;
    const maxH = PITCH.goal.mouthHeight + MAX_GROWTH;
    const rows = Math.round(maxH / NET.spacingPx) + 1;
    this.nets = [new NetSim(cols, rows), new NetSim(cols, rows)];
    const interior = (goal: GoalDef): Phaser.GameObjects.Image =>
      solidRect(
        scene,
        goal.net.minX,
        goal.net.minY,
        goal.net.maxX - goal.net.minX,
        goal.mouthHeight,
        NET.interior,
        NET.interiorAlpha,
      ).setOrigin(0);
    this.interiors = [interior(pitch.goals[0]), interior(pitch.goals[1])];
    backLayer.add(this.interiors);
    this.live = new LiteGraphics(scene);
    frontLayer.add(this.live);
  }

  /** Top bir kalenin ağ bölgesindeyse o kale (yoksa −1). */
  goalAt(x: number, y: number): 0 | 1 | -1 {
    for (const i of [0, 1] as const) {
      const n = this.pitch.goals[i].net;
      if (x >= n.minX && x <= n.maxX && y >= n.minY && y <= n.maxY) return i;
    }
    return -1;
  }

  /** Ağa darbe (dünya noktası, px/sn). */
  hit(goalIndex: 0 | 1, x: number, y: number, vx: number, vy: number): void {
    const goal = this.pitch.goals[goalIndex];
    this.nets[goalIndex].impulse(x - goal.net.minX, y - goal.net.minY, vx, vy);
  }

  update(dt: number): void {
    const g = this.live;
    g.clear();
    for (const i of [0, 1] as const) {
      const goal = this.pitch.goals[i];
      const net = this.nets[i];
      const h = goal.mouthHeight;
      const changed = this.shownHeights[i] !== h;
      if (changed) {
        this.shownHeights[i] = h;
        net.setSize(goal.net.maxX - goal.net.minX, h);
        this.interiors[i]
          .setPosition(goal.net.minX, goal.net.minY)
          .setDisplaySize(goal.net.maxX - goal.net.minX, h);
      }
      net.update(dt);
      const animating = net.active || changed;
      if (animating) {
        this.baked[i]?.setVisible(false);
        drawNetGraphics(g, net, this.nodeFn(goal, net));
      } else {
        if (this.bakedHeights[i] !== h) this.bake(i);
        this.baked[i]?.setVisible(true);
      }
    }
    if (
      this.shownHeights[0] !== this.lastFrameHeights[0] ||
      this.shownHeights[1] !== this.lastFrameHeights[1]
    ) {
      this.lastFrameHeights[0] = this.shownHeights[0];
      this.lastFrameHeights[1] = this.shownHeights[1];
      this.drawFrames();
    }
  }
  private readonly lastFrameHeights: [number, number] = [-1, -1];

  private nodeFn(goal: GoalDef, net: NetSim): NodeFn {
    const n = this.node;
    const x0 = goal.net.minX;
    const y0 = goal.net.minY;
    return (i, j) => {
      const k = j * net.cols + i;
      // Kalenin arkası (duvar tarafı) sütun cols−1; sol kalede duvar x = 0'dadır.
      const col = goal.defender === 0 ? net.cols - 1 - i : i;
      n.x = x0 + net.restX(col) + (net.ox[k] ?? 0);
      n.y = y0 + net.restY(j) + (net.oy[k] ?? 0);
      return n;
    };
  }

  /** Dinlenen ağı dokuya çizer (yükseklik değişince yeniden). */
  private bake(i: 0 | 1): void {
    const goal = this.pitch.goals[i];
    const net = this.nets[i];
    const w = goal.net.maxX - goal.net.minX;
    const h = goal.mouthHeight;
    const key = `goal-net-${i}`;
    const pad = NET.lineWidthPx;
    remakeCanvasTexture(this.scene, key, w + pad * 2, h + pad * 2, (ctx) => {
      ctx.translate(pad - goal.net.minX, pad - goal.net.minY);
      ctx.strokeStyle = css(NET.color, NET.alpha);
      ctx.lineWidth = NET.lineWidthPx;
      const fn = this.nodeFn(goal, net);
      forEachNetLine(net, fn, (pts, n) => {
        ctx.beginPath();
        for (let k = 0; k < n; k++) {
          const p = pts[k];
          if (!p) break;
          if (k === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      });
    });
    let img = this.baked[i];
    if (!img) {
      img = this.scene.add.image(0, 0, key).setOrigin(0);
      this.baked[i] = img;
      this.frontLayer.addAt(img, 0);
    } else {
      img.setTexture(key);
    }
    img.setPosition(goal.net.minX - pad, goal.net.minY - pad);
    this.bakedHeights[i] = h;
  }

  /**
   * Direkler: katı üst direk (fizikteki dikdörtgen) ve ön direk; beyaz, gölgeli, konturlu.
   * Basit dikdörtgen nesneleri (her karede üçgenleme yok); yükseklik değişince yerleştirilir.
   */
  private drawFrames(): void {
    if (this.posts.length === 0) {
      for (let i = 0; i < 2; i++) {
        const make = (color: number): Phaser.GameObjects.Image =>
          solidRect(this.scene, 0, 0, 1, 1, color).setOrigin(0);
        const parts = [
          make(NET.postOutline),
          make(NET.post),
          make(NET.postShade),
          make(NET.postOutline),
          make(NET.post),
          make(NET.postShade),
        ];
        this.posts.push(parts);
        this.frontLayer.add(parts);
      }
    }
    const w = NET.postWidthPx;
    const groundY = this.pitch.groundY;
    this.pitch.goals.forEach((goal, i) => {
      const parts = this.posts[i];
      if (!parts) return;
      const [po, pf, ps, bo, bf, bs] = parts;
      const bar = goal.crossbar;
      const left = goal.defender === 0;
      // Ön direk (görsel): kale çizgisinde, üst direkten zemine.
      const px = goal.lineX - (left ? w : 0);
      const h = groundY - bar.maxY;
      po?.setPosition(px - 1, bar.maxY).setDisplaySize(w + 2, h);
      pf?.setPosition(px, bar.maxY).setDisplaySize(w, h);
      ps?.setPosition(px + (left ? w * SHADE_FROM : 0), bar.maxY).setDisplaySize(
        w * (1 - SHADE_FROM),
        h,
      );
      // Üst direk.
      const bw = bar.maxX - bar.minX;
      const bh = bar.maxY - bar.minY;
      bo?.setPosition(bar.minX - 1, bar.minY - 1).setDisplaySize(bw + 2, bh + 2);
      bf?.setPosition(bar.minX, bar.minY).setDisplaySize(bw, bh);
      bs?.setPosition(bar.minX, bar.minY + bh * SHADE_FROM).setDisplaySize(
        bw,
        bh * (1 - SHADE_FROM),
      );
    });
  }
  private readonly posts: Phaser.GameObjects.Image[][] = [];
}

/** Büyüyen kale için ağın en fazla uzayacağı yükseklik payı (px). */
const MAX_GROWTH = 80;
const SHADE_FROM = 0.6;

/** Çizgi noktaları için yeniden kullanılan havuz (her karede dizi/nesne ayrılmasın). */
const linePool: { x: number; y: number }[] = [];

function poolPoint(k: number, x: number, y: number): void {
  const p = linePool[k];
  if (p) {
    p.x = x;
    p.y = y;
  } else {
    linePool[k] = { x, y };
  }
}

/**
 * Ağın baklava deseni: iki çapraz yönde çoklu çizgiler. Noktalar paylaşılan havuza yazılır;
 * `emit` çağrısı sırasında geçerlidir (n: bu çizginin nokta sayısı).
 */
function forEachNetLine(
  net: NetSim,
  node: NodeFn,
  emit: (pts: readonly { x: number; y: number }[], n: number) => void,
): void {
  const { cols, rows } = net;
  // Çapraz çizgiler: (i + j) sabit ve (i − j) sabit.
  for (let s = 0; s <= cols - 1 + rows - 1; s++) {
    let n = 0;
    for (let i = 0; i < cols; i++) {
      const j = s - i;
      if (j < 0 || j >= rows) continue;
      const p = node(i, j);
      poolPoint(n++, p.x, p.y);
    }
    if (n > 1) emit(linePool, n);
  }
  for (let s = -(rows - 1); s <= cols - 1; s++) {
    let n = 0;
    for (let i = 0; i < cols; i++) {
      const j = i - s;
      if (j < 0 || j >= rows) continue;
      const p = node(i, j);
      poolPoint(n++, p.x, p.y);
    }
    if (n > 1) emit(linePool, n);
  }
}

function drawNetGraphics(g: Phaser.GameObjects.Graphics, net: NetSim, node: NodeFn): void {
  g.lineStyle(NET.lineWidthPx, NET.color, NET.alpha);
  forEachNetLine(net, node, (pts, n) => {
    g.beginPath();
    for (let k = 0; k < n; k++) {
      const p = pts[k];
      if (!p) break;
      if (k === 0) g.moveTo(p.x, p.y);
      else g.lineTo(p.x, p.y);
    }
    g.strokePath();
  });
}
