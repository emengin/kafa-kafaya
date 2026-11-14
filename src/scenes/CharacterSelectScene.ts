import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { hex } from '../art/canvas';
import { STAGE_KEYS } from '../art/stadiumArt';
import { addPanel, goldFill, panelTexture, textStyle } from '../art/uiArt';
import {
  CHARACTER_STATS,
  CONTROLS,
  DISPLAY,
  HUD,
  KICK,
  MENU,
  SELECT,
  STORAGE,
  UI_THEME,
  UNITS,
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
import { CharacterRig, type RigPose } from '../ui/CharacterRig';
import { StadiumView } from '../ui/StadiumView';
import { sessionQuality, type QualityLevel } from '../fx/feel';
import { SceneKeys } from './sceneKeys';

/** Sık kullanılan renk. */
const WHITE = 0xffffff;

type Text = Phaser.GameObjects.Text;

/** Bir oyuncunun seçim durumu. */
interface Picker {
  index: number;
  ready: boolean;
  /** CPU'nun seçimi (insan kontrol etmez). */
  readonly cpu: boolean;
}

interface PanelView {
  readonly x: number;
  readonly textX: number;
  readonly rigX: number;
  readonly tag: Text;
  readonly name: Text;
  readonly superName: Text;
  readonly desc: Text;
  readonly statLabels: readonly Text[];
  readonly ready: Text;
  rig: CharacterRig | null;
  shownIndex: number;
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

/** Duran karakterin pozu (menü/seçim ekranı). */
function standPose(def: CharacterDef, x: number, y: number, facing: 1 | -1): RigPose {
  return {
    x,
    y,
    headRadius: paramsFromStats(def.stats).headRadius,
    footAngle: KICK.restAngle,
    facing,
    vx: 0,
    vy: 0,
    grounded: true,
    maxSpeed: 1,
    kick: 0,
    frozen: false,
    armed: false,
  };
}

/**
 * Karakter seçimi: 5×2 kart (her kartta canlı, göz kırpan küçük karakter); altta iki panel
 * (büyük karakter — fareyi gözleriyle izler, hazır olunca sevinir —, isim, istatistik çubukları,
 * süper şut ve karşı oyunu). 2 oyuncuda iki imleç aynı anda (P1: A/D/W/S + Space, P2: oklar +
 * Enter); CPU'ya karşı modda insan iki tuş takımıyla da seçer, CPU kalan karakterlerden rastgele
 * birini alır. Fareyle de seçilir. Esc/Backspace: hazırı geri al, yoksa ana menü.
 */
export class CharacterSelectScene extends Phaser.Scene {
  private setup!: MatchSetup;
  private tracker!: KeyTracker;
  private pickers!: [Picker, Picker];
  private cursors!: Phaser.GameObjects.Graphics;
  private cards: { x: number; y: number; rig: CharacterRig }[] = [];
  private panels!: [PanelView, PanelView];
  private bars!: Phaser.GameObjects.Graphics;
  private stadium!: StadiumView;
  private leaving = false;

  constructor() {
    super(SceneKeys.Select);
  }

  create(data?: unknown): void {
    this.leaving = false;
    this.cards = [];
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

    const world = this.add.container(0, 0);
    this.stadium = new StadiumView(this, world, {
      leftColors: [],
      rightColors: [],
      quality: Math.min(1, sessionQuality()) as QualityLevel,
      title: t('game.title'),
      goalText: t('board.goal'),
    });
    this.add
      .rectangle(0, 0, DISPLAY.width, DISPLAY.height, SELECT.dimColor, SELECT.dimAlpha)
      .setOrigin(0);
    this.add.image(0, 0, STAGE_KEYS.vignette).setOrigin(0);

    const title = this.add
      .text(
        DISPLAY.width / 2,
        SELECT.titleY,
        upper(t('select.title')),
        textStyle(SELECT.titleFontSizePx, '#ffffff'),
      )
      .setOrigin(0.5);
    goldFill(title);
    this.createCards();
    this.cursors = this.add.graphics();
    this.panels = [this.createPanel(0), this.createPanel(1)];
    // Çubuklar panellerin üstünde çizilmeli.
    this.bars = this.add.graphics();
    const hint = this.add
      .text(
        DISPLAY.width / 2,
        SELECT.hintY,
        t(cpu ? 'select.hintCpu' : 'select.hintVersus'),
        textStyle(SELECT.hintFontSizePx, '#ffffff', 2),
      )
      .setOrigin(0.5)
      .setDepth(1);
    this.add
      .image(
        hint.x,
        hint.y,
        panelTexture(this, hint.width + HINT_PAD * 2, HINT_H, 'dark', HINT_H / 2),
      )
      .setAlpha(MENU.navHint.alpha);
    this.refresh();
    this.cameras.main.fadeIn(MENU.startFadeMs);
  }

  override update(time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, MAX_FRAME_MS) / UNITS.msPerSecond;
    const seconds = time / UNITS.msPerSecond;
    this.stadium.update(dt, seconds);
    this.animate(dt, seconds);
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

  /** Kartlardaki ve panellerdeki karakterler: göz kırpma, fareyi izleme, imleç nabzı. */
  private animate(dt: number, seconds: number): void {
    const pointer = this.input.activePointer;
    const look = { x: pointer.x, y: pointer.y };
    const { cellW, cellH } = SELECT.grid;
    this.cards.forEach((card, i) => {
      const def = CHARACTERS[i];
      if (!def) return;
      const selected = this.pickers.some((p) => p.index === i);
      card.rig.face.update(dt, { frozen: false, straining: false, armed: selected });
      const pose = standPose(def, card.x + cellW / 2, card.y + cellH * CARD_HEAD_Y, 1);
      card.rig.update(dt, pose, look, seconds);
    });
    this.panels.forEach((panel, i) => {
      const p = this.pickers[i as 0 | 1];
      const def = CHARACTERS[p.index];
      if (!panel.rig || !def) return;
      panel.rig.face.update(dt, { frozen: false, straining: false, armed: false });
      const pose = standPose(
        def,
        panel.rigX,
        SELECT.panel.y + SELECT.panel.height * PANEL_HEAD_Y,
        i === 0 ? 1 : -1,
      );
      panel.rig.update(dt, pose, look, seconds);
    });
    // İmleçler: hazır olmayan imleç hafifçe nabız atar.
    const pulse = 0.5 + 0.5 * Math.sin(seconds * CURSOR_PULSE_HZ * Math.PI * 2);
    this.drawCursors(pulse);
  }

  private navigate(
    p: Picker,
    keys: { left: string; right: string; up: string; down: string },
  ): void {
    const tr = this.tracker;
    const cols = SELECT.grid.columns;
    const n = CHARACTERS.length;
    let moved = false;
    if (tr.consumePress(keys.left)) moved = this.move(p, (p.index - 1 + n) % n);
    if (tr.consumePress(keys.right)) moved = this.move(p, (p.index + 1) % n) || moved;
    if (tr.consumePress(keys.up)) moved = this.move(p, (p.index - cols + n) % n) || moved;
    if (tr.consumePress(keys.down)) moved = this.move(p, (p.index + cols) % n) || moved;
    if (moved) {
      sfx.menuMove();
      this.refresh();
    }
  }

  private move(p: Picker, index: number): boolean {
    if (p.ready || p.cpu || p.index === index) return false;
    p.index = index;
    return true;
  }

  private confirm(p: Picker): void {
    if (p.ready || p.cpu) return;
    p.ready = true;
    sfx.unlock();
    sfx.menuSelect();
    sfx.kick(CONFIRM_KICK);
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
    sfx.menuBack();
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

  private createCards(): void {
    const { columns, cellW, cellH, gapPx, top } = SELECT.grid;
    const gridW = columns * cellW + (columns - 1) * gapPx;
    const left = (DISPLAY.width - gridW) / 2;
    const cardKey = panelTexture(this, cellW, cellH, 'card', SELECT.cardRadius);
    this.cards = CHARACTERS.map((c, i) => {
      const x = left + (i % columns) * (cellW + gapPx);
      const y = top + Math.floor(i / columns) * (cellH + gapPx);
      this.add.image(x + cellW / 2, y + cellH / 2, cardKey);
      // Kartın üst kısmında karakterin renginde hafif bir şerit.
      this.add
        .rectangle(
          x + cellW / 2,
          y + CARD_STRIPE / 2 + 2,
          cellW - SELECT.cardRadius * 2,
          CARD_STRIPE,
          c.palette.accent,
          CARD_STRIPE_ALPHA,
        )
        .setOrigin(0.5);
      const rig = new CharacterRig(this, c);
      rig.scale = SELECT.cardRigScale;
      this.add
        .text(
          x + cellW / 2,
          y + SELECT.nameY,
          upper(c.name),
          textStyle(SELECT.nameFontSizePx, '#ffffff', HUD.label.strokePx),
        )
        .setOrigin(0.5);
      const zone = this.add
        .zone(x, y, cellW, cellH)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true });
      zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
        const p = this.mousePicker();
        if (p && this.move(p, i)) {
          sfx.menuMove();
          this.refresh();
        }
      });
      zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        const p = this.mousePicker();
        if (!p) return;
        this.move(p, i);
        this.confirm(p);
      });
      return { x, y, rig };
    });
  }

  /** Fare, henüz hazır olmayan ilk insan oyuncuyu yönetir. */
  private mousePicker(): Picker | null {
    if (this.leaving) return null;
    return this.pickers.find((p) => !p.ready && !p.cpu) ?? null;
  }

  private createPanel(i: 0 | 1): PanelView {
    const pn = SELECT.panel;
    const x = i === 0 ? pn.marginX : DISPLAY.width - pn.marginX - pn.width;
    addPanel(this, x + pn.width / 2, pn.y + pn.height / 2, pn.width, pn.height, 'panel', pn.radius);
    const pad = pn.radius;
    // Büyük karakter panelin dış yanında, yazılar iç yanında.
    const rigX = i === 0 ? x + pn.rigInset : x + pn.width - pn.rigInset;
    const textX = i === 0 ? x + pn.textInset : x + pad;
    const tag = this.add.text(
      textX,
      pn.y + pad,
      '',
      textStyle(SELECT.fontSizePx, HUD.playerColors[i]),
    );
    const name = this.add.text(
      textX,
      pn.y + pad * 2 + SELECT.fontSizePx,
      '',
      textStyle(SELECT.titleFontSizePx * SELECT.panelNameScale, '#ffffff'),
    );
    const ready = this.add
      .text(
        i === 0 ? x + pn.width - pad : x + pn.width - pn.textInset + pad,
        pn.y + pad,
        '',
        textStyle(SELECT.fontSizePx, UI_THEME.text.gold[1]),
      )
      .setOrigin(1, 0);
    const sb = SELECT.statBar;
    const statTop = pn.y + pad * 2 + SELECT.fontSizePx * SELECT.statTopLines;
    const statLabels = STAT_KEYS.map((k, row) =>
      this.add.text(
        textX,
        statTop + row * sb.gapY,
        t(`select.${k}`),
        textStyle(SELECT.descFontSizePx, '#ffffff', DESC_STROKE),
      ),
    );
    const superY = statTop + STAT_KEYS.length * sb.gapY;
    const superName = this.add.text(
      textX,
      superY,
      '',
      textStyle(SELECT.fontSizePx, UI_THEME.text.gold[1]),
    );
    const desc = this.add.text(textX, superY + SELECT.fontSizePx * SELECT.descGapLines, '', {
      ...textStyle(SELECT.descFontSizePx, '#ffffff', DESC_STROKE),
      wordWrap: { width: pn.width - pn.textInset - pad },
    });
    return {
      x,
      textX,
      rigX,
      tag,
      name,
      superName,
      desc,
      statLabels,
      ready,
      rig: null,
      shownIndex: -1,
    };
  }

  private drawCursors(pulse: number): void {
    const g = this.cursors;
    g.clear();
    const { cellW, cellH } = SELECT.grid;
    this.pickers.forEach((p, i) => {
      const card = this.cards[p.index];
      if (!card) return;
      const inset = i === 1 && this.pickers[0].index === p.index ? SELECT.cursorInsetPx : 0;
      const color = Phaser.Display.Color.HexStringToColor(HUD.playerColors[i === 0 ? 0 : 1]).color;
      const alpha = p.ready ? 1 : SELECT.cursorIdleAlpha * (CURSOR_MIN + (1 - CURSOR_MIN) * pulse);
      g.lineStyle(SELECT.cursorWidthPx + CURSOR_GLOW, color, alpha * CURSOR_GLOW_ALPHA);
      g.strokeRoundedRect(
        card.x + inset - 2,
        card.y + inset - 2,
        cellW - inset * 2 + CURSOR_GROW * 2,
        cellH - inset * 2 + CURSOR_GROW * 2,
        SELECT.cardRadius + 2,
      );
      g.lineStyle(SELECT.cursorWidthPx, color, alpha);
      g.strokeRoundedRect(
        card.x + inset,
        card.y + inset,
        cellW - inset * 2,
        cellH - inset * 2,
        SELECT.cardRadius,
      );
    });
  }

  private refresh(): void {
    this.bars.clear();
    this.pickers.forEach((p, i) => {
      const c = CHARACTERS[p.index];
      if (c) this.updatePanel(i as 0 | 1, p, c);
    });
  }

  private updatePanel(i: 0 | 1, p: Picker, c: CharacterDef): void {
    const panel = this.panels[i];
    if (panel.shownIndex !== p.index) {
      panel.rig?.destroy();
      panel.rig = new CharacterRig(this, c);
      panel.rig.scale = SELECT.panelRigScale;
      panel.shownIndex = p.index;
    }
    panel.rig?.face.setPersistent(p.ready ? 'happy' : null);
    if (p.ready) panel.rig?.anim.onJump();
    const tag = p.cpu ? t('select.cpu') : `P${i + 1}`;
    panel.tag.setText(tag);
    panel.name.setText(upper(c.name)).setColor(hex(c.palette.accent));
    panel.ready.setText(p.ready ? t('select.ready') : '');
    panel.superName.setText(upper(t(`super.${c.superType}`)));
    panel.desc.setText(t(`superDesc.${c.superType}`));
    // İstatistik çubukları: 5 yuvarlak bölme.
    const sb = SELECT.statBar;
    const g = this.bars;
    STAT_KEYS.forEach((k, row) => {
      const label = panel.statLabels[row];
      if (!label) return;
      const x0 = label.x + sb.labelWidth;
      const y0 = label.y + (label.height - sb.height) / 2;
      const segW = sb.width / CHARACTER_STATS.statMax;
      for (let s = 0; s < CHARACTER_STATS.statMax; s++) {
        const on = s < c.stats[k];
        g.fillStyle(
          on ? c.palette.accent : UI_THEME.styles.dark.bottom,
          on ? 1 : SELECT.emptyStatAlpha,
        );
        g.fillRoundedRect(x0 + s * segW, y0, segW - STAT_GAP, sb.height, sb.height / 2);
        if (on) {
          g.fillStyle(WHITE, STAT_SHINE);
          g.fillRoundedRect(
            x0 + s * segW + 2,
            y0 + 1,
            segW - STAT_GAP - STAT_SHINE_INSET * 2,
            sb.height * STAT_SHINE_H,
            sb.height * STAT_SHINE_H * 0.5,
          );
        }
      }
    });
  }
}

const MAX_FRAME_MS = 100;
const HINT_PAD = 18;
const HINT_H = 30;
const CARD_HEAD_Y = 0.36;
const PANEL_HEAD_Y = 0.42;
const CARD_STRIPE = 6;
const CARD_STRIPE_ALPHA = 0.9;
const CURSOR_PULSE_HZ = 1.6;
const CURSOR_MIN = 0.55;
const CURSOR_GLOW = 6;
const CURSOR_GLOW_ALPHA = 0.3;
const CONFIRM_KICK = 0.6;
const STAT_GAP = 3;
const STAT_SHINE_INSET = 2;
const CURSOR_GROW = 2;
const DESC_STROKE = 3;
const STAT_SHINE = 0.35;
const STAT_SHINE_H = 0.4;
