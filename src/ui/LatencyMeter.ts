import Phaser from 'phaser';
import { textStyle } from '../art/uiArt';
import { DISPLAY, TOUCH } from '../config/gameConfig';
import { format, t } from '../i18n';
import { latencyProbe } from '../input/latencyProbe';
import { BOTTOM_CENTER } from '../platform/screenFrame';
import { screenLayout } from './ScreenLayout';

/**
 * Maç içi giriş gecikmesi göstergesi (Faz 2.3; Ayarlar → Kontroller → Gecikme ölçer). Alt ortada
 * küçük bir satır: dokunuştan kareye medyan ve p95, oyunun eklediği bekleme (QUALITY_BAR D6:
 * ≤ 16,7 ms), sistemin olay iletme süresi ve örnek sayısı. Metin yalnızca `refreshMs`'de bir
 * yenilenir (her karede yazı dokusu yeniden çizilmesin).
 */
export class LatencyMeter {
  private readonly text: Phaser.GameObjects.Text;
  private nextAt = 0;

  constructor(scene: Phaser.Scene) {
    const cfg = TOUCH.latency;
    this.text = scene.add
      .text(
        DISPLAY.width / 2,
        cfg.y,
        t('latency.waiting'),
        textStyle(cfg.fontSizePx, '#ffffff', TEXT_STROKE),
      )
      .setOrigin(0.5, 1)
      .setDepth(TOUCH.depth + 2);
    screenLayout(scene).place(this.text, BOTTOM_CENTER);
  }

  update(time: number): void {
    if (time < this.nextAt) return;
    this.nextAt = time + TOUCH.latency.refreshMs;
    const r = latencyProbe.report();
    if (r.toFrame.count === 0) return;
    this.text.setText(
      format('latency.meter', {
        frame: ms(r.toFrame.median),
        p95: ms(r.toFrame.p95),
        wait: ms(r.wait.median),
        os: ms(r.dispatch.median),
        n: r.toFrame.count,
      }),
    );
  }
}

const TEXT_STROKE = 3;

function ms(v: number): string {
  return v.toFixed(1);
}
