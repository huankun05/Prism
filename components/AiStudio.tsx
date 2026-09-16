"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Palette } from "@/lib/tokens";
import { useLang } from "@/lib/i18n";
import { AiSettings, hasKey, revisePart } from "@/lib/ai";
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
import type { Doc, Item } from "@/lib/tokens";
import { Icon } from "./M3Node";
import { AiWriteBtn } from "./AiPanel";

type ChatMsg = { id: string; role: "user" | "assistant"; text: string };
type DeviceTarget = "phone" | "tablet" | "desktop" | "both";
export type ApplyMode = "instant" | "staged";

const APPLY_MODE_KEY = "prism:apply-mode";

export function loadApplyMode(): ApplyMode {
  try {
    return localStorage.getItem(APPLY_MODE_KEY) === "staged" ? "staged" : "instant";
  } catch {
    return "instant";
  }
}

export function saveApplyMode(mode: ApplyMode) {
  try {
    localStorage.setItem(APPLY_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

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
  applyMode,
  onApplyMode,
  selectedPart,
  onRevisePart,
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
  applyMode: ApplyMode;
  onApplyMode: (m: ApplyMode) => void;
  selectedPart: Item | null;
  onRevisePart: (instruction: string, patch: Partial<Item>) => void;
}) {
  const lang = useLang();
  const zh = lang === "zh";
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [regionInput, setRegionInput] = useState("");
  const [regionBusy, setRegionBusy] = useState(false);
  const [userPresets, setUserPresets] = useState<UserStylePreset[]>(() => loadUserPresets());
  const [device, setDevice] = useState<DeviceTarget>("phone");
  const [modeInfo, setModeInfo] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);

  const readyLocal = hasKey(settings) && settings.model.trim().length > 0;
  const mode: AiMode = detectAiMode({ bridgeConnected, hasLocalKey: readyLocal });
  const presets = useMemo(() => allPresets(userPresets), [userPresets]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const modeText = useMemo(() => {
    if (mode === "both")
      return zh
        ? "双通道：本机 API 可直接生成；本地 Bridge/MCP 也可改画布。"
        : "Dual channel: local API can draft; Bridge/MCP can also edit the canvas.";
    if (mode === "bridge")
      return zh
        ? "Bridge/MCP：外部工具改画布。分步/即时由画布「绘制方式」决定。"
        : "Bridge/MCP: external agents edit. Instant vs staged is set below.";
    if (mode === "local-api")
      return zh
        ? "本机 API：可整页生成，也可对选中部件做区域修改。"
        : "Local API: full drafts plus region edits on a selected part.";
    return zh ? "未连接：配置 API Key 或启动 Bridge。" : "Offline: set API key or start bridge.";
  }, [mode, zh]);

  const push = (role: ChatMsg["role"], text: string) => {
    idRef.current += 1;
    setMessages((m) => [...m, { id: `m${idRef.current}`, role, text }]);
  };

  const applyPreset = (s: StylePreset) => {
    onStyleId(s.id);
    onApplyStyle(s);
    push("assistant", zh ? `已套用「${s.label}」。` : `Applied “${s.label}”.`);
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
          ? "整页生成需要本机 API Key。区域修改在选中部件后使用下方「区域修改」。外部 MCP 仍可改画布。"
          : "Full draft needs a local API key. Use Region edit after selecting a part. MCP can still edit.",
      );
      return;
    }
    const style = presets.find((s) => s.id === styleId) ?? STYLE_PRESETS[0];
    push("assistant", zh ? `按「${style.label}」· ${device} 起草…` : `Drafting “${style.label}”…`);
    onDraft(text, style.id, device);
  };

  const sendRegion = async () => {
    const text = regionInput.trim();
    if (!text || regionBusy || !selectedPart) return;
    if (!readyLocal) {
      push("assistant", zh ? "区域修改需要本机 API Key。" : "Region edit needs a local API key.");
      return;
    }
    setRegionBusy(true);
    push("user", `[区域] ${text}`);
    try {
      const patch = await revisePart(
        settings,
        {
          id: selectedPart.id,
          kind: selectedPart.kind,
          label: selectedPart.label,
          supporting: selectedPart.supporting,
          icon: selectedPart.icon,
          variant: selectedPart.variant,
        },
        text,
        lang,
      );
      onRevisePart(text, patch as Partial<Item>);
      push(
        "assistant",
        zh
          ? `已根据指令修改选中部件：${Object.keys(patch).join(", ") || "字段"}。可继续选中其它区域。`
          : `Updated selected part fields: ${Object.keys(patch).join(", ") || "fields"}.`,
      );
      setRegionInput("");
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      push("assistant", zh ? `区域修改失败：${m}` : `Region edit failed: ${m}`);
    } finally {
      setRegionBusy(false);
    }
  };

  const saveCurrent = () => {
    const doc = currentDoc();
    const name = prompt(zh ? "预设名称" : "Preset name", zh ? "我的风格" : "My style");
    if (!name) return;
    const preset = presetFromDoc(doc, name);
    setUserPresets(upsertUserPreset(preset));
    onStyleId(preset.id);
  };

  const onImportFile = async (file: File | null) => {
    if (!file) return;
    try {
      const list = parsePresetImport(await file.text());
      let merged = loadUserPresets();
      for (const item of list) merged = upsertUserPreset(item);
      setUserPresets(loadUserPresets());
    } catch {
      push("assistant", zh ? "导入失败" : "Import failed");
    }
  };

  const exportJson = () => {
    if (!userPresets.length) return;
    const blob = new Blob([exportPresetsJson(userPresets)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "prism-style-presets.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
  };

  const btn = (primary: boolean): React.CSSProperties => ({
    appearance: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    background: primary ? p.primary : p.surfaceContainerHigh,
    color: primary ? p.onPrimary : p.onSurfaceVariant,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
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
          <Icon name={mode === "none" ? "cloud_off" : "hub"} size={18} />
          <div style={{ flex: 1 }}>
            <strong style={{ display: "block", marginBottom: 2 }}>
              {mode === "none" ? (zh ? "未连接" : "Offline") : mode === "bridge" ? "Bridge / MCP" : mode === "local-api" ? (zh ? "本机 API" : "Local API") : "API + Bridge"}
            </strong>
            {modeText}
            {mode === "bridge" && onBridgeHint && (
              <button type="button" onClick={onBridgeHint} style={{ marginTop: 6, border: "none", background: "transparent", color: p.primary, cursor: "pointer", padding: 0, fontSize: 12, fontWeight: 600 }}>
                {zh ? "查看 Bridge 说明 →" : "Bridge help →"}
              </button>
            )}
          </div>
          <button type="button" onClick={() => setModeInfo(false)} aria-label="close" style={{ border: "none", background: "transparent", cursor: "pointer", color: "inherit", padding: 0 }}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {/* apply mode — user chooses instant vs staged */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{zh ? "绘制方式" : "Apply mode"}</div>
        <div style={{ display: "flex", gap: 6 }}>
          {(
            [
              { key: "instant", label: zh ? "即时" : "Instant", blurb: zh ? "一次成稿" : "One shot" },
              { key: "staged", label: zh ? "分步" : "Staged", blurb: zh ? "层层出现" : "Build up" },
            ] as const
          ).map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => {
                onApplyMode(o.key);
                saveApplyMode(o.key);
              }}
              style={{
                flex: 1,
                border: applyMode === o.key ? `2px solid ${p.primary}` : `1px solid ${p.outlineVariant}`,
                borderRadius: 12,
                padding: "8px 6px",
                background: applyMode === o.key ? p.secondaryContainer : p.surfaceContainerLow,
                color: applyMode === o.key ? p.onSecondaryContainer : p.onSurfaceVariant,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {o.label}
              <div style={{ fontWeight: 400, fontSize: 10, opacity: 0.7 }}>{o.blurb}</div>
            </button>
          ))}
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 11, opacity: 0.5 }}>
          {zh ? "影响 AI / Bridge 推入整页时的呈现节奏；区域修改始终即时。" : "Applies to full-page AI/Bridge pushes. Region edits stay instant."}
        </p>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{zh ? "设备目标" : "Device"}</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {DEVICE_OPTIONS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDevice(d.key)}
              style={{
                flex: 1,
                border: device === d.key ? `2px solid ${p.primary}` : `1px solid ${p.outlineVariant}`,
                borderRadius: 12,
                padding: "6px 4px",
                background: device === d.key ? p.secondaryContainer : p.surfaceContainerLow,
                color: device === d.key ? p.onSecondaryContainer : p.onSurface,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{zh ? "风格预设" : "Styles"}</div>
          <div style={{ display: "flex", gap: 4 }}>
            <button type="button" onClick={saveCurrent} style={miniBtn(p)}>
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
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0] ?? null; e.target.value = ""; void onImportFile(f); }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {presets.map((s) => {
            const on = s.id === styleId;
            const custom = "source" in s && s.source === "custom";
            return (
              <div key={s.id} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => applyPreset(s)}
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
                  <div style={{ height: 32, borderRadius: 8, background: s.swatch, color: s.ink, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700 }}>
                    {s.label.slice(0, 4)}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{custom ? "★ " : ""}{s.label}</div>
                </button>
                {custom && (
                  <button
                    type="button"
                    title={zh ? "删除" : "Delete"}
                    onClick={() => setUserPresets(removeUserPreset(s.id))}
                    style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, border: "none", background: "rgba(0,0,0,0.35)", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center" }}
                  >
                    <Icon name="close" size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ height: 1, background: p.outlineVariant, opacity: 0.6 }} />

      {/* region edit */}
      <section style={{ border: `1px solid ${p.outlineVariant}`, borderRadius: 14, padding: 10, background: p.surfaceContainerLow }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          {zh ? "区域修改" : "Region edit"}
        </div>
        <p style={{ margin: "0 0 8px", fontSize: 11, opacity: 0.6, lineHeight: 1.4 }}>
          {selectedPart
            ? zh
              ? `已选中：${selectedPart.kind} · 「${selectedPart.label || "无标题"}」`
              : `Selected: ${selectedPart.kind} · “${selectedPart.label || "untitled"}”`
            : zh
              ? "在画布上点选一个部件后，可只改这一处。"
              : "Select a part on the canvas to edit only that piece."}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            value={regionInput}
            onChange={(e) => setRegionInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendRegion();
              }
            }}
            rows={2}
            disabled={!selectedPart}
            placeholder={zh ? "例如：改成已完成、副标题写时长、图标换 check…" : "e.g. mark done, supporting with duration…"}
            style={{
              width: "100%",
              minHeight: 48,
              padding: "8px 10px",
              borderRadius: 10,
              border: `1px solid ${p.outlineVariant}`,
              background: p.surface,
              color: p.onSurface,
              fontSize: 12,
              fontFamily: "inherit",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button" disabled={!selectedPart || !regionInput.trim() || regionBusy} onClick={() => void sendRegion()} style={btn(true)}>
              {regionBusy ? (zh ? "修改中…" : "Working…") : zh ? "只改这一处" : "Edit this part"}
            </button>
            {!readyLocal && <span style={{ fontSize: 11, opacity: 0.6 }}>{zh ? "需 API Key" : "API key"}</span>}
          </div>
        </div>
      </section>

      <div style={{ height: 1, background: p.outlineVariant, opacity: 0.6 }} />

      <div style={{ fontSize: 13, fontWeight: 600 }}>{zh ? "和 AI 说想法（整页）" : "Chat AI (whole page)"}</div>
      <div ref={listRef} style={{ minHeight: 80, maxHeight: 140, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, opacity: 0.55, lineHeight: 1.5 }}>
            {zh ? "选风格与设备后生成整页；或先选中部件用「区域修改」。" : "Pick style + device for a full page; or select a part for region edit."}
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
        placeholder={zh ? "描述整页想法，Enter 生成…" : "Describe the whole page, Enter…"}
        style={{
          width: "100%",
          minHeight: 48,
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
      <AiWriteBtn p={p} busy={busy} disabled={!input.trim() && !busy} onClick={send} onCancel={() => {}} label={zh ? "生成整页" : "Draft page"} title={zh ? "本机 API 生成整页" : "Draft full page"} />
      {!readyLocal && (
        <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>
          {zh ? "面板生成需 API Key；外部 MCP 仍可通过 Bridge 改画布。" : "Panel draft needs API key; MCP still works via Bridge."}
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
