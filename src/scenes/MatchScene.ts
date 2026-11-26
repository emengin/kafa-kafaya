import Phaser from 'phaser';
import { crowd } from '../audio/Crowd';
import { attackDanger } from '../audio/crowdMood';
import { music } from '../audio/Music';
import { sfx } from '../audio/Sfx';
import {
  ACCESSIBILITY,
  BALL,
  CONTROLS,
  CROWD,
  DEBUG,
  DISPLAY,
  FX,
  HUD,
  JUICE,
  LOOP,
  MATCH,
  REPLAY,
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
import { devHooks, type MatchDevSession } from '../dev/hooks';
import { POWER_UP_TYPES } from '../game/entities/Player';
import { GameSim, type GameSimOptions } from '../game/GameSim';
import { isCpuMode, resolveMatchSetup, type MatchSetup } from '../game/matchSetup';
import { ReplayRecorder, type ReplayPlan } from '../game/replay';
import type { SimState } from '../game/simState';
import { applyPlayerResult, getSavedTournament, setSavedTournament } from '../game/tournament';
import type { PlayerIndex, SimEvent } from '../game/types';
import { format, t, upper } from '../i18n';
import { gamepads } from '../input/Gamepads';
import { EMPTY_INPUT, type InputSource, type InputState } from '../input/InputState';
import { KeyboardInputSource, KeyTracker } from '../input/KeyboardInput';
import { latencyProbe } from '../input/latencyProbe';
import { MergedInputSource } from '../input/MergedInput';
import {
  isPortrait,
  isTouchDevice,
  onTouchDetected,
  twoPlayerTouchAllowed,
} from '../platform/device';
import { setInMatch } from '../platform/fullscreen';
import { getSettings } from '../save/gameSettings';
import { saveMatchResult, saveTournamentWin } from '../save/progress';
import { createGameLoop, lerp } from '../physics';
import { DebugOverlay } from '../ui/DebugOverlay';
import { displayedSecond } from '../ui/format';
import { MatchHud } from '../ui/MatchHud';
import { MatchRenderer } from '../ui/MatchRenderer';
import { MenuOverlay } from '../ui/MenuOverlay';
import { RenderFrame } from '../ui/renderFrame';
import { screenLayout } from '../ui/ScreenLayout';
import { solidRect } from '../ui/solidRect';
import { playerColorHex, playerMark } from '../ui/identity';
import { ReplayOverlay } from '../ui/ReplayOverlay';
import { volumeMenuItems } from '../ui/settingsMenu';
import type { TextMenuItem } from '../ui/TextMenu';
import { LatencyMeter } from '../ui/LatencyMeter';
import { TouchControls } from '../ui/TouchControls';
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

/** Girdisiz kaynak (antrenman kuklası). */
const IDLE_SOURCE: InputSource = { read: () => EMPTY_INPUT };

/**
 * Maç sahnesi: Hızlı Maç (CPU), 2 oyuncu, turnuva maçı ya da antrenman. Kurallar ve durum makinesi GameSim/MatchFlow'dadır
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
  private screenFlash!: Phaser.GameObjects.Image;
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
  private touch: TouchControls | null = null;
  /** Giriş gecikmesi göstergesi (Ayarlar → Kontroller → Gecikme ölçer). */
  private latencyMeter: LatencyMeter | null = null;
  /** Maç sonucu kayda (istatistik/turnuva) yazıldı mı? */
  private recorded = false;
  /** Duraklatma nedeni satırı (ör. gamepad bağlantısı koptu). */
  private pauseNote: string | null = null;

  // ── Gol tekrarı (Faz 7) ──
  /** Son saniyelerin halka tamponu (antrenmanda ve ayar kapalıyken yok). */
  private recorder: ReplayRecorder | null = null;
  private replayOverlay!: ReplayOverlay;
  /** Oynatılan tekrar (yoksa null). */
  private replay: ReplayPlan | null = null;
  /** Santrada planlanan, bu karenin sonunda başlayacak tekrar. */
  private replayPlan: ReplayPlan | null = null;
  /** Kutlaması süren golün adımı (−1: yok). */
  private pendingGoalTick = -1;
  /** Tekrar bitince geri yüklenecek canlı durum (nesne yeniden kullanılır). */
  private liveState: SimState | undefined;
  private readonly replayLoop = createGameLoop();
  /** Geliştirici oturumu (Faz 2.4: stres sahnesi, rollback ölçer; yayın derlemesinde hep null). */
  private devSession: MatchDevSession | null = null;
  /** `sim.step`'e verilen girdi çifti (her adımda yeni dizi ayrılmasın). */
  private readonly stepInputs: [InputState, InputState] = [EMPTY_INPUT, EMPTY_INPUT];

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
    this.touch = null;
    this.latencyMeter = null;
    latencyProbe.clear();
    this.recorded = false;
    this.pauseNote = null;
    this.inSettings = false;
    this.replay = null;
    this.replayPlan = null;
    this.pendingGoalTick = -1;
    this.replayLoop.reset();
    // Kamera çekirdeği ortalar, kenara sabitli arayüz ekran oranına ve çentiğe göre yerleşir.
    screenLayout(this);

    const fromMenu = typeof data === 'object' && data !== null && 'mode' in data;
    const dev = devAiFlags();
    this.setup = resolveMatchSetup(data, fromMenu ? { cpu: null, cpu1: null, seed: null } : dev);
    // Tohum maç başında bir kez seçilir: Yeniden Başlat aynı kurulumu korur, maç yine farklıdır.
    const seed = this.setup.seed ?? randomSeed();
    const [c1, c2] = this.setup.characters;
    this.characters = [getCharacter(c1), getCharacter(c2)];
    const { mode, difficulty, p1Ai } = this.setup;
    const training = mode === 'training';
    const durationSeconds = devMatchDuration() ?? this.setup.durationSeconds;
    const simOptions: GameSimOptions = {
      rules: training
        ? { durationSeconds: Infinity, goldenGoalOvertime: false }
        : { durationSeconds },
      loadouts: [loadoutFor(c1), loadoutFor(c2)],
      seed: mixSeed(seed, 2),
      skipKickoff: training,
      solo: training,
    };
    this.sim = new GameSim(simOptions);
    this.prevFrame.copyFrom(this.sim);
    this.currFrame.copyFrom(this.sim);
    this.recorder = !training && getSettings().replays ? new ReplayRecorder(this.sim) : null;
    this.names = isCpuMode(mode)
      ? [p1Ai ? cpuName(p1Ai) : t('player.you'), cpuName(difficulty)]
      : training
        ? [t('player.you'), t('player.dummy')]
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
    this.inputs = this.createInputs(seed);
    const stopTouchWatch = onTouchDetected(() => {
      this.createTouchControls();
    });
    const onVisibility = (): void => {
      if (document.hidden) this.autoPause(null);
    };
    document.addEventListener('visibilitychange', onVisibility);
    gamepads.onDisconnect = () => {
      this.autoPause(t('pause.padDisconnected'));
    };
    setInMatch(true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.tracker.detach();
      this.overlay?.destroy();
      this.overlay = null;
      stopTouchWatch();
      document.removeEventListener('visibilitychange', onVisibility);
      gamepads.onDisconnect = null;
      setInMatch(false);
      crowd.stop();
      this.devSession?.destroy();
      this.devSession = null;
    });

    const fixed = devQuality();
    this.governor = new QualityGovernor(fixed ?? sessionQuality(), fixed !== null);
    const baseTags: readonly [string, string] = isCpuMode(mode)
      ? [p1Ai ? t('tag.cpu') : t('tag.p1'), t('tag.cpu')]
      : [t('tag.p1'), t('tag.p2')];
    const tags: readonly [string, string] = [
      `${playerMark(0)}${baseTags[0]}`,
      `${playerMark(1)}${baseTags[1]}`,
    ];
    this.view = new MatchRenderer(this, this.sim, this.characters, tags, this.governor.level, {
      title: t('game.title'),
      goal: t('board.goal'),
    });
    const settings = getSettings();
    this.view.shakeEnabled = settings.screenShake;
    this.view.setAccessibility(ACCESSIBILITY.effects[settings.effects], settings.colorblind);
    if (training) this.view.setPlayerVisible(1, false);
    for (const c of this.characters) {
      this.view.prewarmText(
        upper(t(`super.${c.superType}`)),
        FX.superColors[c.superType],
        HUD.superText,
      );
    }
    for (const type of POWER_UP_TYPES)
      this.view.prewarmText(t(`powerUp.${type}`), FX.powerUpColors[type], HUD.popText);
    const hint = training ? 'match.hintTraining' : isCpuMode(mode) ? 'match.hintCpu' : 'match.hint';
    this.hud = new MatchHud(
      this,
      this.names,
      isTouchDevice() ? '' : t(hint),
      [this.characters[0].superType, this.characters[1].superType],
      this.characters,
      [this.view.rigs[0].face, this.view.rigs[1].face],
      training ? t('match.trainingClock') : null,
    );
    this.hud.update(this.sim.match, this.sim.players);
    this.screenFlash = screenLayout(this)
      .cover(solidRect(this, 0, 0, DISPLAY.width, DISPLAY.height, WHITE, 0))
      .setDepth(HUD.depth - 1);
    this.replayOverlay = new ReplayOverlay(this, () => {
      this.endReplay();
    });
    this.debug = new DebugOverlay(this);
    this.debug.setVisible(wantsDebugOverlay());
    if (isTouchDevice()) this.createTouchControls();
    if (settings.latencyMeter) this.latencyMeter = new LatencyMeter(this);
    devHooks.quality?.(this.governor.level);
    this.devSession =
      devHooks.match?.({
        scene: this,
        sim: this.sim,
        simOptions,
        world: this.view.worldLayer,
        stage: this.view.stageLayer,
        playerPosition: (i) => this.drawFrame.players[i],
      }) ?? null;
    this.cameras.main.fadeIn(HUD.kickoffFadeMs);
    music.play('match');
    crowd.start();
  }

  /**
   * 2 oyuncu: P1 = A/D/W/Space + 1. kol + dokunmatik (sol yarı), P2 = oklar/Enter + 2. kol +
   * dokunmatik (sağ yarı; yalnızca `twoPlayerTouchAllowed`). Tek insanlı
   * modlarda (CPU, turnuva, antrenman) insan P1 her iki tuş takımı, iki kol ve dokunmatikle
   * oynar; P2 yapay zekâ (antrenmanda girdisiz kukla; `?cpu1=` ile P1 de AI). AI yalnızca
   * simülasyonun görünümünü okur.
   */
  private createInputs(seed: number): readonly [InputSource, InputSource] {
    this.ais = [];
    const tr = this.tracker;
    const { p1, p2, pads, touch, touch2 } = CONTROLS;
    const [pad1, pad2] = pads;
    const kb1 = new KeyboardInputSource(tr, p1);
    const kb2 = new KeyboardInputSource(tr, p2);
    const gp1 = new KeyboardInputSource(tr, pad1);
    const gp2 = new KeyboardInputSource(tr, pad2);
    const tc = new KeyboardInputSource(tr, touch);
    const { mode, difficulty, p1Ai } = this.setup;
    if (mode === 'versus') {
      const tc2 = new KeyboardInputSource(tr, touch2);
      return [new MergedInputSource(kb1, gp1, tc), new MergedInputSource(kb2, gp2, tc2)];
    }
    const human = new MergedInputSource(kb1, kb2, gp1, gp2, tc);
    if (mode === 'training') return [human, IDLE_SOURCE];
    const view = (): ReturnType<typeof observe> => observe(this.sim);
    const ai2 = new AiController({ index: 1, difficulty, seed: mixSeed(seed, 1) });
    this.ais.push(ai2);
    let first: InputSource = human;
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
      devHooks.quality?.(this.governor.level);
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
    } else if (this.tracker.consumeAny(ui.pause) || (isTouchDevice() && isPortrait())) {
      this.pause();
      return;
    }
    if (this.replay) {
      this.updateReplay(time, deltaMs);
      return;
    }
    if (this.setup.mode === 'training') this.trainingShortcuts();
    if (this.touch) {
      for (const i of [0, 1] as const) {
        const pl = this.sim.players[i];
        this.touch.setSuperReady(i, pl.power >= 1 || pl.superArmed);
      }
      this.touch.update(time, deltaMs);
    }

    const realDt = Math.min(deltaMs, MAX_FRAME_MS) / UNITS.msPerSecond;
    this.view.rememberBalloon();
    this.trackDecoys();
    const simMs = this.hitStop.filter(deltaMs);
    this.advanceSimulation(simMs);
    if (this.replayPlan) {
      this.startReplay();
      return;
    }
    const worldDt = (Math.min(simMs, MAX_FRAME_MS) / UNITS.msPerSecond) * this.sim.match.timeScale;
    this.view.draw(
      this.drawFrame.lerpFrom(this.prevFrame, this.currFrame, this.loop.alpha),
      realDt,
      worldDt,
      time / UNITS.msPerSecond,
    );
    this.devSession?.frame(realDt, time / UNITS.msPerSecond);
    this.updateCrowd(realDt);
    this.updateCountdown();
    this.hud.update(this.sim.match, this.sim.players);
    // Phaser bu güncellemeden hemen sonra kareyi çizer: basışın görünür olduğu kare.
    latencyProbe.frame(performance.now());
    this.latencyMeter?.update(time);

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
      // Santrada tekrar planlandıysa canlı simülasyon bu karede durur (tekrar bitince sürer).
      if (this.replayPlan) return;
      const start = performance.now();
      this.prevFrame.copyFrom(this.sim);
      const a = this.inputs[0].read(tick);
      const b = this.inputs[1].read(tick);
      latencyProbe.step(performance.now());
      this.devSession?.beforeStep(a, b);
      this.recorder?.record(this.sim.tick, a, b);
      this.stepInputs[0] = a;
      this.stepInputs[1] = b;
      const events = this.sim.step(this.stepInputs);
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
          this.pendingGoalTick = this.sim.tick - 1;
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
          // Önce biten golün tekrarı planlanır, sonra yeni bölüm başlar (tekrar santradan
          // öncesine gitmez).
          this.queueReplay();
          this.recorder?.markSegmentStart(this.sim.tick);
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
          this.queueReplay();
          sfx.whistle('fullTime');
          if (e.reason === 'time') this.hud.onFullTime();
          this.view.onMatchEnd(e.winner);
          if (e.winner !== null) crowd.cheer();
          this.recordResult(e.winner);
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

  /** Tüm ekranda kısa renkli parlama (HUD'un altında); efekt yoğunluğuyla ölçeklenir. */
  private flash(color: number, alpha: number): void {
    const k = ACCESSIBILITY.effects[getSettings().effects].flashes;
    if (k <= 0) return;
    this.tweens.killTweensOf(this.screenFlash);
    this.screenFlash.setTint(color).setAlpha(alpha * k);
    this.tweens.add({
      targets: this.screenFlash,
      alpha: 0,
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
    this.touch?.setEnabled(false);
    this.showPauseMenu();
  }

  /** Sekme gizlenince ya da gamepad kopunca kendiliğinden duraklat (nedeni panelde yazar). */
  private autoPause(note: string | null): void {
    if (this.leaving || this.endShown) return;
    if (this.paused) {
      if (note && !this.inSettings) {
        this.pauseNote = note;
        this.showPauseMenu();
      }
      return;
    }
    this.pauseNote = note;
    this.pause();
  }

  private showPauseMenu(): void {
    this.overlay?.destroy();
    this.inSettings = false;
    const items: TextMenuItem[] = [
      {
        label: t('pause.resume'),
        onSelect: () => {
          this.resume();
        },
      },
    ];
    if (this.setup.mode === 'training') {
      items.push({
        label: () =>
          format('pause.dummy', { state: t(this.sim.solo ? 'settings.off' : 'settings.on') }),
        onSelect: () => {
          this.toggleDummy();
        },
      });
    }
    items.push({
      label: t('pause.settings'),
      onSelect: () => {
        this.showSettings();
      },
    });
    // Turnuvada yeniden başlatma yok (kaybedilen maç silinemesin); antrenmanda gereksiz.
    if (this.setup.mode === 'cpu' || this.setup.mode === 'versus') {
      items.push({
        label: t('pause.restart'),
        onSelect: () => {
          this.restart();
        },
      });
    }
    items.push({
      label: t('pause.mainMenu'),
      onSelect: () => {
        this.toMainMenu();
      },
    });
    this.overlay = new MenuOverlay(this, {
      title: t('pause.title'),
      ...(this.pauseNote ? { lines: [this.pauseNote] } : {}),
      items,
    });
  }

  private showSettings(): void {
    // Menü öğesinin işleyicisi içinden çağrılır: kaplamayı bir sonraki karede değiştir.
    this.time.delayedCall(0, () => {
      this.overlay?.destroy();
      this.inSettings = true;
      this.overlay = new MenuOverlay(this, {
        title: t('settings.soundTitle'),
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
    // Dikey ekranda devam edilemez (uyarı görünür); yan çevrilince yeniden denenir.
    if (isTouchDevice() && isPortrait()) return;
    this.overlay?.destroy();
    this.overlay = null;
    this.paused = false;
    this.inSettings = false;
    this.pauseNote = null;
    this.tracker.releaseAll();
    this.tweens.resumeAll();
    this.touch?.setEnabled(true);
  }

  // ───────────────────────────── Gol tekrarı ─────────────────────────────

  /** Kutlama bitti (santra ya da maç sonu): golün tekrarını planla (ayar kapalıysa yok). */
  private queueReplay(): void {
    const goal = this.pendingGoalTick;
    this.pendingGoalTick = -1;
    if (goal < 0 || !this.recorder) return;
    this.replayPlan = this.recorder.plan(goal, this.sim.tick - 1);
  }

  /** Canlı durumu sakla, anahtar kareyi yükle, tekrar kamerası ve kaplamayla oynat. */
  private startReplay(): void {
    const plan = this.replayPlan;
    this.replayPlan = null;
    if (!plan) return;
    this.liveState = this.sim.saveState(this.liveState);
    this.sim.loadState(plan.state);
    this.replay = plan;
    this.replayLoop.reset();
    this.prevFrame.copyFrom(this.sim);
    this.currFrame.copyFrom(this.sim);
    this.decoyTrack.length = 0;
    this.view.onKickoff();
    this.replayOverlay.show();
    this.touch?.setEnabled(false);
    this.tracker.releaseAll();
    this.cameras.main.fadeIn(REPLAY.fadeMs);
  }

  /**
   * Tekrarın bir karesi: kaydedilen girdilerle deterministik ilerleme (golün çevresinde daha
   * yavaş), topu ortalayan yakın plan kamera. Enter/Space/A ya da "Atla" ile atlanır.
   */
  private updateReplay(time: number, deltaMs: number): void {
    const plan = this.replay;
    if (!plan) return;
    if (this.tracker.consumeAny(CONTROLS.ui.menuConfirm)) {
      this.endReplay();
      return;
    }
    const realDt = Math.min(deltaMs, MAX_FRAME_MS) / UNITS.msPerSecond;
    const slow = Math.abs(this.sim.tick - plan.goalTick) < REPLAY.goalSlowSeconds * LOOP.stepHz;
    const speed = slow ? REPLAY.goalSpeed : REPLAY.speed;
    const state = { done: false };
    this.replayLoop.advance(realDt * speed, () => {
      const inputs = this.recorder?.inputAt(this.sim.tick);
      if (state.done || !inputs || this.sim.tick > plan.endTick) {
        state.done = true;
        return;
      }
      this.prevFrame.copyFrom(this.sim);
      this.stepInputs[0] = inputs[0];
      this.stepInputs[1] = inputs[1];
      const events = this.sim.step(this.stepInputs);
      this.currFrame.copyFrom(this.sim);
      this.handleReplayEvents(events);
    });
    const ball = this.sim.ball;
    const floorY = this.sim.pitch.groundY - REPLAY.groundLiftPx;
    const focusY = ball.y + (floorY - ball.y) * REPLAY.groundBias;
    this.view.camera.track(REPLAY.zoom, ball.x, focusY, REPLAY.tiltRad, REPLAY.followRate, realDt);
    this.view.rememberBalloon();
    this.trackDecoys();
    const seconds = time / UNITS.msPerSecond;
    this.view.draw(
      this.drawFrame.lerpFrom(this.prevFrame, this.currFrame, this.replayLoop.alpha),
      realDt,
      realDt * speed,
      seconds,
    );
    this.replayOverlay.update(seconds);
    if (state.done) this.endReplay();
  }

  /** Tekrarda yalnızca görsel efektler ve vuruş sesleri (skor, HUD, saat, hit-stop yok). */
  private handleReplayEvents(events: readonly SimEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'goal':
          this.view.onGoal(e.scorer);
          sfx.net(BALL.maxSpeed);
          crowd.cheer();
          break;
        case 'kick':
          sfx.kick(Math.min(1, e.speed / BALL.maxSpeed));
          this.view.onKick(e.player, e.speed, e.super);
          break;
        case 'header':
          sfx.header(Math.min(1, e.speed / BALL.maxSpeed));
          this.view.onHeader(e.player, e.speed, this.time.now / UNITS.msPerSecond);
          break;
        case 'ballTouch':
          this.view.onTouch(e.player, e.speed);
          break;
        case 'ballImpact':
          this.onImpact(e.surface, e.speed, e.x, e.y);
          break;
        case 'jump':
          this.view.onJump(e.player, e.air);
          break;
        case 'land':
          this.view.onLand(e.player, e.speed);
          break;
        case 'superLaunch':
          sfx.superShot(e.superType);
          this.view.onSuperLaunch(e.player, e.superType);
          break;
        case 'superHit':
          this.view.onSuperHit(e.player, e.superType);
          break;
        case 'teleportExit':
          this.view.onTeleportExit(e.x, e.y);
          break;
        case 'balloonPop':
          sfx.pop();
          this.view.onBalloonPop(e.player, e.powerUp);
          break;
        case 'balloonExpire':
          this.view.onBalloonExpire();
          break;
        default:
          break;
      }
    }
  }

  /** Tekrar bitti ya da atlandı: canlı durumu (santra) birebir geri yükle. */
  private endReplay(): void {
    if (!this.replay || !this.liveState) return;
    this.sim.loadState(this.liveState);
    this.replay = null;
    this.prevFrame.copyFrom(this.sim);
    this.currFrame.copyFrom(this.sim);
    this.decoyTrack.length = 0;
    this.view.camera.stopTracking();
    this.view.onKickoff();
    this.replayOverlay.hide();
    this.touch?.setEnabled(!this.paused && !this.endShown);
    this.tracker.releaseAll();
    this.cameras.main.fadeIn(REPLAY.fadeMs);
  }

  private createTouchControls(): void {
    if (this.touch) return;
    const { mode } = this.setup;
    this.touch = new TouchControls(this, {
      training: mode === 'training',
      twoPlayer: mode === 'versus' && twoPlayerTouchAllowed(),
    });
    this.touch.setEnabled(!this.paused && !this.endShown);
  }

  /** Antrenman: R/Y topu sıfırla, F/LB süper barını doldur, T/Back kukla rakip. */
  private trainingShortcuts(): void {
    const keys = CONTROLS.training;
    if (this.tracker.consumeAny(keys.resetBall)) {
      this.sim.resetBall();
      this.currFrame.copyFrom(this.sim);
      this.prevFrame.copyFromFrame(this.currFrame);
      sfx.whistle('kickoff');
    }
    if (this.tracker.consumeAny(keys.fillSuper)) {
      this.sim.fillPower(0);
      sfx.superArmed();
    }
    if (this.tracker.consumeAny(keys.toggleDummy)) this.toggleDummy();
  }

  private toggleDummy(): void {
    const solo = !this.sim.solo;
    this.sim.setSolo(solo);
    this.view.setPlayerVisible(1, !solo);
    this.currFrame.copyFrom(this.sim);
    this.prevFrame.copyFromFrame(this.currFrame);
    sfx.menuMove();
  }

  /**
   * Maç bitti: istatistikler ve (turnuvada) turnuva ilerlemesi hemen kaydedilir; sonuç ekranından
   * çıkmadan sayfa kapansa bile kaybolmaz. Antrenman ve AI vs AI kaydedilmez.
   */
  private recordResult(winner: PlayerIndex | null): void {
    if (this.recorded || this.setup.p1Ai) return;
    this.recorded = true;
    const { mode } = this.setup;
    const [a, b] = this.sim.match.score;
    saveMatchResult({ mode, score: [a, b], winner });
    if (mode !== 'tournament') return;
    const state = getSavedTournament();
    if (state?.status !== 'active') return;
    const next = applyPlayerResult(state, a, b);
    setSavedTournament(next);
    if (next.status === 'won') saveTournamentWin();
  }

  private showEndScreen(): void {
    this.endShown = true;
    this.tracker.releaseAll();
    const match = this.sim.match;
    const winner: PlayerIndex | null = match.winner;
    const [a, b] = match.score;
    const lines = [`${upper(this.names[0])}  ${a} – ${b}  ${upper(this.names[1])}`];
    if (match.endReason === 'goldenGoal') lines.push(t('end.byGoldenGoal'));
    this.touch?.setEnabled(false);
    const items: TextMenuItem[] =
      this.setup.mode === 'tournament'
        ? [
            {
              label: t('tournament.continue'),
              onSelect: () => {
                this.leaveTo(SceneKeys.Tournament, { justPlayed: true });
              },
            },
          ]
        : [
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
          ];
    this.overlay = new MenuOverlay(this, {
      title:
        winner === null ? t('end.draw') : upper(format('end.winner', { name: this.names[winner] })),
      ...(winner === null ? {} : { titleColor: playerColorHex(winner) }),
      lines,
      items,
    });
  }

  private restart(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.tweens.resumeAll();
    this.scene.restart(this.setup);
  }

  private toMainMenu(): void {
    this.leaveTo(SceneKeys.Menu, {});
  }

  private leaveTo(key: string, data: object): void {
    if (this.leaving) return;
    this.leaving = true;
    this.tweens.resumeAll();
    this.cameras.main.fadeOut(HUD.exitFadeMs);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(key, data);
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
