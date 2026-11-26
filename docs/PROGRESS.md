# İlerleme Günlüğü

> Kısa tutulur: burada yalnızca özet ve onay kutuları var. Biten fazların ayrıntıları
> [docs/archive/](archive/) altında: web sürümü (Faz 0–7) → [PROGRESS_WEB.md](archive/PROGRESS_WEB.md),
> mobil Bölüm 0 → [PROGRESS_MOBILE_0.md](archive/PROGRESS_MOBILE_0.md), Bölüm 1 →
> [PROGRESS_MOBILE_1.md](archive/PROGRESS_MOBILE_1.md), Bölüm 2 →
> [PROGRESS_MOBILE_2.md](archive/PROGRESS_MOBILE_2.md).

## Web sürümü v1.0.0 — özet

Canlı: https://emengin.github.io/kafa-kafaya/ · ölçümler, denge tabloları, faz kararları: arşivde.

**Mimari**

- Vite + TypeScript (strict) + Phaser 4.2.1 (v1.0.0'da 3.90; geçiş Faz 2.0); mantıksal 1280×720,
  FIT + letterbox.
- `src/physics`: Phaser'dan bağımsız deterministik fizik (60 Hz sabit adım, sub-stepping, render
  enterpolasyonu). `GameSim` yalnızca `InputState` dizisiyle ilerler; ses/efekt olayları durumu
  değiştirmez; `saveState`/`loadState` tam durum kopyası (gol tekrarı bunun üstünde).
- Girdi: klavye, gamepad, dokunmatik → sanal tuş (`src/input/virtualKeys.ts`) → `InputState`; AI ve
  tekrar oynatıcı da aynı arayüzü üretir.
- AI (`src/game/ai`): fizikle ileri simülasyonla tahmin, 3 zorluk, tohumlu rastgelelik, hile yok.
- Harici dosya yok: dokular Canvas 2D ile kodla, sesler Web Audio sentezi. `LiteGraphics` + kendi
  köşe tamponu çizicisi (resimlerle aynı toplu çizime yazar), havuzlu parçacıklar, 3 kademeli
  uyarlamalı kalite.
- Tüm denge/ayar değerleri `src/config/gameConfig.ts`; sihirli sayı lint ile yasak.
- Kayıt: `localStorage`, anahtar başına alan alan doğrulama (`src/save`). PWA: kodla SW + manifest.
- Kalite hattı: ESLint + Prettier (Markdown dahil) + Vitest (325 test) + Playwright duman testi.
  `main`'e push → GitHub Pages (`deploy.yml`); `v*` etiketi → GitHub Release (`release.yml`).
  `npm run bench`: iki üretim derlemesini yan yana ölçer (boyut, açılış, kare işi, determinizm).
- Üretimde özel Phaser paketi (`scripts/phaser`: BitmapText, ses yöneticisi, Phaser parçacıkları
  yok) + kod bölme: gzip 305 kB (v1.0.0 / Phaser 3: 277 kB).

**Önemli kararlar**

- Determinizm temeldir: hit-stop ve ağır çekim döngü süresini keser, adım sayısını değil; tekrar =
  anahtar kare + girdiler. Determinizm testleri (`GameSim.test.ts` vb.) her değişiklikte koşar.
- Tek girdi yolu (sanal tuşlar); tek dünya kabı (sarsıntı/zoom yalnızca dünyaya, HUD sabit).
- Denge süper parametreleriyle yapıldı; karakter istatistikleri (toplam 14) korunur.
- Turnuva maçında yeniden başlatma yok; bozuk kayıt onarılmaz, güvenli varsayılana düşer.

**Bilinen sorunlar**

- Gerçek düşük güçlü telefonda, iOS Safari'de ve gerçek gamepad'le ölçülmedi (benzetimle doğrulandı).
- Determinizm JS motorları arasında garanti değil (`Math.sin/cos/exp` sonuçları motora göre
  değişir) → Faz 2.7.
- Telefonda yazılar küçük (~0,54 ölçek); tek telefonda dokunmatikle 2 oyuncu yok.
- iOS Safari'de tam ekran yok; yalnızca gamepad'le ses başlamıyor (autoplay kuralı).
- Denge AI vs AI vekil ölçümüne dayanıyor: Ayaz %57, en dengesiz eşleşme Bora–Toprak %71 → Faz 2.9.
- Turnuvadan duraklatıp çıkınca maç sayılmıyor; SW güncellemesi bir sonraki açılışta gelir.

## Mobil yol haritası

Kaynak: [ROADMAP_MOBILE.md](ROADMAP_MOBILE.md). [CC] Claude Code · [SOHBET] claude.ai · [SEN]
geliştirici · [PRO] avukat / mali müşavir. Kararlar:
[GAME_DESIGN_MOBILE.md § Kararlar](GAME_DESIGN_MOBILE.md#kararlar).

**Bağımlılıklar:** Bölüm 2, Bölüm 1 ile paralel ilerleyebilir · 3.4, 1.4 ve 1.6 bitmeden başlamaz ·
2.9, 2.7'den sonra · 8.3–8.8, 8.1–8.2'den sonra.

- **Bölüm 0 — Hazırlık**
  - [ ] 0.1 Hesaplar ve araç seti [SEN]
  - [ ] 0.2 Şirket, vergi, marka [SEN + PRO]
  - [x] 0.3 Proje yapısı ve dokümanlar [CC] — 2026-11-20
  - [x] 0.4 Kararlar ve yol haritası revizyonu [CC] — 2026-11-20
- **Bölüm 1 — Tasarım ve sanat yönü**
  - [x] 1.1 Mobil oyun tasarım dokümanı [CC] — 2026-11-20 →
        [GAME_DESIGN_MOBILE.md](GAME_DESIGN_MOBILE.md)
  - [x] 1.2 Rakip analizi [SEN + SOHBET] — 2026-11-20 →
        [COMPETITOR_ANALYSIS.md](COMPETITOR_ANALYSIS.md)
  - [x] 1.3 Stil testleri [SEN] — 2026-11-20 →
        [design/style-tests/NOTLAR.md](../design/style-tests/NOTLAR.md)
  - [x] 1.4 Sanat rehberi [SOHBET] — 2026-11-20 → [ART_BIBLE.md](ART_BIBLE.md)
    - v1.1 (2026-11-26): dünya mahalleden stadyuma, kadro futbolcu tiplerine geçti; çizim tarzı
      aynı. Ek B kararları işlendi (Elmas, Inkscape, kod tabanlı animasyon, kedi yok).
  - [ ] 1.5 Üretim hattı provası [SEN] — kalite kapısı: sanat yönü
    - Bakkal taslağı (`art/karakter/bakkal/kar_bakkal_taslak.svg`) geçici, revizyon bekliyor.
  - [ ] 1.6 Arayüz tasarım sistemi [SEN + SOHBET]
- **Bölüm 2 — Mobil temel [CC]** (Bölüm 1 ile paralel)
  - [x] 2.0 Phaser 4'e geçiş — 2026-11-20 → Phaser 4.2.1, karşılaştırma aşağıda
  - [x] 2.1 Capacitor ve Android derleme — 2026-11-26 → gerçek telefonda açılıp oynandı (aşağıda)
  - [x] 2.2 Ekran ve ölçekleme — 2026-11-26 → gerçek telefonda kontrol edildi (aşağıda)
  - [x] 2.3 Dokunmatik kontroller v2 — 2026-11-26 → telefonda denendi, geri bildirim işlendi (aşağıda)
  - [x] 2.4 Performans (rollback ≤ 4 ms dahil) — 2026-11-27 → telefonda 30 → 60 FPS, rollback p99 1,1 ms
        (aşağıda)
  - [ ] 2.5 Uygulama yaşam döngüsü — kod tamam, adb ön testleri geçti; telefonda kesinti testi bekliyor
        (aşağıda)
  - [ ] 2.6 Sürekli derleme hattı
  - [ ] 2.7 Determinizm sertleştirme
  - [ ] 2.8 Gözlemlenebilirlik temeli
  - [ ] 2.9 His ve denge yeniden ayarı
- **Bölüm 3 — Görsel ve ses altyapısı [CC]**
  - [ ] 3.1 Asset manifest ve placeholder sistemi
  - [ ] 3.2 Parçalı animasyon sistemi
  - [ ] 3.3 Kozmetik katman sistemi
  - [ ] 3.4 Tasarım sistemi ve bileşen kütüphanesi (ön koşul: 1.4, 1.6)
  - [ ] 3.5 Ekran akışı ve geçişler
  - [ ] 3.6 Görsel efekt ve "juice" kütüphanesi
  - [ ] 3.7 Ses motoru v2
- **Bölüm 4 — Dikey dilim**
  - [ ] 4.1 Stadyum #1 [SEN]
  - [ ] 4.2 Karakter #1 ve #2 [SEN]
  - [ ] 4.3 Arayüz görselleri [SEN]
  - [ ] 4.4 Ses paketi v1 [SEN]
  - [ ] 4.5 Dikey dilim entegrasyonu [CC]
  - [ ] 4.6 Cila turu [CC]
  - [ ] 4.7 Dikey dilim testi [SEN + CC] — kalite kapısı: dikey dilim
- **Bölüm 5 — Sunucu [CC]**
  - [ ] 5.1 Nakama yerel kurulum
  - [ ] 5.2 Hesaplar ve bulut kaydı (oyuncu adları dahil)
  - [ ] 5.3 Cüzdan ve envanter (tek oyunculu ödüller ve çevrimdışı kuyruk dahil)
  - [ ] 5.4 Uzaktan ayar, sürüm kontrolü, bakım modu
  - [ ] 5.5 Canlı sunucu (barındırma kararı dahil)
- **Bölüm 6 — Meta oyun [CC]**
  - [ ] 6.1 İlerleme altyapısı
  - [ ] 6.2 Günlük görevler, başarımlar, giriş ödülleri
  - [ ] 6.3 Dolap ve envanter ekranı
  - [ ] 6.4 Kozmetik mağazası
  - [ ] 6.5 Sezon Kartı
  - [ ] 6.6 Karakter koleksiyonu ve tek oyunculu mod
  - [ ] 6.7 Kendi stadyumun
  - [ ] 6.8 İlk kullanıcı deneyimi
  - [ ] 6.9 Ekonomi simülasyonu ve denge
- **Bölüm 7 — İçerik üretimi [SEN] (diğer bölümlerle paralel)** — kalite kapısı: içerik tamam
  - [ ] 7.1 Karakterler 3–12 (8 yeniden çizim + 2 yeni)
  - [ ] 7.2 Stadyumlar 2–4
  - [ ] 7.3 Kozmetik paketi v1
  - [ ] 7.4 Spiker ve kalabalık tam set
  - [ ] 7.5 Müzik seti
  - [ ] 7.6 İçerik partisi entegrasyonu [CC] (her partide tekrarlanır)
- **Bölüm 8 — Gizlilik temeli ve para kazanma [CC]**
  - [ ] 8.1 Veri haritası ve ilk açılış (eski 10.1)
  - [ ] 8.2 Rıza yönetimi (eski 10.2)
  - [ ] 8.3 RevenueCat ve ürün kataloğu
  - [ ] 8.4 Sunucu taraflı doğrulama
  - [ ] 8.5 Satın alma deneyimi ve yasal bilgilendirme
  - [ ] 8.6 Teklifler
  - [ ] 8.7 Ödüllü reklamlar
  - [ ] 8.8 Geçiş reklamı ve reklam rızası
- **Bölüm 9 — Online PvP [CC]**
  - [ ] 9.1 Ağ katmanı prototipi
  - [ ] 9.2 Rollback netcode
  - [ ] 9.3 Sunucuda maç yönetimi
  - [ ] 9.4 Eşleştirme
  - [ ] 9.5 Sıralamalı lig
  - [ ] 9.6 Sosyal ve dayanıklılık
- **Bölüm 10 — Gizlilik ve yasal uyum**
  - [ ] 10.1 Gizlilik Merkezi [CC]
  - [ ] 10.2 Yasal metin taslakları [CC]
  - [ ] 10.3 Avukat incelemesi [PRO] — kalite kapısı: yasal hazır (Ek A)
  - [ ] 10.4 Mağaza formları ve yayın [CC]
- **Bölüm 11 — Canlı operasyon [CC]**
  - [ ] 11.1 Etkinlik sistemi
  - [ ] 11.2 Bildirimler
  - [ ] 11.3 Gelişmiş huni ve A/B testi
  - [ ] 11.4 Yönetim paneli
  - [ ] 11.5 Destek ve SSS
  - [ ] 11.6 Yerelleştirme (Latin + Kiril, 10 dil)
- **Bölüm 12 — Yayın**
  - [ ] 12.1 Android sürüm hattı [CC]
  - [ ] 12.2 iOS [CC]
  - [ ] 12.3 Kalite güvence turu [CC + SEN] — kalite kapısı: teknik hazır
  - [ ] 12.4 Mağaza sayfası [CC + SEN]
  - [ ] 12.5 Kapalı test [SEN]
  - [ ] 12.6 Test lansmanı [SEN + CC] — kalite kapısı: pazar hazır
  - [ ] 12.7 Global lansman [SEN + CC]
- **Bölüm 13 — Lansman sonrası [CC]**
  - [ ] 13.1 Yerelleştirme: Çince, Japonca, Korece ve Arapça
  - [ ] 13.2 Sunucu taraflı yeniden simülasyon (opsiyonel)

Faz ayrıntıları: 0.3 ve 0.4 → [archive/PROGRESS_MOBILE_0.md](archive/PROGRESS_MOBILE_0.md); 1.1 →
[archive/PROGRESS_MOBILE_1.md](archive/PROGRESS_MOBILE_1.md); 2.0, 2.1, 2.2, 2.3 ve 2.4 →
[archive/PROGRESS_MOBILE_2.md](archive/PROGRESS_MOBILE_2.md). 0.1 ve 0.2 [SEN] fazları; yapıldıysa
kutuları sen işaretle. 1.3'ün stil testi görselleri ve karşılaştırması `design/style-tests/`
altında (seçilen çizim tarzı: Yön A'nın sıcak el çizimi, dev kafa oranlarıyla; testteki "Mahalle
Maçı" adı yalnızca çalışma adıydı); 1.4'ün sonucu [ART_BIBLE.md](ART_BIBLE.md). Oyunun dünyası
stadyumlar, kadrosu kurgusal futbolcu tipleri + 3 sürpriz karakter; çalışma adı "Kafa Kafaya: Futbol
Arenası" ([GAME_DESIGN_MOBILE.md](GAME_DESIGN_MOBILE.md) K18).

### Faz 2.0 — Phaser 3.90 ↔ 4.2.1 karşılaştırması

`npm run bench`, headless Chrome 157, masaüstü GPU, CPU yavaşlatma ile düşük güçlü cihaz benzetimi
(gerçek cihaz değil). Kare işi = Phaser güncelleme + çizim gönderimi, AI vs AI Zor–Zor, en yüksek
kalite. Ayrıntı, ikinci koşular ve yöntem: [archive/PROGRESS_MOBILE_2.md](archive/PROGRESS_MOBILE_2.md).

| Ölçüm                                           | Phaser 3.90           | Phaser 4.2.1          | Fark               |
| ----------------------------------------------- | --------------------- | --------------------- | ------------------ |
| Determinizm (tarayıcı, 2 maç × 119 durum özeti) | referans              | birebir aynı          | —                  |
| Paket gzip (Vite raporu; oyun + Phaser)         | 277,5 kB              | 305,4 kB              | +27,9 kB (+%10)    |
| Paket ham                                       | 950 kB                | 1.047 kB              | +97 kB             |
| Açılış → menü hazır (medyan, 1× / 4× CPU)       | 483 / 923 ms          | 455 / 906 ms          | −%6 / −%2          |
| Kare işi ort. 1× / 4× / 6× CPU                  | 0,53 / 2,28 / 3,56 ms | 0,65 / 2,93 / 4,50 ms | +%23 / +%29 / +%26 |
| Kare işi p99, 6× CPU                            | 6,7 ms                | 7,9 ms                | +1,2 ms            |
| Çizim çağrısı / kare                            | 13,5                  | 19,7                  | +6,2               |
| Bellek ayırma / kare                            | ~123 kB               | ~157–161 kB           | +%28               |

Görünüm: menü, seçim, maç, gol, tekrar, duraklatma ve telefon görünümünün piksel karşılaştırması
— zamana bağlı öğeler dışında birebir aynı. Bütçe 16,7 ms/kare; artışların kaynağı ve Faz 2.4'teki
çözümleri aşağıda (§ Faz 2.4).

### Faz 2.1 — Capacitor ve Android derleme (2026-11-26, tamamlandı)

Capacitor 8.6.2; `com.emengin.kafakafaya` / "Kafa Kafaya"; adımlar README → "Android'de çalıştırma".
Kod 2026-11-25'te bitti; oyun 2026-11-26'da gerçek bir Android telefonda açılıp oynandı. Yapılanlar,
kararlar ve bilinen sorunlar: [archive/PROGRESS_MOBILE_2.md](archive/PROGRESS_MOBILE_2.md).

**Bitti kriterleri**

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

### Faz 2.2 — Ekran ve ölçekleme (2026-11-26, tamamlandı)

Oyun alanı ve fizik değişmedi: 1280×720 çekirdek her cihazda tam görünür ve ortadadır (`DISPLAY`
aynı, determinizm testleri yeşil). Yalnızca çerçeve ve arayüz yerleşimi uyum sağlar. Yapılanlar,
kararlar ve test matrisi: [archive/PROGRESS_MOBILE_2.md](archive/PROGRESS_MOBILE_2.md).

**Karar — geniş ekranda boş kenarlar stadyum dekoruyla dolar (siyah şerit değil).** Phaser `FIT`
yerine `EXPAND`: ekran 16:9'dan genişse görünür alan yanlara (21:9'da 1680×720), tablette üste ve
alta (4:3'te 1280×960) uzar; taşan kısımda gökyüzü, tribün, kalabalık, panolar ve çim sürer.
Gerekçe: (1) ART_BIBLE §10.1 bunu zaten öngörüyor (2560×1440 tuval, 1920×1080 çekirdek; dışı
"yalnızca dekor"), Faz 4'teki çizimler bu düzene göre gelecek; (2) 19,5–20:9 telefonlarda siyah
şerit ekranın %10–20'sini boşa harcar, oyun küçük ve ucuz görünür; (3) dekor oynanış bilgisi
taşımaz, rekabet adaletini bozmaz (saha her ekranda zaten tamamen görünür); (4) kenara sabitlenen
arayüz geniş ekranda oyun alanından uzaklaşır, kontroller oyunu daha az örter. Sınırlar: 21,3:9'dan
geniş ve 4:3'ten dar ekranlarda kalan kısım siyah şerit. Çentikli 16:9 telefonda (çekirdeğin yanında
pay yok) tuval çentikten uzaklaşır, çentik tarafı siyah kalır; oyun alanı hiçbir cihazda çentiğin
altına düşmez.

**Bitti kriterleri**

| Kriter                                                      | Durum                                                                                              |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1. Sabit yatay ekran                                        | ✅ uygulama `userLandscape` (2.1); mobil tarayıcıda dikey → "telefonu çevir" + maç duraklar (test) |
| 2. Çentik ve güvenli alan                                   | ✅ telefonda: çentik tarafı, iki yatay yön, sistem çubukları sorunsuz                              |
| 3. 16:9–21:9 telefon, 4:3 ve 16:10 tablet; kenara sabitleme | ✅ `ScreenLayout`: menüler, maç HUD'u, tekrar kaplaması, dokunmatik butonlar                       |
| 4. Oran test matrisi ve ekran görüntüleri                   | ✅ `npm run screens` → `ekran-matrisi/` (7 oran × çentikli/çentiksiz × 4 ekran)                    |
| **Faz: hiçbir oranda kesilen veya taşan arayüz yok**        | ✅ benzetimde (birim testi + görüntüler) ve geliştiricinin telefonunda (2026-11-26)                |
| Determinizm ve tüm testler                                  | ✅ 382 birim testi (determinizm dahil), duman testi web + mobil                                    |
| Web yayını bozulmadı                                        | ✅ masaüstü 16:9'da yerleşim birebir eskisi gibi (birim testiyle sabit); duman testi yeşil         |
| QUALITY_BAR D5 (çentik/yuvarlak köşe)                       | ✅ telefonda; dokunmatikte her kenarda en az 12 CSS px köşe payı                                   |
| QUALITY_BAR D2 (butonlar arası ≥ 8 dp)                      | ✅ birim testiyle her oranda; telefon testinde ◀ ▶ (≈ 9 dp) yakın bulundu → ≈ 29 dp                |
| QUALITY_BAR §6 (16:9, 19,5:9, 21:9, 4:3 görüntüleri)        | ✅ `ekran-matrisi/`                                                                                |

### Faz 2.3 — Dokunmatik kontroller v2 (2026-11-26, tamamlandı)

Telefon testindeki "◀ ▶'ye bazen basamıyoruz, yakınına basınca da çalışsın" isteği çıkış noktası.
Butonlar görselinden büyük bir alanı dinliyor (en az 72 dp) ve parmak indiği grupta kalıyor:
hareket parmağı ekranın neresine kayarsa kaysın yön kopmuyor. Kontrol düzenleyicisi, titreşim,
basış halkası, giriş gecikmesi ölçer ve yerel 2 oyuncu prototipi eklendi. Ayrıntılar, tarayıcı
ölçümü ve telefonda ölçüm yöntemi: [archive/PROGRESS_MOBILE_2.md](archive/PROGRESS_MOBILE_2.md).

**Telefon testi (2026-11-26, geliştirici):** yakına basmak çalışıyor ama alan az bulundu → ◀ ▶ için
hareket bölgesi: ◀'nin solu ve altı ekran kenarına kadar sol, ▶'nin ötesi ve ikisinin üstü 130 px
daha (Zıpla'ya olan boşluğun yarısını geçmez). iPhone'da (web, Safari) butonlar çok küçük → varsayılan
düzen ekranın dp ölçeğine göre büyüyor (◀ ▶ en az 72 dp, en çok ×1,4). Geliştirici bu iki düzeltmeden
sonra fazın tamamlandı işaretlenmesini istedi; düzeltmeler telefonda ayrıca denenmedi.

**Karar — yerel 2 oyuncu (GAME_DESIGN_MOBILE §7.7):** dokunmatik 2 oyuncu telefonda da açık kalıyor
(`TOUCH.twoPlayer.minDiagonalInch: 0`). İki kişiyle telefonda denenmedi; 4.7 dikey dilim testinde
denenecek. Ölçüt: iki kişi telefonu masada tutup 90 sn'lik maçı yanlış butona basmadan oynayabiliyor
mu? Hayırsa yedek plan tek değer: `minDiagonalInch: 7` → dokunmatik 2 oyuncu yalnızca tablette
(≥ 7"), telefonda P2 gamepad ile. Benzetimdeki değerlendirmem: elde tutarak rahat değil, masada
oynanabilir.

**Bitti kriterleri**

| Kriter                                                    | Durum                                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1. Sol hareket, sağ zıpla/şut/süper                       | ✅ telefonda; solak modunda tersi                                                          |
| 2. Düzenleyici: boyut, konum, opaklık, solak modu         | ✅ Ayarlar → Kontroller → Dokunmatik düzen; benzetimde sürükle → büyüt → solak → kaydet    |
| 3. Çoklu dokunuş, titreşim + görsel geri bildirim         | ✅ birim + gerçek dokunma olaylı e2e testi                                                 |
| 4. Giriş gecikmesi ölçümü ve raporu                       | ✅ maç içi ölçer + telefonda ölçüm yöntemi; tarayıcıda oyun bekletmesi ~10 ms              |
| Yerel 2 oyuncu prototipi ve karar                         | ✅ karar yukarıda (telefonda açık; 4.7'de iki kişiyle denenecek)                           |
| **Faz: kontroller rahat; iki parmakla hareket + şut**     | ✅ telefonda (geliştirici); geri bildirimdeki alan ve iPhone boyutu düzeltildi             |
| Faz 2.2 kenar sabitleme ve güvenli alan                   | ✅ tüm düzenler her oran × çentik için birim testinde; ekran matrisi (`npm run screens`)   |
| Determinizm ve tüm testler                                | ✅ 431 birim testi (determinizm dahil), duman testi web + mobil (dokunmatik dahil), matris |
| QUALITY_BAR D1 / D3 (48 / 72 dp)                          | ✅ dokunma alanı ve varsayılan ◀ ▶ görseli ekranın dp ölçeğiyle; birim testi 0,8–3 px/dp   |
| QUALITY_BAR D2 (butonlar arası ≥ 8 dp)                    | ✅ varsayılan, büyütülmüş, solak, 2 oyuncu ve düzenleyicide (çakışan konum reddedilir)     |
| QUALITY_BAR D6 (≤ 1 adım; dokunuştan ekrana ≤ 80 ms)      | kısmen: tarayıcıda oyun payı ✅ (medyan ~10 ms); telefonda 2.4'te ölçüldü (5,6 ms)         |
| QUALITY_BAR D7 (iki parmak hareket + şut + zıplama)       | ✅ Zıpla ile Şut arasına basmak ikisini birden basar                                       |
| QUALITY_BAR A4 (basılı durum aynı kare, titreşim ≤ 50 ms) | ✅ basılı görünüm olay anında; titreşim süresi ölçülmedi                                   |
| Web yayını bozulmadı                                      | ✅ web paketinde Capacitor yok; masaüstü yerleşim aynı; duman testi yeşil                  |

### Faz 2.4 — Performans (2026-11-27, tamamlandı)

Referans cihaz: **realme 12 kite (RMX3890)**, Snapdragon 685, Android 15, WebView 158 (QUALITY_BAR §0).
Ölçümler telefon USB'deyken uygulamanın WebView'ında (`npm run bench -- --device`); dokunuşlar
`adb` ile gerçek dokunma olayı. Profil, tüm önce/sonra tabloları, 15 dk dakika dakika kayıt ve
telefonda ölçüm rehberi: [archive/PROGRESS_MOBILE_2.md § Faz 2.4](archive/PROGRESS_MOBILE_2.md).

**Asıl bulgu:** oyun bu telefonda **30 FPS'e kilitliydi** (ana iş parçacığı yalnızca ~7 ms
çalışırken). Karışım kipi her değiştiğinde Phaser 4 toplu çizim tamponunu yeniden yüklüyor;
varsayılan tampon 16.384 dörtgen (~1,8 MB) ve mobil sürücü her seferinde tamamını kopyalıyor.
Tampon 1.024 dörtgene inince **60 FPS**.

| Cihaz, Yüksek kalite, AI vs AI (3 × 15 sn) | FPS      | > 20 ms aralık | > 50 ms | Aralık p99 | Çizim/kare |
| ------------------------------------------ | -------- | -------------- | ------- | ---------- | ---------- |
| HEAD (`90babcc`)                           | 30,4     | 1364 / 1370    | 6       | 45,7 ms    | 83,5       |
| + toplu çizim tamponu 1024 + `solidRect`   | **59,9** | 8 / 2695       | 0       | 18,7 ms    | 81,3       |
| + ADD sırası + Canvas 2D ikonlar           | 59,9     | 6 / 2695       | 0       | 17,8 ms    | 79,3       |
| + kalabalık atlası                         | 59,8     | 13–40 / 2690   | 0–1     | 18,5–19 ms | 72,5       |

Masaüstünde çizim/kare 21,5 → 14,4 (Phaser 3 düzeyi). Cihazda en uzun küçük GC 9,6 → 3,1 ms.
**15 dk stres testi** (hedef boyutlu sahne + her karede 8 adımlık rollback): 59,7 FPS, işin %99,91'i
bütçede, aralık p99 19,6 ms, ısınmayla düşüş yok (son dakika +0,8 FPS), kalite hep Yüksek, termal
durum hep 0. **Rollback** ort. 0,51 ms, p99 1,1 ms, p99,9 2,1 ms (≤ 4 ms ✅), 3.457 denetimde 0 durum
farkı. Determinizm: HEAD ile 2 × 119 durum özeti birebir aynı.

**Faz 2.0'daki Phaser 4 maliyet notları:** (1) Rectangle → `solidRect` ✅; (2) ADD nesneleri
gruplandı (stadyumda 8 → 4 geçiş) ✅; (3) kutulanan sayılar: Phaser içinde, ölçüldü (P7), kalabalık
atlası ve `hypot` düzeltmesi yapıldı; (4) tek seferlik takılma: yalnızca yüklemede ve maç
açılışında, ısıtma gerekmedi; (5) ikonlar Canvas 2D ✅, Canvas çizicisi 3 kB gzip'lik yedek olarak
kaldı (karar); (6) tezgâh cihaza genişletildi ✅.

**Kararlar:** `DISPLAY.batchQuads = 1024`; mobilde toplu çizim başına tek doku (Phaser varsayılanı;
16 doku FPS kazandırmadı); Canvas çizicisi yedek; maç içinde `Rectangle` yerine `solidRect`; P1'in
"%99 ≤ 16,7 ms"i kare işi, "p99 ≤ 20 ms"i kare aralığı için; ekran maç boyunca açık
(`ScreenAwake`); kare süresi grafiği ve testler yalnızca geliştirici derlemesinde
(`npm run cap:sync:dev`), yayın derlemesinde hiç yok (duman testi denetliyor).

**Bitti kriterleri**

| Kriter                                                         | Durum                                                                                                                        |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1. Düşük-orta seviye Android'de profil                         | ✅ realme 12 kite: 30 FPS'in kök nedeni bulundu (katman, karışım kipi, GL çağrı kaydı, tampon taraması)                      |
| 2. Nesne havuzları, texture atlas, kare başına ayırma, WebView | ✅ havuzlar vardı (doğrulandı); kalabalık atlası; ayırma ölçüldü ve azaltıldı (Phaser içi kalan ~%85, not); WebView ayarları |
| 3. Isınma ve pil (15 dk'da FPS düşüşü yok)                     | ◐ ısınma ✅ (15 dk, düşüş yok); pil ölçülmedi (test USB'de şarjdayken) → 4.6                                                 |
| 4. Kare süresi grafiği (geliştirici katmanı)                   | ✅ yalnızca geliştirici derlemesinde; yayın derlemesinde yok (duman testi)                                                   |
| 5. Rollback ölçümü (kayıt + 8 adım)                            | ✅ ort. 0,51 ms, p99 1,1 ms, p99,9 2,1 ms; canlı durumla 0 fark                                                              |
| 6. Hedef boyutta sentetik stres sahnesi                        | ✅ ART_BIBLE §10.2 / §6.1 / §12.3 boyutlarında (`?devtest=stress`); 4.6 ve 12.3'te tekrar                                    |
| 7. Sonuçlar QUALITY_BAR'da                                     | ✅ P1–P9, A1, A2, D6                                                                                                         |
| **Faz: 15 dk sabit 60 FPS; kayıt + 8 adım ≤ 4 ms**             | ✅ telefonda (stres sahnesinde bile 59,7 FPS); seyrek GC takılması P2'de açık                                                |
| Determinizm testleri; optimizasyonlar simülasyonu değiştirmez  | ✅ 440 birim testi; tarayıcıda HEAD ↔ Faz 2.4 durum özetleri birebir aynı                                                    |
| 2.3'ten kalan: telefonda gecikme ölçümü                        | ◐ uygulama içi ölçer ✅ (oyun payı 5,6 ms); kamera ölçümü yapılmadı → 4.6                                                    |
| 2.3'ten kalan: hareket bölgesi telefonda                       | ✅ gerçek dokunuşla: sol kenar, ◀ altı (kenardan 6 px'e kadar), ▶ sağı                                                       |
| Web yayını bozulmadı                                           | ✅ duman testi web + mobil; web paketinde Capacitor ve geliştirici araçları yok                                              |

**QUALITY_BAR satırları**

| Satır                   | Sonuç                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| P1 kare hızı            | ✅ 59,7 FPS, %99,91 bütçede, aralık p99 19,6 ms (15 dk stres)                                 |
| P2 takılma              | ❌ oyun akarken ~1–2 dk'da bir 50–75 ms; nedeni V8 büyük GC (~25 ms) → 3.x notu               |
| P3 ısınma               | ✅ son dakika ilk dakikadan hızlı                                                             |
| P4 kalite kademesi      | ✅ hep Yüksek                                                                                 |
| P5 pil                  | ölçülmedi (USB'de şarjda) → 4.6                                                               |
| P6 bellek               | ◐ normal maç 366–371 MB ✅; hedef boyutlu stres 428–452 MB ❌; büyüme yok ✅ → 3.1 / 4.5 notu |
| P7 ayırma / GC          | ◐ bizim kod havuzlu, küçük GC ≤ 3,1 ms; Phaser içi kutulama ve büyük GC (P2)                  |
| P8 yüksek yenileme hızı | ✅                                                                                            |
| P9 rollback             | ✅ p99,9 2,1 ms                                                                               |
| A1 / A2 açılış          | ◐ uygulamanın ilk karesi 1,1–1,3 sn (sistem açılış ekranı anında) / ✅ menü 2,65 sn           |
| D6 giriş gecikmesi      | ◐ oyun payı 5,6 ms ✅; dokunuştan ekrana (kamera) ölçülmedi → 4.6                             |

**Kapanış (2026-11-27):** geliştirici fazın mevcut verilerle tamamlandı işaretlenmesini istedi. Bitti
kriterleri (15 dk sabit 60 FPS, kayıt + 8 adım ≤ 4 ms) telefonda sağlandı. Pil (P5) ve kamerayla
uçtan uca gecikme (D6'nın 80 ms kısmı) ölçülmedi; 4.6'daki cihaz turunda final görsellerle ölçülecek
(notlarda). Telefonda geliştirici derlemesi kurulu; yayın derlemesine dönüş: `npm run cap:sync` →
▶ Run.

### Faz 2.5 — Uygulama yaşam döngüsü (2026-11-27, kod tamam — telefonda kesinti testi bekliyor)

Platform olayları tek yerde (`src/platform/lifecycle.ts`): arka plan, ses odağı (çağrı, başka
oynatıcı, bildirim), kulaklık çıkarma, düşük bellek ve Android geri tuşu. Yerel taraf:
`InterruptionsPlugin.java` (ses odağı, kulaklık, `onTrimMemory`), `LaunchSplashPlugin.java` +
`MainActivity` (açılış ekranı, çizici süreç kaybı), `@capacitor/app` (arka plan/ön plan, geri tuşu).

**Ne yapıldı**

- **Arka plan:** uygulama arka plana geçince ses askıya alınır, maç duraklar ve simülasyonun tam
  durumu kaydedilir (`src/save/matchResume.ts`). Süreç yaşıyorsa dönüşte maç bellekte, duraklatılmış.
  Android süreci bellek için kapatırsa ya da WebView'ın çizici süreci ölürse, oyun açılınca maç
  kaldığı yerden "Yarım kalan maç" notuyla duraklatılmış açılır (kayıt 1 saatten eskiyse ana menü).
  Kayıt Infinity/NaN/-0'ı korur; geri yüklenen maç kesintisiz maçla aynı girdilerle bit düzeyinde
  aynı sürer (test).
- **Ses kesintileri:** uygulama öndeyken ses odağını ister. Telefon çalınca/başka oynatıcı sesi alınca
  ses susar, maç "Ses kesildi (arama ya da başka uygulama)" notuyla duraklar; odak dönünce ses gelir,
  maç oyuncu "Devam" diyene kadar duraklı kalır. Bildirim sesinde ses kısılır (Android 8+ bunu
  çoğunlukla kendisi yapar), maç durmaz. Kulaklık (kablolu ya da Bluetooth) çıkınca maç "Kulaklık
  çıkarıldı" notuyla duraklar.
- **Düşük bellek:** her `onTrimMemory`'de maç kaydedilir; kritik düzeyde (öndeyken bellek çok az)
  maç "Cihaz belleği azaldı: maç kaydedildi" notuyla duraklar. Çizici süreç ölürse uygulama çökmek
  yerine etkinliği temiz bir açılışla yeniden başlatır (kayıtlı maç geri gelir).
- **Geri tuşu:** her ekranda Esc ile aynı yol (tablo aşağıda). Ana menüde çıkış onayı.
- **Açılış ekranı (2.1'den):** sistem açılış ekranı ana menünün (ya da geri yüklenen maçın) ilk
  karesine kadar kalır; uygulamanın boş zemini ve yükleme çubuğu artık görünmüyor.
- **Ekran açık bayrağı (2.4'ten):** duraklatmada kapanır (sistem zaman aşımı geçerli), devamda açılır;
  maç sonu ekranında 30 sn sonra kapanır.

**Android geri tuşu — ekran ekran** (klavye Esc/Backspace ve gamepad B de aynısını yapar)

| Ekran                                   | Geri tuşu                                                                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Açılış / yükleme                        | Yok sayılır (açılış ekranı görünür, birkaç saniye)                                                                          |
| Ana menü                                | **"Oyundan çıkılsın mı?" onayı** — "Hayır, oyunda kal" seçili gelir; "Evet, çık" uygulamayı kapatır. Tarayıcıda yok sayılır |
| Ana menü → çıkış onayı açıkken          | Onay kapanır (oyunda kalınır)                                                                                               |
| Ayarlar                                 | Ana menü ("Ayarlar" seçili)                                                                                                 |
| Ayarlar → Kontroller                    | Ayarlar ("Kontroller" seçili)                                                                                               |
| Nasıl Oynanır / Kontrol Şeması          | Açıldığı menü                                                                                                               |
| Kontrol düzenleyicisi, değişiklik yok   | Kontroller (İptal ile aynı)                                                                                                 |
| Kontrol düzenleyicisi, değişiklik var   | Onay: "Düzenlemeye dön" (seçili) / "Kaydet ve çık" / "Kaydetmeden çık"; onay açıkken geri → düzenlemeye dönülür             |
| Karakter seçimi                         | Hazır olanı geri alır (önce P2, sonra P1); kimse hazır değilse ana menü                                                     |
| Turnuva ağacı                           | Ana menü (turnuva kayıtlı kalır, "Turnuvaya devam" ile dönülür)                                                             |
| Kupa ekranı                             | Ana menü                                                                                                                    |
| Maç (oyun, gol tekrarı, santra)         | Duraklatır                                                                                                                  |
| Duraklatma menüsü                       | Devam                                                                                                                       |
| Duraklatma → Ses Ayarları               | Duraklatma menüsü                                                                                                           |
| Maç sonu ekranı                         | Turnuvada ağaç ("Devam" ile aynı), diğer modlarda ana menü                                                                  |
| Dikey ekran uyarısı (yalnızca tarayıcı) | Maç zaten duraklı; dikeyken devam edilmez                                                                                   |

**Kararlar**

- **Geri tuşu = Esc.** Android geri tuşu `SystemBack` sanal tuşu olarak menülerdeki "geri" ve maçtaki
  "duraklat" listelerine eklendi; ekranlar ayrı ayrı bağlanmadı. Yeni ekran Esc'i işliyorsa geri tuşu
  da çalışır.
- **Ses odağı oyunda.** Oyun açılınca arka planda çalan müzik (Spotify vb.) durur; çağrı/başka
  oynatıcı gelince oyun susar. Alternatif (kullanıcının müziğiyle karışık çalmak) seçilirse çağrı
  algılanamaz. İleride "arka plan müziğine izin ver" ayarı düşünülebilir (not aşağıda).
- **Açılış ekranı "çıkış animasyonu bekletilerek" tutuluyor.** İlk deneme (`@capacitor/splash-screen`,
  Android 12 API'si içerik çizimini durduruyor) WebView'ı yavaşlattı: ana menü 2,66–3,07 sn → 3,06–3,76
  sn (A2 ≤ 3 sn bozuluyordu). Eklenti kaldırıldı; `MainActivity` açılış görüntüsünü en üstte tutarken
  oyun altta tam hızda yükleniyor. Güvenlik sınırı 8 sn.
- **Yarım maç kaydı yalnızca arka plana geçişte ve bellek uyarısında** (her karede değil): öndeyken
  çizici süreç kendiliğinden çökerse (bellek uyarısı gelmeden) maç kaybolur, uygulama ana menüden
  açılır. Biten maç, dev oturumları ve çıkılan maç kaydedilmez; kayıt okununca silinir.

**Ölçümler ve adb ön testleri (realme 12 kite, 2026-11-27)**

| Test                                                            | Sonuç                                                                                                                        |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Soğuk açılış → ana menünün ilk karesi (6 kez)                   | 2,55–3,09 sn, medyan 2,70 (açılış ekranı tutulmadan 2,66–3,07): fark yok                                                     |
| Açılış ekranı menüye kadar kalıyor mu                           | ✅ 1,5 sn'de ekran görüntüsü: açılış ekranı (uygulamanın ilk karesi 1,1 sn'de, altta)                                        |
| Geri tuşu (`adb input keyevent BACK`)                           | ✅ ana menü onayı ve kapanması, seçim, maç, duraklatma, ses ayarları, düzenleyicinin 3 hali, Kontroller → Ayarlar → Ana menü |
| Ev tuşu → süreci öldür (`am kill`) → aç                         | ✅ maç aynı skor/sürede, "Yarım kalan maç" notuyla duraklı (gol tekrarı sırasında da)                                        |
| Kritik bellek (`am send-trim-memory … RUNNING_CRITICAL`)        | ✅ maç duraklar, not görünür, kayıt alınır                                                                                   |
| Çizici süreç çöküşü (DevTools `Page.crash`)                     | ✅ uygulama düşmedi (aynı süreç), etkinlik yeniden açıldı, maç geri geldi                                                    |
| Telefon çağrısı, bildirim, kulaklık, kilit, uygulama değiştirme | ⏳ adb ile denenemez → geliştiricinin telefon testi (liste aşağıda)                                                          |

adb denemelerinde bulunup düzeltilen iki hata: geri yüklenen maçta oyuncular çizilmiyordu (duraklatılmış
sahne hiç kare çizmemişti); `recreate()` ile yeniden kurulan etkinlikte WebView çentik genişliği kadar
kayıyordu (gri şerit) → temiz yeniden başlatma.

**Telefonda denenecek kesinti senaryoları** (geliştirici; sonuçlar buraya işlenecek)

| #   | Senaryo                                                                                   | Beklenen                                                                                     | Sonuç |
| --- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----- |
| 1   | Maç sırasında biri arasın, **reddet**                                                     | Zil çalarken oyun sesi susar, maç "Ses kesildi…" notuyla duraklar; reddedince ses geri gelir | ⏳    |
| 2   | Maç sırasında biri arasın, **aç, konuş, kapat**, oyuna dön                                | Maç duraklı, skor/süre aynı, ses var; Devam ile sürer                                        | ⏳    |
| 3   | Ana menüdeyken arama gelsin                                                               | Müzik susar, arama bitince geri gelir                                                        | ⏳    |
| 4   | Maç sırasında bildirim sesi (WhatsApp mesajı vb.)                                         | Maç durmaz; oyun sesi bir an kısılabilir; çökme yok                                          | ⏳    |
| 5   | Maç sırasında **ev tuşu**, birkaç saniye sonra simgeden dön                               | Maç duraklı, durum aynı, ses var; dönüş ≤ 1 sn (A3)                                          | ⏳    |
| 6   | Maç sırasında **son uygulamalar** → başka uygulama → geri                                 | 5 ile aynı                                                                                   | ⏳    |
| 7   | Son uygulamalar ekranını açıp hiçbir şey seçmeden geri dön                                | Maç duraklı                                                                                  | ⏳    |
| 8   | Maç sırasında bildirim panelini indir, kapat                                              | Maç sürer (duraklamaz) — duraklamasını isterseniz söyleyin                                   | ⏳    |
| 9   | Kulaklık takılıyken maç → **kulaklığı çıkar** (kablolu ya da Bluetooth)                   | Maç "Kulaklık çıkarıldı" notuyla duraklar; ses hoparlörden gelir                             | ⏳    |
| 10  | Maç sırasında **kulaklığı tak**                                                           | Ses kulaklığa geçer; maç durmaz                                                              | ⏳    |
| 11  | Maç sırasında **güç tuşuyla ekranı kilitle**, aç                                          | Kilitliyken ses yok; açınca maç duraklı                                                      | ⏳    |
| 12  | Duraklatma menüsünde dokunmadan bekle (ekran zaman aşımı kısa olsun, ör. 30 sn)           | Ekran kararır. Maç oynanırken kararmaz                                                       | ⏳    |
| 13  | Geri tuşu tablosundaki ekranları tek tek dene (özellikle turnuva, kupa, maç sonu, yardım) | Tablodaki gibi                                                                               | ⏳    |
| 14  | Ana menüde geri → "Evet, çık"; sonra simgeden aç                                          | Uygulama kapanır; açılışta açılış ekranı → ana menü                                          | ⏳    |
| 15  | Maç sırasında ev tuşu, sonra ağır uygulamalar aç (kamera, oyun) birkaç dakika, oyuna dön  | Maç ya bellekte duraklı ya da "Yarım kalan maç" notuyla geri gelir; ana menüye düşmez        | ⏳    |
| 16  | Turnuva maçında 5 ve 15                                                                   | Maç turnuva maçı olarak sürer, bitince sonuç turnuvaya yazılır                               | ⏳    |
| 17  | Spotify/YouTube Music çalarken oyunu aç                                                   | Müzik durur (karar yukarıda); oyunu kapatınca kendiliğinden geri gelmez                      | ⏳    |
| 18  | Simgeye dokunup açılışı izle                                                              | Logo ekranı menü gelene kadar kalır; arada boş/siyah ekran ya da yükleme çubuğu yok          | ⏳    |

**Bitti kriterleri**

| Kriter                                                          | Durum                                                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1. Arka planda otomatik duraklatma ve durumun korunması         | ✅ adb: ev tuşu + süreç öldürme, çizici süreç çöküşü; telefon testi 5–7, 15–16 bekliyor                 |
| 2. Çağrı, bildirim, kulaklık gibi ses kesintileri               | kod ✅; ⏳ telefon testi 1–4, 9–11 (adb ile denenemez)                                                  |
| 3. Her ekranda tutarlı geri tuşu                                | ✅ tablo; adb'de ana ekranlar denendi; telefon testi 13–14                                              |
| 4. Düşük bellek uyarısında güvenli davranış                     | ✅ adb: kritik uyarı, çizici süreç çöküşü                                                               |
| 2.1'den: açılış ekranı oyun hazır olana kadar                   | ✅ telefonda ölçüldü (A2 değişmedi)                                                                     |
| 2.4'ten: ekran açık bayrağı duraklatmada kapanır                | ✅ kod; telefon testi 12                                                                                |
| **Faz: kesinti senaryolarının hepsi test edildi ve listelendi** | ⏳ liste hazır; telefon testi bekliyor                                                                  |
| Determinizm ve tüm testler                                      | ✅ 448 birim testi (determinizm + yarım maç kaydı gidiş-dönüşü), duman testi web + mobil, ekran matrisi |
| Web yayını bozulmadı                                            | ✅ web paketinde Capacitor yok (boş modüller); duman testi yeşil                                        |

**QUALITY_BAR satırları**

| Satır                       | Sonuç                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------ |
| A1 soğuk açılış ilk görüntü | ✅ sistem açılış ekranı anında; artık menüye kadar o kalıyor                         |
| A2 soğuk açılış etkileşim   | ✅ 2,55–3,09 sn, medyan 2,70 (2.4: medyan 2,65)                                      |
| A3 sıcak açılış             | durum korunuyor ✅ (adb); süre telefon testi 5'te                                    |
| K5 kesintiler               | ◐ arka plan, düşük bellek, süreç/çizici kaybı ✅ (adb); çağrı, bildirim, kulaklık ⏳ |

## Sonraki fazlar için notlar

Faz 0.3'teki açık sorular Faz 0.4'te, 1.1'e bırakılanlar Faz 1.1'de (K13–K17) karara bağlandı;
değeri belirlenmemiş konular
[GAME_DESIGN_MOBILE.md § Hâlâ açık olanlar](GAME_DESIGN_MOBILE.md#hâlâ-açık-olanlar)'da. Kararlardan
sonra hâlâ görülen riskler:

- **2.9 / 7.6 — Eşleşme eşiği artık bitti kriterinde:** her eşleşme %35–65 (K14). Web v1.0.0'da üç
  eşleşme dışarıda: Bora–Toprak %71, Ayaz–Pamuk %69, Toprak–Şimşek %69. Ölçüm eşleşme başına ≥ 200
  maç: 10 karakterle 9.000, 12 karakterle 13.200 maç/tarama.
- **3.3 — Kozmetik yuvaları:** yol haritasındaki yuva listesi §4.1'in 13 kategorisiyle hizalanmalı:
  karakter skini, giriş animasyonu, stadyum parçası ve ifade paketi eksik; "saç" ayrı yuva değil,
  skinin parçası. Top skini ev sahibinin, top izi topa son dokunanın.
- **5.3 — Değerler hazır:** tek oyunculu tavan 300 Altın + 600 XP ve makullük eşikleri §2.4'te
  (K16); online kuyrukta yapay zekâya düşen maç tek oyunculu sayılır (K13).
- **5.4 — Uzaktan ayar anahtarları:** ilk liste GAME_DESIGN_MOBILE §2.7 ve §6.2'de.
- **6.x — Elmas veren ilerleme yalnızca online:** görev, başarım ve ustalık tanımları sunucuda mod
  bayrağı taşımalı (K13); esas alınan, istemcinin bildirdiği mod değil sunucunun maç kaydı.
- **6.9 — Ekonomi modeli:** §2.5 tablosu tek dosyalık geçici bir hesap betiğiyle üretildi (varsayımlar
  §2.5'te ve arşivde). 6.9'daki simülasyon harcayan oyuncu tiplerini, etkinlikleri, sezon sonu
  ödüllerini ve Elmas harcamasını da kapsamalı.
- **7.3 — Kozmetik paketi v1:** sayılar §4.5'teki lansman hedefinin altında ve 7 kategoriyi
  içermiyor (karakter skini, ayakkabı, çerçeve, plaka, giriş animasyonu, stadyum, ifade); 7.3 ya da
  yeni bir içerik fazı §4.5'e göre planlanmalı.
- **7.6 — Yeni süperler (Yankı, Sekme):** `SUPER_SHOTS` girdileri, `superEffects.ts`, yapay zekâ
  kullanım ve kaçınma kuralları, süper önizlemesi ve 2.7'nin çapraz motor tekrarları. Sekmenin
  "her sekmede hız ×1,15"i yansıma koduna dokunur; tahminci aynı kodu kullanmalı.
- **8.x / 10.3 — Fiyat gösterimi ve yaş:** Elmas fiyatlarının yanında TL karşılığı (§5.3) ve 18 yaş
  altı limitleri (§5.4) avukat incelemesinin kapsamına alınmalı.
- **Faz yok — "maçın anı" paylaşımı:** sonuç ekranındaki tekrarın paylaşılması (§1.4) için faz yok;
  12.4'ün kayıt altyapısıyla Bölüm 6 ya da 11'e eklenmeli.
- **12.6 — Günlük sıfırlama saati:** 00:00 TSİ uzak bölgelerde günün ortasına denk gelir; bölgesel
  sıfırlama kararı test lansmanından önce.
- **2.7 — Rollback ölçümünü tekrarla (2.4'ten):** Faz 2.4'te telefonda kayıt + 8 adım p99 1,1–1,2 ms,
  p99,9 2,1 ms (bütçe 4 ms) — 2.7'nin kendi `sin/cos/atan2/exp/pow` fonksiyonlarından önce. 2.7
  sonunda geliştirici derlemesinde `?devtest=rollback` (ya da Stres testi) ile tekrarlanmalı.
- **2.7 / 3.6 — Sunum katmanında hit-stop:** simülasyon akarken görüntüyü 40–60 ms dondurmak,
  ardından 2–4 karelik sıçrama ya da geçici görsel gecikme demek; rollback düzeltmeleriyle üst üste
  binince his bozulabilir. 2.7'de prototiplenmeli. Ağır çekimin doğal yeri gol sonrası deterministik
  duraklama (tekrar oynatma).
- **2.8 — Firebase avukat incelemesinden (10.3) önce:** Firebase verisi yurt dışına gider; KVKK'da
  düzenli yurt dışı aktarım için açık rıza tek başına yeterli olmayabilir (standart sözleşme + 5 iş
  günü içinde Kurul'a bildirim). 4.7 ve 12.5'teki testçilerin verisi de bu kapsamda; 0.2'deki
  avukat tanışmasında sorulmalı.
- **5.3 — Çevrimdışı kuyruk ve cihaz saati:** günlük tavan cihaz saatine göre sayılırsa saat
  değiştirilerek katlanır; sunucuya ulaşma gününe göre sayılırsa uzun çevrimdışı oyun ödül kaybeder.
- **5.4 / 9.3 — Uzaktan ayar ve determinizm:** Nakama simülasyonu etkileyen değerleri (fizik,
  süperler) değiştirebiliyorsa, farklı değer setiyle maça giren iki istemci desync olur. Simülasyon
  değerleri sürümlü bir set olmalı; set sürümü maç kurulumunda eşleşmeli.
- **5.5 — "Türkiye bölgesi" ve yönetilen hizmet:** yönetilen hizmetin Türkiye'de bölgesi yoksa en
  yakın bölge yurt dışıdır ve aktarım yükümlülüğü doğar; iki karar birbirini etkiler.
- **9.3 — Geçersiz maç açığı:** uyuşmazlıkta maç geçersiz sayılınca kaybeden taraf bilerek bozuk
  checksum gönderip kaybı silebilir. Oyuncu başına uyuşmazlık oranı izlenmeli; eşiği aşan hesaba
  kaçma cezası (9.6) uygulanmalı. Online maçlar artık Elmas da verdiği için (K13) önemi arttı; aynı
  cihaz ya da ağdan iki hesabın eşleşmesi de izlenmeli.
- **9.4 / 11.6 / 12.6 — Tek bölge ve uzak diller:** PT-BR, ES ve ID; Brezilya, Latin Amerika ve
  Endonezya'yı hedefler. Bu bölgelerdeki iki oyuncu Türkiye üzerinden oynarken gidiş-dönüş gecikmesi
  kabaca 400 ms'yi aşar; 9.2'nin 150 ms hedefi tutmaz, gecikme eşikli eşleştirme bu oyuncuları
  online'dan dışlar. Test lansmanı ülkeleri ve ikinci bölge kararı 12.6'dan önce.
- **10.3 / 11.x — İnceleme sonrası veri:** bildirim jetonu (11.2) ve A/B deney verisi (11.3) avukat
  incelemesinden sonra ekleniyor; incelemenin kapsamına önceden alınmalı.
- **11.6 — Ad filtresi TR/EN, lansman 10 dil:** diğer 8 dilde küfürlü adlar filtreden geçer; tek
  savunma raporlama ve moderasyon kuyruğu (11.4).
- **13.2 — Nakama'nın JS çalışma zamanı Node değil (goja):** sunucuda yeniden simülasyon Nakama
  içinde koşacaksa goja da çapraz motor testine eklenmeli ya da simülasyon ayrı bir Node servisinde
  çalışmalı.
- **3.2 / 3.3 — ART_BIBLE bağımlılığı:** bağımlılık notu yalnızca 3.4 için, ama parçalı iskelet
  (3.2) ve kozmetik slotları (3.3) ART_BIBLE'ın katman yapısına (1.4) dayanıyor; 1.4'ten önce
  başlanırsa yeniden iş çıkabilir.
- **2.9 / 3.6 — Hit-stop ve giriş gecikmesi (2.3'ten):** vuruş anındaki hit-stop simülasyonu
  40–60 ms bekletiyor; o arada basılan tuş da bekliyor (tarayıcıda p95 ~100 ms). Hit-stop yalnızca
  sunuma taşınınca (2.7 notu) bu gecikme kalkar; his ayarında ölçer açık denenmeli.
- **3.4 — Dokunmatik buton ve düzenleyici görselleri (2.3'ten):** butonlar, halka ve düzenleyici
  araç çubuğu kodla çizilmiş yer tutucu (`src/ui/touchButtonArt.ts`, `PillButton`); tasarım
  sistemi gelince değişir; ◀ ▶ ikonları ve ZIPLA/ŞUT/SÜPER yazıları ikon setine geçmeli.
- **9.2 — Dokunmatik gecikme ve rollback (2.3'ten):** rollback'in sabit giriş gecikmesi
  dokunmatiğin ~20–30 ms'sinin üstüne eklenir; online maçta gecikme ölçer ağ gecikmesini de
  göstermeli.
- **3.x / 4.1 — Arka plan genişliği (2.2'den):** stadyum dokuları artık çekirdeğin iki yanında 214,
  üstünde ve altında 120 px dekor + 48 px sarsıntı payı çiziyor (`STAGE_PAD_X/Y`). Final stadyum
  çizimi ART_BIBLE §10.1'in 2560×1440 (@1,5x) tuvaline göre gelmeli; ışık kuleleri şimdilik
  çekirdeğin içinde, 21:9'da dış kenarlarda kule yok.
- **2.8 — Çizici süreç kaybı ve kesintiler (2.5'ten):** `MainActivity.RendererGoneHandler` çizici
  süreç ölünce etkinliği yeniden başlatıyor (çökme yok); bu olay ve `detail.didCrash()` (çöktü mü,
  sistem mi kapattı) Crashlytics'e özel olay olarak gitmeli (QUALITY_BAR K4). Yarım maç geri yükleme
  sayısı da izlenebilir.
- **6.x / 11.x — Arka plan müziği (2.5'ten):** oyun ses odağını alıyor, açılınca kullanıcının müziği
  (Spotify vb.) duruyor. İstek gelirse "arka plan müziğine izin ver" ayarı: odak istenmez, oyun
  müziği kapatılır, efektler karışık çalar (çağrı algısı o zaman yalnızca arka plana geçişle).
- **9.x — Online maçta yaşam döngüsü (2.5'ten):** çevrimdışı maçta arka plan = duraklat + kaydet.
  Online maçta duraklatma yok: arka plana geçiş bağlantı kopması gibi ele alınmalı (yeniden bağlanma
  süresi, 9.6'daki kaçma cezası); yarım maç kaydı online maçta kullanılmamalı.
- **12.3 — Eski Android'de açılış ekranı ve ses odağı (2.5'ten):** açılış ekranı ve ses odağı yalnızca
  Android 15'te (referans cihaz) denendi. Android 7–11'de core-splashscreen kendi görünümünü çiziyor,
  ses odağı eski API ile isteniyor; cihaz matrisinde açılış (boş ekran yok) ve çağrı senaryosu denenmeli.
- **2.6 — CI'da APK (2.1'den):** Capacitor CLI Node ≥ 22 istiyor (CI 24). Gradle 9.1 JDK 17–25 ile
  çalışır (`actions/setup-java`). `npx cap sync` öncesi `build:mobile` şart (`cap:sync` betiği yapıyor).
- **12.1 — Sürüm hattı (2.1'den):** `versionCode`/`versionName` `package.json`'dan okunmalı (şu an
  sabit 1 / "1.0"); release imza anahtarı depo dışında (`.gitignore` `*.jks`, `*.keystore`).
- **8.1 — Yedekleme (2.1'den):** `android:allowBackup="true"` (şablon varsayılanı) → localStorage
  kaydı Google yedeğine gidiyor; veri haritasına yazılmalı ya da `dataExtractionRules` ile
  sınırlanmalı.
- **4.2 / 7.1 — `toprak` → `bakkal` kimlik değişikliği (ART_BIBLE v1.1):** kayıt
  (`src/save/progress.ts`) açılmış karakterleri kimlikle tutuyor ve `isCharacterId` bilinmeyen
  kimliği sessizce atıyor; yeniden adlandırmada `toprak`'ı açmış oyuncu kilidi kaybeder. Kimlik
  değişirken kayıt göçü (`toprak` → `bakkal`) ve testi eklenmeli; tekrar kayıtları ve denge
  betikleri de eski kimliği kullanıyor olabilir.
- **3.1 / 3.2 — İskelet dosyası (ART_BIBLE v1.1 §13.6):** karakter başına `kar_{id}_iskelet.json`
  (§6.1 eklem sistemi, @2x, y yukarı). Parçalar şablon sayfası boyutunda dışa aktarılıyor; atlas
  aracının kırpma payını (orijinal boyut + konum) koruması şart. Eklemleri §6.1 ile karşılaştıran
  test 3.2'de.
- **4.7 — Yerel 2 oyuncu (2.3'ten):** dikey dilim testinde iki kişiyle telefonda dokunmatik 2 oyuncu
  denenmeli; rahat değilse `TOUCH.twoPlayer.minDiagonalInch = 7` (yalnızca tablet).
- **iPhone'da otomatik büyütme (2.3'ten):** hareket bölgesi 2.4'te telefonda gerçek dokunuşla
  doğrulandı; iPhone'da (Safari) varsayılan düzenin otomatik büyümesi henüz denenmedi.
- **4.x — Geçici ikon ve açılış ekranı (2.1'den):** `android/app/src/main/res/mipmap-*` ve
  `drawable*/splash.png` kodla üretilmiş yer tutucu. Final ikon (ART_BIBLE §11.7, §13.2) ve açılış
  ekranı gelince: `npx capacitor-assets generate --android --assetPath <klasör>`, ASSET_LOG kaydı,
  `scripts/mobile/placeholderAssets.ts` silinir.
- **Capacitor 9 (2.1'den):** 9.0 RC şablonu AGP 9.4 + Gradle 9.8, minSdk 26, compileSdk 37. Geçişte
  Gradle 10 uyarıları da kapanır; `android/` şablon farkı elle birleştirilir (`MainActivity`, manifest,
  `styles.xml`, `colors.xml` özelleştirildi).
- **2.7 — Simülasyonda ayırma (2.4'ten):** `collideStatic`/`circleVsCircle` her temasta yeni temas
  nesnesi, `resolveContact` yeni sonuç nesnesi döndürüyor; `loadState` yanılsamalar için yeni `Ball`
  kuruyor (rollback'te her geri sarmada). Masaüstünde kare başına ~6 kB; 2.7 denetiminde ön ayrılmış
  sonuç nesnelerine çevrilebilir (aritmetik aynı, determinizm testleri doğrular).
- **3.1 / 4.5 — Bellek bütçesi (2.4'ten):** normal maçta toplam PSS ~366–371 MB (P6 sınırı 400),
  hedef boyutlu stres sahnesinde ~428–452 MB. Kodla çizilen dokular WebView'da iki kez yer tutuyor
  (çizici süreçte tuval, GPU'da doku); final görseller PNG olarak gelince de çözülmüş görüntü
  önbelleği benzer. 3.1'de: doku sıkıştırma (ETC2/ASTC, KTX2) ya da yüklemeden sonra kaynak tuvali
  bırakma denenmeli; 4.6'da stres sahnesi yerine final görsellerle P6 yeniden ölçülmeli.
- **3.x — Çizim kuralları (2.4'ten):** mobilde toplu çizim başına tek doku; doku değişimi ucuz ama
  karışım kipi ve çizici değişimi pahalı (toplu çizim boşaltma). Toplamalı (ADD) nesneler art arda ya
  da tek ADD kapta; maç içinde `Rectangle` yerine `solidRect`; saydamlığı 0 olan nesne görünür
  bırakılmaz (gizlenir ya da `alpha 0`). Phaser 4 filtreleri (3.6) de toplu çizimi böler. Yeni
  sahne/efekt eklenince `npm run bench -- --device` ile çizim/kare ve FPS kontrol edilmeli.
- **4.6 — Pil ve kamera gecikmesi (2.4'ten):** P5 (15 dk USB'siz, parlaklık %50, ≤ %5 pil) ve D6'nın
  uçtan uca kısmı (ağır çekim kamera, ≤ 80 ms) 2.4'te ölçülmedi; 4.6 cihaz turunda final görsellerle.
  Adımlar: [archive § Faz 2.4 → Telefonda ölçüm](archive/PROGRESS_MOBILE_2.md) (D ve E).
- **4.6 / 12.3 — Ölçümleri tekrarla (2.4'ten):** stres sahnesi final görsellerin vekili; 4.6'da
  final görsellerle aynı tezgâh ve 15 dk test (`?devtest=stress` yerine gerçek maç + rollback:
  `?devtest=rollback`), 12.3'te cihaz matrisiyle.
- **12.5 — Canvas çizicisi (2.4'ten):** yedek olarak pakette (3 kB gzip); kapalı testte WebGL'siz
  cihaz oranı görülünce kaldırma kararı.
- **Phaser güncellemeleri:** `LiteGraphics` hızlı yolu `BatchHandlerQuad`'ın iç alanlarına, paket
  eklentisi `BatchHandler`'ın `Renderer` kullanımına dayanıyor. İkisi de korumalı (yedek yola
  düşüşte duman testi, `Renderer` kullanımı değişirse derleme kırılır). Güncellemeden sonra
  `npm run bench` (masaüstü) ve `npm run bench -- --device` (telefon) ile karşılaştır; `batchSize`
  (`DISPLAY.batchQuads`, 1024) ayarı korunmalı — Phaser varsayılanı mobilde 30 FPS demek.
- **3.x — Seyrek GC takılması (P2, 2.4'ten):** oyun akarken ~1–2 dakikada bir V8'in büyük GC'si
  (~25 ms) 2–3 vsync kaçırtıyor (50–75 ms'lik kare). Ayırma kare başına ~265 kB, ~%85'i Phaser'ın
  içinde: kap çizicisi her çocuk için her karede iki kez `setAlpha` çağırıyor (iç içe kaplar),
  `SubmitterQuad` ve `finalizeTextureCount` sayı kutuluyor, karışım geçişinde `DrawingContext`
  kuruluyor. Seçenekler: dünya kaplarını düzleştirmek (kalabalık, parçacıklar doğrudan sahnede),
  Phaser'a yama ya da sorun bildirimi. 3.2'deki parçalı karakterler (karakter başına ~22 resim) bu yükü
  artıracak; geliştirici derlemesindeki takılma günlüğüyle (`__KAFA_PERF__.report().hitches`)
  doğrulanmalı.
- **2.7 — Durum özeti:** tezgâhın determinizm bölümü `JSON.stringify(saveState())` özetini
  kullanıyor; bu kanonik değil (`-0` → `0`, `NaN` → `null`, alan sırası nesne kurulum sırasına bağlı).
  2.7'nin checksum'ı için alan sırası sabit, ikili (Float64) bir serileştirme gerekir; tezgâhtaki
  tarayıcı kancası (adım başına özet, gol tekrarı çelişki denetimi) çapraz motor testine örnek.
- **3.6 — Phaser 4 filtreleri:** parlama, bulanıklık, gölge vb. artık her nesne ve kamerada var,
  ama her filtre ayrı bir dokuya çizim geçişi; efekt bütçesine ve düşük seviye cihaz ölçümüne bağlı
  kullanılmalı. Özel derlemede filtre düğümleri zaten paketin içinde (`RenderNodeManager`).
