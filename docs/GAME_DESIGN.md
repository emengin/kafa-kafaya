# Kafa Kafaya — Oyun Tasarım Belgesi

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
- **Varlıklar:** Harici dosya yok. Grafikler `Graphics → generateTexture`, sesler Web Audio
  API ile sentezlenir.
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
- Arayüz: **Esc / P** duraklat (Devam · Yeniden Başlat · Ana Menü), **F1** debug katmanı.
  Menülerde ↑/↓ (veya W/S) + Enter/Space ya da fare; alt menüden Esc/Backspace ile geri.
- CPU'ya karşı modda tek oyuncu (P1) iki tuş takımından herhangi birini kullanabilir.
- **Gamepad:** sol çubuk/d-pad hareket, A zıpla, X/B şut, RB/RT süper.
- **Mobil:** yatay ekran, solda ←/→, sağda Zıpla / Şut / Süper dokunmatik butonları.

## 5. Maç kuralları

- Süre **90 sn** geri sayım; saat yalnızca oyun akarken işler (santra beklemesinde ve gol
  kutlamasında durur). Son **10 sn** saat kırmızı ve her saniye nabız atar.
- **Gol:** top kale çizgisini **tamamen** geçince (topun merkezi değil, tüm dairesi). Direğe
  çarpıp sahaya dönen top gol değildir. Son adımda atılan gol geçerlidir.
- **Beraberlik:** altın gol uzatması — süre biter, oyuncular ve top santraya alınır,
  "ALTIN GOL!" duyurulur; süresiz oynanır, ilk atan kazanır.
- **Gol anı:** 1 sn ağır çekim (0,3x) + büyük "GOL!" yazısı; golden 2 sn sonra oyuncular
  ve top başlangıç konumlarına döner (kısa kararma). Kısa tekrar sonraki fazlarda
  (isteğe bağlı atlanır).
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
| **Buz**       | Havadan doğrudan değdiği rakibi **1,5 sn** dondurur; ilk sekmede söner.                                    | Şut/kafa, üstünden atla ya da sekmesini bekle. Donma sonrası 1 sn bağışıklık. |
| **Zikzak**    | Yerçekimsiz, dikeyde dalgalanır (y = −55·(1 − cos 2π·2,4t)).                                               | Daha yavaş (×1,15); dalganın dibinde karşıla, sahaya değince söner.           |
| **Işınlanma** | 0,12 sn sonra görünmez olur (oyuncuların içinden geçer), kale çizgisinden 250 px önde ×0,65 hızla belirir. | Kale çizgisine yakın dur: top yavaşlayarak ve önünde belirir.                 |
| **Dev Top**   | Top 1,8 kat büyür, 3 kat ağırlaşır (kaleciyi iter); 2,4 sn.                                                | Büyük top kaleye tam girmekte zorlanır; erken kes, kafayla karşıla.           |
| **Kasırga**   | 150 px içindeki rakibi topun gidiş yönünde iter (havadayken %40).                                          | Zıpla ya da topa aktif vur (etki biter).                                      |
| **Gökkuşağı** | Tavana yakın (y≈70) yayla, hava direnci kapalı, rakip kalenin 180 px önüne dik iner; sekince söner.        | Yavaş ve uzun: geri dön, düştüğü yerde karşıla.                               |
| **Mıknatıs**  | 1,4 sn boyunca rakip kalenin ortasına doğru 1300 px/sn² çekilir.                                           | Çekim zayıf; kalenin önünde dur.                                              |
| **Serap**     | Top üç yöne bölünür (±0,26 rad); gerçek olan tohumla seçilir, ikisi 0,75 sn'de / değince söner.            | Yanılsamalar oyunculara değince ve kaleye yaklaşınca söner; gol olmazlar.     |
| **Sarsıntı**  | Rakip 1 sn zıplayamaz; top −0,2 rad alçak açıyla gider, zeminde 0,85 sekmeyle sekerek ilerler.             | Top alçak: gövdeyle kes, şutla vur.                                           |

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

> Denge: AI vs AI simülasyonuyla (`npm run simulate -- --characters`); güncel tablo PROGRESS.md
> Faz 4'te.

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
- Zorluk seviyeleri (`gameConfig.ts` → `AI_PROFILES`; tam tablo PROGRESS.md Faz 3'te):

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

## 10. Oyun modları

- **Hızlı Maç:** oyuncu vs CPU, karakter ve zorluk seçimi. (Faz 4: "CPU'ya Karşı" → zorluk →
  karakter seçimi; CPU kalan karakterlerden rastgele birini alır. 2 Oyuncu → iki imleçli seçim.)
- **2 Oyuncu:** aynı klavyede iki kişi.
- **Turnuva:** 8 kişilik eleme (çeyrek final → yarı final → final), rakipler giderek zorlaşır.
- **Antrenman:** süresiz, rakipsiz veya pasif rakipli; topu sıfırlama ve süper barını
  doldurma kısayolları.

## 11. Platform ve kayıt

- Masaüstü ve mobil tarayıcılar (mobilde yatay ekran, dokunmatik butonlar).
- Gamepad desteği (Gamepad API).
- Türkçe / İngilizce dil seçeneği.
- `localStorage` ile kayıt: dil, ses seviyesi, tercih edilen karakter, turnuva ilerlemesi,
  istatistikler.

## 12. Ses ve görsel stil

- Canlı, çizgi film tadında renkler; kalın konturlu büyük kafalar.
- Sesler Web Audio ile sentezlenir: vuruş "tok", direk "çın", gol için kalabalık uğultusu
  (gürültü + filtre), düdük, süper şut efektleri.
- Ekran sarsıntısı, parçacıklar ve vuruş anında kısa "hit-stop" ile tatmin edici his.
