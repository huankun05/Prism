"use client";

import { useMemo, useRef, useState } from "react";
import { Palette } from "@/lib/tokens";
import { useLang } from "@/lib/i18n";
import { AiSettings, hasKey } from "@/lib/ai";
import { STYLE_PRESETS, StylePreset, ideaWithStyle } from "@/lib/styles";
import {
  DEVICE_OPTIONS,
  UserStylePreset,
  allPresets,
  detectAiMode,
  exportPresetsJson,
  loadUserPresets,
  parsePresetImport,
  presetFromDoc,
  removeUserPreset,
  upsertUserPreset,
  type AiMode,
} from "@/lib/styleStore";
import type { Doc } from "@/lib/tokens";
import { Icon } from "./M3Node";
import { AiWriteBtn } from "./AiPanel";

type ChatMsg = { id: string; role: "user" | "assistant"; text: string };
type DeviceTarget = "phone" | "tablet" | "desktop" | "both";

/**
 * In-canvas AI studio.
 * - Instant style apply (no model)
 * - User presets: save current, import, export
 * - Device target for generation
 * - Mode split: local API key vs Bridge/MCP
 */
export function AiStudio({
  p,
  settings,
  busy,
  onApplyStyle,
  onDraft,
  styleId,
  onStyleId,
  bridgeConnected,
  currentDoc,
  onBridgeHint,
}: {
  p: Palette;
  settings: AiSettings;
  busy: boolean;
  onApplyStyle: (style: StylePreset) => void;
  onDraft: (idea: string, styleId: string, device: DeviceTarget) => void;
  styleId: string;
  onStyleId: (id: string) => void;
  bridgeConnected: boolean;
  currentDoc: () => Pick<Doc, "paletteKey" | "theme" | "title">;
  onBridgeHint?: () => void;
}) {
  const lang = useLang();
  const zh = lang === "zh";
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [userPresets, setUserPresets] = useState<UserStylePreset[]>(() => loadUserPresets());
  const [device, setDevice] = useState<DeviceTarget>("phone");
  const [modeInfo, setModeInfo] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);

  const readyLocal = hasKey(settings) && settings.model.trim().length > 0;
  const mode: AiMode = detectAiMode({ bridgeConnected, hasLocalKey: readyLocal });
  const presets = useMemo(() => allPresets(userPresets), [userPresets]);

  const modeText = useMemo(() => {
    if (mode === "both")
      return zh
        ? "双通道：本机 API 可直接生成；本地 Bridge/MCP 也可改画布。"
        : "Dual channel: local API can draft; Bridge/MCP can also edit the canvas.";
    if (mode === "bridge")
      return zh
        ? "Bridge/MCP 模式：外部 AI 工具改画布；本机尚未配置 API Key，不能在面板内生成。"
        : "Bridge/MCP mode: external agents edit the canvas. Local API key not set — in-panel generate disabled.";
    if (mode === "local-api")
      return zh
        ? "本机 API 模式：在面板内对话并生成。Bridge 未连接时，外部 MCP 无法改画布。"
        : "Local API mode: chat and draft in-panel. Bridge offline — external MCP cannot edit.";
    return zh
      ? "未连接：配置 API Key，或启动 prism-bridge 并让画布连上。"
      : "Not connected: set an API key, or start prism-bridge with the canvas online.";
  }, [mode, zh]);

  const push = (role: ChatMsg["role"], text: string) => {
    idRef.current += 1;
    setMessages((m) => [...m, { id: `m${idRef.current}`, role, text }]);
  };

  const applyPreset = (s: StylePreset) => {
    onStyleId(s.id);
    onApplyStyle(s);
    push("assistant", zh ? `已套用「${s.label}」（立即生效）。` : `Applied “${s.label}” instantly.`);
  };

  const send = () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    push("user", text);
    if (!readyLocal) {
      push(
        "assistant",
        zh
          ? "面板内生成需要本机 API Key（模型设置里配置）。若你用外部 Claude/MCP，请启动 bridge 后由外部工具调用 prism_* 工具改画布。"
          : "In-panel generate needs a local API key (Model settings). With external MCP, start the bridge and call prism_* tools there.",
      );
      return;
    }
    const style = presets.find((s) => s.id === styleId) ?? STYLE_PRESETS[0];
    const devLabel = DEVICE_OPTIONS.find((d) => d.key === device)?.label ?? "";
    push("assistant", zh ? `按「${style.label}」· ${devLabel} 起草…` : `Drafting in “${style.label}” · ${devLabel}…`);
    onDraft(text, style.id, device);
  };

  const saveCurrent = () => {
    const doc = currentDoc();
    const name = prompt(zh ? "预设名称" : "Preset name", zh ? "我的风格" : "My style");
    if (!name) return;
    const preset = presetFromDoc(doc, name);
    setUserPresets(upsertUserPreset(preset));
    onStyleId(preset.id);
    push("assistant", zh ? `已保存预设「${name}」。可导出分享。` : `Saved preset “${name}”. You can export it.`);
  };

  const onImportFile = async (file: File | null) => {
    if (!file) return;
    try {
      const list = parsePresetImport(await file.text());
      let merged = loadUserPresets();
      for (const item of list) merged = upsertUserPreset(item);
      setUserPresets(loadUserPresets());
      push("assistant", zh ? `已导入 ${list.length} 个预设。` : `Imported ${list.length} preset(s).`);
    } catch {
      push("assistant", zh ? "导入失败：需要有效的预设 JSON。" : "Import failed: invalid preset JSON.");
    }
  };

  const exportJson = () => {
    if (!userPresets.length) {
      push("assistant", zh ? "还没有自定义预设可导出。" : "No custom presets to export.");
      return;
    }
    const blob = new Blob([exportPresetsJson(userPresets)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "prism-style-presets.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
      {/* mode banner */}
      {modeInfo && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            background: mode === "none" ? p.errorContainer : p.secondaryContainer,
            color: mode === "none" ? p.onErrorContainer : p.onSecondaryContainer,
            fontSize: 12,
            lineHeight: 1.45,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <Icon name={mode === "none" ? "cloud_off" : mode === "bridge" ? "cable" : mode === "both" ? "hub" : "key"} size={18} />
          <div style={{ flex: 1 }}>
            <strong style={{ display: "block", marginBottom: 2 }}>
              {mode === "both" ? (zh ? "API + Bridge" : "API + Bridge") : mode === "bridge" ? (zh ? "Bridge / MCP" : "Bridge / MCP") : mode === "local-api" ? (zh ? "本机 API" : "Local API") : zh ? "未连接" : "Offline"}
            </strong>
            {modeText}
            {mode === "bridge" && onBridgeHint && (
              <button
                type="button"
                onClick={onBridgeHint}
                style={{
                  marginTop: 6,
                  border: "none",
                  background: "transparent",
                  color: p.primary,
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {zh ? "查看 Bridge 说明 →" : "How to connect Bridge →"}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setModeInfo(false)}
            aria-label="close"
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "inherit", padding: 0 }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {/* device target */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{zh ? "设备目标" : "Device"}</div>
        <div style={{ display: "flex", gap: 6 }}>
          {DEVICE_OPTIONS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDevice(d.key)}
              className="m3-press"
              style={{
                flex: 1,
                border: device === d.key ? `2px solid ${p.primary}` : `1px solid ${p.outlineVariant}`,
                borderRadius: 12,
                padding: "8px 6px",
                background: device === d.key ? p.secondaryContainer : p.surfaceContainerLow,
                color: device === d.key ? p.onSecondaryContainer : p.onSurface,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {d.label}
              <div style={{ fontWeight: 400, fontSize: 10, opacity: 0.7 }}>{d.blurb}</div>
            </button>
          ))}
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 11, opacity: 0.55 }}>
          {zh
            ? "画布本身已支持手机 412×892 与桌面 1280×800；生成时按目标铺屏。"
            : "Canvas already supports phone 412×892 and desktop 1280×800 frames."}
        </p>
      </div>

      {/* presets */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{zh ? "风格预设" : "Styles"}</div>
          <div style={{ display: "flex", gap: 4 }}>
            <button type="button" onClick={saveCurrent} title={zh ? "把当前主题存为预设" : "Save current theme"} style={miniBtn(p)}>
              {zh ? "存为预设" : "Save"}
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} style={miniBtn(p)}>
              {zh ? "导入" : "Import"}
            </button>
            <button type="button" onClick={exportJson} style={miniBtn(p)}>
              {zh ? "导出" : "Export"}
            </button>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            e.target.value = "";
            void onImportFile(f);
          }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {presets.map((s) => {
            const on = s.id === styleId;
            const custom = "source" in s && s.source === "custom";
            return (
              <div key={s.id} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => applyPreset(s)}
                  className="m3-press"
                  style={{
                    width: "100%",
                    border: on ? `2px solid ${p.primary}` : `1px solid ${p.outlineVariant}`,
                    borderRadius: 14,
                    padding: 8,
                    background: on ? p.secondaryContainer : p.surfaceContainerLow,
                    color: on ? p.onSecondaryContainer : p.onSurface,
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      height: 36,
                      borderRadius: 10,
                      background: s.swatch,
                      color: s.ink,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {s.label.slice(0, 4)}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>
                    {custom ? "★ " : ""}
                    {s.label}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.65 }}>{s.blurb}</div>
                </button>
                {custom && (
                  <button
                    type="button"
                    title={zh ? "删除预设" : "Delete"}
                    onClick={() => setUserPresets(removeUserPreset(s.id))}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      border: "none",
                      background: "rgba(0,0,0,0.35)",
                      color: "#fff",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Icon name="close" size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 11, opacity: 0.5 }}>
          {zh ? "点击预设立刻套用（改色板+主题，无模型调用）。" : "Click applies instantly (palette + theme, no model call)."}
        </p>
      </div>

      <div style={{ height: 1, background: p.outlineVariant, opacity: 0.6 }} />

      <div style={{ fontSize: 13, fontWeight: 600 }}>{zh ? "和 AI 说想法" : "Chat with AI"}</div>
      <div
        ref={listRef}
        style={{
          minHeight: 100,
          maxHeight: 180,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {messages.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, opacity: 0.55, lineHeight: 1.5 }}>
            {zh
              ? "例如：做一个音乐播放器。选风格与设备后生成；或由外部 MCP 用 prism_apply_design 改画布。"
              : "e.g. A music player. Pick style + device, then generate — or let MCP edit via prism_apply_design."}
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "92%",
                padding: "8px 12px",
                borderRadius: m.role === "user" ? 14 : "14px 14px 14px 4px",
                background: m.role === "user" ? p.primary : p.surfaceContainerHigh,
                color: m.role === "user" ? p.onPrimary : p.onSurface,
                fontSize: 12,
                lineHeight: 1.45,
                whiteSpace: "pre-wrap",
              }}
            >
              {m.text}
            </div>
          ))
        )}
        {busy && (
          <div style={{ fontSize: 12, opacity: 0.6, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="progress_activity" size={16} />
            {zh ? "生成中…" : "Generating…"}
          </div>
        )}
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        rows={2}
        placeholder={zh ? "描述界面想法，Enter 发送…" : "Describe the UI, Enter…"}
        style={{
          width: "100%",
          minHeight: 56,
          padding: "10px 12px",
          borderRadius: 12,
          border: `1px solid ${p.outlineVariant}`,
          background: p.surface,
          color: p.onSurface,
          fontSize: 13,
          fontFamily: "inherit",
          outline: "none",
          boxSizing: "border-box",
          resize: "vertical",
        }}
      />
      <AiWriteBtn
        p={p}
        busy={busy}
        disabled={!input.trim() && !busy}
        onClick={send}
        onCancel={() => {}}
        label={zh ? "生成设计" : "Generate"}
        title={zh ? "本机 API 生成" : "Draft with local API"}
      />
      {!readyLocal && (
        <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>
          {zh ? "面板生成需 API Key；外部 MCP 仍可通过 Bridge 改画布。" : "Panel draft needs API key; MCP can still edit via Bridge."}
        </p>
      )}
    </div>
  );
}

function miniBtn(p: Palette): React.CSSProperties {
  return {
    border: `1px solid ${p.outlineVariant}`,
    background: p.surfaceContainerLow,
    color: p.onSurfaceVariant,
    borderRadius: 8,
    padding: "2px 8px",
    fontSize: 11,
    cursor: "pointer",
  };
}

export { ideaWithStyle };
