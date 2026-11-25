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
  - [ ] 2.2 Ekran ve ölçekleme
  - [ ] 2.3 Dokunmatik kontroller v2
  - [ ] 2.4 Performans (rollback ≤ 4 ms dahil)
  - [ ] 2.5 Uygulama yaşam döngüsü
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
[archive/PROGRESS_MOBILE_1.md](archive/PROGRESS_MOBILE_1.md); 2.0 ve 2.1 →
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
— zamana bağlı öğeler dışında birebir aynı. Bütçe 16,7 ms/kare; artışların kaynağı ve çözüm önerileri
aşağıdaki 2.4 notunda.

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

## Sonraki fazlar için notlar

Faz 0.3'teki açık sorular Faz 0.4'te, 1.1'e bırakılanlar Faz 1.1'de (K13–K17) karara bağlandı;
değeri belirlenmemiş konular
[GAME_DESIGN_MOBILE.md § Hâlâ açık olanlar](GAME_DESIGN_MOBILE.md#hâlâ-açık-olanlar)'da. Kararlardan
sonra hâlâ görülen riskler:

- **2.3 — Yerel 2 oyuncu:** telefonda iki kişilik dokunmatik düzen prototiplenmeli; rahat değilse
  yalnızca gamepad ve tablet (GAME_DESIGN_MOBILE §7.7).
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
- **2.4 / 2.7 — Ölçüm sırası:** rollback ≤ 4 ms ölçümü, 2.7'de gelecek kendi
  `sin/cos/atan2/exp/pow` fonksiyonlarından önce yapılıyor; bunlar yavaşsa bütçe kayar. Öneri: ölçüm
  2.7 sonunda da tekrarlansın (şu an yalnızca 4.6 ve 12.3'te).
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
- **2.2 — Güvenli alan (2.1'den):** uygulamada sistem çubukları gizli, yatayda çentik kısa kenarda;
  16:9 tuval geniş telefonlarda letterbox içinde kalıyor, ama kenara sabitlenecek arayüz çentiği
  hesaba katmalı. Capacitor 8 `SystemBars` (`insetsHandling: 'css'`, varsayılan) WebView'a
  `--safe-area-inset-*` CSS değişkenlerini veriyor; Chromium ≥ 140'ta `env(safe-area-inset-*)` da
  doğru. targetSdk 36 → Android 15+'ta kenardan kenara çizim zorunlu.
- **2.5 — Yaşam döngüsü ve açılış (2.1'den):** arka planda maçı duraklatma ve sesi kesme
  `@capacitor/app` (`appStateChange`) ile. `MainActivity` odak dönüşünde çubukları zaten gizliyor.
  Açılış ekranını oyun hazır olana kadar tutmak için `@capacitor/splash-screen` (QUALITY_BAR A1/A2).
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
- **4.x — Geçici ikon ve açılış ekranı (2.1'den):** `android/app/src/main/res/mipmap-*` ve
  `drawable*/splash.png` kodla üretilmiş yer tutucu. Final ikon (ART_BIBLE §11.7, §13.2) ve açılış
  ekranı gelince: `npx capacitor-assets generate --android --assetPath <klasör>`, ASSET_LOG kaydı,
  `scripts/mobile/placeholderAssets.ts` silinir.
- **Capacitor 9 (2.1'den):** 9.0 RC şablonu AGP 9.4 + Gradle 9.8, minSdk 26, compileSdk 37. Geçişte
  Gradle 10 uyarıları da kapanır; `android/` şablon farkı elle birleştirilir (`MainActivity`, manifest,
  `styles.xml`, `colors.xml` özelleştirildi).
- **2.4 — Phaser 4 maliyetleri (Faz 2.0 ölçümü):** (1) Maçtaki 18 `Rectangle` şekli `FillRect` →
  `BatchHandlerTriFlat` yolundan çiziliyor: resimlerle arasında her geçiş toplu çizim boşaltması
  (kare başına ~7) ve üçgen başına geçici diziler; `__WHITE` dokulu tonlu resim ya da LiteGraphics'e
  çevrilirse çizim çağrısı Phaser 3 düzeyine (~14) iner. (2) Kap içinde karışım kipi her değiştiğinde
  Phaser 4 yeni bir `DrawingContext` kurup toplu çizimi boşaltıyor; stadyumdaki ADD parlamaları ve
  parçacıklar normal resimlerle iç içe — ADD nesneleri gruplanmalı. (3) Resim gönderim yolu
  (`SubmitterQuad`) Phaser 3'teki gibi kutulanan sayılar üretiyor (~5,6 MB/sn); 127 görünür resmin
  çoğu kalabalık — durağan katmanlar tek dokuya pişirilebilir ya da `SpriteGPULayer` denenebilir.
  (4) 1× koşularda tek seferlik ~23 ms kare: muhtemelen shader çeşidinin ilk kullanımda derlenmesi;
  yükleme ekranında ısıtma. (5) Canvas çiziciyi paketten çıkarmak için ikon dokuları
  (`src/ui/icons.ts`, `generateTexture`) doğrudan Canvas 2D ile çizilmeli; WebGL'siz yedek kararı da
  verilmeli (Android WebView'da WebGL var). (6) Ölçüm aracı hazır: `npm run bench`; değişiklik öncesi
  derlemeyi bir klasöre kopyalayıp `--dirs eski,dist` ile karşılaştır. Ölçüm sırasında makinede başka
  iş koşturma (bir koşu bu yüzden atıldı).
- **Phaser güncellemeleri:** `LiteGraphics` hızlı yolu `BatchHandlerQuad`'ın iç alanlarına, paket
  eklentisi `BatchHandler`'ın `Renderer` kullanımına dayanıyor. İkisi de korumalı (yedek yola
  düşüşte duman testi, `Renderer` kullanımı değişirse derleme kırılır); güncellemeden sonra
  `npm run bench` ile karşılaştır.
- **2.7 — Durum özeti:** tezgâhın determinizm bölümü `JSON.stringify(saveState())` özetini
  kullanıyor; bu kanonik değil (`-0` → `0`, `NaN` → `null`, alan sırası nesne kurulum sırasına bağlı).
  2.7'nin checksum'ı için alan sırası sabit, ikili (Float64) bir serileştirme gerekir; tezgâhtaki
  tarayıcı kancası (adım başına özet, gol tekrarı çelişki denetimi) çapraz motor testine örnek.
- **3.6 — Phaser 4 filtreleri:** parlama, bulanıklık, gölge vb. artık her nesne ve kamerada var,
  ama her filtre ayrı bir dokuya çizim geçişi; efekt bütçesine ve düşük seviye cihaz ölçümüne bağlı
  kullanılmalı. Özel derlemede filtre düğümleri zaten paketin içinde (`RenderNodeManager`).
