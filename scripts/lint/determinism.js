// Faz 2.7 — Determinizm lint kuralı (`kafa/deterministic-sim`).
//
// Simülasyon kodu (fizik, oyun durumu, yapay zekâ, ayar değerleri) Android (V8), iOS
// (JavaScriptCore) ve Node'da bit düzeyinde aynı sonucu vermelidir. ECMAScript `Math.sin`, `exp`,
// `pow`, `hypot`… sonuçlarını motora bırakır; `**` de `Math.pow` ile aynıdır; `Math.random`
// tohumlanamaz. Bu kural simülasyon dosyalarında bunları yasaklar (izin listesi): ESLint hata
// verir, `npm run lint` (deploy.yml) ve determinismLint.test.ts (`npm test`, iki iş akışı) kırılır.
//
// İzinli `Math` üyeleri, sonucu ECMAScript'te tam tanımlı olanlardır: +, −, ×, ÷ ve `sqrt`
// (IEEE 754 doğru yuvarlama), `abs/min/max/floor/ceil/round/trunc/sign/fround` (tam sonuç),
// `imul/clz32` (tam sayı) ve sabitler. Yerine: src/physics/detMath.ts (dsin, dcos, datan2, dexp,
// dlog, dpow, dhypot) ve tohumlu `SeededRandom` (src/game/ai/random.ts).

/** Simülasyon bölgesi: bu dosyalarda kural etkindir (testler hariç). */
export const SIM_FILES = [
  'src/physics/**/*.ts',
  'src/game/**/*.ts',
  'src/input/InputState.ts',
  'src/config/gameConfig.ts',
];
export const SIM_IGNORES = ['**/*.test.ts'];

const ALLOWED_MATH = new Set([
  'abs',
  'ceil',
  'clz32',
  'floor',
  'fround',
  'imul',
  'max',
  'min',
  'round',
  'sign',
  'sqrt',
  'trunc',
  'E',
  'LN10',
  'LN2',
  'LOG10E',
  'LOG2E',
  'PI',
  'SQRT1_2',
  'SQRT2',
]);

const REPLACEMENTS = {
  sin: 'dsin',
  cos: 'dcos',
  atan: 'datan',
  atan2: 'datan2',
  exp: 'dexp',
  log: 'dlog',
  pow: 'dpow',
  hypot: 'dhypot',
};

/** @param {string} name */
function hint(name) {
  if (name === 'random') {
    return 'Tohumlu `SeededRandom` kullanın (src/game/ai/random.ts); durumu saveState/loadState’e girer.';
  }
  const r = REPLACEMENTS[/** @type {keyof typeof REPLACEMENTS} */ (name)];
  if (r) return `\`${r}\` kullanın (src/physics/detMath.ts).`;
  return 'İzinli işlemlerle deterministik bir sürüm yazın (örnek: src/physics/detMath.ts).';
}

/** @param {import('estree').Node | null | undefined} node */
function isMathRef(node) {
  if (!node) return false;
  if (node.type === 'Identifier') return node.name === 'Math';
  // globalThis.Math, window.Math, self.Math
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property.type === 'Identifier' &&
    node.property.name === 'Math'
  );
}

/** @type {import('eslint').Rule.RuleModule} */
const deterministicSim = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Simülasyon kodunda motora göre değişen Math işlevlerini, ** işlecini ve Math.random’ı yasaklar (Faz 2.7).',
    },
    schema: [],
    messages: {
      forbiddenMath:
        '`Math.{{name}}` simülasyonda yasak: sonucu JS motoruna göre değişebilir (determinizm, Faz 2.7). {{hint}}',
      random:
        '`Math.random` simülasyonda yasak: tohumlanamaz, tekrar ve rollback bozulur. {{hint}}',
      pow: '`{{op}}` simülasyonda yasak (`Math.pow` ile aynı, motora göre değişebilir): `dpow` (src/physics/detMath.ts) ya da çarpma kullanın.',
      dynamicMath: '`Math[…]` dinamik erişimi denetlenemez: `Math.<ad>` yazın.',
      mathAlias:
        '`Math` simülasyonda yalnızca `Math.<izinli üye>` biçiminde kullanılabilir (takma ad ya da yapı bozma denetimi atlatır).',
    },
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (isMathRef(node)) {
          // `globalThis.Math` tek başına (takma ad): `globalThis.Math.x` değilse.
          const parent = /** @type {{ type: string, object?: unknown }} */ (
            /** @type {{ parent?: unknown }} */ (node).parent
          );
          if (!(parent.type === 'MemberExpression' && parent.object === node)) {
            context.report({ node, messageId: 'mathAlias' });
          }
        }
        if (!isMathRef(node.object)) return;
        let name = null;
        if (!node.computed && node.property.type === 'Identifier') name = node.property.name;
        else if (node.property.type === 'Literal' && typeof node.property.value === 'string') {
          name = node.property.value;
        }
        if (name === null) {
          context.report({ node, messageId: 'dynamicMath' });
          return;
        }
        if (ALLOWED_MATH.has(name)) return;
        context.report({
          node,
          messageId: name === 'random' ? 'random' : 'forbiddenMath',
          data: { name, hint: hint(name) },
        });
      },
      Identifier(node) {
        if (node.name !== 'Math') return;
        const parent = /** @type {import('estree').Node & { parent?: unknown }} */ (node).parent;
        const p =
          /** @type {{ type: string, object?: unknown, property?: unknown, key?: unknown, computed?: boolean }} */ (
            parent
          );
        if (!p) return;
        // Math.x (nesne olarak) ya da globalThis.Math(.x): üye denetimi MemberExpression'da.
        if (p.type === 'MemberExpression' && (p.object === node || p.property === node)) return;
        // { Math: … } gibi nesne/sınıf anahtarları değişken değildir.
        const keyTypes = ['Property', 'PropertyDefinition', 'MethodDefinition'];
        if (keyTypes.includes(p.type) && p.key === node && !p.computed) return;
        // TypeScript tür konumları (`typeof Math`) çalışma zamanı değildir.
        if (p.type.startsWith('TS')) return;
        context.report({ node, messageId: 'mathAlias' });
      },
      BinaryExpression(node) {
        if (node.operator === '**') context.report({ node, messageId: 'pow', data: { op: '**' } });
      },
      AssignmentExpression(node) {
        if (node.operator === '**=')
          context.report({ node, messageId: 'pow', data: { op: '**=' } });
      },
    };
  },
};

/** ESLint eklentisi: `plugins: { kafa: determinism }` → kural `kafa/deterministic-sim`. */
export const determinism = {
  meta: { name: 'kafa-determinism' },
  rules: { 'deterministic-sim': deterministicSim },
};
