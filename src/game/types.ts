import type { PowerUpType, SuperType } from '../config/gameConfig';
import type { StaticKind } from './pitch';

/** 0 = P1 (sol, sağa bakar), 1 = P2 (sağ, sola bakar). */
export type PlayerIndex = 0 | 1;

/** Bakış yönü: +1 sağ, −1 sol. */
export type Facing = 1 | -1;

/** Maçın nasıl bittiği: normal süre sonunda mı, altın golle mi. */
export type MatchEndReason = 'time' | 'goldenGoal';

/** Simülasyonun bir adımda ürettiği olaylar (ses, efekt, HUD için). */
export type SimEvent =
  /** `super`: vuruş süper miydi (bar doluyken Süper ile hazırlanmış). */
  | {
      readonly type: 'kick';
      readonly player: PlayerIndex;
      readonly speed: number;
      readonly super: boolean;
    }
  | {
      readonly type: 'header';
      readonly player: PlayerIndex;
      readonly speed: number;
      readonly super: boolean;
    }
  /** Oyuncu dolu barla Süper'e bastı: bir sonraki vuruşu süper olacak. */
  | { readonly type: 'superArmed'; readonly player: PlayerIndex }
  /** Süper şut atıldı (şut ya da kafa). */
  | { readonly type: 'superLaunch'; readonly player: PlayerIndex; readonly superType: SuperType }
  /**
   * Süper şut rakibe etki etti: `player` etkilenen oyuncu (Buz → dondu, Ateş → savruldu,
   * Sarsıntı → zıplayamıyor).
   */
  | { readonly type: 'superHit'; readonly player: PlayerIndex; readonly superType: SuperType }
  /** Işınlanan top yeniden belirdi. */
  | { readonly type: 'teleportExit'; readonly x: number; readonly y: number }
  /** Güçlendirici balonu belirdi. */
  | { readonly type: 'balloonSpawn'; readonly powerUp: PowerUpType }
  /** Balon patladı; `player` güçlendiriciyi kazandı. */
  | { readonly type: 'balloonPop'; readonly player: PlayerIndex; readonly powerUp: PowerUpType }
  /** Balon kimse vurmadan söndü. */
  | { readonly type: 'balloonExpire' }
  /** Oyuncu zıpladı (`air`: çift zıplama). */
  | { readonly type: 'jump'; readonly player: PlayerIndex; readonly air: boolean }
  /** Oyuncu yere (ya da rakibin kafasına) indi; `speed` düşüş hızı (px/sn). */
  | { readonly type: 'land'; readonly player: PlayerIndex; readonly speed: number }
  /**
   * Top bir saha yüzeyine çarptı (adım başına en sert çarpma): `speed` yaklaşma hızı, (`x`, `y`)
   * temas noktası. Kale ağının arkası `wall` olarak gelir.
   */
  | {
      readonly type: 'ballImpact';
      readonly surface: StaticKind;
      readonly speed: number;
      readonly x: number;
      readonly y: number;
    }
  /** Top oyuncunun gövdesine/kafasına/ayağına (şut ve aktif kafa dışında) değdi. */
  | { readonly type: 'ballTouch'; readonly player: PlayerIndex; readonly speed: number }
  | { readonly type: 'goal'; readonly scorer: PlayerIndex }
  | { readonly type: 'crossbarPush' }
  /** Oyuncular ve top başlangıç konumuna alındı (santra bekleyişi başladı). */
  | { readonly type: 'kickoff' }
  /** Santra düdüğü: top bırakıldı, oyun başladı. */
  | { readonly type: 'playStart'; readonly overtime: boolean }
  /** Normal süre berabere bitti; altın gol uzatması başlıyor. */
  | { readonly type: 'goldenGoal' }
  /** Maç bitti. `winner === null` → berabere (yalnızca altın gol kapalıyken). */
  | {
      readonly type: 'matchEnd';
      readonly winner: PlayerIndex | null;
      readonly reason: MatchEndReason;
    };
