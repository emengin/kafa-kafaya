# Kafa Kafaya — Mobil Oyun Tasarım Belgesi

> **Durum:** iskelet (Faz 0.3). Faz 1.1'de doldurulacak.
>
> Bu belge [GAME_DESIGN.md](GAME_DESIGN.md)'yi (web sürümü: fizik, kurallar, karakterler, süperler,
> AI) **genişletir**, yerine geçmez. İkisi çeliştiğinde mobil derleme için bu belge geçerlidir ve
> çelişki burada açıkça yazılır. Bağlayıcı ilkeler: [ROADMAP_MOBILE.md](ROADMAP_MOBILE.md) § Çalışma
> kuralları (para kazanma, gizlilik, varlık kuralları).

## 1. Çekirdek döngü ve meta döngü

<!-- Faz 1.1: maç → ödül → ilerleme → kozmetik → tekrar; oturum uzunluğu hedefi; döngü diyagramı. -->

## 2. Ekonomi

<!-- Faz 1.1: Altın ve Elmas kaynakları ve harcama yerleri, günlük kazanç hedefleri (sayısal tablo:
oyuncu tipi × gün → Altın/Elmas), enflasyon ve tavanlar. Tüm değerler sunucudan uzaktan ayarlanır. -->

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
etkinlik modları. Web'deki "2 Oyuncu (aynı cihaz)" modunun mobildeki durumu. -->

## 8. İlk kullanıcı deneyimi ve elde tutma

<!-- Faz 1.1: ilk 10 dakika (dakika dakika akış), özelliklerin kademeli açılması, günlük görevler,
giriş ödülleri, başarımlar, etkinlikler. -->

## 9. Kazanmak için para ödenmez

<!-- Faz 1.1: ilke ve teknik uygulanışı (sunucu taraflı doğrulama, online maçta eşit istatistikler,
satılan her şeyin görünüş/kolaylık/gösteriş olduğunun kontrol listesi). -->

## Açık sorular (Faz 1.1'de karara bağlanacak)

Faz 0.3'te yol haritası okunurken çıkan çelişkiler ve riskler. Her biri için karar ve gerekçe bu
belgeye, kısa özeti PROGRESS.md'ye yazılır.

1. **Karakter istatistikleri ve "online'da istatistikler eşit" ilkesi.** Web sürümünde karakterlerin
   Hız/Zıplama/Şut/Kafa değerleri ve süperleri farklı; denge tablosunda %47–57 aralığı ve %71'lik
   karşı eşleşmeler var. Karakterler parayla açılabiliyorsa (6.6: "satın almak sadece beklememek
   için") ödeyen oyuncu daha güçlü seçeneğe daha erken ulaşır. Seçenekler: (a) sıralamalı online'da
   tüm karakterler herkese açık, satış yalnızca kozmetik; (b) karakterler yalnızca oynayarak açılır;
   (c) online'da istatistikler eşitlenir, karakteri yalnızca süper ayırır. 7.6'daki "%55'ten fazla
   kazanmasın" eşiği bugün Ayaz (%57) tarafından aşılıyor.
2. **Karakter sayısı.** 1.3 ve 7.1 "12 karakter" diyor; oyunda 10 karakter ve 10 süper var. 12 = 10
   mevcut (yeniden çizilir) + 2 yeni karakter ve süper mi?
3. **Tek oyunculu ödüller ve çevrimdışı oyun.** AI'ya karşı maçın sonucu istemcide hesaplanır;
   "istemciye asla güvenilmez" ilkesiyle uzlaştırmak için ödül tavanı ya da girdi kaydının sunucuda
   yeniden simülasyonu gerekir (bu da motorlar arası determinizm ister, bkz. 4). Çevrimdışıyken
   oynanabilir mi, ödül kuyruğa alınır mı?
4. **Motorlar arası determinizm.** Rollback (9.2) ve sunucu doğrulaması (9.3) için Android WebView
   (V8), iOS WKWebView (JavaScriptCore) ve Nakama JS çalışma zamanının bit düzeyinde aynı sonucu
   üretmesi gerekir. `Math.sin/cos/exp/pow` sonuçları ECMAScript'te motora bırakılmıştır. Çözüm:
   kendi trigonometri/üstel fonksiyonları ya da sabit noktalı matematik. Fizik sayıları değişirse
   his ve denge yeniden ayarlanır; içerik dengelenmeden (7.6) önce yapılmalı.
5. **Online maçta zaman efektleri.** Hit-stop (40–60 ms) ve gol ağır çekimi yerel döngü süresini
   değiştiriyor. Rollback'te iki istemci aynı kare temposunda kalmalı: online'da bu efektler yalnızca
   çizimde olmalı ya da iki tarafta aynı adımda tetiklenmeli.
6. **Uzaktan ayarın tek kaynağı.** Teknik kararlarda Firebase "uzaktan ayar", Faz 5.4'te Nakama
   uzaktan ayarı var. Öneri: ekonomi ve oyun değerleri Nakama'da (sunucu doğrular), Firebase Remote
   Config yalnızca A/B testi için ya da hiç.
7. **Oyuncu adları.** Serbest sohbet yok ama oyuncu adı serbest metin ve liderlik tablolarında
   görünür: küfür/kişisel veri filtresi, raporlama ve yeniden adlandırma kuralı gerekir.
8. **Sunucu bölgesi ve gecikme.** Tek sunucu Türkiye'deyse, girdiyi sunucu üzerinden aktaran maçlarda
   uzak bölgelerdeki iki oyuncunun gecikmesi toplanır. 9.4 bölgesel eşleştirme istiyor; bölgesel
   aktarım (relay) ya da eşler arası bağlantı + sunucuda yalnızca eşleştirme ve sonuç doğrulaması
   değerlendirilmeli. KVKK açısından veri yeri ayrıca avukata sorulmalı (10.5).
