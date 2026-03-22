"use client";

import { useState, useTransition } from "react";
import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { HomepageForceGraphRegion } from "@/components/homepage-force-graph-region";

const EXAMPLE_URL = "https://github.com/gothinkster/node-express-realworld-example-app";

export function CodeAtlasClient() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState(EXAMPLE_URL);
  const [isPending, startTransition] = useTransition();

  function handleSearch(submittedUrl: string) {
    startTransition(async () => {
      router.push(`/explore?repo=${encodeURIComponent(submittedUrl.trim())}`);
    });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-black">
      <HomepageForceGraphRegion />

      <div className="pointer-events-none relative z-20 grid min-h-screen place-items-center px-6 py-10">
        <div className="pointer-events-auto mx-auto w-full max-w-2xl">
          <div className="mb-8 text-center lg:text-left">
            <h1 className="font-logo text-5xl leading-none text-black sm:text-6xl lg:text-7xl">Code Atlas</h1>
            <p className="mt-0.5 max-w-xl text-sm leading-7 text-zinc-500 lg:text-base">
              Paste a repository and turn its architecture into a living map.
            </p>
          </div>
          <form
            className="flex items-center border border-black bg-white"
            onSubmit={(event) => {
              event.preventDefault();
              handleSearch(repoUrl);
            }}
          >
            <input
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              placeholder="Paste a GitHub repo"
              className="h-16 flex-1 border-0 bg-transparent px-5 text-base text-black outline-none placeholder:text-zinc-400"
            />
            <button
              type="submit"
              disabled={isPending || repoUrl.trim().length === 0}
              className="flex h-16 items-center gap-2 border-l border-black px-5 text-sm text-black transition-colors hover:bg-black hover:text-white disabled:opacity-40"
            >
              Search
              <ArrowUpRight className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
