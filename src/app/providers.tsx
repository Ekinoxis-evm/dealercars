"use client";

import { AuthProvider } from "@/components/AuthProvider";

/**
 * Supabase Auth owns the session; the `profiles` table owns the record.
 *
 * Sign-in is an email and a one-time code or link. There is no password, no
 * social login, no wallet and no third-party identity SDK: this is US-regulated
 * consumer credit, and the only thing a session has to prove is which verified
 * email address is asking.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
