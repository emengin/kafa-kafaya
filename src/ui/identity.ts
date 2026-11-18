import Phaser from 'phaser';
import { ACCESSIBILITY, HUD } from '../config/gameConfig';
import type { PlayerIndex } from '../game/types';
import { getSettings } from '../save/gameSettings';

/**
 * Oyuncu kimlik renkleri (HUD isimleri, kafa üstü etiketleri, seçim imleçleri, ağaçta oyuncu
 * çerçevesi). Renk körü modunda (Faz 7) Okabe–Ito turuncu/mavi çiftine döner ve etiketlere
 * şekil eklenir: kimlik renk dışında da okunur.
 */
export function playerColorHex(i: PlayerIndex): string {
  const colors = getSettings().colorblind ? ACCESSIBILITY.colorblindPlayerColors : HUD.playerColors;
  return colors[i];
}

export function playerColor(i: PlayerIndex): number {
  return Phaser.Display.Color.HexStringToColor(playerColorHex(i)).color;
}

/** Renk körü modunda etiket öneki ("▲ ", "● "); kapalıyken boş. */
export function playerMark(i: PlayerIndex): string {
  return getSettings().colorblind ? `${ACCESSIBILITY.colorblindMarks[i]} ` : '';
}
