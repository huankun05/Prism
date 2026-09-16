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
import { applyPersonalStyleToDoc, loadPersonalStyle, type PersonalStyle } from "@/lib/personalStyle";
import { ConfirmDialog } from "@/components/ui";
import { Icon } from "./M3Node";

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
    border: primary ? "none" : "1px solid #E5E5EA",
    cursor: "pointer",
    padding: "7px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    background: primary ? "#5B4CD8" : "#FFFFFF",
    color: primary ? "#fff" : "#111114",
    boxShadow: primary ? "none" : "0 1px 2px rgba(0,0,0,0.04)",
  };
}

function iconBtnStyle(): CSSProperties {
  return {
    appearance: "none",
    border: "1px solid transparent",
    background: "transparent",
    cursor: "pointer",
    width: 28,
    height: 28,
    borderRadius: 6,
    display: "grid",
    placeItems: "center",
    color: "#6B6B76",
    padding: 0,
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
  const [useMyStyle, setUseMyStyle] = useState(true);
  const personal = typeof window === "undefined" ? null : loadPersonalStyle();

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
      let doc = seedDoc(lang);
      doc.title = name;
      if (useMyStyle) {
        const prof = loadPersonalStyle();
        if (prof) doc = applyPersonalStyleToDoc(doc, prof);
      }
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
        background: "#F7F7F9",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        color: "#111114",
      }}
    >
      {/* top bar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 24px",
          background: "#FFFFFF",
          borderBottom: "1px solid #E5E5EA",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "#5B4CD8",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            P
          </span>
          <strong style={{ fontSize: 14, fontWeight: 650, letterSpacing: -0.2 }}>Prism</strong>
          <span style={{ width: 1, height: 16, background: "#E5E5EA", margin: "0 4px" }} />
          <span style={{ fontSize: 13, color: "#6B6B76", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {text.title}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "nowrap" }}>
          <span
            title={
              bridgeStatus === "connected"
                ? lang === "zh" ? "AI Bridge 已连接" : "Bridge connected"
                : lang === "zh" ? "Bridge 未连接" : "Bridge offline"
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#6B6B76",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                background: bridgeStatus === "connected" ? "#12B76A" : bridgeStatus === "connecting" ? "#F5A524" : "#C7C7CC",
              }}
            />
            Bridge
          </span>
          <span style={{ width: 1, height: 16, background: "#E5E5EA" }} />
          <span style={{ fontSize: 12, color: "#6B6B76", whiteSpace: "nowrap", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
            {mode === "fsa" && root ? root.name : lang === "zh" ? "浏览器草稿" : "Browser drafts"}
          </span>
          {supportsDirectoryPicker() && (
            <button type="button" onClick={() => void onPickWorkspace()} disabled={busy} style={btnStyle(false)}>
              {mode === "fsa" ? text.changeWs : text.bind}
            </button>
          )}
          <label style={{ ...btnStyle(false), cursor: "pointer", whiteSpace: "nowrap" }}>
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

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px 80px", boxSizing: "border-box" }}>
        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: 8,
              background: "#FEF3F2",
              color: "#B42318",
              fontSize: 13,
              border: "1px solid #FECDCA",
            }}
          >
            {error}
          </div>
        )}

        {creating && (
          <div
            style={{
              marginBottom: 20,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              padding: "10px 12px",
              background: "#fff",
              border: "1px solid #E5E5EA",
              borderRadius: 10,
            }}
          >
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onCreate();
                if (e.key === "Escape") setCreating(false);
              }}
              placeholder={text.newProj}
              style={{
                flex: "1 1 200px",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #E5E5EA",
                fontSize: 14,
                outline: "none",
                background: "#fff",
              }}
            />
            {personal && (
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6B6B76" }}>
                <input type="checkbox" checked={useMyStyle} onChange={(e) => setUseMyStyle(e.target.checked)} />
                {lang === "zh" ? `我的样式 · ${personal.name}` : `My style · ${personal.name}`}
              </label>
            )}
            <button type="button" disabled={busy} onClick={() => void onCreate()} style={btnStyle(true)}>
              {text.confirm}
            </button>
            <button type="button" onClick={() => setCreating(false)} style={btnStyle(false)}>
              {text.cancel}
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ marginTop: 48, textAlign: "center", color: "#6B6B76", fontSize: 13 }}>…</div>
        ) : items.length === 0 ? (
          <div style={{ marginTop: 72, textAlign: "center" }}>
            <div
              style={{
                width: 48,
                height: 48,
                margin: "0 auto 16px",
                borderRadius: 12,
                background: "#EEE9FB",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name="dashboard" size={24} color="#5B4CD8" />
            </div>
            <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 600, color: "#111114" }}>
              {lang === "zh" ? "还没有设计项目" : "No designs yet"}
            </p>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6B6B76" }}>
              {text.empty}
            </p>
            <button
              type="button"
              onClick={() => setCreating(true)}
              style={{ ...btnStyle(true), padding: "9px 18px", fontSize: 13 }}
            >
              {text.newProj}
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {items.map((item) => (
              <article
                key={item.folderName}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: 14,
                  border: "1px solid #E5E5EA",
                  opacity: item.readable ? 1 : 0.55,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  transition: "border-color 120ms, box-shadow 120ms",
                  cursor: item.readable ? "pointer" : "default",
                }}
                onClick={() => item.readable && void onOpenItem(item)}
              >
                <div
                  style={{
                    height: 4,
                    width: 32,
                    borderRadius: 2,
                    background: "linear-gradient(90deg,#5B4CD8,#1B57C9)",
                    marginBottom: 4,
                  }}
                />
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                  <strong
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      lineHeight: 1.3,
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.name}
                  </strong>
                  <div style={{ display: "flex", gap: 0, flex: "0 0 auto" }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      title={text.rename}
                      style={iconBtnStyle()}
                      onClick={() => {
                        setRenameValue(item.name);
                        setCardAction({ type: "rename", item });
                      }}
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      type="button"
                      title={text.delete}
                      style={{ ...iconBtnStyle(), color: "#D92D20" }}
                      onClick={() => setCardAction({ type: "delete", item })}
                    >
                      <Icon name="delete_outline" size={16} />
                    </button>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: "#6B6B76" }}>{formatDate(item.updatedAt, locale)}</span>
                {!item.readable && item.error ? (
                  <span style={{ fontSize: 12, color: "#B42318" }}>
                    {item.error === "missing-design" ? text.missing : text.invalid}
                  </span>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </main>

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
              borderRadius: 12,
              padding: 20,
              width: "min(360px, 100%)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.16)",
              border: "1px solid #E5E5EA",
            }}
          >
            <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>{text.rename}</h3>
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onConfirmRename();
              }}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #E5E5EA",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
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
