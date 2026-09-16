import { DEFAULT_THEME, Palette, paletteOf } from "./tokens";

/** Editor chrome tokens — never follow the project document theme. */
export const CHROME = {
  unit: 4,
  space1: 4,
  space2: 8,
  space3: 12,
  space4: 16,
  space5: 20,
  space6: 24,
  radiusSm: 8,
  radiusMd: 10,
  radiusLg: 12,
  radiusXl: 16,
  topBarH: 48,
  railW: 48,
  panelMin: 260,
  panelDefault: 280,
  rightDefault: 300,
  iconBtn: 28,
  zToolbar: 50,
  zExit: 70,
  zModal: 100,
} as const;

/** Stable light chrome palette for the app shell. */
export function chromePalette(): Palette {
  return paletteOf("purple", null, DEFAULT_THEME);
}

export const chromeShadow = "0 1px 2px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)";
export const chromeBorder = (p: Palette) => `1px solid ${p.outlineVariant}`;
