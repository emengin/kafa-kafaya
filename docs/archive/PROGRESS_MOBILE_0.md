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
