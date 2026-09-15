"use client";

import { useEffect, useState } from "react";
import { Palette } from "@/lib/tokens";
import { useLang } from "@/lib/i18n";
import { ICON_SOURCE_OPTIONS, IconEntry, IconSource, searchIcons } from "@/lib/icons";
import { Icon } from "./M3Node";

/** Browse icons across Material / Lucide / Heroicons and pick one for the canvas. */
export function IconBrowser({
  p,
  onPick,
}: {
  p: Palette;
  onPick: (key: string) => void;
}) {
  const lang = useLang();
  const zh = lang === "zh";
  const [q, setQ] = useState("");
  const [source, setSource] = useState<IconSource | "all">("all");
  const [items, setItems] = useState<IconEntry[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    const t = window.setTimeout(() => {
      void searchIcons(q, source, 100).then((list) => {
        if (!cancelled) {
          setItems(list);
          setBusy(false);
        }
      });
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q, source]);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{zh ? "图标库" : "Icons"}</div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={zh ? "搜索图标…（至少 2 字查全量 Material）" : "Search icons…"}
        style={{
          width: "100%",
          height: 40,
          padding: "0 12px",
          borderRadius: 20,
          border: `1px solid ${p.outlineVariant}`,
          background: p.surface,
          color: p.onSurface,
          fontSize: 13,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {ICON_SOURCE_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setSource(o.key)}
            style={{
              border: source === o.key ? `1px solid ${p.primary}` : `1px solid ${p.outlineVariant}`,
              background: source === o.key ? p.secondaryContainer : "transparent",
              color: source === o.key ? p.onSecondaryContainer : p.onSurfaceVariant,
              borderRadius: 999,
              padding: "4px 10px",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 11, opacity: 0.55 }}>
        {zh
          ? "Lucide / Heroicons 为常用对照表，画布仍用 Material Symbols 字形渲染。"
          : "Lucide/Heroicons are curated maps; canvas renders Material Symbols ligatures."}
      </p>
      {busy && <p style={{ margin: 0, fontSize: 12, opacity: 0.5 }}>…</p>}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
          gap: 6,
          maxHeight: 220,
          overflow: "auto",
          paddingRight: 2,
        }}
      >
        {items.map((it) => (
          <button
            key={`${it.source}-${it.key}-${it.label}`}
            type="button"
            title={`${it.label} · ${it.key}`}
            onClick={() => onPick(it.key)}
            className="m3-press"
            style={{
              border: `1px solid ${p.outlineVariant}`,
              borderRadius: 10,
              background: p.surfaceContainerLow,
              color: p.onSurface,
              cursor: "pointer",
              padding: "8px 4px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              minHeight: 56,
            }}
          >
            <Icon name={it.key} size={22} />
            <span
              style={{
                fontSize: 9,
                opacity: 0.65,
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {it.label}
            </span>
          </button>
        ))}
        {!busy && items.length === 0 && (
          <p style={{ gridColumn: "1 / -1", fontSize: 12, opacity: 0.5 }}>{zh ? "无结果" : "No results"}</p>
        )}
      </div>
    </section>
  );
}
