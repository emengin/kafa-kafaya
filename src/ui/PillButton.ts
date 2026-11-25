import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { panelTexture, textStyle } from '../art/uiArt';
import { UI_THEME } from '../config/gameConfig';
import type { Anchor } from '../platform/screenFrame';
import { screenLayout } from './ScreenLayout';

/**
 * Tek başına duran yuvarlak buton (Geri, sayfa okları…): fare/dokunmatikle tıklanır; üzerine
 * gelince altın renge döner. Klavye/gamepad karşılığı sahnede ayrıca okunur (Esc/B, ←/→).
 */
export class PillButton {
  private readonly bg: Phaser.GameObjects.Image;
  private readonly text: Phaser.GameObjects.Text;
  private readonly normalKey: string;
  private readonly activeKey: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    fontSizePx: number,
    onClick: () => void,
    depth: number,
  ) {
    this.normalKey = panelTexture(scene, w, h, 'button', h / 2);
    this.activeKey = panelTexture(scene, w, h, 'active', h / 2);
    this.bg = scene.add.image(x, y, this.normalKey).setDepth(depth);
    this.text = scene.add
      .text(x, y, label, textStyle(fontSizePx, '#ffffff', STROKE))
      .setOrigin(0.5)
      .setDepth(depth);
    const pad = (this.bg.width - w) / 2;
    const padY = (this.bg.height - h) / 2;
    this.bg
      .setInteractive({
        useHandCursor: true,
        hitArea: new Phaser.Geom.Rectangle(pad, padY, w, h),
        hitAreaCallback: (rect: Phaser.Geom.Rectangle, px: number, py: number) =>
          rect.contains(px, py),
      })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
        this.setActive(true);
      })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
        this.setActive(false);
      })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        sfx.unlock();
        sfx.menuSelect();
        this.setActive(false);
        onClick();
      });
  }

  /** Butonu ekranın bir kenarına sabitler (Faz 2.2; konumu tasarım çerçevesinde verilmiş sayılır). */
  anchorTo(anchor: Anchor): this {
    const layout = screenLayout(this.bg.scene);
    layout.place(this.bg, anchor);
    layout.place(this.text, anchor);
    return this;
  }

  setVisible(visible: boolean): this {
    this.bg.setVisible(visible);
    this.text.setVisible(visible);
    if (visible) this.bg.setInteractive();
    else this.bg.disableInteractive();
    return this;
  }

  setLabel(label: string): this {
    this.text.setText(label);
    return this;
  }

  destroy(): void {
    this.bg.destroy();
    this.text.destroy();
  }

  private setActive(active: boolean): void {
    this.bg.setTexture(active ? this.activeKey : this.normalKey);
    this.text.setColor(active ? UI_THEME.text.activeColor : '#ffffff');
  }
}

const STROKE = 4;
