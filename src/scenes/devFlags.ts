import { DEV, type AiDifficulty } from '../config/gameConfig';
import { isDifficulty } from '../game/matchSetup';

function params(): URLSearchParams {
  return new URLSearchParams(globalThis.location.search);
}

/** `?scene=match` (ya da `?cpu=…`) → menüyü atla, doğrudan maça gir (geliştirme kısayolu). */
export function wantsDirectMatch(): boolean {
  const p = params();
  return (
    p.get(DEV.sceneParam) === DEV.matchSceneValue || p.has(DEV.cpuParam) || p.has(DEV.cpu1Param)
  );
}

/** `?debug=1` → debug katmanı açık başlar. */
export function wantsDebugOverlay(): boolean {
  return params().get(DEV.debugParam) === DEV.debugOnValue;
}

/** `?cpu=…`, `?cpu1=…`, `?seed=N` → CPU maçı, AI vs AI ve AI tohumu (geçersizse yok sayılır). */
export function devAiFlags(): {
  cpu: AiDifficulty | null;
  cpu1: AiDifficulty | null;
  seed: number | null;
} {
  const p = params();
  const cpu = p.get(DEV.cpuParam);
  const cpu1 = p.get(DEV.cpu1Param);
  const rawSeed = p.get(DEV.seedParam);
  const seed = rawSeed === null ? Number.NaN : Number(rawSeed);
  return {
    cpu: isDifficulty(cpu) ? cpu : null,
    cpu1: isDifficulty(cpu1) ? cpu1 : null,
    seed: Number.isInteger(seed) ? seed : null,
  };
}

/** `?duration=N` → maç süresi N sn (pozitif sayı değilse yok sayılır). */
export function devMatchDuration(): number | undefined {
  const raw = params().get(DEV.durationParam);
  if (raw === null) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}
