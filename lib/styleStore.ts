import { Doc, Theme } from "./tokens";
import { STYLE_PRESETS, StylePreset } from "./styles";

/** User-defined style presets stored in this browser (exportable JSON). */
const CUSTOM_KEY = "prism:style-presets";

export type UserStylePreset = StylePreset & {
  source: "custom";
  createdAt: number;
};

function isPreset(v: unknown): v is UserStylePreset {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.label === "string" &&
    typeof r.paletteKey === "string" &&
    !!r.theme &&
    typeof r.theme === "object"
  );
}

export function loadUserPresets(): UserStylePreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter(isPreset);
  } catch {
    return [];
  }
}

export function saveUserPresets(list: UserStylePreset[]): void {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
  } catch {
    /* quota */
  }
}

/** capture current canvas theme/palette as a named preset */
export function presetFromDoc(doc: Pick<Doc, "paletteKey" | "theme" | "title">, label: string, promptHint = ""): UserStylePreset {
  const id = `user-${Date.now().toString(36)}`;
  const theme: Partial<Theme> = {
    dark: doc.theme?.dark ?? false,
    shape: doc.theme?.shape ?? "rounded",
    motion: doc.theme?.motion ?? "standard",
    emphasized: doc.theme?.emphasized ?? false,
    contrast: doc.theme?.contrast ?? "standard",
  };
  return {
    id,
    source: "custom",
    createdAt: Date.now(),
    label: label.slice(0, 24) || "我的预设",
    blurb: doc.theme?.dark ? "深色 · 自定义" : "浅色 · 自定义",
    paletteKey: doc.paletteKey || "purple",
    theme,
    swatch: "linear-gradient(135deg,#E8E0F0 0%,#6750A4 55%,#21005D 100%)",
    ink: "#21005D",
    promptHint: promptHint || `custom brand style palette=${doc.paletteKey}`,
  };
}

export function upsertUserPreset(p: UserStylePreset): UserStylePreset[] {
  const list = loadUserPresets().filter((x) => x.id !== p.id);
  list.unshift(p);
  const kept = list.slice(0, 40);
  saveUserPresets(kept);
  return kept;
}

export function removeUserPreset(id: string): UserStylePreset[] {
  const kept = loadUserPresets().filter((x) => x.id !== id);
  saveUserPresets(kept);
  return kept;
}

/** merge built-in + user presets for the studio grid */
export function allPresets(user: UserStylePreset[]): StylePreset[] {
  return [...user, ...STYLE_PRESETS];
}

export function parsePresetImport(text: string): UserStylePreset[] {
  const data: unknown = JSON.parse(text);
  const arr = Array.isArray(data) ? data : [data];
  const out: UserStylePreset[] = [];
  for (const item of arr) {
    if (!isPreset(item)) continue;
    out.push({
      ...item,
      source: "custom",
      createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
      id: item.id.startsWith("user-") ? item.id : `user-${item.id}`,
    });
  }
  if (!out.length) throw new Error("invalid-preset");
  return out;
}

export function exportPresetsJson(user: UserStylePreset[]): string {
  return JSON.stringify(user, null, 2);
}

/* —— AI connection mode —— */
export type AiMode = "none" | "local-api" | "bridge" | "both";

export function detectAiMode(opts: { bridgeConnected: boolean; hasLocalKey: boolean }): AiMode {
  if (opts.bridgeConnected && opts.hasLocalKey) return "both";
  if (opts.bridgeConnected) return "bridge";
  if (opts.hasLocalKey) return "local-api";
  return "none";
}

/** default frames for a generation target */
export function framesForTarget(target: "phone" | "tablet" | "desktop" | "both"): Doc["frames"] {
  const phone = { id: "home", name: "Home", x: 0, y: 0 };
  const detail = { id: "detail", name: "Detail", x: 492, y: 0 };
  const tablet = { id: "home", name: "Home", x: 0, y: 0, w: 834, h: 1112 };
  const desktop = { id: "home", name: "Home", x: 0, y: 0, w: 1280, h: 800 };
  if (target === "tablet") return [tablet];
  if (target === "desktop") return [desktop];
  if (target === "both") return [phone, detail, { ...desktop, x: 0, y: 980 }];
  return [phone, detail];
}

export const DEVICE_OPTIONS: { key: "phone" | "tablet" | "desktop" | "both"; label: string; blurb: string }[] = [
  { key: "phone", label: "手机", blurb: "412×892" },
  { key: "tablet", label: "平板", blurb: "834×1112" },
  { key: "desktop", label: "桌面/网页", blurb: "1280×800" },
  { key: "both", label: "双端", blurb: "手机 + 桌面" },
];
