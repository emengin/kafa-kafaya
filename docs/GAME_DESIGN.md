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

## 4. Kontroller

| Eylem   | Oyuncu 1  | Oyuncu 2  |
| ------- | --------- | --------- |
| Hareket | A / D     | ← / →     |
| Zıpla   | W         | ↑         |
| Şut     | Space     | Enter     |
| Süper   | Sol Shift | Sağ Shift |

- Klavye eşlemesi `KeyboardEvent.code` ile yapılır (sol/sağ Shift ayrımı ve klavye
  düzeninden bağımsızlık için).
- **Gamepad:** sol çubuk/d-pad hareket, A zıpla, X/B şut, RB/RT süper.
- **Mobil:** yatay ekran, solda ←/→, sağda Zıpla / Şut / Süper dokunmatik butonları.

## 5. Maç kuralları

- Süre **90 sn**.
- **Gol:** top kale çizgisini **tamamen** geçince (topun merkezi değil, tüm dairesi).
- **Beraberlik:** altın gol uzatması — ilk atan kazanır.
- **Gol anı:** ağır çekim + büyük "GOL!" yazısı + kısa tekrar (isteğe bağlı atlanır) +
  santra. Santrada oyuncular ve top başlangıç konumlarına döner; top ortadan hafifçe
  yukarıdan bırakılır.

## 6. Güç barı ve süper şut

- Her oyuncunun bir güç barı vardır. Topa dokundukça ve zamanla (yavaşça) dolar.
- Bar doluyken **Süper** tuşu karakterin özel süper şutunu hazırlar: oyuncu parlar ve
  **bir sonraki vuruşu** (şut veya kafa) süper olur. Bar sıfırlanır.

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

- Topun yörüngesini **fizik modülüyle ileri simüle ederek** tahmin eder (aynı deterministik
  kod; ayrı bir "hayalet" dünya kopyasında).
- Yalnızca `InputState` üretir; oyun durumunu değiştirmez, **hile yapmaz**.
- Zorluk seviyeleri şu parametrelerle ayrışır:

| Seviye | Reaksiyon gecikmesi | Tahmin hatası | Agresiflik | Süper kullanımı |
| ------ | ------------------- | ------------- | ---------- | --------------- |
| Kolay  | Yüksek              | Yüksek        | Düşük      | Nadiren         |
| Orta   | Orta                | Orta          | Orta       | Bazen           |
| Zor    | Düşük               | Düşük         | Yüksek     | Akıllıca        |

## 10. Oyun modları

- **Hızlı Maç:** oyuncu vs CPU, karakter ve zorluk seçimi.
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
