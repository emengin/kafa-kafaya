import { getLanguage } from '../i18n';

/**
 * Rıza ekranı ve Gizlilik menüsü metinleri (Faz 2.8). Yalnızca Android uygulamasının paketinde:
 * web sürümünde rıza ekranı yok (veri gönderilmez), bu yüzden metinler ortak i18n tablosunda değil.
 * Metin anlamca değişirse `TELEMETRY.consentTextVersion` artırılır. Hukuki metin taslağıdır —
 * AVUKAT ONAYI BEKLİYOR (Faz 10.3); yerini Faz 8.2'deki tam rıza yönetimi alır.
 */
interface ConsentStrings {
  readonly title: string;
  readonly lines: readonly string[];
  readonly allow: string;
  readonly deny: string;
  readonly privacy: string;
  readonly analytics: string;
  readonly crash: string;
  readonly testCrash: string;
  readonly testJsError: string;
}

const TR: ConsentStrings = {
  title: 'Oyunu geliştirmemize yardım et',
  lines: [
    'Çökme raporları ve oyun istatistikleri (maç sayısı, hatalar, cihaz modeli)',
    "Google Firebase'e gönderilsin mi? Veriler yurt dışında (ABD vb.) işlenir.",
    'Adın, kesin konumun ve reklam kimliğin toplanmaz; veri reklam için kullanılmaz.',
    "Kararını istediğin zaman Ayarlar → Gizlilik'ten değiştirebilirsin.",
  ],
  allow: 'İzin ver',
  deny: 'İzin verme',
  privacy: 'Gizlilik',
  analytics: 'Oyun istatistikleri',
  crash: 'Çökme raporları',
  testCrash: 'Test çökmesi (yerel)',
  testJsError: 'Test JS hatası',
};

const EN: ConsentStrings = {
  title: 'Help us improve the game',
  lines: [
    'Send crash reports and game statistics (match count, errors, device model)',
    'to Google Firebase? Data is processed abroad (USA and elsewhere).',
    'Your name, precise location and advertising ID are not collected or used for ads.',
    'You can change this at any time in Settings → Privacy.',
  ],
  allow: 'Allow',
  deny: "Don't allow",
  privacy: 'Privacy',
  analytics: 'Game statistics',
  crash: 'Crash reports',
  testCrash: 'Test crash (native)',
  testJsError: 'Test JS error',
};

export function consentStrings(): ConsentStrings {
  return getLanguage() === 'tr' ? TR : EN;
}
