# İlerleme Günlüğü

## Faz durumu

| Faz | Başlık                 | Durum         |
| --- | ---------------------- | ------------- |
| 0   | Kurulum ve yayın hattı | ✅ Tamamlandı |
| 1   | —                      | ⏭️ Sıradaki   |
| 2–7 | —                      | Bekliyor      |

**Canlı sürüm:** https://emengin.github.io/kafa-kafaya/

---

## Faz 0 — Kurulum ve yayın hattı (2026-11-14)

### Tamamlananlar

- Vite 8 + TypeScript (strict) + Phaser 3.90 projesi; istenen klasör yapısı
  (`src/scenes`, `src/game/{entities,rules,ai}`, `src/physics`, `src/ui`, `src/audio`,
  `src/input`, `src/i18n`, `src/config`).
- **Sahneler:** `Boot → Preload → Menu`.
  - Preload: kodla doku üretimi (`src/ui/textures.ts`, top dokusu) + yükleme çubuğu.
  - Menu: "Kafa Kafaya" başlığı (nefes alma animasyonu), yanıp sönen
    "Başlamak için tıkla", sabit adımlı döngüyle sürülen zıplayan top.
    Tıklama/tuş → kamera flaşı + topa vuruş + "Oyun modları yakında!".
- **Sabit adımlı döngü:** `src/physics/FixedStepLoop.ts` — 60 Hz, accumulator,
  kare başına en fazla 8 adım, 0,25 sn birikim sınırı, kayan nokta toleransı,
  render enterpolasyonu için `alpha`. Phaser'a bağımlı değil.
- **`src/config/gameConfig.ts`:** ekran, döngü, fizik, maç, kontroller, renkler,
  dokular, menü yerleşimi, depolama, dil ayarları.
- **Input soyutlaması:** `src/input/InputState.ts` — `InputState`, `InputSource`,
  `EMPTY_INPUT`, `mergeInputs`.
- **i18n:** TR/EN sözlükleri, `t()`, dil tercihi `localStorage`'da.
- **Güvenli depolama:** `src/game/storage.ts` (erişim hatasında sessizce devam eder).
- **Kalite:** ESLint (typescript-eslint `strictTypeChecked`) + Prettier + Vitest
  (16 test: döngü, input, i18n).
- **Yayın hattı:** `.github/workflows/deploy.yml` — `main`'e push'ta
  `npm ci → lint → test → build → GitHub Pages`. PR'larda yalnızca doğrulama.
- README, GAME_DESIGN.md, PROGRESS.md, MIT LICENSE.

### Tasarım kararları

1. **Depo adı `kafa-kafaya`**, GitHub Pages "GitHub Actions" kaynağıyla.
   `vite.config.ts` `base` yolunu `GITHUB_REPOSITORY`'den türetir (yoksa `kafa-kafaya`);
   geliştirmede `/`.
2. **Sihirli sayı yasağı lint ile zorlanıyor:** `@typescript-eslint/no-magic-numbers`
   `src/` altında (config ve testler hariç) hata verir. İzin verilen sabitler:
   `-1, 0, 1, 2, 0.5` (yarıya bölme, işaret, tam tur `2π` gibi).
3. **Klavye `KeyboardEvent.code` ile eşlenecek** (`KeyA`, `ShiftLeft`…): sol/sağ Shift
   ayrımı yalnızca böyle mümkün ve TR-Q/F düzenlerinde fiziksel konum korunur.
4. **Döngü taşma politikası:** kare başına 8 adımı aşan birikim atılır (oyun bir an
   yavaşlar, ama "yetişme" sarmalına girmez). Determinizm etkilenmez çünkü simülasyon
   yalnızca adım sayısına ve input dizisine bağlıdır, gerçek zamana değil.
5. **Kayan nokta toleransı (`1e-9` sn):** 60 Hz ekranda 16,666… ms karelerde
   0/2 adım titremesini önler (testle doğrulandı).
6. **Phaser tek parça paket** (~1,2 MB, gzip ~320 kB). Vite parça uyarı sınırı
   1600 kB'a çekildi. Sonraki fazlarda gerekirse Phaser'ın özel (küçültülmüş) derlemesi
   değerlendirilecek.
7. **Fontlar:** harici dosya yasağı nedeniyle sistem fontları (`Arial Black` → `Segoe UI`
   → `Arial` → sans-serif).
8. **Varsayılan dil Türkçe.**
9. **CI Node sürümü 24** (yerel geliştirme ortamıyla aynı). Action'lar Node 24 tabanlı
   güncel sürümlerde (checkout/setup-node v5, configure-pages v6, upload-pages-artifact v5,
   deploy-pages v5); Node 20 kullanımdan kalkma uyarısı alınmaz.
10. **Tek `tsconfig.json`** hem `src` hem `vite.config.ts` için (sadelik). Tarayıcı
    koduna `node` tipleri de görünüyor; ileride ayrılabilir.

### Bilinen sorunlar

- `npm audit`: `typescript-eslint` → `minimatch` zincirinde orta seviye bir uyarı.
  Yalnızca geliştirme bağımlılığı; oyun paketine girmez. Üst sürüm yayınlanınca
  güncellenecek.
- Menüde tıklama henüz bir moda geçmiyor (mod seçimi sonraki fazlarda).
- `PHYSICS.gravity` şimdilik yalnızca menüdeki demo topta kullanılıyor; gerçek değerler
  Faz 1'de ayarlanacak.

### Sıradaki faz

**Faz 1** — talimat bekleniyor (muhtemelen deterministik fizik çekirdeği: vektör
matematiği, daire–daire / daire–dikdörtgen / daire–doğru parçası çarpışmaları,
sub-stepping ve saha geometrisi).
