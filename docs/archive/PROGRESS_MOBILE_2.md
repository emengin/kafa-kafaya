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

## Faz 2.3 — Dokunmatik kontroller v2 (2026-11-26, tamamlandı)

Özet ve bitti kriterleri: [PROGRESS.md § Faz 2.3](../PROGRESS.md).

### Çıkış noktası: telefon testinden gelen istek

"Oynarken bazen ◀ ▶ butonlarına basamıyoruz; yakınlarına basınca da çalışsa iyi olur." Eski
sistemde her dokunuş yalnızca "görsel yarıçap + 30 px" içinde sayılıyordu ve her olayda yeniden
değerlendiriliyordu: maç sırasında başparmak butondan biraz kayınca yön bırakılıyordu.

### Yapılanlar

- **Geniş dokunma alanı** (`src/input/touchLayout.ts` → `hitRadius`): maç butonu görselinin %80
  dışına kadar dinler (◀ ▶ ve Zıpla için 130 px yarıçap ≈ 65 dp; eskiden 92 px); her zaman en az
  72 dp çap (QUALITY_BAR D3), duraklat ve antrenman butonlarında en az 48 dp (D1). dp ölçeği
  ekrandan okunur (`ScreenLayout.pxPerDp`). Alanlar kesişirse parmağa (yarıçapa göre) en yakın
  buton basar. Duraklatın alanı bilerek dar (görsel + 16 px): yanlışlıkla duraklatmasın.
- **Parmak sahipliği** (`src/input/touchRouter.ts`, saf ve birim testli): parmak ilk indiği grubun
  (hareket / eylem / arayüz) olur, kalkana kadar orada kalır.
  - Hareket parmağı ekranın neresine kayarsa kaysın en yakın yön basılı kalır (◀ ▶ arasındaki
    orta çizgiye göre). Başparmak kayınca girdi kopmaz; Zıpla'ya kayan hareket parmağı zıplatmaz.
  - Eylem parmağı alanının 1,35 katına kadar basılı kalır; Şut'tan Süper'e kaydırılabilir.
  - Zıpla ile Şut arasına basmak ikisini birden basar (tek başparmakla zıplayıp vurmak, D7).
  - Boşa inen parmak kayarak bir alana girince bağlanır.
- **Varsayılan düzen büyüdü:** ◀ ▶ ve Zıpla yarıçapı 62 → 72 px, Şut 68 → 78, Süper 50 → 60; ◀ ▶
  aralığı 58 px korundu. Yatay telefonda (~2 px/dp) ◀ ▶ ve Zıpla 72 dp, Şut 78 dp çap.
- **Kontrol düzenleyicisi** (`src/scenes/ControlsEditorScene.ts`; Ayarlar → Kontroller →
  Dokunmatik düzen): arka planda canlı demo maç; butonlar sürüklenir, seçili butonun boyutu
  %70–140 (%10 adım), tüm butonların opaklığı (%15–75, 5 kademe), solak modu (hareket sağda,
  eylemler solda; ◀ yine ▶'nin solunda), Sıfırla, Kaydet, İptal (Esc). Soluk halka dokunma alanını
  gösterir. Kurallar: buton tasarım çerçevesinin içinde ve skor tabelası bandının (üst 140 px)
  altında kalır; başka butona 16 px'ten (8 dp) yakınsa kırmızı görünür, bırakınca son geçerli
  yerine döner; büyütme çakışırsa reddedilir.
- **Kayıt** (`src/save/touchPrefs.ts`, anahtar `touchLayout`): konumlar tasarım çerçevesinde (16:9,
  çentiksiz) ve sağ el düzeninde saklanır, çapalar (sol alt / sağ alt) değişmez → her ekran oranında
  ve çentik tarafında aynı düzen (Faz 2.2 notu). Alan alan doğrulama; çakışan düzen bütünüyle
  varsayılana döner.
- **Basma hissi:** basılı görünüm (altın renk, %93 ölçek, opaklık +0,32) olay anında ayarlanır;
  butondan yayılan altın halka (170 ms); hafif titreşim — uygulamada `@capacitor/haptics` 8.0.2
  (MIT; Android Vibrator, `VIBRATE` izni eklentiden), tarayıcıda `navigator.vibrate(8)`. Ayarlar →
  Kontroller → Titreşim ile kapanır. Web derlemesinde eklenti boş modüle yönlenir
  (`vite.config.ts` → `resolve.alias`): Capacitor çekirdeği web paketine ve PWA önbelleğine girmez.
- **Giriş gecikmesi ölçer** (`src/input/latencyProbe.ts`, `src/ui/LatencyMeter.ts`; Ayarlar →
  Kontroller → Gecikme ölçer): maçta alt ortada canlı satır. Aralıklar: sistem (dokunuş olayının
  zaman damgası → olay işleyici), oyun bekletmesi (işleyici → girdiyi okuyan simülasyon adımı),
  dokunuş→kare (dokunuş → o adımın çizildiği karenin gönderilmesi). Son 120 örneğin medyanı ve
  p95'i. Simülasyon akmıyorken (duraklatma, gol tekrarı) yapılan basış 250 ms sonra atılır.
- **Yerel 2 oyuncu prototipi:** 2 Oyuncu modunda dokunmatik cihazda her oyuncuya ekranın bir
  yarısı (`TOUCH.twoPlayer`; P1 sol, P2 ayna). Hareket dış kenara, eylemler ortaya sabitli;
  yarıçaplar 46–58 px. P2 kodları `Touch2*` (`CONTROLS.touch2`). Ekran
  `TOUCH.twoPlayer.minDiagonalInch`'ten küçükse (şimdilik 0 = her cihaz) P2 yalnızca gamepad /
  klavyeyle oynar ve dokunmatikte yalnızca P1 butonları görünür.
- **Menü:** Ayarlar'daki "Kontrol Şeması" yerine "Kontroller" alt menüsü: Dokunmatik düzen,
  Titreşim, Gecikme ölçer, Kontrol şeması (yardım sayfası), Geri. Ayarlar listesi uzamadı.
- **Testler:** `src/input/touchControls.test.ts` (yerleşim, dp tabanları, solak ayna, 2 oyuncu,
  yönlendirici, düzenleyici kuralları, kayıt doğrulama, gecikme ölçer); `screenFrame.test.ts`'e
  solak ve 2 oyuncu düzenleri her oran × çentik için; `e2e/smoke.spec.ts`'e gerçek dokunma
  olaylarıyla (CDP) iki parmak ▶ + Şut, görselin dışına basma ve gecikme ölçer (web + mobil, CI'da
  koşar); `e2e/screens.spec.ts`'e düzenleyici → sürükle → büyüt → solak → kaydet → maçta solak
  düzen, 2 oyuncu görüntüleri (20:9, 16:9, 4:3).

### Telefon testi ve düzeltmeler (2026-11-26)

Geliştiricinin bulguları ve yapılanlar:

- **"Yakına basmak çalışıyor ama çok az dışında; sola basınca tamamen sola gitsin, solda basılacak
  başka yer yok. Sağda da biraz daha büyüsün ama yanlış basılmasın."** → `TOUCH.moveZone`: ◀ ▶'yi
  kapsayan hareket bölgesi dış yanda ve altta **ekran kenarına kadar** (çentik tarafındaki görünür
  kenar dahil), üstte 130 px, ▶'nin ötesinde 130 px uzar; iç yan en yakın eylem butonuna olan
  boşluğun yarısını geçmez (varsayılan düzende bölge x ≈ 522'de biter, Zıpla 938'de başlar).
  Butonların kendi dokunma alanı önceliklidir; bölge yalnızca hiçbir alana düşmeyen parmağı yakalar.
  Solakta ve 2 oyuncuda da her oyuncunun kendi kenarına uzanır (2 oyuncuda iç yan dar: kendi
  Zıpla'sına olan boşluğun yarısı). Düzenleyicide soluk çerçeveyle görünür.
- **"iPhone'da butonlar aşırı küçük."** iPhone'da oyun web sürümüyle (Safari) açılıyor; butonlar oyun
  pikseliyle, yani ekran yüksekliğiyle orantılı ve Safari'nin çubukları yüksekliği yiyor. →
  `autoScale`: varsayılan düzen ◀ ▶ en az 72 dp (iOS'ta pt) çapta olacak kadar büyür (0,1 adım, en
  çok ×1,4); butonlar ve köşeye uzaklıkları birlikte büyüdüğü için düzen geçerli kalır. Oyuncu
  düzenleyicide düzeni değiştirip kaydettiyse onun boyutları korunur (`custom`); "Sıfırla" ekrana
  göre büyüyen varsayılana döner. Kayıt artık konumları yalnızca düzen değiştirildiyse tutar; eski
  kayıtlardaki konumlar oyuncunun düzeni sayılır. Örnek: 2,6 px/dp (≈ 277 pt yükseklik) → ×1,3.

Geliştirici bu iki düzeltmeden sonra fazın tamamlandı işaretlenmesini istedi. Düzeltmeler, telefonda
gecikme ölçümü ve iki kişiyle 2 oyuncu cihazda ayrıca denenmedi (PROGRESS.md notları: 2.4, 4.7).

### Giriş gecikmesi — tarayıcı ölçümü (referans, gerçek telefon değil)

Masaüstü Chrome, mobil derleme, 1280×720, CDP dokunma olayları, 60 basış, 60 Hz ekran:

| Senaryo                                   | n   | Dokunuş→kare medyan / p95 | Oyun bekletmesi (medyan) | Sistem (medyan) |
| ----------------------------------------- | --- | ------------------------- | ------------------------ | --------------- |
| 2 oyuncu, Süper butonu (top teması yok)   | 60  | 20,5 / 27,2 ms            | 9,8 ms                   | 9,7 ms          |
| CPU maçı, Zıpla (topa vuruş, gol, tekrar) | 19  | 18,4–22,4 / 101–108 ms    | 9,9 ms                   | 9,2 ms          |

- Oyun bekletmesi medyanı ~10 ms, en çok 1 simülasyon adımı (16,7 ms) → QUALITY_BAR D6'nın "oyunun
  eklediği gecikme ≤ 1 adım" kısmı tarayıcıda sağlanıyor.
- İkinci senaryodaki p95 uçları vuruş anındaki **hit-stop**'tan: sunum katmanı simülasyonu 40–60 ms
  bekletiyor, o arada basılan tuş adımı bekliyor. Tasarım gereği; Faz 2.9 / 3.6'da his ayarıyla
  birlikte değerlendirilmeli (notlarda). Kayıp örnekler (19/60) gol tekrarı sırasında yapılan
  basışlar — ölçüme girmez.
- "Dokunuş→kare" ekranın kendisini (GPU, birleştirici, panel) içermez; tam süre telefonda kamerayla
  ölçülür (aşağıda).

### Telefonda giriş gecikmesi nasıl ölçülür

**A. Uygulama içi ölçer (oyunun ve sistemin payı)**

1. Telefonu USB ile bağla, `npm run cap:sync`, Android Studio'da ▶ Run (README → "Android'de
   çalıştırma"). Güç tasarrufu kapalı olsun.
2. Oyunda Ayarlar → Kontroller → Gecikme ölçer: **Açık**.
3. 2 Oyuncu maçı başlat (top az değsin diye; hit-stop ölçümü şişirmesin).
4. Süper ya da Şut butonuna 1–2 saniyede bir, toplam 60–80 kez kısa kısa bas (basılı tutma).
5. Alt ortadaki satırı oku: `Dokunuş→kare A ms (p95 B) · oyun bekletmesi C ms · sistem D ms · n=E`.
   E ≥ 50 olunca ekran görüntüsü al.
6. Hedefler: C ≤ 16,7 ms (D6, oyunun payı); A'nın medyanı ≲ 50 ms olmalı ki ekranla birlikte
   80 ms'nin altında kalsın.

**B. Kamera ile uçtan uca (dokunuştan ekranda görünmeye — D6'nın 80 ms hedefi)**

1. İkinci bir telefonda ağır çekim video aç (240 fps ideal, en az 120 fps). Ekran parlaklığını
   yüksek tut, ortam aydınlık olsun.
2. Test telefonunu masaya koy, Antrenman maçını aç. Kamerayı yandan-üstten tut: parmak, buton ve
   karakter aynı karede görünsün.
3. Butona hızlı ve net dokun. 10 dokunuş kaydet; aralarında 1–2 saniye bekle.
4. Videoyu kare kare oynat (galeride ya da bilgisayarda; DaVinci Resolve'da ← → kare atlar). Her
   dokunuş için:
   - **K1:** parmağın camla ilk temas ettiği kare (parmak ucu yassılmaya başlar),
   - **K2:** butonun altın renge döndüğü ya da karakterin hareket ettiği ilk kare.
5. Gecikme (ms) = (K2 − K1) × 1000 ÷ fps. 240 fps'de bir kare 4,2 ms, 120 fps'de 8,3 ms.
6. 10 değerin medyanını al. Hedef ≤ 80 ms (QUALITY_BAR D6). Buton rengi ve karakter hareketi için
   iki ayrı sayı yaz: aradaki fark simülasyon adımı + çizim payıdır.
7. Sonuçları (telefon modeli, fps, medyan, A'daki satır) yaz: QUALITY_BAR'a ve buraya işlenir.

## Faz 2.4 — Performans (2026-11-26 → 2026-11-27, tamamlandı)

Özet ve bitti kriterleri: [PROGRESS.md § Faz 2.4](../PROGRESS.md). Geliştiricinin isteğiyle faz mevcut
verilerle kapandı; pil (P5) ve kamerayla uçtan uca gecikme ölçülmedi (Faz 4.6). Ölçümlerin hepsi geliştiricinin
test telefonunda (QUALITY_BAR referans sınıfı): **realme 12 kite (RMX3890)** — Snapdragon 685
(SM6225), Adreno 610, 8 GB RAM, 1080×2400 60/90 Hz panel, Android 15, Android System WebView 158.
Telefon USB'yle bağlıyken uygulamanın WebView'ına DevTools protokolüyle bağlanıldı
(`npm run bench -- --device`); dokunuşlar `adb shell input tap` ile gerçek dokunma olayıydı.

### 1. Profil: neden 30 FPS?

Başlangıçta (HEAD `90babcc`, Yüksek kalite, AI vs AI Zor) oyun telefonda **29–30 FPS'e kilitliydi**:
kare aralıklarının %99'undan fazlası 20 ms'yi aşıyordu, ama ana iş parçacığının işi kare başına
yalnızca ~7–9 ms'ydi. Darboğaz CPU değil GPU / sürücü tarafındaydı. Adım adım daraltma (her satır
10 sn, çoğu iki tur):

| Deney (HEAD, aynı derleme, `?gl=` geliştirici bayrağıyla)  | FPS         | Çizim/kare |
| ---------------------------------------------------------- | ----------- | ---------- |
| Yüksek kalite (varsayılan)                                 | 29,2 / 30,6 | 87         |
| MSAA kenar yumuşatma kapalı                                | 31,6 / 30,9 | 87         |
| Toplu çizim başına 16 doku (`autoMobileTextures: false`)   | 30,5 / 30,8 | 21         |
| İkisi birden                                               | 29,2 / 29,2 | 21         |
| Düşük kalite (hüzme, parlama, kalabalık animasyonu kapalı) | 46,1 / 48,2 | 77         |

Çizim çağrısı 4 kat azalınca bile FPS değişmedi; Düşük kalite fark yarattı. Katmanları tek tek
gizleyerek (5 sn'lik FPS sayımı):

| Gizlenen (HEAD, Yüksek)               | FPS         |
| ------------------------------------- | ----------- |
| Hiçbiri                               | 26,8        |
| Tüm stadyum                           | 56,6        |
| Kule parlamaları + pano ışıması (ADD) | 42,1        |
| HUD + dokunmatik butonlar             | 38,1        |
| Işık hüzmeleri (ADD)                  | 32,9        |
| Kalabalık / bulutlar                  | 32,4 / 32,1 |
| Gökyüzü (ekranın yarısı)              | 29,9        |

Ekranın yarısını kaplayan gökyüzü neredeyse etkisiz, iki küçük parlama ise en büyük farkı
yaratıyordu: piksel sayısı değil, **toplamalı (ADD) karışım kipine her geçiş** pahalıydı. Doğrudan
test: aynı pikselleri çizerken yalnızca karışım kipini NORMAL yapmak — iki kule parlaması 30,5 →
**40,3 FPS**, sahnedeki tüm ADD nesneleri → **54,8 FPS**.

Kök neden bir karenin WebGL çağrı kaydında: karışım kipi (ya da çizici) her değiştiğinde Phaser 4
toplu çizimi boşaltıyor ve köşe tamponunu `bufferSubData` ile baştan yazıyor (karede 28 kez).
Phaser'ın tamponu varsayılan olarak **16.384 dörtgenlik (~1,8 MB)**. Mobil sürücüler (Adreno) aynı
karede hâlâ okunan bir tamponun üstüne yazılınca tamponun tamamını kopyalıyor: karede ~50 MB kopya.
Doku değişimleri ise ucuz (aynı tampondan farklı aralık çizilir, yeniden yükleme yok) — çoklu
dokunun FPS'e etki etmemesi bundan.

| Toplu çizim tamponu (`batchSize`, dörtgen) | FPS  | 20 ms'yi aşan aralık |
| ------------------------------------------ | ---- | -------------------- |
| 16.384 (Phaser varsayılanı)                | 30,2 | 303 / 304            |
| 4.096                                      | 58,7 | 26 / 589             |
| **1.024**                                  | 59,9 | 2 / 600              |
| 256                                        | 59,9 | 3 / 599              |

1024 seçildi (`DISPLAY.batchQuads`): bir karede tek toplu çizime düşen dörtgen sayısı bunun altında
(256'da çizim çağrısı hafifçe artıyor, 1024'te artmıyor). Masaüstü GPU'da etkisi yok.

### 2. Değişiklikler ve önce/sonra ölçümleri

Her değişiklik ayrı derlemeyle, **aynı WebView'da dönüşümlü** ölçüldü: derlemeler bilgisayardan
sunuldu, telefon `adb reverse` ile erişti (yeniden kurulum yok; ısınma derlemelere eşit dağıldı).
Yüksek kalite, AI vs AI Zor (tohum 11, Kor – Ayaz), 3 koşu × 15 sn, koşu medyanları:

| Cihaz                      | İş ort. | İş p99   | Aralık > 20 ms | > 50 ms | Aralık p99 | FPS      | Çizim/kare |
| -------------------------- | ------- | -------- | -------------- | ------- | ---------- | -------- | ---------- |
| HEAD                       | 6,89 ms | 14,50 ms | 1364 / 1370    | 6       | 45,7 ms    | 30,4     | 83,5       |
| + tampon 1024 + dikdörtgen | 7,22 ms | 11,20 ms | 8 / 2695       | 0       | 18,7 ms    | **59,9** | 81,3       |
| + ADD sırası + ikonlar     | 7,32 ms | 10,80 ms | 6 / 2695       | 0       | 17,8 ms    | 59,9     | 79,3       |
| + kalabalık atlası         | 6,92 ms | 11,10 ms | 40 / 2685      | 1       | 19,0 ms    | 59,8     | 72,5       |
| (atlas, ters sırayla)      | 7,17 ms | 10,90 ms | 13 / 2695      | 0       | 18,5 ms    | 59,8     | 72,5       |

İş süresi HEAD satırıyla doğrudan kıyaslanmaz (30 FPS'te bir kareye daha çok iş düşer). Geç kare
sayısı (6–40 / 2700) tekrarlar arasında dalgalanıyor; FPS aynı.

Masaüstü (headless Chrome 158, RTX 5060; CPU yavaşlatma DevTools ile; 3 × 8 sn; masaüstünde Phaser
toplu çizim başına 16 doku kullanır):

| CPU | Derleme               | İş ort. | İş p99  | Çizim/kare |
| --- | --------------------- | ------- | ------- | ---------- |
| 1×  | HEAD                  | 0,73 ms | 1,50 ms | 21,5       |
| 1×  | + tampon + dikdörtgen | 0,66 ms | 1,20 ms | **14,4**   |
| 4×  | HEAD                  | 2,84 ms | 5,00 ms | 21,5       |
| 4×  | + tampon + dikdörtgen | 2,66 ms | 4,60 ms | 14,4       |

Masaüstünde çizim çağrısı Phaser 3 düzeyine (13,5) döndü (Faz 2.0 maliyet notu #1).

**Değişiklikler** (# = PROGRESS'teki Faz 2.0 "Phaser 4 maliyetleri" notunun maddesi):

1. **Toplu çizim tamponu 16.384 → 1.024 dörtgen** (`DISPLAY.batchQuads`, `main.ts`) → cihazda
   30 → 60 FPS.
2. **Maçtaki 18 `Rectangle` → `solidRect`** (beyaz doku + ton; #1): direkler, kale içi, skor
   parlaması, ekran flaşı, pano ışıması, tekrar şeritleri. `Rectangle` ayrı toplu çiziciden
   geçiyordu (her geçişte boşaltma); ekran flaşı ve skor parlaması dolgu saydamlığı 0 iken de her
   karede çiziliyordu (her karede boşuna tam ekran doldurma). Masaüstü çizim 21,5 → 14,4.
3. **Stadyumda toplamalı nesneler art arda** (#2): `kule, kule, parlama, parlama, …, hüzme, hüzme,
pano ışıması, panolar` → 8 yerine 4 karışım geçişi. Parlamalar diğer kuleyle, pano ışıması
   panolarla örtüşmez; toplamalı karışım kendi arasında sıradan bağımsız → görüntü aynı.
4. **Kalabalık atlası:** 6 sıra × oturan/ayakta = 12 doku → tek 1804×600 doku (12 şerit, 2 px
   boşluk). Şeritler eskisiyle piksel piksel aynı. Cihazda çizim 79,2 → 72,5, iş −%3–5.
5. **İkon dokuları doğrudan Canvas 2D** (#5): `Graphics.generateTexture` Phaser'ın Canvas çizicisini
   kullanıyordu; artık küçük bir `Pen` arayüzü + `CanvasPen`. 6 ikon piksel piksel aynı.
6. **`LiteGraphics` çizgi parçasında `Math.hypot` → `Math.sqrt`** (#3; yalnızca çizim): mobil JIT'te
   yerleşik çağrı sayıları kutulayabiliyor.
7. **WebView ayarları ve maçta ekranın açık kalması** (aşağıda, bölüm 8).
8. **Tek seferlik takılma** (#4, ilk kullanımda gölgelendirici derlemesi): ısıtma eklenmedi.
   Takılma günlüğünde ilk kullanım takılmaları yalnızca yükleme ekranında ve maç açılışında (santra,
   solma perdesinin arkasında; ekran geçişi). Oyun akarken görülen seyrek takılmalar ilk dakikada
   toplanmıyor; nedeni GC (bölüm 4).

**Denenip alınmayanlar (ölçümle):**

- **Toplu çizim başına 16 doku** (`autoMobileTextures: false`): düzeltmeden sonra çizim 79 → 12, iş
  −%9, ama FPS aynı (59,7 ↔ 59,5–59,8); stres sahnesinde bir turda 6 takılma (58,5 FPS), diğerinde
  fark yok. Phaser'ın mobil varsayılanı (tek doku) kaldı.
- **MSAA kapatmak:** FPS değiştirmedi; görüntü kalitesi için açık kaldı.
- **Canvas çizicisini paketten çıkarmak:** yalnızca **3,0 kB gzip** (10 kB ham) kazanç; WebGL'siz
  cihazda (engellenmiş GPU) oyun hiç açılmazdı. Yedek olarak kaldı.
- **Bütün dokuları çalışma zamanında tek atlasa toplamak:** doku değişimi bu cihazda FPS'i
  sınırlamıyor (çoklu doku deneyi); yalnızca en çok değişime yol açan kalabalık toplandı. Final
  görseller atlas olarak gelecek (ART_BIBLE §13.4, Faz 3.1).

Paket boyutu (mobil yayın derlemesi, tezgâhın gzip'i): 316,8 → 317,3 kB (+0,5 kB; geliştirici
araçları yayın paketinde yok).

### 3. Bellek ayırma ve GC (QUALITY_BAR P7)

Ölçüm iki ayrı pencerede: önce yalnızca iz kaydı (ana iş parçacığındaki `MinorGC`/`MajorGC`
duraklamaları), sonra yalnızca yığın örneklemesi (GC'de toplananlar dahil). Yığın örnekleyici GC'yi
yavaşlattığı için ilk denemede (ikisi aynı anda) en uzun GC cihazda 44–81 ms görünmüştü; ayrı
ölçünce:

| Ölçüm (2 × 15 sn) | Ayırma/kare | Ayırma hızı | GC sayısı | GC toplam | En uzun GC |
| ----------------- | ----------- | ----------- | --------- | --------- | ---------- |
| Cihaz HEAD        | 325 kB      | 8,5 MB/sn   | 39        | 52,7 ms   | 9,6 ms     |
| Cihaz Faz 2.4     | 265 kB      | 15,6 MB/sn  | 33        | 59,9 ms   | **3,1 ms** |
| Masaüstü HEAD     | 164 kB      | 29,4 MB/sn  | 69        | 19,8 ms   | 3,7 ms     |

GC zamanın %0,4'ü; en uzun duraklama + kare işi (~7 ms) bütçenin çok altında. Ayırmanın ~%85'i
Phaser'ın içinde: kap çizicisi her çocuk için her karede iki kez `setAlpha` çağırıyor, resim
gönderim yolu (`SubmitterQuad`) ve doku sayımı (`finalizeTextureCount`) sayıları kutuluyor, karışım
geçişinde yeni `DrawingContext` kuruluyor. Bizim kodumuzda nesneler havuzlu; kalan pay sayı
kutulamaları ve simülasyondaki temas sonucu nesneleri (PROGRESS notu: 2.7).

### 4. Hedef boyutta stres sahnesi ve rollback (P1–P3, P9)

`src/dev/StressLayer.ts` (yalnızca geliştirici derlemesi): bugünkü stadyum gizlenir, yerine
ART_BIBLE §10.2'nin parallax katmanları final doku boyutlarında gelir (K0 gökyüzü ve K1 silüet
@0,5x tam tuval 1312×752, K2 tribün 2624×560, K3 panolar, K4 zemin, K5 ön plan @1x, kalabalık
2048×1024 modül atlasından 48 kıpırdayan parça); her oyuncunun üstüne 22 parçalı vekil karakter
(1024² atlas, parçalar kod animasyonuyla döner; bugünkü karakterler de çizilir — yük finalden
fazla); aynı anda 60 parçacık. Doku belleği oyunla birlikte ~65 MB (stres katmanı ~37 MB).
Mantıksal çözünürlük 1280×720 (tuval telefonda 1600×720).

Rollback ölçer (`src/dev/rollbackProbe.ts`): canlı simülasyona dokunmadan her adımdan önce durum
halka tampona kaydedilir; her karede ayrı bir gölge simülasyon 8 adım önceki durumu yükleyip
kaydedilen girdilerle 8 adım ilerler (en kötü durum: her karede geri sarma) ve her 10 karede vardığı
durum canlı durumla alan alan karşılaştırılır.

**15 dakikalık stres testi** (2026-11-27; geliştirici derlemesi uygulama olarak; `?devtest=stress`,
AI vs AI Zor; telefon USB'de şarj olurken, pil %9 sabit, güç tasarrufu kapalı — aynı derlemenin
15 sn'lik kontrolü %70 pildeki dünkü ölçümle aynıydı: 59,9 FPS, iş 6,45 ms). Rapor 16. dakikada
okundu. Pil sıcaklığı ve bellek `adb` ile dakikada bir:

| Dk  | FPS   | İş ort. | İş p99 | Aralık p99 | > 20 ms | > 50 ms | Pil °C | Uygulama PSS | Çizici PSS |
| --- | ----- | ------- | ------ | ---------- | ------- | ------- | ------ | ------------ | ---------- |
| 1   | 58,94 | 7,33    | 14,6   | 21,9       | 76      | 1       | 29,0   | 229 MB       | 222 MB     |
| 2   | 59,86 | 6,64    | 10,8   | 19,5       | 24      | 0       | 29,5   | 230 MB       | 204 MB     |
| 3   | 59,81 | 6,66    | 10,4   | 20,2       | 37      | 0       | 29,5   | 230 MB       | 213 MB     |
| 4   | 59,72 | 6,85    | 11,4   | 21,3       | 43      | 0       | 30,5   | 230 MB       | 214 MB     |
| 5   | 59,81 | 7,08    | 9,9    | 19,4       | 18      | 0       | 30,5   | 230 MB       | 210 MB     |
| 6   | 59,79 | 7,13    | 10,7   | 19,6       | 33      | 0       | 30,5   | 230 MB       | 212 MB     |
| 7   | 59,84 | 7,07    | 10,4   | 18,7       | 10      | 0       | 31,0   | 230 MB       | 207 MB     |
| 8   | 59,70 | 7,02    | 11,2   | 20,3       | 39      | 1       | 31,0   | 221 MB       | 210 MB     |
| 9   | 59,77 | 6,68    | 10,0   | 19,1       | 16      | 0       | 31,0   | 222 MB       | 214 MB     |
| 10  | 59,73 | 6,68    | 10,1   | 19,4       | 17      | 1       | 31,0   | 222 MB       | 218 MB     |
| 11  | 59,56 | 6,65    | 9,8    | 19,7       | 29      | 1       | 31,0   | 222 MB       | 218 MB     |
| 12  | 59,79 | 6,96    | 10,3   | 18,8       | 9       | 1       | 31,0   | 222 MB       | 219 MB     |
| 13  | 59,77 | 6,75    | 10,3   | 19,2       | 15      | 0       | 31,5   | 222 MB       | 219 MB     |
| 14  | 59,83 | 7,11    | 10,2   | 18,6       | 7       | 0       | 31,5   | 222 MB       | 219 MB     |
| 15  | 59,71 | 7,15    | 11,6   | 20,6       | 40      | 1       | 31,5   | 222 MB       | 220 MB     |
| 16  | 59,74 | 7,09    | 10,3   | 19,1       | 22      | 1       | 31,5   | 223 MB       | 219 MB     |

Tüm oturum: **59,70 FPS** (60.669 kare), kare işi ort. 6,93 ms / p99 10,6 ms, **%99,91'i bütçede**,
kare aralığı **p99 19,6 ms**, 20 ms'yi aşan aralık %0,76, **50 ms'yi aşan 8**. Son dakika ilk
dakikadan 0,8 FPS **hızlı** (ısınmayla yavaşlama yok), kalite kademesi hep Yüksek, termal durum hep 0
(yavaşlatma yok), pil 28,5 → 31,5 °C. Değerlendirme: P1 ✅, P3 ✅, P4 ✅, **P2 ❌**.

**Rollback (P9):** 15 dakikada 34.577 ölçüm — ort. **0,51 ms**, p99 **1,1 ms**, en kötü 15,0 ms (tek
aykırı değer; aşağıdaki GC duraklamasının ölçüm penceresine denk gelmesi), gölge ↔ canlı durum
3.457 denetimde **0 fark**. Bütçe aşımını saymak için tekrar (5 dk, aynı sahne): ort. 0,54 ms, p99
1,2 ms, p99,9 2,1 ms, en kötü 4,1 ms; 10.877 ölçümden **1'i** 4 ms'yi aştı; 1.087 denetimde 0 fark.
Kayıt 0,08 ms + yükleme ve 8 adım 0,43–0,46 ms (masaüstünde toplam 0,08 ms). Bütçenin ~%15'i:
2.7'nin deterministik `sin/cos/atan2/exp/pow`'u için pay geniş.

**50 ms'yi aşan karelerin nedeni.** Geliştirici araçlarına takılma günlüğü eklendi (her takılmanın
anı, kare işi, maç evresi, tekrar oynuyor mu). Bugünkü görsellerle normal maç (5 dk, `?devtest=soak`):
59,71 FPS, iş 6,24 ms (p99 9,7), %99,88 bütçede, aralık p99 19,1 ms; takılmalar: santrada sahne açılışı
(353 ms; ekran geçişi, P2 dışı) ve oyun akarken **3** (54, 51, 70 ms). Stres sahnesi (5 dk): oyun akarken
3 (66, 62, 76 ms). Hepsinde o karenin işi yalnızca **3–9 ms**: zaman kare işinin dışında, iki kare
arasında gidiyor. İlk dakikada toplanmıyor (gölgelendirici derlemesi değil), yalnızca biri gol
tekrarında. 2 dakikalık iz kaydında ana iş parçacığında 359 GC (toplam 565 ms, %0,47) ve **bir
MajorGC 25,4 ms**; geri kalanların hepsi 10 ms'nin altında. 25 ms'lik duraklama + ~7 ms kare işi 2–3
vsync kaçırtıyor. Sonuç: oyun akarken ~1–2 dakikada bir 50–75 ms'lik takılma, kaynağı V8'in büyük
GC'si. Ayırmanın ~%85'i Phaser'ın içinde olduğu için bu fazda kapatılamadı (PROGRESS notu: 3.x).

### 5. Bellek (P6), açılış (A1/A2), giriş gecikmesi (D6)

**Bellek (P6)** — `adb shell dumpsys meminfo` (TOTAL PSS; MB = KB ÷ 1024). Android WebView'da oyun iki
süreçte: uygulama süreci (WebView'ın tarayıcı ve GPU tarafı; GPU dokuları ve çerçeve tamponları
"Graphics" ≈ 76 MB) ve WebView çizici süreci (JavaScript, tuvaller).

| Durum                          | Uygulama   | Çizici     | Toplam         | 15 dk büyüme    |
| ------------------------------ | ---------- | ---------- | -------------- | --------------- |
| Normal maç (bugünkü görseller) | 191–194 MB | 175–177 MB | **366–371 MB** | —               |
| Stres sahnesi (hedef boyut)    | 221–230 MB | 204–222 MB | 428–452 MB     | yok (−%2 / −%1) |

Normal maç hedefin (≤ 400 MB) altında ama payı az; stres sahnesindeki ~37 MB ek doku toplamı ~70 MB
artırıyor: kodla çizilen dokular WebView'da iki kez yer tutuyor (çizici süreçte tuval + GPU'da doku).
Final görsellerle P6'yı tutmak için doku sıkıştırma ya da kaynak tuvali bırakma gerekecek (PROGRESS
notu: 3.1 / 4.5). Bu cihaz 8 GB; referans sınıfı 4 GB olduğu için değerler mutlak izlenir.

**Açılış (A1/A2)** — geliştirici derlemesi, `am force-stop` + `am start -W`, 3 soğuk açılış.
"Menü hazır" geliştirici araçlarının konsol satırı (logcat `Capacitor/Console`), başlangıç
ActivityManager'ın `START` satırı:

| Açılış | Uygulamanın ilk karesi ("Displayed") | Dokunulabilir menü |
| ------ | ------------------------------------ | ------------------ |
| 1      | 1,29 sn                              | 2,86 sn            |
| 2      | 1,09 sn                              | 2,55 sn            |
| 3      | 1,15 sn                              | 2,65 sn            |
| Medyan | 1,15 sn                              | **2,65 sn**        |

Android 12+ simgeye dokunur dokunmaz sistemin açılış ekranını (oyunun simgesi + `#070b26`) çizer;
uygulamanın kendi ilk karesi 1,1–1,3 sn'de geliyor. A1'in "açılış ekranı ≤ 1 sn"i sistem açılış
ekranıyla sağlanıyor; uygulamanın ilk karesi 1 sn'nin biraz üstünde (WebView kurulumu).

**Giriş gecikmesi (D6)** — Faz 2.3 yöntemi A, otomatik: 2 Oyuncu maçında Süper butonuna
`adb shell input tap` ile 60 dokunuş (0,9–1,5 sn arayla), maç içi gecikme ölçer:

| Telefon (realme 12 kite) | Dokunuş→kare medyan / p95 | Oyun bekletmesi (medyan) | Sistem (medyan) | n   |
| ------------------------ | ------------------------- | ------------------------ | --------------- | --- |
| Faz 2.4 derlemesi        | 18,4 / 33,2 ms            | **5,6 ms**               | 9,5 ms          | 60  |

Oyunun eklediği gecikme 1 adımın (16,7 ms) çok altında: D6'nın ilk yarısı ✅. `adb` dokunuşu Android'in
giriş katmanından başlar, dokunmatik panelin tarama gecikmesini içermez; "dokunuştan ekrana ≤ 80 ms"
için kamera ölçümü (yöntem B) gerekiyor — geliştiricide.

**Faz 2.3'ün telefonda denenmemiş düzeltmesi: hareket bölgesi** — CPU maçında gerçek dokunuşla
(`adb shell input swipe`, 1,2 sn basılı; her denemeden önce oyuncu ters yöne çekildi): ekranın sol
kenarı (6 px içeride, ◀'nin dışı) → sola; ◀'nin altı, alt kenardan 40 / 24 / 6 px → sola; ▶'nin
30 px sağı (bölge içi) → sağa. Hepsi doğru. (iPhone'daki otomatik büyütme iPhone olmadığı için
denenmedi.)

**Yüksek yenileme hızı (P8):** panel 90 Hz'e geçebiliyor (ölçümlerin bir kısmında etkin mod 90 Hz);
WebView yine 60 FPS çiziyor. Simülasyon sabit 60 Hz adımla ilerliyor (`FixedStepLoop` testleri,
determinizm testleri); ekran hızı oynanışı değiştirmiyor.

### 6. Determinizm

Simülasyon kodu değişmedi (`src/game`, `src/physics`; yalnızca tekrar modülünden girdi çözücüsü
dışa açıldı). Tezgâhın tarayıcı determinizm testi HEAD ile Faz 2.4 derlemesini karşılaştırdı:
2 senaryo × 119 durum özeti **birebir aynı**, son özetler `388b4da5` ve `24fb1160` — Faz 2.0'daki
Phaser 3 ve Phaser 4 değerleriyle de aynı. 440 birim testi (determinizm testleri ve yeni rollback
testleri dahil) geçiyor. Rollback ölçer telefonda gölge durumu canlı durumla sürekli karşılaştırdı
(bölüm 4).

### 7. Geliştirici araçları ve ölçüm tezgâhı

- **İki derleme kipi:** `npm run cap:sync` (yayın; geliştirici araçları paketten tamamen atılır) ve
  `npm run cap:sync:dev` (`--mode mobile-dev`, `__DEV_TOOLS__`). Geliştirme sunucusu ve testlerde de
  açık. Duman testi yayın derlemesinde `__KAFA_PERF__`'ün ve grafiğin olmadığını denetler (web +
  mobil).
- **Kare süresi grafiği** (`src/dev/perfOverlay.ts`): oyun tuvalinin üstünde ayrı DOM tuvali (oyunun
  toplu çizimine karışmaz, her sahnede görünür), saniyede 4 kez yenilenir. Son 240 karenin aralığı
  (yeşil ≤ 20 ms, turuncu > 20, kırmızı > 50 ms), ana iş parçacığı işi (mavi çizgi), 16,7 / 33,3 ms
  kılavuzları; FPS, iş ort./p99, aralık p99, eşik aşımları, süre, kalite kademesi, doku belleği, JS
  yığını, rollback. Ayarlar → Kontroller → Performans grafiği (kalıcı) ya da `?perf=1`.
- **Dayanıklılık testi / Stres testi (15 dk)** (Ayarlar → Kontroller ya da `?devtest=soak|stress`):
  AI vs AI Zor; dakika dakika FPS, aralık p99, eşik aşımları, kalite kademesi, yığın; 15. dakikada
  P1–P3 sonucu grafiğin altında ve konsolda JSON olarak.
- `?gl=noaa,aa,multitex,monotex,desync,lowpower,batchN`: derleme değiştirmeden WebGL deneyleri.
- Konsol: `__KAFA_PERF__.report()` (JSON), `.reset()`, `.show(true)`.
- **Tezgâh** (`npm run bench`): `--device` (USB'deki telefonda uygulamanın WebView'ı; derlemeler
  bilgisayardan `adb reverse` ile), `--app` (uygulamanın kendi paketi), `alloc` ölçümü (kare başına
  ayırma, en çok ayıranlar, ana iş parçacığı GC'si); kare ölçümüne çizim çağrısı, doku bağlama,
  aralık p99 ve 50 ms aşımı eklendi; mobil derlemeler (`/` tabanı) de sunulur.
- **Android, yalnızca debug:** `android/app/src/debug/` — localhost'a düz HTTP izni (tezgâhın
  sunduğu derlemeler). Yayın derlemesi bu dosyaları almaz.

### 8. WebView ve uygulama ayarları

- `MainActivity`: kaydırma sonu parlaması yok (`OVER_SCROLL_NEVER`), sistem yazı boyutu sayfayı
  büyütmez (`setTextZoom(100)`), çizici süreç görünürken "önemli" öncelikte
  (`RENDERER_PRIORITY_IMPORTANT`; arka planda bu öncelikten vazgeçilir).
- **Ekran maçta kapanmaz:** yerel `ScreenAwake` eklentisi (`FLAG_KEEP_SCREEN_ON`; Android WebView
  Screen Wake Lock API'sini desteklemiyor), web'de Screen Wake Lock API. `setInMatch` ile maç
  boyunca. Gerekçe: maç dokunuşsuz sürebiliyor (gamepad, AI maçı, 15 dk test); ekran zaman aşımı
  maçı karartıyordu.
- WebView hata ayıklaması yalnızca debug derlemesinde açık (Capacitor varsayılanı): `chrome://inspect`
  yalnızca debug APK'da çalışır.

### Kararlar (Claude Code'un verdiği)

1. **`batchSize` 1024.** Ölçümle seçildi; Phaser güncellemesinde korunmalı.
2. **Mobilde toplu çizim başına tek doku** (Phaser varsayılanı) kaldı: çoklu doku bu cihazda FPS
   kazandırmadı, stres sahnesinde bir turda takılma verdi.
3. **Canvas çizicisi yedek olarak pakette** (3 kB gzip). Doku üretimi artık ona bağlı değil; kaldırma
   kararı kapalı testte (12.5) WebGL'siz cihaz oranı görülünce.
4. **Maç içinde düz renk dikdörtgen `solidRect` ile** yapılır; menülerdeki perde dikdörtgenleri
   değiştirilmedi (maç dışı, tek seferlik).
5. **P1 yorumu:** rAF aralığı vsync'e göre ±0,5 ms titrediği için "karelerin ≥ %99'u ≤ 16,7 ms"
   ana iş parçacığının **kare işi** için, "p99 ≤ 20 ms" **kare aralığı** için ölçülür (20 ms'yi aşan
   aralık = 60 Hz'de kaçan vsync). QUALITY_BAR'a yazıldı.
6. **Stres sahnesi ihtiyatlı:** final katmanlar bugünkü stadyumun yerine geçer ama vekil karakterler
   bugünkü karakterlerin üstüne eklenir (finalden fazla yük).
7. **Ekran açık bayrağı maç boyunca** (duraklatmada da); duraklatmada kapatmak 2.5'e not edildi.

### Telefonda ölçüm — adım adım

Bu bölüm geliştiricinin kendi telefonunda tekrar edebilmesi için. Faz 4.6 ve 12.3'te final
görsellerle aynı adımlar tekrarlanır.

**A. Geliştirici derlemesini telefona yükle**

1. Telefonu USB ile bağla (README → "Android'de çalıştırma", bir kez yapılacaklar).
2. Proje klasöründe: `npm run cap:sync:dev`, sonra `npm run cap:open` → Android Studio'da ▶ Run.
3. Oyunda Ayarlar → Kontroller menüsünün altında üç yeni satır görünmeli: **Performans grafiği**,
   **Dayanıklılık testi (15 dk)**, **Stres testi (15 dk)**. Görünmüyorsa yayın derlemesi yüklüdür
   (`cap:sync` ile); 2. adımı tekrarla.
4. İş bitince yayın derlemesine dön: `npm run cap:sync` → ▶ Run.

**B. Kare süresi grafiği (telefonda, bilgisayarsız)**

Ayarlar → Kontroller → **Performans grafiği: Açık** (kayıtlı kalır). Sağ üstte siyah kutu:

- 1. satır: `FPS` (60 olmalı), `iş` (bir karenin işlemci süresi; 16,7 ms'nin altında olmalı),
     `kalite` (2 Yüksek, 1 Orta, 0 Düşük; QUALITY_BAR P4: Orta'nın altına inmemeli).
- 2. satır: `aralık p99` (20 ms'nin altında olmalı), `>20ms` (kaçan kare), `>50ms` (takılma; oyun
     akarken 0 olmalı), geçen süre.
- Çubuklar: her biri bir kare. Yeşil iyi, turuncu kaçan kare, kırmızı takılma. Mavi çizgi işlemci
  işi. Kesik çizgiler 16,7 ve 33,3 ms.

**C. Chrome uzaktan hata ayıklama (`chrome://inspect`)**

1. Telefon USB'de, uygulama (geliştirici ya da normal debug derlemesi) açık.
2. Bilgisayarda Chrome'u aç, adres çubuğuna `chrome://inspect/#devices` yaz.
3. **Discover USB devices** kutusu işaretli olsun. Birkaç saniye içinde listede telefonun modeli
   (RMX3890) ve altında `WebView in com.emengin.kafakafaya` → `https://localhost/` görünür.
   Görünmüyorsa: kabloyu çıkarıp tak, telefondaki "USB hata ayıklamaya izin ver" penceresini onayla;
   Android Studio'nun açık olması sorun değil.
4. **inspect**'e tıkla. Telefondaki ekranın canlı görüntüsüyle DevTools açılır.
5. **Console** sekmesine `__KAFA_PERF__.report()` yazıp Enter → tüm ölçümler JSON olarak (FPS,
   dakika dakika özet, rollback, doku belleği). Sağ tık → "Copy object" ile kopyalanır.
6. İsteğe bağlı: **Performance** sekmesinde ● (kaydet) → 5–10 sn → durdur: hangi işlevin ne kadar
   sürdüğü görülür. **Memory** sekmesi: yığın anlık görüntüsü.

Not: Yayın (release) derlemesinde WebView hata ayıklaması kapalıdır; telefon listede görünür ama
uygulama görünmez. Bu beklenen durum.

**D. 15 dakikalık test: ısınma ve pil (QUALITY_BAR P1–P5)**

Pil ölçümü için telefon **USB'ye takılı olmamalı** (şarj olurken pil yüzdesi anlamsız).

1. Hazırlık: pil en az %50; ekran parlaklığı %50 (Ayarlar → Ekran ve parlaklık); güç tasarrufu
   kapalı; arka planda oyun/video açık olmasın. Telefon oda sıcaklığında olsun (önceden şarjdan yeni
   çıkmış ve ılık ise 10 dk beklet).
2. Ayarlar → Pil'den **pil yüzdesini not et** (ör. %82) ve saati yaz.
3. Oyunda Ayarlar → Kontroller → **Stres testi (15 dk)**. (Bugünkü görsellerle denemek istersen
   **Dayanıklılık testi**.) AI'ya karşı AI maçı başlar, grafik kendiliğinden açılır; ekran maç
   boyunca kapanmaz.
4. Telefonu masaya koy, **15 dakika dokunma.** Ekranı kapatma, başka uygulamaya geçme (test durur).
5. 15. dakikada grafiğin altında iki satır çıkar:
       `15 dk BİTTİ  P1 GEÇTİ  P2 …  P3 …` ve `FPS/dk: 60 60 59 …`. **Ekran görüntüsü al** (güç + ses
       kısma tuşu).
6. Hemen Ayarlar → Pil'den **pil yüzdesini tekrar not et.** Fark ≤ %5 ise P5 sağlanıyor.
7. Isınma: telefonun arkasına dokun — "rahatsız edici sıcak" mı, "ılık" mı? Not et.
8. Bana yaz: başlangıç ve bitiş pil yüzdesi, ekran görüntüsü, sıcaklık hissi.

Satırların anlamı: P1 = karelerin %99'u bütçede ve aralık p99 ≤ 20 ms; P2 = oyun akarken 50 ms'yi
aşan kare yok; P3 = son dakikanın FPS'i ilk dakikadan en çok 2 düşük (ısınmayla yavaşlama yok).

**E. Giriş gecikmesi (QUALITY_BAR D6, Faz 2.3'ten)**

- **Uygulama içi ölçer** (oyunun ve sistemin payı): Faz 2.3 yöntemi A
  ([§ Faz 2.3 → Telefonda giriş gecikmesi nasıl ölçülür](#telefonda-giriş-gecikmesi-nasıl-ölçülür)).
  Bu faz bunu `adb shell input tap` ile otomatik yaptı (sonuç bölüm 5'te); elle tekrarlamak
  istersen yöntem aynı.
- **Kamera ile uçtan uca** (dokunuştan ekranda görünmeye; hedef ≤ 80 ms): Faz 2.3 yöntemi B. İkinci
  bir telefonla ağır çekim (240 fps ideal, en az 120 fps) video gerekir; bunu yalnızca sen
  yapabilirsin. 10 dokunuşun medyanını bana yaz (telefon modeli, kamera fps'i, medyan; buton rengi
  ve karakter hareketi için ayrı ayrı).
