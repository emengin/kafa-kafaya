import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import {
  CHARACTER_STATS,
  COLORS,
  CONTROLS,
  DISPLAY,
  GRAYBOX,
  HUD,
  MENU,
  SELECT,
  STORAGE,
} from '../config/gameConfig';
import {
  CHARACTERS,
  isCharacterId,
  paramsFromStats,
  type CharacterDef,
  type CharacterId,
} from '../game/characters';
import { resolveMatchSetup, type MatchSetup } from '../game/matchSetup';
import { storage } from '../game/storage';
import { t, upper } from '../i18n';
import { KeyTracker } from '../input/KeyboardInput';
import { SceneKeys } from './sceneKeys';

type Text = Phaser.GameObjects.Text;

/** Bir oyuncunun seçim durumu. */
interface Picker {
  index: number;
  ready: boolean;
  /** CPU'nun seçimi (insan kontrol etmez). */
  readonly cpu: boolean;
}

interface PanelTexts {
  readonly tag: Text;
  readonly name: Text;
  readonly superName: Text;
  readonly desc: Text;
  readonly statLabels: readonly Text[];
  readonly ready: Text;
}

/** Yön tuşları: P1 (A/D/W/S) ve P2 (oklar). */
const KEYS = {
  p1: { left: CONTROLS.p1.left, right: CONTROLS.p1.right, up: CONTROLS.p1.jump, down: 'KeyS' },
  p2: { left: CONTROLS.p2.left, right: CONTROLS.p2.right, up: CONTROLS.p2.jump, down: 'ArrowDown' },
  confirm1: [CONTROLS.p1.kick],
  confirm2: [CONTROLS.p2.kick, 'NumpadEnter'],
} as const;

const STAT_KEYS = ['speed', 'jump', 'kick', 'head'] as const;

function savedIndex(key: string, fallback: number): number {
  const id = storage.get(key);
  const i = isCharacterId(id) ? CHARACTERS.findIndex((c) => c.id === id) : -1;
  return i >= 0 ? i : fallback;
}

/**
 * Karakter seçimi: 5×2 kart ızgarası; altta iki panel (isim, istatistik çubukları, süper şut ve
 * karşı oyunu). 2 oyuncuda iki imleç aynı anda (P1: A/D/W/S + Space, P2: oklar + Enter); CPU'ya
 * karşı modda insan iki tuş takımıyla da seçer, CPU kalan karakterlerden rastgele birini alır.
 * Fareyle de seçilir. Esc/Backspace: hazırı geri al, yoksa ana menü.
 */
export class CharacterSelectScene extends Phaser.Scene {
  private setup!: MatchSetup;
  private tracker!: KeyTracker;
  private pickers!: [Picker, Picker];
  private cursors!: Phaser.GameObjects.Graphics;
  private cards: { x: number; y: number }[] = [];
  private panels!: [PanelTexts, PanelTexts];
  private bars!: Phaser.GameObjects.Graphics;
  private leaving = false;

  constructor() {
    super(SceneKeys.Select);
  }

  create(data?: unknown): void {
    this.leaving = false;
    this.setup = resolveMatchSetup(data, { cpu: null, cpu1: null, seed: null });
    const cpu = this.setup.mode === 'cpu';
    this.pickers = [
      { index: savedIndex(STORAGE.keys.character1, 0), ready: false, cpu: false },
      { index: savedIndex(STORAGE.keys.character2, 1), ready: false, cpu },
    ];
    const { ui } = CONTROLS;
    this.tracker = new KeyTracker(
      window,
      new Set<string>([
        ...Object.values(KEYS.p1),
        ...Object.values(KEYS.p2),
        ...KEYS.confirm1,
        ...KEYS.confirm2,
        ...ui.menuBack,
      ]),
    ).attach();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.tracker.detach();
    });

    this.drawBackground();
    this.add
      .text(DISPLAY.width / 2, SELECT.titleY, upper(t('select.title')), {
        fontFamily: MENU.fontFamily,
        fontSize: `${SELECT.titleFontSizePx}px`,
        color: COLORS.textAccent,
        stroke: COLORS.textStroke,
        strokeThickness: MENU.title.strokePx / 2,
      })
      .setOrigin(0.5);
    this.createCards();
    this.cursors = this.add.graphics();
    this.panels = [this.createPanel(0), this.createPanel(1)];
    // Çubuklar panellerin üstünde çizilmeli.
    this.bars = this.add.graphics();
    this.add
      .text(DISPLAY.width / 2, SELECT.hintY, t(cpu ? 'select.hintCpu' : 'select.hintVersus'), {
        fontFamily: MENU.fontFamily,
        fontSize: `${SELECT.hintFontSizePx}px`,
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5)
      .setAlpha(MENU.navHint.alpha);
    this.refresh();
    this.cameras.main.fadeIn(MENU.startFadeMs);
  }

  override update(): void {
    if (this.leaving) return;
    const tr = this.tracker;
    if (tr.consumeAny(CONTROLS.ui.menuBack)) {
      this.back();
      return;
    }
    const [p1, p2] = this.pickers;
    const cpu = p2.cpu;
    // CPU modunda insan iki tuş takımını da kullanır.
    this.navigate(p1, KEYS.p1);
    if (cpu) this.navigate(p1, KEYS.p2);
    else this.navigate(p2, KEYS.p2);
    if (tr.consumeAny(KEYS.confirm1)) this.confirm(p1);
    if (tr.consumeAny(KEYS.confirm2)) this.confirm(cpu ? p1 : p2);
  }

  private navigate(
    p: Picker,
    keys: { left: string; right: string; up: string; down: string },
  ): void {
    const tr = this.tracker;
    const cols = SELECT.grid.columns;
    const n = CHARACTERS.length;
    let moved = false;
    if (tr.consumePress(keys.left)) {
      moved = this.move(p, (p.index - 1 + n) % n);
    }
    if (tr.consumePress(keys.right)) moved = this.move(p, (p.index + 1) % n) || moved;
    if (tr.consumePress(keys.up)) moved = this.move(p, (p.index - cols + n) % n) || moved;
    if (tr.consumePress(keys.down)) moved = this.move(p, (p.index + cols) % n) || moved;
    if (moved) this.refresh();
  }

  private move(p: Picker, index: number): boolean {
    if (p.ready || p.cpu) return false;
    p.index = index;
    return true;
  }

  private confirm(p: Picker): void {
    if (p.ready || p.cpu) return;
    p.ready = true;
    sfx.unlock();
    sfx.kick();
    const other = this.pickers[1];
    if (other.cpu && p === this.pickers[0]) {
      // CPU, insanın seçmediği karakterlerden rastgele birini alır (yalnızca arayüz; maç
      // determinizmini etkilemez).
      const choices = CHARACTERS.map((_, i) => i).filter((i) => i !== p.index);
      other.index = choices[Math.floor(Math.random() * choices.length)] ?? 0;
      other.ready = true;
    }
    this.refresh();
    if (this.pickers.every((x) => x.ready)) this.start();
  }

  private back(): void {
    const [p1, p2] = this.pickers;
    if (p2.ready && !p2.cpu) {
      p2.ready = false;
    } else if (p1.ready) {
      p1.ready = false;
      if (p2.cpu) p2.ready = false;
    } else {
      this.leave(SceneKeys.Menu, undefined);
      return;
    }
    this.refresh();
  }

  private start(): void {
    const ids = this.pickers.map((p) => CHARACTERS[p.index]?.id ?? 'kor') as [
      CharacterId,
      CharacterId,
    ];
    storage.set(STORAGE.keys.character1, ids[0]);
    if (!this.pickers[1].cpu) storage.set(STORAGE.keys.character2, ids[1]);
    const setup: MatchSetup = { ...this.setup, characters: ids };
    this.time.delayedCall(SELECT.startDelayMs, () => {
      this.leave(SceneKeys.Match, setup);
    });
    this.leaving = true;
  }

  private leave(key: string, data: MatchSetup | undefined): void {
    this.leaving = true;
    this.cameras.main.fadeOut(MENU.startFadeMs);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(key, data);
    });
  }

  // ───────────────────────────── Çizim ─────────────────────────────

  private drawBackground(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(COLORS.skyTop, COLORS.skyTop, COLORS.skyBottom, COLORS.skyBottom, 1);
    g.fillRect(0, 0, DISPLAY.width, DISPLAY.height);
  }

  private createCards(): void {
    const { columns, cellW, cellH, gapPx, top } = SELECT.grid;
    const gridW = columns * cellW + (columns - 1) * gapPx;
    const left = (DISPLAY.width - gridW) / 2;
    const g = this.add.graphics();
    this.cards = CHARACTERS.map((c, i) => {
      const x = left + (i % columns) * (cellW + gapPx);
      const y = top + Math.floor(i / columns) * (cellH + gapPx);
      g.fillStyle(SELECT.cardColor, SELECT.cardAlpha);
      g.fillRoundedRect(x, y, cellW, cellH, SELECT.cardRadius);
      drawCharacterIcon(g, c, x + cellW / 2, y + SELECT.headY);
      this.add
        .text(x + cellW / 2, y + SELECT.nameY, upper(c.name), {
          fontFamily: MENU.fontFamily,
          fontSize: `${SELECT.nameFontSizePx}px`,
          color: COLORS.textPrimary,
          stroke: COLORS.textStroke,
          strokeThickness: HUD.label.strokePx,
        })
        .setOrigin(0.5);
      const zone = this.add.zone(x, y, cellW, cellH).setOrigin(0).setInteractive({
        useHandCursor: true,
      });
      zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
        const p = this.mousePicker();
        if (p && this.move(p, i)) this.refresh();
      });
      zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        const p = this.mousePicker();
        if (!p) return;
        this.move(p, i);
        this.confirm(p);
      });
      return { x, y };
    });
  }

  /** Fare, henüz hazır olmayan ilk insan oyuncuyu yönetir. */
  private mousePicker(): Picker | null {
    if (this.leaving) return null;
    return this.pickers.find((p) => !p.ready && !p.cpu) ?? null;
  }

  private createPanel(i: 0 | 1): PanelTexts {
    const pn = SELECT.panel;
    const x = i === 0 ? pn.marginX : DISPLAY.width - pn.marginX - pn.width;
    const g = this.add.graphics();
    g.fillStyle(SELECT.cardColor, pn.alpha);
    g.fillRoundedRect(x, pn.y, pn.width, pn.height, pn.radius);
    const pad = pn.radius;
    const style = (
      size: number,
      color: string = COLORS.textPrimary,
    ): Phaser.Types.GameObjects.Text.TextStyle => ({
      fontFamily: MENU.fontFamily,
      fontSize: `${size}px`,
      color,
      stroke: COLORS.textStroke,
      strokeThickness: HUD.label.strokePx,
    });
    const tag = this.add.text(
      x + pad,
      pn.y + pad,
      '',
      style(SELECT.fontSizePx, HUD.playerColors[i]),
    );
    const name = this.add.text(
      x + pad,
      pn.y + pad * 2 + SELECT.fontSizePx,
      '',
      style(SELECT.titleFontSizePx * SELECT.panelNameScale),
    );
    const ready = this.add
      .text(x + pn.width - pad, pn.y + pad, '', style(SELECT.fontSizePx, COLORS.textAccent))
      .setOrigin(1, 0);
    const sb = SELECT.statBar;
    const statTop = pn.y + pad * 2 + SELECT.fontSizePx * SELECT.statTopLines;
    const statLabels = STAT_KEYS.map((k, row) =>
      this.add.text(
        x + pad,
        statTop + row * sb.gapY,
        t(`select.${k}`),
        style(SELECT.descFontSizePx),
      ),
    );
    const superY = statTop + STAT_KEYS.length * sb.gapY;
    const superName = this.add.text(
      x + pad,
      superY,
      '',
      style(SELECT.fontSizePx, COLORS.textAccent),
    );
    const desc = this.add.text(x + pad, superY + SELECT.fontSizePx * SELECT.descGapLines, '', {
      ...style(SELECT.descFontSizePx),
      wordWrap: { width: pn.width - pad * 2 },
    });
    return { tag, name, superName, desc, statLabels, ready };
  }

  private refresh(): void {
    const g = this.cursors;
    g.clear();
    const { cellW, cellH } = SELECT.grid;
    this.pickers.forEach((p, i) => {
      const card = this.cards[p.index];
      if (!card) return;
      const inset = i === 1 && this.pickers[0].index === p.index ? SELECT.cursorInsetPx : 0;
      const color = Phaser.Display.Color.HexStringToColor(HUD.playerColors[i === 0 ? 0 : 1]).color;
      g.lineStyle(SELECT.cursorWidthPx, color, p.ready ? 1 : SELECT.cursorIdleAlpha);
      g.strokeRoundedRect(
        card.x + inset,
        card.y + inset,
        cellW - inset * 2,
        cellH - inset * 2,
        SELECT.cardRadius,
      );
    });
    this.bars.clear();
    this.pickers.forEach((p, i) => {
      const c = CHARACTERS[p.index];
      if (c) this.updatePanel(i as 0 | 1, p, c);
    });
  }

  private updatePanel(i: 0 | 1, p: Picker, c: CharacterDef): void {
    const texts = this.panels[i];
    const tag = p.cpu ? t('select.cpu') : `P${i + 1}`;
    texts.tag.setText(tag);
    texts.name.setText(upper(c.name)).setColor(cssColor(c.palette.accent));
    texts.ready.setText(p.ready ? t('select.ready') : '');
    texts.superName.setText(upper(t(`super.${c.superType}`)));
    texts.desc.setText(t(`superDesc.${c.superType}`));
    // İstatistik çubukları: 5 bölmeli.
    const sb = SELECT.statBar;
    const g = this.bars;
    STAT_KEYS.forEach((k, row) => {
      const label = texts.statLabels[row];
      if (!label) return;
      const x0 = label.x + sb.labelWidth;
      const y0 = label.y + (label.height - sb.height) / 2;
      const segW = sb.width / CHARACTER_STATS.statMax;
      for (let s = 0; s < CHARACTER_STATS.statMax; s++) {
        const on = s < c.stats[k];
        g.fillStyle(on ? c.palette.accent : GRAYBOX.outline, on ? 1 : SELECT.emptyStatAlpha);
        g.fillRect(x0 + s * segW, y0, segW - 2, sb.height);
      }
    });
  }
}

/** Karttaki küçük karakter çizimi: gövde + kafa (kafa puanıyla büyür) + göz. */
function drawCharacterIcon(
  g: Phaser.GameObjects.Graphics,
  c: CharacterDef,
  x: number,
  y: number,
): void {
  const headR = paramsFromStats(c.stats).headRadius * SELECT.headScale;
  g.fillStyle(c.palette.body, 1);
  g.fillCircle(x, y + headR * SELECT.iconBodyOffset, headR * SELECT.iconBodyScale);
  g.fillStyle(c.palette.head, 1);
  g.fillCircle(x, y, headR);
  g.lineStyle(GRAYBOX.outlinePx, GRAYBOX.outline, 1);
  g.strokeCircle(x, y, headR);
  g.fillStyle(GRAYBOX.eye.color, 1);
  g.fillCircle(
    x + headR * GRAYBOX.eye.forwardRatio,
    y - headR * GRAYBOX.eye.upRatio,
    GRAYBOX.eye.radius,
  );
}

function cssColor(color: number): string {
  return Phaser.Display.Color.IntegerToColor(color).rgba;
}
