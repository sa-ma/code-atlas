"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  LoaderCircle,
  LogOut,
  Minus,
  MoreVertical,
  PanelRightOpen,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthControls } from "@/components/auth-controls";
import { MermaidPreview, exportMermaidToPng } from "@/components/mermaid-preview";
import { useSession } from "@/components/session-provider";
import { getApiBaseUrl } from "@/lib/api";
import type {
  AnalyzeRepositoryResponse,
  SavedAnalysisRecord,
  SavedAnalysisSummary,
} from "@/lib/types/code-atlas";

const LOADER_STATES = [
  "Validating GitHub URL",
  "Scanning repository tree",
  "Extracting architecture facts",
  "Drawing the diagram",
] as const;

function DiagramStage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto flex h-[calc(100vh-3rem)] w-full max-w-[calc(100vw-3rem)] items-center justify-center overflow-hidden px-12 py-12 sm:max-w-[calc(100vw-4rem)] sm:px-20 sm:py-18">
      {children}
    </div>
  );
}

function LoaderModal({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-white/88 px-6 backdrop-blur-[1px]">
      <div className="w-full max-w-md border border-black bg-white p-7">
        <div className="flex items-center gap-3">
          <LoaderCircle className="size-5 animate-spin text-black" />
          <p className="font-hand text-3xl tracking-tight text-black">Generating map</p>
        </div>
        <div className="mt-6 space-y-3">
          {LOADER_STATES.map((state, index) => (
            <div key={state} className="flex items-center justify-between gap-4 text-sm text-black">
              <span>{state}</span>
              <span className="font-hand text-2xl leading-none">
                {index < activeIndex ? "✓" : index === activeIndex ? "…" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExplorerBreadcrumb({ repoLabel, repoUrl }: { repoLabel: string; repoUrl: string }) {
  return (
    <div className="inline-flex min-w-0 flex-wrap items-center gap-1 text-sm text-black">
      <Link href="/" className="font-logo text-lg leading-none transition-opacity hover:opacity-60">
        Code Atlas
      </Link>
      <span className="font-hand text-lg leading-none text-zinc-400">/</span>
      <a
        href={repoUrl}
        target="_blank"
        rel="noreferrer"
        className="font-logo min-w-0 max-w-full truncate text-lg leading-none transition-opacity hover:opacity-60 sm:max-w-[320px]"
      >
        {repoLabel}
      </a>
    </div>
  );
}

function ZoomControls({
  zoom,
  onZoomOut,
  onZoomIn,
}: {
  zoom: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
}) {
  return (
    <div className="inline-flex items-center border border-black bg-white">
      <button
        type="button"
        onClick={onZoomOut}
        className="inline-flex size-9 items-center justify-center border-r border-black text-black transition-colors hover:bg-black hover:text-white"
        aria-label="Zoom out"
      >
        <Minus className="size-4" />
      </button>
      <div className="min-w-14 px-2 text-center text-sm text-black">{Math.round(zoom * 100)}%</div>
      <button
        type="button"
        onClick={onZoomIn}
        className="inline-flex size-9 items-center justify-center border-l border-black text-black transition-colors hover:bg-black hover:text-white"
        aria-label="Zoom in"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function ActionMenu({
  saveLabel,
  copiedMermaid,
  isSaving,
  showSignOut,
  userEmail,
  userName,
  onSave,
  onSignOut,
  onExportPng,
  onCopyMermaid,
}: {
  saveLabel: string;
  copiedMermaid: boolean;
  isSaving: boolean;
  showSignOut: boolean;
  userEmail?: string;
  userName?: string | null;
  onSave: () => void;
  onSignOut: () => void;
  onExportPng: () => void;
  onCopyMermaid: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function runAction(action: () => void) {
    setIsOpen(false);
    action();
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex items-center gap-2 border border-black bg-white px-3 py-2 text-sm text-black transition-colors hover:bg-black hover:text-white"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        Actions
        <ChevronDown className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-56 border border-black bg-white p-1 shadow-[6px_6px_0_0_#111111]">
          {userEmail ? (
            <div className="border-b border-zinc-200 px-3 py-3 text-left">
              <div className="text-sm font-medium text-black">{userName ?? userEmail}</div>
              <div className="mt-1 text-xs text-zinc-500">{userEmail}</div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => runAction(onSave)}
            disabled={isSaving}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>{saveLabel}</span>
            {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : null}
          </button>
          <button
            type="button"
            onClick={() => runAction(onCopyMermaid)}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-black transition-colors hover:bg-black hover:text-white"
          >
            <span>{copiedMermaid ? "Copied Mermaid" : "Copy as Mermaid"}</span>
            {copiedMermaid ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => runAction(onExportPng)}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-black transition-colors hover:bg-black hover:text-white"
          >
            <span>Download PNG</span>
            <Download className="size-4" />
          </button>
          {showSignOut ? (
            <button
              type="button"
              onClick={() => runAction(onSignOut)}
              className="flex w-full items-center justify-between gap-3 border-t border-zinc-200 px-3 py-2 text-left text-sm text-black transition-colors hover:bg-black hover:text-white"
            >
              <span>Sign out</span>
              <LogOut className="size-4" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SavedAnalysesDrawer({
  currentRepoUrl,
  currentSavedId,
  isOpen,
  onClose,
  refreshKey,
}: {
  currentRepoUrl?: string;
  currentSavedId?: string;
  isOpen: boolean;
  onClose: () => void;
  refreshKey: number;
}) {
  const router = useRouter();
  const { user, isLoading } = useSession();
  const [items, setItems] = useState<SavedAnalysisSummary[]>([]);
  const [error, setError] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user || !isOpen) {
      setItems([]);
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        setIsFetching(true);
        setError("");
        const response = await fetch(`${getApiBaseUrl()}/api/analyses`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to load saved analyses.");
        }

        const payload = (await response.json()) as SavedAnalysisSummary[];

        if (!cancelled) {
          setItems(payload);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error ? requestError.message : "Failed to load saved analyses.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [isOpen, refreshKey, user]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (isLoading || !user || !isOpen) {
    return null;
  }

  async function handleDelete(itemId: string) {
    try {
      setOpenMenuId(null);
      setDeletingId(itemId);
      setError("");

      const response = await fetch(`${getApiBaseUrl()}/api/analyses/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Saved analysis could not be deleted.");
      }

      setItems((current) => current.filter((item) => item.id !== itemId));

      if (currentSavedId === itemId) {
        if (currentRepoUrl) {
          router.replace(`/explore?repo=${encodeURIComponent(currentRepoUrl)}`);
        } else {
          router.replace("/");
        }
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Saved analysis could not be deleted.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
        aria-label="Close saved analyses"
      />
      <aside className="fixed right-0 top-0 z-40 flex h-screen w-full max-w-md flex-col border-l border-black bg-white p-5 shadow-[-10px_0_0_0_#111111]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-logo text-2xl leading-none text-black">Saved analyses</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Reopen a previously generated map without recomputing it.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isFetching ? <span className="text-sm text-zinc-500">Refreshing…</span> : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-9 items-center justify-center border border-black text-black transition-colors hover:bg-black hover:text-white"
              aria-label="Close saved analyses"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {items.length === 0 && !isFetching ? (
          <p className="mt-4 text-sm text-zinc-500">No saved analyses yet.</p>
        ) : null}
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="relative border border-black">
              <Link
                href={`/explore?saved=${encodeURIComponent(item.id)}`}
                onClick={onClose}
                className="block min-w-0 px-4 py-3 pr-14 transition-colors hover:bg-black hover:text-white"
              >
                <div className="font-medium">{item.title}</div>
                <div className="mt-1 text-sm opacity-70">{item.summary ?? item.repoUrl}</div>
              </Link>
              <div
                ref={openMenuId === item.id ? menuRef : null}
                className="absolute right-2 top-2"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenMenuId((current) => (current === item.id ? null : item.id))
                  }
                  disabled={deletingId === item.id}
                  className="inline-flex size-9 items-center justify-center border border-black bg-white text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Open actions for ${item.title}`}
                  aria-haspopup="menu"
                  aria-expanded={openMenuId === item.id}
                >
                  {deletingId === item.id ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <MoreVertical className="size-4" />
                  )}
                </button>
                {openMenuId === item.id ? (
                  <div className="absolute right-0 top-[calc(100%+0.5rem)] z-10 min-w-36 border border-black bg-white p-1 shadow-[6px_6px_0_0_#111111]">
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-black transition-colors hover:bg-black hover:text-white"
                    >
                      <span>Delete</span>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

export function CodeAtlasExplorer({
  repoUrl,
  savedAnalysisId,
}: {
  repoUrl: string;
  savedAnalysisId: string;
}) {
  const router = useRouter();
  const { user, signInWithGitHub, signOut } = useSession();
  const [result, setResult] = useState<AnalyzeRepositoryResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [stageIndex, setStageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [renderedSvg, setRenderedSvg] = useState("");
  const [exportNode, setExportNode] = useState<HTMLDivElement | null>(null);
  const [copiedMermaid, setCopiedMermaid] = useState(false);
  const [saveLabel, setSaveLabel] = useState("Save analysis");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [savedAnalysesRefreshKey, setSavedAnalysesRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let ticker = 0;

    async function analyzeCurrentRepo() {
      try {
        setError("");
        setIsLoading(true);
        setStageIndex(0);

        ticker = window.setInterval(() => {
          setStageIndex((current) => Math.min(current + 1, LOADER_STATES.length - 1));
        }, 1000);

        const response = await fetch(`${getApiBaseUrl()}/api/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoUrl }),
        });

        const payload = (await response.json()) as
          | AnalyzeRepositoryResponse
          | { error?: string };

        window.clearInterval(ticker);

        if (!response.ok) {
          throw new Error(
            "error" in payload ? payload.error ?? "Repository analysis failed." : "Repository analysis failed.",
          );
        }

        if ("error" in payload) {
          throw new Error(payload.error ?? "Repository analysis failed.");
        }

        if (!cancelled) {
          setStageIndex(LOADER_STATES.length - 1);
          setResult(payload as AnalyzeRepositoryResponse);
          setRenderedSvg("");
          setZoom(1);
          setCopiedMermaid(false);
          setIsLoading(false);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Repository analysis failed.",
          );
          setIsLoading(false);
        }
      }
    }

    async function loadSavedAnalysis() {
      try {
        setError("");
        setIsLoading(true);
        const response = await fetch(`${getApiBaseUrl()}/api/analyses/${savedAnalysisId}`, {
          credentials: "include",
        });

        const payload = (await response.json()) as SavedAnalysisRecord | { message?: string };

        if (!response.ok) {
          throw new Error(
            "message" in payload ? payload.message ?? "Saved analysis could not be loaded." : "Saved analysis could not be loaded.",
          );
        }

        if (!cancelled) {
          setResult((payload as SavedAnalysisRecord).result);
          setRenderedSvg("");
          setZoom(1);
          setCopiedMermaid(false);
          setIsLoading(false);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Saved analysis could not be loaded.",
          );
          setIsLoading(false);
        }
      }
    }

    if (savedAnalysisId.trim().length > 0) {
      void loadSavedAnalysis();
      return () => {
        cancelled = true;
      };
    }

    if (repoUrl.trim().length === 0) {
      setError("No repository URL was provided.");
      setIsLoading(false);
      return () => undefined;
    }

    void analyzeCurrentRepo();

    return () => {
      cancelled = true;
      if (ticker) {
        window.clearInterval(ticker);
      }
    };
  }, [repoUrl, savedAnalysisId]);

  async function handleSave() {
    if (!result) {
      return;
    }

    if (!user) {
      await signInWithGitHub(window.location.href);
      return;
    }

    try {
      setIsSaving(true);
      setSaveLabel("Saving…");

      const response = await fetch(`${getApiBaseUrl()}/api/analyses`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repoUrl: result.repo.htmlUrl,
          result,
        }),
      });

      if (!response.ok) {
        throw new Error("Analysis could not be saved.");
      }

      const saved = (await response.json()) as SavedAnalysisRecord;

      setSaveLabel("Saved");
      setSavedAnalysesRefreshKey((current) => current + 1);
      setIsSavedDrawerOpen(true);
      router.replace(`/explore?saved=${encodeURIComponent(saved.id)}`);
      window.setTimeout(() => setSaveLabel("Save analysis"), 1600);
    } catch {
      setSaveLabel("Save failed");
      window.setTimeout(() => setSaveLabel("Save analysis"), 1600);
    } finally {
      setIsSaving(false);
    }
  }

  let repoLabel = result ? `${result.repo.owner}/${result.repo.repo}` : repoUrl;
  let repoLink = result?.repo.htmlUrl ?? repoUrl;

  if (!result) {
    try {
      const parsed = new URL(repoUrl);
      const segments = parsed.pathname.split("/").filter(Boolean);
      repoLabel = segments.length >= 2 ? `${segments[0]}/${segments[1]}` : repoUrl;
      repoLink = repoUrl;
    } catch {
      repoLabel = repoUrl;
      repoLink = repoUrl;
    }
  }

  return (
    <main className="min-h-screen bg-background text-black">
      <div className="flex min-h-screen flex-col">
        <header className="flex flex-col gap-3 px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <ExplorerBreadcrumb repoLabel={repoLabel} repoUrl={repoLink} />
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <AuthControls showIdentity={false} showSignOut={false} />
              {user ? (
                <button
                  type="button"
                  onClick={() => setIsSavedDrawerOpen(true)}
                  className="inline-flex items-center gap-2 border border-black bg-white px-3 py-2 text-sm text-black transition-colors hover:bg-black hover:text-white"
                >
                  <PanelRightOpen className="size-4" />
                  Saved
                </button>
              ) : null}
              {result ? (
                <ActionMenu
                  saveLabel={user ? saveLabel : "Sign in to save"}
                  copiedMermaid={copiedMermaid}
                  isSaving={isSaving}
                  showSignOut={Boolean(user)}
                  userEmail={user?.email}
                  userName={user?.name}
                  onSave={() => {
                    void handleSave();
                  }}
                  onSignOut={() => {
                    void signOut();
                  }}
                  onExportPng={() => {
                    void exportMermaidToPng(exportNode || renderedSvg || result.mermaid);
                  }}
                  onCopyMermaid={() => {
                    void navigator.clipboard.writeText(result.mermaid).then(() => {
                      setCopiedMermaid(true);
                      window.setTimeout(() => setCopiedMermaid(false), 1600);
                    });
                  }}
                />
              ) : null}
            </div>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-3 py-3 sm:px-4 sm:py-4">
          {error ? (
            <div className="max-w-lg text-center">
              <p className="font-hand text-5xl leading-none">Could not generate the map</p>
              <p className="mt-4 text-sm leading-7 text-zinc-600">{error}</p>
              <a
                href={repoLink}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-sm text-black underline underline-offset-4"
              >
                Open submitted URL
                <ExternalLink className="size-4" />
              </a>
            </div>
          ) : result ? (
            <DiagramStage>
              <>
                <MermaidPreview
                  key={result.mermaid}
                  mermaid={result.mermaid}
                  className="flex h-full min-h-[640px] w-full items-center justify-center"
                  scale={zoom}
                  onSvgRendered={setRenderedSvg}
                  onExportNodeReady={setExportNode}
                />
              </>
            </DiagramStage>
          ) : null}
        </div>
        {result ? (
          <div className="fixed bottom-4 left-4 z-20 sm:bottom-6 sm:left-6">
            <ZoomControls
              zoom={zoom}
              onZoomOut={() =>
                setZoom((current) => Math.max(0.6, Number((current - 0.1).toFixed(2))))
              }
              onZoomIn={() =>
                setZoom((current) => Math.min(2, Number((current + 0.1).toFixed(2))))
              }
            />
          </div>
        ) : null}
      </div>

      <SavedAnalysesDrawer
        isOpen={isSavedDrawerOpen}
        onClose={() => setIsSavedDrawerOpen(false)}
        refreshKey={savedAnalysesRefreshKey}
        currentSavedId={savedAnalysisId || undefined}
        currentRepoUrl={result?.repo.htmlUrl}
      />

      {isLoading ? <LoaderModal activeIndex={stageIndex} /> : null}
    </main>
  );
}
