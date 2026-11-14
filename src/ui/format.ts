import { UNITS } from '../config/gameConfig';

const SECONDS_PER_MINUTE = UNITS.secondsPerMinute;

/**
 * Geri sayım saatini "d:ss" biçiminde verir. Yukarı yuvarlar: 89,2 sn → "1:30", yani saat
 * "0:00"ı yalnızca süre gerçekten bittiğinde gösterir.
 */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds - UNITS.clockEpsilonSeconds));
  const minutes = Math.floor(total / SECONDS_PER_MINUTE);
  const rest = total % SECONDS_PER_MINUTE;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

/** Saatin gösterdiği tam saniye (nabız efektinin her saniye bir kez tetiklenmesi için). */
export function displayedSecond(seconds: number): number {
  return Math.max(0, Math.ceil(seconds - UNITS.clockEpsilonSeconds));
}
