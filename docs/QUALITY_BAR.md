# Kalite Çıtası (Quality Bar)

> **Sürüm:** v1.2 (Faz 2.5, 2026-11-27) — açılış satırları açılış ekranı değişikliğinden sonra
> yeniden ölçüldü; K5 senaryo listesi PROGRESS.md § Faz 2.5'te. v1.1 (Faz 2.4): performans, açılış
> ve bellek satırları referans cihazda ölçüldü ("Ölçülen" sütunu). Hedefler değişmedi; P1'in nasıl ölçüldüğü netleştirildi. Final
> görsellerle Faz 4.6 ve 12.3'te tekrar ölçülür. Ayrıntı ve yöntem:
> [archive/PROGRESS_MOBILE_2.md § Faz 2.4](archive/PROGRESS_MOBILE_2.md).
>
> Bu dosyadaki kriterler **her fazın bitti kriterinin parçasıdır** (ROADMAP_MOBILE.md § Kalite
> hedefi). Bir faz, kendi kapsamına giren satırlar sağlanmadan bitmiş sayılmaz. Tam doğrulama Faz
> 12.3'te ("teknik hazır" kapısı).

## 0. Referans cihazlar

| Sınıf                   | Tanım                                                                                                 | Kullanım                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Referans (hedef)**    | Düşük-orta seviye Android: 4 GB RAM, Snapdragon 680 / Helio G85 sınıfı, 60 Hz 720p–1080p, Android 11+ | Tüm performans hedefleri burada ölçülür.   |
| **Taban (desteklenen)** | 3 GB RAM, Android 9+, güncel Android System WebView                                                   | Oynanabilir olmalı; hedeflerin altı kabul. |
| **Yüksek**              | Güncel amiral gemisi, 90/120 Hz ekran                                                                 | 60 FPS sınırı, ısınma ve pil kontrolü.     |

**Referans cihaz (Faz 2.4'ten):** realme 12 kite (RMX3890) — Snapdragon 685 (SM6225), Adreno 610,
8 GB RAM, 1080×2400 60/90 Hz, Android 15, Android System WebView 158. Bellek dışında referans sınıfının
tam karşılığı (RAM 4 değil 8 GB; P6 bu yüzden mutlak değerle izlenir).

## 1. Performans

| #   | Kriter                      | Hedef                                                                                        | Nasıl ölçülür                                                                                                                                | Ölçülen                                                                                                           |
| --- | --------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| P1  | Maç içi kare hızı           | Referans cihazda **sabit 60 FPS**: karelerin ≥ %99'u ≤ 16,7 ms, p99 ≤ 20 ms                  | Geliştirici derlemesi: kare süresi grafiği, Stres testi; `npm run bench -- --device`. %99 = ana iş parçacığının kare işi, p99 = kare aralığı | ✅ 15 dk stres: 59,7 FPS, işin %99,91'i ≤ 16,7 ms, aralık p99 19,6 ms (normal maç 59,7 / %99,88 / 19,1)           |
| P2  | Takılma                     | Oyun akarken 50 ms'yi aşan kare yok (ekran geçişleri hariç)                                  | Aynı; 15 dk kayıt                                                                                                                            | ❌ oyun akarken ~1–2 dk'da bir 50–75 ms (5 dk'da 3); nedeni V8 büyük GC (~25 ms) → 3.x notu                       |
| P3  | Isınma                      | 15 dk kesintisiz maçta son dakikanın ortalama FPS'i ilk dakikadan en çok 2 FPS düşük         | 15 dk AI vs AI ya da oyuncu oturumu                                                                                                          | ✅ son dk ilk dk'dan 0,8 FPS hızlı (15 dk stres; termal durum hep 0, pil 28,5 → 31,5 °C)                          |
| P4  | Kalite kademesi             | Referans cihazda uyarlamalı kalite "Orta"nın altına inmez                                    | Kalite yöneticisi günlüğü                                                                                                                    | ✅ 15 dk boyunca Yüksek (2)                                                                                       |
| P5  | Pil                         | 15 dk maç oturumunda referans cihazda ≤ %5 pil                                               | Android pil istatistiği, ekran parlaklığı %50                                                                                                | ölçülmedi: test USB'de şarj olurken yapıldı → Faz 4.6                                                             |
| P6  | Bellek                      | Toplam uygulama belleği (PSS) ≤ 400 MB; 15 dk'da %10'dan fazla büyüme yok (sızıntı yok)      | `adb shell dumpsys meminfo`                                                                                                                  | ◐ normal maç 366–371 MB ✅, hedef boyutlu stres 428–452 MB ❌; 15 dk'da büyüme yok ✅                             |
| P7  | Kare başına ayırma          | Maç içinde kare başına yeni nesne ayırma yok (havuzlar); GC duraklaması kare bütçesini aşmaz | Chrome DevTools uzaktan hata ayıklama, bellek profili                                                                                        | ◐ bizim kodda nesneler havuzlu; Phaser içi sayı kutulama ~265 kB/kare; küçük GC ≤ 3,1 ms ✅, büyük GC ~25 ms (P2) |
| P8  | Yüksek yenileme hızlı ekran | 90/120 Hz'de simülasyon 60 Hz kalır, oynanış hızı değişmez                                   | Determinizm testleri + cihazda gözlem                                                                                                        | ✅ 90 Hz panelde WebView 60 FPS çiziyor; simülasyon sabit 60 Hz adım (testler)                                    |
| P9  | Rollback maliyeti           | Durum kaydı + 8 karelik yeniden simülasyon referans cihazda **≤ 4 ms**                       | Geliştirici katmanı; 2.4'te sentetik stres sahnesi, 4.6 ve 12.3'te tekrar                                                                    | ✅ ort. 0,51–0,54 ms, p99 1,1–1,2 ms, p99,9 2,1 ms; 10.877 ölçümde 1 aşım (4,1 ms); 0 durum farkı                 |

## 2. Açılış ve ekran geçişleri

| #   | Kriter                     | Hedef                                                                              | Ölçülen                                                                  |
| --- | -------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| A1  | Soğuk açılış — ilk görüntü | Simgeye dokunuştan açılış ekranına ≤ 1 sn                                          | ✅ sistem açılış ekranı anında, ana menüye kadar kalıyor (Faz 2.5)       |
| A2  | Soğuk açılış — etkileşim   | Simgeye dokunuştan dokunulabilir ana menüye ≤ 3 sn (referans), ≤ 5 sn (taban)      | ✅ 2,55–3,09 sn, medyan 2,70 (Faz 2.5, referans cihaz; 2.4: medyan 2,65) |
| A3  | Sıcak açılış               | Arka plandan dönüşte ≤ 1 sn, durum korunmuş                                        | ◐ durum korunuyor (süreç ölse bile, Faz 2.5); süre telefon testinde      |
| A4  | Dokunma geri bildirimi     | Basılı durum aynı karede (≤ 16,7 ms) görünür; ses ve titreşim ≤ 50 ms              | —                                                                        |
| A5  | Ekran geçişi animasyonu    | 200–350 ms; pop-up açılış/kapanış 150–250 ms                                       | —                                                                        |
| A6  | Yerel ekran açılışı        | Dokunuştan etkileşime ≤ 500 ms (yükleme ekranı yalnızca > 1 sn sürecek işlerde)    | —                                                                        |
| A7  | Ağa bağlı ekran            | ≤ 300 ms içinde iskelet/yükleniyor durumu; 10 sn'de anlaşılır hata ve yeniden dene | —                                                                        |
| A8  | Maça giriş                 | Karakter seçimi onayından santraya ≤ 2 sn                                          | —                                                                        |

## 3. Kararlılık

| #   | Kriter                     | Hedef                                                                                     | Kaynak                               |
| --- | -------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------ |
| K1  | Çökmesiz kullanıcı         | **≥ %99,5** (7 günlük)                                                                    | Crashlytics / Play Console           |
| K2  | Algılanan çökme oranı      | < %1,09 (Google Play "kötü davranış" eşiği), hedef < %0,5                                 | Android vitals                       |
| K3  | Algılanan ANR oranı        | < %0,47 (Google Play eşiği), hedef < %0,2                                                 | Android vitals                       |
| K4  | JS hataları                | Yakalanmamış JS hatası ve WebView çizici süreç kaybı da çökme sayılır ve raporlanır       | Crashlytics özel olay                |
| K5  | Kesintiler                 | Arka plan, çağrı, bildirim, kulaklık, düşük bellek senaryolarında veri kaybı ve çökme yok | Faz 2.5 senaryo listesi (PROGRESS)   |
| K6  | Motorlar arası determinizm | Aynı tekrar kaydı Chromium, WebKit ve Node'da her karede aynı checksum'ı üretir           | CI (Faz 2.7); gerçek cihazlarda 12.3 |

## 4. Dokunma ve okunurluk

| #   | Kriter                 | Hedef                                                                                        |
| --- | ---------------------- | -------------------------------------------------------------------------------------------- |
| D1  | En küçük dokunma alanı | **48 × 48 dp** (görsel daha küçük olabilir, dokunma alanı olamaz)                            |
| D2  | Dokunma alanları arası | ≥ 8 dp boşluk                                                                                |
| D3  | Maç kontrolleri        | Varsayılan ≥ 72 dp çap; düzenleyicide küçültülse bile 48 dp altına inmez                     |
| D4  | Yazı boyutu            | Gövde metni ≥ 14 sp, ikincil metin ≥ 12 sp eşdeğeri (web sürümündeki ~8 px sorunu yok)       |
| D5  | Güvenli alan           | Çentik/yuvarlak köşe altında etkileşimli öğe ya da kesilen metin yok (16:9–21:9, 4:3)        |
| D6  | Giriş gecikmesi        | Oyunun eklediği gecikme ≤ 1 simülasyon adımı; dokunuştan ekrana ≤ 80 ms (Faz 2.3'te ölçülür) |
| D7  | Çoklu dokunuş          | İki parmakla aynı anda hareket + şut + zıplama kayıpsız                                      |

D6 ölçümü (Faz 2.3): maç içi gecikme ölçer (Ayarlar → Kontroller → Gecikme ölçer) oyunun ve sistemin
payını, ağır çekim kamera uçtan uca süreyi verir. Adım adım yöntem ve tarayıcıdaki referans ölçüm:
[archive/PROGRESS_MOBILE_2.md § Faz 2.3](archive/PROGRESS_MOBILE_2.md).

**Ölçülen (Faz 2.4, referans cihaz):** D6 — 60 gerçek dokunuşta (`adb input tap`) dokunuş→kare medyan
18,4 ms (p95 33,2), oyun bekletmesi 5,6 ms ✅ (≤ 1 adım); dokunuştan ekrana (kamera) ölçülmedi → Faz 4.6. D1–D3, D5, D7: Faz 2.2–2.3'te sağlandı; hareket bölgesi Faz 2.4'te telefonda gerçek
dokunuşla doğrulandı.

## 5. Erişilebilirlik ve efekt bütçesi

- Renk tek ipucu değildir (şekil, konum, metin de var); renk körü modu her yeni ekranda çalışır.
- Saniyede 3'ten fazla tam ekran parlama yok (ışığa duyarlılık); "azaltılmış efekt" ayarı uyulur.
- Efekt bütçesi: aynı anda en çok 1 tam ekran efekt, kalite kademesine göre parçacık tavanı; bir anda
  yalnızca bir şey öne çıkar (gol > süper > vuruş).
- Her etkileşimin karşılığı vardır: basma animasyonu + ses + titreşim (titreşim ayardan kapatılabilir).

## 6. Görsel tutarlılık kontrol listesi

Her yeni ekran ve her yeni varlık için. Ölçüt: "Bu ekran görüntüsü Play Store'daki en iyi 10 spor
oyununun yanında sırıtır mı?"

- [ ] Yalnızca ART_BIBLE paletindeki renkler; arayüzde yalnızca `design/tokens.json` token'ları.
- [ ] Çizgi kalınlığı, ışık yönü ve gölge ART_BIBLE kurallarına uyuyor.
- [ ] Köşe yarıçapı, gölge, boşluk ve animasyon süreleri token'lardan; elle sayı yok.
- [ ] Hazır bileşen görünümü yok (varsayılan buton, sistem fontu, düz gri panel).
- [ ] Tek font ailesi seti; Türkçe karakterler (ğ Ğ ü Ü ş Ş ı İ ö Ö ç Ç) ve lansman dillerinin Latin
      genişletilmiş ve Kiril karakterleri doğru çiziliyor.
- [ ] En uzun dilde metin taşmıyor, kesilmiyor, satır kırılması bozuk değil.
- [ ] İkonlar tek setten ve tek stilde.
- [ ] Yapay zekâ izi yok: bozuk eller, anlamsız desen/yazı, tutarsız ışık, aşırı detay.
- [ ] Yeni görsel mevcutların yanına konduğunda "aynı elden çıkmış" görünüyor.
- [ ] Silüet küçük ekranda (taban cihaz, kol mesafesi) okunuyor.
- [ ] Placeholder görseller işaretli ve asset manifestinde; final görseller ASSET_LOG'da kayıtlı.
- [ ] 16:9, 19,5:9, 21:9 ve 4:3 ekran görüntülerinde kesilen ya da taşan öğe yok.

## 7. Boyut ve ağ

| #   | Kriter               | Hedef                                                              |
| --- | -------------------- | ------------------------------------------------------------------ |
| B1  | İndirme boyutu (AAB) | ≤ 100 MB, hedef ≤ 60 MB; büyük içerik gerekiyorsa sonradan indirme |
| B2  | Online maç           | 150 ms gecikme ve %2 paket kaybında akıcı; desync yok (Faz 9.2)    |
| B3  | Çevrimdışı açılış    | Ağ yokken açılış çökmez, anlaşılır mesaj ve kullanılabilir modlar  |

## Faz sonu kontrolü

Her faz sonunda PROGRESS.md'ye (ya da arşivdeki faz kaydına) şu kısa tablo yazılır: fazın
dokunduğu QUALITY_BAR satırları, ölçüm sonucu, sağlandı mı (✅ / ❌ / ölçülemedi + neden).
