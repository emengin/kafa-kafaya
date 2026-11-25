import Phaser from 'phaser';
import { onSafeAreaChange, safeAreaInsets } from '../platform/safeArea';
import {
  anchorShift,
  canvasInsets,
  computeFrame,
  type Anchor,
  type ScreenFrame,
} from '../platform/screenFrame';

/** Konumu ayarlanabilen her şey (oyun nesnesi, kap). */
interface Positionable {
  setPosition(x: number, y: number): unknown;
}

/** Tüm görünür alanı kaplatılabilen nesneler (perde, flaş, vinyet). */
type Coverable = Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;

interface Placed {
  readonly obj: Positionable;
  readonly anchor: Anchor;
  readonly x: number;
  readonly y: number;
}

type Listener = (frame: ScreenFrame) => void;

/**
 * Sahne başına ekran yerleşimi (Faz 2.2): kamerayı çekirdeğin (1280×720) ortasına alır ve kenara
 * sabitlenen arayüzü ekran boyutu, en-boy oranı ya da güvenli alan (çentik) değiştikçe yeniden
 * yerleştirir. `screenLayout(scene)` ile alınır; sahne kapanınca kendini temizler.
 *
 * Yerleşim değerleri (gameConfig) tasarım çerçevesinde (16:9, çentiksiz) yazılıdır. Sabitlenen
 * öğe, kenara olan uzaklığını her ekranda korur:
 *
 * - `place(obj, anchor)`: tek nesne; tasarım konumu nesnenin şimdiki konumudur.
 * - `group(anchor)`: kap; içine tasarım koordinatıyla konan her şey birlikte kayar (HUD gibi
 *   kendi içinde tween'lenen, her karede yeniden çizilen arayüz için).
 * - `cover(obj)`: tüm görünür alanı kaplar (perde, flaş, vinyet).
 * - `onChange(fn)`: özel yerleşim (ör. dokunmatik butonların çarpışma noktaları).
 */
export class ScreenLayout {
  private frameNow: ScreenFrame;
  private readonly placed: Placed[] = [];
  private readonly covers: Coverable[] = [];
  private readonly listeners: Listener[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.frameNow = this.measure();
    this.applyCamera();
    const scale = scene.scale;
    scale.on(Phaser.Scale.Events.RESIZE, this.refresh, this);
    const stopSafe = onSafeAreaChange(this.refresh);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scale.off(Phaser.Scale.Events.RESIZE, this.refresh, this);
      stopSafe();
      this.placed.length = 0;
      this.covers.length = 0;
      this.listeners.length = 0;
      LAYOUTS.delete(scene);
    });
  }

  get frame(): ScreenFrame {
    return this.frameNow;
  }

  /** Nesneyi `anchor`'a sabitler; şimdiki konumu tasarım çerçevesindeki konumu sayılır. */
  place<T extends Positionable & { x: number; y: number }>(obj: T, anchor: Anchor): T {
    const entry: Placed = { obj, anchor, x: obj.x, y: obj.y };
    this.placed.push(entry);
    this.forget(obj, () => {
      remove(this.placed, entry);
    });
    this.position(entry);
    return obj;
  }

  /** `anchor`'a sabitlenmiş boş kap (içeriği tasarım koordinatıyla eklenir). */
  group(anchor: Anchor, depth = 0): Phaser.GameObjects.Container {
    return this.place(this.scene.add.container(0, 0).setDepth(depth), anchor);
  }

  /** Nesneyi tüm görünür alana yayar (sol üst köşe kökenli). */
  cover<T extends Coverable>(obj: T): T {
    obj.setOrigin(0);
    this.covers.push(obj);
    this.forget(obj, () => {
      remove(this.covers, obj);
    });
    this.stretch(obj);
    return obj;
  }

  /** Çerçeve değişince çağrılır (hemen bir kez de çağrılır). */
  onChange(fn: Listener): void {
    this.listeners.push(fn);
    fn(this.frameNow);
  }

  /** Tasarım çerçevesindeki bir noktanın bu çerçevedeki kayması. */
  shift(anchor: Anchor): { x: number; y: number } {
    return anchorShift(this.frameNow, anchor);
  }

  /** Tuval koordinatı (ham dokunma olayından) → dünya koordinatı. */
  toWorld(canvasX: number, canvasY: number): { x: number; y: number } {
    const cam = this.scene.cameras.main;
    return { x: canvasX + cam.scrollX, y: canvasY + cam.scrollY };
  }

  /** Ölç ve değiştiyse yeniden yerleştir (boyut ya da güvenli alan değişimi). */
  readonly refresh = (): void => {
    const next = this.measure();
    const a = this.frameNow;
    if (sameRect(a.view, next.view) && sameRect(a.safe, next.safe)) return;
    this.frameNow = next;
    this.applyCamera();
    for (const p of this.placed) this.position(p);
    for (const c of this.covers) this.stretch(c);
    for (const fn of this.listeners) fn(next);
  };

  private measure(): ScreenFrame {
    const scale = this.scene.scale;
    const size = { width: scale.gameSize.width, height: scale.gameSize.height };
    const b = scale.canvasBounds;
    const win = {
      width: document.documentElement.clientWidth || globalThis.innerWidth,
      height: document.documentElement.clientHeight || globalThis.innerHeight,
    };
    const canvas = { x: b.left, y: b.top, width: b.width, height: b.height };
    return computeFrame(size, canvasInsets(safeAreaInsets(), win, canvas, size));
  }

  private applyCamera(): void {
    const { view, size } = this.frameNow;
    const cam = this.scene.cameras.main;
    // Phaser kamerayı yeniden boyutlandırmayı EXPAND'de her zaman yapmıyor: boyutu da biz veririz.
    if (cam.width !== size.width || cam.height !== size.height)
      cam.setSize(size.width, size.height);
    cam.setScroll(view.x, view.y);
  }

  private position(p: Placed): void {
    const s = anchorShift(this.frameNow, p.anchor);
    p.obj.setPosition(p.x + s.x, p.y + s.y);
  }

  private stretch(obj: Coverable): void {
    const { view } = this.frameNow;
    obj.setPosition(view.x, view.y);
    if (obj instanceof Phaser.GameObjects.Rectangle) obj.setSize(view.width, view.height);
    else obj.setDisplaySize(view.width, view.height);
  }

  private forget(obj: unknown, fn: () => void): void {
    if (obj instanceof Phaser.GameObjects.GameObject)
      obj.once(Phaser.GameObjects.Events.DESTROY, fn);
  }
}

const LAYOUTS = new Map<Phaser.Scene, ScreenLayout>();

/** Sahnenin yerleşimi (ilk çağrıda kurulur ve kamerayı ortalar). */
export function screenLayout(scene: Phaser.Scene): ScreenLayout {
  let layout = LAYOUTS.get(scene);
  if (!layout) {
    layout = new ScreenLayout(scene);
    LAYOUTS.set(scene, layout);
  }
  return layout;
}

function remove<T>(list: T[], item: T): void {
  const i = list.indexOf(item);
  if (i >= 0) list.splice(i, 1);
}

function sameRect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}
