import { beforeEach, describe, expect, it } from "vitest";
import {
  applyPersonalStyleToDoc,
  clearPersonalStyle,
  loadPersonalStyle,
  normalizePersonalStyle,
  parsePersonalStyleImport,
  personalStyleFromDoc,
  savePersonalStyle,
  type PersonalStyle,
} from "./personalStyle";

function installLocalStorage() {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };
}

const baseDoc = {
  groups: [],
  frames: [{ id: "f", name: "Home", x: 0, y: 0 }],
  paletteKey: "blue",
  frame: "phone" as const,
  title: "Demo",
  brief: "",
  theme: {
    dark: true,
    shape: "full" as const,
    font: "roboto" as const,
    motion: "expressive" as const,
    contrast: "standard" as const,
    bothModes: false,
    emphasized: true,
  },
};

describe("normalizePersonalStyle", () => {
  it("rejects junk", () => {
    expect(normalizePersonalStyle(null)).toBeNull();
    expect(normalizePersonalStyle({})).toBeNull();
  });

  it("fills defaults", () => {
    const s = normalizePersonalStyle({ paletteKey: "teal", name: "  我的  " });
    expect(s?.paletteKey).toBe("teal");
    expect(s?.name).toBe("我的");
    expect(s?.id).toBe("personal-main");
    expect(s?.theme.dark).toBe(false);
  });
});

describe("personal style store", () => {
  beforeEach(() => {
    installLocalStorage();
    clearPersonalStyle();
  });

  it("saves and loads from doc", () => {
    const saved = personalStyleFromDoc(baseDoc, "工作档案");
    expect(saved.paletteKey).toBe("blue");
    expect(saved.theme.dark).toBe(true);
    expect(loadPersonalStyle()?.name).toBe("工作档案");
  });

  it("applies to a new doc", () => {
    const style = personalStyleFromDoc(baseDoc);
    const next = applyPersonalStyleToDoc(
      { ...baseDoc, paletteKey: "mono", theme: undefined as never },
      style,
    );
    expect(next.paletteKey).toBe("blue");
    expect(next.theme?.dark).toBe(true);
  });

  it("roundtrips import json", () => {
    const style = personalStyleFromDoc(baseDoc, "导出测试");
    const json = JSON.stringify(style);
    clearPersonalStyle();
    expect(loadPersonalStyle()).toBeNull();
    parsePersonalStyleImport(json);
    expect(loadPersonalStyle()?.name).toBe("导出测试");
  });

  it("savePersonalStyle stamps id", () => {
    const style: PersonalStyle = {
      schema: 1,
      id: "x",
      name: "N",
      paletteKey: "green",
      theme: { dark: false, bothModes: false, contrast: "standard", shape: "rounded", font: "roboto", emphasized: false, motion: "standard" },
      updatedAt: "",
    };
    expect(savePersonalStyle(style).id).toBe("personal-main");
  });
});
