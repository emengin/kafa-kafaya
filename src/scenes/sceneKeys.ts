export const SceneKeys = {
  Boot: 'Boot',
  Preload: 'Preload',
  Menu: 'Menu',
  Select: 'Select',
  Match: 'Match',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
