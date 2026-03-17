"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Copy, Download, ExternalLink, LoaderCircle, Minus, Plus } from "lucide-react";
import { MermaidPreview, exportMermaidToPng } from "@/components/mermaid-preview";
import type { AnalyzeRepositoryResponse } from "@/lib/types/code-atlas";

const LOADER_STATES = [
  "Validating GitHub URL",
  "Scanning repository tree",
  "Extracting architecture facts",
  "Drawing the diagram",
] as const;

function DiagramStage({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex h-[calc(100vh-3rem)] w-full max-w-[calc(100vw-3rem)] items-center justify-center overflow-auto px-12 py-12 sm:max-w-[calc(100vw-4rem)] sm:px-20 sm:py-18">
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

export function CodeAtlasExplorer({ repoUrl }: { repoUrl: string }) {
  const [result, setResult] = useState<AnalyzeRepositoryResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [stageIndex, setStageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [renderedSvg, setRenderedSvg] = useState("");
  const [exportNode, setExportNode] = useState<HTMLDivElement | null>(null);
  const [copiedMermaid, setCopiedMermaid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let ticker = 0;

    async function run() {
      try {
        setError("");
        setIsLoading(true);
        setStageIndex(0);

        ticker = window.setInterval(() => {
          setStageIndex((current) => Math.min(current + 1, LOADER_STATES.length - 1));
        }, 1000);

        const response = await fetch("/api/analyze", {
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

    if (repoUrl.trim().length === 0) {
      setError("No repository URL was provided.");
      setIsLoading(false);
      return () => undefined;
    }

    void run();

    return () => {
      cancelled = true;
      if (ticker) {
        window.clearInterval(ticker);
      }
    };
  }, [repoUrl]);

  let repoLabel = repoUrl;
  try {
    const parsed = new URL(repoUrl);
    const segments = parsed.pathname.split("/").filter(Boolean);
    repoLabel = segments.length >= 2 ? `${segments[0]}/${segments[1]}` : repoUrl;
  } catch {
    repoLabel = repoUrl;
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="relative min-h-screen">
        <div className="pointer-events-none absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
          <div className="pointer-events-auto inline-flex items-center gap-2 text-sm text-black">
            <Link href="/" className="font-hand text-xl leading-none transition-opacity hover:opacity-60">
              Code Atlas
            </Link>
            <span className="font-hand text-xl leading-none text-zinc-400">/</span>
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="font-hand max-w-[320px] truncate text-xl leading-none transition-opacity hover:opacity-60"
            >
              {repoLabel}
            </a>
          </div>
        </div>
        {result ? (
          <div className="pointer-events-none absolute right-4 top-4 z-10 flex items-center gap-2 sm:right-6 sm:top-6">
            <div className="pointer-events-auto inline-flex items-center border border-black bg-white">
              <button
                type="button"
                onClick={() => setZoom((current) => Math.max(0.6, Number((current - 0.1).toFixed(2))))}
                className="inline-flex size-9 items-center justify-center border-r border-black text-black transition-colors hover:bg-black hover:text-white"
                aria-label="Zoom out"
              >
                <Minus className="size-4" />
              </button>
              <div className="min-w-14 px-2 text-center text-sm text-black">
                {Math.round(zoom * 100)}%
              </div>
              <button
                type="button"
                onClick={() => setZoom((current) => Math.min(2, Number((current + 0.1).toFixed(2))))}
                className="inline-flex size-9 items-center justify-center border-l border-black text-black transition-colors hover:bg-black hover:text-white"
                aria-label="Zoom in"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                void exportMermaidToPng(exportNode || renderedSvg || result.mermaid);
              }}
              className="pointer-events-auto inline-flex items-center gap-2 border border-black bg-white px-3 py-2 text-sm text-black transition-colors hover:bg-black hover:text-white"
            >
              <Download className="size-4" />
              PNG
            </button>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(result.mermaid).then(() => {
                  setCopiedMermaid(true);
                  window.setTimeout(() => setCopiedMermaid(false), 1600);
                });
              }}
              className="pointer-events-auto inline-flex items-center gap-2 border border-black bg-white px-3 py-2 text-sm text-black transition-colors hover:bg-black hover:text-white"
            >
              {copiedMermaid ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copiedMermaid ? "Copied" : "Copy Mermaid"}
            </button>
          </div>
        ) : null}

        <div className="flex min-h-screen items-center justify-center px-3 py-3 sm:px-4 sm:py-4">
          {error ? (
            <div className="max-w-lg text-center">
              <p className="font-hand text-5xl leading-none">Could not generate the map</p>
              <p className="mt-4 text-sm leading-7 text-zinc-600">{error}</p>
              <a
                href={repoUrl}
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
              <MermaidPreview
                key={result.mermaid}
                mermaid={result.mermaid}
                className="flex h-full min-h-[640px] w-full items-center justify-center"
                scale={zoom}
                onSvgRendered={setRenderedSvg}
                onExportNodeReady={setExportNode}
              />
            </DiagramStage>
          ) : null}
        </div>
      </div>

      {isLoading ? <LoaderModal activeIndex={stageIndex} /> : null}
    </main>
  );
}
