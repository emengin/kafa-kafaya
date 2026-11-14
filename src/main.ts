import Phaser from 'phaser';
import { engine } from './audio/AudioEngine';
import { isLowPowerDevice, rememberQuality } from './fx/feel';
import { crowd } from './audio/Crowd';
import { music } from './audio/Music';
import { sfx } from './audio/Sfx';
import { DEV, DISPLAY } from './config/gameConfig';
import { t } from './i18n';
import { BootScene } from './scenes/BootScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { MatchScene } from './scenes/MatchScene';
import { MenuScene } from './scenes/MenuScene';
import { PreloadScene } from './scenes/PreloadScene';
import { wantsDebugOverlay } from './scenes/devFlags';

document.title = t('game.title');

// Tarayıcıların autoplay kuralı: ses ancak kullanıcı etkileşiminden sonra başlayabilir. Her
// tuş/tıklama/dokunuşta kilit açmayı dene; ses çalmaya başlayınca dinleyicileri kaldır.
const UNLOCK_EVENTS = ['keydown', 'pointerdown', 'touchend'] as const;
const unlockAudio = (): void => {
  engine.unlock();
  if (engine.running)
    for (const type of UNLOCK_EVENTS) window.removeEventListener(type, unlockAudio);
};
for (const type of UNLOCK_EVENTS) window.addEventListener(type, unlockAudio);

// Düşük güçlü cihaz: kenar yumuşatma kapalı, görsel kalite bir kademe aşağıdan başlar.
const lowPower = isLowPowerDevice(navigator);
if (lowPower) rememberQuality(1);

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
  render: { antialias: true, antialiasGL: !lowPower, powerPreference: 'high-performance' },
  scene: [BootScene, PreloadScene, MenuScene, CharacterSelectScene, MatchScene],
});

// Geliştirici kancası: tarayıcı testleri maç durumunu ve ses sistemini okuyabilsin.
if (wantsDebugOverlay()) {
  Reflect.set(globalThis, DEV.globalGameName, game);
  Reflect.set(globalThis, DEV.globalAudioName, { engine, sfx, crowd, music });
}
