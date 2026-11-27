/**
 * Fizik hissi ölçer (Faz 2.7, Faz 2.9'un 1. maddesi): aynı girdilerle zıplama yüksekliği, şut ve
 * süper hızları, top yörüngesi ve birkaç AI vs AI maçının sonucunu ölçer. İki sürümü (ör. Faz 2.7
 * öncesi ve sonrası) karşılaştırmak için her birinde `--json` ile kaydedip `--compare` ile
 * yan yana koyun. Ayrıca rollback maliyetini ve simülasyonun kare başına bellek ayırmasını ölçer.
 *
 * Çalıştırma:
 *   npm run feel -- --json once.json                      # ölçümleri kaydet
 *   npm run feel -- --compare once.json sonra.json        # iki kaydı karşılaştır (Markdown)
 *   npm run feel -- --bench                               # rollback: kayıt + 8 adım (Node)
 *   node --expose-gc --max-semi-space-size=64 scripts/run-ts.js scripts/feel.ts --alloc
 *
 * Yalnızca uzun süredir var olan API'ler kullanılır (GameSim, stepBallAlone, AiController): betik
 * eski bir sürümün çalışma kopyasına da kopyalanıp çalıştırılabilir.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { KICK, LOOP, PLAYER } from '../src/config/gameConfig';
import { EMPTY_INPUT, type InputState } from '../src/input/InputState';
import { AiController } from '../src/game/ai/AiController';
import { mixSeed } from '../src/game/ai/random';
import { observe } from '../src/game/ai/worldView';
import { stepBallAlone } from '../src/game/ballPhysics';
import { CHARACTER_IDS, loadoutFor, NEUTRAL_LOADOUT, type Loadout } from '../src/game/characters';
import { Ball } from '../src/game/entities/Ball';
import { footOffset, PLAYER_STAND_OFFSET } from '../src/game/entities/Player';
import { GameSim } from '../src/game/GameSim';
import { createPitch } from '../src/game/pitch';
import type { SimState } from '../src/game/simState';
import { SUPER_TYPES } from '../src/game/superEffects';

type Metrics = Record<string, number>;
type Inputs = readonly [InputState, InputState];

const IDLE: Inputs = [EMPTY_INPUT, EMPTY_INPUT];
const DT = 1 / LOOP.stepHz;
const RAD_TO_DEG = 180 / Math.PI;
const input = (p: Partial<InputState>): InputState => ({ ...EMPTY_INPUT, ...p });

/** Rakipsiz, güçlendiricisiz, santrasız bir ölçüm simülasyonu. */
function soloSim(loadout: Loadout = NEUTRAL_LOADOUT): GameSim {
  return new GameSim({
    skipKickoff: true,
    solo: true,
    powerUps: false,
    loadouts: [loadout, NEUTRAL_LOADOUT],
  });
}

/** Zıplama: tuş basılı tutulursa tepe yüksekliği ve havada kalış; tek adımlık basışta tepe. */
function measureJump(out: Metrics, name: string, loadout: Loadout): void {
  for (const [label, holdTicks] of [
    ['hold', Infinity],
    ['tap', 1],
  ] as const) {
    const sim = soloSim(loadout);
    sim.ball.resetTo(sim.pitch.width - PLAYER.head.radius * 4, PLAYER.head.radius);
    const p = sim.players[0];
    const startY = p.y;
    let minY = startY;
    let air = 0;
    for (let t = 0; t < LOOP.stepHz * 3; t++) {
      sim.step([input({ jump: t < holdTicks }), EMPTY_INPUT]);
      minY = Math.min(minY, p.y);
      if (!p.grounded) air++;
      else if (air > 0) break;
    }
    out[`jump.${name}.${label}.peakPx`] = startY - minY;
    if (label === 'hold') out[`jump.${name}.hold.airTicks`] = air;
  }
}

/** Topu P1'in dinlenen ayağının önüne koyar; `dy` < 0 → ayak topun altına değer (top yükselir). */
function ballAtFoot(sim: GameSim, dy: number): void {
  const p1 = sim.players[0];
  const o = footOffset(KICK.restAngle, 1);
  const touch = sim.ball.radius + PLAYER.foot.radius + 1;
  sim.ball.resetTo(p1.x + o.x + Math.sqrt(touch * touch - dy * dy), p1.y + o.y + dy);
}

/** Şut (ya da süper şut): çıkış hızı ve açısı, ardından topun yolu. */
function measureKick(
  out: Metrics,
  key: string,
  loadout: Loadout,
  dy: number,
  superShot: boolean,
): void {
  const sim = soloSim(loadout);
  const p1 = sim.players[0];
  p1.resetTo(PLAYER.head.radius * 8, sim.pitch.groundY - PLAYER_STAND_OFFSET);
  ballAtFoot(sim, dy);
  if (superShot) p1.superArmed = true;
  let kicked = -1;
  let maxHeight = 0;
  let goalTick = -1;
  for (let t = 0; t < LOOP.stepHz * 3 && goalTick < 0; t++) {
    const events = sim.step([input({ kick: t === 0 }), EMPTY_INPUT]);
    for (const e of events) {
      if (e.type === 'kick' && kicked < 0) {
        kicked = t;
        const b = sim.ball;
        out[`${key}.speed`] = Math.hypot(b.vx, b.vy);
        out[`${key}.angleDeg`] = Math.atan2(-b.vy, b.vx) * RAD_TO_DEG;
        out[`${key}.spin`] = b.angVel;
      }
      if (e.type === 'goal') goalTick = t;
    }
    if (kicked >= 0) {
      maxHeight = Math.max(maxHeight, sim.pitch.groundY - sim.ball.y);
      const since = t - kicked;
      if (since === 15 || since === 30 || since === 60) {
        out[`${key}.x@${since}`] = sim.ball.x;
        out[`${key}.y@${since}`] = sim.ball.y;
      }
    }
  }
  out[`${key}.maxHeightPx`] = maxHeight;
  out[`${key}.goalTick`] = goalTick;
}

/** Serbest top: aynı fırlatışın yolu, ilk sekmesi ve dönüş sönümü (Magnus, hava direnci). */
function measureFreeBall(out: Metrics): void {
  const cases = [
    ['lob', 700, -900, 12],
    ['drive', 1400, -250, -20],
    ['drop', 0, 0, 0],
  ] as const;
  for (const [label, vx, vy, spin] of cases) {
    const pitch = createPitch();
    const ball = new Ball();
    ball.resetTo(200, 300);
    ball.vx = vx;
    ball.vy = vy;
    ball.angVel = spin;
    let bounce = -1;
    let prevVy = ball.vy;
    for (let t = 1; t <= LOOP.stepHz * 2; t++) {
      stepBallAlone(ball, pitch, DT);
      if (bounce < 0 && prevVy > 0 && ball.vy < 0) {
        bounce = t;
        out[`ball.${label}.bounceX`] = ball.x;
        out[`ball.${label}.bounceVy`] = ball.vy;
      }
      prevVy = ball.vy;
      if (t === 30 || t === 60 || t === 120) {
        out[`ball.${label}.x@${t}`] = ball.x;
        out[`ball.${label}.y@${t}`] = ball.y;
        out[`ball.${label}.spin@${t}`] = ball.angVel;
      }
    }
    out[`ball.${label}.bounceTick`] = bounce;
  }
}

/** Kısa AI vs AI maçları (Zor–Zor, gerçek kurallar). Kaotik: küçük farklar skoru değiştirir. */
function measureMatches(out: Metrics): void {
  for (const seed of [1, 2, 3]) {
    const r = playAiMatch(seed, null);
    out[`match.${seed}.score0`] = r.score[0];
    out[`match.${seed}.score1`] = r.score[1];
    out[`match.${seed}.ticks`] = r.ticks;
  }
}

interface MatchRun {
  readonly score: readonly [number, number];
  readonly ticks: number;
  readonly inputs: Inputs[];
}

function playAiMatch(seed: number, maxTicks: number | null): MatchRun {
  const sim = new GameSim({ seed: mixSeed(seed, 2) });
  const ais = [
    new AiController({ index: 0, difficulty: 'hard', seed: mixSeed(seed, 0) }),
    new AiController({ index: 1, difficulty: 'hard', seed: mixSeed(seed, 1) }),
  ] as const;
  const inputs: Inputs[] = [];
  while (sim.match.phase !== 'matchEnd' && (maxTicks === null || sim.tick < maxTicks)) {
    const view = observe(sim);
    const pair: Inputs = [{ ...ais[0].update(view) }, { ...ais[1].update(view) }];
    inputs.push(pair);
    sim.step(pair);
    if (sim.tick > LOOP.stepHz * 600) break;
  }
  return { score: [sim.score[0], sim.score[1]], ticks: sim.tick, inputs };
}

function measureAll(): Metrics {
  const out: Metrics = {};
  for (const id of CHARACTER_IDS) {
    const loadout = loadoutFor(id);
    measureJump(out, id, loadout);
    measureKick(out, `kick.${id}.rest`, loadout, -9, false);
    measureKick(out, `kick.${id}.flat`, loadout, 6, false);
  }
  for (const type of SUPER_TYPES) {
    const loadout: Loadout = { params: NEUTRAL_LOADOUT.params, superType: type };
    measureKick(out, `super.${type}`, loadout, -9, true);
  }
  measureFreeBall(out);
  measureMatches(out);
  return out;
}

function percentile(sorted: readonly number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? NaN;
}

/** Rollback: her adımdan önce durum kaydı + her karede 8 adım geri sarıp yeniden simülasyon. */
function benchRollback(): void {
  const frames = 8;
  const run = playAiMatch(7, LOOP.stepHz * 90);
  const live = new GameSim({ seed: mixSeed(7, 2) });
  const shadow = new GameSim({ seed: mixSeed(7, 2) });
  const ring: (SimState | undefined)[] = Array.from({ length: frames + 1 }, () => undefined);
  const totals: number[] = [];
  for (let rep = 0; rep < 3; rep++) {
    live.loadState(new GameSim({ seed: mixSeed(7, 2) }).saveState());
    totals.length = 0;
    for (let t = 0; t < run.inputs.length; t++) {
      const t0 = performance.now();
      const slot = t % ring.length;
      ring[slot] = live.saveState(ring[slot]);
      const pair = run.inputs[t] ?? IDLE;
      live.step(pair);
      const start = t + 1 - frames;
      const first = start >= 0 ? ring[start % ring.length] : undefined;
      if (first) {
        shadow.loadState(first);
        for (let k = start; k <= t; k++) shadow.step(run.inputs[k] ?? IDLE);
      }
      totals.push(performance.now() - t0);
    }
  }
  const sorted = [...totals].sort((a, b) => a - b);
  const mean = totals.reduce((s, v) => s + v, 0) / totals.length;
  console.log(
    `Rollback (Node, kayıt + adım + 8 adım yeniden simülasyon, ${totals.length} kare): ` +
      `ort. ${mean.toFixed(3)} ms · p50 ${percentile(sorted, 0.5).toFixed(3)} · ` +
      `p99 ${percentile(sorted, 0.99).toFixed(3)} · p99,9 ${percentile(sorted, 0.999).toFixed(3)} ms`,
  );
}

/** Simülasyonun kare başına ayırması: GC'siz bir pencerede yığın büyümesi (Node, --expose-gc). */
function measureAlloc(): void {
  const gc = (globalThis as { gc?: () => void }).gc;
  if (!gc) throw new Error('--expose-gc ile çalıştırın (ve --max-semi-space-size=64)');
  const run = playAiMatch(11, LOOP.stepHz * 60);
  const sim = new GameSim({ seed: mixSeed(11, 2) });
  const shadow = new GameSim({ seed: mixSeed(11, 2) });
  const ring: (SimState | undefined)[] = Array.from({ length: 9 }, () => undefined);
  const warm = Math.floor(run.inputs.length / 2);
  const window = 600;
  const stepRange = (from: number, to: number, rollback: boolean): void => {
    for (let t = from; t < to; t++) {
      const slot = t % ring.length;
      if (rollback) ring[slot] = sim.saveState(ring[slot]);
      sim.step(run.inputs[t] ?? IDLE);
      const first = ring[(t + 1 - 8) % ring.length];
      if (rollback && t >= 8 && first) {
        shadow.loadState(first);
        for (let k = t + 1 - 8; k <= t; k++) shadow.step(run.inputs[k] ?? IDLE);
      }
    }
  };
  for (const rollback of [false, true]) {
    sim.loadState(new GameSim({ seed: mixSeed(11, 2) }).saveState());
    stepRange(0, warm, rollback);
    gc();
    const before = process.memoryUsage().heapUsed;
    stepRange(warm, warm + window, rollback);
    const bytes = process.memoryUsage().heapUsed - before;
    const label = rollback ? 'adım + kayıt + 8 adım rollback' : 'yalnızca adım';
    console.log(`Ayırma (${label}): ${(bytes / window / 1024).toFixed(2)} kB/kare`);
  }
}

function compare(beforePath: string, afterPath: string): void {
  const a = JSON.parse(readFileSync(beforePath, 'utf-8')) as Metrics;
  const b = JSON.parse(readFileSync(afterPath, 'utf-8')) as Metrics;
  const rows: string[] = [
    '| Ölçüm | Önce | Sonra | Fark | Göreli |',
    '| --- | --- | --- | --- | --- |',
  ];
  let same = 0;
  let maxRel = 0;
  let maxKey = '';
  for (const key of Object.keys(a)) {
    const x = a[key] ?? NaN;
    const y = b[key] ?? NaN;
    if (Object.is(x, y)) {
      same++;
      continue;
    }
    const rel = x === 0 ? Math.abs(y) : Math.abs((y - x) / x);
    if (rel > maxRel && !key.startsWith('match.')) {
      maxRel = rel;
      maxKey = key;
    }
    rows.push(`| ${key} | ${x} | ${y} | ${(y - x).toPrecision(3)} | ${rel.toExponential(2)} |`);
  }
  console.log(rows.join('\n'));
  console.log(
    `\n${Object.keys(a).length} ölçüm: ${same} birebir aynı; en büyük göreli fark (maçlar hariç) ` +
      `${maxRel.toExponential(2)} (${maxKey || '—'})`,
  );
}

const args = process.argv.slice(2);
const flag = (name: string): number => args.indexOf(name);
if (flag('--compare') >= 0) {
  const i = flag('--compare');
  compare(args[i + 1] ?? '', args[i + 2] ?? '');
} else if (flag('--bench') >= 0) {
  benchRollback();
} else if (flag('--alloc') >= 0) {
  measureAlloc();
} else {
  const metrics = measureAll();
  const j = flag('--json');
  if (j >= 0) writeFileSync(args[j + 1] ?? 'feel.json', `${JSON.stringify(metrics, null, 1)}\n`);
  else console.log(metrics);
  console.log(`${Object.keys(metrics).length} ölçüm.`);
}
