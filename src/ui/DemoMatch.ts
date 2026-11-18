import type Phaser from 'phaser';
import { attackDanger } from '../audio/crowdMood';
import { BALL, CROWD, MENU, UNITS, type AiDifficulty } from '../config/gameConfig';
import { HitStop, hitStopForSpeed, sessionQuality } from '../fx/feel';
import { approach } from '../fx/Spring';
import { AiController, AiInputSource } from '../game/ai/AiController';
import { mixSeed } from '../game/ai/random';
import { observe } from '../game/ai/worldView';
import { loadoutFor, type CharacterDef } from '../game/characters';
import { GameSim } from '../game/GameSim';
import type { SimEvent } from '../game/types';
import { t } from '../i18n';
import type { InputSource } from '../input/InputState';
import { createGameLoop } from '../physics';
import { MatchRenderer } from './MatchRenderer';
import { RenderFrame } from './renderFrame';

/**
 * Ana menünün arka planındaki canlı AI vs AI maçı (Faz 6): gerçek GameSim + iki yapay zekâ +
 * maç çizimi (`MatchRenderer`). Süresiz oynanır (saat yok); goller, süperler, balonlar ve tüm
 * görsel efektler maçtakiyle aynıdır. Ses yalnızca kalabalık uğultusu (tehlikeyle) — efekt
 * sesleri menüde çalınmaz. Görsel bir süstür; sonuçları hiçbir yere yazılmaz.
 */
export class DemoMatch {
  private readonly loop = createGameLoop();
  private readonly sim: GameSim;
  private readonly view: MatchRenderer;
  private readonly inputs: readonly [InputSource, InputSource];
  private readonly hitStop = new HitStop();
  private readonly prev = new RenderFrame();
  private readonly curr = new RenderFrame();
  private readonly draw = new RenderFrame();
  private danger = 0;

  constructor(scene: Phaser.Scene, characters: readonly [CharacterDef, CharacterDef]) {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
    const [c1, c2] = characters;
    this.sim = new GameSim({
      rules: { durationSeconds: Infinity, goldenGoalOvertime: false },
      loadouts: [loadoutFor(c1.id), loadoutFor(c2.id)],
      seed: mixSeed(seed, 2),
    });
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
    this.view = new MatchRenderer(scene, this.sim, characters, ['', ''], sessionQuality(), {
      title: t('game.title'),
      goal: t('board.goal'),
    });
    this.view.setTagsVisible(false);
    this.prev.copyFrom(this.sim);
    this.curr.copyFrom(this.sim);
  }

  /** Atak tehlikesi (0–1): menüdeki kalabalık uğultusu buna bağlanır. */
  get excitement(): number {
    return this.danger;
  }

  update(time: number, deltaMs: number): void {
    const realDt = Math.min(deltaMs, MAX_FRAME_MS) / UNITS.msPerSecond;
    this.view.rememberBalloon();
    const simMs = this.hitStop.filter(deltaMs);
    const scale = this.sim.match.timeScale;
    this.loop.advance((simMs / UNITS.msPerSecond) * scale, (_dt, tick) => {
      this.prev.copyFrom(this.sim);
      const events = this.sim.step([this.inputs[0].read(tick), this.inputs[1].read(tick)]);
      this.curr.copyFrom(this.sim);
      this.handle(events, time / UNITS.msPerSecond);
    });
    const worldDt = (Math.min(simMs, MAX_FRAME_MS) / UNITS.msPerSecond) * scale;
    this.view.draw(
      this.draw.lerpFrom(this.prev, this.curr, this.loop.alpha),
      realDt,
      worldDt,
      time / UNITS.msPerSecond,
    );
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
    this.danger = approach(this.danger, target, CROWD.danger.rate, realDt);
    this.view.setExcitement(this.danger);
  }

  /** Yalnızca görsel olaylar (ses yok). */
  private handle(events: readonly SimEvent[], seconds: number): void {
    const v = this.view;
    for (const e of events) {
      switch (e.type) {
        case 'goal':
          v.onGoal(e.scorer);
          break;
        case 'kickoff':
          this.prev.copyFromFrame(this.curr);
          v.onKickoff();
          break;
        case 'kick': {
          v.onKick(e.player, e.speed, e.super);
          const stop = hitStopForSpeed(e.speed, BALL.maxSpeed);
          if (stop > 0) this.hitStop.trigger(stop);
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
  }
}

const MAX_FRAME_MS = 100;
