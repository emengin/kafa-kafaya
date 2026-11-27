import { POWERUPS, type PowerUpType } from '../config/gameConfig';
import { dsin } from '../physics';
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

/** Balon merkezinin `age` yaşındaki x'i. */
export function balloonX(b: Balloon, age: number = b.age): number {
  const c = POWERUPS.balloon;
  return b.cx + c.swayXPx * dsin(TWO_PI * c.swayXHz * age + b.phase);
}

/** Balon merkezinin `age` yaşındaki y'si. */
export function balloonY(b: Balloon, age: number = b.age): number {
  const c = POWERUPS.balloon;
  return b.cy + c.swayYPx * dsin(TWO_PI * c.swayYHz * age);
}

/** Balonun `age` yaşındaki merkezi. */
export function balloonPosition(b: Balloon, age: number = b.age): { x: number; y: number } {
  return { x: balloonX(b, age), y: balloonY(b, age) };
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
  // Alt adım başına çağrılır: konum nesnesi kurmadan (bellek ayırmasız).
  const r = POWERUPS.balloon.radius + ballRadius;
  const dx = ballX - balloonX(b, age);
  const dy = ballY - balloonY(b, age);
  return dx * dx + dy * dy < r * r;
}

/**
 * Güçlendiricinin süresi. Kazanan oyuncunun sayacına yazılır; etkisi (kendi kafası, rakibin
 * kafası, rakip kalesi…) GameSim'de bu sayaçtan türetilir.
 */
export function powerUpDuration(type: PowerUpType): number {
  return POWERUPS.durations[type];
}
