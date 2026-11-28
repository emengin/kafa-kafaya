/**
 * Çapraz motor tekrar kayıtları (Faz 2.7, madde 7): `src/game/crossEngine/fixtures/*.json`.
 *
 * Çalıştırma:
 *   npm run replays                 # kayıtları denetle (Node): zincir ve kapsam
 *   npm run replays -- --record     # kayıtları yapay zekâ maçlarından yeniden üret
 *   npm run replays -- --update     # girdileri koru, zinciri yeniden hesapla
 *
 * Ne zaman: simülasyonu bilerek değiştiren her işten sonra (fizik/denge ayarı, Faz 2.9) beklenen
 * zincir değişir ve testler kırılır. Önce `--update` (aynı girdilerle yeni zincir); kapsam bozulursa
 * (ör. bir süper artık fırlatılmıyor) `--record`. Değişiklik bilinçli değilse kırılan test bir
 * determinizm hatasını gösteriyordur: kaydı güncellemeden önce nedeni bul.
 *
 * Kayıt: her karakter çifti (5 maç, 10 karakter) Zor–Zor yapay zekâ ile oynanır; maç her iki
 * oyuncu da süperini fırlatmış ve en az bir gol + gol sonrası duraklama tamamlanmışsa kabul edilir
 * (tutmazsa sonraki tohum). Girdiler adım adım saklanır; yapay zekâ oynatırken çalışmaz.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { format } from 'prettier';
import { LOOP } from '../src/config/gameConfig';
import { AiController } from '../src/game/ai/AiController';
import { mixSeed } from '../src/game/ai/random';
import { observe } from '../src/game/ai/worldView';
import { getCharacter, type CharacterId } from '../src/game/characters';
import {
  CHAIN_START,
  chainStep,
  encodeInputs,
  encodePair,
  firstChainMismatch,
  FIXTURE_FORMAT,
  fixtureOptions,
  missingCoverage,
  runFixture,
  type ReplayFixture,
} from '../src/game/crossEngine/fixture';
import { GameSim } from '../src/game/GameSim';

const DIR = path.resolve('src/game/crossEngine/fixtures');
const PAIRS: readonly (readonly [CharacterId, CharacterId])[] = [
  ['kor', 'ayaz'],
  ['simsek', 'sis'],
  ['kaya', 'bora'],
  ['yay', 'demir'],
  ['pamuk', 'toprak'],
];
/** Kısa maç: kayıt küçük kalsın, ama süperler dolsun. */
const DURATION_SECONDS = 50;
const CHECKPOINT_EVERY = LOOP.stepHz;
/** Altın gol uzarsa maç bu adımda kesilir (kayıt sınırlı kalsın). */
const MAX_TICKS = 90 * LOOP.stepHz;
const MAX_SEED_TRIES = 200;

function record(): void {
  PAIRS.forEach(([c1, c2], i) => {
    for (let seed = 1; seed <= MAX_SEED_TRIES; seed++) {
      const fixture = playAndRecord(`${String(i + 1).padStart(2, '0')}-${c1}-${c2}`, c1, c2, seed);
      const cov = runFixture(fixture).coverage;
      const s1 = getCharacter(c1).superType;
      const s2 = getCharacter(c2).superType;
      if ((cov.supers[s1] ?? 0) > 0 && (cov.supers[s2] ?? 0) > 0 && cov.pauses > 0) {
        void write(fixture).then(() => {
          console.log(
            `${fixture.name}: tohum ${seed}, ${fixture.ticks} adım, ${cov.goals} gol, ` +
              `süperler ${JSON.stringify(cov.supers)}, balon ${cov.balloons}`,
          );
        });
        return;
      }
    }
    throw new Error(`${c1}–${c2}: ${MAX_SEED_TRIES} tohumda kapsam sağlanmadı`);
  });
}

function playAndRecord(
  name: string,
  c1: CharacterId,
  c2: CharacterId,
  seed: number,
): ReplayFixture {
  const base = {
    characters: [c1, c2] as const,
    seed: mixSeed(seed, 2),
    durationSeconds: DURATION_SECONDS,
    goldenGoalOvertime: true,
  };
  const sim = new GameSim(fixtureOptions(base));
  const ais = [
    new AiController({ index: 0, difficulty: 'hard', seed: mixSeed(seed, 0) }),
    new AiController({ index: 1, difficulty: 'hard', seed: mixSeed(seed, 1) }),
  ] as const;
  const pairs: number[] = [];
  let link = CHAIN_START;
  const chain: string[] = [];
  while (sim.match.phase !== 'matchEnd' && sim.tick < MAX_TICKS) {
    const view = observe(sim);
    const a = { ...ais[0].update(view) };
    const b = { ...ais[1].update(view) };
    pairs.push(encodePair(a, b));
    sim.step([a, b]);
    link = chainStep(link, sim.checksum());
    if (sim.tick % CHECKPOINT_EVERY === 0) chain.push(link);
  }
  // Maç sonundan sonra bir süre daha (maç sonu evresi de kayda girsin).
  for (let k = 0; k < LOOP.stepHz; k++) {
    pairs.push(0);
    sim.step([NONE, NONE]);
    link = chainStep(link, sim.checksum());
    if (sim.tick % CHECKPOINT_EVERY === 0) chain.push(link);
  }
  if (sim.tick % CHECKPOINT_EVERY !== 0) chain.push(link);
  return {
    format: FIXTURE_FORMAT,
    name,
    ...base,
    ticks: pairs.length,
    inputs: encodeInputs(pairs),
    checkpointEvery: CHECKPOINT_EVERY,
    chain,
  };
}
const NONE = { left: false, right: false, jump: false, kick: false, super: false };

async function write(f: ReplayFixture): Promise<void> {
  const file = path.join(DIR, `${f.name}.json`);
  writeFileSync(file, await format(JSON.stringify(f), { parser: 'json', filepath: file }));
}

function load(): ReplayFixture[] {
  return readdirSync(DIR)
    .filter((n) => n.endsWith('.json'))
    .sort()
    .map((n) => JSON.parse(readFileSync(path.join(DIR, n), 'utf-8')) as ReplayFixture);
}

async function update(): Promise<void> {
  for (const f of load()) {
    const run = runFixture(f);
    await write({ ...f, chain: run.chain });
    console.log(`${f.name}: zincir güncellendi (${f.ticks} adım)`);
  }
  check();
}

function check(): void {
  const fixtures = load();
  let failed = false;
  const coverages = fixtures.map((f) => {
    const run = runFixture(f);
    const at = firstChainMismatch(run.chain, f.chain);
    const c = run.coverage;
    console.log(
      `${f.name}: ${f.ticks} adım, ${c.goals} gol, duraklama ${c.pauseTicks.join('/')} adım, ` +
        `süperler ${Object.keys(c.supers).join(',')} → ${at < 0 ? 'zincir aynı' : `FARK ${(at + 1) * f.checkpointEvery}. adıma kadar`}`,
    );
    if (at >= 0) failed = true;
    return c;
  });
  const missing = missingCoverage(coverages);
  if (missing.length > 0) {
    console.log(`Kapsam eksik: ${missing.join(', ')}`);
    failed = true;
  }
  if (failed) process.exit(1);
}

const args = process.argv.slice(2);
if (args.includes('--record')) record();
else if (args.includes('--update')) void update();
else check();
