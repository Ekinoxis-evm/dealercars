"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { publicEnv } from "@/lib/env";

/**
 * Privy owns the session; Supabase owns the record.
 *
 * Wallets are turned OFF on both chains, deliberately and explicitly rather
 * than by relying on the default. This is US-regulated consumer credit: the
 * borrower needs a bank account for ACH, the dealer needs a lien perfected
 * with the state DMV, and the contract has to be enforceable in a county
 * court. An embedded wallet solves none of that and adds a KYC surface we
 * would then have to defend. Privy is here for email and passkey login only.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Without an app id the provider throws on mount, which would white-screen
  // the marketing pages for a visitor who never signs in. Render plainly.
  if (!publicEnv.privyAppId) return <>{children}</>;

  return (
    <PrivyProvider
      appId={publicEnv.privyAppId}
      config={{
        // Email and passkey, nothing else. Decided 2026-09-22. Email is the
        // identity: it is what an admin invitation is matched against, and it
        // is where a member's statements go. A passkey is a faster way back
        // into the same account once it exists — Privy links it to the email
        // account rather than creating a second one. SMS and Google are gone:
        // a phone number is not an address we can send a disclosure to, and a
        // second identity provider is a second thing to reconcile.
        loginMethods: ["email", "passkey"],
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
          solana: { createOnLogin: "off" },
        },
        appearance: {
          theme: "light",
          accentColor: "#a8352a",
          // No wallet options in the login modal — there is nothing here a
          // wallet could be used for.
          walletList: [],
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
