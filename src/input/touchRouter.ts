import { TOUCH } from '../config/gameConfig';
import type { PlayerIndex, TouchButton, TouchButtonId } from './touchLayout';

/** Bir parmak: `Touch.identifier` ve dünya koordinatındaki konumu. */
export interface TouchPoint {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

type Owner =
  | { readonly kind: 'move' | 'action'; readonly player: PlayerIndex }
  | { readonly kind: 'ui'; readonly key: string };

/**
 * Parmakları butonlara dağıtır (Faz 2.3) — saf, Phaser ve DOM'dan bağımsız (birim testli).
 *
 * 1. **Geniş dokunma alanı:** parmak ilk indiğinde dokunma alanı (`hitR`, görselden büyük)
 *    içinde olduğu butonlardan, yarıçapına göre en yakın olanın grubuna bağlanır. Hiçbir alana
 *    düşmeyen parmak, kayarak bir alana girince bağlanır.
 * 2. **Grup sahipliği:** parmak kalkana kadar o grubun olur.
 *    - Hareket: ekranın neresine kayarsa kaysın en yakın yön (◀ / ▶) basılı kalır; maç
 *      sırasında başparmağın butondan kayması girdiyi koparmaz.
 *    - Eylem: en yakın eylem butonu, alanın `keepRatio` katına kadar basılı kalır. Parmak
 *      Zıpla ile Şut arasındaysa (`combos`) ikisi birden basar.
 *    - Arayüz (duraklat, antrenman): yalnızca kendi alanının içindeyken.
 * 3. **Çoklu dokunuş:** her parmak ayrı izlenir; yerel 2 oyuncuda her parmak kendi oyuncusunun
 *    grubunda kalır.
 */
export class TouchRouter {
  private readonly owners = new Map<number, Owner>();

  /** Etkin parmakların bastığı butonların anahtarları. */
  update(points: readonly TouchPoint[], buttons: readonly TouchButton[]): Set<string> {
    const out = new Set<string>();
    const alive = new Set<number>();
    for (const pt of points) {
      alive.add(pt.id);
      let owner = this.owners.get(pt.id);
      if (!owner) {
        owner = acquire(pt, buttons) ?? undefined;
        if (owner) this.owners.set(pt.id, owner);
      }
      if (owner) resolve(pt, owner, buttons, out);
    }
    for (const id of [...this.owners.keys()]) if (!alive.has(id)) this.owners.delete(id);
    return out;
  }

  /** Tüm parmakları unutur (duraklatma, kaplama). */
  reset(): void {
    this.owners.clear();
  }
}

/** Dokunma alanına göre en yakın butonun grubu (uzaklık / alan yarıçapı en küçük olan). */
function acquire(pt: TouchPoint, buttons: readonly TouchButton[]): Owner | null {
  let best: TouchButton | null = null;
  let bestRatio = Infinity;
  for (const b of buttons) {
    const ratio = Math.hypot(pt.x - b.x, pt.y - b.y) / b.hitR;
    if (ratio <= 1 && ratio < bestRatio) {
      best = b;
      bestRatio = ratio;
    }
  }
  if (!best) return null;
  if (best.group === 'ui') return { kind: 'ui', key: best.key };
  return { kind: best.group, player: best.player };
}

function resolve(
  pt: TouchPoint,
  owner: Owner,
  buttons: readonly TouchButton[],
  out: Set<string>,
): void {
  if (owner.kind === 'ui') {
    const b = buttons.find((x) => x.key === owner.key);
    if (b && Math.hypot(pt.x - b.x, pt.y - b.y) <= b.hitR) out.add(b.key);
    return;
  }
  const own = buttons.filter((b) => b.group === owner.kind && b.player === owner.player);
  if (owner.kind === 'move') {
    // En yakın merkez = iki butonun orta dikmesi; ◀ ▶ yan yanayken yalnızca x'e bakmak demek.
    const b = nearest(own, (x) => Math.hypot(pt.x - x.x, pt.y - x.y));
    if (b) out.add(b.key);
    return;
  }
  const b = nearest(own, (x) => Math.hypot(pt.x - x.x, pt.y - x.y) / x.hitR);
  if (b && Math.hypot(pt.x - b.x, pt.y - b.y) <= b.hitR * TOUCH.keepRatio) out.add(b.key);
  for (const [a, c] of TOUCH.combos) {
    const ba = own.find((x) => x.id === (a as TouchButtonId));
    const bc = own.find((x) => x.id === (c as TouchButtonId));
    if (ba && bc && edgeDistance(pt, ba) <= TOUCH.comboReachPx) {
      if (edgeDistance(pt, bc) <= TOUCH.comboReachPx) {
        out.add(ba.key);
        out.add(bc.key);
      }
    }
  }
}

function nearest(
  list: readonly TouchButton[],
  cost: (b: TouchButton) => number,
): TouchButton | null {
  let best: TouchButton | null = null;
  let bestCost = Infinity;
  for (const b of list) {
    const c = cost(b);
    if (c < bestCost) {
      best = b;
      bestCost = c;
    }
  }
  return best;
}

/** Parmağın buton görselinin kenarına uzaklığı (içerideyse negatif). */
function edgeDistance(pt: TouchPoint, b: TouchButton): number {
  return Math.hypot(pt.x - b.x, pt.y - b.y) - b.r;
}
