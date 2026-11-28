/**
 * Yakalanmamış JS hatalarının Crashlytics'e hazırlanması (Faz 2.8, QUALITY_BAR K4). Saf işlevler:
 * yığın metnini karelere ayırır, dosya yollarını kısaltır, aynı hatanın tekrarını süzer.
 *
 * Oyun döngüsündeki bir hata saniyede 60 kez tekrar edebilir; oturum başına yalnızca ilk görülen
 * farklı hatalar (en çok `TELEMETRY.maxErrorsPerSession`) gönderilir. Crashlytics de bir oturumda
 * en son 8 hatayı saklar ve bir sonraki açılışta yollar.
 */

/** Bir yığın karesi (Crashlytics'te Java yığın satırına çevrilir). */
export interface JsFrame {
  readonly fn: string;
  readonly file: string;
  readonly line: number;
  readonly col: number;
}

/** Crashlytics'e gidecek hata. */
export interface JsErrorReport {
  readonly kind: 'js_error' | 'promise_rejection';
  readonly name: string;
  readonly message: string;
  readonly frames: readonly JsFrame[];
}

// V8 (Android WebView): "    at işlev (https://localhost/assets/index-abc.js:1:2345)" ya da
// "    at https://localhost/assets/index-abc.js:1:2345". JavaScriptCore (iOS, Faz 12.2):
// "işlev@https://…/index-abc.js:1:2345".
const V8_FRAME = /^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?\s*$/;
const JSC_FRAME = /^\s*(?:(.*?)@)?(.+?):(\d+):(\d+)\s*$/;
const ANONYMOUS = '<anonim>';

/**
 * Dosya yolunun kökünü atar: `https://localhost/assets/index-abc.js?x` → `assets/index-abc.js`.
 * (Uygulamada kök hep aynı; yol yalnızca hangi pakette olduğunu söyler.)
 */
export function shortFile(url: string): string {
  const noQuery = url.replace(/[?#].*$/, '');
  return noQuery.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*\//i, '');
}

/** Yığın metninden kareler (tanınmayan satırlar atlanır). */
export function parseStack(stack: string | undefined, maxFrames: number): JsFrame[] {
  if (!stack) return [];
  const frames: JsFrame[] = [];
  for (const raw of stack.split('\n')) {
    if (frames.length >= maxFrames) break;
    const m = V8_FRAME.exec(raw) ?? (raw.includes('@') ? JSC_FRAME.exec(raw) : null);
    if (!m) continue;
    const [, fn, file, line, col] = m;
    if (!file || !line || !col) continue;
    frames.push({
      fn: fn && fn.length > 0 ? fn : ANONYMOUS,
      file: shortFile(file),
      line: Number(line),
      col: Number(col),
    });
  }
  return frames;
}

/** Mesajı kısaltır, içindeki adreslerin kökünü atar. */
export function sanitizeMessage(message: string, maxLength: number): string {
  const cleaned = message.replace(/[a-z][a-z0-9+.-]*:\/\/[^\s/]*\//gi, '').trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}…` : cleaned;
}

/** `error` / `unhandledrejection` olayındaki değerden rapor. */
export function toReport(
  kind: JsErrorReport['kind'],
  value: unknown,
  limits: { readonly maxMessageLength: number; readonly maxStackFrames: number },
): JsErrorReport {
  if (value instanceof Error) {
    return {
      kind,
      name: value.name || 'Error',
      message: sanitizeMessage(value.message, limits.maxMessageLength),
      frames: parseStack(value.stack, limits.maxStackFrames),
    };
  }
  // Error olmayan değer fırlatıldı (`throw 'x'`, `reject(42)`): yalnızca türü yazılır; içerik
  // rastgele veri olabilir.
  return {
    kind,
    name: kind === 'promise_rejection' ? 'UnhandledRejection' : 'NonErrorThrown',
    message: `değer türü: ${value === null ? 'null' : typeof value}`,
    frames: [],
  };
}

/** Aynı hatayı tanıyan kısa imza (ad + mesaj + ilk kare). */
export function signature(report: JsErrorReport): string {
  const top = report.frames[0];
  return `${report.name}|${report.message}|${top ? `${top.file}:${top.line}:${top.col}` : ''}`;
}

/** Oturum başına hata bütçesi: aynı imza bir kez, toplam en çok `max`. */
export class ErrorBudget {
  private readonly seen = new Set<string>();

  constructor(private readonly max: number) {}

  /** Bu rapor gönderilsin mi? (Gönderilecekse kaydeder.) */
  allow(report: JsErrorReport): boolean {
    if (this.seen.size >= this.max) return false;
    const key = signature(report);
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    return true;
  }
}
