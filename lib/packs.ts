import { PALETTES, Theme, paletteOf, type Palette } from "./tokens";

/** Design system pack: shared product, different visual rules + export profile. */
export type PackId = "material" | "shadcn";

export type DesignPack = {
  id: PackId;
  label: string;
  blurb: string;
  /** prompt fragment when generating or exporting */
  promptHint: string;
  /** theme applied when switching packs (keeps dark preference when possible) */
  themeDefaults: Partial<Theme>;
  /** preferred palette when pack is first selected */
  defaultPalette: string;
};

export const DESIGN_PACKS: DesignPack[] = [
  {
    id: "material",
    label: "Material 3",
    blurb: "Expressive · 角色色板",
    promptHint: "Material 3 Design with tonal surfaces, filled/outlined/tonal buttons, navigation bar or rail.",
    themeDefaults: { shape: "rounded", font: "roboto", motion: "standard", emphasized: false },
    defaultPalette: "purple",
  },
  {
    id: "shadcn",
    label: "shadcn / Neutral",
    blurb: "中性 · 低饱和 · 工具感",
    promptHint:
      "shadcn/ui style: neutral zinc surfaces, subtle borders, minimal radius, no Material tonal palette language; use Tailwind-friendly spacing.",
    themeDefaults: { shape: "square", font: "system", motion: "standard", emphasized: false, contrast: "standard" },
    defaultPalette: "mono",
  },
];

export const packById = (id: PackId) => DESIGN_PACKS.find((p) => p.id === id) ?? DESIGN_PACKS[0];

export function packTheme(pack: DesignPack, current: Theme): Theme {
  return {
    ...current,
    ...pack.themeDefaults,
    dark: current.dark,
    bothModes: current.bothModes,
    contrast: pack.themeDefaults.contrast ?? current.contrast,
  };
}

export function packPalette(pack: DesignPack): string {
  return pack.defaultPalette;
}

/** CSS variables export (design tokens) from a palette + pack */
export function exportTokenCss(palette: Palette, packId: PackId): string {
  const pack = packById(packId);
  const rows = [
    `/* Prism tokens · ${pack.label} · ${new Date().toISOString().slice(0, 10)} */`,
    `:root {`,
    `  --prism-pack: ${pack.id};`,
    `  --prism-primary: ${palette.primary};`,
    `  --prism-on-primary: ${palette.onPrimary};`,
    `  --prism-primary-container: ${palette.primaryContainer};`,
    `  --prism-on-primary-container: ${palette.onPrimaryContainer};`,
    `  --prism-secondary-container: ${palette.secondaryContainer};`,
    `  --prism-on-secondary-container: ${palette.onSecondaryContainer};`,
    `  --prism-surface: ${palette.surface};`,
    `  --prism-surface-container: ${palette.surfaceContainer};`,
    `  --prism-on-surface: ${palette.onSurface};`,
    `  --prism-on-surface-variant: ${palette.onSurfaceVariant};`,
    `  --prism-outline: ${palette.outline};`,
    `  --prism-outline-variant: ${palette.outlineVariant};`,
    `  --prism-error: ${palette.error};`,
    `  --prism-radius-sm: ${pack.id === "shadcn" ? "6px" : "8px"};`,
    `  --prism-radius-md: ${pack.id === "shadcn" ? "8px" : "16px"};`,
    `  --prism-radius-lg: ${pack.id === "shadcn" ? "12px" : "28px"};`,
    `  --prism-space-1: 4px;`,
    `  --prism-space-2: 8px;`,
    `  --prism-space-3: 12px;`,
    `  --prism-space-4: 16px;`,
    `  --prism-space-6: 24px;`,
    `}`,
  ];
  return rows.join("\n");
}

export function resolvePalette(key: string, custom?: Palette | null): Palette {
  return paletteOf(key, custom ?? undefined);
}

export function firstPaletteKey(): string {
  return PALETTES[0]?.key ?? "purple";
}
