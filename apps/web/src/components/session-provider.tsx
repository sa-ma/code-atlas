"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { SessionResponse, SessionUser } from "@code-atlas/shared";
import { getApiBaseUrl } from "@/lib/api";

interface SessionContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  signInWithGitHub: (callbackUrl?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

async function fetchSession(): Promise<SessionResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/me`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load session.");
  }

  return (await response.json()) as SessionResponse;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const payload = await fetchSession();
      setUser(payload.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const signInWithGitHub = useCallback(async (callbackUrl?: string) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/sign-in/social`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "github",
          callbackURL: callbackUrl ?? window.location.href,
          disableRedirect: true,
        }),
      });

      if (!response.ok) {
        throw new Error("GitHub sign-in failed.");
      }

      const payload = (await response.json()) as { url?: string };

      if (!payload.url) {
        throw new Error("GitHub sign-in did not return a redirect URL.");
      }

      window.location.assign(payload.url);
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(
          "GitHub sign-in could not reach the API. Make sure the Nest backend is running on NEXT_PUBLIC_API_BASE_URL.",
        );
      }

      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    await fetch(`${getApiBaseUrl()}/api/auth/sign-out`, {
      method: "POST",
      credentials: "include",
    });
    await refreshSession();
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      refreshSession,
      signInWithGitHub,
      signOut,
    }),
    [isLoading, refreshSession, signInWithGitHub, signOut, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used inside SessionProvider.");
  }

  return context;
}
