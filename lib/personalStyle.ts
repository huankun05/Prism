import type { Doc, Theme } from "./tokens";
import { normalizeTheme } from "./tokens";
import { isProject } from "./project";

const KEY = "prism:personal-style";

export type PersonalStyle = {
  schema: 1;
  id: string;
  name: string;
  paletteKey: string;
  theme: Theme;
  stylePresetId?: string;
  defaultDevice?: "phone" | "tablet" | "desktop" | "both";
  defaultPlatform?: "android" | "web";
  favoriteIcons?: string[];
  updatedAt: string;
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export function normalizePersonalStyle(raw: unknown, fallbackName = "默认档案"): PersonalStyle | null {
  if (!isRecord(raw)) return null;
  const paletteKey = typeof raw.paletteKey === "string" && raw.paletteKey ? raw.paletteKey : null;
  if (!paletteKey) return null;
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 40) : fallbackName;
  const theme = normalizeTheme(isRecord(raw.theme) ? (raw.theme as Partial<Theme>) : undefined);
  const id = typeof raw.id === "string" && raw.id ? raw.id : "personal-main";
  const device = raw.defaultDevice;
  const platform = raw.defaultPlatform;
  return {
    schema: 1,
    id,
    name,
    paletteKey,
    theme,
    stylePresetId: typeof raw.stylePresetId === "string" ? raw.stylePresetId : undefined,
    defaultDevice:
      device === "phone" || device === "tablet" || device === "desktop" || device === "both" ? device : undefined,
    defaultPlatform: platform === "android" || platform === "web" ? platform : undefined,
    favoriteIcons: Array.isArray(raw.favoriteIcons)
      ? raw.favoriteIcons.filter((x): x is string => typeof x === "string").slice(0, 50)
      : [],
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
}

export function loadPersonalStyle(): PersonalStyle | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return normalizePersonalStyle(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function savePersonalStyle(style: PersonalStyle): PersonalStyle {
  const next: PersonalStyle = {
    ...style,
    schema: 1,
    id: "personal-main",
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  return next;
}

export function clearPersonalStyle(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** capture the open document's palette + theme into a personal profile */
export function personalStyleFromDoc(doc: Pick<Doc, "paletteKey" | "theme" | "title">, name?: string, stylePresetId?: string): PersonalStyle {
  const existing = loadPersonalStyle();
  return savePersonalStyle({
    schema: 1,
    id: "personal-main",
    name: name?.trim() || existing?.name || "默认档案",
    paletteKey: doc.paletteKey || existing?.paletteKey || "purple",
    theme: normalizeTheme(doc.theme),
    stylePresetId: stylePresetId ?? existing?.stylePresetId,
    defaultDevice: existing?.defaultDevice ?? "phone",
    defaultPlatform: existing?.defaultPlatform,
    favoriteIcons: existing?.favoriteIcons ?? [],
    updatedAt: new Date().toISOString(),
  });
}

/** initial Doc patch when a new project is created with the personal profile */
export function applyPersonalStyleToDoc(doc: Doc, style: PersonalStyle): Doc {
  return {
    ...doc,
    paletteKey: style.paletteKey,
    theme: { ...style.theme },
    platform: style.defaultPlatform ?? doc.platform,
  };
}

export function exportPersonalStyleJson(style: PersonalStyle): string {
  return JSON.stringify(style, null, 2);
}

export function parsePersonalStyleImport(text: string): PersonalStyle {
  const next = normalizePersonalStyle(JSON.parse(text));
  if (!next) throw new Error("invalid-personal-style");
  return savePersonalStyle(next);
}

export const personalStyleValid = (s: PersonalStyle | null): s is PersonalStyle => !!s && isProject({ groups: [], frames: [], paletteKey: s.paletteKey, frame: "phone" });
