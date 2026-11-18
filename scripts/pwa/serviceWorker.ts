import { createHash } from 'node:crypto';

/**
 * Service worker kaynağını üretir. Strateji:
 * - **install:** derlemedeki tüm dosyalar (ve `./`) sürüme özel önbelleğe alınır, beklemeden etkinleşir.
 * - **activate:** eski sürüm önbellekleri silinir, açık sayfalar sahiplenilir.
 * - **fetch (aynı köken, GET):** sayfa gezintisi önce ağdan (güncel sürüm), ağ yoksa önbellekteki
 *   `index.html`; diğer dosyalar önce önbellekten (adları içerik özetli, değişmez), yoksa ağdan
 *   alınıp önbelleğe eklenir. Böylece ilk açılıştan sonra oyun tamamen çevrimdışı çalışır.
 * - Eşleşmede `Vary` yok sayılır: sunucu `Vary: Origin` gönderirse modül betiği isteği (Origin
 *   başlıklı) önbellekteki kopyayla (başlıksız `addAll`) eşleşmez ve çevrimdışı açılış bozulur.
 */
export function cacheVersion(files: readonly string[]): string {
  return createHash('sha256')
    .update([...files].sort().join('\n'))
    .digest('hex')
    .slice(0, 12);
}

export function buildServiceWorker(prefix: string, files: readonly string[]): string {
  const assets = ['./', ...[...new Set(files)].filter((f) => f !== 'sw.js').map((f) => `./${f}`)];
  const cache = `${prefix}-${cacheVersion(files)}`;
  return `/* ${prefix} service worker — derleme sırasında üretildi; elle düzenlemeyin. */
const CACHE = ${JSON.stringify(cache)};
const PREFIX = ${JSON.stringify(`${prefix}-`)};
const ASSETS = ${JSON.stringify(assets)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    const fallback = new URL('./index.html', self.registration.scope).href;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(fallback, copy));
          }
          return response;
        })
        .catch(() => caches.match(fallback, { ignoreSearch: true, ignoreVary: true })),
    );
    return;
  }
  event.respondWith(
    caches.match(request, { ignoreSearch: true, ignoreVary: true }).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
`;
}
