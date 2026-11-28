import { firstChainMismatch, runFixture } from '../game/crossEngine/fixture';
import { REPLAY_FIXTURES } from '../game/crossEngine/fixtures';
import { DET_MATH_GOLDEN, goldenDigest } from '../physics/detMathGolden';

/**
 * Telefondaki motorlar arası test (Faz 2.7, madde 7; yalnızca geliştirici derlemesi). CI'daki
 * çapraz motor testinin aynısı, uygulamanın kendi WebView'ında: kayıtlı tekrarlar oynatılır, her
 * adımın durum özetinden kurulan zincir kayıttaki (Node'da üretilmiş) zincirle karşılaştırılır.
 * Zincir her adımın özetini içerdiği için tek bir adımdaki tek bit fark da yakalanır; fark varsa
 * hangi 60 adımlık aralıkta başladığı yazılır.
 *
 * Ayarlar → Kontroller → "Motorlar arası test" ya da `?devtest=determinism`. Sonuç ekranda ve
 * konsolda (`[Kafa Kafaya] determinizm testi {...}`; chrome://inspect ya da logcat).
 */

export interface DeterminismFixtureResult {
  readonly name: string;
  readonly ticks: number;
  readonly ok: boolean;
  /** Farkın başladığı aralık (adım, 1'den), yoksa null. */
  readonly mismatchFrom: number | null;
  readonly mismatchTo: number | null;
  readonly ms: number;
}

export interface DeterminismReport {
  readonly userAgent: string;
  readonly golden: { readonly expected: string; readonly actual: string; readonly ok: boolean };
  readonly fixtures: readonly DeterminismFixtureResult[];
  readonly totalTicks: number;
  readonly ok: boolean;
}

/** Tekrarları sırayla oynatır; aralarda arayüz güncellensin diye olay döngüsüne döner. */
export async function runDeterminismCheck(
  progress: (lines: readonly string[]) => void,
): Promise<DeterminismReport> {
  const lines: string[] = [];
  const actual = goldenDigest();
  const golden = { expected: DET_MATH_GOLDEN, actual, ok: actual === DET_MATH_GOLDEN };
  lines.push(`detMath özeti ${actual} ${golden.ok ? '✅' : `❌ (beklenen ${DET_MATH_GOLDEN})`}`);
  progress(lines);
  const fixtures: DeterminismFixtureResult[] = [];
  for (const f of REPLAY_FIXTURES) {
    await yieldToUi();
    const start = performance.now();
    const run = runFixture(f);
    const ms = performance.now() - start;
    const at = firstChainMismatch(run.chain, f.chain);
    const from = at < 0 ? null : at * f.checkpointEvery + 1;
    const to = at < 0 ? null : Math.min(f.ticks, (at + 1) * f.checkpointEvery);
    fixtures.push({
      name: f.name,
      ticks: f.ticks,
      ok: at < 0,
      mismatchFrom: from,
      mismatchTo: to,
      ms,
    });
    lines.push(
      at < 0
        ? `${f.name}: ${f.ticks} adım ✅`
        : `${f.name}: ❌ fark ${String(from)}–${String(to)}. adımlar arasında`,
    );
    progress(lines);
  }
  const totalTicks = fixtures.reduce((s, r) => s + r.ticks, 0);
  const ok = golden.ok && fixtures.length > 0 && fixtures.every((r) => r.ok);
  return { userAgent: navigator.userAgent, golden, fixtures, totalTicks, ok };
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, YIELD_MS));
}
const YIELD_MS = 30;

/** Sonuç kutusu: ekranın ortasında, dokununca kapanır. */
export class DeterminismPanel {
  private readonly box: HTMLDivElement;

  constructor() {
    this.box = document.createElement('div');
    this.box.id = 'determinism-panel';
    const st = this.box.style;
    st.position = 'fixed';
    st.left = '50%';
    st.top = '50%';
    st.transform = 'translate(-50%, -50%)';
    st.maxWidth = '92vw';
    st.padding = '16px 20px';
    st.background = 'rgba(0, 0, 0, 0.88)';
    st.color = '#fff';
    st.font = '15px/1.45 monospace';
    st.whiteSpace = 'pre-wrap';
    st.borderRadius = '10px';
    st.zIndex = '60';
    st.display = 'none';
    this.box.addEventListener('pointerdown', () => {
      if (this.closable) this.hide();
    });
    document.body.appendChild(this.box);
  }

  private closable = false;

  show(lines: readonly string[], closable: boolean): void {
    this.closable = closable;
    this.box.textContent = lines.join('\n');
    this.box.style.display = 'block';
  }

  hide(): void {
    this.box.style.display = 'none';
  }
}

/** Testi çalıştırıp sonucu kutuda gösterir; raporu döndürür. */
export async function runAndShow(panel: DeterminismPanel): Promise<DeterminismReport> {
  const title = 'Motorlar arası test (Faz 2.7)';
  panel.show([title, 'Çalışıyor…'], false);
  const report = await runDeterminismCheck((lines) => {
    panel.show([title, ...lines, 'Çalışıyor…'], false);
  });
  const summary = report.ok
    ? `SONUÇ: GEÇTİ ✅  ${report.fixtures.length} tekrar, ${report.totalTicks} adım; hepsi Node ile aynı`
    : 'SONUÇ: FARK VAR ❌  (bu ekranın fotoğrafını gönder)';
  const lines = [
    title,
    `detMath özeti ${report.golden.actual} ${report.golden.ok ? '✅' : '❌'}`,
    ...report.fixtures.map((r) =>
      r.ok
        ? `${r.name}: ${r.ticks} adım ✅`
        : `${r.name}: ❌ fark ${String(r.mismatchFrom)}–${String(r.mismatchTo)}. adımlar arasında`,
    ),
    '',
    summary,
    '',
    'Kapatmak için dokun.',
  ];
  panel.show(lines, true);
  console.info('[Kafa Kafaya] determinizm testi', JSON.stringify(report));
  return report;
}
