"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

async function renderDiagram(definition: string, id: string) {
  const mermaid = (await import("mermaid")).default;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "base",
    themeVariables: {
      fontFamily: "var(--font-hand)",
      primaryColor: "#ffffff",
      primaryTextColor: "#111111",
      primaryBorderColor: "#161616",
      lineColor: "#111111",
      secondaryColor: "#ffffff",
      tertiaryColor: "#ffffff",
      clusterBkg: "#ffffff",
      clusterBorder: "#111111",
    },
    flowchart: {
      curve: "monotoneX",
      htmlLabels: false,
    },
  });

  const { svg } = await mermaid.render(id, definition);
  return svg;
}

export async function exportMermaidToPng(definition: string | HTMLElement) {
  const { toPng } = await import("html-to-image");
  let target: HTMLElement;
  let cleanup: (() => void) | null = null;

  if (typeof definition === "string") {
    const element = window.document.createElement("div");
    element.innerHTML = definition.trim().startsWith("<svg")
      ? definition
      : await renderDiagram(definition, `export-${crypto.randomUUID()}`);
    element.style.position = "fixed";
    element.style.left = "-10000px";
    element.style.top = "0";
    element.style.background = "#ffffff";
    element.style.padding = "32px";
    window.document.body.appendChild(element);
    target = element;
    cleanup = () => {
      window.document.body.removeChild(element);
    };
  } else {
    target = definition;
  }

  const pngUrl = await toPng(target, {
    backgroundColor: "#ffffff",
    cacheBust: true,
    pixelRatio: 2,
  });
  const anchor = window.document.createElement("a");
  anchor.href = pngUrl;
  anchor.download = "code-atlas-diagram.png";
  anchor.click();
  cleanup?.();
}

export function MermaidPreview({
  mermaid,
  className,
  scale = 1,
  onSvgRendered,
  onExportNodeReady,
}: {
  mermaid: string;
  className?: string;
  scale?: number;
  onSvgRendered?: (svg: string) => void;
  onExportNodeReady?: (node: HTMLDivElement | null) => void;
}) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const graphId = useId().replace(/:/g, "");
  const exportNodeRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setError("");
        const nextSvg = await renderDiagram(mermaid, graphId);

        if (!cancelled) {
          setSvg(nextSvg);
          onSvgRendered?.(nextSvg);
        }
      } catch (renderError) {
        if (!cancelled) {
          setError(
            renderError instanceof Error
              ? renderError.message
              : "Mermaid rendering failed.",
          );
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [graphId, mermaid, onSvgRendered]);

  useEffect(() => {
    onExportNodeReady?.(exportNodeRef.current);

    return () => {
      onExportNodeReady?.(null);
    };
  }, [onExportNodeReady, svg]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!svg) {
      return;
    }

    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.current.startX;
    const deltaY = event.clientY - dragState.current.startY;

    setOffset({
      x: dragState.current.originX + deltaX,
      y: dragState.current.originY + deltaY,
    });
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
      return;
    }

    dragState.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  if (error) {
    return (
      <Alert variant="destructive" className="border-red-200 bg-red-50">
        <AlertTriangle className="size-4" />
        <AlertTitle>Diagram rendering failed</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!svg) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-zinc-500">
        <div className="flex items-center gap-3 text-sm">
          <Sparkles className="size-4 animate-pulse" />
          Rendering Mermaid preview
        </div>
      </div>
    );
  }

  return (
    <div
      ref={exportNodeRef}
      className={className}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      <div
        className="[&_svg]:h-auto [&_svg]:max-h-none [&_svg]:min-w-[1100px] [&_svg]:w-[88%] [&_svg]:overflow-visible"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "center center",
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
