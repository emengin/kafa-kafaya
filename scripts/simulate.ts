/**
 * AI vs AI headless maç simülasyonu: skor dağılımı, kazanma oranları, süper/güçlendirici
 * istatistikleri, sıkışma olayları ve karakter dengesi.
 *
 * Çalıştırma:
 *   npm run simulate                                  # 100 maç, Orta vs Orta (nötr oyuncular)
 *   npm run simulate -- --p1 hard --p2 easy           # farklı zorluklar
 *   npm run simulate -- --matrix --matches 50         # tüm zorluk eşleşmeleri
 *   npm run simulate -- --c1 kor --c2 kaya            # belirli karakterler
 *   npm run simulate -- --characters --matches 40     # 45 karakter eşleşmesi × 2 taraf
 *   npm run simulate -- --characters --jobs 10        # paralel (alt süreçler)
 *   npm run simulate -- --seed 7 --json out.json      # tohum ve JSON çıktısı
 *
 * Maçlar gerçek kurallarla oynanır (90 sn, gol kutlaması, santra, altın gol, güçlendiriciler).
 * Her maçın AI ve simülasyon tohumları `--seed` ve maç numarasından türetilir: aynı komut → aynı
 * sonuçlar (paralel koşuda da).
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  AI_DIFFICULTIES,
  LOOP,
  type AiDifficulty,
  type PowerUpType,
  type SuperType,
} from '../src/config/gameConfig';
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
import {
  CHARACTER_IDS,
  getCharacter,
  isCharacterId,
  loadoutFor,
  NEUTRAL_LOADOUT,
  type CharacterId,
  type Loadout,
} from '../src/game/characters';
import { POWER_UP_TYPES } from '../src/game/entities/Player';
import { GameSim } from '../src/game/GameSim';
import { SUPER_TYPES } from '../src/game/superEffects';
import type { PlayerIndex } from '../src/game/types';

interface Options {
  matches: number;
  p1: AiDifficulty;
  p2: AiDifficulty;
  /** Karakterler (null = nötr oyuncu). */
  c1: CharacterId | null;
  c2: CharacterId | null;
  seed: number;
  matrix: boolean;
  /** Tüm karakter eşleşmeleri (her biri iki tarafta `matches` maç). */
  characters: boolean;
  /** Karakter modunda iki tarafın zorluğu. */
  difficulty: AiDifficulty;
  /** Paralel alt süreç sayısı (karakter modunda). */
  jobs: number;
  /** İç kullanım: bu süreç görevlerin yalnızca `index`/`count` dilimini koşar, JSON basar. */
  shard: { index: number; count: number } | null;
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
  /** Süper tipine göre atış ve gol sayısı (iki oyuncunun toplamı). */
  readonly superLaunches: Record<SuperType, number>;
  readonly superTypeGoals: Record<SuperType, number>;
  /** Kazanılan güçlendiriciler (oyuncu başına) ve tipe göre toplam. */
  readonly powerUps: readonly [number, number];
  readonly powerUpTypes: Record<PowerUpType, number>;
  /** Süperin rakibe etki ettiği an (donma, savrulma, zıplama kilidi). */
  readonly superHits: number;
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
  readonly superLaunches: Record<SuperType, number>;
  readonly superTypeGoals: Record<SuperType, number>;
  readonly powerUps: readonly [number, number];
  readonly powerUpTypes: Record<PowerUpType, number>;
  readonly superHits: number;
  readonly avgSeconds: number;
  readonly wallMs: number;
}

const LABEL: Record<AiDifficulty, string> = { easy: 'Kolay', medium: 'Orta', hard: 'Zor' };

function parseArgs(argv: readonly string[]): Options {
  const opts: Options = {
    matches: 100,
    p1: 'medium',
    p2: 'medium',
    c1: null,
    c2: null,
    seed: 1,
    matrix: false,
    characters: false,
    difficulty: 'medium',
    jobs: 1,
    shard: null,
    maxOvertime: 120,
    json: null,
    verbose: false,
  };
  const difficulty = (v: string | undefined): AiDifficulty => {
    if (v === 'easy' || v === 'medium' || v === 'hard') return v;
    throw new Error(`Geçersiz zorluk: ${String(v)} (easy | medium | hard)`);
  };
  const character = (v: string | undefined): CharacterId => {
    if (isCharacterId(v)) return v;
    throw new Error(`Geçersiz karakter: ${String(v)} (${CHARACTER_IDS.join(' | ')})`);
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
      case '--c1':
        opts.c1 = character(next());
        break;
      case '--c2':
        opts.c2 = character(next());
        break;
      case '--characters':
        opts.characters = true;
        break;
      case '--difficulty':
        opts.difficulty = difficulty(next());
        break;
      case '--jobs':
        opts.jobs = Math.max(1, Number.parseInt(next(), 10));
        break;
      case '--shard': {
        const [a, b] = next()
          .split('/')
          .map((x) => Number.parseInt(x, 10));
        if (a === undefined || b === undefined || !(a >= 0 && b > a)) {
          throw new Error('--shard i/n bekleniyor');
        }
        opts.shard = { index: a, count: b };
        break;
      }
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
  loadouts: readonly [Loadout, Loadout] = [NEUTRAL_LOADOUT, NEUTRAL_LOADOUT],
): MatchResult {
  const sim = new GameSim({ loadouts, seed: mixSeed(seed ^ SIM_SEED_SALT, index) });
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
  const superLaunches = emptyRecord(SUPER_TYPES);
  const superTypeGoals = emptyRecord(SUPER_TYPES);
  const powerUps: [number, number] = [0, 0];
  const powerUpTypes = emptyRecord(POWER_UP_TYPES);
  let superHits = 0;
  let lastSuperType: SuperType | null = null;

  while (sim.match.phase !== 'matchEnd') {
    const view = observe(sim);
    const inputs = [ais[0].update(view), ais[1].update(view)] as const;
    const events = sim.step(inputs);
    monitor.update(sim, inputs);
    for (const e of events) {
      if (e.type === 'kick' || e.type === 'header') lastSuperBy = e.super ? e.player : -1;
      if (e.type === 'superLaunch') {
        superLaunches[e.superType]++;
        lastSuperType = e.superType;
      }
      if (e.type === 'superHit') superHits++;
      if (e.type === 'balloonPop') {
        powerUps[e.player]++;
        powerUpTypes[e.powerUp]++;
      }
      if (e.type === 'playStart') playStartTick = sim.tick;
      if (e.type === 'goal') {
        if (lastSuperBy === e.scorer) {
          superGoals[e.scorer]++;
          if (lastSuperType) superTypeGoals[lastSuperType]++;
        }
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
    superLaunches,
    superTypeGoals,
    powerUps,
    powerUpTypes,
    superHits,
  };
}

/** Simülasyon (balon/Serap) tohumunu AI tohumlarından ayırmak için karıştırma sabiti. */
const SIM_SEED_SALT = 0x5eed;

function emptyRecord<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

function sortedDistribution(map: Map<string, number>): [string, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function runSeries(
  p1: AiDifficulty,
  p2: AiDifficulty,
  opts: Options,
  loadouts: readonly [Loadout, Loadout] = [NEUTRAL_LOADOUT, NEUTRAL_LOADOUT],
  seedOffset = 0,
): Summary {
  const start = performance.now();
  const results: MatchResult[] = [];
  for (let i = 0; i < opts.matches; i++) {
    const r = playMatch(p1, p2, opts.seed + seedOffset, i, opts.maxOvertime, loadouts);
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
  const superLaunches = emptyRecord(SUPER_TYPES);
  const superTypeGoals = emptyRecord(SUPER_TYPES);
  const powerUps: [number, number] = [0, 0];
  const powerUpTypes = emptyRecord(POWER_UP_TYPES);
  let superHits = 0;
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
    for (const t of SUPER_TYPES) {
      superLaunches[t] += r.superLaunches[t];
      superTypeGoals[t] += r.superTypeGoals[t];
    }
    for (const t of POWER_UP_TYPES) powerUpTypes[t] += r.powerUpTypes[t];
    superHits += r.superHits;
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
      powerUps[i] += r.powerUps[i];
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
    superLaunches,
    superTypeGoals,
    powerUps,
    powerUpTypes,
    superHits,
    avgSeconds: seconds / n,
    wallMs: performance.now() - start,
  };
}

const pct = (x: number, n: number): string => `${((100 * x) / n).toFixed(0)}%`;
const fx = (x: number, d = 2): string => x.toFixed(d);

function printSummary(s: Summary, names: readonly [string, string] | null = null): void {
  const n = s.matches;
  const who = (i: 0 | 1): string => LABEL[i === 0 ? s.p1 : s.p2] + (names ? ` · ${names[i]}` : '');
  const title = `${who(0)} (P1) vs ${who(1)} (P2)`;
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
  const launched = SUPER_TYPES.filter((t) => s.superLaunches[t] > 0);
  if (launched.length) {
    console.log(
      `Süper tipleri (atış/gol): ${launched.map((t) => `${t} ${s.superLaunches[t]}/${s.superTypeGoals[t]}`).join(' · ')}` +
        ` · rakibe etki ${s.superHits}`,
    );
  }
  console.log(
    `Güçlendirici/maç: P1 ${fx(s.powerUps[0] / n)} · P2 ${fx(s.powerUps[1] / n)} · ` +
      POWER_UP_TYPES.map((t) => `${t} ${s.powerUpTypes[t]}`).join(' · '),
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

// ───────────────────────────── Karakter dengesi ─────────────────────────────

/** Bir karakter görevinin sonucu: `a` P1, `b` P2 olarak `matches` maç. */
interface CharTask {
  readonly a: CharacterId;
  readonly b: CharacterId;
}

interface CharResult extends CharTask {
  readonly matches: number;
  readonly wins: readonly [number, number];
  readonly draws: number;
  readonly goals: readonly [number, number];
  readonly superGoals: readonly [number, number];
  readonly supers: readonly [number, number];
  readonly powerUps: readonly [number, number];
  readonly stuck: number;
  readonly superLaunches: Record<SuperType, number>;
  readonly superTypeGoals: Record<SuperType, number>;
  readonly superHits: number;
  readonly seconds: number;
}

/** Her karakter çifti iki tarafta da (A P1 / B P2 ve B P1 / A P2). */
function characterTasks(): CharTask[] {
  const tasks: CharTask[] = [];
  CHARACTER_IDS.forEach((a, i) => {
    CHARACTER_IDS.forEach((b, j) => {
      if (i !== j) tasks.push({ a, b });
    });
  });
  return tasks;
}

function runCharTask(task: CharTask, opts: Options, taskIndex: number): CharResult {
  const d = opts.difficulty;
  const s = runSeries(d, d, opts, [loadoutFor(task.a), loadoutFor(task.b)], taskIndex * 7919);
  const stuck = STUCK_KINDS.reduce((sum, k) => sum + s.stuck[k], 0);
  return {
    ...task,
    matches: s.matches,
    wins: s.wins,
    draws: s.draws,
    goals: s.goals,
    superGoals: s.superGoals,
    supers: [s.supersPerMatch[0] * s.matches, s.supersPerMatch[1] * s.matches],
    powerUps: s.powerUps,
    stuck,
    superLaunches: s.superLaunches,
    superTypeGoals: s.superTypeGoals,
    superHits: s.superHits,
    seconds: s.avgSeconds * s.matches,
  };
}

/** Görevleri `jobs` alt sürece böler; her biri sonuçlarını JSON olarak basar. */
async function runCharactersParallel(
  opts: Options,
  tasks: readonly CharTask[],
): Promise<CharResult[]> {
  const runner = path.join(path.dirname(process.argv[1] ?? ''), 'run-ts.js');
  const script = process.argv[1] ?? '';
  const base = [
    '--characters',
    '--matches',
    String(opts.matches),
    '--seed',
    String(opts.seed),
    '--difficulty',
    opts.difficulty,
    '--max-overtime',
    String(opts.maxOvertime),
  ];
  const jobs = Math.min(opts.jobs, tasks.length);
  const runs = Array.from({ length: jobs }, (_, i) => {
    return new Promise<CharResult[]>((resolve, reject) => {
      const child = spawn(process.execPath, [runner, script, ...base, '--shard', `${i}/${jobs}`], {
        stdio: ['ignore', 'pipe', 'inherit'],
      });
      let out = '';
      child.stdout.on('data', (chunk: Buffer) => {
        out += chunk.toString();
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`alt süreç ${i} hata kodu ${String(code)}`));
          return;
        }
        resolve(JSON.parse(out) as CharResult[]);
      });
    });
  });
  return (await Promise.all(runs)).flat();
}

interface CharStanding {
  readonly id: CharacterId;
  matches: number;
  wins: number;
  goalsFor: number;
  goalsAgainst: number;
  superGoals: number;
  supers: number;
  powerUps: number;
}

function printCharacterReport(results: readonly CharResult[], opts: Options, wallMs: number): void {
  const standing = new Map<CharacterId, CharStanding>(
    CHARACTER_IDS.map((id) => [
      id,
      {
        id,
        matches: 0,
        wins: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        superGoals: 0,
        supers: 0,
        powerUps: 0,
      },
    ]),
  );
  /** Eşleşme bazında: [A'nın galibiyeti, maç] (iki taraf birlikte). */
  const pair = new Map<string, [number, number]>();
  const key = (a: CharacterId, b: CharacterId): string => `${a}>${b}`;
  let stuck = 0;
  let total = 0;
  const launches = emptyRecord(SUPER_TYPES);
  const typeGoals = emptyRecord(SUPER_TYPES);
  for (const r of results) {
    total += r.matches;
    stuck += r.stuck;
    for (const t of SUPER_TYPES) {
      launches[t] += r.superLaunches[t];
      typeGoals[t] += r.superTypeGoals[t];
    }
    const sides = [
      [r.a, r.b, 0, 1],
      [r.b, r.a, 1, 0],
    ] as const;
    for (const [me, them, i, j] of sides) {
      const st = standing.get(me);
      if (!st) continue;
      st.matches += r.matches;
      st.wins += r.wins[i];
      st.goalsFor += r.goals[i];
      st.goalsAgainst += r.goals[j];
      st.superGoals += r.superGoals[i];
      st.supers += r.supers[i];
      st.powerUps += r.powerUps[i];
      const k = key(me, them);
      const cell = pair.get(k) ?? [0, 0];
      cell[0] += r.wins[i];
      cell[1] += r.matches;
      pair.set(k, cell);
    }
  }
  const rows = [...standing.values()].sort((x, y) => y.wins / y.matches - x.wins / x.matches);
  console.log(
    `\n# Karakter dengesi — ${LABEL[opts.difficulty]} vs ${LABEL[opts.difficulty]}, ` +
      `eşleşme başına ${opts.matches * 2} maç (iki tarafta ${opts.matches}), toplam ${total} maç, tohum ${opts.seed}`,
  );
  console.log(
    '\n| Karakter | Süper | Hız/Zıp/Şut/Kafa | Kazanma | Gol (at–ye) / maç | Süper / maç | Süperle gol % | Güçlendirici / maç |',
  );
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of rows) {
    const c = getCharacter(r.id);
    const st = c.stats;
    console.log(
      `| ${c.name} | ${c.superType} | ${st.speed}/${st.jump}/${st.kick}/${st.head} | ` +
        `${pct(r.wins, r.matches)} | ${fx(r.goalsFor / r.matches)}–${fx(r.goalsAgainst / r.matches)} | ` +
        `${fx(r.supers / r.matches)} | ${pct(r.superGoals, r.goalsFor || 1)} | ${fx(r.powerUps / r.matches)} |`,
    );
  }
  const names = CHARACTER_IDS.map((id) => getCharacter(id).name);
  console.log('\n## Eşleşme matrisi (satırdaki karakterin kazanma %, iki taraf birlikte)\n');
  console.log(`| | ${names.join(' | ')} |`);
  console.log(`| --- | ${names.map(() => '---').join(' | ')} |`);
  let worst = { a: '', b: '', rate: 0 };
  for (const a of CHARACTER_IDS) {
    const cells = CHARACTER_IDS.map((b) => {
      if (a === b) return '—';
      const cell = pair.get(key(a, b));
      if (!cell) return '';
      const rate = cell[0] / cell[1];
      if (rate > worst.rate) worst = { a: getCharacter(a).name, b: getCharacter(b).name, rate };
      return (rate * 100).toFixed(0);
    });
    console.log(`| **${getCharacter(a).name}** | ${cells.join(' | ')} |`);
  }
  const best = rows[0];
  const last = rows[rows.length - 1];
  if (best && last) {
    console.log(
      `\nEn yüksek genel kazanma: ${getCharacter(best.id).name} ${pct(best.wins, best.matches)} · ` +
        `en düşük: ${getCharacter(last.id).name} ${pct(last.wins, last.matches)} · ` +
        `en dengesiz eşleşme: ${worst.a}–${worst.b} %${(worst.rate * 100).toFixed(0)}`,
    );
  }
  console.log(
    `Süper tipleri (atış / gol): ${SUPER_TYPES.map((t) => `${t} ${launches[t]}/${typeGoals[t]}`).join(' · ')}`,
  );
  console.log(`Sıkışma olayı: ${stuck} · süre ${fx(wallMs / 1000, 1)} sn`);
}

async function runCharacters(opts: Options): Promise<void> {
  const tasks = characterTasks();
  if (opts.shard) {
    const mine = tasks
      .map((t, i) => [t, i] as const)
      .filter(([, i]) => i % (opts.shard?.count ?? 1) === opts.shard?.index);
    const results = mine.map(([t, i]) => runCharTask(t, opts, i));
    process.stdout.write(JSON.stringify(results));
    return;
  }
  const start = performance.now();
  const results =
    opts.jobs > 1
      ? await runCharactersParallel(opts, tasks)
      : tasks.map((t, i) => runCharTask(t, opts, i));
  printCharacterReport(results, opts, performance.now() - start);
  if (opts.json) {
    writeFileSync(opts.json, JSON.stringify(results, null, 2));
    console.log(`\nJSON: ${opts.json}`);
  }
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.characters) {
    await runCharacters(opts);
    return;
  }
  const loadouts: readonly [Loadout, Loadout] = [
    opts.c1 ? loadoutFor(opts.c1) : NEUTRAL_LOADOUT,
    opts.c2 ? loadoutFor(opts.c2) : NEUTRAL_LOADOUT,
  ];
  const names: readonly [string, string] | null =
    opts.c1 || opts.c2
      ? [
          opts.c1 ? getCharacter(opts.c1).name : 'nötr',
          opts.c2 ? getCharacter(opts.c2).name : 'nötr',
        ]
      : null;
  const pairs: [AiDifficulty, AiDifficulty][] = opts.matrix
    ? AI_DIFFICULTIES.flatMap((a) =>
        AI_DIFFICULTIES.map((b): [AiDifficulty, AiDifficulty] => [a, b]),
      )
    : [[opts.p1, opts.p2]];
  console.log(`# AI vs AI simülasyonu — tohum ${opts.seed}`);
  const summaries: Summary[] = [];
  for (const [a, b] of pairs) {
    const s = runSeries(a, b, opts, loadouts);
    summaries.push(s);
    printSummary(s, names);
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

await main();
