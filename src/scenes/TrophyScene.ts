import Phaser from 'phaser';
import { crowd } from '../audio/Crowd';
import { music } from '../audio/Music';
import { sfx } from '../audio/Sfx';
import { hex } from '../art/canvas';
import { STAGE_KEYS } from '../art/stadiumArt';
import { trophyTexture } from '../art/trophyArt';
import { addPanel, goldFill, textStyle } from '../art/uiArt';
import {
  CONTROLS,
  DISPLAY,
  KICK,
  MENU,
  OVERLAY,
  PITCH,
  TROPHY,
  UI_THEME,
  UNITS,
} from '../config/gameConfig';
import {
  getCharacter,
  isCharacterId,
  paramsFromStats,
  type CharacterDef,
} from '../game/characters';
import { PLAYER_STAND_OFFSET } from '../game/entities/Player';
import { DEFAULT_MATCH_SETUP, type MatchSetup } from '../game/matchSetup';
import { format, t, upper } from '../i18n';
import { KeyTracker } from '../input/KeyboardInput';
import { getSettings } from '../save/gameSettings';
import { getProgress, isUnlocked } from '../save/progress';
import { CharacterRig, type RigPose } from '../ui/CharacterRig';
import { ParticleLayer } from '../ui/ParticleLayer';
import { StadiumView } from '../ui/StadiumView';
import { TextMenu } from '../ui/TextMenu';
import { sessionQuality } from '../fx/feel';
import { SceneKeys } from './sceneKeys';

/** Sık kullanılan renkler. */
const GOLD = 0xffd23f;
const WHITE = 0xffffff;

interface TrophyData {
  readonly player?: unknown;
  readonly reward?: unknown;
}

function pose(def: CharacterDef, x: number, y: number, facing: 1 | -1): RigPose {
  return {
    x,
    y,
    headRadius: paramsFromStats(def.stats).headRadius,
    footAngle: KICK.restAngle,
    facing,
    vx: 0,
    vy: 0,
    grounded: true,
    maxSpeed: 1,
    kick: 0,
    frozen: false,
    armed: false,
  };
}

/**
 * Kupa ekranı (Faz 6): turnuva şampiyonluğu. Ortada altın kupa (kodla çizilir), solda sevinçten
 * zıplayan şampiyon karakter, sağda yeni açılan karakterin kartı (ya da "hepsi açık"); konfeti,
 * havai fişek, tezahürat eden kalabalık ve korna. Yeni Turnuva / Ana Menü.
 */
export class TrophyScene extends Phaser.Scene {
  private tracker!: KeyTracker;
  private menu!: TextMenu;
  private stadium!: StadiumView;
  private particles!: ParticleLayer;
  private champion!: CharacterRig;
  private championDef!: CharacterDef;
  private unlocked: { rig: CharacterRig; def: CharacterDef } | null = null;
  private confettiTimer = 0;
  private fireworksTimer = 0;
  private jumpTimer = 0;
  private leaving = false;

  constructor() {
    super(SceneKeys.Trophy);
  }

  create(data?: TrophyData): void {
    this.leaving = false;
    this.unlocked = null;
    this.confettiTimer = 0;
    this.fireworksTimer = 0;
    this.jumpTimer = 0;
    const playerId = isCharacterId(data?.player) ? data.player : 'kor';
    const rewardId = isCharacterId(data?.reward) ? data.reward : null;
    this.championDef = getCharacter(playerId);
    const { ui } = CONTROLS;
    this.tracker = new KeyTracker(
      window,
      new Set<string>([...ui.menuUp, ...ui.menuDown, ...ui.menuConfirm, ...ui.menuBack]),
    ).attach();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.tracker.detach();
    });

    const world = this.add.container(0, 0);
    const c = this.championDef.palette;
    this.stadium = new StadiumView(this, world, {
      leftColors: [c.body, c.accent],
      rightColors: [c.body, c.accent],
      quality: sessionQuality(),
      title: t('game.title'),
      goalText: t('tournament.champion'),
    });
    this.stadium.celebrate(0, CELEBRATE_SECONDS);
    this.stadium.celebrate(1, CELEBRATE_SECONDS);
    const shadows = this.add.container(0, 0);
    const actors = this.add.container(0, 0);
    const fxNormal = this.add.container(0, 0);
    const fxAdd = this.add.container(0, 0);
    world.add([shadows, actors, fxNormal, fxAdd]);
    this.particles = new ParticleLayer(this, fxNormal, fxAdd, sessionQuality());
    this.add.image(0, 0, STAGE_KEYS.vignette).setOrigin(0);

    const title = this.add
      .text(
        DISPLAY.width / 2,
        TROPHY.titleY,
        upper(t('tournament.champion')),
        textStyle(TROPHY.titleFontSizePx, '#ffffff', TITLE_STROKE),
      )
      .setOrigin(0.5)
      .setDepth(2);
    goldFill(title);
    this.tweens.add({
      targets: title,
      scale: TITLE_PULSE,
      duration: MENU.title.pulseMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    const cup = TROPHY.cup;
    const trophy = this.add
      .image(cup.x, cup.y, trophyTexture(this, cup.width, cup.height))
      .setDepth(2);
    trophy.setScale(0);
    this.tweens.add({ targets: trophy, scale: 1, duration: CUP_POP_MS, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: trophy,
      angle: CUP_WOBBLE,
      duration: CUP_WOBBLE_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: CUP_POP_MS,
    });
    this.add
      .text(
        cup.x,
        cup.y + cup.height / 2 + INFO_GAP,
        format('tournament.championInfo', { n: getProgress().stats.tournamentsWon }),
        textStyle(INFO_FONT, '#ffffff', TEXT_STROKE),
      )
      .setOrigin(0.5)
      .setDepth(2);

    this.champion = new CharacterRig(this, this.championDef, {
      shadowLayer: shadows,
      groundY: PITCH.groundY,
    });
    this.champion.scale = TROPHY.champion.rigScale;
    this.champion.face.setPersistent('happy');
    actors.add(this.champion.root);
    this.createUnlockCard(rewardId);

    this.menu = new TextMenu(
      this,
      DISPLAY.width / 2,
      TROPHY.menu.top,
      [
        {
          label: t('tournament.newTournament'),
          onSelect: () => {
            const s = getSettings();
            const setup: MatchSetup = {
              ...DEFAULT_MATCH_SETUP,
              mode: 'tournament',
              difficulty: s.difficulty,
              durationSeconds: s.matchSeconds,
            };
            this.leave(SceneKeys.Select, setup);
          },
        },
        {
          label: t('pause.mainMenu'),
          onSelect: () => {
            this.leave(SceneKeys.Menu, {});
          },
        },
      ],
      {
        fontFamily: MENU.fontFamily,
        fontSizePx: TROPHY.menu.fontSizePx,
        spacingPx: TROPHY.menu.spacingPx,
        strokePx: MENU_STROKE,
        color: OVERLAY.items.color,
        selectedColor: OVERLAY.items.selectedColor,
        selectedScale: UI_THEME.button.selectedScale,
        depth: 3,
        buttonWidth: TROPHY.menu.buttonWidth,
      },
    );

    this.cameras.main.fadeIn(MENU.startFadeMs);
    music.play('menu');
    crowd.start();
    crowd.cheer();
    sfx.horn();
    this.burstConfetti();
  }

  private createUnlockCard(rewardId: CharacterDef['id'] | null): void {
    const u = TROPHY.unlock;
    addPanel(this, u.x, u.y, u.width, u.height, 'overlay', UI_THEME.radius).setDepth(2);
    const top = u.y - u.height / 2;
    const reward = rewardId && isUnlocked(rewardId) ? getCharacter(rewardId) : null;
    this.add
      .text(u.x, top + CARD_PAD, reward ? t('tournament.unlocked') : t('tournament.allUnlocked'), {
        ...textStyle(TROPHY.unlockFontSizePx, UI_THEME.text.gold[1], CARD_STROKE),
        align: 'center',
        wordWrap: { width: u.width - CARD_PAD * 2 },
      })
      .setOrigin(0.5, 0)
      .setDepth(CARD_DEPTH);
    if (!reward) return;
    const rig = new CharacterRig(this, reward);
    rig.scale = u.rigScale;
    rig.root.setDepth(CARD_DEPTH);
    rig.face.setPersistent('happy');
    this.unlocked = { rig, def: reward };
    const bottom = u.y + u.height / 2;
    this.add
      .text(
        u.x,
        bottom - CARD_PAD - NAME_LIFT,
        upper(reward.name),
        textStyle(TROPHY.nameFontSizePx, hex(reward.palette.accent), NAME_STROKE),
      )
      .setOrigin(0.5, 1)
      .setDepth(CARD_DEPTH);
    this.add
      .text(
        u.x,
        bottom - CARD_PAD,
        upper(t(`super.${reward.superType}`)),
        textStyle(INFO_FONT, '#ffffff', TEXT_STROKE),
      )
      .setOrigin(0.5, 1)
      .setDepth(CARD_DEPTH);
  }

  override update(time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, MAX_FRAME_MS) / UNITS.msPerSecond;
    const seconds = time / UNITS.msPerSecond;
    this.stadium.update(dt, seconds);
    this.particles.update(dt);
    // Şampiyon aralıklarla sevinçle zıplar.
    this.jumpTimer -= dt;
    if (this.jumpTimer <= 0) {
      this.jumpTimer = TROPHY.champion.jumpEverySeconds;
      this.champion.anim.onJump();
    }
    const headY = PITCH.groundY - PLAYER_STAND_OFFSET * TROPHY.champion.rigScale;
    this.champion.face.update(dt, { frozen: false, straining: false, armed: false });
    this.champion.update(
      dt,
      pose(this.championDef, TROPHY.champion.x, headY, 1),
      { x: TROPHY.cup.x, y: TROPHY.cup.y },
      seconds,
    );
    if (this.unlocked) {
      const u = TROPHY.unlock;
      const { rig, def } = this.unlocked;
      rig.face.update(dt, { frozen: false, straining: false, armed: true });
      rig.update(
        dt,
        pose(def, u.x, u.y - u.height / 2 + u.height * u.headYRatio, -1),
        null,
        seconds,
      );
    }
    this.confettiTimer -= dt;
    if (this.confettiTimer <= 0) {
      this.confettiTimer = TROPHY.confettiEverySeconds;
      this.burstConfetti();
    }
    this.fireworksTimer -= dt;
    if (this.fireworksTimer <= 0) {
      this.fireworksTimer = TROPHY.fireworksEverySeconds;
      const x = FW_MARGIN + Math.random() * (DISPLAY.width - FW_MARGIN * 2);
      const y = FW_TOP + Math.random() * FW_SPAN;
      this.particles.burst('fireworks', x, y, {
        color: this.colors()[Math.floor(Math.random() * this.colors().length)],
      });
    }
    if (this.leaving) return;
    if (this.tracker.consumeAny(CONTROLS.ui.menuBack)) {
      this.leave(SceneKeys.Menu, {});
      return;
    }
    this.menu.update(this.tracker);
  }

  private colors(): number[] {
    const c = this.championDef.palette;
    return [c.body, c.accent, GOLD, WHITE];
  }

  private burstConfetti(): void {
    this.particles.burst('confettiRain', Math.random() * DISPLAY.width, -CONFETTI_TOP, {
      colors: this.colors(),
    });
  }

  private leave(key: string, data: object): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(MENU.startFadeMs);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(key, data);
    });
  }
}

const MAX_FRAME_MS = 100;
const CELEBRATE_SECONDS = 600;
const TITLE_STROKE = 12;
const TITLE_PULSE = 1.05;
const CUP_POP_MS = 600;
const CUP_WOBBLE = 4;
const CUP_WOBBLE_MS = 1400;
const INFO_GAP = 22;
const INFO_FONT = 20;
const CARD_PAD = 22;
const NAME_LIFT = 30;
const MENU_STROKE = 5;
const FW_MARGIN = 120;
const FW_TOP = 60;
const FW_SPAN = 200;
const CONFETTI_TOP = 20;
const TEXT_STROKE = 3;
const CARD_STROKE = 4;
const NAME_STROKE = 5;
const CARD_DEPTH = 3;
