"use client";

import { useRef, useState } from "react";
import { Palette } from "@/lib/tokens";
import { useLang } from "@/lib/i18n";
import {
  PersonalStyle,
  clearPersonalStyle,
  exportPersonalStyleJson,
  loadPersonalStyle,
  parsePersonalStyleImport,
  personalStyleFromDoc,
  type PersonalStyle as PS,
} from "@/lib/personalStyle";
import type { Doc } from "@/lib/tokens";
import { Icon } from "./M3Node";

/** My style profile: save / apply / import / export (browser-local, no account). */
export function PersonalStylePanel({
  p,
  currentDoc,
  onApply,
  onSaved,
}: {
  p: Palette;
  currentDoc: () => Pick<Doc, "paletteKey" | "theme" | "title">;
  onApply: (style: PS) => void;
  onSaved?: (style: PS) => void;
}) {
  const lang = useLang();
  const zh = lang === "zh";
  const [style, setStyle] = useState<PersonalStyle | null>(() => loadPersonalStyle());
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => setStyle(loadPersonalStyle());

  const saveFromCanvas = () => {
    const next = personalStyleFromDoc(currentDoc());
    setStyle(next);
    onSaved?.(next);
  };

  const apply = () => {
    if (!style) return;
    onApply(style);
  };

  const onImport = async (file: File | null) => {
    if (!file) return;
    try {
      setStyle(parsePersonalStyleImport(await file.text()));
    } catch {
      /* keep previous */
    }
  };

  const exportJson = () => {
    if (!style) return;
    const blob = new Blob([exportPersonalStyleJson(style)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "prism-personal-style.json";
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
    <section
      style={{
        border: `1px solid ${p.outlineVariant}`,
        borderRadius: 16,
        padding: 12,
        background: p.surfaceContainerLow,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="palette" size={18} />
        <strong style={{ fontSize: 13 }}>{zh ? "我的样式" : "My style"}</strong>
      </div>

      {style ? (
        <div style={{ fontSize: 12, lineHeight: 1.5, color: p.onSurfaceVariant }}>
          <div style={{ color: p.onSurface, fontWeight: 600 }}>{style.name}</div>
          <div>
            {style.paletteKey} · {style.theme.dark ? (zh ? "深色" : "Dark") : zh ? "浅色" : "Light"} · {style.theme.shape} ·{" "}
            {style.theme.motion}
          </div>
          {style.defaultDevice ? <div>{zh ? "默认设备" : "Default device"}: {style.defaultDevice}</div> : null}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>
          {zh ? "还没有档案。在画布调好主题后点「从当前保存」。" : "No profile yet. Tune the canvas, then Save from current."}
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button type="button" onClick={saveFromCanvas} style={btn(true)}>
          {zh ? "从当前保存" : "Save current"}
        </button>
        <button type="button" onClick={apply} disabled={!style} style={btn(false)}>
          {zh ? "应用到画布" : "Apply"}
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} style={btn(false)}>
          {zh ? "导入" : "Import"}
        </button>
        <button type="button" onClick={exportJson} disabled={!style} style={btn(false)}>
          {zh ? "导出" : "Export"}
        </button>
        <button
          type="button"
          onClick={() => {
            clearPersonalStyle();
            refresh();
          }}
          disabled={!style}
          style={{ ...btn(false), color: p.error }}
        >
          {zh ? "清除" : "Clear"}
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
          void onImport(f);
        }}
      />
      <p style={{ margin: 0, fontSize: 11, opacity: 0.5 }}>
        {zh ? "仅保存在本机浏览器；阶段 6 再谈同步。" : "Stored in this browser only; sync comes later."}
      </p>
    </section>
  );
}
