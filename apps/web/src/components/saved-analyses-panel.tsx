"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SavedAnalysisSummary } from "@code-atlas/shared";
import { getApiBaseUrl } from "@/lib/api";
import { useSession } from "@/components/session-provider";

export function SavedAnalysesPanel() {
  const { user, isLoading } = useSession();
  const [items, setItems] = useState<SavedAnalysisSummary[]>([]);
  const [error, setError] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!user) {
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
  }, [user]);

  if (isLoading || !user) {
    return null;
  }

  return (
    <section className="mt-8 border border-black bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-logo text-2xl leading-none text-black">Saved analyses</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Reopen a previously generated map without recomputing it.
          </p>
        </div>
        {isFetching ? <span className="text-sm text-zinc-500">Refreshing…</span> : null}
      </div>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {items.length === 0 && !isFetching ? (
        <p className="mt-4 text-sm text-zinc-500">No saved analyses yet.</p>
      ) : null}
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/explore?saved=${encodeURIComponent(item.id)}`}
            className="block border border-black px-4 py-3 transition-colors hover:bg-black hover:text-white"
          >
            <div className="font-medium">{item.title}</div>
            <div className="mt-1 text-sm opacity-70">{item.summary ?? item.repoUrl}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
