"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LogoLoading } from "@/components/LogoLoading";
import { isLang, setGlobalLang, type Lang } from "@/lib/i18n";
import { ProjectLibrary, LibraryExit, persistFsaDoc } from "@/components/ProjectLibrary";
import { createFallbackProjectId, saveRecentProject } from "@/lib/storage/fallback";
import { ensurePermission, supportsDirectoryPicker } from "@/lib/storage/detect";
import { loadWorkspaceHandle } from "@/lib/storage/handleCache";
import { createProject, type DirHandleLike } from "@/lib/storage/workspace";
import { sanitizeFolderName } from "@/lib/storage/types";
import { connectBridge, type BridgeStatus } from "@/lib/bridge";
import { isProject } from "@/lib/project";
import type { Doc } from "@/lib/tokens";

const loadEditor = () => import("./Editor");
if (typeof window !== "undefined") void loadEditor();

const Editor = dynamic(loadEditor, { ssr: false, loading: () => null });

function Boot({ done }: { done: boolean }) {
  return (
    <div className="m3e-boot" data-done={done ? "" : undefined} aria-busy={!done} aria-hidden={done}>
      <LogoLoading size={48} color="#6750a4" />
    </div>
  );
}

function initialLanguage(): Lang {
  try {
    const ui = JSON.parse(localStorage.getItem("m3e:ui") ?? "null");
    if (isLang(ui?.lang)) return ui.lang;
  } catch {}
  const language = (navigator.language ?? "").toLowerCase();
  if (language.startsWith("en")) return "en";
  if (language.startsWith("ko")) return "ko";
  if (language.startsWith("ja")) return "ja";
  return "zh";
}

const BOOT_FADE_MS = 360;

/** Create a project from an AI design: workspace folder if possible, else browser draft. */
async function autoCreateFromDesign(doc: Doc, lang: Lang): Promise<LibraryExit> {
  const fallbackName = lang === "zh" ? "AI 草稿" : "AI draft";
  const name = sanitizeFolderName(doc.title || fallbackName);
  if (supportsDirectoryPicker()) {
    try {
      const cached = await loadWorkspaceHandle();
      if (cached) {
        const ok = await ensurePermission(cached as unknown as DirHandleLike, "readwrite");
        if (ok) {
          const item = await createProject(cached as unknown as DirHandleLike, name, doc);
          return { kind: "fsa", root: cached as unknown as DirHandleLike, folderName: item.folderName, doc };
        }
      }
    } catch {
      /* fall through to browser draft */
    }
  }
  const id = createFallbackProjectId();
  saveRecentProject(id, name, doc);
  return { kind: "fallback", id, name, doc };
}

export default function Page() {
  const [lang, setLang] = useState<Lang | null>(null);
  const [phase, setPhase] = useState<"loading" | "fading" | "done">("loading");
  const [session, setSession] = useState<LibraryExit | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>("idle");
  const [externalApply, setExternalApply] = useState<{ doc: Doc; n: number } | null>(null);
  const applySeq = useRef(0);
  const sessionRef = useRef<LibraryExit | null>(null);
  sessionRef.current = session;
  const langRef = useRef<Lang>("zh");
  langRef.current = lang ?? "zh";

  useEffect(() => {
    const initialLang = initialLanguage();
    document.documentElement.lang = initialLang;
    setGlobalLang(initialLang);
    setLang(initialLang);
  }, []);

  useEffect(() => {
    if (phase !== "fading") return;
    const id = setTimeout(() => setPhase("done"), BOOT_FADE_MS);
    return () => clearTimeout(id);
  }, [phase]);

  /* Bridge lives at page level so AI can draw even from the project library. */
  useEffect(() => {
    const disconnect = connectBridge(
      {
        onStatus: setBridgeStatus,
        onApply: (raw) => {
          if (!isProject(raw)) return;
          const doc = raw;
          const current = sessionRef.current;
          applySeq.current += 1;
          const n = applySeq.current;
          if (!current) {
            void autoCreateFromDesign(doc, langRef.current).then((exit) => {
              setSession(exit);
              setEditorKey((k) => k + 1);
              setPhase("loading");
              setExternalApply({ doc, n });
            });
            return;
          }
          setExternalApply({ doc, n });
        },
      },
      { role: "page" },
    );
    return disconnect;
  }, []);

  const persistDoc = useMemo(() => {
    if (!session) return undefined;
    if (session.kind === "fsa") {
      return (doc: Doc) => persistFsaDoc(session.root, session.folderName, doc);
    }
    return (doc: Doc) => {
      saveRecentProject(session.id, session.name, doc);
    };
  }, [session]);

  const onExitLibrary = useCallback(() => {
    setSession(null);
    setExternalApply(null);
    setPhase("loading");
  }, []);

  const onOpenProject = useCallback((exit: LibraryExit) => {
    setSession(exit);
    setEditorKey((k) => k + 1);
    setPhase("loading");
  }, []);

  if (!lang) {
    return <Boot done={false} />;
  }

  if (!session) {
    return (
      <>
        <ProjectLibrary lang={lang} onOpen={onOpenProject} bridgeStatus={bridgeStatus} />
        {phase !== "done" && <Boot done={phase === "fading"} />}
      </>
    );
  }

  return (
    <>
      <Editor
        key={`${session.kind}:${session.kind === "fsa" ? session.folderName : session.id}:${editorKey}`}
        initialLang={lang}
        initialDoc={session.doc}
        persistDoc={persistDoc}
        onExitLibrary={onExitLibrary}
        externalApply={externalApply}
        bridgeStatus={bridgeStatus}
        onReady={() => setPhase((p) => (p === "loading" ? "fading" : "done"))}
      />
      {phase !== "done" && <Boot done={phase === "fading"} />}
    </>
  );
}
