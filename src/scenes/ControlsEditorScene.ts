import Phaser from 'phaser';
import { crowd } from '../audio/Crowd';
import { music } from '../audio/Music';
import { sfx } from '../audio/Sfx';
import { css } from '../art/canvas';
import { goldFill, textStyle } from '../art/uiArt';
import { CONTROLS, DISPLAY, MENU, TOUCH } from '../config/gameConfig';
import { CHARACTERS, type CharacterDef } from '../game/characters';
import { format, t, upper } from '../i18n';
import { KeyTracker } from '../input/KeyboardInput';
import {
  buttonRadius,
  clampToBounds,
  conflictOf,
  autoScale,
  DEFAULT_TOUCH_PREFS,
  defaultPlacements,
  effectivePlacements,
  GAME_BUTTONS,
  gameAnchor,
  hitRadius,
  insideBounds,
  mirrorPlacements,
  touchButtons,
  type ButtonPlacement,
  type GameButtonId,
  type Placements,
  type TouchPrefs,
} from '../input/touchLayout';
import { tapHaptic } from '../platform/haptics';
import { anchorShift, TOP_CENTER, TOP_LEFT, TOP_RIGHT } from '../platform/screenFrame';
import { getTouchPrefs, setTouchPrefs, snapScale } from '../save/touchPrefs';
import { DemoMatch } from '../ui/DemoMatch';
import { MenuOverlay } from '../ui/MenuOverlay';
import { PillButton } from '../ui/PillButton';
import { screenLayout, type ScreenLayout } from '../ui/ScreenLayout';
import { ringTexture, touchButtonTexture, touchLabel } from '../ui/touchButtonArt';
import { SceneKeys } from './sceneKeys';

interface EditView {
  readonly id: GameButtonId;
  img: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Image;
  readonly select: Phaser.GameObjects.Image;
}

interface Drag {
  readonly id: GameButtonId;
  /** Parmak ile buton merkezi arasındaki fark (tasarım px). */
  readonly dx: number;
  readonly dy: number;
  /** Bırakınca geri dönülecek son geçerli konum. */
  lastValid: ButtonPlacement;
}

/** Düzenleyiciden menüye dönüşte açılacak görünüm (MenuScene `MenuData`). */
export const EDITOR_RETURN = { view: 'controls', index: 0 } as const;

/**
 * Kontrol düzeni düzenleyicisi (Faz 2.3): Ayarlar → Kontroller → Dokunmatik düzen.
 *
 * Arka planda canlı demo maç; üstünde maçtaki gibi çizilen beş maç butonu. Buton sürüklenerek
 * taşınır, dokunularak seçilir; seçili butonun boyutu (%70–140), tüm butonların opaklığı ve solak
 * modu (hareket sağda, eylemler solda) üst satırdan değişir. Soluk halka butonun dokunma alanını
 * gösterir (görselden büyük: yakınına basmak da sayılır).
 *
 * Kurallar (`touchLayout.ts`): buton tasarım çerçevesinin içinde ve skor tabelasının altında kalır
 * (sürüklerken kırpılır); başka butona `minGapPx`'ten yakınsa kırmızı görünür ve bırakınca son
 * geçerli yerine döner. Düzen tasarım çerçevesinde saklandığı için her ekran oranında geçerlidir.
 * Kaydet → `setTouchPrefs`; İptal / Esc / Android geri → değişiklikler atılır. Kaydedilmemiş
 * değişiklik varsa önce sorulur (Kaydet ve çık / Kaydetmeden çık / Düzenlemeye dön; Faz 2.5);
 * onay açıkken geri tuşu onayı kapatır.
 */
export class ControlsEditorScene extends Phaser.Scene {
  private demo!: DemoMatch;
  private layout!: ScreenLayout;
  private tracker!: KeyTracker;
  /** Ekranda görünen konumlar (solak modu uygulanmış), tasarım çerçevesinde. */
  private shown!: Record<GameButtonId, ButtonPlacement>;
  private opacity: number = TOUCH.alpha;
  private leftHanded = false;
  private views: EditView[] = [];
  private selected: GameButtonId = 'kick';
  private drag: Drag | null = null;
  /** Oyuncu bir butonu taşıdı ya da büyüttü mü? Hayırsa ekrana göre büyüyen varsayılan saklanır. */
  private custom = false;
  /** ◀ ▶'nin hareket bölgesi (soluk çerçeve). */
  private moveZone!: Phaser.GameObjects.Rectangle;
  private sizeText!: Phaser.GameObjects.Text;
  private opacityText!: Phaser.GameObjects.Text;
  private handButton!: PillButton;
  private hint!: Phaser.GameObjects.Text;
  private hintTimer: Phaser.Time.TimerEvent | null = null;
  private leaving = false;
  /** Açılıştaki düzen (kaydedilmemiş değişiklik var mı?). */
  private initialPrefs = '';
  /** Kaydedilmemiş değişiklik onayı (Faz 2.5). */
  private prompt: MenuOverlay | null = null;

  constructor() {
    super(SceneKeys.ControlsEditor);
  }

  create(): void {
    this.leaving = false;
    this.drag = null;
    this.views = [];
    this.selected = 'kick';
    this.hintTimer = null;
    this.prompt = null;
    const prefs = getTouchPrefs();
    this.layout = screenLayout(this);
    const canonical = effectivePlacements(prefs, this.layout.pxPerDp);
    this.shown = { ...(prefs.leftHanded ? mirrorPlacements(canonical) : canonical) };
    this.custom = prefs.custom;
    this.opacity = prefs.opacity;
    this.leftHanded = prefs.leftHanded;
    this.initialPrefs = this.prefsKey();

    const pair: [CharacterDef, CharacterDef] = [
      CHARACTERS[0] ?? CHARACTERS[1],
      CHARACTERS[1] ?? CHARACTERS[0],
    ] as [CharacterDef, CharacterDef];
    this.demo = new DemoMatch(this, pair);
    this.layout
      .cover(this.add.rectangle(0, 0, DISPLAY.width, DISPLAY.height, MENU.demo.dimColor, 1))
      .setAlpha(TOUCH.editor.dimAlpha)
      .setDepth(TOUCH.editor.depth - 1);

    this.moveZone = this.add
      .rectangle(0, 0, 1, 1)
      .setOrigin(0)
      .setStrokeStyle(ZONE_LINE, TOUCH.fillColor, TOUCH.editor.hitZoneAlpha * 2)
      .setDepth(TOUCH.editor.depth);
    for (const id of GAME_BUTTONS) this.views.push(this.createView(id));
    this.createToolbar();
    this.layout.onChange(() => {
      this.placeAll();
    });

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onUp);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp);
    this.tracker = new KeyTracker(window, new Set<string>(CONTROLS.ui.menuBack)).attach();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.tracker.detach();
      this.prompt?.destroy();
      this.prompt = null;
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown);
      this.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove);
      this.input.off(Phaser.Input.Events.POINTER_UP, this.onUp);
      this.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp);
    });
    this.refreshAll();
    this.cameras.main.fadeIn(MENU.startFadeMs);
    music.play('menu');
    crowd.start();
  }

  override update(time: number, deltaMs: number): void {
    this.demo.update(time, deltaMs);
    crowd.setIntensity(this.demo.excitement * MENU.demo.crowdScale);
    if (this.leaving) return;
    if (this.prompt) {
      if (this.tracker.consumeAny(CONTROLS.ui.menuBack)) {
        sfx.menuBack();
        this.closePrompt();
      } else {
        this.prompt.update(this.tracker);
      }
      return;
    }
    if (this.tracker.consumeAny(CONTROLS.ui.menuBack)) this.cancel();
  }

  /** Düzenin karşılaştırma anahtarı (kayıtta saklanan her şey). */
  private prefsKey(): string {
    return JSON.stringify({ ...this.currentPrefs(), custom: this.custom });
  }

  /** İptal / geri: değişiklik yoksa hemen çık, varsa sor. */
  private cancel(): void {
    if (this.prefsKey() === this.initialPrefs) {
      this.leave(false);
      return;
    }
    this.drag = null;
    sfx.menuMove();
    this.prompt = new MenuOverlay(this, {
      title: t('editor.unsavedTitle'),
      lines: [t('editor.unsavedInfo')],
      // Araç çubuğunun (butonların 3 katman üstü) da üstünde: altındaki dokunuşları perde yutar.
      depth: TOUCH.editor.depth + PROMPT_LAYER,
      items: [
        {
          label: t('editor.keepEditing'),
          onSelect: () => {
            this.time.delayedCall(0, () => {
              this.closePrompt();
            });
          },
        },
        {
          label: t('editor.saveAndLeave'),
          onSelect: () => {
            this.leave(true);
          },
        },
        {
          label: t('editor.discard'),
          onSelect: () => {
            this.leave(false);
          },
        },
      ],
    });
  }

  private closePrompt(): void {
    this.prompt?.destroy();
    this.prompt = null;
    this.tracker.releaseAll();
  }

  // ───────────────────────────── Görünüm ─────────────────────────────

  private createView(id: GameButtonId): EditView {
    const d = TOUCH.editor.depth;
    const p = this.shown[id];
    const r = buttonRadius(id, p.scale);
    const zone = this.add
      .image(0, 0, ringTexture(this, hitRadius('action', r, this.layout.pxPerDp), 2))
      .setAlpha(TOUCH.editor.hitZoneAlpha)
      .setDepth(d);
    const img = this.add.image(0, 0, touchButtonTexture(this, id, r)).setDepth(d + 1);
    const label = touchLabel(this, id, 0, 0, p.scale).setDepth(d + 2);
    const select = this.add
      .image(0, 0, ringTexture(this, r + SELECT_PAD, SELECT_LINE))
      .setTint(TOUCH.editor.selectedColor)
      .setDepth(d + 2);
    return { id, img, label, zone, select };
  }

  /** Boyut değişince dokular yeniden (önbellekten) seçilir. */
  private rebuildView(v: EditView): void {
    const p = this.shown[v.id];
    const r = buttonRadius(v.id, p.scale);
    v.img.setTexture(touchButtonTexture(this, v.id, r));
    v.zone.setTexture(ringTexture(this, hitRadius('action', r, this.layout.pxPerDp), 2));
    v.select.setTexture(ringTexture(this, r + SELECT_PAD, SELECT_LINE));
    v.label.destroy();
    v.label = touchLabel(this, v.id, 0, 0, p.scale).setDepth(TOUCH.editor.depth + 2);
  }

  private shiftOf(id: GameButtonId): { x: number; y: number } {
    return anchorShift(this.layout.frame, gameAnchor(id, this.leftHanded));
  }

  /** Düzenleyicideki düzen, kayıt biçiminde (sağ el konumları). */
  private currentPrefs(): TouchPrefs {
    return {
      placements: this.leftHanded ? mirrorPlacements(this.shown) : { ...this.shown },
      custom: true,
      opacity: this.opacity,
      leftHanded: this.leftHanded,
    };
  }

  private placeAll(): void {
    const zone = touchButtons({
      prefs: this.currentPrefs(),
      frame: this.layout.frame,
      pxPerDp: this.layout.pxPerDp,
    }).find((b) => b.zone)?.zone;
    if (zone) this.moveZone.setPosition(zone.x, zone.y).setSize(zone.width, zone.height);
    for (const v of this.views) {
      const p = this.shown[v.id];
      const s = this.shiftOf(v.id);
      const x = p.x + s.x;
      const y = p.y + s.y;
      v.img.setPosition(x, y);
      v.label.setPosition(x, y);
      v.zone.setPosition(x, y);
      v.select.setPosition(x, y);
    }
  }

  private refreshAll(): void {
    this.placeAll();
    for (const v of this.views) {
      const invalid = this.drag?.id === v.id && conflictOf(this.shown, v.id) !== null;
      v.img
        .setAlpha(Math.max(this.opacity, MIN_EDIT_ALPHA))
        .setTint(invalid ? TOUCH.editor.invalidColor : TOUCH.fillColor);
      v.label.setAlpha(Math.min(1, this.opacity + LABEL_ALPHA_BOOST));
      v.select.setVisible(v.id === this.selected);
    }
    const scale = this.shown[this.selected].scale;
    this.sizeText.setText(
      `${t('editor.size')} ${format('editor.percent', { n: Math.round(scale * PERCENT) })}`,
    );
    this.opacityText.setText(
      `${t('editor.opacity')} ${format('editor.percent', { n: Math.round(this.opacity * PERCENT) })}`,
    );
    this.handButton.setLabel(
      `${t('editor.leftHanded')}: ${t(this.leftHanded ? 'settings.on' : 'settings.off')}`,
    );
  }

  private createToolbar(): void {
    const e = TOUCH.editor;
    const d = e.depth + TOOLBAR_LAYER;
    const h = e.buttonH;
    const fs = e.fontSizePx;
    const title = this.add
      .text(DISPLAY.width / 2, e.panelY, upper(t('editor.title')), textStyle(TITLE_FONT, '#ffffff'))
      .setOrigin(0.5)
      .setDepth(d);
    goldFill(title);
    this.layout.place(title, TOP_CENTER);
    new PillButton(
      this,
      EDGE_X,
      e.panelY,
      EDGE_W,
      h,
      t('editor.cancel'),
      fs,
      () => {
        this.leave(false);
      },
      d,
    ).anchorTo(TOP_LEFT);
    new PillButton(
      this,
      DISPLAY.width - EDGE_X,
      e.panelY,
      EDGE_W,
      h,
      t('editor.save'),
      fs,
      () => {
        this.leave(true);
      },
      d,
    ).anchorTo(TOP_RIGHT);

    const row = e.rowY;
    const small = (x: number, label: string, fn: () => void): void => {
      new PillButton(this, x, row, SMALL_W, h, label, STEP_FONT, fn, d).anchorTo(TOP_CENTER);
    };
    const text = (x: number): Phaser.GameObjects.Text => {
      const tx = this.add
        .text(x, row, '', textStyle(fs, '#ffffff', TEXT_STROKE))
        .setOrigin(0.5)
        .setDepth(d);
      this.layout.place(tx, TOP_CENTER);
      return tx;
    };
    small(SIZE_X - STEP_DX, '−', () => {
      this.resize(-1);
    });
    this.sizeText = text(SIZE_X);
    small(SIZE_X + STEP_DX, '+', () => {
      this.resize(1);
    });
    small(OPACITY_X - STEP_DX, '−', () => {
      this.changeOpacity(-1);
    });
    this.opacityText = text(OPACITY_X);
    small(OPACITY_X + STEP_DX, '+', () => {
      this.changeOpacity(1);
    });
    this.handButton = new PillButton(
      this,
      HAND_X,
      row,
      HAND_W,
      h,
      '',
      fs,
      () => {
        this.toggleHand();
      },
      d,
    ).anchorTo(TOP_CENTER);
    new PillButton(
      this,
      RESET_X,
      row,
      RESET_W,
      h,
      t('editor.reset'),
      fs,
      () => {
        this.reset();
      },
      d,
    ).anchorTo(TOP_CENTER);

    this.hint = this.add
      .text(
        DISPLAY.width / 2,
        e.hintY,
        t('editor.hint'),
        textStyle(e.hintFontSizePx, '#ffffff', TEXT_STROKE),
      )
      .setOrigin(0.5)
      .setDepth(e.depth - 1);
    this.layout.place(this.hint, TOP_CENTER);
  }

  private flashHint(key: 'editor.blocked'): void {
    this.hint.setText(t(key)).setColor(css(TOUCH.editor.invalidColor));
    this.hintTimer?.remove();
    this.hintTimer = this.time.delayedCall(HINT_MS, () => {
      this.hint.setText(t('editor.hint')).setColor('#ffffff');
    });
    sfx.menuBack();
  }

  // ───────────────────────────── Dokunma ─────────────────────────────

  /** Dünya koordinatındaki noktaya en yakın buton (görsel yarıçap + pay içinde). */
  private buttonAt(x: number, y: number): GameButtonId | null {
    let best: GameButtonId | null = null;
    let bestD = Infinity;
    for (const id of GAME_BUTTONS) {
      const p = this.shown[id];
      const s = this.shiftOf(id);
      const d = Math.hypot(x - (p.x + s.x), y - (p.y + s.y));
      if (d <= buttonRadius(id, p.scale) + PICK_PAD && d < bestD) {
        best = id;
        bestD = d;
      }
    }
    return best;
  }

  private readonly onDown = (
    pointer: Phaser.Input.Pointer,
    over: Phaser.GameObjects.GameObject[],
  ): void => {
    if (this.leaving || over.length > 0 || this.drag) return;
    const id = this.buttonAt(pointer.worldX, pointer.worldY);
    if (!id) return;
    const p = this.shown[id];
    const s = this.shiftOf(id);
    this.selected = id;
    this.drag = {
      id,
      dx: pointer.worldX - s.x - p.x,
      dy: pointer.worldY - s.y - p.y,
      lastValid: p,
    };
    tapHaptic();
    sfx.menuMove();
    this.refreshAll();
  };

  private readonly onMove = (pointer: Phaser.Input.Pointer): void => {
    const drag = this.drag;
    if (!drag || !pointer.isDown) return;
    const s = this.shiftOf(drag.id);
    const p = this.shown[drag.id];
    const r = buttonRadius(drag.id, p.scale);
    const c = clampToBounds(pointer.worldX - s.x - drag.dx, pointer.worldY - s.y - drag.dy, r);
    if (c.x !== p.x || c.y !== p.y) this.custom = true;
    this.shown[drag.id] = { x: c.x, y: c.y, scale: p.scale };
    if (conflictOf(this.shown, drag.id) === null) drag.lastValid = this.shown[drag.id];
    this.refreshAll();
  };

  private readonly onUp = (): void => {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    if (conflictOf(this.shown, drag.id) !== null) {
      this.shown[drag.id] = drag.lastValid;
      this.flashHint('editor.blocked');
    }
    this.refreshAll();
  };

  // ───────────────────────────── Araç çubuğu ─────────────────────────────

  private resize(dir: 1 | -1): void {
    const id = this.selected;
    const p = this.shown[id];
    const scale = snapScale(p.scale + dir * TOUCH.editor.scaleStep);
    if (scale === p.scale) return;
    const r = buttonRadius(id, scale);
    const pos = insideBounds(p.x, p.y, r) ? p : { ...p, ...clampToBounds(p.x, p.y, r) };
    const next: Placements = { ...this.shown, [id]: { x: pos.x, y: pos.y, scale } };
    if (conflictOf(next, id) !== null) {
      this.flashHint('editor.blocked');
      return;
    }
    this.shown[id] = next[id];
    this.custom = true;
    const v = this.views.find((x) => x.id === id);
    if (v) this.rebuildView(v);
    tapHaptic();
    this.refreshAll();
  }

  private changeOpacity(dir: 1 | -1): void {
    const levels: readonly number[] = TOUCH.opacityLevels;
    const i = levels.indexOf(this.opacity);
    const next = levels[Math.min(levels.length - 1, Math.max(0, (i < 0 ? 1 : i) + dir))];
    if (next === undefined || next === this.opacity) return;
    this.opacity = next;
    tapHaptic();
    this.refreshAll();
  }

  private toggleHand(): void {
    this.leftHanded = !this.leftHanded;
    this.shown = { ...mirrorPlacements(this.shown) };
    // Ayna ◀ ile ▶'yi yer değiştirir: boyutları da onlarla gider, dokular yenilenir.
    for (const v of this.views) this.rebuildView(v);
    tapHaptic();
    this.refreshAll();
  }

  private reset(): void {
    const defaults = defaultPlacements(autoScale(this.layout.pxPerDp));
    this.custom = false;
    this.shown = { ...(this.leftHanded ? mirrorPlacements(defaults) : defaults) };
    this.opacity = DEFAULT_TOUCH_PREFS.opacity;
    for (const v of this.views) this.rebuildView(v);
    tapHaptic();
    this.refreshAll();
  }

  private leave(save: boolean): void {
    if (this.leaving) return;
    this.leaving = true;
    if (save) {
      setTouchPrefs({
        ...this.currentPrefs(),
        custom: this.custom,
      });
    } else {
      sfx.menuBack();
    }
    this.cameras.main.fadeOut(MENU.startFadeMs);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SceneKeys.Menu, EDITOR_RETURN);
    });
  }
}

const PERCENT = 100;
const ZONE_LINE = 2;
const TEXT_STROKE = 3;
/** Araç çubuğu butonların (3 katman: alan, buton, yazı) üstünde. */
const TOOLBAR_LAYER = 3;
/** Kaydedilmemiş değişiklik onayı araç çubuğunun da üstünde. */
const PROMPT_LAYER = 10;
const SELECT_PAD = 8;
const SELECT_LINE = 4;
const PICK_PAD = 14;
const MIN_EDIT_ALPHA = 0.45;
const LABEL_ALPHA_BOOST = 0.55;
const HINT_MS = 1800;
const TITLE_FONT = 30;
const STEP_FONT = 26;
const EDGE_X = 104;
const EDGE_W = 170;
const SMALL_W = 52;
const STEP_DX = 108;
const SIZE_X = 300;
const OPACITY_X = 600;
const HAND_X = 870;
const HAND_W = 220;
const RESET_X = 1060;
const RESET_W = 140;
