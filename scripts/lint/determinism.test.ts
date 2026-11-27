import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint, Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';
import { determinism, SIM_FILES, SIM_IGNORES } from './determinism.js';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const RULE = 'kafa/deterministic-sim';

const linter = new Linter({ configType: 'flat' });
const config: Linter.Config[] = [
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    plugins: { kafa: determinism },
    rules: { [RULE]: 'error' },
  },
];

/** Kodun kural ihlallerinin mesaj kimlikleri. */
function lint(code: string, filename = 'sim.ts'): string[] {
  return linter.verify(code, config, { filename }).map((m) => m.messageId ?? m.message);
}

describe('Determinizm lint kuralı (Faz 2.7)', () => {
  it.each([
    ['Math.sin(a)', 'forbiddenMath'],
    ['Math.cos(a)', 'forbiddenMath'],
    ['Math.atan2(a, b)', 'forbiddenMath'],
    ['Math.atan(a)', 'forbiddenMath'],
    ['Math.exp(a)', 'forbiddenMath'],
    ['Math.log(a)', 'forbiddenMath'],
    ['Math.pow(a, 2)', 'forbiddenMath'],
    ['Math.hypot(a, b)', 'forbiddenMath'],
    ['Math.tanh(a)', 'forbiddenMath'],
    ['Math.cbrt(a)', 'forbiddenMath'],
    ['Math.random()', 'random'],
    ['a ** 2', 'pow'],
    ['Math["sin"](a)', 'forbiddenMath'],
    ['Math[name](a)', 'dynamicMath'],
    ['globalThis.Math.sin(a)', 'forbiddenMath'],
  ])('yasaklar: %s', (expr, id) => {
    expect(
      lint(`declare const a: number, b: number, name: 'sin';\nexport const v = ${expr};`),
    ).toEqual([id]);
  });

  it('`**=` ve Math takma adlarını yakalar', () => {
    expect(lint('let a = 2;\na **= 3;\nexport { a };')).toEqual(['pow']);
    expect(lint('export const M = Math;')).toEqual(['mathAlias']);
    expect(lint('const { sin } = Math;\nexport { sin };')).toEqual(['mathAlias']);
    expect(lint('export const f = (m = Math) => m;')).toEqual(['mathAlias']);
    expect(lint('export const g = globalThis.Math;')).toEqual(['mathAlias']);
  });

  it('tam tanımlı işlemlere ve sabitlere izin verir', () => {
    const ok = [
      'Math.sqrt(a)',
      'Math.abs(a)',
      'Math.min(a, b)',
      'Math.max(a, b)',
      'Math.floor(a)',
      'Math.ceil(a)',
      'Math.round(a)',
      'Math.trunc(a)',
      'Math.sign(a)',
      'Math.fround(a)',
      'Math.imul(a, b)',
      'Math.clz32(a)',
      'Math.PI * a',
      'a * a + b / a - 1',
      '{ Math: 1 }',
    ];
    for (const expr of ok) {
      expect(lint(`declare const a: number, b: number;\nexport const v = ${expr};`), expr).toEqual(
        [],
      );
    }
    expect(lint('export type T = typeof Math;')).toEqual([]);
  });

  it('eslint.config.js kuralı simülasyon dosyalarında açar; sunum katmanında ve testlerde açmaz', async () => {
    const eslint = new ESLint({ cwd: ROOT });
    const severity = async (file: string): Promise<unknown> => {
      const cfg = (await eslint.calculateConfigForFile(path.join(ROOT, file))) as {
        rules?: Record<string, unknown>;
      };
      const r = cfg.rules?.[RULE];
      return Array.isArray(r) ? r[0] : r;
    };
    for (const file of [
      'src/physics/solver.ts',
      'src/physics/detMath.ts',
      'src/game/GameSim.ts',
      'src/game/entities/Player.ts',
      'src/game/ai/AiController.ts',
      'src/input/InputState.ts',
      'src/config/gameConfig.ts',
    ]) {
      expect(await severity(file), file).toBe(2);
    }
    for (const file of [
      'src/ui/MatchRenderer.ts',
      'src/audio/Crowd.ts',
      'src/game/GameSim.test.ts',
    ]) {
      expect(await severity(file), file).toBeUndefined();
    }
  });

  it('simülasyon bölgesindeki tüm dosyalar kurala uyar (npm test de kırılır)', () => {
    const files = globSync([...SIM_FILES], { cwd: ROOT, exclude: [...SIM_IGNORES] });
    expect(files.length).toBeGreaterThan(30);
    const problems: string[] = [];
    for (const file of files) {
      const code = readFileSync(path.join(ROOT, file), 'utf-8');
      for (const m of linter.verify(code, config, { filename: file })) {
        problems.push(`${file}:${m.line}:${m.column} ${m.message}`);
      }
    }
    expect(problems).toEqual([]);
  });
});
