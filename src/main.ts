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
import { initHaptics } from './platform/haptics';
import { installPlatformUi, refreshPlatformTexts } from './platform/fullscreen';
import { installLifecycle } from './platform/lifecycle';
import { registerServiceWorker } from './platform/pwa';
import { cutoutInsets, installSafeArea, onSafeAreaChange } from './platform/safeArea';
import { fitParent } from './platform/screenFrame';
import { BootScene } from './scenes/BootScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { ControlsEditorScene } from './scenes/ControlsEditorScene';
import { MatchScene } from './scenes/MatchScene';
import { MenuScene } from './scenes/MenuScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TournamentScene } from './scenes/TournamentScene';
import { TrophyScene } from './scenes/TrophyScene';
import { wantsDebugOverlay } from './scenes/devFlags';

// Geliştirici araçları (Faz 2.4): yalnızca geliştirici derlemesinde pakete girer (kare süresi
// grafiği, stres sahnesi, rollback ölçer, `?gl=` deneyleri). Yayın derlemesinde bu dal yoktur.
const devTools = __DEV_TOOLS__ ? await import('./dev/install') : null;

document.title = t('game.title');
document.documentElement.lang = getLanguage();

// Platform (Faz 6): dokunmatik algılama, tam ekran düğmesi + dikey ekran uyarısı (i18n), PWA;
// dokunma titreşimi (Faz 2.3).
initDeviceDetection();
installPlatformUi();
initHaptics();
// Yaşam döngüsü (Faz 2.5): arka plan, ses kesintileri, kulaklık, düşük bellek, Android geri tuşu.
installLifecycle();
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

// Ekran çerçevesi (Faz 2.2): tuvalin kabı pencereyi kaplar, en-boy oranı 4:3 ile 21,3:9 arasına
// kırpılır (ötesi letterbox); güvenli alan (çentik) okunmaya başlar.
// Oyun alanı çentiğin altına düşecekse kap çentikten uzaklaşır (fitParent).
const parent = document.getElementById('game');
const fitGameParent = (): void => {
  if (!parent) return;
  const box = fitParent(globalThis.innerWidth, globalThis.innerHeight, cutoutInsets());
  parent.style.left = `${box.x}px`;
  parent.style.top = `${box.y}px`;
  parent.style.width = `${box.width}px`;
  parent.style.height = `${box.height}px`;
};
installSafeArea();
fitGameParent();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  title: t('game.title'),
  width: DISPLAY.width,
  height: DISPLAY.height,
  backgroundColor: DISPLAY.letterboxColor,
  banner: false,
  scale: {
    // 1280×720 çekirdek her ekranda tam görünür; ekran 16:9'dan genişse görünür alan yanlara,
    // darsa üste/alta uzar (EXPAND). Kamera çekirdeği ortalar (`ScreenLayout`), taşan kısım dekor.
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  fps: { target: DISPLAY.targetFps },
  render: {
    antialias: true,
    antialiasGL: !lowPower,
    powerPreference: 'high-performance',
    // Küçük toplu çizim tamponu: mobil GPU'da boşaltma başına tampon kopyası küçük (Faz 2.4).
    batchSize: DISPLAY.batchQuads,
    ...devTools?.renderOverrides(),
  },
  input: { activePointers: TOUCH_POINTERS },
  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    CharacterSelectScene,
    MatchScene,
    TournamentScene,
    TrophyScene,
    ControlsEditorScene,
  ],
});

// Telefon döndürülünce tuval yeni boyuta oturmayabiliyor: kısa gecikmelerle ölçeği yenile.
const refreshScale = (): void => {
  fitGameParent();
  game.scale.refresh();
  for (const ms of PLATFORM.scaleRefreshMs) {
    setTimeout(() => {
      fitGameParent();
      game.scale.refresh();
    }, ms);
  }
};
window.addEventListener('resize', refreshScale);
// Çentik öbür kenara geçti (180° dönüş; pencere boyutu aynı): kap yeniden yerleşir.
onSafeAreaChange(() => {
  fitGameParent();
  game.scale.refresh();
});
window.addEventListener('orientationchange', refreshScale);

// Gamepad API: her karenin başında kollar yoklanır; düğmeler sanal tuş olarak sahnelere düşer.
game.events.on(Phaser.Core.Events.PRE_STEP, () => {
  gamepads.poll();
});

devTools?.installDevTools(game);

// Geliştirici kancası: tarayıcı testleri maç durumunu ve ses sistemini okuyabilsin.
if (wantsDebugOverlay()) {
  Reflect.set(globalThis, DEV.globalGameName, game);
  Reflect.set(globalThis, DEV.globalAudioName, { engine, sfx, crowd, music });
}
