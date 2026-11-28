import { AI_DIFFICULTIES, TELEMETRY } from '../config/gameConfig';
import { CHARACTER_IDS } from '../game/characters';
import { MATCH_MODES } from '../game/matchSetup';

/**
 * **Olay sözlüğü** (Faz 2.8) — Firebase Analytics'e giden her olayın tek kaynağı. Faz 6.8 (ilk
 * kullanıcı deneyimi hunisi) ve 11.3 (huni, A/B testi) bu dosyaya olay ekleyerek ilerler.
 *
 * Kurallar (`events.test.ts` bunları zorlar):
 * - Burada olmayan olay gönderilmez; parametreler yalnızca burada tanımlı olanlardır.
 * - **Kişisel veri yok:** serbest metin parametresi yoktur; her parametre ya sabit bir değer
 *   listesinden (enum) ya da sınırları belli bir tam sayıdır. Ad, e-posta, cihaz kimliği, reklam
 *   kimliği, konum, IP, oyuncu adı gibi alanlar eklenemez (yasaklı ad listesi testte).
 * - Adlar Firebase kurallarına uyar: küçük harf, rakam, alt çizgi; en çok 40 karakter; Firebase'in
 *   ayrılmış adları ve `firebase_`, `google_`, `ga_` önekleri kullanılmaz; olay başına ≤ 25
 *   parametre; metin değeri ≤ 100 karakter.
 * - Yeni olay ya da parametre eklenince docs/DATA_MAP.md'deki Firebase Analytics satırı gözden
 *   geçirilir.
 *
 * Gönderim: oyun `track()` çağırır (`./hooks.ts`); olay yalnızca Android uygulamasında, kullanıcı
 * analiz rızası verdiyse yerel eklentiyle Firebase'e gider. Web derlemesinde gönderen yoktur.
 */

/** Sabit değer listesi. */
interface EnumParam {
  readonly type: 'enum';
  readonly values: readonly string[];
  readonly description: string;
}

/** Sınırlı tam sayı (0/1 bayraklar dahil). */
interface IntParam {
  readonly type: 'int';
  readonly min: number;
  readonly max: number;
  readonly description: string;
}

export type ParamSpec = EnumParam | IntParam;

export interface EventSpec {
  readonly description: string;
  /** Olayı kim gönderir: oyun kodu (JS) ya da yerel Android kodu (MainActivity). */
  readonly source: 'js' | 'native';
  readonly params: Readonly<Record<string, ParamSpec>>;
}

const MAX_GOALS = TELEMETRY.maxGoals;
const MAX_MATCH_S = TELEMETRY.maxMatchSeconds;

const flag = (description: string): IntParam => ({ type: 'int', min: 0, max: 1, description });

const modeParam = {
  type: 'enum',
  values: MATCH_MODES,
  description: 'Maç modu: cpu = Hızlı Maç, versus = 2 oyuncu, tournament, training.',
} as const satisfies EnumParam;

export const EVENT_DICTIONARY = {
  match_start: {
    description:
      'Maç başladı: menüden, "Yeniden başlat" / "Tekrar oyna" ile ya da arka plandan geri yüklenen maç. AI vs AI test maçları gönderilmez.',
    source: 'js',
    params: {
      mode: modeParam,
      difficulty: {
        type: 'enum',
        values: [...AI_DIFFICULTIES, 'none'],
        description: 'CPU zorluğu; CPU yoksa (2 oyuncu, antrenman) none.',
      },
      char_p1: { type: 'enum', values: CHARACTER_IDS, description: 'Oyuncu 1 karakteri.' },
      char_p2: {
        type: 'enum',
        values: CHARACTER_IDS,
        description: 'Oyuncu 2 / CPU karakteri.',
      },
      controls: {
        type: 'enum',
        values: ['touch', 'other'],
        description: 'Dokunmatik kontroller mi, klavye/gamepad mı.',
      },
      match_seconds: {
        type: 'int',
        min: 0,
        max: MAX_MATCH_S,
        description: 'Ayarlanan maç süresi (sn); antrenmanda 0.',
      },
      resumed: flag('1 = arka planda kaydedilen yarım maç geri yüklendi.'),
    },
  },
  match_end: {
    description:
      'Maç bitti ya da yarıda bırakıldı (ana menüye dönüş, yeniden başlatma). Uygulama arka planda kapanırsa olay gelmez.',
    source: 'js',
    params: {
      mode: modeParam,
      outcome: {
        type: 'enum',
        values: ['p1_win', 'p2_win', 'draw', 'abandon'],
        description: 'Sonuç (Hızlı Maç ve turnuvada p1 = oyuncu, p2 = CPU).',
      },
      goals_p1: { type: 'int', min: 0, max: MAX_GOALS, description: 'Oyuncu 1 golü.' },
      goals_p2: { type: 'int', min: 0, max: MAX_GOALS, description: 'Oyuncu 2 / CPU golü.' },
      duration_s: {
        type: 'int',
        min: 0,
        max: MAX_MATCH_S,
        description: 'Maç ekranında geçen gerçek süre (sn; duraklatma dahil).',
      },
      golden_goal: flag('1 = altın golle bitti.'),
    },
  },
  client_error: {
    description:
      'Uygulama hatası (sayı ve tür; ayrıntısı yalnızca Crashlytics raporunda). Aynı hata oturumda bir kez.',
    source: 'js',
    params: {
      kind: {
        type: 'enum',
        values: ['js_error', 'promise_rejection'],
        description: 'Yakalanmamış JS hatası ya da reddedilmiş Promise.',
      },
    },
  },
  renderer_gone: {
    description:
      'WebView çizici süreci öldü; uygulama kendini yeniden açtı (QUALITY_BAR K4). MainActivity gönderir.',
    source: 'native',
    params: {
      did_crash: flag('1 = çizici çöktü; 0 = sistem bellek için kapattı.'),
    },
  },
} as const satisfies Readonly<Record<string, EventSpec>>;

/**
 * Firebase'in kendiliğinden topladığı olaylar (bizim kodumuz göndermez; analiz rızası yoksa bunlar
 * da gitmez). Belgelemek için burada: Faz 6.8 / 11.3 hunisi bunları da kullanır.
 */
export const AUTOMATIC_EVENTS: Readonly<Record<string, string>> = {
  first_open: 'Uygulama kurulduktan sonra ilk açılış (rıza verildikten sonraki ilk oturumda).',
  session_start: 'Oturum başladı (30 dk etkileşimsizlikten sonra yeni oturum) — "oturum" olayı.',
  user_engagement: 'Uygulama ön plandayken geçen süre.',
  app_update: 'Uygulama yeni sürüme güncellendi.',
  os_update: 'Android sürümü güncellendi.',
  app_remove: 'Uygulama kaldırıldı (yalnızca Play Store yüklemelerinde).',
  app_clear_data: 'Uygulama verisi silindi.',
  app_exception:
    'Crashlytics çökme kaydı (analiz rızası da varsa; çökme sayısını huniyle ilişkilendirmek için).',
};
// screen_view kapalı: tek Android etkinliği var, manifestte otomatik ekran raporu kapatıldı.

export type EventName = keyof typeof EVENT_DICTIONARY;

type Dictionary = typeof EVENT_DICTIONARY;
type ValueOf<P> = P extends { readonly type: 'enum'; readonly values: readonly (infer V)[] }
  ? V
  : number;

/** Bir olayın parametreleri (türler sözlükten çıkar; eksik ya da fazla alan derlemeyi kırar). */
export type EventParams<N extends EventName> = {
  readonly [K in keyof Dictionary[N]['params']]: ValueOf<Dictionary[N]['params'][K]>;
};

/** Oyun kodunun gönderebileceği olaylar (yerel olaylar hariç). */
export type AnalyticsEvent = {
  [N in EventName]: Dictionary[N]['source'] extends 'js'
    ? { readonly name: N; readonly params: EventParams<N> }
    : never;
}[EventName];

/**
 * Olay sözlüğe uyuyor mu? Uymuyorsa nedeni, uyuyorsa `null`. (Türler derlemede zaten denetler; bu,
 * çalışma anında `as` ya da hatalı veriyle gelen olayı Firebase'e gitmeden durdurur.)
 */
export function validateEvent(
  name: string,
  params: Readonly<Record<string, unknown>>,
): string | null {
  const spec = (EVENT_DICTIONARY as Readonly<Record<string, EventSpec>>)[name];
  if (!spec) return `sözlükte yok: ${name}`;
  for (const key of Object.keys(params)) {
    if (!(key in spec.params)) return `${name}: tanımsız parametre ${key}`;
  }
  for (const [key, p] of Object.entries(spec.params)) {
    const v = params[key];
    if (p.type === 'enum') {
      if (typeof v !== 'string' || !p.values.includes(v)) return `${name}.${key}: geçersiz değer`;
    } else if (typeof v !== 'number' || !Number.isInteger(v) || v < p.min || v > p.max) {
      return `${name}.${key}: aralık dışı`;
    }
  }
  return null;
}
