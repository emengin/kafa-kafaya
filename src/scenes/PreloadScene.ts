import Phaser from 'phaser';
import { generateCharacterTexture } from '../art/characterArt';
import { generateFxTextures } from '../art/fxArt';
import { generateStadiumTextures } from '../art/stadiumArt';
import { addPanel, goldFill, textStyle } from '../art/uiArt';
import { COLORS, DISPLAY, PRELOAD } from '../config/gameConfig';
import { CHARACTERS } from '../game/characters';
import { storage } from '../game/storage';
import { t } from '../i18n';
import { IS_NATIVE_APP } from '../platform/target';
import { takeMatchResume } from '../save/matchResume';
import { generateIconTextures } from '../ui/icons';
import { wantsDirectMatch } from './devFlags';
import type { MatchResumeData } from './MatchScene';
import { SceneKeys } from './sceneKeys';
import { screenLayout } from '../ui/ScreenLayout';

/** Sık kullanılan renk. */
const WHITE = 0xffffff;

/**
 * Tüm dokuları kodla üretir (harici dosya yok): efektler ve top, stadyum, her karakter. Üretim
 * kareler arasına bölünür; böylece yükleme çubuğu ilerler ve tarayıcı donmaz.
 *
 * Faz 2.5: uygulamada bu ekran yerel açılış ekranının arkasında kalır (açılış ekranı ana menünün
 * ilk karesine kadar sürer); bu yüzden "bir an görünsün" beklemesi yok. Yarım kalan maç kaydı
 * varsa (süreç arka planda kapanmıştı) ana menü yerine maç kaldığı yerden açılır.
 */
export class PreloadScene extends Phaser.Scene {
  private bar!: Phaser.GameObjects.Graphics;

  constructor() {
    super(SceneKeys.Preload);
  }

  create(): void {
    const { width, height } = DISPLAY;
    const { bar } = PRELOAD;
    // Zemin tüm görünür alanı kaplar (geniş ekran / tablet; Faz 2.2).
    const { view } = screenLayout(this).frame;
    this.add
      .graphics()
      .fillGradientStyle(COLORS.skyTop, COLORS.skyTop, COLORS.skyBottom, COLORS.skyBottom, 1)
      .fillRect(view.x, view.y, view.width, view.height);
    const title = this.add
      .text(
        width / 2,
        height / 2 - bar.height * TITLE_ABOVE,
        t('game.title'),
        textStyle(TITLE_SIZE, '#ffffff'),
      )
      .setOrigin(0.5);
    goldFill(title);
    addPanel(
      this,
      width / 2,
      height / 2,
      bar.width + PANEL_PAD * 2,
      bar.height + PANEL_PAD * 2,
      'dark',
      (bar.height + PANEL_PAD * 2) / 2,
    );
    this.add
      .text(
        width / 2,
        height / 2 + bar.height * LABEL_BELOW,
        t('preload.loading'),
        textStyle(LABEL_SIZE, '#ffffff', 2),
      )
      .setOrigin(0.5);
    this.bar = this.add.graphics();

    const tasks: (() => void)[] = [
      () => {
        generateFxTextures(this);
        generateIconTextures(this);
      },
      () => {
        generateStadiumTextures(this);
      },
      ...CHARACTERS.map((def) => () => {
        generateCharacterTexture(this, def);
      }),
    ];
    const start = performance.now();
    let done = 0;
    const next = (): void => {
      const task = tasks[done];
      if (task) {
        task();
        done++;
        this.drawBar(done / tasks.length);
        this.time.delayedCall(0, next);
        return;
      }
      const minVisible = IS_NATIVE_APP ? 0 : PRELOAD.minVisibleMs;
      const wait = Math.max(0, minVisible - (performance.now() - start));
      this.time.delayedCall(wait, () => {
        this.startFirstScene();
      });
    };
    this.drawBar(0);
    this.time.delayedCall(0, next);
  }

  private startFirstScene(): void {
    if (wantsDirectMatch()) {
      this.scene.start(SceneKeys.Match);
      return;
    }
    const resume = takeMatchResume(storage, Date.now(), __APP_VERSION__);
    if (resume) this.scene.start(SceneKeys.Match, { resume } satisfies MatchResumeData);
    else this.scene.start(SceneKeys.Menu);
  }

  private drawBar(progress: number): void {
    const { width, height } = DISPLAY;
    const { bar } = PRELOAD;
    const x = (width - bar.width) / 2;
    const y = (height - bar.height) / 2;
    this.bar.clear();
    if (progress <= 0) return;
    const w = Math.max(bar.height, bar.width * Math.min(progress, 1));
    this.bar.fillStyle(COLORS.progressFill, 1);
    this.bar.fillRoundedRect(x, y, w, bar.height, bar.borderRadius);
    this.bar.fillStyle(WHITE, SHINE_ALPHA);
    this.bar.fillRoundedRect(
      x + 2,
      y + 2,
      Math.max(0, w - SHINE_INSET * 2),
      bar.height * SHINE_H,
      bar.borderRadius / 2,
    );
  }
}

const TITLE_SIZE = 72;
const TITLE_ABOVE = 6;
const LABEL_SIZE = 20;
const LABEL_BELOW = 3;
const PANEL_PAD = 8;
const SHINE_ALPHA = 0.45;
const SHINE_H = 0.35;
const SHINE_INSET = 2;
