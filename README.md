# Kafa Kafaya

Tarayıcıda oynanan, 2D yandan görünümlü, 1v1 bir kafa topu oyunu. Büyük kafalı özgün
karakterler, süper şutlar, güçlendiriciler ve gol tekrarı.

**Canlı sürüm:** https://emengin.github.io/kafa-kafaya/

> Durum: **Faz 5 — Görsel kalite ve ses.** Menüden **CPU'ya Karşı** (Kolay / Orta / Zor) ya da
> **2 Oyuncu** → **karakter seçimi** (10 özgün karakter, her birinin kendi süper şutu) → maç: 90
> sn, gol + ağır çekim, santra, altın gol, duraklatma, maç sonu, güç barı, 10 süper şut tipi ve
> süzülen güçlendirici balonları. Kodla çizilmiş karakterler (canlı yüz ifadeleri, göz kırpma, topu
> izleyen gözler), animasyonlu stadyum ve kalabalık, parçacık efektleri, hit-stop/sarsıntı/zoom,
> Web Audio ile sentezlenen efektler, kalabalık ve prosedürel müzik (Ana / Efekt / Müzik ses
> ayarları). Ayrıntılar, ölçümler ve denge tablosu için [docs/PROGRESS.md](docs/PROGRESS.md).

## Teknoloji

- TypeScript (strict) + Vite + Phaser 3 (yalnızca render, sahne, input, ses)
- Kendi deterministik fizik modülü (`src/physics`, sabit 60 Hz adım)
- Harici görsel/ses dosyası yok: grafikler kodla (Canvas 2D) dokuya çizilir, sesler Web Audio
  ile sentezlenir (efektler, kalabalık, prosedürel müzik)
- Nesne havuzlu parçacıklar, uyarlamalı görsel kalite (düşük güçlü cihazda 60 FPS hedefi)
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
npm run simulate  # AI vs AI headless 100 maç: skor dağılımı, süperler, sıkışma raporu
```

`npm run simulate -- --p1 hard --p2 easy` farklı zorlukları, `--matrix` tüm zorluk eşleşmelerini,
`--c1 kor --c2 kaya` karakterleri, `--characters` 45 karakter eşleşmesinin iki tarafta da
oynandığı denge taramasını (`--jobs N` ile paralel, `--difficulty` ile seviye), `--seed N`
tohumu, `--matches N` maç sayısını, `--json dosya.json` JSON çıktısını seçer. Örnek:
`npm run simulate -- --characters --matches 40 --jobs 10`.

Geliştirme kısayolları (URL parametreleri):

- `?scene=match&debug=1&duration=10` — menüyü atlayıp doğrudan 10 sn'lik 2 oyunculu maça girer
  ve debug katmanını açık başlatır.
- `?cpu=easy|medium|hard` — doğrudan CPU'ya karşı maç; `?cpu1=…` ile P1 de yapay zekâ olur
  (AI vs AI izleme); `?seed=N` yapay zekânın ve güçlendiricilerin tohumunu sabitler.
- `?c1=kor&c2=kaya` — karakterler (seçim ekranını atlayan kısayollarla birlikte).
  Karakter kimlikleri: `kor ayaz simsek sis kaya bora yay demir pamuk toprak`.
- `?quality=low|medium|high` — görsel kaliteyi sabitler (varsayılan: uyarlamalı; kare süresi uzun
  süre bütçeyi aşarsa efektler azaltılır).
- `?debug=1` iken `window.__KAFA_GAME__` (oyun) ve `window.__KAFA_AUDIO__` (ses sistemi) tarayıcı
  testleri için açılır.

## Kontroller

| Eylem   | Oyuncu 1  | Oyuncu 2  |
| ------- | --------- | --------- |
| Hareket | A / D     | ← / →     |
| Zıpla   | W         | ↑         |
| Şut     | Space     | Enter     |
| Süper   | Sol Shift | Sağ Shift |

CPU'ya karşı modda tek oyuncu iki tuş takımından birini (ya da ikisini) kullanabilir.
**Süper:** güç barı (isimlerin altında) dolunca Shift'e bas — bir sonraki şut ya da kafa
karakterin süper şutu olur (Ateş Topu, Buz, Zikzak, Işınlanma, Dev Top, Kasırga, Gökkuşağı,
Mıknatıs, Serap, Sarsıntı). Süper topa **şut ya da kafayla aktif vurmak** her zaman temiz bir
karşılıktır. **Güçlendiriciler:** 12–18 sn'de bir sahanın üst yarısında balon belirir; topla
patlatınca topa son dokunan kazanır (Büyük Kafa, Rakibi Küçült, Hız, Rakip Kalesini Büyüt,
Rakibi Dondur, Çift Zıplama). Etkin olanlar skor çubuğunun altında ikon + geri sayım halkasıyla
görünür.

**Karakter seçimi:** P1 A/D/W/S + Space, P2 oklar + Enter (aynı anda); CPU'ya karşı ok
tuşları ya da A/D/W/S + Enter/Space; fare de çalışır; Esc hazırı geri alır / ana menüye döner.

**Esc / P:** duraklat (Devam · Ses Ayarları · Yeniden Başlat · Ana Menü) · **F1:** debug katmanı
(collider'lar, hız vektörleri, FPS, kare süresi, görsel kalite, parçacık sayısı, fizik adım süresi,
maç durumu, AI'ın tahmin ettiği yörünge). Menülerde ↑/↓ + Enter ya da fare; alt menüden Esc ile
geri.

**Ses:** ana menüdeki ya da duraklatma menüsündeki **Ses Ayarları**'ndan Ana ses / Efektler / Müzik
(←/→ ile %10 adım; Enter ya da tıklama ile artır). Ayarlar kaydedilir. Tarayıcılar sesi ilk
etkileşime kadar başlatmaz: ilk tuş ya da tıklamayla ses ve müzik açılır.

## Klasör yapısı

```
src/
  config/     gameConfig.ts — tüm denge/ayar değerleri (kodda sihirli sayı yok)
  physics/    Phaser'dan bağımsız deterministik fizik ve sabit adımlı döngü
  game/       entities, rules, ai, characters, superEffects, powerups — oyun mantığı
  input/      InputState soyutlaması (klavye, dokunmatik, gamepad, AI)
  scenes/     Phaser sahneleri (Boot → Preload → Menu → Select → Match)
  ui/         maç çizimi (stadyum, karakter düzeneği, top, ağ, süper efektleri, parçacıklar), HUD, menüler
  art/        kodla üretilen dokular: karakter görünüşleri ve yüz, stadyum, efektler, arayüz panelleri
  fx/         saf görsel mantık: parçacık havuzu, ağ dalgası, squash & stretch, yüz ifadeleri,
              hit-stop, sarsıntı, kamera zoom'u, uyarlamalı kalite
  audio/      Web Audio: motor ve veri yolları, efektler, kalabalık, prosedürel müzik, ses ayarları
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
