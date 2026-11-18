import { describe, expect, it } from 'vitest';
import { CONTROLS, GAMEPAD, PAD_CODES, TOUCH, type PadButton } from '../config/gameConfig';
import { GamepadPoller, readPad, type GamepadLike, type PadState } from './Gamepads';
import { KeyboardInputSource, KeyTracker } from './KeyboardInput';
import { pressedButtons, touchButtons } from './touchLayout';
import { pressVirtual, releaseVirtual, VirtualKeyEvent } from './virtualKeys';

const BUTTONS = 17;

function pad(
  index: number,
  opts: { pressed?: number[]; axes?: number[]; values?: Record<number, number> } = {},
): GamepadLike {
  return {
    index,
    connected: true,
    axes: opts.axes ?? [0, 0, 0, 0],
    buttons: Array.from({ length: BUTTONS }, (_, i) => ({
      pressed: opts.pressed?.includes(i) ?? false,
      value: opts.values?.[i] ?? (opts.pressed?.includes(i) ? 1 : 0),
    })),
  };
}

const B = GAMEPAD.buttons;

describe('Gamepad — kolun mantıksal durumu', () => {
  it('standart düzen düğmeleri ve d-pad', () => {
    const s = readPad(pad(0, { pressed: [B.a, B.rb, B.left, B.start] }), null);
    expect(s.a && s.rb && s.left && s.start).toBe(true);
    expect(s.b || s.x || s.right || s.up || s.back).toBe(false);
  });

  it('sol çubuk ölü bölgeli ve histerezisli (titreşim yok)', () => {
    const half = (GAMEPAD.stickPress + GAMEPAD.stickRelease) / 2;
    let s: PadState = readPad(pad(0, { axes: [half, 0] }), null);
    expect(s.right).toBe(false); // basma eşiğinin altında
    s = readPad(pad(0, { axes: [GAMEPAD.stickPress + 0.05, 0] }), s);
    expect(s.right).toBe(true);
    s = readPad(pad(0, { axes: [half, 0] }), s);
    expect(s.right).toBe(true); // bırakma eşiğinin üstünde: basılı kalır
    s = readPad(pad(0, { axes: [GAMEPAD.stickRelease - 0.05, 0] }), s);
    expect(s.right).toBe(false);
    s = readPad(pad(0, { axes: [0, -0.9] }), s);
    expect(s.up && !s.down && !s.left).toBe(true);
  });

  it('analog tetik eşikle basılı sayılır; bozuk eksen değeri yok sayılır', () => {
    expect(readPad(pad(0, { values: { [B.rt]: GAMEPAD.buttonPress + 0.1 } }), null).rt).toBe(true);
    expect(readPad(pad(0, { values: { [B.rt]: GAMEPAD.buttonPress - 0.1 } }), null).rt).toBe(false);
    expect(readPad(pad(0, { axes: [Number.NaN, Number.NaN] }), null).left).toBe(false);
  });
});

describe('Gamepad — yoklayıcı (en fazla 2 kol)', () => {
  function rig(): {
    poller: GamepadPoller;
    pads: (GamepadLike | null)[];
    log: string[];
    lost: number[];
  } {
    const pads: (GamepadLike | null)[] = [];
    const log: string[] = [];
    const lost: number[] = [];
    const poller = new GamepadPoller(
      () => pads,
      (slot: number, b: PadButton, pressed: boolean) => {
        log.push(`${slot}:${b}:${pressed ? 'down' : 'up'}`);
      },
    );
    poller.onDisconnect = (slot) => lost.push(slot);
    return { poller, pads, log, lost };
  }

  it('kollar bağlanma sırasıyla slotlara; yalnızca değişimler yollanır; üçüncü kol yok sayılır', () => {
    const { poller, pads, log } = rig();
    pads[3] = pad(3, { pressed: [B.a] });
    poller.poll();
    expect(log).toEqual(['0:a:down']);
    pads[1] = pad(1, { pressed: [B.x] });
    pads[5] = pad(5, { pressed: [B.y] });
    poller.poll();
    expect(log).toEqual(['0:a:down', '1:x:down']);
    expect(poller.connected).toBe(GAMEPAD.maxPads);
    poller.poll();
    expect(log).toHaveLength(2);
    pads[3] = pad(3);
    poller.poll();
    expect(log.at(-1)).toBe('0:a:up');
  });

  it('çıkarılan kolun basılı düğmeleri bırakılır, slotu boşalır, diğer kolun slotu değişmez', () => {
    const { poller, pads, log, lost } = rig();
    pads[0] = pad(0, { pressed: [B.rb] });
    pads[1] = pad(1, { pressed: [B.b] });
    poller.poll();
    pads[0] = null;
    poller.poll();
    expect(log).toContain('0:rb:up');
    expect(lost).toEqual([0]);
    pads[1] = pad(1);
    poller.poll();
    expect(log.at(-1)).toBe('1:b:up');
    pads[2] = pad(2, { pressed: [B.a] });
    poller.poll();
    expect(log.at(-1)).toBe('0:a:down');
  });
});

describe('Sanal tuşlar ve çoklu kod eşlemesi', () => {
  function key(type: 'keydown' | 'keyup', code: string): Event {
    const e = new Event(type, { cancelable: true });
    Object.defineProperty(e, 'code', { value: code });
    Object.defineProperty(e, 'repeat', { value: false });
    return e;
  }

  it('KeyTracker sanal veri yolunu da dinler; gamepad eşlemesi birden çok kodu kabul eder', () => {
    const target = new EventTarget();
    const bus = new EventTarget();
    const tracker = new KeyTracker(target, new Set(), bus).attach();
    const gp = new KeyboardInputSource(tracker, CONTROLS.pads[0]);
    const [p1] = PAD_CODES;
    bus.dispatchEvent(new VirtualKeyEvent('keydown', p1.b));
    expect(gp.read().kick).toBe(true); // B de şut (X/B)
    bus.dispatchEvent(new VirtualKeyEvent('keyup', p1.b));
    bus.dispatchEvent(new VirtualKeyEvent('keydown', p1.rt));
    bus.dispatchEvent(new VirtualKeyEvent('keyup', p1.rt));
    const s = gp.read();
    expect(s.super && !s.kick).toBe(true); // latch: kısa basış kaybolmaz
    target.dispatchEvent(key('keydown', p1.left));
    expect(gp.read().left).toBe(true);
    tracker.detach();
    bus.dispatchEvent(new VirtualKeyEvent('keydown', p1.a));
    expect(gp.read().jump).toBe(false);
  });

  it('pressVirtual/releaseVirtual yalnızca değişimde olay yollar (varsayılan veri yolu)', () => {
    const tracker = new KeyTracker(new EventTarget(), new Set()).attach();
    const touch = new KeyboardInputSource(tracker, CONTROLS.touch);
    pressVirtual(CONTROLS.touch.jump);
    pressVirtual(CONTROLS.touch.jump);
    expect(touch.read().jump).toBe(true);
    releaseVirtual(CONTROLS.touch.jump);
    releaseVirtual(CONTROLS.touch.jump);
    expect(touch.read().jump).toBe(false);
    tracker.detach();
  });
});

describe('Dokunmatik butonlar — çoklu dokunuş', () => {
  const buttons = touchButtons(false);
  const at = (id: keyof typeof TOUCH.buttons) => ({
    x: TOUCH.buttons[id].x,
    y: TOUCH.buttons[id].y,
  });

  it('iki parmak aynı anda farklı butonlara basar (sol el yön, sağ el şut)', () => {
    expect([...pressedButtons([at('right'), at('kick')], buttons)].sort()).toEqual([
      'kick',
      'right',
    ]);
    expect([...pressedButtons([at('left'), at('jump'), at('super')], buttons)].sort()).toEqual([
      'jump',
      'left',
      'super',
    ]);
  });

  it('tolerans içinde basar, dışında basmaz; iki buton arasında en yakını seçer', () => {
    const b = TOUCH.buttons.kick;
    expect(
      pressedButtons([{ x: b.x + b.r + TOUCH.hitSlackPx - 1, y: b.y }], buttons).has('kick'),
    ).toBe(true);
    expect(pressedButtons([{ x: b.x, y: b.y + b.r + TOUCH.hitSlackPx + 1 }], buttons).size).toBe(0);
    const { left, right } = TOUCH.buttons;
    const nearRight = { x: (left.x + right.x) / 2 + 1, y: left.y };
    expect([...pressedButtons([nearRight], buttons)]).toEqual(['right']);
    expect(pressedButtons([{ x: 640, y: 360 }], buttons).size).toBe(0);
  });

  it('antrenmanda topu sıfırla ve barı doldur butonları da var; butonlar üst üste binmez', () => {
    const training = touchButtons(true);
    expect(training.map((x) => x.id)).toEqual(expect.arrayContaining(['reset', 'fill', 'pause']));
    for (const a of training) {
      for (const c of training) {
        if (a === c) continue;
        expect(Math.hypot(a.x - c.x, a.y - c.y)).toBeGreaterThan(a.r + c.r);
      }
    }
  });
});
