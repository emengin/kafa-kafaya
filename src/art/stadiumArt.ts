import type Phaser from 'phaser';
import { DISPLAY, PITCH, STADIUM } from '../config/gameConfig';
import {
  artRandom,
  css,
  makeCanvasTexture,
  mix,
  radial,
  remakeCanvasTexture,
  shade,
  type Ctx,
} from './canvas';

/** Sık kullanılan renk. */
const WHITE = 0xffffff;

/**
 * Stadyum dokuları (Canvas 2D): gökyüzü (alacakaranlık + güneş + yıldızlar), bulutlar, ışık
 * kuleleri ve ışık hüzmesi, tribün yapısı, kalabalık şeritleri (takım renkleriyle; maç başında
 * üretilir), LED panolar, perspektifli çizgili saha ve vinyet.
 */
export const STAGE_KEYS = {
  sky: 'stage-sky',
  cloud: (i: number): string => `stage-cloud-${i}`,
  tower: 'stage-tower',
  beam: 'stage-beam',
  stands: 'stage-stands',
  field: 'stage-field',
  vignette: 'stage-vignette',
  boards: 'stage-boards',
  boardsGoal: 'stage-boards-goal',
  crowd: (row: number, cheer: boolean): string => `crowd-${row}-${cheer ? 'up' : 'sit'}`,
} as const;

const TWO_PI = Math.PI * 2;
const B = STADIUM.bleedPx;
/**
 * Arka planın çekirdeğin (1280×720) dışına taşma payı (Faz 2.2): en geniş / en uzun desteklenen
 * ekranın çekirdek dışında kalan kısmı (DISPLAY.frame) + sarsıntı payı. Dokuların sol üst köşesi
 * dünyada (−STAGE_PAD_X, −STAGE_PAD_Y)'dedir.
 */
export const STAGE_PAD_X = (DISPLAY.frame.maxWidth - DISPLAY.width) / 2 + B;
export const STAGE_PAD_Y = (DISPLAY.frame.maxHeight - DISPLAY.height) / 2 + B;
/** Arka plan dokularının genişliği (taşma payıyla). */
export const STAGE_WIDTH = DISPLAY.width + STAGE_PAD_X * 2;
/**
 * Faz 2.2 öncesi doku genişliği (yalnızca sarsıntı payı). Çatı dikmeleri, saha şeritleri ve
 * perspektif bu ölçüyle çizilir: çekirdekteki görünüm genişletmeden önceki gibi kalır.
 */
const REF_WIDTH = DISPLAY.width + B * 2;
/** Dokunun eski (Faz 2.2 öncesi) dokuya göre yatay kayması. */
const SHIFT_X = STAGE_PAD_X - B;
const SHIFT_Y = STAGE_PAD_Y - B;

export function generateStadiumTextures(scene: Phaser.Scene): void {
  makeCanvasTexture(scene, STAGE_KEYS.sky, STAGE_WIDTH, STADIUM.sky.bottomY + STAGE_PAD_Y, drawSky);
  for (let i = 0; i < STADIUM.clouds.variants; i++) {
    makeCanvasTexture(
      scene,
      STAGE_KEYS.cloud(i),
      STADIUM.clouds.width,
      STADIUM.clouds.height,
      (ctx, w, h) => {
        drawCloud(ctx, w, h, STADIUM.clouds.seed + i);
      },
    );
  }
  const t = STADIUM.towers;
  makeCanvasTexture(
    scene,
    STAGE_KEYS.tower,
    t.panelW + TOWER_PAD * 2,
    STADIUM.roof.y - t.top + TOWER_PAD,
    drawTower,
  );
  makeCanvasTexture(scene, STAGE_KEYS.beam, t.beamWidth, t.beamLength, drawBeam);
  makeCanvasTexture(
    scene,
    STAGE_KEYS.stands,
    STAGE_WIDTH,
    STADIUM.boards.y - STADIUM.roof.y + B / 2,
    drawStands,
  );
  makeCanvasTexture(
    scene,
    STAGE_KEYS.field,
    STAGE_WIDTH,
    DISPLAY.height + STAGE_PAD_Y - STADIUM.field.top,
    drawField,
  );
  makeCanvasTexture(scene, STAGE_KEYS.vignette, DISPLAY.width, DISPLAY.height, drawVignette);
}

// ───────────────────────────── Gökyüzü ─────────────────────────────

function drawSky(ctx: Ctx, w: number, h: number): void {
  const s = STADIUM;
  // Gradyan dünyada eskisiyle aynı yerde (y = −B'den ufka); üstteki ek şerit ilk renkte.
  const g = ctx.createLinearGradient(0, SHIFT_Y, 0, h);
  for (const [at, color] of s.sky.stops) g.addColorStop(at, css(color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Ufukta güneş parıltısı.
  ctx.fillStyle = radial(
    ctx,
    s.sun.x + STAGE_PAD_X,
    s.sun.y + STAGE_PAD_Y,
    0,
    s.sun.radius,
    css(s.sun.color, s.sun.alpha),
    css(s.sun.color, 0),
  );
  ctx.fillRect(0, 0, w, h);
  // Soluk yıldızlar (üstte); yoğunluk genişleyen alanda da aynı.
  const rand = artRandom(s.stars.seed);
  const band = s.stars.maxY + STAGE_PAD_Y;
  const count = Math.round((s.stars.count * w * band) / (REF_WIDTH * (s.stars.maxY + B)));
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * band;
    const r = s.stars.minSize + rand() * (s.stars.maxSize - s.stars.minSize);
    const fade = Math.min(1, 1 - (y - SHIFT_Y) / (s.stars.maxY + B));
    ctx.fillStyle = css(
      WHITE,
      s.stars.alpha * fade * (STAR_MIN_ALPHA + rand() * (1 - STAR_MIN_ALPHA)),
    );
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TWO_PI);
    ctx.fill();
  }
}
const STAR_MIN_ALPHA = 0.35;

/** Bulut: üst üste binen yumuşak daireler; altı gölgeli. */
function drawCloud(ctx: Ctx, w: number, h: number, seed: number): void {
  const rand = artRandom(seed);
  const c = STADIUM.clouds;
  const blobs: { x: number; y: number; r: number }[] = [];
  const n = CLOUD_BLOBS_MIN + Math.floor(rand() * CLOUD_BLOBS_VAR);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const r = h * (CLOUD_R_MIN + rand() * CLOUD_R_VAR) * (1 - Math.abs(u - 0.5));
    blobs.push({
      x: w * (CLOUD_MARGIN + u * (1 - CLOUD_MARGIN * 2)),
      y: h * CLOUD_BASE - r * CLOUD_RISE * rand(),
      r,
    });
  }
  for (const b of blobs) {
    const g = ctx.createRadialGradient(b.x, b.y - b.r * CLOUD_HI, b.r * CLOUD_CORE, b.x, b.y, b.r);
    g.addColorStop(0, css(c.light, 1));
    g.addColorStop(CLOUD_MID, css(mix(c.light, c.shade, CLOUD_SHADE_MIX), CLOUD_MID_ALPHA));
    g.addColorStop(1, css(c.shade, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, TWO_PI);
    ctx.fill();
  }
}
const CLOUD_BLOBS_MIN = 5;
const CLOUD_BLOBS_VAR = 3;
const CLOUD_R_MIN = 0.32;
const CLOUD_R_VAR = 0.22;
const CLOUD_MARGIN = 0.18;
const CLOUD_BASE = 0.66;
const CLOUD_RISE = 0.5;
const CLOUD_HI = 0.35;
const CLOUD_CORE = 0.1;
const CLOUD_MID = 0.7;
const CLOUD_SHADE_MIX = 0.45;
const CLOUD_MID_ALPHA = 0.85;

// ───────────────────────────── Işık kuleleri ─────────────────────────────

const TOWER_PAD = 10;

function drawTower(ctx: Ctx, w: number, h: number): void {
  const t = STADIUM.towers;
  const cx = w / 2;
  // Direk ve çapraz kafes.
  ctx.fillStyle = css(t.pole);
  ctx.fillRect(cx - t.poleW / 2, t.panelH, t.poleW, h - t.panelH);
  ctx.strokeStyle = css(shade(t.pole, TOWER_LATTICE));
  ctx.lineWidth = 2;
  for (let y = t.panelH; y < h; y += t.poleW * 2) {
    ctx.beginPath();
    ctx.moveTo(cx - t.poleW / 2, y);
    ctx.lineTo(cx + t.poleW / 2, y + t.poleW);
    ctx.moveTo(cx + t.poleW / 2, y);
    ctx.lineTo(cx - t.poleW / 2, y + t.poleW);
    ctx.stroke();
  }
  // Lamba paneli.
  const x0 = TOWER_PAD;
  ctx.fillStyle = css(t.frame);
  ctx.beginPath();
  ctx.roundRect(x0, TOWER_PAD / 2, t.panelW, t.panelH, TOWER_RADIUS);
  ctx.fill();
  const cw = t.panelW / t.lampCols;
  const ch = (t.panelH - TOWER_PAD / 2) / t.lampRows;
  for (let r = 0; r < t.lampRows; r++) {
    for (let c = 0; c < t.lampCols; c++) {
      const lx = x0 + cw * (c + 0.5);
      const ly = TOWER_PAD / 2 + ch * (r + 0.5) + TOWER_PAD * LAMP_DROP;
      const lr = Math.min(cw, ch) * LAMP_SIZE;
      ctx.fillStyle = radial(ctx, lx, ly, 0, lr, css(WHITE), css(t.lamp, LAMP_EDGE_ALPHA));
      ctx.beginPath();
      ctx.arc(lx, ly, lr, 0, TWO_PI);
      ctx.fill();
    }
  }
}
const TOWER_LATTICE = 0.18;
const TOWER_RADIUS = 6;
const LAMP_SIZE = 0.36;
const LAMP_EDGE_ALPHA = 0.85;
const LAMP_DROP = 0.25;

/** Işık hüzmesi: tepeden aşağı genişleyen, sönen üçgen (toplamalı karışım). */
function drawBeam(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,248,220,1)');
  g.addColorStop(1, 'rgba(255,248,220,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(w / 2 - BEAM_TOP, 0);
  ctx.lineTo(w / 2 + BEAM_TOP, 0);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
}
const BEAM_TOP = 18;

// ───────────────────────────── Tribün ─────────────────────────────

/** Tribün dokusunun üst kenarı (dünya y) — çatının üstü. */
export const STANDS_TOP_Y = STADIUM.roof.y;

function drawStands(ctx: Ctx, w: number, h: number): void {
  const s = STADIUM.stands;
  const roof = STADIUM.roof;
  const y0 = STANDS_TOP_Y;
  const toLocal = (y: number): number => y - y0;
  // Arka duvar ve oturak sıraları.
  ctx.fillStyle = css(s.back);
  ctx.fillRect(0, 0, w, h);
  for (let y: number = s.top, i = 0; y < s.bottom; y += s.rowHeight / 2, i++) {
    ctx.fillStyle = css(i % 2 === 0 ? s.seatA : s.seatB);
    ctx.fillRect(0, toLocal(y), w, s.rowHeight / 2);
  }
  // Üst tribün pusu (uzaklık) ve ara koridor.
  ctx.fillStyle = css(s.haze, s.upperHaze);
  ctx.fillRect(0, toLocal(s.top), w, s.concourseY - s.top);
  ctx.fillStyle = css(s.haze, s.lowerHaze);
  ctx.fillRect(0, toLocal(s.concourseY), w, s.bottom - s.concourseY);
  ctx.fillStyle = css(s.concourse);
  ctx.fillRect(0, toLocal(s.concourseY), w, s.concourseH);
  ctx.fillStyle = css(s.rail);
  ctx.fillRect(0, toLocal(s.concourseY), w, 2);
  ctx.fillRect(0, toLocal(s.concourseY + s.concourseH) - 2, w, 2);
  // Çatı: kalın kiriş + kenar ışığı + dikmeler + altında gölge. Dikme aralığı eski genişlikten
  // (çekirdekte yerleri değişmesin), genişleyen kısımda aynı aralıkla sürer.
  ctx.fillStyle = css(roof.supportColor);
  const step = REF_WIDTH / roof.supports;
  for (let x = SHIFT_X - Math.ceil(SHIFT_X / step) * step; x <= w; x += step) {
    ctx.fillRect(x - ROOF_SUPPORT / 2, 0, ROOF_SUPPORT, s.top - y0 + ROOF_SUPPORT * 2);
  }
  ctx.fillStyle = css(roof.color);
  ctx.fillRect(0, 0, w, roof.height);
  ctx.fillStyle = css(roof.edge);
  ctx.fillRect(0, roof.height - ROOF_EDGE, w, ROOF_EDGE);
  const shadowG = ctx.createLinearGradient(0, roof.height, 0, roof.height + ROOF_SHADOW);
  shadowG.addColorStop(0, 'rgba(5,6,20,0.65)');
  shadowG.addColorStop(1, 'rgba(5,6,20,0)');
  ctx.fillStyle = shadowG;
  ctx.fillRect(0, roof.height, w, ROOF_SHADOW);
}
const ROOF_SUPPORT = 6;
const ROOF_EDGE = 3;
const ROOF_SHADOW = 60;

// ───────────────────────────── Kalabalık ─────────────────────────────

/** Kalabalık dokuları: her sıra için oturan ve tezahürat eden hâli; segmentler kare olarak eklenir. */
export function generateCrowdTextures(
  scene: Phaser.Scene,
  leftColors: readonly number[],
  rightColors: readonly number[],
): void {
  const c = STADIUM.crowd;
  c.rows.forEach((row, ri) => {
    for (const cheer of [false, true]) {
      const key = STAGE_KEYS.crowd(ri, cheer);
      remakeCanvasTexture(scene, key, STAGE_WIDTH, c.rowHeight, (ctx, w, h) => {
        drawCrowdRow(
          ctx,
          w,
          h,
          row.scale,
          row.haze,
          cheer,
          leftColors,
          rightColors,
          c.seed + ri * ROW_SEED,
        );
      });
      const tex = scene.textures.get(key);
      const segW = STAGE_WIDTH / c.segments;
      for (let s = 0; s < c.segments; s++)
        tex.add(s, 0, Math.floor(segW * s), 0, Math.ceil(segW), c.rowHeight);
    }
  });
}
const ROW_SEED = 101;

function drawCrowdRow(
  ctx: Ctx,
  w: number,
  h: number,
  scale: number,
  haze: number,
  cheer: boolean,
  leftColors: readonly number[],
  rightColors: readonly number[],
  seed: number,
): void {
  const c = STADIUM.crowd;
  // Aynı tohum: oturan ve ayaktaki taraftar aynı kişiler (renkler, konumlar).
  const rand = artRandom(seed);
  const pick = <T>(list: readonly T[]): T =>
    list[Math.floor(rand() * list.length) % list.length] as T;
  const spacing = c.spacing * scale;
  const base = h - 1;
  for (let x = spacing / 2; x < w; x += spacing) {
    const fx = x + (rand() - 0.5) * c.jitterPx;
    const team = fx < w / 2 ? leftColors : rightColors;
    const shirt = rand() < c.teamShare && team.length > 0 ? pick(team) : pick(c.neutrals);
    const skin = pick(c.skins);
    const hair = pick(c.hairs);
    const scarf = rand() < c.scarfChance;
    const lift = cheer ? c.standLift * scale : 0;
    const bw = c.bodyW * scale;
    const bh = c.bodyH * scale + lift;
    const hr = c.headR * scale;
    const top = base - bh;
    const hazeMix = (col: number): number => mix(col, STADIUM.stands.haze, haze);
    // Gövde (omuzlar yuvarlak).
    ctx.fillStyle = css(hazeMix(shirt));
    ctx.beginPath();
    ctx.roundRect(fx - bw / 2, top, bw, bh + 2, [bw * BODY_ROUND, bw * BODY_ROUND, 0, 0]);
    ctx.fill();
    // Kollar havada (tezahürat).
    if (cheer) {
      ctx.strokeStyle = css(hazeMix(shirt));
      ctx.lineWidth = Math.max(2, ARM_W * scale);
      ctx.lineCap = 'round';
      const armY = top + bh * ARM_FROM;
      const reach = hr * ARM_REACH;
      ctx.beginPath();
      ctx.moveTo(fx - bw * ARM_SIDE, armY);
      ctx.lineTo(fx - bw * ARM_OUT, armY - reach);
      ctx.moveTo(fx + bw * ARM_SIDE, armY);
      ctx.lineTo(fx + bw * ARM_OUT, armY - reach);
      ctx.stroke();
      ctx.fillStyle = css(hazeMix(skin));
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(fx + sx * bw * ARM_OUT, armY - reach, hr * HAND, 0, TWO_PI);
        ctx.fill();
      }
      if (scarf) {
        ctx.strokeStyle = css(hazeMix(team.length > 0 ? pick(team) : shirt));
        ctx.lineWidth = Math.max(2, SCARF_W * scale);
        ctx.beginPath();
        ctx.moveTo(fx - bw * ARM_OUT, armY - reach);
        ctx.lineTo(fx + bw * ARM_OUT, armY - reach - hr * SCARF_SAG);
        ctx.stroke();
      }
    } else if (scarf) {
      // Oturanın boynunda atkı.
      ctx.fillStyle = css(hazeMix(team.length > 0 ? pick(team) : shirt));
      ctx.fillRect(fx - bw / 2, top, bw, Math.max(2, SCARF_W * scale));
    }
    // Baş ve saç.
    const hy = top - hr * HEAD_OVER;
    ctx.fillStyle = css(hazeMix(skin));
    ctx.beginPath();
    ctx.arc(fx, hy, hr, 0, TWO_PI);
    ctx.fill();
    ctx.fillStyle = css(hazeMix(hair));
    ctx.beginPath();
    ctx.arc(fx, hy - hr * HAIR_DROP, hr, Math.PI, TWO_PI);
    ctx.fill();
  }
}
const BODY_ROUND = 0.45;
const ARM_W = 3.2;
const ARM_FROM = 0.2;
const ARM_REACH = 2.3;
const ARM_SIDE = 0.4;
const ARM_OUT = 0.6;
const HAND = 0.42;
const SCARF_W = 3;
const SCARF_SAG = 0.3;
const HEAD_OVER = 0.65;
const HAIR_DROP = 0.18;

// ───────────────────────────── LED panolar ─────────────────────────────

/**
 * LED pano döşemesi (yatay kayar): oyunun adı, yıldızlar ve renk blokları. Gol sürümü parlak
 * zeminde "GOL!" tekrarlar. Metin dile bağlı olduğundan sahnede (dil bilindiğinde) üretilir.
 */
export function generateBoardTextures(scene: Phaser.Scene, title: string, goal: string): void {
  const b = STADIUM.boards;
  remakeCanvasTexture(scene, STAGE_KEYS.boards, b.tileWidth, b.height, (ctx, w, h) => {
    ctx.fillStyle = css(b.back);
    ctx.fillRect(0, 0, w, h);
    ctx.font = `bold ${Math.round(h * BOARD_FONT)}px "Arial Black", "Segoe UI", Arial, sans-serif`;
    ctx.textBaseline = 'middle';
    const segment = w / b.colors.length;
    b.colors.forEach((color, i) => {
      const x = segment * i;
      ctx.fillStyle = css(color, BOARD_BLOCK_ALPHA);
      ctx.fillRect(x + BOARD_PAD, BOARD_PAD, BOARD_BLOCK, h - BOARD_PAD * 2);
      ctx.fillStyle = css(color);
      ctx.fillText(
        i % 2 === 0 ? title.toUpperCase() : '★ ★ ★',
        x + BOARD_BLOCK + BOARD_PAD * BOARD_TEXT_GAP,
        h / 2,
      );
    });
    drawLedGrid(ctx, w, h);
  });
  remakeCanvasTexture(scene, STAGE_KEYS.boardsGoal, b.tileWidth, b.height, (ctx, w, h) => {
    ctx.fillStyle = css(b.goalBack);
    ctx.fillRect(0, 0, w, h);
    ctx.font = `bold ${Math.round(h * BOARD_FONT)}px "Arial Black", "Segoe UI", Arial, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = css(b.goalText);
    const n = BOARD_GOAL_REPEAT;
    for (let i = 0; i < n; i++) ctx.fillText(goal, (w / n) * (i + 0.5), h / 2);
    drawLedGrid(ctx, w, h);
  });
}
const BOARD_FONT = 0.56;
const BOARD_PAD = 5;
const BOARD_BLOCK = 22;
const BOARD_BLOCK_ALPHA = 0.85;
const BOARD_TEXT_GAP = 3;
const BOARD_GOAL_REPEAT = 4;
const LED_STEP = 3;

/** LED nokta dokusu hissi: ince koyu ızgara. */
function drawLedGrid(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  for (let x = 0; x < w; x += LED_STEP) ctx.fillRect(x, 0, 1, h);
  for (let y = 0; y < h; y += LED_STEP) ctx.fillRect(0, y, w, 1);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,0.18)');
  g.addColorStop(LED_SHINE, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
const LED_SHINE = 0.45;

// ───────────────────────────── Saha ─────────────────────────────

/** Saha dokusunun üst kenarı (dünya y). */
export const FIELD_TOP_Y = STADIUM.field.top;

/**
 * Perspektifli saha: kaçış noktasına yakınsayan biçme şeritleri, uzak kenar çizgisi, orta
 * çizgi ve daire, kale çizgileri ve ceza sahaları, ince çim dokusu, uzakta pus ve önde
 * koyulaşma. Oyuncuların bastığı çizgi y = PITCH.groundY.
 */
function drawField(ctx: Ctx, w: number, h: number): void {
  const f = STADIUM.field;
  const top = FIELD_TOP_Y;
  const vpX = w / 2;
  const vpY = f.vanishY - top;
  const bottom = h;
  // Perspektif Faz 2.2 öncesi dokunun alt kenarına göre (genişleyen saha aynı şeritlerle sürer).
  const refBottom = bottom - SHIFT_Y;
  // Kaçış noktasından geçen doğru üzerinde, eski alt kenardaki x'e karşılık gelen x (yerel y'de).
  const project = (xBottom: number, y: number): number =>
    vpX + ((xBottom - vpX) * (y - vpY)) / (refBottom - vpY);
  const stripeW = (REF_WIDTH * FIELD_SPREAD) / f.stripes;
  const startX = vpX - (REF_WIDTH * FIELD_SPREAD) / 2;
  ctx.fillStyle = css(f.a);
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < f.stripes; i++) {
    const xa = startX + stripeW * i;
    const xb = xa + stripeW;
    ctx.fillStyle = css(i % 2 === 0 ? f.a : f.b);
    ctx.beginPath();
    ctx.moveTo(project(xa, 0), 0);
    ctx.lineTo(project(xb, 0), 0);
    ctx.lineTo(project(xb, bottom), bottom);
    ctx.lineTo(project(xa, bottom), bottom);
    ctx.closePath();
    ctx.fill();
  }
  // Çim dokusu: küçük açık/koyu lekeler (yoğunluk genişleyen alanda da aynı).
  const rand = artRandom(f.seed);
  const noise = Math.round((f.noiseCount * w * h) / (REF_WIDTH * refBottom));
  for (let i = 0; i < noise; i++) {
    const y = rand() * h;
    const x = rand() * w;
    ctx.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,30,0,0.08)';
    ctx.fillRect(x, y, NOISE_W + rand() * NOISE_W, 1 + Math.min(1, y / refBottom) * NOISE_H);
  }
  // Çizgiler.
  const groundLocal = PITCH.groundY - top;
  const lineCol = css(f.line, f.lineAlpha);
  ctx.strokeStyle = lineCol;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, FAR_LINE);
  ctx.lineTo(w, FAR_LINE);
  ctx.stroke();
  // Orta çizgi ve orta daire (oyuncuların çizgisinde ortalanmış).
  ctx.beginPath();
  ctx.moveTo(vpX, FAR_LINE);
  ctx.lineTo(vpX, bottom);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(vpX, groundLocal, f.centerRx, f.centerRy, 0, 0, TWO_PI);
  ctx.stroke();
  ctx.fillStyle = lineCol;
  ctx.beginPath();
  ctx.ellipse(vpX, groundLocal, CENTER_SPOT, CENTER_SPOT * SPOT_FLAT, 0, 0, TWO_PI);
  ctx.fill();
  // Kale çizgileri ve ceza sahaları (kaçış noktasına yakınsar).
  for (const side of [-1, 1]) {
    const lineX = side < 0 ? STAGE_PAD_X + PITCH.goal.depth : w - STAGE_PAD_X - PITCH.goal.depth;
    const xBottomGoal = vpX + (lineX - vpX) * ((refBottom - vpY) / (groundLocal - vpY));
    ctx.beginPath();
    ctx.moveTo(project(xBottomGoal, FAR_LINE), FAR_LINE);
    ctx.lineTo(project(xBottomGoal, bottom), bottom);
    ctx.stroke();
    const boxX = lineX - side * f.boxDepth;
    const xBottomBox = vpX + (boxX - vpX) * ((refBottom - vpY) / (groundLocal - vpY));
    const yFar = groundLocal - BOX_HALF;
    const yNear = groundLocal + BOX_HALF;
    ctx.beginPath();
    ctx.moveTo(project(xBottomGoal, yFar), yFar);
    ctx.lineTo(project(xBottomBox, yFar), yFar);
    ctx.lineTo(project(xBottomBox, yNear), yNear);
    ctx.lineTo(project(xBottomGoal, yNear), yNear);
    ctx.stroke();
  }
  // Uzakta pus, önde koyulaşma.
  const far = ctx.createLinearGradient(0, 0, 0, groundLocal);
  far.addColorStop(0, css(f.far, FAR_ALPHA));
  far.addColorStop(1, css(f.far, 0));
  ctx.fillStyle = far;
  ctx.fillRect(0, 0, w, groundLocal);
  const near = ctx.createLinearGradient(0, groundLocal, 0, refBottom);
  near.addColorStop(0, css(f.near, 0));
  near.addColorStop(1, css(f.near, NEAR_ALPHA));
  ctx.fillStyle = near;
  ctx.fillRect(0, groundLocal, w, bottom - groundLocal);
  // Oyuncuların bastığı çizgi (kalın).
  ctx.fillStyle = css(f.line, GROUND_LINE_ALPHA);
  ctx.fillRect(0, groundLocal - 1, w, GROUND_LINE_W);
}
const FIELD_SPREAD = 1.6;
const NOISE_W = 2;
const NOISE_H = 2;
const FAR_LINE = 3;
const CENTER_SPOT = 4;
const SPOT_FLAT = 0.4;
const BOX_HALF = 34;
const FAR_ALPHA = 0.45;
const NEAR_ALPHA = 0.55;
const GROUND_LINE_ALPHA = 0.85;
const GROUND_LINE_W = 3;

/** Vinyet: kenarlar koyu, orta açık (derinlik ve odak). */
function drawVignette(ctx: Ctx, w: number, h: number): void {
  const v = STADIUM.vignette;
  const g = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * v.inner * 0.5,
    w / 2,
    h / 2,
    Math.hypot(w, h) / 2,
  );
  g.addColorStop(0, 'rgba(6,4,24,0)');
  g.addColorStop(1, `rgba(6,4,24,${v.alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
