"use client";

import { LoaderCircle, Network, SearchCheck, Waypoints } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  {
    id: "validate",
    title: "Validating repository",
    description: "Normalizing the GitHub URL and preparing the request.",
    icon: SearchCheck,
  },
  {
    id: "fetch",
    title: "Fetching repository facts",
    description: "Inspecting the repo tree and selected files through GitHub.",
    icon: Network,
  },
  {
    id: "map",
    title: "Mapping architecture",
    description: "Turning extracted signals into a graph and Mermaid diagram.",
    icon: Waypoints,
  },
] as const;

export function AnalysisStatus({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="space-y-4">
      {STAGES.map((stage, index) => {
        const Icon = stage.icon;

        return (
          <div
            key={stage.id}
            className={cn(
              "rounded-3xl border px-4 py-4 transition-colors",
              isLoading
                ? "border-zinc-300/80 bg-white/85 text-zinc-950"
                : "border-zinc-200/80 bg-white/70 text-zinc-700",
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 flex size-9 items-center justify-center rounded-2xl border",
                  isLoading && index === 1
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-zinc-200 bg-zinc-50 text-zinc-500",
                )}
              >
                {isLoading && index === 1 ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Icon className="size-4" />
                )}
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold tracking-tight">{stage.title}</p>
                <p className="text-sm leading-6 text-zinc-600">{stage.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
