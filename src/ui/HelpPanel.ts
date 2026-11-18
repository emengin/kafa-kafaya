import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { hex } from '../art/canvas';
import { addPanel, goldFill, textStyle } from '../art/uiArt';
import { CONTROLS, DISPLAY, FX, HELP, UI_THEME } from '../config/gameConfig';
import { CHARACTERS } from '../game/characters';
import { POWER_UP_TYPES } from '../game/entities/Player';
import { powerUpDuration } from '../game/powerups';
import { format, formatDecimal, t, upper, type StringKey } from '../i18n';
import { gamepads } from '../input/Gamepads';
import type { KeyTracker } from '../input/KeyboardInput';
import { getSettings } from '../save/gameSettings';
import { ICON_RADIUS, iconKey } from './icons';
import { PillButton } from './PillButton';

type GameObject = Phaser.GameObjects.GameObject;

export type HelpPage = 'rules' | 'super' | 'powerUps' | 'controls';
export const HELP_PAGES: readonly HelpPage[] = ['rules', 'super', 'powerUps', 'controls'];

const TITLES: Readonly<Record<HelpPage, StringKey>> = {
  rules: 'help.rules.title',
  super: 'help.super.title',
  powerUps: 'help.powerUps.title',
  controls: 'help.controls.title',
};

/** Kontrol tablosu: satır (eylem) × sütun (P1 klavye, P2 klavye, gamepad, dokunmatik). */
const CONTROL_ROWS = ['move', 'jump', 'kick', 'super', 'pause'] as const;
const CONTROL_CELLS: Readonly<Record<(typeof CONTROL_ROWS)[number], readonly StringKey[]>> = {
  move: ['controls.p1.move', 'controls.p2.move', 'controls.pad.move', 'controls.touch.move'],
  jump: ['controls.p1.jump', 'controls.p2.jump', 'controls.pad.jump', 'controls.touch.jump'],
  kick: ['controls.p1.kick', 'controls.p2.kick', 'controls.pad.kick', 'controls.touch.kick'],
  super: ['controls.p1.super', 'controls.p2.super', 'controls.pad.super', 'controls.touch.super'],
  pause: ['controls.kb.pause', 'controls.kb.pause', 'controls.pad.pause', 'controls.touch.pause'],
};
const CONTROL_HEADERS: readonly StringKey[] = [
  'controls.action',
  'controls.p1',
  'controls.p2',
  'controls.pad',
  'controls.touch',
];

/**
 * "Nasıl Oynanır" paneli (Faz 6): ana menüde demo maçın üstünde, sayfalı — Maç kuralları, güç barı
 * ve 10 süper şut, güçlendiriciler, kontrol şeması (klavye, gamepad, dokunmatik). ←/→ (LB/RB)
 * sayfa değiştirir, Esc/B ya da "Geri" kapatır; oklar ve Geri dokunmatik/fareyle de çalışır.
 * Ayarlar → Kontrol Şeması doğrudan son sayfayı açar.
 */
export class HelpPanel {
  private readonly frame: GameObject[] = [];
  private page: GameObject[] = [];
  private readonly buttons: PillButton[] = [];
  private readonly pageTitle: Phaser.GameObjects.Text;
  private readonly pageIndex: Phaser.GameObjects.Text;
  private index: number;
  private closed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    start: HelpPage,
    private readonly depth: number,
    private readonly onClose: () => void,
  ) {
    this.index = Math.max(0, HELP_PAGES.indexOf(start));
    const cx = DISPLAY.width / 2;
    const p = HELP.panel;
    const heading = scene.add
      .text(cx, HELP.headingY, upper(t('help.title')), textStyle(HELP.headingFontSizePx, '#ffffff'))
      .setOrigin(0.5)
      .setDepth(depth);
    goldFill(heading);
    const panel = addPanel(
      scene,
      cx,
      (p.top + p.bottom) / 2,
      p.width,
      p.bottom - p.top,
      'panel',
      p.radius,
    ).setDepth(depth);
    this.pageTitle = scene.add
      .text(
        cx,
        p.top + HELP.pageTitleOffsetY,
        '',
        textStyle(HELP.pageTitleFontSizePx, UI_THEME.text.gold[1]),
      )
      .setOrigin(0.5)
      .setDepth(depth);
    this.pageIndex = scene.add
      .text(
        cx + p.width / 2 - HELP.padX,
        p.top + HELP.pageTitleOffsetY,
        '',
        textStyle(HELP.pageIndexFontSizePx, '#ffffff'),
      )
      .setOrigin(1, 0.5)
      .setDepth(depth);
    this.frame.push(heading, panel, this.pageTitle, this.pageIndex);
    const fy = p.bottom - HELP.footerOffsetY;
    const left = cx - p.width / 2 + HELP.arrowInsetX;
    const right = cx + p.width / 2 - HELP.arrowInsetX;
    this.buttons.push(
      new PillButton(
        scene,
        left,
        fy,
        ARROW_W,
        ARROW_H,
        '◀',
        HELP.arrowFontSizePx,
        () => {
          this.turn(-1);
        },
        depth,
      ),
      new PillButton(
        scene,
        right,
        fy,
        ARROW_W,
        ARROW_H,
        '▶',
        HELP.arrowFontSizePx,
        () => {
          this.turn(1);
        },
        depth,
      ),
      new PillButton(
        scene,
        cx,
        fy,
        BACK_W,
        ARROW_H,
        t('menu.back'),
        BACK_FONT,
        () => {
          this.close();
        },
        depth,
      ),
    );
    this.render();
  }

  /** Her kare: ←/→ sayfa, Esc/B ya da Enter kapat. */
  update(tracker: KeyTracker): void {
    if (this.closed) return;
    const { ui } = CONTROLS;
    if (tracker.consumeAny(ui.menuLeft)) this.turn(-1);
    if (tracker.consumeAny(ui.menuRight)) this.turn(1);
    if (tracker.consumeAny(ui.menuBack) || tracker.consumeAny(ui.menuConfirm)) {
      sfx.menuBack();
      this.close();
    }
  }

  destroy(): void {
    for (const o of [...this.frame, ...this.page]) o.destroy();
    for (const b of this.buttons) b.destroy();
    this.frame.length = 0;
    this.page = [];
    this.buttons.length = 0;
  }

  private close(): void {
    if (this.closed) return;
    this.closed = true;
    // Buton işleyicisinin içinden çağrılabilir: nesneleri bir sonraki karede yok et.
    this.scene.time.delayedCall(0, () => {
      this.destroy();
      this.onClose();
    });
  }

  private turn(dir: 1 | -1): void {
    const n = HELP_PAGES.length;
    this.index = (this.index + dir + n) % n;
    sfx.menuMove();
    this.render();
  }

  private render(): void {
    for (const o of this.page) o.destroy();
    this.page = [];
    const page = HELP_PAGES[this.index] ?? 'rules';
    this.pageTitle.setText(upper(t(TITLES[page])));
    this.pageIndex.setText(format('help.page', { n: this.index + 1, total: HELP_PAGES.length }));
    switch (page) {
      case 'rules':
        this.renderRules();
        break;
      case 'super':
        this.renderSuper();
        break;
      case 'powerUps':
        this.renderPowerUps();
        break;
      case 'controls':
        this.renderControls();
        break;
    }
  }

  private get left(): number {
    return DISPLAY.width / 2 - HELP.panel.width / 2 + HELP.padX;
  }

  private get innerWidth(): number {
    return HELP.panel.width - HELP.padX * 2;
  }

  /** Madde işaretli, satır kaydırmalı paragraflar; son y'yi döndürür. */
  private paragraphs(
    lines: readonly string[],
    y: number,
    size: number = HELP.bodyFontSizePx,
  ): number {
    let cy = y;
    for (const line of lines) {
      const text = this.scene.add
        .text(this.left, cy, `•  ${line}`, {
          ...textStyle(size, '#ffffff', TEXT_STROKE),
          wordWrap: { width: this.innerWidth },
        })
        .setDepth(this.depth);
      this.page.push(text);
      cy += text.height + HELP.lineGapPx;
    }
    return cy;
  }

  private renderRules(): void {
    const seconds = getSettings().matchSeconds;
    const keys: StringKey[] = [
      'help.rules.1',
      'help.rules.2',
      'help.rules.3',
      'help.rules.4',
      'help.rules.5',
      'help.rules.6',
    ];
    const lines = keys.map((k) => format(k, { seconds }));
    const y = this.paragraphs(lines, HELP.bodyTop);
    this.paragraphs([t('help.modes')], y + HELP.lineGapPx, HELP.smallFontSizePx);
  }

  private renderSuper(): void {
    const y = this.paragraphs(
      [t('help.super.1'), t('help.super.2'), t('help.super.3')],
      HELP.bodyTop,
    );
    const colW = (this.innerWidth - HELP.columnGapPx) / 2;
    const half = Math.ceil(CHARACTERS.length / 2);
    CHARACTERS.forEach((c, i) => {
      const col = i < half ? 0 : 1;
      const row = i % half;
      const x = this.left + col * (colW + HELP.columnGapPx);
      const cy = y + HELP.lineGapPx + row * HELP_ROW + HELP_ROW / 2;
      const dot = this.scene.add
        .circle(x + HELP.iconRadius / 2, cy, HELP.iconRadius / 2, FX.superColors[c.superType])
        .setDepth(this.depth);
      const name = this.scene.add
        .text(
          x + HELP.iconRadius + ICON_GAP,
          cy,
          `${upper(t(`super.${c.superType}`))} · ${c.name}`,
          textStyle(HELP.smallFontSizePx, hex(c.palette.accent), TEXT_STROKE),
        )
        .setOrigin(0, 0.5)
        .setDepth(this.depth);
      const desc = this.scene.add
        .text(
          name.x + name.width + ICON_GAP,
          cy,
          `— ${t(`superShort.${c.superType}`)}`,
          textStyle(HELP.smallFontSizePx, '#ffffff', TEXT_STROKE),
        )
        .setOrigin(0, 0.5)
        .setDepth(this.depth);
      this.page.push(dot, name, desc);
    });
  }

  private renderPowerUps(): void {
    const y = this.paragraphs([t('help.powerUps.intro')], HELP.bodyTop);
    const colW = (this.innerWidth - HELP.columnGapPx) / 2;
    const half = Math.ceil(POWER_UP_TYPES.length / 2);
    POWER_UP_TYPES.forEach((type, i) => {
      const col = i < half ? 0 : 1;
      const row = i % half;
      const x = this.left + col * (colW + HELP.columnGapPx);
      const cy = y + HELP.rowHeightPx * (row + 1);
      const r = HELP.iconRadius;
      const bg = this.scene.add
        .circle(x + r, cy, r + 2, UI_THEME.styles.dark.top)
        .setDepth(this.depth);
      const icon = this.scene.add
        .image(x + r, cy, iconKey(type))
        .setTint(FX.powerUpColors[type])
        .setScale((r * ICON_FILL) / ICON_RADIUS)
        .setDepth(this.depth);
      const name = this.scene.add
        .text(
          x + r * 2 + ICON_GAP * 2,
          cy,
          t(`powerUp.${type}`),
          textStyle(HELP.bodyFontSizePx, hex(FX.powerUpColors[type]), TEXT_STROKE),
        )
        .setOrigin(0, 0.5)
        .setDepth(this.depth);
      const desc = this.scene.add
        .text(
          name.x + name.width + ICON_GAP,
          cy,
          `— ${format(`powerUpDesc.${type}`, { s: formatDecimal(powerUpDuration(type)) })}`,
          textStyle(HELP.smallFontSizePx, '#ffffff', TEXT_STROKE),
        )
        .setOrigin(0, 0.5)
        .setDepth(this.depth);
      this.page.push(bg, icon, name, desc);
    });
  }

  private renderControls(): void {
    const tb = HELP.table;
    const cols = CONTROL_HEADERS.length;
    const other = (this.innerWidth - tb.firstColWidth) / (cols - 1);
    const colX = (c: number): number =>
      this.left + (c === 0 ? 0 : tb.firstColWidth + (c - 1) * other);
    let y = HELP.bodyTop;
    CONTROL_HEADERS.forEach((key, c) => {
      this.page.push(
        this.scene.add
          .text(
            colX(c),
            y,
            upper(t(key)),
            textStyle(tb.headerFontSizePx, UI_THEME.text.gold[1], TEXT_STROKE),
          )
          .setDepth(this.depth),
      );
    });
    y += tb.rowHeightPx;
    CONTROL_ROWS.forEach((row, r) => {
      if (r % 2 === 0) {
        this.page.push(
          this.scene.add
            .rectangle(
              this.left - ROW_PAD,
              y - ROW_PAD,
              this.innerWidth + ROW_PAD * 2,
              tb.rowHeightPx,
              UI_THEME.styles.dark.bottom,
              ROW_ALPHA,
            )
            .setOrigin(0)
            .setDepth(this.depth),
        );
      }
      this.page.push(
        this.scene.add
          .text(
            colX(0),
            y,
            t(`controls.${row}`),
            textStyle(tb.cellFontSizePx, '#ffffff', TEXT_STROKE),
          )
          .setDepth(this.depth),
      );
      CONTROL_CELLS[row].forEach((key, c) => {
        this.page.push(
          this.scene.add
            .text(colX(c + 1), y, t(key), textStyle(tb.cellFontSizePx, '#ffffff', TEXT_STROKE))
            .setDepth(this.depth),
        );
      });
      y += tb.rowHeightPx;
    });
    this.paragraphs(
      [
        t('controls.note.cpu'),
        format('controls.note.pads', { n: gamepads.connected }),
        t('controls.note.training'),
      ],
      y + HELP.lineGapPx,
      HELP.smallFontSizePx,
    );
  }
}

const ARROW_W = 96;
const ARROW_H = 46;
const BACK_W = 220;
const BACK_FONT = 22;
const TEXT_STROKE = 3;
const ICON_GAP = 8;
const ICON_FILL = 0.8;
const HELP_ROW = 34;
const ROW_PAD = 8;
const ROW_ALPHA = 0.45;
