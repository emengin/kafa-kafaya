import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import {
  AI_DIFFICULTIES,
  CONTROLS,
  COLORS,
  DISPLAY,
  MENU,
  OVERLAY,
  STORAGE,
  TEXTURES,
  UNITS,
  type AiDifficulty,
} from '../config/gameConfig';
import { DEFAULT_MATCH_SETUP, isDifficulty, type MatchSetup } from '../game/matchSetup';
import { storage } from '../game/storage';
import { getLanguage, setLanguage, t } from '../i18n';
import { KeyTracker } from '../input/KeyboardInput';
import { createGameLoop } from '../physics';
import { TextMenu, type TextMenuItem } from '../ui/TextMenu';
import { SceneKeys } from './sceneKeys';

/** Son seçilen zorluk (kayıtlı değilse Orta). */
function savedDifficulty(): AiDifficulty {
  const value = storage.get(STORAGE.keys.aiDifficulty);
  return isDifficulty(value) ? value : DEFAULT_MATCH_SETUP.difficulty;
}

/**
 * Ana menü: başlık + seçenekler (CPU'ya Karşı → zorluk seçimi, 2 Oyuncu, Dil) + sabit adımlı
 * döngüyle sürülen zıplayan top. Klavye (↑/↓, Enter, Esc geri) ve fareyle kullanılır.
 */
export class MenuScene extends Phaser.Scene {
  private readonly loop = createGameLoop();
  private ball!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Ellipse;
  private tracker!: KeyTracker;
  private menu: TextMenu | null = null;
  private submenuTitle: Phaser.GameObjects.Text | null = null;
  private inSubmenu = false;
  private starting = false;

  // Demo top durumu: simülasyon yalnızca sabit adımda ilerler, render enterpole edilir.
  private ballY = 0;
  private prevBallY = 0;
  private ballVy = 0;
  private angle = 0;
  private prevAngle = 0;
  private restY = 0;

  constructor() {
    super(SceneKeys.Menu);
  }

  create(): void {
    const { width, height } = DISPLAY;
    const grassTop = height * (1 - MENU.grass.heightRatio);

    this.loop.reset();
    this.starting = false;
    this.menu = null;
    this.submenuTitle = null;
    this.inSubmenu = false;
    this.drawBackground(grassTop);

    // Demo top
    const r = TEXTURES.ball.radius;
    this.restY = grassTop - r;
    this.ballY = this.prevBallY = height * MENU.demoBall.startHeightRatio;
    this.ballVy = 0;
    this.angle = this.prevAngle = 0;
    const ballX = width * MENU.demoBall.xRatio;
    this.shadow = this.add.ellipse(
      ballX,
      grassTop,
      r * 2 * MENU.demoBall.shadowWidthRatio,
      r * 2 * MENU.demoBall.shadowHeightRatio,
      COLORS.ballShadow,
      COLORS.ballShadowAlpha,
    );
    this.ball = this.add.image(ballX, this.ballY, TEXTURES.ball.key);

    // Başlık
    const title = this.add
      .text(width / 2, height * MENU.title.yRatio, t('game.title'), {
        fontFamily: MENU.fontFamily,
        fontSize: `${MENU.title.fontSizePx}px`,
        color: COLORS.textAccent,
        stroke: COLORS.textStroke,
        strokeThickness: MENU.title.strokePx,
      })
      .setOrigin(0.5)
      .setShadow(
        MENU.title.shadowOffsetPx,
        MENU.title.shadowOffsetPx,
        MENU.title.shadowColor,
        MENU.title.shadowBlurPx,
        true,
        true,
      );
    this.tweens.add({
      targets: title,
      scale: MENU.title.pulseScale,
      duration: MENU.title.pulseMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Seçenekler
    const { ui } = CONTROLS;
    this.tracker = new KeyTracker(
      window,
      new Set<string>([...ui.menuUp, ...ui.menuDown, ...ui.menuConfirm, ...ui.menuBack]),
    ).attach();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.tracker.detach();
    });
    this.showMainMenu(0);

    this.add
      .text(width / 2, height * MENU.navHint.yRatio, t('menu.navHint'), {
        fontFamily: MENU.fontFamily,
        fontSize: `${MENU.navHint.fontSizePx}px`,
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5)
      .setAlpha(MENU.navHint.alpha);

    this.add
      .text(width - MENU.footer.marginPx, height - MENU.footer.marginPx, t('menu.footer'), {
        fontFamily: MENU.fontFamily,
        fontSize: `${MENU.footer.fontSizePx}px`,
        color: COLORS.textPrimary,
      })
      .setOrigin(1, 1)
      .setAlpha(MENU.footer.alpha);

    this.cameras.main.fadeIn(MENU.startFadeMs);
  }

  override update(_time: number, deltaMs: number): void {
    if (!this.starting) {
      if (this.inSubmenu && this.tracker.consumeAny(CONTROLS.ui.menuBack)) {
        this.showMainMenu(0);
      } else {
        this.menu?.update(this.tracker);
      }
    }
    this.loop.advance(deltaMs / UNITS.msPerSecond, (dt) => {
      this.stepBall(dt);
    });

    const alpha = this.loop.alpha;
    this.ball.y = Phaser.Math.Linear(this.prevBallY, this.ballY, alpha);
    this.ball.rotation = Phaser.Math.Linear(this.prevAngle, this.angle, alpha);

    // Gölge top yükseldikçe küçülür.
    const heightFactor = Phaser.Math.Clamp(this.ball.y / this.restY, 0, 1);
    this.shadow.setScale(heightFactor);
  }

  /** Tek sabit adım: yerçekimi + zemin sekmesi. Phaser'dan bağımsız saf hesap. */
  private stepBall(dt: number): void {
    const cfg = MENU.demoBall;
    this.prevBallY = this.ballY;
    this.prevAngle = this.angle;

    this.ballVy += cfg.gravity * dt;
    this.ballY += this.ballVy * dt;
    this.angle += cfg.spinSpeed * dt;

    if (this.ballY >= this.restY && this.ballVy > 0) {
      this.ballY = this.restY;
      const bounce = this.ballVy * cfg.restitution;
      this.ballVy = -(bounce < cfg.minBounceSpeed ? cfg.relaunchSpeed : bounce);
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
        this.showMainMenu(0);
      },
    });
    this.setMenu(items, AI_DIFFICULTIES.indexOf(savedDifficulty()), t('menu.difficultyTitle'));
  }

  private setMenu(items: readonly TextMenuItem[], selected: number, title: string | null): void {
    if (this.starting) return;
    this.menu?.destroy();
    this.submenuTitle?.destroy();
    this.submenuTitle = null;
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
      selectedScale: OVERLAY.items.selectedScale,
      depth: 0,
    });
    this.menu.select(selected);
    this.inSubmenu = title !== null;
    if (title !== null) {
      const st = MENU.submenuTitle;
      this.submenuTitle = this.add
        .text(width / 2, y - st.offsetY, title, {
          fontFamily: MENU.fontFamily,
          fontSize: `${st.fontSizePx}px`,
          color: st.color,
          stroke: COLORS.textStroke,
          strokeThickness: st.strokePx,
        })
        .setOrigin(0.5);
    }
  }

  /** Karakter seçimine geç: topa vur, ekranı karart ve seçim sahnesini kurulumla başlat. */
  private onStart(setup: MatchSetup): void {
    if (this.starting) return;
    this.starting = true;
    sfx.unlock();
    const flash = MENU.clickFlash;
    this.cameras.main.flash(flash.durationMs, flash.red, flash.green, flash.blue);
    this.ballVy = -MENU.demoBall.kickSpeed;
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
    this.scene.restart();
  }

  private drawBackground(grassTop: number): void {
    const { width, height } = DISPLAY;
    const g = this.add.graphics();

    g.fillGradientStyle(COLORS.skyTop, COLORS.skyTop, COLORS.skyBottom, COLORS.skyBottom, 1);
    g.fillRect(0, 0, width, grassTop);

    const stripeWidth = width / MENU.grass.stripeCount;
    for (let i = 0; i < MENU.grass.stripeCount; i++) {
      g.fillStyle(i % 2 === 0 ? COLORS.grass : COLORS.grassStripe, 1);
      g.fillRect(i * stripeWidth, grassTop, stripeWidth, height - grassTop);
    }

    g.fillStyle(COLORS.pitchLine, 1);
    g.fillRect(0, grassTop, width, MENU.grass.lineWidthPx);
  }
}
