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
- Determinizm JS motorları arasında garanti değil (`Math.sin/cos/exp` sonuçları motora göre değişir).
- Telefonda yazılar küçük (~0,54 ölçek); tek telefonda dokunmatikle 2 oyuncu yok.
- iOS Safari'de tam ekran yok; yalnızca gamepad'le ses başlamıyor (autoplay kuralı).
- Denge AI vs AI vekil ölçümüne dayanıyor: Ayaz %57, en dengesiz eşleşme Bora–Toprak %71.
- Turnuvadan duraklatıp çıkınca maç sayılmıyor; SW güncellemesi bir sonraki açılışta gelir.

## Mobil yol haritası

Kaynak: [ROADMAP_MOBILE.md](ROADMAP_MOBILE.md). [CC] Claude Code · [SOHBET] claude.ai · [SEN]
geliştirici · [PRO] avukat / mali müşavir.

- **Bölüm 0 — Hazırlık**
  - [ ] 0.1 Hesaplar ve araç seti [SEN]
  - [ ] 0.2 Şirket, vergi, marka [SEN + PRO]
  - [x] 0.3 Proje yapısı ve dokümanlar [CC] — 2026-11-20
- **Bölüm 1 — Tasarım ve sanat yönü**
  - [ ] 1.1 Mobil oyun tasarım dokümanı [CC]
  - [ ] 1.2 Rakip analizi [SEN + SOHBET]
  - [ ] 1.3 Stil testleri [SEN]
  - [ ] 1.4 Sanat rehberi [SOHBET]
  - [ ] 1.5 Üretim hattı provası [SEN] — kalite kapısı: sanat yönü
  - [ ] 1.6 Arayüz tasarım sistemi [SEN + SOHBET]
- **Bölüm 2 — Mobil temel [CC]**
  - [ ] 2.1 Capacitor ve Android derleme
  - [ ] 2.2 Ekran ve ölçekleme
  - [ ] 2.3 Dokunmatik kontroller v2
  - [ ] 2.4 Performans
  - [ ] 2.5 Uygulama yaşam döngüsü
  - [ ] 2.6 Sürekli derleme hattı
- **Bölüm 3 — Görsel ve ses altyapısı [CC]**
  - [ ] 3.1 Asset manifest ve placeholder sistemi
  - [ ] 3.2 Parçalı animasyon sistemi
  - [ ] 3.3 Kozmetik katman sistemi
  - [ ] 3.4 Tasarım sistemi ve bileşen kütüphanesi
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
  - [ ] 5.2 Hesaplar ve bulut kaydı
  - [ ] 5.3 Cüzdan ve envanter
  - [ ] 5.4 Uzaktan ayar, sürüm kontrolü, bakım modu
  - [ ] 5.5 Canlı sunucu
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
  - [ ] 7.1 Karakterler 3–12
  - [ ] 7.2 Stadyumlar 2–4
  - [ ] 7.3 Kozmetik paketi v1
  - [ ] 7.4 Spiker ve kalabalık tam set
  - [ ] 7.5 Müzik seti
  - [ ] 7.6 İçerik partisi entegrasyonu [CC] (her partide tekrarlanır)
- **Bölüm 8 — Para kazanma [CC]**
  - [ ] 8.1 RevenueCat ve ürün kataloğu
  - [ ] 8.2 Sunucu taraflı doğrulama
  - [ ] 8.3 Satın alma deneyimi ve yasal bilgilendirme
  - [ ] 8.4 Teklifler
  - [ ] 8.5 Ödüllü reklamlar
  - [ ] 8.6 Geçiş reklamı ve reklam rızası
- **Bölüm 9 — Online PvP [CC]**
  - [ ] 9.1 Ağ katmanı prototipi
  - [ ] 9.2 Rollback netcode
  - [ ] 9.3 Sunucuda maç yönetimi
  - [ ] 9.4 Eşleştirme
  - [ ] 9.5 Sıralamalı lig
  - [ ] 9.6 Sosyal ve dayanıklılık
- **Bölüm 10 — Gizlilik ve yasal uyum**
  - [ ] 10.1 Veri haritası ve ilk açılış [CC]
  - [ ] 10.2 Rıza yönetimi [CC]
  - [ ] 10.3 Gizlilik Merkezi [CC]
  - [ ] 10.4 Yasal metin taslakları [CC]
  - [ ] 10.5 Avukat incelemesi [PRO] — kalite kapısı: yasal hazır (Ek A)
  - [ ] 10.6 Mağaza formları ve yayın [CC]
- **Bölüm 11 — Canlı operasyon [CC]**
  - [ ] 11.1 Etkinlik sistemi
  - [ ] 11.2 Bildirimler
  - [ ] 11.3 Analiz ve A/B testi
  - [ ] 11.4 Yönetim paneli
  - [ ] 11.5 Destek ve SSS
  - [ ] 11.6 Yerelleştirme
- **Bölüm 12 — Yayın**
  - [ ] 12.1 Android sürüm hattı [CC]
  - [ ] 12.2 iOS [CC]
  - [ ] 12.3 Kalite güvence turu [CC + SEN] — kalite kapısı: teknik hazır
  - [ ] 12.4 Mağaza sayfası [CC + SEN]
  - [ ] 12.5 Kapalı test [SEN]
  - [ ] 12.6 Test lansmanı [SEN + CC] — kalite kapısı: pazar hazır
  - [ ] 12.7 Global lansman [SEN + CC]

0.3 ayrıntıları: [archive/PROGRESS_MOBILE_0.md](archive/PROGRESS_MOBILE_0.md). 0.1 ve 0.2 [SEN]
fazları; yapıldıysa kutuları sen işaretle.

## Sonraki fazlar için notlar

Faz 0.3'te yol haritası okunurken görülen riskler. Ayrıntı ve öneriler:
[GAME_DESIGN_MOBILE.md](GAME_DESIGN_MOBILE.md) § Açık sorular.

- **1.1:** Karakter istatistikleri farklı (Hız/Zıplama/Şut/Kafa) ama ilke "online'da istatistikler
  eşit" diyor; karakter satın alınabiliyorsa bu bir çelişki. 1.1'de karara bağlanmalı.
- **1.1:** "12 karakter" (1.3, 7.1) mevcut 10 karakteri mi kapsıyor, 2 yeni karakter ve süper mi?
- **1.1 / 5.3:** Tek oyunculu maç ödülleri istemcide hesaplanıyor; "istemciye güvenilmez" ilkesiyle
  nasıl uzlaşacağı (ödül tavanı ya da sunucuda tekrar doğrulama) ve çevrimdışı oyun kararı gerekli.
- **2.x, 9.x'ten önce:** Android (V8) ile iOS (JavaScriptCore) arasında ve sunucuda (Nakama JS
  çalışma zamanı) bit düzeyinde aynı sonuç için kendi `sin/cos/exp` ya da sabit noktalı matematik
  gerekir. Fizik değişirse denge ve his yeniden ayarlanır; içerik ayarından önce yapılmalı. Motorlar
  arası determinizm testi CI'da Playwright WebKit ile koşturulabilir.
- **Sıralama:** rıza altyapısı (10.2) reklamdan (8.5–8.6) sonra geliyor; Crashlytics hiçbir fazda
  yok ama QUALITY_BAR'ın çökme hedefi ona bağlı; 6.8'in analiz olayları analizden (11.3) önce geliyor.
- **Uzaktan ayar iki yerde:** Firebase Remote Config ve Nakama (5.4); tek kaynak seçilmeli.
- **2.1:** Capacitor derlemesinde service worker kaydı kapatılmalı; `base` yolu `/` olmalı (web
  `/kafa-kafaya/`); web ve yerel derleme için platform bayrağı (`src/platform`).
- **3.4 / 11.6:** Bitmap font atlası 10 dilde (Kiril, CJK, Arapça) ölçeklenmez; özel Phaser paketi
  BitmapText içermiyor. Gömülü web fontu + canvas metni değerlendirilmeli.
- **5.x / 9.x:** Tek bölgeli (Türkiye) sunucu üzerinden girdi aktarımı uzak oyuncuların gecikmesini
  ikiye katlar; global lansman için bölgesel aktarım ya da eşler arası bağlantı gerekebilir.
- **9.6 / 10.x:** Oyuncu adları serbest metin; serbest sohbet yasağına rağmen ad filtresi ve
  raporlama gerekir (liderlik tabloları, çocuk güvenliği).
