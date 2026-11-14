import { describe, expect, it } from 'vitest';
import { CONTROLS } from '../config/gameConfig';
import { KeyboardInputSource, KeyTracker } from './KeyboardInput';

function key(type: 'keydown' | 'keyup', code: string, repeat = false): Event {
  const e = new Event(type, { cancelable: true });
  Object.defineProperty(e, 'code', { value: code });
  Object.defineProperty(e, 'repeat', { value: repeat });
  return e;
}

function setup() {
  const target = new EventTarget();
  const prevent = new Set<string>([...Object.values(CONTROLS.p1), CONTROLS.ui.debugToggle]);
  const tracker = new KeyTracker(target, prevent).attach();
  const p1 = new KeyboardInputSource(tracker, CONTROLS.p1);
  const p2 = new KeyboardInputSource(tracker, CONTROLS.p2);
  return { target, tracker, p1, p2 };
}

describe('KeyTracker / KeyboardInputSource', () => {
  it('basılı tuş basılı kalır, bırakılınca false olur', () => {
    const { target, p1 } = setup();
    target.dispatchEvent(key('keydown', 'KeyD'));
    expect(p1.read().right).toBe(true);
    expect(p1.read().right).toBe(true);
    target.dispatchEvent(key('keyup', 'KeyD'));
    expect(p1.read().right).toBe(false);
  });

  it('iki okuma arasında basılıp bırakılan tuş kaybolmaz (bir kez görünür)', () => {
    const { target, p1 } = setup();
    target.dispatchEvent(key('keydown', 'Space'));
    target.dispatchEvent(key('keyup', 'Space'));
    expect(p1.read().kick).toBe(true);
    expect(p1.read().kick).toBe(false);
  });

  it('oyuncular kendi tuşlarını okur; sol/sağ Shift ayrılır', () => {
    const { target, p1, p2 } = setup();
    target.dispatchEvent(key('keydown', 'ArrowUp'));
    target.dispatchEvent(key('keydown', 'ShiftRight'));
    const a = p1.read();
    const b = p2.read();
    expect(a.jump || a.super).toBe(false);
    expect(b.jump).toBe(true);
    expect(b.super).toBe(true);
  });

  it('otomatik tekrar olayları yeni basış sayılmaz', () => {
    const { target, tracker, p1 } = setup();
    target.dispatchEvent(key('keydown', 'KeyW', true));
    expect(p1.read().jump).toBe(false);
    expect(tracker.isHeld('KeyW')).toBe(false);
  });

  it('pencere odağı kaybolunca tüm tuşlar bırakılır', () => {
    const { target, p1 } = setup();
    target.dispatchEvent(key('keydown', 'KeyA'));
    target.dispatchEvent(new Event('blur'));
    expect(p1.read().left).toBe(false);
  });

  it('eşlenen tuşlarda tarayıcının varsayılan davranışı engellenir', () => {
    const { target } = setup();
    const space = key('keydown', 'Space');
    const f1 = key('keydown', 'F1');
    const other = key('keydown', 'KeyZ');
    target.dispatchEvent(space);
    target.dispatchEvent(f1);
    target.dispatchEvent(other);
    expect(space.defaultPrevented).toBe(true);
    expect(f1.defaultPrevented).toBe(true);
    expect(other.defaultPrevented).toBe(false);
  });

  it('consumePress kenar tetiklemelidir (basılı tutulsa da bir kez)', () => {
    const { target, tracker } = setup();
    target.dispatchEvent(key('keydown', 'F1'));
    expect(tracker.consumePress('F1')).toBe(true);
    expect(tracker.consumePress('F1')).toBe(false);
  });

  it('detach sonrası olaylar dinlenmez', () => {
    const { target, tracker, p1 } = setup();
    tracker.detach();
    target.dispatchEvent(key('keydown', 'KeyD'));
    expect(p1.read().right).toBe(false);
  });
});
