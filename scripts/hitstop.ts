/**
 * Hit-stop prototipinin ölçümü (Faz 2.7, madde 5): hit-stop artık yalnızca görüntüde. Simülasyon
 * donma sırasında da akar; görüntü geride kalır ve sonra yetişir. Bu betik AI vs AI maçlarını
 * ekran kareleriyle (60 Hz) oynatıp üç biçimi ve eski yöntemi (simülasyonu durduran hit-stop)
 * karşılaştırır.
 *
 * Çalıştırma: `node scripts/run-ts.js scripts/hitstop.ts [--matches 4] [--hz 60]`
 *
 * Ölçülenler (yalnızca oyun akarken; gol sonrası ağır çekim hariç):
 * - **Donma:** dakikada kaç hit-stop, oyun süresinin yüzde kaçı donuk.
 * - **Ek görsel gecikme:** bir adımda okunan girdinin ekrana çıkması, zaman efekti olmayan duruma
 *   göre ne kadar gecikiyor (ms; tüm adımlar üzerinden ortalama, p99, en kötü). Eski yöntemde
 *   bunun karşılığı girdinin donma bitene kadar beklemesiydi.
 * - **Görüntü sıçraması:** topun gösterilen konumunun bir karede aldığı en uzun yol (px) ve hit-stop
 *   olmayan biçime göre oranı (hızlı yetişme ~2×, atlama: birkaç adımlık sıçrama).
 * - **Saat kayması (eski yöntem):** donmalar simülasyonu durdurduğu için maç saati gerçek zamanın
 *   gerisine düşüyordu (dakikada toplam donma); online maçta iki istemci saniyede 60 adımda kalmak
 *   zorunda olduğundan eski yöntem online'da kullanılamaz.
 */
import { BALL, JUICE, LOOP } from '../src/config/gameConfig';
import { hitStopForSpeed } from '../src/fx/feel';
import { AiController } from '../src/game/ai/AiController';
import { mixSeed } from '../src/game/ai/random';
import { observe } from '../src/game/ai/worldView';
import { CHARACTER_IDS, loadoutFor } from '../src/game/characters';
import { GameSim, type GameSimOptions } from '../src/game/GameSim';
import type { SimEvent } from '../src/game/types';
import { createGameLoop } from '../src/physics';
import { PresentationTimeline, type HitStopMode } from '../src/ui/PresentationTimeline';

interface FrameSample {
  readonly t: number;
  readonly live: number;
  readonly shown: number;
  readonly lag: number;
  readonly ballX: number;
  readonly ballY: number;
  readonly play: boolean;
}

interface MatchTrace {
  readonly frames: FrameSample[];
  /** Oyun akarken başlayan donmalar: başlangıç anı (sn) ve süre (ms). */
  readonly freezes: { t: number; ms: number }[];
  readonly playSeconds: number;
}

const MS = 1000;

function playMatch(seed: number, mode: HitStopMode, hz: number): MatchTrace {
  const c1 = CHARACTER_IDS[seed % CHARACTER_IDS.length] ?? 'kor';
  const c2 = CHARACTER_IDS[(seed * 3 + 1) % CHARACTER_IDS.length] ?? 'ayaz';
  const options: GameSimOptions = {
    loadouts: [loadoutFor(c1), loadoutFor(c2)],
    seed: mixSeed(seed, 2),
  };
  const sim = new GameSim(options);
  const timeline = new PresentationTimeline(options);
  timeline.mode = mode;
  timeline.reset(sim);
  const ais = [
    new AiController({ index: 0, difficulty: 'hard', seed: mixSeed(seed, 0) }),
    new AiController({ index: 1, difficulty: 'hard', seed: mixSeed(seed, 1) }),
  ] as const;
  const loop = createGameLoop();
  const frames: FrameSample[] = [];
  const freezes: { t: number; ms: number }[] = [];
  const dt = 1 / hz;
  let t = 0;
  let playSeconds = 0;
  const freeze = (ms: number): void => {
    if (ms <= 0) return;
    const shown = timeline.view.match;
    if (shown.phase === 'playing' || shown.phase === 'goldenGoal') freezes.push({ t, ms });
    timeline.hitStop(ms);
  };
  const present = (events: readonly SimEvent[], skipped: boolean): void => {
    if (skipped) return;
    for (const e of events) {
      if (e.type === 'kick' || e.type === 'header') freeze(hitStopForSpeed(e.speed, BALL.maxSpeed));
      else if (e.type === 'superLaunch') freeze(JUICE.hitStop.superMs);
      else if (e.type === 'goal') {
        freeze(JUICE.hitStop.goalMs);
        timeline.slowMo(JUICE.goalSlowMo.seconds, JUICE.goalSlowMo.scale);
      }
    }
  };
  while (sim.match.phase !== 'matchEnd' && sim.tick < LOOP.stepHz * 300) {
    loop.advance(dt, () => {
      const view = observe(sim);
      const events = sim.step([{ ...ais[0].update(view) }, { ...ais[1].update(view) }]);
      timeline.record(sim, events);
      if (events.some((e) => e.type === 'kickoff')) timeline.jumpToLive();
    });
    timeline.advance(dt, loop.alpha, present);
    t += dt;
    const live = sim.match.phase;
    const shown = timeline.view.match.phase;
    const play =
      (live === 'playing' || live === 'goldenGoal') &&
      (shown === 'playing' || shown === 'goldenGoal');
    if (play) playSeconds += dt;
    frames.push({
      t,
      live: sim.tick,
      shown: timeline.shownTick,
      lag: timeline.lagTicks,
      ballX: timeline.frame.ball.x,
      ballY: timeline.frame.ball.y,
      play,
    });
  }
  return { frames, freezes, playSeconds };
}

function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
}

/** Her adımın girdisinin ekrana çıkma gecikmesi (ms), zaman efektsiz duruma göre. */
function addedLatency(trace: MatchTrace): number[] {
  const firstLive = new Map<number, number>();
  const firstShown = new Map<number, number>();
  const playTick = new Set<number>();
  for (const f of trace.frames) {
    if (!firstLive.has(f.live)) firstLive.set(f.live, f.t);
    if (!firstShown.has(f.shown)) firstShown.set(f.shown, f.t);
    if (f.play) playTick.add(f.live);
  }
  // Atlanan adımlar (bir karede birden çok adım) sonraki gösterilen adımın anını alır.
  const liveTicks = [...firstLive.keys()].sort((a, b) => a - b);
  const shownTicks = [...firstShown.keys()].sort((a, b) => a - b);
  const firstAtOrAfter = (ticks: number[], map: Map<number, number>, k: number): number => {
    let lo = 0;
    let hi = ticks.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((ticks[mid] ?? 0) < k) lo = mid + 1;
      else hi = mid;
    }
    return map.get(ticks[lo] ?? 0) ?? 0;
  };
  const out: number[] = [];
  for (const k of playTick) {
    const base = firstAtOrAfter(liveTicks, firstLive, k);
    const shown = firstAtOrAfter(shownTicks, firstShown, k);
    out.push(Math.max(0, (shown - base) * MS));
  }
  return out;
}

/** Eski yöntem: donma sırasında okunacak girdi donma bitene kadar bekler (adım ızgarasında). */
function oldLatency(trace: MatchTrace): number[] {
  const out: number[] = [];
  const stepMs = MS / LOOP.stepHz;
  const steps = Math.round(trace.playSeconds * LOOP.stepHz);
  let affected = 0;
  for (const f of trace.freezes) {
    for (let w = 0; w < f.ms; w += stepMs) {
      out.push(f.ms - w);
      affected++;
    }
  }
  for (let i = affected; i < steps; i++) out.push(0);
  return out;
}

function ballJumps(trace: MatchTrace): number[] {
  const out: number[] = [];
  for (let i = 1; i < trace.frames.length; i++) {
    const a = trace.frames[i - 1];
    const b = trace.frames[i];
    if (!a || !b || !a.play || !b.play) continue;
    out.push(Math.hypot(b.ballX - a.ballX, b.ballY - a.ballY));
  }
  return out;
}

interface Row {
  readonly label: string;
  readonly perMin: number;
  readonly frozenPct: number;
  readonly latMean: number;
  readonly latP99: number;
  readonly latMax: number;
  readonly affectedPct: number;
  readonly jumpMax: number;
  readonly jumpP999: number;
  readonly lagMax: number;
}

/**
 * @param jumpsFrom Görüntü sıçramasının ölçüldüğü maçlar (eski yöntemde görüntü normal hızda akardı:
 *                  hit-stop'suz maçlarla aynı).
 */
function summarize(label: string, traces: MatchTrace[], old = false, jumpsFrom = traces): Row {
  const play = traces.reduce((s, tr) => s + tr.playSeconds, 0);
  const freezes = traces.flatMap((tr) => tr.freezes);
  const lat = traces
    .flatMap((tr) => (old ? oldLatency(tr) : addedLatency(tr)))
    .sort((a, b) => a - b);
  const jumps = jumpsFrom.flatMap(ballJumps).sort((a, b) => a - b);
  const lags = traces.flatMap((tr) => tr.frames.filter((f) => f.play).map((f) => f.lag));
  const frozenMs = freezes.reduce((s, f) => s + f.ms, 0);
  return {
    label,
    perMin: (freezes.length / play) * 60,
    frozenPct: (frozenMs / MS / play) * 100,
    latMean: lat.reduce((s, v) => s + v, 0) / Math.max(1, lat.length),
    latP99: quantile(lat, 0.99),
    latMax: lat.at(-1) ?? 0,
    affectedPct: (lat.filter((v) => v > 0.5).length / Math.max(1, lat.length)) * 100,
    jumpMax: jumps.at(-1) ?? 0,
    jumpP999: quantile(jumps, 0.999),
    lagMax: old ? 0 : (Math.max(...lags) * MS) / LOOP.stepHz,
  };
}

const args = process.argv.slice(2);
const opt = (name: string, def: number): number => {
  const i = args.indexOf(name);
  return i >= 0 ? Number(args[i + 1]) : def;
};
const matches = opt('--matches', 4);
const hz = opt('--hz', 60);
const seeds = Array.from({ length: matches }, (_, i) => i + 1);
const run = (mode: HitStopMode): MatchTrace[] => seeds.map((s) => playMatch(s, mode, hz));
const rate = run('rate');
const snap = run('snap');
const off = run('off');
const rows = [
  summarize('Eski: simülasyonu durdur', rate, true, off),
  summarize('Hızlı yetişme (2×)', rate),
  summarize('Atlama', snap),
  summarize('Hit-stop yok', off),
];
const f1 = (v: number): string => v.toFixed(1);
console.log(
  `${matches} AI maçı (Zor–Zor, 90 sn), ekran ${hz} Hz; yalnızca oyun akarken (ağır çekim hariç)\n`,
);
console.log(
  '| Biçim | Hit-stop/dk | Donuk süre | Ek gecikme ort. | p99 | en kötü | Etkilenen adım | Top sıçraması en çok | p99,9 | Gecikme en çok |',
);
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of rows) {
  console.log(
    `| ${r.label} | ${f1(r.perMin)} | %${f1(r.frozenPct)} | ${f1(r.latMean)} ms | ${f1(r.latP99)} ms | ` +
      `${f1(r.latMax)} ms | %${f1(r.affectedPct)} | ${f1(r.jumpMax)} px | ${f1(r.jumpP999)} px | ${f1(r.lagMax)} ms |`,
  );
}
const drift = rows[0] ? (rows[0].frozenPct / 100) * 60 : 0;
console.log(
  `\nEski yöntemde maç saati gerçek zamanın dakikada ${f1(drift)} sn gerisine düşüyordu.`,
);
