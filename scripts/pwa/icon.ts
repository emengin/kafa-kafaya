/**
 * PWA ve uygulama simgesi (derleme zamanında, kodla): gece mavisi gradyan zemin, ortada beyaz top
 * (koyu kontur, ortada beşgen, dikiş çizgileri) ve altın halka. Her piksel 4×4 alt örnekle
 * hesaplanır (kenar yumuşatma). Yer tutucudur: final uygulama ikonu Faz 4'te (ART_BIBLE §11.7).
 *
 * Çeşitler:
 * - `any`: yuvarlak köşeli kare (PWA).
 * - `maskable`: tam kare zemin, top güvenli bölgede (%80) (PWA maskable, Android eski simge).
 * - `foreground`: `maskable`'ın saydam zeminli hâli (Android uyarlanır simge ön katmanı).
 * - `background`: yalnızca zemin (Android uyarlanır simge arka katmanı).
 */
export type RGBA = readonly [number, number, number, number];
export type IconVariant = 'any' | 'maskable' | 'foreground' | 'background';

const TOP: RGBA = [27, 42, 107, 255];
const BOTTOM: RGBA = [58, 123, 213, 255];
const WHITE: RGBA = [255, 255, 255, 255];
const SHADE: RGBA = [214, 222, 240, 255];
const INK: RGBA = [17, 26, 58, 255];
const GOLD: RGBA = [255, 210, 63, 255];
const CLEAR: RGBA = [0, 0, 0, 0];
const SAMPLES = 4;
const PENTAGON = 5;

function mix(a: RGBA, b: RGBA, t: number): RGBA {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    a[3] + (b[3] - a[3]) * t,
  ];
}

function segmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

function inPolygon(px: number, py: number, pts: readonly (readonly [number, number])[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i] ?? [0, 0];
    const [xj, yj] = pts[j] ?? [0, 0];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Birim karede (0–1) bir noktanın rengi. */
function colorAt(u: number, v: number, variant: IconVariant): RGBA {
  // Zemin: `any` yuvarlak köşeli kare, diğerleri tam kare.
  if (variant === 'any') {
    const r = 0.22;
    const qx = Math.max(Math.abs(u - 0.5) - (0.5 - r), 0);
    const qy = Math.max(Math.abs(v - 0.5) - (0.5 - r), 0);
    if (Math.hypot(qx, qy) > r) return CLEAR;
  }
  let c = variant === 'foreground' ? CLEAR : mix(TOP, BOTTOM, v);
  if (variant === 'background') return c;
  const R = variant === 'any' ? 0.33 : 0.28;
  const d = Math.hypot(u - 0.5, v - 0.5);
  const ring = R + 0.045;
  if (d <= ring + 0.022 && d >= ring - 0.012) c = GOLD;
  if (d > R) return c;
  if (d > R - 0.028) return INK;
  // Top: hafif gölgeli beyaz, ortada beşgen, beşgenden kenara dikişler.
  c = mix(WHITE, SHADE, Math.max(0, (u - 0.5 + (v - 0.5)) / (R * 2) + 0.35));
  const pr = R * 0.36;
  const pts: [number, number][] = [];
  for (let i = 0; i < PENTAGON; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / PENTAGON;
    pts.push([0.5 + Math.cos(a) * pr, 0.5 + Math.sin(a) * pr]);
  }
  if (inPolygon(u, v, pts)) return INK;
  for (const [x, y] of pts) {
    const k = R / pr;
    const ex = 0.5 + (x - 0.5) * k;
    const ey = 0.5 + (y - 0.5) * k;
    if (segmentDistance(u, v, x, y, ex, ey) < R * 0.06) return INK;
    // Kenarda yarım beşgen yamalar.
    if (Math.hypot(u - ex, v - ey) < R * 0.24) return INK;
  }
  return c;
}

/** size × size RGBA piksel dizisi. */
export function renderIcon(size: number, variant: IconVariant): Uint8Array {
  return render(size, (u, v) => colorAt(u, v, variant));
}

/**
 * Açılış ekranı: düz zemin ortasında simgenin topu (`foreground`), `scale` oranında küçültülmüş.
 * Kare çizilir; Android her yön ve yoğunluk için ortadan kırparak küçültür, top ortada kalır.
 */
export function renderSplash(size: number, scale: number, background: RGBA): Uint8Array {
  return render(size, (u, v) => {
    const c = colorAt(0.5 + (u - 0.5) / scale, 0.5 + (v - 0.5) / scale, 'foreground');
    return c[3] === 0 ? background : c;
  });
}

function render(size: number, colorOf: (u: number, v: number) => RGBA): Uint8Array {
  const out = new Uint8Array(size * size * 4);
  const n = SAMPLES * SAMPLES;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const c = colorOf((x + (sx + 0.5) / SAMPLES) / size, (y + (sy + 0.5) / SAMPLES) / size);
          // Ön çarpımlı ortalama (saydam kenarlarda renk kaymasın).
          r += c[0] * c[3];
          g += c[1] * c[3];
          b += c[2] * c[3];
          a += c[3];
        }
      }
      const i = (y * size + x) * 4;
      out[i] = a > 0 ? Math.round(r / a) : 0;
      out[i + 1] = a > 0 ? Math.round(g / a) : 0;
      out[i + 2] = a > 0 ? Math.round(b / a) : 0;
      out[i + 3] = Math.round(a / n);
    }
  }
  return out;
}
