# Kafadarlar — Sanat Rehberi (Art Bible)

> **Sürüm:** 1.2 · **Tarih:** 28 Kasım 2026 · **Faz:** 1.4 (v1.1: dünya ve kadro değişikliği, v1.2: ad, [Ek C](#ek-c--değişiklik-günlüğü))
> **Ad:** "Kafadarlar: Kafa Topu Düellosu" (GAME_DESIGN_MOBILE.md K19; eski çalışma adı "Kafa Kafaya")
> **Seçilen stil:** Yön A'nın sıcak el çizimi, dev kafa oranlarıyla (COMPETITOR_ANALYSIS.md §7.1 + NOTLAR.md final testi). Testteki "Mahalle Maçı" adı yalnızca çizim tarzını tarif eder; oyunun dünyası mahalle değil, stadyumdur.
> **Dünya ve kadro:** Stadyumlar (gündüz, gece ışıklı, karlı, yağmurlu; ileride kumsal, çatı gibi eğlenceli sahalar). Kadronun çoğunluğu kurgusal futbolcu tipleri, aralarında birkaç sürpriz komik karakter (bakkal amca, dede, kaleci teyze).
> **Ana referans:** `A/A_02_bakkal_buyuk_kafa.jpg` (çizim tarzı ve oranlar için; sahne ve kostüm için değil)
> **Üretim modeli:** Tek kişi. Konsept yapay zekâ ile, son görsel Inkscape'te elle yeniden çizilir.

**Bu belge nasıl okunur?**

- **MUTLAKA** ve **ASLA** ile başlayan kurallar pazarlık konusu değildir. Diğer sayılar başlangıç değeridir; test sonucuna göre bu dosya güncellenerek değiştirilir. Dosyada yazmayan bir istisna yoktur.
- Tüm piksel değerleri, aksi yazmadıkça **@1x = 1920×1080 tasarım çözünürlüğü** içindir. Karakter ölçüleri **@2x kaynak çizim birimiyle** verilir; @1x değeri bunun yarısıdır.
- Renklerin yanındaki **L\*** değeri CIELAB açıklığıdır (0 siyah, 100 beyaz). Okunurluk kuralları bu değerle yazıldı. Tüm değerler bu belge yazılırken hesaplanarak doğrulandı.

---

## İçindekiler

0. [Altın kurallar (tek sayfa)](#0-altın-kurallar-tek-sayfa)
1. [Stil özeti](#1-stil-özeti)
2. [Renk](#2-renk)
3. [Işık, gölge ve kontur](#3-işık-gölge-ve-kontur)
4. [Görünüm ve oranlar](#4-görünüm-ve-oranlar)
5. [Detay sınırları](#5-detay-sınırları)
6. [Karakter yapısı, varyantlar ve yaylı kafa](#6-karakter-yapısı-varyantlar-ve-yaylı-kafa)
7. [Kadro çeşitliliği](#7-kadro-çeşitliliği)
8. [Yapay zekâ ile konsept üretimi](#8-yapay-zekâ-ile-konsept-üretimi)
9. [Yeniden çizim, sadeleştirme ve "yapay zekâ izi" kontrolü](#9-yeniden-çizim-sadeleştirme-ve-yapay-zekâ-izi-kontrolü)
10. [Saha ve arka plan](#10-saha-ve-arka-plan)
11. [Arayüz, tipografi ve ikonlar](#11-arayüz-tipografi-ve-ikonlar)
12. [Görsel efektler](#12-görsel-efektler)
13. [Dosyalar, çözünürlükler ve isimlendirme](#13-dosyalar-çözünürlükler-ve-isimlendirme)
14. [Kabul kriterleri](#14-kabul-kriterleri)

- [Ek A — palette.json](#ek-a--palettejson)
- [Ek B — Kararlar](#ek-b--kararlar)
- [Ek C — Değişiklik günlüğü](#ek-c--değişiklik-günlüğü)

---

## 0. Altın kurallar (tek sayfa)

1. **Oyundaki her karakter tam profilde ve sağa bakar.** Rakip motor tarafından aynalanır. Ön ve arka görünüm yalnızca model sayfasında referanstır.
2. **Herkesin kafası aynı dairede.** Kafa çapı, boy ve çarpışma alanı tüm karakterlerde aynıdır. Yaş ve beden farkı silüet içi detayla verilir. Kozmetik çarpışmayı asla değiştirmez.
3. **Kalın koyu kahve kontur (#2B1D14), düz renk, tek gölge tonu, sırtta ince sıcak kenar ışığı.** Karakterde gradyan ve doku yoktur.
4. **Detay kafada toplanır.** Yüzde en fazla 2–3 kırışıklık çizgisi vardır. Sakal ve bıyık tel tel değil, düz renk şeklidir.
5. **Gözler, kaşlar ve ağızlar ortak kütüphaneden gelir.** Bu, tutarlılığın ve üretim hızının ana kaynağıdır.
6. **Her karakterin kendine ait bir aksesuar rengi var.** Kadroda iki karakter aynı aksesuar rengini paylaşmaz.
7. **Arka plan karakterden her zaman daha sakindir.** Daha düşük kontrast, daha düşük doygunluk, daha ince ya da hiç kontur kullanılır.
8. **Oynanışı etkileyen her şey kalın konturludur:** karakter, top, kale, zemin. Dekor ince konturludur ya da konturu yoktur.
9. **Formada yazı, rakam, arma ve logo yoktur.** Gerçek kulüp çağrıştıran renk-desen birleşimi kullanılmaz. Gerçek kişiye benzeyen yüz çizilmez.
10. **Yapay zekâ çıktısı asla doğrudan oyuna girmez.** Otomatik iz sürme (image trace) dahil. Her görsel elle yeniden çizilir.
11. **Yalnızca master paletteki renkler kullanılır** (global swatch). Yapay zekâ görselinden damlalıkla renk alınmaz.
12. **Bir görsel, [§14](#14-kabul-kriterleri)'teki kabul listesini geçmeden `assets/` klasörüne girmez.**

---

## 1. Stil özeti

### 1.1 Tek cümlede

> **Stadyumun ışıkları altında, kurgusal futbolcular ve birkaç sürpriz tip dev kafalarıyla kafa kafaya. Sıcak, mizahi ve küçük ekranda bile bir bakışta okunur.**

Stilin üç ayağı:

| Ayak          | Ne demek                                                     | Nasıl sağlanır                                                                              |
| ------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **Sıcak**     | Gün batımı ve projektör ışığının sıcaklığı, samimiyet, mizah | Sıcak palet, turuncu kenar ışığı, krem ve kiremit tonları, mor-gri gölgeler                 |
| **Okunur**    | Telefonda 1 saniyede karakter, top, skor ve "ben hangisiyim" | Dev kafa, kalın kontur, sade yüz, değer (L\*) yapısı, sakin arka plan                       |
| **El yapımı** | Fabrikasyon değil, bir çizerin elinden çıkmış gibi           | Hafif asimetrik silüetler, uçları sivrilen çizgiler, karakterli şekiller. Dağınıklık değil. |

### 1.2 Bu oyun neye benzer, neye benzemez

| ✅ Benzer                                                                                                                        | ❌ Benzemez                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Sıcak ışıklı, samimi bir stadyumda neşeli bir futbol maçı                                                                        | Öfkeli, dişlerini sıkan karikatür futbolcu (Kafa Topu 2 / Head Soccer kalıbı) |
| Dev kafa, minik gövde, kısa bacak, belirgin ayakkabı                                                                             | Gerçekçi oranlar ya da gerçek bir futbolcuya benzeyen yüz                     |
| Nokta gözler, büyük ama sade burun, mizahi aksesuar (ter bandı, atkı, ters kep; sürpriz karakterlerde kasket, pala bıyık, topuz) | Anime/manga gözleri, parlak ve büyük göz bebekleri                            |
| Kalın koyu kahve kontur, düz renk, tek gölge tonu                                                                                | 3D render, plastik/vinil parlaklık, yumuşak airbrush gölge                    |
| Çıkartma (sticker) kadar net silüet                                                                                              | Tarama, ince çizgi dokusu, karikatür dergisi yoğunluğunda detay               |
| Emaye stadyum tabelası, boyalı metal tabela, taktik tahtası ve kâğıt gibi arayüz malzemeleri                                     | 2010 estetiği: parlak gradyan, bevel, gloss hap butonlar, gri eğimli kartlar  |
| Tribün mizahı (golde ayağa fırlayan kalabalık, havalanan atkılar ve bayraklar)                                                   | Neon, glow, e-spor görünümü (Yön B'nin dili). Gece stadyumu da neon olmaz.    |
| Oyun tarzı arketipleri (golcü, stoper, frikikçi) ve birkaç sürpriz tip                                                           | Etnik, bölgesel veya dini klişeler; gerçek futbolcu, kulüp veya stadyum       |
| Sıcak ve davetkâr bir sahne, her yaşa hitap eden ton                                                                             | Çocuk kitabı pastelliği ("çocuk oyunu" algısı)                                |
| Tek elden çıkmış, tutarlı kadro                                                                                                  | Yapay zekâ işi gibi duran "ortalama", parlak ve aşırı detaylı görseller       |

### 1.3 Ana referans: A_02'den ne alınır, ne düzeltilir

**Alınır:** dev kafa oranı (kafa toplam boyun ~%60'ı), nokta gözler ve küçük parlama, büyük yuvarlak burun, kalın koyu kahve kontur, sıcak turuncu kenar ışığı, pembe allık, düz renk bıyık, sade raglan kollu forma, krem zemin üzerinde okunur silüet. A_02 bütün kadronun **çizim** referansıdır; bakkalın kasketi ve bıyığı yalnızca onun kimliğidir, futbolcu tiplerine taşınmaz.

**Düzeltilir:** A_02'ye özel yeniden çizim listesi [§9.4](#94-a_02-için-düzeltme-listesi)'te.

---

## 2. Renk

### 2.1 Renk yönetimi

- **MUTLAKA** tüm dosyalar sRGB'de çalışılır. Dışa aktarmada renk profili sRGB olarak gömülür veya renkler sRGB'ye çevrilir.
- **Tek kaynak:** `art/_palet/` altındaki master palet. Vektör programında **global swatch** olarak tanımlanır, böylece bir rengi değiştirmek tüm dosyalara yansır. Aynı palet `.ase` (Adobe), `.gpl` (Inkscape/GIMP/Krita) ve `palette.json` (oyun kodu, [Ek A](#ek-a--palettejson)) olarak tutulur.
- **ASLA** yapay zekâ görselinden damlalıkla renk alınmaz. Yapay zekâ çıktısı binlerce yakın ton içerir.
- **Yeni renk** gerekiyorsa önce bu bölüme ve palet dosyasına eklenir, sonra kullanılır.

### 2.2 Çekirdek palet (§7.1'den, değişmez)

| Ad                | Hex       | L\* | Rol                                                             |
| ----------------- | --------- | --- | --------------------------------------------------------------- |
| Gün batımı        | `#F28C38` | 68  | Gökyüzünün sıcak bantları, karakter kenar ışığı, sıcak efektler |
| Kiremit           | `#C2562F` | 50  | Tribün çatıları, tuğla, sıcak vurgular                          |
| Krem sıva         | `#F3E3C3` | 91  | İkincil paneller, kâğıt, model sayfası zemini                   |
| Emaye mavi        | `#1F4E9C` | 34  | Arayüz panelleri (stadyum tabelası)                             |
| Mor gölge         | `#3B2F4A` | 22  | Sahne gölgeleri, zemin gölgesi, arka plan gölge çarpanı         |
| Asfalt            | `#4A4E57` | 33  | Zemin                                                           |
| OYNA sarısı       | `#FFD23F` | 86  | **Yalnızca** birincil eylem butonu                              |
| Mürekkep (kontur) | `#2B1D14` | 12  | Tüm konturlar, koyu metin                                       |

### 2.3 Karakter renkleri

**Ten tonları.** Gölge ve allık tonları [§2.9](#29-gölge-ve-ışık-tonu-üretimi)'daki formülle üretildi ve sabitlendi.

| Ton | Taban     | Gölge     | Allık     | L\* taban / gölge |
| --- | --------- | --------- | --------- | ----------------- |
| T1  | `#F7DCC6` | `#D8AC98` | `#F0B0A1` | 89 / 74           |
| T2  | `#EFC29F` | `#D09176` | `#EB9F87` | 82 / 66           |
| T3  | `#DBA57C` | `#BC7658` | `#DE8C70` | 72 / 56           |
| T4  | `#BF8558` | `#A0593A` | `#CC7759` | 60 / 46           |
| T5  | `#93603D` | `#814129` | `#AB5F46` | 46 / 35           |
| T6  | `#6A4029` | `#582719` | `#8E4938` | 32 / 22           |

- **T5–T6 kuralı:** Koyu tende kontur (L\* 12) ile cilt arasındaki fark azalır (T6'da ΔL 20). Bu yüzden kenar ışığı bu iki tonda **eksiksiz** uygulanır (kafa arkası + tepe) ve göz parlaması 1,25 kat büyütülür. Küçük ekran testi T6 karakterle de yapılır.
- **Göz siyahı:** `#140C08` (L\* 4). Konturdan da koyudur; yüzün en koyu noktasıdır. T6 ten üzerinde bile ΔL 28 fark verir.
- **Göz parlaması:** `#FFF9EE` (kırık beyaz).

**Saç renkleri** (gölge tonu formülle üretilir):

| Ad         | Hex       | L\* | Not                                                        |
| ---------- | --------- | --- | ---------------------------------------------------------- |
| Siyah      | `#463630` | 24  | Saf siyah değil. **Kontur her zaman saçtan koyu kalmalı.** |
| Koyu kahve | `#5A3B2A` | 28  |                                                            |
| Kestane    | `#8A4E2E` | 40  |                                                            |
| Bal        | `#C99A55` | 67  |                                                            |
| Kızıl      | `#B5522B` | 47  |                                                            |
| Kır        | `#A8A29C` | 67  | Yaşlı karakterler                                          |
| Beyaz      | `#ECE7DF` | 92  | Yaşlı karakterler. Saf beyaz değil.                        |

Fantezi saç renkleri (mor, mavi tutam vb.) yalnızca kozmetik olarak, aksesuar kütüphanesinden ([§2.7](#27-aksesuar-rengi-kuralı)) seçilir.

### 2.4 Arka plan paleti

Bu bölümdeki değerler v1.0'ın **akşamüstü (gün batımı) setidir** ve sıcak stilin referans ışığıdır. v1.1'de renkler değişmedi; yalnızca kullanım yerleri mahalleden stadyuma çevrildi. `palette.json` anahtar adları ([Ek A](#ek-a--palettejson): `cephe_*`, `duvar`, `kaldirim` vb.) aynen kalır.

**Stadyum varyantları:** Gündüz, gece ışıklı, karlı ve yağmurlu stadyumların gök, tribün ve zemin renkleri henüz yok. Her varyant bu setten türetilir, [§2.1](#21-renk-yönetimi)'deki kuralla (önce bu bölüme ve palet dosyasına) eklenir ve [§2.8](#28-değer-l-yapısı)'deki değer kurallarından geçer. Çim zemin rengi de bu yolla, ilk stadyumla (Faz 4.1) eklenir; o zamana kadar zemin için çekirdek paletteki Asfalt yer tutucudur. İlk stadyumun hangi ışıkta olacağı Faz 4.1'de seçilir.

**Gökyüzü: 4 düz bant.** Pürüzsüz gradyan yerine bant kullanılır: hem stile uyar hem de mobil doku sıkıştırmasında bantlaşma (banding) bozulması yaşanmaz.

| Bant         | Hex       | L\* | Konum                                                                      |
| ------------ | --------- | --- | -------------------------------------------------------------------------- |
| Gök 1 (tepe) | `#5B5893` | 40  | En üst. HUD bunun üstünde okunur.                                          |
| Gök 2        | `#A9739B` | 55  | Oyun yüksekliğinin üst kısmı                                               |
| Gök 3        | `#EE9A6E` | 71  | Tribün silüetinin arkası                                                   |
| Gök 4 (ufuk) | `#FFCF8F` | 86  | **Tribünün arkasında kalır.** Oyun yüksekliğinde görünmez (topla karışır). |

**Diğer arka plan renkleri:**

| Ad                              | Hex       | L\* | Kullanım                                        |
| ------------------------------- | --------- | --- | ----------------------------------------------- |
| Bulut                           | `#EFA894` | ~75 | Düz şekil. Üst kenarda `#FFD08A` ışık çizgisi.  |
| Uzak silüet (K1)                | `#765A80` | ~42 | Tek ton. Üst kenarda `#F2A07A` ışık çizgisi.    |
| Tribün/yapı: krem, gölgede      | `#A8998C` | 64  | Orta plan (K2): koltuk blokları, tribün cephesi |
| Tribün/yapı: sarı, gölgede      | `#A18457` | 57  | Orta plan (K2)                                  |
| Tribün/yapı: açık mavi, gölgede | `#6D7B90` | 51  | Orta plan (K2)                                  |
| Çatı: kiremit, gölgede          | `#863A22` | 34  | Orta plan (K2), tribün çatısı                   |
| Saha kenarı panosu (K3)         | `#B89C86` | 66  | Saha arkası panolar ve duvar                    |
| Pano ışık kenarı                | `#F6C08A` | 81  | Panonun üst kenarı                              |
| Saha kenarı şeridi              | `#8C8A90` | 58  | Zemin çizgisinin hemen altı                     |
| Zemin ışık kenarı               | `#E9B88A` | 78  | **Zemin çizgisi.** Karakterlerin bastığı yer.   |

Tribün/yapı renkleri, §7.1'deki yerel renklerin mor gölge (`#3B2F4A`) ile %40 "Çarp" (Multiply) karışımıdır. Yeni bir tribün veya yapı rengi de aynı yolla üretilir.

### 2.5 Arayüz paleti

| Ad                 | Hex       | Kontrast                     | Kullanım                                                               |
| ------------------ | --------- | ---------------------------- | ---------------------------------------------------------------------- |
| Emaye mavi         | `#1F4E9C` | Kırık beyaz metinle 7,6:1    | Panel dolgusu                                                          |
| Emaye koyu         | `#163A75` | —                            | Panel ve buton kalınlığı (alt kenar)                                   |
| Kırık beyaz        | `#FFF9EE` | —                            | Panel üstü metin, tabela çerçevesi, top. Saf beyaz kullanılmaz.        |
| Krem sıva          | `#F3E3C3` | Kontur metinle 12,9:1        | İkincil paneller, kâğıt (görev listesi)                                |
| OYNA sarısı        | `#FFD23F` | Kontur metinle 11,3:1        | Yalnızca birincil eylem                                                |
| OYNA alt kenar     | `#D9A400` | —                            | Birincil butonun kalınlığı                                             |
| Bildirim kırmızısı | `#CF3A2C` | Kırık beyaz metinle 4,7:1    | **Yalnızca** bildirim rozeti                                           |
| Onay yeşili        | `#2E9E5B` | —                            | Yalnızca tik ikonunun dolgusu. Zemin rengi olarak metinle kullanılmaz. |
| Pasif              | `#B8B2A7` | —                            | Pasif buton dolgusu                                                    |
| Pasif metin        | `#5C564F` | —                            | Pasif buton metni                                                      |
| Kara tahta         | `#2E3A36` | Kırık beyaz tebeşirle 11,3:1 | Maç içi skor tahtası                                                   |
| Ahşap çerçeve      | `#7A4A2A` | —                            | Kara tahta çerçevesi                                                   |

### 2.6 Taraf renkleri, formalar ve renk körlüğü

İki oyuncunun ayırt edilmesi **asla yalnızca renge dayanmaz.** Kimlik dört katmanda verilir:

1. **Konum:** "Sen" her zaman soldasın ([Ek B](#ek-b--kararlar) karar 1). Çevrim içi maçta ekran her cihazda yerel olarak aynalanır; iki oyuncu da kendini solda görür.
2. **"SEN" oku:** Başlama vuruşunda ve her golden sonra 2 saniye kafanın üstünde görünür.
3. **Taraf renkleri:** HUD ve arayüzde kullanılır.
4. **Forma çakışma kuralı:** Sahnedeki iki forma birbirine yakınsa sağdaki oyuncu otomatik olarak alternatif formasına geçer. Sağdaki her zaman rakip olduğu için oyuncu kendini hep ev formasıyla görür.

#### Taraf renkleri (yalnızca HUD ve arayüzde)

| Taraf       | Ana renk          | Kara tahtada (açık varyant) | L\* |
| ----------- | ----------------- | --------------------------- | --- |
| Sol / Sen   | Mavi `#2A6AD8`    | `#8CC4FF` (tahtada 6,5:1)   | 47  |
| Sağ / Rakip | Turuncu `#FFA54A` | `#FFB877` (tahtada 7,0:1)   | 75  |

- Mavi–turuncu çifti renk körlüğüne en dayanıklı çifttir (Okabe-Ito paletinin temeli). Simülasyonda üç renk körlüğü türünde de çift arasındaki fark ΔE2000 ≥ 57, açıklık farkı ΔL 29.
- Turuncu, gün batımı rengine yakındır. Bu yüzden **ASLA** sahnede geniş alan olarak kullanılmaz. Yalnızca skor tahtası, isim plakası ve sonuç ekranı gibi arayüz öğelerinde, koyu ya da emaye zemin üstünde yer alır.

#### Forma renk kütüphanesi (açıklık bantlarına göre)

| Bant                 | Renkler (hex · L\*)                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Koyu** (L\* < 40)  | lacivert `#24346E` · 24 — koyu yeşil `#1F5C40` · 35 — antrasit `#34343C` · 22 — patlıcan `#4E3088` · 28              |
| **Orta** (L\* 45–65) | mavi `#2F6FD6` · 48 — kırmızı `#D2412F` · 49 — yeşil `#2F9A5A` · 57 — turuncu `#EE7A2A` · 64 — pembe `#D9578F` · 56  |
| **Açık** (L\* > 75)  | beyaz `#F4F1EA` · 95 — sarı `#F5C945` · 83 — açık mavi `#8EC6F0` · 78 — nane `#A6E3C6` · 86 — şeftali `#FFC59A` · 84 |

**Çakışma kuralı (koda da uygulanır):** İki formanın ana renkleri

- açıklıkta **ΔL ≥ 20** farklıysa, **veya**
- protanopi, döteranopi ve tritanopi simülasyonlarının **üçünde de ΔE2000 ≥ 25** farklıysa

çift geçer. Aksi halde sağdaki oyuncu alternatif formaya geçer.

Bu kütüphanedeki 14 renkle yapılan testte çakışan 26 çiftin 22'si **aynı banttaydı.** Örnek: kırmızı–yeşil (ΔL 7, en kötü ΔE 10), turuncu–pembe, sarı–şeftali. Kalan dört çift bant sınırında kaldı (koyu yeşil–mavi, koyu yeşil–kırmızı, patlıcan–mavi, turuncu–sarı). Bu yüzden kural "farklı bant" değil, hesaplanan değerdir.

**Test edilmiş güvenli çiftler:** patlıcan–sarı · koyu yeşil–beyaz · kırmızı–açık mavi · antrasit–nane · mavi–turuncu (bu son çift renk körlüğünde çok güçlü, gri tonlamada daha zayıf: ΔL 16).

**Her karakterin üç forması vardır:** ev forması (karakterin imza renkleri) + **açık alternatif** (beyaz tabanlı, ev rengi yakada ve kollarda) + **koyu alternatif** (lacivert, antrasit veya patlıcan tabanlı). Motor, rakibe karşı kuralı geçen ilk formayı seçer. Formalar aynı şekil üzerinde yalnızca renk değişimidir, yani üretim maliyeti düşüktür.

**ASLA kullanılmayacak tek-forma kombinasyonları** (ana + ikincil renk; gerçek kulüp çağrışımı):

- sarı + lacivert · sarı + kırmızı · siyah + beyaz · bordo + mavi
- **İki renkli dikey çizgili forma** (hangi renkler olursa olsun)
- Bayrak, ay-yıldız veya milli takım formasını çağrıştıran tasarım
- Forma üstünde rakam, isim, arma, sponsor ya da logo (aynalama da bunu bozar)

Renk tek başına sorun değildir. Sorun **renk + desen + yaka** birleşimidir. Şüphede kalırsan başka birine "Bu hangi takıma benziyor?" diye sor.

### 2.7 Aksesuar rengi kuralı

**MUTLAKA** her karakterin kendine ait bir aksesuar rengi vardır. Bu renk karakterin **imza aksesuarında** (kasket, gözlük çerçevesi, saç bandı, kask vb.) kullanılır. (Ders: C_02'de herkes turkuaz/sarıydı.)

| #   | Ad            | Hex       | L\* |
| --- | ------------- | --------- | --- |
| 1   | Antrasit      | `#3D3A40` | 25  |
| 2   | Bordo         | `#8E2B3A` | 34  |
| 3   | Domates       | `#E04A3A` | 53  |
| 4   | Pembe         | `#E86FA8` | 63  |
| 5   | Mor           | `#7D4CB8` | 43  |
| 6   | Turkuaz       | `#1BA8BC` | 63  |
| 7   | Çam yeşili    | `#2E7D4F` | 47  |
| 8   | Fıstık yeşili | `#9CCB3B` | 76  |
| 9   | Hardal        | `#B98A12` | 60  |
| 10  | Petrol        | `#1E5F74` | ~37 |
| 11  | Kırık beyaz   | `#F5F0E6` | 95  |
| 12  | Lavanta       | `#C0A8E8` | 73  |

**Kurallar:**

- Kadroda iki karakter aynı aksesuar rengini paylaşmaz. Kütüphanedeki en yakın iki renk bile normal görüşte ΔE2000 ≥ 21 farklıdır.
- Aksesuar rengi kimliğin **ikinci** katmanıdır; birincisi silüettir. Renk körlüğü simülasyonunda bazı aksesuar renkleri birbirine yaklaşır (ör. hardal–fıstık). Bu kabul edilir, çünkü oynanış bilgisi aksesuar rengiyle taşınmaz.
- Aksesuar rengi, **en geniş temas ettiği yüzeyden** (saç bandı için saç, kask için saç, gözlük için ten, boyun aksesuarı için forma) en az ΔL 15 farklı olmalıdır. Aksi halde aksesuar kaybolur. Küçük temas noktalarında ayrımı aradaki kontur sağlar.
- Kütüphane 12 karakterle dolarsa yeni renk eklenir; yeni renk mevcutların hepsinden ΔE2000 ≥ 18 farklı olmalıdır.

### 2.8 Değer (L\*) yapısı

Okunurluğun asıl kaynağı renk değil **açıklık farkıdır.** Oyun yüksekliği bandında (zemin çizgisi ile HUD arası):

| Öğe                                          | L\* aralığı                                  |
| -------------------------------------------- | -------------------------------------------- |
| Göz                                          | 4                                            |
| Kontur                                       | 12                                           |
| Top                                          | ~98 (kırık beyaz) + kalın kontur             |
| Karakter yerel renkleri                      | 22–95 (koyu formalar kenar ışığıyla ayrılır) |
| Gökyüzü (oyun yüksekliğinde görünen bantlar) | 40–72                                        |
| Orta plan tribünler (K2)                     | 34–65                                        |
| Saha kenarı panoları (K3)                    | 50–70                                        |
| Zemin                                        | 25–40                                        |

**Kurallar:**

- Oyun yüksekliği bandında arka planda **L\* < 25 veya L\* > 80 olan geniş alan** (ekranın %3'ünden büyük) yoktur. Böylece kontur (12) ve top (98) arka planla karışmaz.
- Top ile arka plan arasında en az ΔL 25 fark bulunur. Top hangi zeminin önünde olursa olsun okunur.
- **Test:** Her sahne önce gri tonlamada 3–4 değerle taslak olarak çizilir. Karakter ve top, gri taslakta da arka plandan ayrışmalıdır.

### 2.9 Gölge ve ışık tonu üretimi

Gölge tonu her renk için **bir kez** formülle üretilir ve swatch olarak sabitlenir. Çizim sırasında saydam "Çarp" katmanı kullanılmaz; bu hem dışa aktarımı karmaşıklaştırır hem de tonları bulanıklaştırır.

**Gölge formülü (HSB):**

- Ton (H): mora/kırmızıya doğru 8°
- Doygunluk (S): +10 (çok düşük doygunluklu gri ve beyazlarda 0)
- Parlaklık (B): açık renklerde (L\* > 50) −12, koyu renklerde −7

**Sınır:** Gölge, konturdan en az **10 L\*** açık kalır. L\* < 30 olan koyu renklerde gölge çok az uygulanır ya da hiç uygulanmaz; ayrımı kenar ışığı sağlar.

**Örnekler:** turuncu `#EE7A2A` → `#CF4510` · krem `#F3E3C3` → `#D4B795` · mavi `#2F6FD6` → `#1743C4` · sarı `#F5C945` → `#D69327` · beyaz `#F4F1EA` → `#D5D2CD`.

**Kenar ışığı rengi:**

- Koyu ve orta yüzeylerde: gün batımı `#F28C38`
- Turuncu, sarı ve çok açık yüzeylerde: açık kenar `#FFD08A` (kenar ışığı tabandan en az ΔL 8 farklı olmalı)

**Allık:** taban ten rengi ile `#E35D5B` karışımı (%35, T5–T6'da %30). Değerler [§2.3](#23-karakter-renkleri)'te.

---

## 3. Işık, gölge ve kontur

### 3.1 Işık modeli

Karakter ve sahne **farklı** ışık mantığıyla çizilir. Bu bilinçli bir stilizasyondur.

|             | Karakter                                                               | Sahne                                                                                                    |
| ----------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Ana ışık    | Önden-üstten yumuşak dolgu. Yerel renk baskın, yüz her zaman aydınlık. | Gün batımı arkada. Tribünler ve yapılar sırttan aydınlanır, kameraya bakan yüzler mor-gri gölgede kalır. |
| Gölge       | Alttan okunur (bkz. 3.2)                                               | Tribünler gölgede, üst kenarlarda sıcak ışık çizgisi                                                     |
| Kenar ışığı | Sırtta ve kafa tepesinin arka yarısında, sıcak turuncu                 | Tribün çatısı, korkuluk ve pano üst kenarlarında                                                         |
| Düşen gölge | Ayak altında elips                                                     | İzleyiciye doğru, ekranın altına düşer. Sağa veya sola uzun gölge yoktur.                                |

**Neden böyle?**

- **Aynalama güvenliği:** Sağdaki oyuncu, soldakinin aynalanmış halidir. Gölge alttan geldiği için aynalamada bozulmaz. Kenar ışığı sırtta olduğu için karakterle birlikte aynalanır ve tutarlı görünür.
- **Simetrik sahne:** Güneş diski gösterilmez. Gün batımı gökyüzünün genel tonu olarak verilir. Düşen gölgeler ekranın altına düşer; böylece iki taraf da eşit aydınlık görünür.
- **Okunurluk:** Arka plan tribünleri gölgede ve sakin kalır, karakterler ise tam renkle öne çıkar.
- **Diğer stadyum ışıkları:** Gündüz, gece ve hava varyantlarında da sahne ışığı arkadan gelir (gece: tribün arkasındaki projektörler). Işık kaynağı çizilebilir ama parlamasız, düz şekil olarak ([§12.1](#121-efekt-stili)). Karakter ışığı sahaya göre değişmez (bkz. [§10.4](#104-modüler-saha-kiti)).

### 3.2 Gölge (karakter)

- **Tek ton.** İkinci gölge tonu, ara ton veya gradyan yoktur.
- Gölge şu yerlere düşer: kasket ve şapka siperinin altı, saçın alnın üstündeki kenarı, çene altı (kafanın alt %20'si), kolun gövdeye değdiği yer, gövdenin alt üçte biri, şortun bacak tarafı, ayakkabının alt yarısı.
- **ASLA** yüzün ön bölgesine (göz, burun ve ağız alanı) gölge düşmez.
- Gölge şekilleri **sert kenarlı** ve sadedir. En fazla 2 kavisle tanımlanır, tırtıklı ya da lekeli olmaz.

### 3.3 Kenar ışığı

- Kontur çizgisinin **iç tarafında**, ince bir bant olarak çizilir.
- Yer: kafanın arka yarısı ve tepesi, ense, sırt, şapkanın arka-üstü, arka bacağın arka kenarı.
- Silüet çevresinin en fazla **1/3**'ünü kaplar. Bant uçları sivrilerek biter.
- Kalınlık: dış konturun %50–70'i (bkz. 3.5).

### 3.4 Zemin gölgesi (oynanış bilgisi)

- Her karakterin ve topun altında yumuşak kenarlı bir elips bulunur: mor gölge `#3B2F4A`, %40 opaklık.
- **Yükseklikle değişir:** Karakter veya top yükseldikçe elips küçülür (en yüksek noktada %60 boyut) ve soluklaşır (en düşük %15 opaklık). Oyuncu, topun nereye ineceğini bu gölgeden okur. Bu nedenle motorda üretilir, sprite'a çizilmez.
- Gölgenin yerinin hiçbir efekt veya kozmetik tarafından gizlenmemesi gerekir.

### 3.5 Kontur

**Renk:** Tüm karakter, top ve oyun nesnesi konturları `#2B1D14`. İç çizgiler de aynı renktir. Renkli iç çizgi kullanılmaz (arka plan hariç, bkz. 3.6).

**Kalınlık:**

| Çizgi             | @2x kaynak | @1x oyun | Kafa çapına oranı | Nerede                                               |
| ----------------- | ---------- | -------- | ----------------- | ---------------------------------------------------- |
| Dış kontur        | 10         | 5        | %2,8              | Karakter silüeti, top, kale direkleri                |
| İç ana hatlar     | 7          | 3,5      | %1,9              | Kulak, burun, saç ayrımı, bıyık kenarı, forma yakası |
| Detay çizgisi     | 5          | 2,5      | %1,4              | Kırışıklık, kumaş katlanması, tutam çizgisi          |
| Kenar ışığı bandı | 6          | 3        | —                 | Kontur içi                                           |

- A_02'deki kontur kafa çapının yaklaşık %1,8'i. Yeni standart bilerek daha kalın (%2,8), çünkü 720p cihazlarda da dış kontur en az 3,3 px kalmalıdır.
- **Çizgi karakteri:** Çizgi uçları **%30–40 kalınlığa sivrilir** (taper). Köşelerde ve iç bükey bölgelerde kontur hafifçe kalınlaşır (en fazla +%20). Kalınlık bunun dışında sabittir; titrek veya rastgele değişen kalınlık kullanılmaz.
- **Uygulama (Inkscape, [Ek B](#ek-b--kararlar) karar 5):** Genişlik profili **Power Stroke** yol efektiyle verilir. Kayıtlı profiller `art/_sablon/kontur_profilleri.svg` içinde örnek yollar olarak durur; yeni bir yola "Yol Efektini Yapıştır" (Ctrl+7) ile aktarılır. Her çizimde aynı profil kullanılır.
- Power Stroke'un sonucu dolgulu bir şekildir, bu yüzden her ölçekte aynı orana sahiptir. Kontur efekti olmayan düz çizgiler dışa aktarmadan önce "Konturu Yola Dönüştür" ile şekle çevrilir. Her dosyada aynı yol izlenir.

### 3.6 Etkileşim dili: kim kontur alır?

Oyuncu neye çarpabileceğini konturdan anlar.

| Katman                                                                                          | Kontur                                                 |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Oynanış nesneleri: karakter, top, kale direkleri ve üst direk, zemin çizgisi, sahadaki duvarlar | **Tam kontur** `#2B1D14`, 5 px @1x                     |
| Saha arkası (K3: saha kenarı panoları, duvar)                                                   | Yerel rengin %40 koyusu, 3 px @1x                      |
| Orta plan (K2: tribünler, kalabalık)                                                            | Yerel rengin %40 koyusu, 2 px @1x                      |
| Uzak plan (K1) ve gökyüzü (K0)                                                                  | Kontur yok                                             |
| Arayüz                                                                                          | 4 px @1x `#2B1D14`                                     |
| Efektler                                                                                        | Büyük efektler tam kontur, küçük parçacıklar kontursuz |

---

## 4. Görünüm ve oranlar

### 4.1 Tek görünüm kuralı

- **MUTLAKA** oyun içi, arayüz, mağaza, dolap ve avatar görsellerinin hepsi **tam profil (90°) ve sağa bakan** tek görünümden üretilir.
- Rakip, motor tarafından **yatay aynalanır.** Bu yüzden karakterde aynalandığında bozulacak hiçbir şey olmaz: yazı, rakam, logo veya tek tarafa ait anlamlı detay.
- 3/4 görünüm oyunda **kullanılmaz** (C_red'de ret nedeniydi). Ön ve arka görünüm yalnızca model sayfasında referans içindir. Pazarlama görselinde istisna olarak kullanılabilir.
- Bu kural üretim yükünü yarıya indirir: her kozmetik tek açıdan çizilir.

### 4.2 Model şablonu (@2x birim)

Her karakter `art/_sablon/karakter_sablonu.svg` üzerinde çizilir. Şablonda kafa dairesi, yüz ızgarası, eklem noktaları ve zemin çizgisi kilitli katman olarak bulunur.

```
  y (@2x)
  636 ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  taşma sınırı (D + %10): şapka, topuz, saç
  600 ┄┄┄┄┄┄┄┄┄┄╭─────────╮┄┄┄┄┄┄  kafa dairesi tepesi
                │  kemer  │        y 0–0,45: ORTAK KAFA KEMERİ (herkeste aynı)
                │         │
  420           │    +   o│        + daire merkezi = çarpışma merkezi; o göz (y 0,50)
                │         │
                │         │        alt yüz (y 0,60–1,00): karaktere özgü
  262           ╰───X─────╯        X yaylı kafa eklemi (kafa-yerel 0,47 / 0,94)
  240 ┄┄┄┄┄┄┄┄┄┄┄┄┄┌─┴─┐┄┄┄┄┄┄┄┄┄  kafa dairesi altı (gövde üst kenarı daha yukarıda, kafanın altında)
                   │   │           gövde (forma)
  150 ┄┄┄┄┄┄┄┄┄┄┄┄┄├───┤┄┄┄┄┄┄┄┄┄  şort üst kenarı
  100 ┄┄┄┄┄┄┄┄┄┄┄┄┄└┬─┬┘┄┄┄┄┄┄┄┄┄  şort alt kenarı
   40 ┄┄┄┄┄┄┄┄┄┄┄┄┄┄│ │┄┄┄┄┄┄┄┄┄┄  bilek
    0 ══════════════╧═╧══════════  ZEMİN ÇİZGİSİ (ayakkabı tabanı)
```

| Ölçü                                     | @2x             | @1x             | Kural                                                                  |
| ---------------------------------------- | --------------- | --------------- | ---------------------------------------------------------------------- |
| Toplam boy (zemin → kafa dairesi tepesi) | 600             | 300             | Herkeste aynı (ekran yüksekliğinin ~%28'i)                             |
| Kafa dairesi çapı **D**                  | 360             | 180             | Herkeste aynı. Toplam boyun %60'ı.                                     |
| Kafa dairesi merkezi                     | y 420           | y 210           |                                                                        |
| Gövde genişliği                          | 200 / 225 / 250 | 100 / 112 / 125 | İnce / orta / geniş beden (D'nin %55–70'i)                             |
| Gövde görünür yüksekliği                 | ~100            | ~50             | Üst kenar kafanın en az 30 birim içine girer (bkz. 6.4)                |
| Bacak (şort altı → bilek)                | 60              | 30              | Kısa ve kalın                                                          |
| Ayakkabı uzunluğu × yüksekliği           | 100–120 × 45    | 50–60 × 22      | Vuruşun okunması için hafif iri                                        |
| Kol (omuz → el ucu)                      | ~110            | ~55             | El kalça hizasına kadar iner                                           |
| El çapı                                  | ~40             | ~20             | 3 parmak + başparmak, yuvarlak ve sade                                 |
| Top çapı                                 | D'nin %40–50'si | —               | Kesin değeri fizik belirler. Görsel, fizik dairesine **birebir** uyar. |

### 4.3 Kafa zarfı ve çarpışma dairesi (adil oyun kuralı)

- Kafa silüeti, kafa dairesinin alanının **en az %90'ını** doldurur.
- **Taşma payı:** Saç, şapka, siper, topuz, bıyık ve kulak daireden en fazla **D'nin %10'u** (@2x 36 birim) dışarı taşabilir. Bu pay her yönde ve her karakter için aynıdır.
- **MUTLAKA** çarpışma dairesi herkes için aynıdır ve görsel taşmayı izlemez. Kocaman bir saç veya şapka, büyük bir kafa avantajı **sağlamaz.** "Güç satılmaz" ilkesinin sanattaki karşılığı budur.
- Gövde de tüm karakterlerde aynı çarpışma kutusunu kullanır. Beden varyantı (ince/geniş) yalnızca görseldir (±%11).

### 4.4 Sabit yüz ızgarası

Kozmetiklerin (şapka, gözlük, saç) **her kafaya oturması** için yüzün belirli noktaları herkeste aynıdır. Koordinatlar kafa dairesinin sınırlayıcı kutusuna göredir (x: 0 arka kenar → 1 ön kenar; y: 0 tepe → 1 alt; karakter sağa bakar).

| Nokta                    | Konum                           | Not                                                                                   |
| ------------------------ | ------------------------------- | ------------------------------------------------------------------------------------- |
| Kafa kemeri (üst kontur) | y 0–0,45                        | **Herkeste aynı yay.** Şablondan kopyalanır, değiştirilmez.                           |
| Göz merkezi              | x 0,76 · y 0,50                 | Çocuklarda göz büyük boy, aynı merkez                                                 |
| Kaş                      | Göz merkezinin D×0,08–0,10 üstü |                                                                                       |
| Kulak merkezi            | x 0,47 · y 0,57                 | Gözlük sapı buraya bağlanır                                                           |
| Burun                    | y 0,56–0,66                     | Ön kenardan D×0,02–0,08 taşabilir (taşma payına dahil)                                |
| Bıyık bağlantı noktası   | Burnun altı, y 0,66–0,70        |                                                                                       |
| Ağız                     | x 0,70–0,92 · y 0,72–0,80       |                                                                                       |
| Alt yüz (çene, yanak)    | y 0,60–1,00                     | **Karaktere özgü.** Kafa şekli çeşitliliği buradadır. Daire zarfı içinde kalır (±%5). |
| Yaylı kafa eklemi        | x 0,47 · y 0,94                 | Bkz. 6.4                                                                              |

### 4.5 Top

- Görsel çap = fizik çapı. Kontur dahil, top görseli fizik dairesinin dışına taşmaz.
- Varsayılan top: kırık beyaz `#FFF9EE` + kontur renginde panel şekilleri + 5 px @1x dış kontur.
- **Dönme ve ışık ayrıdır:** Top sprite'ı döner, ama gölge ve parlama ayrı bir **dönmeyen** katmandadır (üstte tek parlama şekli, altta tek gölge hilali). Aksi halde dönen top üzerinde ışık da dönerek gerçekdışı görünür.
- Top kozmetikleri: aynı çap, tam kontur ve yüzeyin en az %50'si açık (L\* > 75). Top sahnenin en okunur nesnesi olarak kalır.

---

## 5. Detay sınırları

Ölçüt: **6 inçlik telefonda, maç sırasında, 1 saniyede.** Bu sürede görünmeyen detay, üretim maliyeti ve görsel gürültü demektir.

| Öğe                                     | Sınır                                                                                                                                                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kırışıklık**                          | Yüz başına **toplam 2–3** temiz çizgi (profilde tek göz görünür: göz kenarında en fazla 1–2, alında en fazla 1, gülme çizgisinde en fazla 1). Yalnızca yaşlı karakterlerde. Ortak "yaş" katmanından gelir. |
| **Bıyık / sakal**                       | Düz renk şekli + en fazla 1 gölge tonu + en fazla **3 iç tutam çizgisi.** Tel tel kıl çizimi yok.                                                                                                          |
| **Kirli sakal**                         | Tek düz ton katmanı (cilt tabanından ~%15–20 koyu, hafif mora kayık). Nokta, doku veya tarama yok.                                                                                                         |
| **Saç**                                 | Taban + 1 gölge tonu + en fazla 3 iç ayrım çizgisi + isteğe bağlı 1 parlama şekli.                                                                                                                         |
| **Kumaş**                               | Parça başına en fazla 2 kırışık çizgisi. Düğme, cep ve dikiş yok (forma yakası ve raglan kol dikişi hariç).                                                                                                |
| **Ayakkabı**                            | Görünür krampon sayısı sabit: 3. Bağcık en fazla 2 çizgi. Logo yok.                                                                                                                                        |
| **Çil**                                 | En fazla 3 nokta, her biri en az 5 px @1x.                                                                                                                                                                 |
| **Desen** (çorap, şerit, tente, bayrak) | Şerit kalınlığı en az 4 px @1x. Daha ince şerit küçük ekranda titreşir (moiré).                                                                                                                            |
| **Doku**                                | Karakterde, topta ve oyun nesnelerinde **yok.** Arka planda yalnızca tek bir global kâğıt/grain katmanı, en fazla %6 opaklık.                                                                              |
| **Gradyan**                             | Karakterde ve arayüzde **yok.** Gökyüzü bantlıdır.                                                                                                                                                         |
| **En küçük şekil**                      | @1x'te 4 px'ten küçük kapalı şekil yok. Paralel iki çizgi arası en az 3 px @1x.                                                                                                                            |
| **Renk sayısı**                         | Karakter başına en fazla **18 swatch** (gölge, allık, kenar ışığı ve göz dahil, kontur hariç). A_02'nin sadeleştirilmiş hali bu sınırın içindedir.                                                         |
| **Detay yoğunluğu**                     | En yoğun yer yüz, sonra saç ve aksesuar, en sade yer gövde ve bacaklar.                                                                                                                                    |

**Küçük ekran testleri** (her karakter için zorunlu, ayrıntı [§14.3](#143-test-prosedürleri)):

- **64 px testi:** Karakteri 64 px yüksekliğe küçült (avatar boyutu). Kim olduğu ve ifadesi okunuyor mu?
- **32 px testi:** Silüet hâlâ kadrodaki diğerlerinden ayırt ediliyor mu?
- **Kontur testi:** @0,5x'te dış kontur kayboluyor mu? Kayboluyorsa detay fazladır, kontur ince değildir.

---

## 6. Karakter yapısı, varyantlar ve yaylı kafa

Karakterler **parçalı (cut-out) animasyonla** hareket eder (Faz 3.2). Her parça ayrı bir görseldir, eklem noktasından döner. Kozmetik sistemi de bu parçaların değiştirilmesidir. Animasyon **kodla** yazılır ([Ek B](#ek-b--kararlar) karar 6): parçalı iskelet, yaylı kafa ve ifade değişimleri motorda; animasyon aracı (Spine vb.) ve anahtar kare dosyası yoktur. Sanatçının motora verdiği tek veri parça görselleri ve pivot dosyasıdır ([§13.6](#136-pivot-ve-katman-verisi-kod-tabanlı-animasyon)).

### 6.1 Katman sırası (arkadan öne, sağa bakan karakter)

| #     | Katman                                            | Pivot                   | Kaynak                                               | Kozmetik slotu               |
| ----- | ------------------------------------------------- | ----------------------- | ---------------------------------------------------- | ---------------------------- |
| 0     | Zemin gölgesi                                     | —                       | Motor üretir                                         | —                            |
| 1     | Arka kol                                          | Arka omuz               | Karaktere özgü (ten + kol rengi)                     | Forma                        |
| 2     | Arka bacak + arka ayakkabı                        | Arka kalça / arka bilek | Ortak şekil                                          | Forma (şort/çorap), ayakkabı |
| 3     | Gövde (forma)                                     | Kalça merkezi           | Beden varyantı (3 genişlik)                          | Forma                        |
| 4     | Şort                                              | Kalça merkezi           | Beden varyantı                                       | Forma                        |
| 5     | Ön bacak + ön ayakkabı                            | Ön kalça / ön bilek     | Ortak şekil                                          | Forma, ayakkabı              |
| 6     | Ön kol                                            | Ön omuz                 | Karaktere özgü                                       | Forma                        |
| 7     | Boyun aksesuarı (papyon, düdük ipi)               | Gövdeye bağlı           | Karaktere özgü                                       | Aksesuar                     |
| **8** | **KAFA GRUBU** (tümü yaylı eklemle döner)         | **Yaylı kafa eklemi**   |                                                      |                              |
| 8.1   | Arka aksesuar (topuz, kask kayışı, kulaklık teli) | Kafa                    | Karaktere özgü / kozmetik                            | Baş aksesuarı                |
| 8.2   | Arka saç (ense)                                   | Kafa                    | Saç kütüphanesi                                      | Saç                          |
| 8.3   | Kafa tabanı (cilt + gölge + allık)                | Kafa                    | Karaktere özgü alt yüz şekli                         | —                            |
| 8.4   | Kulak                                             | Kafa                    | Ortak (ten rengiyle boyanır)                         | —                            |
| 8.5   | Yaş katmanı (kırışıklık) / çil                    | Kafa                    | Ortak                                                | —                            |
| 8.6   | Burun                                             | Kafa                    | Burun kütüphanesi                                    | —                            |
| 8.7   | Sakal                                             | Kafa                    | Yüz kılı kütüphanesi                                 | Yüz kılı                     |
| 8.8   | Ağız (ifade)                                      | Kafa                    | **Ortak yüz kütüphanesi**                            | İfade paketi                 |
| 8.9   | Bıyık                                             | Kafa                    | Yüz kılı kütüphanesi                                 | Yüz kılı                     |
| 8.10  | Göz (ifade)                                       | Kafa                    | **Ortak yüz kütüphanesi**                            | İfade paketi                 |
| 8.11  | Kaş (ifade)                                       | Kafa                    | **Ortak yüz kütüphanesi** (3 kalınlık, saç renginde) | —                            |
| 8.12  | Ön saç (perçem, favori)                           | Kafa                    | Saç kütüphanesi                                      | Saç                          |
| 8.13  | Gözlük                                            | Kafa                    | Aksesuar                                             | Yüz aksesuarı                |
| 8.14  | Şapka / baş aksesuarı                             | Kafa                    | Aksesuar                                             | Baş aksesuarı                |
| 8.15  | Efekt soketleri (ter damlası, yıldız halkası)     | Kafa                    | Yalnızca nokta, görsel değil                         | —                            |

**Eklem noktaları** (@2x, zemin orijinli; x: gövde merkezine göre, + öne doğru):

| Eklem                 | Konum                   | Not                            |
| --------------------- | ----------------------- | ------------------------------ |
| Yaylı kafa eklemi     | (−11, 262)              | Kafa-yerel (0,47 / 0,94)       |
| Ön omuz / arka omuz   | (+30, 230) / (−30, 230) | Kafa dairesinin hemen altında  |
| Ön kalça / arka kalça | (+25, 120) / (−25, 120) |                                |
| Ön bilek / arka bilek | (+30, 40) / (−30, 40)   | Ayakkabı buradan döner (vuruş) |

Beden varyantlarında omuz ve kalça x değeri en fazla ±10 birim kayar. Diğer tüm noktalar sabittir.

**Eklem çizim kuralı:** Dönen her parça, eklem noktasında komşusunun **altına en az 20 birim (@2x) uzanır.** Örneğin üst kol gövdenin içine doğru uzar, bacak şortun altına girer. Böylece parça ±30° döndüğünde arada boşluk görünmez.

### 6.2 Ortak yüz kütüphanesi ve ifadeler

Gözler, kaşlar ve ağızlar **tüm karakterlerde aynı çizimdir.** Yalnızca renk değişir (kaş = saç rengi; ağız içi ve dil ortak renkler). Bu, tutarlılığın en güçlü aracıdır: on karakter, aynı elden çıkmış gibi gülümser.

**Gözler** (`yuz_goz_*`, standart ve büyük boy):

| Kod      | Çizim                                    | Kullanım                   |
| -------- | ---------------------------------------- | -------------------------- |
| `nokta`  | Dikey oval, göz siyahı, üst-önde parlama | Nötr                       |
| `mutlu`  | Kapalı ters yay (^)                      | Sevinç, kutlama            |
| `kisik`  | Yatay kısık yay                          | Efor, vuruş                |
| `saskin` | Büyük oval + kırık beyaz halka           | Şaşkınlık                  |
| `sersem` | Sarmal                                   | Kafa çarpışması sonrası    |
| `kapali` | Düz yatay çizgi                          | Göz kırpma (idle), yenilgi |

**Kaşlar** (`yuz_kas_*`): `notr`, `kalkik`, `catik`, `endiseli` (iç uç yukarıda), `cok_kalkik`. Üç kalınlıkta: ince, orta, kalın.

**Ağızlar** (`yuz_agiz_*`):

| Kod       | Çizim                                                                                |
| --------- | ------------------------------------------------------------------------------------ |
| `notr`    | Hafif gülümseme                                                                      |
| `gulus`   | Açık gülüş, dişler tek beyaz blok                                                    |
| `kahkaha` | Kocaman açık ağız + dil                                                              |
| `efor`    | Sıkılmış dişler. **Yalnızca vuruş anında**, kısa süre. Varsayılan yüz asla değildir. |
| `saskin`  | "O" şeklinde                                                                         |
| `uzgun`   | Aşağı yay                                                                            |
| `sersem`  | Dalgalı çizgi                                                                        |

**İfade setleri** (motor bu üçlüleri birlikte değiştirir):

| İfade               | Göz + kaş + ağız             | Ne zaman                             | Ek efekt       |
| ------------------- | ---------------------------- | ------------------------------------ | -------------- |
| **Nötr**            | nokta + notr + notr          | Bekleme, koşu                        | —              |
| **Sevinç**          | mutlu + kalkik + kahkaha     | Gol atınca, kazanınca                | —              |
| **Efor / zorlanma** | kisik + catik + efor         | Vuruş, zıplama başlangıcı            | —              |
| **Yenilgi**         | kapali + endiseli + uzgun    | Gol yiyince, kaybedince              | Ter damlası    |
| **Şaşkın**          | saskin + cok_kalkik + saskin | Top direğe çarpınca, son saniye golü | —              |
| **Sersem**          | sersem + endiseli + sersem   | Kafa çarpışmasından sonra            | Yıldız halkası |
| **Göz kırpma**      | kapali (120 ms)              | Beklemede 3–6 saniyede bir           | —              |

Analizdeki "en az 4 ifade" kuralı (nötr, sevinç, zorlanma, yenilgi) bu setle fazlasıyla karşılanır.

### 6.3 Varyant listesi

Kütüphanelerin hedef boyutları ilk kadro (12 karakter, [§7.3](#73-önerilen-ilk-kadro-12-karakter)) içindir. Sayılar arttıkça her yeni parça bu bölümdeki kurallara uyar.

| Kategori                 | İçerik                                                                                                                                          | Hedef sayı                           | Kural                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------- |
| **Kafa şekli** (alt yüz) | Yuvarlak, geniş çene, armut, sivri çene, kare-yuvarlak, tombul yanak                                                                            | 6                                    | Üst kemer sabit, daire zarfı içinde                                              |
| **Saç**                  | Kısa, dikleştirilmiş sivri kısa, keskin perçemli, omuz boyu dalgalı, kısa pixie, küt kâküllü bob, uzun tek örgü, iki yanda puf, topuz, kazınmış | 10                                   | **Her saçın iki sürümü vardır:** `tam` ve `sapka_alti` (yalnızca favori ve ense) |
| **Kaş**                  | 5 ifade × 3 kalınlık                                                                                                                            | 15                                   | Saç renginde (yaşlılarda kır/beyaz)                                              |
| **Göz**                  | 6 ifade × 2 boy                                                                                                                                 | 12                                   | Ortak                                                                            |
| **Ağız**                 | 7 ifade                                                                                                                                         | 7                                    | Ortak                                                                            |
| **Burun**                | Yuvarlak top, kemerli, küçük kalkık, geniş, uzun                                                                                                | 5                                    | Profilde silüetin parçası, taşma payına dahil                                    |
| **Bıyık**                | Pala, ince kalem, fırça, beyaz pos                                                                                                              | 4                                    | Düz renk + en fazla 3 tutam çizgisi                                              |
| **Sakal**                | Kirli sakal tonu, kısa sakal, kır sakal                                                                                                         | 3                                    | Düz ton. Arka görünümde görünmez.                                                |
| **Yaş katmanı**          | Kırışıklık seti 1–3                                                                                                                             | 3                                    | Toplam 2–3 çizgi                                                                 |
| **Baş aksesuarı**        | Kasket, ters kep, hasır şapka, bandana, ter bandı, ince saç bandı, geniş saç bandı, örgü saç bandı, kafa bandajı                                | Karakter başına 1 imza + kozmetikler | Taşma payı içinde, aksesuar renginde                                             |
| **Yüz aksesuarı**        | Yuvarlak gözlük, kare kalın gözlük                                                                                                              | 2+                                   | Sap kulağa bağlanır, saçla birleşmez                                             |
| **Boyun aksesuarı**      | Kalın atkı, boyunda kulaklık                                                                                                                    | 2+                                   | Gövde grubunda                                                                   |
| **Forma**                | Raglan, düz yaka, polo yaka, atlet                                                                                                              | 4 kesim × renk                       | Her karakterde ev + açık alternatif + koyu alternatif                            |
| **Ayakkabı**             | Klasik krampon, eski tip deri, sneaker                                                                                                          | 3 kesim × renk                       | 3 görünür krampon, logo yok                                                      |

### 6.4 Yaylı kafa eklemi

Yaylı kafa hissi çizimde değil **animasyonda** verilir: kafa grubu gövdeye görünmez bir yayla bağlıdır ve vuruşta, inişte ve çarpışmada sallanır. Görünür bir yay yalnızca kozmetik veya karaktere özel bir özellik olabilir (NOTLAR.md).

**Eklem noktası:** Kafa-yerel **(0,47 / 0,94)**. Kafa dairesinin alt kenarının hemen üstünde, merkezin biraz gerisinde. Kafa, merkezinden değil bu noktadan döner. Bu, "boynu yaylı oyuncak" hissini verir.

**Örtüşme yakası (çizim kuralı):**

- Gövdenin üst kenarı (yaka ve omuz hattı) kafa dairesinin alt yayının **en az 30 birim (@2x) içine** girer.
- Omuzlar kafa yayının altında kalacak şekilde eğimli çizilir.
- **Test:** Kafa grubunu eklem noktası etrafında **±18°** döndür. Kafa ile gövde arasında hiçbir açıda arka plan görünmemeli. Bu test her saç, şapka ve forma kombinasyonu için gerekmez; her **beden varyantı + en geniş ve en dar kafa şekli** için yapılır.

**Açı sınırları (adil oyun):**

| Durum                                                    | En fazla açı | Neden                                                                                                                                  |
| -------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Top oyundayken                                           | **±10°**     | Görsel kafa merkezi, çarpışma dairesinden en fazla D'nin ~%7,6'sı kadar uzaklaşır. Oyuncu "kafama değmedi ama gol oldu" hissi yaşamaz. |
| Top oyunda değilken (gol sonrası, kutlama, sonuç ekranı) | **±18°**     | Mizah için serbest                                                                                                                     |

Çarpışma dairesi **salınmaz.** Gövdeye sabittir; yalnızca görsel sallanır.

**Animasyon için başlangıç değerleri** (Faz 3.2'de ayarlanır). Yaylı kafa kodda bir sönümlü yay olarak yazılır; değerler diğer ayarlar gibi `src/config/gameConfig.ts`'te tutulur, çizime gömülmez:

| Parametre              | Değer                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------- |
| Doğal frekans          | 3–4 Hz                                                                             |
| Sönüm oranı            | 0,25–0,35 (2–3 görünür salınım)                                                    |
| İnişte ezilme (squash) | Kafa Y %92 / X %106, 80 ms, sonra yaylı dönüş                                      |
| Vuruşta                | Kafa gövdeyi 1–2 kare gecikmeyle izler, sonra hafif aşar (overshoot)               |
| Kafa çarpışmasında     | İki kafa birbirinden seker, ±18° tam salınım (top oyundaysa ±10°) + sersem ifadesi |

### 6.5 Kozmetik uyumluluk kuralları

- **Şapka + saç:** Bir şapka takıldığında saç otomatik olarak `sapka_alti` sürümüne geçer. Bu yüzden her saç iki sürümle teslim edilir.
- **Şapka + kafa:** Tüm şapkalar ortak kafa kemerine göre çizilir, böylece her kafaya oturur. Siper kulağın **önünde** biter, asla kulaktan geçmez.
- **Gözlük:** Göz çizgisine ve kulak merkezine göre çizilir. Sap kulağa gider ve saçın **altında** kalır.
- **Taşma:** Hiçbir kozmetik kombinasyonu taşma payını (D'nin %10'u) aşamaz. Topuz + şapka gibi çakışan kombinasyonlarda kozmetik dosyasında "uyumsuz" işareti tutulur ve oyun bu ikisinin birlikte giyilmesine izin vermez.
- **İmza karakter özellikleri** (bakkalın pala bıyığı gibi) kozmetikle kaldırılamaz. Aksi halde karakter tanınmaz.

---

## 7. Kadro çeşitliliği

### 7.1 Kurallar

| Eksen                  | Kural (kadro büyüdükçe oranlar korunur)                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Futbolcu / sürpriz** | Kadronun en az **%75**'i kurgusal futbolcu tipi; sürpriz komik karakterler en fazla **%25** (12 karakterde 3). Kurallar ikisi için de aynıdır (§7.4).                                                        |
| **Cinsiyet**           | Kadınlar en az **%40**. Kadın karakterler de oyun tarzıyla tanımlanır; kadın futbolcu tipleri kadronun ana gövdesindedir, "teyze" tek kadın rolü olamaz.                                                     |
| **Yaş**                | Çocuk karakter yok ("çocuk oyunu" algısı; en genç 17). Futbolcu tiplerinde en az üç yaş grubu: genç (≤ 21), oyuncu çağı (22–32), veteran (33+). 60+ en az **%15** (12 karakterde 2; sürpriz karakterlerden). |
| **Ten tonu**           | T1–T6'nın hepsi kullanılır. Hiçbir ton kadronun %30'undan fazlasını oluşturmaz.                                                                                                                              |
| **Ten ve statü**       | **ASLA** ten tonu ile statü ya da rol arasında örüntü kurulmaz (ör. koyu ten = yalnızca hız ya da güç, açık ten = yalnızca zekâ). Otorite figürleri (kaptan, veteran) farklı tonlardadır.                    |
| **Beden**              | İnce, orta ve geniş gövdenin her biri en az %25                                                                                                                                                              |
| **Silüet**             | Her karakterin tek bir **silüet kancası** vardır (kasket + pala bıyık, ters kep, küt bob saç...). 32 px testinde diğerlerinden ayrışmalıdır.                                                                 |
| **Kişilik**            | Aksesuar, ifade, poz ve animasyonla verilir. Aksan, din veya köken üzerinden verilmez.                                                                                                                       |

### 7.2 Klişe yasağı

| ❌ Yapılmaz                                                                                                                            | ✅ Yerine                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Bölgesel aksan, yöresel yiyecek veya kıyafetle "esprili" karakter (ör. bir bölgenin yemeğini veya ağzını karakterin şakası yapmak)     | Oyun tarzı ve mevki: golcü, stoper, frikikçi; sürpriz karakterlerde meslek ya da rol (bakkal)  |
| Etnik özellik abartısı (burun, göz, dudak, saç dokusu üzerinden karikatür)                                                             | Herkese aynı yüz kütüphanesi. Abartı yalnızca kişisel özelliklerde (bıyık, topuz, kasket)      |
| Fes, nazar boncuğu, kilim gibi turistik "Türkiye" sembollerini karakter kimliği yapmak                                                 | Evrensel futbol önde, yerel detaylar arka planda ve ikinci okumada                             |
| Başörtüsü, takke vb. dini veya kültürel giysiyi şaka unsuru yapmak                                                                     | Bu giysiler kadroda yer alabilir, ama karakterin doğal parçası olarak, asla espri olarak değil |
| Koyu ten tonlarını yalnızca destek, hız ya da güç rollerine vermek                                                                     | Tonları her role ve statüye dağıtmak                                                           |
| Yaşlı karakteri yavaşlığı, unutkanlığı ya da beceriksizliğiyle güldürmek                                                               | Beklenmedik yetenekle güldürmek (sahanın en hızlısı olan dede)                                 |
| Gerçek bir kişiye (futbolcu, ünlü, politikacı) benzeyen yüz; gerçek bir futbolcunun imza saçı, sakalı, gol sevinci veya forma numarası | Ortak yüz kütüphanesi + özgün kafa şekli + özgün saç ve aksesuar birleşimi                     |

**Prompt ipucu:** Yapay zekâ aracında ülke ya da milliyet kelimesi ("Turkish") yerine nesne listesi kullan (tribün, projektör, saha kenarı panosu). Milliyet kelimeleri modeli turistik klişelere (fes, cami silüeti, nazar) doğru çeker. Futbolcu tiplerinde de gerçek bir oyuncunun, kulübün ya da ligin adı yazılmaz.

### 7.3 Önerilen ilk kadro (12 karakter)

> **Oyun slotu** sütunu bağlayıcıdır (GAME_DESIGN_MOBILE K2): oyundaki 12 slotun istatistikleri ve süperleri değişmez. 9 slot adını lakap olarak korur ve kurgusal futbolcu tipi olarak çizilir; 3 slot sürpriz karaktere geçer (ad ve görünüş değişir, istatistik ve süper aynı kalır). Görünüş sütunları öneridir; model sayfaları çizildikçe değişebilir, değişiklikte 7.1'deki oranlar korunur.

| #   | Kimlik (`id`)  | Oyun slotu · süper      | Arketip                      | Yaş    | Cinsiyet | Ten | Beden | Silüet kancası                                           | İmza aksesuar · renk           | Ev forması (bant)          |
| --- | -------------- | ----------------------- | ---------------------------- | ------ | -------- | --- | ----- | -------------------------------------------------------- | ------------------------------ | -------------------------- |
| 1   | `kor`          | Kor · Ateş Topu         | Golcü                        | 20'ler | K        | T4  | Orta  | Yukarı dikilmiş, alev gibi sivri kısa kızıl saç          | Ter bandı · turkuaz            | Kırmızı (orta)             |
| 2   | `bora`         | Bora · Kasırga          | Kanat oyuncusu               | 20'ler | E        | T3  | İnce  | Arkaya savrulan omuz boyu dalgalı kestane saç            | İnce saç bandı · fıstık yeşili | Nane (açık)                |
| 3   | `kaya`         | Kaya · Dev Top          | Stoper                       | 33     | E        | T5  | Geniş | Kazınmış kafa + kafa bandajı + kısa sakal, geniş çene    | Kafa bandajı · kırık beyaz     | Antrasit (koyu)            |
| 4   | `ayaz`         | Ayaz · Buz              | Soğukkanlı orta saha         | 20'ler | K        | T1  | Orta  | Kısa bal rengi pixie saç + uçları arkaya uçuşan atkı     | Kalın atkı · petrol            | Açık mavi (açık)           |
| 5   | `simsek`       | Şimşek · Zikzak         | Altyapıdan gelen hızlı kanat | 17     | E        | T6  | İnce  | Yıldırım gibi öne kırılan keskin siyah perçem            | Boyunda kulaklık · hardal      | Sarı (açık)                |
| 6   | `sis`          | Sis · Işınlanma         | Çalımcı on numara            | 19     | K        | T3  | İnce  | Küt kâküllü siyah bob saç                                | Yuvarlak gözlük · mor          | Patlıcan (koyu)            |
| 7   | `yay`          | Yay · Gökkuşağı         | Frikikçi                     | 34     | E        | T2  | Orta  | Ters takılmış kep (siper arkada), altından bal rengi saç | Ters kep · çam yeşili          | Şeftali (açık)             |
| 8   | `demir`        | Demir · Mıknatıs        | Kaptan, top kapan ön libero  | 36     | K        | T6  | Geniş | Bandana + sırta inen kalın tek siyah örgü                | Bandana · domates              | Mavi (orta)                |
| 9   | `pamuk`        | Pamuk · Serap           | Oyun kurucu                  | 20'ler | K        | T5  | Orta  | İki yanda koyu kahve puf topuz                           | Geniş saç bandı · pembe        | Beyaz (açık)               |
| 10  | `bakkal`       | Toprak slotu · Sarsıntı | **Sürpriz:** Bakkal Amca     | 50'ler | E        | T2  | Geniş | Kasket + kahverengi pala bıyık                           | Kasket · antrasit              | Turuncu-krem raglan (orta) |
| 11  | `dede`         | Yankı slotu · Yankı     | **Sürpriz:** Fileli Dede     | 70'ler | E        | T4  | İnce  | Geniş hasır şapka + beyaz gür kaşlar                     | Hasır şapka bandı · bordo      | Koyu yeşil (koyu)          |
| 12  | `kaleci_teyze` | Kauçuk slotu · Sekme    | **Sürpriz:** Kaleci Teyze    | 60'lar | K        | T1  | Geniş | Yüksek beyaz topuz + kocaman kaleci eldivenleri          | Örgü saç bandı · lavanta       | Pembe (orta)               |

**Kadronun dağılımı:** 9 futbolcu tipi + 3 sürpriz karakter (%25) · 6 kadın, 6 erkek · genç (≤ 21) 2, oyuncu çağı (22–32) 4, veteran (33+) 3, sürpriz karakterler 50'ler 1 ve 60+ 2 (%17) · T1–T6 her biri 2 · ince 4, orta 4, geniş 4 · ev formaları: koyu 3, orta 4, açık 5 · 12 aksesuar renginin hepsi kullanıldı (kütüphane doldu; 13. karakterde §2.7'deki kuralla yeni renk eklenir).

**Aksesuar kontrastı:** Seçimler §2.7'deki ΔL 15 kuralına göre yapıldı. Örneğin Yay'ın çam yeşili kepi (L\* 47) kestane saç (40) üzerinde kaybolurdu, bal rengi saç (67) üzerinde okunur. Kaleci Teyze'nin lavanta saç bandı (73) beyaz saçta (92) okunur. Boyun aksesuarlarında temas yüzeyi formadır: Ayaz'ın petrol atkısı (~37) açık mavi formada (78), Şimşek'in hardal kulaklığı (60) sarı formada (83) okunur. Kor'un turkuaz ter bandı (63) kızıl saçta (47) ΔL 16 ile sınırda; model sayfasında kontrol edilir, yetmezse saç siyaha döner.

**Forma notu:** Sarı ev formalı `simsek`in koyu alternatifi lacivert değil antrasit veya patlıcan olur (sarı + lacivert yasak). Kırmızı ev formalı `kor`un açık alternatifinde sarı kullanılmaz (sarı + kırmızı yasak). Antrasit ev formalı `kaya`nın açık alternatifi beyaz tabanlı olmaz (siyah + beyaz çağrışımı); nane ya da açık mavi tabanlı olur. Beyaz ev formalı `pamuk`un açık alternatifi şeftali ya da nane tabanlıdır.

**İlk model sayfaları ([Ek B](#ek-b--kararlar) karar 4):** Bakkal + 2 futbolcu tipi. Öneri: `kor` ve `bora`. İkisi de baştan açık karakter (GAME_DESIGN_MOBILE §9.3); cinsiyet, beden, ten ve forma bandı farklı olduğu için kadro testini (§7.5, §14.3) erken sınar. Bakkal ile Kor aynı forma bandında (orta) olduğu için forma çakışma kuralı da ilk partide denenir.

**Kimlikler:** Futbolcu tiplerinin `id`'si koddaki karakter kimliğiyle aynıdır. Kodda `toprak` kimliği Bakkal'ın yeniden çiziminde `bakkal` olur; `dede` ve `kaleci_teyze` henüz kodda yok (Faz 7.6).

### 7.4 Sürpriz karakterler

Bakkal Amca, Fileli Dede ve Kaleci Teyze kadronun mizah tuzudur: futbolcuların arasında, sahada hiç beklenmeyen tipler.

- **Aynı kurallar:** Aynı şablon, aynı kafa dairesi, aynı yüz kütüphanesi, aynı forma ve kozmetik kuralları. Onlar da forma giyer.
- **Mizah nereden gelir:** Aksesuar, ifade, poz ve animasyondan (bakkalın pala bıyığı, dedenin hasır şapkası, teyzenin kocaman kaleci eldivenleri). Yaş ve cinsiyet şakanın konusu olmaz: dede yavaş ya da beceriksiz olduğu için değil, sahanın en hızlısı olduğu için şaşırtır; teyze "ev hanımı" kalıbıyla değil, kaleci tecrübesiyle tanımlanır (§7.2).
- **Eşit güç:** İstatistikleri ve süperleri futbolcu tipleriyle aynı bütçededir; denge kuralları aynen geçerlidir (GAME_DESIGN_MOBILE §9).
- **Oran:** Kadronun en fazla %25'i (§7.1).
- **Kedi maskot kaldırıldı** ([Ek B](#ek-b--kararlar) karar 3): oynanabilir karakter, sahne öğesi ya da arayüz maskotu olarak kullanılmaz.

### 7.5 Yeni karakter için kontrol soruları

1. Silüeti 32 px'te kadrodaki diğerlerinden ayrışıyor mu?
2. Aksesuar rengi kadroda boşta mı?
3. Kadro oranlarını (cinsiyet, yaş, ten, beden) bozuyor mu?
4. Kişiliği meslek, aksesuar ve ifadeyle mi kuruldu? Aksan, köken veya din bir şaka unsuru mu?
5. Gerçek bir kişiye, özellikle gerçek bir futbolcuya benziyor mu? (İki kişiye "Bu kime benziyor?" diye sor.)
6. Ev formasının ana + ikincil rengi yasaklı bir kombinasyon mu?
7. Sürpriz karakterse kadronun %25 sınırını aşıyor mu?

---

## 8. Yapay zekâ ile konsept üretimi

### 8.1 Yapay zekânın rolü

| ✅ Kullanılır                                          | ❌ Kullanılmaz                                                                   |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Karakter fikri, kostüm ve aksesuar varyasyonları keşfi | Oyuna giren son görsel                                                           |
| Model sayfası için kaba referans                       | Oranlar (her zaman şablondan alınır)                                             |
| Arka plan kompozisyonu ve ışık denemesi                | Renkler (her zaman master paletten alınır)                                       |
| İfade fikirleri                                        | Logo, harf çizimi, arayüz metni, font                                            |
| Mağaza ve pazarlama görseli için kompozisyon taslağı   | Gerçek bir kişinin, oyunun veya **yaşayan bir sanatçının** adını prompt'a yazmak |
|                                                        | Otomatik iz sürme (image trace / auto-vectorize)                                 |

### 8.2 Ana stil şablonu: karakter konsepti (profil)

Prompt'lar İngilizcedir, çünkü görsel araçlarının çoğu İngilizcede daha tutarlı sonuç verir. `{…}` alanları doldurulur. Araç görsel referans destekliyorsa **A_02 stil referansı olarak** eklenir.

```text
2D mobile game character concept, single character, full body,
strict side profile view facing right, 90 degree side view,
giant head about 60% of total height, small rounded body, short thick legs,
slightly oversized football boots,
warm hand-inked cartoon style, thick dark brown outline (#2B1D14) with slightly tapered line ends,
flat colors with exactly one hard-edged cel-shadow tone,
shadows only under the cap brim, under the chin and on the lower body,
thin warm orange rim light only on the back of the head and the back edge of the body,
simple black oval dot eye with one tiny white highlight, small rosy cheek,
big simple rounded nose, at most two clean wrinkle lines,
facial hair as one flat color shape with no individual hairs,
plain jersey with {JERSEY CUT}, no logos, no numbers, no text, no stripes,
plain flat cream background (#F3E3C3), centered, generous empty margin,
soft oval ground shadow under the feet.
Character: {ARCHETYPE}, {AGE}, {BODY: slim / medium / stocky},
{SKIN TONE} skin, {HAIR}, signature accessory: {ACCESSORY} in {ACCESSORY COLOR},
jersey: {MAIN COLOR} body with {SECONDARY COLOR} {sleeves / collar},
expression: {EXPRESSION}.
```

**Örnek doldurma (futbolcu tipi, Kor):** `Character: fictional football striker, woman in her 20s, medium build, medium warm skin, short spiky red hair standing up like flames, signature accessory: terry-cloth headband in turquoise, jersey: red body with cream collar, red shorts, expression: confident grin.`

**Örnek doldurma (sürpriz karakter, bakkal):** `Character: friendly corner-shop grocer playing football, man in his 50s, stocky, light warm skin, short brown hair under the cap, big brown handlebar moustache, signature accessory: flat cap in charcoal grey, jersey: cream body with orange raglan sleeves, orange shorts, expression: warm confident smile.`

Futbolcu tiplerinde "fictional" kelimesi bilerek yazılır; gerçek oyuncu, kulüp, lig veya ülke adı yazılmaz (§7.2).

### 8.3 Model sayfası

```text
character turnaround model sheet of the same character in three views:
front view, side profile facing right, back view;
identical proportions, identical colors and identical details in every view,
all views standing on the same ground line, aligned on horizontal guide lines,
{STYLE BLOCK FROM 8.2, from "warm hand-inked cartoon style" to "soft oval ground shadow"},
Character: {...}
```

### 8.4 İfade sayfası

```text
expression sheet, the same character's head only, strict side profile facing right,
six expressions in a 3 by 2 grid:
neutral smile; joyful laugh with closed happy arc eye; effort with gritted teeth and squinting eye;
surprised round mouth with raised brow; sad defeated with closed eye and worried brow;
dizzy with spiral eye and wavy mouth,
identical head shape, hair and accessory in all six,
{STYLE BLOCK FROM 8.2},
Character: {...}
```

### 8.5 Arka plan konsepti

```text
2D game background, flat orthographic side view, no perspective, wide 21:9,
a small cozy fictional football stadium seen from the pitch, at golden-hour sunset,
low stands with simple seat blocks, a cheerful crowd drawn as simple rounded faceless shapes,
a stand roof with a few thin steel trusses, two floodlight towers switched off, a blank scoreboard,
pitch-side boards left completely blank,
stands backlit and in muted mauve-purple shadow, warm orange light only on the top edges,
sky in four flat horizontal color bands from dusky violet to rose to peach to golden, no sun disc,
flat vector shapes, very low detail and low contrast compared to game characters,
thin colored outlines on the stands, no outlines on distant shapes,
an empty flat ground strip across the bottom with one light edge line,
no players, no ball, no text, no logos, no letters, no numbers, no club colors, no crests.
```

**Varyantlar:** İkinci satırdaki zaman ifadesi değiştirilir, gerisi aynı kalır:

- Gündüz: `at bright midday, clear sky in four flat light blue bands`
- Gece ışıklı: `at night under switched-on floodlights drawn as flat shapes, no glow, no light beams, no lens flare`
- Karlı: `in light snowfall, snow only on the roof edges and board tops, flat snowflake shapes`
- Yağmurlu: `in light rain, thin flat rain streaks only behind the pitch, umbrellas in the crowd`

Yapay zekâ katmanları ayrı üretemez. Tek sahne konsepti üretilir; yeniden çizimde [§10.2](#102-parallax-katmanları)'deki katmanlara elle ayrılır. Konseptteki renkler referans değildir; varyant renkleri [§2.4](#24-arka-plan-paleti)'teki yolla eklenir.

### 8.6 Olumsuz prompt listesi

Aracın olumsuz prompt alanı varsa oraya, `--no` gibi bir parametresi varsa onunla, yoksa prompt'un sonuna `Avoid: …` cümlesiyle eklenir.

```text
realistic, photorealistic, 3d render, cgi, octane render, clay, plastic, glossy, vinyl toy,
bobblehead spring neck, gradient shading, airbrush, soft painterly shading, watercolor,
texture, noise, film grain, halftone, hatching, crosshatching, sketch lines, pencil, rough lines,
double lines, hair strands, individual hairs, stubble dots, pores, skin texture,
detailed wrinkles, many wrinkles, three-quarter view, 3/4 view, front view,
multiple characters, crowd, text, letters, words, numbers, logo, brand, watermark, signature,
club crest, badge, sponsor, striped jersey, vertical stripes, team kit, famous footballer, famous stadium,
celebrity, real person likeness, anime, manga, big sparkly eyes, angry clenched-teeth face,
muscular, extra fingers, missing fingers, extra limbs, deformed hands, asymmetrical eyes,
floating accessories, hat brim through the ear, glasses merging into hair,
neon, glow, bloom, lens flare, motion blur, depth of field, vignette, drop shadow, frame, border
```

Model sayfası prompt'unda (8.3) `three-quarter view, 3/4 view, front view` satırı çıkarılır. Görsel araçları tam profilde zorlanır ve 3/4'e kayar. Bu kabul edilir, çünkü son çizimde görünüm şablondan kurulur.

### 8.7 Tutarlılık ipuçları ve kayıt

- **Tek seferde tek karakter.** Kadro görseli istenmez; modeller karakterleri birbirine karıştırır.
- Beğenilen sonucun **seed** değeri ve referans görseli not edilir. İfade ve model sayfası aynı seed ve referansla üretilir.
- Yapay zekâdan gelen oran, renk ve detay **referanstır, karar değildir.** Karar şablon, palet ve bu belgedir.
- **Kayıt (provenance):** Her konseptin yanına aynı adlı bir `.txt` dosyası konur: tarih, araç ve model sürümü, prompt, olumsuz prompt, seed, kullanılan referanslar. Bu kayıt, hangi görselin elle yeniden çizildiğini belgeler ve ileride bir hak sorusu çıkarsa elinde kanıt olur.
- Konseptler `art/_konsept/` altında kalır ve **asla** `assets/` klasörüne girmez.

---

## 9. Yeniden çizim, sadeleştirme ve "yapay zekâ izi" kontrolü

### 9.1 İş akışı (karakter)

1. **Konsept seç** ve prompt kaydını kontrol et (§8.7).
2. **Şablonu aç** (`karakter_sablonu.svg`): kafa dairesi, yüz ızgarası, eklem noktaları, zemin, taşma sınırı.
3. **Konsepti en alt katmana** koy: %25–35 opaklık, kilitli. Şablonu izle, konsepti değil. Konseptin oranları şablona uymuyorsa şablon kazanır.
4. **Silüet:** Karakteri tek renk dolguyla (kontur rengi) çiz. 64 px ve 32 px'te test et, kadronun diğer silüetlerinin yanına koy. Silüet geçmeden devam etme.
5. **Parçalara ayır:** [§6.1](#61-katman-sırası-arkadan-öne-sağa-bakan-karakter)'deki katman yapısı ve isimleriyle.
6. **Kontur:** Kayıtlı genişlik profiliyle.
7. **Renk:** Yalnızca global swatch'lar.
8. **Gölge → kenar ışığı → allık → göz parlaması**, bu sırayla.
9. **Ortak yüz parçalarını** kütüphaneden yerleştir. Karaktere özel göz veya ağız çizilmez.
10. **Sadeleştirme turu** (9.2).
11. **Yapay zekâ izi kontrol listesi** (9.3).
12. **Dışa aktar** ve motorda gerçek sahne, gerçek boyut, animasyonla test et.

### 9.2 Sadeleştirme kuralları

- **Kaldır testi:** Her şekil için sor: "Bunu kaldırırsam karakter tanınmaz ya da kişiliğini kaybeder mi?" Kaybetmiyorsa kaldır.
- **Detayı kafaya topla.** Gövde en sade parçadır.
- **En az düğüm noktası:** Daireye yakın bir şekil 4 düğümle, basit bir kavis 2 düğümle çizilir. Fazla düğüm titrek çizgi demektir.
- İki benzer çizgi yerine **tek çizgi.**
- @2x'te 8 birimden küçük kapalı şekil yoktur. Paralel çizgiler arası en az 6 birimdir.
- **"El yapımı" hissi silüette verilir, çizgide değil:** hafif asimetrik kafa, eğik oturmuş kasket, kalın-ince bıyık. Çizgiler temiz ve kararlıdır; titreklik veya rastgele kalınlık yoktur.
- Düz bir kenar bile hafif kavislidir (cetvel düzlüğü yok), ama dalgalı da değildir.
- Yapay zekânın eklediği "anlamsız zenginlik" (fazladan cep, dikiş, düğme, kat, gölge lekesi) **her zaman** silinir.

### 9.3 "Yapay zekâ izi" kontrol listesi

Her parça teslim edilmeden önce işaretlenir. Bir madde bile kalırsa görsel geri döner.

**Yapı ve anatomi**

- [ ] Eller 3 parmak + başparmak, standart el çizimiyle
- [ ] Kulak, göz ve burun yüz ızgarasındaki yerlerinde
- [ ] Şapka siperi kulağın önünde bitiyor, kulaktan geçmiyor
- [ ] Gözlük sapı kulağa gidiyor, saçla birleşmiyor ya da saçın içinde kaybolmuyor
- [ ] Saç ile şapka sınırı net
- [ ] Arka görünümde sakal görünmüyor (model sayfası). Bıyık kafadan genişse uçları görünebilir.
- [ ] İki ayakkabı aynı, görünür krampon sayısı 3
- [ ] Ayaklar zemin çizgisine basıyor, boy şablonla aynı

**Çizgi**

- [ ] Kontur kalınlıkları standartta (5 / 3,5 / 2,5 px @1x)
- [ ] Çift çizgi, kopuk veya "eriyen" çizgi yok
- [ ] Kapalı olması gereken konturlar kapalı
- [ ] Sivrilme yalnızca çizgi uçlarında

**Renk**

- [ ] Palet dışı renk yok (dosyanın renk listesi master paletle karşılaştırıldı)
- [ ] Aynı rengin birbirine yakın tonları yok (ör. üç farklı turuncu)
- [ ] Gradyan yok, gölge tek ton
- [ ] Renk konturun dışına taşmıyor

**Detay**

- [ ] Doku, gürültü, tarama yok
- [ ] Anlamsız düğme, dikiş, cep, kat yok
- [ ] Yazıya veya logoya benzeyen karalama yok
- [ ] Detay sınırları tablosu (§5) aşılmıyor

**Işık**

- [ ] Kenar ışığı yalnızca sırtta ve kafa tepesinin arkasında
- [ ] Gölge alttan, yüz önü aydınlık
- [ ] Parlama tek ve sade

**Kimlik ve bütünlük**

- [ ] Gerçek bir kişiye benzemiyor (iki kişiye soruldu)
- [ ] Gerçek kulüp, stadyum veya marka çağrıştırmıyor
- [ ] Klişe içermiyor (§7.2)
- [ ] Kadronun yanına konduğunda aynı elden çıkmış gibi duruyor (çizgi, doygunluk ve detay yoğunluğu aynı)
- [ ] "Ortalama yüz" değil: tek bakışta bir kişiliği var

### 9.4 A_02 için düzeltme listesi

| Konu        | A_02'de                                                               | Yeniden çizimde                                                                                                   |
| ----------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Görünüm     | Ön, 3/4, profil, arka                                                 | Oyun için yalnızca **profil.** A_02'nin profil görünümü temel alınır, şablona hizalanır. 3/4 oyuna girmez.        |
| Eller       | Görünümler arasında parmak sayısı ve biçimi değişiyor                 | Standart el (3 + başparmak)                                                                                       |
| Kırışıklık  | Her göz kenarında 3 ince çizgi + çift çene çizgisi                    | Profilde göz kenarında en fazla 1–2 çizgi; çift çene çizgisi ya bu sayıya dahil edilir ya da silinir (toplam 2–3) |
| Kontur      | Yapay zekâ kaynaklı değişken kalınlık, kafa çapının ~%1,8'i           | Standart profil, %2,8                                                                                             |
| Kenar ışığı | Önde iki yanda, profilde sırtta (tutarsız)                            | Yalnızca sırt ve kafa tepesinin arkası                                                                            |
| Bıyık       | Çok sayıda tutam çizgisi                                              | En fazla 3 tutam çizgisi; profilde öne taşma ≤ D'nin %10'u                                                        |
| Saç         | Profilde favori + ense; arkada büyük koyu kütle (görünümler tutarsız) | Model sayfasında tek bir saç tasarımı, `tam` ve `sapka_alti` sürümleri                                            |
| Kulak       | Profilde konumu şablondan farklı                                      | Yüz ızgarasına taşınır (x 0,47 · y 0,57)                                                                          |
| Kasket      | Parlama ve siper detayı                                               | Tek parlama şekli; siper kulağın önünde biter, taşma payı içinde                                                  |
| Çorap       | Üç ince şerit                                                         | 1–2 kalın şerit (≥ 4 px @1x)                                                                                      |
| Ayakkabı    | Kramponlar sayıca tutarsız                                            | 3 görünür krampon                                                                                                 |
| Forma       | Arka görünümde gövde bej (gölge mi, ayrı renk mi belirsiz)            | Gövde krem, gölge tek ton ve formülden                                                                            |
| Renkler     | Yakın tonlarda çok sayıda renk                                        | Master palet; en fazla 18 swatch                                                                                  |

---

## 10. Saha ve arka plan

### 10.1 Ekran düzeni ve güvenli alanlar

Telefonlar 16:9'dan 21:9'a kadar, tabletler 4:3'e kadar farklı en-boy oranlarındadır. Arka plan hepsini kapsar, oyun alanı ise her cihazda tam görünür.

```
┌──────────────────────── 2560 × 1440 arka plan tuvali (@1x) ────────────────────────┐
│                       (4:3 tabletlerde üst ve alt şerit görünür)                    │
│            ┌──────────────────── 1920 × 1080 ÇEKİRDEK ────────────────────┐         │
│            │ HUD üst bandı (y 0–140)                                      │         │
│  yalnızca  │                                                              │ yalnızca│
│  dekor     │       Oyun alanı: kaleler, karakterler, top                  │ dekor   │
│  (21:9'a   │                                                              │         │
│  kadar     │                                                              │         │
│  görünür)  │ ══════════ ZEMİN ÇİZGİSİ (y 880) ═══════════════════════════ │         │
│            │ [hareket kontrolleri]                [zıpla / vur kontrolleri]│         │
│            └──────────────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

- **Tuval: 2560×1440 @1x.** Genişlik 21,3:9'a kadar telefonları (yükseklik 1080'e sığdırılınca), yükseklik 4:3 tabletleri (genişlik 1920'ye sığdırılınca) kapsar.
- **Çekirdek: ortadaki 1920×1080.** Kaleler, zemin çizgisi ve tüm oynanış nesneleri çekirdeğin içindedir. Dışarıdaki alan yalnızca dekordur ve hiçbir cihazda oynanış bilgisi taşımaz.
- **Zemin çizgisi:** Çekirdekte y = 880 (tuvalde y = 1060). Karakterlerin bastığı saha zemininin üst kenarı. Tek, net ve açık bir ışık çizgisidir.
- **Taşma payı:** Kamera sarsıntısı ve parallax kayması için her katman her kenardan **32 px** fazla çizilir (2624×1504).
- **HUD ve butonlar** ekrana sabitlenir ve cihazın güvenli alanına (çentik, yuvarlak köşe) göre yerleşir. Arka plan güvenli alanın dışına da taşar.

### 10.2 Parallax katmanları

Maç kamerası sabittir. Derinlik çarpanı kamera sarsıntısında, gol yakınlaştırmasında ve menü geçişlerinde kullanılır; bu, küçük ama "pahalı" görünen bir derinlik hissi verir.

| Katman                        | İçerik                                                                        | Derinlik çarpanı | Kontur                  | Değer / doygunluk                           | Animasyon                                                                                                   | Dışa aktarma                           |
| ----------------------------- | ----------------------------------------------------------------------------- | ---------------- | ----------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **K0 Gökyüzü**                | 4 düz bant, 2–3 düz bulut                                                     | 0,05             | Yok                     | Bantlar §2.4                                | Bulutlar çok yavaş kayar                                                                                    | 0,5x (ya da motorda düz renk bantları) |
| **K1 Uzak silüet**            | Şehir silüeti ve uzak tepeler, karşı tribünün çatısı, projektör kuleleri      | 0,15             | Yok                     | Tek ton `#765A80`, üst kenarda ışık çizgisi | Yok                                                                                                         | 0,5x                                   |
| **K2 Orta plan**              | Tribünler, koltuk blokları, kalabalık şeritleri, tribün çatısı, skor tabelası | 0,40             | İnce renkli (2 px)      | L\* 34–65, doygunluk karakterlerin ~%60'ı   | Kalabalık hafifçe dalgalanır, bayraklar sallanır; golde tribün ayağa fırlar, atkılar ve bayraklar havalanır | 1x, modüler parçalar                   |
| **K3 Saha arkası**            | Saha kenarı panoları, kale arkası, yedek kulübesi                             | 0,80             | Renkli (3 px)           | L\* 50–70                                   | Golde panolarda oyunun kendi "GOL!" animasyonu (düz şekil, parlamasız)                                      | 1x                                     |
| **K4 Oyun düzlemi**           | Zemin, kaleler, karakterler, top                                              | 1,00             | **Tam kontur**          | En yüksek kontrast                          | Oyun                                                                                                        | 1x                                     |
| **K5 Ön plan** (isteğe bağlı) | Saha kenarı çizgisi, su şişeleri, yedek top filesi                            | 1,15             | Tam kontur, koyu silüet | Koyu, düşük detay                           | Yok                                                                                                         | 1x                                     |

**K5 kuralı:** Maç sırasında ön plan yalnızca ekranın alt %5'inde ve kontrol butonlarının **arasında** yer alır. Oynanış alanını ve kontrolleri asla örtmez. Menülerde serbesttir.

### 10.3 Arka plan kuralları

- **Arka plan karakterden sakindir:** daha düşük kontrast, daha düşük doygunluk, daha ince kontur, daha az detay. Gri tonlama testinde karakterler arka planın önünde açıkça okunmalıdır.
- **Oyun yüksekliği bandı** (zemin çizgisi ile HUD arası) değer kurallarına uyar (§2.8). Ufuk bandı (Gök 4) binaların arkasında kalır.
- **Tekrar gizleme:** Modüler parçalar yan yana aynı sırayla dizilmez. Her 3 tribün modülünde bir varyasyon kullanılır (koltuk düzeni, bayrak, kalabalık yoğunluğu).
- **Kalabalık:** Seyirciler yüzsüz, düz renkli, yuvarlak silüetlerdir; karakter yüz kütüphanesi kalabalıkta kullanılmaz (dikkati oyundan çeker, bellek bütçesini aşar). Taraf renkleri (mavi `#2A6AD8`, turuncu `#FFA54A`) kalabalıkta geniş alan olarak kullanılmaz (§2.6).
- **Doku:** Yalnızca K1–K3'ün üstünde tek bir global kâğıt/grain katmanı, en fazla %6 opaklık. Karakter katmanının üstünde asla.
- **Yazı:** Tabelalarda okunabilir harf kullanılmaz ya da yalnızca uydurma, nötr kelimeler kullanılır (GOL, KAPI 3, TRİBÜN). Gerçek marka, kulüp veya stadyum adı yoktur.
- **Gerçek stadyum yok:** Tanınmış bir stadyumun çatı biçimi, tribün düzeni, renk düzeni veya adı kullanılmaz. Şüphede "Bu hangi stadyuma benziyor?" diye sor.
- **Gerçek reklam yok** (analiz §6.6). Panolar ve tabelalar oyunun kendi etkinlik ve sezon duyurularını gösterir. Bu yüzden duyuru panosu değiştirilebilir bir parça olarak tasarlanır.

### 10.4 Modüler saha kiti

Tek kişilik üretimde en büyük risk arka plan yüküdür (NOTLAR.md, A'nın zayıf yanı). Çözüm: tek seferlik resim yerine **parça kiti.**

- **Kit içeriği:** Gök seti · K1 silüet şeridi (tekrarlanabilir) · K2 modülleri (3 tribün bloğu × 2 koltuk düzeni, kalabalık şeritleri, tribün çatısı, skor tabelası, projektör kulesi, bayrak direği) · K3 pano modülleri · zemin şeridi · kale · animasyonlu süsler.
- **Yeni stadyum varyantı = aynı modüller + renk değişimi + 3 yeni süs.** Varyant renkleri §2.4'teki yolla eklenir.

| Varyant     | Ne değişir                                                                                       | Okunurluk notu                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Gündüz      | Açık gök bantları, daha az doygun tribün gölgesi                                                 | Gök açıldıkça topla fark azalır: oyun yüksekliği bandında L\* > 80 geniş alan yok (§2.8)                          |
| Gece ışıklı | Koyu gök bantları, projektörler açık; ışık düz şekil, üst kenar ışık çizgileri daha belirgin     | Glow, ışık huzmesi, lens parlaması yok (§12.1); L\* < 25 geniş alan yok, kontur karışmasın (§2.8)                 |
| Karlı       | Tribün çatısında ve pano üst kenarında kar, soğuk gök, kalabalıkta bere ve atkı                  | Kar beyazı topla karışır: kar yalnızca oyun yüksekliği bandının dışında ve ince şeritler hâlinde; top ile ΔL ≥ 25 |
| Yağmurlu    | İnce, düz yağmur çizgileri yalnızca K1–K3'te; kalabalıkta şemsiyeler; zeminde düz su birikintisi | Yağmur oyun düzleminin önüne geçmez; ekranın %25'inden büyük yarı saydam katman yok (§12.3)                       |
| İleride     | Kumsal, çatı gibi eğlenceli sahalar                                                              | Aynı kurallar; zemin ve kale görselleri fizik çerçevesine birebir oturur (§10.5)                                  |

- **Karakter çizimi sahaya göre değişmez:** Kenar ışığı her sahada sıcak turuncu, gölge alttan kalır. Sahne ışığı farkı yalnızca arka planda verilir; bu, tek karakter görseliyle her sahada tutarlılığı sağlar.
- Her varyant aynı değer kurallarından (§2.8) ve okunurluk testlerinden geçer. Kozmetik stadyum özelleştirmeleri (GAME_DESIGN_MOBILE §4.1, 12. kategori) de buna dahildir.

### 10.5 Oyun nesneleri: kale, zemin, duvar

- **Kale:** Boyalı metal çerçeve + file. Direkler ve üst direk tam konturlu ve topla aynı değerde okunur (L\* farkı en az 25). Bu yüzden gerçek kalelerdeki beyaz direk kullanılmaz (kırık beyaz topla karışır). File, kontursuz ve yarı saydam olarak arkada kalır.
- **Kale görseli fizik çerçevesine birebir oturur.** Üst direğin görsel kalınlığı çarpışma kalınlığıyla aynıdır.
- **Zemin:** Saha zemini şeridi + saha kenarı şeridi. Zemin çizgisi tek bir açık ışık çizgisidir (`#E9B88A`). Çim rengi ilk stadyumla eklenir (§2.4).
- Oyuncunun çarpabileceği her yüzey tam konturludur (§3.6). Konturu olmayan hiçbir şey fizik nesnesi değildir.

---

## 11. Arayüz, tipografi ve ikonlar

### 11.1 Malzeme dili

Arayüz, stadyumun gerçek malzemelerinden yapılır. Hepsi düz renkli vektördür; malzeme hissi şekil ve kenarla verilir, dokuyla değil.

| Malzeme                    | Nerede                                                                                    | Görünüş                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Emaye stadyum tabelası** | Ana paneller, başlık plakaları (tribün ve kapı yön levhaları gibi)                        | Emaye mavi dolgu, kırık beyaz iç çerçeve, köşelerde vida (yalnızca büyük panellerde) |
| **Boyalı metal tabela**    | Butonlar                                                                                  | Düz renk, alt kenarda kalınlık şeridi. Basınca aşağı iner.                           |
| **Kâğıt**                  | Görev listesi (antrenörün not kâğıdı gibi), dolap etiketleri, ödül fişi (maç bileti gibi) | Krem sıva, tek bir yırtık kenar şekli                                                |
| **Kara tahta + tebeşir**   | Maç içi skor ve süre                                                                      | Taktik tahtası: kara tahta, ahşap çerçeve, temiz rakamlar                            |
| **Damga**                  | Mağaza rozeti: "Gördüğünü alırsın · Güç satılmaz"                                         | Krem üstünde emaye mavi lastik damga (bilet damgası gibi)                            |

**Stadyum kimliği:** Para birimleri **Altın** (oynayarak kazanılır) ve **Elmas** (premium); kurallar GAME_DESIGN_MOBILE §2.1'de ([Ek B](#ek-b--kararlar) karar 2). Şişe kapağı ve misket kullanılmaz. Mağaza = **stadyum büfesi** (turuncu-krem çizgili tente ve vitrin). Dolap = **soyunma odası dolabı**.

### 11.2 Paneller ve butonlar (@1x)

**Panel (emaye tabela):**

- Dolgu emaye mavi, dış kontur 4 px `#2B1D14`, köşe yarıçapı 20 px
- İç çerçeve: kırık beyaz, 6 px kalınlık, kenardan 8 px içeride
- Kalınlık: 8 px emaye koyu alt kenar
- Vida: yalnızca iki boyutu da ≥ 320 px olan panellerde, 4 köşede Ø 14 px
- **9-dilim (9-slice):** Köşe dilimi = köşe yarıçapı + iç çerçeve + 4 px. Vidalı ve vidasız iki ayrı 9-dilim seti.

**Butonlar:**

| Tür          | Dolgu                 | Alt kenar            | Metin                         | Kullanım                                                  |
| ------------ | --------------------- | -------------------- | ----------------------------- | --------------------------------------------------------- |
| **Birincil** | OYNA sarısı `#FFD23F` | 10 px `#D9A400`      | Kontur rengi, Paytone One     | Ekran başına **en fazla bir** tane: OYNA, Devam, Satın al |
| **İkincil**  | Krem sıva             | 8 px krem gölge tonu | Kontur rengi                  | Geri, Rövanş, Dolap                                       |
| **Üçüncül**  | Yok (yalnızca metin)  | —                    | Kırık beyaz, Nunito ExtraBold | "Şimdi değil", bağlantılar                                |
| **Pasif**    | `#B8B2A7`             | Yok                  | `#5C564F`                     | Kullanılamayan eylem                                      |
| **Kapat**    | Kırık beyaz daire     | 6 px                 | Kontur rengi X                | **Kırmızı değil.** Kırmızı yalnızca bildirim rozetidir.   |

**Durumlar:**

- **Basılı:** Buton 6 px aşağı iner, alt kenar 4 px'e düşer, 80 ms. Ölçek değişmez.
- **Pasif:** Yukarıdaki pasif renkler, alt kenar yok.
- **"YENİ" etiketi:** Krem kâğıt etiket, köşede hafif eğik. Kilit simgesi yerine bu kullanılır (analiz §6.2).
- **Bildirim rozeti:** Bildirim kırmızısı daire (Ø 44 px), kırık beyaz kalın rakam. Ekranda aynı anda **en fazla 2** rozet (analiz: rozet enflasyonu).
- **Gradyan, parlama (gloss), bevel ve iç gölge ASLA kullanılmaz** (2010 estetiği).

### 11.3 Boyutlar ve dokunma alanları

Yatay ekranda 1080 piksellik yükseklik yaklaşık 360–411 dp'dir, yani **1 dp ≈ 2,6–3 px.** Aşağıdaki değerler güvenli tarafta kalmak için 3 px/dp ile hesaplandı.

| Öğe                          | @1x                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------- |
| En küçük dokunma alanı       | **144 × 144 px** (48 dp). Görsel daha küçük olabilir, dokunma alanı küçülmez. |
| Maç kontrolleri (görsel çap) | 200–240 px                                                                    |
| Gövde metni                  | 40 px (en az 34 px ≈ 12 sp)                                                   |
| Buton etiketi                | 52–60 px                                                                      |
| Başlık                       | 72–110 px                                                                     |
| Skor                         | 88–96 px                                                                      |
| Büyük anlar (GOL!, KAZANDIN) | 160–260 px, el çizimi                                                         |
| İkon (görsel)                | 96 px (satır içi para ikonu 48–56 px)                                         |

### 11.4 Maç içi HUD

```
┌──────────────────────────────────────────────────────────────────┐
│ [II]  [avatar][isim plakası]  ┌ 2 · 1:23 · 1 ┐  [isim plakası][avatar] │
│                               └ kara tahta ──┘                    │
│                                                                   │
│                    (oyun alanı; HUD burada yok)                   │
│                                                                   │
│  [ ◀ ] [ ▶ ]                                        [ZIPLA] [VUR] │
└──────────────────────────────────────────────────────────────────┘
```

- **Skor tahtası:** Üst ortada kara tahta (~420 × 120 px), ahşap çerçeve. Skorlar ve süre kırık beyaz. Oyuncu tarafları tahtanın iki yanında taraf renklerinin açık varyantıyla işaretlenir.
- **Rakamlar temizdir.** Tebeşir hissi yalnızca tahtada tek bir silinti şekliyle verilir, rakamların kendisinde doku yoktur. Skor ve süre için sabit genişlikli rakamlar kullanılır (§11.5), böylece sayı değiştikçe yazı yerinden oynamaz.
- **Avatar:** Profil kafa, 96 px, taraf renginde çerçeve.
- **İsim plakası:** Küçük emaye tabela; sol kenarda taraf renginde şerit. Misafir oyunculara rastgele eğlenceli isimler verilir ("GUEST_" asla, analiz §5.9).
- **Taraflar:** Oyuncu her zaman soldadır ([Ek B](#ek-b--kararlar) karar 1): soldaki avatar, isim plakası ve mavi taraf rengi her cihazda o cihazın oyuncusunundur.
- **"SEN" oku:** Kafanın 40 px üstünde, taraf mavisi dolgu, kırık beyaz "SEN" yazısı, tam kontur. Başlama vuruşunda ve her golden sonra 2 saniye görünür.
- **Kontroller:** Boyalı metal rozet görünümlü daireler, krem dolgu. Varsayılan opaklık **%75**, ayarlardan %40–100. **Kontur her zaman tam opaktır.** Boyut ve konum ayarlanabilir, sol el düzeni seçeneği vardır. (Head Basketball dersi: görünmez kontroller.)
- **Duraklat:** Sol üst köşe, güvenli alanın içinde.

### 11.5 Tipografi

#### Font doğrulaması (20 Kasım 2026, google/fonts deposundaki güncel dosyalar)

Her font dosyası indirilip Türkçe glifler (Ç ç Ğ ğ İ ı Ö ö Ş ş Ü ü), ₺ işareti, rakam genişlikleri ve dikey metrikler açısından tek tek kontrol edildi:

| Font                      | Türkçe               | ₺   | Sabit genişlikli rakam | Lisans                                                 | Sonuç                               |
| ------------------------- | -------------------- | --- | ---------------------- | ------------------------------------------------------ | ----------------------------------- |
| **Paytone One**           | ✅ Tam               | ✅  | `tnum` özelliğiyle     | SIL OFL 1.1 (ayrılmış adlar: "Paytone", "Paytone One") | ✅ **Başlık ve buton fontu**        |
| **Nunito**                | ✅ Tam               | ✅  | ✅ Varsayılan olarak   | SIL OFL 1.1                                            | ✅ **Gövde, skor ve süre fontu**    |
| Baloo 2                   | ✅ Tam               | ✅  | `tnum` özelliğiyle     | SIL OFL 1.1                                            | ✅ Yedek başlık fontu (ExtraBold)   |
| Lilita One (§7.1 önerisi) | ❌ **Ğ ğ İ Ş ş yok** | ❌  | ❌                     | SIL OFL 1.1                                            | ❌ Elendi. "GALİBİYET" yazılamıyor. |
| Titan One (§7.1 önerisi)  | ❌ **İ yok**         | ❌  | ❌                     | SIL OFL 1.1                                            | ❌ Elendi                           |
| Fredoka                   | ❌ **Ğ ğ İ Ş ş yok** | ❌  | ❌                     | SIL OFL 1.1                                            | ❌ Elendi                           |

> Google Fonts sayfasında "Latin Extended" yazması Türkçe desteğini garanti etmez. Lilita One ve Fredoka bu etiketi taşıdığı halde Türkçe harfleri eksik. **Yeni bir font eklemeden önce mutlaka aşağıdaki test cümlesiyle dene.**

#### Roller

| Rol                                             | Font                                       | Ağırlık                  | Boyut @1x | Not                                                                              |
| ----------------------------------------------- | ------------------------------------------ | ------------------------ | --------- | -------------------------------------------------------------------------------- |
| Başlık, buton etiketi, fiyat                    | Paytone One                                | Regular (tek ağırlık)    | 52–110    | Başlıklar büyük harf, 4–6 px koyu dış kontur. Buton metninde kontur yok.         |
| Gövde, açıklama, liste                          | Nunito                                     | Bold 700 / ExtraBold 800 | 34–44     | Cümle düzeni. Regular ve daha ince ağırlıklar kullanılmaz (küçük ekranda zayıf). |
| Skor, süre, sayaçlar                            | Nunito                                     | Black 900                | 72–96     | Rakamlar varsayılan olarak sabit genişlikli                                      |
| Onomatope ve büyük anlar (GOL!, TAK!, KAZANDIN) | **El çizimi** vektör harf                  | —                        | 160–260   | Font değil, çizim. Lisans sorunu yok, oyuna özgü.                                |
| Logo                                            | El çizimi (Paytone One iskeleti üzerinden) | —                        | —         | Font dosyası değil, vektör çizim                                                 |

**Sabit genişlikli rakam notu:** Oyun motorları ve tarayıcı canvas'ı OpenType özelliklerini (`tnum`) genellikle desteklemez. Bu yüzden skor ve süre Nunito Black ile yazılır (rakamları zaten eşit genişlikte) ya da sabit aralıklı bir bitmap font olarak üretilir.

#### Türkçe kuralları

- **Büyük harf dönüşümü:** `toLocaleUpperCase('tr-TR')`. `toUpperCase()` "galibiyet"i "GALIBIYET" yapar, doğrusu "GALİBİYET".
- **Yalnızca büyük harfli fontlarda** küçük "i" noktasız "I" olarak çizilebilir (test edilen iki caps fontta "şişe" → "ŞIŞE" oldu). Böyle bir font kullanılırsa metin önce `tr-TR` ile büyük harfe çevrilir.
- **Sayı biçimi:** `Intl.NumberFormat('tr-TR')` → 1.250 (nokta binlik), 119,99 (virgül ondalık). Mağaza fiyatları mağazanın verdiği yerel biçimle gösterilir.
- **Butonlar en uzun Türkçe etikete göre boyutlandırılır:** "GÜNLÜK GÖREVLER", "GALİBİYET SERİSİ", "REKLAMLARI KALDIR".
- **Üst işaretler:** Ğ, İ, Ü, Ö buton içinde kırpılmamalı. Metin kutusunun üstte yaklaşık %18'i boş bırakılır ve dikey ortalama buna göre ayarlanır.
- **Test cümlesi** (tüm Türkçe harfleri içerir):
  `Pijamalı hasta yağız şoföre çabucak güvendi.` / `PİJAMALI HASTA YAĞIZ ŞOFÖRE ÇABUCAK GÜVENDİ.`

#### Lisans kontrolü

SIL Open Font License 1.1 şunlara izin verir: ticari kullanım, oyuna ve uygulamaya gömme, oyunla birlikte dağıtma. Şartları:

- Font **tek başına satılamaz.**
- **Telif bildirimi ve lisans metni fontla birlikte dağıtılır:** Build içinde `OFL.txt` + oyunda "Lisanslar" ekranı.
- Font **değiştirilirse** (glif ekleme, birleştirme; emin değilsen alt küme çıkarma da dahil) değiştirilmiş dosya ayrılmış font adını ("Paytone" gibi) taşıyamaz. En temizi: fontu değiştirmeden kullanmak.
- Her fontun adı, kaynağı, lisansı, indirme tarihi ve dosya özeti (hash) `docs/LICENSES_ART.md` dosyasına kaydedilir.

### 11.6 İkonlar

- **Izgara:** 128 × 128 @1x (256 @2x), güvenli alan 112, kontur 4 px @1x.
- **Stil:** Ön görünüm (düz, perspektifsiz), 2 ton (taban + gölge) + tek parlama, üst kenarda sıcak kenar ışığı. Tek nesne, aynı açı, aynı kontur.
- **Anlam evrenseldir, malzeme stadyumdan gelir.** Ayarlar yine çarktır ama boyalı metal çark. İkonun anlamı tema uğruna değiştirilmez.

| İkon                                       | Görsel                                              |
| ------------------------------------------ | --------------------------------------------------- |
| Mağaza                                     | Büfe tentesi + vitrin                               |
| Dolap                                      | Soyunma odası dolabı                                |
| Görevler                                   | Antrenörün klipsli not kâğıdı + tik                 |
| Sezon                                      | Duvar takvimi                                       |
| Günlük ödül                                | Takvim yaprağı + Altın sikke                        |
| Altın                                      | Altın sikke                                         |
| Elmas                                      | Elmas taşı                                          |
| Reklam izle (ödüllü)                       | Eski tüplü televizyon                               |
| Arkadaşlar                                 | İki küçük kafa                                      |
| Rövanş                                     | İki ok halkası                                      |
| Paylaş                                     | Kâğıt uçak                                          |
| Ayarlar, ses, titreşim, kilit, geri, kapat | Evrensel şekiller, boyalı metal ve emaye malzemeyle |

### 11.7 Uygulama ikonu

- **Konsept** (§7.1): Turuncu gün batımı zemininde iki kafa alın alına (ör. Bakkal + bir futbolcu tipi; son seçim model sayfalarından sonra), aralarında küçük yıldızlar. **Yazı yok.**
- **Master:** 1024 × 1024 katmanlı vektör: arka plan (gök bantları) / iki kafa / yıldızlar. Katmanlı tutulduğu için her platform biçimi buradan çıkar.
- **Google Play:** 512 × 512, 32-bit PNG (alfa ile), en fazla 1024 KB. **Tam kare ve gölgesiz yüklenir;** Play köşe yuvarlamasını (%20) ve gölgeyi kendisi ekler.
- **Android uyarlanabilir simge (adaptive icon):** Ön plan ve arka plan katmanları 108 × 108 dp. İki kafa ortadaki **66 dp'lik güvenli dairenin** içinde kalır. Tema simgeleri için tek renkli (monochrome) katman da hazırlanır.
- **iOS:** 1024 × 1024, opak. Apple'ın güncel katmanlı simge biçimi için yayın öncesi güncel yönergeyi kontrol et (katmanlı master bu dönüşümü kolaylaştırır).
- **Testler:** 48 px'te okunuyor mu? Mağaza ızgarasında Kafa Topu 2, Head Soccer ve Basketball Arena ikonlarının yanında 1 saniyede ayrışıyor mu (analiz §7.5)?
- **Öne çıkan görsel (feature graphic):** 1024 × 500, JPEG veya 24-bit PNG (**alfa yok**). Adil mağaza mesajı ("Gördüğünü alırsın · Güç satılmaz") ekran görüntülerinden birinde yer alır (analiz §6.1).

---

## 12. Görsel efektler

### 12.1 Efekt stili

- **Efektler de çizilir:** Düz renk, kalın ve sade şekiller. Büyük efektler tam konturlu, küçük parçacıklar kontursuzdur.
- Parçacıklar şekildir: yıldız, toz pufu, kâğıt konfeti, ter damlası, hız çizgisi.
- **ASLA** glow, bloom, additive ışık veya lens parlaması kullanılmaz (bunlar Yön B'nin dilidir).
- **Renkler paletten:** kırık beyaz, gün batımı turuncusu, krem, kontur ve yıldız sarısı `#FFE7A0`. OYNA sarısı efektte kullanılmaz.
- **Onomatope:** El çizimi harf, tam kontur, en fazla 2 renk, en fazla 500 ms. **TAK!** (kafa çarpışması), **GOL!**, **PAT!** (güçlü vuruş), **ÇAT!** (direk).

### 12.2 Efekt bütçesi

Değerler **üst sınırdır.** Test sonucuna göre düşürülebilir; artırmak için önce bu tablo güncellenir.

| Olay                                       | Efekt                                                                                        | Süre     | Parçacık (en fazla) | Kamera                                 | Öncelik |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- | -------- | ------------------- | -------------------------------------- | ------- |
| **Kafa çarpışması** (imza an, analiz §6.4) | 90 ms donma (hit-stop), 5 yıldızlı halka, "TAK!", iki kafa birbirinden seker, sersem ifadesi | 600 ms   | 12                  | 6 px sarsıntı, 150 ms                  | 1       |
| **Gol**                                    | File dalgalanır, "GOL!", kâğıt konfeti, tribün ayağa fırlar, atkılar ve bayraklar havalanır  | 1.800 ms | 40                  | 10 px sarsıntı, 250 ms + %4 yakınlaşma | 1       |
| Güçlü vuruş (eşik üstü hız)                | 3 hız çizgisi + "PAT!"                                                                       | 250 ms   | 6                   | 3 px, 80 ms                            | 2       |
| Top direğe çarpar                          | "ÇAT!" (küçük) + 2 titreşim çizgisi                                                          | 250 ms   | 4                   | 2 px, 60 ms                            | 2       |
| Normal vuruş                               | 3 toz pufu                                                                                   | 200 ms   | 3                   | —                                      | 3       |
| Top izi (hızlıyken)                        | Segmentli iz, opaklık ≤ %50, uzunluk ≤ 3 top çapı                                            | Sürekli  | 6                   | —                                      | 3       |
| Gol yiyen oyuncu                           | Ter damlası + yenilgi ifadesi                                                                | 800 ms   | 2                   | —                                      | 3       |
| İniş                                       | 2 toz pufu                                                                                   | 200 ms   | 2                   | —                                      | 4       |
| Sonuç ekranı (kazanma)                     | Konfeti + kazanan pozu                                                                       | 2.000 ms | 60                  | —                                      | —       |
| Arayüz ödülü                               | Parıltı yıldızları                                                                           | 600 ms   | 8                   | —                                      | —       |

### 12.3 Genel sınırlar

- Aynı anda **en fazla 60 parçacık** maç içinde, 80 menülerde. Sınır aşılırsa düşük öncelikli efekt üretilmez.
- **Kamera sarsıntısı** toplamı 12 px'i geçmez. Sarsıntılar üst üste eklenmez, büyüğü geçerli olur.
- **Donma (hit-stop)** yalnızca kafa çarpışmasında, en fazla 100 ms.
- **Flaş:** Yalnızca golde, kırık beyaz %20 opaklık, 100 ms. **Saniyede 3'ten fazla flaş asla olmaz** (ışığa duyarlı epilepsi eşiği).
- Ekranın **%25'inden büyük yarı saydam efekt** yoktur (mobilde aşırı çizim yükü). Tam ekran yarı saydam katman aynı anda en fazla bir tane (geçişler hariç).
- **Hedef:** Orta segment Android cihazda maç içi kararlı 60 fps.

### 12.4 Kozmetik efekt kuralları

- Kozmetik efektler (top izi, gol kutlaması) aynı bütçeye tabidir.
- Top izi asla topun kendisinden daha parlak veya daha büyük olamaz, topu gizleyemez.
- Kozmetik efekt rakibin karakterini veya kalesini örtemez ve oynanış hakkında yanlış bilgi veremez (ör. topun gerçek konumunu gizleyen iz).
- Gol kutlaması standart gol efektinin süresini (1.800 ms) aşamaz.

### 12.5 Erişilebilirlik ayarları

- **Ekran sarsıntısı:** Açık / azaltılmış (%50) / kapalı
- **Flaş efektleri:** Açık / kapalı
- **Kontroller:** Boyut, opaklık, konum, sol el düzeni (§11.4)

---

## 13. Dosyalar, çözünürlükler ve isimlendirme

### 13.1 Klasör yapısı

```
art/                        ← kaynak dosyalar (oyuna doğrudan girmez)
  _palet/                   kafakafaya_palet.ase · .gpl · palette.json
  _sablon/                  karakter_sablonu.svg · ekran_duzeni_2560x1440.svg ·
                            ikon_izgarasi.svg · kontur_profilleri
  _konsept/                 yapay zekâ konseptleri + prompt kayıtları (ASLA oyuna girmez)
  karakter/{id}/            kaynak vektör, model sayfası
  yuz/                      ortak yüz kütüphanesi (göz, kaş, ağız, kulak, yaş katmanı)
  kozmetik/                 saç, şapka, gözlük, forma, ayakkabı, top
  saha/{tema}/              modüler saha kiti
  arayuz/
  ikon/
  efekt/
  pazarlama/                uygulama ikonu master, öne çıkan görsel, ekran görüntüleri
assets/                     ← dışa aktarılmış, oyunun kullandığı dosyalar
docs/ART_BIBLE.md
docs/LICENSES_ART.md        font ve üçüncü taraf varlık lisansları
```

Kaynak dosyalar **Inkscape SVG**'sidir ([Ek B](#ek-b--kararlar) karar 5): metin dosyası olduğu için git farkı görünür. Büyük PNG'ler ve konsept görselleri için **Git LFS** kullanılır; aksi halde depo hızla şişer.

### 13.2 Formatlar

| Tür                    | Kaynak                                    | Oyuna giren                                               | Not                                                                                               |
| ---------------------- | ----------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Karakter parçaları     | Inkscape SVG (tek kaynak)                 | PNG-32 (sRGB, alfa) → atlas                               | Her parçanın çevresinde 2 px şeffaf pay. Parçalar şablon sayfası boyutunda dışa aktarılır (§13.6) |
| Arka plan              | Vektör                                    | PNG-32 (K2–K5 @1x); K0–K1 @0,5x                           | Gök bantları istenirse motorda düz renkle çizilir                                                 |
| Arayüz                 | Vektör                                    | PNG-32 atlas + 9-dilim verisi                             |                                                                                                   |
| İkonlar ve efektler    | Vektör                                    | PNG-32 atlas                                              |                                                                                                   |
| Fontlar                | TTF (OFL)                                 | TTF veya bitmap font (`.fnt` + PNG)                       | Lisans metni build'e eklenir                                                                      |
| Pivot ve katman verisi | Şablondaki eklem noktaları (Inkscape SVG) | `kar_{id}_iskelet.json`                                   | §13.6. Animasyonun kendisi kodda (Faz 3.2); animasyon dosyası yok                                 |
| Uygulama ikonu         | Katmanlı vektör 1024                      | 512 PNG (Play), adaptive katmanlar, iOS 1024              | §11.7                                                                                             |
| Pazarlama              | Vektör + PNG                              | 1024×500 JPEG/PNG (alfa yok), ekran görüntüleri 1920×1080 |                                                                                                   |
| Palet                  | `.ase` / `.gpl`                           | `palette.json`                                            | Tek kaynak                                                                                        |

- **Web sürümü:** PNG ya da kayıpsız WebP. **Mobil:** Motorun doku sıkıştırması (ASTC veya ETC2). Sıkıştırmadan sonra kontur kenarlarında bozulma olup olmadığı test edilir; karakter ve arayüz atlasları yüksek kaliteyle sıkıştırılır.
- **Alfa:** Atlas aracının "premultiplied alpha" ayarı motorun beklentisiyle eşleşmelidir. Test: Parçaları açık ve koyu zemin önünde göster; kenarlarda beyaz veya siyah hale olmamalı.

### 13.3 Çözünürlükler ve ölçekler

| Ölçek     | Ne için                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------- |
| **@1x**   | 1920 × 1080 tasarım çözünürlüğü. Oyun mantığı ve yerleşim bu birimde.                              |
| **@2x**   | Kaynak çizim ölçeği. Gerçek ekran yüksekliği ≥ 1300 px olan cihazlar (ör. tabletler) ve pazarlama. |
| **@0,5x** | (İsteğe bağlı) Düşük bellek modu, mobil web                                                        |

- Her ölçek **doğrudan vektörden** dışa aktarılır. Bitmap'ten küçültme yapılmaz.
- Arayüz öğeleri tam piksele hizalanır. Dönen karakter parçalarında bu gerekmez.

### 13.4 Atlas ve bellek bütçesi

- **Atlas en fazla 2048 × 2048** (eski cihazlarda da güvenli).
- Bir karakterin tüm parçaları @1x'te tek bir **1024 × 1024** atlasa sığar (@2x'te 2048).
- **Atlas ayarları:** 2 px dolgu (padding), 1 px kenar uzatma (extrude), boşluk kırpma (trim) açık, döndürme kapalı (pivot hesabını basitleştirir).
- **Trim açıkken pivotlar kırpılmamış orijinal koordinatlarda saklanır.**
- **Maç içi bellek bütçesi** (sıkıştırılmamış RGBA, @1x): saha ≤ 32 MB · iki karakter ve kozmetikleri ≤ 16 MB · arayüz + HUD + efekt ≤ 16 MB → **maç toplamı ≤ 64 MB.** Doku sıkıştırması bunu birkaç kat düşürür; bütçe sıkıştırma olmayan en kötü duruma göre konmuştur.

### 13.5 İsimlendirme

**Kalıp:** `{kategori}_{kimlik}_{parça}[_{varyant}][_{durum}]@{ölçek}.png`

**Kurallar:**

- Küçük harf, **yalnızca ASCII,** boşluk yerine alt çizgi
- Türkçe harfler dönüştürülür: ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u
- Sıra numaraları iki basamaklı (`01`, `02`)
- Ölçek eki her zaman var: `@1x`, `@2x`
- Dosya adında `final`, `son`, `yeni`, `v2` yok. **Sürümü git tutar.** (Yalnızca `_konsept/` altında tarih + sıra numarası kullanılır.)

| Kategori         | Önek    | Örnek                                                                                                                          |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Karakter parçası | `kar_`  | `kar_bakkal_kafa_taban@1x.png` · `kar_bakkal_biyik@1x.png` · `kar_bakkal_govde_ev@1x.png` · `kar_bakkal_govde_alt_acik@1x.png` |
| Ortak yüz        | `yuz_`  | `yuz_goz_mutlu_buyuk@1x.png` · `yuz_kas_catik_kalin@1x.png` · `yuz_agiz_kahkaha@1x.png`                                        |
| Kozmetik         | `koz_`  | `koz_sapka_kasket_antrasit@1x.png` · `koz_sac_dalgali_sapka_alti@1x.png` · `koz_ayakkabi_klasik_kirmizi@1x.png`                |
| Top              | `top_`  | `top_klasik@1x.png` · `top_klasik_isik@1x.png` (dönmeyen katman)                                                               |
| Saha             | `saha_` | `saha_gece_k2_tribun_03@1x.png` · `saha_gece_k0_gok@0.5x.png`                                                                  |
| Arayüz           | `ui_`   | `ui_buton_birincil_basili@1x.png` · `ui_panel_emaye_vidali@1x.png`                                                             |
| İkon             | `ikon_` | `ikon_magaza@1x.png` · `ikon_elmas@1x.png`                                                                                     |
| Efekt            | `fx_`   | `fx_yildiz_01@1x.png` · `fx_onomatope_tak@1x.png`                                                                              |
| Pazarlama        | `paz_`  | `paz_uygulama_ikonu_512.png` · `paz_one_cikan_1024x500.jpg`                                                                    |
| Kaynak           | —       | `art/karakter/bakkal/kar_bakkal.svg`                                                                                           |
| İskelet          | —       | `kar_bakkal_iskelet.json` (§13.6)                                                                                              |
| Konsept          | —       | `art/_konsept/bakkal/2026-11-20_01.png` + `2026-11-20_01.txt`                                                                  |

**Durum ekleri:** `_normal`, `_basili`, `_pasif` · **İfade ekleri:** `notr`, `sevinc`, `efor`, `yenilgi`, `saskin`, `sersem` · **Forma ekleri:** `ev`, `alt_acik`, `alt_koyu`.

### 13.6 Pivot ve katman verisi (kod tabanlı animasyon)

Animasyon kodla yazılır (Faz 3.2; [Ek B](#ek-b--kararlar) karar 6). Motor her karakter için yalnızca iki şey bekler: atlastaki **parça görselleri** ve tek bir **iskelet dosyası** (`kar_{id}_iskelet.json`). Animasyon aracı, anahtar kare ya da zaman çizelgesi dosyası yoktur; yürüme, vuruş, yaylı kafa ve ifade değişimleri kodda.

**Koordinat sistemi** (§6.1'deki eklem sistemiyle aynı):

- Birim **@2x**; motor @1x için 2'ye böler.
- Orijin (0, 0) = zemin çizgisi ile gövde merkezinin kesiştiği nokta.
- x öne doğru (+), y **yukarı** doğru (+); karakter sağa bakar. Motor y'yi ekran yönüne çevirir, rakip için x'i aynalar.
- Pivot her zaman bu sistemde yazılır, görselin kendi köşesine göre değil. Atlas boşluğu kırpsa da pivot değişmez (§13.4).

**Dışa aktarma kuralı:** Her parça, dışa aktarma alanı şablon sayfasının tamamı olacak şekilde ayrı bir PNG olarak verilir (Inkscape: dışa aktarma alanı "Sayfa", diğer katmanlar gizli). Böylece parçanın sayfadaki yeri korunur; atlas aracı boşluğu kırpar ve kırpma payını (orijinal boyut + konum) kaydeder. Motor parçanın yerini bu kayıttan, dönme noktasını iskelet dosyasından bulur. Kozmetik parçalar (saç, şapka, forma, ayakkabı) ve ortak yüz parçaları aynı şablon sayfasında çizildiği için aynı sistemi kullanır ve her karaktere oturur.

**İskelet dosyasının alanları:**

| Alan       | İçerik                                                                                                                                                                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `surum`    | Biçim sürümü (şu an `1`). Biçim değişince artar; motor tanımadığı sürümü yüklemez.                                                                                                                                                                               |
| `kimlik`   | Karakter `id`'si (§7.3)                                                                                                                                                                                                                                          |
| `beden`    | `ince` · `orta` · `genis`                                                                                                                                                                                                                                        |
| `sayfa`    | Şablon sayfasının @2x genişliği, yüksekliği ve orijinin sayfadaki konumu. Tüm karakterlerde aynıdır; şablondan kopyalanır.                                                                                                                                       |
| `eklemler` | Eklem adı → `[x, y]`. Değerler §6.1'deki tablodan; beden varyantında yalnızca omuz ve kalça x'i ±10 kayar.                                                                                                                                                       |
| `parcalar` | Arkadan öne sıralı liste: `ad` (dosya adındaki parça adı, §13.5), `katman` (§6.1 numarası, metin olarak: `"8.10"` sayı olsa `8.1` ile karışır), `eklem` (parçanın döndüğü eklem; gövde için `null`). Kafa grubundaki parçalar (8.x) hep `kafa` ekleminden döner. |
| `soketler` | Efekt soketleri (§6.1, 8.15): ter damlası ve yıldız halkası noktaları                                                                                                                                                                                            |

Örnek (kısaltılmış; gerçek dosyada `sayfa`, bütün eklemler ve bütün parçalar yazılır):

```json
{
  "surum": 1,
  "kimlik": "bakkal",
  "beden": "genis",
  "eklemler": { "kafa": [-11, 262], "on_omuz": [30, 230], "arka_omuz": [-30, 230] },
  "parcalar": [
    { "ad": "arka_kol", "katman": "1", "eklem": "arka_omuz" },
    { "ad": "govde_ev", "katman": "3", "eklem": null },
    { "ad": "biyik", "katman": "8.9", "eklem": "kafa" }
  ]
}
```

**Kim üretir, kim denetler:** Eklem noktaları şablonun kilitli "eklemler" katmanında, `eklem_kafa`, `eklem_on_omuz` gibi kimlikli küçük dairelerdir (Inkscape: kimlik Nesne Özellikleri'nden verilir); parça katmanlarının kimliği dosya adındaki parça adıdır. İskelet dosyası başta elle yazılır; Faz 3.1'in varlık aracı bu kimliklerden otomatik üretebilir. Faz 3.2'de bir test her iskelet dosyasındaki eklemleri §6.1'deki standart değerlerle karşılaştırır; beden payı (±10) dışındaki fark hata verir.

---

## 14. Kabul kriterleri

### 14.1 Kalite kapıları

| Kapı                  | Çıktı                                                         | Geçme şartı                                       |
| --------------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| **K0 Konsept**        | Yapay zekâ çıktısı veya eskiz + prompt kaydı                  | Yalnızca fikir. Oyuna asla girmez.                |
| **K1 Model sayfası**  | Profil (ana) + ön ve arka (referans) + 6 ifade + renk listesi | Silüet testi, kadro testi (§7.5), detay sınırları |
| **K2 Oyun parçaları** | Katmanlı vektör, şablona hizalı, adlandırılmış                | §14.2 listesinin "Kaynak" ve "Stil" bölümleri     |
| **K3 Motor içi test** | Gerçek sahne, gerçek boyut, animasyonla                       | §14.3 testlerinin tamamı                          |
| **K4 Kabul**          | `assets/` klasörüne girer                                     | §14.2 listesinin tamamı                           |

### 14.2 Oyuna girme kontrol listesi

Bir görsel **yalnızca** bu listenin tamamı işaretliyse oyuna girer.

**Kaynak**

- [ ] Elle çizilmiş vektör kaynak dosyası var. Yapay zekâ çıktısı veya otomatik iz yok.
- [ ] Konsepti varsa prompt kaydı `_konsept/` içinde
- [ ] Dosya adı ve klasörü §13'e uygun

**Stil**

- [ ] Yalnızca master paletteki renkler (global swatch'a bağlı)
- [ ] Kontur kalınlıkları ve rengi standartta (§3.5)
- [ ] Işık modeline uygun: gölge alttan, kenar ışığı sırtta (§3.1)
- [ ] Oranlar şablonda: kafa dairesi, zemin, eklem noktaları, yüz ızgarası (§4)
- [ ] Tam profil ve sağa bakıyor; aynalandığında sorun yok
- [ ] Detay sınırları içinde (§5)
- [ ] Yapay zekâ izi kontrol listesinin tamamı işaretli (§9.3)

**Okunurluk** (§14.3 testleri)

- [ ] 6 inç telefon testi
- [ ] Gri tonlama testi
- [ ] Renk körlüğü testi
- [ ] Küçültme testi (64 px ve 32 px)
- [ ] Kadro yan yana testi

**Teknik**

- [ ] @1x ve @2x dışa aktarıldı, ölçüler doğru
- [ ] İskelet dosyası (§13.6) var; parçalar şablon sayfası boyutunda dışa aktarıldı
- [ ] Atlas bütçesine sığıyor (§13.4)
- [ ] Kenarlarda hale yok (açık ve koyu zemin testi)
- [ ] Yaylı kafa ±18° testinde boşluk yok (karakter ve kafa kozmetikleri için)

**Hukuk ve etik**

- [ ] Gerçek bir kişiye, kulübe, stadyuma veya markaya benzemiyor
- [ ] Klişe içermiyor (§7.2)
- [ ] Kullanılan font ve üçüncü taraf varlıklar `LICENSES_ART.md` dosyasında kayıtlı

**Kozmetikse ek olarak**

- [ ] Çarpışma alanını değiştirmiyor; taşma payı (D'nin %10'u) içinde
- [ ] Tüm kafa şekilleri ve beden varyantlarıyla uyumlu ya da uyumsuz kombinasyonlar işaretli
- [ ] Okunurluğu ve efekt bütçesini bozmuyor (§12.4)
- [ ] Mağaza önizlemesi hazır (maç içindeki görünüşüyle)

### 14.3 Test prosedürleri

| Test                       | Nasıl                                                                                                                                             | Geçme şartı                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **6 inç telefon**          | Gerçek cihazda, maç ekranında, kol mesafesinden                                                                                                   | 1 saniyede: karakterler, top, skor ve "ben hangisiyim"                       |
| **Gri tonlama**            | Ekran görüntüsünü gri tona çevir                                                                                                                  | Karakterler arka plandan, iki oyuncu birbirinden ve top her şeyden ayrışıyor |
| **Renk körlüğü**           | Protanopi, döteranopi ve tritanopi simülasyonu (Color Oracle, Chrome DevTools "Emulate vision deficiencies" ya da vektör programının prova ayarı) | İki oyuncu ve HUD tarafları ayrışıyor; forma çakışma kuralı doğru çalışıyor  |
| **Küçültme**               | Karakteri 64 px ve 32 px yüksekliğe küçült                                                                                                        | 64 px'te kim olduğu ve ifadesi, 32 px'te silüeti okunuyor                    |
| **Kadro yan yana**         | Kabul edilmiş tüm karakterlerin yanına koy                                                                                                        | Boy, kontur, doygunluk ve detay yoğunluğu aynı; "aynı elden çıkmış"          |
| **Aynalama**               | Sağdaki oyuncu olarak aynala                                                                                                                      | Yazı, asimetri veya ışık sorunu yok                                          |
| **Yaylı kafa**             | Kafa grubunu ±18° döndür                                                                                                                          | Kafa ile gövde arasında boşluk yok                                           |
| **Mağaza ızgarası** (ikon) | Rakip ikonlarının yanına koy                                                                                                                      | 1 saniyede ayrışıyor                                                         |
| **Ünlü ve klişe**          | İki kişiye "Bu kime/neye benziyor?" diye sor                                                                                                      | Gerçek kişi, kulüp, stadyum veya klişe adı geçmiyor                          |
| **Swatch denetimi**        | Dosyadaki tüm renkleri listele                                                                                                                    | Palet dışı renk yok; karakter başına ≤ 18 swatch                             |
| **Türkçe metin** (arayüz)  | Test cümlesi ve en uzun etiketler                                                                                                                 | Eksik glif yok, taşma yok, büyük harf dönüşümü doğru                         |

### 14.4 Otomatik ret nedenleri

Aşağıdakilerden biri varsa görsel tartışmasız geri döner:

- Yapay zekâ çıktısı veya otomatik iz doğrudan kullanılmış
- Palet dışı renk
- Formada yazı, rakam, arma veya logo; yasaklı forma kombinasyonu
- Gerçek kişi, kulüp, stadyum veya marka çağrışımı
- Taşma payını aşan kozmetik (D'nin %10'undan fazla)
- Karakterde gradyan veya doku
- Oyunda 3/4 görünüm

---

## Ek A — palette.json

Oyun kodu ve araçlar için tek kaynak. Vektör paletindeki her değişiklik buraya da yansıtılır.

```json
{
  "version": "1.0",
  "core": {
    "gunbatimi": "#F28C38",
    "kiremit": "#C2562F",
    "krem": "#F3E3C3",
    "emaye": "#1F4E9C",
    "mor_golge": "#3B2F4A",
    "asfalt": "#4A4E57",
    "oyna": "#FFD23F",
    "kontur": "#2B1D14"
  },
  "character": {
    "goz": "#140C08",
    "goz_parlama": "#FFF9EE",
    "kenar_isigi": "#F28C38",
    "kenar_isigi_acik": "#FFD08A",
    "ten": {
      "T1": { "taban": "#F7DCC6", "golge": "#D8AC98", "allik": "#F0B0A1" },
      "T2": { "taban": "#EFC29F", "golge": "#D09176", "allik": "#EB9F87" },
      "T3": { "taban": "#DBA57C", "golge": "#BC7658", "allik": "#DE8C70" },
      "T4": { "taban": "#BF8558", "golge": "#A0593A", "allik": "#CC7759" },
      "T5": { "taban": "#93603D", "golge": "#814129", "allik": "#AB5F46" },
      "T6": { "taban": "#6A4029", "golge": "#582719", "allik": "#8E4938" }
    },
    "sac": {
      "siyah": "#463630",
      "koyu_kahve": "#5A3B2A",
      "kestane": "#8A4E2E",
      "bal": "#C99A55",
      "kizil": "#B5522B",
      "kir": "#A8A29C",
      "beyaz": "#ECE7DF"
    }
  },
  "accessory": {
    "antrasit": "#3D3A40",
    "bordo": "#8E2B3A",
    "domates": "#E04A3A",
    "pembe": "#E86FA8",
    "mor": "#7D4CB8",
    "turkuaz": "#1BA8BC",
    "cam": "#2E7D4F",
    "fistik": "#9CCB3B",
    "hardal": "#B98A12",
    "petrol": "#1E5F74",
    "kirik_beyaz": "#F5F0E6",
    "lavanta": "#C0A8E8"
  },
  "side": {
    "sol": { "ana": "#2A6AD8", "tahta": "#8CC4FF" },
    "sag": { "ana": "#FFA54A", "tahta": "#FFB877" }
  },
  "kits": {
    "lacivert": { "hex": "#24346E", "L": 24, "bant": "koyu" },
    "koyu_yesil": { "hex": "#1F5C40", "L": 35, "bant": "koyu" },
    "antrasit": { "hex": "#34343C", "L": 22, "bant": "koyu" },
    "patlican": { "hex": "#4E3088", "L": 28, "bant": "koyu" },
    "mavi": { "hex": "#2F6FD6", "L": 48, "bant": "orta" },
    "kirmizi": { "hex": "#D2412F", "L": 49, "bant": "orta" },
    "yesil": { "hex": "#2F9A5A", "L": 57, "bant": "orta" },
    "turuncu": { "hex": "#EE7A2A", "L": 64, "bant": "orta" },
    "pembe": { "hex": "#D9578F", "L": 56, "bant": "orta" },
    "beyaz": { "hex": "#F4F1EA", "L": 95, "bant": "acik" },
    "sari": { "hex": "#F5C945", "L": 83, "bant": "acik" },
    "acik_mavi": { "hex": "#8EC6F0", "L": 78, "bant": "acik" },
    "nane": { "hex": "#A6E3C6", "L": 86, "bant": "acik" },
    "seftali": { "hex": "#FFC59A", "L": 84, "bant": "acik" }
  },
  "kit_clash_rule": "gecer = (|L1-L2| >= 20) || (protan, deutan ve tritan simulasyonlarinin ucunde de deltaE2000 >= 25)",
  "background": {
    "gok": ["#5B5893", "#A9739B", "#EE9A6E", "#FFCF8F"],
    "bulut": "#EFA894",
    "uzak_siluet": "#765A80",
    "uzak_isik": "#F2A07A",
    "cephe_krem": "#A8998C",
    "cephe_sari": "#A18457",
    "cephe_mavi": "#6D7B90",
    "cephe_kiremit": "#863A22",
    "duvar": "#B89C86",
    "duvar_isik": "#F6C08A",
    "kaldirim": "#8C8A90",
    "zemin_cizgisi": "#E9B88A"
  },
  "ui": {
    "emaye": "#1F4E9C",
    "emaye_koyu": "#163A75",
    "kirik_beyaz": "#FFF9EE",
    "krem": "#F3E3C3",
    "oyna": "#FFD23F",
    "oyna_alt": "#D9A400",
    "bildirim": "#CF3A2C",
    "onay": "#2E9E5B",
    "pasif": "#B8B2A7",
    "pasif_metin": "#5C564F",
    "kara_tahta": "#2E3A36",
    "ahsap": "#7A4A2A"
  },
  "fx": { "yildiz": "#FFE7A0" }
}
```

---

## Ek B — Kararlar

v1.0'ın açık soruları 26 Kasım 2026'da karara bağlandı (v1.1). Bağlayıcıdır; değişiklik gerekiyorsa önce bu tablo güncellenir.

| #   | Soru                                                                  | Karar                                                                                                                                                                                                         | Yansıdığı yer                 |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1   | "Sen" her zaman solda mı? (Çevrim içi maçta ekran yerelde aynalanır.) | **Evet.** Her cihazda oyuncu solda; forma çakışmasında sağdaki (rakip) alternatife geçer, oyuncu kendini hep ev formasıyla görür.                                                                             | §2.6, §11.4                   |
| 2   | Premium para birimi olacak mı, olacaksa ne?                           | **Elmas.** Para birimleri Altın + Elmas (GAME_DESIGN_MOBILE §2.1). Misket iptal; şişe kapağı da kullanılmaz.                                                                                                  | §11.1, §11.6, §13.5           |
| 3   | Kedi oynanabilir mi?                                                  | **Kedi maskot kaldırıldı:** oynanabilir karakter, sahne öğesi ya da arayüz maskotu olarak kullanılmaz.                                                                                                        | §1.2, §7.4, §10.2, §12.2      |
| 4   | İlk kadro (§7.3) onayı                                                | **Model sayfalarına Bakkal + 2 futbolcu tipiyle başlanır** (öneri: Kor ve Bora); kadro testi erken yapılır.                                                                                                   | §7.3                          |
| 5   | Vektör programı                                                       | **Inkscape.** Genişlik profili: Power Stroke yol efekti. Global renk: Dolgu ve Kontur penceresindeki "Swatch" boya türü (palet çubuğundan tıklanan renk bağlı değildir). İkisi Faz 1.5 provasında doğrulanır. | §3.5, §13.1, §13.2, §13.5     |
| 6   | Animasyon aracı (Faz 3.2)                                             | **Kod tabanlı.** Parçalı animasyon ve yaylı kafa kodda; animasyon aracı ve animasyon dosyası yok. Pivot formatı: karakter başına bir iskelet dosyası, §6.1 eklem sisteminde.                                  | §6, §6.4, §13.2, §13.6, §14.2 |

**v1.1'de açık kalanlar:**

- Stadyum varyantlarının (gündüz, gece ışıklı, karlı, yağmurlu) renkleri ve çim zemin rengi (§2.4) → Faz 4.1 ve 7.2.
- İlk stadyumun ışığı (§2.4) → Faz 4.1.
- "Kafadarlar" marka tescil başvurusu → Faz 0.2 (TÜRKPATENT araştırması 2026-11-28: tescil yok).

---

## Ek C — Değişiklik günlüğü

| Sürüm | Tarih         | Değişiklik                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0   | 20 Kasım 2026 | İlk sürüm. Yön A + dev kafa oranları. §7.1'deki font önerileri (Lilita One, Titan One) Türkçe glif eksikliği nedeniyle Paytone One + Nunito ile değiştirildi. Palet renk körlüğü ve kontrast açısından hesaplanarak doğrulandı.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 1.1   | 26 Kasım 2026 | **Dünya ve kadro değişikliği; çizim tarzı aynı.** Oyun mahallede değil stadyumlarda geçer (gündüz, gece ışıklı, karlı, yağmurlu; ileride kumsal, çatı). Kadro: 9 kurgusal futbolcu tipi + 3 sürpriz karakter (Bakkal Amca, Fileli Dede, Kaleci Teyze); oyundaki 12 slotun istatistik ve süperleri aynı, Toprak → Bakkal, Yankı → Dede, Kauçuk → Kaleci Teyze (GAME_DESIGN_MOBILE K2). Çalışma adı "Kafa Kafaya: Futbol Arenası". Güncellenen bölümler: §1, §2.2 ve §2.4 (yalnızca kullanım metinleri), §2.6, §2.8 ve §3.1 (katman adları), §3.5, §3.6, §6, §6.3, §6.4, §7.1–7.5, §8.2, §8.5, §8.6, §9.3, §10, §11.1, §11.4, §11.6, §11.7, §12.2, §13, §14. §7.1'de yaş kuralı futbolcu kadrosuna uyarlandı (çocuk yok; 60+ en az %15) ve futbolcu/sürpriz oranı eklendi. Ek B kararlara dönüştü; yeni §13.6 (pivot formatı). Çizim kuralları, ölçüler ve palet değerleri değişmedi. |
| 1.2   | 28 Kasım 2026 | **Ad değişikliği.** Oyunun adı "Kafadarlar: Kafa Topu Düellosu" oldu (GAME_DESIGN_MOBILE K19); Play'de aynı adlı başka bir futbol oyunu olduğu için "Kafa Kafaya" bırakıldı. Kurallar aynı.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

**Dış kaynaklar:** [Google Play varlık gereksinimleri](https://support.google.com/googleplay/android-developer/answer/9866151) · [Google Play ikon tasarım özellikleri](https://developer.android.com/google-play/resources/icon-design-specifications) · [Android uyarlanabilir simgeler](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive) · [SIL Open Font License](https://openfontlicense.org) · [Google Fonts deposu](https://github.com/google/fonts)
