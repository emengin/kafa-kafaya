import { JUICE, LOOP } from '../config/gameConfig';
import { GameSim, type GameSimOptions } from '../game/GameSim';
import type { SimState } from '../game/simState';
import type { SimEvent } from '../game/types';
import { RenderFrame } from './renderFrame';

/**
 * Hit-stop sonrası görüntünün canlı simülasyona yetişme biçimi: `rate` → hızlandırılmış oynatma,
 * `snap` → tek karede atlama, `off` → hit-stop yok (karşılaştırma için).
 */
export type HitStopMode = 'rate' | 'snap' | 'off';

/**
 * Bir adımın olaylarını sunuma (ses, efekt, HUD) teslim eder. `skipped`: görüntü bu adımı hiç
 * göstermeden canlıya atladı (santra kesmesi); sunum yalnızca kaçırılmaması gerekenleri (evre
 * olayları) işler, efekt ve zaman efekti tetiklemez.
 */
export type DeliverEvents = (events: readonly SimEvent[], skipped: boolean) => void;

interface Slot {
  /** Bu yuvadaki durumun adımı (−1: boş). */
  tick: number;
  state: SimState | undefined;
  readonly frame: RenderFrame;
  readonly events: SimEvent[];
  /** Işınlanma (santra dizilişi): önceki adımdan buna enterpolasyon yapılmaz. */
  teleport: boolean;
}

const NO_EVENTS: readonly SimEvent[] = [];
/** Donmanın düştüğü adımın karesi: `j − ε` konumu enterpolasyonda ≈ F(j) gösterir. */
const FREEZE_EPS = 1e-6;
const POS_EPS = 1e-9;
const MS_PER_S = 1000;

/**
 * Tamponun gerektirdiği en büyük gecikme (adım): gol donması + ağır çekimin biriktirdiği gecikme +
 * kutlamada üst üste iki sert vuruşun donması (yetişilene kadar) + pay.
 */
function defaultCapacity(): number {
  const h = JUICE.hitStop;
  const slow = JUICE.goalSlowMo;
  const seconds = (h.goalMs + 2 * h.maxMs) / MS_PER_S + slow.seconds * (1 - slow.scale);
  return Math.ceil(seconds * LOOP.stepHz) + LOOP.maxStepsPerFrame + MARGIN_TICKS;
}
const MARGIN_TICKS = 8;

/**
 * Sunum zaman çizelgesi (Faz 2.7, madde 5): simülasyonun adım hızı **hiç değişmez**; hit-stop ve
 * gol sonrası ağır çekim yalnızca görüntüde uygulanır.
 *
 * Canlı simülasyonun her adımından sonra `record` durumu, çizim konumlarını (`RenderFrame`) ve
 * olayları halka tampona yazar. Görüntünün kendi konumu (`pos`, kesirli adım) vardır; normalde
 * canlıyla aynıdır (`adım − 1 + alpha`, eski enterpolasyonla birebir). Zaman efektleri yalnızca bu
 * konumu geride bırakır:
 *
 * - **Hit-stop** (`hitStop`): görüntü olayın düştüğü adımın karesinde donar; simülasyon akmaya
 *   devam eder. Donma bitince görüntü yetişir (`rate`: `catchUpRate` kat hızla; `snap`: tek
 *   karede).
 * - **Ağır çekim** (`slowMo`): görüntü `scale` hızında akar; biriken gecikme ağır çekimden sonra
 *   korunur (görüntü canlıyı aynı hızda, geride izler) ve santrada `jumpToLive` ile kapanır.
 *
 * Olaylar görüntü o adıma vardığında teslim edilir (`advance` içinde); teslimden hemen önce
 * `view` simülasyonu o adımın durumuna yüklenir. Böylece çizici, HUD ve olay işleyicileri her zaman
 * gösterilen anın tutarlı durumunu okur (`view`), canlı simülasyonu değil. Canlı simülasyonu
 * okuyanlar yalnızca oyun mantığıdır (girdi, kayıt, tekrar planı, maç sonu).
 *
 * Bellek ayırmaz: yuvalar ve durum kopyaları yeniden kullanılır (olay nesneleri simülasyonundur).
 */
export class PresentationTimeline {
  /** Gösterilen anın durumu: çizici ve HUD bunu okur. Hiç adım atmaz, yalnızca yüklenir. */
  readonly view: GameSim;
  /** Çizilecek (enterpole) konumlar; her `advance` sonunda güncel. */
  readonly frame = new RenderFrame();
  mode: HitStopMode = JUICE.hitStop.catchUp;
  catchUpRate: number = JUICE.hitStop.catchUpRate;

  private readonly slots: Slot[];
  private readonly maxLag: number;
  private newest = -1;
  private deliveredTo = -1;
  private pos = 0;
  private live = 0;
  private holdLag = 0;
  private freezeLeft = 0;
  private slowLeft = 0;
  private slowScale = 1;
  private jumpPending = false;
  /** Başlatılan donma sayısı (teslim sırasında bir olayın donma başlatıp başlatmadığını anlamak için). */
  private freezes = 0;
  /** Olayları teslim edilen adım (teslim dışında −1). */
  private delivering = -1;
  private loadedTick = -1;
  /** Tampon taştığı için teslim edilemeyen adım sayısı (tasarım gereği 0 kalmalı; test için). */
  dropped = 0;

  constructor(options: GameSimOptions, capacity = defaultCapacity()) {
    this.view = new GameSim(options);
    this.slots = Array.from({ length: capacity }, () => ({
      tick: -1,
      state: undefined,
      frame: new RenderFrame(),
      events: [],
      teleport: false,
    }));
    this.maxLag = capacity - LOOP.maxStepsPerFrame - 2;
  }

  /** Görüntünün canlıdan geride kaldığı adım (kesirli; son `advance`'e göre). */
  get lagTicks(): number {
    return this.live - this.pos;
  }

  /** Gösterilen durumun adımı (olayları teslim edilmiş son adım). */
  get shownTick(): number {
    return this.deliveredTo;
  }

  /** Görüntü donmuş ya da ağır çekimde mi? */
  get effectActive(): boolean {
    return this.freezeLeft > 0 || this.slowLeft > 0;
  }

  /**
   * Tamponu boşaltır ve canlı simülasyonun şimdiki durumundan başlar (maç açılışı, yarım maç geri
   * yükleme, tekrar başı/sonu, antrenmanda top sıfırlama): gecikme ve zaman efektleri sıfırlanır.
   */
  reset(sim: GameSim): void {
    for (const s of this.slots) {
      s.tick = -1;
      s.events.length = 0;
    }
    this.record(sim, NO_EVENTS);
    const slot = this.slotAt(sim.tick);
    if (slot) slot.teleport = true;
    this.deliveredTo = sim.tick;
    this.pos = sim.tick - 1;
    this.live = this.pos;
    this.holdLag = 0;
    this.freezeLeft = 0;
    this.slowLeft = 0;
    this.jumpPending = false;
    this.loadedTick = -1;
    this.loadView(sim.tick);
    this.frame.copyFromFrame(slot?.frame ?? this.frame);
  }

  /** Canlı simülasyonun bir adımından hemen sonra: durumu, çizim konumlarını ve olayları sakla. */
  record(sim: GameSim, events: readonly SimEvent[]): void {
    const tick = sim.tick;
    const slot = this.slots[tick % this.slots.length];
    if (!slot) return;
    // Teslim edilmemiş eski adımın üstüne yazılıyorsa (olmamalı: `maxLag` sınırı) sayılır.
    if (slot.tick > this.deliveredTo) {
      this.dropped++;
      this.deliveredTo = slot.tick;
    }
    slot.tick = tick;
    slot.state = sim.saveState(slot.state);
    slot.frame.copyFrom(sim);
    slot.events.length = 0;
    let teleport = false;
    for (const e of events) {
      slot.events.push(e);
      if (e.type === 'kickoff') teleport = true;
    }
    slot.teleport = teleport;
    this.newest = tick;
    if (this.loadedTick === tick) this.loadedTick = -1;
  }

  /**
   * Görüntüyü `ms` boyunca dondur. **Görsel borç sınırı:** görüntü önceki bir hit-stop'tan hâlâ
   * yetişiyorsa (üst üste vuruşlar: sert şutun hemen ardından kafa) yeni donma kalan gecikme kadar
   * kısalır; görüntü canlının hiçbir zaman tek bir hit-stop'tan (≤ 60 ms) fazla gerisinde kalmaz.
   * Sınırsız hâli ölçümde en kötü 100 ms ek gecikme veriyordu (`scripts/hitstop.ts`).
   */
  hitStop(ms: number): void {
    if (this.mode === 'off' || ms <= 0) return;
    const at = this.delivering >= 0 ? this.delivering : this.pos;
    const debtMs = (Math.max(0, this.live - this.holdLag - at) * MS_PER_S) / LOOP.stepHz;
    const freeze = (ms - debtMs) / MS_PER_S;
    if (freeze <= 0) return;
    this.freezeLeft = Math.max(this.freezeLeft, freeze);
    this.freezes++;
  }

  /** Görüntü `seconds` gerçek saniye boyunca `scale` hızında aksın. */
  slowMo(seconds: number, scale: number): void {
    this.slowLeft = seconds;
    this.slowScale = scale;
  }

  /** Bir sonraki `advance`'te canlıya atla (santra: dizilişte kararma zaten var). */
  jumpToLive(): void {
    this.jumpPending = true;
  }

  /**
   * Teslim edilmemiş olayları "atlandı" olarak hemen teslim eder (görüntü değişmeden önce, ör. gol
   * tekrarı başlarken): evre olayları (santra, maç sonu düdüğü) kaybolmaz.
   */
  flush(deliver: DeliverEvents): void {
    this.deliverSkipped(this.newest, deliver);
  }

  /**
   * Bir kare: görüntü konumunu ilerletir, geçilen adımların olaylarını teslim eder, `view`'ı ve
   * `frame`'i gösterilecek ana ayarlar.
   * @param realDt  Gerçek kare süresi (sn).
   * @param alpha   Canlı döngünün enterpolasyon kesri (`FixedStepLoop.alpha`).
   * @returns Dünya süresi (sn): görüntünün bu karede ilerlediği süre — donmada 0, ağır çekimde
   *          yavaş, yetişirken hızlı. Karakter animasyonu, parçacıklar ve ağ bununla akar.
   */
  advance(realDt: number, alpha: number, deliver: DeliverEvents): number {
    const hz = LOOP.stepHz;
    const live = this.newest - 1 + alpha;
    this.live = live;
    let next = this.pos;
    let world = 0;

    if (this.jumpPending) {
      this.jumpPending = false;
      this.deliverSkipped(this.newest, deliver);
      this.freezeLeft = 0;
      this.slowLeft = 0;
      this.holdLag = 0;
      next = live;
      world = realDt;
    } else {
      let dt = realDt;
      if (this.freezeLeft > 0) {
        const frozen = Math.min(dt, this.freezeLeft);
        this.freezeLeft -= frozen;
        dt -= frozen;
      }
      if (dt > 0) {
        if (this.slowLeft > 0) {
          const slow = Math.min(dt, this.slowLeft);
          this.slowLeft -= slow;
          world = slow * this.slowScale + (dt - slow);
          next = Math.min(live, this.pos + world * hz);
          // Ağır çekimin biriktirdiği gecikme korunur: görüntü canlıyı geride izler.
          this.holdLag = live - next;
        } else {
          const target = live - this.holdLag;
          if (this.pos < target - POS_EPS) {
            // Hit-stop'tan sonra yetişme: dünya süresi de aynı oranda hızlanır.
            next =
              this.mode === 'rate'
                ? Math.min(target, this.pos + dt * hz * this.catchUpRate)
                : target;
            world = (next - this.pos) / hz;
          } else {
            next = target;
            world = dt;
          }
        }
      }
    }

    // Sınırlar: canlının önüne geçmez, geri gitmez, tampondan taşmaz.
    next = Math.max(this.pos, Math.min(next, live));
    if (next < this.newest - this.maxLag) {
      next = this.newest - this.maxLag;
      this.holdLag = Math.min(this.holdLag, this.maxLag);
      this.deliverSkipped(Math.floor(next), deliver);
    }

    // Geçilen adımların olayları sırayla; bir olay donma başlatırsa görüntü o adımda durur.
    const reach = Math.min(this.newest, Math.floor(next) + 1);
    for (let j = this.deliveredTo + 1; j <= reach; j++) {
      this.deliveredTo = j;
      const slot = this.slotAt(j);
      if (!slot || slot.events.length === 0) continue;
      this.loadView(j);
      const freezes = this.freezes;
      this.delivering = j;
      deliver(slot.events, false);
      this.delivering = -1;
      if (this.freezes !== freezes) {
        // Donma tam temas karesinde (≈ F(j)) durur, iki kare arasındaki bir pozda değil. `j` kayıtlı
        // en yeni adımı geçmez; canlı enterpolasyonun en çok bir adım önüne geçebilir (donma
        // süresince canlı yine öne geçer).
        next = j - FREEZE_EPS;
        break;
      }
    }
    this.pos = next;

    const i = Math.floor(next);
    const b = this.slotAt(i + 1) ?? this.slotAt(this.newest);
    if (b) {
      this.loadView(b.tick);
      const a = this.slotAt(i);
      if (!a || b.teleport) this.frame.copyFromFrame(b.frame);
      else this.frame.lerpFrom(a.frame, b.frame, next - i);
    }
    return world;
  }

  /** `upTo` adımına kadar teslim edilmemiş olayları "atlandı" olarak teslim eder. */
  private deliverSkipped(upTo: number, deliver: DeliverEvents): void {
    for (let j = this.deliveredTo + 1; j <= upTo; j++) {
      this.deliveredTo = j;
      const slot = this.slotAt(j);
      if (!slot || slot.events.length === 0) continue;
      this.loadView(j);
      deliver(slot.events, true);
    }
  }

  private slotAt(tick: number): Slot | undefined {
    if (tick < 0) return undefined;
    const slot = this.slots[tick % this.slots.length];
    return slot && slot.tick === tick ? slot : undefined;
  }

  private loadView(tick: number): void {
    if (this.loadedTick === tick) return;
    const state = this.slotAt(tick)?.state;
    if (!state) return;
    this.view.loadState(state);
    this.loadedTick = tick;
  }
}
