/** 0 = P1 (sol, sağa bakar), 1 = P2 (sağ, sola bakar). */
export type PlayerIndex = 0 | 1;

/** Bakış yönü: +1 sağ, −1 sol. */
export type Facing = 1 | -1;

/** Simülasyonun bir adımda ürettiği olaylar (ses, efekt, HUD için). */
export type SimEvent =
  | { readonly type: 'kick'; readonly player: PlayerIndex; readonly speed: number }
  | { readonly type: 'header'; readonly player: PlayerIndex; readonly speed: number }
  | { readonly type: 'goal'; readonly scorer: PlayerIndex }
  | { readonly type: 'crossbarPush' }
  | { readonly type: 'kickoff' };
