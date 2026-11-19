# Operasyon Rehberi (OPS)

> **Durum:** iskelet (Faz 0.3, 2026-11-20). Bölümler ilgili fazda doldurulur. Bu dosyadaki adımlar
> gerçekten denenmiş olmalıdır; denenmemiş adım "(denenmedi)" diye işaretlenir.

## 1. Web sürümü (bugün çalışan)

- **Yayın:** `main`'e her push'ta `.github/workflows/deploy.yml` çalışır: `npm ci` → lint → test →
  build → Playwright duman testi → GitHub Pages. PR'larda yalnızca doğrulama, yayın yok.
- **Adres:** https://emengin.github.io/kafa-kafaya/ (Pages kaynağı: GitHub Actions).
- **Sürüm:** `CHANGELOG.md`'ye `## [x.y.z]` bölümü ekle, `package.json` sürümünü güncelle, her şey
  yeşilken `vX.Y.Z` etiketini it → `.github/workflows/release.yml` sürüm notunu CHANGELOG'dan çıkarıp
  GitHub Release oluşturur.
- **Geri alma:** hatalı commit'i `git revert` edip push et (Pages bir önceki derlemeye döner).
  Service worker yüzünden açık sekmeler eski sürümle devam eder; yeni sürüm bir sonraki açılışta gelir.
- Web sürümü mobil geliştirme boyunca tanıtım/demo olarak yayında kalır; her mobil fazdan sonra CI
  yeşil olmalı.

## 2. İmza anahtarı (keystore) ve Play App Signing

<!-- Faz 2.6: yükleme anahtarı oluşturma, repo sırlarına koyma, en az iki ayrı yerde şifreli yedek
(ör. parola yöneticisi + çevrimdışı disk), Play App Signing kaydı, yükleme anahtarı kaybında
sıfırlama adımları. UYARI: imza anahtarını kaybetmek, uygulamayı güncelleyememek demektir. -->

## 3. Android sürüm hattı

<!-- Faz 2.6 / 12.1: sürüm numaralandırma, imzalı AAB, kademeli dağıtım, çökme sembolleri, sürüm
notları şablonu. -->

## 4. iOS derleme

<!-- Faz 12.2: bulut macOS derlemesi, sertifikalar ve profiller, App Store Connect. -->

## 5. Sunucu (Nakama)

<!-- Faz 5.1 / 5.5: barındırma kararı ve gerekçesi (kendi barındırma / yönetilen hizmet, KVKK yurt
dışı aktarım etkisi; lansman tek Türkiye bölgesi), ortamlar (geliştirme, test, canlı), kurulum,
güncelleme, TLS, güvenlik duvarı, izleme ve uyarılar, log saklama süreleri (DATA_MAP ile uyumlu). -->

## 6. Yedekleme ve geri yükleme

<!-- Faz 5.5: otomatik yedek takvimi, saklama, geri yükleme adımları ve son başarılı geri yükleme
denemesinin tarihi. -->

## 7. Olay müdahalesi

<!-- Faz 5.5: sunucu çöküşü, veri ihlali (KVKK bildirim süreleri), hatalı sürüm, ödeme sorunu —
her biri için ilk 1 saatte yapılacaklar ve iletişim. -->

## 8. Veri silme ve yedekler

<!-- Faz 10.1: hesap silme talebinin sunucuda uygulanması, yedeklerden silinme politikası ve süresi. -->

## 9. Sırlar ve erişimler

<!-- Hangi sır nerede (GitHub sırları, sunucu, parola yöneticisi), kimin erişimi var, yenileme takvimi.
Sırların kendisi asla repoya yazılmaz. -->
