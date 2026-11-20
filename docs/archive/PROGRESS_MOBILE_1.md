# Mobil Bölüm 1 — Tasarım ve sanat yönü: faz kayıtları

PROGRESS.md'den taşınan biten faz ayrıntıları. Özet ve onay kutuları: [PROGRESS.md](../PROGRESS.md).
Faz 1.2 (rakip analizi, [SEN + SOHBET]) kaydı yoktur; çıktısı
[COMPETITOR_ANALYSIS.md](../COMPETITOR_ANALYSIS.md).

## Faz 1.1 — Mobil oyun tasarım dokümanı (2026-11-20)

### Tamamlananlar

[GAME_DESIGN_MOBILE.md](../GAME_DESIGN_MOBILE.md) iskeletten tam belgeye (~1.000 satır) çevrildi.
Yol haritasındaki 9 maddenin yeri:

| #   | Madde                                     | Bölüm | Özü                                                                                                                                           |
| --- | ----------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Çekirdek ve meta döngü                    | §1    | 6 ölçekli döngü tablosu, diyagram, maç/oturum hedefleri, sonuç ekranı, 10 öğeli ana menü, web'den farklar                                     |
| 2   | Ekonomi                                   | §2    | Para birimi kuralları, 24 satırlık kaynak tablosu, harcama tablosu, tek oyunculu tavan ve eşikler, oyuncu tipi × hafta tablosu, seviye eğrisi |
| 3   | Sezon Kartı                               | §3    | 7 hafta, 50 kademe × 800 XP, 25 + 50 ödül dağılımı, ulaşılabilirlik hedefi, dönüş politikası                                                  |
| 4   | Kozmetik kategorileri                     | §4    | 13 kategori (ifade paketi eklendi), sınıf × fiyat matrisi, oynanış bütünlüğü kuralları, satış kanalları, lansman kataloğu hedefi              |
| 5   | Ürün kataloğu                             | §5    | 5 Elmas paketi, 6 ürün (TL ve USD kademesi), fiyat dürüstlüğü, 18 yaş altı                                                                    |
| 6   | Reklam yerleşimleri                       | §6    | 4 ödüllü yerleşim, 9 kurallı geçiş reklamı tablosu (uzaktan ayar anahtarlarıyla), "asla" listesi                                              |
| 7   | Modlar                                    | §7    | 7 mod; sıralamalı (kör seçim, 6 lig, sezon sonu ödülleri), özel oda (ödülsüz), Kupa Yolu, çevrimdışı                                          |
| 8   | İlk 10 dakika ve elde tutma               | §8    | Dakika dakika akış (analiz olaylarıyla), kademeli açılım, görevler, takvim, başarım, ustalık, KPI hedefleri                                   |
| 9   | Güç satılmaz ilkesi, kadro, açılma süresi | §9    | Teknik uygulanış tablosu, 12 karakter, Yankı ve Kauçuk (istatistik + süper), denge eşikleri, satış kontrol listesi                            |

- **§ Kararlar:** K13–K17 eklendi; "Hâlâ açık olanlar"dan Faz 1.1'e ait 4 satır kapandı, 6 yeni açık
  konu (faz yerleriyle) eklendi. Başlık "Kararlar (Faz 0.4, …)" → "Kararlar" (Faz 1.1 kararlarını da
  içerdiği için); PROGRESS.md'deki bağlantı güncellendi.
- **ROADMAP_MOBILE.md:** Faz 1.1'e bırakılan değerlere atıflar (para kazanma ilkesi, 6.6, 7.1) ve
  eşleşme eşiği (2.9 madde 2 ve bitti kriteri, 7.6 madde 2) güncellendi.

### Ekonomi hesap modeli

§2.5 tablosu geçici bir Node betiğiyle (repoya girmedi) üretildi. Varsayımlar: §2.2 değerleri; online
galibiyet oranı %50, tek oyunculu Orta galibiyet oranı %60; 49 günlük sezon; haftalık görevler aktif
günlere eşit yayılır; giriş takvimi giriş başına turun 1/7'si; reklam: günlük bedava ödülün iki
adımı + 3 maç ×2 (galibiyetlere); seviye ve Sezon Kartı ücretsiz yol Altın'ı dahil; sıralamalı sezon
sonu, başarım ve etkinlik ödülleri hariç. Oyuncu tipleri: hafif (5 gün × 2 online + 1 tek), düzenli
(7 × 6 + 2), yoğun (7 × 16 + 4), çevrimdışı (7 × 12 tek oyunculu). Karakter fiyatı önce 3.000 Altın
denendi: düzenli oyuncu tüm kadroyu ~1 ayda bitiriyordu, Elmasla almanın anlamı kalmıyordu; 5.000'e
çıkarıldı. Haftalık görevler tek güne yığılınca ilk günler şişiyordu; yayılarak modellendi.

### Kararlar (Claude Code'un verdiği)

Bağlayıcı olanlar § Kararlar'a K13–K17 olarak yazıldı:

1. **K13 — Elmas yalnızca sunucunun doğruladığı olaylardan:** satın alma ve VIP, giriş takvimi,
   online maç sonucu. Seviye, Sezon Kartı (iki yol), ustalık, tek oyunculu görev/başarım ve reklam
   Elmas vermez. Gerekçe: K3 ("Elmas tek oyunculudan asla") dolaylı yollar dahil korunur; tek
   oyunculu sonuçlar sunucuda doğrulanamaz, Elmas gerçek para değeri taşır.
2. **K14 — Sıralamalıda kör seçim, eşleşme eşiği %35–65:** karşı karakter seçimi eşleşme
   dengesizliğini avantaja çeviremez; eşik 80 maçlık ölçümün ±5,6 puanlık hatası düşünülerek 200
   maçla tanımlandı.
3. **K15 — Açılma süresi:** 3 açık + 2 seviye seçimi + 7 × (5.000 Altın / 500 Elmas); düzenli ≤ 7
   gün, hafif ≤ 14 gün, yoğun ≤ 5 gün, çevrimdışı ≤ 8 gün.
4. **K16 — Tek oyunculu tavan 300 Altın + 600 XP**; düzenli online oyuncunun maç gelirine yakın, ama
   çevrimdışı oyuncuyu online oyuncunun üstüne çıkarmaz.
5. **K17 — Altın satılmaz, reklamdan Elmas yok:** Altın "oynayarak kazanılır" ilkesi kelimesi
   kelimesine; reklam başına gelir Elmas değerinin çok altında, Elmas çiftçiliği önlenir.

Belgenin içindeki diğer tasarım kararları:

6. Premium Sezon Kartı Elmas içermez ama 900 Elmasla da alınabilir: online görevlerini yapan
   ücretsiz oyuncu yaklaşık her 1,3 sezonda bir premium kartı oynayarak alabilir.
7. Haftalık görevler birikir ve haftalık maç XP takviyesi var: hafif oyuncu Sezon Kartı'nın en az
   %60'ına ulaşır (modelde %66).
8. Ödüllü reklam düzenli oyuncunun Altın'ının en çok %25'i (modelde %22); günlük bedava ödül 2 adım.
9. Başlangıç üçlüsü Kor, Bora, Kaya (hücum, denge, savunma; en kolay okunan süperler). Web'deki 6
   açık karakterden farklı.
10. Yeni karakterler kadronun iki boşluğunu doldurur: **Yankı** 5/4/2/3 (ikinci 5 hızlı), süperi
    gecikmeli patlama; **Kauçuk** 4/2/3/5 (ilk 2 zıplamalı), süperi hızlanan sekme. Mevcut 10
    süperde olmayan iki mekanik: zamanlama aldatması ve sekme geometrisi.
11. Özel oda ödülsüz (iki hesapla ödül çiftçiliği); yalnızca sosyal görevler sayılır.
12. Kupa Yolu karakter açmaz (K3: tek oyunculu yalnızca Altın + XP); kazanılan kupa profil
    istatistiğidir, envanter eşyası değil.
13. **İfade paketi** 13. kozmetik kategorisi oldu (hazır mesajlar, Faz 9.6); "saç" ayrı yuva değil.
14. Top skini ev sahibinin, top izi topa son dokunanın, gol efekti ve kutlama golcünün.
15. Mağaza 3 sekme (Vitrin · Katalog · Elmas); Sade/Nadir her zaman katalogda, Destansı/Efsanevi
    vitrinde döner, yarının vitrini görünür; "bonus %" etiketi yerine "Elmas başına ₺" satırı;
    Elmas fiyatlarının yanında TL karşılığı.
16. En büyük Elmas paketi 49,99 USD kademesi; 99,99 kademesi yok.
17. Lig adlarında metal adı yok (Altın para birimiyle karışmasın).
18. Günlük sıfırlama 00:00 TSİ (uzaktan ayar; bölgesel sıfırlama 12.6 öncesi açık konu).

### Bitti kriterleri

| Kriter                                   | Durum                                                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 9 maddenin hepsi dolduruldu              | ✅ yukarıdaki tablo                                                                                  |
| § Kararlar bağlayıcı; doküman çelişkisiz | ✅ K1–K17'ye karşı denetlendi; web'le çelişkiler §1.6'da açıkça; ROADMAP ve PROGRESS atıfları güncel |
| Ekonomi tablosu sayısal hedeflerle dolu  | ✅ §2.2 (24 kaynak), §2.3 (harcamalar), §2.4 (tavan ve eşikler), §2.5 (oyuncu tipi × hafta)          |
| Prettier                                 | ✅ `npm run lint`                                                                                    |
| Oyun kodu değişmedi                      | ✅ yalnızca `docs/`                                                                                  |

**QUALITY_BAR faz sonu kontrolü:** doküman fazı, ölçülecek satır yok. Tasarımın dayandığı satırlar:
A1–A2 (ilk açılış akışı), B3 (çevrimdışı modlar), §5 (efekt bütçesi, ışığa duyarlılık; kozmetik
kuralları), §6 (görsel tutarlılık; kozmetik okunurluğu).

### Bilinen sorunlar

- Bütün sayılar modelden; gerçek oyuncu verisi yok. Doğrulama 6.9 (ekonomi), 2.9 ve 7.6 (denge),
  11.3 ve 12.6 (elde tutma).
- TL fiyatları rakip analizindeki iki fiyat düzeyine göre seçildi; mağaza kademelerine uyarlanmadı
  (8.3).
- Yankı ve Sekme süperlerinin değerleri ölçülmedi; denge riski 7.6'da.
- Lig adları ve sezon temaları sanat yönü (1.3–1.4) seçilmeden yazıldı; değişebilir.
- Elde tutma ve FTUE yüzdeleri sektör deneyimine dayanan hedefler, ölçüm değil.
