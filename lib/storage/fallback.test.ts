import { beforeEach, describe, expect, it } from "vitest";
import { createFallbackProjectId, loadRecentDoc, loadRecentProjects, removeRecentProject, saveRecentProject } from "./fallback";
import { hasLegacyDraft, readLegacyDraft } from "./migrate";

const doc = {
  groups: [],
  frames: [{ id: "f", name: "Home", x: 0, y: 0 }],
  paletteKey: "purple",
  frame: "phone" as const,
  title: "演示",
  brief: "",
};

function installLocalStorage() {
  const store = new Map<string, string>();
  const api = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
  viStubGlobal("localStorage", api);
  return api;
}

/* vitest helper without importing vi at top for stub */
function viStubGlobal(name: string, value: unknown) {
  (globalThis as Record<string, unknown>)[name] = value;
}

describe("fallback recents", () => {
  beforeEach(() => {
    installLocalStorage();
  });

  it("saves and lists projects newest first", () => {
    saveRecentProject("a", "A", doc);
    saveRecentProject("b", "B", doc);
    const list = loadRecentProjects();
    expect(list[0]?.folderName).toBe("b");
    expect(list.find((i) => i.folderName === "a")?.name).toBe("A");
  });

  it("loads doc by id", () => {
    saveRecentProject("a", "A", doc);
    expect(loadRecentDoc("a")?.title).toBe("演示");
    expect(loadRecentDoc("missing")).toBeNull();
  });

  it("removes one entry", () => {
    saveRecentProject("a", "A", doc);
    removeRecentProject("a");
    expect(loadRecentProjects()).toHaveLength(0);
  });

  it("creates unique ids", () => {
    expect(createFallbackProjectId()).not.toBe(createFallbackProjectId());
  });
});

describe("legacy draft", () => {
  beforeEach(() => {
    installLocalStorage();
  });

  it("reads valid m3e:doc", () => {
    localStorage.setItem("m3e:doc", JSON.stringify(doc));
    expect(hasLegacyDraft()).toBe(true);
    expect(readLegacyDraft()?.title).toBe("演示");
  });

  it("ignores invalid", () => {
    localStorage.setItem("m3e:doc", "{");
    expect(readLegacyDraft()).toBeNull();
  });
});
