import type Phaser from 'phaser';
import { CHARACTER_ART, PLAYER } from '../config/gameConfig';
import { CHARACTERS, type CharacterDef, type CharacterId } from '../game/characters';
import { css, makeCanvasTexture, radial, shade, vGradient, type Ctx } from './canvas';
import { LOOKS, type CharacterLook, type HairLayer, type Paint } from './looks';

/** Sık kullanılan renk. */
const WHITE = 0xffffff;

/**
 * Karakter dokuları (Canvas 2D, bir kez): kafa (cilt, gölgelendirme, kulak, burun), arka ve ön
 * saç/aksesuar katmanları, forma (gövde), ayakkabı ve sallanan ekler (kurdele, tüy). Hepsi sağa
 * bakar; sola bakan oyuncu aynalanır. Yüz (göz, kaş, ağız) her karede ayrıca çizilir
 * (`faceDraw.ts`).
 */

/** Doku anahtarları. */
export const charKey = {
  head: (id: CharacterId): string => `char-head-${id}`,
  back: (id: CharacterId): string => `char-back-${id}`,
  front: (id: CharacterId): string => `char-front-${id}`,
  body: (id: CharacterId): string => `char-body-${id}`,
  shoe: (id: CharacterId): string => `char-shoe-${id}`,
  extra: (id: CharacterId): string => `char-extra-${id}`,
} as const;

/** Kafa birimi: yarıçap 100. */
const UNITS = 100;
/** Ön/arka katman dokusunun yarı boyu (kafa yarıçapı cinsinden): sivri saçlar sığsın. */
const LAYER_HALF = 1.95;

/** Kafa katmanı dokusunun kenar uzunluğu (px). */
export function headTextureSize(): number {
  return Math.ceil(CHARACTER_ART.headBakeRadius * LAYER_HALF * 2);
}

export function generateCharacterTextures(scene: Phaser.Scene): void {
  for (const def of CHARACTERS) generateCharacterTexture(scene, def);
}

/** Bir karakterin tüm dokuları (Preload her kareye bir karakter düşecek biçimde çağırır). */
export function generateCharacterTexture(scene: Phaser.Scene, def: CharacterDef): void {
  const look = LOOKS[def.id];
  const size = headTextureSize();
  makeCanvasTexture(scene, charKey.head(def.id), size, size, (ctx) => {
    headSpace(ctx, size);
    drawHead(ctx, look);
  });
  makeCanvasTexture(scene, charKey.back(def.id), size, size, (ctx) => {
    headSpace(ctx, size);
    drawLayers(ctx, look, 'back');
  });
  makeCanvasTexture(scene, charKey.front(def.id), size, size, (ctx) => {
    headSpace(ctx, size);
    drawLayers(ctx, look, 'front');
  });
  drawBodyTexture(scene, def);
  drawShoeTexture(scene, def);
  if (look.extra) drawExtraTexture(scene, def.id, look);
}

/** Kafa koordinatları: doku merkezi, kafa yarıçapı 100 birim. */
function headSpace(ctx: Ctx, size: number): void {
  ctx.translate(size / 2, size / 2);
  const k = CHARACTER_ART.headBakeRadius / UNITS;
  ctx.scale(k, k);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

/** Kontur kalınlığı (kafa birimi). */
function outlineUnits(): number {
  return (CHARACTER_ART.outlinePx * UNITS) / CHARACTER_ART.headBakeRadius;
}

const HEAD = {
  lightX: 26,
  lightY: -36,
  lightR0: 8,
  lightR1: 118,
  lighten: 0.16,
  darken: -0.2,
  earX: -14,
  earY: 8,
  earRx: 16,
  earRy: 21,
  earShade: -0.1,
  earInner: 'M-18,0 Q-8,6 -16,18',
  noseX: 96,
  noseY: 12,
  noseR: 15,
  noseArcFrom: -1.9,
  noseArcTo: 2.1,
  jawShade: 0.18,
  /** Çene gölgesinin başladığı yükseklik (yarıçapa oran) ve saydamlığı. */
  jawFrom: 0.4,
  jawAlpha: 0.5,
  earOutline: 0.8,
  earInnerOutline: 0.6,
} as const;

function drawHead(ctx: Ctx, look: CharacterLook): void {
  const o = outlineUnits();
  const skin = look.skin;
  // Kafa: sol üstten ışık alan cilt.
  ctx.beginPath();
  ctx.arc(0, 0, UNITS, 0, Math.PI * 2);
  ctx.fillStyle = radial(
    ctx,
    HEAD.lightX,
    HEAD.lightY,
    HEAD.lightR0,
    HEAD.lightR1,
    css(shade(skin, HEAD.lighten)),
    css(shade(skin, HEAD.darken)),
  );
  ctx.fill();
  // Çene altı gölgesi.
  ctx.save();
  ctx.clip();
  ctx.fillStyle = vGradient(ctx, UNITS * HEAD.jawFrom, UNITS, [
    [0, shade(skin, 0)],
    [1, shade(skin, -HEAD.jawShade)],
  ]);
  ctx.globalAlpha = HEAD.jawAlpha;
  ctx.fillRect(-UNITS, UNITS * HEAD.jawFrom, UNITS * 2, UNITS);
  ctx.restore();
  ctx.lineWidth = o;
  ctx.strokeStyle = css(CHARACTER_ART.outline);
  ctx.stroke();
  // Kulak.
  ctx.beginPath();
  ctx.ellipse(HEAD.earX, HEAD.earY, HEAD.earRx, HEAD.earRy, 0, 0, Math.PI * 2);
  ctx.fillStyle = css(shade(skin, HEAD.earShade));
  ctx.fill();
  ctx.lineWidth = o * HEAD.earOutline;
  ctx.stroke();
  ctx.lineWidth = o * HEAD.earInnerOutline;
  ctx.stroke(new Path2D(HEAD.earInner));
  // Burun: kafa konturunun üstünde, yalnızca dış yayı konturlu.
  ctx.beginPath();
  ctx.arc(HEAD.noseX, HEAD.noseY, HEAD.noseR, 0, Math.PI * 2);
  ctx.fillStyle = css(shade(skin, 0));
  ctx.fill();
  ctx.beginPath();
  ctx.arc(HEAD.noseX, HEAD.noseY, HEAD.noseR, HEAD.noseArcFrom, HEAD.noseArcTo);
  ctx.lineWidth = o;
  ctx.stroke();
}

/** Saç/aksesuar boyası. */
function paintFor(ctx: Ctx, look: CharacterLook, paint: Paint): string | CanvasGradient {
  const g = CHARACTER_ART.hairGradient;
  const grad = (top: number, bottom: number): CanvasGradient =>
    vGradient(ctx, g.top, g.bottom, [
      [0, top],
      [1, bottom],
    ]);
  switch (paint) {
    case 'hair':
      return grad(shade(look.hair, g.lighten), shade(look.hair, g.darken));
    case 'hair2':
      return css(look.hair2);
    case 'hairGrad':
      return grad(look.hair2, shade(look.hair, g.darken));
    case 'acc':
      return grad(shade(look.acc, g.lighten), shade(look.acc, g.darken));
    case 'acc2':
      return css(look.acc2);
    case 'white':
      return grad(WHITE, shade(WHITE, g.darken));
    case 'skin':
      return css(look.skin);
  }
}

function drawLayers(ctx: Ctx, look: CharacterLook, which: HairLayer['layer']): void {
  const o = outlineUnits();
  const outline = css(CHARACTER_ART.outline);
  for (const layer of look.layers) {
    if (layer.layer !== which) continue;
    const path = new Path2D(layer.d);
    const fill = paintFor(ctx, look, layer.paint);
    ctx.globalAlpha = layer.alpha ?? 1;
    if (layer.stroke !== undefined) {
      if (layer.outline !== false) {
        ctx.lineWidth = layer.stroke + o * 2;
        ctx.strokeStyle = outline;
        ctx.stroke(path);
      }
      ctx.lineWidth = layer.stroke;
      ctx.strokeStyle = fill;
      ctx.stroke(path);
    } else if (layer.union === true) {
      ctx.lineWidth = o * 2;
      ctx.strokeStyle = outline;
      ctx.stroke(path);
      ctx.fillStyle = fill;
      ctx.fill(path);
    } else {
      ctx.fillStyle = fill;
      ctx.fill(path);
      if (layer.outline !== false) {
        ctx.lineWidth = o;
        ctx.strokeStyle = outline;
        ctx.stroke(path);
      }
    }
  }
  ctx.globalAlpha = 1;
}

/** Forma: gövde dairesi (gradyan), şort, göğüs şeridi, yaka ve rozet. */
const BODY = {
  stripeFrom: { x: 0.2, y: -1.1 },
  stripeTo: { x: -0.9, y: 0.9 },
  stripeWidth: 0.32,
  shortsTop: 0.42,
  collarR: 0.62,
  collarFrom: -2.3,
  collarTo: -0.6,
  collarWidth: 0.16,
  badgeX: 0.42,
  badgeY: -0.12,
  badgeR: 0.2,
  badgeDot: 0.1,
  lightX: -0.35,
  lightY: -0.45,
  lightOuter: 1.2,
  light: 0.22,
  dark: -0.25,
} as const;

function drawBodyTexture(scene: Phaser.Scene, def: CharacterDef): void {
  const s = CHARACTER_ART.bakeScale;
  const r = PLAYER.body.radius * s;
  const o = CHARACTER_ART.outlinePx * s;
  const size = Math.ceil((r + o) * 2);
  const { body, foot, accent } = def.palette;
  makeCanvasTexture(scene, charKey.body(def.id), size, size, (ctx) => {
    ctx.translate(size / 2, size / 2);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.save();
    ctx.fillStyle = radial(
      ctx,
      r * BODY.lightX,
      r * BODY.lightY,
      r * BODY.badgeDot,
      r * BODY.lightOuter,
      css(shade(body, BODY.light)),
      css(shade(body, BODY.dark)),
    );
    ctx.fill();
    ctx.clip();
    // Şerit (vurgu rengi).
    ctx.strokeStyle = css(accent);
    ctx.lineWidth = r * BODY.stripeWidth;
    ctx.beginPath();
    ctx.moveTo(r * BODY.stripeFrom.x, r * BODY.stripeFrom.y);
    ctx.lineTo(r * BODY.stripeTo.x, r * BODY.stripeTo.y);
    ctx.stroke();
    // Şort.
    ctx.fillStyle = css(shade(foot, BODY.light / 2));
    ctx.fillRect(-r, r * BODY.shortsTop, r * 2, r);
    ctx.restore();
    // Yaka.
    ctx.strokeStyle = css(accent);
    ctx.lineWidth = r * BODY.collarWidth;
    ctx.beginPath();
    ctx.arc(0, 0, r * BODY.collarR, BODY.collarFrom, BODY.collarTo);
    ctx.stroke();
    // Rozet.
    ctx.fillStyle = css(WHITE);
    ctx.beginPath();
    ctx.arc(r * BODY.badgeX, r * BODY.badgeY, r * BODY.badgeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css(accent);
    ctx.beginPath();
    ctx.arc(r * BODY.badgeX, r * BODY.badgeY, r * BODY.badgeDot, 0, Math.PI * 2);
    ctx.fill();
    // Kontur.
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.lineWidth = o;
    ctx.strokeStyle = css(CHARACTER_ART.outline);
    ctx.stroke();
  });
}

/** Krampon (sağa bakar; doku merkezi = ayak dairesinin merkezi). Ölçüler ayak yarıçapına oran. */
const SHOE = {
  path: 'M-1.15,0.15 Q-1.2,-0.75 -0.45,-0.8 L0.15,-0.62 Q0.95,-0.45 1.35,0.05 Q1.5,0.55 1.0,0.62 L-0.95,0.62 Q-1.25,0.55 -1.15,0.15 Z',
  sole: 'M-1.12,0.38 L1.3,0.38 Q1.42,0.62 1.0,0.66 L-0.95,0.66 Q-1.2,0.6 -1.12,0.38 Z',
  laces: 'M-0.25,-0.62 L0.05,-0.2 M0.15,-0.55 L0.42,-0.15 M0.55,-0.42 L0.75,-0.05',
  studs: { heel: -0.75, mid: -0.2, ball: 0.4, toe: 0.9 },
  studW: 0.16,
  studH: 0.18,
  studY: 0.62,
  halfW: 1.6,
  halfH: 1.0,
  laceWidth: 0.8,
  topLight: 0.25,
  bottomDark: -0.2,
  soleLight: 0.3,
} as const;

function drawShoeTexture(scene: Phaser.Scene, def: CharacterDef): void {
  const s = CHARACTER_ART.bakeScale;
  const u = PLAYER.foot.radius * s;
  const o = CHARACTER_ART.outlinePx * s;
  const w = Math.ceil(u * SHOE.halfW * 2 + o * 2);
  const h = Math.ceil(u * SHOE.halfH * 2 + o * 2);
  const { foot, accent } = def.palette;
  makeCanvasTexture(scene, charKey.shoe(def.id), w, h, (ctx) => {
    ctx.translate(w / 2, h / 2);
    ctx.scale(u, u);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const lw = o / u;
    ctx.fillStyle = vGradient(ctx, -1, 1, [
      [0, shade(foot, SHOE.topLight)],
      [1, shade(foot, SHOE.bottomDark)],
    ]);
    const body = new Path2D(SHOE.path);
    ctx.fill(body);
    ctx.fillStyle = css(shade(accent, SHOE.soleLight));
    ctx.fill(new Path2D(SHOE.sole));
    ctx.fillStyle = css(CHARACTER_ART.outline);
    for (const x of Object.values(SHOE.studs)) {
      ctx.fillRect(x, SHOE.studY, SHOE.studW, SHOE.studH);
    }
    ctx.strokeStyle = css(WHITE);
    ctx.lineWidth = lw * SHOE.laceWidth;
    ctx.stroke(new Path2D(SHOE.laces));
    ctx.strokeStyle = css(CHARACTER_ART.outline);
    ctx.lineWidth = lw;
    ctx.stroke(body);
  });
}

/** Ek dokular: kurdele (iki uç) ve tüy. Doku orijini bağlantı noktası (`EXTRA_ORIGIN`). */
const RIBBON = {
  knotDark: -0.15,
  w: 110,
  h: 70,
  knotX: 100,
  knotY: 26,
  tails:
    'M0,0 Q-30,-16 -62,-6 Q-82,0 -96,-12 L-92,8 Q-72,18 -50,10 Q-24,4 0,8 Z M0,6 Q-24,18 -48,26 Q-66,32 -80,26 L-76,42 Q-58,46 -40,36 Q-18,24 2,12 Z',
  knot: 'M-8,4 a9,9 0 1,0 18,0 a9,9 0 1,0 -18,0',
} as const;
const FEATHER = {
  quillWidth: 0.6,
  light: 0.3,
  dark: -0.2,
  barbDark: -0.35,
  w: 70,
  h: 120,
  baseX: 35,
  baseY: 112,
  vane: 'M0,0 Q-22,-30 -16,-70 Q-8,-96 4,-104 Q14,-80 14,-50 Q12,-20 0,0 Z',
  quill: 'M0,0 Q2,-50 2,-100',
  barbs: 'M-12,-40 L1,-30 M-14,-58 L1,-48 M-12,-76 L1,-66 M12,-44 L1,-36 M12,-62 L1,-54',
} as const;

/** Ek dokusunun bağlantı noktası (doku içinde, px) — `CharacterRig` orijini buna göre ayarlar. */
export function extraOrigin(kind: 'ribbon' | 'feather'): { x: number; y: number } {
  return kind === 'ribbon'
    ? { x: RIBBON.knotX / RIBBON.w, y: RIBBON.knotY / RIBBON.h }
    : { x: FEATHER.baseX / FEATHER.w, y: FEATHER.baseY / FEATHER.h };
}

function drawExtraTexture(scene: Phaser.Scene, id: CharacterId, look: CharacterLook): void {
  const extra = look.extra;
  if (!extra) return;
  const k = CHARACTER_ART.headBakeRadius / UNITS;
  const o = outlineUnits();
  const outline = css(CHARACTER_ART.outline);
  if (extra.kind === 'ribbon') {
    makeCanvasTexture(scene, charKey.extra(id), RIBBON.w * k, RIBBON.h * k, (ctx) => {
      ctx.scale(k, k);
      ctx.translate(RIBBON.knotX, RIBBON.knotY);
      ctx.lineJoin = 'round';
      const tails = new Path2D(RIBBON.tails);
      ctx.fillStyle = paintFor(ctx, look, 'acc');
      ctx.fill(tails);
      ctx.lineWidth = o;
      ctx.strokeStyle = outline;
      ctx.stroke(tails);
      const knot = new Path2D(RIBBON.knot);
      ctx.fillStyle = css(shade(look.acc, RIBBON.knotDark));
      ctx.fill(knot);
      ctx.stroke(knot);
    });
    return;
  }
  makeCanvasTexture(scene, charKey.extra(id), FEATHER.w * k, FEATHER.h * k, (ctx) => {
    ctx.scale(k, k);
    ctx.translate(FEATHER.baseX, FEATHER.baseY);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const vane = new Path2D(FEATHER.vane);
    ctx.fillStyle = vGradient(ctx, -FEATHER.h, 0, [
      [0, shade(look.acc2, FEATHER.light)],
      [1, shade(look.acc2, FEATHER.dark)],
    ]);
    ctx.fill(vane);
    ctx.lineWidth = o;
    ctx.strokeStyle = outline;
    ctx.stroke(vane);
    ctx.lineWidth = o * FEATHER.quillWidth;
    ctx.stroke(new Path2D(FEATHER.quill));
    ctx.strokeStyle = css(shade(look.acc2, FEATHER.barbDark));
    ctx.stroke(new Path2D(FEATHER.barbs));
  });
}
