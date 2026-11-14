import Phaser from 'phaser';
import { CONTROLS, COLORS } from '../config/gameConfig';
import type { KeyTracker } from '../input/KeyboardInput';
import { MenuNav } from './menuNav';

export interface TextMenuItem {
  readonly label: string;
  readonly onSelect: () => void;
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
}

/**
 * Dikey metin menüsü: klavye (↑/↓ veya W/S, Enter/Space) ve fare (üzerine gel + tıkla).
 * Seçili öğe vurgu renginde ve biraz büyük çizilir. Klavye girdisi sahnenin `KeyTracker`ından
 * okunur (`update`), böylece menü ve oyun aynı tuş kaynağını paylaşır.
 */
export class TextMenu {
  private readonly nav: MenuNav;
  private readonly texts: Phaser.GameObjects.Text[];

  /** @param y İlk öğenin merkez y'si. */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly items: readonly TextMenuItem[],
    private readonly style: TextMenuStyle,
  ) {
    this.nav = new MenuNav(items.length);
    this.texts = items.map((item, i) =>
      scene.add
        .text(x, y + i * style.spacingPx, item.label, {
          fontFamily: style.fontFamily,
          fontSize: `${style.fontSizePx}px`,
          color: style.color,
          stroke: COLORS.textStroke,
          strokeThickness: style.strokePx,
        })
        .setOrigin(0.5)
        .setDepth(style.depth)
        .setInteractive({ useHandCursor: true })
        .on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
          this.nav.select(i);
          this.refresh();
        })
        .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
          this.nav.select(i);
          this.confirm();
        }),
    );
    this.refresh();
  }

  /** Toplam yükseklik (ilk öğenin merkezinden son öğenin merkezine). */
  get span(): number {
    return (this.items.length - 1) * this.style.spacingPx;
  }

  /** Her karede çağrılır: klavyeyle gezinme ve seçim. */
  update(tracker: KeyTracker): void {
    const { ui } = CONTROLS;
    if (tracker.consumeAny(ui.menuUp)) {
      this.nav.prev();
      this.refresh();
    }
    if (tracker.consumeAny(ui.menuDown)) {
      this.nav.next();
      this.refresh();
    }
    if (tracker.consumeAny(ui.menuConfirm)) this.confirm();
  }

  /** Seçili öğeyi ayarlar (ör. kayıtlı zorluk); aralık dışı değer yok sayılır. */
  select(index: number): void {
    this.nav.select(index);
    this.refresh();
  }

  destroy(): void {
    for (const text of this.texts) text.destroy();
  }

  private confirm(): void {
    this.items[this.nav.index]?.onSelect();
  }

  private refresh(): void {
    const { style } = this;
    this.texts.forEach((text, i) => {
      const selected = i === this.nav.index;
      text.setColor(selected ? style.selectedColor : style.color);
      text.setScale(selected ? style.selectedScale : 1);
    });
  }
}
