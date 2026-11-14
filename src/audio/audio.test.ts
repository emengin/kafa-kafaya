import { describe, expect, it } from 'vitest';
import { AUDIO, CROWD, MUSIC, PITCH } from '../config/gameConfig';
import { attackDanger, type DangerInput } from './crowdMood';
import {
  buildBar,
  chordTones,
  midiToHz,
  STEPS_PER_BAR,
  stepSeconds,
  type TrackName,
} from './musicPatterns';
import {
  cycleVolume,
  formatPercent,
  loadVolumes,
  saveVolumes,
  snapVolume,
  stepVolume,
  type KeyValueStore,
} from './settings';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get: (k) => data.get(k) ?? null,
    set: (k, v) => {
      data.set(k, v);
    },
  };
}

describe('Ses ayarları', () => {
  it('değerler 0–1 ve %10 adımlarına oturur', () => {
    expect(snapVolume(0.73)).toBe(0.7);
    expect(snapVolume(-1)).toBe(0);
    expect(snapVolume(3)).toBe(1);
    expect(snapVolume(Number.NaN)).toBe(0);
    expect(stepVolume(0.9, 1)).toBe(1);
    expect(stepVolume(1, 1)).toBe(1);
    expect(stepVolume(0, -1)).toBe(0);
    expect(stepVolume(0.3, -1)).toBe(0.2);
  });

  it('tıklama döngüsü %100 sonrası %0', () => {
    expect(cycleVolume(0.5)).toBe(0.6);
    expect(cycleVolume(1)).toBe(0);
    expect(formatPercent(0.7)).toBe('70%');
  });

  it('kayıt yoksa varsayılanlar; kaydedilen geri okunur; bozuk değer yok sayılır', () => {
    const store = memoryStore();
    expect(loadVolumes(store)).toEqual(AUDIO.defaults);
    saveVolumes(store, { master: 0.4, sfx: 1, music: 0 });
    expect(loadVolumes(store)).toEqual({ master: 0.4, sfx: 1, music: 0 });
    store.set([...store.data.keys()][0] ?? '', 'abc');
    expect(loadVolumes(store).master).toBe(AUDIO.defaults.master);
  });
});

describe('Prosedürel müzik desenleri', () => {
  const tracks = Object.keys(MUSIC.tracks) as TrackName[];

  it('A4 = 440 Hz, oktav iki katı', () => {
    expect(midiToHz(69)).toBeCloseTo(440, 6);
    expect(midiToHz(81)).toBeCloseTo(880, 6);
  });

  it('akor tonları', () => {
    expect(chordTones(60, 'maj')).toEqual([60, 64, 67]);
    expect(chordTones(57, 'min')).toEqual([57, 60, 64]);
    expect(chordTones(60, 'm7')).toEqual([60, 63, 67, 70]);
  });

  it('her ölçü geçerli notalar üretir (adım, uzunluk, aralık)', () => {
    for (const track of tracks) {
      for (let bar = 0; bar < 16; bar++) {
        const events = buildBar(track, bar);
        expect(events.length).toBeGreaterThan(0);
        for (const e of events) {
          expect(e.step).toBeGreaterThanOrEqual(0);
          expect(e.step).toBeLessThan(STEPS_PER_BAR);
          expect(e.length).toBeGreaterThan(0);
          expect(e.velocity).toBeGreaterThan(0);
          expect(e.velocity).toBeLessThanOrEqual(1);
          if (e.inst !== 'kick' && e.inst !== 'snare' && e.inst !== 'hat') {
            expect(e.midi).toBeGreaterThan(20);
            expect(e.midi).toBeLessThan(110);
          }
        }
        expect(events.some((e) => e.inst === 'kick')).toBe(true);
      }
    }
  });

  it('döngü: aynı döngü konumundaki ölçüler birebir aynı (deterministik melodi)', () => {
    for (const track of tracks) {
      const loop = MUSIC.tracks[track].loopBars;
      expect(buildBar(track, 3)).toEqual(buildBar(track, 3 + loop));
      expect(buildBar(track, 0)).toEqual(buildBar(track, loop * 4));
    }
  });

  it('melodi, arpej ve bas notaları parçanın dizisinde (akorlar dizi içi)', () => {
    const scales = {
      major: new Set([0, 2, 4, 5, 7, 9, 11]),
      minor: new Set([0, 2, 3, 5, 7, 8, 10]),
    };
    for (const track of tracks) {
      const t = MUSIC.tracks[track];
      const scale = scales[t.mode];
      for (let bar = 0; bar < t.loopBars; bar++) {
        for (const e of buildBar(track, bar)) {
          if (e.inst === 'kick' || e.inst === 'snare' || e.inst === 'hat') continue;
          const rel = (((e.midi - t.root) % 12) + 12) % 12;
          expect(scale.has(rel)).toBe(true);
        }
      }
    }
  });

  it('tempo: adım süresi bpm ile uyumlu', () => {
    expect(stepSeconds('match')).toBeCloseTo(60 / MUSIC.tracks.match.bpm / 4, 9);
  });
});

describe('Kalabalık — atak tehlikesi', () => {
  const base: DangerInput = {
    ballX: 640,
    ballY: 400,
    ballVx: 0,
    groundY: PITCH.groundY,
    leftLineX: PITCH.goal.depth,
    rightLineX: 1280 - PITCH.goal.depth,
  };

  it('ortada sakin, kaleye yaklaştıkça ve kaleye doğru hızlandıkça artar', () => {
    expect(attackDanger(base)).toBe(0);
    const near = attackDanger({ ...base, ballX: 1280 - PITCH.goal.depth - 100, ballY: 560 });
    const nearFast = attackDanger({
      ...base,
      ballX: 1280 - PITCH.goal.depth - 100,
      ballY: 560,
      ballVx: 1200,
    });
    const nearAway = attackDanger({
      ...base,
      ballX: 1280 - PITCH.goal.depth - 100,
      ballY: 560,
      ballVx: -1200,
    });
    expect(near).toBeGreaterThan(0.2);
    expect(nearFast).toBeGreaterThan(near);
    expect(nearAway).toBeLessThanOrEqual(near);
    expect(nearFast).toBeLessThanOrEqual(1);
  });

  it('iki kale simetrik; yüksek top daha az tehlikeli', () => {
    const left = attackDanger({ ...base, ballX: PITCH.goal.depth + 150, ballY: 560, ballVx: -800 });
    const right = attackDanger({
      ...base,
      ballX: 1280 - PITCH.goal.depth - 150,
      ballY: 560,
      ballVx: 800,
    });
    expect(left).toBeCloseTo(right, 9);
    const high = attackDanger({
      ...base,
      ballX: 1280 - PITCH.goal.depth - 150,
      ballY: 100,
      ballVx: 800,
    });
    expect(high).toBeLessThan(right);
    expect(CROWD.danger.rangePx).toBeGreaterThan(0);
  });
});
