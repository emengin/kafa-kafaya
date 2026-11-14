import Phaser from 'phaser';
import { SceneKeys } from './sceneKeys';

/** İlk sahne: global ayarları yapar ve hemen Preload'a geçer. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create(): void {
    // Sağ tık menüsü oyun alanında görünmesin.
    this.input.mouse?.disableContextMenu();
    this.scene.start(SceneKeys.Preload);
  }
}
