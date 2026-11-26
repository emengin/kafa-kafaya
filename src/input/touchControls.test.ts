import { describe, expect, it } from 'vitest';
import { DISPLAY, STORAGE, TOUCH } from '../config/gameConfig';
import { computeFrame, DESIGN_FRAME } from '../platform/screenFrame';
import { loadTouchPrefs, parseTouchPrefs, saveTouchPrefs, snapScale } from '../save/touchPrefs';
import type { KeyValueStore } from '../save/store';
import { LatencyProbe, percentile } from './latencyProbe';
import {
  autoScale,
  buttonRadius,
  clampToBounds,
  conflictOf,
  DEFAULT_TOUCH_PREFS,
  defaultPlacements,
  displayedPlacements,
  GAME_BUTTONS,
  insideBounds,
  mirrorPlacements,
  placementsValid,
  touchButtons,
  type TouchButton,
  type TouchPrefs,
} from './touchLayout';
import { TouchRouter, type TouchPoint } from './touchRouter';

const EPS = 1e-6;

function byKey(buttons: readonly TouchButton[], key: string): TouchButton {
  const b = buttons.find((x) => x.key === key);
  if (!b) throw new Error(`buton yok: ${key}`);
  return b;
}

function pressed(router: TouchRouter, points: TouchPoint[], buttons: TouchButton[]): string[] {
  return [...router.update(points, buttons)].sort();
}

function gaps(buttons: readonly TouchButton[]): number[] {
  const out: number[] = [];
  for (const [i, a] of buttons.entries()) {
    for (const b of buttons.slice(i + 1)) out.push(Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r);
  }
  return out;
}

describe('Dokunmatik düzen v2 — yerleşim (Faz 2.3)', () => {
  it('varsayılan düzen tasarım değerleriyle aynı, geçerli ve ◀ ▶ arası geniş', () => {
    const buttons = touchButtons({ frame: DESIGN_FRAME });
    for (const id of GAME_BUTTONS) {
      const b = byKey(buttons, id);
      expect({ x: b.x, y: b.y, r: b.r }).toEqual(TOUCH.buttons[id]);
    }
    expect(placementsValid(defaultPlacements())).toBe(true);
    const l = byKey(buttons, 'left');
    const r = byKey(buttons, 'right');
    expect(r.x - l.x - l.r - r.r).toBeGreaterThanOrEqual(TOUCH.moveGapPx - EPS);
  });

  it('dokunma alanı görselden büyük; maç kontrolünde ≥ 72 dp, arayüzde ≥ 48 dp (D1, D3)', () => {
    for (const pxPerDp of [0.8, 1, 1.8, 2, 2.25, 3]) {
      for (const b of touchButtons({ training: true, pxPerDp })) {
        const floorDp = b.group === 'ui' ? TOUCH.hitFloorDp.ui : TOUCH.hitFloorDp.game;
        expect(b.hitR).toBeGreaterThan(b.r);
        expect((b.hitR * 2) / pxPerDp).toBeGreaterThanOrEqual(floorDp - EPS);
      }
    }
  });

  it('en küçük boyutta bile dokunma alanı ≥ 48 dp (D3: küçültülse bile)', () => {
    const placements = { ...defaultPlacements() };
    for (const id of GAME_BUTTONS) placements[id] = { ...placements[id], scale: 0.7 };
    const prefs: TouchPrefs = { ...DEFAULT_TOUCH_PREFS, placements };
    for (const b of touchButtons({ prefs, pxPerDp: 2.25 })) {
      expect((b.hitR * 2) / 2.25).toBeGreaterThanOrEqual(TOUCH.hitFloorDp.ui);
    }
  });

  it('solak modu: hareket sağa, eylemler sola geçer; ◀ yine ▶ solunda; düzen geçerli', () => {
    const prefs: TouchPrefs = { ...DEFAULT_TOUCH_PREFS, leftHanded: true };
    const buttons = touchButtons({ prefs, frame: DESIGN_FRAME });
    const l = byKey(buttons, 'left');
    const r = byKey(buttons, 'right');
    const kick = byKey(buttons, 'kick');
    expect(l.x).toBeGreaterThan(DISPLAY.width / 2);
    expect(l.x).toBeLessThan(r.x);
    expect(kick.x).toBeLessThan(DISPLAY.width / 2);
    expect(placementsValid(displayedPlacements(prefs))).toBe(true);
    // Ayna kendi tersidir.
    expect(mirrorPlacements(mirrorPlacements(defaultPlacements()))).toEqual(defaultPlacements());
  });

  it('yerel 2 oyuncu: her oyuncu kendi yarısında, butonlar çakışmıyor, iki takım kodu ayrı', () => {
    const buttons = touchButtons({ twoPlayer: true, frame: DESIGN_FRAME });
    const p1 = buttons.filter((b) => b.player === 0 && b.group !== 'ui');
    const p2 = buttons.filter((b) => b.player === 1);
    expect(p1).toHaveLength(GAME_BUTTONS.length);
    expect(p2).toHaveLength(GAME_BUTTONS.length);
    for (const b of p1) expect(b.x + b.r).toBeLessThan(DISPLAY.width / 2);
    for (const b of p2) expect(b.x - b.r).toBeGreaterThan(DISPLAY.width / 2);
    for (const g of gaps(buttons)) expect(g).toBeGreaterThanOrEqual(TOUCH.minGapPx - EPS);
    expect(new Set(buttons.map((b) => b.code)).size).toBe(buttons.length);
    expect(byKey(buttons, 'p2.left').x).toBeLessThan(byKey(buttons, 'p2.right').x);
    // 2 oyuncuda ◀ ▶ yarıçapları eşit (ayna yarıçapı kimlikten okur).
    expect(TOUCH.twoPlayer.buttons.left.r).toBe(TOUCH.twoPlayer.buttons.right.r);
    expect(TOUCH.buttons.left.r).toBe(TOUCH.buttons.right.r);
  });
});

describe('Dokunmatik düzen v2 — parmak yönlendirici', () => {
  const buttons = touchButtons({ training: true });
  const L = byKey(buttons, 'left');
  const R = byKey(buttons, 'right');
  const J = byKey(buttons, 'jump');
  const K = byKey(buttons, 'kick');
  const S = byKey(buttons, 'super');
  const P = byKey(buttons, 'pause');

  it('butonun yakınına (görselin dışına) basmak da sayılır — telefon testi isteği', () => {
    const router = new TouchRouter();
    // ◀'nin 40 px solunda ve 40 px altında (eski tolerans 30 px'ti).
    const near = { id: 1, x: L.x - L.r - 40, y: L.y + 40 };
    expect(pressed(router, [near], buttons)).toEqual(['left']);
    const nearKick = { id: 2, x: K.x + K.r * 0.5, y: K.y + K.r + 30 };
    expect(pressed(new TouchRouter(), [nearKick], buttons)).toEqual(['kick']);
    expect(pressed(new TouchRouter(), [{ id: 3, x: 640, y: 360 }], buttons)).toEqual([]);
  });

  it('hareket parmağı kalkana kadar hareket grubunda: nereye kayarsa en yakın yön', () => {
    const router = new TouchRouter();
    expect(pressed(router, [{ id: 7, x: L.x, y: L.y }], buttons)).toEqual(['left']);
    // ◀ ▶ arası boşluk: girdi kopmaz.
    expect(pressed(router, [{ id: 7, x: (L.x + R.x) / 2 - 1, y: L.y }], buttons)).toEqual(['left']);
    expect(pressed(router, [{ id: 7, x: (L.x + R.x) / 2 + 1, y: L.y }], buttons)).toEqual([
      'right',
    ]);
    // Başparmak yukarı ve ekranın ortasına kaydı: hâlâ ▶, Zıpla'ya geçmez.
    expect(pressed(router, [{ id: 7, x: 700, y: 300 }], buttons)).toEqual(['right']);
    expect(pressed(router, [{ id: 7, x: J.x, y: J.y }], buttons)).toEqual(['right']);
    // Parmak kalktı → bırakılır; aynı kimlik yeniden ortaya inerse boş.
    expect(pressed(router, [], buttons)).toEqual([]);
    expect(pressed(router, [{ id: 7, x: 640, y: 360 }], buttons)).toEqual([]);
  });

  it('eylem parmağı alanının biraz dışına kayınca basılı kalır, çok uzaklaşınca bırakır', () => {
    const router = new TouchRouter();
    expect(pressed(router, [{ id: 1, x: K.x, y: K.y }], buttons)).toEqual(['kick']);
    const edge = K.hitR * ((1 + TOUCH.keepRatio) / 2);
    expect(pressed(router, [{ id: 1, x: K.x + edge, y: K.y }], buttons)).toEqual(['kick']);
    // Şut'tan Süper'e kaydı → Süper.
    expect(pressed(router, [{ id: 1, x: S.x, y: S.y }], buttons)).toEqual(['super']);
    expect(pressed(router, [{ id: 1, x: 640, y: 200 }], buttons)).toEqual([]);
    // Geri dönerse yine basar (parmak eylem grubunda).
    expect(pressed(router, [{ id: 1, x: J.x, y: J.y }], buttons)).toEqual(['jump']);
  });

  it('Zıpla ile Şut arasına basmak ikisini birden basar (tek parmakla zıpla + vur)', () => {
    const d = Math.hypot(K.x - J.x, K.y - J.y);
    const gap = d - J.r - K.r;
    const t = (J.r + gap / 2) / d;
    const mid = { id: 4, x: J.x + (K.x - J.x) * t, y: J.y + (K.y - J.y) * t };
    expect(pressed(new TouchRouter(), [mid], buttons)).toEqual(['jump', 'kick']);
    expect(pressed(new TouchRouter(), [{ id: 5, x: J.x, y: J.y }], buttons)).toEqual(['jump']);
  });

  it('çoklu dokunuş: iki ve üç parmak aynı anda kayıpsız (D7)', () => {
    expect(
      pressed(
        new TouchRouter(),
        [
          { id: 1, x: R.x, y: R.y },
          { id: 2, x: K.x, y: K.y },
        ],
        buttons,
      ),
    ).toEqual(['kick', 'right']);
    expect(
      pressed(
        new TouchRouter(),
        [
          { id: 1, x: L.x, y: L.y },
          { id: 2, x: J.x, y: J.y },
          { id: 3, x: S.x, y: S.y },
        ],
        buttons,
      ),
    ).toEqual(['jump', 'left', 'super']);
  });

  it('boşa inen parmak kayarak bir alana girince bağlanır', () => {
    const router = new TouchRouter();
    expect(pressed(router, [{ id: 9, x: 640, y: 600 }], buttons)).toEqual([]);
    expect(pressed(router, [{ id: 9, x: R.x, y: R.y }], buttons)).toEqual(['right']);
  });

  it('duraklat yalnızca kendi alanında; hareket parmağı üstünden geçse de basmaz', () => {
    const router = new TouchRouter();
    expect(pressed(router, [{ id: 1, x: P.x, y: P.y }], buttons)).toEqual(['pause']);
    expect(pressed(router, [{ id: 1, x: P.x + P.hitR + 1, y: P.y }], buttons)).toEqual([]);
    const move = new TouchRouter();
    move.update([{ id: 2, x: L.x, y: L.y }], buttons);
    expect(pressed(move, [{ id: 2, x: P.x, y: P.y }], buttons)).toEqual(['left']);
  });

  it('yerel 2 oyuncu: her parmak kendi oyuncusunun grubunda kalır', () => {
    const two = touchButtons({ twoPlayer: true });
    const p1L = byKey(two, 'left');
    const p2K = byKey(two, 'p2.kick');
    const router = new TouchRouter();
    const out = pressed(
      router,
      [
        { id: 1, x: p1L.x, y: p1L.y },
        { id: 2, x: p2K.x, y: p2K.y },
      ],
      two,
    );
    expect(out).toEqual(['left', 'p2.kick']);
    // P1'in hareket parmağı P2'nin yarısına kaydı: P1 ▶ olur, P2'ye geçmez.
    expect(
      pressed(
        router,
        [
          { id: 1, x: 1100, y: p1L.y },
          { id: 2, x: p2K.x, y: p2K.y },
        ],
        two,
      ),
    ).toEqual(['p2.kick', 'right']);
  });

  it('reset tüm parmakları unutur', () => {
    const router = new TouchRouter();
    router.update([{ id: 1, x: L.x, y: L.y }], buttons);
    router.reset();
    expect(pressed(router, [{ id: 1, x: 640, y: 360 }], buttons)).toEqual([]);
  });
});

describe('Hareket bölgesi ve küçük ekranda büyütme (telefon testi geri bildirimi)', () => {
  const buttons = touchButtons({ training: true });
  const L = byKey(buttons, 'left');
  const R = byKey(buttons, 'right');
  const J = byKey(buttons, 'jump');
  const zone = L.zone;
  if (!zone) throw new Error('hareket bölgesi yok');

  it('◀ solu ve altı: ekran kenarına kadar sol', () => {
    expect(zone.x).toBe(DESIGN_FRAME.view.x);
    expect(zone.y + zone.height).toBe(DISPLAY.height);
    for (const pt of [
      { x: 1, y: L.y - L.r - 20 },
      { x: 2, y: DISPLAY.height - 1 },
      { x: L.x, y: DISPLAY.height - 1 },
    ]) {
      expect(pressed(new TouchRouter(), [{ id: 1, ...pt }], buttons)).toEqual(['left']);
    }
  });

  it('▶ ötesi ve ◀ ▶ üstü biraz daha geniş, Zıplaya taşmıyor', () => {
    const beyond = { id: 1, x: R.x + R.hitR + 40, y: R.y };
    expect(Math.hypot(beyond.x - R.x, beyond.y - R.y)).toBeGreaterThan(R.hitR);
    expect(pressed(new TouchRouter(), [beyond], buttons)).toEqual(['right']);
    const above = { id: 2, x: L.x, y: L.y - L.hitR - 30 };
    expect(pressed(new TouchRouter(), [above], buttons)).toEqual(['left']);
    expect(zone.x + zone.width).toBeLessThan(J.x - J.r);
    const outside = { id: 3, x: zone.x + zone.width + 5, y: R.y };
    expect(pressed(new TouchRouter(), [outside], buttons)).toEqual([]);
    expect(pressed(new TouchRouter(), [{ id: 4, x: L.x, y: zone.y - 5 }], buttons)).toEqual([]);
  });

  it('geniş ve çentikli ekranda bölge çentik tarafındaki ekran kenarına uzanır; solakta sağa', () => {
    const f = computeFrame(
      { width: 1600, height: 720 },
      { left: 64, top: 24, right: 24, bottom: 24 },
    );
    const wide = touchButtons({ frame: f });
    const lz = byKey(wide, 'left').zone;
    expect(lz?.x).toBe(f.view.x);
    const lefty = touchButtons({ frame: f, prefs: { ...DEFAULT_TOUCH_PREFS, leftHanded: true } });
    const rz = byKey(lefty, 'right').zone;
    expect(rz ? rz.x + rz.width : 0).toBe(f.view.x + f.view.width);
    const edge = { id: 1, x: f.view.x + f.view.width - 1, y: DISPLAY.height - 2 };
    expect(pressed(new TouchRouter(), [edge], lefty)).toEqual(['right']);
  });

  it('yerel 2 oyuncuda bölge kendi eylem butonlarına olan boşluğun yarısında biter', () => {
    const two = touchButtons({ twoPlayer: true });
    const z = byKey(two, 'right').zone;
    const r = byKey(two, 'right');
    const j = byKey(two, 'jump');
    expect(z ? z.x + z.width : 0).toBeLessThanOrEqual((r.x + r.r + j.x - j.r) / 2 + EPS);
    const z2 = byKey(two, 'p2.left').zone;
    expect(z2 ? z2.x + z2.width : 0).toBe(DISPLAY.width);
  });

  it('küçük ekranda (iPhone Safari) varsayılan düzen büyür; ◀ ▶ en az 72 dp', () => {
    expect(autoScale(1.75)).toBe(1);
    expect(autoScale(2)).toBe(1);
    expect(autoScale(2.03)).toBe(1);
    expect(autoScale(2.12)).toBe(1.1);
    expect(autoScale(2.6)).toBe(1.3);
    expect(autoScale(5)).toBe(TOUCH.maxAutoScale);
    for (const pxPerDp of [2, 2.2, 2.4, 2.6, 2.8]) {
      const l = byKey(touchButtons({ pxPerDp }), 'left');
      expect((l.r * 2) / pxPerDp).toBeGreaterThanOrEqual(TOUCH.minVisualDp - EPS);
    }
    for (let k = 1; k <= TOUCH.maxAutoScale + EPS; k += 0.1) {
      expect(placementsValid(defaultPlacements(Math.round(k * 10) / 10))).toBe(true);
    }
    // Oyuncunun kendi düzeni büyütülmez.
    const custom: TouchPrefs = { ...DEFAULT_TOUCH_PREFS, custom: true };
    expect(byKey(touchButtons({ prefs: custom, pxPerDp: 2.6 }), 'left').r).toBe(
      TOUCH.buttons.left.r,
    );
  });
});

describe('Kontrol düzenleyicisi kuralları', () => {
  it('sınır: skor tabelası bandının ve ekranın dışına çıkılamaz', () => {
    const r = buttonRadius('kick', 1);
    expect(insideBounds(640, 400, r)).toBe(true);
    expect(insideBounds(640, TOUCH.editor.minTopPx + r - 1, r)).toBe(false);
    expect(insideBounds(r - 1, 400, r)).toBe(false);
    expect(clampToBounds(-50, 9999, r)).toEqual({ x: r, y: DISPLAY.height - r });
    expect(clampToBounds(640, 0, r).y).toBe(TOUCH.editor.minTopPx + r);
  });

  it("çakışma: başka butona minGapPx'ten yakın olan reddedilir", () => {
    const p = { ...defaultPlacements() };
    expect(conflictOf(p, 'kick')).toBeNull();
    p.kick = { ...p.kick, x: p.jump.x + 10, y: p.jump.y };
    expect(conflictOf(p, 'kick')).toBe('jump');
    expect(placementsValid(p)).toBe(false);
  });
});

function memoryStore(init: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(init));
  return { get: (k) => data.get(k) ?? null, set: (k, v) => data.set(k, v) };
}

describe('Kontrol düzeni kaydı', () => {
  it('kayıt yok / bozuk → varsayılan', () => {
    expect(parseTouchPrefs(undefined)).toEqual(DEFAULT_TOUCH_PREFS);
    expect(parseTouchPrefs('çöp')).toEqual(DEFAULT_TOUCH_PREFS);
    const store = memoryStore({ [STORAGE.keys.touchLayout]: '{bozuk' });
    expect(loadTouchPrefs(store)).toEqual(DEFAULT_TOUCH_PREFS);
  });

  it('geçerli düzen korunur; kaydet → yükle aynı düzeni verir', () => {
    const placements = { ...defaultPlacements() };
    placements.left = { x: 140, y: 590, scale: 1.2 };
    const prefs: TouchPrefs = { placements, custom: true, opacity: 0.6, leftHanded: true };
    expect(placementsValid(placements)).toBe(true);
    const store = memoryStore();
    saveTouchPrefs(store, prefs);
    expect(loadTouchPrefs(store)).toEqual(prefs);
  });

  it('alan alan doğrulama: geçersiz opaklık, sınır dışı buton, aralık dışı boyut', () => {
    const d = defaultPlacements();
    const p = parseTouchPrefs({
      opacity: 0.33,
      leftHanded: 'evet',
      placements: {
        left: { x: -500, y: 600, scale: 1 },
        kick: { x: d.kick.x, y: d.kick.y, scale: 0.71 },
        jump: { x: Number.NaN, y: 1, scale: 1 },
      },
    });
    expect(p.opacity).toBe(DEFAULT_TOUCH_PREFS.opacity);
    expect(p.leftHanded).toBe(false);
    expect(p.placements.left).toEqual(d.left);
    expect(p.placements.jump).toEqual(d.jump);
    expect(p.placements.kick.scale).toBe(0.7);
  });

  it('çakışan düzen bütünüyle varsayılana döner (oynanamayan düzen yüklenmez)', () => {
    const d = defaultPlacements();
    const p = parseTouchPrefs({
      placements: { ...d, kick: { x: d.jump.x + 4, y: d.jump.y, scale: 1 } },
    });
    expect(p.placements).toEqual(d);
  });

  it('düzenlenmemiş düzen konum saklamaz; eski kayıttaki konumlar oyuncunun sayılır', () => {
    const store = memoryStore();
    saveTouchPrefs(store, { ...DEFAULT_TOUCH_PREFS, opacity: 0.45 });
    const raw = JSON.parse(store.get(STORAGE.keys.touchLayout) ?? '{}') as Record<string, unknown>;
    expect(raw.placements).toBeUndefined();
    expect(loadTouchPrefs(store)).toEqual({ ...DEFAULT_TOUCH_PREFS, opacity: 0.45 });
    const old = parseTouchPrefs({
      placements: defaultPlacements(),
      opacity: 0.3,
      leftHanded: false,
    });
    expect(old.custom).toBe(true);
  });

  it('boyut adıma yuvarlanır ve aralığa kırpılır', () => {
    expect(snapScale(1.04)).toBe(1);
    expect(snapScale(1.26)).toBe(1.3);
    expect(snapScale(0.1)).toBe(TOUCH.editor.minScale);
    expect(snapScale(9)).toBe(TOUCH.editor.maxScale);
  });
});

describe('Giriş gecikmesi ölçer', () => {
  it('basış → adım → kare tek örnek üretir; aralıklar doğru', () => {
    const p = new LatencyProbe(10);
    p.press(100, 104);
    p.frame(105); // adım yok: örnek yok
    p.step(110);
    p.press(111, 112); // aynı basış beklerken ikinci basış sayılmaz
    p.frame(118);
    const r = p.report();
    expect(r.toFrame).toEqual({ count: 1, median: 18, p95: 18 });
    expect(r.wait.median).toBe(6);
    expect(r.dispatch.median).toBe(4);
  });

  it('simülasyon akmıyorken yapılan basış (duraklatma) bayatlar ve atılır', () => {
    const p = new LatencyProbe(10);
    p.press(0, 1);
    p.frame(1 + TOUCH.latency.staleMs + 1);
    p.step(2000);
    p.frame(2001);
    expect(p.report().toFrame.count).toBe(0);
  });

  it('olay zaman damgası geçersizse işleyici zamanından ölçülür', () => {
    const p = new LatencyProbe(10);
    p.press(5000, 100); // gelecekte: farklı saat
    p.step(105);
    p.frame(110);
    expect(p.report().dispatch.median).toBe(0);
    expect(p.report().toFrame.median).toBe(10);
  });

  it('halka tampon son N örneği tutar; yüzdelik en yakın sıra', () => {
    const p = new LatencyProbe(3);
    for (const v of [10, 20, 30, 40]) {
      p.press(0, 0);
      p.step(0);
      p.frame(v);
    }
    expect(p.report().toFrame.count).toBe(3);
    expect(p.report().toFrame.median).toBe(30);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.95)).toBe(10);
    expect(percentile([], 0.5)).toBe(0);
  });
});
