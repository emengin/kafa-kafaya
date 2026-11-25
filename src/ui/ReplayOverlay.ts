import Phaser from 'phaser';
import { textStyle } from '../art/uiArt';
import { DISPLAY, HUD, REPLAY } from '../config/gameConfig';
import { t, upper } from '../i18n';
import { BOTTOM_RIGHT, TOP_LEFT } from '../platform/screenFrame';
import { PillButton } from './PillButton';
import { screenLayout } from './ScreenLayout';

/** Kırmızı "kayıt" noktası. */
const RED = 0xff3b3b;
const BLACK = 0x000000;

/**
 * Gol tekrarı kaplaması (Faz 7): üstte ve altta sinema şeritleri (skor tabelasının altında kalır),
 * sol üstte yanıp sönen kırmızı nokta + "TEKRAR", sağ altta "Atla ▶▶" butonu (dokunmatik/fare;
 * klavyede Enter/Space, gamepad'de A da atlar). Şeritler kısa bir kayma animasyonuyla girer.
 *
 * Yerleşim (Faz 2.2): şeritler ekranın (görünür alanın) üst ve alt kenarında, tam genişlikte;
 * rozet sol üste, "Atla" sağ alta sabitli (güvenli alanın içinde).
 */
export class ReplayOverlay {
  private readonly bars: [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle];
  private readonly dot: Phaser.GameObjects.Arc;
  private readonly label: Phaser.GameObjects.Text;
  private readonly skip: PillButton;
  private visible = false;
  /** Şeritlerin oturduğu y (görünür alanın üst ve alt kenarı). */
  private topY = 0;
  private bottomY: number = DISPLAY.height;

  constructor(
    private readonly scene: Phaser.Scene,
    onSkip: () => void,
  ) {
    const { width, height } = DISPLAY;
    const h = REPLAY.letterboxPx;
    const depth = HUD.depth - 1;
    this.bars = [
      scene.add
        .rectangle(0, 0, width, h, BLACK, REPLAY.letterboxAlpha)
        .setOrigin(0, 0)
        .setDepth(depth),
      scene.add
        .rectangle(0, height, width, h, BLACK, REPLAY.letterboxAlpha)
        .setOrigin(0, 1)
        .setDepth(depth),
    ];
    const b = REPLAY.badge;
    this.dot = scene.add.circle(b.x, b.y, b.dotRadius, RED).setDepth(HUD.depth + 1);
    this.label = scene.add
      .text(
        b.x + b.dotRadius * 2,
        b.y,
        upper(t('replay.badge')),
        textStyle(b.fontSizePx, '#ffffff'),
      )
      .setOrigin(0, 0.5)
      .setDepth(HUD.depth + 1);
    const s = REPLAY.skip;
    this.skip = new PillButton(
      scene,
      s.x,
      s.y,
      s.width,
      s.height,
      t('replay.skip'),
      s.fontSizePx,
      onSkip,
      HUD.depth + 1,
    ).anchorTo(BOTTOM_RIGHT);
    const layout = screenLayout(scene);
    layout.place(this.dot, TOP_LEFT);
    layout.place(this.label, TOP_LEFT);
    layout.onChange(({ view }) => {
      this.topY = view.y;
      this.bottomY = view.y + view.height;
      const [top, bottom] = this.bars;
      top.setPosition(view.x, this.topY).setSize(view.width, h);
      bottom.setPosition(view.x, this.bottomY).setSize(view.width, h);
    });
    this.setVisible(false);
  }

  get active(): boolean {
    return this.visible;
  }

  show(): void {
    this.setVisible(true);
    const h = REPLAY.letterboxPx;
    const [top, bottom] = this.bars;
    top.setY(this.topY - h);
    bottom.setY(this.bottomY + h);
    this.scene.tweens.add({
      targets: top,
      y: this.topY,
      duration: REPLAY.fadeMs,
      ease: 'Quad.easeOut',
    });
    this.scene.tweens.add({
      targets: bottom,
      y: this.bottomY,
      duration: REPLAY.fadeMs,
      ease: 'Quad.easeOut',
    });
  }

  hide(): void {
    this.setVisible(false);
  }

  /** Her kare: kayıt noktası yanıp söner. */
  update(time: number): void {
    if (!this.visible) return;
    this.dot.setVisible(Math.floor(time * REPLAY.badge.blinkHz * 2) % 2 === 0);
  }

  private setVisible(visible: boolean): void {
    this.visible = visible;
    for (const bar of this.bars) bar.setVisible(visible);
    this.dot.setVisible(visible);
    this.label.setVisible(visible);
    this.skip.setVisible(visible);
  }
}
