import type Phaser from 'phaser';
import type { GameSim, GameSimOptions } from '../game/GameSim';
import type { InputState } from '../input/InputState';
import type { MatchSetup } from '../game/matchSetup';
import type { TextMenuItem } from '../ui/TextMenu';

/**
 * Geliştirici araçlarının kanca kaydı (Faz 2.4). Bu dosya her derlemede vardır ama boştur:
 * kancaları yalnızca geliştirici derlemesindeki `src/dev/install.ts` doldurur. Yayın
 * derlemesinde alanlar `null` kalır; sahneler yalnızca `devHooks.x?.(…)` çağırır.
 */

/** Maç sahnesinin geliştirici araçlarına verdiği bağlam. */
export interface MatchDevContext {
  readonly scene: Phaser.Scene;
  readonly sim: GameSim;
  /** Canlı simülasyonun kurulumu (rollback ölçerin gölge simülasyonu aynısıyla kurulur). */
  readonly simOptions: GameSimOptions;
  /** Dünya kabı (sarsıntı ve zoom'la birlikte hareket eder) ve stadyum katmanı. */
  readonly world: Phaser.GameObjects.Container;
  readonly stage: Phaser.GameObjects.Container;
  /** Oyuncuların çizim konumu (enterpole), stres sahnesindeki vekil karakterler için. */
  readonly playerPosition: (index: 0 | 1) => { readonly x: number; readonly y: number };
}

/** Bir maçın geliştirici oturumu (stres sahnesi, rollback ölçer). */
export interface MatchDevSession {
  /** Canlı adımdan önce (girdiler okunduktan sonra). */
  beforeStep(a: InputState, b: InputState): void;
  /** Canlı simülasyonun ilerlediği her karenin sonunda (gol tekrarında çağrılmaz). */
  frame(dt: number, time: number): void;
  destroy(): void;
}

export interface DevHooks {
  /** Maç açılırken; oturum gerekmiyorsa null döner. */
  match: ((ctx: MatchDevContext) => MatchDevSession | null) | null;
  /** Maç bu kurulumla mı başlatılsın? (stres testi menüden istenmişse) — bir kez okunur. */
  pendingSetup: (() => MatchSetup | null) | null;
  /** Ayarlar → Kontroller menüsüne eklenecek geliştirici öğeleri. */
  menuItems: ((startMatch: (setup: MatchSetup) => void) => TextMenuItem[]) | null;
  /** Uyarlamalı kalite kademesi değişince (grafikte gösterilir). */
  quality: ((level: number) => void) | null;
}

export const devHooks: DevHooks = {
  match: null,
  pendingSetup: null,
  menuItems: null,
  quality: null,
};
