"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LogoLoading } from "@/components/LogoLoading";
import { isLang, setGlobalLang, type Lang } from "@/lib/i18n";
import { ProjectLibrary, LibraryExit, persistFsaDoc } from "@/components/ProjectLibrary";
import { saveRecentProject } from "@/lib/storage/fallback";
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

export default function Page() {
  const [lang, setLang] = useState<Lang | null>(null);
  const [phase, setPhase] = useState<"loading" | "fading" | "done">("loading");
  const [session, setSession] = useState<LibraryExit | null>(null);
  const [editorKey, setEditorKey] = useState(0);

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
    return <ProjectLibrary lang={lang} onOpen={onOpenProject} />;
  }

  return (
    <>
      <Editor
        key={`${session.kind}:${session.kind === "fsa" ? session.folderName : session.id}:${editorKey}`}
        initialLang={lang}
        initialDoc={session.doc}
        persistDoc={persistDoc}
        onExitLibrary={onExitLibrary}
        onReady={() => setPhase((p) => (p === "loading" ? "fading" : "done"))}
      />
      {phase !== "done" && <Boot done={phase === "fading"} />}
    </>
  );
}
