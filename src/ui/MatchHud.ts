import Phaser from 'phaser';
import { FX_KEYS } from '../art/fxArt';
import { addPanel, goldFill, panelTexture, textStyle } from '../art/uiArt';
import {
  DISPLAY,
  FX,
  HUD,
  MATCH,
  POWERUPS,
  UI_THEME,
  UNITS,
  type PowerUpType,
  type SuperType,
} from '../config/gameConfig';
import type { FaceController } from '../fx/FaceController';
import type { CharacterDef } from '../game/characters';
import { POWER_UP_TYPES, type Player } from '../game/entities/Player';
import type { MatchFlow } from '../game/rules/MatchFlow';
import type { PlayerIndex } from '../game/types';
import { format, t, upper } from '../i18n';
import { CharacterRig } from './CharacterRig';
import { playerColor, playerColorHex, playerMark } from './identity';
import { displayedSecond, formatClock } from './format';
import { ICON_RADIUS, iconKey, strokeRing } from './icons';
import { css, makeCanvasTexture } from '../art/canvas';
import { LiteGraphics } from './LiteGraphics';
import { BOTTOM_CENTER, TOP_CENTER } from '../platform/screenFrame';
import { screenLayout } from './ScreenLayout';
import { solidRect } from './solidRect';

/** Sık kullanılan renk. */
const GOLD = 0xffd23f;

/** Sık kullanılan renk. */
const WHITE = 0xffffff;

type Text = Phaser.GameObjects.Text;

/**
 * Maç HUD'u (Faz 5 arayüz stili): üstte gölgeli skor tabelası — iki yanda canlı yüz ifadeli
 * karakter portreleri (sahadaki oyuncunun yüzünü taklit eder: gol atınca sevinir, yiyince
 * üzülür), isimler ve güç barları; ortada skor kutuları (değişimde eski rakam yukarı kayar,
 * yenisi sekerek iner) ve saat hapı. Ortada büyük duyuru (GOL!, ALTIN GOL!, MAÇ BİTTİ!) dönen
 * ışınlarla; altta kontrol ipucu hapı. Durumu `MatchFlow`'dan ve oyunculardan okur.
 *
 * Yerleşim (Faz 2.2): skor tabelası üst kenara sabitli bir kapta (`ScreenLayout.group`), içindeki
 * her şey tasarım koordinatıyla; ipucu hapı alt kenara sabitli, duyuru ekranın ortasında.
 */
export class MatchHud {
  private readonly scores: [Text, Text];
  private readonly scoreFlash: [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  private readonly clock: Text;
  private readonly clockBack: Phaser.GameObjects.Image;
  private readonly clockWarnKey: string;
  private readonly clockKey: string;
  /** Duyuru yazıları önceden oluşturulur (gol anında büyük yazı yeniden çizilmesin). */
  private readonly banners = new Map<string, Text>();
  private readonly subtitles = new Map<string, { text: Text; back: Phaser.GameObjects.Image }>();
  private banner: Text | null = null;
  private subtitle: { text: Text; back: Phaser.GameObjects.Image } | null = null;
  private readonly ghosts: [Text, Text];
  private readonly rays: Phaser.GameObjects.Image;
  private readonly shownScore: [number, number] = [-1, -1];
  private shownSecond = -1;
  private shownGolden = false;
  private readonly power: Phaser.GameObjects.Graphics;
  private readonly superLabels: [Text, Text];
  private readonly powerUpIcons: Phaser.GameObjects.Graphics;
  private readonly badges: { bg: Phaser.GameObjects.Image; icon: Phaser.GameObjects.Image }[][];
  private readonly portraits: [CharacterRig, CharacterRig];
  private readonly cx = DISPLAY.width / 2;

  /**
   * @param superTypes Oyuncuların süper tipleri: süper hazırken barın ucunda tipin adı yazar.
   * @param faces Sahadaki oyuncuların yüz denetleyicileri (portreler paylaşır).
   */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly names: readonly [string, string],
    hint: string,
    superTypes: readonly [SuperType, SuperType],
    characters: readonly [CharacterDef, CharacterDef],
    faces: readonly [FaceController, FaceController],
    /** Süresiz modlarda (antrenman) saatin yerine yazılacak metin; null → saat. */
    private readonly clockLabel: string | null = null,
  ) {
    const { height } = DISPLAY;
    const cx = this.cx;
    const b = HUD.board;
    const d = HUD.depth;
    const layout = screenLayout(scene);
    // Skor tabelasının parçaları, oluşturma sırasıyla (kap içinde çizim sırası = ekleme sırası).
    const boardItems: Phaser.GameObjects.GameObject[] = [];
    const onBoard = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      boardItems.push(obj);
      return obj;
    };
    onBoard(addPanel(scene, cx, b.y, b.width, b.height, 'panel', b.height / 2).setDepth(d));

    // Portreler: rozet + karakterin canlı kafası.
    const sides = [-1, 1] as const;
    this.portraits = [0, 1].map((i) => {
      const side = sides[i] ?? 1;
      const x = cx + side * b.portraitX;
      const color = playerColor(i as PlayerIndex);
      const R = b.portraitR + PORTRAIT_RING;
      const key = `ui-portrait-${i}-${color}`;
      makeCanvasTexture(scene, key, R * 2 + 2, R * 2 + 2, (ctx, w) => {
        const c = w / 2;
        ctx.fillStyle = css(UI_THEME.styles.dark.bottom);
        ctx.beginPath();
        ctx.arc(c, c, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = css(color);
        ctx.lineWidth = PORTRAIT_RING;
        ctx.beginPath();
        ctx.arc(c, c, R - PORTRAIT_RING / 2, 0, Math.PI * 2);
        ctx.stroke();
      });
      onBoard(scene.add.image(x, b.y, key).setDepth(d));
      const def = characters[i as PlayerIndex];
      const rig = new CharacterRig(scene, def, { headOnly: true, face: faces[i as PlayerIndex] });
      onBoard(rig.root.setDepth(d));
      return rig;
    }) as [CharacterRig, CharacterRig];

    // İsimler.
    for (const i of [0, 1] as const) {
      const side = sides[i];
      const name = scene.add
        .text(
          cx + side * b.nameX,
          b.nameY,
          `${playerMark(i)}${upper(names[i])}`,
          textStyle(HUD.name.fontSizePx, playerColorHex(i), HUD.name.strokePx),
        )
        .setOrigin(i === 0 ? 0 : 1, 0.5)
        .setDepth(d);
      onBoard(name);
    }

    // Skor kutuları.
    const scoreKey = panelTexture(scene, b.scoreW, b.scoreH, 'dark', SCORE_RADIUS);
    const scoreText = (x: number): Text =>
      onBoard(
        scene.add
          .text(x, b.y, '0', textStyle(HUD.score.fontSizePx, '#ffffff', HUD.score.strokePx))
          .setOrigin(0.5)
          .setDepth(d),
      );
    const flash = (x: number): Phaser.GameObjects.Image =>
      onBoard(
        solidRect(scene, x, b.y, b.scoreW - FLASH_INSET, b.scoreH - FLASH_INSET, WHITE, 0)
          .setDepth(d)
          .setBlendMode(Phaser.BlendModes.ADD),
      );
    for (const side of sides)
      onBoard(scene.add.image(cx + side * b.scoreX, b.y, scoreKey).setDepth(d));
    this.scoreFlash = [flash(cx - b.scoreX), flash(cx + b.scoreX)];
    this.scores = [scoreText(cx - b.scoreX), scoreText(cx + b.scoreX)];
    this.ghosts = [
      scoreText(cx - b.scoreX).setVisible(false),
      scoreText(cx + b.scoreX).setVisible(false),
    ];

    // Saat hapı.
    this.clockKey = panelTexture(scene, b.clockW, b.clockH, 'dark', b.clockH / 2);
    this.clockWarnKey = panelTexture(scene, b.clockW, b.clockH, 'active', b.clockH / 2);
    this.clockBack = onBoard(scene.add.image(cx, b.y, this.clockKey).setDepth(d));
    this.clock = onBoard(
      scene.add
        .text(cx, b.y, '', textStyle(HUD.clock.fontSizePx, HUD.clock.color, HUD.clock.strokePx))
        .setOrigin(0.5)
        .setDepth(d),
    );

    // Güç barları ve süper etiketleri (barın dış ucunda).
    const pw = HUD.power;
    const trackKey = panelTexture(scene, pw.width + 2, pw.height + 2, 'dark', (pw.height + 2) / 2);
    for (const i of [0, 1] as const) {
      const outer = cx + sides[i] * b.nameX;
      const mid = i === 0 ? outer + pw.width / 2 : outer - pw.width / 2;
      onBoard(scene.add.image(mid, pw.y, trackKey).setDepth(d));
    }
    this.power = onBoard(new LiteGraphics(scene).setDepth(d));
    const superLabel = (i: PlayerIndex): Text =>
      scene.add
        .text(
          cx + sides[i] * (b.nameX + pw.width + LABEL_GAP),
          pw.y,
          `${upper(t(`super.${superTypes[i]}`))}!`,
          textStyle(pw.labelFontSizePx, '#ffffff', pw.labelStrokePx),
        )
        .setOrigin(i === 0 ? 0 : 1, 0.5)
        .setDepth(d)
        .setVisible(false);
    // Etiket barın dışında değil, isim satırının sonunda: bar `nameX`'ten ortaya doğru uzanır.
    this.superLabels = [onBoard(superLabel(0)), onBoard(superLabel(1))];
    this.superLabels[0].setPosition(cx - b.nameX, pw.y + LABEL_BELOW).setOrigin(0, 0.5);
    this.superLabels[1].setPosition(cx + b.nameX, pw.y + LABEL_BELOW).setOrigin(1, 0.5);
    this.powerUpIcons = new LiteGraphics(scene).setDepth(d + 1);
    // Güçlendirici rozetleri: oyuncu başına her tür için hazır sprite (oyunda nesne kurulmaz).
    const pu = HUD.powerUps;
    const badgeKey = 'ui-badge';
    makeCanvasTexture(
      scene,
      badgeKey,
      (pu.radius + BADGE_DROP + 2) * 2,
      (pu.radius + BADGE_DROP + 2) * 2,
      (ctx, w) => {
        const c = w / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.arc(c, c + BADGE_DROP, pu.radius + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = css(UI_THEME.styles.dark.top);
        ctx.beginPath();
        ctx.arc(c, c, pu.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${pu.ringBackAlpha})`;
        ctx.lineWidth = pu.ringWidthPx;
        ctx.beginPath();
        ctx.arc(c, c, pu.radius, 0, Math.PI * 2);
        ctx.stroke();
      },
    );
    this.badges = [0, 1].map(() =>
      POWER_UP_TYPES.map((type) => ({
        bg: scene.add.image(0, pu.y, badgeKey).setDepth(d).setVisible(false),
        icon: scene.add
          .image(0, pu.y, iconKey(type))
          .setDepth(d + 1)
          .setTint(FX.powerUpColors[type])
          .setScale((pu.radius * FX.balloon.iconScale) / ICON_RADIUS)
          .setVisible(false),
      })),
    );

    // Rozet zeminleri, üstlerinde geri sayım halkaları ve ikonlar (eski derinlik sırası: d, d+1).
    layout
      .group(TOP_CENTER, d)
      .add([
        ...boardItems,
        ...this.badges.flat().map((x) => x.bg),
        this.powerUpIcons,
        ...this.badges.flat().map((x) => x.icon),
      ]);

    // Duyuru: dönen ışınlar + altın gradyanlı yazı + hap içinde alt yazı.
    const gb = HUD.goalBanner;
    const bannerY = height * gb.yRatio;
    this.rays = scene.add
      .image(cx, bannerY, FX_KEYS.rays)
      .setDepth(d)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(GOLD)
      .setDisplaySize(gb.raysSize, gb.raysSize)
      .setVisible(false);
    const titles = [t('match.goal'), t('match.goldenGoal'), t('match.fullTime')];
    for (const title of titles) {
      const text = scene.add
        .text(cx, bannerY, title, textStyle(gb.fontSizePx, '#ffffff', gb.strokePx))
        .setOrigin(0.5)
        .setDepth(d)
        .setVisible(false);
      goldFill(text);
      this.banners.set(title, text);
    }
    const subs = [
      format('match.goalBy', { name: names[0] }),
      format('match.goalBy', { name: names[1] }),
      t('match.goldenGoalHint'),
    ];
    for (const sub of subs) {
      const y = bannerY + gb.subtitleOffsetY;
      const text = scene.add
        .text(cx, y, sub, textStyle(gb.subtitleFontSizePx, '#ffffff', gb.subtitleStrokePx))
        .setOrigin(0.5)
        .setDepth(d + 1)
        .setVisible(false);
      const back = scene.add
        .image(
          cx,
          y,
          panelTexture(
            scene,
            text.width + gb.subtitlePadX * 2,
            gb.subtitleH,
            'dark',
            gb.subtitleH / 2,
          ),
        )
        .setDepth(d)
        .setVisible(false);
      this.subtitles.set(sub, { text, back });
    }

    // Kontrol ipucu hapı (dokunmatikte yok: butonlar ekranda).
    const h = HUD.hint;
    if (hint === '') return;
    const hintText = scene.add
      .text(cx, height - h.marginPx - h.height / 2, hint, textStyle(h.fontSizePx, '#ffffff', 2))
      .setOrigin(0.5)
      .setDepth(d)
      .setAlpha(h.alpha);
    const hintBack = scene.add
      .image(
        cx,
        hintText.y,
        panelTexture(scene, hintText.width + h.padX * 2, h.height, 'dark', h.height / 2),
      )
      .setDepth(d)
      .setAlpha(h.alpha);
    hintText.setDepth(d + 1);
    layout.place(hintBack, BOTTOM_CENTER);
    layout.place(hintText, BOTTOM_CENTER);
  }

  /** Her karede: skorlar, saat (yalnızca değiştiğinde yeniden yazılır), barlar, portreler. */
  update(match: MatchFlow, players: readonly Player[]): void {
    const now = this.scene.time.now / UNITS.msPerSecond;
    this.drawPower(players, now);
    this.drawPowerUps(players);
    const b = HUD.board;
    this.portraits.forEach((rig, i) => {
      rig.drawPortrait(
        this.cx + (i === 0 ? -1 : 1) * b.portraitX,
        b.y + PORTRAIT_DROP,
        b.portraitR * PORTRAIT_HEAD,
        i === 0 ? 1 : -1,
        now,
      );
    });
    for (const i of [0, 1] as const) {
      if (this.shownScore[i] === match.score[i]) continue;
      const first = this.shownScore[i] < 0;
      this.shownScore[i] = match.score[i];
      if (first) this.scores[i].setText(String(match.score[i]));
      else this.animateScore(i, match.score[i]);
    }
    this.updateClock(match);
  }

  /** Eski rakam yukarı kayıp söner; yenisi yukarıdan sekerek iner, kutu parlar. */
  private animateScore(i: PlayerIndex, value: number): void {
    const s = HUD.score;
    const text = this.scores[i];
    const y = HUD.board.y;
    const ghost = this.ghosts[i];
    this.scene.tweens.killTweensOf(ghost);
    ghost.setText(text.text).setY(y).setAlpha(1).setVisible(true);
    this.scene.tweens.add({
      targets: ghost,
      y: y - s.dropPx,
      alpha: 0,
      duration: s.popMs / 2,
      ease: 'Quad.easeIn',
      onComplete: () => {
        ghost.setVisible(false);
      },
    });
    this.scene.tweens.killTweensOf(text);
    text
      .setText(String(value))
      .setY(y - s.dropPx)
      .setAlpha(0)
      .setScale(s.popScale);
    this.scene.tweens.add({
      targets: text,
      y,
      alpha: 1,
      duration: s.popMs,
      ease: 'Bounce.easeOut',
    });
    this.scene.tweens.add({ targets: text, scale: 1, duration: s.popMs, ease: 'Back.easeOut' });
    const flash = this.scoreFlash[i];
    flash.setAlpha(s.flashAlpha);
    this.scene.tweens.killTweensOf(flash);
    this.scene.tweens.add({ targets: flash, alpha: 0, duration: s.popMs });
  }

  private updateClock(match: MatchFlow): void {
    const { clock } = HUD;
    if (this.clockLabel !== null) {
      // Süresiz (antrenman): saatin yerinde sabit yazı.
      if (this.clock.text === this.clockLabel) return;
      this.clock.setText(this.clockLabel).setFontSize(clock.goldenFontSizePx).setScale(1);
      // Uzun yazı (ör. "ANTRENMAN") saat hapına sığacak kadar küçülür.
      const room = HUD.board.clockW - CLOCK_LABEL_PAD * 2;
      if (this.clock.width > room) this.clock.setScale(room / this.clock.width);
      return;
    }
    if (match.overtime) {
      if (this.shownGolden) return;
      this.shownGolden = true;
      this.scene.tweens.killTweensOf(this.clock);
      this.clockBack.setTexture(this.clockWarnKey);
      this.clock
        .setText(t('match.goldenGoalClock'))
        .setFontSize(clock.goldenFontSizePx)
        .setColor(UI_THEME.text.activeColor)
        .setStroke('#fff3c4', 0)
        .setScale(1);
      return;
    }
    const second = displayedSecond(match.timeLeft);
    if (second === this.shownSecond) return;
    this.shownSecond = second;
    this.clock.setText(formatClock(match.timeLeft));
    // Son saniyeler: kırmızı ve her saniye bir "nabız".
    const warning = second <= MATCH.finalCountdownSeconds;
    this.clock.setColor(warning ? clock.warningColor : clock.color);
    if (warning && second > 0) {
      this.pop(this.clock, clock.pulseScale, clock.pulseMs);
      this.pop(this.clockBack, CLOCK_BACK_PULSE, clock.pulseMs);
    }
  }

  /** Güç barları: ortaya doğru dolar; doluyken altın + kayan parıltı; hazırken nabız. */
  private drawPower(players: readonly Player[], now: number): void {
    const pw = HUD.power;
    const b = HUD.board;
    const g = this.power;
    g.clear();
    for (const p of players) {
      const side = p.index === 0 ? -1 : 1;
      const outer = this.cx + side * b.nameX;
      const left = p.index === 0 ? outer : outer - pw.width;
      const y = pw.y - pw.height / 2;
      const full = p.superArmed ? 1 : p.power;
      const w = Math.max(0, (pw.width - BAR_INSET * 2) * full);
      const label = this.superLabels[p.index];
      label.setVisible(p.superArmed);
      if (w < 1) continue;
      // P1 soldan ortaya, P2 sağdan ortaya dolar (yuvarlak iz dokusunun içinde düz dolgu).
      const x = p.index === 0 ? left + BAR_INSET : left + pw.width - BAR_INSET - w;
      const isFull = full >= 1;
      let base: number = isFull ? pw.fullColor : pw.fillColor;
      let light: number = isFull ? pw.fullLight : pw.fillLight;
      if (p.superArmed) {
        const pulse = 0.5 + 0.5 * Math.sin(now * pw.pulseHz * Math.PI * 2);
        const accent = FX.superColors[p.loadout.superType];
        base = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(accent),
          Phaser.Display.Color.ValueToColor(WHITE),
          1,
          pulse * ARMED_WHITE,
        ).color;
        light = WHITE;
        label.setScale(1 + pulse * LABEL_PULSE);
      }
      g.fillStyle(base, 1);
      g.fillRect(x, y + 1, w, pw.height - 2);
      g.fillStyle(light, BAR_SHINE_ALPHA);
      g.fillRect(x, y + 2, w, pw.height * BAR_SHINE_H);
      if (isFull) {
        // Kayan parıltı.
        const u = (now / pw.shineSeconds) % 1;
        const sx = x + (w + pw.shinePx) * u - pw.shinePx;
        const s0 = Math.max(x, sx);
        const s1 = Math.min(x + w, sx + pw.shinePx);
        if (s1 > s0) {
          g.fillStyle(WHITE, SHINE_ALPHA);
          g.fillRect(s0, y + 1, s1 - s0, pw.height - 2);
        }
      }
    }
  }

  /**
   * Etkin güçlendiriciler: kazanan oyuncunun tarafında, ortadan dışa doğru; her biri ikon +
   * kalan süreyi gösteren geri sayım halkası. Son saniyelerde yanıp söner.
   */
  private drawPowerUps(players: readonly Player[]): void {
    const c = HUD.powerUps;
    const g = this.powerUpIcons;
    g.clear();
    const blinkOff =
      Math.floor((this.scene.time.now / UNITS.msPerSecond) * c.blinkHz * 2) % 2 === 1;
    for (const p of players) {
      const side = p.index === 0 ? -1 : 1;
      let slot = 0;
      POWER_UP_TYPES.forEach((type: PowerUpType, k) => {
        const badge = this.badges[p.index]?.[k];
        if (!badge) return;
        const left = p.powerUps[type];
        const shown = left > 0 && !(left < c.warnSeconds && blinkOff);
        badge.bg.setVisible(shown);
        badge.icon.setVisible(shown);
        if (left <= 0) return;
        const x = this.cx + side * (c.firstOffsetX + slot * c.spacingPx);
        slot++;
        if (!shown) return;
        badge.bg.setX(x);
        badge.icon.setX(x);
        strokeRing(
          g,
          x,
          c.y,
          c.radius,
          left / POWERUPS.durations[type],
          c.ringWidthPx,
          FX.powerUpColors[type],
        );
      });
    }
  }

  onGoal(scorer: PlayerIndex): void {
    this.showBanner(t('match.goal'), format('match.goalBy', { name: this.names[scorer] }), true);
  }

  onGoldenGoal(): void {
    this.showBanner(t('match.goldenGoal'), t('match.goldenGoalHint'), true);
  }

  onFullTime(): void {
    this.showBanner(t('match.fullTime'), '', false);
  }

  private showBanner(title: string, subtitle: string, rays: boolean): void {
    const gb = HUD.goalBanner;
    const hide = (): void => {
      this.banner?.setVisible(false);
      this.subtitle?.text.setVisible(false);
      this.subtitle?.back.setVisible(false);
      this.rays.setVisible(false);
    };
    const old: Phaser.GameObjects.GameObject[] = [this.rays];
    if (this.banner) old.push(this.banner);
    if (this.subtitle) old.push(this.subtitle.text, this.subtitle.back);
    this.scene.tweens.killTweensOf(old);
    hide();
    const banner = this.banners.get(title) ?? null;
    const sub = subtitle.length > 0 ? (this.subtitles.get(subtitle) ?? null) : null;
    this.banner = banner;
    this.subtitle = sub;
    if (!banner) return;
    banner.setVisible(true).setAlpha(1).setScale(gb.popScale).setRotation(-gb.wobbleRad);
    sub?.text.setVisible(true).setAlpha(1);
    sub?.back.setVisible(true).setAlpha(1);
    this.rays
      .setVisible(rays)
      .setAlpha(rays ? gb.raysAlpha : 0)
      .setScale((gb.raysSize / RAYS_TEX) * RAYS_START);
    this.scene.tweens.add({
      targets: banner,
      scale: 1,
      rotation: 0,
      duration: gb.popMs,
      ease: 'Back.easeOut',
    });
    const total = gb.popMs + gb.holdMs + gb.fadeMs;
    if (rays) {
      this.scene.tweens.add({
        targets: this.rays,
        scale: gb.raysSize / RAYS_TEX,
        duration: gb.popMs,
        ease: 'Back.easeOut',
      });
      const spin = (gb.raysSpin * total) / UNITS.msPerSecond;
      this.scene.tweens.add({
        targets: this.rays,
        rotation: this.rays.rotation + spin,
        duration: total,
      });
    }
    const targets: Phaser.GameObjects.GameObject[] = [banner, this.rays];
    if (sub) targets.push(sub.text, sub.back);
    this.scene.tweens.add({
      targets,
      alpha: 0,
      delay: gb.popMs + gb.holdMs,
      duration: gb.fadeMs,
      onComplete: hide,
    });
  }

  private pop(obj: Text | Phaser.GameObjects.Image, scale: number, durationMs: number): void {
    this.scene.tweens.killTweensOf(obj);
    obj.setScale(scale);
    this.scene.tweens.add({ targets: obj, scale: 1, duration: durationMs, ease: 'Quad.easeOut' });
  }
}

const PORTRAIT_RING = 4;
/** Portrede kafa rozetin içine sığsın: yarıçap oranı ve hafif aşağı kayma. */
const PORTRAIT_HEAD = 0.78;
const PORTRAIT_DROP = 3;
const SCORE_RADIUS = 14;
const FLASH_INSET = 8;
const LABEL_GAP = 10;
const LABEL_BELOW = 16;
const ARMED_WHITE = 0.6;
const LABEL_PULSE = 0.08;
const BAR_SHINE_ALPHA = 0.55;
const BAR_SHINE_H = 0.4;
const SHINE_ALPHA = 0.6;
const BAR_INSET = 2;
const BADGE_DROP = 3;
const RAYS_TEX = 512;
const RAYS_START = 0.4;
const CLOCK_BACK_PULSE = 1.12;
const CLOCK_LABEL_PAD = 8;
