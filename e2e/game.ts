/** Testlerin `?debug=1` ile eriştiği oyun nesnesinin kullanılan kısmı (paylaşılan tip). */
export interface GameHandle {
  loop: { frame: number };
  scene: {
    isActive(key: string): boolean;
    getScene(key: string): Record<string, unknown> & { sim?: { tick: number } };
  };
}

declare global {
  interface Window {
    __KAFA_GAME__?: GameHandle;
  }
}
