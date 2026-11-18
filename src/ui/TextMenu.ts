import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { panelTexture, textStyle } from '../art/uiArt';
import { CONTROLS, UI_THEME } from '../config/gameConfig';
import type { KeyTracker } from '../input/KeyboardInput';
import { MenuNav } from './menuNav';

export interface TextMenuItem {
  /** Sabit yazı ya da her yenilemede okunan yazı (ör. "Müzik ◄ 60% ►"). */
  readonly label: string | (() => string);
  readonly onSelect: () => void;
  /** ←/→ ile değiştirilebilen öğe (ses düzeyleri). */
  readonly onAdjust?: (dir: 1 | -1) => void;
}

export interface TextMenuStyle {
  readonly fontFamily: string;
  readonly fontSizePx: number;
  readonly spacingPx: number;
  readonly strokePx: number;
  readonly color: string;
  readonly selectedColor: string;
  readonly selectedScale: number;
  readonly depth: number;
  /** Verilirse öğeler bu genişlikte yuvarlak butonların içinde çizilir. */
  readonly buttonWidth?: number;
  /** Buton yüksekliği (varsayılan `UI_THEME.button.height`). */
  readonly buttonHeight?: number;
}

function labelOf(item: TextMenuItem): string {
  return typeof item.label === 'string' ? item.label : item.label();
}

/**
 * Dikey menü: klavye (↑/↓ veya W/S, Enter/Space; ayarlanabilir öğede ←/→) ve fare (üzerine
 * gel + tıkla). Buton genişliği verilirse her öğe gölgeli bir butondur; seçili buton altın
 * renge döner ve hafifçe büyür. Gezinme ve seçim sesli. Klavye girdisi sahnenin
 * `KeyTracker`ından okunur, böylece menü ve oyun aynı tuş kaynağını paylaşır.
 */
export class TextMenu {
  private readonly nav: MenuNav;
  private readonly texts: Phaser.GameObjects.Text[];
  private readonly buttons: Phaser.GameObjects.Image[] = [];
  private readonly normalKey: string | null;
  private readonly activeKey: string | null;

  /** @param y İlk öğenin merkez y'si. */
  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly items: readonly TextMenuItem[],
    private readonly style: TextMenuStyle,
  ) {
    this.nav = new MenuNav(items.length);
    const bw = style.buttonWidth;
    const bh = style.buttonHeight ?? UI_THEME.button.height;
    this.normalKey = bw ? panelTexture(scene, bw, bh, 'button', bh / 2) : null;
    this.activeKey = bw ? panelTexture(scene, bw, bh, 'active', bh / 2) : null;
    this.texts = items.map((item, i) => {
      const iy = y + i * style.spacingPx;
      if (this.normalKey) {
        const btn = scene.add.image(x, iy, this.normalKey).setDepth(style.depth);
        this.bindPointer(btn, i, bw ?? 0, bh);
        this.buttons.push(btn);
      }
      const text = scene.add
        .text(x, iy, labelOf(item), textStyle(style.fontSizePx, style.color, style.strokePx))
        .setOrigin(0.5)
        .setDepth(style.depth);
      if (!this.normalKey) this.bindPointer(text, i, 0, 0);
      return text;
    });
    this.refresh(false);
  }

  private bindPointer(
    obj: Phaser.GameObjects.Image | Phaser.GameObjects.Text,
    i: number,
    w: number,
    h: number,
  ): void {
    const opts =
      w > 0
        ? {
            useHandCursor: true,
            hitArea: new Phaser.Geom.Rectangle((obj.width - w) / 2, (obj.height - h) / 2, w, h),
            hitAreaCallback: (rect: Phaser.Geom.Rectangle, px: number, py: number) =>
              rect.contains(px, py),
          }
        : { useHandCursor: true };
    obj
      .setInteractive(opts)
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
        if (this.nav.index === i) return;
        this.nav.select(i);
        sfx.menuMove();
        this.refresh(true);
      })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        this.nav.select(i);
        this.confirm();
      });
  }

  /** Toplam yükseklik (ilk öğenin merkezinden son öğenin merkezine). */
  get span(): number {
    return (this.items.length - 1) * this.style.spacingPx;
  }

  /** Her karede çağrılır: klavyeyle gezinme, ayar ve seçim. */
  update(tracker: KeyTracker): void {
    const { ui } = CONTROLS;
    if (tracker.consumeAny(ui.menuUp)) {
      this.nav.prev();
      sfx.menuMove();
      this.refresh(true);
    }
    if (tracker.consumeAny(ui.menuDown)) {
      this.nav.next();
      sfx.menuMove();
      this.refresh(true);
    }
    const item = this.items[this.nav.index];
    if (item?.onAdjust) {
      if (tracker.consumeAny(ui.menuLeft)) this.adjust(item, -1);
      if (tracker.consumeAny(ui.menuRight)) this.adjust(item, 1);
    }
    if (tracker.consumeAny(ui.menuConfirm)) this.confirm();
  }

  /** Seçili öğeyi ayarlar (ör. kayıtlı zorluk); aralık dışı değer yok sayılır. */
  select(index: number): void {
    this.nav.select(index);
    this.refresh(false);
  }

  destroy(): void {
    for (const text of this.texts) text.destroy();
    for (const b of this.buttons) b.destroy();
  }

  private adjust(item: TextMenuItem, dir: 1 | -1): void {
    item.onAdjust?.(dir);
    sfx.menuMove();
    this.refresh(false);
  }

  private confirm(): void {
    const item = this.items[this.nav.index];
    if (!item) return;
    sfx.unlock();
    sfx.menuSelect();
    item.onSelect();
    // Öğe menüyü yok etmediyse (ör. ses ayarı) yazıları tazele.
    if (this.texts[0]?.active === true) this.refresh(false);
  }

  private refresh(animate: boolean): void {
    const { style } = this;
    this.texts.forEach((text, i) => {
      const item = this.items[i];
      if (item) text.setText(labelOf(item));
      const selected = i === this.nav.index;
      const button = this.buttons[i];
      if (button && this.activeKey && this.normalKey) {
        button.setTexture(selected ? this.activeKey : this.normalKey);
        text.setColor(selected ? UI_THEME.text.activeColor : style.color);
        text.setStroke(selected ? '#fff3c4' : UI_THEME.text.stroke, selected ? 0 : style.strokePx);
      } else {
        text.setColor(selected ? style.selectedColor : style.color);
      }
      const scale = selected ? style.selectedScale : 1;
      const targets = button ? [text, button] : [text];
      this.scene.tweens.killTweensOf(targets);
      if (animate && selected) {
        for (const t of targets) t.setScale(scale * POP);
        this.scene.tweens.add({
          targets,
          scale,
          duration: UI_THEME.button.popMs,
          ease: 'Back.easeOut',
        });
      } else {
        for (const t of targets) t.setScale(scale);
      }
    });
  }
}

/** Seçime geçerken kısa büyüme. */
const POP = 1.08;
