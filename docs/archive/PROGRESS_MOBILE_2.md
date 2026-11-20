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
