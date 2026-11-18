import Phaser from 'phaser';
import { css, makeCanvasTexture } from '../art/canvas';
import { textStyle } from '../art/uiArt';
import { TOUCH } from '../config/gameConfig';
import { t } from '../i18n';
import {
  pressedButtons,
  touchButtons,
  type TouchButton,
  type TouchButtonId,
} from '../input/touchLayout';
import { releaseVirtual, setVirtual } from '../input/virtualKeys';

type Ctx = CanvasRenderingContext2D;

interface ButtonView {
  readonly def: TouchButton;
  readonly img: Phaser.GameObjects.Image;
  readonly label: Phaser.GameObjects.Text;
}

/** Butonun ikon çizimi (kanvas, merkez 0,0; yarıçap r). Yazılı butonlarda null. */
const ICONS: Partial<Record<TouchButtonId, (ctx: Ctx, r: number) => void>> = {
  left: (ctx, r) => {
    triangle(ctx, r, -1);
  },
  right: (ctx, r) => {
    triangle(ctx, r, 1);
  },
  pause: (ctx, r) => {
    const w = r * PAUSE_BAR_W;
    const h = r * PAUSE_BAR_H;
    ctx.fillRect(-w * PAUSE_GAP, -h / 2, w, h);
    ctx.fillRect(w * (PAUSE_GAP - 1), -h / 2, w, h);
  },
  reset: (ctx, r) => {
    const R = r * RESET_R;
    ctx.lineWidth = r * RESET_LINE;
    ctx.beginPath();
    ctx.arc(0, 0, R, RESET_FROM, RESET_TO);
    ctx.stroke();
    const ax = Math.cos(RESET_TO) * R;
    const ay = Math.sin(RESET_TO) * R;
    const s = r * RESET_HEAD;
    ctx.beginPath();
    ctx.moveTo(ax + s, ay);
    ctx.lineTo(ax - s, ay - s * RESET_HEAD_SKEW);
    ctx.lineTo(ax - s * RESET_HEAD_SKEW, ay + s);
    ctx.closePath();
    ctx.fill();
  },
  fill: (ctx, r) => {
    ctx.beginPath();
    BOLT.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x * r, y * r);
      else ctx.lineTo(x * r, y * r);
    });
    ctx.closePath();
    ctx.fill();
  },
};

function triangle(ctx: Ctx, r: number, dir: 1 | -1): void {
  const s = r * ARROW_SIZE;
  ctx.beginPath();
  ctx.moveTo(dir * s, 0);
  ctx.lineTo(-dir * s * ARROW_BACK, -s);
  ctx.lineTo(-dir * s * ARROW_BACK, s);
  ctx.closePath();
  ctx.fill();
}

const LABELS: Partial<Record<TouchButtonId, 'touch.jump' | 'touch.kick' | 'touch.super'>> = {
  jump: 'touch.jump',
  kick: 'touch.kick',
  super: 'touch.super',
};

/**
 * Dokunmatik kontroller (Faz 6): yarı saydam daire butonlar (sol: ← →; sağ: Zıpla, Şut, Süper;
 * üst sol: duraklat, antrenmanda topu sıfırla ve barı doldur). Girdi Phaser işaretçilerinden
 * değil, tuvalin ham dokunma olaylarından okunur: her olayda tüm etkin parmaklar yeniden
 * değerlendirilir (çoklu dokunuş, parmak kaydırma, kaybolan `touchend`'e dayanıklı). Basılı
 * butonlar sanal tuş olarak yollanır; oyuncu girdisi klavyeyle aynı yoldan okunur.
 */
export class TouchControls {
  private readonly views: ButtonView[];
  private readonly pressed = new Set<TouchButtonId>();
  private enabled = true;
  private superReady = false;
  private readonly canvas: HTMLCanvasElement;

  constructor(
    private readonly scene: Phaser.Scene,
    training: boolean,
  ) {
    this.canvas = scene.game.canvas;
    this.views = touchButtons(training).map((def) => this.createButton(def));
    for (const type of TOUCH_EVENTS)
      this.canvas.addEventListener(type, this.onTouch, { passive: false });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroy();
    });
    this.refresh();
  }

  /** Duraklatma/maç sonu kaplaması açıkken butonlar gizlenir ve bırakılır. */
  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) this.releaseAll();
    this.refresh();
  }

  /** Süper barı dolu: Süper butonu altın renkte nabız atar. */
  setSuperReady(ready: boolean, time: number): void {
    this.superReady = ready;
    const v = this.views.find((x) => x.def.id === 'super');
    if (!v || !this.enabled) return;
    const pulse = ready ? 1 + SUPER_PULSE * Math.sin(time * SUPER_PULSE_HZ * Math.PI * 2) : 1;
    v.img.setScale((this.pressed.has('super') ? PRESS_SCALE : 1) * pulse);
    if (!this.pressed.has('super')) v.img.setTint(ready ? TOUCH.pressedColor : TOUCH.fillColor);
  }

  destroy(): void {
    for (const type of TOUCH_EVENTS) this.canvas.removeEventListener(type, this.onTouch);
    this.releaseAll();
  }

  private releaseAll(): void {
    for (const v of this.views) releaseVirtual(v.def.code);
    this.pressed.clear();
  }

  private readonly onTouch = (event: Event): void => {
    const e = event as TouchEvent;
    if (!this.enabled) return;
    if (e.cancelable) e.preventDefault();
    const scale = this.scene.scale;
    const points: { x: number; y: number }[] = [];
    for (const touch of Array.from(e.touches)) {
      points.push({ x: scale.transformX(touch.pageX), y: scale.transformY(touch.pageY) });
    }
    const now = pressedButtons(
      points,
      this.views.map((v) => v.def),
    );
    let changed = false;
    for (const v of this.views) {
      const down = now.has(v.def.id);
      if (down === this.pressed.has(v.def.id)) continue;
      changed = true;
      if (down) this.pressed.add(v.def.id);
      else this.pressed.delete(v.def.id);
      setVirtual(v.def.code, down);
    }
    if (changed) this.refresh();
  };

  private refresh(): void {
    for (const v of this.views) {
      const down = this.pressed.has(v.def.id);
      v.img
        .setVisible(this.enabled)
        .setAlpha(down ? TOUCH.pressedAlpha : TOUCH.alpha)
        .setScale(down ? PRESS_SCALE : 1)
        .setTint(
          down || (v.def.id === 'super' && this.superReady) ? TOUCH.pressedColor : TOUCH.fillColor,
        );
      v.label.setVisible(this.enabled);
      v.label.setAlpha(down ? 1 : LABEL_ALPHA);
    }
  }

  private createButton(def: TouchButton): ButtonView {
    const key = `touch-${def.id}-${def.r}`;
    const size = Math.ceil((def.r + TOUCH.strokePx) * 2 + 2);
    makeCanvasTexture(this.scene, key, size, size, (ctx, w) => {
      const c = w / 2;
      ctx.translate(c, c);
      const g = ctx.createRadialGradient(0, -def.r * GLOSS_Y, def.r * GLOSS_R, 0, 0, def.r);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(1, 'rgba(255,255,255,0.55)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, def.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = TOUCH.strokePx;
      ctx.strokeStyle = css(TOUCH.strokeColor, STROKE_ALPHA);
      ctx.stroke();
      const icon = ICONS[def.id];
      if (icon) {
        ctx.fillStyle = css(TOUCH.strokeColor);
        ctx.strokeStyle = css(TOUCH.strokeColor);
        icon(ctx, def.r);
      }
    });
    const img = this.scene.add.image(def.x, def.y, key).setDepth(TOUCH.depth);
    const labelKey = LABELS[def.id];
    const label = this.scene.add
      .text(
        def.x,
        def.y,
        labelKey ? t(labelKey) : '',
        textStyle(TOUCH.labelFontSizePx, '#ffffff', LABEL_STROKE),
      )
      .setOrigin(0.5)
      .setDepth(TOUCH.depth + 1);
    return { def, img, label };
  }
}

const TOUCH_EVENTS = ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const;
const PRESS_SCALE = 0.93;
const LABEL_ALPHA = 0.85;
const STROKE_ALPHA = 0.8;
const GLOSS_Y = 0.35;
const GLOSS_R = 0.1;
const SUPER_PULSE = 0.06;
const SUPER_PULSE_HZ = 2.2;
const ARROW_SIZE = 0.42;
const ARROW_BACK = 0.75;
const PAUSE_BAR_W = 0.22;
const PAUSE_BAR_H = 0.8;
const PAUSE_GAP = 1.4;
const RESET_R = 0.48;
const RESET_LINE = 0.14;
const RESET_FROM = -2.6;
const RESET_TO = 2.2;
const RESET_HEAD = 0.26;
const RESET_HEAD_SKEW = 0.2;
const BOLT = TOUCH.boltIcon;
const LABEL_STROKE = 3;
