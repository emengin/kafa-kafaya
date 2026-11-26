import { DEV, TOUCH } from '../config/gameConfig';

/**
 * Dokunmatik cihaz algılama (Faz 6). Kaba işaretçi (`pointer: coarse`, telefon/tablet), ilk
 * gerçek dokunuş ya da `?touch=1` → dokunmatik. Algılanınca `<html>`'e `is-touch` sınıfı eklenir
 * (dikey ekran uyarısı CSS'i buna bağlı) ve dinleyiciler çağrılır (maçta butonlar belirir).
 */
const listeners = new Set<() => void>();
let touch = false;

function forced(): boolean {
  return new URLSearchParams(globalThis.location.search).get(DEV.touchParam) === '1';
}

function mark(): void {
  if (touch) return;
  touch = true;
  document.documentElement.classList.add('is-touch');
  for (const fn of listeners) fn();
}

export function initDeviceDetection(): void {
  const coarse = globalThis.matchMedia('(pointer: coarse)').matches;
  if (coarse || forced()) mark();
  globalThis.addEventListener('touchstart', mark, { passive: true, once: true });
}

export function isTouchDevice(): boolean {
  return touch;
}

/** Dokunmatik sonradan algılanırsa (ör. dokunmatik ekranlı dizüstü) çağrılır. */
export function onTouchDetected(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Dikey ekran mı? (Dokunmatikte maç duraklatılır, "yan çevir" uyarısı görünür.) */
export function isPortrait(): boolean {
  return globalThis.innerHeight > globalThis.innerWidth;
}

/**
 * Ekranın köşegeni (inç). Android ve iOS'ta `screen` boyutu CSS px = dp (1/160 inç) cinsinden;
 * masaüstünde yaklaşık değer verir (yalnızca telefon/tablet ayrımı için kullanılır).
 */
export function screenDiagonalInch(): number {
  const s = globalThis.screen as Screen | undefined;
  if (!s) return 0;
  return Math.hypot(s.width, s.height) / DP_PER_INCH;
}

/**
 * Yerel 2 oyuncuda dokunmatik düzen açık mı (Faz 2.3, GAME_DESIGN_MOBILE §7.7)? Ekran
 * `TOUCH.twoPlayer.minDiagonalInch`'ten küçükse P2 yalnızca gamepad ya da klavyeyle oynar.
 */
export function twoPlayerTouchAllowed(): boolean {
  return screenDiagonalInch() >= TOUCH.twoPlayer.minDiagonalInch;
}

const DP_PER_INCH = 160;
