"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Doc, Kind, PALETTES, makeItem } from "@/lib/tokens";
import { isProject, readProject } from "@/lib/project";
import { t, useLang } from "@/lib/i18n";
import {
  ProjectListItem,
  sanitizeFolderName,
} from "@/lib/storage/types";
import {
  DirHandleLike,
  createProject,
  deleteProject,
  listProjects,
  openProjectDoc,
  pickWorkspaceDir,
  renameProject,
  saveProjectDoc,
} from "@/lib/storage/workspace";
import { ensurePermission, supportsDirectoryPicker } from "@/lib/storage/detect";
import { loadWorkspaceHandle, saveWorkspaceHandle } from "@/lib/storage/handleCache";
import {
  createFallbackProjectId,
  loadRecentDoc,
  loadRecentProjects,
  removeRecentProject,
  saveRecentProject,
} from "@/lib/storage/fallback";
import { clearLegacyDraftFlag, hasLegacyDraft, readLegacyDraft } from "@/lib/storage/migrate";
import { ConfirmDialog, IconBtn } from "@/components/ui";

export type LibraryExit =
  | { kind: "fsa"; root: DirHandleLike; folderName: string; doc: Doc }
  | { kind: "fallback"; id: string; name: string; doc: Doc };

const p0 = PALETTES[0];

function seedDoc(lang: "zh" | "en" | "ja" | "ko"): Doc {
  const home = { id: "home", name: t("home", lang), x: 0, y: 0 };
  const list = (id: string, label: string) => {
    const it = makeItem("listItem" as Kind);
    return { ...it, id, label };
  };
  return {
    groups: [
      {
        id: "g1",
        x: 16,
        y: 120,
        axis: "y",
        items: [list("li1", lang === "zh" ? "开始使用" : "Get started"), list("li2", lang === "zh" ? "了解功能" : "Explore features")],
      },
    ],
    frames: [home],
    paletteKey: PALETTES[0]?.key ?? "purple",
    frame: "phone",
    title: "",
    brief: "",
  };
}

function formatDate(ts: number, lang: string): string {
  if (!ts) return "—";
  try {
    return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : lang, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
}

function btnStyle(primary: boolean): CSSProperties {
  return {
    appearance: "none",
    border: "none",
    cursor: "pointer",
    padding: "10px 18px",
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 500,
    background: primary ? "#6750A4" : "#E8E0F0",
    color: primary ? "#fff" : "#4A4459",
  };
}

type CardAction =
  | { type: "rename"; item: ProjectListItem }
  | { type: "delete"; item: ProjectListItem }
  | null;

function legacyPromptDone(): boolean {
  try {
    return !!localStorage.getItem("prism:legacy-draft-imported");
  } catch {
    return true;
  }
}

export function ProjectLibrary({
  lang,
  onOpen,
  bridgeStatus = "idle",
}: {
  lang: "zh" | "en" | "ja" | "ko";
  onOpen: (exit: LibraryExit) => void;
  bridgeStatus?: import("@/lib/bridge").BridgeStatus;
}) {
  const locale = useLang();
  const [mode, setMode] = useState<"fsa" | "fallback">("fallback");
  const [root, setRoot] = useState<DirHandleLike | null>(null);
  const [items, setItems] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [cardAction, setCardAction] = useState<CardAction>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showLegacy, setShowLegacy] = useState(false);

  const text = useMemo(() => {
    const zh = lang === "zh";
    return {
      title: zh ? "项目库" : "Projects",
      subtitle: zh ? "设计保存在你的电脑上，可备份、可迁移。" : "Designs live on your computer — portable and yours.",
      bind: zh ? "选择工作区文件夹" : "Choose workspace folder",
      newProj: zh ? "新建项目" : "New project",
      importJson: zh ? "导入 JSON" : "Import JSON",
      empty: zh ? "还没有项目。新建一个开始。" : "No projects yet. Create one to start.",
      noFs: zh
        ? "当前浏览器不支持文件夹工作区。仍可使用浏览器草稿，并导入/导出 JSON。"
        : "This browser cannot open a workspace folder. You can still use browser drafts and import/export JSON.",
      fallbackNote: zh ? "浏览器草稿（本机，非文件夹）" : "Browser drafts (this browser, not a folder)",
      invalid: zh ? "无法打开：文件不是有效设计" : "Cannot open: not a valid design file",
      missing: zh ? "缺少 design.json" : "Missing design.json",
      rename: zh ? "重命名" : "Rename",
      delete: zh ? "删除" : "Delete",
      cancel: zh ? "取消" : "Cancel",
      confirm: zh ? "确认" : "Confirm",
      legacyTitle: zh ? "发现旧草稿" : "Legacy draft found",
      legacyBody: zh
        ? "检测到升级前保存在浏览器中的草稿。要导入为项目吗？"
        : "A draft from before the project library was found. Import it as a project?",
      legacyImport: zh ? "导入草稿" : "Import draft",
      legacySkip: zh ? "跳过" : "Skip",
      deleteWarn: (n: string) => (zh ? `确定删除「${n}」？此操作不可恢复。` : `Delete “${n}”? This cannot be undone.`),
      renameLabel: zh ? "新名称" : "New name",
      workspace: zh ? "工作区" : "Workspace",
      changeWs: zh ? "更换工作区" : "Change workspace",
    };
  }, [lang]);

  const refreshFsa = useCallback(async (dir: DirHandleLike) => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listProjects(dir));
    } catch (e) {
      setError(e instanceof Error ? e.message : "list-failed");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const enterFsa = useCallback(
    async (dir: DirHandleLike) => {
      setRoot(dir);
      setMode("fsa");
      await saveWorkspaceHandle(dir as unknown as FileSystemDirectoryHandle).catch(() => {});
      await refreshFsa(dir);
    },
    [refreshFsa],
  );

  const enterFallback = useCallback(() => {
    setRoot(null);
    setMode("fallback");
    setItems(loadRecentProjects());
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      if (supportsDirectoryPicker()) {
        const cached = await loadWorkspaceHandle();
        if (cached) {
          const ok = await ensurePermission(cached as unknown as DirHandleLike, "readwrite");
          if (ok && !cancelled) {
            await enterFsa(cached as unknown as DirHandleLike);
            return;
          }
        }
      }
      if (!cancelled) enterFallback();
    })();
    return () => {
      cancelled = true;
    };
  }, [enterFallback, enterFsa]);

  useEffect(() => {
    if (mode === "fsa") return;
    if (!hasLegacyDraft() || legacyPromptDone()) return;
    setShowLegacy(true);
  }, [mode]);

  const onPickWorkspace = async () => {
    setError(null);
    setBusy(true);
    try {
      const dir = await pickWorkspaceDir();
      await enterFsa(dir);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg && !/abort|cancel/i.test(msg)) setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const onCreate = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const name = sanitizeFolderName(newName || "未命名设计");
      const doc = seedDoc(lang);
      doc.title = name;
      if (mode === "fsa" && root) {
        const item = await createProject(root, name, doc);
        setNewName("");
        setCreating(false);
        await refreshFsa(root);
        onOpen({ kind: "fsa", root, folderName: item.folderName, doc });
      } else {
        const id = createFallbackProjectId();
        saveRecentProject(id, name, doc);
        setNewName("");
        setCreating(false);
        setItems(loadRecentProjects());
        onOpen({ kind: "fallback", id, name, doc });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "create-failed");
    } finally {
      setBusy(false);
    }
  };

  const onOpenItem = async (item: ProjectListItem) => {
    setError(null);
    try {
      if (mode === "fsa" && root) {
        if (!item.readable) {
          setError(item.error === "missing-design" ? text.missing : text.invalid);
          return;
        }
        const doc = await openProjectDoc(root, item.folderName);
        onOpen({ kind: "fsa", root, folderName: item.folderName, doc });
      } else {
        const doc = loadRecentDoc(item.folderName);
        if (!doc) {
          setError(text.invalid);
          return;
        }
        onOpen({ kind: "fallback", id: item.folderName, name: item.name, doc });
      }
    } catch {
      setError(text.invalid);
    }
  };

  const onImportFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    try {
      const doc = await readProject(file);
      if (!doc || !isProject(doc)) {
        setError(text.invalid);
        return;
      }
      const name = sanitizeFolderName(doc.title || file.name.replace(/\.json$/i, ""));
      if (mode === "fsa" && root) {
        const item = await createProject(root, name, doc);
        await refreshFsa(root);
        onOpen({ kind: "fsa", root, folderName: item.folderName, doc });
      } else {
        const id = createFallbackProjectId();
        saveRecentProject(id, name, doc);
        setItems(loadRecentProjects());
        onOpen({ kind: "fallback", id, name, doc });
      }
    } catch {
      setError(text.invalid);
    }
  };

  const onConfirmDelete = async () => {
    if (cardAction?.type !== "delete") return;
    const item = cardAction.item;
    setBusy(true);
    try {
      if (mode === "fsa" && root) {
        await deleteProject(root, item.folderName);
        await refreshFsa(root);
      } else {
        removeRecentProject(item.folderName);
        setItems(loadRecentProjects());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete-failed");
    } finally {
      setBusy(false);
      setCardAction(null);
    }
  };

  const onConfirmRename = async () => {
    if (cardAction?.type !== "rename") return;
    const item = cardAction.item;
    setBusy(true);
    try {
      if (mode === "fsa" && root) {
        await renameProject(root, item.folderName, renameValue);
        await refreshFsa(root);
      } else {
        const doc = loadRecentDoc(item.folderName);
        if (doc) {
          removeRecentProject(item.folderName);
          const id = createFallbackProjectId();
          saveRecentProject(id, sanitizeFolderName(renameValue), doc);
          setItems(loadRecentProjects());
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "rename-failed");
    } finally {
      setBusy(false);
      setCardAction(null);
      setRenameValue("");
    }
  };

  const onImportLegacy = () => {
    const doc = readLegacyDraft();
    if (!doc) {
      setShowLegacy(false);
      return;
    }
    clearLegacyDraftFlag();
    setShowLegacy(false);
    const name = sanitizeFolderName(doc.title || "导入的草稿");
    if (mode === "fsa" && root) {
      void (async () => {
        const item = await createProject(root, name, doc);
        await refreshFsa(root);
        onOpen({ kind: "fsa", root, folderName: item.folderName, doc });
      })();
    } else {
      const id = createFallbackProjectId();
      saveRecentProject(id, name, doc);
      setItems(loadRecentProjects());
      onOpen({ kind: "fallback", id, name, doc });
    }
  };

  const onSkipLegacy = () => {
    clearLegacyDraftFlag();
    setShowLegacy(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "auto",
        background:
          "radial-gradient(1200px 600px at 10% -10%, rgba(103,80,164,0.18), transparent 55%), radial-gradient(900px 500px at 100% 0%, rgba(29,78,216,0.14), transparent 50%), #f7f5fb",
        fontFamily: "Roboto, system-ui, sans-serif",
        color: "#1c1b1f",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 24px 88px" }}>
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            padding: 20,
            borderRadius: 24,
            background: "rgba(255,255,255,0.72)",
            border: "1px solid rgba(255,255,255,0.9)",
            boxShadow: "0 10px 40px rgba(60,40,120,0.08)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "linear-gradient(135deg,#6750A4,#1B57C9)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                  fontSize: 18,
                  boxShadow: "0 8px 20px rgba(103,80,164,0.35)",
                }}
              >
                P
              </span>
              <div>
                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 650, letterSpacing: -0.3 }}>Prism</h1>
                <p style={{ margin: 0, fontSize: 13, opacity: 0.6 }}>{text.subtitle}</p>
              </div>
            </div>
            <h2 style={{ margin: "18px 0 0", fontSize: 18, fontWeight: 600 }}>{text.title}</h2>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {supportsDirectoryPicker() && (
              <button type="button" onClick={() => void onPickWorkspace()} disabled={busy} style={btnStyle(false)}>
                {mode === "fsa" ? text.changeWs : text.bind}
              </button>
            )}
            <label style={{ ...btnStyle(false), cursor: "pointer" }}>
              {text.importJson}
              <input
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  void onImportFile(f);
                }}
              />
            </label>
            <button type="button" onClick={() => setCreating((c) => !c)} style={btnStyle(true)}>
              {text.newProj}
            </button>
          </div>
        </header>

        <p style={{ marginTop: 12, fontSize: 12, opacity: 0.55, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <span>
            {text.workspace}: {mode === "fsa" && root ? root.name : text.fallbackNote}
          </span>
          <span
            title={
              bridgeStatus === "connected"
                ? lang === "zh"
                  ? "AI 可通过本地 Bridge 自动画图（无项目时会自动新建）"
                  : "AI can draw via the local bridge (auto-creates a project if needed)"
                : lang === "zh"
                  ? "Bridge 未连接：请运行 node prism-bridge/server.mjs"
                  : "Bridge offline: run node prism-bridge/server.mjs"
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "2px 8px",
              borderRadius: 10,
              background: "rgba(0,0,0,0.04)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: bridgeStatus === "connected" ? "#2E7D32" : bridgeStatus === "connecting" ? "#F9A825" : "#cac4d0",
              }}
            />
            Bridge
          </span>
        </p>

        {mode === "fallback" && (
          <div
            style={{
              marginTop: 20,
              padding: "12px 16px",
              borderRadius: 12,
              background: "rgba(103,80,164,0.08)",
              border: "1px solid rgba(103,80,164,0.2)",
              fontSize: 13,
            }}
          >
            {text.noFs}
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(176,0,32,0.08)",
              color: "#b3261e",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {creating && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 16,
              background: "#fff",
              boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onCreate();
              }}
              placeholder={text.newProj}
              style={{
                flex: "1 1 200px",
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #cac4d0",
                fontSize: 15,
              }}
            />
            <button type="button" disabled={busy} onClick={() => void onCreate()} style={btnStyle(true)}>
              {text.confirm}
            </button>
            <button type="button" onClick={() => setCreating(false)} style={btnStyle(false)}>
              {text.cancel}
            </button>
          </div>
        )}

        {loading ? (
          <p style={{ marginTop: 40, opacity: 0.6 }}>…</p>
        ) : items.length === 0 ? (
          <div
            style={{
              marginTop: 40,
              textAlign: "center",
              padding: "56px 28px",
              borderRadius: 28,
              border: "1px dashed #c4b5e0",
              background: "linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.55))",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                margin: "0 auto 16px",
                borderRadius: 18,
                background: "linear-gradient(135deg,#EADDFF,#D3E4FF)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <span style={{ fontSize: 24 }}>✦</span>
            </div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 500, opacity: 0.75 }}>{text.empty}</p>
            <p style={{ margin: "8px 0 0", fontSize: 13, opacity: 0.5 }}>
              {lang === "zh" ? "新建项目，或让 AI 从左侧工作台直接画一版" : "Create a project, or let AI draft from the studio"}
            </p>
          </div>
        ) : (
          <div
            style={{
              marginTop: 24,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {items.map((item) => (
              <article
                key={item.folderName}
                style={{
                  background: "#fff",
                  borderRadius: 20,
                  padding: 18,
                  boxShadow: "0 6px 24px rgba(40,20,80,0.07)",
                  border: "1px solid rgba(0,0,0,0.04)",
                  opacity: item.readable ? 1 : 0.55,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  transition: "transform 120ms, box-shadow 120ms",
                }}
              >
                <button
                  type="button"
                  onClick={() => void onOpenItem(item)}
                  disabled={!item.readable}
                  style={{
                    all: "unset",
                    cursor: item.readable ? "pointer" : "not-allowed",
                    display: "block",
                  }}
                >
                  <strong style={{ fontSize: 16, display: "block" }}>{item.name}</strong>
                  <span style={{ fontSize: 12, opacity: 0.55 }}>{formatDate(item.updatedAt, locale)}</span>
                  {item.note ? (
                    <span style={{ display: "block", marginTop: 6, fontSize: 13, opacity: 0.75 }}>{item.note}</span>
                  ) : null}
                  {!item.readable && item.error ? (
                    <span style={{ display: "block", marginTop: 6, fontSize: 12, color: "#b3261e" }}>
                      {item.error === "missing-design" ? text.missing : text.invalid}
                    </span>
                  ) : null}
                </button>
                <div style={{ display: "flex", gap: 4, marginTop: "auto" }}>
                  <IconBtn
                    p={p0}
                    icon="edit"
                    title={text.rename}
                    fill
                    onClick={() => {
                      setRenameValue(item.name);
                      setCardAction({ type: "rename", item });
                    }}
                  />
                  <IconBtn
                    p={p0}
                    icon="delete"
                    title={text.delete}
                    danger
                    fill
                    onClick={() => setCardAction({ type: "delete", item })}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {showLegacy && p0 && (
        <ConfirmDialog
          open
          p={p0}
          title={text.legacyTitle}
          body={text.legacyBody}
          icon="history"
          onCancel={onSkipLegacy}
          onConfirm={onImportLegacy}
        />
      )}

      {cardAction?.type === "delete" && p0 && (
        <ConfirmDialog
          open
          p={p0}
          title={text.delete}
          body={text.deleteWarn(cardAction.item.name)}
          icon="delete_sweep"
          onCancel={() => setCardAction(null)}
          onConfirm={() => void onConfirmDelete()}
        />
      )}

      {cardAction?.type === "rename" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 600,
            background: "rgba(0,0,0,0.32)",
            display: "grid",
            placeItems: "center",
            padding: 24,
          }}
          onClick={() => setCardAction(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 20,
              width: "min(360px, 100%)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            }}
          >
            <h3 style={{ margin: "0 0 12px", fontSize: 18 }}>{text.rename}</h3>
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onConfirmRename();
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #cac4d0",
                fontSize: 15,
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button type="button" onClick={() => setCardAction(null)} style={btnStyle(false)}>
                {text.cancel}
              </button>
              <button type="button" onClick={() => void onConfirmRename()} style={btnStyle(true)}>
                {text.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export async function persistFsaDoc(root: DirHandleLike, folderName: string, doc: Doc) {
  await saveProjectDoc(root, folderName, doc);
}
