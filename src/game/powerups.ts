import { POWERUPS, type PowerUpType } from '../config/gameConfig';
import type { SeededRandom } from './ai/random';
import { POWER_UP_TYPES } from './entities/Player';

/**
 * Süzülen güçlendirici balonu. Hareketi kapalı biçimli bir salınımdır (yaşa bağlı sinüsler):
 * deterministik ve ekranda görünen bilgiyle (merkez, evre, yaş) kestirilebilir — yapay zekâ da
 * balonun gelecekteki konumunu aynı fonksiyonla hesaplar.
 */
export interface Balloon {
  readonly type: PowerUpType;
  readonly cx: number;
  readonly cy: number;
  /** Yatay salınımın başlangıç evresi (rad). */
  readonly phase: number;
  /** Belirdiğinden beri geçen süre (sn). */
  age: number;
}

const TWO_PI = Math.PI * 2;

/** Balonun `age` yaşındaki merkezi. */
export function balloonPosition(b: Balloon, age: number = b.age): { x: number; y: number } {
  const c = POWERUPS.balloon;
  return {
    x: b.cx + c.swayXPx * Math.sin(TWO_PI * c.swayXHz * age + b.phase),
    y: b.cy + c.swayYPx * Math.sin(TWO_PI * c.swayYHz * age),
  };
}

/** Yeni bir balon: tip ve konum tohumlu rastgelelikten. */
export function spawnBalloon(rng: SeededRandom): Balloon {
  const c = POWERUPS.balloon;
  const index = Math.min(POWER_UP_TYPES.length - 1, Math.floor(rng.next() * POWER_UP_TYPES.length));
  return {
    type: POWER_UP_TYPES[index] ?? 'speed',
    cx: rng.range(c.minX, c.maxX),
    cy: rng.range(c.minY, c.maxY),
    phase: rng.range(0, TWO_PI),
    age: 0,
  };
}

/** Topun (merkez, yarıçap) balona değip değmediği. */
export function ballHitsBalloon(
  b: Balloon,
  ballX: number,
  ballY: number,
  ballRadius: number,
  age: number = b.age,
): boolean {
  const p = balloonPosition(b, age);
  const r = POWERUPS.balloon.radius + ballRadius;
  const dx = ballX - p.x;
  const dy = ballY - p.y;
  return dx * dx + dy * dy < r * r;
}

/**
 * Güçlendiricinin süresi. Kazanan oyuncunun sayacına yazılır; etkisi (kendi kafası, rakibin
 * kafası, rakip kalesi…) GameSim'de bu sayaçtan türetilir.
 */
export function powerUpDuration(type: PowerUpType): number {
  return POWERUPS.durations[type];
}
