import { Doc } from "../tokens";
import { isProject } from "../project";

const LEGACY_DOC_KEY = "m3e:doc";

/** read the pre-project-library browser draft, if any */
export function readLegacyDraft(): Doc | null {
  try {
    const raw = localStorage.getItem(LEGACY_DOC_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isProject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function hasLegacyDraft(): boolean {
  return readLegacyDraft() !== null;
}

export function clearLegacyDraftFlag(): void {
  try {
    localStorage.setItem("prism:legacy-draft-imported", String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function legacyDraftAlreadyPrompted(): boolean {
  try {
    return !!localStorage.getItem("prism:legacy-draft-imported");
  } catch {
    return true;
  }
}
