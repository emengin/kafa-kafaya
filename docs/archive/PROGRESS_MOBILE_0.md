# Mobil Bölüm 0 — Hazırlık: faz kayıtları

PROGRESS.md'den taşınan biten faz ayrıntıları. Özet ve onay kutuları: [PROGRESS.md](../PROGRESS.md).

## Faz 0.3 — Proje yapısı ve dokümanlar (2026-11-20)

### Tamamlananlar

- **Doküman iskeletleri:** `docs/GAME_DESIGN_MOBILE.md` (Faz 1.1'in 9 başlığı + "Açık sorular"),
  `docs/DATA_MAP.md` (sütunlar, web sürümünün mevcut verileri, yurt dışı aktarım tablosu),
  `docs/QUALITY_BAR.md` (v1), `docs/ASSET_LOG.md` (doğrulama script'i için biçim kuralları, araç ve
  abonelik kaydı), `docs/ART_BIBLE.md` (boş, Faz 1.4), `docs/OPS.md` (web yayını ve sürüm adımları
  dolu, diğer bölümler iskelet).
- **QUALITY_BAR v1:** referans cihaz sınıfı; 60 FPS'in ölçülebilir tanımı (karelerin ≥ %99'u ≤ 16,7
  ms, p99 ≤ 20 ms, 50 ms üstü kare yok), ısınma, pil, bellek; soğuk açılış (ilk görüntü ≤ 1 sn,
  etkileşim ≤ 3 sn); çökmesiz kullanıcı ≥ %99,5 ve Google Play vitals eşikleri (çökme %1,09, ANR
  %0,47); 48 dp dokunma alanı; ekran geçiş süreleri; görsel tutarlılık kontrol listesi; boyut ve ağ.
- **PROGRESS.md küçültüldü:** eski içerik (130 KB) olduğu gibi `docs/archive/PROGRESS_WEB.md`'ye
  taşındı (`git mv`, içerik aynı); yeni PROGRESS.md'de 40 satırı aşmayan web özeti, 80 fazlık mobil
  onay kutusu listesi (kalite kapıları işaretli) ve "Sonraki fazlar için notlar".
- **ROADMAP_MOBILE.md:** "Çalışma şekli"ne PROGRESS.md'yi kısa tutma kuralı eklendi. Dosya Prettier
  denetiminden geçmiyordu (CI'daki `npm run lint` Markdown'ı da denetler); biçimlendirildi. "Bitti
  kriteri:" satırları boş satırla ayrıldı: önceden son liste maddesinin içine karışıyordu. Metin
  değişmedi.
- **Bağlantılar:** README, CHANGELOG ve GAME_DESIGN.md'deki "PROGRESS.md Faz N" göndermeleri
  arşive yönlendirildi.

### Kararlar

1. **Arşiv adlandırması:** web sürümü `archive/PROGRESS_WEB.md`; mobil fazlar bölüm başına
   `archive/PROGRESS_MOBILE_<bölüm>.md`. PROGRESS.md'de her biten fazın satırı arşiv dosyasına
   bağlanır.
2. **Çelişkiler kod yazmadan önce yazıya döküldü:** yol haritasındaki riskler GAME_DESIGN_MOBILE.md
   § Açık sorular'a (ayrıntılı) ve PROGRESS.md § Sonraki fazlar için notlar'a (tek satır) yazıldı.
   Karar Faz 1.1'de.
3. **QUALITY_BAR hedefleri ölçülebilir yazıldı:** "sabit 60 FPS" kare süresi yüzdelikleriyle
   tanımlandı; ölçülmemiş hedefler "—" ile işaretli, Faz 2.4'te doldurulacak.
4. **ASSET_LOG biçimi şimdiden sıkı:** bir satır bir dosya, yol ters tırnakta, ticari kullanım
   `Evet`/`Hayır`. Faz 3.1'in script'i tabloyu ayrıştırırken tahmin yürütmek zorunda kalmaz.
5. **Kodla üretilen placeholder'lar ASSET_LOG'a girmez** (dosya değiller); manifestte `placeholder`
   olarak işaretlenecekler.

### Bitti kriterleri

| Kriter                                          | Durum                                                         |
| ----------------------------------------------- | ------------------------------------------------------------- |
| Dokümanlar repoda (6 iskelet + QUALITY_BAR v1)  | ✅                                                            |
| PROGRESS.md'de "Mobil yol haritası" faz listesi | ✅ 80 faz, 13 bölüm                                           |
| Web sürümü yayında, testler bozulmadı           | ✅ lint + 319 birim testi + build + duman testi yerelde yeşil |

### Bilinen sorunlar

- Referans test cihazı henüz yok (Faz 0.1); QUALITY_BAR hedefleri ölçülmedi.
- 0.1 ve 0.2 [SEN] fazlarının durumu bilinmiyor; onay kutuları işaretsiz bırakıldı.

## Faz 0.4 — Kararlar ve yol haritası revizyonu (2026-11-20)

### Tamamlananlar

- **GAME_DESIGN_MOBILE.md:** "Açık sorular" → "Kararlar" (K1–K12: 8 eski soru + 4 yeni karar) ve
  "Hâlâ açık olanlar" tablosu (değeri ya da kapsamı belirlenmemiş 8 konu, karar verilecek fazlarıyla).
  §2, §7 ve §9'daki yönlendirme yorumları yeni ilkelere göre güncellendi; §9'un başlığı "Güç
  satılmaz, çeşitlilik satılır" oldu.
- **ROADMAP_MOBILE.md:** Teknik kararlar (determinizm kuralları, maç doğrulama, tek Türkiye bölgesi,
  uzaktan ayar ve A/B için tek kaynak Nakama, Firebase yalnızca Analytics + Crashlytics, metin
  çizimi), para kazanma ilkesi ("güç satılmaz, çeşitlilik satılır", tek oyunculu ödül kuralları) ve
  gizlilik ilkeleri (oyuncu adları) yeniden yazıldı. Bağımlılık notları eklendi.
- **Yeni fazlar:** 0.4, 2.0 Phaser 4'e geçiş, 2.7 Determinizm sertleştirme, 2.8 Gözlemlenebilirlik
  temeli, 2.9 His ve denge yeniden ayarı, Bölüm 13 (13.1 CJK + Arapça, 13.2 opsiyonel sunucu
  yeniden simülasyonu). Toplam 87 faz, 14 bölüm (önce 80 / 13).
- **Yeniden numaralandırma:** eski 10.1–10.2 → 8.1–8.2; eski 8.1–8.6 → 8.3–8.8; eski 10.3–10.6 →
  10.1–10.4. Bölüm 8'in adı "Gizlilik temeli ve para kazanma" oldu.
- **Faz içerikleri:** 1.1 (kadro, açılma süresi, tek oyunculu tavanlar), 1.6 (font kapsaması), 2.4
  (rollback ≤ 4 ms, sentetik stres sahnesi), 3.4 (ön koşul, canvas metni), 3.6 (sunum katmanı), 4.2,
  4.6, 5.2 (oyuncu adları), 5.3 (tek oyunculu ödül RPC'si, çevrimdışı kuyruk), 5.4, 5.5 (barındırma
  kararı), 6.1, 6.6, 6.8, 7.1 (8 yeniden çizim + 2 yeni), 7.6 (%45–55 bandı), 8.x, 9.2–9.4, 10.x,
  11.3, 11.4 (moderasyon kuyruğu), 11.6 (10 dil), 12.3, Ek A, Ek B.
- **Atıflar:** DATA_MAP, OPS ve QUALITY_BAR'daki faz numaraları yeni sıraya çekildi. QUALITY_BAR'a
  P9 (rollback maliyeti) ve K6 (motorlar arası determinizm) eklendi; görsel kontrol listesindeki
  font maddesi Latin genişletilmiş ve Kiril'i kapsıyor.

### Kararlar (Claude Code'un verdiği, kullanıcı kararlarına ek)

1. **Denge işi için Faz 2.9 açıldı.** "Fizik hissi ve denge 2.7'den sonra yeniden ayarlanır" ve
   "Ayaz banda çekilecek" kararları takip edilebilsin diye ayrı faz; 7.6'yı beklemez.
2. **Zaman efektlerinin sunum katmanına taşınması 2.7'ye kondu.** Web sürümünde hit-stop döngü
   süresini kesiyor; mimari değişiklik determinizm fazının işi. 3.6 bunun üstüne kurulur.
3. **CJK/Arapça ve opsiyonel sunucu yeniden simülasyonu için Bölüm 13 (Lansman sonrası)** açıldı;
   Bölüm 11'e konsalar yayından önce yapılacak gibi görünürlerdi.
4. **DATA_MAP'in "son hâli" 8.1'den 10.2'ye kaydı:** 8.1 artık Bölüm 9 ve 11'den önce geliyor; 8.1'de
   toplu gözden geçirme, 10.2'de yasal metinlerden önce son kontrol.
5. **`**` operatörü `pow` ile birlikte yasak listesinde:** aynı işlemdir ve sonucu motora bırakılmıştır.
6. **Ad filtresi sunucuda uygulanır** (istemciye güvenilmez ilkesi).

### Bitti kriterleri

| Kriter                                                  | Durum                                          |
| ------------------------------------------------------- | ---------------------------------------------- |
| Açık sorular karara bağlandı ya da açıkça listelendi    | ✅ K1–K12 + "Hâlâ açık olanlar"                |
| Yol haritası, GAME_DESIGN_MOBILE ve PROGRESS çelişkisiz | ✅ faz atıfları DATA_MAP/OPS/QUALITY_BAR dahil |
| Prettier denetimi                                       | ✅ `npm run lint`                              |
| Oyun kodu değişmedi                                     | ✅ yalnızca `docs/`                            |

### Bilinen sorunlar

- Kalan riskler PROGRESS.md § Sonraki fazlar için notlar'da (14 madde).
