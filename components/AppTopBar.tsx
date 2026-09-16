"use client";

import { FrameMode, Palette, Place } from "@/lib/tokens";
import { IconBtn, Segmented, TidyButton, TidyState } from "./ui";
import { Icon } from "./M3Node";
import { Popover } from "./Menus";
import { t, useLang } from "@/lib/i18n";
import type { Mode } from "./Toolbar";

/** Full-width top chrome: project identity · tools · device. Merges old floating bar + exit strip. */
export function AppTopBar({
  p,
  mode,
  onMode,
  frame,
  onFrame,
  zoom,
  onZoom,
  onFit,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onAddFrame,
  onPreview,
  tidy,
  onTidy,
  place,
  onPlace,
  note,
  onSaveProject,
  onOpenProject,
  onShare,
  shareState = "idle",
  onDraftKeep,
  onDraftUndo,
  onDraftSave,
  quickUndo,
  onExitLibrary,
  projectTitle,
  saveLabel,
  saveTone,
  bridgeConnected,
  onPrompt,
  onSettings,
  onLangSheet,
  rightInset,
}: {
  p: Palette;
  mode: Mode;
  onMode: (m: Mode) => void;
  frame: FrameMode;
  onFrame: (f: FrameMode) => void;
  zoom: number;
  onZoom: (z: number) => void;
  onFit: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onAddFrame: () => void;
  onPreview: () => void;
  tidy?: TidyState;
  onTidy?: () => void;
  place?: Place;
  onPlace?: (pl: Place) => void;
  note?: { text: string; icon: string } | null;
  onSaveProject?: () => void;
  onOpenProject?: () => void;
  onShare?: () => void;
  shareState?: "idle" | "busy" | "review";
  onDraftKeep?: () => void;
  onDraftUndo?: () => void;
  onDraftSave?: () => void;
  quickUndo?: boolean;
  onExitLibrary?: () => void;
  projectTitle?: string;
  saveLabel?: string;
  saveTone?: "idle" | "saving" | "saved" | "error";
  bridgeConnected?: boolean;
  onPrompt?: () => void;
  onSettings?: () => void;
  onLangSheet?: () => void;
  rightInset?: number;
}) {
  const lang = useLang();
  const zh = lang === "zh";

  const chip = (primary = false): React.CSSProperties => ({
    appearance: "none",
    border: primary ? "none" : "1px solid #E5E5EA",
    background: primary ? "#5B4CD8" : "#FFFFFF",
    color: primary ? "#fff" : "#111114",
    cursor: "pointer",
    height: 28,
    padding: "0 10px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
  });

  const statusColor =
    saveTone === "error" ? "#D92D20" : saveTone === "saving" ? "#F5A524" : saveTone === "saved" ? "#12B76A" : "#C7C7CC";

  return (
    <div
      style={{
        height: 48,
        flex: "0 0 auto",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 10px",
        background: "#FFFFFF",
        borderBottom: "1px solid #E5E5EA",
        zIndex: 55,
        marginRight: rightInset ? 0 : undefined,
      }}
    >
      {/* left: project identity */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: "0 1 auto" }}>
        {onExitLibrary && (
          <button type="button" onClick={onExitLibrary} style={chip(false)} title={zh ? "返回项目库" : "Projects"}>
            <Icon name="arrow_back" size={16} />
            {zh ? "项目库" : "Projects"}
          </button>
        )}
        {projectTitle ? (
          <>
            <span style={{ width: 1, height: 16, background: "#E5E5EA", margin: "0 2px" }} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                maxWidth: 140,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {projectTitle}
            </span>
          </>
        ) : null}
        {saveLabel && (
          <span
            title={saveLabel}
            style={{
              fontSize: 12,
              color: "#6B6B76",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 3, background: statusColor }} />
            {saveLabel}
          </span>
        )}
        {bridgeConnected !== undefined && (
          <span
            title={bridgeConnected ? (zh ? "Bridge 已连接" : "Bridge connected") : zh ? "Bridge 未连接" : "Bridge offline"}
            style={{
              fontSize: 12,
              color: "#6B6B76",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 3, background: bridgeConnected ? "#12B76A" : "#C7C7CC" }} />
            Bridge
          </span>
        )}
      </div>

      {/* center tools */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 6,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {note && (
          <span
            role="status"
            style={{
              height: 28,
              padding: "0 10px",
              borderRadius: 8,
              background: "#111114",
              color: "#fff",
              fontSize: 12,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              maxWidth: 180,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <Icon name={note.icon} size={14} />
            {note.text}
          </span>
        )}

        <Segmented<Mode>
          options={[
            { key: "select", icon: "arrow_selector_tool", title: t("select", lang) },
            { key: "hand", icon: "pan_tool", title: t("hand", lang) },
          ]}
          value={mode}
          onChange={onMode}
          p={p}
          height={28}
          grow={false}
        />

        <div style={{ display: "flex", gap: 1, background: "#F5F5F7", borderRadius: 8, padding: 2 }}>
          {frame === "phone" && (
            <IconBtn icon="add_to_photos" p={p} onClick={onAddFrame} title={t("addFrame", lang)} size={28} />
          )}
          <IconBtn icon="play_arrow" p={p} onClick={onPreview} title={t("preview", lang)} size={28} fill />
          <IconBtn icon="undo" p={p} onClick={onUndo} disabled={!canUndo} title={t("undo", lang)} size={28} />
          <IconBtn icon="redo" p={p} onClick={onRedo} disabled={!canRedo} title={t("redo", lang)} size={28} />
          <IconBtn icon="delete_sweep" p={p} onClick={onClear} title={t("clearAll", lang)} size={28} />
          {onSaveProject && onOpenProject && (
            <Popover p={p} icon="folder_open" title={t("project", lang)} size={28}>
              {(close) => (
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 160 }}>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenProject();
                      close();
                    }}
                    style={{ ...chip(false), justifyContent: "flex-start", width: "100%", height: 36 }}
                  >
                    {t("openProject", lang)}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSaveProject();
                      close();
                    }}
                    style={{ ...chip(false), justifyContent: "flex-start", width: "100%", height: 36 }}
                  >
                    {t("saveProject", lang)}
                  </button>
                </div>
              )}
            </Popover>
          )}
        </div>

        {tidy && onTidy && (
          <div style={{ display: "flex", alignItems: "center", background: "#F5F5F7", borderRadius: 8, padding: 2 }}>
            <TidyButton state={tidy} onClick={onTidy} p={p} pill place={place} onPlace={onPlace} />
          </div>
        )}

        {onPrompt && (
          <button type="button" onClick={onPrompt} style={chip(false)} title={zh ? "复制提示词" : "Copy prompt"}>
            <Icon name="auto_awesome" size={14} />
            {zh ? "提示词" : "Prompt"}
          </button>
        )}
      </div>

      {/* right: chrome actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flex: "0 0 auto" }}>
        {onLangSheet && (
          <IconBtn icon="language" p={p} onClick={onLangSheet} title={t("language", lang)} size={28} />
        )}
        {onSettings && (
          <IconBtn icon="settings" p={p} onClick={onSettings} title={t("settings", lang)} size={28} />
        )}
        {onShare && (
          <button type="button" onClick={onShare} style={chip(true)} disabled={shareState === "busy"}>
            <Icon name="ios_share" size={14} />
            {shareState === "busy" ? (zh ? "处理中" : "…") : shareState === "review" ? (zh ? "确认草稿" : "Review") : zh ? "分享" : "Share"}
          </button>
        )}
        {shareState === "review" && onDraftKeep && onDraftUndo && (
          <>
            <IconBtn icon="undo" p={p} onClick={onDraftUndo} title={t("draftUndo", lang)} size={28} />
            <IconBtn icon="check" p={p} onClick={onDraftKeep} title={t("draftKeep", lang)} size={28} fill />
          </>
        )}
        {quickUndo && canUndo && <IconBtn icon="undo" p={p} onClick={onUndo} title={t("undo", lang)} size={28} />}
      </div>
    </div>
  );
}
