import { engine } from '../audio/AudioEngine';
import { cycleVolume, formatPercent, stepVolume, type VolumeChannel } from '../audio/settings';
import { sfx } from '../audio/Sfx';
import { t, type StringKey } from '../i18n';
import type { TextMenuItem } from './TextMenu';

const LABELS: Readonly<Record<VolumeChannel, StringKey>> = {
  master: 'settings.master',
  sfx: 'settings.sfx',
  music: 'settings.music',
};

/**
 * Ses ayarları menü öğeleri (ana menü ve duraklatma menüsü ortak): Ana ses / Efektler / Müzik
 * (←/→ ile %10 adım, Enter/tıklama ile döngü) ve Geri. Değişiklik hemen duyulur ve kaydedilir.
 */
export function volumeMenuItems(onBack: () => void): TextMenuItem[] {
  const channels: VolumeChannel[] = ['master', 'sfx', 'music'];
  const items: TextMenuItem[] = channels.map((ch) => ({
    label: () => `${t(LABELS[ch])}   ◄ ${formatPercent(engine.settings[ch])} ►`,
    onAdjust: (dir) => {
      engine.setVolumes({ ...engine.settings, [ch]: stepVolume(engine.settings[ch], dir) });
      if (ch !== 'music') sfx.kick(PREVIEW_POWER);
    },
    onSelect: () => {
      engine.setVolumes({ ...engine.settings, [ch]: cycleVolume(engine.settings[ch]) });
    },
  }));
  items.push({ label: t('menu.back'), onSelect: onBack });
  return items;
}

/** Ses düzeyi değişince duyulan örnek vuruşun gücü. */
const PREVIEW_POWER = 0.5;
