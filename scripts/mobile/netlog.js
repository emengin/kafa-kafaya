// Ağ kaydı (Faz 2.8): telefonun (ya da emülatörün) giden bağlantılarını kaydeder. Amaç: rıza yokken
// uygulamanın hiçbir sunucuya istek göndermediğini, rıza verilince Firebase'e gittiğini göstermek.
//
// Nasıl çalışır:
//   1. Bilgisayarda küçük bir HTTP/HTTPS proxy açılır (127.0.0.1:PORT). HTTPS içeriği AÇILMAZ;
//      yalnızca her bağlantının hangi sunucuya gittiği (CONNECT host:443) kaydedilir.
//   2. `adb reverse` telefonun 127.0.0.1:PORT'unu bu proxy'ye bağlar (USB üzerinden), telefonun
//      genel proxy ayarı buna çevrilir. Böylece telefondaki proxy'ye uyan tüm trafik kayda girer
//      (yalnızca bu uygulama değil: Google Play hizmetleri ve diğer uygulamalar da görünür).
//   3. Ayrıca uygulamanın kendi UID'sinin ağ sayacı (çekirdek, eBPF; proxy'den bağımsız, her soket)
//      başta ve sonda okunur. Uygulama hiç bağlantı açmadıysa fark 0'dır.
//   4. Süre dolunca (ya da Ctrl+C) proxy ayarı ve adb reverse HER DURUMDA geri alınır.
//
// Kullanım:
//   node scripts/mobile/netlog.js [--seconds 120] [--out netlog.txt] [--serial CİHAZ] [--port 8899]
//   Emülatörde: --proxy-host 10.0.2.2 (emülatörün bilgisayara giden adresi; adb reverse gerekmez,
//   adb bağlantısı kısa süre kopsa da kayıt sürer).
//
// Kayıt sürerken uygulamayı açıp kullanın (rıza ekranında karar vermeyin / "İzin verme" deyin,
// maç oynayın…). Bittiğinde özet: toplam bağlantı, Firebase sunucularına giden bağlantılar, UID
// sayaç farkı.
//
// ÖNEMLİ: Betik yarıda öldürülürse (pencere kapandı) telefonun internet bağlantısı proxy'ye takılı
// kalabilir. Düzeltmek için: adb shell settings put global http_proxy :0
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';

const PACKAGE = 'com.emengin.kafakafaya';
/** Firebase Analytics / Crashlytics / Installations / Sessions uç noktaları. */
const FIREBASE_HOSTS =
  /app-measurement\.com|firebase|crashlytics|google-analytics\.com|analytics\.google\.com/i;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const seconds = Number(arg('seconds', '120'));
const port = Number(arg('port', '8899'));
const out = arg('out', 'netlog.txt');
const serial = arg('serial', null);
/** Telefonun proxy olarak kullanacağı adres; 127.0.0.1 ise adb reverse ile bilgisayara bağlanır. */
const proxyHost = arg('proxy-host', '127.0.0.1');
const useReverse = proxyHost === '127.0.0.1';
const ADB_RETRIES = 6;
const ADB_RETRY_MS = 1500;

function findAdb() {
  const exe = process.platform === 'win32' ? 'adb.exe' : 'adb';
  const roots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
  ].filter(Boolean);
  for (const r of roots) {
    const p = path.join(r, 'platform-tools', exe);
    if (existsSync(p)) return p;
  }
  return 'adb';
}

const ADB = findAdb();

/** adb komutu; bağlantı kısa süre koparsa (ör. başka bir adb sunucuyu yeniden başlattı) tekrar dener. */
function adb(...args) {
  const full = serial ? ['-s', serial, ...args] : args;
  let last;
  for (let i = 0; i < ADB_RETRIES; i++) {
    try {
      return execFileSync(ADB, full, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim();
    } catch (e) {
      last = e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ADB_RETRY_MS);
    }
  }
  throw last;
}

function appUid() {
  const line = adb('shell', 'pm', 'list', 'packages', '-U', PACKAGE)
    .split('\n')
    .find((l) => l.startsWith(`package:${PACKAGE} `));
  const m = line && /uid:(\d+)/.exec(line);
  return m ? Number(m[1]) : null;
}

/**
 * UID'nin toplam rx+tx baytı (dumpsys netstats; önce zorla yoklama). Okunamazsa null.
 * "ident=… uid=10234 set=DEFAULT tag=0x0" satırından sonraki "st=… rb=… tb=…" kovaları toplanır.
 */
function uidBytes(uid) {
  try {
    adb('shell', 'dumpsys', 'netstats', '--poll');
    const text = adb('shell', 'dumpsys', 'netstats', 'detail');
    const start = text.indexOf('UID stats:');
    if (start < 0) return null;
    const end = text.indexOf('UID tag stats:', start);
    const section = text.slice(start, end < 0 ? undefined : end);
    let total = 0;
    let inUid = false;
    for (const line of section.split('\n')) {
      if (/\buid=/.test(line))
        inUid = new RegExp(`\\buid=${uid}\\b`).test(line) && /tag=0x0\b/.test(line);
      else if (inUid) {
        const rb = /rb=(\d+)/.exec(line);
        const tb = /tb=(\d+)/.exec(line);
        if (rb) total += Number(rb[1]);
        if (tb) total += Number(tb[1]);
      }
    }
    return total;
  } catch {
    return null;
  }
}

const log = [];
const t0 = Date.now();
function record(kind, target) {
  const s = ((Date.now() - t0) / 1000).toFixed(1).padStart(6);
  const line = `${new Date().toISOString()}  +${s}s  ${kind.padEnd(7)} ${target}`;
  log.push({ kind, target, line });
  console.log(line);
}

const server = http.createServer((req, res) => {
  // Düz HTTP isteği (mutlak adres). İçerik değil, yalnızca hedef kaydedilir; istek iletilir.
  let target;
  try {
    target = new URL(req.url);
  } catch {
    res.writeHead(400).end();
    return;
  }
  record('HTTP', `${target.host}${target.pathname}`);
  const fwd = http.request(
    {
      host: target.hostname,
      port: target.port || 80,
      path: target.pathname + target.search,
      method: req.method,
      headers: req.headers,
    },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  fwd.on('error', () => res.destroy());
  req.pipe(fwd);
});

server.on('connect', (req, client, head) => {
  record('CONNECT', req.url);
  const [host, p] = req.url.split(':');
  const upstream = net.connect(Number(p) || 443, host, () => {
    client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    if (head.length) upstream.write(head);
    upstream.pipe(client);
    client.pipe(upstream);
  });
  const close = () => {
    upstream.destroy();
    client.destroy();
  };
  upstream.on('error', close);
  client.on('error', close);
});

let restored = false;
function restore() {
  if (restored) return;
  restored = true;
  const cmds = [['shell', 'settings', 'put', 'global', 'http_proxy', ':0']];
  if (useReverse) cmds.push(['reverse', '--remove', `tcp:${port}`]);
  for (const cmd of cmds) {
    try {
      adb(...cmd);
    } catch {
      console.error(`UYARI: geri alınamadı: adb ${cmd.join(' ')} — elle çalıştırın.`);
    }
  }
}

function finish(uid, before) {
  restore();
  server.close();
  const after = uid === null ? null : uidBytes(uid);
  const firebase = log.filter((e) => FIREBASE_HOSTS.test(e.target));
  const hosts = [...new Set(log.map((e) => e.target))].sort();
  const delta = before === null || after === null ? null : after - before;
  const summary = [
    '',
    `Süre: ${seconds} sn · cihaz: ${serial ?? '(varsayılan)'} · uygulama UID: ${uid ?? 'bulunamadı'}`,
    `Toplam bağlantı: ${log.length} · farklı hedef: ${hosts.length}`,
    `Firebase sunucularına bağlantı: ${firebase.length}`,
    ...firebase.map((e) => `  ${e.line}`),
    `Uygulama UID ağ sayacı farkı (rx+tx): ${delta === null ? 'okunamadı' : `${delta} bayt`}`,
    '',
    'Farklı hedefler:',
    ...hosts.map((h) => `  ${h}`),
  ];
  console.log(summary.join('\n'));
  writeFileSync(out, [...log.map((e) => e.line), ...summary].join('\n') + '\n');
  console.log(`\nKayıt: ${path.resolve(out)}`);
  process.exit(0);
}

const uid = appUid();
const before = uid === null ? null : uidBytes(uid);
server.listen(port, '127.0.0.1', () => {
  try {
    if (useReverse) adb('reverse', `tcp:${port}`, `tcp:${port}`);
    adb('shell', 'settings', 'put', 'global', 'http_proxy', `${proxyHost}:${port}`);
  } catch (e) {
    console.error(`adb hatası: ${e.message}`);
    restore();
    process.exit(1);
  }
  console.log(
    `Proxy ${proxyHost}:${port} (bilgisayarda 127.0.0.1:${port}) · ${seconds} sn kayıt · Ctrl+C ile erken bitir.`,
  );
  console.log(`Uygulama UID ${uid ?? '?'}, başlangıç sayacı: ${before ?? 'okunamadı'} bayt\n`);
  const timer = setTimeout(() => finish(uid, before), seconds * 1000);
  process.on('SIGINT', () => {
    clearTimeout(timer);
    finish(uid, before);
  });
});
process.on('exit', restore);
process.on('uncaughtException', (e) => {
  console.error(e);
  restore();
  process.exit(1);
});
