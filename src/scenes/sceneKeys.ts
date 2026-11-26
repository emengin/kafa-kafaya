export const SceneKeys = {
  Boot: 'Boot',
  Preload: 'Preload',
  Menu: 'Menu',
  Select: 'Select',
  Match: 'Match',
  Tournament: 'Tournament',
  Trophy: 'Trophy',
  ControlsEditor: 'ControlsEditor',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
