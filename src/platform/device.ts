import { DEV } from '../config/gameConfig';

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
