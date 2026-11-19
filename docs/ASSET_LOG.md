# Varlık Kaydı (Asset Log)

> **Durum:** iskelet (Faz 0.3, 2026-11-20). Henüz harici varlık dosyası yok.
>
> Kural (ROADMAP_MOBILE.md § Varlık kuralları): oyuna giren her görsel, ses, müzik ve font burada
> kayıtlıdır. Kaydı olmayan dosya derlemeye giremez: Faz 3.1'deki doğrulama script'i asset
> manifestindeki her dosyayı bu tabloda arar, bulamazsa ya da ticari kullanım "Evet" değilse CI
> başarısız olur.

## Biçim kuralları (doğrulama script'i bunlara dayanır)

1. Bir satır = bir dosya. **Dosya** sütunu depo köküne göre yol, ters tırnak içinde
   (`assets/characters/kor/head.png`). Aynı yol iki kez geçmez.
2. **Ticari kullanım** sütunu yalnızca `Evet` ya da `Hayır` olur. `Hayır` olan dosya derlemeye giremez.
3. **Tarih** `YYYY-AA-GG`. **Lisans** kısa ad (`CC0`, `Ticari — <araç> aboneliği`, `OFL-1.1`…);
   lisans belgesinin ya da abonelik faturasının saklandığı yer **Kanıt** sütununa yazılır.
4. **Kaynak:** `Özgün` (elle çizildi/kaydedildi), `YZ + elle yeniden çizim` (görsel üretim hattı),
   `Kütüphane: <ad>` ya da `TTS: <araç>`.
5. Dosya değişirse satır güncellenir, **Değişiklikler** sütununa kısa not eklenir; silinen dosyanın
   satırı silinir (geçmiş git'te kalır).
6. Kodla üretilen placeholder'lar (Canvas 2D dokular, Web Audio sentezi) dosya olmadığı için burada
   yer almaz; asset manifestinde `placeholder` olarak işaretlenir.

## Kayıtlar

| Dosya | Tür | Kaynak | Araç | Lisans | Ticari kullanım | Kanıt | Tarih | Değişiklikler |
| ----- | --- | ------ | ---- | ------ | --------------- | ----- | ----- | ------------- |

<!-- Örnek satır (tabloya kopyalayıp doldur):
| `assets/characters/kor/head.png` | Görsel | YZ + elle yeniden çizim | <görsel aracı> → Inkscape | Ticari — <araç> aboneliği | Evet | lisanslar/<araç>-2026.pdf | 2026-12-01 | Konsept v3'ten yeniden çizildi, palete indirildi |
-->

## Mevcut durum — web sürümü v1.0.0

Tüm görseller kodla çiziliyor (`src/art`), tüm sesler Web Audio ile sentezleniyor (`src/audio`),
fontlar sistem fontları (pakete gömülü font yok). PWA simgeleri derlemede kodla üretiliyor
(`scripts/pwa`). `docs/screenshots` oyunun kendi ekran görüntüleri; derlemeye girmez.

## Araç ve abonelik kaydı

Ticari kullanım izni veren araçlar (Faz 0.1): araç, plan, ticari kullanım şartının bağlantısı ya da
belgesi, abonelik başlangıç ve bitiş tarihleri. Aboneliği biten aracın o tarihten önce ürettiği
varlıkların lisans durumu bu tabloya bakılarak kontrol edilir.

| Araç | Plan | Ticari kullanım şartı | Başlangıç | Bitiş | Belge |
| ---- | ---- | --------------------- | --------- | ----- | ----- |
