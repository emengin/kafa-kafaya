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
- Bar doluyken **Süper** tuşu karakterin özel süper şutunu hazırlar: oyuncu parlar ve
  **bir sonraki vuruşu** (şut veya kafa) süper olur. Bar sıfırlanır.
- Şu anki değerler (Faz 3): pasif dolum 0,05/sn (~20 sn), dokunuş başına +0,08 (oyuncu başına
  0,3 sn bekleme), süper hazırken bar dolmaz. Karakterler gelene kadar **genel süper**: şut ×1,5
  hız ve yarı yükselme açısıyla düz gider; kafa topu en az 1500 px/sn ile gönderir.

## 7. Karakterler (10 özgün karakter)

İstatistikler 1–5 ölçeğinde: **Hız**, **Zıplama**, **Şut gücü**, **Kafa boyutu**
(büyük kafa = geniş savunma alanı ama daha ağır). Toplamlar dengeli tutulur (≈13–14).

| #   | Karakter   | Tema                  | Hız | Zıp. | Şut | Kafa | Süper şut                                                                             |
| --- | ---------- | --------------------- | --- | ---- | --- | ---- | ------------------------------------------------------------------------------------- |
| 1   | **Kor**    | Ateş, kırmızı         | 3   | 3    | 5   | 3    | **Alev Topu:** top alev alır, düz ve çok hızlı gider; çarptığı rakibi geri savurur.   |
| 2   | **Ayaz**   | Buz, açık mavi        | 3   | 3    | 3   | 4    | **Dondurucu:** topa değen rakip 1,5 sn donar.                                         |
| 3   | **Şimşek** | Elektrik, sarı        | 5   | 3    | 3   | 2    | **Zikzak:** top dikey eksende zikzak çizerek ilerler, tahmini zorlaşır.               |
| 4   | **Sis**    | Gölge, mor            | 4   | 4    | 3   | 2    | **Işınlanma:** top yolun ortasında kaybolur, rakip kalenin önünde belirir.            |
| 5   | **Kaya**   | Taş, gri              | 2   | 2    | 4   | 5    | **Dev Top:** top 2 kat büyür ve ağırlaşır; kaleciyi iterek geçer.                     |
| 6   | **Bora**   | Rüzgâr, beyaz-yeşil   | 4   | 4    | 3   | 3    | **Hortum:** top etrafında hortum oluşur, yolundaki rakibi geri iter.                  |
| 7   | **Yay**    | Okçu, turuncu         | 3   | 5    | 3   | 3    | **Gökkuşağı:** top yüksek bir yayla tavana yakın gider ve kaleye dik iner.            |
| 8   | **Demir**  | Mıknatıs, kırmızı-gri | 3   | 3    | 4   | 3    | **Mıknatıs:** top uçuş boyunca rakip kaleye doğru hafifçe çekilir (güdümlü).          |
| 9   | **Pamuk**  | Bulut, pembe          | 4   | 4    | 2   | 3    | **Serap:** top üçe bölünür; ikisi yanılsamadır ve kaleye girmeden kaybolur.           |
| 10  | **Toprak** | Deprem, kahverengi    | 2   | 3    | 4   | 4    | **Sarsıntı:** vuruşla yer sarsılır, rakip 1 sn zıplayamaz; top yerde sekerek ilerler. |

> Sayısal değerler `gameConfig.ts` içinde tutulacak ve oyun testleriyle ayarlanacaktır.

## 8. Güçlendiriciler

- Sahada rastgele aralıklarla **süzülen balonlar** belirir (yavaş sinüs hareketi).
- Top balona çarpınca balon patlar; **topa son dokunan oyuncu** güçlendiriciyi kazanır.
- Tüm etkiler sürelidir; HUD'da oyuncunun tarafında **ikon + geri sayım** gösterilir.

| Güçlendirici         | Etki                                     |
| -------------------- | ---------------------------------------- |
| Büyük Kafa           | Kendi kafan büyür.                       |
| Rakibi Küçült        | Rakibin kafası/gövdesi küçülür.          |
| Hız                  | Hareket hızın artar.                     |
| Rakip Kalesini Büyüt | Rakibin kalesi genişler/yükselir.        |
| Rakibi Dondur        | Rakip kısa süre hareket edemez.          |
| Çift Zıplama         | Havadayken bir kez daha zıplayabilirsin. |

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

- Doğrulama: `npm run simulate` (AI vs AI headless maçlar, skor dağılımı ve sıkışma raporu).

## 10. Oyun modları

- **Hızlı Maç:** oyuncu vs CPU, karakter ve zorluk seçimi. (Faz 3: menüde "CPU'ya Karşı" +
  zorluk seçimi var; karakter seçimi sonraki fazlarda.)
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
