/** Arayüz metinleri. Yeni anahtar önce `tr` sözlüğüne eklenir; `en` aynı anahtarları zorunlu tutar. */
export const tr = {
  'game.title': 'Kafa Kafaya',
  'menu.clickToStart': 'Başlamak için tıkla',
  'menu.comingSoon': 'Oyun modları yakında!',
  'menu.footer': 'Faz 0 · Kurulum',
  'preload.loading': 'Yükleniyor…',
} as const;

export type StringKey = keyof typeof tr;

export const en: Record<StringKey, string> = {
  'game.title': 'Kafa Kafaya',
  'menu.clickToStart': 'Click to start',
  'menu.comingSoon': 'Game modes coming soon!',
  'menu.footer': 'Phase 0 · Setup',
  'preload.loading': 'Loading…',
};
