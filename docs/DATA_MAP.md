# Veri Haritası (Data Map)

> **Durum:** iskelet (Faz 0.3, 2026-11-20); Firebase satırları ve ilk yurt dışı alıcı Faz 2.8'de
> (2026-11-28) eklendi. Her yeni veri toplama noktası eklendiği fazda buraya
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

Faz eklendikçe doldurulur. Beklenen satırlar (yol haritasından): misafir hesap / cihaz kimliği (5.2),
oyuncu adı ve ad raporları (5.2, 11.4), Google Play Games / Game Center kimliği (5.2, 12.2), bulut
kaydı (5.2), cüzdan, işlem defteri ve çevrimdışı ödül kuyruğu (5.3), sunucu kayıtları ve IP (5.5),
yaş beyanı ve rıza kayıtları (8.1–8.2), satın alma makbuzları — RevenueCat (8.3–8.4), reklam kimliği
— AdMob (8.7–8.8), maç girdi kayıtları, checksum uyuşmazlık logları ve beceri puanı (9.x), arkadaş
listesi (9.6), destek ve KVKK başvuruları (10.1, 11.5), bildirim jetonu (11.2), A/B deney ataması
(11.3).

| Veri                                                                                                                                                                                                                                                                                                                  | Kaynak                                                                               | Amaç                                                                                                      | Hukuki sebep (taslak)                        | Rıza                                  | Aktarıldığı yer                                                                           | Saklama süresi                                                                      | Faz |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --- |
| Dokunmatik kontrol düzeni (`touchLayout`: konum, boyut, opaklık, solak modu); titreşim ve gecikme ölçer ayarı (`settings`)                                                                                                                                                                                            | Oyun (`localStorage`)                                                                | Tercihleri hatırlamak                                                                                     | Uygulanmaz: cihazdan çıkmaz                  | Hayır                                 | Aktarılmaz (cihazda; Android otomatik yedeği açıksa Google yedeğine gider — Faz 8.1 notu) | Uygulama verisi silinene kadar                                                      | 2.3 |
| Rıza kaydı (geçici): analiz kararı, çökme raporu kararı, karar zamanı, rıza metni sürümü                                                                                                                                                                                                                              | Uygulama (Android `SharedPreferences` `kafa_telemetry`)                              | Rızayı uygulamak ve ispatlamak                                                                            | KVKK m.5/2-ç (hukuki yükümlülük)             | Hayır                                 | Aktarılmaz (cihazda)                                                                      | Karar değişince üzerine yazılır; uygulama verisi silinene kadar                     | 2.8 |
| Kullanım olayları: `src/telemetry/events.ts` sözlüğündeki olaylar (maç başı/sonu: mod, zorluk, karakterler, skor, süre; hata türü; çizici süreç kaybı) + Firebase'in otomatik olayları (`first_open`, `session_start`, `user_engagement`, `app_update`, `os_update`, `app_remove`, `app_clear_data`, `app_exception`) | Firebase Analytics SDK                                                               | Kullanım istatistiği, huni (6.8, 11.3), kararlılık                                                        | Açık rıza (KVKK m.5/1)                       | **Analiz**                            | Google LLC — ABD ve Google'ın tesisleri olan diğer ülkeler                                | Olay ve kullanıcı düzeyi veri **2 ay** (GA4 ayarı, OPS § 4.3); toplu raporlar kalır | 2.8 |
| Uygulama örnek kimliği (app instance ID), Firebase kurulum kimliği (FID); cihaz modeli, Android sürümü, uygulama sürümü, dil, ekran çözünürlüğü; ülke (IP'den kaba konum — IP kullanıldıktan sonra atılır, saklanmaz)                                                                                                 | Firebase Analytics SDK                                                               | Olayları cihaz bazında saymak, sürüm/cihaz kırılımı                                                       | Açık rıza (KVKK m.5/1)                       | **Analiz**                            | Google LLC — ABD ve diğer ülkeler                                                         | 2 ay (yukarıdaki gibi); FID: silme isteğine kadar, sonra 180 gün içinde             | 2.8 |
| Çökme raporu: yığın izi (Java ve JS; JS hata mesajı en çok 300 karakter, adres kökü atılmış), hata türü, Crashlytics kurulum UUID'si, FID, cihaz modeli, Android sürümü, uygulama sürümü, cihaz durumu (boş bellek/disk, ekran yönü), WebView sürümü, derleme türü, açık ekran (sahne), çizici süreç kaybı ayrıntısı  | Firebase Crashlytics SDK, `TelemetryPlugin`                                          | Çökmeleri bulup düzeltmek (QUALITY_BAR K1, K4)                                                            | Açık rıza (KVKK m.5/1)                       | **Çökme raporu**                      | Google LLC — ABD ve diğer ülkeler (Crashlytics "küresel hizmet")                          | **90 gün** (Firebase; ayar yok)                                                     | 2.8 |
| Oturum kaydı: oturum başlangıcı, FID, uygulama sürümü (Crashlytics'in "kararlılık" ölçümü için)                                                                                                                                                                                                                       | Firebase Sessions (Crashlytics ile gelir)                                            | Çökmesiz oturum oranı                                                                                     | Açık rıza (KVKK m.5/1)                       | **Çökme raporu**                      | Google LLC — ABD ve diğer ülkeler                                                         | Firebase belgesinde yok → Faz 10.3'te sorulacak                                     | 2.8 |
| IP adresi, cihazın Google Play hizmetleri bilgisi (yazı tipi indirme isteği)                                                                                                                                                                                                                                          | Android WebView → Google Play hizmetleri → `fonts.gstatic.com` (bizim kodumuz değil) | WebView'ın sistem yazı tiplerini indirmesi; yalnızca cihazın yazı tipi önbelleği boşsa (Faz 2.8 ağ kaydı) | Google'ın kendi politikası (Play hizmetleri) | Hayır (uygulamanın denetiminde değil) | Google LLC, ABD                                                                           | Google politikasına göre                                                            | 2.8 |

**Toplanmayanlar (Faz 2.8 kararı):** reklam kimliği (Advertising ID; kütüphane pakete girmez,
`AD_ID` izni silinir), Android ID / SSAID, Privacy Sandbox reklam ilişkilendirmesi, Play kurulum
kaynağı (install referrer), kesin konum, ad, e-posta, oyuncu adı, serbest metin. Firebase rıza modu:
reklam depolama, reklam kullanıcı verisi ve reklam kişiselleştirmesi her zaman "reddedildi".
Rıza yokken (karar verilmedi ya da "İzin verme") Firebase'e hiçbir istek gitmez; rızadan önce cihazda
biriken çökme raporları rıza verilince gönderilmeden silinir. Ayrıntı: OPS § 4, PROGRESS § Faz 2.8.

## Yurt dışı aktarımlar

Her yurt dışı alıcı için: alıcı, ülke, aktarılan veri, dayanak (standart sözleşme), imza tarihi,
Kurul'a bildirim tarihi (imzadan sonra 5 iş günü). İlk yurt dışı alıcı Firebase'dir (Faz 2.8);
sunucu yurt dışındaysa Faz 5.5'te o da eklenir. Avukatla Faz 10.3'te tamamlanır.

| Alıcı                                                                           | Ülke                                                                             | Veri                                                                                     | Dayanak                                                                                                                                                                                                                                                                                                                                                                                                                       | İmza tarihi                                                                  | Bildirim tarihi |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------- |
| Google LLC — Firebase Analytics, Crashlytics, Installations, Sessions (Faz 2.8) | ABD; Firebase "verinin Google'ın tesisi olan her ülkede işlenebileceğini" söyler | Yukarıdaki "Analiz" ve "Çökme raporu" rızalı satırlar (yalnızca rıza veren kullanıcılar) | **Belirlenmedi — AVUKAT ONAYI BEKLİYOR.** Şu an: rıza ekranında yurt dışı aktarım açıkça yazıyor ve açık rıza alınıyor. Açık rıza KVKK m.9'da yalnızca arızi aktarım için yeterli olabilir; düzenli aktarım için standart sözleşme + Kurul'a bildirim gerekebilir. Google'ın Firebase / Analytics veri işleme şartları (konsolda kabul, OPS § 4.3) KVKK standart sözleşmesi yerine geçer mi → Faz 0.2 avukat tanışması / 10.3 | — (imzalanmadı; konsolda veri işleme şartlarını kabul tarihi buraya yazılır) | —               |

**Not (Faz 2.8):** Uygulama yalnızca geliştiricinin cihazında ve test cihazlarında; gerçek kullanıcı
verisi henüz yok. 4.7 dikey dilim ve 12.5 kapalı testteki testçilerin verisi de bu kapsamda: o
tarihten önce dayanak netleşmeli.
