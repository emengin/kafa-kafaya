import { LIFECYCLE, STORAGE } from '../config/gameConfig';
import { resolveMatchSetup, type MatchSetup } from '../game/matchSetup';
import type { SimState } from '../game/simState';
import { isRecord, removeKey, type KeyValueStore } from './store';

/**
 * Yarım kalan maçın kaydı (Faz 2.5). Uygulama arka plana geçerken (ya da düşük bellek uyarısında)
 * maç sahnesi simülasyonun tam durumunu (`GameSim.saveState`) buraya yazar. Android süreci arka
 * planda kapatırsa (bellek için) ya da WebView'ın çizici süreci ölürse, oyun yeniden açılınca maç
 * kaldığı yerden, duraklatılmış olarak açılır. Uygulama öne dönünce (süreç yaşıyorsa) ve maç
 * bitince kayıt silinir; açılışta okunan kayıt da silinir (bozuk kayıt açılış döngüsüne sokmasın).
 *
 * Biçim JSON; `Infinity` (antrenmanın süresiz saati), `NaN` ve `-0` JSON'da kaybolduğu için
 * etiketli nesne olarak yazılır. Böylece geri yüklenen durum bit düzeyinde aynıdır (test).
 * Farklı sürümün kaydı okunmaz (durum alanları değişmiş olabilir).
 */
export interface MatchResume {
  readonly setup: MatchSetup;
  /** Maçın tohumu (simülasyon ve yapay zekâ tohumları buradan türetilir). */
  readonly seed: number;
  readonly state: SimState;
}

/** Kayıt biçiminin sürümü (alanlar değişirse artırılır). */
const FORMAT = 1;
const KEY = STORAGE.keys.matchResume;
const NUM_TAG = '$num';
const SPECIAL: Readonly<Record<string, number>> = {
  NaN: Number.NaN,
  Infinity: Number.POSITIVE_INFINITY,
  '-Infinity': Number.NEGATIVE_INFINITY,
  '-0': -0,
};

function encodeNumber(_key: string, value: unknown): unknown {
  if (typeof value !== 'number') return value;
  if (Number.isNaN(value)) return { [NUM_TAG]: 'NaN' };
  if (value === Number.POSITIVE_INFINITY) return { [NUM_TAG]: 'Infinity' };
  if (value === Number.NEGATIVE_INFINITY) return { [NUM_TAG]: '-Infinity' };
  if (Object.is(value, -0)) return { [NUM_TAG]: '-0' };
  return value;
}

function decodeNumber(_key: string, value: unknown): unknown {
  if (!isRecord(value)) return value;
  const tag = value[NUM_TAG];
  if (typeof tag !== 'string' || Object.keys(value).length !== 1) return value;
  return tag in SPECIAL ? SPECIAL[tag] : value;
}

/** Özel sayıları koruyarak JSON'a çevirir (testlerde de kullanılır). */
export function encodeResume(value: unknown): string {
  return JSON.stringify(value, encodeNumber);
}

/** `encodeResume` çıktısını geri çevirir; ayrıştırılamazsa `undefined`. */
export function decodeResume(raw: string): unknown {
  try {
    return JSON.parse(raw, decodeNumber) as unknown;
  } catch {
    return undefined;
  }
}

const isNum = (v: unknown): v is number => typeof v === 'number';
const isPair = (v: unknown): boolean => Array.isArray(v) && v.length === 2;

/** Kabaca şekil denetimi: `loadState`'in okuduğu alanlar var mı? (Ayrıntı simülasyonda.) */
function isSimStateShape(v: unknown): v is SimState {
  if (!isRecord(v) || !isRecord(v.match) || !isRecord(v.ball)) return false;
  const m = v.match;
  return (
    isNum(v.tick) &&
    isNum(v.rngState) &&
    isNum(v.balloonTimer) &&
    typeof v.solo === 'boolean' &&
    typeof m.phase === 'string' &&
    isNum(m.timeLeft) &&
    isPair(m.score) &&
    isPair(v.players) &&
    (v.players as unknown[]).every(isRecord) &&
    isPair(v.goalMouths) &&
    Array.isArray(v.decoys)
  );
}

export function saveMatchResume(
  store: KeyValueStore,
  resume: MatchResume,
  now: number,
  appVersion: string,
): void {
  try {
    store.set(KEY, encodeResume({ v: FORMAT, app: appVersion, savedAt: now, ...resume }));
  } catch {
    // Kota dolu / depo yok: kayıt alınamazsa maç yalnızca bellekte sürer.
  }
}

export function clearMatchResume(store: KeyValueStore): void {
  removeKey(store, KEY);
}

/**
 * Geçerli kaydı okur ve siler (bir kez kullanılır). Yoksa, bozuksa, başka sürümdense ya da
 * `LIFECYCLE.resumeMaxAgeMs`'den eskiyse `null`.
 */
export function takeMatchResume(
  store: KeyValueStore,
  now: number,
  appVersion: string,
): MatchResume | null {
  let raw: string | null;
  try {
    raw = store.get(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  clearMatchResume(store);
  const data = decodeResume(raw);
  if (!isRecord(data) || data.v !== FORMAT || data.app !== appVersion) return null;
  const { savedAt, seed, state } = data;
  if (!isNum(savedAt) || Math.abs(now - savedAt) > LIFECYCLE.resumeMaxAgeMs) return null;
  if (!isNum(seed) || !Number.isFinite(seed) || !isSimStateShape(state)) return null;
  if (!isRecord(data.setup)) return null;
  const setup = resolveMatchSetup(data.setup, { cpu: null, cpu1: null, seed: null });
  // Kurulum varsayılana düştüyse (bilinmeyen mod) kayıt bu sürüme ait değildir.
  if (setup.mode !== data.setup.mode) return null;
  return { setup, seed, state };
}
