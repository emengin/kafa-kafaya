// TypeScript betiklerini (scripts/*.ts) ek bağımlılık olmadan çalıştırır: projede zaten olan
// Vite'ın modül çalıştırıcısı (runnerImport) kaynakları dönüştürür ve uzantısız importları
// çözer. Kullanım: node scripts/run-ts.js scripts/simulate.ts [argümanlar…]
import path from 'node:path';
import { runnerImport } from 'vite';

const [file, ...rest] = process.argv.slice(2);
if (!file) {
  console.error('Kullanım: node scripts/run-ts.js <betik.ts> [argümanlar…]');
  process.exit(1);
}
const entry = path.resolve(file);
// Betik kendi argümanlarını process.argv.slice(2)'den okuyabilsin.
process.argv = [process.argv[0], entry, ...rest];
await runnerImport(entry, { configFile: false, logLevel: 'error' });
