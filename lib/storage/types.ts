import type { Doc } from "../tokens";

/** metadata beside design.json in a project folder */
export type ProjectMeta = {
  schema: number;
  app: "prism";
  name: string;
  note?: string;
  updatedAt: string;
};

export type ProjectListItem = {
  /** folder name under the workspace; stable id for FSA mode */
  folderName: string;
  name: string;
  note?: string;
  updatedAt: number;
  /** true when design.json exists and parsed */
  readable: boolean;
  error?: string;
};

export type WorkspaceMode = "fsa" | "fallback";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export const META_SCHEMA = 1;
export const WORKSPACE_MARKER = ".prism-workspace.json";
export const DESIGN_FILE = "design.json";
export const META_FILE = "meta.json";

export const defaultMeta = (name: string, updatedAt = new Date().toISOString()): ProjectMeta => ({
  schema: META_SCHEMA,
  app: "prism",
  name,
  updatedAt,
});

/** folder / file name safe on Windows and most filesystems */
export function sanitizeFolderName(raw: string): string {
  const cleaned = raw
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "未命名设计";
}

export function metaFromDoc(doc: Doc, previous?: Partial<ProjectMeta> | null): ProjectMeta {
  const name = sanitizeFolderName(doc.title || previous?.name || "未命名设计");
  return {
    schema: META_SCHEMA,
    app: "prism",
    name,
    note: previous?.note,
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeMeta(raw: unknown, fallbackName: string, updatedAtIso?: string): ProjectMeta {
  const rec = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const name =
    typeof rec.name === "string" && rec.name.trim()
      ? rec.name.trim()
      : fallbackName;
  const note = typeof rec.note === "string" ? rec.note : undefined;
  const updatedAt =
    typeof rec.updatedAt === "string" && rec.updatedAt
      ? rec.updatedAt
      : updatedAtIso ?? new Date().toISOString();
  return {
    schema: typeof rec.schema === "number" ? rec.schema : META_SCHEMA,
    app: "prism",
    name: sanitizeFolderName(name),
    note,
    updatedAt,
  };
}

export function sortProjectList(items: ProjectListItem[]): ProjectListItem[] {
  return [...items].sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name, "zh-CN"));
}

export function displayNameOf(item: Pick<ProjectListItem, "name" | "folderName">): string {
  return item.name || item.folderName;
}
