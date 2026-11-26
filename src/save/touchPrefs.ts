import { STORAGE, TOUCH } from '../config/gameConfig';
import { storage } from '../game/storage';
import {
  buttonRadius,
  DEFAULT_TOUCH_PREFS,
  defaultPlacements,
  GAME_BUTTONS,
  insideBounds,
  placementsValid,
  type ButtonPlacement,
  type GameButtonId,
  type TouchPrefs,
} from '../input/touchLayout';
import { isRecord, readJson, writeJson, type KeyValueStore } from './store';

/**
 * Dokunmatik kontrol düzeni kaydı (Faz 2.3): buton konumları ve boyutları (tasarım çerçevesinde,
 * sağ el düzeninde), opaklık, solak modu. Ayrı anahtarda (`touchLayout`) JSON.
 *
 * Konumlar yalnızca oyuncu düzenleyicide bir şeyi taşıdı ya da büyüttüyse saklanır (`custom`);
 * yoksa her cihazda ekrana göre büyütülen varsayılan kullanılır (`effectivePlacements`). Eski
 * kayıtlarda `placements` varsa düzen oyuncunun sayılır.
 *
 * Doğrulama: opaklık `opacityLevels`'tan biri, boyut aralıkta ve adıma yuvarlı; buton sınırların
 * dışındaysa o buton varsayılana döner. Düzen bütünüyle geçersizse (çakışan butonlar) tüm
 * konumlar varsayılana döner: bozuk kayıt oynanamayan bir düzen üretmez.
 */
export function parseTouchPrefs(value: unknown): TouchPrefs {
  const v = isRecord(value) ? value : {};
  const levels: readonly number[] = TOUCH.opacityLevels;
  const opacity =
    typeof v.opacity === 'number' && levels.includes(v.opacity)
      ? v.opacity
      : DEFAULT_TOUCH_PREFS.opacity;
  const leftHanded =
    typeof v.leftHanded === 'boolean' ? v.leftHanded : DEFAULT_TOUCH_PREFS.leftHanded;
  const raw = isRecord(v.placements) ? v.placements : null;
  const defaults = defaultPlacements();
  const placements = {} as Record<GameButtonId, ButtonPlacement>;
  for (const id of GAME_BUTTONS) placements[id] = parsePlacement(raw?.[id], id) ?? defaults[id];
  const custom = raw !== null && placementsValid(placements);
  return { placements: custom ? placements : defaults, custom, opacity, leftHanded };
}

function parsePlacement(value: unknown, id: GameButtonId): ButtonPlacement | null {
  if (!isRecord(value)) return null;
  const { x, y, scale } = value;
  if (typeof x !== 'number' || typeof y !== 'number' || typeof scale !== 'number') return null;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(scale)) return null;
  const s = snapScale(scale);
  if (!insideBounds(x, y, buttonRadius(id, s))) return null;
  return { x, y, scale: s };
}

/** Boyutu aralığa kırpar ve adıma yuvarlar (0,7 – 1,4, 0,1 adım). */
export function snapScale(scale: number): number {
  const { minScale, maxScale, scaleStep } = TOUCH.editor;
  const steps = Math.round((scale - minScale) / scaleStep);
  const snapped = minScale + steps * scaleStep;
  return Math.round(Math.min(Math.max(snapped, minScale), maxScale) * SCALE_DIGITS) / SCALE_DIGITS;
}

/** Ölçek değerleri iki ondalığa yuvarlanır (0,1 adımlarının kayan nokta hatası birikmesin). */
const SCALE_DIGITS = 100;

export function loadTouchPrefs(store: KeyValueStore): TouchPrefs {
  return parseTouchPrefs(readJson(store, STORAGE.keys.touchLayout));
}

/** Kayıt biçimi: konumlar yalnızca oyuncunun düzeniyse. */
function toJson(prefs: TouchPrefs): Record<string, unknown> {
  const base = { opacity: prefs.opacity, leftHanded: prefs.leftHanded };
  return prefs.custom ? { ...base, placements: prefs.placements } : base;
}

export function saveTouchPrefs(store: KeyValueStore, prefs: TouchPrefs): void {
  writeJson(store, STORAGE.keys.touchLayout, toJson(prefs));
}

let current: TouchPrefs | null = null;

/** Etkin düzen (ilk çağrıda kayıttan okunur). */
export function getTouchPrefs(): TouchPrefs {
  current ??= loadTouchPrefs(storage);
  return current;
}

/** Düzeni doğrular, etkin yapar ve kaydeder. */
export function setTouchPrefs(prefs: TouchPrefs): TouchPrefs {
  const next = parseTouchPrefs(toJson(prefs));
  current = next;
  saveTouchPrefs(storage, next);
  return next;
}
