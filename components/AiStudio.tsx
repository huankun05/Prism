"use client";

import { useEffect, useRef, useState } from "react";
import { Palette, Theme } from "@/lib/tokens";
import { t, useLang } from "@/lib/i18n";
import { AiSettings, hasKey } from "@/lib/ai";
import { STYLE_PRESETS, StylePreset, ideaWithStyle } from "@/lib/styles";
import { Icon } from "./M3Node";
import { AiWriteBtn, aiErrorText } from "./AiPanel";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

/**
 * In-canvas AI studio: visual style presets + chat that drafts designs.
 * Keys still live in the browser (same as AiPanel settings).
 */
export function AiStudio({
  p,
  settings,
  busy,
  onApplyStyle,
  onDraft,
  styleId,
  onStyleId,
}: {
  p: Palette;
  settings: AiSettings;
  busy: boolean;
  /** apply palette + theme immediately (no model call) */
  onApplyStyle: (style: StylePreset) => void;
  /** generate a full design from idea + style */
  onDraft: (idea: string, styleId: string) => void;
  styleId: string;
  onStyleId: (id: string) => void;
}) {
  const lang = useLang();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const ready = hasKey(settings) && settings.model.trim().length > 0;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const zh = lang === "zh";
  const push = (role: ChatMsg["role"], text: string) => {
    idRef.current += 1;
    setMessages((m) => [...m, { id: `m${idRef.current}`, role, text }]);
  };

  const applyPreset = (s: StylePreset) => {
    onStyleId(s.id);
    onApplyStyle(s);
    push("assistant", zh ? `已套用「${s.label}」。可直接生成，或再描述要画什么。` : `Applied “${s.label}”. Generate now, or describe what to draw.`);
  };

  const send = () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    push("user", text);
    if (!ready) {
      push("assistant", zh ? "请先在「设置」里配置模型 API Key（仍只存在浏览器本地）。" : "Configure a model API key in Settings first (stored only in this browser).");
      return;
    }
    const style = STYLE_PRESETS.find((s) => s.id === styleId) ?? STYLE_PRESETS[0];
    push("assistant", zh ? `正在按「${style.label}」起草设计…` : `Drafting a design in “${style.label}”…`);
    onDraft(text, style.id);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", minHeight: 0 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{zh ? "风格预设" : "Styles"}</div>
        <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 8 }}>
          {zh ? "点一下立刻换配色/形状；也可在此基础上生成" : "Click to restyle instantly; generate on top"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {STYLE_PRESETS.map((s) => {
            const on = s.id === styleId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => applyPreset(s)}
                className="m3-press"
                style={{
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
                    letterSpacing: 0.2,
                  }}
                >
                  {s.label.slice(0, 4)}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>{s.label}</div>
                <div style={{ fontSize: 10, opacity: 0.65, lineHeight: 1.3 }}>{s.blurb}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ height: 1, background: p.outlineVariant, opacity: 0.6 }} />

      <div style={{ fontSize: 13, fontWeight: 600 }}>{zh ? "和 AI 说想法" : "Chat with AI"}</div>

      <div
        ref={listRef}
        style={{
          flex: "1 1 auto",
          minHeight: 120,
          maxHeight: 220,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          paddingRight: 2,
        }}
      >
        {messages.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, opacity: 0.55, lineHeight: 1.5 }}>
            {zh
              ? "例如：做一个音乐播放器，有歌单和播放控制。选好风格后点生成，设计会画在画布上。"
              : "e.g. A music player with playlists and transport controls. Pick a style, then generate onto the canvas."}
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

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
          placeholder={zh ? "描述界面想法，Enter 发送…" : "Describe the UI idea, Enter to send…"}
          style={{
            width: "100%",
            resize: "vertical",
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
          }}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <AiWriteBtn
            p={p}
            busy={busy}
            disabled={!input.trim() && !busy}
            onClick={send}
            onCancel={() => {}}
            label={zh ? "生成设计" : "Generate"}
            title={zh ? "用当前风格把想法画到画布" : "Draw the idea onto the canvas"}
          />
          {!ready && (
            <span style={{ fontSize: 11, opacity: 0.65 }}>
              {zh ? "需先配置 API Key" : "API key required"}
            </span>
          )}
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 11, opacity: 0.5, lineHeight: 1.4 }}>
        {zh
          ? "生成结果可撤销；风格套用不消耗额度。设计规范见 public/design-system.md。"
          : "Drafts are undoable. Style apply is free. See public/design-system.md."}
      </p>
    </div>
  );
}

export type { Theme };
