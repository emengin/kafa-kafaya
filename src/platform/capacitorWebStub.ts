/**
 * Web derlemesi ve testler için `@capacitor/core` yerine geçen boş modül (Faz 2.4,
 * `vite.config.ts` → `resolve.alias`). Yerel eklenti çağrıları yalnızca uygulamada yapılır
 * (`IS_NATIVE_APP` dalı derleme sabitiyle atılır); bu modül yalnızca türleri karşılar.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- gerçek paketin imzası
export function registerPlugin<T>(): T {
  return {} as T;
}
