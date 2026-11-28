import { DEV, QUALITY, type AiDifficulty } from '../config/gameConfig';
import { parseQuality, type QualityLevel } from '../fx/feel';
import { isCharacterId, type CharacterId } from '../game/characters';
import { isDifficulty } from '../game/matchSetup';
import type { HitStopMode } from '../ui/PresentationTimeline';

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

/**
 * `?cpu=…`, `?cpu1=…`, `?seed=N`, `?c1=…&c2=…` → CPU maçı, AI vs AI, AI tohumu ve karakterler
 * (geçersizse yok sayılır).
 */
export function devAiFlags(): {
  cpu: AiDifficulty | null;
  cpu1: AiDifficulty | null;
  seed: number | null;
  c1: CharacterId | null;
  c2: CharacterId | null;
} {
  const p = params();
  const cpu = p.get(DEV.cpuParam);
  const cpu1 = p.get(DEV.cpu1Param);
  const rawSeed = p.get(DEV.seedParam);
  const seed = rawSeed === null ? Number.NaN : Number(rawSeed);
  const c1 = p.get(DEV.char1Param);
  const c2 = p.get(DEV.char2Param);
  return {
    cpu: isDifficulty(cpu) ? cpu : null,
    cpu1: isDifficulty(cpu1) ? cpu1 : null,
    seed: Number.isInteger(seed) ? seed : null,
    c1: isCharacterId(c1) ? c1 : null,
    c2: isCharacterId(c2) ? c2 : null,
  };
}

/** `?duration=N` → maç süresi N sn (pozitif sayı değilse yok sayılır). */
export function devMatchDuration(): number | undefined {
  const raw = params().get(DEV.durationParam);
  if (raw === null) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/** `?quality=low|medium|high` → görsel kalite sabitlenir (yoksa null: uyarlamalı). */
export function devQuality(): QualityLevel | null {
  return parseQuality(params().get(QUALITY.param));
}

/**
 * Hit-stop biçimi (Faz 2.7 prototipi): geliştirici menüsünde seçilen (`setDevHitStopMode`) ya da
 * `?hitstop=rate|snap|off`; ikisi de yoksa null (ayar dosyasındaki varsayılan).
 */
export function devHitStopMode(): HitStopMode | null {
  if (chosenHitStop) return chosenHitStop;
  const v = params().get(DEV.hitStopParam);
  return v === 'rate' || v === 'snap' || v === 'off' ? v : null;
}

let chosenHitStop: HitStopMode | null = null;

/** Geliştirici menüsü (Ayarlar → Kontroller) hit-stop biçimini oturum boyunca değiştirir. */
export function setDevHitStopMode(mode: HitStopMode | null): void {
  chosenHitStop = mode;
}
