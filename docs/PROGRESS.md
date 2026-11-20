# İlerleme Günlüğü

> Kısa tutulur: burada yalnızca özet ve onay kutuları var. Biten fazların ayrıntıları
> [docs/archive/](archive/) altında: web sürümü (Faz 0–7) → [PROGRESS_WEB.md](archive/PROGRESS_WEB.md),
> mobil Bölüm 0 → [PROGRESS_MOBILE_0.md](archive/PROGRESS_MOBILE_0.md).

## Web sürümü v1.0.0 — özet

Canlı: https://emengin.github.io/kafa-kafaya/ · ölçümler, denge tabloları, faz kararları: arşivde.

**Mimari**

- Vite + TypeScript (strict) + Phaser 3.90; mantıksal 1280×720, FIT + letterbox.
- `src/physics`: Phaser'dan bağımsız deterministik fizik (60 Hz sabit adım, sub-stepping, render
  enterpolasyonu). `GameSim` yalnızca `InputState` dizisiyle ilerler; ses/efekt olayları durumu
  değiştirmez; `saveState`/`loadState` tam durum kopyası (gol tekrarı bunun üstünde).
- Girdi: klavye, gamepad, dokunmatik → sanal tuş (`src/input/virtualKeys.ts`) → `InputState`; AI ve
  tekrar oynatıcı da aynı arayüzü üretir.
- AI (`src/game/ai`): fizikle ileri simülasyonla tahmin, 3 zorluk, tohumlu rastgelelik, hile yok.
- Harici dosya yok: dokular Canvas 2D ile kodla, sesler Web Audio sentezi. `LiteGraphics` + kendi
  köşe tamponu çizicisi, havuzlu parçacıklar, 3 kademeli uyarlamalı kalite.
- Tüm denge/ayar değerleri `src/config/gameConfig.ts`; sihirli sayı lint ile yasak.
- Kayıt: `localStorage`, anahtar başına alan alan doğrulama (`src/save`). PWA: kodla SW + manifest.
- Kalite hattı: ESLint + Prettier (Markdown dahil) + Vitest (319 test) + Playwright duman testi.
  `main`'e push → GitHub Pages (`deploy.yml`); `v*` etiketi → GitHub Release (`release.yml`).
- Üretimde özel Phaser paketi (`scripts/phaser`: BitmapText, ses yöneticisi, Phaser parçacıkları
  yok) + kod bölme: gzip 277 kB.

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
[GAME_DESIGN_MOBILE.md § Kararlar](GAME_DESIGN_MOBILE.md#kararlar-faz-04-2026-11-20).

**Bağımlılıklar:** Bölüm 2, Bölüm 1 ile paralel ilerleyebilir · 3.4, 1.4 ve 1.6 bitmeden başlamaz ·
2.9, 2.7'den sonra · 8.3–8.8, 8.1–8.2'den sonra.

- **Bölüm 0 — Hazırlık**
  - [ ] 0.1 Hesaplar ve araç seti [SEN]
  - [ ] 0.2 Şirket, vergi, marka [SEN + PRO]
  - [x] 0.3 Proje yapısı ve dokümanlar [CC] — 2026-11-20
  - [x] 0.4 Kararlar ve yol haritası revizyonu [CC] — 2026-11-20
- **Bölüm 1 — Tasarım ve sanat yönü**
  - [ ] 1.1 Mobil oyun tasarım dokümanı [CC]
  - [x] 1.2 Rakip analizi [SEN + SOHBET] — 2026-11-20 →
        [COMPETITOR_ANALYSIS.md](COMPETITOR_ANALYSIS.md)
  - [ ] 1.3 Stil testleri [SEN]
  - [ ] 1.4 Sanat rehberi [SOHBET]
  - [ ] 1.5 Üretim hattı provası [SEN] — kalite kapısı: sanat yönü
  - [ ] 1.6 Arayüz tasarım sistemi [SEN + SOHBET]
- **Bölüm 2 — Mobil temel [CC]** (Bölüm 1 ile paralel)
  - [ ] 2.0 Phaser 4'e geçiş
  - [ ] 2.1 Capacitor ve Android derleme
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

0.3 ve 0.4 ayrıntıları: [archive/PROGRESS_MOBILE_0.md](archive/PROGRESS_MOBILE_0.md). 0.1 ve 0.2
[SEN] fazları; yapıldıysa kutuları sen işaretle.

## Sonraki fazlar için notlar

Faz 0.3'teki açık sorular Faz 0.4'te karara bağlandı; değeri belirlenmemiş konular
[GAME_DESIGN_MOBILE.md § Hâlâ açık olanlar](GAME_DESIGN_MOBILE.md#hâlâ-açık-olanlar)'da. Kararlardan
sonra hâlâ görülen riskler:

- **1.1 — Dolaylı Elmas:** görev, başarım, seviye ödülü ya da Sezon Kartı ücretsiz yolu Elmas veriyor
  ve tek oyunculu maçlar bunları ilerletiyorsa Elmas dolaylı yoldan tek oyunculudan gelir (K3).
  Elmas veren ilerlemenin hangi modlardan sayılacağı 1.1'de netleşmeli.
- **1.1 / 2.9 — Eşleşme dengesi:** %45–55 bandı genel kazanma oranını sınırlar, Bora–Toprak %71 gibi
  karşı eşleşmeleri değil. Sıralamalıda karakter rakip görülerek seçiliyorsa sorun büyür; eşleşme
  eşiği ve seçim sırası 1.1'de.
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
  kaçma cezası (9.6) uygulanmalı.
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
- **2.1:** Capacitor derlemesinde service worker kaydı kapatılmalı; `base` yolu `/` olmalı (web
  `/kafa-kafaya/`); web ve yerel derleme için platform bayrağı (`src/platform`).
