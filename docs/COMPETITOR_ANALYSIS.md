# Kafa Kafaya — Rakip Analizi

> **Tarih:** 20 Kasım 2026
> **Kaynak:** `Oyun_Ekranlari_Guncel.zip`: 11 oyundan 40 ekran görüntüsü (LDPlayer emülatörü)
> **Amaç:** Görsel stil, arayüz, para kazanma ve ilk açılış kalıplarını çıkarmak; Faz 1.3 stil testlerine girdi sağlamak
> **Kısıtlar (Kafa Kafaya):** 2D, yandan görünüm, 1v1 kafa topu · reklam + oyun içi satın alma · **rastgele ödül kutusu yok · parayla güç satışı yok**

**Okuma notu:** Tüm gözlemler durağan ekran görüntülerine dayanıyor. Animasyon, ses ve oyun hissiyle ilgili yorumlar **(çıkarım)** olarak işaretlendi. Ekranlarda net görülmeyen para kazanma unsurları "olası" diye yazıldı.

---

## İçindekiler

0. [Özet](#0-özet)
1. [Kapsam ve veri durumu](#1-kapsam-ve-veri-durumu)
2. [Oyun bazlı analiz](#2-oyun-bazlı-analiz)
3. [Karşılaştırma tabloları](#3-karşılaştırma-tabloları)
4. [Bu oyunları "kaliteli" gösteren ortak işaretler](#4-bu-oyunları-kaliteli-gösteren-ortak-işaretler)
5. [Sık yapılan hatalar ve ucuz görünen noktalar](#5-sık-yapılan-hatalar-ve-ucuz-görünen-noktalar)
6. [Kafa Kafaya'nın öne çıkabileceği boşluklar](#6-kafa-kafayanın-öne-çıkabileceği-boşluklar)
7. [Faz 1.3 için 3 stil yönü](#7-faz-13-için-3-stil-yönü)

---

## 0. Özet

- **Türün görsel dili doymuş durumda.** Dört doğrudan rakibin üçü (Kafa Topu 2, Head Soccer, Basketball Arena) aynı formülü kullanıyor: dişlerini sıkmış, öfkeli, karikatür futbolcu kafası, dev ayakkabı ve doygun renkler. Kafa Kafaya'nın en ucuz farklılaşma yolu **şekil dili ve tema**.
- **Kaliteli görünmenin sırrı tutarlılık.** En kaliteli görünen oyunlar tek bir motifi her ekrana taşıyor: Head Basketball'da LED skorbord, Basketball Arena'da neon ve eğik kesimler, Miniclip'te temiz şablon. En ucuz görünenler (Head Soccer, Soccer Stars) ise farklı dönemlerden ve çözünürlüklerden varlıkları karıştırıyor.
- **Rakiplerin para modeli, senin dışarıda bıraktığın iki şeye dayanıyor.** Altı oyunda rastgele paket/sandık/torba ya da parayla istatistik ekranda açıkça görülüyor (Kafa Topu 2 ve Mini Football'da ikisi birden). Head Basketball ve Soccer Stars'ta da güçlü işaretler var. "Kutu yok, güç satılmaz" Kafa Kafaya'nın vitrin cümlesi olabilir, ama ancak oyunda ve mağaza sayfasında **görünür** kılınırsa işe yarar.
- **Para kazanma yerleşimleri standartlaşmış:** üstte "+" düğmeli para çubuğu, yanlarda teklif ve "izle-kazan" kutuları, altta sandık/paket yuvaları, sezon kartı, mağazada geri sayımlar ve kayıp ekranında indirim.
- **En büyük UX boşluğu kalabalık.** Kafa Topu 2'nin ana menüsünde yaklaşık 31 dokunulabilir öğe, 11 bildirim rozeti ve 7 kilit var. Sade, "tek dokunuşla maç" sunan bir ana ekran tek başına ayrışma sağlar.
- **Önerilen 3 stil yönü:** **A) Mahalle Maçı:** sıcak, el çizimi, yerel mizah. **B) Gece Ligi:** koyu zemin, neon, rekabetçi enerji. **C) Yaylı Kafalar:** bobblehead oyuncak figürler, dokunsal 3D görünüm.

---

## 1. Kapsam ve veri durumu

| Oyun             | Yayıncı          | Yön   | Türe yakınlık                                           | Ekranlar | Not                                                                                       |
| ---------------- | ---------------- | ----- | ------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| Kafa Topu 2      | Masomo           | Yatay | **Doğrudan:** 1v1 kafa topu, çevrim içi                 | 5/5      | Hesap önceden oynanmış görünüyor (Sv 3, 12.600 coin). Gerçek ilk açılış eğitimi görülmedi |
| Head Soccer      | D&D Dream        | Yatay | **Doğrudan:** türün klasiği                             | 5/5      |                                                                                           |
| Head Basketball  | D&D Dream        | Yatay | **Doğrudan:** aynı mekanik, basketbol                   | 5/5      |                                                                                           |
| Basketball Arena | Masomo           | Yatay | **Doğrudan:** kafa topu mekaniği, basketbol, çevrim içi | 5/5      |                                                                                           |
| Mini Football    | Miniclip         | Yatay | Yakın: gerçek zamanlı futbol, 3D                        | 5/5      |                                                                                           |
| Basketball Stars | Miniclip         | Dikey | Yakın: 1v1 atış                                         | 5/5      | Eğitim maçına otomatik geçti                                                              |
| Football Strike  | Miniclip         | Dikey | Yakın: 1v1 serbest vuruş                                | 4/5      | Sonuç ekranı yok                                                                          |
| Soccer Stars     | Miniclip         | Yatay | Orta: sıra tabanlı fiske futbolu                        | 2/5      | Eğitim yönlendirmesi tıklamaya yanıt vermedi                                              |
| Tennis Clash     | Wildlife Studios | Dikey | Yakın: 1v1 spor                                         | 1/5      | Yalnızca yükleme ekranı                                                                   |
| Carrom Pool      | Miniclip         | Dikey | Uzak: 1v1 masa oyunu                                    | 1/5      | Yalnızca dil/giriş ekranı                                                                 |
| 8 Ball Pool      | Miniclip         | Yatay | Uzak                                                    | 0/5      | Emülatörü güvenlik tehdidi sayıp kapandı                                                  |

> Ağırlık en çok **dört doğrudan rakipte** (ilk dört satır). Miniclip oyunları özellikle arayüz şablonu ve mağaza kalıpları için değerli.

---

## 2. Oyun bazlı analiz

### 2.1 Kafa Topu 2 (Head Ball 2)

**Tek cümlede:** Türün bugünkü vitrini. Üretim kalitesi yüksek, ama ana menü bir "özellik pazarına" dönüşmüş.

**Görsel stil**

- **Renk:** Doygun ve yüksek kontrastlı. Yükleme ekranında mor-turuncu gün batımı ve stadyum projektörleri, mağazada mavi altıgen desen, sonuç panelinde camgöbeği. Ekranların ana rengi değişiyor ama doygunluk seviyesi tutarlı.
- **Işık:** Yükleme ekranı sinematik: projektörler ve karakterlerin kenarında sıcak ışık var. Maç sahnesi ise düz ve neredeyse gölgesiz vektör.
- **Çizgi:** Kalın, koyu dış çizgi ve 2–3 tonlu hücre gölgelendirme (cel shading). Logo tıknaz harflerden oluşuyor, harfler tek tek renklendirilmiş (yeşil/turuncu/mavi).
- **Karakterler:** Gerçek futbolcuları çağrıştıran karikatürler: abartılı çene, kaş ve sakal, dişleri sıkılı öfkeli ifade. Dev kafa + tek ayakkabı. Kimlik kafanın etrafındaki aksesuarla kuruluyor (soytarı yakası, palyaço, kafatası, robot, aslan).

**Arayüz dili**

- **Butonlar:** Tıknaz, kabartmalı, alt gölgeli. Birincil eylem parlak yeşil (OYNA + düdük ikonu). Kapatma kırmızı yuvarlak X. Maç kontrolleri turuncu kabartma: iki yön oku ve ayakkabı ikonlu üç eylem butonu.
- **Paneller:** Yuvarlatılmış koyu lacivert/camgöbeği, altıgen doku. Mağaza kartları folyo paket ambalajı şeklinde.
- **Tipografi:** Kalın, yuvarlak hatlı, koyu kontürlü beyaz/sarı yazı. Yerelleştirme eksiksiz ("Yükleniyor %0", "Berabere", "Kalan: 5").
- **İkonlar:** Nesne tabanlı ve renkli (hediye kutusu, takvim, gazete). Neredeyse her ikonda kırmızı "!" ya da sayı rozeti var.
- **Maç HUD'u:** Üst ortada kullanıcı adları ve bayraklı dijital skorbord (0 · 60 · 0). Solda ayar ve sohbet/ifade düğmesi, sağda süper güç düğmeleri. Oyuncunun üstünde yeşil "sen buradasın" oku.
- **Animasyon izlenimi (çıkarım):** Paketlerde folyo parlaması, sonuç ekranının arkasında radyal hız çizgileri, rozetlerde dikkat çeken zıplama.

**Para kazanma yerleşimleri**

- **Üst çubuk:** Coin (12.600) ve elmas (18), ikisinde de yeşil "+" var.
- **Sol sütun:** "Reklamları Kaldır" en üstte, sonra Kulüp Kartı (kilitli, olası VIP/abonelik), Market ve "Kıyamet Fırsatları" ("Ücretsiz" etiketli teklif).
- **Sağ sütun:** Günlük Ödüller, **"İzle & Kazan"** (ödüllü reklam), Duyurular, Sosyal.
- **Merkez:** Arena, Etkinlik (kilitli), **Sezon Bileti** (rozetli).
- **Alt:** OYNA'nın üstünde 6 soru işaretli kart yuvası ve "2x" etiketi. Alt şeritte Süper Güçler, Karakterler (yükseltme oku ile) ve kilitli Antrenörler, Takım, Koleksiyon, Kariyer, Menajer.
- **Mağaza:** "Kart Paketi" sekmesi: Sıradan (3.500 coin), Nadir (25 elmas), Efsanevi (50), Epik (100, "Bonus kart şansı!"), Aksesuar (20); hepsinde "Kalan: 5". Diğer sekmeler kart, koleksiyon, 2X ve elmas. **Rastgele içerik + kartla karakter yükseltme**, yani şans kutusu ve güç ekonomisi bir arada.
- **Maç içi:** Kale arkasındaki panolarda sponsor/marka reklamı ("Kazandırio!"), üstte video görüntülü dev ekranlar.

**İlk açılış akışı**

- Anahtar görsel + yüzdelik yükleme çubuğu + sürüm numarası, ardından doğrudan ana menü. Hesap önceden oynanmış olduğu için ilk maç eğitimi değerlendirilemedi.

**Kafa Kafaya için**

- ✅ **Al:** Karakter kimliğini kafanın çevresindeki aksesuarla kurmak (kozmetik satışına çok uygun) · maçtaki "sen" oku · tam Türkçe arayüz.
- ❌ **Alma:** 30'a yakın öğeli ana menü · rastgele paketler · "Reklamları Kaldır"ı ana ekranın en görünür köşesine koymak (oyuncuya ilk bakışta "burada çok reklam var" mesajı veriyor).

---

### 2.2 Head Soccer

**Tek cümlede:** Türü tanımlayan klasik. Karakter mizahı hâlâ güçlü, ama teknik görünüm yaşlanmış.

**Görsel stil**

- **Renk:** Doygun ama çamurlu tonlar. Logo ateş turuncusu-sarı ve çatlak efektli, top logoyu kırıp geçiyor.
- **Işık:** Düz ve yönsüz. Maç sahnesindeki kalabalık düşük çözünürlüklü, neredeyse pikselli.
- **Çizgi:** Karışık. Ana menüde boyalı illüstrasyon, maçta küçük piksel-sprite'lar, mağazada vektör yazılar var. **Çözünürlük ve stil tutarsız.**
- **Karakterler:** Dev kafa, minik gövde, kalın kaşlar. Sonuç ekranında kaybeden kafa kararıyor, terliyor ve "OH MY GOD" konuşma balonu çıkıyor. Duyguyu karakterin oynadığı bu an türün en sevimli mizah örneklerinden.

**Arayüz dili**

- **Butonlar:** Hap şeklinde parlak (gloss) butonlar. Seçili mod kırmızı, diğerleri soluk. Mod karuselinde sarı çift oklar var.
- **Paneller:** Yeşil çim dokulu paneller, mavi zemin, kalın beyaz kenar.
- **Tipografi:** İtalik, kalın, kontürlü. Büyük-küçük harf kullanımı ve yazı tipi karışık ("Buy", "BACK", "MY POINT").
- **Maç HUD'u:** Üstte bayraklar, "TIME 1:00", kanatlı/şimşekli güç çubukları ve altında güç-eşya ikonları. Altta yarı saydam paralelkenar L / R / KICK / JUMP butonları. Oyuncunun üstünde mor "YOU" balonu.

**Para kazanma yerleşimleri**

- **Ana menü:** "FREE POINT" düğmesi (ödüllü reklam ya da teklif duvarı olabilir), hediye kutusu, sağ üstte Head Basketball çapraz tanıtımı, mod karuselinin **içinde** "MORE GAMES".
- **Mağaza:** Upgrade / Costume / Pet / Body sekmeleri. Upgrade'de Speed, Kick, Jump, Dash, Power, Survival istatistikleri 500'er puan ve altta dev bir **"Get More Point"** butonu var. Puan satın alınıp istatistik yükseltilebiliyor, yani **doğrudan parayla güç**.
- **Maç:** Stadyum panolarında kripto para dahil gerçek reklam görselleri ("TO THE MOON").
- **Sonuç:** Kaybedince "Reward Point 0 / Total Point 0" yazıyor. Ödül alanı tamamen boş.

**İlk açılış akışı**

- Stadyum arka planlı logo ekranından doğrudan ana menüye geçiliyor (Arcade seçili). Onay ekranı ya da eğitim görünmüyor; en kısa akış bu.

**Kafa Kafaya için**

- ✅ **Al:** Karakter mizahı (kaybedenin terlemesi, konuşma balonları) · modların tek satırda seçilmesi.
- ❌ **Alma:** Karışık çözünürlük · parayla istatistik · **ayna maç** (Kore'ye karşı Kore, aynı yüz; kimin kim olduğu yalnızca "YOU" balonundan anlaşılıyor).

---

### 2.3 Head Basketball

**Tek cümlede:** Aynı stüdyonun daha olgun işi. Tek bir görsel motifi (LED skorbord) her ekrana yayarak ucuz görünmekten kurtuluyor.

**Görsel stil**

- **Renk:** Ana menü koyu ve sıcak (siyah-kırmızı-turuncu arena), maç gün ışığında bir Kore sokağı, mağaza kırmızı (Locker Room) ve sarı (Shop) iki paneli yan yana koyuyor.
- **Işık:** Ana menü dramatik: spot ışıkları, alevli top, parıltılar. Maç arka planı detaylı ve boyalı, karakterler önde net.
- **Çizgi:** Boyalı illüstrasyon ve yumuşak gölge. Head Soccer'a göre çok daha temiz ve tek çözünürlükte.
- **Karakterler:** Dev kafa, alev desenli ayakkabı ve bileklik, smaç anında dinamik poz. Sahanın kenarındaki chibi seyirci kafaları sahneyi canlı tutuyor.

**Arayüz dili**

- **Butonlar:** Yuvarlatılmış kırmızı hapın içinde turuncu nokta-matris (LED) yazı ve ikon. PLAY, RETRY, NEXT ve ayarlar aynı dilde, **tamamen tutarlı.**
- **Paneller:** Fırça darbesi şeklinde başlık plakaları (LOCKER ROOM, SHOP), koyu kenarlı kırmızı ve sarı paneller.
- **Tipografi:** Başlıklar kalın ve krom görünümlü, butonlarda LED piksel yazı. Sonuç ekranında dev krom "LOSE".
- **İkonlar:** Nesne tabanlı. Mağaza kategorileri doğrudan vücut bölgesine göre: Top, Middle, Bottom, Mask, Hands, Feet.
- **Maç HUD'u:** LED skorbord (00 · 0:57 · 00), sayısal güç/dayanıklılık çubukları (50/50, 52/52), güç-eşya ikonları. Kontroller çok şeffaf LED butonlar: sahne temiz kalıyor ama butonlar **zor seçiliyor.**

**Para kazanma yerleşimleri**

- **Mağaza:** Kozmetik kategoriler + "POINTS" (coin paketleri) + "SPECIALS" ("LIMITED" etiketli paket). İki para birimi var: P-coin ve düdük.
- **Soyunma odası:** "STAT" düğmesi ve OVR 10 değeri, eşyaların karakter gücünü etkilediğini düşündürüyor (çıkarım).
- **Sonuç ekranı:** Sağda **"85% OFF · 1,000,000 coin · 59M59S"** geri sayımlı teklif kartı var. Oyuncu **kaybettiği anda** indirim görüyor. Ayrıca "Missions" rozet ızgarası ve LV 1 XP çubuğunun yanında "+" düğmesi (olası hızlandırma satışı).

**İlk açılış akışı**

- Yayıncı logosu + "LOADING...", ardından 5 butonlu ana menü. Çok sade.

**Kafa Kafaya için**

- ✅ **Al:** Tek tema motifini her ekrana taşıma disiplini · vücut bölgesine göre kozmetik kategorileri · sonuç ekranında görev ve seviye ilerlemesi.
- ❌ **Alma:** Neredeyse görünmez kontroller · kayıp anında agresif indirim teklifi.

---

### 2.4 Basketball Arena

**Tek cümlede:** Modern "kartlı ana menü"nün en derli toplu örneği. Clash Royale tarzı sandık ekonomisini kafa topu mekaniğine giydirmiş.

**Görsel stil**

- **Renk:** Elektrik mavisi-mor zemin üstünde turuncu, yeşil ve mor kartlar. Maçta camgöbeği sokak sahası, grafitili duvar. Yüksek doygunluk, neon vurgular.
- **Işık:** Kart ve karakter kenarlarında parlama (glow). Maçta düz ışık ve hafif ortam gölgesi.
- **Çizgi:** Kalın kontürlü vektör karikatür.
- **Karakterler:** Gerçek kişileri çağrıştıran karikatür yüzler ve fantastik karakterler ("The Raptor" dinozor, "Gladiator"). Takım konsepti var: antrenör + oyuncular, maçta yedek oyuncu kartları.

**Arayüz dili**

- **Butonlar:** Eğik kenarlı. Birincil eylem fosforlu limon yeşili (KABUL ET, OYNA).
- **Paneller:** Büyük illüstrasyonlu kartlar (Market, Takımım, Sezon Bileti, Süper Güçler, Etkinlik), her biri kendi renginde. Solda dikey ikon rayı.
- **Tipografi:** Dar, kalın, italik ve tamamen büyük harf ("HOŞ GELDİN", "KAYBETTİN"). Türkçe karakterler düzgün.
- **Maç HUD'u:** Kısaltılmış kullanıcı adları (BİL 0 – 3 FAR), sarı dijital süre, altında maç noktası göstergeleri. Kontroller neon çerçeveli yuvarlak ve yarı saydam (depar, şut, zıplama); **şık ve okunaklı.**
- **Sonuç:** Ayrı panel yok. Maç sahnesi kararıyor, kırmızı fırça yazıyla "KAYBETTİN" çıkıyor, iki tarafta "Galibiyet Serisi" etiketi ve sağda hazır ifade paneli var (gülme, "BOL ŞANS", "İYİ OYUN").

**Para kazanma yerleşimleri**

- **Ana menü:** Market kartı (sandık, coin ve elmas illüstrasyonuyla), Sezon Bileti "Yıldızlar" (kilitli), sol rayda coin rozeti ve günlük takvim, hediye ikonu. Altta 4 **"Sandık Slotu"** (zamanlı açılan sandık yuvaları), üstte kupa yolu ve kilitli ödül.
- **Mağaza:** "Yeni · Kilidi Aç!" karakter kartları ve sandıklar: Ücretsiz "Hemen Aç", Nadir 120, Destansı 240, Efsanevi 1.200 elmas.

**İlk açılış akışı**

- Yükleme ekranının üstünde "Hoş Geldin" gizlilik/hizmet şartları onayı (tek yeşil buton), ardından ana menü. **Zorunlu onay ekranı bile oyunun panel ve yazı diliyle tasarlanmış.**

**Kafa Kafaya için**

- ✅ **Al:** Onay ekranını oyunun diliyle tasarlamak · sonuç ekranını sahnenin içinde göstermek · hazır ifade paneli · neon çerçeveli kontroller.
- ❌ **Alma:** Sandık slotları ve rastgele sandıklar · boş yuvaların "Sandık Slotu" yazısıyla beklemesi (bitmemiş görünüyor).

---

### 2.5 Mini Football

**Tek cümlede:** Ferah, "konsol kalitesi" hissi veren 3D sunum. Mağazası ise incelenenlerin en agresiflerinden.

**Görsel stil**

- **Renk:** Gerçekçiye yakın çim yeşili ve gökyüzü mavisi. Arayüzde koyu lacivert-mor zemin, sarı ve yeşil vurgular.
- **Işık:** Ana menüde alan derinliği (arka plan bulanık, karakter net), yumuşak gün ışığı ve gölge.
- **Çizgi:** Çizgisiz, yumuşak gölgeli stilize 3D.
- **Karakterler:** Büyük kafa, ama kafa topu oyunlarına göre daha gerçekçi oranlar. Forma numarası ve takım arması ile kimlik.

**Arayüz dili**

- **Butonlar:** Büyük sarı-turuncu OYNA ("YENİ" etiketli), yeşil satın alma butonları, kare ikonlu yan butonlar (Dükkân, Takım, Arkadaşlar).
- **Paneller:** İstatistikli oyuncu kartları (FIFA Ultimate Team'i çağrıştırıyor), altta yatay sekme şeridi.
- **Tipografi:** Kalın, dik (italik olmayan) sans. Okunaklı.
- **Maç HUD'u:** Mor skor bandı, takım armaları, süre (0:45). Sol altta sanal joystick, sağda Kay / Depar / Değiştir. Minimum HUD.
- **Sonuç:** Mavi çapraz şeritli zemin ve konfeti. Arena adı ("OLD TOWN"), "GALİP!", coin ve taç ödülü. Üstte görev ilerleme bandı ("Gol yemeden 2 maç kazan 1/2").

**Para kazanma yerleşimleri**

- **Ana menü:** "Ücretsiz +100" elmas (olası ödüllü reklam), "Ücretsiz" etiketli Dükkân, Sezon Bileti ("4. seviyede açılır": kilitli ama görünür), altta 4 boş yuva.
- **Dükkân:** Geri sayımlı oyuncu kartları (Dundee: 750 elmas, "2D 15H"; Dark Cyber Deal: **₺359,99**, "15H 17M"), Fortune's Favor (0/20 ilerleme), "Efsanevi Garantilidir" yazılı Efsanevi Paket (₺119,99), video ikonlu Basic paket (reklam izleyerek). **9 sekme:** Player Deal, Dark Cyber Deal, Talih Yanında, Paketler, Günlük Fırsatlar, Ücretsiz Ödüller, Reklam Paketi, Paralar, Cevher. Fiyatlar yerel para biriminde (₺).
- **Maç ekonomisi (çıkarım):** Maç öncesi bakiye 305 coin, sonuç ekranında 275 + 50 ödül görünüyor. Bu, arenaya giriş ücreti ödenen bir modele işaret ediyor.

**İlk açılış akışı**

- Düz mavi zeminde oyun ve yayıncı logosu, ardından misafir hesapla ana menü (GUEST_DA0011). Kayıt zorunlu değil.

**Kafa Kafaya için**

- ✅ **Al:** Ana menünün ferahlığı · alan derinliğiyle karakteri öne çıkarma · sonuç ekranında görev bandı.
- ❌ **Alma:** Gerçek parayla istatistikli oyuncu kartı · 9 sekmeli mağaza · geri sayımla aciliyet baskısı · ham "GUEST_" isimleri.

---

### 2.6 Basketball Stars

**Tek cümlede:** Miniclip'in dikey spor şablonu: gerçekçi 3D sporcu, tek dev OYNA butonu, alt sekme çubuğu.

**Görsel stil**

- **Renk:** Mavi yarım tonlu (halftone) degrade zemin, turuncu forma, sarı ve yeşil vurgular.
- **Işık:** Gerçekçi stüdyo ışığı. Maç güneşli bir kent sokağında.
- **Çizgi:** Çizgisiz, yarı gerçekçi 3D. Tuğla ve grafiti dokuları fotoğrafa yakın.
- **Karakterler:** Gerçekçi oranlı, ifadesiz sporcular. Mizah yok, kişilik kıyafetten geliyor.

**Arayüz dili**

- **Butonlar:** Eğik turuncu OYNA, karakterin tam ortasında. Alt sekmeler renk kodlu: Mağaza yeşil, Arkadaşlar mavi, Özelleştirme turuncu, Liderlik açık mavi.
- **Tipografi:** Kalın, gölgeli sans. Türkçe ("Meydan Okumalar", "Günlük teklifler").
- **Maç HUD'u:** Profil fotoğraflarının çevresinde süre halkası, ortada **500 nakitlik pot**, solda zamanlama ölçeri ("MÜKEMMEL GÜÇ"), x2 seri çubuğu.
- **Sonuç:** Arena logosu ("Underdogs Court"), iki tam boy oyuncu, kazananın arkasında sarı parıltı ve "KAZANAN" yazısı, sohbet balonu.

**Para kazanma yerleşimleri**

- **Ana menü:** "ÜCRETSİZ ödüller!" (film klaketi ikonu, yani ödüllü video), hediye kutusu, çark ikonlu Mini Oyunlar. İki para birimi: altın külçe ve nakit.
- **Mağaza:** Geri sayımlı "Günlük teklifler" afişi ("Her 24 saatte yeni fırsatlar"), Bedava Nakit (450), **"ÜCRETSİZ ödüller" (500, "İzle!", 4 adımlı reklam merdiveni)**, kozmetik top ("Gülen Yüz", 5 altın). Torbalar: Standart / Premium (30) / VIP (60), "Satın alınan torbalar derhal açılır".
- **Maç:** Giriş potu, yani bahis modeli.

**İlk açılış akışı**

- Mavi zemin + logo + dönen top yükleyicisi. Kayıt notuna göre ardından doğrudan eğitim maçı, sonra ana menü. **Oyuncuyu menüden önce maça sokuyor.**

**Kafa Kafaya için**

- ✅ **Al:** İlk dakikada menü yerine maç · ödüllü reklamı ilerleme adımlarına bölmek.
- ❌ **Alma:** Rastgele torbalar · ifadesiz gerçekçi karakterler (kafa topunun mizahına ters).

---

### 2.7 Football Strike

**Tek cümlede:** Basketball Stars'la aynı şablon, yeşile boyanmış. Tek bir arayüz şablonunun birden fazla oyunda kullanılabileceğinin kanıtı.

**Görsel stil**

- Yeşil marka rengi, stadyum ışıklarından bokeh. Gerçekçi 3D futbolcu. Maçta Türk bayraklı kalabalık, kaleci ve serbest vuruş kamerası. Kalabalık yoğun ve detaylı.

**Arayüz dili**

- Ortada sarı dev "Oyna". Altta 5 sekme: Ana Sayfa, Arkadaşlar, Özelleştirme, Liderlik, Mağaza.
- Sağda kilitli "Kariyer" ("5. seviyede açılır") ve "Çevir ve Kazan" ("Ücretsiz çevirme var!").
- Maçta iki tarafta 5 noktalı vuruş takibi ve ortada duraklat düğmesi.

**Para kazanma yerleşimleri**

- Üst çubuk: nakit 20 ve coin 800, ikisinde de "+". "Ücretsiz Para · Şimdi al!" kutusu.
- **Top Mağazası:** Geri sayım (16s 10dak). Temel top ("Kullanılan" etiketi, 1/3 seviye ilerlemesi), Bleus (160), Hain (600). Seviye çubuğu topların yükseltilebildiğini gösteriyor; istatistiğe etkisi ekrandan doğrulanamadı.
- **"Seçkinler Torbalar":** Premium / Şampiyon / VIP, "derhal açılır".
- **Şans çarkı:** Ücretsiz bile olsa rastgele ödül.

**İlk açılış akışı**

- Düz yeşil logo ekranından misafir hesapla ana menüye.

**Kafa Kafaya için**

- ✅ **Al:** Mağaza ürününde "Kullanılan/Sahip" etiketi (oyuncu neye sahip olduğunu anında görüyor).
- ❌ **Alma:** Şans çarkı (kuralınla çelişir; yerine önceden görünen, sabit ödüllü günlük takvim koy).

---

### 2.8 Soccer Stars

**Tek cümlede:** Uzun ömürlü ama yaşlanmış bir arayüz. Kaliteyi en hızlı düşüren şeyin dil hataları olduğunu gösteriyor.

**Görsel stil**

- Koyu yeşil logo ekranı. Ana menüde bulanık gece stadyumu, parlak gradyanlı logo, gri-beyaz eğimli kartlar (1'e 1 Oyna, Mini Oyunlar, Özel Etkinlikler). 2010'ların başını hatırlatan estetik.

**Arayüz dili**

- Üstte 7 ikonlu yatay şerit (Arkadaşlar, Hediyeler, Daily Rewards, Yarışmalar, VIP Paketi, Madeni Para ve para birimleri). Hepsi aynı ağırlıkta, **hiyerarşi yok.**
- **Yarım çeviri ve taşma:** "DAILY REWA…" / "Collect Now!" İngilizce kalmış, "…RIŞMALAR" kesilmiş. Menünün üstüne yeşil bir oyun kumandası simgesi biniyor (muhtemelen sistem katmanı).
- Sarı eğitim oku "1'e 1 Oyna"yı gösteriyor.

**Para kazanma yerleşimleri**

- VIP Paketi, "Madeni Para · Hemen Alın!" (5 rozet), Galaxy Pass (sezon kartı), sol altta sepetli "Mağaza", altta 4 "Paket Yuvası", Yarışmalar geri sayımı (02g 18sa).

**İlk açılış akışı**

- Logo + dönen top, ardından misafir hesapla ana menü ve eğitim oku. Emülatörde yönlendirme tıklamalara yanıt vermedi.

**Kafa Kafaya için**

- ❌ **Alma:** Kısmi çeviri · metin taşması · hiyerarşisiz ikon şeridi.

---

### 2.9 Tennis Clash _(yalnızca yükleme ekranı)_

- **Görsel stil:** İncelenenler arasındaki en yüksek üretim değeri. Gün ışığında, stilize 3D (animasyon filmi kalitesi). 9 karakterlik dinamik grup kompozisyonu, sıçrayan pozlar. Bazı karakterler gerçek tenisçilere gönderme yapıyor (formada "KYRGIOS"). Eğik, mavi-limon logo.
- **Arayüz dili:** Yeşil yükleme çubuğu (%49), altında oyun ipucu ("Resmine dokunup kariyerine genel bakışı ve maç geçmişini gör"), köşede sürüm numarası.
- **İlk açılış akışı:** Kayıt notuna göre yükleme, gizlilik ekranı, ardından eğitim.
- **Para kazanma:** Görülmedi.
- **Kafa Kafaya için:** Yükleme süresini ipucuyla doldurmak · tüm kadroyu tek kompozisyonda gösteren "vitrin görseli" (mağaza sayfası görseli için de iyi bir örnek).

### 2.10 Carrom Pool _(yalnızca giriş ekranı)_

- **Görsel stil:** Sıcak kırmızı-kahve ahşap tema, parlak metalik logo.
- **Arayüz dili:** İlk ekranda 8 dil seçeneği. Büyük renkli giriş butonları: Facebook mavi, Misafir turuncu, Google Play yeşil. Altta hüküm ve gizlilik bağlantıları.
- **Para kazanma / ilk açılış:** "Bonus mücevher ve para almak için giriş yap": hesap bağlama ödülle teşvik ediliyor, misafir seçeneği de açık.
- **Kafa Kafaya için:** ✅ Misafir seçeneği + hesap bağlama ödülü. ❌ Oyundan önce 3 seçenekli giriş duvarı (hesap bağlamayı ilk birkaç maçtan sonra istemek daha az sürtünmeli).

### 2.11 8 Ball Pool _(analiz edilemedi)_

- Emülatörde "güvenlik tehdidi" uyarısıyla kapandı. Tasarım açısından tek çıkarım şu: çevrim içi ve satın almalı oyunlar cihaz/istemci bütünlüğü kontrolüne ciddi yatırım yapıyor. Kafa Kafaya çevrim içi PvP'ye geçerse sunucu taraflı satın alma doğrulaması ve hile önlemi plana girmeli.

---

## 3. Karşılaştırma tabloları

### 3.1 Para kazanma matrisi

`✓` ekranda görüldü · `◐` olası (çıkarım) · `–` görülmedi

| Oyun             | Rastgele paket / sandık | Parayla güç                | Ödüllü reklam girişi  | Reklam kaldırma | Sezon kartı   | Zamanlı teklif         | Para birimi   |
| ---------------- | ----------------------- | -------------------------- | --------------------- | --------------- | ------------- | ---------------------- | ------------- |
| Kafa Topu 2      | ✓ kart paketleri        | ✓ kart/süper güç yükseltme | ✓ İzle & Kazan        | ✓ ana menüde    | ✓             | ◐ Kıyamet Fırsatları   | coin + elmas  |
| Head Soccer      | –                       | ✓ istatistik satın alma    | ◐ FREE POINT          | –               | –             | –                      | puan          |
| Head Basketball  | ◐ Specials              | ◐ OVR / STAT               | –                     | –               | –             | ✓ kayıp ekranında %85  | coin + düdük  |
| Basketball Arena | ✓ sandık + slot         | ◐ Süper Güçler             | –                     | –               | ✓             | –                      | elmas + coin  |
| Mini Football    | ✓ paketler              | ✓ istatistikli kart (₺)    | ✓ Reklam Paketi, +100 | –               | ✓             | ✓ geri sayımlı kartlar | elmas + coin  |
| Basketball Stars | ✓ torbalar              | –                          | ✓ 4 adımlı "İzle"     | –               | –             | ✓ günlük teklifler     | altın + nakit |
| Football Strike  | ✓ torbalar + çark       | ◐ top seviyeleri           | ✓ Ücretsiz Para       | –               | –             | ✓ top mağazası         | nakit + coin  |
| Soccer Stars     | ◐ paket yuvaları        | –                          | –                     | –               | ✓ Galaxy Pass | –                      | nakit + coin  |

**Okuma:** Altı oyunda ilk iki sütundan en az biri açıkça işaretli, kalan ikisinde olası. Sekiz oyunun yedisi iki para birimi kullanıyor.

### 3.2 Ana menü yoğunluğu

_Ekran görüntülerinden elle sayıldı; ±2 hata payı var._

| Oyun             | Dokunulabilir öğe | Bildirim rozeti | Kilit | Birincil buton              |
| ---------------- | ----------------- | --------------- | ----- | --------------------------- |
| Kafa Topu 2      | ~31               | 11              | 7     | sol alt, yeşil              |
| Basketball Arena | ~23               | 2               | 2     | sağ alt, limon yeşili       |
| Soccer Stars     | ~17               | 6               | 0     | ayrı OYNA yok (3 eşit kart) |
| Football Strike  | ~15               | 2               | 1     | orta, sarı                  |
| Head Soccer      | ~13               | 0               | 0     | alt orta karusel, kırmızı   |
| Basketball Stars | ~13               | 3               | 0     | orta, turuncu               |
| Mini Football    | ~13               | 1               | 1     | sağ alt, sarı-turuncu       |
| Head Basketball  | 5                 | 0               | 0     | sol, kırmızı LED            |

**Okuma:** En kaliteli görünen iki ana menü (Head Basketball ve Mini Football) aynı zamanda en sadeleri. Yatay oyunlarda birincil butonun en yaygın yeri sağ alt, yani sağ başparmağın doğal konumu.

### 3.3 İlk açılış kalıpları

| Kalıp                                 | Kim yapıyor                                                                | Değerlendirme                                         |
| ------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------- |
| Logo, sonra doğrudan menü             | Head Soccer, Head Basketball, Mini Football, Football Strike, Soccer Stars | Hızlı ama oyuncu ne yapacağını menüde kendisi buluyor |
| Logo, sonra doğrudan eğitim maçı      | Basketball Stars, Tennis Clash                                             | **En iyi kalıp:** ilk 30 saniyede oynanış             |
| Oyun stilinde onay ekranı             | Basketball Arena, Tennis Clash                                             | Zorunlu adımı markanın parçası yapıyor                |
| Giriş duvarı (dil + 3 giriş seçeneği) | Carrom Pool                                                                | En sürtünmeli kalıp                                   |
| Anahtar görselli yükleme + ipucu      | Kafa Topu 2, Tennis Clash                                                  | Bekleme süresini vitrine çeviriyor                    |

---

## 4. Bu oyunları "kaliteli" gösteren ortak işaretler

1. **Her ekranda tek bir imza motif.** Head Basketball'un LED nokta-matrisi butonlarda, skorbordda ve sonuç ekranında; Basketball Arena'nın eğik kesimleri ve neon çerçeveleri her panelde. Oyuncu hangi ekranda olursa olsun aynı oyunda olduğunu hissediyor.
   → **Kural:** Faz 1.3'te seçilecek yönün bir imza motifi olsun ve buton, skor, sonuç ve mağaza ekranlarında tekrar etsin.

2. **Karakter = duygu.** En akılda kalan kareler duygunun abartıldığı anlar: Kafa Topu 2'de sıkılmış dişler, Head Basketball'da çığlık atarak smaç, Head Soccer'da terleyen kaybeden kafa.
   → **Kural:** Her karakterin en az 4 ifadesi olsun: nötr, sevinç, zorlanma/öfke, yenilgi.

3. **Tek birincil eylem, tek renk.** OYNA her yerde en büyük ve en doygun öğe. Rengi (yeşil, limon, sarı) başka hiçbir yerde kullanılmıyor.

4. **Sabit para çubuğu.** Üst kenarda ikon + sayı + "+", her ekranda aynı konumda. Oyuncu bakiyesini hiç aramıyor.

5. **Kalın, kontürlü, eğik başlık; sade gövde.** Başlıklar enerjik (italik, dış çizgili), gövde metni düz sans. Yerelleştirme eksiksiz.

6. **Maçta sahne sakin, karakter net.** Arka planın kontrastı ve doygunluğu karakterden düşük. HUD yalnızca üst bant ve alt köşelerde. Kafa Topu 2'nin düz arka planı ve Head Basketball'un detaylı ama soluk sokağı aynı ilkeyi iki farklı yoldan uyguluyor.

7. **Sonuç ekranı bir "an".** Büyük başlık, iki avatar, skor, ödül, ilerleme (görev, XP, galibiyet serisi) ve sosyal tepki (ifade paneli). Konfeti ya da hız çizgileriyle hareket hissi.

8. **Kademeli açılım.** Kilitli özellikler görünür ama "X. seviyede açılır" etiketiyle duruyor. Oyunun derinliği vaat ediliyor, kalabalık erteleniyor. Doz kaçarsa ters tepiyor (Kafa Topu 2'de 7 kilit).

9. **Canlı oyun sinyali.** Geri sayımlar, etkinlik kartları ve sezon kartı oyunun "yaşadığını" ve geri dönmek için sebep olduğunu gösteriyor.

10. **Tek çözünürlük, tek ölçek.** Tüm varlıklar aynı piksel yoğunluğunda ve aynı çizgi kalınlığında. Head Basketball ile Head Soccer arasındaki kalite farkının büyük kısmı bundan geliyor.

11. **Tutarlı ikon ailesi.** Nesne tabanlı ikonlar (hediye kutusu, takvim, gazete) aynı açıda, aynı kontür ve gölgeyle çiziliyor.

12. **Yerel fiyat ve dil.** Mini Football'da ₺ fiyat, Basketball Arena ve Kafa Topu 2'de eksiksiz Türkçe. Yerelleştirme kalitesi "büyük stüdyo" algısını doğrudan besliyor.

---

## 5. Sık yapılan hatalar ve ucuz görünen noktalar

1. **Rozet ve kilit enflasyonu.** Her şey kırmızı "!" taşıdığında hiçbir şey önemli görünmüyor (Kafa Topu 2'de 11 rozet + 7 kilit). Yeni oyuncu ilk ekranda ne yapacağını bilemiyor.

2. **Karışık çözünürlük ve stil.** Boyalı menü, pikselli maç kalabalığı ve vektör yazı aynı oyunda olunca hemen "eski oyun" hissi doğuyor (Head Soccer).

3. **Parlak gradyan, bevel ve gri kartlar.** Soccer Stars'ın gri eğimli kartları ve Head Soccer'ın gloss hap butonları 2010 estetiği. Bugün en hızlı "ucuz" sinyali bunlar veriyor.

4. **Yarım yerelleştirme ve metin taşması.** Soccer Stars'ta "DAILY REWA…", "Collect Now!", "…RIŞMALAR".
   **Teknik not:** Türkçe büyük harfe çevirirken `toUpperCase()` "i" harfini "I" yapar. `toLocaleUpperCase('tr-TR')` kullan: "galibiyet" doğru haliyle "GALİBİYET" olur, "GALIBIYET" değil. Butonları en uzun Türkçe etikete göre boyutlandır ("GÜNLÜK GÖREVLER", "GALİBİYET SERİSİ").

5. **Ayna maç ve okunmayan kimlik.** Aynı bayrak ve aynı yüz karşı karşıya (Head Soccer ve Head Basketball'da Kore–Kore). Kimin kim olduğu yalnızca bir balondan anlaşılıyor.
   → **Çözüm:** Rakip aynı kostümü seçtiyse otomatik olarak alternatif renk forma ya da kontur alsın; "sen" her zaman tek bir sabit vurgu rengiyle işaretlensin.

6. **Görünmez ya da baskın kontroller.** Head Basketball'un kontrolleri sahneyle neredeyse kayboluyor. Kontrollerin opaklığı ve boyutu ayarlanabilir olmalı.

7. **Dünyaya gömülü alakasız reklamlar.** Head Soccer'ın stadyum panosunda kripto reklamı, Kafa Topu 2'de video görüntülü dev ekranlar çizgi film sahnesine yabancı duruyor. Sahnenin sanat yönetimini bozuyorlar.

8. **Boş durumlar.** "Reward Point 0 / Total Point 0", tamamen gri görev ızgarası, içinde yalnızca "Sandık Slotu" yazan kutular. Kayıp ekranı oyuncuya hiçbir şey vermiyor, boş yuvalar bitmemiş görünüyor.

9. **Ham misafir kimlikleri.** "Guest_2220313943", "GUEST_DA0011": hem oyuncu hem rakip birer seri numarası. Eğlenceli otomatik isimler ve varsayılan avatarlar bunu bedavaya çözer.

10. **Hayal kırıklığı anında satış.** Head Basketball'da kayıp ekranında %85 indirim, Head Soccer'da yükseltme ekranının yarısını kaplayan "Get More Point". Kısa vadede gelir getiriyor, uzun vadede güveni aşındırıyor.

11. **Mağaza labirenti.** Mini Football'da 9 sekme ve iki para birimi. Oyuncu neyi neyle aldığını takip edemiyor.

12. **Hiyerarşisiz menü şeritleri.** Soccer Stars'ın üst şeridindeki 7 eşit ağırlıklı ikon arasında göz bir yere tutunamıyor.

13. **İlk açılışta giriş duvarı.** Oyuncu tek bir maç oynamadan Facebook, misafir ve Google arasında seçim yapmak zorunda kalıyor (Carrom Pool).

---

## 6. Kafa Kafaya'nın öne çıkabileceği boşluklar

### 6.1 "Adil mağaza"yı görünür bir kimliğe çevir

İncelenen oyunların hiçbirinde "kutu yok, güç satılmaz" modeli görülmüyor (bkz. 3.1). Bu senin en net farkın, ama oyuncu fark etmezse hiçbir işe yaramaz:

- Mağaza başlığında kalıcı küçük bir rozet: **"Gördüğünü alırsın · Güç satılmaz"**
- Her kozmetiğin maç içinde nasıl göründüğünü gösteren animasyonlu önizleme
- Sabit fiyat, sahte indirim yok. Rotasyonlu vitrin varsa rotasyon takvimi önceden görünsün.
- Mağaza sayfası açıklamasında ve ekran görüntülerinden birinde aynı mesaj
- Çark ve "gizemli ödül" de yok. Sürpriz hissini deterministik yollarla ver: koleksiyon tamamlama, haftalık görev seçimi, seviye ödülleri.

### 6.2 Sade ana menü: tek dokunuşla maç

Rakiplerin ortalaması 15–30 öğe. Hedef: **8–10 öğe**, ilk 3 oturumda daha da az. Yeni özellikler kilit simgesiyle değil, açıldıkları anda "YENİ" etiketiyle gelsin.

```
┌────────────────────────────────────────────────────────────┐
│ [Avatar · Sv 4]                        [● 1.250 +]   [⚙]   │
│                                                            │
│                                                [Mağaza]    │
│            ( KARAKTER: büyük, nefes alan idle )            │
│                                                [Sezon]     │
│                                                            │
│ [Dolap]   [Görevler 2/3]                    [   OYNA   ]   │
└────────────────────────────────────────────────────────────┘
```

### 6.3 Farklı bir şekil dili

Türün üç doğrudan rakibi aynı "öfkeli karikatür futbolcu" kalıbını kullanıyor. Kafa Kafaya'nın mağaza ikonları ızgarasında **ilk bakışta** ayrışması gerekiyor. Bunun yolu daha iyi bir karikatür değil, farklı bir karakter fikri (bkz. Bölüm 7).

### 6.4 İsimden gelen imza an: "kafa kafaya"

Oyunun adı, iki kafanın çarpıştığı anı bir **imza efektine** çevirmek için hazır bir fırsat sunuyor: kısa donma (hit-stop), kamera sarsıntısı, yıldızlar, onomatope ve iki kafanın birbirinden sekmesi. Rakiplerin ekranlarında güç vuruşları ve power-up'lar görülüyor, ama çarpışma anının ayrı bir gösteri olarak işlendiği görülmüyor (çıkarım).

### 6.5 Kaybetmenin de bir şey kazandırdığı sonuç ekranı

- Her maçta XP ve görev ilerlemesi; "0 ödül" ekranı hiç olmasın.
- Maçın en iyi anının 3–5 saniyelik tekrarı ve **paylaş** butonu. İncelenen altı sonuç ekranının hiçbirinde paylaşım ya da tekrar yok; bu aynı zamanda ücretsiz bir büyüme kanalı.
- Hazır ifade paneli (Basketball Arena'daki gibi) ve "Rövanş" butonu.

### 6.6 Saygılı reklam düzeni

Aşağıdaki sayılar test için başlangıç değerleri:

| Yer          | Ne                                | Kural                                                                                     |
| ------------ | --------------------------------- | ----------------------------------------------------------------------------------------- |
| Maç sonu     | Ödüllü reklam: "Ödülü 2x yap"     | Tamamen isteğe bağlı. "Devam" butonu en az onun kadar görünür                             |
| Ana menü     | Ödüllü reklam: günlük ekstra ödül | Günde sınırlı sayıda; ana menüde tek ve sakin bir giriş                                   |
| Maçlar arası | Geçiş reklamı                     | İlk oturumda hiç yok. Sonra en fazla 2–3 maçta bir. Kayıp serisinden hemen sonra yok      |
| Mağaza       | "Reklamları Kaldır"               | Tek seferlik satın alma. Geçiş reklamlarını kaldırır, ödüllü reklamlar isteğe bağlı kalır |
| Oyun dünyası | Stadyum panoları                  | Gerçek reklam yok. Panolar kendi etkinlik ve sezon duyurularını göstersin                 |

### 6.7 Kafa Kafaya için para kazanma yerleşimi

| Yer              | Ne                                                                                                         | Kural                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Üst çubuk        | En fazla 2 para birimi (yumuşak para + opsiyonel premium)                                                  | "+" doğrudan mağazanın ilgili sekmesine gider                   |
| Mağaza           | Doğrudan kozmetik: kafa/kostüm, aksesuar, ayakkabı, top izi, gol kutlaması, saha teması, ifade, sonuç pozu | Önizleme + sabit fiyat · en fazla 3–4 sekme                     |
| Mağaza           | Başlangıç paketi                                                                                           | Yalnızca ilk günler; kozmetik + para; tek ve net teklif         |
| Ana menü / Sezon | Sezon kartı                                                                                                | Yalnızca kozmetik; ücretsiz yol cömert; ödüller önceden görünür |
| Günlük           | Giriş takvimi                                                                                              | Sabit, önceden görünen ödüller (çark yerine)                    |
| Dolap            | "Sahip / Kullanılan" etiketleri                                                                            | Football Strike'taki gibi anında okunur                         |

### 6.8 Kimlik okunurluğu ve erişilebilirlik

- Renk körlüğüne dost takım renkleri (yalnızca kırmızı-yeşil ayrımına dayanma) ve renge ek olarak şekil/işaret farkı
- Kontrol boyutu, opaklığı ve konumu için ayar; sol el düzeni
- Pakette ayar ekranı yok; ancak incelenen maç ekranlarının hiçbirinde kontrol özelleştirmesine dair bir işaret görünmüyor.

### 6.9 Aynı cihazda iki kişi / arkadaşla oda

Head Soccer'da "Multiplayer" modu duruyor; modern rakiplerin ekranlarında ise çevrim içi eşleşme öne çıkıyor. Aynı telefonda iki kişilik maç ya da oda koduyla arkadaşa meydan okuma, düşük maliyetli bir sosyal özellik ve tanıtımda iyi duran bir an.

### 6.10 Yerel kimlik

Türkiye'de geliştirilen Kafa Topu 2 bile görsel olarak küresel ve nötr. Türkçe yorumcu repliklerinden mahalle veya halı saha temasına kadar yerel bir ses hem Türkiye'de sıcaklık yaratır hem de yurtdışında "farklı" görünür (bkz. Yön A).

### 6.11 Önerilen ilk açılış akışı

1. **Logo** (≤ 2 sn)
2. **Onay ekranı:** Oyunun panel ve yazı diliyle, tek buton. Reklam SDK'sının gerektirdiği rıza adımları (iOS izleme izni, AB rıza ekranı) bu adıma bağlanır.
3. **Doğrudan eğitim maçı** (30–45 sn): hareket, zıplama, vuruş. İlk gol neredeyse garanti.
4. **İlk zafer sonuç ekranı:** İlk kozmetik ödül hemen giyilir.
5. **İsim seçimi:** Rastgele eğlenceli öneri, tek dokunuşla kabul.
6. **Ana menü:** Yalnızca OYNA + Dolap + Mağaza.
7. **Hesap bağlama:** 3–5. maçtan sonra, küçük bir kozmetik ödülle. İlk oturumda geçiş reklamı yok.

---

## 7. Faz 1.3 için 3 stil yönü

Üç yön bilerek **üç farklı eksende** ayrışıyor: ışık (gün batımı / gece / stüdyo), işleme (el çizimi 2D / düz vektör + parlama / 3D'den üretilmiş 2D) ve ton (nostaljik mizah / rekabetçi enerji / sevimli koleksiyon).

### 7.0 Yan yana

|                                      | **A · Mahalle Maçı**                               | **B · Gece Ligi**                          | **C · Yaylı Kafalar**                       |
| ------------------------------------ | -------------------------------------------------- | ------------------------------------------ | ------------------------------------------- |
| Tek cümle                            | Akşamüstü sokakta mahallenin tipleri kafa kafaya   | Gece, neon ışıklı arenada rekabetçi düello | Masa üstünde yaylı oyuncak figürlerin maçı  |
| Işık                                 | Alçak, sıcak gün batımı                            | Karanlık zemin, renkli kenar ışığı         | Yumuşak stüdyo/gün ışığı                    |
| İşleme                               | Kalın mürekkep çizgi + 2 ton cel, boyalı arka plan | Çizgisiz düz vektör + glow                 | 3D modelden üretilmiş sprite, yumuşak gölge |
| Ton                                  | Mizah, nostalji                                    | Enerji, rekabet                            | Sevimli, koleksiyon                         |
| İmza motif                           | Mavi emaye sokak tabelası + tebeşir                | Neon şerit + dijital skor                  | Plastik oyuncak + yay                       |
| Rakiplere uzaklık                    | Yüksek                                             | Orta (Basketball Arena'ya yakın)           | Yüksek                                      |
| Üretim yükü (tek kişi + AI araçları) | Orta-yüksek (arka planlar)                         | Düşük-orta                                 | Orta (3D hattını bir kez kurmak)            |
| En büyük risk                        | Yerel referanslar yurtdışında anlaşılmayabilir     | Jenerik "e-spor" görünümü                  | 3D hattı ve AI ile tutarlılık               |

---

### 7.1 Yön A — "Mahalle Maçı"

**Fikir:** Apartmanların arasında, akşamüstü, mahallenin tipleri kafa kafaya. "Kafa Kafaya" deyiminin sıcaklığı sahnede. Herkesin tanıdığı evrensel bir sokak futbolu, yerel detaylar ise ikinci okumada.

**Palet**

| Rol                        | Renk           | Hex       |
| -------------------------- | -------------- | --------- |
| Gün batımı (ana sıcak)     | Turuncu        | `#F28C38` |
| Kiremit / duvar            | Toprak kırmızı | `#C2562F` |
| Krem sıva                  | Açık krem      | `#F3E3C3` |
| Sokak tabelası (UI paneli) | Emaye mavi     | `#1F4E9C` |
| Gölge tonu                 | Morumsu gri    | `#3B2F4A` |
| Asfalt / zemin             | Sıcak gri      | `#4A4E57` |
| Birincil eylem (OYNA)      | Sarı           | `#FFD23F` |
| Kontür / mürekkep          | Koyu kahve     | `#2B1D14` |

- **Işık:** Alçak, sıcak gün batımı. Uzun gölgeler morumsu tona kayıyor (sıcak-soğuk kontrast). Karakterlerde sıcak kenar ışığı.
- **Çizgi ve şekil:** Kalın, kalınlığı hafif değişen mürekkep çizgi. Karakterlerde 2 tonlu cel gölge, arka planda boyalı doku. Yuvarlak ama "el yapımı" hafif düzensiz şekiller.
- **Karakterler:** Meslek ve mahalle arketipleri: bakkal, simitçi, kaleci teyze, muhtar, fileli dede, mahallenin yıldız çocuğu, kedi maskot. Kafa vücudun yaklaşık %60'ı. Siluetle tanınma için büyük bıyık, saç, şapka ve gözlük. _Arketipler meslek ve mahalle karakteri üzerinden kurulmalı; etnik veya bölgesel klişelerden uzak durmalı._
- **Saha:** Asfalt veya arnavut kaldırımı, balkonlar, çamaşır ipleri, mahalle kalesi. Arka plan karakterlerden daha düşük kontrastta.
- **Arayüz:** Paneller emaye sokak tabelası (beyaz kenar, köşelerde vida). Skor duvara tebeşirle yazılıyor. Butonlar boyalı teneke tabela. Yumuşak para birimi şişe **kapağı**. Mağaza bir **bakkal vitrini**.
- **Tipografi (aday):** Başlıkta Lilita One veya Titan One, gövdede Nunito. Türkçe glifleri (ğ ş ı İ) ve lisansı doğrula.
- **Juice:** Golde cam kırılma sesi ve kaçan kedi, uçuşan çamaşırlar. Kafa çarpışmasında yıldızlar ve "TAK!". Sonuç ekranında balkondan alkışlayan komşular.
- **Mağaza ikonu:** Turuncu gün batımı zemininde iki kafa alın alına.
- **Güçlü yanlar:** Hiçbir rakibe benzemiyor. Mizah ve hikâye potansiyeli yüksek. Mevsimlik saha temaları (kar, yaz, bayram süsleri) kozmetik olarak satılabilir.
- **Riskler:** Detaylı arka planların üretim yükü. Yerel referanslar yurtdışında kaybolabilir; evrensel sokak futbolunu öne, yerel detayları arka plana koyarak dengelenir.
- **AI ile üretim notu:** Önce her karakter için elle bir model sayfası çiz (ön, yan, 4 ifade). Arka planlar AI ile kurgulanıp elle boyanabilir. Karakter tutarlılığını AI'a bırakma.

---

### 7.2 Yön B — "Gece Ligi"

**Fikir:** Gece, ışıklı bir çatı sahası ya da fütüristik arena. Temiz vektör, neon şeritler, spor yayını grafikleri. Hedef: rekabetçi ve "ciddi" görünen ama karakterleriyle gülümseten bir düello.

**Palet**

| Rol                   | Renk           | Hex       |
| --------------------- | -------------- | --------- |
| Zemin                 | Gece laciverti | `#0E1030` |
| Panel (yarı saydam)   | Koyu indigo    | `#1A1F4D` |
| Takım 1 / vurgu       | Neon camgöbeği | `#22E4FF` |
| Takım 2 / vurgu       | Neon macenta   | `#FF3EA5` |
| Birincil eylem (OYNA) | Limon yeşili   | `#B6FF3B` |
| Metin                 | Kırık beyaz    | `#F5F7FF` |
| İkincil metin         | Gri-mavi       | `#8A93C9` |

- **Işık:** Karanlık zemin, karakterlerde iki renkli kenar ışığı. Solda camgöbeği, sağda macenta: **takım kimliği doğrudan ışıktan okunuyor**, ayna maç sorunu kendiliğinden çözülüyor. Parlama efektleri ucuz ama "kaliteli" görünüyor.
- **Çizgi ve şekil:** Çizgisiz ya da ince açık kontur. Düz renk + tek gradyan. Geometrik temel şekiller.
- **Karakterler:** Geometrik kafalar (daire, yuvarlatılmış kare, üçgen temelli), büyük gözlük, kask, saç bandı. İfade gözler ve ağızla, az detayla veriliyor. Maske ve kask kozmetikleri doğal uyuyor.
- **Saha:** Koyu zemin, parlayan saha çizgileri, LED panolar (kendi duyuruların için).
- **Arayüz:** Koyu, yarı saydam cam paneller, neon kenar, kesik köşeler. Dijital skor tabelası. Limon yeşili yalnızca birincil eylemde.
- **Tipografi (aday):** Başlıkta Barlow Condensed veya Saira Condensed (ExtraBold Italic), gövdede Barlow.
- **Juice:** Golde ekran flaşı ve saha çizgilerinin nabız gibi atması. Kafa çarpışmasında kısa donma ve hafif renk kayması (kromatik sapma). Galibiyet serisinde neon şeridin renk değiştirmesi.
- **Güçlü yanlar:** En ucuz üretim (gradyan + glow), VFX ile yüksek kalite algısı, koyu zemin üstünde parlak karakterle çok iyi okunurluk.
- **Riskler:** Basketball Arena'nın neon kontrollerine ve genel e-spor estetiğine yakın, jenerik kalabilir. Gün ışığında koyu ekranlar zor okunur. Mizah azalabilir; bunu karakter animasyonlarıyla telafi etmek gerekir.

---

### 7.3 Yön C — "Yaylı Kafalar" (bobblehead)

**Fikir:** Oyuncular masa üstü yaylı oyuncak figürler; kafa bir yayın üzerinde sallanıyor. Kafa topunun fiziği doğrudan görsel şakaya dönüşüyor. Mağaza bir **koleksiyon rafı**: raftaki boş yeri görüyorsun ve istediğini doğrudan alıyorsun. Rastgelelik yok.

**Palet**

| Rol                   | Renk            | Hex       |
| --------------------- | --------------- | --------- |
| Gökyüzü / oda ışığı   | Açık mavi       | `#8FD3FF` |
| Çim halı              | Taze yeşil      | `#7ED957` |
| Takım 1 plastik       | Oyuncak kırmızı | `#FF5A4E` |
| Takım 2 plastik       | Oyuncak mavi    | `#3D7BFF` |
| Birincil eylem (OYNA) | Ayçiçeği        | `#FFC93C` |
| Panel                 | Krem            | `#FFF6E5` |
| Mürekkep / metin      | Koyu lacivert   | `#2A2D3E` |

- **Işık:** Yumuşak stüdyo ışığı, temas noktalarında yumuşak gölge (ambient occlusion), vinil yüzeylerde parlak yansıma noktaları, hafif alan derinliği.
- **İşleme:** 3D'de modellenip 2D sprite'a veya iskelet animasyonuna aktarılır; alternatif olarak 2D'de "3D görünümlü" boyama. Parlak vinil kafalar, mat kumaş formalar.
- **Karakterler:** Kafa gövdenin 2–3 katı, boyun bir yay; zıplamada ve vuruşta kafa sallanıyor. İfadeler değiştirilebilir **yüz çıkartmalarıyla** veriliyor: tek kafa modeli + farklı yüz ve saç = çok sayıda kozmetik ve ifade, düşük maliyetle.
- **Saha:** Masa üstü oyuncak saha (yapay çim halı, oyuncak kaleler, arkada bulanık bir oda). Saha temaları farklı "masalar": mutfak tezgâhı, çalışma masası, plaj havlusu.
- **Arayüz:** Kalın beyaz kenarlı yuvarlak paneller (çıkartma hissi), basınca içeri gömülen oyuncak düğmeleri, kozmetikler blister ambalajlı ürün kartlarında.
- **Tipografi (aday):** Başlıkta Fredoka veya Baloo 2 (ExtraBold), gövdede Baloo 2 veya Nunito.
- **Juice:** Golde atan oyuncunun kafası yayla dönüp sallanıyor. Kafa çarpışmasında "boing" ve iki kafa birbirinden sekiyor. Sonuç ekranında kazanan figür rafta dönüyor.
- **Güçlü yanlar:** Türün mekaniğine doğrudan bağlı bir imza fikri. Koleksiyon mantığı adil para modeline birebir uyuyor. Sevimli ve geniş yaş kitlesine hitap ediyor. 3D hattı bir kez kurulunca kozmetik üretimi hızlı.
- **Riskler:** 3D hattının kurulum maliyeti. AI ile tutarlı 3D görünüm üretmek zor; tek temel model + doku ve çıkartma varyasyonuyla çözülür. "Çocuk oyunu" algısı oluşabilir; mizahi ve hafif ironik bir tonla dengelenir.

---

### 7.4 Elenen fikirler (kısaca)

- **Retro çıkartma albümü (70'ler-80'ler):** Güzel bir koleksiyon fikri, ama C bunu daha güçlü yapıyor.
- **Piksel sanatı:** Head Soccer'ın "eski oyun" hissine fazla yakın düşer.
- **Gerçekçi 3D:** Miniclip'in alanı; tek kişi için pahalı ve kafa topunun mizahına ters.

### 7.5 Stil testi için öneri

**Her yön için aynı test kiti** (karşılaştırılabilir olsun diye):

1. 1 kahraman karakter: nötr + 3 ifade (sevinç, zorlanma, yenilgi) + 1 kozmetik varyasyon
2. Maç ekranı taslağı (1920×1080, HUD dahil: iki karakter, top, kaleler, skor)
3. Ana menü taslağı (6.2'deki iskelet)
4. Sonuç ekranı (kazanma ve kaybetme)
5. 1 mağaza ürün kartı
6. Uygulama ikonu (512×512)
7. _(Opsiyonel)_ 2–3 saniyelik kafa çarpışması veya gol animasyon taslağı

**Kontroller**

- **Gerçek boyut testi:** Telefonda (~6") karakter, top ve skor 1 saniyede okunuyor mu?
- **Gri tonlama / göz kısma testi:** Karakterler arka plandan, takımlar birbirinden renk olmadan da ayrışıyor mu?
- **Mağaza ızgarası testi:** İkonu Kafa Topu 2, Head Soccer ve Basketball Arena ikonlarının yanına koy. 1 saniyede ayrışıyor mu?
- **5 saniye testi (5–10 kişi):** "Bu ne tür bir oyun? Ne hissettiriyor? İndirir misin?"
- **Üretim testi:** Yeni bir kozmetik kafa kaç saatte bitiyor? AI araçlarıyla 5 karakter üret; kaçında stil tutarlılığı korunuyor?
- **Türkçe metin testi:** En uzun etiketler ("GÜNLÜK GÖREVLER", "GALİBİYET SERİSİ") butonlara sığıyor mu, büyük harf dönüşümü doğru mu?

**Puanlama tablosu**

| Kriter                           | Ağırlık | A   | B   | C   |
| -------------------------------- | ------- | --- | --- | --- |
| Maç içi okunurluk                | %25     |     |     |     |
| Rakiplerden ayrışma              | %20     |     |     |     |
| Kozmetik satışa uygunluk         | %20     |     |     |     |
| Üretim hızı ve sürdürülebilirlik | %20     |     |     |     |
| 5 saniye testi beğenisi          | %15     |     |     |     |
| **Ağırlıklı toplam**             |         |     |     |     |

**Sanat yönetmeni ön tahmini:** **C**, mekanikle en doğrudan bağı kuran ve adil mağaza modeline en iyi oturan yön. **A**, en güçlü kimlik ve mizah potansiyeline sahip. **B** ise en hızlı ve en ucuz üretilen yön. Testten önce üçünü karıştırma; kazanan yön belli olduktan sonra diğerinden tek bir unsur ödünç alınabilir (ör. C'nin yaylı kafaları A'nın mahalle sahasında).
