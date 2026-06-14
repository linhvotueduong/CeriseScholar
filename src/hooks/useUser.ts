"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

let initialUserPromise: Promise<User | null> | null = null;

function getInitialUser() {
  if (!initialUserPromise) {
    const supabase = createClient();
    initialUserPromise = supabase.auth
      .getSession()
      .then(({ data: { session } }) => session?.user ?? null)
      .catch(() => null);
  }

  return initialUserPromise;
}

/**
 * Hook that returns the currently logged-in user.
 * Uses getSession() first (instant, reads from cookie) for fast rendering,
 * then listens for auth state changes.
 */
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    // Fast path: read session from cookie (no network call)
    getInitialUser()
      .then((nextUser) => {
        if (!mounted) return;
        setUser(nextUser);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      initialUserPromise = Promise.resolve(session?.user ?? null);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
