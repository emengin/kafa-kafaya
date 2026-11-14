# İlerleme Günlüğü

## Faz durumu

| Faz | Başlık                                  | Durum         |
| --- | --------------------------------------- | ------------- |
| 0   | Kurulum ve yayın hattı                  | ✅ Tamamlandı |
| 1   | Çekirdek fizik ve kontroller (gri kutu) | ✅ Tamamlandı |
| 2   | Maç kuralları ve oyun döngüsü           | ✅ Tamamlandı |
| 3   | —                                       | ⏭️ Sıradaki   |
| 4–7 | —                                       | Bekliyor      |

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
