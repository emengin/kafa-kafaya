import Phaser from 'phaser';
import { DISPLAY } from './config/gameConfig';
import { t } from './i18n';
import { BootScene } from './scenes/BootScene';
import { MatchScene } from './scenes/MatchScene';
import { MenuScene } from './scenes/MenuScene';
import { PreloadScene } from './scenes/PreloadScene';

document.title = t('game.title');

new Phaser.Game({
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
