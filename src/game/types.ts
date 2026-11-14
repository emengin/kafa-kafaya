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
