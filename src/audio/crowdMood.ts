import { CROWD } from '../config/gameConfig';

/** Atak tehlikesinin girdileri (topun durumu ve kale çizgileri). */
export interface DangerInput {
  readonly ballX: number;
  readonly ballY: number;
  readonly ballVx: number;
  readonly groundY: number;
  /** Sol ve sağ kale çizgilerinin x'i. */
  readonly leftLineX: number;
  readonly rightLineX: number;
}

/**
 * Atak tehlikesi (0–1): top bir kaleye yaklaştıkça, o kaleye doğru hızlandıkça ve kale ağzı
 * yüksekliğine indikçe artar. Kalabalık uğultusunu yükseltir (saf fonksiyon, testli).
 */
export function attackDanger(d: DangerInput): number {
  const c = CROWD.danger;
  const height = Math.max(0, d.groundY - d.ballY);
  const low = Math.max(0, 1 - height / c.heightPx);
  let best = 0;
  for (const side of [-1, 1] as const) {
    const lineX = side < 0 ? d.leftLineX : d.rightLineX;
    const dist = Math.abs(d.ballX - lineX);
    const close = Math.max(0, 1 - dist / c.rangePx);
    const toward = Math.max(0, Math.min(1, (d.ballVx * side) / c.refSpeed));
    const danger =
      close *
      (1 - c.speedWeight + c.speedWeight * toward) *
      (HEIGHT_FLOOR + (1 - HEIGHT_FLOOR) * low);
    best = Math.max(best, danger);
  }
  return Math.min(1, best);
}
/** Yüksekteki top da biraz heyecan verir. */
const HEIGHT_FLOOR = 0.35;
