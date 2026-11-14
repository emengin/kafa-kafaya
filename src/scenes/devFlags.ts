import { DEV } from '../config/gameConfig';

function params(): URLSearchParams {
  return new URLSearchParams(globalThis.location.search);
}

/** `?scene=match` → menüyü atla, doğrudan maça gir (geliştirme kısayolu). */
export function wantsDirectMatch(): boolean {
  return params().get(DEV.sceneParam) === DEV.matchSceneValue;
}

/** `?debug=1` → debug katmanı açık başlar. */
export function wantsDebugOverlay(): boolean {
  return params().get(DEV.debugParam) === DEV.debugOnValue;
}

/** `?duration=N` → maç süresi N sn (pozitif sayı değilse yok sayılır). */
export function devMatchDuration(): number | undefined {
  const raw = params().get(DEV.durationParam);
  if (raw === null) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}
