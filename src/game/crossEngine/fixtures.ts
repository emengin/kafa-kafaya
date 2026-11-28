import type { ReplayFixture } from './fixture';

/**
 * Kayıtlı çapraz motor tekrarları (`fixtures/*.json`, `npm run replays -- --record`). Yalnızca
 * testler ve geliştirici araçları içe aktarır; yayın paketine girmez.
 */
const modules = import.meta.glob<ReplayFixture>('./fixtures/*.json', {
  eager: true,
  import: 'default',
});

export const REPLAY_FIXTURES: readonly ReplayFixture[] = Object.keys(modules)
  .sort()
  .map((k) => modules[k])
  .filter((f): f is ReplayFixture => f !== undefined);
