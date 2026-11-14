/**
 * AI vs AI headless maç simülasyonu: skor dağılımı, kazanma oranları ve sıkışma olayları.
 *
 * Çalıştırma:
 *   npm run simulate                              # 100 maç, Orta vs Orta
 *   npm run simulate -- --p1 hard --p2 easy       # farklı zorluklar
 *   npm run simulate -- --matrix --matches 50     # tüm zorluk eşleşmeleri
 *   npm run simulate -- --seed 7 --json out.json  # tohum ve JSON çıktısı
 *
 * Maçlar gerçek kurallarla oynanır (90 sn, gol kutlaması, santra, altın gol). Her maçın
 * AI tohumları `--seed` ve maç numarasından türetilir: aynı komut → aynı sonuçlar.
 */
import { writeFileSync } from 'node:fs';
import { AI_DIFFICULTIES, LOOP, type AiDifficulty } from '../src/config/gameConfig';
import {
  AI_MODES,
  AiController,
  ESCAPE_KINDS,
  type AiMode,
  type EscapeKind,
} from '../src/game/ai/AiController';
import { mixSeed } from '../src/game/ai/random';
import {
  STUCK_KINDS,
  StuckMonitor,
  type StuckEvent,
  type StuckKind,
} from '../src/game/ai/StuckMonitor';
import { observe } from '../src/game/ai/worldView';
import { GameSim } from '../src/game/GameSim';
import type { PlayerIndex } from '../src/game/types';

interface Options {
  matches: number;
  p1: AiDifficulty;
  p2: AiDifficulty;
  seed: number;
  matrix: boolean;
  /** Altın gol uzatmasının en uzun süresi (sn); aşılırsa maç berabere sayılır. */
  maxOvertime: number;
  json: string | null;
  verbose: boolean;
}

interface MatchResult {
  readonly index: number;
  readonly score: readonly [number, number];
  readonly winner: PlayerIndex | null;
  readonly goldenGoal: boolean;
  readonly overtimeCapped: boolean;
  readonly seconds: number;
  readonly stuck: readonly StuckEvent[];
  readonly escapes: readonly [Record<EscapeKind, number>, Record<EscapeKind, number>];
  readonly modeTicks: readonly [Record<AiMode, number>, Record<AiMode, number>];
  readonly kicks: readonly [number, number];
  readonly supers: readonly [number, number];
  readonly superGoals: readonly [number, number];
  /** Her golün santra düdüğünden itibaren süresi (sn). */
  readonly goalDelays: readonly number[];
}

/** Gol zamanlaması dilimleri (santra düdüğünden itibaren, sn). */
const GOAL_BUCKETS = [2, 4, 8, 16] as const;

interface Summary {
  readonly p1: AiDifficulty;
  readonly p2: AiDifficulty;
  readonly matches: number;
  readonly wins: readonly [number, number];
  readonly draws: number;
  readonly goals: readonly [number, number];
  readonly goldenGoals: number;
  readonly overtimeCapped: number;
  readonly scoreDistribution: readonly (readonly [string, number])[];
  readonly marginDistribution: readonly (readonly [string, number])[];
  readonly stuck: Record<StuckKind, number>;
  readonly stuckEvents: readonly (StuckEvent & { readonly match: number })[];
  readonly escapes: readonly [Record<EscapeKind, number>, Record<EscapeKind, number>];
  readonly modeShare: readonly [Record<AiMode, number>, Record<AiMode, number>];
  readonly kicksPerMatch: readonly [number, number];
  readonly supersPerMatch: readonly [number, number];
  readonly superGoals: readonly [number, number];
  readonly goalTiming: readonly number[];
  readonly avgSeconds: number;
  readonly wallMs: number;
}

const LABEL: Record<AiDifficulty, string> = { easy: 'Kolay', medium: 'Orta', hard: 'Zor' };

function parseArgs(argv: readonly string[]): Options {
  const opts: Options = {
    matches: 100,
    p1: 'medium',
    p2: 'medium',
    seed: 1,
    matrix: false,
    maxOvertime: 120,
    json: null,
    verbose: false,
  };
  const difficulty = (v: string | undefined): AiDifficulty => {
    if (v === 'easy' || v === 'medium' || v === 'hard') return v;
    throw new Error(`Geçersiz zorluk: ${String(v)} (easy | medium | hard)`);
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = (): string => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${String(arg)} bir değer bekliyor`);
      return v;
    };
    switch (arg) {
      case '--matches':
        opts.matches = Math.max(1, Number.parseInt(next(), 10));
        break;
      case '--p1':
        opts.p1 = difficulty(next());
        break;
      case '--p2':
        opts.p2 = difficulty(next());
        break;
      case '--seed':
        opts.seed = Number.parseInt(next(), 10);
        break;
      case '--matrix':
        opts.matrix = true;
        break;
      case '--max-overtime':
        opts.maxOvertime = Number(next());
        break;
      case '--json':
        opts.json = next();
        break;
      case '--verbose':
        opts.verbose = true;
        break;
      default:
        throw new Error(`Bilinmeyen argüman: ${String(arg)}`);
    }
  }
  return opts;
}

function playMatch(
  p1: AiDifficulty,
  p2: AiDifficulty,
  seed: number,
  index: number,
  maxOvertime: number,
): MatchResult {
  const sim = new GameSim();
  const ais = [
    new AiController({ index: 0, difficulty: p1, seed: mixSeed(seed, index * 2) }),
    new AiController({ index: 1, difficulty: p2, seed: mixSeed(seed, index * 2 + 1) }),
  ] as const;
  const monitor = new StuckMonitor();
  const superGoals: [number, number] = [0, 0];
  let lastSuperBy: PlayerIndex | -1 = -1;
  let playStartTick = 0;
  const goalDelays: number[] = [];
  let overtimeTicks = 0;
  const maxOvertimeTicks = maxOvertime * LOOP.stepHz;
  let capped = false;

  while (sim.match.phase !== 'matchEnd') {
    const view = observe(sim);
    const inputs = [ais[0].update(view), ais[1].update(view)] as const;
    const events = sim.step(inputs);
    monitor.update(sim, inputs);
    for (const e of events) {
      if (e.type === 'kick' || e.type === 'header') lastSuperBy = e.super ? e.player : -1;
      if (e.type === 'playStart') playStartTick = sim.tick;
      if (e.type === 'goal') {
        if (lastSuperBy === e.scorer) superGoals[e.scorer]++;
        goalDelays.push((sim.tick - playStartTick) / LOOP.stepHz);
      }
    }
    if (sim.match.overtime && ++overtimeTicks > maxOvertimeTicks) {
      capped = true;
      break;
    }
  }
  const m = sim.match;
  return {
    index,
    score: [m.score[0], m.score[1]],
    winner: capped ? null : m.winner,
    goldenGoal: m.endReason === 'goldenGoal',
    overtimeCapped: capped,
    seconds: sim.tick / LOOP.stepHz,
    stuck: monitor.events,
    escapes: [{ ...ais[0].stats.escapes }, { ...ais[1].stats.escapes }],
    modeTicks: [{ ...ais[0].stats.modeTicks }, { ...ais[1].stats.modeTicks }],
    kicks: [ais[0].stats.kicksPressed, ais[1].stats.kicksPressed],
    supers: [ais[0].stats.supersArmed, ais[1].stats.supersArmed],
    superGoals,
    goalDelays,
  };
}

function emptyRecord<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

function sortedDistribution(map: Map<string, number>): [string, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function runSeries(p1: AiDifficulty, p2: AiDifficulty, opts: Options): Summary {
  const start = performance.now();
  const results: MatchResult[] = [];
  for (let i = 0; i < opts.matches; i++) {
    const r = playMatch(p1, p2, opts.seed, i, opts.maxOvertime);
    results.push(r);
    if (opts.verbose) {
      const stuck = r.stuck.length ? `  sıkışma: ${r.stuck.map((e) => e.kind).join(', ')}` : '';
      console.log(
        `  #${String(i + 1).padStart(3)}  ${r.score[0]}–${r.score[1]}${r.goldenGoal ? ' (altın gol)' : ''}${stuck}`,
      );
    }
  }
  const wins: [number, number] = [0, 0];
  const goals: [number, number] = [0, 0];
  const scores = new Map<string, number>();
  const margins = new Map<string, number>();
  const stuck = emptyRecord(STUCK_KINDS);
  const escapes = [emptyRecord(ESCAPE_KINDS), emptyRecord(ESCAPE_KINDS)] as const;
  const modes = [emptyRecord(AI_MODES), emptyRecord(AI_MODES)] as const;
  const kicks: [number, number] = [0, 0];
  const supers: [number, number] = [0, 0];
  const superGoals: [number, number] = [0, 0];
  const stuckEvents: (StuckEvent & { match: number })[] = [];
  let draws = 0;
  let golden = 0;
  let capped = 0;
  let seconds = 0;
  const timing = new Array<number>(GOAL_BUCKETS.length + 1).fill(0);
  for (const r of results) {
    for (const d of r.goalDelays) {
      const b = GOAL_BUCKETS.findIndex((limit) => d < limit);
      timing[b < 0 ? GOAL_BUCKETS.length : b] = (timing[b < 0 ? GOAL_BUCKETS.length : b] ?? 0) + 1;
    }
    if (r.winner === null) draws++;
    else wins[r.winner]++;
    goals[0] += r.score[0];
    goals[1] += r.score[1];
    if (r.goldenGoal) golden++;
    if (r.overtimeCapped) capped++;
    seconds += r.seconds;
    const key = `${r.score[0]}–${r.score[1]}`;
    scores.set(key, (scores.get(key) ?? 0) + 1);
    const diff = r.score[0] - r.score[1];
    const mk = diff > 0 ? `P1 +${diff}` : diff < 0 ? `P2 +${-diff}` : 'eşit';
    margins.set(mk, (margins.get(mk) ?? 0) + 1);
    for (const e of r.stuck) {
      stuck[e.kind]++;
      stuckEvents.push({ ...e, match: r.index + 1 });
    }
    for (const i of [0, 1] as const) {
      for (const k of ESCAPE_KINDS) escapes[i][k] += r.escapes[i][k];
      for (const k of AI_MODES) modes[i][k] += r.modeTicks[i][k];
      kicks[i] += r.kicks[i];
      supers[i] += r.supers[i];
      superGoals[i] += r.superGoals[i];
    }
  }
  const share = (rec: Record<AiMode, number>): Record<AiMode, number> => {
    const total = AI_MODES.reduce((s, k) => s + rec[k], 0) || 1;
    return Object.fromEntries(AI_MODES.map((k) => [k, rec[k] / total])) as Record<AiMode, number>;
  };
  const n = results.length;
  return {
    p1,
    p2,
    matches: n,
    wins,
    draws,
    goals,
    goldenGoals: golden,
    overtimeCapped: capped,
    scoreDistribution: sortedDistribution(scores),
    marginDistribution: sortedDistribution(margins),
    stuck,
    stuckEvents,
    escapes,
    modeShare: [share(modes[0]), share(modes[1])],
    kicksPerMatch: [kicks[0] / n, kicks[1] / n],
    supersPerMatch: [supers[0] / n, supers[1] / n],
    superGoals,
    goalTiming: timing,
    avgSeconds: seconds / n,
    wallMs: performance.now() - start,
  };
}

const pct = (x: number, n: number): string => `${((100 * x) / n).toFixed(0)}%`;
const fx = (x: number, d = 2): string => x.toFixed(d);

function printSummary(s: Summary): void {
  const n = s.matches;
  const title = `${LABEL[s.p1]} (P1) vs ${LABEL[s.p2]} (P2)`;
  console.log(`\n## ${title} — ${n} maç`);
  console.log(
    `\nKazanma: P1 ${s.wins[0]} (${pct(s.wins[0], n)}) · P2 ${s.wins[1]} (${pct(s.wins[1], n)}) · berabere ${s.draws}` +
      ` · altın gol ${s.goldenGoals}${s.overtimeCapped ? ` · uzatma sınırı ${s.overtimeCapped}` : ''}`,
  );
  console.log(
    `Gol ortalaması: P1 ${fx(s.goals[0] / n)} · P2 ${fx(s.goals[1] / n)} · maç başı ${fx((s.goals[0] + s.goals[1]) / n)}` +
      ` · ortalama maç ${fx(s.avgSeconds, 1)} sn (simülasyon)`,
  );
  console.log(
    `Şut/maç: P1 ${fx(s.kicksPerMatch[0], 1)} · P2 ${fx(s.kicksPerMatch[1], 1)} · ` +
      `süper/maç: P1 ${fx(s.supersPerMatch[0])} · P2 ${fx(s.supersPerMatch[1])} · ` +
      `süperle gol: P1 ${s.superGoals[0]} · P2 ${s.superGoals[1]}`,
  );
  const totalGoals = s.goals[0] + s.goals[1];
  const last = GOAL_BUCKETS[GOAL_BUCKETS.length - 1] ?? 0;
  const labels = [...GOAL_BUCKETS.map((b) => `<${b} sn`), `≥${last} sn`];
  console.log(
    `Santradan gole süre: ${labels.map((l, i) => `${l} ${pct(s.goalTiming[i] ?? 0, totalGoals || 1)}`).join(' · ')}`,
  );
  console.log('\n| Skor | Maç |\n| ---- | --- |');
  for (const [score, count] of s.scoreDistribution) console.log(`| ${score} | ${count} |`);
  console.log('\n| Fark | Maç |\n| ---- | --- |');
  for (const [m, count] of s.marginDistribution) console.log(`| ${m} | ${count} |`);

  const stuckTotal = STUCK_KINDS.reduce((sum, k) => sum + s.stuck[k], 0);
  console.log(`\nSıkışma olayları (bağımsız gözlemci): ${stuckTotal}`);
  for (const k of STUCK_KINDS) if (s.stuck[k]) console.log(`  ${k}: ${s.stuck[k]}`);
  for (const e of s.stuckEvents.slice(0, 10)) {
    const who = e.player === null ? '' : ` P${e.player + 1}`;
    console.log(
      `  · maç ${e.match}, ${fx(e.tick / LOOP.stepHz, 1)} sn: ${e.kind}${who} @ (${e.x.toFixed(0)}, ${e.y.toFixed(0)})`,
    );
  }
  const esc = (r: Record<EscapeKind, number>): string =>
    ESCAPE_KINDS.map((k) => `${k} ${r[k]}`).join(', ');
  console.log(`AI kaçış davranışı: P1 [${esc(s.escapes[0])}] · P2 [${esc(s.escapes[1])}]`);
  const modes = (r: Record<AiMode, number>): string =>
    AI_MODES.filter((k) => k !== 'idle')
      .map((k) => `${k} ${pct(r[k], 1)}`)
      .join(', ');
  console.log(`Mod payları: P1 [${modes(s.modeShare[0])}]`);
  console.log(`             P2 [${modes(s.modeShare[1])}]`);
  console.log(`Süre: ${fx(s.wallMs / 1000, 1)} sn (${fx(s.wallMs / n, 0)} ms/maç)`);
}

function main(): void {
  const opts = parseArgs(process.argv.slice(2));
  const pairs: [AiDifficulty, AiDifficulty][] = opts.matrix
    ? AI_DIFFICULTIES.flatMap((a) =>
        AI_DIFFICULTIES.map((b): [AiDifficulty, AiDifficulty] => [a, b]),
      )
    : [[opts.p1, opts.p2]];
  console.log(`# AI vs AI simülasyonu — tohum ${opts.seed}`);
  const summaries: Summary[] = [];
  for (const [a, b] of pairs) {
    const s = runSeries(a, b, opts);
    summaries.push(s);
    printSummary(s);
  }
  if (opts.matrix) {
    console.log('\n## Özet matrisi (P1 kazanma % / P2 kazanma % · maç başı gol)');
    console.log(`\n| P1 \\ P2 | ${AI_DIFFICULTIES.map((d) => LABEL[d]).join(' | ')} |`);
    console.log(`| --- | ${AI_DIFFICULTIES.map(() => '---').join(' | ')} |`);
    for (const a of AI_DIFFICULTIES) {
      const cells = AI_DIFFICULTIES.map((b) => {
        const s = summaries.find((x) => x.p1 === a && x.p2 === b);
        if (!s) return '';
        return `${pct(s.wins[0], s.matches)} / ${pct(s.wins[1], s.matches)} · ${fx((s.goals[0] + s.goals[1]) / s.matches, 1)}`;
      });
      console.log(`| ${LABEL[a]} | ${cells.join(' | ')} |`);
    }
    const totalStuck = summaries.reduce(
      (sum, s) => sum + STUCK_KINDS.reduce((x, k) => x + s.stuck[k], 0),
      0,
    );
    console.log(
      `\nToplam sıkışma olayı: ${totalStuck} (${summaries.reduce((x, s) => x + s.matches, 0)} maç)`,
    );
  }
  if (opts.json) {
    writeFileSync(opts.json, JSON.stringify(summaries, null, 2));
    console.log(`\nJSON: ${opts.json}`);
  }
}

main();
