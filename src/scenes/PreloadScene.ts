import Phaser from 'phaser';
import { COLORS, DISPLAY, MENU, PRELOAD } from '../config/gameConfig';
import { t } from '../i18n';
import { generateTextures } from '../ui/textures';
import { wantsDirectMatch } from './devFlags';
import { SceneKeys } from './sceneKeys';

/** Kodla doku üretir ve yükleme çubuğu gösterir. Harici dosya yüklenmez. */
export class PreloadScene extends Phaser.Scene {
  private bar!: Phaser.GameObjects.Graphics;

  constructor() {
    super(SceneKeys.Preload);
  }

  preload(): void {
    const { width, height } = DISPLAY;
    const { bar } = PRELOAD;

    this.add
      .text(width / 2, height / 2 - bar.height * 2, t('preload.loading'), {
        fontFamily: MENU.fontFamily,
        fontSize: `${MENU.footer.fontSizePx}px`,
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5);

    this.bar = this.add.graphics();
    this.drawBar(0);
    // İleride Phaser yükleyicisine bir şey eklenirse çubuk otomatik ilerler.
    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      this.drawBar(value);
    });
  }

  create(): void {
    generateTextures(this);

    const progress = { value: 0 };
    this.tweens.add({
      targets: progress,
      value: 1,
      duration: PRELOAD.minVisibleMs,
      onUpdate: () => {
        this.drawBar(progress.value);
      },
      onComplete: () => {
        this.scene.start(wantsDirectMatch() ? SceneKeys.Match : SceneKeys.Menu);
      },
    });
  }

  private drawBar(progress: number): void {
    const { width, height } = DISPLAY;
    const { bar } = PRELOAD;
    const x = (width - bar.width) / 2;
    const y = (height - bar.height) / 2;

    this.bar.clear();
    this.bar.fillStyle(COLORS.progressBack, 1);
    this.bar.fillRoundedRect(x, y, bar.width, bar.height, bar.borderRadius);
    if (progress > 0) {
      const w = Math.max(bar.height, bar.width * Math.min(progress, 1));
      this.bar.fillStyle(COLORS.progressFill, 1);
      this.bar.fillRoundedRect(x, y, w, bar.height, bar.borderRadius);
    }
  }
}
