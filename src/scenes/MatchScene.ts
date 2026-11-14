import Phaser from 'phaser';
import { crowd } from '../audio/Crowd';
import { attackDanger } from '../audio/crowdMood';
import { music } from '../audio/Music';
import { sfx } from '../audio/Sfx';
import {
  BALL,
  CONTROLS,
  CROWD,
  DEBUG,
  DISPLAY,
  FX,
  HUD,
  JUICE,
  MATCH,
  SUPER_FX,
  UNITS,
  type AiDifficulty,
} from '../config/gameConfig';
import {
  HitStop,
  hitStopForSpeed,
  QualityGovernor,
  rememberQuality,
  sessionQuality,
} from '../fx/feel';
import { approach } from '../fx/Spring';
import { AiController, AiInputSource } from '../game/ai/AiController';
import { mixSeed } from '../game/ai/random';
import { observe } from '../game/ai/worldView';
import { getCharacter, loadoutFor, type CharacterDef } from '../game/characters';
import { POWER_UP_TYPES } from '../game/entities/Player';
import { GameSim } from '../game/GameSim';
import { resolveMatchSetup, type MatchSetup } from '../game/matchSetup';
import type { PlayerIndex, SimEvent } from '../game/types';
import { format, t, upper } from '../i18n';
import type { InputSource } from '../input/InputState';
import { KeyboardInputSource, KeyTracker } from '../input/KeyboardInput';
import { MergedInputSource } from '../input/MergedInput';
import { createGameLoop, lerp } from '../physics';
import { DebugOverlay } from '../ui/DebugOverlay';
import { displayedSecond } from '../ui/format';
import { MatchHud } from '../ui/MatchHud';
import { MatchRenderer } from '../ui/MatchRenderer';
import { MenuOverlay } from '../ui/MenuOverlay';
import { RenderFrame } from '../ui/renderFrame';
import { volumeMenuItems } from '../ui/settingsMenu';
import { devAiFlags, devMatchDuration, devQuality, wantsDebugOverlay } from './devFlags';
import { SceneKeys } from './sceneKeys';

/** Sık kullanılan renk. */
const WHITE = 0xffffff;

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
 * `InputState` üretir), sabit adımları koşar, çizer (`MatchRenderer`), sesi (`sfx`, `crowd`,
 * `music`) ve arayüzü (HUD, duraklatma, maç sonu) yönetir.
 *
 * - **Ağır çekim:** gerçek kare süresi `match.timeScale` ile çarpılarak döngüye verilir;
 *   simülasyon yine sabit adımla ilerler, yalnızca saniyedeki adım sayısı azalır.
 * - **Hit-stop:** sert vuruşta döngüye 40–60 ms boyunca süre verilmez (dünya donar);
 *   simülasyon adımları değişmez, determinizm korunur.
 * - **Duraklatma:** döngü hiç ilerletilmez (her durumdan açılır, aynı yerden devam eder);
 *   sahne tween'leri de dondurulur.
 * - **Kalite:** kare süresi uzun süre bütçeyi aşarsa efektler bir kademe azaltılır.
 */
export class MatchScene extends Phaser.Scene {
  private readonly loop = createGameLoop();
  private sim!: GameSim;
  private tracker!: KeyTracker;
  private inputs!: readonly [InputSource, InputSource];
  private view!: MatchRenderer;
  private hud!: MatchHud;
  private debug!: DebugOverlay;
  private names!: readonly [string, string];
  private setup!: MatchSetup;
  private characters!: readonly [CharacterDef, CharacterDef];
  /** Yapay zekâ oyuncuları (debug katmanı için). */
  private ais: AiController[] = [];
  private readonly hitStop = new HitStop();
  private governor!: QualityGovernor;
  private screenFlash!: Phaser.GameObjects.Rectangle;
  private danger = 0;
  private lastCountdown = -1;
  private readonly decoyTrack: { x: number; y: number }[] = [];

  /** Açık kaplama (duraklatma menüsü ya da maç sonu ekranı). */
  private overlay: MenuOverlay | null = null;
  private paused = false;
  private endShown = false;
  private leaving = false;

  private readonly prevFrame = new RenderFrame();
  private readonly currFrame = new RenderFrame();
  private readonly drawFrame = new RenderFrame();
  private avgStepMs = 0;
  private avgFrameMs = 0;

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
    this.hitStop.reset();
    this.overlay = null;
    this.paused = false;
    this.endShown = false;
    this.leaving = false;
    this.avgStepMs = 0;
    this.avgFrameMs = 0;
    this.danger = 0;
    this.lastCountdown = -1;
    this.decoyTrack.length = 0;

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
      crowd.stop();
    });

    const fixed = devQuality();
    this.governor = new QualityGovernor(fixed ?? sessionQuality(), fixed !== null);
    const tags: readonly [string, string] =
      mode === 'cpu' ? [p1Ai ? 'CPU' : 'P1', 'CPU'] : ['P1', 'P2'];
    this.view = new MatchRenderer(this, this.sim, this.characters, tags, this.governor.level, {
      title: t('game.title'),
      goal: t('board.goal'),
    });
    for (const c of this.characters) {
      this.view.prewarmText(
        upper(t(`super.${c.superType}`)),
        FX.superColors[c.superType],
        HUD.superText,
      );
    }
    for (const type of POWER_UP_TYPES)
      this.view.prewarmText(t(`powerUp.${type}`), FX.powerUpColors[type], HUD.popText);
    this.hud = new MatchHud(
      this,
      this.names,
      t(mode === 'cpu' ? 'match.hintCpu' : 'match.hint'),
      [this.characters[0].superType, this.characters[1].superType],
      this.characters,
      [this.view.rigs[0].face, this.view.rigs[1].face],
    );
    this.hud.update(this.sim.match, this.sim.players);
    this.screenFlash = this.add
      .rectangle(0, 0, DISPLAY.width, DISPLAY.height, WHITE, 0)
      .setOrigin(0)
      .setDepth(HUD.depth - 1);
    this.debug = new DebugOverlay(this);
    this.debug.setVisible(wantsDebugOverlay());
    this.cameras.main.fadeIn(HUD.kickoffFadeMs);
    music.play('match');
    crowd.start();
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

  override update(time: number, deltaMs: number): void {
    if (this.leaving) return;
    const { ui } = CONTROLS;
    if (this.tracker.consumePress(ui.debugToggle)) this.debug.toggle();
    if (this.governor.sample(deltaMs)) {
      this.view.setQuality(this.governor.level);
      rememberQuality(this.governor.level);
    }
    this.avgFrameMs = lerp(this.avgFrameMs || deltaMs, deltaMs, DEBUG.statsSmoothing);

    if (this.paused) {
      if (this.tracker.consumeAny(ui.pause) && !this.inSettings) {
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

    const realDt = Math.min(deltaMs, MAX_FRAME_MS) / UNITS.msPerSecond;
    this.view.rememberBalloon();
    this.trackDecoys();
    const simMs = this.hitStop.filter(deltaMs);
    this.advanceSimulation(simMs);
    const worldDt = (Math.min(simMs, MAX_FRAME_MS) / UNITS.msPerSecond) * this.sim.match.timeScale;
    this.view.draw(
      this.drawFrame.lerpFrom(this.prevFrame, this.currFrame, this.loop.alpha),
      realDt,
      worldDt,
      time / UNITS.msPerSecond,
    );
    this.updateCrowd(realDt);
    this.updateCountdown();
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
      {
        fps: this.game.loop.actualFps,
        stepMs: this.avgStepMs,
        stepsThisFrame: steps,
        frameMs: this.avgFrameMs,
        quality: this.governor.level,
        particles: this.view.liveParticles,
      },
      this.debug.isVisible ? this.ais.map((ai) => ai.debugInfo()) : [],
    );
  }

  private handleEvents(events: readonly SimEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'goal':
          this.hud.onGoal(e.scorer);
          this.view.onGoal(e.scorer);
          this.hitStop.trigger(JUICE.hitStop.goalMs);
          crowd.cheer();
          music.duck();
          sfx.net(BALL.maxSpeed);
          sfx.horn();
          this.flash(WHITE, GOAL_FLASH);
          break;
        case 'kickoff':
          // Işınlanma: santra konumlarına enterpolasyonla "kayma" olmasın; kısa kararma gizler.
          this.prevFrame.copyFromFrame(this.currFrame);
          this.view.onKickoff();
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
          this.view.onMatchEnd(e.winner);
          if (e.winner !== null) crowd.cheer();
          break;
        case 'kick': {
          const power = Math.min(1, e.speed / BALL.maxSpeed);
          sfx.kick(power);
          this.view.onKick(e.player, e.speed, e.super);
          const stop = hitStopForSpeed(e.speed, BALL.maxSpeed);
          if (stop > 0) {
            this.hitStop.trigger(stop);
            this.flash(WHITE, HARD_FLASH * power);
          }
          break;
        }
        case 'header': {
          sfx.header(Math.min(1, e.speed / BALL.maxSpeed));
          this.view.onHeader(e.player, e.speed, this.time.now / UNITS.msPerSecond);
          const stop = hitStopForSpeed(e.speed, BALL.maxSpeed);
          if (stop > 0) this.hitStop.trigger(stop);
          break;
        }
        case 'ballTouch':
          sfx.touch(e.speed);
          this.view.onTouch(e.player, e.speed);
          break;
        case 'ballImpact':
          this.onImpact(e.surface, e.speed, e.x, e.y);
          break;
        case 'jump':
          sfx.jump(e.air);
          this.view.onJump(e.player, e.air);
          break;
        case 'land':
          sfx.land(e.speed);
          this.view.onLand(e.player, e.speed);
          break;
        case 'superArmed':
          sfx.superArmed();
          break;
        case 'superLaunch': {
          sfx.superShot(e.superType);
          this.view.onSuperLaunch(e.player, e.superType);
          this.hitStop.trigger(JUICE.hitStop.superMs);
          const color = FX.superColors[e.superType];
          this.flash(color, SUPER_FLASH);
          const p = this.sim.players[e.player];
          this.view.floatText(
            p.x,
            p.y - p.headRadius,
            upper(t(`super.${e.superType}`)),
            color,
            HUD.superText,
          );
          break;
        }
        case 'superHit':
          sfx.superHit(e.superType);
          this.view.onSuperHit(e.player, e.superType);
          break;
        case 'teleportExit':
          this.view.onTeleportExit(e.x, e.y);
          sfx.jump(true);
          break;
        case 'balloonPop': {
          sfx.pop();
          sfx.powerUp(e.powerUp);
          this.view.onBalloonPop(e.player, e.powerUp);
          const p = this.sim.players[e.player];
          this.view.floatText(
            p.x,
            p.y - p.headRadius - HUD.popText.offsetY,
            t(`powerUp.${e.powerUp}`),
            FX.powerUpColors[e.powerUp],
            HUD.popText,
          );
          break;
        }
        case 'balloonExpire':
          this.view.onBalloonExpire();
          break;
        case 'crossbarPush':
        case 'balloonSpawn':
          break;
      }
    }
  }

  /** Topun saha çarpması: zemin "küt", duvar "tak", ağ "fışş", direk "dang" + kalabalık "ooo". */
  private onImpact(surface: string, speed: number, x: number, y: number): void {
    this.view.onImpact(surface, speed, x, y);
    if (surface === 'ground') {
      sfx.bounce(speed);
    } else if (surface === 'crossbar') {
      sfx.post(speed);
      if (speed > OOH_SPEED) crowd.ooh();
    } else {
      const inNet = x < this.sim.pitch.goals[0].lineX || x > this.sim.pitch.goals[1].lineX;
      if (surface === 'wall' && inNet && y > this.sim.pitch.goals[0].net.minY) sfx.net(speed);
      else sfx.wall(speed);
    }
  }

  /** Serap yanılsamaları sönünce pembe duman (yanılsama sayısı azaldıysa). */
  private trackDecoys(): void {
    const now = this.sim.decoys;
    if (now.length < this.decoyTrack.length) {
      for (const old of this.decoyTrack) {
        const alive = now.some(
          (d) => Math.hypot(d.ball.x - old.x, d.ball.y - old.y) < DECOY_MATCH_PX,
        );
        if (!alive) this.view.onDecoyVanish(old.x, old.y);
      }
    }
    this.decoyTrack.length = 0;
    for (const d of now) this.decoyTrack.push({ x: d.ball.x, y: d.ball.y });
  }

  /** Kalabalık: atak tehlikesine göre uğultu ve kıpırtı. */
  private updateCrowd(dt: number): void {
    const b = this.sim.ball;
    const [left, right] = this.sim.pitch.goals;
    const target = this.sim.match.goalsAllowed
      ? attackDanger({
          ballX: b.x,
          ballY: b.y,
          ballVx: b.vx,
          groundY: this.sim.pitch.groundY,
          leftLineX: left.lineX,
          rightLineX: right.lineX,
        })
      : 0;
    this.danger = approach(this.danger, target, CROWD.danger.rate, dt);
    crowd.setIntensity(this.danger);
    this.view.setExcitement(this.danger);
  }

  /** Son saniyeler: her saniye tık (son 3 sn daha tiz). */
  private updateCountdown(): void {
    const match = this.sim.match;
    if (match.overtime || match.phase !== 'playing') return;
    const second = displayedSecond(match.timeLeft);
    if (second === this.lastCountdown) return;
    this.lastCountdown = second;
    if (second > 0 && second <= MATCH.finalCountdownSeconds) sfx.countdown(second <= FINAL_TICKS);
  }

  /** Tüm ekranda kısa renkli parlama (HUD'un altında). */
  private flash(color: number, alpha: number): void {
    this.tweens.killTweensOf(this.screenFlash);
    this.screenFlash.setFillStyle(color, alpha);
    this.tweens.add({
      targets: this.screenFlash,
      fillAlpha: 0,
      duration: SUPER_FX.launchFlashMs,
      ease: 'Quad.easeOut',
    });
  }

  private inSettings = false;

  private pause(): void {
    this.paused = true;
    // Menü tuşları (Enter, ↑) oyuncu girdisine sarkmasın; basılı tuşlar yeniden basılmalı.
    this.tracker.releaseAll();
    this.tweens.pauseAll();
    this.showPauseMenu();
  }

  private showPauseMenu(): void {
    this.overlay?.destroy();
    this.inSettings = false;
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
          label: t('pause.settings'),
          onSelect: () => {
            this.showSettings();
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

  private showSettings(): void {
    // Menü öğesinin işleyicisi içinden çağrılır: kaplamayı bir sonraki karede değiştir.
    this.time.delayedCall(0, () => {
      this.overlay?.destroy();
      this.inSettings = true;
      this.overlay = new MenuOverlay(this, {
        title: t('settings.title'),
        lines: [t('settings.hint')],
        items: volumeMenuItems(() => {
          this.time.delayedCall(0, () => {
            this.showPauseMenu();
          });
        }),
      });
    });
  }

  private resume(): void {
    this.overlay?.destroy();
    this.overlay = null;
    this.paused = false;
    this.inSettings = false;
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
      ...(winner === null ? {} : { titleColor: HUD.playerColors[winner] }),
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

/** Sekme dönüşü gibi uzun karelerde görsel adım sınırı (ms). */
const MAX_FRAME_MS = 100;
const GOAL_FLASH = 0.35;
const HARD_FLASH = 0.16;
const SUPER_FLASH = 0.3;
const OOH_SPEED = 600;
const FINAL_TICKS = 3;
const DECOY_MATCH_PX = 40;
