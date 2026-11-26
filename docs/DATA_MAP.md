# Veri Haritası (Data Map)

> **Durum:** iskelet (Faz 0.3, 2026-11-20). Her yeni veri toplama noktası eklendiği fazda buraya
> yazılır; satın alma ve reklamdan önce Faz 8.1'de toplu gözden geçirilir, son kontrolü Faz 10.2'de.
> Hukuki sebep sütunu taslaktır — **AVUKAT ONAYI BEKLİYOR** (Faz 10.3).
>
> Kural (ROADMAP_MOBILE.md § Gizlilik): bu tabloda olmayan veri toplanmaz; rıza gerektiren hiçbir
> SDK rıza alınmadan başlatılmaz. Google Play "Veri güvenliği" formu ve Apple "App Privacy"
> etiketleri bu dosyadan üretilir (Faz 10.4) ve onlarla birebir aynı olmalıdır.

## Sütunlar

| Sütun           | Anlamı                                                                              |
| --------------- | ----------------------------------------------------------------------------------- |
| Veri            | Toplanan/işlenen veri kategorisi (ör. cihaz kimliği, satın alma makbuzu, IP adresi) |
| Kaynak          | Nereden geliyor (oyun istemcisi, SDK adı, sunucu, mağaza)                           |
| Amaç            | Ne için kullanılıyor                                                                |
| Hukuki sebep    | KVKK m.5/m.6 dayanağı (sözleşmenin ifası, meşru menfaat, açık rıza…) — taslak       |
| Rıza            | Gerekli mi; gerekiyorsa hangi rıza anahtarı (reklam / analiz / pazarlama)           |
| Aktarıldığı yer | Alıcı (bizim sunucumuz, Google, RevenueCat…) ve **ülke**                            |
| Saklama süresi  | Ne kadar tutuluyor, nasıl siliniyor (yedekler dahil → OPS.md)                       |
| Faz             | Bu veriyi ekleyen faz                                                               |

## Mevcut durum — web sürümü v1.0.0

Oyun sunucuya ya da üçüncü tarafa hiçbir veri göndermez; analiz, reklam ve çerez yoktur. Tüm kayıt
tarayıcının `localStorage`'ında, cihazda kalır (`kafa-kafaya.` önekli anahtarlar,
`src/config/gameConfig.ts` → `STORAGE`).

| Veri                                                  | Kaynak                  | Amaç                     | Hukuki sebep (taslak)       | Rıza  | Aktarıldığı yer                         | Saklama süresi                       | Faz     |
| ----------------------------------------------------- | ----------------------- | ------------------------ | --------------------------- | ----- | --------------------------------------- | ------------------------------------ | ------- |
| Dil, ses düzeyleri, zorluk, tercih edilen karakterler | Oyun (`localStorage`)   | Tercihleri hatırlamak    | Uygulanmaz: cihazdan çıkmaz | Hayır | Aktarılmaz (cihazda)                    | Kullanıcı site verisini silene kadar | Web 0–6 |
| Oyun ayarları (`settings`)                            | Oyun (`localStorage`)   | Ayarları hatırlamak      | Uygulanmaz: cihazdan çıkmaz | Hayır | Aktarılmaz (cihazda)                    | Kullanıcı site verisini silene kadar | Web 6–7 |
| İlerleme ve istatistik (`progress`), süren turnuva    | Oyun (`localStorage`)   | İlerlemeyi saklamak      | Uygulanmaz: cihazdan çıkmaz | Hayır | Aktarılmaz (cihazda)                    | Kullanıcı site verisini silene kadar | Web 6   |
| IP adresi, tarayıcı bilgisi (sunucu kayıtları)        | GitHub Pages barındırma | Sayfayı sunmak, güvenlik | GitHub'ın kendi politikası  | Hayır | GitHub Inc., ABD (bizim erişimimiz yok) | GitHub politikasına göre             | Web 0   |

## Mobil sürüm

Faz eklendikçe doldurulur. Beklenen satırlar (yol haritasından): analiz ve çökme verileri —
Firebase Analytics + Crashlytics (2.8), geçici rıza kaydı (2.8), misafir hesap / cihaz kimliği (5.2),
oyuncu adı ve ad raporları (5.2, 11.4), Google Play Games / Game Center kimliği (5.2, 12.2), bulut
kaydı (5.2), cüzdan, işlem defteri ve çevrimdışı ödül kuyruğu (5.3), sunucu kayıtları ve IP (5.5),
yaş beyanı ve rıza kayıtları (8.1–8.2), satın alma makbuzları — RevenueCat (8.3–8.4), reklam kimliği
— AdMob (8.7–8.8), maç girdi kayıtları, checksum uyuşmazlık logları ve beceri puanı (9.x), arkadaş
listesi (9.6), destek ve KVKK başvuruları (10.1, 11.5), bildirim jetonu (11.2), A/B deney ataması
(11.3).

| Veri                                                                                                                       | Kaynak                | Amaç                  | Hukuki sebep (taslak)       | Rıza  | Aktarıldığı yer                                                                           | Saklama süresi                 | Faz |
| -------------------------------------------------------------------------------------------------------------------------- | --------------------- | --------------------- | --------------------------- | ----- | ----------------------------------------------------------------------------------------- | ------------------------------ | --- |
| Dokunmatik kontrol düzeni (`touchLayout`: konum, boyut, opaklık, solak modu); titreşim ve gecikme ölçer ayarı (`settings`) | Oyun (`localStorage`) | Tercihleri hatırlamak | Uygulanmaz: cihazdan çıkmaz | Hayır | Aktarılmaz (cihazda; Android otomatik yedeği açıksa Google yedeğine gider — Faz 8.1 notu) | Uygulama verisi silinene kadar | 2.3 |

## Yurt dışı aktarımlar

Her yurt dışı alıcı için: alıcı, ülke, aktarılan veri, dayanak (standart sözleşme), imza tarihi,
Kurul'a bildirim tarihi (imzadan sonra 5 iş günü). İlk yurt dışı alıcı Firebase'dir (Faz 2.8);
satırı o fazda açılır, sunucu yurt dışındaysa Faz 5.5'te o da eklenir. Avukatla Faz 10.3'te
tamamlanır.

| Alıcı | Ülke | Veri | Dayanak | İmza tarihi | Bildirim tarihi |
| ----- | ---- | ---- | ------- | ----------- | --------------- |
|       |      |      |         |             |                 |
