import Phaser from 'phaser';
import { engine } from './audio/AudioEngine';
import { isLowPowerDevice, rememberQuality } from './fx/feel';
import { crowd } from './audio/Crowd';
import { music } from './audio/Music';
import { sfx } from './audio/Sfx';
import { DEV, DISPLAY, PLATFORM } from './config/gameConfig';
import { getLanguage, onLanguageChange, t } from './i18n';
import { gamepads } from './input/Gamepads';
import { initDeviceDetection } from './platform/device';
import { installPlatformUi, refreshPlatformTexts } from './platform/fullscreen';
import { registerServiceWorker } from './platform/pwa';
import { BootScene } from './scenes/BootScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { MatchScene } from './scenes/MatchScene';
import { MenuScene } from './scenes/MenuScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TournamentScene } from './scenes/TournamentScene';
import { TrophyScene } from './scenes/TrophyScene';
import { wantsDebugOverlay } from './scenes/devFlags';

document.title = t('game.title');
document.documentElement.lang = getLanguage();

// Platform (Faz 6): dokunmatik algılama, tam ekran düğmesi + dikey ekran uyarısı (i18n), PWA.
initDeviceDetection();
installPlatformUi();
onLanguageChange(refreshPlatformTexts);
registerServiceWorker();

// Tarayıcıların autoplay kuralı: ses ancak kullanıcı etkileşiminden sonra başlayabilir. Her
// tuş/tıklama/dokunuşta kilit açmayı dene; ses çalmaya başlayınca dinleyicileri kaldır.
const UNLOCK_EVENTS = ['keydown', 'pointerdown', 'touchend'] as const;
const unlockAudio = (): void => {
  engine.unlock();
  if (engine.running)
    for (const type of UNLOCK_EVENTS) window.removeEventListener(type, unlockAudio);
};
for (const type of UNLOCK_EVENTS) window.addEventListener(type, unlockAudio);

/** Phaser'ın izlediği eşzamanlı dokunuş sayısı (menü butonları; oyun butonları ham olayla). */
const TOUCH_POINTERS = 3;

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
  input: { activePointers: TOUCH_POINTERS },
  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    CharacterSelectScene,
    MatchScene,
    TournamentScene,
    TrophyScene,
  ],
});

// Telefon döndürülünce tuval yeni boyuta oturmayabiliyor: kısa gecikmelerle ölçeği yenile.
const refreshScale = (): void => {
  for (const ms of PLATFORM.scaleRefreshMs) {
    setTimeout(() => {
      game.scale.refresh();
    }, ms);
  }
};
window.addEventListener('resize', refreshScale);
window.addEventListener('orientationchange', refreshScale);

// Gamepad API: her karenin başında kollar yoklanır; düğmeler sanal tuş olarak sahnelere düşer.
game.events.on(Phaser.Core.Events.PRE_STEP, () => {
  gamepads.poll();
});

// Geliştirici kancası: tarayıcı testleri maç durumunu ve ses sistemini okuyabilsin.
if (wantsDebugOverlay()) {
  Reflect.set(globalThis, DEV.globalGameName, game);
  Reflect.set(globalThis, DEV.globalAudioName, { engine, sfx, crowd, music });
}
