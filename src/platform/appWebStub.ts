/**
 * Web derlemesi ve testler için `@capacitor/app` yerine geçen boş modül (Faz 2.5, `vite.config.ts`
 * → `resolve.alias`). Geri tuşu ve uygulama durumu yalnızca Android uygulamasında var
 * (`lifecycle.ts`, `IS_NATIVE_APP` dalı); burası türleri karşılar.
 */
const done = (): Promise<void> => Promise.resolve();

export const App = {
  addListener(): Promise<{ remove: () => Promise<void> }> {
    return Promise.resolve({ remove: done });
  },
  exitApp: done,
};
