"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/browser";

/**
 * The session, for client components.
 *
 * `ready` is false until the browser has read its cookies once, so a page
 * neither flashes a sign-in form at a signed-in member nor the reverse.
 * `user` is Supabase's verified user or null. That is the whole contract:
 * anything that needs to know who somebody is asks the server, which verifies
 * the cookie itself in `requireMember()`.
 */
type Auth = {
  ready: boolean;
  user: User | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Auth>({ ready: false, user: null, signOut: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<Auth>(
    () => ({
      ready,
      user,
      signOut: async () => {
        await supabaseBrowser().auth.signOut();
        setUser(null);
      },
    }),
    [ready, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  return useContext(AuthContext);
}
