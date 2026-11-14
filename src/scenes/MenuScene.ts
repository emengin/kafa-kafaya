import Phaser from 'phaser';
import { crowd } from '../audio/Crowd';
import { music } from '../audio/Music';
import { sfx } from '../audio/Sfx';
import { BALL_BAKE_RADIUS, FX_KEYS } from '../art/fxArt';
import { STAGE_KEYS } from '../art/stadiumArt';
import { addPanel, goldFill, panelTexture, textStyle } from '../art/uiArt';
import {
  AI_DIFFICULTIES,
  ANIM,
  BALL,
  CONTROLS,
  DISPLAY,
  MENU,
  OVERLAY,
  PITCH,
  STORAGE,
  UI_THEME,
  UNITS,
  type AiDifficulty,
} from '../config/gameConfig';
import { CHARACTERS, paramsFromStats, type CharacterDef } from '../game/characters';
import { PLAYER_STAND_OFFSET } from '../game/entities/Player';
import { DEFAULT_MATCH_SETUP, isDifficulty, type MatchSetup } from '../game/matchSetup';
import { storage } from '../game/storage';
import { getLanguage, setLanguage, t } from '../i18n';
import { KeyTracker } from '../input/KeyboardInput';
import { createGameLoop } from '../physics';
import { CharacterRig, type RigPose } from '../ui/CharacterRig';
import { volumeMenuItems } from '../ui/settingsMenu';
import { StadiumView } from '../ui/StadiumView';
import { TextMenu, type TextMenuItem } from '../ui/TextMenu';
import { sessionQuality } from '../fx/feel';
import { SceneKeys } from './sceneKeys';

/** Son seçilen zorluk (kayıtlı değilse Orta). */
function savedDifficulty(): AiDifficulty {
  const value = storage.get(STORAGE.keys.aiDifficulty);
  return isDifficulty(value) ? value : DEFAULT_MATCH_SETUP.difficulty;
}

/** İki farklı rastgele karakter (yalnızca menü süsü). */
function randomPair(): [CharacterDef, CharacterDef] {
  const a = Math.floor(Math.random() * CHARACTERS.length);
  const b = (a + 1 + Math.floor(Math.random() * (CHARACTERS.length - 1))) % CHARACTERS.length;
  return [CHARACTERS[a] ?? CHARACTERS[0], CHARACTERS[b] ?? CHARACTERS[1]] as [
    CharacterDef,
    CharacterDef,
  ];
}

/**
 * Ana menü: canlı stadyum (kalabalık, bulutlar, ışıklar), altın başlık, buton menüsü (CPU'ya
 * Karşı → zorluk, 2 Oyuncu, Ses Ayarları, Dil) ve iki karakter — biri topu kafasında sektirir,
 * diğeri gözleriyle izler. Menü müziği ses kilidi açılınca başlar. Klavye ve fareyle kullanılır.
 */
export class MenuScene extends Phaser.Scene {
  private readonly loop = createGameLoop();
  private tracker!: KeyTracker;
  private menu: TextMenu | null = null;
  private submenuTitle: Phaser.GameObjects.Text | null = null;
  private submenuPanel: Phaser.GameObjects.Image | null = null;
  private inSubmenu = false;
  /** Alt menüden çıkınca ana menüde seçili gelecek öğe (açan öğe). */
  private backIndex = 0;
  private starting = false;
  private stadium!: StadiumView;
  private rigs!: [CharacterRig, CharacterRig];
  private ball!: Phaser.GameObjects.Container;
  private ballPattern!: Phaser.GameObjects.Image;
  private ballShadow!: Phaser.GameObjects.Image;
  private title!: Phaser.GameObjects.Text;

  // Demo top: simülasyon yalnızca sabit adımda ilerler, çizim enterpole edilir.
  private ballY = 0;
  private prevBallY = 0;
  private ballVy = 0;
  private angle = 0;
  private prevAngle = 0;

  constructor() {
    super(SceneKeys.Menu);
  }

  create(): void {
    const { width, height } = DISPLAY;
    this.loop.reset();
    this.starting = false;
    this.menu = null;
    this.submenuTitle = null;
    this.submenuPanel = null;
    this.inSubmenu = false;

    const world = this.add.container(0, 0);
    const pair = randomPair();
    this.stadium = new StadiumView(this, world, {
      leftColors: [pair[0].palette.body, pair[0].palette.accent],
      rightColors: [pair[1].palette.body, pair[1].palette.accent],
      quality: sessionQuality(),
      title: t('game.title'),
      goalText: t('board.goal'),
    });
    const shadows = this.add.container(0, 0);
    world.add(shadows);
    const groundY = PITCH.groundY;
    this.rigs = [
      new CharacterRig(this, pair[0], { shadowLayer: shadows, groundY }),
      new CharacterRig(this, pair[1], { shadowLayer: shadows, groundY }),
    ];
    world.add([this.rigs[0].root, this.rigs[1].root]);

    // Demo top: sağdaki karakterin kafasında seker.
    this.ballShadow = this.add.image(0, groundY, FX_KEYS.shadow);
    shadows.add(this.ballShadow);
    this.ballPattern = this.add.image(0, 0, FX_KEYS.ballPattern);
    this.ball = this.add.container(this.ballX, 0, [
      this.ballPattern,
      this.add.image(0, 0, FX_KEYS.ballShade),
    ]);
    this.ball.setScale(BALL.radius / BALL_BAKE_RADIUS);
    world.add(this.ball);
    this.ballY = this.prevBallY = this.ballRestY - DEMO.startDrop;
    this.ballVy = 0;
    this.angle = this.prevAngle = 0;
    this.add.image(0, 0, STAGE_KEYS.vignette).setOrigin(0);

    // Başlık: altın gradyan, kalın kontur, nefes alır.
    this.title = this.add
      .text(
        width / 2,
        height * MENU.title.yRatio,
        t('game.title'),
        textStyle(MENU.title.fontSizePx, '#ffffff', MENU.title.strokePx),
      )
      .setOrigin(0.5);
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
    });
    this.showMainMenu(0);

    // Alt bilgi: gezinme ipucu hapı ve sürüm.
    const hint = this.add
      .text(
        width / 2,
        height * MENU.navHint.yRatio,
        t('menu.navHint'),
        textStyle(MENU.navHint.fontSizePx, '#ffffff', 2),
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
    this.add
      .text(
        width - MENU.footer.marginPx,
        height - MENU.footer.marginPx,
        t('menu.footer'),
        textStyle(MENU.footer.fontSizePx, '#ffffff', 2),
      )
      .setOrigin(1, 1)
      .setAlpha(MENU.footer.alpha);

    this.cameras.main.fadeIn(MENU.startFadeMs);
    music.play('menu');
    crowd.start();
  }

  private get ballX(): number {
    return DISPLAY.width * DEMO.rightXRatio + DEMO.ballOffsetX;
  }

  /** Topun kafaya değdiği y (sağdaki karakterin kafa üstü). */
  private get ballRestY(): number {
    return this.headY - paramsFromStats(this.rigs[1].def.stats).headRadius - BALL.radius;
  }

  private get headY(): number {
    return PITCH.groundY - PLAYER_STAND_OFFSET;
  }

  override update(time: number, deltaMs: number): void {
    if (!this.starting) {
      if (this.inSubmenu && this.tracker.consumeAny(CONTROLS.ui.menuBack)) {
        sfx.menuBack();
        this.showMainMenu(this.backIndex);
      } else {
        this.menu?.update(this.tracker);
      }
    }
    const dt = Math.min(deltaMs, MAX_FRAME_MS) / UNITS.msPerSecond;
    this.loop.advance(dt, (stepDt) => {
      this.stepBall(stepDt);
    });
    const alpha = this.loop.alpha;
    const by = Phaser.Math.Linear(this.prevBallY, this.ballY, alpha);
    this.ball.setPosition(this.ballX, by);
    this.ballPattern.setRotation(Phaser.Math.Linear(this.prevAngle, this.angle, alpha));
    const height = Math.max(0, PITCH.groundY - by);
    const f = Math.max(SHADOW_MIN, 1 - height / SHADOW_FADE);
    this.ballShadow
      .setPosition(this.ballX, PITCH.groundY)
      .setScale((BALL.radius * 2 * f) / SHADOW_TEX, (BALL.radius * f) / SHADOW_TEX)
      .setAlpha(SHADOW_ALPHA * f);

    const seconds = time / UNITS.msPerSecond;
    this.stadium.update(dt, seconds);
    const look = { x: this.ballX, y: by };
    this.rigs.forEach((rig, i) => {
      rig.face.update(dt, { frozen: false, straining: false, armed: false });
      const pose: RigPose = {
        x: DISPLAY.width * (i === 0 ? DEMO.leftXRatio : DEMO.rightXRatio),
        y: this.headY,
        headRadius: paramsFromStats(rig.def.stats).headRadius,
        footAngle: DEMO.footAngle,
        facing: i === 0 ? 1 : -1,
        vx: 0,
        vy: 0,
        grounded: true,
        maxSpeed: 1,
        kick: 0,
        frozen: false,
        armed: false,
      };
      rig.update(dt, pose, look, seconds);
    });
  }

  /** Tek sabit adım: yerçekimi + kafada sekme. Phaser'dan bağımsız saf hesap. */
  private stepBall(dt: number): void {
    const cfg = MENU.demoBall;
    this.prevBallY = this.ballY;
    this.prevAngle = this.angle;
    this.ballVy += cfg.gravity * dt;
    this.ballY += this.ballVy * dt;
    this.angle += cfg.spinSpeed * dt;
    const rest = this.ballRestY;
    if (this.ballY >= rest && this.ballVy > 0) {
      this.ballY = rest;
      this.ballVy = -cfg.relaunchSpeed;
      this.rigs[1].anim.onLand(DEMO.headerSquash);
    }
  }

  private showMainMenu(selected: number): void {
    this.setMenu(
      [
        {
          label: t('menu.vsCpu'),
          onSelect: () => {
            this.showDifficultyMenu();
          },
        },
        {
          label: t('menu.twoPlayers'),
          onSelect: () => {
            this.onStart({ ...DEFAULT_MATCH_SETUP, mode: 'versus' });
          },
        },
        {
          label: t('menu.settings'),
          onSelect: () => {
            this.showSettingsMenu();
          },
        },
        {
          label: t('menu.language'),
          onSelect: () => {
            this.toggleLanguage();
          },
        },
      ],
      selected,
      null,
    );
  }

  /** CPU'ya karşı: Kolay / Orta / Zor / Geri. Son seçilen zorluk işaretli gelir. */
  private showDifficultyMenu(): void {
    const items: TextMenuItem[] = AI_DIFFICULTIES.map((difficulty) => ({
      label: t(`difficulty.${difficulty}`),
      onSelect: () => {
        storage.set(STORAGE.keys.aiDifficulty, difficulty);
        this.onStart({ ...DEFAULT_MATCH_SETUP, mode: 'cpu', difficulty });
      },
    }));
    items.push({
      label: t('menu.back'),
      onSelect: () => {
        this.showMainMenu(MAIN_CPU);
      },
    });
    this.backIndex = MAIN_CPU;
    this.setMenu(items, AI_DIFFICULTIES.indexOf(savedDifficulty()), t('menu.difficultyTitle'));
  }

  /** Ses ayarları: Ana ses / Efektler / Müzik (←/→) ve Geri. */
  private showSettingsMenu(): void {
    this.backIndex = MAIN_SETTINGS;
    this.setMenu(
      volumeMenuItems(() => {
        this.showMainMenu(MAIN_SETTINGS);
      }),
      0,
      t('settings.hint'),
    );
  }

  private setMenu(items: readonly TextMenuItem[], selected: number, title: string | null): void {
    if (this.starting) return;
    this.menu?.destroy();
    this.submenuTitle?.destroy();
    this.submenuPanel?.destroy();
    this.submenuTitle = null;
    this.submenuPanel = null;
    const { width, height } = DISPLAY;
    const style = MENU.items;
    const y = height * style.yRatio;
    this.menu = new TextMenu(this, width / 2, y, items, {
      fontFamily: MENU.fontFamily,
      fontSizePx: style.fontSizePx,
      spacingPx: style.spacingPx,
      strokePx: style.strokePx,
      color: OVERLAY.items.color,
      selectedColor: OVERLAY.items.selectedColor,
      selectedScale: UI_THEME.button.selectedScale,
      depth: 2,
      buttonWidth: style.buttonWidth,
    });
    this.menu.select(selected);
    this.inSubmenu = title !== null;
    if (title !== null) {
      const st = MENU.submenuTitle;
      this.submenuTitle = this.add
        .text(width / 2, y - st.offsetY, title, textStyle(st.fontSizePx, st.color, st.strokePx))
        .setOrigin(0.5)
        .setDepth(2);
      this.submenuPanel = addPanel(
        this,
        width / 2,
        y - st.offsetY,
        this.submenuTitle.width + HINT_PAD * 2,
        HINT_H,
        'dark',
        HINT_H / 2,
      )
        .setDepth(1)
        .setAlpha(SUBTITLE_PANEL_ALPHA);
    }
  }

  /** Karakter seçimine geç: top havaya, karakterler sevinir, ekran kararır. */
  private onStart(setup: MatchSetup): void {
    if (this.starting) return;
    this.starting = true;
    sfx.unlock();
    sfx.kick(KICK_SOUND);
    const flash = MENU.clickFlash;
    this.cameras.main.flash(flash.durationMs, flash.red, flash.green, flash.blue);
    this.ballVy = -MENU.demoBall.kickSpeed;
    for (const rig of this.rigs) rig.face.trigger('happy', ANIM.expressions.happySeconds);
    this.cameras.main.fadeOut(MENU.startFadeMs);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SceneKeys.Select, setup);
    });
  }

  /** Türkçe ↔ İngilizce; metinler yeniden kurulsun diye sahne yeniden başlatılır. */
  private toggleLanguage(): void {
    if (this.starting) return;
    setLanguage(getLanguage() === 'tr' ? 'en' : 'tr');
    document.title = t('game.title');
    this.time.delayedCall(0, () => {
      this.scene.restart();
    });
  }
}

/** Menü süsünün yerleşimi (yalnızca şekil). */
const DEMO = {
  leftXRatio: 0.16,
  rightXRatio: 0.84,
  ballOffsetX: 4,
  startDrop: 260,
  footAngle: 0.76,
  headerSquash: 700,
} as const;
const MAX_FRAME_MS = 100;
/** Ana menü öğelerinin sırası (alt menüden dönüşte seçili gelir). */
const MAIN_CPU = 0;
const MAIN_SETTINGS = 2;
const SHADOW_MIN = 0.35;
const SHADOW_FADE = 520;
const SHADOW_TEX = 128;
const SHADOW_ALPHA = 0.4;
const HINT_PAD = 18;
const HINT_H = 32;
const SUBTITLE_PANEL_ALPHA = 0.85;
const KICK_SOUND = 0.8;
