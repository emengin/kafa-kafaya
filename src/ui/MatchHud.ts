import Phaser from 'phaser';
import {
  COLORS,
  DISPLAY,
  FX,
  HUD,
  MATCH,
  POWERUPS,
  UNITS,
  type PowerUpType,
  type SuperType,
} from '../config/gameConfig';
import { POWER_UP_TYPES, type Player } from '../game/entities/Player';
import type { MatchFlow } from '../game/rules/MatchFlow';
import type { PlayerIndex } from '../game/types';
import { format, t, upper } from '../i18n';
import { displayedSecond, formatClock } from './format';
import { drawPowerUpIcon, strokeRing } from './icons';

type Text = Phaser.GameObjects.Text;

/**
 * Maç HUD'u: üstte skor çubuğu (isimler, skorlar, geri sayım, güç barları), ortada büyük
 * duyuru yazısı (GOL!, ALTIN GOL!, MAÇ BİTTİ!) ve altta kontrol ipucu. Durumu `MatchFlow`'dan
 * ve oyunculardan okur.
 */
export class MatchHud {
  private readonly scores: [Text, Text];
  private readonly clock: Text;
  private readonly banner: Text;
  private readonly subtitle: Text;
  private readonly shownScore: [number, number] = [-1, -1];
  private shownSecond = -1;
  private shownGolden = false;
  private readonly power: Phaser.GameObjects.Graphics;
  private readonly superLabels: [Text, Text];
  private readonly powerUpIcons: Phaser.GameObjects.Graphics;

  /**
   * @param superTypes Oyuncuların süper tipleri: süper hazırken barın ucunda tipin adı yazar.
   */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly names: readonly [string, string],
    hint: string,
    superTypes: readonly [SuperType, SuperType],
  ) {
    const { width, height } = DISPLAY;
    const cx = width / 2;
    const { bar, score, name, clock, goalBanner: gb } = HUD;

    scene.add
      .graphics()
      .setDepth(HUD.depth)
      .fillStyle(bar.color, bar.alpha)
      .fillRoundedRect(cx - bar.halfWidth, 0, bar.halfWidth * 2, bar.bottomY, {
        tl: 0,
        tr: 0,
        bl: bar.radius,
        br: bar.radius,
      });

    const scoreText = (x: number): Text =>
      scene.add
        .text(x, bar.y, '0', {
          fontFamily: HUD.fontFamily,
          fontSize: `${score.fontSizePx}px`,
          color: COLORS.textPrimary,
          stroke: COLORS.textStroke,
          strokeThickness: score.strokePx,
        })
        .setOrigin(0.5)
        .setDepth(HUD.depth);
    this.scores = [scoreText(cx - score.offsetX), scoreText(cx + score.offsetX)];

    const nameText = (i: PlayerIndex, x: number, originX: number): Text =>
      scene.add
        .text(x, bar.y, upper(names[i]), {
          fontFamily: HUD.fontFamily,
          fontSize: `${name.fontSizePx}px`,
          color: HUD.playerColors[i],
          stroke: COLORS.textStroke,
          strokeThickness: name.strokePx,
        })
        .setOrigin(originX, 0.5)
        .setDepth(HUD.depth);
    nameText(0, cx - name.offsetX, 1);
    nameText(1, cx + name.offsetX, 0);

    // Güç barları ve "SÜPER!" etiketleri (barın dış ucunda).
    const pw = HUD.power;
    this.power = scene.add.graphics().setDepth(HUD.depth);
    const superLabel = (i: PlayerIndex): Text => {
      const outer = cx + (i === 0 ? -1 : 1) * (pw.offsetX + pw.width + pw.labelGapPx);
      return scene.add
        .text(outer, pw.y + pw.height / 2, `${upper(t(`super.${superTypes[i]}`))}!`, {
          fontFamily: HUD.fontFamily,
          fontSize: `${pw.labelFontSizePx}px`,
          color: COLORS.textAccent,
          stroke: COLORS.textStroke,
          strokeThickness: pw.labelStrokePx,
        })
        .setOrigin(i === 0 ? 1 : 0, 0.5)
        .setDepth(HUD.depth)
        .setVisible(false);
    };
    this.superLabels = [superLabel(0), superLabel(1)];
    this.powerUpIcons = scene.add.graphics().setDepth(HUD.depth);

    this.clock = scene.add
      .text(cx, bar.y, '', {
        fontFamily: HUD.fontFamily,
        fontSize: `${clock.fontSizePx}px`,
        color: clock.color,
        stroke: COLORS.textStroke,
        strokeThickness: clock.strokePx,
      })
      .setOrigin(0.5)
      .setDepth(HUD.depth);

    const bannerY = height * gb.yRatio;
    this.banner = scene.add
      .text(cx, bannerY, '', {
        fontFamily: HUD.fontFamily,
        fontSize: `${gb.fontSizePx}px`,
        color: COLORS.textAccent,
        stroke: COLORS.textStroke,
        strokeThickness: gb.strokePx,
      })
      .setOrigin(0.5)
      .setDepth(HUD.depth)
      .setVisible(false);
    this.subtitle = scene.add
      .text(cx, bannerY + gb.subtitleOffsetY, '', {
        fontFamily: HUD.fontFamily,
        fontSize: `${gb.subtitleFontSizePx}px`,
        color: COLORS.textPrimary,
        stroke: COLORS.textStroke,
        strokeThickness: gb.subtitleStrokePx,
      })
      .setOrigin(0.5)
      .setDepth(HUD.depth)
      .setVisible(false);

    scene.add
      .text(cx, height - HUD.hint.marginPx, hint, {
        fontFamily: HUD.fontFamily,
        fontSize: `${HUD.hint.fontSizePx}px`,
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5, 1)
      .setAlpha(HUD.hint.alpha)
      .setDepth(HUD.depth);
  }

  /** Her karede: skorlar, saat (yalnızca değiştiğinde yeniden yazılır) ve güç barları. */
  update(match: MatchFlow, players: readonly Player[]): void {
    this.drawPower(players);
    this.drawPowerUps(players);
    for (const i of [0, 1] as const) {
      if (this.shownScore[i] === match.score[i]) continue;
      const first = this.shownScore[i] < 0;
      this.shownScore[i] = match.score[i];
      this.scores[i].setText(String(match.score[i]));
      if (!first) this.pop(this.scores[i], HUD.score.popScale, HUD.score.popMs);
    }
    this.updateClock(match);
  }

  private updateClock(match: MatchFlow): void {
    const { clock } = HUD;
    if (match.overtime) {
      if (this.shownGolden) return;
      this.shownGolden = true;
      this.scene.tweens.killTweensOf(this.clock);
      this.clock
        .setText(t('match.goldenGoalClock'))
        .setFontSize(clock.goldenFontSizePx)
        .setColor(COLORS.textAccent)
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
    if (warning && second > 0) this.pop(this.clock, clock.pulseScale, clock.pulseMs);
  }

  /** Güç barları: sahanın ortasına doğru dolar; doluyken altın, süper hazırken yanıp söner. */
  private drawPower(players: readonly Player[]): void {
    const pw = HUD.power;
    const cx = DISPLAY.width / 2;
    const g = this.power;
    g.clear();
    const blinkOn =
      Math.floor((this.scene.time.now / UNITS.msPerSecond) * pw.blinkHz * 2) % 2 === 0;
    for (const p of players) {
      const inner = cx + (p.index === 0 ? -pw.offsetX : pw.offsetX);
      const left = p.index === 0 ? inner - pw.width : inner;
      g.fillStyle(pw.backColor, pw.backAlpha);
      g.fillRoundedRect(left, pw.y, pw.width, pw.height, pw.radius);
      const full = p.superArmed ? 1 : p.power;
      const w = pw.width * full;
      if (w > 0) {
        const color = p.superArmed
          ? pw.armedColors[blinkOn ? 0 : 1]
          : full >= 1
            ? pw.fullColor
            : pw.fillColor;
        g.fillStyle(color, 1);
        // P1 soldan sağa (ortaya doğru), P2 sağdan sola dolar.
        const x = p.index === 0 ? inner - w : inner;
        g.fillRect(x, pw.y, w, pw.height);
      }
      this.superLabels[p.index].setVisible(p.superArmed && blinkOn);
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
    const cx = DISPLAY.width / 2;
    const blinkOff =
      Math.floor((this.scene.time.now / UNITS.msPerSecond) * c.blinkHz * 2) % 2 === 1;
    for (const p of players) {
      const side = p.index === 0 ? -1 : 1;
      let slot = 0;
      for (const type of POWER_UP_TYPES) {
        const left = p.powerUps[type];
        if (left <= 0) continue;
        const x = cx + side * (c.firstOffsetX + slot * c.spacingPx);
        slot++;
        if (left < c.warnSeconds && blinkOff) continue;
        this.drawPowerUpSlot(g, type, x, c.y, left / POWERUPS.durations[type]);
      }
    }
  }

  private drawPowerUpSlot(
    g: Phaser.GameObjects.Graphics,
    type: PowerUpType,
    x: number,
    y: number,
    fraction: number,
  ): void {
    const c = HUD.powerUps;
    const color = FX.powerUpColors[type];
    g.fillStyle(c.backColor, c.backAlpha);
    g.fillCircle(x, y, c.radius);
    g.lineStyle(c.ringWidthPx, c.ringBackColor, c.ringBackAlpha);
    g.strokeCircle(x, y, c.radius);
    strokeRing(g, x, y, c.radius, fraction, c.ringWidthPx, color);
    drawPowerUpIcon(g, type, x, y, c.radius * FX.balloon.iconScale, color);
  }

  onGoal(scorer: PlayerIndex): void {
    this.showBanner(t('match.goal'), format('match.goalBy', { name: this.names[scorer] }));
  }

  onGoldenGoal(): void {
    this.showBanner(t('match.goldenGoal'), t('match.goldenGoalHint'));
  }

  onFullTime(): void {
    this.showBanner(t('match.fullTime'), '');
  }

  private showBanner(title: string, subtitle: string): void {
    const gb = HUD.goalBanner;
    const targets = [this.banner, this.subtitle];
    this.scene.tweens.killTweensOf(targets);
    this.banner.setText(title).setVisible(true).setAlpha(1).setScale(gb.popScale);
    this.subtitle
      .setText(subtitle)
      .setVisible(subtitle.length > 0)
      .setAlpha(1)
      .setScale(1);
    this.scene.tweens.add({
      targets: this.banner,
      scale: 1,
      duration: gb.popMs,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets,
      alpha: 0,
      delay: gb.popMs + gb.holdMs,
      duration: gb.fadeMs,
      onComplete: () => {
        this.banner.setVisible(false);
        this.subtitle.setVisible(false);
      },
    });
  }

  private pop(text: Text, scale: number, durationMs: number): void {
    this.scene.tweens.killTweensOf(text);
    text.setScale(scale);
    this.scene.tweens.add({ targets: text, scale: 1, duration: durationMs, ease: 'Quad.easeOut' });
  }
}
