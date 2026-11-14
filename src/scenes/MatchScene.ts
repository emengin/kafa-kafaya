import Phaser from 'phaser';
import { CONTROLS, COLORS, DEBUG, DISPLAY, HUD, UNITS } from '../config/gameConfig';
import { GameSim } from '../game/GameSim';
import type { SimEvent } from '../game/types';
import { t } from '../i18n';
import type { InputSource } from '../input/InputState';
import { KeyboardInputSource, KeyTracker } from '../input/KeyboardInput';
import { createGameLoop, lerp } from '../physics';
import { DebugOverlay } from '../ui/DebugOverlay';
import { GrayboxRenderer } from '../ui/GrayboxRenderer';
import { RenderFrame } from '../ui/renderFrame';
import { wantsDebugOverlay } from './devFlags';
import { SceneKeys } from './sceneKeys';

/**
 * Faz 1: iki oyunculu gri kutu maçı. Simülasyon (GameSim) sabit 60 Hz adımla ilerler;
 * çizim, son iki adım arasında enterpole edilir. Sahne yalnızca girdi toplar, adımı
 * koşar ve çizer — oyun kuralları GameSim'dedir.
 */
export class MatchScene extends Phaser.Scene {
  private readonly loop = createGameLoop();
  private sim!: GameSim;
  private tracker!: KeyTracker;
  private inputs!: readonly [InputSource, InputSource];
  private view!: GrayboxRenderer;
  private debug!: DebugOverlay;
  private scoreText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;

  private readonly prevFrame = new RenderFrame();
  private readonly currFrame = new RenderFrame();
  private readonly drawFrame = new RenderFrame();
  private avgStepMs = 0;

  constructor() {
    super(SceneKeys.Match);
  }

  create(): void {
    this.loop.reset();
    this.sim = new GameSim();
    this.prevFrame.copyFrom(this.sim);
    this.currFrame.copyFrom(this.sim);

    const { p1, p2, ui } = CONTROLS;
    const prevent = new Set<string>([...Object.values(p1), ...Object.values(p2), ui.debugToggle]);
    this.tracker = new KeyTracker(window, prevent).attach();
    this.inputs = [
      new KeyboardInputSource(this.tracker, p1),
      new KeyboardInputSource(this.tracker, p2),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.tracker.detach();
    });

    this.view = new GrayboxRenderer(this, this.sim);
    this.createHud();
    this.debug = new DebugOverlay(this);
    this.debug.setVisible(wantsDebugOverlay());
  }

  private createHud(): void {
    const { width, height } = DISPLAY;
    this.scoreText = this.add
      .text(width / 2, HUD.score.y, '', {
        fontFamily: HUD.fontFamily,
        fontSize: `${HUD.score.fontSizePx}px`,
        color: COLORS.textPrimary,
        stroke: COLORS.textStroke,
        strokeThickness: HUD.score.strokePx,
      })
      .setOrigin(0.5)
      .setDepth(HUD.depth);
    this.updateScore();

    const banner = HUD.goalBanner;
    this.goalText = this.add
      .text(width / 2, height * banner.yRatio, t('match.goal'), {
        fontFamily: HUD.fontFamily,
        fontSize: `${banner.fontSizePx}px`,
        color: COLORS.textAccent,
        stroke: COLORS.textStroke,
        strokeThickness: banner.strokePx,
      })
      .setOrigin(0.5)
      .setDepth(HUD.depth)
      .setVisible(false);

    this.add
      .text(width / 2, height - HUD.hint.marginPx, t('match.hint'), {
        fontFamily: HUD.fontFamily,
        fontSize: `${HUD.hint.fontSizePx}px`,
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5, 1)
      .setAlpha(HUD.hint.alpha)
      .setDepth(HUD.depth);
  }

  override update(_time: number, deltaMs: number): void {
    const { ui } = CONTROLS;
    if (this.tracker.consumePress(ui.debugToggle)) this.debug.toggle();
    if (this.tracker.consumePress(ui.back)) {
      this.scene.start(SceneKeys.Menu);
      return;
    }

    let stepTime = 0;
    const steps = this.loop.advance(deltaMs / UNITS.msPerSecond, (_dt, tick) => {
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

    this.view.draw(this.drawFrame.lerpFrom(this.prevFrame, this.currFrame, this.loop.alpha));
    this.debug.update(this.sim, {
      fps: this.game.loop.actualFps,
      stepMs: this.avgStepMs,
      stepsThisFrame: steps,
    });
  }

  private handleEvents(events: readonly SimEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'goal':
          this.updateScore();
          this.showGoalBanner();
          break;
        case 'kickoff':
          // Işınlanma: santra konumlarına enterpolasyonla "kayma" olmasın.
          this.prevFrame.copyFromFrame(this.currFrame);
          break;
        case 'kick':
        case 'header':
        case 'crossbarPush':
          // Ses/efekt sonraki fazlarda.
          break;
      }
    }
  }

  private updateScore(): void {
    this.scoreText.setText(`${this.sim.score[0]}  –  ${this.sim.score[1]}`);
  }

  private showGoalBanner(): void {
    const banner = HUD.goalBanner;
    this.tweens.killTweensOf(this.goalText);
    this.goalText.setVisible(true).setAlpha(1).setScale(banner.popScale);
    this.tweens.chain({
      targets: this.goalText,
      tweens: [
        { scale: 1, duration: banner.popMs, ease: 'Back.easeOut' },
        { alpha: 0, delay: banner.holdMs, duration: banner.fadeMs },
      ],
      onComplete: () => {
        this.goalText.setVisible(false);
      },
    });
  }
}
