import Phaser from 'phaser';
import { crowd } from '../audio/Crowd';
import { music } from '../audio/Music';
import { sfx } from '../audio/Sfx';
import { goldFill, panelTexture, textStyle } from '../art/uiArt';
import {
  AI_DIFFICULTIES,
  CONTROLS,
  DISPLAY,
  MENU,
  OVERLAY,
  UI_THEME,
  type AiDifficulty,
} from '../config/gameConfig';
import { CHARACTERS, type CharacterDef } from '../game/characters';
import { DEFAULT_MATCH_SETUP, type MatchMode, type MatchSetup } from '../game/matchSetup';
import { getSavedTournament } from '../game/tournament';
import { format, getLanguage, setLanguage, t, upper } from '../i18n';
import { KeyTracker } from '../input/KeyboardInput';
import { setInMatch } from '../platform/fullscreen';
import { tapHaptic } from '../platform/haptics';
import {
  cycleOption,
  EFFECT_LEVELS,
  getSettings,
  MATCH_DURATIONS,
  updateSettings,
} from '../save/gameSettings';
import { getProgress } from '../save/progress';
import { DemoMatch } from '../ui/DemoMatch';
import { HelpPanel, type HelpPage } from '../ui/HelpPanel';
import { volumeMenuItems } from '../ui/settingsMenu';
import { devHooks } from '../dev/hooks';
import { TextMenu, type TextMenuItem } from '../ui/TextMenu';
import { SceneKeys } from './sceneKeys';
import { BOTTOM_CENTER, BOTTOM_LEFT, BOTTOM_RIGHT } from '../platform/screenFrame';
import { screenLayout } from '../ui/ScreenLayout';

/** Menünün açılacağı görünüm (dil değişince ya da alt ekrandan dönüşte). */
export interface MenuData {
  readonly view?: 'main' | 'settings' | 'controls' | 'help';
  /** Seçili gelecek öğe. */
  readonly index?: number;
  readonly helpPage?: HelpPage;
}

/** İki farklı rastgele karakter (demo maç). */
function randomPair(): [CharacterDef, CharacterDef] {
  const a = Math.floor(Math.random() * CHARACTERS.length);
  const b = (a + 1 + Math.floor(Math.random() * (CHARACTERS.length - 1))) % CHARACTERS.length;
  return [CHARACTERS[a] ?? CHARACTERS[0], CHARACTERS[b] ?? CHARACTERS[1]] as [
    CharacterDef,
    CharacterDef,
  ];
}

/** Ana menü öğelerinin sırası. */
const MAIN = { quick: 0, versus: 1, tournament: 2, training: 3, settings: 4, help: 5 } as const;
/** Ayarlar öğelerinin sırası. */
const SET = { language: 9, controls: 10 } as const;
/** Kontroller alt menüsünün sırası. */
const CTRL = { scheme: 3 } as const;

/**
 * Ana menü (Faz 6): arka planda canlı AI vs AI demo maçı (gerçek simülasyon ve çizim), altın başlık
 * ve altı seçenek — Hızlı Maç, 2 Oyuncu, Turnuva, Antrenman, Ayarlar, Nasıl Oynanır. Ayarlar alt
 * menüsü (zorluk, maç süresi, ses düzeyleri, ekran sarsıntısı, dil, kontrol şeması) ve sayfalı
 * yardım paneli aynı sahnede, demo maçın üstünde açılır. Sol altta istatistikler. Klavye, fare,
 * dokunmatik ve gamepad ile kullanılır.
 */
export class MenuScene extends Phaser.Scene {
  private tracker!: KeyTracker;
  private demo!: DemoMatch;
  private menu: TextMenu | null = null;
  private help: HelpPanel | null = null;
  private view: 'main' | 'settings' | 'controls' | 'help' = 'main';
  private title!: Phaser.GameObjects.Text;
  private heading: Phaser.GameObjects.Text | null = null;
  private starting = false;
  /** Bir sonraki karede yapılacak görünüm değişimi bekliyor mu? */
  private pendingView = false;

  constructor() {
    super(SceneKeys.Menu);
  }

  create(data?: MenuData): void {
    const { width, height } = DISPLAY;
    this.starting = false;
    this.pendingView = false;
    this.menu = null;
    this.help = null;
    this.heading = null;
    setInMatch(false);

    const layout = screenLayout(this);
    this.demo = new DemoMatch(this, randomPair());
    layout
      .cover(this.add.rectangle(0, 0, width, height, MENU.demo.dimColor, MENU.demo.dimAlpha))
      .setDepth(MENU.uiDepth - 1);

    // Başlık: altın gradyan, kalın kontur, nefes alır.
    this.title = this.add
      .text(
        width / 2,
        height * MENU.title.yRatio,
        t('game.title'),
        textStyle(MENU.title.fontSizePx, '#ffffff', MENU.title.strokePx),
      )
      .setOrigin(0.5)
      .setDepth(MENU.uiDepth);
    goldFill(this.title);
    this.tweens.add({
      targets: this.title,
      scale: MENU.title.pulseScale,
      duration: MENU.title.pulseMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const { ui } = CONTROLS;
    this.tracker = new KeyTracker(
      window,
      new Set<string>([
        ...ui.menuUp,
        ...ui.menuDown,
        ...ui.menuConfirm,
        ...ui.menuBack,
        ...ui.menuLeft,
        ...ui.menuRight,
      ]),
    ).attach();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.tracker.detach();
      this.help?.destroy();
    });

    this.createFooter();
    const view = data?.view ?? 'main';
    if (view === 'settings') this.showSettings(data?.index ?? 0);
    else if (view === 'controls') this.showControls(data?.index ?? 0);
    else if (view === 'help') this.showHelp(data?.helpPage ?? 'rules', 'main');
    else this.showMain(data?.index ?? 0);

    this.cameras.main.fadeIn(MENU.startFadeMs);
    music.play('menu');
    crowd.start();
  }

  override update(time: number, deltaMs: number): void {
    this.demo.update(time, deltaMs);
    crowd.setIntensity(this.demo.excitement * MENU.demo.crowdScale);
    if (this.starting || this.pendingView) return;
    if (this.view === 'help') {
      this.help?.update(this.tracker);
      return;
    }
    if (this.view === 'settings' && this.tracker.consumeAny(CONTROLS.ui.menuBack)) {
      sfx.menuBack();
      this.showMain(MAIN.settings);
      return;
    }
    if (this.view === 'controls' && this.tracker.consumeAny(CONTROLS.ui.menuBack)) {
      sfx.menuBack();
      this.showSettings(SET.controls);
      return;
    }
    this.menu?.update(this.tracker);
  }

  // ───────────────────────────── Görünümler ─────────────────────────────

  private showMain(selected: number): void {
    const s = getSettings();
    const tournament = getSavedTournament();
    const active = tournament?.status === 'active';
    const items: TextMenuItem[] = [
      {
        label: t('menu.quickMatch'),
        onSelect: () => {
          this.toSelect('cpu', s.difficulty);
        },
      },
      {
        label: t('menu.twoPlayers'),
        onSelect: () => {
          this.toSelect('versus', s.difficulty);
        },
      },
      {
        label: active ? t('menu.tournamentContinue') : t('menu.tournament'),
        onSelect: () => {
          if (active) this.leave(SceneKeys.Tournament, {});
          else this.toSelect('tournament', s.difficulty);
        },
      },
      {
        label: t('menu.training'),
        onSelect: () => {
          this.toSelect('training', s.difficulty);
        },
      },
      {
        label: t('menu.settings'),
        onSelect: () => {
          this.later(() => {
            this.showSettings(0);
          });
        },
      },
      {
        label: t('menu.howToPlay'),
        onSelect: () => {
          this.later(() => {
            this.showHelp('rules', 'main');
          });
        },
      },
    ];
    this.view = 'main';
    this.setHeading(null);
    const st = MENU.items;
    this.setMenu(items, selected, DISPLAY.height * st.yRatio, {
      fontSizePx: st.fontSizePx,
      spacingPx: st.spacingPx,
      strokePx: st.strokePx,
      buttonWidth: st.buttonWidth,
    });
  }

  /** Ayarlar: zorluk, maç süresi, ses düzeyleri, sarsıntı, dil, kontrol şeması, geri. */
  private showSettings(selected: number): void {
    const toggle = (on: boolean): string => (on ? t('settings.on') : t('settings.off'));
    const row = (label: string, value: string): string => `${label}   ◄ ${value} ►`;
    const items: TextMenuItem[] = [
      {
        label: () => row(t('settings.difficulty'), t(`difficulty.${getSettings().difficulty}`)),
        onAdjust: (dir) => {
          updateSettings({
            difficulty: cycleOption<AiDifficulty>(AI_DIFFICULTIES, getSettings().difficulty, dir),
          });
        },
        onSelect: () => {
          updateSettings({
            difficulty: cycleOption<AiDifficulty>(AI_DIFFICULTIES, getSettings().difficulty, 1),
          });
        },
      },
      {
        label: () =>
          row(
            t('settings.duration'),
            format('settings.seconds', { n: getSettings().matchSeconds }),
          ),
        onAdjust: (dir) => {
          updateSettings({
            matchSeconds: cycleOption(MATCH_DURATIONS, getSettings().matchSeconds, dir),
          });
        },
        onSelect: () => {
          updateSettings({
            matchSeconds: cycleOption(MATCH_DURATIONS, getSettings().matchSeconds, 1),
          });
        },
      },
      {
        label: () => row(t('settings.replays'), toggle(getSettings().replays)),
        onAdjust: () => {
          updateSettings({ replays: !getSettings().replays });
        },
        onSelect: () => {
          updateSettings({ replays: !getSettings().replays });
        },
      },
      ...volumeMenuItems(() => undefined).slice(0, VOLUME_ITEMS),
      {
        label: () => row(t('settings.shake'), toggle(getSettings().screenShake)),
        onAdjust: () => {
          updateSettings({ screenShake: !getSettings().screenShake });
        },
        onSelect: () => {
          updateSettings({ screenShake: !getSettings().screenShake });
        },
      },
      {
        label: () => row(t('settings.effects'), t(`effects.${getSettings().effects}`)),
        onAdjust: (dir) => {
          updateSettings({ effects: cycleOption(EFFECT_LEVELS, getSettings().effects, dir) });
        },
        onSelect: () => {
          updateSettings({ effects: cycleOption(EFFECT_LEVELS, getSettings().effects, 1) });
        },
      },
      {
        label: () => row(t('settings.colorblind'), toggle(getSettings().colorblind)),
        onAdjust: () => {
          updateSettings({ colorblind: !getSettings().colorblind });
        },
        onSelect: () => {
          updateSettings({ colorblind: !getSettings().colorblind });
        },
      },
      {
        label: () => row(t('settings.language'), t('settings.languageName')),
        onAdjust: () => {
          this.toggleLanguage();
        },
        onSelect: () => {
          this.toggleLanguage();
        },
      },
      {
        label: t('settings.controlsMenu'),
        onSelect: () => {
          this.later(() => {
            this.showControls(0);
          });
        },
      },
      {
        label: t('menu.back'),
        onSelect: () => {
          this.later(() => {
            this.showMain(MAIN.settings);
          });
        },
      },
    ];
    this.view = 'settings';
    const st = MENU.settings;
    this.setHeading(t('settings.title'));
    this.setMenu(items, selected, st.top, {
      fontSizePx: st.fontSizePx,
      spacingPx: st.spacingPx,
      strokePx: st.strokePx,
      buttonWidth: st.buttonWidth,
      buttonHeight: st.buttonHeight,
    });
  }

  /**
   * Kontroller (Faz 2.3): dokunmatik düzen düzenleyicisi, titreşim, giriş gecikmesi göstergesi,
   * kontrol şeması (yardım sayfası), geri.
   */
  private showControls(selected: number): void {
    const toggle = (on: boolean): string => (on ? t('settings.on') : t('settings.off'));
    const row = (label: string, value: string): string => `${label}   ◄ ${value} ►`;
    const flip = (key: 'vibration' | 'latencyMeter'): void => {
      updateSettings({ [key]: !getSettings()[key] });
    };
    const items: TextMenuItem[] = [
      {
        label: t('settings.touchLayout'),
        onSelect: () => {
          this.leave(SceneKeys.ControlsEditor, {});
        },
      },
      {
        label: () => row(t('settings.vibration'), toggle(getSettings().vibration)),
        onAdjust: () => {
          flip('vibration');
          if (getSettings().vibration) tapHaptic();
        },
        onSelect: () => {
          flip('vibration');
          if (getSettings().vibration) tapHaptic();
        },
      },
      {
        label: () => row(t('settings.latencyMeter'), toggle(getSettings().latencyMeter)),
        onAdjust: () => {
          flip('latencyMeter');
        },
        onSelect: () => {
          flip('latencyMeter');
        },
      },
      {
        label: t('settings.controls'),
        onSelect: () => {
          this.later(() => {
            this.showHelp('controls', 'controls');
          });
        },
      },
      // Geliştirici derlemesinde (Faz 2.4): performans grafiği, dayanıklılık ve stres testleri.
      ...(devHooks.menuItems?.((setup) => {
        this.leave(SceneKeys.Match, setup);
      }) ?? []),
      {
        label: t('menu.back'),
        onSelect: () => {
          this.later(() => {
            this.showSettings(SET.controls);
          });
        },
      },
    ];
    this.view = 'controls';
    const st = MENU.settings;
    this.setHeading(t('settings.controlsMenu'));
    this.setMenu(items, selected, st.top, {
      fontSizePx: st.fontSizePx,
      spacingPx: st.spacingPx,
      strokePx: st.strokePx,
      buttonWidth: st.buttonWidth,
      buttonHeight: st.buttonHeight,
    });
  }

  private showHelp(page: HelpPage, returnTo: 'main' | 'settings' | 'controls'): void {
    this.menu?.destroy();
    this.menu = null;
    this.setHeading(null);
    this.title.setVisible(false);
    this.view = 'help';
    this.help?.destroy();
    this.help = new HelpPanel(this, page, MENU.uiDepth + 1, () => {
      this.help = null;
      if (returnTo === 'settings') this.showSettings(SET.controls);
      else if (returnTo === 'controls') this.showControls(CTRL.scheme);
      else this.showMain(MAIN.help);
    });
  }

  private setMenu(
    items: readonly TextMenuItem[],
    selected: number,
    y: number,
    style: {
      fontSizePx: number;
      spacingPx: number;
      strokePx: number;
      buttonWidth: number;
      buttonHeight?: number;
    },
  ): void {
    if (this.starting) return;
    this.menu?.destroy();
    this.menu = new TextMenu(this, DISPLAY.width / 2, y, items, {
      fontFamily: MENU.fontFamily,
      color: OVERLAY.items.color,
      selectedColor: OVERLAY.items.selectedColor,
      selectedScale: UI_THEME.button.selectedScale,
      depth: MENU.uiDepth + 1,
      ...style,
    });
    this.menu.select(selected);
  }

  /** Alt menü başlığı (büyük başlık gizlenir); null → ana menü başlığı. */
  private setHeading(text: string | null): void {
    this.heading?.destroy();
    this.heading = null;
    this.title.setVisible(text === null);
    if (text === null) return;
    const st = MENU.settings;
    this.heading = this.add
      .text(DISPLAY.width / 2, st.titleY, upper(text), textStyle(st.titleFontSizePx, '#ffffff'))
      .setOrigin(0.5)
      .setDepth(MENU.uiDepth + 1);
    goldFill(this.heading);
  }

  /**
   * Alt bilgi: gezinme ipucu hapı (alt orta), istatistikler (sol alt), sürüm (sağ alt); üçü de
   * ekranın alt kenarına sabitli (Faz 2.2).
   */
  private createFooter(): void {
    const { width, height } = DISPLAY;
    const d = MENU.uiDepth;
    const layout = screenLayout(this);
    const hint = this.add
      .text(
        width / 2,
        height * MENU.navHint.yRatio,
        t('menu.navHint'),
        textStyle(MENU.navHint.fontSizePx, '#ffffff', 2),
      )
      .setOrigin(0.5)
      .setDepth(d + 1);
    const hintBack = this.add
      .image(
        hint.x,
        hint.y,
        panelTexture(this, hint.width + HINT_PAD * 2, HINT_H, 'dark', HINT_H / 2),
      )
      .setAlpha(MENU.navHint.alpha)
      .setDepth(d);
    layout.place(hint, BOTTOM_CENTER);
    layout.place(hintBack, BOTTOM_CENTER);
    const st = MENU.stats;
    const s = getProgress().stats;
    const stats = this.add
      .text(
        st.marginPx + st.padX,
        height - st.marginPx - st.height / 2,
        format('menu.stats', { m: s.matches, w: s.wins, g: s.goals, c: s.tournamentsWon }),
        textStyle(st.fontSizePx, '#ffffff', 2),
      )
      .setOrigin(0, 0.5)
      .setDepth(d + 1);
    const statsBack = this.add
      .image(
        st.marginPx + (stats.width + st.padX * 2) / 2,
        stats.y,
        panelTexture(this, stats.width + st.padX * 2, st.height, 'dark', st.height / 2),
      )
      .setAlpha(st.alpha)
      .setDepth(d);
    layout.place(stats, BOTTOM_LEFT);
    layout.place(statsBack, BOTTOM_LEFT);
    const footer = this.add
      .text(
        width - MENU.footer.marginPx,
        height - MENU.footer.marginPx,
        format('menu.footer', { version: __APP_VERSION__ }),
        textStyle(MENU.footer.fontSizePx, '#ffffff', 2),
      )
      .setOrigin(1, 1)
      .setAlpha(MENU.footer.alpha)
      .setDepth(d);
    layout.place(footer, BOTTOM_RIGHT);
  }

  // ───────────────────────────── Geçişler ─────────────────────────────

  /**
   * Menü öğesinin işleyicisinden çağrılan görünüm değişimleri bir sonraki karede yapılır. Bekleyen
   * bir değişim varken yenisi yok sayılır ve menü girdisi dinlenmez: çok hızlı art arda basışta
   * (iki karede iki Enter) aynı panel iki kez açılmaz (Faz 7 hata avı).
   */
  private later(fn: () => void): void {
    if (this.pendingView) return;
    this.pendingView = true;
    this.time.delayedCall(0, () => {
      this.pendingView = false;
      fn();
    });
  }

  private toSelect(mode: MatchMode, difficulty: AiDifficulty): void {
    const setup: MatchSetup = {
      ...DEFAULT_MATCH_SETUP,
      mode,
      difficulty,
      durationSeconds: getSettings().matchSeconds,
    };
    this.leave(SceneKeys.Select, setup);
  }

  /** Sahneden çık: kısa flaş + vuruş sesi + kararma. */
  private leave(key: string, data: object): void {
    if (this.starting) return;
    this.starting = true;
    sfx.unlock();
    sfx.kick(KICK_SOUND);
    const flash = MENU.clickFlash;
    this.cameras.main.flash(flash.durationMs, flash.red, flash.green, flash.blue);
    this.cameras.main.fadeOut(MENU.startFadeMs);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(key, data);
    });
  }

  /** Türkçe ↔ İngilizce; metinler yeniden kurulsun diye sahne ayarlar açık yeniden başlar. */
  private toggleLanguage(): void {
    if (this.starting) return;
    setLanguage(getLanguage() === 'tr' ? 'en' : 'tr');
    document.title = t('game.title');
    document.documentElement.lang = getLanguage();
    this.starting = true;
    this.later(() => {
      this.scene.restart({ view: 'settings', index: SET.language } satisfies MenuData);
    });
  }
}

const VOLUME_ITEMS = 3;
const HINT_PAD = 18;
const HINT_H = 32;
const KICK_SOUND = 0.8;
