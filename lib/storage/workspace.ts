import { Doc } from "../tokens";
import { isProject } from "../project";
import { ensurePermission, supportsDirectoryPicker } from "./detect";
import {
  DESIGN_FILE,
  META_FILE,
  ProjectListItem,
  ProjectMeta,
  WORKSPACE_MARKER,
  defaultMeta,
  metaFromDoc,
  normalizeMeta,
  sanitizeFolderName,
  sortProjectList,
} from "./types";

/* Minimal structural types so we do not depend on DOM lib extras in tests. */
export type FileHandleLike = {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
};

export type DirHandleLike = {
  name: string;
  kind: "directory";
  entries(): AsyncIterableIterator<[string, unknown]>;
  getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<DirHandleLike>;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileHandleLike>;
  removeEntry(name: string, opts?: { recursive?: boolean }): Promise<void>;
  queryPermission?(d: { mode: "read" | "readwrite" }): Promise<"granted" | "denied" | "prompt">;
  requestPermission?(d: { mode: "read" | "readwrite" }): Promise<"granted" | "denied" | "prompt">;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (opts?: { mode?: "read" | "readwrite" }) => Promise<DirHandleLike>;
};

export async function pickWorkspaceDir(): Promise<DirHandleLike> {
  if (!supportsDirectoryPicker()) throw new Error("directory-picker-unsupported");
  const w = window as DirectoryPickerWindow;
  const handle = await w.showDirectoryPicker?.({ mode: "readwrite" });
  if (!handle) throw new Error("directory-picker-cancelled");
  return handle;
}

async function readText(file: FileHandleLike): Promise<string> {
  const fileObj = await file.getFile();
  return fileObj.text();
}

async function writeText(file: FileHandleLike, text: string): Promise<void> {
  const writable = await file.createWritable();
  await writable.write(text);
  await writable.close();
}

async function readJson(file: FileHandleLike): Promise<unknown> {
  try {
    return JSON.parse(await readText(file));
  } catch {
    return null;
  }
}

async function ensureReadable(handle: DirHandleLike): Promise<boolean> {
  return ensurePermission(handle, "readwrite");
}

export async function markWorkspace(root: DirHandleLike): Promise<void> {
  const file = await root.getFileHandle(WORKSPACE_MARKER, { create: true });
  await writeText(file, JSON.stringify({ app: "prism", schema: 1 }, null, 2));
}

/** list one-level subfolders that look like projects */
export async function listProjects(root: DirHandleLike): Promise<ProjectListItem[]> {
  if (!(await ensureReadable(root))) throw new Error("permission-denied");
  const items: ProjectListItem[] = [];
  for await (const [name, handle] of root.entries()) {
    if (name.startsWith(".")) continue;
    if ((handle as { kind?: string }).kind !== "directory") continue;
    const dir = handle as DirHandleLike;
    let meta: ProjectMeta = defaultMeta(name);
    let readable = false;
    let error: string | undefined;
    let updatedAt = 0;
    try {
      const designHandle = await dir.getFileHandle(DESIGN_FILE);
      const doc = await readJson(designHandle);
      if (isProject(doc)) {
        readable = true;
        updatedAt = Date.parse(meta.updatedAt) || 0;
      } else {
        error = "invalid-design";
      }
    } catch {
      error = "missing-design";
    }
    try {
      const metaHandle = await dir.getFileHandle(META_FILE);
      const raw = await readJson(metaHandle);
      meta = normalizeMeta(raw, name);
      const t = Date.parse(meta.updatedAt);
      if (Number.isFinite(t)) updatedAt = t;
    } catch {
      /* meta optional */
    }
    items.push({
      folderName: name,
      name: meta.name || name,
      note: meta.note,
      updatedAt: updatedAt || 0,
      readable,
      error,
    });
  }
  return sortProjectList(items);
}

export async function createProject(
  root: DirHandleLike,
  name: string,
  doc: Doc,
): Promise<ProjectListItem> {
  if (!(await ensureReadable(root))) throw new Error("permission-denied");
  const folderName = sanitizeFolderName(name);
  const dir = await root.getDirectoryHandle(folderName, { create: true });
  await writeDocAndMeta(dir, doc);
  return {
    folderName,
    name: folderName,
    updatedAt: Date.now(),
    readable: true,
  };
}

async function writeDocAndMeta(dir: DirHandleLike, doc: Doc, previousMeta?: Partial<ProjectMeta> | null): Promise<void> {
  if (!isProject(doc)) throw new Error("invalid-project");
  const design = await dir.getFileHandle(DESIGN_FILE, { create: true });
  await writeText(design, JSON.stringify(doc, null, 2));
  const meta = metaFromDoc(doc, previousMeta);
  const metaHandle = await dir.getFileHandle(META_FILE, { create: true });
  await writeText(metaHandle, JSON.stringify(meta, null, 2));
}

export async function openProjectDoc(root: DirHandleLike, folderName: string): Promise<Doc> {
  if (!(await ensureReadable(root))) throw new Error("permission-denied");
  const dir = await root.getDirectoryHandle(folderName);
  const design = await dir.getFileHandle(DESIGN_FILE);
  const raw = await readJson(design);
  if (!isProject(raw)) throw new Error("invalid-design");
  return raw;
}

export async function saveProjectDoc(
  root: DirHandleLike,
  folderName: string,
  doc: Doc,
): Promise<void> {
  if (!(await ensureReadable(root))) throw new Error("permission-denied");
  const dir = await root.getDirectoryHandle(folderName);
  let previous: Partial<ProjectMeta> | null = null;
  try {
    const metaHandle = await dir.getFileHandle(META_FILE);
    previous = normalizeMeta(await readJson(metaHandle), folderName);
  } catch {
    previous = null;
  }
  await writeDocAndMeta(dir, doc, previous);
}

export async function renameProject(root: DirHandleLike, from: string, name: string): Promise<string> {
  if (!(await ensureReadable(root))) throw new Error("permission-denied");
  const next = sanitizeFolderName(name);
  if (next === from) return from;
  /* FSA has no move(); copy design + meta into new folder, then remove old */
  const oldDir = await root.getDirectoryHandle(from);
  const newDir = await root.getDirectoryHandle(next, { create: true });
  const design = await openProjectDoc(root, from);
  const metaHandle = await oldDir.getFileHandle(META_FILE).catch(() => null);
  const metaRaw = metaHandle ? await readJson(metaHandle) : null;
  await writeDocAndMeta(newDir, design, normalizeMeta(metaRaw, next));
  await root.removeEntry(from, { recursive: true });
  return next;
}

export async function deleteProject(root: DirHandleLike, folderName: string): Promise<void> {
  if (!(await ensureReadable(root))) throw new Error("permission-denied");
  await root.removeEntry(folderName, { recursive: true });
}

export function projectWriter(root: DirHandleLike, folderName: string) {
  return (doc: Doc) => saveProjectDoc(root, folderName, doc);
}
