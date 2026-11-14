import Phaser from 'phaser';
import {
  COLORS,
  FX,
  GRAYBOX,
  HUD,
  PLAYER,
  POWERUPS,
  UNITS,
  type SuperType,
} from '../config/gameConfig';
import type { CharacterDef } from '../game/characters';
import { footOffset, type Player } from '../game/entities/Player';
import type { GameSim } from '../game/GameSim';
import type { Pitch } from '../game/pitch';
import { upper } from '../i18n';
import { drawPowerUpIcon } from './icons';
import type { RenderFrame } from './renderFrame';

type Graphics = Phaser.GameObjects.Graphics;

const TWO_PI = Math.PI * 2;
/** Topun iz noktaları arasında santra ışınlanması sayılacak uzaklık (px). */
const TRAIL_RESET_PX = 200;
/** Kasırga yaylarının topa göre yarıçap katsayısı ve yay uzunluğu (tam turun oranı). */
const TORNADO_RADIUS = 1.9;
const TORNADO_ARC = 0.18;
/** Buz örtüsünün kafa ve gövdeye göre yarıçap payı (px). */
const FROST_PAD = 3;
/** Zıplama kilidi çizgisinin genişliği (kafa yarıçapına oran) ve kalınlığı. */
const LOCK_WIDTH = 1.1;

/**
 * Maç çizimi (basit vektör şekiller): saha bir kez; kaleler (büyüyebildikleri için) değişince;
 * oyuncular, top, süper efektleri, yanılsamalar ve balon her karede. Oyuncular karakter
 * renkleriyle ve o anki kafa boyutuyla çizilir.
 */
export class GrayboxRenderer {
  private readonly goals: Graphics;
  private readonly dynamic: Graphics;
  private readonly labels: [Phaser.GameObjects.Text, Phaser.GameObjects.Text];
  private readonly trail: { x: number; y: number }[] = [];
  private shownMouths: [number, number] = [-1, -1];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sim: GameSim,
    private readonly characters: readonly [CharacterDef, CharacterDef],
  ) {
    drawPitch(scene.add.graphics(), sim.pitch);
    this.goals = scene.add.graphics();
    this.dynamic = scene.add.graphics();
    const label = (i: 0 | 1): Phaser.GameObjects.Text =>
      scene.add
        .text(0, 0, upper(characters[i].name), {
          fontFamily: HUD.fontFamily,
          fontSize: `${HUD.label.fontSizePx}px`,
          color: HUD.playerColors[i],
          stroke: COLORS.textStroke,
          strokeThickness: HUD.label.strokePx,
        })
        .setOrigin(0.5, 1)
        .setAlpha(HUD.label.alpha);
    this.labels = [label(0), label(1)];
  }

  /** @param nowMs Sahne zamanı (nabız ve dönen efektler için). */
  draw(frame: RenderFrame, nowMs: number): void {
    this.drawGoalsIfChanged();
    const g = this.dynamic;
    g.clear();
    const seconds = nowMs / UNITS.msPerSecond;
    this.drawBalloon(g, seconds);
    for (const p of this.sim.players) this.drawPlayer(g, p, frame, seconds);
    this.drawBallAndEffects(g, frame, seconds);
  }

  /** Işınlanan topun yeniden belirdiği yerde kısa bir halka patlaması. */
  burst(x: number, y: number, color: number): void {
    const ring = this.scene.add
      .circle(x, y, this.sim.ball.radius, color, 0)
      .setStrokeStyle(FX.glowWidthPx, color, 1);
    this.scene.tweens.add({
      targets: ring,
      radius: FX.teleportBurstRadius,
      alpha: 0,
      duration: FX.teleportBurstMs,
      onComplete: () => {
        ring.destroy();
      },
    });
  }

  private drawGoalsIfChanged(): void {
    const [a, b] = this.sim.pitch.goals;
    if (this.shownMouths[0] === a.mouthHeight && this.shownMouths[1] === b.mouthHeight) return;
    this.shownMouths = [a.mouthHeight, b.mouthHeight];
    this.goals.clear();
    drawGoals(this.goals, this.sim.pitch);
  }

  private drawPlayer(g: Graphics, p: Player, frame: RenderFrame, seconds: number): void {
    const pose = frame.players[p.index];
    const colors = this.characters[p.index].palette;
    const headR = p.headRadius;
    const hipY = pose.y + PLAYER.foot.hipOffsetY;
    const foot = footOffset(pose.footAngle, p.facing);
    const fx = pose.x + foot.x;
    const fy = pose.y + foot.y;
    const kicking = p.kickPhase === 'swing';
    const bodyY = pose.y + PLAYER.body.offsetY;

    // Gövde
    g.fillStyle(colors.body, 1);
    g.fillCircle(pose.x, bodyY, PLAYER.body.radius);
    g.lineStyle(GRAYBOX.outlinePx, GRAYBOX.outline, 1);
    g.strokeCircle(pose.x, bodyY, PLAYER.body.radius);
    // Bacak + ayak
    g.lineStyle(GRAYBOX.legWidthPx, colors.foot, 1);
    g.lineBetween(pose.x, hipY, fx, fy);
    g.fillStyle(kicking ? GRAYBOX.kickFoot : colors.foot, 1);
    g.fillCircle(fx, fy, PLAYER.foot.radius);
    g.lineStyle(GRAYBOX.outlinePx, GRAYBOX.outline, 1);
    g.strokeCircle(fx, fy, PLAYER.foot.radius);
    // Kafa
    g.fillStyle(colors.head, 1);
    g.fillCircle(pose.x, pose.y, headR);
    g.strokeCircle(pose.x, pose.y, headR);
    // Göz: bakış yönü
    const eye = GRAYBOX.eye;
    g.fillStyle(eye.color, 1);
    g.fillCircle(
      pose.x + p.facing * headR * eye.forwardRatio,
      pose.y - headR * eye.upRatio,
      eye.radius,
    );
    // Süper hazır: kafanın çevresinde karakter renginde nabız atan halka.
    if (p.superArmed) {
      const glow = GRAYBOX.superGlow;
      const pulse = 0.5 + 0.5 * Math.sin(seconds * glow.pulseHz * TWO_PI);
      g.lineStyle(glow.lineWidthPx, colors.accent, glow.alphaMin + (1 - glow.alphaMin) * pulse);
      g.strokeCircle(pose.x, pose.y, headR + glow.extraRadius);
    }
    // Donmuş: buz örtüsü.
    if (p.frozen) {
      g.fillStyle(FX.frozenColor, FX.frozenAlpha);
      g.fillCircle(pose.x, pose.y, headR + FROST_PAD);
      g.fillCircle(pose.x, bodyY, PLAYER.body.radius + FROST_PAD);
    }
    // Zıplayamıyor (Sarsıntı): ayak altında toz çizgisi.
    if (p.jumpLockTimer > 0) {
      const groundY = this.sim.pitch.groundY;
      g.lineStyle(GRAYBOX.legWidthPx, FX.jumpLockColor, 1);
      g.lineBetween(pose.x - headR * LOCK_WIDTH, groundY, pose.x + headR * LOCK_WIDTH, groundY);
    }

    const label = this.labels[p.index];
    label.setPosition(pose.x, pose.y - headR - HUD.label.gapPx);
  }

  private drawBallAndEffects(g: Graphics, frame: RenderFrame, seconds: number): void {
    const ball = this.sim.ball;
    const b = frame.ball;
    const type = ball.superType;
    this.updateTrail(b.x, b.y, type);

    // Serap yanılsamaları gerçek topla aynı görünür.
    for (const d of this.sim.decoys) {
      drawSuperRing(g, d.ball.x, d.ball.y, d.ball.radius, 'mirage');
      drawBall(g, d.ball.x, d.ball.y, d.ball.radius, d.ball.angle, 1);
    }

    if (ball.phased) {
      // Işınlanma: top görünmez; yerinde yalnızca silik bir pırıltı.
      g.lineStyle(FX.glowWidthPx, FX.superColors.teleport, FX.teleportShimmerAlpha);
      g.strokeCircle(b.x, b.y, ball.radius);
      return;
    }
    if (type) this.drawTrail(g, type);
    if (type === 'tornado') drawTornado(g, b.x, b.y, ball.radius, seconds);
    if (type) drawSuperRing(g, b.x, b.y, ball.radius, type);
    drawBall(g, b.x, b.y, ball.radius, b.angle, 1);
    if (type === 'ice' || type === 'fire') {
      g.fillStyle(FX.superColors[type], FX.trailAlpha);
      g.fillCircle(b.x, b.y, ball.radius);
    }
  }

  private updateTrail(x: number, y: number, type: SuperType | null): void {
    const last = this.trail[this.trail.length - 1];
    if (!type || (last && Math.hypot(last.x - x, last.y - y) > TRAIL_RESET_PX)) {
      this.trail.length = 0;
    }
    if (!type) return;
    this.trail.push({ x, y });
    if (this.trail.length > FX.trailLength) this.trail.shift();
  }

  private drawTrail(g: Graphics, type: SuperType): void {
    const n = this.trail.length;
    const r = this.sim.ball.radius;
    for (let i = 0; i < n - 1; i++) {
      const pt = this.trail[i];
      if (!pt) continue;
      const k = (i + 1) / n;
      const color =
        type === 'rainbow'
          ? (FX.rainbowColors[i % FX.rainbowColors.length] ?? FX.superColors.rainbow)
          : FX.superColors[type];
      g.fillStyle(color, FX.trailAlpha * k);
      g.fillCircle(pt.x, pt.y, r * k);
    }
  }

  private drawBalloon(g: Graphics, seconds: number): void {
    const balloon = this.sim.balloon;
    const pos = this.sim.balloonPosition();
    if (!balloon || !pos) return;
    const c = FX.balloon;
    const left = POWERUPS.balloon.lifetimeSeconds - balloon.age;
    if (left < c.warnSeconds && Math.floor(seconds * c.blinkHz * 2) % 2 === 1) return;
    const r = POWERUPS.balloon.radius;
    const color = FX.powerUpColors[balloon.type];
    g.lineStyle(GRAYBOX.outlinePx, c.stringColor, 1);
    g.lineBetween(pos.x, pos.y + r, pos.x, pos.y + r + c.stringPx);
    g.fillStyle(color, c.fillAlpha);
    g.fillCircle(pos.x, pos.y, r);
    g.lineStyle(GRAYBOX.outlinePx, c.outline, 1);
    g.strokeCircle(pos.x, pos.y, r);
    drawPowerUpIcon(g, balloon.type, pos.x, pos.y, r * c.iconScale, c.outline);
  }
}

function drawBall(
  g: Graphics,
  x: number,
  y: number,
  r: number,
  angle: number,
  alpha: number,
): void {
  g.fillStyle(GRAYBOX.ball.fill, alpha);
  g.fillCircle(x, y, r);
  g.lineStyle(GRAYBOX.outlinePx, GRAYBOX.outline, alpha);
  g.strokeCircle(x, y, r);
  g.lineStyle(GRAYBOX.ball.spokePx, GRAYBOX.ball.spoke, alpha);
  g.lineBetween(
    x - Math.cos(angle) * r,
    y - Math.sin(angle) * r,
    x + Math.cos(angle) * r,
    y + Math.sin(angle) * r,
  );
}

function drawSuperRing(g: Graphics, x: number, y: number, r: number, type: SuperType): void {
  g.lineStyle(FX.glowWidthPx, FX.superColors[type], 1);
  g.strokeCircle(x, y, r + FX.glowExtraPx);
}

function drawTornado(g: Graphics, x: number, y: number, r: number, seconds: number): void {
  const R = r * TORNADO_RADIUS;
  const spin = seconds * FX.tornadoSpinHz * TWO_PI;
  g.lineStyle(FX.glowWidthPx, FX.superColors.tornado, FX.trailAlpha * 2);
  for (let i = 0; i < FX.tornadoArcs; i++) {
    const start = spin + (i * TWO_PI) / FX.tornadoArcs;
    g.beginPath();
    g.arc(x, y, R, start, start + TWO_PI * TORNADO_ARC, false);
    g.strokePath();
  }
}

/** Saha zemini ve çizgileri (kaleler ayrı katmanda). */
function drawPitch(g: Graphics, pitch: Pitch): void {
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
}

/** Kaleler: ağ, ön direk, katı üst direk (yükseklik "Rakip Kalesini Büyüt" ile değişir). */
function drawGoals(g: Graphics, pitch: Pitch): void {
  const { groundY } = pitch;
  for (const goal of pitch.goals) {
    const net = goal.net;
    g.lineStyle(GRAYBOX.netLineWidthPx, GRAYBOX.net, GRAYBOX.netAlpha);
    for (let x = net.minX; x <= net.maxX; x += GRAYBOX.netSpacingPx) {
      g.lineBetween(x, net.minY, x, net.maxY);
    }
    for (let y = net.maxY; y >= net.minY; y -= GRAYBOX.netSpacingPx) {
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

/** Topun süper rengi (efektler ve yazılar için). */
export function superColor(type: SuperType): number {
  return FX.superColors[type];
}
