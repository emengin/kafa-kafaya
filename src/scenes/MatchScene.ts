import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { CONTROLS, COLORS, DEBUG, FX, HUD, UNITS, type AiDifficulty } from '../config/gameConfig';
import { AiController, AiInputSource } from '../game/ai/AiController';
import { mixSeed } from '../game/ai/random';
import { observe } from '../game/ai/worldView';
import { getCharacter, loadoutFor, type CharacterDef } from '../game/characters';
import { GameSim } from '../game/GameSim';
import { resolveMatchSetup, type MatchSetup } from '../game/matchSetup';
import type { PlayerIndex, SimEvent } from '../game/types';
import { format, t, upper } from '../i18n';
import type { InputSource } from '../input/InputState';
import { KeyboardInputSource, KeyTracker } from '../input/KeyboardInput';
import { MergedInputSource } from '../input/MergedInput';
import { createGameLoop, lerp } from '../physics';
import { DebugOverlay } from '../ui/DebugOverlay';
import { GrayboxRenderer, superColor } from '../ui/GrayboxRenderer';
import { MatchHud } from '../ui/MatchHud';
import { MenuOverlay } from '../ui/MenuOverlay';
import { RenderFrame } from '../ui/renderFrame';
import { devAiFlags, devMatchDuration, wantsDebugOverlay } from './devFlags';
import { SceneKeys } from './sceneKeys';

/** Kayan yazıların rengi için sayısal rengi CSS'e çevirir. */
function cssColor(color: number): string {
  return `#${color.toString(HEX).padStart(HEX_DIGITS, '0')}`;
}
const HEX = 16;
const HEX_DIGITS = 6;

/** Her maç için yeni bir yapay zekâ tohumu (`?seed=N` verilmemişse). */
function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

/** "CPU · Zor" gibi görünen ad. */
function cpuName(difficulty: AiDifficulty): string {
  return format('player.cpu', { level: t(`difficulty.${difficulty}`) });
}

/**
 * Maç sahnesi: 2 oyunculu ya da CPU'ya karşı. Kurallar ve durum makinesi GameSim/MatchFlow'dadır
 * (deterministik); sahne girdiyi toplar (klavye ya da yapay zekâ — ikisi de yalnızca
 * `InputState` üretir), sabit adımları koşar, çizer ve arayüzü (HUD, duraklatma, maç sonu)
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
  private setup!: MatchSetup;
  private characters!: readonly [CharacterDef, CharacterDef];
  /** Yapay zekâ oyuncuları (debug katmanı için). */
  private ais: AiController[] = [];

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

  /**
   * @param data Menünün verdiği `MatchSetup`. Veri yoksa (geliştirici kısayoluyla doğrudan
   *             başlatma) URL bayrakları (`?cpu=`, `?cpu1=`, `?seed=`) kullanılır.
   */
  create(data?: unknown): void {
    // Sahne yeniden başlatıldığında alanlar sıfırlanmaz: hepsini burada kur.
    this.tweens.resumeAll();
    this.loop.reset();
    this.overlay = null;
    this.paused = false;
    this.endShown = false;
    this.leaving = false;
    this.avgStepMs = 0;

    const fromMenu = typeof data === 'object' && data !== null && 'mode' in data;
    const dev = devAiFlags();
    this.setup = resolveMatchSetup(data, fromMenu ? { cpu: null, cpu1: null, seed: null } : dev);
    // Tohum maç başında bir kez seçilir: Yeniden Başlat aynı kurulumu korur, maç yine farklıdır.
    const seed = this.setup.seed ?? randomSeed();
    const [c1, c2] = this.setup.characters;
    this.characters = [getCharacter(c1), getCharacter(c2)];
    const durationSeconds = devMatchDuration();
    this.sim = new GameSim({
      ...(durationSeconds ? { rules: { durationSeconds } } : {}),
      loadouts: [loadoutFor(c1), loadoutFor(c2)],
      seed: mixSeed(seed, 2),
    });
    this.prevFrame.copyFrom(this.sim);
    this.currFrame.copyFrom(this.sim);
    const { mode, difficulty, p1Ai } = this.setup;
    this.names =
      mode === 'cpu'
        ? [p1Ai ? cpuName(p1Ai) : t('player.you'), cpuName(difficulty)]
        : [t('player.1'), t('player.2')];

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
    this.inputs = this.createInputs(
      new KeyboardInputSource(this.tracker, p1),
      new KeyboardInputSource(this.tracker, p2),
      seed,
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.tracker.detach();
      this.overlay?.destroy();
      this.overlay = null;
    });

    this.view = new GrayboxRenderer(this, this.sim, this.characters);
    this.hud = new MatchHud(this, this.names, t(mode === 'cpu' ? 'match.hintCpu' : 'match.hint'), [
      this.characters[0].superType,
      this.characters[1].superType,
    ]);
    this.hud.update(this.sim.match, this.sim.players);
    this.debug = new DebugOverlay(this);
    this.debug.setVisible(wantsDebugOverlay());
    this.cameras.main.fadeIn(HUD.kickoffFadeMs);
  }

  /**
   * 2 oyuncu: iki klavye eşlemesi. CPU'ya karşı: insan P1 her iki eşlemeyle de oynar, P2
   * yapay zekâdır (`?cpu1=` ile P1 de). AI yalnızca simülasyonun görünümünü okur.
   */
  private createInputs(
    kb1: KeyboardInputSource,
    kb2: KeyboardInputSource,
    seed: number,
  ): readonly [InputSource, InputSource] {
    this.ais = [];
    const { mode, difficulty, p1Ai } = this.setup;
    if (mode === 'versus') return [kb1, kb2];
    const view = (): ReturnType<typeof observe> => observe(this.sim);
    const ai2 = new AiController({ index: 1, difficulty, seed: mixSeed(seed, 1) });
    this.ais.push(ai2);
    let first: InputSource = new MergedInputSource(kb1, kb2);
    if (p1Ai) {
      const ai1 = new AiController({ index: 0, difficulty: p1Ai, seed: mixSeed(seed, 0) });
      this.ais.push(ai1);
      first = new AiInputSource(ai1, view);
    }
    return [first, new AiInputSource(ai2, view)];
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
    this.view.draw(
      this.drawFrame.lerpFrom(this.prevFrame, this.currFrame, this.loop.alpha),
      this.time.now,
    );
    this.hud.update(this.sim.match, this.sim.players);

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
    this.debug.update(
      this.sim,
      { fps: this.game.loop.actualFps, stepMs: this.avgStepMs, stepsThisFrame: steps },
      this.debug.isVisible ? this.ais.map((ai) => ai.debugInfo()) : [],
    );
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
          if (!e.super) sfx.kick();
          break;
        case 'superLaunch': {
          sfx.superShot();
          const [r, g, b] = FX.superFlashRgb;
          this.cameras.main.flash(FX.superFlashMs, r, g, b);
          const p = this.sim.players[e.player];
          this.floatText(
            p.x,
            p.y - p.headRadius,
            upper(t(`super.${e.superType}`)),
            cssColor(superColor(e.superType)),
            HUD.superText,
          );
          break;
        }
        case 'superHit':
          if (e.superType === 'ice') sfx.freeze();
          if (e.superType === 'quake') {
            this.cameras.main.shake(FX.quakeShake.durationMs, FX.quakeShake.intensity);
          }
          break;
        case 'teleportExit':
          this.view.burst(e.x, e.y, superColor('teleport'));
          break;
        case 'balloonPop': {
          sfx.pop();
          if (e.powerUp === 'freezeOpponent') sfx.freeze();
          const p = this.sim.players[e.player];
          this.floatText(
            p.x,
            p.y - p.headRadius - HUD.popText.offsetY,
            t(`powerUp.${e.powerUp}`),
            cssColor(FX.powerUpColors[e.powerUp]),
            HUD.popText,
          );
          break;
        }
        case 'header':
        case 'superArmed':
        case 'crossbarPush':
        case 'balloonSpawn':
        case 'balloonExpire':
          break;
      }
    }
  }

  /** Oyuncunun üstünde yükselip kaybolan kısa yazı (süper adı, kazanılan güçlendirici). */
  private floatText(
    x: number,
    y: number,
    text: string,
    color: string,
    style: { fontSizePx: number; strokePx: number; risePx: number; durationMs: number },
  ): void {
    const label = this.add
      .text(x, y, text, {
        fontFamily: HUD.fontFamily,
        fontSize: `${style.fontSizePx}px`,
        color,
        stroke: COLORS.textStroke,
        strokeThickness: style.strokePx,
      })
      .setOrigin(0.5, 1)
      .setDepth(HUD.depth);
    this.tweens.add({
      targets: label,
      y: y - style.risePx,
      alpha: 0,
      duration: style.durationMs,
      ease: 'Quad.easeOut',
      onComplete: () => {
        label.destroy();
      },
    });
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
    this.scene.restart(this.setup);
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
