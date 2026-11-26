import { App } from '@capacitor/app';
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { engine } from '../audio/AudioEngine';
import { SYSTEM_CODES } from '../config/gameConfig';
import { pressVirtual, releaseVirtual } from '../input/virtualKeys';
import { IS_NATIVE_APP } from './target';

/**
 * Uygulama yaşam döngüsü (Faz 2.5). Platform olaylarını tek yerde toplar, sesi yönetir ve
 * sahnelere sade olaylar olarak iletir:
 *
 * - **Arka plan:** uygulama arka plana geçince (Android `onPause`; tarayıcıda sekme gizlenince)
 *   ses askıya alınır, `hidden` olayı gelir (maç duraklar ve kaydedilir); öne dönünce `visible`.
 * - **Ses odağı** (yalnızca uygulama, yerel `Interruptions` eklentisi): telefon çağrısı ya da
 *   başka bir oynatıcı sesi alınca ses askıya alınır ve `audioLost` gelir (maç duraklar); geri
 *   gelince ses sürer, maç duraklatılmış kalır. Bildirim sesi gibi kısa kesintide ses kısılır.
 * - **Kulaklık çıkarıldı** (kablolu ya da Bluetooth; Android "becoming noisy"): maç duraklar,
 *   ses hoparlörden patlamasın.
 * - **Düşük bellek** (Android `onTrimMemory`): `lowMemory` gelir; maç kaydedilir, kritik
 *   düzeyde duraklar.
 * - **Geri tuşu:** Android geri tuşu `SYSTEM_CODES.back` sanal tuşuna çevrilir; her ekran onu
 *   kendi Esc/geri davranışıyla işler (`CONTROLS.ui.menuBack`, `CONTROLS.ui.pause`).
 * - **Açılış ekranı:** oyun hazır olana kadar (ana menünün ilk karesi) sistem açılış ekranı kalır
 *   (`MainActivity`: çıkış animasyonu bekletilir; oyun altta tam hızda yüklenir).
 *
 * Web derlemesinde Capacitor paketleri boş modüllere yönlenir (`vite.config.ts`); uygulamaya
 * özgü dallar derleme sabitiyle atılır.
 */
export type AppEvent =
  | { readonly type: 'hidden' }
  | { readonly type: 'visible' }
  | { readonly type: 'audioLost' }
  | { readonly type: 'audioGained' }
  | { readonly type: 'headphonesUnplugged' }
  | { readonly type: 'lowMemory'; readonly critical: boolean };

type Listener = (event: AppEvent) => void;

/** Yerel eklenti (`android/.../LaunchSplashPlugin.java`). */
interface LaunchSplashPlugin {
  hide(): Promise<void>;
}

/** Yerel eklenti (`android/.../InterruptionsPlugin.java`). */
interface InterruptionsPlugin {
  requestAudioFocus(): Promise<void>;
  addListener(
    event: 'audioFocus',
    cb: (e: { readonly state: 'lost' | 'gained' | 'duck' }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(event: 'noisy', cb: () => void): Promise<PluginListenerHandle>;
  addListener(
    event: 'memory',
    cb: (e: { readonly critical: boolean }) => void,
  ): Promise<PluginListenerHandle>;
}

const listeners = new Set<Listener>();
let installed = false;
let nativePaused = false;
let pageHidden = false;
let hidden = false;
let focusLost = false;
let splashHidden = false;
let plugin: InterruptionsPlugin | null = null;

/** Gerçek Android uygulamasında mıyız? (Mobil derleme tarayıcıda da açılabilir: duman testi.) */
function isNative(): boolean {
  return IS_NATIVE_APP && Capacitor.isNativePlatform();
}

/** Olay dinleyicisi ekler; dönen işlev dinleyiciyi kaldırır (sahne kapanınca). */
export function onAppEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(event: AppEvent): void {
  for (const l of [...listeners]) l(event);
}

/** Uygulama şu an arka planda mı (ya da sekme gizli mi)? */
export function isAppHidden(): boolean {
  return hidden;
}

/** Ses odağı başka uygulamada mı (çağrı sürüyor olabilir)? */
export function isAudioFocusLost(): boolean {
  return focusLost;
}

function refreshHidden(): void {
  const now = nativePaused || pageHidden || document.hidden;
  if (now === hidden) return;
  hidden = now;
  engine.setHold('background', now);
  emit({ type: now ? 'hidden' : 'visible' });
}

function setFocusLost(lost: boolean): void {
  engine.setDucked(false);
  if (lost === focusLost) return;
  focusLost = lost;
  engine.setHold('focus', lost);
  emit({ type: lost ? 'audioLost' : 'audioGained' });
}

/** Android geri tuşu: bir kez basılıp bırakılan sanal tuş (sahnelerin izleyicisi yakalar). */
function pressSystemBack(): void {
  pressVirtual(SYSTEM_CODES.back);
  releaseVirtual(SYSTEM_CODES.back);
}

/** Açılışta bir kez (`main.ts`). */
export function installLifecycle(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('visibilitychange', refreshHidden);
  // Sayfa kapanırken (sekme kapatma, gezinme) görünürlük olayı her tarayıcıda gelmeyebilir.
  window.addEventListener('pagehide', () => {
    pageHidden = true;
    refreshHidden();
  });
  window.addEventListener('pageshow', () => {
    pageHidden = false;
    refreshHidden();
  });
  if (!isNative()) return;

  const ignore = (): undefined => undefined;
  void App.addListener('pause', () => {
    nativePaused = true;
    refreshHidden();
  }).catch(ignore);
  void App.addListener('resume', () => {
    nativePaused = false;
    refreshHidden();
  }).catch(ignore);
  // Dinleyici varken Capacitor geri tuşunda hiçbir şey yapmaz (uygulamayı kapatmaz); her ekranın
  // davranışı sahnede, ana menüde çıkış onayı (`exitApp`).
  void App.addListener('backButton', pressSystemBack).catch(ignore);

  plugin = registerPlugin<InterruptionsPlugin>('Interruptions');
  void plugin
    .addListener('audioFocus', (e) => {
      if (e.state === 'duck') engine.setDucked(true);
      else setFocusLost(e.state === 'lost');
    })
    .catch(ignore);
  void plugin
    .addListener('noisy', () => {
      emit({ type: 'headphonesUnplugged' });
    })
    .catch(ignore);
  void plugin
    .addListener('memory', (e) => {
      emit({ type: 'lowMemory', critical: e.critical });
    })
    .catch(ignore);
}

/**
 * Ses odağını yeniden iste (maça devam edilirken): kesinti bitmiş ama sistem odağı geri
 * vermediyse (başka bir oynatıcı aldıysa) oyuncunun "Devam"ı sesi geri getirir.
 */
export function reclaimAudio(): void {
  if (!focusLost || !plugin) return;
  plugin.requestAudioFocus().catch(() => undefined);
}

/**
 * Oyun hazır (ana menünün ya da geri yüklenen maçın ilk karesi çizildi): yerel açılış ekranı
 * söner. Birden çok çağrı zararsız; tarayıcıda hiçbir şey yapmaz.
 */
export function hideSplash(): void {
  if (splashHidden) return;
  splashHidden = true;
  if (!isNative()) return;
  registerPlugin<LaunchSplashPlugin>('LaunchSplash')
    .hide()
    .catch(() => undefined);
}

/** Ana menüdeki çıkış onayından sonra uygulamayı kapat (yalnızca uygulamada). */
export function exitApp(): void {
  if (!isNative()) return;
  App.exitApp().catch(() => undefined);
}

/** Uygulamadan çıkılabilir mi? (Tarayıcıda sayfa kapatılamaz: ana menüde geri tuşu yok sayılır.) */
export function canExitApp(): boolean {
  return isNative();
}
