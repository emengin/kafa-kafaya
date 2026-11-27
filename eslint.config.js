import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import { determinism, SIM_FILES, SIM_IGNORES } from './scripts/lint/determinism.js';

export default tseslint.config(
  { ignores: ['dist', 'dist-mobile', 'android', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    // "Kodda sihirli sayı olmasın": tüm denge/ayar değerleri src/config içinde yaşar.
    files: ['src/**/*.ts'],
    ignores: ['src/config/**', 'src/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1, 2, 0.5],
          ignoreEnums: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
          ignoreNumericLiteralTypes: true,
          ignoreDefaultValues: true,
        },
      ],
    },
  },
  {
    // Faz 2.7 — Determinizm: simülasyon her JS motorunda bit düzeyinde aynı sonucu vermeli.
    // Motora göre değişen Math işlevleri, `**` ve Math.random yasak (scripts/lint/determinism.js).
    files: [...SIM_FILES],
    ignores: [...SIM_IGNORES],
    plugins: { kafa: determinism },
    rules: { 'kafa/deterministic-sim': 'error' },
  },
  {
    files: ['**/*.js', '**/*.cjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Özel Phaser girişi: Phaser kaynağı CommonJS olduğu için `require` ile derlenir.
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  prettier,
);
