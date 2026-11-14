import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { CONTROLS, COLORS, DISPLAY, MENU, OVERLAY, TEXTURES, UNITS } from '../config/gameConfig';
import { getLanguage, setLanguage, t } from '../i18n';
import { KeyTracker } from '../input/KeyboardInput';
import { createGameLoop } from '../physics';
import { TextMenu } from '../ui/TextMenu';
import { SceneKeys } from './sceneKeys';

/**
 * Ana menü: başlık + seçenekler (2 Oyuncu, Dil) + sabit adımlı döngüyle sürülen zıplayan top.
 * Klavye (↑/↓, Enter) ve fareyle kullanılır. Diğer modlar sonraki fazlarda eklenecek.
 */
export class MenuScene extends Phaser.Scene {
  private readonly loop = createGameLoop();
  private ball!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Ellipse;
  private tracker!: KeyTracker;
  private menu!: TextMenu;
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
      new Set<string>([...ui.menuUp, ...ui.menuDown, ...ui.menuConfirm]),
    ).attach();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.tracker.detach();
    });
    const items = MENU.items;
    this.menu = new TextMenu(
      this,
      width / 2,
      height * items.yRatio,
      [
        {
          label: t('menu.twoPlayers'),
          onSelect: () => {
            this.onStart();
          },
        },
        {
          label: t('menu.language'),
          onSelect: () => {
            this.toggleLanguage();
          },
        },
      ],
      {
        fontFamily: MENU.fontFamily,
        fontSizePx: items.fontSizePx,
        spacingPx: items.spacingPx,
        strokePx: items.strokePx,
        color: OVERLAY.items.color,
        selectedColor: OVERLAY.items.selectedColor,
        selectedScale: OVERLAY.items.selectedScale,
        depth: 0,
      },
    );

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
    if (!this.starting) this.menu.update(this.tracker);
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

  /** "2 Oyuncu": topa vur, ekranı karart ve iki oyunculu maça geç. */
  private onStart(): void {
    if (this.starting) return;
    this.starting = true;
    sfx.unlock();
    const flash = MENU.clickFlash;
    this.cameras.main.flash(flash.durationMs, flash.red, flash.green, flash.blue);
    this.ballVy = -MENU.demoBall.kickSpeed;
    this.cameras.main.fadeOut(MENU.startFadeMs);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SceneKeys.Match);
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
