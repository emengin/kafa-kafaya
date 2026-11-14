import { AUDIO, STORAGE } from '../config/gameConfig';

/** Ses düzeyleri (0–1): ana, efekt (kalabalık dahil), müzik. */
export interface VolumeSettings {
  master: number;
  sfx: number;
  music: number;
}

export type VolumeChannel = keyof VolumeSettings;

export const VOLUME_CHANNELS: readonly VolumeChannel[] = ['master', 'sfx', 'music'];

/** Kalıcı kayıt arayüzü (testlerde sahte depo verilebilir). */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

const KEYS: Readonly<Record<VolumeChannel, string>> = {
  master: STORAGE.keys.volumeMaster,
  sfx: STORAGE.keys.volumeSfx,
  music: STORAGE.keys.volumeMusic,
};

/** Değeri 0–1 aralığına ve %10 adımlarına oturtur. */
export function snapVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const step = AUDIO.volumeStep;
  const steps = Math.round(Math.min(1, Math.max(0, value)) / step);
  return Math.round(steps * step * PERCENT) / PERCENT;
}
const PERCENT = 100;

/** Bir adım artır/azalt (sınırlarda durur). */
export function stepVolume(value: number, dir: 1 | -1): number {
  return snapVolume(value + dir * AUDIO.volumeStep);
}

/** Bir adım artır; %100'den sonra %0'a döner (fareyle tıklama). */
export function cycleVolume(value: number): number {
  return value >= 1 - AUDIO.volumeStep / 2 ? 0 : stepVolume(value, 1);
}

export function formatPercent(value: number): string {
  return `${Math.round(value * PERCENT)}%`;
}

export function loadVolumes(store: KeyValueStore): VolumeSettings {
  const read = (ch: VolumeChannel): number => {
    const raw = store.get(KEYS[ch]);
    const value = raw === null ? Number.NaN : Number(raw);
    return Number.isFinite(value) ? snapVolume(value) : AUDIO.defaults[ch];
  };
  return { master: read('master'), sfx: read('sfx'), music: read('music') };
}

export function saveVolumes(store: KeyValueStore, v: VolumeSettings): void {
  for (const ch of VOLUME_CHANNELS) store.set(KEYS[ch], String(snapVolume(v[ch])));
}
