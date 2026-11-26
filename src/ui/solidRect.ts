import type Phaser from 'phaser';

/** Phaser'ın her oyunda hazır kurduğu düz beyaz doku. */
const WHITE_TEXTURE = '__WHITE';

/**
 * Düz renkli dikdörtgen (Faz 2.4): Phaser `Rectangle` yerine beyaz doku + renk tonu.
 *
 * Phaser 4'te `Rectangle` ayrı bir toplu çiziciyle (FillRect → BatchHandlerTriFlat) çizilir;
 * resimlerle iç içe olunca her geçişte toplu çizim boşalır (mobil GPU'da köşe tamponu kopyası).
 * Resim ise diğer resimlerle aynı toplu çizime girer. Bir fark daha: saydamlığı 0 olan resim hiç
 * çizilmez, `Rectangle` ise dolgu saydamlığı 0 iken de her karede çizilir (saydam bir tam ekran
 * flaş, her karede boşuna tam ekran doldurma demekti).
 *
 * Renk `setTint`, saydamlık `setAlpha`, boyut `setDisplaySize` ile değişir (tween'lerde `alpha`).
 */
export function solidRect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
  alpha = 1,
): Phaser.GameObjects.Image {
  return scene.add
    .image(x, y, WHITE_TEXTURE)
    .setDisplaySize(width, height)
    .setTint(color)
    .setAlpha(alpha);
}
