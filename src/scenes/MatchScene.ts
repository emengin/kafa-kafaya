import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { CONTROLS, COLORS, DEBUG, HUD, UNITS } from '../config/gameConfig';
import { GameSim } from '../game/GameSim';
import type { PlayerIndex, SimEvent } from '../game/types';
import { format, t, upper } from '../i18n';
import type { InputSource } from '../input/InputState';
import { KeyboardInputSource, KeyTracker } from '../input/KeyboardInput';
import { createGameLoop, lerp } from '../physics';
import { DebugOverlay } from '../ui/DebugOverlay';
import { GrayboxRenderer } from '../ui/GrayboxRenderer';
import { MatchHud } from '../ui/MatchHud';
import { MenuOverlay } from '../ui/MenuOverlay';
import { RenderFrame } from '../ui/renderFrame';
import { devMatchDuration, wantsDebugOverlay } from './devFlags';
import { SceneKeys } from './sceneKeys';

/**
 * İki oyunculu maç. Kurallar ve durum makinesi GameSim/MatchFlow'dadır (deterministik);
 * sahne girdiyi toplar, sabit adımları koşar, çizer ve arayüzü (HUD, duraklatma, maç sonu)
 * yönetir.
 *
 * - **Ağır çekim:** gerçek kare süresi `match.timeScale` ile çarpılarak döngüye verilir;
 *   simülasyon yine sabit adımla ilerler, yalnızca saniyedeki adım sayısı azalır.
 * - **Duraklatma:** döngü hiç ilerletilmez (her durumdan açılır, aynı yerden devam eder);
 *   sahne tween'leri de dondurulur.
 */
export class MatchScene extends Phaser.Scene {
  private readonly loop = createGameLoop();
  private sim!: GameSim;
  private tracker!: KeyTracker;
  private inputs!: readonly [InputSource, InputSource];
  private view!: GrayboxRenderer;
  private hud!: MatchHud;
  private debug!: DebugOverlay;
  private names!: readonly [string, string];

  /** Açık kaplama (duraklatma menüsü ya da maç sonu ekranı). */
  private overlay: MenuOverlay | null = null;
  private paused = false;
  private endShown = false;
  private leaving = false;

  private readonly prevFrame = new RenderFrame();
  private readonly currFrame = new RenderFrame();
  private readonly drawFrame = new RenderFrame();
  private avgStepMs = 0;

  constructor() {
    super(SceneKeys.Match);
  }

  create(): void {
    // Sahne yeniden başlatıldığında alanlar sıfırlanmaz: hepsini burada kur.
    this.tweens.resumeAll();
    this.loop.reset();
    this.overlay = null;
    this.paused = false;
    this.endShown = false;
    this.leaving = false;
    this.avgStepMs = 0;

    const durationSeconds = devMatchDuration();
    this.sim = new GameSim(durationSeconds ? { rules: { durationSeconds } } : {});
    this.prevFrame.copyFrom(this.sim);
    this.currFrame.copyFrom(this.sim);
    this.names = [t('player.1'), t('player.2')];

    const { p1, p2, ui } = CONTROLS;
    const prevent = new Set<string>([
      ...Object.values(p1),
      ...Object.values(p2),
      ui.debugToggle,
      ...ui.menuUp,
      ...ui.menuDown,
      ...ui.menuConfirm,
    ]);
    this.tracker = new KeyTracker(window, prevent).attach();
    this.inputs = [
      new KeyboardInputSource(this.tracker, p1),
      new KeyboardInputSource(this.tracker, p2),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.tracker.detach();
      this.overlay?.destroy();
      this.overlay = null;
    });

    this.view = new GrayboxRenderer(this, this.sim);
    this.hud = new MatchHud(this, this.names);
    this.hud.update(this.sim.match);
    this.debug = new DebugOverlay(this);
    this.debug.setVisible(wantsDebugOverlay());
    this.cameras.main.fadeIn(HUD.kickoffFadeMs);
  }

  override update(_time: number, deltaMs: number): void {
    if (this.leaving) return;
    const { ui } = CONTROLS;
    if (this.tracker.consumePress(ui.debugToggle)) this.debug.toggle();

    if (this.paused) {
      if (this.tracker.consumeAny(ui.pause)) {
        this.resume();
      } else {
        this.overlay?.update(this.tracker);
      }
      return;
    }
    if (this.endShown) {
      this.overlay?.update(this.tracker);
    } else if (this.tracker.consumeAny(ui.pause)) {
      this.pause();
      return;
    }

    this.advanceSimulation(deltaMs);
    this.view.draw(this.drawFrame.lerpFrom(this.prevFrame, this.currFrame, this.loop.alpha));
    this.hud.update(this.sim.match);

    const match = this.sim.match;
    if (
      match.phase === 'matchEnd' &&
      !this.endShown &&
      match.phaseTime >= HUD.endScreenDelaySeconds
    ) {
      this.showEndScreen();
    }
  }

  private advanceSimulation(deltaMs: number): void {
    // Ağır çekim: gerçek süre ölçeklenir, simülasyon adımı sabit kalır (determinizm).
    const frameSeconds = (deltaMs / UNITS.msPerSecond) * this.sim.match.timeScale;
    let stepTime = 0;
    const steps = this.loop.advance(frameSeconds, (_dt, tick) => {
      const start = performance.now();
      this.prevFrame.copyFrom(this.sim);
      const events = this.sim.step([this.inputs[0].read(tick), this.inputs[1].read(tick)]);
      this.currFrame.copyFrom(this.sim);
      stepTime += performance.now() - start;
      this.handleEvents(events);
    });
    if (steps > 0) {
      this.avgStepMs = lerp(this.avgStepMs, stepTime / steps, DEBUG.statsSmoothing);
    }
    this.debug.update(this.sim, {
      fps: this.game.loop.actualFps,
      stepMs: this.avgStepMs,
      stepsThisFrame: steps,
    });
  }

  private handleEvents(events: readonly SimEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'goal': {
          this.hud.onGoal(e.scorer);
          const shake = HUD.goalShake;
          this.cameras.main.shake(shake.durationMs, shake.intensity);
          break;
        }
        case 'kickoff':
          // Işınlanma: santra konumlarına enterpolasyonla "kayma" olmasın; kısa kararma gizler.
          this.prevFrame.copyFromFrame(this.currFrame);
          this.cameras.main.fadeIn(HUD.kickoffFadeMs);
          break;
        case 'playStart':
          sfx.whistle('kickoff');
          break;
        case 'goldenGoal':
          this.hud.onGoldenGoal();
          sfx.whistle('goldenGoal');
          break;
        case 'matchEnd':
          sfx.whistle('fullTime');
          if (e.reason === 'time') this.hud.onFullTime();
          break;
        case 'kick':
        case 'header':
        case 'crossbarPush':
          // Ses/efekt sonraki fazlarda.
          break;
      }
    }
  }

  private pause(): void {
    this.paused = true;
    // Menü tuşları (Enter, ↑) oyuncu girdisine sarkmasın; basılı tuşlar yeniden basılmalı.
    this.tracker.releaseAll();
    this.tweens.pauseAll();
    this.overlay = new MenuOverlay(this, {
      title: t('pause.title'),
      items: [
        {
          label: t('pause.resume'),
          onSelect: () => {
            this.resume();
          },
        },
        {
          label: t('pause.restart'),
          onSelect: () => {
            this.restart();
          },
        },
        {
          label: t('pause.mainMenu'),
          onSelect: () => {
            this.toMainMenu();
          },
        },
      ],
    });
  }

  private resume(): void {
    this.overlay?.destroy();
    this.overlay = null;
    this.paused = false;
    this.tracker.releaseAll();
    this.tweens.resumeAll();
  }

  private showEndScreen(): void {
    this.endShown = true;
    this.tracker.releaseAll();
    const match = this.sim.match;
    const winner: PlayerIndex | null = match.winner;
    const [a, b] = match.score;
    const lines = [`${upper(this.names[0])}  ${a} – ${b}  ${upper(this.names[1])}`];
    if (match.endReason === 'goldenGoal') lines.push(t('end.byGoldenGoal'));
    this.overlay = new MenuOverlay(this, {
      title:
        winner === null ? t('end.draw') : upper(format('end.winner', { name: this.names[winner] })),
      titleColor: winner === null ? COLORS.textAccent : HUD.playerColors[winner],
      lines,
      items: [
        {
          label: t('end.playAgain'),
          onSelect: () => {
            this.restart();
          },
        },
        {
          label: t('end.mainMenu'),
          onSelect: () => {
            this.toMainMenu();
          },
        },
      ],
    });
  }

  private restart(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.tweens.resumeAll();
    this.scene.restart();
  }

  private toMainMenu(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.tweens.resumeAll();
    this.cameras.main.fadeOut(HUD.exitFadeMs);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SceneKeys.Menu);
    });
  }
}
