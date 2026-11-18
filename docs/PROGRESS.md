# İlerleme Günlüğü

## Faz durumu

| Faz | Başlık                                     | Durum         |
| --- | ------------------------------------------ | ------------- |
| 0   | Kurulum ve yayın hattı                     | ✅ Tamamlandı |
| 1   | Çekirdek fizik ve kontroller (gri kutu)    | ✅ Tamamlandı |
| 2   | Maç kuralları ve oyun döngüsü              | ✅ Tamamlandı |
| 3   | Yapay zekâ rakip                           | ✅ Tamamlandı |
| 4   | Karakterler, süper şutlar, güçlendiriciler | ✅ Tamamlandı |
| 5   | Görsel kalite ve ses ("juice")             | ✅ Tamamlandı |
| 6   | Playwright duman testi                     | **TAM**       | `e2e/smoke.spec.ts`: oyun açılıyor, menüden Hızlı Maç başlıyor, maç 10 sn hatasız çalışıyor; CI'da derlemeden sonra çalışır.                          |
| 7   | README                                     | **TAM**       | Tanıtım, canlı oyna bağlantısı, Playwright ile otomatik alınan 6 ekran görüntüsü (`npm run screenshots`), kontroller, kurulum, mimari, katkı rehberi. |

**Canlı sürüm:** https://emengin.github.io/kafa-kafaya/

---

## Faz 0 — Kurulum ve yayın hattı (2026-11-14)

### Tamamlananlar

- Vite 8 + TypeScript (strict) + Phaser 3.90 projesi; istenen klasör yapısı
  (`src/scenes`, `src/game/{entities,rules,ai}`, `src/physics`, `src/ui`, `src/audio`,
  `src/input`, `src/i18n`, `src/config`).
- **Sahneler:** `Boot → Preload → Menu`.
  - Preload: kodla doku üretimi (`src/ui/textures.ts`, top dokusu) + yükleme çubuğu.
  - Menu: "Kafa Kafaya" başlığı (nefes alma animasyonu), yanıp sönen
    "Başlamak için tıkla", sabit adımlı döngüyle sürülen zıplayan top.
    Tıklama/tuş → kamera flaşı + topa vuruş + "Oyun modları yakında!".
- **Sabit adımlı döngü:** `src/physics/FixedStepLoop.ts` — 60 Hz, accumulator,
  kare başına en fazla 8 adım, 0,25 sn birikim sınırı, kayan nokta toleransı,
  render enterpolasyonu için `alpha`. Phaser'a bağımlı değil.
- **`src/config/gameConfig.ts`:** ekran, döngü, fizik, maç, kontroller, renkler,
  dokular, menü yerleşimi, depolama, dil ayarları.
- **Input soyutlaması:** `src/input/InputState.ts` — `InputState`, `InputSource`,
  `EMPTY_INPUT`, `mergeInputs`.
- **i18n:** TR/EN sözlükleri, `t()`, dil tercihi `localStorage`'da.
- **Güvenli depolama:** `src/game/storage.ts` (erişim hatasında sessizce devam eder).
- **Kalite:** ESLint (typescript-eslint `strictTypeChecked`) + Prettier + Vitest
  (16 test: döngü, input, i18n).
- **Yayın hattı:** `.github/workflows/deploy.yml` — `main`'e push'ta
  `npm ci → lint → test → build → GitHub Pages`. PR'larda yalnızca doğrulama.
- README, GAME_DESIGN.md, PROGRESS.md, MIT LICENSE.

### Tasarım kararları

1. **Depo adı `kafa-kafaya`**, GitHub Pages "GitHub Actions" kaynağıyla.
   `vite.config.ts` `base` yolunu `GITHUB_REPOSITORY`'den türetir (yoksa `kafa-kafaya`);
   geliştirmede `/`.
2. **Sihirli sayı yasağı lint ile zorlanıyor:** `@typescript-eslint/no-magic-numbers`
   `src/` altında (config ve testler hariç) hata verir. İzin verilen sabitler:
   `-1, 0, 1, 2, 0.5` (yarıya bölme, işaret, tam tur `2π` gibi).
3. **Klavye `KeyboardEvent.code` ile eşlenecek** (`KeyA`, `ShiftLeft`…): sol/sağ Shift
   ayrımı yalnızca böyle mümkün ve TR-Q/F düzenlerinde fiziksel konum korunur.
4. **Döngü taşma politikası:** kare başına 8 adımı aşan birikim atılır (oyun bir an
   yavaşlar, ama "yetişme" sarmalına girmez). Determinizm etkilenmez çünkü simülasyon
   yalnızca adım sayısına ve input dizisine bağlıdır, gerçek zamana değil.
5. **Kayan nokta toleransı (`1e-9` sn):** 60 Hz ekranda 16,666… ms karelerde
   0/2 adım titremesini önler (testle doğrulandı).
6. **Phaser tek parça paket** (~1,2 MB, gzip ~320 kB). Vite parça uyarı sınırı
   1600 kB'a çekildi. Sonraki fazlarda gerekirse Phaser'ın özel (küçültülmüş) derlemesi
   değerlendirilecek.
7. **Fontlar:** harici dosya yasağı nedeniyle sistem fontları (`Arial Black` → `Segoe UI`
   → `Arial` → sans-serif).
8. **Varsayılan dil Türkçe.**
9. **CI Node sürümü 24** (yerel geliştirme ortamıyla aynı). Action'lar Node 24 tabanlı
   güncel sürümlerde (checkout/setup-node v5, configure-pages v6, upload-pages-artifact v5,
   deploy-pages v5); Node 20 kullanımdan kalkma uyarısı alınmaz.
10. **Tek `tsconfig.json`** hem `src` hem `vite.config.ts` için (sadelik). Tarayıcı
    koduna `node` tipleri de görünüyor; ileride ayrılabilir.

### Bilinen sorunlar

- `npm audit`: `typescript-eslint` → `minimatch` zincirinde orta seviye bir uyarı.
  Yalnızca geliştirme bağımlılığı; oyun paketine girmez. Üst sürüm yayınlanınca
  güncellenecek.
- Menüde tıklama henüz bir moda geçmiyor (mod seçimi sonraki fazlarda).
- `PHYSICS.gravity` şimdilik yalnızca menüdeki demo topta kullanılıyor; gerçek değerler
  Faz 1'de ayarlanacak.

### Sıradaki faz

**Faz 1** — talimat bekleniyor (muhtemelen deterministik fizik çekirdeği: vektör
matematiği, daire–daire / daire–dikdörtgen / daire–doğru parçası çarpışmaları,
sub-stepping ve saha geometrisi).

> Faz 0 notu (Faz 1'de çözüldü): menü tıklaması artık maça geçiyor; `PHYSICS.gravity`
> kaldırıldı, demo top kendi `MENU.demoBall.gravity` değerini kullanıyor.

---

## Faz 1 — Çekirdek fizik ve kontroller, gri kutu prototip (2026-11-14)

**Bitti kriteri:** iki kişi tek klavyede oynayıp gol atabiliyor ✅ · top hiçbir durumda
duvar/kale içinden geçmiyor ✅ (testlerle) · his sıkı ve tepkili (ölçümler aşağıda).

### Tamamlananlar

- **Fizik modülü (`src/physics`, Phaser'dan bağımsız):**
  - `collision.ts`: daire–daire, daire–dikdörtgen (köşeler yuvarlak; merkez içerideyse en
    yakın kenardan çıkış), daire–doğru parçası (iki yüzlü ve **tek yüzlü**).
  - `solver.ts`: ters kütle oranında pozisyon düzeltmesi, sekme katsayılı normal impuls,
    Coulomb sınırlı sürtünme impulsu; sürtünme topun açısal hızını da değiştirir (yerde
    kayan top yuvarlanır, kafaya sürtünen top dönüş kazanır).
  - `ballistics.ts`: yerçekimi, doğrusal + karesel hava direnci, hafif Magnus (falso),
    dönüş sönümü.
  - `substeps.ts`: uyarlamalı sub-stepping (en az 4, en çok 64 alt adım; bir alt adımda
    en fazla 8 px yol).
  - Sabit 60 Hz adım (Faz 0'daki `FixedStepLoop`) + render enterpolasyonu.
- **Saha (`src/game/pitch.ts`):** zemin, iki duvar, tavan (tek yüzlü parçalar), iki kale:
  katı üst direk (dikdörtgen), görsel ön direk, ağ bölgesi. Top üst direğin üstündeki
  bekleme bölgesinde 2 sn'den uzun kalırsa sahaya doğru itilir.
- **Oyuncu (`src/game/entities/Player.ts`):** kafa dairesi + gövde + ayak.
  - Eğrili yatay hareket (yerde/havada ayrı ivme, yavaşlama ve dönüş ivmesi).
  - Zıplama: coyote time, jump buffer, değişken yükseklik, düşerken artan yerçekimi.
  - Şut: ayak kalça etrafında yay çizer (swing → hold → return); savrulma başına tek
    darbe; güç = savrulma fazı (o anki açısal hız) + oyuncunun şut yönündeki hızı; yön =
    temas normalinin açısı (alttan vuruş yükselir, üstten vuruş yere gider); şut tuşu
    tamponu.
  - Kafa vuruşu: fiziksel impuls + oyuncu hızının bir kısmının ek aktarımı.
  - Oyuncular birbirini iter, içinden geçemez; rakibin kafasına basan "yerde" sayılır.
- **Simülasyon (`src/game/GameSim.ts`):** deterministik maç durumu, gol (top çizgiyi
  tamamen geçince), gol sonrası 1,5 sn bekleme ve santra, `snapshot()`, olay listesi
  (`kick`, `header`, `goal`, `crossbarPush`, `kickoff` — ses/efekt fazı için hazır).
- **Girdi:** `KeyTracker` + `KeyboardInputSource` (`KeyboardEvent.code`, iki adım
  arasında basılıp bırakılan tuşu kaçırmayan "latch", odak kaybında tuşları bırakma,
  Space/oklar/F1 için varsayılan davranışı engelleme), `ScriptedInputSource` (test/tekrar).
- **Sahne ve çizim:** `MatchScene` (2 oyuncu), `GrayboxRenderer` (gri şekiller, ayak
  savrulurken açık renk), skor, "GOL!" yazısı, kontrol ipucu. Menüde tıklama/tuş →
  kararma → maç; maçta **Esc** → menü.
- **F1 debug katmanı:** statik ve dinamik collider'lar, üst direk bekleme bölgesi, ağ
  bölgesi, şut vuruş yarıçapı, hız vektörleri, FPS, fizik ms/adım, adım/kare, alt adım
  sayısı, oyuncu zemin/coyote/buffer/şut durumu.
- **Testler:** 16 → **85** test. Yeni: çarpışma geometrisi, çözücü (sekme, dinlenme,
  kütle paylaşımı, momentum, sürtünme→dönüş, yuvarlanma koşulu), tünelleme (1.000.000 px/sn
  duvara, 150.000 px/sn köşelere, 50.000 px/sn 12 px'lik direğe), oyun içinde her yöne
  en yüksek hızla 168 atış × 90 adım, oyuncunun topu duvara/direğe ezmesi, **determinizm**
  (rastgele ama tohumlu girdiyle 600 adım → birebir aynı `snapshot` ve olaylar; tek girdi
  farkının sonucu değiştirdiği duyarlılık testi; 30 Hz / 144 Hz / düzensiz karelerde aynı
  sonuç), gol/kısmi gol/direk üstü, direkte bekleme, itme, coyote, buffer, değişken
  zıplama, şut fazı, koşarak şut, kafa aktarımı, falso, yuvarlanma, klavye.
- **Tarayıcıda doğrulama:** üretim derlemesi headless Chrome'da DevTools protokolüyle
  gerçek klavye olayları gönderilerek oynatıldı: iki oyuncu da gol attı (1–1), F1 ve
  Esc çalışıyor, konsolda hata yok. Fizik adımı ~0,07–0,09 ms.

### Ölçülen his değerleri (headless simülasyon)

| Ölçüm                            | Değer                                |
| -------------------------------- | ------------------------------------ |
| Zıplama tepe / havada kalma      | 159 px / 0,60 sn                     |
| Tek karelik dokunuşla zıplama    | 59 px (değişken yükseklik)           |
| Tam hıza çıkış / duruş           | 0,10 sn / 0,067 sn (11 px)           |
| Durağan şut (top ayakta)         | 1236 px/sn, 27° yukarı               |
| Koşarak şut                      | 1427 px/sn, 26° yukarı               |
| Zıplayarak kafa (top üstte)      | top 1352 px/sn yukarı                |
| 280 px'ten bırakılan top sekmesi | 110 → 37 → 12 → 4 px, ~2 sn'de durur |

### Tasarım kararları

1. **Saha sınırları tek yüzlü doğru parçası** ve köşelerden 1000 px taşıyor: merkez
   duvarın arkasına geçmiş olsa bile ön yüze itilir, yani sınırlar fiilen sonsuz kalın
   yarı-düzlemlerdir. Hızdan bağımsız olarak tünelleme yapısal olarak imkânsız.
2. **Üst direk dikdörtgen + uyarlamalı alt adım:** bir alt adımda en fazla 8 px yol
   (top yarıçapı 22 px), böylece hiçbir merkez direğin içine giremez. 64 alt adım
   sınırıyla ~84.000 px/sn'ye kadar güvenli; top hızı zaten 2000 px/sn ile sınırlı.
3. **Çözüm sırası (her alt adımda):** oyuncu–saha → oyuncu–oyuncu → top–oyuncu (şut,
   kafa) → top–saha (en son: top asla statik geometride kalmaz) → top bir yüzeye
   dayanıyorsa oyuncuyu toptan dışarı it (top duvara ezilemez; oyuncu topun üstüne
   basabilir) → oyuncu–saha.
4. **`penetrationSlop` = 0,01 px:** çözücü bu kadar çakışma bırakır (titreme önleme).
   Testlerin toleransı bu değere bağlı.
5. **Oyuncular dönmez**, kütleleri topun 10 katı: top çarpınca hafifçe sarsılırlar ama
   itilip savrulmazlar (Kaya'nın "Dev Top"u için kütle oranı ayarlanabilir kalıyor).
6. **Şut modeli oyun hissi için yarı fiziksel:** ayağın açısal hızı ease-out (en hızlı
   başta) → top ayaktayken basılan şut tam güçte; geç temas zayıf. Yön, temas normalinin
   yükselme açısından türetilir (alttan/üstten vuruş kuralı korunur), hep ileri.
   Savrulma sırasında vuruş yarıçapına +6 px tolerans.
7. **Kafa aktarımı eşikli:** ek hız aktarımı yalnızca oyuncu topa doğru hareket ederken
   ve yaklaşma hızı ≥ 150 px/sn iken uygulanır; kafada taşınan top kendiliğinden
   hızlanmaz.
8. **Bakış yönü sabit** (P1 sağa, P2 sola) — türün alışılmış davranışı; GAME_DESIGN.md'ye
   eklendi.
9. **Klavye Phaser yerine doğrudan DOM'dan** (`KeyboardEvent.code`): Phaser `keyCode`
   kullanır, sol/sağ Shift'i ayıramaz. "Latch" sayesinde 16 ms'den kısa basışlar da
   kaybolmaz. Arayüz tuşları (F1, Esc) girdi kaydına girmez.
10. **Gol sonrası simülasyon akmaya devam eder** (top ağda seker, oyuncular hareket
    edebilir); bu sürede ikinci gol sayılmaz. Ağır çekim/tekrar sonraki fazlarda.
11. **Geliştirici kısayolu** `?scene=match&debug=1`.
12. **Faz 0 hatası düzeltildi:** `npm run preview` yerelde siyah ekran veriyordu
    (`vite preview`'da `command === 'serve'` olduğu için `base` `/` oluyor, derlenmiş
    dosyalar ise `/kafa-kafaya/` altında). `isPreview` de hesaba katılıyor. CI/Pages
    etkilenmemişti.

### Ayarlanması gerektiğini düşündüğüm değerler

Hepsi `src/config/gameConfig.ts` içinde. İki kişilik gerçek oyun testinde öncelikle
bunlara bakılmalı:

| Değer                                      | Şu an              | Neden                                                                                                                     | Öneri                                  |
| ------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `KICK.baseLift`                            | 0,3 rad            | Yerdeki topa şut ~27° çıkıyor; aşırı düz gelebilir, aşırtma zor.                                                          | Düz geliyorsa 0,4–0,45                 |
| `KICK.maxSpeed` / `playerVelocityTransfer` | 1250 / 0,5         | Koşarak şut ~1430 px/sn; orta sahadan boş kaleye gol mümkün. Savunma yetişemiyorsa fazla.                                 | maxSpeed 1100–1150                     |
| `KICK.hitRadiusBonus`                      | 6 px               | Şutu affedici yapıyor; "mıknatıs gibi uzaktan vuruyor" hissi verirse düşürülmeli.                                         | 3–4 px                                 |
| `KICK.swing/hold/returnSeconds`            | 0,09 / 0,05 / 0,12 | Döngü 0,26 sn → saniyede ~4 şut; şut spam'i baskın olabilir.                                                              | returnSeconds 0,16 veya bekleme süresi |
| `PLAYER.jump.cutMultiplier`                | 0,55               | Tek karelik dokunuş yalnızca 59 px zıplatıyor; hızlı basanlar "zıplamadı" diyebilir.                                      | 0,65 ya da en kısa zıplama süresi      |
| `PLAYER.jump.gravity` ↔ `BALL.gravity`     | 3100 ↔ 1500        | Oyuncu toptan ~2 kat hızlı düşüyor; kafa zamanlaması zorsa fark büyük demektir.                                           | Top 1650–1750                          |
| `PLAYER.move.groundDecel`                  | 6500               | 0,067 sn'de duruş çok keskin; klavyede "titrek" hissedilirse.                                                             | 5000–5500                              |
| `HEADER.velocityBonus`                     | 0,3                | Zıplayarak kafa topu ~1350 px/sn ile tavana yolluyor; tavan sekmeleri çok sık olabilir.                                   | 0,2                                    |
| `PITCH.materials.ground.restitution`       | 0,6                | Top hızlı "ölüyor" (110 → 37 → 12 px); türde top daha canlı olur.                                                         | 0,68–0,72                              |
| `BALL.maxSpin` / `BALL.magnus`             | 35 / 0,015         | Şutlar yalnızca ±5 rad/sn dönüş veriyor (etki hafif); ama kafaya sürtünmeyle yüksek dönüşte top belirgin kavis çizebilir. | maxSpin 20–25                          |
| `PITCH.goal.mouthHeight`                   | 210 px             | Ayaktaki oyuncu (118 px) ağzın %56'sını kapatıyor, zıplayınca tamamını. Savunma kolaysa.                                  | 220–230                                |
| `PITCH.goal.depth`                         | 90 px              | Oyuncu kalenin içine tamamen sığıyor (kafa 72 px); "kaleye park etme" güçlü olabilir.                                     | 70 px veya kural                       |
| `PLAYER.mass`                              | 10                 | En hızlı top duran oyuncuyu ~280 px/sn geri itiyor.                                                                       | 8–14 arası his testi                   |

### Bilinen sorunlar / sınırlamalar

- **Tarayıcılar arası determinizm:** `Math.sin/cos/exp/atan2` son bitlerde JS motorları
  arasında farklı olabilir. Tekrar aynı makinede/tarayıcıda birebir; çevrimiçi
  senkronizasyon gerekirse (kapsam dışı) ele alınmalı.
- Aynı alt adımda iki oyuncu da topa değerse P1 önce işlenir (çok küçük sıra etkisi).
- Oyuncu kendi kalesinin içine tamamen girebiliyor (kaleye park etme kuralı yok).
- Debug katmanı metinleri teknik kısaltmalar; çevrilmedi (geliştirici aracı).
- Maç süresi, altın gol, güç barı ve süper henüz yok (`InputState.super` okunuyor ama
  kullanılmıyor).
- `npm audit` uyarısı (Faz 0'dan) sürüyor.

### Sıradaki faz

**Faz 2** — talimat bekleniyor.

> Faz 1 notu (Faz 2'de çözüldü): maç süresi ve altın gol eklendi.

---

## Faz 2 — Maç kuralları ve oyun döngüsü (2026-11-14)

**Bitti kriteri:** menüden 2 oyunculu maç başlatılıp baştan sona oynanabiliyor, tüm
geçişler sorunsuz ✅ — üretim derlemesi headless Chrome'da gerçek klavye ve fare olaylarıyla
uçtan uca oynatıldı (32 denetim, konsolda hata yok; ayrıntı aşağıda).

### Tamamlananlar

- **Maç durum makinesi (`src/game/rules/MatchFlow.ts`, saf ve deterministik):**
  `kickoff → playing → goalScored → kickoff …` → süre bitince beraberlikte
  `kickoff (uzatma) → goldenGoal → goalScored → matchEnd`, değilse `matchEnd`.
  Geçişler olay olarak döner: `goal`, `kickoff` (diziliş), `playStart` (düdük),
  `goldenGoal`, `matchEnd { winner, reason }`. GameSim her adımda gol algılamasını yapıp
  makineyi ilerletir; `kickoff` olayında oyuncuları ve topu dizer. `GameSim` artık
  `{ rules, skipKickoff }` seçenekleri alır (testler, ileride antrenman/turnuva).
- **Gol algılama:** top kale çizgisini tamamen geçince (Faz 1 kuralı korunuyor); yalnızca
  `playing`/`goldenGoal` durumunda sayılır. Kutlama, santra ve maç sonunda gol yok.
- **Süre:** 90 sn geri sayım, yalnızca oyun akarken işler. Son 10 sn saat kırmızı ve her
  saniye nabız. Saat yukarı yuvarlar ("0:00" yalnızca süre gerçekten bitince).
- **Gol sonrası:** 1 gerçek sn ağır çekim (0,3x), "GOL!" + "Oyuncu 1 attı!", ekran
  sarsıntısı, skor "pop" animasyonu; golden 2 gerçek sn sonra diziliş (kısa kararmayla
  ışınlanma gizlenir), 0,8 sn bekleme, düdük, top ortadan düşer.
- **Altın gol:** süre berabere biterse "ALTIN GOL! · İlk golü atan kazanır", diziliş,
  1,8 sn bekleme, düdük; saatin yerinde "ALTIN GOL" yazar. İlk gol → kutlama → maç sonu.
- **Maç sonu ekranı:** "OYUNCU 2 KAZANDI!" (kazananın renginde), skor satırı, altın golle
  bittiyse "Altın golle"; "Tekrar Oyna" / "Ana Menü". Normal sürede bitince önce "MAÇ
  BİTTİ!" yazısı ve üçlü düdük, 1,4 sn sonra ekran.
- **Duraklatma (Esc / P):** her durumdan (santra, oyun, gol kutlaması/ağır çekim, altın
  gol; maç sonu ekranı açılana kadar). Devam · Yeniden Başlat · Ana Menü. Esc/P ile de
  devam edilir.
- **HUD (`src/ui/MatchHud.ts`):** üstte skor çubuğu — oyuncu isimleri (kimlik rengiyle),
  skorlar, saat; kafaların üstündeki P1/P2 etiketleri aynı renkte; altta kontrol ipucu.
- **Menüler:** ortak `TextMenu` (klavye ↑/↓ veya W/S + Enter/Space, fare üzerine gel +
  tıkla) ve `MenuOverlay` (perde + içeriğe göre boyutlanan panel; uzun başlık sığdırılır).
  Ana menü: **2 Oyuncu** ve **Dil: Türkçe/English** (dil kaydedilir).
- **Ses:** ilk sentezlenmiş ses — hakem düdüğü (Web Audio, titreşimli ton): santrada tek,
  altın golde ikili, maç sonunda üçlü. İlk tuş/tıklamada ses kilidi açılır.
- **i18n:** `format()` (yer tutucular) ve `upper()` (Türkçe büyük harf: i → İ).
- **Geliştirici:** `?duration=N` maç süresi; `?debug=1` iken oyun nesnesi
  `window.__KAFA_GAME__` (tarayıcı testleri için); debug katmanında maç durumu satırı.
- **Testler:** 85 → **121**. Yeni:
  - `MatchFlow.test.ts` (13): santra/düdük, saatin yalnızca oyunda işlemesi, ağır çekimin
    18 adım (= 1 gerçek sn) sürmesi, 2 gerçek sn'de santra, kutlamada saat durması ve ikinci
    gol yok, önde olan kazanır, 90 sn = tam 5400 adım, beraberlik → altın gol (süresiz),
    altın gol → maç sonu (santra yok), son adım golü, son saniye eşitlemesi → altın gol,
    altın gol kapalıyken berabere, maç sonunda durum değişmez, snapshot kopyadır.
  - `ballRules.test.ts` (5): çizgi sınırı 0,001 px hassasiyetle, kısmi geçiş, üst direk
    üstü, yanlış kale.
  - GameSim gol sınır durumları (7): üst direğin ön yüzüne ve alt köşesine çarpıp dönen
    top gol değil; direği sıyırıp/alt yüzüne çarpıp içeri düşen top gol; kısmen geçip geri
    dönen top gol değil; direk üstünden sahaya yuvarlanan top gol değil; en yüksek hızda
    giren top yakalanır; santra/kutlama/maç sonunda gol yok.
  - GameSim maç akışı (3): gerçek kurallarla 90 sn'lik tam maç (olay dizisi ve toplam adım
    sayısı), beraberlik → altın gol → maç sonu, santra ve maç sonunda girdilerin yok
    sayılması.
  - Determinizm testi artık 1200 adım ve gol → kutlama → santra döngüsünü de kapsıyor.
  - `format.test.ts`, `KeyboardInput` (`consumeAny`, `releaseAll`), i18n (`format`, `upper`).
- **Tarayıcıda uçtan uca doğrulama** (üretim derlemesi, `?debug=1&duration=6`, headless
  Chrome + DevTools protokolü; betik depoda değil, gol için top kaleye konuldu): menü
  ↑/↓/Enter → maç; santra → düdük; klavyeyle hareket ve şut; gol → 0,3x ağır çekim
  **971 ms**, santra **1968 ms** sonra; diziliş doğru; Esc duraklatır, duraklatılmışken
  `tick` sabit, P ile devam; ağır çekim sırasında duraklat → menüden Enter ile devam; son
  10 sn kırmızı saat; beraberlik → altın gol → P2 golü → maç sonu ekranı; Tekrar Oyna →
  0–0; Duraklat → Ana Menü; Duraklat → Yeniden Başlat (tween'ler yeniden başlatmadan sonra
  çalışıyor); süre bitince önde olan kazanır; maç sonu → Ana Menü; dil değiştirme; fareyle
  dil, 2 Oyuncu ve duraklatma menüsü.

### Tasarım kararları

1. **Duraklatma durum makinesinin dışında.** Duraklatılmışken sahne döngüyü hiç
   ilerletmez ve tween'leri dondurur; böylece "her durumdan aç, aynı yerden devam et"
   kendiliğinden sağlanır ve simülasyon (gol tekrarı için) duraklatmadan etkilenmez.
2. **Ağır çekim sahnede, kutlama sayacı gerçek sürede.** Sahne kare süresini
   `match.timeScale` (0,3) ile çarpar; simülasyon adımı sabit kalır, yalnızca saniyedeki
   adım sayısı azalır. Kutlama sayacı adım başına `dt / timeScale` ilerler: "1 sn ağır
   çekim, 2 sn sonra santra" gerçek saniyedir ama yine yalnızca adım sayısına bağlıdır
   (determinizm ve tekrar korunur).
3. **"2 sn" golden itibaren toplam süre** (1 sn ağır çekim + 1 sn normal). Simülasyon bu
   sürede akar; oyuncular hareket edebilir ama ikinci gol sayılmaz.
4. **Santra beklemesi** (0,8 sn): oyuncular girdisiz, top ortada tutulur, saat durur;
   düdükle top serbest düşer. Maçın ilk santrası da aynı. Altın golde 1,8 sn (duyuru
   okunsun).
5. **Altın gol başında diziliş yapılır** (oyun kaldığı yerden sürmez): süre bitiminde top
   herhangi bir yerde olabilir; adil ve okunaklı bir başlangıç için santra.
6. **Aynı adımda gol ve süre bitimi → gol geçerli.** Kutlamadan sonra süre bitmişse maç
   sonu/altın gol kararı verilir; süre kalmışsa (ör. 1 adım) santra yapılır ve kalan süre
   oynanır.
7. **Gol kontrolü adım sonunda.** Top 2000 px/sn sınırıyla adımda en fazla ~33 px gider;
   tamamen girip aynı adımda geri çıkması için ≥ 92 px gerekir (ağ derinliği 90, çap 44),
   yani kaçırma imkânsız (testle de doğrulandı).
8. **`BALL.kickoffY` 280 → 320:** santrada bekleyen top "ALTIN GOL!" alt yazısıyla
   çakışıyordu; duyuru yazıları da biraz yukarı alındı (`yRatio` 0,32 → 0,24).
9. **Duraklatma menüsünden çıkışta tüm tuşlar bırakılmış sayılır** (`releaseAll`): menüde
   basılan Enter/↑ oyuncu 2'ye şut/zıplama olarak sızmaz. Bedeli: duraklatma boyunca
   basılı tutulan yön tuşunun yeniden basılması gerekir.
10. **Maç sonunda simülasyon akmaya devam eder** (top seker), oyuncular girdisiz durur;
    sonuç ekranının arkasında canlı bir sahne görünür.
11. **Maç sonu ekranındayken Esc bir şey yapmaz** (yanlışlıkla çıkışı önlemek için);
    seçim menüden yapılır.
12. **Oyuncu kimlik renkleri** (P1 turuncu, P2 mavi) HUD isimlerinde, kafa üstü
    etiketlerde ve kazanan başlığında; gri kutu gövdeler gri kaldı (görseller sonraki
    fazlarda).
13. **Ana menüde "2 Oyuncu" ve "Dil"** var; diğer modlar (Hızlı Maç, Turnuva, Antrenman)
    ilgili fazlarda eklenecek.

### Bilinen sorunlar / sınırlamalar

- **Gol tekrarı yok** (GAME_DESIGN'da "kısa tekrar"); determinizm altyapısı hazır,
  sonraki bir faza bırakıldı.
- **`header` olayı tekrar ediyor:** top oyuncunun kafası ile zemin arasında sıkışıp
  sürüklenirken her alt adımda `header` olayı üretilebiliyor (Faz 1 davranışı). Şimdilik
  etkisi yok; vuruş sesleri eklenirken olaya bekleme süresi konmalı.
- Düdük dışında ses yok (vuruş, direk, kalabalık sonraki fazlarda).
- Duraklatma boyunca basılı tutulan tuş devamdan sonra yeniden basılmalı (karar 9).
- Gol kutlamasında oyuncular topa vurabiliyor; sayılmıyor ama top santradan önce sahada
  dolaşabiliyor (bilinçli: his canlı kalsın).
- Faz 1'den süren: tarayıcılar arası determinizm, `npm audit` uyarısı, kaleye park etme.

### Sıradaki faz

**Faz 3** — talimat bekleniyor.

> Faz 2 notu (Faz 3'te çözüldü): güç barı ve (genel) süper vuruş eklendi; "aynı alt adımda iki
> oyuncu topa değerse P1 önce işlenir" sıra etkisi giderildi (ayrıntı Faz 3'te).

---

## Faz 3 — Yapay zekâ rakip (2026-11-14)

**Bitti kriteri:**

- **Kolay rahat yenilir, Orta dengeli, Zor zorlayıcı ama adil** ✅ — AI vs AI vekil ölçümüyle;
  gerçek oyuncu testi yapılmadı (aşağıya bakın). İki tarafta oynanan maçların ortalamasında Orta
  Kolay'ı %86,5, Zor Orta'yı %83,5, Zor Kolay'ı %94 oranında yeniyor; aynı seviyeler kendi
  aralarında dengede. Zor'un üstünlüğü yalnızca algı ve karar kalitesinden geliyor: 150 ms
  reaksiyon (hızlı bir insan düzeyi), yalnızca ekranda görünen bilgi, aynı fizik ve kurallar.
- **Simülasyonda sıkışma yok** ✅ — 9 eşleşme × 100 = **900 maçta 0 sıkışma olayı** (bağımsız
  gözlemci, 6 tür). Üç farklı tohumla oynanan 900 aynı-seviye maçında da 0.

### Tamamlananlar

- **Yörünge tahmini (`src/game/ai/BallPredictor.ts`):** ayrı bir "hayalet" dünyada (kendi top +
  saha kopyası) topu ~1,5 sn ileri simüle eder. GameSim ile **aynı kod**: top–saha fiziği
  `src/game/ballPhysics.ts`'e taşındı (`collideBallWithPitch`, `applyCrossbarRest`,
  `stepBallAlone`); duvar/tavan/direk sekmeleri, falso ve üst direk kuralı dahil. Test:
  oyuncular dokunmadıkça tahmin GameSim ile **bit bit aynı**. Önceden ayrılmış bir tamponla
  çalışır, tahmin sırasında bellek ayırmaz. Her karede değil, `predictionIntervalMs`
  aralıklarla ya da algılanan topta bir çarpışma (hız sıçraması) görülünce yenilenir.
- **Hareket modelleri (`motion.ts`):** zıplama profili ve alçak sıçrayış yükseklikleri,
  oyuncunun gerçek `Player` koduyla bir hayalet kopyada ölçülür. **Hayalet ayak**
  (`KickSimulator`) "şimdi şut tuşuna basarsam ayak topa değer mi, savrulmanın hangi fazında?"
  sorusunu alt adım çözünürlüğünde, GameSim'deki vuruş testinin aynısıyla yanıtlar.
- **Şut formülü paylaşıldı (`src/game/kick.ts`):** GameSim ve AI'ın şut değerlendirmesi aynı
  `computeKick`'i kullanır. AI şutu "kafasında" dener: top gole mi gidiyor, rakibe mi çarpıyor,
  duvardan sekip kendi kalesine mi dönüyor (2 sn ufuk)?
- **Davranış katmanı (`AiController.ts`):** utility + plan + refleks.
  - **Algı:** top ve rakip `reactionMs` kadar gecikmeli görülür (geçmiş tamponu); kendi bedeni
    gecikmesiz. Tahmin gecikmeli durumdan "şimdi"ye ve ileriye uzatılır (insan da böyle
    kestirir); çarpışmalar ancak gecikmeden sonra fark edilir.
  - **Karar** (`decisionIntervalMs`; bir çarpışma görülünce aralığın 0,4'ü içinde):
    **Savun** (top kaleye gidiyor / top benimle kalem arasında / rakip topa önce ulaşacak),
    **Hücum** (topun arkasına geç, rakip kaleye vur), **Kafa** (havadaki topa kafa planı; zıplama
    anı gerçek zıplama profilinden), **Bekle/Pozisyon al**. Puanlar histerezisle seçilir.
  - **Refleks (her adım):** hedefe yürüme; planlanan anda zıplama (oyuncu yerinde değilse
    iptal); arkada kalan alçak topun üstünden değişken yükseklikte sıçrayış (aşılamıyorsa
    bekleme); şut zamanlaması (hayalet ayak + şut değerlendirmesi); süper (bar dolu, hücumda,
    top rakip kaleye 180–820 px, vuruş ≤ 0,6 sn uzakta; fırsat başına bir kez `superUseRate`
    olasılığıyla).
  - **Savunma kuralları:** rakip topa açıkça önce ulaşacaksa topa koşmaz (aşırtılıp kaleyi boş
    bırakmaz); topa aynı anda ulaşılacaksa temkinli AI rastgele bir sabır süresi boyunca düelloya
    girmez; sahipsiz topa rastgele bir gecikmeyle mutlaka biri gider; kendi kalesine koşarken
    kale tarafındaki topa önden çarpacaksa fren yapar; top kendi üst direğinin üstündeyse kale
    önünde bekler.
- **Yalnızca `InputState`:** AI'ın gördüğü tek şey `observe(sim)` ile üretilen düz bir kopya
  (`worldView.ts`: top konum/hız/dönüş, oyuncu konum/hız/şut evresi/güç barı, maç evresi).
  Test: AI'ın `update` çağrısı simülasyonun snapshot'ını hiç değiştirmez; görünüm bir kopyadır.
- **Zorluklar (`gameConfig.ts` → `AI_PROFILES`)** ve insani rastgelelik. Tüm rastgelelik
  tohumlanabilir `SeededRandom`'dan (mulberry32) gelir: aynı tohum + aynı maç → birebir aynı
  kararlar (test). Oyunda tohum her maç rastgele, `?seed=N` ile sabitlenebilir.

  | Parametre                   | Kolay | Orta | Zor  |
  | --------------------------- | ----- | ---- | ---- |
  | Reaksiyon gecikmesi (ms)    | 330   | 220  | 150  |
  | Reaksiyon sapması (ms, std) | 70    | 45   | 25   |
  | Tahmin hatası (hız oranı)   | 0,20  | 0,10 | 0,04 |
  | Karar aralığı (ms)          | 250   | 150  | 80   |
  | Tahmin yenileme (ms)        | 210   | 130  | 70   |
  | Agresiflik                  | 0,25  | 0,55 | 0,80 |
  | Süper kullanım oranı        | 0,20  | 0,55 | 0,95 |
  | Nişan sapması (px, std)     | 45    | 20   | 8    |
  | Şutta tereddüt olasılığı    | 0,40  | 0,15 | 0,03 |
  | Şut zamanlama hatası (adım) | 2     | 1    | 0,3  |
  | Şut seçiciliği              | 0     | 0,35 | 0,70 |
  | Dalgınlık olasılığı         | 0,15  | 0,05 | 0    |

- **Sıkışma önleme (AI içi):** yön tuşuna basılıyken ilerleyememe (itişme/duvar/köşe), direğin
  ya da rakibin kafasının üstünde durma, topu kafada taşıma ve yavaş topun yanında donup kalma
  algılanır → kısa kaçış (savunmaya dönüyorsa rakibin üstünden atla, değilse çoğunlukla çekil;
  duvar dibinde sahanın ortasına). İtişme sabrı her bölümde rastgele: iki AI aynı adımda kaçıp
  havada yine çarpışmasın.
- **Bağımsız sıkışma gözlemcisi (`StuckMonitor.ts`):** donmuş top (3 sn), oyuncu kilitlenmesi
  (2 sn), sıkışmış oyuncu (2 sn'de < 30 px), direkte kamp (2 sn), kafada taşınan top (3 sn),
  topa kimsenin dokunmaması (10 sn). Dokunuşlar yeni `Ball.touches` sayacıyla izlenir.
- **Güç barı ve genel süper vuruş** (önkoşul; GAME_DESIGN §6): bar zamanla (0,05/sn) ve
  dokunuşla (+0,08, oyuncu başına 0,3 sn bekleme) dolar; doluyken Süper bir sonraki vuruşu
  süper yapar ve barı boşaltır. Süper şut ×1,5 hız ve yarı yükselme açısıyla ("füze"), süper
  kafa en az 1500 px/sn. Karaktere özgü süperler sonraki fazlarda. HUD'da isimlerin altında güç
  barları (doluyken altın; hazırken yanıp söner ve "SÜPER!" yazar), oyuncunun kafasında nabız
  atan halka. Olaylar: `superArmed`; `kick`/`header` olaylarında `super` alanı.
- **Menü:** **CPU'ya Karşı** → **Zorluk seç** (Kolay / Orta / Zor / Geri; Esc ya da Backspace ile
  geri; son seçim kaydedilir) · 2 Oyuncu · Dil. CPU modunda insan P1'dir ve iki tuş takımıyla da
  oynar (`MergedInputSource`); isimler "SEN" / "CPU · ZOR"; Yeniden Başlat kurulumu korur.
- **Geliştirici:** `?cpu=easy|medium|hard` doğrudan CPU maçı, `?cpu1=…` P1 de AI (AI vs AI
  izleme), `?seed=N`. F1 debug katmanında AI'ın tahmin ettiği yörünge, hedef işareti, modu ve o
  anki algı gecikmesi.
- **`scripts/simulate.ts`** (`npm run simulate`): AI vs AI headless maçlar — kazanma oranları,
  skor ve fark dağılımı, gol ortalaması, santradan gole süre, şut/süper sayıları, sıkışma olayları
  (ilk 10'u yer ve zamanla), AI kaçış sayıları, mod payları, süre. Seçenekler: `--p1/--p2`,
  `--matches`, `--seed`, `--matrix` (9 eşleşme), `--json`, `--verbose`, `--max-overtime`. Yeni
  bağımlılık yok: `scripts/run-ts.js`, projedeki Vite'ın modül çalıştırıcısıyla (`runnerImport`)
  TypeScript'i çalıştırır.
- **Testler:** 121 → **171**. Yeni: tahmin = GameSim (bit bit; duvar, tavan, direk), gol girişi;
  PRNG (tohum, dağılım); zıplama/sıçrayış profilleri, hayalet ayak = GameSim şutu, vole
  zamanlaması; AI'ın simülasyonu değiştirmemesi, tohum determinizmi, P1/P2 ayna simetrisi, duran
  topa gidip ileri vurma (iki taraf), kaleye giden topu uzaklaştırma (Orta/Zor), süperi kullanma
  ve kullanmama, direkte kalmama, kilitlenmede kaçış, kısa maçlarda Zor > Kolay ve 0 sıkışma;
  gözlemcinin 6 türü; güç barı ve süper; direk köşesi kuralı; maç kurulumu; girdi birleştirme.
- **Tarayıcıda uçtan uca doğrulama** (üretim derlemesi, headless Chrome + DevTools protokolü;
  betik depoda değil): **24/24 denetim**, konsolda hata yok. Menü → CPU'ya Karşı → zorluk alt
  menüsü, Esc ile geri, Zor ile maç; kurulum, isimler ve zorluğun kaydı; CPU hareket edip topa
  vuruyor (insan beklerken ~3 sn'de gol attı); insan hem D hem → ile yürüyor; dolu barla Sol
  Shift süperi hazırlıyor; F1 aç/kapa; Duraklat → Yeniden Başlat (CPU/Zor korunuyor) → Ana Menü
  → 2 Oyuncu (AI yok); İngilizce alt menü; `?cpu=hard&cpu1=medium&duration=12&seed=7` ile AI vs
  AI maçı altın golle sonuna kadar. **Fizik + AI adımı tarayıcıda 0,04–0,11 ms.**

### Simülasyon sonuçları

Komut: `npm run simulate -- --p1 <a> --p2 <b>` (her eşleşme 100 maç, tohum 1; gerçek kurallar:
90 sn, gol kutlaması, santra, altın gol). Toplam **900 maç, 0 sıkışma olayı**.

**Kazanma oranları** (satır P1, sütun P2; P1 % / P2 % · maç başı gol):

| P1 \ P2   | Kolay           | Orta             | Zor              |
| --------- | --------------- | ---------------- | ---------------- |
| **Kolay** | 53% / 47% · 9,5 | 18% / 82% · 14,4 | 5% / 95% · 14,5  |
| **Orta**  | 91% / 9% · 15,0 | 46% / 54% · 14,1 | 19% / 81% · 11,9 |
| **Zor**   | 93% / 7% · 13,8 | 86% / 14% · 12,0 | 63% / 37% · 8,6  |

Beraberlik yok (eşitlikte altın gol); altın golle biten maç 100'de 2–15.

**En sık skorlar** (P1–P2):

| Eşleşme     | En sık 5 skor                                   |
| ----------- | ----------------------------------------------- |
| Kolay–Kolay | 5–4 (7), 5–7 (5), 6–5 (5), 7–3 (5), 7–4 (5)     |
| Orta–Kolay  | 11–5 (5), 10–6 (4), 13–3 (4), 13–6 (4), 8–7 (4) |
| Orta–Orta   | 8–7 (8), 6–5 (7), 6–8 (7), 7–8 (7), 6–7 (6)     |
| Zor–Orta    | 6–5 (6), 9–5 (6), 7–6 (5), 8–5 (5), 10–4 (4)    |
| Zor–Kolay   | 11–3 (6), 10–3 (5), 11–4 (5), 9–4 (4), 10–2 (3) |
| Zor–Zor     | 5–3 (8), 3–2 (7), 5–4 (7), 4–3 (6), 4–5 (5)     |

**Varsayılan koşu** (`npm run simulate` = Orta vs Orta, 100 maç): P1 46 – P2 54 galibiyet; gol
ortalaması 6,94 – 7,11; fark dağılımı: 1 gol 41 maç, 2 gol 18, 3 gol 16, 4+ gol 25.

| Ölçüm (100 maç)                      | Kolay–Kolay | Orta–Orta   | Zor–Zor     |
| ------------------------------------ | ----------- | ----------- | ----------- |
| Şut tuşu / maç (oyuncu başına)       | 41          | 70          | 76          |
| Süper / maç (oyuncu başına)          | 3,7         | 6,5         | 8,0         |
| Süperle gelen gol payı               | %4,5        | %6,2        | %8,7        |
| Santradan sonraki 4 sn içinde gol    | %18         | %40         | %14         |
| AI kaçış davranışı (toplam)          | 12          | 71          | 43          |
| Zaman payı: kafa / hücum / bekle (%) | 7 / 26 / 40 | 27 / 30 / 8 | 40 / 28 / 7 |
| **Sıkışma olayı**                    | **0**       | **0**       | **0**       |

**Taraf eğilimi:** aynı seviye eşleşmelerinde üç tohumla (1–3) P1 toplam 477/900 = %53 (Kolay
%48,7, Orta %52,7, Zor %57,7). Kalan fark simetrik santra düellosundaki tam eşzamanlı
temaslardan geliyor (bkz. bilinen sorunlar). Simülasyon hızı tek çekirdekte ~0,35–0,7 sn/maç.

### Tasarım kararları

1. **Güç barı ve genel süper bu fazda eklendi:** "süper kullanımı" davranışının önkoşulu.
   Karakterler gelene kadar tek ve genel bir süper (daha hızlı ve düz şut / hızlı kafa).
   Değerler `POWER` ve `SUPER` altında.
2. **Tahmin = gerçek fizik:** top–saha kodu ortak modülde; tahminci GameSim'in top adımını
   oyuncusuz çalıştırır (oyuncular dururken alt adım sayısı bile aynı). Şut formülü de ortak
   (`computeKick`). Zıplama ve şut zamanlaması gerçek `Player` kodunun hayalet kopyasıyla.
3. **Kanonik çerçeve:** AI kendini hep "sol kaleyi savunan, sağa hücum eden" olarak görür; P2
   için x ekseni aynalanır (saha ve fizik simetrik, falso işareti dahil). Test: aynı tohumla
   simetrik santrada P1 ve P2 temasa kadar birbirinin aynası girdiler üretir.
4. **Gecikme algıda, kontrol gecikmesiz:** gecikmeli top durumu fizikle "şimdi"ye uzatılır;
   düzgün hareket iyi izlenir, beklenmedik olaylar (şut, sekme) ancak gecikmeden sonra fark
   edilir. Tahmin hatası hıza orantılı bir gürültüdür: çarpışmada yeniden çekilir, her
   yenilemede 0,6 ile küçülür (top yaklaştıkça kestirim iyileşir; ilk yanılgı yine yanlış yöne
   adım attırır).
5. **Karar sıklığı + olay tepkisi:** kararlar periyodik; bir çarpışma görülünce sıradaki karar
   aralığın 0,4'üne öne alınır. Zorluk farkı korunur, olaylara tepki makul kalır.
6. **Dalgınlık kararı erteler (0,15 sn), atlatmaz; art arda iki kez olmaz.** İlk sürümde kararı
   atlatıyordu: Kolay'da üç dalgınlık üst üste gelince top kaleye giderken plan 0,6 sn hiç
   güncellenmiyordu.
7. **Savunma derinliği:** rakip topa açıkça önce ulaşacaksa hücum cezası avantajla ölçeklenir
   (0,5 sn avantajda tamamı). İlk sürümde Kolay santrada ortaya koşup her seferinde aynı
   aşırtmayla gol yiyordu (Orta–Kolay 19–4). Düello cezası + rastgele sabır ve sahipsiz top
   bonusu (rakip yaklaşınca iptal olmaz), iki temkinli AI'ın topun başında beklemesini önler.
8. **Kendi kalesine gol önleme** (ilk ölçümde Zor'un yediği gollerin %43'ü kendi dokunuşuydu):
   (a) seçici AI şutu kafasında dener, sekip kendi kalesine dönecekse acilken bile vurmaz;
   (b) zıplama anında planlanan noktada değilse kafa iptal; (c) kale tarafındaki topa önden
   çarpacaksa fren; (d) alçak sıçrayış, topun önümüzdeki 14 adımdaki en yüksek noktasına göre.
9. **Top–oyuncu çözüm sırası adil hâle getirildi** (fizik değişikliği): eskiden hep P1 önce
   çözülüyordu ve Zor–Zor'da P1 %66 kazanıyordu. Önce adım paritesi denendi; santra
   zamanlamasıyla hizalanıp bu kez P2 ~%55 kazandı. Şimdi sırayı adım numarasının çarpımsal
   karıştırılmış bir biti seçiyor: deterministik, periyodik yapıyla hizalanmaz.
10. **Üst direk bekleme bölgesi sahaya 22 px taştı:** top direğin **ön köşesinde** dengede
    kalabiliyordu (merkez bölgenin 2 px dışında, yuvarlanma direnci topu durduruyordu) ve itme
    kuralı devreye girmiyordu. Simülasyon bunu yakaladı.
11. **Gözlemci AI'dan bağımsız:** sıkışma raporu AI'ın kendi kaçış sayaçlarına değil, dışarıdan
    simülasyon durumuna bakar. Eşikler `AI.monitor`'da.
12. **CPU modunda insan hep P1 (solda), AI P2.** İnsan iki tuş takımını da kullanabilir; tek
    oyunculu oyunda hangi elle oynanacağı serbest.
13. **Simülasyon betiği bağımlılıksız:** `tsx` eklemek yerine Vite'ın `runnerImport` API'si
    (Vite 6.1+). `scripts/` artık `tsconfig` ve lint kapsamında.
14. **Menü yerleşimi:** 3 öğe ve alt menü başlığı sığsın diye öğeler biraz yukarı
    (`MENU.items.yRatio` 0,6 → 0,53, aralık 62 → 58), ipucu çimenin üstüne (0,8 → 0,85).

### Ayarlanması gerektiğini düşündüğüm değerler

Zorluk ayarı yalnızca AI'ların birbirine karşı oynamasıyla yapıldı; **gerçek oyuncularla deneme
şart**. Önce bunlara bakılmalı:

| Değer                                             | Şu an       | Neden                                                                                                     | Öneri             |
| ------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------- | ----------------- |
| `AI_PROFILES.easy.reactionMs` / `kickTimingError` | 330 ms / 2  | Yeni başlayan biri Kolay'ı zor buluyorsa.                                                                 | 380 ms / 3        |
| `AI_PROFILES.hard.reactionMs`                     | 150 ms      | Hızlı insan düzeyi; deneyimli oyunculara az gelirse. 130 ms'nin altı "insanüstü" hissettirebilir.         | 130–150           |
| `AI_PROFILES.medium` (tümü)                       | tabloda     | "Dengeli" ortalama bir oyuncuya göre: oyuncu Orta'yı %60+ yeniyorsa reaksiyon 200 ms, tahmin hatası 0,08. | oyun testine göre |
| `POWER.chargePerSecond` / `chargePerTouch`        | 0,05 / 0,08 | AI maç başı 4–8 süper kullanıyor (12–20 sn'de bir); süper sıradanlaşabilir.                               | 0,035 / 0,06      |
| `SUPER.kickSpeedMultiplier`                       | 1,5         | Süper şut ~1900 px/sn; karşılamak zor, ama süperle gol payı yalnızca %5–9.                                | 1,4–1,6           |
| `KICK.maxSpeed`, `PITCH.goal.mouthHeight`         | 1250 / 210  | Gol sayısı yüksek (AI vs AI maç başı 9–15; Orta–Orta'da gollerin %40'ı santradan sonraki 4 sn'de).        | Faz 1 tablosu     |
| `AI.utility.contestPenalty`                       | 0,5         | Temkinli AI santrada düelloya girmiyor; insan bunu "pasif" bulursa.                                       | 0,3–0,4           |

Fizik değerleri değişirse zorluklar yeniden ölçülmeli: `npm run simulate -- --matrix`.

### Bilinen sorunlar / sınırlamalar

- **Zorluk hissi gerçek oyuncuyla ölçülmedi.** "Kolay rahat yenilir / Orta dengeli / Zor
  zorlayıcı ama adil" sonucu, AI vs AI vekil ölçümüne ve parametrelerin insan sınırları içinde
  kalmasına dayanıyor.
- **Kalan taraf eğilimi:** simetrik santrada iki oyuncu topa aynı alt adımda değerse önce
  çözülen avantajlı; sıra artık deterministik ama karışık. Zor–Zor'da (çok düşük gürültü, hep
  aynı santra) P1 ~%58. İnsan–AI maçında tam eşzamanlı temas pratikte olmaz. Kökten çözüm:
  eşzamanlı temasları iki sırayla çözüp ortalamak.
- **Gol sayısı yüksek** (bkz. ayar tablosu): oyuncu hızı (430 px/sn) şut hızına göre düşük,
  orta sahadan aşırtma çoğu zaman gol. AI buna göre ayarlandı; fizik dengesi değişirse AI'ın
  yeniden ayarlanması gerekir.
- AI rakibin gelecekteki hareketini yalnızca doğrusal kestirir; çalım/aldatma yapmaz; çift
  zıplama ve güçlendiricileri bilmez (henüz yoklar).
- Genel süper tek tip; karakter süperleri gelince AI'ın süper kararı karaktere göre
  genişletilmeli (ör. Gökkuşağı için yüksek, Alev Topu için düz şut fırsatı).
- Debug katmanının metin kutusu HUD'daki P1 adının üstüne biniyor (geliştirici aracı).
- `header` olayının tekrarı (Faz 2) sürüyor; güç barı dolumu bekleme süresiyle korunuyor.
- Faz 1'den süren: tarayıcılar arası determinizm, `npm audit` uyarısı, kaleye park etme.

### Sıradaki faz

**Faz 4** — tamamlandı (aşağıda).

> Faz 3 notları (Faz 4'te çözüldü): AI çift zıplamayı ve güçlendiricileri biliyor; süper kararı
> karakterin süper tipine göre.

---

## Faz 4 — Karakterler, süper şutlar ve güçlendiriciler (2026-11-14)

**Bitti kriteri:**

- **Her karakter farklı hissettiriyor** ✅ — 10 karakterin istatistikleri fiziksel olarak ayrışıyor
  (hız 408–452 px/sn, zıplama tepe yüksekliği ~140–180 px, şut gücü ×0,86–1,16 ve daha düz
  vuruş, kafa yarıçapı 31,5–40,5 px), her birinin kendine ait bir süper şutu ve renk paleti var.
  Testle: hızlı karakter daha hızlı koşar, büyük kafalı karakterin çarpışma dairesi büyük.
- **Süper şutlar heyecanlı ama haksız değil** ✅ — AI vs AI vekil ölçümüyle: 10 tipin her birinde
  süper atışların golle bitme oranı **%6,6–10,1** (ilk taramada Gökkuşağı %32'ydi), tüm
  gollerin %6,9'u süperle. Her süperin karşı oyunu var ve testlerle doğrulandı (aktif vuruş
  temiz karşılıktır; aşağıdaki tablo). Gerçek oyuncu testi yapılmadı.
- **Hiçbir karakter %60'tan fazla kazanmıyor** ✅ — 45 eşleşme × 80 maç (iki tarafta 40'ar) =
  **3600 maçta genel kazanma %47–58**. Eşleşme bazında bazı belirgin karşı karakter ilişkileri
  kaldı (en yüksek Toprak–Şimşek %80; bkz. bilinen sorunlar).

### Tamamlananlar

- **10 özgün karakter (`src/game/characters.ts`):** isim, palet (kafa/gövde/ayak/vurgu),
  istatistikler (hız, zıplama, şut gücü, kafa boyutu; 1–5, her karakterde toplam **14**) ve
  kendine ait süper tipi. İstatistik → fizik değeri `CHARACTER_STATS`'ta; 3 puan Faz 1–3
  değerleriyle aynı (`NEUTRAL_LOADOUT`: karakter verilmeyen simülasyonlar ve eski testler).
  `Player` artık bir donanım (`Loadout`) taşır: en yüksek hız + ivme ölçeği, zıplama hızı (büyük
  kafa biraz daha alçak zıplar), şut gücü, kafa yarıçapı, kütle.
- **Güç barı:** dokunuş ve zamanla dolar (`POWER`, Faz 3 değerleri korundu); doluyken Süper bir
  sonraki şutu/kafayı karakterin süperi yapar. HUD'da süper hazırken barın ucunda tipin adı
  ("ATEŞ TOPU!") yanıp söner; oyuncu karakterin vurgu renginde parlar.
- **10 süper şut tipi (`src/game/superEffects.ts`, değerler `SUPER_SHOTS`):** Ateş Topu, Buz,
  Zikzak, Işınlanma, Dev Top, Kasırga (istenen 6) + Gökkuşağı, Mıknatıs, Serap, Sarsıntı (tasarım
  belgesindeki diğer 4 karakter için). Etki durumu topun kendisinde (`superType`, sahip, süre,
  yön, ışınlanma evresi, yarıçap çarpanı); top–saha fiziği gibi **GameSim ve AI tahmincisi aynı
  kodu** kullanır — süper top, oyunculara değmediği sürece tahminde de gerçekte de bit bit aynı
  yolu izler (7 yörünge tipi için testle). Oyuncuya değince oluşan etkiler (donma, savrulma, itme,
  zıplama kilidi, yanılsamalar) yalnızca GameSim'de. Etki süre dolunca, sahaya değince (tipine
  göre) ya da bir oyuncuya değince biter; santra temizler.
- **Ortak karşı oyun:** süper topa **aktif vurmak** (savrulan ayakla şut ya da topa doğru hareket
  ederken kafa) her zaman temizdir. Buz ve Ateş yalnızca pasif karşılamayı cezalandırır. Donmadan
  sonra 1 sn bağışıklık (art arda donma kilidi yok).

  | Süper     | Atış | Gol | Golle biten % | Rakibe etki       | Karşı oyun                                      |
  | --------- | ---- | --- | ------------- | ----------------- | ----------------------------------------------- |
  | Ateş Topu | 4446 | 300 | 6,7           | geri savrulma     | önüne geç, şut/kafa                             |
  | Buz       | 4521 | 299 | 6,6           | 1,5 sn donma      | şut/kafa, üstünden atla, sekmesini bekle        |
  | Zikzak    | 4464 | 299 | 6,7           | —                 | yavaş; dalganın dibinde karşıla                 |
  | Işınlanma | 4183 | 422 | 10,1          | içinden geçer     | kale çizgisine yakın dur (önünde yavaş belirir) |
  | Dev Top   | 4062 | 299 | 7,4           | kaleciyi iter     | tam girmesi zor; erken kes                      |
  | Kasırga   | 4483 | 297 | 6,6           | geri itme         | zıpla (havada %40), aktif vur                   |
  | Gökkuşağı | 4250 | 361 | 8,5           | —                 | yavaş ve uzun; düştüğü yerde karşıla            |
  | Mıknatıs  | 4511 | 319 | 7,1           | —                 | çekim zayıf; kalenin önünde dur                 |
  | Serap     | 4529 | 348 | 7,7           | AI'ı yanıltabilir | sahteler değince/kaleye yaklaşınca söner        |
  | Sarsıntı  | 4435 | 324 | 7,3           | 1 sn zıplayamama  | alçak top: gövdeyle kes                         |

  (Son denge taraması, 3600 maç. "Gol": süperle atılan son vuruştan gelen gol.)

- **Güçlendiriciler (`src/game/powerups.ts`, değerler `POWERUPS`):** oyun akarken 12–18 sn'de bir
  (tohumlu) sahanın üst yarısında süzülen balon; kapalı biçimli salınım (AI da aynı fonksiyonla
  kestirir), 10 sn sonra söner. Top çarpınca son dokunan kazanır (henüz kimse dokunmadıysa top
  içinden geçer). Büyük Kafa ×1,4, Rakibi Küçült ×0,65, Hız ×1,28, Rakip Kalesini Büyüt +70 px
  (kale ağzı dikdörtgenleri yerinde güncellenir, gol kuralı yeni yüksekliği kullanır), Rakibi
  Dondur 1,8 sn, Çift Zıplama (havada bir ek zıplama). Süreler 8 sn (Dondur 1,8, Çift Zıplama 10).
  HUD: kazanan oyuncunun tarafında skor çubuğunun altında vektör ikon + geri sayım halkası; son
  2 sn yanıp söner. Kazanılınca oyuncunun üstünde adı yükselir. AI vs AI maçta ~1,5 güçlendirici.
- **Yapay zekâ (AiController):**
  - Beden her adım görünümden: kendi/rakip kafa boyutu ve hızı (karakter × güçlendiriciler),
    karaktere özgü zıplama profili (gerçek `Player` koduyla ölçülür, hıza göre önbellekli), şut
    gücü (hayalet ayak ve şut değerlendirmesi), büyüyen kaleler (tahmin sahası güncellenir).
  - Süper kullanımı tipe göre (`AI.super.byType`) ve seçici AI süperli şutu normal şutla
    karşılaştırır; rakibe çarpacak Buz/Ateş/Kasırga şutu "bloke" değil orta puan alır.
  - Kaçınma: kalesine gitmeyen tehlikeli süper topa şutla karşılayamıyorsa değmez (zıplar ya da
    çekilir; `superDodge` Kolay 0,25 · Orta 0,6 · Zor 0,9). Rakip süper hazırken daha derinde
    bekler. Işınlanan topa plan yapmaz; zıplama kilidinde kafa/sıçrayış planlamaz; donmuş rakibe
    karşı hücuma geçer.
  - Serap: üç toptan birini izler, gerçeği `mirageReadChance` olasılıkla seçer; yanılsamalar
    sönünce gerçek topa döner (test).
  - Güçlendiriciler: balonu patlatacak şuta bonus (`powerUpAwareness` Kolay 0 · Orta 0,6 · Zor 1);
    çift zıplamayı kafa planında kullanır.
- **Karakter seçim ekranı (`CharacterSelectScene`):** 5×2 kart (karakter çizimi kafa puanıyla
  büyür), iki panel (isim, 5 bölmeli istatistik çubukları, süper adı + etkisi + karşı oyunu). 2
  oyuncuda iki imleç aynı anda (P1 A/D/W/S + Space, P2 oklar + Enter); CPU'ya karşı insan iki tuş
  takımıyla da seçer, CPU kalan karakterlerden rastgele birini alır; fare; Esc hazırı geri alır
  ya da ana menüye döner. Son seçimler kaydedilir. Akış: Menü → (Zorluk) → Seçim → Maç;
  "Yeniden Başlat" kurulumu (karakterler dahil) korur.
- **Görseller (hâlâ basit vektör):** oyuncular karakter paletiyle ve o anki kafa boyutuyla; süper
  topta tip rengi halka + iz (Gökkuşağı renkli iz, Kasırga dönen yaylar, Buz/Ateş renk örtüsü),
  ışınlanan top görünmez (yerinde silik pırıltı, belirince halka patlaması), Serap yanılsamaları
  gerçek topla aynı görünür, donmuş oyuncuda buz örtüsü, zıplama kilidinde toz çizgisi, balon
  (ikonlu, sönmeden önce yanıp söner), büyüyen kale yeniden çizilir. Süper atılınca kısa parlama
  ve tipin adı, Sarsıntıda ekran sarsıntısı. Sesler (Web Audio): vuruş, süper, balon patlaması,
  donma.
- **Geliştirici:** `?c1=…&c2=…` karakterler; `?seed=N` artık güçlendiricileri ve Serap'ı da
  sabitler. `GameSim({ loadouts, seed, powerUps })`.
- **`scripts/simulate.ts`:** `--c1/--c2` karakterler; `--characters` 45 eşleşmenin iki tarafta da
  oynandığı denge taraması (karakter tablosu, eşleşme matrisi, süper tipi istatistikleri);
  `--jobs N` alt süreçlerle paralel (aynı tohum → aynı sonuç), `--difficulty`. Tüm modlarda süper
  tipine göre atış/gol, rakibe etki ve güçlendirici sayıları.
- **Sıkışma gözlemcisi** karakter ve donma farkında (kafa yarıçapı oyuncudan; donmuş oyuncunun
  tuşları yok sayılır).
- **Testler: 171 → 221.** Yeni: karakter tanımları ve istatistik dengesi, istatistiklerin
  simülasyondaki etkisi; 10 süper tipinin davranışı ve karşı oyunları (Ateş savrulması ve şutla
  temiz karşılık, Buz donması/tuşların yok sayılması/bağışıklık, Zikzak dalgası, Işınlanmanın
  oyuncunun içinden geçip kalenin önünde yavaşlaması ve kaleye yakınken ışınlanmaması, Dev Top
  büyümesi, Kasırga itmesi (havada az), Gökkuşağı yayı, Mıknatıs çekimi, Serap yanılsamaları ve
  determinizmi, Sarsıntı); süper top tahmini = GameSim (7 tip, bit bit); balon zamanlaması, konum
  sınırları, patlama kuralı, determinizm, 6 güçlendirici etkisi ve süreleri; AI'ın tipe uygun
  süper kullanımı ve koşul yokken harcamaması, Buz'dan kaçınma, Serap yanılgısı ve geri dönüş,
  uç karakter eşleşmelerinde 0 sıkışma; kurulumda karakterler.
- **Tarayıcıda uçtan uca doğrulama** (üretim derlemesi, headless Chrome + DevTools protokolü;
  betik depoda değil): **18/18 denetim**, konsolda hata yok. Menü → CPU'ya Karşı → Zor → seçim
  ekranında D, D, S ile imleç → Space → maç (seçilen karakter + CPU'nun farklı seçimi kurulumda);
  insan hareket edip şut çekiyor; dolu barla Sol Shift süperi hazırlıyor; 5 AI vs AI maçında 8
  süper tipi ekranda yakalandı (Zikzak ve Kasırga yalnızca örnekleme anlarına denk gelmedi),
  balon belirdi; güçlendirici etkileri (büyük kafa × küçült, büyüyen kale, donma) ve HUD ikonları
  ekran görüntüsünde; 2 oyuncu seçiminde iki imleç, Esc ile hazırı geri alma, iki tarafın seçimi
  maça geçiyor. Fizik + AI adımı tarayıcıda ~0,06–0,2 ms.

### Denge tablosu

Komut: `npm run simulate -- --characters --matches 40 --jobs 11` (Orta vs Orta; her eşleşme iki
tarafta 40'ar = 80 maç; toplam **3600 maç**, tohum 1; gerçek kurallar + güçlendiriciler).
Beraberlik yok; P1 tarafı %49,9 (taraf eğilimi yok); maç başı 13,2 gol; sıkışma olayı 3/3600.

| Karakter | Süper     | Hız/Zıp/Şut/Kafa | Kazanma | Gol (at–ye) / maç | Süperle gol % | Güçlendirici / maç |
| -------- | --------- | ---------------- | ------- | ----------------- | ------------- | ------------------ |
| Ayaz     | Buz       | 3/4/3/4          | **58%** | 7,00–6,38         | 6%            | 0,67               |
| Şimşek   | Zikzak    | 5/3/4/2          | 52%     | 6,80–6,81         | 6%            | 0,81               |
| Pamuk    | Serap     | 4/4/2/4          | 51%     | 6,44–6,38         | 8%            | 0,75               |
| Bora     | Kasırga   | 4/4/3/3          | 50%     | 6,63–6,65         | 6%            | 0,71               |
| Kor      | Ateş Topu | 3/3/5/3          | 49%     | 6,58–6,63         | 6%            | 0,77               |
| Toprak   | Sarsıntı  | 2/4/5/3          | 49%     | 7,09–7,17         | 6%            | 0,62               |
| Kaya     | Dev Top   | 2/3/4/5          | 49%     | 6,74–6,77         | 6%            | 0,74               |
| Yay      | Gökkuşağı | 3/5/3/3          | 48%     | 6,05–6,16         | 8%            | 0,79               |
| Sis      | Işınlanma | 4/5/2/3          | 47%     | 6,34–6,50         | 9%            | 0,78               |
| Demir    | Mıknatıs  | 3/3/4/4          | **47%** | 6,46–6,69         | 7%            | 0,68               |

**Eşleşme matrisi** (satırdaki karakterin kazanma %, iki taraf birlikte, 80 maç; ±~5,6 puan
standart hata):

|            | Kor | Ayaz | Şimşek | Sis | Kaya | Bora | Yay | Demir | Pamuk | Toprak |
| ---------- | --- | ---- | ------ | --- | ---- | ---- | --- | ----- | ----- | ------ |
| **Kor**    | —   | 45   | 34     | 50  | 50   | 59   | 59  | 49    | 38    | 63     |
| **Ayaz**   | 55  | —    | 51     | 50  | 63   | 55   | 63  | 59    | 64    | 65     |
| **Şimşek** | 66  | 49   | —      | 54  | 50   | 61   | 57  | 49    | 60    | 20     |
| **Sis**    | 50  | 50   | 46     | —   | 26   | 50   | 53  | 55    | 53    | 44     |
| **Kaya**   | 50  | 38   | 50     | 74  | —    | 57   | 46  | 50    | 38    | 35     |
| **Bora**   | 41  | 45   | 39     | 50  | 43   | —    | 49  | 63    | 48    | 75     |
| **Yay**    | 41  | 38   | 43     | 48  | 54   | 51   | —   | 54    | 55    | 48     |
| **Demir**  | 51  | 41   | 51     | 45  | 50   | 38   | 46  | —     | 43    | 56     |
| **Pamuk**  | 63  | 36   | 40     | 48  | 63   | 53   | 45  | 57    | —     | 51     |
| **Toprak** | 38  | 35   | 80     | 56  | 65   | 25   | 53  | 44    | 49    | —      |

**Denge süreci** (her tur 1350 maç, eşleşme başına 30; son tur 3600):

| Tur   | Değişiklik                                                                                       | Aralık     | Bulgu                                                                                |
| ----- | ------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------ |
| v0    | İlk değerler                                                                                     | %38–62     | Gökkuşağı atışlarının %32'si gol; zıplama puanı baskın, şut gücü değersiz            |
| v1    | Gökkuşağı hedefi/hızı; zıplama yelpazesi dar, şut yelpazesi geniş                                | %39–63     | Regresyon: hız +7,5, kafa +4,7, zıplama +1,7 puan/şut puanı                          |
| v2    | **Güçlü şut daha düz** (açı / güç); hız ve kafa yelpazesi dar                                    | %28–61     | Şut gücü değer kazandı; Ayaz üç turdur +12 artık                                     |
| v3    | Kafa yelpazesi geniş, zıplama cezası yarım; Buz hızı ve süresi                                   | %41–65     | Kafa boyutu çok hassas (Kaya %28 → %56)                                              |
| deney | Ayaz ↔ Demir süper takası                                                                        | —          | **Güç Buz'da:** Buz'u alan Demir %47 → %63; 30 maçta 191 Buz atışının 96'sı dondurdu |
| v4    | Buz yalnızca havadan doğrudan çarpınca dondurur; Gökkuşağı direk köşesine çarpıyordu (test)      | %40–63     | Ayaz hâlâ %63: AI kalecisi topu gövdesiyle karşılayıp donuyor                        |
| v5    | **Aktif kafa da temiz karşılık**; Buz ×0,9; Gökkuşağı kalenin önüne; Sis 4/5/2/3                 | %43–59     | Ayaz düzeldi; Gökkuşağı hâlâ %22                                                     |
| v6–7  | Gökkuşağı kalenin 180 px önüne iner (sekince söner); Serap süresi; sıkışma gözlemcisi düzeltmesi | %44–60     | Tüm süperler %6–10 bandında; sıkışma 0                                               |
| son   | Buz etki süresi 1,0 sn; Serap yayılımı 0,26 rad                                                  | **%47–58** | 3600 maç                                                                             |

**Zorluk matrisi** (nötr oyuncular, güçlendiricilerle; her hücre 50 maç; Faz 3'te 100 maçtı):

| P1 \ P2   | Kolay            | Orta             | Zor              |
| --------- | ---------------- | ---------------- | ---------------- |
| **Kolay** | 60% / 40% · 9,5  | 20% / 80% · 13,8 | 10% / 90% · 13,7 |
| **Orta**  | 86% / 14% · 13,1 | 46% / 54% · 13,3 | 28% / 72% · 10,8 |
| **Zor**   | 94% / 6% · 13,5  | 76% / 24% · 11,1 | 46% / 54% · 6,5  |

450 maçta 0 sıkışma. Zorluk sıralaması korunuyor.

### Tasarım kararları

1. **10 süper tipi, her karaktere kendi süperi:** istenen 6 tip + tasarım belgesindeki 4 karakterin
   süperleri (Gökkuşağı, Mıknatıs, Serap, Sarsıntı). Bora'nın "Hortum"u istenen ada uyularak
   **Kasırga** oldu.
2. **Etki topun durumunda, kod ortak:** süper etkiler `Ball` alanları + `superEffects.ts`
   fonksiyonları (`integrate` içinde ivmeler/süre, saha temasında bitiş). Tahminci aynı kodu
   koştuğu için AI süper topları da "okuyabiliyor"; ayrı bir yaklaşık model yok.
3. **Aktif vuruş = temiz karşılık:** önce yalnızca şut temizdi; simülasyon AI kalecisinin Buz'u
   kafa/gövdeyle karşılayıp donduğunu ve takip golü yediğini gösterdi (Buz'lu karakter hangisiyse
   +16 puan). Topa doğru hareket ederken kafa vurmak da artık temiz; ceza pasif karşılamaya.
   İnsan için de sezgisel: "topa sen vur".
4. **Buz donma süresi 1,5 sn sabit (istenen); denge diğer parametrelerle:** yalnızca havadan
   doğrudan çarpma, ilk sekmede sönme, ×0,9 hız, 1,0 sn etki süresi, 1 sn bağışıklık.
5. **Güçlü şut daha düz:** şut gücü yükselme açısını böler. Yalnız hız çarpanıyla şut gücü 5 olan
   karakterler hep alt sıradaydı (top kalenin üstünden gidiyordu).
6. **Gökkuşağı kalenin önüne iner:** doğrudan kale ağzını hedefleyen dik yay hem çok etkiliydi
   (%22–32) hem de hedef yükseltilince direğin ön köşesine çarpıyordu (test yakaladı). Şimdi kalenin
   180 px önüne iner, sekince normal top olur: kaleciye gerçek bir karşılama şansı.
7. **Serap yanılsamaları gerçek topla birebir aynı görünür;** AI da yanılabilir (adil): ekranda
   ayırt edilemeyen bilgiyi AI'a vermek hile olurdu.
8. **Işınlanma kaleye çok yakından atılırsa ışınlanmaz** ve top kale çizgisinden en az 250 px önde
   belirir: kale çizgisinde duran kaleci her zaman bir şans bulur.
9. **Güçlendirici HUD'u kazanan oyuncunun tarafında:** "Rakibi Küçült" ikonu da onu kazananın
   altında; etkilenen oyuncunun görünüşü (küçük kafa, buz örtüsü) ise sahada belli.
10. **Simülasyon tohumu ayrı:** GameSim artık tohumlu (balonlar, Serap). Sahnede maç başında bir
    kez seçilir; AI tohumlarından türetilir, `?seed=` hepsini sabitler. Paralel simülasyon görev
    sırasından bağımsız tohum kullanır (aynı komut → aynı sonuç).
11. **Kafa merkezi yüksekliği sabit:** kafa boyutu değişince ayakta duruş yüksekliği değişmez
    (yalnızca kafa dairesi büyür/küçülür); AI ve gözlemcinin duruş varsayımları bozulmaz.
12. **Performans:** `Ball.radius` sık okunduğu için alan (ölçek değişince güncellenir); AI adımı
    Faz 3'e göre ~%10 daha pahalı (karakter, süper ve balon farkındalığı).

### Ayarlanması gerektiğini düşündüğüm değerler

Denge yalnızca AI vs AI ile ölçüldü; **gerçek oyuncularla deneme şart**. Önce bunlara bakılmalı:

| Değer                                         | Şu an         | Neden                                                                                     | Öneri                    |
| --------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------- | ------------------------ |
| `SUPER_SHOTS.ice` (etki süresi, hız)          | 1,0 sn / ×0,9 | Ayaz hâlâ en üstte (%58). İnsan Buz'a karşı daha iyi tepki verebilir ya da daha kötü.     | oyun testine göre 0,8 sn |
| `SUPER_SHOTS.teleport.exitBeforeGoalPx`       | 250           | En yüksek dönüşüm (%10). İnsan kaleci için belirme anı sürpriz olabilir.                  | 280–300                  |
| `SUPER_SHOTS.rainbow.targetInsetPx`           | 180           | AI için dengeli; insanlar yüksek topu daha iyi okursa Gökkuşağı zayıf kalabilir.          | 120–180                  |
| `CHARACTER_STATS.headRadius`                  | 31,5–40,5     | Denge en çok kafa boyutuna duyarlı (Kaya %28 ↔ %56 tek turda).                            | dikkatli, ±0,5 px adım   |
| `POWERUPS.spawnIntervalMin/Max` / ömür        | 12–18 / 10 sn | Maç başına ~5–6 balon, ~1,5'i patlıyor; insanlar balonu daha çok hedeflerse etkisi artar. | oyun testine göre        |
| `POWERUPS.durations.freezeOpponent`           | 1,8 sn        | Buz (1,5 sn) ile birleşince uzun gelebilir.                                               | 1,5                      |
| `AI_PROFILES.*.superDodge / mirageReadChance` | tabloda       | Zor AI'ın Buz'dan kaçınması (%90) insan gözünde "fazla bilgili" görünebilir.              | 0,75–0,9                 |

Denge değerleri değişirse yeniden ölç: `npm run simulate -- --characters --matches 40 --jobs 10`.

### Bilinen sorunlar / sınırlamalar

- **Denge ve "farklı hissettirme" gerçek oyuncuyla ölçülmedi;** sonuçlar AI vs AI vekil ölçümüne
  dayanıyor. AI karakterlerin güçlü yanlarını bir insan kadar iyi kullanmayabilir.
- **Eşleşme bazında karşı karakterler:** genel kazanma %47–58 ama bazı eşleşmeler 80 maçta
  belirgin: Toprak–Şimşek %80, Bora–Toprak %75, Kaya–Sis %74, Kor–Şimşek %34. (İstatistik hatası
  ~±5,6 puan; bunlar gürültü değil.) Taş-kâğıt-makas etkisi bir ölçüde istenir ama %75+ fazla;
  bir sonraki ayar turunda bu üç eşleşmenin nedeni incelenmeli (ör. Sarsıntının zıplama kilidi
  küçük kafalı, kafaya dayalı Şimşek'e karşı çok etkili olabilir).
- Ayaz (Buz) altı turdur en üstte; şu an %58 (sınırın altında ama en yakın).
- Karakter tarama simülasyonunda 3600 maçta 3 sıkışma olayı (tür ayrıntısı karakter modunda
  basılmıyor); zorluk matrisinde ve testlerdeki uç eşleşmelerde 0.
- CPU'nun karakter seçimi rastgele (`Math.random`, yalnızca arayüz); maç determinizmini etkilemez.
- Karakter seçim ekranı küçük ekran/dokunmatik için düzenlenmedi (Faz 6+ mobil).
- Faz 3'ten süren: tarayıcılar arası determinizm, `npm audit` uyarısı, kaleye park etme, debug
  metin kutusunun HUD'a binmesi.

### Sıradaki faz

**Faz 5** — tamamlandı (aşağıda).

> Faz 4 notu (Faz 5'te çözüldü): görseller artık basit vektör şekiller değil; `header` olayının
> tekrarı ses/efektte en kısa aralıkla süzülüyor.

---

## Faz 5 — Görsel kalite ve ses ("juice") (2026-11-15)

**Bitti kriteri:**

- **Mağaza kalitesinde görünüyor ve duyuluyor** ✅ (kendi değerlendirmem; gerçek oyuncu/mağaza
  incelemesi yapılmadı) — gri kutular yerine kodla çizilmiş özgün karakterler (canlı yüz
  ifadeleriyle), alacakaranlıkta ışıklandırılmış animasyonlu stadyum, her süper şuta özel efekt,
  hit-stop/sarsıntı/zoom, tutarlı arayüz; Web Audio ile sentezlenen efektler, kalabalık ve
  prosedürel müzik. Harici dosya yok: tüm dokular Canvas 2D ile, tüm sesler Web Audio ile.
- **Düşük güçlü cihazda 60 FPS** ✅ (benzetimle) — gol + süper + balon stres senaryosunda, en
  yüksek kalitede, CPU **6 kat yavaşlatılmışken** kare başına JS işi ortalama **4,8 ms**, p99
  **7,9 ms** (bütçe 16,7 ms). Ayrıca uyarlamalı kalite: kare süresi 2,5 sn boyunca bütçeyi aşarsa
  efektler kademe kademe azalır; düşük güçlü cihaz sezgisi (≤ 4 çekirdek ya da ≤ 4 GB bellek)
  kenar yumuşatmayı kapatır ve bir kademe aşağıdan başlar. Gerçek düşük güçlü bir telefonda
  ölçülmedi (bkz. bilinen sorunlar).

### Tamamlananlar

**Görsel**

- **Karakterler (`src/art/looks.ts`, `characterArt.ts`, `faceDraw.ts`, `ui/CharacterRig.ts`):** her
  karakterin kendi cilt tonu, saç modeli ve aksesuarı — Kor alev saç + ter bandı, Ayaz örgü bere
  - perçem, Şimşek yıldırım ibiği + alında gözlük, Sis kapüşon + göze düşen perçem, Kaya düz kesim
  - gür sakal, Bora rüzgârda savrulan saç + uçuşan kurdele, Yay tepe topuzu + sallanan tüy, Demir
    yana taranmış saç + burma bıyık, Pamuk bulut gibi kabarık saç + yıldız toka, Toprak boncuklu
    örgüler. Saç/aksesuarlar SVG yol verisi (kafa yarıçapı 100 birim) olarak tanımlı ve `Path2D` ile
    bir kez dokuya çiziliyor (gradyan, kontur). Kafa: gölgelendirilmiş cilt, kulak, burun; forma
    (şerit, yaka, rozet, şort), krampon.
- **Canlı yüz:** iki göz (3/4 görünüm: uzak göz daralmış), göz bebekleri topu takip eder, rastgele
  aralıklarla göz kırpma (arada çift kırpma), karakterine özgü kaş eğimi/kalınlığı ve ağız.
  **İfadeler** (öncelik sırasıyla): donmuş (iri gözler, takırdayan dişler, titreme), şaşkın (süper
  etkisi ya da sert top çarpması), **sevinç** (gol atınca ^^ gözler, kocaman gülüş, zıplama),
  **üzüntü** (gol yiyince düşük kaşlar, aşağı bakış, ter damlası), efor (şut/zıplama: sıkılmış
  dişler), süper hazırken sırıtma. Maç sonunda kazanan sevinçli, kaybeden üzgün kalır. HUD
  portreleri sahadaki oyuncunun yüzünü canlı taklit eder.
- **Animasyonlar (`fx/BodyAnimator.ts`):** yay tabanlı squash & stretch — zıplamada esneme, inişte
  düşüş hızıyla basılma, havada hızla uzama; koşuda adım sallanması ve adım basılması; hıza göre
  öne eğilme; şut savrulmasında geriye yaslanma + ayağın çizdiği yayda beyaz "swoosh"; ayakkabı
  ayak açısıyla döner; iniş tozu, hızlı koşuda adım tozu.
- **Stadyum (`art/stadiumArt.ts`, `ui/StadiumView.ts`):** alacakaranlık gökyüzü (gradyan, ufukta
  güneş parıltısı, soluk yıldızlar), iki katmanlı **parallax bulutlar** (farklı hız/ölçek), iki
  ışık kulesi (lamba ızgarası, titreyen parlama, ışık hüzmeleri), çatılı iki katlı tribün (uzak
  sıralar puslu), **takım renklerinde kalabalık** (6 sıra × 8 bölüm; boşta kıpırdar, tehlikeli
  atakta heyecanlanır, **golde golcünün tarafı ayağa kalkıp kollarını kaldırır ve zıplar**,
  fotoğraf flaşları), kayan LED panolar (golde "GOL!" yanıp söner), kaçış noktasına yakınsayan
  **çizgili çim** ve saha çizgileri, vinyet.
- **Kale ağı (`fx/NetSim.ts`, `ui/GoalView.ts`):** kenarlarından sabit yay ağı (ayrık dalga
  denklemi); topun çarptığı yerden dalga yayılır ve söner, içeride hareket eden top ağı iter, direk
  çarpması ağı sarsar. Duran ağ önceden çizilmiş dokudur (her karede çizim maliyeti yok).
- **Top (`ui/BallView.ts`):** dönen desen + dönmeyen ışık/gölge, hıza göre uzama ve çarpmada yay
  ile basılma, **yüksekliğe göre küçülüp solan gölge**, hızlı topta beyaz **hız izi**.
- **Efektler — nesne havuzu (`fx/ParticlePool.ts`, `ui/ParticleLayer.ts`):** sabit kapasiteli,
  dizi yapılı havuz; oyun sırasında bellek ayrılmaz (doluyken en eski parçacık geri dönüştürülür).
  İki havuz (normal/toplamalı), tek doku atlası (12 kare) → birkaç çizim çağrısı. 28 ön ayar:
  toz, çim, kıvılcım, kafa yıldızları, direk kıvılcımı, **konfeti** (kaleden fışkırma + tepeden
  yağmur), balon parçaları ve pırıltı, havai fişek ve **her süper şuta özel**: Ateş (alev + duman +
  patlama), Buz (kar taneleri + buz kırıkları + buz bloğu), Zikzak (titreyen şimşek çizgisi +
  kıvılcım), Işınlanma (mor girdap + belirmede halka), Dev Top (toz + kaya parçaları + sarsıntı),
  Kasırga (dönen yaylar + yapraklar), Gökkuşağı (altı renkli şerit + yıldızlar), Mıknatıs (kaleye
  doğru nabız atan alan çizgileri), Serap (pembe pırıltı, sönen yanılsamada duman), Sarsıntı (toz
  bulutu + kaya). Atışta tipin renginde şok halkası ve ekran parlaması. Vuruş flaşı ve halkalar da
  tween'siz bir sprite havuzunda.
- **Oyun hissi (`fx/feel.ts`):** sert vuruşta **hit-stop 40–55 ms** (hızla artar), süper ve golde
  60 ms — simülasyon adımları değişmez, yalnızca döngüye süre akmaz (determinizm korunur);
  **travma modeli ekran sarsıntısı** (kare ile ölçek; vuruş, direk, süper, iniş, Sarsıntı, gol);
  gol anında kaleye doğru **%10 kamera zoom'u** (odak ekranda sabit, kenarda boşluk görünmez);
  vuruşta temas noktasında yıldız flaşı, sert vuruşta hafif ekran parlaması. Sarsıntı ve zoom
  yalnızca dünya katmanına uygulanır; HUD sabit kalır.
- **Arayüz stili (`art/uiArt.ts`):** tüm paneller ve butonlar aynı dilde — yuvarlak köşe, yumuşak
  gölge, dikey gradyan, üstte iç parlama, ince kenar (kodla dokuya çizilir, önbellekli); başlıklarda
  altın gradyan. **HUD:** gölgeli skor tabelası, canlı portreler, skor kutuları (değişimde eski
  rakam yukarı kayar, yenisi sekerek iner, kutu parlar), saat hapı (son saniyeler kırmızı nabız,
  altın golde altın hap), parıltılı güç barları (süper hazırken karakter renginde nabız + süper adı),
  sprite rozetli güçlendirici geri sayımları, dönen ışınlı "GOL!" afişi + alt yazı hapı, ipucu
  hapı. Menü butonları, duraklatma/maç sonu panelleri, karakter seçimi (kartlarda canlı küçük
  karakterler; panellerde fareyi gözleriyle izleyen, hazır olunca sevinen büyük karakter), ana
  menü (canlı stadyum, biri topu kafasında sektiren iki karakter), yükleme ekranı aynı stilde.

**Ses (`src/audio`)**

- **Motor (`AudioEngine.ts`):** tek AudioContext; veri yolları efekt → ana, kalabalık → efekt,
  müzik → ana; kırpılmayı önleyen sıkıştırıcı; beyaz ve pembe gürültü tamponları; aynı anda en
  fazla 28 ses; sekme gizlenince bağlam askıya alınır.
- **Efektler (`Sfx.ts`):** şut (güç arttıkça daha yüksek perde, daha uzun ve parlak; sert vuruşta
  "vınn"), kafa ("bonk"), gövde teması, direk (uyumsuz kısmi tonlarla metalik **"dang"**), zemin
  sekmesi, duvar, ağ ("fışş"), zıplama (çift zıplamada parlak), iniş, düdük, balon + güçlendirici
  arpeji (türe göre perde), donma, süper hazır, **her süper tipine özel ses** (Ateş kükreme, Buz
  kristal pırıltı, Zikzak elektrik, Işınlanma "vuup", Dev Top gümbürtü, Kasırga rüzgâr, Gökkuşağı
  arp glissandosu, Mıknatıs uğultu, Serap ayrışan tonlar, Sarsıntı alt bas), menü gezinme/seçim/
  geri, son saniye tıkları, gol kornası. Sık sesler (sekme, iniş, kafa) en kısa aralıkla süzülür.
- **Kalabalık (`Crowd.ts`, `crowdMood.ts`):** pembe gürültüden süzülmüş sürekli uğultu (iki LFO ile
  dalgalanır); **atak tehlikesi** (topun kaleye uzaklığı, kaleye doğru hızı, yüksekliği — saf,
  testli fonksiyon) yükseldikçe uğultu parlaklaşır ve "kükreme" katmanı açılır; golde tezahürat
  patlaması (kükreme + alkış + ıslıklar); direkte "ooo".
- **Müzik (`Music.ts`, `musicPatterns.ts`):** ileriye bakan zamanlayıcıyla (AudioContext saati)
  prosedürel, döngüsel iki parça — menü (100 BPM, Do majör, I–vi–IV–V, pad + arpej + melodi) ve maç
  (128 BPM, La minör, enerjik davul + senkoplu bas + akor darbeleri). Melodi tohumlu ve dizinin
  içinde; 8 ölçüde bir trampet dolgusu; arpej/melodiye yankı. Parça geçişinde sönme, golde müzik
  kısılır.
- **Ayarlar:** Ana ses / Efektler / Müzik (%10 adım; ←/→ değiştir, Enter/tıklama döngü), ana
  menüde ve **duraklatma menüsünde**; değişiklik anında duyulur ve `localStorage`'a kaydedilir.
- **Autoplay kuralı:** AudioContext ilk tuş/tıklama/dokunuşta oluşturulur ve açılır; o ana kadar
  tüm çalma çağrıları sessizce yok sayılır; istenen müzik kilit açılınca başlar.

**Simülasyon (ses/efekt olayları; fizik değişmedi)**

- Yeni olaylar: `jump` (çift zıplama dahil), `land` (düşüş hızıyla), `ballImpact` (zemin/duvar/
  tavan/direk, yaklaşma hızı, temas noktası; adım başına en sert çarpma) ve `ballTouch` (pasif
  temas). Eşikler `SIM_EVENTS`'te. Determinizm testi aynen geçiyor; `npm run simulate` 0 sıkışma.

**Performans**

- İlk ölçümde profil, aktif sürenin ~%70'inin Phaser Graphics'in her karede şekilleri yeniden
  üçgenlemesine gittiğini gösterdi (`fillCircle`/yay her daireyi ~100 noktayla örnekliyor). Çözüm:
  yüz parçaları yarıçapa göre 6–24 noktalı çokgenlerle (`ui/shapes.ts`); statik çizimler (direkler,
  etiketler, portre halkaları, ikonlar, rozetler, duran ağ) doku ya da basit dikdörtgen; top izi
  sprite; büyük duyuru ve yükselen yazılar maç başında önceden oluşturulup yeniden kullanılıyor.
- **Uyarlamalı kalite (`QualityGovernor`):** 3 kademe; düşük kademede parçacık kapasitesi ve sayısı,
  bulut/ışık hüzmesi/parlama/vinyet ve kalabalık kıpırtısı azalır. Öğrenilen kademe oturum boyunca
  hatırlanır. `?quality=low|medium|high` ile sabitlenir.
- **Testler: 221 → 264.** Yeni: his olayları (zıplama/iniş/çift zıplama, direk ve zemin çarpması,
  pasif temas, determinizm); parçacık havuzu (hareket, sürükleme, kapasite, geri dönüşüm, yoğun
  dizi, sınır küçültme); ağ dalgası (yerellik, yayılma, sönme, sınır, kararlılık); yay ve üstel
  yaklaşma; squash & stretch, koşu, eğilme, donma; yüz ifadesi önceliği, süreli/kalıcı ifadeler,
  göz kırpma, bakış; hit-stop, sarsıntı, kamera zoom'u, kalite yöneticisi, düşük güçlü cihaz;
  ses ayarları (adım, döngü, kayıt); müzik desenleri (akorlar, geçerli notalar, döngü
  determinizmi, dizi içi notalar, tempo); kalabalık tehlikesi (yakınlık, hız, simetri, yükseklik).

### Tarayıcıda doğrulama

Üretim derlemesi, headless Chrome 157 + DevTools protokolü (betikler depoda değil).

- **Uçtan uca akış: 18/18** — menü → Ses Ayarları (← ile %70, kaydedildi) → CPU'ya Karşı → zorluk →
  seçim → maç; insan hareketi; Esc ile duraklatma → duraklatmadan Ses Ayarları → geri → devam;
  gol; süre bitimi → maç sonu ekranı (kazanan sevinçli, kaybeden üzgün) → Ana Menü → 2 Oyuncu →
  iki tarafın seçimi → maç (AI yok); konsolda hata yok.
- **Ses: 8/8** — her veri yoluna AnalyserNode bağlanıp RMS ölçüldü (sesler `--mute-audio` ile
  hoparlöre gitmedi): etkileşimden önce bağlam yok, ilk tuşla açılıyor; menü müziği (RMS 0,053) ve
  kalabalık (0,027) çalıyor; 28 efekt sesinin hepsi ses üretiyor (0,02–0,26); güçlü şut zayıftan
  yüksek (0,14 → 0,26); gol tezahüratı uğultunun ~4 katı; müzik %0 → müzik veri yolu kısıldı ve
  kaydedildi.
- **Görsel:** ana menü, seçim, maç, gol anı (ışınlı GOL!, konfeti, ayağa kalkan kalabalık, zoom),
  10 süper şutun her biri, donma/büyük kafa/süper parlaması/balon/HUD rozetleri, duraklatma, ses
  ayarları ve maç sonu ekran görüntüleriyle incelendi.

### Performans ölçümleri

AI vs AI (Zor–Zor), **en yüksek kalite sabit**, stres senaryosu (2,5 sn'de bir gol ya da süper,
balonlar), 20 sn. "Kare işi": Phaser güncelleme + çizim gönderimi (ana iş parçacığı, JS). GPU:
masaüstü (ANGLE D3D11). CPU yavaşlatma: DevTools `Emulation.setCPUThrottlingRate`.

| CPU yavaşlatma | Kare işi ort. | p95    | p99    | En kötü | > 20 ms kare | En çok parçacık |
| -------------- | ------------- | ------ | ------ | ------- | ------------ | --------------- |
| 1×             | 0,82 ms       | 1,2 ms | 1,4 ms | 4,3 ms  | 0 / 3601     | 323             |
| 4×             | 3,04 ms       | 4,1 ms | 5,1 ms | 25,4 ms | 1 / 3598     | 331             |
| 6×             | 4,82 ms       | 6,7 ms | 7,9 ms | 33,9 ms | 1 / 3389     | 308             |

İlk ölçüm (optimizasyondan önce, 4×, debug katmanı açıkken, stres yok): ortalama 16,6 ms, p95
23,9 ms — bütçenin sınırındaydı. Yazılım GPU'su (SwiftShader, tamamen CPU ile piksel boyama) en
kötü durum: JS işi ~1,4–1,8 ms ama piksel doldurma nedeniyle ~20–24 FPS; kalite yöneticisi burada
kaliteyi kendiliğinden en düşük kademeye indirdi (beklenen davranış). Arka planı tamamen kaldırınca
bile 39 FPS'te kalması, tavanın SwiftShader'ın kendisi olduğunu gösteriyor.

### Tasarım kararları

1. **Dokular Canvas 2D ile, bir kez:** Phaser Graphics'in `generateTexture`'ı gradyan çizemediği için
   tüm sanat (gradyanlar, gölgeler, `Path2D` SVG yolları) canvas dokularına çiziliyor. Kalabalık ve
   LED panolar takım renklerine/dile bağlı olduğundan sahne açılışında üretiliyor; geri kalanı
   yükleme ekranında, kareler arasına bölünerek (çubuk ilerler, tarayıcı donmaz).
2. **Saç/aksesuar SVG yolu olarak:** şekil verisi sihirli sayı kuralına takılmadan okunabilir
   kalıyor ve tasarım ayarı kolay; canlı değişen tek şey yüz.
3. **Yüz her karede çiziliyor (Graphics), gövde parçaları sprite:** gözler topu izliyor, ifadeler
   ve göz kırpma sürekli değişiyor. Maliyet, düşük segmentli şekillerle sınırlandı.
4. **Tek dünya kabı:** sarsıntı ve zoom yalnızca dünyaya; HUD, duraklatma ve yazılar sabit.
   Arka plan ekrandan 48 px taşar; zoom ≥ 1 ve odak ekran içinde olduğu sürece kenarda boşluk
   görünmez (testli).
5. **Hit-stop döngü süresini keser, adımları değil:** girdiler adım başına okunduğu için
   determinizm ve tekrar sistemi etkilenmez.
6. **Parçacıklar kendi havuzumuzda:** Phaser'ın parçacık sistemi yerine dizi yapılı, testli bir
   havuz + önceden kurulmuş Image'lar. Oyun sırasında nesne oluşturulmuyor; kapasite kaliteye göre.
7. **His olayları simülasyonda:** direk mi, ağ mı, zemin mi — en doğru bilgi çözücüde. Olaylar
   oyun durumunu değiştirmiyor, snapshot'a girmiyor.
8. **Kalabalık efekt ayarına bağlı:** "Efektler" kısılınca kalabalık da kısılır; müzik ayrı.
9. **Müzik prosedürel ama deterministik:** melodi ölçü numarasından tohumlanır; döngü her 8 ölçüde
   aynen tekrarlar (dinleyici bir "parça" duyar, rastgele nota yağmuru değil).
10. **Debug modunda ses kancası:** `?debug=1` iken `window.__KAFA_AUDIO__` (motor, efektler,
    kalabalık, müzik) — tarayıcı testleri ses üretimini ölçebilsin.
11. **Ana menüde alt menüden dönüşte** açan öğe seçili gelir (Ses Ayarları'ndan Esc → Ses Ayarları).

### Ayarlanması gerektiğini düşündüğüm değerler

Hepsi `src/config/gameConfig.ts` içinde; gerçek oyuncu ve gerçek cihazlarla denenmeli:

| Değer                                  | Şu an            | Neden                                                                 | Öneri             |
| -------------------------------------- | ---------------- | --------------------------------------------------------------------- | ----------------- |
| `JUICE.hitStop.hardHitSpeed` / `minMs` | 1150 / 40 ms     | Çok sık tetiklenirse oyun "takılıyor" hissi verebilir.                | 1250 / 35 ms      |
| `JUICE.shake.goal` / `maxOffsetPx`     | 0,75 / 16 px     | Gol sarsıntısı bazı oyunculara fazla gelebilir (hareket hassasiyeti). | 0,6 / 12 px       |
| `JUICE.zoom.goal`                      | 1,1              | Zoom kalenin önündeki oyuncuyu kırpabiliyor.                          | 1,06–1,1          |
| `AUDIO.defaults.music` / `musicGain`   | 0,6 / 0,42       | Maç müziği uzun maçlarda yorucu olabilir.                             | oyun testine göre |
| `CROWD.danger.rangePx`                 | 460              | Kalabalık her kale önü atağında coşuyor; seçicilik az olabilir.       | 360–420           |
| `QUALITY.downgradeFrameMs` / sustain   | 19,5 ms / 2,5 sn | 50 Hz ekranlarda (20 ms kare) kalite gereksiz düşebilir.              | 21 ms             |
| `ANIM.squash.landImpulse`              | 6,5              | Ağır inişte basılma abartılı görünebilir.                             | 5–6               |

### Bilinen sorunlar / sınırlamalar

- **Gerçek düşük güçlü cihazda ölçülmedi.** 60 FPS sonucu, masaüstü GPU + CPU yavaşlatma
  benzetimine ve uyarlamalı kaliteye dayanıyor; zayıf bir mobil GPU'da piksel doldurma (tam ekran
  katmanlar) darboğaz olabilir — kalite yöneticisi bunu kademe düşürerek karşılamalı.
- **"Mağaza kalitesi" öznel:** değerlendirme yalnızca ekran görüntüleri ve ses ölçümleriyle
  yapıldı; gerçek oyuncu testi ve dinleme testi yapılmadı (sesler headless'ta hoparlöre gitmedi).
- Düşük güçlü cihazda (≤ 4 çekirdek ya da ≤ 4 GB bellek) WebGL kenar yumuşatma kapalı: yüz
  çizgilerinde hafif tırtık görülebilir. `deviceMemory` bazı tarayıcılarda (Firefox, Safari) yok.
- Headless ekran görüntüsü alınırken sayfa takıldığı için tween'ler ileri sarılıyor (yalnızca test
  yapaylığı; oyunda değil).
- Karakter seçimi ve menü her açılışta kalabalık dokularını yeniden üretiyor (~1–2 kare, açılış
  anında); dil değişince LED pano metni yeniden üretiliyor.
- Faz 4'ten süren: eşleşme bazında karşı karakterler, tarayıcılar arası determinizm, `npm audit`
  uyarısı, kaleye park etme, debug metin kutusunun HUD'a binmesi.

### Sıradaki faz

**Faz 6** — tamamlandı (aşağıda).

> Faz 5 notu (Faz 6'da çözüldü): karakter seçim ekranı ve menüler dokunmatik ve gamepad ile
> kullanılabiliyor.

---

## Faz 6 — Modlar, menüler ve platform desteği (2026-11-18)

**Bitti kriteri:**

- **Tüm modlar baştan sona oynanabiliyor** ✅ — üretim derlemesi headless Chrome'da gerçek klavye
  olaylarıyla uçtan uca oynatıldı: ana menü → ayarlar → yardım → Hızlı Maç (maç sonu, istatistik) →
  2 Oyuncu → antrenman → turnuva (3 maç → şampiyonluk → kupa ekranı → kilit açıldı) → yeni turnuva
  (menüden "Turnuvaya Devam" → elenme) → bozuk kayıtla açılış. **36/36 denetim**, konsolda hata yok.
- **Telefonda ve gamepad ile sorunsuz** ✅ (benzetimle) — dokunmatik: Chrome'un dokunma benzetimiyle
  844×390 telefon ekranında çoklu dokunuş, parmak kaydırma, süper/duraklat butonları, kaplamaya
  dokunma, dikey ekran uyarısı + otomatik duraklatma, antrenman butonları; gamepad: sayfaya
  enjekte edilen sahte Gamepad API ile 2 kol (menü gezinme, iki imleç, iki oyuncunun hareketi/şutu/
  zıplaması, Start, kol çıkarılınca duraklama). **24/24 denetim.** PWA: kurulabilirlik ve sunucu
  tamamen kapatıldıktan sonra çevrimdışı açılış + maç, **8/8 denetim**. Gerçek bir telefonda ve gerçek
  bir gamepad'le denenmedi (bkz. bilinen sorunlar).

### Tamamlananlar

**Menüler**

- **Ana menü (`MenuScene`, `ui/DemoMatch.ts`):** arka planda canlı **AI vs AI demo maçı** — gerçek
  GameSim + iki Zor yapay zekâ + maç çizimi (gol, süper, balon, konfeti, kalabalık hepsi gerçek),
  süresiz, efekt sesi yok (yalnızca demo maçın atak tehlikesini izleyen kalabalık uğultusu). Hafif
  koyu perdenin üstünde altın başlık ve altı buton: **Hızlı Maç · 2 Oyuncu · Turnuva** (süren turnuva
  varsa **Turnuvaya Devam**) **· Antrenman · Ayarlar · Nasıl Oynanır**. Sol altta istatistik hapı.
- **Ayarlar** (aynı sahnede, demo maçın üstünde): Zorluk · Maç süresi (60/90/120 sn) · Ana ses ·
  Efektler · Müzik · Ekran sarsıntısı · Dil (TR/EN) · Kontrol Şeması · Geri. ←/→ ya da Enter/tıklama
  değiştirir; her değişiklik hemen kaydedilir. Dil değişince menü ayarlar açık yeniden kurulur; sahne
  dışı DOM metinleri (dikey ekran uyarısı, tam ekran düğmesi) dil dinleyicisiyle güncellenir.
- **Nasıl Oynanır (`ui/HelpPanel.ts`):** 4 sayfa — maç kuralları ve modlar (maç süresi ayardan),
  güç barı + 10 süperin adı/karakteri/kısa açıklaması (süper renginde), 6 güçlendirici (ikonlu,
  süreler yapılandırmadan, dile göre ondalık biçim), kontrol tablosu (klavye P1/P2, gamepad,
  dokunmatik; bağlı kol sayısı). ←/→ (LB/RB) sayfa, Esc/B/Enter ya da "Geri" kapatır; oklar ve Geri
  dokunmatik/fareyle de çalışır. Ayarlar → Kontrol Şeması doğrudan son sayfayı açar.
- **Karakter seçimi:** daha sıkı yerleşim (5×2 kart + iki büyük panel). Yeni:
  - **Süper şut önizlemesi (`ui/SuperPreview.ts`):** karakterin süperli şutu (dolu bar → Süper →
    ayağın önündeki topa durarak şut) **gerçek GameSim'de** rakipsiz, balonsuz, sabit tohumla bir kez
    oynatılıp kaydedilir ve panelde küçük sahada döngüde izletilir: süper renginde iz, Işınlanmanın
    kaybolması, Serap yanılsamaları, Dev Top büyümesi oyundakinin aynısı. Karakter başına ~110 adım,
    önbellekli. P2 panelinde ayna.
  - **Kilitli karakterler:** karartılmış kart + kodla çizilmiş kilit + "KİLİTLİ"; onaylanınca "olmaz"
    sesi ve kilidin sarsılması. Panelde "Turnuva kazanarak aç".
  - **Modlar:** Hızlı Maç (P2 paneli "CPU · zorluk"; CPU kalan açık karakterlerden seçer), 2 Oyuncu
    (iki imleç aynı anda — klavye ve/veya iki kol), antrenman (P2 "KUKLA"), turnuva (P2 paneli
    **ödül**: sıradaki kilitli karakter, tur zorluklarıyla; hepsi açıksa "KUPA").
  - Sol üstte **Geri** butonu (dokunmatik/fare), gamepad gezinme (1. kol P1, 2. kol P2; tek insanlı
    modlarda iki kol da P1).

**Modlar**

- **Turnuva (`game/tournament.ts`, `TournamentScene`, `TrophyScene`):** saf ve deterministik eleme
  mantığı (aynı tohum → aynı kura ve sonuçlar), düz veri olarak kaydedilir.
  - Kura: slot 0 oyuncu, 7 rakip tohumla karıştırılır; **sıradaki kilitli karakter slot 7'de
    "patron"** — kendi maçlarını hep kazanır, oyuncu onunla finalde karşılaşır.
  - **Giderek zorlaşan AI:** ayarlardaki zorluğun sırasına tur kayması (−1, 0, +1): Orta → Kolay, Orta,
    Zor; Zor → Orta, Zor, Zor; Kolay → Kolay, Kolay, Orta.
  - Oyuncunun maçı sahnede oynanır (90 sn ya da ayardaki süre, beraberlikte altın gol); aynı turun
    diğer maçlarının sonucu tohumla üretilir (kazanan 2–7 gol, kaybeden daha az).
  - **Eleme ağacı ekranı:** 8 kutu iki yanda, yarı final ve final ortaya doğru, ortada kupa; kutularda
    canlı portre, isim, skor; kazananların yolu altın, elenenler soluk, oyuncunun kutuları kendi
    renginde çerçeveli; yeni sonuçlar belirerek gelir. Maça Başla / Ana Menü (ilerleme kayıtlı) /
    Turnuvadan Çekil. Kaybedince damga gibi "ELENDİN" + Yeni Turnuva.
  - **Kupa ekranı:** kodla çizilmiş altın kupa (SVG yolları → `Path2D`), sevinçle zıplayan şampiyon,
    "YENİ KARAKTER AÇILDI!" kartı (açılan karakter canlı), konfeti yağmuru, havai fişek, tezahürat
    eden kalabalık, korna. Yeni Turnuva / Ana Menü.
  - Maç sonucu ve turnuva ilerlemesi **maç biter bitmez** kaydedilir (sonuç ekranında sayfa kapansa
    da kaybolmaz); turnuva maçında yeniden başlatma yok, sonuç ekranında yalnızca "Devam".
- **Antrenman:** süresiz (saatte "ANTRENMAN"), AI yok, başlangıçta **rakipsiz** — GameSim'e
  `solo` kipi: P2 girdisi yok sayılır, topa, P1'e, yanılsamalara ve Kasırga'ya değmez, çizilmez.
  **T** (Back / duraklatma menüsü) pasif **kukla rakibi** getirir/kaldırır. **R** (Y / dokunmatik)
  topu santranın üstüne sıfırlar (süper etkisi ve yanılsamalar silinir), **F** (LB / dokunmatik)
  süper barını doldurur. İstatistiğe girmez.
- **Hızlı Maç / 2 Oyuncu:** zorluk ve maç süresi ayarlardan. Eski "CPU'ya Karşı → zorluk" alt menüsü
  kaldırıldı (zorluk Ayarlar'da; eski kayıt anahtarından geçiş yapılır).

**Platform**

- **Sanal tuşlar (`input/virtualKeys.ts`):** gamepad ve dokunmatik butonlar klavye olayı biçiminde
  ayrı bir veri yoluna "keydown/keyup" yollar; her `KeyTracker` hem `window`'u hem bu yolu dinler.
  Menüler, seçim ekranı, duraklatma ve oyun girdisi hiç değişmeden üç kaynağı da okur (latch,
  `releaseAll`, kenar tetikleme aynen). Tuş eşlemesi artık eylem başına birden çok kod alır (X/B şut,
  RB/RT süper).
- **Gamepad (`input/Gamepads.ts`):** her karenin başında (`PRE_STEP`) `navigator.getGamepads()`
  yoklanır; standart düzen; yönler d-pad VEYA sol çubuk (histerezisli ölü bölge: 0,5'te basılı,
  0,35'in altında bırakılmış — titreşim yok); analog tetikler eşikle. **En fazla 2 kol**, bağlanma
  sırasıyla slot 1 → P1, slot 2 → P2; çıkarılan kolun basılı düğmeleri bırakılır, diğer kolun slotu
  değişmez; maç sırasında kol çıkarsa maç duraklar ve "Gamepad bağlantısı koptu" yazar.
- **Dokunmatik (`ui/TouchControls.ts`, `input/touchLayout.ts`):** dokunmatik algılanınca (kaba
  işaretçi ya da ilk dokunuş; maç sırasında algılansa da butonlar belirir) yarı saydam daire butonlar:
  sol ◀ ▶, sağ Zıpla / Şut / Süper (bar doluyken altın renkte nabız), sol üst duraklat (antrenmanda
  topu sıfırla ve barı doldur). Girdi Phaser işaretçilerinden değil **tuvalin ham dokunma
  olaylarından**: her olayda tüm etkin parmaklar yeniden değerlendirilir, her parmak tolerans içindeki
  en yakın butonu basar → çoklu dokunuş, parmak kaydırma ve kaybolan `touchend`'e dayanıklılık.
  Duraklatma/maç sonu kaplamasında butonlar gizlenir; kaplama butonları dokunmayla çalışır. Kontrol
  ipucu hapı dokunmatikte gösterilmez.
- **Dikey ekran:** dokunmatik cihazda dikey yönde tam ekran "Oynamak için telefonu yan çevir" uyarısı
  (dönen telefon simgesi, CSS) ve maç kendiliğinden duraklar; dikeyde devam edilemez.
- **Tam ekran düğmesi** (sağ üst, DOM): Fullscreen API (+ webkit), ardından yatay yön kilidi denenir;
  desteklenmiyorsa gizli; masaüstünde maç sırasında gizlenir.
- **Döndürme düzeltmesi:** Phaser'ın ölçek yöneticisi telefon döndürülünce bir adım geride
  kalabiliyordu (yatay → dikey → yatay sonrası tuval dikey boyutta kalıyordu; tarayıcıda ölçüldü).
  Boyut/yön değişiminden 120 ve 600 ms sonra ölçek yeniden hesaplanıyor.
- **Otomatik duraklatma:** sekme gizlenince, dikey ekranda ve gamepad kopunca.
- **PWA (`scripts/pwa`, `platform/pwa.ts`):** bağımlılıksız Vite eklentisi, yalnızca üretim
  derlemesinde: **kodla çizilen PNG simgeler** (192, 512, maskable 512, iOS 180 — top + altın halka;
  kendi PNG kodlayıcımız, 4×4 alt örnekli kenar yumuşatma), `manifest.webmanifest` (tam ekran, yatay,
  tema renkleri) ve **service worker**: kurulumda derlemedeki tüm dosyalar sürüme özel önbelleğe
  alınır (sürüm = dosya listesinin özeti), eski önbellekler silinir; sayfa gezintisi önce ağdan (güncel
  sürüm), ağ yoksa önbellekteki `index.html`; diğer dosyalar önce önbellekten. `index.html`'e manifest
  ve iOS etiketleri eklenir. Geliştirme sunucusunda kayıt yok.

**Kayıt (`src/save`)**

- Üç bağımsız JSON anahtarı, **alan alan doğrulama** (bozuk alan → güvenli varsayılan; diğer alanlar
  korunur; JSON ayrıştırılamaz ya da depo hata verirse tümüyle varsayılan; oyun asla düşmez):
  - `settings`: zorluk, maç süresi (yalnızca 60/90/120), ekran sarsıntısı. Eski `aiDifficulty`
    anahtarından geçiş.
  - `progress`: açılan karakterler (bilinmeyen kimlikler atılır, başlangıç karakterleri hep açık,
    sıra kanonik) ve istatistikler (maç, galibiyet, mağlubiyet, gol, yenen gol, kupa; negatif olmayan
    tam sayı, üst sınırlı).
  - `tournament`: süren turnuva; herhangi bir tutarsızlıkta (8 farklı karakter, geçerli zorluklar,
    ağaçla uyumlu eşleşmeler, berabere skor yok, süren turda oynanmış maç yok) **tümüyle atılır**.
  - Dil, ses düzeyleri ve tercih edilen karakterler Faz 0–5'teki kendi anahtarlarında (zaten
    doğrulanıyor).
- **İstatistik tanımı:** tamamlanan maçlar (CPU, turnuva, 2 oyuncu); galibiyet/mağlubiyet ve yenen gol
  CPU'ya karşı (turnuva dahil); gol insanların attığı goller (2 oyuncuda ikisinin toplamı). Antrenman,
  yarıda bırakılan maç ve AI vs AI sayılmaz.
- **Karakter kilitleri:** 6 karakter baştan açık (Kor, Ayaz, Şimşek, Kaya, Bora, Yay); her turnuva
  şampiyonluğu sıradakini açar: Demir → Sis → Pamuk → Toprak.

**i18n:** tüm yeni metinler (menüler, ayarlar, yardım sayfaları, turnuva, kupa, dokunmatik buton
etiketleri, platform uyarıları, kafa üstü P1/P2/CPU etiketleri) `src/i18n/strings.ts`'te TR/EN;
`formatDecimal` (1,8 / 1.8) ve dil değişikliği dinleyicisi. `<html lang>` dile göre.

**Testler: 264 → 311.** Yeni: kayıt (bozuk JSON, hata fırlatan depo, alan alan doğrulama, sayaç
sınırları, eski zorluk anahtarı, kaydet/yükle, istatistik kuralları, kilit sırası); turnuva (kura,
ödülün slot 7'de ve finalde rakip olması, tur zorlukları, kazanma/elenme/şampiyonluk, beraberlik
savunması, tohum determinizmi, AI skor aralığı, kaydet/yükle, 12 türlü bozuk kaydın reddi); gamepad
(standart düzen, d-pad, çubuk histerezisi, analog tetik, bozuk eksen, slot atama, 3. kolun yok
sayılması, kol çıkarılınca düğmelerin bırakılması ve slotun korunması); sanal tuşlar ve çoklu kod
eşlemesi (latch, detach); dokunmatik isabet (çoklu dokunuş, tolerans, en yakın buton, butonların
çakışmaması); antrenman (süresiz kurallar, rakipsizde topun ve P1'in P2'nin içinden geçmesi, kukla,
top sıfırlama, bar doldurma); süper önizlemesi (10 karakterin hepsinde süper gerçekten atılıyor,
Işınlanma görünmez, Serap yanılsama üretiyor); PWA (PNG imza/IHDR/CRC/sıkıştırılmış veri, bilinen
CRC, simgenin saydam köşeleri ve beyaz top, service worker dosya listesi ve sürümü); maç kurulumu
(yeni modlar ve süre); i18n (ondalık biçim, dil dinleyicisi). `npm run simulate`: 0 sıkışma
(GameSim değişikliği maç modlarında davranışı değiştirmiyor; determinizm testleri aynen geçiyor).

### Tarayıcıda doğrulama

Üretim derlemesi (`vite preview`), headless Chrome 157 + DevTools protokolü (betikler depoda değil).

- **Uçtan uca akış: 36/36** — demo maçın ilerlemesi (tick), 6 menü öğesi; Ayarlar: zorluk Zor,
  süre 120, sarsıntı kapalı → `localStorage`; dil İngilizce → menü ayarlar açık yeniden kuruldu,
  DOM uyarı metni İngilizce → tekrar Türkçe; Kontrol Şeması sayfası; Nasıl Oynanır 4 sayfa; seçimde
  4 kilitli kart, kilitliye onay reddedildi, önizleme kaydı (114 kare); Hızlı Maç kurulumu (CPU, Zor,
  120 sn, sarsıntı kapalı, CPU açık karakter); maç sonu → istatistik (1 maç, 1 galibiyet, 3–1) ve
  menüdeki hap; 2 Oyuncu (iki imleç, AI yok, P2 oklarla yürüyor, duraklatma menüsü); antrenman
  (süresiz, AI yok, rakipsiz, "ANTRENMAN", R/F/T, duraklatma menüsünde kukla seçeneği, istatistiğe
  girmiyor); turnuva (ödül paneli DEMİR, 8 kişilik kayıt, Zor → Orta/Zor/Zor, P2 ağaçtaki rakip, sonuç
  ekranında yalnızca Devam, final rakibi Demir, 3 galibiyet → kupa ekranı, Demir açıldı, kupa 1,
  turnuva kaydı kapandı); ikinci turnuva: Ana Menü → "Turnuvaya Devam" → kayıp → ELENDİN, kayıt
  silindi; bozuk `progress`/`settings`/`tournament`/`language` ile açılış sağlam; konsolda hata yok.
- **Dokunmatik + gamepad: 24/24** — telefon (844×390, DPR 2, dokunma benzetimi): dokunmatik
  algılandı, butonlar var ve ipucu gizli; iki parmak sağ + zıpla aynı anda; parmak sağdan sola
  kaydırma; parmaklar kalkınca durma; süper butonu; duraklat butonu ve kaplamadaki "Devam"a dokunma;
  dikeyde uyarı + otomatik duraklatma, yatayda uyarı kalkıyor; tam ekran düğmesi görünür; menüde ve
  seçimde dokunarak antrenmana giriş; dokunmatik "barı doldur" ve "topu sıfırla". Sahte Gamepad API
  (2 kol, farklı indekslerle): d-pad menü, A onay, iki kol iki imleç, iki oyuncunun çubukla yürümesi,
  X şut, A zıplama, Start duraklat/sürdür, kol çıkarılınca duraklama + neden satırı.
- **PWA: 8/8** — service worker sayfayı yönetiyor; önbellekte tüm derleme dosyaları; manifest
  hatasız; `Page.getInstallabilityErrors` boş (ana ekrana eklenebilir); **yerel sunucu süreci
  kapatıldıktan sonra** oyun açıldı ve Hızlı Maç oynandı.
- Doğrulama sırasında bulunan ve düzeltilen hatalar: (1) Phaser ölçeğinin döndürmeden sonra eski
  boyutta kalması (yukarıda); (2) service worker önbellek eşleşmesinin `Vary: Origin` başlığı
  yüzünden modül betiğini bulamaması — `vite preview` bu başlığı gönderiyor, çevrimdışı açılış boş
  sayfada kalıyordu; eşleşmede `ignoreVary`; (3) görsel: antrenman saat yazısının taşması, ağaçta
  isimle skorun çakışması, kupa ekranında bilgi yazısının kartın altında kalması, yardım panelinde
  başlığın ilk satıra binmesi.

### Tasarım kararları

1. **Tek girdi yolu:** gamepad ve dokunmatik, klavyeyle aynı `KeyTracker`a sanal tuş olarak düşer.
   Böylece menülerin, seçim ekranının ve maçın girdi kodu tek; oyuncu yine yalnızca `InputState`
   görür (tekrar sistemi etkilenmez). Bedeli: sanal kodlar `CONTROLS` tablolarına eklenmeli.
2. **Dokunmatik ham dokunma olaylarıyla:** Phaser işaretçileri parmak kaydırmada butonlar arası
   geçişi ve aynı anda 3 parmağı güvenilir izlemiyor; her olayda tüm parmaklardan durum yeniden
   hesaplanıyor (kaybolan `touchend` bir sonraki olayda kendiliğinden düzelir).
3. **Gamepad slotları bağlanma sırasıyla ve kalıcı:** 1. kol çıkarılınca 2. kol P1 olmaz (iki
   oyunculu maçta taraf değişmesin); maç duraklar.
4. **Zorluk Ayarlar'da:** Hızlı Maç bir adım kısaldı; turnuva tur zorluklarını buradan türetir.
5. **Kayıt üç ayrı anahtar + alan alan doğrulama:** bozuk bir turnuva kaydı istatistikleri ya da
   kilitleri silmez. Turnuva kaydı onarılmaz, atılır (yarım ve tutarsız bir ağaç oynatılmaz).
6. **Patron = ödül karakteri:** turnuvanın amacı görünür (seçimde ödül paneli, ağaçta finalde kilitli
   karakter). Kilitli karakterler AI olarak görülebilir; Hızlı Maç'ta CPU yalnızca açıklardan seçer.
7. **Turnuva maçında yeniden başlatma yok** ve sonuç maç biter bitmez kaydedilir: kaybedilen maç
   silinemez. (Duraklatıp ana menüye çıkmak hâlâ mümkün; o maç sonra yeniden oynanır — bkz. bilinen
   sorunlar.)
8. **Antrenman için GameSim'e `solo` kipi:** P2 sahadan "kaldırılamaz" (sınırlar yarı düzlem); bunun
   yerine çarpışmalardan çıkarılır. Varsayılan kapalı, maç modlarında davranış değişmez (determinizm
   testleri aynen geçiyor). Top sıfırlama/bar doldurma `step` dışı müdahaledir; antrenman tekrar
   gerektirmez.
9. **Süper önizlemesi gerçek simülasyondan:** ayrı bir yaklaşık animasyon yerine oyunun kendi kodu;
   önizleme hiçbir zaman oyundan farklı davranmaz (testli: 10 süperin hepsi atılıyor).
10. **PWA bağımlılıksız ve kodla:** "harici dosya yok" ilkesine uygun olarak simgeler de derleme
    sırasında kodla çiziliyor; `vite-plugin-pwa`/Workbox eklenmedi (küçük, okunur bir SW yeterli).
    Sayfa gezintisi ağ öncelikli: çevrimiçiyken her açılışta güncel sürüm.
11. **Menü demosu sessiz:** efekt sesleri menüde yorucu olurdu; yalnızca kalabalık uğultusu demo
    maçın tehlikesini izler. Demo süresiz (saat ve maç sonu yok), karakterler rastgele.
12. **Yardım ve ayarlar menü sahnesinde:** demo maç arkada kesintisiz sürer; ayrı sahneye geçişte
    demo her seferinde baştan başlardı.

### Ayarlanması gerektiğini düşündüğüm değerler

Hepsi `src/config/gameConfig.ts` (kilit sırası `src/game/characters.ts`) içinde; gerçek telefon ve
gerçek oyuncularla denenmeli:

| Değer                                 | Şu an                      | Neden                                                                       | Öneri             |
| ------------------------------------- | -------------------------- | --------------------------------------------------------------------------- | ----------------- |
| `TOUCH.buttons` (konum/yarıçap)       | r 50–68 px (mantıksal)     | 844×390 telefonda ~27–37 CSS px yarıçap; büyük başparmakla küçük gelebilir. | +10–15%           |
| `TOUCH.alpha` / `pressedAlpha`        | 0,30 / 0,62                | Parlak sahnede butonlar zor seçilebilir.                                    | 0,35–0,4          |
| `TOUCH.hitSlackPx`                    | 16                         | Komşu butonlar (← →) arasında yanlış basış.                                 | 12–20             |
| `GAMEPAD.stickPress` / `stickRelease` | 0,5 / 0,35                 | Eski kollarda ölü bölge kayması; hassas oyuncu için geç tepki.              | 0,4 / 0,25        |
| `TOURNAMENT.difficultyOffsets`        | −1, 0, +1                  | Orta ayarında final Zor: ortalama oyuncu için finali "duvar" yapabilir.     | oyun testine göre |
| `STARTER_CHARACTERS` / `UNLOCK_ORDER` | 6 açık, 4 kilitli          | Kilit sırası denge tablosuna bakılmadan seçildi (Demir %47 en zayıflardan). | oyun testine göre |
| `MENU.demo.dimAlpha` / `difficulty`   | 0,4 / Zor                  | Demo maç menü butonlarını okunaksız yapabilir ya da çok "boş" görünebilir.  | 0,35–0,5          |
| `SELECT.preview.region` / boyut       | 1100×600 px → 204×114 kutu | Top 4 px; telefonda önizleme küçük kalıyor.                                 | kutu 240×130      |

### Bilinen sorunlar / sınırlamalar

- **Gerçek cihazda denenmedi:** dokunmatik Chrome'un dokunma benzetimiyle, gamepad sayfaya enjekte
  edilen sahte `navigator.getGamepads` ile doğrulandı. Gerçek telefonlarda (özellikle iOS Safari) ve
  gerçek kollarda davranış farklı olabilir: standart olmayan düğme düzenine (`mapping !== 'standard'`)
  sahip kollarda düğmeler farklı yerlere düşebilir.
- **iPhone Safari:** Fullscreen API öğeler için yok → tam ekran düğmesi gizli; yön kilidi yok. Tam
  ekran deneyimi için "Ana Ekrana Ekle" (PWA, `display: fullscreen` iOS'ta standalone olur).
- **Yalnızca gamepad ile ses:** tarayıcılar gamepad düğmesini kullanıcı etkileşimi saymaz; ses ilk
  tuş/tıklama/dokunuşa kadar başlamaz.
- **Telefonda okunurluk:** 1280×720 mantıksal ekran 844×390'a ~0,54 ölçekleniyor; 15–16 px'lik
  açıklama yazıları (~8 CSS px) telefonda küçük. Mobil için ayrı bir yazı ölçeği ileride
  değerlendirilmeli.
- **2 Oyuncu tek telefonda dokunmatikle oynanamaz:** dokunmatik butonlar P1'i yönetir; P2 için klavye
  ya da gamepad gerekir.
- **Turnuva maçından duraklatıp ana menüye çıkmak** maçı saymaz; o maç sonra yeniden oynanır
  (kaybetmek üzereyken çıkılabilir). Bilinçli olarak yumuşak bırakıldı.
- Sahnede oynanmayan turnuva maçları gerçek simülasyon değil, tohumlu rastgele skor (görsel).
- **Menü demosu bir maç kadar iş yapar** ve uyarlamalı kalite yöneticisi menüde çalışmaz (oturumda
  öğrenilen kademeyi kullanır); çok zayıf cihazda menü maçtan önce yavaş açılabilir.
- Debug katmanı (F1) rakipsiz antrenmanda P2'nin collider'larını çizmeye devam ediyor (geliştirici
  aracı).
- Service worker güncellemesi: yeni sürüm yüklendikten sonra açık bir sekme eski JS'le çalışmaya devam
  eder; bir sonraki açılışta yeni sürüm gelir (sayfa gezintisi ağ öncelikli).
- Faz 5'ten süren: gerçek düşük güçlü cihazda ölçüm yok, eşleşme bazında karşı karakterler,
  tarayıcılar arası determinizm, `npm audit` uyarısı, kaleye park etme, debug metin kutusunun HUD'a
  binmesi.

### Sıradaki faz

**Faz 7** — sürüyor (aşağıda).

---

## Faz 7 — Cila, performans, test ve v1.0.0 (2026-11-19)

### Denetim (ara kayıt sonrası, `9a456fa`)

Faz 7 kullanım limitine takıldı; ara kayıttan sonra maddeler tek tek denetlendi:

| #   | Madde                     | Durum   | Not                                                                                                                                                                      |
| --- | ------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Gol tekrarı               | **TAM** | Halka tampon (anahtar kare + girdiler), deterministik tekrar, ağır çekim, izleyen kamera, "Atla", Ayarlar'dan kapatılabilir; birim + tarayıcı testleri yeşil.            |
| 2   | Denge turu                | **TAM** | 4 tur karakter taraması yapıldı (%47–58 → %47–57, en dengesiz eşleşme %80 → %71); zorluk matrisi yeniden ölçüldü (sıralama korunuyor, 0 sıkışma).                        |
| 3   | Performans                | **TAM** | Profil, karede ayırma ~52 → ~16 MB/sn, GC sayısı 6× CPU'da 93 → 39, özel Phaser derlemesi + kod bölme (gzip 423 → 277 kB); ölçümler aşağıda.                             |
| 4   | Hata avı                  | **TAM** | İki gol, kutlama/tekrar sırasında duraklatma, sekme gizlenince süre, dev kare, yeniden boyutlanma, hızlı tuş: testlerle denetlendi; menüde çift panel hatası düzeltildi. |
| 5   | Erişilebilirlik           | **TAM** | Renk körü modu (Okabe–Ito renkleri + kimlik halkası + ▲/● şekilleri), efekt yoğunluğu (parçacık, ekran parlaması, gol yakınlaşması).                                     |
| 6   | Playwright duman testi    | **YOK** |                                                                                                                                                                          |
| 7   | README                    | **YOK** |                                                                                                                                                                          |
| 8   | CHANGELOG + v1.0.0 sürümü | **YOK** |                                                                                                                                                                          |

Eksikler sırayla tamamlanıyor (her madde sonunda derleme + test + commit); v1.0.0 etiketi ve
GitHub Release en son, her şey yeşilken.

### Denge turu (madde 2 — TAM)

Komut: `npm run simulate -- --characters --matches 40 --jobs 11` (Orta vs Orta, her eşleşme iki
tarafta 40'ar = 80 maç, toplam **3600 maç** her tur, tohum 1, gerçek kurallar + güçlendiriciler).

| Tur | Değişiklik                                                                                                                                                      | Kazanma aralığı | En dengesiz eşleşme | Bulgu                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------- | ------------------------------------------------------------------- |
| v0  | Faz 6 değerleri                                                                                                                                                 | %47–58          | Toprak–Şimşek %80   | Ayaz en üstte; Toprak–Şimşek, Bora–Toprak, Kaya–Sis %74+            |
| v1  | Buz etkisi 1,0 → 0,8 sn; Işınlanma çıkış hızı ×0,65 → ×0,72; Kasırga itme 520 → 460; Mıknatıs 1300 → 1500; Sarsıntı kilit 1 → 0,8 sn, zemin sekmesi 0,85 → 0,78 | %46–57          | Bora–Toprak %71     | Uç eşleşmeler düzeldi; Sis Kor'a karşı fazla güçlendi               |
| v2  | Buz hızı ×0,85; Işınlanma ×0,68; Kasırga 400; Dev Top hızı ×1,05 → ×1,12                                                                                        | %44–58          | Bora–Demir %71      | Kor–Sis düzeldi; Ayaz değişmedi, Demir düştü                        |
| v3  | Ayaz 3/4/3/4 → 3/4/4/3; Mıknatıs 1800, 1,6 sn                                                                                                                   | %46–58          | Ayaz–Yay %73        | Ayaz yine %58: üstünlük istatistiklerden değil **donmadan** geliyor |
| v4  | Ayaz istatistikleri geri; **Buz donması 1,5 → 1,1 sn**; Buz hızı ×0,9                                                                                           | **%47–57**      | Bora–Toprak %71     | Kabul edildi                                                        |

Not: Buz'un süperle gol payı yalnızca %5–6; asıl etki donan rakibe karşı atılan **normal** şutlar
(istatistikte süper golü sayılmıyor). Bu yüzden v3'teki istatistik değişikliği işe yaramadı, donma
süresi ise yaradı.

**Son karakter tablosu (v4):**

| Karakter | Süper     | Hız/Zıp/Şut/Kafa | Kazanma | Gol (at–ye) / maç | Süperle gol % |
| -------- | --------- | ---------------- | ------- | ----------------- | ------------- |
| Ayaz     | Buz       | 3/4/3/4          | 57%     | 6,95–6,31         | 5%            |
| Pamuk    | Serap     | 4/4/2/4          | 52%     | 6,46–6,35         | 7%            |
| Şimşek   | Zikzak    | 5/3/4/2          | 51%     | 6,79–6,82         | 6%            |
| Bora     | Kasırga   | 4/4/3/3          | 50%     | 6,75–6,55         | 7%            |
| Kor      | Ateş Topu | 3/3/5/3          | 50%     | 6,62–6,67         | 7%            |
| Sis      | Işınlanma | 4/5/2/3          | 49%     | 6,44–6,54         | 9%            |
| Kaya     | Dev Top   | 2/3/4/5          | 49%     | 6,68–6,81         | 6%            |
| Demir    | Mıknatıs  | 3/3/4/4          | 47%     | 6,40–6,75         | 8%            |
| Yay      | Gökkuşağı | 3/5/3/3          | 47%     | 6,00–6,20         | 9%            |
| Toprak   | Sarsıntı  | 2/4/5/3          | 47%     | 6,95–7,04         | 6%            |

Hiçbir karakter %60'ı geçmiyor; 80 maçlık eşleşmelerde ±~5,6 puan istatistik hatası var. Belirgin
karşı karakterler kaldı: Bora–Toprak %71, Ayaz–Pamuk %69, Toprak–Şimşek %69 (v0'da %80).

**Zorluk matrisi** (`npm run simulate -- --matrix --matches 50`, 450 maç, nötr oyuncular): Faz 4 ile
birebir aynı — nötr oyuncunun süperi (Ateş Topu) ve fizik değişmedi. Kolay–Orta %20/%80, Orta–Zor
%28/%72, Kolay–Zor %10/%90; sıralama korunuyor, **0 sıkışma**. Karakter taramalarında 3600 maçta
3–4 sıkışma olayı (Faz 4'teki gibi).

### Performans (madde 3 — TAM)

**Profil.** AI vs AI maçında (en yüksek kalite) DevTools bellek ayırma örneklemesi, toplanan çöp
dahil (`includeObjectsCollectedByMinor/MajorGC`): karede ~**52 MB/sn** ayırma. Kaynakların ~%70'i
Phaser Graphics: yol komutları (daire, elips, yay, çizgi, yuvarlak köşe) her karede `Path`/`Point`
nesnelerine ve `earcut` üçgenlemesine çevriliyordu; ayrıca `Graphics.clear()` komut dizisini
`length = 0` ile kısalttığı için V8 dizinin bellek alanını bırakıp her karede yeniden büyütüyordu.

**Yapılanlar.**

- **`LiteGraphics`** (yüzler, bacaklar, ağ, şut izi, süper efektleri, güç barları): aynı çizim
  arayüzü, ama her şey doğrudan üçgen komutlarına (dolgular dışbükey yelpaze, çizgiler iki üçgenlik
  dörtgen); komutlar bir imleçle yazılır, dizi hiç kısalmaz (kullanılmayan kuyruk işlemsiz değerle
  doldurulur); yol noktaları önceden ayrılmış tamponda. Kendi WebGL çizicisi üçgen köşelerini
  doğrudan toplu çizim hattının köşe tamponuna yazar (Phaser'ın çizicisi her üçgende çift duyarlıklı
  bağımsız değişkenlerle çağrı yapıp ~18 MB/sn kutulanmış sayı üretiyordu); beklenen iç alanlar yoksa
  Phaser'ın kendi çizicisine geri düşer.
- **Simülasyon:** `partCircle` parça başına tek nesne, `step` adım başına dizi ayırmıyor (girdi
  çifti, iniş/temas tamponları yeniden kullanılır, olay dizisi kopyalanmadan döner); ağ çizgisi
  noktaları havuzda; tekrar anahtar kareleri önceden ayrılmış nesnelere kopyalanır.
- **Nesne havuzları gözden geçirildi:** parçacık havuzu (sabit kapasite, Faz 5) ve sprite havuzları
  zaten ayırmasız; yeni havuzlar yukarıda.
- Sonuç: örneklemede ~52 → ~16 MB/sn; kalan kısım Phaser'ın sprite toplu çizimi.

**Ölçüm** (Faz 6 sürümü `c882234` ile aynı senaryo: AI vs AI Zor–Zor, `?quality=high`, 10 sn,
headless Chrome 157, DevTools izleme ile GC sayımı; "kare işi" Phaser güncelleme + çizim):

| CPU yavaşlatma | Sürüm | Küçük GC | GC süresi | Kare işi ort. | p95    | p99    | En kötü | > 20 ms kare |
| -------------- | ----- | -------- | --------- | ------------- | ------ | ------ | ------- | ------------ |
| 1×             | Faz 6 | 118      | 33,9 ms   | 0,71 ms       | 1,0 ms | 1,2 ms | 1,9 ms  | 0 / 1898     |
| 1×             | Faz 7 | **42**   | 13,1 ms   | 0,64 ms       | 1,0 ms | 1,1 ms | 1,8 ms  | 0 / 1886     |
| 6×             | Faz 6 | 93       | 161,9 ms  | 4,27 ms       | 6,5 ms | 8,1 ms | 12,2 ms | 0 / 1753     |
| 6×             | Faz 7 | **39**   | 67,3 ms   | **3,72 ms**   | 5,4 ms | 7,2 ms | 10,4 ms | 0 / 1827     |

Düşük güçlü cihaz benzetiminde (6×) kare işi bütçenin (16,7 ms) çok altında, GC süresi %58 azaldı;
20 ms'yi aşan kare yok. Gerçek düşük güçlü bir telefonda ölçülmedi.

**Paket boyutu ve kod bölme.**

- **Özel Phaser derlemesi** (`scripts/phaser`): `phaser-core` + yalnızca kullanılan nesneler
  (Container, TileSprite, Zone, Rectangle, Arc, Graphics oluşturucu), `Display.Color`,
  `Geom.Rectangle`; Matter/Arcade fiziği, tilemap, parçacıklar, ses yöneticisi, BitmapText, Mesh,
  Video vb. pakete girmiyor. Phaser kaynağındaki derleme bayrakları (`typeof WEBGL_RENDERER` …) bir
  Vite eklentisiyle sabitlenir. Yalnızca üretim derlemesinde (geliştirme sunucusu tam paketi
  kullanır); eksik modül olursa uçtan uca testler çalışma zamanı hatası olarak yakalar (yakaladı da:
  `make.graphics`).
- **Kod bölme:** motor (Phaser) ayrı parça — oyun kodu değişince yeniden indirilmez, tarayıcı ve
  service worker önbelleğinde kalır.

| Sürüm | Parçalar                             | Toplam     | gzip       |
| ----- | ------------------------------------ | ---------- | ---------- |
| Faz 6 | tek parça 1500 kB                    | 1500 kB    | 423 kB     |
| Faz 7 | oyun 323 kB + Phaser 626 kB + 0,6 kB | **950 kB** | **277 kB** |
