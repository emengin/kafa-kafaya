# Kafadarlar — Mobil Oyun Tasarım Belgesi

> **Durum:** Faz 1.1'de dolduruldu (2026-11-20). Temel kararlar § Kararlar'da (K1–K12 Faz 0.4,
> K13–K17 Faz 1.1, K18 ve K2 güncellemesi 2026-11-26, K19 2026-11-28).
>
> **Ad:** "Kafadarlar: Kafa Topu Düellosu" (K19; eski çalışma adı "Kafa Kafaya"). Dünya ve kadro:
> K18; görsel kurallar [ART_BIBLE.md](ART_BIBLE.md).
>
> Bu belge [GAME_DESIGN.md](GAME_DESIGN.md)'yi (web sürümü: fizik, kurallar, karakterler, süperler,
> AI) **genişletir**, yerine geçmez. İkisi çeliştiğinde mobil derleme için bu belge geçerlidir ve
> çelişki burada açıkça yazılır (§1.6). Bağlayıcı ilkeler: [ROADMAP_MOBILE.md](ROADMAP_MOBILE.md) §
> Çalışma kuralları (para kazanma, gizlilik, varlık kuralları) ve bu belgenin § Kararlar bölümü.
>
> **Sayılar hakkında:** Bu belgedeki bütün sayılar ilk hedeftir. Nakama gelene kadar
> `src/config/gameConfig.ts`'te, sonra Nakama'da uzaktan ayar olarak tutulur (K6). Ekonomi Faz 6.9'da
> simülasyonla, karakter dengesi Faz 2.9 ve 7.6'da AI-vs-AI ile, elde tutma Faz 11.3 ve 12.6'da gerçek
> veriyle doğrulanır. §2.5'teki tablo bu belgenin değerleriyle çalışan bir hesap modelinden çıktı.

## 0. Bir bakışta

- **Döngü:** 90 sn'lik maç → Altın, XP, görev ilerlemesi → hesap seviyesi, Sezon Kartı, karakter
  koleksiyonu → dolapta giydirme, online maçta gösteriş → tekrar. Hedef oturum 10–15 dk (3–5 maç).
- **İki para birimi:** Altın oynayarak kazanılır ve **satılmaz**; Elmas satın alınır, az miktarda
  yalnızca sunucunun doğruladığı olaylardan (online maç, giriş günü) kazanılır (K13, K17).
- **Dünya:** stadyumlar (gündüz, gece ışıklı, karlı, yağmurlu; ileride kumsal, çatı gibi eğlenceli
  sahalar). Kadro çoğunlukla kurgusal futbolcu tipleri, aralarında 3 sürpriz komik karakter (K18).
- **12 karakter:** 3'ü baştan açık, 2'si seviye ödülü (oyuncu seçer), 7'si 5.000 Altın ya da 500
  Elmas. Düzenli ücretsiz oyuncu kilitli bir karakteri **yaklaşık 1 haftada** açar (K15).
- **Sezon Kartı:** 7 hafta, 50 kademe; ücretsiz yol 25 ödül, premium yol 50 ödül; ikisinde de Elmas
  yok. Düzenli ücretsiz oyuncu ücretsiz yolu 5. haftada bitirir.
- **Satılanlar:** karakterler (yalnızca beklememek için), kozmetikler, Sezon Kartı, VIP Kulüp,
  reklamsız paket, başlangıç ve kurucu paketi, Elmas paketleri. Rastgele kutu, çark, güç yok.
- **Reklam:** 4 ödüllü yerleşim, maç sonunda sınırlı geçiş reklamı (ilk 5 maç ve ilk oturumda hiç
  yok, en fazla 3 maçta bir). Banner yok, maç içinde asla.
- **Sıralamalıda kör seçim:** karakter eşleşmeden önce seçilir; karşı karakter seçimi yapılamaz.
  Eşleşme eşiği %35–65, genel kazanma bandı %45–55 (K1, K14).

## 1. Çekirdek döngü ve meta döngü

### 1.1 Döngü katmanları

| Ölçek  | Süre          | Döngü                                                                                      | Çıktı                                             |
| ------ | ------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| An     | 1–5 sn        | Konumlan → zıpla/şut/kafa → top temas → güç barı dolar → süper                             | Gol, kurtarış, "kafa kafaya" çarpışma anı         |
| Maç    | ~2,5 dk       | Giriş (≤ 4 sn) → 90 sn oyun (gol sonrası duraklama, altın gol) → sonuç ekranı              | Altın, XP, görev ilerlemesi, kupa (sıralamalıda)  |
| Oturum | 10–15 dk      | 3–5 maç; 1–2 görev biter; günlük ödül alınır                                               | Seviye, Sezon Kartı kademesi, bir hedefe yaklaşma |
| Gün    | 2–3 oturum    | 3 günlük görev, giriş takvimi adımı, günlük vitrin, tek oyunculu tavan                     | ~1.000 Altın ve ~13 Elmas (düzenli oyuncu, §2.5)  |
| Hafta  | 7 gün         | 4 haftalık görev, haftalık XP takviyesi, hafta sonu etkinliği, haftanın ücretsiz karakteri | Yeni karakter (~1/hafta), etkinlik kozmetiği      |
| Sezon  | 7 hafta (6–8) | Sezon Kartı, sıralamalı sezon, sezon teması ve yeni kozmetikler                            | Sezon sonu lig ödülü, sezon skini, sezon imzası   |

### 1.2 Döngü diyagramı

```text
        ┌──────────────────────────── tekrar ────────────────────────────┐
        ▼                                                                 │
   ┌─────────┐   ┌──────────────────┐   ┌───────────────────┐   ┌─────────┴─────────┐
   │   MAÇ   │──▶│      ÖDÜL        │──▶│     İLERLEME      │──▶│ KOZMETİK/GÖSTERİŞ │
   │ 90 sn   │   │ Altın · XP       │   │ Hesap seviyesi    │   │ Dolapta giydir    │
   │ 1v1     │   │ görev ilerlemesi │   │ Sezon Kartı       │   │ Rakip görür:      │
   └─────────┘   │ kupa (online)    │   │ Karakter koleks.  │   │ giriş, kutlama,   │
        ▲        │ Elmas (yalnız    │   │ Ustalık (online)  │   │ top izi, çerçeve  │
        │        │ online/sunucu)   │   └───────────────────┘   └───────────────────┘
        │        └──────────────────┘             │
        └──── yeni karakter / yeni deneme ◀───────┘
```

Ana bağ: **çeşitlilik**. Yeni karakter, yeni süper ve yeni kozmetik maçı farklı oynatır ya da
farklı gösterir; hiçbiri maçı kolaylaştırmaz (§9).

### 1.3 Maç ve oturum hedefleri

- **Maç:** online modlarda 90 sn sabit; tek oyunculuda 60/90/120 sn ayarı web'deki gibi kalır.
  Beraberlik altın golle çözülür. Maç başından sonuç ekranına ortalama 2,5 dk; giriş ve sonuç
  ekranları dahil bir maç 3 dakikayı geçmez (altın gol hariç).
- **Oturum:** hedef 10–15 dk, 3–5 maç. Her oturumda en az bir somut ilerleme görünür (görev, kademe,
  seviye ya da karakter için Altın çubuğu).
- **Maça dönüş süresi:** sonuç ekranından yeni maça tek dokunuş ("Tekrar" → aynı mod ve karakter).
  Ana menüden maça en çok 2 dokunuş.
- **İmza an — "kafa kafaya":** iki kafanın çarpıştığı an ayrı bir sunum anıdır (kısa donma,
  sarsıntı, yıldızlar, onomatope). Yalnızca sunum katmanında (K5); simülasyonu değiştirmez. Uygulama
  Faz 3.6.

### 1.4 Sonuç ekranı: kaybetmek de bir şey kazandırır

- Büyük başlık (GALİBİYET / MAĞLUBİYET), iki karakter ifadesiyle, skor, Altın ve XP sayacı, görev ve
  Sezon Kartı çubukları, sıralamalıda kupa değişimi.
- Ödüllü modlarda her maç en az 20 Altın (online) ya da 5 Altın (tek oyunculu, Kolay) ve XP verir;
  "0 ödül" ekranı yoktur. Tek oyunculu tavan dolduysa bu açıkça yazılır (§2.4); ödülsüz modlar (özel
  oda, antrenman) sonuç ekranında ödül alanı göstermez.
- **Maçın anı:** en iyi gol (en hızlı şut ya da süperli gol) 3–5 sn tekrar olarak oynatılabilir
  (deterministik tekrar sistemi). Paylaşma Faz 12.4'ün fragman altyapısıyla gelir.
- Hazır ifade paneli (online), "Rövanş" (özel odada) ya da "Tekrar" butonu.
- **Sonuç ekranında satış yoktur:** kaybedince teklif, indirim ya da paket gösterilmez. Tek istisna
  isteğe bağlı "Ödülü 2 katına çıkar" ödüllü reklamıdır; "Devam" butonu en az onun kadar büyüktür.

### 1.5 Ana menü

Rakiplerin ana menüsü 13–31 dokunulabilir öğe taşıyor (COMPETITOR_ANALYSIS.md §3.2). Kafadarlar'ın
kalıcı öğe sınırı **10**, etkin bir etkinlik varsa +1 etkinlik kartı:

| #   | Öğe                        | Yer           | Not                                                                               |
| --- | -------------------------- | ------------- | --------------------------------------------------------------------------------- |
| 1   | Profil (avatar, seviye)    | sol üst       | Profil, başarımlar, ustalıklar, kupa dolabı                                       |
| 2–3 | Altın · Elmas göstergeleri | sağ üst       | Altın "+" → "Altın nasıl kazanılır" (satılmaz); Elmas "+" → Mağaza > Elmas        |
| 4   | Ayarlar                    | sağ üst       |                                                                                   |
| 5   | Mağaza                     | sağ           |                                                                                   |
| 6   | Sezon Kartı                | sağ           | Mevcut kademe ve sonraki ödül                                                     |
| 7   | Görevler                   | sol alt       | Günlük + haftalık; alınabilir ödül varsa rozet                                    |
| 8   | Kadro                      | sol alt       | Karakterler + dolap (iki sekme)                                                   |
| 9   | OYNA                       | sağ alt       | En büyük ve en doygun öğe; rengi başka yerde kullanılmaz                          |
| 10  | Mod seçici                 | OYNA'nın üstü | Sıralamalı (varsayılan) · Etkinlik · Hızlı Maç · Kupa Yolu · Antrenman · Özel Oda |

- Ortada seçili karakter büyük ve canlı (nefes alan bekleme animasyonu).
- **Rozet kuralı:** rozet yalnızca alınabilir bir ödül ya da yeni açılan bir özellik varsa çıkar;
  aynı anda en çok 3 rozet. Kilit simgesi yoktur; açılan özellik "YENİ" etiketiyle gelir (§8.2).
- "Reklamları Kaldır" ana menüde yer almaz (Mağaza > Elmas'ta; §5.2).

### 1.6 Web sürümünden farklar

İki belgenin çeliştiği yerler; mobil derlemede bu belge geçerlidir.

| Konu                  | Web (GAME_DESIGN.md)                                   | Mobil                                                                            |
| --------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Karakter kilitleri    | 6 açık; her turnuva şampiyonluğu sıradakini açar (§11) | 3 açık, 2 seviye ödülü, 7 Altın/Elmas ile (§9.3); Kupa Yolu karakter açmaz       |
| Kadro                 | 10 karakter                                            | 12 karakter: + Dede, Kaleci Teyze (§9.4); Toprak'ın yerini Bakkal alır (§9.2)    |
| Maç süresi            | 60/90/120 sn ayarı                                     | Online 90 sn sabit; tek oyunculuda ayar kalır                                    |
| Duraklatma            | Her durumda                                            | Online maçta yok (bağlantı ve kopma Faz 9.6); tek oyunculuda var                 |
| Gol tekrarı           | Her golden sonra, ayardan kapatılabilir                | Online'da maç içinde yok, sonuç ekranında "maçın anı"; tek oyunculuda ayar kalır |
| 2 oyuncu aynı cihazda | Klavye ve/veya iki gamepad                             | Gamepad ile; dokunmatik düzen prototipi Faz 2.3'te (§7.7); ödülsüz               |
| Turnuva               | Tek turnuva, karakter açar                             | Kupa Yolu: 8 kupa, yalnızca Altın + XP (§7.4)                                    |
| Kayıt ve ilerleme     | `localStorage`                                         | Sunucu (Nakama); çevrimdışı ödüller kuyrukta (K3)                                |
| Güçlendiriciler       | Her maçta                                              | Sıralamalıda açık (tohumlu, iki taraf için aynı); özel odada aç/kapa             |

## 2. Ekonomi

### 2.1 Para birimleri ve kurallar

| Birim     | Nasıl gelir                                                                    | Ne alır                                                      | Satılır mı                 |
| --------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------ | -------------------------- |
| **Altın** | Her modda maç, görev, giriş takvimi, seviye, Sezon Kartı, reklam               | Karakter, Sade ve Nadir kozmetik, stadyum parçaları          | **Hayır** (K17)            |
| **Elmas** | Satın alma; online görev ve başarım, giriş takvimi, sıralamalı sezon sonu, VIP | Karakter, Destansı ve Efsanevi kozmetik, Sezon Kartı, kademe | Evet (Elmas paketleri)     |
| **XP**    | Her modda maç ve görev (para birimi değil, harcanmaz)                          | Hesap seviyesi ve Sezon Kartı kademesini aynı anda ilerletir | Hayır (VIP ×2 hızlandırır) |

Temel kurallar:

1. **Elmas tek oyunculudan asla gelmez** (K3); Elmas veren her şey yalnızca sunucunun doğruladığı
   bir olayla ilerler (K13).
2. **Altın satın alınamaz** (K17): Elmas → Altın dönüşümü yok, ücretli pakette Altın yok. Altınla
   alınan her şey oynanarak alınmıştır.
3. **Reklamdan Elmas yok** (K17): ödüllü reklamlar yalnızca Altın ve deneme verir.
4. Bütün bakiye değişiklikleri sunucu RPC'leriyle ve işlem defterine kayıtla olur (Faz 5.3).
5. Fiyatlar sabittir; vitrindeki indirim gerçektir ve katalog fiyatıyla yan yana gösterilir.

### 2.2 Kaynaklar

Günlük sıfırlama 00:00 TSİ (UTC+3), haftalık sıfırlama pazartesi 00:00 TSİ; ikisi de uzaktan ayar.

| Kaynak                                  | Para birimi           | Miktar                                                         | Günlük tavan                    | Not                                                               |
| --------------------------------------- | --------------------- | -------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------- |
| Online maç (Sıralamalı, Etkinlik)       | Altın + XP            | Galibiyet 40 + 50 XP · mağlubiyet 20 + 30 XP                   | Yok (maç süresi doğal sınır)    | Sonuç sunucuda checksum ile doğrulanır (Faz 9.3)                  |
| Tek oyunculu maç (Hızlı Maç, Kupa Yolu) | Altın + XP            | Orta: galibiyet 25 + 30 XP · mağlubiyet 10 + 15 XP (§2.4)      | **300 Altın + 600 XP** (toplam) | K3, K16; online kuyrukta yapay zekâya düşen maç da buraya sayılır |
| Kupa Yolu şampiyonluğu                  | Altın + XP            | 100 + 100 XP                                                   | Tek oyunculu tavana dahil       |                                                                   |
| Haftalık maç XP takviyesi               | XP                    | Haftanın ilk 1.000 maç XP'si ×2                                | 1.000 ek XP / hafta             | Az oynayanı yakalatır; görev XP'sine uygulanmaz                   |
| Günlük görev — kolay ve orta (her mod)  | Altın + XP            | 60 + 100 XP · 90 + 150 XP                                      | 2 görev                         | Tamamlanmayan günlük görev ertesi gün yenilenir                   |
| Günlük görev — online                   | Elmas + XP            | 5 Elmas + 150 XP                                               | 1 görev                         | Yalnızca online maç ilerletir (K13)                               |
| Haftalık görev — her mod                | Altın + XP            | 300 + 500 XP (×2)                                              | 2 / hafta                       | Birikir: sezon sonuna kadar açık kalır                            |
| Haftalık görev — online                 | Elmas + XP            | 15 Elmas + 500 XP (×2)                                         | 2 / hafta                       | Birikir; yalnızca online maç ilerletir                            |
| Giriş takvimi                           | Altın + Elmas         | 7 adımlık tur: 700 Altın + 25 Elmas (§8.4)                     | 1 adım                          | Kaçırılan gün turu sıfırlamaz                                     |
| Hesap seviyesi                          | Altın (+ kozmetik)    | Seviye başına 100; her 5. seviyede +300 ve kozmetik (§2.6)     | —                               | Elmas yok (K13)                                                   |
| Sezon Kartı — ücretsiz yol              | Altın + kozmetik      | Sezonda toplam 3.000 Altın; 50. kademeden sonra her kademe 100 | —                               | Elmas yok (K13)                                                   |
| Sezon Kartı — premium yol               | Altın + kozmetik      | Sezonda toplam 5.000 Altın + 50 ödül (§3.2)                    | —                               | Elmas yok (K13)                                                   |
| Sıralamalı sezon sonu                   | Altın + Elmas         | 300 Altın … 4.000 Altın + 150 Elmas (§7.2)                     | Sezon başına 1                  | Lige göre                                                         |
| Online başarımlar                       | Elmas + Altın         | Başarım başına 10–50 Elmas                                     | Ömür boyu toplam 500 Elmas      | Tek seferlik                                                      |
| Diğer başarımlar                        | Altın + XP            | 100–1.000 Altın                                                | —                               | Tek seferlik; Elmas yok                                           |
| Etkinlik görevleri                      | Altın + XP + kozmetik | 3 görev × (100 + 150 XP); üçü bitince Nadir etkinlik kozmetiği | Etkinlik başına                 | Online maç ilerletir                                              |
| Ödüllü reklam — günlük bedava ödül      | Altın                 | 40, sonra 60                                                   | 2 izleme                        | §6.1                                                              |
| Ödüllü reklam — maç ödülü ×2            | Altın                 | Maçın Altın'ı kadar ek                                         | 3 izleme                        | XP'ye uygulanmaz; ek kısım tek oyunculu tavana sayılmaz (§6.1)    |
| VIP Kulüp                               | Elmas                 | Günde 10 (otomatik yatar)                                      | Abonelik süresince              | §5.2                                                              |
| Satın alma                              | Elmas                 | §5.1                                                           | 18 yaş altı limiti (§5.4)       |                                                                   |
| Hesap açılışı (eğitim maçı sonrası)     | Altın + XP + kozmetik | 100 + 100 XP + Sade aksesuar ("Çaylak bandı")                  | 1 kez                           |                                                                   |
| Hesap bağlama                           | Kozmetik              | Nadir profil çerçevesi                                         | 1 kez                           | 5. maçtan sonra önerilir (§8.2)                                   |
| Geri dönüş hediyesi                     | Altın + XP takviyesi  | 1.000 Altın + 3 maç boyunca maç XP'si ×2                       | 90 günde 1                      | 14 günden uzun aradan sonra ilk girişte                           |

### 2.3 Harcama yerleri

| Harcama                                 | Para birimi   | Miktar                               | Günlük tavan | Not                                                          |
| --------------------------------------- | ------------- | ------------------------------------ | ------------ | ------------------------------------------------------------ |
| Kilitli karakter                        | Altın / Elmas | 5.000 Altın ya da 500 Elmas          | —            | Yeni karakterler de ilk günden Altınla alınabilir (§9.3)     |
| Kozmetik — Sade, Nadir                  | Altın         | 300–2.500 (§4.2)                     | —            | Katalogda her zaman; vitrinde %20 indirimli                  |
| Kozmetik — Destansı, Efsanevi           | Elmas         | 100–900 (§4.2)                       | —            | Vitrinde döner; istek listesi bildirimi                      |
| Sezon Kartı — premium yol               | Elmas / TL    | 900 Elmas ya da ₺249,99              | Sezonda 1    | Geriye dönük açılır                                          |
| Sezon Kartı kademesi                    | Elmas         | 150 / kademe                         | —            | Yalnızca kart ekranında; bildirim ya da pop-up ile önerilmez |
| Ad değiştirme (öneri; kural Faz 5.2'de) | Altın         | İlk değişiklik ücretsiz, sonra 1.000 | 30 günde 1   |                                                              |
| Elmas → Altın dönüşümü                  | —             | **Yok**                              | —            | K17                                                          |

### 2.4 Tek oyunculu ödüller, tavan ve makullük eşikleri

Tek oyunculu maç ödülleri (Hızlı Maç ve Kupa Yolu, zorluk oyuncunun seçimi ya da kupanın zorluğu):

| Zorluk | Galibiyet        | Mağlubiyet       |
| ------ | ---------------- | ---------------- |
| Kolay  | 15 Altın + 20 XP | 5 Altın + 10 XP  |
| Orta   | 25 Altın + 30 XP | 10 Altın + 15 XP |
| Zor    | 35 Altın + 40 XP | 15 Altın + 20 XP |

- **Günlük tavan: 300 Altın + 600 XP** (sunucu günü). Tavan, VIP ve haftalık takviye çarpanlarından
  önceki değere uygulanır. Tavana ulaşınca maçlar oynanmaya devam eder, sonuç ekranı ödül yerine
  "Bugünkü tek oyunculu ödüllerin hepsini aldın · yenilenme 00:00" yazar. Tavan dolmadan önce
  gösterge Kadro ve mod seçicide görünür (gizli sınır yok).
- **Ödülsüz modlar:** antrenman, özel oda, yerel 2 oyuncu, eğitim maçı (hesap açılış hediyesi
  hariç).
- **Makullük eşikleri** (sunucu, Faz 5.3; ilk değerler, test verisiyle güncellenir). Eşiği aşan
  sonuç ödülsüz kalır ve loglanır; oyuncuya "bazı çevrimdışı sonuçlar doğrulanamadı" denir:

| Kontrol           | Eşik                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| Simülasyon süresi | Bildirilen kare sayısı ≥ maç süresi × 60 ve ≤ (maç süresi + 600 sn) × 60 (altın gol payı)          |
| Maçlar arası süre | Ardışık iki maç sonu arasındaki istemci süresi ≥ maç süresi + 20 sn                                |
| Skor aralığı      | 90 sn için kazanan golü ≤ 30, gol farkı ≤ 25 (süreyle orantılı ölçeklenir)                         |
| Sıklık            | Günde en çok 60 tek oyunculu sonuç işlenir; kuyrukta en çok 200 sonuç tutulur                      |
| Tutarlılık        | Karakter oyuncunun sahip olduğu ya da haftanın ücretsiz karakteri; zorluk ve süre geçerli değerler |

Kuyruktaki sonucun hangi güne sayılacağı (cihaz saati mi, sunucu günü mü) Faz 5.3'te karara
bağlanır (§ Hâlâ açık olanlar).

### 2.5 Günlük kazanç hedefleri

Hesap modeli: §2.2'deki değerler, online galibiyet oranı %50, tek oyunculu Orta galibiyet oranı %60;
ilk sezon (49 gün) ortalaması. Sıralamalı sezon sonu ödülü, başarımlar ve etkinlikler dahil
değildir (muhafazakâr). "Saf karakter süresi" = 5.000 Altın ÷ reklamsız günlük Altın (bütün Altın
karaktere giderse).

| Oyuncu tipi    | Oyun                                     | Altın / hafta | Reklam payı | Elmas / hafta | XP / hafta | Saf karakter süresi | Ücretsiz Sezon Kartı | Sezon sonu seviye |
| -------------- | ---------------------------------------- | ------------- | ----------- | ------------- | ---------- | ------------------- | -------------------- | ----------------- |
| **Hafif**      | 5 gün × 3 maç (2 online + 1 tek), ~10 dk | ~2.900        | %7          | ~58           | ~3.850     | ~13 gün             | 33/50 kademe (%66)   | 26                |
| **Düzenli**    | 7 gün × 8 maç (6 + 2), ~25 dk            | ~7.000        | %22         | 90            | ~7.900     | ~6,5 gün            | 5. hafta (36. gün)   | 38                |
| **Yoğun**      | 7 gün × 20 maç (16 + 4), ~60 dk          | ~10.000       | %15         | 90            | ~11.000    | ~4 gün              | 4. hafta (26. gün)   | 47                |
| **Çevrimdışı** | 7 gün × 12 tek oyunculu maç, ~35 dk      | ~5.200        | %0          | 25            | ~5.850     | ~7 gün              | 7. hafta (48. gün)   | 33                |

Günlük kırılım, düzenli oyuncu (haftalık ortalamanın 1/7'si): maçlar ~230 Altın, günlük görevler
150, haftalık görevler ~85, giriş takvimi 100, seviye ~120, Sezon Kartı ~100, reklam ~220 (isteğe
bağlı). Elmas: online görevler ~9, giriş takvimi ~3,6 → **~13 Elmas/gün, ~630 Elmas/sezon**.

Bu tablodan çıkan tasarım hedefleri (Faz 6.9 doğrular):

- Ödüllü reklam düzenli oyuncunun Altın'ının **%25'ini geçmez**; reklamsız oynayan da aynı hedeflere
  en çok %30 geç ulaşır.
- Düzenli ücretsiz oyuncu tüm kadroyu (7 Altın karakteri), Altın'ının %60'ını karaktere vererek
  **~8 haftada**, yoğun oyuncu ~6 haftada tamamlar; kalan Altın kozmetiğe gider.
- Online görevlerini her gün yapan ücretsiz oyuncu (düzenli ya da yoğun; Elmas görevlerle sınırlı
  olduğu için ikisi eşit) bir sezonda ~630 Elmas + sezon sonu ödülü biriktirir; premium Sezon Kartı
  (900 Elmas) yaklaşık her 1,3 sezonda bir oynanarak alınabilir.
- Çevrimdışı oyuncu tavan sayesinde online oyuncudan fazla kazanamaz; Elmas'ı yalnızca giriş
  takviminden gelir.

### 2.6 Hesap seviyesi

- Bir sonraki seviye için gereken XP: Sv 1–29'da **100 + 75 × (Sv − 1)** (Sv 1 → 2: 100 XP, Sv 29 →
  30: 2.200 XP); Sv 30'dan sonra sabit **2.500 XP**. Toplam: Sv 4 = 525 XP, Sv 10 = 3.600 XP, Sv 20 =
  14.725 XP, Sv 30 = 33.350 XP. Üst sınır yok (gösterim 999'a kadar).
- Seviye güç vermez (K1). Ödüller ve açılımlar:

| Seviye             | Ödül / açılım                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| Her seviye         | 100 Altın                                                                                         |
| 3                  | Sezon Kartı açılır                                                                                |
| 4                  | **Ücretsiz karakter seçimi #1** (kilitli karakterlerden biri, oyuncu seçer)                       |
| 5                  | Kupa Yolu ve haftalık görevler; +300 Altın, Sade ifade                                            |
| 6                  | Arkadaşlar ve özel oda                                                                            |
| 8                  | Etkinlikler; VIP Kulüp mağazada görünür                                                           |
| 10                 | **Ücretsiz karakter seçimi #2**; kendi stadyumun (Faz 6.7); +300 Altın, Nadir profil çerçevesi    |
| 15, 20, 25, 30     | +300 Altın ve sırayla Nadir isim plakası, Nadir top izi, Nadir forma, Destansı gol patlama efekti |
| 35'ten sonra her 5 | +300 Altın; 50, 75, 100'de seviye çerçevesi (yalnızca seviyeyle kazanılır)                        |

Düzenli oyuncu Sv 4'e ilk gün, Sv 10'a üçüncü gün ulaşır (§2.5 modeli).

### 2.7 Enflasyon, tavanlar ve uzaktan ayar

- **Altın havuzu:** düzenli oyuncu ilk iki ayda Altın'ının büyük kısmını karakterlere verir; sonra
  katalog (lansmanda ~100 Sade/Nadir ürün, ortalama ~1.200 Altın ≈ 120.000 Altın) ve her sezon eklenen
  ~20 Altın ürünü uzun vadeli harcama yeridir. Yoğun oyuncu kataloğu ~4–5 ayda bitirebilir; bu kabul
  edilir (koleksiyoncu ödülü).
- **Elmas havuzu:** ücretsiz Elmas tavanları (günlük/haftalık online görevler, 500 Elmaslık ömür boyu
  başarım tavanı, sezon sonu tablosu) ücretsiz Elmas'ı sezonda ~800 ile sınırlar.
- **Cüzdan sınırı:** 9.999.999 Altın ve Elmas (gösterim ve taşma güvenliği).
- **Uzaktan ayar anahtarları** (Faz 5.4'te Nakama'ya taşınır; ad önerisi):
  `economy.match.*` (online ve tek oyunculu ödüller), `economy.singleplayer.dailyCap.{gold,xp}`,
  `economy.weeklyXpBoost`, `economy.quests.*`, `economy.login.calendar`, `economy.level.curve`,
  `economy.prices.*`, `season.*` (§3), `ads.*` (§6.2), `economy.reset.{dailyTime,weeklyDay,timeZone}`.
- Bir değer değiştiğinde 6.9'daki simülasyon yeniden koşulur; §2.5 tablosu güncellenir.

## 3. Sezon Kartı

### 3.1 Yapı

| Özellik        | Değer                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------- |
| Süre           | Varsayılan 7 hafta (49 gün), sezon tanımında 6–8 hafta; sezonlar arasında boşluk yok          |
| Kademe         | 50 kademe × 800 XP (toplam 40.000 XP); XP hesap seviyesiyle aynı kaynaktan gelir              |
| Bonus kademe   | 50'den sonra her 800 XP: 100 Altın (iki yol da), sınırsız                                     |
| Ücretsiz yol   | 25 ödül (her 2 kademede bir)                                                                  |
| Premium yol    | 50 ödül (her kademede bir); 1. kademe ödülü, kart alınınca anında açılan Efsanevi sezon skini |
| Premium fiyatı | ₺249,99 ya da 900 Elmas (§5.2)                                                                |
| Açılış         | Hesap seviyesi 3                                                                              |
| Elmas          | **Hiçbir yolda yok** (K13)                                                                    |
| Tema           | Her sezon bir tema: saha, karakter skinleri, top, efekt ve arayüz vurgusu aynı temadan        |

### 3.2 Ödül dağılımı

| Ödül türü                                    | Ücretsiz yol (25) | Premium yol (50)                                                                       |
| -------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------- |
| Altın (150–800'lük paketler)                 | 12 (toplam 3.000) | 10 (toplam 5.000)                                                                      |
| İfade, profil çerçevesi, isim plakası (Sade) | 7                 | 10                                                                                     |
| Nadir kozmetik                               | 4                 | 15                                                                                     |
| Destansı kozmetik                            | 1 (50. kademe)    | 12                                                                                     |
| Stadyum parçası (Destansı)                   | —                 | 1                                                                                      |
| Efsanevi                                     | —                 | 2: 1. kademe sezon skini, 50. kademe "sezon imzası" (animasyonlu kutlama + giriş seti) |
| Sezon rozeti (profil)                        | 1                 | —                                                                                      |

İç hedef: premium yolun mağaza eşdeğeri fiyatının en az 8 katı. Arayüzde "X kat değer" gibi bir
iddia yazılmaz; yalnızca ödüllerin kendisi önizlenir.

### 3.3 Ulaşılabilirlik hedefi

- Düzenli ücretsiz oyuncu 50 kademeyi **5. haftada**, yoğun oyuncu 4. haftada bitirir; hafif oyuncu
  sezon sonunda **en az %60'a** (30 kademe) ulaşır (§2.5: 33 kademe).
- Bunu sağlayan yakalama mekanizmaları: haftalık maç XP takviyesi, biriken haftalık görevler, geri
  dönüş hediyesi. Faz 6.9 simülasyonu bu üç hedefi doğrular; tutmazsa önce kademe XP'si değişir.

### 3.4 Kurallar

- Premium sezonun herhangi bir anında alınabilir; o ana kadar ulaşılan kademelerin ödülleri hemen
  açılır.
- Sezon sonunda alınmamış ödüller **otomatik teslim edilir**; hiçbir şey kaybolmaz.
- Kademe satın alma (150 Elmas) yalnızca kart ekranındaki bir butondur. Sezonun son günlerinde
  bildirim, pop-up ya da "son şans" mesajı yoktur. Bitiş tarihi kart ekranında tarih ve saat olarak
  yazılır; saniye saniye işleyen sayaç yoktur.
- **Dönüş politikası:** sezon kozmetikleri sezon boyunca yalnızca kartta bulunur. Sezon bitince en
  erken 12 ay sonra Mağaza'ya Elmasla dönebilir; 1. kademe sezon skini ve 50. kademe sezon imzası
  hiç dönmez (gösteriş değeri).
- Premium yol oynanış avantajı vermez; XP kazanımını da hızlandırmaz.

### 3.5 Sezon takvimi

- Lansman (Faz 12.7) için ilk 2–3 sezonun içeriği hazır olur. Sezon başına içerik hedefi: 75
  ödül + Mağaza'ya ~20 yeni ürün + 1 etkinlik serisi.
- Tema örnekleri (stadyum varyantlarıyla, ART_BIBLE §10.4): S1 "Açılış" (ilk stadyum, oyunun
  kimliği), S2 "Kış Ligi" (karlı stadyum), S3 "Gece Maçı" (ışıklı stadyum), S4 "Yaz Sahili" (kumsal
  sahası). Yağmurlu stadyum bir etkinlik ya da sezon teması olabilir.
- Yeni karakter (lansman sonrası) bir sezonun teması olarak gelebilir; aynı gün Altınla da
  alınabilir (§9.3).

## 4. Kozmetik kategorileri

### 4.1 Kategoriler

| #   | Kategori                    | Kapsam                     | Kim görür                                            | Özel kural                                                                                                  |
| --- | --------------------------- | -------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | Karakter skini              | Karaktere özel             | Herkes                                               | Saç, yüz boyası, kostüm teması; kafa dairesi ve oranlar aynı                                                |
| 2   | Forma                       | Evrensel                   | Herkes                                               | Oyuncu her ekranda solda; çakışmada (ayna maçı dahil) sağdaki rakip alternatif renge geçer (ART_BIBLE §2.6) |
| 3   | Ayakkabı                    | Evrensel                   | Herkes                                               | Ayak çarpışma şekli değişmez; iz efekti varsa ≤ efekt bütçesi                                               |
| 4   | Aksesuar                    | Evrensel (kafa)            | Herkes                                               | Silüet kafa dairesinin dışına en çok yarıçapın %12'si kadar taşar                                           |
| 5   | Top skini                   | Evrensel                   | Herkes: maçta **ev sahibinin** topu                  | Aynı boyut, kalın dış kontur; zeminle karışan ya da saydam desen yok                                        |
| 6   | Top izi                     | Evrensel                   | Herkes: **topa son dokunanın** izi                   | Top her zaman izin üstünde; iz topu gizlemez                                                                |
| 7   | Gol patlama efekti          | Evrensel                   | Herkes: golcünün                                     | Gol sonrası duraklama süresinde; tam ekran parlama kuralı (QUALITY_BAR §5)                                  |
| 8   | Gol kutlaması               | Evrensel (parçalı iskelet) | Herkes: golcünün                                     | Deterministik gol sonrası duraklama süresine sığar; sunum katmanında                                        |
| 9   | Profil çerçevesi            | Evrensel                   | Eşleşme ekranı, sıralama tablosu, profil             | Lig, seviye ve başarım çerçeveleri satılmaz                                                                 |
| 10  | İsim plakası                | Evrensel                   | Eşleşme ekranı, HUD'daki ad şeridi                   | Okunurluk: metin kontrastı ≥ 4,5:1                                                                          |
| 11  | Maç öncesi giriş animasyonu | Evrensel                   | Herkes, maç girişinde                                | ≤ 3 sn; iki oyuncunun girişi aynı anda oynar, maç girişini uzatmaz                                          |
| 12  | Stadyum özelleştirmesi      | Parça başına               | Online maçta **ev sahibi** olunca rakip de (Faz 6.7) | Tribün rengi, ışıklar, saha deseni, tezahürat; oynanış çizgileri ve kale aynı                               |
| 13  | İfade paketi                | Evrensel                   | Online maçta rakip                                   | Hazır mesaj ve emoji (serbest yazı yok); rakip ifadeleri tek dokunuşla susturulur                           |

İfade paketi (13. kategori) yol haritasındaki 12 kategoriye eklendi: hazır mesajlar (Faz 9.6) ve
sonuç ekranındaki ifade paneli bunlara dayanır. "Saç" ayrı bir yuva değildir, karakter skininin
parçasıdır; şapka ve bant aksesuardır.

Ev sahibi online maçta rastgele belirlenir (Faz 9.3); ev sahibinin stadyumu ve top skini kullanılır.

### 4.2 Sınıf ve fiyat matrisi

Kozmetik sınıfları (Sade, Nadir, Destansı, Efsanevi) rastgelelik içermez; yalnızca üretim emeğini ve
fiyat düzeyini gösterir. Sade ve Nadir
Altınla, Destansı ve Efsanevi Elmasla satılır. Elmas fiyatları 50'nin katıdır.

| Kategori           | Sade (Altın) | Nadir (Altın)         | Destansı (Elmas) | Efsanevi (Elmas)         |
| ------------------ | ------------ | --------------------- | ---------------- | ------------------------ |
| Karakter skini     | —            | 2.500 (renk varyantı) | 450              | 900 (animasyon + ses)    |
| Forma              | 600          | 1.500                 | 200              | —                        |
| Ayakkabı           | 500          | 1.200                 | 150              | 350 (iz bırakan)         |
| Aksesuar           | 600          | 1.500                 | 200              | 400 (animasyonlu)        |
| Top skini          | 800          | 1.800                 | 250              | 500                      |
| Top izi            | 700          | 1.600                 | 250              | 500                      |
| Gol patlama efekti | —            | 2.000                 | 300              | 600                      |
| Gol kutlaması      | —            | 2.000                 | 300              | 600                      |
| Giriş animasyonu   | —            | 2.000                 | 300              | 600                      |
| Profil çerçevesi   | 400          | 1.000                 | 150              | Yalnızca ödül            |
| İsim plakası       | 400          | 1.000                 | 150              | Yalnızca ödül            |
| Stadyum parçası    | 500          | 1.500                 | 250              | 600 (tam stadyum teması) |
| İfade paketi       | 300          | 800                   | 100              | —                        |

Referans oran: 1 Elmas ≈ 10 Altın (karakter fiyatında birebir; kozmetikte sınıf farkıyla).

### 4.3 Oynanış bütünlüğü kuralları

1. **Çarpışma şekilleri değişmez:** kafa dairesi, gövde, ayak ve top yarıçapı kozmetikten bağımsızdır.
2. **Görsel yanıltma yok:** aksesuar silüet sınırı (§4.1), top okunurluğu (boyut, kontur, zeminden
   ayrışma), izin topu örtmemesi, efektlerin efekt bütçesine uyması (QUALITY_BAR §5: aynı anda en
   çok 1 tam ekran efekt).
3. **Kimlik okunurluğu kozmetiğin üstündedir:** renk körü modu, kimlik halkası ve ▲/● işaretleri her
   skinle çalışır. Aynı skin ve aynı formayla ayna maçında misafir otomatik alternatif renk alır.
4. **Kozmetik simülasyona girmez:** kozmetik kimlikleri `SimState`'te ve checksum'da yoktur;
   kozmetik değiştirmek checksum'ı değiştirmez (Faz 3.3 testi).
5. **Ses:** kutlama ve giriş sesleri kendi kanalında, spikerin üstüne binmez (Faz 3.7).
6. **Erişilebilirlik ayarı:** "Rakip kozmetiklerini sade göster" (rakibin varsayılan görünümü ve
   varsayılan top izi). Yalnızca o oyuncunun ekranını etkiler.

### 4.4 Satış kanalları

| Kanal                | İçerik                                                                        | Kural                                                                                    |
| -------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Katalog** (kalıcı) | Bütün Sade ve Nadir ürünler, karakterler                                      | Her zaman satılık, sabit Altın fiyatı                                                    |
| **Günlük vitrin**    | 6 yuva: 2 Nadir (katalog fiyatından %20 indirimli), 3 Destansı, 1 Efsanevi    | Yarının vitrini bir gün önceden görünür; her Destansı/Efsanevi en geç 60 günde bir döner |
| **Haftalık set**     | Tematik set: karakter skini + uyumlu aksesuar + top izi                       | Set fiyatı parça toplamından en çok %25 düşük, parça toplamı yanında yazılı              |
| **Sezon Kartı**      | Sezon kozmetikleri                                                            | §3.4 dönüş politikası                                                                    |
| **Yalnızca ödül**    | Lig, seviye, başarım, ustalık, etkinlik, takvim kozmetikleri, kurucu ürünleri | Hiçbir zaman satılmaz                                                                    |

- Mağaza sekmeleri: **Vitrin · Katalog · Elmas** (en çok 3; Elmas sekmesinde paketler ve teklifler).
- Her ürün satın almadan önce maç içinde nasıl göründüğüyle önizlenir (Faz 3.3 önizleme çizicisi);
  sahip olunan ürün "Sahip" / "Kullanılan" etiketi taşır.
- İstek listesi: oyuncu bir Destansı/Efsanevi ürünü işaretler, ürün vitrine gelince bildirim gider
  (bildirim rızası varsa, Faz 11.2).
- Mağaza başlığında kalıcı rozet: **"Gördüğünü alırsın · Güç satılmaz"**.

### 4.5 Lansman kataloğu hedefi

Lansmanda (Faz 12.7) satışta ya da ödül olarak bulunacak en az içerik; Faz 7.3 bu hedefe göre
planlanır. Sezon Kartı içerikleri hariç.

| Kategori           | Adet                   | Kategori         | Adet |
| ------------------ | ---------------------- | ---------------- | ---- |
| Karakter skini     | 24 (karakter başına 2) | Gol kutlaması    | 10   |
| Forma              | 12                     | Giriş animasyonu | 6    |
| Ayakkabı           | 10                     | Profil çerçevesi | 15   |
| Aksesuar           | 20                     | İsim plakası     | 10   |
| Top skini          | 20                     | Stadyum parçası  | 12   |
| Top izi            | 10                     | İfade paketi     | 6    |
| Gol patlama efekti | 10                     |                  |      |

## 5. Ürün kataloğu

### 5.1 Elmas paketleri

| Paket | Elmas | Fiyat (TL, vergiler dahil) | Play fiyat kademesi (USD referans) | Elmas başına |
| ----- | ----- | -------------------------- | ---------------------------------- | ------------ |
| 1     | 100   | ₺39,99                     | 0,99                               | ₺0,40        |
| 2     | 550   | ₺179,99                    | 4,99                               | ₺0,33        |
| 3     | 1.200 | ₺349,99                    | 9,99                               | ₺0,29        |
| 4     | 2.500 | ₺699,99                    | 19,99                              | ₺0,28        |
| 5     | 6.500 | ₺1.699,99                  | 49,99                              | ₺0,26        |

- TL fiyatlar Türkiye'ye özel hedeftir (Play Console yerel fiyatı); diğer ülkeler USD kademesinin
  yerel karşılığını kullanır. Rakiplerde görülen fiyat düzeyleriyle uyumlu (COMPETITOR_ANALYSIS.md
  §2.5: ₺119,99 ve ₺359,99'luk paketler). TL fiyatlar her sezon başında enflasyona göre gözden
  geçirilir (Faz 8.3).
- En büyük paket 49,99 USD kademesidir; 99,99 kademesi bilerek yok.
- Pakette "bonus %" etiketi yok; birim fiyatın büyük pakette düştüğü "Elmas başına" satırıyla
  dürüstçe gösterilir.

### 5.2 Ürünler

| Ürün                           | İçerik                                                                                                              | Fiyat kademesi (TL, vergiler dahil) | Görünme koşulu                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Elmas paketleri                | §5.1                                                                                                                | ₺39,99–₺1.699,99                    | Mağaza > Elmas, her zaman                                                                                          |
| **Başlangıç paketi**           | Seçilen bir kilitli karakter + 300 Elmas + Nadir top izi + Nadir profil çerçevesi ("Çaylak Yıldız")                 | ₺69,99 (1,99 USD)                   | 3. maçtan sonra bir kez pop-up (Kapat eşit büyüklükte); sonra 7 gün Mağaza'da, bitiş tarihi yazılı; hesap başına 1 |
| **Kurucu paketi**              | 1.200 Elmas + "Kurucu" profil çerçevesi ve isim plakası (bir daha satılmaz) + Efsanevi "Kurucu" top skini           | ₺399,99 (11,99 USD)                 | Global lansmandan sonraki 30 gün (tarih ekranda); hesap başına 1                                                   |
| **Reklamsız paket**            | Geçiş reklamları kalıcı olarak kapanır + "Destekçi" profil çerçevesi; ödüllü reklamlar isteğe bağlı kalır           | ₺179,99 (4,99 USD)                  | Mağaza > Elmas; oyuncu ilk geçiş reklamını gördükten sonra; hesap başına 1                                         |
| **Sezon Kartı** (premium yol)  | §3: 50 premium ödül (1. kademede anında Efsanevi sezon skini dahil); geriye dönük                                   | ₺249,99 (6,99 USD) ya da 900 Elmas  | Hesap seviyesi 3; her sezon                                                                                        |
| **VIP Kulüp** (aylık abonelik) | Geçiş reklamı yok · her gün 10 Elmas otomatik (ayda ~300) · ayın VIP kozmetiği (kalıcı) · maç XP'si ×2 · VIP rozeti | ₺149,99 / ay (3,99 USD)             | Hesap seviyesi 8; Mağaza > Elmas                                                                                   |

Notlar:

- **VIP:** maç XP çarpanları toplanır (haftalık takviye +1, VIP +1); görev XP'sine uygulanmaz.
  Abonelik bitince ×2 ve reklamsızlık biter, alınmış kozmetikler kalır. Deneme süresi yok (lansmanda).
  Yenileme tarihi ve fiyatı VIP ekranında yazılı; iptal, mağazanın abonelik sayfasına tek dokunuşla
  gider.
- **Başlangıç paketi** karakter içerir: karakterler yan seçenek olduğu için yalnızca beklemeyi
  kısaltır (K1). Pakette Altın yok (K17).
- Fiyatsız, ödül olarak verilen ve hiç satılmayan ürünler §4.4'te.

### 5.3 Fiyat gösterimi ve dürüstlük

- Her gerçek para fiyatı TL ve vergiler dahil gösterilir; satın almadan önce ön bilgilendirme ekranı
  (Faz 8.5).
- **Elmas fiyatlı her ürünün yanında yaklaşık TL karşılığı** yazar: ürünü karşılayan en küçük
  paketin birim fiyatıyla (ör. 450 Elmas → 550'lik paket → "≈ ₺147"). AB Tüketici Koruma İşbirliği
  (CPC) ağının oyun içi sanal para ilkeleriyle uyumlu olması amaçlanır (yasal değerlendirme Faz
  10.3).
- Sahte geri sayım, sahte indirim, "en popüler" gibi doğrulanmamış etiket, gizli maliyet ve yanıltıcı
  buton yok. Gerçek bitiş tarihleri tarih olarak yazılır.
- Satın alma onayı tek bir net butondur; reddetmek de bir dokunuştur.
- Kayıp, eleme ve ardışık mağlubiyet anlarında teklif gösterilmez (§1.4).

### 5.4 18 yaş altı

Yaş beyanı Faz 8.1'de alınır; değerler Faz 8.5'te kesinleşir ve Faz 10.3'te avukat incelemesinden
geçer.

| Yaş beyanı | Satın alma                                                                                         | Reklam                        |
| ---------- | -------------------------------------------------------------------------------------------------- | ----------------------------- |
| 13 altı    | Kapalı; ebeveyn onayı akışıyla açılabilir (Faz 8.5)                                                | Kişiselleştirilmiş reklam yok |
| 13–17      | Aylık harcama limiti varsayılan ₺500 (ebeveyn onayıyla değişir); VIP aboneliği ebeveyn onayı ister | Kişiselleştirilmiş reklam yok |
| 18+        | Sınırsız                                                                                           | Rızaya göre (Faz 8.2)         |

## 6. Reklam yerleşimleri

### 6.1 Ödüllü reklamlar

Ödüllü reklam her zaman isteğe bağlıdır. Ödül, AdMob sunucu taraflı doğrulamasıyla (SSV) sunucudan
verilir; istemci ödül belirleyemez.

| Yerleşim                | Yer                         | Ödül                                                    | Günlük sınır              | Kural                                                                                                     |
| ----------------------- | --------------------------- | ------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------- |
| Maç ödülü ×2            | Sonuç ekranı                | Maçın Altın'ı kadar ek Altın (XP değil)                 | 3                         | "Devam" en az aynı büyüklükte. Özel oda, antrenman ve eğitimde yok. Ek kısım tek oyunculu tavana sayılmaz |
| Günlük bedava ödül      | Ana menü (tek, sakin giriş) | 1. izleme 40 Altın, 2. izleme 60 Altın                  | 2                         | Ödüller önceden görünür                                                                                   |
| Turnuvada bir şans daha | Kupa Yolu eleme ekranı      | Elenilen maçı aynı rakiple bir kez yeniden oyna         | Turnuva başına 1, günde 3 | Yalnızca tek oyunculu Kupa Yolu                                                                           |
| Skin'i 1 maçlığına dene | Mağaza ve dolap önizlemesi  | Vitrindeki bir Destansı/Efsanevi kozmetiği 1 maç kullan | 3                         | Online maçta rakip de görür; maç sonunda satın alma pop-up'ı yok, ürün mağazada durur                     |

Sınırlar ve ödül miktarları uzaktan ayardır (`ads.rewarded.*`).

### 6.2 Geçiş reklamı kuralları

Geçiş reklamı yalnızca **maç sonunda**, oyuncu sonuç ekranında ödüllerini gördükten ve "Devam"a
bastıktan sonra gösterilir. Bütün koşullar birlikte sağlanmalıdır:

| Kural                     | Varsayılan değer                           | Uzaktan ayar anahtarı                       |
| ------------------------- | ------------------------------------------ | ------------------------------------------- |
| İlk maçlarda yok          | Hesabın ilk 5 maçında yok                  | `ads.interstitial.minLifetimeMatches`       |
| İlk oturumda yok          | Evet                                       | `ads.interstitial.skipFirstSession`         |
| Maç aralığı               | En fazla 3 maçta bir                       | `ads.interstitial.matchesBetween`           |
| Süre aralığı              | En az 240 sn                               | `ads.interstitial.minSecondsBetween`        |
| Günlük tavan              | 6                                          | `ads.interstitial.dailyMax`                 |
| Mağlubiyet serisi         | 2. ardışık mağlubiyetten sonra yok         | `ads.interstitial.skipAfterLossStreak`      |
| Ödüllü reklamdan sonra    | 10 dk yok                                  | `ads.interstitial.cooldownAfterRewardedSec` |
| Satın alma yapandan sonra | Herhangi bir satın almadan sonra 7 gün yok | `ads.interstitial.purchaserGraceDays`       |
| Reklamsız paket, VIP      | Hiç yok                                    | —                                           |

### 6.3 Asla

- Maç içinde, maç öncesinde (eşleşme, yükleme, karakter seçimi), duraklatmada.
- Uygulama açılışında ("app open" reklamı yok), menü gezinmesinde, satın alma akışında.
- Eğitim maçında, antrenmanda, özel odada, yerel 2 oyuncuda.
- Banner (hiçbir ekranda).
- Stadyum panolarında gerçek reklam: panolar oyunun kendi etkinlik ve sezon duyurularını gösterir.

### 6.4 İçerik ve rıza

- Rızaya göre kişiselleştirilmiş ya da kişiselleştirilmemiş reklam (Faz 8.2, 8.8); 18 yaş altı
  beyanında kişiselleştirilmiş reklam yok (§5.4).
- AdMob kategori engelleri: kumar ve bahis, kripto para, alkol, flört, siyasi içerik. En yüksek
  reklam içerik derecesi PG; 18 yaş altında G.

## 7. Modlar

### 7.1 Mod tablosu

| Mod                    | Bağlantı            | Kurallar                                                               | Ödül                                        | Açılış          |
| ---------------------- | ------------------- | ---------------------------------------------------------------------- | ------------------------------------------- | --------------- |
| **Sıralamalı**         | Online              | 1v1, 90 sn, altın gol, güçlendiriciler açık, kör seçim, duraklatma yok | Online ödül + kupa + ustalık                | 2. maçtan sonra |
| **Etkinlik**           | Online              | Zamanlı kural değişiklikleri (Faz 11.1); sıralamasız                   | Online ödül + etkinlik görevleri            | Seviye 8        |
| **Arkadaşla özel oda** | Online              | Oda kodu ya da arkadaş listesi; süre, güçlendirici ve saha seçimi      | Yok (yalnızca sosyal görevler sayılır)      | Seviye 6        |
| **Hızlı Maç**          | Çevrimdışı olabilir | Yapay zekâya karşı; Kolay/Orta/Zor; 60/90/120 sn                       | Tek oyunculu (tavanlı)                      | Eğitimden sonra |
| **Kupa Yolu**          | Çevrimdışı olabilir | 8 kupa, her biri 8 kişilik eleme (3 maç), artan zorluk                 | Tek oyunculu (tavanlı) + şampiyonluk bonusu | Seviye 5        |
| **Antrenman**          | Çevrimdışı olabilir | Süresiz; bütün karakterler, kilitliler dahil, denenebilir              | Yok                                         | Eğitimden sonra |
| **Yerel 2 oyuncu**     | Çevrimdışı          | Aynı cihazda iki kişi (§7.7)                                           | Yok                                         | Eğitimden sonra |

### 7.2 Sıralamalı

- **Kör seçim (K14):** karakter OYNA'ya basmadan önce seçilir; eşleşme bulununca değiştirilemez.
  Rakibin karakteri ilk kez eşleşme ekranında görünür. Karşı karakter seçimi yapılamaz.
- Seçilebilen karakterler: sahip olunanlar ve haftanın ücretsiz karakteri. Sunucu maç kurulumunda
  sahipliği doğrular (Faz 9.3).
- Eşleştirme gizli beceri puanıyla (Faz 9.4), görünen ilerleme kupayla. İlk değerler (Faz 9.5
  kesinleştirir): galibiyet +30 kupa, mağlubiyet −20; Çaylak ligde kupa kaybı yok. Sezon sonunda
  1.000'in üstündeki kupalar 1.000 + (kupa − 1.000) ÷ 2'ye iner.
- Yeni oyuncu koruması: ilk 10 online maç yeni oyuncu havuzunda; 20 sn'de rakip bulunamazsa açıkça
  "Yapay zekâ rakip" etiketli maç önerilir (ödülü tek oyunculu sayılır).

| Lig         | Kupa        | Sezon sonu ödülü                                       |
| ----------- | ----------- | ------------------------------------------------------ |
| Çaylak      | 0–399       | 300 Altın                                              |
| Amatör      | 400–999     | 800 Altın + 20 Elmas + lig çerçevesi                   |
| Profesyonel | 1.000–1.799 | 1.500 Altın + 40 Elmas + lig çerçevesi                 |
| Usta        | 1.800–2.699 | 2.200 Altın + 70 Elmas + lig çerçevesi                 |
| Yıldız      | 2.700–3.599 | 3.000 Altın + 100 Elmas + lig çerçevesi                |
| Efsane      | 3.600+      | 4.000 Altın + 150 Elmas + sezona özel Efsane çerçevesi |

Lig adları sanat yönüne göre değişebilir; para birimleriyle karışmasın diye metal adı (Altın,
Gümüş) kullanılmaz.

### 7.3 Arkadaşla özel oda

- Oda kodu (6 karakter) ya da arkadaş listesinden davet; "Rövanş" tek dokunuş.
- Ayarlar: maç süresi 60/90/120, güçlendiriciler aç/kapa, saha (ev sahibinin sahip olduğu stadyum).
- **Ödülsüz:** Altın, XP, Elmas ve ustalık yok; iki hesapla ödül çiftçiliğini önler. Yalnızca
  haftalık "arkadaşınla 3 maç oyna" gibi sosyal görevler sayılır (her mod görevi: Altın + XP).

### 7.4 Tek oyunculu: Hızlı Maç ve Kupa Yolu

- **Hızlı Maç:** yapay zekâya karşı; zorluk ve süre oyuncunun seçimi; rakip karakter rastgele.
- **Kupa Yolu:** web turnuvasının mobil hâli. 8 kupa; her kupa 8 kişilik eleme (çeyrek final, yarı
  final, final). Kupa 1–2 Kolay → Orta, 3–5 Orta, 6–8 Orta → Zor (web'deki tur kayması mantığı).
  Her kupada bir "patron" rakip (güçlü yapay zekâ). Kazanılan kupa profilin kupa dolabına
  istatistik olarak yazılır; envantere eşya girmez (K3).
- Kupa Yolu **karakter açmaz** (web'den fark, §1.6). Elenince ödüllü reklamla bir şans daha (§6.1).
- İkisi de çevrimdışı oynanır; ödüller kuyrukta tutulur (K3).

### 7.5 Antrenman

Süresiz, ödülsüz. Web'deki kısayollar (topu sıfırla, süper barını doldur, kukla rakip) korunur.
**Bütün karakterler, kilitliler dahil, antrenmanda denenebilir** ve süper önizlemesi her karakter
kartında oynar: satın almadan önce dene.

### 7.6 Etkinlik modları

- Varsayılan takvim: hafta sonu (cuma 12:00 – pazartesi 12:00 TSİ); sezon başına bir büyük etkinlik
  serisi. Örnek kurallar (Faz 11.1): düşük yerçekimi, dev top, buzlu saha, süper yağmuru (güç barı
  ×2 hızlı dolar), mini kale.
- Etkinlik kuralları simülasyonu değiştirdiği için sürümlü simülasyon değer setinin parçasıdır; iki
  istemci maç kurulumunda aynı set sürümünde eşleşir.
- Etkinlik görevleri yalnızca online etkinlik maçlarıyla ilerler (§2.2).

### 7.7 Yerel 2 oyuncu

Aynı cihazda iki kişi, ödülsüz, çevrimdışı. Lansmanda gamepad ile (iki kol ya da bir kol + dokunmatik)
desteklenir. Telefonda iki kişilik dokunmatik düzen (her oyuncuya ekranın bir yarısı) Faz 2.3'te
prototiplendi (`TOUCH.twoPlayer`); rahat değilse yalnızca tablette (≥ 7") sunulur.

**Faz 2.3 kararı:** dokunmatik 2 oyuncu telefonda da açık; iki kişiyle Faz 4.7'de denenecek. Ölçüt: iki kişi telefonu
masada tutup 90 sn'lik maçı yanlış butona basmadan ve elleri çarpışmadan oynayabiliyor mu? Hayırsa
`TOUCH.twoPlayer.minDiagonalInch = 7`: telefonda P2 yalnızca gamepad ile (P1 dokunmatik kalır),
tablette dokunmatik 2 oyuncu açık. Ayrıntı: PROGRESS.md § Faz 2.3.

### 7.8 Çevrimdışı oyun

Ağ yokken açılan modlar: Hızlı Maç, Kupa Yolu, Antrenman, Yerel 2 oyuncu, Dolap (sahip olunanlar).
Mağaza, Sezon Kartı ödül alma, görev ödülü alma ve online modlar bağlantı ister; ekran bunu açıkça
yazar (QUALITY_BAR B3). Çevrimdışı ilerleme (XP, kademe, seviye) yerel olarak gösterilir, bağlanınca
sunucunun doğruladığı değerler esas alınır.

## 8. İlk kullanıcı deneyimi ve elde tutma

### 8.1 İlk 10 dakika

İlke: menüden önce maç; uzun metin yok, oynayarak öğretme; ilk oturumda geçiş reklamı ve bildirim
izni isteği yok. Olay adları Faz 2.8'deki olay sözlüğüne girer (Faz 6.8).

| Zaman      | Adım                                                                                                                                                                                                 | Amaç                                                      | Analiz olayı                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------- |
| 0:00–0:05  | Açılış ekranı ve logo (≤ 2 sn)                                                                                                                                                                       | QUALITY_BAR A1–A2                                         | `ftue_app_open`                                   |
| 0:05–0:30  | Hoş geldin ekranı, oyunun panel ve yazı dilinde: dil (cihazdan), yaş sorusu, aydınlatma ve rızalar (Faz 8.1–8.2), tek ana buton                                                                      | Yasal adım, en az sürtünme                                | `ftue_consent_done`                               |
| 0:30–2:30  | **Eğitim maçı:** Kor, pasif bir rakibe karşı. Hareket → zıplama → şut → kafa → süper; her adım ikon ve el animasyonuyla. İlk 2 golü atınca biter                                                     | Kontrolleri oynayarak öğretmek; ilk gol neredeyse garanti | `ftue_tutorial_step_{1..5}`, `ftue_tutorial_done` |
| 2:30–3:00  | İlk zafer sonuç ekranı: +100 Altın, +100 XP, "Çaylak bandı" aksesuarı karakterin üstünde anında giyilir                                                                                              | Ödül ve kozmetik fikrini tanıtmak                         | `ftue_first_reward`                               |
| 3:00–3:20  | Oyuncu adı: otomatik eğlenceli ad önerisi, tek dokunuşla kabul ya da "zar at" (K7)                                                                                                                   | Ham "Guest_123" yok                                       | `ftue_name_set`                                   |
| 3:20–6:00  | Sade ana menü (OYNA + Kadro). **Maç 1:** Hızlı Maç, yumuşak "Çaylak" yapay zekâ profili                                                                                                              | İlk gerçek maç, yüksek kazanma şansı                      | `ftue_match_1_end`                                |
| 6:00–8:30  | **Maç 2:** yapay zekâ, zorluk ilk maça göre ayarlanır → "Online açıldı!"                                                                                                                             | Ustalık hissi, online'a hazırlık                          | `ftue_match_2_end`, `ftue_online_unlocked`        |
| 8:30–11:00 | **Maç 3:** ilk online maç (yeni oyuncu havuzu; 20 sn'de rakip yoksa etiketli yapay zekâ) → günlük görevler ve Mağaza açılır; tamamlanmış ilk görevin ödülü alınır; başlangıç paketi bir kez önerilir | Döngüyü göstermek, ilk hedef                              | `ftue_match_3_end`, `ftue_quests_unlocked`        |

Hedefler: oyuncuların ≥ %85'i eğitimi, ≥ %70'i ilk oturumda 3 maçı tamamlar; ilk 3 maçın en az 2'si
kazanılır (Faz 6.8 bitti kriteri: hiç görmemiş biri yardımsız ilk 3 maçı tamamlar).

### 8.2 Kademeli açılım

Özellikler kilit simgesiyle beklemez; açıldıkları anda "YENİ" etiketiyle ve tek cümlelik bir
tanıtımla gelir.

| Tetik                    | Açılan                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------- |
| Eğitim sonrası           | Ana menü: OYNA (Hızlı Maç), Kadro (dolap), Antrenman, Yerel 2 oyuncu                |
| Maç 2 sonrası            | Sıralamalı; OYNA'nın varsayılanı Sıralamalı olur                                    |
| Maç 3 sonrası            | Günlük görevler, Mağaza, başlangıç paketi (bir kez)                                 |
| 2. oturum                | Giriş takvimi (ilk adım ödülüyle)                                                   |
| Maç 5 sonrası            | Hesap bağlama önerisi (Google Play Games; Nadir çerçeve ödülü); misafir kalınabilir |
| Seviye 3, 4, 5, 6, 8, 10 | §2.6 tablosu (Sezon Kartı, karakter seçimi, Kupa Yolu, özel oda, etkinlik, stadyum) |
| 1. gün sonu              | Bildirim izni bağlamıyla istenir ("Günlük ödülün hazır olunca haber verelim mi?")   |

### 8.3 Günlük ve haftalık görevler

- **Günlük (3):** kolay (her mod), orta (her mod), online. Günde 1 ücretsiz değiştirme; online
  görev yalnızca başka bir online görevle değişir. Örnekler: "3 maç oyna", "5 gol at", "2 süper şut
  isabeti", "kafayla 1 gol", "2 online maç oyna", "1 online galibiyet".
- **Haftalık (4):** 2 her mod, 2 online. Biriken yapı: yeni haftanın görevleri eklenir, eskiler
  sezon sonuna kadar açık kalır. Örnekler: "15 maç oyna", "3 farklı karakterle galibiyet", "10
  online maç oyna", "5 online galibiyet", "arkadaşınla 3 maç oyna" (özel oda sayılır).
- Görev tanımları sunucudadır ve her görev hangi modların ilerlettiğini taşır (`onlineOnly`
  bayrağı, K13). Ödül değerleri §2.2.
- Görev metni ne yapılacağını tam söyler; belirli bir karakteri satın almayı gerektiren görev yok
  (haftanın ücretsiz karakteri hariç karakter şartı yalnızca "farklı karakterler" biçiminde).

### 8.4 Giriş takvimi

7 adımlık tur, her giriş günü bir adım; kaçırılan gün turu sıfırlamaz (seri baskısı yok).

| Adım | 1         | 2       | 3         | 4         | 5       | 6         | 7                                 |
| ---- | --------- | ------- | --------- | --------- | ------- | --------- | --------------------------------- |
| Ödül | 100 Altın | 5 Elmas | 150 Altın | 200 Altın | 5 Elmas | 250 Altın | 15 Elmas (+ ilk 4 turda kozmetik) |

İlk 4 turun 7. adımında sırayla Sade ifade, profil çerçevesi, isim plakası ve top izi verilir (takvim
kozmetikleri satılmaz). Bütün ödüller tur başında görünür.

### 8.5 Başarımlar ve karakter ustalığı

- **Başarımlar:** Oyun (gol, kafa golü, süper golü, altın gol), Koleksiyon (karakter, kozmetik
  sayısı), Online (galibiyet, lig, seri), Sosyal (arkadaşla maç). Online başarımlar Elmas verebilir
  (ömür boyu toplam 500); diğerleri yalnızca Altın + XP ve profilde başarım kaydı (K3, K13).
- **Karakter ustalığı:** her karakterin online maçlarından ustalık puanı (maç 10, galibiyet +10).
  5 seviye (100 / 300 / 600 / 1.000 / 1.500 puan); ödüller yalnızca gösteriş: ustalık rozeti, isim
  plakası rengi, karaktere özel ifade, karaktere özel profil çerçevesi, 5. seviyede "Usta" unvanı ve
  karakter portresinde altın kontur. Ustalık güç vermez; tek oyunculu maçlar ustalık vermez (K3).

### 8.6 Etkinlikler, haftanın karakteri, geri dönüş ve bildirimler

- **Etkinlikler:** §7.6; etkinlik başına 3 görev ve sabit, önceden görünen etkinlik kozmetiği.
- **Haftanın ücretsiz karakteri:** her hafta 1 kilitli karakter bütün modlarda (sıralamalı dahil)
  herkese açık. Haftanın karakteriyle oynanan online maçlar ustalık da verir.
- **Geri dönüş hediyesi:** 14 günden uzun aradan sonra ilk girişte 1.000 Altın + 3 maç ×2 maç XP'si
  (90 günde 1).
- **Bildirimler** (rızaya bağlı, Faz 11.2): günde en çok 1; sessiz saatler 22:00–09:00 (yerel).
  Türler: günlük ödül hazır, istek listesindeki ürün vitrinde, etkinlik başladı, arkadaş daveti,
  sezon bitişinden 3 gün önce bir kez. "Seni özledik" türü ardışık hatırlatma yok; 3 günlük aradan
  sonra en çok 1.

### 8.7 Elde tutma hedefleri

Faz 11.3 hunisi ve 12.6 test lansmanı bunları ölçer.

| Gösterge                                   | Hedef                      |
| ------------------------------------------ | -------------------------- |
| 1. gün dönüş                               | ≥ %35 (Faz 12.6 eşiği)     |
| 7. gün dönüş                               | ≥ %12                      |
| 30. gün dönüş                              | ≥ %5                       |
| Ortalama oturum                            | 10–15 dk, günde ≥ 2 oturum |
| İlk oturumda eğitim + 3 maç                | ≥ %70                      |
| Günlük görevlerin en az birini bitiren DAU | ≥ %60                      |

## 9. Güç satılmaz, çeşitlilik satılır

### 9.1 İlke ve teknik uygulanış

İlke K1'dedir. Uygulanışı:

| Kural                                                    | Nasıl zorlanır                                                                                            | Faz      |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------- |
| Her karakterin istatistik toplamı 14, her istatistik 1–5 | Birim testi (`characters.test.ts`, mevcut); yeni karakterler aynı teste girer                             | 7.6      |
| Genel kazanma oranı %45–55                               | AI-vs-AI tarama (`npm run simulate -- --characters`); online veride sıralamalı izleme                     | 2.9, 7.6 |
| Eşleşme kazanma oranı %35–65                             | Aynı taramanın eşleşme matrisi (K14)                                                                      | 2.9, 7.6 |
| Seviye, ustalık, Sezon Kartı ve VIP güç vermez           | Bu kaynaklar yalnızca kozmetik, Altın, XP ve Elmas verir; simülasyon girdisi yalnızca karakter + kurallar | 6.1–6.6  |
| Kozmetik simülasyona girmez                              | Kozmetik kimliği `SimState`'te yok; kozmetik değişince checksum aynı kalır (test)                         | 3.3      |
| Online'da yalnızca sahip olunan karakter                 | Sunucu maç kurulumunda sahipliği doğrular; envanter sunucuda                                              | 5.3, 9.3 |
| Denge yaması iki istemcide aynı                          | Simülasyon değerleri sürümlü set; maç kurulumunda set sürümü eşleşir                                      | 5.4, 9.3 |
| Her karakter oynayarak makul sürede açılır               | §9.3 hedefleri; 6.9 ekonomi simülasyonu                                                                   | 6.6, 6.9 |

### 9.2 Karakter kadrosu

İstatistik ölçeği ve fizik karşılıkları GAME_DESIGN.md §7'de. Kazanma oranı web v1.0.0 (AI vs AI,
Orta, 3.600 maç); yeni karakterler henüz ölçülmedi.

**Görünüm (K18, K2):** 9 karakter adını lakap olarak korur ve kurgusal futbolcu tipi olarak çizilir;
3 slot sürpriz karaktere geçer (ad ve görünüş değişir, istatistik ve süper aynı kalır). Arketip,
yaş, ten, beden, aksesuar ve forma ART_BIBLE §7.3'te. Tema sütunu süperin ve renk vurgusunun
temasıdır; renkler web sürümünden, yeniden çizimde ART_BIBLE §7 kurallarıyla kesinleşir.

| #   | Karakter                        | Tema                          | Hız | Zıp. | Şut | Kafa | Süper şut    | Açılma            | Web v1.0.0 kazanma |
| --- | ------------------------------- | ----------------------------- | --- | ---- | --- | ---- | ------------ | ----------------- | ------------------ |
| 1   | **Kor**                         | Golcü; ateş, kırmızı          | 3   | 3    | 5   | 3    | Ateş Topu    | Baştan açık       | %50                |
| 2   | **Bora**                        | Kanat; rüzgâr, beyaz-yeşil    | 4   | 4    | 3   | 3    | Kasırga      | Baştan açık       | %50                |
| 3   | **Kaya**                        | Stoper; taş, gri              | 2   | 3    | 4   | 5    | Dev Top      | Baştan açık       | %49                |
| 4   | **Ayaz**                        | Orta saha; buz, açık mavi     | 3   | 4    | 3   | 4    | Buz          | Seçim ya da Altın | %57 → Faz 2.9      |
| 5   | **Şimşek**                      | Genç kanat; elektrik, sarı    | 5   | 3    | 4   | 2    | Zikzak       | Seçim ya da Altın | %51                |
| 6   | **Sis**                         | Çalımcı; gölge, mor           | 4   | 5    | 2   | 3    | Işınlanma    | Seçim ya da Altın | %49                |
| 7   | **Yay**                         | Frikikçi; kavis, turuncu      | 3   | 5    | 3   | 3    | Gökkuşağı    | Seçim ya da Altın | %47                |
| 8   | **Demir**                       | Kaptan; mıknatıs, kırmızı-gri | 3   | 3    | 4   | 4    | Mıknatıs     | Seçim ya da Altın | %47                |
| 9   | **Pamuk**                       | Oyun kurucu; bulut, pembe     | 4   | 4    | 2   | 4    | Serap        | Seçim ya da Altın | %52                |
| 10  | **Bakkal** (Toprak slotu)       | Sürpriz: bakkal amca; deprem  | 2   | 4    | 5   | 3    | Sarsıntı     | Seçim ya da Altın | %47 (Toprak)       |
| 11  | **Dede** (Yankı slotu)          | Sürpriz: fileli dede; yankı   | 5   | 4    | 2   | 3    | Yankı (yeni) | Seçim ya da Altın | —                  |
| 12  | **Kaleci Teyze** (Kauçuk slotu) | Sürpriz: kaleci teyze; lastik | 4   | 2    | 3   | 5    | Sekme (yeni) | Seçim ya da Altın | —                  |

Başlangıç üçlüsü (Kor, Bora, Kaya) bilerek üç farklı oyun tarzı: hücum (güçlü şut), denge, savunma
(büyük kafa). Süperleri en kolay okunanlardır.

Kodda Bakkal'ın kimliği yeniden çizime kadar `toprak` kalır; web v1.0.0 ölçümlerinde ve eski
notlarda geçen "Toprak" bu slottur. Dede ve Kaleci Teyze henüz kodda yok (Faz 7.6).

### 9.3 Açılma yolu ve süre hedefleri (K15)

- **Baştan açık (3):** Kor, Bora, Kaya.
- **Seviye ödülü (2):** Sv 4 ve Sv 10'da oyuncu kilitli karakterlerden birini **kendisi seçer**.
- **Altın ya da Elmas (7):** her biri **5.000 Altın ya da 500 Elmas**, sabit fiyat; sıra serbest.
  Lansman sonrası yeni karakterler de aynı fiyatla ve **ilk günden Altınla** alınabilir; Elmasa
  özel erken erişim yok.
- **Deneme:** antrenmanda bütün karakterler; haftanın ücretsiz karakteri bütün modlarda.

Oynayarak açılma süresi hedefleri (bir karakter, reklamsız, bütün Altın karaktere giderse; §2.5
modeli):

| Oyuncu tipi | Hedef    | Model    | Tüm kadro (Altın'ın %60'ı karaktere) |
| ----------- | -------- | -------- | ------------------------------------ |
| Yoğun       | ≤ 5 gün  | ~4 gün   | ~6 hafta                             |
| Düzenli     | ≤ 7 gün  | ~6,5 gün | ~8 hafta                             |
| Çevrimdışı  | ≤ 8 gün  | ~7 gün   | ~11 hafta                            |
| Hafif       | ≤ 14 gün | ~13 gün  | ~20 hafta                            |

Elmasla almak yalnızca beklememek içindir: düzenli oyuncu için 500 Elmas ≈ 1 haftalık Altın kazancı
(1 Elmas ≈ 10 Altın oranı).

### 9.4 Yeni karakterler: Dede ve Kaleci Teyze

İki yeni karakter, kadroda boş kalan iki boşluğu doldurur: ikinci 5 hızlı karakter (yalnızca Şimşek
vardı) ve ilk 2 zıplamalı karakter (hiç yoktu). Süperleri mevcut 10 süperde olmayan iki mekaniği
getirir: **zamanlama aldatması** ve **sekme geometrisi**. İkisi de yalnızca `+ − × ÷` ve hız
vektörü işlemleriyle yazılır (K4). Değerler ilk öneridir; Faz 7.6'da kodlanır, Faz 2.9 sonrası
ayarla birlikte dengelenir.

Faz 1.1'de bu slotlar "Yankı" ve "Kauçuk" adlı karakterlerdi; 2026-11-26'da sürpriz karakterlere
geçti (K2, K18). İstatistikler, süper mekanikleri ve süper adları aynı kaldı; süper adları ve görsel
kimlikleri Faz 7.1'de karakterle birlikte gözden geçirilebilir.

**Dede** (5 / 4 / 2 / 3) — sürpriz karakter, fileli dede (ART_BIBLE §7.3). Yaşına bakmadan sahanın
en hızlısı; sakin ve muzip ifade. Hızlı ve çevik, şutu zayıf; süperi şut gücünü zamanlamayla telafi
eder: yavaş başlar, birden patlar.

| Süper: **Yankı** (`echo`) | Değer                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Yavaş faz                 | Top süper hedef hızının ×0,35'iyle, yerçekimsiz ilerler; üç vuruşluk ses halkası telgrafı                       |
| Gecikme                   | 0,55 sn                                                                                                         |
| Patlama                   | Aynı yönde süper hedef hızının ×1,6'sına çıkar; patlamadan sonra 0,5 sn yerçekimsiz                             |
| Bitiş                     | İlk sekmede, oyuncuya değince ya da 1,3 sn sonunda; yavaş fazda pasif temas patlamayı iptal eder                |
| Karşı oyun                | Yakındaysan yavaş fazda aktif vur (ortak karşı oyun); uzaktaysan patlama çizgisine gir (düz, tahmin edilebilir) |
| Güçlü / zayıf             | Uzak mesafeden güçlü; yakın rakibe karşı zayıf                                                                  |

**Kaleci Teyze** (4 / 2 / 3 / 5) — sürpriz karakter (ART_BIBLE §7.3). Yılların kaleci tecrübesi,
kocaman kaleci eldivenleri, kendinden emin gülümseme. Büyük kafa ve hızla zeminde iyi savunur, alçak
zıplar (aşırtmalara karşı zayıf).

| Süper: **Sekme** (`ricochet`) | Değer                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| Atış                          | Süper hedef hızı ×1,1, yükselme ×1,3; yerçekimi ×0,6                                                |
| Sekme                         | Duvar, tavan ve direkten kayıpsız (esneklik 1,0) seker, her sekmede hız ×1,15                       |
| Sınır                         | En çok 3 sekme; hız süper hedef hızının ×1,5'ini geçmez                                             |
| Bitiş                         | Zemine ya da oyuncuya değince veya 2,2 sn sonunda; sonra normal top                                 |
| Karşı oyun                    | Her sekme yeni yönü açık eder (yansıma); zemine değince söner: düşeceği yerde bekle ya da aktif vur |
| Güçlü / zayıf                 | Kapalı açılarda ve kale üstü tavanında güçlü; düz ve uzun yolda tahmin edilebilir                   |

Yapay zekâ için: süper kullanım kuralları (`AI.super.byType`) ve kaçınma (Yankı: yavaş fazda
yakındaysa vur; Sekme: sekme sonrası yörüngeyi tahminci zaten simüle eder) Faz 7.6'da eklenir.

### 9.5 Denge eşikleri (K1, K14)

| Ölçü                  | Eşik                  | Ölçüm                                                                                                    |
| --------------------- | --------------------- | -------------------------------------------------------------------------------------------------------- |
| Genel kazanma oranı   | %45–55 (her karakter) | AI vs AI, Orta, karakter başına ≥ 2.000 maç; online: sıralamalı, son 28 gün, karakter başına ≥ 5.000 maç |
| Eşleşme kazanma oranı | %35–65 (hedef %40–60) | AI vs AI, eşleşme başına ≥ 200 maç (iki tarafta eşit; ±~3,5 puan); online: eşleşme başına ≥ 1.000 maç    |
| Süperle gol payı      | Karakter başına %4–12 | Bir süper golleri tek başına taşımasın, hiçbiri işe yaramaz da olmasın                                   |

- 12 karakterle tam tarama 66 eşleşme × 200 = 13.200 maçtır.
- Web v1.0.0'da eşiğin dışında kalanlar: Ayaz genel %57; eşleşmede Bora–Toprak %71, Ayaz–Pamuk
  %69, Toprak–Şimşek %69 (Toprak slotu mobilde Bakkal). Faz 2.9 bunları banda çeker.
- Online veride eşik dışına çıkan karakter bir sonraki sürümlü değer setinde ayarlanır; istatistik
  bütçesi (14) korunur, ayar önce süper parametreleriyle yapılır (web Faz 7 tecrübesi).

### 9.6 Satılan her şeyin kontrol listesi

Yeni bir ürün eklenmeden önce bu tabloya bir satır eklenir; dört sütundan biri işaretlenemiyorsa ürün
satılmaz.

| Ürün                       | Türü                 | Neden güç değil                                                     |
| -------------------------- | -------------------- | ------------------------------------------------------------------- |
| Karakter (Elmasla)         | Çeşitlilik, kolaylık | Eşit bütçe, %45–55 bandı; aynı karakter oynayarak ~1 haftada açılır |
| Kozmetikler (13 kategori)  | Görünüş, gösteriş    | §4.3: çarpışma ve okunurluk değişmez, simülasyona girmez            |
| Sezon Kartı premium        | Görünüş, gösteriş    | Yalnızca kozmetik ve Altın; XP'yi hızlandırmaz                      |
| Sezon kademesi             | Kolaylık             | Yalnızca kozmetik ve Altın'a erken erişim                           |
| VIP Kulüp                  | Kolaylık, gösteriş   | Reklamsızlık, XP ×2 (seviye ve kart güç vermez), kozmetik, Elmas    |
| Reklamsız paket            | Kolaylık             | Oynanışa dokunmaz                                                   |
| Başlangıç ve kurucu paketi | Çeşitlilik, gösteriş | Karakter + Elmas + kozmetik; hiçbiri güç değil                      |
| Elmas paketleri            | —                    | Elmas yalnızca yukarıdakileri alır                                  |
| Ödüllü reklam              | Kolaylık             | Altın ve deneme; tek oyunculu tavanı aşmaz, Elmas vermez            |

Asla satılmayanlar: istatistik, yükseltme, maç içi eşya veya güçlendirici, ek süper, rastgele içerik,
Altın (K17), lig/seviye/başarım/ustalık ödülleri.

## Kararlar

Bağlayıcıdır; uygulandıkları fazlar [ROADMAP_MOBILE.md](ROADMAP_MOBILE.md)'de. K1–K12 Faz 0.4'te
(2026-11-20) Faz 0.3'ün açık sorularından, K13–K17 Faz 1.1'de (2026-11-20) "Hâlâ açık olanlar"dan
karara bağlandı. K18 ve K2'nin güncellemesi 2026-11-26'da tema değişikliğiyle, K19 2026-11-28'de
ad değişikliğiyle geldi. Tasarım bu
kararlarla çelişmez; değişiklik gerekiyorsa önce bu bölüm güncellenir.

### K1. Güç satılmaz, çeşitlilik satılır (eski soru 1)

"Online'da istatistikler eşit" ilkesinin yerini alır. Karakterler birbirinin yan seçeneğidir:

- Tüm karakterlerin toplam istatistik bütçesi eşittir.
- AI-vs-AI denge simülasyonunda ve ileride online veride her karakterin kazanma oranı **%45–55**
  bandındadır (Faz 7.6'daki eşik). Web v1.0.0'da Ayaz %57; banda çekilmesi Faz 2.9'da (2.7'den
  sonra).
- Her karakter oynayarak makul sürede açılabilir; süre hedefi K15'te. Satın almak yalnızca
  beklememek içindir.
- Seviye veya yükseltmeyle güç artışı yoktur.

### K2. Karakter kadrosu: 12 = 10 mevcut + 2 yeni (eski soru 2)

Mevcut 10 karakter yeniden çizilir (ikisi Faz 4.2'de, kalan 8'i Faz 7.1'de) ve 2 yeni karakter
eklenir. Yeni karakterlerin istatistikleri (eşit bütçe) ve süper şutları Faz 1.1'de tasarlandı
(§9.4), Faz 7.6'da kodlanır.

**Güncelleme (2026-11-26, K18):** 12 slotun istatistikleri ve süperleri değişmez. 9 slot adını
korur ve kurgusal futbolcu tipi olarak çizilir. 3 slot sürpriz karaktere geçer: **Toprak → Bakkal**,
**Yankı → Dede**, **Kauçuk → Kaleci Teyze**. İlk model sayfaları Bakkal + 2 futbolcu tipiyle başlar
(ART_BIBLE Ek B karar 4). Kadro, ekonomi ve denge tabloları bu yüzden değişmedi.

### K3. Tek oyunculu ödüller ve çevrimdışı oyun (eski soru 3)

- Tek oyunculu moddan yalnızca Altın + XP gelir; günlük üst sınırlıdır. **Elmas tek oyunculudan
  asla gelmez.**
- Sunucu maçı yeniden simüle etmez; makullük kontrolü yapar: maç süresi, skor aralığı, sıklık sınırı
  (Faz 5.3).
- Çevrimdışı oyun tam oynanabilir; ödüller cihazda kuyrukta tutulur, bağlanınca aynı sınırlarla
  doğrulanır.

### K4. Motorlar arası determinizm (eski soru 4)

- Fizik simülasyonu yalnızca `+`, `-`, `*`, `/`, `Math.sqrt`, `Math.abs/min/max/floor/round` ve tam
  sayı işlemlerini kullanır. `sin`, `cos`, `atan2`, `exp`, `pow` (ve `**`) için kendi deterministik
  fonksiyonlarımız yazılır. Simülasyonda `Math.random` yok; tohumlu PRNG var.
- CI'da aynı tekrar kaydı Chromium, WebKit ve Node'da çalıştırılır; her karenin checksum'ı
  karşılaştırılır.
- Sunucu ilk sürümde maçı yeniden simüle etmez: istemciler periyodik checksum ve sonuç gönderir;
  uyuşmazlıkta maç geçersiz sayılır ve loglanır (Faz 9.3). Sunucu taraflı yeniden simülasyon
  ileride opsiyonel (Faz 13.2).
- Uygulama: Faz 2.7 (Determinizm sertleştirme). Fizik hissi ve denge bu fazdan sonra yeniden
  ayarlanır (Faz 2.9).

### K5. Zaman efektleri ve simülasyon adımı (eski soru 5)

Online maçta simülasyon adımı asla değişmez; hit-stop ve ağır çekim yalnızca sunum katmanında
uygulanır. Gol sonrası duraklama deterministik bir oyun durumudur. Çevrimdışı mod da aynı mimariyi
kullanır: web sürümünde döngü süresini kesen hit-stop ve ağır çekim Faz 2.7'de sunum katmanına
taşınır.

### K6. Uzaktan ayar ve A/B testi: tek kaynak Nakama (eski soru 6)

Uzaktan ayar ve A/B testi yalnızca Nakama'dan (Faz 5.4, 11.3). Firebase yalnızca Analytics +
Crashlytics. Nakama gelene kadar yerel config dosyası (`src/config/gameConfig.ts`) kullanılır.

### K7. Oyuncu adları (eski soru 7)

Otomatik üretilen varsayılan ad; TR/EN küfür filtresi (harf hilelerine karşı normalizasyonla),
ayrılmış adlar, raporlama ve ad değiştirme (Faz 5.2). Raporlanan adlar yönetim panelindeki
moderasyon kuyruğuna düşer (Faz 11.4).

### K8. Sunucu bölgesi (eski soru 8)

Lansman tek Türkiye bölgesiyle; eşleştirmede gecikme dikkate alınır (Faz 9.4). Kendi barındırma mı
yönetilen hizmet mi kararı Faz 5.5'te verilir (KVKK yurt dışı aktarım etkisi dahil).

### K9. Gözlemlenebilirlik ve gizlilik sırası (yeni)

- Faz 2.8: Firebase Crashlytics + Analytics ve geçici rıza ekranı; rıza yoksa veri gönderilmez. Faz
  6.8'in analiz olayları bu altyapıyı kullanır; 11.3 gelişmiş huni ve A/B testi olarak kalır.
- Veri haritası, yaş sorusu, aydınlatma ve rıza yönetimi (eski 10.1–10.2) Bölüm 8'in başına taşındı
  (8.1–8.2); satın alma ve reklam fazlarından önce yapılır. Bölüm 8 ve 10 yeniden numaralandı.

### K10. Rollback bütçesi (yeni)

Durum kaydı + 8 karelik yeniden simülasyon test cihazında **≤ 4 ms** (Faz 2.4 bitti kriteri). Final
görseller olmadığı için hedef boyutta sentetik bir stres sahnesi kullanılır; ölçüm Faz 4.6 ve
12.3'te tekrarlanır.

### K11. Metin çizimi ve diller (yeni)

Çevrilen metinler canvas tabanlı metinle (web/sistem fontları) çizilir; bitmap font yalnızca skor,
sayaç gibi stilize sayı ve başlıklarda. Lansman dilleri Latin ve Kiril alfabeli 10 dil: TR, EN, DE,
FR, ES, PT-BR, IT, PL, RU, ID (Faz 11.6). Çince, Japonca, Korece ve Arapça (sağdan sola) lansman
sonrası ayrı fazda (13.1).

### K12. Phaser 4'e geçiş (yeni)

Faz 2.0, Faz 2.1'den önce: LiteGraphics'in render node mimarisine taşınması, özel Phaser paketinin
yeniden yapılandırılması, tüm testlerin ve web yayınının geçmesi, determinizm ve performans
karşılaştırması. Bitti kriteri: web sürümü Phaser 4'te eskisiyle aynı davranıyor.

### K13. Elmas yalnızca sunucunun doğruladığı olaylardan gelir (Faz 1.1; K1 ↔ K3)

Elmas veren her şey yalnızca şu olaylarla ilerler:

- **Satın alma** ve VIP Kulüp'ün günlük Elmas'ı (mağaza makbuzu, Faz 8.4).
- **Sunucu günü:** giriş takvimi.
- **Online maç sonucu** (checksum'la doğrulanan, Faz 9.3): online görevler, online başarımlar,
  sıralamalı sezon sonu ödülü.

Sonuçları:

- Hesap seviyesi, Sezon Kartı (iki yol da), karakter ustalığı, tek oyunculu maçlarla ilerleyen görev
  ve başarımlar ve reklamlar **Elmas vermez**.
- XP'nin açtığı ödüller (hesap seviyesi, Sezon Kartı) XP'nin doğal sonucudur ve tek oyunculu XP'yle
  de ilerler; XP tek oyunculu tavanla sınırlı olduğu için bu ödüller de sınırlıdır.
- Online kuyrukta yapay zekâya düşen maç tek oyunculu sayılır. Özel oda ödülsüzdür.
- Karakter ustalığı ve etkinlik kozmetikleri (Altın + XP dışı ödüller) yalnızca online maçla ilerler.
- Görev ve başarım tanımları hangi modların ilerlettiğini sunucu tarafında bayrakla taşır.

### K14. Sıralamalıda kör seçim ve eşleşme eşiği (Faz 1.1)

- Sıralamalıda karakter eşleşmeden önce seçilir; rakip ilk kez eşleşme ekranında görülür. Karşı
  karakter seçimi yoktur.
- Genel bant K1'deki gibi %45–55. Ek olarak her eşleşme **%35–65** (hedef %40–60) bandında olmalı;
  AI vs AI'da eşleşme başına ≥ 200 maçla ölçülür (§9.5). Faz 2.9 ve 7.6'nın bitti kriterine girer.

### K15. Karakter açılma süresi hedefi (Faz 1.1; K1'in değeri)

- 3 karakter baştan açık, 2'si seviye ödülü (Sv 4 ve 10, oyuncu seçer), 7'si 5.000 Altın ya da 500
  Elmas.
- Bir kilitli karakterin oynayarak açılma süresi (reklamsız, bütün Altın'la): yoğun ≤ 5 gün,
  düzenli ≤ 7 gün, çevrimdışı ≤ 8 gün, hafif ≤ 14 gün (oyuncu tipleri §2.5).
- Yeni karakterler ilk günden Altınla alınabilir; Elmasa özel erken erişim yok.

### K16. Tek oyunculu günlük tavan ve makullük eşikleri (Faz 1.1; K3'ün değeri)

- Günlük tavan **300 Altın + 600 XP** (sunucu günü, varsayılan 00:00 TSİ); çarpanlardan önceki
  değere uygulanır. Ödüllü reklamın ek Altın'ı tavana sayılmaz, kendi günlük sınırı vardır.
- Makullük eşiklerinin ilk değerleri §2.4'te; Faz 5.3 uygular ve test verisiyle günceller.

### K17. Altın satılmaz; reklamdan Elmas yok (Faz 1.1)

- Elmas → Altın dönüşümü yok; ücretli paketlerde Altın yok. "Altın oynayarak kazanılır" ilkesi
  kelimesi kelimesine geçerlidir.
- Ödüllü reklamlar yalnızca Altın ve deneme verir; Elmas vermez (Elmas'ın değeri ve reklamla Elmas
  çiftçiliğinin önlenmesi).

### K18. Dünya ve kadro: stadyum ve futbolcular (2026-11-26)

- Oyun stadyumlarda geçer: gündüz, gece ışıklı, karlı, yağmurlu; ileride kumsal, çatı gibi eğlenceli
  sahalar. Mahalle teması kaldırıldı.
- Kadronun çoğunluğu (en az %75) kurgusal futbolcu tipleridir (farklı yaş, ten, saç, beden; gerçek
  futbolcuya ya da kulübe benzemez). Aralarında birkaç sürpriz komik karakter vardır (en fazla %25;
  şu an Bakkal, Dede, Kaleci Teyze). Hepsi aynı istatistik bütçesine ve denge kurallarına tabidir
  (K1).
- Çizim tarzı değişmez: ART_BIBLE'daki sıcak el çizimi, dev kafa oranları, kontur, palet, yüz
  ızgarası ve yaylı kafa.
- Para birimleri Altın + Elmas (§2.1); şişe kapağı, misket ve kedi maskot yok.
- Çalışma adı o tarihte "Kafa Kafaya: Futbol Arenası"ydı; 2026-11-28'de "Kafadarlar: Kafa
  Topu Düellosu" oldu (K19).

### K19. Oyunun adı: Kafadarlar (2026-11-28)

- Oyunun adı **Kafadarlar**; mağaza başlığı **"Kafadarlar: Kafa Topu Düellosu"** (tam 30 karakter =
  Play sınırı; başlığa başka bir şey eklenemez). "Kafa topu" türün aranan adı; burada yalnızca türü
  anlatan alt başlık. Tek başına ad olarak ya da "Kafa Topu 2", "Head Ball", "Head Soccer" gibi
  bilinen oyunları çağrıştıran biçimde kullanılmaz. İngilizce mağaza başlığı öneri: "Kafadarlar:
  Header Duel" (mağaza sayfasında kesinleşir).
- İlk tercih "Kafadarlar: Futbol Arenası"ydı; aynı gün aramada bulunmak için "Kafa Topu Düellosu"
  seçildi (geliştiricinin kararı). Mağaza başlığı Play Console'dan sonradan değiştirilebilir.
- Neden: Google Play'de "Kafa Kafaya" adıyla başka bir geliştiricinin futbol oyunu var (üstten
  bakışlı 2'ye 2, reklamlı, 1 bin+ indirme; 2026-11-28'de görüldü). Aynı ad ve aynı tür aramada ve
  kulaktan kulağa karışıklık, yanlış yorumlar ve tescil yarışı riski getirir; mağazaya çıkmadan
  değiştirmek neredeyse bedava.
- 2026-11-28 araştırması: TÜRKPATENT'te "Kafadarlar" da "Kafa Kafaya" da tescilli değil; Play ve
  App Store'da "Kafadarlar" adlı uygulama yok (Play'de "Kafadar: Arkadaşlık Testi" var; futbol oyunu
  değil, tekil ad).
- Değişmeyen: yükleme anahtarı (`kafakafaya-upload`; CI sırrı ona bağlı, kullanıcıya görünmez).
- Uygulama kimliği `com.emengin.kafakafaya` → **`com.emengin.kafadarlar`** (Play bağlantısında
  görünür). Değiştirilebilen son an buydu: uygulama Play'e hiç yüklenmemişti, Firebase'e yeni
  kimlikle kaydedildi. Bundan sonra **değişmez**. Paket adının arama sıralamasına bilinen bir
  etkisi yok; sebep tutarlılık.
- Aynı gün değişenler (geliştiricinin kararı, "henüz oyuncu yok"): GitHub deposu `kafadarlar`, web
  adresi https://emengin.github.io/kafadarlar/ (eski adres yönlenmez), kayıt anahtarlarının öneki
  `kafadarlar.` (eski kayıtlar — ayarlar, açılan karakterler, istatistikler — okunmaz, oyun sıfırdan
  başlar).
- Açık: "Kafadarlar" marka tescil başvurusu (sınıflar avukata; Faz 0.2).

### Hâlâ açık olanlar

İlkesi karara bağlanmış ama değeri ya da kapsamı belirlenmemiş konular. Faz 1.1'de kapananlar:
açılma süresi (K15), tek oyunculu tavan ve eşikler (K16), dolaylı Elmas (K13), eşleşme eşiği ve
seçim sırası (K14).

| Konu                                                                                           | Karar yeri        |
| ---------------------------------------------------------------------------------------------- | ----------------- |
| Çevrimdışı kuyrukta günlük tavanın hangi güne göre sayılacağı (cihaz saati mi, sunucu günü mü) | 5.3               |
| Ad değiştirme kuralı (öneri §2.3: ilk ücretsiz, sonra 1.000 Altın, 30 günde 1)                 | 5.2               |
| Kendi barındırma mı yönetilen hizmet mi; "Türkiye bölgesi" fiziksel konum mu yakınlık mı (K8)  | 5.5               |
| Türkiye'den uzak bölgelerdeki oyuncular için gecikme (ikinci bölge ya da aktarım)              | 12.6 öncesi       |
| Günlük sıfırlama saati: tek saat (00:00 TSİ) mi, bölgesel mi                                   | 12.6 öncesi       |
| Telefonda iki kişilik dokunmatik düzen (yerel 2 oyuncu, §7.7)                                  | 2.3               |
| TL fiyatlarının mağaza kademelerine uyarlanması ve dönemsel güncelleme kuralı (§5.1)           | 8.3               |
| 18 yaş altı harcama limiti değeri ve ebeveyn onayı akışı (§5.4)                                | 8.5, avukat 10.3  |
| Lig eşikleri, kupa değerleri ve sezon sıfırlaması (§7.2'deki ilk değerler)                     | 9.5               |
| Yankı ve Sekme süperlerinin son sayısal değerleri (§9.4)                                       | 7.6 (2.9 sonrası) |
| "Kafadarlar" marka tescil başvurusu: hangi sınıflar, ne zaman (K19)                            | 0.2, avukat       |
| Stadyum varyantlarının renkleri ve çim zemin rengi (ART_BIBLE §2.4)                            | 4.1, 7.2          |
