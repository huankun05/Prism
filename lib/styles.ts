import type { Theme } from "./tokens";

/** Visual style presets the user can pick in the AI studio (no API key required). */
export type StylePreset = {
  id: string;
  label: string;
  /** short Chinese/English blurb shown under the card */
  blurb: string;
  paletteKey: string;
  /** theme patch applied with the palette */
  theme: Partial<Theme>;
  /** CSS gradient for the card swatch */
  swatch: string;
  /** text color on swatch */
  ink: string;
  /** extra prompt fragment when generating with this style */
  promptHint: string;
};

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "clean",
    label: "清爽 Material",
    blurb: "蓝 · 圆角 · 清晰层级",
    paletteKey: "blue",
    theme: { dark: false, shape: "rounded", motion: "standard", emphasized: false, contrast: "standard" },
    swatch: "linear-gradient(135deg,#D3E4FF 0%,#1B57C9 48%,#0B2E6F 100%)",
    ink: "#0B2E6F",
    promptHint: "clean Material 3 product UI, clear hierarchy, calm blue brand",
  },
  {
    id: "soft",
    label: "柔和粉彩",
    blurb: "珊瑚 · 轻盈 · 消费感",
    paletteKey: "coral",
    theme: { dark: false, shape: "full", motion: "expressive", emphasized: true, contrast: "standard" },
    swatch: "linear-gradient(135deg,#FFD9E2 0%,#984061 55%,#4A0025 100%)",
    ink: "#4A0025",
    promptHint: "soft pastel consumer app, friendly rounded shapes, warm coral accents",
  },
  {
    id: "studio-dark",
    label: "暗色工作室",
    blurb: "深色 · 工具 · 高对比",
    paletteKey: "mono",
    theme: { dark: true, shape: "rounded", motion: "standard", emphasized: false, contrast: "standard" },
    swatch: "linear-gradient(135deg,#3A3840 0%,#1C1B1F 50%,#000 100%)",
    ink: "#E6E0E9",
    promptHint: "dark studio tool UI, high contrast, mono surfaces, minimal chrome",
  },
  {
    id: "cyber",
    label: "赛博霓虹",
    blurb: "青绿 · 暗底 · 霓虹",
    paletteKey: "teal",
    theme: { dark: true, shape: "square", motion: "expressive", emphasized: true, contrast: "high" },
    swatch: "linear-gradient(135deg,#003D3F 0%,#00B8A9 45%,#7DFAF0 100%)",
    ink: "#003D3F",
    promptHint: "cyberpunk-inspired dark UI with teal neon accents, sharp corners, high contrast, tech dashboard energy",
  },
  {
    id: "glass",
    label: "玻璃拟态",
    blurb: "紫 · 半透 · 轻浮层",
    paletteKey: "purple",
    theme: { dark: false, shape: "rounded", motion: "expressive", emphasized: true, contrast: "standard" },
    swatch: "linear-gradient(135deg,#EADDFF 0%,#6750A4 50%,#21005D 100%)",
    ink: "#21005D",
    promptHint: "glassmorphism style UI: frosted translucent cards, soft purple gradients, floating layers, airy spacing",
  },
  {
    id: "nature",
    label: "自然绿",
    blurb: "绿 · 生长 · 健康",
    paletteKey: "green",
    theme: { dark: false, shape: "rounded", motion: "standard", emphasized: false, contrast: "standard" },
    swatch: "linear-gradient(135deg,#C8F0C4 0%,#386A20 55%,#0D2000 100%)",
    ink: "#0D2000",
    promptHint: "nature-inspired green wellness app, calm surfaces, organic rounded geometry",
  },
  {
    id: "amber",
    label: "琥珀温暖",
    blurb: "琥珀 · 品牌 · 活力",
    paletteKey: "amber",
    theme: { dark: false, shape: "rounded", motion: "expressive", emphasized: true, contrast: "standard" },
    swatch: "linear-gradient(135deg,#FFE0B8 0%,#8B5000 55%,#2C1600 100%)",
    ink: "#2C1600",
    promptHint: "warm amber brand UI, energetic but grounded, expressive motion feel",
  },
  {
    id: "mono-min",
    label: "极简黑白",
    blurb: "灰阶 · 极简 · 编辑器",
    paletteKey: "mono",
    theme: { dark: false, shape: "square", motion: "standard", emphasized: false, contrast: "standard" },
    swatch: "linear-gradient(135deg,#F4EFF4 0%,#79747E 50%,#1C1B1F 100%)",
    ink: "#1C1B1F",
    promptHint: "minimal black-and-white editorial tool UI, sharp geometry, almost no color except one accent",
  },
];

export const styleById = (id: string) => STYLE_PRESETS.find((s) => s.id === id) ?? STYLE_PRESETS[0];

/** idea text including the chosen style so drafts stay on-brand */
export function ideaWithStyle(idea: string, styleId: string): string {
  const s = styleById(styleId);
  return `${idea.trim()}\n\nVisual direction: ${s.promptHint}. Palette key preference: ${s.paletteKey}. Shape: ${s.theme.shape}; motion: ${s.theme.motion}; dark: ${s.theme.dark}.`;
}
