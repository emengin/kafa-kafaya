# Kafa Kafaya — Mobil Oyun Tasarım Belgesi

> **Durum:** iskelet (Faz 0.3); temel kararlar Faz 0.4'te verildi (§ Kararlar). Faz 1.1'de
> doldurulacak.
>
> Bu belge [GAME_DESIGN.md](GAME_DESIGN.md)'yi (web sürümü: fizik, kurallar, karakterler, süperler,
> AI) **genişletir**, yerine geçmez. İkisi çeliştiğinde mobil derleme için bu belge geçerlidir ve
> çelişki burada açıkça yazılır. Bağlayıcı ilkeler: [ROADMAP_MOBILE.md](ROADMAP_MOBILE.md) § Çalışma
> kuralları (para kazanma, gizlilik, varlık kuralları) ve bu belgenin § Kararlar bölümü.

## 1. Çekirdek döngü ve meta döngü

<!-- Faz 1.1: maç → ödül → ilerleme → kozmetik → tekrar; oturum uzunluğu hedefi; döngü diyagramı. -->

## 2. Ekonomi

<!-- Faz 1.1: Altın ve Elmas kaynakları ve harcama yerleri, günlük kazanç hedefleri (sayısal tablo:
oyuncu tipi × gün → Altın/Elmas), enflasyon ve tavanlar. Tek oyunculu moddan yalnızca Altın + XP,
günlük tavanlı; Elmas tek oyunculudan asla (K3). Tüm değerler Nakama'dan uzaktan ayarlanır (K6). -->

| Kaynak / harcama | Para birimi | Miktar | Günlük tavan | Not |
| ---------------- | ----------- | ------ | ------------ | --- |
|                  |             |        |              |     |

## 3. Sezon Kartı

<!-- Faz 1.1: ücretsiz ve premium yol, 6–8 haftalık temalı sezonlar, seviye başına XP, ücretsiz oyuncu
için ulaşılabilirlik hedefi (Faz 6.9'da simülasyonla doğrulanır). -->

## 4. Kozmetik kategorileri

<!-- Faz 1.1: karakter skinleri, formalar, ayakkabılar, aksesuarlar, top skinleri, top izleri, gol
patlama efektleri, gol kutlamaları, profil çerçeveleri, isim plakaları, maç öncesi giriş
animasyonu, stadyum özelleştirmeleri. Her kategori için nadirlik, fiyat aralığı ve "çarpışma
dairesini değiştirmez" kuralı (kozmetik, kafa/top hitbox'ını görsel olarak yanıltmamalı). -->

## 5. Ürün kataloğu

<!-- Faz 1.1: reklamsız paket, başlangıç paketi, kurucu paketi, elmas paketleri, Sezon Kartı, VIP
Kulüp aboneliği. Her ürün: içerik, fiyat kademesi (TL, vergiler dahil), görünme koşulu. -->

| Ürün | İçerik | Fiyat kademesi | Görünme koşulu |
| ---- | ------ | -------------- | -------------- |
|      |        |                |                |

## 6. Reklam yerleşimleri

<!-- Faz 1.1: ödüllü reklamlar (maç ödülü ×2, günlük bedava ödül, turnuvada bir şans daha, skin'i 1
maçlığına deneme) ve geçiş reklamı kuralları (yalnızca maç sonu, ilk 5 maçta yok, sıklık tavanı
uzaktan ayardan, maç içinde asla). Banner yok. -->

## 7. Modlar

<!-- Faz 1.1: online sıralamalı, arkadaşla özel oda, tek oyunculu turnuva/kariyer, antrenman,
etkinlik modları. Web'deki "2 Oyuncu (aynı cihaz)" modunun mobildeki durumu. Çevrimdışıyken
oynanabilen modlar (K3). -->

## 8. İlk kullanıcı deneyimi ve elde tutma

<!-- Faz 1.1: ilk 10 dakika (dakika dakika akış), özelliklerin kademeli açılması, günlük görevler,
giriş ödülleri, başarımlar, etkinlikler. -->

## 9. Güç satılmaz, çeşitlilik satılır

<!-- Faz 1.1: ilke (K1) ve teknik uygulanışı: eşit istatistik bütçesi, %45–55 kazanma bandı, her
karakterin oynayarak açılma süresi hedefi, seviye/yükseltmeyle güç yok; sunucu taraflı doğrulama;
satılan her şeyin çeşitlilik, görünüş, kolaylık ya da gösteriş olduğunun kontrol listesi. Karakter
kadrosu: 10 mevcut + 2 yeni karakter (K2). -->

## Kararlar (Faz 0.4, 2026-11-20)

Faz 0.3'teki açık soruların kararları. Bağlayıcıdır; uygulandıkları fazlar
[ROADMAP_MOBILE.md](ROADMAP_MOBILE.md)'de. Faz 1.1 bu kararlarla çelişen bir tasarım yapmaz;
değişiklik gerekiyorsa önce bu bölüm güncellenir.

### K1. Güç satılmaz, çeşitlilik satılır (eski soru 1)

"Online'da istatistikler eşit" ilkesinin yerini alır. Karakterler birbirinin yan seçeneğidir:

- Tüm karakterlerin toplam istatistik bütçesi eşittir.
- AI-vs-AI denge simülasyonunda ve ileride online veride her karakterin kazanma oranı **%45–55**
  bandındadır (Faz 7.6'daki eşik). Web v1.0.0'da Ayaz %57; banda çekilmesi Faz 2.9'da (2.7'den
  sonra).
- Her karakter oynayarak makul sürede açılabilir; süre hedefi Faz 1.1'de belirlenir. Satın almak
  yalnızca beklememek içindir.
- Seviye veya yükseltmeyle güç artışı yoktur.

### K2. Karakter kadrosu: 12 = 10 mevcut + 2 yeni (eski soru 2)

Mevcut 10 karakter yeniden çizilir (ikisi Faz 4.2'de, kalan 8'i Faz 7.1'de) ve 2 yeni karakter
eklenir. Yeni karakterlerin istatistikleri (eşit bütçe) ve süper şutları Faz 1.1'de tasarlanır, Faz
7.6'da kodlanır.

### K3. Tek oyunculu ödüller ve çevrimdışı oyun (eski soru 3)

- Tek oyunculu moddan yalnızca Altın + XP gelir; günlük üst sınırlıdır. **Elmas tek oyunculudan
  asla gelmez.**
- Sunucu maçı yeniden simüle etmez; makullük kontrolü yapar: maç süresi, skor aralığı, sıklık sınırı
  (Faz 5.3).
- Çevrimdışı oyun tam oynanabilir; ödüller cihazda kuyrukta tutulur, bağlanınca aynı sınırlarla
  doğrulanır.

### K4. Motorlar arası determinizm (eski soru 4)

- Fizik simülasyonu yalnızca `+`, `-`, `*`, `/`, `Math.sqrt`, `Math.abs/min/max/floor/round` ve tam
  sayı işlemlerini kullanır. `sin`, `cos`, `atan2`, `exp`, `pow` (ve `**`) için kendi deterministik
  fonksiyonlarımız yazılır. Simülasyonda `Math.random` yok; tohumlu PRNG var.
- CI'da aynı tekrar kaydı Chromium, WebKit ve Node'da çalıştırılır; her karenin checksum'ı
  karşılaştırılır.
- Sunucu ilk sürümde maçı yeniden simüle etmez: istemciler periyodik checksum ve sonuç gönderir;
  uyuşmazlıkta maç geçersiz sayılır ve loglanır (Faz 9.3). Sunucu taraflı yeniden simülasyon
  ileride opsiyonel (Faz 13.2).
- Uygulama: Faz 2.7 (Determinizm sertleştirme). Fizik hissi ve denge bu fazdan sonra yeniden
  ayarlanır (Faz 2.9).

### K5. Zaman efektleri ve simülasyon adımı (eski soru 5)

Online maçta simülasyon adımı asla değişmez; hit-stop ve ağır çekim yalnızca sunum katmanında
uygulanır. Gol sonrası duraklama deterministik bir oyun durumudur. Çevrimdışı mod da aynı mimariyi
kullanır: web sürümünde döngü süresini kesen hit-stop ve ağır çekim Faz 2.7'de sunum katmanına
taşınır.

### K6. Uzaktan ayar ve A/B testi: tek kaynak Nakama (eski soru 6)

Uzaktan ayar ve A/B testi yalnızca Nakama'dan (Faz 5.4, 11.3). Firebase yalnızca Analytics +
Crashlytics. Nakama gelene kadar yerel config dosyası (`src/config/gameConfig.ts`) kullanılır.

### K7. Oyuncu adları (eski soru 7)

Otomatik üretilen varsayılan ad; TR/EN küfür filtresi (harf hilelerine karşı normalizasyonla),
ayrılmış adlar, raporlama ve ad değiştirme (Faz 5.2). Raporlanan adlar yönetim panelindeki
moderasyon kuyruğuna düşer (Faz 11.4).

### K8. Sunucu bölgesi (eski soru 8)

Lansman tek Türkiye bölgesiyle; eşleştirmede gecikme dikkate alınır (Faz 9.4). Kendi barındırma mı
yönetilen hizmet mi kararı Faz 5.5'te verilir (KVKK yurt dışı aktarım etkisi dahil).

### K9. Gözlemlenebilirlik ve gizlilik sırası (yeni)

- Faz 2.8: Firebase Crashlytics + Analytics ve geçici rıza ekranı; rıza yoksa veri gönderilmez. Faz
  6.8'in analiz olayları bu altyapıyı kullanır; 11.3 gelişmiş huni ve A/B testi olarak kalır.
- Veri haritası, yaş sorusu, aydınlatma ve rıza yönetimi (eski 10.1–10.2) Bölüm 8'in başına taşındı
  (8.1–8.2); satın alma ve reklam fazlarından önce yapılır. Bölüm 8 ve 10 yeniden numaralandı.

### K10. Rollback bütçesi (yeni)

Durum kaydı + 8 karelik yeniden simülasyon test cihazında **≤ 4 ms** (Faz 2.4 bitti kriteri). Final
görseller olmadığı için hedef boyutta sentetik bir stres sahnesi kullanılır; ölçüm Faz 4.6 ve
12.3'te tekrarlanır.

### K11. Metin çizimi ve diller (yeni)

Çevrilen metinler canvas tabanlı metinle (web/sistem fontları) çizilir; bitmap font yalnızca skor,
sayaç gibi stilize sayı ve başlıklarda. Lansman dilleri Latin ve Kiril alfabeli 10 dil: TR, EN, DE,
FR, ES, PT-BR, IT, PL, RU, ID (Faz 11.6). Çince, Japonca, Korece ve Arapça (sağdan sola) lansman
sonrası ayrı fazda (13.1).

### K12. Phaser 4'e geçiş (yeni)

Faz 2.0, Faz 2.1'den önce: LiteGraphics'in render node mimarisine taşınması, özel Phaser paketinin
yeniden yapılandırılması, tüm testlerin ve web yayınının geçmesi, determinizm ve performans
karşılaştırması. Bitti kriteri: web sürümü Phaser 4'te eskisiyle aynı davranıyor.

### Hâlâ açık olanlar

İlkesi karara bağlanmış ama değeri ya da kapsamı belirlenmemiş konular:

| Konu                                                                                                                 | Karar yeri                  |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Karakter başına oynayarak açılma süresi hedefi (K1)                                                                  | 1.1                         |
| Tek oyunculu günlük Altın/XP tavanı ve makullük eşikleri (K3)                                                        | 1.1 (değer), 5.3 (uygulama) |
| Görev, başarım, seviye ödülü ve Sezon Kartı Elmas'ının tek oyunculu ilerlemeyle kazanılıp kazanılamayacağı (K1 ↔ K3) | 1.1                         |
| Eşleşme bazlı denge eşiği: bant genel kazanma oranı için; web v1.0.0'da Bora–Toprak %71                              | 1.1, 2.9                    |
| Çevrimdışı kuyrukta günlük tavanın hangi güne göre sayılacağı (cihaz saati mi, sunucu günü mü)                       | 5.3                         |
| Ad değiştirme kuralı (ücretsiz hak, bekleme süresi)                                                                  | 5.2                         |
| Kendi barındırma mı yönetilen hizmet mi; "Türkiye bölgesi" fiziksel konum mu yakınlık mı (K8)                        | 5.5                         |
| Türkiye'den uzak bölgelerdeki oyuncular için gecikme (ikinci bölge ya da aktarım)                                    | 12.6 öncesi                 |
