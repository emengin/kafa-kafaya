# Veri Haritası (Data Map)

> **Durum:** iskelet (Faz 0.3, 2026-11-20). Her yeni veri toplama noktası eklendiği fazda buraya
> yazılır; son hâli Faz 10.1'de. Hukuki sebep sütunu taslaktır — **AVUKAT ONAYI BEKLİYOR**
> (Faz 10.5).
>
> Kural (ROADMAP_MOBILE.md § Gizlilik): bu tabloda olmayan veri toplanmaz; rıza gerektiren hiçbir
> SDK rıza alınmadan başlatılmaz. Google Play "Veri güvenliği" formu ve Apple "App Privacy"
> etiketleri bu dosyadan üretilir (Faz 10.6) ve onlarla birebir aynı olmalıdır.

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

Faz eklendikçe doldurulur. Beklenen satırlar (yol haritasından): misafir hesap / cihaz kimliği (5.2),
Google Play Games / Game Center kimliği (5.2, 12.2), bulut kaydı (5.2), cüzdan ve işlem defteri
(5.3), sunucu kayıtları ve IP (5.5), maç girdi kayıtları ve beceri puanı (9.x), arkadaş listesi
(9.6), satın alma makbuzları — RevenueCat (8.1–8.2), reklam kimliği — AdMob (8.5–8.6), analiz ve
çökme verileri — Firebase (11.3; Crashlytics tarihi açık soru), bildirim jetonu (11.2), yaş beyanı
ve rıza kayıtları (10.1–10.2), destek ve KVKK başvuruları (10.3, 11.5).

| Veri | Kaynak | Amaç | Hukuki sebep (taslak) | Rıza | Aktarıldığı yer | Saklama süresi | Faz |
| ---- | ------ | ---- | --------------------- | ---- | --------------- | -------------- | --- |
|      |        |      |                       |      |                 |                |     |

## Yurt dışı aktarımlar

Her yurt dışı alıcı için: alıcı, ülke, aktarılan veri, dayanak (standart sözleşme), imza tarihi,
Kurul'a bildirim tarihi (imzadan sonra 5 iş günü). Faz 10.5'te avukatla doldurulur.

| Alıcı | Ülke | Veri | Dayanak | İmza tarihi | Bildirim tarihi |
| ----- | ---- | ---- | ------- | ----------- | --------------- |
|       |      |      |         |             |                 |
