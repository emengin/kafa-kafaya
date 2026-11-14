import Phaser from 'phaser';
import { COLORS, DISPLAY, HUD, OVERLAY } from '../config/gameConfig';
import { t } from '../i18n';
import type { KeyTracker } from '../input/KeyboardInput';
import { TextMenu, type TextMenuItem } from './TextMenu';

export interface MenuOverlayOptions {
  readonly title: string;
  readonly titleColor?: string;
  /** Başlığın altındaki bilgi satırları (skor, "Altın golle" …). */
  readonly lines?: readonly string[];
  readonly items: readonly TextMenuItem[];
}

/**
 * Ekranı karartan perde + ortada panel: başlık, bilgi satırları, dikey menü, tuş ipucu.
 * Duraklatma menüsü ve maç sonu ekranı bunu kullanır. Panel yüksekliği içeriğe göre hesaplanır.
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
      scene.add
        .rectangle(0, 0, width, height, OVERLAY.dimColor, OVERLAY.dimAlpha)
        .setOrigin(0)
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

    const g = scene.add.graphics().setDepth(depth);
    g.fillStyle(panel.color, panel.alpha);
    g.fillRoundedRect(cx - panel.width / 2, top, panel.width, panelHeight, panel.radius);
    g.lineStyle(panel.strokePx, panel.strokeColor, 1);
    g.strokeRoundedRect(cx - panel.width / 2, top, panel.width, panelHeight, panel.radius);
    this.objects.push(g);

    let y = top + panel.paddingPx + title.lineHeightPx / 2;
    const titleText = scene.add
      .text(cx, y, options.title, {
        fontFamily: HUD.fontFamily,
        fontSize: `${title.fontSizePx}px`,
        color: options.titleColor ?? COLORS.textAccent,
        stroke: COLORS.textStroke,
        strokeThickness: title.strokePx,
      })
      .setOrigin(0.5)
      .setDepth(depth);
    // Uzun başlıklar (ör. İngilizce/uzun oyuncu adı) panele sığacak kadar küçültülür.
    const maxTitleWidth = panel.width - panel.paddingPx * 2;
    if (titleText.width > maxTitleWidth) titleText.setScale(maxTitleWidth / titleText.width);
    this.objects.push(titleText);
    y += title.lineHeightPx / 2;

    for (const text of lines) {
      y += line.lineHeightPx / 2;
      this.objects.push(
        scene.add
          .text(cx, y, text, {
            fontFamily: HUD.fontFamily,
            fontSize: `${line.fontSizePx}px`,
            color: line.color,
          })
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
    });
    y += this.menu.span + items.spacingPx / 2 + hint.lineHeightPx / 2;

    this.objects.push(
      scene.add
        .text(cx, y, t('overlay.navHint'), {
          fontFamily: HUD.fontFamily,
          fontSize: `${hint.fontSizePx}px`,
          color: COLORS.textPrimary,
        })
        .setOrigin(0.5)
        .setAlpha(hint.alpha)
        .setDepth(depth),
    );
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
