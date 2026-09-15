import { Doc } from "../tokens";
import { isProject } from "../project";
import { ProjectListItem } from "./types";

const RECENT_KEY = "prism:recent";
const MAX_RECENT = 20;

export type RecentEntry = {
  id: string;
  name: string;
  updatedAt: number;
  doc: Doc;
};

export function supportsWorkspaceFs(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as { showDirectoryPicker?: unknown }).showDirectoryPicker === "function"
  );
}

export function loadRecentProjects(): ProjectListItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const items: ProjectListItem[] = [];
    for (const entry of parsed) {
      const rec = entry as Partial<RecentEntry>;
      if (!rec || typeof rec.id !== "string" || !isProject(rec.doc)) continue;
      items.push({
        folderName: rec.id,
        name: typeof rec.name === "string" && rec.name ? rec.name : rec.id,
        updatedAt: typeof rec.updatedAt === "number" ? rec.updatedAt : 0,
        readable: true,
      });
    }
    /* already newest-first from unshift; do not re-sort by equal timestamps */
    return items;
  } catch {
    return [];
  }
}

export function loadRecentDoc(id: string): Doc | null {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    for (const entry of parsed) {
      const rec = entry as Partial<RecentEntry>;
      if (rec?.id === id && isProject(rec.doc)) return rec.doc;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveRecentProject(id: string, name: string, doc: Doc): void {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    let list: RecentEntry[] = [];
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed as RecentEntry[];
    }
    const next: RecentEntry = {
      id,
      name,
      updatedAt: Date.now(),
      doc,
    };
    const filtered = list.filter((e) => e?.id !== id);
    filtered.unshift(next);
    /* cap by count; strip unreadable */
    const kept = filtered.filter((e) => e && typeof e.id === "string" && isProject(e.doc)).slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(kept));
  } catch {
    /* quota — drop recents silently */
  }
}

export function removeRecentProject(id: string): void {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const kept = (parsed as RecentEntry[]).filter((e) => e?.id !== id);
    localStorage.setItem(RECENT_KEY, JSON.stringify(kept));
  } catch {
    /* ignore */
  }
}

export function recentToListItems(): ProjectListItem[] {
  return loadRecentProjects();
}

export function createFallbackProjectId(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
