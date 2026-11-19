# Kafa Kafaya — Mobil Yol Haritası (Tek Kişilik Geliştirme)

Bu dosya, "Kafa Kafaya"nın web sürümünden Google Play ve App Store'da yayınlanan, reklam ve oyun içi satın almayla gelir elde eden, üst seviye kalitede bir mobil oyuna dönüşmesinin tam yol haritasıdır. Tek kişi tarafından; Claude Code, yapay zekâ araçları, hazır kütüphaneler ve lisanslı kaynaklarla geliştirilecek. Çıkış süresi öncelik değildir; öncelik kalitedir.

---

## Bu dosya nasıl kullanılır?

Her fazın başında bir etiket var:

| Etiket       | Anlamı                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **[CC]**     | Claude Code yapar. Yeni sohbet açılır ve şu yazılır: `docs/ROADMAP_MOBILE.md ve docs/PROGRESS.md'yi oku. Faz X.Y'yi yap.` |
| **[SOHBET]** | Normal Claude sohbetinde (claude.ai) yapılır. Prompt fazın içinde verilmiştir.                                            |
| **[SEN]**    | Sen yaparsın: yapay zekâ araçları, çizim/ses programları, hesap işlemleri.                                                |
| **[PRO]**    | Yapay zekâyla değiştirilmemesi gereken profesyonel işler (avukat, mali müşavir).                                          |

Model ayarı: **(Y)** = Yüksek, **(EY)** = Ekstra yüksek, **(EY, gerekirse Fable)** = Ekstra yüksekle başlanır; faz takılırsa Fable modeliyle sürdürülür.

Bazı bölümler paralel yürür: Claude Code sunucu veya meta oyun fazlarındayken sen Bölüm 7'deki içerik üretimine devam edebilirsin.

**Bağımlılıklar:**

- Bölüm 2'nin fazları, senin yürüttüğün Bölüm 1 ile paralel ilerleyebilir.
- Faz 3.4, Faz 1.4 (sanat rehberi) ve 1.6 (arayüz tasarım sistemi) bitmeden başlamaz.
- Faz 2.9 (his ve denge), Faz 2.7'den (determinizm) sonra yapılır; içerik dengesi (7.6) bu ayarın üstüne kurulur.
- Bölüm 8'deki satın alma ve reklam fazları (8.3–8.8), veri haritası ve rıza yönetimi (8.1–8.2) bitmeden başlamaz.

---

## Çalışma kuralları (Claude Code her fazda bunlara uyar)

### Kapsam

- Sadece istenen fazı yap. Sonraki fazlara geçme; fikirlerini PROGRESS.md'deki "Sonraki fazlar için notlar" bölümüne yaz.
- Faz büyükse kendin alt adımlara böl. Uzun, tek seferlik düşünme yerine küçük adımlarla ilerle.
- [SEN] veya [PRO] etiketli fazları yapma; gerekiyorsa bu fazlar için hazırlık dokümanı veya kontrol listesi üret.

### Kalite hedefi

- Oyun asla "yapay zekâ işi" veya "amatör işi" görünmemeli. Ölçüt: "Bu ekran görüntüsü Play Store'daki en iyi 10 spor oyununun yanında sırıtır mı?"
- Tüm görseller docs/ART_BIBLE.md'ye, tüm arayüz tasarım sistemi token'larına uyar. Hazır bileşen görünümü yoktur.
- Kodla çizilmiş geçici görseller placeholder olarak işaretlenir ve asset manifest üzerinden kod değişmeden final görselle değiştirilebilir.
- Her etkileşimin karşılığı olur: basma animasyonu, ses, titreşim.
- Efekt bütçesi vardır: aynı anda ekranda olan efekt sayısı sınırlıdır; her şey parlarsa hiçbir şey öne çıkmaz.
- docs/QUALITY_BAR.md'deki kriterler her fazın bitti kriterinin parçasıdır.

### Teknik kararlar

- TypeScript + Phaser kod tabanı korunur; Faz 2.0'da Phaser 4'e geçilir. Capacitor ile Android ve iOS'a paketlenir. Önce Android, sonra iOS.
- **Determinizm** (online PvP'de rollback netcode için şart; uygulama Faz 2.7):
  - Fizik simülasyonu yalnızca `+`, `-`, `*`, `/`, `Math.sqrt`, `Math.abs/min/max/floor/round` ve tam sayı işlemlerini kullanır. `sin`, `cos`, `atan2`, `exp`, `pow` (ve aynı işi yapan `**` operatörü) için kendi deterministik fonksiyonlarımız yazılır.
  - Simülasyonda `Math.random` yok; tohumlu PRNG var.
  - Simülasyon adımı asla değişmez. Hit-stop ve ağır çekim yalnızca sunum katmanında uygulanır; gol sonrası duraklama deterministik bir oyun durumudur. Online ve çevrimdışı mod aynı mimariyi kullanır.
  - CI'da aynı tekrar kaydı Chromium, WebKit ve Node'da çalıştırılır ve her karenin durum özeti (checksum) karşılaştırılır. Determinizmi bozan her değişiklik testle engellenir.
- **Maç doğrulama:** Sunucu ilk sürümde maçı yeniden simüle etmez. İstemciler periyodik checksum ve maç sonucu gönderir; uyuşmazlıkta maç geçersiz sayılır ve loglanır. Sunucu taraflı yeniden simülasyon ileride opsiyonel (Faz 13.2).
- Sunucu: Nakama. Lansman tek Türkiye bölgesiyle yapılır; eşleştirmede gecikme dikkate alınır. Kendi barındırma mı yönetilen hizmet mi kararı Faz 5.5'te verilir (KVKK yurt dışı aktarım etkisi dahil). Hesaplar, cüzdan, envanter, eşleştirme, liderlik tabloları sunucudadır. Ekonomi işlemleri sunucu taraflı doğrulanır; istemciye asla güvenilmez.
- Uzaktan ayar ve A/B testi: tek kaynak Nakama (Faz 5.4, 11.3). Nakama gelene kadar yerel config dosyası (`src/config/gameConfig.ts`) kullanılır.
- Satın alma: RevenueCat; makbuzlar sunucuda doğrulanır.
- Reklam: AdMob (ileride aracılık platformu). Ödüllü reklam + sınırlı geçiş reklamı. Banner yok.
- Analiz ve çökme: Firebase yalnızca Analytics + Crashlytics için kullanılır (Faz 2.8). Rıza yoksa veri gönderilmez.
- Metin: çevrilen metinler canvas tabanlı metinle (web/sistem fontları) çizilir; bitmap font yalnızca skor, sayaç gibi stilize sayı ve başlıklarda kullanılır.
- Web sürümü çalışmaya devam eder (tanıtım ve demo amaçlı).

### Para kazanma ilkeleri

- **Güç satılmaz, çeşitlilik satılır.** Karakterler birbirinin yan seçeneğidir:
  - Tüm karakterlerin toplam istatistik bütçesi eşittir.
  - AI-vs-AI denge simülasyonunda ve ileride online veride her karakterin kazanma oranı %45–55 bandındadır.
  - Her karakter oynayarak makul sürede açılabilir (süre hedefi Faz 1.1'de belirlenir); satın almak sadece beklememek içindir.
  - Seviye veya yükseltmeyle güç artışı yoktur.
- Karakterler dışında satılanlar görünüş, kolaylık ve gösteriştir.
- İki para birimi: Altın (oynayarak kazanılır), Elmas (satın alınır, az miktarda oynayarak da kazanılır; tek oyunculu moddan asla gelmez).
- Tek oyunculu ödüller sadece Altın + XP'dir ve günlük üst sınırlıdır; sunucu makullük kontrolü yapar (maç süresi, skor aralığı, sıklık sınırı). Çevrimdışı oyun tam oynanabilir; ödüller kuyrukta tutulur ve bağlanınca aynı sınırlarla doğrulanır.
- Rastgele ödüllü kutu YOK. Doğrudan satış, günlük dönen mağaza ve Sezon Kartı kullanılır.
- Geçiş reklamı sadece maç sonunda, ilk 5 maçta hiç yok, sıklık sınırı uzaktan ayardan. Maç içinde reklam asla yok.
- Manipülatif arayüz yok: sahte geri sayım, gizli fiyat, yanıltıcı buton yok.

### Gizlilik ve yasal ilkeler

- Tasarımdan itibaren gizlilik: her veri toplama noktası docs/DATA_MAP.md'de listelenir (veri, amaç, hukuki sebep, aktarıldığı yer ve ülke, saklama süresi).
- Rıza gerektiren hiçbir SDK rıza alınmadan başlatılmaz (Faz 2.8'de geçici rıza ekranı, Faz 8.2'de tam rıza yönetimi).
- Serbest yazılı sohbet yok; sadece hazır mesajlar ve emojiler.
- Oyuncu adları: otomatik üretilen varsayılan ad; TR/EN küfür filtresi (harf hilelerine karşı normalizasyonla), ayrılmış adlar, raporlama, ad değiştirme (Faz 5.2, 11.4).
- 18 yaş altı için harcama limiti ve ebeveyn onayı seçeneği bulunur.
- Hukuki metinler taslaktır ve "AVUKAT ONAYI BEKLİYOR" ibaresi taşır.

### Varlık (asset) kuralları

- Oyuna giren her görsel, ses, müzik ve font docs/ASSET_LOG.md'de kayıtlıdır: dosya, kaynak, kullanılan araç, lisans, ticari kullanım izni, tarih, yapılan değişiklikler.
- ASSET_LOG'da kaydı olmayan dosya derlemeye giremez (doğrulama script'i bunu kontrol eder).
- Gerçek kişi, kulüp, marka, logo, FIFA/UEFA isimleri ve gerçek kişilerin sesleri kullanılmaz.

### Çalışma şekli

- Her madde bitince build + lint + test çalıştır, sonra commit ve push yap.
- Faz sonunda PROGRESS.md'yi güncelle: tamamlananlar, bilinen sorunlar, verilen kararlar, fazın bitti kriterlerinin tek tek durumu.
- Belirsiz durumlarda makul olanı seç ve kararı PROGRESS.md'ye yaz.
- PROGRESS.md kısa tutulur; biten fazların ayrıntıları docs/archive/ altına taşınır, PROGRESS.md'de sadece özet ve onay kutuları kalır.

---

## Tek kişilik üretim stratejisi

| Normalde             | Tek başına nasıl yapılacak                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Baş sanatçı          | Sen sanat yönetmenisin. Stil kararını sen verirsin, ART_BIBLE kuralını sen uygularsın.                                             |
| 2D çizer             | Yapay zekâ ile konsept → vektör programında elle yeniden çizim (aşağıdaki görsel üretim hattı).                                    |
| Animatör             | Kafa topu karakterleri parçalı yapıdadır (kafa, gövde, ayakkabı, göz, ağız). Animasyonlar kodla yapılır (Faz 3.2); Spine gerekmez. |
| Arayüz tasarımcısı   | Figma + tasarım sistemi token'ları; Claude Code bileşenleri koda döker.                                                            |
| Ses tasarımcısı      | Lisanslı/CC0 ses kütüphaneleri + Audacity ile düzenleme + mevcut Web Audio sentezi.                                                |
| Besteci              | Ticari kullanım izni olan müzik kütüphaneleri veya ticari lisans veren müzik üretim araçları.                                      |
| Seslendirme          | Ticari lisanslı metinden sese (TTS) aracı, özgün bir ses. Gerçek bir spikerin sesi taklit edilmez.                                 |
| Video editörü        | Oyuna eklenen fragman modu (Faz 12.4) + DaVinci Resolve.                                                                           |
| QA ekibi             | Otomatik testler + arkadaş/aile + Google Play kapalı test.                                                                         |
| Avukat, mali müşavir | **Değiştirilemez.** Avukat bir tanışma + bir inceleme; mali müşavir şirket ve vergi için.                                          |

---

## Görsel üretim hattı (yapay zekâ izini silmek)

Yapay zekâ görselleri ham haliyle oyuna girmez. Her görsel şu hattan geçer:

1. **Konsept:** Yapay zekâ aracında, ART_BIBLE'daki stil şablonu ve referans görselle birkaç varyasyon üret.
2. **Seçim:** Silüeti küçük ekranda okunan, ART_BIBLE paletine en yakın olanı seç.
3. **Yeniden çizim:** Vektör programında (Inkscape, Figma veya Affinity) konsepti referans alarak temiz şekillerle yeniden çiz. Çizgi kalınlığı, ışık yönü ve gölge kuralları ART_BIBLE'dan.
4. **Sadeleştirme:** Gereksiz detayları sil, sadece ART_BIBLE paletini kullan. Yapay zekânın garip detaylarını (bozuk eller, anlamsız desenler, tutarsız ışık) temizle.
5. **Parçalara ayırma:** Kafa, saç, kaş, göz ve ağız varyantları, ayakkabı ayrı katmanlar.
6. **İsimlendirme ve dışa aktarma:** ART_BIBLE'daki isimlendirme kuralıyla, gereken çözünürlüklerde.
7. **Kayıt:** ASSET_LOG.md'ye işle.
8. **Yan yana kontrol:** Yeni görseli mevcut görsellerin yanına koy. Aynı elden çıkmış gibi durmuyorsa 3. adıma dön.

Bu hattın ekstra faydası: elle yeniden çizim, görsele insan emeği katar. Sadece yapay zekâ tarafından üretilmiş görsellerin telif koruması birçok ülkede belirsizdir.

---

# FAZLAR

## Bölüm 0 — Hazırlık

### Faz 0.1 — Hesaplar ve araç seti [SEN]

- Google Play Console hesabı. Önemli: kişisel hesaplarda yayına çıkmadan önce en az 12 test kullanıcısıyla 14 gün kesintisiz kapalı test zorunlu. Kurumsal hesap (şirket + D-U-N-S numarası) bu zorunluluktan muaf. Şirket kuracaksan kurumsal hesap aç.
- Apple Developer hesabı (yıllık ücretli). Windows kullandığın için iOS derlemesi bulut macOS ile yapılacak (Faz 12.2). iOS, Android'den sonra çıkacak.
- Araçlar: Figma, Inkscape veya Affinity, Krita, Audacity, DaVinci Resolve, Android Studio.
- Test cihazı: en az bir düşük-orta seviye Android telefon (performans hedefleri bunun üzerinde ölçülür).
- Ticari kullanım izni veren bir görsel üretim aracı ve bir TTS aracı. Abonelik ve lisans belgelerini sakla; araçların kullanım şartlarının ticari kullanıma izin verdiğini kontrol et.

### Faz 0.2 — Şirket, vergi, marka [SEN + PRO]

- Mali müşavirle görüş: şahıs mı limited mi, vergi yükümlülükleri, mağaza ödemelerinin alınması.
- TÜRKPATENT'te "Kafa Kafaya" ismini araştır; müsaitse marka tescil başvurusu yap. Alan adını al.
- Avukatla bir tanışma görüşmesi: KVKK, tüketici hukuku, 2026 çocuk ve oyun platformu düzenlemesinin projeyi kapsayıp kapsamadığı. Asıl inceleme Faz 10.3'te.

### Faz 0.3 — Proje yapısı ve dokümanlar [CC] (Y)

1. Şu dokümanların iskeletlerini oluştur: docs/GAME_DESIGN_MOBILE.md, docs/DATA_MAP.md, docs/QUALITY_BAR.md, docs/ASSET_LOG.md, docs/ART_BIBLE.md (boş, Faz 1.4'te doldurulacak), docs/OPS.md.
2. QUALITY_BAR.md'nin ilk versiyonu: düşük-orta seviye Android'de sabit 60 FPS, soğuk açılış süresi hedefi, kullanıcıların %99,5'inden fazlasında çökme yok, 48dp minimum dokunma alanı, ekran geçiş süreleri, görsel tutarlılık kontrol listesi.
3. PROGRESS.md'ye "Mobil yol haritası" başlığı ekle; bu dosyadaki tüm fazları onay kutusu listesi olarak yaz.
4. Web sürümünün yayını ve testleri bozulmadan çalışmaya devam etsin.

Bitti kriteri: Dokümanlar repoda, PROGRESS.md'de faz listesi var, web sürümü yayında.

### Faz 0.4 — Kararlar ve yol haritası revizyonu [CC] (Y)

1. Faz 0.3'te listelenen risklerin kararlarını GAME_DESIGN_MOBILE.md § Kararlar'a işle; kararı verilmeyenleri orada listele.
2. Yol haritasını kararlara göre güncelle: yeni fazlar, sıra değişiklikleri, ilke değişiklikleri.
3. PROGRESS.md'deki faz listesini yeni sıraya göre güncelle; kalan çelişki ve riskleri "Sonraki fazlar için notlar"a yaz.

Bitti kriteri: Açık sorular karara bağlandı ya da açıkça listelendi; dokümanlar birbiriyle çelişmiyor ve Prettier'dan geçiyor.

---

## Bölüm 1 — Tasarım ve sanat yönü

### Faz 1.1 — Mobil oyun tasarım dokümanı [CC] (EY)

GAME_DESIGN_MOBILE.md'yi doldur (§ Kararlar bağlayıcıdır):

1. Çekirdek döngü ve meta döngü (maç → ödül → ilerleme → kozmetik → tekrar).
2. Ekonomi: Altın ve Elmas'ın kaynakları ve harcama yerleri, günlük kazanç hedefleri, tek oyunculu ödüllerin günlük üst sınırları.
3. Sezon Kartı yapısı (ücretsiz ve premium yol, 6–8 haftalık temalı sezonlar).
4. Kozmetik kategorileri: karakter skinleri, formalar, ayakkabılar, aksesuarlar, top skinleri, top izleri, gol patlama efektleri, gol kutlamaları, profil çerçeveleri, isim plakaları, maç öncesi giriş animasyonu, stadyum özelleştirmeleri.
5. Ürün kataloğu: reklamsız paket, başlangıç paketi, kurucu paketi, elmas paketleri, Sezon Kartı, VIP Kulüp aboneliği.
6. Reklam yerleşimleri: ödüllü reklamlar ve geçiş reklamı kuralları.
7. Modlar: online sıralamalı, arkadaşla özel oda, tek oyunculu turnuva/kariyer, antrenman, etkinlik modları.
8. İlk kullanıcı deneyimi (ilk 10 dakika), elde tutma özellikleri (günlük görevler, giriş ödülleri, başarımlar, etkinlikler).
9. "Güç satılmaz, çeşitlilik satılır" ilkesi ve teknik uygulanışı; karakter kadrosu (mevcut 10 karakter + 2 yeni karakterin istatistikleri ve süper şutları) ve her karakterin oynayarak açılma süresi hedefi.

Bitti kriteri: Doküman çelişkisiz; ekonomi tablosu sayısal hedeflerle dolu.

### Faz 1.2 — Rakip analizi [SEN + SOHBET]

- Play Store'da en iyi 10 spor ve kafa topu oyununu indir. Her birinden ana menü, mağaza, maç, sonuç ve ilk açılış ekranlarının görüntülerini al.
- Görüntüleri Claude sohbetine yükle ve şu promptu ver:

```
Sen deneyimli bir mobil oyun tasarımcısı ve sanat yönetmenisin. Ekteki ekran görüntüleri en iyi mobil spor oyunlarından. Benim oyunum "Kafa Kafaya": 2D, yandan görünümlü, 1v1 kafa topu. Her oyun için: görsel stil, arayüz dili, renk kullanımı, para kazanma yerleşimleri, ilk açılış akışı. Sonra ortak kalite işaretlerini, sık yapılan hataları ve benim oyunumun öne çıkabileceği boşlukları listele. Sonucu docs/COMPETITOR_ANALYSIS.md olarak kaydedeceğim; Markdown formatında yaz.
```

### Faz 1.3 — Stil testleri [SEN + yapay zekâ araçları]

- 3 farklı stil yönü dene. Her biri için: 1 karakter kafası, 1 stadyum kesiti, 1 buton.
- Her stili şu kriterlerle puanla: küçük ekranda silüet okunuyor mu, yapay zekâ izi kolay silinebiliyor mu, vektöre çevrilebiliyor mu, 12 karakter ve yüzlerce kozmetik boyunca sürdürülebilir mi, rakiplerden farklı mı.
- Bir stil seç.

### Faz 1.4 — Sanat rehberi [SOHBET]

Seçtiğin stilin örneklerini ve rakip analizini sohbete yükle:

```
Sen deneyimli bir mobil oyun sanat yönetmenisin. "Kafa Kafaya" adlı 2D, yandan görünümlü, 1v1 kafa topu oyunu için bir sanat rehberi (art bible) yaz. Oyunu tek kişi geliştiriyor; görseller yapay zekâ konseptinden vektör programında elle yeniden çizilerek üretilecek. Hedef: Play Store'daki en kaliteli spor oyunlarıyla yarışan, tutarlı ve asla "yapay zekâ işi" görünmeyen bir stil. Ekteki görseller seçtiğim stil yönü.
İçerik:
- Renk paleti (ana, ikincil, vurgu, arka plan; takımlar için renk körü dostu çiftler)
- Işık yönü, gölge, çizgi kalınlığı, oran kuralları (büyük kafa, küçük gövde)
- Karakter katman yapısı ve her katmanın varyant listesi (kafa, saç, kaş, göz, ağız ifadeleri, aksesuar, forma, ayakkabı)
- Yapay zekâ görsel aracı için stil şablonu prompt'u ve olumsuz prompt listesi
- Yeniden çizim ve sadeleştirme kuralları, "yapay zekâ izi" kontrol listesi
- Arayüz stili, tipografi yönü, ikon stili
- Stadyum katmanları (parallax) ve görsel efekt kuralları
- Dosya formatları, çözünürlükler, isimlendirme kuralları
- Kabul kriterleri (bir görsel ne zaman "oyuna girebilir")
Markdown formatında yaz; docs/ART_BIBLE.md olarak kaydedeceğim.
```

### Faz 1.5 — Üretim hattı provası [SEN]

- Tek bir karakter kafasını görsel üretim hattının 8 adımından uçtan uca geçir.
- Her adımın süresini ölç, takıldığın yerleri not et.
- ART_BIBLE.md'ye "Üretim hattı notları" bölümü ekle.

### Faz 1.6 — Arayüz tasarım sistemi [SEN + SOHBET]

- Figma'da: renkler, tipografi (Google Fonts gibi ticari kullanıma açık lisanslı fontlar; Türkçe karakterleri ğ, ü, ş, ı, İ, ö, ç mutlaka kontrol et; font lansmanın 10 dilini kapsamalı: Latin genişletilmiş, ör. Lehçe ą ł ż, Almanca ß, Portekizce ã, ve Kiril), boşluk ölçeği, köşe yarıçapları, gölgeler, animasyon süreleri.
- 10 temel bileşen: birincil/ikincil buton, panel, sekme, kart, pop-up, bildirim, para göstergesi, ilerleme çubuğu, rozet.
- Token değerleri için Claude sohbetinden yardım al: ART_BIBLE'ı yükle, "bu rehbere göre arayüz tasarım token'larını tokens.json formatında öner" de.
- tokens.json'u repoya `design/tokens.json` olarak koy.

---

## Bölüm 2 — Mobil temel [CC]

Bu bölümün fazları Bölüm 1 ile paralel ilerleyebilir.

### Faz 2.0 — Phaser 4'e geçiş (EY, gerekirse Fable)

Faz 2.1'den önce yapılır; mobil çalışmanın tamamı Phaser 4 üzerinde başlar.

1. Phaser 3.90 → Phaser 4; kırılan API'lerin listesi ve düzeltilmesi.
2. LiteGraphics'in ve kendi köşe tamponu çizicisinin Phaser 4'ün render node mimarisine taşınması.
3. Özel Phaser paketinin (`scripts/phaser`) Phaser 4'e göre yeniden yapılandırılması.
4. Tüm testlerin (birim, determinizm, Playwright duman testi) ve web yayınının geçmesi.
5. Determinizm karşılaştırması: aynı girdi dizisi eski ve yeni sürümde aynı simülasyon durumunu üretir. Performans karşılaştırması: kare süresi, açılış süresi ve paket boyutu (gzip) eski sürümle yan yana, PROGRESS.md'de.

Bitti kriteri: Web sürümü Phaser 4'te eskisiyle aynı davranıyor.

### Faz 2.1 — Capacitor ve Android derleme (Y)

1. Capacitor kurulumu, uygulama kimliği, Android projesi.
2. Geçici ikon ve açılış ekranı.
3. Debug derlemesinin gerçek cihazda çalışması; README'ye kurulum ve derleme adımları.

Bitti kriteri: Oyun gerçek bir Android telefonda açılıp oynanıyor.

### Faz 2.2 — Ekran ve ölçekleme (Y)

1. Sabit yatay ekran.
2. Çentik ve güvenli alan desteği.
3. 16:9'dan 21:9'a kadar telefonlar ve 4:3 tabletler için doğru ölçekleme; arayüz öğelerinin kenarlara sabitlenmesi.
4. En-boy oranı test matrisi ve her oran için ekran görüntüsü.

Bitti kriteri: Hiçbir oranda kesilen veya taşan arayüz yok.

### Faz 2.3 — Dokunmatik kontroller v2 (Y)

1. Mobil için yeniden tasarlanmış kontroller: sol tarafta hareket, sağda zıpla/şut/süper.
2. Kontrol düzeni düzenleyici ekranı: buton boyutu, konumu, opaklığı; solak modu.
3. Çoklu dokunuş, basma hissi (titreşim + görsel geri bildirim).
4. Giriş gecikmesi ölçümü ve raporu.

Bitti kriteri: Kontroller rahat; iki parmakla aynı anda hareket + şut sorunsuz.

### Faz 2.4 — Performans (EY)

1. Düşük-orta seviye Android'de profil çıkar.
2. Nesne havuzları, texture atlas, kare başına bellek ayırmayı sıfırlama, WebView ayarları.
3. Isınma ve pil tüketimi kontrolü (15 dakikalık oturumda FPS düşüşü olmamalı).
4. Kare süresi grafiği gösteren geliştirici katmanı.
5. Rollback maliyeti ölçümü: durum kaydı + 8 karelik yeniden simülasyon (online PvP'nin kare bütçesi).
6. Final görseller olmadığı için ölçümler hedef boyutta sentetik bir stres sahnesiyle yapılır; ölçümler Faz 4.6 ve 12.3'te tekrarlanır.
7. Sonuçları QUALITY_BAR.md'ye işle.

Bitti kriteri: Test cihazında 15 dakika boyunca sabit 60 FPS; durum kaydı + 8 karelik yeniden simülasyon test cihazında ≤ 4 ms.

### Faz 2.5 — Uygulama yaşam döngüsü (Y)

1. Arka plana alınınca otomatik duraklatma ve durumun korunması.
2. Telefon çağrısı, bildirim, kulaklık takma gibi ses kesintileri.
3. Android geri tuşunun her ekranda tutarlı davranışı.
4. Düşük bellek uyarısında güvenli davranış.

Bitti kriteri: Kesinti senaryolarının hepsi test edildi ve PROGRESS.md'de listelendi.

### Faz 2.6 — Sürekli derleme hattı (Y)

1. GitHub Actions ile imzalı Android AAB derlemesi (anahtarlar repo sırlarında).
2. Sürüm numaralandırma otomasyonu.
3. docs/OPS.md'ye imza anahtarının (keystore) yedeklenmesi ve Play App Signing hakkında uyarı ve adımlar. İmza anahtarını kaybetmek, uygulamayı güncelleyememek demektir.

Bitti kriteri: Her etiketlenen sürümde imzalı AAB otomatik oluşuyor.

### Faz 2.7 — Determinizm sertleştirme (EY, gerekirse Fable)

Amaç: aynı girdi dizisi Android (V8), iOS (JavaScriptCore) ve Node'da her karede bit düzeyinde aynı durumu üretir. Online PvP (Bölüm 9) ve tekrarlar buna dayanır.

1. Simülasyonu etkileyen tüm kodun (src/physics ve oyun durumunu değiştiren her yer) denetimi: yalnızca `+`, `-`, `*`, `/`, `Math.sqrt`, `Math.abs/min/max/floor/round` ve tam sayı işlemleri.
2. `sin`, `cos`, `atan2`, `exp`, `pow` için yalnızca izinli işlemlerle yazılmış kendi deterministik fonksiyonlarımız ve doğruluk testleri.
3. `Math.random` yerine tohumlu PRNG; PRNG durumu `saveState`/`loadState`'e dahil.
4. Lint kuralı: simülasyon kodunda yasaklı `Math` fonksiyonları, `**` operatörü ve `Math.random` derlemeyi kırar.
5. Zaman efektlerinin sunum katmanına taşınması: simülasyon adımı hiç değişmez; hit-stop ve ağır çekim yalnızca çizimde; gol sonrası duraklama kare sayısıyla ilerleyen deterministik bir oyun durumu. Çevrimdışı mod da bu mimariyi kullanır.
6. Durum özeti (checksum): simülasyon durumunun kanonik serileştirmesinden; Faz 9.2 (desync tespiti) ve 9.3 (periyodik checksum) bunu kullanır.
7. Çapraz motor testi: kayıtlı tekrarlar (tüm karakterler ve süperler, gol, gol sonrası duraklama) CI'da Chromium, WebKit ve Node'da çalıştırılır; her karenin checksum'ı karşılaştırılır, tek fark CI'ı kırar. Test cihazında Android WebView'da da bir kez çalıştırılır.

Bitti kriteri: Çapraz motor testi CI'da yeşil; lint kuralı etkin; mevcut determinizm testleri geçiyor. Fizik hissi ve denge bu fazdan sonra yeniden ayarlanır (Faz 2.9).

### Faz 2.8 — Gözlemlenebilirlik temeli (Y)

1. Firebase Crashlytics + Analytics. Firebase yalnızca bunlar için kullanılır; uzaktan ayar ve A/B testi Nakama'dadır (Faz 5.4, 11.3).
2. Geçici rıza ekranı: analiz ve çökme raporu için onay, ayarlardan geri alınabilir. Rıza yoksa veri gönderilmez: SDK'lar otomatik toplama kapalı başlatılır, rıza gelince açılır. Bu ekranın yerini Faz 8.2'deki tam rıza yönetimi alır.
3. Yakalanmamış JS hataları ve WebView çizici süreç kaybı Crashlytics'e raporlanır (QUALITY_BAR K4); sürüm ve cihaz etiketleri.
4. Temel analiz olayları (oturum, maç başı/sonu, hata) ve tek bir olay sözlüğü dosyası; Faz 6.8 ve 11.3 bu altyapıyı ve sözlüğü kullanır.
5. DATA_MAP.md'ye Firebase satırları ve yurt dışı aktarım kaydı.

Bitti kriteri: Rıza verilince test çökmesi ve bir analiz olayı Firebase konsolunda görünüyor; rıza yokken hiçbir istek gitmediği ağ kaydıyla doğrulandı.

### Faz 2.9 — His ve denge yeniden ayarı (Y)

Faz 2.7'den sonra yapılır.

1. 2.7 öncesi ve sonrası aynı girdilerle karşılaştırma (top yörüngesi, zıplama yüksekliği, şut ve süper hızları); his değiştiyse ayar değerleriyle geri getirilir.
2. Karakter dengesi: toplam istatistik bütçesinin eşitliği testle zorlanır; AI-vs-AI simülasyonunda her karakterin kazanma oranı %45–55 bandına çekilir (web v1.0.0'da Ayaz %57).
3. Denge raporu (kazanma oranları ve eşleşme tablosu) PROGRESS.md'de.

Bitti kriteri: Tüm karakterler %45–55 bandında; determinizm ve çapraz motor testleri yeşil.

---

## Bölüm 3 — Görsel ve ses altyapısı [CC]

### Faz 3.1 — Asset manifest ve placeholder sistemi (Y)

1. Tüm görsel ve sesler tek bir asset manifest üzerinden yüklenir.
2. Placeholder ve final görsel aynı anahtarla tanımlanır; final eklenince kod değişmeden yer değiştirir.
3. ASSET_LOG doğrulama script'i: manifestteki her dosyanın ASSET_LOG'da lisanslı kaydı olmalı; yoksa derleme başarısız olur. CI'a eklenir.
4. Geliştirici katmanında placeholder görselleri vurgulama seçeneği.

Bitti kriteri: Sahte bir final görsel eklenerek yer değiştirme ve doğrulama script'i test edildi.

### Faz 3.2 — Parçalı animasyon sistemi (EY)

1. Kodla çalışan parçalı karakter iskeleti: kafa, gövde, ayakkabı, kaşlar, gözler, ağız ayrı katmanlar.
2. Animasyon durumları: bekleme (nefes), koşu (squash & stretch), zıplama, iniş, şut, kafa vuruşu, sevinç, üzüntü, donma.
3. İfade sistemi: göz kırpma, topu gözle takip, olaya göre ifade değişimi.
4. Animasyonlar JSON anahtar karelerle tanımlanır; geliştirici modunda canlı ayar ekranı (kod yazmadan animasyon zamanlaması ayarlanabilir).

Bitti kriteri: Placeholder parçalarla bile karakterler canlı ve karakterli hissettiriyor.

### Faz 3.3 — Kozmetik katman sistemi (Y)

1. Slotlar: saç, aksesuar, forma, ayakkabı, top skini, top izi, gol patlama efekti, gol kutlaması, profil çerçevesi, isim plakası.
2. Kozmetikler veri dosyalarıyla tanımlanır (yeni kozmetik eklemek kod gerektirmez).
3. Mağaza ve dolap ekranı için önizleme çizicisi.

Bitti kriteri: Placeholder kozmetiklerle bir karakter tamamen giydirilip önizlenebiliyor.

### Faz 3.4 — Tasarım sistemi ve bileşen kütüphanesi (Y)

Ön koşul: Faz 1.4 ve 1.6 bitmiş olmalı.

1. design/tokens.json'u içe aktaran tasarım sistemi katmanı.
2. Faz 1.6'daki 10 bileşenin kod karşılıkları; tüm durumları (normal, basılı, devre dışı, yükleniyor).
3. Metin çizimi: çevrilen metinler canvas tabanlı metinle (Faz 1.6'da seçilen web fontu, gerekirse sistem fontu); bitmap font yalnızca skor, sayaç gibi stilize sayı ve başlıklarda (gerekirse özel Phaser paketine eklenir). Türkçe, Latin genişletilmiş ve Kiril karakter kapsaması; metin boyutunun dile göre uyumu.
4. Tüm bileşenleri gösteren vitrin sahnesi.

Bitti kriteri: Vitrin sahnesi Figma tasarımıyla yan yana konunca aynı görünüyor.

### Faz 3.5 — Ekran akışı ve geçişler (Y)

1. Ekran yönlendiricisi (scene router) ve tutarlı geri gezinme.
2. Ekran geçiş animasyonları, pop-up yığını, bildirim (toast) sistemi.
3. İpuçları gösteren yükleme ekranı.

Bitti kriteri: Tüm ekranlar arası geçiş akıcı ve tutarlı.

### Faz 3.6 — Görsel efekt ve "juice" kütüphanesi (Y)

1. Parçacık hazır ayarları, shader'lar (parlama, şok dalgası, vuruş flaşı).
2. Ekran sarsıntısı profilleri, hit-stop, ağır çekim, kamera yönetmeni (gol anı, tehlikeli atak). Hit-stop ve ağır çekim yalnızca sunum katmanındadır; simülasyon adımına dokunmaz (Faz 2.7).
3. Efekt bütçesi kuralı ve ayarlarda "azaltılmış efekt" seçeneği.
4. Titreşim desen kütüphanesi (vuruş, direk, gol, buton).

Bitti kriteri: Efektler QUALITY_BAR'daki performans hedefini bozmuyor.

### Faz 3.7 — Ses motoru v2 (Y)

1. Örnek tabanlı ses çalma (ogg/m4a) ve sentez seslerle birlikte çalışma.
2. Ses kanalları: müzik, efekt, spiker, kalabalık; kanal bazlı ses ayarı; gol anında müziğin kısılması.
3. Dinamik kalabalık: tehlikeli atakta yükselen uğultu, golde patlama.
4. Spiker sistemi: olay → replik havuzu, art arda tekrar yok, öncelik ve bekleme süreleri, TR/EN dil desteği.
5. Titreşimlerin seslerle senkronu.

Bitti kriteri: Placeholder seslerle sistem tam çalışıyor; final sesler sadece manifestten eklenecek.

---

## Bölüm 4 — Dikey dilim

### Faz 4.1 — Stadyum #1 [SEN + yapay zekâ araçları]

- Parallax katmanları: gökyüzü, uzak manzara, arka tribün, ön tribün (animasyonlu kalabalık sprite'ları), saha, kaleler ve ağ.
- Görsel üretim hattından geçir, ASSET_LOG'a kaydet.

### Faz 4.2 — Karakter #1 ve #2 [SEN + yapay zekâ araçları]

- Mevcut 10 karakterden ikisinin yeniden çizimi; ART_BIBLE'daki tüm katmanlar ve ifade varyantları.
- Görsel üretim hattından geçir, ASSET_LOG'a kaydet.

### Faz 4.3 — Arayüz görselleri [SEN]

- Figma'dan bileşen görselleri, tek stilde ikon seti, logo v1.

### Faz 4.4 — Ses paketi v1 [SEN + yapay zekâ araçları]

- Efektler: CC0 veya ticari lisanslı kütüphanelerden seç, Audacity'de düzenle ve seviyelerini eşitle.
- Müzik: 1 menü, 1 maç parçası (ticari lisanslı).
- Spiker: TTS ile 40 Türkçe replik (gol, direk, kurtarış, süper şut, maç başı/sonu). Özgün bir ses kullan.
- Kalabalık döngüleri.
- Hepsini ASSET_LOG'a kaydet.

### Faz 4.5 — Dikey dilim entegrasyonu [CC] (Y)

1. 4.1–4.4'teki varlıkları manifest üzerinden entegre et.
2. Ana menü → karakter seçimi → maç → sonuç ekranı akışını final kaliteye getir.
3. Kamera, ışık ve gölge ayarları; ses karışımı.

Bitti kriteri: Akış baştan sona final görsellerle oynanıyor.

### Faz 4.6 — Cila turu [CC] (Y)

1. Her ekranı QUALITY_BAR.md ve ART_BIBLE.md'ye göre denetle; sapmaları listele.
2. Sapmaları düzelt.
3. Ekran görüntülerini docs/screenshots'a kaydet.
4. Faz 2.4'teki performans ve rollback ölçümlerini final görsellerle tekrarla; QUALITY_BAR'a işle.

Bitti kriteri: Sapma listesi kapandı.

### Faz 4.7 — Dikey dilim testi [SEN + CC]

- [CC] Test derlemesine oyun içi geri bildirim butonu ekle (ekran görüntüsü + not).
- [SOHBET] Test anketi için soru hazırlat.
- [SEN] Seni tanımayan 15–20 kişiye oynat.
- **Kalite kapısı:** "Bunu büyük bir stüdyo mu yaptı?" tepkisi alınmadıysa Bölüm 4'e geri dön. Bu kapıyı geçmeden içerik üretimine başlama.

---

## Bölüm 5 — Sunucu [CC]

### Faz 5.1 — Nakama yerel kurulum (Y)

1. Docker Compose ile Nakama + PostgreSQL.
2. İstemci SDK entegrasyonu, bağlantı katmanı.
3. Ortam ayarları: geliştirme, test, canlı.

Bitti kriteri: İstemci yerel sunucuya bağlanıyor; sağlık kontrolü çalışıyor.

### Faz 5.2 — Hesaplar ve bulut kaydı (EY)

1. Misafir hesap (cihaz kimliği ile).
2. Google Play Games ile hesap bağlama (Game Center Faz 12.2'de).
3. Bulut kaydı, cihaz değişiminde hesap kurtarma, çakışma çözümü.
4. Oyuncu adı: otomatik üretilen varsayılan ad; TR/EN küfür filtresi (harf hilelerine karşı normalizasyonla: büyük/küçük harf, rakam-harf benzerliği, araya konan işaretler, Türkçe karakter eşlemesi); ayrılmış adlar; raporlama; ad değiştirme. Filtre sunucuda uygulanır.
5. DATA_MAP.md güncellemesi.

Bitti kriteri: Hesap başka cihazda aynen geri yükleniyor; ad filtresi harf hilesi içeren test listesini yakalıyor.

### Faz 5.3 — Cüzdan ve envanter (EY)

1. Sunucu taraflı Altın/Elmas cüzdanı ve envanter.
2. Tekrar güvenli (idempotent) işlemler ve değiştirilemez işlem defteri.
3. İstemci asla bakiye belirleyemez; tüm değişiklikler sunucu RPC'leri ile.
4. Tek oyunculu ödül RPC'si: sadece Altın + XP, günlük üst sınır; makullük kontrolü (maç süresi, skor aralığı, sıklık sınırı). Elmas bu yoldan asla verilmez.
5. Çevrimdışı ödül kuyruğu: çevrimdışı maçların ödülleri cihazda kuyrukta tutulur, bağlanınca aynı sınırlarla doğrulanır; reddedilenler loglanır.
6. Hile testleri: istemcide değer değiştirmenin işe yaramadığını kanıtlayan testler.

Bitti kriteri: Hile testleri geçiyor (sınırları aşan tek oyunculu ödüller ve sahte kuyruk kayıtları dahil).

### Faz 5.4 — Uzaktan ayar, sürüm kontrolü, bakım modu (Y)

1. Ekonomi ve oyun değerlerinin sunucudan gelmesi; uzaktan ayarın tek kaynağı Nakama. O zamana kadar kullanılan yerel config dosyasının yerini alır; çevrimdışı oyun için son bilinen değerler cihazda saklanır.
2. Minimum sürüm kontrolü ve zorunlu güncelleme ekranı.
3. Bakım modu ve bakım mesajı.

Bitti kriteri: Sunucudan bir değer değiştirilince oyun yeniden derlenmeden etkileniyor.

### Faz 5.5 — Canlı sunucu (EY)

1. Barındırma kararı: kendi barındırma (VPS, tercihen Türkiye'de veri merkezi) mı, yönetilen hizmet mi. Ölçütler: maliyet, bakım yükü, yedekleme ve izleme kolaylığı, KVKK yurt dışı aktarım etkisi (sunucu yurt dışındaysa standart sözleşme ve Kurul'a bildirim gerekir). Karar ve gerekçe OPS.md'ye ve DATA_MAP'e. Lansman tek Türkiye bölgesiyle.
2. Seçilen ortama kurulum, TLS, güvenlik duvarı.
3. Otomatik yedekleme ve geri yükleme testi.
4. İzleme ve uyarılar, DATA_MAP'e uygun log saklama süreleri.
5. docs/OPS.md: kurulum, güncelleme, yedekten dönme, olay müdahale adımları.

Bitti kriteri: Barındırma kararı yazılı; yedekten geri yükleme gerçekten denendi ve çalıştı.

---

## Bölüm 6 — Meta oyun [CC]

### Faz 6.1 — İlerleme altyapısı (Y)

XP ve seviye sistemi (seviye güç vermez), ödül tabloları, ödül teslim ekranı ve animasyonları (sunucu taraflı).

### Faz 6.2 — Günlük görevler, başarımlar, giriş ödülleri (Y)

Görev havuzu ve günlük yenileme, başarım listesi, giriş ödülü takvimi; hepsi sunucu taraflı ve uzaktan ayarlanabilir.

### Faz 6.3 — Dolap ve envanter ekranı (Y)

Sahip olunan kozmetikleri görme, giydirme, önizleme; karakter bazlı kombinler.

### Faz 6.4 — Kozmetik mağazası (Y)

Günlük dönen vitrin, Altın/Elmas fiyatları, satın almadan önce önizleme, net fiyat gösterimi.

### Faz 6.5 — Sezon Kartı (EY)

Ücretsiz ve premium yol, sezon takvimi, seviye atlama, sezon sonu geçişi; tamamen sunucudan yönetilen sezon tanımları.

### Faz 6.6 — Karakter koleksiyonu ve tek oyunculu mod (Y)

Karakter açma sistemi: her karakter oynayarak makul sürede açılır (hedef süre Faz 1.1'de), satın almak sadece beklememek için; karakterler yan seçenektir, yükseltme yoktur. Web'deki turnuva modunun mobil ilerlemeye bağlanması; tek oyunculu ödüller Faz 5.3'teki sınırlarla.

### Faz 6.7 — Kendi stadyumun (Y)

Tribün rengi, ışıklar, saha deseni, tezahürat seçimi; online maçta ev sahibi olunca rakibe gösterilmesi.

### Faz 6.8 — İlk kullanıcı deneyimi (EY)

1. Eğitim maçı (oynayarak öğretme, uzun metin yok).
2. Özelliklerin adım adım açılması (her şeyi ilk dakikada gösterme).
3. İlk 10 dakika akışı ve her adım için analiz olayları (Faz 2.8 altyapısı ve olay sözlüğü).

Bitti kriteri: Oyunu hiç görmemiş biri yardımsız ilk 3 maçı tamamlıyor.

### Faz 6.9 — Ekonomi simülasyonu ve denge (EY)

Oyuncu tiplerine göre (hiç harcamayan, az harcayan, çok harcayan) günlük kazanç ve ilerleme simülasyonu; Sezon Kartı'nın ücretsiz oyuncu için ulaşılabilirliği; rapor docs/ECONOMY_REPORT.md.

---

## Bölüm 7 — İçerik üretimi [SEN + yapay zekâ araçları] (diğer bölümlerle paralel)

Her parti bittiğinde Faz 7.6 çalıştırılır.

### Faz 7.1 — Karakterler 3–12

Mevcut 10 karakterin kalan 8'inin yeniden çizimi (ilk ikisi Faz 4.2'de) + 2 yeni karakter. 3'erli partiler halinde. Her karakter: tüm katmanlar, ifadeler, kendine özel süper şutun görsel kimliği. Yeni karakterlerin istatistikleri ve süper şutları Faz 1.1'de tasarlanır, Faz 7.6'da kodlanır.

### Faz 7.2 — Stadyumlar 2–4

Farklı atmosferler (gece maçı, kar, plaj, futuristik gibi), her biri tam parallax setiyle.

### Faz 7.3 — Kozmetik paketi v1

Kabaca: 20 top skini, 10 gol kutlaması (kodla animasyon + görsel), 10 gol patlama efekti, 10 top izi, 20 aksesuar, 12 forma.

### Faz 7.4 — Spiker ve kalabalık tam set

Türkçe ve İngilizce, olay başına yeterli varyasyonla toplam yaklaşık 300 replik; kalabalık ses seti.

### Faz 7.5 — Müzik seti

Menü, 2–3 maç parçası, sezon temaları, zafer/yenilgi kısa müzikleri.

### Faz 7.6 — İçerik partisi entegrasyonu [CC] (Y)

1. Yeni varlıkları manifest ve veri dosyalarına ekle; ASSET_LOG doğrulaması. Yeni karakterlerin partisinde süper şut mekaniklerini kodla.
2. Denge simülasyonu: her karakterin kazanma oranı %45–55 bandında; toplam istatistik bütçesi eşit.
3. Mağaza ve dolap önizlemelerini kontrol et; ART_BIBLE uyum denetimi.

Bitti kriteri: Parti oyunda, denge raporu PROGRESS.md'de.

---

## Bölüm 8 — Gizlilik temeli ve para kazanma [CC]

Veri haritası ve rıza yönetimi (8.1–8.2), satın alma ve reklam fazlarından önce yapılır.

### Faz 8.1 — Veri haritası ve ilk açılış (Y)

1. DATA_MAP.md'nin güncel hali: o ana kadarki tüm SDK'lar (Firebase) ve sunucu (Nakama) ile bu bölümde eklenecek RevenueCat ve AdMob dahil. Sonraki fazlar eklediği veriyi yazmaya devam eder; son kontrol Faz 10.2'de.
2. İlk açılışta yaş sorusu ve aydınlatma ekranı (ayarlardan her zaman ulaşılabilir).

### Faz 8.2 — Rıza yönetimi (EY)

1. Kişiselleştirilmiş reklam, analiz ve pazarlama bildirimi için ayrı ayrı, her an geri alınabilir rıza. Faz 2.8'deki geçici rıza ekranının yerini alır.
2. AB kullanıcıları için Google UMP, iOS için takip izni (ATT).
3. Rıza yokken ilgili SDK'ların hiç başlatılmaması; bunun testi.

### Faz 8.3 — RevenueCat ve ürün kataloğu (EY)

RevenueCat SDK, Faz 1.1'deki ürün kataloğunun tanımlanması, test ortamında satın alma akışı.

### Faz 8.4 — Sunucu taraflı doğrulama (EY)

Makbuz doğrulama ve webhook'lar, satın alma geri yükleme, iade durumunda içeriğin geri alınması, işlem defterine kayıt.

### Faz 8.5 — Satın alma deneyimi ve yasal bilgilendirme (Y)

1. Satın almadan önce ön bilgilendirme ekranı: fiyat TL ve vergiler dahil, Elmas paketinin karşılığı net.
2. Dijital içerikte cayma hakkı istisnası hakkında bilgilendirme ve kullanıcı onayı.
3. 18 yaş altı için harcama limiti ve ebeveyn onayı seçeneği (yaş beyanı Faz 8.1'den).
4. Manipülatif arayüz denetimi (sahte geri sayım, gizli maliyet, yanıltıcı buton yok).

### Faz 8.6 — Teklifler (Y)

Başlangıç paketi (3. maçtan sonra bir kez), kurucu paketi (sadece lansman ayı), reklamsız paket, VIP Kulüp avantajları (reklamsızlık, günlük elmas, aylık özel skin, 2x XP, rozet), elmas paketleri; hepsi uzaktan yönetilebilir.

### Faz 8.7 — Ödüllü reklamlar (Y)

Yerleşimler: maç ödülünü 2 katına çıkarma, günlük bedava ödül, turnuvada elenince bir şans daha, skin'i 1 maçlığına deneme. Günlük sınırlar uzaktan ayardan.

### Faz 8.8 — Geçiş reklamı ve reklam rızası (Y)

1. Geçiş reklamı kuralları (sadece maç sonu, ilk 5 maç yok, sıklık sınırı).
2. Reklamsız paket ve VIP'te geçiş reklamının kapanması, ödüllü reklamın isteğe bağlı kalması.
3. Faz 8.2'deki rıza durumuna göre kişiselleştirilmiş veya kişiselleştirilmemiş reklam.

Bitti kriteri: Tüm reklam kurallarının otomatik testleri var.

---

## Bölüm 9 — Online PvP [CC] (EY, her faz ayrı sohbet)

### Faz 9.1 — Ağ katmanı prototipi

İki yerel istemci arasında giriş (input) alışverişi; gecikme, titreşim (jitter) ve paket kaybı simülatörü.

### Faz 9.2 — Rollback netcode

Giriş gecikmesi + tahmin + geri sarıp yeniden simüle etme; durum özeti (checksum, Faz 2.7) ile tutarsızlık (desync) tespiti ve raporlama.

Bitti kriteri: 150 ms gecikme ve %2 paket kaybında maç akıcı; desync testi geçiyor.

### Faz 9.3 — Sunucuda maç yönetimi

Nakama üzerinden maç kurulumu ve giriş aktarımı. İstemciler periyodik checksum ve maç sonucu gönderir; sunucu karşılaştırır, uyuşmazlıkta maç geçersiz sayılır ve loglanır; ödüller sunucudan verilir. Sunucu maçı yeniden simüle etmez (ileride opsiyonel: Faz 13.2).

### Faz 9.4 — Eşleştirme

Beceri puanı (Glicko veya Elo). Lansmanda tek sunucu bölgesi (Türkiye) olduğundan eşleştirmede gecikme dikkate alınır. Oyuncu azken bekleme uzarsa yapay zekâ rakiple oynama önerilir ve bunun yapay zekâ olduğu açıkça belirtilir.

### Faz 9.5 — Sıralamalı lig

Rütbeler, kupalar, sezon sonu ödülleri, liderlik tabloları (genel, ülke, arkadaşlar).

### Faz 9.6 — Sosyal ve dayanıklılık

Bağlantı kopması ve yeniden bağlanma, maçtan kaçma cezası, hazır mesajlar ve emojiler (serbest sohbet yok), arkadaş listesi, arkadaşla özel oda.

---

## Bölüm 10 — Gizlilik ve yasal uyum

Veri haritası, ilk açılış ve rıza yönetimi Bölüm 8'in başına taşındı (Faz 8.1–8.2).

### Faz 10.1 — Gizlilik Merkezi [CC] (EY)

1. Verilerimi gör ve indir, düzelt, hesabımı ve verilerimi sil (sunucuda gerçekten silinir; yedeklerden silinme politikası OPS.md'de), rızalarım, başvuru formu.
2. Başvuruların 30 gün içinde yanıtlanması için takip listesi (yönetim panelinde, Faz 11.4).
3. Google Play için web üzerinden hesap silme sayfası.

### Faz 10.2 — Yasal metin taslakları [CC] (Y)

Önce DATA_MAP'in son kontrolü (Bölüm 9 dahil tüm veri noktaları). Ardından docs/legal altında, DATA_MAP'e dayanarak ve her birinin başında "AVUKAT ONAYI BEKLİYOR" ibaresiyle: KVKK aydınlatma metni, açık rıza metinleri, gizlilik politikası, kullanım koşulları, ön bilgilendirme formu, iade ve destek politikası.

### Faz 10.3 — Avukat incelemesi [PRO]

- Tüm yasal metinlerin ve akışların incelenmesi.
- Yurt dışına veri aktarımı: Firebase, AdMob, RevenueCat gibi servisler (ve Faz 5.5'te yönetilen sunucu hizmeti seçildiyse o) için standart sözleşmeler ve imzadan sonra 5 iş günü içinde Kurul'a bildirim.
- VERBİS durumu (muhtemelen muaf, ama diğer KVKK yükümlülükleri devam ediyor).
- 2026 çocuk ve oyun platformu düzenlemesinin projeyi kapsayıp kapsamadığı (yaş derecelendirmesi, ebeveyn kontrolü).
- Cayma hakkı ve mesafeli sözleşmelerdeki güncel durum.

### Faz 10.4 — Mağaza formları ve yayın [CC] (Y)

1. Google Play "Veri güvenliği" formu ve Apple "App Privacy" etiketleri için DATA_MAP'ten çıkarılmış hazır cevap tablosu.
2. Avukat onaylı gizlilik politikası ve kullanım koşullarının web sayfası olarak yayını (mevcut GitHub Pages altında).

---

## Bölüm 11 — Canlı operasyon

### Faz 11.1 — Etkinlik sistemi [CC] (Y)

Sunucudan açılıp kapanan zamanlı modlar (düşük yer çekimi, dev top, buzlu saha), etkinlik görevleri ve ödülleri.

### Faz 11.2 — Bildirimler [CC] (Y)

Rızaya bağlı, sıklığı sınırlı bildirimler (günlük ödül, sezon bitişi, etkinlik başlangıcı); sessiz saatler.

### Faz 11.3 — Gelişmiş huni ve A/B testi [CC] (Y)

Faz 2.8'in Firebase Analytics altyapısı üzerinde huni (kurulum → ilk maç → 3. maç → 1. gün dönüşü → ilk satın alma) ve haftalık rapor şablonu. A/B testi Nakama üzerinden: deney ataması ve değerler Nakama'dan gelir, olaylar deney etiketiyle Firebase Analytics'e gider.

### Faz 11.4 — Yönetim paneli [CC] (EY)

Kimlik doğrulamalı web paneli: oyuncu arama, envanter düzeltme (işlem defterine kayıtlı), teklif ve etkinlik yönetimi, bakım modu, oyuncu adı moderasyon kuyruğu (raporlanan adlar, zorla ad değiştirme, ayrılmış ad listesi), destek ve KVKK başvuru takibi.

### Faz 11.5 — Destek ve SSS [CC] (Y)

Oyun içi destek formu, SSS ekranı, satın alma sorunlarında mağaza iade yönlendirmesi.

### Faz 11.6 — Yerelleştirme [CC] (Y)

Lansman dilleri Latin ve Kiril alfabeli 10 dil: TR, EN, DE, FR, ES, PT-BR, IT, PL, RU, ID. Yapay zekâ çevirisi + oyun terimleri sözlüğü (glossary); çevrilen metinler canvas tabanlı metinle çizilir (Faz 3.4); uzun metinlerde taşma testi; mağaza açıklamaları dahil. Çince, Japonca, Korece ve Arapça Faz 13.1'de.

---

## Bölüm 12 — Yayın

### Faz 12.1 — Android sürüm hattı [CC] (Y)

AAB, Play App Signing, kademeli dağıtım, çökme sembollerinin yüklenmesi, sürüm notları şablonu.

### Faz 12.2 — iOS [CC] (EY)

Bulut macOS ile derleme (GitHub Actions macOS veya benzeri), Game Center, ATT, App Store Connect yapılandırması, iOS'a özel test listesi.

### Faz 12.3 — Kalite güvence turu [CC + SEN] (Y)

Cihaz test matrisi, otomatik duman testleri, regresyon kontrol listesi, performans raporu (Faz 2.4'teki rollback ölçümü dahil), gerçek Android ve iOS cihazda çapraz motor checksum testi, QUALITY_BAR'ın tam doğrulaması.

### Faz 12.4 — Mağaza sayfası [CC + SEN] (Y)

1. [CC] Fragman modu: arayüzü gizleyen sinematik kamera, ağır çekim, kayıt için temiz görüntü.
2. [CC] Her dil ve cihaz boyutu için otomatik ekran görüntüsü üretimi.
3. [SEN] DaVinci Resolve ile fragman kurgusu.
4. [SOHBET] Türkçe ve İngilizce mağaza açıklaması ve anahtar kelimeler.
5. Ekran görüntüleri gerçek oyunu yansıtmalı; yanıltıcı görsel kullanılmaz.

### Faz 12.5 — Kapalı test [SEN]

Kişisel hesapta en az 12 test kullanıcısı, 14 gün kesintisiz (kurumsal hesapta zorunlu değil ama yine de yap). Geri bildirimleri topla, düzeltmeleri Claude Code'a yaptır.

### Faz 12.6 — Test lansmanı [SEN + CC]

Birkaç ülkede sessiz yayın. Eşikler: ertesi gün dönüş oranı kabaca %35'in üstünde, kullanıcıların %99,5'inden fazlasında çökme yok. Tutmazsa düzelt, tekrar ölç.

### Faz 12.7 — Global lansman [SEN + CC]

İlk 2–3 sezonun içeriği hazır, kademeli yayın, lansman günü kontrol listesi, ardından iOS.

---

## Bölüm 13 — Lansman sonrası

### Faz 13.1 — Yerelleştirme: Çince, Japonca, Korece ve Arapça [CC] (EY)

1. Çince, Japonca, Korece: font kapsaması ve boyutu (sistem fontu ya da sonradan indirilen font), satır kırma kuralları.
2. Arapça: sağdan sola düzen ve arayüz aynalama, canvas metin yönü, karışık yönlü metin.
3. Taşma ve okunurluk testleri, mağaza açıklamaları.

### Faz 13.2 — Sunucu taraflı yeniden simülasyon (opsiyonel) [CC] (EY)

Şüpheli maçlarda (checksum uyuşmazlığı, raporlanan maç) girdi kaydının sunucuda yeniden simüle edilmesi; Faz 2.7'deki çapraz motor testinin sunucu çalışma zamanını da kapsayacak şekilde genişletilmesi.

---

## Ek A — Yayın öncesi yasal kontrol listesi

- [ ] Aydınlatma metni ilk açılışta ve ayarlarda
- [ ] Açık rızalar ayrı ayrı ve geri alınabilir
- [ ] Gizlilik Merkezi: indir, düzelt, sil, rızalar, başvuru
- [ ] Yurt dışı aktarım standart sözleşmeleri imzalandı ve 5 iş günü içinde bildirildi
- [ ] Veri güvenliği tedbirleri, saklama-imha politikası, veri ihlali müdahale planı
- [ ] Ön bilgilendirme, TL ve vergi dahil fiyat, cayma hakkı bilgilendirmesi
- [ ] Yaş sorusu, 18 yaş altı harcama limiti ve ebeveyn onayı
- [ ] Serbest yazılı sohbet yok
- [ ] Oyuncu adı filtresi, ayrılmış adlar ve raporlama çalışıyor
- [ ] Mağaza yaş derecelendirmesi (IARC) doğru dolduruldu
- [ ] Veri güvenliği formu ve App Privacy etiketleri DATA_MAP ile birebir aynı
- [ ] Uygulama içinden ve web'den hesap silme çalışıyor
- [ ] ASSET_LOG'daki tüm varlıklar ticari kullanıma uygun lisanslı
- [ ] Marka tescili başvurusu yapıldı
- [ ] SMS/e-posta pazarlaması varsa İYS kaydı
- [ ] Tüm yasal metinler avukat onaylı

## Ek B — Kalite kapıları özeti

| Kapı         | Ne zaman     | Kriter                                                 |
| ------------ | ------------ | ------------------------------------------------------ |
| Sanat yönü   | Faz 1.5 sonu | ART_BIBLE tamam, üretim hattı provası başarılı         |
| Dikey dilim  | Faz 4.7      | Yabancı test oyuncularından "büyük stüdyo işi" tepkisi |
| İçerik tamam | Bölüm 7 sonu | Tüm varlıklar ART_BIBLE uyumlu ve lisanslı             |
| Teknik hazır | Faz 12.3     | QUALITY_BAR'ın tamamı doğrulandı                       |
| Yasal hazır  | Faz 10.3     | Ek A tamamen işaretli                                  |
| Pazar hazır  | Faz 12.6     | Test lansmanı eşikleri tuttu                           |
