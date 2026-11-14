import Phaser from 'phaser';
import { DEBUG, KICK } from '../config/gameConfig';
import type { GameSim } from '../game/GameSim';
import type { Player, PlayerPart } from '../game/entities/Player';

export interface FrameStats {
  /** Phaser'ın ölçtüğü render FPS'i. */
  readonly fps: number;
  /** Bir fizik adımının ortalama süresi (ms). */
  readonly stepMs: number;
  /** Son karede koşulan sabit adım sayısı. */
  readonly stepsThisFrame: number;
}

const PARTS: readonly PlayerPart[] = ['head', 'body', 'foot'];

/**
 * F1 ile açılan debug katmanı: collider'lar, hız vektörleri, FPS, fizik adım süresi,
 * alt adım sayısı ve oyuncu durumları. Simülasyonun o anki (enterpole edilmemiş) durumunu
 * gösterir.
 */
export class DebugOverlay {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(DEBUG.depth);
    const t = DEBUG.text;
    this.text = scene.add
      .text(t.x, t.y, '', {
        fontFamily: 'monospace',
        fontSize: `${t.fontSizePx}px`,
        color: t.color,
        backgroundColor: t.background,
        padding: { x: t.padding, y: t.padding },
      })
      .setDepth(DEBUG.depth)
      .setVisible(false);
  }

  get isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.text.setVisible(visible);
    if (!visible) this.g.clear();
  }

  toggle(): void {
    this.setVisible(!this.visible);
  }

  update(sim: GameSim, stats: FrameStats): void {
    if (!this.visible) return;
    const g = this.g;
    const c = DEBUG.colors;
    const w = DEBUG.lineWidthPx;
    g.clear();

    // Statik geometri
    g.lineStyle(w, c.static, DEBUG.alpha);
    for (const col of sim.pitch.colliders) {
      if (col.type === 'segment') {
        const s = col.shape;
        g.lineBetween(s.ax, s.ay, s.bx, s.by);
      } else {
        const r = col.shape;
        g.strokeRect(r.minX, r.minY, r.maxX - r.minX, r.maxY - r.minY);
      }
    }
    for (const goal of sim.pitch.goals) {
      const z = goal.restZone;
      g.lineStyle(w, c.zone, DEBUG.alpha);
      g.strokeRect(z.minX, z.minY, z.maxX - z.minX, z.maxY - z.minY);
      const n = goal.net;
      g.lineStyle(w, c.net, DEBUG.alpha);
      g.strokeRect(n.minX, n.minY, n.maxX - n.minX, n.maxY - n.minY);
    }

    // Dinamik collider'lar ve hız vektörleri
    for (const p of sim.players) {
      g.lineStyle(w, c.dynamic, DEBUG.alpha);
      for (const part of PARTS) {
        const circle = p.partCircle(part);
        g.strokeCircle(circle.x, circle.y, circle.radius);
      }
      if (p.kickPhase === 'swing' && !p.kickHitDone) {
        const foot = p.partCircle('foot');
        g.lineStyle(w, c.kick, DEBUG.alpha);
        g.strokeCircle(foot.x, foot.y, foot.radius + KICK.hitRadiusBonus);
      }
      this.drawVelocity(p.x, p.y, p.vx, p.vy);
    }
    const ball = sim.ball;
    g.lineStyle(w, c.dynamic, DEBUG.alpha);
    g.strokeCircle(ball.x, ball.y, ball.radius);
    this.drawVelocity(ball.x, ball.y, ball.vx, ball.vy);

    const d = DEBUG.decimals;
    this.text.setText(
      [
        `FPS ${stats.fps.toFixed(1)}`,
        `phys ${stats.stepMs.toFixed(d + 1)} ms/step  steps/frame ${stats.stepsThisFrame}`,
        `substeps ${sim.lastSubSteps}  tick ${sim.tick}`,
        `ball v ${ball.speed.toFixed(0)} px/s  spin ${ball.angVel.toFixed(d)} rad/s`,
        `ball ground ${flag(ball.grounded)}  crossbar ${ball.crossbarTimer.toFixed(d)} s`,
        playerLine(sim.players[0]),
        playerLine(sim.players[1]),
      ].join('\n'),
    );
  }

  private drawVelocity(x: number, y: number, vx: number, vy: number): void {
    const k = DEBUG.velocityScaleSeconds;
    this.g.lineStyle(DEBUG.lineWidthPx, DEBUG.colors.velocity, DEBUG.alpha);
    this.g.lineBetween(x, y, x + vx * k, y + vy * k);
  }
}

function flag(value: boolean): string {
  return value ? 'Y' : 'n';
}

function playerLine(p: Player): string {
  const d = DEBUG.decimals;
  return (
    `P${p.index + 1} v ${p.vx.toFixed(0)},${p.vy.toFixed(0)} ` +
    `ground ${flag(p.grounded)} coyote ${p.coyoteTimer.toFixed(d)} buf ${p.jumpBufferTimer.toFixed(d)} ` +
    `kick ${p.kickPhase}`
  );
}
