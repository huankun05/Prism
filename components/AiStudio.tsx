"use client";

import { useMemo, useRef, useState } from "react";
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
type AiTab = "draft" | "region" | "styles" | "settings";

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

function Seg<T extends string>({
  options,
  value,
  onChange,
  p,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
  p: Palette;
}) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            style={{
              flex: 1,
              border: on ? `1.5px solid ${p.primary}` : `1px solid ${p.outlineVariant}`,
              borderRadius: 999,
              padding: "7px 8px",
              background: on ? p.secondaryContainer : "transparent",
              color: on ? p.onSecondaryContainer : p.onSurfaceVariant,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
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
  onOpenSettings,
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
  onOpenSettings?: () => void;
}) {
  const lang = useLang();
  const zh = lang === "zh";
  const [tab, setTab] = useState<AiTab>("draft");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [regionInput, setRegionInput] = useState("");
  const [regionBusy, setRegionBusy] = useState(false);
  const [userPresets, setUserPresets] = useState<UserStylePreset[]>(() => loadUserPresets());
  const [device, setDevice] = useState<DeviceTarget>("phone");
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);

  const readyLocal = hasKey(settings) && settings.model.trim().length > 0;
  const mode: AiMode = detectAiMode({ bridgeConnected, hasLocalKey: readyLocal });
  const presets = useMemo(() => allPresets(userPresets), [userPresets]);

  const modeBadge =
    mode === "none"
      ? zh ? "未连接" : "Offline"
      : mode === "bridge"
        ? "Bridge / MCP"
        : mode === "local-api"
          ? zh ? "本机 API" : "Local API"
          : "API + Bridge";

  const push = (role: ChatMsg["role"], text: string) => {
    idRef.current += 1;
    setMessages((m) => [...m, { id: `m${idRef.current}`, role, text }]);
  };

  const applyPreset = (s: StylePreset) => {
    onStyleId(s.id);
    onApplyStyle(s);
  };

  const send = () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    push("user", text);
    if (!readyLocal) {
      push("assistant", zh ? "需要本机 API Key（展开设置）。" : "Need a local API key (Settings).");
      return;
    }
    const style = presets.find((s) => s.id === styleId) ?? STYLE_PRESETS[0];
    onDraft(text, style.id, device);
  };

  const sendRegion = async () => {
    const text = regionInput.trim();
    if (!text || regionBusy || !selectedPart || !readyLocal) return;
    setRegionBusy(true);
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
      setRegionInput("");
    } catch (e) {
      push("assistant", zh ? `失败：${e instanceof Error ? e.message : e}` : `Failed`);
    } finally {
      setRegionBusy(false);
    }
  };

  const saveCurrent = () => {
    const name = prompt(zh ? "预设名称" : "Preset name", zh ? "我的风格" : "My style");
    if (!name) return;
    const preset = presetFromDoc(currentDoc(), name);
    setUserPresets(upsertUserPreset(preset));
    onStyleId(preset.id);
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
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", minHeight: 0 }}>
      {/* status strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11,
          color: mode === "none" ? p.error : p.onSurfaceVariant,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            background: mode === "none" ? p.error : "#2E7D32",
            flex: "0 0 auto",
          }}
        />
        <span style={{ fontWeight: 600 }}>{modeBadge}</span>
        <button
          type="button"
          onClick={onBridgeHint}
          style={{ border: "none", background: "transparent", color: p.primary, cursor: "pointer", padding: 0, fontSize: 11, fontWeight: 600 }}
        >
          {zh ? "说明" : "Help"}
        </button>
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            style={{ border: "none", background: "transparent", color: p.onSurfaceVariant, cursor: "pointer", padding: 0, fontSize: 11, marginLeft: "auto" }}
          >
            {zh ? "设置" : "Settings"}
          </button>
        )}
      </div>

      <Seg<AiTab>
        p={p}
        value={tab}
        onChange={setTab}
        options={[
          { key: "draft", label: zh ? "生成" : "Draft" },
          { key: "region", label: zh ? "改一处" : "Region" },
          { key: "styles", label: zh ? "风格" : "Styles" },
          { key: "settings", label: zh ? "生成设置" : "Options" },
        ]}
      />

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", paddingRight: 2 }}>
        {tab === "draft" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.55, marginBottom: 6 }}>
                {zh ? "设备（生成时）" : "Device (draft)"}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {DEVICE_OPTIONS.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setDevice(d.key)}
                    style={{
                      border: device === d.key ? `1.5px solid ${p.primary}` : `1px solid ${p.outlineVariant}`,
                      borderRadius: 8,
                      padding: "4px 8px",
                      background: device === d.key ? p.secondaryContainer : "transparent",
                      color: device === d.key ? p.onSecondaryContainer : p.onSurfaceVariant,
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div ref={listRef} style={{ minHeight: 72, maxHeight: 120, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {messages.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12, opacity: 0.5, lineHeight: 1.5 }}>
                  {zh ? "描述整页 → 生成。只改一件小事请用「改一处」。" : "Describe a page → Draft. For one tweak use Region."}
                </p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "92%",
                      padding: "6px 10px",
                      borderRadius: 12,
                      background: m.role === "user" ? p.primary : p.surfaceContainerHigh,
                      color: m.role === "user" ? p.onPrimary : p.onSurface,
                      fontSize: 12,
                      lineHeight: 1.4,
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
              rows={3}
              placeholder={zh ? "例如：做一个音乐播放器…" : "e.g. a music player…"}
              style={{
                width: "100%",
                minHeight: 64,
                padding: "8px 10px",
                borderRadius: 10,
                border: `1px solid ${p.outlineVariant}`,
                background: p.surface,
                color: p.onSurface,
                fontSize: 13,
                fontFamily: "inherit",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            <AiWriteBtn p={p} busy={busy} disabled={!input.trim() && !busy} onClick={send} onCancel={() => {}} label={zh ? "生成整页" : "Draft page"} title={zh ? "生成" : "Draft"} />
          </div>
        )}

        {tab === "region" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.55, lineHeight: 1.5 }}>
              {selectedPart
                ? zh
                  ? `已选中：${selectedPart.kind}「${selectedPart.label || "—"}」`
                  : `Selected: ${selectedPart.kind} “${selectedPart.label || "—"}”`
                : zh
                  ? "先在画布上点选一个部件，再在这里只改它。"
                  : "Select a part on the canvas, then edit only that piece."}
            </p>
            <textarea
              value={regionInput}
              onChange={(e) => setRegionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendRegion();
                }
              }}
              rows={3}
              disabled={!selectedPart}
              placeholder={zh ? "改成已完成、副标题写时长…" : "Mark done, add duration…"}
              style={{
                width: "100%",
                minHeight: 64,
                padding: "8px 10px",
                borderRadius: 10,
                border: `1px solid ${p.outlineVariant}`,
                background: p.surface,
                color: p.onSurface,
                fontSize: 13,
                fontFamily: "inherit",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              disabled={!selectedPart || !regionInput.trim() || regionBusy}
              onClick={() => void sendRegion()}
              style={btn(true)}
            >
              {regionBusy ? (zh ? "修改中…" : "Working…") : zh ? "只改这一处" : "Edit this part"}
            </button>
          </div>
        )}

        {tab === "styles" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0, fontSize: 11, opacity: 0.5 }}>
              {zh ? "只改画布设计稿，不改编辑器工具栏颜色。" : "Changes the design on canvas only — not the editor chrome."}
            </p>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <button type="button" onClick={saveCurrent} style={{ ...btn(false), padding: "5px 10px", fontSize: 11 }}>
                {zh ? "存为预设" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{ ...btn(false), padding: "5px 10px", fontSize: 11 }}
              >
                {zh ? "导入" : "Import"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!userPresets.length) return;
                  const blob = new Blob([exportPresetsJson(userPresets)], { type: "application/json" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = "prism-style-presets.json";
                  a.click();
                }}
                style={{ ...btn(false), padding: "5px 10px", fontSize: 11 }}
              >
                {zh ? "导出" : "Export"}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                e.target.value = "";
                if (!f) return;
                void f.text().then((text) => {
                  try {
                    let merged = loadUserPresets();
                    for (const item of parsePresetImport(text)) merged = upsertUserPreset(item);
                    setUserPresets(loadUserPresets());
                  } catch {
                    /* ignore */
                  }
                });
              }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {presets.map((s) => {
                const on = s.id === styleId;
                const custom = "source" in s && s.source === "custom";
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => applyPreset(s)}
                    style={{
                      border: on ? `2px solid ${p.primary}` : `1px solid ${p.outlineVariant}`,
                      borderRadius: 10,
                      padding: 6,
                      background: on ? p.secondaryContainer : p.surfaceContainerLow,
                      color: on ? p.onSecondaryContainer : p.onSurface,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      minHeight: 0,
                    }}
                  >
                    <div style={{ height: 28, borderRadius: 6, background: s.swatch }} />
                    <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2 }}>
                      {custom ? "★ " : ""}
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{zh ? "绘制方式" : "Apply mode"}</div>
              <Seg<ApplyMode>
                p={p}
                value={applyMode}
                onChange={(m) => {
                  onApplyMode(m);
                  saveApplyMode(m);
                }}
                options={[
                  { key: "instant", label: zh ? "即时" : "Instant" },
                  { key: "staged", label: zh ? "分步" : "Staged" },
                ]}
              />
              <p style={{ margin: "6px 0 0", fontSize: 11, opacity: 0.5, lineHeight: 1.4 }}>
                {zh ? "整页 AI/Bridge 推入时的节奏；区域修改始终即时。" : "Pacing for full-page pushes; region edits stay instant."}
              </p>
            </div>
            <details>
              <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600, padding: "4px 0" }}>
                {zh ? "模型 API" : "Model API"}
              </summary>
              <div style={{ marginTop: 8 }}>
                {/* parent renders AiPanel in settings; keep a short hint here */}
                <p style={{ margin: 0, fontSize: 12, opacity: 0.6, lineHeight: 1.5 }}>
                  {readyLocal
                    ? zh
                      ? `已配置：${settings.provider} · ${settings.model}`
                      : `Configured: ${settings.provider} · ${settings.model}`
                    : zh
                      ? "在右侧「模型设置」或点上方「设置」配置 Key（仅存浏览器）。"
                      : "Configure your API key in Settings (browser only)."}
                </p>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

export { ideaWithStyle };
