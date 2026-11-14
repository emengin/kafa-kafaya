import Phaser from 'phaser';
import { COLORS, DISPLAY, HUD, MATCH } from '../config/gameConfig';
import type { MatchFlow } from '../game/rules/MatchFlow';
import type { PlayerIndex } from '../game/types';
import { format, t, upper } from '../i18n';
import { displayedSecond, formatClock } from './format';

type Text = Phaser.GameObjects.Text;

/**
 * Maç HUD'u: üstte skor çubuğu (isimler, skorlar, geri sayım), ortada büyük duyuru yazısı
 * (GOL!, ALTIN GOL!, MAÇ BİTTİ!) ve altta kontrol ipucu. Durumu `MatchFlow`'dan okur.
 */
export class MatchHud {
  private readonly scores: [Text, Text];
  private readonly clock: Text;
  private readonly banner: Text;
  private readonly subtitle: Text;
  private readonly shownScore: [number, number] = [-1, -1];
  private shownSecond = -1;
  private shownGolden = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly names: readonly [string, string],
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
      .text(cx, height - HUD.hint.marginPx, t('match.hint'), {
        fontFamily: HUD.fontFamily,
        fontSize: `${HUD.hint.fontSizePx}px`,
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5, 1)
      .setAlpha(HUD.hint.alpha)
      .setDepth(HUD.depth);
  }

  /** Her karede: skorlar ve saat (yalnızca değiştiğinde yeniden yazılır). */
  update(match: MatchFlow): void {
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
