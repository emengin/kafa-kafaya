// determinism.js için türler (eslint.config.js düz JS; testler TypeScript'ten içe aktarır).
import type { ESLint } from 'eslint';

/** Simülasyon bölgesinin dosya kalıpları (kural burada etkin). */
export declare const SIM_FILES: readonly string[];
/** Bölge içinde kuralın uygulanmadığı dosyalar (testler). */
export declare const SIM_IGNORES: readonly string[];
/** `plugins: { kafa: determinism }` → kural `kafa/deterministic-sim`. */
export declare const determinism: ESLint.Plugin;
