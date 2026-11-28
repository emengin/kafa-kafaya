# Kafadarlar — Oyun Tasarım Belgesi

Tarayıcıda oynanan, 2D yandan görünümlü, 1v1 kafa topu oyunu. Hedef: düşük donanımda
60 FPS, sıkı ve tatmin edici oynanış hissi. Tüm karakterler, görseller ve sesler özgündür;
gerçek kişi, kulüp, marka veya logo kullanılmaz.

## 1. Teknik çerçeve

- **Mantıksal çözünürlük:** 1280×720, ekrana FIT + letterbox ile ölçeklenir.
- **Fizik:** Phaser fiziği kullanılmaz. `src/physics` altında kendi modülümüz:
  - Sabit 60 Hz adım (fixed timestep + accumulator), render enterpolasyonu.
  - Sub-stepping ile tünelleme önleme.
  - Daire–daire, daire–dikdörtgen, daire–doğru parçası çarpışmaları.
  - Phaser'dan bağımsız ve **deterministik**: aynı input dizisi → birebir aynı sonuç.
    Gol tekrarı sistemi buna dayanır (yalnızca başlangıç durumu + input dizisi kaydedilir).
- **Input soyutlaması:** Oyuncular klavyeyi doğrudan okumaz. Her adımda bir
  `InputState { left, right, jump, kick, super }` alır. Klavye, dokunmatik, gamepad, AI
  ve tekrar oynatıcı bu arayüzü üretir.
- **Varlıklar:** Harici dosya yok. Grafikler kodla dokuya çizilir (Canvas 2D: gradyanlar, SVG
  yolları; ikonlar `Graphics → generateTexture`), sesler Web Audio API ile sentezlenir.
- **Simülasyon olayları:** GameSim her adımda ses/efekt için olaylar üretir (şut, kafa, temas, top
  çarpması — zemin/duvar/tavan/direk —, zıplama, iniş, gol, süper…); olaylar oyun durumunu
  değiştirmez.
- **Ayarlar:** Tüm denge değerleri `src/config/gameConfig.ts` içinde.

## 2. Saha

- Zemin, iki yan duvar, tavan ve iki kale.
- Kalenin **üst direği katı bir çubuktur**; top ve oyuncular üzerine çıkabilir/sekebilir.
- Top kale üstünde **2 sn'den uzun** kalırsa sahaya doğru hafifçe itilir (topun direk
  üstünde kilitlenmesini önler).
- Kale ağı arka duvar gibi davranır; top kale içinde kalır.

## 3. Oyuncu

- **Gövde yapısı:** büyük kafa (ana çarpışma dairesi), küçük gövde, tek ayakkabı.
- **Hareket:** sol/sağ yürüme, zıplama (yerdeyken; güçlendiriciyle çift zıplama).
- **Şut:** ayak bir yay çizerek savrulur. Topa verilen impuls, savrulmanın fazına
  (vuruş anındaki ayak açısal hızı ve yönü) ve oyuncunun hızına bağlıdır. Ayağın altıyla
  vurulan top yükselir, üst kısmıyla vurulan top yere doğru gider.
- **Kafa vuruşu:** kafa dairesi topla çarpıştığında oyuncunun hızı topa aktarılır
  (zıplarken kafa → güçlü vole, koşarken kafa → ileri itiş).
- **Bakış yönü sabittir:** oyuncu her zaman rakip kaleye bakar (P1 sağa, P2 sola); şut
  hep ileri gider. Türün alışılmış davranışı; geriye şut yoktur.
- **Hareket hissi:** ivmeli/yavaşlamalı yatay hareket (ters yöne dönüş daha keskin),
  zıplamada coyote time, jump buffer, değişken yükseklik (tuş erken bırakılırsa alçak
  zıplama) ve düşerken artan yerçekimi.

## 4. Kontroller

| Eylem   | Oyuncu 1  | Oyuncu 2  |
| ------- | --------- | --------- |
| Hareket | A / D     | ← / →     |
| Zıpla   | W         | ↑         |
| Şut     | Space     | Enter     |
| Süper   | Sol Shift | Sağ Shift |

- Klavye eşlemesi `KeyboardEvent.code` ile yapılır (sol/sağ Shift ayrımı ve klavye
  düzeninden bağımsızlık için).
- Arayüz: **Esc / P** duraklat, **F1** debug katmanı.
  Menülerde ↑/↓ (veya W/S) + Enter/Space ya da fare/dokunmatik; ayarlanabilir öğelerde ←/→ (veya
  A/D) değeri değiştirir; alt menüden Esc/Backspace ile geri. Duraklatma menüsü: Devam · Ses
  Ayarları · Yeniden Başlat · Ana Menü (turnuvada yeniden başlatma yok; antrenmanda "Kukla rakip").
- Tek insanlı modlarda (Hızlı Maç, turnuva, antrenman) P1 iki tuş takımını, iki kolu ve dokunmatiği
  birlikte kullanabilir.
- **Gamepad (Gamepad API, en fazla 2 kol):** bağlanma sırasıyla 1. kol P1, 2. kol P2. Sol
  çubuk/d-pad hareket, A zıpla, X/B şut, RB/RT süper, Start duraklat. Menülerde d-pad/çubuk gezinir,
  A/Start onaylar, B geri, LB/RB sayfa/değer değiştirir. Kol çıkarılınca maç duraklar.
- **Mobil:** dokunmatik algılanınca yarı saydam butonlar — solda ◀ ▶, sağda Zıpla / Şut / Süper
  (bar doluyken altın renkte nabız atar), sol üstte duraklat; çoklu dokunuş ve parmak kaydırma.
  Dikey ekranda "telefonu yan çevir" uyarısı (maç duraklar); tam ekran düğmesi (sağ üst).
- **Antrenman kısayolları:** R topu sıfırla, F süper barını doldur, T kukla rakip (gamepad: Y · LB ·
  Back; dokunmatik: sol üstte iki buton).
- Gamepad ve dokunmatik butonlar "sanal tuş" olarak klavyeyle aynı girdi yolundan okunur
  (`src/input/virtualKeys.ts`); oyuncu yine yalnızca `InputState` görür.

## 5. Maç kuralları

- Süre **90 sn** geri sayım; saat yalnızca oyun akarken işler (santra beklemesinde ve gol
  kutlamasında durur). Son **10 sn** saat kırmızı ve her saniye nabız atar.
- **Gol:** top kale çizgisini **tamamen** geçince (topun merkezi değil, tüm dairesi). Direğe
  çarpıp sahaya dönen top gol değildir. Son adımda atılan gol geçerlidir.
- **Beraberlik:** altın gol uzatması — süre biter, oyuncular ve top santraya alınır,
  "ALTIN GOL!" duyurulur; süresiz oynanır, ilk atan kazanır.
- **Gol anı:** 1 sn ağır çekim (0,3x) + büyük "GOL!" yazısı; golden 2 sn sonra oyuncular
  ve top başlangıç konumlarına döner (kısa kararma). Faz 2.7'den beri ağır çekim yalnızca
  görüntüde: simülasyon gol sonrası 120 adım (2 sn) normal hızda akar, görüntü geride kalır ve
  santrada canlıya atlar.
- **Gol tekrarı (v1.0):** kutlama bitince (santra ya da maç sonu öncesi) golün son ~4 sn'si
  deterministik olarak yeniden oynatılır: halka tamponda her 15 adımda bir tam simülasyon durumu
  (`GameSim.saveState`) ve her adımın girdileri (oyuncu başına 1 bayt) tutulur; golden en çok 4 sn
  önceki anahtar kare yüklenip kaydedilen girdilerle ilerlenir (santradan öncesine gidilmez, golden
  önce 1 sn'den az görüntü varsa tekrar yok). Ağır çekim (×0,55; golün ±0,6 sn çevresinde ×0,3),
  topu ve oyuncuları kadrajda tutan yakın plan kamera (×1,3, hafif eğik), sinema şeritleri,
  "TEKRAR" rozeti; Enter/Space/A ya da "Atla" ile geçilir. Tekrarda skor, saat ve HUD değişmez;
  bitince canlı durum birebir geri yüklenir. Ayarlar'dan kapatılabilir; antrenmanda yok.
- **Santra:** oyuncular ve top başlangıç konumunda kısa süre (0,8 sn; altın golde 1,8 sn)
  bekler, girdiler yok sayılır; **düdükle** top ortadan hafifçe düşer ve oyun başlar.
- **Durum makinesi:** `Kickoff → Playing → GoalScored → Kickoff …` → süre biterse
  (beraberlikte) `Kickoff → GoldenGoal → GoalScored → MatchEnd`, değilse `MatchEnd`.
  Duraklatma her durumdan açılır; simülasyon duraklatılmışken adım atmaz.
- **Maç sonu:** skor, kazanan (altın golle mi), "Tekrar Oyna" / "Ana Menü".

## 6. Güç barı ve süper şut

- Her oyuncunun bir güç barı vardır. Topa dokundukça ve zamanla (yavaşça) dolar.
- Bar doluyken **Süper** tuşu karakterin özel süper şutunu hazırlar: oyuncu karakter renginde
  parlar ve **bir sonraki vuruşu** (şut veya kafa) süper olur. Bar sıfırlanır.
- Değerler (`POWER`): pasif dolum 0,05/sn (~20 sn), dokunuş başına +0,08 (oyuncu başına 0,3 sn
  bekleme), süper hazırken bar dolmaz. Süper kafa topu en az 1500 px/sn ile gönderir, ardından
  karakterin süper tipi uygulanır.
- **Ortak karşı oyun:** süper topa **aktif** vurmak — savrulan ayakla şut ya da topa doğru
  hareket ederken kafa — her zaman temizdir: etki biter, olumsuz sonuç yok. Rakibe etkisi olan
  süperler (Buz, Ateş) yalnızca **pasif** karşılamayı (gövde, duran kafa) cezalandırır.
- Süper tipleri ve sayısal değerleri `SUPER_SHOTS` altında; GameSim ve yapay zekânın yörünge
  tahmincisi aynı etki kodunu (`src/game/superEffects.ts`) kullanır.

| Süper         | Etki                                                                                                       | Karşı oyun                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Ateş Topu** | ×1,5 hız, düz açı, 0,8 sn yerçekimsiz dümdüz gider; gövdeyle karşılayanı geri savurur.                     | Yolu düz ve tahmin edilebilir: önüne geç, şut ya da kafayla vur.              |
| **Buz**       | Havadan doğrudan değdiği rakibi **1,1 sn** dondurur; ilk sekmede söner.                                    | Şut/kafa, üstünden atla ya da sekmesini bekle. Donma sonrası 1 sn bağışıklık. |
| **Zikzak**    | Yerçekimsiz, dikeyde dalgalanır (y = −55·(1 − cos 2π·2,4t)).                                               | Daha yavaş (×1,15); dalganın dibinde karşıla, sahaya değince söner.           |
| **Işınlanma** | 0,12 sn sonra görünmez olur (oyuncuların içinden geçer), kale çizgisinden 250 px önde ×0,65 hızla belirir. | Kale çizgisine yakın dur: top yavaşlayarak ve önünde belirir.                 |
| **Dev Top**   | Top 1,8 kat büyür, 3 kat ağırlaşır (kaleciyi iter); 2,4 sn.                                                | Büyük top kaleye tam girmekte zorlanır; erken kes, kafayla karşıla.           |
| **Kasırga**   | 150 px içindeki rakibi topun gidiş yönünde iter (havadayken %40).                                          | Zıpla ya da topa aktif vur (etki biter).                                      |
| **Gökkuşağı** | Tavana yakın (y≈70) yayla, hava direnci kapalı, rakip kalenin 180 px önüne dik iner; sekince söner.        | Yavaş ve uzun: geri dön, düştüğü yerde karşıla.                               |
| **Mıknatıs**  | 1,6 sn boyunca rakip kalenin ortasına doğru 1800 px/sn² çekilir.                                           | Çekim zayıf; kalenin önünde dur.                                              |
| **Serap**     | Top üç yöne bölünür (±0,26 rad); gerçek olan tohumla seçilir, ikisi 0,75 sn'de / değince söner.            | Yanılsamalar oyunculara değince ve kaleye yaklaşınca söner; gol olmazlar.     |
| **Sarsıntı**  | Rakip 0,8 sn zıplayamaz; top −0,2 rad alçak açıyla gider, zeminde 0,78 sekmeyle sekerek ilerler.           | Top alçak: gövdeyle kes, şutla vur.                                           |

## 7. Karakterler (10 özgün karakter)

İstatistikler 1–5 ölçeğinde: **Hız**, **Zıplama**, **Şut gücü**, **Kafa boyutu**. Her
karakterin toplamı **14**. Puan → fizik değeri (`CHARACTER_STATS`; 3 puan = Faz 1–3 değerleri):

| Puan | Hız (px/sn) | Zıplama (px/sn) | Şut gücü | Kafa yarıçapı (px) / kütle |
| ---- | ----------- | --------------- | -------- | -------------------------- |
| 1    | 408         | 940             | ×0,86    | 31,5 / 9                   |
| 2    | 419         | 970             | ×0,93    | 33,75 / 9,5                |
| 3    | 430         | 1000            | ×1,00    | 36 / 10                    |
| 4    | 441         | 1030            | ×1,08    | 38,25 / 10,5               |
| 5    | 452         | 1060            | ×1,16    | 40,5 / 11                  |

- İvmeler hızla aynı oranda ölçeklenir. Büyük kafa daha ağırdır: kafa puanı 3'ün üstündeki her
  puan zıplama hızını %0,8 düşürür (altındaki her puan artırır).
- Güçlü şut daha **düz** gider (yükselme açısı şut gücüne bölünür): aksi hâlde hızlanan top aynı
  açıyla kalenin üstünden gider ve şut gücü değersizleşir (denge simülasyonu bunu gösterdi).

| #   | Karakter   | Tema                  | Hız | Zıp. | Şut | Kafa | Süper şut     |
| --- | ---------- | --------------------- | --- | ---- | --- | ---- | ------------- |
| 1   | **Kor**    | Ateş, kırmızı         | 3   | 3    | 5   | 3    | **Ateş Topu** |
| 2   | **Ayaz**   | Buz, açık mavi        | 3   | 4    | 3   | 4    | **Buz**       |
| 3   | **Şimşek** | Elektrik, sarı        | 5   | 3    | 4   | 2    | **Zikzak**    |
| 4   | **Sis**    | Gölge, mor            | 4   | 5    | 2   | 3    | **Işınlanma** |
| 5   | **Kaya**   | Taş, gri              | 2   | 3    | 4   | 5    | **Dev Top**   |
| 6   | **Bora**   | Rüzgâr, beyaz-yeşil   | 4   | 4    | 3   | 3    | **Kasırga**   |
| 7   | **Yay**    | Okçu, turuncu         | 3   | 5    | 3   | 3    | **Gökkuşağı** |
| 8   | **Demir**  | Mıknatıs, kırmızı-gri | 3   | 3    | 4   | 4    | **Mıknatıs**  |
| 9   | **Pamuk**  | Bulut, pembe          | 4   | 4    | 2   | 4    | **Serap**     |
| 10  | **Toprak** | Deprem, kahverengi    | 2   | 4    | 5   | 3    | **Sarsıntı**  |

> Denge: AI vs AI simülasyonuyla (`npm run simulate -- --characters`); güncel tablo
> [archive/PROGRESS_WEB.md](archive/PROGRESS_WEB.md) Faz 7 "Denge turu" bölümünde.

## 8. Güçlendiriciler

- Oyun akarken **12–18 sn**'de bir (tohumlu rastgele) sahanın üst yarısında **süzülen balon**
  belirir (kapalı biçimli yavaş salınım; 10 sn sonra söner, son 2 sn yanıp söner). Balonun
  üzerinde kazandıracağı güçlendiricinin ikonu görünür.
- Top balona çarpınca balon patlar; **topa son dokunan oyuncu** güçlendiriciyi kazanır. Santradan
  sonra henüz kimse dokunmadıysa top içinden geçer. Işınlanan top balonu patlatmaz.
- Tüm etkiler sürelidir; HUD'da kazanan oyuncunun tarafında, skor çubuğunun altında **ikon + geri
  sayım halkası** (son 2 sn yanıp söner). Aynı tip yeniden alınırsa süre tazelenir. Santra
  balonu kaldırır, etkiler sürer. Değerler `POWERUPS` altında.

| Güçlendirici         | Etki                                                         | Süre   |
| -------------------- | ------------------------------------------------------------ | ------ |
| Büyük Kafa           | Kendi kafan ×1,4 (kademeli büyür).                           | 8 sn   |
| Rakibi Küçült        | Rakibin kafası ×0,65.                                        | 8 sn   |
| Hız                  | Hareket hızın ve ivmen ×1,28.                                | 8 sn   |
| Rakip Kalesini Büyüt | Rakibin kalesi 70 px yükselir (220 px/sn ile büyür/küçülür). | 8 sn   |
| Rakibi Dondur        | Rakip hemen donar (tuşları yok sayılır).                     | 1,8 sn |
| Çift Zıplama         | Havadayken bir kez daha zıplayabilirsin (×0,9 kalkış hızı).  | 10 sn  |

## 9. Yapay zekâ

- Topun yörüngesini **fizik modülüyle ileri simüle ederek** (~1,5 sn) tahmin eder: aynı
  deterministik kod, ayrı bir "hayalet" dünya kopyası; duvar/tavan/direk sekmeleri dahil.
  Tahmin her karede değil, aralıklarla ya da bir çarpışma görülünce yenilenir.
- Yalnızca `InputState` üretir; ekranda görünen bilginin bir kopyasını okur, oyun durumunu
  değiştirmez, **hile yapmaz**. İnsanla aynı fizik ve kurallar.
- Katmanlar: gecikmeli **algı** → gürültülü **tahmin** → utility ile **karar** (savun, hücum,
  kafa, bekle/pozisyon al) → her adım **refleks** (yürüme, zamanlı zıplama, hayalet ayakla şut
  zamanlaması ve şut değerlendirmesi, süper) → **sıkışma önleme** (itişme, direk/kafa üstünde
  kalma, topu kafada taşıma, donup kalma).
- Tüm rastgelelik tohumlanabilir (aynı tohum → aynı kararlar).
- Zorluk seviyeleri (`gameConfig.ts` → `AI_PROFILES`; tam tablo [archive/PROGRESS_WEB.md](archive/PROGRESS_WEB.md) Faz 3'te):

| Seviye | Reaksiyon | Tahmin hatası | Karar aralığı | Agresiflik | Süper kullanımı |
| ------ | --------- | ------------- | ------------- | ---------- | --------------- |
| Kolay  | 330 ms    | 0,20          | 250 ms        | 0,25       | 0,20 (nadiren)  |
| Orta   | 220 ms    | 0,10          | 150 ms        | 0,55       | 0,55 (bazen)    |
| Zor    | 150 ms    | 0,04          | 80 ms         | 0,80       | 0,95 (akıllıca) |

- **Karakter ve güçlendirici farkındalığı (Faz 4):** kendi ve rakibin kafa boyutu, hızı, zıplama
  profili (gerçek `Player` koduyla her zıplama hızı için ölçülür), şut gücü, büyüyen kaleler ve
  topun süper etkisi görünür bilgidir; tahminci süper topları aynı etki koduyla ileri simüle eder.
  - **Süper kullanımı tipe göre** (`AI.super.byType`): topun kaleye uzaklığı ve rakibin konumu
    (Buz/Işınlanma/Kasırga/Dev Top: rakip topla kale arasında; Gökkuşağı: rakip kale çizgisinden
    uzakta; Sarsıntı: rakip yakında). Seçici AI süperli şutu normal şutla karşılaştırır.
  - **Süperlerden kaçınma:** kalesine gitmeyen tehlikeli süper topa (Buz, Ateş, Kasırga) şutla
    karşılayamıyorsa değmez — üstünden zıplar ya da çekilir (`superDodge`). Rakip süper hazırken
    daha derinde bekler. Işınlanan topa (dokunulamaz) plan yapmaz; Sarsıntıda zıplama planlamaz.
  - **Serap:** AI üç toptan birini izler, gerçeği `mirageReadChance` olasılıkla seçer (Kolay
    0,34 · Orta 0,45 · Zor 0,6); yanılsamalar sönünce gerçek topa döner.
  - **Güçlendiriciler:** balonu patlatacak şuta değerlendirmede bonus (`powerUpAwareness`); çift
    zıplamayı kafa planında, tepeye yakınken top hâlâ başının üstündeyse kullanır; donmuş rakibe
    karşı rakibin topa ulaşma süresine donma süresini ekler (hücuma geçer).
- Doğrulama: `npm run simulate` (AI vs AI headless maçlar, skor dağılımı ve sıkışma raporu),
  `--characters` (karakter denge taraması).

## 10. Menüler ve oyun modları

- **Ana menü:** arka planda canlı AI vs AI demo maçı (gerçek simülasyon, süresiz, efekt sesi yok);
  Hızlı Maç · 2 Oyuncu · Turnuva (süren turnuva varsa "Turnuvaya Devam") · Antrenman · Ayarlar ·
  Nasıl Oynanır. Sol altta istatistikler (maç · galibiyet · gol · kupa).
- **Ayarlar:** zorluk (Kolay/Orta/Zor), maç süresi (60/90/120 sn), gol tekrarı (aç/kapa), Ana ses /
  Efektler / Müzik, ekran sarsıntısı (aç/kapa; gol zoom'u kalır), efekt yoğunluğu, renk körü modu,
  dil (TR/EN), kontrol şeması.
- **Erişilebilirlik (v1.0):** _renk körü modu_ — oyuncu kimlik renkleri renk körlüğünün her türünde
  ayırt edilen Okabe–Ito çiftine (turuncu #E69F00 / mavi #56B4E9) döner, oyuncunun ayağının altında
  kimlik renginde halka belirir, etiket ve isimlerde ▲ (P1) / ● (P2) şekilleri; renk tek ipucu
  değildir. _Efekt yoğunluğu_ — Düşük: parçacıklar %30, tam ekran parlamaları ve vuruş flaşları
  kapalı (ışığa duyarlılık), gol yakınlaşması yok; Orta: %65 / yarı; Yüksek: tam.
- **Nasıl Oynanır:** 4 sayfa — maç kuralları ve modlar, güç barı ve 10 süper, güçlendiriciler,
  kontrol tablosu (klavye P1/P2, gamepad, dokunmatik).
- **Karakter seçimi:** 5×2 kart; panelde istatistik çubukları, süper açıklaması ve **süper şut
  önizlemesi** (karakterin süperli şutu gerçek simülasyonda bir kez oynatılıp kaydedilir, küçük
  sahada döngüde izletilir). Kilitli kartlar karartılmış ve seçilemez. 2 oyuncuda iki imleç aynı
  anda.
- **Hızlı Maç:** oyuncu vs CPU; zorluk ve süre ayarlardan; CPU kalan açık karakterlerden birini alır.
- **2 Oyuncu:** aynı cihazda iki kişi (klavye ve/veya iki gamepad).
- **Turnuva:** 8 kişilik eleme (çeyrek final → yarı final → final). Rakipler giderek zorlaşır:
  ayarlardaki zorluğun sırasına tur kayması eklenir (Kolay → Kolay, Kolay, Orta; Orta → Kolay, Orta,
  Zor; Zor → Orta, Zor, Zor). Sıradaki kilitli karakter "patron" olarak ağacın öbür yarısına konur ve
  finale kadar hep kazanır. Oyuncunun maçı oynanır, diğer maçların sonucu tohumla üretilir. Beraberlik
  altın golle çözülür; turnuva maçında yeniden başlatma yoktur. Kaybedince elenir; finali kazanınca
  kupa ekranı ve sıradaki karakterin kilidi açılır. İlerleme her maçtan sonra kaydedilir.
- **Antrenman:** süresiz, AI yok, başlangıçta rakipsiz (P2 simülasyonda yok sayılır: topa ve P1'e
  değmez), istenirse pasif "kukla" rakip; topu sıfırlama ve süper barını doldurma kısayolları.
  İstatistiğe girmez.

## 11. Karakter kilitleri

- Baştan açık: Kor, Ayaz, Şimşek, Kaya, Bora, Yay. Her turnuva şampiyonluğu sıradakini açar:
  Demir → Sis → Pamuk → Toprak (`STARTER_CHARACTERS`, `UNLOCK_ORDER`). Kilitli karakterler AI
  rakibi olarak (turnuvada, menü demosunda) görülebilir.

## 12. Platform ve kayıt

- Masaüstü ve mobil tarayıcılar; mantıksal 1280×720 FIT ölçekleme (telefon döndürülünce ölçek
  yeniden hesaplanır).
- Gamepad API (en fazla 2 kol), dokunmatik (çoklu dokunuş), Türkçe / İngilizce (tüm metinler
  `src/i18n`'den; sahne dışı DOM metinleri dahil).
- **PWA:** derleme sırasında üretilen `manifest.webmanifest`, kodla çizilen PNG simgeler ve service
  worker; tüm derleme dosyaları önbelleğe alınır, oyun ilk açılıştan sonra çevrimdışı çalışır ve ana
  ekrana eklenebilir (tam ekran, yatay).
- `localStorage` kaydı, anahtar başına bağımsız ve alan alan doğrulanır (bozuk veri → güvenli
  varsayılan): dil, ses düzeyleri, tercih edilen karakterler, oyun ayarları (`settings`), açılan
  karakterler + istatistikler (`progress`: maç, galibiyet, mağlubiyet, gol, yenen gol, kupa) ve süren
  turnuva (`tournament`; tutarsızsa atılır).

## 13. Ses ve görsel stil

Ayrıntılar ve ölçümler [archive/PROGRESS_WEB.md](archive/PROGRESS_WEB.md) Faz 5'te; tüm değerler `gameConfig.ts` (`STADIUM`,
`CHARACTER_ART`, `ANIM`, `JUICE`, `NET`, `PARTICLES`, `PARTICLE_PRESETS`, `BALL_FX`, `SUPER_FX`,
`UI_THEME`, `AUDIO`, `CROWD`, `MUSIC`, `QUALITY`).

### Görsel

- **Stil:** canlı, çizgi film tadında renkler; kalın, koyu mor konturlu büyük kafalar; alacakaranlık
  bir stadyumda ışıklandırma. Tüm dokular kodla (Canvas 2D) bir kez çizilir.
- **Karakterler:** her birinin cilt tonu, saç modeli, aksesuarı, göz/kaş/ağız karakteri (bkz. §7
  temaları). Yüz canlıdır: göz bebekleri topu izler, göz kırpar; ifadeler — sevinç (gol atınca),
  üzüntü (gol yiyince), şaşkınlık (süper etkisi, sert çarpma), donma (titreme), efor (şut/zıplama),
  sırıtma (süper hazır). HUD portreleri aynı yüzü gösterir.
- **Animasyon:** squash & stretch (zıplama, iniş, havada uzama), koşu sallanması, hıza göre eğilme,
  şut savrulması ve izi, iniş/koşu tozu.
- **Stadyum:** gradyan gökyüzü + parallax bulutlar, ışık kuleleri ve hüzmeler, takım renklerinde
  animasyonlu kalabalık (golde golcünün tarafı ayağa kalkar), LED panolar (golde "GOL!"),
  perspektifli çizgili çim, dalgalanan kale ağı.
- **Top:** dönme, yüksekliğe göre küçülen gölge, hız izi, hızla uzama/çarpmada basılma.
- **Efektler:** nesne havuzlu parçacıklar — toz, çim, kıvılcım, konfeti, balon patlaması, havai
  fişek ve her süper şuta özel iz/patlama/çizim.
- **Oyun hissi:** sert vuruşta 40–60 ms hit-stop (yalnızca görüntüde: simülasyon akar, görüntü sonra
  2 kat hızla yetişir; Faz 2.7), travma modeli ekran
  sarsıntısı, gol anında kameranın kaleye ~%10 yakınlaşması, vuruşta flaş. Sarsıntı/zoom yalnızca
  dünyaya uygulanır; HUD sabittir.
- **Arayüz:** tek stil — yuvarlak köşeli, gölgeli, gradyanlı paneller ve butonlar; altın gradyanlı
  başlıklar; animasyonlu skor değişimi; dönen ışınlı "GOL!" afişi.
- **Performans:** uyarlamalı kalite (3 kademe): kare süresi uzun süre bütçeyi aşarsa parçacıklar,
  bulutlar, ışık efektleri ve kalabalık kıpırtısı azaltılır; düşük güçlü cihazda (≤ 4 çekirdek ya da
  ≤ 4 GB bellek) kenar yumuşatma kapalı ve kalite bir kademe aşağıdan başlar.

### Ses (Web Audio sentezi, harici dosya yok)

- **Efektler:** şut (güce göre ton), kafa, gövde teması, direk "dang", zemin/duvar sekmesi, ağ,
  zıplama, iniş, düdük, balon + güçlendirici, donma, süper hazır, her süper tipine özel ses, menü
  sesleri, son saniye tıkları, gol kornası.
- **Kalabalık:** filtrelenmiş gürültüyle sürekli uğultu; tehlikeli atakta yükselir; golde tezahürat
  patlaması; direkte "ooo".
- **Müzik:** prosedürel, döngüsel menü ve maç parçaları; golde kısılır.
- **Ayarlar:** Ana ses / Efektler (kalabalık dahil) / Müzik; ana menüde ve duraklatma menüsünde;
  kaydedilir. Ses, tarayıcıların autoplay kuralı gereği ilk tuş/tıklama/dokunuşta başlar.
