export const SceneKeys = {
  Boot: 'Boot',
  Preload: 'Preload',
  Menu: 'Menu',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
