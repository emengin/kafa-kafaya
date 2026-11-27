# Operasyon Rehberi (OPS)

> **Durum:** iskelet (Faz 0.3, 2026-11-20); § 2, § 3 ve § 9 Faz 2.6'da (2026-11-27) dolduruldu.
> Bölümler ilgili fazda doldurulur. Bu dosyadaki adımlar
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

> ⚠️ **İmza anahtarını kaybetmek, uygulamayı güncelleyememek demektir.** Play App Signing açıkken
> kaybedilen _yükleme_ anahtarı Google'dan sıfırlatılabilir (§ 2.6); yine de anahtar ve şifresi en az
> iki ayrı yerde yedekli tutulur (§ 2.4). Şifre hiçbir dosyaya, depoya, sohbete ya da issue'ya yazılmaz.

### 2.1 İki anahtar

| Anahtar                                    | Kimde                                          | Ne işe yarar                                                                            |
| ------------------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Uygulama imza anahtarı** (app signing)   | Google (Play App Signing)                      | Kullanıcının telefonuna giden APK'ları imzalar. Asla değişmez.                          |
| **Yükleme anahtarı** (upload key, bizdeki) | Geliştirici + GitHub sırrı (`android-release`) | CI'ın ürettiği AAB'yi imzalar; Play "bu yüklemeyi geliştirici yaptı" diye kontrol eder. |

Dosya: `kafakafaya-upload.jks` · takma ad (alias): `kafakafaya-upload` (iş akışında sabit) · tür
PKCS12, RSA 4096, 10 000 gün geçerli. PKCS12'de anahtar şifresi = depo şifresi (tek şifre).

### 2.2 Yükleme anahtarını oluşturma (Windows, bir kez)

Komutlar PowerShell'de çalışır (VS Code → Terminal → New Terminal). Komut 2026-11-27'de aynı
parametrelerle atılacak bir test anahtarıyla denendi.

1. **Şifreyi önce parola yöneticisinde üret ve kaydet** (en az 20 karakter, rastgele). Kayıt adı
   ör. "Kafa Kafaya — Android yükleme anahtarı". Şifre buradan kopyalanıp yapıştırılır.
2. **Depo dışında bir klasör aç** (anahtar asla proje klasörüne konmaz):

   ```powershell
   New-Item -ItemType Directory -Force "$HOME\kafakafaya-imza"
   ```

3. **Anahtarı oluştur** (Android Studio'nun içindeki `keytool`):

   ```powershell
   & "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v -keystore "$HOME\kafakafaya-imza\kafakafaya-upload.jks" -storetype PKCS12 -alias kafakafaya-upload -keyalg RSA -keysize 4096 -validity 10000
   ```

   Sorular İngilizce gelir:
   - `Enter keystore password:` → şifreyi yapıştır (sağ tık ya da Ctrl+V). **Yazarken ekranda hiçbir
     şey görünmez, bu normal.** Enter. `Re-enter new password:` → aynısı, Enter.
   - `What is your first and last name?` → geliştirici ya da stüdyo adı. Bu bilgiler sertifikada
     durur ve herkese açık AAB'lerden okunabilir: **ev adresi, telefon gibi kişisel bilgi yazma.**
   - `organizational unit`, `organization`, `City`, `State` → boş bırakmak için Enter.
   - `two-letter country code` → `TR`.
   - `Is CN=..., correct?` → `yes`.
   - Sonunda `Storing ...kafakafaya-upload.jks` yazar.

4. **Kontrol et ve parmak izini not al** (parmak izi gizli değildir):

   ```powershell
   & "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore "$HOME\kafakafaya-imza\kafakafaya-upload.jks" -alias kafakafaya-upload
   ```

   Şifreyi sorar. Çıktıdaki `SHA256:` satırını parola yöneticisindeki kaydın notuna ekle; CI'ın her
   imzalı AAB'de yazdığı parmak iziyle aynı olmalı.

5. **Yedekle** (§ 2.4), sonra GitHub'a ekle (§ 2.3).

### 2.3 GitHub'a ekleme (web arayüzü)

Sırlar **depo sırrı değil, ortam (environment) sırrı** olarak eklenir: ortam yalnızca `v*`
etiketlerine izin verdiği için başka bir dal ya da iş akışı bu sırları okuyamaz. 2026-11-27/28'de denendi.

**A. Ortamı oluştur**

1. github.com'da depoyu aç → üstte **Settings** (dişli) → solda **Environments** → **New environment**.
2. Name: `android-release` → **Configure environment**.
3. **Deployment branches and tags** bölümünde açılır menüden **Selected branches and tags** seç →
   **Add deployment branch or tag rule** → Ref type: **Tag** → Name pattern: `v*` → **Add rule**.
4. (İsteğe bağlı) **Required reviewers**'a kendini eklersen her imza işi senin onayını bekler.

**B. Sırları ekle** (aynı sayfada aşağıda **Environment secrets** → **Add environment secret**)

1. Anahtar dosyasını Base64 metne çevirip panoya kopyala (PowerShell):

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\kafakafaya-imza\kafakafaya-upload.jks")) | Set-Clipboard
   ```

2. Name: `ANDROID_KEYSTORE_BASE64` → Value kutusuna Ctrl+V → **Add secret**.
3. Tekrar **Add environment secret** → Name: `ANDROID_KEYSTORE_PASSWORD` → Value: şifreyi parola
   yöneticisinden yapıştır → **Add secret**.
4. Panoyu temizle: `Set-Clipboard -Value ' '`. Pano geçmişi açıksa Win+V → **Tümünü temizle**.

> ⚠️ Aynı sayfada hemen altta **Environment variables** / **Add environment variable** bölümü de var;
> şifre oraya **eklenmez**. Variable şifreli değildir: değeri sayfada düz metin görünür, loglarda
> gizlenmez ve iş akışı onu `secrets` içinde bulamaz ("sırları gerekli" hatası). Kural: **değerini
> görebiliyorsan sır değildir.** İlk denemede bu oldu; variable silinip sır olarak eklendi.
>
> Doğru kurulumda **Environment secrets** tablosunda iki satır olur (değer görünmez),
> **Environment variables** tablosu boştur.

Kaydedilen sır bir daha görüntülenemez (yalnızca değiştirilebilir); bu yüzden GitHub **yedek değildir**.
Sırrı düzelttikten sonra yeni etiket gerekmez: Actions → çalışma → **Re-run jobs** → **Re-run failed
jobs** güncel sırları kullanır (imzasız AAB artefaktı 1 gün saklanır).

**C. Depo genel ayarları** (Settings → Actions → General)

1. **Fork pull request workflows from outside collaborators** → **Require approval for all external
   contributors** → Save. Dışarıdan gelen PR'ların iş akışı sen onaylamadan çalışmaz (zaten sır
   alamazlar; bu, kaynak israfını ve sürprizleri de önler).
2. **Workflow permissions** → **Read repository contents and packages permissions** → Save. (Pages
   ve Release iş akışları ihtiyaç duydukları izni dosyada kendileri istiyor.)

### 2.4 Yedekleme

En az **iki ayrı yerde**, biri çevrimdışı:

1. **Parola yöneticisi:** şifre + `.jks` dosyası ek (attachment) olarak + SHA-256 parmak izi.
2. **Çevrimdışı disk** (USB bellek, evde): yalnızca `.jks` dosyası. Dosya şifreyle korunur; şifre
   bu diske yazılmaz.

`$HOME\kafakafaya-imza` klasörü çalışma kopyasıdır, yedek sayılmaz (disk bozulursa gider). Altı ayda
bir yedekten geri yükleme denenir: yedekteki dosyayla § 2.2 adım 4 çalıştırılır, parmak izi aynı
mı bakılır. Son deneme: — (henüz yok).

### 2.5 Play App Signing kaydı (denenmedi — Play hesabı Faz 0.1 / 12'de)

1. Play Console → **Create app** → uygulama oluşturulur.
2. İlk sürümü yüklerken (Testing → Internal testing → Create new release) **App integrity** bölümünde
   **Google tarafından oluşturulan anahtar** seçili kalır (varsayılan, önerilen). Kendi uygulama imza
   anahtarını yükleme seçeneği kullanılmaz.
3. CI'ın ürettiği imzalı AAB yüklenir; Play onu imzalayan sertifikayı yükleme anahtarı olarak kaydeder.
4. Setup → **App integrity** → **App signing**: "Upload key certificate" SHA-256 parmak izi § 2.2
   adım 4'teki ve CI özetindeki ile aynı olmalı.

### 2.6 Yükleme anahtarı kaybolursa ya da sızarsa (denenmedi)

1. Yeni anahtar oluştur (§ 2.2; dosya adını değiştir, ör. `kafakafaya-upload-2.jks`).
2. Sertifikasını dışa aktar:

   ```powershell
   & "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -export -rfc -keystore "$HOME\kafakafaya-imza\kafakafaya-upload-2.jks" -alias kafakafaya-upload -file "$HOME\kafakafaya-imza\upload_certificate.pem"
   ```

3. Play Console → Setup → App integrity → App signing → **Request upload key reset** → `.pem`
   dosyasını yükle. Google onaylayınca (birkaç gün) yeni anahtar geçerli olur.
4. GitHub'daki iki sırrı yeni değerlerle güncelle (§ 2.3 B), yedekleri yenile (§ 2.4).
5. Sızma şüphesinde ilk iş GitHub sırlarını silmek ve sıfırlamayı başlatmaktır. Play App Signing
   olmadan anahtar kaybı geri alınamaz; bu yüzden § 2.5 adım 2 zorunlu.

## 3. Android sürüm hattı

İş akışı: `.github/workflows/android-release.yml` (Faz 2.6). Kademeli dağıtım, çökme sembolleri ve
sürüm notları şablonu Faz 12.1'de eklenecek.

### 3.1 Sürüm numarası

Tek kaynak `package.json` → `version` (`X.Y.Z`). `android/app/build.gradle` okur:

- `versionCode = X × 1 000 000 + Y × 10 000 + Z × 100 + D`
- `D` (derleme): etiketsiz yerel derleme **0** · `vX.Y.Z-rc.N` etiketi **N** (1–98) · `vX.Y.Z`
  etiketi **99**.

| Derleme                            | versionName  | versionCode |
| ---------------------------------- | ------------ | ----------- |
| Yerel (Android Studio, `cap:sync`) | `1.1.0-dev`  | 1010000     |
| Etiket `v1.1.0-rc.1`               | `1.1.0-rc.1` | 1010001     |
| Etiket `v1.1.0-rc.2`               | `1.1.0-rc.2` | 1010002     |
| Etiket `v1.1.0`                    | `1.1.0`      | 1010099     |
| Etiket `v1.1.1-rc.1`               | `1.1.1-rc.1` | 1010101     |

Play her yüklemede daha büyük `versionCode` ister; bu formülde ileri giden her etiket daha büyük
sayı üretir. Sınırlar: Y ve Z en çok 99. Hesabı görmek için:
`cd android; ./gradlew -q :app:printAppVersion -PreleaseTag=v1.1.0-rc.1`.

### 3.2 Etiket adlandırma kuralı

| Etiket        | Anlamı        | Ne çalışır                                  | Şart                                                    |
| ------------- | ------------- | ------------------------------------------- | ------------------------------------------------------- |
| `vX.Y.Z`      | Sürüm         | imzalı AAB + GitHub Release (CHANGELOG'dan) | `package.json` = `X.Y.Z`; CHANGELOG'da `## [X.Y.Z]` var |
| `vX.Y.Z-rc.N` | Aday / deneme | yalnızca imzalı AAB                         | `package.json` = `X.Y.Z` (çıkacak sürüm); N 1–98, artan |
| başka her şey | —             | hiçbiri (ör. `v1.0.0-beta.1`, `1.0.0`)      | —                                                       |

- Etiket `package.json` ile uyuşmazsa derleme ilk adımda durur ("Etiket ... uyuşmuyor").
- İtilmiş etiket **silinmez, taşınmaz**; hata varsa sıradaki N ile yeni aday çıkarılır.
- Önce `package.json` sürümü çıkacak sürüme yükseltilir, sonra o sürümün adayları (`-rc.1`, `-rc.2`…)
  denenir, en son `vX.Y.Z`.

### 3.3 Aday ya da sürüm çıkarma

1. `main`'de CI yeşil, `git status` temiz, `git pull` yapılmış.
2. `package.json` sürümü doğru (sürümse CHANGELOG bölümü de hazır, § 1).
3. Etiketi oluştur ve it (örnek aday):

   ```powershell
   git tag v1.1.0-rc.1
   git push origin v1.1.0-rc.1
   ```

4. github.com → **Actions** → **Android imzalı AAB** → çalışan iş. Yaklaşık 5 dakika. İki iş
   görünür: "İmzasız AAB derle (sır yok)" ve "İmzala".
5. Bitince sayfanın altında **Artifacts** → `kafa-kafaya-v1.1.0-rc.1-aab` → zip iner, içinde
   imzalı `.aab`. Özet (Summary) bölümünde yükleme sertifikasının SHA-256 parmak izi yazar.
6. AAB Play Console'a yüklenir (Faz 12). Artefakt 30 gün saklanır.

Depo herkese açık olduğu için Actions artefaktlarını GitHub'a giriş yapmış herkes indirebilir. İmzalı
AAB gizli bir şey içermez (imza sertifikası zaten herkese açıktır), ama henüz duyurulmamış sürümü de
içerir; bunu bilerek etiket it.

### 3.4 Güvenlik özeti (herkese açık depo)

- İmza iş akışı yalnızca etiket push'unda çalışır; `pull_request_target` hiçbir iş akışında
  kullanılmaz. Fork'tan gelen PR'lar etiket itemez ve GitHub onlara sır vermez.
- Sırlar `android-release` ortamında, ortam yalnızca `v*` etiketlerine açık (§ 2.3 A).
- Derleme işi (npm paketleri, Gradle eklentileri çalışır) sır görmez. İmzalama ayrı bir işte, yalnızca
  JDK `jarsigner` ile yapılır; anahtar dosyası iş bitince silinir.
- Şifre yalnızca ortam değişkeniyle verilir (`-storepass:env`), komut satırında ve loglarda görünmez;
  GitHub sır değerlerini loglarda `***` ile gizler. İmza iş akışındaki eylemler commit SHA'sına
  sabit, önbellek kullanılmaz.
- Yerelde `./gradlew bundleRelease` imzasız AAB üretir (`-dev` sürüm adıyla); Play'e yüklenmez.

### 3.5 Deneme kaydı

- **`v1.0.0-rc.1`** (2026-11-27/28) — hattın ilk denemesi ✅.
  [Çalışma](https://github.com/emengin/kafa-kafaya/actions/runs/46065193384): 1. deneme imza adımında
  durdu (şifre sır yerine variable olarak eklenmişti, § 2.3 uyarısı); düzeltilip **Re-run failed jobs**
  ile 2. denemede iki iş de yeşil, imza doğrulandı (`jar verified.`), artefakt
  `kafa-kafaya-v1.0.0-rc.1-aab` (3,6 MB, 30 gün). `release.yml` çalışmadı, GitHub Release
  oluşmadı (beklenen). `1.0.0` web sürümü zaten yayınlanmıştı; bu etiket yalnızca hattı denemek
  içindir, Play'e yüklenmez.

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

Sırların kendisi asla depoya, dosyaya ya da sohbete yazılmaz; bu tablo yalnızca nerede olduklarını
söyler.

| Sır                                                    | Nerede                                                                       | Erişim                                                      | Yenileme                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------ |
| Android yükleme anahtarı (`.jks`)                      | parola yöneticisi + çevrimdışı disk; `$HOME\kafakafaya-imza` çalışma kopyası | geliştirici                                                 | yalnızca kayıp/sızmada (§ 2.6) |
| Yükleme anahtarı şifresi                               | parola yöneticisi                                                            | geliştirici                                                 | anahtarla birlikte             |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD` | GitHub → Settings → Environments → `android-release`                         | iş akışı `android-release.yml`, yalnızca `v*` etiketlerinde | anahtar değişince              |

<!-- Sonraki fazlar: sunucu (Nakama), Firebase, ödeme anahtarları. -->
