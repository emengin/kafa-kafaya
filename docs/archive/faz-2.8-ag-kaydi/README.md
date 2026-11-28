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
