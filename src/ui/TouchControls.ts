import Phaser from 'phaser';
import { TOUCH, UNITS } from '../config/gameConfig';
import { latencyProbe } from '../input/latencyProbe';
import { touchButtons, type PlayerIndex, type TouchButton } from '../input/touchLayout';
import { TouchRouter, type TouchPoint } from '../input/touchRouter';
import { releaseVirtual, setVirtual } from '../input/virtualKeys';
import { tapHaptic } from '../platform/haptics';
import { getTouchPrefs } from '../save/touchPrefs';
import { screenLayout, type ScreenLayout } from './ScreenLayout';
import { ringTexture, touchButtonTexture, touchLabel } from './touchButtonArt';

interface ButtonView {
  /** Şimdiki ekran çerçevesindeki konum ve dokunma alanı (çerçeve değişince yenilenir). */
  def: TouchButton;
  readonly img: Phaser.GameObjects.Image;
  readonly label: Phaser.GameObjects.Text;
  /** Basınca yayılan halka. */
  readonly ring: Phaser.GameObjects.Image;
  /** Halkanın başlangıcından geçen süre (ms); süreyi aşınca gizli. */
  ringMs: number;
}

export interface TouchControlsOptions {
  /** Antrenman butonları (topu sıfırla, barı doldur). */
  readonly training: boolean;
  /** Yerel 2 oyuncu: ekranın her yarısı bir oyuncunun (Faz 2.3 prototipi). */
  readonly twoPlayer: boolean;
}

/**
 * Dokunmatik kontroller (Faz 6; v2 Faz 2.3): yarı saydam daire butonlar (sol: ◀ ▶; sağ: Zıpla,
 * Şut, Süper; üst sol: duraklat, antrenmanda topu sıfırla ve barı doldur). Konum, boyut, opaklık
 * ve solak modu oyuncunun düzeninden (Ayarlar → Kontroller → Dokunmatik düzen).
 *
 * Girdi tuvalin ham dokunma olaylarından okunur; her olayda tüm etkin parmaklar `TouchRouter`'a
 * verilir (geniş dokunma alanı, parmağın grubunda kalması, Zıpla+Şut birlikte, çoklu dokunuş).
 * Basılı butonlar sanal tuş olarak yollanır; oyuncu girdisi klavyeyle aynı yoldan okunur.
 *
 * Basma hissi (QUALITY_BAR A4): basılı görünüm olay anında ayarlanır (bir sonraki karede
 * görünür), yayılan halka ve hafif titreşim. Yeni maç butonu basışları giriş gecikmesi ölçerine
 * yazılır.
 *
 * Yerleşim (Faz 2.2): butonlar ekranın kenarlarına sabitli ve güvenli alanın içinde; ekran
 * oranı, boyutu ya da çentiğin tarafı değişince yeniden yerleşir.
 */
export class TouchControls {
  private readonly views: ButtonView[];
  private readonly pressed = new Set<string>();
  private readonly router = new TouchRouter();
  private readonly superReady: [boolean, boolean] = [false, false];
  private readonly opacity: number;
  private enabled = true;
  private readonly canvas: HTMLCanvasElement;
  private readonly layout: ScreenLayout;

  constructor(
    private readonly scene: Phaser.Scene,
    opts: TouchControlsOptions,
  ) {
    this.canvas = scene.game.canvas;
    this.layout = screenLayout(scene);
    const prefs = getTouchPrefs();
    this.opacity = prefs.opacity;
    const build = (): TouchButton[] =>
      touchButtons({
        training: opts.training,
        twoPlayer: opts.twoPlayer,
        prefs,
        frame: this.layout.frame,
        pxPerDp: this.layout.pxPerDp,
      });
    this.views = build().map((def) => this.createButton(def));
    this.layout.onChange(() => {
      const defs = build();
      this.views.forEach((v, i) => {
        v.def = defs[i] ?? v.def;
        v.img.setPosition(v.def.x, v.def.y);
        v.label.setPosition(v.def.x, v.def.y);
        v.ring.setPosition(v.def.x, v.def.y);
      });
    });
    for (const type of TOUCH_EVENTS)
      this.canvas.addEventListener(type, this.onTouch, { passive: false });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroy();
    });
    this.refresh();
  }

  /** Duraklatma/maç sonu kaplaması açıkken butonlar gizlenir ve bırakılır. */
  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) this.releaseAll();
    this.refresh();
  }

  /** Süper barı dolu: o oyuncunun Süper butonu altın renkte nabız atar. */
  setSuperReady(player: PlayerIndex, ready: boolean): void {
    if (this.superReady[player] === ready) return;
    this.superReady[player] = ready;
    this.refresh();
  }

  /** Her kare: basış halkaları ve süper nabzı. */
  update(time: number, deltaMs: number): void {
    if (!this.enabled) return;
    const ring = TOUCH.ring;
    for (const v of this.views) {
      const down = this.pressed.has(v.def.key);
      if (v.ringMs < ring.durationMs) {
        v.ringMs += deltaMs;
        const p = Math.min(1, v.ringMs / ring.durationMs);
        v.ring
          .setVisible(p < 1)
          .setScale(ring.fromScale + (ring.toScale - ring.fromScale) * p)
          .setAlpha(ring.alpha * (1 - p));
      }
      if (v.def.id === 'super' && this.superReady[v.def.player]) {
        const pulse = 1 + SUPER_PULSE * Math.sin(time * SUPER_PULSE_RAD_PER_MS);
        v.img.setScale((down ? PRESS_SCALE : 1) * pulse);
      }
    }
  }

  destroy(): void {
    for (const type of TOUCH_EVENTS) this.canvas.removeEventListener(type, this.onTouch);
    this.releaseAll();
  }

  private releaseAll(): void {
    for (const v of this.views) releaseVirtual(v.def.code);
    this.pressed.clear();
    this.router.reset();
  }

  private readonly onTouch = (event: Event): void => {
    const e = event as TouchEvent;
    if (!this.enabled) return;
    if (e.cancelable) e.preventDefault();
    const scale = this.scene.scale;
    const points: TouchPoint[] = [];
    for (const touch of Array.from(e.touches)) {
      const p = this.layout.toWorld(scale.transformX(touch.pageX), scale.transformY(touch.pageY));
      points.push({ id: touch.identifier, x: p.x, y: p.y });
    }
    const now = this.router.update(
      points,
      this.views.map((v) => v.def),
    );
    let changed = false;
    let pressedAny = false;
    let pressedGame = false;
    for (const v of this.views) {
      const down = now.has(v.def.key);
      if (down === this.pressed.has(v.def.key)) continue;
      changed = true;
      if (down) {
        this.pressed.add(v.def.key);
        v.ringMs = 0;
        pressedAny = true;
        if (v.def.group !== 'ui') pressedGame = true;
      } else {
        this.pressed.delete(v.def.key);
      }
      setVirtual(v.def.code, down);
    }
    if (pressedGame) latencyProbe.press(e.timeStamp, performance.now());
    if (pressedAny) tapHaptic();
    if (changed) this.refresh();
  };

  private refresh(): void {
    const base = this.opacity;
    for (const v of this.views) {
      const down = this.pressed.has(v.def.key);
      const gold = down || (v.def.id === 'super' && this.superReady[v.def.player]);
      v.img
        .setVisible(this.enabled)
        .setAlpha(down ? Math.min(1, base + TOUCH.pressedAlphaBoost) : base)
        .setScale(down ? PRESS_SCALE : 1)
        .setTint(gold ? TOUCH.pressedColor : TOUCH.fillColor);
      v.label.setVisible(this.enabled).setAlpha(down ? 1 : Math.min(1, base + LABEL_ALPHA_BOOST));
      if (!this.enabled) v.ring.setVisible(false);
    }
  }

  private createButton(def: TouchButton): ButtonView {
    const s = this.scene;
    const img = s.add
      .image(def.x, def.y, touchButtonTexture(s, def.id, def.r))
      .setDepth(TOUCH.depth);
    const ring = s.add
      .image(def.x, def.y, ringTexture(s, def.r, TOUCH.ring.lineWidthPx))
      .setDepth(TOUCH.depth)
      .setTint(TOUCH.pressedColor)
      .setVisible(false);
    const label = touchLabel(s, def.id, def.x, def.y, def.r / TOUCH.buttons[def.id].r).setDepth(
      TOUCH.depth + 1,
    );
    return { def, img, label, ring, ringMs: TOUCH.ring.durationMs };
  }
}

const TOUCH_EVENTS = ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const;
const PRESS_SCALE = 0.93;
/** Yazının opaklığı = buton opaklığı + bu değer (varsayılan 0,3 → 0,85). */
const LABEL_ALPHA_BOOST = 0.55;
const SUPER_PULSE = 0.06;
const SUPER_PULSE_HZ = 2.2;
/** Nabız, ms başına radyan. */
const SUPER_PULSE_RAD_PER_MS = (SUPER_PULSE_HZ * Math.PI * 2) / UNITS.msPerSecond;
