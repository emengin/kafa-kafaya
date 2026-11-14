import Phaser from 'phaser';
import { sfx } from './audio/Sfx';
import { DEV, DISPLAY } from './config/gameConfig';
import { t } from './i18n';
import { BootScene } from './scenes/BootScene';
import { MatchScene } from './scenes/MatchScene';
import { MenuScene } from './scenes/MenuScene';
import { PreloadScene } from './scenes/PreloadScene';
import { wantsDebugOverlay } from './scenes/devFlags';

document.title = t('game.title');

// Tarayıcılar sesi ilk kullanıcı etkileşimine kadar askıda tutar: ilk tuş/tıklamada aç.
const unlockAudio = (): void => {
  sfx.unlock();
};
window.addEventListener('keydown', unlockAudio, { once: true });
window.addEventListener('pointerdown', unlockAudio, { once: true });

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  title: t('game.title'),
  width: DISPLAY.width,
  height: DISPLAY.height,
  backgroundColor: DISPLAY.letterboxColor,
  banner: false,
  scale: {
    // 1280x720 mantıksal çözünürlük; en-boy oranı korunarak sığdırılır, kalan alan letterbox.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  fps: { target: DISPLAY.targetFps },
  render: { antialias: true, powerPreference: 'high-performance' },
  scene: [BootScene, PreloadScene, MenuScene, MatchScene],
});

// Geliştirici kancası: tarayıcı testleri maç durumunu okuyabilsin.
if (wantsDebugOverlay()) Reflect.set(globalThis, DEV.globalGameName, game);
