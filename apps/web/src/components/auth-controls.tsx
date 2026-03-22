"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useSession } from "@/components/session-provider";

export function AuthControls({
  showIdentity = true,
  showSignOut = true,
}: {
  showIdentity?: boolean;
  showSignOut?: boolean;
}) {
  const { user, isLoading, signInWithGitHub, signOut } = useSession();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSignIn() {
    try {
      setIsPending(true);
      setError("");
      await signInWithGitHub();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "GitHub sign-in failed.",
      );
    } finally {
      setIsPending(false);
    }
  }

  async function handleSignOut() {
    try {
      setIsPending(true);
      await signOut();
    } finally {
      setIsPending(false);
    }
  }

  if (isLoading) {
    return <div className="text-sm text-zinc-500">Checking session…</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => void handleSignIn()}
          disabled={isPending}
          className="inline-flex items-center gap-2 border border-black bg-white px-4 py-2 text-sm text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50"
        >
          Sign in with GitHub
        </button>
        {error ? <p className="max-w-sm text-right text-xs text-red-600">{error}</p> : null}
      </div>
    );
  }

  if (!showIdentity && !showSignOut) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      {showIdentity ? (
        <div className="text-right">
          <div className="text-sm font-medium text-black">{user.name ?? user.email}</div>
          <div className="text-xs text-zinc-500">{user.email}</div>
        </div>
      ) : null}
      {showSignOut ? (
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={isPending}
          className="inline-flex items-center gap-2 border border-black bg-white px-3 py-2 text-sm text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      ) : null}
    </div>
  );
}
