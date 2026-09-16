import { DEFAULT_THEME, Palette, paletteOf } from "./tokens";

/** Editor chrome tokens — never follow the project document theme. */
export const CHROME = {
  /** base grid */
  unit: 4,
  space1: 4,
  space2: 8,
  space3: 12,
  space4: 16,
  space5: 20,
  space6: 24,
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 20,
  /** left rail width */
  railW: 52,
  /** minimum content width for left inspector */
  panelMin: 260,
  panelDefault: 300,
  rightDefault: 320,
  /** floating chrome z */
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
