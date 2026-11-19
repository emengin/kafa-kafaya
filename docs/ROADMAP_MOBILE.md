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

Model ayarı: **(Y)** = Yüksek, **(EY)** = Ekstra yüksek.

Bazı bölümler paralel yürür: Claude Code sunucu veya meta oyun fazlarındayken sen Bölüm 7'deki içerik üretimine devam edebilirsin.

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

- TypeScript + Phaser kod tabanı korunur; Capacitor ile Android ve iOS'a paketlenir. Önce Android, sonra iOS.
- Fizik deterministik kalır (online PvP'de rollback netcode için şart). Determinizmi bozan her değişiklik testle engellenir.
- Sunucu: Nakama (kendi barındırma, tercihen Türkiye'deki bir veri merkezinde). Hesaplar, cüzdan, envanter, eşleştirme, liderlik tabloları sunucudadır. Ekonomi işlemleri sunucu taraflı doğrulanır; istemciye asla güvenilmez.
- Satın alma: RevenueCat; makbuzlar sunucuda doğrulanır.
- Reklam: AdMob (ileride aracılık platformu). Ödüllü reklam + sınırlı geçiş reklamı. Banner yok.
- Analiz ve çökme: Firebase Analytics + Crashlytics, uzaktan ayar.
- Web sürümü çalışmaya devam eder (tanıtım ve demo amaçlı).

### Para kazanma ilkeleri

- Kazanmak için para ödenmez: online maçlarda istatistikler eşittir. Satılanlar görünüş, kolaylık ve gösteriştir.
- İki para birimi: Altın (oynayarak kazanılır), Elmas (satın alınır, az miktarda oynayarak da kazanılır).
- Rastgele ödüllü kutu YOK. Doğrudan satış, günlük dönen mağaza ve Sezon Kartı kullanılır.
- Geçiş reklamı sadece maç sonunda, ilk 5 maçta hiç yok, sıklık sınırı uzaktan ayardan. Maç içinde reklam asla yok.
- Manipülatif arayüz yok: sahte geri sayım, gizli fiyat, yanıltıcı buton yok.

### Gizlilik ve yasal ilkeler

- Tasarımdan itibaren gizlilik: her veri toplama noktası docs/DATA_MAP.md'de listelenir (veri, amaç, hukuki sebep, aktarıldığı yer ve ülke, saklama süresi).
- Rıza gerektiren hiçbir SDK rıza alınmadan başlatılmaz.
- Serbest yazılı sohbet yok; sadece hazır mesajlar ve emojiler.
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
- Avukatla bir tanışma görüşmesi: KVKK, tüketici hukuku, 2026 çocuk ve oyun platformu düzenlemesinin projeyi kapsayıp kapsamadığı. Asıl inceleme Faz 10.5'te.

### Faz 0.3 — Proje yapısı ve dokümanlar [CC] (Y)

1. Şu dokümanların iskeletlerini oluştur: docs/GAME_DESIGN_MOBILE.md, docs/DATA_MAP.md, docs/QUALITY_BAR.md, docs/ASSET_LOG.md, docs/ART_BIBLE.md (boş, Faz 1.4'te doldurulacak), docs/OPS.md.
2. QUALITY_BAR.md'nin ilk versiyonu: düşük-orta seviye Android'de sabit 60 FPS, soğuk açılış süresi hedefi, kullanıcıların %99,5'inden fazlasında çökme yok, 48dp minimum dokunma alanı, ekran geçiş süreleri, görsel tutarlılık kontrol listesi.
3. PROGRESS.md'ye "Mobil yol haritası" başlığı ekle; bu dosyadaki tüm fazları onay kutusu listesi olarak yaz.
4. Web sürümünün yayını ve testleri bozulmadan çalışmaya devam etsin.

Bitti kriteri: Dokümanlar repoda, PROGRESS.md'de faz listesi var, web sürümü yayında.

---

## Bölüm 1 — Tasarım ve sanat yönü

### Faz 1.1 — Mobil oyun tasarım dokümanı [CC] (EY)

GAME_DESIGN_MOBILE.md'yi doldur:

1. Çekirdek döngü ve meta döngü (maç → ödül → ilerleme → kozmetik → tekrar).
2. Ekonomi: Altın ve Elmas'ın kaynakları ve harcama yerleri, günlük kazanç hedefleri.
3. Sezon Kartı yapısı (ücretsiz ve premium yol, 6–8 haftalık temalı sezonlar).
4. Kozmetik kategorileri: karakter skinleri, formalar, ayakkabılar, aksesuarlar, top skinleri, top izleri, gol patlama efektleri, gol kutlamaları, profil çerçeveleri, isim plakaları, maç öncesi giriş animasyonu, stadyum özelleştirmeleri.
5. Ürün kataloğu: reklamsız paket, başlangıç paketi, kurucu paketi, elmas paketleri, Sezon Kartı, VIP Kulüp aboneliği.
6. Reklam yerleşimleri: ödüllü reklamlar ve geçiş reklamı kuralları.
7. Modlar: online sıralamalı, arkadaşla özel oda, tek oyunculu turnuva/kariyer, antrenman, etkinlik modları.
8. İlk kullanıcı deneyimi (ilk 10 dakika), elde tutma özellikleri (günlük görevler, giriş ödülleri, başarımlar, etkinlikler).
9. Kazanmak için para ödenmemesi ilkesi ve bunun teknik uygulanışı.

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

- Figma'da: renkler, tipografi (Google Fonts gibi ticari kullanıma açık lisanslı fontlar; Türkçe karakterleri ğ, ü, ş, ı, İ, ö, ç mutlaka kontrol et), boşluk ölçeği, köşe yarıçapları, gölgeler, animasyon süreleri.
- 10 temel bileşen: birincil/ikincil buton, panel, sekme, kart, pop-up, bildirim, para göstergesi, ilerleme çubuğu, rozet.
- Token değerleri için Claude sohbetinden yardım al: ART_BIBLE'ı yükle, "bu rehbere göre arayüz tasarım token'larını tokens.json formatında öner" de.
- tokens.json'u repoya `design/tokens.json` olarak koy.

---

## Bölüm 2 — Mobil temel [CC]

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
5. Sonuçları QUALITY_BAR.md'ye işle.

Bitti kriteri: Test cihazında 15 dakika boyunca sabit 60 FPS.

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

1. design/tokens.json'u içe aktaran tasarım sistemi katmanı.
2. Faz 1.6'daki 10 bileşenin kod karşılıkları; tüm durumları (normal, basılı, devre dışı, yükleniyor).
3. Türkçe karakterleri içeren font atlasları, metin boyutunun dile göre uyumu.
4. Tüm bileşenleri gösteren vitrin sahnesi.

Bitti kriteri: Vitrin sahnesi Figma tasarımıyla yan yana konunca aynı görünüyor.

### Faz 3.5 — Ekran akışı ve geçişler (Y)

1. Ekran yönlendiricisi (scene router) ve tutarlı geri gezinme.
2. Ekran geçiş animasyonları, pop-up yığını, bildirim (toast) sistemi.
3. İpuçları gösteren yükleme ekranı.

Bitti kriteri: Tüm ekranlar arası geçiş akıcı ve tutarlı.

### Faz 3.6 — Görsel efekt ve "juice" kütüphanesi (Y)

1. Parçacık hazır ayarları, shader'lar (parlama, şok dalgası, vuruş flaşı).
2. Ekran sarsıntısı profilleri, hit-stop, ağır çekim, kamera yönetmeni (gol anı, tehlikeli atak).
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

- ART_BIBLE'daki tüm katmanlar ve ifade varyantları.
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
4. DATA_MAP.md güncellemesi.

Bitti kriteri: Hesap başka cihazda aynen geri yükleniyor.

### Faz 5.3 — Cüzdan ve envanter (EY)

1. Sunucu taraflı Altın/Elmas cüzdanı ve envanter.
2. Tekrar güvenli (idempotent) işlemler ve değiştirilemez işlem defteri.
3. İstemci asla bakiye belirleyemez; tüm değişiklikler sunucu RPC'leri ile.
4. Hile testleri: istemcide değer değiştirmenin işe yaramadığını kanıtlayan testler.

Bitti kriteri: Hile testleri geçiyor.

### Faz 5.4 — Uzaktan ayar, sürüm kontrolü, bakım modu (Y)

1. Ekonomi ve oyun değerlerinin sunucudan gelmesi.
2. Minimum sürüm kontrolü ve zorunlu güncelleme ekranı.
3. Bakım modu ve bakım mesajı.

Bitti kriteri: Sunucudan bir değer değiştirilince oyun yeniden derlenmeden etkileniyor.

### Faz 5.5 — Canlı sunucu (EY)

1. VPS'e kurulum (tercihen Türkiye'de veri merkezi), TLS, güvenlik duvarı.
2. Otomatik yedekleme ve geri yükleme testi.
3. İzleme ve uyarılar, DATA_MAP'e uygun log saklama süreleri.
4. docs/OPS.md: kurulum, güncelleme, yedekten dönme, olay müdahale adımları.

Bitti kriteri: Yedekten geri yükleme gerçekten denendi ve çalıştı.

---

## Bölüm 6 — Meta oyun [CC]

### Faz 6.1 — İlerleme altyapısı (Y)

XP ve seviye sistemi, ödül tabloları, ödül teslim ekranı ve animasyonları (sunucu taraflı).

### Faz 6.2 — Günlük görevler, başarımlar, giriş ödülleri (Y)

Görev havuzu ve günlük yenileme, başarım listesi, giriş ödülü takvimi; hepsi sunucu taraflı ve uzaktan ayarlanabilir.

### Faz 6.3 — Dolap ve envanter ekranı (Y)

Sahip olunan kozmetikleri görme, giydirme, önizleme; karakter bazlı kombinler.

### Faz 6.4 — Kozmetik mağazası (Y)

Günlük dönen vitrin, Altın/Elmas fiyatları, satın almadan önce önizleme, net fiyat gösterimi.

### Faz 6.5 — Sezon Kartı (EY)

Ücretsiz ve premium yol, sezon takvimi, seviye atlama, sezon sonu geçişi; tamamen sunucudan yönetilen sezon tanımları.

### Faz 6.6 — Karakter koleksiyonu ve tek oyunculu mod (Y)

Karakter açma sistemi (oynayarak açılabilir, satın almak sadece beklememek için); web'deki turnuva modunun mobil ilerlemeye bağlanması.

### Faz 6.7 — Kendi stadyumun (Y)

Tribün rengi, ışıklar, saha deseni, tezahürat seçimi; online maçta ev sahibi olunca rakibe gösterilmesi.

### Faz 6.8 — İlk kullanıcı deneyimi (EY)

1. Eğitim maçı (oynayarak öğretme, uzun metin yok).
2. Özelliklerin adım adım açılması (her şeyi ilk dakikada gösterme).
3. İlk 10 dakika akışı ve her adım için analiz olayları.

Bitti kriteri: Oyunu hiç görmemiş biri yardımsız ilk 3 maçı tamamlıyor.

### Faz 6.9 — Ekonomi simülasyonu ve denge (EY)

Oyuncu tiplerine göre (hiç harcamayan, az harcayan, çok harcayan) günlük kazanç ve ilerleme simülasyonu; Sezon Kartı'nın ücretsiz oyuncu için ulaşılabilirliği; rapor docs/ECONOMY_REPORT.md.

---

## Bölüm 7 — İçerik üretimi [SEN + yapay zekâ araçları] (diğer bölümlerle paralel)

Her parti bittiğinde Faz 7.6 çalıştırılır.

### Faz 7.1 — Karakterler 3–12

3'erli partiler halinde. Her karakter: tüm katmanlar, ifadeler, kendine özel süper şutun görsel kimliği.

### Faz 7.2 — Stadyumlar 2–4

Farklı atmosferler (gece maçı, kar, plaj, futuristik gibi), her biri tam parallax setiyle.

### Faz 7.3 — Kozmetik paketi v1

Kabaca: 20 top skini, 10 gol kutlaması (kodla animasyon + görsel), 10 gol patlama efekti, 10 top izi, 20 aksesuar, 12 forma.

### Faz 7.4 — Spiker ve kalabalık tam set

Türkçe ve İngilizce, olay başına yeterli varyasyonla toplam yaklaşık 300 replik; kalabalık ses seti.

### Faz 7.5 — Müzik seti

Menü, 2–3 maç parçası, sezon temaları, zafer/yenilgi kısa müzikleri.

### Faz 7.6 — İçerik partisi entegrasyonu [CC] (Y)

1. Yeni varlıkları manifest ve veri dosyalarına ekle; ASSET_LOG doğrulaması.
2. Yeni karakterler için denge simülasyonu (hiçbir karakter %55'ten fazla kazanmasın).
3. Mağaza ve dolap önizlemelerini kontrol et; ART_BIBLE uyum denetimi.

Bitti kriteri: Parti oyunda, denge raporu PROGRESS.md'de.

---

## Bölüm 8 — Para kazanma [CC]

### Faz 8.1 — RevenueCat ve ürün kataloğu (EY)

RevenueCat SDK, Faz 1.1'deki ürün kataloğunun tanımlanması, test ortamında satın alma akışı.

### Faz 8.2 — Sunucu taraflı doğrulama (EY)

Makbuz doğrulama ve webhook'lar, satın alma geri yükleme, iade durumunda içeriğin geri alınması, işlem defterine kayıt.

### Faz 8.3 — Satın alma deneyimi ve yasal bilgilendirme (Y)

1. Satın almadan önce ön bilgilendirme ekranı: fiyat TL ve vergiler dahil, Elmas paketinin karşılığı net.
2. Dijital içerikte cayma hakkı istisnası hakkında bilgilendirme ve kullanıcı onayı.
3. 18 yaş altı için harcama limiti ve ebeveyn onayı seçeneği.
4. Manipülatif arayüz denetimi (sahte geri sayım, gizli maliyet, yanıltıcı buton yok).

### Faz 8.4 — Teklifler (Y)

Başlangıç paketi (3. maçtan sonra bir kez), kurucu paketi (sadece lansman ayı), reklamsız paket, VIP Kulüp avantajları (reklamsızlık, günlük elmas, aylık özel skin, 2x XP, rozet), elmas paketleri; hepsi uzaktan yönetilebilir.

### Faz 8.5 — Ödüllü reklamlar (Y)

Yerleşimler: maç ödülünü 2 katına çıkarma, günlük bedava ödül, turnuvada elenince bir şans daha, skin'i 1 maçlığına deneme. Günlük sınırlar uzaktan ayardan.

### Faz 8.6 — Geçiş reklamı ve reklam rızası (Y)

1. Geçiş reklamı kuralları (sadece maç sonu, ilk 5 maç yok, sıklık sınırı).
2. Reklamsız paket ve VIP'te geçiş reklamının kapanması, ödüllü reklamın isteğe bağlı kalması.
3. Rıza durumuna göre kişiselleştirilmiş veya kişiselleştirilmemiş reklam.

Bitti kriteri: Tüm reklam kurallarının otomatik testleri var.

---

## Bölüm 9 — Online PvP [CC] (EY, her faz ayrı sohbet)

### Faz 9.1 — Ağ katmanı prototipi

İki yerel istemci arasında giriş (input) alışverişi; gecikme, titreşim (jitter) ve paket kaybı simülatörü.

### Faz 9.2 — Rollback netcode

Giriş gecikmesi + tahmin + geri sarıp yeniden simüle etme; durum özeti (checksum) ile tutarsızlık (desync) tespiti ve raporlama.
Bitti kriteri: 150 ms gecikme ve %2 paket kaybında maç akıcı; desync testi geçiyor.

### Faz 9.3 — Sunucuda maç yönetimi

Nakama üzerinden maç kurulumu, giriş aktarımı, maç sonucunun sunucu taraflı doğrulanması ve ödüllerin sunucudan verilmesi.

### Faz 9.4 — Eşleştirme

Beceri puanı (Glicko veya Elo), bölge/gecikme dikkate alınarak eşleştirme. Oyuncu azken bekleme uzarsa yapay zekâ rakiple oynama önerilir ve bunun yapay zekâ olduğu açıkça belirtilir.

### Faz 9.5 — Sıralamalı lig

Rütbeler, kupalar, sezon sonu ödülleri, liderlik tabloları (genel, ülke, arkadaşlar).

### Faz 9.6 — Sosyal ve dayanıklılık

Bağlantı kopması ve yeniden bağlanma, maçtan kaçma cezası, hazır mesajlar ve emojiler (serbest sohbet yok), arkadaş listesi, arkadaşla özel oda.

---

## Bölüm 10 — Gizlilik ve yasal uyum

### Faz 10.1 — Veri haritası ve ilk açılış [CC] (Y)

1. DATA_MAP.md'nin tüm SDK'lar ve sunucu dahil son hali.
2. İlk açılışta yaş sorusu ve aydınlatma ekranı (ayarlardan her zaman ulaşılabilir).

### Faz 10.2 — Rıza yönetimi [CC] (EY)

1. Kişiselleştirilmiş reklam, analiz ve pazarlama bildirimi için ayrı ayrı, her an geri alınabilir rıza.
2. AB kullanıcıları için Google UMP, iOS için takip izni (ATT).
3. Rıza yokken ilgili SDK'ların hiç başlatılmaması; bunun testi.

### Faz 10.3 — Gizlilik Merkezi [CC] (EY)

1. Verilerimi gör ve indir, düzelt, hesabımı ve verilerimi sil (sunucuda gerçekten silinir; yedeklerden silinme politikası OPS.md'de), rızalarım, başvuru formu.
2. Başvuruların 30 gün içinde yanıtlanması için takip listesi (yönetim panelinde, Faz 11.4).
3. Google Play için web üzerinden hesap silme sayfası.

### Faz 10.4 — Yasal metin taslakları [CC] (Y)

docs/legal altında, DATA_MAP'e dayanarak ve her birinin başında "AVUKAT ONAYI BEKLİYOR" ibaresiyle: KVKK aydınlatma metni, açık rıza metinleri, gizlilik politikası, kullanım koşulları, ön bilgilendirme formu, iade ve destek politikası.

### Faz 10.5 — Avukat incelemesi [PRO]

- Tüm yasal metinlerin ve akışların incelenmesi.
- Yurt dışına veri aktarımı: Firebase, AdMob, RevenueCat gibi servisler için standart sözleşmeler ve imzadan sonra 5 iş günü içinde Kurul'a bildirim.
- VERBİS durumu (muhtemelen muaf, ama diğer KVKK yükümlülükleri devam ediyor).
- 2026 çocuk ve oyun platformu düzenlemesinin projeyi kapsayıp kapsamadığı (yaş derecelendirmesi, ebeveyn kontrolü).
- Cayma hakkı ve mesafeli sözleşmelerdeki güncel durum.

### Faz 10.6 — Mağaza formları ve yayın [CC] (Y)

1. Google Play "Veri güvenliği" formu ve Apple "App Privacy" etiketleri için DATA_MAP'ten çıkarılmış hazır cevap tablosu.
2. Avukat onaylı gizlilik politikası ve kullanım koşullarının web sayfası olarak yayını (mevcut GitHub Pages altında).

---

## Bölüm 11 — Canlı operasyon

### Faz 11.1 — Etkinlik sistemi [CC] (Y)

Sunucudan açılıp kapanan zamanlı modlar (düşük yer çekimi, dev top, buzlu saha), etkinlik görevleri ve ödülleri.

### Faz 11.2 — Bildirimler [CC] (Y)

Rızaya bağlı, sıklığı sınırlı bildirimler (günlük ödül, sezon bitişi, etkinlik başlangıcı); sessiz saatler.

### Faz 11.3 — Analiz ve A/B testi [CC] (Y)

Analiz olayları ve huni (kurulum → ilk maç → 3. maç → 1. gün dönüşü → ilk satın alma), A/B test altyapısı, haftalık rapor şablonu.

### Faz 11.4 — Yönetim paneli [CC] (EY)

Kimlik doğrulamalı web paneli: oyuncu arama, envanter düzeltme (işlem defterine kayıtlı), teklif ve etkinlik yönetimi, bakım modu, destek ve KVKK başvuru takibi.

### Faz 11.5 — Destek ve SSS [CC] (Y)

Oyun içi destek formu, SSS ekranı, satın alma sorunlarında mağaza iade yönlendirmesi.

### Faz 11.6 — Yerelleştirme [CC] (Y)

10 dil; yapay zekâ çevirisi + oyun terimleri sözlüğü (glossary); uzun metinlerde taşma testi; mağaza açıklamaları dahil.

---

## Bölüm 12 — Yayın

### Faz 12.1 — Android sürüm hattı [CC] (Y)

AAB, Play App Signing, kademeli dağıtım, çökme sembollerinin yüklenmesi, sürüm notları şablonu.

### Faz 12.2 — iOS [CC] (EY)

Bulut macOS ile derleme (GitHub Actions macOS veya benzeri), Game Center, ATT, App Store Connect yapılandırması, iOS'a özel test listesi.

### Faz 12.3 — Kalite güvence turu [CC + SEN] (Y)

Cihaz test matrisi, otomatik duman testleri, regresyon kontrol listesi, performans raporu, QUALITY_BAR'ın tam doğrulaması.

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

## Ek A — Yayın öncesi yasal kontrol listesi

- [ ] Aydınlatma metni ilk açılışta ve ayarlarda
- [ ] Açık rızalar ayrı ayrı ve geri alınabilir
- [ ] Gizlilik Merkezi: indir, düzelt, sil, rızalar, başvuru
- [ ] Yurt dışı aktarım standart sözleşmeleri imzalandı ve 5 iş günü içinde bildirildi
- [ ] Veri güvenliği tedbirleri, saklama-imha politikası, veri ihlali müdahale planı
- [ ] Ön bilgilendirme, TL ve vergi dahil fiyat, cayma hakkı bilgilendirmesi
- [ ] Yaş sorusu, 18 yaş altı harcama limiti ve ebeveyn onayı
- [ ] Serbest yazılı sohbet yok
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
| Yasal hazır  | Faz 10.5     | Ek A tamamen işaretli                                  |
| Pazar hazır  | Faz 12.6     | Test lansmanı eşikleri tuttu                           |
