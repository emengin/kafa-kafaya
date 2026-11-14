# İlerleme Günlüğü

## Faz durumu

| Faz | Başlık                                  | Durum         |
| --- | --------------------------------------- | ------------- |
| 0   | Kurulum ve yayın hattı                  | ✅ Tamamlandı |
| 1   | Çekirdek fizik ve kontroller (gri kutu) | ✅ Tamamlandı |
| 2   | Maç kuralları ve oyun döngüsü           | ✅ Tamamlandı |
| 3   | Yapay zekâ rakip                        | ✅ Tamamlandı |
| 4   | —                                       | ⏭️ Sıradaki   |
| 5–7 | —                                       | Bekliyor      |

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

**Faz 4** — talimat bekleniyor.
