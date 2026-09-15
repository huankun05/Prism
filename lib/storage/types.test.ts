import { describe, expect, it } from "vitest";
import {
  defaultMeta,
  metaFromDoc,
  normalizeMeta,
  sanitizeFolderName,
  sortProjectList,
  ProjectListItem,
} from "./types";

describe("sanitizeFolderName", () => {
  it("strips illegal characters and collapses space", () => {
    expect(sanitizeFolderName("  My\tapp\nname  ")).toBe("My app name");
    expect(sanitizeFolderName('a\\b/c:d*e?f"g<h>i|j')).toBe("a b c d e f g h i j");
  });

  it("falls back when empty", () => {
    expect(sanitizeFolderName("")).toBe("未命名设计");
    expect(sanitizeFolderName("   ")).toBe("未命名设计");
    expect(sanitizeFolderName('\\/:*?"<>|')).toBe("未命名设计");
  });
});

describe("normalizeMeta", () => {
  it("keeps valid fields", () => {
    const m = normalizeMeta({ name: "食谱", note: "n", updatedAt: "2026-01-01T00:00:00.000Z", schema: 1 }, "fb");
    expect(m.name).toBe("食谱");
    expect(m.note).toBe("n");
    expect(m.updatedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(m.app).toBe("prism");
  });

  it("uses fallbacks for junk", () => {
    const m = normalizeMeta(null, "备份名");
    expect(m.name).toBe("备份名");
    expect(m.app).toBe("prism");
    expect(Number.isFinite(Date.parse(m.updatedAt))).toBe(true);
  });
});

describe("metaFromDoc", () => {
  it("prefers document title", () => {
    const m = metaFromDoc({ groups: [], frames: [], paletteKey: "purple", frame: "phone", title: "设置 / 页", brief: "" });
    expect(m.name).toBe("设置 页");
    expect(m.app).toBe("prism");
  });
});

describe("sortProjectList", () => {
  it("orders by updatedAt desc then name", () => {
    const items: ProjectListItem[] = [
      { folderName: "b", name: "B", updatedAt: 1, readable: true },
      { folderName: "a", name: "A", updatedAt: 2, readable: true },
      { folderName: "c", name: "C", updatedAt: 2, readable: true },
    ];
    const sorted = sortProjectList(items);
    expect(sorted.map((i) => i.folderName)).toEqual(["a", "c", "b"]);
  });
});

describe("defaultMeta", () => {
  it("sets prism schema", () => {
    const m = defaultMeta("X");
    expect(m.schema).toBe(1);
    expect(m.app).toBe("prism");
    expect(m.name).toBe("X");
  });
});
