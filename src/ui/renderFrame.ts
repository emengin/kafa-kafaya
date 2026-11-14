import type { GameSim } from '../game/GameSim';
import { lerp } from '../physics';

interface BodyPose {
  x: number;
  y: number;
}

/**
 * Çizim için simülasyondan kopyalanan konumlar. Sahne her sabit adımdan önce bir kopya
 * alır; kare çizilirken önceki ve şimdiki kopya arasında `alpha` ile enterpolasyon yapılır.
 */
export class RenderFrame {
  readonly ball = { x: 0, y: 0, angle: 0 };
  readonly players: [BodyPose & { footAngle: number }, BodyPose & { footAngle: number }] = [
    { x: 0, y: 0, footAngle: 0 },
    { x: 0, y: 0, footAngle: 0 },
  ];

  copyFrom(sim: GameSim): this {
    const b = sim.ball;
    this.ball.x = b.x;
    this.ball.y = b.y;
    this.ball.angle = b.angle;
    for (const p of sim.players) {
      const out = this.players[p.index];
      out.x = p.x;
      out.y = p.y;
      out.footAngle = p.footAngle;
    }
    return this;
  }

  copyFromFrame(other: RenderFrame): this {
    this.ball.x = other.ball.x;
    this.ball.y = other.ball.y;
    this.ball.angle = other.ball.angle;
    this.players.forEach((out, i) => {
      const src = other.players[i] ?? out;
      out.x = src.x;
      out.y = src.y;
      out.footAngle = src.footAngle;
    });
    return this;
  }

  /** this = lerp(a, b, t) */
  lerpFrom(a: RenderFrame, b: RenderFrame, t: number): this {
    this.ball.x = lerp(a.ball.x, b.ball.x, t);
    this.ball.y = lerp(a.ball.y, b.ball.y, t);
    this.ball.angle = lerp(a.ball.angle, b.ball.angle, t);
    this.players.forEach((out, i) => {
      const pa = a.players[i] ?? out;
      const pb = b.players[i] ?? out;
      out.x = lerp(pa.x, pb.x, t);
      out.y = lerp(pa.y, pb.y, t);
      out.footAngle = lerp(pa.footAngle, pb.footAngle, t);
    });
    return this;
  }
}
