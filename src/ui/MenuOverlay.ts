import type Phaser from 'phaser';
import { addPanel, goldFill, textStyle } from '../art/uiArt';
import { DISPLAY, HUD, OVERLAY } from '../config/gameConfig';
import { t } from '../i18n';
import { screenLayout } from './ScreenLayout';
import type { KeyTracker } from '../input/KeyboardInput';
import { TextMenu, type TextMenuItem } from './TextMenu';

export interface MenuOverlayOptions {
  readonly title: string;
  /** Verilirse başlık bu renkte (yoksa altın gradyan). */
  readonly titleColor?: string;
  /** Başlığın altındaki bilgi satırları (skor, "Altın golle" …). */
  readonly lines?: readonly string[];
  readonly items: readonly TextMenuItem[];
}

/**
 * Ekranı karartan perde + ortada gölgeli, altın kenarlı panel: başlık (altın gradyan), bilgi
 * satırları, buton menüsü, tuş ipucu. Duraklatma menüsü, ses ayarları ve maç sonu ekranı bunu
 * kullanır. Panel içeriğe göre boyutlanır ve kısa bir "pop" ile açılır.
 */
export class MenuOverlay {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly menu: TextMenu;

  constructor(scene: Phaser.Scene, options: MenuOverlayOptions) {
    const { width, height } = DISPLAY;
    const { panel, title, line, items, hint, gapPx, depth } = OVERLAY;
    const lines = options.lines ?? [];
    const cx = width / 2;

    // Perde: tüm ekranı kaplar ve alttaki tıklamaları yutar.
    this.objects.push(
      screenLayout(scene)
        .cover(scene.add.rectangle(0, 0, width, height, OVERLAY.dimColor, OVERLAY.dimAlpha))
        .setDepth(depth)
        .setInteractive(),
    );

    const contentHeight =
      title.lineHeightPx +
      lines.length * line.lineHeightPx +
      gapPx +
      (options.items.length - 1) * items.spacingPx +
      items.spacingPx +
      hint.lineHeightPx;
    const panelHeight = contentHeight + panel.paddingPx * 2;
    const top = (height - panelHeight) / 2;

    const bg = addPanel(
      scene,
      cx,
      top + panelHeight / 2,
      panel.width,
      panelHeight,
      'overlay',
      panel.radius,
    ).setDepth(depth);
    this.objects.push(bg);

    let y = top + panel.paddingPx + title.lineHeightPx / 2;
    const titleText = scene.add
      .text(
        cx,
        y,
        options.title,
        textStyle(title.fontSizePx, options.titleColor ?? '#ffffff', title.strokePx),
      )
      .setOrigin(0.5)
      .setDepth(depth);
    if (!options.titleColor) goldFill(titleText);
    // Uzun başlıklar (ör. İngilizce/uzun oyuncu adı) panele sığacak kadar küçültülür.
    const maxTitleWidth = panel.width - panel.paddingPx * 2;
    if (titleText.width > maxTitleWidth) titleText.setScale(maxTitleWidth / titleText.width);
    this.objects.push(titleText);
    y += title.lineHeightPx / 2;

    for (const text of lines) {
      y += line.lineHeightPx / 2;
      this.objects.push(
        scene.add
          .text(cx, y, text, textStyle(line.fontSizePx, line.color))
          .setOrigin(0.5)
          .setDepth(depth),
      );
      y += line.lineHeightPx / 2;
    }

    y += gapPx + items.spacingPx / 2;
    this.menu = new TextMenu(scene, cx, y, options.items, {
      fontFamily: HUD.fontFamily,
      fontSizePx: items.fontSizePx,
      spacingPx: items.spacingPx,
      strokePx: items.strokePx,
      color: items.color,
      selectedColor: items.selectedColor,
      selectedScale: items.selectedScale,
      depth,
      buttonWidth: panel.width - panel.paddingPx * 2,
    });
    y += this.menu.span + items.spacingPx / 2 + hint.lineHeightPx / 2;

    this.objects.push(
      scene.add
        .text(cx, y, t('overlay.navHint'), textStyle(hint.fontSizePx, '#ffffff', 2))
        .setOrigin(0.5)
        .setAlpha(hint.alpha)
        .setDepth(depth),
    );

    // Açılış: panel hafifçe büyüyerek gelir.
    bg.setScale(OPEN_SCALE);
    scene.tweens.add({ targets: bg, scale: 1, duration: OPEN_MS, ease: 'Back.easeOut' });
  }

  update(tracker: KeyTracker): void {
    this.menu.update(tracker);
  }

  destroy(): void {
    this.menu.destroy();
    for (const obj of this.objects) obj.destroy();
    this.objects.length = 0;
  }
}

const OPEN_SCALE = 0.92;
const OPEN_MS = 180;
