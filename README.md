# Kafa Kafaya

Tarayıcıda oynanan, 2D yandan görünümlü, 1v1 bir kafa topu oyunu. Büyük kafalı özgün
karakterler, süper şutlar, güçlendiriciler ve gol tekrarı.

**Canlı sürüm:** https://emengin.github.io/kafa-kafaya/

> Durum: **Faz 3 — Yapay zekâ rakip.** Menüden **CPU'ya Karşı** (Kolay / Orta / Zor) ya da
> **2 Oyuncu** maçı baştan sona oynanabiliyor: 90 sn geri sayım, gol + ağır çekim, santra,
> altın gol, duraklatma, maç sonu, güç barı ve süper vuruş. Görseller henüz basit gri şekiller.
> Ayrıntılar ve AI simülasyon sonuçları için [docs/PROGRESS.md](docs/PROGRESS.md).

## Teknoloji

- TypeScript (strict) + Vite + Phaser 3 (yalnızca render, sahne, input, ses)
- Kendi deterministik fizik modülü (`src/physics`, sabit 60 Hz adım)
- Harici görsel/ses dosyası yok: grafikler kodla çizilir, sesler Web Audio ile sentezlenir
- Vitest, ESLint, Prettier, GitHub Actions → GitHub Pages

## Geliştirme

Node.js 20+ gerekir.

```bash
npm install
npm run dev       # geliştirme sunucusu (http://localhost:5173)
npm run build     # tip denetimi + üretim derlemesi (dist/)
npm run preview   # derlenmiş sürümü yerelde sun
npm run lint      # ESLint + Prettier denetimi
npm run format    # Prettier ile biçimlendir
npm test          # Vitest birim testleri
npm run simulate  # AI vs AI headless 100 maç: skor dağılımı ve sıkışma raporu
```

`npm run simulate -- --p1 hard --p2 easy` farklı zorlukları, `--matrix` tüm eşleşmeleri,
`--seed N` tohumu, `--matches N` maç sayısını, `--json dosya.json` JSON çıktısını seçer.

Geliştirme kısayolları (URL parametreleri):

- `?scene=match&debug=1&duration=10` — menüyü atlayıp doğrudan 10 sn'lik 2 oyunculu maça girer
  ve debug katmanını açık başlatır.
- `?cpu=easy|medium|hard` — doğrudan CPU'ya karşı maç; `?cpu1=…` ile P1 de yapay zekâ olur
  (AI vs AI izleme); `?seed=N` yapay zekânın rastgelelik tohumunu sabitler.

## Kontroller

| Eylem   | Oyuncu 1  | Oyuncu 2  |
| ------- | --------- | --------- |
| Hareket | A / D     | ← / →     |
| Zıpla   | W         | ↑         |
| Şut     | Space     | Enter     |
| Süper   | Sol Shift | Sağ Shift |

CPU'ya karşı modda tek oyuncu iki tuş takımından birini (ya da ikisini) kullanabilir.
**Süper:** güç barı (isimlerin altında) dolunca Shift'e bas — bir sonraki şut ya da kafa süper
olur.

**Esc / P:** duraklat (Devam · Yeniden Başlat · Ana Menü) · **F1:** debug katmanı
(collider'lar, hız vektörleri, FPS, fizik adım süresi, maç durumu, AI'ın tahmin ettiği
yörünge). Menülerde ↑/↓ + Enter ya da fare; alt menüden Esc ile geri.

## Klasör yapısı

```
src/
  config/     gameConfig.ts — tüm denge/ayar değerleri (kodda sihirli sayı yok)
  physics/    Phaser'dan bağımsız deterministik fizik ve sabit adımlı döngü
  game/       entities, rules, ai (yapay zekâ rakip) — oyun mantığı
  input/      InputState soyutlaması (klavye, dokunmatik, gamepad, AI)
  scenes/     Phaser sahneleri (Boot → Preload → Menu → …)
  ui/         HUD, menüler, kodla üretilen dokular
  audio/      Web Audio sentezleyici
  i18n/       TR/EN metinler
scripts/      simulate.ts (AI vs AI simülasyonu), run-ts.js (TS betik çalıştırıcı)
docs/         GAME_DESIGN.md, PROGRESS.md
```

## Yayın

`main` dalına her push'ta GitHub Actions lint + test + build çalıştırır ve `dist/`
klasörünü GitHub Pages'e yayınlar. `vite.config.ts` içindeki `base` yolu depo adından
(`GITHUB_REPOSITORY`) otomatik türetilir.

## Lisans

[MIT](LICENSE)
