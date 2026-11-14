/**
 * Arayüz metinleri. Yeni anahtar önce `tr` sözlüğüne eklenir; `en` aynı anahtarları zorunlu tutar.
 * `{ad}` biçimindeki yer tutucular `format()` ile doldurulur.
 */
export const tr = {
  'game.title': 'Kafa Kafaya',
  'menu.twoPlayers': '2 Oyuncu',
  'menu.language': 'Dil: Türkçe',
  'menu.navHint': '↑/↓ seç · Enter onayla · fareyle de seçebilirsin',
  'menu.footer': 'Faz 2 · Maç kuralları (2 oyuncu)',
  'preload.loading': 'Yükleniyor…',
  'player.1': 'Oyuncu 1',
  'player.2': 'Oyuncu 2',
  'match.goal': 'GOL!',
  'match.goalBy': '{name} attı!',
  'match.goldenGoal': 'ALTIN GOL!',
  'match.goldenGoalHint': 'İlk golü atan kazanır',
  'match.goldenGoalClock': 'ALTIN GOL',
  'match.fullTime': 'MAÇ BİTTİ!',
  'match.hint':
    'P1: A/D · W zıpla · Space şut     P2: ←/→ · ↑ zıpla · Enter şut     Esc/P: duraklat · F1: debug',
  'pause.title': 'DURAKLATILDI',
  'pause.resume': 'Devam',
  'pause.restart': 'Yeniden Başlat',
  'pause.mainMenu': 'Ana Menü',
  'end.winner': '{name} KAZANDI!',
  'end.draw': 'BERABERE',
  'end.byGoldenGoal': 'Altın golle',
  'end.playAgain': 'Tekrar Oyna',
  'end.mainMenu': 'Ana Menü',
  'overlay.navHint': '↑/↓ seç · Enter onayla',
} as const;

export type StringKey = keyof typeof tr;

export const en: Record<StringKey, string> = {
  'game.title': 'Kafa Kafaya',
  'menu.twoPlayers': '2 Players',
  'menu.language': 'Language: English',
  'menu.navHint': '↑/↓ select · Enter confirm · mouse works too',
  'menu.footer': 'Phase 2 · Match rules (2 players)',
  'preload.loading': 'Loading…',
  'player.1': 'Player 1',
  'player.2': 'Player 2',
  'match.goal': 'GOAL!',
  'match.goalBy': '{name} scores!',
  'match.goldenGoal': 'GOLDEN GOAL!',
  'match.goldenGoalHint': 'Next goal wins',
  'match.goldenGoalClock': 'GOLDEN GOAL',
  'match.fullTime': 'FULL TIME!',
  'match.hint':
    'P1: A/D · W jump · Space kick     P2: ←/→ · ↑ jump · Enter kick     Esc/P: pause · F1: debug',
  'pause.title': 'PAUSED',
  'pause.resume': 'Resume',
  'pause.restart': 'Restart',
  'pause.mainMenu': 'Main Menu',
  'end.winner': '{name} WINS!',
  'end.draw': 'DRAW',
  'end.byGoldenGoal': 'Golden goal',
  'end.playAgain': 'Play Again',
  'end.mainMenu': 'Main Menu',
  'overlay.navHint': '↑/↓ select · Enter confirm',
};
