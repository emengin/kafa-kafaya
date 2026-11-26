/**
 * Web derlemesi ve testler için `@capacitor/haptics` yerine geçen boş modül (Faz 2.3,
 * `vite.config.ts` → `resolve.alias`). Tarayıcıda titreşim `navigator.vibrate` ile yapılır
 * (`haptics.ts`); bu modül yalnızca derleme sabitiyle atılan uygulama dalının türlerini karşılar.
 */
export const ImpactStyle = { Heavy: 'HEAVY', Medium: 'MEDIUM', Light: 'LIGHT' } as const;

export const Haptics = {
  /** Türler gerçek paketten gelir; burada parametre gerekmez. */
  impact(): Promise<void> {
    return Promise.resolve();
  },
};
