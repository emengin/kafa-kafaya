import { runFixture, type ReplayFixture, type ReplayRun } from '../../src/game/crossEngine/fixture';
import { goldenDigest } from '../../src/physics/detMathGolden';

/**
 * Çapraz motor testinin tarayıcı paketi (Faz 2.7): `bundle.ts` bunu üretim ayarlarıyla (küçültülmüş)
 * tek dosyaya derler, test her tarayıcıda boş sayfaya ekler.
 */
export interface DeterminismApi {
  run(fixture: ReplayFixture): ReplayRun;
  golden(): string;
}

const api: DeterminismApi = { run: runFixture, golden: goldenDigest };
Reflect.set(globalThis, '__KAFA_DETERMINISM__', api);
