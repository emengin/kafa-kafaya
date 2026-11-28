# Değişiklik Günlüğü

Bu projedeki önemli değişiklikler bu dosyada belgelenir. Biçim
[Keep a Changelog](https://keepachangelog.com/tr-TR/1.1.0/) temellidir, sürümler
[Anlamsal Sürümleme](https://semver.org/lang/tr/)'ye uyar. Ayrıntılı geliştirme günlüğü, ölçümler ve
denge tabloları: [docs/archive/PROGRESS_WEB.md](docs/archive/PROGRESS_WEB.md).

## [Yayınlanmadı]

### Değişenler

- **Oyunun adı artık Kafadarlar** (eski adı Kafa Kafaya). Google Play'de aynı adlı başka bir futbol
  oyunu olduğu için değiştirildi. Yeni adres: https://emengin.github.io/kafadarlar/ (eski adres
  çalışmaz). Kayıtlar sıfırlanır: eski ayarlar, açılan karakterler ve istatistikler okunmaz.
- **Phaser 3.90 → Phaser 4.2.1** (mobil yol haritası Faz 2.0). Oyun davranışı ve görünüm aynı;
  tarayıcıda aynı tohumlu AI vs AI maçları adım adım birebir aynı durumu üretiyor. `LiteGraphics`
  çizicisi Phaser 4'ün render node mimarisine taşındı; özel Phaser derlemesi Phaser 4'e göre yeniden
  kuruldu. Ölçümler: [docs/PROGRESS.md](docs/PROGRESS.md).

### Eklenenler

- **Dokunmatik kontroller v2** (mobil yol haritası Faz 2.3): butonlar görselinden büyük bir alanı
  dinler (en az 72 dp), ◀'nin solu ve altı ekran kenarına kadar sol sayılır, parmak indiği grupta
  kalır (hareket parmağı kayınca yön kopmaz), Zıpla ile Şut arasına basmak ikisini birden basar.
  Küçük ekranda (iPhone Safari) varsayılan butonlar otomatik büyür. Ayarlar → Kontroller: kontrol düzenleyicisi (konum,
  boyut, opaklık, solak modu), titreşim, giriş gecikmesi ölçer. Basışta halka ve hafif titreşim.
  Yerel 2 oyuncuda dokunmatik prototip (ekranın her yarısı bir oyuncunun).
- `npm run bench`: üretim derlemelerini yan yana ölçen tezgâh (paket boyutu, açılış süresi, kare
  işi, tarayıcıda determinizm, ekran görüntüleri).
- **Determinizm sertleştirme, 1. bölüm** (mobil yol haritası Faz 2.7a): fizik ve yapay zekâ,
  sonucu tarayıcı motoruna göre değişebilen `Math.sin/cos/atan2/exp/pow/hypot` yerine kendi
  deterministik fonksiyonlarını kullanıyor (online maç ve tekrarlar için); simülasyon kodunda bu
  işlevleri yasaklayan lint kuralı; kanonik durum özeti (`GameSim.checksum`). Oyun hissi aynı
  (ölçülen 365 değerin 364'ü bit düzeyinde aynı). `npm run feel`: fizik hissi ölçümü ve iki sürümün
  karşılaştırması.
- **Determinizm sertleştirme, 2. bölüm** (mobil yol haritası Faz 2.7b): hit-stop ve gol sonrası
  ağır çekim artık yalnızca görüntüde; simülasyon her zaman saniyede 60 adım ilerler, gol sonrası
  duraklama 120 adımlık bir oyun durumu. Hit-stop sırasında basılan tuş artık beklemiyor. Çapraz motor
  testi: 5 kayıtlı maç (10 karakter, 10 süper, goller) Node, Chromium ve WebKit'te her adımda aynı
  durumu üretmeli; CI'da her değişiklikte koşar (`npm run test:determinism`).
- **Çökme raporu ve oyun istatistikleri, rızayla** (mobil yol haritası Faz 2.8; yalnızca Android
  uygulaması): ilk açılışta "Oyunu geliştirmemize yardım et" sorusu; Ayarlar → Gizlilik'ten iki ayrı
  anahtarla her an geri alınır. İzin verilirse çökmeler, JS hataları ve WebView çizici süreç kaybı
  Firebase Crashlytics'e, maç başı/sonu olayları Firebase Analytics'e gider. Reklam kimliği, kesin
  konum ve kişisel bilgi toplanmaz; izin yokken hiçbir veri gönderilmez. Web sürümünde Firebase yok
  (`npm run check:web`).

## [1.0.0] — 2026-11-19

İlk kararlı sürüm: tüm modlar, platformlar ve cila tamam. ▶ https://emengin.github.io/kafadarlar/

### Eklenenler

- **Gol tekrarı:** fizik durumunun son saniyeleri halka tamponda (anahtar kareler + girdiler)
  tutulur; golden sonra deterministik tekrar, ağır çekim (golün çevresinde daha yavaş), topu izleyen
  yakın plan kamera, sinema şeritleri, "Atla" (Enter / Space / A / dokunmatik). Ayarlar'dan
  kapatılabilir.
- **Erişilebilirlik:** renk körü modu (Okabe–Ito turuncu/mavi oyuncu renkleri, oyuncunun altında
  kimlik halkası, etiketlerde ▲/● şekilleri) ve efekt yoğunluğu ayarı (Düşük / Orta / Yüksek:
  parçacık sayısı, ekran parlamaları, gol yakınlaşması).
- **Playwright duman testi** (oyun açılıyor, maç başlıyor, 10 sn hatasız çalışıyor) — CI'da her
  push'ta.
- **Otomatik ekran görüntüleri** (`npm run screenshots`) ve yeniden yazılan README (tanıtım, canlı
  oyna bağlantısı, kontroller, mimari, katkı rehberi).
- `v*` etiketinde GitHub Release'i bu dosyadan oluşturan iş akışı.
- `GameSim.saveState` / `loadState`: simülasyonun tam durumunu kaydetme/geri yükleme.

### Değişenler

- **Denge turu** (4 tur × 3600 AI vs AI maç): Buz donması 1,5 → 1,1 sn ve etki süresi 0,8 sn;
  Işınlanma çıkış hızı ×0,68; Kasırga itmesi 520 → 400 px/sn; Dev Top hızı ×1,12; Mıknatıs 1,6 sn ve
  1800 px/sn²; Sarsıntı zıplama kilidi 0,8 sn, zemin sekmesi 0,78. Karakterlerin kazanma oranı
  %47–57 (önce %47–58), en dengesiz eşleşme %71 (önce %80).
- **Performans:** her karede çizilen şekiller çöp üretmeyen `LiteGraphics` ile (doğrudan üçgen
  komutları, kendi WebGL köşe tamponu çizicisi); simülasyonda adım başına bellek ayırma kaldırıldı.
  6× CPU yavaşlatmada küçük GC sayısı 93 → 39, GC süresi %58 az, kare işi ort. 4,27 → 3,72 ms.
- **Paket boyutu:** yalnızca kullanılan modülleri içeren özel Phaser derlemesi ve motorun ayrı
  parçaya bölünmesi (kod bölme): 1500 kB → 950 kB, gzip 423 → 277 kB.
- Ayarlar menüsü: gol tekrarı, efekt yoğunluğu ve renk körü modu eklendi (12 öğe).

### Düzeltilenler

- Menüde çok hızlı art arda basışta (iki karede iki Enter) yardım panelinin iki kez açılması.
- Kenar durumları testlerle güvenceye alındı: aynı adımda/kutlamada ikinci gol, gol kutlaması ve
  tekrar sırasında duraklatma, sekme gizlenince saat, dev kare sonrası "yetişme", pencere yeniden
  boyutlanması, rastgele hızlı tuş yağmuru.

## [0.6.0] — 2026-11-18 — Faz 6: Modlar, menüler ve platform desteği

### Eklenenler

- Arka planında AI vs AI demo maçı oynanan ana menü; Hızlı Maç, 2 Oyuncu, Turnuva, Antrenman,
  Ayarlar, Nasıl Oynanır.
- Karakter seçiminde gerçek simülasyondan süper şut önizlemesi ve kilitli karakterler.
- 8 kişilik turnuva (giderek zorlaşan yapay zekâ, eleme ağacı, kupa ekranı, karakter kilidi açma).
- Antrenman (süresiz, rakipsiz/kukla, top sıfırlama, süper barı doldurma).
- Dokunmatik butonlar (çoklu dokunuş), dikey ekran uyarısı, tam ekran; Gamepad API (2 kol).
- `localStorage` kaydı (ayarlar, açılan karakterler, istatistikler, turnuva) alan alan doğrulamayla.
- PWA: manifest, kodla çizilen simgeler, çevrimdışı service worker.

## [0.5.0] — 2026-11-15 — Faz 5: Görsel kalite ve ses

### Eklenenler

- Kodla çizilen karakterler (canlı yüz ifadeleri), animasyonlu stadyum ve kalabalık, kale ağı
  dalgalanması, nesne havuzlu parçacıklar, hit-stop, sarsıntı, gol zoom'u.
- Web Audio ile sentezlenen efektler, kalabalık ve prosedürel müzik; ses ayarları.
- Uyarlamalı görsel kalite.

## [0.4.0] — 2026-11-14 — Faz 4: Karakterler, süper şutlar ve güçlendiriciler

### Eklenenler

- 10 özgün karakter (istatistikler, renkler), 10 süper şut tipi, 6 güçlendirici balon.
- Karakter seçim ekranı; yapay zekânın karakter, süper ve güçlendirici farkındalığı; denge taraması.

## [0.3.0] — 2026-11-14 — Faz 3: Yapay zekâ

### Eklenenler

- Yörüngeyi gerçek fizikle tahmin eden, Kolay / Orta / Zor yapay zekâ; güç barı ve süper vuruş.
- `npm run simulate` (AI vs AI headless maçlar, sıkışma gözlemcisi).

## [0.2.0] — 2026-11-14 — Faz 2: Maç kuralları

### Eklenenler

- Maç durum makinesi: süre, gol, ağır çekim, santra, altın gol, duraklatma, maç sonu; HUD.

## [0.1.0] — 2026-11-14 — Faz 1: Çekirdek fizik

### Eklenenler

- Deterministik fizik modülü (sabit 60 Hz, alt adımlar, tünelleme yok), saha, oyuncu, şut ve kafa
  vuruşu; gri kutu 2 oyunculu maç.

## [0.0.1] — 2026-11-14 — Faz 0: Kurulum

### Eklenenler

- Vite + TypeScript + Phaser projesi, sabit adımlı döngü, girdi soyutlaması, i18n, CI ve GitHub
  Pages yayını.

[1.0.0]: https://github.com/emengin/kafadarlar/releases/tag/v1.0.0
[0.6.0]: https://github.com/emengin/kafadarlar/commit/c882234
[0.5.0]: https://github.com/emengin/kafadarlar/commit/c29dafb
[0.4.0]: https://github.com/emengin/kafadarlar/commit/37bae49
[0.3.0]: https://github.com/emengin/kafadarlar/commit/6ef8312
[0.2.0]: https://github.com/emengin/kafadarlar/commit/3bed9d1
[0.1.0]: https://github.com/emengin/kafadarlar/commit/f77c026
[0.0.1]: https://github.com/emengin/kafadarlar/commit/bc6327a
