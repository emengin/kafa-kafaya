import Phaser from 'phaser';
import { charKey, extraOrigin, headTextureSize } from '../art/characterArt';
import { drawFace } from '../art/faceDraw';
import { LOOKS, type CharacterLook } from '../art/looks';
import { FX_KEYS } from '../art/fxArt';
import { ANIM, CHARACTER_ART, KICK, PLAYER } from '../config/gameConfig';
import { BodyAnimator } from '../fx/BodyAnimator';
import { FaceController } from '../fx/FaceController';
import type { CharacterDef } from '../game/characters';
import { PLAYER_STAND_OFFSET } from '../game/entities/Player';
import { shade } from '../art/canvas';

type Image = Phaser.GameObjects.Image;

/** Rig'in bir karedeki pozu (simülasyondan ya da menü/seçim ekranından). */
export interface RigPose {
  /** Kafa merkezi (dünya). */
  x: number;
  y: number;
  headRadius: number;
  footAngle: number;
  facing: 1 | -1;
  vx: number;
  vy: number;
  grounded: boolean;
  maxSpeed: number;
  /** Şut savrulmasının ilerleyişi (0–1). */
  kick: number;
  frozen: boolean;
  armed: boolean;
}

export interface RigOptions {
  /** Paylaşılan yüz denetleyicisi (HUD portresi oyuncunun yüzünü taklit eder). */
  readonly face?: FaceController;
  /** Yalnızca kafa (HUD portresi): kök kafa merkezindedir. */
  readonly headOnly?: boolean;
  /** Gölge bu katmana eklenir (yoksa gölge yok). */
  readonly shadowLayer?: Phaser.GameObjects.Container;
  /** Zemin y'si (gölge için). */
  readonly groundY?: number;
}

const UNITS = 100;
const TWO_PI = Math.PI * 2;

/**
 * Bir karakterin çizim düzeneği (Phaser Container): ayak tabanı merkezli kök, içinde arka
 * saç, bacak, forma, kafa, her karede çizilen yüz, ön saç/aksesuar, ayakkabı, sallanan ek, süper
 * parlaması ve buz bloğu. Kök ölçeği squash & stretch'i ve (eksi x ölçeğiyle) bakış yönünü
 * taşır; tüm parçalar sağa bakacak biçimde yerleştirilir.
 */
export class CharacterRig {
  readonly root: Phaser.GameObjects.Container;
  readonly face: FaceController;
  readonly anim = new BodyAnimator();
  readonly look: CharacterLook;
  /** Ekran ölçeği (seçim ekranı, menü); maçta 1. */
  scale = 1;
  private readonly head: Image;
  private readonly back: Image;
  private readonly front: Image;
  private readonly faceG: Phaser.GameObjects.Graphics;
  private readonly bodyImg: Image | null;
  private readonly shoe: Image | null;
  private readonly limbs: Phaser.GameObjects.Graphics | null;
  private readonly extra: Image | null;
  private readonly glow: Image | null;
  private readonly ice: Image | null;
  private readonly shadow: Image | null;
  private readonly headLocalY: number;
  private readonly groundY: number;

  constructor(
    scene: Phaser.Scene,
    readonly def: CharacterDef,
    options: RigOptions = {},
  ) {
    this.look = LOOKS[def.id];
    this.face = options.face ?? new FaceController();
    const headOnly = options.headOnly === true;
    this.headLocalY = headOnly ? 0 : -PLAYER_STAND_OFFSET;
    this.groundY = options.groundY ?? 0;
    const add = scene.add;
    const parts: Phaser.GameObjects.GameObject[] = [];

    this.glow = headOnly
      ? null
      : add
          .image(0, this.headLocalY, FX_KEYS.glow)
          .setTint(def.palette.accent)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setVisible(false);
    if (this.glow) parts.push(this.glow);

    const ex = this.look.extra;
    this.extra = ex && !headOnly ? add.image(0, 0, charKey.extra(def.id)) : null;
    if (this.extra && ex) {
      const o = extraOrigin(ex.kind);
      this.extra.setOrigin(o.x, o.y);
      parts.push(this.extra);
    }
    this.back = add.image(0, this.headLocalY, charKey.back(def.id));
    parts.push(this.back);

    this.limbs = headOnly ? null : add.graphics();
    if (this.limbs) parts.push(this.limbs);
    this.bodyImg = headOnly
      ? null
      : add
          .image(0, this.headLocalY + PLAYER.body.offsetY, charKey.body(def.id))
          .setScale(1 / CHARACTER_ART.bakeScale);
    if (this.bodyImg) parts.push(this.bodyImg);

    this.head = add.image(0, this.headLocalY, charKey.head(def.id));
    this.faceG = add.graphics();
    this.front = add.image(0, this.headLocalY, charKey.front(def.id));
    parts.push(this.head, this.faceG, this.front);

    this.shoe = headOnly
      ? null
      : add.image(0, 0, charKey.shoe(def.id)).setScale(1 / CHARACTER_ART.bakeScale);
    if (this.shoe) parts.push(this.shoe);
    this.ice = headOnly
      ? null
      : add
          .image(0, this.headLocalY / 2, FX_KEYS.ice)
          .setAlpha(CHARACTER_ART.iceAlpha)
          .setVisible(false);
    if (this.ice) parts.push(this.ice);

    this.root = add.container(0, 0, parts);
    this.shadow =
      options.shadowLayer && !headOnly
        ? add.image(0, this.groundY, FX_KEYS.shadow).setAlpha(CHARACTER_ART.shadowAlpha)
        : null;
    if (this.shadow && options.shadowLayer) options.shadowLayer.add(this.shadow);
  }

  /** Kök ve gölgeyi gizler/gösterir. */
  setVisible(visible: boolean): this {
    this.root.setVisible(visible);
    this.shadow?.setVisible(visible);
    return this;
  }

  destroy(): void {
    this.root.destroy();
    this.shadow?.destroy();
  }

  /**
   * Bir kare: gövde animasyonu ve yüz güncellenir, parçalar yerleştirilir, yüz çizilir.
   * @param look Gözlerin bakacağı nokta (dünya) ya da null (öne bakar).
   * @param time Saniye (sallanma, nabız, titreme).
   */
  update(dt: number, pose: RigPose, lookAt: { x: number; y: number } | null, time: number): void {
    const face = this.face;
    if (lookAt) {
      const dx = (lookAt.x - pose.x) * pose.facing;
      const dy = lookAt.y - pose.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) face.lookAt(dx / d, dy / d);
    } else {
      face.lookAt(0, 0);
    }
    this.anim.update(dt, {
      grounded: pose.grounded,
      vx: pose.vx,
      vy: pose.vy,
      maxSpeed: pose.maxSpeed,
      facing: pose.facing,
      kick: pose.kick,
      frozen: pose.frozen,
    });
    this.layout(pose, time);
  }

  /** Yalnızca yüzü günceller ve çizer (HUD portresi: denetleyici başka yerde ilerletilir). */
  drawPortrait(x: number, y: number, radius: number, facing: 1 | -1, time: number): void {
    this.root.setPosition(x, y).setScale(facing, 1);
    this.placeHead(radius);
    this.drawFaceNow(radius, time);
  }

  private layout(pose: RigPose, time: number): void {
    const a = this.anim;
    const r = pose.headRadius;
    const ex = ANIM.expressions;
    const k = this.scale;
    let rootX = pose.x;
    let rootY = pose.y + (PLAYER_STAND_OFFSET + a.bobY) * k;
    if (this.face.expression === 'frozen')
      rootX += Math.sin(time * ex.shiverHz * TWO_PI) * ex.shiverPx;
    if (this.face.expression === 'happy') {
      rootY -= Math.abs(Math.sin(time * ex.cheerHz * Math.PI)) * ex.cheerBobPx;
    }
    this.root.setPosition(rootX, rootY);
    this.root.setScale(pose.facing * a.scaleX * k, a.scaleY * k);
    this.root.setRotation(a.lean);

    this.placeHead(r);
    this.placeLegAndShoe(pose);
    this.placeExtras(pose, r, time);
    this.drawFaceNow(r, time);

    if (this.shadow) {
      const feet = pose.y + PLAYER_STAND_OFFSET * k;
      const height = Math.max(0, this.groundY - feet);
      const fade = Math.max(0, 1 - height / CHARACTER_ART.shadowFadeHeight);
      const tex = this.shadow.width;
      this.shadow
        .setPosition(pose.x, this.groundY)
        .setScale(
          (r * k * CHARACTER_ART.shadowWidth * (0.5 + 0.5 * fade)) / tex,
          (r * k * CHARACTER_ART.shadowHeight * (0.5 + 0.5 * fade) * 2) / tex,
        )
        .setAlpha(CHARACTER_ART.shadowAlpha * fade);
    }
  }

  private placeHead(r: number): void {
    const k = r / CHARACTER_ART.headBakeRadius;
    this.head.setScale(k);
    this.back.setScale(k);
    this.front.setScale(k);
  }

  private drawFaceNow(r: number, time: number): void {
    const g = this.faceG;
    g.clear();
    const f = this.face;
    drawFace(
      g,
      this.look,
      { expression: f.expression, blink: f.blink, lookX: f.lookX, lookY: f.lookY, time },
      0,
      this.headLocalY,
      r,
    );
  }

  private placeLegAndShoe(pose: RigPose): void {
    const g = this.limbs;
    const shoe = this.shoe;
    if (!g || !shoe) return;
    const L = PLAYER.foot.legLength;
    const hipY = this.headLocalY + PLAYER.foot.hipOffsetY;
    const fx = Math.sin(pose.footAngle) * L;
    const fy = hipY + Math.cos(pose.footAngle) * L;
    const o = CHARACTER_ART.outlinePx / CHARACTER_ART.bakeScale;
    g.clear();
    g.lineStyle(LEG_WIDTH + o * 2, CHARACTER_ART.outline, 1);
    g.lineBetween(0, hipY, fx, fy);
    g.lineStyle(LEG_WIDTH, this.look.skin, 1);
    g.lineBetween(0, hipY, fx * SOCK_FROM, hipY + (fy - hipY) * SOCK_FROM);
    g.lineStyle(LEG_WIDTH, shade(this.def.palette.accent, SOCK_LIGHT), 1);
    g.lineBetween(fx * SOCK_FROM, hipY + (fy - hipY) * SOCK_FROM, fx, fy);
    shoe.setPosition(fx, fy);
    shoe.setRotation(-(pose.footAngle - KICK.restAngle) * ANIM.shoeRotation);

    if (this.ice) {
      this.ice.setVisible(pose.frozen);
      if (pose.frozen) {
        const h = PLAYER_STAND_OFFSET + pose.headRadius * ICE_PAD;
        this.ice
          .setDisplaySize(pose.headRadius * 2 * ICE_PAD, h)
          .setY(this.headLocalY + (PLAYER_STAND_OFFSET - pose.headRadius * (ICE_PAD - 1)) / 2);
      }
    }
  }

  private placeExtras(pose: RigPose, r: number, time: number): void {
    const k = r / CHARACTER_ART.headBakeRadius;
    const ex = this.look.extra;
    if (this.extra && ex) {
      const sway =
        Math.sin(time * CHARACTER_ART.extraSwayHz * TWO_PI) * CHARACTER_ART.extraSwayRad +
        pose.vx * pose.facing * CHARACTER_ART.extraSpeedTilt -
        pose.vy * CHARACTER_ART.extraSpeedTilt;
      this.extra
        .setPosition((ex.x * r) / UNITS, this.headLocalY + (ex.y * r) / UNITS)
        .setScale(k)
        .setRotation(sway);
    }
    if (this.glow) {
      this.glow.setVisible(pose.armed);
      if (pose.armed) {
        const pulse = 0.5 + 0.5 * Math.sin(time * CHARACTER_ART.glowPulseHz * TWO_PI);
        const c = CHARACTER_ART;
        this.glow
          .setScale((r * c.glowScale) / this.glow.width)
          .setAlpha(c.glowAlphaMin + (c.glowAlphaMax - c.glowAlphaMin) * pulse);
      }
    }
  }
}

/** Bacak kalınlığı (px), çorabın başladığı oran, çorap tonu, buz bloğu payı (kafaya oran). */
const LEG_WIDTH = 7;
const SOCK_FROM = 0.55;
const SOCK_LIGHT = 0.35;
const ICE_PAD = 1.35;

/** Kafa dokusunun boyutu (HUD gibi yerlerde ölçek hesabı için). */
export function headTextureScale(radius: number): number {
  return (radius * 2) / headTextureSize();
}
