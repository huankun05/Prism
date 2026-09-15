/** Chromium File System Access directory picker availability */
export function supportsDirectoryPicker(): boolean {
  return typeof window !== "undefined" && typeof (window as { showDirectoryPicker?: unknown }).showDirectoryPicker === "function";
}

export type DirPermission = "granted" | "denied" | "prompt";

type PermissionCapable = {
  queryPermission?: (d: { mode: "read" | "readwrite" }) => Promise<DirPermission>;
  requestPermission?: (d: { mode: "read" | "readwrite" }) => Promise<DirPermission>;
};

/** best-effort permission probe on a directory handle */
export async function ensurePermission(handle: unknown, mode: "read" | "readwrite" = "readwrite"): Promise<boolean> {
  const h = handle as PermissionCapable;
  if (!h) return false;
  try {
    if (h.queryPermission) {
      const q = await h.queryPermission({ mode });
      if (q === "granted") return true;
      if (q === "denied" && !h.requestPermission) return false;
    }
    if (h.requestPermission) {
      const r = await h.requestPermission({ mode });
      return r === "granted";
    }
  } catch {
    return false;
  }
  /* no permission API — treat presence as usable and fail later on IO */
  return true;
}
