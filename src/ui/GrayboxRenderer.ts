import Phaser from 'phaser';
import { COLORS, GRAYBOX, HUD, PLAYER } from '../config/gameConfig';
import { footOffset } from '../game/entities/Player';
import type { GameSim } from '../game/GameSim';
import type { Pitch } from '../game/pitch';
import type { RenderFrame } from './renderFrame';

/** Faz 1 gri kutu çizimi: saha bir kez, oyuncular ve top her karede. */
export class GrayboxRenderer {
  private readonly dynamic: Phaser.GameObjects.Graphics;
  private readonly labels: [Phaser.GameObjects.Text, Phaser.GameObjects.Text];

  constructor(
    scene: Phaser.Scene,
    private readonly sim: GameSim,
  ) {
    drawPitch(scene.add.graphics(), sim.pitch);
    this.dynamic = scene.add.graphics();
    const label = (text: string, color: string): Phaser.GameObjects.Text =>
      scene.add
        .text(0, 0, text, {
          fontFamily: HUD.fontFamily,
          fontSize: `${HUD.label.fontSizePx}px`,
          color,
          stroke: COLORS.textStroke,
          strokeThickness: HUD.label.strokePx,
        })
        .setOrigin(0.5, 1)
        .setAlpha(HUD.label.alpha);
    this.labels = [label('P1', HUD.playerColors[0]), label('P2', HUD.playerColors[1])];
  }

  draw(frame: RenderFrame): void {
    const g = this.dynamic;
    g.clear();
    for (const p of this.sim.players) {
      const pose = frame.players[p.index];
      const colors = GRAYBOX.players[p.index];
      const hipY = pose.y + PLAYER.foot.hipOffsetY;
      const foot = footOffset(pose.footAngle, p.facing);
      const fx = pose.x + foot.x;
      const fy = pose.y + foot.y;
      const kicking = p.kickPhase === 'swing';

      // Gövde
      g.fillStyle(colors.body, 1);
      g.fillCircle(pose.x, pose.y + PLAYER.body.offsetY, PLAYER.body.radius);
      g.lineStyle(GRAYBOX.outlinePx, GRAYBOX.outline, 1);
      g.strokeCircle(pose.x, pose.y + PLAYER.body.offsetY, PLAYER.body.radius);
      // Bacak + ayak
      g.lineStyle(GRAYBOX.legWidthPx, colors.foot, 1);
      g.lineBetween(pose.x, hipY, fx, fy);
      g.fillStyle(kicking ? GRAYBOX.kickFoot : colors.foot, 1);
      g.fillCircle(fx, fy, PLAYER.foot.radius);
      g.lineStyle(GRAYBOX.outlinePx, GRAYBOX.outline, 1);
      g.strokeCircle(fx, fy, PLAYER.foot.radius);
      // Kafa
      g.fillStyle(colors.head, 1);
      g.fillCircle(pose.x, pose.y, PLAYER.head.radius);
      g.strokeCircle(pose.x, pose.y, PLAYER.head.radius);
      // Göz: bakış yönü
      const eye = GRAYBOX.eye;
      g.fillStyle(eye.color, 1);
      g.fillCircle(
        pose.x + p.facing * PLAYER.head.radius * eye.forwardRatio,
        pose.y - PLAYER.head.radius * eye.upRatio,
        eye.radius,
      );

      const label = this.labels[p.index];
      label.setPosition(pose.x, pose.y - PLAYER.head.radius - HUD.label.gapPx);
    }

    // Top: dönüşü görünsün diye bir "kol" çizgisi.
    const b = frame.ball;
    const r = this.sim.ball.radius;
    g.fillStyle(GRAYBOX.ball.fill, 1);
    g.fillCircle(b.x, b.y, r);
    g.lineStyle(GRAYBOX.outlinePx, GRAYBOX.outline, 1);
    g.strokeCircle(b.x, b.y, r);
    g.lineStyle(GRAYBOX.ball.spokePx, GRAYBOX.ball.spoke, 1);
    g.lineBetween(
      b.x - Math.cos(b.angle) * r,
      b.y - Math.sin(b.angle) * r,
      b.x + Math.cos(b.angle) * r,
      b.y + Math.sin(b.angle) * r,
    );
  }
}

function drawPitch(g: Phaser.GameObjects.Graphics, pitch: Pitch): void {
  const { width, height, groundY } = pitch;

  g.fillStyle(GRAYBOX.background, 1);
  g.fillRect(0, 0, width, height);

  // Orta çizgi ve orta daire (yalnızca görsel).
  g.lineStyle(GRAYBOX.lineWidthPx, GRAYBOX.centerLine, 1);
  g.lineBetween(width / 2, pitch.ceilingY, width / 2, groundY);
  g.strokeCircle(width / 2, groundY, GRAYBOX.centerCircleRadius);

  // Zemin
  g.fillStyle(GRAYBOX.ground, 1);
  g.fillRect(0, groundY, width, height - groundY);
  g.fillStyle(GRAYBOX.groundLine, 1);
  g.fillRect(0, groundY, width, GRAYBOX.lineWidthPx);

  for (const goal of pitch.goals) {
    // Ağ: ızgara çizgileri
    const net = goal.net;
    g.lineStyle(GRAYBOX.netLineWidthPx, GRAYBOX.net, GRAYBOX.netAlpha);
    for (let x = net.minX; x <= net.maxX; x += GRAYBOX.netSpacingPx) {
      g.lineBetween(x, net.minY, x, net.maxY);
    }
    for (let y = net.minY; y <= net.maxY; y += GRAYBOX.netSpacingPx) {
      g.lineBetween(net.minX, y, net.maxX, y);
    }
    // Ön direk (kale ağzı; görseldir, top içinden geçer)
    g.lineStyle(GRAYBOX.postWidthPx, GRAYBOX.post, 1);
    g.lineBetween(goal.lineX, net.minY, goal.lineX, groundY);
    // Üst direk (katı)
    const bar = goal.crossbar;
    g.fillStyle(GRAYBOX.crossbar, 1);
    g.fillRect(bar.minX, bar.minY, bar.maxX - bar.minX, bar.maxY - bar.minY);
  }
}
