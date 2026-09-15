/** persist a FileSystemDirectoryHandle in IndexedDB so a refresh keeps the workspace */
const DB_NAME = "prism-storage";
const STORE = "handles";
const WORKSPACE_KEY = "workspace-root";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
  });
}

export async function saveWorkspaceHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(handle, WORKSPACE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("idb write failed"));
    });
  } finally {
    db.close();
  }
}

export async function loadWorkspaceHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    try {
      const value = await new Promise<unknown>((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(WORKSPACE_KEY);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("idb read failed"));
      });
      if (value && typeof value === "object" && "kind" in (value as object)) {
        return value as FileSystemDirectoryHandle;
      }
      return null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

export async function clearWorkspaceHandle(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(WORKSPACE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("idb delete failed"));
      });
    } finally {
      db.close();
    }
  } catch {
    /* ignore */
  }
}
