# Faz 2.8 — ağ kayıtları (2026-11-28)

Araç: `scripts/mobile/netlog.js` (OPS § 4.7). Cihaz: Android Studio emülatörü (Android 17 / API 37,
Google Play görüntüsü), `--proxy-host 10.0.2.2`. Uygulama: geliştirici derlemesi, **sahte**
`google-services.json` ile (gerçek Firebase projesi henüz yoktu). Sahte yapılandırmayla Firebase
SDK'ları normal başlar ve aynı sunuculara bağlanır; yalnızca sunucu istekleri reddeder. Telefonda
gerçek yapılandırmayla tekrar: PROGRESS § Faz 2.8.

Her kayıtta iki ölçüm var:

- **Bağlantılar:** proxy'den geçen her HTTPS bağlantısının hedefi (cihazın tamamı: Play hizmetleri
  ve diğer uygulamalar da görünür).
- **Uygulama UID ağ sayacı farkı:** çekirdeğin bu uygulamaya yazdığı toplam bayt (proxy'den
  bağımsız, her soket). Not: Google Play hizmetleri bir uygulama adına indirme yaptığında trafiği o
  uygulamanın hesabına yazar.

| Dosya                                    | Senaryo                                                                                                                                                                    | Sonuç                                                                                                                                                                                                                                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `1-riza-yok.txt`                         | Veri temizlendi (rıza hiç sorulmamış). Uygulama açıldı, rıza ekranı 30 sn bekletildi, "İzin verme", Ayarlar → Gizlilik, test JS hatası, **test çökmesi**, yeniden açılış   | **0 bağlantı, uygulamanın sayacı +0 bayt** (140 sn)                                                                                                                                                                                                                                  |
| `2-riza-yok-yazi-tipi-onbellegi-bos.txt` | Uygulamanın ve Google Play hizmetlerinin verisi temizlendi (yazı tipi önbelleği boş, "yeni cihaz" gibi); uygulama açıldı, rıza ekranında karar verilmeden beklendi (90 sn) | Firebase'e **0** bağlantı. `fonts.gstatic.com` (~3 MB, uygulamanın hesabına): WebView'ın açılışta Play hizmetlerinden istediği sistem yazı tipleri; önbellek doluyken (kayıt 1) olmuyor. `www.googleapis.com`, `android.googleapis.com`: sıfırlanan Play hizmetlerinin kendi trafiği |
| `3-riza-var.txt`                         | Veri temizlendi, açılış, **"İzin ver"** (15:43:49), test JS hatası, test çökmesi, yeniden açılış                                                                           | İlk Firebase bağlantısı rıza verildiği saniyede: `firebase-settings.crashlytics.com`, `app-measurement.com`, sonra `firebaselogging-pa.googleapis.com`; uygulamanın sayacı +34 kB. Yöntemin Firebase trafiğini yakaladığını gösterir                                                 |

## Telefonda, gerçek Firebase projesiyle (2026-11-28, kayıt 4–6)

Cihaz: realme 12 (RMX3890), Android, kullanıcının günlük telefonu. Uygulama: geliştirici derlemesi,
gerçek `google-services.json` (`kafadarlar-964e6`), uygulama kimliği `com.emengin.kafadarlar`
(UID 10001). Proxy USB üzerinden (`adb reverse`).

**Depo herkese açık olduğu için kayıtlar gizlendi:** Google/Firebase dışındaki sunucu adları ve
cihaz seri numarası çıkarıldı (telefondaki diğer uygulamaları ele verirdi). Ham kayıtlar yalnızca
geliştiricinin bilgisayarında.

Gerçek telefonda proxy'den **telefondaki bütün uygulamaların** trafiği geçer ve birçoğu kendi
Firebase SDK'sını kullanır. "Firebase sunucusuna bağlantı" bu yüzden tek başına bir şey kanıtlamaz.
Sahibini bulmak için ek ölçüm: telefonda `/proc/net/tcp{,6}` proxy portuna (8899) bağlı her soketin
**UID**'sini örnekler (kayıt 4'te ~3/sn, kayıt 5–6'da ~20/sn), `logcat` ile süreç eşleştirilir.
Firebase satırlarının yanındaki `←` notu bu eşleştirmedir.

| Dosya                             | Senaryo                                                                                                                         | Sonuç                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `4-telefon-riza-yok.txt`          | Veri temizlendi, açılış, rıza ekranı 30 sn, "İzin verme", Gizlilik, test JS hatası, **test çökmesi**, yeniden açılış (150 sn)   | Bu uygulamanın UID'si proxy'ye **hiç** bağlanmadı; UID sayacı **+0 bayt**. Görülen 4 Firebase bağlantısı başka iki uygulamanın (Remote Config; 1 sn önce arka planda başlatılan bir uygulamanın kendi Crashlytics'i)                                                                                                                                                                       |
| `5-telefon-riza-yok-3-acilis.txt` | "İzin verme" kayıtlıyken uygulama 3 kez açılıp kapatıldı (22 sn açık, 6 sn kapalı)                                              | UID 10001 için **0 soket örneği** (~20/sn), sayaç **+0 bayt**. Crashlytics bağlantıları 3 açılıştan yalnızca birine yakın ve logcat'te sahibi açıkça başka bir uygulama (önceden yüklü; "Initializing Firebase Crashlytics 20.0.6 for …", "Making request to crashlyticsreports-pa"). Bu uygulamanın logcat'i: "App measurement disabled", "Sessions SDK disabled through data collection" |
| `6-telefon-riza-var.txt`          | Veri temizlendi, açılış, **"İzin ver"** (19:16:24), Hızlı Maç başladı ve yarıda bırakıldı, test JS hatası, test çökmesi, açılış | İlk Firebase bağlantısı ve bu uygulamanın ilk soketi rıza verilen saniyede; maç olayları `app-measurement.com`; çökmeden 1 sn sonra Firebase gönderim işi uygulamayı başlatıp raporu `crashlyticsreports-pa`'ya yolladı; sonra Firebase Sessions. UID sayacı **+20 kB**: yöntem bu uygulamanın trafiğini telefonda da görüyor                                                              |

Not: realme'nin sistem bileşeni (`DropBoxCrashInfoHelper`) uygulama çöktüğünde çökme bilgisini
(uygulama adı, istisna mesajı, yığın) **rızamızdan bağımsız** kendi kaydına alıyor. Bu işletim
sisteminin işlemesi, uygulamanın değil; yalnızca çökme mesajlarımızda kişisel veri olmamasının
(zaten yok) bir nedeni daha.
