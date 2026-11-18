import Phaser from 'phaser';
import { crowd } from '../audio/Crowd';
import { music } from '../audio/Music';
import { sfx } from '../audio/Sfx';
import { hex } from '../art/canvas';
import { STAGE_KEYS } from '../art/stadiumArt';
import { trophyTexture } from '../art/trophyArt';
import { goldFill, panelTexture, textStyle } from '../art/uiArt';
import {
  BRACKET,
  CONTROLS,
  DISPLAY,
  HUD,
  MENU,
  OVERLAY,
  SELECT,
  UI_THEME,
  UNITS,
} from '../config/gameConfig';
import { getCharacter, type CharacterId } from '../game/characters';
import { DEFAULT_MATCH_SETUP, type MatchSetup } from '../game/matchSetup';
import {
  currentRound,
  eliminatedIn,
  getSavedTournament,
  PLAYER_SLOT,
  playerMatch,
  setSavedTournament,
  winnerOf,
  type TournamentState,
} from '../game/tournament';
import { format, t, upper } from '../i18n';
import { KeyTracker } from '../input/KeyboardInput';
import { getSettings } from '../save/gameSettings';
import { CharacterRig } from '../ui/CharacterRig';
import { StadiumView } from '../ui/StadiumView';
import { TextMenu, type TextMenuItem } from '../ui/TextMenu';
import { sessionQuality, type QualityLevel } from '../fx/feel';
import { SceneKeys } from './sceneKeys';

interface TournamentData {
  /** Az önce oynanan maçın sonucu ağaçta belirsin (kısa animasyon). */
  readonly justPlayed?: boolean;
}

/** Ağaçtaki bir kutu: tur, sıradaki konum ve (biliniyorsa) slot. */
interface BoxView {
  readonly x: number;
  readonly y: number;
  readonly slot: number | null;
  readonly rig: CharacterRig | null;
}

const ROUNDS = 3;

/** Saydamlığı ayarlanabilen ve veri taşıyan nesne (kutu parçaları). */
type Faded = Phaser.GameObjects.GameObject & { setAlpha(value: number): unknown };

/**
 * Turnuva eleme ağacı (Faz 6): 8 kutu (çeyrek final) iki yanda, yarı final ve final ortaya doğru;
 * ortada kupa. Kazananların yolu altın çizgiyle, elenenler soluk; oyuncunun kutuları kendi
 * renginde çerçeveli. Kutularda karakterin canlı portresi, isim ve skor. Altta: Maça Başla /
 * Ana Menü / Turnuvadan Çekil; elendiyse "ELENDİN" + Yeni Turnuva; şampiyonlukta kupa ekranına
 * geçer. İlerleme her maçtan sonra kayıtlıdır; menüden "Turnuvaya Devam" ile dönülür.
 */
export class TournamentScene extends Phaser.Scene {
  private tracker!: KeyTracker;
  private menu: TextMenu | null = null;
  private stadium!: StadiumView;
  private boxes: BoxView[] = [];
  private state!: TournamentState;
  private leaving = false;

  constructor() {
    super(SceneKeys.Tournament);
  }

  create(data?: TournamentData): void {
    this.leaving = false;
    this.menu = null;
    this.boxes = [];
    const state = getSavedTournament();
    if (!state) {
      this.scene.start(SceneKeys.Menu);
      return;
    }
    this.state = state;
    const { ui } = CONTROLS;
    this.tracker = new KeyTracker(
      window,
      new Set<string>([...ui.menuUp, ...ui.menuDown, ...ui.menuConfirm, ...ui.menuBack]),
    ).attach();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.tracker.detach();
    });

    const world = this.add.container(0, 0);
    const me = getCharacter(this.slotId(PLAYER_SLOT));
    this.stadium = new StadiumView(this, world, {
      leftColors: [me.palette.body, me.palette.accent],
      rightColors: [],
      quality: Math.min(1, sessionQuality()) as QualityLevel,
      title: t('game.title'),
      goalText: t('board.goal'),
    });
    this.add
      .rectangle(0, 0, DISPLAY.width, DISPLAY.height, SELECT.dimColor, BRACKET.dimAlpha)
      .setOrigin(0);
    this.add.image(0, 0, STAGE_KEYS.vignette).setOrigin(0);
    const title = this.add
      .text(
        DISPLAY.width / 2,
        BRACKET.titleY,
        upper(t('tournament.title')),
        textStyle(BRACKET.titleFontSizePx, '#ffffff'),
      )
      .setOrigin(0.5);
    goldFill(title);

    const lines = this.add.graphics();
    this.drawBracket(lines, data?.justPlayed === true);
    this.add
      .image(
        DISPLAY.width / 2,
        BRACKET.trophy.y,
        trophyTexture(this, BRACKET.trophy.size, BRACKET.trophy.size),
      )
      .setAlpha(state.status === 'won' ? 1 : TROPHY_IDLE_ALPHA);
    this.add
      .text(
        DISPLAY.width / 2,
        this.boxY(2, 0),
        t('tournament.vs'),
        textStyle(BRACKET.vsFontSizePx, '#ffffff'),
      )
      .setOrigin(0.5);
    this.showStatus();

    this.cameras.main.fadeIn(MENU.startFadeMs);
    music.play('menu');
    crowd.start();
    crowd.setIntensity(0);
    if (data?.justPlayed && state.status !== 'lost') this.stadium.cheer(0);
  }

  override update(time: number, deltaMs: number): void {
    if (this.boxes.length === 0) return;
    const dt = Math.min(deltaMs, MAX_FRAME_MS) / UNITS.msPerSecond;
    const seconds = time / UNITS.msPerSecond;
    this.stadium.update(dt, seconds);
    for (const box of this.boxes) {
      if (!box.rig) continue;
      box.rig.face.update(dt, { frozen: false, straining: false, armed: false });
      const side = box.x < DISPLAY.width / 2 ? 1 : -1;
      box.rig.drawPortrait(
        box.x - BRACKET.box.width / 2 + BRACKET.box.portraitX,
        box.y,
        BRACKET.box.portraitR,
        side,
        seconds,
      );
    }
    if (this.leaving) return;
    if (this.tracker.consumeAny(CONTROLS.ui.menuBack)) {
      sfx.menuBack();
      this.leave(SceneKeys.Menu, {});
      return;
    }
    this.menu?.update(this.tracker);
  }

  private slotId(slot: number): CharacterId {
    return this.state.entrants[slot] ?? 'kor';
  }

  // ───────────────────────────── Yerleşim ─────────────────────────────

  /** Turdaki kutu sayısı: 8, 4, 2. */
  private count(round: number): number {
    return this.state.entrants.length >> round;
  }

  private boxX(round: number, k: number): number {
    const x = BRACKET.columnsX[round] ?? 0;
    return k < this.count(round) / 2 ? x : DISPLAY.width - x;
  }

  private boxY(round: number, k: number): number {
    const half = this.count(round) / 2;
    const j = k % half;
    if (round === 0) return BRACKET.quarterY[j] ?? 0;
    return (this.boxY(round - 1, j * 2) + this.boxY(round - 1, j * 2 + 1)) / 2;
  }

  /** Turdaki k. kutunun slotu (tur henüz kurulmadıysa null). */
  private slotAt(round: number, k: number): number | null {
    const m = this.state.rounds[round]?.[k >> 1];
    if (!m) return null;
    return k % 2 === 0 ? m.a : m.b;
  }

  /** Slotun o turdaki golleri (maç oynanmadıysa null). */
  private goalsAt(round: number, k: number): number | null {
    const m = this.state.rounds[round]?.[k >> 1];
    if (!m?.score) return null;
    return k % 2 === 0 ? m.score[0] : m.score[1];
  }

  // ───────────────────────────── Çizim ─────────────────────────────

  private drawBracket(g: Phaser.GameObjects.Graphics, reveal: boolean): void {
    const latest = this.latestDecided();
    for (let r = 0; r < ROUNDS; r++) {
      for (let k = 0; k < this.count(r); k++) this.drawConnector(g, r, k);
    }
    for (let r = 0; r < ROUNDS; r++) {
      for (let k = 0; k < this.count(r); k++) {
        const objs = this.drawBox(r, k);
        // Az önce sonuçlanan turun skorları ve yeni kurulan turun kutuları belirerek gelir.
        if (reveal && (r === latest + 1 || r === latest)) {
          const delay = r === latest ? 0 : BRACKET.revealMs;
          for (const o of objs) {
            o.setAlpha(0);
            this.tweens.add({
              targets: o,
              alpha: o.getData('alpha') as number,
              duration: BRACKET.revealMs,
              delay,
            });
          }
        }
      }
    }
  }

  /** Son sonuçlanan tur (hiç yoksa −1). */
  private latestDecided(): number {
    let last = -1;
    this.state.rounds.forEach((round, r) => {
      if (round.some((m) => m.score !== null)) last = r;
    });
    return last;
  }

  /** Kutudan bir sonraki turdaki kutuya dirsek çizgi (kazandıysa altın). */
  private drawConnector(g: Phaser.GameObjects.Graphics, r: number, k: number): void {
    const bw = BRACKET.box.width / 2;
    const x = this.boxX(r, k);
    const y = this.boxY(r, k);
    const left = x < DISPLAY.width / 2;
    const slot = this.slotAt(r, k);
    const m = this.state.rounds[r]?.[k >> 1];
    const won = slot !== null && m !== undefined && winnerOf(m) === slot;
    g.lineStyle(
      BRACKET.lineWidthPx,
      won ? BRACKET.winColor : BRACKET.lineColor,
      won ? 1 : BRACKET.lineAlpha,
    );
    const from = left ? x + bw : x - bw;
    if (r === ROUNDS - 1) {
      // Final: kazanan kupaya bağlanır.
      const cx = DISPLAY.width / 2;
      g.lineBetween(from, y, cx, y);
      if (won) g.lineBetween(cx, y, cx, BRACKET.trophy.y + BRACKET.trophy.size / 2);
      return;
    }
    const nx = this.boxX(r + 1, k >> 1);
    const ny = this.boxY(r + 1, k >> 1);
    const to = left ? nx - bw : nx + bw;
    const mid = (from + to) / 2;
    g.beginPath();
    g.moveTo(from, y);
    g.lineTo(mid, y);
    g.lineTo(mid, ny);
    g.lineTo(to, ny);
    g.strokePath();
  }

  private drawBox(r: number, k: number): Faded[] {
    const b = BRACKET.box;
    const x = this.boxX(r, k);
    const y = this.boxY(r, k);
    const slot = this.slotAt(r, k);
    const objs: Faded[] = [];
    const bg = this.add.image(
      x,
      y,
      panelTexture(this, b.width, b.height, slot === null ? 'dark' : 'card', b.radius),
    );
    objs.push(bg);
    if (slot === null) {
      objs.push(
        this.add
          .text(x, y, '?', textStyle(BRACKET.nameFontSizePx, '#ffffff', TEXT_STROKE))
          .setOrigin(0.5),
      );
      this.boxes.push({ x, y, slot, rig: null });
      return this.withAlpha(objs, 1);
    }
    const def = getCharacter(this.slotId(slot));
    const out = eliminatedIn(this.state, slot);
    const dim = out !== null && out <= r ? BRACKET.eliminatedAlpha : 1;
    const isPlayer = slot === PLAYER_SLOT;
    if (isPlayer) {
      const color = Phaser.Display.Color.HexStringToColor(HUD.playerColors[0]).color;
      const frame = this.add.graphics();
      frame.lineStyle(PLAYER_FRAME, color, 1);
      frame.strokeRoundedRect(x - b.width / 2, y - b.height / 2, b.width, b.height, b.radius);
      objs.push(frame);
    }
    const rig = new CharacterRig(this, def, { headOnly: true });
    rig.root.setAlpha(dim);
    const name = upper(def.name);
    objs.push(
      this.add
        .text(
          x - b.width / 2 + b.nameX,
          y,
          name,
          textStyle(
            BRACKET.nameFontSizePx,
            isPlayer ? HUD.playerColors[0] : hex(def.palette.accent),
            TEXT_STROKE,
          ),
        )
        .setOrigin(0, 0.5),
    );
    const goals = this.goalsAt(r, k);
    if (goals !== null) {
      objs.push(
        this.add
          .text(
            x + b.width / 2 - SCORE_INSET,
            y,
            String(goals),
            textStyle(BRACKET.scoreFontSizePx, UI_THEME.text.gold[1], TEXT_STROKE),
          )
          .setOrigin(1, 0.5),
      );
    }
    this.boxes.push({ x, y, slot, rig });
    return this.withAlpha(objs, dim);
  }

  private withAlpha(objs: Faded[], alpha: number): Faded[] {
    for (const o of objs) {
      o.setAlpha(alpha);
      o.setData('alpha', alpha);
    }
    return objs;
  }

  // ───────────────────────────── Durum ─────────────────────────────

  private showStatus(): void {
    const s = this.state;
    const cx = DISPLAY.width / 2;
    if (s.status === 'won') {
      this.roundText(upper(t('tournament.champion')), '');
      // Kayıt kapanır (şampiyonluk ve kilit maç sonunda yazıldı); kupa ekranına geçilir.
      setSavedTournament(null);
      this.setMenu([
        {
          label: t('tournament.continue'),
          onSelect: () => {
            this.toTrophy();
          },
        },
      ]);
      this.time.delayedCall(BRACKET.championDelayMs, () => {
        this.toTrophy();
      });
      return;
    }
    if (s.status === 'lost') {
      const round = currentRound(s);
      this.roundText(
        '',
        format('tournament.lostInfo', {
          round: t(`tournament.round.${round}` as 'tournament.round.0'),
        }),
      );
      const banner = this.add
        .text(
          cx,
          BRACKET.bannerY,
          upper(t('tournament.eliminated')),
          textStyle(BRACKET.bannerFontSizePx, '#ff5a5a', BANNER_STROKE),
        )
        .setOrigin(0.5)
        .setAngle(BANNER_ANGLE)
        .setDepth(1);
      banner.setScale(BANNER_POP);
      this.tweens.add({
        targets: banner,
        scale: 1,
        duration: BRACKET.revealMs,
        ease: 'Back.easeOut',
      });
      setSavedTournament(null);
      this.setMenu([
        {
          label: t('tournament.newTournament'),
          onSelect: () => {
            this.newTournament();
          },
        },
        {
          label: t('pause.mainMenu'),
          onSelect: () => {
            this.leave(SceneKeys.Menu, {});
          },
        },
      ]);
      return;
    }
    const pm = playerMatch(s);
    if (!pm) return;
    this.roundText(
      t(`tournament.round.${pm.round}` as 'tournament.round.0'),
      format('tournament.info', {
        name: upper(getCharacter(pm.opponent).name),
        level: t(`difficulty.${pm.difficulty}`),
      }),
    );
    this.setMenu([
      {
        label: t('tournament.play'),
        onSelect: () => {
          const setup: MatchSetup = {
            ...DEFAULT_MATCH_SETUP,
            mode: 'tournament',
            difficulty: pm.difficulty,
            characters: [this.slotId(PLAYER_SLOT), pm.opponent],
            durationSeconds: getSettings().matchSeconds,
          };
          this.leave(SceneKeys.Match, setup);
        },
      },
      {
        label: t('pause.mainMenu'),
        onSelect: () => {
          this.leave(SceneKeys.Menu, {});
        },
      },
      {
        label: t('tournament.forfeit'),
        onSelect: () => {
          setSavedTournament(null);
          this.leave(SceneKeys.Menu, {});
        },
      },
    ]);
  }

  private roundText(round: string, info: string): void {
    const cx = DISPLAY.width / 2;
    if (round) {
      this.add
        .text(cx, BRACKET.roundY, round, textStyle(BRACKET.roundFontSizePx, UI_THEME.text.gold[1]))
        .setOrigin(0.5);
    }
    if (info) {
      this.add
        .text(
          cx,
          round ? BRACKET.infoY : BRACKET.roundY,
          info,
          textStyle(BRACKET.infoFontSizePx, '#ffffff', TEXT_STROKE),
        )
        .setOrigin(0.5);
    }
  }

  private setMenu(items: readonly TextMenuItem[]): void {
    const m = BRACKET.menu;
    this.menu?.destroy();
    this.menu = new TextMenu(this, DISPLAY.width / 2, m.top, items, {
      fontFamily: MENU.fontFamily,
      fontSizePx: m.fontSizePx,
      spacingPx: m.spacingPx,
      strokePx: MENU_STROKE,
      color: OVERLAY.items.color,
      selectedColor: OVERLAY.items.selectedColor,
      selectedScale: UI_THEME.button.selectedScale,
      depth: 2,
      buttonWidth: m.buttonWidth,
      buttonHeight: MENU_BUTTON_H,
    });
  }

  private toTrophy(): void {
    if (this.leaving) return;
    this.leave(SceneKeys.Trophy, {
      player: this.slotId(PLAYER_SLOT),
      reward: this.state.reward,
    });
  }

  private newTournament(): void {
    const s = getSettings();
    const setup: MatchSetup = {
      ...DEFAULT_MATCH_SETUP,
      mode: 'tournament',
      difficulty: s.difficulty,
      durationSeconds: s.matchSeconds,
    };
    this.leave(SceneKeys.Select, setup);
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
const TROPHY_IDLE_ALPHA = 0.55;
const PLAYER_FRAME = 3;
const SCORE_INSET = 14;
const BANNER_STROKE = 10;
const BANNER_ANGLE = -6;
const BANNER_POP = 1.6;
const MENU_STROKE = 4;
const MENU_BUTTON_H = 46;
const TEXT_STROKE = 3;
