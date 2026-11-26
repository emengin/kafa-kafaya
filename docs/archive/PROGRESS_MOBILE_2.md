# Mobil Bölüm 2 — Mobil temel: faz kayıtları

PROGRESS.md'den taşınan biten faz ayrıntıları. Özet ve onay kutuları: [PROGRESS.md](../PROGRESS.md).

## Faz 2.0 — Phaser 4'e geçiş (2026-11-20)

Phaser 3.90.0 → **4.2.1** (Temmuz 2026'nın kararlı sürümü; 4.0.0 Nisan 2026). Commit'ler: `1eb368e`
(ölçüm tezgâhı), `4bef905` (geçiş), `0ec9273` (LiteGraphics resimlerle aynı toplu çizimde).

### Tamamlananlar

**1. Kırılan API'ler ve düzeltmeleri.** Tip denetimi yalnızca iki yerde kırıldı; asıl kırılmalar
çalışma zamanında ve paketlemedeydi:

| #   | Phaser 4 değişikliği                                                                                                                                                     | Etkisi                                                                           | Düzeltme                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | Pipeline sistemi kaldırıldı (`renderer.pipelines`, MultiPipeline); yerine render node mimarisi                                                                           | `LiteGraphics`'in hızlı WebGL çizicisi derlenmiyordu (`pipeline` alanı yok)      | Hızlı yol `BatchHandlerQuad`'a (resimlerle aynı toplu çizim) yazacak şekilde yeniden yazıldı (madde 2) |
| 2   | Render adımı (`_renderSteps`) nesne kurulurken `this.renderWebGL`'den yakalanıyor ve düz fonksiyon olarak `(renderer, src, drawingContext, parentMatrix)` ile çağrılıyor | Kurucuda örneğe atanan çizici hiç çağrılmazdı; çağrılsa `this` olmazdı           | Çiziciler prototipe atandı, örneğe `src` üzerinden erişiyor                                            |
| 3   | `GetCalcMatrix`'e `ignoreCameraPosition` parametresi; Graphics çizicisi `camera.alpha`'yı çarpmıyor                                                                      | Dönüşüm ve saydamlık Phaser 3'ten farklı hesaplanırdı                            | Phaser 4'ün Graphics çizicisiyle aynı çağrı (`!drawingContext.useCanvas`) ve yalnızca nesne saydamlığı |
| 4   | `Graphics.fillPoints`/`strokePoints` türleri `Vector2[]` istiyor                                                                                                         | `src/ui/shapes.ts` tip hatası (çalışma zamanında yalnızca `x`/`y` okunuyor)      | Paylaşılan nokta tamponu açıklamalı tür dönüşümüyle                                                    |
| 5   | `package.json` `exports` yalnızca paket girişini açıyor                                                                                                                  | Özel derlemenin `require('phaser/src/…')` içe aktarımları çözülmüyordu           | Eklenti yolları paket klasöründen çözüyor (madde 3)                                                    |
| 6   | FX sistemi kaldırıldı (`phaser/src/fx` yok; yerini filtreler aldı)                                                                                                       | Özel girişte eksik modül                                                         | Ad alanından çıkarıldı (oyun FX kullanmıyor)                                                           |
| 7   | Graphics `generateTexture` canvas çiziciyi fazladan argümanlarla (hedef bağlam, kırpma) çağırıyor                                                                        | LiteGraphics'in canvas sarmalayıcısı argümanları kesse ikon dokuları boş çıkardı | Sarmalayıcı tüm argümanları iletiyor                                                                   |

Denetlenip etkilemediği görülenler: `roundPixels` varsayılanı (3.90'da da false), `setTintFill`,
maskeler ve FX, `Geom.Point`, `Math.TAU`/`PI2`, `Struct.Set/Map`, DynamicTexture `render()`,
TileSprite kırpma, Mesh, kamera matrisleri — oyun bunların hiçbirini kullanmıyor. Kullanılanların
davranışı aynı: `setTint` (çarpma kipi varsayılan), `BlendModes.ADD`, kamera solma/parlama, Text,
tween'ler, canvas dokuları (`createCanvas` + `refresh`), `generateTexture`, TileSprite
(`tilePositionX`).

**2. LiteGraphics → render node.** İki aşamada:

- **İlk taşıma** (`4bef905`): üçgenler Phaser'ın Graphics yolunun toplu çizicisine
  (`BatchHandlerTriFlat`) doğrudan yazıldı. Phaser'ın kendi yolu her üçgeni `FillTri` düğümünden
  geçiriyor ve üçgen başına dört geçici dizi ayırıyor; hızlı yol bunu atladı. Ama ölçümde maçta kare
  başına çizim çağrısı Phaser 3'teki 13,5'ten **34,1**'e çıktı: Phaser 4'te düz üçgenler ve dokulu
  dörtgenler ayrı toplu çiziciler; karakterlerde resim (gövde, ayakkabı) ile LiteGraphics (yüz,
  bacak) iç içe olduğu için kare başına ~21 geçiş ve her birinde toplu çizim boşaltması oluyordu.
- **Son hal** (`0ec9273`): her üçgen dejenere bir dörtgen olarak — (A, B, C, C): şeritte (A, B, C)
  ve sıfır alanlı (B, C, C) — beyaz doku (`__WHITE`) + `FILL` ton kipiyle **resimlerin kullandığı
  `BatchHandlerQuad`'a** yazılıyor (Phaser 3'te de LiteGraphics aynı amaçla sprite'larla ortak
  MultiPipeline'a yazıyordu). Çıktı düz renk gölgelendiricisiyle aynı (önçarpımlı `ton.rgb × ton.a`);
  yakın plan karşılaştırmada yüzler birebir aynı. Toplu çizim başlangıcı, seçenek değişiminde kesme,
  doku birimi ataması (`batchTextures`) ve tampon dolunca çizim Phaser'ın `batch` yöntemiyle aynı
  sırada; çizim seçenekleri (`smoothPixelArt`) resimlerle aynı kuralla seçiliyor, yoksa her geçişte
  yine kesilirdi. Sonuç: **34,1 → 19,7 çağrı/kare**. Kalan fark Phaser'ın `Rectangle` şekillerinden
  (maçta 18 görünür; `FillRect` → `BatchHandlerTriFlat`, kare başına ~7 geçiş).

Toplu çizici beklenen düzende değilse (28 baytlık köşe, 4 köşe / 6 indeks, şerit topolojisi,
gerekli yöntemler) ya da nesnede ışıklandırma açıksa Phaser'ın kendi çizicisine düşüyor: Phaser iç
yapısı değişirse oyun bozulmaz, yalnızca yavaşlar. Tarayıcıda doğrulandı: 12 LiteGraphics nesnesinin
render adımı hızlı yol.

**3. Özel Phaser paketi.** `scripts/phaser/phaser-custom.cjs` Phaser 4'ün `phaser-core.js`'ine göre
güncellendi (FX çıktı, `TintModes` girdi, `Phaser.Renderer` ad alanı çıktı). `plugin.ts`:

- `phaser/src/…` yolları paket klasöründen çözülüyor ve **Vite biçiminde** (düz eğik çizgi)
  döndürülüyor. İlk denemede Windows yolu döndürülünce Phaser'ın göreli içe aktarımlarıyla aynı
  dosya iki ayrı modül sayıldı; `GameObjectFactory` iki kez paketlendi, fabrikalar yanlış kopyaya
  kaydoldu ve menü `this.add.container is not a function` ile açılmadı (duman testi yakaladı).
- `BatchHandler`'ın `renderer/index` içe aktarımı yalnızca `Renderer.Events`'i veren dar bir modüle
  yönlendiriliyor: o dizin tüm WebGL ad alanını (SpriteGPULayer, TilemapGPULayer, tüm shader'lar)
  pakete sokuyordu. Kazanç ~54 kB ham / ~9 kB gzip. Derleme zamanı koruması: BatchHandler `Events`
  dışında bir `Renderer` alanı kullanmaya başlarsa derleme açık bir mesajla kırılır.
- Yeni `scripts/phaser/plugin.test.ts` (6 test): yol çözümleme, özel girişteki her modülün kurulu
  sürümde varlığı, bayraklar, BatchHandler koruması.

**4. Testler ve yayın.** Lint, 325 birim testi (319 + 6), üretim derlemesi ve Playwright duman testi
yerelde ve CI'da geçiyor; GitHub Pages yayını Phaser 4 derlemesiyle. Ek olarak tarayıcıda elle
tarandı (hepsi konsol hatasız): menü, yardım paneli, ayarlar, karakter seçimi, turnuva ağacı, kupa
sahnesi, maç, gol anı, gol tekrarı, duraklatma, 10 karakterin süper şutları, telefon görünümünde
dokunmatik düğmeler; WebGL'siz Chrome'da Canvas yedek çizicisi; geliştirme sunucusu (tam Phaser 4
ESM paketi).

**5. Karşılaştırma.** Yeni `npm run bench` (`scripts/bench/bench.ts`) iki derlemeyi aynı tarayıcıda,
dönüşümlü koşarak ölçüyor. Sonuçlar aşağıda.

### Ölçümler

Ortam: Windows 11, headless Chrome 157, WebGL (ANGLE D3D11, RTX 5060); CPU yavaşlatma DevTools
`Emulation.setCPUThrottlingRate` (düşük güçlü cihaz benzetimi; gerçek cihaz değil). Referans:
`v1.0.0` sonrası Phaser 3.90 derlemesi (`360c354`). Komut:
`npm run bench -- --dirs <phaser3-dist>,dist --runs 5 --cpu 1,4,6 --ticks 3600`.

**Determinizm** — tarayıcıda gerçek `MatchScene` yolu (AI vs AI, tohumlu), adım 60–3600 arasında
her 30 adımda `GameSim.saveState` JSON'unun özeti. İki ayrı tam koşuda aynı sonuç:

| Senaryo                           | Denetim | Phaser 3 ↔ 4 | Gol tekrarı çelişkisi | Son özet (ikisi de) |
| --------------------------------- | ------- | ------------ | --------------------- | ------------------- |
| Zor–Zor, tohum 11, Kor – Ayaz     | 119     | birebir aynı | 0 / 0                 | `388b4da5`          |
| Zor–Orta, tohum 5, Şimşek – Pamuk | 119     | birebir aynı | 0 / 0                 | `24fb1160`          |

Beklenen sonuç: simülasyon (`src/game`, `src/physics`) Phaser içe aktarmıyor. Bu ölçüm sahne
tarafının (girdi, adım döngüsü, gol tekrarı) da aynı davrandığını gösteriyor. Aynı derlemenin iki
koşusu da birebir aynı (ölçümün kendisi kare zamanlamasından bağımsız).

**Paket boyutu** (Vite raporu):

| Derleme      | Oyun kodu gzip | Phaser gzip | Toplam ham | Toplam gzip |
| ------------ | -------------- | ----------- | ---------- | ----------- |
| Phaser 3.90  | 110,4 kB       | 166,8 kB    | 950 kB     | 277,5 kB    |
| Phaser 4.2.1 | 111,1 kB       | 193,9 kB    | 1.047 kB   | 305,4 kB    |

Phaser 4 parçası ilk derlemede 214,6 kB'tı; yinelenen modüller (Windows yolu hatası) 202,7'ye,
`renderer/index` daraltması 193,9 kB'a indirdi. Kalan artış Phaser 4'ün yeni çizicisinden (render
node'lar, filtre düğümleri ve shader'ları — `RenderNodeManager` hepsini doğrudan içe aktarıyor).

**Açılış süresi** — gezinme başlangıcından menü sahnesinin açılmasına (yükleme ekranındaki doku
üretimi dahil), temiz bağlam, 5 koşunun medyanı; iki tam koşu:

| CPU | Phaser 3.90     | Phaser 4.2.1    |
| --- | --------------- | --------------- |
| 1×  | 483 ms / 484 ms | 455 ms / 456 ms |
| 4×  | 923 ms / 962 ms | 906 ms / 934 ms |

**Kare işi** — Phaser'ın `prestep` → `postrender` arası (güncelleme + çizim gönderimi, ana iş
parçacığı), AI vs AI Zor–Zor, `?quality=high`, 10 sn × 5 koşu (koşu medyanları; en kötü kare tüm
koşuların en kötüsü). Son derleme, makine boştayken:

| CPU | Derleme      | Ort.    | p95     | p99     | En kötü | > 20 ms kare |
| --- | ------------ | ------- | ------- | ------- | ------- | ------------ |
| 1×  | Phaser 3.90  | 0,53 ms | 0,70 ms | 0,90 ms | 3,9 ms  | 0 / 9009     |
| 1×  | Phaser 4.2.1 | 0,65 ms | 0,90 ms | 1,10 ms | 23,8 ms | 1 / 9005     |
| 4×  | Phaser 3.90  | 2,28 ms | 3,20 ms | 4,10 ms | 20,0 ms | 2 / 9003     |
| 4×  | Phaser 4.2.1 | 2,93 ms | 4,10 ms | 5,30 ms | 22,6 ms | 3 / 8994     |
| 6×  | Phaser 3.90  | 3,56 ms | 5,20 ms | 6,70 ms | 35,1 ms | 5 / 8923     |
| 6×  | Phaser 4.2.1 | 4,50 ms | 6,40 ms | 7,90 ms | 35,7 ms | 7 / 8532     |

Phaser 4 ortalamada %23–29 daha fazla ana iş parçacığı süresi harcıyor (LiteGraphics dörtgen yoluna
geçmeden önceki koşuda %26–36). Mutlak değerler koşudan koşuya ±%20 oynuyor (aynı gün Phaser 3
için 6×'te 2,85 ile 3,56 ms arası ölçüldü); oran tutarlı. Bütçe 16,7 ms; 6×'te bile ortalama
4,5 ms. Bir ölçüm koşusu, sırasında tip denetimi çalıştığı için atıldı.

**Çizim çağrısı** (kare başına `drawElements`/`drawArrays`): Phaser 3.90 **13,5**; Phaser 4.2.1
ilk taşıma 34,1 → son hal **19,7**. Kalan ~6 fark Phaser'ın `Rectangle` şekillerinden.

**Bellek ayırma** (DevTools örnekleyici yığın profili, GC'de toplananlar dahil, 10 sn, iki koşu):
Phaser 3.90 ~123 kB/kare (22 MB/sn), Phaser 4.2.1 ~157–161 kB/kare (28–29 MB/sn); GC süresi 10 sn'de
33–35 ms → 38 ms (zamanın %0,4'ü). En büyük kaynak her iki sürümde de Phaser'ın resim gönderim yolu
(çok argümanlı çağrılarda kutulanan sayılar: Phaser 3'te `batchSprite` ~5,8 MB/sn, Phaser 4'te
`SubmitterQuad.run` ~5,6 MB/sn); Phaser 4'te ek olarak kap içinde karışım kipi değişiminde kurulan
`DrawingContext` nesneleri ve `Rectangle`'ların `FillRect` yolu. LiteGraphics yolu ayırmıyor.

**Görsel karşılaştırma** — aynı sahnelerin iki sürümde ekran görüntüleri ve piksel farkı: menü,
karakter seçimi, maç, gol anı, gol tekrarı, duraklatma, telefon görünümü; WebGL'siz (Canvas) gol ve
duraklatma. Duraklatma paneli, HUD, gökyüzü, saha ve yazılar birebir aynı; farklar yalnızca zamana
bağlı öğelerde (kalabalığın sallanması, oyuncuların enterpolasyonla birkaç piksel kayması, LED pano
kaydırması, konfeti) ve menüdeki rastgele demo maçta.

### Kararlar (Claude Code'un verdiği)

1. **Sürüm: Phaser 4.2.1, `^4.2.1` aralığı** (önceki `^3.90.0` gibi). Kilit dosyası CI'da tam sürümü
   sabitliyor. LiteGraphics ve paket eklentisi Phaser iç yapısına dayandığı için iki koruma var:
   hızlı yol yedeğe düşerse duman testi kırılır; BatchHandler'ın `Renderer` kullanımı değişirse
   derleme kırılır. Phaser güncellemesinden sonra `npm run bench` ile karşılaştırma önerilir.
2. **LiteGraphics resimlerle aynı toplu çizime yazar** (düz üçgen toplu çizicisi yerine): çizim
   çağrısı farkı mobil GPU'da önemli; görsel çıktı aynı. Bedeli üçgen başına 4 köşe × 28 bayt
   (düz yolda 3 × 12) — kare işi ölçümünde net kazanç.
3. **Saydamlık Phaser 4 semantiğiyle:** Graphics çizimi `camera.alpha`'yı çarpmıyor (Phaser 4'ün
   kendi çizicisi gibi). Oyunda kamera saydamlığı kullanılmıyor (solmalar `FillCamera` ile).
4. **Canvas çizici korundu** (Phaser 4'te "kullanımdan kalkacak"): WebGL'siz tarayıcılarda yedek
   ve `Graphics.generateTexture` (ikon dokuları) canvas çiziciyi kullanıyor. Kaldırmak için ikonlar
   doğrudan Canvas 2D ile çizilmeli (Faz 2.4 notu).
5. **Özel derlemede `Phaser.Renderer` ad alanı yok:** oyun kodu kullanmıyor; kullanılırsa üretimde
   `undefined` olur (geliştirme sunucusu tam paketi kullandığı için orada görünmez — duman testi ve
   ekran taraması üretim derlemesinde).
6. **Ölçüm tezgâhı repoda** (`npm run bench`): Faz 2.4 ve sonraki performans fazları aynı aracı
   kullanır; determinizm bölümü Faz 2.7'nin çapraz motor testine örnek.

### Bitti kriterleri

| Kriter                                                                                    | Durum                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Phaser 3.90 → 4; kırılan API'lerin listesi ve düzeltilmesi                             | ✅ 4.2.1; 7 kırılma ve düzeltmesi yukarıda                                                                                                                                  |
| 2. LiteGraphics ve köşe tamponu çizicisinin render node mimarisine taşınması              | ✅ `BatchHandlerQuad`'a doğrudan yazım; yedek yol ve uyarı                                                                                                                  |
| 3. Özel Phaser paketinin Phaser 4'e göre yeniden yapılandırılması                         | ✅ yol çözümleme, `renderer/index` daraltması, eklenti testleri                                                                                                             |
| 4. Birim, determinizm, Playwright duman testi ve web yayını                               | ✅ 325 birim testi (determinizm testleri dahil), duman testi; CI yeşil, GitHub Pages Phaser 4 derlemesini sunuyor                                                           |
| 5. Determinizm karşılaştırması; kare süresi, açılış, paket boyutu yan yana PROGRESS.md'de | ✅ tarayıcıda 2 × 119 denetim birebir aynı; tablo PROGRESS.md'de, ayrıntı burada                                                                                            |
| **Faz: web sürümü Phaser 4'te eskisiyle aynı davranıyor**                                 | ✅ aynı simülasyon durumu, aynı görünüm (piksel karşılaştırması), tüm sahneler hatasız; performans bütçenin çok altında ama Phaser 3'ten biraz yavaş (bilinen sorunlar)     |
| QUALITY_BAR P7 (karede yeni nesne yok)                                                    | ◐ LiteGraphics yolu ayırmıyor; Phaser'ın kendi resim/kap yolu Phaser 3'teki gibi ayırıyor (Faz 2.4 kapsamı). Diğer performans satırları gerçek cihazda Faz 2.4'te ölçülecek |

### Bilinen sorunlar

- **Kare işi %23–29, paket ~28 kB gzip, kare başına ayırma ~%28 arttı;** çizim çağrısı 13,5 → 19,7.
  Hepsi bütçenin içinde; kaynakları ve önerilen çözümler PROGRESS.md "Sonraki fazlar için notlar"da
  (Faz 2.4).
- **Tek seferlik takılma:** Phaser 4'te 1× koşularda en kötü kare ~23 ms (her koşuda tek kare);
  Phaser 3'te 4 ms. Muhtemelen bir shader çeşidinin ilk kullanımda derlenmesi; doğrulanmadı.
- **Ölçümler masaüstünde CPU yavaşlatmayla;** gerçek düşük-orta seviye Android'de ölçülmedi
  (Faz 2.1 sonrası, 2.4).
- Canvas çizicide konfeti beyaz görünüyor (canvas ton desteklemiyor) — Phaser 3'te de aynı.

## Faz 2.1 — Capacitor ve Android derleme (2026-11-25 → 2026-11-26)

Capacitor 8.6.2; `com.emengin.kafakafaya` / "Kafa Kafaya"; adımlar README → "Android'de çalıştırma".
Kod 2026-11-25'te tamamlandı; oyun 2026-11-26'da geliştiricinin gerçek Android telefonunda açılıp
oynandı ve faz kapandı. Commit'ler: `35cf6f2` (Capacitor ve Android derlemesi), `05fe67c` (rehber ve
notlar).

### Yapılanlar

- İki derleme kipi, tek kaynak `scripts/mobile/target.ts`: `npm run build` → `dist/`,
  `/kafa-kafaya/`, PWA (değişmedi) · `npm run build:mobile` → `dist-mobile/`, `/`, service worker
  ve manifest yok. Uygulama tarafı bayrak: `__NATIVE_APP__` → `src/platform/target.ts` (SW kaydı ve
  tam ekran düğmesi kapalı; ölü kod paketten atılıyor).
- `android/`: yatay kilit (`userLandscape`), `appCategory="game"`, tam ekran (`SystemBars.hidden` +
  `MainActivity`: kenardan kaydırınca çubuklar geçici görünür, odak dönünce yeniden gizlenir),
  WebView zemini ve açılış rengi `#070b26` (`PLATFORM.backgroundColor`).
- Geçici ikon ve açılış ekranı: `npm run assets:placeholder` (PWA simge kodu → `@capacitor/assets`).
  Şablondaki Capacitor logosu silindi; Android 12+ açılışındaki "beyaz zemin + genel Android simgesi"
  varsayılanı (core-splashscreen) oyunun rengi ve simgesiyle değiştirildi.
- Gradle sarmalayıcısı 8.14.3 → **9.1.0** (sağlama toplamıyla): Android Studio'nun JDK 25'i Gradle
  8.14'ü çalıştıramıyor ("Unsupported class file major version 69"); 9.1.0 Java 25'i destekleyen en
  eski 9.x, AGP 8.13 ile derleniyor. Debug APK 5,0 MB.
- Testler: +9 birim testi (derleme kipleri, TS ↔ Android eşitliği, simge katmanları; toplam 334);
  Playwright `web` + `mobil` projeleri (duman testi + derleme hedefi testi iki derlemede); CI'a
  `build:mobile` adımı. `.gitignore`: derleme çıktıları, `local.properties`, `*.keystore`, `*.jks`.

### Kararlar

- `webDir` = ayrı `dist-mobile/`: `dist/` paylaşılsa web derlemesi uygulamaya kopyalanıp boş ekran
  verebilirdi, mobil derleme de web duman testini bozardı. Ters denemeyle doğrulandı (mobil klasöre
  web derlemesi konunca mobil duman testi kırılıyor).
- `cap:sync` önce `build:mobile` çalıştırır: eski derleme kopyalanamaz.
- `userLandscape`: iki yatay yön, kullanıcının döndürme kilidine uyar.
- Uygulamada tam ekran düğmesi yok; WebView'ın Fullscreen API'si video için tasarlanmış.
- `@capacitor/splash-screen` eklenmedi: sistem açılışı → `#070b26` WebView → oyun. Açılışı oyun
  hazır olana kadar tutmak 2.5 notunda.
- Geçici kaynak PNG'ler depoya girmez (ART_BIBLE: `assets/` yalnızca kabul edilmiş final);
  `node_modules/.cache` altına üretilir. Android'e yazılan çıktılar depoda (Android Studio onlarla
  derler).

**Faz 4 notu — geçici görseller:** `android/app/src/main/res/mipmap-*` ve `drawable*/splash.png`
kodla üretilmiş yer tutucu. Final ikon (ART_BIBLE §11.7, §13.2) ve açılış ekranı gelince:
`npx capacitor-assets generate --android --assetPath <klasör>`, ASSET_LOG kaydı,
`scripts/mobile/placeholderAssets.ts` silinir. (PROGRESS.md "Sonraki fazlar için notlar"da da var.)

### Bitti kriterleri

| Kriter                                                      | Durum                                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1. Capacitor kurulumu, uygulama kimliği, Android projesi    | ✅                                                                                    |
| 2. Geçici ikon ve açılış ekranı                             | ✅ yer tutucu (Faz 4'te değişir)                                                      |
| 3. Debug derlemesinin gerçek cihazda çalışması; README      | ✅ gerçek Android telefonda açıldı ve oynandı (2026-11-26); README hazır              |
| **Faz: oyun gerçek bir Android telefonda açılıp oynanıyor** | ✅ 2026-11-26, geliştiricinin telefonu                                                |
| Web yayını bozulmadı                                        | ✅ web derlemesi aynı yolda, PWA simgeleri bayt bayt aynı, duman testi yeşil          |
| QUALITY_BAR B1 (indirme ≤ 100 MB)                           | ✅ debug APK 5,0 MB                                                                   |
| QUALITY_BAR B3 (ağ yokken açılış)                           | ✅ tasarım gereği (tüm dosyalar APK içinde); cihazda ağsız açılış ayrıca kaydedilmedi |
| QUALITY_BAR A1–A3 (açılış süreleri), D5 (güvenli alan)      | ölçülmedi (telefon testi açılış ve oynanışı kapsadı); A1–A3 Faz 2.4, D5 Faz 2.2       |

### Bilinen sorunlar

- Gradle 10 uyumsuzluk uyarıları Capacitor şablonundan ve AGP 8.13'ten (ör. `rootProject.buildDir`);
  derlemeyi etkilemiyor.
- `versionName "1.0"` / `versionCode 1` sabit; `allowBackup="true"` (şablon varsayılanı) — PROGRESS.md
  notlarında (12.1, 8.1).
- `npm audit`: 7 orta düzey uyarı typescript-eslint → minimatch zincirinden (Faz 2.1'den önce de
  vardı; Capacitor'dan değil).

## Faz 2.2 — Ekran ve ölçekleme (2026-11-26, tamamlandı)

Özet ve "boş kenarlar" kararı: [PROGRESS.md § Faz 2.2](../PROGRESS.md).

### Yapılanlar

- **Ölçekleme:** Phaser `FIT` → `EXPAND`. Tuvalin kabı (`#game`) pencereyi kaplar, en-boy oranı
  4:3 ile 21,3:9 arasına kırpılır (`fitParent`, `src/platform/screenFrame.ts`); ötesi siyah şerit.
  Kamera 1280×720 çekirdeği ortalar (`ScreenLayout`): dünya koordinatları, fizik ve sahne yerleşim
  değerleri değişmedi.
- **Güvenli alan:** `src/platform/safeArea.ts`, `#safe-area-probe` öğesiyle
  `max(env(safe-area-inset-*), var(--safe-area-inset-*))` okur (tarayıcı + Capacitor `SystemBars`).
  Boyut, yön değişimi ve 1 sn'lik yoklama ile güncellenir (180° dönüşte pencere boyutu değişmez).
  Dokunmatikte her kenar en az 12 CSS px (yuvarlak köşe; Android bildirmez). Tuval yerleşimi yalnızca
  çentiği sayar: oyun alanı güvenli alana sığmıyorsa (çentikli 16:9) tuval çentikten uzaklaşır.
- **Kenara sabitleme:** `src/ui/ScreenLayout.ts` — `screenLayout(scene)`; `place(obj, çapa)`,
  `group(çapa)` (kap; HUD gibi kendi içinde tween'lenen arayüz), `cover(obj)` (perde, flaş, vinyet),
  `onChange(fn)`. Konumlar tasarım çerçevesinde (16:9, çentiksiz) yazılı, öğe kenara uzaklığını her
  ekranda korur; `center` çapası çentikten etkilenmez (simetri).
- **Kullananlar:** maç HUD'u (skor tabelası üstte, ipucu altta), dokunmatik butonlar (hareket sol
  alt, zıpla/şut/süper sağ alt, duraklat/antrenman sol üst), gol tekrarı (şeritler tam genişlik,
  "TEKRAR" sol üst, "Atla" sağ alt), ana menü (ipucu, istatistik, sürüm), karakter seçimi ("Geri",
  ipucu), duraklatma/maç sonu perdesi, vinyet ve flaşlar, yükleme ekranı zemini, debug katmanı.
- **Stadyum dokuları** en geniş/uzun çerçeveyi kaplar; çekirdekteki görünüm korunur (gökyüzü
  gradyanı, çatı dikmeleri, saha perspektifi ve şeritleri eski ölçüye göre).
- **Android:** temaya `windowLayoutInDisplayCutoutMode=shortEdges` (9–14'te de 15+ gibi içerik
  çentik kenarına uzanır).
- **Özel Phaser paketi:** `GameObjects.Events` eklendi (`DESTROY` olayı).
- **Testler:** `src/platform/screenFrame.test.ts` (çerçeve, güvenli alan, her oran × çentik
  yok/sol/sağ için butonların güvenli alanda kalması ve çakışmaması, oyun alanının çentikte
  kalmaması, 16:9'da eski konumların aynen korunması). `e2e/screens.spec.ts` (`npm run screens`):
  ekran görüntüsü matrisi + 180° dönüş testi + dikey ekran testi.

### Test matrisi

CSS px, DPR 2, mobil benzetim (dokunmatik). Çentik: telefonda sol kısa kenarda 32 px, tablette
üst uzun kenarda 24 px (`--safe-area-inset-*`). Görüntüde çentik ve yuvarlak köşeler siyah test
kaplaması. Her biri için menü, karakter seçimi, maç, gol tekrarı.

| Oran         | Pencere  | Oyun boyutu | Görünür alan (dünya) |
| ------------ | -------- | ----------- | -------------------- |
| 16:9         | 640×360  | 1280×720    | 0…1280 × 0…720       |
| 18:9         | 720×360  | 1440×720    | −80…1360 × 0…720     |
| 19,5:9       | 780×360  | 1560×720    | −140…1420 × 0…720    |
| 20:9         | 800×360  | 1600×720    | −160…1440 × 0…720    |
| 21:9         | 840×360  | 1680×720    | −200…1480 × 0…720    |
| 4:3 tablet   | 1024×768 | 1280×960    | 0…1280 × −120…840    |
| 16:10 tablet | 1280×800 | 1280×800    | 0…1280 × −40…760     |

Çentikli 16:9'da tuval çentik kadar daralır (608×360 → 1280×758, üstte ve altta biraz dekor).
Ek: 20:9'da çentik soldan sağa geçince (pencere boyutu aynı) butonlar ≤ 1 sn içinde yer
değiştiriyor (otomatik test); dikey telefonda (390×844, web) "telefonu çevir" ekranı ve maç duruyor.

### Kararlar

- Boş kenarlar: stadyum dekoru (gerekçe PROGRESS.md'de).
- Sınır 21,3:9 ve 4:3: ART_BIBLE §10.1 tuvali; daha geniş/dar ekran pazarda çok az.
- Köşe payı yalnızca dokunmatikte: masaüstü web yerleşimi birebir aynı kalsın.
- Menü başlığı, menü listesi, karakter kartları ve paneller kenara değil ortaya göre kalır (içerik,
  kenar arayüzü değil); tablette üstte/altta dekor görünür.
- Çentikli 16:9: dekor yerine siyah şerit (oyun alanı çentiğin altına düşmesin).

### Telefon testi (2026-11-26, geliştiricinin telefonu)

Çentik tarafı, iki yatay yön (180° dönüş), sistem çubukları (kenardan kaydırma, bildirim paneli,
uygulamaya dönüş), köşeler ve gol tekrarı: sorunsuz. Tek bulgu: ◀ ▶ birbirine çok yakın (kenarlar
arası 18 px ≈ 9 dp). Düzeltme: ▶ x 250 → 290 (aralık 58 px ≈ 29 dp, `TOUCH.moveGapPx`); dokunma
toleransı 16 → 30 px (parmak ◀'den ▶'ye kayarken arada girdi kopmasın, en yakın buton basar).
Antrenman butonları (sol üst) da 12 px aralıklıydı → 16 px (`TOUCH.minGapPx`, QUALITY_BAR D2). İkisi
de her oran × çentik için birim testinde.

### Bilinen sorunlar

- Dokunmatik butonların boyutu QUALITY_BAR D3'ün (≥ 72 dp) altında (◀ ▶ ≈ 62 dp, sol üst
  butonlar ≈ 32 dp, D1'in 48 dp'sinin de altında); kontroller Faz 2.3'te yeniden tasarlanıyor.
- 21:9'da dış kenarlarda ışık kulesi yok (dekor sade); final stadyum çizimiyle (Faz 4.1) kapanır.
