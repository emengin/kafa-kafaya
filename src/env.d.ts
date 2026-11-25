/** Derleme sırasında package.json'dan enjekte edilen sürüm (vite.config.ts → `define`). */
declare const __APP_VERSION__: string;
/** Capacitor (mobil) derlemesi mi? (vite.config.ts → `define`; ayrıntı: src/platform/target.ts) */
declare const __NATIVE_APP__: boolean;
