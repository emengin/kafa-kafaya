import { describe, expect, it } from 'vitest';
import { AUTOMATIC_EVENTS, EVENT_DICTIONARY, validateEvent, type EventSpec } from './events';
import { clampInt } from './hooks';

const DICT = EVENT_DICTIONARY as Readonly<Record<string, EventSpec>>;

/** Firebase Analytics'in ayrılmış olay adları (Android). */
const RESERVED_EVENTS = [
  'ad_activeview',
  'ad_click',
  'ad_exposure',
  'ad_impression',
  'ad_query',
  'ad_reward',
  'adunit_exposure',
  'app_background',
  'app_clear_data',
  'app_exception',
  'app_remove',
  'app_store_refund',
  'app_store_subscription_cancel',
  'app_store_subscription_convert',
  'app_store_subscription_renew',
  'app_update',
  'app_upgrade',
  'dynamic_link_app_open',
  'dynamic_link_app_update',
  'dynamic_link_first_open',
  'error',
  'first_open',
  'first_visit',
  'in_app_purchase',
  'notification_dismiss',
  'notification_foreground',
  'notification_open',
  'notification_receive',
  'os_update',
  'session_start',
  'session_start_with_rollout',
  'user_engagement',
];

/**
 * Kişisel veri olabilecek parametre adları (parça olarak geçmesi yeter). Olay sözlüğüne böyle bir
 * alan eklemek bu testi kırar; gerçekten gerekiyorsa önce DATA_MAP ve avukat incelemesi.
 */
const FORBIDDEN_PARTS = [
  'name',
  'email',
  'mail',
  'phone',
  'tel',
  'address',
  'ip',
  'location',
  'geo',
  'lat',
  'lon',
  'gps',
  'city',
  'device_id',
  'android_id',
  'ssaid',
  'imei',
  'ad_id',
  'adid',
  'advertising',
  'gaid',
  'idfa',
  'user_id',
  'uid',
  'account',
  'nick',
  'birth',
  'age',
  'gender',
  'message',
  'text',
  'url',
  'token',
];

const NAME_RULE = /^[a-z][a-z0-9_]{0,39}$/;
const MAX_PARAMS = 25;
const MAX_VALUE_LENGTH = 100;

describe('olay sözlüğü (Faz 2.8)', () => {
  const names = Object.keys(DICT);

  it('olay adları Firebase kurallarına uyar, ayrılmış ad ya da önek yok', () => {
    for (const name of names) {
      expect(name).toMatch(NAME_RULE);
      expect(RESERVED_EVENTS).not.toContain(name);
      expect(name).not.toMatch(/^(firebase_|google_|ga_)/);
      expect(AUTOMATIC_EVENTS).not.toHaveProperty(name);
    }
  });

  it('parametreler: ≤ 25, ad kuralı, kişisel veri adı yok', () => {
    for (const [event, spec] of Object.entries(DICT)) {
      const params = Object.keys(spec.params);
      expect(params.length, event).toBeLessThanOrEqual(MAX_PARAMS);
      for (const p of params) {
        expect(p).toMatch(NAME_RULE);
        expect(p).not.toMatch(/^(firebase_|google_|ga_)/);
        for (const part of FORBIDDEN_PARTS) {
          expect(p.split('_'), `${event}.${p} ~ ${part}`).not.toContain(part);
          if (part.includes('_')) expect(p, `${event}.${p}`).not.toContain(part);
        }
      }
    }
  });

  it('serbest metin yok: her parametre ya sabit liste ya da sınırlı tam sayı', () => {
    for (const [event, spec] of Object.entries(DICT)) {
      expect(spec.description.length, event).toBeGreaterThan(0);
      for (const [p, ps] of Object.entries(spec.params)) {
        expect(['enum', 'int'], `${event}.${p}`).toContain(ps.type);
        if (ps.type === 'enum') {
          expect(ps.values.length).toBeGreaterThan(0);
          for (const v of ps.values) {
            expect(v.length).toBeLessThanOrEqual(MAX_VALUE_LENGTH);
            expect(v).toMatch(/^[a-z0-9_]+$/);
          }
        } else {
          expect(Number.isInteger(ps.min) && Number.isInteger(ps.max)).toBe(true);
          expect(ps.max).toBeGreaterThanOrEqual(ps.min);
        }
      }
    }
  });

  it('doğrulama: sözlüğe uyan olay geçer, uymayan durur', () => {
    const ok = {
      mode: 'cpu',
      outcome: 'p1_win',
      goals_p1: 3,
      goals_p2: 1,
      duration_s: 95,
      golden_goal: 0,
    };
    expect(validateEvent('match_end', ok)).toBeNull();
    expect(validateEvent('match_end', { ...ok, outcome: 'kazandı' })).not.toBeNull();
    expect(validateEvent('match_end', { ...ok, goals_p1: 1.5 })).not.toBeNull();
    expect(validateEvent('match_end', { ...ok, goals_p1: -1 })).not.toBeNull();
    expect(validateEvent('match_end', { ...ok, player_name: 'Ali' })).not.toBeNull();
    const missing: Record<string, unknown> = { ...ok };
    delete missing.golden_goal;
    expect(validateEvent('match_end', missing)).not.toBeNull();
    expect(validateEvent('bilinmeyen', {})).not.toBeNull();
    expect(validateEvent('client_error', { kind: 'js_error' })).toBeNull();
  });

  it('yerel olayın adı ve parametresi Java tarafıyla aynı (TelemetryPlugin.recordRendererGone)', () => {
    expect(DICT.renderer_gone?.source).toBe('native');
    expect(Object.keys(DICT.renderer_gone?.params ?? {})).toEqual(['did_crash']);
  });

  it('clampInt: yuvarlar ve aralığa kırpar', () => {
    expect(clampInt(94.6, 0, 100)).toBe(95);
    expect(clampInt(-3, 0, 100)).toBe(0);
    expect(clampInt(1e9, 0, 7200)).toBe(7200);
    expect(clampInt(Number.NaN, 0, 10)).toBe(0);
  });
});
