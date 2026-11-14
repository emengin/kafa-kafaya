import type Phaser from 'phaser';
import { BALL_BAKE_RADIUS, FX_KEYS } from '../art/fxArt';
import { BALL_FX } from '../config/gameConfig';
import { Spring } from '../fx/Spring';

/** Bir topun çizim parçaları: hız/çarpma şekli için kap, dönen desen, sabit gölgelendirme. */
interface BallParts {
  readonly box: Phaser.GameObjects.Container;
  readonly pattern: Phaser.GameObjects.Image;
  readonly shade: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Image;
}

/**
 * Top görseli: dönen desen (fizikteki açı), dönmeyen ışık/gölge (ışık hep sol üstten), hıza
 * göre uzama ve çarpmada basılma (yay), zeminde yüksekliğe göre küçülüp solan gölge ve hızlı
 * topta beyaz hız izi. Serap yanılsamaları aynı görünür.
 */
export class BallView {
  private readonly main: BallParts;
  private readonly decoys: BallParts[] = [];
  private readonly trail: Phaser.GameObjects.Image[] = [];
  private readonly xs = new Float32Array(BALL_FX.trailPoints);
  private readonly ys = new Float32Array(BALL_FX.trailPoints);
  private trailCount = 0;
  private readonly squash = new Spring(BALL_FX.squashStiffness, BALL_FX.squashDamping);
  private squashAngle = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    shadowLayer: Phaser.GameObjects.Container,
    trailLayer: Phaser.GameObjects.Container,
    private readonly ballLayer: Phaser.GameObjects.Container,
    private readonly groundY: number,
    decoyCount: number,
  ) {
    for (let i = 0; i < BALL_FX.trailPoints; i++) {
      const img = scene.add
        .image(0, 0, FX_KEYS.particles, 'dot')
        .setTint(BALL_FX.trailColor)
        .setVisible(false);
      this.trail.push(img);
    }
    trailLayer.add(this.trail);
    this.main = this.makeParts(shadowLayer);
    for (let i = 0; i < decoyCount; i++) {
      const parts = this.makeParts(shadowLayer);
      parts.box.setVisible(false);
      parts.shadow.setVisible(false);
      this.decoys.push(parts);
    }
  }

  private makeParts(shadowLayer: Phaser.GameObjects.Container): BallParts {
    const add = this.scene.add;
    const shadow = add.image(0, this.groundY, FX_KEYS.shadow);
    shadowLayer.add(shadow);
    const pattern = add.image(0, 0, FX_KEYS.ballPattern);
    const shade = add.image(0, 0, FX_KEYS.ballShade);
    const box = add.container(0, 0, [pattern, shade]);
    this.ballLayer.add(box);
    return { box, pattern, shade, shadow };
  }

  /** Çarpma: çarpma normaline dik yönde basılma (hızla orantılı). */
  impact(speed: number, normalAngle: number): void {
    this.squashAngle = normalAngle;
    this.squash.kick(
      -Math.min(
        BALL_FX.maxSquash * BALL_FX.squashStiffness * SQUASH_KICK,
        speed * BALL_FX.squashPerSpeed,
      ),
    );
  }

  /** İzi sıfırlar (santra, ışınlanma). */
  resetTrail(): void {
    this.trailCount = 0;
  }

  /**
   * @param visible Işınlanan top görünmez.
   * @param drawTrail Normal hız izi çizilsin mi (süper toplarda iz `SuperFx`'te).
   */
  update(
    dt: number,
    x: number,
    y: number,
    angle: number,
    radius: number,
    vx: number,
    vy: number,
    visible: boolean,
    drawTrail: boolean,
  ): void {
    this.pushTrail(x, y);
    const speed = Math.hypot(vx, vy);
    const sq = this.squash.update(dt);
    // Hızla uzama (hız yönünde) ya da çarpmada basılma (normal yönünde) — hangisi baskınsa.
    const stretch = Math.min(BALL_FX.maxStretch, speed * BALL_FX.stretchPerSpeed);
    let dir = Math.atan2(vy, vx);
    let s = stretch;
    if (Math.abs(sq) > stretch) {
      dir = this.squashAngle;
      s = Math.max(-BALL_FX.maxSquash, sq);
    }
    this.place(this.main, x, y, angle, radius, dir, s, visible);
    this.drawTrail(radius, speed, visible && drawTrail);
  }

  /** Serap yanılsamaları (gerçek topla aynı görünür). */
  updateDecoys(
    decoys: readonly {
      x: number;
      y: number;
      angle: number;
      radius: number;
      vx: number;
      vy: number;
    }[],
  ): void {
    this.decoys.forEach((parts, i) => {
      const d = decoys[i];
      if (!d) {
        parts.box.setVisible(false);
        parts.shadow.setVisible(false);
        return;
      }
      const speed = Math.hypot(d.vx, d.vy);
      this.place(
        parts,
        d.x,
        d.y,
        d.angle,
        d.radius,
        Math.atan2(d.vy, d.vx),
        Math.min(BALL_FX.maxStretch, speed * BALL_FX.stretchPerSpeed),
        true,
      );
    });
  }

  private place(
    p: BallParts,
    x: number,
    y: number,
    angle: number,
    radius: number,
    dir: number,
    s: number,
    visible: boolean,
  ): void {
    p.box.setVisible(visible);
    p.shadow.setVisible(visible);
    if (!visible) return;
    const k = radius / BALL_BAKE_RADIUS;
    p.box
      .setPosition(x, y)
      .setRotation(dir)
      .setScale(k * (1 + s), k / (1 + s));
    p.pattern.setRotation(angle - dir);
    p.shade.setRotation(-dir);
    const height = Math.max(0, this.groundY - (y + radius));
    const f = Math.max(BALL_FX.shadowMinScale, 1 - height / BALL_FX.shadowFadeHeight);
    const tex = p.shadow.width;
    p.shadow
      .setPosition(x, this.groundY)
      .setScale(
        (radius * BALL_FX.shadowWidth * f) / tex,
        (radius * BALL_FX.shadowHeight * f * 2) / tex,
      )
      .setAlpha(BALL_FX.shadowAlpha * f);
  }

  private pushTrail(x: number, y: number): void {
    const n = this.trailCount;
    if (n > 0) {
      const lx = this.xs[n - 1] ?? x;
      const ly = this.ys[n - 1] ?? y;
      if (Math.hypot(lx - x, ly - y) > BALL_FX.trailResetPx) this.trailCount = 0;
    }
    if (this.trailCount === this.xs.length) {
      this.xs.copyWithin(0, 1);
      this.ys.copyWithin(0, 1);
      this.trailCount--;
    }
    this.xs[this.trailCount] = x;
    this.ys[this.trailCount] = y;
    this.trailCount++;
  }

  /** Son konumları (eskiden yeniye) okumak için: süper izleri de bunu kullanır. */
  trailPoint(i: number): { x: number; y: number } {
    this.tmp.x = this.xs[i] ?? 0;
    this.tmp.y = this.ys[i] ?? 0;
    return this.tmp;
  }
  private readonly tmp = { x: 0, y: 0 };

  get trailLength(): number {
    return this.trailCount;
  }

  private drawTrail(radius: number, speed: number, enabled: boolean): void {
    const on = enabled && speed >= BALL_FX.trailMinSpeed;
    const strength = Math.min(
      1,
      (speed - BALL_FX.trailMinSpeed) / (BALL_FX.trailFullSpeed - BALL_FX.trailMinSpeed),
    );
    const n = this.trailCount;
    this.trail.forEach((img, i) => {
      if (!on || i >= n - 1) {
        img.setVisible(false);
        return;
      }
      const k = (i + 1) / n;
      img
        .setVisible(true)
        .setPosition(this.xs[i] ?? 0, this.ys[i] ?? 0)
        .setScale((radius * 2 * k * TRAIL_SIZE) / DOT_CELL)
        .setAlpha(BALL_FX.trailAlpha * strength * k);
    });
  }
}

const TRAIL_SIZE = 1.1;
/** Parçacık atlasındaki nokta karesinin kenarı (px). */
const DOT_CELL = 48;
/** Basılma darbesinin üst sınırı için yay ölçeği (yay sabitine göre). */
const SQUASH_KICK = 0.05;
