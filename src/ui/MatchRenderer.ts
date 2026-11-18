import Phaser from 'phaser';
import { css, hex, makeCanvasTexture, roundRectPath } from '../art/canvas';
import { BALLOON_ART, FX_KEYS } from '../art/fxArt';
import { STAGE_KEYS } from '../art/stadiumArt';
import {
  ANIM,
  BALL,
  CHARACTER_ART,
  COLORS,
  DISPLAY,
  FX,
  HUD,
  JUICE,
  KICK,
  NET,
  PLAYER,
  POWERUPS,
  STADIUM,
  type PowerUpType,
  type SuperType,
} from '../config/gameConfig';
import { CameraRig, ScreenShake, type QualityLevel } from '../fx/feel';
import type { CharacterDef } from '../game/characters';
import { PLAYER_STAND_OFFSET, type Player } from '../game/entities/Player';
import type { GameSim } from '../game/GameSim';
import type { PlayerIndex } from '../game/types';
import { BallView } from './BallView';
import { CharacterRig } from './CharacterRig';
import { GoalView } from './GoalView';
import { ICON_RADIUS, iconKey } from './icons';
import { ParticleLayer, SpritePool } from './ParticleLayer';
import type { RenderFrame } from './renderFrame';
import { StadiumView } from './StadiumView';
import { SuperFx } from './SuperFx';

/** Sık kullanılan renk. */
const GOLD = 0xffd23f;

/** Sık kullanılan renk. */
const WHITE = 0xffffff;

type Container = Phaser.GameObjects.Container;

/** Dünya katmanları (arkadan öne). */
interface Layers {
  readonly world: Container;
  readonly stage: Container;
  readonly shadows: Container;
  readonly goalBack: Container;
  readonly balloon: Container;
  readonly actors: Container;
  readonly trail: Container;
  readonly ball: Container;
  readonly goalFront: Container;
  readonly particles: Container;
  readonly additive: Container;
  readonly flashes: Container;
  readonly texts: Container;
}

/** Yükselen yazının stili. */
interface FloatStyle {
  readonly fontSizePx: number;
  readonly strokePx: number;
  readonly risePx: number;
  readonly durationMs: number;
}

/** Kafa üstü etiketi (P1/P2/CPU): yuvarlak hap + metin. */
interface Tag {
  readonly box: Container;
}

const TWO_PI = Math.PI * 2;

/**
 * Maç dünyasının çizimi. Tüm dünya tek bir kapta (Container): ekran sarsıntısı ve gol zoom'u
 * yalnızca dünyaya uygulanır, HUD sabit kalır. Katmanlar: stadyum → gölgeler → kale içi →
 * balon → oyuncular → top izi/top → ağ ve direkler → parçacıklar → flaşlar → yazılar.
 *
 * Olaylar (`onKick`, `onGoal`…) sahneden gelir; bu sınıf yalnızca görseldir.
 */
export class MatchRenderer {
  readonly shake = new ScreenShake();
  readonly camera = new CameraRig(DISPLAY.width, DISPLAY.height);
  private readonly layers: Layers;
  private readonly stadium: StadiumView;
  private readonly goals: GoalView;
  private readonly ball: BallView;
  private readonly superFx: SuperFx;
  private readonly particles: ParticleLayer;
  private readonly flashes: SpritePool;
  private readonly rings: SpritePool;
  readonly rigs: [CharacterRig, CharacterRig];
  private readonly tags: [Tag, Tag];
  private readonly balloonImg: Phaser.GameObjects.Image;
  private readonly balloonG: Phaser.GameObjects.Graphics;
  private readonly fxG: Phaser.GameObjects.Graphics;
  private readonly runDistance: [number, number] = [0, 0];
  private readonly lastHeaderTime: [number, number] = [-1, -1];
  private flashTimer = 0;
  private flashSide: 0 | 1 | -1 = -1;
  private fireworksTimer = 0;
  private fireworksNext = 0;
  private quality: QualityLevel;
  private readonly decoyBuf: {
    x: number;
    y: number;
    angle: number;
    radius: number;
    vx: number;
    vy: number;
  }[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sim: GameSim,
    private readonly characters: readonly [CharacterDef, CharacterDef],
    tagLabels: readonly [string, string],
    quality: QualityLevel,
    texts: { title: string; goal: string },
  ) {
    this.quality = quality;
    const add = scene.add;
    const layer = (): Container => add.container(0, 0);
    const l = {
      stage: layer(),
      shadows: layer(),
      goalBack: layer(),
      balloon: layer(),
      actors: layer(),
      trail: layer(),
      ball: layer(),
      goalFront: layer(),
      particles: layer(),
      additive: layer(),
      flashes: layer(),
      texts: layer(),
    };
    const world = add.container(0, 0, Object.values(l));
    this.layers = { world, ...l };

    const [c1, c2] = characters;
    this.stadium = new StadiumView(scene, l.stage, {
      leftColors: [c1.palette.body, c1.palette.accent],
      rightColors: [c2.palette.body, c2.palette.accent],
      quality,
      title: texts.title,
      goalText: texts.goal,
    });
    this.goals = new GoalView(scene, sim.pitch, l.goalBack, l.goalFront);

    this.balloonImg = add
      .image(0, 0, FX_KEYS.balloon)
      .setOrigin(0.5, BALLOON_ART.originY)
      .setVisible(false);
    this.balloonG = add.graphics();
    l.balloon.add([this.balloonG, this.balloonImg]);
    this.balloonIcon = add.image(0, 0, iconKey('speed')).setTint(ICON_COLOR).setVisible(false);
    l.balloon.add(this.balloonIcon);

    const groundY = sim.pitch.groundY;
    this.rigs = [
      new CharacterRig(scene, c1, { shadowLayer: l.shadows, groundY }),
      new CharacterRig(scene, c2, { shadowLayer: l.shadows, groundY }),
    ];
    l.actors.add([this.rigs[0].root, this.rigs[1].root]);
    this.tags = [this.makeTag(tagLabels[0], 0), this.makeTag(tagLabels[1], 1)];

    this.ball = new BallView(scene, l.shadows, l.trail, l.ball, groundY, DECOYS);
    this.particles = new ParticleLayer(scene, l.particles, l.additive, quality);
    this.flashes = new SpritePool(scene, l.flashes, FX_KEYS.flash, FLASH_POOL, true);
    this.rings = new SpritePool(scene, l.flashes, FX_KEYS.ring, RING_POOL, true);
    this.superFx = new SuperFx(scene, l.trail, this.particles, this.rings, this.ball);
    this.fxG = add.graphics();
    l.trail.add(this.fxG);

    this.vignette = add.image(0, 0, STAGE_KEYS.vignette).setOrigin(0).setDepth(VIGNETTE_DEPTH);
    this.setQuality(quality);
  }

  private readonly balloonIcon: Phaser.GameObjects.Image;
  private readonly vignette: Phaser.GameObjects.Image;

  private makeTag(label: string, i: PlayerIndex): Tag {
    const t = CHARACTER_ART.tag;
    const text = this.scene.add
      .text(0, 0, label, {
        fontFamily: HUD.fontFamily,
        fontSize: `${t.fontSizePx}px`,
        color: '#ffffff',
        stroke: COLORS.textStroke,
        strokeThickness: TAG_STROKE,
      })
      .setOrigin(0.5, 0.5);
    const w = Math.ceil(text.width + t.padX * 2);
    const h = Math.ceil(text.height + t.padY * 2);
    const color = Phaser.Display.Color.HexStringToColor(HUD.playerColors[i]).color;
    const key = `tag-${i}-${label}`;
    const pad = t.arrowPx + 2;
    makeCanvasTexture(this.scene, key, w + pad * 2, h + pad * 2, (ctx) => {
      ctx.translate(pad, pad);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      roundRectPath(ctx, 1, 2, w, h, h / 2);
      ctx.fill();
      ctx.fillStyle = css(color);
      roundRectPath(ctx, 0, 0, w, h, h / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w / 2 - t.arrowPx, h - 1);
      ctx.lineTo(w / 2 + t.arrowPx, h - 1);
      ctx.lineTo(w / 2, h + t.arrowPx);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      roundRectPath(ctx, 1, 1, w - 2, h - 2, h / 2);
      ctx.stroke();
    });
    const bg = this.scene.add.image(0, pad / 2, key);
    const box = this.scene.add.container(0, 0, [bg, text]).setAlpha(t.alpha);
    this.layers.texts.add(box);
    return { box };
  }

  /** false → ekran sarsıntısı kapalı (Ayarlar; hareket hassasiyeti). Gol zoom'u etkilenmez. */
  shakeEnabled = true;

  /** Kafa üstü etiketleri (P1/P2/CPU) göster/gizle (menü demo maçında gizli). */
  setTagsVisible(visible: boolean): void {
    for (const tag of this.tags) tag.box.setVisible(visible);
  }

  /** Oyuncuyu göster/gizle (rakipsiz antrenmanda P2 sahada yok). */
  setPlayerVisible(index: PlayerIndex, visible: boolean): void {
    this.rigs[index].setVisible(visible);
    this.tags[index].box.setVisible(visible);
  }

  setQuality(level: QualityLevel): void {
    this.quality = level;
    // Tam ekran vinyet düşük kalitede kapanır (bir tam ekran karışım geçişi daha az).
    this.vignette.setVisible(level > 0);
    this.particles.setQuality(level);
    this.stadium.setQuality(level);
    this.superFx.setQuality(level);
  }

  /**
   * Bir kare çizer.
   * @param realDt Gerçek kare süresi (sn) — arayüz, kalabalık, kamera.
   * @param worldDt Dünya süresi (ağır çekimde yavaşlar, hit-stop'ta durur) — karakterler,
   *                parçacıklar, ağ.
   */
  draw(frame: RenderFrame, realDt: number, worldDt: number, time: number): void {
    const sim = this.sim;
    const b = frame.ball;
    const ball = sim.ball;
    this.stadium.update(realDt, time);
    this.goals.update(worldDt);
    this.fxG.clear();
    this.drawBalloon(time);

    const ballPos = ball.phased ? null : { x: b.x, y: b.y };
    for (const p of sim.players) this.drawPlayer(p, frame, worldDt, time, ballPos);

    // Ağda hareket eden top ağı iter.
    const inNet = this.goals.goalAt(b.x, b.y);
    if (inNet !== -1 && !ball.phased) {
      this.goals.hit(inNet, b.x, b.y, ball.vx * NET.pushScale, ball.vy * NET.pushScale);
    }

    this.decoyBuf.length = 0;
    for (const d of sim.decoys) {
      this.decoyBuf.push({
        x: d.ball.x,
        y: d.ball.y,
        angle: d.ball.angle,
        radius: d.ball.radius,
        vx: d.ball.vx,
        vy: d.ball.vy,
      });
    }
    this.ball.update(
      worldDt,
      b.x,
      b.y,
      b.angle,
      ball.radius,
      ball.vx,
      ball.vy,
      !ball.phased,
      ball.superType === null,
    );
    this.ball.updateDecoys(this.decoyBuf);
    const targetX =
      ball.superOwner >= 0
        ? ball.superOwner === 0
          ? sim.pitch.goals[1].lineX
          : sim.pitch.goals[0].lineX
        : b.x;
    this.superFx.update(
      worldDt,
      time,
      ball.superType,
      ball.phased,
      b.x,
      b.y,
      ball.radius,
      ball.vx,
      ball.vy,
      targetX,
      this.decoyBuf,
    );

    this.particles.update(worldDt);
    this.flashes.update(worldDt);
    this.rings.update(worldDt);
    this.updateCrowdFlashes(realDt);
    this.updateFireworks(realDt);

    // Dünya dönüşümü: zoom (odak sabit) + sarsıntı (ekran ortası etrafında hafif dönüş).
    this.shake.update(realDt, this.shakeEnabled ? (this.quality === 0 ? LOW_SHAKE : 1) : 0);
    this.camera.update(realDt);
    const z = this.camera.zoom;
    const ox = this.camera.offsetX + this.shake.offsetX;
    const oy = this.camera.offsetY + this.shake.offsetY;
    const th = this.shake.angle;
    const cx = DISPLAY.width / 2;
    const cy = DISPLAY.height / 2;
    const cos = Math.cos(th);
    const sin = Math.sin(th);
    this.layers.world
      .setScale(z)
      .setRotation(th)
      .setPosition(cx + cos * (ox - cx) - sin * (oy - cy), cy + sin * (ox - cx) + cos * (oy - cy));
  }

  private drawPlayer(
    p: Player,
    frame: RenderFrame,
    dt: number,
    time: number,
    ballPos: { x: number; y: number } | null,
  ): void {
    const pose = frame.players[p.index];
    const rig = this.rigs[p.index];
    const kick =
      p.kickPhase === 'swing' || p.kickPhase === 'hold'
        ? (pose.footAngle - KICK.restAngle) / (KICK.maxAngle - KICK.restAngle)
        : 0;
    rig.face.update(dt, {
      frozen: p.frozen,
      straining: p.kickPhase === 'swing' || (p.jumping && p.vy < STRAIN_RISE),
      armed: p.superArmed,
    });
    rig.update(
      dt,
      {
        x: pose.x,
        y: pose.y,
        headRadius: p.headRadius,
        footAngle: pose.footAngle,
        facing: p.facing,
        vx: p.vx,
        vy: p.vy,
        grounded: p.grounded,
        maxSpeed: p.maxSpeed,
        kick,
        frozen: p.frozen,
        armed: p.superArmed,
      },
      ballPos,
      time,
    );
    const tag = this.tags[p.index];
    tag.box.setPosition(pose.x, pose.y - p.headRadius - CHARACTER_ART.tag.gapPx - HEAD_TAG_LIFT);

    // Koşu tozu: yerde hızlı koşarken adım başına bir bulutçuk.
    if (p.grounded && Math.abs(p.vx) > p.maxSpeed * RUN_DUST_SPEED && !p.frozen) {
      this.runDistance[p.index] += Math.abs(p.vx) * dt;
      if (this.runDistance[p.index] > ANIM.run.stridePx) {
        this.runDistance[p.index] = 0;
        this.particles.burst(
          'runDust',
          pose.x - Math.sign(p.vx) * RUN_DUST_BACK,
          this.sim.pitch.groundY - 2,
          {
            angle: Math.sign(p.vx) > 0 ? Math.PI + RUN_DUST_ANGLE : -RUN_DUST_ANGLE,
          },
        );
      }
    }
    // Sarsıntı (zıplayamama): ayak altında kıvılcımlı toz.
    if (p.jumpLockTimer > 0 && Math.random() < JUMP_LOCK_DUST) {
      this.particles.burst('runDust', pose.x, this.sim.pitch.groundY - 2, {
        color: FX.jumpLockColor,
      });
    }
    // Süper hazır: yükselen ışık zerreleri.
    if (p.superArmed && Math.random() < ARMED_SPARK * (this.quality + 1)) {
      this.particles.burst('superCharge', pose.x, pose.y, { color: rig.def.palette.accent });
    }
    // Şut savrulması: ayağın çizdiği yay boyunca sönen beyaz iz.
    if (kick > 0) this.drawSwoosh(pose.x, pose.y, p.facing, pose.footAngle);
  }

  private drawSwoosh(x: number, y: number, facing: 1 | -1, angle: number): void {
    const g = this.fxG;
    const hipY = y + PLAYER.foot.hipOffsetY;
    const L = SWOOSH_RADIUS;
    const from = KICK.restAngle;
    const steps = SWOOSH_STEPS;
    for (let i = 0; i < steps; i++) {
      const a0 = from + ((angle - from) * i) / steps;
      const a1 = from + ((angle - from) * (i + 1)) / steps;
      const k = (i + 1) / steps;
      g.lineStyle(SWOOSH_WIDTH * k, WHITE, SWOOSH_ALPHA * k);
      g.lineBetween(
        x + facing * Math.sin(a0) * L,
        hipY + Math.cos(a0) * L,
        x + facing * Math.sin(a1) * L,
        hipY + Math.cos(a1) * L,
      );
    }
  }

  /** Balon: tür renginde parlak balon, sallanan ip ve ikon; sönmeden önce yanıp söner. */
  private drawBalloon(time: number): void {
    const g = this.balloonG;
    const icon = this.balloonIcon;
    g.clear();
    const balloon = this.sim.balloon;
    const pos = this.sim.balloonPosition();
    if (!balloon || !pos) {
      this.balloonImg.setVisible(false);
      icon.setVisible(false);
      return;
    }
    const c = FX.balloon;
    const left = POWERUPS.balloon.lifetimeSeconds - balloon.age;
    const hidden = left < c.warnSeconds && Math.floor(time * c.blinkHz * 2) % 2 === 1;
    this.balloonImg.setVisible(!hidden);
    icon.setVisible(!hidden);
    if (hidden) return;
    const r = POWERUPS.balloon.radius;
    const color = FX.powerUpColors[balloon.type];
    const bob = Math.sin(time * BALLOON_WOBBLE_HZ * TWO_PI) * BALLOON_WOBBLE;
    this.balloonImg
      .setPosition(pos.x, pos.y)
      .setTint(color)
      .setScale(r / BALLOON_ART.radius)
      .setRotation(bob);
    // İp: hafif dalgalı.
    g.lineStyle(2, c.stringColor, STRING_ALPHA);
    g.beginPath();
    const top = pos.y + r * BALLOON_STRING_FROM;
    g.moveTo(pos.x, top);
    for (let i = 1; i <= STRING_SEGMENTS; i++) {
      const u = i / STRING_SEGMENTS;
      g.lineTo(
        pos.x + Math.sin(time * STRING_HZ + u * Math.PI * 2) * STRING_WAVE * u,
        top + c.stringPx * u,
      );
    }
    g.strokePath();
    icon
      .setTexture(iconKey(balloon.type))
      .setPosition(pos.x, pos.y)
      .setScale((r * c.iconScale) / ICON_RADIUS)
      .setRotation(bob);
  }

  // ───────────────────────────── Olaylar ─────────────────────────────

  onKick(player: PlayerIndex, speed: number, superShot: boolean): void {
    const b = this.sim.ball;
    const p = this.sim.players[player];
    const hard = speed >= JUICE.hitStop.hardHitSpeed;
    const u = Math.min(1, speed / BALL.maxSpeed);
    const j = JUICE.flash;
    this.flashes.spawn(b.x - p.facing * b.radius * FLASH_BACK, b.y, {
      life: j.durationMs / MS,
      scaleFrom: j.minScale,
      scaleTo: j.minScale + (j.maxScale - j.minScale) * u,
      rotation: Math.random() * Math.PI,
    });
    this.particles.burst('kickSpark', b.x, b.y, {
      angle: Math.atan2(b.vy, b.vx),
      speedScale: KICK_SPARK_BASE + u,
      countScale: hard ? HARD_COUNT : 1,
    });
    if (b.y + b.radius > this.sim.pitch.groundY - GRASS_HEIGHT) {
      this.particles.burst('grass', b.x, this.sim.pitch.groundY, {
        countScale: KICK_SPARK_BASE + u,
      });
    }
    if (hard || superShot) this.shake.add(JUICE.shake.hardHit * u);
  }

  onHeader(player: PlayerIndex, speed: number, time: number): void {
    if (time - this.lastHeaderTime[player] < HEADER_COOLDOWN) return;
    this.lastHeaderTime[player] = time;
    const b = this.sim.ball;
    const u = Math.min(1, speed / BALL.maxSpeed);
    this.particles.burst('headerStars', b.x, b.y, { speedScale: KICK_SPARK_BASE + u });
    this.flashes.spawn(b.x, b.y, {
      life: JUICE.flash.durationMs / MS,
      scaleFrom: JUICE.flash.minScale,
      scaleTo: JUICE.flash.minScale + u,
    });
    if (speed >= JUICE.hitStop.hardHitSpeed) this.shake.add(JUICE.shake.hardHit * u);
  }

  /** Topun saha çarpması: zeminde çim/toz, direkte kıvılcım + sarsıntı, ağda dalga. */
  onImpact(surface: string, speed: number, x: number, y: number): void {
    const b = this.sim.ball;
    const normal =
      surface === 'ground'
        ? -Math.PI / 2
        : surface === 'ceiling'
          ? Math.PI / 2
          : Math.atan2(b.y - y, b.x - x);
    this.ball.impact(speed, normal);
    const u = Math.min(1, speed / BALL.maxSpeed);
    if (surface === 'ground') {
      if (speed > GRASS_IMPACT) this.particles.burst('grass', x, y, { countScale: u + GRASS_MIN });
      if (b.superType === 'quake' || b.superType === 'giant') {
        this.particles.burst('rockDebris', x, y);
        this.particles.burst('quakeDust', x, y);
        this.shake.add(JUICE.shake.giantBounce);
      }
    } else if (surface === 'crossbar') {
      this.particles.burst('postSpark', x, y, { speedScale: KICK_SPARK_BASE + u });
      this.flashes.spawn(x, y, {
        life: JUICE.flash.durationMs / MS,
        scaleFrom: JUICE.flash.minScale,
        scaleTo: JUICE.flash.maxScale * u,
      });
      this.shake.add(JUICE.shake.post * u);
      const goal = x < DISPLAY.width / 2 ? 0 : 1;
      const net = this.sim.pitch.goals[goal].net;
      this.goals.hit(goal, x, net.minY + NET.spacingPx, 0, speed * NET.impulseScale);
    } else if (surface === 'wall') {
      const goal = this.goals.goalAt(x + (x < DISPLAY.width / 2 ? 1 : -1), y);
      if (goal !== -1)
        this.goals.hit(
          goal,
          x,
          y,
          (x < DISPLAY.width / 2 ? -1 : 1) * speed * NET.impulseScale,
          b.vy * NET.impulseScale,
        );
    }
  }

  onLand(player: PlayerIndex, speed: number): void {
    const p = this.sim.players[player];
    this.rigs[player].anim.onLand(speed);
    const u = Math.min(1, speed / ANIM.squash.landReferenceSpeed);
    this.particles.burst('landDust', p.x, this.sim.pitch.groundY - 2, {
      countScale: LAND_DUST_MIN + u,
    });
    if (u > HEAVY_LANDING) this.shake.add(JUICE.shake.heavyLanding * u);
  }

  onJump(player: PlayerIndex, air: boolean): void {
    const p = this.sim.players[player];
    this.rigs[player].anim.onJump();
    if (air) {
      this.rings.spawn(p.x, p.y + PLAYER_STAND_OFFSET, {
        life: AIR_RING_LIFE,
        scaleFrom: AIR_RING_FROM,
        scaleTo: AIR_RING_TO,
        tint: FX.powerUpColors.doubleJump,
      });
    } else {
      this.particles.burst('runDust', p.x, this.sim.pitch.groundY - 2, { countScale: JUMP_DUST });
    }
  }

  /** Top oyuncuya çarptı: sert çarpmada şaşkın yüz. */
  onTouch(player: PlayerIndex, speed: number): void {
    if (speed >= ANIM.expressions.shockedImpactSpeed) {
      this.rigs[player].face.trigger('shocked', ANIM.expressions.shockedSeconds);
    }
  }

  onGoal(scorer: PlayerIndex): void {
    const goalIndex = scorer === 0 ? 1 : 0;
    const goal = this.sim.pitch.goals[goalIndex];
    const b = this.sim.ball;
    this.goals.hit(
      goalIndex,
      b.x,
      b.y,
      b.vx * NET.impulseScale - goal.fieldDirection * NET.goalKick,
      b.vy * NET.impulseScale,
    );
    this.shake.add(JUICE.shake.goal);
    const z = JUICE.zoom;
    const mouthY = this.sim.pitch.groundY - goal.mouthHeight / 2;
    const fx = goal.lineX + (DISPLAY.width / 2 - goal.lineX) * z.focusTowardCenter;
    const fy = mouthY + (DISPLAY.height / 2 - mouthY) * z.focusTowardCenter;
    this.camera.punchIn(z.goal, fx, fy, z.holdSeconds);
    const scorerDef = this.characters[scorer];
    const colors = [scorerDef.palette.body, scorerDef.palette.accent, GOLD, WHITE];
    this.particles.burst(
      'confetti',
      goal.lineX + goal.fieldDirection * CONFETTI_IN,
      this.sim.pitch.groundY - goal.mouthHeight,
      {
        angle: -Math.PI / 2 + goal.fieldDirection * CONFETTI_TILT,
        colors,
      },
    );
    this.particles.burst('confettiRain', DISPLAY.width / 2, -CONFETTI_TOP, { colors });
    this.rigs[scorer].face.trigger('happy', ANIM.expressions.happySeconds);
    this.rigs[goalIndex === 0 ? 0 : 1].face.trigger('sad', ANIM.expressions.sadSeconds);
    this.stadium.cheer(scorer);
    this.flashSide = scorer;
    this.flashTimer = STADIUM.crowd.cheerSeconds * CROWD_FLASH_PART;
  }

  onKickoff(): void {
    this.ball.resetTrail();
    this.camera.release();
  }

  onSuperLaunch(player: PlayerIndex, type: SuperType): void {
    const b = this.sim.ball;
    this.superFx.launch(type, b.x, b.y, this.sim.players[player].facing);
    this.shake.add(JUICE.shake.superLaunch);
    this.rigs[player].face.trigger('happy', SUPER_SMILE);
  }

  onSuperHit(player: PlayerIndex, type: SuperType): void {
    const p = this.sim.players[player];
    const rig = this.rigs[player];
    rig.face.trigger('shocked', ANIM.expressions.shockedSeconds);
    if (type === 'ice') this.particles.burst('iceBurst', p.x, p.y);
    if (type === 'fire') this.particles.burst('fireBurst', p.x, p.y);
    if (type === 'quake') {
      this.shake.add(JUICE.shake.quake);
      this.particles.burst('quakeDust', p.x, this.sim.pitch.groundY);
      this.particles.burst('rockDebris', p.x, this.sim.pitch.groundY);
    }
  }

  onTeleportExit(x: number, y: number): void {
    this.rings.spawn(x, y, {
      life: SUPER_RING_LIFE,
      scaleFrom: AIR_RING_FROM,
      scaleTo: AIR_RING_TO,
      tint: FX.superColors.teleport,
    });
    this.particles.burst('teleportSwirl', x, y);
    this.ball.resetTrail();
  }

  onBalloonPop(player: PlayerIndex, type: PowerUpType): void {
    const pos = this.lastBalloon;
    const color = FX.powerUpColors[type];
    this.particles.burst('popBits', pos.x, pos.y, { color });
    this.particles.burst('popSparkle', pos.x, pos.y);
    this.rings.spawn(pos.x, pos.y, {
      life: SUPER_RING_LIFE,
      scaleFrom: AIR_RING_FROM,
      scaleTo: POP_RING,
      tint: color,
    });
    if (type === 'freezeOpponent') {
      const opp = this.sim.players[player === 0 ? 1 : 0];
      this.particles.burst('iceBurst', opp.x, opp.y);
    }
  }

  /** Balonun son konumunu hatırla (patlama olayında balon artık yoktur). */
  rememberBalloon(): void {
    const pos = this.sim.balloonPosition();
    if (pos) {
      this.lastBalloon.x = pos.x;
      this.lastBalloon.y = pos.y;
    }
  }
  private readonly lastBalloon = { x: DISPLAY.width / 2, y: DISPLAY.height / 2 };

  /** Balon kimse vurmadan söndü: küçük duman. */
  onBalloonExpire(): void {
    this.particles.burst('miragePoof', this.lastBalloon.x, this.lastBalloon.y, { color: WHITE });
  }

  /** Mıknatıs/Serap yanılsaması söndü: pembe duman (sahne yanılsama sayısını izler). */
  onDecoyVanish(x: number, y: number): void {
    this.particles.burst('miragePoof', x, y);
  }

  onMatchEnd(winner: PlayerIndex | null): void {
    if (winner === null) return;
    this.rigs[winner].face.setPersistent('happy');
    this.rigs[winner === 0 ? 1 : 0].face.setPersistent('sad');
    this.stadium.celebrate(winner, FIREWORKS_SECONDS);
    this.fireworksTimer = FIREWORKS_SECONDS;
    this.flashSide = winner;
    this.flashTimer = FIREWORKS_SECONDS;
  }

  /** Atak tehlikesi (kalabalık kıpırtısı). */
  setExcitement(level: number): void {
    this.stadium.setExcitement(level);
  }

  /**
   * Dünyada yükselip kaybolan yazı (süper adı, güçlendirici). Yazılar önbelleklenir ve yeniden
   * kullanılır (oyun anında yeni metin dokusu oluşturulmaz); `prewarmText` ile önceden kurulur.
   */
  floatText(x: number, y: number, text: string, color: number, style: FloatStyle): void {
    const label = this.textFor(text, color, style);
    this.scene.tweens.killTweensOf(label);
    label.setPosition(x, y).setAlpha(1).setScale(FLOAT_POP).setVisible(true);
    this.scene.tweens.add({
      targets: label,
      scale: 1,
      duration: FLOAT_POP_MS,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: label,
      y: y - style.risePx,
      alpha: 0,
      delay: FLOAT_POP_MS,
      duration: style.durationMs,
      ease: 'Quad.easeIn',
      onComplete: () => {
        label.setVisible(false);
      },
    });
  }

  /** Yazıyı önceden oluşturur (maç başında süper ve güçlendirici adları). */
  prewarmText(text: string, color: number, style: FloatStyle): void {
    this.textFor(text, color, style);
  }

  private textFor(text: string, color: number, style: FloatStyle): Phaser.GameObjects.Text {
    const key = [text, color, style.fontSizePx].join('|');
    let label = this.floatTexts.get(key);
    if (!label) {
      label = this.scene.add
        .text(0, 0, text, {
          fontFamily: HUD.fontFamily,
          fontSize: String(style.fontSizePx) + 'px',
          color: hex(color),
          stroke: COLORS.textStroke,
          strokeThickness: style.strokePx,
        })
        .setOrigin(0.5, 1)
        .setShadow(0, TEXT_SHADOW, '#000000', TEXT_SHADOW_BLUR, true, true)
        .setVisible(false);
      this.layers.texts.add(label);
      this.floatTexts.set(key, label);
    }
    return label;
  }
  private readonly floatTexts = new Map<string, Phaser.GameObjects.Text>();

  private updateCrowdFlashes(dt: number): void {
    if (this.flashTimer <= 0) return;
    this.flashTimer -= dt;
    if (Math.random() < CROWD_FLASH_RATE * dt * (this.quality + 1)) {
      const p = this.stadium.randomStandPoint(this.flashSide);
      this.particles.burst('cameraFlash', p.x, p.y);
    }
  }

  private updateFireworks(dt: number): void {
    if (this.fireworksTimer <= 0) return;
    this.fireworksTimer -= dt;
    this.fireworksNext -= dt;
    if (this.fireworksNext > 0) return;
    this.fireworksNext = FIREWORKS_GAP_MIN + Math.random() * FIREWORKS_GAP_VAR;
    const x = FIREWORKS_MARGIN + Math.random() * (DISPLAY.width - FIREWORKS_MARGIN * 2);
    const y = FIREWORKS_TOP + Math.random() * FIREWORKS_SPAN;
    const colors = [
      this.characters[0].palette.accent,
      this.characters[1].palette.accent,
      GOLD,
      WHITE,
    ];
    this.particles.burst('fireworks', x, y, {
      color: colors[Math.floor(Math.random() * colors.length)],
    });
    this.rings.spawn(x, y, {
      life: SUPER_RING_LIFE,
      scaleFrom: AIR_RING_FROM,
      scaleTo: FIREWORK_RING,
      alpha: FIREWORK_RING_ALPHA,
    });
  }

  /** Debug/ölçüm: canlı parçacık sayısı. */
  get liveParticles(): number {
    return this.particles.liveCount;
  }
}

const DECOYS = 2;
const FLASH_POOL = 8;
const RING_POOL = 10;
const VIGNETTE_DEPTH = 50;
const TAG_STROKE = 3;
const HEAD_TAG_LIFT = 10;
const STRAIN_RISE = -500;
const RUN_DUST_SPEED = 0.6;
const RUN_DUST_BACK = 14;
const RUN_DUST_ANGLE = 0.5;
const JUMP_LOCK_DUST = 0.25;
const ARMED_SPARK = 0.12;
const SWOOSH_RADIUS = 46;
const SWOOSH_STEPS = 6;
const SWOOSH_WIDTH = 9;
const SWOOSH_ALPHA = 0.55;
const BALLOON_WOBBLE_HZ = 0.8;
const BALLOON_WOBBLE = 0.08;
const BALLOON_STRING_FROM = 1.15;
const STRING_ALPHA = 0.85;
const STRING_SEGMENTS = 6;
const STRING_HZ = 3;
const STRING_WAVE = 5;
const ICON_COLOR = 0x1a1a2e;
const MS = 1000;
const FLASH_BACK = 0.4;
const KICK_SPARK_BASE = 0.6;
const HARD_COUNT = 1.6;
const GRASS_HEIGHT = 40;
const HEADER_COOLDOWN = 0.15;
const GRASS_IMPACT = 380;
const GRASS_MIN = 0.3;
const LAND_DUST_MIN = 0.4;
const HEAVY_LANDING = 0.7;
const AIR_RING_LIFE = 0.35;
const AIR_RING_FROM = 0.2;
const AIR_RING_TO = 1.1;
const JUMP_DUST = 2;
const CONFETTI_IN = 40;
const CONFETTI_TILT = 0.55;
const CONFETTI_TOP = 30;
const CROWD_FLASH_PART = 0.8;
const SUPER_SMILE = 0.6;
const SUPER_RING_LIFE = 0.4;
const POP_RING = 1.4;
const FIREWORKS_SECONDS = 6;
const FIREWORKS_GAP_MIN = 0.35;
const FIREWORKS_GAP_VAR = 0.5;
const FIREWORKS_MARGIN = 160;
const FIREWORKS_TOP = 70;
const FIREWORKS_SPAN = 150;
const FIREWORK_RING = 1.8;
const FIREWORK_RING_ALPHA = 0.6;
const TEXT_SHADOW = 3;
const TEXT_SHADOW_BLUR = 2;
const FLOAT_POP = 1.5;
const FLOAT_POP_MS = 160;
const CROWD_FLASH_RATE = 6;
const LOW_SHAKE = 0.6;
