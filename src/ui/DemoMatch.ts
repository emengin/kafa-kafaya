import type Phaser from 'phaser';
import { attackDanger } from '../audio/crowdMood';
import { BALL, CROWD, JUICE, MENU, UNITS, type AiDifficulty } from '../config/gameConfig';
import { hitStopForSpeed, sessionQuality } from '../fx/feel';
import { approach } from '../fx/Spring';
import { AiController, AiInputSource } from '../game/ai/AiController';
import { mixSeed } from '../game/ai/random';
import { observe } from '../game/ai/worldView';
import { loadoutFor, type CharacterDef } from '../game/characters';
import { GameSim, type GameSimOptions } from '../game/GameSim';
import type { SimEvent } from '../game/types';
import { t } from '../i18n';
import type { InputSource } from '../input/InputState';
import { createGameLoop } from '../physics';
import { MatchRenderer } from './MatchRenderer';
import { PresentationTimeline } from './PresentationTimeline';

/**
 * Ana menünün arka planındaki canlı AI vs AI maçı (Faz 6): gerçek GameSim + iki yapay zekâ +
 * maç çizimi (`MatchRenderer`). Süresiz oynanır (saat yok); goller, süperler, balonlar ve tüm
 * görsel efektler maçtakiyle aynıdır. Ses yalnızca kalabalık uğultusu (tehlikeyle) — efekt
 * sesleri menüde çalınmaz. Görsel bir süstür; sonuçları hiçbir yere yazılmaz. Hit-stop ve gol sonrası
 * ağır çekim maçtaki gibi yalnızca görüntüde (`PresentationTimeline`, Faz 2.7).
 */
export class DemoMatch {
  private readonly loop = createGameLoop();
  private readonly sim: GameSim;
  private readonly view: MatchRenderer;
  private readonly inputs: readonly [InputSource, InputSource];
  private readonly timeline: PresentationTimeline;
  private danger = 0;
  private seconds = 0;

  constructor(scene: Phaser.Scene, characters: readonly [CharacterDef, CharacterDef]) {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
    const [c1, c2] = characters;
    const options: GameSimOptions = {
      rules: { durationSeconds: Infinity, goldenGoalOvertime: false },
      loadouts: [loadoutFor(c1.id), loadoutFor(c2.id)],
      seed: mixSeed(seed, 2),
    };
    this.sim = new GameSim(options);
    this.timeline = new PresentationTimeline(options);
    this.timeline.reset(this.sim);
    const level: AiDifficulty = MENU.demo.difficulty;
    const view = (): ReturnType<typeof observe> => observe(this.sim);
    this.inputs = [
      new AiInputSource(
        new AiController({ index: 0, difficulty: level, seed: mixSeed(seed, 0) }),
        view,
      ),
      new AiInputSource(
        new AiController({ index: 1, difficulty: level, seed: mixSeed(seed, 1) }),
        view,
      ),
    ];
    this.view = new MatchRenderer(
      scene,
      this.timeline.view,
      characters,
      ['', ''],
      sessionQuality(),
      {
        title: t('game.title'),
        goal: t('board.goal'),
      },
    );
    this.view.setTagsVisible(false);
  }

  /** Atak tehlikesi (0–1): menüdeki kalabalık uğultusu buna bağlanır. */
  get excitement(): number {
    return this.danger;
  }

  update(time: number, deltaMs: number): void {
    const realDt = Math.min(deltaMs, MAX_FRAME_MS) / UNITS.msPerSecond;
    this.seconds = time / UNITS.msPerSecond;
    this.loop.advance(deltaMs / UNITS.msPerSecond, (_dt, tick) => {
      const events = this.sim.step([this.inputs[0].read(tick), this.inputs[1].read(tick)]);
      this.timeline.record(this.sim, events);
      if (events.some((e) => e.type === 'kickoff')) this.timeline.jumpToLive();
    });
    this.view.rememberBalloon();
    const worldDt = this.timeline.advance(realDt, this.loop.alpha, this.handle);
    this.view.draw(this.timeline.frame, realDt, worldDt, this.seconds);
    const shown = this.timeline.view;
    const b = shown.ball;
    const [left, right] = shown.pitch.goals;
    const target = shown.match.goalsAllowed
      ? attackDanger({
          ballX: b.x,
          ballY: b.y,
          ballVx: b.vx,
          groundY: shown.pitch.groundY,
          leftLineX: left.lineX,
          rightLineX: right.lineX,
        })
      : 0;
    this.danger = approach(this.danger, target, CROWD.danger.rate, realDt);
    this.view.setExcitement(this.danger);
  }

  /** Yalnızca görsel olaylar (ses yok); görüntü o adıma varınca teslim edilir. */
  private readonly handle = (events: readonly SimEvent[], skipped: boolean): void => {
    const v = this.view;
    const seconds = this.seconds;
    for (const e of events) {
      if (skipped && e.type !== 'kickoff' && e.type !== 'goal') continue;
      switch (e.type) {
        case 'goal':
          v.onGoal(e.scorer);
          if (!skipped) this.timeline.slowMo(JUICE.goalSlowMo.seconds, JUICE.goalSlowMo.scale);
          break;
        case 'kickoff':
          v.onKickoff();
          break;
        case 'kick': {
          v.onKick(e.player, e.speed, e.super);
          const stop = hitStopForSpeed(e.speed, BALL.maxSpeed);
          if (stop > 0) this.timeline.hitStop(stop);
          break;
        }
        case 'header':
          v.onHeader(e.player, e.speed, seconds);
          break;
        case 'ballTouch':
          v.onTouch(e.player, e.speed);
          break;
        case 'ballImpact':
          v.onImpact(e.surface, e.speed, e.x, e.y);
          break;
        case 'jump':
          v.onJump(e.player, e.air);
          break;
        case 'land':
          v.onLand(e.player, e.speed);
          break;
        case 'superLaunch':
          v.onSuperLaunch(e.player, e.superType);
          break;
        case 'superHit':
          v.onSuperHit(e.player, e.superType);
          break;
        case 'teleportExit':
          v.onTeleportExit(e.x, e.y);
          break;
        case 'balloonPop':
          v.onBalloonPop(e.player, e.powerUp);
          break;
        case 'balloonExpire':
          v.onBalloonExpire();
          break;
        default:
          break;
      }
    }
  };
}

const MAX_FRAME_MS = 100;
