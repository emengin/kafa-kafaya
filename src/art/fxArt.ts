import type Phaser from 'phaser';
import { CHARACTER_ART } from '../config/gameConfig';
import { PARTICLE_FRAMES, type ParticleFrame } from '../fx/ParticlePool';
import { css, makeCanvasTexture, radial, type Ctx } from './canvas';

/**
 * Efekt dokuları (Canvas 2D, bir kez): parçacık atlası (beyaz çizilir, renk tint ile verilir),
 * parlama, gölge, buz bloğu, vuruş flaşı, şok halkası, güneş ışınları ve top.
 */
export const FX_KEYS = {
  particles: 'fx-particles',
  glow: 'fx-glow',
  shadow: 'fx-shadow',
  ice: 'fx-ice',
  flash: 'fx-flash',
  ring: 'fx-ring',
  rays: 'fx-rays',
  ballPattern: 'ball-pattern',
  ballShade: 'ball-shade',
  balloon: 'fx-balloon',
} as const;

/** Parçacık atlası: kare kenarı (px) ve sütun sayısı. */
const CELL = 48;
const COLS = 4;
const TWO_PI = Math.PI * 2;

/** Atlastaki karenin sol üst köşesi. */
function cellOrigin(index: number): { x: number; y: number } {
  return { x: (index % COLS) * CELL, y: Math.floor(index / COLS) * CELL };
}

export function generateFxTextures(scene: Phaser.Scene): void {
  generateParticleAtlas(scene);
  makeCanvasTexture(scene, FX_KEYS.glow, GLOW_SIZE, GLOW_SIZE, (ctx, w) => {
    const c = w / 2;
    ctx.fillStyle = radial(ctx, c, c, 0, c, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    // Yumuşak düşüş: ortada daha yoğun.
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(GLOW_MID, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
  makeCanvasTexture(scene, FX_KEYS.shadow, GLOW_SIZE, GLOW_SIZE, (ctx, w) => {
    const c = w / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(10,8,30,1)');
    g.addColorStop(SHADOW_MID, 'rgba(10,8,30,0.6)');
    g.addColorStop(1, 'rgba(10,8,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
  makeCanvasTexture(scene, FX_KEYS.ice, ICE.w, ICE.h, drawIceBlock);
  makeCanvasTexture(scene, FX_KEYS.flash, GLOW_SIZE, GLOW_SIZE, drawFlash);
  makeCanvasTexture(scene, FX_KEYS.ring, GLOW_SIZE, GLOW_SIZE, (ctx, w) => {
    const c = w / 2;
    const g = ctx.createRadialGradient(c, c, c * RING_INNER, c, c, c);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(RING_PEAK, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
  makeCanvasTexture(scene, FX_KEYS.rays, RAYS_SIZE, RAYS_SIZE, drawRays);
  makeCanvasTexture(scene, FX_KEYS.balloon, BALLOON.w, BALLOON.h, drawBalloon);
  generateBallTextures(scene);
}

/**
 * Güçlendirici balonu (beyaz çizilir, tür rengiyle tint edilir): parlak gövde, düğüm, kontur.
 * Doku merkezi gövdenin merkezidir; boyut `POWERUPS.balloon.radius` ile ölçeklenir.
 */
const BALLOON = {
  w: 76,
  h: 92,
  r: 32,
  cy: 38,
  stretch: 1.12,
  knot: 'M-6,8 L6,8 L3,0 L-3,0 Z',
  shine: 'M-18,-18 Q-10,-28 4,-26 Q-6,-20 -12,-8 Z',
} as const;

/** Balon dokusunun gövde yarıçapı (px) ve merkezin dokudaki yeri (oran). */
export const BALLOON_ART = { radius: BALLOON.r, originY: BALLOON.cy / BALLOON.h } as const;

function drawBalloon(ctx: Ctx, w: number): void {
  const o = CHARACTER_ART.outlinePx;
  ctx.translate(w / 2, BALLOON.cy);
  ctx.beginPath();
  ctx.ellipse(0, 0, BALLOON.r, BALLOON.r * BALLOON.stretch, 0, 0, TWO_PI);
  ctx.fillStyle = radial(
    ctx,
    -BALLOON.r * BALLOON_HI,
    -BALLOON.r * BALLOON_HI,
    2,
    BALLOON.r * 2,
    'rgba(255,255,255,1)',
    'rgba(170,170,190,1)',
  );
  ctx.fill();
  ctx.lineWidth = o;
  ctx.strokeStyle = css(CHARACTER_ART.outline);
  ctx.stroke();
  ctx.save();
  ctx.translate(0, BALLOON.r * BALLOON.stretch);
  const knot = new Path2D(BALLOON.knot);
  ctx.fillStyle = 'rgba(200,200,215,1)';
  ctx.fill(knot);
  ctx.lineWidth = o * BALLOON_KNOT_LINE;
  ctx.stroke(knot);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill(new Path2D(BALLOON.shine));
}
const BALLOON_HI = 0.4;
const BALLOON_KNOT_LINE = 0.7;

const GLOW_SIZE = 128;
const GLOW_MID = 0.4;
const SHADOW_MID = 0.55;
const RING_INNER = 0.6;
const RING_PEAK = 0.55;
const RAYS_SIZE = 512;

/** Atlası çizer ve her parçacık karesini dokuya ekler. */
function generateParticleAtlas(scene: Phaser.Scene): void {
  const rows = Math.ceil(PARTICLE_FRAMES.length / COLS);
  const created = makeCanvasTexture(scene, FX_KEYS.particles, CELL * COLS, CELL * rows, (ctx) => {
    PARTICLE_FRAMES.forEach((frame, i) => {
      const o = cellOrigin(i);
      ctx.save();
      ctx.translate(o.x + CELL / 2, o.y + CELL / 2);
      drawParticle(ctx, frame);
      ctx.restore();
    });
  });
  if (!created) return;
  const tex = scene.textures.get(FX_KEYS.particles);
  PARTICLE_FRAMES.forEach((frame, i) => {
    const o = cellOrigin(i);
    tex.add(frame, 0, o.x, o.y, CELL, CELL);
  });
}

/** Kare içi şekil oranları (yarı kenar = 24 px). */
const P = {
  r: 22,
  puffs: { a: { x: -6, y: 2, r: 13 }, b: { x: 6, y: -3, r: 14 }, c: { x: 2, y: 7, r: 11 } },
  sparkLen: 22,
  sparkW: 4,
  starOuter: 21,
  starInner: 4,
  confettiW: 16,
  confettiH: 9,
  shard: 'M0,-21 L8,4 L2,20 L-7,6 Z',
  flakeArm: 18,
  flakeTick: 6,
  leaf: 'M-18,6 Q-6,-16 18,-6 Q6,14 -18,6 Z',
  ringR: 17,
  ringW: 4,
  blade: 'M-3,20 Q-2,-4 6,-21 Q2,0 3,20 Z',
  rock: 'M-14,-8 L-4,-17 L11,-12 L17,3 L7,15 L-9,14 L-17,3 Z',
  heart: 'M0,16 C-22,2 -14,-18 0,-7 C14,-18 22,2 0,16 Z',
  softEdge: 0.55,
} as const;

function drawParticle(ctx: Ctx, frame: ParticleFrame): void {
  const white = 'rgba(255,255,255,1)';
  const clear = 'rgba(255,255,255,0)';
  ctx.fillStyle = white;
  ctx.strokeStyle = white;
  ctx.lineCap = 'round';
  switch (frame) {
    case 'dot':
      ctx.fillStyle = radial(ctx, 0, 0, 0, P.r, white, clear);
      ctx.fillRect(-CELL / 2, -CELL / 2, CELL, CELL);
      return;
    case 'puff':
      for (const b of Object.values(P.puffs)) {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(P.softEdge, 'rgba(255,255,255,0.75)');
        g.addColorStop(1, clear);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, TWO_PI);
        ctx.fill();
      }
      return;
    case 'spark': {
      const g = ctx.createLinearGradient(-P.sparkLen, 0, P.sparkLen, 0);
      g.addColorStop(0, clear);
      g.addColorStop(P.softEdge, white);
      g.addColorStop(1, clear);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, P.sparkLen, P.sparkW, 0, 0, TWO_PI);
      ctx.fill();
      return;
    }
    case 'star':
      ctx.beginPath();
      for (let i = 0; i < STAR_POINTS * 2; i++) {
        const a = (i * Math.PI) / STAR_POINTS - Math.PI / 2;
        const r = i % 2 === 0 ? P.starOuter : P.starInner;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      return;
    case 'confetti':
      ctx.fillRect(-P.confettiW / 2, -P.confettiH / 2, P.confettiW, P.confettiH);
      return;
    case 'shard':
      ctx.fill(new Path2D(P.shard));
      return;
    case 'flake':
      ctx.lineWidth = 3;
      for (let i = 0; i < FLAKE_ARMS; i++) {
        const a = (i * Math.PI) / FLAKE_ARMS;
        const dx = Math.cos(a) * P.flakeArm;
        const dy = Math.sin(a) * P.flakeArm;
        ctx.beginPath();
        ctx.moveTo(-dx, -dy);
        ctx.lineTo(dx, dy);
        ctx.stroke();
      }
      return;
    case 'leaf':
      ctx.fill(new Path2D(P.leaf));
      return;
    case 'ring':
      ctx.lineWidth = P.ringW;
      ctx.beginPath();
      ctx.arc(0, 0, P.ringR, 0, TWO_PI);
      ctx.stroke();
      return;
    case 'blade':
      ctx.fill(new Path2D(P.blade));
      return;
    case 'rock': {
      const path = new Path2D(P.rock);
      ctx.fillStyle = 'rgba(235,235,235,1)';
      ctx.fill(path);
      ctx.fillStyle = 'rgba(160,160,160,1)';
      ctx.fill(new Path2D('M-4,-17 L11,-12 L17,3 L2,0 Z'));
      return;
    }
    case 'heart':
      ctx.fill(new Path2D(P.heart));
      return;
  }
}
const STAR_POINTS = 4;
const FLAKE_ARMS = 3;

/** Buz bloğu: yarı saydam camgöbeği, parlak kenarlar ve çatlaklar. */
const ICE = {
  w: 120,
  h: 160,
  radius: 26,
  edge: 5,
  shine: 'M18,24 Q30,14 52,16 L44,28 Q30,28 24,40 Z',
  cracks: 'M82,40 L92,62 L80,78 M30,110 L44,124 L40,142 M96,104 L84,118',
} as const;

function drawIceBlock(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, 'rgba(220,250,255,0.75)');
  g.addColorStop(1, 'rgba(110,200,240,0.6)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(ICE.edge, ICE.edge, w - ICE.edge * 2, h - ICE.edge * 2, ICE.radius);
  ctx.fill();
  ctx.lineWidth = ICE.edge;
  ctx.strokeStyle = 'rgba(240,255,255,0.95)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill(new Path2D(ICE.shine));
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.stroke(new Path2D(ICE.cracks));
}

/** Vuruş flaşı: 8 kollu ışık yıldızı + yumuşak hale. */
function drawFlash(ctx: Ctx, w: number): void {
  const c = w / 2;
  ctx.translate(c, c);
  ctx.fillStyle = radial(
    ctx,
    0,
    0,
    0,
    c * FLASH_HALO,
    'rgba(255,255,255,0.9)',
    'rgba(255,255,255,0)',
  );
  ctx.fillRect(-c, -c, w, w);
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.beginPath();
  for (let i = 0; i < FLASH_POINTS * 2; i++) {
    const a = (i * Math.PI) / FLASH_POINTS;
    const r = i % 2 === 0 ? c * (i % (FLASH_POINTS / 2) === 0 ? 1 : FLASH_SHORT) : c * FLASH_INNER;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}
const FLASH_POINTS = 8;
const FLASH_SHORT = 0.62;
const FLASH_INNER = 0.14;
const FLASH_HALO = 0.7;

/** Güneş ışınları (GOL! yazısının arkasında döner). */
function drawRays(ctx: Ctx, w: number): void {
  const c = w / 2;
  ctx.translate(c, c);
  const g = ctx.createRadialGradient(0, 0, c * RAYS_INNER, 0, 0, c);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  for (let i = 0; i < RAYS_COUNT; i++) {
    const a = (i * TWO_PI) / RAYS_COUNT;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, c, a, a + (TWO_PI / RAYS_COUNT) * RAYS_FILL);
    ctx.closePath();
    ctx.fill();
  }
}
const RAYS_COUNT = 18;
const RAYS_FILL = 0.5;
const RAYS_INNER = 0.1;

/** Top: dönen desen (beyaz + koyu yamalar + dikişler) ve dönmeyen gölgelendirme/kontur. */
const BALL_ART = {
  bakeRadius: 34,
  patch: 0x23232e,
  centerR: 0.36,
  ringDist: 0.9,
  ringR: 0.34,
  seam: 0.06,
  pentagon: 5,
  hiX: -0.36,
  hiY: -0.42,
  hiR: 0.7,
  shadeX: 0.22,
  shadeY: 0.28,
  shadeR0: 0.35,
} as const;

/** Top dokusunun yarıçapı (px): çizimde `BALL.radius / bakeRadius` ile ölçeklenir. */
export const BALL_BAKE_RADIUS = BALL_ART.bakeRadius;

function pentagonPath(ctx: Ctx, x: number, y: number, r: number, rot: number): void {
  ctx.beginPath();
  for (let i = 0; i < BALL_ART.pentagon; i++) {
    const a = rot + (i * TWO_PI) / BALL_ART.pentagon;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

function generateBallTextures(scene: Phaser.Scene): void {
  const R = BALL_ART.bakeRadius;
  const o = CHARACTER_ART.outlinePx;
  const size = Math.ceil((R + o) * 2);
  makeCanvasTexture(scene, FX_KEYS.ballPattern, size, size, (ctx) => {
    ctx.translate(size / 2, size / 2);
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TWO_PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = css(BALL_ART.patch);
    ctx.strokeStyle = css(BALL_ART.patch);
    ctx.lineWidth = R * BALL_ART.seam;
    const up = -Math.PI / 2;
    pentagonPath(ctx, 0, 0, R * BALL_ART.centerR, up);
    ctx.fill();
    for (let i = 0; i < BALL_ART.pentagon; i++) {
      const a = up + ((i + 0.5) * TWO_PI) / BALL_ART.pentagon;
      const px = Math.cos(a) * R * BALL_ART.ringDist;
      const py = Math.sin(a) * R * BALL_ART.ringDist;
      pentagonPath(ctx, px, py, R * BALL_ART.ringR, a + Math.PI);
      ctx.fill();
      // Dikiş: merkez beşgenin köşesinden dışa.
      const va = up + (i * TWO_PI) / BALL_ART.pentagon;
      ctx.beginPath();
      ctx.moveTo(Math.cos(va) * R * BALL_ART.centerR, Math.sin(va) * R * BALL_ART.centerR);
      ctx.lineTo(Math.cos(va) * R, Math.sin(va) * R);
      ctx.stroke();
    }
    ctx.restore();
  });
  makeCanvasTexture(scene, FX_KEYS.ballShade, size, size, (ctx) => {
    ctx.translate(size / 2, size / 2);
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TWO_PI);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = radial(
      ctx,
      R * BALL_ART.shadeX,
      R * BALL_ART.shadeY,
      R * BALL_ART.shadeR0,
      R * BALL_ART.ringDist * 2,
      'rgba(20,20,60,0)',
      'rgba(20,20,60,0.55)',
    );
    ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.fillStyle = radial(
      ctx,
      R * BALL_ART.hiX,
      R * BALL_ART.hiY,
      0,
      R * BALL_ART.hiR,
      'rgba(255,255,255,0.75)',
      'rgba(255,255,255,0)',
    );
    ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.restore();
    ctx.lineWidth = o;
    ctx.strokeStyle = css(CHARACTER_ART.outline);
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TWO_PI);
    ctx.stroke();
  });
}
