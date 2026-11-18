import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { css, hex, makeCanvasTexture } from '../art/canvas';
import { STAGE_KEYS } from '../art/stadiumArt';
import { addPanel, goldFill, panelTexture, textStyle } from '../art/uiArt';
import {
  CHARACTER_STATS,
  CONTROLS,
  DISPLAY,
  HUD,
  KICK,
  MENU,
  PAD_CODES,
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
import { createTournament, roundDifficulties, setSavedTournament } from '../game/tournament';
import { format, t, upper } from '../i18n';
import { KeyTracker } from '../input/KeyboardInput';
import { getProgress, isUnlocked, nextUnlock } from '../save/progress';
import { CharacterRig, type RigPose } from '../ui/CharacterRig';
import { PillButton } from '../ui/PillButton';
import { StadiumView } from '../ui/StadiumView';
import { SuperPreview } from '../ui/SuperPreview';
import { sessionQuality, type QualityLevel } from '../fx/feel';
import { SceneKeys } from './sceneKeys';

/** Sık kullanılan renk. */
const WHITE = 0xffffff;

type Text = Phaser.GameObjects.Text;

/**
 * Bir oyuncunun seçim durumu. `auto`: insan kontrol etmez (CPU rakibi, antrenman kuklası ya da
 * turnuvada ödül paneli). `index` −1 → panel karakter yerine bilgi gösterir.
 */
interface Picker {
  index: number;
  ready: boolean;
  readonly auto: boolean;
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
  readonly preview: SuperPreview;
  rig: CharacterRig | null;
  shownIndex: number;
}

const [PAD1, PAD2] = PAD_CODES;

/** Yön tuşları: P1 (A/D/W/S + 1. kol) ve P2 (oklar + 2. kol). */
const KEYS = {
  p1: {
    left: [CONTROLS.p1.left, PAD1.left],
    right: [CONTROLS.p1.right, PAD1.right],
    up: [CONTROLS.p1.jump, PAD1.up],
    down: ['KeyS', PAD1.down],
  },
  p2: {
    left: [CONTROLS.p2.left, PAD2.left],
    right: [CONTROLS.p2.right, PAD2.right],
    up: [CONTROLS.p2.jump, PAD2.up],
    down: ['ArrowDown', PAD2.down],
  },
  confirm1: [CONTROLS.p1.kick, PAD1.a, PAD1.start],
  confirm2: [CONTROLS.p2.kick, 'NumpadEnter', PAD2.a, PAD2.start],
} as const;

interface NavKeys {
  readonly left: readonly string[];
  readonly right: readonly string[];
  readonly up: readonly string[];
  readonly down: readonly string[];
}

const STAT_KEYS = ['speed', 'jump', 'kick', 'head'] as const;

function savedIndex(key: string, fallback: number): number {
  const id = storage.get(key);
  const i = isCharacterId(id) ? CHARACTERS.findIndex((c) => c.id === id) : -1;
  return i >= 0 && isUnlocked(CHARACTERS[i]?.id ?? 'kor') ? i : fallback;
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

/** Rastgele bir açık karakter (`except` dışında). */
function randomUnlocked(except: number): number {
  const choices = CHARACTERS.map((_, i) => i).filter(
    (i) => i !== except && isUnlocked(CHARACTERS[i]?.id ?? 'kor'),
  );
  return choices[Math.floor(Math.random() * choices.length)] ?? 0;
}

/**
 * Karakter seçimi (Faz 4–6): 5×2 kart ızgarası (her kartta canlı küçük karakter; kilitli kartlar
 * karartılmış, kilitli ve seçilemez), altta iki panel — büyük karakter, isim, 5 bölmeli istatistik
 * çubukları, süper şutun adı ve açıklaması, gerçek simülasyondan kaydedilmiş süper şut önizlemesi.
 *
 * - **2 Oyuncu:** iki imleç aynı anda (P1: A/D/W/S + Space ya da 1. kol; P2: oklar + Enter ya da
 *   2. kol). Fare/dokunmatik henüz hazır olmayan ilk oyuncuyu yönetir.
 * - **Hızlı Maç:** insan iki tuş takımıyla (ve iki kolla) seçer; CPU kalan açık karakterlerden
 *   rastgele birini alır. **Antrenman:** aynı, ikinci panel kukla rakip.
 * - **Turnuva:** ikinci panel ödülü (sıradaki kilitli karakter) gösterir; seçimle turnuva kurulur.
 *
 * Esc/Backspace/B ya da "Geri": hazırı geri al, yoksa ana menü.
 */
export class CharacterSelectScene extends Phaser.Scene {
  private setup!: MatchSetup;
  private tracker!: KeyTracker;
  private pickers!: [Picker, Picker];
  private cursors!: Phaser.GameObjects.Graphics;
  private cards: { x: number; y: number; rig: CharacterRig }[] = [];
  /** Kilitli kartların kilit simgeleri (karta göre). */
  private readonly locks = new Map<number, Phaser.GameObjects.Image>();
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
    this.locks.clear();
    this.setup = resolveMatchSetup(data, { cpu: null, cpu1: null, seed: null });
    const mode = this.setup.mode;
    const solo = mode !== 'versus';
    const p1Index = savedIndex(STORAGE.keys.character1, 0);
    const reward = mode === 'tournament' ? nextUnlock(getProgress()) : null;
    const p2Index =
      mode === 'tournament'
        ? CHARACTERS.findIndex((c) => c.id === reward)
        : savedIndex(STORAGE.keys.character2, 1);
    this.pickers = [
      { index: p1Index, ready: false, auto: false },
      { index: p2Index, ready: false, auto: solo },
    ];
    const { ui } = CONTROLS;
    this.tracker = new KeyTracker(
      window,
      new Set<string>([
        ...Object.values(KEYS.p1).flat(),
        ...Object.values(KEYS.p2).flat(),
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
    const b = SELECT.back;
    new PillButton(
      this,
      b.x,
      b.y,
      b.width,
      b.height,
      t('menu.back'),
      b.fontSizePx,
      () => {
        if (!this.leaving) this.back();
      },
      1,
    );
    this.createCards();
    this.cursors = this.add.graphics().setDepth(2);
    this.panels = [this.createPanel(0), this.createPanel(1)];
    // Çubuklar panellerin üstünde çizilmeli.
    this.bars = this.add.graphics();
    const hint = this.add
      .text(
        DISPLAY.width / 2,
        SELECT.hintY,
        t(solo ? 'select.hintCpu' : 'select.hintVersus'),
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
    // Tek insanlı modlarda insan iki tuş takımını (ve iki kolu) da kullanır.
    this.navigate(p1, KEYS.p1);
    if (p2.auto) this.navigate(p1, KEYS.p2);
    else this.navigate(p2, KEYS.p2);
    if (tr.consumeAny(KEYS.confirm1)) this.confirm(p1);
    if (tr.consumeAny(KEYS.confirm2)) this.confirm(p2.auto ? p1 : p2);
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
      panel.preview.update(dt);
      if (!panel.rig || !def) return;
      panel.rig.face.update(dt, { frozen: false, straining: false, armed: false });
      const pose = standPose(
        def,
        panel.rigX,
        SELECT.panel.y + SELECT.panel.height * SELECT.panel.headYRatio,
        i === 0 ? 1 : -1,
      );
      panel.rig.update(dt, pose, look, seconds);
    });
    // İmleçler: hazır olmayan imleç hafifçe nabız atar.
    const pulse = 0.5 + 0.5 * Math.sin(seconds * CURSOR_PULSE_HZ * Math.PI * 2);
    this.drawCursors(pulse);
  }

  private navigate(p: Picker, keys: NavKeys): void {
    const tr = this.tracker;
    const cols = SELECT.grid.columns;
    const n = CHARACTERS.length;
    let moved = false;
    if (tr.consumeAny(keys.left)) moved = this.move(p, (p.index - 1 + n) % n);
    if (tr.consumeAny(keys.right)) moved = this.move(p, (p.index + 1) % n) || moved;
    if (tr.consumeAny(keys.up)) moved = this.move(p, (p.index - cols + n) % n) || moved;
    if (tr.consumeAny(keys.down)) moved = this.move(p, (p.index + cols) % n) || moved;
    if (moved) {
      sfx.menuMove();
      this.refresh();
    }
  }

  private move(p: Picker, index: number): boolean {
    if (p.ready || p.auto || p.index === index) return false;
    p.index = index;
    return true;
  }

  private confirm(p: Picker): void {
    if (p.ready || p.auto) return;
    const def = CHARACTERS[p.index];
    if (!def || !isUnlocked(def.id)) {
      this.refuse(p.index);
      return;
    }
    p.ready = true;
    sfx.unlock();
    sfx.menuSelect();
    sfx.kick(CONFIRM_KICK);
    const other = this.pickers[1];
    if (other.auto && p === this.pickers[0]) {
      // CPU/kukla, insanın seçmediği açık karakterlerden rastgele birini alır (yalnızca arayüz;
      // maç determinizmini etkilemez). Turnuvada ödül paneli olduğu gibi kalır.
      if (this.setup.mode !== 'tournament') other.index = randomUnlocked(p.index);
      other.ready = true;
    }
    this.refresh();
    if (this.pickers.every((x) => x.ready)) this.start();
  }

  /** Kilitli karta onay: "olmaz" sesi ve kilidin kısa sarsılması. */
  private refuse(index: number): void {
    sfx.menuBack();
    const lock = this.locks.get(index);
    if (!lock) return;
    const lk = SELECT.locked;
    this.tweens.killTweensOf(lock);
    lock.setX(lock.getData('x') as number);
    this.tweens.add({
      targets: lock,
      x: `+=${lk.shakePx}`,
      duration: lk.shakeMs,
      yoyo: true,
      repeat: 2,
    });
  }

  private back(): void {
    const [p1, p2] = this.pickers;
    sfx.menuBack();
    if (p2.ready && !p2.auto) {
      p2.ready = false;
    } else if (p1.ready) {
      p1.ready = false;
      if (p2.auto) p2.ready = false;
    } else {
      this.leave(SceneKeys.Menu, undefined);
      return;
    }
    this.refresh();
  }

  private start(): void {
    const [p1, p2] = this.pickers;
    const id1 = CHARACTERS[p1.index]?.id ?? 'kor';
    storage.set(STORAGE.keys.character1, id1);
    this.leaving = true;
    if (this.setup.mode === 'tournament') {
      const reward = nextUnlock(getProgress());
      const state = createTournament({
        player: id1,
        seed: crypto.getRandomValues(new Uint32Array(1))[0] ?? 0,
        difficulty: this.setup.difficulty,
        reward,
      });
      setSavedTournament(state);
      this.time.delayedCall(SELECT.startDelayMs, () => {
        this.leave(SceneKeys.Tournament, { fresh: true });
      });
      return;
    }
    const id2 = CHARACTERS[p2.index]?.id ?? 'ayaz';
    if (!p2.auto) storage.set(STORAGE.keys.character2, id2);
    const setup: MatchSetup = {
      ...this.setup,
      characters: [id1, id2] as [CharacterId, CharacterId],
    };
    this.time.delayedCall(SELECT.startDelayMs, () => {
      this.leave(SceneKeys.Match, setup);
    });
  }

  private leave(key: string, data: object | undefined): void {
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
    const lockKey = this.lockTexture();
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
      if (!isUnlocked(c.id)) this.locks.set(i, this.addLockOverlay(x, y, lockKey));
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
        if (this.move(p, i)) this.refresh();
        this.confirm(p);
      });
      return { x, y, rig };
    });
  }

  /** Kilitli kart: koyu perde, kilit ve "KİLİTLİ". */
  private addLockOverlay(x: number, y: number, lockKey: string): Phaser.GameObjects.Image {
    const { cellW, cellH } = SELECT.grid;
    const lk = SELECT.locked;
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(SELECT.dimColor, lk.dimAlpha);
    g.fillRoundedRect(x + 2, y + 2, cellW - LOCK_INSET, cellH - LOCK_INSET, SELECT.cardRadius);
    const lock = this.add.image(x + cellW / 2, y + cellH * LOCK_Y, lockKey).setDepth(1);
    lock.setData('x', lock.x);
    this.add
      .text(
        x + cellW / 2,
        y + cellH * LOCK_TEXT_Y,
        t('select.locked'),
        textStyle(lk.fontSizePx, UI_THEME.text.gold[1], DESC_STROKE),
      )
      .setOrigin(0.5)
      .setDepth(1);
    return lock;
  }

  private lockTexture(): string {
    const key = 'ui-lock';
    const s = SELECT.locked.iconSize;
    makeCanvasTexture(this, key, s, s, (ctx) => {
      const gold = css(Phaser.Display.Color.HexStringToColor(UI_THEME.text.gold[1]).color);
      ctx.lineWidth = s * LOCK_LINE;
      ctx.strokeStyle = gold;
      ctx.beginPath();
      ctx.arc(s / 2, s * LOCK_SHACKLE_Y, s * LOCK_SHACKLE_R, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = gold;
      ctx.fillRect(s * LOCK_BODY_X, s * LOCK_SHACKLE_Y, s * (1 - LOCK_BODY_X * 2), s * LOCK_BODY_H);
      ctx.fillStyle = css(SELECT.dimColor);
      ctx.beginPath();
      ctx.arc(s / 2, s * LOCK_HOLE_Y, s * LOCK_HOLE_R, 0, Math.PI * 2);
      ctx.fill();
    });
    return key;
  }

  /** Fare/dokunmatik, henüz hazır olmayan ilk insan oyuncuyu yönetir. */
  private mousePicker(): Picker | null {
    if (this.leaving) return null;
    return this.pickers.find((p) => !p.ready && !p.auto) ?? null;
  }

  private createPanel(i: 0 | 1): PanelView {
    const pn = SELECT.panel;
    const x = i === 0 ? pn.marginX : DISPLAY.width - pn.marginX - pn.width;
    addPanel(this, x + pn.width / 2, pn.y + pn.height / 2, pn.width, pn.height, 'panel', pn.radius);
    const pad = pn.radius;
    // Büyük karakter ve önizleme panelin dış yanında, yazılar iç yanında.
    const rigX = i === 0 ? x + pn.rigInset : x + pn.width - pn.rigInset;
    const textX = i === 0 ? x + pn.textInset : x + pad;
    const pv = SELECT.preview;
    const previewX = i === 0 ? x + pv.insetX : x + pn.width - pv.insetX - pv.width;
    const preview = new SuperPreview(this, previewX, pn.y + pv.top, i === 1, 0);
    const tag = this.add.text(
      textX,
      pn.y + pad,
      '',
      textStyle(SELECT.fontSizePx, HUD.playerColors[i]),
    );
    const name = this.add.text(
      textX,
      pn.y + pad + SELECT.fontSizePx + NAME_GAP,
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
      .setOrigin(i === 0 ? 1 : 0, 0);
    const sb = SELECT.statBar;
    const statTop = pn.y + pad + SELECT.fontSizePx * SELECT.statTopLines;
    const statLabels = STAT_KEYS.map((k, row) =>
      this.add.text(
        textX,
        statTop + row * sb.gapY,
        t(`select.${k}`),
        textStyle(SELECT.descFontSizePx, '#ffffff', DESC_STROKE),
      ),
    );
    const superY = statTop + STAT_KEYS.length * sb.gapY + SUPER_GAP;
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
      preview,
      rig: null,
      shownIndex: -1,
    };
  }

  private drawCursors(pulse: number): void {
    const g = this.cursors;
    g.clear();
    const { cellW, cellH } = SELECT.grid;
    this.pickers.forEach((p, i) => {
      // Turnuvada ödül paneli bir imleç değildir.
      if (i === 1 && this.setup.mode === 'tournament') return;
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
      this.updatePanel(i as 0 | 1, p, CHARACTERS[p.index] ?? null);
    });
  }

  /** Paneldeki etiket: P1/P2, CPU · zorluk, KUKLA ya da ÖDÜL. */
  private panelTag(i: 0 | 1): string {
    if (i === 0) return t('tag.p1');
    switch (this.setup.mode) {
      case 'cpu':
        return format('player.cpu', { level: t(`difficulty.${this.setup.difficulty}`) });
      case 'training':
        return t('select.dummy');
      case 'tournament':
        return t('select.reward');
      case 'versus':
        return t('tag.p2');
    }
  }

  private updatePanel(i: 0 | 1, p: Picker, c: CharacterDef | null): void {
    const panel = this.panels[i];
    const tournamentInfo = i === 1 && this.setup.mode === 'tournament';
    if (panel.shownIndex !== p.index) {
      panel.rig?.destroy();
      panel.rig = null;
      if (c) {
        panel.rig = new CharacterRig(this, c);
        panel.rig.scale = SELECT.panelRigScale;
      }
      panel.shownIndex = p.index;
    }
    panel.rig?.face.setPersistent(p.ready && !tournamentInfo ? 'happy' : null);
    if (p.ready && !tournamentInfo) panel.rig?.anim.onJump();
    panel.tag.setText(c || !tournamentInfo ? this.panelTag(i) : t('select.trophy'));
    panel.ready.setText(p.ready && !tournamentInfo ? t('select.ready') : '');
    panel.preview.setVisible(c !== null);
    for (const label of panel.statLabels) label.setVisible(c !== null);
    if (!c) {
      // Turnuva, her şey açık: ödül yerine kupa ve tur zorlukları.
      const [r1, r2, r3] = roundDifficulties(this.setup.difficulty).map((d) =>
        t(`difficulty.${d}`),
      );
      panel.name.setText(upper(t('tournament.title'))).setColor(UI_THEME.text.gold[1]);
      panel.superName.setText('');
      panel.desc.setText(
        format('select.allUnlocked', { r1: r1 ?? '', r2: r2 ?? '', r3: r3 ?? '' }),
      );
      return;
    }
    panel.preview.setCharacter(c);
    const locked = !isUnlocked(c.id);
    panel.name.setText(upper(c.name)).setColor(hex(c.palette.accent));
    panel.superName.setText(upper(t(`super.${c.superType}`)));
    if (tournamentInfo) {
      const [r1, r2, r3] = roundDifficulties(this.setup.difficulty).map((d) =>
        t(`difficulty.${d}`),
      );
      panel.desc.setText(format('select.rewardDesc', { r1: r1 ?? '', r2: r2 ?? '', r3: r3 ?? '' }));
    } else if (locked) {
      panel.desc.setText(`${t('select.locked')} · ${t('select.lockedHint')}`);
    } else {
      panel.desc.setText(t(`superDesc.${c.superType}`));
    }
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
const NAME_GAP = 6;
const SUPER_GAP = 4;
const LOCK_Y = 0.4;
const LOCK_TEXT_Y = 0.62;
const LOCK_LINE = 0.12;
const LOCK_SHACKLE_Y = 0.45;
const LOCK_SHACKLE_R = 0.22;
const LOCK_BODY_X = 0.18;
const LOCK_BODY_H = 0.45;
const LOCK_HOLE_Y = 0.66;
const LOCK_HOLE_R = 0.07;
const LOCK_INSET = 4;
