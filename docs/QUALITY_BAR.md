# Kalite Çıtası (Quality Bar)

> **Sürüm:** v1 (Faz 0.3, 2026-11-20) — hedefler henüz gerçek cihazda ölçülmedi. Ölçümler Faz 2.4'te
> "Ölçülen" sütununa işlenir, hedefler gerekirse gerekçesiyle güncellenir.
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

Referans cihaz modeli Faz 0.1'de alınınca buraya yazılır: _(henüz yok)_.

## 1. Performans

| #   | Kriter                      | Hedef                                                                                        | Nasıl ölçülür                                                             | Ölçülen |
| --- | --------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------- |
| P1  | Maç içi kare hızı           | Referans cihazda **sabit 60 FPS**: karelerin ≥ %99'u ≤ 16,7 ms, p99 ≤ 20 ms                  | Geliştirici katmanı kare süresi grafiği (Faz 2.4)                         | —       |
| P2  | Takılma                     | Oyun akarken 50 ms'yi aşan kare yok (ekran geçişleri hariç)                                  | Aynı; 15 dk kayıt                                                         | —       |
| P3  | Isınma                      | 15 dk kesintisiz maçta son dakikanın ortalama FPS'i ilk dakikadan en çok 2 FPS düşük         | 15 dk AI vs AI ya da oyuncu oturumu                                       | —       |
| P4  | Kalite kademesi             | Referans cihazda uyarlamalı kalite "Orta"nın altına inmez                                    | Kalite yöneticisi günlüğü                                                 | —       |
| P5  | Pil                         | 15 dk maç oturumunda referans cihazda ≤ %5 pil                                               | Android pil istatistiği, ekran parlaklığı %50                             | —       |
| P6  | Bellek                      | Toplam uygulama belleği (PSS) ≤ 400 MB; 15 dk'da %10'dan fazla büyüme yok (sızıntı yok)      | `adb shell dumpsys meminfo`                                               | —       |
| P7  | Kare başına ayırma          | Maç içinde kare başına yeni nesne ayırma yok (havuzlar); GC duraklaması kare bütçesini aşmaz | Chrome DevTools uzaktan hata ayıklama, bellek profili                     | —       |
| P8  | Yüksek yenileme hızlı ekran | 90/120 Hz'de simülasyon 60 Hz kalır, oynanış hızı değişmez                                   | Determinizm testleri + cihazda gözlem                                     | —       |
| P9  | Rollback maliyeti           | Durum kaydı + 8 karelik yeniden simülasyon referans cihazda **≤ 4 ms**                       | Geliştirici katmanı; 2.4'te sentetik stres sahnesi, 4.6 ve 12.3'te tekrar | —       |

## 2. Açılış ve ekran geçişleri

| #   | Kriter                     | Hedef                                                                              | Ölçülen |
| --- | -------------------------- | ---------------------------------------------------------------------------------- | ------- |
| A1  | Soğuk açılış — ilk görüntü | Simgeye dokunuştan açılış ekranına ≤ 1 sn                                          | —       |
| A2  | Soğuk açılış — etkileşim   | Simgeye dokunuştan dokunulabilir ana menüye ≤ 3 sn (referans), ≤ 5 sn (taban)      | —       |
| A3  | Sıcak açılış               | Arka plandan dönüşte ≤ 1 sn, durum korunmuş                                        | —       |
| A4  | Dokunma geri bildirimi     | Basılı durum aynı karede (≤ 16,7 ms) görünür; ses ve titreşim ≤ 50 ms              | —       |
| A5  | Ekran geçişi animasyonu    | 200–350 ms; pop-up açılış/kapanış 150–250 ms                                       | —       |
| A6  | Yerel ekran açılışı        | Dokunuştan etkileşime ≤ 500 ms (yükleme ekranı yalnızca > 1 sn sürecek işlerde)    | —       |
| A7  | Ağa bağlı ekran            | ≤ 300 ms içinde iskelet/yükleniyor durumu; 10 sn'de anlaşılır hata ve yeniden dene | —       |
| A8  | Maça giriş                 | Karakter seçimi onayından santraya ≤ 2 sn                                          | —       |

## 3. Kararlılık

| #   | Kriter                     | Hedef                                                                                     | Kaynak                               |
| --- | -------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------ |
| K1  | Çökmesiz kullanıcı         | **≥ %99,5** (7 günlük)                                                                    | Crashlytics / Play Console           |
| K2  | Algılanan çökme oranı      | < %1,09 (Google Play "kötü davranış" eşiği), hedef < %0,5                                 | Android vitals                       |
| K3  | Algılanan ANR oranı        | < %0,47 (Google Play eşiği), hedef < %0,2                                                 | Android vitals                       |
| K4  | JS hataları                | Yakalanmamış JS hatası ve WebView çizici süreç kaybı da çökme sayılır ve raporlanır       | Crashlytics özel olay                |
| K5  | Kesintiler                 | Arka plan, çağrı, bildirim, kulaklık, düşük bellek senaryolarında veri kaybı ve çökme yok | Faz 2.5 senaryo listesi              |
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
