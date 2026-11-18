# Kafa Kafaya

Tarayıcıda oynanan, 2D yandan görünümlü, 1v1 bir kafa topu oyunu. Büyük kafalı özgün
karakterler, süper şutlar, güçlendiriciler ve gol tekrarı.

**Canlı sürüm:** https://emengin.github.io/kafa-kafaya/

> Durum: **Faz 6 — Modlar, menüler ve platform desteği.** Arka planında canlı AI vs AI maçı
> oynanan ana menüden **Hızlı Maç** (CPU), **2 Oyuncu**, **Turnuva** (8 kişilik eleme, giderek
> zorlaşan rakipler, kupa ekranı ve yeni karakter kilidi), **Antrenman** (süresiz, rakipsiz/kukla,
> top sıfırlama), **Ayarlar** (zorluk, 60/90/120 sn, ses düzeyleri, TR/EN, ekran sarsıntısı, kontrol
> şeması) ve **Nasıl Oynanır**. Karakter seçiminde istatistik çubukları, gerçek simülasyondan süper
> şut önizlemesi ve kilitli karakterler. Telefonda dokunmatik butonlar (çoklu dokunuş), dikey ekran
> uyarısı ve tam ekran; 2 gamepad'e kadar destek; ilerleme ve istatistikler `localStorage`'da;
> PWA olarak çevrimdışı oynanır ve ana ekrana eklenebilir. Ayrıntılar, ölçümler ve denge tablosu
> için [docs/PROGRESS.md](docs/PROGRESS.md).

## Teknoloji

- TypeScript (strict) + Vite + Phaser 3 (yalnızca render, sahne, input, ses)
- Kendi deterministik fizik modülü (`src/physics`, sabit 60 Hz adım)
- Harici görsel/ses dosyası yok: grafikler kodla (Canvas 2D) dokuya çizilir, sesler Web Audio
  ile sentezlenir (efektler, kalabalık, prosedürel müzik)
- Nesne havuzlu parçacıklar, uyarlamalı görsel kalite (düşük güçlü cihazda 60 FPS hedefi)
- Klavye, dokunmatik (çoklu dokunuş) ve Gamepad API — hepsi aynı "sanal tuş" girdi yolundan
- PWA: derleme sırasında üretilen manifest, kodla çizilen simgeler ve çevrimdışı service worker
- Vitest, ESLint, Prettier, GitHub Actions → GitHub Pages

## Geliştirme

Node.js 20+ gerekir.

```bash
npm install
npm run dev       # geliştirme sunucusu (http://localhost:5173)
npm run build     # tip denetimi + üretim derlemesi (dist/)
npm run preview   # derlenmiş sürümü yerelde sun
npm run lint      # ESLint + Prettier denetimi
npm run format    # Prettier ile biçimlendir
npm test          # Vitest birim testleri
npm run simulate  # AI vs AI headless 100 maç: skor dağılımı, süperler, sıkışma raporu
```

`npm run simulate -- --p1 hard --p2 easy` farklı zorlukları, `--matrix` tüm zorluk eşleşmelerini,
`--c1 kor --c2 kaya` karakterleri, `--characters` 45 karakter eşleşmesinin iki tarafta da
oynandığı denge taramasını (`--jobs N` ile paralel, `--difficulty` ile seviye), `--seed N`
tohumu, `--matches N` maç sayısını, `--json dosya.json` JSON çıktısını seçer. Örnek:
`npm run simulate -- --characters --matches 40 --jobs 10`.

Geliştirme kısayolları (URL parametreleri):

- `?scene=match&debug=1&duration=10` — menüyü atlayıp doğrudan 10 sn'lik 2 oyunculu maça girer
  ve debug katmanını açık başlatır.
- `?cpu=easy|medium|hard` — doğrudan CPU'ya karşı maç; `?cpu1=…` ile P1 de yapay zekâ olur
  (AI vs AI izleme); `?seed=N` yapay zekânın ve güçlendiricilerin tohumunu sabitler.
- `?c1=kor&c2=kaya` — karakterler (seçim ekranını atlayan kısayollarla birlikte).
  Karakter kimlikleri: `kor ayaz simsek sis kaya bora yay demir pamuk toprak`.
- `?quality=low|medium|high` — görsel kaliteyi sabitler (varsayılan: uyarlamalı; kare süresi uzun
  süre bütçeyi aşarsa efektler azaltılır).
- `?debug=1` iken `window.__KAFA_GAME__` (oyun) ve `window.__KAFA_AUDIO__` (ses sistemi) tarayıcı
  testleri için açılır.
- `?unlock=all` — tüm karakterler açık görünür (kayda yazılmaz); `?touch=1` — dokunmatik butonlar
  masaüstünde de görünür.

## Kontroller

| Eylem   | Oyuncu 1  | Oyuncu 2  |
| ------- | --------- | --------- |
| Hareket | A / D     | ← / →     |
| Zıpla   | W         | ↑         |
| Şut     | Space     | Enter     |
| Süper   | Sol Shift | Sağ Shift |

| Eylem    | Gamepad (1. kol P1, 2. kol P2) | Dokunmatik (P1)             |
| -------- | ------------------------------ | --------------------------- |
| Hareket  | Sol çubuk / d-pad              | ◀ ▶ (sol alt)               |
| Zıpla    | A                              | ZIPLA                       |
| Şut      | X / B                          | ŞUT                         |
| Süper    | RB / RT                        | SÜPER (bar doluyken parlar) |
| Duraklat | Start                          | II (sol üst)                |

Tek insanlı modlarda (Hızlı Maç, turnuva, antrenman) iki tuş takımı, iki kol ve dokunmatik birlikte
P1'i yönetir. **Antrenman:** R topu sıfırla · F süper barını doldur · T kukla rakip (gamepad: Y ·
LB · Back; dokunmatikte sol üstte iki buton).

**Süper:** güç barı (isimlerin altında) dolunca Süper'e bas — bir sonraki şut ya da kafa karakterin
süper şutu olur (Ateş Topu, Buz, Zikzak, Işınlanma, Dev Top, Kasırga, Gökkuşağı, Mıknatıs, Serap,
Sarsıntı). Süper topa **şut ya da kafayla aktif vurmak** her zaman temiz bir karşılıktır.
**Güçlendiriciler:** 12–18 sn'de bir sahanın üst yarısında balon belirir; topla patlatınca topa son
dokunan kazanır (Büyük Kafa, Rakibi Küçült, Hız, Rakip Kalesini Büyüt, Rakibi Dondur, Çift Zıplama).

**Karakter seçimi:** P1 A/D/W/S + Space (ya da 1. kol), P2 oklar + Enter (ya da 2. kol), aynı anda;
fare/dokunmatikle karta dokun. Kilitli karakterler turnuva kazanılarak sırayla açılır.

**Menüler:** ↑/↓ + Enter, fare, dokunmatik ya da gamepad (d-pad, A onay, B geri); ←/→ değer/sayfa
değiştirir; Esc/Backspace geri. **Esc / P / Start:** duraklat · **F1:** debug katmanı.

**Mobil:** telefonu yatay tut (dikeyde uyarı çıkar ve maç duraklar); sağ üstteki düğmeyle tam ekran.
Tarayıcı menüsünden "Ana ekrana ekle" ile uygulama gibi açılır ve çevrimdışı çalışır.

**Ses:** Ayarlar'dan (ya da duraklatma menüsündeki Ses Ayarları'ndan) Ana ses / Efektler / Müzik.
Tarayıcılar sesi ilk etkileşime kadar başlatmaz: ilk tuş, tıklama ya da dokunuşla ses ve müzik açılır
(gamepad düğmesi çoğu tarayıcıda etkileşim sayılmaz).

## Klasör yapısı

```
src/
  config/     gameConfig.ts — tüm denge/ayar değerleri (kodda sihirli sayı yok)
  physics/    Phaser'dan bağımsız deterministik fizik ve sabit adımlı döngü
  game/       entities, rules, ai, characters, superEffects, powerups — oyun mantığı
  input/      InputState soyutlaması; klavye, sanal tuşlar (gamepad, dokunmatik), çoklu kod eşlemesi
  scenes/     Phaser sahneleri (Boot → Preload → Menu → Select → Match / Tournament → Trophy)
  save/       localStorage kaydı: oyun ayarları, açılan karakterler + istatistikler (alan alan doğrulama)
  platform/   dokunmatik algılama, tam ekran düğmesi + dikey ekran uyarısı, service worker kaydı
  ui/         maç çizimi (stadyum, karakter düzeneği, top, ağ, süper efektleri, parçacıklar), HUD, menüler
  art/        kodla üretilen dokular: karakter görünüşleri ve yüz, stadyum, efektler, arayüz panelleri
  fx/         saf görsel mantık: parçacık havuzu, ağ dalgası, squash & stretch, yüz ifadeleri,
              hit-stop, sarsıntı, kamera zoom'u, uyarlamalı kalite
  audio/      Web Audio: motor ve veri yolları, efektler, kalabalık, prosedürel müzik, ses ayarları
  i18n/       TR/EN metinler
scripts/      simulate.ts (AI vs AI simülasyonu), run-ts.js (TS betik çalıştırıcı),
              pwa/ (Vite eklentisi: manifest, kodla çizilen PNG simgeler, service worker)
docs/         GAME_DESIGN.md, PROGRESS.md
```

## Yayın

`main` dalına her push'ta GitHub Actions lint + test + build çalıştırır ve `dist/`
klasörünü GitHub Pages'e yayınlar. `vite.config.ts` içindeki `base` yolu depo adından
(`GITHUB_REPOSITORY`) otomatik türetilir.

## Lisans

[MIT](LICENSE)
