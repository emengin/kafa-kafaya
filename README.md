# Kafa Kafaya

Tarayıcıda oynanan, 2D yandan görünümlü, 1v1 bir kafa topu oyunu. Büyük kafalı özgün
karakterler, süper şutlar, güçlendiriciler ve gol tekrarı.

**Canlı sürüm:** https://emengin.github.io/kafa-kafaya/

> Durum: **Faz 2 — Maç kuralları.** Menüden iki kişilik maç baştan sona oynanabiliyor:
> 90 sn geri sayım, gol + ağır çekim, düdüklü santra, altın gol uzatması, duraklatma ve maç
> sonu ekranı. Görseller henüz basit gri şekiller. Ayrıntılar için
> [docs/PROGRESS.md](docs/PROGRESS.md).

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
```

Geliştirme kısayolu: `http://localhost:5173/?scene=match&debug=1&duration=10` menüyü
atlayıp doğrudan 10 sn'lik maça girer (altın golü/maç sonunu hızlı denemek için) ve debug
katmanını açık başlatır.

## Kontroller

| Eylem   | Oyuncu 1  | Oyuncu 2  |
| ------- | --------- | --------- |
| Hareket | A / D     | ← / →     |
| Zıpla   | W         | ↑         |
| Şut     | Space     | Enter     |
| Süper   | Sol Shift | Sağ Shift |

**Esc / P:** duraklat (Devam · Yeniden Başlat · Ana Menü) · **F1:** debug katmanı
(collider'lar, hız vektörleri, FPS, fizik adım süresi, maç durumu). Menülerde ↑/↓ + Enter
ya da fare.

## Klasör yapısı

```
src/
  config/     gameConfig.ts — tüm denge/ayar değerleri (kodda sihirli sayı yok)
  physics/    Phaser'dan bağımsız deterministik fizik ve sabit adımlı döngü
  game/       entities, rules, ai — oyun mantığı
  input/      InputState soyutlaması (klavye, dokunmatik, gamepad, AI)
  scenes/     Phaser sahneleri (Boot → Preload → Menu → …)
  ui/         HUD, menüler, kodla üretilen dokular
  audio/      Web Audio sentezleyici
  i18n/       TR/EN metinler
docs/         GAME_DESIGN.md, PROGRESS.md
```

## Yayın

`main` dalına her push'ta GitHub Actions lint + test + build çalıştırır ve `dist/`
klasörünü GitHub Pages'e yayınlar. `vite.config.ts` içindeki `base` yolu depo adından
(`GITHUB_REPOSITORY`) otomatik türetilir.

## Lisans

[MIT](LICENSE)
