/** Arayüz metinleri. Yeni anahtar önce `tr` sözlüğüne eklenir; `en` aynı anahtarları zorunlu tutar. */
export const tr = {
  'game.title': 'Kafa Kafaya',
  'menu.clickToStart': 'Başlamak için tıkla',
  'menu.footer': 'Faz 1 · Gri kutu prototip (2 oyuncu)',
  'preload.loading': 'Yükleniyor…',
  'match.goal': 'GOL!',
  'match.hint':
    'P1: A/D · W zıpla · Space şut     P2: ←/→ · ↑ zıpla · Enter şut     F1: debug · Esc: menü',
} as const;

export type StringKey = keyof typeof tr;

export const en: Record<StringKey, string> = {
  'game.title': 'Kafa Kafaya',
  'menu.clickToStart': 'Click to start',
  'menu.footer': 'Phase 1 · Gray-box prototype (2 players)',
  'preload.loading': 'Loading…',
  'match.goal': 'GOAL!',
  'match.hint':
    'P1: A/D · W jump · Space kick     P2: ←/→ · ↑ jump · Enter kick     F1: debug · Esc: menu',
};
