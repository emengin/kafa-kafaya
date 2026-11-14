import type Phaser from 'phaser';
import { ANIM, CHARACTER_ART } from '../config/gameConfig';
import type { Expression } from '../fx/FaceController';
import { shade } from './canvas';
import type { CharacterLook } from './looks';
import { fillArc, fillDisc, fillOval, strokeArc, strokeOval } from '../ui/shapes';

/** Sık kullanılan renk. */
const WHITE = 0xffffff;

type Graphics = Phaser.GameObjects.Graphics;

/** Yüzün bir karedeki durumu. */
export interface FaceState {
  readonly expression: Expression;
  /** Göz kırpma (0 açık … 1 kapalı). */
  readonly blink: number;
  /** Bakış yönü (yerel: + ön/aşağı). */
  readonly lookX: number;
  readonly lookY: number;
  /** Saniye (titreme ve canlandırmalar). */
  readonly time: number;
}

/**
 * Yüz yerleşimi (kafa birimi: yarıçap 100, sağa bakar). Yalnızca şekil oranlarıdır; ayar
 * değerleri `ANIM`/`CHARACTER_ART`'tadır. Yakın göz daha büyük, uzak göz daralmış (3/4 görünüm).
 */
const F = {
  near: { x: 16, y: -6, sx: 1, sy: 1 },
  far: { x: 62, y: -9, sx: 0.74, sy: 0.94 },
  eyeR: 17,
  eyeTall: 1.12,
  iris: 0.6,
  pupil: 0.52,
  highlight: 0.3,
  highlightOffset: 0.32,
  lidLine: 1.05,
  browY: -36,
  browLen: 26,
  browRise: 7,
  mouthX: 46,
  mouthY: 42,
  mouthW: 30,
  blushNear: { x: 36, y: 24, rx: 15, ry: 8 },
  blushFar: { x: 82, y: 20, rx: 9, ry: 7 },
  blushAlpha: 0.38,
  blushColor: 0xff6f8f,
  dark: 0x2a1f3d,
  mouthDark: 0x5e1a26,
  tongue: 0xff7d8f,
  teeth: WHITE,
  sweat: 0x8fd6ff,
  sweatX: 84,
  sweatY: -44,
  sweatR: 8,
  wideScale: 1.18,
  smallPupil: 0.32,
  sadLid: 0.46,
  effortLid: 0.42,
  grinLid: 0.28,
  sadLook: 0.65,
  angry: 0.45,
  worried: -0.45,
  raised: -10,
} as const;

/** Göz çizimi için hesaplanan değerler (her karede yeni nesne kurulmasın). */
const eye = { cx: 0, cy: 0, rx: 0, ry: 0 };

/**
 * Yüzü çizer: gözler (bakış, kırpma, göz kapağı), kaşlar, ağız ve ifadeye göre ekler (yanak,
 * ter damlası). Koordinatlar yerel: kafa merkezi (`cx`, `cy`), yarıçap `r`, karakter sağa bakar.
 */
export function drawFace(
  g: Graphics,
  look: CharacterLook,
  s: FaceState,
  cx: number,
  cy: number,
  r: number,
): void {
  const u = r / HEAD_UNITS;
  const line = Math.max(1, (CHARACTER_ART.faceLinePx * r) / REF_RADIUS);
  const expr = s.expression;
  const wide = expr === 'shocked' || expr === 'frozen';
  const size = look.eyeSize * (wide ? F.wideScale : 1);
  let lid = look.lid;
  if (expr === 'sad') lid = F.sadLid;
  else if (expr === 'effort') lid = F.effortLid;
  else if (expr === 'grin') lid = Math.max(lid, F.grinLid);
  else if (wide) lid = 0;
  lid = Math.max(lid, s.blink);
  const lookY = expr === 'sad' ? F.sadLook : s.lookY;
  const pupilScale = wide ? F.smallPupil / F.pupil : 1;

  if (look.blush || expr === 'happy') {
    g.fillStyle(F.blushColor, F.blushAlpha);
    fillOval(
      g,
      cx + F.blushNear.x * u,
      cy + F.blushNear.y * u,
      F.blushNear.rx * 2 * u,
      F.blushNear.ry * 2 * u,
    );
    fillOval(
      g,
      cx + F.blushFar.x * u,
      cy + F.blushFar.y * u,
      F.blushFar.rx * 2 * u,
      F.blushFar.ry * 2 * u,
    );
  }

  for (const e of [F.near, F.far]) {
    eye.cx = cx + e.x * u;
    eye.cy = cy + e.y * u;
    eye.rx = F.eyeR * size * e.sx * u;
    eye.ry = F.eyeR * size * F.eyeTall * e.sy * u;
    if (expr === 'happy') drawHappyEye(g, line);
    else drawEye(g, look, lid, s.lookX, lookY, pupilScale, line);
  }

  drawBrows(g, look, expr, cx, cy, u);
  drawMouth(g, look, s, cx, cy + look.mouthShift * u, u, line);

  if (expr === 'sad') {
    // Ter damlası.
    const x = cx + F.sweatX * u;
    const y = cy + F.sweatY * u;
    g.fillStyle(F.sweat, 1);
    fillDisc(g, x, y, F.sweatR * u);
    g.fillTriangle(x - F.sweatR * u, y, x + F.sweatR * u, y, x, y - F.sweatR * 2 * u);
  }
}

/** Yüz çizgi kalınlığının tanımlandığı kafa yarıçapı (px). */
const REF_RADIUS = 36;

function drawEye(
  g: Graphics,
  look: CharacterLook,
  lid: number,
  lookX: number,
  lookY: number,
  pupilScale: number,
  line: number,
): void {
  const { cx, cy, rx, ry } = eye;
  if (lid >= CLOSED) {
    // Kapalı göz: alt yay.
    g.lineStyle(line, F.dark, 1);
    strokeArc(g, cx, cy - ry * HALF, rx * F.lidLine, ARC_LOW_FROM, ARC_LOW_TO);
    return;
  }
  g.fillStyle(WHITE, 1);
  fillOval(g, cx, cy, rx * 2, ry * 2);
  const max = ANIM.eyes.maxPupilOffset;
  const ir = rx * F.iris;
  const ix = cx + lookX * max * rx;
  const iy = cy + lookY * max * ry;
  g.fillStyle(look.iris, 1);
  fillDisc(g, ix, iy, ir);
  g.fillStyle(F.dark, 1);
  fillDisc(g, ix, iy, ir * F.pupil * pupilScale);
  g.fillStyle(WHITE, 1);
  fillDisc(g, ix - ir * F.highlightOffset, iy - ir * F.highlightOffset, ir * F.highlight);
  if (lid > 0) {
    // Üst göz kapağı: cilt renginde, aşağı inen elips.
    const lidCy = cy - 2 * ry + 2 * ry * lid;
    g.fillStyle(shade(look.skin, LID_SHADE), 1);
    fillOval(g, cx, lidCy, rx * 2 * LID_WIDE, ry * 2);
    g.lineStyle(line, F.dark, 1);
    strokeArc(g, cx, lidCy, rx * F.lidLine, ARC_LOW_FROM, ARC_LOW_TO);
  }
  g.lineStyle(line, F.dark, 1);
  strokeOval(g, cx, cy, rx * 2, ry * 2);
}
const CLOSED = 0.92;
/** Kafa birimi (yarıçap 100). */
const HEAD_UNITS = 100;
/** Yayların uçlardan kırpılan açısı (rad). */
const ARC_INSET = 0.35;
const HALF = 0.5;
const LID_SHADE = -0.06;
const LID_WIDE = 1.2;
/** Alt yay (kapalı göz, göz kapağı çizgisi): ~20°–160°. */
const ARC_LOW_FROM = ARC_INSET;
const ARC_LOW_TO = Math.PI - ARC_INSET;
/** Üst yay (mutlu "^" göz): ~200°–340°. */
const ARC_HIGH_FROM = Math.PI + ARC_INSET;
const ARC_HIGH_TO = Math.PI * 2 - ARC_INSET;

function drawHappyEye(g: Graphics, line: number): void {
  const { cx, cy, rx, ry } = eye;
  g.lineStyle(line * HAPPY_LINE, F.dark, 1);
  strokeArc(g, cx, cy + ry * HALF, rx, ARC_HIGH_FROM, ARC_HIGH_TO);
}
const HAPPY_LINE = 1.4;

function drawBrows(
  g: Graphics,
  look: CharacterLook,
  expr: Expression,
  cx: number,
  cy: number,
  u: number,
): void {
  let tilt = look.browTilt;
  let lift = 0;
  if (expr === 'effort') tilt = Math.max(tilt, F.angry);
  else if (expr === 'sad') tilt = F.worried;
  else if (expr === 'shocked' || expr === 'frozen' || expr === 'happy') {
    tilt = F.worried / 2;
    lift = F.raised;
  } else if (expr === 'grin') tilt = Math.max(tilt, F.angry / 2);
  const w = look.browThickness * u;
  g.lineStyle(w, look.brow, 1);
  g.fillStyle(look.brow, 1);
  const half = (F.browLen / 2) * u;
  const rise = Math.sin(tilt) * half * BROW_TILT_GAIN;
  for (const e of [F.near, F.far]) {
    const x = cx + e.x * u;
    const y = cy + (F.browY + lift) * u;
    const hx = half * e.sx;
    // İç uç (iki gözün arası) "kızgın"da aşağı iner: yakın gözde sağ uç, uzak gözde sol uç.
    const innerRight = e === F.near;
    const yl = y + (innerRight ? -rise : rise);
    const yr = y + (innerRight ? rise : -rise);
    g.lineBetween(x - hx, yl, x + hx, yr);
    fillDisc(g, x - hx, yl, w / 2);
    fillDisc(g, x + hx, yr, w / 2);
  }
}
const BROW_TILT_GAIN = 1.6;

function drawMouth(
  g: Graphics,
  look: CharacterLook,
  s: FaceState,
  cx: number,
  cy: number,
  u: number,
  line: number,
): void {
  const x = cx + F.mouthX * u;
  const y = cy + F.mouthY * u;
  const w = F.mouthW * u;
  g.lineStyle(line * MOUTH_LINE, F.dark, 1);
  switch (s.expression) {
    case 'happy': {
      // Kocaman açık gülüş: yarım daire, dil ve üst dişler.
      g.fillStyle(F.mouthDark, 1);
      fillArc(g, x, y - w * OPEN_LIFT, w * HALF * OPEN_SIZE, 0, Math.PI, true);
      g.fillStyle(F.tongue, 1);
      fillDisc(g, x, y + w * TONGUE_Y, w * TONGUE_R);
      g.fillStyle(F.teeth, 1);
      g.fillRect(x - w * TEETH_HALF, y - w * OPEN_LIFT, w * TEETH_HALF * 2, w * TEETH_H);
      return;
    }
    case 'sad':
      strokeArc(g, x, y + w * FROWN_DROP, w * HALF, ARC_HIGH_FROM, ARC_HIGH_TO);
      return;
    case 'shocked':
      g.fillStyle(F.mouthDark, 1);
      fillOval(g, x, y, w * O_W, w * O_H);
      strokeOval(g, x, y, w * O_W, w * O_H);
      return;
    case 'frozen': {
      // Takırdayan dişler.
      const jitter = Math.sin(s.time * ANIM.expressions.shiverHz) * w * CHATTER;
      g.fillStyle(F.teeth, 1);
      g.fillRect(x - w * HALF, y - w * GRIT_H + jitter, w, w * GRIT_H * 2);
      g.strokeRect(x - w * HALF, y - w * GRIT_H + jitter, w, w * GRIT_H * 2);
      g.beginPath();
      const step = w / ZIGZAG_TEETH;
      g.moveTo(x - w * HALF, y + jitter);
      for (let i = 1; i <= ZIGZAG_TEETH; i++) {
        g.lineTo(x - w * HALF + step * i, y + jitter + (i % 2 === 0 ? -1 : 1) * w * ZIGZAG);
      }
      g.strokePath();
      return;
    }
    case 'effort':
      // Sıkılmış dişler.
      g.fillStyle(F.teeth, 1);
      g.fillRect(x - w * HALF, y - w * GRIT_H, w, w * GRIT_H * 2);
      g.strokeRect(x - w * HALF, y - w * GRIT_H, w, w * GRIT_H * 2);
      g.lineBetween(x - w * HALF, y, x + w * HALF, y);
      return;
    case 'grin':
      drawGrin(g, x, y, w * GRIN_WIDE);
      return;
    case 'neutral':
      break;
  }
  switch (look.mouth) {
    case 'smile':
      strokeArc(g, x, y - w * SMILE_LIFT, w * HALF, ARC_LOW_FROM, ARC_LOW_TO);
      return;
    case 'grin':
      drawGrin(g, x, y, w);
      return;
    case 'smirk':
      g.beginPath();
      g.moveTo(x - w * HALF, y + w * SMIRK_LOW);
      g.lineTo(x, y + w * SMIRK_MID);
      g.lineTo(x + w * HALF, y - w * SMIRK_HIGH);
      g.strokePath();
      return;
    case 'flat':
      g.lineBetween(x - w * FLAT_HALF, y, x + w * FLAT_HALF, y - w * FLAT_TILT);
      return;
  }
}

/** Dişleri görünen yarım gülüş. */
function drawGrin(g: Graphics, x: number, y: number, w: number): void {
  g.fillStyle(F.mouthDark, 1);
  fillArc(g, x, y - w * GRIN_LIFT, w * HALF, 0, Math.PI, false);
  g.fillStyle(F.teeth, 1);
  g.fillRect(x - w * HALF * TEETH_SPAN, y - w * GRIN_LIFT, w * TEETH_SPAN, w * GRIN_TEETH);
  strokeArc(g, x, y - w * GRIN_LIFT, w * HALF, 0, Math.PI);
  g.lineBetween(x - w * HALF, y - w * GRIN_LIFT, x + w * HALF, y - w * GRIN_LIFT);
}

const MOUTH_LINE = 1.15;
const OPEN_LIFT = 0.12;
const OPEN_SIZE = 1.25;
const TONGUE_Y = 0.38;
const TONGUE_R = 0.24;
const TEETH_HALF = 0.42;
const TEETH_H = 0.16;
const FROWN_DROP = 0.42;
const O_W = 0.5;
const O_H = 0.62;
const CHATTER = 0.06;
const GRIT_H = 0.22;
const ZIGZAG_TEETH = 6;
const ZIGZAG = 0.12;
const GRIN_WIDE = 1.15;
const SMILE_LIFT = 0.3;
const SMIRK_LOW = 0.06;
const SMIRK_MID = 0.1;
const SMIRK_HIGH = 0.16;
const FLAT_HALF = 0.36;
const FLAT_TILT = 0.04;
const GRIN_LIFT = 0.1;
const TEETH_SPAN = 0.9;
const GRIN_TEETH = 0.2;
