// Faz 2.8: Firebase ve gözlemlenebilirlik kodu web sürümüne girmez. Web derlemesinden (`dist/`)
// sonra çalışır (`npm run check:web`, deploy.yml); derlenmiş dosyalarda Firebase/Crashlytics izi,
// yerel Telemetry eklentisinin adı ya da rıza ekranı metni varsa hata verir.
// Kullanım: node scripts/check-web-bundle.js [klasör=dist]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'dist');
const FORBIDDEN = [
  { re: /firebase/i, why: 'Firebase' },
  { re: /crashlytics/i, why: 'Crashlytics' },
  { re: /app-measurement|google-analytics|googletagmanager/i, why: 'Google Analytics uç noktası' },
  { re: /["'`]Telemetry["'`]/, why: 'yerel Telemetry eklentisi' },
  { re: /geliştirmemize yardım et|Help us improve the game/, why: 'rıza ekranı metni' },
];
const TEXT_EXT = new Set(['.js', '.mjs', '.html', '.json', '.webmanifest', '.css', '.txt']);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (TEXT_EXT.has(path.extname(name))) yield full;
  }
}

let files = 0;
const problems = [];
for (const file of walk(root)) {
  files++;
  const text = readFileSync(file, 'utf8');
  for (const { re, why } of FORBIDDEN) {
    const m = re.exec(text);
    if (m) problems.push(`${path.relative(root, file)}: ${why} ("${m[0]}")`);
  }
}

if (files === 0) {
  console.error(`check-web-bundle: ${root} içinde dosya yok (önce npm run build).`);
  process.exit(1);
}
if (problems.length > 0) {
  console.error('check-web-bundle: web paketinde olmaması gerekenler bulundu:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`check-web-bundle: ${files} dosya tarandı, Firebase/gözlemlenebilirlik izi yok ✓`);
